# Scholars Database

The Owner's chronological grid of scholars, hadith compilers and mufassirūn. The Owner sent it on 12 Oct 2026 with
"keep it in the repo and update it with new resources" (PCF job J02; master file T20–T22).

| File | What it is |
|---|---|
| `Scholars Database - v1.1.html` | The Owner's file as sent, unchanged. 20 scholars, centuries 2–4, 10–11, 14–15. |
| `Scholars Database - v1.2.html` | The live page: https://claude.ai/artifact/51ACYVU6hBKs7jx32rpAUi. The Owner's 20 rows unchanged, four new columns (G Approaches, H Madhab / group, I Qurʾān works, J Open source & rights), and 48 scholars added by Claude for the empty centuries, mostly mufassirūn. Every Claude cell is a **draft** until the Owner presses ✓ Checked. |
| `scholars-database-v1.2.json` | The same rows as data: the source the page is built from, and what the app will read later. |
| `Scholars Database - v1.3.html` | Published to the live page 12 Oct 2026 (PCF J17, the Owner: "add the Political authority of the Century beside the century and the political authority under each scholar"). Where the Owner drew it: a **Political authority** line on each century heading row, and one under each scholar's lifespan. All 14 centuries and 68 scholars drafted by Claude (`centuries[c].draft`, `authorityDraft`), each with its own ✓ Checked. |
| `scholars-database-v1.3.json` | v1.3's data: v1.2 plus `centuries` and each row's `authority`. |
| `Scholars Database - v1.4.html` | Built 12 Oct 2026 for PCF J02 (the Owner: "Add the scholars Birth-death both timing, Political Era, Madhab attachement, etc. for all tafsir scholars") and decision 108 Q3. Not yet published to the live page. Every row checked for birth and death in AH and CE, political authority and madhab; one birth filled, one death corrected; a **written date for every book** (136 of 137; mostly estimates from the death year, marked "est." or "c."). All Claude drafts; no Owner value changed. See `v1.4-changes.md`. |
| `scholars-database-v1.4.json` | v1.4's data: v1.3 plus a `books` list on each row (`title`, `written`, `yearAH` for placing the book in an era, `estimate`, `draft`). |
| `v1.4-changes.md` | What v1.4 changed, the counts, and every value left empty with the reason. |
| `Scholars Database - v1.5.html` | Built 14 Oct 2026 for PCF J17 (the Owner: "You must check the most authentic info about it. other than that, write the limitations."). One row changed, s020 Shuʿayb al-Arnāʾūṭ: his third work read "Tahqīq of Sharḥ Maʿānī al-Āthār", but the book he edited is al-Ṭaḥāwī's **Sharḥ Mushkil al-Āthār** (Muʾassasat al-Risālah, 1st ed. 1415 AH / 1994, 16 vols). The row's notes keep the original wording, give the sources and a short Limitations note. A Claude draft for the Owner to check. Published to the live page. |
| `scholars-database-v1.5.json` | v1.5's data: v1.4 with that one row corrected. |
| `check-page-data.py` | `python3 docs/reference/scholars-database/check-page-data.py v1.5`: the page's embedded data equals the JSON file, and the page is the template apart from the data. |
| `scholars-database.template.html` | The page with `__DATA__` where the JSON goes. |

**Approaches** use the master file's numbers: 28 Sahaba, 29 Tābiʿīn, 30 Gen1 (to 656 AH / 1258), 31 Gen2 (to about
1700), Gen3 (to 1924), Gen4 (to 1945), Gen5 (to 2001), Gen6, 32 Maliki, 33 Hanbali, 34 Hanafi, 35 Shafiʿi, 36 Groups
and sects. A scholar sits in the **century of his death**, as in v1.1.

**Updating.** The Owner edits on the live page (✎ Edit, then Save; each Save adds a version, v1.3, v1.4 …). A session
reads the saved page with the Artifact tool, takes its `<script id="data">` JSON into `scholars-database-v<x>.json`,
and rebuilds the HTML from the template. New rows and resources are added to the JSON, marked `"by": "Claude",
"draft": true`, never written over the Owner's text. Dates and places marked "?" or "some say" are uncertain and need
checking against a biographical dictionary (al-Dhahabī's Siyar, al-Ziriklī's al-Aʿlām) before anything in the app relies on them.
