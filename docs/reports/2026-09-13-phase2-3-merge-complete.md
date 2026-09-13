# Phase 2–3 Verification Merge — COMPLETE

**Date:** 2026-09-13
**Repository:** `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`
**Authority:** Owner instruction, "EXECUTE APPROVED PHASE 2–3 MERGE"

`PHASE 2–3 MERGE COMPLETE — MAIN UPDATED TO v08.19 — READY FOR OWNER VERIFICATION`

---

## 1. Identifiers

| Item | SHA / value |
|---|---|
| Pre-merge `main` | `4833b19ce8899f269977980ebf783d95ce2688e2` |
| Candidate `phase2-3-verification-merge` | `cec4f8d25d91f3bd6c1bf191f791894c888faf6c` |
| **Merge commit** | `07ebbde7b2982f9780cdbb5930eb73f1bd5ae51e` |
| **Remote `main` after push** | `07ebbde7b2982f9780cdbb5930eb73f1bd5ae51e` |
| App version | **08.19** (was 08.04 on `main`) |

Both expected pre-merge hashes matched `origin` exactly before anything was
touched. Nothing was improvised.

## 2. Merge method

Performed exactly as instructed, from a clean checkout:

```
git fetch origin
git checkout main
git reset --hard origin/main
git merge --no-ff origin/phase2-3-verification-merge
```

Not squashed. Not rebased. `claude/pensive-knuth-2pu3jj` was **not** merged,
and is proven absent from the merged history.

`main` was an ancestor of the candidate, so the merge was fast-forwardable;
`--no-ff` was used as instructed, producing a real merge commit with both
parents recorded. The merge commit message identifies this as the accepted
Phase 2–3 verification merge and states in its own body what the merge does
**not** authorise.

**Blast radius:** 52 files, +5,991 / −68 lines, across two commits.

## 3. Post-merge verification — all ten items

| # | Check | Result |
|---|---|---|
| 1 | App version remains `08.19` | **PASS** — read from `app/js/version.js`, and re-read from the live remote after push |
| 2 | `firestore.rules` byte-for-byte unchanged | **PASS** — identical blob SHA `601c6a24…` on pre-merge `main` and on remote `main`; file absent from the diff |
| 3 | No Firestore index changes | **PASS** — zero tracked `firestore.indexes.json` in the repository |
| 4 | No migration / backfill | **PASS** — zero matching files in the diff |
| 5 | No production writes | **PASS** — merge is code-only; emulator tooling pins `demo-*` project ids and asserts against `study-monitoring` |
| 6 | No Phase 4/5 gated material leaked | **PASS** — `claude/pensive-knuth-2pu3jj` and all `stage5-*` branch tips absent; only Phase 4 *comments* appear, no implementation |
| 7 | Phase 2 Word Card present | **PASS** — modules present, exported and wired into `quranrevival.html` |
| 8 | Phase 3 Arabic Progress & Coverage present | **PASS** — all three modules present, exported and wired |
| 9 | Imports resolve | **PASS** — all 20 named imports resolve to real exports; all changed modules pass `node --check` |
| 10 | Working tree clean after merge | **PASS** — `git status --porcelain` empty |

### Note on item 3

The only `firestore.indexes.json` anywhere on disk is inside the
`firebase-tools` npm template, installed locally to run the emulator suite.
It is untracked and gitignored. Nothing index-related is tracked or deployed.

### Note on item 9

`quran-word-progress-data.js` cannot be imported by bare Node because it
imports Firebase from a CDN URL. This is the established pattern across
existing app modules (`activity.js`, `backup.js` and others) and is not a
regression. Its eight exports were verified statically and the module was
exercised for real by the browser-rendered suites.

## 4. Test results

Every result below was executed on the merged `main`. Nothing is reported as
PASS that was not run.

### Phase 2 Word Card suites

| Suite | Result |
|---|---|
| `quran-word-identity-contract.mjs` | 6 passed, 0 failed |
| `quran-word-card.mjs` | 23 passed, 0 failed |
| `quran-word-card-integration.mjs` | 10 passed, 0 failed |
| `quran-word-indexes.mjs` | 9 passed, 0 failed |
| `quran-word-index-loader.mjs` | 8 passed, 0 failed |

### Phase 3 word-progress suites

| Suite | Result |
|---|---|
| `quran-word-progress-model.mjs` | 57 passed, 0 failed |
| `quran-word-progress-data.mjs` | 37 passed, 0 failed |
| `quran-word-coverage.mjs` | 10 passed, 0 failed |
| `quran-word-coverage-arabic.mjs` | 29 passed, 0 failed |

### Rendered suites (real browser, both languages)

| Suite | Result |
|---|---|
| `quran-word-card-rendered.mjs` | 92 passed, 0 failed |
| `quran-word-progress-rendered.mjs` | 81 passed, 0 failed |
| `quran-word-explore-rendered.mjs` | 35 passed, 0 failed |

**400 checks across the Phase 2/3 suites, all passing.**

### Regression suites

