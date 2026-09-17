// MAP -- NO AUTHORISATION MAY SIT UNEXECUTABLE, AND NO WRITE MAY SIT
// UNAUTHORISED.
//
// Why this file exists. Three rounds in a row found the same defect by hand:
// an accepted Rules candidate authorised a field change that NO CODE COULD
// PERFORM.
//
//   P6-C  ADR-010 §5's retire-and-create had no retire function at all.
//   P6-D  `noteFolders` was create-only while the candidate's own comment said
//         "a folder may be renamed, reordered, re-parented or retired".
//   P5-F  a `noteSources` link could be created and never retired, though the
//         candidate says "a link may be retired" and its emulator suite had
//         already PROVEN the server allows it.
//   P6-E  a `notePlacements` `order` could never be changed -- with a composite
//         index already specified to serve exactly that ordering.
//
// Each was invisible to every existing suite, because every existing suite
// tests what the code DOES. Nothing compared what the Rules PERMIT against
// what the data layer can perform. This does, in both directions:
//
//   FORWARD   every field an accepted `allow update` may change must be
//             written by some data-layer update. Otherwise an accepted
//             decision is unexecutable.
//   BACKWARD  every field a data-layer update writes must be one that
//             `allow update` may change. Otherwise the write is denied in
//             production -- and a pure suite would never notice, because the
//             stub has no rules.
//
// It is deliberately DERIVED from the Rules text rather than from a list kept
// here. A new authorised field fails this check the day it is authorised.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (e) {
    failed++; console.log(`  FAIL  ${name}\n        ${e.message}`);
  }
}

// The envelope stamps these on every document (I17). They are never a caller's
// to send, so they are not part of what a data-layer update must cover.
const ENVELOPE = new Set(["schemaVersion", "createdAt", "updatedAt", "createdBy"]);

const PHASE5 = "docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules";
const PHASE6 = "docs/governance/phase6-journey-map-rules-candidate-2026-09-15.rules";
const PHASE4 = "docs/governance/phase4-activity-evidence-rules-candidate-2026-09-14.rules";

/**
 * Everything between `match /<collection>/{...} {` and the brace that closes it.
 *
 * The opening brace is the LAST one on the match line, not the first: a path
 * segment is itself written `{noteKey}`, so scanning forward from `match` finds
 * the wildcard's brace, closes on its own `}`, and returns a two-token block in
 * which nothing is found and everything passes. That is exactly how this file's
 * own first run reported five collections as create-only.
 */
function matchBlock(source, collectionPath) {
  const start = source.indexOf(`match /${collectionPath}`);
  assert.notEqual(start, -1, `no match block for ${collectionPath}`);
  const lineEnd = source.indexOf("\n", start);
  const open = source.lastIndexOf("{", lineEnd);
  assert.ok(open > start, `${collectionPath}: no opening brace on the match line`);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) {
      const block = source.slice(open, i);
      assert.ok(block.length > 200, `${collectionPath}: block parsed as ${block.length} chars -- the parser is broken`);
      return block;
    }
  }
  throw new Error(`unterminated match block for ${collectionPath}`);
}

const idsIn = (text) => [...text.matchAll(/'([A-Za-z][A-Za-z0-9]*)'/g)].map((m) => m[1]);

/**
 * What an `allow update` on this collection may change.
 *
 * Two forms appear in these candidates and both are handled:
 *   - an explicit `affectedKeys().hasOnly([...])`, which says it outright;
 *   - a shape list minus the fields an `...IdentityUnchanged()` helper and
 *     `createdByFrozen()` freeze.
 * `allow update ... : if false` means create-only.
 */
