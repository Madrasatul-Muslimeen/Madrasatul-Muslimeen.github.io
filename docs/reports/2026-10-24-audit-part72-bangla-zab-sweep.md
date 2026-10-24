# Audit part 72 — regression sweep of the `bangla-*` and `zab-*` suites (PCF MSA J29)

24 Oct 2026, run by the MSA Architect (session_01B9Hi1rr2d2qrrWup4feqnB) on `main` v12.54 (`ba9d2e12`), port 8080,
one suite at a time. Report and test-only: **no app file changed**, so no version.

| Suite | Before | After | Cause | Done |
|---|---|---|---|---|
| bangla-sweep-core-screens-browser | 112/0 | — | — | green |
| bangla-sweep-newer-screens-browser | 23/0 | — | — | green |
| bangla-sweep-other-pages-browser | 224/0 | — | — | green |
| bangla-sweep-v09146-surfaces-browser | 82/0 | — | — | green |
| bangla-translit-browser | 217/0 | — | — | green |
| bangla-dictionary-data | 35/0 | — | — | green |
| bangla-translit | 19/0 | — | — | green |
| bangla-two-piece-aa | 10/0 | — | — | green |
| zab-bar-browser | 370/0 | — | — | green |
| zab-data | 45/1 | 46/0 | stale | v12.38 (audit part 48) moved `import("./zab-bar.js")` into a deferred `mountZab()` inside `if (isZabReady() …) {`; the check wanted `isZabReady()` on the same line. Updated in place: the import must sit on a line calling `isZabReady()` or inside an if-block whose condition calls it and which is still open (running brace depth). Mutations: gate removed → FAIL; import moved outside a closed block → FAIL (the first draft, a net brace count, let this one through; fixed before commit). |
| zab-dock-browser | 72/2 | 74/0 | stale | the "covering none of the quick buttons" check (en and bn, 390px) counted the tablet-only `Study▾` menu button (`.rq-menu-btn`, added 23 Oct in 666fe0c4), which is `display:none` on a phone, 0x0: absent, not covered. Probe: Notes / Record / Approach all own their centre point; the corner sits 12px above them. Updated in place to count on-screen buttons only. `--mutate=lift` still fails both checks (72/2). |
| zab-dock-browser `--mutate=lift` | — | 72/2 | — | the guard still catches the corner covering the quick row |
| zab-kinds-browser | 324/0 | — | — | green |
| zab-lang-switch-browser | 20/0 | — | — | green |
| zab-to-note-browser | 195/0 | — | — | green |
| zab-tree-browser | 240/0 | — | — | green |

**Zab is pinned by QuranRevival**: no Zab app file was touched; both findings were in the checks, not the app.
**Totals:** bangla 722/0; zab 1,269/0 after (1,266/3 before).
