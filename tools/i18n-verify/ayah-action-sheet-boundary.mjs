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

// --- 1b. ISSUE #295 -- THE AYAH CARD'S TWO NEW ACTIONS ----------------------

// Issue #325 -- updated in place, reason recorded: "Take an Approach" no
// longer claims Learning the instant an Approach is picked (the old
// checks below asserted exactly that one-shot shape). Choosing an Approach
// now only reveals a four-stage row (Not started/Learning/Practising/
// Achieved); the attribute the select carries also changed, from
// data-ayah-sheet-approach-select to the shared, reusable
// data-approach-stage-select (see wireApproachStagePicker()'s own comment
// on why the picker itself was pulled out into a function the "This page"
// card reuses verbatim rather than growing a second one).
check("Take an Approach renders a real <select> carrying exactly the caller's own optionsHtml, never gated on isSelf", () => {
  const optionsHtml = `<option value="approach_02">Hifz / Memorising</option>`;
  const self = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", isSelf: true, approachOptionsHtml: optionsHtml });
  const other = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", isSelf: false, approachOptionsHtml: optionsHtml });
  for (const html of [self, other]) {
    assert.ok(html.includes("data-approach-stage-select"), "the Approach pull-down is missing");
    assert.ok(/<select[^>]*data-approach-stage-select[^>]*>/.test(html), "the Approach pull-down is not a real <select>");
    assert.ok(html.includes(optionsHtml), "the pull-down does not carry the caller's own Approach options");
    assert.ok(!/data-approach-stage-select[^>]*aria-disabled/.test(html), "the Approach pull-down must never be gated on isSelf");
  }
});

check("Take an Approach's own placeholder option is unselectable (empty value) and comes before any real Approach", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", approachOptionsHtml: `<option value="approach_02">Hifz</option>` });
  const selectHtml = html.match(/<select[^>]*data-approach-stage-select[\s\S]*?<\/select>/)[0];
  const placeholderIdx = selectHtml.indexOf('value=""');
  const realIdx = selectHtml.indexOf('value="approach_02"');
  assert.ok(placeholderIdx !== -1 && realIdx !== -1 && placeholderIdx < realIdx, "the placeholder option must come first and stay unselectable");
});

// UPDATED IN PLACE, 1 Oct 2026 (Owner, a photo of the Ayah Card: "'Record
// Your Progress' (earlier known as Track) is missing in Ayah Card, should be
// here"). This used to assert NO stage row before an Approach is picked --
// exactly what hid the Record step. Now the title and the four stages always
// render; with nothing picked every stage is disabled, none is pressed, and a
// line says to choose an Approach first.
// UPDATED IN PLACE, Owner 1 Oct 2026: Not Applicable always shows, so a student's row (the default, canConfirm false) has five.
check("no Approach picked yet: ✅ Record Your Progress and all five stages show (the four, then Not Applicable), every stage disabled and none pressed, with a line saying to choose an Approach first", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", approachOptionsHtml: `<option value="approach_02">Hifz</option>` });
  assert.ok(html.includes("data-gac-record-title"), "the Record Your Progress title is missing with no Approach selected");
  const btns = html.match(/<button[^>]*data-approach-stage-btn="[^"]*"[^>]*>/g) || [];
  assert.equal(btns.length, 5, `expected 5 stage buttons, found ${btns.length}`);
  for (const b of btns) {
    assert.ok(/\sdisabled[\s>]/.test(b), `a stage button is pressable with no Approach chosen: ${b}`);
    assert.ok(/aria-pressed="false"/.test(b), `a stage shows as pressed with no Approach chosen: ${b}`);
  }
  assert.ok(html.includes("data-gac-record-needs-approach"), "no line tells the reader to choose an Approach first");
});

