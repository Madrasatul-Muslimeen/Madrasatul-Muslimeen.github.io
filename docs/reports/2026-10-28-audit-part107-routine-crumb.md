# Audit part 107 — the routine pages' breadcrumb (Health, LDOG), I11 (PCF MSA J29, issue #1241)

`app/js/routine-study.js` fell back to the raw module id (`health`, `ldog`) as the breadcrumb root whenever the root
subject was missing from the tenant's list or had no name.

## Fix
The fallback is now the module's real name passed through `t()`: `health` → "Health" (স্বাস্থ্য), `ldog` → "Learn Deen On-the-Go"
(চলার পথে দ্বীন শিক্ষা). No registry holds these names, so a two-entry map sits in `routine-study.js`; both strings already
existed in `bn.js`, so no translation was added. v12.91's id-as-name rule was not copied because it would read "Ldog".

## Before and after (root subject missing; identical at 390 and 1440)
| Page | Language | Before | After |
|---|---|---|---|
| health-study.html | en | `health` | Health |
| health-study.html | bn | `health` | স্বাস্থ্য |
| ldog-study.html | en | `ldog` | Learn Deen On-the-Go |
| ldog-study.html | bn | `ldog` | চলার পথে দ্বীন শিক্ষা |

With a real-length named root the crumb is unchanged: that name in the reader's language.

## Measured
- `audit-part107-routine-crumb-browser.mjs`: 64 passed, 0 failed (2 pages × bn/en × 390/1440 × missing/named).
- `--mutate=rawid` (old fallback restored): 16 failures, all in the "missing" cases.
- `behaviour.mjs`: 971 passed, 0 failed. `bn-duplicate-keys.mjs`: 6 passed, 0 failed.
