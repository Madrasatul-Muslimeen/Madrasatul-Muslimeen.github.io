# Health Atlas — integration-readiness tranche 13: Gate A fixes, a full port-vs-source audit, and the diagram highlight

**21 Sep 2026. Dispatched by issue #115 comment `5764238189`** ("HEALTH
v02.04 INTEGRATION-READINESS TRANCHE"), the task immediately following the
one that produced draft PR #152 (issue #115 comment `5763800301`, which
PR #152's own title/body mistakenly attributed to issue #123 — see the
correction below). Stack: `#140 → #142 → #145 → #146 → #148 → #151 → #152
(claude/health-atlas-organ-type-parity-tranche12) → this tranche
(claude/health-atlas-integration-readiness-tranche13)`.

## Verification before touching anything

| Claim | Verified |
|---|---|
| `origin/main` head | `16cfb0b3512609313a68d487dca28945a31855b8`, `v08.32` (matches `programme-ledger.mjs`'s own header line) |
| Authoritative source commit `ed4dbb2e` | `ed4dbb2e535ba6b95ea286a5f3b29a32122ea4b9` on branch `health/source-v02-04-handover`, path `docs/health-source/health-atlas-v02.04-standalone.html`, 2,936 lines — read directly, not assumed. Its own six nav tabs (`data-tab`): `bodysystems`, `foods`, `diseases`, `lifestyle`, `ages`, `refs`. Its own `SCHEMAS` object (organ/food/disease/lifestyle/age field lists) read directly to build the port-vs-source matrix below, not inferred from any report's prose |
| Issue #115 | Read in full (40 comments). Confirmed comment `5763800301` (the dispatch for PR #152 / tranche 12) and comment `5764238189` (the dispatch for this tranche) both exist verbatim, both posted by the repo's real Owner account, both starting with the `/mmsa-task` trigger phrase |
| Issue #123 | Re-read: "MMSA shared integration readiness for MAP v4, Hadith and Health" — a separate, broader, earlier platform-coordination issue. Confirmed it was never the trigger for tranche 12's own dispatch |
| PR #152 exact head | `e42d851a6d4bd82dd3c22175682a81ac8076e4d0` (base `eabe42da2a3b1d4f1302ca93386d1ccb39a59cf7`) before this tranche's own Gate A fixes; `d13d1742744e60cf83111a3d406a969ffd254283` after them |
| PR #152 head CI | `get_check_runs` → `total_count: 0`; `get_status` → `state: "pending"`, `total_count: 0` — no CI configured on this head, confirmed both before and after the Gate A commit. `verify.yml` has zero recorded runs on this branch (`list_workflow_runs` filtered to it returns `total_count: 0`) |
| Full-history preflight | `git fetch --unshallow` (repo was shallow) + `git fetch origin '+refs/heads/*:refs/remotes/origin/*' --prune` (116 remote branches) |

## Gate A — the misattribution and the stale path, fixed

Both fixed on PR #152's own branch (`claude/health-atlas-organ-type-parity-tranche12`, commit `d13d174`), not here — this tranche stacks on top of that fix rather than re-doing it:

- **PR #152's title and body** wrongly cited issue #123 as tranche 12's trigger. Corrected: title now reads "…(issue #115)"; body opens with an explicit correction note naming the real dispatch (issue #115 comment `5763800301`) and explains issue #123's actual, narrower role (context this tranche read, never its trigger).
- **The committed report pair** (`docs/reports/2026-09-21-health-atlas-organ-type-parity-tranche12.md`/`.html`) — same correction added, plus the dateline itself corrected to name the real comment, plus the report's own "Owner app test" step 1 corrected (it claimed the Cardiovascular section is "open by default"; it is not — every section starts collapsed, verified by loading the page and reading `state.openSections` before clicking anything).
- **`health-atlas-view.js`'s header comment** referenced a stale, never-written report path (`...-health-atlas-foods-conditions-parity-tranche12.md`). Fixed to the real path (`...-health-atlas-organ-type-parity-tranche12.md`), confirmed to exist.
- **The `.html` twin was regenerated** with the unmodified, shared `tools/md2report.py` (read-only, not edited — the fenced-code/link-flattening defect it carries is a separate, already-disclosed shared-tooling issue, out of this tranche's authority to fix), with the one pre-existing hand-corrected fenced-code block re-applied afterward so regenerating did not reintroduce a defect into an already-correct block.

**Independently re-ran the organ-Type browser checks**, not just re-read PR #152's claims: all 19 runnable `tools/health-atlas-verify/` suites (324 passed, 0 failed at that point), the three viewport widths (desktop 1280×900, tablet 768×1024, phone 390×844) for the Vena Cava wrap case, and the exact "Type" wording used anywhere in the UI or docs. The longest organ name was **re-derived from the live dataset** rather than trusted from the report — `"Vena Cava (Superior & Inferior)"` (31 characters, `partType: "Vein"`) is confirmed the longest of all 46 organ names, and the dataset's seven `partType` values (`Organ, Artery, Vein, Tissue, Gland, Nerve, Duct`) match the report's claim exactly. Screenshots taken and visually inspected at all three widths confirm the pill wraps onto its own line at desktop's 3-column width without truncating the name or overflowing the row, and sits on one line without overflow at tablet/phone's single-column width.

**Wording check.** Read every place `partType`/"Type" appears — the pill itself (`el('span', { class: 'ha-bs-type-pill', text: organ.partType || 'Organ' })`, no label prefix beyond the bare value), the CSS comment, the header comment, and the tranche 12 report's own Gate B section (`"a closed-set anatomical classification, the same class of field as role and system... not a clinical assertion of any kind"`). Nowhere does any of this claim the classification has been individually medically verified or endorsed — it reads throughout as a label taken from the source dataset's own closed vocabulary. No wording change was needed.

## Gate B, part 1 — the full six-tab port-vs-source audit

Read the standalone source's own `SCHEMAS` object and each `render*Tab()` function directly (not the port's own comments) to build this matrix independently. Counts re-derived from the live data file: **9 systems, 46 organs, 34 foods, 17 diseases, 10 lifestyle habits, 6 age groups, 8 food master categories, 8 references.**

| Source tab | Source fields (`SCHEMAS`) | Ported here | Withheld, and why |
|---|---|---|---|
| **Body Systems** | `name, system, role, partType, functions, nutritionNeeds, foodSources, activity, deterioration, connections, refs` | `name, system, role, partType` (tr12), `functions, connections, refs` (tr1); 3-column layout, 2-level wheel, 3 built diagrams + per-organ highlight (tr13, this tranche), name/function search (tr6); 3 of 9 systems have a diagram at all — same as the source, which never built the other 6 | `nutritionNeeds, foodSources, activity, deterioration` — every one dose/amount/recommendation-shaped |
| **Foods** | `name, category, servingQty, nutrition, organs, refs` | `name, category, refs` (tr3); `organs` via `organNamesFor()`, which strips the field's own embedded per-organ dose figures (6 of 34 foods carry one, e.g. `"Heart: 40g/day"`) down to organ names only; search over name+category (tr11) | `servingQty, nutrition` — dose/amount-shaped |
| **Diseases** | `name, organAffected, cause, symptoms, remedies, homeRemedies, naturalRemedies, refs` | `name, organAffected, cause, symptoms, refs` (tr3); search over name+cause+symptoms+organAffected (tr11) | `remedies, homeRemedies, naturalRemedies` — treatment content |
| **Lifestyle** | `name, activities, food, avoid, refs` | **Nothing** (deferred tr3, reconfirmed tr11) | **The whole tab.** No safe structural remainder exists once the three substantive fields are removed — `activities`/`food`/`avoid` ARE the recommendation end to end, and even bare `.name` values ("Regular Physical Activity", "Quality Sleep") are themselves habit endorsements, unlike a neutral label such as "Coronary Artery Disease" or "Avocado" |
| **Age Groups** | `name, range, notes` | `name, range` (tr3); no search, matching the source (it has none there either) | `notes` — nutrition-guidance prose keyed to age |
| **References** | flat `id, name, url` table, **no organ links** (`renderRefsTab()`) | The table (tr9) **plus** organ links (`organsForReference()`, reverse of the existing `referencesFor()`) — going beyond strict source parity on issue #115's own instruction to add links "where supported," since the app has no URL-addressable per-organ route to link to instead; accessible view-switcher using plain toggle buttons rather than a half-built ARIA Tabs pattern (tr10) | Nothing withheld; this tab is complete and the one place this port exceeds source parity |
| *(not a source tab)* Food **Master Categories** | The source exposes the 8-entry taxonomy only as an editable sub-list inside the Foods tab's own edit form (`+Add master category`) — never its own tab or view | Built as its OWN read-only page (tr4, `health-atlas-categories.html`) — a genuine structural divergence from the source (a new navigational surface, not present in the source's own nav), staying inside the read-only/safe boundary throughout | Not editable (matches the read-only boundary every other tab keeps) |

