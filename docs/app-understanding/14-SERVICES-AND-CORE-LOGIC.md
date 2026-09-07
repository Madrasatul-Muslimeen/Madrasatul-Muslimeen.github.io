# 14 — Services and Core Logic

QuranRevival v08.02 · the functions that carry the business rules

Format for each: **Name · File · Purpose · Inputs · Outputs · Database ·
Depends on**.

---

## 1. Progress — `app/js/records.js` (393 lines)

**The most important module in the application.** Every claim, confirmation and
return in every module passes through it.

### `claimStatus(db, {...})` — line 154
> **THE single write path for all progress in the application.**

| | |
|---|---|
| **Purpose** | record (or update) a claimed status for one `(person, unit, Approach)` |
| **Inputs** | `tenantId`, `personId`, `subjectId`, `unitKey`, `trackableId`, `statusId`, `notes`, `domainIds`, `claimedByPersonId`, `claimedByUid` |
| **Outputs** | `{ chunkKey, entryKey, needsConfirmation }` |
| **Reads** | **9** — 1 subject + 6 roles + 1 tenantPeople + 1 chunk |
| **Writes** | 1 dot-path update (or a create) |
| **Throws** | on a status outside the six |
| **Depends on** | `chunkKeyFor`, `isValidStatus`, `parseUnitKey`, `getSubjectConfirmationOverride`, `computeConfirmationRequired`, `envelope.js` |
| **Called by** | 9 sites (see 07 §10), all wrapped in `safeWrite()` |

### `chunkKeyFor(unitKey, subjectId)` — line 52
Pure. Decides which document a claim lands in — `surah_{n}` for
`ayah`/`range`/`surah`/`ruku`, `subject_{subjectId}` otherwise. **No database.**
Mirrored exactly by `currentUnitInfo()` so the screen can never disagree with the
document.

### `computeConfirmationRequired(db, tenantId, personId, subjectOverride)` — line 124
Decides whether a claim waits for review. **An ordered cascade, not a union** —
see 02 §3 for the consequence (any admin/teaching role exempts a person even if
they also hold `student`). Reads 7 documents, all deterministic `getDoc()`s,
never a query.

### `confirmEntry` (201) · `returnEntry` (219)
Approve / send back. Both enforce **I6** — `returnEntry` leaves
`confirmedStatus` and `confirmedAt` frozen.

### `bulkConfirmChunk` (262) · `bulkConfirmWeek` (274) · `bulkConfirmAllPendingForPerson` (297) · `bulkConfirmClass` (322)
Four scopes. `bulkConfirmWeek` reads the **activity** document to find which
entries a week touched, then confirms across however many chunks they live in.
`bulkConfirmClass` loops active `student` enrolments. All skip anything not
currently `pending`.

### `getRecordsChunk` (66) · `listAllRecordsForPerson` (354) · `listPendingForPerson` (372)
The read side. `listAllRecordsForPerson` is **the only list query against
`records`**, and it is deliberately list-safe (both filter fields are exactly
what the rule checks).

---

## 2. Catalogue — `app/js/catalogue.js` (693 lines)

### `getTrackables(db, tenantId)` — line 301
> **The read that defines "the 30 Approaches" at runtime.**

One query on `tenantId`, sorted by `order`. **Returns all 39 trackables** — the
30 Approaches *and* the 9 module-wide ones. Callers filter. Nine consumers
across the app read through this one function.

### `ensureTenantCatalogueSeeded(db, tenantId, uid)` — line 152
Copies `SUBJECT_TEMPLATES` + `APPROACH_TEMPLATES` + `TOPIC_TRACKABLE_TEMPLATES`
into a tenant. **Diffs by id**, so a partial run repairs itself. Commits in
**chunks of 5** (`SEED_CHUNK_SIZE`) because of the Firestore rules `get()`
budget. Explicit admin action, never on startup.

### `syncUnneditedTrackableNames(db, tenantId, uid, { keepSectionNames })` — line 319
Refreshes `name`/`groupName` from the platform templates for copies with
`edited !== true`. **The `keepSectionNames` guard is new in v08.02** and fixes a
trap that would otherwise have shipped silently: renaming a *section* is
deliberately not an edit to an Approach, so without the guard this function
reverted every section rename on the next landing-page load — and, because the
sync is fire-and-forget off the blocking path, **the damage only showed the time
after**.

### `reorderTrackables(db, tenantId, orderedIds, current, uid)` — line 561
Writes `order` for **only the documents whose number actually changed** — a
one-place nudge writes exactly 2. **Deliberately does not go through
`editCatalogueNode()`**, which would stamp `edited: true`: reordering is not the
tenant claiming authorship of an Approach's wording, and freezing all 30 names
would cut the tenant off from future platform translation fixes.

