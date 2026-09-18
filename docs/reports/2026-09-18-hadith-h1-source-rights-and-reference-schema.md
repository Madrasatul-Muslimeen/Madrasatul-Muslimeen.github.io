# Hadith Study — H1 source manifests, rights gate and reference schema

- **Date:** 2026-09-18
- **Gate:** H1 (data and commentary source manifests, exact edition/permission status, stable reference and import schema)
- **Branch:** `feature/hadith-study`, cut from `origin/main` at **`d8f0492`**, in its own worktree at `/home/user/hadith-study`
- **Blast radius:** **BR-0.** No file under `app/` changed — `git diff -- app/ firestore.rules firebase.json` is empty. Four new files: three under `docs/governance/`, one under `tools/i18n-verify/`.
- **Application version:** **08.25, unchanged.** This tranche adds no application code and changes no behaviour. Deliberate — see §6.
- **Result:** H1 delivered. **Zero sources are cleared for text import, and that fact is now enforced by a guard rather than asserted in prose.** 14 checks pass; 7 deliberate mutations each fail the right check.

---

## 1. Isolation, as instructed

The Start Prompt requires a separate worktree on a `feature/hadith-study` branch from a verified current base, on a different filesystem path from the Quran builder's checkout. Done, and verified:

```
/home/user/Madrasatul-Muslimeen.github.io   [claude/beautiful-darwin-faeim7]   ← Quran line
/home/user/hadith-study                     [feature/hadith-study]             ← this work
```

The base is `origin/main` at `d8f0492`, v08.25 — fetched and verified in this session, not assumed. The H0 report was carried across by cherry-pick so the Hadith branch holds its own record of the audit it came from.

---

## 2. What was delivered

| File | What it is |
|---|---|
| `docs/governance/hadith-source-manifest-2026-09-18.json` | Four candidate sources, each with established facts, outstanding questions, a rights state and an explicit permission set |
| `docs/governance/hadith-commentary-manifest-2026-09-18.json` | The two verified commentary matches, `HCM-0001` and `HCM-0002`, in the Source Register's own field names |
| `docs/governance/hadith-reference-and-import-schema-v1.md` | The seven record types, the narration-occurrence identity proposal, the rights model, the two-view model, and the import manifest every import run must emit |
| `tools/i18n-verify/hadith-source-rights.mjs` | The guard — 14 checks, run from the repository root |

**No source text of any kind was fetched, imported, cached or committed.** No request was made to sunnah.com, islamweb.net, OpenITI or HadeethEnc in this session. The two islamweb URLs appear only as citations inside the commentary manifest, exactly as the Source Register records them.

---

## 3. The rights model — fail closed, and why that is the whole tranche

Three states, canonical per Start Prompt v03: **`blocked`** → **`link-only`** → **`embed-cleared`**.

**The default is `blocked`.** This is the load-bearing decision, and it comes straight out of the Source Register's own sentence: *"The absence of a displayed license is not permission to copy the content."* If that is true, then a source with no recorded decision must **deny**. Anything else quietly turns "nobody has checked yet" into "probably fine".

A source reaches `embed-cleared` only through a recorded grant carrying a date, a granting party and citable conditions. A reviewer's confidence is not a grant, and the guard will not accept one.

| Source | State | Why |
|---|---|---|
| Sunnah.com | `link-only` | API covers a portion of the data, needs a key, no offline dump. API access conveys no reuse right |
| Islamweb library | `link-only` | Two pages verified to contain the stated Hadith and commentary. Edition, transcription rights and bulk reuse all unestablished |
| OpenITI RELEASE | `blocked` | Never examined. Whether relevant editions even exist there is unknown |
| HadeethEnc | `blocked` | Never examined. Not a full original-collection corpus |

**A `blocked` source denies every permission — including linking to it.** The manifest first gave blocked sources `mayStoreLocator` and `mayLinkOut`, which contradicted the schema document's own table. Caught while writing the guard, and resolved in the stricter direction: a source nobody has examined should not be referenced on a user-facing surface at all.

### 3.1 A vocabulary conflict between the two governing documents, resolved

Master Plan v01 §3.3 names the states `licensed`, `link-only`, `blocked`. Start Prompt v03 §6, one day newer, names them `link-only`, `embed-cleared`, `blocked`. **The Start Prompt's three are used as canonical**, with `licensed → embed-cleared` recorded as the mapping.

The reason is not just recency. **`embed-cleared` states what the app is permitted to DO; `licensed` states something about the source** — and a source can carry a real licence that still does not permit embedding in this app. The verb is the safer name, because it is the one a builder has to satisfy.

---

## 4. The finding worth keeping: neither verified match can name a narration occurrence yet

`HCM-0001` and `HCM-0002` both have `narration_occurrence_id: null`, and **that is correct rather than unfinished.**

An occurrence id is minted from an **approved edition**. No edition is approved. So there is no occurrence for a commentary to point at. What each match is genuinely bound to today is an **external reference** — a scheme (`sunnah.com`) plus a displayed number (`bukhari:1`) — which is precisely the distinction the Master Plan insists on:

> *"never infer cross-edition equivalence from a number alone"*

Writing `narration_occurrence_id: "hadith:bukhari:1"` would have felt like progress and would have committed that forbidden inference permanently into data. **The plan's identity rule showed up in the first two rows of real data, before any code existed to violate it.** The guard now refuses a non-null occurrence id while `approvedEditions` is empty.

