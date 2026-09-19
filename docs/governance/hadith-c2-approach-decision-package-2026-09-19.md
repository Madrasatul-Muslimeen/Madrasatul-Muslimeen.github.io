# Hadith — Master Architect decision package: C2 keys and the Approach registry

**19 September 2026 · Hadith Study stream · DECISION PACKAGE · nothing here is applied**

Two Owner Control Gates are ready to be decided. This package states what is
true, what must be chosen, and what each choice costs. It **allocates no id,
changes no key, and proposes no code change**. Sources: the S5 investigation
(`hadith-c2-live-records-path-2026-09-19.md`) and the H2-B proposal
(`hadith-approach-registry-PROPOSAL-2026-09-18.md`), both re-verified against
the code today by `tools/i18n-verify/hadith-gate-contracts.mjs` (11/0).

---

## GATE C2 — the permanent Hadith record key

### What is true today

| Fact | Evidence |
|---|---|
| The live builder is **name-keyed**: `hadith:${collectionName}:${number}` | `app/js/unit-keys.js` |
| So `hadith:bukhari:1`, `hadith:Bukhari:1` and `hadith:al-bukhari:1` are **three different permanent keys for one narration** | same builder, person-supplied first segment |
| That contradicts **I5** — *units are keyed by permanent ID, never by name* | H0 contradiction C2 |
| It is **LIVE**: one platform surface applies it, `app/records.html` | pinned by a guard as the ONLY caller |
| The accepted regex admits **both** the name-keyed form and the proposed `hadith:<editionId>:<ordinal>` | `app/js/study-note-binding.js` |
| A `hadith:` key lands in **whichever subject chunk was open**, not necessarily `subject_hadith` | `chunkKeyFor()` returns `subject_${subjectId}` from the reader's selection |
| **Zero editions are rights-cleared** | H1 |

### The decision

| Option | What it means | Cost |
|---|---|---|
| **C2-A — adopt `hadith:<editionId>:<occurrenceOrdinal>`** | A permanent internal edition id replaces the typed name. Existing keys are **kept and never rewritten** (I4); a reviewer-confirmed `legacyHadithKeyMap` resolves old → new **for display only** | Needs an edition registry. **An edition ID is an identifier, not content — it can be minted before any text is licensed**, so this is *not* blocked by the rights gate. Needs the inventory to size the legacy mapping |
| **C2-B — keep names, normalise them** (case-fold / slug going forward) | Cheaper-looking | **Still names, so still I5.** And normalising *changes the key*, so it is the same migration in a smaller coat — with no permanent id at the end of it |
| **C2-C — freeze new Hadith claims** until C2-A lands | Remove `hadith` from the `records.html` unit picker; existing records untouched and still readable | Stops undecided keys accumulating at **zero cost to existing data**. It is itself a change to a **platform** surface, so it needs its own authority |

**Recommendation: C2-A as the target, with C2-C applied now as an interim.** The
only thing that grows while this is open is the size of the legacy mapping.

**What is NOT recommended:** changing `buildUnitKey.hadith` in place. It would
silently re-key every future record and orphan every past one.

---

## GATE APPROACH — the Hadith Approach registry and its ids

### What is true today

| Fact | Evidence |
|---|---|
| 30 Approaches exist, `approach_01`…`approach_30`, in 7 sections | `APPROACH_TEMPLATES` |
| The templates carry **no `moduleId` and no `subjectId`**; the **seed** hardcodes `quranrevival` / `quran` | `catalogue.js` |
| Hadith has **exactly one trackable and it is not an Approach**: `studied_hadith`, name **"Studied"** | `TOPIC_TRACKABLE_TEMPLATES` |
| `app/hadith-study.html` tracks against that generic row | its `initTopicStudyPage({ trackableId: "studied_hadith" })` |
| The corpus component claims **no Approach at all** | grep of `hadith-browser.js` / `hadith-corpus.js` |
| **No Hadith Approach id has been allocated anywhere** | guarded |

### The five decisions, smallest first

