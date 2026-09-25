// Issue #265 -- the WordPress-import SCREEN's own contract, EXTENDED by
// issue #271 to cover the same page's second source, Evernote (.enex),
// added side by side rather than forked onto a second page:
// app/import-notes.html (the source picker, the preview + gated Import
// button for whichever source is chosen) and its ⋯-menu entry point in
// app/journey-map.html.
//
// WHAT THIS SUITE CAN PROVE IN PLAIN NODE, WITH NO BROWSER AND NO NETWORK
// (the same gap note-sanitize-boundary.mjs's and journey-map-screen.mjs's
// own headers already record -- `playwright` itself is not installed in
// this sandbox, not merely missing one browser build): every claim below is
// a fact about the SOURCE -- which elements exist, which functions gate
// which controls, which strings are translated. WHAT IT CANNOT PROVE: that
// either preview actually renders correctly against a real chosen file, that
// the layout holds at 390px/1100px, or that a tap really reaches a handler,
// in either language. The issue's own ask ("run it at 390px and 1100px, in
// both languages") needs this project's own Playwright harness, which this
// sandbox does not have -- a real-phone and real-desktop check, in both
// languages, choosing two .enex files, is the recommended substitute, the
// same style v08.35/v08.36 and the P5-D Notes-screen round both already used.

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
check("the ⋯ menu's own link text names Notes generally, not just WordPress (issue #271: two sources on one page)", () => {
  assert.ok(journeyMapPage.includes(">Import Notes…<"), "journey-map.html's ⋯ menu still names only WordPress, or was not updated");
});

// --- 2. THE SOURCE PICKER (issue #271) ----------------------------------
check("a Source select offers exactly WordPress and Evernote", () => {
  assert.ok(/<select id="sourceSelect">/.test(page), "no #sourceSelect found");
  assert.ok(page.includes('<option value="wordpress">WordPress export (.xml)</option>'), "no WordPress option");
  assert.ok(page.includes('<option value="evernote">Evernote export (.enex)</option>'), "no Evernote option");
});
check("switching source swaps the file input's accept/multiple and the two help paragraphs, and resets any in-progress preview", () => {
  const handlerMatch = page.match(/sourceSelect\.addEventListener\("change", \(\) => \{([\s\S]*?)\n\s{4}\}\);/);
  assert.ok(handlerMatch, "no sourceSelect change handler found");
  const body = handlerMatch[1];
  for (const needle of ['fileInput.accept = ".enex"', 'fileInput.accept = ".xml"', "fileInput.multiple = true", "fileInput.multiple = false", "currentPlan = null"]) {
    assert.ok(body.includes(needle), `sourceSelect change handler is missing: ${needle}`);
  }
});
check("the WordPress file input starts as a SINGLE .xml picker (the default source) -- unchanged initial markup", () => {
  assert.ok(/<input type="file" id="fileInput" accept="\.xml" \/>/.test(page), "no .xml file input found, or its initial markup changed");
});
check("a stack-name input exists for Evernote's optional shared parent folder, starting hidden", () => {
  assert.ok(/<div id="stackNameRow" style="display:none;">/.test(page), "#stackNameRow is not present or not hidden by default");
  assert.ok(page.includes('<input type="text" id="stackNameInput"'), "no #stackNameInput found");
});

// --- 3. THE FILE PICKER AND PREVIEW (both sources) ----------------------
check("every preview statistic named in the issue has its own element, plus the two Evernote-only ones (files chosen, pictures/attachments not imported)", () => {
  for (const id of ["statFolders", "statNotes", "statAyahLinks", "statRangeLinks", "statHadith", "statNoRef", "statFiles", "statResources"]) {
    assert.ok(page.includes(`id="${id}"`), `no #${id} element found`);
  }
});
check("choosing a file parses it and builds the preview WITHOUT checking the readiness gate first (issue #265's own requirement, unchanged by issue #271)", () => {
  const handlerMatch = page.match(/fileInput\.addEventListener\("change", async \(\) => \{([\s\S]*?)\n\s{4}\}\);/);
  assert.ok(handlerMatch, "no fileInput change handler found");
  const body = handlerMatch[1];
  assert.ok(body.includes("parseWxrXml(") && body.includes("analyzeWxrImport("), "the WordPress branch does not parse and analyze the file");
  assert.ok(body.includes("parseEnexXml(") && body.includes("planEnexImport("), "the Evernote branch does not parse and plan the file(s)");
  assert.ok(!body.includes("isWordpressImportPersistenceReady"), "the preview path itself consults the readiness gate -- it must not, per issue #265's own requirement");
});
check("the file input accepts several files for Evernote, one per notebook", () => {
  const handlerMatch = page.match(/fileInput\.addEventListener\("change", async \(\) => \{([\s\S]*?)\n\s{4}\}\);/);
  assert.ok(handlerMatch[1].includes("files.map(") && handlerMatch[1].includes("planEnexImport(perFile"),
    "the change handler does not build one entry per chosen .enex file");
});
check("a notebook's name is derived from its file name, minus .enex (issue's own instruction)", () => {
  assert.ok(page.includes('file.name.replace(/\\.enex$/i, "")'), "notebookName is not derived from the file name");
});
check("the unmatched-titles sample is rendered so a problem reference is visible, not silently dropped", () => {
  assert.ok(page.includes("unmatchedSample") && page.includes("unmatchedSampleEl"), "no unmatched-sample rendering found");
});
check("a multi-file Evernote choice shows a per-notebook breakdown (notebook name, Note count, āyah/range links, Hadith, no reference, pictures/attachments)", () => {
  assert.ok(page.includes("filePreviewList"), "no #filePreviewList rendering found");
  assert.ok(page.includes("plan.filePreviews.map("), "renderPreview does not iterate plan.filePreviews");
});

