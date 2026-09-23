# MAP Phase 5 (P5-D) — Note editor Gate A/B design, plus a demo-only prototype

**Task bridge run from issue #113**, comment
[5752936842](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/issues/113#issuecomment-5752936842)
— the Master Architect's audit of PR #120 (APPROVED WITH NOTES) plus the next
bounded instruction: *"Advance MAP v4 with ONE next bounded Gate A/B
milestone: P5-D page-reachable Note editor preparatory design and prototype
confined to a local/demo-only or disabled non-writing surface while E1
Rules/index deployment remains closed."*

**Date:** 2026-09-20 UTC. **Blast radius:** BR-0. One new file
(`app/note-editor-prototype-demo.html`), linked from nowhere, importing no
Firebase/auth module and making no network call beyond loading itself; one
new dated report pair. No existing file is modified. No schema, Rules,
version, or nav change.

## 0. Owner app-test section

**Required: NO.** The prototype page is not linked from any nav-bearing page,
`app/js/nav.js` is untouched, and it imports nothing from `app/js/`. There is
nothing for the Owner to sign in and click through; the page can be opened
directly by URL (`/app/note-editor-prototype-demo.html`) purely as a static
visual reference, with every control disabled, if a screenshot alone is not
enough. No claim of production readiness is made or implied.

## 1. MAP v4's own document — confirmed absent a fourth time

Grepped full history (886 commits, every local and remote branch, `git fetch
origin --unshallow` run first) for `MAP v4`, `MAP_v4`,
`Master_Architect_Plan`: the only hits are `CLAUDE.md`, `CHANGELOG.md`,
`docs/governance/DDR.md`, `docs/governance/phase3-word-progress-storage-options.md`,
and the two 2026-09-12/13 reports that first recorded its absence. The
document itself is not in this repository, on any branch, at any point in its
history. This matches three prior findings on record (PR #112's report, PR
#117's Gate A/B matrix, and PR #120's predecessor). Per the triggering
comment's own fallback ("request its text through the Master Architect only
if inaccessible"), this report is built on **repository evidence**: ADR-009,
ADR-010, the Phase 5/6 build reports, `note-foundation-contract.json`, and
the current data layer — the same sources PRs #117 and #120 already used.

## 2. What already exists (re-derived from current `main`, not assumed)

The Note Foundation data layer is essentially complete for what an editor
needs, and has been since Phase 5/6/P5-G (PR #120):

| Capability | Function | Status |
|---|---|---|
| Create a Note | `createPermanentNote()` | Built, Phase 5 |
| Revise content | `updatePermanentNoteContent()` | Built, Phase 5 |
| Retire a Note | `retirePermanentNote()` | Built, Phase 5 (PR #104 fixes a denial under the Rules candidate — unmerged, disjoint from this round) |
| List a person's Notes | `listNotesForOwner()` | Built, Phase 5 |
| List revisions | `listNoteRevisions()` | Built, Phase 5 |
| Bind Origin at birth | `createPermanentNote()`'s own `source` block | Built, Phase 5 |
| Bind a further Origin | `createNoteSource()` | Built, PR #120 (P5-G), unmerged |
| Retire an Origin link | `retireNoteSource()` | Built, Phase 5/P5-F |
| Read Origins for a unit | `listNoteSourcesForUnit()` / `notesForStudyUnit()` | Built, P5-E |
| Create/edit/retire a folder | `createNoteFolder()` / `renameNoteFolder()` / `reparentNoteFolder()` / `retireNoteFolder()` | Built, Phase 6 (P6-B/D) |
| Place a Note in a folder | `createNotePlacement()` | Built, Phase 5 |
| Move (retire+create) a placement | `moveNotePlacement()` / `journey-map-service.js`'s `moveNoteToFolder()` | Built, P6-C |
| Read a folder tree / filings | `buildFolderTree()`, `folderContents()`, `noteFilings()`, `ownerFolderTree()` | Built, P6-A/C |

**Nothing in `app/js/` imports any of it.** The reachability walker in
`study-note-boundary.mjs` and `journey-map-boundary.mjs` (both re-run clean
in PR #120, unmodified) proves this mechanically, with a positive control.
So the gap P5-D exists to close is narrow and specific: **there is no page
and no rendering/wiring module that calls any of the above.**

## 3. Why this round builds a demo-only prototype, not the live editor

CLAUDE.md is explicit that the real P5-D surface is deliberately not built:
*"a real behaviour change (version bump, full layout measurement)"*, and
every write it made would be denied until E1 (Rules + index deployment). Two
further constraints specific to *this* bridge run reinforce that:

1. **A page-reachable surface needs a nav entry**, and every nav-bearing page
   carries its Home ▾ menu as static pre-JS markup repeated in each page
   (v07.08's anti-flash fix) — wiring a real entry point touches
   `app/js/nav.js` and, for the two-language strings a live surface needs,
   `app/js/i18n/bn.js`. Both are on this bridge's protected-path table. A
   prototype confined to *local/demo-only* therefore has to stay off that
   path by construction, not just by choice.
2. **No version is allocated.** `v08.32` is still unallocated per
   `docs/governance/programme-integration-ledger.json`, and this bridge may
   never allocate one. A page-reachable behaviour change needs a version the
   way v08.30/v08.31 did; a page nothing reaches and nothing renders inside
   the live app needs none, the same reasoning that keeps ADR-008/009/010
   and `study-note-service.js` at BR-0.

So the prototype built this round is the same shape this codebase already
uses for exactly this purpose — `app/quranrevival-render-test.html`, a
standalone page with no nav link and its own inline CSS, kept solely as a
visual/manual reference. `app/note-editor-prototype-demo.html` follows that
precedent: self-contained `<style>`, no import of `app/js/*`, no Firebase, no
`bn.js` (its English/Bangla text is hand-written on the page itself — a
`data-lang-block` pair toggled by two in-page buttons, not the shared i18n
catalogue), and **every field and button that would write anything is a real
`disabled` attribute**, not a class that merely looks dimmed (the same
`aria-disabled`-vs-`disabled` distinction v08.31 drew for `#readBar`, except
here `disabled` is correct because there is no explanation a press needs to
surface — the control cannot be reached at all).

**What it shows, traced to the data layer above:** a Study Unit (Ayah 2:255)
already bound as a Note's Origin; the Note's own editable fields (title,
body, status, owner) as they would render; a second Origin binding being
added (`createNoteSource()`, PR #120); and a Mapping My Journey filing view —
two system folders (`journey-map`, `reflection-archive`) plus one user
folder, a Note chip inside Reflection Archive, and a "move" control — with an
explicit note that Origin and Destination are kept apart (ADR-010 §2) and
that a move retires one placement and creates another rather than rewriting
`folderId` (ADR-010 §5).

## 4. Verified, not assumed

A local static server (`node serve.js`) plus a focused, un-checked-in
Playwright script served the page at four widths — 320/390/412px (mobile)
and 1100px (desktop) — in both language states:

- **Zero page errors, zero console errors**, at every viewport.
- **Zero horizontal overflow** (`scrollWidth − clientWidth = 0`) at every
  viewport, in both languages.
- **Exactly 2 enabled interactive elements** at every viewport — the two
  language-toggle buttons — and **22 disabled controls**, matching the count
  of inputs/textareas/selects/buttons on the page; nothing else is
  clickable.
- The language toggle correctly shows/hides the English/Bangla blocks
  (`#pageTitle`/`#pageTitleBn` visibility both proven, not just clicked).
- Screenshotted at all four widths in both languages: legible, no clipped
  text, no wrapped button row, cards stack cleanly at 320px.

This is a genuinely disabled, page-unreachable prototype, proven the same
way this project proves anything: by measurement, not by description.

## 5. File budget for the milestone (declared, per the triggering comment)

**This round (built):**

| Path | Change |
|---|---|
| `app/note-editor-prototype-demo.html` | New. Standalone, unlinked, no imports. |
| `docs/reports/2026-09-20-map-p5d-note-editor-gate-b-design.md` + `.html` | New. This report. |

**Untouched, and asserted so:** `app/js/nav.js`, `app/js/i18n/bn.js`,
`app/js/note-foundation.js`, `app/js/study-note-binding.js`,
`app/js/journey-map-contract.js`, `app/js/journey-map-service.js`,
`firestore.rules`, `firebase.json`, every file under `docs/governance/`,
`app/js/version.js`. `git diff main -- app/js/ firestore.rules firebase.json
docs/governance/` is empty for this round.

**For the real, page-reachable P5-D build (not this round — declared for
whoever picks it up next, and gated as below):**

| Path | Change | Gate |
|---|---|---|
| `app/note.html` (or similar) | New page | E1 |
| `app/js/note-editor-ui.js` (or similar) | New rendering/wiring module, imports `note-foundation.js`, `study-note-binding.js`, `journey-map-service.js` | E1 |
| `app/js/nav.js` | Add one entry, all 22 nav-bearing pages (static markup, v07.08) | **Protected — Master Architect shared-file authorisation required** |
| `app/js/i18n/bn.js` | Bangla strings for the real (non-demo) UI | **Protected — Master Architect shared-file authorisation required** |
| `app/js/version.js` + `CLAUDE.md` milestone line | Version bump for a real behaviour change | **Version allocation — Master Architect only** |
| New `tools/i18n-verify/note-editor-*.mjs` suite(s) | Real-function + boundary + reachability tests, mutation-proven | — |
| `layout.mjs`/`reading.mjs`/`panel.mjs`/`navcheck.mjs`/`behaviour.mjs` | Extended to cover the new surface, per this project's own measurement discipline | — |

## 6. UI flow: Study → Note → Mapping My Journey

1. **Study** (any existing Quran/Hadith/topic study screen) offers "Note this
   unit" against the current Study Unit key (already the shape `noteSources`
   expects — `study-note-binding.js`'s `studyNoteSource()` derives
   `sourceKind` from the unit key, unchanged since ADR-009).
2. **Note editor** opens: create (`createPermanentNote()`, which writes the
   Note *and* its birth-time Origin link in one transaction) or, for an
   existing Note reachable from this unit (`notesForStudyUnit()`), edit
   (`updatePermanentNoteContent()`) or retire (`retirePermanentNote()`).
   Binding a *further* Origin from here uses `createNoteSource()` (PR #120).
3. **Mapping My Journey** is reached either from the Note editor ("file this
   Note") or as its own pillar (the disabled placeholder already in the live
   app, per ADR-010's own context section). It reads `ownerFolderTree()` and
   `folderContents()`/`noteFilings()`, and a move calls
   `moveNoteToFolder()` — one retire, one create, never a rewrite, never
   touching the Note itself (I4, ADR-004, ADR-010 §5).

Nothing in this flow requires a new collection, a new field, or a new
relationship shape: the destination modules already exist and are already
tested (P5-E, P5-F, P6-A–E). The work still to do is entirely UI —
rendering, event wiring, layout, and the nav/i18n surface that makes it
reachable.

## 7. Data ownership and tenant/role security

**Unchanged from the accepted Phase 5/6 Rules candidates — this round
proposes no new authorisation shape.** A Note is owned by exactly one
(`tenantId`, `ownerPersonId`) pair; **only the Owner writes a Note** — not a
guardian, teacher, tenant administrator, or platform administrator (Phase 5's
own stated design, stricter than `canRecordFor()`). Every relation
(`noteSources`, `notePlacements`, `noteFolders`) inherits that same
ownership pair and is validated against it in the data layer today
(`ownership()`/tenant-and-owner checks in `note-foundation.js`), ahead of
whatever the Rules candidate additionally enforces once deployed. A future
editor UI adds no new security surface: it can only call functions that
already refuse a cross-tenant or cross-owner write, and a real UI session
would still be denied at the database until E1 regardless of what the
client believes.

## 8. Version

**No allocation, and none is needed for this round.** `app/js/version.js`
reads unchanged; `08.32` stays unallocated per the ledger. The real,
page-reachable P5-D build is a genuine behaviour change and — per this
bridge's own standing instruction — **cannot be finished autonomously**: it
needs a version allocated by the Master Architect at the time it is
authorised, exactly as v08.30/v08.31 were.

## 9. Tests

**This round:** the Playwright probe described in §4 (un-checked-in, per
this project's convention for a page with no permanent test suite of its
own — it is not wired into any live path, so it earns no place in
`tools/i18n-verify` yet). No governance suite needed updating: the prototype
imports nothing the reachability walkers watch, and adds no new export any
existing suite's import-graph or boundary check would need to account for.

**For the real build:** a dedicated suite following this project's own
pattern (`study-note-boundary.mjs`'s reachability walker, extended to prove
the new page/module chain now DOES reach `note-foundation.js` through
exactly the new wiring module — the P4-C→P4-D "inverted invariant" shape);
real-function assertions against the data layer calls the UI makes; mutation
tests on the tenant/owner denial paths; and the full measurement discipline
(`layout.mjs`, `reading.mjs`, `panel.mjs`, `navcheck.mjs`,
`behaviour.mjs`) at the standard viewport/language matrix.

## 10. Rollback

Delete `app/note-editor-prototype-demo.html`. Nothing imports it, no nav
page links it, no document was written under it, and no other file's diff
against `main` is nonzero. `git diff main` is empty everywhere except this
report pair and the one new file.

## 11. Activation gates (unchanged, restated for this milestone)

1. **E1** — Firestore Rules + index deployment for the Note Foundation and
   Journey Map candidates (Owner Control Gate; an external Firebase Console
   dependency this sandbox cannot reach).
2. **Master Architect shared-file authorisation** for `app/js/nav.js` and
   `app/js/i18n/bn.js` (this bridge's own protected-path table).
3. **Version allocation** for the resulting behaviour change (Master
   Architect only).
4. **Full layout/measurement evidence** for the real surface, matching this
   project's own standing lessons — not satisfied by this round's demo page,
   which was built expressly to avoid needing it yet.

None of these is a DDR item or an unresolved product question; all four are
procedural/deployment gates.

## 12. MMJ product questions — settled vs. genuinely open (ADR-010)

**Settled, from ADR-010 itself — not to be put back to the Owner:**

- MMJ is a *destination* over `notes`; it defines no Note of its own, and
  introduces no second identity or revision chain (§1).
- Origin (`noteSources`) and Destination (`notePlacements`→`noteFolders`)
  are separate relations; neither may be derived from the other, in either
  direction (§2).
- `semanticRole` is closed at exactly three values —
  `journey-map` / `reflection-archive` / `user` — with `journey-map` and
  `reflection-archive` capped at one each per (tenant, person) and
  immutable once set (§3).
- A folder tree is acyclic, single-tenant/single-owner, depth-bounded at 8
  (§4).
- Placement is many-to-many; a move is retire-one/create-another, never a
  `folderId` rewrite, and never touches the Note (§5, ADR-004).

**Genuinely open — Owner/product decisions, explicitly named as such in
ADR-010 and not re-raised as settled:**

- **What a Journey Map looks like, is for, or contains** — ADR-010 states
  outright this "decides nothing" about it; it is product, not
  architecture.
- **A fourth `semanticRole`** — likewise an Owner decision, not decided by
  this ADR.
- **Server-side cycle prevention** (`ancestorIds[]` + `depth`) — recorded as
  a real option with a real cost (forbidding re-parenting, or a
  multi-document rewrite Rules cannot verify) and explicitly **not
  adopted**; whether to pay that cost is the Owner's call.
- **The guardian approval window** (30-minute, Note-specific) named in the
  Phase 5 Rules matrix (GUARD-05/06/07) — not built; every guardian content
  edit is denied outright today, which is safer than the accepted design but
  not what was accepted. This is a Phase 5 item, not specific to MMJ, and is
  restated here only because a real editor surface would be the first place
  a guardian's own experience of it becomes visible.

Nothing in this round required a decision from either list — the demo
prototype illustrates the settled distinctions and takes no position on the
open ones (its MMJ mock shows exactly the two system folders plus one user
folder ADR-010 §3 already fixes, and invents no fourth role, no cycle
policy, and no guardian flow).

## 13. A real, unrelated defect found and fixed: `tools/md2report.py` infinite-looped on this report's own prose

Generating this report's `.html` companion hung indefinitely. Bisected by
halving the input file until a 4-line reproduction remained: a wrapped
paragraph line that happens to **start** with a PR reference —
`#117's Gate A/B matrix, and PR #120's predecessor).` — because the previous
line's word-wrap put `#117's` at column 0. The paragraph-continuation loop
excluded any line `startswith("#")`, intending to stop at a heading, but a
real heading requires `#` **and a following space**
(`^(#{1,6})\s+(.*)`); `#117's` has no space after the `#`, so it matches
neither the heading branch nor any other branch, and the paragraph loop's
own exclusion refuses to consume it either — the same line satisfies no
branch's entry condition and no branch's exit condition, so `i` never
advances and the `while i < len(lines)` loop spins forever. Not a new class
of bug: PR #91's own title records a prior "infinite loop in md2report.py"
fix, and this is the same failure shape (a line matching no branch) with a
different trigger.

Fixed by replacing the bare `startswith("#")` exclusion with the same
regex the heading branch itself uses (`re.match(r'^#{1,6}\s', ...)`), so the
paragraph loop only stops at an actual heading, not any line that merely
begins with the character `#`. `tools/md2report.py` is not on this bridge's
protected-path table (it is a standalone doc-generation script, not
`tools/i18n-verify/` platform-shared tooling, governance, or deployment/
security), so this is an in-scope, independent bug fix rather than a
protected-path change. Verified: the 4-line reproduction now converts in
under a second, and this report's own 307-line source converts cleanly end
to end. Re-running the tool against an existing, previously-generated
report (`2026-09-12-reconciliation-and-phase2.md`) as a regression check
reproduces its body content exactly and differs only in the `<title>`
element — the committed `.html` carries a hand-appended `(2026-09-12)` suffix
the generator itself has never produced, on either side of this fix, so
that one difference pre-dates this round and is unrelated to it.

## What was deliberately not done

- No live-reachable UI, no nav entry, no `bn.js` change — all three are
  either a protected-path touch or a version-bump-worthy behaviour change,
  neither of which this bridge may make.
- No Rules/index deployment; `firestore.rules` untouched, still contains
  neither `noteSources` nor `notePlacements`.
- No version bump; `08.32` stays unallocated.
- No merge, no approval claimed.
- The demo prototype's own screenshots and probe output are not committed
  (ephemeral verification, not a permanent test asset) — the measurements
  are recorded here in prose, per this project's own convention that a
  screenshot is evidence to look at once, not a file to carry forward.
