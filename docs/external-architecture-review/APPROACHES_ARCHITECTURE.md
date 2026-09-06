# Document 1 — Approaches Architecture

QuranRevival v08.00 · read-only analysis of the live codebase
Repository: `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`, folder `app/`

Everything below was read out of the code in this repository. Where a number is
given it was counted, not remembered.

---

## 1. Where Approaches are defined

An Approach is **not** a first-class type in this codebase. It is a row in a
generic collection called **`trackables`**. "Approach" is the word the Quran
module's UI uses for a trackable whose `subjectId` is `"quran"`.

There are exactly two places an Approach exists:

| Layer | Location | What it is |
|---|---|---|
| Platform master data | `app/js/catalogue-data.js` → `APPROACH_TEMPLATES` | The 30 Approaches as a hard-coded JavaScript array. Not a Firestore read. |
| Per-tenant live data | Firestore `trackables/{tenantId}__{trackableId}` | A copy-on-write copy of the template, seeded from the array above. This is what the running app actually reads. |

The seeding step that turns one into the other is
`ensureTenantCatalogueSeeded()` in `app/js/catalogue.js` (line 141). It is an
**explicit admin action** on `app/catalogue.html`, deliberately not part of app
startup (load-speed contract).

## 2. Exact file paths

```
app/js/catalogue-data.js          APPROACH_TEMPLATES (line 217), SECTION_NAMES (line 203),
                                  TOPIC_TRACKABLE_TEMPLATES (line 360)
app/js/catalogue.js               ensureTenantCatalogueSeeded() line 141,
                                  getTrackables() line 300,
                                  syncUnneditedTrackableNames() line 318,
                                  setTrackableStatus() line 531
app/catalogue.html                the only admin UI that edits/archives a trackable
app/quranrevival.html:5468        where quranTrackables[] is filtered into existence
app/js/way-modal.js               the per-Approach Track/Guide/Breakdown/Coverage card
firestore.rules                   trackables read/write rules
```

## 3. Number of Approaches currently implemented

**30.** Counted directly from the array:

```
$ grep -c 'id: "approach_' app/js/catalogue-data.js
30
```

They are grouped into **7 sections** (`SECTION_NAMES`, `catalogue-data.js:203`).

A tenant may additionally carry **9 non-Quran trackables** from
`TOPIC_TRACKABLE_TEMPLATES` (`studied_deen`, `studied_arabic`, `studied_hadith`,
`studied_general`, `studied_naturelife`, `studied_lifeskill`, `practised_health`,
`practised_ldog`, `studied_asma`). These are **not** Approaches — they have
`subjectId: null` and belong to other modules — but they live in the same
`trackables` collection and are returned by the same `getTrackables()` call.
The Quran screen filters them out (see §7 below).

## 4 & 5. Approach IDs and names

IDs are `approach_01` … `approach_30`, zero-padded, permanent (I5 — keyed by ID,
never by name).

| ID | Order | Section | English name |
|---|---|---|---|
| approach_01 | 1 | 1 | Reading (with Tajweed) |
| approach_02 | 2 | 1 | Hifz / Memorising |
| approach_03 | 3 | 1 | Reading (with Meaning) |
| approach_04 | 4 | 1 | **Reading — Word-by-Word Meaning** |
| approach_05 | 5 | 1 | Arabic Writing |
| approach_06 | 6 | 1 | **Language Learning (Basic Grammar)** |
| approach_07 | 7 | 2 | Listening Attentively (Arabic only) |
| approach_08 | 8 | 2 | Listening Attentively (Arabic with meaning) |
| approach_09 | 9 | 2 | Dua Memorising |
| approach_10 | 10 | 2 | Journaling |
| approach_11 | 11 | 2 | Ruqyah Listening |
| approach_12 | 12 | 2 | Calligraphy |
| approach_13 | 13 | 2 | Story Learning |
| approach_14 | 14 | 3 | Beginner's Level — Observation (Nazar) |
| approach_15 | 15 | 3 | Primary Level — Common Sense ('Aql / Ta'aqqul) |
| approach_16 | 16 | 4 | Deriving Dua |
| approach_17 | 17 | 4 | Deriving Names & Attributes of Allah |
| approach_18 | 18 | 4 | Deriving Understanding of the Prophets |
| approach_19 | 19 | 4 | Reflecting on the Miracles |
| approach_20 | 20 | 5 | Intermediate Level — Reflecting / Pondering (Tafakkur) |
| approach_21 | 21 | 5 | Advanced Level — Deep Contemplation (Tadabbur) |
| approach_22 | 22 | 5 | Higher Level — Understanding / Fiqh (Tafaqquh) |
| approach_23 | 23 | 5 | Upper Higher Level — Dhikr / Tadhakkur |
| approach_24 | 24 | 6 | Mastery Level — Where Fiqh turns to Ruling (9:122 pivot) |
| approach_25 | 25 | 6 | Judgment (Fahm) |
| approach_26 | 26 | 6 | Authority — Hukm / Tahakum |
| approach_27 | 27 | 7 | Group / Class Discussion |
| approach_28 | 28 | 7 | Living by it (Self-Assessment) |
| approach_29 | 29 | 7 | Da'wah — Sharing Knowledge / Calling Others |
| approach_30 | 30 | 7 | Teaching Others |