// --- 4. THE GATE: A CONTROL THAT EXPLAINS ITSELF, NOT ONE THAT IS ABSENT ---
// The gate is deliberately the SAME gate for both sources -- see
// study-wordpress-import-readiness.js's own header on why a second one would
// just be two places that could disagree about the identical dependency.
check("the Import button starts aria-disabled, not `disabled` -- reachable and explains itself (this project's own standing lesson)", () => {
  assert.ok(/<button type="button" id="importBtn" aria-disabled="true">/.test(page), "importBtn is not aria-disabled in its initial markup");
  const tagMatch = page.match(/<button[^>]*\bid="importBtn"[^>]*>/);
  assert.ok(tagMatch, "no importBtn tag found");
  assert.ok(!/(^|\s)disabled(\s|=|>)/.test(tagMatch[0]), "importBtn must never carry a real `disabled` attribute (aria-disabled is fine and expected)");
});
check("the readiness gate is consulted from the real, SHARED readiness module, by name, not re-implemented or forked per source", () => {
  assert.ok(page.includes('import { isWordpressImportPersistenceReady, wordpressImportUnavailableReason } from "./js/study-wordpress-import-readiness.js";'),
    "import-notes.html does not import the real, shared readiness gate");
  assert.ok(page.includes("isWordpressImportPersistenceReady()"), "refreshImportGate() never calls isWordpressImportPersistenceReady()");
  assert.equal((page.match(/from "\.\/js\/study-wordpress-import-readiness\.js"/g) || []).length, 1,
    "the readiness gate must be imported exactly once, from one module -- not forked per source");
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

// --- 5. THE SERVICE IS REACHED, NOT REBUILT INLINE, FOR EITHER SOURCE ------
check("the page calls the real import services (both), not a second copy of their write logic", () => {
  assert.ok(page.includes('import { runWordpressImport } from "./js/wordpress-import-service.js";'),
    "import-notes.html does not import runWordpressImport from the real service");
  assert.ok(page.includes('import { runEvernoteImport } from "./js/evernote-import-service.js";'),
    "import-notes.html does not import runEvernoteImport from the real service");
  assert.ok(/const runImport = currentSource === "evernote" \? runEvernoteImport : runWordpressImport;/.test(page),
    "the click handler does not choose the real service function by source");
  assert.ok(page.includes("runImport(db,"), "the click handler never calls the chosen import function");
  for (const forbidden of ["writeBatch(", "runTransaction(", "createDocument(", "setDoc("]) {
    assert.ok(!page.includes(forbidden), `import-notes.html writes to Firestore directly (${forbidden}) instead of going through a service`);
  }
});
check("a refusal from the import run is shown, per-item, rather than swallowed", () => {
  assert.ok(page.includes("refusalListEl") && page.includes("result.folders.refusals") && page.includes("result.notes.refusals"),
    "refusals from the import result are never rendered");
});

// --- 6. I11 -- every new/changed user-visible string has a Bangla translation ---
const NEW_STRINGS = [
  "Import Notes",
  "Bring Notes from another app into Mapping My Journey — folders and Notes, each linked to its āyah where its title or text names one. This never touches your existing folders or Notes, and never deletes anything.",
  "1. Choose your export",
  "Source",
  "WordPress export (.xml)",
  "Evernote export (.enex)",
  "In Evernote: File → Export Notes, choose Evernote XML Format (.enex), one file per notebook. You may choose several .enex files at once — each becomes its own folder. Pictures and attachments are not imported this round: each is replaced by a small placeholder in the Note, like [picture: file-name]. It is read in this browser only — nothing is uploaded anywhere else, and the files themselves are never saved to this app.",
  "Stack name (optional) — becomes one shared parent folder above the notebooks you choose below",
  "e.g. Personal Journal",
  "Files chosen",
  "Pictures/attachments not imported",
  "Reading {name}…",
  "Reading {count} files…",
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
  "{notebook}: {count} Notes — {ayah} āyah, {range} range, {hadith} Hadith, {noref} no reference, {res} pictures/attachments not imported",
  "Originally written",
];
check("every new or changed user-visible string this round introduced has a Bangla entry", () => {
  const missing = NEW_STRINGS.filter((s) => !bn.includes(JSON.stringify(s)));
  assert.deepEqual(missing, [], `missing bn.js translation(s): ${JSON.stringify(missing)}`);
});
check("the ⋯ menu's own new link text is translated (static markup, picked up by translateStatic())", () => {
  assert.ok(bn.includes(JSON.stringify("Import Notes…")), "no Bangla translation for the ⋯ menu's link text");
});
check("the retired WordPress-only strings are gone from the page's own markup (a rename, not an addition alongside the old text)", () => {
  assert.ok(!page.includes(">Import from WordPress<"), "the old WordPress-only <h1> text is still present");
  assert.ok(!page.includes("1. Choose your export file<"), "the old WordPress-only step heading is still present");
});

console.log(`\n==== wordpress-import screen (issues #265 + #271): ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
