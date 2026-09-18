# A guard for the standing brief — and the two rounds it found missing

- **Date:** 2026-09-18
- **Task:** make the brief's own "check this every session" instructions mechanical
- **Blast radius:** **BR-0.** One new tools file; two documentation corrections. `git diff -- app/` is empty.
- **Application version:** **08.25, unchanged.**
- **Result:** ACCEPT. `tools/i18n-verify/brief-integrity.mjs`, **8 checks**, 3 of 3 mutations caught — and on its first run it found **two real rounds that had no CHANGELOG entry** and **a stale instruction the brief had been carrying since v08.02**.

---

## 1. Why

`CLAUDE.md` is read in full at the start of every session and treated as authority. Its own text records that it has been wrong about itself three times:

- *"This line has drifted twice already — it read `v08.02` while `main` was on 08.04, and `v08.19` while `main` was on 08.21. **Check it against `app/js/version.js` every session.**"*
- It pointed at a deployment document that is not on `main` — a dead pointer the Owner would have followed to nothing.
- v07.124–128 were found missing from `CHANGELOG.md` on 5 Sep 2026, *"having only ever lived here, so the next round to trim the list would have destroyed one."* The rule written down then: **a round leaving the brief is appended to the log first.**

Three instructions to a reader who has to remember them. **A guard does not have to remember.**

## 2. What it checks

1. Every repository path the brief names in backticks **exists**.
2. The ones the brief says are **held on a branch** really are on that branch — stronger than skipping them, and it fails if such a file quietly lands on `main` without the brief being updated.
3. The **`Current milestone: vNN.NN`** line matches `APP_VERSION` in `app/js/version.js` — the drift that has happened twice.
4. The three reachable lines the brief's own table names (`/legacy`, `/legacy-v07`, `/app`) are all present.
5. The **unmerged wiring candidate** the brief names is still at the commit it names, read from `origin/claude/phase4-wiring`.
6. **Every shipped version the brief names appears in `CHANGELOG.md`** — the v07.124–128 rule, enforced.
7. The brief still points at `PHASE-5-STATUS.md`, the pointer a new session follows first.

Plus a **positive control**: the path scanner must find at least 20 paths across `app/js`, `tools` and `docs`, or one broken regex makes every assertion below it vacuous.

## 3. What it found on its first run

### F1 — v08.03 and v08.04 have no CHANGELOG entry

Both shipped on 11 Sep 2026 and both bumped `app/js/version.js`:

- **v08.03** (`f5c15a9`, STAGE-5-TASK-19) — the Note Foundation **transaction gateway**: five collection constants, the envelope transaction facade, and its own suite.
- **v08.04** (`4833b19`, STAGE-5-TASK-20) — the **uninvoked Note Foundation data layer**, `app/js/note-foundation.js`, 220 lines. **Every Phase 5 and Phase 6 round since has extended that file**, addition-only, and the boundary suite that insists on that started there.

**Nothing was lost** — both commits are in the history and their files are on `main` — but for a week the log implied the Note Foundation's two founding rounds did not happen. Recorded now, reconstructed **from the commits themselves**, not from memory, and labelled as recorded late with the reason.

### F2 — a stale instruction, in a paragraph that tells you to keep it current

> *"Version numbering from here … **so the next feature round is v08.03**. `app/js/version.js` is the single source of truth … **Bump it and this line together, every round.**"*

Written at v08.02. The version reached **08.25** with that sentence untouched — in a paragraph whose own last sentence says to update it. Corrected, with the correction recorded rather than silently overwritten.

## 4. Two false positives on that same first run, both worth recording

The check's first version reported **nine** missing versions and one dead path. Seven of the ten were wrong, and reading them rather than acting on them was the whole difference:

- **`tests/firestore/activity-v1.proposed.rules`** is genuinely absent from `main` — and the brief's own header *says so*, placing it on `claude/pensive-knuth-2pu3jj`. Confirmed with `git cat-file` that it really is there. Not a dead pointer; the check now verifies the branch claim instead of skipping it.
- **v08.06 … v08.12** are covered by a **range heading**, `v08.05–v08.13`. The check now expands range notation before looking for gaps. Without that, seven false positives buried the two real ones.

**A guard's first run is where its own false-positive rate is measured**, and a guard that cries wolf about seven things is one whose two real findings get dismissed.

## 5. Mutation-proven

| Mutation | Caught by |
|---|---|
| set the milestone line to `v08.19` | *the brief's own version claim matches app/js/version.js* — "this exact drift has happened twice before" |
| rename a path to `app/js/versions.js` | *every repository path the brief names exists on main* |
| remove `v08.24` from `CHANGELOG.md` | *every version the brief names is also in CHANGELOG.md* |

Each asserted its own occurrence count first.

## 6. Verification

| | |
|---|---|
| `brief-integrity.mjs` | **8 / 0**, 3 / 3 mutations caught |
| `git diff -- app/` | **empty** |
| `rules-deployment-candidate.mjs` | **10 / 0** — its own `docs/governance/` path check still green and not duplicated |
| Translation coverage | **1,803 / 47** — unchanged |

## 7. What it does NOT check

- **Whether a brief statement is TRUE**, only whether the things it names exist. "SEVEN items sit in the pending-dependency ledger" is prose and stays prose.
- **The five-most-recent-rounds section.** Which rounds belong there is editorial; that they are all in the log is now checked, which is the part that was ever load-bearing.
- **`PHASE-*-STATUS.md` contents.** The brief says to read `PHASE-5-STATUS.md` first; this confirms the file is there, not that it is current.

---

*Master Architect audit: BR-0, tools plus two documentation corrections, no accepted decision changed, no Owner Control Gate crossed. Three instructions that told a reader to check something every session are now checked by a program.*
