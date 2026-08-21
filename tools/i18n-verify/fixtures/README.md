# Test fixtures

`mushaf-pages.json` — pages **50 and 51** of the real 604-page Madani Mushaf
layout, lifted verbatim from
`mushaf/mushaf-madani-v2.json` on the production site. The whole file is 2.8MB;
these two pages are 9KB, and they are the ones surah 3 starts on, which is why
the Mushaf checks in `behaviour.mjs` open surah 3.

**The page glyph font is NOT checked in.** `hifz-renderer.js` only justifies a
page once its real font is confirmed loaded, so a test that skips the font
skips the very thing it is measuring. The suite serves one of the app's OWN
bundled Arabic faces (`app/fonts/*.woff2`) in its place: a real, loadable
woff2, so `FontFace.load()` resolves and justification runs for real. The
glyphs it draws are the wrong ones — those page fonts map private-use
codepoints — but every width being measured is real, which is what these
checks are about. Do not "fix" this by adding a 122KB binary per page.
