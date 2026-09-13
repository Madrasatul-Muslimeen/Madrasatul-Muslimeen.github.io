# QuranRevival — Phase 2–3 verification merge candidate

- **Date:** 2026-09-13
- **Purpose:** let the Owner run and personally verify the real integrated app through accepted MAP Phase 3, before Phase 4 proceeds.

---

## 1. Identity

| | |
|---|---|
| **Candidate branch** | `phase2-3-verification-merge` |
| **Candidate HEAD** | `d0c8eec676397151fdfe35089e673854e665628b` |
| **Base `main` SHA** | `4833b19ce8899f269977980ebf783d95ce2688e2` |
| **App version** | **08.19** (unchanged) |
| **Source development branch** | `claude/pensive-knuth-2pu3jj` @ `b0221ce4…` (untouched, preserved) |

`APP VERSION BEFORE CANDIDATE: 08.19`
`APP VERSION AFTER CANDIDATE: 08.19`
`VERSION UPDATE VERIFIED: PASS — NO NEW APPLICATION CAPABILITY ADDED`

No application code was written to make this candidate work. Every application
change in it was **selected** from already-accepted work, at file or hunk
granularity. It is therefore a selection, not a correction tranche.

## 2. Method — why this is not "the branch minus a few files"

The development branch changes **78 files**. This candidate changes **50**.

It was built by branching from the exact `origin/main` and adding back only
the accepted dependency set. Two files could not be taken wholesale, because
each mixes accepted and gated work inside one file:

**`app/quranrevival.html`** — the branch's copy carries unaccepted **Phase 5
permanent-Note UI**: a six-function import of `note-foundation.js`, five state
variables, and three render/handler blocks. The page was rebuilt from *main's
own copy* with only the accepted hunks applied — **15 of the branch's 19
hunks**, plus one line dropped from a mixed import hunk (which also carried
genuine Phase 3 imports). Verified afterwards: **zero** permanent-Note
references remain, and all Phase 2/3 wiring is present.

**`app/js/i18n/bn.js`** — 7 Phase 5 translation entries excluded, every Phase
2/3 string kept.

**`tools/firestore-emulator/package.json`** — rebuilt from main's with only the
Phase 3 `word-progress` script added. The rejected Phase 4 `activity-proposal`
script is absent (proven: `npm run activity-proposal` → *Missing script*).

## 3. Accepted Phase 2 contents included

Word occurrence identity (ADR-007) · on-demand root/lemma occurrence indexes ·
clickable Quran words · the persistent Word Card · WbW · Basic Arabic · Arabic
in Depth · occurrence lookup · keyboard/accessibility behaviour · responsive
behaviour · localisation · malformed-index/reference handling.

Modules: `quran-word-identity.js`, `quran-word-index.js`, `quran-word-card.js`,
the clickable-word change to `ayah-renderer.js`, and the Word Card markup/CSS/
handlers in `quranrevival.html`. Data: `roots-index.json`, `lemmas-index.json`,
`word-identity-index-manifest.json` and their build script.

## 4. Accepted Phase 3 contents included

WbW word-progress state model · self-progress · managed/student states ·
teacher/supervisor approval · Arabic coverage · Explore coverage integration ·
storage safeguards · tenant/role boundaries at application and data-contract
level · the associated UI and localisation.

Modules: `quran-word-progress.js`, `quran-word-progress-data.js`,
`quran-word-coverage.js`, the two new collection names in `collections.js`, and
the progress block + Explore coverage strip in `quranrevival.html`.

**Progress/wheel integration as accepted:** the coverage strip sits beside the
Explore wheel as its own row. The wheel's slice colours are **untouched** —
they colour an Approach's claim status, and a second meaning competing for the
same colour was weighed and declined.

## 5. Future / gated material EXCLUDED — all 28 files

**Phase 4 (partial implementation, not accepted)**
`app/js/activity.js` · `app/js/backup.js` · `app/js/backup-file.js` ·
`app/js/study-activity-week.js` · `app/js/study-activity-evidence.js` ·
`app/js/study-approach-contract.js` ·
`docs/governance/adr/ADR-008-study-approach-event-contract-v1.md` ·
`tools/i18n-verify/study-activity-week.mjs` ·
`tools/i18n-verify/study-activity-evidence.mjs` ·
`tools/i18n-verify/study-activity-writer.mjs` ·
`tools/i18n-verify/study-approach-contract.mjs` ·
`tools/i18n-verify/general-activity-week.mjs` ·
`tools/i18n-verify/activity-backup-render.mjs`

