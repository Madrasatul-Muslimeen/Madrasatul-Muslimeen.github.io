# Hadith Study — Stage A correction and Stage B limited implementation

**Date:** 2026-09-18 · **Branch:** `feature/hadith-study`
**Stage A commit:** `7f6132888bc02728e07e2214b5a8d6323708e00a` (app version **08.28**)
**Stage B commit:** `STAGEB_SHA` (app version **08.29**)
**Gate status:** H2-A corrected; H2-B delivered in the limited scope authorised. **No merge, no deploy, no Rules change, no durable write, no permanent Approach ID.**

---

## 1. State at the start — and a version collision that was real

`git fetch origin --prune`, then the refs read rather than remembered:

| Fact | Value |
|---|---|
| `origin/main` **had moved** | `1cac2b8` → **`6758490cf957c646df4945ad52b0cf403cc3cf61`** |
| What landed on `main` | v08.26 (the 320px nav fit) **merged**, then **v08.27** (the Study-options number pickers) shipped |
| `main`'s `APP_VERSION` | **`08.27`** |
| This branch's `APP_VERSION` | **`08.27`** — **the same number** |
| Phase 4 wiring (`claude/phase4-wiring`) | `7e2931f795af1cd97efc1167660cea93aa22b9ab`, still stamping **08.26**, now superseded by `main`'s own 08.26 |

**The collision was real, not a reservation.** This branch took 08.27 while `main` was
on 08.25; `main` then took 08.26 **and** 08.27. For a period, two different builds
carried one version number — exactly what a version number exists to prevent, and what
the branch's own `version.js` comment had warned about for the 08.26 case.

**Resolved by measurement, not arithmetic.** Every one of the **59** remote branches was
read for its `APP_VERSION`; **08.28** and **08.29** were free. Stage A took 08.28,
Stage B took 08.29, and 08.29 was re-checked for collisions immediately before the bump.

| Version | Owner | Reason |
|---|---|---|
| 08.26 | `main` (merged) | nav fit |
| 08.27 | `main` (shipped) | number pickers |
| **08.28** | **this branch, Stage A** | the synthetic-namespace correction |
| **08.29** | **this branch, Stage B** | the corpus integration and Explore |

**The branch was also seven commits behind `main`**, which would have made Stage B's
before/after layout measurement meaningless — `main`'s own changes were to selects and
pickers. `origin/main` was merged into the branch as its **own commit** before any
Stage A work, with one conflict in `version.js` resolved **to `main`'s content** (the
branch side carried an obsolete reservation comment for an 08.26 that `main` had since
merged). `CLAUDE.md` auto-merged; `main`'s milestone corrections and the Hadith block
both survived.

---

## 2. Stage A — the synthetic namespace, enforced rather than described

### 2.1 What was wrong

`app/js/hadith-fixture-data.js` stated its own safety rule: *"EVERY ID IS PREFIXED
`synthetic-`."* **The data did not satisfy it**, and the guard suite had codified the
prefixes *as built* rather than the rule *as stated*, so the gap could not fail a check.

| Id family | Actual prefix | Matched the stated rule? |
|---|---|---|
| Collections, editions, books, chapters | `synthetic-` | Yes |
| Occurrences | `syn-occ-` | No |
| Topic mappings | `syn-map-` | No |
| **Topic** — `topic-salah` | *(none)* | **No — no synthetic marker at all** |

Only the last one mattered. `syn-occ-` and `syn-map-` are visibly non-real; the
discrepancy there was **wording**. `topic-salah` was a genuine hazard: a future reviewed
Ṣalāh topic would very plausibly be minted under exactly that id, at which point three
`reviewStatus: "unreviewed"` synthetic mappings would share a topic id with real ones.

### 2.2 What was done

**Renamed to `synthetic-topic-salah`** across the fixture, its three mappings, the
browser's topic call and the suite. **Nothing stale survives it**, established rather
than assumed: no JSON artefact in the repository references a topic id, and the Hadith
module performs **no durable write of any kind** — a grep of `app/js/hadith-*.js` for
`setDoc`, `updateDoc`, `addDoc`, `runTransaction` and `writeBatch` returns nothing.

**The comment was corrected** to state the namespace as it really is: `synthetic-` for
the hierarchy and the taxonomy, `syn-occ-` and `syn-map-` for the two row-level
families, with the reason the old wording was wrong recorded in place.

### 2.3 Three new GATE checks, none asserting a literal value