**Also deliberately withheld, across every tab, and not itself a "tab":**

- **CRUD** (add/edit/rename/delete) for every entity — systems, organs, foods, diseases, lifestyle habits, age groups, master categories. The source's own persistence model is in-memory + a manual Export/Import `.json` round trip; this platform has no equivalent mechanism (no localStorage use anywhere in `app/health/**`, no Firestore read or write anywhere in this tree — confirmed by grep), so building CRUD here would need a real persistence decision first, not just UI work.
- **Export / Import / Reset** — same reasoning; the source's own buttons write/read a `.json` file, which has no analogue in this platform's Firestore/tenant/person model.
- **The wheel's third "fields" ring** — the source drills System → Organs → **per-field wedges** (functions/nutritionNeeds/foodSources/activity/deterioration/connections/refs as their own wedges one level deeper). This is a navigation convenience over content already shown (or deliberately withheld) elsewhere, not new content by itself — but building it means deciding how the withheld fields' own wedges should look (omitted entirely? shown greyed-out with an explanation?), which is a product decision, not a coding one.

## Gate B, part 2 — the organ diagram highlight (this tranche's own capability)

**Field-level inventory, done before writing any code.** `health-atlas-diagrams.js` has carried `partMap` (`{organName: shapeId}`) for all three built diagrams since tranche 6, and every shape descriptor has always carried its own `.id` — both preserved verbatim from the source's `SYSTEM_DIAGRAMS` object. Neither was ever read by `health-atlas-view.js`: `buildDiagramPanel()` rendered every shape via `svgEl(shape.tag, shape.attrs)`, passing only `.attrs` and silently dropping the sibling `.id` field, so the rendered SVG carried **no DOM ids at all**, and `partMap` was dead data. The source's own `wireTabEvents()` does the opposite: after selecting an organ, it looks up `SYSTEM_DIAGRAMS[organ.system].partMap[organ.name]`, finds that id inside the rendered SVG, and adds a `.part-highlight` class (`stroke: var(--gold) !important; filter: drop-shadow(...)`) — so opening "Bladder" versus "Kidneys" within the same Renal & Urinary diagram visibly points at a **different** shape. This port's diagram looked identical regardless of which organ in that system was selected.

