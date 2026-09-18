# Hadith Study — H2-A: the synthetic corpus pilot

- **Date:** 2026-09-18
- **Gate:** H2, first reviewable tranche, under *Hadith H2 Implementation Instruction v01*
- **Branch:** `feature/hadith-study` at **`c7ee03e`**, worktree `/home/user/hadith-study`
- **Application version:** **08.25 → 08.27** (08.26 skipped deliberately — §1.3)
- **Blast radius:** BR-2. Five new files under `app/`, two new suites under `tools/`, three existing files edited (`version.js`, `i18n/bn.js`, `CLAUDE.md`). **No existing page changed** — `quranrevival.html`, `hadith-study.html` and `index.html` are byte-identical to `origin/main`. `firestore.rules`, `firebase.json` and every Rules and index candidate untouched.
- **Result:** delivered. **58 rendered checks, 0 failures**, in both languages and on both routes. Pure suites 14 + 26 + 14, all exit 0. **Three real defects found and fixed** — two by looking at screenshots, one by a test.

---

## 1. Step 1 — verified state, not remembered state

### 1.1 Commits and isolation

| Fact | Verified value |
|---|---|
| `origin/main` at session start | `d8f0492` |
| `origin/main` now | **`1cac2b8`** — *"Session handover: deterministic continuity for the next session"* |
| What moved on `main` | **Documentation only**: `CHANGELOG.md`, `CLAUDE.md`, two handover report files. **No `app/`, `tools/`, `firestore.rules` or candidate change** |
| Merged into this branch | Yes, cleanly, as `aef6cf3` |
| Branch HEAD | **`c7ee03e`** |
| Worktrees | `/home/user/Madrasatul-Muslimeen.github.io` *(Quran line)* · `/home/user/hadith-study` *(this work)* — **different filesystem paths, confirmed** |
| Version before → after | **`08.25` → `08.27`** |

**No shared-interface coordination was required.** `main` moved by documentation alone, and the handover records that the Quran session ended with its single blocking dependency being Firebase access. Nothing this tranche touches is a shared Study, Note, Track, Explore, MMJ, authentication or Rules file.

### 1.2 The H1 rights guard, re-run — actual output

```
node tools/i18n-verify/hadith-source-rights.mjs
  PASS  POSITIVE CONTROL -- both manifests really loaded and carry rows
  PASS  POSITIVE CONTROL -- rightsRefusal() can actually refuse
  PASS  the canonical rights states are exactly the Start Prompt's three, and the default denies
  PASS  every source is sound against the rights rule
  PASS  no text import is authorised for any source
  PASS  every source records what is still unknown about it
  PASS  every commentary row carries the Source Register's field names verbatim
  PASS  no commentary row claims a narration occurrence while no edition is approved
  PASS  no commentary text has been captured while nothing is embed-cleared
  PASS  a commentary row never outranks the source it came from
  PASS  the two matches stay DISTINCT records, never merged into one report
  PASS  the display contract never lets an explanation pass as the Hadith's own words
  PASS  no Hadith corpus has appeared in the tree while no edition is approved
  PASS  the schema document and the manifests still agree on the vocabulary

14 passed, 0 failed          (exit 0)
```

### 1.3 Why the version is 08.27 and not 08.26

**`08.26` is already claimed** by the unmerged Phase 4 Study-event wiring branch. Established by reading that branch, not by trusting the brief:

```
git show origin/claude/phase4-wiring:app/js/version.js  →  APP_VERSION = "08.26"
git rev-parse origin/claude/phase4-wiring               →  7e2931f795af1cd97efc1167660cea93aa22b9ab
```

Two different builds carrying one version number is the kind of collision nobody notices until a bug report names a version that means two things. Recorded in `version.js` itself.

### 1.4 The persistence gate, checked in the repository rather than inferred

The instruction says not to infer deployment status from a document. Read directly from `firestore.rules` at this commit:

