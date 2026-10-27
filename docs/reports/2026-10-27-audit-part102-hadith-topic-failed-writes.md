# Audit part 102: Hadith Study's topic saves with a refused write (I15, PCF MSA J29)

Issue #1217. Continues part 101 (`2026-10-27-audit-part101-hadith-failed-writes.md`), which could not reach rows 7–8 because the
harness data had no Hadith topic with a resource. No file under `app/` was changed.

## What was built (tools only)

`tools/i18n-verify/shared-pages-failed-write-audit-browser.mjs` gained a seeded topic and these flows (all on `hadith-study.html`):

| flow | what it presses |
|---|---|
| `hadith-topic-open` | the topic row itself (the "where was I" write) |
| `hadith-topic-bookmark` | ☆ on the open topic, then **Save** in the name pop-over |
| `hadith-topic-track` | Track my progress > **Claim** with the default status |
| `hadith-topic-track-<status>` | the same, with `not_applicable`, `not_started`, `learning`, `practising`, `achieved`, `mastered` chosen first |

Seed: the module's `studied_hadith` trackable plus the topic `synthetic-topic-audit-leaf` ("Synthetic audit topic" / Bangla name) under
the `hadith` root, with the stub's resource `r1` (so Track my progress is enabled). Every id the seed adds carries `synthetic-`.
Flow additions: steps `wait:<css>` and `select:<css>=<value>`; flow flags `keepMenu` (the bookmark pop-over's class `bm-popover`
matches the shared-menu selector, so it was filtered out as "menu") and `closes` (the pop-over closes on Save by design, so "control
gone" is not STUCK; "Saving…" still left in the page is). The failure detector is unchanged.

## Result: one row per write (refusal flags armed, message visible ≥ 2 s, in the page language)

| # | write | file:line | verdict | what the page showed |
|---|---|---|---|---|
| 7 | Track my progress > Claim (`claimStatus`, then `logActivity`) | `app/js/topic-study.js:559-602` | **OK** at 1440, 820, 390, en + bn, default status; each of the six statuses OK at 1440 en (`not_applicable` and `mastered` also 390, en + bn) | "That save was blocked by a permissions rule. Nothing was lost, but it did not save — please tell the admin." (Bangla equivalent) in the sheet's result line; Claim re-enabled |
| 8a | ☆ topic bookmark, pop-over Save (`saveBookmarkForAssignees`) | `topic-study.js:481-531` (writes in `app/js/bookmark-assign.js:47-87`) | **OK** at 1440, 820, 390, en + bn | Pop-over closes; red banner at the foot of the screen with the same permission text and `Ref: bookmarks/saveBookmark · permission-denied`. I opened the page at that state (screenshot): the star stays ☆, no "saved" notice. |
| 8b | ☆ when already bookmarked: Remove my bookmark | `topic-study.js:491-499` | not pressed (needs an existing bookmark); same `safeWrite` path as 8a | read, not measured |
| 9 | Topic open: `touchResume` ("where was I") | `topic-study.js:411-425, 445-450` | **OK** at 1440, 820, 390, en + bn | Topic opens anyway; an alert above it: "Couldn't save the change: permission-denied" / "পরিবর্তনটি সংরক্ষণ করা যায়নি: permission-denied" |

Counts: open 6/6 OK, bookmark 6/6 OK, track (default) 6/6 OK, `not_applicable` 4/4, `mastered` 4/4, `learning` / `practising` /
`achieved` / `not_started` 1/1 each (1440 en). 0 MISSING, 0 MISLEADING, 0 STUCK. Statuses `learning`, `practising`, `achieved`,
`not_started` were not run at 390/820 or in Bangla: they share the one Claim code path with the ones that were.

## Mutation proof

`--flow=hadith-topic-track --mutate=silent --mutate-page=hadith-study.html` → Claim counted MISSING, "caught (the sweep CAN fail)",
exit 1. Same for `--flow=hadith-topic-bookmark` (Save MISSING, caught).

## Findings and smallest fixes

No real failure. Two small notes, neither a defect of I15:

1. Row 9's message ends with the raw code (`permission-denied`), which is English in the Bangla sentence. Smallest fix, if wanted:
   map the code through the same text the other saves use (`notSavedText`-style) in `topic-study.js:448`. File: `topic-study.js`
   is a shared renderer, **Architect**.
2. Incidental, seen in the screenshot only (not measured): at 1440 one catalogue-template topic row ("Hadith — Al-Ghayb") rendered its
   name as a narrow vertical column. It comes from the stub's template topics, not the seeded one; worth a look by the Hadith Lead
   with real data. Not part of this audit.

Not reached: the Remove-bookmark branch (8b), above.
