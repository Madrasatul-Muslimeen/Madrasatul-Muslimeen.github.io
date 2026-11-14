// PCF MSA J106 S3 part 2 -- the REAL write plan (app/js/hadith-names-model.js writePlan, setName, retireName) and the REAL
// envelope (app/js/envelope.js createDocument / updateDocument) run against the REAL emulator on the hadithNames Rules
// CANDIDATE (tests/firestore/hadith-names-v1.proposed.rules). This is what saveHadithNames() sends, so a payload the Rules
// would refuse in production fails here, in front of the Owner's publish.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-hadith-names-real-function";
const HOST = "127.0.0.1";
const PORT = 8089;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const candidate = fs.readFileSync(path.resolve(root, "tests/firestore/hadith-names-v1.proposed.rules"), "utf8");
assert.match(PROJECT, /^demo-/);
assert.equal(HOST, "127.0.0.1");

const GSTATIC = /import\s*\{[\s\S]*?\}\s*from\s*"https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/;
const firestoreUrl = import.meta.resolve("firebase/firestore");
const dataUrl = (src) => `data:text/javascript;base64,${Buffer.from(src).toString("base64")}`;
let envelope = fs.readFileSync(path.join(root, "app/js/envelope.js"), "utf8");
assert.match(envelope, GSTATIC, "envelope.js: its gstatic Firestore import moved -- update this loader");
envelope = envelope.replace(GSTATIC, `import { doc, setDoc, updateDoc, writeBatch, runTransaction, serverTimestamp } from "${firestoreUrl}";`);
const { createDocument, updateDocument } = await import(dataUrl(envelope));
const model = await import(pathToFileURL(path.join(root, "app/js/hadith-names-model.js")).href);
const { writePlan, setName, retireName, bookKey, groupKey, namesFrom, nameOf } = model;
assert.equal(typeof writePlan, "function", "the loader is broken");

const T = "t1";
const URI = "0256Bukhari.Sahih.JK000110-ara1";
const ctx0 = { by: "pO", at: "2026-11-14T00:00:00.000Z" };

// Does exactly what saveHadithNames does with a plan, on the given Firestore (the envelope stamps it).
const send = (db, uid, args) => {
  const plan = writePlan(args);
  return plan.kind === "create" ? createDocument(db, "hadithNames", T, plan.data, uid) : updateDocument(db, "hadithNames", T, plan.data);
};

test("the real hadithNames write plan against the candidate Rules", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (c) => {
      const db = c.firestore();
      const member = (uid, personId, roles) => setDoc(doc(db, "tenantMemberUids", `${T}__${uid}`), { tenantId: T, uid, personId, roles });
      await member("uid-owner", "pO", ["owner"]);
      await member("uid-prime", "pP", ["prime"]);
      await member("uid-teacher", "pT", ["teacher"]);
    });
    const owner = env.authenticatedContext("uid-owner").firestore();
    const prime = env.authenticatedContext("uid-prime").firestore();
    const teacher = env.authenticatedContext("uid-teacher").firestore();
    let n = 0;
    const ok = async (id, name, p) => { await assertSucceeds(p); n++; console.log(`  PASS  ${id}  ${name}`); };
    const no = async (id, name, p) => { await assertFails(p); n++; console.log(`  PASS  ${id}  ${name}`); };
    const fact = (id, name, cond, detail = "") => { assert.ok(cond, `${id} ${name} ${detail}`); n++; console.log(`  PASS  ${id}  ${name}`); };
    const read = async () => { let d; await env.withSecurityRulesDisabled(async (c) => { d = (await getDoc(doc(c.firestore(), "hadithNames", T))).data(); }); return d; };

    // The first write: the book's own Bangla name, a create.
    const first = setName({}, bookKey(URI), { bn: "সহীহ বুখারী" }, ctx0);
    fact("RN-00", "the book key has no dot and the chapter key is book + __ + chapter id", bookKey(URI) === "0256Bukhari_Sahih_JK000110-ara1" && groupKey(URI, "ch-3") === "0256Bukhari_Sahih_JK000110-ara1__ch-3");
    await no("RN-01", "a teacher's first write (create) is refused", send(teacher, "uid-teacher", { tenantId: T, names: first.names, keys: [bookKey(URI)], docExists: false }));
    await ok("RN-02", "the owner's first write (create) is accepted", send(owner, "uid-owner", { tenantId: T, names: first.names, keys: [bookKey(URI)], docExists: false }));
    const d1 = await read();
    fact("RN-02b", "...stored with the envelope stamps and the one name", d1.tenantId === T && d1.schemaVersion === 1 && d1.createdBy === "uid-owner" && !!d1.createdAt && !!d1.updatedAt && d1.names[bookKey(URI)].bn === "সহীহ বুখারী" && d1.names[bookKey(URI)].status === "active", JSON.stringify(d1));

    // Naming a chapter: an update of ONE dotted key.
    let names = namesFrom(d1);
    const ch = setName(names, groupKey(URI, "ch-3"), { bn: "ঈমানের কিতাব" }, ctx0);
    await no("RN-03", "a teacher's update of one name is refused", send(teacher, "uid-teacher", { tenantId: T, names: ch.names, keys: [groupKey(URI, "ch-3")], docExists: true }));
    await ok("RN-04", "a prime's update of one chapter name is accepted", send(prime, "uid-prime", { tenantId: T, names: ch.names, keys: [groupKey(URI, "ch-3")], docExists: true }));
    const d2 = await read();
    fact("RN-04b", "...the chapter is named and the book's name was left alone", d2.names[groupKey(URI, "ch-3")].bn === "ঈমানের কিতাব" && d2.names[bookKey(URI)].bn === "সহীহ বুখারী", JSON.stringify(d2.names));
    fact("RN-04c", "...the identity fields are untouched", d2.createdBy === "uid-owner" && d2.tenantId === T && d2.schemaVersion === 1);

    // Retire: the entry stays, marked retired, and stops showing.
    names = namesFrom(d2);
    const ret = retireName(names, groupKey(URI, "ch-3"), ctx0);
    await ok("RN-05", "retiring a name (an update) is accepted", send(owner, "uid-owner", { tenantId: T, names: ret.names, keys: [groupKey(URI, "ch-3")], docExists: true }));
    const d3 = await read();
    fact("RN-05b", "...the entry is kept as retired, its words and all (nothing removed)", d3.names[groupKey(URI, "ch-3")].status === "retired" && d3.names[groupKey(URI, "ch-3")].bn === "ঈমানের কিতাব");
    fact("RN-05c", "...and a retired name does not show", nameOf(namesFrom(d3), groupKey(URI, "ch-3"), "bn") === null);
    // Restore by setting it again.
    const back = setName(namesFrom(d3), groupKey(URI, "ch-3"), { bn: "কিতাবুল ঈমান" }, ctx0);
    await ok("RN-06", "setting it again restores it under the same key", send(owner, "uid-owner", { tenantId: T, names: back.names, keys: [groupKey(URI, "ch-3")], docExists: true }));
    const d4 = await read();
    fact("RN-06b", "...active again with the new words, still one entry for that chapter", d4.names[groupKey(URI, "ch-3")].status === "active" && d4.names[groupKey(URI, "ch-3")].bn === "কিতাবুল ঈমান" && Object.keys(d4.names).length === 2);
    await no("RN-07", "a create when the document already exists is not what the writer sends (a create over it is refused)", send(owner, "uid-owner", { tenantId: T, names: back.names, keys: [], docExists: false }));
    console.log(`  ${n} checks`);
  } finally {
    await env.cleanup();
  }
});
