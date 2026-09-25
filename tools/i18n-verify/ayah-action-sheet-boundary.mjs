// Issue #286 -- structural + pure-logic guards for the "This āyah" action
// sheet and its one new action, "File in folder(s)…". This suite is
// deliberately Playwright-free (every assertion runs on plain Node): it
// covers what a rendered-HTML string and a pure planning function can prove
// without a browser, the same split `quran-word-card.mjs`'s own pure suite
// already uses for `renderQuranWordCard()`. The interactive parts (a real
// tap on the Mushaf marker, the Word Card button, the sheet opening as a
// bottom sheet/popover, Escape/outside-click) need a real browser and are
// left to a companion browser suite -- this sandbox has no Playwright
// binaries installed (the same documented environment gap several other
// rounds in CLAUDE.md already record).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { renderAyahActionSheetHtml, attachAyahActionSheetHandlers } from "../../app/js/ayah-action-sheet.js";
import { renderAyahFolderPickerHtml, attachAyahFolderPickerHandlers } from "../../app/js/ayah-folder-filing-renderer.js";
import { planFolderFilings } from "../../app/js/ayah-folder-filing-plan.js";

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

function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

// --- 1. THE SHEET'S OWN MARKUP ----------------------------------------------

check("the sheet renders every action named in the spec", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:2:255", ref: "Quran 2:255", isSelf: true });
  for (const attr of ["data-ayah-sheet-bookmark", "data-ayah-sheet-note", "data-ayah-sheet-asma",
    "data-ayah-sheet-qcr", "data-ayah-sheet-file-folder", "data-ayah-sheet-play", "data-ayah-sheet-copy", "data-ayah-sheet-share"]) {
    assert.ok(html.includes(attr), `sheet is missing ${attr}`);
  }
});

check("the sheet carries the unit key and reference for its caller to read", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:2:255", ref: "Quran 2:255 — Surah Al-Baqarah" });
  assert.ok(html.includes('data-unit-key="ayah:2:255"'));
  assert.ok(html.includes("Quran 2:255"));
});

check("the bookmark item reflects isBookmarked in both its icon and its wording", () => {
  const off = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", isBookmarked: false });
  const on = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", isBookmarked: true });
  assert.ok(off.includes("🔖") && !off.includes("★"));
  assert.ok(on.includes("★"));
});

check("isSelf=true leaves Note and File-in-folder enabled, with no explanatory hint", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", isSelf: true });
  assert.ok(!/aria-disabled="true"/.test(html), "a control is aria-disabled while isSelf is true");
  assert.ok(!html.includes("Only your own record"));
});

check("isSelf=false: Note and File-in-folder stay ON SCREEN, dimmed, never natively `disabled` (CLAUDE.md's own standing lesson -- aria-disabled, not disabled, so a reader can still focus the control and be told why)", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", isSelf: false });
  assert.ok(html.includes("data-ayah-sheet-note"), "Note item was removed rather than dimmed");
  assert.ok(html.includes("data-ayah-sheet-file-folder"), "File-in-folder item was removed rather than dimmed");
  assert.ok(!/<button[^>]*data-ayah-sheet-note[^>]*\bdisabled\b/.test(html), "Note button uses the native disabled attribute");
  assert.ok(!/<button[^>]*data-ayah-sheet-file-folder[^>]*\bdisabled\b/.test(html), "File-in-folder button uses the native disabled attribute");
  assert.ok((html.match(/aria-disabled="true"/g) ?? []).length === 2, "expected exactly Note + File-in-folder to be aria-disabled");
  assert.ok(html.includes("Only your own record can create or file a Note."));
});

