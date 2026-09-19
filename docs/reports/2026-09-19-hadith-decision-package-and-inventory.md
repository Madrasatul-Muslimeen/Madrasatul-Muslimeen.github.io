# Hadith — the C2/Approach decision package, and the inventory made runnable

**19 September 2026 · Hadith Study stream · BR-0 · no application change, nothing shared touched, not merged**

Continuing Hadith Study independently of the MMSA automation pilot.

---

## 1. Current tips, fetched at the start of this round

| | |
|---|---|
| **`origin/main`** | **`b87133461680d3c2837f7bd75fc5c824e10090d3`** |
| **`origin/feature/hadith-study`** (at session start) | **`c26c711026320385e6a2e7c29019908cbc21084b`** |
| Relationship | `main` has moved **ahead** — the automation pilot's CI work (`#88`, `verify.yml`) and a Quran-side D3 repair |
| This round's base | `c26c711`. **The branch was deliberately NOT refreshed against `main`**: nothing in this round depends on the pilot's changes, and the instruction is to work independently and not merge |

Every earlier SHA in this stream's reports is historical and is not repeated here
as if current.

**One thing this makes visible, and it is not this round's doing:**
`git diff origin/main -- app/` is non-empty, naming `app/js/study-note-service.js`.
That is the Quran side's commit **`57a73a8` "D3 foundation repair"**, landed on
`main` after this branch's base. **This branch changes no application file at
all** — `git diff c26c711 HEAD -- app/ firestore.rules firebase.json tests/` is
**empty**. Attributing that diff to the wrong side would have been the easy
mistake.

---

## 2. Delivered: the decision package

`docs/governance/hadith-c2-approach-decision-package-2026-09-19.md` (+ `.html`)
— one concise package covering both gates, built from the S5 investigation and
the H2-B proposal, with every fact re-verified against the code today.

**GATE C2 — the permanent record key.** Three options with their real costs:
**C2-A** adopt `hadith:<editionId>:<occurrenceOrdinal>`, keeping old keys and
never rewriting them (I4), with a reviewer-confirmed map for display only;
**C2-B** keep names and normalise them — which is still names, still I5, and
still a migration; **C2-C** freeze new Hadith claims until C2-A lands.
Recommended: **C2-A as the target, C2-C now as an interim**, because the only
thing that grows while this is open is the size of the legacy mapping.

**One correction inside the package that changes the sequencing.** C2-A has been
treated as waiting on the rights gate. It is not: **an edition ID is an
identifier, not content.** The registry of edition ids can be defined before any
narration text is licensed. What stays blocked is the text.

**GATE APPROACH — five decisions, smallest first.** ID namespace (**never**
`approach_NN` — a trackable id *is* a document id and claims are keyed by
`trackableId`, I5); which of the eight candidates are in v1 (**recommended
three**: Reading the Arabic, Reading with meaning, Memorising — all analogues
needing no new data); what happens to `studied_hadith` (**keep, never
repurposed** — real claims are already keyed to it, I4/I6); sections; and who
allocates the numbers (**the Master Architect, at authorisation**).

**This gate needs no inventory and can be decided today.**

---

## 3. THE FINDING: the inventory does not need Firebase Console access

The S5 record says the C2 inventory needs authenticated access to
`study-monitoring` and that this environment cannot perform it. **The second
half is true. The first half is not, and this corrects it.**

The app already ships the exact read:

| Step | What it does |
|---|---|
| `backup.html` → `collectBackup()` | runs for **every person** in the active tenant |
| → `listAllRecordsForPerson()` | `query(records, tenantId ==, personId ==)` — **no chunk filter**, so every chunk comes back |
| → `buildBackupHtml()` | prints **Unit, Chunk, Subject, Approach, Status, Confirmed, Claimed at, By** |

That is items 1–6 of C2 §5, including the §4 requirement that the scan must not
be limited to `subject_hadith`.

**So the access required is: the Owner presses Export in the app they already
use, and hands over the file.** No credentials, no Console, no CLI, no Rules
change, no new application code. A direct Firestore read is needed **only** if
cross-tenant-in-one-pass is required — that remains the E1 dependency.