| Check | Result |
|---|---|
| `notes`, `noteRevisions`, `noteSources`, `noteFolders`, `notePlacements` in deployed rules | **0 occurrences** |
| Any `hadith` collection in deployed rules | **0 occurrences** |
| `firebase.json` `indexes` key | **absent** |
| `firestore.indexes.json` | **does not exist** |

**A further finding the H0 report did not have:** it is not only Note and MMJ that are closed. **No Hadith collection is ruled either**, so *any* Hadith Firestore write is denied by default too. The gate is therefore doubly closed for this module, and this tranche persists nothing anywhere — which is not a workaround but the only honest behaviour available.

---

## 2. What was built

| File | What it is |
|---|---|
| `app/js/hadith-fixture-data.js` | The synthetic corpus — 2 collections, 2 editions, 6 books/chapters, 8 narration occurrences, 8 external references, 1 topic, 3 topic mappings |
| `app/js/hadith-corpus.js` | The pure read model — browse, language resolution, search, topic index. No DOM, no network |
| `app/js/hadith-commentary.js` | Classical Explanations — the two verified register entries, outbound links only |
| `app/js/hadith-browser.js` | The rendering component **both routes share** |
| `app/hadith-collections.html` | `?` standalone · `?mount=quranrevival` mounted — same component, separate routing |
| `tools/i18n-verify/hadith-corpus.mjs` | 26 checks, including the closed-gate guards |
| `tools/i18n-verify/hadith-commentary-binding.mjs` | 14 checks binding the module to the manifest |

**Preview:** `node serve.js`, then `http://localhost:8080/app/hadith-collections.html` (add `?mount=quranrevival` for the mounted route).

---

## 3. What makes the fixtures safe — beyond a flag a renderer could forget

The instruction requires that fixtures never be represented as real narrations, never be published as authentic Hadith, and never accidentally enter a production corpus. A `synthetic: true` flag satisfies none of that on its own: a flag lives in the data, and the danger is text leaving the data — copied, screenshotted, scraped.

**So the Arabic source text itself denies being a hadith.** Every synthetic narration opens:

> **هذا نص تجريبي وليس حديثاً** — "this is a test text and is not a hadith"

A fragment that escapes this repository carries its own denial, in the language a reader of the source text would be reading. The same denial is in the English and Bangla slots. A guard asserts it for all eight occurrences, so a future fixture cannot be added without it.

Three further safeguards, each asserted:

- **Every id is prefixed** `synthetic-` / `syn-`, so a fixture cannot collide with a real collection or edition id, and a real import cannot silently overwrite one.
- **No fixture carries a grade, a real narrator or a source URL.** A grade is an attributed claim and a fixture has no scholar to attribute it to; `auditStatus` is `synthetic-unreviewed` throughout.
- **The banner is never conditional and never dismissible**, and renders in all three languages at once — a reader in any one of them can tell this is not real without first changing their language setting.

### 3.1 The fixture's shape is deliberate — each property proves a requirement

| Property | What it demonstrates |
|---|---|
| **Two** collections | The Ṣalāh index is genuinely **cross-collection**, not a single book relabelled |
| Collection Beta has **no chapter level** | The plan requires supporting an edition whose hierarchy has none; the UI says so rather than rendering an empty list |
| `syn-occ-0006` repeats `syn-occ-0005`'s text | **A repeat is its own occurrence** and is never merged by text |
| `syn-occ-0008` has **no Bangla** | The language fallback label has a real case, not a hypothetical one |

---

## 4. The Classical Explanations gate, built as an inability

The instruction is explicit: *"Do not attach these links to arbitrary synthetic narration records as if they were the verified reports."*

The two register entries are matched to **real** narrations — Bukhārī 1 and Muslim 1907a — by an **external reference**, a scheme plus a displayed number. They are matched to no occurrence in this repository, because no edition is approved and so no real occurrence exists here.

`commentaryForOccurrence()` therefore returns nothing for every synthetic occurrence, **by construction rather than by discipline**, and the register entries live on their own labelled surface beside the corpus rather than inside it. Attaching Ibn Ḥajar's commentary to a narration this project invented last week is a screen the code cannot draw.