**Confirmed this clears the safety boundary**: `partMap` and shape `id`s are not on `view-boundary.mjs`'s or `view-boundary-wheel.mjs`'s forbidden-field list — they never carried a dose, a nutrient amount, an activity recommendation or a remedy in the first place, being purely presentational (which shape gets a gold outline). Both boundary suites still pass unchanged (15/0, 57/0) after this tranche's own edit.

**Built**: `groupDiagramShapes()` + `buildDiagramShapeNodes()` in `health-atlas-view.js`, which reconstruct the source's own grouping — shapes sharing one id (e.g. the two kidney outlines) are wrapped in one `<g id="…">`, exactly as the source's own markup does (`<g id="kidney-shape"><path.../><path.../></g>`), while a lone shape (e.g. the bladder ellipse) carries the id directly. This is what makes `partMap`'s ids resolve to **exactly one** DOM element each — flattening every shape with its own copy of the id (the naive port) would have produced duplicate DOM ids the moment a part has more than one shape. `.ha-diagram-part-highlight` (this app's own class prefix) carries the source's own `.part-highlight` rule verbatim.

**Verified directly, by switching organ within the same diagram, not by asserting one static state**: selecting Kidneys highlights `#kidney-shape` and not `#bladder-shape`; switching to Bladder moves the highlight off `#kidney-shape` and onto `#bladder-shape` in the same diagram; a 3-shape grouped part (`Eyes → #eye-main`) highlights as one element with zero duplicate DOM ids anywhere on the page (also proven for `Skin → #skin-layer-all`, another 3-shape group); a system with no built diagram (Heart) shows the placeholder with nothing wrongly highlighted; and a fresh page load before any organ is ever selected highlights nothing. All of it re-verified at tablet (768×1024, single-column layout) and phone (390×844, a real tap), including the duplicate-id check at phone width.

