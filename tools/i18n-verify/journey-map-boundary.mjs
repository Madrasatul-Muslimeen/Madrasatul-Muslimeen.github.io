// MAP Phase 6 (P6-A) -- the STRUCTURAL guards around ADR-010.
//
// Three claims P6-A makes that no functional test can see:
//
//   1. Nothing is activated. `noteFolders` and `notePlacements` are still
//      unruled, and the Phase 5 Rules candidate queued for deployment is
//      byte-identical -- a Phase 6 decision must not change what gets deployed.
//   2. "Origin != Destination" is enforced by the module being UNABLE to see a
//      Study Unit key, not by it choosing not to. That is a fact about its
//      imports.
//   3. "MMJ != a separate Notebook subsystem" is a fact about collections: no
//      new Note-content collection may appear.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { FOLDER_SEMANTIC_ROLES, MAX_FOLDER_DEPTH } from "../../app/js/journey-map-contract.js";

const root = path.resolve(process.argv[2] || process.cwd());
const appDir = path.join(root, "app");
const appJs = path.join(appDir, "js");
const GUARDED = ["journey-map-contract.js", "journey-map-service.js"];
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

function codeOf(name) {
  return fs.readFileSync(path.join(appJs, name), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((line) => !/^\s*(?:\/\/|\*)/.test(line)).join("\n");
}
function localImportsOf(file) {
  const text = fs.readFileSync(file, "utf8");
  return [
    ...[...text.matchAll(/from\s*["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]),
    ...[...text.matchAll(/import\s*["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]),
  ];
}
function chainsToTarget(target) {
  const found = [];
  for (const entry of fs.readdirSync(appDir)) {
    if (!entry.endsWith(".html")) continue;
    const seen = new Set();
    const queue = [...fs.readFileSync(path.join(appDir, entry), "utf8")
      .matchAll(/["'`](?:\.\/)?js\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => [m[1]]);
    while (queue.length) {
      const chain = queue.shift();
      const head = chain[chain.length - 1];
      if (seen.has(head)) continue;
      seen.add(head);
      if (head === target) { found.push(`app/${entry} -> ${chain.join(" -> ")}`); break; }
      const full = path.join(appJs, head);
      if (!fs.existsSync(full)) continue;
      for (const next of localImportsOf(full)) queue.push([...chain, next]);
    }
  }
  return found;
}

// --- 1. NOTHING IS ACTIVATED ------------------------------------------------
check("POSITIVE CONTROL: the reachability walker really does find a wired module", () => {
  assert.ok(chainsToTarget("records.js").length > 0, "the walker is not working");
});

// UPDATED 22 Sep 2026 for MAP Phase 5 P5-D (issue #195), WITH THE REASON
// RECORDED RATHER THAN THE CHECK WEAKENED. Until that round "NO PAGE can
// reach the journey contract OR its service" was one claim, true only
// because nothing page-reachable had ever loaded `note-foundation.js` AT
// ALL. P5-D wires `study-note-service.js` -- an ALREADY-ACCEPTED Phase 5
// wrapper that has imported `note-foundation.js` since it was written -- into
// a real page (`app/notes.html`) for the first time, and `note-foundation.js`
// has imported the journey contract since P6-B (15 Sep 2026), for its own
// Phase 6 folder-cycle validation. There is no way to wire ANY Phase 5 Note
// function into a page without the whole module loading, so blanket
// unreachability of `journey-map-contract.js` stopped being achievable the
// moment P5-D was authorised.
//
// UPDATED AGAIN 22 Sep 2026 for MAP Phase 6 P6-F (issue #199, this round),
// FOR THE SAME REASON. This round is the one P5-D's own comment predicted
// would eventually land: it wires `journey-map-service.js` -- the Phase 6
// SERVICE, the one thing the P5-D update above said stayed completely
// unreachable -- into a brand-new page, `app/journey-map.html`. Asserting
// blanket unreachability for the service now would be asserting THIS
// round's own wiring does not work, the identical inversion this file's own
// history already records twice over (v08.30's D1/D2/D4 guard, 19 Sep's
// D3-chokepoint round, and P5-D immediately above). The claim is narrowed a
// second time, the same way, to what still actually holds:
//
//   (a) `journey-map-service.js` is reachable now, but ONLY from the one
//       audited P6-F page (`app/journey-map.html`), and by no other chain.
//   (b) `journey-map-contract.js` is reachable from TWO audited pages now --
//       `app/notes.html` (via `note-foundation.js`, unchanged since P5-D) and
//       `app/journey-map.html` (via `journey-map-service.js`, this round) --
//       and by no route that skips both of those intermediaries. The new
//       page deliberately does NOT import the pure contract a second,
//       separate way (it mirrors the two closed-vocabulary role ids as a
//       local constant instead -- see the page's own comment), so this stays
//       a two-route claim, not a three-route one.
//   (c) The behaviour ADR-010 actually protects -- which Phase 6 FOLDER or
//       PLACEMENT functions the two wired pages are allowed to call -- is
//       asserted directly, below, rather than inferred from unloadability:
//       `app/notes.html` (P5-D's own scope) still may call NONE of them;
//       `app/journey-map.html` (this round's own scope) legitimately calls
//       the read/create/move subset this round actually built, and is
//       checked against exactly that subset, not a blanket allowance.
// UPDATED for issue #265, reason recorded rather than the check weakened:
// `app/import-notes.html` reaches `journey-map-contract.js` through its own
// new `wordpress-import-service.js` (both directly, for `journeyFolder()`/
// `folderTreeRefusal()`'s bulk-folder validation, and indirectly through
// `note-foundation.js`, exactly as `app/notes.html` already does) -- a
// third audited page, not a widened blanket allowance.
// UPDATED AGAIN for issue #271: the same page gained a SECOND importer of
// journey-map-contract.js, `app/js/evernote-import-service.js` -- the
// Evernote (.enex) sibling of the WordPress writer, deliberately built as a
// parallel module rather than folded into wordpress-import-service.js (see
// that file's own header for why), so it needs the identical bulk-folder
// validation for the identical reason. The PAGE set is unchanged -- still
// the same three audited pages, not a fourth.
//
// UPDATED AGAIN for issue #286 (the "This āyah" action sheet's "File in
// folder(s)…"), reason recorded rather than the check weakened.
// `app/quranrevival.html` is a FIFTH audited page: it reaches the contract
// via `note-foundation.js` (`createNoteFolder`/`createNotePlacement`/
// `retireNotePlacement`, called directly, the same convention
// `app/journey-map.html` already uses for its own create calls) AND, for
// the first time from a page OTHER than `app/journey-map.html`, imports
// `journey-map-service.js` directly too (`ownerFolderTreePaged()` for the
// folder tree, `noteFilings()` for which folders a Note already sits in --
// both READ-ONLY wrappers this round did not need to duplicate). Its own
// bounded scope -- exactly which Phase 6 functions it may call, and that it
// calls none of the folder-EDITING wrappers -- is asserted directly, below,
// the same way `app/notes.html` and `app/journey-map.html` already are.
const CONTRACT_WIRED_PAGES = ["app/import-notes.html", "app/journey-map.html", "app/notes.html", "app/quranrevival.html"];
const SERVICE_WIRED_PAGES = ["app/journey-map.html", "app/quranrevival.html"];

check("journey-map-service.js -- the Phase 6 service -- is reachable ONLY from the audited pages that import it directly", () => {
  const chains = chainsToTarget("journey-map-service.js");
  const pages = [...new Set(chains.map((c) => c.split(" -> ")[0]))].sort();
  assert.deepEqual(pages, [...SERVICE_WIRED_PAGES].sort(),
    `unexpected page(s) reaching journey-map-service.js: ${chains.join(" | ")}`);
});

check("journey-map-contract.js is reachable ONLY via note-foundation.js, journey-map-service.js, wordpress-import-service.js or evernote-import-service.js, and ONLY from the four audited pages", () => {
  const chains = chainsToTarget("journey-map-contract.js");
  const pages = [...new Set(chains.map((c) => c.split(" -> ")[0]))].sort();
  assert.deepEqual(pages, CONTRACT_WIRED_PAGES,
    `unexpected page(s) reaching journey-map-contract.js: ${chains.join(" | ")}`);
  // UPDATED for issue #265, reason recorded rather than the check weakened:
  // `wordpress-import-service.js` is a THIRD accepted intermediary --
  // app/import-notes.html reaches the contract directly through it
  // (`journeyFolder()`/`folderTreeRefusal()`, for bulk-folder validation
  // against an in-memory set rather than a per-folder Firestore re-read),
  // not through note-foundation.js or journey-map-service.js at all. Every
  // OTHER route must still pass through one of the three named modules.
  // UPDATED AGAIN for issue #271: `evernote-import-service.js` is a FOURTH
  // accepted intermediary, for the identical reason and the identical two
  // functions, from the same one page.
  assert.ok(chains.every((c) => c.includes("note-foundation.js") || c.includes("journey-map-service.js") || c.includes("wordpress-import-service.js") || c.includes("evernote-import-service.js")),
    `journey-map-contract.js is reached by a route that does not pass through note-foundation.js, journey-map-service.js, wordpress-import-service.js or evernote-import-service.js: ${chains.join(" | ")}`);
});

check("every importer of the journey modules is exactly the pinned set, and each is reachable only as accepted above", () => {
  // The importer SET is still pinned, so a THIRD module importing either
  // journey file must be audited deliberately -- unchanged in spirit from
  // P6-B/P5-D, widened this round to include the one new page that now
  // imports journey-map-service.js directly.
  const importers = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(js|html)$/.test(entry.name)) continue;
      const text = fs.readFileSync(full, "utf8");
      for (const guarded of GUARDED) {
        // Skip only a SELF-import. The service importing the contract is a real
        // and expected edge, and worth listing: both are guarded, and the case
        // below proves each importer's own reachability is exactly what is
        // now accepted.
        if (entry.name === guarded) continue;
        const base = guarded.replace(/\.js$/, "");
        if (new RegExp(String.raw`(?:from|import)\s*["'\`][./]*(?:js/)?${base}\.js["'\`]`).test(text)) {
          importers.push(path.relative(root, full));
        }
      }
    }
  })(appDir);
  // UPDATED for issue #265, reason recorded rather than the check weakened:
  // `app/js/wordpress-import-service.js` is a NEW, third direct importer of
  // `journey-map-contract.js` -- it uses `journeyFolder()`/
  // `folderTreeRefusal()` directly, for the same reason `note-foundation.js`
  // itself does (judging a folder tree needs the pure contract, and a bulk
  // WordPress import needs to judge it against an in-memory set rather than
  // re-reading Firestore per folder -- see that file's own header).
  // UPDATED AGAIN for issue #271: `app/js/evernote-import-service.js` is a
  // FOURTH direct importer, its own Evernote-writing twin of the same
  // WordPress module, for the identical reason.
  // UPDATED AGAIN for issue #286: `app/quranrevival.html` is a SECOND page
  // (alongside `app/journey-map.html`) importing `journey-map-service.js`
  // directly, and a further importer of `note-foundation.js` too -- see the
  // header comment above `CONTRACT_WIRED_PAGES`.
  assert.deepEqual([...new Set(importers)].sort(),
    ["app/journey-map.html", "app/js/evernote-import-service.js", "app/js/journey-map-service.js", "app/js/note-foundation.js", "app/js/wordpress-import-service.js", "app/quranrevival.html"].sort(),
    `the set of modules importing the journey contract/service has changed: ${importers.join(", ")}`);
  // chainsToTarget() only ever resolves a TARGET named "*.js" (it walks
  // app/*.html pages through js/ imports) -- app/journey-map.html is a page,
  // not an importable module, so it has no meaningful entry here; its own
  // reachability (as a PAGE reaching the two guarded modules) is exactly
  // what the two checks above this one already prove.
  const EXPECTED_PAGES_PER_JS_IMPORTER = {
    "note-foundation.js": CONTRACT_WIRED_PAGES,      // reachable from every audited page (notes.html since P5-D, journey-map.html since P6-F, import-notes.html for #265, quranrevival.html for #286)
    "journey-map-service.js": SERVICE_WIRED_PAGES,   // reachable only from the pages that import it directly (journey-map.html, and quranrevival.html since #286)
    "wordpress-import-service.js": ["app/import-notes.html"], // reachable only from the one page that imports it directly
    "evernote-import-service.js": ["app/import-notes.html"], // issue #271 -- reachable only from the same one page, alongside its WordPress sibling
  };
  for (const importer of importers) {
    const base = path.basename(importer);
    if (!(base in EXPECTED_PAGES_PER_JS_IMPORTER)) continue; // app/journey-map.html itself -- not a .js target, nothing to re-check here
    const chains = chainsToTarget(base);
    const pages = [...new Set(chains.map((c) => c.split(" -> ")[0]))].sort();
    assert.deepEqual(pages, [...EXPECTED_PAGES_PER_JS_IMPORTER[base]].sort(),
      `${importer}'s own reachability changed unexpectedly: ${chains.join(" | ")}`);
  }
});

// THE PROTECTION THAT ACTUALLY MATTERS, asserted directly rather than
// inferred from load-graph unreachability, since that inference is no longer
// available. `note-foundation.js` exports both Phase 5 (Notes, accepted) and
// Phase 6 (folders/placements, NOT accepted) functions from one file, and
// `journey-map-service.js` wraps nearly all of the Phase 6 ones (P6-C/P6-D/
// P6-E already built every wrapper, including the folder-EDITING ones this
// round does not use) -- so scanning the SERVICE file's own source would
// find almost every name regardless of what this round's page actually
// calls, and prove nothing. What is checked instead is the PAGE's own
// source, which is the only place that shows what this round chose to call.
// UPDATED for issue #259, reason recorded: `listNotePlacementsForOwnerPage()`
// is a new note-foundation.js placement READER (the paged twin of
// `listNotePlacementsForFolder()`/`listNotePlacementsForNote()` above), so it
// joins this list for the same reason its siblings are here -- both checks
// below stay exactly as strict as before, now covering one more name.
// `app/journey-map.html` never calls it directly: the tree reaches paging
// only through `journey-map-service.js`'s own `loadAllOwnerPlacements()`.
const PHASE_6_DATA_LAYER_FUNCTIONS = [
  "createNoteFolder", "listNoteFoldersForOwner", "renameNoteFolder", "reorderNoteFolder",
  "reparentNoteFolder", "retireNoteFolder", "createNotePlacement",
  "listNotePlacementsForFolder", "listNotePlacementsForNote", "listNotePlacementsForOwnerPage",
  "retireNotePlacement", "moveNotePlacement",
];
check("app/notes.html (P5-D's own scope) still never calls a Phase 6 folder/placement function", () => {
  const text = fs.readFileSync(path.join(root, "app/notes.html"), "utf8");
  const used = PHASE_6_DATA_LAYER_FUNCTIONS.filter((fn) => text.includes(fn));
  assert.deepEqual(used, [], `app/notes.html names Phase 6 function(s): ${used.join(", ")}`);
});
check("app/journey-map.html only ever names the Phase 6 data-layer functions it imports directly (create folder, create placement) -- everything else goes through the service", () => {
  const text = fs.readFileSync(path.join(root, "app/journey-map.html"), "utf8");
  const used = PHASE_6_DATA_LAYER_FUNCTIONS.filter((fn) => text.includes(fn)).sort();
  assert.deepEqual(used, ["createNoteFolder", "createNotePlacement"],
    `app/journey-map.html's own direct Phase 6 data-layer usage changed: ${used.join(", ")} -- if this round's scope grew, widen this list deliberately rather than letting it drift`);
});
// UPDATED 24 Sep 2026 for MAP Phase 6 P6-G (issue #229), WITH THE REASON
// RECORDED RATHER THAN THE CHECK WEAKENED. Until this round, the
// FOLDER-EDITING wrappers (rename/reorder/re-parent/retire a folder, reorder
// a filing) were built and exported by journey-map-service.js (P6-D/P6-E)
// but P6-F's screen offered no folder management UI at all -- only creating,
// filing into and moving Notes between folders. That was an accepted
// decision (the deployed Rules already say "a folder may be renamed,
// reordered, re-parented or retired") no screen could carry out, exactly the
// gap CLAUDE.md's own standing lesson names ("Ask what the accepted Rules
// authorise, then what the code can perform"). P6-G closes it: this check
// is INVERTED, not deleted, the same shape every prior inversion in this
// file already used -- it now asserts the five wrappers ARE wired, and
// asserts it from `app/journey-map.html`'s Folders view specifically (the
// issue's own scope -- Timeline/Path need no edit controls), and from
// NOWHERE ELSE (`app/notes.html`'s own check above already proves it calls
// no Phase 6 folder/placement function at all; the service-reachability
// check earlier in this file already proves journey-map.html is the only
// page that reaches journey-map-service.js in the first place).
const FOLDER_EDITING_SERVICE_WRAPPERS = ["renameFolder", "reorderFolder", "moveFolder", "retireFolder", "reorderFiling"];
check("app/journey-map.html now wires every folder-editing service wrapper (P6-G), and imports each by name", () => {
  const text = fs.readFileSync(path.join(root, "app/journey-map.html"), "utf8");
  const used = FOLDER_EDITING_SERVICE_WRAPPERS.filter((fn) => text.includes(fn));
  assert.deepEqual(used.sort(), [...FOLDER_EDITING_SERVICE_WRAPPERS].sort(),
    `app/journey-map.html no longer names every folder-editing wrapper: ${used.join(", ")}`);
  for (const fn of FOLDER_EDITING_SERVICE_WRAPPERS) {
    assert.ok(new RegExp(String.raw`import\s*\{[^}]*\b${fn}\b[^}]*\}\s*from\s*["'\`]\./js/journey-map-service\.js["'\`]`).test(text),
      `app/journey-map.html calls ${fn} without importing it from journey-map-service.js`);
  }
});

// UPDATED for issue #286, reason recorded rather than the check widened
// silently: `app/quranrevival.html`'s own "File in folder(s)…" needs a
// THIRD direct call `app/journey-map.html` does not, `retireNotePlacement`
// (unticking a folder retires that placement, I4) -- the identical function
// `app/journey-map.html`'s own P5-F move/retire controls already call, just
// from a second page now. Checked as its own bounded set, not folded into
// the journey-map.html check above, since the two pages' own scopes differ:
// `app/quranrevival.html` calls no folder-editing wrapper at all (renaming,
// reordering and re-parenting a folder stay `app/journey-map.html`'s own
// Folders-view job).
check("app/quranrevival.html's own Phase 6 data-layer usage is exactly create folder / create placement / retire placement, and it never calls a folder-editing wrapper", () => {
  const text = fs.readFileSync(path.join(root, "app/quranrevival.html"), "utf8");
  const used = PHASE_6_DATA_LAYER_FUNCTIONS.filter((fn) => text.includes(fn)).sort();
  assert.deepEqual(used, ["createNoteFolder", "createNotePlacement", "retireNotePlacement"],
    `app/quranrevival.html's own direct Phase 6 data-layer usage changed: ${used.join(", ")} -- if this round's scope grew, widen this list deliberately rather than letting it drift`);
  const editingUsed = FOLDER_EDITING_SERVICE_WRAPPERS.filter((fn) => text.includes(fn));
  assert.deepEqual(editingUsed, [], `app/quranrevival.html names folder-editing wrapper(s) it should not: ${editingUsed.join(", ")}`);
});

function unchangedSinceMain(relPath) {
  const head = execFileSync("git", ["show", `origin/main:${relPath}`], { cwd: root, encoding: "utf8" });
  assert.equal(fs.readFileSync(path.join(root, relPath), "utf8"), head,
    `${relPath} is NOT byte-identical to origin/main`);
}
// DEPLOYED, 22 Sep 2026 -- confirmed by the Owner in the Firebase Console.
// This checked the opposite until then ("still UNRULED"), because claiming a
// live rule existed before it did would have been the repository asserting a
// deployment nobody had performed. It now guards that every Note Foundation
// and Mapping My Journey collection genuinely got its rule, none silently
// missing -- and `origin/main` is expected to equal the live file now, not
// the reverse.
check("noteFolders, notePlacements and the rest of the Note Foundation are RULED in production", () => {
  const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
  for (const collection of ["noteFolders", "notePlacements", "notes", "noteSources", "noteRevisions"]) {
    assert.ok(rules.includes(`match /${collection}/`), `firestore.rules does not govern ${collection} -- deployment record is stale, or the sync regressed`);
  }
});
check("the Phase 5 Rules candidate's RULE CONTENT is unchanged", () => {
  // UPDATED 2026-09-17, with the reason recorded rather than the check deleted.
  // Byte-identity was the right claim while the extract was assumed to be the
  // deployable text. It is not: the deployable text is now the assembled
  // phase4-6-DEPLOYMENT-candidate, and the extract carries a CORRECTION comment
  // recording that four of its helpers differ from production's.
  //
  // So the claim is narrowed to the one that still matters and is strictly
  // about safety: no RULE line may change. Comments may.
  const rel = "docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules";
  const strip = (t) => t.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  const head = execFileSync("git", ["show", `origin/main:${rel}`], { cwd: root, encoding: "utf8" });
  assert.equal(strip(fs.readFileSync(path.join(root, rel), "utf8")), strip(head),
    `${rel} has changed a RULE line -- a Phase 6 decision must not alter what Phase 5 deploys`);
  const candidate = fs.readFileSync(path.join(root,
    "docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules"), "utf8");
  for (const collection of ["noteFolders", "notePlacements"]) {
    assert.ok(!candidate.includes(`match /${collection}/`),
      `the Phase 5 candidate now governs ${collection} -- Phase 6 has leaked into a queued deployment`);
  }
});
// UPDATED 2026-09-20, with the reason recorded rather than the check
// weakened -- same finding and same pinned-exception shape as the sibling
// guard in study-note-boundary.mjs: `retirePermanentNote()` wrote a shape
// the accepted Phase 5 Rules candidate can never accept (a status-only
// update leaves `currentRevisionId` chaining from itself), and the fix
// replaces that one line rather than only adding to it.
const NOTE_FOUNDATION_PINNED_REMOVAL =
  "-    transaction.update(TENANT.NOTES, noteDocId, { status: NOTE_STATUS.RETIRED });";
// UPDATED 25 Sep 2026 for issue #282 (speed, part 5), reason recorded rather
// than the check weakened. `listNoteFoldersForOwnerPage()` and
// `listNotePlacementsForOwnerPage()` both gained an optional trailing
// `idRange = null` parameter (the sharded parallel loader's own
// documentId()-range bound -- see idRangeClauses() and journey-map-shard.js),
// so their shared signature line was REPLACED rather than only appended to.
// This is the identical shape the retire-line exception above already
// covers -- a deliberate, reviewed, BACKWARD-COMPATIBLE widening (every
// existing caller that never passes idRange gets byte-identical behaviour,
// proven by K1-K28 and note-foundation-real-function.rules.test.mjs staying
// green unmodified) -- not a reshaping of what an existing caller already
// gets. Both functions share the exact same old signature text, so the
// pinned exception is the SAME line appearing twice, not two different ones.
const NOTE_FOUNDATION_PINNED_SIGNATURE_WIDENING = Array(2).fill(
  "-  tenantId, ownerPersonId, status = NOTE_STATUS.ACTIVE, pageSize = 100, after = null,");
check("existing user notes untouched; the data layer changed by INSERTION ONLY, except the pinned lines this round and an earlier one each REPLACED for a stated reason", () => {
  // UPDATED 2026-09-15 (P6-B): the data layer now validates a folder's parent,
  // so byte-identity is no longer the right claim -- "nothing removed or
  // reshaped, except the one line named above" still is, and reading the
  // actual removed lines (not just counting them) proves it mechanically.
  unchangedSinceMain("app/js/ayah-notes.js");
  const diffText = execFileSync("git", ["diff", "origin/main", "--", "app/js/note-foundation.js"],
    { cwd: root, encoding: "utf8" });
  if (diffText === "") return;
  const removedLines = diffText.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---"));
  // UPDATED 2026-09-23, reason recorded rather than the check weakened --
  // same fix, same reason, as study-note-boundary.mjs's identical check:
  // the pinned exception names a line an earlier round REPLACED relative
  // to the `main` it was diffed against at the time, and that fix has
  // since landed ON `main` itself, so a branch diffed against a CURRENT
  // `main` that already carries it sees no removal at all -- `[]` is just
  // as valid a shape as the pinned single-line replacement. Removing
  // anything ELSE still fails, exactly as before.
  const allowedRemovals = [
    [],
    [NOTE_FOUNDATION_PINNED_REMOVAL],
    NOTE_FOUNDATION_PINNED_SIGNATURE_WIDENING,
    [NOTE_FOUNDATION_PINNED_REMOVAL, ...NOTE_FOUNDATION_PINNED_SIGNATURE_WIDENING],
  ];
  assert.ok(allowedRemovals.some((allowed) => JSON.stringify(removedLines) === JSON.stringify(allowed)),
    `note-foundation.js removed line(s) do not match any pinned exception (or the now-equally-valid empty case) -- an existing behaviour may have been reshaped: ${JSON.stringify(removedLines)}`);
  const addedLines = diffText.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
  assert.ok(addedLines.length > 0);
});
// UPDATED 24 Sep 2026 for issue #257, WITH THE REASON RECORDED RATHER THAN
// THE CHECK WEAKENED. Until now this asserted the Mapping tab stayed an
// explicit placeholder -- true for the whole life of the P6-F/P6-G rounds,
// because nothing had ever wired it to the real screen those rounds built.
// The Owner's own instruction ("Folder should be built/accessible from the
// Mapping tab") is exactly that wiring, so asserting the placeholder still
// holds would be asserting this round's own change did not happen -- the
// same shape every prior inversion in this file already uses. Inverted,
// not deleted: it now asserts the tab is enabled AND that its own click
// handler is wired to the real screen's Folders view, by id and by target,
// not merely that the word "disabled" is gone from the markup.
check("the Mapping My Journey pillar is switched on, and its tap opens journey-map.html straight to the Folders view", () => {
  const shell = fs.readFileSync(path.join(appDir, "quranrevival.html"), "utf8");
  assert.ok(!/id="tabJourneyBtn"[^>]*(?:disabled|aria-disabled="true")/.test(shell),
    "the Mapping tab is still disabled");
  assert.ok(shell.includes('getElementById("tabJourneyBtn")'),
    "nothing in quranrevival.html's own script wires the Mapping tab by id");
  assert.ok(shell.includes('"journey-map.html#folders"'),
    "the Mapping tab's own click handler does not navigate to journey-map.html#folders");
});
// The Note view's own ⋯ menu item (app/js/ayah-note-renderer.js) is the
// SECOND entry point the issue names, and it was the identical disabled
// placeholder -- inverted the same way, and checked from here since this
// file already owns the "is the Mapping pillar still unavailable" claim.
check("the Note view's own ⋯ menu carries a real Mapping My Journey link to journey-map.html's Folders view, not the disabled placeholder", () => {
  const renderer = fs.readFileSync(path.join(appJs, "ayah-note-renderer.js"), "utf8");
  assert.ok(!/qm-item"\s*disabled[^>]*>\$\{t\("Mapping My Journey"\)\}/.test(renderer),
    "the ⋯ menu's Mapping My Journey row is still the disabled placeholder");
  assert.ok(/<a class="qm-item" href="journey-map\.html#folders">\$\{t\("Mapping My Journey"\)\}<\/a>/.test(renderer),
    "the ⋯ menu's Mapping My Journey row is not a real link to journey-map.html#folders");
});

// --- 2. ORIGIN != DESTINATION, enforced by inability ------------------------
check("the contract is PURE: it imports nothing at all", () => {
  const text = codeOf("journey-map-contract.js");
  assert.ok(!/\bimport\b/.test(text), "the journey contract must import nothing");
  for (const forbidden of ["firebasejs", "envelope.js", "collections.js", "TENANT.", "getDoc", "setDoc"]) {
    assert.ok(!text.includes(forbidden), `the contract must stay pure: ${forbidden}`);
  }
});
check("NEITHER module can derive a Destination from an Origin", () => {
  // ADR-010 §2. The enforcement is the ABSENCE of any route to a Study Unit
  // key: no import of the binding, no unit-key helper, no way to parse one.
  for (const name of GUARDED) {
    const text = codeOf(name);
    for (const forbidden of ["study-note-binding", "unit-keys", "buildUnitKey", "parseUnitKey",
                             "bindableUnitType", "study-note-service", "noteSources"]) {
      assert.ok(!text.includes(forbidden), `${name} can reach Origin material: ${forbidden}`);
    }
  }
});
check("neither module can reach Mastery or Activity", () => {
  for (const name of GUARDED) {
    const text = codeOf(name);
    for (const forbidden of ["records.js", "claimStatus", "achieved", "mastered", "activity.js", "arrayUnion",
                             "approach_", "trackableId"]) {
      assert.ok(!text.includes(forbidden), `${name} names ${forbidden}`);
    }
  }
});

// --- 3. MMJ != A SEPARATE NOTEBOOK SUBSYSTEM --------------------------------
check("no new Note collection has appeared", () => {
  const text = fs.readFileSync(path.join(appJs, "collections.js"), "utf8");
  const noteCollections = [...text.matchAll(/^\s*[A-Z_]+:\s*"(\w*[Nn]ote\w*)"/gm)].map((m) => m[1]).sort();
  assert.deepEqual(noteCollections,
    ["ayahNotes", "noteFolders", "notePlacements", "noteRevisions", "noteSources", "notes", "teachingNotes"].sort(),
    "the Note collection set has changed -- MMJ must read the Note Foundation, never define its own");
});
check("the accepted contract still names folders and placements as FOUNDATION collections", () => {
  const contract = JSON.parse(fs.readFileSync(path.join(root, "tools/i18n-verify/note-foundation-contract.json"), "utf8"));
  for (const name of ["noteFolders", "notePlacements"]) {
    assert.ok(contract.foundationCollections.includes(name), `${name} is not an accepted foundation collection`);
  }
  assert.equal(contract.identity.folderPlacement, "many-to-many-relation",
    "the accepted placement relation has changed -- re-audit ADR-010 §5");
  assert.equal(contract.deploymentAuthorised, false);
});

// --- 4. ADR-010 AND THE CODE AGREE, BOTH WAYS -------------------------------
check("every semantic role in the code is recorded in ADR-010, and the locked distinctions are quoted", () => {
  const adr = fs.readFileSync(path.join(root, "docs/governance/adr/ADR-010-mapping-my-journey-foundation-v1.md"), "utf8");
  for (const role of FOLDER_SEMANTIC_ROLES) {
    assert.ok(adr.includes("`" + role + "`"), `ADR-010 does not record the role ${role}`);
  }
  assert.ok(adr.includes(`**${MAX_FOLDER_DEPTH}**`), `ADR-010 does not record the depth bound ${MAX_FOLDER_DEPTH}`);
  const architecture = fs.readFileSync(path.join(root, "docs/governance/ACTIVE-ARCHITECTURE.md"), "utf8");
  for (const locked of ["Mapping My Journey ≠ a separate Notebook subsystem",
                        "Note Origin ≠ Note Destination",
                        "Reflection Archive ≠ Personal Journey Map"]) {
    assert.ok(architecture.includes(locked), `the architecture no longer locks: ${locked}`);
    assert.ok(adr.includes(locked), `ADR-010 does not carry the locked distinction it enforces: ${locked}`);
  }
});

console.log(`\n==== Mapping My Journey foundation boundary: ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
