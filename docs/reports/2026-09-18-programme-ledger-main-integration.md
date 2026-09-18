# Programme Integration Ledger — integration into `main`

- **Date:** 2026-09-18
- **Instruction:** Integrate ONLY the accepted Programme Integration Ledger foundation into `main`, with the stale Phase-4 version-numbering note corrected first.
- **Blast radius:** **BR-0, governance and verification only.** No reachable application behaviour changed.
- **Application version:** **v08.27 before, v08.27 after.**

---

## 1. Pre-flight — baseline matched exactly

Fetched first, before anything else.

| | |
|---|---|
| `origin/main` expected | `5ea0d928b8f326e0164c988ef79e4d1d1c168eeb` |
| `origin/main` actual | **`5ea0d928b8f326e0164c988ef79e4d1d1c168eeb` — identical** |
| Application version | **`08.27` — confirmed** |
| Branch | `claude/charming-rubin-xzxbk1` at `e89d27b`, clean tree, remote identical |

No movement, so neither reconciliation path A nor the `BASELINE_MOVED_MATERIAL` stop applied.

---

## 2. The governance correction

The Phase-4 VERSION NUMBERING NOTE no longer predicts a number. It now carries four durable statements, written as rules rather than as arithmetic that expires:

1. **Phase 4 remains HELD** at `7e2931f`, waiting on the Rules and index deployment (E1). Not re-cut, not re-stamped.
2. **Its `v08.26` stamp is HISTORICAL and is NOT a future integration allocation** — the ledger records `status: HISTORICAL`, `forwardAllocation: false`, and guard C fails if that ever stops being declared.
3. **Its eventual integration version will be allocated by the Master Architect at authorisation time**, and only then.
4. **Do not state or predict a numeric "next free version"** for a held branch, here or anywhere else.

All historical version references in that paragraph are canonical `v08.xx`; a bare-form scan of it returns nothing.

**The round entry that quoted the stale sentence verbatim was paraphrased too**, so the erroneous wording is described rather than reproduced. The correction note survives — what was wrong, and why the rules replaced the number — because deleting the episode would remove the reason the rules exist.

**Two dated reports were deliberately NOT retro-edited.** `2026-09-18-study-options-number-pickers.md` §175 still says the held branch "resolves to the next free number" at merge. It is an accepted, dated report: history, not live governance. Editing it would falsify the record of what was said at the time. **It is superseded by this report and by the four rules above.** The other hits in `2026-09-18-quran-stream-integration-reconciliation.*` already say the number must be allocated by the Master Architect, which is correct.

---

## 3. Guard E earned its keep before the merge, on its second real run

The Hadith candidate had advanced from `808539c` to **`fd8a8a2`**, and **guard E failed**:

```
FAIL [E] stream hadith modifies shared/platform file CHANGELOG.md on
         feature/hadith-study with no declaration and no authorisation
```

**A true finding, caught mechanically.** `fd8a8a2` adds **+127/−0** to `CHANGELOG.md`, a declared platform/shared file, and the ledger did not know. The mutation suite's own positive control failed in sympathy — correctly, since it requires the unmutated ledger to be clean before any mutation proves anything.

**Recorded, not authorised.** The touch is now `DECLARED` alongside the other four, so it is visible every run and awaits the Master Architect's decision. `fd8a8a2` itself was **not modified** — the inventory was taken by reading the branch.

Measured shared-file footprint of the candidate, against merge base `5ea0d92`:

| File | Lines | Status |
|---|---|---|
| `CHANGELOG.md` | +127 / −0 | DECLARED (new at `fd8a8a2`) |
| `CLAUDE.md` | +65 / −0 | DECLARED |
| `app/js/i18n/bn.js` | +68 / −0 | DECLARED |
| `tools/i18n-verify/behaviour.mjs` | +27 / −5 | DECLARED |
| `app/js/version.js` | +16 / −1 | DECLARED — the `v08.29` stamp |

**The candidate's own baseline is current, and this integration is what makes it stale.** `fd8a8a2` merged `origin/main` `5ea0d92` into itself at `e863c62`, so it was built on the accepted baseline. Landing this ledger moves `main` past `5ea0d92` — **by this commit and nothing else** — so the candidate's baseline is recorded as `MOVED_ACKNOWLEDGED`, pointing at this report, with a note that the move is governance-only and the rebaseline is expected. Guard F therefore reports it as a known open item rather than a surprise or a failure.