Verified on the rendered page and in a pure suite:

- Both entries shown, with scholar, work (English **and** Arabic), location, edition-location and review status.
- Outbound links are the exact URLs the register verified, `rel="noopener noreferrer"`.
- `narration_occurrence_id` is **`null`** on both, on screen.
- `mayShowText` is **`false`** on both — citation and link, no commentary text.
- Ibn Ḥajar pairs with Bukhārī and al-Nawawī with Muslim; a swap fails the suite.
- The four prohibitions are rendered on the page, read out of code.

**No commentary text was fetched, cached, embedded or stored.** No request was made to islamweb.net, sunnah.com, OpenITI or HadeethEnc in this session.

---

## 5. Three real defects, found three different ways

### 5.1 Track defaulted to "Not Applicable" — found by looking at a screenshot

`STATUSES` begins with `not_applicable`, so an untracked narration's `<select>` displayed **"Not Applicable"** — which under **I7** means *excluded from totals*, a real claim about the unit. Every assertion passed: the control existed, was the right height, carried its warning.

A placeholder option (`"Not tracked"` / `"চিহ্নিত করা হয়নি"`, value `""`) is selected when nothing is tracked, and choosing it clears the entry. Two checks now assert the default is the placeholder and that it never reads "Not Applicable".

### 5.2 The commentary link orphaned its arrow — found by looking, diagnosed by probing

At 390px the link wrapped, leaving "↗" alone on a second line. The first fix attempt was going to be guesswork, so it was measured instead: the label needs **345px**, and `parentElement.clientWidth` reported **353px** — apparently enough.

**`clientWidth` includes padding.** The real content box was **327px**. The text genuinely did not fit.

Fixed properly: the link is sized to the card's own text (0.9rem, needing ~310px), its tap target comes from padding rather than a 40px `line-height`, and a non-breaking space glues the arrow to the last word in both languages. Two checks now measure the rendered height and the glue.

### 5.3 Search interleaved the two collections — found by a test

`searchCorpus` ordered a cross-edition list by `sourceOrder`. **`sourceOrder` is scoped to its own parent**, so both editions start at 1 and collection Beta's first narration sorted between Alpha's first and second.

Now a named `compareBySourcePosition` orders by `(edition, sourceOrder)`. The test was tightened from a lexicographic sort — which could not have caught this — to asserting the editions do not interleave and each runs in its own source order.

---

## 6. The three languages

**Arabic is the source text; English and Bangla are attributed translations.** That distinction is in the data (`text.{ar,en,bn}` with `translationAttribution`), not just in the UI.

- **Arabic renders at twice the body text, measured on the rendered page: 32px against 16px**, right-to-left, with its own line height.
- **A missing translation is never fabricated.** `resolveText()` falls back to the **source** language and returns `isFallback`, the requested language and whether even the source is missing. The UI renders a labelled notice naming both languages. It never substitutes another translation dressed as the one asked for, and never an empty string a renderer would print as a blank line.
- **Every occurrence states which languages it actually has.**
- **Search covers all three**, and reports **where** it matched — narration text or source heading. A reader searching "prayer" and landing on a narration whose own text never says "prayer" is told it matched the chapter heading; conflating the two would make a heading look like narration content.
- **The UI is English and Bangla**, through the app's own `t()`. 32 new strings, all translated; the browser tab title too.

**Bangla is not optional in the architecture**: it is one of three first-class content slots, with its own attribution field, and the one deliberate gap exists precisely so the fallback path is exercised rather than assumed.

---

## 7. Evidence

### 7.1 Rendered — 58 checks, 0 failures

