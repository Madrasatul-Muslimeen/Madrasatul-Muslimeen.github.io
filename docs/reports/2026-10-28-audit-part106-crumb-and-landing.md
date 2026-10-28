# Audit part 106: topic breadcrumb shows a raw id; Landing failed-save sweep (PCF MSA J29)

Issue #1236. Branch `builder/issue-1236-run-2100`.

## 1. Breadcrumb

**Cause.** `app/js/topic-study.js` set `rootLabel = root ? langText(root.name, lang, moduleId) : moduleId`.
When the module's root subject is absent from the tenant's subject list, or carries no name, the label was the
raw module id (`hadith`, `deen`, `naturelife` ...). `renderTopicBreadcrumb` then printed it unchanged in every
language. It is a real code defect in the shared file, not only harness data: the live tenant would show it
the same way whenever a root is missing or unnamed. It showed on `hadith-study.html` because the harness
tenant has no `hadith` root. (The existing `audit-part26` harness also names its root `"hadith"` in both
languages, which is its own fixture and unrelated.)

**Before** (new check, run with the old fallback restored via `--mutate=rawid`), root subject missing:

| page | bn 390 | bn 1440 | en 390 | en 1440 |
|---|---|---|---|---|
| deen-study | `deen` | `deen` | `deen` | `deen` |
| arabic-study | `arabic` | `arabic` | `arabic` | `arabic` |
| general-study | `general` | `general` | `general` | `general` |
| naturelife-study | `naturelife` | `naturelife` | `naturelife` | `naturelife` |
| life-skill | `lifeskill` | `lifeskill` | `lifeskill` | `lifeskill` |
| hadith-study | `hadith` | `hadith` | `hadith` | `hadith` |

With a real-length language-keyed root name the crumb was already correct (named case passes before and after).

**Fix** (only `app/js/topic-study.js`, plus one `bn.js` string): the fallback is the page's `rootSubjectId` read
as an English name (`deen_study` -> "Deen Study") passed through `t()`. So it shows a name, translated when the
catalogue has it. `"Nature Life"` was the one fallback without a Bangla entry, so `"Nature Life": "প্রকৃতি ও জীবন"`
was added to `bn.js`.

**After**, missing root: Bangla pages show দ্বীন অধ্যয়ন-style names in Bangla (Deen Study, Arabic Language,
General Study, Nature Life, Life Skill, Hadith all in Bangla); English pages show the English name. Same at 390 and 1440.
The two routine pages (health-study, ldog-study) use `routine-study.js`, which has the same fallback shape; it is a
separate file outside this round's list and is left for the Architect.

**Check:** `tools/i18n-verify/audit-part106-topic-crumb-browser.mjs`: 6 pages x bn/en x 390/1440 x root missing/named.
120 passed, 0 failed. Mutation `--mutate=rawid` (old fallback back): 84 passed, 36 failed (every "missing" case fails
"not a raw id", and in Bangla "is in Bangla"). The file is restored after the mutation.

## 2. Landing sweep (`index.html`)

The tool counts skipped controls inside `--cap`, and below 800px it limits the cap to 10, so `--from=25` alone
presses nothing. Used `--cap` large enough with `--vp=` per width instead.

- 1440: `--cap=100 --from=0` pressed 100 controls (579 s): 0 saves. `--cap=200 --from=100`: the remaining 11
  controls reached: 0 saves. Every control on the page has been reached at 1440.
- 820: `--cap=60 --from=25`: nothing exists past 25 at this width: 0 saves.
- 390: the tool caps a phone width at 10 controls by design (the same code paths as wider widths); 8 further
  controls were not pressed there, and they are all among the 111 pressed at 1440.

Result: 0 saves on Landing, so 0 OK / MISSING / MISLEADING / STUCK. Nothing to fix; no change to `errors.js`.
(The tool's own positive-control lines for bookmarks/menu print "0 found" because only `--page=index.html` was run.)

## 3. behaviour.mjs

`node tools/i18n-verify/behaviour.mjs` run alone at the end: **971 passed, 0 failed**.
Also `bn-duplicate-keys.mjs`: 6 passed, 0 failed.
