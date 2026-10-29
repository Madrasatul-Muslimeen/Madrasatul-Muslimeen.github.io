# Audit part 128: a failed READ no longer says "That save did not go through"

Issue 1308 (PCF MSA J29). Base: `main` v12.117. Builder round; no version bump.

## 1. Measurement: every `reportWriteFailure(` call site in `app/`

Found by the new suite's static scan (30 sites outside `errors.js`'s own two internal calls).

| Site | Context | Kind | Words before (en) | Now |
|---|---|---|---|---|
| journey-map.html:780, 3411; notes.html:477 | caller's write context | write | "That save did not go through…" / code sentence | unchanged |
| journey-map.html:1072 | action `ownerFolderTree` | **read** | save sentence | loaded sentence |
| journey-map.html:4001 | action `notesForStudyUnit` | **read** | save sentence | loaded sentence |
| journey-map.html:4034 | action `notesPaneRetry` | **read** | save sentence | loaded sentence |
| quranrevival.html:10742 | what "load the Vocabulary Wheel" | read | save sentence | loaded |
| :10969 | "load the wheel's rings" | read | save sentence | loaded |
| :12443 | "read the whole-Qur'an word total" | read | save sentence | loaded |
| :13253 | "load your whole-Qur'an status" | read | save sentence | loaded |
| :13428 | "load the contents list" | read | save sentence | loaded |
| :13599, :14915 | "read Arabic word / Word by Word coverage" | read | save sentence | loaded |
| :18398, :18828, :18895, :18961, :21805 | "read Arabic word progress" | read | save sentence | loaded |
| :18498 | "read lemma-wide word progress" | read | save sentence | loaded |
| :18532 | "count this lemma's known occurrences" | read | save sentence | loaded |
| :13520 | "open that place" | ambiguous (navigation) | unchanged | unchanged (see below) |
| :25531, :25552 | "open the Notes pane" | ambiguous (loads the pane) | unchanged | unchanged (see below) |
| :19199 | "update the whole-Qur'an word total for this lemma" | write | unchanged | unchanged |
| self-check.js:199–336 (5) | collection only | reads for the admin self-check | unchanged | unchanged (no what/action) |

Words the reader saw for a read (code `unavailable`, which is what a dropped connection gives):
- en: "Could not reach the server. This will save automatically once the connection is back." (also wrong for a read)
- bn: "সার্ভারে পৌঁছানো যায়নি। সংযোগ ফিরে এলে এটি নিজে থেকেই সংরক্ষিত হবে।"
- any other code, en: "That save did not go through ({code})…"; bn: "সংরক্ষণটি সম্পন্ন হয়নি ({code})…"

Driven in the browser at 390 (en and bn): the new suite calls `reportWriteFailure` from the loaded page with four read contexts and checks the rendered banner. The stub-failing-a-read route was not needed: the wording depends only on the context passed in, and the call sites are fixed by the static scan.

## 2. Fix (`app/js/errors.js`, `app/js/i18n/bn.js`)

`isReadFailure(context)`: true when `context.read === true`, or `what`/`action` begins with read / load / count (case-insensitive, whole word), or the action is one of the three named journey-map read actions. `plainMessageFor` then returns
- en: "That information could not be loaded ({code}). Please check your connection and try again."
- bn: "এই তথ্য লোড করা যায়নি ({code})। অনুগ্রহ করে আপনার সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।"

This is checked before the per-code table, so a read that fails with `unavailable` no longer claims it "will save automatically". Writes are untouched. The Ref line and the code are unchanged.

I went slightly beyond "read" to include **load** and **count**, because six QR sites say "load …" and one "count …" and are plainly reads.

## 3. For the QR Lead (`quranrevival.html`, not edited)

All QR read sites above are covered by the wording rule with no edit. Not covered, your call: `:13520` "open that place" and `:25531`/`:25552` "open the Notes pane". If you want them as reads, add `read: true` to the context. `self-check.js` read sites and `journey-map.html:780/3411` (write context passed through) are not QR files and were left alone.

## 4. Checks

- `read-failure-wording-browser.mjs`: 45 passed, 0 failed. `--mutate=no-read-words`: 33 passed, 12 failed (all read-wording checks fail; write checks and static checks still pass).
- `behaviour.mjs` alone: 972 passed, 0 failed.
- Remaining suites: see the PR description.
