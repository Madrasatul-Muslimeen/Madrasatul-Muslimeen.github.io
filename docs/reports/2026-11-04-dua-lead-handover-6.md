# MSA-DUA Lead: session handover 6 (4 Nov 2026, about 1:20 pm Sydney)

From the session that took over from `session_01PL2xbMaXuwbA6usFZSB5kr` (handover 5) to the next MSA-DUA Lead. Read
handover 5's "Read first" and sandbox notes; they still hold. **Nothing is running.** Sonnet from the next session (use1102).

## Who is who (moves often; the PMS `p/mmsa.sessionUrl` is the truth)
MSA Master Architect: `session_01PL2xbLWKPLB8R7j79q1pPr` (4 Nov 12:35 pm). PCA: `session_01PL2xbLbJ2UoaKA3tTXpEkq`.
Send with the claude-code-remote `send_message` tool. Two earlier Architect ids were archived: read the PMS first.
New Owner rules to follow: **demo1104** every new demo is named "<name> - v<NN> - J<nn> - DD.MM.YY - h.mm AM/PM" on the page, in
its claude.ai title and on its Library card; **ses1104** session titles carry date and time; **mydb128/lib1103** demos get a
card in the BwN Library with `send_card.py`.

## The Owner's request of 4 Nov, 9:23 am, and where it stands (J104, plan lines D23–D26, ticks 11–14)
"Build a Dua Card and Word Card like the QR Āyah and Word cards … Dua poster like the Asma poster, same settings … poster shows my
Dua Card selections." Answers: tick 11 **B** (reuse the Asma poster's frame and fonts), tick 12 (meanings from the dictionary;
the Lead works out the other word functions like the Quran Word Card), tick 13 A and **tick 14 A (demo v1.05 approved, 10:14 am):
build D26 and D25 first, then D23, then D24.**
- **Demo v1.05** (artifact version 6): https://claude.ai/artifact/9R9UYsxz5r7JoM38jF7PZ8, button "New in v1.05". The picture to match.
  Local copy of its source: scratchpad, not kept; rebuild from the artifact if needed.
- **D26 DONE, handed in** as R9a: branch `claude/dua-r9`, commit `aea922d` (one shared `duaSel` in `dua-poster.js`, a "Your selections"
  chip bar on every card via `cardMenu`, poster/Print/share read it; `dua-poster-r3-browser.mjs` updated 102/0, mutations shared/chips/vowels
  caught; dua-card-r2 128/0, dua-study-page 137/0, bookmark-route 8/0, large-text-dua-study 1779/0). NOT run: hadith-dua-a11y --page=dua,
  night-hadith-dua. Wait for the Architect's release; if a finding comes back, fix on `claude/dua-r9` (merge main in first).
- **D25 NOT STARTED** (R9b, the Asma-frame poster). Design worked out, below.
- **D23 (R10), D24 (R11) not started.**

## D25 design (frame B), worked out from `app/js/asma-poster.js`
Reuse, read-only: `ensureAsmaPosterStyles()` (injects the `.ahp*` CSS and the frame `app/img/asma-poster-frame.webp`),
`fitAsmaPosters(root)` (shrinks title/meaning/Arabic/description/refs to their slots), `.ahp` is 1055:1491 (A4 ratio). Slots:
`.ahp-title` (Name), `.ahp-mean` (orange line), `.ahp-ar` (one-line cartouche, 14.3cqw Naskh), `.ahp-desc` (body, 58% × 27% of the page,
justified, shrinks to fit), `.ahp-ref-q` (left box "Quran") and `.ahp-ref-h` (right box "Hadith"). Mapping for a Dua: title = the
dua's short title (before the first comma); orange line = "Dua N"; cartouche = the first 2–3 Arabic words when Arabic is selected,
empty otherwise; body = the selected parts stacked (Arabic in Naskh rtl, word by word, English, Bangla), sized in em so
`fitAsmaPosters` can shrink them; Quran box = the āyah (a Prophets' dua: button to `quranrevival.html?goto=s:a&back=1`);
Hadith box = `sheet.ref` (unlinked text for now). Honour `duaSel.src` (hide both refs) and `duaSel.vow` (`arText`).
Needs `sheet.no` (the dua number) and `sheet.quran` ("s:a") added in `dua-study.js` where each card builds its sheet.
Also needed: **Print** (`printPoster` + `@media print` in `dua-study.css` for `.ahp`, as asma-study.html does) and **Save as picture**
(`drawPoster` canvas: draw the frame webp at 1055×1491 scale, then text at the same slot fractions). Tests: extend
`dua-poster-r3-browser.mjs` (the `[data-dua-a4]` selectors move to the new page; keep an A4-ratio and fits-one-page check, mutation for
each). Open at the home pop-up size with ← Back (the Asma way: `placeDialogAtHome` in asma-study.js) is part of the Owner's ask: the Dua
poster pop-up is `.dua-popcard` today; check how Asma's `#posterOverlay` sizes itself before copying.

## D24 facts from the MSA Architect (4 Nov 9:50 am), already in J104 line j104p8
Dictionaries `tools/quran-data-pull/output/lemma-dictionary-{en,bn}.json` are keyed by Qur'an lemmas only; a dua word not in the
Qur'an has no entry ("no dictionary entry yet", or a draft marked "to be checked"); credit Quraniyo Obhidhan on every use; matches by written form
are suggestions. Reuse read-only `app/js/lemma-dictionary.js`, `quran-word-card.js` levels, `word-card-depth.js`; do not edit them.
Permanent key exists: `buildUnitKey.duaWord(number, position)` → `duaword:<dua>:<position>`; per-level marks need the Rules answer
(J104 tick 9): ask the Architect before any Firestore write path.

## Waiting on others
Library card for demo v1.05: `send_card.py` was blocked by the sandbox classifier; the card is at the old scratchpad `lib/card.json`
(may be gone). The Owner was told. Ticks 6–10 of J104 and J105 still wait on the Owner (R5–R8, R7). Two older Dua branches (way-back 155,
keyboard 156) are on main already (v13.28).

## Sandbox notes added
- `node serve.js` stops between turns: start it with `nohup … &` in the same command as the suite.
- Playwright for ESM tools: `ln -s $(npm root -g)/playwright node_modules/playwright` (node_modules is git-ignored).
- `git fetch`/`git push` can take over 100 s here: run them in the background and watch with a Monitor.
