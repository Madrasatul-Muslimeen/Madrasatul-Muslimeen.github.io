# Health Atlas — parity NEXT: independent Gate A re-audit of PR #151, plus the organ "Type" pill (tranche 12)

**21 Sep 2026. Issue #123's `/mmsa-task` line "HEALTH v02.04 PARITY NEXT". Stack:
#140 → #142 → #145 → #146 → #148 → #151 → this tranche (branch
`claude/health-atlas-organ-type-parity-tranche12`, based on PR #151's own
head `eabe42da2a3b1d4f1302ca93386d1ccb39a59cf7`).**

## What this task was

Verify current `main`/version, the source handover commit and standalone
v02.04 HTML, the issue #123 ledger, PR #151's real head/base/diff/CI —
independently, not from any prior session's own claims. **Gate A**:
reproduce PR #151's committed Foods/Conditions browser suite and every
other Health suite; inspect positive and excluded-field negative-control
search cases, responsive behaviour and detail/back state; check the
repaired report pair renders fenced code and links correctly; audit the
claimed `tools/md2report.py` defect read-only, without editing it or any
other module's report. **Gate B**: find and build ONE substantial, safe,
source-faithful, read-only parity capability still missing from
`app/health/`, or produce a precise gap/decision packet if none clears the
provenance/privacy boundary.

## Verification before touching anything

