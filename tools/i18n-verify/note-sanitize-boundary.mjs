// MAP Phase 5 (P5-D, issue #195) -- proves the Notes screen's ONE required
// security property: a Note's `bodyHtml` is never assigned to `innerHTML`
// without going through `sanitizeNoteHtml()` first.
//
// `bodyHtml` is untrusted the moment more than one person can ever READ a
// Note -- `canReadNoteOf()` in firestore.rules lets a guardian, a co-enrolled
// teacher and the tenant owner/prime all read one, though only its own
// author may write it (`isNoteOwner()`) -- so a malicious author's saved
// `bodyHtml` would otherwise run in every OTHER reader's browser, under
// their own session. That is a real stored-XSS surface, not a theoretical
// one, and this suite is what the issue's own "add a test for it" asks for.
//
// WHAT THIS SUITE CAN PROVE IN PLAIN NODE, WITH NO BROWSER AND NO NETWORK:
//   1. The render path structurally cannot reach innerHTML without passing
//      through sanitizeNoteHtml() first (source-read, mutation-provable).
//   2. The allow-list itself excludes every tag/attribute that could ever
//      carry a script or an event handler, so even a DOMPurify bypass could
//      not smuggle one through what this app asks it to allow.
//   3. sanitizeNoteHtml() FAILS CLOSED: with no DOMPurify loaded (exactly
//      what "plain Node" is), it throws rather than silently returning the
//      raw, unsanitized HTML -- the fail-closed contract I15 already uses
//      for a write, applied here to a render.
//
// WHAT THIS SUITE CANNOT PROVE, AND SAYS SO RATHER THAN FAKING IT: that
// DOMPurify itself, loaded from the real CDN, actually strips a live
// `<script>`/`onerror` payload out of a rendered DOM. That needs a real
// browser -- this repository's own Playwright harness (`tools/i18n-verify/
// harness.mjs`) -- and this sandbox has the same recorded Playwright/
// chromium-headless-shell environment gap CLAUDE.md's v08.35/v08.36 entries
// already carry (a genuine, twice-confirmed environment limitation, not a
// code defect). A real-device open-a-malicious-note-and-check is the
// recommended substitute, the same style those two rounds used.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    }
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

const sanitizeSrc = fs.readFileSync(path.join(root, "app/js/note-sanitize.js"), "utf8");
const notesHtml = fs.readFileSync(path.join(root, "app/notes.html"), "utf8");

// UPDATED for issue #265, reason recorded rather than the check weakened:
// `img` moved OUT of this list and into its own, narrower set of checks
// below. It is now a deliberate, narrow widening (a WordPress-imported
// Note's own inline pictures) -- proven safe by what ATTRIBUTES it may
// carry (src/alt/loading only, asserted below) and by a restricted
// ALLOWED_URI_REGEXP on `src`, not by keeping the tag off the list
// entirely. Every OTHER dangerous tag stays refused exactly as before.
const DANGEROUS_TAGS = ["script", "iframe", "object", "embed", "style", "a", "svg", "form", "input", "link", "meta", "base"];
// `src` is deliberately excluded from this pattern now that NOTE_ALLOWED_ATTR
// legitimately carries it for `img` -- the dedicated checks below (the exact
// allow-list is {src, alt, loading} and nothing else, plus the URI
// restriction) are what prove it safe, a stronger and more specific claim
// than a blanket "src is dangerous-shaped" pattern could make while still
// wanting to allow it for one purpose.
const DANGEROUS_ATTR_PATTERN = /^on|href|style|xlink/i;

check("DOMPurify is loaded from the pinned CDN, as a plain <script> tag, in notes.html's own <head>", () => {
  const headMatch = notesHtml.match(/<head>([\s\S]*?)<\/head>/);
  assert.ok(headMatch, "notes.html has no <head> section");
  assert.ok(
    /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/dompurify@3\/dist\/purify\.min\.js"><\/script>/.test(headMatch[1]),
    "the DOMPurify CDN <script> tag is missing from notes.html's <head>"
  );
});

