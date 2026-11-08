// PCF MSA J104, round R6 (9 Nov 2026) -- the Dua saving layer, app/js/dua-saving-data.js.
// Firebase-free: the imports are replaced in memory, nothing contacts a network or a database. Three halves:
//   1. NOT WIRED: no page reaches the module by any chain (R6 builds the writers; the screens follow), with a positive control.
//   2. BEHAVIOUR against an in-memory store that really mutates: the right ids, every envelope field, a clear writes the map
//      WITHOUT the key and never deletes, hide is hidden:true, a share is append-only with an auto id, refusals read nothing and
//      write nothing, a failed write reaches the user (I15), a plan costs one read.
//   3. SHAPE vs THE PUBLISHED RULES: every document the writers create has exactly the keys the published block allows and
//      requires (hasOnly / hasAll parsed out of firestore.rules), so a create the Rules would refuse fails here.
// Run from the repository root.   --mutate=clearwrites  a cleared mark is written back as null  -> the clear check fails
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const appDir = path.join(root, "app"), appJs = path.join(appDir, "js");
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
let passed = 0, failed = 0;
const check = (name, fn) => { try { const r = fn(); if (r && typeof r.then === "function") throw new TypeError("sync check given a promise"); passed++; console.log(`  PASS  ${name}`); } catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); } };
const acheck = async (name, fn) => { try { await fn(); passed++; console.log(`  PASS  ${name}`); } catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); } };

