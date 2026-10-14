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
// Z2: zab-data.js is now wired, but ONLY through one gated mount. The static walker above cannot see a
// dynamic import(), so the gated hop is checked by name and by the guard on the same statement.
const dynamicImportersOf = (target) => fs.readdirSync(appJs).filter((f) => f.endsWith(".js")
  && new RegExp("import\\(\\s*[\"\x27\\x60]\\./" + target.replace(".", "\\.") + "[\"\x27\\x60]\\s*\\)").test(fs.readFileSync(path.join(appJs, f), "utf8")));
const staticImportersOf = (target) => fs.readdirSync(appJs).filter((f) => f.endsWith(".js") && f !== target && localImportsOf(path.join(appJs, f)).includes(target));
check("zab-data.js exists", () => assert.ok(fs.existsSync(path.join(appJs, "zab-data.js")), "app/js/zab-data.js is missing"));
check("the ONLY module importing zab-data.js is zab-bar.js (a new importer must be audited deliberately)", () => {
  assert.deepEqual(staticImportersOf("zab-data.js").concat(dynamicImportersOf("zab-data.js")), ["zab-bar.js"]);
});
check("POSITIVE CONTROL: the dynamic-import finder really does find the gated hop", () => {
  assert.deepEqual(dynamicImportersOf("zab-bar.js"), ["sw-register.js"]);
});
check("no module STATICALLY imports zab-bar.js, and no page names it", () => {
  assert.deepEqual(staticImportersOf("zab-bar.js"), []);
  for (const f of fs.readdirSync(appDir).filter((x) => x.endsWith(".html"))) assert.ok(!/zab-(bar|data)\.js/.test(fs.readFileSync(path.join(appDir, f), "utf8")), f + " names a Zab module");
});
check("the hop is guarded by isZabReady() on the same statement", () => {
  const line = fs.readFileSync(path.join(appJs, "sw-register.js"), "utf8").split("\n").find((l) => l.includes("import(\"./zab-bar.js\")"));
  assert.ok(line && /isZabReady\(\)/.test(line.split("import(")[0]), "the dynamic import is not behind isZabReady()");
});
check("zab-readiness.js ships SHUT (ready: false as a literal) and imports nothing", () => {
  const src = fs.readFileSync(path.join(appJs, "zab-readiness.js"), "utf8");
  assert.ok(/ready:\s*false,/.test(src));
  assert.ok(!/^\s*import\s/m.test(src));
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

// --- 3. Z3: pocket kinds, tasks and links -----------------------------------------
check("zabType: the pocket's ztype, otherwise plain (unknown values are plain too)", () => {
  assert.equal(zab.zabType({ ztype: "tasks" }), "tasks");
  assert.equal(zab.zabType({ ztype: "links" }), "links");
  assert.equal(zab.zabType({}), "plain");
  assert.equal(zab.zabType(undefined), "plain");
  assert.equal(zab.zabType({ ztype: "nonsense" }), "plain");
  assert.equal(zab.zabType(zab.SEED_POCKETS.find((p) => p.pocketId === "zp-links")), "links");
  assert.equal(zab.zabType(zab.SEED_POCKETS.find((p) => p.pocketId === "zp-memorise")), "plain");
});
check("parseQuickTask: ! sets priority, today/tomorrow (English and Bangla) set the due date, and the words go", () => {
  const now = new Date(2026, 9, 14, 12); // 14 Oct 2026, local
  assert.deepEqual(zab.parseQuickTask("! pay rent tomorrow", now), { pri: 1, due: "2026-10-15", text: "pay rent" });
  assert.deepEqual(zab.parseQuickTask("call Today", now), { due: "2026-10-14", text: "call" });
  assert.deepEqual(zab.parseQuickTask("আজ বাজার", now), { due: "2026-10-14", text: "বাজার" });
  assert.deepEqual(zab.parseQuickTask("বই আগামীকাল", now), { due: "2026-10-15", text: "বই" });
  assert.deepEqual(zab.parseQuickTask("!urgent thing", now), { pri: 1, text: "urgent thing" });
  assert.deepEqual(zab.parseQuickTask("plan for todayish", now), { text: "plan for todayish" }, "only the whole word counts");
  assert.deepEqual(zab.parseQuickTask("end of month", new Date(2026, 11, 31)), { text: "end of month" });
  assert.equal(zab.parseQuickTask("tomorrow", new Date(2026, 11, 31)).due, "2027-01-01", "tomorrow crosses a year");
});
check("dueGroup: Overdue, Today, Tomorrow, Later, No date -- and a ticked task is Done whatever its date", () => {
  const now = new Date(2026, 9, 14, 12);
  const g = (o) => zab.dueGroup(o, now);
  assert.equal(g({ due: "2026-10-13" }), "overdue");
  assert.equal(g({ due: "2026-10-14" }), "today");
  assert.equal(g({ due: "2026-10-15" }), "tomorrow");
  assert.equal(g({ due: "2026-10-16" }), "later");
  assert.equal(g({}), "nodate");
  assert.equal(g({ due: "not a date" }), "nodate");
  assert.equal(g({ due: "2026-10-13", done: true }), "done");
});
check("stepCount, asUrl and siteName", () => {
  assert.deepEqual(zab.stepCount([{ d: true }, { d: false }, { d: true }]), { done: 2, total: 3 });
  assert.deepEqual(zab.stepCount(undefined), { done: 0, total: 0 });
  assert.equal(zab.asUrl("https://www.example.com/a?b=1"), "https://www.example.com/a?b=1");
  assert.equal(zab.asUrl("javascript:alert(1)"), null);
  assert.equal(zab.asUrl("two words https://x.com"), null);
  assert.equal(zab.asUrl("not a link"), null);
  assert.equal(zab.siteName("https://www.example.com/a"), "example.com");
});
await acheck("a task keeps every field through a move to another pocket and back; an emptied kind field is removed", async () => {
  reset();
  await zab.addPocket(db, ctx, { name: "T", pocketId: "pt", ztype: "tasks" });
  await zab.addPocket(db, ctx, { name: "P", pocketId: "pp" });
  const { itemId } = await zab.addItem(db, ctx, "pt", { text: "x", due: "2026-10-15", pri: 1, steps: [{ id: "s1", t: "one", d: true }], url: "", tags: [] });
  const before = { ...doc_("zabItems", itemId) };
  assert.ok(!("url" in before) && !("tags" in before), "empty kind fields are not stored");
  await zab.moveItem(db, ctx, itemId, "pp");
  await zab.moveItem(db, ctx, itemId, "pt");
  const after = doc_("zabItems", itemId);
  for (const k of ["due", "pri", "steps", "text"]) assert.deepEqual(after[k], before[k], `${k} survives the moves`);
  await zab.editItem(db, ctx, itemId, { due: "", pri: undefined });
  assert.ok(!("due" in doc_("zabItems", itemId)) && !("pri" in doc_("zabItems", itemId)), "an emptied field is removed");
});
await acheck("a link item stores url, and a pocket's kind can be set and cleared", async () => {
  reset();
  const { pocketId } = await zab.addPocket(db, ctx, { name: "L", pocketId: "pl" });
  await zab.editPocket(db, ctx, "pl", { ztype: "links" });
  assert.equal(doc_("zabPockets", "pl").ztype, "links");
  await zab.editPocket(db, ctx, "pl", { ztype: "" });
  assert.ok(!("ztype" in doc_("zabPockets", "pl")), "plain = no ztype stored");
  assert.equal((await zab.editPocket(db, ctx, "pl", { ztype: "bogus" })).refused, "bad-ztype");
  const { itemId } = await zab.addItem(db, ctx, "pl", { text: "https://example.com", url: "https://example.com" });
  assert.equal(doc_("zabItems", itemId).url, "https://example.com");
  assert.equal(pocketId, "pl");
});

// ---- Z4: ideas and shopping
check("nextStars: tapping sets, the same star clears (null), out-of-range is null", () => {
  assert.equal(zab.nextStars(undefined, 2), 2);
  assert.equal(zab.nextStars(2, 2), null);
  assert.equal(zab.nextStars(2, 3), 3);
  assert.equal(zab.nextStars(1, 0), null);
  assert.equal(zab.nextStars(1, 4), null);
});
check("sortByStars: high first, unstarred last, ties in pocket order", () => {
  const out = zab.sortByStars([{ itemId: "a", order: 0 }, { itemId: "b", order: 1, stars: 1 }, { itemId: "c", order: 2, stars: 3 }, { itemId: "d", order: 3, stars: 3 }]);
  assert.deepEqual(out.map((x) => x.itemId), ["c", "d", "b", "a"]);
});
check("addTopic / removeTopic: trimmed, no duplicates, empty ignored", () => {
  assert.deepEqual(zab.addTopic([], "  Fiqh "), ["Fiqh"]);
  assert.deepEqual(zab.addTopic(["Fiqh"], "fiqh"), ["Fiqh"]);
  assert.deepEqual(zab.addTopic(["Fiqh"], "  "), ["Fiqh"]);
  assert.deepEqual(zab.removeTopic(["Fiqh", "Tajweed"], "Fiqh"), ["Tajweed"]);
});
check("parseQuickShop: qty, text and shop; the shop runs to the end and may contain spaces", () => {
  assert.deepEqual(zab.parseQuickShop("2 milk @Coles"), { qty: "2", text: "milk", shop: "Coles" });
  assert.deepEqual(zab.parseQuickShop("1 rice @Big W"), { qty: "1", text: "rice", shop: "Big W" });
  assert.deepEqual(zab.parseQuickShop("salt"), { text: "salt" });
  assert.deepEqual(zab.parseQuickShop("milk @"), { text: "milk" });
  assert.deepEqual(zab.parseQuickShop("3"), { text: "3" });
  assert.deepEqual(zab.parseQuickShop("a@b.com"), { text: "a@b.com" });
});
check("shopGroups: shops A-Z, No shop, then Done last", () => {
  const g = zab.shopGroups([
    { itemId: "1", order: 0, shop: "Coles" }, { itemId: "2", order: 1 }, { itemId: "3", order: 2, shop: "Aldi" },
    { itemId: "4", order: 3, shop: "Aldi", done: true }, { itemId: "5", order: 4, shop: "Coles" },
  ]);
  assert.deepEqual(g.map((x) => x.key), ["Aldi", "Coles", "", "\u0000done"]);
  assert.deepEqual(g[1].items.map((x) => x.itemId), ["1", "5"]);
  assert.equal(g[3].done, true);
});
await acheck("an ideas/shop item stores stars, topics, qty and shop; empties are removed; fields survive a move", async () => {
  reset();
  await zab.addPocket(db, ctx, { name: "S", pocketId: "ps", ztype: "shop" });
  await zab.addPocket(db, ctx, { name: "P", pocketId: "pp2" });
  const { itemId } = await zab.addItem(db, ctx, "ps", { text: "milk", qty: "2", shop: "Coles", stars: 2, topics: ["a"] });
  await zab.editItem(db, ctx, itemId, { stars: null, topics: [] });
  const d = doc_("zabItems", itemId);
  assert.ok(!("stars" in d) && !("topics" in d), "emptied fields removed");
  await zab.moveItem(db, ctx, itemId, "pp2");
  await zab.moveItem(db, ctx, itemId, "ps");
  assert.equal(doc_("zabItems", itemId).qty, "2");
  assert.equal(doc_("zabItems", itemId).shop, "Coles");
  assert.equal((await zab.addPocket(db, ctx, { name: "I", ztype: "ideas" })).ok, true);
  assert.equal((await zab.addPocket(db, ctx, { name: "I", ztype: "shop" })).ok, true);
});

console.log(`\n==== zab-data: ${passed} passed, ${failed} failed ====`);
process.exit(failed === 0 ? 0 : 1);
