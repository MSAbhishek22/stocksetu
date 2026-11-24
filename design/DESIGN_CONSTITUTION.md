# StockSetu 3D — Design Constitution

Project: StockSetu 3D, a warehouse slotting and picking simulator for the
i-Hack E-Summit '26 Creative Newtech Innovation Challenge (B2B).
Written before any frontend code, per the ABHI_22 blueprint Part V chain:
Research → Unique Design Constitution → Functional Build → Meaningful 3D → QA.

## The one idea

**A sunlit cutaway godown, built like an architect's diorama.**
You look into a small working warehouse from above, the way you would look
into a model on a table — except this one is alive: orders land on the dock,
pickers walk the aisles, boxes move. The whole argument of the product
("where you keep things decides how far people walk") is visible at a glance,
because you can literally watch the walking.

## References researched (24 Nov 2026, before building)

1. **threeui.com** — a library of authored Three.js scenes. Lesson taken:
   scene economy. A few well-made objects performing the real work beat a
   pile of decoration. StockSetu's scene is only racks, boxes, pickers and
   a dock — nothing that does not carry the argument.
2. **tasteskill.dev** — layout recipes from 247 curated sites. Two recipes
   taken: *"The product performs"* (the simulator is the hero, working, not
   a screenshot of it) and the app-screen rule *"quiet panels, aligned
   figures, colour spent on data"* (the stats rail stays quiet; colour is
   reserved for the A/B/C demand classes). Also its anti-default warning:
   no purple gradient, no glass cards, no emoji doing the talking.
3. **dark.design** — dark software galleries (Railway, Linear, Vercel).
   Lesson taken by contrast and by craft: those pages earn their polish
   from restraint and one accent. StockSetu inverts the palette (bright
   daylight, because a warehouse at work is a daytime place) but keeps the
   discipline: one accent family, no noise.
4. **minimal.gallery** — Swiss-minimal curation. Lesson taken: whitespace
   is a layout tool. The page breathes; sections are separated by air and
   thin rules, not boxes inside boxes.
5. **land-book.com** — B2B landing pages (Baseten, ElevenLabs and peers).
   Lesson taken: the landing grammar — one plain problem statement up top,
   the product itself immediately after, proof (our comparison table) last.
   No feature-grid filler.

## Identity — and how it is not the sibling projects

- **Not SwapSetu** (a model data table): StockSetu leads with a living 3D
  floor, not rows of figures. The only table on the page is the comparison
  result, and it is earned by running the model.
- **Not MediQueue** (a clinic: soft, quiet, care-toned): StockSetu is
  industrial and plain-spoken — stencil labels, floor paint, dock markings.
- **Not Night Touge** (night highway, deep blue, amber sodium light):
  StockSetu is the opposite pole — **daylight**. Pale concrete, white
  steel, sun from the south-east, short shadows.

## Palette

- Page paper: warm off-white `#f4efe6`; ink `#20242a`; quiet panel `#ece5d8`.
- Floor: pale concrete `#cfd0cb`; rack steel `#e8e9e7` with safety-orange
  beam ends `#e07b39` used sparingly (real racking has orange beams).
- Demand classes — the only loud colours, always spent on data:
  - **A fast movers — leaf green `#3d9970`**
  - **B — amber `#e0a526`**
  - **C slow movers — slate `#7d8ca3`**
- Dock and floor paint: safety yellow `#f2c230`.
- Accent for interactive highlights: deep teal `#14655a` (selected zone,
  primary buttons) — chosen against the warm paper so it reads as "active".

## Typography

- System grotesque stack (`system-ui, "Segoe UI", Roboto, sans-serif`) —
  no webfonts, the app must run offline as static files.
- Big plain headlines, sentence case, no hype words.
- All figures in tabular monospace (`ui-monospace, "SF Mono", Consolas`)
  so the stats rail aligns like a dock ledger — the tasteskill app rule.
- The recurring graphic motif is the **bay label**: stencil-style codes
  (`R3 · B07`) set in monospace caps, used in the 3D scene, in section
  eyebrows and in the zone panel. One motif, everywhere (tasteskill:
  "One motif — one shape runs it all").

## Layout grammar

- Landing order is fixed: **Problem → Simulator (solution) → Outcome →
  Honest limits → Footer.** The simulator sits in a wide "floor plate"
  frame with the control bar on top and a quiet stats rail on the right
  (stacked on narrow screens).
- Squared corners (4px max radius), thin ink rules like floor markings,
  generous spacing. Nothing floats in a glass card.

## The 3D scene

- Cutaway: no roof, low walls on the north and east only, so the camera
  always sees in. Elevated three-quarter view; drag to orbit, wheel to
  zoom (own small orbit code — no extra vendored modules).
- Daylight: hemisphere light + one directional sun with shadows
  (1024px map), light haze fog for depth.
- Objects are pooled and capped: 72 bays, boxes as one InstancedMesh,
  3 pickers, dock crates capped at 8. Nothing spawns per frame.
- Pickers are small forklift-pickers built from boxes: body, mast, forks,
  and the carton they are carrying appears after their first pick.
- Zone selection: clicking a rack row highlights it in teal and fills the
  zone panel. Hovering a rack changes the cursor.

## Motion and performance rules

- Animate transform/opacity only in the page; the 3D loop is the only
  continuous animation and it pauses when the tab is hidden or when the
  user pauses the shift.
- Pixel ratio capped at 2 (1.5 on small screens). Reduced-motion: if the
  OS asks for it, the page still works fully — the sim is user-started.

## Honesty rules baked into the design

- The page states plainly, in the outcome section and the footer, that
  this is a **teaching model with simple rules**, and lists those rules.
- Every number on the page comes out of the running model — including the
  comparison table, which re-runs the same seeded order set through both
  layouts when the button is pressed. No figure is typed in by hand.
- Every visible control works. The interaction inventory lives in
  qa/INTERACTION_INVENTORY.md and is checked by the smoke test.
