# The 22 "missing" `getElementById` targets — investigated, and none of them was missing

- **Date:** 2026-09-18
- **Repository:** `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`
- **Branch:** `claude/charming-rubin-xzxbk1`
- **Task:** handover **T2**, second item — establish which of `layout.mjs`'s 22 baselined missing `getElementById` targets are **stale references** and which are **missing live controls**, *before* changing any code
- **Blast radius:** **BR-0.** `git diff -- app/` is empty. The only change is `tools/i18n-verify/layout.mjs`.
- **Application version:** **unchanged at 08.26 on this branch** — no reachable application code or behaviour changed, so the badge must not move. (`main` remains 08.25.)
- **Result:** **22 deferred renders, 0 stale references, 0 missing controls. No application code should change, and none did.** The baseline was never debt; the measurement was conflating two different things. It is now able to tell them apart, and fails on the one that is real.

---

## 1. The question, and why it had to be answered before touching anything

`CLAUDE.md` has carried this as debt:

> **The baselines are honest but they are DEBT:** 22 missing `getElementById` targets …

"Missing" invites exactly one reading — *the app references controls that are not there* — which would mean either dead code or absent UI. The instruction was to establish which, before changing code. **Both readings turn out to be wrong.**

## 2. What the measurement actually claims

`layout.mjs` reads the **inline `<script>` text** of `app/quranrevival.html`, extracts every `getElementById("x")`, and reports the ids **not in the DOM at that moment**:

```js
const src = [...document.querySelectorAll("script")].map((s) => s.textContent).join("\n");
const ids = [...src.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1]);
return { total: uniq.length, missing: uniq.filter((id) => !document.getElementById(id)) };
```

**The moment is the landing page** — the only state this suite measures. Nothing in the scan distinguishes "this element does not exist" from "this element has not been rendered yet."

## 3. First finding: all 22 are authored in the page's own source

A grep for `id="<the id>"` in `app/quranrevival.html` returns **at least one hit for every one of the 22**. They are not names the code invented; the page writes them. They sit inside **JavaScript template literals**, which is why they are in `<script>` text rather than in static markup:

```js
<button type="button" class="qcr-icon-btn" id="asmaXBackToGroupsBtn" …>◂</button>
```

Mapping each id back to its enclosing function accounts for all 22 across **six render functions**:

| Render function | ids | Surface |
|---|---|---|
| `renderAsmaXNamesLevel()` | 3 | Asma → a group's Names level |
| `renderAsmaXRefsLevel()` | 5 | Asma → one Name's Refs level |
| `openAsmaXEditOverlay({…})` | 7 | the Asma edit overlay |
| `asmaXFileIntoRowHtml(kind)` | 3 | the "file under" row *inside* that overlay |
| `renderQcrCollectionView()` | 4 | QCR → a collection view |
| | **22** | |

## 4. Second finding: every one of them really renders — proven by walking the surfaces

A probe drove the app to each surface and recorded where each id first appeared.

| Step | Newly present |
|---|---|
| landing page | 0 |
| Asma → Groups level | 0 |
| **Asma → Names level** | `asmaXBackToGroupsBtn`, `asmaXAddExistingBtn`, `asmaXAddExistingSelect` |
| **Asma → Refs level** | `asmaXBackFromRefsBtn`, `asmaXEditThisNameBtn`, `asmaXAttachRefThisNameBtn`, `asmaXGroupsThisNameBtn`, `asmaXRefPosterBtn` |
| **Asma → edit overlay** | `asmaXEditTranslit`, `asmaXEditMeaningEn`, `asmaXEditBnName`, `asmaXEditBn`, `asmaXEditRef`, `asmaXEditWeak`, `asmaXEditIsPhrase` |
| **"+ Create a new Dual Name"** | `asmaXEditFileSelect`, `asmaXEditNewCollLabel`, `asmaXEditNewColl` — **3/3** |
| **QCR panel** | `qcrAddSurahSelect`, `qcrAddAyahInput`, `qcrAddItemBtn`, `qcrAddMsg` — **4/4** |

**All 22 appear.**

Two of them needed a state the first pass did not reach, and each taught something worth keeping:

- **The file-into row is conditional on both mode and argument**: `${mode === "create" && fileInto ? asmaXFileIntoRowHtml(fileInto.kind) : ""}`. Of the four `openAsmaXEditOverlay` call sites, exactly one passes `fileInto` — `#asmaXAttachNewDualBtn`, "+ Create a new Dual Name". Opening the overlay in *edit* mode, as the first pass did, correctly renders no file-into row. Driven through the real button, **3/3 appear**, the select carrying its `+ New Dual Names list…` option.
- **The QCR ids were a defect in my own probe, not in the app.** The first pass reported "collections offered: 0" because it looked for `[data-qcr-open-coll]` row buttons; QCR uses a `<select>` (`#qcrLevelSelect`), and the fixture holds **18** collections. Reached directly, **4/4 appear**. *A probe that finds nothing is a claim about the probe until proven otherwise.*

