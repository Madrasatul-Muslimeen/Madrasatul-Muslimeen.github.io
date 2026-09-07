# 03 — User Journeys

QuranRevival v08.02 · every journey traced against the real code

Notation used throughout:

```
START → Screen/component → User action → Data change → Next screen → END
```

---

## Journey 1 — New user

```
START
  │
  ▼  app/index.html  (28 lines — a redirect stub only)
  │   redirects into the app
  ▼  app/quranrevival.html  — the landing page for everyone
  │
  │  ACTION: "Sign in with Google"
  │  CODE:   signInWithPopup(auth, new GoogleAuthProvider())   :4233
  ▼
  │  onAuthStateChanged fires                                   :11984
  │  CODE:   bootstrapContext(db, uid, defaultTenantId)
  │          → getMyMemberships()  = query tenantMemberUids by uid
  ▼
  ├── memberships.length === 0 ──▶ app/onboarding.html
  │                                 ACTION: create a tenant
  │                                 CODE:   createTenantWithOwner()  identity.js:47
  │                                 WRITES: tenants, tenantPeople, memberships,
  │                                         tenantMemberUids, userIndex
  │                                 THEN:   app/catalogue.html → seed the catalogue
  │                                 CODE:   ensureTenantCatalogueSeeded()  catalogue.js:152
  │                                 WRITES: 55 subjects + 39 trackables, in chunks of 5
  │                                 END (tenant ready)
  │
  └── has memberships ──▶ pickContext() chooses tenant + roles
                          ▼  loadContextData()                   :5458
                          END (study screen ready)
```

**Two things worth knowing.** The catalogue seed is an **explicit admin action
on `catalogue.html`**, not part of startup — a new tenant has no Approaches
until someone runs it. And it commits in **chunks of 5** because of the
Firestore rules `get()` budget (`SEED_CHUNK_SIZE`, `catalogue.js:127`).

**An alternative entry** exists via invitation: `app/accept-invite.html`
consumes an opaque token from `inviteTokens` and links a Google account to an
already-created `personId`.

---

## Journey 2 — Student Quran study (the spine of the app)

```
START  app/quranrevival.html
  │
  ▼  loadContextData()                                          :5458
  │    ONE parallel wave, deliberately (load-speed round):
  │      • tenantPeople  (roster, by tenantId)
  │      • tenants/{id}  (tenant doc — also carries approachSections)
  │      • getTrackables(db, tenantId)      ← THE 30 APPROACHES
  │      • getSurahIndex()                  ← static JSON, not Firestore
  ▼
  │  quranTrackables = allTrackables.filter(subjectId === "quran"
  │                                         && status !== "archived")   :5481
  ▼
  │  await Promise.all([ refreshProgramMap(), loadSurah() ])     :5518
  ▼
  │  refreshChunkAndWheel()                                      :5565
  │    reads records/{tenant}__{person}__surah_{n}   ← ONE document
  ▼
  │  renderWheel()                                               :5701
  │    approachStatusesForCurrentUnit()                          :5685
  │      → one segment per Approach, coloured by ITS OWN claim on THIS unit
  ▼
  SCREEN: Mastery Wheel + sidebar (Approach names, grouped by section since v08.02)
END
```

---

## Journey 3 — Selecting a Surah

```
START  Study options → Surah <select>
  │  ACTION: choose a surah
  │  CODE:   surahSelect change handler → loadSurah()
  │  DATA:   getSurah(n)  →  fetch /tools/quran-data-pull/output/surahs/surah_NNN.json
  │          (promise-cached per surah; the browser's HTTP cache makes repeats free)
  │  NOTE:   NO Firestore read for the text itself
  ▼
  │  refreshChunkAndWheel()  → reads records chunk `surah_{n}`   ← ONE Firestore read
  ▼
  │  renderWheel() + the reading screen re-render
END
```

Surah names come from `surah-index.json` (114 rows) and render through the i18n
layer, so a Bangla reader sees Bangla names with Bengali digits.

---

## Journey 4 — Selecting an Ayah

```
START  Study options → Ayah picker, OR the ▲▼ ayah-nav buttons, OR a wheel click
  │  ACTION: choose/step an ayah
  │  CODE:   currentAyahNum = n  →  renderWheel() + reading re-render
  │  DATA:   NO new fetch — the whole surah is already in memory
  ▼
  │  If the Study Unit is "ayah", the unit key changes with it:
  │     buildUnitKey.ayah(currentSurahNum, currentAyahNum)  →  "ayah:2:255"
  │  If the unit is wider (surah/juz/…), the ayah moves but the UNIT does not.
END
```

