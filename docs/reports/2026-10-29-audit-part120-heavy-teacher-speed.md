# Audit part 120: loading speed for a teacher with a real class (PCF MSA J29, issue #1277)

Suite: `tools/i18n-verify/heavy-teacher-speed-browser.mjs` (`node tools/i18n-verify/heavy-teacher-speed-browser.mjs`; `--page=`, `--lang=`, `--profile=`, `--report=`, `--mutate=`).

## The seed

The signed-in owner/teacher `p1`, with 40 students (real-length names, every third one Bangla-primary), a student membership and a teacher-student link each;
3 classes and 2 course offers, every student enrolled in one class and one offer (81 enrolments);
a year of study per student: records in 30 surah chunks (10 entries each) plus a `subject_deen_ethics` chunk, and 52 weekly Activity documents (6 entries each);
60 homework items assigned to all 40 students, each with a submission per student (2,400 submissions).
Pages: `monitor.html`, `records.html`, `people.html`, `homework.html`, `classes.html`; 390x844 on the slowed phone line of part 91 (1.6 Mbit/s, 150 ms) and 1440x900, English and Bangla, stub latency 150 ms.
Limits: phone FCP 3 s, ready 6 s, long task 200 ms, scroll-to-frame 100 ms, and the load-speed contract (records one chunk document, activity one week document, no read over 100 documents, no `sessions`). Actions must not freeze the page for over 50 ms.

## Before (main, measured)

| Page / action | FCP phone | ready phone (en/bn) | reads / docs on load | finding |
|---|---|---|---|---|
| Monitor load | 456 | 2,819 / 3,603 | 9 / 62 | `records` read as ONE list of the student's whole set (31 docs here, no cap on how many chunks a real student has) |
| Monitor, switch student | | 197 | 3 / 32 | the same whole-set records list on every change of student |
| Monitor, whole roster, one month | | 310 / 445 | 246 / 201 | long task **106 ms (en), 242 ms (bn)**: about 1,200 raw rows built in one task |
| Records load / choose a student | 432 | 2,161 / 2,943 | 9 / 62; 2 reads, 1 chunk doc | none |
| People load | 436 | 1,980 / 2,764 | 251 / 85 (246 `memberships` get()s) | not over a limit (see Owner list) |
| Homework load | 440 | 2,052 / 2,852 | 10 / 56 | none |
| Classes load | 432 | 1,939 / 2,689 | 7 / 132 (81-doc enrolments list) | none, but close to the 100-doc cap (see Owner list) |

Scroll-to-frame was 33-34 ms on every page. No page broke FCP or ready limits.

## Fixes (`app/monitor.html`)

1. **The Quran Approach breakdown is read on a tap** ("Show the Quran Approach breakdown", the same pattern as the Vocabulary table below it), not on every load and change of student. It then follows the selected student. Monitor load: 9 reads / 62 docs -> 8 / 60; switch student: 3 reads / 32 docs -> 2 / 1. Bangla string added to `bn.js`. `behaviour.mjs` 15b and `audit-part13-recording-browser.mjs` (Monitor) now tap the button first.
2. **The raw-entries table draws in slices** (100 rows first, 100 per macrotask after); Print finishes the remaining rows first so a printed report is whole; CSV is untouched. Whole-roster month long task: 106/242 ms -> 0.

## After

Full run: **240 passed, 0 failed**. Monitor "whole roster, one month" 203-270 ms with no long task; "switch student" 197 ms; all other rows unchanged from the before-table.

Mutations (each fails on the fixed code's suite): `--mutate=eager-quran-breakdown` -> 2 failed (whole-set records list on load and on switch student); `--mutate=one-shot-raw-rows` -> 2 failed (page frozen 114 ms phone / 77 ms desktop in the month action).

## Other checks

`behaviour.mjs` 971 passed, 0 failed. `audit-part13-recording-browser.mjs` 494/0. `module-startup-reads.mjs` 28/0. `bn-duplicate-keys.mjs` 6/0. `shared-pages-load-speed-audit-browser.mjs` 271 passed, 5 failed: the same 5 fail identically with my changes stashed (Landing, Deen study, Arabic study; none of these five pages). `load-speed-check.mjs` 65 passed, 1 failed: onboarding first visit 1,377 ms vs the 1,178 ms limit; not a page touched here, a timing check (not re-run on main).

## For the Owner / not done (no Rules change, no new field, no new index)

- **Monitor's breakdown still reads every records chunk of a student when asked.** A student with more than 100 chunks would hit the Rules' list cap. A true fix is a stored per-student summary document: a new stored field, an Owner gate.
- **People reads 246 `memberships` documents on load** (6 roles x 41 people, one get() each, by design: Rules cannot prove a list query). Parallel, so ready stays ~2 s throttled. A single query needs a Rules/index decision.
- **Classes reads all enrolments of the tenant in one list**: 81 documents here; a tenant with more than 100 enrolments goes over the cap.
- Monitor "whole roster" month is 246 activity reads (one per person per week), contract-compliant but read-heavy.
