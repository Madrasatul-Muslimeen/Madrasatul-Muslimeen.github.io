# Hadith — stable reference and import schema

- **Version:** v1 (document version, not the application version)
- **Date:** 2026-09-18
- **Gate:** H1
- **Status:** **PROPOSED.** Nothing here is implemented. §2 touches a permanent Study Unit key and is therefore an **Owner Control Gate** — it is written to be decided, not applied.
- **Application version:** 08.25, unchanged. This tranche adds no `app/` code.

---

## 1. The seven record types

Taken from the Master Plan §3.2 and kept in its order. Field names are this codebase's camelCase; the commentary attachment schema keeps the Source Register's own snake_case, because that vocabulary is bound to that document.

| Record | Identity | Essential fields |
|---|---|---|
| `Collection` | `collectionId` — permanent, minted, never a name | `nameAr`, `nameTranslit`, `nameDisplay` (language-keyed, I11), `compiler`, `tradition`, `provenance` |
| `Edition` | `editionId` — permanent, minted | `collectionId`, `sourceId` (→ source manifest), bibliographic detail, `language`, `revision`, `contentHash`, `rightsStatus`, `numberingScheme` |
| `BookChapter` | `bookChapterId` — permanent, minted | `editionId`, source-native ids, `title` (language-keyed), `sourceOrder`, `parentId`, `rawHeading` |
| `NarrationOccurrence` | `occurrenceId` — **permanent, minted, opaque** | `editionId`, `bookChapterId`, `sourceOrder`, text segments (`isnad`, `matn`) where supplied, narrator labels, `sourceUrl`, `auditStatus` |
| `ExternalReference` | `externalReferenceId` | `occurrenceId`, `scheme`, `displayedNumber`, `locator`. **Many per occurrence allowed** |
| `TranslationOrCommentary` | own id | `occurrenceId`, `language`, `author`, `provider`, `edition`, `rightsStatus`, verbatim content **or** permitted link, `scope`, attributed grading scholar where present |
| `TopicMapping` | `topicMappingId` | `topicId`, target (`bookChapterId` **or** `occurrenceId`), `rationale`, `reviewStatus`, `reviewer`, `taxonomyRevision` |

**Four separations that must survive into storage**, because collapsing any of them is unrecoverable:

1. **Original source text** is stored apart from normalised search text, apart from derived display text, apart from translations, apart from commentary, apart from user annotations.
2. **A repeat narration is its own occurrence.** Two occurrences are never merged because their text matches. A reviewed `relatedReport` relation may link them; it never replaces either.
3. **A grade is an attributed claim**, carrying the scholar who gave it. It is never rendered as a universal verdict the app itself pronounces.
4. **Classical authorship and modern digital transcription are separate rights questions.** A 15th-century commentary being out of copyright says nothing about a particular website's typeset edition of it.

---

## 2. Narration-occurrence identity — the proposal that resolves C2

### 2.1 What is wrong today

`app/js/unit-keys.js` carries, since Phase 3:

```js
hadith: (collectionName, number) => `hadith:${collectionName}:${number}`
```

with `"hadith:bukhari:5678"` as its own worked example. Three faults, all real:

- It keys by a **collection name**. I5 — stated in that very file's header — is *"units are keyed by permanent ID, never by name."*
- It keys by an **edition-specific displayed number**, which is exactly the cross-edition inference the Master Plan forbids.
- It **cannot express a repeat occurrence**: two occurrences of one numbered narration collapse to a single key.

### 2.2 The proposal, and why it costs almost nothing

**Keep the key's SHAPE exactly as it is. Change only what its two segments MEAN.**

```
hadith:<editionId>:<occurrenceOrdinal>
```

- `editionId` — a permanent minted id from the Edition registry, e.g. `bk1422h`. Never a name, never a slug of one.
- `occurrenceOrdinal` — the occurrence's position in that edition's own source order. Fixed for a fixed edition, and distinct for every repeat.

The displayed number a reader recognises — "Bukhārī 1" — moves to `ExternalReference`, where several numbering schemes can coexist and none of them is identity.

**Why this is unusually cheap, measured rather than assumed:**

| Check | Result |
|---|---|
| Does it match the accepted shape regex `/^hadith:[A-Za-z0-9_-]+:\d{1,6}$/` in `study-note-binding.js`? | **Yes, unchanged** |
| Does ADR-009's `sourceKind` derivation change? | **No** — still `hadith-unit` |
| Does `records.js` / `claimStatus()` change? | **No** — unit-type agnostic |
| Does `chunkKeyFor()` change? | **No** — `hadith` already chunks per subject (D12) |
| How many study screens produce a `hadith:` key today? | **Zero.** The only application call site is `app/records.html:279`, a manual admin form |

So the change is: rename two parameters, document what they mean, and stand up the Edition and ExternalReference registries beside them. **No accepted contract, regex, ADR or shared function needs amending.**

### 2.3 What it still costs, stated plainly

