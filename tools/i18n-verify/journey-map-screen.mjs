// MAP Phase 6 (P6-F, issue #199) -- the Mapping My Journey SCREEN itself:
// the shared toggle shell plus all three presentation options (Folders,
// Timeline, Path) built for real over the already-accepted Phase 6 data
// layer (journey-map-service.js, note-foundation.js's folder/placement
// functions), which journey-map-boundary.mjs already covers from the OTHER
// side (what the data layer is reachable from, and what it may be called
// with). This suite covers the screen's own contract instead: the toggle
// really offers all three views, every view has an honest empty state, a
// Note's body is never rendered unsanitized, every self-only write is
// gated behind the same ownership check the Rules themselves enforce
// (isNoteOwner()), and every new user-visible string this round added has a
// Bangla translation from the first commit (I11).
//
// WHAT THIS SUITE CAN PROVE IN PLAIN NODE, WITH NO BROWSER AND NO NETWORK
// (the same gap note-sanitize-boundary.mjs's own header records, confirmed
// again this round -- `playwright` itself is not installed in this sandbox,
// not merely missing one browser build): every claim below is a fact about
// the SOURCE -- which strings exist, which functions are called where,
// which checks gate which controls. WHAT IT CANNOT PROVE: that the toggle
// actually re-renders the right container in a real browser, that the
// layout holds at 320/360/390/412px, or that a tap really reaches a
// handler. A real-phone check is the recommended substitute, the same style
// v08.35/v08.36 and the notes.html round (P5-D) already used.

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

const pagePath = path.join(root, "app/journey-map.html");
const page = fs.readFileSync(pagePath, "utf8");
const navSrc = fs.readFileSync(path.join(root, "app/js/nav.js"), "utf8");