// --- 1. NOT WIRED ---
const localImportsOf = (file) => [...fs.readFileSync(file, "utf8").matchAll(/(?:from\s*|import\s*\(?\s*)["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]);
const entryModulesOf = (html) => [...fs.readFileSync(html, "utf8").matchAll(/["'`](?:\.\/)?js\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]);
function chainsToTarget(target) {
  const found = [];
  for (const entry of fs.readdirSync(appDir).filter((x) => x.endsWith(".html"))) {
    const seen = new Set(); const queue = entryModulesOf(path.join(appDir, entry)).map((m) => [m]);
    while (queue.length) {
      const chain = queue.shift(), head = chain[chain.length - 1];
      if (seen.has(head)) continue; seen.add(head);
      if (head === target) { found.push(`app/${entry} -> ${chain.join(" -> ")}`); break; }
      const full = path.join(appJs, head);
      if (fs.existsSync(full)) for (const n of localImportsOf(full)) queue.push([...chain, n]);
    }
  }
  return found;
}
check("POSITIVE CONTROL: the reachability walker finds a wired module (records.js)", () => assert.ok(chainsToTarget("records.js").length > 0));
check("dua-saving-data.js is reachable from NO page yet (R6 builds the writers; the screens follow, one PR each)", () => assert.deepEqual(chainsToTarget("dua-saving-data.js"), []));
check("no other app module imports it", () => assert.deepEqual(fs.readdirSync(appJs).filter((f) => f.endsWith(".js") && localImportsOf(path.join(appJs, f)).includes("dua-saving-data.js")), []));

// --- 2. BEHAVIOUR ---
const store = new Map(), failures = [], reads = [], writeLog = [];
let failNext = false, autoN = 0;
const NOW = new Date("2026-11-09T01:00:00Z"), TS = { __ts: true };
const apply = (key, patch) => { const cur = { ...(store.get(key) || {}) }; for (const [k, v] of Object.entries(patch)) cur[k] = v && v.__ts ? NOW : v; store.set(key, cur); };
const fail = () => Object.assign(new Error("denied"), { code: "permission-denied" });
globalThis.__dsFirestore = {
  doc: (a, b, id) => (b === undefined ? { __col: a.__col, __id: `auto${++autoN}`, id: `auto${autoN}` } : { __col: b, __id: id }),
  collection: (_db, col) => ({ __col: col }),
  query: (c, w) => ({ ...c, __where: w }),
  where: (f, op, v) => ({ f, op, v }),
  getDoc: async (ref) => { reads.push(`${ref.__col}/${ref.__id}`); const v = store.get(`${ref.__col}/${ref.__id}`); return { exists: () => v !== undefined, data: () => v }; },
  getDocs: async (q) => { reads.push(`list ${q.__col}`); const docs = [...store].filter(([k, v]) => k.startsWith(q.__col + "/") && v[q.__where.f] === q.__where.v).map(([k, v]) => ({ id: k.split("/")[1], data: () => v })); return { docs }; },
};
globalThis.__dsEnvelope = {
  createDocument: async (_db, col, id, data, uid) => { if (failNext) { failNext = false; throw fail(); } if (!uid) throw new Error("no uid"); writeLog.push({ kind: "create", col, id, data }); apply(`${col}/${id}`, { ...data, schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: uid }); },
  updateDocument: async (_db, col, id, data) => { if (failNext) { failNext = false; throw fail(); } writeLog.push({ kind: "update", col, id, data }); apply(`${col}/${id}`, { ...data, updatedAt: TS }); },
};
globalThis.__dsErrors = { safeWrite: async (fn, context) => { try { await fn(); return { ok: true }; } catch (error) { const entry = { code: error.code, context }; failures.push(entry); return { ok: false, entry }; } } };
globalThis.__dsCollections = { TENANT: { DUA_PLANS: "duaPlans", DUA_EDITS: "duaEdits", DUA_SHARES: "duaShares" } };
const collectionsSrc = fs.readFileSync(path.join(appJs, "collections.js"), "utf8");
check("collections.js names the three Dua collections", () => { for (const c of ["duaPlans", "duaEdits", "duaShares"]) assert.match(collectionsSrc, new RegExp(`"${c}"`)); });

let source = fs.readFileSync(path.join(appJs, "dua-saving-data.js"), "utf8");
const before = source;
source = source
  .replace(/import \{[^}]*\} from "https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/, "const { doc, getDoc, collection, query, where, getDocs } = globalThis.__dsFirestore;")
  .replace(/import \{ TENANT \} from "\.\/collections\.js";/, "const { TENANT } = globalThis.__dsCollections;")
  .replace(/import \{ createDocument, updateDocument \} from "\.\/envelope\.js";/, "const { createDocument, updateDocument } = globalThis.__dsEnvelope;")
  .replace(/import \{ safeWrite \} from "\.\/errors\.js";/, "const { safeWrite } = globalThis.__dsErrors;");
if (MUTATE === "clearwrites") { const a = "if (mark === null) delete marks[duaKey]; else marks[duaKey] = mark;"; assert.ok(source.includes(a)); source = source.replace(a, "marks[duaKey] = mark;"); }
check("every import was replaced (the module under test is the real one)", () => { assert.notEqual(source, before); assert.ok(!/^import /m.test(source)); });
const m = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const T = "t1", ctx = { tenantId: T, personId: "p1", uid: "uid-p1" }, db = {};
const reset = () => { store.clear(); writeLog.length = 0; failures.length = 0; reads.length = 0; failNext = false; };
const plan = (p = "p1") => store.get(`duaPlans/${T}__${p}`);

await acheck("the first mark CREATES the plan: right id, marks, an empty important list, every envelope field", async () => {
  reset();
  const r = await m.setDuaMark(db, ctx, { duaKey: "123", mark: "today" });
  assert.deepEqual(r, { ok: true, marks: { 123: "today" } });
  const d = plan(); assert.ok(d, "no document at duaPlans/t1__p1");
  assert.equal(d.tenantId, T); assert.equal(d.personId, "p1"); assert.deepEqual(d.marks, { 123: "today" }); assert.deepEqual(d.important, []);
  assert.equal(d.schemaVersion, 1); assert.equal(d.createdBy, "uid-p1"); assert.ok(d.createdAt && d.updatedAt);
  assert.equal(writeLog.length, 1); assert.equal(writeLog[0].kind, "create");
});
await acheck("a second mark UPDATES (marks only), a teacher can mark for a student, a plan costs ONE read", async () => {
  reads.length = 0;
  await m.setDuaMark(db, ctx, { duaKey: "7", mark: "urgent" });
  assert.deepEqual(plan().marks, { 123: "today", 7: "urgent" });
  assert.equal(writeLog.at(-1).kind, "update"); assert.deepEqual(Object.keys(writeLog.at(-1).data), ["marks"]);
  assert.equal(reads.length, 1, `reads: ${reads}`);
  const t = { tenantId: T, personId: "teacher1", uid: "uid-t" };
  await m.setDuaMark(db, t, { personId: "p9", duaKey: "5", mark: "next" });
  assert.equal(plan("p9").personId, "p9"); assert.equal(plan("p9").createdBy, "uid-t");
});
await acheck("clearing a mark writes the map WITHOUT the key; the document stays (never deleted, I4/D6)", async () => {
  const r = await m.setDuaMark(db, ctx, { duaKey: "123", mark: null });
  assert.deepEqual(r.marks, { 7: "urgent" });
  assert.ok(!("123" in plan().marks), "the cleared key is still in the map"); assert.ok(plan(), "the document is gone");
  assert.equal(writeLog.at(-1).kind, "update");
});
await acheck("clearing a mark when nothing is marked creates NO document", async () => {
  reset(); const r = await m.setDuaMark(db, ctx, { duaKey: "1", mark: null });
  assert.equal(r.ok, true); assert.equal(writeLog.length, 0); assert.equal(store.size, 0);
});
await acheck("★ Important switches on and off, never duplicates, and the plan keeps its marks", async () => {
  reset(); await m.setDuaMark(db, ctx, { duaKey: "9", mark: "revising" });
  assert.deepEqual((await m.setDuaImportant(db, ctx, { duaKey: "9", on: true })).important, ["9"]);
  assert.deepEqual((await m.setDuaImportant(db, ctx, { duaKey: "9", on: true })).important, ["9"]);
  assert.deepEqual((await m.setDuaImportant(db, ctx, { duaKey: "9", on: false })).important, []);
  assert.deepEqual(plan().marks, { 9: "revising" });
  reset(); assert.deepEqual((await m.setDuaImportant(db, ctx, { duaKey: "9", on: true })).important, ["9"]); assert.deepEqual(plan().marks, {});
});
await acheck("a request the Rules vocabulary does not know is REFUSED and reads and writes nothing", async () => {
  reset();
  for (const bad of [{ duaKey: "123", mark: "great" }, { duaKey: "abc", mark: "today" }, { duaKey: "", mark: "today" }, { personId: "a__b", duaKey: "1", mark: "today" }])
    assert.equal((await m.setDuaMark(db, ctx, bad)).ok, false);
  assert.equal(writeLog.length + reads.length, 0);
  await assert.rejects(m.loadDuaPlan(db, { tenantId: T }), /ctx must carry/);
});
await acheck("a failed save is REPORTED (I15) and returns the entry, not a success", async () => {
  reset(); failNext = true;
  const r = await m.setDuaMark(db, ctx, { duaKey: "1", mark: "today" });
  assert.equal(r.ok, false); assert.ok(r.entry); assert.equal(failures.length, 1); assert.equal(failures[0].context.collection, "duaPlans");
});

await acheck("hiding an existing dua CREATES its edit document with hidden: true (delete = hide); bringing it back updates it", async () => {
  reset();
  const r = await m.setDuaHidden(db, ctx, { duaKey: "55", hidden: true });
  assert.equal(r.ok, true);
  const d = store.get(`duaEdits/${T}__55`);
  assert.equal(d.hidden, true); assert.deepEqual(d.title, {}); assert.deepEqual(d.placements, []); assert.ok(!("added" in d));
  assert.equal(d.createdBy, "uid-p1"); assert.equal((await m.setDuaHidden(db, ctx, { duaKey: "55", hidden: false })).ok, true);
  assert.equal(store.get(`duaEdits/${T}__55`).hidden, false); assert.equal(writeLog.at(-1).kind, "update");
});
await acheck("a title (I11: en and bn) and several placements (D03) are saved; a bad title, bad placement or oversize list is refused", async () => {
  reset();
  const ok = await m.saveDuaEdit(db, ctx, { duaKey: "55", title: { en: "Before sleep", bn: "ঘুমের আগে" }, placements: [{ group: "occasions", part: "wake", order: 1 }, { group: "rasul", order: 3 }] });
  assert.equal(ok.ok, true);
  const d = store.get(`duaEdits/${T}__55`); assert.equal(d.title.bn, "ঘুমের আগে"); assert.equal(d.placements.length, 2);
  for (const bad of [{ title: { fr: "x" } }, { title: { en: "x".repeat(301) } }, { placements: [{ group: "", order: 1 }] }, { placements: new Array(51).fill({ group: "g", order: 1 }) }, { hidden: "yes" }, { added: { a: 1 } }])
    assert.equal((await m.saveDuaEdit(db, ctx, { duaKey: "55", ...bad })).ok, false);
});
await acheck("a dua the madrasah ADDS (new- key) carries `added` exactly; a number key refuses it", async () => {
  reset(); const key = m.newDuaKey(() => 0.5);
  assert.match(key, /^new-[a-z0-9]{10}$/); assert.ok(m.isDuaKey(key));
  assert.equal((await m.saveDuaEdit(db, ctx, { duaKey: key, title: { en: "My dua" }, added: { ar: "اللهم" } })).ok, true);
  assert.deepEqual(store.get(`duaEdits/${T}__${key}`).added, { ar: "اللهم" });
  assert.equal((await m.saveDuaEdit(db, ctx, { duaKey: "12", added: { ar: "x" } })).refused, "added-only-on-new");
  reset(); await m.saveDuaEdit(db, ctx, { duaKey: key, hidden: true });
  assert.deepEqual(store.get(`duaEdits/${T}__${key}`).added, {}, "a new dua is created with an empty added map, which the Rules require");
});
await acheck("the madrasah's edits are listed with ONE tenantId-equality read, and only this tenant's", async () => {
  reset(); await m.saveDuaEdit(db, ctx, { duaKey: "1", hidden: true });
  store.set("duaEdits/t2__1", { tenantId: "t2", duaKey: "1", hidden: true });
  reads.length = 0; const list = await m.loadDuaEdits(db, ctx);
  assert.equal(list.length, 1); assert.equal(list[0].tenantId, T); assert.equal(reads.length, 1);
});
await acheck("a share is recorded APPEND-ONLY with an auto id, the Rules' vocabulary and every envelope field; each share is its own record", async () => {
  reset();
  const a = await m.recordDuaShare(db, ctx, { duaKey: "123", where: "whatsapp", whoFor: "family", occasion: "Jumu'ah" });
  const b = await m.recordDuaShare(db, ctx, { duaKey: "123", where: "print", whoFor: "students" });
  assert.ok(a.ok && b.ok && a.id !== b.id);
  const d = store.get(`duaShares/${a.id}`);
  assert.equal(d.where, "whatsapp"); assert.equal(d.whoFor, "family"); assert.equal(d.occasion, "Jumu'ah"); assert.ok(d.sharedAt instanceof Date);
  assert.equal(d.createdBy, "uid-p1"); assert.ok(writeLog.every((w) => w.kind === "create"), "a share must only ever be created");
  for (const bad of [{ where: "sms" }, { whoFor: "everyone" }, { occasion: "x".repeat(301) }, { sharedAt: "yesterday" }, { duaKey: "x" }])
    assert.equal((await m.recordDuaShare(db, ctx, { duaKey: "1", where: "email", whoFor: "public", ...bad })).ok, false);
  failNext = true; assert.equal((await m.recordDuaShare(db, ctx, { duaKey: "1", where: "email", whoFor: "public" })).ok, false);
  assert.equal(failures.length, 1);
  assert.equal((await m.loadDuaShares(db, ctx)).length, 2);
});

// --- 3. SHAPE vs THE PUBLISHED RULES ---
const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const listOf = (block, kind) => { const x = block.match(new RegExp(`\\bd\\(\\)\\.keys\\(\\)\\.${kind}\\(\\[([\\s\\S]*?)\\]\\)`)); assert.ok(x, `no ${kind}`); return [...x[1].matchAll(/'([A-Za-z]+)'/g)].map((y) => y[1]); };
const blockOf = (name) => { const i = rules.indexOf(`match /${name}/`); assert.ok(i > 0); return rules.slice(i, rules.indexOf("\n    match /", i + 10) > 0 ? rules.indexOf("\n    match /", i + 10) : undefined); };
const docs = {
  duaPlans: () => plan(),
  duaEdits: () => store.get(`duaEdits/${T}__new-edit000001`),
  duaShares: () => [...store].find(([k]) => k.startsWith("duaShares/"))?.[1],
};
reset();
await m.setDuaMark(db, ctx, { duaKey: "1", mark: "today" });
await m.saveDuaEdit(db, ctx, { duaKey: "new-edit000001", title: { en: "x" }, added: { ar: "y" } });
await m.recordDuaShare(db, ctx, { duaKey: "1", where: "email", whoFor: "public" });
for (const c of ["duaPlans", "duaEdits", "duaShares"]) {
  check(`SHAPE ${c}: the created document has exactly keys the published Rules allow (hasOnly) and every one they require (hasAll)`, () => {
    const d = docs[c](); assert.ok(d, `no ${c} document was created`);
    const only = listOf(blockOf(c), "hasOnly"), all = listOf(blockOf(c), "hasAll"), keys = Object.keys(d);
    assert.deepEqual(keys.filter((k) => !only.includes(k)), [], "a key the Rules would refuse");
    assert.deepEqual(all.filter((k) => !keys.includes(k)), [], "a key the Rules require is missing");
  });
}
check("SHAPE: the created plan, edit and share ids match the Rules' own id rules", () => {
  assert.ok(store.has(`duaPlans/${T}__p1`) && store.has(`duaEdits/${T}__new-edit000001`));
  assert.match("new-edit000001", /^([0-9]{1,6}|new-[A-Za-z0-9_-]{6,40})$/);
});
console.log(`\n==== Dua saving data: ${passed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