| Suite | Result |
|---|---|
| `behaviour.mjs` | **800 passed, 3 failed** — the documented baseline |
| `layout.mjs` | Every landing-page metric **byte-for-byte identical** |
| `navcheck.mjs` | 1 problem — **pre-existing**, see below |
| `reading.mjs` | `READING SCREEN OK` in both `en` and `bn` |
| `panel.mjs` | 48 configurations per language; **0 truncated labels, 0 wrapped bars** |
| `stub-parity.mjs` | 3 passed, 0 failed |
| Emulator Rules suite | 1 subtest / 41 assertions, passed — candidate only, demo project |

#### `behaviour.mjs` — 800 / 3

Identical to every recent run recorded in `CLAUDE.md`: the same 803 total, the
same three failures in section 22g (this sandbox's proxy blocks
`archive.org`, so the screensaver poster cannot load), and the same
pre-existing stop at section 42 on the `[data-note-master-toggle]` visibility
assumption carried since v07.69. Nothing in this merge caused any of them.

#### `layout.mjs` — nothing moved

16 measurements (8 viewports × 2 banner states). Wheel-heading top, wheel
width, Approach row count, dock gap, dock visibility and page overflow are all
identical before → after. `getElementById` targets **248 → 250**, exactly this
round's two new elements, with the same 22-entry pre-existing missing list.

The comparison was set up so it could actually fail: the `_prev-` shim was
`HEAD`'s own pre-merge page, which carries **zero** Word Card references
against the merged page's twenty. The shim was deleted before any coverage
number was read.

#### `navcheck.mjs` — the one problem is pre-existing

The single reported problem is the 320px **English** truncation of
"Operation" and "Bookmark" (73px needed, 65px available) — the exact
pre-existing issue `CLAUDE.md` records as unchanged across many rounds.

This was proven structurally rather than by assertion: `app/js/nav.js` is
untouched by the merge, and the `<nav>` block of `app/quranrevival.html` is
**byte-for-byte identical** between pre-merge `main` and the merged tree. The
merge therefore cannot have introduced it.

An attempt to reproduce the baseline by serving a pre-merge worktree is
**reported as not usable**: the app did not fully boot in that scaffold
(1 nav button, 0 Approach rows), so its "NAV FITS" output proves nothing and
is not claimed as evidence. The byte-identical nav markup is the evidence.

### Translation / i18n coverage

| | Scanned | Bangla | Missing |
|---|---|---|---|
| Pre-merge `main` (v08.04) | 1,733 | 1,687 | 46 |
| Merged `main` (v08.19) | 1,783 | 1,736 | 47 |

Following this project's standing rule — the coverage number is never
evidence, but it is a to-do list worth reading — the one new "missing" entry
was identified by name: **`"Meaning unavailable"`**.

It is a **false positive**. The Word Card deliberately renders the English and
Bangla meaning lines *simultaneously*, independent of the interface language;
`meaningUnavailableEn` is the English fallback inside an explicit `lang="en"`
element, and its Bangla twin `meaningUnavailableBn` ("অর্থ পাওয়া যায়নি") is
present and translated. The scanner counted the English half of a deliberate
bilingual pair. The 208 rendered Bangla checks are the authoritative evidence
that the card reads correctly in Bangla.

**No real translation gap was introduced.**

## 5. Rules, index, migration and deployment status

| | Status |
|---|---|
| `firestore.rules` | **UNCHANGED.** Identical blob on pre-merge `main` and remote `main` |
| `tests/firestore/word-progress-v1.proposed.rules` | **CANDIDATE ONLY — NOT DEPLOYED.** Remains a separate Owner Control Gate |
| Firestore indexes | **None changed, none deployed** |
| Migration / backfill | **None** |
| Production data writes | **None** |
| Phase 4 | **Not started** |

The emulator suite exercising the candidate Rules loads
`word-progress-v1.proposed.rules` only, never `firestore.rules`, and runs
against project `demo-quranrevival-word-progress-v1`. The tooling carries its
own explicit guards refusing any project id that is not `demo-`-prefixed and
refusing `study-monitoring` by name. Running it changed nothing in production
and does not constitute deployment.

## 6. Deployment

The push updated the default branch, so **GitHub Pages will serve the merged
`main`**. No other deployment action was taken, and none is authorised.

Live remote confirmed by reading it back from GitHub after the push:
`main` = `07ebbde7b2982f9780cdbb5930eb73f1bd5ae51e`, `app/js/version.js`
= `08.19`, `firestore.rules` blob unchanged.

## 7. Rollback point

`4833b19ce8899f269977980ebf783d95ce2688e2` is the pre-merge `main`. The merge
is a single `--no-ff` commit with both parents recorded, so it can be reverted
as one unit.

## 8. What the Owner should check

1. Open the app and confirm the version badge reads **v08.19**.
2. Open a Surah, tap a word, and confirm the Word Card opens with its three
   levels (WbW / Basic Arabic / Arabic in Depth).
3. Confirm the Arabic progress and coverage figures appear.
4. Switch the app to Bangla and confirm the same screens read in Bangla.

Nothing else in the app changed. Every landing-page measurement is identical
to before the merge.
