# Audit part 109 — Records names a topic instead of printing its id (I11, PCF MSA J29, issue #1247)

## Finding
`unitKeyLabel()` (`app/js/unit-keys.js`) printed a topic's permanent id after the word "Topic". On `records.html` the entries table and the "This week's activity" table both showed `বিষয় t42` (en: `Topic t42`) for the seeded activity `topic:t42`. Part 108's sweep missed it because `t42` is neither snake_case, kebab-case nor a module id.

## Fix
- `unitKeyLabel(unitKey, resolveName)` takes an optional resolver. For a topic it prints `Topic: <name>` (bn `বিষয়: <name>`) when the page can name it; when it cannot, it prints only the translated word ("Topic" / "বিষয়"), never the id.
- `records.html` supplies the resolver from the subject tree it already loads (a topic key carries a subject-tree node id). No new read, nothing on the startup path. The stored key is unchanged.
- Other callers (`monitor.html`, `monitor.js`, `notes.html`, `dawah.html`) pass no resolver, so a topic there now shows just the word, no id. They have no tree loaded; naming topics there is a later round.

## Before and after (Unit cell of a topic row; same at 390 and 1440 px, both tables)
| Language | Before | After |
|---|---|---|
| en | `Topic t42` | `Topic: Honesty in trade and daily dealings` |
| bn | `বিষয় t42` | `বিষয়: ব্যবসা ও দৈনন্দিন লেনদেনে সততা` |

## Checks
- New `audit-part109-records-topic-name-browser.mjs`: Records at 390 and 1440, en and bn; both tables show the name, no cell has `t42` or `topic:`. 12/12 pass; `--mutate=oldlabel` restores the old label: 12/12 fail (caught).
- `audit-part108-raw-id-sweep-browser.mjs` extended: a short letters-plus-digits id after a unit word is flagged. A built-in self-test flags 4/4 ids and passes 10/10 real texts (`Juz 3`, `2:255`, `সূরা ১`, `আয়াত ১:১`, a topic name…). With the old label put back, the sweep on Records finds `বিষয় t42` at both widths; with the fix, the full sweep is 0 findings on 50 runs and the about.html control is clean.
- Harness seed: a subject-tree node `t42` with a real-length name in en and bn (`firebase-stub.mjs`).
- `behaviour.mjs` 971 passed, 0 failed; `bn-duplicate-keys` 6/0; `audit-part24` 184/0; `audit-part13` 494/0.

No Rules change, no new stored field, no new string in `bn.js`.