Section names (`catalogue-data.js:203`):

1. Building Foundation / Learning Tools
2. Engagement / Attachment
3. Critical Reasoning: Nazar / 'Aql
4. Critical Reasoning: Applied Threads
5. Critical Reasoning: Tafakkur / Tadabbur
6. Critical Reasoning: Judgement / Authority
7. A'mal / Application

**Two of the 30 are already in the Arabic-learning space** and the reviewer
should treat them as prior art, not as free ground: **approach_04 "Reading —
Word-by-Word Meaning"** (which already declares the `wordByWord` panel) and
**approach_06 "Language Learning (Basic Grammar)"**.

## 6. Approach data structure

**Template shape** (`catalogue-data.js:218`), verbatim:

```js
{ id: "approach_04", order: 4, section: 1,
  name: nameLang("Reading — Word-by-Word Meaning", "শব্দে শব্দে অর্থসহ পাঠ"),
  guide: {
    what: en("Learning the meaning of each individual Arabic word in a passage."),
    how:  en("Use the word-by-word panel to see each word's meaning underneath it while reading."),
    measure: en("How many of the words in the assigned portion you can translate without the panel.") },
  panels: ["text", "wordByWord"] }
```

`nameLang(en, bn)` produces `{ en: "...", bn: "..." }` — I11, every user-visible
name is language-keyed.

**Stored Firestore document shape** (`catalogue.js:190`), verbatim:

```js
{
  collectionName: TENANT.TRACKABLES,
  docId: `${tenantId}__${t.id}`,          // e.g. "t1__approach_04"
  data: {
    tenantId,
    moduleId: "quranrevival",             // hard-coded for all 30
    subjectId: "quran",                   // hard-coded for all 30
    group:     t.section,                 // 1..7 — the section number
    groupName: t.sectionName,             // {en, bn}
    name:      t.name,                    // {en, bn}
    guide:     t.guide,                   // {what, how, measure}, each {en}
    panels:    t.panels,                  // string[] — which study panels to show
    order:     t.order,                   // 1..30, the wheel/sidebar sort key
    status:    "active",                  // "active" | "archived"
    sourceTemplateId: t.id,               // links the copy back to the template
    edited:    false,                     // true = tenant edited it; stops platform sync
  },
}
```

Plus the envelope every document in this app carries (I17):
`schemaVersion`, `createdAt`, `updatedAt`, `createdBy` — see `app/js/envelope.js`.

**`panels` is the field that decides what the study screen shows.** The full
recognised set is in `app/js/ayah-renderer.js:206`:

```js
const PANEL_ORDER = ["text", "tajweed", "wordByWord", "root", "derivatives",
                     "notes", "reflection", "writing", "checklist"];
```

Note that `root` and `derivatives` **already exist as panels** and already
render real root/lemma/POS data (see Document 8). No Approach template currently
declares them — they are wired but unclaimed.

## 7. Hard-coded, configuration-driven, database-driven, or dynamic?

**All four, in a specific and important arrangement:**

- **Hard-coded** as the platform master list — `APPROACH_TEMPLATES` is a literal
  array in a `.js` file shipped with the app.
- **Database-driven** at runtime — the app reads `trackables` from Firestore and
  never reads `APPROACH_TEMPLATES` on the study screen at all.
- **Configuration-driven** in effect — a tenant can rename and archive its own
  copies, and `edited: true` freezes that copy against future platform changes
  (`syncUnneditedTrackableNames()`, `catalogue.js:318`).
- **Not dynamically generated** — nothing computes an Approach from anything.

The runtime read, verbatim (`quranrevival.html:5452` and `:5468`):

```js
const [rosterSnap, tenantSnap, allTrackables, loadedSurahIndex] = await Promise.all([
  getDocs(query(collection(db, TENANT.TENANT_PEOPLE), where("tenantId", "==", activeTenantId))),
  getDoc(doc(db, TENANT.TENANTS, activeTenantId)),
  getTrackables(db, activeTenantId),
  getSurahIndex(),
]);
...
quranTrackables = allTrackables.filter((t) => t.subjectId === "quran" && t.status !== "archived");
```

