# Audit part 96 (J29): does a refused save reach the reader? — all 23 shared pages

Round 2 (issue #1193, continuing #1191). Suite: `tools/i18n-verify/shared-pages-failed-write-audit-browser.mjs`.
No app code was changed. Nothing stored, no Rules changed.

## How it ran

With the three stub refusal flags armed (`__stubFailWrites`, `__stubFailBatch`, `__stubFailTx`) the suite presses each visible
button (fields filled, `prompt()`/`confirm()` accepted). A control counts as a **save** when the page read a refusal flag.
It then looks for newly visible text that says the change was not saved, in the page's language, for at least 2 s.
Viewports 1440x900 and 390x844 (390 capped at 10 controls); cap 25 controls per page at 1440. Bangla only on the 3 pages
with the most saves (Classes, People, Bookmarks).

**Detector fixed.** `REFUSED_EN`/`REFUSED_BN` now cover couldn't / could not / can't / cannot / failed / not saved / wasn't saved /
didn't save / refused / denied together with save / change / write, the code `permission-denied`, and the Bangla strings of
`bn.js` ("সংরক্ষণ করা যায়নি", "সংরক্ষণ হয়নি", "সংরক্ষিত হয়নি" …). The visible-text read also takes the text of every visible
`role=alert/status`, dialog, `[class*=error]` and `[data-bm-nav-error]` element. (Old pattern already matched "Couldn't save …"
in plain text; the shared menu's 🗑 was reported missing in the #1191 run because the menu pass was cut short by the cap and by
page and menu being mixed. Menu controls are now their own pass.)

**The shared menu is audited once**, on classes.html at 1440/en (Home, Modules, Operation, Bookmark, My account, Screensaver, Zab and
what opens from them; cap 40). On every other page those controls are listed as `MENU (audited on classes.html)`.

## Positive controls and mutation

| Check | Result |
|---|---|
| Shared Bookmark menu 🗑 "Remove bookmark: Ayat al-Kursi…" (classes.html) | **OK** — "Couldn't save the change: permission-denied", visible >= 2 s. I opened the page at that state and saw it in the open menu. |
| bookmarks.html Rename (en) | **OK** (2 found, 2 OK) |
| `--mutate=silent` on homework.html (message replaced by console.error only) | **caught** — 6 of 6 saves MISSING, exit 1 (the sweep can fail). (about.html, the default mutate page, has no saves, so homework.html was used.) |

## Per page

Seconds are for the page's whole run. "saves" counts each save control once per viewport/language run.

| Page | saves | OK | MISSING | MISLEADING | STUCK | s |
|---|---|---|---|---|---|---|
| Classes (en+bn, + shared menu) | 14 | 14 | 0 | 0 | 0 | 291 |
| Course offers | 8 | 8 | 0 | 0 | 0 | 41 |
| Curriculum | 12 | 12 | 0 | 0 | 0 | 60 |
| Backup | 0 | 0 | 0 | 0 | 0 | 16 |
| Import notes | 0 | 0 | 0 | 0 | 0 | 5 |
| Dawah | 0 | 0 | 0 | 0 | 0 | 42 |
| Onboarding | 2 | 2 | 0 | 0 | 0 | 14 |
| Accept invite | 0 | 0 | 0 | 0 | 0 | 4 |
| Monitor | 0 | 0 | 0 | 0 | 0 | 124 |
| Homework | 6 | 6 | 0 | 0 | 0 | 43 |
| People (en+bn) | 20 | 20 | 0 | 0 | 0 | 224 |
| Records | 4 | 4 | 0 | 0 | 0 | 45 |
| Catalogue | 12 | 12 | 0 | 0 | 0 | 150 |
| About | 0 | 0 | 0 | 0 | 0 | 5 |
| Bookmarks (en+bn) | 16 | 16 | 0 | 0 | 0 | 113 |
| Hadith collections | 0 | 0 | 0 | 0 | 0 | 193 |
| Landing | 0 | 0 | 0 | 0 | 0 | 205 |
| Notes | 0 | 0 | 0 | 0 | 0 | 5 |
| Journey map | 6 | 6 | 0 | 0 | 0 | 161 |
| Deen study | 4 | 0 | **4** | 0 | 0 | 31 |
| Arabic study | 0 | 0 | 0 | 0 | 0 | 5 |
| Self-check | 0 | 0 | 0 | 0 | 0 | 26 |
| Taglines | 1 | 1 | 0 | 0 | 0 | 173 |
| **Total** | **105** | **101** | **4** | **0** | **0** | |

(Totals are the sum of the rows. The 4 MISSING are two Deen study controls at two widths, one cause = **1 real defect**.
The suite ran in four foreground calls with `--page=`: pages 1–2, 3–8, 9–14 (Monitor…About), then 15–23.)

## Real failure (1)

### Deen study (and any page using `topic-study.js`): opening a topic when the auto-resume write is refused does nothing, silently
- **What I saw** (probe, 1440, refusal armed, click "Ethics" on deen-study.html, 3 s later): no `.topic-detail` pane, no message —
  the page looks unchanged; the console shows only the thrown `denied by the test`. Same on "Akhlaq" and at 390.
- **Cause:** `app/js/topic-study.js:411` `await touchResume(...)` (and `refreshContinueStrip()` at 416) is not in a try/catch although
  its own comment at 404–407 says "Best-effort … a failure here doesn't block studying". A rejected write aborts `openTopicDetail`
  before the detail pane is drawn. The click handler (`:387`) does not catch it either.
- **Smallest fix:** wrap lines 411–416 in `try { … } catch (err) { console.error(err); }` so the topic still opens (the resume marker
  is the best-effort part). Optionally also show the standard "Couldn't save the change" line.
- **Whose file:** shared (`topic-study.js`, used by Deen study; Arabic study uses it too).

## Pages with 0 saves — what I saw (a probe that finds nothing is a claim about the probe)
- **Notes** ("No Study Unit was given to this screen"), **Arabic study** ("Nothing under here yet."), **Dawah** ("You have no Dawah pages yet"),
  **Import notes** (needs a file first), **About** (read only), **Backup / Self-check** ("Make the backup", "Run self-check": reads, no
  write): none of these shows a write control in the harness's seeded state, so a save there is **not covered** by this run.
  Notes, Dawah, Import notes need a seeded Study Unit / page / file to reach their saves — worth a follow-up round with seeds.
- **Monitor**: report controls only (Week/Month, CSV, Print) — no writes.
- **Hadith collections** and **Landing**: 0 saves among the controls pressed, but the cap stopped the sweep (177 and 86 controls left
  unpressed at 1440; 44 and 64 at 390), so these two are **partially covered**. Taglines too (12 left at 390).
- Catalogue (10 left at 1440, 25 at 390), People (3 left at 390), Journey map (5 left at 390) are also capped.

Skipped everywhere: Sign out; "navigates away" controls (Back, Open on Bookmarks).
