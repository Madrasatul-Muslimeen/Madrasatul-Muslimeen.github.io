# MAP Phase 4 — P4-D: Study event wiring (D1 Reading, D2 Listening, D4 WbW)

**Date:** 14 September 2026
**Version:** `08.25` → **`08.26`**
**Branch:** `claude/phase4-wiring`, cut from `main` `65d3f997888480aedad58b6ed82fc4ec7d76bd74`
**Merged:** **NO — deliberately held**, per Route B.
**Status:** D1, D2 and D4 built and verified. **D3 Journaling BLOCKED on an
architecture decision (§6).** Rules deployment remains the standing access
dependency.

**Untouched:** production `firestore.rules`, `app/js/records.js`,
`app/js/activity.js` — all byte-for-byte identical to `main`. No Rules deployed,
no index, no migration, no backfill, no production write, no P4-D3, no Phase 5.

---

## 1. First: the seven evaluation errors, CLOSED with proof

The directive asked that if the emulator necessarily emits a harmless diagnostic,
the root cause be **established and proven, not merely accepted**. It is.

**Root cause.** Firestore Rules evaluates a condition in **more than one pass**.
The first pass runs *before* `get()`/`exists()` lookups are resolved, so a field
access on an unresolved lookup is recorded as `evaluation error`; the engine then
re-evaluates with the lookups available and produces the decisive result. The
verbose denial string concatenates every pass, so **any rule that authorises via
document lookups shows an evaluation error followed by its real answer.**

**How it was found**, rather than guessed: the ruleset was instrumented with
`debug()` markers between every conjunct and run against a focused case. The
marker trail showed **five full evaluation passes for three requests** — one for
the allowed write, two each for the two denied ones — which is the two-pass
signature, and exactly matched the two distinct errors logged.

**How it was proven.** The **unmodified, currently-deployed `firestore.rules`**
was run in an isolated emulator and asked to deny an ordinary unauthorised write
to the **existing** `activity` collection — a block this amendment never touches:

```
evaluation error at L867:24 for 'create' @ L867,
evaluation error at L868:24 for 'update' @ L868,
false for 'create' @ L867
```

**The deployed ruleset emits TWO such errors per denial where the P4 evidence
rule emits one.** The diagnostic predates Phase 4 entirely and the P4 rule is
*cleaner* than the production baseline it extends. That proof is checked in as
`tools/firestore-emulator/baseline-diagnostic.test.mjs`.

**What changed as a result.** Not the rule — changing it would mean removing
`get()`-based authorisation, which *is* the security contract. What changed is
the suite: every denial now asserts that its **last** evaluation entry is a clean
`false`, and that no denial is a budget refusal. That is the property which
separates this rule from the rejected candidate, whose denials were budget
exhaustion with **no** decisive `false` at all.

| Acceptance target | Result |
|---|---|
| 0 failures | **0** |
| 0 expression-budget denials | **0** |
| 0 unexplained evaluation-error-dependent denials | **0 — root-caused, proven pre-existing, and now asserted against** |

---

## 2. P4-D1 — Reading

ADR-008 requires **explicit** completion, and this app had no such control, so
one was added: a `✓` button on `#readBar` (`#readCompleteBtn`).

- **Explicit only.** A deliberate press. There is no passive trigger anywhere —
  opening, scrolling and navigating record nothing.
- **Approach mapping** is read off what is genuinely on screen: a translation
  showing → `approach_03` Reading (with Meaning); none → `approach_01` Reading
  (with Tajweed). This app has no separate mode switch, so deriving it from the
  reader's own state beats inventing a mode they must remember to set.
- **Deterministic unit/day evidence** via the accepted store.
- **Activity only.** No `claimStatus()`, no `confirmEntry()`, no records write,
  and **not even a `logActivity()` entry** — evidence goes to its own
  subcollection and nowhere else.
- **Units v1 cannot record** (juz, ruku, hizb, page) say so plainly rather than
  failing silently or inventing a unit key the contract would refuse.