// --- 1. THE TOGGLE ACTUALLY OFFERS ALL THREE OPTIONS ------------------------
check("the toggle offers exactly the three view buttons the issue asks for: folders, timeline, path", () => {
  const views = [...page.matchAll(/data-view="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(views, ["folders", "timeline", "path"], `unexpected view button set: ${views.join(", ")}`);
});
check("the toggle switches between three separate containers, one per view, over the same loaded data", () => {
  for (const id of ["viewFolders", "viewTimeline", "viewPath"]) {
    assert.ok(page.includes(`id="${id}"`), `no #${id} container found`);
  }
  // The three views must be rendered from data loaded ONCE (refreshAll()),
  // not three separate loads -- the issue's own "not three separate pages"
  // requirement.
  assert.equal([...page.matchAll(/async function refreshAll/g)].length, 1);
  assert.ok(/renderFoldersView\(\)/.test(page) && /renderTimelineView\(\)/.test(page) && /renderPathView\(\)/.test(page),
    "all three render functions must exist and be called");
});
check("the last-chosen view is remembered in localStorage, as a viewer convenience, never treated as data", () => {
  // Both calls pass a shared constant (VIEW_KEY), not a re-typed literal, so
  // this reads the constant's own declaration plus confirms both a read and
  // a write route through it -- retyping the key at each call site is
  // exactly the kind of drift a shared constant exists to prevent.
  const keyDecl = page.match(/const VIEW_KEY = "([^"]+)"/);
  assert.ok(keyDecl, "no VIEW_KEY constant declaration found");
  const getCalls = [...page.matchAll(/localStorage\.getItem\(VIEW_KEY\)/g)].length;
  const setCalls = [...page.matchAll(/localStorage\.setItem\(VIEW_KEY,/g)].length;
  assert.ok(getCalls >= 1 && setCalls >= 1, `expected both a read and a write of VIEW_KEY (got ${getCalls} reads, ${setCalls} writes)`);
});

// --- 2. EVERY VIEW HAS AN HONEST EMPTY STATE, ZERO NOTES + TWO SYSTEM FOLDERS -
check("Option A (Folders) states what an empty Personal Journey Map and an empty Reflection Archive look like, not a blank screen", () => {
  assert.ok(/emptyStateFor/.test(page), "no per-folder empty-state function found");
  assert.ok(page.includes('node.semanticRole === "journey-map"') && page.includes('node.semanticRole === "reflection-archive"'),
    "the two system folders must each get their own empty-state sentence, not a generic one");
});
check("Option B (Timeline) states an honest empty sentence rather than rendering nothing", () => {
  assert.ok(/notes\.length === 0/.test(page) && page.includes("Nothing here yet"),
    "Timeline's own zero-Notes case must be handled explicitly");
});
check("Option C (Path) states an honest empty sentence rather than rendering an empty track", () => {
  assert.ok(page.includes("allNotes.length === 0") && page.includes("Your path is empty so far"),
    "Path's own zero-Notes case must be handled explicitly");
});
check("the two system folders are represented even before either has a real document, without ever faking a stored one", () => {
  assert.ok(/virtual:\s*true/.test(page), "no virtual-folder representation found");
  // The judgment call the issue itself asked to be stated rather than
  // guessed at: a system folder is created for REAL, once, only at the
  // point a write genuinely needs it to exist.
  assert.ok(/ensureRealFolder/.test(page), "no lazy real-folder-creation path found");
  assert.ok(!/setDoc|writeBatch\(/.test(page), "the page must never construct a Firestore write of its own outside the accepted data-layer functions");
});

// --- 3. A NOTE'S BODY IS NEVER RENDERED UNSANITIZED -------------------------
check("DOMPurify is loaded from the pinned CDN, as a plain <script> tag, in journey-map.html's own <head>", () => {
  const headMatch = page.match(/<head>([\s\S]*?)<\/head>/);
  assert.ok(headMatch, "journey-map.html has no <head> section");
  assert.ok(
    /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/dompurify@3\/dist\/purify\.min\.js"><\/script>/.test(headMatch[1]),
    "the DOMPurify CDN <script> tag is missing from journey-map.html's <head>"
  );
});
check("the render path never assigns bodyHtml to innerHTML except through sanitizeNoteHtml()", () => {
  const offending = [...page.matchAll(/\.innerHTML\s*=\s*([^;]{0,120})/g)]
    .map((m) => m[1])
    .filter((assigned) => /\bbodyHtml\b/.test(assigned) && !/sanitizeNoteHtml\(/.test(assigned));
  assert.deepEqual(offending, [], `unsanitized bodyHtml reaches innerHTML: ${JSON.stringify(offending)}`);
});
check("every render of a Note's own body names sanitizeNoteHtml()", () => {
  const bodyHtmlReads = [...page.matchAll(/note\.bodyHtml/g)].length;
  const sanitizeCalls = [...page.matchAll(/sanitizeNoteHtml\(/g)].length;
  assert.ok(bodyHtmlReads >= 1, "expected at least one read of note.bodyHtml");
  assert.equal(sanitizeCalls, bodyHtmlReads, "every bodyHtml read must be paired with a sanitizeNoteHtml() call");
});

// --- 4. WRITES ARE GATED TO THE NOTE'S OWN OWNER, THE SAME WAY THE RULES GATE THEM -
// isNoteOwner() in firestore.rules is the only thing that may create/update a
// folder or placement; canReadNoteOf() lets others (guardian/teacher/admin)
// only ever READ. isSelfSelected() is this screen's own mirror of that
// distinction (same shape notes.html already uses) -- every control that
// triggers a write must be gated behind it, or a read-only viewer would be
// shown a control whose only possible outcome is a denial.
check("every write-triggering control is gated behind isSelfSelected()", () => {
  for (const marker of ['id="newFolderBtn"', 't("+ File a Note here…")', 't("Move to…")']) {
    const idx = page.indexOf(marker);
    assert.ok(idx !== -1, `expected marker not found in the page: ${marker}`);
    const before = page.slice(Math.max(0, idx - 700), idx);
    assert.ok(/isSelfSelected\(\)/.test(before), `no isSelfSelected() gate found in the 700 characters before: ${marker}`);
  }
});
check("a read-only viewer is told in words why they cannot write here, the same I15-adjacent shape notes.html already uses", () => {
  assert.ok(/renderReadOnlyBanner/.test(page), "no read-only banner renderer found");
  assert.ok(page.includes("readOnlyMsg"), "no #readOnlyMsg element found");
});

// --- 5. I11: EVERY NEW STRING THIS ROUND ADDED IS TRANSLATED FROM THE FIRST COMMIT -
const { BN } = await import(path.join(root, "app/js/i18n/bn.js"));
function tKeysIn(source) {
  const keys = new Set();
  for (const m of source.matchAll(/\bt\("((?:[^"\\]|\\.)*)"/g)) keys.add(JSON.parse(`"${m[1]}"`));
  for (const m of source.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) keys.add(m[1].replace(/\\(.)/g, "$1"));
  return keys;
}
check("every t(\"...\") / t('...') key this page calls has a Bangla translation in bn.js", () => {
  const keys = [...tKeysIn(page)].filter((k) => k !== "button"); // "button" is a false match on document.createElement("button"), not a real t() call
  assert.ok(keys.length > 10, "expected a meaningful number of translated strings on a whole new screen");
  const missing = keys.filter((k) => !(k in BN));
  assert.deepEqual(missing, [], `key(s) with no Bangla translation: ${JSON.stringify(missing)}`);
});
check("the page's own title and intro are translatable (present in bn.js), so translateStatic() has something to find at load", () => {
  assert.ok("QuranRevival — Mapping My Journey" in BN, "the page <title> has no Bangla translation");
  assert.ok("Mapping My Journey" in BN, "the <h1> text has no Bangla translation");
});

// --- 6. THE NAV ENTRY POINT IS REAL, AND NOTES.HTML'S OWN ENTRY IS UNTOUCHED -
check("nav.js links to journey-map.html, gated the same way every other whole-app Home link is (no role restriction beyond sign-in)", () => {
  assert.ok(/JOURNEY_LINKS\s*=\s*\[\{\s*href:\s*"journey-map\.html"/.test(navSrc), "nav.js does not declare a journey-map.html link");
  assert.ok(/journeyHtml/.test(navSrc) && /renderHomeExtras/.test(navSrc), "the journey link is not wired into renderHomeExtras()");
});
check("the Notes screen's own contextual entry point (Read screen's ⋯ menu, wired by ayah-note-renderer.js) is untouched by this round", () => {
  const renderer = fs.readFileSync(path.join(root, "app/js/ayah-note-renderer.js"), "utf8");
  assert.ok(renderer.includes("My Notes for this unit") && renderer.includes("notesScreenHref"),
    "the existing notes.html entry point regressed");
  const quranShell = fs.readFileSync(path.join(root, "app/quranrevival.html"), "utf8");
  assert.ok(!quranShell.includes("journey-map.html") && !renderer.includes("journey-map.html"),
    "the Read screen's own ⋯ menu should not gain a direct journey-map.html reference this round -- the entry point is Home, not a contextual menu");
});

console.log(`\n==== Mapping My Journey screen (P6-F): ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