check("issue #325 -- an Approach IS picked (a student's card): the four stages and Not Applicable render, the current one pressed, the rest not", () => {
  const html = renderAyahActionSheetHtml({
    unitKey: "ayah:1:1", approachOptionsHtml: `<option value="approach_02">Hifz</option>`,
    selectedApproachId: "approach_02", selectedApproachStatusId: "practising",
  });
  for (const id of ["not_started", "learning", "practising", "achieved", "not_applicable"]) {
    assert.ok(html.includes(`data-approach-stage-btn="${id}"`), `missing the ${id} stage button`);
  }
  // UPDATED in place, issue #370 (Global Approach Card, Owner-approved): the
  // card now SAYS "Mastered is confirmed by a teacher." under the stages, so
  // the word itself appears; what must never appear is a Mastered BUTTON.
  assert.ok(!html.includes('data-approach-stage-btn="mastered"'), "a student's card must not offer Mastered as a button");
  assert.ok(html.includes("gac-mastered-note"), "the 'Mastered is confirmed by a teacher.' line is missing");
  // Owner decision 39: the stage buttons carry their own title, before them.
  assert.ok(/data-gac-record-title>✅ Record Your Progress</.test(html), "the 'Record Your Progress' title is missing");
  assert.ok(html.indexOf("data-gac-record-title") < html.indexOf("data-approach-stage-btn="), "the title must come before the stage buttons");
  const pressed = [...html.matchAll(/data-approach-stage-btn="([a-z_]+)" aria-pressed="(true|false)"/g)];
  assert.equal(pressed.length, 5, "expected exactly five stage buttons");
  for (const [, id, val] of pressed) assert.equal(val, id === "practising" ? "true" : "false", `${id} carries the wrong aria-pressed`);
});

// Owner, 1 Oct 2026: "'Mastered' should appear for the user, the note about
// Mastered availability criteria should only appear to a student account."
check("canConfirm (owner, prime, teacher, guardian, self-learner): six stages in order, Mastered among them, and NO teacher note", () => {
  const html = renderAyahActionSheetHtml({
    unitKey: "ayah:1:1", approachOptionsHtml: `<option value="approach_02">Hifz</option>`,
    selectedApproachId: "approach_02", selectedApproachStatusId: "mastered", canConfirm: true,
  });
  const ids = [...html.matchAll(/data-approach-stage-btn="([a-z_]+)" aria-pressed="(true|false)"/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(ids, [["not_started", "false"], ["learning", "false"], ["practising", "false"], ["achieved", "false"], ["mastered", "true"], ["not_applicable", "false"]]);
  assert.ok(!html.includes("gac-mastered-note"), "the teacher note must not show to someone who can mark Mastered");
});

check("issue #325 -- the picked Approach's own <option> carries selected, so the select shows it rather than the placeholder", () => {
  const html = renderAyahActionSheetHtml({
    unitKey: "ayah:1:1", approachOptionsHtml: `<option value="approach_01">Reading</option><option value="approach_02">Hifz</option>`,
    selectedApproachId: "approach_02", selectedApproachStatusId: "not_started",
  });
  assert.ok(html.includes('<option value="approach_02" selected>'), "the picked Approach's own option is not marked selected");
  assert.ok(!html.includes('<option value="approach_01" selected>'), "the WRONG option was marked selected");
  assert.ok(/<option value="" [^>]*selected[^>]*disabled/.test(html) === false, "the placeholder must not be selected once a real Approach is picked");
});

check("Make a poster: hasPosterNote=false shows the sheet's own hint and a Take Note offer; true/null (unresolved) shows neither", () => {
  const noNote = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", hasPosterNote: false });
  assert.ok(noNote.includes("data-ayah-sheet-poster"), "the Make a poster button is missing");
  assert.ok(noNote.includes("You don't have a Note on this āyah yet."));
  assert.ok(noNote.includes("Take Note"));
  for (const val of [true, null, undefined]) {
    const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", hasPosterNote: val });
    assert.ok(!html.includes("You don't have a Note on this āyah yet."), `hasPosterNote=${val} should show no hint`);
  }
});

check("Make a poster is never gated on isSelf either", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", isSelf: false, hasPosterNote: true });
  assert.ok(!/data-ayah-sheet-poster[^>]*aria-disabled/.test(html));
});

// --- 1c. ISSUE #295 -- STATUS PART B -----------------------------------------

check("Status B.1 Approach: one coloured dot per Approach status, and a See on the wheel button", () => {
  const approachStatuses = [
    { id: "approach_01", name: "Reading", statusId: "achieved", color: "#5b84c4", label: "Achieved" },
    { id: "approach_02", name: "Hifz / Memorising", statusId: "not_started", color: "#333f5c", label: "Not started" },
  ];
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", approachStatuses });
  assert.equal((html.match(/class="ayah-approach-dot"/g) ?? []).length, 2, "expected one dot per Approach");
  assert.ok(html.includes("background:#5b84c4") && html.includes("background:#333f5c"), "dots must carry the caller's own colour");
  assert.ok(html.includes("data-ayah-sheet-see-wheel"), "the See on the wheel button is missing");
});

check("Status B.1 Approach: an empty list says so in words rather than drawing nothing", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", approachStatuses: [] });
  assert.ok(html.includes("No Approaches yet."));
  assert.equal((html.match(/class="ayah-approach-dot"/g) ?? []).length, 0);
});

