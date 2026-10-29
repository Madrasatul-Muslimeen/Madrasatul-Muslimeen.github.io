# Audit part 132: large-text fixes for the shared pages (part 131 findings 5–18)

PCF MSA J29, issue #1321. Built by the Builder (run 2248, branch `builder/issue-1321-run-2248`); the run lost its GitHub
credentials after its third push, so it opened no pull request and its report stayed in its workspace. **This report is
the Architect's**, written from the branch, the Builder's issue comment and the Architect's own measurements (30 Oct 2026).

## What changed (page CSS only, plus two small shared helpers; no text, no stored data)

| Finding | Page | Fix |
|---|---|---|
| 5, 6 | Records | the claim form stays inside the screen (`fieldset { min-width: 0 }`, inputs `max-width: 100%`); a table that does not fit its box is shown as **stacked, labelled rows** with its actions (Confirm / Return / Confirm anyway) on a line of their own (`app/js/table-stack.js`) |
| 7, 8 | Homework | the form fits; long checkbox labels wrap; cut selects carry their full chosen value as a `title` (`app/js/select-title.js`) |
| 9, 10 | People | the study-person select carries its full value as a `title`; the roster table stacks when it does not fit, so Copy link / Archive are reachable |
| 16 | Bookmarks | the "No one in particular" person-tag select carries its full value as a `title` ("For: …") |
| 11 | Classes | the enrol row and its selects fit the screen |
| 12 | Course offers | the create form fits the screen |
| 13 | Curriculum | the forms fit; a long resource link wraps |
| 14 | Onboarding | the radio row and family rows wrap |
| 15 | About | long links wrap (`overflow-wrap: anywhere`) |
| 17 | Import notes | the source select fits |
| 18 | Mapping My Journey | the folder search box shrinks with the row |

Not in this round, as the issue said: findings 1–2 (the 🧰 Zab bar), 3–4 (the Qur'an front page: released as v12.123 by the
QR Lead), 19 (taglines, admin), 20–21 (with the Zab bar round).

## A change at ordinary text size, looked at

`table-stack.js` stacks any table that does not fit its box at the reader's text size, so on a 360px phone it also stacks
Records' and People's entry tables **at 100%**. Measured before/after (360, Records bn, People en): on `main` at 100% the
Records entries table already ran past the right edge — its "Actions" column (Confirm / Return) was **off screen**. Stacked,
every field shows with its label and the buttons sit on their own line. So this fixes an existing phone defect rather than
changing a working layout. From 390px up, and on a tablet or computer, the tables fit and nothing changes.

## Checks (Architect, on `main` v12.123 merged in)

- `tools/i18n-verify/large-text-shared-pages-browser.mjs`, the 11 fixed pages with the reach pass: **530 passed, 0 failed**.
- `--mutate=old` (the pre-fix CSS of each page put back, select titles disabled): **107 failures, on every one of the 11
  pages** (records 15, homework 15, people 30, journey-map 12, curriculum 11, classes 7, course-offers 6, bookmarks 5, about 2,
  onboarding 2, import-notes 2).
- `behaviour.mjs` alone: **972 passed, 0 failed**. `stub-parity.mjs` 4/0. `apps-build-check.mjs` 48/0; QR builds.
- The other 12 pages: 290/0. `shared-pages-bangla-layout-audit` 460/0, `shared-tools-long-names` 202/0, `floating-overlays-reach` 360/0, `audit-part57-records-monitor` 468/0.
- Screenshots looked at: Records 360 bn at 100% before and after.

## Known and left

- The reach probe treats a wrapped link as one box and can print a false "never reachable" INFO line for a long link on
  Curriculum / About (the Builder had a fix in its workspace that was lost). INFO only; no check depends on it.
- The new helpers are fetched when a page first loads them and kept by the service worker like every other `/app/` file;
  `app/sw.js` needs no list change.
