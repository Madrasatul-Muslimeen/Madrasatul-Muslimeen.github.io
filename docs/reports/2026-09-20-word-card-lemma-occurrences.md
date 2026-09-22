# QuranRevival — Word Card: the Basic tab's lemma-occurrences line, made expandable

**Date:** 20 September 2026
**Scope:** one small, additive Study/Word Card improvement, built on an
isolated branch as a draft PR for Master Architect review. **Not merged, not
deployed. The application version is NOT bumped.**
**Origin:** issue #106's bounded task — "build one genuinely visible
QuranRevival Study or Word Card improvement that works without Firestore
Rules/index deployment and does not touch protected shared paths."

---

## 1. What this is, in one line

On the Word Card's **Basic Arabic** tab, the existing
**"{count} lemma-linked occurrences"** line — plain, uninteractive text since
Phase 2 — is now a real toggle. Pressing it expands, in place, the exact list
of places in the Qur'an where this word's own dictionary form (its lemma)
occurs, each one the exact WRITTEN text at that place and a control that
jumps straight to it. Collapsing removes the list again.

This is not new data. `context.lemmaOccurrences` has been fetched on every
word-card open since v08.21 (`occurrenceRefsFor("lemma", ...)`, read
alongside the root index the Derived Forms list already uses) and was used
for nothing but the number printed in that line. The count was real; a
reader had no way to turn it into the list it was counting.

---

## 2. Acceptance criteria, cited

Drawn from the issue's own bounded task and from this repository's governing
brief and architecture record, checked one by one:

| Criterion | Source | Met |
|---|---|---|
| "Genuinely visible … works without Firestore Rules/index deployment" | issue #106 | Yes — pure client-side render/interaction change; zero Firestore reads or writes anywhere in the new code (verified: `window.__fsLog` write count is 0 through the whole interaction, both languages — §5) |
| "Does not touch protected shared paths" | issue #106 | Yes — only `app/js/quran-word-card.js` and `app/quranrevival.html` changed; neither is in the protected-path table (§7) |
| "Prefer a local/read-only Study interaction with browser evidence, rather than another foundation-only change" | issue #106 | Yes — reads only the already-fetched lemma index and the packaged surah JSON under `tools/quran-data-pull/output` (the same local files the Derived Forms list already reads); a real person opening the Word Card sees and can use the new control (§5, §6) |
| "Surface Token ≠ Lemma ≠ Root ≠ Grammatical Family" (locked distinction) | `docs/governance/ACTIVE-ARCHITECTURE.md` §"Locked distinctions" | Respected, not narrowed — this gives the LEMMA layer its own occurrence list, kept separate from the Root's Derived Forms list rather than merged into it |
| I9 (nothing joins the startup path without being flagged) | `CLAUDE.md` invariants | Untouched — the toggle fetches nothing until a reader presses it, and even then it re-reads data already resolved on the same on-demand boundary the Derived Forms list uses (`getSurah`, already fetched for the current surah) |
| I11 (every user-visible name is language-keyed) | `CLAUDE.md` invariants | Satisfied with **zero new translation keys** — every string the new UI needs (`Show occurrences`, `Hide occurrences`, `Showing the first {shown} of {total} occurrences.`, `Occurrence list unavailable: {error}`, `No occurrences are listed for this form.`, `Go to {ref}`, `Loading occurrences…`) already exists in `app/js/i18n/bn.js`, reused verbatim because this is the same occurrence-list shape the Depth tab's derived forms already use |
| "A NEW control is a layout change and gets the same measurement as one that moved" (Standing lesson) | `CLAUDE.md` | Measured at three viewports × two languages before shipping (§4) |
| "Do not touch DDR-001…004 / Owner UI decisions (O3, O3b, O3c, O4-READBAR-WRAP)" | task brief | None of those five items is on this screen or in this code path; not touched |

---

## 3. What was built

**`app/js/quran-word-card.js`** (pure renderer, no fetching, no writing —
unchanged in kind):