1. **The id sweep** walks every fixture export and checks each id against *its own
   family's* permitted prefix, so a new row joins the sweep automatically. It carries a
   **positive control** — at least 20 ids, and five named families must actually appear
   — because a sweep that gathered nothing would pass every case vacuously.
2. **The collision check** refuses any id a real taxonomy or edition import would
   plausibly mint (`topic-salah` is in that list *because the fixture really did hold
   it*), plus the general rule that stripping a synthetic prefix must not yield another
   fixture id.
3. **The referential check** refuses a half-done rename: every mapping must name a topic
   that exists, and every topic must resolve through `topicIndex()` to a non-empty index.

### 2.4 Failing-then-passing, then mutation-proven

**Before the rename**, with the checks already written: **27 passed, 2 failed**, the two
naming `topicId="topic-salah" (needs "synthetic-")` and `a fixture id is also a
plausible real id: topic-salah`. **After the rename: 29 passed, 0 failed.**

Then four mutations, because a check that has not been made to fail has earned nothing:

| Mutation | Result |
|---|---|
| Revert one mapping to the old id (a half-done rename) | **All three GATE checks fail** |
| Blind the id sweep (`walk([])`) | **Positive control fires** — *"the id sweep found only 0 ids"* |
| Give the topic the wrong family's prefix (`syn-` where `synthetic-` belongs) | **Sweep fails** |
| Revert the topic id entirely | **Two checks fail**, as in the failing state above |

---

## 3. Stage B — the corpus inside the Hadith module

### 3.1 The integration, and what it deliberately does not touch

`app/hadith-study.html` gains a `#hadithCorpusSection` **beneath** the existing
Approach/Track surface, mounting the same `mountHadithBrowser` component the standalone
route uses. **`app/js/topic-study.js` — the shared renderer used by eight pages — is
byte-for-byte untouched**, as are `catalogue.js`, `catalogue-data.js`, `records.js`,
`activity.js`, `firestore.rules` and `firebase.json`.

**The standalone route is preserved.** `hadith-collections.html` still mounts the
identical component; one component, two routes, so the two cannot silently diverge.

### 3.2 A real coupling defect, found by probing rather than by reading

The first integration put the mount in the **same module script** as
`import { initTopicStudyPage }`. That script also pulls the Firebase SDK from the CDN —
and in a browser that cannot reach `gstatic`, **the whole module script fails and
everything in it is skipped**. The corpus rendered *nothing at all*, **with no page
error to say so**: `rootChildren: 0`, heading empty, `pageerror` list empty.

The corpus reads synthetic fixtures, needs no sign-in and writes nothing, so it has no
business dying with Firebase. **It now mounts from its own `<script type="module">`**,
and with Firebase still completely unreachable it renders correctly — `rootChildren: 3`,
heading `Hadith Corpus`. Separate scripts, separate fates.

### 3.3 Two defects every assertion passed through, found by LOOKING at the screenshot

With 60 rendered checks green — mounted, sized, positioned below the shared surface,
translated, no overflow, no errors — the screenshot showed the component **wrong**:

- the not-Hadith notice had **lost its red warning panel** and rendered as plain text;
- every collection row rendered as a **dark navy block with the edition id run into the
  name** ("Sample Collection Alphasynthetic-alpha-ar-v1 · Synthetic").

The markup was perfectly correct. The **styles were trapped inside
`hadith-collections.html`'s inline `<style>` block**, so the component only looked right
on the one page that happened to carry them — *a palette belongs to a surface, and a
component rendered on two surfaces must carry its own.*

**Fixed by extracting the component's rules into `app/css/hadith.css`**, linked by both
pages. The standalone page keeps only its own chrome (body width, heading sizes)
inline — deliberately, because imposing those on the module page would restyle headings
the corpus does not own. The standalone page is visually unchanged; the integrated page
now renders identically to it. Both are asserted by **computed style**, not by element
existence: the banner's `border-top-width` is `2px` in its red, and `.hadith-row`'s
background is `rgb(255, 255, 255)`.

### 3.4 A regression this tranche caused in a shared suite, and the narrow fix

Mounting the corpus into `hadith-study.html` — which **is** in `behaviour.mjs`'s
`NAV_PAGES`, where the standalone page is not — turned `no Bangla leaked into an English
page` **red**. It was a real failure caused by this tranche, not a stale check.

It is also a genuine conflict between two correct requirements: the synthetic notice
**must** print in Arabic, English and Bangla on every page in every language (a
non-negotiable gate — a reader of any one of them must be able to tell the corpus is
invented without first changing their language setting).

