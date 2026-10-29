# Audit part 112 (SECURITY): typed Resource text escaped, typed links only open if web or mail

PCF MSA J29, audit part 112. Builder round for issue #1257.

## Fixed

| Place | Change |
|---|---|
| `app/js/html-escape.js` | Holds `escapeHtml` (same body as part 111) and the new `safeHref(url)`: returns the url unchanged for `http:`, `https:`, `mailto:` (any case; leading/embedded control characters and whitespace ignored when reading the scheme) or a relative path with no scheme; otherwise `""`. |
| `app/curriculum.html` unit card (`renderUnitCard`) | A Resource's `url` and `body` are escaped; a link Resource is an `<a>` only when `safeHref` is non-empty, otherwise plain text. The "attach existing resource" option text is escaped too. |
| `app/curriculum.html` Resources list (`refreshResources`) | The same, through one local `resourceHtml()`. |
| `app/js/topic-renderer.js` | The Resource link is checked with `safeHref`; an unsafe one is drawn as plain text. |
| `app/taglines.html` `buildPreviewEl` | A tagline is an `<a>` only when `safeHref(link.url)` is non-empty. |
| `app/quranrevival.html` `buildTaglineEl` (frozen Quran Study, safety fix only) | Same, and the one import line. Nothing else changed. |

## Left as it was, and why

- `note-window.js`, `zab-bar.js` and the in-page note scripts: not touched (QR keeps pinned copies). They show the reader's own links only.
- Other pages that show a link: out of this round's list.

## Merge note

`app/js/html-escape.js` was added by part 111 (PR #1256), which is not yet on `main`. This branch therefore creates the file with the identical `escapeHtml` plus `safeHref`; merge #1256 first, or resolve the file by keeping both functions.

## Checks

`tools/i18n-verify/audit-part112-link-safety-browser.mjs`: 13 pure `safeHref` cases and 16 browser runs (curriculum, Deen topic, taglines, Landing x en/bn x 390/1440), 0 failed. `--mutate=escape` 16 failed (caught), `--mutate=href` 31 failed (caught). `audit-part110` 8 runs/0, `bn-duplicate-keys` 6/0, `behaviour.mjs` 971/0. `audit-part111-escape-all-pages-browser.mjs` does not exist on this base (part 111 is unmerged), so it was not run.

## Added by the Architect at release (28 Oct 2026)

- The round was built on v12.96, before part 111 (v12.97) created `app/js/html-escape.js`. Merging `main` in: the file keeps
  `escapeHtml` and adds `safeHref` (the Builder's version is a superset). **The merge also left `curriculum.html` importing
  `escapeHtml` twice** (once from each round), a SyntaxError that stops the whole page. Fixed (one import).
- **Part 111's check passed that broken page, 4 of 4**: a page whose script never loads runs no payload either, so "no
  `__xss`" is vacuously true. Part 112's own positive control ("the typed text is visible literally") caught it. Part 111's check
  now fails any page that reports a SyntaxError or ReferenceError while loading; proven by putting the double import back (the
  check fails, naming the error).
- Measured on the merged branch: part 112 16 runs/0 failed, `--mutate=escape` and `--mutate=href` both caught; part 111 104/0;
  `apps-build-check` 48/0; QR build applies.