Playwright against the real served page at 390×844, both languages, both routes, screenshotted and **read**. Covering: boot with no page errors; the three-language notice; browse through collection → book → chapter → occurrence with source order preserved; the no-chapter-level edition; the repeat occurrence listed separately and labelled; the Bangla fallback; Track's placeholder and not-saved warning; **zero Firestore requests of any kind**; no synthetic card carrying commentary; the cross-collection topic index with separate distinct/mapping counts, taxonomy revision and unreviewed warning; search in all three languages with match location; both commentary entries with URLs, `rel`, `mayShowText=false` and null occurrence ids; the scholar-collection pairing; no horizontal overflow; every control ≥40px; the Bangla UI including the tab title; and the mounted route showing the shell and badge **v08.27** while the standalone route hides it.

### 7.2 Pure suites

| Suite | Result |
|---|---|
| `hadith-source-rights.mjs` | **14 passed, 0 failed** (exit 0) |
| `hadith-corpus.mjs` | **26 passed, 0 failed** (exit 0) |
| `hadith-commentary-binding.mjs` | **14 passed, 0 failed** (exit 0) |

Each carries a positive control, because a guard whose loader silently read nothing passes every case vacuously.

### 7.3 Regression — nothing else moved

| Suite | Result |
|---|---|
| `stub-parity.mjs` | 3 / 0 |
| `study-approach-contract-boundary.mjs` | 16 / 0 |
| `journey-map-boundary.mjs` | 13 / 0 |
| `note-foundation-boundary.mjs` | 30 / 0 |
| `study-note-boundary.mjs` | 17 / 0 |

`app/quranrevival.html`, `app/hadith-study.html` and `app/index.html` are **byte-identical to `origin/main`** — stronger and cheaper than a `layout.mjs` shim comparison, because the landing page did not change at all.

**Coverage 1,803 / 47 → 1,852 / 61**, measured against the sibling worktree rather than quoted from the brief. All 14 added "missing" strings were read and classified: **13 are fixture CONTENT** carrying their own `{ar, en, bn}` maps (collection names, book and chapter titles, the topic label) — the same class of false positive as surah names — and **one was a genuine gap**, the page title, now translated. `"Classical Explanations"` is translated through `PANEL_TITLE`, not `bn.js`.

### 7.4 One expected failure, stated rather than hidden

`brief-integrity.mjs` reports **6 passed, 2 failed**:

- **`origin/claude/pensive-knuth-2pu3jj` unresolvable** — environmental. `git ls-remote` confirms the branch exists on the remote; this sandbox's clone has a narrow fetch refspec. Same class as the H0 report's §8.1 finding.
- **The version check fires, correctly.** It compares the brief's `Current milestone: v08.25 on \`main\`` line against the local `version.js`, which now reads `08.27`. **The brief's line is true and was deliberately not altered** — claiming v08.27 is on `main` would be false. Recorded in `CLAUDE.md` with a proposed one-line fix (compare against `git show origin/main:app/js/version.js` when `HEAD` is not `main`), **not applied**, because that guard belongs to the Quran side of the ownership map.

---

## 8. Inventory — what is synthetic, and what is not

| Surface | Status |
|---|---|
| Every narration, chain, translation, heading, collection and edition in the browser | **SYNTHETIC.** Invented for development; the Arabic says so |
| The Ṣalāh topic and all three of its mappings | **SYNTHETIC and UNREVIEWED.** No scholar has seen them |
| External reference numbers | **SYNTHETIC scheme** (`synthetic-sequential`) naming synthetic editions |
| The two Classical Explanations entries | **REAL and verified** — Bukhārī 1 → Ibn Ḥajar, Muslim 1907a → al-Nawawī. Outbound links only, bound to external references, **not** to anything in this repository |
| Track state | **In memory only.** Cleared by a reload. Nothing is written anywhere |
| Notes and Mapping My Journey | **Not built.** Their collections are unruled; every write would be denied |

---

## 9. Gates — reported against each

