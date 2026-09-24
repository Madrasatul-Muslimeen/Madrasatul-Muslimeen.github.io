// MAP v4 Phase 7 (P7-B, issue #250) -- the Dawah SCREEN itself: the shared
// toggle shell plus all three views (My pages, Waiting for my approval,
// Madrasah pages) and the print layout, built over the already-accepted
// P7-A contract/data layer, which dawah-boundary.mjs already covers from the
// OTHER side (what the data layer is reachable from, and that every write is
// called only behind the readiness gate). This suite covers the SCREEN's
// own contract instead: the toggle really offers all three views, the gate
// message exists and is translated, a child can never see Approve/Return on
// their own page, a page's body is never rendered unsanitized, and the print
// layout hides everything but itself.
//
// WHAT THIS SUITE CAN PROVE IN PLAIN NODE, WITH NO BROWSER AND NO NETWORK
// (the same gap note-sanitize-boundary.mjs/journey-map-screen.mjs's own
// headers record -- `playwright` itself may not be installed in this
// sandbox): every claim below is a fact about the SOURCE -- which strings
// exist, which functions are called where, which checks gate which
// controls. WHAT IT CANNOT PROVE: that the toggle actually re-renders the
// right container in a real browser, that the layout holds at
// 320/360/390/412px, or that window.print() actually produces the expected
// page. A real-phone/real-browser check is the recommended substitute, the
// same style the P5-D/P6-F rounds already used.

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

const pagePath = path.join(root, "app/dawah.html");
const page = fs.readFileSync(pagePath, "utf8");
const notesPath = path.join(root, "app/notes.html");
const notesPage = fs.readFileSync(notesPath, "utf8");
const navSrc = fs.readFileSync(path.join(root, "app/js/nav.js"), "utf8");
const { BN } = await import(path.join(root, "app/js/i18n/bn.js"));

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start !== -1, `no function ${name}() found`);
  // Every top-level function in this page is closed by a "\n    }\n" at the
  // module's own 4-space indent -- the same shallow-but-sufficient technique
  // journey-map-screen.mjs's own functionBody() uses.
  const closeAt = source.indexOf("\n    }\n", start);
  assert.ok(closeAt !== -1, `could not find the end of function ${name}()`);
  return source.slice(start, closeAt);
}

// The static markup only -- everything before the module script, so a JS
// selector string like `[data-view="approvals"]` (used once, to find the
// approvals toggle button and hide it for a non-approver) is never counted
// as a fourth button.
const pageMarkup = page.slice(0, page.indexOf('<script type="module">'));

