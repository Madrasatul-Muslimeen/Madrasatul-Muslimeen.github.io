// The Owner's report of 12 Oct 2026 (PCF inbox, "Urgent"): a STUDENT account sees
// `failed at "load context data": permission-denied` on every page. Every page read the roster with ONE query,
// `tenantPeople where tenantId == T`. Firestore Rules are not filters: a query is refused WHOLE unless the Rules can
// prove every document it could return is readable, and only owner/prime (canAdminIdentity) can be proven from
// `tenantId` alone. This suite runs against the LIVE firestore.rules and proves both halves: the old query is refused
// for a student, a guardian and a teacher, and each query `roster-access.js` uses instead is allowed.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";

const PROJECT = "demo-quranrevival-roster-access";
const here = path.dirname(fileURLToPath(import.meta.url));
const rules = fs.readFileSync(path.resolve(here, "../../firestore.rules"), "utf8");
const CANDIDATE = "docs/governance/2026-10-12-guardian-roster-candidate.rules";
const candidate = fs.readFileSync(path.resolve(here, "../..", CANDIDATE), "utf8");
const T = "t1";

async function run(rulesText, guardianCandidate) {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: "127.0.0.1", port: 8109, rules: rulesText } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const person = (id, o) => setDoc(doc(db, "tenantPeople", id), { tenantId: T, ...o });
      const member = (uid, personId, roles) => setDoc(doc(db, "tenantMemberUids", `${T}__${uid}`), { tenantId: T, uid, personId, roles });
      await person("own", { authUid: "uid-own" });                       await member("uid-own", "own", ["owner"]);
      await person("stu", { authUid: "uid-stu" });                       await member("uid-stu", "stu", ["student"]);
      await person("gua", { authUid: "uid-gua" });                       await member("uid-gua", "gua", ["guardian"]);
      await person("kid", { authUid: null, managedByPersonId: "gua" });
      await person("tea", { authUid: "uid-tea" });                       await member("uid-tea", "tea", ["teacher"]);
      await person("other", { authUid: "uid-other" });
      await setDoc(doc(db, "teacherStudentLinks", `${T}__tea__stu`), { tenantId: T, teacherPersonId: "tea", studentPersonId: "stu", active: true });
      await setDoc(doc(db, "teacherStudentLinks", `${T}__tea__other`), { tenantId: T, teacherPersonId: "tea", studentPersonId: "other", active: false });
    });
    const as = (uid) => env.authenticatedContext(uid).firestore();
    const people = (db) => collection(db, "tenantPeople");
    const wholeTenant = (db) => query(people(db), where("tenantId", "==", T));

    // The defect, reproduced: the one query every page used.
    await assertSucceeds(getDocs(wholeTenant(as("uid-own"))));   // owner: fine, which is why the Owner never saw it
    await assertFails(getDocs(wholeTenant(as("uid-stu"))));      // student: the screenshot
    await assertFails(getDocs(wholeTenant(as("uid-gua"))));      // guardian: same
    await assertFails(getDocs(wholeTenant(as("uid-tea"))));      // teacher: same

    // The replacement queries. Self: tenantId + authUid.
    const self = (db, uid) => query(people(db), where("tenantId", "==", T), where("authUid", "==", uid));
    const s = await assertSucceeds(getDocs(self(as("uid-stu"), "uid-stu")));
    assert.deepEqual(s.docs.map((d) => d.id), ["stu"]);
    await assertFails(getDocs(self(as("uid-stu"), "uid-other")));  // the authUid filter is what proves it, not luck

    // Guardian: the children are read one by one (isGuardianOf is a per-document get, which a query cannot prove).
    const g = as("uid-gua");
    const kids = query(people(g), where("tenantId", "==", T), where("managedByPersonId", "==", "gua"));
    if (guardianCandidate) {
      const k = await assertSucceeds(getDocs(kids));
      assert.deepEqual(k.docs.map((d) => d.id), ["kid"]);
      // ...and only their own children: another person's managedByPersonId is refused, as is the unfiltered query.
      await assertFails(getDocs(query(people(g), where("tenantId", "==", T), where("managedByPersonId", "==", "someone-else"))));
      await assertFails(getDocs(query(people(as("uid-stu")), where("tenantId", "==", T), where("managedByPersonId", "==", "gua"))));
    } else {
      await assertFails(getDocs(kids));
    }
    await assertSucceeds(getDoc(doc(g, "tenantPeople", "kid")));
    await assertFails(getDoc(doc(g, "tenantPeople", "other")));

    // Teacher: the teacher's own links, then each linked student by id.
    const t = as("uid-tea");
    const links = await assertSucceeds(getDocs(query(collection(t, "teacherStudentLinks"),
      where("tenantId", "==", T), where("teacherPersonId", "==", "tea"))));
    assert.deepEqual(links.docs.map((d) => d.id).sort(), [`${T}__tea__other`, `${T}__tea__stu`]);
    await assertSucceeds(getDoc(doc(t, "tenantPeople", "stu")));
    await assertFails(getDoc(doc(t, "tenantPeople", "other")));    // inactive link: refused, so the helper skips it
  } finally {
    await env.cleanup();
  }
}

