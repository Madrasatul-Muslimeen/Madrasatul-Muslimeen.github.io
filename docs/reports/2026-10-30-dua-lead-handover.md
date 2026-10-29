# MSA-DUA Lead: session handover (30 Oct 2026, 7:55 am Sydney)

From session `session_01PL2xbKP72HWprM8HCvkdD2` (opened 28 Oct 2026 by the PCA) to the next MSA-DUA Lead session.
Handed over because this session passed about 40% of its context (cost86). **Nothing is running**: no test, no build,
no Builder round. The next job, build round R1, has not started.

## Read first

1. `CLAUDE.md` (the block "DUA MODULE — plan and rules") and `docs/governance/dua-module-plan.md`: the Owner's rules
   (dua130 demo first, gradual demo numbers, numbered builds; dua131 every demo opens in its own window), builds D01–D22
   and rounds R1–R8.
2. The PMS (https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ): `meta/global` General rules (lead120, cost76, cost86,
   rec118, hand119, name126, saw128 "after Rasulullah always Sallallahu A'laihi Wa Sallam", mydb128, win130 "every demo opens in its own window", made General from dua131 on 30 Oct), `p/mmsa` rules
   dua130 and dua131, and **job J104** (the Dua module: plan, answers, ticks, Done lines).
3. `docs/reference/dua-demo/README.md`: how the demo is made and republished.

## Who is who (session ids as of 30 Oct 2026, 7:55 am)

- MSA Master Architect: `session_01PL2xbMaCZwSEbt5HMEpqMN` (reviews, merges, releases; owns every shared part).
- PCA: `session_01PL2xbLtbpz1UznbKURDuvi`. Hadith Lead: `session_01Q2HmCeWjo1vVYV5kgMBvC9`. QR Lead: `session_01P9kXNhunapXY6K3Snj7nt8`.
- Message them with the claude-code-remote `send_message` tool. Sessions move: a "moved to a new session" message gives the new id.

## Every Owner message in this session, and what was done (carry1)