// --- 1. THE TOGGLE OFFERS EXACTLY THE THREE REQUIRED VIEWS ------------------
check("the toggle offers exactly the three view buttons the issue asks for: mine, approvals, shared", () => {
  const views = [...pageMarkup.matchAll(/data-view="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(views, ["mine", "approvals", "shared"], `unexpected view button set: ${views.join(", ")}`);
});
check("the toggle switches between three separate containers, one per view, over the same loaded data", () => {
  for (const id of ["viewMine", "viewApprovals", "viewShared"]) {
    assert.ok(page.includes(`id="${id}"`), `no #${id} container found`);
  }
  assert.equal([...page.matchAll(/async function refreshAll/g)].length, 1);
  assert.ok(/renderMineView\(\)/.test(page) && /renderApprovalsView\(\)/.test(page) && /renderSharedView\(\)/.test(page),
    "all three render functions must exist and be called");
});
check("My pages: Share for an adult or Send for approval for a child is chosen via authorNeedsDawahApproval(), never guessed", () => {
  assert.ok(/authorNeedsDawahApproval\(/.test(page), "authorNeedsDawahApproval() is never called");
  const cardHtml = functionBody(page, "myPageCardHtml");
  assert.ok(/authorNeedsApproval === true/.test(cardHtml), "myPageCardHtml() does not branch on the authorNeedsDawahApproval() result");
});
check("the last-chosen view is remembered in localStorage, as a viewer convenience, never treated as data", () => {
  const keyDecl = page.match(/const VIEW_KEY = "([^"]+)"/);
  assert.ok(keyDecl, "no VIEW_KEY constant declaration found");
  const getCalls = [...page.matchAll(/localStorage\.getItem\(VIEW_KEY\)/g)].length;
  const setCalls = [...page.matchAll(/localStorage\.setItem\(VIEW_KEY,/g)].length;
  assert.ok(getCalls >= 1 && setCalls >= 1, `expected both a read and a write of VIEW_KEY (got ${getCalls} reads, ${setCalls} writes)`);
});
check("Waiting for my approval is offered only to guardian/teacher/owner/prime -- the toggle button itself is hidden otherwise", () => {
  assert.ok(/ROLE_APPROVER_SET\s*=\s*\[.*"guardian".*"teacher".*"owner".*"prime".*\]/.test(page.replace(/\s+/g, " ")),
    "the approver role set is not exactly guardian/teacher/owner/prime");
  assert.ok(/approvalsToggleBtn\.style\.display\s*=\s*canApprove\s*\?\s*""\s*:\s*"none"/.test(page),
    "the approvals toggle button is not hidden for a non-approver");
});

// --- 2. THE GATE MESSAGE EXISTS AND IS TRANSLATED ---------------------------
const GATE_SENTENCE = "Dawah pages are not switched on yet — waiting for the Madrasah's owner to publish the database rules.";
check("the gate message is the exact sentence the issue specifies, used identically on both dawah.html and notes.html", () => {
  assert.ok(page.includes(GATE_SENTENCE), "dawah.html does not carry the gate sentence");
  assert.ok(notesPage.includes(GATE_SENTENCE), "notes.html does not carry the same gate sentence");
});
check("every write-triggering button on both pages carries aria-disabled, not disabled, driven by the gate", () => {
  // aria-disabled (not disabled): the control must remain focusable and able
  // to explain itself when pressed -- this project's own standing lesson
  // (see CLAUDE.md, "a control that opens and explains itself beats a
  // control that is not there").
  const dawahButtons = [...page.matchAll(/<button[^>]*data-page-(?:submit|retire|print|approve|return)[^>]*>/g)];
  assert.ok(dawahButtons.length >= 5, "expected several gated action buttons on dawah.html");
  for (const btn of dawahButtons) {
    assert.ok(/aria-disabled="\$\{dawahReady/.test(btn[0]), `a gated button is missing its aria-disabled binding: ${btn[0]}`);
    assert.ok(!/\bdisabled\b(?!-)/.test(btn[0].replace(/aria-disabled/g, "")), `a gated button uses the real disabled attribute: ${btn[0]}`);
  }
  const notesBtn = notesPage.match(/<button[^>]*data-note-dawah[^>]*>/);
  assert.ok(notesBtn, "no data-note-dawah button found on notes.html");
  assert.ok(/aria-disabled="\$\{isDawahReady/.test(notesBtn[0]), "the Make a printable page button is not bound to isDawahReady()");
});
check("the gate message has a Bangla translation from the first commit (I11)", () => {
  assert.ok(GATE_SENTENCE in BN, "the gate sentence has no Bangla translation in bn.js");
  assert.ok(BN[GATE_SENTENCE].trim().length > 0, "the Bangla translation of the gate sentence is empty");
});

// --- 3. APPROVE AND RETURN ARE ABSENT FOR THE VIEWER'S OWN PAGE -------------
check("a child can never approve their own page: approvalCardHtml() hides Approve/Return when authorPersonId is the viewer", () => {
  const cardHtml = functionBody(page, "approvalCardHtml");
  const canActLine = cardHtml.match(/const canAct = ([^;]+);/);
  assert.ok(canActLine, "no `canAct` gate found in approvalCardHtml()");
  assert.ok(/page\.authorPersonId\s*!==\s*myPersonId/.test(canActLine[1]),
    "the canAct gate does not exclude the viewer's own authorPersonId");
  assert.ok(/canAct \? `<button[^`]*data-page-approve/.test(cardHtml), "the Approve button is not conditioned on canAct");
  assert.ok(/canAct \? `<button[^`]*data-page-return/.test(cardHtml), "the Return button is not conditioned on canAct");
});
check("MUTATION-PROVEN: replacing the canAct condition with a constant makes the check above fail", () => {
  // The bug class this guards against is exactly "the author-exclusion
  // condition gets silently dropped or hardcoded" -- simulate that directly
  // by replacing the real condition with a constant, and confirm the
  // PREVIOUS check's own regex (which requires the real comparison to be
  // present) would then fail against this mutated source.
  const cardHtml = functionBody(page, "approvalCardHtml");
  const mutated = cardHtml.replace("page.authorPersonId !== myPersonId", "true");
  assert.notEqual(mutated, cardHtml, "the mutation did not change the source -- canAct's own condition text has changed");
  const canActLine = mutated.match(/const canAct = ([^;]+);/);
  assert.ok(canActLine, "no canAct declaration found in the mutated source");
  assert.ok(!/page\.authorPersonId\s*!==\s*myPersonId/.test(canActLine[1]),
    "the mutated canAct line still contains the original author-exclusion condition -- the mutation did not remove what it claims to");
});

// --- 4. A PAGE'S BODY IS NEVER RENDERED UNSANITIZED -------------------------
check("DOMPurify is loaded from the pinned CDN, as a plain <script> tag, in dawah.html's own <head>", () => {
  const headMatch = page.match(/<head>([\s\S]*?)<\/head>/);
  assert.ok(headMatch, "dawah.html has no <head> section");
  assert.ok(
    /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/dompurify@3\/dist\/purify\.min\.js"><\/script>/.test(headMatch[1]),
    "the DOMPurify CDN <script> tag is missing from dawah.html's <head>"
  );
});
check("the render path never assigns bodyHtml to innerHTML except through sanitizeNoteHtml()", () => {
  const offending = [...page.matchAll(/\.innerHTML\s*=\s*([^;]{0,160})/g)]
    .map((m) => m[1])
    .filter((assigned) => /\bbodyHtml\b/.test(assigned) && !/sanitizeNoteHtml\(/.test(assigned));
  assert.deepEqual(offending, [], `unsanitized bodyHtml reaches innerHTML: ${JSON.stringify(offending)}`);
});
check("every read of a page's own body names sanitizeNoteHtml() -- the preview render and the print render both", () => {
  const bodyHtmlReads = [...page.matchAll(/\bpage\.bodyHtml\b/g)].length;
  const sanitizeCalls = [...page.matchAll(/sanitizeNoteHtml\(/g)].length;
  assert.ok(bodyHtmlReads >= 2, "expected at least two reads of page.bodyHtml (preview + print)");
  assert.equal(sanitizeCalls, bodyHtmlReads, "every page.bodyHtml read must be paired with a sanitizeNoteHtml() call");
});

// --- 5. THE PRINT STYLESHEET HIDES NAV AND BUTTONS --------------------------
check("a @media print block exists and hides the nav bar and every button", () => {
  const printBlock = page.match(/@media print \{([\s\S]*?)\n  \}/);
  assert.ok(printBlock, "no @media print block found in dawah.html");
  assert.ok(/\.app-nav/.test(printBlock[1]), "the print stylesheet does not name .app-nav");
  assert.ok(/\bbutton\b/.test(printBlock[1]), "the print stylesheet does not name button");
  assert.ok(/display:\s*none\s*!important/.test(printBlock[1]), "the print stylesheet does not force display:none on chrome");
});
check("#printArea is the only thing left visible in print, and starts hidden on screen", () => {
  assert.ok(/#printArea\s*\{\s*display:\s*none;\s*\}/.test(page), "#printArea does not start hidden on screen");
  const printBlock = page.match(/@media print \{([\s\S]*?)\n  \}/)[1];
  assert.ok(/#printArea,\s*#printArea \*\s*\{\s*visibility:\s*visible;\s*\}/.test(printBlock),
    "the print stylesheet does not explicitly re-reveal #printArea");
});
check("printPage() builds the required content (title, author, unit label if present, Madrasah name) and calls window.print()", () => {
  const body = functionBody(page, "printPage");
  assert.ok(/dawahGateOpenOrExplain\(\)/.test(body), "printPage() is not gated");
  assert.ok(/authorLabel\(page\.authorPersonId\)/.test(body), "printPage() does not include the author's name");
  assert.ok(/page\.sourceUnitKey \? unitKeyLabel\(page\.sourceUnitKey\) : null/.test(body),
    "printPage() does not conditionally include the source Study Unit label via unitKeyLabel()");
  assert.ok(/tenantLabel\(\)/.test(body), "printPage() does not include the Madrasah (tenant) name");
  assert.ok(/window\.print\(\)/.test(body), "printPage() does not call window.print()");
  assert.ok(/sanitizeNoteHtml\(page\.bodyHtml/.test(body), "printPage() does not sanitize the body before rendering it");
});
check("MUTATION-PROVEN: removing the unitKeyLabel() ternary from printPage() makes the check above fail", () => {
  const body = functionBody(page, "printPage");
  const mutated = body.replace("page.sourceUnitKey ? unitKeyLabel(page.sourceUnitKey) : null", "null");
  assert.notEqual(mutated, body, "the mutation did not change the source -- the ternary's own shape must have changed");
  assert.ok(!/page\.sourceUnitKey \? unitKeyLabel\(page\.sourceUnitKey\) : null/.test(mutated),
    "removing the ternary did not make the check's own pattern stop matching -- it is not proving what it claims to");
});

// --- 6. THE NAV ENTRY POINT IS REAL ------------------------------------------
check("nav.js links to dawah.html, gated the same way every other whole-app Home link is (no role restriction beyond sign-in)", () => {
  assert.ok(/DAWAH_LINKS\s*=\s*\[\{\s*href:\s*"dawah\.html"/.test(navSrc), "nav.js does not declare a dawah.html link");
  assert.ok(/dawahHtml/.test(navSrc) && /renderHomeExtras/.test(navSrc), "the dawah link is not wired into renderHomeExtras()");
});

// --- 7. NOTES.HTML'S OWN ENTRY POINT: CURRENT REVISION, ACTIVE NOTES ONLY --
check("makeDawahPage() creates from the Note's CURRENT revision and then opens dawah.html", () => {
  const body = functionBody(notesPage, "makeDawahPage");
  assert.ok(/sourceRevisionId:\s*note\.currentRevisionId/.test(body), "makeDawahPage() does not pin the Note's own currentRevisionId");
  assert.ok(/location\.href\s*=\s*"dawah\.html"/.test(body), "makeDawahPage() does not navigate to dawah.html on success");
});
check("the \"Make a printable page\" button is offered only where Edit/Remove already are -- the viewer's own active Notes", () => {
  const cardHtml = functionBody(notesPage, "noteCardHtml");
  const dawahLine = cardHtml.split("\n").find((l) => l.includes("data-note-dawah"));
  assert.ok(dawahLine, "no data-note-dawah button markup found in noteCardHtml()");
  assert.ok(dawahLine.trim().startsWith("${canEdit ?"), "the Make a printable page button is not gated on the same canEdit condition as Edit/Remove");
});

// --- 8. I11: EVERY NEW STRING THIS ROUND ADDED IS TRANSLATED FROM THE FIRST COMMIT -
function tKeysIn(source) {
  const keys = new Set();
  for (const m of source.matchAll(/\bt\("((?:[^"\\]|\\.)*)"/g)) keys.add(JSON.parse(`"${m[1]}"`));
  for (const m of source.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) keys.add(m[1].replace(/\\(.)/g, "$1"));
  return keys;
}
check("every t(\"...\") / t('...') key dawah.html calls has a Bangla translation in bn.js", () => {
  const keys = [...tKeysIn(page)];
  assert.ok(keys.length > 10, "expected a meaningful number of translated strings on a whole new screen");
  const missing = keys.filter((k) => !(k in BN));
  assert.deepEqual(missing, [], `key(s) with no Bangla translation: ${JSON.stringify(missing)}`);
});
check("every NEW t(\"...\") key notes.html's own Dawah entry point calls has a Bangla translation in bn.js", () => {
  assert.ok("Make a printable page" in BN, "\"Make a printable page\" has no Bangla translation");
});
check("the page's own title and heading are translatable (present in bn.js), so translateStatic() has something to find at load", () => {
  assert.ok("QuranRevival — Dawah" in BN, "the page <title> has no Bangla translation");
  assert.ok("Dawah" in BN, "the <h1> text has no Bangla translation");
});

console.log(`\n==== Dawah screen (P7-B): ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
