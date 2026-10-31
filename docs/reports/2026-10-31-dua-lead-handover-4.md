# MSA-DUA Lead: session handover 4 (31 Oct 2026, 1:20 pm Sydney)

From session `session_01PL2xbK8HnnaBgqeNJMJs36` to the next MSA-DUA Lead session (cost86: this session is past 40%).
Supersedes `2026-10-30-dua-lead-handover-3.md` (kept as history; its "Next" and sandbox notes still hold).
**Nothing is running and nothing of the Dua Lead's waits for release.**

## Read first

1. `CLAUDE.md` block "DUA MODULE — plan and rules", `docs/governance/dua-module-plan.md` (dua130/dua131, D01–D22, R1–R8).
2. The PMS https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ: General rules (lead120, cost76, cost86, rec118, hand119, name126,
   saw128, mydb128, win130), `p/mmsa` rules dua130/dua131, **job J104 (version 25 after this session)**.

## Who is who (they move often; the PCA announces each move)

- **MSA Master Architect: `session_01PL2xbJ2ncUt43CiJpHVZJf`** (since 12:27 pm 31 Oct).
- **PCA: `session_01PL2xbNViE9udUe3FUJjKBE`** (since 6:45 pm 30 Oct).
- Hadith Lead: `session_01PL2xbKWeTSDEBJV5UWZTcQ`.

## Released this session (all live)

| Version | What | Branch |
|---|---|---|
| v12.132 | Audit 138 D1–D5 (large text) + **D05 A1**: Dua 2's Bangla title no longer cut ("…হচ্ছে") | `claude/dua-audit138`, `claude/dua-lead-audit` |
| v12.134 | Audit 138 A1: Dua Study Person/Tenant pickers fit a phone with a long name (B1 baseline removed from `large-text-dua-study`) | `claude/dua-person-picker-2` |
| v12.138 | Audit 141 D1 (night-look note contrast in Poster/Share pop-ups), D2+H4 (one Escape handler in `dua-check.js`), H1+H3 (the Hadith Lead's commits, cherry-picked) | `claude/dua-audit141` |

## Two things to know

- **`app/js/dua-browser.js` is a Dua-owned file** (the plan's "Where things live"), even though Hadith Study mounts it. The
  Hadith Lead was told so on 31 Oct; ask each other before touching it. If ownership is to change, it is the MSA Architect's call.
- **`claude/dua-person-picker` (old, superseded) still exists on the remote.** Deleting a remote branch was refused by this
  session's permissions; the Architect asked for it to go. Nothing uses it. The Owner (or a session allowed to) can delete it.

## Open (all wait on the Owner, J104)

Ticks 6 (Sahaba/Salaf/Ulama sources, R8) · 7 (audio source, R5) · 8 (memorising marks, R6) · 9 (Rules change, R6) ·
10 (a dua's own English/Bangla meaning). Noted for tick 10: dua 2658's Bangla title has a HadeethEnc typo ("সিকা … দরকারি"),
and 10 of the 44 titled duas have no Bangla title. R7 waits on J105 and the PCA.

## Sandbox notes added this session

- A browser suite needs `ln -sf /opt/node-tools/node_modules node_modules` and `node serve.js` (port 8080; it can stop between
  turns: check `curl localhost:8080/app/dua-study.html`). Run long suites with `run_in_background`, never a foreground `sleep`.
- Force-push and remote-branch deletion are refused here: after a rebase, push to a new branch name, or merge `main` instead.

## Opening message for the next session

> Bismillah. You are the MSA-DUA Lead, taking over from session session_01PL2xbK8HnnaBgqeNJMJs36. Read, in order: CLAUDE.md
> (block "DUA MODULE — plan and rules"), docs/governance/dua-module-plan.md, docs/reports/2026-10-31-dua-lead-handover-4.md
> (on branch claude/dua-lead-handover-5 if not yet on main), and the PMS https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ with
> the ArtifactData tool: meta/global General rules (lead120, cost76, cost86, rec118, hand119, name126, saw128, mydb128, win130),
> p/mmsa rules dua130 and dua131, and job J104. Write only under p/mmsa, pin every write with if_version, full UTC `at`,
> Sydney times for people. Touch only Dua files on your own branch; never dispatch Builders, never release: hand each finished
> round to the MSA Master Architect (session_01PL2xbJ2ncUt43CiJpHVZJf, or whoever the PCA names) as "MSA-DUA LEAD ▸ ready for
> release". Everything up to v12.138 is live; nothing waits for release. R5–R8 wait on J104 ticks 6–10. cost86: no self
> wake-ups; hand over at about 40% context. When read in, send the PCA (session_01PL2xbNViE9udUe3FUJjKBE) "PCA ▸ taken over"
> and the MSA Architect a one-line note.