check("the render path never assigns bodyHtml to innerHTML except through sanitizeNoteHtml()", () => {
  // Every note.bodyHtml this page ever reads is either handed straight to
  // sanitizeNoteHtml() (noteBodyPreviewHtml(), openEditForm()'s edit body) or
  // never touches innerHTML at all. A DIRECT `note.bodyHtml` (or
  // `row.note.bodyHtml`) beside `.innerHTML =` with no sanitizeNoteHtml()
  // between them is exactly the regression this check exists to catch.
  const offending = [...notesHtml.matchAll(/\.innerHTML\s*=\s*([^;]{0,120})/g)]
    .map((m) => m[1])
    .filter((assigned) => /\bbodyHtml\b/.test(assigned) && !/sanitizeNoteHtml\(/.test(assigned));
  assert.deepEqual(offending, [], `unsanitized bodyHtml reaches innerHTML: ${JSON.stringify(offending)}`);
});

check("every render of a Note's own body goes through sanitizeNoteHtml() by name", () => {
  // The two real render sites: the read-only preview (noteBodyPreviewHtml)
  // and the edit form's own contenteditable body (openEditForm). Both must
  // name the sanitizer -- this is a POSITIVE assertion (the previous check is
  // the negative one), so a rewrite that renamed both without ever calling
  // sanitizeNoteHtml() at all could not slip past silently.
  const bodyHtmlReads = [...notesHtml.matchAll(/note\.bodyHtml/g)].length;
  const sanitizeCalls = [...notesHtml.matchAll(/sanitizeNoteHtml\(/g)].length;
  assert.ok(bodyHtmlReads >= 2, "expected at least two reads of note.bodyHtml (preview + edit)");
  assert.ok(sanitizeCalls >= 2, "expected at least two sanitizeNoteHtml() calls (preview + edit)");
});

check("NOTE_ALLOWED_TAGS excludes every tag that could carry a script or load a remote resource", () => {
  const match = sanitizeSrc.match(/NOTE_ALLOWED_TAGS = Object\.freeze\(\[([\s\S]*?)\]\)/);
  assert.ok(match, "NOTE_ALLOWED_TAGS is not defined as expected");
  const tags = [...match[1].matchAll(/"([a-z0-9]+)"/g)].map((m) => m[1]);
  assert.ok(tags.length > 0, "NOTE_ALLOWED_TAGS is empty -- nothing to check");
  for (const dangerous of DANGEROUS_TAGS) {
    assert.ok(!tags.includes(dangerous), `NOTE_ALLOWED_TAGS wrongly permits <${dangerous}>`);
  }
});

// UPDATED for issue #265, reason recorded rather than the check weakened:
// NOTE_ALLOWED_ATTR is no longer empty -- `img` needs src/alt/loading. The
// claim is narrowed to "exactly these three, and none of them is a
// dangerous-shaped attribute (on*/href/style/xlink)" -- still a closed-set
// assertion, not a loosened one.
check("NOTE_ALLOWED_ATTR carries exactly src/alt/loading -- no event handler, no href, no inline style is possible", () => {
  const match = sanitizeSrc.match(/NOTE_ALLOWED_ATTR = Object\.freeze\(\[([\s\S]*?)\]\)/);
  assert.ok(match, "NOTE_ALLOWED_ATTR is not defined as expected");
  const attrs = [...match[1].matchAll(/"([a-zA-Z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(attrs.sort(), ["alt", "loading", "src"], `NOTE_ALLOWED_ATTR changed unexpectedly: ${JSON.stringify(attrs)}`);
  for (const attr of attrs) {
    assert.ok(!DANGEROUS_ATTR_PATTERN.test(attr), `NOTE_ALLOWED_ATTR permits a dangerous-shaped attribute: ${attr}`);
  }
});

check("img is allowed, but ONLY with src restricted to http(s) -- no javascript: or data: URI", () => {
  assert.ok(sanitizeSrc.includes('"img"'), "NOTE_ALLOWED_TAGS no longer permits <img> -- issue #265's own imported images would be stripped");
  const match = sanitizeSrc.match(/ALLOWED_URI_REGEXP\s*=\s*(\/[^\n]+\/i)/);
  assert.ok(match, "no ALLOWED_URI_REGEXP is defined -- img src would fall back to DOMPurify's own broader default");
  // eslint-disable-next-line no-eval -- reading the literal regex out of the source, the same technique this file already uses for NOTE_ALLOWED_TAGS/NOTE_ALLOWED_ATTR
  const uriRegexp = new Function(`return ${match[1]};`)();
  assert.ok(uriRegexp.test("https://mappingmyjourney.com/x.jpg"), "the URI restriction refuses a real, safe https image URL");
  assert.ok(uriRegexp.test("http://mappingmyjourney.com/x.jpg"), "the URI restriction refuses a real, safe http image URL");
  assert.ok(!uriRegexp.test("javascript:alert(1)"), "the URI restriction permits a javascript: URI");
  assert.ok(!uriRegexp.test("data:text/html,<script>alert(1)</script>"), "the URI restriction permits a data: URI");
});

check("sanitizeNoteHtml() passes ALLOWED_URI_REGEXP to DOMPurify -- defining the restriction is not enough if it is never used", () => {
  assert.ok(/ALLOWED_URI_REGEXP:\s*NOTE_ALLOWED_URI_REGEXP/.test(sanitizeSrc),
    "sanitizeNoteHtml() does not pass ALLOWED_URI_REGEXP to DOMPurify.sanitize()");
});

// -----------------------------------------------------------------------
// FAIL-CLOSED PROOF -- genuinely executed, not just read. `window` is
// undefined in plain Node, which is exactly the "DOMPurify hasn't loaded"
// case this function exists to refuse rather than silently pass through.
// -----------------------------------------------------------------------
const { sanitizeNoteHtml, NOTE_ALLOWED_TAGS, NOTE_ALLOWED_ATTR } =
  await import(path.join(root, "app/js/note-sanitize.js"));

check("sanitizeNoteHtml() FAILS CLOSED when DOMPurify has not loaded, rather than returning raw HTML", () => {
  const malicious = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
  assert.throws(() => sanitizeNoteHtml(malicious), /DOMPurify is not loaded/,
    "sanitizeNoteHtml() must throw, not silently return unsanitized markup, when window.DOMPurify is absent");
});

check("the exported allow-lists are exactly what the structural checks above just read from source", () => {
  // A positive control on the two regex-based checks above: if NOTE_ALLOWED_TAGS/
  // NOTE_ALLOWED_ATTR were ever reshaped in a way the source-text regex could not
  // parse, this catches the drift between "what the module exports" and "what the
  // regex above extracted" -- the same tie-breaker this repository's own lessons
  // recommend (prefer the source/emulator over a grep when they could disagree).
  assert.ok(Array.isArray(NOTE_ALLOWED_TAGS) && NOTE_ALLOWED_TAGS.length > 0);
  assert.deepEqual([...NOTE_ALLOWED_ATTR].sort(), ["alt", "loading", "src"]);
  for (const dangerous of DANGEROUS_TAGS) assert.ok(!NOTE_ALLOWED_TAGS.includes(dangerous));
  assert.ok(NOTE_ALLOWED_TAGS.includes("img"), "img should be allowed (issue #265)");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