check("isSelf=false does not touch Bookmark/Asma/QCR/Play/Copy/Share -- only the two Note-owning actions are gated", () => {
  const self = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", isSelf: true, isBookmarked: true });
  const other = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", isSelf: false, isBookmarked: true });
  for (const attr of ["data-ayah-sheet-bookmark", "data-ayah-sheet-asma", "data-ayah-sheet-qcr", "data-ayah-sheet-play", "data-ayah-sheet-copy", "data-ayah-sheet-share"]) {
    const re = new RegExp(`<button[^>]*${attr}[^>]*>`);
    assert.equal(self.match(re)[0], other.match(re)[0], `${attr}'s own markup changed with isSelf`);
  }
});

check("File in folder(s) always explains itself, whether that is what it does or why it cannot", () => {
  const withNote = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", isSelf: true });
  assert.ok(withNote.includes("Files your Note on this āyah"));
  const gated = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", isSelf: false });
  assert.ok(gated.includes("Only your own record can create or file a Note."));
});

// --- 2. THE SHEET'S CALLBACKS -----------------------------------------------

// A minimal, dependency-free DOM stand-in -- just enough of querySelector/
// addEventListener/dataset for these two checks, with every element
// instance CACHED by selector so a later querySelector(sameSelector) call
// (attachAyahActionSheetHandlers's own lookup, then this test's own lookup
// to fire the click) returns the identical object addEventListener was
// called on. Not a general jsdom replacement; the real interaction (a tap
// reaching the handler through the browser's own event system) is the
// browser suite's job.
function elementFromTag(tagHtml) {
  const attrs = {};
  const attrPairRe = /([a-zA-Z0-9-]+)(?:="([^"]*)")?/g;
  let am;
  while ((am = attrPairRe.exec(tagHtml))) if (am[1] && am[1] !== "button" && am[1] !== "div") attrs[am[1]] = am[2] ?? "";
  const el = {
    dataset: Object.fromEntries(Object.entries(attrs)
      .filter(([k]) => k.startsWith("data-"))
      .map(([k, v]) => [k.replace(/^data-/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v])),
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    addEventListener: (_evt, fn) => { el._fire = fn; },
  };
  return el;
}
function fakeContainer(html) {
  const cache = new Map();
  function findAndCache(sel) {
    if (cache.has(sel)) return cache.get(sel);
    const attrName = sel.slice(1, -1); // "[data-x]" -> "data-x"
    const tagMatch = html.match(new RegExp(`<[a-z]+[^>]*\\b${attrName}\\b[^>]*>`));
    const el = tagMatch ? elementFromTag(tagMatch[0]) : null;
    cache.set(sel, el);
    return el;
  }
  const sheetEl = {
    dataset: { unitKey: (html.match(/data-unit-key="([^"]*)"/) ?? [, ""])[1] },
    querySelector: findAndCache,
  };
  return {
    querySelector(sel) { return sel === "[data-ayah-sheet]" ? sheetEl : findAndCache(sel); },
  };
}

check("every action callback fires with the sheet's own unit key, and onClose runs first", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:2:255", ref: "x", isSelf: true });
  const container = fakeContainer(html);
  const order = [];
  attachAyahActionSheetHandlers(container, {
    onClose: () => order.push("close"),
    onBookmark: (uk) => order.push(`bookmark:${uk}`),
  });
  const sheet = container.querySelector("[data-ayah-sheet]");
  const btn = sheet.querySelector("[data-ayah-sheet-bookmark]");
  btn._fire();
  assert.deepEqual(order, ["close", "bookmark:ayah:2:255"], "close must fire before the action callback");
});

check("a dimmed (aria-disabled) item never fires its callback", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", isSelf: false });
  const container = fakeContainer(html);
  let fired = false;
  attachAyahActionSheetHandlers(container, { onFileInFolder: () => { fired = true; } });
  const sheet = container.querySelector("[data-ayah-sheet]");
  sheet.querySelector("[data-ayah-sheet-file-folder]")._fire();
  assert.equal(fired, false, "a gated item's callback fired anyway");
});

// --- 3. THE FOLDER PICKER'S OWN MARKUP --------------------------------------

const TREE = {
  roots: [
    { folderId: "f1", name: "Reflections", children: [
      { folderId: "f1a", name: "Ramadan", children: [] },
    ] },
    { folderId: "f2", name: "Tajweed notes", children: [] },
  ],
};

