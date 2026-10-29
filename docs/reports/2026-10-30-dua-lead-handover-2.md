# MSA-DUA Lead: session handover 2 (30 Oct 2026, 8:51 am Sydney)

From session `session_01PL2xbLaMEAbLywBsaANXPa` to the next MSA-DUA Lead session. Handed over at about 40% context
(cost86). **Nothing is running**: no test, no build, no Builder round. Supersedes `2026-10-30-dua-lead-handover.md`
(kept as history; its "Read first" list still holds).

## Read first

1. `CLAUDE.md` block "DUA MODULE — plan and rules", `docs/governance/dua-module-plan.md` (rules dua130/dua131, builds
   D01–D22, rounds R1–R8; merged to `main` in PR #1330).
2. `docs/reports/2026-10-30-dua-r1-build.md` (on branch `claude/dua-r1` until released): how the Dua page works.
3. The PMS https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ: `meta/global` rules (lead120, cost76, cost86, rec118,
   hand119, name126, saw128, mydb128, win130), `p/mmsa` rules dua130/dua131, **job J104** (version 12 after this
   session; Done line j104d2 = R1).

## Who is who (8:51 am 30 Oct)

- **MSA Master Architect: `session_01PL2xbMR1BT69RwFBnBc2w9`** (new; the old `session_01PL2xbMaCZwSEbt5HMEpqMN` handed over).
- PCA: `session_01PL2xbLtbpz1UznbKURDuvi`.

## State

- **R1 (D19, D01, D21, D02, D04) is built and handed in**: branch `claude/dua-r1`, head `c5ecebcc`. The Architect is
  reviewing it, added the shared parts itself (Modules menu entry "Dua Study" in `nav.js`; a "Dua Study ↗" link in
  Hadith Study's Dua tab, `dua-browser.js` renderDua + `.dua-study-link` in `hadith.css`; `sw.js` needs nothing) and
  plans to release **Builder part 133 as v12.125, then R1 as v12.126**.
- Measured for R1: `dua-study-page-browser.mjs` 132/0 and `--mutate=all` 7/7 caught; `dua-tab-browser` 63/0;
  `dua-load-failed-browser` 42/0; `unchecked-pages-screen-audit-browser` 963/0; `apps-build-check` 48/0.
- Owner messages this session: none (the session ran on the opening brief only). carry1: nothing open beyond J104 ticks.

## Open

- **J104 ticks 6–9 wait on the Owner** (6 Sahaba/Salaf/Ulama sources, 7 audio, 8 memorising marks, 9 Rules change).
- A Hisn al-Muslim dhikr with no tied Dua card has no progress row: progress is per Dua card (`dua:<n>`); permanent keys
  for Hisn adhkār are an Owner Control Gate, to raise when R6 comes up.

## The next job: build round R2 (Owner-approved), AFTER v12.126 is on `main`

Branch from `main` only once R1 is released (v12.126), so the Architect's shared edits are carried. D22 + D11 + D12 +
D05, Dua-owned files (`dua-study.js`, `dua-study.css`, `dua-groups.mjs`/`groups.json`, Dua strings in `bn.js`):

- **D22**: on the Dua Card only the progress block and (later) the listening buttons stay open; every other block
  (meaning/translations, source/narrations, the whole narration, ✓ Check, notes/bookmark row if the Owner's demo puts it
  there) opens from the card's menu as a pop-up card with ✕ back to the Dua. Demo v1.04 is the target
  (`docs/reference/dua-demo/`, `body.html` `openCard`/`popCard`). `duaCard()` in `dua-browser.js` is shared with
  Hadith Study's Dua tab: do the re-layout in `dua-study.js` around it (or with an option the Hadith tab does not pass),
  and keep `dua-tab-browser.mjs` green.
- **D11**: the Asma ul Husna poster's bottom banner (cut from `docs/reference/2026-10-07-asma-poster-template-al-witr.png`,
  box 48,1212–1008,1450, as `prep2.py` did) as a Dua-owned image file, under every Dua Card.
- **D12**: a top banner frame ("بِسْمِ ٱللَّهِ" and "Top banner · text to come"), the Owner's text later.
- **D05**: a title for every Dua, English and Bangla, written in `groups.json` until D03 can save them (Prophets have
  titles already; Hisn items can take HadeethEnc titles where short, as the demo did).
- A browser suite with mutations, as R1's. Hand in to the MSA Architect as "MSA-DUA LEAD ▸ ready for release".

## Sandbox notes

- `node_modules` is not in the repository: `ln -s /opt/node-tools/node_modules node_modules` (git-ignored) before any
  browser suite, and start `node serve.js` (port 8080).
- Run suites from the repository root. `bn-duplicate-keys.mjs` ends with a git error on this shallow clone after its
  two checks pass; the checks are what count.

## Opening message for the next MSA-DUA Lead session

> Bismillah. You are the MSA-DUA Lead (the Dua module's Module Lead in MSA), taking over from session
> session_01PL2xbLaMEAbLywBsaANXPa. Read, in order: CLAUDE.md (block "DUA MODULE — plan and rules"),
> docs/governance/dua-module-plan.md, docs/reports/2026-10-30-dua-lead-handover-2.md (if not yet on main, it is on
> branch claude/dua-lead-handover-3), and the PMS https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ with the
> ArtifactData tool: meta/global General rules (lead120, cost76, cost86, rec118, hand119, name126, saw128, mydb128,
> win130), p/mmsa rules dua130 and dua131, and job J104. Write only under p/mmsa, pin every write with if_version, full
> UTC `at`, Sydney times for people. You touch only Dua files on your own branch, never dispatch Builders, never
> release: hand each finished round to the MSA Master Architect (session_01PL2xbMR1BT69RwFBnBc2w9) as "MSA-DUA LEAD ▸
> ready for release". R1 is handed in (claude/dua-r1, to be released as v12.126). Next: build round R2 (D22, D11, D12,
> D05, described in the handover), branched from main AFTER v12.126 lands. Report each build by its D number; demos
> numbered upward (next v1.05), always openable in their own window. J104 ticks 6–9 still wait on the Owner. cost86: no
> self wake-ups; hand over at about 40% context. When read in, send the PCA (session_01PL2xbLtbpz1UznbKURDuvi)
> "PCA ▸ taken over" and the MSA Architect a one-line note.
