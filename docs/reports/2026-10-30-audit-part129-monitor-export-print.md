# Audit part 129 — Monitor "Download CSV" and Print in Bangla and with real names

Issue #1310 (PCF MSA J29). Base: `main` v12.117. No version bump, no Rules, no stored field.

## Measured BEFORE the fix (reading the code, then the suite on the new files)

Seed (suite only, `extraSeedJs`): three students — a 40-character Bangla name, `Ahmad "Abu Zayd", Jr.` (comma and quote), and a long English name — with 5 activity entries each over three subjects. Whole roster, week and month, en and bn.

| Question | Result before | Result after |
|---|---|---|
| UTF-8 BOM at the start of the file? | **No** (file began `22 44 61` en / `22 E0 A6` bn: a bare `"`). Excel opens Bangla as garbage. | Yes, `EF BB BF` in all four files |
| Every row the same number of fields (RFC 4180 parser)? | Yes, 6 on every row (all fields are quoted, `"` doubled) | unchanged, 6 |
| Name with comma and quote round-trips? | Yes | unchanged |
| Bangla name and the stored values intact? | Yes (bytes are right; only the missing BOM made a spreadsheet misread them) | unchanged |
| Header follows the app language? | Yes. en: Date, Student, Subject, Unit, Approach, Action. bn: তারিখ, শিক্ষার্থী, বিষয়, একক, পদ্ধতি, কার্যক্রম | unchanged, no new strings needed |
| Print: heading present? | Yes ("Monitor report" / "পর্যবেক্ষণ প্রতিবেদন") | unchanged |
| Print at A4 (794px, print media): overflow? | None with these names on the old CSS, but nothing in the CSS made a long unbreakable name wrap, and the page had no A4 `@page` size or smaller print type | wrapping (`overflow-wrap:anywhere`), A4 `@page`, 10.5px type, 0 overflow |

Two things the issue worried about were NOT defects: the escaping is already correct, and the headings were already translated. The real defect was the missing BOM.

## What changed

- `app/js/monitor.js` `downloadCsv`: prefix the file with U+FEFF (written as `String.fromCharCode(0xFEFF)` so the invisible character is not lost in an editor).
- `app/js/monitor.js` `printReportHtml`: cells wrap long names, `@page{size:A4}`, a print-media rule with smaller type and tighter padding.

## Suite

`tools/i18n-verify/monitor-export-print-browser.mjs`: 32 passed, 0 failed. Positive controls: a clean English row and a comma-and-quote field parse. Mutations (the fixed file is edited and restored):
- `--mutate=bom`: 28 passed, **4 failed** (caught).
- `--mutate=printcss`: 30 passed, **2 failed** (caught). Honest note: this mutation puts back no-wrap cells and forces a wide table; the old CSS alone did not overflow with this seed, so it proves the check can fail, not that the old page failed.

## Other suites (all run in the foreground, one at a time)

- `behaviour.mjs` alone: 972 passed, 0 failed
- `audit-part57-records-monitor-browser.mjs`: 468 passed, 0 failed
- `shared-tools-read-failure-browser.mjs`: 225 passed, 0 failed
- `shared-tools-long-names-browser.mjs`: 202 passed, 0 failed

## Question for the Owner (not built)

Bangla or English digits in the dates and counts of a spreadsheet file? Today the CSV carries stored values (ISO dates, English digits), which sorts and filters correctly in a spreadsheet. Bangla digits would look native but break sorting and formulas. Left as is.

## Not done

Print was measured by laying out the printed HTML at 794px in print media; a real printer or "Save as PDF" page break was not exercised.