---

## 4. Verification

| Suite | Result |
|---|---|
| `programme-ledger.mjs` | **7 passed, 12 noted, 0 failed — EXIT 0** |
| `programme-ledger-mutations.mjs` | **25 passed, 0 failed — EXIT 0** |
| `brief-integrity.mjs` | **8 passed, 0 failed — EXIT 0** |
| `stub-parity.mjs` | **3 passed, 0 failed — EXIT 0** |
| `rules-authorisation-executable.mjs` | **38 passed, 0 failed — EXIT 0** |
| `rules-deployment-candidate.mjs` | **10 passed, 0 failed — EXIT 0** |
| `firestore-index-requirements.mjs` | **8 passed, 0 failed — EXIT 0** |
| `study-approach-contract-boundary.mjs` | **16 passed, 0 failed — EXIT 0** |
| `note-foundation-boundary.mjs` | **30 passed, 0 failed — EXIT 0** |
| `journey-map-boundary.mjs` | **13 passed, 0 failed — EXIT 0** |
| `study-note-boundary.mjs` | **17 passed, 0 failed — EXIT 0** |
| `d14-timezone-boundary.mjs` | **10 passed, 0 failed — EXIT 0** |
| `d14-timezone-contract.mjs` | **21 passed, 0 failed — EXIT 0** |
| `navcheck.mjs` (live boot) | **EXIT 0** — nav fits at every width in both languages |

The 12 NOTEs are the declared shared-file touches (11) and the acknowledged Hadith baseline move (1). They print every run on purpose: an open coordination item should be visible, not silent.

### What was proven, not asserted

| Claim | Evidence |
|---|---|
| Reachable `app/` behaviour unchanged | `git diff <base> <final> -- app/` is **empty** |
| `version.js` remains v08.27 | `APP_VERSION = "08.27"` on `main`, and the file is not in the diff |
| No Rules or Firebase configuration changed | `git diff <base> <final> -- firestore.rules firebase.json tests/ docs/governance/*.rules docs/governance/*indexes*.json` is **empty** |
| Hadith remains unmerged | `git merge-base --is-ancestor fd8a8a2 main` → **false** |
| Phase 4 remains held | `7e2931f` is not an ancestor of `main`; `claude/phase4-wiring` untouched |
| D14 remains unreachable | `d14-timezone-boundary.mjs` 10/0, including the check that no page or module imports either module at any depth |
| Nothing deployed | No Firebase credentials in this sandbox; no deployment attempted |

---

## PROGRAMME_LEDGER_INTEGRATION

```
BASE_MAIN_SHA=5ea0d928b8f326e0164c988ef79e4d1d1c168eeb
FINAL_MAIN_SHA=__FINAL__
APP_VERSION=v08.27
LEDGER_COMMIT=e89d27b07152e1a05e09932ce10b8056f2de2639
LEDGER_ON_MAIN=YES
STALE_PHASE4_VERSION_NOTE_FIXED=YES_REPLACED_WITH_FOUR_DURABLE_RULES_CANONICAL_v08xx
PROGRAMME_GUARDS=7_PASS_12_NOTE_0_FAIL_EXIT_0
MUTATIONS=25_PASS_0_FAIL_EXIT_0
APP_BEHAVIOUR_CHANGE=NO
HADITH_MERGED=NO
D14_REACHABLE=NO
PHASE4_STATUS=HELD
RULES_CHANGED=NO
DEPLOYED=NO
READY_FOR_HADITH_REBASELINE=YES
```

**READY_FOR_HADITH_REBASELINE = YES**, with one thing for the Master Architect to decide rather than assume: the candidate's five shared-file touches are DECLARED, not AUTHORISED — `CHANGELOG.md` among them, newly appearing at `fd8a8a2`. `app/js/version.js` carrying `08.29` is the one that merges silently: `git merge-tree` predicts no conflict there, so a merge takes the branch's number with no human decision. That is the mechanism that produced the real duplicate at 08.27.

---

Stopping here. No further tranche started.
