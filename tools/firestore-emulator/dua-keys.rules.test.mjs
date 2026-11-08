// PCF MSA J104 line 23 (the Owner, 9 Nov 2026: Part 1 = A, Part 2 = D, option B) -- the Dua saving Rules widened so a
// Hisn al-Muslim dua ("hisn-<chapter>-<entry>") and a Qur'anic dua ("quran-<surah>-<ayah>[-<ayah>]") may be EDITED
// (duaEdits) and SHARED (duaShares) too. The candidate is docs/proposals/dua-keys-hisn-quran.DEPLOYMENT-candidate.rules:
// today's firestore.rules with the duaKey pattern widened in those two blocks and nowhere else.
//
// A SEPARATE suite from dua-saving.rules.test.mjs on purpose: that suite tests the PUBLISHED Dua rules (its default is the
// extract that was published, and it must stay green on firestore.rules), while every allow case here is one the published
// rules REFUSE -- run this file with FULL_RULES_FILE=firestore.rules and it goes red, which is what proves it tests the change.
// The ruleset under test is a WHOLE rules file (the one the Owner pastes), so its own helpers are the deployed ones.
//   default            docs/proposals/dua-keys-hisn-quran.DEPLOYMENT-candidate.rules
//   FULL_RULES_FILE    another whole rules file (e.g. firestore.rules, to show the new allows fail there)
//   MUTANT_FILE        a mutant from dua-saving.mutate.mjs (wins over FULL_RULES_FILE)
// Every denial is paired with an allow differing in ONE fact.
//   npx firebase emulators:exec --only firestore --project demo-mmsa-dua-saving --config dua-saving.firebase.json "node --test dua-keys.rules.test.mjs"
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails as aF, assertSucceeds as aS } from "@firebase/rules-unit-testing";
import { doc, getDocs, setDoc, updateDoc, deleteDoc, collection } from "firebase/firestore";
const where = () => new Error().stack.split("\n").find((l) => l.includes("dua-keys.rules.test.mjs") && !/at (assertFails|assertSucceeds|where)/.test(l))?.trim();
const assertFails = async (p, why = "") => { const w = where(); try { return await aF(p); } catch (e) { e.message = `EXPECTED DENY but allowed ${why} @ ${w}: ${e.message}`; throw e; } };
const assertSucceeds = async (p, why = "") => { const w = where(); try { return await aS(p); } catch (e) { e.message = `EXPECTED ALLOW but denied ${why} @ ${w}: ${e.message}`; throw e; } };

const PROJECT = "demo-mmsa-dua-saving";
const HOST = "127.0.0.1";
const PORT = 8092;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");

const CANDIDATE = "docs/proposals/dua-keys-hisn-quran.DEPLOYMENT-candidate.rules";
const file = process.env.MUTANT_FILE || path.resolve(root, process.env.FULL_RULES_FILE || CANDIDATE);
const rules = fs.readFileSync(file, "utf8");
console.log(`# ruleset under test: ${path.relative(root, file) || file}`);
for (const c of ["duaPlans", "duaEdits", "duaShares"]) assert.ok(rules.includes(`match /${c}/`), `the ruleset does not govern ${c}`);

const T = "t1", T2 = "t2";
const ts = new Date("2026-11-09T00:00:00.000Z");
const I17 = (uid) => ({ schemaVersion: 1, createdAt: ts, updatedAt: ts, createdBy: uid });
const edit = (tenantId, duaKey, uid, over = {}) => ({
  tenantId, duaKey, title: { en: "When distressed", bn: "দুশ্চিন্তায়" }, placements: [{ group: "occasions", order: 1 }], hidden: false,
  ...(duaKey.startsWith("new-") ? { added: { ar: "اللَّهُمَّ", source: "x" } } : {}), ...I17(uid), ...over,
});
const share = (tenantId, duaKey, uid, over = {}) => ({ tenantId, duaKey, where: "whatsapp", whoFor: "family", occasion: "", sharedAt: ts, ...I17(uid), ...over });
const id = (a, b) => `${a}__${b}`;

