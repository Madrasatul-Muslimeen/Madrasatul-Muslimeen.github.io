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
  "h1", "h2", "h3", "h4",
  // 5 Oct 2026 (Siyagah's note pane): the editor's Divider line.
  "hr",
  "ul", "ol", "li",
  "img",
  // S12 (#562): what the editor's new buttons produce -- links, quotes and a simple table.
  "a", "blockquote", "table", "thead", "tbody", "tr", "td", "th",
  // 6 Oct 2026 (note-pane Part C1, items 38-39): an annotation is a <mark> and its [N] a <sup>.
  "mark", "sup",
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
  // 5 Oct 2026 (Siyagah note pane): Mark done and the Box, each normalised to 1 by narrowOutput().
  "data-done", "data-box",
  // 6 Oct 2026 (Part C1): annotations (38) and heading status badges (39), each normalised by narrowOutput().
  "data-ann", "data-ann-text", "data-ann-ref", "data-status", "data-status-label", "data-status-colour",
]);

/** Heading status (item 39): the closed set, and the only colours a custom status may take (the editor's text-colour palette). */
export const NOTE_STATUS_VALUES = Object.freeze(["done", "ongoing", "process", "next", "custom"]);
export const NOTE_STATUS_COLOURS = Object.freeze(["#b3261e", "#1f3a6e", "#1b6e3c", "#6a3fa0", "#7a4b00", "#006a6a"]);
export const NOTE_ANN_TEXT_MAX = 500, NOTE_STATUS_LABEL_MAX = 24;
/** Plain text only: no markup or control characters, no script-ish scheme, length-capped. */
const plainText = (s, max) => String(s ?? "").replace(/[<>\u0000-\u001f\u007f]/g, " ").replace(/(?:javascript|vbscript|data)\s*:/gi, "").replace(/\s+/g, " ").trim().slice(0, max);

/** The only style properties a Note may carry, each with the only values it may take. */
const COLOUR_VALUE = /^(?:#[0-9a-f]{3}|#[0-9a-f]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|[a-z]{3,20})$/i;
const STYLE_VALUE = {
  "color": COLOUR_VALUE,
  "background-color": COLOUR_VALUE,
  "text-align": /^(?:left|right|center|justify)$/i,
  // 5 Oct 2026 (Siyagah's note pane): A+ / A− and Spacing -- exactly the values the editor writes.
  "font-size": /^(?:0\.8|0\.9|1\.15|1\.3|1\.5|1\.8)em$/i,
  "line-height": /^(?:1\.2|1\.5|2)$/,
  "margin-bottom": /^(?:0|0\.5em|1em|1\.5em)$/i,
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

/** Runs on DOMPurify's OUTPUT (markup that already passed the tag/attribute lists): keeps six style properties with safe values, `dir` of ltr/rtl/auto, links of http/https/mailto only, an image `src` of http(s) only, and gives every link rel/target. */
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
  for (const el of tpl.content.querySelectorAll("[data-done]")) el.setAttribute("data-done", "1");
  for (const el of tpl.content.querySelectorAll("[data-box]")) el.setAttribute("data-box", "1");
  for (const el of tpl.content.querySelectorAll("[data-ann],[data-ann-ref]")) {
    for (const k of ["data-ann", "data-ann-ref"]) if (el.hasAttribute(k) && !/^[1-9]\d{0,3}$/.test(el.getAttribute(k))) el.removeAttribute(k);
  }
  for (const el of tpl.content.querySelectorAll("[data-ann-text]")) {
    const text = plainText(el.getAttribute("data-ann-text"), NOTE_ANN_TEXT_MAX);
    if (text && el.hasAttribute("data-ann")) el.setAttribute("data-ann-text", text); else el.removeAttribute("data-ann-text");
  }
  for (const el of tpl.content.querySelectorAll("[data-status],[data-status-label],[data-status-colour]")) {
    const st = (el.getAttribute("data-status") || "").toLowerCase();
    if (!/^H[1-4]$/.test(el.tagName) || !NOTE_STATUS_VALUES.includes(st)) { el.removeAttribute("data-status"); el.removeAttribute("data-status-label"); el.removeAttribute("data-status-colour"); continue; }
    el.setAttribute("data-status", st);
    const label = plainText(el.getAttribute("data-status-label"), NOTE_STATUS_LABEL_MAX);
    if (st === "custom" && label) el.setAttribute("data-status-label", label); else el.removeAttribute("data-status-label");
    const colour = (el.getAttribute("data-status-colour") || "").toLowerCase();
    if (st === "custom" && NOTE_STATUS_COLOURS.includes(colour)) el.setAttribute("data-status-colour", colour); else el.removeAttribute("data-status-colour");
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
