# 15 — Current Feature Inventory

QuranRevival v08.02 · **what is real, what is partial, what is a name only**

Categorisation is based on **code inspection**, cross-checked against
`app/js/feature-registry.js` (the app's own list: 47 `built`, 7 `planned`) and
the project's `PHASE-*-STATUS.md` files. Where the registry and the code
disagree, the code wins and the disagreement is noted.

---

## A. FULLY IMPLEMENTED

Working end to end: a UI, a service, a Firestore write, and a read-back.

| Feature | Why it belongs here |
|---|---|
| **Google authentication** | `signInWithPopup`, `onAuthStateChanged` on every page; offline persistence on |
| **Multi-tenancy** | every document id is tenant-prefixed; enforced in `firestore.rules` (I13) |
| **Roles + memberships** | 6 roles, one document each, mirrored to `tenantMemberUids` for the rules |
| **"View as" role preview** | `effectiveRoles()` collapses; `scopedRoster()` narrows; `nav.js` shows the notice |
| **Tenant + owner bootstrap** | `createTenantWithOwner()`, `onboarding.html` |
| **People admin** | add/edit person, roles, managed children, archive |
| **Invites with quota** | `invites.js` + `inviteTokens` + `accept-invite.html` |
| **Catalogue seeding** | `ensureTenantCatalogueSeeded()`, diffing, chunked to 5 |
| **The 30 Approaches** | seeded, read by 9 consumers, rendered on the wheel |
| **Approach editing (v08.01)** | both names, section, position, all three Guide texts; **Remove** (archives) |
| **Approach sections (v08.02)** | editable, reorderable, stored on the tenant doc, grouped table, sidebar headings |
| **Subject tree** | 55 nodes, `parentId` + `ancestorIds[]`, re-parenting, archive |
| **Claims** | `claimStatus()` — one path, 9 call sites, all wrapped in `safeWrite()` |
| **Confirm / return** | `records.html` + 4 bulk scopes; I6 freezing verified in code |
| **Activity audit log** | one document per week, `arrayUnion`-append |
| **Quran study screen** | surah/ayah selection, 7 unit types, panels, Note view |
| **Study Unit switching** | the "Choose a Unit" palette; lazy `subject_quran` fetch |
| **Mastery Wheel** | 30 Approach segments for the current unit, sidebar, legend |
| **Explore** | 4 levels, 2 view toggles, 3 content palettes, floor/pool aggregation |
| **Word-by-Word / Root / Derivatives panels** | render real data; **display only** (see §B) |
| **Quran content pipeline** | 31 MB static JSON, 114 surahs, boundary indexes, promise-cached |
| **Search** | three prebuilt indexes, lazily fetched per language |
| **Bookmarks + Continue strip** | `resume{}` + `saved[]`, soft-remove only |
| **Ayah notes** | rich text per unitKey, sanitised on export |
| **Topic modules (×6)** | one shared controller, real claims |
| **Routine modules (×2)** | plus a day log and streak count |
| **Asma ul Husna** | 99 Names + ~33 more, collections, posters, Explore mode |
| **Ayah Collections (QCR)** | tenant-authored cross-surah collections |
| **Bilingual UI (en/bn)** | `t()`, `num()` Bengali digits, `langText()`, 2,293-line catalogue |
| **Backup** | one self-contained offline HTML file; sanitised; records refusals |
| **Admin self-check** | F-008, the screen that makes phases self-verifying |
| **Error surfacing** | `safeWrite()` everywhere (I15) |
| **Document envelope** | `envelope.js` on every write (I17) |
| **Taglines** | tenant-authored, owner/prime only |
| **Version badge** | single source of truth, 4 importing surfaces |

---

## B. PARTIALLY IMPLEMENTED

Real and working, but narrower than the name suggests.

| Feature | What works | What does not |
|---|---|---|
| **Word-by-Word system** | three panels render real data for 100% of words | **no word click, no word id, no word-level progress, no cross-ayah view.** Read-only display |
| **"Derivatives" panel** | shows POS + lemma correctly | **shows no derivatives.** No derivational data exists in the dataset |
| **Root panel** | root + a frequency badge | `rootCount` merges weak-final-radical roots, so 19 roots disagree with their own frequency; **no `roots-index.json` exists**, so "where else does this root occur" is unanswerable |
| **Teacher approval** | confirm/return/bulk all work and are stored | **gates nothing visual** — every wheel reads `claimedStatus`. A *returned* claim still shows green |
| **Teacher scoping** | per-**student**, enforced in the rules via `teacherStudentLinks` | **not per-subject** — a co-enrolled teacher has authority across every subject. A documented open gap |
| **Homework** | assign, mark, score, teaching notes | teacher scoping is per-**context**, not per-student (`isAssignmentCreator`); **not owner-verified** |
| **Monitor / reports** | aggregation, weekly/monthly, CSV, print | **not owner-verified**; Quran-rich, thin for other subjects |
| **Classes** | classes, teacher assignment, enrolment | *"the actual teacher-scoping enforcement still needs a second real teacher-only account to prove"* — the owner's own login bypasses it |
| **Curriculum, grades, resources** | units, plan, ladders/levels, `personLevels` | **entirely parallel to study progress** — the study path never reads them |
| **Approach creation** | edit, reorder, re-section, remove all work | **there is no "Add a 31st Approach"** — deliberately left unbuilt in v08.01 |
| **Non-Quran progress model** | one "Studied"/"Practised" trackable per module | no Approach-equivalent depth. **The app's biggest open educational question**, recorded as needing a design conversation |
| **Audio recitation** | a 1,042-line player with loop/timer | fetches **archive.org**, which this sandbox blocks — works for the owner, untestable here |
| **Language preference** | a real global setting | **per device** (localStorage). A Firestore sync was designed and deferred; `lang-sync.js` exists |

---

## C. PLACEHOLDER / EARLY IMPLEMENTATION

| Feature | State |
|---|---|
| **`rub` and `manzil` unit types** | `buildUnitKey.rub` and `.manzil` exist and `UNIT_TYPES` lists them, but there is **no picker option and no boundary index**. Declared and unreachable |
| **Translation-by-translator choice** | **Could not confirm from code.** The project's brief records a disabled `#translationChoiceSelect` placeholder, but no such element or identifier exists in the v08.02 source — it appears to have been removed since. The underlying limit is real and unchanged: `pull.js` packages exactly **one English and one Bangla** translation per ayah, so choosing a translator needs a re-pull, not just a picker |
| **`domains`** | the collection and `domainIds[]` are real and written, but the tagging UI is minimal |
| **`quranrevival-render-test.html`** | a genuine standalone render harness, not a user feature |
| **`migrate.html`** | historical migration tooling; migration was closed when the owner decided the old data was demo data |

---

## D. NOT CONNECTED

Present in the codebase but with no live consumer.

| Thing | Evidence |
|---|---|
| **`threads` / `messages` collections** | **Verified by grep: they appear ONLY in `collections.js`.** No reader, no writer, no UI. Messaging is deliberately deferred pending a real second teacher-only account |
| **`root` and `derivatives` panels** | fully built; **declared by zero of the 30 Approaches**. Reachable only via reading-screen toggles |
| **`renderMasteryWheel()`** | the older per-ayah wheel shape. Still exercised by `quranrevival-render-test.html`; the code calls it *"earmarked, not dead code"* |
| **`memberships.guardianOf[]`** | written on **every** membership creation (`identity.js:121`, `invites.js:198`, `people.js:90`/`:147`, `migrate.html:344`) — but **always as `[]`, and never populated afterwards.** Verified: no code path adds an element. `records.js:102` says so explicitly and uses `tenantPeople.managedByPersonId` instead, because checking `guardianOf[]` "would silently never fire". `firestore.rules`' own `isGuardianOf()` also reads `managedByPersonId`, not this field |
| **`enrolPerson()`'s `subjectIds[]` parameter** | recorded in the project's own notes as a dead parameter — subject-level scoping was never enforced |
| **`ladders` / `levels` / `personLevels`** | real and used by curriculum/grades, but **the study path never reads them** — parallel, not connected |
| **Firebase Cloud Storage** | not imported anywhere. No upload feature exists |

---

## E. EXPERIMENTAL / TRANSITIONAL

| Thing | Note |
|---|---|
| **`legacy/index.html` (v06.30)** | the pre-cutover single-file app, 10,146 lines. Reference only — **but it signs in to the same project and writes REAL data** |
| **`legacy-v07/` (v07.139)** | a frozen `cp -a` of `app/`, same caveat. Shares the 31 MB Quran data with the live app to stay at 2.6 MB, at the stated cost that reshaping that data would break it |
| **`catalogue-repair.js`** | a repair path for partial seeds |
| **`admin-self-check.html`** | deliberately built first (D8) so later phases are self-verifying |
| **`app/js/i18n` coverage tool** | the project's own rule: *"a to-do list, never evidence"* — it has been wrong about what it counts nine separate times |

---

## F. DELIBERATELY NOT BUILT

Not gaps — decisions, recorded in the standing brief.

| Not built | Why |
|---|---|
| Finance, Operations, medical records, facilities | *"Do not build unless explicitly asked"* |
| Messaging (threads, per-person inbox) | deferred pending a real second teacher account to verify safeguarding rules |
| Client-side delete | **D6/I4** — no delete rule exists anywhere |
| A 31st Approach | raised before v08.01; the owner did not ask for it |
| A build step / framework | **D4** — modular SDK from the CDN, no npm |

---

## G. Where the feature registry disagrees with the code

`app/js/feature-registry.js` is the app's own honest list and drives
`about.html`. Two mismatches worth knowing:

1. **Phases 5–9 and 13–14 are still listed as `planned` at the ID-range level**, but Phases 5, 6, 7, 8, 9 and 13 are substantially **built** (per the phase status files and the code). The registry reserves ID ranges rather than enumerating those phases' features. **The registry understates what exists.**
2. **Phase 12 (Remaining modules)** was found to be already delivered inside Phases 6 and 7; only its registry flag was stale, and it was corrected.

**Treat `feature-registry.js` as a floor, not a census.**

---

## H. Maturity summary

| Area | Maturity |
|---|---|
| Identity, roles, tenancy | **High** — heavily exercised, rules-enforced |
| Catalogue + Approaches | **High** — and newly extended (v08.01/02) |
| Tracking core (claims) | **High** — one path, invariant-guarded |
| Quran study screen | **High** — the most-built surface |
| Explore + wheels | **High** |
| Word-by-word | **Medium** — displays everything, does nothing |
| Approval | **Medium** — works, but affects no visual |
| Topic/routine modules | **Medium** — one trackable each |
| Monitor, Homework | **Medium** — built, not owner-verified |
| Classes, Curriculum | **Medium** — built, partly verified |
| Messaging | **Absent by decision** |