// [refused key, the accepted key it differs from in ONE fact, what the fact is]
const PAIRS = [
  ["hisn-27", "hisn-27-5", "hisn needs an entry after its chapter"],
  ["hisn-1234-5", "hisn-123-5", "hisn chapter is at most 3 digits"],
  ["hisn-27-1234", "hisn-27-123", "hisn entry is at most 3 digits"],
  ["hisn-27-5x", "hisn-27-5", "hisn entry is digits only"],
  ["HISN-27-5", "hisn-27-5", "the prefix is lower case"],
  ["hisn--5", "hisn-1-5", "hisn chapter may not be empty"],
  ["quran-2-285-286-287", "quran-2-285-286", "a Qur'anic dua names at most two ayahs"],
  ["quran-a-1", "quran-1-1", "surah is digits only"],
  ["quran-7", "quran-7-23", "a Qur'anic dua names an ayah"],
  ["quran-1234-1", "quran-123-1", "surah is at most 3 digits"],
  ["quran-7-2345", "quran-7-234", "ayah is at most 3 digits"],
  ["quran-2-285-2860", "quran-2-285-286", "the second ayah is at most 3 digits"],
  ["QURAN-7-23", "quran-7-23", "the prefix is lower case"],
  ["quran-7-23-", "quran-7-23", "no trailing dash"],
  ["hadith-27-5", "hisn-27-5", "only hisn- and quran- are new prefixes"],
];
const NEW_ALLOWS = ["hisn-27-5", "quran-7-23", "quran-2-285-286", "hisn-1-1", "quran-999-999-999"];
const OLD_ALLOWS = ["12", "new-abc123"];   // positive control: the published forms still pass

