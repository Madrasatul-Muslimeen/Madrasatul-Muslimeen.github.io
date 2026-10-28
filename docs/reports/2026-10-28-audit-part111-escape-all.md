# Audit part 111 (J29, SECURITY): the rest of the unescaped names

Follows part 110 (#1250, v12.96). Issue #1253. A name a tenant wrote (person, subject, class, tenant) was still put into
`innerHTML` unescaped on the pages below; a crafted name could run script on another member's screen.

## New shared escaper

`app/js/html-escape.js` exports `escapeHtml` (escapes `& < > " '`; no imports, no side effects). Part 110's page-local copies
are left as they are (later tidy-up).

## Insertion points fixed

| File | Where |
|---|---|
| `app/curriculum.html` | `tenantSelect` options; `unitSubjectChecks` labels; `planContextSelect` options (classes and people); `gradePersonSelect`; `unitLadderSelect`, `gradeLadderSelect`, level selects; `planUnitSelect`; unit card heading; Grades ladder line. `subjectName`, `personName`, `ladderName`, `levelName`, `unitName` now return escaped text (every caller is an `innerHTML` template), which closes the `unitsBody` subjects line, the plan rows, resource "added by" and grade history. |
| `app/js/topic-study.js` | `personSelect`, `tenantSelect` (serves deen-study, hadith-study and the other topic pages) |
| `app/js/routine-study.js` | `personSelect`, `tenantSelect` (health-study and the other routine pages) |
| `app/js/asma-study.js` | `personSelect`, `tenantSelect` (uses its own existing `escapeHtml`; frozen file, only these two lines changed) |
| `app/quranrevival.html` | `personSelect`, `tenantSelect` (uses its existing `escapeHtml`; frozen file, only these two lines changed) |
| `app/migrate.html` | `tenantSelect` (inline escape, the page has no module import for it) |

## Left, with the reason

- **`app/hadith-collections.html`**: `personSelect` (line 106) and `tenantSelect` (line 114) still inject. The brief says not to
  change `hadith-*` page files, so it was NOT edited. The new check finds it and reports it as `KNOWN-OPEN` on every run (4 runs),
  and fails if it ever stops injecting so the entry gets removed. Fix = wrap both in `escapeHtml`; needs the Architect's word
  because of the hadith-file rule.
- Part 110's page-local `escapeHtml` copies (tidy-up, not a defect).

## The check

`tools/i18n-verify/audit-part111-escape-all-pages-browser.mjs`: every page of the part 108 `PAGES` list plus `curriculum.html`,
`health-study.html`, `ldog-study.html`; en and bn; 390 and 1440. Seeds the payload as p2's name, the first three subjects,
every class and the tenant. Asserts `window.__xss` unset and no `img[src="x"]` or `<b>bold</b>` element. `--mutate` strips one
escape on `curriculum.html` (Grades Person picker); the check catches it (4 of 4 runs fail).

## Added by the Architect at release (28 Oct 2026)

The Architect's payload probe also put the payload into p1's name, every Approach (trackable) name and section name, ladders,
levels, curriculum units, resources, bookmark folders, assignment instructions, class glosses, course-offer notes and teaching
notes, and opened every page in `app/` (not just the `PAGES` list). On `main` (v12.96) 15 pages ran the script; after this
round's fixes and the ones below, **0**. Fixed here:

- `app/hadith-collections.html`: `personSelect` and `tenantSelect` (a safety fix on a Hadith page; the Hadith Lead is told).
- `app/people.html`: the "managed by" cell (`managerName`, a person's name, was not escaped).
- `app/catalogue.html`: the Approaches table's section heading (`sectionHeadingHtml` label).
- `app/quranrevival.html` (frozen Quran Study, safety fix; the PCA is told): the Approach picker `trackableSelect`, the Mastery
  Wheel's segment titles, the Approach list's names and section labels, and the percentage view's labels and titles.
- `app/js/mastery-wheel.js`: the Approach list's `data-group` attribute now escapes `&` and `"` (an unnumbered section's key
  carries its name).
- A comment line in `quranrevival.html` that the round had un-indented was put back.

The check now also seeds p1's name and every Approach and section name, and `KNOWN_OPEN` is empty: 104 runs, 0 failed.
