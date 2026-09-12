// Static completeness guard. This does not execute or accept Firestore Rules.
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const matrix = JSON.parse(fs.readFileSync(new URL("../../tests/firestore/activity-v1.security-matrix.json", import.meta.url), "utf8"));
assert.equal(matrix.status, "proposal-only-not-executed");
assert.match(matrix.projectId, /^demo-/);
assert.equal(matrix.productionAccessAuthorised, false);
assert.equal(matrix.rulesDeploymentAuthorised, false);
assert.equal(matrix.cases.length, 22);
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
console.log("==== Activity Rules proposal matrix: 22 cases structurally verified; executable Rules unchanged ====");