**That one line is the whole definition of "the Approaches" as far as the
running app is concerned.** Anything with `subjectId === "quran"` and a
non-archived status is an Approach, gets a wheel segment, gets a sidebar row,
and gets a Track card. There is no count check, no allow-list, no enum.

`getTrackables()` sorts by `order` (`catalogue.js:305`):

```js
.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
```

## 8. How an Approach connects to Ayah / Range / Ruku / Hizb / Juz / Surah / Whole Quran

**It does not connect to them at definition time at all.** An Approach carries
no unit information whatsoever — no scope, no granularity, no allowed-unit list.

The connection is made **only at the moment of a claim**, by composing two
independent strings into one map key inside a records document
(`app/js/records.js:160`):

```js
const entryKey = `${unitKey}::${trackableId}`;
```

So the Approach↔unit relationship is a **free cross-product, created lazily**.
Concrete real keys:

```
ayah:2:255::approach_04          Word-by-Word Meaning, on Ayat al-Kursi
surah:1::approach_02             Hifz, on the whole of Surah al-Fatihah
range:2:1-5::approach_03         Reading with Meaning, on Surah 2 ayahs 1–5
ruku:2:1::approach_01            Reading with Tajweed, on Surah 2's first ruku'
juz:30::approach_07              Listening Attentively, on Juz 30
hizb:60::approach_08             Listening with meaning, on Hizb 60
page:qpc-hafs:604::approach_01   Reading with Tajweed, on Mushaf page 604
```

The seven Quran unit types are built by `buildUnitKey` in
`app/js/unit-keys.js:20`. **"Whole Quran" is not a claimable unit** — there is no
`buildUnitKey.quran`. Whole-Quran is a *view* in Explore, computed by pooling,
never a stored claim. (`UNIT_TYPE_LABELS` does carry a `book: "Qur'an"` label at
`unit-keys.js:75`, but nothing constructs a `book:` key.)

Which physical document a claim lands in is decided by `chunkKeyFor()`
(`records.js:52`), covered in Document 2.

## 9. How a new Approach would technically be added

**There is no "Add Approach" button anywhere in the application.** This was
checked directly: `app/catalogue.html` offers exactly three trackable actions —
`guideBtn` (show/hide guide text), `editTrkBtn` (rename), and `archiveTrkBtn`
(archive/restore). There is no create path, and `app/js/catalogue.js` exports no
create-trackable function (`getTrackables`, `syncUnneditedTrackableNames`,
`setTrackableStatus` — that is the whole trackable API surface).

So adding an Approach is a **code change plus a re-seed**:

1. Append an object to `APPROACH_TEMPLATES` in `app/js/catalogue-data.js`, with
   a new permanent `id`, an `order`, a `section`, `name` (en + bn), `guide`
   (what/how/measure), and `panels`.
2. Add its Bangla strings to `app/js/i18n/bn.js` if any new UI text comes with it.
3. Deploy. On the next run of **catalogue.html → seed**, `ensureTenantCatalogueSeeded()`
   diffs templates against existing rows and creates only the missing ones
   (`catalogue.js:160`), so it is safe to re-run and safe on tenants that
   already seeded.
4. Every tenant that wants it must run that seed. It is not automatic.

The diff logic that makes step 3 safe, verbatim (`catalogue.js:160`):

```js
const missingTrackables = APPROACH_TEMPLATES.filter((t) => !existingTrackableIds.has(t.id));
```

**Consequence for the reviewer:** adding an Approach is cheap in code but is a
**per-tenant admin action**, not a deploy-and-done. There is no migration
runner.

## 10. Every file that would likely need modification

Adding one or more new Approaches, in dependency order:

| File | Why | Risk |
|---|---|---|
| `app/js/catalogue-data.js` | The new template row(s) | **Low** — additive array append |
| `app/js/i18n/bn.js` | Bangla for any new name/guide string | Low |
| `app/js/ayah-renderer.js` | Only if a **new panel type** is needed; `PANEL_ORDER` + `PANEL_RENDERERS` (line 206/213) | **Medium** — a panel name not in the map renders nothing, silently |
| `app/quranrevival.html` | Only if the new Approach needs study-screen UI that does not exist | **High** — 12,027 lines, no build step, no tests |
| `app/js/catalogue.js` | Not needed for an addition. Needed only if the trackable **document shape** changes | High |
| `firestore.rules` | Not needed. `trackables` rules are shape-agnostic | — |
| `app/js/records.js` | **Not needed** for a new Approach. Needed only if a new **unit type** is introduced | High |
| `app/js/mastery-wheel.js` | Not needed — it renders whatever array it is handed | — |

**A plain new Approach touches one file.** That is the single most important
structural fact in this document.

## 11. Can an Approach currently contain sub-levels, sub-tracks, or independently tracked child items?

