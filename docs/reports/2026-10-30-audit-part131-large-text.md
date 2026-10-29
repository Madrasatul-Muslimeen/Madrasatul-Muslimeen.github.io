# Audit part 131: the 23 shared pages with enlarged text (150% and 200%)

PCF MSA J29, issue #1318. **Report only: no `app/` file changed.** Suite: `tools/i18n-verify/large-text-shared-pages-browser.mjs`.

## Method

- **Pages:** the 23 shared pages of `shared-pages-bangla-layout-audit-browser.mjs` (audit part 92). The part-126 file named in the issue does not exist under `audit-part126*`; part 126 is `shared-tools-long-names-browser.mjs`, whose real-length seed (35-character Bangla person name, long folder / bookmark / note names) is reused. The reach method is `floating-overlays-reach-browser.mjs`'s.
- **Widths** 360, 390, 768; **languages** en, bn; **sizes** 100%, then `document.documentElement.style.fontSize = '150%'`, then `'200%'` on the same loaded page. The fixture was 138 page loads plus 276 loads for the reach pass.
- **Kinds recorded:** cut (ellipsis / clipped text with no title; a `<select>` whose chosen option is cut), overlap (two non-nested, non-fixed controls whose boxes intersect, including the 🧰 Zab bar), offscreen (control past the screen with no scrolling ancestor), sideways (the page itself scrolls sideways; controls are then reachable but only by a sideways scroll), small (<36px), reach (never returned by `elementFromPoint` at any scroll stop, with the ← ✕ pill shown), fixedpx (text whose computed size did not grow with the root).
- Only findings NEW at 150%/200% (absent at 100% on the same element) are listed below. The counts "x/y/z" are findings at 100/150/200 summed over 3 widths x 2 languages.

## Fixed px or rem?

The pages use `rem`/`em` almost everywhere: on all 23 pages the ONLY text that did not grow was the **🧰 Zab button** (the corner 🧰 at 22px on phones, "🧰 Zab" at 14px on tablet): 1 of 11 to 1 of 56 text elements per page, 138 of 138 page/width/language combinations. Everything else scales.

## Summary by page (findings at 100 / 150 / 200%)

| Page | cut | overlap | offscreen | sideways |
|---|---|---|---|---|
| classes | 3/4/5 | 0/0/2 | 0/0/4 | 0/0/2 |
| course-offers | 0/0/0 | 2/1/3 | 0/0/8 | 0/0/4 |
| curriculum | 8/8/11 | 2/2/1 | 0/2/7 | 0/2/4 |
| backup | 0/0/0 | 0/1/0 | 0/0/0 | 0/0/0 |
| import-notes | 0/0/0 | 0/0/0 | 0/0/1 | 0/0/1 |
| dawah | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 |
| onboarding | 0/0/0 | 0/0/1 | 0/0/2 | 0/2/4 |
| accept-invite | 0 | 0 | 0 | 0 |
| monitor | 0/0/0 | 2/0/1 | 0/0/0 | 0/0/0 |
| homework | 2/7/9 | 3/2/2 | 0/0/15 | 0/0/4 |
| people | 0/4/4 | 0/1/0 | 0/0/3 | 0/0/1 |
| records | 0/0/0 | 0/0/2 | 0/10/34 | 0/3/6 |
| catalogue | 0 | 0 | 0 | 0 |
| about | 0/0/0 | 0/0/1 | 0/0/0 | 0/1/4 |
| bookmarks | 0/3/38 | 2/1/1 | 0/0/0 | 0/0/0 |
| hadith-collections | 0/0/1 | 3/2/3 | 0/1/1 | 1/1/1 |
| index (front page) | 0/2/4 | 16/36/52 | 0/6/14 | 0/4/4 |
| notes | 0/0/0 | 0/2/2 | 0/0/0 | 0/0/0 |
| journey-map | 0/0/0 | 0/2/0 | 0/0/4 | 0/0/4 |
| deen-study | 2/2/5 | 0/0/2 | 0/0/0 | 0/0/0 |
| arabic-study | 2/2/5 | 0/0/2 | 0/0/0 | 0/0/0 |
| admin-self-check | 0 | 0 | 0 | 0 |
| taglines | 15/21/23 | 16/8/5 | 0/0/12 | 0/0/4 |

"small" (under 36px) did **not** change with text size on any page (e.g. people 36/36/36, course-offers 60/60/60): it is the existing small-control debt (checkbox/radio inputs and small buttons), not a large-text defect. Reach: 31 of 204 page/width/language/size combinations have a never-reachable control (below).