**A real subtlety.** `unitRendersWhole()` (`:4800`) decides whether an Ayah
picker is even offered: when the reading draws the *whole* chosen unit at once
and that unit spans more than one ayah, nothing on screen depends on which ayah
is "current", so the picker would move nothing. Mushaf-over-single-ayah is the
one whole-unit view that still needs it.

---

## Journey 5 — Studying an Approach

```
START  Mastery Wheel
  │  ACTION: tap a wheel slice (or its sidebar row)
  │  CODE:   attachScopedWheelClickHandler → cb(seg.dataset.key)   mastery-wheel.js:346
  │          the key is the trackableId
  ▼
  │  changeCurrentTrackable(id)                                   :5793
  │  → opens the NOTE VIEW, scoped to (this Approach × the current unit)
  ▼
  SCREEN: Note view
  │   • the Approach's Guide (What / How / Measure) — renderGuideTab()
  │   • the panels the Approach's own `panels[]` declares
  │   • the Track card, with a status picker and a Claim button
  ▼
  │  PANELS resolved by ayah-renderer.js:206
  │     PANEL_ORDER = ["text","tajweed","wordByWord","root","derivatives",
  │                    "notes","reflection","writing","checklist"]
  │     plus transport controls: audio, loop, timer, resource
END
```

**A panel name not in the map renders nothing, silently.** And `root` /
`derivatives` are built but declared by **no** Approach — see document 10.

---

## Journey 6 — Updating learning status  ·  Journey 7 — Claiming progress

These are one journey in the code — **the single most important trace in the
application.**

```
START  Note view → Approach card → status <select> → "Claim"
  │
  ▼  wireApproachEmbed()'s claim handler          app/quranrevival.html:10967
  │    assignees = checkedAssignees(...)          ← may be SEVERAL people at once
  │
  ▼  safeWrite(() => claimStatus(db, {...}))      errors.js:107   (I15)
  │
  ▼  claimStatus()                                app/js/records.js:154
  │    1. isValidStatus(statusId)                 ← throws on an unknown status
  │    2. chunkKeyFor(unitKey, subjectId)         records.js:53
  │         ayah|range|surah|ruku  → "surah_{n}"
  │         juz|hizb|page|…        → "subject_quran"
  │    3. entryKey = `${unitKey}::${trackableId}`
  │    4. getSubjectConfirmationOverride()        ← READ subjects/{t}__quran
  │    5. computeConfirmationRequired()           ← 6 role gets + 1 tenantPeople get
  │    6. getDoc(records/{t}__{p}__{chunk})       ← previous entry
  │                                                 ── 9 reads in total ──
  ▼  WRITE — a dot-path update on ONE entry, never the whole map
  │    updateDocument(..., { [`entries.${entryKey}`]: entry })   records.js:189
  │
  │    self-confirmed →  confirmState "confirmed", confirmedStatus := statusId
  │    needs approval →  confirmState "pending",   confirmedStatus UNCHANGED (I6)
  │
  ▼  logActivity(db, {...})                       activity.js
  │    appends to activity/{t}__{p}__{weekKey}    ← audit log, one doc per week
  │
  ▼  RE-READ the document the claim landed in
  │    chunkKey === "subject_quran" → ensureQuranSubjectChunk({force:true}); renderWheel()
  │    otherwise                    → refreshChunkAndWheel()
  ▼  renderNoteViewNow()  — rebuilds the card against the fresh chunk
  ▼  WHEEL RECOLOURS
END
```

**Note the multi-assignee shape.** One press can claim for several people
(`Promise.all(assignees.map(...))`), which is decision D10's "teach several
children, then log each in turn" workflow made real.

---

## Journey 8 — Teacher approval

```
START  app/records.html   ← the ONLY confirm/return UI in the application
  │
  ▼  loadContextData()                             records.html:316
  │    parallel: roster, tenant doc, subject tree, trackables, domains
  │    canConfirm = viewAsRole !== "student"        :332
  ▼  choose a person → choose a chunk → optional "Pending only" filter
  │    getRecordsChunk()  /  listPendingForPerson()
  ▼  renderEntries()                                :428
  │
  ├── ACTION "Confirm" ──▶ confirmEntry()           records.js:201
  │      WRITES: confirmedStatus := claimedStatus  ← FROZEN (I6)
  │              confirmState := "confirmed"
  │              confirmedByPersonId, confirmedAt stamped
  │
  ├── ACTION "Return"  ──▶ returnEntry()            records.js:219
  │      WRITES: confirmState := "returned", returnNote
  │      LEAVES: confirmedStatus / confirmedAt UNTOUCHED
  │
  └── ACTION bulk ──▶ bulkConfirmChunk (a surah) | bulkConfirmWeek (a week)
                      | bulkConfirmAllPendingForPerson | bulkConfirmClass
  ▼  refreshChunk() → table re-renders
END
```

