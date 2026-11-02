# MSA-DUA Lead: session handover 5 (2 Nov 2026, 2:03 pm Sydney)

From session `session_01PL2xbMaXuwbA6usFZSB5kr` to the next MSA-DUA Lead session. Handed over at the Owner's new mark
(General rule **use1102**, 2 Nov 2:01 pm: Leads hand over at about 15% context; the next session opens on Sonnet; no
broadcasts, message only when there is work). Supersedes `2026-10-31-dua-lead-handover-4.md` (kept as history; its
sandbox notes still hold). **Nothing is running locally.**

## Read first

1. `CLAUDE.md` block "DUA MODULE — plan and rules", `docs/governance/dua-module-plan.md` (rules 1–6, D01–D22, R1–R8).
   Rule 6 (new, J109): every show/hide section uses the shared ON/OFF switch, never an arrow; menus keep ▾.
2. The PMS https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ: General rules (lead120, cost76, cost86, rec118, hand119,
   name126, saw128, mydb128, win130, **use1102**), `p/mmsa` rules dua130/dua131, **job J104 (version 29)**.

## Who is who (they move often; the PCA announces each move)

- **MSA Master Architect: `session_01PL2xbKUoZqQEubMNHUR64W`** (since 1:42 pm 2 Nov).
- **PCA: `session_01PL2xbLbJ2UoaKA3tTXpEkq`** (since 1:44 pm 2 Nov).
- Hadith Lead: `session_01PL2xbKWeTSDEBJV5UWZTcQ` (as of 31 Oct).
- Send with the claude-code-remote `send_message` tool (SendMessage does not reach cloud sessions).

## Waiting with the MSA Architect (handed in; NOT merged when this was written; `main` at v13.21)

| Branch | Commit | What | Measured |
|---|---|---|---|
| `claude/dua-way-back-155` | d1060e3 | Audit 155 defects 2+3 (report `docs/reports/2026-11-02-audit-part-155-way-back-hadith-dua.md`): "Dua Study ↗" writes `?view=dua&duaPage&dua` before leaving (`dua-browser.js`); `dua-study.html` mounts `mountBookmarkBack(null)` when there is no `back=1` | way-back-hadith-dua 348/12; the 12 are defects 1 (PCA, Quran Study) and 4 (Hadith Lead); with the fix taken out hc-duapage place/card and arrival bmDua ×4 fail |
| `claude/dua-keyboard-156` | 7af04bd | Audit 156 defects 3+4: `openPop` in `dua-study.js` uses the shared `trapModal`; `closePop` releases it | with 155: hadith-dua-a11y --page=dua 1423/0, large-text-dua-study 1779/0, dua-study-page 137/0, dua-bookmark-route 8/0 |

**One line for the Architect in the shared `app/js/modal-focus.js`** (asked; not the Lead's file): `shown()` counts buttons
inside a CLOSED `<details>` as visible, so Tab escapes the Source pop-up once from its "+16 more" summary. Probed fix:
`... && !e.closest("details:not([open]) > :not(summary)")`. The Architect's `hadith-dua-keyboard-browser.mjs` was not on
`main` yet, so the Lead could not run it; the Architect was asked to run `--page=dua` with all three.

**Next step:** when the PCA or Architect reports a release, check both commits are on `main`
(`git merge-base --is-ancestor <sha> origin/main`) and stamp J104's `act`. If the Architect sends a finding back, fix it on
the same branch (merge `main` in first; force-push is refused here).

## Done this session (all live or merged)

- Dua plan rule 6 (J109 switch) — merged.
- audit-part32 "← Back returns to the same card" updated in place (a stale check since audit 141 H4; focus now returns to the
  ✓ Check button inside the card) — merged in v13.11.

## Open (all wait on the Owner, J104)

Ticks 6 (Sahaba/Salaf/Ulama sources, R8) · 7 (audio source, R5) · 8 (memorising marks, R6) · 9 (Rules change, R6) ·
10 (a dua's own English/Bangla meaning). R7 waits on J105 and the PCA. Build nothing of R5–R8 until ticked.
Not done (noted for later): from the Dua chapters view, ← Back from Dua Study reopens the Duas, not the chapter list
(needs one more parameter read in `hadith-browser.js`, the Hadith Lead's).

## Sandbox notes added this session

- `node serve.js` stops between turns: start it with `nohup … &` before any browser suite.
- A loop like `for s in "suite --opt"` passes one word; run suites one by one.
- Switching branches while a background suite runs makes its result meaningless; test on one local merge of all branches.
- `hadith-dua-a11y-browser.mjs` without `--page=dua` takes over 20 minutes.

## Opening message for the next session

> Bismillah. You are the MSA-DUA Lead, taking over from session session_01PL2xbMaXuwbA6usFZSB5kr. Read, in order: CLAUDE.md
> (block "DUA MODULE — plan and rules"), docs/governance/dua-module-plan.md, docs/reports/2026-11-02-dua-lead-handover-5.md
> (on branch claude/dua-lead-handover-6 if not yet on main), and the PMS https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ
> with the ArtifactData tool: meta/global General rules (lead120, cost76, cost86, rec118, hand119, name126, saw128, mydb128,
> win130, use1102), p/mmsa rules dua130 and dua131, and job J104. Write only under p/mmsa, pin every write with if_version,
> full UTC `at`, Sydney times for people. Touch only Dua files on your own branch from main; never dispatch Builders, never
> release: hand each finished round to the MSA Master Architect (session_01PL2xbKUoZqQEubMNHUR64W, or whoever the PCA names)
> as "MSA-DUA LEAD ▸ ready for release". Two Dua branches wait with the Architect (handover table). R5–R8 wait on J104 ticks
> 6–10. use1102: hand over at about 15% context; no broadcasts. When read in, send the PCA (session_01PL2xbLbJ2UoaKA3tTXpEkq)
> "PCA ▸ taken over".
