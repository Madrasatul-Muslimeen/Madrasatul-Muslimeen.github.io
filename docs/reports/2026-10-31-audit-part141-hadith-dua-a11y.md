# Audit part 141 — keyboard, screen-reader names, opened surfaces and contrast on Hadith Study and Dua Study

PCF MSA J29, issue #1357. **REPORT ONLY: no file under `app/` was changed** (nor `version.js`, `CLAUDE.md`, `CHANGELOG.md`, rules, workflows).
Suite: `tools/i18n-verify/hadith-dua-a11y-browser.mjs`. Date written: 30 Oct 2026 (file dated 31 Oct per the issue).

## What was measured

Pages `app/hadith-study.html` (18 views, 5 surfaces) and `app/dua-study.html` (19 views, 9 surfaces), at 360, 390, 768, 1024 and 1440 px, English and Bangla,
with the part-126 real-length seed (copied from the large-text suites). "Views" are the page as it opens plus every state a reader can open; "surfaces" are
the things Enter / Space / Escape are tried on.

- **Hadith views:** the page as it opens (Books shelf); Books quick list; Bukhari chapters; a narration; Subjects menu; a subject; Encyclopedia list; a
  hadith card; the card with its 👥 list; Topics; Search; Explore; Classical Explanations; the Duas list; a Dua word card; the Dua ✓ Check panel; Dua chapters
  (books); a book's Dua chapters.
- **Dua views:** the page as it opens; groups menu; Occasions part tiles; an Occasions part; the parts menu; Hadith Books part; Dua of Prophets; an empty
  group; a Dua Card; pop-ups Meaning / Source / whole narration / ✓ Check / 🖼 Poster / Copy-share; the ✓ Check panel; a Hisn al-Muslim card and its Source
  pop-up; a Prophets' card. (The Person picker is a native `<select>`, `#personSelect`; Dua Study has no 👥 button on any of these views.)
