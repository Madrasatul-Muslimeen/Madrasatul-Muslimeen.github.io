# Hadith H2-C, the proposed claim freeze, and C2 reporting without personal content

**19 September 2026 · Hadith Study stream · BR-0 · no live write, no shared-file change, no version, not merged, nothing deployed**

---

## 1. SHAs

| | |
|---|---|
| **`origin/main`** | `b87133461680d3c2837f7bd75fc5c824e10090d3` — unchanged by this round |
| **Branch** | `feature/hadith-study` |
| **Base at session start** | `16dd3bc5203c953c0856d2edace83bff45f5cd6b` |
| **WORK COMMIT (everything below)** | **`f35432f47121036fe343e2ee636a68599e0cdeca`** |
| **Branch tip** | the commit that adds this report, which is the last on the branch. **A report cannot name the commit that contains it** — this stream corrected exactly that defect in the S5 report, so the work commit is named instead and the tip is read with `git rev-parse origin/feature/hadith-study` |
| `git diff` over `app/records.html`, `firestore.rules`, `firebase.json`, `tests/`, `version.js` | **empty** |

The one new file under `app/` is `app/js/hadith-approach-contract.js`, which
**no page can reach** — asserted by an import-graph walk with a positive
control. Delete it and the application is unchanged.

---

## 2. H2-C — the Approach contract as pure symbolic policy

`app/js/hadith-approach-contract.js` + `tools/i18n-verify/hadith-approach-contract.mjs` (**21 checks**).

Three slots — **`READ_ARABIC`**, **`READ_WITH_MEANING`**, **`MEMORISE`** — and
`HADITH_APPROACH_IDS = Object.freeze({})`, **empty**. When the ids are
allocated, one table is filled in and nothing else changes.

**Four design choices worth keeping:**

**The empty table is guarded three ways.** It must be empty and frozen; every
slot must report `null`; and **no lowercase `approach_`-shaped id may appear
anywhere in the file, comments included** — so a placeholder cannot be smuggled
in as a note.

**A known slot returns `null`; an unknown slot THROWS.** Collapsing those two
would let a typo (`MEMORIZE`) read as a pending decision forever. `null` means
*not decided*; a throw means *not a thing*.

**The Quran analogues are recorded as SYMBOLS, never ids.** Writing
`approach_01` here would read as a binding to it — and the H2-B audit's central
finding is that a trackable id **is** a document id, so one id meaning two
things in two modules is exactly what I5 forbids.

**It imports nothing, by inability rather than restraint.** A module that cannot
see `buildUnitKey`, `APPROACH_TEMPLATES` or the records layer cannot quietly
grow a claim path. Checks assert the absence of every import, of every Firestore
symbol, and of every evidence-shaped field (`eventType`, `unitKey`, `weekKey`,
`chunkKey`…): it returns a **slot** and stops.

`blockersFor(slot)` names **both** open gates — no allocated id, and C2 — for
every slot, so a future surface can say which thing is missing rather than
failing blank. A check asserts C2 stays named even for a slot that later gets an
id: allocating an Approach does not decide the unit key.

---

## 3. The proposed claim freeze — prepared, and deliberately NOT applied

`app/records.html` is a **platform** surface, so the change exists only as:

| File | What |
|---|---|
| `docs/governance/hadith-c2-claim-freeze-PROPOSAL-2026-09-19.md` (+ `.html`) | the proposal, for MMSA platform review |
| `docs/governance/hadith-c2-claim-freeze-records-html-2026-09-19.patch` | the exact change, **unapplied**, proven to apply with `git apply --check` |
| `tools/i18n-verify/hadith-c2-freeze-proposal.mjs` | **12 checks**, including that the live file is **not** patched |

**What it does:** withholds `hadith` from the Records unit-type picker while C2
is open, so **no new name-keyed Hadith record can be created**. It does not
decide C2; it stops the reconciliation problem growing while C2 is decided.

**What it preserves — established by reading the code, not asserted:**