check("Status B.2 Word by Word: known/total count line and one tappable chip per word, known words marked", () => {
  const wordStatus = {
    known: 1, total: 2,
    words: [
      { position: 1, arabic: "بِسْمِ", known: true, occurrenceId: "quran-word-occurrence:v1:1:1:1" },
      { position: 2, arabic: "اللَّهِ", known: false, occurrenceId: "quran-word-occurrence:v1:1:1:2" },
    ],
  };
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", wordStatus });
  assert.ok(html.includes("Known 1 of 2 words"), "the known/total count line is missing or wrongly worded");
  assert.equal((html.match(/data-word-occurrence="quran-word-occurrence:v1:1:1:\d"/g) ?? []).length, 2, "expected one chip per word");
  assert.ok(/class="ayah-wbw-chip is-known"[^>]*data-word-occurrence="quran-word-occurrence:v1:1:1:1"/.test(html), "the known word must carry is-known");
  assert.ok(!new RegExp(`class="ayah-wbw-chip is-known"[^>]*data-word-occurrence="quran-word-occurrence:v1:1:1:2"`).test(html), "the not-yet-known word must not carry is-known");
});

check("Status B.2 Word by Word: unresolved (null) reads as loading, never a false zero", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", wordStatus: null });
  assert.ok(!html.includes("Known 0 of 0 words"), "an unresolved word status must never render as a false 0-of-0");
  assert.ok(html.includes("Loading"));
});

check("Status B.3 Hifz: shows the caller's own status colour and label; null says the Approach isn't set up", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", hifzStatus: { statusId: "learning", label: "Learning", color: "#8a6a35" } });
  assert.ok(html.includes("ayah-hifz-chip") && html.includes("background:#8a6a35") && html.includes(">Learning<"));
  const none = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", hifzStatus: null });
  assert.ok(none.includes("No Hifz Approach set up yet."));
});

// Updated in place (Ayah Card section C part 1): Related āyāt is built now.
check("Part C (Info): Related āyāt says it is loading, then lists real jump buttons", () => {
  const loading = renderAyahActionSheetHtml({ unitKey: "ayah:1:1" });
  assert.ok(loading.includes("data-ayah-sheet-info"), "the Info (C) section is missing entirely");
  assert.ok(loading.includes("Finding related āyāt…"), "a null `related` must say it is loading, never render blank");
  const filled = renderAyahActionSheetHtml({ unitKey: "ayah:2:255", related: {
    lists: [{ surah: 3, ayah: 2, ref: "3:2", reason: "QCR: Tawhid" }],
    shared: [{ surah: 20, ayah: 110, ref: "20:110", reason: "4 shared words" }],
  } });
  assert.ok(filled.includes('data-ayah-related-jump="3:2"') && filled.includes('data-ayah-related-jump="20:110"'));
  assert.ok(filled.includes("QCR: Tawhid") && filled.includes("4 shared words"));
  const empty = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", related: { lists: [], shared: [] } });
  assert.ok(empty.includes("No related āyāt found."));
  const failed = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", related: { error: true } });
  assert.ok(failed.includes("Couldn't load related āyāt just now."));
  const hostile = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", related: { lists: [], shared: [{ surah: 1, ayah: 2, ref: "<img onerror=x>", reason: "<b>" }] } });
  assert.ok(!hostile.includes("<img") && !hostile.includes("<b>"), "labels must be escaped");
});

