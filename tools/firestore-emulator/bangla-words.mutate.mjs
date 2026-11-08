// Mutation proof for the banglaWords candidate (PCF MSA J119). Each entry breaks ONE condition of the candidate
// (every occurrence is replaced, and the count is printed); the suite must go RED on every one.
//   npx firebase emulators:exec --only firestore --project demo-mmsa-bangla-words --config bangla-words.firebase.json "node bangla-words.mutate.mjs"
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const SRC = path.resolve("../../docs/proposals/bangla-words.candidate.rules");
const src = fs.readFileSync(SRC, "utf8");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bw-mut-"));
const W = `: (personInTenant(tenantId, scope) && canRecordFor(tenantId, scope));\n      }\n      function banglaMayRead`;
const R = `: (personInTenant(tenantId, scope) && canRecordFor(tenantId, scope));\n      }\n\n      // The read-before`;
const M = [
  ["shape-hasOnly-open", "d().keys().hasOnly([", "d().keys().hasAny(["],
  // NOT listed: hasAll([...]) -> hasAny. Every one of those keys is also type-checked with `is` below it, and a missing key
  // makes that check an evaluation error (a denial), so the hasAll is redundant by construction: an equivalent mutant.
  ["tenantId-empty-ok", "&& d().tenantId is string && d().tenantId.size() > 0", ""],
  ["listKey-free", "&& listKey == d().tenantId + '__' + d().scope", ""],
  ["words-not-list-ok", "d().words is list && d().words.size() <= 5000", "d().words.size() <= 5000"],
  ["words-uncapped", "&& d().words.size() <= 5000", ""],
  ["schemaVersion-free", "&& d().schemaVersion is number", ""],
  ["createdAt-free", "d().createdAt is timestamp && d().updatedAt is timestamp", "true"],
  ["createdBy-empty-ok", "&& d().createdBy is string && d().createdBy.size() > 0;", ";"],
  ["madrasah-write-any-signed-in", "(canAdminIdentity(tenantId) || isTeacherIn(tenantId))", "signedIn()"],
  ["madrasah-write-no-teacher", "(canAdminIdentity(tenantId) || isTeacherIn(tenantId))", "canAdminIdentity(tenantId)"],
  ["person-write-no-personInTenant", ": (personInTenant(tenantId, scope) && canRecordFor(tenantId, scope));\n      }\n      function banglaMayRead", ": (canRecordFor(tenantId, scope));\n      }\n      function banglaMayRead"],
  ["person-write-no-canRecordFor", ": (personInTenant(tenantId, scope) && canRecordFor(tenantId, scope));\n      }\n      function banglaMayRead", ": (personInTenant(tenantId, scope));\n      }\n      function banglaMayRead"],
  ["madrasah-read-any-signed-in", "(signedIn() && myRolesIn(tenantId).size() > 0)", "signedIn()"],
  ["person-read-no-personInTenant", ": (personInTenant(tenantId, scope) && canRecordFor(tenantId, scope));\n      }\n\n      // The read-before", ": (canRecordFor(tenantId, scope));\n      }\n\n      // The read-before"],
  ["person-read-no-canRecordFor", ": (personInTenant(tenantId, scope) && canRecordFor(tenantId, scope));\n      }\n\n      // The read-before", ": (personInTenant(tenantId, scope));\n      }\n\n      // The read-before"],
  ["probe-gone", "allow get: if signedIn() && !exists(/databases/$(database)/documents/banglaWords/$(listKey));", ""],
  ["probe-any-doc", "allow get: if signedIn() && !exists(/databases/$(database)/documents/banglaWords/$(listKey));", "allow get: if signedIn();"],
  ["create-createdBy-free", "&& d().createdBy == myUid();", ";"],
  ["create-no-write-check", "&& banglaMayWrite(d().tenantId, d().scope)\n                    && d().createdBy == myUid();", "&& d().createdBy == myUid();"],
  ["update-no-write-check", "&& banglaMayWrite(resource.data.tenantId, resource.data.scope)", ""],
  ["update-createdBy-free", "\n                    && d().createdBy == resource.data.createdBy;", ";"],
  ["update-no-shape", "allow update: if resource != null\n                    && banglaShapeOk()", "allow update: if resource != null"],
  ["delete-allowed", "allow delete: if false;", "allow delete: if banglaMayWrite(resource.data.tenantId, resource.data.scope);"],
];
let caught = 0;
for (const [name, old, rep] of M) {
  const n = src.split(old).length - 1;
  if (n < 1) { console.log(`ANCHOR MISSING ${name}`); continue; }
  const file = path.join(dir, `${name}.rules`);
  fs.writeFileSync(file, src.split(old).join(rep));
  const r = spawnSync("node", ["--test", "bangla-words.rules.test.mjs"], { env: { ...process.env, MUTANT_FILE: file }, encoding: "utf8" });
  const red = r.status !== 0;
  console.log(`${red ? "caught   " : "UNPROVEN "} ${name} (${n} occurrence${n > 1 ? "s" : ""} replaced)`);
  if (red) caught++;
}
console.log(`mutations caught: ${caught} of ${M.length}`);
process.exit(caught === M.length ? 0 : 1);