| Preserved | Why |
|---|---|
| Every stored record | One `<option>` list changes. No document, field or key is written, moved or removed |
| Display of existing Hadith records | `renderEntries()` reads `chunk.entries` and prints the **stored** key; a check asserts it never reads the picker |
| Confirm and Return (**I6**) | Both act on the stored `chunkKey`/`entryKey` from the rendered row |
| Reachability of the chunk | Hadith lands in `subject_{subjectId}`, and **every** non-surah-chunked type opens the same document — read out of `SURAH_CHUNKED_TYPES` in `records.js` source, so the check fails if the **rule** changes |
| Reversibility | `buildUnitKeyFromInput` keeps `case "hadith"`; reversing is deleting one `.filter(...)` line |

**The patch adds only — it deletes no live line**, and a check asserts that.

**Two variants are offered**, and the recommended one is the *explaining* form:
a control that simply vanishes is a dead end with nothing on screen to say why.
That costs **one new English sentence**, whose Bangla key belongs in
`app/js/i18n/bn.js` — **a shared file this stream must not touch**, so adding it
is part of the platform review. A check records that the key is currently
absent.

---

## 4. Export coverage — verified, and it found the hazard that matters

| Question | Answer, read out of the code |
|---|---|
| Does an Owner export cover the whole tenant? | **Yes.** `backup.html` builds its roster as `canAdmin ? all : self + managed`, and `collectBackup` records `scope: canAdmin ? "tenant" : "account"` |
| Does it cover every records chunk? | **Yes.** `listAllRecordsForPerson` is two equality filters and **no chunk filter** |
| Does a refused read look like an empty one? | **YES — and this is the hazard.** `attempt()` records a note and substitutes `[]`, so a person whose records were refused prints as **"0 claims"**, identical to a person with none |
| Is the gap auditable from the file? | **Yes.** The export prints a `div class="warn"` list of *label — reason* |

**So a "no legacy Hadith keys" verdict read off a file with refusals would be
false.** The analyser now parses that block and **downgrades** a clean verdict to
**`NO_LEGACY_KEYS_BUT_INCOMPLETE`**, naming how many reads were refused. Four
checks cover it, including one asserting the exporter still prints refusals at
all — because the day it stops, the gap becomes invisible rather than merely
unparsed.

---

## 5. Reporting C2 without names or personal record content

`--safe` emits a digest that **keeps** what the decision needs and **drops**
everything personal:

| Kept | Dropped |
|---|---|
| collection tokens **with their spelling variants** (the migration's real surface) | every person name |
| ordinal statistics, chunk names, Approach ids seen | every `claimedBy` person id |
| counts: entries, persons, confirmed, refused reads | every timestamp |
| the verdict | the tenant id, and **every per-entry row** |

**By construction, not redaction.** A per-entry row pairs a narration with the
person whose section it was printed under — that pairing *is* the personal
content, and no amount of column-dropping makes a row list safe, so rows are not
carried at all. The confirmed **count** is kept because I6 needs the number; the
confirmed **rows** are not.

**Each omission check carries its own positive control** — the suite asserts the
names, dates and ids really are present in the fixture and in the full
inventory, so "absent from the digest" means something rather than passing
vacuously.

---

## 6. Tests

| Suite | Result |
|---|---|
| `hadith-approach-contract.mjs` (new) | **21 passed, 0 failed** |
| `hadith-c2-freeze-proposal.mjs` (new) | **12 passed, 0 failed** |
| `hadith-records-inventory.mjs` (28 → **36**) | 36 passed, 0 failed |
| `hadith-gate-contracts.mjs` | 11 passed, 0 failed |
| `hadith-governing-contracts.mjs` | 14 passed, 0 failed |
| `hadith-corpus.mjs` | 33 passed, 0 failed |
| `hadith-source-rights.mjs` | 14 passed, 0 failed |
| `hadith-commentary-binding.mjs` | 14 passed, 0 failed |
| **Hadith total** | **155 checks, 0 failures, across eight suites** |
| `quran-boundary.mjs` | 30 passed, 0 failed |
| `study-approach-contract-boundary.mjs` | 16 passed, 0 failed |
| `programme-ledger.mjs` | 8 passed, 23 noted, 0 failed |
| `brief-integrity.mjs` | 8 passed, 0 failed |

### Mutations — 12 applied, 12 caught, all reverted

| Mutation | Caught by |
|---|---|
| An id is allocated in the contract | the empty-table check |
| An interaction with no slot is given one | the "records nothing, quietly" check |
| The pure contract imports `unit-keys.js` | the import boundary |
| The C2 blocker stops being named | both blocker checks |
| The freeze is **applied** to the live platform surface | the not-applied status check |
| The display path starts reading the picker | the preservation check |
| The patch grows to touch a shared file | the applies-cleanly check |
| The `hadith` case is removed from the key builder | the reversibility check |
| A refused read stops downgrading a clean verdict | the coverage check |
| The digest starts listing person names | the privacy check |
| The digest starts carrying confirmed **rows** | the privacy check |
| Gap parsing silently returns nothing | the refusal-parsing check |

### Three findings about my own checks, recorded rather than smoothed over

**A case-insensitive `approach_` sweep flagged the module's own
`HADITH_APPROACH_SLOTS` — and I reintroduced the identical defect in the same
check's very next assertion.** Ids in this codebase are lowercase; SCREAMING_CASE
symbol names share the word. All three assertions are case-sensitive now. Had I
"fixed" the module instead of the check, I would have weakened correct code to
satisfy a broken guard.

**A chunk-filter grep read a *derived* `chunkKey` as a filter.** Narrowed to the
query expression, it now asserts the records query is **exactly** two equality
filters with no chunk, ordering or limit constraint.

**One mutation was caught by a different check than it aimed at**, leaving the
patch file-scan unproven. It now carries its own positive control: given a
two-file patch it must see two files, so asserting "only one" is not passing
because the scan finds nothing.

---

## 7. What was NOT done

No permanent id assigned; **no Approach id allocated** (the table is empty and
guarded); no live key changed; **the freeze is not applied**; no real corpus,
translation or commentary; **no durable write** and no database reachable from
anything added; **no shared file touched** — `CLAUDE.md`, `CHANGELOG.md`,
`bn.js`, `behaviour.mjs`, `version.js`, the ledger and `app/records.html` are
all untouched; **no version allocated** (v08.32 remains unallocated); **not
merged**; **nothing deployed** — repository `firestore.rules` is untouched and
the DEPLOYED Firebase Rules state cannot be inspected from here,
**UNVERIFIED**.

---

## 8. The exact next decision

**Decide A1 and A2 from the decision package — the Approach id namespace, and
which candidates are in v1 — and rule on the claim freeze.** All three are
product decisions that need no inventory and no new access.

Concretely, three answers unblock the next build:

1. **A1 — namespace.** Recommended: `hadith_approach_NN`, never `approach_NN`.
2. **A2 — v1 set.** Recommended: the three slots already named symbolically.
   **The moment these two are answered, H2-C's empty table is filled in and
   nothing else changes.**
3. **The freeze** — apply variant B (with the `bn.js` key), apply variant A, or
   decline. This is the MMSA platform side's call, not this stream's.

**Still gated behind the Owner, separately:** C2 itself, which needs the
inventory — and the inventory now needs only an export, not Console access.

## Machine-readable status

MAIN_SHA=b87133461680d3c2837f7bd75fc5c824e10090d3 (unchanged this round)

BRANCH=feature/hadith-study

WORK_COMMIT=f35432f47121036fe343e2ee636a68599e0cdeca

BASE_AT_START=16dd3bc5203c953c0856d2edace83bff45f5cd6b

H2C=BUILT — 3 symbolic slots, permanent-id table EMPTY and guarded, unreachable from every page

FREEZE=PREPARED, NOT APPLIED — patch verified with git apply --check; live app/records.html byte-identical

EXPORT_COVERAGE=owner/prime export is tenant-wide and covers every chunk; a REFUSED read prints as empty, so refusals now downgrade a clean verdict

SAFE_REPORTING=--safe digest: counts, tokens and spelling variants only; no names, ids, dates, tenant id or per-entry rows

HADITH_SUITES=155 checks, 0 failures, across eight suites

MUTATIONS=12 applied, 12 caught, all reverted

APPLICATION_CHANGE=NONE reachable — one new unreachable module under app/js

SHARED_FILES_TOUCHED=NONE

OWNER_CONTROL_GATES=ALL CLOSED

APP_VERSION=unchanged; v08.32 NOT allocated

FIREBASE_RULES_DEPLOYED=UNVERIFIED — nothing deployed

MERGED=NO

NEXT_DECISION=A1 (id namespace), A2 (v1 slot set), and the freeze variant — none needs the inventory
