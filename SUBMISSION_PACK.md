# StockSetu 3D — Submission Pack

Event: **i-Hack, E-Summit '26 — Creative Newtech Innovation Challenge**
(IIT Bombay E-Cell). Track facts as verified 24 Nov 2026 in
`~/workspace/hackathons/REELS_HUNT_2026-11-24.md`:

- Solve one of the track's real B2B technology business challenges.
- **Teams of 1–4 — solo entry is allowed.** Hybrid format.
- **₹3,50,000 total prize pool** for the track, including a CMD's
  Excellence Award.
- **Deadline caution:** the track page does not print a deadline (it is
  in an attached document). The sibling i-Hack tracks close
  **30 Nov 2026** — treat 30 Nov 2026 as the deadline until the track
  document says otherwise. Fee not stated on the page; confirm at the
  form. If a fee appears, stop — free-only rule.

## The entry

- **Project name:** StockSetu 3D
- **One line:** A 3D warehouse slotting simulator that lets a warehouse
  owner watch pickers walk — then move the fast movers near the dock and
  watch the walk shrink.
- **The B2B problem:** Small and mid-sized warehouses and 3PLs keep stock
  wherever it first landed. Pickers — the most expensive moving part of
  the building — spend much of every shift walking past slow stock to
  reach fast stock stored at the far end. Slotting (giving every product
  an address based on how often it is picked) is a known, cheap fix, but
  owners resist it because the gain is invisible in a spreadsheet.
- **What StockSetu does about it:** It makes the gain visible. A live 3D
  floor with real picking behaviour under simple stated rules, a layout
  switch, per-rack numbers, and a same-orders comparison that computes
  the saving (12% pick time, 16% walking on the built-in seed) instead
  of asserting it.
- **Who it is for:** Warehouse and 3PL operators, and the consultants and
  software teams who sell them slotting and WMS work — as a first
  conversation tool before anyone pays for a study.

## Honest framing for the form / pitch

- It is a **teaching model with simple rules** — say this plainly,
  exactly as the page does. Do not claim it is a WMS, do not claim real
  warehouse data, do not claim customers.
- The numbers are the model's own, computed live; the rules are printed
  on the page (72 products, 3 pickers, 10:4:1 demand, 4.5 m/s walk,
  2 s picks, no congestion).
- Built solo, with AI coding assistance, in November 2026 for this
  challenge. Static web tech: Three.js for the 3D floor, plain
  JavaScript for the simulation engine. No backend, no accounts, no
  data collected.

## What the filing needs (in order)

1. **Live URL** — deploy first (see `DEPLOY.md`); the judges must be
   able to open the floor and run the comparison themselves.
2. **Registration + submission on the i-Hack / E-Summit portal** before
   the deadline (treat as 30 Nov 2026) — needs the user's browser and
   his details; team size 1.
3. If the form asks for a deck or a write-up: use the one-liner and the
   B2B problem above, plus the comparison numbers from the live page
   (run it once after deployment and quote what it prints).
4. If a demo video is asked for: record from the **live deployment** —
   open the floor, let orders run, switch the layout, click a rack,
   run the comparison. About 90 seconds is enough.

## Status

- Build: complete locally. Engine tests 7/7, browser smoke 13/13,
  0 console errors. See `qa/QA_RESULTS.md`.
- Deployment: **not done** — needs the user's browser (see DEPLOY.md).
- Registration/submission: **not done** — same reason.
- Per the blueprint, this project is INCOMPLETE until it is live at an
  HTTPS URL and filed; the exact remaining steps are in `DEPLOY.md`.
