/* StockSetu — warehouse slotting & picking simulation engine.
   Pure logic: no DOM, no rendering. The 3D scene reads this state;
   the comparison button fast-forwards two of these engines headlessly.

   Simple rules (also printed on the page — this is a teaching model):
   - 6 rack rows x 12 bays = 72 products. Each product is class A (fast),
     B (medium) or C (slow). Orders ask for A far more often than C.
   - Pickers walk at 4.5 m/s (set fast on purpose, so a shift fits in
     minutes) and spend 2 s picking each item.
   - Pickers travel like real ones: along the front cross-aisle, then up
     an aisle to the bay. Nobody walks through a rack.
   - "Pick time" is measured from the moment a picker takes an order to
     the moment it is back at the dock. Time spent waiting in the dock
     queue is shown separately, as the queue number.
   - "As found" = products sit in a shuffled order. "Slotted" = A nearest
     the dock, then B, then C far away.
*/
(function () {
  'use strict';

  // ---------- seeded RNG (mulberry32) ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- warehouse geometry (metres) ----------
  // Rack rows run away from the dock (north), aisles between them, one
  // front cross-aisle at z = 11.5 and the dispatch dock behind it.
  const ROW_X = [-15, -9, -3, 3, 9, 15];       // rack row centres (x)
  const AISLE_X = ROW_X.map((x) => x - 3);     // aisle a picker uses for each row
  const BAYS_PER_ROW = 12;
  const BAY_Z0 = -11, BAY_DZ = 1.8;            // bay centres along the row: -11 .. 8.8
  const CROSS_Z = 11.5;                        // front cross-aisle
  const DOCK = { x: 0, z: 13.5 };              // dispatch dock
  const WALK_SPEED = 4.5;                      // m/s
  const PICK_SECONDS = 2.0;                    // dwell per item
  const PICKER_COUNT = 3;

  const CLASS_WEIGHT = { A: 10, B: 4, C: 1 };  // how often orders ask
  const CLASS_RANK = { A: 0, B: 1, C: 2 };

  const NAMES = [
    'Atta flour', 'Rice', 'Sugar', 'Detergent', 'Shampoo', 'Soap bars',
    'Biscuits', 'Tea', 'Coffee', 'Cooking oil', 'Milk powder', 'Noodles',
    'Ketchup', 'Jam', 'Cereal', 'Toothpaste', 'Talc', 'Floor cleaner',
    'Dish gel', 'Tissues', 'Diaper packs', 'Baby food', 'Spice tins', 'Salt',
  ];
  const VARIANTS = ['carton of 6', 'carton of 12', 'bulk case'];

  function buildProducts() {
    const products = [];
    let n = 0;
    for (const name of NAMES) {
      for (const v of VARIANTS) {
        products.push({ id: n++, name: name + ' — ' + v, cls: null, weight: 0 });
      }
    }
    // 72 products: 18 A, 24 B, 30 C (fixed demand classes)
    const classes = [].concat(
      Array(18).fill('A'), Array(24).fill('B'), Array(30).fill('C'));
    products.forEach((p, i) => { p.cls = classes[i]; p.weight = CLASS_WEIGHT[p.cls]; });
    return products;
  }

  function buildBays() {
    const bays = [];
    for (let r = 0; r < ROW_X.length; r++) {
      for (let b = 0; b < BAYS_PER_ROW; b++) {
        bays.push({
          id: r * BAYS_PER_ROW + b,
          row: r, bay: b,
          code: 'R' + (r + 1) + ' · B' + String(b + 1).padStart(2, '0'),
          x: ROW_X[r],
          z: BAY_Z0 + b * BAY_DZ,
          front: { x: AISLE_X[r], z: BAY_Z0 + b * BAY_DZ },
          productId: null,
        });
      }
    }
    return bays;
  }

  // ---------- routing on the aisle network ----------
  // Along the aisle you are in to the cross-aisle, across, then up the
  // target aisle. Points already on the cross-aisle (or the dock, which
  // opens onto it) join it directly.
  function routeWaypoints(a, b) {
    if (a.x === b.x) return [{ x: b.x, z: b.z }];
    return [
      { x: a.x, z: CROSS_Z },
      { x: b.x, z: CROSS_Z },
      { x: b.x, z: b.z },
    ];
  }
  function routeLength(a, b) {
    let len = 0, cur = a;
    for (const w of routeWaypoints(a, b)) {
      len += Math.hypot(w.x - cur.x, w.z - cur.z);
      cur = w;
    }
    return len;
  }

  // ---------- engine ----------
  function createEngine(opts) {
    const seed = (opts && opts.seed) || 1234;
    const rng = mulberry32(seed);
    const products = buildProducts();
    const bays = buildBays();
    bays.forEach((bay) => { bay.dockDistance = routeLength(DOCK, bay.front); });

    const state = {
      time: 0,
      layout: 'asfound',
      orderRatePerMin: 6,
      nextArrivalIn: 2,
      orderSeq: 0,
      queue: [],            // orders waiting at the dock
      pickers: [],
      zones: ROW_X.map((x, i) => ({
        row: i, code: 'R' + (i + 1), picks: 0, distance: 0,
      })),
      stats: freshStats(),
    };

    function freshStats() {
      return {
        ordersCompleted: 0, totalPickSeconds: 0, totalDistance: 0,
        itemsPicked: 0,
      };
    }

    for (let i = 0; i < PICKER_COUNT; i++) {
      state.pickers.push({
        id: i,
        pos: { x: -2 + i * 2, z: DOCK.z },
        heading: 0,
        waypoints: [],
        dwell: 0,
        order: null,
        stopIndex: 0,
        legStartDistance: 0,
        totalDistance: 0,
        carrying: false,
        state: 'idle',       // idle | walking | picking | returning
      });
    }

    // ----- layout assignment -----
    function assignLayout(layout) {
      state.layout = layout;
      const ordered = products.slice();
      if (layout === 'slotted') {
        ordered.sort((p, q) =>
          (CLASS_RANK[p.cls] - CLASS_RANK[q.cls]) || (q.weight - p.weight));
        const baysByDock = bays.slice().sort((a, b) => a.dockDistance - b.dockDistance);
        baysByDock.forEach((bay, i) => { bay.productId = ordered[i].id; });
      } else {
        // "As found": a fixed shuffle (own RNG so it never changes between runs)
        const shuf = mulberry32(777);
        for (let i = ordered.length - 1; i > 0; i--) {
          const j = Math.floor(shuf() * (i + 1));
          [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
        }
        bays.forEach((bay, i) => { bay.productId = ordered[i].id; });
      }
    }

    function bayOfProduct(productId) {
      return bays.find((b) => b.productId === productId);
    }

    // ----- orders -----
    function makeOrder(r) {
      const rand = r || rng;
      const totalWeight = products.reduce((s, p) => s + p.weight, 0);
      const count = 1 + Math.floor(rand() * 3.4); // 1..4 items, mostly 2-3
      const items = [];
      const used = new Set();
      while (items.length < count) {
        let pick = rand() * totalWeight, chosen = null;
        for (const p of products) { pick -= p.weight; if (pick <= 0) { chosen = p; break; } }
        if (!chosen) chosen = products[products.length - 1];
        if (used.has(chosen.id)) continue;
        used.add(chosen.id);
        items.push(chosen.id);
      }
      // route order: aisle by aisle, deepest bay first within an aisle
      items.sort((a, b) => {
        const ba = bayOfProduct(a), bb = bayOfProduct(b);
        return (ba.front.x - bb.front.x) || (ba.front.z - bb.front.z);
      });
      return { id: ++state.orderSeq, items, bornAt: state.time, dispatchAt: null };
    }

    function dispatch(picker, order) {
      order.dispatchAt = state.time;
      picker.order = order;
      picker.stopIndex = 0;
      picker.state = 'walking';
      picker.legStartDistance = picker.totalDistance;
      const bay = bayOfProduct(order.items[0]);
      picker.waypoints = routeWaypoints(picker.pos, bay.front);
    }

    function arriveAtBay(picker) {
      const bay = bayOfProduct(picker.order.items[picker.stopIndex]);
      const zone = state.zones[bay.row];
      zone.picks += 1;
      zone.distance += picker.totalDistance - picker.legStartDistance;
      state.stats.itemsPicked += 1;
      picker.carrying = true;
      picker.state = 'picking';
      picker.dwell = PICK_SECONDS;
    }

    function finishPick(picker) {
      picker.stopIndex += 1;
      picker.legStartDistance = picker.totalDistance;
      if (picker.stopIndex < picker.order.items.length) {
        const bay = bayOfProduct(picker.order.items[picker.stopIndex]);
        picker.waypoints = routeWaypoints(picker.pos, bay.front);
        picker.state = 'walking';
      } else {
        picker.waypoints = routeWaypoints(picker.pos, DOCK);
        picker.state = 'returning';
      }
    }

    function completeOrder(picker) {
      state.stats.ordersCompleted += 1;
      // Pick time = dispatch to dock return (queue wait is not travel).
      state.stats.totalPickSeconds += state.time - picker.order.dispatchAt;
      picker.order = null;
      picker.carrying = false;
      picker.state = 'idle';
    }

    // ----- stepping -----
    function step(dt) {
      state.time += dt;

      // arrivals
      if (state.orderRatePerMin > 0) {
        state.nextArrivalIn -= dt;
        if (state.nextArrivalIn <= 0) {
          state.queue.push(makeOrder());
          const mean = 60 / state.orderRatePerMin;
          state.nextArrivalIn = -Math.log(1 - rng()) * mean;
        }
      }

      for (const picker of state.pickers) {
        if (picker.state === 'idle') {
          if (state.queue.length > 0) dispatch(picker, state.queue.shift());
          continue;
        }
        if (picker.state === 'picking') {
          picker.dwell -= dt;
          if (picker.dwell <= 0) finishPick(picker);
          continue;
        }
        // walking / returning: follow waypoints
        let budget = WALK_SPEED * dt;
        while (budget > 0 && picker.waypoints.length > 0) {
          const target = picker.waypoints[0];
          const dx = target.x - picker.pos.x;
          const dz = target.z - picker.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 1e-9) { picker.waypoints.shift(); continue; }
          picker.heading = Math.atan2(dx, dz);
          const move = Math.min(dist, budget);
          picker.pos.x += (dx / dist) * move;
          picker.pos.z += (dz / dist) * move;
          picker.totalDistance += move;
          state.stats.totalDistance += move;
          budget -= move;
          if (move >= dist) picker.waypoints.shift();
        }
        if (picker.waypoints.length === 0) {
          if (picker.state === 'walking') arriveAtBay(picker);
          else if (picker.state === 'returning') completeOrder(picker);
        }
      }
    }

    function resetStats() {
      state.stats = freshStats();
      state.zones.forEach((z) => { z.picks = 0; z.distance = 0; });
    }

    function setLayout(layout) {
      if (layout !== state.layout) {
        assignLayout(layout);
        resetStats();
      }
    }

    assignLayout((opts && opts.layout) || 'asfound');

    return {
      state, products, bays, DOCK, ROW_X, AISLE_X, CROSS_Z,
      step, setLayout, resetStats, makeOrder,
      bayOfProduct,
      setOrderRate(perMin) { state.orderRatePerMin = perMin; },
      avgPickSeconds() {
        const s = state.stats;
        return s.ordersCompleted > 0 ? s.totalPickSeconds / s.ordersCompleted : 0;
      },
    };
  }

  // ----- headless comparison: same seeded orders, both layouts -----
  function runComparison(seed, orderCount) {
    orderCount = orderCount || 60;
    function run(layout) {
      const eng = createEngine({ seed: 42, layout });
      eng.setOrderRate(0); // no live arrivals; we feed the fixed list
      // Build the fixed order list from a dedicated seeded stream of
      // product ids, independent of layout: use makeOrder on a scratch
      // engine whose bays are in "as found" order for route sorting.
      const scratch = createEngine({ seed: seed, layout: 'asfound' });
      const orders = [];
      for (let i = 0; i < orderCount; i++) orders.push(scratch.makeOrder());
      // Feed orders in batches so pickers stay busy but the dock queue
      // behaves like the live sim.
      let fed = 0, guard = 0;
      const dt = 0.1;
      while ((eng.state.stats.ordersCompleted < orderCount) && guard < 200000) {
        while (fed < orderCount && eng.state.queue.length < 6) {
          const o = orders[fed++];
          o.bornAt = eng.state.time;
          // re-sort stops for THIS layout's bay positions
          o.items.sort((a, b) => {
            const ba = eng.bayOfProduct(a), bb = eng.bayOfProduct(b);
            return (ba.front.x - bb.front.x) || (ba.front.z - bb.front.z);
          });
          eng.state.queue.push(o);
        }
        eng.step(dt);
        guard++;
      }
      const s = eng.state.stats;
      return {
        layout,
        ordersCompleted: s.ordersCompleted,
        avgPickSeconds: s.ordersCompleted ? s.totalPickSeconds / s.ordersCompleted : 0,
        totalDistance: Math.round(s.totalDistance),
        itemsPicked: s.itemsPicked,
        zones: eng.state.zones.map((z) => ({ code: z.code, picks: z.picks, distance: Math.round(z.distance) })),
      };
    }
    const asFound = run('asfound');
    const slotted = run('slotted');
    const savingPct = asFound.avgPickSeconds > 0
      ? Math.round((1 - slotted.avgPickSeconds / asFound.avgPickSeconds) * 100)
      : 0;
    const distanceSavingPct = asFound.totalDistance > 0
      ? Math.round((1 - slotted.totalDistance / asFound.totalDistance) * 100)
      : 0;
    return { asFound, slotted, savingPct, distanceSavingPct, orderCount };
  }

  const StockEngine = {
    createEngine, runComparison, mulberry32,
    CLASS_WEIGHT, WALK_SPEED, PICK_SECONDS, DOCK, ROW_X, AISLE_X, CROSS_Z,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = StockEngine;
  if (typeof window !== 'undefined') window.StockEngine = StockEngine;
})();