- **It is still an Owner Control Gate.** Re-interpreting an existing permanent key is a change to a permanent Study Unit key, whatever its shape.
- **Any pre-existing `hadith:bukhari:1` record in production would become unresolvable** — legible, never destroyed (I4), but pointing at no edition in the registry. Whether any such record exists **cannot be checked from here**; it needs a read of live Firestore and is the first prerequisite of H2.
- **`occurrenceOrdinal` is capped at six digits** by the existing regex — 999,999 occurrences per edition. Far beyond any real collection. Recorded so nobody rediscovers it.

### 2.4 The alternative, and why it is not recommended

A fully opaque `hadith:<occurrenceId>` (e.g. `hadith:hn_0f3a91c2`) is closer to the Master Plan's literal wording, *"internal opaque ID"*. It is **not** recommended, for one reason: it **breaks the accepted shape regex**, which would force an amendment to `study-note-binding.js` — an ADR-009 file on the shared, frozen list. §2.2 achieves the same identity guarantees while touching nothing shared. The opaque `occurrenceId` still exists; it is simply the `NarrationOccurrence` record's own primary key rather than the thing embedded in the unit key.

---

## 3. The rights model — fail closed

Three states, canonical per Start Prompt v03: **`blocked`** → **`link-only`** → **`embed-cleared`**.

**The default is `blocked`, and that is the load-bearing decision of this whole tranche.** The Source Register states it: *"The absence of a displayed license is not permission to copy the content."* A source with no recorded decision must therefore DENY, not permit. A source reaches `embed-cleared` only through a recorded grant carrying a date, a granting party and citable conditions — never through a reviewer's impression that reuse is probably fine.

| State | May store the locator and link out | May store, display, index or cache text |
|---|---|---|
| `blocked` | No | No |
| `link-only` | Yes | **No** |
| `embed-cleared` | Yes | Yes, bounded by the grant's own conditions |

**As of today, `importAuthorisation.textImportAuthorisedForAnySource` is `false` and `approvedEditions` is empty.** Every H2 surface must therefore run on clearly-labelled synthetic fixtures. That is the approval gate holding, not a limitation to route around.

---

## 4. Two views over one corpus

**Neither view owns the narration. The source view owns ORDER; the topic view owns MEMBERSHIP.**

1. **Original collection view** — Collection → Book/Kitāb → Chapter/Bāb (a level that may legitimately be absent) → occurrence. Source order, headings, repeats, text and edition numbering are all preserved. Where an edition supplies a title or number, the view says which edition.
2. **Unified topic view** — an editorial taxonomy (beginning with **Ṣalāh**) pointing at source chapters and, where needed, individual occurrences. Source headings stay visible beside the mapped topic.

Three rules this project must not lose:

- A topic is an **additional index**, never a rewritten source book.
- An occurrence may carry **many topics**.
- **Similarly titled chapters are never automatically treated as equivalent.** Equivalence is a reviewed claim carrying a reviewer and a date.

**Progress binds to the stable source unit, never to topic membership** — topic membership can change, and a claim that moved when an editor re-filed a topic would be a claim the app silently rewrote. A topic-scoped view therefore stores the `taxonomyRevision` it was computed under, so a later reader can tell whether a count was taken before or after a re-filing.

---

## 5. Import manifest — what every import run must emit

Per Master Plan §3.2 and §3.3, an import that emits no manifest is not reproducible and is not acceptable.

| Field | Purpose |
|---|---|
| `sourceId`, `editionId`, `revision` | What was imported |
| `sourceChecksum` | What the source looked like at the time |
| `rowCounts` | Per collection, book and chapter |
| `missingIds`, `duplicateIds` | The two failure modes that silently corrupt an ordered corpus |
| `sourceOrderVerified` | Whether order survived the round trip |
| `sampleVerified` | Exact text and headings of a human-checked sample |
| `unicodeNormalisation`, `vocalisationPreserved` | Arabic is destroyed quietly by the wrong normalisation |
| `knownOmissions` | Recorded, never discovered later |
| `reviewer`, `reviewDate`, `reviewStatus` | Who signed it |

Large collections paginate and index rather than loading whole — the load-speed contract binds Hadith exactly as it binds Quran. Search must distinguish original from normalised forms, and must cover Arabic, English and Bangla wherever a licensed translation exists. **An unavailable language shows a clear fallback label. A translation is never fabricated to fill a gap.**

---

## 6. What this schema does NOT decide

- **No source, collection or edition is approved.** That is the owner's decision at H1's own gate, and the Master Plan places it there deliberately.
- **No Hadith Approach ids are allocated.** `APPROACH_TEMPLATES` is hardcoded to Quran (`catalogue.js:211`), so Hadith needs its own set — and the Master Plan is explicit that Quran Approach numbers must not be borrowed. The inventory is H2 work.
- **No change is made to `unit-keys.js`.** §2 is a proposal awaiting the gate.
- **The Note and MMJ surfaces are not specified**, because their Firestore Rules are undeployed and every write they make would be denied today (H0 §5, contradiction C4).
- **Whether "Hadith Reflection" needs a fourth MMJ folder role** is untouched — ADR-010 closes that vocabulary and names a fourth role an Owner Control Gate (H0 §4.1).