The check already had an established pattern for exactly this: three language pickers
are excluded by id, with the reason recorded in place. **`#hadithSyntheticBanner` and
`#hadithContentLang` join that list**, in both of the file's two leak checks, with the
reason recorded in the same style. **Excluded by ELEMENT, never by page**, so a genuine
leak anywhere else on that page still fails.

**The first attempt at this was insufficient, and a positive control is what caught it.**
After excluding the banner the clean page still reported a leak; rather than widen the
exclusion, the source was located — the corpus's own **content-language picker**, which
names each language in its own script, the identical category as the three already
excluded. Proven both ways afterwards: a deliberate Bangla paragraph seeded into the
page **is detected**, and the clean page passes.

**This is the one shared-file edit in this tranche**, and it is flagged for the
Quran/shared-file owner rather than assumed: `tools/i18n-verify/behaviour.mjs`, two
lines plus their recorded reason, adding two Hadith-owned element ids to an exclusion
list that already existed for this exact purpose.

### 3.5 Before/after measurement — 8 pages × 3 widths × 2 languages

48 measurements per run (overflow, body height, `#app` height, nav height, `h1` top,
element count), taken before any Stage B change and again after all of them.

| Result | Count |
|---|---|
| **Byte-identical** | **42 / 48** |
| Changed — **`hadith-study` only** | 6 (element count 34 → 66, this round's own nodes) |
| Changed — **any of the seven sibling topic-study pages** | **0** |

`arabic-study`, `deen-study`, `general-study`, `life-skill`, `naturelife-study`,
`bookmarks` and `quranrevival` are unchanged on every measured metric at phone, tablet
and desktop widths in both languages.

---

## 4. Stage B — the Approach registry audit, with NO ID allocated

Delivered as `docs/governance/hadith-approach-registry-PROPOSAL-2026-09-18.md`.
**No permanent Hadith Approach ID is allocated, no Quran number is reused or reserved,
and `catalogue.js` and `catalogue-data.js` are not modified.**

**What the audit found, read from the code:**

- **30 Approaches**, `approach_01`…`approach_30`, in 7 sections (`catalogue-data.js:222`).
- They are **bound to Quran at SEED time, not in the template**: `catalogue.js:190-206`
  writes every one with `moduleId: "quranrevival"`, `subjectId: "quran"`, hardcoded. The
  template itself carries **no `moduleId` and no `subjectId`** — measured, both sets empty.
- **Hadith has exactly one trackable and it is not an Approach**: `studied_hadith`,
  `moduleId: "hadith"`, `subjectId: null`, name **"Studied"** — one of nine generic
  module rows.
- **The corpus component claims no Approach whatsoever**: a grep of `hadith-browser.js`
  and `hadith-corpus.js` for `approach_`, `Approach` and `studied_hadith` returns nothing.

**Reusing `approach_NN` for Hadith is refused**, on three facts about the code: a
trackable id **is** a document id (`${tenantId}__${t.id}`); claims are keyed by
`trackableId` (I5), so the same id would silently reinterpret existing Quran claims; and
the seed hardcodes `subjectId: "quran"`. The proposal offers `hadith_approach_NN` in its
own namespace and its own template list — **for review, with no number assigned.**

Eight candidate Approaches are listed **unnumbered**, each naming its Quran analogue or
saying plainly there is none. Three have no Quran counterpart at all (understanding the
chain, grading and authenticity, topic study), which is the clearest argument that
Hadith needs its own set rather than a copy. **The count is not a proposal either** —
Hadith is not obliged to have 30, and "the 30 Approaches" is Quran terminology.

---

## 5. Stage B — demo-only Explore aggregation

`exploreAggregate()` counts the **source hierarchy** and the **taxonomy**, and
deliberately counts **no progress at all**.

**Progress is reported as UNAVAILABLE, never as zero.** A zero would read as "nothing
studied yet"; the truth is that nothing durable exists to count, because Track is a
plain `Map` cleared by a reload. Inferring completion from a temporary control is
exactly the misleading claim the instruction forbids. The surface says so in words, in
the reader's own language: *"No progress is counted here. Track is a preview that a
reload clears, so there is nothing durable to aggregate."*

### 5.1 Distinct narrations versus topic mappings — and a model this round got wrong first

The Ṣalāh topic reports **5 distinct narrations from 3 mappings**.

**The first implementation computed "overlap" as `mappingCount - distinctOccurrences`
and had the relationship backwards.** Two rendered checks failed; investigating showed
the *model* was wrong, not the checks. Measured directly: the three mappings are one
chapter, one whole book, and one single occurrence — so **a mapping may cover many
narrations, and mappings are normally FEWER than narrations, not more.**

The aggregate now reports what was measured:

| Field | Value | Meaning |
|---|---|---|
| `mappingCount` | 3 | how many **curatorial decisions** were made |
| `distinctOccurrences` | 5 | how many **narrations** those decisions reach |
| `listedEntries` | 5 | how many rows the index actually lists |
| `duplicateReaches` | **0** | narrations reached by more than one mapping |

Double-reach is **possible** (a chapter mapped, and a narration inside it mapped as
well) and is what "distinct" guards against; in this fixture it is zero, and the surface
**says so either way** rather than being silent — *"No narration here is reached by more
than one mapping."* The suite asserts `mappingCount < distinctOccurrences` and
`listedEntries == distinctOccurrences`, so if the fixture ever changes, the wording must
change with it.

**A repeat narration is its own narration**, counted once per occurrence and never
merged by text — reported as its own total and asserted against the fixture.

### 5.2 Four Explore checks, all mutation-proven

| Mutation | Caught by |
|---|---|
| Collapse the two counts into one | *distinct narrations and topic mappings are reported SEPARATELY* |
| Report progress as `{available: true, count: 0}` | *the aggregate counts the SOURCE, and never counts progress* |
| Let the aggregate name `studied_hadith` | *the aggregate reaches no progress store of any kind* |

The last check reads the function's own source and refuses `records`, `activity`,
`chunkKey`, `trackableId`, `approach_`, `claimStatus` and `demoTrack`.

---

## 6. Evidence

### 6.1 Pure suites

| Suite | Stage A | Stage B |
|---|---|---|
| `hadith-source-rights.mjs` | 14 / 0 | 14 / 0 |
| `hadith-corpus.mjs` | **29 / 0** (was 26) | **33 / 0** |
| `hadith-commentary-binding.mjs` | 14 / 0 | 14 / 0 |
| `quran-boundary` · `study-approach-contract-boundary` · `study-activity-evidence-boundary` · `note-foundation-boundary` · `study-note-boundary` · `journey-map-boundary` | all 0 failures | all 0 failures |
| `firestore-index-requirements` · `rules-authorisation-executable` · `rules-deployment-candidate` · `stub-parity` | 8 / 38 / 10 / 3, all 0 failures | same |

### 6.2 Rendered

**Stage A** — 22 / 22 at 390×844 in English and Bangla on the standalone route: the
renamed topic resolves on the served page, the bare id returns `null`, the index still
spans both collections, the counts still differ, the taxonomy revision still travels,
mappings still present as unreviewed, the not-Hadith notice is on screen in all three
languages, **zero Firestore requests**, no page errors, no overflow.

**Stage B** — **100 / 100**: the integrated route at three widths in both languages
(mounted, sized, below the shared surface which is still present, translated heading,
**red banner panel by computed style**, **white row background by computed style**,
Explore tab offered, both notices on screen, no overflow, no page errors), plus the
standalone route and the Explore tab's own content in both languages (the renamed topic
named, progress reported unavailable, both figures shown, the difference explained in
words, double-reach stated either way, taxonomy revision shown, repeats explained).