```
⚠ THE JOURNEY STOPS HERE.

No wheel changes. No Explore colour changes. Nothing else in the application
reads confirmedStatus — every visual surface reads claimedStatus. A RETURNED
claim still shows green on the Mastery Wheel.
```

---

## Journey 9 — Guardian interaction

```
START  any page
  ▼  bootstrapContext → roles include "guardian"
  ▼  scopedRoster(roster, effRoles, myPersonId)     session-context.js:160
  │    → roster.filter(p => p.id === myPersonId || p.managedByPersonId === myPersonId)
  ▼  the Person <select> shows only themselves + their own children
  │
  ├── study/claim FOR a child:
  │     personId = child, claimedByPersonId = guardian
  │     computeConfirmationRequired(child) → child is managed → TRUE → pending
  │
  ├── confirm the child's claims: records.html, via isGuardianOf()
  │
  └── their OWN study: self-confirmed (guardian returns false at the role check)
END
```

---

## Journey 10 — Viewing Explore

```
START  Quran study screen → Explore tab                          :6426
  ▼  openExplore()                                                :6094
  ▼  ensureExploreChunksLoaded()                                  :6647
  │    getJuzIndex(), getPageIndex()                    ← static JSON
  │    expand all 30 juz through ayahCoverage() → the set of surahs touched
  │    Promise.all → getRecordsChunk("surah_N") for EACH        ≤114 reads
  │    + ensureQuranSubjectChunk({force:true})                    +1 read
  │    + buildExploreWiderSpans()                                 :6561
  ▼  ── UP TO 115 FIRESTORE DOCUMENT READS, ONCE PER OPEN ──
  ▼  renderExplore()  → router on exploreLevel                    :6801
  │     quran → juz → surah → ruku'
  ▼  every level renders FROM MEMORY — drilling deeper costs no further reads
END
```

---

## Journey 11 — Viewing the progress wheel

**There are two wheels with opposite axes. Confusing them is the easiest
mistake to make in this codebase.**

```
LANDING MASTERY WHEEL                        EXPLORE WHEEL
one segment per APPROACH                     one segment per QURAN UNIT
fixed: the current unit                      fixed: the selected Approach
NO aggregation — direct claim only           pooling (floor down, weakest-link up)
1 Firestore read                             up to 115 per open
        └──────── both rendered by renderScopedWheel() ────────┘
                       mastery-wheel.js:300
```

```
START (landing)
  ▼ currentUnitInfo()                                             :4806
  ▼ chunkForUnitInfo() / ensureUnitChunkThen()                    :5655 / :5665
  ▼ approachStatusesForCurrentUnit()                              :5685
  │    statusId = entries[`${unitKey}::${trackable.id}`]?.claimedStatus ?? "not_started"
  ▼ renderScopedWheel(items, { centerArabic, centerRef })
  ▼ + renderWheelSidebar() + renderWheelLegend()
END
```

**Why the landing wheel does not aggregate**, in the code's own words: the card a
slice opens claims *this* unit, so a green slice over "Not claimed yet" would be
the screen contradicting itself. **Consequence: a Juz whose every ayah is
mastered still reads `not_started` here until the Juz itself is claimed.**

---

## Journey 12 — Switching study units

```
START  the "Choose a Unit" gold capsule above the wheel (v07.139)
  ▼  a bar-palette popover opens                      bar-palette.js
  │    Study Unit · the unit's own number · From/To for a Range
  │    EVERY control is a MIRROR of the canonical one in Study options
  ▼  goToUnitNumber()                                             :4986
  ▼  currentUnitInfo() now returns a different unitKey + chunkKey  :4806
  │
  ├── ayah / range / surah / ruku'  → chunkKey "surah_{n}"    ALREADY IN MEMORY
  │
  └── juz / hizb / page             → chunkKey "subject_quran"  ← A DIFFERENT DOCUMENT
        ensureQuranSubjectChunk()                               :5628
        fetched ON FIRST USE, cached per person, then renderWheel() re-runs
        → someone who never picks these three NEVER fetches it (invariant I9)
  ▼  renderWheel() recolours: same 30 Approaches, now against the new unit key
END
```

---

## Journey 13 — Word-by-word study