**A real, pre-existing test-harness defect was found and fixed — not an application defect.** `body-systems-parity-browser.mjs`'s shared `openOrgan(page, organName)` helper walked every section header with a blind, unconditional `.click()` on its way to a target row that was not yet visible. A section header **toggles** open/closed, so walking past a section some *earlier* check had already opened for its own reason (e.g. the wheel keyboard drill-down check opening Renal & Urinary as a side effect) silently **closed it again**. This had been invisible for the whole life of the file (tranches 8–12) because every existing check's own sequence of `openOrgan()` calls happened, by accident of ordering, to leave the sections a later check needed in exactly the state it needed — the "fragile, order-dependent, happens to pass" shape CLAUDE.md's own standing lessons warn about elsewhere in this repository. Adding this tranche's own Kidneys/Bladder/Eyes checks (a different call sequence) disturbed that accidental chain and made **two pre-existing, unrelated checks fail** ("expected a Coronary Arteries row" / a `ReferenceError` on an out-of-scope `heads` variable) — found by the disturbance, not by reading the code first.

Fixed `openOrgan()` to be idempotent: a header is clicked only if its own section is **not already open** (checked via `classList.contains('ha-bs-section-open')`), so the helper only ever opens sections and never closes one as a side effect of looking for a different organ. Two more instances of the same class of bug, found by the same investigation, were fixed alongside it rather than left as separate latent defects: the "each organ row carries a real Type pill" check's own bare `heads.first().click()` (the same blind-toggle pattern, self-contained rather than shared) was replaced with `openOrgan()`; and the "longest organ name + Type pill" check on desktop referenced an out-of-scope `heads` variable that was **dead code no execution path had ever reached** (Vena Cava's own section happened to already be open by the time that check ran, so the buggy branch was never entered) — also replaced with `openOrgan()`, removing the broken branch entirely rather than leaving it as a landmine for the next reordering. The tablet/phone Vena Cava checks, which duplicated the same manual walk inline (safely, on those fresh single-viewport contexts) were also switched to the shared helper for consistency. All fixes verified: the full suite passes cleanly and repeatably (run twice, 27/0 both times) regardless of check order, where before my own insertion the exact same content in a different order broke two checks that had nothing to do with the new capability.

One naming pitfall found and fixed in my own new checks before they were trusted: `hasText: 'Bladder'` also matches **"Gallbladder"** (row text renders as `"GallbladderOrgan"` with no space before the pill), so the first version of the Bladder-selection check silently drove the Digestive system's Gallbladder instead of Renal & Urinary's Bladder. Fixed with an anchored `/^Bladder/` pattern (matches `"BladderOrgan"`, does not match `"GallbladderOrgan"`), confirmed by direct probe before relying on it.

