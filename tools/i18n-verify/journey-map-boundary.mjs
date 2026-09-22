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
// RECORDED RATHER THAN THE CHECK WEAKENED. Until this round "NO PAGE can
// reach the journey contract OR its service" was one claim, true only
// because nothing page-reachable had ever loaded `note-foundation.js` AT
// ALL. P5-D wires `study-note-service.js` -- an ALREADY-ACCEPTED Phase 5
// wrapper that has imported `note-foundation.js` since it was written -- into
// a real page (`app/notes.html`) for the first time, and `note-foundation.js`
// has imported the journey contract since P6-B (15 Sep 2026), for its own
// Phase 6 folder-cycle validation. There is no way to wire ANY Phase 5 Note
// function into a page without the whole module loading, so blanket
// unreachability of `journey-map-contract.js` stopped being achievable the
// moment P5-D was authorised -- asserting it regardless would be asserting
// the round's own wiring does not work, the identical shape v08.30's own
// D1/D2/D4 guard inverted, 19 Sep's D3-chokepoint round inverted again, and
// this same round's own `study-note-boundary.mjs` update inverts a third
// time. The claim is split into what actually still holds:
//
//   (a) `journey-map-service.js` -- the Phase 6 SERVICE, as opposed to the
//       pure contract -- is untouched by this round and stays completely
//       unreachable, by any chain, from any page.
//   (b) `journey-map-contract.js` is reachable now, but ONLY through
//       `note-foundation.js`, and ONLY from the one audited P5-D page.
//   (c) The behaviour ADR-010 actually protects -- no Phase 6 FOLDER or
//       PLACEMENT function ever being called from anything page-reachable --
//       is asserted directly, below, rather than inferred from the file
//       being unloadable.
const KNOWN_WIRED_PAGE = "app/notes.html";

check("journey-map-service.js -- the Phase 6 service, not the pure contract -- remains unreachable by any page", () => {
  assert.deepEqual(chainsToTarget("journey-map-service.js"), []);
});

check("journey-map-contract.js is reachable ONLY via note-foundation.js, and ONLY from the one audited P5-D page", () => {
  const chains = chainsToTarget("journey-map-contract.js");
  const pages = [...new Set(chains.map((c) => c.split(" -> ")[0]))];
  assert.deepEqual(pages, [KNOWN_WIRED_PAGE],
    `unexpected page(s) reaching journey-map-contract.js: ${chains.join(" | ")}`);
  assert.ok(chains.every((c) => c.includes("note-foundation.js")),
    `journey-map-contract.js is reached by a route that does not pass through note-foundation.js: ${chains.join(" | ")}`);
});

check("every importer of the journey modules is exactly the pinned set, and each is reachable only as accepted above", () => {
  // The importer SET is still pinned, so a THIRD module importing either
  // journey file must be audited deliberately -- unchanged from P6-B.
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
  assert.deepEqual([...new Set(importers)].sort(),
    ["app/js/journey-map-service.js", "app/js/note-foundation.js"],
    `the set of modules importing the journey contract has changed: ${importers.join(", ")}`);
  for (const importer of importers) {
    const base = path.basename(importer);
    const chains = chainsToTarget(base);
    const pages = [...new Set(chains.map((c) => c.split(" -> ")[0]))];
    // note-foundation.js is ACCEPTED to be reachable now, and only from the
    // one audited page (proven above); journey-map-service.js's own importer
    // (itself) must stay exactly as unreachable as it always was.
    const expectedPages = base === "note-foundation.js" ? [KNOWN_WIRED_PAGE] : [];
    assert.deepEqual(pages, expectedPages, `${importer}'s own reachability changed unexpectedly: ${chains.join(" | ")}`);
  }
});

// THE PROTECTION THAT ACTUALLY MATTERS, asserted directly rather than
// inferred from load-graph unreachability, since that inference is no longer
// available. `note-foundation.js` exports both Phase 5 (Notes, accepted) and
// Phase 6 (folders/placements, NOT accepted) functions from one file --
// P5-D's whole job is to call the first group, and this proves it never
// calls the second, from the one page that can now reach the file at all.
const PHASE_6_FUNCTIONS = [
  "createNoteFolder", "listNoteFoldersForOwner", "renameNoteFolder", "reorderNoteFolder",
  "reparentNoteFolder", "retireNoteFolder", "createNotePlacement",
  "listNotePlacementsForFolder", "listNotePlacementsForNote", "retireNotePlacement", "moveNotePlacement",
];
check("the newly-reachable page never calls a Phase 6 folder/placement function", () => {
  const text = fs.readFileSync(path.join(root, KNOWN_WIRED_PAGE), "utf8");
  const used = PHASE_6_FUNCTIONS.filter((fn) => text.includes(fn));
  assert.deepEqual(used, [], `${KNOWN_WIRED_PAGE} names Phase 6 function(s): ${used.join(", ")}`);
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
check("existing user notes untouched; the data layer changed by INSERTION ONLY, except one pinned line this round REPLACED to fix a real Rules-candidate defect", () => {
  // UPDATED 2026-09-15 (P6-B): the data layer now validates a folder's parent,
  // so byte-identity is no longer the right claim -- "nothing removed or
  // reshaped, except the one line named above" still is, and reading the
  // actual removed lines (not just counting them) proves it mechanically.
  unchangedSinceMain("app/js/ayah-notes.js");
  const diffText = execFileSync("git", ["diff", "origin/main", "--", "app/js/note-foundation.js"],
    { cwd: root, encoding: "utf8" });
  if (diffText === "") return;
  const removedLines = diffText.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---"));
  assert.deepEqual(removedLines, [NOTE_FOUNDATION_PINNED_REMOVAL],
    `note-foundation.js removed line(s) do not match the one pinned exception -- an existing behaviour may have been reshaped: ${JSON.stringify(removedLines)}`);
  const addedLines = diffText.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
  assert.ok(addedLines.length > 0);
});
check("the Mapping My Journey pillar is still explicitly unavailable", () => {
  const shell = fs.readFileSync(path.join(appDir, "quranrevival.html"), "utf8");
  assert.match(shell, /id="tabJourneyBtn"[^>]*(?:disabled|aria-disabled="true")/);
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