```
START  Study options (or the reading badge's ⋮ menu)
  ▼  tick "Word by Word" / "Root" / "Derivatives"
  │    canonical checkboxes: wbwShowToggle / rootsToggle / derivativesToggle   :3445–3457
  │    the ⋮ menu flips the SAME checkboxes                ayah-note-renderer.js:802
  ▼  gate: canWbwRoot = noteScopeCanWbwRoot()                     :9801
  ▼  per-ayah strips rendered by ayah-renderer.js
  │    renderWordByWordPanel()  :113   Arabic + transliteration + gloss
  │    renderRootPanel()        :155   word + root + rootCount badge
  │    renderDerivativesPanel() :177   word + POS + lemma
  ▼  DATA: already in memory — the words come from the loaded surah JSON
END
```

```
⚠ THERE IS NO WORD CLICK.

Verified across the whole application: no click handler anywhere references a
word, and `.wbw-word` carries no pointer cursor. `data-position` is emitted but
nothing listens to it. The word-by-word system is READ-ONLY DISPLAY.
```

---

## Journey 14 — Topic-module study (six modules share one journey)

```
START  Modules → Deen Study / Arabic / Hadith / General / Nature-Life / Life Skill
  ▼  a ~149-line shell page calls:
  │    initTopicStudyPage({ moduleId, trackableId, rootSubjectId })   topic-study.js
  ▼  browse the SUBJECT TREE (branch → branch → leaf)
  │    the tree IS the topic hierarchy — Phase 2's isTrackable/ancestorIds,
  │    not a second parallel structure
  ▼  a leaf topic → open its resource → Way modal → Claim
  │    unitKey = buildUnitKey.topic(topicId)     → "topic:xyz"
  │    chunkKey = `subject_{subjectId}`
  ▼  claimStatus()  — the SAME single write path
END
```

**Health and Learn Deen On-the-Go** use `initRoutineStudyPage()` instead — same
shape, plus a per-occurrence day log and a streak count. **Asma ul Husna** uses
`initAsmaStudyPage()` with `buildUnitKey.name(number)`.

---

## Journey 15 — Other real journeys, in brief

| Journey | Entry | Code |
|---|---|---|
| **Bookmark / resume** | the bookmark badge; Continue strip | `bookmarks.js`, `continue-strip.js`, `bookmark-nav.js`, `bookmark-popover.js` |
| **Ayah notes** | Note view → Notes | `ayah-notes.js`, `note-popup.js` — rich text, one doc per person keyed by unitKey |
| **Audio recitation** | the transport bar | `audio-player.js` (1,042 lines) — *fetches archive.org, blocked in this sandbox* |
| **Search** | the Search control | `quran-search.js` + `search-{en,ar,bn}.json`, fetched on first use only |
| **Monitor / reports** | Operation → Monitor | `monitor.js` — weekly/monthly, CSV export, print |
| **Homework** | Operation → Homework | `homework.js` — assign, mark, score |
| **Backup** | Home → Settings → Backup | `backup.js` + `backup-file.js` — one self-contained offline HTML file |
| **Ayah Collections (QCR)** | Explore palette | `qcr.js`, `qcr-data.js` — tenant-authored cross-surah collections |

---

## Confusing or complex journeys — observations only

**1. The two wheels have opposite axes.** Landing = Approaches for one unit;
Explore = units for one Approach. Both use the same renderer and look alike.
This is the single most likely misreading of the codebase.

**2. Approval is a dead end visually.** A teacher confirms, and *nothing on any
wheel changes* — because everything reads `claimedStatus`. A returned claim
still shows green. This is a real architectural inconsistency, documented here
and not fixed.

**3. The landing wheel and Explore disagree on purpose.** A Juz whose ayahs are
all mastered reads `not_started` on the landing wheel and green in Explore. Both
are correct for their own screen; the difference is invisible on screen.

**4. The claim journey costs 9 reads before its write** — and multiplies by the
number of assignees.

**5. Explore's 115-read open** is by far the heaviest operation in the app.

**6. Study Unit vs. current ayah** — with a wide unit selected, moving the ayah
changes the reading screen but *not* the unit being claimed. `unitRendersWhole()`
hides the Ayah picker where it would move nothing, which helps, but the mental
model still takes a moment.

**7. `subject_quran` is fetched lazily and can briefly read `not_started`.**
The first time a Juz/Hizb/Page unit is picked, the wheel honestly shows
"unfetched" until `ensureUnitChunkThen()` lands and redraws.

**8. A stale "View as" preview survives in localStorage** across reloads and
devices, and makes admin controls look missing — a recorded trap.