**Phase 4 Activity Rules — REJECTED candidate and its evidence**
`tests/firestore/activity-v1.proposed.rules` ·
`tests/firestore/activity-v1.security-matrix.json` ·
`docs/governance/activity-rules-proposal-2026-09-12.md` ·
`tools/firestore-emulator/activity-v1.firebase.json` ·
`tools/firestore-emulator/activity-v1.rules.test.mjs` ·
`tools/firestore-emulator/verify-activity-proposal.mjs` ·
`tools/firestore-emulator/activity-keyed-week-prototype.mjs` ·
`tools/firestore-emulator/activity-keyed-week-prototype.test.mjs`

**Phase 5 Note Foundation, beyond what `main` already carried**
`app/js/note-foundation.js` (branch additions) ·
`app/js/ayah-note-renderer.js` (branch additions) ·
`tests/firestore/note-foundation.rules.test.mjs` ·
`tools/i18n-verify/note-foundation-boundary.mjs` ·
`tools/i18n-verify/note-foundation-emulator-scaffold.mjs` ·
`tools/i18n-verify/note-foundation-reconstruction.mjs` ·
`tools/i18n-verify/note-foundation-rules-candidate.mjs` ·
plus the permanent-Note UI inside `quranrevival.html` and its 7 `bn.js` strings.

**Proven, not asserted.** Every one of the five Phase 4/5 application modules
is **byte-for-byte identical to `main`** on this candidate; every gated file
listed above is **absent**. No Phase 6–8 implementation exists on the source
branch, so none could be carried.

## 6. Unavoidable dependencies

**None.** No accepted Phase 2–3 feature required importing a later-phase
module. Every `import` in the candidate resolves to a file present in it —
checked mechanically across `app/js/*.js` and `app/quranrevival.html`.

