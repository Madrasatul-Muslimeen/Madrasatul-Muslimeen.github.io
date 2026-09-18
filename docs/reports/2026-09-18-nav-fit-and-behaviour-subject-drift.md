# v08.26 — the 320px nav truncation, and two `behaviour.mjs` checks wrong about their subject

- **Date:** 2026-09-18
- **Repository:** `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`
- **Base `main`:** `1cac2b8` (one commit past the handover's `d8f0492` — see §1)
- **Task:** the two items the 18 Sep handover left as available with no new authority — **T3** (read the newly-reachable `behaviour.mjs` sections for checks *wrong about their subject*) and **T2** (pay down a recorded baseline), taken in that order
- **Blast radius:** **BR-1.** One CSS declaration behind one media query, on the shared nav. No JS, no markup, no schema, no Rules, no indexes, no data.
- **Application version:** **08.25 → 08.26 on the branch.** The CSS change is reachable from every page, so the badge moves in the same tranche. **`main` remains 08.25 — nothing here is merged** (see §5).
- **Result:** ACCEPT. Both `behaviour.mjs` findings probed before being believed and mutation-proven after being fixed; the nav baseline is gone at every width in both languages, with nothing shrunk to pay for it.

---

## 1. State reconciliation, done before anything was touched

The handover gives `main` as **`d8f049207d80fdd58f31931d82a080ef7d4f6fe7`**. On opening, this clone's `origin/main` ref read `4b6bd60` — *behind* that. A fetch resolved it: `origin/main` is **`1cac2b8`**, one commit past `d8f0492`, and that commit is the handover document itself. `d8f0492` is an ancestor. Nothing was lost and nothing had diverged; the stale local ref was the only discrepancy.

| | |
|---|---|
| `main` / `origin/main` / working branch | **`1cac2b8`** — identical |
| `d8f0492` ancestor of HEAD | yes |
| Working tree at start | **clean** |
| `origin/claude/phase4-wiring` | **`7e2931f`** — confirmed present and untouched |
| `firestore.rules` | untouched (last commit `9c9b08c`) |

**Environment**, per handover §12c E4: `npm i playwright@1.56.0` (Chromium build 1194 already at `/opt/pw-browsers`; `playwright install` **not** run), `node serve.js` on :8080.

## 2. Baseline, measured before any change

`behaviour.mjs` on unmodified `1cac2b8`: **975 passed / 4 failed**, 979 checks, suite runs to the end. The 4 are exactly the recorded environmental pair — 22g × 3 (archive.org, intermittent) and 31e (sandbox TLS). This matches the handover's 979-check total; its 978/1 run is the same file on a tick where the 22g trio happened to pass, which §3b of the handover already says is not evidence either way.

`navcheck.mjs`: EXIT 0, with the baseline tolerated by name — `en:320:Operation`, `en:320:Bookmark`, each `73>65`.

---

## 3. T3 — two checks passing while describing the wrong thing

**Bounded set: sections 44 through 50h-k** — the whole bookmark tranche of the region the section-42 crash had made unreachable (`44` Manager, `45` Quran bookmarks, `46` deep link, `47` other modules' star, `48` folder picker, `49` nav dropdown, `50`/`50h-k` the expand option and person tag). Sections 42-tail, 43 and 43i-o were the heavily reconciled part of the 17 Sep tranche and are **not** in this set; they remain available.

The class being hunted is the one the excavation explicitly left open: not *unable to fail* (closed on 17 Sep) but **wrong about its subject** — a check that runs, passes, and is not measuring the thing its own name claims.

### 3.1 — `45b`: "cancelling the name prompt makes no bookmark" read the **Note** indicator

As written:

```js
const afterCancel = await page.evaluate(() =>
  document.querySelector("#readQuickMenuSlot .ayah-quick-btn")?.classList.contains("has-note"));
check("45b cancelling the name prompt makes no bookmark", afterCancel !== true);
```

`has-note` is not bookmark state. `app/js/ayah-note-renderer.js:138` writes it from `hasNote`, and `quranrevival.html`'s call site passes `hasNote: ayahHasNote(ayahNotesDoc, singleUnitKey)` — whether the āyah has a **Note**. The same call site passes **`showBookmark: false`**, so the Read screen's ⋮ menu carries no bookmark item and no bookmark state of any kind; that was the 17 Sep reconciliation's own finding at 45a, one screenful above.

**Probe** (`#readBookmarkBtn` clicked, then cancelled, then the same button clicked and really saved):

| | `has-note` | `#readBookmarkBtn` | `aria-label` | `bookmarks` writes |
|---|---|---|---|---|
| before | `false` | 🔖 | Bookmark this āyah | 0 |
| after **cancel** | `false` | 🔖 | Bookmark this āyah | 0 |
| after **save** | `false` | ★ | Remove bookmark | 1 |

The indicator the check reads is **identical in the case it was written to catch and in that case's exact opposite.** It was additionally a bare `!== true` with no diagnostic argument, so it passes just as happily when the element is absent.

**Correction.** Read the control that actually carries the state, against a stated positive control, and pair the denial with an allow differing in one fact:

- `45b` (new first clause) — the button starts 🔖 / "Bookmark this āyah". *This is the positive control the cancel is measured against.*
- `45b` — after cancelling: **no `bookmarks` write was issued** and the button has **not** flipped.
- `45c` (new second clause) — after a real save the same two facts **do** move: ★ / "Remove bookmark".

**Mutation:** make the popover's Cancel behave as Save — the defect 45b exists to catch.

| | result |
|---|---|
| original `45b` (`has-note !== true`) | **`true` — passes on a real defect** |
| corrected `45b` | `false` — **correctly fails** |

### 3.2 — `50k`: "the popover's 'Folder' label is NOT the group-by 'Folder' wording" never looked at the Folder field

As written:

```js
check("50k ...and the popover's 'Folder' label is NOT the group-by 'Folder' wording (context suffix works)",
      bnPop.fields.some((f) => f && BN.test(f) && f !== bnPop.groupByFolder), JSON.stringify(bnPop));
```

`bnPop.fields` is **every** `.bm-popover-field` label. In Bangla they are `["নাম", "যাদের জন্য", "যার জন্য", "ফোল্ডার", "নতুন ফোল্ডারের নাম"]`, and the predicate is satisfied by the first of them — **"নাম" (Name)**. The Folder field the check names is never reached. Two further vacuities ride along: `groupByFolder` is `undefined` whenever the nav select is gone (making `f !== undefined` true for every field), and the clause would pass with the Folder field removed entirely.

The contract it means is real: `prefs.js:490` labels the mode `"Folder|groupby"` → `"ফোল্ডার অনুযায়ী"`, while `bookmark-popover.js:132` uses plain `t("Folder")` → `"ফোল্ডার"`. The `|groupby` suffix is `i18n.js`'s context mechanism and it is what keeps one English word as two Bangla phrases.

**Mutation:** route `app/js/prefs.js` through a rewrite that strips the context suffix (`"Folder|groupby"` → `"Folder"`, and the same for Person/Module), so both labels render the identical string `"ফোল্ডার"` — precisely the regression the check exists to catch. Nothing on disk changed; the mutation is applied at fetch time.

| | popover Folder | group-by Folder | result |
|---|---|---|---|
| unmutated | `ফোল্ডার` | `ফোল্ডার অনুযায়ী` | both pass |
| **mutated** | `ফোল্ডার` | `ফোল্ডার` | original **`true` — passes on a real defect**; corrected `false` — **correctly fails** |

**Correction.** Both labels are read **by identity** — the popover field that actually holds `[data-bm-pop-folder]`, and the group-by option with value `folder` — and both are asserted **present and Bangla** before being compared, so neither side can be missing and still pass. The sibling clause ("the popover's own person row reads in Bangla too") was bound to `[data-bm-pop-person-row]` in the same way rather than to "some field somewhere".

### 3.3 — coverage

Preserved and increased: **979 → 981** executing checks, the two extra being 45b's positive control and 45c's paired flip. No check was deleted; each reconciliation asserts the contract that replaced the one it describes, with the reason recorded at the call site.

---

## 4. T2 — the 320px nav truncation, and why the diagnosis reversed

### 4.1 The measurement that changed the question

The baseline says `Operation (73>65)` and `Bookmark (73>65)` — 8px short, twice. Read for the life of this suite as "the labels do not fit at 320px".

**They fit.** Letting the four cells shrink-wrap (`flex: 0 0 auto`) and measuring the row's natural width against what it has:

| | avail | need | slack | cells |
|---|---|---|---|---|
| en @320 | 288px | **282.3px** | **+5.7px** | 48.1 / 64.7 / 74.9 / 75.4 |
| bn @320 | 288px | 159.6px | +128.4px | 26.8 / 36.8 / 41.8 / 34.8 |

`.nav-cat { flex: 1 1 0 }` — a flex-**basis of zero** — divides the row into four equal quarters of 67.2px regardless of label length. Home takes 65px of usable cell to print a word needing 48.1; Bookmark is cut at 65 needing 75.4. **The space the long labels want is already on the row, sitting under the short ones.**

**`scrollWidth`/`clientWidth` is what hid this for so long.** It bottoms out the instant a label fits — it can say "cut by 8px" but never "fits with 30px to spare" — so the row's real slack was invisible to the very suite that had been reporting the defect.

### 4.2 Every candidate remedy costed, then rejected

| lever | buys | cost |
|---|---|---|
| A — summary padding `0.1rem → 0` | 3px | still cut by 5 |
| B — row gap `0.4rem → 0.2rem` | 3px | still cut by 5 |
| C — drop the caret's leading space | 3px | still cut by 5–6 |
| D — font `0.7rem → 0.66rem` | 4px | still cut by 4, and type shrinks |
| E — font `0.7rem → 0.62rem` | fits | **9.92px type** — against v08.02's Bengali-matra lesson |
| A+B+C | fits | exactly 8px, **nothing to spare**, and three properties changed |
| **flex-basis: auto** | **fits with room** | **nothing shrinks** |

### 4.3 The change

```css
@media (max-width: 340px) {
  .nav-cat { flex-basis: auto; }
}
```

`grow` and `shrink` are untouched, so the cells still fill the row and can still shrink; `min-width: 0` still lets the ellipsis do its job as a last resort. **Only the starting size changes** — from "an equal quarter" to "what this label needs".

**Scoped to ≤340px deliberately.** Equal-width tabs are the design at every width where they hold their label, and this leaves them so. **340px is inside the query because it was truncating too (`73>70`)** and `navcheck.mjs`'s width list jumped 320 → 360, straight over the widest width the defect still reached.

### 4.4 Measured, all six widths, both languages

| | before | after |
|---|---|---|
| en 320 | cells 67.2 ×4, **CUT** Operation, Bookmark | 49.6 / 66.2 / 76.3 / 76.8, **fits** |
| en 340 | cells 72.2 ×4, **CUT** Operation, Bookmark | 54.6 / 71.2 / 81.3 / 81.8, **fits** |
| en 360 / 390 / 412 / 768 | 77.2 / 84.7 / 90.2 / 179.2 ×4 | **byte-identical** |
| bn 320 | 67.2 ×4, fits | 59 / 69 / 74 / 67, fits |
| bn 340 | 72.2 ×4, fits | 64 / 74 / 79 / 72, fits |
| bn 360 / 390 / 412 / 768 | 77.2 / 84.7 / 90.2 / 179.2 ×4 | **byte-identical** |

Unchanged everywhere, both languages: **one line**, **no page overflow**, nav height (37px en / 38px bn), button height (**26px en / 28px bn**), font-size 11.2px, and the last category's dropdown still fully on screen.

### 4.5 `navcheck.mjs`

340 added to the width list. `KNOWN_TRUNCATIONS` is **`{}`** rather than deleted — the mechanism stays so the next pre-existing finding is tolerated by name rather than by making the exit code meaningless again, and the "a BASELINED truncation no longer occurs" reporter stays live.

**Proven in both directions:** with the CSS reverted the suite exits **1** and prints `2 PROBLEM(S)`; with it, exit **0** and no truncation at any of the six widths in either language.

### 4.6 Deliberately NOT done

**The tenant-picker truncation was left alone.** `tenantSelect` cuts "Madrasatul Muslimeen (Owner, Prime)" — 224px of text in a 145px cell. Unlike the nav, widening the cell, shortening the option text and revealing the full value without widening are **materially different outcomes**, on the most tightly measured screen in the app. It stays **O3** on the Owner list. The two `surahSelect`/`unitTypeSelect` truncations ride with it, unchanged.

---

## 5. Version numbering — a collision the next session must not be surprised by

> **CORRECTED 18 Sep 2026, on the Owner's own catch.** This section first said *"`main` has now taken that number"*. **It had not, and nothing here is merged.** `main` is at `1cac2b8` with `app/js/version.js` reading **08.25**, which is what the live site serves; v08.26 exists only on `claude/charming-rubin-xzxbk1`. Describing a branch commit as a change to `main` asserts a merge that did not happen — a worse form of the drift `CLAUDE.md`'s own milestone paragraph had already recorded twice. The guard has been strengthened so it cannot recur silently (§5.1).

**The accurate position: `main` is on 08.25, and TWO unmerged branches each stamp 08.26.**

| Ref | `app/js/version.js` | State |
|---|---|---|
| `main` (`1cac2b8`) | **08.25** | what the live site serves |
| `claude/charming-rubin-xzxbk1` | **08.26** | this session's work, **not merged** |
| `claude/phase4-wiring` (`7e2931f`) | **08.26** | held, **not merged**, not re-cut |

- **Whichever merges first takes 08.26; the second's `version.js` conflicts and resolves to 08.27.** One line, a normal merge resolution, and **not** a reason to rebuild either.
- **`7e2931f` was NOT re-cut, re-stamped or touched in any way.** The standing instruction is to hold it exactly as it is, and it is held. Neither branch was re-stamped to pre-empt the collision — that would be churn for a one-line resolution.
- This is a **merge-ordering fact, not a defect.**

### 5.1 The guard now checks both halves of the milestone line

`brief-integrity.mjs`'s version check hard-coded the phrase ``on `main` `` in its own regex, so it could only ever compare the milestone version against the **working tree** — it had no way to notice that the working tree was a branch and `main` said something else. It now:

1. parses the ref the milestone line actually names, rather than assuming `main`;
2. compares the claimed version against the working tree, as before;
3. **when the named ref is not `main`, requires the line to state `main`'s own version too, and verifies it against `origin/main:app/js/version.js`.**

Mutation-proven in both directions (§6.5). The drift that has now happened three times cannot happen a fourth without a check failing.

---

## 6. Verification

### 6.1 Runs of record

| Suite | Before (`1cac2b8`) | After | Note |
|---|---|---|---|
| `behaviour.mjs` | **975 pass / 4 fail**, 979 checks | **977 pass / 4 fail**, 981 checks | +2 executing; same 4 environmental |
| `navcheck.mjs` | EXIT 0, 2 tolerated by name | **EXIT 0, baseline `{}`**, 6 widths × 2 languages, no truncation | mutation: revert CSS → EXIT 1, `2 PROBLEM(S)` |
| `layout.mjs` | — | **EXIT 0, `NO LAYOUT REGRESSIONS`, `CHANGED: 0`** | 16 configurations; ids **250 → 250**; same 22-entry baseline |
| `reading.mjs` | — | EXIT 0, `READING SCREEN OK` | 16 viewports also report the sandbox TLS artefact |
| `panel.mjs` | — | EXIT 0, `PANEL OK` | 34 tolerated select truncations, unchanged |
| Translation coverage | 1,803 / 47 | **1,803 / 47** | unchanged — a CSS breakpoint carries no string |
| `brief-integrity` | 7/1 mid-round | **8 / 0** | it caught the missing report path while this report was still unwritten |
| `rules-authorisation-executable` | 38 / 0 | **38 / 0** | |
| `note-foundation-data-layer` | 95 | **95** (47 + 30 + 18) | |
| `journey-map-contract` / `-service` / `-boundary` | 34 / 18 / 13 | **34 / 18 / 13** | |
| `study-note-service` / `-boundary` | 32 / 17 | **32 / 17** | |
| `study-activity-evidence-store` / `-boundary` | 26 / 17 | **26 / 17** | |
| `note-foundation-boundary` | 30 | **30** | |
| `study-approach-contract-boundary` | 16 | **16** | |
| `quran-word-progress-model` | — | **57 / 0** | |
| `firestore-index-requirements` | 8 / 0 | **8 / 0** | no new index |
| `rules-deployment-candidate` | 10 / 0 | **10 / 0** | |
| `stub-parity` | 3 / 0 | **3 / 0** | |
| **Phase 4 / 5 / 6 emulator** | 53 / 60 / 60 | **53 / 60 / 60**, `# fail 0` each | |
| **…against the ASSEMBLED deployment file** | 53 / 60 / 60 | **53 / 60 / 60**, `# fail 0` each | `RULES_FILE=docs/governance/phase4-6-DEPLOYMENT-candidate-2026-09-17.rules` |

The 4 `behaviour.mjs` failures are the recorded environmental pair, unchanged from the baseline: **22g × 3** (archive.org; this run is one of the ticks where it fails — per handover §3b, neither a red nor a green 22g is evidence) and **31e** (`net::ERR_CERT_AUTHORITY_INVALID`, the sandbox's TLS interception). Neither was worked around.

### 6.2 The `layout.mjs` shim, and what it does and does not prove

`quranrevival.html` is **byte-for-byte untouched** this round — the change is in `app/css/shell.css`, which the page loads by relative link. The standard `app/_prev-quranrevival.html` shim would therefore have loaded the **new** stylesheet on both sides and proven nothing. This project's documented technique was applied one level down: `HEAD`'s own `shell.css` was dropped beside it as `app/css/_prev-shell.css` and the shim's single `<link>` repointed at it.

**Positive control, run before trusting the comparison** — the "before" page must still show the defect:

| | cells | |
|---|---|---|
| BEFORE (shim) @320px | 67.2 / 67.2 / 67.2 / 67.2 | **CUT** `Operation(73>65)`, `Bookmark(73>65)` |
| AFTER (live) @320px | 49.6 / 66.2 / 76.3 / 76.8 | **fits** |

**Stated plainly: `layout.mjs`'s narrowest configuration is 360×640, which is above the 340px breakpoint**, so its `CHANGED: 0` result means "this change is invisible at every width `layout.mjs` measures" — which is exactly the claim being made for 360px and up. **The 320px and 340px evidence comes from `navcheck.mjs` and the probes in §4.4, not from `layout.mjs`.**

Both shim files were **deleted before the coverage total was read** — this file's own recorded trap, since a stray `.html` in `app/` is counted twice.

### 6.3 Mutation testing

Four mutations, each proving a guard in both directions:

| # | Mutation | Original | Corrected |
|---|---|---|---|
| 1 | popover Cancel behaves as Save | `45b` **passes** | **fails** |
| 2 | `prefs.js` rewritten to drop `\|groupby` | `50k` **passes** | **fails** |
| 3 | `flex-basis: auto` reverted | — | `navcheck.mjs` **EXIT 1**, `2 PROBLEM(S)` |
| 4 | fix in place | — | `navcheck.mjs` **EXIT 0**, no truncation |

Mutations 1 and 2 were applied at fetch time (Playwright route interception), so **no file on disk was modified** to run them.

### 6.5 The milestone guard, mutation-proven after the Owner's catch

Full account in `docs/reports/2026-09-18-milestone-correction-and-timezone-decision.md`. Four cases, run against `brief-integrity.mjs`:

| Milestone line | Before | After |
|---|---|---|
| `v08.26 on \`main\`` (**the error actually made**) | **passes** | **FAILS** — *"a version bump on a BRANCH is not a version on main"* |
| branch named, `main` claimed as v08.26 (wrong) | n/a | **FAILS** |
| branch named, `main`'s version omitted | n/a | **FAILS** |
| branch named, `main is still v08.25` (true) | n/a | passes |

**The first strengthening attempt did not catch case 1** — it returned early whenever the line said `main` and compared only the working tree, which is exactly the blind spot that let the error through. Caught by running the mutation rather than by reading the new code.

### 6.4 One environmental failure, recorded rather than hidden

The Phase 6 emulator suite failed its first invocation with `Could not start Firestore Emulator, port taken` — port 8093 held open by an earlier run of my own that I had interrupted while grepping its output. Cleared and re-run: **60 assertions, `# fail 0`.** Not a suite defect and not an application defect; recorded because the failure text said so and a grep of it would not have.

## 7. What this tranche did NOT touch

- **`firestore.rules`** — byte-identical. Nothing deployed.
- **`firebase.json`** — byte-identical, still declares no indexes.
- **All three Rules candidates and all four index candidates** — byte-identical.
- **`7e2931f`** — held, unmerged, not re-cut, not activated.
- **The Phase 4 evidence `request.query.limit`** — the verified deployment candidate is unamended, per handover §11.C.
- **All seven pending-dependency ledger items** — unchanged. The blocking dependency is still **E1, authenticated Firebase access to `study-monitoring`**, and it is access, not design.

---

## 8. Second tranche — the rest of the newly-reachable region, and a race it exposed

**BR-0. `git diff -- app/` empty; version stays 08.26.** Harness only.

### 8.1 The sweep, extended to sections 42-tail, 43 and 43i-o

The T3 sweep was continued over the remaining newly-reachable sections. **No further subject drift of the 45b/50k class was found**, and two candidates were investigated and cleared rather than "fixed":

- **`43k`** — *"the wheel's own centre draws no ayah text of its own any more"* reads `svg text:not(.wheel-seg-num)` and asserts the list is empty. My first probe said it should be **failing** (one unclassed `<text>` element is present). **My probe was wrong, not the check**: the element is present but *empty*, and 43k's own `.filter(Boolean)` after `.trim()` drops it — which is exactly the contract, since the centre element still exists and simply carries nothing. It also has an effective positive control: **10 `.wheel-seg-num` elements** prove the selector can see text. Left alone.
- **`42h`** — its three close-button selectors are all scoped to `.note-view`, and `.note-view` is current (`ayah-note-renderer.js:394`). Probed on screen at 358×666 with 41 buttons inside and no close control. **Substantively correct.**

### 8.2 Two assertions strengthened (not corrections — both were already true)

- **`42h` had no positive control.** A bare negative over a container it never proved was there. **Mutation:** rename `.note-view` to `.note-panel` at fetch time — the v07.70 failure mode exactly. The original returns `true` **while asserting nothing whatsoever**; the added control (`onScreen && buttonsInside > 0`) correctly fails.
- **`43h` claimed "the real claim state" and tested only `Boolean(trackState)`.** `way-modal.js` renders exactly two shapes for that line — `"Not claimed yet."`, or `"Confirmed: … "` with a status pill. The check is bound to those two now. **Mutation:** rewrite both `way-track-state` sites (2 of 2, counted) to render a bare `—`. Original passes on the placeholder; strengthened correctly fails.

### 8.3 A real harness defect found by the run itself: `38f`

The run reported `FAIL 38f Play starts, and the button becomes Pause` with the diagnostic **`⏸ Pause`** — **a value that satisfies the regex the check had just rejected.** That contradiction is the whole diagnosis: `check(name, cond, detail)` was calling `await playLabel(page)` **twice**, once for the condition and once for the diagnostic, so the two sampled the label at different moments.

Underneath it, three assertions slept a guessed **600/300/400ms** — six lines below `waitFor`'s own comment saying *"Waiting for a state rather than sleeping a guessed number of milliseconds … a fixed sleep would make these tests flaky rather than wrong."* Section 38 is network-independent (`audioCtx` serves a synthetic WAV), so this is not the archive.org block.

**Measured latency, 6 isolated trials: 77 / 81 / 80 / 84 / 73 / 67 ms — all far inside 600ms.** So the check is not flaky on its own.

**Honest attribution: I induced that failure myself.** The run that failed was started in the background and then shared the machine with a two-context mutation probe I launched while it was still going. Under that contention the flip missed its 600ms window. **Not an application defect, not caused by the v08.26 CSS change, and not a property of the suite when run alone.**

The fix was kept anyway, because two things were genuinely wrong independent of the trigger: a sleep 7× the observed latency is still a sleep racing a state change and it demonstrably lost, and **the double read made the diagnostic actively misleading** — it reported a value that contradicted the verdict, which is what cost the investigation. Each assertion now waits for the **state** and reads the label **once**, so condition and diagnostic can never disagree again. `waitFor` gained an optional 4th argument (default `null`) so its predicate can be parameterised; every existing caller is unaffected.

### 8.4 Verification — the clean run of record

**`behaviour.mjs`: 981 passed / 1 failed, 982 checks**, run with nothing else on the machine. The single failure is **31e** (`net::ERR_CERT_AUTHORITY_INVALID`, the sandbox TLS artefact). **The 22g trio passed this run** — further confirmation of handover §3b: neither a red nor a green 22g is evidence.

Check-count progression across the session: **979 (baseline) → 981 (tranche 1) → 982 (tranche 2)**. No check was deleted at any point.

| Run | Pass | Fail | Failures |
|---|---|---|---|
| baseline `1cac2b8` | 975 | 4 | 22g × 3, 31e |
| tranche 1 | 977 | 4 | 22g × 3, 31e |
| tranche 2, **contended** | 977 | 5 | 22g × 3, 31e, **38f (self-induced, §8.3)** |
| tranche 2, **clean — run of record** | **981** | **1** | 31e only |

### 8.5 A second self-inflicted environmental failure, recorded for the same reason

The Phase 6 emulator suite's first invocation failed `port taken` (8093) — held open by an earlier run of my own that I had interrupted. Re-run clean: **60 assertions, `# fail 0`**.

Both of this session's non-baseline failures were caused by how I ran things, not by the code. They are written down rather than quietly re-run, because a session that reports only its clean runs teaches the next session nothing about what makes a run dirty.
