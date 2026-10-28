# Audit part 110 (PCF MSA J29, security): typed and tenant-authored text reaches the page as text

Issue #1250. Base: `main` at v12.95. No version bump, no Rules change, no stored field.

Each insertion point now goes through a page-local `escapeHtml` (same body as the other pages' copies; `catalogue.html` uses its own existing `esc`).
Text is escaped where it enters an HTML string, never in the helper that also feeds `textContent`, so nothing is escaped twice.

## Fixed

| File | What was inserted raw (now escaped) |
|---|---|
| `app/records.html` `entryRowHtml()` | `e.returnNote`, `e.notes`, domain names, trackable name and its `e.trackableId` fallback, the `unitKeyLabel()` result (a Hadith/Name reference is typed text) |
| `app/records.html` `refreshWeek()` | subject name, `unitKeyLabel()` result, trackable name (and id fallbacks) |
| `app/records.html` pickers | tenant name, person, subject, Approach (trackable) options, domain chips |
| `app/monitor.html` `renderReport()` | per-student name, per-subject name, subject breakdown, raw rows (person, subject, unit, Approach) |
| `app/monitor.html` | Quran Approach table (`name`, `groupName`), Vocabulary table person name, person and tenant options |
| `app/js/monitor.js` `studyActivitySectionHtml()` | `unitKeyLabel()` result |
| `app/homework.html` | assignment `instructions`, mark `comment`, teaching-note `body`, subject name, person names, context names, tenant, person, subject, note-about options, assign-to labels |
| `app/classes.html`, `app/course-offers.html` | class/offer names and gloss, subject and person labels and options, enrolment person names, tenant options |
| `app/people.html` | person names in the roster and pickers, invite email (cell and `data-email` attribute), tenant options |
| `app/catalogue.html` | module, subject, section, Approach and its guide text, ladder and level names; tenant options |
| `app/bookmarks.html`, `app/notes.html`, `app/journey-map.html`, `app/import-notes.html` | tenant option text; bookmarks person option |

## Listed, not fixed

- `hadith-collections.html:114`, `app/migrate.html:101`: tenant name in an option (`hadith-*` is not mine to change; `migrate.html` has no escaper and is a one-off tool).
- `app/curriculum.html:377`: tenant name in an option; the page has no escaper, so it needs one added (a shared-page follow-up).
- `app/js/asma-study.js:88`, `routine-study.js:105`, `topic-study.js:113`: tenant name in an option (module files; `asma-*` is frozen, the other two feed the Deen/Arabic/General pages).
- `quranrevival.html:26366`: tenant name in an option (`quranrevival.html` is frozen).
- Error text (`${err.code} ${err.message}`) is written into `innerHTML` in several pages. Those messages come from the Firebase SDK and from our own code, not from a typed field, so they were left.
- Pages not read line by line: `curriculum.html`, `tenants`-type admin screens, `dawah.html`, `ayah-poster.html`. They already carry an `escapeHtml`; a full audit of their `${…}` sites is a follow-up.

## Check

`tools/i18n-verify/audit-part110-escape-browser.mjs`. It seeds a payload (`<img src=x onerror="window.__xss=…"><b>bold</b>`) into records notes and returnNote, domain, trackable and subject names, and a Hadith activity unit key. It runs Records and Monitor in en and bn at 390 and 1440 and asserts: `window.__xss` unset, no `<img src="x">`, no `<b>`, and `<b>bold</b>` visible as characters.
`--mutate=records` and `--mutate=monitor` make `escapeHtml` a pass-through; each makes its 4 runs fail (16 failed assertions).

Not covered by the browser check (escaped and read in review): Homework, Classes, Course offers, People and Catalogue.