Two things that *look* like Phase 5 dependencies are not:
`app/js/note-foundation.js` exists on `main` already (merged as #87) and is
kept at **main's** version, uninvoked; and the Firebase stub's
`runTransaction`/`limit`/`orderBy` exports are required **because main's own
`note-foundation.js` imports them** — without them every page fails to boot in
the harness with a module-level SyntaxError.

## 7. Harness corrections preserved, and why

Without these the accepted work cannot be tested at all:

- `tools/i18n-verify/firebase-stub.mjs` — the three missing Firebase exports
  above, plus the write-values channel the Phase 3 suites read.
- `tools/i18n-verify/behaviour.mjs`, `panel.mjs`, `reading.mjs` — the
  STUDY-pillar menu fixes (Options/Read/Note moved inside a hidden container,
  so 46 direct clicks across three suites were timing out).
- `tools/i18n-verify/stub-parity.mjs` — new; guards the whole SyntaxError class.

## 8. Files changed versus `main` — 50

6 new app modules · 4 modified app files (`quranrevival.html`, `ayah-renderer.js`,
`collections.js`, `bn.js`) · `version.js` · 3 Quran data files + 2 data scripts ·
12 new test suites + 4 harness corrections · 1 Rules candidate + 3 emulator files ·
8 governance/report documents · `md2report.py` · `CLAUDE.md` · `CHANGELOG.md` ·
`.gitignore`.

## 9. Regression results — run on the CANDIDATE itself

| Suite | Result | Against |
|---|---|---|
| `behaviour.mjs` | **802 pass / 1 fail** | identical to `main`'s own baseline |
| `layout.mjs` | **every metric byte-for-byte identical to `main`**, 8 viewports × 2 banner states, 0 changed lines; `getElementById` 248 → 250 | — |
| `navcheck.mjs` | unchanged — 1 pre-existing 320px English truncation of "Operation"/"Bookmark" | same as `main` |
| `reading.mjs` | READING SCREEN OK, en + bn | — |
| `panel.mjs` | 15 labels, no truncation, en + bn | — |
| Phase 2 node suites (5) | 56 / 0 | — |
| Phase 3 node suites (4) | 133 / 0 | — |
| `stub-parity.mjs` | 3 / 0 | — |
| `note-foundation-boundary` / `-emulator-scaffold` (main's own) | 30 / 0 and 31 / 0 | unchanged |
| Emulator Rules candidate | **42 / 0** (23 denials, 19 allows); zero expression-limit references in the log | — |
| Translation coverage | `main` 1,733 / 46 → candidate **1,783 / 47** | see below |

The single `behaviour.mjs` failure is `ERR_TUNNEL_CONNECTION_FAILED` — this
sandbox's proxy blocking archive.org. It is present on `main` too.

The **+1 missing translation** was named, not assumed: it is
`"Meaning unavailable"`, the deliberate English fallback on the `lang="en"`
line of the **bilingual** WbW panel. The Bangla line carries its own Bangla
fallback (`"অর্থ পাওয়া যায়নি"`). Confirmed by reading the module: that panel
shows both glosses together whatever the interface language. Every other area's
missing list is **identical to `main`'s**.

## 10. Rendered results — both languages

| Suite | Result |
|---|---|
| Phase 2 Word Card rendered acceptance | **92 / 0**, en + bn, 6 viewports |
| Phase 3 WbW progress rendered | **81 / 0**, en + bn, 6 viewports |
| Explore Arabic coverage rendered | **35 / 0**, en + bn |

Explicitly verified in the browser, read off `window.__fsLog` and
`window.__stubWriteData` rather than off the source:

- **No startup-path regression.** Zero word-progress reads on the landing path,
  zero from opening Read. Exactly 2 reads when a word card is opened; exactly
  2 queries when Explore reaches a surah.
- **No unexpected Firestore writes from opening or browsing the Word Card.**
  Opening a word, moving between words and switching Arabic level write
  **nothing**. Only an explicit state or decision button press writes.
- **Nothing written to `records` or `activity`** in any flow.

## 11. Firestore Rules / index / migration / deployment status

| | |
|---|---|
| `firestore.rules` vs `main` | **zero-line diff — byte-for-byte identical** |
| Firestore index files | **none changed** |
| Migration / backfill | **none** |
| Production write | **none** |
| Deployment | **none** |

The Phase 3 Rules candidate is carried as
`tests/firestore/word-progress-v1.proposed.rules` — a **candidate file only**,
never loaded by the app, never deployed. Its deployment remains an Owner
Control Gate.

**Consequence the Owner should know:** until those Rules are deployed, the two
new collections (`quranWordProgress`, `quranWordApprovals`) have no server-side
rule. The word-progress feature is therefore verifiable by the Owner's own
account, but is **not** usable by a student or teacher account against
production. That is a deliberate consequence of not crossing the gate.

## 12. Recommended merge method

```
git checkout main
git merge --no-ff phase2-3-verification-merge
```

`--no-ff` deliberately: it keeps one merge commit that names this candidate, so
the merge is a single identifiable point to inspect or revert. The candidate
branches directly from `main`'s current tip, so **no conflict is possible**
unless `main` moves first.

Do **not** merge `claude/pensive-knuth-2pu3jj` — that branch carries the gated
Phase 4/5 material this candidate exists to keep out. It remains as the durable
development history and is not deleted or rewritten.

## 13. Rollback point

`4833b19ce8899f269977980ebf783d95ce2688e2` — `main` as it stands now.

`git reset --hard 4833b19c` on `main` (or `git revert -m 1 <merge-sha>` if the
merge has already been pushed and shared) restores the exact pre-merge state.
No data migration accompanies this merge, so a rollback is code-only: nothing
written by the new feature needs undoing, and any word-progress documents a
test created remain readable and simply stop being displayed.

## 14. Owner verification steps after merge

**This candidate is not viewable online until it is merged.** This repository
is a `<user>.github.io` Pages site and **GitHub Pages serves the default branch
`main` only**. Pushing the candidate branch publishes nothing.

After merging to `main`, at `https://madrasatul-muslimeen.github.io/app/quranrevival.html`:

1. **Version badge** beside the app name reads **v08.19**.
2. **Study → Read**, turn on the word-by-word panel. Each word is now a
   **button**; click one.
3. The **Word Card** appears and stays. Check the three tabs — **WbW**,
   **Basic Arabic**, **Arabic in Depth** — and the ‹ › arrows.
4. Under the WbW gloss, **Word progress**: three buttons — *Not started*,
   *Learning*, *Achieved*. Press one; the selection and the line
   *"N of M words known in this ayah"* update immediately.
5. **Pick a child from the person dropdown**, open a word, press *Achieved*.
   It should read **"Waiting to be checked"** and count **0** in coverage —
   then **Confirm**, and only then does it count.
6. **Explore** → drill into a Surah. Under the legend: *"N of M Arabic words
   known"*. At **Whole Quran** and **Juz** level it says the figure is not
   available at that granularity — that is correct, not a bug.
7. Switch the app to **Bangla** and repeat 2–6. Everything above should be in
   Bangla, with Bengali digits in the counts.
8. Try it on a **phone**.

## 15. Correction recorded

While comparing translation coverage, `git checkout origin/main -- .` was run
against this branch before it had any commit, which reverted the 13 modified
files in the working tree. It was caught immediately by re-checking the tree,
the modified set was rebuilt from scratch, and the candidate was committed
before any further verification. **Every result in §9 and §10 above was
re-run against the committed candidate**, and the first (contaminated)
`behaviour.mjs` run — which stopped early at 284 checks — was discarded and
re-run twice, the final clean run being the 802/1 reported.

---

**MERGE CANDIDATE: READY FOR MASTER ARCHITECT AUDIT**

`CLAUDE SESSION CONTINUITY: START NEW SESSION NOW`
