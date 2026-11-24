# StockSetu 3D

A warehouse slotting and picking simulator you can watch.

In most godowns, goods sit wherever they landed on the day they arrived.
The fast sellers end up at the far end, the slow stock sits next to the
dock, and every order becomes a long walk for the picker. StockSetu puts
that walk on a screen: a small 3D warehouse, three pickers, orders landing
on the dock — and one switch that re-slots the floor, fast movers near the
dock, slow movers far away. You can see the average pick time fall.

It is a teaching model with simple rules, and it says so on the page.
Every number it shows comes out of the running model — including the
comparison table, which re-runs the same 60 seeded orders through both
layouts when you press the button.

## What you can do on the page

- Watch orders arrive and pickers work the aisles in 3D (drag to look
  around, scroll to zoom).
- Pause or resume the shift, and change how fast orders arrive.
- Switch the layout between **As found** and **Slotted** and watch the
  averages move. Counters restart for each layout, so the two are easy
  to compare.
- Click any rack row to see its numbers: picks from that row, and how
  much walking those picks took.
- Run the comparison: the same 60 orders through both layouts, with the
  saving worked out from the run. On the built-in seed it comes to
  **12% less pick time and 16% less walking** — from moving 18 fast
  movers next to the dock, nothing else.

## The simple rules

- 72 products in 6 rack rows, 3 pickers, 1 dock. Products are class A
  (fast), B (steady) or C (slow); orders ask for them in roughly a
  10 : 4 : 1 ratio.
- Pickers walk at 4.5 m/s and take 2 seconds per pick — set fast on
  purpose, so a shift fits into minutes.
- Pick time is measured from a picker taking an order to bringing it
  back to the dock. Queue time is not counted as pick time.
- Pickers travel along the cross-aisle and up the aisles. Nobody walks
  through a rack.
- No traffic jams, no empty bays, no breakage. Real warehouses are
  messier; the direction of the result is what real slotting projects
  see.

## Run it

It is plain static files — no build step, no server code, no network
calls. Serve the folder with anything, for example:

```
python3 -m http.server 8000
```

then open `http://localhost:8000`. It also works from any static host
(GitHub Pages, Netlify, Vercel).

## How it is put together

- `js/engine.js` — the whole simulation: orders, pickers, routing,
  layouts, stats. No DOM, no rendering, so it can be tested on its own
  and fast-forwarded for the comparison.
- `js/scene.js` — the Three.js view (r160, vendored in `vendor/`, pinned
  by sha256 — see `qa/QA_RESULTS.md`). It only reads engine state.
- `js/app.js` — wiring: controls, stats rail, zone panel, comparison.
- `index.html` / `style.css` — the page: problem, live floor, outcome.

## Tests

```
node qa/engine.test.cjs   # 7 engine tests, including the comparison
node qa/smoke.mjs         # 13 headless-browser checks on the real page
```

Both pass. Details and screenshots are in `qa/QA_RESULTS.md`; every
control on the page is listed in `qa/INTERACTION_INVENTORY.md`.

## Why it exists

Built for the i-Hack E-Summit ’26 Creative Newtech Innovation Challenge
(a B2B challenge) — see `SUBMISSION_PACK.md`. The B2B point is simple:
slotting is one of the cheapest changes a warehouse can make, and it is
hard to explain with a spreadsheet. It is much easier to explain when
the other person can watch the walking shrink.
