// PCF J03, Builder round K2 -- Keys to Understanding: the vocabulary (app/js/ayah-keys.js) and the saving layer
// (app/js/ayah-keys-data.js).
//
// Three halves, all Firebase-free (imports are replaced in memory; no network or database is contacted):
//   1. REACHABILITY: no page reaches either module by any chain of any length ("this changes nothing" is a
//      claim about WIRING, which no function-level test can see). Carries a positive control.
//   2. THE VOCABULARY: every permanent id is bound to its English name (a renumber or rename fails), both
//      languages are filled (I11), ids are unique and look like ids.
//   3. BEHAVIOUR against an in-memory store that really mutates: updatedAt is stamped on every write, a
//      removal writes the shorter list and never deletes, an unknown key is refused, a failed write reaches
//      the user (I15), and a sūrah costs at most two reads.
// Run from the repository root.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
const appDir = path.join(root, "app");
const appJs = path.join(appDir, "js");

let passed = 0, failed = 0;
function check(name, fn) {
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
    ...[...text.matchAll(/import\(\s*["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]\s*\)/g)].map((m) => m[1]),
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
const importersOf = (target) => fs.readdirSync(appJs).filter((f) => f.endsWith(".js") && f !== target && localImportsOf(path.join(appJs, f)).includes(target));

check("POSITIVE CONTROL: the reachability walker really does find a wired module", () => {
  const control = chainsToTarget("records.js");
  assert.ok(control.length > 0, "the walker found no page importing records.js -- it is not working");
});
check("POSITIVE CONTROL: the importer finder really does find an importer", () => {
  assert.ok(importersOf("envelope.js").includes("zab-data.js"), "the importer finder did not see zab-data.js import envelope.js");
});
// K2 (QR Lead, 4 Nov 2026) WIRED THEM ON PURPOSE: the Āyah card, the Word card and the Marks wheel in quranrevival.html.
// These three checks described "unwired" (K0); they are UPDATED, not deleted, to pin exactly the wiring K2 means to have --
// reachable from quranrevival.html and from NO other page, through exactly the importers listed (a new one must be audited).
const PAGES_NAMING = (mod) => fs.readdirSync(appDir).filter((x) => x.endsWith(".html")
  && new RegExp(mod.replace(".", "\\.")).test(fs.readFileSync(path.join(appDir, x), "utf8")));
for (const mod of ["ayah-keys.js", "ayah-keys-data.js", "marks-ui.js"]) {
  check(`${mod} exists`, () => assert.ok(fs.existsSync(path.join(appJs, mod)), `app/js/${mod} is missing`));
  check(`${mod} is reachable from quranrevival.html and from no other page`, () => {
    const pages = chainsToTarget(mod).map((c) => c.split(" ")[0]);
    assert.deepEqual(pages, ["app/quranrevival.html"]);
  });
}
check("the importers are exactly the audited ones (a new importer must be audited deliberately)", () => {
  assert.deepEqual(importersOf("ayah-keys.js"), ["ayah-keys-data.js", "marks-ui.js"]);
  assert.deepEqual(importersOf("ayah-keys-data.js"), []);
  assert.deepEqual(importersOf("marks-ui.js"), []);
});
check("only quranrevival.html names the ayah-keys data module or marks-ui", () => {
  assert.deepEqual(PAGES_NAMING("ayah-keys-data.js"), ["quranrevival.html"]);
  assert.deepEqual(PAGES_NAMING("marks-ui.js"), ["quranrevival.html"]);
});
check("ayah-keys.js imports nothing (it is pure)", () => {
  assert.ok(!/^\s*import\s/m.test(fs.readFileSync(path.join(appJs, "ayah-keys.js"), "utf8")));
});

// --- 2. THE VOCABULARY ------------------------------------------------------
const keysSrc = fs.readFileSync(path.join(appJs, "ayah-keys.js"), "utf8");
const keys = await import(`data:text/javascript;base64,${Buffer.from(keysSrc).toString("base64")}`);

// The permanent ids and the English names they were accepted with (PCF J03). A renumber or a rename fails here.
// K0 (4 Nov 2026): `hard` is now NAMED "Difficult" (the Owner's J03 Q1 A; the id is unchanged, I5), and the
// Owner added "Need practice" (`practice`) and "Done" (`done`, "known / studied").
const ACCEPTED = {
  hard: "Difficult",
  gharib: "The dictionary (Gharīb)",
  hadith: "Hadith",
  scholars: "The scholars, by era",
  "other-ayat": "Other āyāt",
  passage: "Its passage",
  asbab: "The reason it came down",
  practice: "Need practice",
  done: "Done",
};
check("KEY_IDS holds exactly the nine accepted ids, in order", () => {
  assert.deepEqual(keys.KEY_IDS.map((k) => k.id), Object.keys(ACCEPTED));
});
check("each id is bound to its accepted English name", () => {
  for (const [id, en] of Object.entries(ACCEPTED)) {
    assert.equal(keys.KEY_IDS.find((k) => k.id === id)?.names.en, en, id);
  }
});
check("every key has an English and a Bangla name (I11), and the Bangla one is Bangla script", () => {
  for (const k of keys.KEY_IDS) {
    assert.ok(k.names.en && k.names.bn, k.id);
    assert.match(k.names.bn, /[ঀ-৿]/, `${k.id}: bn is not Bangla`);
  }
});
check("ids are unique, lower-case, and never a name", () => {
  const ids = keys.KEY_IDS.map((k) => k.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z]+(-[a-z]+)*$/, id);
});
check("KEY_IDS is frozen", () => assert.ok(Object.isFrozen(keys.KEY_IDS)));
check("isKeyId accepts the nine and refuses everything else", () => {
  for (const id of Object.keys(ACCEPTED)) assert.equal(keys.isKeyId(id), true, id);
  for (const bad of ["", "Hard", "hard ", "unknown", null, undefined, 3, {}, ["hard"], "__proto__", "constructor"]) assert.equal(keys.isKeyId(bad), false, String(bad));
});
check("keyName reads each language and falls back to English; unknown id is null", () => {
  assert.equal(keys.keyName("hard", "en"), "Difficult");
  assert.match(keys.keyName("hard", "bn"), /[ঀ-৿]/);
  assert.equal(keys.keyName("hard", "fr"), "Difficult");
  assert.equal(keys.keyName("nope"), null);
});
check("the madrasah scope word is 'madrasah'", () => assert.equal(keys.MADRASAH_SCOPE, "madrasah"));
check("K0: MARK_IDS is exactly hard, practice, done (Difficult, Need practice, Done), frozen, each a key id", () => {
  assert.deepEqual([...keys.MARK_IDS], ["hard", "practice", "done"]);
  assert.ok(Object.isFrozen(keys.MARK_IDS));
  for (const m of keys.MARK_IDS) assert.equal(keys.isKeyId(m), true, m);
});
check("K0: isMarkId is true for the three marks only", () => {
  for (const m of ["hard", "practice", "done"]) assert.equal(keys.isMarkId(m), true, m);
  for (const bad of ["gharib", "asbab", "Done", "", null, undefined]) assert.equal(keys.isMarkId(bad), false, String(bad));
});
check("K0: marksIn keeps only the marks, in MARK_IDS order, and tolerates a missing list", () => {
  assert.deepEqual(keys.marksIn(["done", "gharib", "hard", "x"]), ["hard", "done"]);
  assert.deepEqual(keys.marksIn(undefined), []);
  assert.deepEqual(keys.marksIn("hard"), []);
});
check("K0: the Bangla mark names are the demo's (কঠিন, অনুশীলন দরকার, সম্পন্ন)", () => {
  assert.equal(keys.keyName("hard", "bn"), "কঠিন");
  assert.equal(keys.keyName("practice", "bn"), "অনুশীলন দরকার");
  assert.equal(keys.keyName("done", "bn"), "সম্পন্ন");
});

// --- 3. BEHAVIOUR -----------------------------------------------------------
const store = new Map();     // "collection/docId" -> data (a real, mutating fake)
const failures = [];         // what safeWrite reported
const reads = [];            // every getDoc, by "collection/docId"
const writeLog = [];
let failNext = false;
let failRead = false;
const NOW = () => new Date("2026-10-14T10:00:00Z");
const TS = { __ts: true };

const apply = (key, patch) => {
  const cur = { ...(store.get(key) || {}) };
  for (const [k, v] of Object.entries(patch)) {
    const val = v && v.__ts ? NOW() : v;
    if (k.startsWith("entries.")) cur.entries = { ...(cur.entries || {}), [k.slice("entries.".length)]: val };
    else cur[k] = val;
  }
  store.set(key, cur);
};
const fail = () => Object.assign(new Error("denied"), { code: "permission-denied" });
globalThis.__akFirestore = {
  doc: (_db, col, id) => ({ __col: col, __id: id }),
  getDoc: async (ref) => {
    if (failRead) { failRead = false; throw fail(); }
    reads.push(`${ref.__col}/${ref.__id}`);
    const v = store.get(`${ref.__col}/${ref.__id}`);
    return { exists: () => v !== undefined, data: () => v };
  },
};
globalThis.__akEnvelope = {
  createDocument: async (_db, col, id, data, uid) => {
    if (failNext) { failNext = false; throw fail(); }
    if (!uid) throw new Error("no uid");
    writeLog.push({ kind: "create", col, id, data });
    apply(`${col}/${id}`, { ...data, schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: uid });
  },
  updateDocument: async (_db, col, id, data) => {
    if (failNext) { failNext = false; throw fail(); }
    writeLog.push({ kind: "update", col, id, data });
    apply(`${col}/${id}`, { ...data, updatedAt: TS });
  },
};
globalThis.__akErrors = { safeWrite: async (fn, context) => {
  try { return { ok: true, result: await fn() }; }
  catch (error) { const entry = { code: error.code, context }; failures.push(entry); return { ok: false, entry }; }
} };
globalThis.__akCollections = { TENANT: { AYAH_KEY_MARKS: "ayahKeyMarks", HADITH_KEY_MARKS: "hadithKeyMarks" } };

const collectionsSrc = fs.readFileSync(path.join(appJs, "collections.js"), "utf8");
check("collections.js names ayahKeyMarks", () => assert.match(collectionsSrc, /AYAH_KEY_MARKS:\s*"ayahKeyMarks"/));
check("collections.js names hadithKeyMarks (K0)", () => assert.match(collectionsSrc, /HADITH_KEY_MARKS:\s*"hadithKeyMarks"/));

// The REAL unit-keys.js builds the key; it imports i18n.js, so its own import is replaced and the rest is the real file.
const unitSrc = fs.readFileSync(path.join(appJs, "unit-keys.js"), "utf8");
const unitFake = unitSrc.replace(/import \{[^}]*\} from "\.\/i18n\.js";/, "const t = (k) => k, num = (n) => String(n);");
check("unit-keys.js import of i18n.js was replaced (the real buildUnitKey is under test)", () => assert.notEqual(unitFake, unitSrc));
globalThis.__akUnitKeys = await import(`data:text/javascript;base64,${Buffer.from(unitFake).toString("base64")}`);
globalThis.__akKeys = keys;

let source = fs.readFileSync(path.join(appJs, "ayah-keys-data.js"), "utf8");
const before = source;
source = source
  .replace(/import \{[^}]*\} from "https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/, "const { doc, getDoc } = globalThis.__akFirestore;")
  .replace(/import \{ TENANT \} from "\.\/collections\.js";/, "const { TENANT } = globalThis.__akCollections;")
  .replace(/import \{ createDocument, updateDocument \} from "\.\/envelope\.js";/, "const { createDocument, updateDocument } = globalThis.__akEnvelope;")
  .replace(/import \{ safeWrite \} from "\.\/errors\.js";/, "const { safeWrite } = globalThis.__akErrors;")
  .replace(/import \{ buildUnitKey \} from "\.\/unit-keys\.js";/, "const { buildUnitKey } = globalThis.__akUnitKeys;")
  .replace(/import \{ isKeyId, MADRASAH_SCOPE \} from "\.\/ayah-keys\.js";/, "const { isKeyId, MADRASAH_SCOPE } = globalThis.__akKeys;");
check("every import of ayah-keys-data.js was replaced (the module under test is the real one)", () => {
  assert.notEqual(source, before);
  assert.ok(!/^import /m.test(source), "an import survived the in-memory replacement");
});
const data = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const T = "t1";
const ctx = { tenantId: T, personId: "p1", uid: "uid-p1" };
const db = {};
const reset = () => { failRead = false; store.clear(); writeLog.length = 0; failures.length = 0; reads.length = 0; failNext = false; };
const stored = (scope, surah) => store.get(`ayahKeyMarks/${T}__${scope}__${surah}`);

await acheck("the first mark CREATES the document with every envelope field, the right id and an entries map", async () => {
  reset();
  const r = await data.setAyahKey(db, ctx, { scope: "p1", surah: 2, ayah: 255, keyId: "hard", on: true });
  assert.deepEqual(r, { ok: true, keys: ["hard"] });
  const d = stored("p1", 2);
  assert.ok(d, "no document at ayahKeyMarks/t1__p1__2");
  assert.equal(d.tenantId, T); assert.equal(d.scope, "p1"); assert.equal(d.surah, 2);
  assert.deepEqual(d.entries, { "ayah:2:255": ["hard"] });
  assert.equal(d.schemaVersion, 1); assert.equal(d.createdBy, "uid-p1");
  assert.ok(d.createdAt && d.updatedAt);
  assert.equal(writeLog.length, 1); assert.equal(writeLog[0].kind, "create");
});
await acheck("the entries key is the real buildUnitKey.ayah(surah, ayah)", async () => {
  assert.ok(Object.keys(stored("p1", 2).entries).includes(globalThis.__akUnitKeys.buildUnitKey.ayah(2, 255)));
});
await acheck("a second key on the same āyah UPDATES one entry (dotted path), stamps updatedAt, never rewrites the document", async () => {
  const r = await data.setAyahKey(db, ctx, { scope: "p1", surah: 2, ayah: 255, keyId: "gharib", on: true });
  assert.deepEqual(r, { ok: true, keys: ["hard", "gharib"] });
  const w = writeLog[writeLog.length - 1];
  assert.equal(w.kind, "update");
  assert.deepEqual(Object.keys(w.data), ["entries.ayah:2:255"]);
  assert.deepEqual(stored("p1", 2).entries["ayah:2:255"], ["hard", "gharib"]);
  assert.ok(stored("p1", 2).updatedAt instanceof Date, "updatedAt was not stamped");
});
await acheck("switching a key on twice does not duplicate it", async () => {
  const r = await data.setAyahKey(db, ctx, { scope: "p1", surah: 2, ayah: 255, keyId: "hard", on: true });
  assert.deepEqual(r.keys, ["hard", "gharib"]);
});
await acheck("a different āyah of the same sūrah is another entry in the same document", async () => {
  await data.setAyahKey(db, ctx, { scope: "p1", surah: 2, ayah: 1, keyId: "asbab", on: true });
  assert.deepEqual(Object.keys(stored("p1", 2).entries).sort(), ["ayah:2:1", "ayah:2:255"]);
  assert.deepEqual(stored("p1", 2).entries["ayah:2:255"], ["hard", "gharib"], "another āyah's keys were disturbed");
});
await acheck("removing a key writes the SHORTER list and deletes nothing", async () => {
  const n = store.size;
  const r = await data.setAyahKey(db, ctx, { scope: "p1", surah: 2, ayah: 255, keyId: "hard", on: false });
  assert.deepEqual(r, { ok: true, keys: ["gharib"] });
  assert.deepEqual(stored("p1", 2).entries["ayah:2:255"], ["gharib"]);
  assert.equal(store.size, n);
});
await acheck("removing the last key stores an EMPTY LIST, not a deletion", async () => {
  await data.setAyahKey(db, ctx, { scope: "p1", surah: 2, ayah: 255, keyId: "gharib", on: false });
  assert.ok(stored("p1", 2), "the document disappeared");
  assert.ok("ayah:2:255" in stored("p1", 2).entries, "the entry disappeared");
  assert.deepEqual(stored("p1", 2).entries["ayah:2:255"], []);
});
await acheck("removing a key from a document that does not exist is a no-op success that writes nothing", async () => {
  reset();
  const r = await data.setAyahKey(db, ctx, { scope: "p1", surah: 5, ayah: 1, keyId: "hard", on: false });
  assert.equal(r.ok, true); assert.deepEqual(r.keys, []);
  assert.equal(writeLog.length, 0); assert.equal(store.size, 0);
});
await acheck("the source never deletes", async () => {
  assert.ok(!/\bdeleteDoc\b|\.delete\(|deleteField/.test(source), "ayah-keys-data.js must never delete");
});
await acheck("the madrasah scope writes to its own document, apart from the person's", async () => {
  reset();
  await data.setAyahKey(db, ctx, { scope: "madrasah", surah: 3, ayah: 7, keyId: "scholars", on: true });
  await data.setAyahKey(db, ctx, { scope: "p1", surah: 3, ayah: 7, keyId: "hard", on: true });
  assert.deepEqual(stored("madrasah", 3).entries, { "ayah:3:7": ["scholars"] });
  assert.deepEqual(stored("p1", 3).entries, { "ayah:3:7": ["hard"] });
  assert.equal(stored("madrasah", 3).scope, "madrasah");
});
await acheck("a request to set a key for someone else names THEIR document (canRecordFor is the Rules' call)", async () => {
  reset();
  await data.setAyahKey(db, ctx, { scope: "s9", surah: 4, ayah: 1, keyId: "hard", on: true });
  assert.ok(stored("s9", 4));
  assert.equal(stored("s9", 4).createdBy, "uid-p1");
});
await acheck("an UNKNOWN key id is refused before any read or write", async () => {
  reset();
  for (const bad of ["Hard", "nope", "", undefined, null, 5]) {
    const r = await data.setAyahKey(db, ctx, { scope: "p1", surah: 2, ayah: 1, keyId: bad, on: true });
    assert.deepEqual(r, { ok: false, refused: "unknown-key" }, String(bad));
  }
  assert.equal(writeLog.length, 0); assert.equal(reads.length, 0); assert.equal(store.size, 0);
});
await acheck("a bad sūrah, āyah or scope is refused before any read or write", async () => {
  reset();
  const base = { scope: "p1", surah: 2, ayah: 1, keyId: "hard", on: true };
  for (const [what, patch, why] of [
    ["surah 0", { surah: 0 }, "bad-ayah"], ["surah 115", { surah: 115 }, "bad-ayah"], ["surah 2.5", { surah: 2.5 }, "bad-ayah"],
    ["surah a string", { surah: "2" }, "bad-ayah"], ["ayah 0", { ayah: 0 }, "bad-ayah"], ["ayah a string", { ayah: "1" }, "bad-ayah"],
    ["scope empty", { scope: "" }, "bad-scope"], ["scope with __", { scope: "a__b" }, "bad-scope"], ["scope missing", { scope: undefined }, "bad-scope"],
  ]) {
    const r = await data.setAyahKey(db, ctx, { ...base, ...patch });
    assert.deepEqual(r, { ok: false, refused: why }, what);
  }
  assert.equal(writeLog.length, 0); assert.equal(reads.length, 0);
});
await acheck("a context without tenantId, personId or uid throws by name", async () => {
  for (const bad of [null, {}, { tenantId: T }, { tenantId: T, personId: "p1" }]) {
    await assert.rejects(() => data.setAyahKey(db, bad, { scope: "p1", surah: 2, ayah: 1, keyId: "hard", on: true }), /ctx must carry/);
    await assert.rejects(() => data.loadSurahKeys(db, bad, 2), /ctx must carry/);
  }
});
await acheck("I15: a failed CREATE reaches the user ({ ok:false, entry }), is reported, and leaves nothing stored", async () => {
  reset();
  failNext = true;
  const r = await data.setAyahKey(db, ctx, { scope: "p1", surah: 2, ayah: 1, keyId: "hard", on: true });
  assert.equal(r.ok, false);
  assert.equal(r.entry.code, "permission-denied");
  assert.equal(failures.length, 1);
  assert.equal(failures[0].context.collection, "ayahKeyMarks");
  assert.equal(failures[0].context.docId, `${T}__p1__2`);
  assert.equal(store.size, 0);
});
await acheck("I15: a failed UPDATE reaches the user and leaves the stored list as it was", async () => {
  reset();
  await data.setAyahKey(db, ctx, { scope: "p1", surah: 2, ayah: 1, keyId: "hard", on: true });
  failNext = true;
  const r = await data.setAyahKey(db, ctx, { scope: "p1", surah: 2, ayah: 1, keyId: "gharib", on: true });
  assert.equal(r.ok, false); assert.equal(failures.length, 1);
  assert.deepEqual(stored("p1", 2).entries["ayah:2:1"], ["hard"]);
});
await acheck("a read that throws inside a write is also reported (I15), not lost", async () => {
  reset();
  failRead = true;
  const r = await data.setAyahKey(db, ctx, { scope: "p1", surah: 2, ayah: 1, keyId: "hard", on: true });
  assert.equal(r.ok, false); assert.equal(failures.length, 1); assert.equal(store.size, 0);
});
await acheck("loadSurahKeys returns { madrasah, mine } in exactly TWO reads (the load contract)", async () => {
  reset();
  await data.setAyahKey(db, ctx, { scope: "madrasah", surah: 6, ayah: 1, keyId: "scholars", on: true });
  await data.setAyahKey(db, ctx, { scope: "p1", surah: 6, ayah: 2, keyId: "hard", on: true });
  await data.setAyahKey(db, ctx, { scope: "other", surah: 6, ayah: 3, keyId: "hard", on: true });
  reads.length = 0;
  const r = await data.loadSurahKeys(db, ctx, 6);
  assert.deepEqual(Object.keys(r).sort(), ["madrasah", "mine"]);
  assert.deepEqual(r.madrasah, { "ayah:6:1": ["scholars"] });
  assert.deepEqual(r.mine, { "ayah:6:2": ["hard"] });
  assert.equal(reads.length, 2, `read ${reads.join(", ")}`);
  assert.deepEqual(reads.sort(), [`ayahKeyMarks/${T}__madrasah__6`, `ayahKeyMarks/${T}__p1__6`]);
});
await acheck("loadSurahKeys on an untouched sūrah is two empty maps; a bad sūrah throws", async () => {
  reset();
  assert.deepEqual(await data.loadSurahKeys(db, ctx, 9), { madrasah: {}, mine: {} });
  for (const bad of [0, 115, 1.5, "2", undefined]) await assert.rejects(() => data.loadSurahKeys(db, ctx, bad), /surah must be/);
});
await acheck("loadSurahKeys returns copies: changing the result does not change the store", async () => {
  reset();
  await data.setAyahKey(db, ctx, { scope: "p1", surah: 7, ayah: 1, keyId: "hard", on: true });
  const r = await data.loadSurahKeys(db, ctx, 7);
  r.mine["ayah:7:9"] = ["x"];
  assert.ok(!("ayah:7:9" in stored("p1", 7).entries));
});
check("AYAH_KEY_WRITES lists exactly the four fields a create writes (the envelope stamps the rest)", () => {
  assert.deepEqual([...data.AYAH_KEY_WRITES], ["tenantId", "scope", "surah", "entries"]);
  assert.ok(Object.isFrozen(data.AYAH_KEY_WRITES));
});

// --- 4. K0: WORDS AND HADITH ------------------------------------------------
const UK = globalThis.__akUnitKeys.buildUnitKey;
const hstored = (scope, coll) => store.get(`hadithKeyMarks/${T}__${scope}__${coll}`);
check("K0: the two new permanent key shapes are exactly qword:<s>:<a>:<pos> and hadithword:<collection>:<n>:<pos>", () => {
  assert.equal(UK.qword(9, 44, 2), "qword:9:44:2");
  assert.equal(UK.hadithWord("hadeethenc", "65070", 3), "hadithword:hadeethenc:65070:3");
  assert.equal(UK.hadith("hadeethenc", "65070"), "hadith:hadeethenc:65070");
  assert.ok(globalThis.__akUnitKeys.UNIT_TYPES.includes("qword") && globalThis.__akUnitKeys.UNIT_TYPES.includes("hadithword"));
});
await acheck("K0: a WORD mark lives in its sūrah's ayahKeyMarks document beside the āyah marks, keyed by buildUnitKey.qword", async () => {
  reset();
  await data.setAyahKey(db, ctx, { scope: "p1", surah: 36, ayah: 38, keyId: "hard", on: true });
  const r = await data.setWordKey(db, ctx, { scope: "p1", surah: 36, ayah: 38, position: 2, keyId: "practice", on: true });
  assert.deepEqual(r, { ok: true, keys: ["practice"] });
  assert.deepEqual(stored("p1", 36).entries, { "ayah:36:38": ["hard"], "qword:36:38:2": ["practice"] });
  assert.equal(store.size, 1, "a word mark made a second document");
  const w = writeLog[writeLog.length - 1];
  assert.equal(w.kind, "update"); assert.deepEqual(Object.keys(w.data), ["entries.qword:36:38:2"]);
});
await acheck("K0: loadSurahKeys returns the word marks too, still in two reads", async () => {
  reads.length = 0;
  const r = await data.loadSurahKeys(db, ctx, 36);
  assert.deepEqual(r.mine, { "ayah:36:38": ["hard"], "qword:36:38:2": ["practice"] });
  assert.equal(reads.length, 2);
});
await acheck("K0: setWordKey refuses a bad position, key, āyah or scope before any read", async () => {
  reset();
  const base = { scope: "p1", surah: 36, ayah: 38, position: 2, keyId: "done", on: true };
  for (const [patch, why] of [[{ position: 0 }, "bad-word"], [{ position: 1.5 }, "bad-word"], [{ position: "2" }, "bad-word"],
    [{ keyId: "Done" }, "unknown-key"], [{ surah: 115 }, "bad-ayah"], [{ ayah: 0 }, "bad-ayah"], [{ scope: "a__b" }, "bad-scope"]]) {
    assert.deepEqual(await data.setWordKey(db, ctx, { ...base, ...patch }), { ok: false, refused: why }, JSON.stringify(patch));
  }
  assert.equal(reads.length, 0); assert.equal(writeLog.length, 0);
});
await acheck("K0: the first HADITH mark creates hadithKeyMarks/{tenant}__{scope}__{collection} with the envelope and its own fields", async () => {
  reset();
  const r = await data.setHadithKey(db, ctx, { scope: "p1", collection: "hadeethenc", number: 65070, keyId: "hard", on: true });
  assert.deepEqual(r, { ok: true, keys: ["hard"] });
  const d = hstored("p1", "hadeethenc");
  assert.ok(d, "no hadithKeyMarks document");
  assert.equal(d.tenantId, T); assert.equal(d.scope, "p1"); assert.equal(d.collection, "hadeethenc");
  assert.ok(!("surah" in d), "a hadith document carries a surah");
  assert.deepEqual(d.entries, { [UK.hadith("hadeethenc", "65070")]: ["hard"] });
  assert.equal(d.createdBy, "uid-p1"); assert.equal(d.schemaVersion, 1);
  assert.equal(writeLog[0].col, "hadithKeyMarks");
});
await acheck("K0: a number given as digits or as a whole number names the SAME hadith", async () => {
  await data.setHadithKey(db, ctx, { scope: "p1", collection: "hadeethenc", number: "65070", keyId: "done", on: true });
  assert.deepEqual(hstored("p1", "hadeethenc").entries["hadith:hadeethenc:65070"], ["hard", "done"]);
});
await acheck("K0: a hadith WORD mark sits in the same collection document, keyed by buildUnitKey.hadithWord", async () => {
  const r = await data.setHadithWordKey(db, ctx, { scope: "p1", collection: "hadeethenc", number: 65070, position: 7, keyId: "hard", on: true });
  assert.deepEqual(r, { ok: true, keys: ["hard"] });
  assert.deepEqual(Object.keys(hstored("p1", "hadeethenc").entries).sort(), ["hadith:hadeethenc:65070", "hadithword:hadeethenc:65070:7"]);
  assert.equal(store.size, 1);
});
await acheck("K0: removing a hadith mark writes the shorter list; the last one leaves an EMPTY list, never a deletion", async () => {
  await data.setHadithWordKey(db, ctx, { scope: "p1", collection: "hadeethenc", number: 65070, position: 7, keyId: "hard", on: false });
  assert.deepEqual(hstored("p1", "hadeethenc").entries["hadithword:hadeethenc:65070:7"], []);
  assert.equal(store.size, 1);
});
await acheck("K0: loadHadithKeys returns { madrasah, mine } in exactly two reads", async () => {
  reset();
  await data.setHadithKey(db, ctx, { scope: "madrasah", collection: "hadeethenc", number: 1, keyId: "scholars", on: true });
  await data.setHadithKey(db, ctx, { scope: "p1", collection: "hadeethenc", number: 2, keyId: "hard", on: true });
  reads.length = 0;
  const r = await data.loadHadithKeys(db, ctx, "hadeethenc");
  assert.deepEqual(r, { madrasah: { "hadith:hadeethenc:1": ["scholars"] }, mine: { "hadith:hadeethenc:2": ["hard"] } });
  assert.deepEqual(reads.sort(), [`hadithKeyMarks/${T}__madrasah__hadeethenc`, `hadithKeyMarks/${T}__p1__hadeethenc`]);
});
await acheck("K0: a bad collection or number is refused before any read; a dot or colon can never reach a field path", async () => {
  reset();
  const base = { scope: "p1", collection: "hadeethenc", number: 5, keyId: "hard", on: true };
  for (const patch of [{ collection: "bukhari" }, { collection: "Bukhari" }, { collection: "a.b" }, { collection: "a:b" }, { collection: "" }, { collection: "a__b" },
    { number: 0 }, { number: -1 }, { number: 1.5 }, { number: "1.2" }, { number: "1:2" }, { number: "" }, { number: "05" }, { number: undefined }]) {
    assert.deepEqual(await data.setHadithKey(db, ctx, { ...base, ...patch }), { ok: false, refused: "bad-hadith" }, JSON.stringify(patch));
    assert.deepEqual(await data.setHadithWordKey(db, ctx, { ...base, position: 1, ...patch }), { ok: false, refused: "bad-hadith" }, JSON.stringify(patch));
  }
  assert.deepEqual(await data.setHadithWordKey(db, ctx, { ...base, position: 0 }), { ok: false, refused: "bad-word" });
  assert.deepEqual(await data.setHadithKey(db, ctx, { ...base, keyId: "nope" }), { ok: false, refused: "unknown-key" });
  assert.deepEqual(await data.setHadithKey(db, ctx, { ...base, scope: "" }), { ok: false, refused: "bad-scope" });
  assert.equal(reads.length, 0); assert.equal(writeLog.length, 0);
  for (const bad of ["bukhari", "Bukhari", "a.b", "", undefined]) await assert.rejects(() => data.loadHadithKeys(db, ctx, bad), /collection must be/);
});
await acheck("K0: the teacher's view reads ONE other person's document, one read, and refuses the madrasah scope", async () => {
  reset();
  await data.setAyahKey(db, ctx, { scope: "s9", surah: 36, ayah: 1, keyId: "hard", on: true });
  await data.setHadithKey(db, ctx, { scope: "s9", collection: "hadeethenc", number: 3, keyId: "practice", on: true });
  reads.length = 0;
  assert.deepEqual(await data.loadPersonSurahKeys(db, ctx, 36, "s9"), { "ayah:36:1": ["hard"] });
  assert.deepEqual(await data.loadPersonHadithKeys(db, ctx, "hadeethenc", "s9"), { "hadith:hadeethenc:3": ["practice"] });
  assert.deepEqual(reads, [`ayahKeyMarks/${T}__s9__36`, `hadithKeyMarks/${T}__s9__hadeethenc`]);
  for (const bad of ["madrasah", "", "a__b", undefined]) {
    await assert.rejects(() => data.loadPersonSurahKeys(db, ctx, 36, bad), /personId must be/);
    await assert.rejects(() => data.loadPersonHadithKeys(db, ctx, "hadeethenc", bad), /personId must be/);
  }
});
await acheck("K0: I15 -- a failed hadith write reaches the user and names hadithKeyMarks", async () => {
  reset();
  failNext = true;
  const r = await data.setHadithKey(db, ctx, { scope: "p1", collection: "hadeethenc", number: 9, keyId: "hard", on: true });
  assert.equal(r.ok, false); assert.equal(failures.length, 1);
  assert.equal(failures[0].context.collection, "hadithKeyMarks");
  assert.equal(failures[0].context.docId, `${T}__p1__hadeethenc`);
});
check("K0: HADITH_KEY_COLLECTIONS is exactly [\"hadeethenc\"] (Owner decision 7; another edition is an Owner decision)", () => {
  assert.deepEqual([...data.HADITH_KEY_COLLECTIONS], ["hadeethenc"]);
  assert.ok(Object.isFrozen(data.HADITH_KEY_COLLECTIONS));
});
check("HADITH_KEY_WRITES lists exactly the four fields a hadith create writes", () => {
  assert.deepEqual([...data.HADITH_KEY_WRITES], ["tenantId", "scope", "collection", "entries"]);
  assert.ok(Object.isFrozen(data.HADITH_KEY_WRITES));
});
await acheck("every create the source makes carries exactly the declared fields (AYAH_KEY_WRITES / HADITH_KEY_WRITES)", async () => {
  reset();
  await data.setAyahKey(db, ctx, { scope: "p1", surah: 1, ayah: 1, keyId: "hard", on: true });
  await data.setWordKey(db, ctx, { scope: "p1", surah: 2, ayah: 1, position: 1, keyId: "hard", on: true });
  await data.setHadithKey(db, ctx, { scope: "p1", collection: "hadeethenc", number: 1, keyId: "hard", on: true });
  await data.setHadithWordKey(db, ctx, { scope: "p2", collection: "hadeethenc", number: 2, position: 1, keyId: "hard", on: true });
  const creates = writeLog.filter((w) => w.kind === "create");
  assert.equal(creates.length, 4);
  for (const w of creates) {
    const want = w.col === "hadithKeyMarks" ? data.HADITH_KEY_WRITES : data.AYAH_KEY_WRITES;
    assert.deepEqual(Object.keys(w.data).sort(), [...want].sort(), `${w.col}/${w.id}`);
  }
});

console.log(`\n==== Ayah keys: ${passed} passed, ${failed} failed ====`);
process.exit(failed === 0 ? 0 : 1);