**Screenshots were read, not merely captured** — which is how §3.3's two defects were
found, and how a wrong assertion in the Stage A preview was identified as wrong (the
page says *"have not been reviewed"*, not *"unreviewed"*).

### 6.3 `behaviour.mjs` — the scoped regression

**978 passed, 4 failed, 56 sections — 982 checks**, identical to the Stage A run and to
the same total `main` itself records (981 / 1 + the intermittent trio = 982). All four
failures are the documented environmental classes:

| Failure | Class |
|---|---|
| `22g` screensaver caption / alt text / poster URL (×3) | **Environmental** — this sandbox cannot reach `archive.org`. The brief records these as **intermittent**, not permanent |
| `31e` no page errors — `net::ERR_CERT_AUTHORITY_INVALID` | **Environmental** — the sandbox's TLS interception |

**One new failure appeared mid-tranche and was fixed, not tolerated** — the language-leak
regression in §3.4. It is worth recording that the run which caught it was killed and
re-run from scratch afterwards rather than being read around: a regression found at
section 2 invalidates the other 54.

### 6.4 `brief-integrity` — the known branch-scoped failure, recorded not patched

**7 passed, 1 failed** on this branch; **8 / 0 on `main`**. The failure is the milestone
line's version against the working tree's, which is right on `main` and wrong on any
feature branch carrying a bump.

