// PCF J25, Builder round Z1 -- the family Zab's saving layer (app/js/zab-data.js).
//
// Two halves, both Firebase-free (imports are replaced in memory; no network
// or database is contacted):
//   1. REACHABILITY: no page reaches zab-data.js by any chain of any length
//      ("this changes nothing" is a claim about WIRING, which no function-level
//      test can see). Carries a positive control.
//   2. BEHAVIOUR against an in-memory store that, unlike the browser stub,
//      really mutates: every write stamps updatedAt; trash and restore; the
//      seed runs once only; a move into a descendant is refused; editItem
//      drops empty kind fields; a failed write reaches the user (I15).
// Run from the repository root.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
const appDir = path.join(root, "app");
const appJs = path.join(appDir, "js");

let passed = 0, failed = 0;
const pending = [];
function check(name, fn) {
  // The runner refuses a promise it did not await by name: use acheck() for async bodies.
  try {
    const result = fn();
    if (result && typeof result.then === "function") throw new TypeError("check() is synchronous; use acheck() for an async body.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}
async function acheck(name, fn) {
  try { await fn(); passed++; console.log(`  PASS  ${name}`); }
  catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

// --- 1. REACHABILITY --------------------------------------------------------
function localImportsOf(file) {
  const text = fs.readFileSync(file, "utf8");
  return [
    ...[...text.matchAll(/from\s*["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]),
    ...[...text.matchAll(/import\s*["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]),
  ];
}
function entryModulesOf(htmlPath) {
  return [...fs.readFileSync(htmlPath, "utf8").matchAll(/["'`](?:\.\/)?js\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]);
}
function chainsToTarget(target) {
  const found = [];
  for (const entry of fs.readdirSync(appDir)) {
    if (!entry.endsWith(".html")) continue;
    const seen = new Set();
    const queue = entryModulesOf(path.join(appDir, entry)).map((m) => [m]);
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

check("POSITIVE CONTROL: the reachability walker really does find a wired module", () => {
  const control = chainsToTarget("records.js");
  assert.ok(control.length > 0, "the walker found no page importing records.js -- it is not working");
});
check("zab-data.js exists and is reachable from NO app/*.html page, by any chain of any length", () => {
  assert.ok(fs.existsSync(path.join(appJs, "zab-data.js")), "app/js/zab-data.js is missing");
  assert.deepEqual(chainsToTarget("zab-data.js"), []);
});
check("no other app module imports zab-data.js (a new importer must be audited deliberately)", () => {
  const importers = fs.readdirSync(appJs).filter((f) => f.endsWith(".js") && f !== "zab-data.js"
    && localImportsOf(path.join(appJs, f)).includes("zab-data.js"));
  assert.deepEqual(importers, []);
});

// --- 2. BEHAVIOUR -----------------------------------------------------------
const store = new Map();     // "collection/docId" -> data (a real, mutating fake)
const failures = [];         // what safeWrite reported
let failNext = false;
let idCounter = 0;
const NOW = () => new Date("2026-10-14T10:00:00Z");
const DEL = { __deleteField: true };
const TS = { __ts: true };

const apply = (key, patch) => {
  const cur = { ...(store.get(key) || {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v && v.__deleteField) delete cur[k];
    else cur[k] = v && v.__ts ? NOW() : v;
  }
  store.set(key, cur);
};
const writeLog = [];
const fakeEnvelope = {
  createDocument: async (_db, col, id, data, uid) => {
    if (failNext) { failNext = false; throw Object.assign(new Error("denied"), { code: "permission-denied" }); }
    if (!uid) throw new Error("no uid");
    writeLog.push({ kind: "create", col, id, data });
    apply(`${col}/${id}`, { ...data, schemaVersion: 1, createdAt: NOW(), updatedAt: NOW(), createdBy: uid });
  },
  updateDocument: async (_db, col, id, data) => {
    if (failNext) { failNext = false; throw Object.assign(new Error("denied"), { code: "permission-denied" }); }
    writeLog.push({ kind: "update", col, id, data });
    apply(`${col}/${id}`, { ...data, updatedAt: NOW() });
  },
  commitEnvelopeBatch: async (_db, { creates = [], updates = [] }, uid) => {
    for (const c of creates) {
      writeLog.push({ kind: "create", col: c.collectionName, id: c.docId, data: c.data });
      apply(`${c.collectionName}/${c.docId}`, { ...c.data, schemaVersion: 1, createdAt: NOW(), updatedAt: NOW(), createdBy: uid });
    }
    for (const u of updates) {
      writeLog.push({ kind: "update", col: u.collectionName, id: u.docId, data: u.data });
      apply(`${u.collectionName}/${u.docId}`, { ...u.data, updatedAt: NOW() });
    }
  },
};
globalThis.__zabFirestore = {
  collection: (_db, name) => ({ __col: name }),
  doc: (colRef) => ({ id: `gen${++idCounter}`, __col: colRef.__col }),
  where: (field, op, value) => ({ field, op, value }),
  query: (colRef, ...clauses) => ({ __col: colRef.__col, clauses }),
  getDocs: async (q) => ({
    docs: [...store.entries()]
      .filter(([k]) => k.startsWith(`${q.__col}/`))
      .filter(([, v]) => q.clauses.every((c) => v[c.field] === c.value))
      .map(([k, v]) => ({ id: k.slice(q.__col.length + 1), data: () => v })),
  }),
  deleteField: () => DEL,
  serverTimestamp: () => TS,
};
globalThis.__zabEnvelope = fakeEnvelope;
globalThis.__zabErrors = { safeWrite: async (fn, context) => {
  try { return { ok: true, result: await fn() }; }
  catch (error) { const entry = { code: error.code, context }; failures.push(entry); return { ok: false, entry }; }
} };
globalThis.__zabCollections = { TENANT: { ZAB_POCKETS: "zabPockets", ZAB_ITEMS: "zabItems" } };

// The REAL collections.js must name the two collections the way the fake does.
const collectionsSrc = fs.readFileSync(path.join(appJs, "collections.js"), "utf8");
check("collections.js names zabPockets and zabItems", () => {
  assert.match(collectionsSrc, /ZAB_POCKETS:\s*"zabPockets"/);
  assert.match(collectionsSrc, /ZAB_ITEMS:\s*"zabItems"/);
});

let source = fs.readFileSync(path.join(appJs, "zab-data.js"), "utf8");
const before = source;
source = source
  .replace(/import \{[^}]*\} from "https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/,
    "const { collection, query, where, getDocs, doc, deleteField, serverTimestamp } = globalThis.__zabFirestore;")
  .replace(/import \{ TENANT \} from "\.\/collections\.js";/, "const { TENANT } = globalThis.__zabCollections;")
  .replace(/import \{ createDocument, updateDocument, commitEnvelopeBatch \} from "\.\/envelope\.js";/,
    "const { createDocument, updateDocument, commitEnvelopeBatch } = globalThis.__zabEnvelope;")
  .replace(/import \{ safeWrite \} from "\.\/errors\.js";/, "const { safeWrite } = globalThis.__zabErrors;");
check("every import of zab-data.js was replaced (the module under test is the real one)", () => {
  assert.notEqual(source, before);
  assert.ok(!/^import /m.test(source), "an import survived the in-memory replacement");
});
const zab = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const T = "t1";
const ctx = { tenantId: T, personId: "p1", uid: "uid-p1" };
const db = {};
const reset = () => { store.clear(); writeLog.length = 0; failures.length = 0; failNext = false; };
const doc_ = (col, id) => store.get(`${col}/${T}__${id}`);

await acheck("seedPockets seeds the four study pockets with fixed ids, names {en,bn}, Links as ztype links", async () => {
  reset();
  const r = await zab.seedPockets(db, ctx);
  assert.deepEqual(r, { ok: true, seeded: true });
  for (const id of ["zp-memorise", "zp-revise", "zp-questions", "zp-links"]) {
    const p = doc_("zabPockets", id);
    assert.ok(p, id);
    assert.ok(p.names.en && p.names.bn);
    assert.equal(p.tenantId, T); assert.equal(p.pocketId, id); assert.equal(p.addedByPersonId, "p1"); assert.equal(p.status, "active");
    assert.equal(typeof p.order, "number");
  }
  assert.equal(doc_("zabPockets", "zp-links").ztype, "links");
  assert.equal(doc_("zabPockets", "zp-memorise").ztype, undefined);
  assert.equal(doc_("zabPockets", "zp-memorise").names.en, "To memorise");
});
await acheck("the seed runs ONCE only: a second call writes nothing; a tenant with any pocket (even trashed) is not seeded", async () => {
  const n = writeLog.length;
  assert.deepEqual(await zab.seedPockets(db, ctx), { ok: true, seeded: false });
  assert.equal(writeLog.length, n);
  reset();
  await zab.addPocket(db, ctx, { name: "Mine", pocketId: "own" });
  await zab.trashPocket(db, ctx, "own");
  const before = writeLog.length;
  assert.equal((await zab.seedPockets(db, ctx)).seeded, false);
  assert.equal(writeLog.length, before);
});
await acheck("a different tenant is seeded independently", async () => {
  reset();
  await zab.seedPockets(db, ctx);
  const r = await zab.seedPockets(db, { ...ctx, tenantId: "t2" });
  assert.equal(r.seeded, true);
  assert.ok(store.get("zabPockets/t2__zp-links"));
});

await acheck("rename writes `name` and REMOVES `names` (I11)", async () => {
  reset(); await zab.seedPockets(db, ctx);
  await zab.editPocket(db, ctx, "zp-memorise", { name: "  Hifz  " });
  const p = doc_("zabPockets", "zp-memorise");
  assert.equal(p.name, "Hifz"); assert.equal(p.names, undefined);
  assert.deepEqual(await zab.editPocket(db, ctx, "zp-revise", { name: "  " }), { ok: false, refused: "name-required" });
});
await acheck("a restyle (icon/colour) keeps `names`; an invalid ztype is refused", async () => {
  reset(); await zab.seedPockets(db, ctx);
  await zab.editPocket(db, ctx, "zp-revise", { icon: "⭐" });
  assert.ok(doc_("zabPockets", "zp-revise").names);
  assert.equal((await zab.editPocket(db, ctx, "zp-revise", { ztype: "kind" })).refused, "bad-ztype");
  assert.equal((await zab.addPocket(db, ctx, { name: "x", ztype: "kind" })).refused, "bad-ztype");
});

await acheck("movePocket refuses a move into itself and into its own descendant, allows a legal move and a move to the top", async () => {
  reset();
  await zab.addPocket(db, ctx, { name: "A", pocketId: "a" });
  await zab.addPocket(db, ctx, { name: "B", pocketId: "b", parentId: "a" });
  await zab.addPocket(db, ctx, { name: "C", pocketId: "c", parentId: "b" });
  await zab.addPocket(db, ctx, { name: "D", pocketId: "d" });
  const n = writeLog.length;
  assert.equal((await zab.movePocket(db, ctx, "a", "a")).refused, "into-itself-or-descendant");
  assert.equal((await zab.movePocket(db, ctx, "a", "c")).refused, "into-itself-or-descendant");
  assert.equal((await zab.movePocket(db, ctx, "b", "c")).refused, "into-itself-or-descendant");
  assert.equal(writeLog.length, n, "a refused move must write nothing");
  assert.deepEqual(await zab.movePocket(db, ctx, "c", "d"), { ok: true });
  assert.equal(doc_("zabPockets", "c").parentId, "d");
  assert.deepEqual(await zab.movePocket(db, ctx, "c", null), { ok: true });
  assert.equal(doc_("zabPockets", "c").parentId, undefined);
});
check("isSelfOrDescendant survives a corrupt parent cycle (no endless loop)", () => {
  const cyc = [{ pocketId: "x", parentId: "y" }, { pocketId: "y", parentId: "x" }];
  assert.equal(zab.isSelfOrDescendant(cyc, "z", "x"), false);
});

await acheck("trashPocket is refused while it holds an active item or an active pocket; allowed once empty; restore reverses it", async () => {
  reset();
  await zab.addPocket(db, ctx, { name: "P", pocketId: "p" });
  await zab.addPocket(db, ctx, { name: "Kid", pocketId: "kid", parentId: "p" });
  assert.equal((await zab.trashPocket(db, ctx, "p")).refused, "not-empty");
  await zab.trashPocket(db, ctx, "kid");
  const { itemId } = await zab.addItem(db, ctx, "p", { text: "one" });
  assert.equal((await zab.trashPocket(db, ctx, "p")).refused, "not-empty");
  await zab.trashItem(db, ctx, itemId);
  assert.deepEqual(await zab.trashPocket(db, ctx, "p"), { ok: true });
  const t = doc_("zabPockets", "p");
  assert.equal(t.status, "trashed"); assert.ok(t.deletedAt instanceof Date);
  assert.deepEqual((await zab.listPockets(db, T)).map((x) => x.pocketId), []);
  assert.equal((await zab.listPockets(db, T, { includeTrashed: true })).length, 2);
  await zab.restorePocket(db, ctx, "p");
  const r = doc_("zabPockets", "p");
  assert.equal(r.status, "active"); assert.equal(r.deletedAt, undefined);
});

await acheck("addItem stores only non-empty kind fields; copies arrays; requires text", async () => {
  reset();
  const steps = [{ id: "s1", t: "a", d: false }];
  const { itemId } = await zab.addItem(db, ctx, "pk", { text: " Learn 2:255 ", tags: [], url: "", due: "2026-10-20", pri: 2, steps, bogus: "x", stars: undefined });
  const it = doc_("zabItems", itemId);
  assert.equal(it.text, "Learn 2:255"); assert.equal(it.done, false); assert.equal(it.status, "active"); assert.equal(it.pocketId, "pk");
  assert.equal(it.addedByPersonId, "p1");
  assert.ok(!("tags" in it) && !("url" in it) && !("bogus" in it) && !("stars" in it));
  assert.equal(it.due, "2026-10-20"); assert.equal(it.pri, 2);
  assert.notEqual(it.steps, steps, "the array must be a copy");
  steps[0].t = "changed";
  assert.equal(it.steps[0].t, "a", "the stored steps must not alias the caller's objects");
  assert.equal((await zab.addItem(db, ctx, "pk", { text: "  " })).refused, "text-required");
});
await acheck("editItem: allow-listed fields only, arrays copied, EMPTY kind fields removed (deleteField), done/status untouched", async () => {
  reset();
  const { itemId } = await zab.addItem(db, ctx, "pk", { text: "t", url: "https://x", tags: ["a"], stars: 2, qty: 3 });
  const tags = ["b", "c"];
  await zab.editItem(db, ctx, itemId, { url: "", tags, stars: null, status: "trashed", done: true, pocketId: "evil", tenantId: "t9", addedByPersonId: "z", text: "t2" });
  const it = doc_("zabItems", itemId);
  assert.ok(!("url" in it) && !("stars" in it), "empty kind fields are removed, not stored");
  assert.deepEqual(it.tags, ["b", "c"]); assert.notEqual(it.tags, tags);
  assert.equal(it.text, "t2"); assert.equal(it.qty, 3);
  assert.equal(it.status, "active"); assert.equal(it.done, false); assert.equal(it.pocketId, "pk");
  assert.equal(it.tenantId, T); assert.equal(it.addedByPersonId, "p1");
  const last = writeLog[writeLog.length - 1].data;
  assert.deepEqual(Object.keys(last).sort(), ["stars", "tags", "text", "url"], "the update carries exactly the named allow-listed fields");
  assert.equal((await zab.editItem(db, ctx, itemId, { text: "" })).refused, "text-required");
});
await acheck("toggleDone, moveItem, trashItem, restoreItem", async () => {
  reset();
  const { itemId } = await zab.addItem(db, ctx, "pk", { text: "t" });
  await zab.toggleDone(db, ctx, itemId, true); assert.equal(doc_("zabItems", itemId).done, true);
  await zab.toggleDone(db, ctx, itemId, false); assert.equal(doc_("zabItems", itemId).done, false);
  await zab.moveItem(db, ctx, itemId, "pk2"); assert.equal(doc_("zabItems", itemId).pocketId, "pk2");
  await zab.trashItem(db, ctx, itemId);
  const t = doc_("zabItems", itemId);
  assert.equal(t.status, "trashed"); assert.ok(t.deletedAt instanceof Date);
  assert.deepEqual(await zab.listItems(db, T, "pk2"), []);
  await zab.restoreItem(db, ctx, itemId);
  const r = doc_("zabItems", itemId);
  assert.equal(r.status, "active"); assert.equal(r.deletedAt, undefined);
  assert.equal((await zab.listItems(db, T, "pk2")).length, 1);
});
await acheck("clearDone trashes ONLY the ticked active items of that pocket and deletes nothing", async () => {
  reset();
  const a = (await zab.addItem(db, ctx, "pk", { text: "a" })).itemId;
  const b = (await zab.addItem(db, ctx, "pk", { text: "b" })).itemId;
  const c = (await zab.addItem(db, ctx, "other", { text: "c" })).itemId;
  await zab.toggleDone(db, ctx, a, true); await zab.toggleDone(db, ctx, c, true);
  const r = await zab.clearDone(db, ctx, "pk");
  assert.deepEqual(r, { ok: true, cleared: 1 });
  assert.equal(doc_("zabItems", a).status, "trashed"); assert.equal(doc_("zabItems", b).status, "active"); assert.equal(doc_("zabItems", c).status, "active");
  assert.equal([...store.keys()].filter((k) => k.startsWith("zabItems/")).length, 3, "nothing is ever deleted");
});

await acheck("EVERY write API call stamps updatedAt (and create stamps createdAt/createdBy/schemaVersion)", async () => {
  reset();
  const calls = [];
  const note = (name, p) => calls.push([name, p]);
  await zab.seedPockets(db, ctx);
  const pk = (await zab.addPocket(db, ctx, { name: "X", pocketId: "x" })).pocketId;
  const it = (await zab.addItem(db, ctx, pk, { text: "t" })).itemId;
  const ops = [
    ["addPocket", () => zab.addPocket(db, ctx, { name: "Y", pocketId: "y" })],
    ["editPocket", () => zab.editPocket(db, ctx, pk, { icon: "i" })],
    ["movePocket", () => zab.movePocket(db, ctx, "y", pk)],
    ["trashPocket", () => zab.trashPocket(db, ctx, "y")],
    ["restorePocket", () => zab.restorePocket(db, ctx, "y")],
    ["addItem", () => zab.addItem(db, ctx, pk, { text: "u", itemId: "u" })],
    ["editItem", () => zab.editItem(db, ctx, it, { text: "t3" })],
    ["toggleDone", () => zab.toggleDone(db, ctx, it, true)],
    ["moveItem", () => zab.moveItem(db, ctx, it, "x")],
    ["trashItem", () => zab.trashItem(db, ctx, "u")],
    ["restoreItem", () => zab.restoreItem(db, ctx, "u")],
    ["clearDone", () => zab.clearDone(db, ctx, pk)],
  ];
  for (const [name, op] of ops) {
    const from = writeLog.length;
    const r = await op();
    assert.equal(r.ok, true, `${name} did not succeed: ${JSON.stringify(r)}`);
    const wrote = writeLog.slice(from);
    assert.ok(wrote.length > 0, `${name} wrote nothing`);
    for (const w of wrote) {
      const d = store.get(`${w.col}/${w.id}`);
      assert.ok(d.updatedAt instanceof Date, `${name}: updatedAt not stamped on ${w.col}/${w.id}`);
      if (w.kind === "create") for (const f of ["schemaVersion", "createdAt", "createdBy"]) assert.ok(d[f] !== undefined, `${name}: ${f} missing`);
    }
    note(name, true);
  }
  assert.equal(calls.length, 12);
});
await acheck("trash and restore both move updatedAt (a stale updatedAt would hide the change from a sync)", async () => {
  reset();
  const { itemId } = await zab.addItem(db, ctx, "pk", { text: "t" });
  store.get(`zabItems/${T}__${itemId}`).updatedAt = new Date(0);
  await zab.trashItem(db, ctx, itemId);
  assert.ok(doc_("zabItems", itemId).updatedAt.getTime() > 0);
  store.get(`zabItems/${T}__${itemId}`).updatedAt = new Date(0);
  await zab.restoreItem(db, ctx, itemId);
  assert.ok(doc_("zabItems", itemId).updatedAt.getTime() > 0);
});

await acheck("I15: a failed write reaches the user (safeWrite) and is reported as not ok -- never swallowed", async () => {
  reset();
  failNext = true;
  const r = await zab.addPocket(db, ctx, { name: "Z" });
  assert.equal(r.ok, false); assert.ok(r.entry);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].code, "permission-denied");
  assert.equal(failures[0].context.action, "add Zab pocket");
});
await acheck("a missing identity is refused loudly, not written", async () => {
  reset();
  await assert.rejects(() => zab.addPocket(db, { tenantId: T, personId: "p1" }, { name: "n" }), /ctx must carry/);
  assert.equal(writeLog.length, 0);
});

check("step helpers return new arrays and never mutate the input", () => {
  const s0 = [{ id: "a", t: "one", d: false }];
  const s1 = zab.addStep(s0, " two ");
  assert.equal(s0.length, 1); assert.equal(s1.length, 2); assert.equal(s1[1].t, "two"); assert.equal(s1[1].d, false); assert.ok(s1[1].id);
  assert.equal(zab.addStep(s0, "  ").length, 1);
  const s2 = zab.toggleStep(s1, "a"); assert.equal(s2[0].d, true); assert.equal(s0[0].d, false); assert.equal(s1[0].d, false);
  const s3 = zab.editStep(s2, "a", "uno"); assert.equal(s3[0].t, "uno"); assert.equal(s2[0].t, "one");
  const s4 = zab.removeStep(s3, "a"); assert.equal(s4.length, 1); assert.equal(s3.length, 2);
});

await acheck("the fields the module writes are exactly inside its declared write lists (what the Rules candidate is judged against)", async () => {
  const pocketAllowed = new Set(zab.ZAB_POCKET_WRITES), itemAllowed = new Set(zab.ZAB_ITEM_WRITES);
  const env = new Set(["schemaVersion", "createdAt", "updatedAt", "createdBy"]);
  const strays = [];
  reset();
  await zab.seedPockets(db, ctx);
  await zab.addPocket(db, ctx, { name: "N", pocketId: "n", parentId: "zp-links", ztype: "tasks", icon: "i", color: "#fff", order: 1 });
  await zab.trashPocket(db, ctx, "n"); await zab.restorePocket(db, ctx, "n");
  const everyKind = { text: "t", folderIds: ["f"], tags: ["a"], kind: "k", journal: "j", url: "u", ttl: "t", ch: "c", th: "h", people: ["p"], issues: ["i"], due: "2026-10-14", pri: 1, steps: [{ id: "s", t: "x", d: false }], stars: 3, topics: ["z"], qty: 2, shop: "s" };
  const { itemId } = await zab.addItem(db, ctx, "n", everyKind);
  await zab.editItem(db, ctx, itemId, everyKind);
  await zab.trashItem(db, ctx, itemId); await zab.restoreItem(db, ctx, itemId);
  assert.deepEqual(Object.keys(doc_("zabItems", itemId)).filter((k) => !env.has(k)).sort(),
    [...zab.ZAB_ITEM_WRITES].filter((k) => k !== "deletedAt").sort(), "every declared item field was exercised");
  for (const w of writeLog) {
    const allowed = w.col === "zabPockets" ? pocketAllowed : itemAllowed;
    for (const k of Object.keys(w.data)) if (!allowed.has(k) && !env.has(k)) strays.push(`${w.col}.${k}`);
  }
  assert.deepEqual(strays, []);
  assert.ok(writeLog.length >= 10, "the control must have exercised the writers");
});

console.log(`\n==== zab-data: ${passed} passed, ${failed} failed ====`);
process.exit(failed === 0 ? 0 : 1);