## Numbered findings (all INFO; none fixed)

Owner of each: **S** = shared page (the Architect's). None is inside Hadith/Dua except #20.

1. **S. Every page, 768 wide, 150% and 200%: the 🧰 Zab bar covers page controls.** Seen on classes (subject checkbox), course-offers (day checkboxes), curriculum (unit order input), backup ("Make the backup", 150%), monitor ("📥 Download CSV", 200%), homework (instructions box, subject select), people (name input), records (reference input), onboarding (week-start select), about (acknowledgement link, bn), bookmarks ("Retire", 150%), notes ("Edit" / "সম্পাদনা"), journey-map (tag-name input), deen-study and arabic-study (topic rows), taglines (preview button, speed input), hadith-collections ("Hadith Books" crumb). A reader sees the bar painted over the control. It should reserve space, or sit where it cannot cover content.
2. **S. The 🧰 button does not grow with the text** (22px phone corner, 14px bar on tablet) on all 23 pages: it becomes the smallest thing on the page for a reader with larger text. It should scale with `rem`.
3. **S. index.html (front page), 360/390/768, 150% and 200%: the fixed bottom dock (Approach / Study / Explore / Mapping My Journey) covers the wheel controls** (Wheel▴ / Legend▴ / Unit▴, "Know Your Status", the folder group buttons, "Open all"). Worst case screenshot: 360 bn 200%. The first dock row paints over the "Know Your Status" button and the drawer row, and "🧰" and the word card text overlap. Reach: Unit▴, Legend▴, 🧰, Explore, Mapping My Journey are never reachable at some width/size (index 360 en 200%: 5 controls). This page belongs to Quran Study (the QR Lead's, frozen): send to the PCA as a change request, do not fix here.
4. **S. index.html at 360/390, 150% and 200%: the page scrolls sideways** (scrollWidth 440 at 150%, 584 at 200%).
5. **S. records.html, 360/390, 150% (en) and 200%: the whole "claim a status" form is wider than the screen** (scrollWidth 382 at 150% en, 513 at 200%): subject, approach, unit type, reference, status, domain and note boxes span 45..363 / 59..488 on a 360px screen. Screenshot (360 bn 200%): the form and card fit, but the entries and weekly tables are clipped at the right edge ("দাবি ক…", "অর্জিত", the weekly "অ…" column), so some columns show only their first letters.
6. **S. records.html at 768, 150% and 200%: "Confirm", "Return", "Confirm anyway" are pushed to x 881..1299 (past 768) and are never reachable** (reach pass, en 150/200 and bn 200). The page scrolls sideways to 987 / 1315, but the buttons are the whole point of the table.
7. **S. homework.html 360 (200%), 390 (200%): the form is wider than the screen** (scrollWidth 404), with 15 inputs/selects past the edge; "Create assignment" spans 59..366. The "(none — any visible person)" select is cut from 150% (needs 284px, has 226px at 360). Screenshot (360 bn 200%): the select and note-about select visibly show a cut name; the person list wraps correctly.
8. **S. homework.html: "Write about" person select cut** in bn at 200% (needs 328px, has 191px at 360).
9. **S. people.html, 360/390, 150% and 200%: the chosen person in the "study person" select is cut** (a 35-character Bangla name needs 346px, has 188px at 200%; the English long name needs 470px).
10. **S. people.html 360 bn 150% and 390 bn 150%: "লিংক কপি" and the three "সংরক্ষণাগারে রাখুন" buttons are never reachable** (covered by the pill / off the scrolling table). At 768 en 200% the Archive buttons are at 680..801, past the screen; the page scrolls sideways (819).
11. **S. classes.html 360/390, 150%/200% bn, 200% en: the enrol-person select is cut and the row is wider than the screen** (sideways 379). The role select is also past the edge.
12. **S. course-offers.html 360, 200% (both languages): the create form (offer name, dates, notes) spans 59..379 and the page scrolls sideways** (404 also at 390).
13. **S. curriculum.html 360/390, 150%/200%: a long resource link (`https://example.org/lesson`) is not wrapped and pushes the page sideways** (365 at 150%, 486 at 200%); bn 200%: the person, ladder, level and date fields in "grades" span past the screen; the grade-person select is cut (needs 328px, has 245px).
14. **S. onboarding.html 360/390, 150% en: the page scrolls sideways (433 wide); at 200% en 556**: the radio row ends at 393 on a 360px screen. bn 200% 405.
15. **S. about.html 360/390 en 200%, 768 en 150%/200%, 768 bn 200%: the page scrolls sideways** (401 at phone, 1030 at 768 en 200%): a long unbroken acknowledgements link. bn 150% at 360/390: the "Qura…" and "OpenITI" links are never reachable with the pill.
16. **S. bookmarks.html 360, 150% and 200% (both languages): the "No one in particular" person-tag select is cut on every folder and bookmark row** (needs 236px, has 107..211px; 38 occurrences at 200%). The folder-name selects already carry the full name as a title (part 126); this one does not.
17. **S. import-notes.html 360 en 200%: the source select is past the edge** (373 on 360).
18. **S. journey-map.html 360/390 200%: the page scrolls sideways** (414 en, 403 bn). *Architect review, 30 Oct:* also at **360 bn 150%** (page 362 wide: the folder search box spans 24..362), steady in three runs; the batches had missed it, so journey-map is no longer in the suite's "zero at 150%" lists for offscreen and sideways.
19. **S. taglines.html (admin), all widths: the "Save" bar overlaps the form fields** (360 bn 150%: the motion select overlaps Save by 103x46; 768 bn 200%: the scroll-speed input overlaps Save by 145x40) and **5-8 inputs, selects and "Yes" buttons are never reachable with the pill** at 150%/200% (reach pass). 15 cut at 100% already.
20. **Hadith (its Lead's): hadith-collections.html 768 200%: the "Hadith Books" crumb is covered by the Zab bar** (finding 1). No Dua-page finding was in scope (the list is the 23 shared pages).
21. **S. deen-study / arabic-study 768 200%: topic rows are covered by the Zab bar** (finding 1) and 2 cut at 100% grow to 5 at 200%.
22. **Fixed-px summary:** only the Zab button (finding 2).

### The three worst, looked at (360 bn 200% screenshots, `tools/i18n-verify/out/large-text/`, not committed)

1. **index.html:** the dock's four tab buttons sit on top of the "Know Your Status" button and the Wheel / Legend / Unit row; the "Take an Approach" button text overlaps a smaller label; the toolbox bubble sits over the end of the row. The wheel itself is a dark column and the page below is empty white.
2. **records.html:** the claim form fits the phone (fields use the full width), but the entries table and the weekly table are cut at the right edge, with Bangla column headings cut to a few letters and a weekly row broken into one-letter lines.
3. **homework.html:** the form is readable, but its "context" select shows a cut value and the whole page is 404px wide on a 360px screen; the long-name checkboxes wrap correctly.

## What a reader should see instead

Larger text should reflow, not clip: selects should show their full chosen value (a `title` or wrapping), forms should stay inside the screen width (`min-width: 0`, `overflow-wrap: anywhere` on long links), wide tables should sit inside a sideways scroller, and the Zab bar and dock should reserve space for themselves rather than paint over controls.

## Checks the suite carries (all pass)

- Positive controls at 100% on injected elements: an over-long ellipsis button is measured as cut; two overlapping buttons as overlap; a 20px button as small; a button past the right edge as offscreen; the same page without the injection has none; at 150% the root is 24px, an injected fixed-px text is reported as not growing and an injected rem text is not.
- Per page a "rendered text" control, and for each kind the pages measured at zero at 150% on all widths and languages must stay at zero (cut: 14 pages, overlap: 12, offscreen: 19, sideways: 17). Defects print as `INFO`.
- Mutations (put a defect in; the matching check must fail): `--mutate=cut` 6 failures, `--mutate=overlap` 6, `--mutate=offscreen` 12.

Results of the runs: large-text suite batches 44 + 56 + 62 passed, 0 failed (before the per-page checks were added); with them, four pages 116 passed, 0 failed. `behaviour.mjs` alone: **972 passed, 0 failed**. `stub-parity.mjs`: **4 passed, 0 failed**.

## Architect review (30 Oct 2026)

The full one-go run of all 23 pages, which the round could not repeat: **516 passed, 2 failed** — both journey-map 360 bn 150% (offscreen, sideways), steady when re-run alone (twice). Corrected as finding 18 above and in the suite; after the correction the run is clean.

## Not done

Pass counts for the three batches were taken before the per-page checks were fixed in; the final run of all 23 pages in one go was not repeated (time). The reach pass used the `?navBack=1` pill only; the offline-save notice and the read-failure box were not added.