**Feedback without touching a dense row.** `#readBar` is this app's densest row,
so the confirmation is the button's own *persistent* state plus a
`role="status"` live region that is `position:absolute` and 1px-clipped —
**zero layout cost**, still announced by a screen reader. The tick clears on
every unit change: "recorded" belongs to a unit and a day, not to the screen.

**I15:** failures are surfaced by `safeWrite()`'s own banner. Nothing is
swallowed, per the amendment.

## 3. P4-D2 — Listening, and the defect that would have made it do nothing

**The defect, caught before it shipped.** The first wiring branched on
`state === "ended"` inside `setPlaybackStateHandler`. But `audio-player.js`
registers one listener for `play/playing/pause/ended/emptied/error/abort` and
invokes `onPlaybackState()` **bare, with no arguments** — purely so the transport
button can follow the audio's real state. That branch would have been false for
ever: **Listening evidence would never once have been recorded, and every test of
the pure session logic would still have passed.** Found by reading the player
rather than assuming its shape.

The end of a listen now comes from `playCurrentSelection()`'s own completion and
`catch`, which are the real signals, plus the player's error channel and the Stop
button. A boundary check asserts the wiring never settles from the
argument-less handler, and **that check is proven able to fail** by re-applying
the defect.

**ADR-008's exclusions are properties of the shape, not special cases:**

| Exclusion | How |
|---|---|
| background preload | a session exists only when a **person** pressed Play; nothing else can create one |
| buffering | does not advance the āyah, so it cannot add coverage |
| looping | heard āyahs are a **Set** — a repeat adds nothing |
| seeking | an āyah is credited only on **forward** motion, so a jump credits only the āyah really left behind, never the skipped ones |
| failed playback | `failed()` ends the session permanently; it can never qualify afterwards |

**≥80% of the selected bounded unit**, measured in āyahs of that unit. Resuming
after a pause continues the same listen rather than starting a second one that
would have to re-earn its 80%. Stopping by hand is **not** failing — what was
genuinely heard still counts.

## 4. P4-D4 — WbW, at āyah + day by construction

`wbwEngagementArgs()` takes a **surah and an āyah** and **has no parameter for an
occurrence**. So a hundred taps in one āyah on one day produce one identical set
of arguments, one identical event id, and one document — the rest are refused by
the database as duplicates. `occurrenceId` cannot enter the evidence even by
mistake, because there is nowhere to put it.

It fires on the **learner's own** state action only. A supervisor's approval is
the other branch and records **no** Activity: a teacher approving a word has not
themselves studied it.

Occurrence-level truth remains exclusively `quranWordProgress`, untouched.

## 5. Absolute safety boundary — proven at every tranche

| Must never | How it is held |
|---|---|
| evidence enters `activity.entries[]` | the wiring module may not contain `arrayUnion`, `logActivity`, or Firestore `entries`; asserted by reading the source |
| evidence enlarges `bulkConfirmWeek()`'s input | its body must still read only `activitySnap.data().entries` and must not mention `evidence` or run a query — **proven able to fail** |
| influence `claimStatus()` / `confirmEntry()` | neither the writer nor the wiring module may name them, or `records.js`, or `achieved`/`mastered` — **proven able to fail** |
| create `achieved` / `mastered` | the evidence document's field list forbids any status-shaped field; the Rules' `hasOnly()` makes one unstorable |
| bypass the Mastery workflow | evidence is a different collection; Mastery still moves only through `records/` |

Plus, new at P4-D: **the writer has exactly one entry point.** Through P4-C the
check asserted nothing imported it; that check was **updated in place with the
reason**, not deleted — "reachable from exactly one audited place" is the
stronger invariant now, and it catches a second module quietly learning to write
evidence.

## 6. P4-D3 Journaling — BLOCKED, and why it is a decision not a defect

The live note surface is `app/js/ayah-notes.js`. It stores:

```
ayahNotes/{tenantId}__{personId}
  notes: { "<unitKey>": { html, updatedAt } }
```

