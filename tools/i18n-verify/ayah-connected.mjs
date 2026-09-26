// Ayah Card section C part 2 -- "Connected āyāt" (issue #318), a dedicated
// pure suite for ayah-related.js's own connectedThroughNotes(): the reader's
// OWN Notes and Mapping folders that connect this āyah to others, marked
// studied or not (the Owner's decision, recorded on issue #295 and
// docs/governance/2026-09-26-owner-decisions.md).
//
// connectedThroughNotes() is pure -- no Firebase, no DOM -- and imported
// directly from the real source (the whole file has no imports of its own,
// the same reason ayah-related-browser.mjs imports it unrewritten).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { connectedThroughNotes, RELATED_CONNECTED_LIMIT } from "../../app/js/ayah-related.js";

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

const note = (label) => ({ label });
const folder = (label) => ({ label });

// --- 1. VIA A NOTE -----------------------------------------------------------
check("a Note anchored here, also anchored to another āyah, connects the two", () => {
  const result = connectedThroughNotes({
    surah: 2, ayah: 255,
    noteLinks: [{ sourceKey: "ayah:2:256", ...note("My reflection") }],
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].surah, 2);
  assert.equal(result[0].ayah, 256);
  assert.deepEqual(result[0].via, [{ kind: "note", label: "My reflection" }]);
});

// --- 2. VIA A FOLDER -----------------------------------------------------------
check("a folder filing a Note here, and a Note on another āyah, connects the two", () => {
  const result = connectedThroughNotes({
    surah: 2, ayah: 255,
    folderFilings: [{ sourceKey: "ayah:3:2", ...folder("Tafsir folder") }],
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].surah, 3);
  assert.equal(result[0].ayah, 2);
  assert.deepEqual(result[0].via, [{ kind: "folder", label: "Tafsir folder" }]);
});

// --- 3. BOTH ROUTES TO ONE ĀYAH GIVE ONE ROW WITH TWO REASONS ----------------
check("a note-route and a folder-route to the SAME āyah collapse into one row with two reasons", () => {
  const result = connectedThroughNotes({
    surah: 2, ayah: 255,
    noteLinks: [{ sourceKey: "ayah:3:2", ...note("My reflection") }],
    folderFilings: [{ sourceKey: "ayah:3:2", ...folder("Tafsir folder") }],
  });
  assert.equal(result.length, 1, "one row, not two");
  assert.equal(result[0].via.length, 2, "both reasons are kept");
  assert.deepEqual(new Set(result[0].via.map((v) => v.kind)), new Set(["note", "folder"]));
});
check("the SAME reason offered twice (e.g. two links from the same Note) is not duplicated", () => {
  const result = connectedThroughNotes({
    surah: 2, ayah: 255,
    noteLinks: [
      { sourceKey: "ayah:3:2", ...note("My reflection") },
      { sourceKey: "ayah:3:2", ...note("My reflection") },
    ],
  });
  assert.equal(result[0].via.length, 1, "an identical (kind, label) pair is deduplicated");
});

// --- 4. THE ĀYAH ITSELF IS EXCLUDED -------------------------------------------
check("the queried āyah's own key is never returned as a connection to itself", () => {
  const result = connectedThroughNotes({
    surah: 2, ayah: 255,
    noteLinks: [{ sourceKey: "ayah:2:255", ...note("Self-referencing link") }],
  });
  assert.deepEqual(result, [], "a note's OTHER anchor equalling the queried āyah names nothing new");
});
check("a non-āyah unit key (juz/surah/topic) is silently ignored, not crashed on", () => {
  const result = connectedThroughNotes({
    surah: 2, ayah: 255,
    noteLinks: [{ sourceKey: "juz:1", ...note("A juz-level Note") }, { sourceKey: "surah:3", ...note("A surah-level Note") }],
  });
  assert.deepEqual(result, []);
});

// --- 5. STUDIED / NOT STUDIED / NOT CHECKED -----------------------------------
check("studiedKeys marking true reads as studied: true", () => {
  const result = connectedThroughNotes({
    surah: 2, ayah: 255,
    noteLinks: [{ sourceKey: "ayah:3:2", ...note("N") }],
    studiedKeys: { "3:2": true },
  });
  assert.equal(result[0].studied, true);
});
check("studiedKeys marking false reads as studied: false, distinct from unknown", () => {
  const result = connectedThroughNotes({
    surah: 2, ayah: 255,
    noteLinks: [{ sourceKey: "ayah:3:2", ...note("N") }],
    studiedKeys: { "3:2": false },
  });
  assert.equal(result[0].studied, false);
});
check("an āyah absent from studiedKeys reads as studied: null (\"not checked\"), never guessed", () => {
  const result = connectedThroughNotes({
    surah: 2, ayah: 255,
    noteLinks: [{ sourceKey: "ayah:3:2", ...note("N") }],
    studiedKeys: {},
  });
  assert.equal(result[0].studied, null);
});

// --- 6. STRONGEST FIRST, CAPPED ----------------------------------------------
check("results sort strongest (most reasons) first", () => {
  const result = connectedThroughNotes({
    surah: 2, ayah: 255,
    noteLinks: [
      { sourceKey: "ayah:2:200", ...note("Single-reason note") },
      { sourceKey: "ayah:3:2", ...note("A") },
    ],
    folderFilings: [{ sourceKey: "ayah:3:2", ...folder("B") }],
  });
  assert.equal(result[0].surah, 3, "the two-reason connection (3:2) sorts before the one-reason connection");
  assert.equal(result[0].ayah, 2);
  assert.equal(result[1].ayah, 200);
});
check("capped at RELATED_CONNECTED_LIMIT even when many āyāt connect", () => {
  const noteLinks = [];
  for (let a = 1; a <= 20; a += 1) noteLinks.push({ sourceKey: `ayah:2:${a}`, ...note(`N${a}`) });
  const result = connectedThroughNotes({ surah: 2, ayah: 255, noteLinks });
  assert.equal(RELATED_CONNECTED_LIMIT, 12, "precondition: the documented cap");
  assert.equal(result.length, 12);
});

// --- 7. NO DATA AT ALL -> AN EMPTY LIST, NOT A CRASH --------------------------
check("no note links and no folder filings returns an empty list", () => {
  assert.deepEqual(connectedThroughNotes({ surah: 2, ayah: 255 }), []);
});

// --- 8. PURE: NO FIREBASE, NO DOM ---------------------------------------------
check("the module imports nothing at all (pure, testable without a page or Firebase)", () => {
  const text = fs.readFileSync(path.join(root, "app/js/ayah-related.js"), "utf8");
  assert.ok(!/^\s*import /m.test(text), "ayah-related.js must stay import-free");
});

console.log(`\n==== Ayah Card Connected āyāt, pure (issue #318): ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
