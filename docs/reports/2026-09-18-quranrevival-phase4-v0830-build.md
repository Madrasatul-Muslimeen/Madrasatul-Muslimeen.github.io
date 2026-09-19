# QuranRevival MAP Phase 4 — v08.30 current-baseline build

- **Date:** 2026-09-18
- **Instruction:** Implement D1 Reading, D2 Listening and D4 WbW on current MMSA main using the accepted ADR-008 evidence-subcollection architecture. **Build and verification authorised; production deployment and shipping are not.**
- **Base:** `030216ba501a1e469d0c4de36b853d1ec48ee393`, v08.29 → **v08.30**
- **Historical branch `7e2931f`:** read only. **Not re-cut, not re-stamped, not merged.** Its `v08.26` stamp stays HISTORICAL.
- **Result:** Delivered. **Two real findings the historical branch could not have reported**, both from re-deriving rather than porting.

---

## 1. What was built

Three of ADR-008's five Study events now reach Activity. Each is **one create-only document** in `activity/{tenantId}__{personId}__{weekKey}/evidence/{eventId}`, deduplicated by the database because the identity **is** the document id — a retry is a `create` on an existing document and always fails, which the store treats as a successful no-op.

| | Trigger | Credits |
|---|---|---|
| **D1 Reading** | An **explicit** ✓ on `#readBar`. ADR-008: *"merely opening or scrolling a passage does not complete Reading… v1 requires an explicit completion action so intent is auditable."* There is **no passive trigger anywhere** | `approach_01` (Arabic only) / `approach_03` (a translation on screen) |
| **D2 Listening** | A playback session covering **≥80%** of the selected unit | `approach_07` / `approach_08` |
| **D4 Word-by-Word** | The **learner's own** word-state action, at **āyah + day** grain | `approach_04` |

**D2's exclusions are properties of the shape, not special cases** — preload cannot create a session (only the Play button can); buffering does not advance the āyah so adds no coverage; heard āyahs are a **set**, so a loop adds nothing twice; an āyah is credited only on **forward** motion, so a backward seek credits nothing and a forward jump credits only the āyah actually left behind; and `failed()` ends the session permanently.

**D4 fires on the learner only.** A supervisor's approval is the `else` branch and records no Activity: a teacher approving a word has not themselves studied it.

**D3 Journaling is out of scope.** Its historical blocker was resolved at contract level by P5-B, but `note-journal-evidence.js` has **no reachable producer** and the Note editor (P5-D) is not built.

### Activity is not Mastery — enforced by inability

The wiring module cannot reach `records.js`, `claimStatus`, `confirmEntry`, `arrayUnion`, `achieved`, `mastered` or `entries[]`; a guard asserts that by reading its source. `bulkConfirmWeek()` still builds its confirm set from `entries[]` alone, so evidence can never enlarge what one supervisor click confirms.

---

## 2. The E1 gate, recorded truthfully

**The implementation fails closed, and that is correct.**

| | |
|---|---|
| `firestore.rules` mentions "evidence" | **0 times** — the subcollection has no rule and is denied to every client |
| The assembled candidate mentions it | 6 times — undeployed |
| Rules / Firebase config changed by this tranche | **0 files** |

**Exact runtime consequence:** a reader presses ✓, `recordStudyEvidence()` reaches the store, the write is denied, the store re-reads, finds the document still absent, and **rethrows**. `safeWrite()` surfaces the failure to the user (I15) and the D1 handler deliberately adds no second message and does **not** mark the button done. Listening and WbW behave the same way without a button to disable.

**I15 was not weakened and the error is not swallowed.** Making the UI appear successful would have been the easy wrong answer and was explicitly forbidden. **Nothing was deployed.**

---

## 3. Re-derived, not ported — and both re-derivations found something

### 3.1 The boundary invariant

The suite on `main` asserted *"NO PAGE can reach the evidence writer, by any chain"* — the whole safety case while nothing was wired. Wiring makes that deliberately false, and asserting it would be asserting that the wiring does not work.

**Main's reachability walker is kept** — the stronger mechanism, catching a wiring wherever in the chain it happens — and pointed at the new invariant: **every page-reachable path to the writer must pass THROUGH `study-event-wiring.js`**, the one audited entry point. It carries the positive control a negative assertion needs: **zero chains means the wiring is broken, not safe.**

**This could not be ported.** `main` gained **+24 lines of P4-E reader guards** after the branch was cut. `git merge-tree` predicts no textual conflict there — and **a conflict-free merge prediction is not proof of semantic compatibility.** A clean auto-merge would have placed two invariants side by side without reconciling them.

**Mutation-proven three ways**, each restored afterwards and the restoration verified by an empty `git diff`:

| Mutation | Guard fired |
|---|---|
| Remove the page's import of the wiring module | *"no page reaches the writer at all — the v08.30 Study wiring is live, so that means it is broken"* |
| Give a second page-reachable module the writer | the pinned importer set **and** the page-reachable-names check |
| Let the wiring module import `records.js` | *"study-event-wiring.js can reach records.js — Activity is one step from Mastery"* |

**`study-approach-contract-boundary.mjs` was measured, not assumed, and is correctly unaffected** (16/0): it guards `study-approach-contract.js` and `study-activity-evidence.js`, while the wiring imports the **store**. The two similarly-named suites guard different module sets.

### 3.2 The `#readBar` measurement — a real cost the old numbers hid

The historical branch reported this row clean. Against current instruments it is not, and **that is exactly why re-derivation was required.**

Measured before and after, at seven widths in both languages:

| | 320 | 340 | 360 | **390** | **412** | 768 | 1100 |
|---|---|---|---|---|---|---|---|
| **en before** (slack) | −55.2 | −35.2 | −15.2 | **+14.8** | **+36.8** | +392.8 | +636.8 |
| **en after** | −92.6 | −72.6 | −52.6 | **−22.6** | **−0.6** | +355.4 | +599.4 |
| **bn before** | −64.8 | −44.8 | −24.8 | **+5.2** | **+27.2** | +383.2 | +627.2 |
| **bn after** | −101.9 | −81.9 | −61.9 | **−31.9** | **−9.9** | +346.1 | +590.1 |

**Two things are true and both are reported.** `#readBar` **already wrapped** at 320/340/360 on `main` — a pre-existing baseline nobody had measured, because `reading.mjs` measures the reading area, not the bar. And the ✓ adds **37.4px** (31 button + 6.4 gap), which takes the row over at **390 and 412 too** — the two commonest phone widths. `reading.mjs` measures the cost: **546 → 513px of reading area at 390x844, 617 → 584px at 412x915**, the ayah starting 283 → 317px down.

**The screenshot was looked at, and it changes the reading of the number.** The "wrap" is the ⋮ dropping to its own right-aligned line — tidy, and the identical shape the bar already had at 320–360. It is not the ragged stack the v07.129 lesson warns about. **Tidy is not free, but it is not broken either.**

**No remedy was chosen, because each costs something else** — measured, not asserted:

- **Tighten the bar's own `gap`** (6.4px, nine gaps): recovers ~21.6px, enough for English at 390 (−22.6 → −1.0, still short) and **1.3px short in Bangla**. A half-fix that works in one language is worse than an honest report.
- **Trim `.qr-ico` horizontal padding** (8px each side): would take the tap target from ~31px toward ~25px, **below the 26px this brief already calls too small**. Trading a layout defect for an ergonomics one is what v08.27 refused to do.
- **Move the ✓ into the ⋮ menu**: zero width cost, one more tap — and a materially different product choice the branch's own reasoning argues against.

**It joins `tenantSelect` / `surahSelect` / `unitTypeSelect` as an Owner UI item, with numbers attached.**

---

## 4. Files changed

| File | Ownership | Change |
|---|---|---|
| `app/js/study-event-wiring.js` | QURAN_OWNED | **New**, 222 lines. Pure decisions, verified against current dependencies |
| `app/quranrevival.html` | QURAN_OWNED | The ✓, its out-of-flow announcer, and eight call sites re-applied to current markup |
| `tools/i18n-verify/study-event-wiring.mjs` | QURAN_OWNED | **New**, 39 assertions |
| `tools/i18n-verify/study-activity-evidence-boundary.mjs` | QURAN_OWNED | Invariant inverted over P4-E's guards; a fourth check added |
| `app/js/i18n/bn.js` | **MMSA_SHARED — authorised** | 4 appended keys, each **proven absent first**, zero Hadith collision |
| `app/js/version.js` | **MMSA_SHARED — authorised** | 08.29 → **08.30** |
| `CLAUDE.md`, `CHANGELOG.md` | **MMSA_SHARED — authorised** | Milestone and round entry. **No deployed/served/live claim** |
| `tools/i18n-verify/behaviour.mjs` | **MMSA_SHARED — declared, see §4.1** | 5 checks re-derived |
| `docs/governance/programme-integration-ledger.json` | platform | v08.30 allocated LIVE, `nextUnallocated` → 08.31, authorisations recorded |

**No unauthorised shared-file expansion.** The three historical emulator/diagnostic touches were **not** ported, as instructed.

### 4.1 `behaviour.mjs` — declared, not done quietly

Five checks failed, all in the row this authorised tranche deliberately changed. **Four are stale enumerations** (30j, 30l, 33a, 37a) — and 30l's own output is the proof the i18n landed: its Bangla list already contained *"এই তিলাওয়াত সম্পন্ন হিসেবে চিহ্নিত করুন"*, so the check was failing on a count, not a missing translation.

