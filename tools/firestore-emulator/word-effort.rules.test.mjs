// MSA · QR J136 -- the CANDIDATE ayahKeyMarks Rules with the optional `effort` map (docs/proposals/word-effort.candidate.rules),
// executed on the Firestore emulator. Isolated: a demo- project, 127.0.0.1, and the candidate's own block swapped into the DEPLOYED
// firestore.rules (so every helper is the real one); never production.
//
// Every denial is paired with an allow differing in ONE fact. Then each effort-specific check is MUTATED (every occurrence replaced,
// the count printed) and the matrix must go red; and the SAME effort writes are shown to be DENIED by the published Rules, which is
// the reason the app cannot save "Already Known" / "Very Hard" until the Owner publishes this.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const PROJECT = "demo-mmsa-word-effort";
const HOST = "127.0.0.1";
const PORT = 8110;
assert.match(PROJECT, /^demo-/);
assert.equal(HOST, "127.0.0.1");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const live = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const candidate = fs.readFileSync(path.join(root, "docs/proposals/word-effort.candidate.rules"), "utf8");

function blockBounds(text) {
  const start = text.search(/^    match \/ayahKeyMarks\/\{markKey\} \{/m);
  assert.notEqual(start, -1, "no ayahKeyMarks block");
  let depth = 0;
  for (let i = text.indexOf("} {", start) + 2; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return [start, i + 1];
  }
  throw new Error("unterminated ayahKeyMarks block");
}
const [cs, ce] = blockBounds(candidate);
const candidateBlock = candidate.slice(cs, ce);
const [ls, le] = blockBounds(live);
/** The deployed firestore.rules with its ayahKeyMarks block replaced by `block`. */
const withBlock = (block) => live.slice(0, ls) + block + live.slice(le);
const RULES_CANDIDATE = withBlock(candidateBlock);

const T = "t1";
const ENV = (uid, o = {}) => ({ schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: uid, ...o });
const mark = (scope, surah, uid, o = {}) => ({ tenantId: T, scope, surah, entries: { [`qword:${surah}:1:1`]: ["hard"] }, ...ENV(uid), ...o });
const bigMap = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`qword:2:${1 + Math.floor(i / 50)}:${1 + (i % 50)}`, "easy"]));

