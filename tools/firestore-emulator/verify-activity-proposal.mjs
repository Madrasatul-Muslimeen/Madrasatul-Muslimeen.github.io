// Static completeness guard. This does not execute or accept Firestore Rules.
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const matrix = JSON.parse(fs.readFileSync(new URL("../../tests/firestore/activity-v1.security-matrix.json", import.meta.url), "utf8"));
assert.equal(matrix.status, "proposal-only-not-executed");
assert.match(matrix.projectId, /^demo-/);
assert.equal(matrix.productionAccessAuthorised, false);
assert.equal(matrix.rulesDeploymentAuthorised, false);
assert.equal(matrix.cases.length, 25);
assert.equal(new Set(matrix.cases.map((c) => c.id)).size, matrix.cases.length);
for (const row of matrix.cases) {
  assert.match(row.id, /^[A-Z]+-\d{2}$/);
  assert.ok(["allow", "deny", "preserve"].includes(row.expect));
  assert.ok(row.statement.length > 15);
}
for (const id of ["SCOPE-03", "IDENT-02", "ENTRY-03", "ENTRY-04", "LEGACY-02", "SAFE-01"]) {
  assert.equal(matrix.cases.find((c) => c.id === id)?.expect, "deny");
}
const rulesDiff = execFileSync("git", ["diff", "--", "firestore.rules"], { cwd: new URL("../..", import.meta.url), encoding: "utf8" });
assert.equal(rulesDiff, "", "Task 48 must not modify executable Rules");
const active = fs.readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
const candidate = fs.readFileSync(new URL("../../tests/firestore/activity-v1.proposed.rules", import.meta.url), "utf8");
const start = "    match /activity/{activityKey} {";
const end = "    // domains/";
assert.equal(candidate.slice(0, candidate.indexOf(start)), active.slice(0, active.indexOf(start)), "Candidate changed a pre-Activity rule");
assert.equal(candidate.slice(candidate.indexOf(end)), active.slice(active.indexOf(end)), "Candidate changed a post-Activity rule");
assert.notEqual(candidate, active);
assert.match(candidate, /function oneNewEvent\(before, after, key\)/);
assert.match(candidate, /request\.resource\.data\.entries == resource\.data\.entries/);
assert.match(candidate, /key == 'activity-entry:v1\|' \+ request\.resource\.data\.tenantId/);
assert.doesNotMatch(candidate, /function legacyUpdate\(\)/);
console.log("==== Activity Rules proposal matrix: 25 cases structurally verified; executable Rules unchanged ====");