// 14 Oct 2026 (PCF J15): the Owner published the guardian candidate on 12 Oct and said "yes, copy the rules"
// (PCF and chat, 14 Oct), so firestore.rules IS the candidate, byte for byte. The live file is tested with the
// guardian rule, and a mutant with that one rule removed proves it is what lets a guardian list their children.
const GUARDIAN_RULE_START = "      allow read: if isGuardianIn(resource.data.tenantId)";
function withoutGuardianRule(text) {
  const lines = text.split("\n");
  const i = lines.indexOf(GUARDIAN_RULE_START);
  if (i < 0) throw new Error("guardian rule not found in the live Rules");
  lines.splice(i, 3);
  const out = lines.join("\n");
  if (out.includes("resource.data.get('managedByPersonId', null) == myPersonIdIn(resource.data.tenantId)")) throw new Error("guardian rule only partly removed");
  if (out.split("\n").length !== lines.length) throw new Error("unexpected line count after removal");
  return out;
}

// UPDATED IN PLACE 5 Nov 2026. This read "the live Rules are exactly the guardian candidate", true from J15
// (12 Oct, 97c8bb5b) until the Owner published further Rules into the same file (Zab, Tasrif, Vocabulary review,
// hadithSubjects, the Keys blocks), after which firestore.rules can never again BE this candidate. What is still
// true, and worth checking: the candidate was firestore.rules of its day (846810a5, the commit that wrote it) plus
// the guardian rule and nothing else, and the tenantPeople block it published is in today's firestore.rules BYTE
// FOR BYTE, so the guardian rule cannot drift silently. The cases below still run against today's live file.
const CANDIDATE_BASE_REF = "846810a5";
const baseLive = execSync(`git show ${CANDIDATE_BASE_REF}:firestore.rules`, { cwd: path.resolve(here, "../.."), encoding: "utf8" });
function matchBlock(text, name) {
  const m = new RegExp(`^[ \\t]*match /${name}/`, "m").exec(text);
  assert.ok(m, `no ${name} block found`);
  const start = m.index + m[0].indexOf("match");
  const open = text.lastIndexOf("{", text.indexOf("\n", start));
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error(`unterminated ${name} block`);
}
test("the guardian candidate is firestore.rules of its day plus the guardian rule, and its tenantPeople block is live byte for byte", () => {
  const cand = candidate.split("\n"), base = baseLive.split("\n");
  let j = 0; const missing = [];
  for (const line of base) {
    let k = j; while (k < cand.length && cand[k] !== line) k++;
    if (k < cand.length) j = k + 1; else missing.push(line);
  }
  assert.deepEqual(missing, [], `firestore.rules at ${CANDIDATE_BASE_REF} has lines missing from the candidate`);
  assert.equal(cand.length - base.length, 7, "the candidate adds exactly the seven-line guardian rule");
  const GUARDIAN = "resource.data.get('managedByPersonId', null) == myPersonIdIn(resource.data.tenantId)";
  assert.ok(candidate.includes(GUARDIAN) && !baseLive.includes(GUARDIAN), "the guardian rule is what the candidate adds");
  const block = matchBlock(candidate, "tenantPeople");
  assert.ok(block.includes(GUARDIAN) && block.length > 400, "the candidate's tenantPeople block parsed wrongly");
  assert.equal(matchBlock(rules, "tenantPeople"), block, "today's firestore.rules tenantPeople block is not the published guardian candidate's");
});
test("roster reads for every role, against the live Rules (a guardian lists their own children)", () => run(rules, true));
test("MUTATION: the live Rules without the guardian rule refuse the guardian's children query", () => run(withoutGuardianRule(rules), false));
