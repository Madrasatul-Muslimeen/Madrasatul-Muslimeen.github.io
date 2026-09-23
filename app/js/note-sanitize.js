// MAP Phase 5 (P5-D, issue #195) -- sanitizes a permanent Note's `bodyHtml`
// before it is ever assigned to innerHTML.
//
// `bodyHtml` is untrusted the moment more than one person can ever READ a
// Note -- a guardian, a co-enrolled teacher and the tenant owner/prime can
// all read one (`canReadNoteOf()` in firestore.rules), even though only its
// own author may write it (`isNoteOwner()`). So the render path is a real
// stored-XSS surface: one author's malicious `bodyHtml` would otherwise run
// in every reader's browser, under their own session.
//
// DOMPurify is loaded from a CDN <script> tag in notes.html's own <head> --
// this codebase has never vendored a third-party script before, so there is
// no local copy to import as an ES module -- and is read off `window.DOMPurify`
// here rather than imported. That is also what keeps NOTE_ALLOWED_TAGS/
// NOTE_ALLOWED_ATTR testable in plain Node, with no DOM and no network access
// at all: a check can assert the allow-list itself excludes every dangerous
// tag/attribute without ever running a browser (see
// tools/i18n-verify/note-sanitize-boundary.mjs).

/** Formatting a Note editor can actually produce (bold/italic/underline/
    strike, headings, paragraphs, lists) -- nothing else. No `<script>`,
    `<iframe>`, `<object>`, `<embed>`, `<style>`, `<img>`, `<a>`, `<svg>` or
    form element is ever on this list. */
export const NOTE_ALLOWED_TAGS = Object.freeze([
  "b", "strong", "i", "em", "u", "s", "strike",
  "p", "br", "div", "span",
  "h1", "h2", "h3",
  "ul", "ol", "li",
]);

/** No attribute at all -- the rich text this editor produces needs none, and
    an empty allow-list can carry no `href="javascript:..."`, no inline
    `style`, and no `onerror`/`onclick`/... event handler, by construction
    (DOMPurify strips any attribute not in this list regardless of name). */
export const NOTE_ALLOWED_ATTR = Object.freeze([]);

/**
 * Sanitizes a Note's `bodyHtml` for safe assignment to `innerHTML`.
 *
 * THROWS rather than returning the raw HTML when DOMPurify has not loaded --
 * same reasoning as I15 applied to a security boundary instead of a write: a
 * CDN failure must be a visible error, never a silent fall-through to
 * rendering unsanitized markup.
 */
export function sanitizeNoteHtml(bodyHtml) {
  if (typeof window === "undefined" || !window.DOMPurify) {
    throw new Error("sanitizeNoteHtml: DOMPurify is not loaded -- refusing to render unsanitized bodyHtml.");
  }
  return window.DOMPurify.sanitize(bodyHtml ?? "", {
    ALLOWED_TAGS: NOTE_ALLOWED_TAGS,
    ALLOWED_ATTR: NOTE_ALLOWED_ATTR,
  });
}
