# Hadith Approach registry — PROPOSAL for Master Architect review

**Date:** 2026-09-18 · **Gate:** H2-B · **Status:** **PROPOSAL ONLY — NO ID IS ALLOCATED BY THIS DOCUMENT.**

The H2-B instruction requires an audit of `APPROACH_TEMPLATES`, the `studied_hadith`
row and the Approach/Track/Explore contracts, and an explicit proposed registry and
number/ID mapping — while forbidding permanent Hadith Approach IDs and any reuse of
Quran numbers in this tranche. Nothing here is seeded, written or referenced by any
running code. It is a decision document.

---

## 1. Audit — what exists today, read from the code

| Fact | Evidence |
|---|---|
| **30 Approaches exist**, ids `approach_01` … `approach_30`, in 7 sections | `app/js/catalogue-data.js:222` — `APPROACH_TEMPLATES`, 30 entries, `section` 1–7 |
| **They are bound to Quran at SEED time, not in the template** | `app/js/catalogue.js:190-206` writes every one with `moduleId: "quranrevival"`, `subjectId: "quran"`, hardcoded |
| The template itself carries **no `moduleId` and no `subjectId`** | measured: both sets empty across all 30 |
| **Hadith has exactly ONE trackable, and it is not an Approach** | `TOPIC_TRACKABLE_TEMPLATES` → `studied_hadith`, `moduleId: "hadith"`, `subjectId: null`, name **"Studied"** |
| Eight other modules carry the same generic shape | `studied_deen`, `studied_arabic`, `studied_general`, `studied_naturelife`, `studied_lifeskill`, `practised_health`, `practised_ldog`, `studied_asma` |
| **`app/hadith-study.html` tracks against that generic row** | `initTopicStudyPage({ moduleId: "hadith", trackableId: "studied_hadith", rootSubjectId: "hadith" })` |
| **The corpus component claims no Approach whatsoever** | grep of `hadith-browser.js` and `hadith-corpus.js` for `approach_`, `Approach`, `studied_hadith` returns **nothing** |

**So the honest statement of today's position:** Hadith has a single binary "Studied"
trackable and **no Approach model at all**. `studied_hadith` is a module-wide progress
row, not an approved Approach, and nothing in this tranche presents it as one.

**This is the pre-existing open design question the standing brief already records** —
"claiming/confirming only works for the Quran subject today, because Approaches exist
only for Quran" — which the Owner has ruled should wait. This document does not reopen
it; it scopes the Hadith-specific part so the decision is ready when it is wanted.

---

## 2. The ID question — and why `approach_NN` must NOT be reused

Reusing a Quran Approach number for Hadith is **refused by this proposal**, on three
grounds that are facts about the code rather than preferences:

1. **A trackable id is a document id.** `catalogue.js:192` writes `${tenantId}__${t.id}`,
   so `approach_07` is one document per tenant. A Hadith "Approach 7" would either
   collide with the Quran document or need a second document under the same id — the
   first is impossible, the second is a rename.
2. **Claims are keyed by `trackableId` (I5).** A record entry naming `approach_07`
   already means "Listening, on Quran". Pointing the same id at a Hadith narration
   would silently reinterpret existing Quran claims.
3. **The seed hardcodes `subjectId: "quran"`** on every `approach_NN`. A Hadith
   Approach carrying that id would inherit the wrong subject or need the seed
   branched per module.

**Proposed scheme, for review:** `hadith_approach_NN`, minted in its own namespace,
seeded with `moduleId: "hadith"` and `subjectId: "hadith"`, in its own template list
(`HADITH_APPROACH_TEMPLATES`) rather than folded into `APPROACH_TEMPLATES` — the same
separation `TOPIC_TRACKABLE_TEMPLATES` already uses and for the same stated reason.
**No number in that scheme is allocated here.**

---

## 3. Proposed registry — candidate Approaches, UNNUMBERED

Deliberately presented as a list of **candidates with no ids**, ordered only for
reading. Each names the Quran Approach it is analogous to, so the Master Architect can
see where the two models converge and where Hadith genuinely differs.

| Candidate | What it would mean for a narration | Quran analogue | Note |
|---|---|---|---|
| Reading the Arabic | Reading the matn accurately in Arabic | Reading (with Tajweed) | Tajweed rules are a Qur'anic discipline; the Hadith form is plain accurate reading, so this is an **analogue, not the same Approach** |
| Reading with meaning | Matn alongside an attributed translation | Reading (with Meaning) | Direct analogue. Needs the translation-attribution model H1 already defines |
| Memorising | Committing a narration to memory | Hifz / Memorising | Direct analogue |
| Understanding the chain | Reading the isnād and who is in it | *(none)* | **Hadith-only.** No Quran Approach corresponds; this is the clearest case that Hadith needs its own set |
| Grading and authenticity | Working with the narration's grade | *(none)* | **Hadith-only, and gated** — no grade exists in the repository, and none may be invented. Depends on a rights-cleared edition |
| Classical explanation | Reading a commentary on the narration | *(none directly)* | Today this is an **outbound link only** (Ibn Ḥajar, al-Nawawī). Embedding commentary text is a separate rights gate |
| Acting on it | Putting the narration into practice | Acting on what is learned | Analogue if that Quran Approach is the intended pairing — **to be confirmed, not assumed** |
| Topic study | Following a topic across collections | *(none)* | The Ṣalāh topic index already models the data for this |

**Eight candidates, no ids, no order committed.** The count is not a proposal either —
Hadith is not obliged to have 30, and "the 30 Approaches" is Quran terminology that
must not be silently extended to another subject.

---

## 4. What must be decided before ANY of this is built

1. **Does Hadith get its own Approach set at all**, or does progress stay the single
   `studied_hadith` row? The second is a legitimate answer and costs nothing.
2. **If its own set: the id scheme** (§2 proposes `hadith_approach_NN`) and whether the
   list is platform-seeded like Quran's or tenant-authored from empty.
3. **Which candidates in §3 survive**, and in what order and sections.
4. **Whether an Approach may exist before a rights-cleared edition does.** Reading,
   memorising and topic study can be described against synthetic fixtures; grading
   cannot be exercised at all without real graded text.

---

## 5. Gates this document does not touch

- **No id is allocated**, no template is added, no seed is changed, and
  `catalogue-data.js` and `catalogue.js` are **not modified** by this tranche.
- **No Quran Approach number is reused or reserved.**
- **Track stays demo-only and in memory.** The corpus component references no
  trackable, no Approach and no `studied_hadith`; it says on screen, every time, in the
  reader's own language, that nothing is saved.
- **No durable Hadith write exists** anywhere in `app/js/hadith-*.js`.
