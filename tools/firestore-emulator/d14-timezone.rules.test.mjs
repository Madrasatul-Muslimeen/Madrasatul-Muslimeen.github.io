// D14 TIMEZONE — the tenantPeople Rules candidate, executed against the
// Firestore emulator. Isolated: a demo- project id, never a production endpoint.
//
// THIS SUITE TESTS THE ASSEMBLED RESULT, NOT THE EXTRACT, and that is the whole
// point. The candidate block calls `canAdminIdentity`, `isGuardianOf`,
// `myUid` and five other helpers that live in the deployed ruleset and not in
// the extract, so an extract tested on its own would prove only that a file
// parses. What is tested here is the ruleset that ACTIVATION WOULD PRODUCE:
// `firestore.rules` with its tenantPeople block replaced by the candidate's.
// The substitution is asserted, so a silent failure to substitute cannot leave
// this suite quietly testing the deployed rules instead.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-d14-timezone";
const HOST = "127.0.0.1";
const PORT = 8094;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");

const deployed = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const candidate = fs.readFileSync(
  path.join(root, "docs/governance/d14-timezone-tenantpeople-rules-candidate-2026-09-18.rules"), "utf8");

/** The `match /tenantPeople/{personId} { … }` block of a ruleset, braces balanced. */
function tenantPeopleBlock(text) {
  const start = text.indexOf("match /tenantPeople/");
  assert.notEqual(start, -1, "no tenantPeople block found");
  const open = text.indexOf("{", text.indexOf("\n", start) === -1 ? start : text.lastIndexOf("{", text.indexOf("\n", start)));
  let depth = 0, i = text.lastIndexOf("{", text.indexOf("\n", start));
  for (; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error("unterminated tenantPeople block");
}

const deployedBlock = tenantPeopleBlock(deployed);
const candidateBlock = tenantPeopleBlock(candidate);
assert.ok(deployedBlock.length > 400 && candidateBlock.length > 400, "a block parsed implausibly short");
assert.ok(!deployedBlock.includes("timezoneMode"), "the DEPLOYED rules already mention timezoneMode -- re-read this suite");
assert.ok(candidateBlock.includes("timezoneMode"), "the candidate does not mention timezoneMode");

const assembled = deployed.replace(deployedBlock, candidateBlock);
assert.notEqual(assembled, deployed, "the substitution did nothing -- this suite would be testing the deployed rules");
assert.ok(assembled.includes("timezoneWellFormed()"), "the assembled ruleset lost the new helper");
// The rest of the file must be untouched: activation changes ONE block.
assert.equal(
  assembled.replace(candidateBlock, "<<BLOCK>>"),
  deployed.replace(deployedBlock, "<<BLOCK>>"),
  "the assembled ruleset differs from the deployed one somewhere other than the tenantPeople block");

const T = "t1";
const env0 = { schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-self" };
const person = (o = {}) => ({
  tenantId: T, authUid: "uid-self", isMinor: false, name: "Self",
  roles: ["owner"], managedByPersonId: null, timezone: "Asia/Dhaka", ...env0, ...o });

let passed = 0, failed = 0;
async function ok(label, p) {
  try { await p; passed++; console.log(`  PASS  ${label}`); }
  catch (e) { failed++; console.log(`  FAIL  ${label} — expected ALLOW, got: ${e.code || e.message}`); }
}
async function no(label, p) {
  try { await p; failed++; console.log(`  FAIL  ${label} — expected DENY, it was ALLOWED`); }
  catch (e) {
    if (!/permission|PERMISSION_DENIED/i.test(e.code || e.message)) {
      failed++; console.log(`  FAIL  ${label} — denied for the WRONG reason: ${e.code || e.message}`);
    } else { passed++; console.log(`  PASS  ${label}`); }
  }
}

test("D14 tenantPeople candidate: the mode and the location agree, at the server", async () => {
  const env = await initializeTestEnvironment({
    projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: assembled },
  });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", "pSelf"), person());
      await setDoc(doc(db, "tenantPeople", "pOther"), person({ authUid: "uid-other", name: "Other" }));
      // An owner membership, so the admin update clause is reachable.
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-admin`), { tenantId: T, uid: "uid-admin", personId: "pAdmin", roles: ["owner"] });
      await setDoc(doc(db, "tenantPeople", "pAdmin"), person({ authUid: "uid-admin", name: "Admin" }));
    });

    const self = env.authenticatedContext("uid-self").firestore();
    const other = env.authenticatedContext("uid-other").firestore();
    const admin = env.authenticatedContext("uid-admin").firestore();
    const anon = env.unauthenticatedContext().firestore();
    const S = doc(self, "tenantPeople", "pSelf");
    const now = () => new Date();

    // --- the capability D14 adds, on the SELF path -------------------------
    await ok("TZ-01 a person may record an automatic zone with its mode",
      updateDoc(S, { timezone: "Asia/Dhaka", timezoneMode: "auto", timezoneLocation: null, updatedAt: now() }));
    await ok("TZ-02 ...and may choose a location, which carries the zone it determined",
      updateDoc(S, { timezone: "Europe/London", timezoneMode: "manual", timezoneLocation: "London, United Kingdom", updatedAt: now() }));
    await ok("TZ-03 ...and may return to automatic, which CLEARS the location",
      updateDoc(S, { timezone: "Asia/Dhaka", timezoneMode: "auto", timezoneLocation: null, updatedAt: now() }));

    // --- the invariant that makes "return to automatic" real ---------------
    await no("TZ-04 auto may NOT keep a location -- a stale label beside a contradicting mode",
      updateDoc(S, { timezoneMode: "auto", timezoneLocation: "London, United Kingdom", updatedAt: now() }));
    await no("TZ-05 manual may NOT omit the location that determined the zone",
      updateDoc(S, { timezone: "Europe/London", timezoneMode: "manual", timezoneLocation: null, updatedAt: now() }));
    await no("TZ-06 manual may NOT carry a blank location",
      updateDoc(S, { timezone: "Europe/London", timezoneMode: "manual", timezoneLocation: "", updatedAt: now() }));
    await no("TZ-07 the mode vocabulary is closed",
      updateDoc(S, { timezoneMode: "sometimes", timezoneLocation: null, updatedAt: now() }));
    await no("TZ-08 a zone may not be an empty string",
      updateDoc(S, { timezone: "", timezoneMode: "auto", timezoneLocation: null, updatedAt: now() }));

    // --- what the widened clause must still refuse -------------------------
    await no("TZ-09 the widened self clause still refuses roles",
      updateDoc(S, { roles: ["owner", "platformAdmin"], updatedAt: now() }));
    await no("TZ-10 ...and still refuses tenantId",
      updateDoc(S, { tenantId: "t2", updatedAt: now() }));
    await no("TZ-11 ...and still refuses authUid",
      updateDoc(S, { authUid: "uid-other", updatedAt: now() }));
    // CORRECTED: this first wrote `roles: ["owner"]`, which is the value the
    // fixture ALREADY had -- and `diff().affectedKeys()` lists only keys whose
    // value CHANGED, so `hasOnly` never saw it and the case proved nothing. A
    // smuggled field has to actually differ to be smuggled.
    await no("TZ-12 ...and still refuses a timezone write smuggling a role beside it",
      updateDoc(S, { timezone: "Asia/Dhaka", timezoneMode: "auto", timezoneLocation: null, roles: ["owner", "prime"], updatedAt: now() }));

    // --- ownership is unchanged -------------------------------------------
    await no("TZ-13 another person may not set my timezone",
      updateDoc(doc(other, "tenantPeople", "pSelf"), { timezoneMode: "manual", timezoneLocation: "X", timezone: "UTC", updatedAt: now() }));
    await no("TZ-14 an anonymous caller may not set it either",
      updateDoc(doc(anon, "tenantPeople", "pSelf"), { timezoneMode: "auto", timezoneLocation: null, updatedAt: now() }));

    // --- the helper is CONDITIONAL: admin writes that avoid the fields are
    //     unaffected, and admin writes that touch them are validated --------
    await ok("TZ-15 an admin write that does not touch the timezone fields is unaffected",
      updateDoc(doc(admin, "tenantPeople", "pSelf"), { name: "Renamed by admin", updatedAt: now() }));
    await no("TZ-16 ...but an admin may NOT write a contradictory mode/location either",
      updateDoc(doc(admin, "tenantPeople", "pSelf"), { timezoneMode: "auto", timezoneLocation: "Cairo", updatedAt: now() }));
    await ok("TZ-17 ...and a well-formed admin timezone write is allowed",
      updateDoc(doc(admin, "tenantPeople", "pSelf"), { timezone: "Africa/Cairo", timezoneMode: "manual", timezoneLocation: "Cairo, Egypt", updatedAt: now() }));

    // --- a pre-D14 record, which has a zone and NO mode --------------------
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "tenantPeople", "pLegacy"),
        person({ authUid: "uid-legacy", timezone: "Asia/Dhaka" }));
    });
    const legacy = env.authenticatedContext("uid-legacy").firestore();
    await ok("TZ-18 a pre-D14 record (zone, no mode) may be brought into auto by its owner",
      updateDoc(doc(legacy, "tenantPeople", "pLegacy"),
        { timezoneMode: "auto", timezoneLocation: null, updatedAt: now() }));

    // --- a migrate.html record, whose zone is null -------------------------
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "tenantPeople", "pNullTz"),
        person({ authUid: "uid-nulltz", timezone: null }));
      await setDoc(doc(ctx.firestore(), "tenantPeople", "pNullTz2"),
        person({ authUid: "uid-nulltz", timezone: null }));
    });
    const nulltz = env.authenticatedContext("uid-nulltz").firestore();
    // CORRECTED: TZ-20 used to reuse pNullTz, which TZ-19 had just given a
    // zone -- so it was asserting "manual with no zone" against a record that
    // had one, and passed for the wrong reason. It gets its own untouched
    // record now. A case whose premise an earlier case destroyed is a case
    // that tests nothing.
    await no("TZ-20 a record with NO zone may not go manual -- nothing for the location to have determined",
      updateDoc(doc(nulltz, "tenantPeople", "pNullTz2"),
        { timezoneMode: "manual", timezoneLocation: "Dhaka", updatedAt: now() }));
    await ok("TZ-19 ...but it stays writable, and adopts a detected zone into auto",
      updateDoc(doc(nulltz, "tenantPeople", "pNullTz"),
        { timezone: "Asia/Dhaka", timezoneMode: "auto", timezoneLocation: null, updatedAt: now() }));

    // --- reads are untouched by this candidate -----------------------------
    await ok("TZ-21 a person still reads their own record", getDoc(S));
    await no("TZ-22 another person still cannot read it", getDoc(doc(other, "tenantPeople", "pSelf")));

    console.log(`\n==== D14 tenantPeople candidate Rules: ${passed} assertions, ${failed} failed ====`);
    assert.equal(failed, 0, `${failed} assertion(s) did not behave as specified`);
  } finally {
    await env.cleanup();
  }
});