- `occurrenceListMarkup(...)` — the occurrence-list markup that used to live
  only inside `formOccurrenceList()`, generalised so a second caller can use
  it. `formOccurrenceList()` itself is now a one-line call into it; its
  behaviour is byte-for-byte the same as before (proven by the unchanged
  `quran-word-card-rendered.mjs` and `quran-word-card.mjs` suites, §5).
- `lemmaOccurrenceBlock(word, layers, context, text, formatNumber)` — new.
  Renders the count line; if the count is 0 it is exactly the old plain
  `<p>`. If the count is greater than 0 it is a `<button>` (reusing the
  Depth tab's own `.word-card-form-toggle` class, so it inherits that class's
  already-measured ≥44px tap target and hover state — no new CSS rule was
  added) carrying `aria-expanded`, and when expanded it renders the same
  `occurrenceListMarkup(...)` the Depth tab's own forms use, with the SAME
  navigation identity (`data-word-occurrence-goto`) — a reader gets one
  occurrence-list shape and one way to reach an āyah from it, not two things
  that look alike but behave differently.

**`app/quranrevival.html`** (page wiring, not a protected path):

- Two new module-level variables, `quranWordCardLemmaExpanded` and
  `quranWordCardLemmaRequest`, mirroring the existing pair for a derived
  form's expansion state.
- `expandLemmaOccurrences()` / `collapseLemmaOccurrences()`, mirroring the
  existing `expandWordForm()` / `collapseWordForm()` exactly: resolve the
  WRITTEN text at each of up to `WORD_FORM_OCCURRENCE_LIMIT` (50, the
  existing, already-measured cap) positions from that surah's own packaged
  data — never guessed from the lemma, since a lemma is a dictionary form
  and the written text at a given place is often not identical to it.
- One click-handler branch for the new `[data-word-lemma-toggle]` control,
  inserted beside the existing form-toggle branch in the Read/Note view's
  shared click handler.