**Stated limits, not smoothed over:** one tenant per export; coverage bounded by
the deployed Rules for the signed-in account; the export's "Covers" sentence is
translated prose the tool does **not** parse, so the Owner should say which
export mode was used — a "no legacy keys" verdict is only as strong as the
export's scope; and the person column is a display name, not a `personId`.

---

## 4. Built: the offline inventory analyser (Hadith-owned, read-only, synthetic)

| File | What |
|---|---|
| `tools/hadith-data-pull/records-key-inventory.mjs` | The analyser. **Imports nothing**, reaches no database, writes nothing. Reads one local file — a backup export or a raw JSON dump — and prints |
| `tools/hadith-data-pull/synthetic-backup-sample.html` | A synthetic fixture. Invented people, `synthetic-` collection tokens only, and a check that refuses any real collection name |
| `tools/i18n-verify/hadith-records-inventory.mjs` | **28 checks**, binding the tool to the facts it rests on |

It reports §5's items 1–6 and ends in one of three verdicts —
`NO_LEGACY_KEYS` / `LEGACY_KEYS_PRESENT` / `CONFIRMED_PRESENT` — each naming a
consequence from the accepted outcome table. **It decides nothing**, and a check
asserts the verdict function has not grown an action.

**Three design choices worth keeping:**

**It imports nothing, and a check proves the absence.** A tool that measures a
key contract must not become a consumer of it. The binding runs the other way:
the *suite* reads the accepted regex out of `app/js/study-note-binding.js` and
asserts the tool agrees. The check drifts loudly; the tool cannot drift silently.

**It parses by SHAPE, never by English.** The export is fully translated, so
keying on "Claims and confirmations" would return nothing from a Bangla export —
and the tool would then report a clean inventory of a file it could not read,
which is the worst possible failure for a decision this feeds. Claims rows are
identified as eight cells inside a person block with a records-shaped chunk key;
bookmarks (7), the activity log (6) and folders (4) cannot collide. A Bangla
export is parsed in a check and yields identical results.

**I6 decides the safe direction.** A confirmation state is printed through a
translator, so `isConfirmed()` treats any unrecognised non-empty word as
confirmed. Over-reporting a frozen confirmation is recoverable; missing one is
not.

### Run against the synthetic fixture

11 rows read, **7 `hadith:` entries** found, and every hazard surfaced: one
collection name in **two spellings** reported as one token and two keys; ordinals
1..12345678 with **two past the 6-digit bound**; one **non-numeric** ordinal;
**three keys outside the accepted shape**; one key filed in **`subject_deen`**,
not `subject_hadith` — the §4 case the whole full-scan requirement exists for —
and **one confirmed entry**, producing `CONFIRMED_PRESENT` and the I6 warning.

---

## 5. Test results

| Suite | Result |
|---|---|
| `hadith-records-inventory.mjs` (new) | **28 passed, 0 failed** |
| `hadith-gate-contracts.mjs` | 11 passed, 0 failed |
| `hadith-governing-contracts.mjs` | 14 passed, 0 failed |
| `hadith-corpus.mjs` | 33 passed, 0 failed |
| `hadith-source-rights.mjs` | 14 passed, 0 failed |
| `hadith-commentary-binding.mjs` | 14 passed, 0 failed |
| **Hadith total** | **114 checks, 0 failures, across six suites** |
| `quran-boundary.mjs` | 30 passed, 0 failed |
| `programme-ledger.mjs` | 8 passed, 23 noted, 0 failed |
| `brief-integrity.mjs` | 8 passed, 0 failed |

### Mutation proofs — seven applied, seven caught, every one reverted

| Mutation | Caught by |
|---|---|
| The parser stops recognising the 8-cell claims row | 10 checks, the positive control first |
| The tool's accepted shape drifts from the app's regex (7 digits) | the app-binding check + 2 |
| Spelling variants stop being folded into one token | §5.3 |
| `isConfirmed()` keys on the English word | the Bangla check and the I6 check |
| A real collection name appears in the fixture | the synthetic-namespace boundary |
| The offline tool acquires a static import | the import boundary |
| **The app's records query grows a chunk filter** | the access check — the export would stop covering every chunk |

