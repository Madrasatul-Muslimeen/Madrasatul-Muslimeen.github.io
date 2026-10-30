# Dua Lead: audit part 138 fixes (D1–D6), 30 Oct 2026

Findings from `docs/reports/2026-10-30-audit-part138-dua-study-large-text.md`, measured with its own suite
(`large-text-dua-study-browser.mjs`) before and after. Branch `claude/dua-audit138` from `main` (v12.130). No version taken.

| Finding | Cause | Fix | After |
|---|---|---|---|
| D1 Dua words overlap 2px at 150/200% | A word's own box is ~2.04× its font size in this Arabic font; `.dua-words` line height was 2 | `line-height: 2.1` (unitless, grows with the text), `hadith.css` | worst overlap 0.81 / 2.19 / 2.59px → 0 at 100/150/200% |
| D2 Occasions tiles past a 360/390 screen at 200% | grid column `minmax(13rem, 1fr)` | `minmax(min(13rem, 100%), 1fr)`, `dua-study.css` | gone at 360 en, 390 bn |
| D3 parts menu widens the page (768, 1024) | pull-down `width: max(100%, min(22rem, 92vw))` | as wide as its own button, names wrap | gone at 768 and 1024 |
| D4 ✓ Check panel cut at 200% | the member box's one grid column took its widest content (228px in 189px) inside the frame, which clips | `grid-template-columns: minmax(0, 1fr)`; its buttons and head wrap (`hadith.css`) | frame 301 > 284 → 284 = 284; findings gone |
| D5 an open pull-down covers the list | it is a pull-down (Esc or a tap outside closes it) | on opening it is shortened to end inside the screen and scrolls within itself (`dua-study.js`) | the "covered while open" reach items stay, by design |
| D6 the Poster's text does not grow | by design: the preview is a picture of the A4 page, its text sized to the page's width (`cqw`) so it matches the print; the switches and buttons around it do grow | none | – |

D1 and D4 change rules Hadith Study's own Dua tab shares (it is Dua's code there): its suites are green.

Measured after: the audit suite 120/0 at 360 en, 390 bn, 768 en and 1024 en, with no D1–D4 finding left (A1, A2 and
the Person picker are the Architect's). Dua suites: dua-study-page 137/0, dua-card-r2 126/0, dua-poster-r3 82/0,
dua-tab 63/0, dua-check 49/0, dua-words 37/0, dua-word-card 45/0, dua-word-links 48/0; apps-build-check 48/0.
