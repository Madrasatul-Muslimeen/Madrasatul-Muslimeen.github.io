# 16 — Architectural Risks and Opportunities

QuranRevival v08.02 · **observations only.** Nothing here is a proposal, and
nothing was fixed.

---

# PART 1 — RISKS

## 1.1 Technical risks

### R1. `app/quranrevival.html` is 12,051 lines — **the dominant risk**
The Quran screen, the Note view, the Mastery Wheel, **all of Explore**, the QCR
palette and the Asma palette live in one inline `<script type="module">`. There
is no build step, no module boundary within it, and no automated coverage for
most of it. It is 28% of the entire application by line count, and nearly every
UI change lands there.

### R2. No build step means no compile-time safety
No bundler, no TypeScript, no linter in CI. **A typo ships.** The mitigations
are real but manual: a Playwright harness (~800 checks) and per-round scripts.

### R3. Renaming a file or an export breaks importers at runtime
Import paths are relative and real. The project has hit this twice, recorded in
its own lessons (the `_prev-quranrevival.html` shim traps).

### R4. Six CSS/DOM traps with a recorded history of recurrence
The project's standing lessons name these because each cost a shipped defect:
- **`[hidden]` is beaten by any class or ID rule setting `display`** — bitten at least six times.
- **Two rules of equal specificity: source order wins.**
- **A `nowrap` + `text-overflow: ellipsis` label fails silently.**
- **`.reading-ticks` / `.fs-ticks` are names with MEANING** — checks count them.
- **Re-render wipes UI state.**
- **`surahName()` needs the English name handed to it** — one argument renders blank.

### R5. The Firebase client config lives in `app/js/firebase-init.js`
Normal for a Firebase web app (security is in the rules, not the key), but worth
knowing before sharing source publicly.

### R6. The test harness's own blind spots
The Firebase stub **never mutates its own `DATA`** (a handler that writes then
re-fetches sees stale data even when correct), and **it answers instantly**, so
any timing measurement without an injected `latencyMs` is "a comforting lie".
`behaviour.mjs` also carries a **pre-existing crash in section 42** since v07.69,
plus **3 environmental failures** where the sandbox blocks archive.org.

---

## 1.2 Scaling risks

### R7. Firestore's 1 MiB document limit on `records`
One entry with its key is roughly **359 bytes**, so a chunk saturates around
**2,900 entries**. Fine today (a surah chunk holds at most `ayahCount × 30`), but
a hard ceiling for anything finer-grained — per-word claims would be ~26 MiB.

### R8. `entries` is a map that only grows
No delete path (I4), so a chunk accumulates for the life of a person.

### R9. Explore's ≤115 document reads per open
By far the heaviest operation. It does not grow with usage, but it does not
shrink either, and it is paid on **every** open.

### R10. `getRosterRoles()` is 6 × N reads
A 40-person roster costs 240 document reads to render a roles column — a
consequence of the "rules cannot run queries" constraint.

### R11. Nine reads per claim, multiplied by assignees
A guardian claiming for three children pays 27 reads for one button press.

### R12. `activity` uses `arrayUnion` on one document per week
Firestore rewrites the whole array on each append. Bounded by one week, but the
cost is per-append, not per-element.

### R13. Two "one document per tenant" collections
`ayahCollections` and `asmaCollections` both grow with tenant-authored content
under the same 1 MiB ceiling.

### R14. The rules `get()` budget already forced a workaround
20 calls per batched write, per document — which is why `SEED_CHUNK_SIZE = 5`
exists. Any new bulk write inherits it.

---

## 1.3 Duplicated logic

### R15. Chunk-key logic exists twice, deliberately
`chunkKeyFor()` (`records.js:53`) and `currentUnitInfo()`
(`quranrevival.html:4806`) both compute it. The duplication is *intentional* and
documented — the screen must know where a claim will land before making it — but
**they must be changed together or they silently diverge.**

### R16. Role lists are declared in two places
`records.js:90` (`MEMBERSHIP_ROLES`) and `people.js:24` (`ALL_ROLES`) hold the
same six values. `people.js` acknowledges it "mirrors records.js's own private
MEMBERSHIP_ROLES".

### R17. Two wheel renderers coexist
`renderScopedWheel()` (used everywhere) and `renderMasteryWheel()` (the older
per-ayah shape, still exercised only by `quranrevival-render-test.html`). The
code calls the latter *"earmarked, not dead code"*.

### R18. Roster scoping happens in two layers
`scopedRoster()` client-side **and** the security rules server-side. Correct
defence in depth — but `scopedRoster()` returns `teacher` rosters *unchanged*,
relying entirely on Firestore having already filtered them. That is documented
and correct, and it is **not obvious from reading the function alone**.

---

## 1.4 Incomplete systems

