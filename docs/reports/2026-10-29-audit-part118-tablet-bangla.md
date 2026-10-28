# Audit part 118 — the tablet audit in Bangla, 23 shared pages × 4 widths (PCF MSA J29, issue #1272)

## What changed in the suite

`tools/i18n-verify/shared-pages-tablet-audit-browser.mjs` (part 97):

- Viewports are now **768×1024, 820×1180, 1024×768 and 1180×820** for both languages (1180 landscape was missing).
- Bangla now runs on **all 23 pages** at all four widths (it was 3 pages at 768). The "top 3 by controls" pre-pass is gone.
- Default run covers **both** languages (English, then Bangla). `--lang=bn`, `--lang=en` or `--no-bn` choose one.
- **Positive control (as part 117):** each Bangla page/width first checks the body really contains Bengali script (`[ঀ-৿]` count > 0).
- The shared top menu's four panels (classes.html) are now measured in Bangla too; their screenshots carry a `-bn` suffix.
- The `wheelListCollapseBtn` KNOWN entry (QR's 24px button, invisible 40px tap area) no longer says "en only": it occurs at 1024 and 1180 in both languages.

## Findings BEFORE any fix (suite widened, nothing else changed)

Bangla, 23 pages × 4 widths, with `REAL_SEED`: **924 passed, 0 failed.**
Sideways / clipped / cut / overlap / small: **0 on every page and width**, except the two already-KNOWN Landing entries
(QR's wheel buttons `#wheelCtaBtn` 119×28 / 117×28 / 135×30 and `#wheelListCollapseBtn` 24×24, each with an invisible 40px tap area; both frozen, Quran/QR-owned).
Landing's study-menu state is "covered by design" in Bangla as in English. English at the new 1180 width: 916 passed, 0 failed.

So the widened pass found **no defect** in shared code; no page file or shared CSS/JS was changed. Nothing is listed for the Architect from frozen or module files beyond the two known QR wheel buttons.

## Fixes

None needed. The only changes are to the check (above); none was a stale assertion.

## After (final totals)

- Default run (both languages), pages 1–12: **984 passed, 0 failed**. Pages 13–23 were run in Bangla (924 passed, whole set, before the menu extension) and in English (916 passed, 0 failed).
- Classes in Bangla after the menu extension: 120 passed, 0 failed.
- `--mutate=wide` still fails in both languages: English "Classes / 768: sideways … scrollWidth 1216 > 768" (63 passed, 1 failed), Bangla the same (71 passed, 1 failed).
- `behaviour.mjs` alone: **971 passed, 0 failed.**
- `bn-duplicate-keys.mjs`: 6 passed, 0 failed.
- `shared-pages-keyboard-audit-browser.mjs`: **506 passed, 0 failed.**

## Screenshots looked at (Bangla)

- **Taglines at 820×1180** (61 controls): all Bangla labels, the top menu, the options card and the lines table render without overlap or cut text. The lines table is wider than the screen, so its last columns (the "only this…" column) are cut at the right edge; it sits inside its own sideways scroller, which the suite treats as reachable, as in English. The Zab bar and the Back pill sit over the foot of the page as usual.
- **Curriculum at 1180×820** (33 controls): the 4 menu buttons span the column, the form's fields and the Bangla labels all fit with room to spare; the Bangla heading and help paragraph wrap cleanly. Nothing cut or overlapping.

(An unseeded English folder/surah name appears in Journey map and Curriculum lists because the seed data is English-only; this is the fixture, not the app.)