**The fifth was a genuine TEST DEFECT this tranche exposed.** 37a computed gaps over every visible child and reported `gaps:[6,6,6,6,6,6,6,42,-37,-30]` — a 42px gap and two negative ones. The cause: it counted the `aria-live` announcer, which is `position:absolute` with a 1px clip **precisely so it takes no width on the densest row**. An out-of-flow element is not a control in a row. It measures in-flow children now, which is correct for any future announcer.

All five were **updated in place with the reason**, per this repository's own rule, under the instruction's *"tests may be re-derived for current architecture where required."* `behaviour.mjs` is platform-shared, so the touch is **declared in the ledger with authorisation metadata** rather than made silently.

---

## 5. Verification

### Application

| Suite | Result |
|---|---|
| `study-event-wiring.mjs` (D1/D2/D4 pure) | **39 passed, 0 failed** |
| `study-activity-evidence-boundary.mjs` | **18 passed, 0 failed** · 3 mutations, 3 caught |
| `study-activity-evidence-id.mjs` | 29 / 0 |
| `study-activity-evidence-store.mjs` | 26 / 0 |
| `study-activity-evidence.mjs` · `study-approach-contract.mjs` | 11 / 0 · 13 / 0 |
| `study-approach-contract-boundary.mjs` | 16 / 0 — correctly unaffected |
| **Emulator: `activity-evidence-v1.rules.test.mjs`** | **53 assertions, 0 failures** |

### Regression