| When (Sydney) | The Owner said | Done |
|---|---|---|
| 28 Oct (the PCA's opening brief) | "Don't build or assign anything. Discuss first. Then Demo, approved, then build." | J104 written: what Dua has, what it could be, 4 tick questions |
| 28 Oct, 8:05 pm | "J104: 1.A 2.C 3.All 4.Not required now. Build first." | Recorded in J104 (own Dua page; occasions on top and full list below; all four contents; no letters now). Demo v1.01 |
| 30 Oct, about 7 am | The seven groups menu bar, numbering, add/move/several groups/delete, Dua Card, titles, QR bookmark, A4 poster with Arabic/English/Bangla/WbW, Word Card links, the Dua's own word card, memorising plan marks with colours, the Asma ul Husna bottom banner, a top banner frame, screensaver alone and with Asma ul Husna, copy/share with who/where/occasion tracking, audio options, audio buttons with loop and repeat, repeating a part. "Prepare Demo, give me build plan and get approval before building. Always maintain gradual version numbers in Demo. Report me each build asked for by number. Keep the building plan and the rule in Project memory as well as in PMS." | Demo v1.02; builds D01–D20; rule dua130 in the PMS and in `docs/governance/dua-module-plan.md` (merged, PR #1326, with the CLAUDE.md pointer by the MSA Architect). Audio options researched (plan file, "Audio options found"). J104 ticks 5–9 asked |
| 30 Oct, 7:38 am | "Enable the demo to be opened in a separate window always. Rule." | Demo v1.03 with "↗ Open in its own window"; rule dua131 in the PMS and plan file rule 4; the PCA told (it may make it a General rule) |
| 30 Oct, about 7:45 am | "Place Dua groups as pull-down menu. Same is for sub-groups. Except the progress block, and the listening buttons all other blocks should be in the menu pop-ups as card. Plan me and start build." | Demo v1.04 (D21 pull-down menus, D22 card menu with pop-up cards); build rounds R1–R8 in the plan file; J104 updated. **Build round R1 is the next job, not started**: this session handed over first |

Also done, not from the Owner: the MSA Architect's audit part 130 F2 (offline the Dua tab showed "Failed to fetch"):
fixed in `app/js/dua-browser.js` with `tools/i18n-verify/dua-load-failed-browser.mjs` (42/0, fails against the old
code), released in v12.120.

## Open, carried to the next session

- **J104 ticks 6–9 wait on the Owner**: 6 Sahaba/Salaf/Ulama sources, 7 audio, 8 memorising marks scope, 9 the Rules
  change for D03/D05/D10/D15. Tick 5 (approve the plan) is answered by "Plan me and start build" with D21 and D22 added.
- **Branch `claude/dua-lead-plan-2`** (docs only: plan rule 4, demo v1.03 and v1.04, D21, D22, rounds R1–R8, the demo
  sources in `docs/reference/dua-demo/`, this handover): for the MSA Architect to merge.
- **The wording item j104q1 (D20)**: Dua save messages still show the raw error (`dua-browser.js` "Not saved: {why}",
  `dua-check.js:331`); round R4.

## The next job: build round R1 (Owner-approved)

D19 + D01 + D21 + D02 + D04, on a new branch from `main`, Dua-owned files only:

1. A Dua-owned script (for example `tools/hadith-data-pull/dua-groups.mjs`) writes
   `tools/hadith-data-pull/output/dua/groups.json`: the seven groups with numbered members, from data already in the
   repository (the 3,126 Dua cards; their books; the Qur'anic duas of the Prophets as āyah references) plus Hisn
   al-Muslim's 133 chapters in 15 occasion groups (the grouping in `docs/reference/dua-demo/prep1.py`), each Hisn
   item tied to a Dua card only where the match is strong, and every tie marked "to be checked". Credit asellam/
   HisnElMuslim (MIT) in the file. Do not move or rename any existing file under `output/dua/` (QR reads Hadith data).
2. `app/dua-study.html`: the Dua page, the same shell as `app/hadith-study.html`, with the two pull-down menus
   (groups, and the group's parts), numbered lists, and each Dua opening its Dua Card by mounting
   `app/js/dua-browser.js` (exports `renderDua`). The way back (decision 86) on every jump. English and Bangla (I11);
   Bangla strings only for Dua's own words.
3. A browser suite for the page (phone and computer widths, en and bn, numbers, pull-downs, open and back), proven by
   mutations, plus `dua-tab-browser.mjs` and `dua-load-failed-browser.mjs` still green.
4. Hand in to the MSA Architect ("MSA-DUA LEAD ▸ ready for release", with the measured results). The menu entry,
   `app/apps/*.json`, `hidden-modules.js` and `sw.js` are the Architect's.

Report each build to the Owner by its number (D19, D01, D21, D02, D04).

## Opening message for the next MSA-DUA Lead session

> Bismillah. You are the MSA-DUA Lead (the Dua module's Module Lead in MSA), taking over from session
> session_01PL2xbKP72HWprM8HCvkdD2. Read, in order: CLAUDE.md (block "DUA MODULE — plan and rules"),
> docs/governance/dua-module-plan.md, docs/reports/2026-10-30-dua-lead-handover.md (if not yet on main, it is on
> branch claude/dua-lead-plan-2), and the PMS https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ with the ArtifactData
> tool: meta/global General rules (lead120, cost76, cost86, rec118, hand119, name126, saw128, mydb128, win130), p/mmsa rules
> dua130 and dua131, and job J104. Write only under p/mmsa, pin every write with if_version, full UTC `at`, Sydney
> times for people. You touch only Dua files on your own branch, never dispatch Builders, never release: hand each
> finished round to the MSA Master Architect (session_01PL2xbMaCZwSEbt5HMEpqMN) as "MSA-DUA LEAD ▸ ready for release".
> The Owner approved the plan ("Plan me and start build", 30 Oct, about 7:45 am): start build round R1 now (D19, D01,
> D21, D02, D04, described in the handover), report each build by its D number, keep demos numbered upward (next
> v1.05) and always openable in their own window. J104 ticks 6–9 still wait on the Owner; the builds that need them
> wait, the rest go ahead. cost86: no self wake-ups; hand over at about 40% context. When read in, send the PCA
> (session_01PL2xbLtbpz1UznbKURDuvi) "PCA ▸ taken over" and the MSA Architect a one-line note.