| Claim | Verified |
|---|---|
| `origin/main` head | `16cfb0b351` (matches `programme-ledger.mjs`'s own header line, `main 16cfb0b351 at v08.32`) |
| PR #151 head/base | `eabe42da2a3b1d4f1302ca93386d1ccb39a59cf7` / `c9bc93fe83faeb0c9392269c245f33c1a3cc62b2` — read via `mcp__github__pull_request_read`, matches the PR body and the branch's own git log |
| PR #151 state | `open`, `draft: true`, `merged: false`, `mergeable_state: clean` |
| PR #151 head CI | `get_check_runs` → `total_count: 0`; `get_status` → `state: "pending"`, `total_count: 0`. **No CI is configured on this head at all** — not a failure, an absence. `.github/workflows/verify.yml` does not run the Playwright-based suite class (documented, unchanged) |
| Handover branch `health/source-v02-04-handover` at `ed4dbb2e` | `git log -1` on that ref: `ed4dbb2e535ba6b95ea286a5f3b29a32122ea4b9` — matches |
| Standalone v02.04 HTML | Read via `git show ed4dbb2e:docs/health-source/health-atlas-v02.04-standalone.html` (2,936 lines). Re-hashed: SHA-256 `f7cb56980ae125bb387118c9282bf50c92b5fe414ca3480fa92547e9af9685a1`, 115,697 bytes — **byte-for-byte identical** to `app/health/README.md`'s own recorded provenance and to `data-integrity.mjs`'s own assertion |
| Issue #123 | Read in full (14 comments) — MMSA-wide shared-integration coordination, names several Quran-side draft PRs out of this task's scope (correctly ignored); no Health-specific obligation beyond what this task's own instruction states |
| Full-history preflight | `git fetch --unshallow` (repo was already unshallowed in this worktree) + all remote branches fetched; both ledger-named refs present: `origin/claude/phase4-wiring` at `7e2931f`, `origin/claude/pensive-knuth-2pu3jj` at `b0221ce` |

**Branch note:** this worktree's default branch predates PR #151;
`claude/health-atlas-organ-type-parity-tranche12` was created directly from
PR #151's exact head commit, not from whatever this worktree happened to
have checked out.

## Gate A — independent reproduction, not trust

Every suite below was actually executed in this session, at PR #151's exact
head commit, from a clean full-history checkout — not copied from the PR
body.

**The new Foods/Conditions search suite reproduces exactly as claimed.**
`node tools/health-atlas-verify/more-search-browser.mjs`: **12 passed, 0
failed**, matching PR #151's own table digit-for-digit. Both excluded-field
negative controls were inspected individually: typing `Potassium` (present
only in avocado's real `.nutrition` array) and `Statin` (present only in
Coronary Artery Disease's real `.remedies` array) both assert the page's
own "No matches" empty state rather than a false hit, proven against the
**rendered page**, not the pure selector in isolation. Desktop, tablet
(768×1024) and phone (390×844) cases all pass, including a real tap (not a
synthetic click) at phone width. The "search term survives opening a detail
card and pressing back" case was inspected directly: the term is kept in
the view's own closure state, not reset by the detail-card round trip.

**Every other Health-owned suite reproduces too — 19 runnable suites (the
20th file, `import-esm-file.mjs`, is a shared loader helper, not a suite),
318 passed, 0 failed**, identical to PR #151's own count:

| Suite | Result |
|---|---|
| body-systems-parity-browser | 16 passed, 0 failed |
| categories-selectors | 7 passed, 0 failed |
| claims-integrity | 10 passed, 0 failed |
| claims-mutations | 7 passed, 0 failed |
| data-integrity | 21 passed, 0 failed |
| more-search-browser | 12 passed, 0 failed |
| more-selectors | 16 passed, 0 failed |
| references-index-browser | 12 passed, 0 failed |
| references-tabs-accessibility-browser | 10 passed, 0 failed |
| selectors | 19 passed, 0 failed |
| view-boundary | 14 passed, 0 failed |
| view-boundary-categories | 58 passed, 0 failed |
| view-boundary-categories-mutations | 7 passed, 0 failed |
| view-boundary-more | 28 passed, 0 failed |
| view-boundary-more-mutations | 7 passed, 0 failed |
| view-boundary-wheel | 57 passed, 0 failed |
| view-boundary-wheel-mutations | 6 passed, 0 failed |
| view-provenance-boundary | 7 passed, 0 failed |
| view-provenance-mutations | 4 passed, 0 failed |
| **Total** | **318 passed, 0 failed** |

**All seven governance suites also reproduce exactly**, from the same
full-history checkout:

| Suite | Result |
|---|---|
| programme-ledger | 8 passed, 23 noted, 0 failed |
| programme-ledger-mutations | 49 passed, 0 failed |
| brief-integrity | 8 passed, 0 failed |
| study-activity-evidence-boundary | 27 passed, 0 failed |
| study-activity-evidence-boundary-mutations | 11 passed, 0 failed |
| study-event-wiring | 41 passed, 0 failed |
| rules-authorisation-executable | 38 passed, 0 failed |

Every number matches PR #151's own claimed table. **No discrepancy found
anywhere in Gate A.**

**Desktop/tablet/phone focus and detail/back state, checked directly**: the
`more-search-browser.mjs` suite's own tablet/phone cases were read line by
line (not just re-run) to confirm they drive a real tap
(`page.tap`/`locator.click` at a real viewport, not a resized desktop
click), and the "back" case was confirmed to preserve the search term via
the view's own closure state rather than a page reload.

**The repaired report pair renders correctly.**
`docs/reports/2026-09-21-health-atlas-references-tabs-accessibility.html`
was opened as rendered HTML (not just diffed): both fenced code excerpts
render as real multi-line `<pre>`-equivalent blocks (not run-on text with
stray backticks), and the "Tabs pattern"/"toggle-button pattern" references
are real `<a href>` links, not literal `[text](url)` bracket text.

### The `tools/md2report.py` defect — audited read-only, confirmed independently on a cross-module sample

Read the script itself (91 lines). It has **no branch that matches a
triple-backtick fence line** — an unmatched line falls into the generic
paragraph scanner, which joins every line inside the fence with spaces and
runs the same inline single-backtick-to-code regex ordinary prose uses
(which cannot represent a multi-line fence), so the fence markers
themselves leak into the output as literal backtick pairs and every
internal newline is lost. The `inline()` helper also has **no Markdown-link
handling at all** — a `[text](url)` link renders as literal bracket/paren
text. Both are structural absences in the script, confirmed by reading it,
not inferred from PR #151's own claim.

**Independently regenerated a representative cross-module sample (not the
full 82/88 — this task's own instruction is a spot-check, and PR #151
already did the exhaustive pass) and diffed against the committed `.html`
twin.** This repository currently carries 88 `.md`/`.html` report pairs (up
from PR #151's own count of 82 — six more have landed from other streams
since; a re-count, not a discrepancy in PR #151's claim, which was accurate
at the time it ran). 49 of the 88 `.md` files contain a fenced code block;
11 contain a Markdown link. Sampled 9 files spanning three modules (Quran/
MAP, Hadith, Health, and the MMSA-automation coordination reports) and
regenerated each with the unmodified script:

- **7 of 9 regenerated byte-identical to their committed `.html`** — proving
  those committed files really were produced by the current (defective)
  generator, not hand-corrected.
- **1 of 9 differed**: `2026-09-21-health-atlas-references-tabs-accessibility` —
  expected, since PR #151 hand-corrected exactly that one file's `.html`
  without touching its `.md`, so a fresh regeneration of the still-broken
  generator does not match the hand-fixed committed version. This is
  independent confirmation the hand-fix is real and isolated to that one
  file, not silently reverted.
- **The 9th, this report's own file, did not exist yet** at sampling time.

**Directly inspected the defect on two non-Health files**, confirming the
claim is repository-wide rather than specific to Health's own reports:
- `docs/reports/2026-09-13-phase2-3-merge-complete.html` (a Quran/MAP
  report): its fenced `git fetch …` / `git merge …` shell block renders as
  one run-on paragraph wrapped in a stray double-backtick pair and a
  `<code>` tag, every line break lost.
- `docs/reports/2026-09-19-mmsa-automation-pilot-step2-audit.html`: its
  `[PR #89](https://github.com/…)` Markdown link renders as the literal
  text `[PR #89](https://github.com/…)`, not a clickable link.

**Conclusion: PR #151's claim is confirmed, independently, on real evidence
— not merely re-asserted.** `tools/md2report.py` is shared, platform-wide
tooling; it was **read, not edited**, in this session, exactly as the task
requires. No other module's already-committed report `.html` was
regenerated or touched.

## Gate B — one substantial, safe, source-faithful capability: the organ "Type" pill

**Explicit field-level inventory, checked before writing any code.** The
v02.04 source's `SCHEMAS.organ.fields` carries a `partType` field —
`{key:'partType', label:'Type', type:'select', options: Organ/Vein/Artery/
Nerve/Tissue/Gland/Duct}` — and the source's own `rowHtml()` (the function
that draws each organ's row in the left-column list) prints it as
`<span class="pill">${esc(o.partType||'Organ')}</span>` **right after every
organ's name, on every row, in the read view** — not merely an edit-form
field. `app/health/js/health-atlas-view.js`'s own header comment (present
since foundation tranche 1) whitelists exactly which organ fields it reads:
`.id, .name, .system, .role, .functions, .connections, .refs` — `partType`
was never in that list, and a grep of the whole `app/health/` and
`tools/health-atlas-verify/` trees found it referenced only inside the
preserved data file and its fixture. **It was in the port's own preserved
dataset since foundation tranche 1 (all 46 organs carry it) and read by
nothing.**

**Confirmed this field clears the safety boundary before building anything:**
- Not on `view-boundary.mjs`'s or `view-boundary-wheel.mjs`'s forbidden-
  field list (`nutritionNeeds`, `foodSources`, `.activity`, `deterioration`,
  `remedies`, `homeRemedies`, `naturalRemedies`, and the four excluded
  dataset names) — it never was, because it carries no dose, no nutrient
  amount, no activity recommendation and no remedy.
- It is a **closed-set anatomical classification** — the same class of
  field as `role` (main/supportive) and `system` (which body system), both
  already ported and displayed — not a clinical assertion of any kind.
- All 46 organs in the preserved dataset carry exactly one of the source's
  own seven values; none is missing, none is outside the set (now a
  mechanical assertion, see below).
- It is read-only, additive, and needs no new selector: the organ object
  already passed into the row-rendering function already carries the
  field.

**Built:** a `.ha-bs-type-pill` badge next to each organ row's name in the
Body Systems left column, matching the source's own placement and
behaviour exactly. `app/health/js/health-atlas-view.js`'s header comment
was updated to name `.partType` in its own read whitelist. No add/edit/
delete, no new tab, no new data.

**Measured before shipping, with the real longest name in the dataset —
CLAUDE.md's own standing lesson against measuring with short fixture
content.** The worst case is "Vena Cava (Superior & Inferior)" (a Vein, 31
characters + a 4-character pill). Rather than force the name+pill onto one
`nowrap` line (CLAUDE.md's own standing lesson: a `nowrap`+`ellipsis` label
fails **silently**), the name and its pill share one `flex-wrap` group, so
if the row is too narrow for both on one line, the pill drops to its own
line under the name — no truncation, no horizontal overflow, no silent
information loss.

**Real-browser verification, at all three widths, with real screenshots
taken and inspected (not committed as image files — this repository's own
established evidence convention, unbroken since tranche 1 through tranche
11, is the committed reproducible Playwright suite with its raw output
pasted here, never a binary screenshot; see "Evidence convention" below):**

- **Desktop (1280×900)**: the "before" render (this tranche's two changed
  files reverted to their PR #151 committed content, screenshotted, then
  restored) shows plain organ names with no Type badge. The "after" render
  shows "Heart — Organ", "Aorta — Artery", "Coronary Arteries — Artery",
  and "Vena Cava (Superior & Inferior)" wrapping its "Vein" pill onto its
  own line exactly as designed, with zero page overflow.
- **Tablet (768×1024)** and **phone (390×844)**: same Vena Cava worst case
  opened directly (its own section drilled into), zero horizontal page
  overflow at either width, pill still reads correctly after wrapping.

These three before/after comparisons are now **committed, reproducible
checks** in `tools/health-atlas-verify/body-systems-parity-browser.mjs`
(16 → **20** passed), not a one-off script:

```
  PASS  desktop: each organ row carries a real "Type" pill matching its own partType value
  PASS  desktop: the longest organ name + Type pill in the dataset causes no page overflow
  PASS  tablet (768x1024): the longest organ name + Type pill causes no page overflow
  PASS  phone (390x844): the longest organ name + Type pill causes no page overflow, wrapping onto its own line if needed
```

The first of those four is also a proof the pill is not a hardcoded
default: Kidneys' own pill reads "Organ" and Coronary Arteries' own pill
reads "Artery" — two different real values off two different real organs.

**Two more suites strengthened, both mutation-relevant:**

- `data-integrity.mjs` (21 → **22**): a new check asserts every organ's
  `partType` is present and is one of the source's own exact seven values
  (`Organ`/`Vein`/`Artery`/`Nerve`/`Tissue`/`Gland`/`Duct`) — bound to a
  closed set read out of the same reasoning as the field def itself, so a
  future data change widening it fails here before it could reach the
  view's pill with an unexpected value.
- `view-boundary.mjs` (14 → **15**): a new POSITIVE CONTROL asserts the
  view module really does read `organ.partType` and really does render the
  `ha-bs-type-pill` class — the same "prove the capability actually exists"
  shape the file's existing organ/functions positive control already uses.
  Verified this new check can fail: temporarily removing the
  `ha-bs-type-pill` reference from the file (kept only in a scratch copy,
  never committed) makes it fail by name; restoring the file returns it to
  green.

**Evidence convention.** Checked every prior Health Atlas dated report and
this repository's `docs/` tree as a whole (`find docs -iname '*.png' …`):
**zero image files are committed anywhere in this repository, in any
module.** Tranche 8's own report is explicit about why — the committed,
reproducible Playwright suite itself (not a screenshot) is what turns "real
when it ran" into "reproducible by anyone who runs it later". This tranche
follows that same convention rather than inventing a new one: real
screenshots were taken and visually inspected as part of verifying the
before/after claim above, and the reproducible proof is the four new
`body-systems-parity-browser.mjs` checks, exactly the established pattern.

## Suite results (final, on this tranche's own head)

**Health-owned suites (`tools/health-atlas-verify/`, 19 runnable suites —
`import-esm-file.mjs` is a shared loader helper, not a suite):**

| Suite | Result |
|---|---|
| body-systems-parity-browser | **20 passed, 0 failed** (was 16) |
| categories-selectors | 7 passed, 0 failed |
| claims-integrity | 10 passed, 0 failed |
| claims-mutations | 7 passed, 0 failed |
| data-integrity | **22 passed, 0 failed** (was 21) |
| more-search-browser | 12 passed, 0 failed |
| more-selectors | 16 passed, 0 failed |
| references-index-browser | 12 passed, 0 failed |
| references-tabs-accessibility-browser | 10 passed, 0 failed |
| selectors | 19 passed, 0 failed |
| view-boundary | **15 passed, 0 failed** (was 14) |
| view-boundary-categories | 58 passed, 0 failed |
| view-boundary-categories-mutations | 7 passed, 0 failed |
| view-boundary-more | 28 passed, 0 failed |
| view-boundary-more-mutations | 7 passed, 0 failed |
| view-boundary-wheel | 57 passed, 0 failed |
| view-boundary-wheel-mutations | 6 passed, 0 failed |
| view-provenance-boundary | 7 passed, 0 failed |
| view-provenance-mutations | 4 passed, 0 failed |
| **Total** | **324 passed, 0 failed** (was 318) |

**Seven governance suites, unchanged from Gate A (full-history checkout,
repository root):**

| Suite | Result |
|---|---|
| programme-ledger | 8 passed, 23 noted, 0 failed |
| programme-ledger-mutations | 49 passed, 0 failed |
| brief-integrity | 8 passed, 0 failed |
| study-activity-evidence-boundary | 27 passed, 0 failed |
| study-activity-evidence-boundary-mutations | 11 passed, 0 failed |
| study-event-wiring | 41 passed, 0 failed |
| rules-authorisation-executable | 38 passed, 0 failed |
| **Total** | **182 passed, 23 noted, 0 failed** |

Playwright resolved the same local, uncommitted way every prior tranche
documents: `mkdir -p node_modules && ln -sfn "$(npm root -g)/playwright"
node_modules/playwright` — gitignored, nothing committed, no shared
CI/tooling change. `.github/workflows/verify.yml` still does not run this
suite class (confirmed by reading the workflow file — unchanged).

## Files touched

- `app/health/js/health-atlas-view.js` — the "Type" pill (Gate B), header
  comment updated
- `app/health/health-atlas.html` — `.ha-bs-row-name`/`.ha-bs-type-pill` CSS
- `app/health/README.md` — Tranche 12 section
- `tools/health-atlas-verify/data-integrity.mjs` — closed-set `partType`
  check
- `tools/health-atlas-verify/view-boundary.mjs` — positive control for the
  new capability
- `tools/health-atlas-verify/body-systems-parity-browser.mjs` — 4 new
  committed browser checks (the before/after evidence)
- `docs/reports/2026-09-21-health-atlas-organ-type-parity-tranche12.md` /
  `.html` — this report

All under `app/health/**`, `tools/health-atlas-verify/**`, or
`docs/reports/`.

## What this deliberately did NOT do

- Did not edit `tools/md2report.py`, and did not regenerate or touch any
  other module's already-committed report `.html` — confirmed the defect
  independently on a cross-module sample, read-only, exactly as the task
  requires. That fix is a shared-file change needing Master Architect
  authorisation; still flagged, not made.
- Did not build a Type **filter**. The source itself only ever shows
  `partType` as a label on each row — it never filters or groups by it
  anywhere in the 2,936-line standalone source. Adding a filter would be a
  capability beyond the source's own parity, not ported here.
- Did not re-investigate the Lifestyle tab — tranche 11 re-investigated it
  this same day and found no new field-level split; re-litigating it a day
  later with no new evidence would not be a Gate B finding, it would be
  noise. The deferral stands as tranche 3/11 left it.
- Did not add a search box to Age Groups (the source has none there).
- Did not build the wheel's third "fields" ring, CRUD, import/export, or
  the header reset button — all out of scope, unchanged from every prior
  tranche.
- Did not touch any protected/shared path: not `app/js/version.js`,
  `CLAUDE.md`, `CHANGELOG.md`, `bn.js`, `nav.js`, `unit-keys.js`,
  `records.js`, `activity.js`, `catalogue-data.js`, `shell.css`, the
  platform-shared `tools/i18n-verify/{behaviour,harness,firebase-stub,
  brief-integrity,programme-ledger,programme-ledger-mutations}.mjs`,
  `docs/governance/`, `firestore.rules`, `firebase.json`,
  `tests/firestore/`, `tools/firestore-emulator/`, `tools/md2report.py`, or
  `.github/workflows/`.
- Did not allocate or bump any version. `app/js/version.js` is untouched
  and stays out of this module's authority entirely; there is also no
  Health-internal version marker anywhere in `app/health/` to bump. This
  is a real, if small, UI change and **needs a version allocated by the
  Master Architect** before any future integration — none has been given.
- Did not merge, deploy, or claim approval. Draft PR, stacked on #151
  exactly as the existing #140→#142→#145→#146→#148→#151 chain stacks.
- Did not comment on issue #115 or #123. Did not post anything to GitHub
  beyond opening this one draft PR.

## Owner app test

**Required: NO before merge** — nothing under `app/health/` is linked from
shared nav or deployed; this whole tree needs `node serve.js` and a direct
URL, exactly as every prior Health Atlas tranche states.

**YES after merge**, direct URL only, no sign-in/tenant: with `node
serve.js` running, open `http://127.0.0.1:8080/app/health/health-atlas.html`.

1. On the Body Systems tab, open the "Cardiovascular" section (it is open
   by default).
2. Confirm each organ row — Heart, Aorta, Vena Cava (Superior & Inferior),
   Coronary Arteries, Carotid Arteries — now carries a small "Type" pill
   after its name (Organ / Vein / Artery).
3. Confirm "Vena Cava (Superior & Inferior)" wraps its pill onto its own
   line rather than overflowing the row.
4. Narrow the browser to a phone width (or use its device toolbar at
   390px) — confirm no horizontal scrollbar appears anywhere on the page.
5. Open `docs/reports/2026-09-21-health-atlas-organ-type-parity-tranche12.html`
   in a browser — confirm the tables render correctly (this report itself
   was generated the same way every prior tranche's report was).
