# Hadith C2 — the LIVE Records path for the undecided permanent key

**Date:** 2026-09-19 · **Gate:** C2, the permanent Hadith Study Unit key · **Status:** DOCUMENTED ONLY.
**Nothing here was changed.** No key generation was altered, no record migrated, no unit key applied.

---

## 1. Why this document exists

H0 recorded contradiction **C2**: the Hadith permanent unit key already exists and conflicts
with the plan, because `buildUnitKey.hadith` composes a **collection NAME**, against **I5**
(*units are keyed by permanent ID, never by name*). H1 §5 proposed
`hadith:<editionId>:<occurrenceOrdinal>` and left it behind an Owner Control Gate.

Everything written until 19 Sep 2026 treated C2 as **latent** — a conflict that would matter
when the key was applied. **It is not latent.** The name-keyed permanent key is reachable in
the live Records surface today, through a path that predates the Hadith stream entirely.

It was found by a guard asserting the opposite (*"nothing builds a hadith unit key"*) and
failing. The guard now pins the one platform caller by name.

---

## 2. Entry point

| Step | Where |
|---|---|
| Page | **`app/records.html`** — the platform Records surface. Not a Hadith-owned file |
| Control | `#unitTypeSelect`, populated from **`UNIT_TYPES`** (`app/js/unit-keys.js`), which contains `hadith` among its twelve. **The reader is offered "Hadith" in the picker** |
| Control | `#unitRef` — a free-text reference box |
| Builder | `buildUnitKeyFromInput(unitType, reference)`, `app/records.html` ≈ line 262 |
| The branch | ≈ line 279 — `case "hadith": { const [c, n] = ref.split(":"); return buildUnitKey.hadith(c, n); }` |
| Save path | ≈ line 529, then `claimStatus(db, { … })` in `app/js/records.js` |

The reference is split on `:` into two free-text parts. **Neither is validated against any
registry**: `c` is whatever the reader typed.

---

## 3. Key produced

`app/js/unit-keys.js`:

`hadith: (collectionName, number) => ` → `hadith:${collectionName}:${number}`

So a reader typing `bukhari:5678` produces **`hadith:bukhari:5678`** — the file's own doc
comment uses exactly that example. The first segment is a **name**, supplied by a person, in
whatever spelling they chose. `hadith:bukhari:1`, `hadith:Bukhari:1` and `hadith:al-bukhari:1`
are three different permanent keys for one narration.

**That is the whole of C2, and it is live.**

---

## 4. Where it may persist

`claimStatus()` in `app/js/records.js`:

| Fact | Value |
|---|---|
| Chunk | `chunkKeyFor(unitKey, subjectId)`. `hadith` is **not** in `SURAH_CHUNKED_TYPES` (`ayah`, `range`, `surah`, `ruku`), so it returns **`subject_${subjectId}`** |
| Document | `records/{tenantId}__{personId}__subject_{subjectId}` |
| Field | `entries.{unitKey}::{trackableId}` — e.g. `entries.hadith:bukhari:5678::studied_hadith` |
| Write | `updateDocument(...)` if the chunk exists, else `createDocument(...)` |

**THE SUBTLETY THAT DECIDES THE INVENTORY'S SHAPE.** `subjectId` comes from
`subjectSelect.value` — **the subject the reader had selected — not from the unit type.** A
`hadith:` key therefore lands in whatever subject chunk was open at the time. It is *usually*
`subject_hadith`, but nothing enforces that.

**So an inventory that queries only `…__subject_hadith` can miss real records.** It must scan
every records chunk.

**One brake exists, and it is not a guarantee.** The form refuses to save without a
`trackableId`, and today the only Hadith-side trackable is the generic `studied_hadith` row.
So a claim is possible but needs an Approach-bearing subject selected. This limits volume; it
does not prevent the key.

---

## 5. The read-only production inventory needed before any key decision

Required before H1 §5 can be applied. **Read-only. No write, no migration.**

**Scope:** every document in the `records` collection, across every tenant and person — *not*
filtered to `subject_hadith`, per §4.

**What to collect**, per matching entry:

1. The **full entry key** (`<unitKey>::<trackableId>`) and its document id, so tenant, person
   and chunk are recoverable.
2. The **unit key** where `unitKey.startsWith("hadith:")`.
3. The **distinct first segments** — the collection names actually used, with counts and
   spellings. This is the migration's real surface: the set of names a reader invented.
4. The **second segments** — whether they are numeric, and their range, against the accepted
   regex's 6-digit bound.
5. Whether any entry is **confirmed** (I6: a frozen confirmation must never be edited or
   destroyed).
6. Counts of entries, distinct persons and distinct tenants.

**What the answer decides:**

| Outcome | Consequence |
|---|---|
| **Zero `hadith:` entries anywhere** | H1 §5 may be applied with no legacy mapping at all. The cheapest outcome, and the one to establish first |
| **Some entries, all resolvable to an edition** | A `legacyHadithKeyMap` is needed, reviewer-confirmed per H1 §5. Old keys are never rewritten (I4) |
| **Entries whose collection name cannot be resolved** | They stay readable and render with their raw key and a *"not resolved to an edition"* label. **Never destroyed, never silently reinterpreted** |
| **Any confirmed entry among them** | I6 binds: the confirmation is frozen. A migration may not recompute it |

**Access:** this environment cannot perform it. `firebase` CLI and `gcloud` are absent, no
credentials are set, and the Rules API returns **HTTP 403** to an unregistered caller. It
needs authenticated read access to `study-monitoring`, which is the same external dependency
the Rules deployment waits on.

---

## 6. What must NOT be done before that decision

- **Do not change `buildUnitKey.hadith`.** It is a permanent Study Unit key and a shared
  platform file. Changing it silently re-keys every future record and orphans past ones.
- **Do not narrow the accepted regex** in `app/js/study-note-binding.js`. It admits both the
  legacy and the proposed form; tightening it to the proposal alone would strand every
  existing `hadith:<name>:<n>` record.
- **Do not migrate or rewrite any record** (I4, I6).
- **Do not remove `hadith` from `UNIT_TYPES`** to "close" the path. That hides the surface
  without addressing the keys already created, and is itself a platform behaviour change.

`tools/i18n-verify/hadith-gate-contracts.mjs` holds these: it pins the name-keyed builder,
both regex admissions, the exact 6-digit bound, and the fact that **`app/records.html` is the
only caller** — failing if any Hadith-owned file begins applying the undecided key.

---

## 7. Status

**Owner Control Gate, open.** This document adds evidence and changes nothing. The decision
needs the §5 inventory first, and the inventory needs access this stream does not have.