test("Dua keys for Hisn al-Muslim and Qur'anic duas: duaEdits and duaShares", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules } });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const member = (uid, personId, roles, tenantId = T) =>
        setDoc(doc(db, "tenantMemberUids", `${tenantId}__${uid}`), { tenantId, uid, personId, roles });
      await member("uid-owner", "pO", ["owner"]);
      await member("uid-prime", "pP", ["prime"]);
      await member("uid-teacher", "pT", ["teacher"]);
      await member("uid-student", "pS", ["student"]);
      await member("uid-other", "pX", ["student"], T2);
    });
    const wipe = async () => env.withSecurityRulesDisabled(async (ctx) => {
      for (const c of ["duaEdits", "duaShares"]) for (const d of (await getDocs(collection(ctx.firestore(), c))).docs) await deleteDoc(d.ref);
    });
    const db = (uid) => env.authenticatedContext(uid).firestore();
    const owner = db("uid-owner"), prime = db("uid-prime"), teacher = db("uid-teacher"), student = db("uid-student"), other = db("uid-other");
    const E = (c, k) => doc(c, "duaEdits", k);
    const sh = (c, n) => doc(c, "duaShares", n);
    await env.withSecurityRulesDisabled(async (ctx) => {   // positive control: empty, so setDoc is a CREATE
      for (const c of ["duaEdits", "duaShares"]) assert.equal((await getDocs(collection(ctx.firestore(), c))).size, 0);
    });

    // ===== duaEdits ==================================================================================================
    // the new forms: owner and prime may create; the role gate still holds (teacher, student, another madrasah refused)
    for (const k of [...NEW_ALLOWS, ...OLD_ALLOWS]) {
      for (const [c, uid] of [[owner, "uid-owner"], [prime, "uid-prime"]]) {
        await assertSucceeds(setDoc(E(c, id(T, k)), edit(T, k, uid)), `edit ${k} by ${uid}`);
        await wipe();
      }
    }
    for (const k of ["hisn-27-5", "quran-7-23", "quran-2-285-286"]) {
      await assertFails(setDoc(E(teacher, id(T, k)), edit(T, k, "uid-teacher")), `edit ${k} by a teacher`);
      await assertFails(setDoc(E(student, id(T, k)), edit(T, k, "uid-student")), `edit ${k} by a student`);
      await assertFails(setDoc(E(other, id(T, k)), edit(T, k, "uid-other")), `edit ${k} by another madrasah`);
    }
    // each refused form, paired with the accepted form it differs from in one fact
    for (const [bad, good, why] of PAIRS) {
      await assertFails(setDoc(E(owner, id(T, bad)), edit(T, bad, "uid-owner")), `edit ${bad}: ${why}`);
      await assertSucceeds(setDoc(E(owner, id(T, good)), edit(T, good, "uid-owner")), `edit ${good} (pair of ${bad})`);
      await wipe();
    }
    // the document id is still bound to the key
    await assertFails(setDoc(E(owner, id(T, "hisn-27-6")), edit(T, "hisn-27-5", "uid-owner")), "doc id != tenantId__duaKey");
    await assertFails(setDoc(E(owner, id(T2, "hisn-27-5")), edit(T2, "hisn-27-5", "uid-owner")), "owner of t1 in t2");
    await assertSucceeds(setDoc(E(owner, id(T, "hisn-27-5")), edit(T, "hisn-27-5", "uid-owner")), "pair of the two above");
    await wipe();
    // a hisn- / quran- dua is NOT "added": `added` refused on it, paired with the same edit without it
    for (const k of ["hisn-27-5", "quran-7-23", "quran-2-285-286"]) {
      await assertFails(setDoc(E(owner, id(T, k)), edit(T, k, "uid-owner", { added: { ar: "x" } })), `added on ${k}`);
      await assertSucceeds(setDoc(E(owner, id(T, k)), edit(T, k, "uid-owner")), `${k} without added`);
      await wipe();
    }
    await assertFails(setDoc(E(owner, id(T, "new-abc123")), (({ added, ...r }) => r)(edit(T, "new-abc123", "uid-owner"))), "a new- dua still needs added");
    // update (hide / rename) of a hisn- edit, and its key stays pinned
    await assertSucceeds(setDoc(E(owner, id(T, "hisn-27-5")), edit(T, "hisn-27-5", "uid-owner")));
    await assertSucceeds(updateDoc(E(prime, id(T, "hisn-27-5")), { hidden: true, title: { en: "Distress" }, updatedAt: ts }), "hide a hisn dua");
    await assertFails(updateDoc(E(owner, id(T, "hisn-27-5")), { duaKey: "hisn-27-6" }), "duaKey pinned on update");
    await assertFails(updateDoc(E(owner, id(T, "hisn-27-5")), { added: { ar: "x" } }), "added on update of a hisn dua");
    await assertFails(updateDoc(E(teacher, id(T, "hisn-27-5")), { hidden: false, updatedAt: ts }), "teacher update");
    await assertFails(deleteDoc(E(owner, id(T, "hisn-27-5"))), "no delete");
    await wipe();

    // ===== duaShares =================================================================================================
    let n = 0;
    for (const k of [...NEW_ALLOWS, ...OLD_ALLOWS]) {
      for (const [c, uid] of [[owner, "uid-owner"], [teacher, "uid-teacher"], [student, "uid-student"]]) {
        await assertSucceeds(setDoc(sh(c, `s${n++}`), share(T, k, uid)), `share ${k} by ${uid}`);
      }
    }
    for (const k of ["hisn-27-5", "quran-7-23", "quran-2-285-286"]) {
      await assertFails(setDoc(sh(other, `s${n++}`), share(T, k, "uid-other")), `share ${k} into another madrasah`);
      await assertFails(setDoc(sh(student, `s${n++}`), share(T, k, "uid-teacher")), `share ${k} as someone else`);
    }
    for (const [bad, good, why] of PAIRS) {
      await assertFails(setDoc(sh(student, `s${n++}`), share(T, bad, "uid-student")), `share ${bad}: ${why}`);
      await assertSucceeds(setDoc(sh(student, `s${n++}`), share(T, good, "uid-student")), `share ${good} (pair of ${bad})`);
    }
    await assertFails(updateDoc(sh(owner, "s0"), { occasion: "Eid", updatedAt: ts }), "a share is never updated");
    await wipe();
  } finally {
    await env.cleanup();
  }
});