---

## 5. The narration-occurrence key — H0's contradiction C2, resolved as a proposal

H0 reported that `buildUnitKey.hadith(collectionName, number)` keys a narration by the collection's **name** (against I5) and by an **edition-specific displayed number** (against the plan). The schema document's §2 proposes the fix:

> **Keep the key's shape exactly as it is. Change only what its two segments mean.**
>
> `hadith:<editionId>:<occurrenceOrdinal>`

Measured, not assumed:

| Check | Result |
|---|---|
| Matches the accepted shape regex in `study-note-binding.js`? | **Yes, unchanged** |
| ADR-009 `sourceKind` derivation changes? | **No** |
| `records.js` / `claimStatus()` / `chunkKeyFor()` change? | **No** |
| Study screens producing a `hadith:` key today? | **Zero** — the only app call site is `records.html:279`, a manual admin form |

So the whole correction is: rename two parameters, document their meaning, and stand up the Edition and ExternalReference registries. **No accepted contract, regex, ADR or shared function needs amending.**

**It remains an Owner Control Gate and nothing was applied.** `unit-keys.js` is byte-for-byte untouched. Two costs are stated rather than discovered later: any pre-existing `hadith:bukhari:1` record in production would become unresolvable (legible, never destroyed — I4), and the existing regex caps an edition at 999,999 occurrences.

**Whether any such record exists cannot be checked from here.** It needs a read of live Firestore. **That is the first prerequisite of H2.**

---

## 6. Why the version did not move

The Start Prompt says to increment the application version in every tranche that changes app code or behaviour, and that documentation-only work may retain it. The repository's own convention calls a tranche BR-0 — no bump — when nothing is reachable from a page.

H1 was deliberately scoped so both rules agree: **manifests and a schema document under `docs/governance/`, plus a guard under `tools/`. No `app/` code at all.** Had a pure module landed in `app/js/`, the two authorities would have pointed different ways over a module no screen can reach. Application code lands in H2, with a version bump.

---

## 7. Evidence

`node tools/i18n-verify/hadith-source-rights.mjs` — **14 passed, 0 failed, exit 0**, run from the repository root.

Two of the fourteen are positive controls, because a guard whose loader silently read nothing passes every case vacuously: one asserts both manifests really loaded and carry rows; the other asserts the `rightsRefusal()` rule that does the real work can actually refuse — a sound source passes, an ungranted `embed-cleared` fails, a text-storing `link-only` fails, an invented state fails.

**The guard also failed for real while being written**, which is how its last check earned its keep: it asserted the schema document still states that the default denies, and the document said so inside a differently-emphasised sentence. Tightened to match the claim rather than the markdown.

### 7.1 Mutation testing — 7 of 7 caught, each by the right check

Run against copies in a scratch directory; the committed manifests were never modified.

| # | Mutation | Caught by |
|---|---|---|
| M1 | A source promoted to `embed-cleared` with no grant | every source is sound against the rights rule |
| M2 | A commentary row given a `narration_occurrence_id` | no row claims an occurrence while no edition is approved |
| M3 | A link-only row given a `text_hash` | no commentary text captured while nothing is embed-cleared |
| M4 | Ibn Ḥajar and al-Nawawī swapped between collections | the two matches stay DISTINCT records |
| M5 | `defaultRightsState` changed to `link-only` | the default denies |
| M6 | A link-only source given `mayStoreText` | every source is sound against the rights rule |
| M7 | The display contract's prohibitions gutted | an explanation never passes as the Hadith's own words |

M4 is the one worth naming. Swapping the two scholars leaves a manifest that parses, validates and looks entirely plausible — and attributes each scholar's commentary to the wrong collection. It is caught because the guard reads the pairing out of the Source Register rather than trusting the file.

---

## 8. What H1 did NOT do

- **No source, collection or edition was approved.** That is the owner's decision, and the Master Plan places it at exactly this gate. §9.
- **No text was fetched or imported** from any source.
- **`unit-keys.js` was not touched.** §5 is a proposal behind an Owner Control Gate.
- **No Hadith Approach ids were allocated.** `APPROACH_TEMPLATES` is hardcoded to Quran (`catalogue.js:211`); the inventory is H2 work and must not borrow Quran numbers.
- **No Note or MMJ surface was specified**, because their Firestore Rules are undeployed and every write would be denied today (H0 §5, contradiction C4).
- **Nothing was merged, deployed or published.** `firestore.rules`, `firebase.json` and every Rules and index candidate are byte-for-byte untouched.

---

## 9. What H2 needs before it can start

Three things, in order:

1. **A read of live Firestore for any existing `hadith:` unit key.** Blocks §5's proposal from being safe to apply. Needs access this gate does not have.
2. **The owner's source and edition decision** — which collection, which edition, which languages. Until then H2 runs entirely on clearly-labelled synthetic fixtures, which the Master Plan explicitly permits and which the guard now enforces.
3. **Acknowledgement that H2's Note and MMJ half is blocked** on the existing Firebase Console deployment gate, which Hadith cannot clear.

**H2 can begin without 1 and 2** — on synthetic fixtures, building the collection browse, the Ṣalāh topic index, search, the Track adapter and the Classical Explanations panel with its two outbound links. That is what the Source Register's own handoff anticipates: *"Claude can implement the schema and two outbound links immediately with synthetic/local fixture records."*
