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
const GUARDED = "journey-map-contract.js";
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
check("NO PAGE can reach the journey contract, by any chain of any length", () => {
  assert.deepEqual(chainsToTarget(GUARDED), []);
});
check("the only importer of the journey contract is the data layer, itself unreachable", () => {
  // UPDATED 2026-09-15 (P6-B), with the reason recorded rather than the check
  // deleted. P6-B closes createNoteFolder()'s missing parent validation against
  // ADR-010, so note-foundation.js now imports the contract. The claim that
  // matters -- nothing a reader can reach touches this -- is unchanged, and the
  // reachability case above is what actually holds it. The importer set is
  // PINNED so a new one must be audited deliberately.
  const importers = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(js|html)$/.test(entry.name) || entry.name === GUARDED) continue;
      if (/(?:from|import)\s*["'`][./]*(?:js\/)?journey-map-contract\.js["'`]/.test(fs.readFileSync(full, "utf8"))) {
        importers.push(path.relative(root, full));
      }
    }
  })(appDir);
  assert.deepEqual(importers.sort(), ["app/js/note-foundation.js"],
    `the set of modules importing the journey contract has changed: ${importers.join(", ")}`);
  for (const importer of importers) {
    assert.deepEqual(chainsToTarget(path.basename(importer)), [], `${importer} is now loaded by a page`);
  }
});

function unchangedSinceMain(relPath) {
  const head = execFileSync("git", ["show", `origin/main:${relPath}`], { cwd: root, encoding: "utf8" });
  assert.equal(fs.readFileSync(path.join(root, relPath), "utf8"), head,
    `${relPath} is NOT byte-identical to origin/main`);
}
check("noteFolders and notePlacements are still UNRULED in production", () => {
  const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
  for (const collection of ["noteFolders", "notePlacements", "notes", "noteSources", "noteRevisions"]) {
    assert.ok(!rules.includes(`match /${collection}/`), `firestore.rules now governs ${collection}`);
  }
  unchangedSinceMain("firestore.rules");
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
check("existing user notes untouched; the data layer changed by INSERTION ONLY", () => {
  // UPDATED 2026-09-15 (P6-B): the data layer now validates a folder's parent,
  // so byte-identity is no longer the right claim -- "nothing removed or
  // reshaped" still is, and an addition-only diff proves it mechanically.
  unchangedSinceMain("app/js/ayah-notes.js");
  const diff = execFileSync("git", ["diff", "--numstat", "origin/main", "--", "app/js/note-foundation.js"],
    { cwd: root, encoding: "utf8" }).trim();
  if (diff === "") return;
  const [added, removed] = diff.split(/\s+/);
  assert.equal(removed, "0", `note-foundation.js has ${removed} REMOVED lines -- an existing behaviour may have been reshaped`);
  assert.ok(Number(added) > 0);
});
check("the Mapping My Journey pillar is still explicitly unavailable", () => {
  const shell = fs.readFileSync(path.join(appDir, "quranrevival.html"), "utf8");
  assert.match(shell, /id="tabJourneyBtn"[^>]*(?:disabled|aria-disabled="true")/);
});

// --- 2. ORIGIN != DESTINATION, enforced by inability ------------------------
check("the contract is PURE: it imports nothing at all", () => {
  const text = codeOf(GUARDED);
  assert.ok(!/\bimport\b/.test(text), "the journey contract must import nothing");
  for (const forbidden of ["firebasejs", "envelope.js", "collections.js", "TENANT.", "getDoc", "setDoc"]) {
    assert.ok(!text.includes(forbidden), `the contract must stay pure: ${forbidden}`);
  }
});
check("the contract CANNOT derive a Destination from an Origin", () => {
  // ADR-010 §2. The enforcement is the ABSENCE of any route to a Study Unit
  // key: no import of the binding, no unit-key helper, no way to parse one.
  const text = codeOf(GUARDED);
  for (const forbidden of ["study-note-binding", "unit-keys", "buildUnitKey", "parseUnitKey",
                           "bindableUnitType", "study-note-service", "noteSources"]) {
    assert.ok(!text.includes(forbidden), `the journey contract can reach Origin material: ${forbidden}`);
  }
});
check("the contract can reach neither Mastery nor Activity", () => {
  const text = codeOf(GUARDED);
  for (const forbidden of ["records.js", "claimStatus", "achieved", "mastered", "activity", "arrayUnion",
                           "approach_", "trackableId"]) {
    assert.ok(!text.includes(forbidden), `the journey contract names ${forbidden}`);
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