### R19. Non-Quran subjects have no progress model
One "Studied"/"Practised" trackable per module versus the Quran's 30 Approaches.
**The app's biggest open educational question**, recorded as needing a long
design conversation, with an explicit instruction not to raise it each session.

### R20. Approval affects nothing visual
Confirm/return work and are stored, but **every wheel and every Explore colour
reads `claimedStatus`**. A *returned* claim still shows green.

### R21. Teacher scope is by student, not by subject
A co-enrolled teacher has record/confirm authority over that student across
**every** subject. A known, documented gap — and directly relevant if an outside
specialist teacher is ever brought in.

### R22. Homework's teacher scoping is a different shape again
`isAssignmentCreator()` uses `isActiveTeacherInContext()` — per context, not per
student — with the client trusted to offer only that context's roster.

### R23. `rub` and `manzil` are declared and unreachable
Key constructors exist; no picker, no boundary index.

### R24. `roots-index.json` is referenced but does not exist
Named at `ayah-renderer.js:152`. Searched the whole repository — absent.

---

## 1.5 Misleading names

### R25. **"Derivatives" shows no derivatives** — POS + lemma of the *same* word.
### R26. **`arabic-study.html` is not word study** — the topic renderer for the Arabic *subject*.
### R27. **`SURAH_WHEEL_THRESHOLD = 30` is an ayah count**, unrelated to the 30 Approaches.
### R28. **`rootCount` is not a plain count** — it merges weak-final-radical roots, so 19 roots disagree with their own frequency.
### R29. **"Approach" is not a type** — it is a `trackables` row with `subjectId: "quran"`.
### R30. **`ladders`/`levels` are grades, not study levels** — the study path never reads them.
### R31. **`group` looks structural and is display-only** — nothing keys off it.

---

## 1.6 Architectural inconsistencies

### R32. The two wheels have opposite axes
Landing = Approaches for one unit; Explore = units for one Approach. Same
renderer, similar appearance. **The single most likely misreading of this
codebase.**

### R33. The two aggregation rules deliberately disagree
A Juz whose ayahs are all mastered reads `not_started` on the landing wheel and
green in Explore. Both correct for their own screen; the difference is invisible.

### R34. The rules do not separate claiming from confirming
`canRecordFor()` is the same gate for both. The separation is client-side only.

### R35. Privilege is checked before studenthood
`computeConfirmationRequired()` returns `false` at the owner/prime/teacher/
guardian checks **before** reaching the student check — so any administrative
role silently exempts a person from approval even if they also hold `student`.

### R36. `confirmationRequired` is per **subject** only
It cannot be varied per Approach or per unit type.

### R37. `not_applicable` sits on the same picker as the ramp
Semantically a different kind of thing, presented identically.

---

## 1.7 Data limitations

### R38. No word identifier and no word-level index
`position` is unique within an ayah only. "Where else does this word occur"
needs all 114 files (27 MB), which the load-speed contract forbids.

### R39. Unicode normalisation is applied nowhere
**Eight surface-form pairs in this dataset differ only in combining-mark order.**
Raw string equality fails on them; NFC succeeds.

### R40. The word-by-word gloss is contextual, not lexical
**73.8% of word occurrences** have a form glossed more than one way; مِن alone
has **72** glosses. It cannot serve as word identity.

### R41. Root data covers only 64.5% of words
Particles and pronouns genuinely have no root. A hard ceiling on root-based
coverage.

### R42. Level-3 grammar data was in the source and discarded
The 2011 corpus supplied **128,011 morphology rows**; `pull.js:206–215` keeps
only root, lemma and POS.

### R43. A re-pull is a migration event
Changed tokenisation would silently invalidate any stored word key, and I5
requires unit keys to be permanent. There is **no per-word version stamp**.

### R44. One malformed POS value
Surah 37:130 position 3 carries `"pos": "yaAsiyna"` — a Buckwalter fragment.
1 word in 77,429; renders harmlessly.

### R45. Tenant correction of Quran data is impossible
Static public files. Contrast `asmaCollections`, which *does* let a tenant
override a canonical Name's Bangla wording.

---

## 1.8 Performance concerns

### R46. All computation is client-side — there are no Cloud Functions
Every roll-up, report and aggregation runs in the browser. There is nowhere to
put server-side logic and no scheduled job.

### R47. `effectiveAyahStatus()` runs per ayah per render
Up to 6,236 calls for the whole-Quran wheel, each scanning that trackable's
span list.

### R48. Adding wheel segments is a measured layout risk
The project's own note (`quranrevival.html:575`) records that with a real
30-Approach tenant the list already scrolls at phone width. More segments will
not break; they may not read. The standing rule is to re-measure at 8 viewports
in both languages.

### R49. `app/js/i18n/bn.js` is 2,293 lines, loaded per page
Static and cacheable, but it is a real per-page parse cost.

---

# PART 2 — OPPORTUNITIES