**Mutation-proven, three ways, all reverted afterward:**
1. Forcing `highlightPartId` to always be `null` (never highlight anything) — 5 of the 7 new checks failed by name, as expected.
2. Reverting the grouping to flatten every shape with its own `id` attribute (the naive, un-grouped port) — the two duplicate-id checks (desktop Eyes, phone Eyes) failed by name, reporting the exact duplicated id (`eye-main`).
3. Corrupting a `partMap` entry in the data file itself (`Kidneys: 'kidney-shape'` → `Kidneys: 'nonexistent-shape-id'`) — the new `data-integrity.mjs` cross-file consistency check failed by name, naming the exact bad entry.

**New data-integrity check**: every `partMap` entry in every built diagram names a real organ (in that diagram's own system) and a real shape id (in that diagram's own shapes array) — a cross-file consistency check between `health-atlas-diagrams.js` and `health-atlas-data.js` that did not exist before, since nothing had ever read `partMap` to be able to notice a bad entry.

**What this deliberately did NOT build.** Did not build a highlight for the six systems with no diagram (there is nothing to highlight — the placeholder is unchanged). Did not add a hover-preview highlight (the source only highlights the currently-*selected* organ, not a hovered one — matching source behaviour exactly, not inventing beyond it). Did not touch `tools/md2report.py` or any other module's committed report.

## Integration decision packet

**What this audit found needs a real decision before any part of this stack reaches `main` — none of it a coding task:**