### `saveApproachSections(db, tenantId, sections, trackables, uid)` — line 641 *(v08.02)*
Writes the section list to `tenants/{tenantId}.approachSections` **and carries
every affected Approach with it**, so `group`, `groupName` and the tenant's list
can never disagree. Entries carry `from` (the section number an entry used to
be, or null if new), which is what lets a reorder move each Approach to its
section's new number in the same pass. Order-only writes, no `edited: true`.

### `sectionsFromTenantDoc(tenantData)` (602) · `tenantOwnsSections(tenantData)` (617)
Pure. Return the tenant's own sections or the platform default; and the flag
`syncUnneditedTrackableNames()` reads.

### `computeAncestorIds(nodes)` (68) · `getSubjectTree` (294) · `reparentSubject` (447) · `setTrackableStatus` (541)
Tree machinery and archive/restore. `setTrackableStatus` is what the **Remove**
button calls — it writes `status: "archived"`, never a delete.

---

## 3. Explore aggregation — inside `app/quranrevival.html`

Not a module — these live inline. **The whole aggregation layer of the app.**

| Function | Line | Purpose |
|---|---|---|
| `ayahCoverage(startSurah, startAyah, endSurah, endAyah)` | 6475 | **the single containment primitive in the application** — expands any boundary into per-surah ayah ranges |
| `poolCoverageStatus(coverage, trackableId)` | 6491 | **MIN** — weakest-link pooled status; skips `not_applicable` (I7); returns `null` if nothing is countable |
| `effectiveAyahStatus(surah, ayah, trackableId)` | 6530 | **MAX** — a wider claim is a floor under every ayah it covers |
| `buildExploreWiderSpans()` | 6561 | flattens every non-`ayah` claim into `Map<trackableId, Span[]>`; lazily loads the hizb table and ruku'-bearing surahs |
| `ensureExploreChunksLoaded()` | 6647 | the ≤115-document load, once per Explore open |
| `segTitle(label, statusId, labelsById)` | 6671 | tooltip text, routed through `statusLabelsById()` so no raw id ever prints |

**All read `claimedStatus`, never `confirmedStatus`.**

## 4. Landing-wheel logic — also inline

| Function | Line | Purpose |
|---|---|---|
| `currentUnitInfo()` | 4806 | **the single source of truth** for the selected unit — `{unitType, unitKey, chunkKey, label}` |
| `currentUnitAyahBounds()` | 4765 | a unit's extent **within the open surah** |
| `unitRendersWhole()` | 4800 | whether an Ayah picker would move anything |
| `refreshChunkAndWheel()` | 5565 | re-read the surah chunk, patch Explore's cache, redraw |
| `ensureQuranSubjectChunk({force})` | 5628 | **lazy** fetch of the Quran-wide chunk, cached per person (I9) |
| `chunkForUnitInfo(info)` | 5655 | pick the in-memory chunk, or null |
| `ensureUnitChunkThen(info, redraw)` | 5665 | fetch-once-then-redraw; **cannot loop** |
| `approachStatusesForCurrentUnit()` | 5685 | one status per Approach — **no aggregation** |
| `renderWheel()` | 5701 | builds `items[]` and calls the renderer |
| `loadContextData()` | 5458 | the startup wave — 4 parallel loads |

---

## 5. Rendering — `app/js/mastery-wheel.js` (410 lines)

**Pure (I2).** Never imports Firebase or `records.js`.

| Export | Line | Purpose |
|---|---|---|
| `STATUS_COLORS` | 38 | the six fills; `not_applicable` is an SVG **pattern** |
| `renderScopedWheel(items, opts)` | 300 | **both wheels.** `360 / items.length` — no fixed segment count |
| `renderMasteryWheel(ayahStatuses, opts)` | — | the older per-ayah shape, still exercised by the render-test page |
| `attachScopedWheelClickHandler` | 346 | hands back the **raw string key** |
| `renderWheelLegend(labelsById)` | 353 | six swatches |
| `renderWheelSidebar(items, labelsById)` | 377 | the list beside the wheel — **names its sections since v08.02** |
| `attachWheelSidebarClickHandler` | 406 | same key contract as the wheel |
| `wrapWheelLabel(text, maxLen)` | 242 | two-line wrapping, never truncating |
| `polarToCartesian` / `segmentPath` | — | the geometry, hand-written |