*Observations about what already exists, not recommendations.*

## 2.1 Reusable infrastructure

| Asset | Why it is valuable |
|---|---|
| **`claimStatus()` — one write path** | Any new claimable thing gets confirmation, freezing, activity logging and error surfacing **for free** |
| **`renderScopedWheel()` — segment-count-agnostic** | Already called with 30, 114, 99 and 1–286 items. Hand it an array and it draws |
| **The `items[]` contract** | `sliceLines` / `sliceArabicLines` are existing precedent for **backward-compatible opt-in extension** |
| **`ayahCoverage()`** | the single containment primitive — a new unit type needs only a boundary table to become poolable |
| **The panel system** | `PANEL_ORDER` + `PANEL_RENDERERS`; the file's own rule is *"adding approach 31 is a row of data, not a build"* |
| **`initTopicStudyPage()`** | a whole study module is a ~149-line shell and three arguments |
| **`bar-palette.js`** | one delegated listener gives outside-click, Escape and "only one open" free |
| **`envelope.js` + `errors.js`** | I17 and I15 satisfied by construction |
| **`labels.js`** | the escape hatch that keeps renderers Firebase-free |
| **The rules-mirror pattern** | `tenantMemberUids`, `teacherStudentLinks` — the established answer to "rules cannot query" |
| **The verification harness** | ~800 checks, plus a load-speed harness with an instrumented stub |
| **The lazy-index pattern** | search indexes, hizb table, `subject_quran` — a proven template for anything new that must stay off the startup path |

## 2.2 Hidden capabilities

| Capability | Where |
|---|---|
| **Explore already hosts three content domains** | `setExplorePalette()` — Quran, QCR, Asma. Proof a new category can be added |
| **`root` and `derivatives` panels are built and unused** | Enabling them for an Approach is a **data edit, not code** |
| **Compound trackable ids already store correctly** | `trackableId` is opaque; nothing parses it. Independent sub-tracks are storable today with no schema or rules change |
| **`renderWheelSidebar()` gained section headings in v08.02** | Opt-in per item — the first grouping ever rendered on a wheel |
| **Multi-assignee claiming** | One press already claims for several people |
| **Bulk confirm has four scopes** | chunk, week, person, class |
| **The backup file is a complete data export** | Every collection the account may read, plus raw JSON in a `<script type="application/json">` block — a **restore already has everything it needs** |
| **`quranrevival-render-test.html`** | a standalone harness for seeing renderers in isolation |
| **Offline persistence is already on** | `persistentLocalCache` + multi-tab |
| **`domains[]` is a free-form tag axis on every entry** | Written, stored, barely surfaced |

## 2.3 Existing data that is underused

| Data | Coverage | Currently used for |
|---|---|---|
| **Lemma** | 95.7% (4,832 distinct) | one line in the Derivatives panel |
| **Root** | 64.5% (1,642 distinct) | one badge in the Root panel |
| **POS** | 100% (359 strings, 46 atoms) | one line in Derivatives |
| **Transliteration** | 100% | one line, English mode only |
| **`tajweedText`** | 100% | one Approach declares `tajweed` |
| **`sajda`, `manzil`, `hizbQuarter`** | 100% | `manzil` unreachable; `sajda` surfaced nowhere found |
| **`activity` entries** | every claim | streaks and week-scope bulk confirm |
| **`ancestorIds[]`** | every subject | roll-ups in topic modules; **unused by the Quran** (single leaf) |
| **`confirmedStatus`** | every confirmed entry | **the Records table only** |
| **`domainIds[]`** | every entry | minimal UI |
| **`guide.measure`** | all 30 Approaches | displayed, never validated against |

## 2.4 Components that could support future features

| Component | Already supports |
|---|---|
| `renderScopedWheel()` | any segment count; opt-in in-slice text |
| `way-modal.js` | tabbed per-item cards, host-wired actions |
| `topic-renderer.js` | arbitrary-depth tree browsing with status chips |
| `bar-palette.js` | any popover |
| `drag-reorder.js` | drag ordering (used by the catalogue) |
| `assign-picker.js` | multi-person selection |
| `wheel-resize.js` / `text-size.js` | user-controlled sizing, persisted |
| `backup-file.js` | Firebase-free document generation, node-testable |
| `quran-search.js` + prebuilt indexes | the model for any new generated index |
| `feature-registry.js` | a built-vs-planned surface already wired to `about.html` |

---

## Part 3 — The five facts most likely to cause a mistake

1. **Approval changes no colour.** Every wheel reads `claimedStatus`.
2. **The two wheels have opposite axes**, and share a renderer.
3. **The landing wheel does not aggregate; Explore does.** They disagree by design.
4. **"Approach" is a Firestore row**, not a type — `catalogue-data.js` is only the seed.
5. **`app/quranrevival.html` is 12,051 lines** and contains Explore.