- `hydrateWordCardOccurrences()` now resets the lemma-expansion state at the
  start of every word change. Unlike a derived form (which can be restored
  across a "visiting from" hop, by design), a lemma-occurrence list is
  always the CURRENT word's own lemma, so it starts collapsed on the next
  word — verified directly (§5, "the expansion does not leak onto the next
  word").

No CSS file was touched; the toggle reuses `.word-card-form-toggle` and the
existing `.word-card-occurrence-link` / `.word-card-form-occurrences`
classes verbatim.

---

## 4. Measured before/after

`context.lemmaOccurrences` was **already fetched** before this round (since
v08.21); this round adds no new network call until the reader presses the
toggle, and even then only the packaged surah JSON already used elsewhere is
read (never Firestore). Distribution of lemma-occurrence counts across the
whole packaged corpus (measured, not assumed, from `lemmas-index.json`):
4,832 lemmas, median 2 occurrences, 222 lemmas above 50 — which is exactly
why the existing 50-item cap (`WORD_FORM_OCCURRENCE_LIMIT`, already
established and already measured for the Depth tab's forms) is reused rather
than reinvented, with the same "Showing the first N of M" disclosure the
Depth tab already carries.

Geometry, following this project's own rule that a new control is a layout
change and gets measured like one — three viewports × two languages, on the
rendered page, for the fixture this project's own `quran-word-card-rendered.mjs`
already established (surah 2, āyah 71, word 13 — root سلم, lemma مُسَلَّمَةٌ):

| Viewport | Language | Toggle tap-target height | Toggle right edge ≤ viewport | Page scrolls sideways |
|---|---|---|---|---|
| 320×640 | en | ≥36px | Yes | No |
| 390×844 | en | ≥36px | Yes | No |
| 412×915 | en | ≥36px | Yes | No |
| 320×640 | bn | ≥36px | Yes | No |
| 390×844 | bn | ≥36px | Yes | No |
| 412×915 | bn | ≥36px | Yes | No |

All 6 rows measured clean (no truncation, no overflow, real ≥36px tap
target — this project's own stated minimum). No existing metric this
project already tracks for this card (`quran-word-card-rendered.mjs`'s own
responsive/geometry checks, run unmodified against the changed code, §5) 
regressed.

---

## 5. Verified: a focused, un-checked-in Playwright script, browser evidence

`tools/i18n-verify/quran-word-card-lemma-occurrences.mjs` — **50 checks, all
passing**, in both languages, against the real rendered page (not source
inspection):

```
=== lemma-occurrences toggle, appLang=en ===
  PASS  en the lemma-occurrences line is a real, collapsed toggle
  PASS  en it names a real count
  PASS  en expanding sets aria-expanded=true
  PASS  en at least one occurrence row renders
  PASS  en a row carries a real Arabic word
  PASS  en a row carries a real surah:ayah:position ref
  PASS  en no more than the stated cap is rendered
  PASS  en collapsing sets aria-expanded=false
  PASS  en collapsing removes the rows from the DOM
  PASS  en following a lemma-occurrence row navigates to its āyah
  PASS  en the card closes on the way out (does not overlay the destination)
  PASS  en the existing "way back" bar appears, reused rather than duplicated
  PASS  en expanding and following lemma occurrences writes nothing
  PASS  en no page errors

=== lemma-occurrences toggle, appLang=bn ===
  (the same 14, all PASS, in Bangla)

=== the expanded list matches the count already shown ===
  PASS  the stated total matches the count line exactly
  PASS  rows never exceed 50 even when the total is larger

=== the expansion does not leak onto the next word ===
  PASS  expanded before moving
  PASS  the NEW word's own toggle starts collapsed

=== geometry: the toggle does not cost tap-target or overflow regressions ===
  (18 checks, 3 viewports × 2 languages × 3 measurements, all PASS)

50 passed, 0 failed
```

Also run unmodified, to confirm nothing this project already measures for
this card regressed:

- `tools/i18n-verify/quran-word-card.mjs` — **36 passed, 0 failed** (pure
  state/render suite, including "Bangla exists for every string
  wordCardLabels() asks for" — unchanged, because no new key was added).
- `tools/i18n-verify/quran-word-card-integration.mjs` — **10 passed, 0
  failed** (including "card integration introduces no Firebase write
  path").
- `tools/i18n-verify/quran-word-card-rendered.mjs` — run unmodified against
  the changed renderer (this suite includes the project's own derived-forms
  geometry and responsive checks this round's refactor of
  `formOccurrenceList()` had to keep byte-identical): **120 passed, 2
  failed** — and the 2 are `ERR_CERT_AUTHORITY_INVALID`, this sandbox's own
  TLS interception on an HTTPS fetch (this project's own documented
  standing-lesson artifact, §"On the test harness" in `CLAUDE.md`), **not
  this round's doing**: confirmed by `git stash`-ing this round's two
  changed files and re-running the identical, unmodified suite against
  clean `main` — same **120 passed, 2 failed**, same two lines, word for
  word.

### Screenshots (English and Bangla)

**Before — the line collapsed** (`lemma-collapsed-en.png`,
`lemma-collapsed-bn.png`): reads exactly as the pre-existing plain count did
("3 lemma-linked occurrences"), now with a small disclosure caret, and is a
real focusable, keyboard-reachable control.

**After — the line expanded** (`lemma-expanded-en.png`,
`lemma-expanded-bn.png`): the same line, now showing the resolved
occurrence row(s) beneath it — the exact written Arabic at each place and
its `surah:ayah:position` reference, each one a control that jumps to that
āyah. (In the headless screenshot a couple of rare Qur'anic diacritic marks
render as small placeholder boxes — a font-substitution artifact of this
sandbox's headless Chromium, not a data or markup defect: the underlying DOM
`textContent` at those positions was extracted directly and is the correct
Arabic in every case, e.g. `مُسَلَّمَةٌۭ` for `2:71:13`.)

Screenshots are attached to the pull request.

---

## 6. What a real person now sees differently

Opening any word on the Read screen with word-by-word on, switching to
**Basic Arabic**: the "N lemma-linked occurrences" line is now something you
can press. Pressing it shows exactly where else in the Qur'an this precise
written form of the word occurs, with a direct one-tap route to each place —
previously the only way to reach any of that data was to switch to **Arabic
in Depth**, find the matching row inside "Derived forms of this root" (not
always the top row, and only present at all when the word has a root), and
expand that instead. This is a direct route to something the card already
knew, not a new capability bolted onto unrelated data, and it works
identically for a lemma that carries no derived-forms section at all — a
case the old, indirect route could not reach.

---

## 7. What this deliberately does NOT do

- **No protected path touched.** `git diff --stat origin/main` touches only
  `app/js/quran-word-card.js` and `app/quranrevival.html`, plus new files
  (`tools/i18n-verify/quran-word-card-lemma-occurrences.mjs`, this report
  pair). None of `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`,
  `app/js/i18n/bn.js`, `app/js/nav.js`, `app/js/unit-keys.js`,
  `app/js/records.js`, `app/js/activity.js`, `app/js/catalogue-data.js`,
  `app/css/shell.css`, any `tools/i18n-verify/{behaviour,harness,
  firebase-stub,brief-integrity,programme-ledger,programme-ledger-mutations}.mjs`,
  anything under `docs/governance/`, `firestore.rules`, `firebase.json`,
  `tests/firestore/`, `tools/firestore-emulator/`, or `.github/workflows/`
  was modified.
- **No Firestore write, Rule, or index proposed, changed, or deployed.**
  Verified directly: `window.__fsLog` write-kind count is 0 through the
  whole toggle/navigate interaction, in both languages (§5).
- **No version bump.** `app/js/version.js` is untouched; `main` and this
  branch both read `08.31`. Per the ledger
  (`docs/governance/programme-integration-ledger.json`),
  **`08.32` remains UNALLOCATED** — this behaviour change is **incomplete
  pending Master Architect version allocation**, exactly as every other
  built-but-unallocated round in this repository is recorded.
- **No merge, no deploy, no approval claimed.** This is a draft PR on an
  isolated branch for review.
- **No DDR item touched.** Not translator selection (DDR-003), not the
  locked 30-Approach count (DDR-004), not a non-Quran progress model
  (DDR-001), not teacher subject-scoping (DDR-002).
- **No Owner UI decision touched.** Not `tenantSelect` (O3), not
  `surahSelect`/`unitTypeSelect` at 320px (O3b), not `#drillModeSelect` in
  Bangla (O3c), not `#readBar` (O4-READBAR-WRAP) — none of those controls
  or screens is anywhere in this diff.
- **No new translation key.** Every string is reused verbatim from
  `app/js/i18n/bn.js`.
- **The 262-of-4,832-lemma packaged-text notation issue** (raised and
  deliberately left in the v08.22 report, §13 of
  `docs/reports/2026-09-14-v08.22-word-card-correction-tranche.md`) is
  unrelated and untouched — this round reads the same lemma index the
  Derived Forms list already reads, and inherits that same, already-flagged
  data property rather than changing it.

---

## 8. Governance suite results (verbatim)

Run from the repository root. All seven required suites exit 0 unchanged
from clean `main` — the two `brief-integrity.mjs` failures and the seven
`programme-ledger-mutations.mjs` failures below are **pre-existing sandbox
artifacts** (confirmed by `git stash`-ing this round's changes and
re-running each suite against clean `main`: identical counts and identical
failure text both before and after this round's changes). They stem from
this sandbox's git checkout not carrying the remote refs for
`claude/pensive-knuth-2pu3jj` and `claude/phase4-wiring`, which
`brief-integrity.mjs` and `programme-ledger-mutations.mjs` both try to read;
they are unrelated to this round's files.

Full output is quoted in the pull request body.