| Suite | Result |
|---|---|
| `behaviour.mjs` | **978 passed, 4 failed** — all four environmental (§5.1) |
| `layout.mjs` | **NO LAYOUT REGRESSIONS** — every landing-page metric byte-identical, `getElementById` **250 → 252** (this tranche's two new elements, both found), **0 dangling** |
| `reading.mjs` | **READING SCREEN OK**, exit 0 |
| `panel.mjs` | **PANEL OK**, exit 0, same known baseline |
| `navcheck.mjs` | exit 0 |
| `programme-ledger.mjs` · mutations | 0 failed · **37 / 0** — three mutations went stale on this tranche's own ledger change and were repaired, not weakened: v08.30 left **no stream HELD** (the Phase 4 wiring moved to SUPERSEDED once its capability was re-derived), so both guard-C mutations crashed on `undefined`; and guard E's un-declare mutation picked the now-branchless `quran` stream, where the per-branch arm has no diff to read. Each builds its own precondition now. **Same fixture-drift family as the stale-baseline pair, one tranche later.** |
| `brief-integrity.mjs` · `stub-parity.mjs` | 8 / 0 · 3 / 0 |
| `rules-authorisation-executable.mjs` | 38 / 0 |
| `rules-deployment-candidate.mjs` · `firestore-index-requirements.mjs` | 10 / 0 · 8 / 0 |
| `note-foundation-boundary` · `journey-map-boundary` · `study-note-boundary` | 30 / 0 · 13 / 0 · 17 / 0 |
| `d14-timezone-boundary` · `d14-timezone-contract` | **10 / 0** · 21 / 0 — D14 unreachable |

### 5.1 Failure classification

| Class | Count | Detail |
|---|---|---|
| **APPLICATION FAILURE** | **0** | — |
| **TEST DEFECT** | **5** | `behaviour.mjs` 30j / 30l / 33a / 37a-list (stale enumerations) and 37a-gaps (counted an out-of-flow announcer). All fixed, §4.1 |
| **ENVIRONMENTAL** | 4 | 22g × 3 (archive.org, intermittent) and 31e (the sandbox's TLS interception). Neither happens for the Owner |
| **EXPECTED E1 BLOCK** | 1 | The evidence write is denied in production. **The implementation fails closed, which is correct, and is NOT an implementation failure** |

**One environmental failure was mine and is written down rather than quietly re-run:** the first attempt at the emulator suite reported `fetch failed` and 0 pass / 1 fail, which reads like a broken suite. The emulator was simply not running — it needs `firebase emulators:exec`. Launched properly it is 53 / 0.

**A probe failure was also mine.** My first `#readBar` probe reported `bar=0 kids=0 btn=0x0` at every viewport — which would have been a catastrophic finding had I believed it. It was hand-rolling the boot instead of using `harness.mjs`, and the Read screen never opened. **A probe that finds nothing is a claim about the probe until proven otherwise.**

### Protections

`git diff` against the base proves: Hadith untouched (zero Hadith files, zero i18n key collisions, its own behaviour sections passing); `firestore.rules`, `firebase.json`, `tests/` and every Rules/index candidate **byte-for-byte unchanged**; `nav.js` and `shell.css` untouched; MMJ/Notes contracts untouched; D14 present and unreachable; the ledger's vocabulary and guards intact; `7e2931f` at its original SHA.

---

## 6. D14 coupling — recorded, not wired

The writer takes its `weekKey` from **`weekKeyFor()`, which reads the DEVICE's local calendar day** (`getFullYear/getMonth/getDate`, then formats UTC), while `dateIso` is **pure UTC**. Near midnight the two can name different days.

**This tranche does not change that and does not touch D14.** But Phase 4 evidence now consumes exactly the function D14 would change, so **if D14 is ever activated, evidence written before it keeps week keys computed under the old rule.** No backfill is proposed and none should be assumed. Temporal semantics were not silently changed.

---

## QURANREVIVAL_PHASE4_V0830

```
BASE_MAIN_SHA=030216ba501a1e469d0c4de36b853d1ec48ee393
FINAL_HEAD=b9d78f5f1aec3162158ca34f9184e41b0f8dc931
APP_VERSION=v08.30
D1_READING=IMPLEMENTED;EXPLICIT_COMPLETION_ONLY;NO_PASSIVE_TRIGGER
D2_LISTENING=IMPLEMENTED;80_PERCENT_OF_SELECTED_UNIT;PRELOAD_BUFFER_LOOP_SEEK_FAILURE_EXCLUDED_BY_CONSTRUCTION
D3=OUT_OF_SCOPE_NOT_IMPLEMENTED
D4_WBW=IMPLEMENTED;AYAH_PLUS_DAY;LEARNER_ACTION_ONLY;NO_OCCURRENCE_STORED
ADR008_WRITER=CREATE_ONLY_SUBCOLLECTION;DB_ENFORCED_DEDUPE;ENTRIES_ARRAY_UNTOUCHED;ACTIVITY_CANNOT_REACH_MASTERY
SHARED_FILES_CHANGED=5 (bn.js, version.js, CLAUDE.md, CHANGELOG.md, behaviour.mjs)
UNAUTHORIZED_SHARED_TOUCHES=0 (the 3 historical emulator/diagnostic touches were NOT ported)
READBAR_VERIFICATION=RE_DERIVED;7_WIDTHS_x_2_LANGUAGES;SCREENSHOTS_INSPECTED;NEW_WRAP_AT_390_AND_412_COSTING_33px_READING_AREA;OWNER_UI_ITEM_WITH_COSTED_OPTIONS;layout.mjs_NO_REGRESSIONS_250->252_ids_0_dangling
BOUNDARY_VERIFICATION=RE_DERIVED_OVER_P4E_GUARDS;INVERTED_TO_THROUGH_THE_WIRING;POSITIVE_CONTROL;3_MUTATIONS_3_CAUGHT
QURAN_REGRESSIONS=0_APPLICATION;layout/reading/panel/navcheck_ALL_EXIT_0
HADITH_REGRESSIONS=0;ZERO_HADITH_FILES_TOUCHED;ZERO_I18N_COLLISIONS
PROGRAMME_GUARDS=PASS
MUTATIONS=LEDGER_37_PASS_0_FAIL;BOUNDARY_3_OF_3_CAUGHT
I18N=4_ADDITIVE_BANGLA_KEYS;PROVEN_ABSENT_BEFORE_ADDING;VERIFIED_ON_THE_RENDERED_BANGLA_PAGE
D14_STATUS=PRESENT_UNREACHABLE_UNCHANGED_10_0
D14_COUPLING=weekKeyFor_IS_DEVICE_LOCAL_DAY_WHILE_dateIso_IS_UTC;RECORDED_NOT_CHANGED;NO_BACKFILL_PROPOSED
E1_STATUS=CLOSED;firestore.rules_CONTAINS_ZERO_EVIDENCE_RULES;WRITE_DENIED_AND_RETHROWN;I15_NOT_WEAKENED;FAILS_CLOSED_CORRECTLY
RULES_DEPLOYED=NO
APP_DEPLOYED=NO
OWNER_REVIEW_AFTER_BUILD=3 (1: Reading Approach inferred from translation visibility; 2: juz/hizb/ruku/page record no evidence and say so; 3: NEW -- the readBar costs 33px of reading area at 390/412)
READY_FOR_MASTER_ARCHITECT_CODE_ACCEPTANCE=YES
READY_TO_SHIP=NO
```

**READY_TO_SHIP = NO, and not because the build is incomplete.** E1 is closed: the Rules are not deployed, the subcollection is denied to every client, and the feature cannot function for anyone. The implementation fails closed rather than pretending otherwise, which is the correct behaviour and the reason shipping is gated rather than the reason the build is.

---

Returning to the Master Architect. No further tranche started; **v08.31 not allocated.**