| Gate | Status |
|---|---|
| **Permanent Hadith unit key** | **HELD CLOSED.** No `buildUnitKey` reference and no `hadith:` key literal exists in any Hadith module — asserted by a guard, not by discipline. Occurrences are keyed by an opaque internal `occurrenceId`. The proposal the instruction asked for is §10 |
| **Real source text and translations** | **HELD CLOSED.** Zero editions approved; the rights model still fails closed; nothing fetched, cached or embedded. No API availability, web visibility or confidence was treated as a grant |
| **Note/MMJ persistence and Rules** | **HELD CLOSED**, and verified in the repository (§1.4) rather than inferred. Nothing persists. Track is demo state and says so on screen, in the reader's language, every time |
| **Integration and release** | **HELD CLOSED.** No merge, no deployment, no migration, no Rules or index change |

---

## 10. The unit-key proposal the instruction required

Requested before any application of the key change: immutable edition ID, occurrence ordinal, legacy mapping, parser compatibility, numeric bound and collision handling.

**Proposed form** (unchanged from H1 §5): `hadith:<editionId>:<occurrenceOrdinal>`.

| Question | Answer |
|---|---|
| **Immutable edition ID** | Minted once when an edition is approved, from a registry, never derived from a name. Lowercase `[a-z0-9-]`, 3–24 chars, e.g. `bk1422h`. **Immutable by rule**: a corrected reprint is a NEW edition id, never an edit to an existing one, because occurrences are numbered within it |
| **Occurrence ordinal** | The occurrence's 1-based position in that edition's own source order, zero-padded to 5 digits. Assigned by the import run and frozen by its manifest's `rowCounts` and `sourceChecksum`. **Distinct for every repeat**, which is what makes a repeat representable |
| **Legacy mapping** | Existing `hadith:<name>:<number>` keys are **never rewritten** (I4). A `legacyHadithKeyMap` record maps an old key to an occurrence id once a reviewer confirms the edition it meant. Unmapped legacy keys stay readable and render with their raw key and a "not resolved to an edition" label — legible, never destroyed, never silently reinterpreted |
| **Parser compatibility** | `parseUnitKey` is untouched: it splits on the first colon and returns the rest. The shape still matches the accepted `/^hadith:[A-Za-z0-9_-]+:\d{1,6}$/` in `study-note-binding.js`, so ADR-009's `sourceKind` derivation, `records.js`, `claimStatus()` and `chunkKeyFor()` all need no change |
| **Numeric bound** | The accepted regex caps the ordinal at **6 digits — 999,999 occurrences per edition**, far beyond any real collection. A 5-digit pad leaves headroom inside that bound. An import exceeding it must fail loudly rather than truncate |
| **Collision handling** | A key is unique by construction: one ordinal per position per edition. The import manifest asserts `rowCounts` against distinct ordinals and reports `duplicateIds`; a collision fails the import. Cross-edition collision is impossible because the edition id is in the key — which is the whole point, since two editions' "number 1" are different narrations |

**Still required before any of this is applied, and not obtainable in this environment:** a live read-only inventory of existing `hadith:` records in production Firestore. **The gate stays closed**, and fixture-only work continues as authorised.

---

## 11. What this tranche deliberately did not do

- **The QuranRevival mount into `app/hadith-study.html` itself.** The owner's H0 decision was to EXTEND that module, and the cost recorded there binds: its renderer is shared with Deen Study, Arabic, General Study and Nature-Life, so the corpus view needs its own renderer behind the same module id, and editing a live page is a real layout change needing before-and-after measurement. **`?mount=quranrevival` demonstrates the shared component inside the QuranRevival shell today**, touching no existing page. The live-page edit is H2-B.
- **Hadith Approach ids.** `APPROACH_TEMPLATES` is hardcoded to Quran (`catalogue.js:211`). The registry audit and the recorded decision are H2-B; **no Quran Approach number has been assigned to Hadith**, and Track currently carries no Approach at all.
- **Explore aggregation.** The topic index provides the counting model it needs; the Explore surface is H2-B.
- **Notes and MMJ, even as demo state.** Their collections are unruled and the Note editor is already held behind the same deployment gate on the Quran side. Adding a demo Note surface would invite the exact "successful-save claim" the instruction forbids.
- **`tools/i18n-verify/brief-integrity.mjs`.** A one-line improvement is proposed, not applied — §7.4.
