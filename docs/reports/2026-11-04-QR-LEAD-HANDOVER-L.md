# QR Lead (Quran Study) — session handover L, 4 Nov 2026, 1:37 pm Sydney

Written by the QR Lead session `session_01PL2xbLoLprZqzP6wJDTeZ8` (taken over from handover K). Handed over at the Owner's usage rule (use1102, about 15% context) **before** starting the K3 job, so the next Lead starts it clean.
`main` was **v13.29** (6ed514d) when written; read it off `app/js/version.js`. Architect: `session_01PL2xbLWKPLB8R7j79q1pPr` (the PCF p/mmsa.sessionUrl says if it moves). PCA: `session_01PL2xbL9r5wP8zyi6A3Hj8j`.

## The job waiting: place K3 "Read next" on the Āyah card and on QR's Word card (from the Architect, 4 Nov 02:35 UTC)

> K3 "Read next" is built on branch `claude/j03-k3-read-next` (head ba999af1b56013ccfad5969f5cd67af3bd8c4d43, from main 6ed514d; in review, not merged yet). Please place it on the Āyah card and on QR's Word card, as a new small PR from that branch (or from main once K3 merges; I'll tell you). API:
> `import { renderReadNext } from "./js/read-next-ui.js"; renderReadNext(hostElement, ctx)` → appends `<section class="read-next">`, returns it. Each ctx value may be a value, a function, or a function returning a promise; nothing loads until a tab is opened; a missing entry = no tab; injects its own CSS; takes the card's text colour.
> `ctx = { quran: ["36:38"|[s,a]|{surah,ayah}…], backTo: "ayah"|"word", hadith: [ayah-hadith.js hits] | {shown,more}, self: {book,n}, words: HadeethEnc words_meanings, lemmas: ["شَمْس",…], lemmasFrom: "heading", scholars: "tafsir"|"hadith+tafsir", compilerBook: "<OpenITI id>", tafsir: true | {explanation,hints,ayat:["s:a"]} }`.
> Āyah card suggestion: `{ quran: () => relatedRefs, hadith: () => loadAyahHadithHits(s,a), lemmas: ayahLemmas, scholars: "tafsir", tafsir: { ayat: [`${s}:${a}`] }, backTo: "ayah" }` — and DON'T duplicate: the card already has Related āyāt / Related hadith sections, so either fold those into the Qur'an/Hadith tabs or omit those two tabs and keep the sections (your call; **tell the Architect which**). Word card: `{ quran: the lemma's places, lemmas: [lemma], scholars: "tafsir", tafsir: true, backTo: "word" }`. Review matrix as for K2 (360–1440, en/bn, 100/150/200%), way back kept. This one can ship on its own (no Rules).

Where to look: the Āyah card is `renderAyahActionSheetNow()` / `ayah-action-sheet.js` (`renderAyahActionSheetHtml`, its Info block holds Related āyāt / Related hadith / Connected āyāt); the Word card is `renderPersistentWordCard()` → `renderQuranWordCard()` in `quran-word-card.js`. Both already take a ready-made HTML string for new blocks (`marksHtml`, K2) — the same pattern works for a host element the page fills with `renderReadNext()` after the card is drawn (wire AFTER the `innerHTML =` assignment, see lessons).

## What this session handed in (all PRs open as drafts, none merged; the Architect releases)

