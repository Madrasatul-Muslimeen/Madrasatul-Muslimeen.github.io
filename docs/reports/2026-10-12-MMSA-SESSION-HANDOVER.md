# MMSA session handover, 12 Oct 2026

Written by the MMSA Architect, session `session_015GBL8aB9mfR2h1FyDQjoFb` (11–12 Oct 2026, v10.24 → v10.28). It
supersedes `docs/reports/2026-10-11-MMSA-SESSION-HANDOVER.md`, which is kept as history (its release list runs to
v10.28). Read `CLAUDE.md` first. The prompt that starts the next session is
`docs/governance/NEW-SESSION-PROMPT-2026-10-12.md`.

This session was summarised once (its context compacted), which is why it hands over here.

## LATEST UPDATE — 25 Oct 2026, 5:15 am Sydney, session `session_0185XGUtQx6FfCbxmUqRkA7t` (v12.57–v12.60 live on MSA AND QR; HANDOVER) — READ THIS FIRST

Took over 11:30 pm 24 Oct from `session_01B9Hi1rr2d2qrrWup4feqnB`. Handing over (hand119, ~40% context). PCA `session_01MjY3uJ57nrwjD6jMdmxMSJ` (MSA keep-alive is `trig_01SqWy1FS4sohZL7Q4bcnEx3`, 8:07 am/pm Sydney, pointed at me: ask the PCA to repoint it). QR Lead `session_01VBNLiqBHEzJqKxKJTvS2sa`; Hadith Lead `session_01Q2HmCeWjo1vVYV5kgMBvC9`; Health Lead `session_01SPFtgC4vwVzby6PR12Z9ek` (nothing from Hadith/Health this session).
**`main` is v12.60** (PR #1162, merge `a2ffaeb8`, live on MSA 4:38 am, brief 13/0, ledger ok, mutations 49/0). **Next release: v12.61.** **QuranRevival is v12.60 too** (live 4:39 am): **`add_repo QuranRevival/QuranRevival.github.io` (push) WORKED this session**, so I dispatched `build-from-msa` (msa_ref main) myself after every release (via `mcp__github__actions_run_trigger`, workflow `build-from-msa.yml`, ref main). Try add_repo first; if it works, no Owner tap is needed.

**PMS writes were REFUSED all session** (this session's auto-mode permission check, "External System Writes"); reads work. The PCA set p/mmsa.sessionUrl and p/qr.sessionUrl. **Not written, for the next session to write if it can:** What's New lines for v12.57, v12.58, v12.59, v12.60 (p/mmsa.manual index 1), J29 Done lines (parts 81–87b) and the monitor line; the **four Manual wording corrections** (below). Never ask a peer to write for you (permission laundering): if refused, ask the Owner.

**Owner messages this session (carry1):** none; no Owner change in the PMS.

**Released this session**
- **v12.57** (#1153, mine): onboarding ← Back (nav.js "no account" link → `onboarding.html?navBack=1`; `mountNavBack()`); accept-invite owes none (checked by a source scan). From audit part 84.
- **v12.58** (#1152, QR Lead round 13): Mushaf 🔖 tap 23–51 ms (was ~2 s; `hifz-renderer.js` justifies in passes, yields between pages); Word card ✕ and family "+N more" font-proof at 320; Taṣrīf toggle never breaks a word.
- **v12.59** (#1157, Builder #1156 + mine): real-length screen audit of 23 shared pages (963/0); Deen/Arabic select overflow, Taglines selects, Self-check size and Bangla fixed; suite corrections (closed `<details>`, body overflow → viewport, finger-reach tap areas).
- **v12.60** (#1162, mine): account card Name + Roles (`account-card.js`, roles split off the tenant option text, no read); topic-page ☆ asks "Already bookmarked" (the Owner's J22 rule) via `openBookmarkExistsChoice()`.
- Report/test merges: #1147 (part 81), #1148 (part 83, mine: read-window, asma-screensaver, quran-* 7, qr-* 8, dua/hadith 14), #1149 (part 82), #1151 (84), #1155 (85), #1159 (87), #1161 (87b).

**J29: the regression sweep of every existing suite is COMPLETE** (parts 70–83). Then the feature audit: parts 84–86 (screens of all 23 shared pages, real-length data, suite `unchecked-pages-screen-audit-browser`), 87/87b (the User Manual's MSA sections claim by claim, suite `manual-claims-msa-browser`, sections start / bookmarks / teaching / notes).

**IN FLIGHT / NEXT**
1. **Builder #1163** (audit part 87c, dispatched ~5:05 am): the Manual's last three Notes entries (Import Notes, My Notes page, Dawah pages) + `--mutate=notes` — run 1957 built them but its last push failed (`401 Failed to get branch reference`). Review; merge if test/report only.
2. **Manual wording corrections to write into the PCF** (p/mmsa.manual, the Owner's text: pin with if_version, keep the Owner's meaning): (a) The way back: "Press the ← Back button (it reads "← Back to <page>" when you arrive from a bookmark or a reference)"; (b) Mapping My Journey: "Home ▾ → Mapping My Journey opens it (as a pop-up window on pages that have the Journey tab, as the full page elsewhere)"; (c) Notes pane: "…as a pop-up window over the reading on a computer … full screen on a phone or tablet"; (d) View as: reached via Home ▾ → My account; (e) link previews: "⋯ → Show link previews → Turn on"; (f) My Note tools: "Use New note from this next to a template". Reports: `docs/reports/2026-10-25-audit-part87-manual-claims.md`, `...-part87b-manual-claims-notes.md`.
3. **Next audit slices (Builder):** an interaction audit (keyboard: Tab reaches every control with a visible focus ring; Esc closes every pop-up) on the 23 shared pages, extending `unchecked-pages-screen-audit-browser`; then the Manual's Hadith/Dua section (report to the Hadith Lead).
4. **J88 part 2** (`fix/self-hosted-auth-on`): release ONLY after the Owner ticks `j88n1`.
5. `manual-claims-msa-browser` is red by design on J92 (Hand the device to a child, 2 checks) until the Owner decides.

**Waiting on the Owner:** PMS write permission for this session; **J89** (āyah room on a small phone: the 320x640 badge finding is in J89, student-facing), **J94** (Āyah card Status heading at 1100x800, from J72 part 2's shared size; QR Lead recommends A), the QR Lead's Read-bar A/B/C, **J92**, **J88 j88n1**, J91, n81c, n83a, n79a, n77a, n78a, n71c, n81a, n81b, n82a, n82b, n72d; the Hadith Lead's tick on the Hadith/Dua "My Notes" links.

**Lessons**
- **A Builder run can lose its runner** (run 40104897248: 55 min, no logs, nothing pushed). Re-dispatch once with a narrower scope and "push after each entry".
- **A Builder push can fail with `401 Failed to get branch reference`** late in a long run (run 1957). Merge what landed and send the rest as a short follow-up round.
- **Bisect a stale-looking failure before handing it on** (`git bisect run` with a probe copy of the suite on a worktree at 8084): `quran-ayah-action-sheet` 1100x800 was J72 part 2, two Owner decisions meeting, not a slip.
- **A measurement suite needs its own corrections recorded**: a closed `<details>` keeps its children's boxes in Chromium; with `<html>` not clipping, the body's `overflow` is the viewport's; a small drawn button can carry an invisible 40px tap area (test finger reach with `elementFromPoint` ±19px).
- **`translateStatic()` looks text up EXACTLY as written** (inner newlines included): put a translatable paragraph on one line.
- `qr-stage1-hidden-browser` is an MSA suite with a v11-era `qr-` name: run it against MSA (110/0), not the QR build.
- QR's `run-all.sh` `upgrade-browser` needs `QR_REPO` (a full QR clone at fe028eb): 27/28 without it.

**The opening message for the next session** (send it as is):

> Bismillah. You are the MSA Master Architect, taking over from session_0185XGUtQx6FfCbxmUqRkA7t (hand119 handover, 25 Oct ~5:15 am Sydney). Read CLAUDE.md, ARCHITECT.md, then docs/reports/2026-10-12-MMSA-SESSION-HANDOVER.md, its LATEST UPDATE block of 25 Oct 5:15 am first. Read the PMS (https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ): meta/global General rules (cost86, rec118, hand119, lead120, ka122, onehome71) and p/mmsa (carry1, stu123); answer any new Owner comments. Set p/mmsa.sessionUrl and p/qr.sessionUrl to your session link (pin with if_version); if PMS writes are refused (they were all last session), ask the Owner to allow them and never ask a peer to write for you. Then write the backlog: What's New lines for v12.57–v12.60, J29 Done lines (parts 81–87b), the monitor line, and the six Manual wording corrections listed in the handover. The PCA is session_01MjY3uJ57nrwjD6jMdmxMSJ: send 'PCA ▸ taken over' listing each running item with its state, and ask it to repoint the MSA keep-alive (trig_01SqWy1FS4sohZL7Q4bcnEx3).
> State: main is v12.60 (live on MSA 4:38 am and QR 4:39 am, 25 Oct). Next release v12.61. add_repo QuranRevival/QuranRevival.github.io (push) WORKED last session: try it; if it works, after every release dispatch build-from-msa.yml (ref main, inputs msa_ref=main) with mcp__github__actions_run_trigger and confirm quranrevival.github.io/app/js/version.js; else put the Owner's tap on the PMS monitor line.
> Leads: QR Lead session_01VBNLiqBHEzJqKxKJTvS2sa (QR-only files: app/quranrevival.html, app/js/quran-word-card.js, Quran-only scripts, apps/qr/**); its J89 (badge/āyah room) and J94 (Status heading) wait on the Owner. Hadith Lead session_01Q2HmCeWjo1vVYV5kgMBvC9; Health Lead session_01SPFtgC4vwVzby6PR12Z9ek. Leads never dispatch Builders or release; they hand PRs over as "<LEAD> ▸ ready for release". Review each by measurement on a worktree (PORT=8083 node serve.js, QR_BASE=http://localhost:8083; check the port answers 200 first), allocate, release. Students test QR: student-blocking faults first (stu123).
> Running items: (1) Builder round #1163 (audit part 87c: the Manual's Import Notes, My Notes page, Dawah pages + --mutate=notes), dispatched ~5:05 am: watch the RUN (claude.yml runs?event=workflow_dispatch), review, merge if test/report only. (2) Next Builder slices: a keyboard/focus/Esc interaction audit of the 23 shared pages extending unchecked-pages-screen-audit-browser; then the Manual's Hadith/Dua section (report to the Hadith Lead). ≤ 14 suites or one Manual section a round, push after each entry, suites in the FOREGROUND, final message holds the table (copy issue #1158's body). (3) J88 part 2 on fix/self-hosted-auth-on: release ONLY after the Owner ticks j88n1. (4) The Builder cannot edit PR bodies; review directly; a late push can fail with 401: merge what landed, send the rest as a follow-up round.
> Release steps: merge main into the PR branch FIRST, then python3 tools/governance/allocate-version.py VER NEXT SHORT NOTE MILESTONE CHANGELOG (it also writes the handover line; commit and push at once); run the five non-ledger verify suites (rules-authorisation-executable, study-activity-evidence-boundary(+mutations), study-event-wiring, workflow-expressions), apps-build-check and node tools/apps/build-app.mjs qr; the release head's verify is red by design (programme-ledger reads origin/main); merge via merge_pull_request with the full 40-char expectedHeadSha; then fetch all branches and run brief-integrity, programme-ledger, programme-ledger-mutations; confirm madrasatul-muslimeen.github.io/app/js/version.js; rebuild QR; PMS What's New line (p/mmsa.manual index 1), J29 Done line with W-T-P-E-O, monitor line.
> Waiting on the Owner: PMS write permission, J89, J94, the QR Lead's Read-bar A/B/C, J92, J88 j88n1, J91, n81c, n83a, n79a, n77a, n78a, n71c, n81a, n81b, n82a, n82b, n72d; the Hadith Lead's tick on the Hadith/Dua "My Notes" links.
> Keep-alive every 12 hours (8:07 am/pm Sydney; ka122). No self wake-ups (cost86). Hand over at ~40% context (hand119), and include the full opening message for your successor in the message to the PCA.
> Sandbox: node serve.js (8080), worktrees on 8083+ (never 8082); mkdir -p node_modules && ln -sf /opt/node22/lib/node_modules/playwright node_modules/playwright; CHROMIUM_PATH=/opt/pw-browsers/chromium; git fetch --unshallow origin main; at most two browser suites at once. gh works for REST (create issues with gh api repos/…/issues --input; dispatch with gh api -X POST …/actions/workflows/claude.yml/dispatches -f ref=main -f 'inputs[issue_number]=N'). Never pkill -f (it matches itself): kill a server by its cwd.

---

## LATEST UPDATE — 24 Oct 2026, 11:30 pm Sydney, session `session_01B9Hi1rr2d2qrrWup4feqnB` (v12.55–v12.56 live on MSA; QR still v12.43; HANDOVER) (superseded 25 Oct 5:15 am)

Took over 8:07 pm 24 Oct from `session_01MgT1xkk3XPgSpZkpTZQ6wW`. Handing over (hand119, 36% context). **New PCA: `session_01MjY3uJ57nrwjD6jMdmxMSJ`** (moved 10:15 pm; the old PCA session is retired). **New QR Lead: `session_01VBNLiqBHEzJqKxKJTvS2sa`** (took over from `session_01TsfGsiLVCx7NHy9rHkE8Pn` ~10:13 pm). Hadith Lead `session_01Q2HmCeWjo1vVYV5kgMBvC9`; Health Lead `session_01SPFtgC4vwVzby6PR12Z9ek` (both unchanged, nothing from them this session).
**`main` is v12.56** (PR #1140, merge `ef501673`, live on MSA 10:26 pm; brief 13/0, ledger ok, mutations 49/0). **Next release: v12.57.** **QuranRevival is still v12.43**: `add_repo` (push) was refused again (auto-mode permission); the Owner's build-from-msa tap is on the PMS monitor line.

**Owner messages this session (carry1):** none. No Owner change in the PMS between 8:07 pm and 11:30 pm.

**Released this session (live on MSA; not on QR)**
- **v12.55** (#1131, QR Lead round 11, 9:27 pm): Āyah card heading one line at 390 (line one's gaps 0.25rem); QCR/Asma wheels `justify-content: safe center` at 1440; WbW wheel `max-width: 100%` + 4px padding <380px. Architect re-measured; `qcrpane` mutation now unproven (safe centring covers it; recorded).
- **v12.56** (#1140, QR Lead round 12, 10:26 pm): one cause behind parts 73/74/75/77 on a computer: the Zab bar (mounted after the page since v12.38) moved `#dock` with its 44px spacer. `html.zab-reserve` holds the room from first paint on ≥768px; landing and Explore windows refit on `body.zab-bar-on`. Mutations `noreserve`, `nozabrefit` fail.
- Report/test merges (no version): parts 70 (#1125), 71 (#1128), 72 (#1127, mine: two stale Zab checks), 73 (#1133), 74 (#1130), 75 (#1134), 76 (#1136), 77 (#1137, mine: two stale Bangla-digit checks; the tajweed one could not tell a word from its neighbour), 78 (#1139), 79 (#1141, mine), 80 (#1143).

**J29 regression sweep — where it stands.** Swept on today's app: every audit suite, all `journey-*`, `bookmark-*`, `bangla-*`, `zab-*`, `writing-*`, Notes, shared screens, approach/catalogue/claim/landing, kys/study/unit + singles, `read-*` (14 of 15), Explore, known words, wheel, Al-Fatiha, QCR, tajweed, vocabulary, `mushaf-*`, `word-*` 1–28, `ayah-*` (6 green, 6 crash: part 81). **Not yet swept:** `read-window-browser`, `word-*` 29–32 and `asma-*` (part 82, issue #1145, ready), `asma-screensaver`, `quran-*` (7), `qr-*` (8, need the QR build), `dua-*` (9) and `hadith-*` (3) (Hadith Lead's: report only), `hadeethenc-*` (1 left).

**IN FLIGHT / NEXT — the next session's first jobs**
1. **Builder round #1144** (audit part 81, dispatched ~11:25 pm): make the six crashing `ayah-*` suites run to the end. Cause (a), measured: since v12.26 (J81 part 3) a note opens in the Mapping My Journey tray, and these suites still wait on the old `#readNotePane` / `[data-rnp-back]` (stale). Cause (b), not yet known: `[data-ayah-related-jump]` / `[data-ayah-num-badge]` rows exist but are "not visible" to the click. Watch the RUN; review; merge if test/report only.
2. **Then dispatch #1145** (audit part 82: last 4 `word-*` + 10 `asma-*`; Asma is frozen in MSA: report only).
3. **With the QR Lead** (all in `app/quranrevival.html` / `quran-word-card.js`; review + release each hand-back as v12.57+): (i) phone Read bar: the ← Back chip takes its own line and 📜 adds a line at 320/820, one root (v11.35's 📜 + J63's ★), **the QR Lead has put A/B/C to the Owner**; (ii) Word card en/320: ✕ wraps (J59 re-broken) and the family row's "+N more" drops (`fitWordCardFamilyRows` `i > 0` → `i >= 0`); (iii) Mushaf: a 🔖 tap waits ~6 s for the whole-surah render (48 pages, ~30 long tasks); (iv) low: "Command" and a Taṣrīf column head cut at 320/390 (maybe font-dependent).
4. **QR rebuild**: try `add_repo` once; else keep the Owner's tap on the monitor line (v12.44–v12.56 wait on it).
5. **J88 part 2**: `fix/self-hosted-auth-on` has `main` merged in (8:1x pm, one line over main). Release ONLY after the Owner ticks J88 `j88n1`.

**Waiting on the Owner:** the QR rebuild tap (or allowing the repo), the QR Lead's Read-bar A/B/C, **J92**, **J88 j88n1**, **J89**, **J91**, n81c, n83a, n79a, n77a, n78a, n71c, n81a, n81b, n82a, n82b, n72d; the Hadith Lead's tick on the Hadith/Dua "My Notes" links.

**Lessons**
- **A release head's `verify` is always red before merge** (programme-ledger reads `origin/main`); v12.54's was too. Run the five non-ledger suites locally, merge, then confirm brief/ledger/mutations on `main`.
- **`allocate-version.py` already appends the handover line**; do not add one by hand (I did once and removed the duplicate).
- **`pkill -f` matches its own command line** and killed my shell (exit 144). Stop a server by its cwd: `for p in $(pgrep -x node); do readlink /proc/$p/cwd; done`, then `kill <pid>`.
- **A stale server can hold a port after its worktree is removed** and serve 404s. Check `curl …/app/quranrevival.html` is 200 before a measurement.
- **Two browser suites at once can turn a real 6 s delay into a "flaky" crash.** Re-run alone, then PROBE the time (the Mushaf 🔖 finding).
- **The unattended Architect workflow may merge a clean report PR** before you do (#1133); read `main`'s log before assuming.
- Probe files: extract a suite's preamble with `awk '/^\/\/ ONLY=/{exit} {print}'` and wrap the probe in `{ }` (top-level names clash).

**The opening message for the next session** (send it as is):

> Bismillah. You are the MSA Master Architect, taking over from session_01B9Hi1rr2d2qrrWup4feqnB (hand119 handover, 24 Oct ~11:30 pm). Read CLAUDE.md, ARCHITECT.md, then docs/reports/2026-10-12-MMSA-SESSION-HANDOVER.md, its LATEST UPDATE block of 24 Oct 11:30 pm first. Read the PMS (https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ): meta/global General rules (cost86, rec118, hand119, lead120, ka122, onehome71) and p/mmsa (carry1, stu123); answer any new Owner comments. Set p/mmsa.sessionUrl and p/qr.sessionUrl to your session link (pin with if_version). The PCA is now session_01MjY3uJ57nrwjD6jMdmxMSJ: send 'PCA ▸ taken over' listing each running item with its state, and ask it to repoint the MSA keep-alive.
> State: main is v12.56 (live on MSA 10:26 pm 24 Oct). Next release v12.57. QuranRevival is still v12.43: add_repo QuranRevival/QuranRevival.github.io (push) was refused in the last three sessions; try once; if it works dispatch build-from-msa (msa_ref main) and confirm quranrevival.github.io/app/js/version.js; else keep the Owner's tap on the PMS monitor line.
> Leads: QR Lead is NEW, session_01VBNLiqBHEzJqKxKJTvS2sa (QR-only files: app/quranrevival.html, app/js/quran-word-card.js, apps/qr/**). It holds four sweep findings (Read bar A/B/C with the Owner; Word card ✕ and family row at en/320; Mushaf 🔖 waits ~6 s; two small text cuts). Hadith Lead session_01Q2HmCeWjo1vVYV5kgMBvC9; Health Lead session_01SPFtgC4vwVzby6PR12Z9ek. Leads never dispatch Builders or release; they hand PRs over as "<LEAD> ▸ ready for release". Review each by measurement on a worktree (PORT=8083 node serve.js, QR_BASE=http://localhost:8083; check the port answers 200 first), allocate, release. Students test QR: student-blocking faults first (stu123).
> Running items: (1) Builder round #1144 (audit part 81: the six crashing ayah-* suites; stale note-pane waits since v12.26/J81 part 3, plus three "not visible" clicks to diagnose), dispatched ~11:25 pm: watch the RUN (claude.yml runs?event=workflow_dispatch), review, merge if test/report only. (2) Then dispatch issue #1145 (audit part 82: last 4 word-* + 10 asma-*). Next slices: read-window, asma-screensaver, quran-* (7), qr-* (8, against the QR build), then dua-*/hadith-* (report to the Hadith Lead). ≤ 14 suites a round, push after each, suites in the FOREGROUND, final message holds the table (copy issue #1145's body). (3) J88 part 2 on fix/self-hosted-auth-on: release ONLY after the Owner ticks j88n1. (4) The Builder cannot edit PR bodies or set drafts; review directly.
> Release steps: merge main into the PR branch FIRST, then python3 tools/governance/allocate-version.py VER NEXT SHORT NOTE MILESTONE CHANGELOG (it also writes the handover line; commit and push at once); run the five non-ledger verify suites (rules-authorisation-executable, study-activity-evidence-boundary(+mutations), study-event-wiring, workflow-expressions), apps-build-check and node tools/apps/build-app.mjs qr; the release head's verify is red by design (programme-ledger reads origin/main); merge via merge_pull_request with the full 40-char expectedHeadSha; then fetch all branches and run brief-integrity, programme-ledger, programme-ledger-mutations; confirm madrasatul-muslimeen.github.io/app/js/version.js; PMS What's New line (p/mmsa.manual index 1), J29 Done line with W-T-P-E-O, monitor line.
> Waiting on the Owner: the QR rebuild tap, the QR Lead's Read-bar A/B/C, J92, J88 j88n1, J89, J91, n81c, n83a, n79a, n77a, n78a, n71c, n81a, n81b, n82a, n82b, n72d; the Hadith Lead's tick on the Hadith/Dua "My Notes" links.
> Keep-alive every 12 hours (8:07 am/pm Sydney; ka122). No self wake-ups (cost86). Hand over at ~40% context (hand119), and include the full opening message for your successor in the message to the PCA.
> Sandbox: node serve.js (8080), worktrees on 8083+ (never 8082); mkdir -p node_modules && ln -sf /opt/node22/lib/node_modules/playwright node_modules/playwright; CHROMIUM_PATH=/opt/pw-browsers/chromium; git fetch --unshallow origin main; at most two browser suites at once. gh works for REST (create issues with gh api repos/…/issues --input; dispatch with gh api -X POST …/actions/workflows/claude.yml/dispatches -f ref=main -f 'inputs[issue_number]=N'). Never pkill -f (it matches itself): kill a server by its cwd.

---

## LATEST UPDATE — 24 Oct 2026, 8:05 pm Sydney, session `session_01MgT1xkk3XPgSpZkpTZQ6wW` (v12.50–v12.54 live on MSA; QR still v12.43; HANDOVER) (superseded 11:30 pm)

Took over 9:06 am 24 Oct from `session_01JcT4DEWmQ2vkF4towUzMBe`. Handing over (hand119, ~40% context). PCA: `session_01HqedLzJPW6qKznTRoYyron` (ask it to repoint the MSA keep-alive `trig_01QHSCRKb7W4QZPBwnhFUz5S` to the next session). Leads: MSA-QR-LEAD `session_01TsfGsiLVCx7NHy9rHkE8Pn`; Hadith Lead `session_01Q2HmCeWjo1vVYV5kgMBvC9`; **NEW: MSA-HEALTH Lead `session_01SPFtgC4vwVzby6PR12Z9ek`** (opened by the Owner 24 Oct, lead120; owns `app/health-study.html`, `app/health/**`, `tools/health-atlas-verify/**`, branch `msa-health/lead`, PMS MSA J93; hands PRs as "MSA-HEALTH ▸ ready for release"). Keep Health files out of every Builder round.
**`main` is v12.54** (PR #1118, merge `72614e4c`, live on MSA 7:11 pm 24 Oct; brief-integrity 13/0, ledger ok, ledger mutations 49/0), plus test/report-only merges #1120 and #1122. **Next release: v12.55.** **QuranRevival is still v12.43**: `add_repo QuranRevival/QuranRevival.github.io` (push) was refused again in this session; the Owner is asked on the PMS monitor line to tap Actions → build-from-msa (msa_ref main).

**Owner messages this session (carry1):** none. No new Owner comment in the PMS between 9:06 am and 8:05 pm.

**Released this session (all live on MSA; none yet on QR)**
- **v12.50** (#1106, Builder #1103, 9:54 am): audit part 60; `notes.html` history rows read Created / Edited / Removed / Restored.
- **v12.51** (#1109, Builder #1108, 10:50 am): Classes / Course Offers `#noAdminNote` for non-admins (Architect corrected the wording: every active class is shown, not "yours"). The Course Offers "Enrol" button is deliberate (`canEnrol` allows self / guardian).
- **v12.52** (#1113, Builder #1112, 2:19 pm): audit part 64; `accept-invite.html` and `onboarding.html` end with "Open the app" (way-back law).
- **v12.53** (#1115, Builder #1114, 4:09 pm): audit part 65; `nameByScript()` in `app/js/lang.js` — a subject / ladder / level / curriculum-unit name typed in Bangla is stored under `bn` (I11, new docs only, readers fall back); Add ladder / Save heading say why (I15).
- **v12.54** (#1118, Builder #1117, 7:11 pm): audit part 67 regression sweep; `shell.css` nav content basis up to 420px (was 340), Monitor table scroll box to 900px, Records to 700px.
- Test/report-only merges, no version: #1107 (part 61, teacher Homework), #1111 (part 63, language / look / contrast; the Architect fixed its hard-coded port), #1120 (part 68 sweep), #1122 (part 69 sweep).

**Regression sweep (J29):** every MSA-owned manual section was audited at least once by part 65, so the audit suites are being re-run on today's app. Parts 1–30 run locally by the Architect: 26/29 green; the 3 red are not MSA's: part 1 (Āyah card heading wraps at 390) and part 10 (WbW wheel labels at 320, QCR / Asma at 1440) sent to the QR Lead; part 21's Dua "← Back" check is intermittent (1 in 4; FYI to the Hadith Lead). Parts 31–38 (#1118): three faults fixed in v12.54. Parts 40, 41, 43, 54, 55: green. Parts 56–65 were green at their merges today. `journey-*` 1–14 green (#1122).

**IN FLIGHT / NEXT — the next session's first jobs**
1. **Builder round #1123** (audit part 70: the remaining 13 `journey-*` suites, dispatched 8:04 pm, push after each suite). Review when its run completes; merge if report-only, release if it fixed an app file. Next slices: `bookmark-*` (10), `notes-*`/`note-*` (8), `writing-*` (7), `zab-*` (6; the Zab bar is pinned by QR: report, do not change), `bangla-*` (5).
2. **QR rebuild**: try `add_repo` (push) once; if refused, keep the Owner's tap on the monitor line. When QR is rebuilt, the QR Lead's Āyah-card / wheel fixes and v12.50–v12.54 all reach it.
3. **J88 part 2**: branch `fix/self-hosted-auth-on` has `main` merged in (9:2x am, one line over main). Merge `main` in again; release ONLY after the Owner ticks PMS J88 `j88n1`; then ask for a real sign-in on Brave and an iPhone.
4. **J92**: wait for the Owner's A or B.

**Waiting on the Owner:** the QR rebuild tap (or allowing the repo), **J92**, **J88 j88n1**, **J89**, **J91**, n81c, n83a, n79a, n77a, n78a, n71c, n81a, n81b, n82a, n82b, n72d; the Hadith Lead's tick on the Hadith/Dua "My Notes" links.

**Lessons**
- **The Builder can no longer edit its PR body or comment** (its tools are refused). Its final message is posted on the issue by the workflow ("Builder run N stopped and said"): every issue now says "your final message must hold the totals and the table".
- **Watch the RUN, not a bot comment.** A round can open a PR and end without one. Poll `actions/workflows/claude.yml/runs?event=workflow_dispatch&per_page=1` until `completed`, then read the branch.
- **A Builder round must run suites in the FOREGROUND.** Run 1882 backgrounded a suite and ended its turn ("Nothing else to do until the suite ends"), which ends a headless run with nothing pushed; run 1881 tripped on `/tmp` redirection and a 271 KB log. The issue text now says so; reuse `/tmp/…/issue8c.json`-style wording (see issue #1119's body).
- **A 29-suite sweep does not fit 90 minutes.** #1116 was cancelled with nothing pushed. Give a round ≤ 14 suites and require a push after each.
- **A suite with a hard-coded `localhost:8080` fails on any other port** (cross-origin storage): #1111 showed 304 false failures on 8085. Every issue now says "use the harness `BASE`".
- **The draft flag cannot be set** ("AAAsapp does not have permission to convert … to draft"): review directly.

**The opening message for the next session** (send it as is):

> Bismillah. You are the MSA Master Architect, taking over from session_01MgT1xkk3XPgSpZkpTZQ6wW (hand119 handover). Read CLAUDE.md, ARCHITECT.md, then docs/reports/2026-10-12-MMSA-SESSION-HANDOVER.md, its LATEST UPDATE block of 24 Oct 8:05 pm first. Read the PMS (https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ): meta/global General rules (cost86, rec118, hand119, lead120, ka122, onehome71) and p/mmsa (carry1, stu123); answer any new Owner comments. Set p/mmsa.sessionUrl and p/qr.sessionUrl to your session link (pin with if_version). The PCA is session_01HqedLzJPW6qKznTRoYyron: reply 'PCA ▸ taken over' listing each running item with its state, and ask it to repoint the MSA keep-alive (trig_01QHSCRKb7W4QZPBwnhFUz5S).
> State: main is v12.54 (live on MSA 7:11 pm 24 Oct). Next release v12.55. QuranRevival is still v12.43: add_repo QuranRevival/QuranRevival.github.io (push) was refused in the last two sessions, so build-from-msa was never run; try add_repo once and, if it works, dispatch build-from-msa (msa_ref main) and confirm quranrevival.github.io/app/js/version.js; else keep the Owner's tap on the PMS monitor line. Tell the PCA which way it went.
> Leads: MSA-QR-LEAD session_01TsfGsiLVCx7NHy9rHkE8Pn (QR-only files: app/quranrevival.html, apps/qr/**; has the part 1 / part 10 sweep findings), MSA · Hadith Lead session_01Q2HmCeWjo1vVYV5kgMBvC9 (Hadith, Dua), MSA-HEALTH Lead session_01SPFtgC4vwVzby6PR12Z9ek (app/health-study.html, app/health/**, tools/health-atlas-verify/**). Leads never dispatch Builders and never release; they hand PRs over as "<LEAD> ▸ ready for release". You keep shared files, all Builder dispatches and all releases. Students test QR at quranrevival.github.io: student-blocking faults first (stu123).
> Running items: (1) Builder round #1123 (audit part 70, the remaining 13 journey-* suites, dispatched 8:04 pm): watch the RUN (claude.yml runs?event=workflow_dispatch) not a bot comment; review the branch, merge if report-only, release if an app file changed; then dispatch the next slice at once (bookmark-*, notes-*/note-*, writing-*, zab-* (report only: QR pins it), bangla-*), ≤ 14 suites, push after each, suites in the FOREGROUND, final message holds the table (copy issue #1123's body). (2) J88 part 2 on branch fix/self-hosted-auth-on: release ONLY after the Owner ticks PMS J88 need j88n1; then ask for a real sign-in on Brave and an iPhone. (3) J92: wait for the Owner's A or B. (4) The Builder cannot edit PR bodies or set drafts; review directly.
> Release steps: merge main into the PR branch FIRST, then allocate-version.py (commit and push at once); QR checks before the merge (public clone to /home/user/quranrevival.github.io, fetch --depth=300; node tools/apps/build-app.mjs qr; QR_REPO=/home/user/quranrevival.github.io bash tools/apps/qr-verify/run-all.sh in the background with no outer timeout, or the checks that cover the change, cost86 D); run the five non-ledger governance suites locally; merge; dispatch build-from-msa AFTER the merge if the repo is attached, and confirm both live version.js; PMS What's New line and Done lines with W-T-P-E-O. After the merge, fetch all branches (git fetch origin '+refs/heads/*:refs/remotes/origin/*') and run brief-integrity, programme-ledger, programme-ledger-mutations.
> Waiting on the Owner: the QR rebuild tap (or allowing the repo), J92, J88 j88n1, J89, J91, n81c, n83a, n79a, n77a, n78a, n71c, n81a, n81b, n82a, n82b, n72d; the Hadith Lead's tick on the Hadith/Dua "My Notes" links.
> Keep-alive every 12 hours (8:07 am/pm Sydney; ka122). No self wake-ups (cost86). Hand over at ~40% context (hand119), and include the full opening message for your successor.
> Sandbox: start node serve.js (8080), extra worktrees on 8083+ (never 8082; PORT=… node serve.js and QR_BASE=http://localhost:… for i18n-verify suites); mkdir -p node_modules && ln -sf /opt/node22/lib/node_modules/playwright node_modules/playwright; export CHROMIUM_PATH=/opt/pw-browsers/chromium; git fetch --unshallow origin main; at most two browser suites at once. gh works for REST (GraphQL refused: create issues with gh api repos/…/issues --input; dispatch with gh api -X POST …/actions/workflows/claude.yml/dispatches -f ref=main -f 'inputs[issue_number]=N'). The GitHub MCP tools work for this repo (merge via merge_pull_request with the full 40-char expectedHeadSha; copy it from git rev-parse, never retype it).

---

## LATEST UPDATE — 24 Oct 2026, 9:10 am Sydney, session `session_01JcT4DEWmQ2vkF4towUzMBe` (v12.44–v12.49 live on MSA; QR still v12.43; HANDOVER) — superseded by the 24 Oct 8:05 pm block above, kept as history

Took over 4:28 am 24 Oct from `session_01FTtCLzQdxrmt7MKzQeqSi8`. Handing over (hand119, ~40% context). PCA: `session_01HqedLzJPW6qKznTRoYyron` (it repointed the MSA keep-alive `trig_01QHSCRKb7W4QZPBwnhFUz5S`, 8:07 am/pm, to this session: ask it to repoint to the next). MSA-QR-LEAD: `session_01TsfGsiLVCx7NHy9rHkE8Pn`. Hadith Lead: `session_01Q2HmCeWjo1vVYV5kgMBvC9`.
**`main` is v12.49** (PR #1098, merge `ee62077c`, live on MSA 8:32 am 24 Oct; brief-integrity 13/0, ledger 8/0, ledger mutations 49/0), plus the test-only merges #1100 (audit part 58) and #1102 (audit part 59, part 1). **Next release: v12.50.** **QuranRevival is still v12.43**: see item 1.

**Owner messages this session (carry1):** none. The Owner wrote nothing in this session or in the PMS between 4:28 and 9:10 am.

**Released this session (all live on MSA; none yet on QR)**
- **v12.44** (#1088, Builder #1087, 5:49 am): `app/sw.js` holds stale-while-revalidate refreshes until the page has been quiet 2 s (max 15 s), 4 at a time; second visit to Notes / Journey ~0.3–0.7 s (was 3.9 s for Journey). The QR Lead measured QR's own worker: no such burst (cache-first shell), nothing to do.
- **v12.45** (#1089, the QR Lead's round 9, 6:35 am): `apps/qr/site/root-sw.js`, QR's address opens offline; declared shared change `app/apps/qr.json` `site` += `"root-sw.js"` (approved by me). QR run-all is **28** now.
- **v12.46** (#1091, Builder #1090, 6:49 am): audit part 54; Course Offers / Curriculum `.muted` `#888` → `#666`.
- **v12.47** (#1095, the QR Lead's round 10, 7:32 am): the Owner's tablet screenshot: 600–1023px bare Read bar, Notes / Record / Approach behind one "Study ▾" pill.
- **v12.48** (#1096, Builder #1094, 7:41 am): audit part 56; signed-out Sign in button 40px. PCF manual line `q7pkxdp` corrected (Bookmark sheet closes with ✕ / Esc).
- **v12.49** (#1098, Builder #1097, 8:32 am): audit part 57; `records.html` Person list `scopedRoster` for a real student/guardian (display only; owner/prime/teacher keep all); Homework note box 40px.
- Test-only merges, no version: #1093 (part 55, flows), #1100 (part 58, Notes 720 checks), #1102 (part 59 part 1, folder menu / Move / Copy / tags, 896 checks).

**IN FLIGHT / NEXT — the next session's first jobs**
1. **QuranRevival rebuild is BLOCKED in this session**: `add_repo QuranRevival/QuranRevival.github.io` (push) was refused by the permission classifier, and `build-from-msa.yml` is `workflow_dispatch` only. The Owner was asked (PMS monitor line) to tap Actions → build-from-msa → Run workflow (msa_ref main), or allow the repo. A new session: try `add_repo` first; if it works, dispatch build-from-msa with msa_ref main and confirm `https://quranrevival.github.io/app/js/version.js` reads the current version. QR checks ran locally from a public read clone (`git clone --depth=300 https://github.com/QuranRevival/QuranRevival.github.io.git /home/user/quranrevival.github.io`), which works without add_repo.
2. **Builder round #1103** (audit part 60, run `40030350359`, dispatched 8:56 am): the rest of Notes (pop-up windows, pictures / tables / link previews, templates, Import, My Notes, Dawah). Mark its PR draft on arrival; review ~10:25 am. Then keep a round running: candidates are a 320 / 820 pass of language / card look / Taglines (part 56's not-reached), Homework "Assign to" a class as a pure teacher (part 57's), or Journey folders-first.
3. **J88 part 2**: branch `fix/self-hosted-auth-on` has `main` merged in at 4:3x am (one line over main). Merge `main` in again, then release ONLY after the Owner ticks PMS J88 `j88n1`; then ask for a real sign-in on Brave and an iPhone.
4. **J92 (new, the Owner's choice)**: "Hand the device to a child" only blocks switching child on People (`study-lock.js`: "an accident guard, not a security boundary"); the manual promises "without reaching other people's records". Tick A = correct the manual line; B = a Builder round making the lock real on every page (D10 untouched). Do nothing until ticked.

**Waiting on the Owner:** the QR rebuild tap (or allowing the repo), **J92**, **J88 j88n1**, **J89**, **J91**, n81c, n83a, n79a, n77a, n78a, n71c, n81a, n81b, n82a, n82b, n72d; the Hadith Lead's tick on the Hadith/Dua "My Notes" links.

**Lessons**
- **A Builder branch cut before the last merge needs `main` merged in BEFORE `allocate-version.py`.** Otherwise the allocation sits on an old ledger and the merge conflicts in 6 files. Fixed here with `git revert` of the allocation, merge, allocate again (no history rewrite).
- **`pkill -f` inside the same command line kills itself** (exit 144). Kill by `^node tools/apps/serve-app`.
- **`timeout` on the WHOLE of QR's run-all is too short**: it ran 23 of 27 in 28 min. Give it no outer timeout (run-all has 1500 s per check) and run it in the background.
- **A suite run from another worktree but against `localhost:8080` tests `main`'s files**, not the branch's: start `PORT=808x node serve.js` in that worktree and set `QR_BASE`.

**The opening message for the next session** (send it as is):

> Bismillah. You are the MSA Master Architect, taking over from session_01JcT4DEWmQ2vkF4towUzMBe (hand119 handover). Read CLAUDE.md, ARCHITECT.md, then docs/reports/2026-10-12-MMSA-SESSION-HANDOVER.md, its LATEST UPDATE block of 24 Oct 9:10 am first. Read the PMS (https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ): meta/global General rules (cost86, rec118, hand119, lead120, ka122, onehome71) and p/mmsa (carry1, stu123); answer any new Owner comments. Set p/mmsa.sessionUrl and p/qr.sessionUrl to your session link (pin with if_version). The PCA is session_01HqedLzJPW6qKznTRoYyron: reply 'PCA ▸ taken over' listing each running item with its state, and ask it to repoint the MSA keep-alive (trig_01QHSCRKb7W4QZPBwnhFUz5S).
> State: main is v12.49 (live on MSA 8:32 am 24 Oct). Next release v12.50. QuranRevival is still v12.43: this session could not attach QuranRevival/QuranRevival.github.io (add_repo refused) so build-from-msa was never run; try add_repo (push) first and, if it works, dispatch build-from-msa (msa_ref main) and confirm quranrevival.github.io/app/js/version.js; else keep asking the Owner to tap it.
> Leads: MSA-QR-LEAD session_01TsfGsiLVCx7NHy9rHkE8Pn owns QR-only files (app/quranrevival.html, apps/qr/**) on its own branches, never dispatches Builders and never releases; it hands PRs over as "MSA-QR-LEAD ▸ ready for release". MSA · Hadith Lead session_01Q2HmCeWjo1vVYV5kgMBvC9 owns Hadith. You keep shared files, all Builder dispatches and all releases. Students test QR at quranrevival.github.io: student-blocking faults first (stu123).
> Running items: (1) Builder round #1103 (audit part 60, run 40030350359, dispatched 8:56 am): mark its PR draft on arrival, review by measurement, release or merge; then dispatch the next round at once (workflow_dispatch with issue_number via gh api; never put @claude in an issue body; scope it to 90 minutes; candidates in the handover). (2) J88 part 2 on branch fix/self-hosted-auth-on: release ONLY after the Owner ticks PMS J88 need j88n1; then ask for a real sign-in on Brave and an iPhone. (3) J92: wait for the Owner's A or B. (4) Mark any handed-over PR draft the moment it arrives; ready it just before you merge.
> Release steps: merge main into the PR branch FIRST, then allocate-version.py (commit and push at once); QR checks before the merge (public clone to /home/user/quranrevival.github.io, fetch --depth=300; node tools/apps/build-app.mjs qr; QR_REPO=/home/user/quranrevival.github.io bash tools/apps/qr-verify/run-all.sh in the background with no outer timeout, or the checks that cover the change, cost86 D); run the five non-ledger governance suites locally (verify stops at programme-ledger, which fails before the merge by design); merge; dispatch build-from-msa (msa_ref main) AFTER the merge returns if the repo is attached, and confirm both live version.js; PMS What's New line and Done lines with W-T-P-E-O. After the merge, fetch all branches (git fetch origin '+refs/heads/*:refs/remotes/origin/*') and run brief-integrity, programme-ledger, programme-ledger-mutations.
> Waiting on the Owner: the QR rebuild tap (or allowing the repo), J92, J88 j88n1, J89, J91, n81c, n83a, n79a, n77a, n78a, n71c, n81a, n81b, n82a, n82b, n72d; the Hadith Lead's tick on the Hadith/Dua "My Notes" links.
> Keep-alive every 12 hours (8:07 am/pm Sydney; ka122). No self wake-ups (cost86). Hand over at ~40% context (hand119), and include the full opening message for your successor.
> Sandbox: start node serve.js (8080), extra worktrees on 8083+ (never 8082; PORT=… node serve.js and QR_BASE=http://localhost:… for i18n-verify suites); mkdir -p node_modules && ln -sf /opt/node22/lib/node_modules/playwright node_modules/playwright; export CHROMIUM_PATH=/opt/pw-browsers/chromium; git fetch --unshallow origin main; at most two browser suites at once; load-speed suites take PORT (8115/8116). gh works for REST reads and writes (GraphQL is refused: create issues with gh api repos/…/issues --input; dispatch with gh api -X POST …/actions/workflows/claude.yml/dispatches -f ref=main -f 'inputs[issue_number]=N'). The GitHub MCP tools work for this repo (draft/ready via update_pull_request, merge via merge_pull_request with the full 40-char expectedHeadSha).

## LATEST UPDATE — 24 Oct 2026, 4:30 am Sydney, session `session_01FTtCLzQdxrmt7MKzQeqSi8` (v12.38–v12.43 live on MSA AND QR; HANDOVER) — superseded by the 24 Oct 9:10 am block above, kept as history

Took over 12:08 am 24 Oct from `session_01NmETReoBpm7xDe5vYziKey`. Handing over (hand119). PCA: `session_01HqedLzJPW6qKznTRoYyron` (asked at 12:08 am to repoint the MSA keep-alive `trig_01VZRHraDj3abTzSFoxjkEtm`, 8:07 am/pm, to this session: ask it to repoint to the next). **MSA-QR-LEAD is now `session_01TsfGsiLVCx7NHy9rHkE8Pn`** (took over from `session_01JMkBAfQH8PyQttMQBbsm1L` at ~1:09 am). Hadith Lead: `session_01Q2HmCeWjo1vVYV5kgMBvC9`.
**`main` is v12.43** (PR #1084, merge `a20fb19c`, live MSA and QR 4:25 am 24 Oct; brief-integrity 13/0, ledger 8/0, ledger mutations 49/0). **Next release: v12.44.** No open PR, no Builder round running.

**Released this session (all speed for students, all live on MSA and QR)**
- **v12.38** (#1071, 12:58 am): `sw-register.js`: Zab bar after load + idle; worker install after 1 s with no new request (a PerformanceObserver: the QR Lead's note that the 250-entry resource buffer could fill). `load-speed-browser` counts `/favicon.ico` as the browser's, not the page's.
- **v12.39** (#1079, 1:36 am): QR's build writes 133 `modulepreload` links, **before the first module script** (top of `<head>` made first paint 888 → 1548 ms). Check: none in `<head>`.
- **v12.40** (#1081, the QR Lead's, 2:16 am): QR's worker keeps surahs read before it took over; `quranrevival.html` has a `data:` icon. QR run-all is 26, now 27.
- **v12.41** (#1082, Builder #1080, 2:38 am): new `shared-load-speed-browser.mjs` (notes, notes?unit, journey); `notes.html` reads tags only with a unit, beside the notes read.
- **v12.42** (#1085, the QR Lead's, 4:15 am): QR's build strips comments line for line (`apps/qr/strip-site.mjs`, checked in-build by `verify-strip.mjs` + parse; `strip-comments-check` against TypeScript in run-all). First visit at 1.6 Mbps: first paint ~0.52 s, usable ~5.15 s (main before tonight: 0.89 / 8.1 s). **Approved by me: the shared note scripts are stripped in QR's build too** (J71's byte-for-byte pin dates from QR's own copy; behaviour equality is proven token by token).
- **v12.43** (#1084, Builder #1083, 4:25 am): journey-map / import-notes / about / backup / taglines fire userIndex and roles-only memberships together; Journey usable 3369 → ~3017 ms. Also bn.js: Monitor's Bangla note said "Learn next" (bangla-sweep-other-pages 220/4 on main → 224/0).
- **`architect.yml` gate 8** (#1078): the unattended Architect never merges a `builder/` PR while a `claude.yml` run (dispatch or issues) is queued or running.

**IN FLIGHT / NEXT — the next session's first jobs**
1. **J88 part 2** (sign-in on Brave/Safari/Firefox): unchanged. Branch `fix/self-hosted-auth-on` (merge `main` into it first). Release ONLY after the Owner ticks PMS `p/mmsa/jobs/J88` need `j88n1` (not ticked at 4:26 am). Then ask for a real sign-in on Brave and an iPhone.
2. **Keep a Builder round running.** Candidates: (a) **the worker-controlled second visit to Mapping My Journey is usable at ~3.7 s, later than the first (~3.0 s)**: `app/sw.js` background refreshes (~61 files, stale-while-revalidate) share the link. `app/sw.js` is protected, so the Architect's own round or a Builder round naming it explicitly; a cache-name change must update `app/apps/msa.json`. (b) Draw Journey's folders before tags/links (#1083 part 2, small gain). (c) The next audit by the PCF User Manual (Hadith, Dua, Seerah, shared tools; phone, tablet, computer).
3. **QR Lead** owns: J89 and J91 (Owner's ticks), any further QR load work; hands PRs over as "MSA-QR-LEAD ▸ ready for release".

**Waiting on the Owner:** **J88 j88n1**, **J89**, **J91**, n81c, n83a, n79a, n77a, n78a, n71c, n81a, n81b, n82a, n82b, n72d; the Hadith Lead's tick on the Hadith/Dua "My Notes" links.

**Lessons**
- **A PR with no `app/` change is mergeable by the unattended Architect.** Mark a handed-over PR (Lead or Builder) DRAFT the moment it arrives, then ready just before you merge it (#1079, #1085).
- **The governance job stops at its first failing suite** (`bash -e` with `out=$(…)`), so a release PR's verify shows only `programme-ledger` red by design: run the other suites locally before merging.
- **A live probe that finds nothing is a claim about the probe**: signed out, QR's landing fills no surah list; compare with MSA's live page before calling the build broken.
- **`allocate-version.py` leaves uncommitted files; the stop hook will ask.** Commit and push the allocation at once (the PR stays draft until the checks finish).

**The opening message for the next session** (send it as is):

> Bismillah. You are the MSA Master Architect, taking over from session_01FTtCLzQdxrmt7MKzQeqSi8 (hand119 handover). Read CLAUDE.md, ARCHITECT.md, then docs/reports/2026-10-12-MMSA-SESSION-HANDOVER.md, its LATEST UPDATE block of 24 Oct 4:30 am first. Read the PMS (https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ): meta/global General rules (cost86, rec118, hand119, lead120, ka122, onehome71) and p/mmsa (carry1, stu123); answer any new Owner comments. Set p/mmsa.sessionUrl and p/qr.sessionUrl to your session link (pin with if_version). The PCA is session_01HqedLzJPW6qKznTRoYyron: reply 'PCA ▸ taken over' listing each running item with its state, and ask it to repoint the MSA keep-alive.
> State: main is v12.43 (live on MSA and QR 4:25 am 24 Oct; QR 27 checks green). Next release v12.44. No open PR, no Builder round running.
> Leads: MSA-QR-LEAD session_01TsfGsiLVCx7NHy9rHkE8Pn owns QR-only files (app/quranrevival.html, apps/qr/**) on its own branches, never dispatches Builders and never releases; it hands PRs over as "MSA-QR-LEAD ▸ ready for release". MSA · Hadith Lead session_01Q2HmCeWjo1vVYV5kgMBvC9 owns Hadith. You keep shared files, all Builder dispatches and all releases. Students test QR at quranrevival.github.io: student-blocking faults first (stu123).
> Running items: (1) J88 part 2 on branch fix/self-hosted-auth-on: release ONLY after the Owner ticks PMS J88 need j88n1; then ask for a real sign-in on Brave and an iPhone. (2) Start a Builder round at once (workflow_dispatch with issue_number; never put @claude in an issue body; scope it to 90 minutes). Candidates in the handover: Journey's slower second visit (app/sw.js background refreshes), Journey folders-first, or the next User Manual audit. (3) Mark any handed-over PR draft the moment it arrives (a PR with no app/ change is mergeable by the unattended Architect); ready it just before you merge.
> Release steps: allocate-version.py (commit and push at once); QR checks before the merge (add_repo QuranRevival/QuranRevival.github.io push, clone to /home/user/quranrevival.github.io, fetch --depth=300; node tools/apps/build-app.mjs qr && QR_REPO=/home/user/quranrevival.github.io bash tools/apps/qr-verify/run-all.sh); run the five non-ledger governance suites locally (verify stops at programme-ledger, which fails before the merge by design); merge; dispatch QuranRevival/quranrevival.github.io's build-from-msa.yml (msa_ref main) AFTER the merge returns, and confirm both live version.js; PMS What's New line and Done lines with W-T-P-E-O. After the merge, fetch all branches (git fetch origin '+refs/heads/*:refs/remotes/origin/*') and run brief-integrity, programme-ledger, programme-ledger-mutations.
> Waiting on the Owner: J88 j88n1, J89, J91, n81c, n83a, n79a, n77a, n78a, n71c, n81a, n81b, n82a, n82b, n72d; the Hadith Lead's tick on the Hadith/Dua "My Notes" links.
> Keep-alive every 12 hours (8:07 am/pm Sydney; ka122). No self wake-ups (cost86). Hand over at ~40% context (hand119), and include the full opening message for your successor.
> Sandbox: start node serve.js (8080), extra worktrees on 8083+ (never 8082; PORT=… node serve.js and QR_BASE=http://localhost:… for i18n-verify suites); mkdir -p node_modules && ln -sf /opt/node22/lib/node_modules/playwright node_modules/playwright; export CHROMIUM_PATH=/opt/pw-browsers/chromium; git fetch --unshallow origin main; at most two browser suites at once; load-speed suites take PORT (8115/8116). gh works for REST reads (GraphQL is refused: create issues with gh api repos/…/issues --input).

## LATEST UPDATE — 24 Oct 2026, 12:10 am Sydney, session `session_01NmETReoBpm7xDe5vYziKey` (v12.36 + v12.37 live on MSA AND QR; HANDOVER) — superseded by the 24 Oct 4:30 am block above, kept as history

Took over 9:14 pm 23 Oct from `session_01DUyp4e6AmEZuRp7etfXDhB`. Handing over at ~40% context (hand119). PCA: `session_01HqedLzJPW6qKznTRoYyron` (asked at 9:14 pm to repoint the MSA keep-alive `trig_01VZRHraDj3abTzSFoxjkEtm`, 8:07 am/pm, to this session: ask it to repoint to the next). **MSA-QR-LEAD is now `session_01JMkBAfQH8PyQttMQBbsm1L`** (took over from `session_01Vyg5fxUBbFQShbQVtACFBn`). Hadith Lead: `session_01Q2HmCeWjo1vVYV5kgMBvC9`.
**`main` is v12.37** (PR #1075, merge `18fca8be`, live MSA and QR 12:03 am 24 Oct; brief-integrity 13/0, ledger 8/0, ledger mutations 49/0 after fetching all branches). **Next release: v12.38.**

**Released this session**
- **v12.36** (PR #1069, live 11:02 pm 23 Oct): audit part 47 (#1064, Builder #1060, finished by the Architect): shared parts follow QR's in-place language switch. **Review found and fixed:** the Mapping My Journey window was reloaded under a Note being typed; now `journey-tray.js` skips the reload while `[data-edit-body]` exists. The Bookmark popover takes `label`/`name` as functions. `lang-switch-browser` filled with 7 mutations + flows `typing`, `popfn`; joined `run-all.sh` (25 QR checks). Also the QR Lead's J87 (#1068) and `quran-data.js`'s `announceSurahUnavailable` removed (student-device `surahoffline` mutation retargeted to QR's Read-path call).
- **v12.37** (PR #1075, live 12:03 am 24 Oct): the QR Lead's J90 (#1070: open Āyah card redrawn, Notes pane label) and bmUnits (#1074), with the new shared hook `relabelReadNotePane(u)` in `read-note-pane.js`. `lang-switch-browser`'s known lists are EMPTY (334/0 before #1074, 333/0 after).

**IN FLIGHT — the next session's first jobs**
1. **J88 part 2** (sign-in on Brave/Safari/Firefox): unchanged. Branch `fix/self-hosted-auth-on` (one commit; merge `main` into it first). Release ONLY after the Owner ticks PMS `p/mmsa/jobs/J88` need `j88n1` (not ticked at 12:05 am). Then ask for a real sign-in on Brave and an iPhone.
2. **Builder round #1076, audit part 50** (dispatched 12:04 am 24 Oct): QR first visit — `modulepreload` for QR's static import closure written by `build-app.mjs` (qr only; msa must stay byte-identical), `gtaf_bangla_timestamps.json` once per session (`audio-player.js`), QR worker `warm` keeping surahs already read. Agreed with the QR Lead as its change request. Review by measurement when it lands; QR run-all before merge.
3. **PR #1071 (DRAFT, by me so the unattended Architect cannot merge it):** audit 48 part 2, `sw-register.js`: Zab bar mounted after `load` + idle (≤2 s); the worker install starts after 1 s with no new resource (≤10 s). Read and judged sound (note: the resource-timing buffer can fill at 250 entries, which only makes the install start sooner). **Needs QR run-all on a tree with it, then mark ready and release.** Builder's findings: issue #1066's comment.
4. **Findings sent to the QR Lead (their rounds):** audit 49's startup reads (#1073 body: `trackables` and `records` read at startup by `loadContextData` / `refreshChunkAndWheel` in `quranrevival.html`; make them lazy); audit 48's QR-side load items (lazy word-card/depth after modulepreload is remeasured). The QR Lead filed **J89** for the Owner (90px of āyah text at 360×740; demo + ticks A/B/C).
5. Keep a Builder round running. Next audit candidates: Hadith, Dua, Seerah and the shared tools by the PCF User Manual (phone, tablet, computer).

**Waiting on the Owner:** **J88 j88n1**, **J89** (QR Lead's), n81c, n83a, n79a, n77a, n78a, n71c, n81a, n81b, n82a, n82b, n72d; the Hadith Lead's tick on the Hadith/Dua "My Notes" links.

**Lessons**
- **The unattended Architect (`architect.yml`) merges a Builder's first push while the Builder is still running** (#1067 at 10:41, ten minutes into run 39939723901; #1073). Its gate sees a green, non-draft PR touching no protected path. Later pushes then have no PR (I opened #1071 for them). Proposal for an Architect workflow round (`.github/workflows/**` is the Architect's own): skip a PR whose head branch `builder/issue-N-*` has a `claude.yml` run in progress. Until then, check for this after every dispatch.
- **`translateStatic()` turns English text nodes into Bangla on en → bn**, so a shared repaint fix shows only bn → en. Run a language-switch mutation both ways before calling it unproven.
- **A Note opened from the Notes pane opens for writing in the Mapping My Journey window, not inside the pane.** Each frame runs its own Firebase stub: read a frame's writes from that frame's `window.__DATA`.
- **A catch-all known-finding pattern hides new findings.** `AYAH_CARD_LEAD = /^page /` matched everything; emptying it surfaced 3 (two were content, one a name).
- **`pkill -f` with a string that is in your own command line kills your own shell** (exit 144). Stop by PID.

**The opening message for the next session** (send it as is):

> Bismillah. You are the MSA Master Architect, taking over from session_01NmETReoBpm7xDe5vYziKey (hand119 handover). Read CLAUDE.md, ARCHITECT.md, then docs/reports/2026-10-12-MMSA-SESSION-HANDOVER.md, its LATEST UPDATE block of 24 Oct 12:10 am first. Read the PMS (https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ): meta/global General rules (cost86, rec118, hand119, lead120, ka122, onehome71) and p/mmsa (carry1, stu123); answer any new Owner comments. Set p/mmsa.sessionUrl and p/qr.sessionUrl to your session link (pin with if_version). The PCA is session_01HqedLzJPW6qKznTRoYyron: reply 'PCA ▸ taken over' listing each running item with its state, and ask it to repoint the MSA keep-alive.
> State: main is v12.37 (live on MSA and QR 12:03 am 24 Oct; QR 25 checks green). Next release v12.38.
> Leads: MSA-QR-LEAD session_01JMkBAfQH8PyQttMQBbsm1L owns QR-only files (app/quranrevival.html, apps/qr/**) on its own branches, never dispatches Builders and never releases; it hands PRs over as "MSA-QR-LEAD ▸ ready for release". MSA · Hadith Lead session_01Q2HmCeWjo1vVYV5kgMBvC9 owns Hadith. You keep shared files, all Builder dispatches and all releases. Students test QR at quranrevival.github.io: student-blocking faults first (stu123).
> Running items: (1) J88 part 2 on branch fix/self-hosted-auth-on: release ONLY after the Owner ticks PMS J88 need j88n1 (released earlier, Google refuses sign-in for everyone); then ask for a real sign-in on Brave and an iPhone. (2) Builder round #1076 (audit part 50: modulepreload for QR via build-app.mjs, timestamps once per session, worker keeps read surahs): review by measurement when its PR lands. WATCH: the unattended Architect merged the last two Builder rounds' first pushes while the Builder was still running (#1067, #1073); open a PR for any later commits and mark it draft until reviewed. (3) PR #1071 (draft): audit 48 part 2 in sw-register.js, judged sound; run QR run-all on a tree with it, then release. (4) Keep one Builder round running (workflow_dispatch with issue_number; never put @claude in an issue body; never ask the Builder to git merge; scope a round to fit 90 minutes).
> Release steps: allocate-version.py; QR checks before the merge (add_repo QuranRevival/QuranRevival.github.io push, clone to /home/user/quranrevival.github.io, fetch --depth=300; node tools/apps/build-app.mjs qr && QR_REPO=/home/user/quranrevival.github.io bash tools/apps/qr-verify/run-all.sh); merge; then dispatch QuranRevival/quranrevival.github.io's build-from-msa.yml (msa_ref main) AFTER the merge returns, and confirm both live version.js; PMS What's New line and Done lines with W-T-P-E-O. Before the merge the governance check's programme-ledger fails by design; after it, fetch all branches (git fetch origin '+refs/heads/*:refs/remotes/origin/*') and run brief-integrity, programme-ledger, programme-ledger-mutations.
> Waiting on the Owner: J88 j88n1, J89, n81c, n83a, n79a, n77a, n78a, n71c, n81a, n81b, n82a, n82b, n72d; the Hadith Lead's tick on the Hadith/Dua "My Notes" links.
> Keep-alive every 12 hours (8:07 am/pm Sydney; ka122). No self wake-ups (cost86). Hand over at ~40% context (hand119), and include the full opening message for your successor.
> Sandbox: start node serve.js (8080), extra worktrees on 8083+ (never 8082); mkdir -p node_modules && ln -sf /opt/node22/lib/node_modules/playwright node_modules/playwright; export CHROMIUM_PATH=/opt/pw-browsers/chromium; git fetch --unshallow origin main; at most two browser suites at once; give parallel runs separate ports/paths; stop servers by PID, never pkill -f a string in your own command. gh works for REST reads (GraphQL is refused).

## LATEST UPDATE — 23 Oct 2026, 9:15 pm Sydney, session `session_01DUyp4e6AmEZuRp7etfXDhB` (v12.32–v12.35 live on MSA AND QR; HANDOVER) — superseded by the 24 Oct 12:10 am block above, kept as history

Took over 4:43 pm 23 Oct from `session_0181VQTFG7uodBiesZVCFHe9`. Handing over at ~40% context (hand119). PCA: `session_01HqedLzJPW6qKznTRoYyron`. MSA-QR-LEAD: `session_01Vyg5fxUBbFQShbQVtACFBn`. Hadith Lead: `session_01Q2HmCeWjo1vVYV5kgMBvC9`. The PCA keep-alive `trig_01VZRHraDj3abTzSFoxjkEtm` (8:07 am/pm) fired into this session at 8:08 pm: **ask the PCA to repoint it.**
**`main` is v12.35** (PR #1063, merge `2a7e1db2`, live MSA and QR 9:07 pm; QR **24/24**). **Next release: v12.36.**

**Released this session**
- **v12.32** (PR #1056, live 5:04 pm): the Owner's **J84** by the MSA-QR-LEAD (PR #1053): Mushaf ‹ › one page, whole pages only, one Read bar; `wheelListCollapseBtn` 40px.
- **v12.33** (PR #1059, live 5:32 pm): audit part 45 (Builder #1051/PR #1054, which stopped early, so the Architect finished it): the Bookmark menu fills on Mapping My Journey, My Notes, Import notes and Dawah; three fixes; new QR check `student-tools-browser`.
- **v12.34** (PR #1062, live 7:38 pm): the Owner's **J86 + J85** by the QR Lead (PR #1061: in-place language switch re-labels the pickers, ☰, the sign-in line; the Word card's way back in its top row; one-line tablet bar; 40px Sign in), the Zab bar following the switch (`zab-bar.js` `relabel()`, Architect), audit part 46 (Builder #1057/PR #1058: offline note for an unsaved surah, 44px update notice; new QR check `student-device-browser`).
- **v12.35** (PR #1063, live 9:07 pm): **the Owner's J88, part 1** (below).

**The Owner's messages this session (carry1)**
1. **8:27 pm, a screenshot: a student's Google sign-in on Brave for Android ends with "Unable to process request due to missing initial state" on `study-monitoring.firebaseapp.com/__/auth/handler`. "Fix."** Cause: storage partitioning (Brave, Safari, Firefox) with the auth helper on another site. **The Owner chose (tick, in the chat): "Yes, and I'll add the 2 addresses".** PMS job **J88**.
   - **Part 1 DONE (v12.35):** Firebase's helper pages are served from both sites at `/__/auth/` (folders `handler/` and `iframe/`, absolute script paths; checked live, Pages keeps the query on the redirect). MSA's root `_config.yml` has `include: ["__"]`. `firebase-init.js` reads `SELF_HOSTED_AUTH_HOSTS`, which is **EMPTY**, so sign-in is unchanged. Check `tools/i18n-verify/self-hosted-auth.mjs` 25/0.
   - **Part 2 READY on branch `fix/self-hosted-auth-on`** (one commit: both hosts listed; the check 27/0). **Release it ONLY after the Owner ticks J88's need j88n1** (the two redirect URIs added in Google Cloud → Credentials → Web client). Released early, Google would refuse sign-in for EVERYONE. After releasing, ask the Owner or a student to sign in on Brave (and an iPhone), and confirm it.
   - Until then, students on Brave, Safari or Firefox sign in with Chrome.

**IN FLIGHT — the next session's first jobs**
1. **J88 part 2**: watch for the Owner's tick (PMS `p/mmsa/jobs/J88`, need `j88n1`), then merge `fix/self-hosted-auth-on` as v12.36 (allocate-version.py; QR run-all; build-from-msa).
2. **PR #1064, audit part 47** (Builder #1060, run 39926167805, which hit 90 minutes, so the Architect opened the PR): shared parts follow an in-place language switch (`bookmark-popover.js`, `journey-tray.js`, `minimise.js`, `read-note-pane.js`, new QR suite `lang-switch-browser.mjs`). **Not accepted yet:** its `MUTATIONS` is EMPTY. Add one per `// audit 47 lang*` marker (langpop, langtray, langmin, langpane), and prove that a Note being typed survives a switch with the pane or window open (both reload their frame right after `mmsa-journey-flush`; the same pattern as `closeJourneyTray`, plus `pagehide` flush, but not measured). Its two `FOR_QR_LEAD` findings (`unitLabel`, `ayahCard`) go to the QR Lead.
3. **The QR Lead's round 3 (J87)** comes as "MSA-QR-LEAD ▸ ready for release": the āyah-number tap area; the offline message moves to the Read path. **In that release, drop the generic `announceSurahUnavailable` from `app/js/quran-data.js`** (v12.34's, which also fires for background lookups). The QR Lead will also file a layout question for the Owner (the Read view gives the āyah text ~90px at 360×740).
4. Keep a Builder round running (dispatch with `workflow_dispatch` and `issue_number`; **never put `@claude` in an issue body**, because it starts a run by itself, as #1057 did). The next audit part after 47: the Owner's call, or audit by the PCF User Manual on phone, tablet and computer.

**Waiting on the Owner:** **J88 j88n1** (the Google Cloud step; it unblocks the sign-in fix), n81c, n83a, n79a, n77a, n78a, n71c, n81a, n81b, n82a, n82b, n72d; the Hadith Lead's tick on the Hadith/Dua "My Notes" links.

**Lessons**
- **An `onAppLangChange` listener fires BEFORE a first switch to Bangla has its catalogue.** Await `ensureCatalogueReady()` in the listener, or en → bn repaints in English (measured on the Zab bar: "🧰 Zab" stayed).
- **A Builder note that asks it to `git merge` stops the run**: its shell refuses every write outside its file tools (#1060's first run, 39917835671). Merge on `main` first, then dispatch.
- **A Builder run has 90 minutes** (`claude.yml` `timeout-minutes`). An audit round that measures 4 widths × 2 languages × 2 looks runs out. Scope a round to fit, and ask for the PR at the first push.
- **A check of finger size must skip a control scrolled out of view inside its panel** (the QR Lead's finding; `student-device-browser` `small()` now uses `__sd.clipped`).
- **GitHub Pages serves an extensionless file as a download, and Jekyll skips `_` folders.** A Firebase `/__/auth/handler` is a folder with `index.html` (Pages 301s to `handler/`, keeping the query), and `_config.yml` `include: ["__"]`. A root `.nojekyll` collides with QR's own in the build guards.

## LATEST UPDATE — 23 Oct 2026, 4:45 pm Sydney, session `session_0181VQTFG7uodBiesZVCFHe9` (v12.28–v12.31 live on MSA AND QR; HANDOVER) — superseded by the 9:15 pm block above, kept as history

Took over 12:43 pm 23 Oct from `session_01A9tGFy1MqSn1b53WSVJ6Nf`. Handing over at ~40% context (cost86/hand119). PCA: `session_01HqedLzJPW6qKznTRoYyron`. Hadith Lead: `session_01Q2HmCeWjo1vVYV5kgMBvC9`. **NEW: MSA-QR-LEAD `session_01Vyg5fxUBbFQShbQVtACFBn`** (opened by the Owner 23 Oct, lead120 choice B): owns QR-only files (`app/quranrevival.html`, `apps/qr/**`) on its own branch; the MSA Architect keeps shared files, ALL Builder dispatches and ALL releases; it hands PRs over as "MSA-QR-LEAD ▸ ready for release". MSA keep-alive `trig_01HzsS6KrHMioTsmMtmdE8qW` (8:07 am/pm): **ask the PCA to repoint it to the new session.**
**`main` is v12.31** (PR #1052, merge `8aabf397`, live MSA and QR 4:41 pm; QR **22/22**). **Next release: v12.32.**

**New rule (PMS p/mmsa rules `stu123`, the Owner via the PCA):** students now test on QuranRevival only. **Any QR fault a student would hit is student-blocking and comes before audit work.**

**Released this session**
- **v12.28** (PR #1043, live 1:56 pm): audit part 41 (#1041): no Zab inside `embed=1` frames. Review fix: `sw-register.js` `warmLaterFiles()` keeps files imported after load (service-worker.mjs was red on main 3/3, `note-foundation.js`).
- **v12.29** (PR #1046, live 2:44 pm): **the Owner's J83 "QR doesn't have any language option"**: Language was 939px down a Home menu showing 367px (six Legacy App links); `shell.css` puts Settings first in Home on every page; new QR check `language-browser`. Audit part 42 (#1044): three stale checks updated, the Note pane stays pinned while editing (`journey-map.html`). A± sliders below their tile in the Read ⋯ card (PCA: MSA builds it).
- **v12.30** (PR #1050, live 4:09 pm): audit part 43 (#1047, opened by the Architect: the run opened no PR): tool and admin pages; Accept invite role in Bangla, Dawah heading contrast, Monitor month field.
- **v12.31** (PR #1052, live 4:41 pm): audit part 44 (#1049): QR as a student; a signed-out reader gets Language/Card look (`nav.js` `offerSettingsWhileSignedOut`); new QR check `student-browser` (its finger-size detector hit-tests the tap area, the QR Lead's method), in `run-all.sh`: **QR has 22 checks**.

**IN FLIGHT — the next session's first jobs**
1. **MSA-QR-LEAD PR #1053 READY FOR RELEASE** (the Owner's J84: Mushaf ‹ › move exactly one page, no cut third page, Study → Read gets the same bar; plus `#wheelListCollapseBtn` 40px tap area). Review by measurement on current main, run QR's 22 checks, and **on merge remove `wheelListCollapseBtn` from `FOR_QR_LEAD` in `tools/apps/qr-verify/student-browser.mjs`** (the suite reports it as no longer occurring). Release as v12.32. The Lead reports `read-quick-buttons` 198/6 red on main too (600/768 bar wraps since v12.26's ‹ ›): confirm on a clean main; audit material.
2. **Builder round #1051 RUNNING** (run 39904302677, dispatched 4:10 pm): audit part 45, the shared tools as a student on QR (Notes, Mapping My Journey, Bookmarks, sign-in, the way back). It was dispatched from main BEFORE v12.31, so re-run its suite on current main first.
3. PMS for J84 is the QR Lead's job record; write the release's What's New + Done lines as usual.

**Waiting on the Owner (PMS ticks):** **n81c** (new: My Notes' ⧉ Open in window: A, the Mapping My Journey window (recommended) or B, keep My Notes' own windows (decision 42 vs J81)); **n83a** (check the language option); n79a, n77a, n78a, n71c, n81a, n81b, n82a, n82b, n72d and older; the Hadith Lead's tick on the Hadith/Dua "My Notes" links.
No Owner messages arrived in this session directly; the Owner's J83 and the student rule came through the PCA and are done/recorded (carry1).

**Lessons**
- **A menu can hold a control and still hide it.** Language was present in the DOM and passed every "exists" check; it was 939px down a 367px scroll box. Measure whether a control is inside its scroll container's VISIBLE box (`language-browser` does).
- **Measure a finger target by hit-testing, not by the drawn box.** `#wheelCtaBtn` is drawn 28px with a 40px `::before`; the first student suite called it too small. Hit-test 19px above and below the centre.
- **A Builder run can push and open no PR** (#1045): open it yourself from the branch; the issue text now says "open the PR as soon as your first commit is pushed".
- A mutated run can die on `route.fetch: socket hang up` after its failures are counted; the failures already prove the check, but re-run before quoting a number.

## LATEST UPDATE — 23 Oct 2026, 12:45 pm Sydney, session `session_01A9tGFy1MqSn1b53WSVJ6Nf` (v12.26 + v12.27 live on MSA AND QR; HANDOVER) — superseded by the 4:45 pm block above, kept as history

Took over 10:25 am 23 Oct from `session_01MYQKgXtFU3L7VDfnhNRxbp`. Handing over at ~40% context (cost86/hand119). PCA: `session_01HqedLzJPW6qKznTRoYyron`. Hadith Lead: `session_01Q2HmCeWjo1vVYV5kgMBvC9`. MSA keep-alive is `trig_01HzsS6KrHMioTsmMtmdE8qW` (8:07 am/pm), repointed by the PCA to this session; **the new session must ask the PCA to repoint it again.**
**`main` is v12.27** (PR #1038, merge `0373dcbe`, live MSA and QR 12:39 pm; QR 20/20). **Next release: v12.28.**

**Released this session**
- **v12.26** (PR #1036, live 12:06 pm): **J81 part 3** (PR #1031): every Note opens in the Mapping My Journey tray. This covers the Read view's Notes pane (tap, search, ✚), `journey-map.html?note=` links and Zab's Open. Review fix: on `journey-map.html` itself Zab's Open stays the full page with back=1 (`zab-to-note` mutations v/w). **J82 parts 1, 2, 4, 5** (PR #1035): Learn next opens the next word's card; Bookmark from the Āyah/unit card returns to it; ‹ › page buttons in the Read bar and full screen. Review fix: at 320 the bare full screen's page reference had 0px of text, so the end tiles are now 36px and the reference is cut from its start ("…77"; mutation tiny-ref). The learn-next way-back check now waits for a state.
- **v12.27** (PR #1038, live 12:39 pm), **J82 part 3**, the Architect's own round. **Builder PR #1037 was closed unmerged:** it was built before v12.26 and changed the Notes pane, which no longer shows a Note; its suite failed 8/8 on v12.26. Instead: a tray opened on a Note is the note window at full width (`noteFocus`; at 1440 the Note had been a 367px third column), and `fitToolbar()` never leaves ⌫ alone on a line. New suite `note-toolbar-fit-browser` 32/0 (mutations focus 8, inline 2).

**IN FLIGHT — the next session's first jobs**
1. **Builder round #1039 RUNNING** (run 39885372689, dispatched 12:41 pm): audit part 41, Notes and the shared tools after v12.25–v12.27. Scope: My Notes page, Bookmarks to a Note, Records, Continue strip, the tray on a Note at 1440/1280, minimise everywhere, and **Zab drawn inside embedded frames** (the Architect saw up to 3 Zab strips at 1280: page, Notes window frame, tray frame; measure first). Review its PR by measurement when it lands; compare every red suite with a clean main.
2. Then release v12.28 the usual way (allocate-version.py; QR 20 checks BEFORE merge; build-from-msa; both version.js; PMS What's New + Done lines with W-T-P-E-O).

**Waiting on the Owner (PMS ticks):**
- New this session: **n81b** (J81 part 3), **n82a** (J82 1, 2, 4, 5), **n82b** (J82 part 3).
- Still open: **n79a** (J79 Bangla corrections: after the tick apply only those words and add a check failing on any `\d{4};` or stray non-Bangla letter), **n77a**, **n78a**, **n71c**, **n81a**, n72d and older.
- The **Hadith Lead's tick** on the Hadith/Dua "My Notes" links (A keep the full page / B open the tray on that hadith's notes): the Lead will tell the Architect; leave those links until then.
No Owner messages arrived this session (carry1: nothing to carry).

**Recorded red on `main`, not this session's** (each compared on a clean main):
- `audit-part28-small-phone` 4: Bookmark dialog "Assign to rows" positive control at 320/360.
- `read-bar-tools-browser` en 360: no Bookmark tile in ⋯, then a crash.
- Plus the earlier list: `audit-part19-notes` readpane 1440, `journey-note-edit` 1280, `bookmark-marks-back` 12 (= J77), and `audit-part16` flaking under load.
- `j82-learn-next-bookmark-pages` "← Back returns … exactly as it was" failed once under heavy load (two suites and a mutation run at once); 0 in 4 runs since. It now waits for the state and prints where the texts differ.

**Lessons**
- **A round built on an older `main` can be overtaken by a release in between**: #1037 was correct for its base, but v12.26 moved the Note out of the pane it reorganised. Re-run a round's own suite on the CURRENT main before reviewing anything else; 8/8 red was the whole answer.
- **Measure where the thing really is after the last release.** The Owner's "10 rows" became 3–5 in the tray once J81 shipped, and the real defect was elsewhere (the 1440 three-column squeeze), found only by measuring the new home.
- **Parallel runs share screenshot paths**: a mutated run beside a clean one overwrote the clean screenshot twice. Look at a screenshot only from a run that ran alone, or give runs separate paths.
- **A narrow element can pass a width check and still say nothing**: "Ay…" fits; the number ("…77") is what tells the reader where they are.

## LATEST UPDATE — 23 Oct 2026, 10:30 am Sydney, session `session_01MYQKgXtFU3L7VDfnhNRxbp` (v12.24 + v12.25 live on MSA AND QR; HANDOVER) — superseded by the 12:45 pm block above, kept as history

Took over 3:50 am 23 Oct from `session_01GkAPfmGq41a58zqYMQFQmB`. Handing over at ~40% context (cost86/hand119). **The PCA moved to `session_01HqedLzJPW6qKznTRoYyron`** (8:30 am; confirmed in `meta/global.sessionUrl`) — send PCA messages there. Hadith Lead: `session_01Q2HmCeWjo1vVYV5kgMBvC9`.
**`main` is v12.25** (PR #1030, merge `139d5514`, live MSA and QR 8:25 am; QR 20/20). **Next release: v12.26.**

**Released this session**
- PR #1025 (checks only): landing-drawers 284/0, landing-drawer-row-resized-wheel 15/0 (stale since J25 / J44).
- **v12.24** (PR #1027): the Word card reads its word's own surah (audit-part15's intermittent error, reproduced 3/3); `quran-lemma-progress-rendered` updated for five levels.
- **v12.25** (PR #1030): **J78** every Āyah card tab as the same window; **J71 B** Note formatting buttons as five group tabs at every width; **J81 parts 1–2** `app/js/minimise.js` (– beside ✕ on every pop-up, chips, bottom row steps windows aside); **#1028** audit part 40 (four readability fixes); **J80** (Hadith Lead) notice off the Dua/Explanations tabs.

**IN FLIGHT — the next session's first jobs**
1. **PR #1031 (Builder round #1029, J81 part 3: every note opens in the Mapping My Journey window) — LANDED, NOT YET REVIEWED.** Review by measurement: its new suite `note-opens-in-journey-browser` 60/0 and mutations; it changes `journey-tray.js`, `zab-bar.js` (shared note scripts: QR change notice), `journey-map.html`. Open items it lists: Hadith/Dua "My Notes" go to `notes.html?unit=` (no note id; Hadith Lead's call — tell them), My Notes page / Bookmarks / Records / Continue strip not audited by hand; `audit-part28` 4 and `audit-part4-fixes` 1 failures it did not compare with main — compare on a clean main worktree before calling them ours. behaviour.mjs total is in its PR comment.
2. **Builder round #1032 RUNNING** (dispatched 10:25 am): J82 parts 1, 2, 4, 5 — Learn next opens the next word's Word card; Bookmark from the Āyah card returns to it; ‹ › page buttons on the full-screen Mushaf and in the Read bar. Review its PR when it lands.
3. **Issue #1033 WRITTEN, NOT DISPATCHED** (one Builder round at a time; a second dispatch while one runs replaces the queued one): J82 part 3, the Notes window's 10 rows → standard 5. Dispatch it when #1032's run has finished.
4. Then release v12.26 (allocate-version.py; QR 20 checks BEFORE merge; build-from-msa; confirm both version.js; PMS What's New + Done lines with a check tick).

**Waiting on the Owner (PMS ticks):** **n79a** (J79: 37 broken places in the Bangla translation — both public copies, alquran.cloud and Tanzil, carry the same breaks; proposed corrections listed; after the tick: apply only those words, add a check that fails on any `\d{4};` or stray non-Bangla letter, release), **n77a** (J77: the Read bar's way back on a phone — bisected to v11.35's 📜 + J63's phone rule), **n78a, n71c, n81a** (checks of v12.25), n72d and the older list in the 3:50 am block.

**Owner messages this session (carry1)**, all filed in the PMS:
- ~6:40 am: Āyah card tabs → **J78**, released v12.25.
- ~7:00 am: "the note view buttons … horizontal endless" → **J71** (two layouts shown; Owner ticked **B**), released v12.25.
- ~7:05 am: bottom buttons / minimise / every note in the MMJ window → **J81** (Owner ticked: the Read view's pane too); parts 1–2 released v12.25, part 3 = PR #1031 (review pending).
- ~10:15 am: Learn next / Bookmark way back / Note's 10 rows / Mushaf page buttons ×2 → **J82**: issues #1032 (running) and #1033 (queued).

**Recorded red on `main`, not this session's** (each compared on a clean main): `audit-part19-notes` readpane 1440 (2); `journey-note-edit` 1280 "typing at the end of a long Note" (1; its summary line does NOT count it — a suite fault to fix); `bookmark-marks-back` 12 (= J77); `audit-part16` "studied ← Back lands on 4563" flakes under load (green alone 3/3).

**Lessons**
- **Name a data-attribute after what it does, once**: the – button carried `data-mm-min` — the same attribute that HIDES a minimised window — so it hid itself; caught only because the suite measured visibility.
- **A mutation that copies the fix is no mutation**: capturing `currentSurahData` before the await IS the fix, so "replace with currentSurahData" passed; the old behaviour was reading it AFTER the awaits.
- **A redundant path hides an unproven one**: the bottom-row handler restored the tray itself, so the tray's own `restoreWindow` could be deleted with the suite green; testing a link OUTSIDE the bottom row proved it.
- **Both public copies of a translation can share one corruption**: re-pulling is not a fix; check the source before promising a repair.
- **One Builder dispatch at a time**: GitHub keeps one pending run per concurrency group; a second dispatch replaces the first.

## LATEST UPDATE — 23 Oct 2026, 3:50 am Sydney, session `session_01GkAPfmGq41a58zqYMQFQmB` (v12.23 live on MSA AND QR; behaviour.mjs green; HANDOVER) — superseded by the 10:30 am block above, kept as history

Took over 12:30 am 23 Oct from `session_011rXL5Ag47YfqVMmMBdLMQj`. Handing over at ~40% context (cost86/hand119). **Nothing is in flight**: no Builder round, no open PR, no test run.
**`main` is v12.23** (PR #1022, merge `67d57cfa`, live on MSA and QR 2:24 am 23 Oct; QR build-from-msa dispatched, both `version.js` read 12.23; QR's 20 checks 20/20 on the build), then **PR #1023** (merge `adab5b05`, checks only, no version). **Next release: v12.24.** The PCA is `session_019xuGwr6uFeQUpKmERwBPxX`; the MSA · Hadith Lead is `session_01Q2HmCeWjo1vVYV5kgMBvC9` (no branch; told of #1022's commit).

**Done this session**
- **v12.23 = MSA J72, the sweep's second part** (CHANGELOG v12.23): the Track window (`app/js/way-modal.js`, shared by Hadith, Dua, Asma, Deen, every study page and the Qur'an page) opens at the home size on a computer with a 40px ← Back, fills the frame inside a J74 page window (`placeDialogAtHome()`, `inPageWindow()` in `home-window.js`); both Asma full-size posters at the home size, solid `#26324a`, poster sized to the box. Seerah has no screens yet; Asma's edit forms stay small. **J72's sweep is finished** (n72d asks the Owner to check). New suite `popup-home-sweep-browser` 44/0, 5 mutations.
- **PR #1023 (checks only): `behaviour.mjs` runs to the end — 971/0.** It had been CRASHING at 907 (section 45 clicked `#readBookmarkBtn`, which at ≥900px steps aside for the bar's `#readBarBookmarkBtn` since v12.16 J63), so sections 45–56 never ran; `harness.clickReadTool` now presses the twin on screen. Also green now: bookmark-assign-unit, bookmark-family-unit, bookmark-multi-save, read-window (its contrast probe read a 14% gold wash as solid: 2.85 vs 5.74 rendered), global-approach-card, audit-part14 650/0, audit-part18 1020/0. audit-part1's 4 were this sandbox's stale local `main` ref (210/0 once current).

**Next (each needs nothing from the Owner unless said)**
1. Owner: **n72d** (v12.23), n48e, n48f (v12.22), n74a, n75a, n71b, n72c, n73a, n76a, and the older n69b, n70b, n67a, n61c, n66a, n68b, n61b, n63a, n65a, n68a, n58c, n60a, n61a, n62a, n64a. MSA J64 waits on the Owner's taps.
2. **Still red on `main`**: `bookmark-marks-back` 12 (red at v12.19 too: on a phone the back label in the Read bar takes a line of its own, `sharesLine:false`, 5 lines — may be a real layout regression; screenshot it before deciding), `landing-drawer-row-resized-wheel` 1 (red at v12.19 too: on a PC a wheel dragged to 420px comes up at 346 — the landing window caps it?), `landing-drawers` 246/28 (not yet looked at), audit-part15's intermittent "lemma-wide word progress" page error.
3. Then the PCF rule "when no job is left, audit feature by feature (the User Manual is the checklist)".

**Owner messages this session (carry1):** none arrived (none in the PCF since 22 Oct 11:56 pm UTC; none in this session).

**Lessons**
- **A suite that crashes reads as "N failed" in a summary line and hides everything after it**: `behaviour.mjs`'s "907/7, same as main" was carried as a baseline while sections 45–56 had stopped running. Read the LAST lines of the log, not the count.
- **A hidden twin is not a broken button**: when a control steps aside for an equivalent one on screen, teach the harness which one a reader presses (`READ_TOOL_TWINS`), not each suite.
- **A contrast probe must blend see-through backgrounds** over what is under them; reading `rgba(…, 0.14)` as solid gave a false 2.85:1.
- **This sandbox's local `main` ref can be days stale** (here #998): any check doing `git show main:…` then compares against an old page. `git branch -f main origin/main` first.
- **An unproven mutation can be a coincidence of sizes**: `noframe` passed because a 1000px home rect, clamped into a 998px frame, happens to fill it; the frame branch only matters below 900px, so the suite's home rect is 860 wide.

## LATEST UPDATE — 23 Oct 2026, 12:40 am Sydney, session `session_011rXL5Ag47YfqVMmMBdLMQj` (v12.22 merged; HANDOVER) — superseded by the 23 Oct 3:50 am block above, kept as history

The Owner said "You can now resume your job where you were paused" (~11:30 pm 22 Oct), so this session (summarised once) built **MSA J48 round 3** instead of handing over, and hands over now (cost86/hand119).
**`main` is v12.22 (PR #1020, merge `8bd29981`, 12:27 am 23 Oct); QR build-from-msa run #20 succeeded at 12:28 am; QR's 20 checks 20/20 on the build. Next release: v12.23.** The PCA is `session_019xuGwr6uFeQUpKmERwBPxX`.

**v12.22 = MSA J48 round 3** (CHANGELOG v12.22 has the detail): Approaches | Vocabulary switch (`#wheelKindRow`, moved by script: `#wheelKindTitleSlot` in the Wheel window's title bar ≥900px, the top of the Wheel ▴ drawer below — a row above the wheel cost it up to 57px / 22%, wheel-centre caught it); `renderVocabWheel()` (9 steps, green fill by new words or all up to it, `mmsa.vocabWheelFill.v1`; ✓ when all words known; segment → Learn next on that step, ← Back); gold Word-by-word fill on the Āyah Wheel (`ayahWheelWordFraction()`, memory only); `vocabBadgeHtml()` on Learn next and KYS; Monitor's Vocabulary table (`app/js/vocab-known.js`). Pure figures in `learn-next.js` (`vocabStepFigures`, `vocabStepFill`, `vocabBadgeFigures`). New suite `vocab-wheel-browser` 114/0, 13 mutations.

**Next**
1. Owner: **n48e** (check round 3) and **n48f** (switch on a phone: A drawer as built / B a row above the wheel, the demo). Plus the list in the 11:20 pm block below.
2. **J72 sweep, rest** (Hadith, Dua, Seerah, Asma pop-ups to the home size with ← Back).
3. Pre-existing reds on `main` (below), plus `landing-drawers` 246/28 and `landing-drawer-row-resized-wheel` 12/1 (both the same on v12.21).

**Lessons**
- **An unproven mutation can mean dead code, not a weak check**: `nofit` stopped failing once the switch left the wheel's column; the re-fit it guarded had become unreachable, so it was removed rather than kept "just in case".
- **A seed must be able to tell two rules apart**: "all words of the step" vs "only its new words" agree when words 1–25 are known; leaving word 11 out separates them (the `passed` mutation).
- **Running 24 browser suites at once in this sandbox makes some crash on timeouts**: re-run them one at a time before believing a crash.

## LATEST UPDATE — 22 Oct 2026, 11:20 pm Sydney, session `session_011rXL5Ag47YfqVMmMBdLMQj` (v12.21 live on MSA AND QR; HANDOVER) — superseded by the 23 Oct 12:40 am block above, kept as history

Took over 8:48 am 22 Oct from `session_01NRUt1vXovcsHryRwq8E6J6`. Handing over at ~40% context (cost86/hand119).
**`main` is v12.21, live on MSA and QR since 11:18 pm 22 Oct (PR #1018, merge `bddfe2ac`; QR build-from-msa dispatched; QR's 20 checks 20/20 on the build). Next release: v12.22.** The PCA is `session_019xuGwr6uFeQUpKmERwBPxX`.

**Released this session**
- **v12.20** (PR #1017, merge `ff720dd0`, live 10:58 am; QR 20/20): MSA J71 (the Notes window from the Āyah card takes the card's place, `ayahCardRectJustNow()`; top-bar search over every Map note, "📎 Attach" = `attachStudyNoteToUnit()` → `createNoteSource` reference; on a computer the tabs and the note's tools on one row, `.jm-host-tab`, `mmsa-pane-tabs`/`-hello`), J72 (resize handles in a frame over the window's edge, `[data-popup-win-frame]`; ONE shared home rect `app/js/home-window.js`, `SHARED`, the landing window `home: "self"`; menu links `navBack=1` + `mountNavBack()`; ← Back on the Read list, KYS, Āyah card), J73 (Vocabulary's buttons never await the review-schedule read; `VOCAB_REVIEW_WAIT_MS` 8 s; stub `window.__stubHangCols`). PCA change notice sent (shared note scripts).
- **v12.21** (PR #1018, live 11:18 pm; QR 20/20): MSA J74 (n72b B: menu pages as windows at the home size over the landing screen, `app/js/page-window.js`, `?inWindow=1`; Mapping My Journey keeps its tray), J75 (Meaning flow on a phone in one row, `#readBar::before` break; ☰ "Surah" and "Eng" below 480px, `paintShortReadLabels()`; ↑ Previous page / ↓ Next page; no dashed line above the first label; no nav rule below 600px). Also cleared 40 stale failures on `main` (read-list-button, read-contents: 36px → 40px; audit-part12: J70's Full text). J76 answered (mouse writing already works; n76a asked).
- New suites: `popup-home-size-browser`, `vocab-buttons-open-browser`, `page-window-browser`, `read-meaning-one-row-browser` (each mutation-proven). Many updated in place (listed in CHANGELOG v12.20/v12.21). QR: edits #8a/#8b re-anchored; QR checks `links-browser`, `approach-window-browser` updated in place.

**Running / next (each in its PCF job)**
1. Nothing in flight. Owner checks: **n71b, n72c, n73a** (v12.20), **n74a, n75a** (v12.21), **n76a** (writing: A keep / B write over the example), and the older n69b, n70b, n67a, n61c, n66a, n68b, n61b, n63a, n65a, n68a, n58c, n60a, n61a, n62a, n64a.
2. **MSA J48 round 3 is DUE** (agreed for after the usage reset, Thu 22 Oct ~7 pm, plan j48p10): this session's worker restarted around then and it was not started. It is the next session's first job (step 2 check needs n48e).
3. **J72 sweep, rest**: Hadith, Dua, Seerah and Asma pop-ups to the home size with ← Back (the Writing sheet stays full screen, decision 83).
4. **Pre-existing reds on `main`** (offered to the Owner): bookmark-marks-back 12, audit-part14 8, audit-part1 4, read-window 4 (contrast of "Before Al-Fātiḥah" 2.85:1), global-approach-card 2; audit-part15 intermittent page error (lemma-wide word progress, "A valid, bounded Surah ayah range is required").

**Owner messages this session (carry1), each filed in the PCF job named**
1. ~9:10 am: the Mastery Wheel window ("resizeable from all side and all corners … this size globally for all pop-ups … global check … same size … back button") → J72 (released v12.20).
2. ~9:35 am: Vocabulary ("opens to this wide screen, make it open popup as the same standard size"; "Learn, Practice or Step test buttons do not do anything") → J73 (released v12.20).
3. ~11:05 am: "n71a: A. n72a: A, n72b. B" → J71/J72 recorded; n72b B built as J74 (v12.21). Same message: "Is it possible to enable writing through mouse in PC and Laptop?" → J76 (answered; n76a).
4. ~11:10 am: two phone screenshots of the Meaning flow ("Make one row of buttons … Page number twice … Tiny line takes space") → J75 (v12.21).
5. Evening: "How to orgsnise buttons in one row? Write only 'Surah', discard ' list', For English, write only Eng. Mushaf only icon." → J75 part 2 (v12.21).

**Lessons**
- **Never switch a checkout's branch while its suites run against it**: the served files change mid-run and the results are invalid. One worktree per job, each on its own port (this session: 8083 for the work, 8084 a clean `main` for baselines).
- **Compare a red suite with `main` at the SAME version before calling it yours**: here 7 suites were already red on v12.20; audit-part12 had been red since J70 (v12.19) unnoticed.
- **A "shared" state needs a gesture guard**: the landing window re-took the shared rect in the middle of its own drag (a ResizeObserver refit) and snapped back; a `gesture` flag fixed it.
- **A delegated click handler near the target runs before a document-level one**: the page-window handler on the nav would have taken Mapping My Journey from its tray (journey-tray.js listens on document); exclude it, and check it.
- **A test that seeds a remembered rect must seed the shared one too** once windows share one; and a selector `a[href$=".html"]` breaks the day a link gains a query (`navBack=1`): use `^=` or the pathname.
- **`pkill -f` with a pattern in your own command line kills your own shell (again, exit 144)**: kill by PID from `pgrep` + `/proc/<pid>/cwd`.

## LATEST UPDATE — 22 Oct 2026, 8:45 am Sydney, session `session_01NRUt1vXovcsHryRwq8E6J6` (v12.19 live on MSA AND QR; J71 demo next; HANDOVER) — superseded by the 22 Oct 11:20 pm block above, kept as history

Took over 6:31 pm 21 Oct from `session_017XmUaxwDGhjaQExeKYwYJj`. Handing over at ~40% context (cost86/hand119).
**`main` is v12.19, live on MSA and QR since 8:39 am 22 Oct (build-from-msa dispatched after merge `40ef7bb1`). QR's 20 checks on v12.19: the result is in the PCA message "PCA ▸ handover ready" (v12.17 and v12.18 were 20/20). Next release: v12.20.** The PCA is `session_019xuGwr6uFeQUpKmERwBPxX`.

**Released this session**
- **v12.17** (PR #1013): MSA J67 (Builder #1007, PR #1011 merged inside it; the Āyah card as a window), J66 part 2 (Bangla আ in 13 Hadith places; three Hadith pullers mend it; HadeethEnc re-hashed over the record as stored), J61 part 2b (the rest of the Word card's small Arabic at 90%, `--wc-small-ar`). Also `word-card-sense-arabic` fixed (hidden "+ N more" chips measured 0px; red on `main` before).
- **v12.18** (PR #1014): MSA J68 part 4 (Builder #1008, PR #1012; the Read view's Notes pane as a window). Architect fix: `WINDOW_FROM = SIDE_FROM` (1100px), so a tablet keeps the full-screen pane. PCA change notice sent (`read-note-pane.js`).
- **v12.19** (PR #1015): MSA J69 (Taṣrīf person blocks as plates, five `tbody` blocks; "Basic form: فَعَلَ" at the START of the Form line / a noun's shape sentence, `conjBasic`, ← Back) and J70 (the Āyah card as a window opens at 92%, key `mmsa-ayah-window-v2`; bars 1-3; two panes with a splitter, `mmsa-ayah-panes`; full text left with Translations / Word by word `details`, `mmsa-ayah-ft-open`; ⤢ / 📖 = text across the card, the other half a bar above; Related āyāt a pull-down above 2; card under 560px stacks). New suites `word-card-tasrif-blocks-basic-browser` (100/0, 8 mutations), `ayah-card-panes-browser` (35/0, 10 mutations). Updated in place, each with its reason: `ayah-card-window-browser`, `quran-ayah-action-sheet-browser`, `word-card-ayah-card-ways-back-browser`, `word-card-tasrif-noun-browser`.

**Running / next (each in its PCF job)**
1. **MSA J71 — the first job of the next session, a DEMO** (the Owner's message 22 Oct ~8:10 am, a PC screenshot of "Notes on 2:18" opened from the Āyah card, three empty spaces circled): (1) the Notes window (`#readNotePane`, `app/js/read-note-pane.js`, the `journey-map.html?embed=1` frame) opened from the Āyah card's 📝 Note takes the Āyah card's exact rect (`mmsa-ayah-window-v2` / the card's live rect); (2) use the three empty spaces: the top bar's middle gets a search box; the tab bar (Notes · Track this āyah) also carries the note's tools grouped (‹ › · 🔍 sort copy attach · ＋ · Done ⋯), so the separate tool row goes; the formatting row moves up so the title and body start higher — "show your best elegant, distinctive design"; (3) the top bar's search finds any other Map note to attach / tag to this āyah. Build in the real app on a branch, screenshots on a computer, ask n71a. **Shared note scripts** (`read-note-pane.js`, `journey-map.html`, `note-window.*`): QR pins a copy, so a PCA change notice with the release.
2. **QR's 20 checks on v12.19** (run locally after the merge): if any failed, the PCA message names it; fix first.
3. **MSA J64**: the Owner's taps (n64a). **MSA J48 round 3**: from Thu 22 Oct ~7 pm (j48p10); step 2 needs n48e (PCA 8:30 am Thu).
4. Owner checks open: **n69b, n70b** (v12.19), n67a, n61c, n66a, n68b, n61b, n63a, n65a, n68a, n58c, n60a, n61a, n62a, n64a.

**Owner messages this session (carry1), each filed in the PCF job named**
1. ~7:05 am 22 Oct: Taṣrīf screenshots, "Can you give each block a distinctive look? …" and "place this Fa A' La as the basic form under Tasirf …Demo" → J69 (released).
2. ~7:25 am: "Only thing is this buttons take another row." → J69 (fixed: the button sits at the start of an existing line).
3. ~7:35 am: the Āyah card's eight points ("appears like that … two equal panes … full Text on the left … squeezing the right half to a bar above … Tidy the 2nd topbar … button groups as the 3rd bar … left side blocks to the right half above 'related Ayat' … Related Ayat as Pull-down") → J70.
4. ~7:50 am: "Forgot to attach the image but you did exactly, good without it. Enable the full text with translations and WbW expand/collps. Build it." → J70 (released).
5. ~8:10 am: the Notes window from the Āyah card (same size and place, three empty spaces, search to attach Map notes, "Demo") → J71 (recorded; demo next).

**Lessons**
- **`pkill -f "serve.js"` from a Bash command kills that command's own shell** (its command line contains the pattern): stop servers by PID, or with a pattern the command itself does not contain.
- **A deliberate layout change makes old checks describe the old layout**: J70 needed four suites updated in place (Status measured from a hidden sibling read 341px; 📖 no longer opens the pop-up on a PC; bar 2 is one line). Run every suite that opens the changed surface, at a PC width AND a phone width, before releasing.
- **A mutation that changes one CSS property can be unproven when another rule still holds the layout** (bar 2: `wrap` alone did not wrap, because the tools' basis was already `auto`): mutate the whole rule group the feature added.
- **A probe that measures "the element before X" breaks when a hidden element is inserted before X**: measure from a named element.
- **Insert a control into existing text at the START of the line**: at the end it can still wrap onto a row of its own on a phone (the longer "← Back to …" did).

## LATEST UPDATE — 21 Oct 2026, 6:25 pm Sydney, session `session_017XmUaxwDGhjaQExeKYwYJj` (v12.16 live on MSA AND QR; Builder round #1007 running; HANDOVER) — superseded by the 22 Oct 8:45 am block above, kept as history

Took over 4:46 pm 21 Oct from `session_01LzpvsLYG9iahYhnxMrNNHH`. Handing over at ~45% context (cost86/hand119).
**`main` is v12.16, live on MSA (6:18 pm) and QR (6:18 pm, build-from-msa run 14); QR's 20 checks on the v12.16 build: the result is in the PCA message "PCA ▸ handover ready". Next release: v12.17.** The PCA is `session_019xuGwr6uFeQUpKmERwBPxX`.

**Released this session: v12.16** (PR #1009, merge `d90228bd`): MSA J61 part 2a (verb Taṣrīf Arabic at 90%; one-tense verbs 1.45×, J46), J63 (Mushaf tools card; Builder #1004 hit its 90-minute limit after pushing, finished from `builder/issue-1004-run-1626`), J65 (the Study poster's "Āyah on top", half and half, `TOP_SHARES`/`WORDS_K_MIN`), J66 part 1 (Bangla আ in one piece in 14 Qur'an word meanings; `pull.js` `bnText()`; indexes rebuilt), J68 parts 1–3 (Note title "Quran 2:255 - Al-Baqara:", wrapping title, the Āyah card's Copy chooser). New suites, each mutation-proven: `word-card-tasrif-verb-arabic-size-browser`, `ayah-poster-top-browser`, `ayah-note-title-copy-browser`, `bangla-two-piece-aa`. PCA change notice sent for the shared note scripts (J68). What's New line written. Owner checks: **n61b, n63a, n65a, n68a** (and still open n58c, n60a, n61a, n62a, n64a).

**Running / next (each in its PCF job)**
1. **MSA J67, Builder round #1007** (dispatched 5:46 pm, run 1632): the Āyah card as a window on a PC (float-window.js, 8 handles, remembered rect, two columns when wide). When it lands: review by measurement, release v12.17. If it opens no PR, finish from its `builder/issue-1007-*` branch.
2. **MSA J68 part 4, Builder round #1008** (issue written): the Notes pane as a window. Dispatch it as soon as #1007's run ends (the Builder queue holds one waiting run, and a merge's bot comment can cancel a waiting dispatch, so do not queue it behind a running one).
3. **MSA J66 part 2**: the same two-piece আ in 13 Hadith Bangla places (`tools/hadith-data-pull/output/translations/{muslim,nasai,tirmidhi}/bn`, `hadeethenc/bn`, `dua/words-22.json`); mend in each puller as `pull.js` does, widen `bangla-two-piece-aa`'s DIRS; check those outputs for sha manifests first.
4. **MSA J61 part 2b**: the rest of the Word card's small Arabic, measured on a computer: WbW facts line 48–65%, part names 53%, Learn next 57%, Family "who" 57%, Depth's iʿrāb 45% and book titles 53% (`.word-card-fact-ar/-sub`, `.word-card-part-arname`, `.word-card-learnnext-ar`, `.word-card-family-who span`, `.word-card-irab bdi`, `.word-card-book-t`). Same token approach as part 2a.
5. **MSA J64**: the Owner's taps (n64a). **MSA J48 round 3**: from Thu 22 Oct ~7 pm (j48p10); step 2 check needs n48e (PCA 8:30 am Thu).

**Owner messages this session (carry1), each filed in the PCF job named**
1. ~5:15 pm: the poster screenshot, "Enable the poster with Arabic, Eng and Bangla options single and multiple to choose from over the words. Try to keep half of the page for Ayah and half for words" → J65 (released); the broken আ in the same screenshot → J66.
2. ~5:28 pm: "Ayah Card: … resizeable from every corner and everyside … moveable … Then organise the features/ buttons" → J67 (Builder #1007).
3. ~5:40 pm: the Note view: title "Quran (Surah): Ayah - Surah Name:", title wrapped, copy the Arabic (one or several), Note view movable/resizable → J68 (parts 1–3 released; part 4 = #1008).

**Lessons**
- **Chrome does not start a text selection on a `<button>`**, and every Read-view Arabic word is one: a drag that starts on a word copies the Arabic alone, one that starts beside it copies everything. A Copy chooser is the reliable answer; turning the words into spans would be a wide behaviour change.
- **An Āyah card tile closes the card first** (`fire()` calls `onClose`): a dialog opened from a tile must reopen the card on close (`openAyahActionSheet("S:A", half)` takes "S:A", not the record key). The card now keeps keyboard focus across its own re-renders (`keepFocus`, like `keepScroll`).
- **A worktree per job, each on its own port (8083, 8084, 8085)**, kept the long suites honest while three jobs were built in parallel; two browsers at once were fine, three or more crashed one suite ("Target page, context or browser has been closed", 33 false fails).
- **`[data-x]` as a test selector also matches a container carrying the same attribute**: the poster div has `data-ap-top` too; scope to `button[data-ap-top]`.
- **A new rule can break an older Owner rule silently**: J61's 90% made J46's "one-tense at least 1.4× bigger" false on a computer; only the old suite caught it.

## LATEST UPDATE — 21 Oct 2026, 4:30 pm Sydney, session `session_01LzpvsLYG9iahYhnxMrNNHH` (v12.15 live on MSA AND QR; Builder round #1004 running; HANDOVER) — superseded by the 6:25 pm block above, kept as history

Took over 2:47 pm 21 Oct from `session_012pLhEYVFHKJ8KbEvMua2kF`. Handing over at ~40% context (cost86/hand119).
**`main` is v12.15 (v12.14 live 4:29 pm; v12.15 is QR's offline list, see below). Next release: v12.16.** The PCA is `session_019xuGwr6uFeQUpKmERwBPxX`.

**Released this session**
- **v12.13** (PR #1003): MSA J58, Bangla transliteration everywhere (`app/js/quran-translit-bn.js`) with a Latin | Bangla | Both
  choice, and the poster menu as one line. Built by Builder round #1001; **its GitHub credentials expired (401) after its third
  push, so it opened no PR**; the Architect finished it from `builder/issue-1001-run-1620`, applying the two mutation anchors
  the Builder listed in its comment on #1001. Owner check `n58c` open.
- **v12.14** (PR #1005): MSA J60 (Family: one measured row of places per meaning + "+N more", a plate per meaning,
  `fitWordCardFamilyRows()`; WbW always coloured, the Colour tick and colour-key line removed), J61 part 1 (Taṣrīf noun-box
  Arabic at 90% of the main word: `--wc-head-ar` / `--wc-tasrif-ar`; whole case names at 320px), J62 (QCR "Level", ids
  `nonmuslim` and `nonmuslim13`, additive). Owner checks `n60a`, `n61a`, `n62a` open.
- **v12.15** (QR only): QR's 20 checks on v12.14 were 19/20; `asma-offline-browser` found that J58's new
  `app/js/quran-translit-bn.js` was in neither of QR's offline lists (`apps/qr/site/app/sw.js` SHELL and PRECACHE), so QR's
  Asma page (via `asma-cited-ayat.js`) and Word card (via `quran-word-card.js`) would miss it offline. Added to both;
  asma-offline 58/0, qr-offline 36/0, one-worker 42/0, upgrade 85/0. MSA's own worker caches by folder and was not affected.
  **After it merges: dispatch QR's `build-from-msa.yml` and confirm QR serves v12.15** (if this session could not).
- Owner checks done: **n59a** (v12.12 ⓘ) and **n57a** (v12.11 Go to its āyah): "both legend n go to works"; J57 and J59 closed.

**Running / waiting (each in the PCF job named)**
1. **MSA J63, Builder round #1004** (dispatched ~4:20 pm): the Mushaf view's ⋯ tools card loses its Bookmark tile (the
   toolbar 🔖 stays), gains an "Attach to QCR" 📚 tile (opens `openQcrPopup` with Back to the āyah), and the floating Back
   pill is a bigger arrow-only ← below 600px (text kept as aria-label/title). Spec in #1004. Review by measurement, then
   release v12.16. If the Builder loses its login again, finish from its pushed branch as with #1001.
2. **MSA J61 part 2** (the Owner, ~4:10 pm: "Arabic bigger in Tasrif? Yes. And to other places where it was that small."):
   the verb Taṣrīf (conjugation) table, then a measured sweep of every Arabic word in the app much smaller than its
   screen's main Arabic, each sized off a token as part 1 did, with a suite like `word-card-tasrif-arabic-size-browser`.
3. **MSA J64** (the Owner, ~4:22 pm: rename the QCR group "Inna Fi Zalikal Ayah" to "Inna Fi Zalikah La Ayah - Mu'min", and
   add "… - Non-Muslim"): these are the Owner's own Firestore data, which a session cannot write; n64a gives the app's own
   taps (Explore → QCR → ⋯ → ✎ / +). If they tick C ("make it a button"), that is a build round.
4. **MSA J48 round 3**: AGREED, build from Thu 22 Oct ~7 pm (plan j48p10; demo branch `claude/j48-round3-demo`). Step 2
   check: the PCA reminds the Owner Thu 8:30 am; need `n48e`.
5. Owner checks open: n58c, n60a, n61a, n62a, n64a.

**Owner messages this session (carry1), each filed in the PCF job named**
1. ~2:55 pm: the phone queue question (answered: type and Send while Claude works) + Family one row/"x more"/plates + WbW
   always coloured, no tick, no "stem, particle" line → J60.
2. ~3:35 pm: "Make the Arabic bigger as the equal size of the main word itself (may be 10% less)" + "both legend n go to
   works" → J61; n59a/n57a ticked A.
3. ~3:45 pm: "QCR: Rename Yr Level to Level. Add 'Non-Muslim- 13-yo' as a level." → J62.
4. ~4:10 pm: Taṣrīf Yes and everywhere small (→ J61 part 2); "J62. Add another level for only 'Non-Muslim'" (→ J62,
   done); the Mushaf card screenshot (→ J63, Builder #1004).
5. ~4:22 pm: rename the QCR group to "… - Mu'min" and add "… - Non-Muslim" → J64.

**Lessons**
- **QR's checks serve the QR build on port 8082** (`tools/apps/serve-app.mjs`). A second `serve.js` for a worktree on 8082
  makes them test the wrong site and fail by the dozen. Use 8081/8083, and stop every extra server before `run-all.sh`.
- **A worktree's test server is not the main checkout's**: before believing a red run, ask which directory the port
  serves (`/proc/<pid>/cwd`). One J62 run went red only because 8081 was an older worktree.
- **A hidden control is not a tap target**: `quran-word-card-rendered` counted J60's `[hidden]` "+N more" buttons as 0px;
  it now measures only rendered buttons (updated in place).
- **Run QR's 20 checks BEFORE merging a round that adds a module**: QR's worker has fixed file lists, so a new `.js` an
  Asma or Quran page imports must be added to `apps/qr/site/app/sw.js` (SHELL and/or PRECACHE) in the same round. J58 missed
  it and needed v12.15. Write that into the next Builder spec that adds a file.
- **Never `pkill -f` a pattern that is also in your own command line**: it kills your own shell (exit 144), and every
  step after it silently does not run.
- **A new check can be blind on its first run**: J61's column-head check read the `<th>`'s own text node, but the name is in
  a `<span>`; its mutation went UNCAUGHT and that is how it was found. Mutation-prove every check before believing it.

## LATEST UPDATE — 21 Oct 2026, 2:45 pm Sydney, session `session_012pLhEYVFHKJ8KbEvMua2kF` (v12.12 live on MSA AND QR; Builder round #1001 running; HANDOVER) — superseded by the 4:30 pm block above, kept as history

Took over 12:43 pm 21 Oct from `session_01YZYYGbS7PEgU5srQjy3pkd`. Handing over at ~40% context (cost86/hand119), on the PCA's word.
**`main` is v12.12, live on MSA and QR (1:41 pm). Next release: v12.13.** The PCA is `session_019xuGwr6uFeQUpKmERwBPxX`.

**Released / merged this session**
- **v12.12** (PR #999): MSA J59, the Word card's Legend is a round 40px ⓘ in the header beside "This āyah ⋯"
  (`legendButtonHtml()` / `legendBalloonHtml()` in `quran-word-card.js`; the balloon hangs from a zero-height
  `.word-card-legend-row` under the header, its pointer placed by `setWordCardLegend()` via `--wc-legend-arrow`; the
  colour row is not drawn when empty; a 320px container query keeps the header on one row). Suites: five-levels 286/0
  (5 mutations), wbw-rebuild 136/0, 14 more Word card suites green. Owner check `n59a` open.
- **PR #1000** (test only): QR's `one-worker-browser` visited `notes.html`, which QR no longer carries (PCA J71), and
  stopped on a 404 (red on v12.11 too). Now 42/0, mutation `split` still caught. QR's 20 checks are 20/20 on v12.12.
- J58 demo kept: `docs/reference/2026-10-21-j58-bangla-translit-and-poster-menu-demo.html` and the approved rules
  `docs/reference/2026-10-21-j58-bangla-translit-prototype.mjs`.

**Running / waiting (each in the PCF job named)**
1. **MSA J58 Builder round: issue #1001, Actions run 39535866610 (#1620), started 1:57 pm, IN PROGRESS at 2:43 pm, no PR
   yet.** Owner ticks n58b (session, ~1:55 pm, "J58:A1.2b3a"): 1A the rules as sampled for every word, marked "made by
   rules, being checked"; 2B the poster menu as ONE LINE that opens when tapped; 3A the first transliteration follows the
   app language. Spec in #1001. **Next step:** when its PR lands, review by measurement (the golden list for Al-Fātiḥah
   and Al-Ikhlāṣ in #1001 must match exactly; run `bangla-translit`, `bangla-translit-browser`, `ayah-poster-browser`,
   the Word card suites, governance and `apps-build-check`; LOOK at the poster menu at 320/390 and the Word card in
   Bangla), merge, allocate **v12.13** (`allocate-version.py`), write the What's New line, rebuild QR (dispatch
   `build-from-msa.yml`, then QR's 20 checks), and ask the Owner for one ❗ check in J58. If the run fails or opens no PR,
   read its log and either re-dispatch or build the rest yourself from the pushed branch.
2. **MSA J48 round 3: AGREED, build from Thu 22 Oct ~7 pm** (unchanged from the block below; demo branch
   `claude/j48-round3-demo` kept unmerged). **J48 check step 2**: the PCA's Owner reminder Thu 8:30 am; need `n48e`.
3. Owner checks open: **n59a** (v12.12 ⓘ), **n57a** (v12.11 Go to its āyah).
4. Own audit rounds paused until Thu 22 Oct ~7 pm (use108): Owner jobs and student-blocking bugs only.

**Owner messages this session (carry1), each filed in the PCF job named**
1. ~1:55 pm: "J58:A1.2b3a" → J58 n58b (comment n58b1) and plan j58p5; Builder round #1001 dispatched.
   (Two earlier Owner messages of ~12:42 pm, J58 n58a and the new J59, came through the previous session and the PCA's
   addendum; both are done or in hand above.) No other Owner message in the last 30 minutes.

**Lessons**
- **QR's checks can rot when a page moves home**: a check that walks pages must follow PCA J71's page list; a 404 stops
  the walk and hides the checks after it. Read a single failing QR check's log before calling it flaky.
- **The publish of a demo in the session scratchpad is not kept**: copy a demo into `docs/reference/` in the same PR.

## LATEST UPDATE — 21 Oct 2026, 12:40 pm Sydney, session `session_01YZYYGbS7PEgU5srQjy3pkd` (v12.11 live on MSA AND QR; HANDOVER) — superseded by the 2:45 pm block above, kept as history

Took over 12:15 am 21 Oct from `session_01TZ1fWztdUQb49mZBoChfqV`. Handing over at ~55% context (cost86/hand119).
**`main` is v12.11, live on MSA (12:33 pm) and on QR (12:34 pm). Next release: v12.12.** The PCA is
`session_019xuGwr6uFeQUpKmERwBPxX`. Nothing is running: no Builder round, no test run, no open PR.

**QR is now rebuilt by the session itself.** The Owner merged PR #996: `.claude/settings.json` on `main` allows
`mcp__claude-code-remote__add_repo`. At every MSA release: `add_repo QuranRevival/QuranRevival.github.io` (push), clone to
`/home/user/quranrevival.github.io` (then `fetch --depth=1000 origin main`), dispatch QR's `build-from-msa.yml` on `main`
with `msa_ref: main` (GitHub MCP `actions_run_trigger`), check `https://quranrevival.github.io/app/js/version.js`, and run
QR's 20 checks: `node tools/apps/build-app.mjs qr && QR_REPO=/home/user/quranrevival.github.io bash tools/apps/qr-verify/run-all.sh`
(20/20 on v12.10 and v12.11). The QR clone's own `CLAUDE.md` is the QR Architect's brief, not ours: we only build QR.

**Released this session**
- **v12.10** (PR #995): MSA J48 round 2, the Vocabulary review schedule in `quranVocabReview/{tenant}__{person}`
  (`app/js/vocab-review.js` pure, `app/js/vocab-review-data.js`; Learn next "Due today: N" + Review now; right → 1, 2, 4,
  8, 16 days, missed → tomorrow; practice state only). Suite `vocab-review-browser` 68/0, 13 mutations.
- **v12.11** (PR #997): MSA J57, the Word card's WbW "Go to its āyah {ref}" (`goToItsAyahButton()` in
  `quran-word-card.js`, a `data-word-occurrence-goto` link, so `goToWordOccurrence()` closes the card, rings the word and
  offers Back to Word Card). Suite `word-card-goto-ayah-browser` 35/0, 6 mutations.

**Running / waiting (each in the PCF job named)**
1. **MSA J48 round 3: AGREED, build from Thu 22 Oct ~7 pm** (the usage reset; Owner tick n48d "A. Fill: Keep both
   options. When: A"). The spec is J48 plan `j48p10` and the demo https://claude.ai/artifact/MptfKdYitcgWFPnhqrkp3u
   (`docs/reference/2026-10-21-j48-round3-demo.html`, branch `claude/j48-round3-demo`, not merged): (1) the Āyah Wheel's
   Word by word segment fills in gold by the āyah's words known; (2) a second display, the **Vocabulary Wheel**: 9
   segments = the 9 Learn next steps, each filling in green, ✓ when the step is passed, the share of the Qur'an in the
   centre, an **Approaches | Vocabulary** switch above the Wheel, a segment opens its step in Learn next with ← Back,
   and a **fill switch** under it ("the step's new words" default | "all words up to it"), remembered per device;
   (3) the badge at the top of Learn next and on Know Your Status; (4) a Vocabulary table on the teacher's Monitor
   (words known, share, steps passed, due today, last practised). **A step counts ✓ when all its words are Achieved**
   (no new store; told to the Owner, who may say otherwise). No Rules change.
2. **MSA J48 check step 2** (Due today → Review now) on Thu 22 Oct: the PCA set the Owner's reminder for 8:30 am
   (`trig_015dVbffcCTCDEhq8epxwrwz`). Need `n48e` stays open until then.
3. **MSA J57 check** (need `n57a`) and **MSA J58** (need `n58a`): Bangla transliteration everywhere + a tidier poster
   menu; waits on the Owner's ticks. Found: the only transliteration is Latin, from quran.com's word data; no Bangla
   source exists in the repo. Recommended 1A: generate it from the Arabic by fixed rules, sample first. Poster menu: demo
   first (3A).
4. Own audit rounds stay paused until Thu 22 Oct ~7 pm (use108): Owner jobs and student-blocking bugs only.

**Owner messages this session (carry1), each filed in the PCF job named**
1. ~6:45 am: "J48: Demo for 1 and 2" → J48 n48c, demo v1.
2. ~7:05 am: "1B. also another Wheel display should show the progress of the 9 segments. 2A. yes. Demo again" → J48, demo v2.
3. ~7:15 am: "A. Fill: Keep both options. When: A" → J48 n48d, round 3 agreed.
4. ~7:30 am: the QR Actions screenshot, "QR: Is that it?" → the Owner ran build-from-msa #8; QR on v12.10 at 7:36 am.
5. ~8:00 am: "QR update: Allowing permission to the session to do itself." → add_repo succeeded; PR #996 merged by the Owner.
6. ~8:20 am: "What exactly you want from me about J48 and J52-J56 … highlighted … dim all other" → one ❗ check per job, the rest dimmed.
7. ~10:40 am: J48 step 1 works (reminder for step 2); J52 Bangla transliteration + menu → J58; J53, J55, J56 OK; J54 OK
   plus a Word card button to the āyah → J57 (released v12.11).
No Owner message in the last 30 minutes.

**Lessons**
- **This session cannot set reminders or wake-ups** (lineage depth 8 of 8): ask the PCA to set an Owner's reminder.
- **A one-off failure in a long suite is a claim, not a finding**: `audit-part12-words` failed one 390px Taṣrīf timing
  check on the J57 branch; it passed on `main` and on a rerun of the branch (500/0). Re-run once before blaming the round.
- **A background Bash run is stopped at its time limit, and a container restart stops it too**: push a branch before a
  long run, and run long suites one at a time.
- **The PCF highlights an open `needs` item, and `imp: true` adds ❗ Important**; `vis: "dim"` dims an entry. Never `hide`
  the Owner's text.

## 20 Oct 2026, 5:55 pm Sydney, session `session_01TZ1fWztdUQb49mZBoChfqV` (superseded by the 21 Oct 12:40 pm block above; kept as history)

Took over 12:23 pm 20 Oct from `session_01C356HZ` (PCA told; `p/mmsa.sessionUrl` and `p/qr.sessionUrl` set). Handing over
on the PCA's word (hand119). **`main` is v12.09, live on MSA (5:49 pm). Next release: v12.10.** The PCA is now
`session_019xuGwr6uFeQUpKmERwBPxX`.

**QR IS NOT REBUILT: it still serves v12.07.** In this session `add_repo QuranRevival/QuranRevival.github.io` (push) was
refused by the auto-mode permission check every time, including on the Owner's direct request, and so was adding a
permission rule to `.claude/settings.json` (a session may not widen its own permissions). I did not work around it.
The Owner was given two ways: run QR's `build-from-msa` workflow themselves (QR repo → Actions → build-from-msa →
`msa_ref: main`), or commit `{"permissions":{"allow":["mcp__claude-code-remote__add_repo"]}}` to `.claude/settings.json`
on `main` (it takes effect in the NEXT session). **First job of the next session: check `.claude/settings.json`, then
`add_repo` + clone QR, run build-from-msa, and run QR's 20 checks** (`node tools/apps/build-app.mjs qr && QR_REPO=<clone>
bash tools/apps/qr-verify/run-all.sh`). Without the clone 19 of the 20 run and pass against the v12.09 build;
`upgrade-browser` needs the clone. **v12.09 added `ayah-poster.html` to QR's pages** (`app/apps/qr.json`, and
`apps/qr/site/app/js/qr-links.js` QR_PAGES): check it is served on QR after the rebuild.

**Released this session**
- **v12.08** (PR #991): MSA J48 round 1, the Vocabulary module (Builder #983 run 1585, which opened no PR). Review found
  and fixed one defect (an open Word card was not redrawn when the Vocabulary sheet closed) and two checks that could
  not fail (`noring`, `lowtest`).
- **v12.09** (PR #992): MSA J52 Āyah posters (new `app/ayah-poster.html`, `app/js/ayah-poster.js`,
  `app/js/ayah-poster-image.js`), J53 the madda "^" (display via `lemmaText()`; the lemma KEY is unchanged), J54 the word
  from Learn next marked in purple + the middle view (`landVocabWord`, `setAppReturn` `onClear`), J55 Learn next to First
  2,020 = 95% + `formatShare` + Arabic on the left, J56 Practise this word asks ten questions (9 of 10 moves the word).

**Running / waiting**
1. **QR rebuild** (above): owed since v12.08.
2. **MSA J48 round 2** (the review schedule in the account): waits on the Owner's Rules paste (J48 need `n48b`).
   Build it against `quranVocabReview/{tenant}__{person}` once they say "Vocabulary rules are live". Round 3 after.
3. No Builder round is running. Own audit rounds stay paused until Thu 22 Oct ~7 pm (Owner jobs and student-blocking
   bugs only).

**Owner messages this session (carry1), each filed in the PCF job named**
1. 3:25 pm: "J52:1-4:A, 5.B.6. A print button in note prints the note. The same button in poster prints the Poster." → J52, v12.09.
2. 3:44 pm (screenshot): "Fix the sign." → J53, v12.09.
3. ~3:55 pm (screenshot): the word from Vocabulary in a distinct colour; land in the middle view → J54, v12.09.
4. ~4:20 pm (screenshot): next 500 words or how many make 95%; each word's own %; the word on the left → J55, v12.09.
5. ~4:35 pm (screenshot): "Only 3 questions! Can you make it to 10?" → J56, v12.09.
6. **5:52 pm (last 30 minutes):** "Add a permanent permission in this repo's settings to allow adding the QuranRevival
   repo with push access, then add it now and rebuild QR" → refused by the permission check (above); the Owner was told
   the two ways. Not yet filed as its own job: it is item 1 of "Running / waiting".

**Lessons**
- **A release PR's `verify` is red until it merges**: `programme-ledger` compares the ledger with `origin/main`, and the
  job stops at that first failure, hiding the rest. Run the other verify suites locally before merging (all green for
  v12.09), and confirm the pre-release head was green.
- **Mutation-prove the Builder's checks yourself**: 2 of its 13 could not fail (a ring check reading any place attribute;
  a fail case answering all wrong). An "all wrong" case cannot prove a threshold: put the fail case just under the line.
- **A new page must be added to `qr.json` pages AND `qr-links.js` QR_PAGES**, or QR's Āyah card links to a 404; and a
  title written in JS ("MSA — ") breaks QR's build: let `translateStatic()` translate the `<title>`.
- **Check the clock before every PCF time**: one status line said 4:35 pm at 3:35 pm (corrected in the next line).
- `audit-part15-asma-browser` "cited: no page errors" fails intermittently on `main` too (a word-progress console race,
  5 of 8 on `main`, 3 of 8 on the branch): a candidate audit item after 22 Oct.

## LATEST UPDATE — 20 Oct 2026, 12:20 pm Sydney, session `session_01C356HZaJsKM1dnZUNaQoMc` (v12.07 live on MSA AND QR; HANDOVER) — superseded by the 5:55 pm block above, kept as history

Same session as the 11:00 am block below, handing over (hand119; long context). **`main` is v12.07, live on MSA and QR**
(MSA 12:16 pm, QR 12:17 pm). **Next release: v12.08.** Releases this session: v12.05 (J41 J44 J45 J46 J47), v12.06 (J49),
v12.07 (J50 J51).

**QR access now WORKS.** The Owner said "QR updates. Do it yourself"; `add_repo QuranRevival/QuranRevival.github.io`
(push) then succeeded. A new session must call `add_repo` again and clone (`git clone --depth 1 ... /home/user/
quranrevival.github.io`, then `fetch --depth=1000 origin main` for `upgrade-browser`). Rebuild QR at every release:
`workflow_dispatch` of QR's `build-from-msa.yml` (input `msa_ref: main`) through the GitHub tools; it is live in ~1 min.
QR's 20 checks: `node tools/apps/build-app.mjs qr && QR_REPO=/home/user/quranrevival.github.io bash tools/apps/qr-verify/run-all.sh`
(all 20 green at v12.07). Running one QR check alone needs `node tools/apps/serve-app.mjs build/qr &` first.

**Running / next, in order**
1. **Review Builder #983 (MSA J48 round 1, Vocabulary module)** by measurement: run 1585 finished SUCCESS with 2 commits on
   `builder/issue-983-run-1585` (its own suite 65 checks) and NO PR. Open the PR, run its suite and mutations yourself,
   the Word card / Learn next suites before and after, and release it (v12.08) if sound.
2. **MSA J48 round 2** (review schedule in the account): Rules candidate merged (PR #986,
   `docs/governance/2026-10-20-vocab-review-DEPLOYMENT-candidate.rules`, `npm run vocab-review`); waits on the Owner's paste
   (J48 need `n48b`). Build round 2's code against `quranVocabReview/{tenant}__{person}` once they say "Vocabulary rules are live".
3. **MSA J52 (āyah posters)**: demo https://claude.ai/artifact/2wL8HGSG4mzwdvBHsAmzup, six ticks waiting (need `n52a`).
   No real āyah poster exists today (the Āyah card's 🖨 Poster prints a Note via the Dawah page). Build nothing until answered.
4. Own audit rounds stay paused until Thu 22 Oct ~7 pm (Owner jobs and student-blocking bugs only).

**Owner messages since the 11:00 am block (carry1), and what was done** — each filed in the PCF job named.
1. (9:27 am, to the previous session two minutes before its handover; found by the PCA) Before Al-Fātiḥah screenshot:
   "This was done before, but dropped due to MSA-QR back n forth … Fix it" → **MSA J49**, released **v12.06**.
2. (11:19 am) "QR updates. Do it yourself" → QR access attached; QR rebuilt at v12.06 and v12.07.
3. (11:19 am) Know Your Status screenshot: Approach pull-down, bigger text on a PC, window this size always → **MSA J50**, v12.07.
4. (11:19 am) Explore screenshot: one bar so the wheel can be bigger, screen this size always → **MSA J51**, v12.07.
5. (11:19 am) "Search what we built about Ayah Poster … two types … children with words meaning … Dawah … translation
   options for both" → **MSA J52**, demo, ticks waiting.

**Lessons**
- **A browser-stored size is lost on the Owner's reset office computer** (J44, J50, J51): a window the Owner wants "this
  size always" opens at a computed size every start (`fill` in note-popup.js and float-card.js), never a stored one.
- **A window sized to the screen's bottom sits under the Zab bar** (z 900): its resize corner could not be grabbed. Measure
  with `elementFromPoint` on every handle.
- **A `<select>` in a wrapping flex row takes its longest option's width** (the brief's own lesson, again): it pushed
  Know Your Status 93px sideways on a phone. The new suite missed it because its seeded names were short. Seed one
  real-length name, and measure the scrolling box itself, not just the page.
- **QR's checks could not run while QR was unreachable, and one went red unseen for a release** (J44 vs
  `approach-window-browser`). Run all 20 at every release now that the clone exists.
- **A message that reaches a session minutes before its handover can be lost**: the PCA caught J49. When taking over,
  read the old session's last user events (`list_events` kinds `user`) for anything after its handover block.

## LATEST UPDATE — 20 Oct 2026, 11:00 am Sydney, session `session_01C356HZaJsKM1dnZUNaQoMc` (v12.05 live on MSA; J48 round 1 with the Builder; round 2 Rules waiting on the Owner) — superseded by the 12:20 pm block above, kept as history

Took over 9:29 am 20 Oct (PCA told; `p/mmsa.sessionUrl` and `p/qr.sessionUrl` set). **`main` is v12.05, live on MSA**
(checked 10:48 am). **QR is NOT rebuilt for v12.05**: `add_repo` for QuranRevival was refused again in this session;
the Owner must allow it or run QR's `build-from-msa` workflow. **Next release: v12.06.**

**Done this session**
- Handover PR #984 merged. J41's last 4 mutations run (8/8 caught). `j47/learn-next-steps` merged into the release.
- **J45 display built by the Architect**: Builder #982 ran 90 min and pushed NOTHING. Branch `j45/family-combined`:
  one row per meaning group, purple renderings (from `lemma-sense-index.json` + `lemmas-index.json`, first use of Family
  only; `lemma-senses.json` is no longer fetched) beside the cards from a 700px card (container query), under them on a
  phone; Back restores the card's own scroll (`cardScrollTop` in the origin); group control 2×2 in the wide row.
  New suite `word-card-family-combined-browser` 97/0, 11 mutations caught. Updated in place: `quran-word-card`,
  `word-card-basic-rebuild-browser`, `word-card-five-levels-browser`, `word-card-intermediate-browser`,
  `word-card-sense-arabic-browser` (5 mutations re-anchored, caught).
- **QR edit 8b re-anchored** (J44's `fill: true` line had broken QR's build; found by running `build-app.mjs qr`).
- **v12.05 released** (PR #985): J41 J44 J45 J46 J47. Sweep of 40 Word card suites green except
  `quran-word-card-popup` 19/3 (same on `main`); `behaviour.mjs` 971/0. Done lines (W-T-P-E-O), status `report`,
  What's New `wn-v1205`.
- **J48 round 2 Rules candidate** (PR #986, merged; `firestore.rules` untouched):
  `docs/governance/2026-10-20-vocab-review-DEPLOYMENT-candidate.rules` (+31 lines, `quranVocabReview/{tenant}__{person}`,
  one doc per student, `words` map), `npm run vocab-review` (pass on candidate, fail on live, 11/11 mutations caught at
  their own lines), Owner guide `...-vocab-review-owner-publish-guide.md`. Owner asked in J48 need `n48b`.

**Running**
- **Builder #983 (J48 round 1)**, run 1585 from `main`, branch `builder/issue-983-run-1585` (pushing WIP early). Its
  first run (1581) stopped at once: the Builder may not run `git merge`, and the issue said to merge j47 (now on main).
  Review it by measurement when it lands; then round 2's code (schedule writes) once the Owner says the Rules are live.

**Lessons**
- **GitHub keeps ONE pending run per concurrency group**: a bot comment on any PR queues a `claude.yml` run that knocks
  a waiting `workflow_dispatch` out of the queue (run 1578 for #983 was lost this way). Dispatch when the group is idle,
  or check the run actually started.
- **The Builder cannot `git merge`**: never write "merge branch X first" in an issue; get X onto `main` first.
- **Run `build-app.mjs qr` on every release branch**: a shared-file change can silently break a QR edit's anchor.
- **A Back that restores the level but not the card's scroll** is a half way-back on a long level; the card scrolls in
  `.word-card-content`, not the mount.

## LATEST UPDATE — 20 Oct 2026, 9:30 am Sydney, session `session_01Y2PZz59DoDCLqadc337srK` (v12.04 live; v12.05 being assembled; HANDOVER at ~65% context) — superseded by the 20 Oct 11:00 am block above, kept as history

Took over 5:13 am 20 Oct (PCA told). **`main` is v12.04, live on MSA and QR** (checked 5:13 am). **Next release: v12.05**,
carrying J41 + J44 + J45 + J46 + J47 together. Nothing has been released this session.

**Where every piece is (all on GitHub)**
- **Merged to `main` (data only, no app change):** #979 J41 `noun-forms.json` (+ `noun-forms-data.mjs`, 23/0, 6 mutations
  caught); #981 J45 `lemma-sense-index.json` (+ `lemma-sense-index-data.mjs`, 12/0, 4 mutations caught).
- **Branch `release/v12.05`** = main + `builder/issue-980-run-1571` (J41 display, Builder; hit its 90-min limit, no PR;
  Architect reviewed: matches 1A 2A 3C) + `j44/wheel-default` + `j46/tense-toggle` (one conflict in the
  `renderQuranWordCard({...context})` line, resolved: both sets of keys) + a fix to the J41 suite's mutation mode.
  On it: `word-card-tasrif-noun-browser` **228/0**; its mutations dn-count, case-a-g, case-n, ink **caught**; no-this, lazy,
  back, overflow **still to run** (`node tools/i18n-verify/word-card-tasrif-noun-browser.mjs --lang=en --width=390 --mutate=NAME`,
  overflow at --width=320; caught = exit 1). Also green there: tense-toggle 22/0, wheel-fill 46/0, the two data suites.
- **Branch `j44/wheel-default`** (Architect): PC Mastery Wheel window fills the screen and the wheel is the largest that
  fits, at EVERY start (browser storage was being lost on the Owner's reset office computer). `wheel-fill-browser` 46/0,
  7 mutations caught.
- **Branch `j46/tense-toggle`** (Architect): Taṣrīf four-button toggle (All three · Past · Present · Command), one tense
  ~1.5× with person groups side by side, phone opens on the āyah word's tense (2A). `word-card-tense-toggle-browser` 22/0,
  6 mutations caught. Updated in place (2A is deliberate): word-card-conjugation (213/0), audit-part12 (500/0), audit-part9
  (64/0) press "All three" first at phone width.
- **Branch `j47/learn-next-steps`** (Architect, NOT yet merged into release/v12.05): seven toggle tiles 10/25/50/100/300/
  500/1,000, "All N / Only the new N", known rows a distinct green, "+x.x%" own share per word, Bangla. `learn-next-browser`
  updated in place, **182/0**, 4 new mutations caught.
- **Builder queue (one at a time):** issue **#982** J45 display (Family level side by side; dispatched 7:55 am, branches from
  main) then issue **#983** J48 round 1 (Vocabulary module; dispatched 9:25 am; told to merge j47 first). Look for branches
  `builder/issue-98x-run-*`; rounds often end with NO PR.

**Next steps, in order**
1. Finish J41's 4 remaining mutations on release/v12.05.
2. When #982 lands: review by measurement (its suite + mutations), merge it and `j47/learn-next-steps` into release/v12.05.
3. Full before/after of every `word-card-*` / `quran-word-card*` / `learn-next-browser` / `phone-width-overflow` suite.
   **Before (main at dc83709, 35 suites): all green except `quran-word-card-popup` 19/3 and `qr-stage1-hidden` (exit 1, needs
   QR_REPO).** Expect `word-card-five-levels-browser` to need an in-place update (it asserts the old Taṣrīf Not applicable
   text for nouns).
4. Release v12.05 (`allocate-version.py`), the What's New line (`p/mmsa.manual`), PR, merge, check live, Done lines
   (W-T-P-E-O) on J41 J44 J45 J46 J47, PCA change notice (note-pane scripts untouched).
5. **QR build-from-msa for v12.05: this session could NOT reach QuranRevival** (add_repo refused by the permission check).
   Ask the Owner to allow it, or to run QR's `build-from-msa` workflow themselves.
6. Review #983 (J48 round 1) when it lands. **J48 round 2** (review schedule in the account, Owner ticked 3A) needs a
   Firestore Rules candidate the Owner publishes (Owner Control Gate).

**Owner messages this session (carry1), and what was done** — every one is filed in the PCF job named.
1. J41 "1. A, 2.A 3. Show me the difference in those 99 between B and C" → B-vs-C page; **the 99 was my checker's error,
   the real count is 55** (44 were ـَانِ/ـُونَ that belong to the word, e.g. فُرْقَان, broken plurals قُرُون). Then "C".
2. Screenshot of the Mastery Wheel: "always the app starts with this page setting … in PC even after a new version" → J44.
3. Family-level screenshot: combine the two meaning sections side by side → J45 demos; "1.A, 2A", then "3.A" (no see-also).
4. Taṣrīf screenshot: Past/Present/Command as a toggle → J46 demo; "place [persons] side by side"; "2.A"; "You didn't show
   me the toggle" (marked it, two styles); "1. Four".
5. Learn next screenshot: "first 25 and first 50 … a 500 … toggle showing the words" → J47 demo; then "distinct color" for
   known + "% beside the word … Build it" (read as 1A 2A).
6. "Think this as a vocabulary learning module … practices … test … reconcile with the Word card and the Progress Wheel"
   → J48 proposal https://claude.ai/artifact/TMi8GbJ5KT2xCdLExw4vv6 ; "J48: A, both places, 2.A,3.A,4.A. Build per demo".

**Lessons**
- **A count is a claim about the checker first.** "99 wrong labels" was 55: an ending test that ignores whether the letters
  belong to the word itself. The Owner's "show me" exposed it; re-derive any number before it reaches the Owner.
- **A Builder suite's own mutation mode can be blind:** #980's exited 0 under every mutation and only printed a missing
  anchor. Make anchors throw and caught mutations exit 1 before trusting it.
- **A hidden copy of the Word card sits in the page;** a test must act on the VISIBLE one (waits and clicks matched the
  hidden previous card and timed out).
- **A deliberate default change (J46 2A) makes old suites fail for the right reason:** update them in place to press the
  view they measure, with the reason; never delete.
- **Builder rounds stop at ~90 min;** ask them to push early, and check `builder/issue-*` branches, not PRs.

## LATEST UPDATE — 20 Oct 2026, 5:15 am Sydney, session `session_01HkRaQdqcADEjR9dNPv4N5N` (v12.04; J40 and J43 released; HANDOVER) — superseded by the 20 Oct 9:30 am block above, kept as history

The same session as the 6:50 pm block below, handing over at about 40% context (hand119). **Nothing is running**: no
Builder round, no open PR; my last QR `build-from-msa` (run 5) was dispatched at 5:10 am for v12.04 — confirm both apps
serve v12.04 (`/app/js/version.js` on MSA, `/app/js/qr-version.js` on QR). **`main` is v12.04; next is v12.05.**

**Owner messages since the 6:50 pm block (carry1), and what was done**
3. "J40. Al Hamdulillah! Good! Build it." → read as the four recommended ticks 1A 2A 3A 4A (recorded under J40's needs);
   Builder #974, Architect fixes, **released v12.03** (PR #976): the purple "Learn next" line and the list of 4,832
   dictionary words. Live on MSA and QR at 3:07 am (GitHub's Actions queue delayed it ~30 min). J40 status `report`.
4. Three screenshots of the Word card on 14:42:11: "Make text bigger … place the text as a button to popup as baloon …
   legend … this is unusual. Fix." → **MSA J43**, Builder #975 (stacked on J40's branch), Architect fixes, **released
   v12.04** (PR #977): bigger word-by-word text, the ⓘ Legend balloon on every level, Family's per-meaning control =
   the main WORD PROGRESS control. J43 status `report`. The J38 small-phone question is closed by this (still one
   card-scroll at 320×640, recorded).

**Open, with nothing needed from the Owner:** **J41** (Taṣrīf for non-verbs): sources checked (plan line j41p2 in the
PCF) — next is a DEMO for the Owner: (1) this noun's own number/gender/case, which needs the word-features pull to keep
QAC's `gen`/`num`/`case` for nouns (it drops them today), and (2) "the forms of this word in the Qur'an" from the
existing form index. Build nothing past the demo until the Owner answers.
**Waiting on the Owner:** checks of v12.01–v12.04; QR J01 Bangla check page; J02, J05, J06, J07, J20, J22, J24; J35.

**Lessons from this stretch**
- **Builder rounds keep finishing in ~10–80 minutes with NO PR and unproven checks.** Every round this session needed the
  Architect to run the full suite set and add or fix mutations: #966 skipped "update every old suite", #974 shipped an
  empty `rootknown` mutation and a check that pressed a rootless word, #975 shipped its checks with no mutations.
- **A contrast check passes for ANY readable colour.** The Learn next line was gold (`.word-card-progress button`
  out-ranked its class) while its 4.5:1 check passed. Assert the RENDERED colour equals the intended token.
- **A "does NOT change" check needs a positive control that the action really happened** (a press on a word with no
  root writes nothing).
- **`pgrep -f "node serve.js"` matches its own command line** — start the server unconditionally in a fresh container.
- **GitHub's Actions queue can hold a Pages deploy for 30 minutes**; wait for the live version before saying "live".

## LATEST UPDATE — 19 Oct 2026, 6:50 pm Sydney, session `session_01HkRaQdqcADEjR9dNPv4N5N` (v12.02; J38/J39 and J42 released; J40 waits on the Owner) — superseded by the 20 Oct 5:15 am block above, kept as history

The MSA Master Architect took over at 11:27 am on 19 Oct (PCA told; `p/mmsa.sessionUrl` and `p/qr.sessionUrl` set).
- **`main` is v12.02. MSA and QR both serve v12.02 live** (checked 19 Oct ~6:32 pm). The next release is **v12.03**.
- **Nothing is running.** No Builder round, no open PR. My last QR build-from-msa run (3) was green.

**Owner messages this session (carry1), and what was done**
1. (Screenshot of the Read view on 36:8) "Enable Bookmark here for entire family and enable choice of unit" → filed as **MSA J42**, built (Builder #970, PR #972), **released v12.02**: "Everyone in the family" in the bookmark dialog, and This āyah · This page · This rukūʿ · Whole sūrah · This juz on every unit, Single Ayah included. Done line written; status `report` (the Owner checks).
2. (PCA-relayed General rule **lead120**, verified in `meta/global`) → "Module Leads" section in `CLAUDE.md` (#971).

**Released this session**
- **v12.01** (PR #969): the Word card's five levels, J38+J39. Builder #966 skipped its "update every old suite" point, so **part 3 (#968, tests only)** was added; the Architect fixed 5 suites itself. Done lines on J38/J39 (status `report`).
- **v12.02** (PR #972): J42 above. QR's `range-bookmark` check was updated in place (Range is the last of six choices).

**Waiting on the Owner**
- **J40 (Learn next list): four ticks**, demo https://claude.ai/artifact/1wdJRYHbK7wiYTceb3SZ8o (ticks in `p/mmsa/jobs/J40.needs`). Build nothing until answered.
- J38 small-phone question (in its Done line): at 320×640 the WbW can-do box puts the progress buttons one scroll down the card; keep, or make the box smaller there.
- The older list: QR J01 Bangla check page, J02, J05, J06, J07, J20, J22, J24, J35's Bangla letter names.

**Next with no Owner input:** J41 (Taṣrīf for non-verbs): first find a reviewed source the app may use, then a demo. Own audit rounds stay paused until Thu 22 Oct ~7 pm.

**Lessons**
- **A Builder's "update every other suite" point can be silently skipped.** Run every Word card suite before (on `main`) and after, yourself; 21 had gone red.
- **A release PR's `verify` is red by design** until merged (the ledger and brief guards read `origin/main`); the v11.39 PR was the same. Check locally that ONLY those fail, merge, then re-run them on `main`.
- **A check that fixes a number must join digit groups**: "1,642" never matches `/1642/`.
- **QR's Pages updates in about 1 minute; MSA's GitHub Pages can lag a few minutes behind the merge.** Wait for the state before reporting "live".

## LATEST UPDATE — 19 Oct 2026, 11:30 am Sydney, session `session_019bRvTeru2WnEYcsDmkiDys` (v11.39; J110 switched; J38/J39 building) — superseded by the 6:50 pm block above, kept as history

The MSA Master Architect took over at 10:56 am on 18 Oct. It hands over at about 40% context (cost86).
- **The PCA is `session_01HUvvFAYs3CSniCSwrgeKkk`.**
- **`main` is v11.39.** The next release is **v12.01** (v12.00 is unused).
- **The QR Architect is retired; the MSA Architect owns QR** (PCA, 19 Oct).
- **New MSA rule `carry1`** (the Owner): everything said in the Architect session is carried forward. The list below is every Owner message of this session, with what was done.

**Owner messages this session, and what was done**
1. 19 Oct, "A." (J110 `n110c`, switch):
   - released **v11.39** (#959) with `qr.json` live;
   - all 20 QR checks were green on that build.
2. "done" (J110 `n110d`, QR Pages source set to GitHub Actions):
   - ran QR `build-from-msa` (run 39176194092): build and deploy were green;
   - **quranrevival.github.io serves the QR built from MSA, v11.39**, checked live at 390 and 1280px;
   - J110 has its Done line;
   - QR J22 is closed, and `p/qr.monitor` is updated.
3. "Read Word card and its 4 levels … file the discussion in the Meeting and the build as a Job" (and "Rule for all msg in here to carry forward in NS"):
   - review in `meet/mmsa-wc-levels`, filed as job **MSA J38**;
   - rule **`carry1`** is in `p/mmsa.rules`.
   - **Correction made later in the session:** the WbW "words known" total was never inflated (each level keeps its own total). What a root tap does do is make every word of the root *show* as known, and put 151 words into that level's own line.
4. "Show me in demo …" → demo 1: https://claude.ai/artifact/2AakF2Q2cxz6gpCCyuXRT6
5. "did I miss something …" → demo 2, step by step: https://claude.ai/artifact/UFCz6XNErBppp8G89vG9QJ (demo 1 kept unchanged).
6. "I liked all your ideas … purple … keep 7 in queue" and the five-level idea:
   - J38 ticks 1A–6A; 7A became **MSA J40** ("learn next" list, queued);
   - five levels filed as **MSA J39**, with demo3 https://claude.ai/artifact/9VTQVtmKnvw7e4j59Wn11R
7. "All good except Morphology stays in depth … queue verb conjugation for non-verbs … start building now":
   - J39 ticks **1A 2A 3B 4A 5A 6A 7A**;
   - **MSA J41** (Taṣrīf for non-verbs) queued.
8. "Taṣrīf rules are live" → `firestore.rules` synced (#964).
9. "Add the Legacy App - v11 link to the menu" → #965, all 26 pages; legacy-links 169/0.

**J38 + J39, the Word card's five levels: the job in hand**
- The spec is `docs/reference/2026-10-19-word-card-five-levels-build-spec.md` (#960). **Build exactly as demo3, new parts in purple.**
- The five tabs: WbW · Root · Family · Taṣrīf · Depth. Stored ids: Root = `intermediate`, Family = `basic`, Taṣrīf = `tasrif` (new), Depth = `depth`.
- **Done and merged:**
  - Taṣrīf Rules candidate + emulator test + guide (#962), published by the Owner and synced (#964);
  - `legacy-v11/` (#963) and its menu link (#965).
- **Part 1** (Builder #961, branch `builder/issue-961-run-1532`, merged with main as **`j39/part1`**): the tabs and content.
  - Reviewed: its suite `word-card-five-levels-browser` is 86/0, and the content matches the spec.
  - It opened no PR, and it updated only `quran-word-card.mjs`.
  - **Not merged alone**, because its tabs already promise part 2's counting.
- **Part 2** (Builder **#966**, run 39180576999, dispatched ON `j39/part1`, started 11:23 am):
  - counting (Root, Taṣrīf and Depth never mark words known or move word totals; their lines read "studied N of 1,642 roots");
  - Family per-meaning marks;
  - **Taṣrīf gate opened** (the declaration is authorised in the issue);
  - every old Word card suite updated in place.
  - **Its PR should target `main` with parts 1 and 2 together.**

**Next steps for the new session**
1. Review #966's PR by measurement:
   - run its suites and every Word card suite yourself, plus behaviour, phone-width-overflow and qr-stage1-hidden;
   - QR build + `tools/apps/qr-verify/run-all.sh`;
   - look at the tabs at 390 and 1280px against demo3.
2. Merge.
3. Release **v12.01** with `allocate-version.py`, plus its What's New line.
4. Re-run QR `build-from-msa` (QR gets v12.01 and the v11 menu link).
5. Close J38/J39 with Done lines (W-T-P-E-O), and send the PCA the change notice.

**Waiting on the Owner:** QR J01's Bangla check page https://claude.ai/artifact/9KkSXMNe2MTYoPe1ZrwKfy, and J02, J05, J06, J07, J20, J22, J24 and J35's Bangla letter names.
**Credits:** US$2.27 in all; none used this session. Own audit rounds stay paused until Thu 22 Oct, about 7 pm.

**Lessons**
- **A Builder round can finish without a PR.** Check `builder/issue-<n>-run-<run>` branches, not only the PR list.
- **A round's branch is made from the ref it is dispatched on.** Dispatch on a part-1 branch to stack part 2 without merging part 1 to `main`, which Pages serves live.
- **Bot comments (chatgpt-codex-connector) start Builder runs on PRs.** They queue behind a dispatched round and do not cancel it.
- **An element screenshot of the Word card shows only its visible top**, because it scrolls inside itself. Read the panel text for the rest.

## LATEST UPDATE — 18 Oct 2026, 10:56 am Sydney, session `session_01FjtmD2u1VJcHGbzQJkNY6z` (J110 steps 1–4) — superseded by the 19 Oct 11:30 am block above, kept as history

The MSA Master Architect took over at 9:16 am on 18 Oct and hands over at 43% context, at the PCA's request; the Owner
has a new MSA job for the fresh session. **The PCA is `session_01HUvvFAYs3CSniCSwrgeKkk`.** `main` is **v11.37**, with
no release made this stretch. **MSA's next release is v11.39**: 11.38 is skipped in the ledger because frozen QR
already uses it. Nothing is in flight: no Builder round and no open PR.

**PCA J110 "One source, many apps" (PMS `p/pl/jobs/J110`)**
- **Steps 1–4 are merged:** #955 (`e180a71`), #956 (`07db1f1`) and #957 (`15c036a`).
  - `app/apps/msa.json` is today's MSA; `app/apps/qr.json` is QR's settings (status `draft`, `minVersion` 11.39).
  - `tools/apps/build-app.mjs` builds an app; `tools/apps/apps-build-check.mjs` (47/0, runs in `verify`) proves
    msa builds back byte for byte.
  - QR's own files are in `apps/qr/site/`, its 38 counted edits in `apps/qr/edits.json`, its worker fill-in in
    `apps/qr/after-build.mjs`, and its poster-data generator in `apps/qr/tools/`.
  - QR's 20 ported checks: `bash tools/apps/qr-verify/run-all.sh`, with `QR_REPO` set to a full QR clone for
    upgrade-browser. **All green** on 18 Oct: upgrade 85/0, links 52/0, qr-offline 36/0, asma 274/0 and the rest.
  - The guide is `tools/apps/README.md`, and `CLAUDE.md` has a block on it.
- **Step 5:** the Owner ticked (10:48 am) that Firebase already allows quranrevival.github.io, MSA's next release is
  v11.39, and the QR Architect adds `apps/qr/qr-repo-workflow.yml` to QR as `.github/workflows/build-from-msa.yml`.
  - **The side-by-side preview is ready:** https://claude.ai/artifact/E3o2gUt414xA5Tq9rdH7mY (7 screens, phone
    and computer). Its source is in the old session's scratchpad; republish from the URL if needed.
  - **Waiting on the Owner:** J110 Needs `n110c`, "A switch / B something looks wrong".
  - **On A:**
    1. Release MSA **v11.39** with `allocate-version.py`, including its What's New line.
    2. Set `qr.json` `status` to `live`.
    3. The QR repository runs build-from-msa after its Pages source is set to "GitHub Actions".
  - **The way back:** set QR's Pages source back to "Deploy from a branch".
- **Steps 6–7:** J109 (Legacy v10) needs no building: the built QR carries MSA's link. Step 7 on MSA's side is the
  CLAUDE.md block; the QR Architect hands over its notes.
- **Credits** (`MSA_MOVE_KEY`, `claude -p` background runs): 3 runs, **US$2.27**, written in J110 after each run.
  Today's credit is a bonus outside the US$85 cap. Credits renew at about 6 pm Sydney.

**Lessons**
- **Never wait with `pgrep -f "<words>"` when those words are in your own waiting command.** It matches itself;
  wait on a PID instead (`while kill -0 $PID`).
- **Give a credit run its own git worktree** (`git worktree add`), then merge its branch. It cannot then collide
  with the session's work.
- **A credit run's result is a claim:** rerun its checks yourself on the current build. Run 3's failures were all
  from a build that was older than the worker step.
- **The app's intro screen ("Tap to skip") covers a plain screenshot.** Use the i18n-verify harness and remove the
  splash, as the QR checks do.

## LATEST UPDATE — 18 Oct 2026, 9:15 am Sydney, session `session_012qyCSaxMwZTToqQsij6wmR` (v11.34 → v11.37) — superseded by the 10:56 am block above, kept as history

The MSA Master Architect took over at 12:45 am on 18 Oct. It hands over at 9:15 am on the PCA's request: only a NEW session can
see the API key `MSA_MOVE_KEY`. **The PCA is now `session_01HUvvFAYs3CSniCSwrgeKkk`** (confirmed against
`meta/global.sessionUrl`).

**Released in this stretch.** Each has its PCF Done line with W-T-P-E-O and its What's New line.
- **v11.35 (#949, round #946, J37 = QR J16):** a 📜 Mushaf button on the Read bar beside 📖 Meaning, in full screen too.
  Corrected in review: the word shows only from 768px. 📜 steps aside while the Meaning flow is open over the Mushaf,
  where 📖 already reads "Mushaf". Four behaviour checks were updated. J37 is closed and QR was sent the notice.
- **v11.36 (#951, round #950, J29 part 38):** phone landscape, 200% zoom and reduced motion. Catalogue now honours
  reduced motion. **The round's records.html change was dropped**: here the table is 608px at 640, and its mutation
  could not fail.
- **v11.37 (#953, round #952, J29 part 39):** opened windows on short screens. The Note window and the folder ⋯ menu now
  fit. **Shared `note-window.js` changed**, and QR was sent the exact lines. **Open follow-up:** in the Builder's CI the
  Records table reads 658px at 640 (fonts differ), so v11.36's dropped records fix may be real on some devices.

**State.** `main` is v11.37. Nothing is in flight: no Builder round and no open PR. **Own audit rounds are PAUSED until
Thu 22 Oct, about 7 pm** (the Owner's answer A, relayed by the PCA). Until then work only on Owner jobs and on bugs that
block a student. **QR is FROZEN as it is** (PCA J110, 9:13 am): copy no more MSA fixes into it.

**THE JOB: PCA J110, "One source, many apps"** (PMS `p/pl/jobs/J110`). The Owner answered "1A 2A 3A. Start working
straight away" at 9:12 am in the PCA session, recorded in J110 `needs` n110a. **Read J110's whole plan first.** QR's
facts are in the QR repo, `docs/QR-PLAN.md`.
1. **Start step 1:** a settings file per app, `app/apps/<app>.json` (name, titles, icon, colours, manifest, cache name,
   which modules show, front page), plus a build script. **MSA must stay unchanged for users**: its settings are
   today's MSA. Prove it byte-for-byte, or with the existing suites (behaviour, phone-width-overflow,
   qr-stage1-hidden, brief-integrity).
2. **Heavy mechanical parts run as background runs on the API credits:**
   `ANTHROPIC_API_KEY="$MSA_MOVE_KEY" claude -p "…"`.
   - **Never print, log, echo or commit the key**, and never put it in a command's output.
   - Check it exists with `[ -n "$MSA_MOVE_KEY" ] && echo set`.
   - The credits arrive about **6 pm Sydney on 18 Oct**. The **first run is one tiny test call**. If it is refused, tell
     the PCA and do not retry.
3. **After every background run, write the running credit total in J110. Stop at US$85.** The Console's US$85 limit is
   the backstop. There is no card and auto-reload is off. Running the checks costs nothing.
4. Keep the PMS monitor at one job per line. Set no wake-ups of your own (cost86). At about 40% context, write a
   handover and send the PCA "PCA ▸ handover ready" with the opening message.

**Lessons from this stretch:**
- **Run each round's mutations yourself.** #950 claimed `recordstable` failed. It passed 107/0 here, so the change was
  dropped.
- **A Builder's green suite can still break OTHER suites.** #946's own suite passed while read-bar-bookmark-layers and
  read-quick-buttons failed. Run the suites of every element the round touches, and compare with `main`.
- **The local `playwright` package is missing in a fresh container.** Fix it with
  `mkdir -p node_modules && ln -sf /opt/node22/lib/node_modules/playwright node_modules/playwright`. `node_modules` is
  git-ignored.
- **The clone is shallow.** Run `git fetch --unshallow origin main` and fetch `claude/phase4-wiring` and
  `claude/pensive-knuth-2pu3jj` before believing brief-integrity or programme-ledger ancestor failures.
- **Fonts differ between this sandbox and the Builder's CI.** A width that is only a few px over the limit can
  reproduce in one and not the other.

## LATEST UPDATE — 18 Oct 2026, 12:40 am Sydney, session `session_01VLTMxUCwUemDmx8ydcpZnq` (v11.30 → v11.34) — superseded by the 9:15 am block above, kept as history

The MSA Master Architect took over at 5:04 pm on 17 Oct and hands over at the context limit (cost86). **The PCA is now
`session_01N6xeVcU5K2Heo5VSSgfKh4`** (since 8:29 pm; `session_015vTqvkMg3piq1bTzKMxrUU` is retired). Read
`meta/global.sessionUrl` before messaging.

**Released in this stretch.** Each has its PCF Done line with W-T-P-E-O and its What's New line. Each shared-file change
was sent to the PCA with exact lines.
- **Test-only #940:** `head-search-browser.mjs` expected the 40px Search button (was 36px), now 94/0. This clears the
  old backlog item.
- **v11.31 (#941, round #938, J34):** in Blank lines the model above the paper looks like Trace over. A new box chooses
  "As traced" or "Dark ink" (`writingModelStyle`). Corrected in review: the labels were cut at 390px.
- **v11.32 (#944, J36, URGENT Owner answer "1. Yes. 2. Keep it now"):** every page's tab reads "MSA — …" (31 pages,
  26 bn keys). `bookmark-nav.js` strips both prefixes. J36 is done; the tagline is kept.
- **v11.33 (#943, round #942, J29 audit part 36):** text and box colour contrast on MSA pages. #999/#888/#777 →
  #666, field borders → #8c8c8c, and the new token `--hadith-field`.
- **v11.34 (#947, round #945, audit part 37):** contrast inside opened windows. The round left 72 failures; they
  were fixed in review. The Light-look phone ⋯ sheet title "This note" was white on white. Also fixed: note dates,
  the Night sheet labels, the bookmark and Zab field borders, and the suite's missing Zab seed.

**In flight: Builder round #946 = MSA J37** (= QR J16; the Owner chose A at 11:11 pm): a 📜 Mushaf button on the
reading bar beside 📖 Meaning, in full screen too. It is the same switch as `#mushafToggle`. The issue holds the full
spec: layout at five widths in en/bn, four mutations, and the screenshot. Run 1474 started at 11:14 pm and has pushed
to `builder/issue-946-run-1474`. **At your first wake:**
1. Open its PR if the Builder did not (it often does not).
2. Review it by measurement. LOOK at the 390px screenshot in en and bn, normal and full screen.
3. Release it as **v11.35** (read the number off the ledger).
4. Send the PCA the QR notice: the exact lines in `quranrevival.html` and `bn.js`.
5. Reply in J37 and close it; QR's J16 waits on it.

**Next after that:** the J29 audit continues (Hadith, Dua and the shared tools; Seerah has no module yet). Ideas not
yet covered: phone landscape (844×390), 200% zoom, reduced motion. Keep a Builder round running.
**Waiting on the Owner only:** MSA J02, J05, J06, J07, J20, J22, J24; J35's Bangla letter names.

**Lessons from this stretch:**
- **The local `serve.js` can die between wakes** (the container restarts). Every suite then fails "flow ran /
  ERR_CONNECTION_REFUSED", which reads like a broken round. Curl `localhost:8080` before believing a mass failure.
- **Never put a `//` comment in the middle of a JS line.** The v11.32 edit commented out the rest of an expression
  and stopped every page's scripts. The Bangla sweeps caught it. Run `node --check` on every changed `.js`.
- **A Builder that "finished" may have left its own suite red.** #945 pushed with 72 failing assertions and no PR
  or comment. Always run the round's suite yourself before reading its claims.
- **`load-speed-check` is timing-noisy here.** A different page goes over its 20% "second visit" limit on each run, on
  unmodified `main` too. Compare against `main` before blaming a round.
- **A hidden box escapes a fit check.** `writing-sheet-popout`'s fit check skips hidden selects, so a box shown
  only in one mode was never measured. Measure in the mode that shows it.

## LATEST UPDATE — 17 Oct 2026, 5:05 pm Sydney, session `session_01EXxaMgDxPuADkuAus61QVX` (v11.26 → v11.30) — superseded by the 12:40 am block above, kept as history

The MSA Master Architect took over from `session_018mWoDVsH9ncJs1X1xg2PUD` at 2:22 pm and hands over at about 40% context
(Owner rule cost86). **The PCA is now `session_015vTqvkMg3piq1bTzKMxrUU`** (read `meta/global.sessionUrl` before
messaging: `session_01F4rELd6jNvVx14F99bVM4j` and `session_017W7wuohe8qk4GK6qLE8wNN` are older PCA sessions, and the
second is inactive).

**Released in this stretch** (each has its PCF Done line with W-T-P-E-O and its What's New line):
- **v11.27 (#932, round #931, J29 audit part 34):** keyboard leftovers checked clean; text-spacing overflow at 320px fixed
  (topic chip, Import file box, revision id); Hadith Arabic marked `lang="ar"`. **The round's `shell.css` nav change was
  dropped**: its defect did not reproduce and its mutation could not fail the suite.
- **v11.28 (#936, J36):** the Owner's urgent rename. The main page's tab and heading read "Madrasah Study App (MSA)".
  Below 700px the heading shows "MSA", drawn by CSS, so the "← Back to …" pill keeps the full name. **J36 waits on two
  optional Owner ticks:** rename the other pages' "QuranRevival — …" tab titles to "MSA — …"; keep or change the tagline
  "Reviving the Quran, abandoned.".
- **v11.29 (#937, J29 j29p33):** new `app/js/table-focus.js` brings a focused button fully into a sideways-scrolling table
  (People, Catalogue). `audit-part33` now includes 320px.
- **v11.30 (#935, round #934, J35 = QR J12):** Letters mode in the writing window: 28 letters, four forms each, Trace over
  and Blank lines. Three example words were corrected in review, and the data check now asserts the letter's position.
  **QR was sent the change notice** (via the PCA session above).

**In flight: Builder round #938 = MSA J34** (= QR J11; the Owner chose "keep both", 2:43 pm). In Blank lines, the
example above the paper is drawn like Trace over, with a choice of A light (follows the Letter style) or B dark.
Dispatched about 5:01 pm. **At your first wake:** if it has finished, open its PR if the Builder did not; merge `main`
in; review it by measurement (its suite in en and bn at five widths, every mutation, the writing-sheet*/writing-letters
suites, behaviour once, load-speed-check); release it as **v11.31** (read the number off the ledger); then send QR the
change notice for `writing-popout.js` (exact lines and checks) through the PCA.

**Next after that:** the rest of J29's audit (Hadith, Dua, Seerah and the shared tools; the PCF User Manual is the
checklist), then the Architect's backlog. **New backlog item:** `head-search-browser.mjs` fails 18 checks on `main`. It
still expects a 36px Search button, and the button is 40px. It is a stale test: update it in place.
**Waiting on the Owner only:** MSA J02, J05, J06, J07, J20, J22, J24, and J36's two optional ticks. Also ask them to
read J35's Bangla letter names.

**Lessons from this stretch (each cost a re-run):**
- **`ayah-related-hadith-mutations.mjs` edits `app/js/hadith-browser.js` ON DISK while it runs.** Run beside other suites,
  it fed them mutated code, and a commit picked up the mutated line. Run it alone, and read every commit's diff.
- **Never `git checkout` while browser suites run**: they read the working tree through `serve.js`. Wait, or use a
  worktree.
- **A waiter must never `pgrep -f` a name in its own command line** (`until ! pgrep -f "runall.sh"` matched itself and hung).
  Wait on a file the job writes.
- **A data check that asks "does the word contain the letter" is not the check that was meant.** The spec said "in that
  place". Read what an assertion really asserts, and add a positive control for the case the spec names.
- `writing-letters-browser.mjs` re-saves its picture only with `--shot`. Regenerate it after a data change.

## UPDATE — 17 Oct 2026, 1:05 pm Sydney, refreshed 2:25 pm, session `session_018mWoDVsH9ncJs1X1xg2PUD` (v11.23 → v11.26) — superseded by the 5:05 pm block above, kept as history

**REFRESHED 2:25 pm — this paragraph supersedes "Where things stand" below.** `main` is at **v11.26**: audit part 33
(#929, round #928). `zab-bar.js` adds `html { scroll-padding-bottom }`, so Tab stops above the Zab bar and corner. It is a
shared script; the PCA was sent the exact lines and the checks. Keyboard focus was already visible on every MSA page.
Found in that review and filed as J29 **j29p33**: at 320px a button at the clipped edge of the People and Catalogue tables,
which scroll sideways, is only partly in view when focused (on `main` too). Part 33's suite leaves 320 out on purpose and
says why.

**In flight: PR #932** (round #931, audit part 34: Notes pane and Bookmark menu by keyboard, row order, and wider text
spacing). The Builder again opened no PR, so the Architect opened it. **It is not yet reviewed: that is your first job.**
Its PR body lists three points to watch:
- `shell.css` is on every page: run a side-effect probe, plus `navcheck`, `phone-width-overflow` and `qr-stage1-hidden`.
- `import-notes.html` changed again: run `wordpress-import-screen`.
- `hadith-browser.js` changed: keep `/tools/hadith-data-pull/output/…` paths stable.
Widen its suite to 320/390/820/1280/1440, and release it as **v11.27**.

**New MSA jobs from QR, via the PCA (17 Oct 1:08 pm):**
- **J34** = QR J11: in Blank lines, the word above the paper looks like Trace over. It is **Parked** until the Owner ticks
  A or B in QR J11; read the tick there, never ask again. Then build it in `writing-popout.js`.
- **J35** = QR J12: letter writing practice, each of the 28 letters alone and in its beginning, middle and end forms, as
  Trace over and Blank lines. It is planned and needs nothing from the Owner. **Dispatch it as the next Builder round**
  (`writing-sheet.js`, `writing-popout.js`; the letter list goes in one data file with a completeness check). Promised to the
  Owner: a picture of one letter's sheet before the build is finished.
Both files are shared with QR, so each release sends QR the exact lines and checks.

**One more lesson:** write every PCF time from `date -u`, never by hand. One status line this session carried a typed time
4 minutes in the future; it was corrected at the next write.


The MSA Master Architect, taking over from `session_01M6JYqY9wiowXWGQix9WYAC` at 10:52 am on 17 Oct. This session hands over
early on the Owner's **new rule cost86** (17 Oct 12:44 pm, PCA J86, in the PCF General rules). **Read it; it binds you:**
(A) hand over at about **40%** context, not 75%; (C) **no self wake-ups**: set no `send_later` or check-in of your own. You wake
on the 6-hourly PCA keep-alive, a 📣, an Owner comment or a PCA message, and check Builder results at those wakes;
(D) a shared-script change notice to QR gives **the exact lines and the names of the checks that cover them**.
The 9:00 am block below is kept as history.

**Released in this stretch** (each has its J29 Done line with W-T-P-E-O and its What's New line):
- **v11.24 (#923, round #922, audit part 31):** screen-reader names on MSA's pages, English and Bangla. Monitor's ◀ ▶ and its
  date and month fields, and the Import file field, had no name. The Dua cards on tablets were clean. **Fixed in review:**
  `wordpress-import-screen` pinned the file input's exact markup and broke on the new `aria-label`; it now checks for one
  `.xml` picker, never `multiple`.
- **Test-only (#926):** `bangla-sweep-lib.mjs` accepts the proper names MSA and "Open Islamicate Texts Initiative". It had
  been 222/2 on `main` since v11.15 and is now 224/0. Removing the About line's Bangla still fails it (J29 j29p31, answered).
- **v11.25 (#927, round #925, audit part 32):** new `app/js/modal-focus.js` (`trapModal`). Tab stays inside the bookmark
  dialogs, the folder pickers and the Note-window dialogs. Closing a dialog, Note window or folder window returns focus to
  its opener. **Shared note scripts changed** (`note-window.js`, `bookmark-popover.js`, plus the new file they import).
  The PCA was sent the exact lines and the checks.

**Where things stand (1:05 pm Sydney, 17 Oct):** `main` is at **v11.25**. **In flight: Builder round #928** (issue #928,
run 1441, dispatched 11:54 am): audit part 33, a visible keyboard focus on every MSA control and a Tab order that follows
the screen. At your first wake:
1. If it has finished, open its PR if the Builder did not (#925's run opened none).
2. Merge `main` in.
3. **Widen its suite's `WIDTHS` to 320/390/820/1280/1440.** Both #922 and #925 shipped suites covering only 390/1280.
4. Run every mutation, the suites of each file it touches (a CSS focus rule touches many pages, so include
   `phone-width-overflow`, `audit-part28/29/30` and `qr-stage1-hidden`), `behaviour` once and `load-speed-check`.
5. Release it as **v11.26** (read the number off the ledger) and update the PCF.
Next after that: the rest of J29's audit, in the order of the PCF User Manual (keyboard and screen-reader passes are new
dimensions; Hadith, Dua, Seerah and the shared tools only, per PCA J71). Then the Architect's backlog in `ARCHITECT.md`.
**Waiting on the Owner only:** MSA J02, J05, J06, J07, J20, J22, J24.

**Lessons from this stretch:**
- **A fresh container cannot import `playwright`**: it is installed globally, and ES modules ignore global packages. Run
  `mkdir -p node_modules && ln -sfn /opt/node-tools/node_modules/playwright node_modules/playwright && ln -sfn
  /opt/node-tools/node_modules/playwright-core node_modules/playwright-core`. `node_modules` is ignored by git. Without it,
  every browser suite "fails" in a second with `ERR_MODULE_NOT_FOUND`; read the log, not the count.
- **The clone is shallow**: `programme-ledger` reports a baseline "not an ancestor of origin/main" until
  `git fetch --unshallow origin` and a fetch of all branches. Unshallow before believing it.
- **An accessibility attribute breaks any check that pins exact markup.** Run every suite that greps the changed HTML file
  (`grep -l <file> tools/i18n-verify/*.mjs`), not only the browser ones. That is how #923's regression was found.
- **Prove a "red on `main` too" claim** by checking out `origin/main`'s `app/` into the working tree, running the suite, and
  restoring with `git checkout HEAD -- app/`. Then file it, or fix it if it is test-only and small (#926).

## LATEST UPDATE — 17 Oct 2026, 9:00 am Sydney, session `session_01M6JYqY9wiowXWGQix9WYAC` (v11.17 → v11.23), refreshed 10:50 am — READ THIS FIRST

The MSA Master Architect, taking over from `session_01QrqatzKibuMLUrZsW4AgCr` at 9:55 pm on 16 Oct. The 8:35 pm block below
is kept as history.

**Released in this stretch** (each has its Done line in PCF MSA J29 and its line in the User Manual's What's New; the
release lines are appended below by `allocate-version.py`):
- **Audit part 24 (test-only, #906):** Records page and Continue strip checked working; `zab-data` and `zab-bar-browser`
  repaired.
- **v11.18 (#908):** Continue chips carry `back=1` and the topic-study pages show ← Back; hidden modules no longer use up
  the strip's five places. **Fixed in review:** the first build mounted the Back from the shared Bookmark menu and drew a
  SECOND ← Back on `quranrevival.html`, `bookmarks.html` and `asma-study.html`.
- **v11.19 (#911):** Topic study (Deen, Arabic, Hadith) checked; 40px tabs; Breakdown note in Bangla (`way-modal.js`, shared
  with the Qur'an page). `arabic-study` is deliberately not in `load-speed.mjs`.
- **Round #910:** nothing to fix (j29p3 was already fixed in v11.13).
- **Suite health sweep (#917, test-only):** all 129 MSA suites on `main`, **no app defect**; repaired
  `hadith-source-rights` (decision 89's hadith-api grant now cited), `audit-part18` (Continue `back=1`) and `audit-part17`
  (clipboard origin hardcoded to :8080). Report: `docs/reports/2026-10-17-msa-suite-health.md`.
- **v11.20 (#914):** the smallest phone with real-length names (Notes, Mapping My Journey, Bookmarks, Zab).
- **v11.21 (#916 + MSA J33):** Note windows, Bookmark menu and dialog, Zab → Note at 320px; **J33 = the Owner's QR J04**
  (bigger Word card percentage circle), copied byte for byte into the frozen `quranrevival.html` on the PCA's request.
- **v11.22 (#919):** audit part 29: the window ⋯ menu sheet clears the switcher bar; the bookmark dialog's unit buttons 40px and it fits a 320×568 phone.
- **v11.23 (#921):** audit part 30, the third pass at tablet width (768–820px) with real-length content: a Note window's
  title wraps instead of being cut, in every window (`note-window.css`, a shared note script; the PCA was sent the change
  notice and relayed it to QR).

**Where things stand (10:50 am Sydney, 17 Oct):** `main` is at **v11.23**. **In flight: Builder round #922** (issue #922,
audit part 31: Bangla accessible names on the MSA pages, and the Dua cards at tablet width). When its run ends, open its
PR if the Builder did not, merge `main` in if its base is older than v11.23, review by measurement (its suite at
320/390/820/1440 in en and bn, every mutation, the suites of each file it touches, `behaviour` once, `load-speed-check`),
release it as the next free version (v11.24 unless something else took it; read it off `main`), send the PCA a change
notice if a shared note script changed, and update the PCF (J29 Done line with W-T-P-E-O, What's New, `p/mmsa.monitor`).

**Every MSA section of the User Manual has now had a first pass (parts 11–26) and a 320px real-length second pass
(parts 27–29).** The tablet third pass began in v11.23. Next, in this order: the Owner's new words in the PCF; any `PCA ▸` change
request; the rest of the tablet pass (#922 and whatever its review finds); then the Architect's backlog in `ARCHITECT.md`.
**Waiting on the Owner only:** MSA J02, J05, J06, J07, J20, J22, J24.

**PCF rule changes today:** J82 (17 Oct): a job that only reports is status `report` ("Reporting"), never "Needs you"
(J15 and J33 moved). Keep-alives are now every 6 hours.

**Lessons from this stretch:**
- **Dispatch a Builder round only when no `claude.yml` run is in progress.** A queued dispatch is displaced by bot
  comments on an open PR (`issue_comment` runs in the same concurrency group): #910's first start was cancelled that way
  and lost 1 h 50 min.
- **A round dispatched before the previous release merges branches from the older `main` and can redo its fixes**
  (#918 redid two of #916's); merge `main` in and keep the released version where they overlap.
- **The Builder often ends without a PR** (#909, #912, #915), and **runs out of turns on compound shell commands** (#912
  spent 105 turns, mostly refused `;`/`&&` chains). Every issue now says: one command per call.
- **Pass `allocate-version.py`'s MILESTONE and CHANGELOG from files** (`"$(cat file)"`): an apostrophe ("Qur'an") in a
  shell-quoted argument silently emptied both once.
- **A suite that hardcodes `localhost:8080` passes on the Builder and fails on any other port**; use the harness `BASE`.
- **A review must run every suite that asserts a URL the round changes** (v11.18 missed `audit-part18`).
- **Shared-code changes need a side-effect probe**: compare the pages that use the shared file on `main` and on the branch
  (v11.18's duplicate Back was found that way, not by the round's own suite).
- **Container restarts are frequent here** (four in this stretch): they kill servers and background runs. Run long jobs as
  tracked background tasks, write each result to a file as it finishes (`.done` files), and throw away results recorded
  while the server was down (`0 passed`).
- **Never `pkill -f` a name in your own command line** (it killed the shell once again); kill by PID.

## LATEST UPDATE — 16 Oct 2026, 8:35 pm Sydney, session `session_01QrqatzKibuMLUrZsW4AgCr` (v11.02 → v11.16) — READ THIS FIRST

The MSA Master Architect (MMSA was renamed **MSA, Madrasah Study App**, by the Owner at 5:36 pm; the project id,
repository and database paths stay `mmsa`). This session was summarised once and has run long; a fresh session
should take over from here.

**Where things stand.** `main` is at **v11.16** (read it off `app/js/version.js`). The release lines v11.02–v11.16 are
appended below this block by `allocate-version.py`. **In flight: Builder round #902** (issue #902, dispatched 09:16 UTC):
the User Manual's Bookmarks and Zab features checked end to end, plus their loading speed. When its run completes, open
its PR if the Builder did not, review by measurement (its suite at 320/390/820/1440 in en and bn, each mutation, the
`bookmark*`/`zab*` suites, `load-speed-check.mjs`, `phone-width-overflow`, `qr-stage1-hidden`, `behaviour` once),
allocate the next version, merge, and update the PCF (J29 Done line with W-T-P-E-O, What's New, `p/mmsa.monitor`).

**New rules from the Owner and the PCA today — all binding:**
- **One home for every app part (PCA J71)**, recorded in `CLAUDE.md`: Asma, LDOG and Quran Study live in QuranRevival
  (its own repository and Architect); MSA keeps Hadith, Dua, Seerah and the shared tools (Notes / Mapping My Journey,
  sign-in, Records, Bookmarks, Zab). **MSA's Quran Study, Asma and LDOG are frozen** (safety fixes only; the PCA has
  made two one-line exceptions, v11.13 and v11.15). Every change to a shared in-page note script (`note-window.js`,
  the Notes pane, the Zab bar, "file this note") gets a change notice to the PCA with its commit; if the PCA session is
  inactive, write the notice into the PCF (as done in J29 for v11.15). Keep `/tools/hadith-data-pull/output/…` paths
  stable: QR reads them.
- **Ask only what changes what you do (PCA J70).** MSA has no open Owner questions now: J30 Q1 closed, J03 Q1 and
  J29 17(b) passed to QR.
- **No stale "working" labels (PCA J74):** a job may show "working" only with a line or act stamp from the last 3 hours.
  J17, J19, J23, J25, J30 were marked Done and J03 Parked today.
- **Work cost-effectively (cost76):** run only the tests that cover a change, the full behaviour suite once before a
  release; no padding rounds; short messages.
- **Loading speed in every audit (J29, the Owner's idea):** `tools/i18n-verify/load-speed.mjs` (v11.16) measures a page
  on a slowed phone connection, first and return visit, 390 and 1400px; `load-speed-check.mjs` fails a page more than
  20% slower than `docs/reports/2026-10-16-load-speed-after.json`. Each audit round measures its pages and fixes the
  slowest first.

**Parked, unpublished:** QR's Asma wheel-label fix (QR commit 67bb95b) is in this container's `git stash` only; the
PCA said park it (Asma moves to QR). A safety check blocks committing code copied from another repository: do not
work around it.

**Next rounds, after #902:** the remaining shared-tool sections of the manual not yet audited (Records page, the
Continue strip if not covered), each with its speed check; then Hadith/Dua again only when something changed.
Seerah has no module yet.

**Routines:** the PCA keep-alive (every 3 hours) and the shared 4-hourly check stay. This session's one-shot
wake-ups have all fired.

## LATEST UPDATE — 16 Oct 2026, 1:45 am Sydney, session `session_01VugmUfoMMcfxmnW99UmXgm` (v10.63 → v11.01) — READ THIS FIRST

The 15 Oct evening block below is kept as history.

**Released in this stretch** (each has its Try line in its PCF job, and its line in the User Manual's "🆕 What's New"):
- **v10.64:** audit part 8 (round #858). QCR collection controls and the Trash ← Back are 40px.
- **v10.65:** audit part 9 (round #860). The QCR āyah-number badge is a pill; the verb table and the Mushaf view were audited clean.
- **v10.66:** built by the Architect. The wheel's "Take an Approach" pill is its drawn size again, with an invisible 40px tap area. v10.62 had pushed it out of the hub on 320–360px phones (`wheel-centre-browser` failed 14 checks that v10.62's review never ran).
- **v10.67:** audit part 10 (round #863; the run opened no PR). The QCR and Asma wheels' outer labels are whole (`roomForNumbers`).
- **Test-only, PR #865:** `tablet-wheel-browser`'s 700px floor went from 650 to 635, updated in place. v10.53's 40px tabs took 6px by design (bisected to 04878941).
- **v10.68:** audit part 11 (round #866). The first round to check that each User Manual feature WORKS ("Qur'an: reading"). One fix: the ⋯ tools panel ran off a 320–390px screen.
- **v11.00: QR Stage 1 (PCF J30; the PCA's J50 hand-over; the Owner's three answers, A/A/later).**
  - The app is now QuranRevival. General Study, Nature-Life, Life Skill and Health are hidden by one list, `HIDDEN_FROM_QR` in `app/js/hidden-modules.js`, read by `nav.js` and `continue-strip.js`. Nothing is deleted, and each page still opens at its own address.
  - About says so in English and Bangla, and the User Manual is updated.
  - The Owner asked for the next whole version.
  - The first allocation sat on a stale base (v10.67); it was reverted and re-done on v10.68.
- **v11.01:** audit part 12 (round #870; no PR). The full-screen Āyah card was 16px too tall; the floating Word card opened over the nav row.

**In flight:**
- **Builder round #872**, audit part 13: the manual's "Qur'an: recording progress and status" section, each feature checked working. Dispatched about 1:44 am, 16 Oct. Review it by measurement and release it as **v11.02**.
- The next manual sections after that: Explore; Asma ul Husna; Notes and Mapping My Journey; Zab; Bookmarks; Writing; Hadith and Dua; teaching pages.
- **Skip** "Other study modules" except Deen Study, Arabic and LDOG: General Study, Nature-Life, Life Skill and Health are hidden and on hold (PCA).

**Waiting on the Owner** (tick lists in every report):
- **J30:** v11.00 vs v11.01 for the Stage 1 release (default A, v11.00, as done).
- **J30:** keep a `legacy-v10/` copy like v07–v09 (default A, yes; **not made yet**. When the Owner ticks, copy `app/` as released at v10.68, merge commit 075bc90c, with `js/sw-register.js` registering no service worker, and add it to `brief-integrity.mjs`'s archive checks, as for legacy-v09).
- **J03 Q1:** which keys to add.
- **J29 17b (optional):** a shorter name for the Asma group "All Knowledgeable, All Encompassing, Watches, Hears everything", which is cut on a 1440px wheel in English.

**Holds (PCA J50):**
- No new work in General Study, Nature-Life, Life Skill or Health; fixes that keep them from breaking are fine.
- Nothing for Stage 2 (QR on its own site) until the PCA says.

**Lessons from this stretch:**
- **A round that resizes a control must run the suites that own that control's geometry,** not only its own. v10.62 broke `wheel-centre` silently for four releases.
- **Read the PR's base before allocating.** A Builder dispatched before the previous release merged branches from the older `main`; `git merge-base --is-ancestor origin/main HEAD` must say yes first.
- **The Builder often ends without a PR** (#863, #870), and #866 opened one late. Wait until the branch is quiet for about 15 minutes, check the run, and open the PR yourself.
- **Read a suite's exclusions and its positive-control numbers.** #863 left slice captions out; measuring them found one more cut label.
- **A screenshot that is not the app is not an app task.** The Owner's "make these bigger" picture was the PCF page, so it went to the PCA (J59).
- Run browser suites for a branch from a `git worktree` on `PORT=8082` with `QR_BASE`, with `node_modules` symlinked to `/opt/node22/lib/node_modules`. The repository root needs the same symlink; it is gitignored.

## LATEST UPDATE — 15 Oct 2026, evening, session `session_011ZoZQoxPx6xnm1mzR5hSYn` (v10.56 → v10.63) — READ THIS FIRST

The 12:22 pm block below is kept as history.

**Released in this stretch** (each has its Try line in its PCF job, and its line in the User Manual's "🆕 What's New"):
- **v10.57:** audit part 3 (J29, round #844). `app/css/admin-touch.css` gives 40px controls on Asma, Records, Monitor, People, Classes, Homework, Curriculum, Catalogue and Hadith.
- **v10.58:** audit part 4 (J29, round #847). A 68px Zab spacer on phones, 40px nav-menu controls, and menus that scroll inside themselves.
- **v10.59:** the Owner's photo (J25): **the 🧰 docks in the Wheel / Legend / Unit row on a phone** (`[data-zab-dock]`).
  - The floating corner hides while the dock is on screen.
  - Elsewhere the corner sits above pinned bottom bars (`[data-zab-lift]`: `#tabRow`, `#readQuickRow`).
  - Built by the Architect; suite `zab-dock-browser`.
  - The Owner also confirmed **Zab works on the live Rules** ("Working", J25).
- **v10.60:** audit part 5 (J29, round #850). admin-touch on six more pages, plus the study modules' person picker.
  - Two stale Dawah checks were repaired: the Zab Rules file was missing from `dawah-boundary`'s published list, and `dawah-screen` now accepts `?back=1`.
- **v10.61:** the Owner's J26 choice **A**. Know Your Status shows "Before Al-Fātiḥah: Aʿūdhu billāh ● · Bismillah ●" under each Approach, and the band is capped on wide screens. Built by the Architect; suite `kys-opening-line-browser`. **J26 is done.**
- **v10.62:** audit part 6 (J29, round #853). 40px buttons on the Qur'an page's wheel pill, Read bar and Explore, and "+ New Note".
  - The Notes window's ✕ was off a 320px screen and is back.
  - The review added a 320px case so the `rnpback` mutation can fail.
- **v10.63:** audit part 7, item 1 (J29 item 12, round #856). The "← Back to Know Your Status" pill no longer covers the Approach tab (`bookmark-nav.js` respects `[data-zab-lift]`). `quran-my-status-browser` runs to the end again.

**New PCF General rules, both in `CLAUDE.md`:**
- **Time on every update (PCA J45):** a full UTC `at`, read off the clock. **Read the clock every time** — this session twice wrote a guessed time and had to correct it.
- **🆕 What's New (PCA J46):** one line per release at the top of `p/mmsa.manual`, written in the same step as the release.

**In flight:**
- ~~Builder round #858~~ **released as v10.64** (6:20 pm, 15 Oct, session `session_01VugmUfoMMcfxmnW99UmXgm`): QCR collection controls and the Trash Back button at 40px. Left in J29: the verb table (not audited), the Mushaf view's rendered pages (not measurable here), and the 22px QCR āyah-number badge (older, found in review). The PCA then lifted the hold for audit fixes in QR modules: round #860 (PR #861) released as **v10.65** (the badge fixed; verb table and Mushaf clean). **Found in that review:** `wheel-centre-browser` fails 14 since v10.62 (the 40px Take an Approach button pokes out of the hub at 320/360px): **fixed in v10.66** (drawn size again, 40px tap area via `::before`). **Lesson: a round that resizes a control must run the suites that own that control's geometry (here `wheel-centre-browser`), not only its own.** Then round #863 (wheel labels cut at the wheel's edge) released as **v10.67**; its run opened no PR, so the Architect did. **Open in J29:** one Asma slice caption cut at 1440 en (wording); `tablet-wheel-browser` fails 2 on main (landing wheel 638–644px at 700, wants 650), traced to v10.53's 40px tabs (by design) and the check updated (PR #865). Round #866 (audit part 11: the manual's reading features each checked WORKING) released as **v10.68**. **QR Stage 1 (PCF J30, from the PCA's J50 hand-over):** hide General Study, Nature-Life, Life Skill and Health from every entry point, nothing deleted; Builder round #868 dispatched 11:04 pm; the Owner wants it released as **v11.00** (two tick questions in J30: v11.00 vs v11.01, and a legacy-v10/ copy). **Released as v11.00** (PR #869; About says the app is now QuranRevival). **New PCA hold:** no new work in General Study, Nature-Life, Life Skill or Health.

**THE QR SPLIT (PCA J50, the Owner, 15 Oct ~5:30 pm):** QuranRevival becomes its own separate site and app (Qur'an, Hadith, Dua, Asma and "LDOG"); MMSA stays for Madrasah use. The PCA recommends the same Firebase, a start at madrasatul-muslimeen.github.io/quranrevival/, and a new QR Master Architect from 16 Oct; MMSA removes those parts only after QR is live and redirects work. **Until the PCA sends the hand-over list: start NO new work inside the QR modules beyond fixes already in flight** (round #858 is the last such).

**Waiting on the Owner** (tick lists in every report):
- **J03 Q1:** which keys to add.
- **J50 (PCA-led):** split QuranRevival from MMSA.
  - The facts were sent to the PCA, and the PCA now recommends QR 1 (its own home and menu on the same site, one Firebase).
  - **No split work until the Owner ticks.**

**Lessons from this stretch:**
- **A pinned bar stays on screen while the page scrolls.** v10.58 measured only at the page's end and missed the 🧰 over the tabs; the Owner's photo found it. Measure covering part-way down the page too.
- **Measure at 320px.** v10.62's Notes-window defect existed only there, so its mutation could not fail at 390.
- **An unproven mutation is a finding:** chase it until it fails for the right reason.
- **Never `pkill -f` a name that appears in your own command line;** it killed the shell and both servers.
- **A container restart loses background checks.** Write each check's result to a file in the scratchpad as it finishes, so a restart only costs the unfinished ones.
- **A PCA relay can say a job is filed before it is.** Confirm the write succeeded before replying "filed".
- **The issue body must not contain `@claude`.** It starts a second, duplicate run (#1290 did). Start rounds only with `workflow_dispatch`.
- **Old stale checks found on `main`:** `dawah-*` (fixed in v10.60) and `quran-my-status-browser` (fixed in v10.63). Run the suites of the area a round touches, not only the round's own.

## LATEST UPDATE — 15 Oct 2026, 12:22 pm Sydney, session `session_01EU951Kr2tQxWqNbKLvZjPn` (v10.50 → v10.56) — READ THIS FIRST

**Released in this stretch** (each has its Try line in its PCF job):
- **v10.51 and v10.53**: audit part 1 (J29). The Qur'an face in Bangla, 40px targets, the Unit pill grid, popups below the nav, the Āyah card heading and ladder, and Bangla digits.
- **v10.52**: Keys to Understanding K2 (J03). The saving layer and a Rules candidate (`docs/governance/2026-10-15-ayah-keys-candidate.rules`). This is **not** published.
- **v10.54**: audit part 2 (J29). 40px targets on Mapping My Journey, Bookmarks and the Hadith pickers.
- **v10.55**: **Zab switched on** (J25).
  - The Owner published the Zab Rules ("Published") and said in the chat "Yes, switch Zab on".
  - `firestore.rules` now equals `docs/governance/2026-10-14-zab-candidate.rules`, and `zab-readiness.js` is `ready: true`. See `docs/reports/2026-10-15-zab-enabled.md`.
  - Not yet proved live: the Owner's first Try will show whether the live Rules accept Zab's writes (add an item in 🧰, reload, and it is still there).
- **v10.56**: Arabic word boxes in the Word card's Intermediate "Meanings of this word" rows (J23). Also the Owner's **W-T-P-E-O** rule in `CLAUDE.md`.

**In flight:**
- **Builder round #844**: audit part 3, covering Asma ul Husna, the Writing sheet, Dua cards, Records, Monitor, People, Classes, Homework, Curriculum and Catalogue.
- Its branch is `builder/issue-844-run-1286`. It was dispatched at 11:25 am, 15 Oct, and had opened no PR at 12:08 pm.
- **Next:** review it by measurement and run every mutation it lists. Run `behaviour.mjs` and `phone-width-overflow.mjs`. Note that the Zab bar is now on every page, so check it covers no page's bottom controls. Then open the PR yourself if the Builder did not, release it as the next version, and dispatch the next round.

**Waiting on the Owner** (keep these in every report, as tick lists):
- **J25:** try Zab once, to prove the published Rules work.
- **J26:** one tick for Know Your Status: A, one small line under each Approach (recommended), or B, leave it.
- **J03 Q1:** which keys to add.

**The PCF routines now in force:**
- **PCA J37:** rewrite `p/mmsa.monitor` at every step, and stamp `act {at, by:"MMSA", what}` on every job you write.
- **PCA J39:** every finished job ends its Done line with a one-line W-T-P-E-O check.
- **"Important" marks:** check for `important: true` and `imp: true`, and do those first.
- **PCA J43:** when the session gets long, write this block and send the PCA "PCA ▸ handover ready".

**Lessons from this stretch:**
- Changing `firestore.rules` or a readiness gate needs the Owner's own word in this chat. The session's safety check refused it on a PCF relay alone.
- Run browser suites for a second branch on `PORT=8081 node serve.js` with `QR_BASE=http://localhost:8081`, from a `git worktree`. That way the suites running on :8080 are not disturbed.
- The phone-width suite is `phone-width-overflow.mjs`, not `...-browser.mjs`.

## LATEST UPDATE — 15 Oct 2026, 1:45 am Sydney, session `session_01EU951Kr2tQxWqNbKLvZjPn` (v10.44 → v10.50) — READ THIS FIRST

The 14 Oct block below is kept as history.

- **`main` is v10.50.** **The Zab plan (PCF J25, the Owner's answers 1 B, 2 A, 3 B, 4 B) is complete**, rounds Z1–Z6:
  - v10.45: saving layer and Rules candidate;
  - v10.46: the bar on every page;
  - v10.47: tasks and links;
  - v10.48: ideas and shopping;
  - v10.49: → Note into Mapping My Journey, plus a visible ← Back on `journey-map.html` for `back=1`;
  - v10.50: pockets inside pockets and the phone Drawer.
- **Zab is behind `app/js/zab-readiness.js` (`ready: false`).** Nothing of it shows or reads until two things happen:
  - the Owner publishes `docs/governance/2026-10-14-zab-candidate.rules`. It is final: today's live Rules plus 143 Zab lines, nothing removed. J25 "ready to publish".
  - the Architect then enables the gate with a recorded decision, copying `siyagah-flags-readiness.js`, AND syncs `firestore.rules` to the published file in the same change.

  Then post a Try (phone) line in J25.
- **Nothing is in flight.** No Builder round is running and no PR is open.
- **Waiting on the Owner:**
  - J25: publish the Zab Rules.
  - J23: the two questions from the Owner's deleted J27:
    - restore the Arabic word boxes as on Basic, and on which tab;
    - which "Attach" button. The Note editor's 🖼 picker opens the file chooser on a real tap (new check in `journey-note-images-browser`). If the Owner means the PCF's own attach, that goes to the PCA, who alone changes the PCF page code.
  - J26: Know Your Status, A or B.
  - J22: the Owner's tries only.
- **Possible next, with nothing needed from the Owner:**
  - The Owner's standing rule says audit the app feature by feature (the PCF User Manual, J19, is the checklist; it is current to v10.44). Add Zab to the manual first.
  - The J26 polish (cap the band's width on wide screens) is noted in J26's plan.
- **Lessons from this stretch:**
  - Builder rounds often stop early (Z3 pushed no browser checks and no PR); write the missing suite yourself.
  - Look at every screenshot: Z2's item text was squeezed to a few letters wide with every check green.
  - A mutation that crashes with a timeout is detected but uncounted; wrap each width's flow so it fails by name.
  - Read every time off the clock (`TZ=Australia/Sydney date`) and keep the PCF monitor line under an hour old.
  - Cross-check PCA relays against the PCF itself: the Owner had answered 4 Zab choices, not 2.

## LATEST UPDATE — 14 Oct 2026, session `session_01EU951Kr2tQxWqNbKLvZjPn` (v10.39 → v10.44) — READ THIS FIRST

The 13 Oct block below is superseded by this one and kept as history.

- **`main` is v10.44** (read it off `app/js/version.js`). This session released:
  - v10.40 (J24, the dragged wheel no longer hides Wheel / Legend / Unit);
  - v10.41–v10.43 (J23: level sentences, the top of the card in layout B, the mark choice B question);
  - v10.44 (J26: the "Before Al-Fātiḥah" band; new permanent key `opening:taawwudh`, stored in chunk `surah_1`).

  It also copied the Owner's published guardian Rules into `firestore.rules` (J15, PRs #808/#810; the Owner confirmed a
  student works) and published Scholars Database v1.5 (J17, PR #817).
- **Nothing is in flight.** No Builder round is running and no PR is open.
- **New General rules in the PCF, binding on every session:**
  - "Keep working, never idle" (also in `CLAUDE.md`).
  - URGENT/NOW first, dimmed is not ignored.
  - An hourly status (monitor) line with Sydney time.
  - The work-design rule "space and elegance" (14 Oct): calm and tidy, nothing crowded, nothing wasted, lines aligned,
    extra detail one tap away. Look at the screenshots in review.
- **The Project Chief Architect (PCA) session** coordinates through `PCA ▸` lines in the PCF and cross-session
  messages. Act on them within the brief; verify the Owner's own words in the PCF (comments by "You").
- **Waiting on the Owner (tick boxes in the PCF):**
  - J26 Q5: should Know Your Status list the two new items (A, one calm line under each Approach's tiles) or not (B)?
  - J22: remove Tawakkul's Bismillah row with ×, and try saving for everyone.
  - J24: add the Bangla Approach-list heading in the Catalogue.
  - J03 Q1: which keys to add.
  - J20: paste Approach 1's line into the Catalogue.
  - Older: J02, J05, J06, J07 (Upgrade by about 6 Jan 2027).
- **Next for the Architect:**
  - J25, Zab inside QuranRevival: write the plan once the SIY Architect's "how Zab is built" guide (SIY J02) exists;
    the PCA was asked for it.
  - Otherwise the standing rule applies: audit the app feature by feature (the PCF User Manual is the checklist, J19;
    it is current to v10.44) on phone, tablet and desktop, and file each defect as a PCF job.
- **Review lessons from this session:**
  - Builder rounds #812–#814 each needed one stale check updated in place. The one in `ayah-action-sheet-boundary`
    sat red on `main` from v10.42 until v10.44: run the `ayah-*` suites too when the Word Card's header changes.
  - Re-run the touched suites after merging `main` into a round that touches `quranrevival.html`.

## LATEST UPDATE — 13 Oct 2026, session `session_019dnykSt8zmrCun2mLZKysQ` (v10.28 → v10.39) — READ THIS FIRST

- **`main` is v10.39** (read it off `app/js/version.js`). This session released v10.29–v10.39 and merged PRs #777–#803;
  decisions 107–110 are recorded. The release list is in section 5 below; `CHANGELOG.md` has every account.
- **The PCF's General rule "Programme Lead" binds every MMSA session** (the Owner, 12 Oct): read the PCF first, act on
  any "PL ▸" line before other work and reply under it, clear a 📣 Notify flag. It is also an MMSA project rule.
- **Anything you need from the Owner goes in the job's "What I need from you" list as a tick box, never only in
  Comments** (the Owner could not see a J15 request that sat in Comments).
- **Nothing is in flight.** No Builder round is running and no PR is open.
- **Waiting on the Owner (tick boxes in the PCF):**
  - **J15:** "copy the Rules". The Owner published the guardian Rules
    (`docs/governance/2026-10-12-guardian-roster-candidate.rules` = live file + one rule). Copying them into
    `firestore.rules` is a protected step: this session's tooling refused it without the Owner's explicit word. On
    the tick, copy them and update `tools/firestore-emulator/roster-access.rules.test.mjs` to test the live file with
    the guardian rule (plus a mutation that removes it), then run `npm run roster-access`.
  - **J23:** the inherited-Achieved press (A this place only, needs a Rules step for the totals counters; B change the
    other mark; C as now), and the new Word card layout (A/B/C, mock-ups at
    https://claude.ai/artifact/P872EWyvP3z2Btt2q16Gcp, also `docs/reference/2026-10-13-word-card-layout-mockups.html`).
  - **J20:** paste Approach 1's line into the Catalogue (the template carries it since v10.39; the tenant's copy does not).
  - **J22:** Tawakkul's Bismillah row: the Owner removes it with × (choice A). Try saving for everyone (v10.38).
  - Older: J02 (the 2:228 demo, Scholars drafts), J17, J03 Q1, J05, J06, J07 (Upgrade by about 6 Jan 2027).
- **Architect's own, ready to do:**
  - **Scholars Database v1.4** is built on branch `scholars-v14` (commit 6c0b51b5, not merged): all 68 scholars with
    birth/death AH+CE, political authority, madhab, and a written date for every book (137; 125 estimates, all drafts).
    To ship: merge it, then publish `docs/reference/scholars-database/Scholars Database - v1.4.html` to
    https://claude.ai/artifact/51ACYVU6hBKs7jx32rpAUi after reading the WHOLE file (about 60k tokens; read it in
    parts, it is one long data line). Ask the Owner the one open question in `v1.4-changes.md` (al-Arnāʾūṭ's book).
  - The Read bar at 320/360px with a wide phone font is still two rows (v10.37); one row there needs a layout choice.
  - `match_wikt.py` was not re-run (it needs the kaikki download); other "form of" pointers may hide wrong matches.
  - `quran-word-card-integration.mjs` (fixed in #802) still THROWS on a failed binding instead of counting a FAIL.

## 0. Where things stand

**The Owner now reads and answers in the Project Control File (PCF):** https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ,
section **`mmsa`**. It is one live page shared by all the Owner's projects (MMSA, Siyagah, Basheera Wa Nazeera).
`CLAUDE.md`'s PERMANENT RULE says how to use it. **Read it first and update it last, every session.** When this was
written it held 14 jobs (J01–J14), 4 guides (G01–G04) and 17 project rules. Nothing in it was marked New, and the inbox
was empty. The status board (#159) and the handovers carry on as before; the PCF is where the Owner looks.

- **`main` is at v10.28.** Read the live number off `app/js/version.js`.
- **Nothing is in flight.** No Builder round is running and no PR is open.
- **This session's releases** (all merged, all served by GitHub Pages):
  - **v10.25:** Al-Fātiḥah's āyah count in the Āyah card's Full text (Bismillah is not āyah 1 there); مَشْهُود joins
    the witness meaning group (Owner's screenshots).
  - **v10.26:** the ⋮ "has a note" mark is kept for every āyah the ⋮ sheet looked up this session.
  - **v10.27:** 🔖 on the Mushaf bar; the Meaning switches moved up onto the Read bar; the Asma Name bar's "◂ Wheel"
    (decision 102, option 2; `asma-quick-class` 5c green).
  - **v10.28:** the Word card's Intermediate tab: four levels, WbW · Basic · Intermediate · Depth (decisions 101, 103).
    **The Owner published the Rules** that let `intermediate` be written.
- **Test-, data- and governance-only merges** (no version):
  - PR #772, #773: the PCF rule in `CLAUDE.md`.
  - PR #774: `npm run lemma-levels` (Firestore emulator) now tests the live Rules. It was stale since its candidate was
    published. Proven: live 1/0; live with basic+depth removed 0/1; the old candidate 1/0.
  - PR #775: the Owner's **Scholars Database**: v1.1 kept as sent; v1.2 with 4 new columns and 48 scholars, drafted by
    Claude for the Owner to check. Folder: `docs/reference/scholars-database/`. Live page:
    https://claude.ai/artifact/51ACYVU6hBKs7jx32rpAUi. It saves itself (✎ Edit, ✓ Checked, Save → v1.3 …). **Read it
    before building on it, and take its saved `<script id="data">` JSON back into the repo**; see the folder's
    README.
- **Decisions 104–106** (12 Oct, answered in the PCF) are in `docs/governance/2026-09-27-owner-decisions.md`:
  - 104: one PCF section; the three proposed rules kept; the first PCF deleted.
  - 105: the scholars, T20–T22. Build a database by era on the Owner's own. Claude drafts and the Owner edits. The
    scholars stay locked for an āyah until the reader has written their own understanding. A demo comes first.
  - 106: Asma screensaver defaults confirmed.

## 1. What waits on the Owner (keep reminding, decision 102)

All of these are on the PCF's **Your turn** list, one line each, and must stay in every report until decided:

1. **J02:** check the Scholars Database v1.2 drafts (filter "Drafts to check"; ✓ Checked; Save).
2. **J03:** Keys to Understanding, the 6 questions, now written out in J03 itself.
3. **J05:** the Ten Steps tab's pending items T9–T15 (master file, Ten Steps tab).
4. **J06:** HadeethEnc permission, and yes or no to the permanent key `hadith:openiti:<book>:<n>` (decision 90).
5. **J07:** Google Cloud: click **Upgrade** before about **6 Jan 2027**.
6. **Parked** (J08, J09, J11–J13): QuranRevival standalone store app; the QR ↔ MMSA integration map; Al-Munshiʾ
   Arabic, Letters, the family sign-up step; the Mastery Wheel per Study Unit; D14 timezone.

## 2. The next job (needs nothing from the Owner)

**J02 step 2: the demo** on one āyah of rulings, **2:228**, across the 13 scholar Approaches (28 Sahaba, 29 Tābiʿīn,
30 Gen1 … Gen6, 32–35 the madhabs, 36 groups and sects), by era. Its Scholars panel stays **locked until the reader
has written their own understanding** of the āyah (decision 105). Sources and method are in the master file's
"Connecting an āyah to the Scholars' Approaches" section and its Approach Map "Connect an āyah" column
(https://claude.ai/artifact/BJUwQ8hfgnu4FJFo7stqY1). Use the Scholars Database rows for each book's author, era and
madhab. Show the scholars' own words, never an AI summary, and mark every passage with its book and source. **This
sandbox cannot reach `api.quran.com`.** Try the open tafsir data on cdn.jsdelivr.net (`spa5k/tafsir_api`) and
OpenITI, and say plainly which passages could not be fetched. Build nothing in the app until the Owner OKs the demo.

## 3. Sandbox lessons from this session

- **A Firestore emulator run that is killed leaves Java holding the port**, and the next run says "port taken". Stop
  it with `pkill -f cloud-firestore-emulator` before re-running.
- **A release PR's `verify` is red before merge by design**: programme-ledger, -mutations and brief-integrity read
  `origin/main`. Run the other suites locally, then merge with a merge commit and `expectedHeadSha` (the full 40-char
  SHA).
- **The PCF and the Scholars Database are artifacts that save themselves.** Always read before you write. In the PCF,
  pin every write with `if_version` and never write `layout`.
- The 11 Oct handover's sandbox lessons still hold: unshallow `main`; fetch the two held branches; symlink
  `playwright`; restart `node serve.js` after a container restart.

## 4. Routines on this account (leave them alone)

- **"PCF check – all projects"**: every 4 hours, Sydney time. Created by the Owner's other session; it acknowledges
  new PCF items.
- **"Siyagah PCF check"**: Siyagah's own.
- **"Monthly PLANS reminder"**.
- **"MMSA Task Bridge"**.

This session's own MMSA-only PCF check was deleted, with the first PCF, on the Owner's word (J01).
- **v10.29** (2026-10-12): student accounts can open the app (the roster read every page makes).
- **v10.30** (2026-10-12): the Read bar is one line again at 600-679px.
- **v10.31** (2026-10-12): a QCR āyah opens in the Read view, with Back to QCR.
- **v10.32** (2026-10-12): Keys Round 1: related hadith on the Āyah card, and the āyāt a hadith quotes.
- **v10.33** (2026-10-12): bookmarks for children show who they were saved for; a unit choice in Bookmark this.
- **v10.34** (2026-10-12): the Bookmarks page's + New bookmark files an Owner's folder by name for a child (Builder round #789).
- **v10.35** (2026-10-12): a bookmark save keeps the Mushaf page; QCR + Add āyah follows the Al-Fātiḥah count (issue #786).
- **v10.36** (2026-10-12): the Mushaf page reference shows from the first page, so a bookmark save no longer grows the Read bar (Builder round #792).
- **v10.37** (2026-10-12): the Read bar stays one row with the Meaning switches on a phone (Builder round #794).
- **v10.38** (2026-10-12): bookmarks for several people at once keep their folder, and tapping an existing bookmark asks before removing it (Builder round #797, PCF J22).
- **v10.39** (2026-10-12): Word card: the stem box always has a meaning and the wrong dictionary meanings are gone; Approach 1's self-learning line, with links in Approach guides (PCF J23, J20).
- **v10.40** (2026-10-13): a dragged landing wheel no longer hides Wheel / Legend / Unit on a phone (PCF J24).
- **v10.41** (2026-10-13): the Word card's level totals as one sentence each, layout B (PCF J23).
- **v10.42** (2026-10-14): the top of the Word card in layout B (PCF J23).
- **v10.43** (2026-10-14): J23 mark choice B: ask before changing the other mark.
- **v10.44** (2026-10-14): J26 Before Al-Fatihah band.
- **v10.45** (2026-10-14): Zab Z1: saving layer and Rules candidate.
- **v10.46** (2026-10-14): Zab Z2: the bar and plain pockets (gated).
- **v10.47** (2026-10-14): Zab Z3: tasks and links (gated).
- **v10.48** (2026-10-14): Zab Z4: ideas and shopping (gated).
- **v10.49** (2026-10-14): Zab Z5: to Note (gated).
- **v10.50** (2026-10-14): Zab Z6: pockets inside pockets (gated).
- **v10.51** (2026-10-14): Audit: Qur'an face in Bangla and on word chips.
- **v10.52** (2026-10-14): Keys K2: saving layer and Rules candidate.
- **v10.53** (2026-10-14): Audit part 1, fixes 3-9 (J29).
- **v10.54** (2026-10-14): Audit part 2 (J29).
- **v10.55** (2026-10-14): Zab switched on (J25).
- **v10.56** (2026-10-15): Arabic boxes in Meanings of this word (J23).
- **v10.57** (2026-10-15): audit part 3, 40px touch targets on the admin and study pages (PCF J29).
- **v10.58** (2026-10-15): audit part 4, room for the Zab button on phones, 40px menu links (PCF J29).
- **v10.59** (2026-10-15): the Zab button moves into the Wheel / Legend / Unit row on a phone (PCF J25).
- **v10.60** (2026-10-15): audit part 5, finger-sized controls on the remaining pages (PCF J29).
- **v10.61** (2026-10-15): Know Your Status shows Before Al-Fatihah under each Approach (PCF J26).
- **v10.62** (2026-10-15): audit part 6, finger-sized buttons on the Quran page (PCF J29).
- **v10.63** (2026-10-15): the Back to Know Your Status pill no longer covers the Approach tab (PCF J29).
- **v10.64** (2026-10-15): finger-sized controls in QCR collections and on the Trash page (J29 audit part 8, PR #859).
- **v10.65** (2026-10-15): the QCR āyah-number badge shows the whole reference (J29 audit part 9, PR #861).
- **v10.66** (2026-10-15): the wheel pill sits inside the centre circle again on a small phone (J29 item 16).
- **v10.67** (2026-10-15): wheel labels no longer cut at the wheel's edge (J29 audit part 10, round #863).
- **v10.68** (2026-10-15): the Read view's ⋯ tools panel stays on a small phone's screen (J29 audit part 11, PR #867).
- **v11.00** (2026-10-15): the app is now QuranRevival: General Study, Nature-Life, Life Skill and Health hidden, not deleted (J30, QR Stage 1; opens the v11 line).
- **v11.01** (2026-10-15): the Āyah card fits a phone's screen; the Word card opens below the nav row (J29 audit part 12, round #870).
- **v11.02** (2026-10-15): audit part 13: the 👥 list and the Approach card's tabs stay on a phone's screen (PCF J29, round #872).
- **v11.03** (2026-10-15): the Monitor's week label names its days plainly, on the right day everywhere (Architect, from audit part 13).
- **v11.04** (2026-10-15): audit part 14: Explore works end to end; its window clears the bottom bar (PCF J29, round #875).
- **v11.05** (2026-10-15): Legacy App - v10: the v10.68 release archived at /legacy-v10/ (PCF MMSA J32).
- **v11.06** (2026-10-15): audit part 16: Hadith and Dua work end to end; a long narration opens at its top; Back to Dua stays on screen (PCF J29, round #881).
- **v11.07** (2026-10-16): Explore Word by Word scrolls itself, so Study this Surah is never under the bottom bar (QR J02 S1).
- **v11.08** (2026-10-16): audit part 18: getting started, Deen Study and Arabic work end to end; finger-sized controls; topic status in Bangla (PCF J29, round #886).
- **v11.09** (2026-10-16): audit part 19: Notes and Mapping My Journey (first half) work end to end; a folder's menu clears the Zab bar (PCF J29, round #888).
- **v11.10** (2026-10-16): OpenITI credited on the About page and under the Ayah card's related hadith (PCA, QR J02 S1c).
- **v11.11** (2026-10-16): Asma: Name 112 Al-Maalik shows its own Arabic, not Al-Maleek's (PCA must-fix).
- **v11.12** (2026-10-16): the Read bar's way back shares a line on a small phone; journey-s9 and journey-folder-menus green (round #891).
- **v11.13** (2026-10-16): audit part 20: Favourites, Archived, Trash and the Evernote import work; no dead ⋯ on the Read bar (round #894).
- **v11.14** (2026-10-16): the bookmark dialog can bookmark a range of ayat (PCA J76, for QR J03).
- **v11.15** (2026-10-16): audit part 21: every Notes feature checked; pop-up windows clear the nav row and bottom bars; My Notes history; the MSA name (round #897).
- **v11.16** (2026-10-16): audit part 22: loading speed measured; Hadith collections draws without waiting for sign-in code (round #900).
- **v11.17** (2026-10-16): audit part 23: Bookmarks and Zab work end to end; New bookmark's Unit picker no longer throws (round #902).
- **v11.18** (2026-10-16): audit part 25: the Continue strip keeps the way back; hidden modules no longer use up its five places (round #907).
- **v11.19** (2026-10-16): audit part 26: Topic study works end to end; 40px sheet tabs; Breakdown note in Bangla (round #909).
- **v11.20** (2026-10-16): audit part 27: the smallest phone with real-length names (Notes, Journey, Bookmarks, Zab) (round #913).
- **v11.21** (2026-10-16): audit part 28: Note windows, Bookmark menu and dialog, Zab → Note on the smallest phone; J33 bigger Word card percentage (QR J04) (round #915).
- **v11.22** (2026-10-16): audit part 29: small-phone pass finished (Note window menu, bookmark dialog on a short phone, menus part-way down) (round #918).
- **v11.23** (2026-10-16): audit part 30: tablets with real-length content; Note window titles wrap in every window (round #920).
- **v11.24** (2026-10-17): audit part 31: screen-reader names in Bangla and English; Dua cards on tablets (round #922).
- **v11.25** (2026-10-17): audit part 32: Tab stays inside dialogs; focus returns on close (round #925).
- **v11.26** (2026-10-17): audit part 33: Tab clears the Zab bar and corner; keyboard focus checked (round #928).
- **v11.27** (2026-10-17): audit part 34: wider text spacing fits a 320px screen; Hadith Arabic marked lang=ar (PCF MSA J29).
- **v11.28** (2026-10-17): the main page renamed Madrasah Study App (MSA) (PCF MSA J36).
- **v11.29** (2026-10-17): a focused button at the edge of the People and Catalogue tables comes fully into view at 320px (PCF MSA J29 j29p33).
- **v11.30** (2026-10-17): letter writing practice in the writing window (PCF MSA J35 = QR J12).
- **v11.31** (2026-10-17): Blank lines example like Trace over, light or dark (J34).
- **v11.32** (2026-10-17): every page tab reads MSA (J36).
- **v11.33** (2026-10-17): audit part 36 colour contrast (J29).
- **v11.34** (2026-10-17): audit part 37 contrast in opened windows (J29).
- **v11.35** (2026-10-17): the 📜 Mushaf button on the Read bar (J37).
- **v11.36** (2026-10-17): audit part 38 landscape, zoom, reduced motion (J29).
- **v11.37** (2026-10-17): audit part 39 opened windows on short screens (J29).
- **v11.39** (2026-10-18): QR built from the MSA source, the switch (PCA J110 step 5).
- **v12.01** (2026-10-19): the Word card's five levels (WbW, Root, Family, Taṣrīf, Depth), PCF MSA J38+J39; opens the v12 line (v12.00 unused; v11 archived as legacy-v11).
- **v12.02** (2026-10-19): Bookmark for the whole family, and a choice of unit also on Single Ayah (PCF MSA J42).
- **v12.03** (2026-10-19): Learn next: the Qur'an's words in order of how often they occur (PCF MSA J40).
- **v12.04** (2026-10-19): Word card polish: bigger word-by-word text, the ⓘ Legend balloon, Family buttons like the main ones (PCF MSA J43).
- **v12.05** (2026-10-19): Taṣrīf for nouns, the Mastery Wheel big on a PC, Family's meanings side by side, Taṣrīf's tense toggle, Learn next steps (PCF MSA J41 J44 J45 J46 J47).
- **v12.06** (2026-10-20): Before Al-Fātiḥah reads right to left (PCF MSA J49).
- **v12.07** (2026-10-20): Know Your Status and Explore, bigger on a PC (PCF MSA J50 J51).
- **v12.08** (2026-10-20): the Qur'an Vocabulary module, round 1 (PCF MSA J48).
- **v12.09** (2026-10-20): Āyah posters, the madda sign, the word marked and the middle view, Learn next to 95%, ten questions (PCF MSA J52 J53 J54 J55 J56).
- **v12.10** (2026-10-20): the Vocabulary review schedule kept in the account (PCF MSA J48 round 2).
- **v12.11** (2026-10-21): Word card: Go to its āyah (PCF MSA J57).
- **v12.12** (2026-10-21): Word card: the Legend is a small ⓘ in the top bar (PCF MSA J59).
- **v12.13** (2026-10-21): Bangla transliteration everywhere and the one-line poster menu (PCF MSA J58).
- **v12.14** (2026-10-21): Word card Family rows and plates, WbW always coloured; Taṣrīf Arabic at 90%; QCR Level (PCF MSA J60 J61 J62).
- **v12.15** (2026-10-21): QR's offline lists carry the Bangla transliteration module.
- **v12.16** (2026-10-21): MSA J61 part 2a, J63, J65, J66, J68 parts 1-3.
- **v12.17** (2026-10-21): MSA J67, J66 part 2, J61 part 2b.
- **v12.18** (2026-10-21): MSA J68 part 4.
- **v12.19** (2026-10-21): MSA J69, J70.
- **v12.20** (2026-10-21): J71 J72 J73 (Notes from the Āyah card; pop-ups one size, every edge, ← Back; Vocabulary buttons).
- **v12.21** (2026-10-22): J74 J75 (menu pages as windows; Meaning flow one row on a phone).
- **v12.22** (2026-10-22): MSA J48 round 3 (Vocabulary Wheel).
- **v12.23** (2026-10-22): MSA J72 sweep part 2 (Track window, Asma posters at the home size).
- **v12.24** (2026-10-22): the Word card reads its word's own surah (audit-part15's error).
- **v12.25** (2026-10-22): the Āyah card's tabs, the Note buttons, a minimise button on every pop-up, Hadith's notice.
- **v12.26** (2026-10-23): Every Note opens in the Mapping My Journey window; Learn next, Bookmark way back, Mushaf page buttons.
- **v12.27** (2026-10-23): The Mapping My Journey window opened on a Note is the note window; tidy formatting rows.
- **v12.28** (2026-10-23): audit part 41: no Zab inside embedded windows; lazily loaded files kept offline.
- **v12.29** (2026-10-23): Language first in Home (MSA and QR); audit part 42; A± sliders below their tile.
- **v12.30** (2026-10-23): audit part 43: the tool and admin pages.
- **v12.31** (2026-10-23): audit part 44: QR as a student; Language for a signed-out reader.
- **v12.32** (2026-10-23): QR Lead J84: Mushaf ‹ › one page, whole pages, one Read.
- **v12.33** (2026-10-23): audit part 45: Bookmark menu fills on four shared pages; three student fixes.
- **v12.34** (2026-10-23): QR language switch in place; Word card way back in its top row; audit part 46.
- **v12.35** (2026-10-23): sign-in helper pages on both sites (switch off); a tap-size detector fix.
- **v12.36** (2026-10-23): audit part 47 (shared parts follow QR's language switch) and the QR Lead's J87.
- **v12.37** (2026-10-23): audit 47's QR findings (Āyah card, Notes pane label, Bookmark popover) and relabelReadNotePane.
- **v12.38** (2026-10-23): audit part 48 part 2 (Zab bar and worker install wait for the page).
- **v12.39** (2026-10-23): audit part 50 part 1 (QR modulepreload).
- **v12.40** (2026-10-23): the QR Lead's surah warm + page icon (#1081).
- **v12.41** (2026-10-23): audit part 51 (My Notes and Mapping My Journey load speed).
- **v12.42** (2026-10-23): the QR Lead's comment strip in QR's build (#1085).
- **v12.43** (2026-10-23): audit part 52 (Journey and tool pages start-up reads together).
- **v12.44** (2026-10-23): audit part 53, worker refreshes wait for a quiet page.
- **v12.45** (2026-10-23): QR's own address opens offline (QR Lead round 9).
- **v12.46** (2026-10-23): audit part 54, study modules and teaching pages by the User Manual.
- **v12.47** (2026-10-23): tablet Read bar: Study menu, whole surah name (QR Lead round 10).
- **v12.48** (2026-10-23): audit part 56, getting started and Bookmarks by the User Manual.
- **v12.49** (2026-10-23): audit part 57, Records, Monitor and Homework by the User Manual.
- **v12.50** (2026-10-23): audit part 60: Notes pages; history rows in words.
- **v12.51** (2026-10-23): audit part 62: Classes / Course Offers note for non-admins.
- **v12.52** (2026-10-24): audit part 64: a way back on accept-invite and onboarding.
- **v12.53** (2026-10-24): audit part 65: Catalogue / Curriculum names keyed by language; refusals in words.
- **v12.54** (2026-10-24): audit part 67: menu bar and report tables under text spacing and zoom.
- **v12.55** (2026-10-24): audit parts 1 and 10: Āyah card heading and wheel number labels whole again.
- **v12.56** (2026-10-24): audit parts 73-77: the Zab bar no longer moves the bottom bar on a computer.
- **v12.57** (2026-10-24): the sign-up page way back (audit part 84).
- **v12.58** (2026-10-24): the Mushaf tap and the Word card rows at 320 (audit parts 78-80).
- **v12.59** (2026-10-24): the shared pages measured with real-length names (audit parts 85-86).
- **v12.60** (2026-10-24): the account card name and roles, and the topic bookmark choice (audit part 87).
- **v12.61** (2026-10-25): Bangla audio plays each āyah as its own exact clip (J95).