**No. There is no parent/child, level, track, or nesting concept on a trackable
anywhere in this codebase.**

Verified by enumerating every field on the stored document (§6): `tenantId`,
`moduleId`, `subjectId`, `group`, `groupName`, `name`, `guide`, `panels`,
`order`, `status`, `sourceTemplateId`, `edited`. There is no `parentId`, no
`children[]`, no `levels[]`, no `trackIds[]`.

Two things look like nesting and are not:

- **`group` / `groupName`** (the 7 sections) is a **flat one-level tag used for
  display grouping only**. It has no records meaning: `group` never appears in a
  unit key, never appears in an entry key, and nothing aggregates by it. A
  section cannot be claimed, cannot hold a status, and does not appear in
  Explore.
- **`subjects`** *does* have real hierarchy — `parentId` plus `ancestorIds[]`
  with roll-ups counted through it (I12), `catalogue.js:180`. But QuranRevival's
  entire subject tree is the **single leaf `"quran"`**; all 30 Approaches hang
  off that one node. The hierarchy machinery exists, and Quran does not use it.

**However**, and this is the finding that matters most for Options B and C: the
records key is `${unitKey}::${trackableId}`, and **`trackableId` is an opaque
string that nothing parses**. Confirmed — the only code that ever splits an
entry key splits on `::` and takes `[0]` (the unit key) and `[1]` (the trackable
id) whole:

```js
// quranrevival.html, buildExploreWiderSpans()
const [unitKey, trackableId] = key.split("::");
```

Nothing anywhere does `trackableId.split(":")` or inspects its interior. So a
**compound trackable id is storable today with no schema change at all** — an
id like `approach_31_L1` is just another string, and a claim on it gets its own
independent `claimedStatus`, `confirmState`, `confirmedStatus`, `confirmedAt`
and `confirmedByPersonId`. See Document 3 §14 and Document 11 for what that does
and does not buy.

## 12. Is Approach numbering technically significant?

**Partly. Three distinct things are being numbered and only one of them matters.**

| Thing | Where | Significant? |
|---|---|---|
| `order` (1–30) | `trackables.order` | **Yes, functionally.** `getTrackables()` sorts by it (`catalogue.js:305`); that sort decides wheel segment position and sidebar row order. Ties fall back to Firestore's own order — undefined. |
| The `_NN` inside the id | `approach_04` | **No.** Nothing parses the id. It is a plain string. |
| `group` (1–7) | `trackables.group` | **No, not for records.** Display grouping only. |

`order` is **not required to be dense, unique, or to start at 1** — it is a sort
key with a `?? 0` fallback (`catalogue.js:305`). Duplicate `order` values are
allowed by the code and produce a non-deterministic wheel order, which is worth
knowing before assigning numbers to new Approaches.

## 13. Does the application assume exactly 30 Approaches anywhere?

**No. Checked directly, and the answer is a clean no in code and a qualified no
in copy.**

**In code — nothing assumes 30.** Every consumer is length-generic:

```js
// app/js/mastery-wheel.js, renderScopedWheel()
const n = items.length || 1;
const anglePer = 360 / n;
```

The wheel divides the circle by however many items it is handed. The sidebar
(`renderWheelSidebar`) maps over the array. `approachStatusesForCurrentUnit()`
maps over `quranTrackables`. `renderExploreApproachList()` maps over the same.
There is no constant, no assertion, no slice, no `length === 30` check anywhere.

**One near-miss worth flagging so the reviewer does not misread it:**

```js
// app/quranrevival.html:4365
const SURAH_WHEEL_THRESHOLD = 30; // matches index.html's own confirmed threshold
```

This is **not** about Approaches. It is an *ayah-count* threshold deciding when
Explore switches a long surah's presentation. Unrelated.

**In copy — one visible string does assume it.** `app/quranrevival.html:2625`:

```html
<span class="wheel-intro-capsule">Approach the Quran in 30 ways</span>
```

This is the gold capsule above the Mastery Wheel, plus its Bangla counterpart in
`app/js/i18n/bn.js`. **Any option that changes the Approach count makes this
caption factually wrong on screen.** It is a copy edit plus a translation key —
trivial work, but it is a real user-visible consequence and it is the only one.

**Practical scaling note, measured by the project itself** (`quranrevival.html:575`,
a comment recording a real measurement): *"with a real 30-Approach tenant (not
the 10-item test [fixture])... 30+ Approaches now scroll inside the card"*. So a
30-segment wheel is already at the edge of what reads well at phone width. The
project's own standing lesson is that layout must be re-measured at eight
viewports in both languages whenever anything is added to that screen. **A wheel
at 31, 32 or 33 segments is a layout question that must be measured, not a code
question.** It will not break; it may not read.
