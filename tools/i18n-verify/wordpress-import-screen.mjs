// Issue #265 -- the WordPress-import SCREEN's own contract:
// app/import-notes.html (the preview + gated Import button) and its ⋯-menu
// entry point in app/journey-map.html.
//
// WHAT THIS SUITE CAN PROVE IN PLAIN NODE, WITH NO BROWSER AND NO NETWORK
// (the same gap note-sanitize-boundary.mjs's and journey-map-screen.mjs's
// own headers already record -- `playwright` itself is not installed in
// this sandbox, not merely missing one browser build): every claim below is
// a fact about the SOURCE -- which elements exist, which functions gate
// which controls, which strings are translated. WHAT IT CANNOT PROVE: that
// the preview actually renders correctly against a real chosen file, that
// the layout holds at 390px/1100px, or that a tap really reaches a handler,
// in either language. The issue's own ask ("run it at 390px and 1100px, in
// both languages") needs this project's own Playwright harness, which this
// sandbox does not have -- a real-phone and real-desktop check, in both
// languages, is the recommended substitute, the same style v08.35/v08.36
// and the P5-D Notes-screen round both already used.

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

const page = fs.readFileSync(path.join(root, "app/import-notes.html"), "utf8");
const journeyMapPage = fs.readFileSync(path.join(root, "app/journey-map.html"), "utf8");
const bn = fs.readFileSync(path.join(root, "app/js/i18n/bn.js"), "utf8");

// --- 1. THE ENTRY POINT ------------------------------------------------
check("Mapping My Journey's own ⋯ menu links to the Import page", () => {
  assert.ok(/href="import-notes\.html"/.test(journeyMapPage), "no link to import-notes.html found in journey-map.html");
});

// --- 2. THE FILE PICKER AND PREVIEW -------------------------------------
check("a file input accepting .xml exists", () => {
  assert.ok(/<input type="file" id="fileInput" accept="\.xml"/.test(page), "no .xml file input found");
});
check("every preview statistic named in the issue has its own element", () => {
  for (const id of ["statFolders", "statNotes", "statAyahLinks", "statRangeLinks", "statHadith", "statNoRef"]) {
    assert.ok(page.includes(`id="${id}"`), `no #${id} element found`);
  }
});
check("choosing a file parses it and builds the preview WITHOUT checking the readiness gate first (issue: 'the preview works without the gate')", () => {
  const handlerMatch = page.match(/fileInput\.addEventListener\("change", async \(\) => \{([\s\S]*?)\n\s*\}\);/);
  assert.ok(handlerMatch, "no fileInput change handler found");
  const body = handlerMatch[1];
  assert.ok(body.includes("parseWxrXml(") && body.includes("analyzeWxrImport("), "the change handler does not parse and analyze the file");
  assert.ok(!body.includes("isWordpressImportPersistenceReady"), "the preview path itself consults the readiness gate -- it must not, per the issue's own requirement");
});
check("the unmatched-titles sample is rendered so a problem reference is visible, not silently dropped", () => {
  assert.ok(page.includes("unmatchedSample") && page.includes("unmatchedSampleEl"), "no unmatched-sample rendering found");
});

// --- 3. THE GATE: A CONTROL THAT EXPLAINS ITSELF, NOT ONE THAT IS ABSENT ---
check("the Import button starts aria-disabled, not `disabled` -- reachable and explains itself (this project's own standing lesson)", () => {
  assert.ok(/<button type="button" id="importBtn" aria-disabled="true">/.test(page), "importBtn is not aria-disabled in its initial markup");
  const tagMatch = page.match(/<button[^>]*\bid="importBtn"[^>]*>/);
  assert.ok(tagMatch, "no importBtn tag found");
  assert.ok(!/(^|\s)disabled(\s|=|>)/.test(tagMatch[0]), "importBtn must never carry a real `disabled` attribute (aria-disabled is fine and expected)");
});
check("the readiness gate is consulted from the real readiness module, by name, not re-implemented", () => {
  assert.ok(page.includes('import { isWordpressImportPersistenceReady, wordpressImportUnavailableReason } from "./js/study-wordpress-import-readiness.js";'),
    "import-notes.html does not import the real readiness gate");
  assert.ok(page.includes("isWordpressImportPersistenceReady()"), "refreshImportGate() never calls isWordpressImportPersistenceReady()");
});
check("pressing the button while gated explains why, in words, rather than doing nothing (I15)", () => {
  const clickMatch = page.match(/importBtn\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\s{4}\}\);/);
  assert.ok(clickMatch, "no importBtn click handler found");
  assert.ok(clickMatch[1].includes('getAttribute("aria-disabled") === "true"') && clickMatch[1].includes("showResult("),
    "the click handler does not check aria-disabled and explain the refusal");
});
check("only the Note's own owner may import (isNoteOwner() in firestore.rules, mirrored client-side)", () => {
  assert.ok(page.includes("function isSelfSelected()"), "no isSelfSelected() gate found");
  assert.ok(/canWrite = !!currentPlan && isSelfSelected\(\)/.test(page), "the import gate does not require isSelfSelected()");
});

// --- 4. THE SERVICE IS REACHED, NOT REBUILT INLINE --------------------------
check("the page calls the real import service, not a second copy of its write logic", () => {
  assert.ok(page.includes('import { runWordpressImport } from "./js/wordpress-import-service.js";'),
    "import-notes.html does not import runWordpressImport from the real service");
  assert.ok(page.includes("runWordpressImport(db,"), "the click handler never calls runWordpressImport()");
  for (const forbidden of ["writeBatch(", "runTransaction(", "createDocument(", "setDoc("]) {
    assert.ok(!page.includes(forbidden), `import-notes.html writes to Firestore directly (${forbidden}) instead of going through the service`);
  }
});
check("a refusal from the import run is shown, per-item, rather than swallowed", () => {
  assert.ok(page.includes("refusalListEl") && page.includes("result.folders.refusals") && page.includes("result.notes.refusals"),
    "refusals from the import result are never rendered");
});

// --- 5. I11 -- every new user-visible string has a Bangla translation ------
const NEW_STRINGS = [
  "Reading {name}…",
  "Could not read that file: {message}",
  "Titles with no usable reference (a sample):",
  "Importing is nearly ready, but the governed decision that turns it on is incomplete.",
  "Importing is not switched on yet — the Owner needs to publish one Rules update first. The preview above works either way.",
  "Choose a file first.",
  "You can only import into your own Mapping My Journey — choose yourself in the Person picker above.",
  "Folders: {created} created, {skipped} already there ({done} of {total})…",
  "Notes: {created} created, {skipped} already there ({done} of {total})…",
  "Done. Folders: {fc} created, {fs} already there. Notes: {nc} created, {ns} already there.",
  "The import stopped early: {message}. It is safe to try again — anything already created will be skipped.",
  "Originally written",
];
check("every new user-visible string this round introduced has a Bangla entry", () => {
  const missing = NEW_STRINGS.filter((s) => !bn.includes(JSON.stringify(s)));
  assert.deepEqual(missing, [], `missing bn.js translation(s): ${JSON.stringify(missing)}`);
});
check("the ⋯ menu's own new link text is translated (static markup, picked up by translateStatic())", () => {
  assert.ok(bn.includes(JSON.stringify("Import from WordPress…")), "no Bangla translation for the ⋯ menu's link text");
});

console.log(`\n==== wordpress-import screen: ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
