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
    strike, headings, paragraphs, lists), PLUS `img` (issue #265 -- a
    WordPress-imported Note's own inline pictures, the one tag this app's own
    editor cannot produce and a real, deliberate widening rather than an
    oversight -- see NOTE_ALLOWED_ATTR and ALLOWED_URI_REGEXP below for what
    keeps it safe). No `<script>`, `<iframe>`, `<object>`, `<embed>`,
    `<style>`, `<a>`, `<svg>` or form element is ever on this list. */
export const NOTE_ALLOWED_TAGS = Object.freeze([
  "b", "strong", "i", "em", "u", "s", "strike",
  "p", "br", "div", "span",
  "h1", "h2", "h3",
  "ul", "ol", "li",
  "img",
]);

/**
 * Issue #265 -- exactly the three attributes `<img>` needs and nothing else:
 * `src` (the WordPress site's own absolute URL -- images stay on the site
 * for now, per the issue's own Owner-given answer), `alt` (accessibility
 * text, plain text only) and `loading` (always "lazy", added by the import
 * parser). No `on*` event handler, no `style`, no `href` -- DOMPurify strips
 * any attribute not in this list regardless of name, on any tag, so widening
 * it for `img` does not open a door on `div`/`span`/anything else.
 */
export const NOTE_ALLOWED_ATTR = Object.freeze(["src", "alt", "loading"]);

/**
 * Issue #265 -- `src` is the one attribute in NOTE_ALLOWED_ATTR that can
 * carry a URL, so it is the one DOMPurify's default URI allow-list would
 * otherwise decide on its own. Restricted explicitly to `http:`/`https:` --
 * every real `<img src>` this app ever writes is an absolute
 * mappingmyjourney.com URL -- so a `javascript:` or `data:` src is refused
 * (the attribute is dropped, not the whole tag) rather than relying on
 * DOMPurify's own default staying safe forever.
 */
const NOTE_ALLOWED_URI_REGEXP = /^https?:\/\//i;

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
    ALLOWED_URI_REGEXP: NOTE_ALLOWED_URI_REGEXP,
  });
}
