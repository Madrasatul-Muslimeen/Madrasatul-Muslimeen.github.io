// PCF MSA J143 (the Owner ticked B on 16 Nov 2026): the own-language word lists in the reader's ACCOUNT. Firebase-free: the imports of
// app/js/bangla-words-data.js are replaced in memory; nothing contacts a network or a database. Run from the repository root.
//   1. THE GATE: bangla-words-readiness.js defaults to OFF, opens only with a governed decision, and the page and the Monitor consult it.
//   2. NOT WIRED STATICALLY (I9): the data module is reachable from no page by a static import chain (only a lazy import() behind the gate).
//   3. BEHAVIOUR against an in-memory store: ids, create then update, every envelope field, kinds, a refusal reads and writes nothing, a failed
//      save is REPORTED (I15), a load is ONE read, nothing is ever deleted (I4/D6).
//   4. SHAPE vs THE CANDIDATE RULES (docs/proposals/bangla-words.candidate.rules): the keys the writer sends are exactly the ones the candidate allows,
//      both directions (a create it would refuse, or a field it allows that nothing writes, fails here).
//   5. THE PURE HELPERS in bangla-words.js, and that the PAGE and the MONITOR are wired the way the Owner's tick says.
// Mutations (--mutate=NAME), each must exit 1:
//   gateopen      the declaration keeps ready: true but loses its decision   -> "ON as shipped, by a governed decision" fails (updated in place 16 Nov 2026)
//   nocap         banglaListPayload ignores the 5000 cap      -> the cap check fails
//   devwrite      devicePrefsState keeps the account's lists  -> "the device lists are never overwritten" fails
//   noreplay      replayBanglaChange drops the tap            -> "a tap while the lists load is put back" fails
//   killprobe     saveBanglaList always creates               -> "a second save UPDATES" fails
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
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

// --- 1. THE GATE ---
let readySrc = read("app/js/bangla-words-readiness.js");
if (MUTATE === "gateopen") { const out = readySrc.replace(/  ready: true,\n  decision: Object\.freeze\(\{[\s\S]*?\n  \}\),/, "  ready: true,\n  decision: null,"); assert.ok(out !== readySrc, "gateopen: anchor not found"); readySrc = out; }
const gate = await import(`data:text/javascript;base64,${Buffer.from(readySrc).toString("base64")}`);
// UPDATED IN PLACE 16 Nov 2026 (Architect 114L, v15.13): the Owner published the banglaWords Rules, so the shipped gate is ON with a governed
// decision (rules-authorisation-executable.mjs checks it is ON only because firestore.rules carries the block). It used to say "OFF by default".
check("the gate is ON as shipped, by a governed decision (the Owner published the Rules, 16 Nov 2026)", () => { assert.equal(gate.isBanglaWordsPersistenceReady(), true); assert.equal(gate.banglaWordsUnavailableReason(), null); assert.equal(gate.BANGLA_WORDS_PERSISTENCE_DECLARATION.decision.by, "master-architect"); });
const good = { ready: true, decision: { by: "master-architect", on: "2026-11-20", reference: "docs/x.md" } };
check("POSITIVE CONTROL: a governed decision opens it", () => { assert.equal(gate.isBanglaWordsPersistenceReady(good), true); assert.equal(gate.banglaWordsUnavailableReason(good), null); });
check("ready: true alone, or a decision by anyone else, or a bad date, or no reference, does NOT open it", () => {
  for (const d of [{ ready: true }, { ready: true, decision: null }, { ready: true, decision: { ...good.decision, by: "the-page" } }, { ready: true, decision: { ...good.decision, on: "20/11/2026" } }, { ready: true, decision: { ...good.decision, reference: " " } }, { ready: "true", decision: good.decision }, null, "yes"])
    assert.equal(gate.isBanglaWordsPersistenceReady(d), false, JSON.stringify(d));
  assert.equal(gate.banglaWordsUnavailableReason({ ready: true }), gate.REASON_BANGLA_WORDS_DECISION_INCOMPLETE);
});
check("the readiness module is PURE: it imports nothing", () => assert.ok(!/^\s*import\s/m.test(readySrc)));

