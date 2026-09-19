# PROPOSAL — a temporary freeze on NEW name-keyed Hadith claims

**19 September 2026 · Hadith Study stream · FOR MMSA PLATFORM REVIEW · NOT APPLIED**

`app/records.html` is a **platform** surface. This proposal is prepared, proven
to apply, and **deliberately left unapplied**. The patch is
`docs/governance/hadith-c2-claim-freeze-records-html-2026-09-19.patch`.

---

## 1. What it does, in one sentence

While gate **C2** is open, the Records form stops offering **Hadith** as a unit
type, so **no new name-keyed Hadith record can be created** — and everything
already recorded stays exactly where it is, still visible, still confirmable.

## 2. Why

`buildUnitKey.hadith` builds `hadith:<collectionName>:<number>` from a name a
person types. `hadith:bukhari:1`, `hadith:Bukhari:1` and `hadith:al-bukhari:1`
are three different **permanent** keys for one narration, which contradicts
**I5**. The key is undecided, and every day it stays undecided the set of keys
that a future decision must reconcile grows. **The freeze does not decide C2. It
stops the problem growing while C2 is decided.**

## 3. What is preserved — established by reading the code, not asserted

| Preserved | Why it cannot be affected |
|---|---|
| **Every stored record** | The freeze touches one `<option>` list. No document, field or key is written, moved or removed |
| **Display of existing Hadith records** | `renderEntries()` reads `chunk.entries` and prints `unitKeyLabel(entryKey.split("::")[0])` — the **stored** key. It never reads the picker |
| **Confirm and Return** | Both act on the stored `chunkKey`/`entryKey` from the rendered row. Untouched, so **I6** is untouched |
| **Reachability of the chunk** | Hadith entries live in `subject_{subjectId}`, and `chunkKeyFor()` sends **every** non-surah-chunked unit type there. Selecting Topic (or Juz, Hizb, Rub, Manzil, Page) with the same subject opens the same document — so the rows remain reachable in the UI |
| **The ability to reverse it** | `buildUnitKeyFromInput()` keeps `case "hadith"`, and `UNIT_HINTS.hadith` and the placeholder stay. Reversing is deleting one `.filter(...)` line |
| **Other modules** | The filter names exactly one unit type. Every other type is offered exactly as before |

**Nothing is deleted, nothing is migrated, nothing is re-keyed.** I4 is not
engaged, because nothing is removed.

## 4. What it costs

- A reader who used to record Hadith claims **can no longer do so** until C2 is
  decided. That is the intended effect.
- The patch adds **one new English sentence**, so the control explains itself
  rather than vanishing — this codebase's own standing lesson, *a control that
  opens and explains itself beats a control that is not there.*
- **That sentence needs its Bangla key in `app/js/i18n/bn.js`**, which is a
  **shared platform file the Hadith stream must not touch**. Adding it is part
  of this review, not of this proposal.

## 5. Two variants

| Variant | Change | Note |
|---|---|---|
| **A — silent** | the `.filter(...)` line only | Smallest possible diff; no new string, no `bn.js` work. **But the option simply disappears with nothing on screen to say why** |
| **B — explaining (recommended, and what the patch contains)** | the filter **plus** one translated sentence under the reference hint | Costs one string in two languages |

Reverting either is deleting the added lines.

## 6. Verification already performed

- The patch **applies cleanly** to the current `app/records.html`
  (`git apply --check`), and the live file is **byte-identical** afterwards
  because it was never applied.
- `unitRefHint` is declared at line 210, **before** the insertion point at ~248,
  so variant B's `insertAdjacentHTML` cannot fail on an undefined element.
- `tools/i18n-verify/hadith-c2-freeze-proposal.mjs` holds all of the above as
  checks, including that the live file is **not** patched.

## 7. What this proposal does NOT do

It does not decide C2, adopt any key form, allocate any Approach id, migrate or
re-key any record, change any Rules, or touch `app/js/i18n/bn.js`. **It is not
applied.** Applying it is the MMSA platform side's decision.