// Updated in place (issue #318, Ayah Card section C part 2): Connected āyāt
// is built now, replacing the earlier marked placeholder this check used to
// assert stayed on screen -- it never should again.
check("Part C (Info): Connected āyāt says it is loading, then lists real jump buttons with a studied marker", () => {
  const loading = renderAyahActionSheetHtml({ unitKey: "ayah:1:1" });
  assert.ok(loading.includes("data-ayah-sheet-connected"), "the Connected block is missing entirely");
  assert.ok(loading.includes("Finding connected āyāt…"), "a null `connected` must say it is loading, never render blank");
  assert.ok(!loading.includes("coming next"), "the old 'coming next' placeholder must be gone");
  const filled = renderAyahActionSheetHtml({ unitKey: "ayah:2:255", connected: {
    items: [
      { surah: 2, ayah: 256, ref: "2:256", reason: "Note: My reflection", studied: false },
      { surah: 3, ayah: 2, ref: "3:2", reason: "Folder: Tafsir folder", studied: true },
      { surah: 20, ayah: 110, ref: "20:110", reason: "Note: Old note", studied: null },
    ],
  } });
  assert.ok(filled.includes('data-ayah-related-jump="2:256"') && filled.includes('data-ayah-related-jump="3:2"') && filled.includes('data-ayah-related-jump="20:110"'));
  assert.ok(filled.includes("Note: My reflection") && filled.includes("Folder: Tafsir folder"));
  assert.ok(filled.includes("Not studied yet"), "studied: false must say so in words");
  assert.ok(filled.includes(">Studied<"), "studied: true must say so in words");
  assert.ok(filled.includes("Not checked"), "studied: null must say 'not checked', never guessed either way");
  const empty = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", connected: { items: [] } });
  assert.ok(empty.includes("No connected āyāt found."));
  const failed = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", connected: { error: true } });
  assert.ok(failed.includes("Couldn't load connected āyāt just now."));
  const restricted = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", connected: { restricted: true } });
  assert.ok(restricted.includes("Connections are shown for your own Notes."));
  const hostile = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", connected: { items: [{ surah: 1, ayah: 2, ref: "<img onerror=x>", reason: "<b>", studied: null }] } });
  assert.ok(!hostile.includes("<img") && !hostile.includes("<b>"), "labels must be escaped");
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
  while ((am = attrPairRe.exec(tagHtml))) if (am[1] && am[1] !== "button" && am[1] !== "div" && am[1] !== "select") attrs[am[1]] = am[2] ?? "";
  let value = "";
  const el = {
    dataset: Object.fromEntries(Object.entries(attrs)
      .filter(([k]) => k.startsWith("data-"))
      .map(([k, v]) => [k.replace(/^data-/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v])),
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    addEventListener: (_evt, fn) => { el._fire = fn; },
    isConnected: true,
    get value() { return value; },
    set value(v) { value = v; },
  };
  return el;
}
// issue #295 -- querySelectorAll, for the "Take Note" button the poster
// hint shares with the main Note & more item (two elements, one attribute).
function findAllTags(html, attrName) {
  const re = new RegExp(`<[a-z]+[^>]*\\b${attrName}\\b[^>]*>`, "g");
  return [...html.matchAll(re)].map((m) => m[0]);
}
function fakeContainer(html) {
  const cache = new Map();
  const allCache = new Map();
  function findAndCache(sel) {
    if (cache.has(sel)) return cache.get(sel);
    const attrName = sel.slice(1, -1); // "[data-x]" -> "data-x"
    const tags = findAllTags(html, attrName);
    const el = tags.length ? elementFromTag(tags[0]) : null;
    cache.set(sel, el);
    return el;
  }
  function findAllAndCache(sel) {
    if (allCache.has(sel)) return allCache.get(sel);
    const attrName = sel.slice(1, -1);
    const els = findAllTags(html, attrName).map(elementFromTag);
    allCache.set(sel, els);
    return els;
  }
  const sheetEl = {
    dataset: { unitKey: (html.match(/data-unit-key="([^"]*)"/) ?? [, ""])[1] },
    querySelector: findAndCache,
    querySelectorAll: findAllAndCache,
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

// --- 2b. ISSUE #295/#325 -- THE APPROACH PICKER'S CALLBACKS ----------------
// Updated in place, reason recorded: onTakeApproach (a single callback that
// both claimed AND closed the sheet) is gone, replaced by onApproachPicked
// (picking -- never closes, never writes) and onStageChoice (pressing a
// stage button -- the only thing that writes, and it ALSO never closes the
// sheet, since the whole point of issue #325 is trying more than one stage
// without reopening the card).

check("choosing an Approach fires onApproachPicked(unitKey, approachId) and does NOT close the sheet (issue #325: picking is not claiming)", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:2:255", approachOptionsHtml: `<option value="approach_02">Hifz</option>` });
  const container = fakeContainer(html);
  const order = [];
  attachAyahActionSheetHandlers(container, {
    onClose: () => order.push("close"),
    onApproachPicked: (uk, id) => order.push(`pick:${uk}:${id}`),
  });
  const select = container.querySelector("[data-ayah-sheet]").querySelector("[data-approach-stage-select]");
  select.value = "approach_02";
  select._fire();
  assert.deepEqual(order, ["pick:ayah:2:255:approach_02"], "picking an Approach must fire onApproachPicked and must not fire onClose");
});

check("choosing the pull-down's own empty placeholder value fires nothing", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", approachOptionsHtml: `<option value="approach_02">Hifz</option>` });
  const container = fakeContainer(html);
  let fired = false;
  attachAyahActionSheetHandlers(container, { onApproachPicked: () => { fired = true; } });
  const select = container.querySelector("[data-ayah-sheet]").querySelector("[data-approach-stage-select]");
  select.value = "";
  select._fire();
  assert.equal(fired, false, "the placeholder value must never fire a pick");
});

check("issue #325 -- pressing a stage button fires onStageChoice(unitKey, approachId, statusId) for the CURRENTLY selected Approach, and does NOT close the sheet", () => {
  const html = renderAyahActionSheetHtml({
    unitKey: "ayah:2:255", approachOptionsHtml: `<option value="approach_02">Hifz</option>`,
    selectedApproachId: "approach_02", selectedApproachStatusId: "not_started",
  });
  const container = fakeContainer(html);
  const order = [];
  attachAyahActionSheetHandlers(container, {
    onClose: () => order.push("close"),
    onStageChoice: (uk, id, statusId) => order.push(`stage:${uk}:${id}:${statusId}`),
  });
  const sheet = container.querySelector("[data-ayah-sheet]");
  const select = sheet.querySelector("[data-approach-stage-select]");
  // The fake stand-in never parses a rendered <option selected> into .value
  // itself (see elementFromTag's own comment) -- a real <select> would
  // already read "approach_02" here, which is exactly what the markup-level
  // check above ("the picked Approach's own <option> carries selected")
  // proves independently.
  select.value = "approach_02";
  const buttons = sheet.querySelectorAll("[data-approach-stage-btn]");
  const btn = buttons.find((b) => b.getAttribute("data-approach-stage-btn") === "practising");
  assert.ok(btn, "the Practising stage button was not found");
  btn._fire();
  assert.deepEqual(order, ["stage:ayah:2:255:approach_02:practising"], "a stage press must fire onStageChoice and must not fire onClose");
});

// UPDATED IN PLACE, 1 Oct 2026: the stages now render with nothing picked
// (see above), so this presses one for real instead of asserting there is
// none -- the empty select must still stop any write.
check("issue #325 -- pressing a stage button with no Approach picked fires nothing (the select's own empty value guards it)", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", approachOptionsHtml: `<option value="approach_02">Hifz</option>` });
  const container = fakeContainer(html);
  const order = [];
  attachAyahActionSheetHandlers(container, {
    onClose: () => order.push("close"),
    onStageChoice: (uk, id, statusId) => order.push(`stage:${uk}:${id}:${statusId}`),
  });
  const sheet = container.querySelector("[data-ayah-sheet]");
  const btn = sheet.querySelectorAll("[data-approach-stage-btn]").find((b) => b.getAttribute("data-approach-stage-btn") === "learning");
  assert.ok(btn, "precondition: the Learning stage button now renders with nothing picked");
  btn._fire();
  assert.deepEqual(order, [], "a stage press with no Approach chosen must write nothing");
});

check("Make a poster and See on the wheel both fire with onClose first", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", hifzStatus: null });
  const container = fakeContainer(html);
  const order = [];
  attachAyahActionSheetHandlers(container, {
    onClose: () => order.push("close"),
    onPoster: (uk) => order.push(`poster:${uk}`),
    onSeeOnWheel: (uk) => order.push(`wheel:${uk}`),
  });
  const sheet = container.querySelector("[data-ayah-sheet]");
  sheet.querySelector("[data-ayah-sheet-poster]")._fire();
  sheet.querySelector("[data-ayah-sheet-see-wheel]")._fire();
  assert.deepEqual(order, ["close", "poster:ayah:1:1", "close", "wheel:ayah:1:1"]);
});

check("the poster hint's own Take Note button reaches onNote, distinctly from the main Note & more item", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", isSelf: true, hasPosterNote: false });
  const container = fakeContainer(html);
  let calls = 0;
  attachAyahActionSheetHandlers(container, { onNote: () => { calls++; } });
  const sheet = container.querySelector("[data-ayah-sheet]");
  const noteButtons = sheet.querySelectorAll("[data-ayah-sheet-note]");
  assert.equal(noteButtons.length, 2, "expected the main Note & more button plus the poster hint's own Take Note button");
  noteButtons[1]._fire();
  assert.equal(calls, 1, "the poster hint's Take Note button did not reach onNote");
});

