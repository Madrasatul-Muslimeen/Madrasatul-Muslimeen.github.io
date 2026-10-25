# Audit part 90 — the Manual's "Other study modules" section, claim by claim (PCF MSA J29)

Suite: `node tools/i18n-verify/manual-claims-msa-browser.mjs --section=modules` (real clicks at 390x844 and 1440x900).
Mutation: `--section=modules --mutate=modules`. Builder round for issue #1173. No app code changed.

## Totals

- `--section=modules`: **56 passed, 0 failed, 1 skipped** (28 checks at each width).
- `--section=modules --mutate=modules`: **32 passed, 24 failed, 1 skipped** (the run must fail, and does).
- Companion suites, unchanged by this round: `stub-parity` 4/0; `audit-part26-topic-study-browser --width=390 --lang=en` 102/0; `audit-part25-continue-back-browser` 112/0; `bangla-sweep-other-pages-browser` 224/0.

## Claims

Each row's Result is the same at 390px and 1440px.

| Entry | Claim | Result | Measured |
|---|---|---|---|
| Hidden modules | An old link to a hidden module's page still opens it | PASS | `general-study.html` opens with a "General Study" heading |
| Topic study (Deen Study, Arabic) | Modules ▾ → the subject opens its topics as a list | PASS | ≥2 topic rows, "Short topic" listed, for Deen Study and Arabic |
| Topic study | Pick the Person | PASS | `#personSelect` offers ≥2 people |
| Topic study | Open a topic to see its resource | PASS | heading "Short topic", resource link `https://example.org/lesson` |
| Topic study | Track my progress opens "— Studied" | PASS | sheet title "Short topic — Studied" |
| Topic study | Choose your stage on its Track tab | PASS | Track tab first, stage select, Guide and Breakdown tabs present |
| Topic study | A stage chosen and claimed is recorded | PASS | records write names `topic:leaf_b` with `learning` |
| Topic study | Bookmark this saves your place | PASS | bookmarks write names `leaf_b` |
| Routines (Learn Deen On-the-Go) | "Logged today" shows for a routine logged today | PASS | one "Logged today" badge in the list (leaf_c seeded as practised today) |
| Routines | How many are not logged yet | PASS | "2 routines here not logged today yet." for 3 routines, 1 logged |
| Routines | The routine page reads "Logged today ✓" | PASS | detail text contains "Logged today ✓" |
| Routines | An unlogged routine reads "Not logged today yet." | PASS | detail text |
| Routines | Track my progress opens "— Practised" with Track, Guide, Streak and Breakdown | PASS | title "Short topic — Practised", tabs exactly `Track, Guide, Streak, Breakdown` |
| Routines | Logging a routine today is recorded | PASS | Streak tab → Log today writes an `activity` entry, `practised`, `leaf_b` |
| Continue strip | A "Continue: …" line on the study page | PASS | one chip "Continue: Deen Study — Short topic" |
| Continue strip | Hidden modules do not take a place | PASS | the newer General Study place is not offered |
| Continue strip | Tapping it takes you back to where you last were | PASS | lands on `?resume=leaf_b`, topic detail "Short topic" open |
| All entries | No sideways scroll, no page error | PASS | `scrollWidth <= innerWidth + 1`, no page errors |
| Topic study | A second account's progress on the same topic | SKIP | needs a second signed-in account |

## Mutation (`--mutate=modules`): 24 failures

It removes `#trackTopicBtn` (topics and routines), `#bookmarkTopicBtn` and the Continue chip after they render. Failing checks per width: the Track sheet title and tabs (Deen Study, Arabic, routines), the claim record, the bookmark save, the routine Log today write, the Continue chip line and the tap-through. 12 per width, 24 in all.

## For the Architect

1. **No app defect found in this section.** Nothing is left red.
2. **Wording is near, not exact.** The Manual says the topic page's bookmark control is "Bookmark this"; on the page it is a ☆ button titled "Bookmark this" (it opens the Name/Folder pop-over). The Manual says the Continue line "takes you back to where you last were in that subject": it does, and the chip names the topic only for the page's own module (another module's chip says just "Continue: <Module>").
3. **Check limits, not app faults.** The firebase stub never mutates its data, so "Logged today ✓" after pressing Log today cannot be seen on the page; the suite proves the write, and proves the "Logged today" states from data seeded as already logged. The catalogue repair adds the module's template topics beside the seeded ones, so the routine count is derived from the rows shown (3), not hard-coded.
4. **Data.** The stub's catalogue has no topic with a resource, so each module is seeded with a root and two topics that use the stub's `r1` resource. The Manual's General Study / Nature-Life / Life Skill / Health "hidden from the menu" claim is already checked in `--section=start`.
