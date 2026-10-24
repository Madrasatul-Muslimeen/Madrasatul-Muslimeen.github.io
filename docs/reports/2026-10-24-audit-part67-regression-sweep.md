# Audit part 67 — regression sweep of audit suites 31–38 (PCF MSA J29, issue #1117)

Final checks: `stub-parity.mjs` 4/0; `bangla-sweep-other-pages-browser` 224/0; `navcheck.mjs` clean. The full part-34 suite was not re-run end to end after the monitor fix (only its 820 monitor flow and the 390 flows); the earlier full run after the nav fix was 1289/1 and the one failure is the monitor case now fixed.

| Suite | Before | After | Failures: cause and action |
|---|---|---|---|
| audit-part31-accessible-names-browser | 650 pass / 5 fail | 655 / 0 | 5 × bn "opened menus: no English aria-label": `button.nav-bm-del` label is "<Bangla>: <bookmark's own saved name>" and the fixture's name is "Ayat al-Kursi". Stale/wrong assertion (user data judged as chrome). Check now judges only the words before ": " for `.nav-bm-del`. |
| audit-part32-opened-surfaces-browser | 896 / 0 | 896 / 0 | none |
| audit-part33-keyboard-focus-browser | 706 / 0 | 706 / 0 | none |
| audit-part34-keyboard-spacing-browser | 1259 / 31 | 1290 / 0 (rerun 1289/1 before the monitor fix, then monitor 820 run 14/0) | 30 × en 390x844 "no text is cut" / "nav label uncut" on every page: under 1.4.12 text spacing "Operation"/"Bookmark" need 89px of an 83px equal cell. **Real defect** (shell.css): the content `flex-basis` (v08.26) stopped at 340px; now `max-width: 420px`. Mutation `navbasis` fails 4 (on notes + import-notes at 390). `navcheck.mjs` clean at 320–768 en/bn. 1 × en 820x800 monitor "no sideways scroll": report table 867px under text spacing. **Real defect**: `app/monitor.html` scroll-in-own-box rule `max-width: 900px` (was 600). Mutation `monitortable` fails 1. |
| audit-part36-contrast-browser | 1184 / 0 | 1184 / 0 | none |
| audit-part38-landscape-zoom-motion-browser | 502 / 1 | 503 / 0 (records zoom run: 6/0; mutation `recordstable` 5/1) | en zoom 640x450 records "no sideways scroll": records table 642px wide at a 640px screen, because the scroll-in-own-box rule stopped at 600px. **Real defect**, fixed: `app/records.html` rule now `max-width: 700px`. Mutation `recordstable` (re-added) restores 600 and fails 1. |