// --- 2. NOT WIRED STATICALLY (I9) --- (the walker follows STATIC imports only: a lazy import("./js/x.js") written in a page is removed from its text first, because that is exactly the door that must stay lazy)
const localImportsOf = (file) => [...fs.readFileSync(file, "utf8").matchAll(/(?:from\s*|import\s+)["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]);
const entryModulesOf = (html) => [...fs.readFileSync(html, "utf8").replace(/import\(\s*["'`][^"'`]+["'`]\s*\)/g, "").matchAll(/["'`](?:\.\/)?js\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]);
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
check("bangla-words-data.js is reachable from NO page by a STATIC import chain (it loads only through import() behind the gate: I9)", () => assert.deepEqual(chainsToTarget("bangla-words-data.js"), []));
check("its importers are pinned: nothing imports it statically", () => assert.deepEqual(fs.readdirSync(appJs).filter((f) => f.endsWith(".js") && localImportsOf(path.join(appJs, f)).includes("bangla-words-data.js")), []));
check("the page and the Monitor open it ONLY by a lazy import() and consult the gate first", () => {
  for (const f of ["app/quranrevival.html", "app/monitor.html"]) {
    const s = read(f);
    assert.match(s, /import \{ isBanglaWordsPersistenceReady \} from "\.\/js\/bangla-words-readiness\.js"/, f);
    assert.match(s, /await import\("\.\/js\/bangla-words-data\.js"\)|import\("\.\/js\/bangla-words-data\.js"\)/, f);
    assert.ok(!/^\s*import [^\n]*bangla-words-data\.js/m.test(s), `${f} imports the data module statically`);
  }
  assert.match(read("app/monitor.html"), /if \(isBanglaWordsPersistenceReady\(\)\) \{\s*try \{\s*const m = await import/, "the Monitor reads the list only behind the gate");
});
check("collections.js names the collection", () => assert.match(read("app/js/collections.js"), /BANGLA_WORDS: "banglaWords"/));

// --- 3. BEHAVIOUR ---
const store = new Map(), failures = [], reads = [], writeLog = [];
let failNext = false, forceCreate = MUTATE === "killprobe";
const NOW = new Date("2026-11-16T01:00:00Z"), TS = { __ts: true };
const apply = (key, patch) => { const cur = { ...(store.get(key) || {}) }; for (const [k, v] of Object.entries(patch)) cur[k] = v && v.__ts ? NOW : v; store.set(key, cur); };
const fail = () => Object.assign(new Error("denied"), { code: "permission-denied" });
globalThis.__bwFirestore = {
  doc: (_db, col, id) => ({ __col: col, __id: id }),
  getDoc: async (ref) => { reads.push(`${ref.__col}/${ref.__id}`); const v = forceCreate ? undefined : store.get(`${ref.__col}/${ref.__id}`); return { exists: () => v !== undefined, data: () => v }; },
};
globalThis.__bwEnvelope = {
  createDocument: async (_db, col, id, data, uid) => { if (failNext) { failNext = false; throw fail(); } if (!uid) throw new Error("no uid"); writeLog.push({ kind: "create", col, id, data }); apply(`${col}/${id}`, { ...data, schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: uid }); },
  updateDocument: async (_db, col, id, data) => { if (failNext) { failNext = false; throw fail(); } writeLog.push({ kind: "update", col, id, data }); apply(`${col}/${id}`, { ...data, updatedAt: TS }); },
};
globalThis.__bwErrors = { safeWrite: async (fn, context) => { try { await fn(); return { ok: true }; } catch (error) { const entry = { code: error.code, context }; failures.push(entry); return { ok: false, entry }; } } };
globalThis.__bwCollections = { TENANT: { BANGLA_WORDS: "banglaWords" } };
let source = read("app/js/bangla-words-data.js");
const before = source;
source = source
  .replace(/import \{[^}]*\} from "https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/, "const { doc, getDoc } = globalThis.__bwFirestore;")
  .replace(/import \{ TENANT \} from "\.\/collections\.js";/, "const { TENANT } = globalThis.__bwCollections;")
  .replace(/import \{ createDocument, updateDocument \} from "\.\/envelope\.js";/, "const { createDocument, updateDocument } = globalThis.__bwEnvelope;")
  .replace(/import \{ safeWrite \} from "\.\/errors\.js";/, "const { safeWrite } = globalThis.__bwErrors;");
check("every import was replaced (the module under test is the real one)", () => { assert.notEqual(source, before); assert.ok(!/^import /m.test(source)); });
const m = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const T = "t1", ctx = { tenantId: T, personId: "p1", uid: "uid-p1" }, db = {};
const reset = () => { store.clear(); writeLog.length = 0; failures.length = 0; reads.length = 0; failNext = false; };
const P = (n) => `banglaWords/${T}__${n}`;

await acheck("the first save CREATES the reader's own list: right id, tenantId, scope, words, kinds, every envelope field", async () => {
  reset();
  const r = await m.saveBanglaList(db, ctx, "p1", { words: ["a", "b"], kinds: { a: ["names"], b: ["bangla"] } });
  assert.deepEqual(r, { ok: true });
  const d = store.get(P("p1")); assert.ok(d, "no document at banglaWords/t1__p1");
  assert.equal(d.tenantId, T); assert.equal(d.scope, "p1"); assert.deepEqual(d.words, ["a", "b"]); assert.deepEqual(d.kinds, { a: ["names"], b: ["bangla"] });
  assert.equal(d.schemaVersion, 1); assert.equal(d.createdBy, "uid-p1"); assert.ok(d.createdAt && d.updatedAt);
  assert.equal(writeLog.length, 1); assert.equal(writeLog[0].kind, "create");
});
await acheck("a second save UPDATES (words and kinds only), and the admin's list is its own document", async () => {
  const r = await m.saveBanglaList(db, ctx, "p1", { words: ["a"], kinds: { a: ["names"] } });
  assert.equal(r.ok, true); assert.equal(writeLog.at(-1).kind, "update"); assert.deepEqual(Object.keys(writeLog.at(-1).data).sort(), ["kinds", "words"]);
  assert.deepEqual(store.get(P("p1")).words, ["a"]);
  await m.saveBanglaList(db, { ...ctx, uid: "uid-t" }, m.BANGLA_SCOPE_MADRASAH, { words: ["z"], kinds: { z: ["rituals"] } });
  assert.deepEqual(store.get(P("madrasah")).words, ["z"]); assert.equal(store.get(P("madrasah")).scope, "madrasah"); assert.equal(store.get(P("madrasah")).createdBy, "uid-t");
});
await acheck("removing words writes a SHORTER list; nothing is ever deleted (I4/D6) and an emptied list stays as a document", async () => {
  await m.saveBanglaList(db, ctx, "p1", { words: [], kinds: {} });
  assert.deepEqual(store.get(P("p1")).words, []); assert.ok(store.has(P("p1")));
  assert.ok(!writeLog.some((w) => w.kind === "delete")); assert.ok(!/deleteDoc|deleteDocument/.test(source), "the writer has a delete");
});
await acheck("a load is ONE read: absent -> { exists: false }, present -> its words and kinds", async () => {
  reset(); reads.length = 0;
  assert.deepEqual(await m.loadBanglaList(db, ctx, "p1"), { exists: false }); assert.equal(reads.length, 1);
  await m.saveBanglaList(db, ctx, "p1", { words: ["q"], kinds: { q: ["bangla"] } }); reads.length = 0;
  assert.deepEqual(await m.loadBanglaList(db, ctx, "p1"), { exists: true, words: ["q"], kinds: { q: ["bangla"] } }); assert.equal(reads.length, 1);
});
await acheck("a bad request is REFUSED and reads and writes nothing: bad scope, bad words, over 5000 words, more kinds than words", async () => {
  reset();
  for (const [scope, p, why] of [["", { words: [], kinds: {} }, "bad-scope"], ["a__b", { words: [], kinds: {} }, "bad-scope"], ["a/b", { words: [], kinds: {} }, "bad-scope"], ["p1", { words: "x", kinds: {} }, "bad-words"], ["p1", { words: [""], kinds: {} }, "bad-words"], ["p1", { words: Array.from({ length: 5001 }, (_, i) => `w${i}`), kinds: {} }, "too-many-words"], ["p1", { words: ["a"], kinds: { a: [], b: [] } }, "bad-kinds"]]) {
    const r = await m.saveBanglaList(db, ctx, scope, p); assert.equal(r.ok, false); assert.equal(r.refused, why, `${scope}: ${JSON.stringify(r)}`);
  }
  assert.equal(reads.length, 0); assert.equal(writeLog.length, 0);
  assert.equal((await m.saveBanglaList(db, ctx, "p1", { words: Array.from({ length: 5000 }, (_, i) => `w${i}`), kinds: {} })).ok, true, "exactly 5000 is allowed");
});
await acheck("a failed save is REPORTED (I15) and returns the entry, not a success", async () => {
  reset(); failNext = true;
  const r = await m.saveBanglaList(db, ctx, "p1", { words: ["a"], kinds: {} });
  assert.equal(r.ok, false); assert.ok(r.entry); assert.equal(failures.length, 1); assert.equal(failures[0].context.collection, "banglaWords"); assert.equal(failures[0].context.action, "save bangla list");
});
await acheck("a missing uid or tenant throws by name (a save never writes an unattributed document)", async () => {
  await assert.rejects(() => m.saveBanglaList(db, { tenantId: T }, "p1", { words: [], kinds: {} }), /ctx must carry/);
  await assert.rejects(() => m.loadBanglaList(db, { uid: "u" }, "p1"), /ctx must carry/);
});

// --- 4. SHAPE vs THE CANDIDATE RULES ---
const cand = read("docs/proposals/bangla-words.candidate.rules");
const listOf = (re) => { const x = re.exec(cand); assert.ok(x, `candidate: ${re}`); return [...x[1].matchAll(/'([A-Za-z]+)'/g)].map((y) => y[1]); };
const ENVELOPE = ["schemaVersion", "createdAt", "updatedAt", "createdBy"];
const hasOnly = listOf(/hasOnly\(\[([^\]]*)\]\)/), hasAll = listOf(/hasAll\(\[([^\]]*)\]\)/);
check("POSITIVE CONTROL: the parser reads the candidate (hasOnly 8 keys, hasAll 7)", () => { assert.equal(hasOnly.length, 8); assert.equal(hasAll.length, 7); });
check("BACKWARD: every key the writer can send on create (its own + the envelope) is one the candidate allows", () => {
  const sent = [...m.BANGLA_LIST_WRITES, ...ENVELOPE];
  assert.deepEqual(sent.filter((k) => !hasOnly.includes(k)), [], "denied in production once published");
});
check("FORWARD: every key the candidate allows is one the writer sends (kinds is optional in the Rules, always sent here)", () => {
  assert.deepEqual(hasOnly.filter((k) => ![...m.BANGLA_LIST_WRITES, ...ENVELOPE].includes(k)), [], "an authorised field nothing writes");
  assert.deepEqual(hasAll.filter((k) => ![...m.BANGLA_LIST_WRITES, ...ENVELOPE].includes(k)), [], "a required field the writer omits: every create would be refused");
});
await acheck("a document the writer really creates carries every hasAll key and no key outside hasOnly; an update touches only words, kinds and updatedAt", async () => {
  reset(); await m.saveBanglaList(db, ctx, "p1", { words: ["a"], kinds: { a: ["bangla"] } });
  const keys = Object.keys(store.get(P("p1")));
  assert.deepEqual(hasAll.filter((k) => !keys.includes(k)), []); assert.deepEqual(keys.filter((k) => !hasOnly.includes(k)), []);
  await m.saveBanglaList(db, ctx, "p1", { words: [], kinds: {} });
  assert.deepEqual(Object.keys(writeLog.at(-1).data).filter((k) => !["words", "kinds", "updatedAt"].includes(k)), []);
});
check("the 5000 cap and the doc id shape match the candidate's", () => { assert.match(cand, /d\(\)\.words\.size\(\) <= 5000/); assert.match(cand, /listKey == d\(\)\.tenantId \+ '__' \+ d\(\)\.scope/); assert.match(fs.readFileSync(path.join(appJs, "bangla-words-data.js"), "utf8"), /MAX_WORDS = 5000/); });

// --- 5. THE PURE HELPERS ---
let bwSrc = read("app/js/bangla-words.js");
if (MUTATE === "nocap") { const a = "const words = (s[list] ?? []).slice(0, BANGLA_MAX_WORDS);"; assert.ok(bwSrc.includes(a)); bwSrc = bwSrc.replace(a, "const words = (s[list] ?? []);"); }
if (MUTATE === "devwrite") { const a = "return { ...s, admin: d.admin, mine: d.mine, kinds: d.kinds };"; assert.ok(bwSrc.includes(a)); bwSrc = bwSrc.replace(a, "return s;"); }
if (MUTATE === "noreplay") { const a = "  return out;\n}\n\n/** The state to keep on THIS DEVICE"; assert.ok(bwSrc.includes(a)); bwSrc = bwSrc.replace(a, "  return b;\n}\n\n/** The state to keep on THIS DEVICE"); }
const bw = await import(`data:text/javascript;base64,${Buffer.from(bwSrc).toString("base64")}`);
const st = (over = {}) => bw.normaliseBanglaState({ list: "mine", ...over });
check("banglaListPayload: sorted ids, kinds only for them, never more than 5000 words, and never more kinds than words", () => {
  const s = bw.setBanglaWordKinds(bw.setBanglaWordKinds(st(), "b", ["names"], { list: "mine" }), "a", ["rituals", "bangla"], { list: "mine" });
  const p = bw.banglaListPayload(s, "mine");
  assert.deepEqual(p.words, ["a", "b"]); assert.deepEqual(p.kinds, { a: ["rituals", "bangla"], b: ["names"] }); assert.ok(Object.keys(p.kinds).length <= p.words.length);
  const big = bw.normaliseBanglaState({ mine: Array.from({ length: 5200 }, (_, i) => `w${String(i).padStart(5, "0")}`) });
  assert.equal(big.mine.length, 5200); assert.equal(bw.banglaListPayload(big, "mine").words.length, 5000, "the cap");
});
check("withBanglaList: replaces ONE list from a saved document, leaves the rest alone, and cleans anything malformed", () => {
  const s = st({ admin: ["x"], on: false, wheel: { ring: false, centre: true, tenth: true } });
  const n = bw.withBanglaList(s, "mine", { words: ["m1", "m1", "", 5, "m2"], kinds: { m1: ["names", "zzz"], m2: "bad" } });
  assert.deepEqual(n.mine, ["m1", "m2"]); assert.deepEqual(n.kinds.mine, { m1: ["names"], m2: ["bangla"] });
  assert.deepEqual(n.admin, ["x"]); assert.equal(n.on, false); assert.deepEqual(n.wheel, { ring: false, centre: true, tenth: true });
  assert.deepEqual(bw.withBanglaList(s, "mine", null).mine, []); assert.deepEqual(bw.withBanglaList(s, "nope", { words: ["q"] }).mine, []);
});
check("devicePrefsState: the device keeps the PREFERENCES, but its own lists are never overwritten by the account's", () => {
  const device = st({ mine: ["dev1"], admin: ["dadm"] }), now = bw.withBanglaList(bw.withBanglaList(st({ on: false }), "mine", { words: ["acct"], kinds: {} }), "admin", { words: ["aadm"], kinds: {} });
  const kept = bw.devicePrefsState(now, device);
  assert.deepEqual(kept.mine, ["dev1"]); assert.deepEqual(kept.admin, ["dadm"]); assert.equal(kept.on, false);
});
check("replayBanglaChange: a tap made while the lists were loading is put back on top of what arrived", () => {
  const prev = st(), next = bw.setBanglaWordKinds(bw.setBanglaWordKinds(prev, "n1", ["names"], { list: "mine" }), "n2", ["bangla"], { list: "mine" });
  const arrived = bw.withBanglaList(st(), "mine", { words: ["old"], kinds: { old: ["rituals"] } });
  const r = bw.replayBanglaChange(arrived, prev, next);
  assert.deepEqual(r.mine, ["n1", "n2", "old"]);
  const removed = bw.replayBanglaChange(arrived, arrived, bw.setBanglaWordKinds(arrived, "old", [], { list: "mine" }));
  assert.deepEqual(removed.mine, []);
  const prefs = bw.replayBanglaChange(arrived, st(), { ...st(), on: false });
  assert.equal(prefs.on, false);
});
check("the page keeps the device lists, copies up ONCE per list and never removes the device copy; a student switch clears and reloads", () => {
  const s = read("app/quranrevival.html");
  assert.ok(!/removeItem\([^)]*mm_bangla/.test(s) && !/localStorage\.removeItem\(BANGLA/.test(s), "the device copy is removed somewhere");
  assert.match(s, /!banglaWasCopied\(c, c\.personId\)/); assert.match(s, /!banglaWasCopied\(c, "madrasah"\)/); assert.match(s, /if \(r\.ok\) banglaMarkCopied/);
  assert.match(s, /saveBanglaState\(devicePrefsState\(banglaState, banglaDeviceState\)\)/);
  assert.match(s, /if \(banglaSharedOn\(\)\) \{ banglaState = withBanglaList\(withBanglaList\(banglaState, "mine"/);
  assert.match(s, /await banglaHydrate\(\);/);
  assert.match(s, /reportWriteFailure\(error, \{ what: "load your Bangla word list", read: true \}\)/);
});
console.log(`\n==== Bangla word lists in the account (J143)${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${passed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
