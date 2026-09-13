# QuranRevival — MAP Phase 3 delivery: Arabic Progress & Coverage

- **Date:** 2026-09-13
- **Branch:** `claude/pensive-knuth-2pu3jj`
- **App version:** 08.13 → **08.19**
- **Status:** evidence at a checkpoint. `OWNER ACTION: NONE — CONTINUING AUTHORISED EXECUTION`, except the one gate named in §8.

---

## 1. Verified start

| | Expected | Found | |
|---|---|---|---|
| Branch HEAD at session start | `b548be51…` | `b548be515a00a22852be4f54ed7ff27e827b41dc` | ✅ |
| App version at session start | `08.13` | `08.13` | ✅ |
| `behaviour.mjs` baseline | ~800 pass | 802 pass / 1 fail | ✅ |
| 20 node suites | green | all green | ✅ |

All three governing documents (MAP v4, the execution ledger v02, the recovery
report) were supplied to this session and read before any code was touched —
the process defect the ledger recorded against the previous session.

## 2. What was built, in six bounded tranches

| Version | Tranche |
|---|---|
| 08.14 | Pure word-progress state model |
| 08.15 | Persisted storage / data layer |
| 08.16 | Arabic coverage calculation |
| 08.17 | WbW self-progress, managed states, teacher approval on the Word Card |
| 08.18 | Arabic coverage in Explore |
| 08.19 | Rules candidate, safeguards and this report |

Every tranche read `app/js/version.js` first and incremented it in the same
commit, with BEFORE/AFTER/VERIFIED stated in the commit message.

## 3. The three MAP locks, enforced rather than asserted

**Activity ≠ Mastery.** `quran-word-progress.js` has no
`projectWordState(event)` and never can: a check reads its own source and
fails if an event type appears in it. In the browser, opening a word, moving
between words and switching Arabic level are proven to write **nothing**, by
counting recorded writes after each. Where confirmation is required, a claim
awaiting a teacher scores **zero** in coverage — the lock as arithmetic.

**A WbW toggle ≠ an Approach claim.** Word progress lives in its own two
collections with its own vocabulary. Neither module names `records`,
`activity`, a `chunkKey` or a `trackableId`; asserted by source inspection and
again in the browser, where `__stubWriteData` carries zero writes to either
collection across every flow.

**Surface Token ≠ Lemma ≠ Root ≠ Grammatical Family.** Untouched from Phase 2;
this phase addresses occurrences only, by their permanent ADR-007 id.

**Arabic levels stay independent.** Every stored lane names its level, and
`basic`/`depth` are refused with "deferred" — in the state model, in the data
layer, and in the candidate Rules, so the DDR item cannot be crossed by a
client bug.

## 4. A real defect found, and made structural

The state model re-opened a review by writing `pending` over the stored
decision. That **edited a frozen confirmation** (I6) and then pushed the
phantom `pending` into history in place of the confirmation a supervisor had
actually given, destroying it (I4). Found by a failing data-layer check, not
by reading the code.

Freezing is structural now: a decision records the exact claim instant it was
given for, a claim never touches the supervisor lane at all, and the resolver
asks whether the decision still matches. Strictly better — nothing is
rewritten, the real decision survives in history, and an ordinary claim
dropped from two writes to one. Proven able to fail: removing the
claim-instant comparison makes three checks across two suites fail by name.

## 5. Two defects found by LOOKING at a screenshot

Both after every rect assertion had already passed.

1. At **320×640** the taller Word Card overflowed its 45vh cap by 49px, far
   enough that all three state buttons sat below the fold — the control a
   reader came for was unreachable unless they discovered the card scrolls.
   The cap is raised on short viewports only, and reachability is asserted at
   every viewport now.
2. Explore's coverage strip first reused the Word Card's light-card palette,
   rendering navy on Explore's dark gradient at **1.89:1** against a 4.5:1
   minimum — v07.138's exact defect. It follows the wheel legend's own
   light-on-dark palette now (**12.88:1**), and the suite measures rendered
   contrast. Proven able to fail at 1.03:1.

## 6. Measured cost

Dataset traversal: 114 surahs, 6,236 ayahs, 77,429 occurrences; longest ayah
2:282 at 128 words; largest surah 2 at 6,116.