**A failing check was investigated before anything was "fixed", and it was the
assertion that was wrong.** The access check first grepped the whole of
`listAllRecordsForPerson` for `chunkKey` and called it a chunk filter — but that
name appears on the line which *derives* the chunk from the document id, a
result, not a filter. Narrowed to the query expression, it asserts the query is
**exactly** the two equality filters and has grown no chunk, ordering or limit
constraint. Wrong assertion, not a defect.

**And a mutation that was caught for the wrong reason was chased.** The
accepted-shape drift (6 → 7 digits) was caught only by the bounds check, not by
the check that binds the tool to the app's regex — because the fixture had no
**7-digit** ordinal, the exact boundary. One row was added; the app-binding
check now fails on a one-digit drift, 1 failing → 3.

---

## 6. What was NOT done

- **No permanent id assigned**, no Approach id allocated, no live key changed.
- **No real corpus, translation or commentary.** Every token in the new fixture
  carries the `synthetic-` namespace and a check refuses a real collection name.
- **No durable write anywhere**; the analyser cannot reach a database and a
  check asserts it names no Firestore symbol.
- **No shared file touched.** Everything added is Hadith-owned:
  `tools/hadith-data-pull/*`, `tools/i18n-verify/hadith-*.mjs`,
  `docs/governance/hadith-*`, `docs/reports/*-hadith-*`. `CLAUDE.md`,
  `CHANGELOG.md`, `bn.js`, `behaviour.mjs`, `version.js` and the ledger are
  untouched. *(The app's `records.js` was mutated locally for one mutation proof
  and restored; `git status` shows a clean tracked tree.)*
- **Not merged and not deployed.** `main` stands where it stood. Repository
  `firestore.rules` is untouched; the DEPLOYED Firebase Rules state cannot be
  inspected from here — **UNVERIFIED**.
- **v08.32 is not allocated**; no version was changed.

---

## 7. The next independent build task

**H2-C — the Hadith Approach contract as pure, uninvoked, SYMBOLIC policy.**

A module in the shape the Quran side used for P4-A (`study-approach-contract.js`
— pure, imported by nothing, removable by deleting the file) that maps a Hadith
study interaction to a **symbolic slot** — `READ_ARABIC`, `READ_WITH_MEANING`,
`MEMORISE` — and **not to an id**. The id table stays empty, with a check
asserting it is empty and that no `approach_`-shaped string appears anywhere in
it.

**Why this one:** it makes the Approach decision a table lookup at authorisation
time instead of a build, it allocates nothing, it touches no shared file and no
live write, and it is useful whichever way A1 and A2 are decided. It needs no
inventory and no new access.

**Ready the moment an export exists:** run
`node tools/hadith-data-pull/records-key-inventory.mjs <export.html>` and the C2
inventory is answered in one command.

---

## Machine-readable status

MAIN_SHA=b87133461680d3c2837f7bd75fc5c824e10090d3 (moved ahead; the automation pilot and a Quran D3 repair)

BRANCH_TIP_AT_START=c26c711026320385e6a2e7c29019908cbc21084b

BRANCH_REFRESHED_AGAINST_MAIN=NO — deliberate; nothing this round depends on it and the instruction is not to merge

DELIVERED=decision package (C2 + Approach registry, .md and .html), offline inventory analyser, synthetic fixture, 28-check guard suite

HADITH_SUITES=114 checks, 0 failures, across six suites

MUTATIONS=7 applied, 7 caught, all reverted

APPLICATION_CHANGE=NONE — git diff c26c711 HEAD -- app/ firestore.rules firebase.json tests/ is empty

SHARED_FILES_TOUCHED=NONE

INVENTORY_ACCESS_REQUIRED=an Owner-produced backup export per tenant; NO Firebase Console, CLI or credentials. Direct Firestore read (E1) only if cross-tenant-in-one-pass is required

PROCEEDS_WITHOUT_INVENTORY=the Approach registry decision (A1-A5); offline synthetic tooling; the edition-registry SHAPE (ids only, no text)

OWNER_CONTROL_GATES=ALL CLOSED — C2 not applied, no Approach allocated, no corpus imported, no durable write, no Rules change

APP_VERSION=unchanged; v08.32 NOT allocated

FIREBASE_RULES_DEPLOYED=UNVERIFIED — nothing deployed

MERGED=NO

NEXT_TASK=H2-C, the Hadith Approach contract as pure symbolic policy with an empty id table