## 6. `app/js/way-modal.js` (254 lines) — pure

`renderTrackTab` (81) · `renderGuideTab` · `renderBreakdownTab` (99) ·
`renderCoverageTab` (124) · `renderStreakTab`.

**Holds the app's only real percentage** — the Breakdown histogram. The Coverage
tab is a **count**, not a percentage. The claim button is emitted here and wired
by the host page.

## 7. `app/js/unit-keys.js` (166 lines) — pure, no database

`UNIT_TYPES` (14) · `buildUnitKey` (20) · `parseUnitKey` (35) ·
`rukuIndexInSurah` (53) · `unitTypeLabel` / `unitKeyLabel` · `surahOf` ·
**`STATUSES` (110)** · `statusLabel` (139) · `statusLabelsById` ·
`isValidStatus` · **`summarizeStatuses` (157)**.

`summarizeStatuses` is the app's only ratio primitive, with just two callers
(`way-modal.js:100`, `monitor.js:158`). Returns `ratio: null` — not `0` — when
nothing is countable.

## 8. Quran data — `app/js/quran-data.js` (170 lines)

`getSurah` · `getAyah` · `getAyahRange` · `getSurahIndex` · `getJuzIndex` ·
`getPageIndex` · `getHizbIndex` · `getSearchIndex(lang)`.

**Every loader is promise-cached at module level.** Only `getSurahIndex()` is on
the startup wave, and it is a static file, not Firestore. **This module never
touches Firestore.**

## 9. Cross-cutting infrastructure

### `app/js/envelope.js` (99) — I17
`createDocument` · `updateDocument` · `commitEnvelopeBatch`. Stamps
`schemaVersion`, `createdAt`, `updatedAt`, `createdBy` on every write, and
**refuses to run without a uid**. Every service write goes through it.

### `app/js/errors.js` (115) — I15
`safeWrite(writeFn, context)` returns `{ ok, result }` or `{ ok: false, entry }`
with a plain-language message, and buffers failures for the session.
**Every claim call site wraps its write in this.**

### `app/js/session-context.js` (220)
`getMyMemberships` (87) · `canUseViewAs` (123) · `effectiveRoles` (138) ·
`scopedRoster` (160) · `bootstrapContext` (217). `effectiveRoles` **collapses**
to the previewed role alone — never a union.

### `app/js/activity.js` (152) — I3
`logActivity` — `arrayUnion`-appends to one document per week. Carries
`viaProgramId`/`viaSessionId`, which live here and **never** in a record key.
**Read by id only — there is no list query for activity anywhere.**

### `app/js/labels.js` (192)
`statusLabel` re-exports · `confirmStateLabel` · `activityActionLabel` ·
`roleListLabel` · `entityStatusLabel` · **`posLabel` (182)**. Exists so pure
renderers can print text without importing Firebase.

## 10. Page controllers

| Function | File | Drives |
|---|---|---|
| `initTopicStudyPage({moduleId, trackableId, rootSubjectId})` | `topic-study.js` | **6 study pages** |
| `initRoutineStudyPage({...})` | `routine-study.js` | **2 study pages** |
| `initAsmaStudyPage()` | `asma-study.js` | 1 study page |

Each does the same shape: bootstrap context → load roster/trackables → browse →
claim via `claimStatus()` → log activity.

## 11. Reporting and export

| Function | File | Purpose |
|---|---|---|
| `monitor.js` aggregation | `monitor.js:123`, `:158` | per-status counts + `summarizeStatuses` roll-up; weekly/monthly, CSV, print |
| `backup.js` | 310 lines | reads **everything the signed-in account may read**, through the app's own existing helpers, and **records refusals rather than throwing** |
| `backup-file.js` | 477 lines | builds one self-contained offline HTML file. **Imports nothing that touches Firebase**, so it is testable in plain node. Sanitises notes — the only HTML in the app — dropping every attribute |

---

## 12. Dependency rules a change must respect

1. **A pure renderer must never import Firebase** (I2). If it needs a label, the label goes in `labels.js`.
2. **Every write goes through `envelope.js`** (I17) and is wrapped in `safeWrite()` (I15).
3. **Collection names come from `collections.js`** — never a bare string.
4. **There is no delete** (I4/D6) — archive, revoke, return, mark consumed.
5. **Nothing joins the startup path without being flagged** (I9).
6. **Unit keys are permanent** (I5) — changing `chunkKeyFor()` is a data migration.
7. **Confirmation is frozen** (I6) — only `confirmEntry()` may touch those four fields.
8. **Every user-visible name is language-keyed** (I11).
