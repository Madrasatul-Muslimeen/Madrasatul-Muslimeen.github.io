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
// UPDATED for P6-G (issue #229), reason recorded rather than the window
// silently loosened without one: "Move to…" is no longer unique -- the new
// folder-editing ⋯ menu offers its own "Move to…" action (moving a FOLDER),
// alongside the pre-existing one on a filed Note. Both must be gated, so
// every occurrence is checked now, not just the first. Measured directly,
// the farthest `isSelfSelected()` gate sits 1579 characters before its own
// "Move to…" text (the Note-in-folder one, now preceded by the folder ⋯
// menu's own markup plus the two new Note reorder buttons); the window
// widens to 1700 to comfortably clear that measured distance.
//
// UPDATED AGAIN for issue #259, reason recorded: Folders became an
// expandable tree with no separate "+ New folder" reveal button any more --
// `folderFooterHtml()` renders the form directly, gated on the same
// `isSelfSelected()` check, so `id="newFolderBtn"` is replaced with
// `id="newFolderForm"`, the form the check can still find and still needs
// to prove is gated. And `folderRowHtml()`'s own ⋯ menu now carries FIVE
// actions (📍/✏️/▲/▼/Move to…/🗑, plus the toggle/badge/pin/name markup built
// before them) rather than three, so its own "Move to…" sits further from
// its `const editable = isSelfSelected() && …` gate than before -- measured
// directly at 2473 characters; the window widens to 2600 to comfortably
// clear that.
//
// UPDATED AGAIN for issue #282 (speed, part 5): `folderRowHtml()`'s own count
// badge grew a provisional "…" state (Notes/placements loading in the
// background), and the comment explaining it sits between the SAME
// `const editable = isSelfSelected() && …` gate and that row's own
// "Move to…" text -- measured directly at 2870 characters; the window widens
// to 3000 to comfortably clear that. The gate itself did not move or weaken;
// only the text between it and what it protects grew.
check("every write-triggering control is gated behind isSelfSelected(), at every occurrence", () => {
  const WINDOW = 3000;
  for (const marker of ['id="newFolderForm"', 't("+ File a Note here…")', 't("Move to…")']) {
    let idx = -1, found = 0;
    while ((idx = page.indexOf(marker, idx + 1)) !== -1) {
      found++;
      const before = page.slice(Math.max(0, idx - WINDOW), idx);
      assert.ok(/isSelfSelected\(\)/.test(before), `no isSelfSelected() gate found in the ${WINDOW} characters before an occurrence of: ${marker}`);
    }
    assert.ok(found >= 1, `expected marker not found in the page: ${marker}`);
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
// --- 7. FOLDER EDITING IS WIRED (P6-G, issue #229) --------------------------
// `journey-map-boundary.mjs` already proves the WIRING side (the five
// service wrappers are reachable only from this page, and from nowhere
// else). This suite covers the SCREEN's own contract instead: the controls
// render only in the Folders view, are gated the same way every other
// self-only write on this page already is, a system folder is excluded
// (ADR-010 §3), a reorder is a genuine two-value swap rather than a single
// overwrite, a refused move is shown in the accepted refusal vocabulary's
// own words rather than a raw contract slug, and a refused retire is said
// in words BEFORE the write is even attempted.
function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start !== -1, `no function ${name}() found`);
  // Every top-level function in this page is closed by a "\n    }\n" at the
  // module's own 4-space indent -- scanning for the next occurrence of that
  // exact closer is enough to isolate one function's body without a real
  // parser, the same shallow-but-sufficient technique this suite's own
  // `functionBody`-less checks already use via plain substring search.
  const closeAt = source.indexOf("\n    }\n", start);
  assert.ok(closeAt !== -1, `could not find the end of function ${name}()`);
  return source.slice(start, closeAt);
}

check("editing controls (rename/move/remove/reorder) are built by folderRowHtml() alone, never by the Timeline or Path renderers", () => {
  const rowHtml = functionBody(page, "folderRowHtml");
  for (const marker of ["data-folder-rename", "data-folder-move", "data-folder-remove", "data-folder-up", "data-folder-down"]) {
    assert.ok(rowHtml.includes(marker), `folderRowHtml() no longer builds ${marker}`);
  }
  const timeline = functionBody(page, "renderTimelineView");
  const pathView = functionBody(page, "renderPathView");
  assert.ok(!timeline.includes("folderRowHtml") && !pathView.includes("folderRowHtml"),
    "Timeline or Path now renders folder rows -- the issue's own scope is the Folders view only");
});
check("a folder's editing controls are gated behind isSelfSelected(), and a system folder (ADR-010 §3) gets none at all", () => {
  const rowHtml = functionBody(page, "folderRowHtml");
  const editableLine = rowHtml.match(/const editable = ([^;]+);/);
  assert.ok(editableLine, "no `editable` gate found in folderRowHtml()");
  assert.ok(/isSelfSelected\(\)/.test(editableLine[1]), "the editable gate does not check isSelfSelected()");
  assert.ok(/isSystemFolderRole\(/.test(editableLine[1]), "the editable gate does not exclude a system folder");
});
// UPDATED for the P6-G fix (issue #234, Architect review of PR #233),
// reason recorded rather than silently loosened: this check used to assert
// reorderFolderSwap()/reorderNoteInFolder() each called their wrapper
// EXACTLY TWICE -- proof that a swap issues two writes, never proof that
// the two writes actually move anything on screen. Every real folder and
// filing was created at order: 0 (createNoteFolder()/createNotePlacement()'s
// own default, never overridden by this page before this fix), so the OLD
// "exchange the two neighbours' own order fields" swap wrote 0 back over 0:
// two real writes, a genuine no-op. The fix routes both functions through
// the shared, pure planReorder() and a loop over its own returned writes,
// so "exactly two static calls" is no longer the right shape to assert --
// a loop calls its wrapper from ONE call site, N times at runtime. The
// BEHAVIOURAL claim the old name made ("a swap actually moves the display
// order") is what section 8 below proves instead, by running planReorder()
// itself -- extracted and executed for real, no browser needed -- against a
// seeded collision.
check("reordering a folder or a filed Note goes through the shared, pure planReorder() helper -- not a hardcoded two-field swap of the neighbours' own raw order values, the exact shape that no-ops when they collide", () => {
  for (const [fn, wrapper] of [["reorderFolderSwap", "reorderFolder"], ["reorderNoteInFolder", "reorderFiling"]]) {
    const body = functionBody(page, fn);
    assert.ok(/planReorder\(/.test(body), `${fn}() no longer calls planReorder()`);
    assert.ok(/for \(const write of writes\)/.test(body), `${fn}() no longer loops over planReorder()'s own returned writes`);
    const calls = [...body.matchAll(new RegExp(`\\b${wrapper}\\(`, "g"))].length;
    assert.equal(calls, 1, `${fn}() should call ${wrapper}() from exactly one loop body (one write per planned entry), not a hardcoded pair -- got ${calls} static call site(s)`);
    assert.ok(!/\bmineOrder\b|\botherOrder\b/.test(body), `${fn}() still reads the two neighbours' own raw order fields directly -- the exact shape that silently no-ops on a collision`);
  }
});
check("moving a folder surfaces EVERY reason folderTreeRefusal() can return, in this screen's own translated words -- never the raw contract slug", () => {
  const contract = fs.readFileSync(path.join(root, "app/js/journey-map-contract.js"), "utf8");
  // "too-deep" is legitimately returned from two different points in
  // folderTreeRefusal() (before the ancestor walk, and inside it) -- a Set
  // is the right dedupe here, not evidence of a second reason.
  const contractReasons = [...new Set([...contract.matchAll(/return "([a-z-]+)";/g)].map((m) => m[1]))].sort();
  assert.ok(contractReasons.length >= 6, "expected several refusal reasons in journey-map-contract.js -- did folderTreeRefusal() move?");
  const dictBody = page.slice(page.indexOf("const FOLDER_PARENT_REFUSAL_MESSAGES"), page.indexOf("function folderBusinessRefusal"));
  const dictKeys = [...dictBody.matchAll(/"([a-z-]+)":\s*\(\)\s*=>/g)].map((m) => m[1]).sort();
  assert.deepEqual(dictKeys, contractReasons,
    `FOLDER_PARENT_REFUSAL_MESSAGES no longer names exactly the contract's own refusal reasons -- contract: ${contractReasons.join(", ")}, dictionary: ${dictKeys.join(", ")}`);
  // The two reasons the issue itself names as examples ("one refused move
  // (cycle)") must be among them, by construction of the assertion above,
  // but named explicitly here so a future narrowing of the dictionary fails
  // this line even if the set-equality assertion were ever loosened.
  assert.ok(dictKeys.includes("cycle") && dictKeys.includes("too-deep"), "the depth/cycle refusals must be named");
});
check("a business refusal is shown via showPageStatus() in translated words, never left to the generic Firestore-style fallback", () => {
  const runner = functionBody(page, "runFolderWrite");
  assert.ok(/folderBusinessRefusal\(err\)/.test(runner), "runFolderWrite() no longer consults folderBusinessRefusal()");
  assert.ok(/showPageStatus\(known\)/.test(runner), "a known business refusal is no longer shown via showPageStatus()");
  assert.ok(/reportWriteFailure\(err, context\)/.test(runner), "an UNKNOWN failure no longer falls through to the normal I15 write-failure path");
});

// --- 8. P6-G FIX (issue #234, Architect review of PR #233): ▲▼ REORDER IS A -
//        GENUINE DISPLAY-ORDER CHANGE, NOT MERELY TWO WRITES ----------------
// `createNoteFolder()` and `createNotePlacement()` both default `order: 0`,
// and this page never overrode it at creation for a filed Note (nor
// reliably for a folder, once one had been retired -- see below), so every
// real folder and every real filing collided at order: 0. The OLD
// reorderFolderSwap()/reorderNoteInFolder() read the two neighbours' own
// `order` fields and wrote each other's value back -- correct once every
// sibling already holds a distinct value, a silent no-op the moment two
// neighbours collide. Section 7's own "genuine two-value SWAP" check only
// ever proved two writes happened; it could not, and did not, prove the
// display order actually moved -- it would pass identically against this
// exact no-op. This section runs the real, pure `planReorder()` --
// extracted straight out of the page and executed here, no browser needed,
// because it touches no DOM/Firebase -- against a seeded collision, proves
// it genuinely reorders the display, and MUTATION-PROVES it by running the
// OLD swap shape through the identical seed and showing it does not.
function extractCallable(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start !== -1, `no function ${name}() found`);
  const closeAt = source.indexOf("\n    }\n", start);
  assert.ok(closeAt !== -1, `could not find the end of function ${name}()`);
  const fnSource = source.slice(start, closeAt + "\n    }".length);
  // eslint-disable-next-line no-new-func -- extracting and running the
  // page's own pure helper is this suite's established technique
  // (hadith-gate-contracts.mjs does the same for a regex literal); there is
  // no browser in this sandbox to run it in a real <script type="module">.
  return new Function(`return (${fnSource});`)();
}
function applyWrites(siblings, writes) {
  const byId = new Map(siblings.map((s) => [s.id, { ...s }]));
  for (const w of writes) {
    const s = byId.get(w.id);
    if (s) s.order = w.order;
  }
  return [...byId.values()];
}
function displayOrderIds(siblings) {
  return siblings.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((s) => s.id);
}
// The OLD shape, reproduced exactly: read the two neighbours' own `order`
// fields and write each other's value back.
function oldSwap(siblings, idx, direction) {
  const mine = siblings[idx], other = siblings[idx + direction];
  if (!mine || !other) return [];
  return [
    { id: mine.id, order: other.order ?? 0 },
    { id: other.id, order: mine.order ?? 0 },
  ];
}

const planReorder = extractCallable(page, "planReorder");
const nextOrder = extractCallable(page, "nextOrder");

check("planReorder() is a real function, extractable and callable with no DOM/Firebase reference -- safe to run outside a browser", () => {
  assert.equal(typeof planReorder, "function");
  const declAt = page.indexOf("function planReorder(");
  const firstLines = page.slice(declAt, declAt + 700);
  assert.ok(!/\bdb\b|firebase|getFirestore|auth\.currentUser|document\./.test(firstLines),
    "planReorder() must not reference db/Firebase/DOM -- it has to be genuinely pure");
});

check("MUTATION CONTROL, reported: the OLD swap-the-two-fields shape is a genuine no-op against colliding order:0 siblings -- the defect PR #233 shipped", () => {
  const seeded = [{ id: "a", order: 0 }, { id: "b", order: 0 }, { id: "c", order: 0 }];
  const writes = oldSwap(seeded, 0, 1); // "move b up" -- swap positions 0 and 1
  assert.equal(writes.length, 2, "the old shape always writes exactly two documents");
  const after = applyWrites(seeded, writes);
  assert.deepEqual(displayOrderIds(after), ["a", "b", "c"],
    "the OLD swap logic was expected to no-op against a collision (this is the mutation control, not the fix) -- if the display order changed, this control is no longer proving what it claims to");
});

check("THE FIX, reported: planReorder() against the SAME colliding order:0 siblings genuinely moves the display order", () => {
  const seeded = [{ id: "a", order: 0 }, { id: "b", order: 0 }, { id: "c", order: 0 }];
  const writes = planReorder(seeded, 0, 1); // "move b up" -- swap positions 0 and 1
  assert.ok(writes.length >= 2, `expected the renumbering to touch at least the two swapped entries, got ${writes.length}`);
  const after = applyWrites(seeded, writes);
  assert.deepEqual(displayOrderIds(after), ["b", "a", "c"],
    "planReorder()'s own writes, applied, did not actually move the display order -- it is no better than the old no-op");
});

check("once a sibling set holds distinct, contiguous orders (the state planReorder() itself produces), a later one-place move costs exactly two writes, not a full renumber", () => {
  const distinct = [{ id: "a", order: 0 }, { id: "b", order: 1 }, { id: "c", order: 2 }];
  const writes = planReorder(distinct, 0, 1);
  assert.equal(writes.length, 2, `expected exactly 2 writes for a swap of two already-distinct siblings, got ${writes.length}`);
  const after = applyWrites(distinct, writes);
  assert.deepEqual(displayOrderIds(after), ["b", "a", "c"]);
});

check("planReorder() returns no writes past either end of the sibling list -- the same boundary the ▲▼ buttons themselves already disable", () => {
  const seeded = [{ id: "a", order: 0 }, { id: "b", order: 1 }];
  assert.deepEqual(planReorder(seeded, 0, -1), [], "moving the first item further up must be a no-op");
  assert.deepEqual(planReorder(seeded, 1, 1), [], "moving the last item further down must be a no-op");
});

// --- issue #259: planMove() -- the drag-and-drop generalisation of planReorder() ---
const planMove = extractCallable(page, "planMove");
check("planMove() is a real, pure function -- same discipline as planReorder() (renumber by display position, write only what changed), generalised to an arbitrary target index", () => {
  assert.equal(typeof planMove, "function");
  const declAt = page.indexOf("function planMove(");
  assert.ok(!/\bdb\b|firebase|getFirestore|auth\.currentUser|document\./.test(page.slice(declAt, declAt + 500)),
    "planMove() must not reference db/Firebase/DOM -- it has to be genuinely pure");
});
check("planMove() genuinely relocates a folder several positions away, not just an adjacent swap", () => {
  const siblings = [{ id: "a", order: 0 }, { id: "b", order: 1 }, { id: "c", order: 2 }, { id: "d", order: 3 }];
  const writes = planMove(siblings, 0, 2); // drag "a" to land after "c"
  const after = applyWrites(siblings, writes);
  assert.deepEqual(displayOrderIds(after), ["b", "c", "a", "d"]);
});
check("planMove() is a no-op when the target is the folder's own current position", () => {
  const siblings = [{ id: "a", order: 0 }, { id: "b", order: 1 }];
  assert.deepEqual(planMove(siblings, 1, 1), []);
});
check("planMove() writes only the entries whose display position actually changed", () => {
  // Moving the LAST item to the front shifts every other entry's position --
  // moving the FIRST item to the second slot only ever touches those two.
  const siblings = [{ id: "a", order: 0 }, { id: "b", order: 1 }, { id: "c", order: 2 }];
  const writes = planMove(siblings, 0, 1);
  assert.equal(writes.length, 2, `expected exactly 2 changed entries, got ${writes.length}`);
});

check("nextOrder() is pure and callable, and lands a new sibling strictly after the current maximum -- never colliding at 0", () => {
  assert.equal(typeof nextOrder, "function");
  assert.equal(nextOrder([]), 0, "an empty sibling set must start at 0");
  assert.equal(nextOrder([{ order: 0 }, { order: 5 }, { order: 2 }]), 6, "a new sibling must land strictly after the current maximum, gaps and all");
});

check("filing a Note into a folder computes its order from that folder's own current placements via nextOrder(), rather than leaving createNotePlacement()'s order: 0 default in place", () => {
  const body = functionBody(page, "fileNoteInFolder");
  assert.ok(/order\s*=\s*nextOrder\(/.test(body), "fileNoteInFolder() no longer computes order via nextOrder()");
  assert.ok(/folderContents\(/.test(body), "fileNoteInFolder() no longer reads the target folder's own existing placements before filing");
  const createCall = body.slice(body.indexOf("createNotePlacement("));
  assert.ok(/\border\b/.test(createCall.slice(0, 200)), "createNotePlacement() is no longer passed an explicit order");
});

// UPDATED for issue #259, reason recorded rather than the check loosened
// without one: "+ New folder" now supports a pinned 📍 target (any real
// folder, not only the top level), so the order computation genuinely
// branches -- `order: nextOrder(...)` is no longer a single object-literal
// shorthand, it is a `const order = target ? … : nextOrder(mergedRoots()
// .filter(…))` ternary computed before the call. Both branches are asserted:
// the unpinned (top-level) case is the SAME nextOrder(mergedRoots().filter(…))
// shape P6-G already fixed, and the pinned case reads the real target
// folder's own current children, never a stale or hardcoded count.
check("creating a new user folder computes its order from nextOrder() over the real user-folder siblings, not a root COUNT that can repeat an order after a retirement -- and a pinned target uses that folder's own real children the same way", () => {
  const body = functionBody(page, "wireNewFolderForm");
  assert.ok(/nextOrder\(mergedRoots\(\)\.filter\(/.test(body), "new-folder creation no longer computes order via nextOrder() over the user-folder siblings");
  assert.ok(/nextOrder\(\(findNodeByIdOrRole\(mergedRoots\(\), parentFolderId, null\)\?\.\s*children\s*\?\?\s*\[\]\)\)/.test(body),
    "a pinned target's new-folder order no longer reads that folder's own real, current children");
  assert.ok(!/order:\s*mergedRoots\(\)\.length/.test(body), "new-folder creation still uses the old root-COUNT shape");
});

// Retiring a folder with active children is refused by the Rules
// (`parentOneHopOk()`); the issue asks for this to be said in words BEFORE
// the write, not discovered by letting it fail.
//
// UPDATED for issue #259, reason recorded rather than the check silently
// loosened: the issue's own instruction is "Confirm on the page itself,
// never with confirm()" -- so `removeFolderPrompt()` no longer confirms OR
// writes at all; it only opens an in-page confirmation panel
// (`pendingRemoveKey`), and a SEPARATE function, `confirmRemoveFolder()`
// (wired to the panel's own "Remove" button), performs the actual
// `retireFolder()` write once the reader presses it. The ordering claim
// therefore narrows to what `removeFolderPrompt()` alone can prove: the
// active-children precheck comes before the confirmation is ever opened.
// MUTATION-PROVEN as before -- removing the precheck's own early return
// still must make the ordering assertion fail.
function retirePrecheckOrdered(source) {
  const body = functionBody(source, "removeFolderPrompt");
  const precheckAt = body.indexOf("children");
  const openConfirmAt = body.indexOf("pendingRemoveKey");
  if (precheckAt === -1 || openConfirmAt === -1) return false;
  return precheckAt < openConfirmAt;
}
check("retiring a folder with active children is refused in words BEFORE the in-page Remove confirmation is even offered", () => {
  assert.ok(retirePrecheckOrdered(page), "removeFolderPrompt() no longer checks for active children before opening the in-page confirmation");
});
check("MUTATION-PROVEN: removing the active-children precheck makes the ordering assertion above fail", () => {
  const marker = "if ((node.children ?? []).length > 0) {";
  const at = page.indexOf(marker);
  assert.ok(at !== -1, "the active-children precheck's own guard clause is not where expected");
  const blockEnd = page.indexOf("\n      }\n", at) + "\n      }\n".length;
  const mutated = page.slice(0, at) + page.slice(blockEnd);
  assert.notEqual(mutated, page, "the mutation did not change the source -- the precheck's own shape must have changed");
  assert.ok(!retirePrecheckOrdered(mutated), "removing the precheck did not make the ordering check fail -- it is not proving what it claims to");
});
check("the retire confirmation is shown ON THE PAGE ITSELF, never via the browser's own confirm() dialog, uses the issue's own required wording -- \"Remove\" -- and states in words that the folder is kept, not deleted, and its Notes are untouched (I4)", () => {
  assert.ok(!/\bconfirm\(/.test(page), "window.confirm() must not be called anywhere on this page -- issue #259 requires the confirmation to live on the page itself");
  const body = functionBody(page, "folderRemoveConfirmHtml");
  assert.ok(/t\("Remove"\)/.test(body), 'the in-page Remove confirmation must be worded "Remove"');
  assert.ok(/kept, not deleted/.test(body), "the in-page Remove confirmation does not state in words that the folder is kept, not deleted");
  assert.ok(/untouched/.test(body), "the in-page Remove confirmation does not state in words that filed Notes are untouched");
  // MUTATION-PROVEN: the confirmation is DATA-DRIVEN (pendingRemoveKey), not
  // decoration -- rendered only for the one folder whose Remove was pressed.
  assert.ok(/pendingRemoveKey === key/.test(functionBody(page, "folderRowHtml")),
    "folderRowHtml() no longer gates the confirmation panel on pendingRemoveKey -- it would render for every folder, or none, regardless of which Remove was pressed");
});
check("Remove never calls a Note-writing function -- only retireFolder() -- and the actual write happens ONLY once the reader presses the in-page confirmation's own button, never on removeFolderPrompt()'s own precheck pass", () => {
  const promptBody = functionBody(page, "removeFolderPrompt");
  assert.ok(!/retireFolder\(/.test(promptBody), "removeFolderPrompt() must not itself call retireFolder() -- that must wait for the reader's own confirmation");
  for (const forbidden of ["createPermanentNote", "updatePermanentNoteContent", "retirePermanentNote", "createNotePlacement", "moveNotePlacement", "retireNotePlacement"]) {
    assert.ok(!promptBody.includes(forbidden) , `removeFolderPrompt() must never touch a Note or a placement: found ${forbidden}`);
  }
  const confirmBody = functionBody(page, "confirmRemoveFolder");
  assert.ok(/retireFolder\(/.test(confirmBody), "confirmRemoveFolder() no longer calls retireFolder()");
  for (const forbidden of ["createPermanentNote", "updatePermanentNoteContent", "retirePermanentNote", "createNotePlacement", "moveNotePlacement", "retireNotePlacement"]) {
    assert.ok(!confirmBody.includes(forbidden), `confirmRemoveFolder() must never touch a Note or a placement: found ${forbidden}`);
  }
  assert.ok(/data-folder-remove-confirm-yes\]"\)\?\.addEventListener\("click",\s*\(\)\s*=>\s*confirmRemoveFolder\(node\)\)/.test(functionBody(page, "wireFolderTree")),
    "the in-page confirmation's own \"Remove\" button no longer calls confirmRemoveFolder() directly");
});
// UPDATED for issue #259, reason recorded: "removeFolderPrompt" and
// "renameFolderPrompt" no longer perform any write at all -- rename became
// inline (beginInlineRename() opens the input, commitInlineRename() saves)
// and remove became an in-page confirmation (removeFolderPrompt() opens it,
// confirmRemoveFolder() retires) -- so the refreshAll-after-a-real-write
// claim now names the functions that actually write.
check("reordering, moving, renaming and removing a folder each refresh from the real data afterwards, never just patch the DOM by hand", () => {
  for (const fn of ["reorderFolderSwap", "moveFolderPrompt", "confirmRemoveFolder", "reorderNoteInFolder", "commitInlineRename"]) {
    const body = functionBody(page, fn);
    assert.ok(/await refreshAll\(\);/.test(body), `${fn}() does not call refreshAll() after a successful write`);
  }
});

check("the Notes screen's own contextual entry point (Read screen's ⋯ menu, wired by ayah-note-renderer.js) is untouched by this round", () => {
  const renderer = fs.readFileSync(path.join(root, "app/js/ayah-note-renderer.js"), "utf8");
  assert.ok(renderer.includes("My Notes for this unit") && renderer.includes("notesScreenHref"),
    "the existing notes.html entry point regressed");
});
// UPDATED 24 Sep 2026 for issue #257, WITH THE REASON RECORDED RATHER THAN
// THE CHECK WEAKENED. P6-F's own accepted decision was that the entry point
// was Home ONLY, not a contextual menu -- true then, because the Mapping
// tab and the ⋯ menu's own Mapping My Journey row were both the disabled
// placeholder, so a reference from either side would have pointed at
// nothing real. The Owner's own instruction ("Folder should be built/
// accessible from the Mapping tab") is exactly a second, contextual entry
// point, so the claim above is narrowed (Notes' own entry point is
// untouched) rather than kept as "no journey-map.html reference anywhere",
// and this new check covers the two real entry points that replaced it.
check("the dock's Mapping tab and the Note view's own ⋯ menu are both real, wired entry points into journey-map.html's Folders view (issue #257)", () => {
  const renderer = fs.readFileSync(path.join(root, "app/js/ayah-note-renderer.js"), "utf8");
  const quranShell = fs.readFileSync(path.join(root, "app/quranrevival.html"), "utf8");
  assert.ok(!/id="tabJourneyBtn"[^>]*(?:disabled|aria-disabled="true")/.test(quranShell),
    "the dock's Mapping tab is still disabled");
  assert.ok(quranShell.includes('"journey-map.html#folders"'),
    "the dock's Mapping tab no longer navigates to journey-map.html#folders");
  assert.ok(!/qm-item"\s*disabled[^>]*>\$\{t\("Mapping My Journey"\)\}/.test(renderer),
    "the Note view's ⋯ menu Mapping My Journey row is still the disabled placeholder");
  assert.ok(/<a class="qm-item" href="journey-map\.html#folders">\$\{t\("Mapping My Journey"\)\}<\/a>/.test(renderer),
    "the Note view's ⋯ menu Mapping My Journey row is not a real link to journey-map.html#folders");
});

// --- 9. HASH-BASED VIEW SELECTION (issue #257) -------------------------------
// The dock's Mapping tab and the Note view's own ⋯ menu both now open this
// page pointed at the Folders view via a plain "#folders" hash -- checked
// from THEIR own side above and in journey-map-boundary.mjs/
// quran-boundary.mjs. This section covers the READING side, here on the
// page that has to make sense of whatever hash a caller sends it.
check("the initial view is read from location.hash via a dedicated helper, not inlined ad hoc", () => {
  assert.ok(/function viewFromHash\s*\(/.test(page), "no viewFromHash() helper found");
  assert.ok(/location\.hash/.test(page), "the page never reads location.hash");
});
check("only the three view tokens are accepted from the hash -- anything else is ignored, not partially matched", () => {
  const body = functionBody(page, "viewFromHash");
  assert.ok(/VALID_VIEWS\.includes\(raw\)/.test(body),
    "viewFromHash() does not validate the token against the closed three-view set");
  assert.ok(!/\.startsWith\(|\.match\(|\.test\(/.test(body),
    "viewFromHash() should not pattern-match the hash -- an exact membership check is what makes an unrecognised token safely ignored rather than partially honoured");
});
check("VALID_VIEWS names exactly the three views the toggle itself offers, nowhere retyped as a second literal", () => {
  const decl = page.match(/const VALID_VIEWS = (\[[^\]]+\]);/);
  assert.ok(decl, "no VALID_VIEWS constant declaration found");
  assert.deepEqual(JSON.parse(decl[1].replace(/'/g, '"')), ["folders", "timeline", "path"]);
});
check("an unknown or absent hash falls back to today's default -- the remembered view, or \"folders\"", () => {
  const decl = page.match(/let currentView = (viewFromHash\(\)[\s\S]*?);\s*\n/);
  assert.ok(decl, "no `currentView` initial-value expression found, or it no longer starts from viewFromHash()");
  assert.ok(/localStorage\.getItem\(VIEW_KEY\)/.test(decl[1]) && /"folders"/.test(decl[1]),
    "currentView's fallback (when the hash is absent/invalid) no longer reads the remembered view, defaulting to \"folders\"");
});
check("the hash wins over the remembered view ONLY when it is actually present -- viewFromHash() is consulted first", () => {
  const decl = page.match(/let currentView = (viewFromHash\(\)[\s\S]*?);\s*\n/);
  assert.ok(decl, "no `currentView` initial-value expression found");
  const hashAt = decl[1].indexOf("viewFromHash()");
  const storedAt = decl[1].indexOf("localStorage.getItem(VIEW_KEY)");
  assert.ok(hashAt !== -1 && storedAt !== -1 && hashAt < storedAt,
    "viewFromHash() must be tried before the remembered localStorage value, via ?? (nullish coalescing), so a present, valid hash wins and an absent/invalid one falls through");
  assert.ok(decl[1].includes("??"), "currentView no longer falls through with ?? -- a present hash must win outright, never be merely preferred");
});

// --- 10. THE TREE ITSELF (issue #259) ---------------------------------------
// Folders became an expandable TREE, replacing the former one-folder-at-a-
// time drill-down/breadcrumb. This section covers what a source-only suite
// CAN prove: the tree's own markup exists, numbering is DERIVED at render
// time and never stored, and Remove never reaches a Note or a placement.
// (Remove's own contract is proven above, in section 7-8; it is not
// repeated here.)
check("the tree markup exists: a single flat, indented <ul data-folder-tree> whose rows carry an expand/collapse toggle", () => {
  assert.ok(/<ul class="folder-tree" data-folder-tree>/.test(page), "no <ul data-folder-tree> tree container found");
  assert.ok(/data-folder-toggle/.test(page), "no expand/collapse toggle found anywhere in the tree");
  assert.ok(/folder-tree-item/.test(page), "no folder-tree-item row class found");
  assert.ok(/data-note-leaf/.test(page), "Notes are no longer rendered as leaves of the tree");
});
check("numbering is DERIVED at render time only -- never written into the stored name, and never sent in a renameFolder() payload", () => {
  const numberedLabelBody = functionBody(page, "numberedLabel");
  assert.ok(/showNumbers/.test(numberedLabelBody), "numberedLabel() no longer reads the showNumbers toggle");
  const commitBody = functionBody(page, "commitInlineRename");
  assert.ok(!/numberedLabel/.test(commitBody), "commitInlineRename() must never touch numberedLabel() -- a save must send the raw name only");
  assert.ok(/renameFolder\(db,\s*\{[^}]*name:\s*trimmed/.test(commitBody), "commitInlineRename() no longer sends the raw trimmed name to renameFolder()");
  const rowBody = functionBody(page, "folderRowHtml");
  const inlineInputMatch = rowBody.match(/data-folder-rename-input value="\$\{escapeHtml\(([^)]+)\)\}"/);
  assert.ok(inlineInputMatch, "no inline rename <input> with a seeded value was found in folderRowHtml()");
  assert.equal(inlineInputMatch[1].trim(), 'f.name ?? ""',
    "the inline rename input must seed from the folder's own raw name (f.name), never numberedLabel()'s derived, numbered text");
});
check("the two system folders are never numbered, and always come first", () => {
  const renderBody = functionBody(page, "renderFoldersView");
  assert.ok(/isSystemFolderRole\(f\.semanticRole\) \? null :/.test(renderBody),
    "root-level numbering no longer skips the two system folders");
  assert.ok(/const roots = mergedRoots\(\);/.test(renderBody), "renderFoldersView() no longer reads mergedRoots(), whose own systemNodes-first ordering keeps the two system folders first");
});

// --- 11. THE ⋯ MENU IS HIT-TESTABLE BELOW 900px (issue #259) ----------------
// Siyagah's own bug: its ⋯ menu opened BEHIND the dialog on a phone. A check
// that only asserts the menu is "displayed" cannot catch that class of
// defect -- document.elementFromPoint() at the menu's own centre is what
// proves it is really the TOPMOST element there, not merely present in the
// DOM. Playwright is not installed in this sandbox (the same documented,
// repeated gap this project's own CLAUDE.md records for every browser-driven
// suite in this directory) -- written here, NOT run here; the Architect runs
// it. `checkAsync()` is a local, async-aware twin of `check()` above (which
// deliberately REFUSES a promise -- see its own guard clause), needed only
// for this one browser-driven case.
async function checkAsync(name, fn) {
  try {
    await fn();
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}
let playwrightMod = null;
try { playwrightMod = await import("playwright"); } catch { /* not installed in this sandbox -- see below */ }
if (!playwrightMod) {
  console.log("  SKIPPED  the ⋯ menu hit-test at 390px -- Playwright is not installed in this sandbox; the Architect should run this");
} else {
  await checkAsync("the ⋯ menu is hit-testable at 390px -- opening it and reading document.elementFromPoint() at its own centre returns the menu or one of its children, not something behind it", async () => {
    const { newContext, openPage } = await import("./harness.mjs");
    const browser = await playwrightMod.chromium.launch();
    try {
      // Architect's review, 25 Sep 2026: the stub never mutates its own DATA
      // (a standing harness lesson), so creating a folder through the form and
      // waiting for its row could never pass here. Seed one real user folder
      // instead, so a ⋯ menu is guaranteed to exist to hit-test.
      const SEED = `DATA.noteFolders = [{ _id: TENANT_ID + "__f-hit", folderId: "f-hit", tenantId: TENANT_ID,
        ownerPersonId: "p1", ownerUid: UID, name: "Hit-test folder", parentFolderId: null,
        semanticRole: "user", order: 1, status: "active", schemaVersion: 1,
        createdAt: "2026-09-25T00:00:00.000Z", updatedAt: "2026-09-25T00:00:00.000Z", createdBy: UID }];`;
      const ctx = await newContext(browser, { viewport: { width: 390, height: 844 }, extraSeedJs: SEED });
      const { page: browserPage, errors } = await openPage(ctx, "/app/journey-map.html#folders");
      await browserPage.waitForSelector("[data-folder-tree] .folder-row", { timeout: 5000 });
      // The seeded stub tenant may or may not already carry a non-system
      // folder; create one if needed so a ⋯ menu (system folders carry none)
      // is guaranteed to exist to test.
      const menuBtn = browserPage.locator(".folder-menu-btn").first();
      if (await menuBtn.count() === 0) {
        await browserPage.fill("#newFolderName", "Hit-test folder");
        await browserPage.click("#newFolderForm button[type=submit]");
        await browserPage.waitForSelector(".folder-menu-btn", { timeout: 5000 });
      }
      await browserPage.locator(".folder-menu-btn").first().click();
      const menu = browserPage.locator(".bar-palette.open").first();
      await menu.waitFor({ state: "visible", timeout: 5000 });
      const box = await menu.boundingBox();
      if (!box) throw new Error("the opened ⋯ menu has no bounding box -- it is not really visible");
      const hit = await browserPage.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return el ? { tag: el.tagName, cls: el.className, insideMenu: !!el.closest(".bar-palette") } : null;
      }, [box.x + box.width / 2, box.y + box.height / 2]);
      if (!hit || !hit.insideMenu) {
        throw new Error(`elementFromPoint() at the menu's own centre did not land inside it -- got ${JSON.stringify(hit)}; something else is on top of it`);
      }
      // A resource the sandbox's proxy cannot reach (a CDN script or font) is
      // environmental, the same class CLAUDE.md records for the TLS artefact;
      // any other page error still fails the check.
      const real = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID)/.test(e));
      if (real.length) throw new Error(`page errors: ${real.join("; ")}`);
    } finally {
      await browser.close();
    }
  });
}

console.log(`\n==== Mapping My Journey screen (P6-F): ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
