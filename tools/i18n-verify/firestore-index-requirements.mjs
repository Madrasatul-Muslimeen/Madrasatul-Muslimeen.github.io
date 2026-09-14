// MAP Phase 5 (P5-E) -- every Firestore query in the app that NEEDS a composite
// index must have one declared.
//
// WHY THIS SUITE EXISTS, and why no emulator run could replace it.
//
// The repository declares no Firestore composite index anywhere: `firebase.json`
// has no `indexes` key and no `firestore.indexes.json` exists. That was harmless
// for the whole life of the app, because every query outside the Note Foundation
// is equality-only, and Firestore serves those without a declared composite
// index. The Note Foundation introduced the first queries that combine equality
// filters with an `orderBy` on a DIFFERENT field, and each of those fails in
// production with `failed-precondition: The query requires an index`.
//
// The Firestore EMULATOR does not enforce this. Proven, not assumed:
// `tools/firestore-emulator/index-probe.test.mjs` starts the emulator with an
// index file declaring ZERO indexes and the query is served anyway. So a green
// emulator suite says nothing at all about index requirements, and this gap
// could only ever be caught by reading the queries -- which is what this does.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
const appJs = path.join(root, "app", "js");
const CANDIDATE = "docs/governance/phase5-note-foundation-indexes-candidate-2026-09-15.json";
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
      const clauses = [...expr.matchAll(/where\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g)]
        .map((m) => ({ field: m[1], op: m[2] }));
      const ranges = clauses.filter((c) => RANGE_OPS.has(c.op));
      // An equality-only query with no ordering is served by single-field
      // indexes (zigzag merge), which is why this app has needed no index file
      // until now. Anything with an orderBy on another field, or a range
      // filter, needs a composite index declared.
      if (order.length === 0 && ranges.length === 0) continue;
      const col = expr.match(/collection\(\s*[A-Za-z0-9_]+\s*,\s*TENANT\.([A-Z_]+)\s*\)/);
      assert.ok(col, `could not read the collection of a query in ${file}: ${expr.slice(0, 80)}`);
      const collectionGroup = names.get(col[1]);
      assert.ok(collectionGroup, `TENANT.${col[1]} is not defined in collections.js`);
      out.push({
        file, collectionGroup, order,
        equality: clauses.filter((c) => c.op === "==").map((c) => c.field),
        hasRange: ranges.length > 0,
      });
    }
  }
  return out;
}

const queries = compositeIndexQueries();
const candidate = JSON.parse(fs.readFileSync(path.join(root, CANDIDATE), "utf8"));

// --- POSITIVE CONTROL -------------------------------------------------------
check("POSITIVE CONTROL: the scanner really finds queries", () => {
  // Without this, a broken regex would find nothing and every case below would
  // pass vacuously -- a check that cannot fail.
  assert.ok(queries.length >= 3,
    `the scanner found ${queries.length} index-requiring queries; it has stopped working`);
  const files = [...new Set(queries.map((q) => q.file))];
  assert.deepEqual(files, ["note-foundation.js"],
    `index-requiring queries appeared outside the Note Foundation: ${files.join(", ")} -- each needs a declared index`);
});

check("no query in the app uses a range filter -- so orderBy is the only index driver", () => {
  const ranged = queries.filter((q) => q.hasRange);
  assert.deepEqual(ranged, [], "a range query has appeared; its index requirement must be worked out by hand");
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

// --- CANDIDATE ONLY ---------------------------------------------------------
check("the candidate is a CANDIDATE: firebase.json still declares no indexes", () => {
  const firebase = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8"));
  assert.ok(!("indexes" in (firebase.firestore ?? {})),
    "firebase.json now points at an index file -- that is a deployment-shaped change and an Owner Control Gate");
  assert.ok(!fs.existsSync(path.join(root, "firestore.indexes.json")),
    "a firestore.indexes.json now sits at the deploy path -- the candidate must stay under docs/governance/");
});

console.log(`\n==== Firestore index requirements: ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
