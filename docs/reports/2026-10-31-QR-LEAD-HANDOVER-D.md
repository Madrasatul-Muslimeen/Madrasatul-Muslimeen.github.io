# QR Lead (Quran Study) — session handover D, 31 Oct 2026

Written by the QR Lead session `session_01PL2xbLGPyYo53GXRKWojym` (hand119), which took over at about 3:40 pm 31 Oct Sydney
from `session_01PL2xbJmkGA8Xw9KyXhrCAb` (its handover: `2026-10-31-QR-LEAD-HANDOVER-C.md`; the older
`2026-10-31-QR-LEAD-HANDOVER.md` still holds the sandbox lessons). `main` is at **v13.02**.

## Who to talk to

| Role | Session |
|---|---|
| MSA Master Architect | `session_01PL2xbLYSNq3VaA8Hi5jFfq` (new since 4:46 pm 31 Oct; the old `…J2ncUt43…` is archived) |
| PCA | `session_01PL2xbN7ENRBkhtTNxJAt2L` |

Hand finished work to the Architect as "QR LEAD ▸ ready for release: …". Never merge, never bump `app/js/version.js`.

## This session

| What | State | Suite (mutation-proven) |
|---|---|---|
| Audit 4, Listening | **Released v13.02** (rebased on v13.01 as `claude/qr-lead-audit4-v13`) | `qr-listening-large-text` 176/0 |
| Audit 5, Mushaf view (Manual d9d78ub): in the bare full screen on a phone at 150/200% the page reference shrank to ▾ and Notes / Record / Approach cut "Approach" | **Released v13.02** (`claude/qr-lead-audit5-v13`) | `qr-mushaf-large-text` 151/0 (unfixed 125/16), 5 mutations |
| J108 v13.01, Quran Study side | Reviewed OK; the two stale `read-quick-buttons` assertions were updated by the Architect | — |
| Audit 6, Word card (Manual 9a6dqv8): Taṣrīf's case table ran past the card at 150/200% on phones (474px in 316 at 360x740 200%), so the whole card slid sideways and its top bar was cut | **Built, NOT yet handed in**: branch `claude/qr-lead-audit6-wordcard` (on v13.01). Under an 18rem card each row's name takes its own line above its three cells (CSS only, `@container wordcard (max-width: 18rem)`); nothing moves at 100% | `qr-word-card-tasrif-fit` 68/0 (unfixed main 50/18), 3 mutations (no-stack 18, no-grid 10, wide 4) |

Old branches `claude/qr-lead-audit4-listening` / `claude/qr-lead-audit5-mushaf` are superseded (force-push was refused here,
so the rebased work went to the `-v13` names); they can be deleted.

## Open

1. **Audit 6 hand-in**: rebase `claude/qr-lead-audit6-wordcard` on `main` (v13.02), check the neighbour run
   (`word-card-tasrif-noun`, `word-card-tasrif-arabic-size`, `word-card-tasrif-blocks-basic`, `word-card-basic-rebuild`,
   `text-size-wbw`, `quran-word-card-fullscreen`, `apps-build-check`; it was running at handover), look at a screenshot of the
   table at 320x640 200% en and 360x740 200% bn, and hand in.
2. **Word card, two more findings at 200% on a phone (not fixed)**: (a) the five level tabs break their names inside the word
   at 320x640 200% ("Ro ot", "Fa mily", "De pth"); at 768x1024 / 740x360 200% their second line is cut ("Root where it c…"
   165>134). (b) A long Arabic form in a Taṣrīf cell breaks inside the word ("ٱلْأَسْمَآ / ءُ"; at 320 200% "بِأَسْمَآئِهِمْ" needs
   121px of a 64px cell; this was so before audit 6 too). Breaking an Arabic word changes how it reads: shrink only the words
   that do not fit (a measured fit, floor about 0.8 of the size), never break them.
3. **Contrast, Builder audit part 142 D4–D6 (the PCA and the Architect both passed them to the QR Lead)**: `.wheel-heading` gold
   `#c9a24b` on white 2.4:1 (`quranrevival.html` ~565); `.wheel-unit-capsule-caret` 4.49:1 (~676); Light look `.ways-caret`
   1.45:1 (~1135). Fix to at least 4.5:1 for text, 3:1 for a mark, with a measured suite, and hand to the Architect.
4. **The A± check on QR**: quranrevival.github.io serves v13.01 from 5:18 pm (the A± fix's code is in its page). Run against a
   local QR build (`node tools/apps/build-app.mjs qr`, copy `serve.js` into `build/qr`, `PORT=8081`, `QR_BASE=http://localhost:8081`),
   `qr-text-size-reach` gives 234/4: two are the 100% "nothing moves" checks (their positions were recorded on MSA; QR's ⋯ panel
   holds different tools, so expected), and **two are real for QR: at 1280x800 200% (en and bn) the "en" slider in the A± panel
   cannot be tapped** (something QR-only covers it). Find what is at the point (`elementFromPoint`), fix in Quran Study, and tell
   the PCA. Not yet filed in the PCF.
5. **j29p127q (PCF J29)** still waits on the Owner (A/B/C, Āyah card Status check). Build it the same day it is answered.

## Possible next (no Owner choice needed)

After 1–4: **Explore** (Manual 8lle31u) at 150/200% and sideways, en+bn. Same method as before.

## Sandbox lessons added this session

- **Force-push is refused here.** After a rebase, push to a new branch name and say so in the hand-in.
- **The container can restart mid-run**: background suites are lost; restart `serve.js` (`nohup node serve.js &`) and re-run.
- **A probe that lives in `tools/i18n-verify` trips the stop hook as untracked**: keep probes in the scratchpad and import the
  harness by its absolute path.
- **Writing a handover while suites run**: use `git worktree add` so the served working tree does not change under them.
- **An `if (x) body.classList.add(...)` mutation that replaces the call with "" leaves an `if` with no body**: the page stops
  booting and the suite times out; replace with `void 0;`.
- **A "nothing moves" mutation needs a case where the rule could wrongly fire**: audit 5's `always` went unproven until the
  suite forced a long, partly-cut reference at 100%.