| # | Decision | Options | Recommendation |
|---|---|---|---|
| **A1** | **ID namespace** | reuse `approach_NN` · `approach_h01` · `hadith_approach_01` | **A new namespace, never `approach_NN`.** A trackable id **is** a document id and claims are keyed by `trackableId` (I5): reusing a number would make one id mean two things in two modules, and no screen would show it |
| **A2** | **Which candidates are in v1** | the 8 in H2-B | **Three**: *Reading the Arabic*, *Reading with meaning*, *Memorising* — all direct analogues needing **no new data**. Defer *Understanding the chain*, *Grading and authenticity*, *Classical explanation* (they need corpus, isnād data or rights), *Acting on it* (needs the Quran pairing confirmed) and *Topic study* |
| **A3** | **What happens to `studied_hadith`** | keep · retire · repurpose | **Keep, unchanged and never repurposed.** Real claims are already keyed to it (I4/I6). A new Approach set sits beside it |
| **A4** | **Sections** | own sections · none · borrow the Quran's 7 | Hadith's own, or none in v1. The tenant-editable `approachSections` list lives on the tenant document and is Quran-shaped |
| **A5** | **Who allocates the numbers, and when** | — | **The Master Architect, at authorisation.** Not a session, and not in advance |

**This decision needs no inventory.** It is a product choice and can be taken
today. What it *does* need before implementation: seeding trackables is a **live
write to the `trackables` collection**, which is its own gate.

---

## The read-only inventory C2 needs — and it does NOT need Console access

**This corrects the S5 record.** `hadith-c2-live-records-path-2026-09-19.md` §5
says the inventory needs authenticated access to `study-monitoring` and that
this environment cannot perform it. The second half is true; **the first half is
not.** The app already ships the read:

`backup.html` → `collectBackup()` → `listAllRecordsForPerson(db, tenantId, personId)`
= `query(records, tenantId ==, personId ==)` — **no chunk filter**, so it returns
**every** chunk for that person, run for **every** person in the active tenant.
The export prints Unit, Chunk, Subject, Approach, Status, Confirmed, Claimed at
and By — every item §5 asks for.

### Access required

| Path | What it needs | Coverage |
|---|---|---|
| **A — the Owner's own export (recommended)** | The Owner signs into the live app as they already do, opens `/app/backup.html`, presses Export, and hands over the file. **No credentials, no Firebase Console, no CLI, no Rules change, no new app code** | Every person and **every records chunk** in **one** tenant, bounded by what that account may read under the deployed Rules. One export per tenant |
| **B — direct Firestore read** | Authenticated read access to `study-monitoring` — the same **E1** dependency the Rules deployment waits on | Every tenant in one pass. **Only needed if cross-tenant-in-one-shot is required** |

### What it produces

`tools/hadith-data-pull/records-key-inventory.mjs` — built this round, offline,
read-only, imports nothing — reports exactly §5's items 1–6: every `hadith:`
entry with its chunk/person/subject/Approach, the **distinct collection tokens
with their spellings** (the migration's real surface), the ordinal range against
the 6-digit bound, keys outside the accepted shape, keys filed outside
`subject_hadith`, and **every confirmed entry** (I6). It ends in one of three
verdicts and **decides nothing**:

| Verdict | Consequence |
|---|---|
| `NO_LEGACY_KEYS` | H1 §5 may be applied with **no legacy mapping at all** — the cheapest outcome, and the one to establish first |
| `LEGACY_KEYS_PRESENT` | A reviewer-confirmed `legacyHadithKeyMap` is needed; old keys are never rewritten (I4) |
| `CONFIRMED_PRESENT` | **I6 binds** — a frozen confirmation may never be recalculated, edited or destroyed by a migration |

### Stated limits

- One tenant per export; "every tenant" means one export per tenant.
- Coverage is bounded by the deployed Rules for the signed-in account. The
  export prints a **translated** "Covers" sentence that the tool does **not**
  parse, so **the Owner should state which export mode was used** — a
  `NO_LEGACY_KEYS` verdict is only as strong as the export's scope.
- The person column is a **display name**, not a `personId`.

---

## What can proceed before the inventory, and what cannot

| Can proceed now | Cannot, until decided |
|---|---|
| The **Approach registry decision** (A1–A5) — it needs no inventory | Allocating any Hadith Approach id |
| Offline, synthetic, read-only Hadith tooling and guards | Seeding any Hadith trackable (a live write) |
| Pinning more gate facts against drift | Changing `buildUnitKey.hadith`, or any live key |
| Drafting the edition-registry **shape** (ids only, no text) | Importing real corpus, translation or commentary |
| Running the inventory **the moment an export exists** | Any migration, any Rules change, any deployment |

## Status

**Both gates remain CLOSED.** Nothing in this package has been applied. It
proposes; the Master Architect decides.