check("tapping a Word by Word chip closes the sheet and opens that word's occurrence, without touching any other button", () => {
  const wordStatus = {
    known: 0, total: 1,
    words: [{ position: 1, arabic: "بِسْمِ", known: false, occurrenceId: "quran-word-occurrence:v1:1:1:1" }],
  };
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", wordStatus });
  const container = fakeContainer(html);
  const order = [];
  attachAyahActionSheetHandlers(container, {
    onClose: () => order.push("close"),
    onWordTap: (occ) => order.push(`word:${occ}`),
    onBookmark: () => order.push("bookmark"),
  });
  const statusEl = container.querySelector("[data-ayah-sheet]").querySelector("[data-ayah-sheet-status]");
  statusEl._fire({ target: { closest: (sel) => (sel === "[data-word-occurrence]" ? { dataset: { wordOccurrence: "quran-word-occurrence:v1:1:1:1" } } : null) } });
  assert.deepEqual(order, ["close", "word:quran-word-occurrence:v1:1:1:1"]);
});

check("a click inside the status area that is NOT on a word does nothing", () => {
  const html = renderAyahActionSheetHtml({ unitKey: "ayah:1:1" });
  const container = fakeContainer(html);
  let fired = false;
  attachAyahActionSheetHandlers(container, { onWordTap: () => { fired = true; } });
  const statusEl = container.querySelector("[data-ayah-sheet]").querySelector("[data-ayah-sheet-status]");
  statusEl._fire({ target: { closest: () => null } });
  assert.equal(fired, false);
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
  // Updated in place (3 Oct 2026): Word card round 6 (#518) puts the 🔍 search
  // row between </header> and this row, when Search is open. Both stay
  // OUTSIDE the header, which is what this check guards.
  const text = read("app/js/quran-word-card.js");
  assert.ok(/<\/header>\s*(?:\$\{searchOpen \? searchRowHtml\([^}]*\) : ""\}\s*)?<div class="word-card-ayah-action-row">/.test(text),
    "the ayah-action row is not a sibling placed after </header> (with at most the search row between)");
});

