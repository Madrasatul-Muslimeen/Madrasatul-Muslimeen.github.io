// MAP Phase 5 (P5-E) -- every Firestore query in the app that NEEDS a composite
// index must have one declared.
//
// WHY THIS SUITE EXISTS, and why no emulator run could replace it.
//
// For most of this app's life it declared no Firestore composite index
// anywhere, because every query outside the Note Foundation is equality-only
// and Firestore serves those from single-field indexes. The Note Foundation
// introduced the first queries that combine equality filters with an
// `orderBy` on a DIFFERENT field, and each of those fails in production with
// `failed-precondition: The query requires an index` unless one is declared.
//
// The Firestore EMULATOR does not enforce this. Proven, not assumed:
// `tools/firestore-emulator/index-probe.test.mjs` starts the emulator with an
// index file declaring ZERO indexes and the query is served anyway. So a green
// emulator suite says nothing at all about index requirements, and this gap
// could only ever be caught by reading the queries -- which is what this does.
//
// DEPLOYED, 22 Sep 2026 -- `firebase.json`/`firestore.indexes.json` now exist
// at the live path, confirmed by the Owner in the Firebase Console (all four
// indexes read Enabled). Until this date the last check below asserted the
// OPPOSITE -- that no live index file existed -- because declaring one before
// it was actually deployed would have been the repository claiming readiness
// nobody had proven. That claim is no longer premature; it is fact. The check
// now guards the other direction: the live declaration must match exactly
// what was audited and actually deployed, so a FUTURE index cannot be slipped
// onto the live path without going through the same declared-candidate,
// audited, Owner-confirmed ceremony this one did.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
const appJs = path.join(root, "app", "js");
// Phase 5 and Phase 6 keep separate candidate files, for the same reason their
// Rules candidates are separate: the Phase 5 file is part of a deployment
// package already in the Owner's hands. Both are read here as one declared set.
const CANDIDATES = [
  "docs/governance/phase5-note-foundation-indexes-candidate-2026-09-15.json",
  "docs/governance/phase6-journey-map-indexes-candidate-2026-09-17.json",
];
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

/** TENANT.X -> the real collection name, read from collections.js rather than retyped. */
function tenantCollectionNames() {
  const text = fs.readFileSync(path.join(appJs, "collections.js"), "utf8");
  const out = new Map();
  for (const m of text.matchAll(/^\s*([A-Z_]+):\s*"([^"]+)"/gm)) out.set(m[1], m[2]);
  return out;
}

