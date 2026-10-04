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
// DOMPurify is loaded by a plain <script> tag in each Note page's own <head>
// -- since v08.98 from the app's own copy, app/vendor/purify.min.js, rather
// than a CDN, so a Note's body still renders with no internet (the service
// worker keeps same-origin files; it never keeps a CDN's) -- and is read off
// `window.DOMPurify` here rather than imported. That is also what keeps NOTE_ALLOWED_TAGS/
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
  // S12 (#562): what the editor's new buttons produce -- links, quotes and a simple table.
  "a", "blockquote", "table", "thead", "tbody", "tr", "td", "th",
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
export const NOTE_ALLOWED_ATTR = Object.freeze([
  "src", "alt", "loading",
  // S12 (#562): `href` (http/https/mailto only), `style` (narrowed to three properties by narrowOutput()
  // after DOMPurify), `dir`, and the checklist's two marks. Never `on*`, never `class`.
  "href", "style", "dir", "data-check", "data-checked", "colspan", "rowspan",
]);

/** The only style properties a Note may carry, each with the only values it may take. */
const COLOUR_VALUE = /^(?:#[0-9a-f]{3}|#[0-9a-f]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|[a-z]{3,20})$/i;
const STYLE_VALUE = {
  "color": COLOUR_VALUE,
  "background-color": COLOUR_VALUE,
  "text-align": /^(?:left|right|center|justify)$/i,
};
export const NOTE_ALLOWED_STYLE_PROPS = Object.freeze(Object.keys(STYLE_VALUE));
export const isSafeNoteHref = (h) => /^(?:https?:\/\/|mailto:)[^\s<>"']+$/i.test(String(h ?? "").trim());

/**
 * Issue #265 -- `src` is the one attribute in NOTE_ALLOWED_ATTR that can
 * carry a URL, so it is the one DOMPurify's default URI allow-list would
 * otherwise decide on its own. Restricted explicitly to `http:`/`https:` --
 * every real `<img src>` this app ever writes is an absolute
 * mappingmyjourney.com URL -- so a `javascript:` or `data:` src is refused
 * (the attribute is dropped, not the whole tag) rather than relying on
 * DOMPurify's own default staying safe forever.
 */
const NOTE_ALLOWED_URI_REGEXP = /^(?:https?:\/\/|mailto:)/i;

/** Runs on DOMPurify's OUTPUT (markup that already passed the tag/attribute lists): keeps three style properties with safe values, `dir` of ltr/rtl/auto, links of http/https/mailto only, an image `src` of http(s) only, and gives every link rel/target. */
function narrowOutput(html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  for (const el of tpl.content.querySelectorAll("[style]")) {
    const kept = [];
    for (const decl of el.getAttribute("style").split(";")) {
      const i = decl.indexOf(":");
      if (i < 0) continue;
      const prop = decl.slice(0, i).trim().toLowerCase(), val = decl.slice(i + 1).trim();
      if (STYLE_VALUE[prop] && STYLE_VALUE[prop].test(val)) kept.push(`${prop}: ${val}`);
    }
    if (kept.length) el.setAttribute("style", kept.join("; ")); else el.removeAttribute("style");
  }
  for (const el of tpl.content.querySelectorAll("[dir]")) if (!/^(?:ltr|rtl|auto)$/i.test(el.getAttribute("dir"))) el.removeAttribute("dir");
  for (const el of tpl.content.querySelectorAll("[data-check],[data-checked]")) {
    if (el.hasAttribute("data-check")) el.setAttribute("data-check", "1");
    if (el.hasAttribute("data-checked") && el.getAttribute("data-checked") !== "true") el.removeAttribute("data-checked");
  }
  for (const a of tpl.content.querySelectorAll("a")) {
    if (!isSafeNoteHref(a.getAttribute("href"))) a.removeAttribute("href");
    else { a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer"); }
  }
  for (const img of tpl.content.querySelectorAll("img[src]")) if (!/^https?:\/\//i.test(img.getAttribute("src"))) img.removeAttribute("src");
  return tpl.innerHTML;
}

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
  return narrowOutput(window.DOMPurify.sanitize(bodyHtml ?? "", {
    ALLOWED_TAGS: NOTE_ALLOWED_TAGS,
    ALLOWED_ATTR: NOTE_ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: NOTE_ALLOWED_URI_REGEXP,
  }));
}