**One note per (person, unitKey), keyed by unitKey, with no id of any kind** —
its own comment says "a person's current note on that āyah, not an append-only
log". ADR-008 as amended requires a permanent `noteId` in the event identity, and
the Master Architect's Required Correction 1 requires two Notes on the same unit
to remain independent. **That data model cannot hold two notes on one unit at
all.**

`app/js/note-foundation.js` *does* have permanent note ids
(`crypto.randomUUID()`), revisions and multiple notes — and is **imported by
nothing**. It is the Phase 5 Note Foundation, which the directive explicitly puts
out of scope.

Three routes, in §11 of the production package. **Synthesising a `noteId` from
the unitKey is not among them**: it would leave the amendment's words in place
while emptying them of meaning, and nothing on any screen would show it.

## 7. Tests

| Suite | Result |
|---|---|
| `study-event-wiring.mjs` (D1+D2+D4 pure) | **39 passed, 0 failed** |
| `study-activity-evidence-id.mjs` | 29 passed, 0 failed |
| `study-activity-evidence-store.mjs` | 19 passed, 0 failed |
| `study-activity-evidence-boundary.mjs` | **18 passed, 0 failed** (was 13 — five new guards) |
| Emulator candidate Rules | **53 assertions, 0 failed, 0 budget denials, every denial decisive** |
| Rules mutation (4 checks) | all four **fail the suite** when neutralised |
| Boundary mutation (4 kinds) | all four **fail the suite** |
| `study-approach-contract` / `-evidence` / `-boundary` | 13 / 11 / 16, 0 failed |
| `quran-word-card-rendered.mjs` | **122 passed, 0 failed** |
| `quran-word-progress-rendered.mjs` | **81 passed, 0 failed** |
| `quran-word-card` / `-progress-model` / `-progress-data` | 36 / 57 / 37, 0 failed |
| `quran-boundary` / `stub-parity` | 30 / 3, 0 failed |
| `layout.mjs` | **0 `CHANGED` metrics across all 16 configurations, 0 page errors, 0 overflows, 0 lost rows**; `getElementById` **250 → 252**, exactly D1's two new elements |
| `reading.mjs` | `READING SCREEN OK`, English and Bangla |
| Translation coverage | **1,807 scanned / 47 missing** — missing unchanged |
| `navcheck.mjs` | unchanged — only the pre-existing 320 px English truncation |

**Four new strings, all translated.** D2 and D4 add none. Translation coverage
**1,803 → 1,807 scanned, 47 missing UNCHANGED** — the +4 is exactly D1's four
strings, and every one landed in Bangla.

## 8. Defects found in my own checks, all by measuring

1. **A guard that passed against the very defect it was written to catch.** The
   Listening guard sliced the handler to the next `");"` — which in JavaScript
   is the two characters `)` and `;`, so it stopped at `renderReadTransport();`
   and never saw the rest. It went green on the mutation. It balances
   parentheses now, and the mutation fails.
2. **A pure test re-imported the same `data:` URL** expecting a fresh module and
   got the cached one, whose store reference was bound at first evaluation.
3. **The `personInTenant()` mutation gap**, carried over from the P4-C report and
   closed here: the cross-tenant case was already denied by `canRecordFor`, so it
   proved nothing. The isolating case has that person writing **for themselves**
   under another tenant's path, paired with an allow differing in one fact.

## 9. Position

**Complete and verified:** the Rules diagnostic cleanup, P4-D1, P4-D2, P4-D4.

**Held, not merged:** the wiring, until the Rules are deployed. Merging now would
mean every mapped Study interaction attempts a write production denies, and the
writer surfaces genuine denials by design (I15) — the Owner would see a failure
banner on every āyah they marked read.

**Everything that can be finished without production Firebase access has been.**
What remains is: **(a)** deploy the prepared Rules amendment — see
`docs/governance/phase4-production-package-2026-09-14.md`; and **(b)** the P4-D3
architecture decision in §6.

**STATUS: RETURNING UNDER CONDITIONS A AND B — one architecture decision (D3) and
one production-access dependency (Rules deployment).**
