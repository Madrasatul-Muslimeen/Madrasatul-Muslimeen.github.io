// PROOF that the "evaluation error" diagnostic is a property of the EXISTING,
// DEPLOYED ruleset's authorisation style -- not of the P4 amendment.
//
// Runs the UNMODIFIED production firestore.rules in an isolated emulator and
// makes one unauthorised write to the EXISTING activity collection, which the
// P4 amendment does not touch. If that denial also carries an evaluation error,
// the diagnostic predates P4 entirely.
import fs from "node:fs"; import path from "node:path"; import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
const here = path.dirname(fileURLToPath(import.meta.url));
const production = fs.readFileSync(path.resolve(here, "../../firestore.rules"), "utf8");
// Guard: this really is the deployed file, with no P4 material in it.
if (production.includes("/evidence/")) throw new Error("firestore.rules carries P4 material -- wrong file");
if (!production.includes("S8-class fix")) throw new Error("this is not the production ruleset");

test("deployed rules: an unauthorised activity write", async () => {
  const env = await initializeTestEnvironment({ projectId: "demo-quranrevival-baseline",
    firestore: { host: "127.0.0.1", port: 8090, rules: production } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: "t1", authUid: "uid-p1" });
      await setDoc(doc(db, "tenantPeople", "p2"), { tenantId: "t1", authUid: "uid-p2" });
      await setDoc(doc(db, "tenantMemberUids", "t1__uid-p2"), { roles: ["self"], personId: "p2" });
    });
    const p2 = env.authenticatedContext("uid-p2").firestore();
    // p2 tries to write p1's weekly activity document -- denied by canRecordFor,
    // exactly the same helper chain the P4 evidence rule reuses unchanged.
    console.log("### BASELINE CASE: p2 writes p1's activity week ###");
    await assertFails(setDoc(doc(p2, "activity", "t1__p1__2026-09-13"),
      { tenantId: "t1", personId: "p1", weekKey: "2026-09-13", entries: [] }));
    console.log("### BASELINE DONE ###");
  } finally { await env.cleanup(); }
});