/** Every balanced `query( ... )` expression in one file. */
function queryExpressions(text) {
  const found = [];
  for (const m of text.matchAll(/\bquery\s*\(/g)) {
    let depth = 0, i = m.index + m[0].length - 1;
    for (; i < text.length; i++) {
      if (text[i] === "(") depth++;
      else if (text[i] === ")") { depth--; if (depth === 0) break; }
    }
    found.push(text.slice(m.index, i + 1));
  }
  return found;
}

const RANGE_OPS = new Set(["<", "<=", ">", ">=", "!=", "not-in", "array-contains-any"]);

/** The queries that Firestore cannot serve from single-field indexes alone. */
function compositeIndexQueries() {
  const names = tenantCollectionNames();
  const out = [];
  for (const file of fs.readdirSync(appJs).filter((f) => f.endsWith(".js"))) {
    const text = fs.readFileSync(path.join(appJs, file), "utf8");
    for (const expr of queryExpressions(text)) {
      const order = [...expr.matchAll(/orderBy\(\s*"([^"]+)"(?:\s*,\s*"(asc|desc)")?/g)]
        .map((m) => ({ field: m[1], direction: (m[2] ?? "asc") === "desc" ? "DESCENDING" : "ASCENDING" }));
      const clauses = [
        ...[...expr.matchAll(/where\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g)].map((m) => ({ field: m[1], op: m[2] })),
        // Issue #282 -- Mapping My Journey's sharded parallel loader ranges a
        // page query over `documentId()` rather than a plain field name, so
        // the field-name regex above never sees it at all. Recognised here as
        // the same `"__name__"` sentinel the real Firestore SDK resolves
        // `documentId()` to, so the range check below can name it explicitly
        // rather than being silently blind to a whole class of query.
        ...[...expr.matchAll(/where\(\s*documentId\(\)\s*,\s*"([^"]+)"/g)].map((m) => ({ field: "__name__", op: m[1] })),
      ];
      const ranges = clauses.filter((c) => RANGE_OPS.has(c.op));
      // An equality-only query with no ordering is served by single-field
      // indexes (zigzag merge), which is why this app has needed no index file
      // until now. Anything with an orderBy on another field, or a range
      // filter on any field OTHER than `__name__`, needs a composite index
      // declared. A range on `__name__` alone needs none (see the next check's
      // own reasoning) and is not itself grounds for inclusion here.
      const rangesNeedingIndex = ranges.filter((r) => r.field !== "__name__");
      if (order.length === 0 && rangesNeedingIndex.length === 0) continue;
      const col = expr.match(/collection\(\s*[A-Za-z0-9_]+\s*,\s*TENANT\.([A-Z_]+)\s*\)/);
      assert.ok(col, `could not read the collection of a query in ${file}: ${expr.slice(0, 80)}`);
      const collectionGroup = names.get(col[1]);
      assert.ok(collectionGroup, `TENANT.${col[1]} is not defined in collections.js`);
      out.push({
        file, collectionGroup, order,
        equality: clauses.filter((c) => c.op === "==").map((c) => c.field),
        hasRange: rangesNeedingIndex.length > 0,
      });
    }
  }
  return out;
}

const queries = compositeIndexQueries();
const candidate = { indexes: CANDIDATES.flatMap((rel) =>
  JSON.parse(fs.readFileSync(path.join(root, rel), "utf8")).indexes) };

// --- POSITIVE CONTROL -------------------------------------------------------
check("POSITIVE CONTROL: the scanner really finds queries", () => {
  // Without this, a broken regex would find nothing and every case below would
  // pass vacuously -- a check that cannot fail.
  assert.ok(queries.length >= 3,
    `the scanner found ${queries.length} index-requiring queries; it has stopped working`);
  assert.ok(queries.length >= 4,
    `the scanner found ${queries.length} index-requiring queries; expected at least 4`);
  const files = [...new Set(queries.map((q) => q.file))];
  assert.deepEqual(files, ["note-foundation.js"],
    `index-requiring queries appeared outside the Note Foundation: ${files.join(", ")} -- each needs a declared index`);
});

// Issue #282 -- this used to assert "no query in the app uses a range filter
// at all". `journey-map-shard.js`'s sharded parallel loader introduced one on
// purpose: `where(documentId(), '>='/'<' , ...)`, combined with the SAME
// equality filters (tenantId, ownerPersonId, status) every Note Foundation
// list query already uses. THIS NEEDS NO COMPOSITE INDEX, and it is not a new
// query SHAPE either: every paged reader in note-foundation.js already ranges
// over the collection's own implicit `__name__` order via `startAfter()` --
// that IS a range condition on the document id, merely expressed as a cursor
// -- and it already runs in production today, at the Owner's real import
// scale, combined with these exact equality filters (v08.66's own changelog:
// "1,464 folders, 1,083 Notes, 2,319 filings, 0 refused"). An explicit
// `where(documentId(), ...)` bound is the identical index shape Firestore
// already serves for that cursor. UPDATED IN PLACE rather than deleted, the
// reason recorded here: the check now names and allows exactly this one
// understood range shape, and still refuses (below) any OTHER field's range
// filter, or a `__name__` range that shows up ALONGSIDE one, unchanged from
// before -- either would still need its own by-hand analysis.
check("every range filter on a field OTHER than documentId() (__name__) still needs its own by-hand analysis -- none has appeared", () => {
  const ranged = queries.filter((q) => q.hasRange);
  assert.deepEqual(ranged, [], "a range query on a field other than documentId() has appeared; its index requirement must be worked out by hand");
});

// The three sharded readers build their `where(documentId(), ...)` clauses
// through ONE shared helper (`idRangeClauses()`), not inline inside each
// `query(...)` call -- so `compositeIndexQueries()`'s own textual walk of
// `query(...)` bodies cannot see them at all (the same class of scanner
// blind spot this file's own header already names for the emulator). That
// cuts both ways harmlessly here (nothing demands a nonexistent index for a
// query the scanner cannot see either), but it means the guarantee above --
// "no OTHER range filter has appeared" -- says nothing about whether
// `idRangeClauses()` itself stayed a `__name__`-only range. Checked directly
// against its own source instead.
const noteFoundationSrc = fs.readFileSync(path.join(appJs, "note-foundation.js"), "utf8");
check("POSITIVE CONTROL: idRangeClauses() (the sharded readers' own documentId()-range helper) still exists and still ranges only on documentId()", () => {
  const fn = noteFoundationSrc.match(/function idRangeClauses\([^)]*\)\s*\{[\s\S]*?\n\}/);
  assert.ok(fn, "idRangeClauses() was not found -- this check needs updating, or the sharded readers lost their range helper");
  const body = fn[0];
  assert.match(body, /where\(documentId\(\),\s*">="/, "idRangeClauses() no longer builds a documentId() >= bound");
  assert.match(body, /where\(documentId\(\),\s*"<"/, "idRangeClauses() no longer builds a documentId() < bound");
  assert.ok(!/where\(\s*"[^"]/.test(body), "idRangeClauses() now also ranges on a named field -- that combination needs its own by-hand index analysis, not this check's blanket allowance");
});
check("idRangeClauses() is used by exactly the three sharded Note Foundation readers this round added it for", () => {
  const users = [];
  for (const m of noteFoundationSrc.matchAll(/^export async function (\w+)\(/gm)) {
    // Balance parens from the signature's own opening "(" to its matching
    // ")" -- these signatures destructure a param object (`{ ... }`), whose
    // OWN opening brace is not the function body, so a naive "first { wins"
    // scan (tried first, found broken) stops mid-signature every time.
    let depth = 0, i = m.index + m[0].length - 1;
    for (; i < noteFoundationSrc.length; i++) {
      if (noteFoundationSrc[i] === "(") depth++;
      else if (noteFoundationSrc[i] === ")") { depth--; if (depth === 0) break; }
    }
    const header = noteFoundationSrc.slice(m.index, i + 1);
    if (/\bidRange\b/.test(header)) users.push(m[1]);
  }
  assert.deepEqual(users.sort(), ["listNoteFoldersForOwnerPage", "listNotePlacementsForOwnerPage", "listNotesForOwnerIdPage"].sort(),
    `expected exactly the three sharded readers to accept idRange; found ${users.join(", ") || "(none)"}`);
});

// --- EVERY REQUIRING QUERY HAS A DECLARED INDEX -----------------------------
for (const q of queries) {
  const label = `${q.collectionGroup} (${q.equality.join(", ")}) orderBy ${q.order.map((o) => o.field).join(", ")}`;
  check(`declared index for ${label}`, () => {
    assert.equal(q.order.length, 1, "more than one orderBy needs its own analysis");
    const match = candidate.indexes.find((idx) => {
      if (idx.collectionGroup !== q.collectionGroup) return false;
      const fields = idx.fields;
      const last = fields[fields.length - 1];
      if (last.fieldPath !== q.order[0].field || last.order !== q.order[0].direction) return false;
      const equalities = fields.slice(0, -1);
      if (equalities.some((f) => f.order !== "ASCENDING")) return false;
      return equalities.length === q.equality.length
        && [...equalities.map((f) => f.fieldPath)].sort().join("|") === [...q.equality].sort().join("|");
    });
    assert.ok(match, `${q.file} runs a query with NO declared composite index: ${label}`);
  });
}

check("the candidate declares no index no query needs", () => {
  const needed = queries.map((q) => `${q.collectionGroup}:${[...q.equality].sort().join("|")}:${q.order[0].field}`);
  const declared = candidate.indexes.map((idx) => {
    const eq = idx.fields.slice(0, -1).map((f) => f.fieldPath).sort().join("|");
    return `${idx.collectionGroup}:${eq}:${idx.fields[idx.fields.length - 1].fieldPath}`;
  });
  const spare = declared.filter((d) => !needed.includes(d));
  assert.deepEqual(spare, [], `the candidate declares indexes nothing queries: ${spare.join(", ")}`);
});

// --- DEPLOYED, AND EXACTLY WHAT WAS AUDITED ---------------------------------
check("indexes are deployed: firebase.json points at a live index file", () => {
  const firebase = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8"));
  assert.equal(firebase.firestore?.indexes, "firestore.indexes.json",
    "firebase.json does not point at firestore.indexes.json -- the Owner confirmed these indexes are deployed on 22 Sep 2026, so the repository must say so too");
});

check("the live index file declares EXACTLY the audited candidate set -- no more, no fewer", () => {
  const livePath = path.join(root, "firestore.indexes.json");
  assert.ok(fs.existsSync(livePath), "firestore.indexes.json does not exist at the live deploy path");
  const live = JSON.parse(fs.readFileSync(livePath, "utf8"));
  const key = (idx) => `${idx.collectionGroup}:${idx.fields.map((f) => `${f.fieldPath}:${f.order}`).join(",")}`;
  const liveKeys = new Set(live.indexes.map(key));
  const candidateKeys = new Set(candidate.indexes.map(key));
  const missing = [...candidateKeys].filter((k) => !liveKeys.has(k));
  const extra = [...liveKeys].filter((k) => !candidateKeys.has(k));
  assert.deepEqual(missing, [], `an audited index is missing from the live file: ${missing.join(", ")}`);
  assert.deepEqual(extra, [], `the live file declares an index that was never audited as a candidate: ${extra.join(", ")} -- a new index needs the same candidate-and-audit ceremony before it reaches the live path`);
});

console.log(`\n==== Firestore index requirements: ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