## 5. Third finding: a static rule that agrees, and separates the two cases for good

The walk is evidence but not a guard. The distinction it proves can be made mechanically:

- an id the page **authors** (`id="x"` appears somewhere in its own script) and that is absent at landing is a **DEFERRED render** — injected when its surface opens;
- an id the page **references but never authors anywhere** is **DANGLING** — `getElementById` returns null there and always will.

Run over the landing page:

```
getElementById targets : 250
present in the DOM     : 228
absent                 :  22
  of those, DEFERRED   :  22
  of those, DANGLING   :   0
```

**The static rule returns exactly the same 22, reached a different way**, and agrees with the browser walk. Two independent methods, one answer.

## 6. The classification asked for

| Class | Count | Which |
|---|---|---|
| **Stale references** (code names an element that no longer exists) | **0** | — |
| **Missing live controls** (a control that should be on screen and is not) | **0** | — |
| **Deferred renders** (authored, injected when their surface opens) | **22** | all of them |

**So no application code should change, and none did.** What was wrong was the measurement's vocabulary: it called a deferred render "missing", and `CLAUDE.md` recorded 22 of them as debt for as long as the suite has run.

## 7. What changed instead — `layout.mjs` only

1. The scan classifies absent ids as **`deferred`** or **`dangling`** instead of lumping them as `missing`.
2. The per-viewport line now reads `deferred (authored, rendered on demand): 22, dangling: 0`.
3. **A dangling target fails the suite** — a real assertion this suite has never carried. Previously a newly-absent id failed whether or not it was real, and 22 false ones were permanently tolerated to keep the exit code usable.
4. `KNOWN_MISSING_IDS` is **empty rather than deleted**, keeping the mechanism for a finding that really is pre-existing — the same shape `navcheck.mjs` uses, and for the same reason.

**This is strictly stronger.** The old check could only ask "is this id absent?", and had to forgive 22 absences to stay usable. The new one asks "is this id absent *and* unauthored?", forgives nothing, and gains a defect class it could not previously express.

### 7.1 Mutation-proven

A reference to an id nothing authors was injected beside a real one in `app/quranrevival.html`:

```js
const __mut = document.getElementById("idNobodyEverAuthors");
```

| | Result |
|---|---|
| with the mutation | **EXIT 1** — `!! DANGLING ID TARGETS (referenced, never authored anywhere): ["idNobodyEverAuthors"]` |
| restored | **EXIT 0**, `NO LAYOUT REGRESSIONS`, `app/quranrevival.html` byte-identical |

## 8. Verification

| Suite | Result |
|---|---|
| `layout.mjs` | **EXIT 0**, `NO LAYOUT REGRESSIONS`, `CHANGED: 0`, all 16 configurations; targets **250 → 250**, **deferred 22, dangling 0** |
| `layout.mjs`, mutated | **EXIT 1**, names the dangling id (§7.1) |
| `navcheck` / `panel` / `reading` | EXIT 0 each |
| `brief-integrity` | 8 / 0 |
| `rules-authorisation-executable` | 38 / 0 |
| `firestore-index-requirements` / `rules-deployment-candidate` / `stub-parity` | 8 / 10 / 3, all 0 fail |
| Translation coverage | **1,803 / 47**, unchanged |
| `git diff -- app/` | **empty** |

`behaviour.mjs` was **not re-run**, deliberately: this tranche changes only `tools/i18n-verify/layout.mjs`, which `behaviour.mjs` does not load, and `app/` is byte-identical. The `layout.mjs` shim (`app/_prev-quranrevival.html` plus `app/css/_prev-shell.css`, repointed) was built for the run and **deleted before the coverage total was read** — this project's own recorded trap.

## 9. What this tranche did NOT do

- **No application code change**, and therefore **no version bump** — the rule is that a version moves when reachable code or behaviour does.
- **No merge**, of either branch. `7e2931f` held, unmerged, not re-cut.
- **No Rules, index, schema or data change.**
- **The tenant-picker truncation is untouched** — still **O3**, an Owner UI decision.
- All seven pending-dependency items unchanged; the blocker is still **E1**, access.

## 10. The lesson worth keeping

**A baseline records what a measurement said, not what is true — re-derive it before paying it down.** These 22 sat in the brief as debt for the life of the suite. The word "missing" was doing the damage: it named a defect class the evidence never supported, and the honest-looking act of tolerating them by name made them look investigated. The fix was not to repair 22 controls; it was to notice that the measurement could not distinguish a control that had not rendered yet from one that does not exist — and to make it able to.