check("every folder in the tree renders, indented by depth, with a checkbox and a New-folder-here button", () => {
  const html = renderAyahFolderPickerHtml({ tree: TREE });
  for (const id of ["f1", "f1a", "f2"]) {
    assert.ok(html.includes(`data-ayah-folder-toggle="${id}"`), `folder ${id} did not render`);
    assert.ok(html.includes(`data-ayah-folder-new-under="${id}"`), `folder ${id} has no "new folder here" control`);
  }
  assert.ok(html.includes("Reflections") && html.includes("Ramadan") && html.includes("Tajweed notes"));
});

check("checkedFolderIds ticks exactly the folders already holding this Note's placement", () => {
  const html = renderAyahFolderPickerHtml({ tree: TREE, checkedFolderIds: ["f1a"] });
  assert.ok(new RegExp(`data-ayah-folder-toggle="f1a"[^>]*checked`).test(html), "f1a should be ticked");
  assert.ok(!new RegExp(`data-ayah-folder-toggle="f1"[^>]*checked`).test(html), "f1 should not be ticked");
  assert.ok(!new RegExp(`data-ayah-folder-toggle="f2"[^>]*checked`).test(html), "f2 should not be ticked");
});

check("a search term keeps a folder whose own name matches, OR whose descendant's does -- never orphans the indentation", () => {
  const byChild = renderAyahFolderPickerHtml({ tree: TREE, searchTerm: "ramadan" });
  assert.ok(byChild.includes("Reflections"), "the matching child's own parent must still show");
  assert.ok(byChild.includes("Ramadan"));
  assert.ok(!byChild.includes("Tajweed notes"), "a non-matching, unrelated branch should be hidden");
});

check("no folders / no matches are both said in words, distinctly", () => {
  const empty = renderAyahFolderPickerHtml({ tree: { roots: [] } });
  assert.ok(empty.includes("No folders yet."));
  const noMatch = renderAyahFolderPickerHtml({ tree: TREE, searchTerm: "xyz-does-not-exist" });
  assert.ok(noMatch.includes("No folders match your search."));
});

check("newFolderUnder opens exactly one create-folder form, with the folder-name field autofocused", () => {
  const closed = renderAyahFolderPickerHtml({ tree: TREE });
  assert.ok(!closed.includes("data-ayah-folder-new-name"));
  const open = renderAyahFolderPickerHtml({ tree: TREE, newFolderUnder: "f1" });
  assert.equal((open.match(/data-ayah-folder-new-name/g) ?? []).length, 1);
  assert.ok(open.includes("autofocus"));
});

// --- 4. THE FILING PLAN -- PURE, NO FIRESTORE -------------------------------

check("nothing ticked/unticked -- write NOTHING (the 'write only what changed' rule reorderTrackables()/planReorder() already use)", () => {
  const current = [{ folderId: "f1", placementId: "p1" }, { folderId: "f2", placementId: "p2" }];
  const { toCreate, toRetire } = planFolderFilings(current, ["f1", "f2"]);
  assert.deepEqual(toCreate, []);
  assert.deepEqual(toRetire, []);
});

check("a newly ticked folder with no existing placement is CREATED", () => {
  const { toCreate, toRetire } = planFolderFilings([], ["f1"]);
  assert.deepEqual(toCreate, ["f1"]);
  assert.deepEqual(toRetire, []);
});

check("an unticked folder's placement is RETIRED, by placementId, not by folderId", () => {
  const current = [{ folderId: "f1", placementId: "p1" }];
  const { toCreate, toRetire } = planFolderFilings(current, []);
  assert.deepEqual(toCreate, []);
  assert.deepEqual(toRetire, ["p1"]);
});