- **(a) names:** every visible button, link, select, input, summary: accessible name by aria-labelledby → aria-label → label / placeholder → content
  (img alt, svg title) → title. In bn a name with a Latin word is DEFECT only if a word of the pages' own chrome vocabulary stands in it (short names); the
  rest (book titles, HadeethEnc / OpenITI, language names, a dua's own English text) is printed to the findings json as a "triage" list and was read by hand.
- **(b) keyboard:** a **real** Tab walk (Playwright key presses) from the top of the document, each stop's computed `outline` / `box-shadow` read; "reach" is
  judged on the live DOM at the end (every visible control must have been focused). Surfaces: focus the opener, press **Enter**, expect the surface;
  press **Escape**, expect it closed and focus back on the opener; press **Space**, expect it open again.
- **(c) contrast:** every element with its own text, colour against its REAL background: ancestors walked to the first opaque layer, translucent layers
  composited, an element's own and its ancestors' opacity applied; a **gradient is measured at every colour stop (worst case)**; a picture background is
  "not measurable" and listed. 4.5:1 normal, 3:1 large (≥24 px, or ≥18.66 px bold). Arabic counts. Focus rings need 3:1 (an author-set outline or
  box-shadow; the browser's own `auto` ring is a two-colour ring that is visible on any background and is not scored).

## Result in one table

| | Hadith Study | Dua Study |
|---|---|---|
| (a) control with no name | **none**, any view, width, language | **none** |
| (a) English chrome name in bn | **none** (triage list: all data / proper nouns) | **none** (4 triage entries: dua's own English meaning, a source credit) |
| (b) visible control Tab cannot reach | **none** | **none** |
| (b) focused control with no ring | **none** | **none** |
| (b) Escape cannot close an opened surface | **3 DEFECTS** (H2, H3, H4) | **1 DEFECT** (D2) |
| (b) Enter / Space do not open | none | none |
| (c) text under its ratio | **1 DEFECT** (H1) | **1 DEFECT** (D1: 3 lines, 2 pop-ups) |

Seven findings are DEFECTS; the Hadith and Dua leads each get their own list below. Each defect is identical at every width and in both languages
(the `where` column in the suite's printout is `360en … 1440bn` for every one).

## DEFECTS

### Hadith Study (the Hadith Lead)

**H1 — Contrast: the book title in a book's Dua chapters is cream on white (1.22:1).** View: Dua tab → "Dua chapters" → a book (e.g. Sahih al-Bukhari).
`h3.hadith-row-name "Sahih al-Bukhari"`, `#f2e8d5` on `#ffffff`, 18.72 px bold (needs 3:1 as large text, 1.22:1 measured), 360–1440, en and bn. The title is
effectively invisible. Cause: `app/css/card-look.css:198` makes every `.hadith-row-name` the night card text colour (cream), but `app/js/dua-browser.js:70`
puts the book's title in a plain `<h3 class="hadith-row-name">` that sits on the bare white page, not on a dark row. **Smallest fix:** in
`app/js/dua-browser.js:70` stop using the `hadith-row-name` class for this heading (use a new class such as `dua-book-heading` with no colour of its own,
so it inherits the page text colour); one line plus nothing else.

**H2 — Escape does not close the 👥 "who is this for" list** (Encyclopedia hadith card; the same control is on other cards). Enter on `button[data-assign-trigger]`
opens `[data-assign-popover]`; Escape leaves it open, focus stays on the button. The component (`app/js/assign-picker.js`) has no Escape handler.
`assign-picker.js` is a **shared** part (Notes / people tools), so this goes to the MSA Architect, who passes it to the Hadith Lead. **Smallest fix:**
in `app/js/assign-picker.js` add a `keydown` Escape handler on the picker root that closes the popover, sets `aria-expanded="false"` and focuses the
trigger (the `hadith-browser.js:321` menu handler is the shape to copy).

**H3 — Escape does not close a Dua word card** (Dua tab: Enter on `span[data-dua-word]` opens `[data-dua-word-panel]`; Escape does not close it).
File: `app/js/dua-browser.js`. **Smallest fix:** a `keydown` Escape listener while the panel is open that removes / hides it and focuses the word that opened it.

**H4 — Escape does not close the ✓ Check panel** (Dua tab: Enter on `button[data-dua-check-open]` opens `[data-dua-check-panel]`; Escape does not close it).
Files: `app/js/dua-check.js` (the panel) / `app/js/dua-browser.js` (its opener). **Smallest fix:** the same Escape listener, closing the panel and
focusing `[data-dua-check-open]` for that dua.

### Dua Study (the Dua Lead)

**D1 — Contrast: two notes in the Poster and Copy/share pop-ups are 1.92:1.** `p.hadith-note "This dua's own meaning in English and Bangla…"` (Poster and
Share pop-ups) and `span.hadith-note "Prints on one A4 page."` (Poster), `#5f6470` on the pop-up card's `#2a3a57` (night look), 13.92 px, in en and bn.
Cause: `app/css/hadith.css:119` gives `.hadith-note` the light-theme muted colour; the night-look override at `hadith.css:472` is scoped to `.hadith-pane-body`
and the pop-up (`.dua-popcard`, `app/css/dua-study.css:106`) is not inside one. **Smallest fix:** add to `app/css/dua-study.css`
`[data-card-look="night"] .dua-popcard .hadith-note { color: var(--card-text); }`. (Every other pop-up, and the page itself, passed.)

**D2 — Escape does not close the ✓ Check panel.** ✓ Check (pop-up) → "Check this dua" opens `[data-dua-check-panel]` under the card and closes the pop-up
(by design, `dua-study.js:464`); after that Escape does nothing — the panel's own keydown handling is missing (the pop-up's `esc` listener was removed with the
pop-up). Focus is correctly on `button[data-dua-menu=check]`. **Smallest fix:** in `app/js/dua-study.js` (or the shared `app/js/dua-check.js` panel) add the same
Escape handler closing the panel and focusing `[data-dua-menu="check"]`.

## MINOR (printed as INFO)

- **M1 — Dua Study pop-ups are `aria-modal` but not trapped.** With any Dua pop-up open (Meaning, Source, whole narration, ✓ Check, Poster, Copy/share),
  Tab goes on to **46** controls of the page behind it (10 behind the Hisn Source pop-up). Focus does start in the pop-up (✕ Close) and Escape closes
  it, so a keyboard user is not stuck; but a screen-reader user in a modal dialog should not meet the page behind. **Fix (words):** in `app/js/dua-study.js`
  `openPop()` set `inert` on the page's other children while the pop-up is open and remove it in `closePop()`. (Classed MINOR by the issue's grouping;
  the Dua Lead may judge it more.)
- **M2 — Tab order** has backward visual jumps (the next stop is more than 40 px higher than the previous, fixed Zab bar ignored): Hadith book chapters
  14–20 (360–1440), Hadith narration 1 (360) / 27–34 (768–1440, the Arabic words and per-passage controls), Books quick list 1–2, Subjects menu 1; Dua groups
  menu 1 and parts menu 1–2. Cause **not** root-caused: they are DOM-order-versus-layout, not missing stops. Worth a look by each Lead at the narration view
  first; nothing is unreachable.
- **M3 — Weak but present ring:** the Hadith Dua word button (`span[data-dua-word]`, the word that is focused in the open word card) has a 2 px
  `rgb(184,134,47)` outline at **2.63:1** on its background (needs 3:1). Hadith / Dua `hadith.css` focus style; a darker gold (≥ 3:1) is the fix.
- **M4 — Focus not returned:** none observed. (Where Escape worked, focus returned to the opener; the four surfaces where Escape fails are the DEFECTS above.)
- **M5 — Bangla reader meets English data, not chrome:** on Dua Study in bn each list row's name starts with the dua's own **English** meaning text
  (`৮O Allah, forgive my past…`) because the row carries the English meaning; that is content, not chrome, so it is not a defect here, but the Dua Lead may want
  the row to carry a Bangla meaning where one exists. The Hadith pages' Latin names are book titles, "HadeethEnc", "OpenITI (CC BY-NC-SA 4.0)", the
  language picker's own language names, and the synthetic fixture ids (`synthetic-alpha-ar-v1`) that the pages print by design.
- **Not measurable (INFO):** a few headings on a `url()` picture background are listed in the findings json; none could be scored.

## Positive controls and the mutation

Run at the start of the suite (Dua page, 360 en), all pass: an injected **unnamed button** is reported as having no name; an injected **`tabindex=-1` button**
is reported unreachable by Tab; an injected **grey-on-grey line** (`#999` on `#aaa`) is reported under 4.5:1; the same page without the injection has none of
the three; the Tab walk really moved (reached nearly every expected control); with the focus outline and shadow stripped, every reached control is reported
ringless, and with the page as it is, they are not. Each surface check also has its own control ("the surface is closed before it is opened", "the opener
exists"). **`--mutate=noring`** (page-wide `*{outline:none!important;box-shadow:none!important}` added after load) **FAILS**: on Dua 390 en
`opens` and `card`, every focused control is reported "no ring" (50+ per view), exit 1.

## What the screenshots show (I looked at both)

- **Hadith Study 390 bn, Topics opened, a control focused** (`out/hadith-dua-a11y/hadith-topic-390-bn.png`, not committed: `out/` is git-ignored). The Bangla page
  with the red "synthetic development data" banner, the four nav menus (হোম / মডিউল / পরিচালনা / বুকমার্ক), the dark tab strip with "বিষয়সমূহ" (Topics)
  selected in a gold outline, and two dark topic rows ("নামাজ", "ওজু"). The focused control is the **"মডিউল" menu (`summary`)**, drawn with a thick black
  ring that is plainly visible against the white page. All chrome is Bangla; the topic rows print their synthetic id in Latin below the Bangla name (by design).
- **Dua Study 768 en, a Dua card open and the ✓ Check panel focused** (`out/hadith-dua-a11y/dua-check-panel-768-en.png`). The dark card's Arabic text, the
  menu buttons (Meaning, Source, The whole narration, ✓ Check, 🖼 Poster, Copy / share), the green "Not started" progress state and My Notes / Bookmark,
  and under it the ✓ Check panel ("← Back to Dua 1", "Check Dua 1", steps "1 · Narrations / 2 · Words / 3 · Save"). The focused control is the **"1 · Narrations"** step,
  drawn with a white double ring that stands out on the dark navy. Text is readable throughout; the page itself passes contrast.

## Runs (all in the foreground; one browser suite at a time)

| Run | Result |
|---|---|
| Dua 360 / 390 / 768 / 1024 / 1440, en + bn, with surfaces | 283 passed, 6 failed each (the 6 = D1 ×4 and D2 ×2, in the two languages) |
| Hadith 390 en, 390 bn (no surfaces + a surfaces run in en) | 105 passed, 4 failed; 109 passed, 1 failed (no surfaces, bn) |
| Hadith 360 (no surfaces) | 199 passed, 2 failed (H1 only) |
| Hadith 768 / 1024 / 1440, en + bn, with surfaces | 227 passed, 8 failed each (H1 ×2, H2, H3, H4 ×2 languages) |
| `--mutate=noring` (Dua 390 en, `opens`,`card`) | 15 passed, **2 failed** (as required) |
| `stub-parity.mjs` | 4 passed, 0 failed |

The suite is therefore RED on `main`'s present pages by design (it fails on defects). It prints the MINOR findings as INFO and is not yet in any workflow.
Hadith's 360 run excluded surfaces only to save time; 390–1440 ran them and the surface verdicts did not change with width.

## For the Architect

- Fixes are the Leads' (H1, H3, H4, D1, D2, M1–M3); **H2 is in the shared `assign-picker.js`**, so it comes to the MSA Architect first.
- Re-run after a fix: `node tools/i18n-verify/hadith-dua-a11y-browser.mjs --page=hadith|dua [--width=390] [--lang=bn] [--views=…]`; `--list` prints every
  finding including the bn triage list; `--shots` saves the two screenshots.
- Things this suite does **not** do: it does not test arrow-key behaviour inside the tab strip, native `<select>` option pickers, or the Zab bar's own
  menus (audit parts 133 / 140 cover those); the focus-ring contrast is scored only for author-set rings.