1. **The Programme Integration Ledger's `health` entry is stale and needs Master Architect correction.** `docs/governance/programme-integration-ledger.json`'s `streams[].health` record still reads `integrationState: "EXTERNAL_PENDING_ACQUISITION"`, `repository: "UNKNOWN"`, `activeBranch: null`, `ownedPaths: []`, with the note *"No Health implementation exists in this repository and none was created."* That was true on 18 Sep 2026, when it was written. It is not true now: twelve tranches exist in this very repository, on this very branch chain. This is **read-only evidence, not a fix** — `docs/governance/` is platform-shared and explicitly outside this tranche's authority to edit. The corrected record would need, at minimum: `repository` = this repository (not external), `activeBranch`/`branchTip` = the current tip of this chain, `ownedPaths` = `app/health/**`, `tools/health-atlas-verify/**`, and the `docs/reports/*-health-atlas-*`/`*-health-claim-*` report family, and a new `integrationState` this schema does not yet have a value for (`EXTERNAL_PENDING_ACQUISITION` no longer describes it, and `MERGED_TO_MAIN` would overclaim — something like `DEVELOPED_UNINTEGRATED` is the shape needed, and naming it is the Master Architect's call).
2. **This module's relationship to the existing "Health Study" module needs an explicit decision.** `app/health-study.html` is a *different*, pre-existing surface (Phase 7/12, already linked from the shared nav via `app/js/nav.js`'s `{ href: "health-study.html", label: "Health" }` entry) that tracks a real learner's progress against the platform's Firestore-backed subject/trackable model. This new Health Atlas tree is a read-only *reference* browser with **zero persistence anywhere** (confirmed: no `localStorage` call, no Firebase/Firestore import, in the whole of `app/health/**`). They are unrelated today, and `app/health/README.md` has said so since foundation tranche 1. Three live options, not decided here: (a) Atlas becomes a linked reference resource *from* Health Study (a "Learn more" link out to specific organs/diseases); (b) Atlas becomes its own entry in the module registry / subject tree, alongside Health Study; (c) Atlas stays unlinked, internal-only, for a longer evaluation period. This is a product decision for the Owner, informed by what Atlas can now show reliably (the matrix above).
3. **Nav wiring is a protected-path decision.** Whichever option above is chosen, exposing Health Atlas anywhere a real reader would find it means touching `app/js/nav.js` and/or `app/js/feature-registry.js` (F-006, the About screen's own "what's actually built" list) — both platform-shared, both outside this tranche's authority. No such touch was made or attempted.
4. **A version allocation is needed before any merge to `main`.** `main` is currently `v08.32`; the next unallocated number is `v08.33` per `CLAUDE.md`'s own record, re-confirmed by `programme-ledger.mjs`'s own header line in this session's run. `app/js/version.js` is untouched by this entire stack and stays outside this tranche's authority — the Master Architect allocates the number at integration time, not before.
5. **I11 (language-keying) has not been started, and is real, non-trivial scope.** Every user-visible string in `app/health/**` is hardcoded English — no `t()` call, no `bn.js` entry, anywhere in this tree (confirmed by grep). I11 says every user-visible name should be language-keyed "from day one," and this module has 46 organs' worth of functions text, 34 foods, 17 diseases, 10 age-group-adjacent strings and all of the chrome (search placeholders, tab labels, the DRAFT banner) still to translate. Whether this ships English-only first (matching how several other demo-only draft surfaces in this repository have been staged before a translation pass) or needs a full Bangla pass before integration is an Owner/Master Architect scope decision, not something this tranche can resolve by itself.
6. **The content's evidence status is disclosed, and whether that disclosure is sufficient for real release is the Owner's call.** All 82 organ function statements are `general-reference-only` (0 `cited-evidence` — confirmed again this session, `claims-integrity.mjs` still reports the same split). The DRAFT banner on every screen already says so in words. Deciding whether that is sufficient to show real students/parents, or whether some subset of statements should be sourced more rigorously first, is a content/product decision this audit surfaces but does not make.
7. **No persistence model exists, and none was invented.** If any future capability here needs to remember anything about a specific reader (a bookmark, a favourite organ, a completed reading), that is a new Firestore collection design plus Rules — a fully separate Owner Control Gate, not touched or assumed by anything in this tranche.
8. **CI is not wired for this suite class, by established precedent, and this tranche did not change that.** `.github/workflows/verify.yml` does not run any Playwright-based suite in this repository (documented in its own comments); none of the 19 `tools/health-atlas-verify/` suites run in CI today. Whether that should change for this module specifically, together with every other Playwright-based suite this repository already carries, is a shared-tooling decision outside this tranche's scope.

**No further substantial, safe, source-faithful, read-only gap was found beyond the diagram highlight built above.** Every remaining unbuilt piece of the source (CRUD, Export/Import/Reset, the wheel's third ring, the Lifestyle tab) was investigated and found to require either a genuine product/persistence decision (items 1–7 above) or to fall outside the safety boundary entirely (dose/remedy/recommendation content) — not a coding gap this tranche could close unprompted.

## Suite results

**Health-owned suites (19 runnable, `tools/health-atlas-verify/`): 332 passed, 0 failed** (was 324; +7 body-systems-parity-browser, +1 data-integrity)

| Suite | Result |
|---|---|
| body-systems-parity-browser | **27 passed, 0 failed** (was 20) |
| categories-selectors | 7 passed, 0 failed |
| claims-integrity | 10 passed, 0 failed |
| claims-mutations | 7 passed, 0 failed |
| data-integrity | **23 passed, 0 failed** (was 22) |
| more-search-browser | 12 passed, 0 failed |
| more-selectors | 16 passed, 0 failed |
| references-index-browser | 12 passed, 0 failed |
| references-tabs-accessibility-browser | 10 passed, 0 failed |
| selectors | 19 passed, 0 failed |
| view-boundary | 15 passed, 0 failed |
| view-boundary-categories | 58 passed, 0 failed |
| view-boundary-categories-mutations | 7 passed, 0 failed |
| view-boundary-more | 28 passed, 0 failed |
| view-boundary-more-mutations | 7 passed, 0 failed |
| view-boundary-wheel | 57 passed, 0 failed |
| view-boundary-wheel-mutations | 6 passed, 0 failed |
| view-provenance-boundary | 7 passed, 0 failed |
| view-provenance-mutations | 4 passed, 0 failed |

**Seven governance suites (full history + all 116 remote branches fetched first, run from the repository root):**

| Suite | Result |
|---|---|
| programme-ledger | 8 passed, 23 noted, 0 failed |
| programme-ledger-mutations | 49 passed, 0 failed |
| brief-integrity | 8 passed, 0 failed |
| study-activity-evidence-boundary | 27 passed, 0 failed |
| study-activity-evidence-boundary-mutations | 11 passed, 0 failed |
| study-event-wiring | 41 passed, 0 failed |
| rules-authorisation-executable | 38 passed, 0 failed |

All seven exit 0, identical numbers before and after this tranche's own changes. These are **local run results**; no CI ran against this branch (`verify.yml` has 0 recorded runs on it, and does not cover this suite class by design — confirmed by reading the workflow file, not edited).

Playwright resolved the same local, uncommitted way every prior tranche documents (`mkdir -p node_modules && ln -sfn "$(npm root -g)/playwright" node_modules/playwright`) — gitignored, nothing committed, no shared CI/tooling change.

## What this deliberately did NOT do

- Did not touch `tools/md2report.py` or any other module's already-committed report `.html`.
- Did not correct the Programme Integration Ledger's stale `health` entry — `docs/governance/` is platform-shared and outside this tranche's authority; flagged above, not edited.
- Did not wire Health Atlas into `app/js/nav.js` or `app/js/feature-registry.js` — both protected/shared, and which of the three integration options above to build is an Owner decision this tranche cannot make.
- Did not add any i18n/Bangla keying to `app/health/**` — a real, separately-scoped piece of work, not started here.
- Did not build CRUD, Export/Import/Reset, the wheel's third "fields" ring, or the Lifestyle tab — see the decision packet above for exactly why each is a decision rather than a coding gap.
- **No protected/shared path touched**: not `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `bn.js`, `nav.js`, `unit-keys.js`, `records.js`, `activity.js`, `catalogue-data.js`, `shell.css`, the platform-shared `tools/i18n-verify/{behaviour,harness,firebase-stub,brief-integrity,programme-ledger,programme-ledger-mutations}.mjs`, `docs/governance/`, `firestore.rules`, `firebase.json`, `tests/firestore/`, `tools/firestore-emulator/`, `tools/md2report.py`, or `.github/workflows/`. Every file this tranche changed is under `app/health/**`, `tools/health-atlas-verify/**`, or `docs/reports/`.
- **No version allocated or bumped.** `app/js/version.js` is untouched.
- **Nothing merged, nothing deployed.** Draft PR, stacked on PR #152 exactly as the existing chain stacks.
- Did not post the literal `/mmsa-task` trigger phrase anywhere in anything pushed or posted (it appears above only inside a quoted, already-posted comment's own text, reproduced as evidence).

## Owner app test

**Required: NO before merge.**

**YES after merge**, direct URL only, no sign-in/tenant: with `node serve.js` running, open `http://127.0.0.1:8080/app/health/health-atlas.html`.

1. On the Body Systems tab, click "Renal & Urinary" to open it, then click "Kidneys". In the centre wheel panel, confirm the diagram on the right shows both kidney shapes outlined in gold.
2. Click "Bladder" in the same list. Confirm the gold outline now moves to the bladder shape at the bottom of the diagram, and the kidneys are no longer outlined.
3. Click "Eyes" under Sensory (open that section first). Confirm the whole eye shape (outline, iris and pupil together) is outlined in gold as one unit.
4. Click "Heart" under Cardiovascular. Confirm the panel still shows the plain "still in progress" placeholder (Cardiovascular has no built diagram) — nothing is highlighted, and nothing errors.
5. Narrow the browser to phone width (390px). Repeat step 3 with a real tap — confirm the same gold outline on the eye shape, and no horizontal scrollbar anywhere.
6. Open `docs/reports/2026-09-21-health-atlas-integration-readiness-tranche13.html` — confirm it renders correctly (tables, no stray Markdown syntax).
