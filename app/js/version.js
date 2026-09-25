// QuranRevival's own version number (confirmed with the owner 9 Aug 2026;
// the v08 line opened 6 Sep 2026): first two digits bump on a big overhaul
// -- 08 = this overhaul, opened after the v07 line was closed and frozen at
// `legacy-v07/` (07 was the cutover to production, 9 Aug 2026) -- and the
// last two digits bump on every new feature within it.
// Single source of truth -- every place that shows the version imports
// this, never retypes the string.
// v08.29 on the unmerged Hadith branch `feature/hadith-study`; `main` is on
// v08.27. NEITHER v08.28 NOR v08.29 HAS EVER BEEN DEPLOYED -- both are
// development milestones: v08.28 is Hadith Stage A, v08.29 is Hadith Stage B
// and the final integration-candidate version.
//
// The jump past v08.27 is a COLLISION RESOLVED rather than a gap. This branch
// reserved v08.27 while `main` was on v08.25; `main` then merged v08.26 (the
// nav fit) and shipped its own v08.27 (the number pickers), so for a while two
// different builds carried one number -- exactly the thing a version number
// exists to prevent. Resolved by moving to v08.28 and then v08.29, each read
// off `main` and every other branch at the time of the bump rather than
// assumed. This comment led with "08.28" after Stage B had already moved the
// constant to 08.29: a stale comment on the single source of truth is how the
// next reader is misled, so read the constant, and read the next free number
// off `main` at the time of a bump.
// 08.30, allocated by the Master Architect for the QuranRevival MAP Phase 4
// tranche (D1 Reading, D2 Listening, D4 WbW). Read off `main` at the time of
// the bump, not assumed, and allocated centrally rather than chosen here --
// two independent builds carried 08.27 on 18 Sep 2026, which is exactly what a
// version number exists to prevent.
//
// BUILT, NOT SHIPPED. The Activity evidence Rules are not deployed (E1), so the
// subcollection is closed to every client and the tranche must not be released.
// 08.32: Basic Arabic lemma occurrence navigation, allocated by the MMSA Master Architect on 21 Sep 2026.
// 08.33: three Study-options-panel truncations fixed at phone width --
// tenantSelect (own row below 580px, since its content is free text of any
// length and cannot safely be shortened), Study Unit/Surah (wrap to two
// lines below 480px, a genuine shortage of space per Owner Control Gate item
// O3b), and the Bangla-only drillModeSelect (same wrap, same breakpoint).
// Allocated by the MMSA Architect on 22 Sep 2026, under the Owner's own
// standing authorisation for fix-list work (issue "the fix list").
// 08.34: MAP Phase 4 Activity evidence persistence ENABLED -- the governed
// decision in app/js/study-evidence-readiness.js flipped ready:false to
// ready:true, now that the Phase 3-6 Rules are deployed (confirmed by the
// Owner in the Firebase Console) and Phase 3 word-by-word progress was
// proven to save and reload on a real phone the same day ("It worked,
// switch on Phase 4."). The ✓ on #readBar, the Listening gate and the
// Word-by-Word gate all start persisting real Activity evidence from this
// version onward. Allocated by the MMSA Architect on 22 Sep 2026; see
// docs/reports/2026-09-22-map-phase4-evidence-persistence-enabled.md.
// 08.35: tap a word on the Mushaf-page Read view to open its Word Card
// (issue #188, PR #190). hifz-renderer.js's per-word glyph spans already
// carried real word identity (w.loc); this attaches the same
// data-word-occurrence id the rest of the app's word-tap already uses, so
// the existing shared click listener opens the card with no new wiring.
// Word-position parity verified across all 6,236 ayahs (3 real
// divergences found and corrected). Allocated by the MMSA Architect.
// 08.36: the same tap-to-open-Word-Card treatment for the normal, everyday
// Arabic text -- Read view and Note view both (issue #189, PR #191). The
// flowing Arabic becomes word-tappable when Tajweed display is off;
// Tajweed-on stays exactly as it was (tajweed assimilation colours across
// a word boundary on ~65% of ayahs, measured, so it cannot be safely
// split per word without data that doesn't exist here). Allocated by the
// MMSA Architect.
// 08.37: MAP Phase 6 (P6-F) Mapping My Journey round 1 -- a real, reachable
// screen (app/journey-map.html) over the already-accepted Phase 6 data
// layer, which had sat built and unreached since P6-A/P6-E. All three
// screen options the Owner asked for ("don't wait for my design, build all
// three with a toggle") in one switchable shell over one shared data load:
// Folders (system folders first, then the person's own; create/file/move),
// Timeline (newest-first, grouped by day, filter chips) and Path (an
// honest first pass -- a straight date-ordered track; the region/
// side-trail metaphor is explicitly not built, reason recorded in code and
// CHANGELOG.md, since a Note filed in two folders at once cannot honestly
// occupy two places on one line). Nav entry under Home, alongside Records/
// Monitor/About. Read-only for everyone but the Note owner, mirroring
// firestore.rules; every write gated on isSelfSelected(); Note bodies only
// ever rendered through sanitizeNoteHtml(). Full Bangla translation from
// the first commit (33 keys, verified programmatically). No new exported
// function on journey-map-service.js or note-foundation.js; no Rules,
// index or schema change. Independently re-verified by the Architect
// before merging (fresh full-history checkout, all 10 relevant suites --
// the 8 governance suites plus journey-map-boundary.mjs and the new
// journey-map-screen.mjs -- re-run clean, diff read by hand). Layout was
// NOT measured in a real browser -- this sandbox had no Playwright package
// installed at all, a harder form of the same environment gap v08.35/
// v08.36 recorded; a real-phone check at 320/360/390/412px in both
// languages, across all three views, is the recommended substitute.
// Allocated by the MMSA Architect.
// 08.38: Asma ul Husna -- Groups/Dual Names generalized into an open,
// owner-defined set of classifications (issue #202, PR #203). The Owner's
// own ask, after approving an interactive demo: "a name card should show
// the names of all LISTS it belongs to... enable me to edit/add/move/
// delete these lists." `kind` on a collection is any non-empty string now
// (was a closed "group"/"dual" set), defaulting to "group" so every
// existing tenant's data reads unchanged; a new classifications registry
// on the same asmaCollections/{tenantId} document (no new collection, no
// new read, no Rules change -- the deployed rule carries no hasOnly()
// restriction, confirmed by reading firestore.rules directly) is seeded
// with exactly "Group" and "Dual Names", so nothing changes for an
// existing tenant until the owner adds a third. A Name card gains a
// "Belongs to" section (every list, any classification, it is filed
// under) and a Names-level list row gains an "also in..." chip for a Name
// filed elsewhere too, both navigating straight to the other list. Manage
// mode gains "+ New classification". Deliberately NOT seeded: any real
// theological assignment ("Unique to Allah"/"Shared"/"By Act"/"By
// Essence") -- the issue's own explicit instruction was that curatorial
// work is the Owner's, not this round's, and the seed carries only the
// two mechanism entries every tenant already implicitly used. The
// reference-adding mechanism, poster view, Track-my-progress, extra-Name
// editing, drag-reposition and asma-study.html's own separate panel are
// all untouched, read and proven rather than assumed. New
// asma-classifications-boundary.mjs suite (26 checks) covers open `kind`,
// classifications CRUD, membershipsOfName() correctness across 3+ lists,
// I4 (archiving a classification never drops a membership), and a
// positive control on a freshly-added THIRD classification being
// reachable exactly like the seeded two. Independently re-verified by the
// Architect (fresh checkout, all 8 governance suites plus the new suite
// re-run clean, full diff read by hand, no protected path touched;
// behaviour.mjs re-run against both this branch and main under an
// available substitute Chromium build -- 785/787 identical either side,
// the 2 differences (27i, 31e) and the section-40 Mushaf crash point all
// pre-existing and environmental, none introduced by this round). This
// PR was opened by the Architect from the Builder's already-pushed,
// already-checked branch (its own PR-opening step did not execute), then
// merged by the unattended Architect workflow once `verify` reported
// green -- confirmed sound by this independent review after the fact.
// Allocated by the MMSA Architect.
// 08.39: Asma ul Husna -- the closing half of the open-classifications
// round (issue #205, PR #207), completing #202/v08.38. Two disclosed gaps
// from that review, both closed, same file, same mechanism, no new
// data-layer work. (1) Rename/archive for a classification TAB itself
// (asmaXRenameClassBtn/asmaXArchiveClassBtn, "renC"/"archC" icons), next
// to the classification switcher, owner/prime only -- the data-layer
// functions (renameClassification/setClassificationStatus) were already
// built and tested in #202, only their UI was missing. Archiving is I4
// (archive, never delete): a classification's own lists and every Name
// filed in them stay in the data, they just stop being offered as
// somewhere new; the existing "Show archived" toggle now also reveals an
// archived classification's own switcher field rather than adding a
// second toggle. (2) The brand-new-Name "file it under" row (reachable
// from the Note view's own "+ New Name"/"+ New Dual Name" buttons)
// generalized from a hardcoded group/dual pair to a real Classification
// field built from the live registry, cascading into the file-under list
// picker on change -- openAsmaXGroupsPopover() itself, the issue's own
// "likely" guess for where the gap was, turned out to already be fully
// generalized by #202 and was left untouched. Both are UI wiring against
// the already-authorized asmaCollections document: no new Firestore read
// on any startup path (I9), no firestore.rules/firebase.json/index
// change. No new theological content.
// asma-classifications-boundary.mjs extended 26 -> 36 checks.
// Independently re-verified by the Architect (fresh checkout of the
// Builder's branch, all 8 governance suites plus the extended boundary
// suite re-run clean, full diff read by hand, no protected path touched,
// clean fast-forward against main); behaviour.mjs could not run in this
// sandbox (chromium_headless_shell-1243 missing, only -1194 present) --
// the identical, twice-already-documented Playwright build-version gap
// from v08.35/v08.36, not a code defect; a real-phone check of the
// Explore panel's ... menu, both languages, is the recommended
// substitute. This PR was opened by the Architect from the Builder's
// already-pushed branch (its own PR-opening step again did not execute,
// the same gap v08.38 recorded). Allocated by the MMSA Architect.
// 08.40: Word Card -- the "Back to Word Card" round trip actually works
// (issue #113, PR #135). Every existing suite stopped at "the return bar
// appears" and never pressed it; doing that in a real browser found two
// real, narrowly-scoped defects in the Basic Arabic lemma/root feature's
// own return mechanism (built v08.20-v08.22). (1) The Basic tab's
// "lemma-linked occurrences" list did not survive the round trip -- it
// always collapsed on reopen, even when the reader had it expanded before
// following an occurrence link away. Fixed with a one-shot restore signal
// (quranWordCardRestoreLemmaExpanded), the same treatment the Depth tab's
// own expandedForm already gets. (2) The scroll-position restore could
// never have worked at all: window.scrollY is always 0 in this app's
// shell (body { overflow: hidden }). The first fix attempt targeted the
// wrong element (#readScroll) -- sideways paging is this app's own
// default (getSidewaysReading() in prefs.js), and in that mode
// #ayahPanels is what actually scrolls, not #readScroll; caught by a
// debug run against the real fixture before shipping.
// readViewScrollContainer()/readViewScrollTop()/setReadViewScrollTop()
// pick the right element for the current rendering mode. Sideways/Mushaf
// flow mode (Whole Surah/Range) and a Note-view origin are explicitly NOT
// covered -- both fall back to the pre-existing no-op, never a
// regression -- and are flagged rather than silently left broken.
// New quran-word-card-return.mjs suite, 55 checks: full round trip in
// both languages, Depth-tab regression, Prev/Next no-leak regression,
// keyboard operability, language-switch-while-visible, geometry at
// 320/390/412px. Independently re-verified by the Architect before
// merging: fresh checkout, clean merge with no conflicts against current
// main, all 8 CI-gated governance suites clean, the focused suite re-run
// clean at 55/0 under an available substitute Chromium build
// (chromium-1194's own chrome binary -- chromium_headless_shell-1243 is
// missing from this sandbox, the same documented gap as v08.35/v08.36/
// v08.39), full diff read by hand, no protected path touched. No
// Firestore write, Rule or index; no new translation string.
// Allocated by the MMSA Architect.
// 08.41: Hadith -- the current breadcrumb crumb carries aria-current="page"
// (issue #114 Gate A/B, PR #149). Reproduced live: neither the current
// breadcrumb crumb nor its containing <nav> carried any accessible signal
// for "this is where you are", confirmed null at every level on both
// breadcrumb call sites (Collections tab and Topic tab) -- more
// load-bearing now the trail runs a level deeper than it used to. Fixed
// in app/js/hadith-browser.js, both call sites. Zero new translatable
// strings -- aria-current's value is a fixed ARIA token, not user-facing
// text. A real, separate multi-edition breadcrumb-ambiguity question was
// found and reproduced during the same investigation (two editions of one
// collection would render byte-identical breadcrumb text) but is
// deliberately NOT fixed here -- today's committed corpus carries exactly
// one edition per collection, so it is not a live defect, and it would
// need a real product/data decision this round has no authority to make.
// 6 new mutation-proven checks in hadith-source-navigation-browser.mjs
// (36 -> 42), both languages. Independently re-verified by the Architect
// before merging: fresh checkout, clean merge with no conflicts against
// main, all 8 CI-gated governance suites clean, the focused suite re-run
// clean at 42/42 under an available substitute Chromium build, and the
// full behaviour.mjs suite run against both PR #149's own merged tree and
// a clean origin/main baseline (via a disposable git worktree, same
// substitute browser): 987 pass/6 fail vs 984 pass/9 fail, every failure
// on both sides pre-existing and environmental (27i, 31e, 40g x4
// confirmed byte-identical pixel coordinates on both sides, 22g x3 the
// documented intermittent archive.org class) -- zero introduced by this
// diff, which touches only app/js/hadith-browser.js. No protected path,
// no Rules/index change. Allocated by the MMSA Architect.
// 08.42: Word-by-Word whole-Qur'an/Juz percentage running counter, BUILT
// AND GATED (issue #206, PR #209). A new, additive Firestore collection
// (quranWordTotals) backs a gold ring around the Explore wheel (whole-
// Qur'an known/total) and an Approach/Word-by-Word wedge-colour toggle at
// the Juz level, plus a gate-free Word Card "Appears N times -- X% of all
// words" line. NOTHING CHANGES FOR A REAL READER YET -- same shape as
// v08.30's Activity evidence before v08.34 turned it on. The gate,
// app/js/study-wbw-total-readiness.js, copies study-evidence-readiness.js's
// shape exactly: ready:false as a literal, a governed-decision requirement
// (closed authority set, real date, existing reference) before it can ever
// read true, and it IMPORTS NOTHING AT ALL -- confirmed by reading the
// file, not merely asserted. Both the counter write (in
// quran-word-total-data.js, called from the same word-tap action in
// quranrevival.html that already writes the real per-occurrence state) and
// the counter read consult the gate FIRST and never touch Firestore while
// it is closed -- verified directly: applyWordTotalCounterDelta() returns
// before calling recordWordTotalDelta() whenever the pre-write snapshot is
// null (gate closed), and recordWordTotalDelta()/getWordTotals() each
// independently re-check the gate at their own top as well. An ordinary
// WbW tap today can never throw over this undeployed collection -- the
// exact defect class v08.31 had to fix for Activity evidence was not
// reintroduced here. The counter only moves on genuine countsAsKnown
// transitions, the same definition computeArabicCoverage() uses. Per-Juz
// totals (30 rows, summing to the real 77,429) are derived from the real
// packaged corpus by tools/quran-data-pull/build-juz-word-totals.js, not
// hand-typed -- independently re-run by the Architect against the real
// corpus and reproduces the shipped file byte-for-byte. The Rules
// candidate lives only at docs/governance/2026-09-23-wbw-total-counter-
// rules-candidate.rules; firestore.rules and firebase.json are untouched.
// The Approach wheel's own pooled-status colouring is provably unchanged
// (fill/ring are strictly opt-in renderScopedWheel() params). New
// tools/i18n-verify/quran-word-total-boundary.mjs (25 checks) covers the
// gate's shape, the write/read gate-order, a claim -> confirm -> return ->
// re-claim -> confirm correctness reconciliation against an independent
// recount, and the Juz-total derivation. Independently re-verified by the
// Architect (fresh worktree off origin/main, all 8 CI-gated governance
// suites plus this new suite re-run clean, full diffs read by hand, no
// protected path touched, clean merge against main -- re-checked
// immediately before each merge attempt, since 08.40 and then 08.41 were
// both taken by other concurrently-landing rounds while this allocation
// was in flight); behaviour.mjs could not run in this sandbox
// (chromium_headless_shell-1243 missing, only -1194 present -- the same,
// now recurring, documented Playwright build-version gap from v08.35/
// v08.36/v08.38/v08.39/v08.40). This PR was opened by the Architect from
// the Builder's already-pushed branch (its own PR-opening step again did
// not execute, the same recurring gap). Turning this on for real needs a
// Rules Console publish PLUS a separate governed enablement decision,
// exactly the same two-step shape v08.34 used for Activity evidence --
// neither has happened. Allocated by the MMSA Architect.
// 08.43: Health Atlas -- a References index, one new top-level view mode
// alongside Body Systems (issue #115 Gate A/B, PR #146, tranche 9). Each
// of the 8 HEALTH_ATLAS_REFERENCES rows now lists which organs in this
// dataset cite it (organsForReference(), the reverse of the existing
// referencesFor() -- reads only the existing organ.refs[] field, no new
// field). An organ pill is a real link into the existing organ detail
// column (reuses the same onSelectOrgan() path the sections list and the
// wheel already use), not a fabricated <a> into a route that cannot
// resolve it -- this app has no URL-addressable per-organ route. The
// source app's own References tab is a flat id/name/url table with no
// organ links at all, so this deliberately goes beyond source parity;
// investigated as Gate A before building, not assumed safe. The index's
// own note text explicitly disclaims that a listed reference backs an
// organ's material in general, never any one function statement
// individually, and the index never itself decides a statement is
// cited-evidence -- that distinction stays health-atlas-claims.js's job
// alone, asserted by a new static positive control. One reference (USDA
// FoodData Central) genuinely cites zero organs in this dataset -- a real
// edge case exercised by both the static guard and the new browser suite,
// not a hypothetical. Still 100% read-only, same DRAFT/internal-review
// status as every other Health Atlas screen -- nothing here is linked
// from shared nav or deployed to a real reader. New
// references-index-browser.mjs suite (12 checks, desktop/tablet/phone,
// mouse + keyboard + real touch tap()), mutation-proven two ways.
// This is the FIRST global version number ever allocated to the Health
// stream -- the ledger's own "health" stream record was found stale at
// this allocation (it had recorded EXTERNAL_PENDING_ACQUISITION /
// repository UNKNOWN, though real Health Atlas code has existed in this
// repository under app/health/ since 17 Sep 2026 across many tranches)
// and corrected in the same round. Independently re-verified by the
// Architect before merging: fresh checkout, clean merge with no
// conflicts against main, all 8 CI-gated governance suites clean, all 17
// Health-owned suites clean, no protected path touched. The next-free
// number was re-read off main at the time of THIS bump rather than
// assumed -- the concurrent issue #206 round took v08.42 first, a real,
// correctly-resolved collision of exactly the kind this file's own
// standing rule exists to prevent. Allocated by the MMSA Architect.
// 08.44: Hadith -- keyboard focus is restored to the newly-active tab
// button on every Collections/Topics/Search/Explore/Commentary tab switch
// (issue #114 Gate A/B, PR #150). render() tears down and rebuilds the
// whole subtree on every tab click; unlike an in-tab Collections step or
// the one-shot "View in source" jump, nothing restored focus on a plain
// tab switch, so a keyboard user lost their place to <body> on every
// single tab click, including returning to Search after visiting a
// narration's source (the query/results persisted; focus did not). Fixed
// with one new focusActiveTab() helper in app/js/hadith-browser.js,
// called from the tab button's own click handler -- the standard
// ARIA-tabs pattern of leaving focus on the tab list. Zero new
// translatable strings. 4 new checks in hadith-source-navigation-
// browser.mjs (43 -> 47), mutation-proven by the Architect: reverting the
// fix to origin/main's copy of hadith-browser.js fails exactly the 4 new
// checks (43/47), restored and re-confirmed clean. Independently
// re-verified before merging: fresh full-history checkout, merged
// current main in (clean, no conflicts), all 11 governance suites clean,
// all 5 Hadith-owned data suites clean, hadith-source-navigation-
// browser.mjs 47/47 in both languages. No protected path touched, no
// Firestore write/Rule/index. Allocated by the MMSA Architect.
// 08.45: Word Card -- desktop drag/resize verified, one z-index defect
// fixed (issue #113, PR #137). The movable/resizable Word Card window has
// existed since v08.20; a real drag-then-resize round trip (never driven
// by any suite before this one) found the Word Card mounts' z-index was
// 60, an accidental TIE with #dock's own z-index:60, where
// #noteView/#wheelPopupView/#exploreView all deliberately use 55, one
// step below #dock, with their own comment stating the policy outright.
// Fixed to 55 to match. Nothing changes on screen -- DOM order already
// tie-broke the same way -- but the card now states the same dock-wins
// policy explicitly instead of relying on a coincidence. New
// quran-word-card-popup.mjs suite, 22 checks: desktop drag/resize/
// persistence round trip (both languages), mobile layout untouched,
// independent per-mount geometry. Two things recorded, not built (both
// need authority this round did not have): zero keyboard support
// anywhere in the four-popup mechanism, and #dock deliberately winning
// its overlap with a popup's own south-edge resize handles once dragged
// low enough (the same "dock always wins" policy this fix makes
// explicit, shared by all four popups by design). Pre-existing suites
// re-run unmodified and unaffected: quran-word-card.mjs 36/0,
// quran-word-card-integration.mjs 10/0,
// quran-word-card-lemma-occurrences.mjs 50/0,
// quran-word-card-return.mjs (PR #135's own suite) 55/0. No new
// translation string, no Firestore write/Rule/index. Independently
// re-verified by the Architect before merging: fresh full-history
// checkout, merged current main in (clean, no conflicts), all 11
// governance suites clean, all five Word Card suites re-run matching the
// round's own claims exactly. Allocated by the MMSA Architect.
// 08.46: Health Atlas -- the References view switcher gets a real
// keyboard/screen-reader fix (issue #115 Gate A/B, PR #148). Gate A
// (reproduced first): tranche 9's buildViewTabs() declared
// role="tab"/"tablist" + aria-selected on the Body Systems/References
// switcher, but built none of the rest the WAI-ARIA Tabs pattern
// requires -- no aria-controls, no role="tabpanel" anywhere, no
// arrow-key handling. A new committed browser suite run against the
// unmodified tranche 9 commit failed 5 of 10 checks, reproducing exactly
// that. Gate B: these two buttons replace the whole screen (Body Systems
// vs References), not panels of one shared view, so per issue #115's own
// instruction this uses ordinary buttons (the WAI-ARIA toggle-button
// pattern: aria-pressed, role="group" container) rather than building
// out full tab-panel semantics for a control that isn't one -- a native
// <button> needs no bespoke keyboard handling, already in Tab order,
// already Enter/Space-activatable. references-tabs-accessibility-
// browser.mjs: 5/10 -> 10/10. references-index-browser.mjs's own
// pre-existing aria-selected assertions updated in place to
// aria-pressed, still 12/12. Independently re-verified by the Architect
// before merging: fresh full-history checkout, merged current main in
// (clean, no conflicts), all 11 governance suites clean, all 18
// Health-owned suites clean, mutation-proven by reverting the fix to
// origin/main's copy of health-atlas-view.js (exactly 5 of 10 checks
// fail, matching Gate A's own reproduction). No protected path touched,
// no version bump beyond this allocation, no Firestore write/Rule/index.
// Allocated by the MMSA Architect.
// 08.47: RETROACTIVE ALLOCATION -- MAP Phase 5 P5-D, the Notes screen,
// round 1 (issue #195, PR #198, merged 22 Sep 2026 as commit 530af1f).
// The Owner's own priority: "Notes screen (Phase 5): start it next, as
// the main piece of visible work." This round shipped real, user-facing
// functionality and was correctly built and tested, but the Architect
// loop's own version-allocation follow-up was never done for it -- it
// sat on main, live, for a full day (through v08.35-v08.46) with no
// number. Found and closed by the Architect during the routine sweep
// that also investigated whether D3 Journaling had become reachable
// (CLAUDE.md's own 19 Sep 2026 entry recorded it as page-unreachable at
// the time, "0 of 29 pages reach it" -- true then, false the moment this
// round wired app/notes.html in).
//
// A new real page, app/notes.html (+ app/js/note-sanitize.js), wired to
// the existing, previously-uninvoked data layer -- study-note-service.js
// (createStudyNote, reviseStudyNote, retireStudyNote, notesForStudyUnit,
// recordJournalEvidence) and note-foundation.js (listNoteRevisions). No
// new exported function was added to either. Lists/creates/revises/
// retires Notes for the current Study Unit; entry point is a new item in
// the Read screen's existing more menu ("My Notes for this unit").
// Sanitization via DOMPurify (CDN-vendored, first in this codebase),
// wrapped by note-sanitize.js's own allow-list, fails closed if DOMPurify
// is absent. Only a Note's own author may create/revise/retire it
// (isNoteOwner() in the deployed Rules, deliberately distinct from
// canRecordFor() -- a Note is a person's own private writing).
//
// D3 JOURNALING IS NOW LIVE, NOT MERELY REACHABLE: saving a Note against
// an ayah/range/surah Study Unit now records real Journaling Activity
// evidence, because study-evidence-readiness.js's gate has read
// ready:true since v08.34. Verified directly, not assumed: notes.html's
// afterCreateOrRevise() calls recordJournalEvidence() (imported from
// study-note-service.js) only after a real create/revise succeeds, which
// itself calls recordStudyEvidence() -- the ONE chokepoint, in
// study-event-wiring.js -- exactly the shape the 19 Sep 2026 D3-
// chokepoint round enforced. study-activity-evidence-boundary.mjs was
// ALREADY updated in place for this transition, correctly, with the
// reason recorded, at the same time this round was built: the importer
// set is asserted to be exactly [study-event-wiring.js], and the
// reachability invariant is inverted to require every page-reachable
// path pass THROUGH the wiring module -- proven still true today (27/0).
// study-note-boundary.mjs independently asserts the narrower claim:
// EXACTLY app/notes.html reaches study-note-service.js (18/0). A Note
// filed against a unit type ADR-008 does not cover (juz/topic/etc.)
// records no Journaling evidence and notes.html says nothing -- silence,
// not a false claim, per afterCreateOrRevise()'s own null check.
//
// note-sanitize-boundary.mjs, 7 checks (mutation-proven: reverting one
// render call site to raw innerHTML fails it, naming the exact line).
// Full Bangla translation from the first commit. Not built this round,
// per the issue's own scope: folders, Mapping My Journey filing
// (Phase 6, built later as v08.37), choosing a translator. Layout not
// measured in a real browser (documented Playwright/chromium_headless_
// shell environment gap); a real-phone check is the recommended
// substitute.
//
// Independently re-verified by the Architect at this retroactive
// allocation: fresh full-history checkout of current main (which already
// carries this round), all 11 governance suites clean,
// note-sanitize-boundary.mjs 7/0, study-note-boundary.mjs 18/0,
// study-activity-evidence-boundary.mjs 27/0, diff of PR #198 read by
// hand. No protected path touched by this allocation beyond the
// version-allocation files themselves. Allocated by the MMSA Architect.
// 08.48: Word Card -- the flow-mode cross-surah navigation gap #135
// flagged is fixed (issue #113, PR #138). Following a lemma occurrence
// into a DIFFERENT surah in Whole Surah flow mode (#pageViewContainer
// visible) left the reader on the arrival surah's own page at the SAME
// scroll offset as the origin ayah -- not the tapped word, which could be
// measurably off-screen -- because raw scrollLeft is a property of the
// container, not of whichever surah's content it currently holds, and a
// browser does not reset it when renderFlowView() rebuilds the innerHTML
// for a different surah. Fixed with one new identity-based function,
// scrollFlowToCurrentAyah(), called from navigateToAyah() -- the
// word-card mechanism's only navigation function, so the fix cannot
// affect Prev/Next, the Ayah/Surah selects, or the flow strip's own
// swipe navigation. New quran-word-card-flow-nav.mjs suite, 19 checks.
// A second, pre-existing, UNRELATED defect was found and NOT fixed:
// Range unit type carries no surah of its own, so crossing surahs while
// Range is selected shows an arbitrary slice of the wrong surah -- this
// predates issue #113 and is not scoped to word-card navigation (the
// plain surahSelect dropdown has the same gap); recorded as a
// product-decision packet with four costed options, none chosen.
// Mushaf-mode flow scroll targeting is also flagged, not built --
// hifz-renderer.js's word spans carry no ayah-identifying attribute to
// target. No new translation string, no Firestore write/Rule/index.
// Independently re-verified by the Architect before merging: fresh
// full-history checkout, retargeted from its stale stacked base onto
// main and merged current main in (clean), all 11 governance suites
// clean, the new suite 19/19 and the unmodified quran-word-card-
// return.mjs regression suite 55/55. Allocated by the MMSA Architect.
// 08.49: Hadith -- book/chapter row headings get a real lang/dir
// attribute (issue #114, PR #153). Every book/chapter row's own
// native-script heading (.hadith-row-heading, real Arabic text) rendered
// with no lang/dir attribute. getComputedStyle().direction still read
// "rtl" (Unicode Bidi auto-detects a run of Arabic characters), which is
// why no sighted or screenshot check ever caught it -- but lang has no
// such fallback: a screen reader read every book/chapter heading in the
// page's UI-language voice (English/Bangla) instead of Arabic. Every
// other Arabic-script surface this component renders already stamped
// lang/dir; only these two call sites did not. Fixed with one
// rawHeadingSpan() helper stamping lang=SOURCE_LANGUAGE, dir="rtl",
// covering both edition shapes (with and without a chapter level)
// through one function. Zero new translatable strings. 3 new checks in
// hadith-source-navigation-browser.mjs (47 -> 50), mutation-proven
// (reverting to the pre-fix state fails exactly the 3 new checks,
// 47/50). Independently re-verified by the Architect before merging:
// fresh full-history checkout, retargeted from its stale stacked base
// onto main and merged current main in (clean), all 11 governance
// suites clean, all 5 Hadith-owned data suites clean,
// hadith-source-navigation-browser.mjs 50/50 in both languages.
// Allocated by the MMSA Architect.
// 08.50: Health Atlas -- Foods and Conditions each gain a text search box
// (issue #115, PR #151), matching the source app's own per-tab filter.
// Deliberately narrower than the source's own matches() (whole
// serialized item, excluded fields included): matchesFoodSearch/
// matchesDiseaseSearch are scoped to exactly the fields this view
// already renders, so a search term present only in an excluded field (a
// real drug name in a real disease's .remedies) cannot surface a false
// hit -- proven by two checks against the real rendered page. Age Groups
// gets no search box, matching the source (it has none there either).
// The still-missing Lifestyle tab was re-investigated under Gate A/B and
// the existing deferral reasoning re-confirmed, not overridden -- no new
// field-level split found. New more-search-browser.mjs suite, 12 checks.
// A repository-wide report-generator defect (fenced code blocks/links
// flattened by tools/md2report.py, affecting all 82 report .md/.html
// pairs) was found and flagged for Master Architect authorisation, not
// fixed here -- only the one report this round's own task named was
// hand-corrected. No protected path touched, no Firestore write/Rule/
// index. Independently re-verified by the Architect before merging:
// fresh full-history checkout, retargeted from its stale stacked base
// onto main and merged current main in (clean), all 11 governance
// suites clean, all 19 runnable Health-owned suites clean including the
// new suite 12/12. Allocated by the MMSA Architect.
// 08.51: Health Atlas -- organ Type pill parity (issue #115, PR #152).
// The v02.04 source's own organ "Type" pill (organ.partType --
// Organ/Vein/Artery/Nerve/Tissue/Gland/Duct) was in the preserved dataset
// since foundation tranche 1 and read by nothing. A closed-set anatomical
// classification, the same class of field as the already-ported
// role/system -- never a dose, nutrient amount, activity recommendation
// or remedy. Ported faithfully as a small pill next to each organ's name
// in the Body Systems list. Measured with the real longest name in the
// dataset ("Vena Cava (Superior & Inferior)", a Vein) at desktop/tablet/
// phone before shipping -- the name+pill share one flex-wrap group rather
// than a nowrap line, so the worst case wraps the pill onto its own line
// instead of truncating the name or overflowing the row. Zero horizontal
// page overflow at any width. 4 new committed browser checks
// (body-systems-parity-browser.mjs 16 -> 20), a new closed-set
// data-integrity assertion (21 -> 22), a new view-boundary positive
// control (14 -> 15). A repository-wide tools/md2report.py
// fenced-code/link-flattening defect (affecting all 82 report .md/.html
// pairs) was independently confirmed cross-module, read-only, not fixed
// -- needs Master Architect authorisation. No protected path touched, no
// Firestore write/Rule/index. Independently re-verified by the Architect
// before merging: fresh full-history checkout, retargeted from its stale
// stacked base onto main and merged current main in (clean), all 11
// governance suites clean, all 19 runnable Health-owned suites clean
// matching the PR's own claimed numbers exactly. Allocated by the MMSA
// Architect.
// 08.52: Word Card -- Mushaf audio-follow/word-card scroll fixes, a real
// race-condition fix, three further cross-surah scroll-retarget sites,
// and the Note-view-origin path investigated with no defect found (issue
// #113, PR #139, four consolidated task-bridge rounds).
// (1) A genuine PRE-EXISTING race: renderMushafPages() was re-entrant-
// unsafe -- navigateToAyah()'s own surah-change branch can call
// renderStudyScreen() twice in quick succession, and a stale first call's
// still-in-flight renderPage() (font loads) could append into a container
// a second call had already reset, doubling pages and corrupting
// wordRegistry. Fixed with a monotonic generation token (renderGeneration),
// checked after every await inside renderPage(), before either
// wordRegistry or the container is touched -- the same shape this
// codebase's own quranWordCardRequest counter already uses.
// (2) setActiveAyah() (the audio/drill "follow the recitation" primitive)
// used inline:"nearest", which this round's own synthetic-fixture testing
// measured as never actually scrolling #pageViewContainer at all
// (scroll-snap-type:x mandatory + direction:rtl) -- the same defect class
// PR #138 already fixed for the word-card jump path. Fixed to
// inline:"start", matching its sibling exactly.
// (3) scrollFlowToCurrentAyah() now covers Mushaf mode too (previously a
// no-op there) via a new scrollToAyahIfRendered() primitive and a stashed
// flowRenderPromise the caller awaits before targeting the destination.
// (4) Three further cross-surah trigger points (stepUnit, goToUnitNumber,
// surahSelect) now call scrollFlowToCurrentAyah() at their own tail,
// closing the same stale-scrollLeft defect PR #138 fixed for the
// word-card jump, reproduced via three independent triggers. ayahSelect
// needs no matching call -- structurally proven never interactable while
// the flow strip is visible.
// (5) The Note-view-origin return path was re-investigated and confirmed
// structurally different from the flow-mode case: no defect found.
// Five new suites: quran-flow-step-nav.mjs (32), quran-mushaf-audio-
// follow-scroll.mjs (25), quran-word-card-mushaf-scroll.mjs (59),
// quran-word-card-note-origin-return.mjs (51), quran-surah-select-
// scroll-retarget.mjs (38) -- 205 checks. Three pre-existing regression
// suites re-run clean: quran-word-card-return.mjs 55, quran-word-card-
// flow-nav.mjs 19, quran-word-card-popup.mjs 22.
// A real, unrelated Range/surah-crossing content-correctness gap remains
// flagged, not fixed (a product-decision packet, four costed options,
// none chosen). No new translation string, no Firestore write/Rule/
// index. Independently re-verified by the Architect before merging:
// fresh full-history checkout, retargeted from its stale stacked base
// onto main and merged current main in (one real import-list conflict,
// resolved by combining both additive import sets -- no logic conflict),
// all 11 governance suites clean, all five new suites plus all three
// regression suites re-run matching claimed counts exactly (301 checks
// total). Allocated by the MMSA Architect.
export const APP_VERSION = "08.62";
