Third-party files served from the app itself, so they are kept on the phone
by app/sw.js and work with no internet (the Owner's ask, 28 Sep 2026: "make
Notes work offline too").

purify.min.js -- DOMPurify 3.4.16, (c) Cure53 and other contributors,
  Apache License 2.0 / Mozilla Public License 2.0
  (github.com/cure53/DOMPurify/blob/3.4.16/LICENSE). Byte-identical to
  tools/i18n-verify/vendor/purify.min.js. Pinned: to update, replace the file
  deliberately and re-run note-sanitize-boundary.mjs, which checks the version.