// --- 6b. ISSUE #295 -- THE THIRD ENTRY POINT: THE ĀYAH NUMBER BADGE --------

check("ayah-renderer.js's Arabic panel stamps the number badge as a real button, carrying the plain surah:ayah shape, only when it can also identify the surah", () => {
  const text = read("app/js/ayah-renderer.js");
  assert.ok(/data-ayah-num-badge="\$\{surahNumber\}:\$\{ayah\.ayah\}"/.test(text),
    "the number badge is not stamped with the same plain surah:ayah shape the Mushaf marker/Word Card button use");
  // Updated in place (3 Oct 2026): #482 (Al-Fātiḥah's display count) adds
  // `shown == null ? ""` first, for the unnumbered Bismillah; the button-vs-
  // span choice after it is still gated on `clickable`.
  assert.ok(/const numBadge = (?:shown == null \? ""\s*:\s*)?clickable/.test(text), "the badge's own button-vs-span choice is not gated on the same `clickable` precondition the word buttons already require");
});

check("quranrevival.html's Note view stamps the same number-badge button locally, and both wire to openAyahActionSheet", () => {
  const text = read("app/quranrevival.html");
  assert.ok(/data-ayah-num-badge="\$\{currentSurahNum\}:\$\{a\.ayah\}"/.test(text),
    "the Note view's own locally-built Arabic block does not stamp a matching number badge");
  assert.ok(/data-ayah-num-badge[\s\S]{0,120}openAyahActionSheet\(ayahNumBadge\.dataset\.ayahNumBadge\)/.test(text),
    "the number badge tap is not wired to openAyahActionSheet");
});

check("the number badge is a <button>, not a <span>, wherever it is clickable -- the row's own CSS is unchanged by that swap (a class rule, not an element rule)", () => {
  const text = read("app/js/ayah-renderer.js");
  assert.ok(/<button type="button" class="ayah-num-badge"/.test(text), "the clickable badge is not a real <button>");
  assert.ok(/<span class="ayah-num-badge">/.test(text), "the non-interactive fallback (no surahNumber/wordCardInteractive) must stay a <span>");
});

