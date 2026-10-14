// PCF J25, Builder round Z1 -- the family Zab Rules CANDIDATE (zabPockets, zabItems) on the Firestore emulator.
// Isolated: a demo- project id, 127.0.0.1, and the candidate text itself, never production.
//
// Every denial is paired with an allow differing in ONE fact. Then each check in the candidate is MUTATED, one at a
// time (EVERY occurrence replaced, the count printed), and the matrix must go red for each mutation.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, deleteField, collection, query, where } from "firebase/firestore";

const PROJECT = "demo-mmsa-zab";
const HOST = "127.0.0.1";
const PORT = 8108;
assert.match(PROJECT, /^demo-/);
assert.equal(HOST, "127.0.0.1");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const candidate = fs.readFileSync(path.join(root, process.env.RULES_FILE || "docs/governance/2026-10-14-zab-candidate.rules"), "utf8");
const live = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");

// The candidate is the live file plus the two Zab blocks: every live line is still there, in order.
test("the candidate is firestore.rules plus the Zab blocks and nothing else", () => {
  const cand = candidate.split("\n");
  let j = 0; const missing = [];
  for (const line of live.split("\n")) {
    let k = j; while (k < cand.length && cand[k] !== line) k++;
    if (k < cand.length) j = k + 1; else missing.push(line);
  }
  assert.deepEqual(missing, [], "live Rules lines missing from the candidate");
  assert.ok(/match \/zabPockets\//.test(candidate) && /match \/zabItems\//.test(candidate));
  assert.ok(!/match \/zab/.test(live), "the live Rules already carry Zab: this candidate is superseded");
});

const T = "t1";
const ENV = (uid = "uid-p1", o = {}) => ({ schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: uid, ...o });
const pocket = (id = "a", o = {}) => ({ pocketId: id, tenantId: T, addedByPersonId: "p1", status: "active", order: 1, name: "To memorise", icon: "x", color: "#2f7d5b", ...ENV(), ...o });
const item = (id = "i1", o = {}) => ({ itemId: id, tenantId: T, pocketId: "a", addedByPersonId: "p1", status: "active", order: 1, text: "Learn", done: false, ...ENV(), ...o });
const without = (obj, ...keys) => { const c = { ...obj }; for (const k of keys) delete c[k]; return c; };

/** Runs the whole matrix against `rules`; returns the names of the cases that did NOT behave. */
async function matrix(rules) {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules } });
  const bad = [];
  const expect = async (name, kind, promise) => {
    try { await (kind === "ok" ? assertSucceeds(promise) : assertFails(promise)); } catch { bad.push(name); }
  };
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { tenantId: T, uid: "uid-p1", personId: "p1", roles: ["guardian"] });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p2`), { tenantId: T, uid: "uid-p2", personId: "p2", roles: ["student"] });
      await setDoc(doc(db, "tenantMemberUids", "t2__uid-x1"), { tenantId: "t2", uid: "uid-x1", personId: "x1", roles: ["owner"] });
      await setDoc(doc(db, "zabPockets", `${T}__seed`), pocket("seed"));
      await setDoc(doc(db, "zabItems", `${T}__seed`), item("seed"));
    });
    const p1 = env.authenticatedContext("uid-p1").firestore();
    const p2 = env.authenticatedContext("uid-p2").firestore();
    const x1 = env.authenticatedContext("uid-x1").firestore();   // another tenant's owner
    const anon = env.unauthenticatedContext().firestore();
    const P = (db, id) => doc(db, "zabPockets", `${T}__${id}`);
    const I = (db, id) => doc(db, "zabItems", `${T}__${id}`);

    // --- tenant membership: a member allowed vs a person of another tenant denied (differ in ONE fact: the person)
    await expect("member creates pocket", "ok", setDoc(P(p1, "a"), pocket("a")));
    await expect("OTHER-TENANT person creates pocket", "no", setDoc(P(x1, "b"), pocket("b", ENV("uid-x1"))));
    await expect("OTHER-TENANT person creates pocket (as themself)", "no", setDoc(P(x1, "b2"), pocket("b2", { addedByPersonId: "x1", ...ENV("uid-x1") })));
    await expect("member creates item", "ok", setDoc(I(p1, "i1"), item("i1")));
    await expect("OTHER-TENANT person creates item", "no", setDoc(I(x1, "i2"), item("i2", ENV("uid-x1"))));
    await expect("anonymous creates pocket", "no", setDoc(P(anon, "c"), pocket("c")));
    // a second member of the same family may create too (shared Zab)
    await expect("second member creates pocket", "ok", setDoc(P(p2, "d"), pocket("d", { addedByPersonId: "p2", ...ENV("uid-p2") })));

    // --- reads
    await expect("member reads pocket", "ok", getDoc(P(p2, "seed")));
    await expect("other-tenant person reads pocket", "no", getDoc(P(x1, "seed")));
    await expect("anonymous reads pocket", "no", getDoc(P(anon, "seed")));
    await expect("member reads item", "ok", getDoc(I(p2, "seed")));
    await expect("other-tenant person reads item", "no", getDoc(I(x1, "seed")));
    await expect("member lists pockets of own tenant", "ok", getDocs(query(collection(p1, "zabPockets"), where("tenantId", "==", T))));
    await expect("other-tenant person lists the same pockets", "no", getDocs(query(collection(x1, "zabPockets"), where("tenantId", "==", T))));
    await expect("member lists items of own tenant", "ok", getDocs(query(collection(p1, "zabItems"), where("tenantId", "==", T))));
    await expect("other-tenant person lists the same items", "no", getDocs(query(collection(x1, "zabItems"), where("tenantId", "==", T))));

    // --- a well-formed create vs a missing tenantId / schemaVersion (and a missing required field)
    await expect("well-formed pocket", "ok", setDoc(P(p1, "e"), pocket("e")));
    await expect("pocket missing tenantId", "no", setDoc(P(p1, "f"), without(pocket("f"), "tenantId")));
    await expect("pocket missing schemaVersion", "no", setDoc(P(p1, "g"), without(pocket("g"), "schemaVersion")));
    await expect("pocket missing name", "no", setDoc(P(p1, "g2"), without(pocket("g2"), "name")));
    await expect("pocket missing addedByPersonId", "no", setDoc(P(p1, "g3"), without(pocket("g3"), "addedByPersonId")));
    await expect("well-formed item", "ok", setDoc(I(p1, "j"), item("j")));
    await expect("item missing tenantId", "no", setDoc(I(p1, "k"), without(item("k"), "tenantId")));
    await expect("item missing schemaVersion", "no", setDoc(I(p1, "l"), without(item("l"), "schemaVersion")));
    await expect("item missing text", "no", setDoc(I(p1, "l2"), without(item("l2"), "text")));

    await expect("envelope createdAt not a timestamp", "no", setDoc(P(p1, "env1"), pocket("env1", { createdAt: "yesterday" })));
    await expect("envelope schemaVersion not a number", "no", setDoc(P(p1, "env2"), pocket("env2", { schemaVersion: "1" })));

    // --- the key must be tenantId__id
    await expect("pocket right key", "ok", setDoc(doc(p1, "zabPockets", `${T}__m`), pocket("m")));
    await expect("pocket WRONG key (id mismatch)", "no", setDoc(doc(p1, "zabPockets", `${T}__other`), pocket("m2")));
    await expect("pocket WRONG key (tenant mismatch)", "no", setDoc(doc(p1, "zabPockets", `t9__m3`), pocket("m3")));
    await expect("item right key", "ok", setDoc(doc(p1, "zabItems", `${T}__n`), item("n")));
    await expect("item WRONG key (id mismatch)", "no", setDoc(doc(p1, "zabItems", `${T}__other`), item("n2")));

    // --- who made it, and who the write is stamped as
    await expect("addedByPersonId is the writer's own person", "ok", setDoc(P(p2, "o"), pocket("o", { addedByPersonId: "p2", ...ENV("uid-p2") })));
    await expect("addedByPersonId names SOMEONE ELSE", "no", setDoc(P(p2, "o2"), pocket("o2", { addedByPersonId: "p1", ...ENV("uid-p2") })));
    await expect("createdBy is the writer's uid", "ok", setDoc(I(p2, "o3"), item("o3", { addedByPersonId: "p2", ...ENV("uid-p2") })));
    await expect("createdBy names SOMEONE ELSE", "no", setDoc(I(p2, "o4"), item("o4", { addedByPersonId: "p2", ...ENV("uid-p1") })));

    // --- unknown field denied vs a known optional field allowed
    await expect("pocket with a known optional field", "ok", setDoc(P(p1, "q"), pocket("q", { parentId: "a", names: { en: "x", bn: "y" } })));
    await expect("pocket with an UNKNOWN field", "no", setDoc(P(p1, "q2"), pocket("q2", { surprise: 1 })));
    await expect("pocket using `kind` instead of `ztype`", "no", setDoc(P(p1, "q3"), pocket("q3", { kind: "links" })));
    await expect("item with a known optional field", "ok", setDoc(I(p1, "r"), item("r", { tags: ["t"], url: "https://x" })));
    await expect("item with an UNKNOWN field", "no", setDoc(I(p1, "r2"), item("r2", { surprise: 1 })));

    // --- ztype: one of five vs outside
    for (const z of ["plain", "links", "tasks", "ideas", "shop"]) await expect(`ztype ${z}`, "ok", setDoc(P(p1, `z-${z}`), pocket(`z-${z}`, { ztype: z })));
    await expect("ztype outside the five", "no", setDoc(P(p1, "z-bad"), pocket("z-bad", { ztype: "notes" })));

    // --- value shapes (each paired with the valid value)
    await expect("status trashed", "ok", setDoc(P(p1, "s1"), pocket("s1", { status: "trashed", deletedAt: new Date() })));
    await expect("status outside active/trashed", "no", setDoc(P(p1, "s2"), pocket("s2", { status: "deleted" })));
    await expect("colour hex", "ok", setDoc(P(p1, "s3"), pocket("s3", { color: "#fff" })));
    await expect("colour not hex", "no", setDoc(P(p1, "s4"), pocket("s4", { color: "red" })));
    await expect("order a number", "ok", setDoc(P(p1, "s5"), pocket("s5", { order: 0 })));
    await expect("order a string", "no", setDoc(P(p1, "s6"), pocket("s6", { order: "0" })));
    await expect("stars 3", "ok", setDoc(I(p1, "t1"), item("t1", { stars: 3 })));
    await expect("stars 4", "no", setDoc(I(p1, "t2"), item("t2", { stars: 4 })));
    await expect("stars 0", "no", setDoc(I(p1, "t2b"), item("t2b", { stars: 0 })));
    await expect("due YYYY-MM-DD", "ok", setDoc(I(p1, "t3"), item("t3", { due: "2026-10-20" })));
    await expect("due malformed", "no", setDoc(I(p1, "t4"), item("t4", { due: "20/10/2026" })));
    await expect("done a boolean", "ok", setDoc(I(p1, "t5"), item("t5", { done: true })));
    await expect("done a string", "no", setDoc(I(p1, "t6"), item("t6", { done: "yes" })));
    await expect("tags a list", "ok", setDoc(I(p1, "t7"), item("t7", { tags: ["a"] })));
    await expect("tags a string", "no", setDoc(I(p1, "t8"), item("t8", { tags: "a" })));
    await expect("steps a list", "ok", setDoc(I(p1, "t9"), item("t9", { steps: [{ id: "s", t: "x", d: false }] })));
    await expect("url a string", "ok", setDoc(I(p1, "u1"), item("u1", { url: "https://x" })));
    await expect("url a number", "no", setDoc(I(p1, "u2"), item("u2", { url: 5 })));

    // --- update: any member; identity fields frozen; trash and restore
    await expect("member updates pocket (rename)", "ok", updateDoc(P(p2, "a"), { name: "Renamed", updatedAt: new Date() }));
    await expect("update changes tenantId", "no", updateDoc(P(p1, "a"), { tenantId: "t2", updatedAt: new Date() }));
    await expect("update changes addedByPersonId", "no", updateDoc(P(p1, "a"), { addedByPersonId: "p2", updatedAt: new Date() }));
    await expect("update changes createdBy", "no", updateDoc(P(p1, "a"), { createdBy: "uid-p2", updatedAt: new Date() }));
    await expect("update adds an unknown field", "no", updateDoc(P(p1, "a"), { surprise: 1, updatedAt: new Date() }));
    await expect("update sets ztype outside the five", "no", updateDoc(P(p1, "a"), { ztype: "kind", updatedAt: new Date() }));
    await expect("update sets ztype inside the five", "ok", updateDoc(P(p1, "a"), { ztype: "tasks", updatedAt: new Date() }));
    await expect("other-tenant person updates pocket", "no", updateDoc(P(x1, "a"), { name: "Hijack", updatedAt: new Date() }));
    await expect("trash a pocket", "ok", updateDoc(P(p1, "a"), { status: "trashed", deletedAt: new Date(), updatedAt: new Date() }));
    await expect("restore a pocket (deletedAt removed)", "ok", updateDoc(P(p1, "a"), { status: "active", deletedAt: deleteField(), updatedAt: new Date() }));
    await expect("rename removes `names`", "ok", updateDoc(P(p1, "q"), { name: "Mine", names: deleteField(), updatedAt: new Date() }));
    await expect("member moves an item to another pocket", "ok", updateDoc(I(p2, "i1"), { pocketId: "d", updatedAt: new Date() }));
    await expect("update changes an item's tenantId", "no", updateDoc(I(p1, "i1"), { tenantId: "t2", updatedAt: new Date() }));
    await expect("update changes an item's addedByPersonId", "no", updateDoc(I(p1, "i1"), { addedByPersonId: "p2", updatedAt: new Date() }));
    await expect("update changes an item's createdBy", "no", updateDoc(I(p1, "i1"), { createdBy: "uid-p2", updatedAt: new Date() }));
    await expect("update sets stars 4", "no", updateDoc(I(p1, "i1"), { stars: 4, updatedAt: new Date() }));
    await expect("update sets stars 2", "ok", updateDoc(I(p1, "i1"), { stars: 2, updatedAt: new Date() }));
    await expect("tick an item", "ok", updateDoc(I(p2, "i1"), { done: true, updatedAt: new Date() }));
    await expect("other-tenant person ticks an item", "no", updateDoc(I(x1, "i1"), { done: true, updatedAt: new Date() }));
    await expect("trash an item", "ok", updateDoc(I(p1, "i1"), { status: "trashed", deletedAt: new Date(), updatedAt: new Date() }));

    // --- delete: never (each paired with an update on the same document that IS allowed)
    await expect("member deletes a pocket", "no", deleteDoc(P(p1, "a")));
    await expect("member deletes an item", "no", deleteDoc(I(p1, "i1")));
    await expect("same pocket, an update", "ok", updateDoc(P(p1, "a"), { icon: "y", updatedAt: new Date() }));
    await expect("same item, an update", "ok", updateDoc(I(p1, "i1"), { text: "again", updatedAt: new Date() }));

    // --- the read-before-create probe (a nonexistent document leaks nothing)
    await expect("signed-in read of a missing pocket", "ok", getDoc(P(x1, "nope")));
    await expect("anonymous read of a missing pocket", "no", getDoc(P(anon, "nope")));
  } finally {
    await env.cleanup();
  }
  return bad;
}

// Each mutation removes or inverts ONE check of the candidate. EVERY occurrence is replaced (a partial mutation proves nothing).
const MUTATIONS = [
  ["create needs no membership AND no person binding (the binding alone also refuses a non-member, so they are removed together)", /&& zabMember\(d\(\)\.tenantId\)\n\s+&& d\(\)\.addedByPersonId == myPersonIdIn\(d\(\)\.tenantId\)\n/g, "\n"],
  ["update needs no membership", /&& zabMember\(resource\.data\.tenantId\)\n\s+&& d\(\)\.tenantId == /g, "&& d().tenantId == "],
  ["read open to any signed-in person", /allow get: if zabMember\(resource\.data\.tenantId\);/g, "allow get: if signedIn();"],
  ["list open to any signed-in person", /allow list: if zabMember\(resource\.data\.tenantId\);/g, "allow list: if signedIn();"],
  ["membership means ANY signed-in person", /return signedIn\(\) && myRolesIn\(tenantId\)\.size\(\) > 0;/g, "return signedIn();"],
  ["delete allowed", /allow delete: if false;/g, "allow delete: if signedIn();"],
  ["key not bound to tenantId__id", /&& (?:pocketKey|itemKey) == d\(\)\.tenantId \+ '__' \+ d\(\)\.(?:pocketId|itemId)\n/g, "\n"],
  ["unknown fields allowed (hasOnly dropped)", /d\(\)\.keys\(\)\.hasOnly\(\[[^\]]*\]\)\n\s+&& d\(\)\.keys\(\)\.hasAll/g, "true\n            && d().keys().hasAll"],
  ["ztype unchecked", /d\(\)\.ztype in \['plain', 'links', 'tasks', 'ideas', 'shop'\]/g, "true"],
  ["status unchecked", /&& zabStatusOk\(\)\n/g, "\n"],
  ["addedByPersonId not bound to the writer", /&& d\(\)\.addedByPersonId == myPersonIdIn\(d\(\)\.tenantId\)\n/g, "\n"],
  ["createdBy not bound to the writer", /&& d\(\)\.createdBy == myUid\(\);/g, ";"],
  ["tenantId not frozen on update, AND the key binding dropped (the key check alone also pins the tenant, so they go together)", /&& (?:d\(\)\.tenantId == resource\.data\.tenantId|(?:pocketKey|itemKey) == d\(\)\.tenantId \+ '__' \+ d\(\)\.(?:pocketId|itemId))\n/g, "\n"],
  ["addedByPersonId not frozen on update", /&& d\(\)\.addedByPersonId == resource\.data\.addedByPersonId\n/g, "\n"],
  ["createdBy not frozen on update", /&& d\(\)\.createdBy == resource\.data\.createdBy;/g, ";"],
  ["stars range unchecked", /d\(\)\.stars is number && d\(\)\.stars >= 1 && d\(\)\.stars <= 3/g, "true"],
  ["due format unchecked", /d\(\)\.due is string && d\(\)\.due\.matches\('[^']*'\)/g, "true"],
  ["colour format unchecked", /d\(\)\.color is string && d\(\)\.color\.matches\('[^']*'\)/g, "true"],
  ["done type unchecked", /&& d\(\)\.done is bool\n/g, "\n"],
  ["list fields unchecked", /d\(\)\.get\(f, null\) == null \|\| d\(\)\[f\] is list/g, "true"],
  ["order type unchecked", /&& d\(\)\.order is number\n/g, "\n"],
  ["envelope unchecked", /&& zabEnvelopeOk\(\);/g, ";"],
  ["nonexistent-document read closed to everyone", /allow get: if signedIn\(\) && !exists\([^;]*\);/g, "allow get: if false;"],
];

test("the candidate behaves exactly as the matrix says", async () => {
  const bad = await matrix(candidate);
  assert.deepEqual(bad, [], `cases that did not behave: ${bad.join(" | ")}`);
});

for (const [name, re, replacement] of MUTATIONS) {
  test(`MUTATION: ${name} -> the matrix goes red`, async () => {
    const start = candidate.indexOf("ZAB (PCF J25");
    assert.ok(start > 0);
    const head = candidate.slice(0, start), zab = candidate.slice(start);
    const count = (zab.match(re) || []).length;
    console.log(`    [${name}] occurrences replaced: ${count}`);
    assert.ok(count >= 1, "the mutation matched nothing -- it proves nothing");
    const bad = await matrix(head + zab.replace(re, replacement));
    assert.ok(bad.length >= 1, "the matrix stayed green under this mutation: that check is untested");
  });
}
