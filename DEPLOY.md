# StockSetu 3D — Deploy & File (remaining steps)

The build is finished and tested locally. Everything below needs the
user's own browser/accounts, in this order. Estimated total: ~20 minutes.

## 1. Put it on GitHub (repo creation needs his signed-in browser)

1. Create a new public repo named `stocksetu` under MSAbhishek22
   (github.com/new — the GitHub connector cannot create repos).
2. Push this folder's contents (`index.html`, `style.css`, `js/`,
   `vendor/`, plus the docs). Do not push `qa/*.png` if you want a lean
   repo — harmless either way.
3. Confirm the pushed tree matches this folder (same commit on GitHub
   as the one you deploy — blueprint gate).

## 2. Deploy to GitHub Pages (static, free)

1. Repo → Settings → Pages → Source: deploy from branch `main`, root.
2. Wait for the HTTPS URL: `https://msabhishek22.github.io/stocksetu/`
3. Open that URL as a stranger (signed out / private window) and check:
   - the floor loads and pickers start working,
   - Pause, the rate slider, both layout buttons and Reset all respond,
   - clicking a rack row fills the zone panel,
   - "Run the comparison" fills the table (expect about 12% / 16%).
   If any check fails on the live URL, it does not count as deployed.

## 3. Record the demo video from the LIVE URL (if the form asks)

Screen-record the deployed page, about 90 seconds: orders running →
switch to Slotted → click a rack row → run the comparison → hold on the
table. Upload to YouTube as Public and keep the link for the form.

## 4. Register + submit for i-Hack (deadline: treat as 30 Nov 2026)

1. Go to the i-Hack page: https://www.ecell.in/esummit/ihack and open
   the **Creative Newtech Innovation Challenge** track; read the
   attached track document for the exact deadline, the exact challenge
   statement to answer, and any fee. **If a fee is asked, stop** —
   free-only rule — and report it instead of paying.
2. Register solo (team size 1) with the usual details (name split:
   first "M S", last "Abhishek"; email msabhishekbdps@gmail.com).
3. Submit StockSetu 3D using `SUBMISSION_PACK.md`: live URL from
   step 2, the one-liner, the B2B problem text, the video link if
   asked, and the comparison numbers as printed by the live page.
4. Save the submission confirmation (screenshot or ID) next to this
   file, and only then record it as filed.

## Notes

- The app makes no network calls and needs no environment variables,
  keys or backend — any static host works if Pages is a problem
  (Netlify Drop is the proven fallback).
- Nothing in steps 1–4 may be reported as done until it is seen done:
  the live URL must be opened and the confirmation saved.