// --- 6c. ISSUE #295 -- "TAKE AN APPROACH" CALLS THE SAME claimStatus() ------
// AS THE NOTE VIEW'S OWN TRACK TAB, WITH THE SAME FIELD SHAPE. A browser
// suite can compare the actual __stubWriteData payloads; this static check
// proves the SOURCE never diverges into a second write path in the first
// place -- both call sites' own field lists, extracted independently and
// compared as sets rather than assumed to match by eye.

// Issue #325 -- claimApproachStatus() writes `statusId` as a bare shorthand
// property (the parameter is already named `statusId`), which the old
// colon-only regex below could not see at all -- found by this very check
// going unproven-red the moment the field existed under a different spelling
// than the extraction expected. Splitting on top-level commas instead (every
// field in a claimStatus(db, {...}) call is a flat, one-level-deep object
// literal -- no field's own VALUE ever contains a literal comma, checked by
// eye against every call site this function is used on) sees both shorthand
// and colon-style fields alike.
function claimStatusFieldsAfter(text, anchorFnName) {
  const fnStart = text.indexOf(`function ${anchorFnName}`);
  assert.ok(fnStart !== -1, `${anchorFnName} not found`);
  const callStart = text.indexOf("claimStatus(db, {", fnStart);
  assert.ok(callStart !== -1, `${anchorFnName} does not call claimStatus(db, {...})`);
  const bodyStart = callStart + "claimStatus(db, {".length;
  const callEnd = text.indexOf("})", callStart);
  const body = text.slice(bodyStart, callEnd);
  return body.split(",").map((seg) => seg.trim()).filter(Boolean).map((seg) => seg.split(":")[0].trim()).sort();
}

// Issue #325 -- updated in place, reason recorded: takeApproachForAyah() no
// longer calls claimStatus(db, {...}) directly -- both it and the new
// takeApproachForPage() (the "This page" card's own stage press) go through
// one shared claimApproachStatus() helper instead, so THAT function is now
// the one to compare against the Track tab's own claim button.
check("claimApproachStatus() (shared by the Ayah Card and the This page card) and wireApproachEmbed() (the Track tab's own claim button) call claimStatus() with the identical field set", () => {
  const text = read("app/quranrevival.html");
  const sharedFields = claimStatusFieldsAfter(text, "claimApproachStatus");
  const trackTabFields = claimStatusFieldsAfter(text, "wireApproachEmbed");
  assert.deepEqual(sharedFields, trackTabFields, "the two claimStatus() calls no longer pass the same fields -- a second write path may have been introduced");
});

check("takeApproachForAyah() and takeApproachForPage() both write through the shared claimApproachStatus() helper, never a second write path of their own", () => {
  const text = read("app/quranrevival.html");
  assert.ok(/import\s*\{[^}]*\bclaimStatus\b[^}]*\}\s*from\s*"\.\/js\/records\.js"/.test(text), "claimStatus is not imported from records.js");
  for (const fnName of ["takeApproachForAyah", "takeApproachForPage"]) {
    const fnStart = text.indexOf(`function ${fnName}`);
    assert.ok(fnStart !== -1, `${fnName} not found`);
    const fnEnd = text.indexOf("\n    }", fnStart);
    const body = text.slice(fnStart, fnEnd);
    assert.ok(/claimApproachStatus\(/.test(body), `${fnName} does not call the shared claimApproachStatus()`);
    assert.ok(!/claimStatus\(db,/.test(body), `${fnName} calls claimStatus() directly instead of going through claimApproachStatus()`);
    assert.ok(!/firebasejs|setDoc\(|updateDoc\(/.test(body), `${fnName} talks to Firestore directly instead of going through records.js`);
  }
});

check("takeApproachForPage() claims the PAGE unit key only -- it never builds or writes an ayah: unit key (Owner decision 4: 'keep Ayah has it's separate approach')", () => {
  const text = read("app/quranrevival.html");
  const fnStart = text.indexOf("function takeApproachForPage");
  const fnEnd = text.indexOf("\n    }", fnStart);
  const body = text.slice(fnStart, fnEnd);
  assert.ok(!/buildUnitKey\.ayah/.test(body), "takeApproachForPage() must never build an ayah: unit key");
});

console.log(`\n==== "This āyah" action sheet + folder filing (issue #286): ${passed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
