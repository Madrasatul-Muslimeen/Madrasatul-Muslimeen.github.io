# Audit part 67 — regression sweep of audit suites 31–38 (PCF MSA J29, issue #1117)

| Suite | Before | After | Failures: cause and action |
|---|---|---|---|
| audit-part31-accessible-names-browser | 650 pass / 5 fail | 655 / 0 | 5 × bn "opened menus: no English aria-label": `button.nav-bm-del` label is "<Bangla>: <bookmark's own saved name>" and the fixture's name is "Ayat al-Kursi". Stale/wrong assertion (user data judged as chrome). Check now judges only the words before ": " for `.nav-bm-del`. |
| audit-part32-opened-surfaces-browser | 896 / 0 | 896 / 0 | none |
| audit-part33-keyboard-focus-browser | 706 / 0 | 706 / 0 | none |
| audit-part38-landscape-zoom-motion-browser | 502 / 1 | 503 / 0 (records zoom run: 6/0; mutation `recordstable` 5/1) | en zoom 640x450 records "no sideways scroll": records table 642px wide at a 640px screen, because the scroll-in-own-box rule stopped at 600px. **Real defect**, fixed: `app/records.html` rule now `max-width: 700px`. Mutation `recordstable` (re-added) restores 600 and fails 1. |
