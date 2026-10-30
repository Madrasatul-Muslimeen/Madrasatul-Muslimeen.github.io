# MSA-DUA Lead: own audit 1 (30 Oct 2026, about 7 pm Sydney)

The Dua queue is empty (J104 ticks 6–10 wait on the Owner), so the Lead audited Dua Study under "Keep working, never idle".
Branch `claude/dua-lead-audit`, from `main` v12.130. Build number: **D05** (titles), fix A1.

## Looked at

`app/dua-study.html` list and Dua Card at 360 (English), 768 (Bangla) and 1440 (English): no sideways scroll, no control
under 32px, screenshots read. Every Dua title in `groups.json` read for cut-off endings.

## Found and fixed

- **A1 (D05).** Dua 2's Bangla title read "সাইয়্যেদুল ইস্তেগফার হচ্ছে" ("Sayyid al-Istighfar is"): HadeethEnc's
  title is the first half of a sentence. `cleanTitle()` in `tools/hadith-data-pull/dua-groups.mjs` now drops a
  dangling হচ্ছে / হলো / হল; the rebuilt `groups.json` differs in exactly that one value
  (now "সাইয়্যেদুল ইস্তেগফার"). The data path is unchanged (QR reads Hadith data there).

## Recorded, not changed

- Dua 2658's Bangla title has a typo from HadeethEnc ("সিকা … দরকারি" for "সিরকা … তরকারি"). It is the source's
  translation; changing source text is not the Lead's to do silently. For the Owner, with tick 10 (a dua's meaning).
- 10 of the 44 titled duas have no Bangla title; a Bangla reader sees the English one (the I11 fallback). Same tick 10.

## Checks

- `dua-card-r2-browser.mjs`: **128 passed, 0 failed** (two new checks: no Bangla title ends on a dangling "is", and
  `cleanTitle` drops one at the end but keeps one inside a title). **Proof:** with `HEAD`'s `dua-groups.mjs` and
  `groups.json` put back, both new checks fail (126/2).
- `dua-study-page-browser.mjs`: 137 passed, 0 failed.
