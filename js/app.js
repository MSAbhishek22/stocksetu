/* StockSetu app wiring — engine (window.StockEngine) + scene + controls. */
import { createScene } from './scene.js';

const E = window.StockEngine;
const TIME_SCALE = 1.5; // model clock runs a little fast; see the rules on the page

let engine = E.createEngine({ seed: (Math.random() * 1e9) | 0, layout: 'asfound' });
engine.setOrderRate(6);

const $ = (id) => document.getElementById(id);
const canvas = $('scene');

let selectedZone = null;
const scene = createScene(canvas, engine, (row) => {
  selectedZone = row;
  scene.setSelectedZone(row);
  renderZonePanel();
});

// ---------- formatting ----------
function fmtSeconds(s) {
  if (!s || !isFinite(s)) return '–';
  return s >= 60 ? (s / 60).toFixed(1) + ' min' : s.toFixed(1) + ' s';
}
function fmtDistance(m) {
  return m >= 1000 ? (m / 1000).toFixed(2) + ' km' : Math.round(m) + ' m';
}

// ---------- stats ----------
function renderStats() {
  const s = engine.state.stats;
  $('stat-orders').textContent = s.ordersCompleted;
  $('stat-avg').textContent = s.ordersCompleted > 0 ? fmtSeconds(engine.avgPickSeconds()) : '–';
  $('stat-distance').textContent = fmtDistance(s.totalDistance);
  $('stat-queue').textContent = engine.state.queue.length;
}

// ---------- zone panel ----------
function renderZonePanel() {
  const empty = document.querySelector('.zone-empty');
  const body = document.querySelector('.zone-body');
  if (selectedZone === null) {
    empty.hidden = false; body.hidden = true;
    return;
  }
  empty.hidden = true; body.hidden = false;
  const zone = engine.state.zones[selectedZone];
  $('zone-name').textContent = 'Row ' + zone.code + ' — rack numbers';
  $('zone-picks').textContent = zone.picks;
  $('zone-distance').textContent = fmtDistance(zone.distance);
  const counts = { A: 0, B: 0, C: 0 };
  let sample = null;
  for (const bay of engine.bays) {
    if (bay.row !== selectedZone) continue;
    const p = engine.products[bay.productId];
    counts[p.cls]++;
    if (!sample && p.cls === 'A') sample = p;
    if (!sample) sample = p;
  }
  $('zone-stock').textContent =
    `In this row now: ${counts.A} fast (A), ${counts.B} steady (B), ${counts.C} slow (C). ` +
    (sample ? `For example, bay stock includes “${sample.name}”.` : '');
}

// ---------- controls ----------
let running = true;
$('btn-play').addEventListener('click', () => {
  running = !running;
  $('btn-play').textContent = running ? 'Pause' : 'Resume';
});

$('rate').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  $('rate-value').textContent = v;
  engine.setOrderRate(v);
});

function setLayoutUI(layout) {
  const af = $('layout-asfound'), sl = $('layout-slotted');
  af.classList.toggle('is-active', layout === 'asfound');
  sl.classList.toggle('is-active', layout === 'slotted');
  af.setAttribute('aria-pressed', layout === 'asfound');
  sl.setAttribute('aria-pressed', layout === 'slotted');
  $('layout-note').innerHTML = layout === 'asfound'
    ? 'Layout: <strong>As found</strong> — goods sit in a shuffled order, like a real godown that grew on its own. Counters below are for this layout.'
    : 'Layout: <strong>Slotted</strong> — fast movers (A) next to the dock, steady (B) in the middle, slow (C) at the far end. Counters below are for this layout.';
}
function switchLayout(layout) {
  if (engine.state.layout === layout) return;
  engine.setLayout(layout); // resets counters for the new layout
  scene.refreshLayout();
  setLayoutUI(layout);
  renderStats();
  renderZonePanel();
}
$('layout-asfound').addEventListener('click', () => switchLayout('asfound'));
$('layout-slotted').addEventListener('click', () => switchLayout('slotted'));

$('btn-reset').addEventListener('click', () => {
  const layout = engine.state.layout;
  const rate = engine.state.orderRatePerMin;
  engine = E.createEngine({ seed: (Math.random() * 1e9) | 0, layout });
  engine.setOrderRate(rate);
  // scene holds a reference to the engine object it was built with;
  // rebuild the scene against the fresh engine.
  location.hash = '';
  rebuildScene();
  renderStats();
  renderZonePanel();
});

// The scene closes over one engine instance. On reset we swap the engine
// by reloading state into a fresh scene on the same canvas.
let sceneRef = scene;
function rebuildScene() {
  // createScene adds a new renderer on the same canvas; dispose old by
  // replacing the canvas element so no stale WebGL context lingers.
  const fresh = canvas.cloneNode(false);
  fresh.id = 'scene';
  canvas.replaceWith(fresh);
  sceneRef = createScene(fresh, engine, (row) => {
    selectedZone = row;
    sceneRef.setSelectedZone(row);
    renderZonePanel();
  });
  window.__stocksetu.engine = engine;
  window.__stocksetu.scene = sceneRef;
}

// ---------- comparison ----------
$('btn-compare').addEventListener('click', () => {
  const btn = $('btn-compare');
  btn.disabled = true;
  btn.textContent = 'Running both layouts…';
  // Let the button label paint before the synchronous run.
  setTimeout(() => {
    const r = E.runComparison(20261124, 60);
    $('cmp-af-orders').textContent = r.asFound.ordersCompleted;
    $('cmp-af-avg').textContent = fmtSeconds(r.asFound.avgPickSeconds);
    $('cmp-af-dist').textContent = fmtDistance(r.asFound.totalDistance);
    $('cmp-sl-orders').textContent = r.slotted.ordersCompleted;
    $('cmp-sl-avg').textContent = fmtSeconds(r.slotted.avgPickSeconds);
    $('cmp-sl-dist').textContent = fmtDistance(r.slotted.totalDistance);
    $('cmp-takeaway').textContent =
      `Same ${r.orderCount} orders, same pickers. Slotting cut the average pick time by ` +
      `${r.savingPct}% and the walking by ${r.distanceSavingPct}% — and the only thing that ` +
      `changed was where the goods sit: the 18 fast movers moved next to the dock. ` +
      `No extra staff, no new machines. Just a better address for every carton.`;
    $('compare-results').hidden = false;
    btn.disabled = false;
    btn.textContent = 'Run the comparison again';
  }, 30);
});

// ---------- main loop ----------
let last = performance.now();
let statTimer = 0;
function frame(now) {
  requestAnimationFrame(frame);
  // rAF timestamps can predate the performance.now() taken at module
  // load on the first frame — never feed the engine a negative dt.
  const rawDt = Math.max(0, Math.min((now - last) / 1000, 0.05));
  last = now;
  if (running && !document.hidden) {
    engine.step(rawDt * TIME_SCALE);
  }
  sceneRef.render();
  statTimer += rawDt;
  if (statTimer > 0.2) {
    statTimer = 0;
    renderStats();
    if (selectedZone !== null) renderZonePanel();
  }
}
requestAnimationFrame(frame);

renderStats();
setLayoutUI('asfound');

// hooks for the automated smoke test
window.__stocksetu = { engine, scene: sceneRef, StockEngine: E };
document.body.dataset.ready = 'true';
