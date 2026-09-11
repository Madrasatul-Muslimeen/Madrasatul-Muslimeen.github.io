// STAGE-5-TASK-12 — dependency-free static verification of the emulator
// scaffold. It does not start an emulator or access Firestore.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || process.cwd());
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const matrix = JSON.parse(read("tests/firestore/note-foundation.security-matrix.json"));
const config = JSON.parse(read("tools/firestore-emulator/firebase.json"));
const launcherPath = path.join(root, "tools/firestore-emulator/run.mjs");
const launcher = await import(pathToFileURL(launcherPath));
let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${name}`);
  }
}

const ids = matrix.cases.map(({ id }) => id);
const areas = new Set(matrix.cases.map(({ area }) => area));
const statements = matrix.cases.map(({ statement }) => statement).join("\n");

console.log("\n=== Demo-only emulator boundary ===");
check("fixed project is demo-only", matrix.projectId === launcher.DEMO_PROJECT_ID && matrix.projectId.startsWith("demo-"));
check("production project identifier is absent", !JSON.stringify({ matrix, config }).includes("study-monitoring"));
check("emulator binds only to loopback", config.emulators.firestore.host === "127.0.0.1" && launcher.EMULATOR_HOST === "127.0.0.1:8085");
check("emulator UI is disabled", config.emulators.ui.enabled === false);
check("normal launcher starts nothing", launcher.scaffoldStatus().executableRulesTestPresent === false);
check("non-demo project is rejected", (() => { try { launcher.assertDemoOnly("production-project"); return false; } catch { return true; } })());

console.log("\n=== Accepted contract decisions ===");
check("five Foundation collections remain exact", matrix.collections.length === 5 && new Set(matrix.collections).size === 5);
check("ownerPersonId remains canonical", matrix.decisions.canonicalOwner === "ownerPersonId");
check("managed-child ownerUid exception is narrow", matrix.decisions.ownerUid === "nullable-only-for-unauthenticated-managed-child");
check("guardian remains custodian not owner", matrix.decisions.guardianRole === "custodian-and-actor-not-owner");
check("teacher and administrator edit is not automatic", matrix.decisions.teacherAdministratorEdit === "no-automatic-authority");
check("managed child remains view-only by default", matrix.decisions.managedChildDefault === "view-only");
check("approval duration is locked to 30 minutes", matrix.decisions.managedChildApproval === "30-minute-server-expiring-note-specific-window");
check("approval renewal and early termination are locked",
  matrix.decisions.managedChildApprovalRenewal === "guardian-quick-approval" &&
  matrix.decisions.managedChildApprovalEarlyTermination === "revocation-or-context-exit-where-enforceable");
check("approval coverage remains content and revision only", matrix.decisions.approvalCoverage === "title-body-and-atomic-revision-only");

console.log("\n=== Security matrix completeness ===");
check("case identifiers are unique", ids.length === new Set(ids).size);
for (const area of ["authentication", "self", "guardian", "teacher", "administrator", "immutability", "relationships", "atomicity", "queries", "regression", "safety"]) {
  check(`${area} cases are present`, areas.has(area));
}
check("guardian approval isolation cases are present", /another Note/.test(statements) && /expired or revoked/.test(statements));
check("legacy ayahNotes regression is present", /legacy ayahNotes/.test(statements));
check("Rules implementation authority is recorded", matrix.rulesImplementationAuthorised === true);
check("production access remains unauthorised", matrix.productionAccessAuthorised === false);

console.log(`\n==== ${passed} passed, ${failed} failed ====`);
process.exit(failed === 0 ? 0 : 1);