| Operation | Cost |
|---|---|
| Landing path | **0** reads |
| Opening Read | **0** reads |
| Opening one word card | 2 reads, then 0 |
| Explore reaching a surah | **2 queries** (not 2 per ayah) |
| Full Al-Baqarah coverage | 2 queries vs 6,116 reads for a per-occurrence store |
| One claim | 1 write |
| One decision | 1 write |

Worst-case lane documents, JSON proxy, 2:282 fully populated: learner 9,716
bytes, supervisor 101,111 bytes with full history. Not a Firestore encoded
size and not a billing figure.

## 7. Verification

| Suite | Result |
|---|---|
| `quran-word-progress-model.mjs` | 57 / 0 |
| `quran-word-progress-data.mjs` | 37 / 0 |
| `quran-word-coverage-arabic.mjs` | 29 / 0 |
| `quran-word-progress-rendered.mjs` | **81 / 0**, 2 languages, 6 viewports |
| `quran-word-explore-rendered.mjs` | **35 / 0**, 2 languages |
| Emulator Rules candidate | **42 / 0** (23 denials, 19 allows) |
| `behaviour.mjs` | 800 / 3 — the documented steady state; the 3 are section 22g's archive.org poster block this sandbox cannot reach |
| `layout.mjs` | every landing-page metric **byte-for-byte identical** at 8 viewports × 2 banner states; `getElementById` 249 → 250, exactly one new element |
| `navcheck.mjs` | unchanged (pre-existing 320px English truncation only) |
| `reading.mjs` / `panel.mjs` | OK both languages, no truncated label |
| All node suites | green |
| Translation coverage | 1,778 → 1,794 scanned, **missing UNCHANGED at 47** |

**Five failing checks were investigated; four proved WRONG ASSERTIONS** — a
Bangla coverage line correctly reordered against an English-order assumption;
a create path asserted in the update shape; an Explore navigation step that
does not exist (the Whole Quran level opens on 114 surahs, not 30 Juz); and a
self-containment guard that matched its own candidate's prose. The fifth was
the real I6 defect in §4. Checks describing what a tranche changed were
**updated in place with the reason**, never deleted.

## 8. OWNER CONTROL GATE — Rules deployment

`firestore.rules` is **byte-for-byte unchanged**. The candidate lives at
`tests/firestore/word-progress-v1.proposed.rules` and is **not deployed**.

Until it is, the two new collections have no server-side rule, so this feature
is exercisable on this branch and by the Owner's own account only — not by a
student or teacher account against production. That is a deliberate
consequence of not crossing the gate.

Full analysis, including the one limitation stated plainly, is in
`docs/governance/phase3-word-progress-rules-candidate-2026-09-13.md`.

## 9. Deferred items confirmed untouched

- **DDR-001** non-Quran progress — untouched.
- **DDR-002** subject-scoped teacher authority — untouched; word progress uses
  the existing student-scoped `canRecordFor` shape unchanged.
- **DDR-003** translator selection — untouched.
- **DDR-004** the 30 Approaches — untouched; no trackable was added, removed or
  reinterpreted.
- **Basic Arabic / Arabic in Depth claim unit** — deferred, and now refused at
  three layers rather than merely unimplemented.
- **Phase 4 Activity Rules candidate** — still rejected, still gated, not
  touched. Phase 3 never depended on it.

## 10. Flagged, not changed

- **The wheel's slice colours are untouched.** They colour an Approach's claim
  status; a second meaning competing for the same colour costs more than it
  gives, as v08.02 already weighed and declined for sections.
- **Juz, hizb, rub, manzil and page coverage is deliberately not computed.**
  They span surahs; covering only the loaded part would understate every one.
  Those levels say so in words and read zero documents to do it.
- **`npm run activity-proposal` cannot start in this environment** — a
  pre-existing config path breakage, reproduced and documented, deliberately
  left unfixed because that suite is the evidence base for a rejected
  candidate at an Owner gate. The one-line remedy is named in the governance
  document.
- **`md2report.py` hardcoded one report's title**, so every report generated
  after it carried the wrong browser-tab title. Fixed at source; the existing
  report's body regenerates byte-identically.

`CLAUDE SESSION CONTINUITY: CONTINUE CURRENT SESSION`