check("tick one, untick another, leave a third alone -- three folders, one write each for the two that changed", () => {
  const current = [{ folderId: "f1", placementId: "p1" }, { folderId: "f2", placementId: "p2" }];
  const { toCreate, toRetire } = planFolderFilings(current, ["f2", "f3"]);
  assert.deepEqual(toCreate, ["f3"]);
  assert.deepEqual(toRetire, ["p1"]);
});

check("defaults are the empty case: no current placements, nothing desired -- no writes at all", () => {
  const { toCreate, toRetire } = planFolderFilings();
  assert.deepEqual(toCreate, []);
  assert.deepEqual(toRetire, []);
});

// --- 5. THE NEW MODULES STAY I2-PURE (no Firebase, no direct Firestore) ----

check("ayah-action-sheet.js is a pure renderer: no Firebase, no Firestore, no records/activity", () => {
  const text = read("app/js/ayah-action-sheet.js");
  for (const forbidden of ["firebasejs", "getDoc(", "setDoc(", "updateDoc(", "records.js", "activity.js"]) {
    assert.ok(!text.includes(forbidden), `ayah-action-sheet.js references ${forbidden}`);
  }
});

check("ayah-folder-filing-renderer.js is a pure renderer: no Firebase, no Firestore", () => {
  const text = read("app/js/ayah-folder-filing-renderer.js");
  for (const forbidden of ["firebasejs", "getDoc(", "setDoc(", "updateDoc("]) {
    assert.ok(!text.includes(forbidden), `ayah-folder-filing-renderer.js references ${forbidden}`);
  }
});

check("ayah-folder-filing-plan.js imports nothing at all -- a pure function, same shape as journey-map-contract.js's own planReorder-style helpers", () => {
  const text = read("app/js/ayah-folder-filing-plan.js");
  assert.ok(!/^\s*import\b/m.test(text), "ayah-folder-filing-plan.js has an import");
});

// --- 6. QURANREVIVAL.HTML AND HIFZ-RENDERER.JS WIRE THE TWO ENTRY POINTS ---
// (source-text checks, not execution -- both call sites build real DOM
// elements, which needs a browser; the browser suite covers the real tap.)

check("the Mushaf renderer marks the ayah-end glyph, and ONLY that glyph, with data-ayah-marker -- never data-word-occurrence on the same span", () => {
  const text = read("app/js/hifz-renderer.js");
  const m = text.match(/else if \(maxPosition && mushafPosition === maxPosition\) \{([\s\S]*?)\n  \}/);
  assert.ok(m, "the ayah-end-marker branch (mushafPosition === maxPosition) is missing");
  assert.ok(/dataset\.ayahMarker\s*=\s*ayahKey/.test(m[1]), "the marker branch no longer sets dataset.ayahMarker");
  assert.ok(!m[1].includes("dataset.wordOccurrence"), "the marker branch also sets dataset.wordOccurrence -- it must not be tappable as a word");
});

check("quranrevival.html's shared readView/noteView click handler opens the sheet from both the Mushaf marker and the Word Card's own button", () => {
  const text = read("app/quranrevival.html");
  assert.ok(/data-ayah-marker[\s\S]{0,120}openAyahActionSheet\(ayahMarker\.dataset\.ayahMarker\)/.test(text),
    "the Mushaf marker tap is not wired to openAyahActionSheet");
  assert.ok(/data-word-card-ayah-action[\s\S]{0,160}openAyahActionSheet\(wordCardAyahAction\.dataset\.wordCardAyahAction\)/.test(text),
    "the Word Card's \"This āyah ⋯\" button is not wired to openAyahActionSheet");
});

check("the Word Card renders its own \"This āyah ⋯\" row OUTSIDE <header> -- the drag/resize and layout suites measure the header's own Prev/Arabic/Next/Close row and must see it byte-for-byte unchanged", () => {
  const text = read("app/js/quran-word-card.js");
  assert.ok(/<\/header>\s*<div class="word-card-ayah-action-row">/.test(text),
    "the ayah-action row is not a sibling placed immediately after </header>");
});

console.log(`\n==== "This āyah" action sheet + folder filing (issue #286): ${passed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