function authorisedUpdate(source, collectionPath, identityFn) {
  const block = matchBlock(source, collectionPath);
  if (/allow update[^:]*:\s*if false/.test(block) || !/allow update/.test(block)) {
    return { updateAllowed: false, mutable: new Set() };
  }
  const affected = block.match(/affectedKeys\(\)\.hasOnly\(\[([^\]]*)\]\)/);
  if (affected) {
    return {
      updateAllowed: true,
      mutable: new Set(idsIn(affected[1]).filter((f) => !ENVELOPE.has(f))),
    };
  }
  const shape = block.match(/keys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/);
  assert.ok(shape, `${collectionPath}: neither affectedKeys nor a shape list found`);
  const all = idsIn(shape[1]);
  assert.ok(all.length > 3, `${collectionPath}: shape list parsed as ${all.length} fields -- the parser is broken`);

  // The identity helper may live outside the match block (shared across
  // collections in the same file), so it is looked up in the whole source.
  const identity = source.match(new RegExp(`function ${identityFn}\\(\\)[\\s\\S]*?;\\s*\\n\\s*\\}`));
  assert.ok(identity, `${collectionPath}: ${identityFn}() not found`);
  const frozen = new Set([
    ...[...identity[0].matchAll(/d\(\)\.(?:get\(')?([A-Za-z][A-Za-z0-9]*)/g)].map((m) => m[1]),
    "createdBy",
  ]);
  assert.ok(frozen.size > 2, `${collectionPath}: ${identityFn}() parsed as ${frozen.size} frozen fields -- the parser is broken`);
  return {
    updateAllowed: true,
    mutable: new Set(all.filter((f) => !frozen.has(f) && !ENVELOPE.has(f))),
  };
}

/** Every field name any `transaction.update(TENANT.X, …, { … })` in `source` writes. */
function dataLayerUpdates(source, tenantKey) {
  const fields = new Set();
  const re = new RegExp(String.raw`transaction\.update\(\s*TENANT\.${tenantKey}\s*,[^,]*,\s*\{([^}]*)\}`, "g");
  let hits = 0;
  for (const m of source.matchAll(re)) {
    hits++;
    for (const f of m[1].matchAll(/([A-Za-z][A-Za-z0-9]*)\s*:/g)) fields.add(f[1]);
    // `{ status }` and `{ order }` shorthand carry no colon.
    for (const f of m[1].split(",")) {
      const bare = f.trim();
      if (/^[A-Za-z][A-Za-z0-9]*$/.test(bare)) fields.add(bare);
    }
  }
  return { fields, hits };
}

const p4 = read(PHASE4), p5 = read(PHASE5), p6 = read(PHASE6);
const dataLayer = read("app/js/note-foundation.js");

const COLLECTIONS = [
  { name: "notes",           rules: p5, matchPath: "notes/",           identity: "noteIdentityUnchanged",      tenantKey: "NOTES" },
  { name: "noteRevisions",   rules: p5, matchPath: "noteRevisions/",   identity: null,                          tenantKey: "NOTE_REVISIONS" },
  { name: "noteSources",     rules: p5, matchPath: "noteSources/",     identity: null,                          tenantKey: "NOTE_SOURCES" },
  { name: "noteFolders",     rules: p6, matchPath: "noteFolders/",     identity: "folderIdentityUnchanged",     tenantKey: "NOTE_FOLDERS" },
  { name: "notePlacements",  rules: p6, matchPath: "notePlacements/",  identity: "placementIdentityUnchanged",  tenantKey: "NOTE_PLACEMENTS" },
];

// --- POSITIVE CONTROL ------------------------------------------------------
// Without this the whole file can pass vacuously: one broken regex makes every
// mutable set empty, every forward assertion trivially true, and every
// backward assertion true as well. So first prove the parser reads something.
check("POSITIVE CONTROL: the parser really reads a mutable set out of the Rules", () => {
  const notes = authorisedUpdate(p5, "notes/", "noteIdentityUnchanged");
  assert.equal(notes.updateAllowed, true);
  assert.deepEqual([...notes.mutable].sort(), ["bodyHtml", "currentRevisionId", "status", "title"],
    "the notes rule's own comment says an update may change the title, the body, the status and the revision pointer -- and nothing else");
});

check("POSITIVE CONTROL: the parser really reads the data layer's update fields", () => {
  const { fields, hits } = dataLayerUpdates(dataLayer, "NOTES");
  assert.ok(hits >= 2, `expected at least 2 transaction.update calls on notes, found ${hits}`);
  assert.ok(fields.has("title") && fields.has("status"), `parsed ${[...fields]}`);
});

// --- the two directions ----------------------------------------------------
for (const { name, rules, matchPath, identity, tenantKey } of COLLECTIONS) {
  const { updateAllowed, mutable } = authorisedUpdate(rules, matchPath, identity);
  const { fields: written } = dataLayerUpdates(dataLayer, tenantKey);

  if (!updateAllowed) {
    check(`${name} is create-only in the Rules, so the data layer must not update it`, () => {
      assert.deepEqual([...written], [],
        `${name} is frozen after create, but the data layer writes ${[...written]} -- that write is denied in production`);
    });
    continue;
  }

  check(`FORWARD: every field ${name}'s accepted update may change is performable`, () => {
    const unexecutable = [...mutable].filter((f) => !written.has(f));
    assert.deepEqual(unexecutable, [],
      `the accepted Rules authorise changing ${unexecutable.join(", ")} on ${name}, and no data-layer update writes it -- an accepted decision nothing can perform`);
  });

  check(`BACKWARD: every field the data layer writes to ${name} is authorised`, () => {
    const unauthorised = [...written].filter((f) => !mutable.has(f));
    assert.deepEqual(unauthorised, [],
      `the data layer writes ${unauthorised.join(", ")} to ${name}, which the accepted Rules freeze -- that write is denied in production and no pure suite would notice`);
  });
}

// --- the ASSEMBLED deployment file must authorise the SAME things -----------
//
// The extracts are what the suites run against; the assembled file is what
// would actually be pasted into the Console. A divergence between them was
// already found once by hand (four helpers using defensive `.get(field,
// default)` reads where production reads the field directly), and the parser
// above makes this particular class of divergence cheap to rule out: if the
// assembled file authorises a DIFFERENT set of mutable fields, the data layer
// is correct against the extract and wrong against the thing deployed.
{
  const assembled = read("docs/governance/phase4-6-DEPLOYMENT-candidate-2026-09-17.rules");
  for (const { name, rules, matchPath, identity } of COLLECTIONS) {
    check(`the assembled deployment file authorises exactly the same updates on ${name}`, () => {
      const fromExtract = authorisedUpdate(rules, matchPath, identity);
      const fromDeployment = authorisedUpdate(assembled, matchPath, identity);
      assert.equal(fromDeployment.updateAllowed, fromExtract.updateAllowed,
        `${name}: the extract and the deployment file disagree about whether an update is allowed at all`);
      assert.deepEqual([...fromDeployment.mutable].sort(), [...fromExtract.mutable].sort(),
        `${name}: the file that would be PASTED authorises a different set of mutable fields than the extract every suite is run against`);
    });
  }
}

// --- Phase 4 evidence: create-only BY DESIGN, and it must stay so ----------
check("Phase 4 evidence is frozen after create, in the Rules and in the writer", () => {
  const { updateAllowed } = authorisedUpdate(p4, "activity/{activityKey}/evidence/", null);
  assert.equal(updateAllowed, false,
    "ADR-008's deduplication IS the document id -- an updatable evidence row would let a retry rewrite an accepted event");
  const store = read("app/js/study-activity-evidence-store.js");
  assert.ok(!/\bupdateDoc\b|transaction\.update\(/.test(store),
    "the evidence writer must only ever create -- I4, and I6 in spirit");
});

console.log(`\n==== Rules authorisation executable: ${passed} passed, ${failed} failed ====`);
process.exit(failed === 0 ? 0 : 1);