`main`'s upgraded guard now offers a legitimate route out — a milestone line naming the
**branch** and also stating `` `main` is still vNN.NN `` passes both halves. **That line
is the Quran/`main` side's to write.** Rewriting it from Hadith is exactly the silent
shared-file edit the instruction forbids, so it is recorded. The **Hadith-owned block**
in `CLAUDE.md` is updated to state the real current versions; **the milestone line is
untouched.**

---

## 7. Gates — reported against each

| Gate | Status |
|---|---|
| Synthetic text marked **not Hadith** in ar/en/bn | **HELD.** All three on screen on both routes, in both UI languages, asserted on the rendered page. The Arabic source text still denies being a hadith in its own first clause |
| Fixture ids never mixed with real edition ids | **HELD, and now ENFORCED** — the §2.1 defect is closed and three checks refuse its return |
| Source rights default `blocked`; link-only; no copied text | **HELD.** `hadith-source-rights` 14 / 0. No corpus or commentary text fetched, cached or embedded; no request made to any source site |
| Durable Hadith unit-key semantics unchanged | **HELD.** No key applied, no record written, live read-only inventory still not obtainable |
| Note/MMJ and live Track persistence closed | **HELD.** Zero Firestore requests from either route, asserted on the rendered page. No durable write exists anywhere in the module |
| Deployed Rules | **UNVERIFIED and untouched.** `firestore.rules` and `firebase.json` byte-identical |
| **No permanent Hadith Approach ID; no Quran number reused** | **HELD.** Registry is a proposal; `catalogue.js` and `catalogue-data.js` unmodified |
| Track clearly demo/in-memory, and `studied_hadith` not presented as an approved Approach | **HELD.** The corpus names no trackable and no Approach at all, and says nothing is saved every time |
| Version bumped per app-code tranche | **HELD.** 08.27 → **08.28** (Stage A) → **08.29** (Stage B), each checked against all 59 branches |
| No merge, deploy, migration or Rules deployment | **HELD** |

---

## 8. What was NOT done, and why

- **The corpus sits inside `#app`**, so on the module page it appears once signed in, as
  the rest of that page does. The **standalone route is the no-sign-in path** and is
  preserved. Moving it outside `#app` would change the signed-out view of a live page
  and was not asked for.
- **No Hadith Approach exists**, by instruction. Track on the module page still uses the
  generic `studied_hadith` row, and nothing presents that as an Approach.
- **`CHANGELOG.md` is not updated.** The project's own rule is that a round reaches the
  changelog first, but `CHANGELOG.md` is a shared file owned by the Quran/`main` side and
  this work is unmerged. **Flagged as a merge-time obligation** rather than edited from here.
- **The `hadith-collections.html` page chrome** (body width, heading sizes) stayed inline
  rather than moving into the shared stylesheet — imposing it on the module page would
  restyle headings the corpus does not own.
- **No real source text, translation or commentary** was fetched, cached or embedded.

**Flagged, not caused, not fixed.** On the Bangla integrated page the shared Approach
surface prints its subject heading as the lowercase English `hadith`, above the
translated corpus section. That comes from the **shared topic renderer**, which is
**byte-identical to `origin/main`** and untouched by this tranche — confirmed by
`git diff --quiet origin/main -- app/js/topic-study.js`. It is pre-existing behaviour
made visible by putting a translated section next to it, and it belongs to the shared
renderer's owner, not to Hadith.

---

## 9. For the Master Architect

1. **Accept or direct the Stage A correction** — the namespace is enforced, mutation-proven four ways.
2. **Accept or direct the Stage B integration**, including the one shared-file edit in §3.4 (`behaviour.mjs`, two element ids added to an existing exclusion list, reason recorded).
3. **Decide the Approach registry questions** in §4 of the proposal — whether Hadith gets its own set at all, the id scheme, which candidates survive, and whether an Approach may exist before a rights-cleared edition does. **No ID may be minted until that is answered.**
4. **Note the version collision** in §1: `main` shipped 08.27 while this branch held it. The branch now holds 08.28–08.29.
5. **Relay to the Quran/shared-file owner**: the `brief-integrity` milestone item (§6.4), the `CHANGELOG.md` merge-time obligation (§8), and the `behaviour.mjs` exclusion (§3.4).
