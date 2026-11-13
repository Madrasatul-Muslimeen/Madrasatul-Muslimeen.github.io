// Mutation proof for the Dua groups candidate (PCF MSA J104 line 25). Each entry breaks ONE condition inside ONE scope
// (the whole duaGroups block, or one named function in it); EVERY occurrence inside that scope is replaced and the count
// printed; the suite must go RED on every one.
//   npx firebase emulators:exec --only firestore --project demo-mmsa-dua-groups --config dua-groups.firebase.json "node dua-groups.mutate.mjs"
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const SRC = path.resolve("../../docs/proposals/dua-groups.candidate.rules");
const src = fs.readFileSync(SRC, "utf8");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dua-groups-mut-"));
function scope(name) {
  const blockA = src.indexOf("match /duaGroups/"), blockZ = src.lastIndexOf("  }\n}");
  if (name === "block") return [blockA, blockZ];
  const a = src.indexOf(`function ${name}(`, blockA);
  if (a < 0) throw new Error(`no function ${name}`);
  let i = src.indexOf("{", a), depth = 0, j = i;
  for (; j < src.length; j++) { if (src[j] === "{") depth++; else if (src[j] === "}" && --depth === 0) break; }
  return [a, j + 1];
}
// NOT listed, EQUIVALENT mutants (each traced to another condition that refuses the same write):
//  - ownerKey.size() > 0: personInTenant(t, "") reads tenantPeople/"" -- an invalid path, an evaluation error, a denial.
//  - "tenantId/ownerKey == resource.data..." on update: the doc id is fixed and the shape binds it to tenantId + '__' +
//    ownerKey, so changing either already fails groupKey == ...; the pins stay as plain-words guards.
//  - the `ownerKey != 'admin'` guard in groupMayREAD: on the admin doc the person branch could only add readers who pass
//    canRecordFor for a person row called "admin" -- a member of the madrasah, who already reads it by the admin branch.
//    The same guard in groupMayWRITE is NOT equivalent and is listed (a student would write the madrasah's groups).
//  - hasAll -> hasAny: every key it names is type-checked with `is` below it; a missing key is an evaluation error.
const M = [
  ["createdBy-empty-ok", "groupShapeOk", "&& d().createdBy is string && d().createdBy.size() > 0;", ";"],
  ["schemaVersion-free", "groupShapeOk", "&& d().schemaVersion is number", ""],
  ["timestamps-free", "groupShapeOk", "d().createdAt is timestamp && d().updatedAt is timestamp", "true"],
  ["hasOnly-open", "groupShapeOk", "d().keys().hasOnly([", "d().keys().hasAny(["],
  ["tenantId-empty-ok", "groupShapeOk", "&& d().tenantId is string && d().tenantId.size() > 0", ""],
  ["key-free", "groupShapeOk", "&& groupKey == d().tenantId + '__' + d().ownerKey", ""],
  ["ownerKey-uncapped", "groupShapeOk", "&& d().ownerKey.size() <= 64", ""],
  ["nodes-not-list-ok", "groupShapeOk", "d().nodes is list && ", ""],
  ["nodes-uncapped", "groupShapeOk", "&& d().nodes.size() <= 200", ""],
  ["read-admin-any-signed-in", "groupMayRead", "(ownerKey == 'admin' && signedIn() && myRolesIn(tenantId).size() > 0)", "(ownerKey == 'admin' && signedIn())"],
  ["read-person-no-personInTenant", "groupMayRead", "&& personInTenant(tenantId, ownerKey) && canRecordFor", "&& canRecordFor"],
  ["read-person-no-canRecordFor", "groupMayRead", "&& personInTenant(tenantId, ownerKey) && canRecordFor(tenantId, ownerKey))", "&& personInTenant(tenantId, ownerKey))"],
  ["write-admin-any-member", "groupMayWrite", "(ownerKey == 'admin' && canAdminIdentity(tenantId))", "(ownerKey == 'admin' && myRolesIn(tenantId).size() > 0)"],
  ["write-admin-as-person", "groupMayWrite", "(ownerKey != 'admin' && personInTenant", "(personInTenant"],
  ["write-person-no-personInTenant", "groupMayWrite", "&& personInTenant(tenantId, ownerKey) && canRecordFor", "&& canRecordFor"],
  ["write-person-no-canRecordFor", "groupMayWrite", "&& personInTenant(tenantId, ownerKey) && canRecordFor(tenantId, ownerKey))", "&& personInTenant(tenantId, ownerKey))"],
  ["probe-any-doc", "block", "allow get: if signedIn() && !exists(/databases/$(database)/documents/duaGroups/$(groupKey));", "allow get: if signedIn();"],
  ["probe-anon", "block", "allow get: if signedIn() && !exists(", "allow get: if !exists("],
  ["list-allowed", "block", "allow get: if groupMayRead(resource.data.tenantId, resource.data.ownerKey);", "allow get, list: if groupMayRead(resource.data.tenantId, resource.data.ownerKey);"],
  ["create-createdBy-free", "block", "&& groupMayWrite(d().tenantId, d().ownerKey)\n                    && d().createdBy == myUid();", "&& groupMayWrite(d().tenantId, d().ownerKey);"],
  ["create-no-may", "block", "&& groupMayWrite(d().tenantId, d().ownerKey)\n", "\n"],
  ["update-no-may", "block", "&& groupMayWrite(resource.data.tenantId, resource.data.ownerKey)\n", "\n"],
  ["update-createdBy-free", "block", "\n                    && d().createdBy == resource.data.createdBy;", ";"],
  ["update-no-shape", "block", "allow update: if resource != null\n                    && groupShapeOk()", "allow update: if resource != null"],
  ["delete-allowed", "block", "allow delete: if false;", "allow delete: if signedIn();"],
];
let caught = 0;
for (const [name, sc, old, rep] of M) {
  const [a, z] = scope(sc);
  const part = src.slice(a, z);
  const n = part.split(old).length - 1;
  if (n < 1) { console.log(`ANCHOR MISSING ${name}`); continue; }
  const file = path.join(dir, `${name}.rules`);
  fs.writeFileSync(file, src.slice(0, a) + part.split(old).join(rep) + src.slice(z));
  const r = spawnSync("node", ["--test", "dua-groups.rules.test.mjs"], { env: { ...process.env, MUTANT_FILE: file }, encoding: "utf8" });
  const red = r.status !== 0;
  console.log(`${red ? "caught   " : "UNPROVEN "} ${name} (${n} occurrence${n > 1 ? "s" : ""} replaced in ${sc})`);
  if (red) caught++;
}
console.log(`mutations caught: ${caught} of ${M.length}`);
process.exit(caught === M.length ? 0 : 1);