| Hand-in | Branch / PR | State |
|---|---|---|
| **K2** (J03): three marks Difficult / Need practice / Done on the Āyah card and Word card, and the Marks wheel's three views | `claude/qr-lead-k2-marks` · **#1454** (stacked on K0 #1450, f9f1aa6) | **HELD**: ships with K4 (Rules the Owner publishes), after K0 lands. When K0 merges: merge `main` into the branch (no rebase, no force-push) and re-run `marks-k2-browser.mjs` (76/0), `marks-k2-matrix-browser.mjs` (90/0), `ayah-keys.mjs` (63/0). |
| **Intention reminder** (J05; Owner 4 Nov: "Reminder text for all MSA, Build it") | `claude/qr-lead-intention-reminder` · **#1455** (from main) | Waiting on the Architect: place in Hadith / Dua / Seerah (call `intentionCardHtml` + `wireIntention`, same keys), and a version. |
| **Guides' text (T15 = A) + question card data + on/off toggle** (J05; Owner 4 Nov: "T15: A, Go with the question … Keep it on/off option with toggle") | `claude/qr-lead-guides-question-card` · **#1456** (stacked on #1455) | Two change requests sent to the Architect, **no answer yet**: (1) may I edit the shared Note window to show the card (`questionCardHtml`/`wireQuestionCard`), or will they; (2) apply `GUIDE_TEXT` to `catalogue-data.js`. Default On is my reading of "keep it". Not built: the Note's faint prompt (tab 2, not in the Owner's answers), gap D (Hadith Lead), gap F (Approaches 24–26). |

Waiting on the Owner (build nothing): **J29** `j29qrl23q` / `j29p127q`. (J05 j05n5 is answered and built, above.)

## New lessons (add to handovers H–K)

- **A wheel kind can be veiled.** `#wheelStageWrap.wheel-veiled` blurs and darkens the wheel until the reader dismisses the intro; a wheel that has no Approach to pick must override it (`.wheel-marks`, see K2's `marks-ui.js`).
- **Wire AFTER the `innerHTML =`**: the Word card's draw is `content.innerHTML = renderQuranWordCard(...)` several lines AFTER the "Round 6" comment; a `wireX(content)` placed before it wires the old DOM and the tap does nothing (found by K2's suite; the probe showed no write).
- **The harness stub never mutates its data, so every read gives the seed again.** After a tap that adds a key, a second tap that removes one is computed from the SEED, not from the first write. Expect `[hard]` not `[]` etc. (K2's suite documents it).
- **A flex row inside `#wheelContainer` squeezes an SVG**: put the wheel and anything beside it in one full-width block (`.mk-wheel-wrap`), found only by the 360 px / 150–200% matrix.
- **A mutation that cannot fail is a finding**: the "startup" mutation of the intention suite passed because nothing ran at start-up to remove; it was rewritten to PAINT at start-up. `bnleak` was unproven until a check read the Bangla text of the block.
- **The screenshot can be of the wrong moment**: the first intention screenshot had the Study menu open over the card; take it after closing menus.
- **Matrix recipe**: `document.documentElement.style.fontSize = pct + "%"`; widths 360, 390, 768, 1024, 1440; phones need the Wheel drawer opened (`#wheelDrawerRow [data-wheel-drawer="wheel"]`) and `#tabApproachBtn` to leave Read.
- **Stale test, not mine**: `audit-part12-words-browser.mjs` "quickmenu: Note & more…" fails identically on `main`/K0 (stale since v13.26); the Architect knows.
- **QR build check**: after editing `quranrevival.html`, run `node tools/apps/apps-build-check.mjs` (48/0) and `node tools/apps/build-app.mjs qr`: an edit whose anchor moved stops QR's build.
- Sandbox: symlink Playwright (`mkdir -p node_modules; ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright`), `curl` the server (`PORT=8080 node serve.js`) before a long run, never `pkill -f` a name in your own command line (exit 144), wait on a done-file with Monitor, never `sleep` in a command.

## Opening message for the next QR Lead

> You are the Module Lead for Quran Study inside the MSA repo, taking over from `session_01PL2xbLoLprZqzP6wJDTeZ8`. Read CLAUDE.md (MODULE LEADS block and the two-reading-views block), then `docs/reports/2026-11-04-QR-LEAD-HANDOVER-L.md` on branch `claude/qr-lead-handover-1104l`. FIRST: place K3 "Read next" on the Āyah card and QR's Word card (the Architect's brief is in that handover); work only on Quran Study files, on your own branches; hand finished work to the MSA Master Architect as "QR LEAD ▸ ready for release: …"; never merge, never bump `app/js/version.js`. Watch PRs #1454, #1455, #1456 and answer the Architect's replies. After 'Rasulullah' always write 'Sallallahu A'laihi Wa Sallam'. Usage rule use1102: hand over at about 15% context; message only when there is work; no self wake-ups.