async function matrix(rules, { expectPublished = true } = {}) {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules } });
  const bad = [];
  const expect = async (name, kind, promise) => {
    try { await (kind === "ok" ? assertSucceeds(promise) : assertFails(promise)); } catch { bad.push(name); }
  };
  // a case that is only allowed once the candidate is in place
  const effortCase = (name, kind, promise) => expect(name, expectPublished ? kind : "no", promise);
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const member = (uid, personId, roles) => setDoc(doc(db, "tenantMemberUids", `${T}__${uid}`), { tenantId: T, uid, personId, roles });
      await member("uid-o1", "o1", ["owner"]);
      await member("uid-s1", "s1", ["student"]);
      await member("uid-s2", "s2", ["student"]);
      await member("uid-g1", "g1", ["guardian"]);
      const person = (id, extra = {}) => setDoc(doc(db, "tenantPeople", id), { personId: id, tenantId: T, ...extra });
      await person("o1", { authUid: "uid-o1" });
      await person("s1", { authUid: "uid-s1", managedByPersonId: "g1" });
      await person("s2", { authUid: "uid-s2" });
      await person("g1", { authUid: "uid-g1" });
      // an OLD document, written before this round: it has no effort field
      await setDoc(doc(db, "ayahKeyMarks", `${T}__s1__1`), mark("s1", 1, "uid-s1"));
      await setDoc(doc(db, "ayahKeyMarks", `${T}__s2__1`), mark("s2", 1, "uid-s2"));
    });
    const as = (uid) => env.authenticatedContext(uid).firestore();
    const s1 = as("uid-s1"), s2 = as("uid-s2"), g1 = as("uid-g1"), o1 = as("uid-o1");
    const K = (db, id) => doc(db, "ayahKeyMarks", id);
    const P = (personId, surah) => `${T}__${personId}__${surah}`;
    const now = () => new Date();

    // --- what has always worked keeps working (the old shape, no effort)
    await expect("an OLD-shape document (no effort) is still created", "ok", setDoc(K(s1, P("s1", 2)), mark("s1", 2, "uid-s1")));
    await expect("an OLD document is still updated through `entries` alone", "ok", updateDoc(K(s1, P("s1", 1)), { "entries.qword:1:1:2": ["done"], updatedAt: now() }));
    await expect("an OLD document is still readable", "ok", getDoc(K(s1, P("s1", 1))));

    // --- effort: the person writes their own (the new fact differs from the line above in ONE thing: the field)
    await effortCase("create WITH a valid effort map", "ok", setDoc(K(s1, P("s1", 3)), mark("s1", 3, "uid-s1", { effort: { "qword:3:1:1": "very" } })));
    await effortCase("create WITH an EMPTY effort map", "ok", setDoc(K(s1, P("s1", 4)), mark("s1", 4, "uid-s1", { effort: {} })));
    await effortCase("update ADDS one effort entry (dotted path)", "ok", updateDoc(K(s1, P("s1", 1)), { "effort.qword:1:1:1": "known", updatedAt: now() }));
    await effortCase("update changes entries AND effort together", "ok", updateDoc(K(s2, P("s2", 1)), { "entries.qword:1:1:1": ["hard"], "effort.qword:1:1:1": "very", updatedAt: now() }));
    await effortCase("update clears an effort entry with null (never a delete)", "ok", updateDoc(K(s2, P("s2", 1)), { "effort.qword:1:1:1": null, updatedAt: now() }));
    await effortCase("the guardian writes their child's effort", "ok", updateDoc(K(g1, P("s1", 1)), { "effort.qword:1:1:3": "easy", updatedAt: now() }));
    await effortCase("the owner writes a student's effort (canRecordFor)", "ok", updateDoc(K(o1, P("s2", 1)), { "effort.qword:1:1:4": "easy", updatedAt: now() }));

    // --- effort: who may NOT (each pairs with an allow above on the same field)
    await expect("another student writes the effort of s1", "no", updateDoc(K(s2, P("s1", 1)), { "effort.qword:1:1:5": "easy", updatedAt: now() }));
    await expect("the guardian writes the effort of ANOTHER child", "no", updateDoc(K(g1, P("s2", 1)), { "effort.qword:1:1:5": "easy", updatedAt: now() }));
    await expect("a student writes effort into the MADRASAH document", "no", setDoc(K(s1, `${T}__madrasah__5`), mark("madrasah", 5, "uid-s1", { effort: { "qword:5:1:1": "easy" } })));

    // --- effort: the shape (the Rules bound the SHAPE and the SIZE; the client checks the three words)
    await effortCase("effort a LIST is refused", "no", setDoc(K(s1, P("s1", 6)), mark("s1", 6, "uid-s1", { effort: ["easy"] })));
    await effortCase("effort a STRING is refused", "no", setDoc(K(s1, P("s1", 7)), mark("s1", 7, "uid-s1", { effort: "easy" })));
    await effortCase("effort null is refused (it is a map or it is absent)", "no", setDoc(K(s1, P("s1", 8)), mark("s1", 8, "uid-s1", { effort: null })));
    await effortCase("update makes effort a list", "no", updateDoc(K(s1, P("s1", 1)), { effort: ["x"], updatedAt: now() }));
    await effortCase("effort of exactly 7000 words is allowed", "ok", setDoc(K(s1, P("s1", 9)), mark("s1", 9, "uid-s1", { effort: bigMap(7000) })));
    await effortCase("effort of 7001 words is refused", "no", setDoc(K(s1, P("s1", 10)), mark("s1", 10, "uid-s1", { effort: bigMap(7001) })));
    await expect("an UNKNOWN field is still refused", "no", setDoc(K(s1, P("s1", 11)), mark("s1", 11, "uid-s1", { surprise: 1 })));
    await expect("an UNKNOWN field beside a valid effort is refused", "no", setDoc(K(s1, P("s1", 12)), mark("s1", 12, "uid-s1", { effort: {}, surprise: 1 })));

    // --- everything else the published block guarded still holds with effort present
    await effortCase("effort + wrong createdBy is refused", "no", setDoc(K(s1, P("s1", 13)), mark("s1", 13, "uid-s2", { effort: {} })));
    await effortCase("effort + key says surah 15 but field says 14 is refused", "no", setDoc(K(s1, P("s1", 15)), mark("s1", 14, "uid-s1", { effort: {} })));
    await effortCase("effort + create for SOMEONE ELSE is refused", "no", setDoc(K(s2, P("s1", 16)), mark("s1", 16, "uid-s2", { effort: {} })));
  } finally {
    await env.cleanup();
  }
  return bad;
}

test("the candidate (swapped into the deployed Rules) behaves exactly as the matrix says", async () => {
  const bad = await matrix(RULES_CANDIDATE);
  assert.deepEqual(bad, [], `cases that did not behave: ${bad.join(" | ")}`);
});

test("the PUBLISHED Rules refuse every effort write (why the app says 'cannot be saved yet') and still allow every old-shape write", async () => {
  const bad = await matrix(live, { expectPublished: false });
  assert.deepEqual(bad, [], `cases that did not behave under the published Rules: ${bad.join(" | ")}`);
});

// Mutations of the effort-specific checks. Each must turn the candidate matrix red.
const MUTATIONS = [
  ["effort not allowed in the field list", /'tenantId', 'scope', 'surah', 'entries', 'effort',/g, "'tenantId', 'scope', 'surah', 'entries',"],
  ["effort type unchecked (any value)", /\(d\(\)\.effort is map && d\(\)\.effort\.size\(\) <= 7000\)/g, "true"],
  ["effort size unbounded", / && d\(\)\.effort\.size\(\) <= 7000/g, ""],
  ["effort size bound doubled (an off-by-a-lot cap)", /d\(\)\.effort\.size\(\) <= 7000/g, "d().effort.size() <= 14000"],
  ["effortOk never consulted", /\n\s*&& effortOk\(\)/g, ""],
  ["effortOk always false when present", /\(d\(\)\.effort is map && d\(\)\.effort\.size\(\) <= 7000\)/g, "false"],
];
for (const [name, re, replacement] of MUTATIONS) {
  test(`MUTATION: ${name} -> the matrix goes red`, async () => {
    const count = (candidateBlock.match(re) || []).length;
    console.log(`    [${name}] occurrences replaced: ${count}`);
    assert.ok(count >= 1, "the mutation matched nothing -- it proves nothing");
    const bad = await matrix(withBlock(candidateBlock.replace(re, replacement)));
    assert.ok(bad.length >= 1, "the matrix stayed green under this mutation: that check is untested");
  });
}
