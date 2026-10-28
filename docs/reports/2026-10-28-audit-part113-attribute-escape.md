# Audit part 113 (SECURITY): names inside attributes

PCF MSA J29, issue #1260. Check: `tools/i18n-verify/audit-part113-attribute-escape-browser.mjs`.

## Method

Payload `x" data-pwn="1" autofocus onfocus="window.__xss=(window.__xss||0)+1" y="` seeded as the name of p1 and p2, the first three
subjects, every class, the tenant, every trackable name and `groupName`, every domain, ladder, level, curriculum unit and course
offer, and a bookmark's `name`. Every page of the part-108 sweep plus `curriculum.html`, `health-study.html`, `ldog-study.html`,
en and bn, 390 and 1440 px (108 runs), plus People → Edit and Catalogue → Edit forms opened on demand. A run fails if
`window.__xss` is set, any element has a `data-pwn` attribute, any `onfocus` mentions `__xss`, or a page script failed to load
(positive control, as in part 111).

## Fixed

| Where | What | Fix |
|---|---|---|
| `app/quranrevival.html` ~line 14917, local `escapeHtml()` | Escaped only `& < >`, not `"` or `'`. It builds attributes all over the page; the measured break-out was the Approach picker `#trackableSelect`: `<optgroup label="${label}">` (a tenant section/`groupName`) closed the quote and added `data-pwn`, `autofocus`, `onfocus`. | Added `"` → `&quot;` and `'` → `&#39;` to that one function (an escaping line only; frozen-file rule respected). Text shown is unchanged. |

After the fix the page passes 4/4; `--mutate` (removes the quote escapes) fails 4/4 on `index.html` (the page that serves
`quranrevival.html`), so the check can fail.

## Found nothing

Every other page of the sweep, in both languages and both widths, including the on-demand edit forms on People and Catalogue,
passed: no breakout. That is a result: those pages already use the shared `escapeHtml` (which escapes quotes) for attributes.

## Findings left, with reason

None in the Hadith/Dua/Health files, `note-window.js`, `zab-bar.js`, `note-sheet-ui.js` or the in-page note scripts were measured
as vulnerable by this seed. The check reaches `hadith-collections.html`, `hadith-study.html` and `health-study.html` and they passed.
Limit: it only proves what the seed reaches; Hadith/Dua names that come from data files rather than tenant data were not seeded.
