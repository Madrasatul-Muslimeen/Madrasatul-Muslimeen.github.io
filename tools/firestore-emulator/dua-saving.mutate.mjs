// Mutation proof for the Dua-saving candidate (PCF MSA J104). Each entry breaks ONE condition inside ONE collection's
// match block (every occurrence inside that block is replaced, and the count is printed); the suite must go RED on every one.
//   npx firebase emulators:exec --only firestore --project demo-mmsa-dua-saving --config dua-saving.firebase.json "node dua-saving.mutate.mjs"
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const SRC = path.resolve("../../docs/proposals/dua-saving.candidate.rules");
const src = fs.readFileSync(SRC, "utf8");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dua-mut-"));
const BLOCKS = ["duaPlans", "duaEdits", "duaShares"];
function block(name) {
  const a = src.indexOf(`match /${name}/`);
  const nexts = BLOCKS.map((b) => src.indexOf(`match /${b}/`)).filter((i) => i > a);
  const b = nexts.length ? Math.min(...nexts) : src.lastIndexOf("  }\n}");
  return [a, b];
}
// NOT listed, EQUIVALENT mutants (each was run, stayed green, and was traced to another condition that refuses the same write):
//  - plan personId.size() > 0: personInTenant(t, "") reads tenantPeople/"" -- an invalid path, an evaluation error, a denial.
//  - plan/edit "tenantId/personId/duaKey == resource.data..." on update: the doc id is fixed and the shape binds it to
//    tenantId + '__' + key, so changing either already fails planKey/editKey == ...; the pins stay as plain-words guards.
//  - edit title `t is map`: t.keys() on a non-map is an evaluation error. share occasion `is string`: .size() on a number is.
//  - share createdBy.size() > 0: create requires createdBy == myUid() (never empty) and nothing may update a share.
// NOT listed: a hasAll([...]) -> hasAny mutant. Every key it names is also type-checked with `is` below it, and a missing key
// makes that check an evaluation error (a denial), so the hasAll is redundant by construction: an equivalent mutant.
const I17 = (b) => [
  ...(b === "duaShares" ? [] : [[`${b}-createdBy-empty-ok`, b, "&& d().createdBy is string && d().createdBy.size() > 0;", ";"]]),
  [`${b}-schemaVersion-free`, b, "&& d().schemaVersion is number", ""],
  [`${b}-timestamps-free`, b, "d().createdAt is timestamp && d().updatedAt is timestamp", "true"],
  [`${b}-hasOnly-open`, b, "d().keys().hasOnly([", "d().keys().hasAny(["],
  [`${b}-tenantId-empty-ok`, b, "&& d().tenantId is string && d().tenantId.size() > 0", ""],
  [`${b}-delete-allowed`, b, "allow delete: if false;", "allow delete: if signedIn();"],
];
const M = [
  // duaPlans
  ...I17("duaPlans"),
  ["plan-key-free", "duaPlans", "&& planKey == d().tenantId + '__' + d().personId", ""],
  ["plan-marks-not-map-ok", "duaPlans", "d().marks is map && ", ""],
  ["plan-marks-uncapped", "duaPlans", "&& d().marks.size() <= 5000", ""],
  ["plan-important-not-list-ok", "duaPlans", "d().important is list && ", ""],
  ["plan-important-uncapped", "duaPlans", "&& d().important.size() <= 5000", ""],
  ["plan-no-personInTenant", "duaPlans", "return personInTenant(tenantId, personId) && canRecordFor(tenantId, personId);", "return canRecordFor(tenantId, personId);"],
  ["plan-no-canRecordFor", "duaPlans", "return personInTenant(tenantId, personId) && canRecordFor(tenantId, personId);", "return personInTenant(tenantId, personId);"],
  ["plan-probe-any-doc", "duaPlans", "allow get: if signedIn() && !exists(/databases/$(database)/documents/duaPlans/$(planKey));", "allow get: if signedIn();"],
  ["plan-probe-anon", "duaPlans", "allow get: if signedIn() && !exists(", "allow get: if !exists("],
  ["plan-list-allowed", "duaPlans", "allow get: if planMay(resource.data.tenantId, resource.data.personId);", "allow get, list: if planMay(resource.data.tenantId, resource.data.personId);"],
  ["plan-create-createdBy-free", "duaPlans", "&& planMay(d().tenantId, d().personId)\n                    && d().createdBy == myUid();", "&& planMay(d().tenantId, d().personId);"],
  ["plan-create-no-may", "duaPlans", "&& planMay(d().tenantId, d().personId)\n", "\n"],
  ["plan-update-no-may", "duaPlans", "&& planMay(resource.data.tenantId, resource.data.personId)\n                    && d().tenantId", "&& d().tenantId"],
  ["plan-update-createdBy-free", "duaPlans", "\n                    && d().createdBy == resource.data.createdBy;", ";"],
  ["plan-update-no-shape", "duaPlans", "allow update: if resource != null\n                    && planShapeOk()", "allow update: if resource != null"],
  // duaEdits
  ...I17("duaEdits"),
  ["edit-duaKey-free", "duaEdits", "&& d().duaKey is string && d().duaKey.matches('^([0-9]{1,6}|new-[A-Za-z0-9_-]{6,40})$')", "&& d().duaKey is string"],
  ["edit-key-free", "duaEdits", "&& editKey == d().tenantId + '__' + d().duaKey", ""],
  ["edit-title-free", "duaEdits", "&& editTitleOk(d().title)", ""],
  ["edit-title-any-keys", "duaEdits", "t.keys().hasOnly(['en', 'bn'])", "true"],
  ["edit-title-en-unchecked", "duaEdits", "(t.en is string && t.en.size() <= 300)", "true"],
  ["edit-title-en-uncapped", "duaEdits", "&& t.en.size() <= 300", ""],
  ["edit-title-bn-unchecked", "duaEdits", "(t.bn is string && t.bn.size() <= 300)", "true"],
  ["edit-title-bn-uncapped", "duaEdits", "&& t.bn.size() <= 300", ""],
  ["edit-placements-not-list-ok", "duaEdits", "d().placements is list && ", ""],
  ["edit-placements-uncapped", "duaEdits", "&& d().placements.size() <= 50", ""],
  ["edit-hidden-not-bool-ok", "duaEdits", "&& d().hidden is bool", ""],
  ["edit-added-anywhere", "duaEdits", "&& (('added' in d()) == d().duaKey.matches('^new-.*$'))", ""],
  ["edit-added-not-map-ok", "duaEdits", "(d().added is map && d().added.size() <= 20)", "(d().added.size() <= 20)"],
  ["edit-added-uncapped", "duaEdits", "&& d().added.size() <= 20", ""],
  ["edit-read-any-signed-in", "duaEdits", "return signedIn() && myRolesIn(tenantId).size() > 0;", "return signedIn();"],
  ["edit-probe-any-doc", "duaEdits", "allow get: if signedIn() && !exists(/databases/$(database)/documents/duaEdits/$(editKey));", "allow get: if signedIn();"],
  ["edit-create-any-member", "duaEdits", "&& canAdminIdentity(d().tenantId)", "&& myRolesIn(d().tenantId).size() > 0"],
  ["edit-create-createdBy-free", "duaEdits", "&& canAdminIdentity(d().tenantId)\n                    && d().createdBy == myUid();", "&& canAdminIdentity(d().tenantId);"],
  ["edit-update-any-member", "duaEdits", "&& canAdminIdentity(resource.data.tenantId)", "&& myRolesIn(resource.data.tenantId).size() > 0"],
  ["edit-update-createdBy-free", "duaEdits", "\n                    && d().createdBy == resource.data.createdBy;", ";"],
  ["edit-update-no-shape", "duaEdits", "allow update: if resource != null\n                    && editShapeOk()", "allow update: if resource != null"],
  // duaShares
  ...I17("duaShares"),
  ["share-duaKey-free", "duaShares", "&& d().duaKey is string && d().duaKey.matches('^([0-9]{1,6}|new-[A-Za-z0-9_-]{6,40})$')", "&& d().duaKey is string"],
  ["share-where-open", "duaShares", "&& d().where in ['whatsapp', 'facebook', 'email', 'print', 'masjidBoard', 'other']", "&& d().where is string"],
  ["share-whoFor-open", "duaShares", "&& d().whoFor in ['family', 'students', 'teachers', 'masjidCommunity', 'public', 'other']", "&& d().whoFor is string"],
  ["share-occasion-uncapped", "duaShares", "&& d().occasion.size() <= 300", ""],
  ["share-sharedAt-free", "duaShares", "&& d().sharedAt is timestamp", ""],
  ["share-read-any-member", "duaShares", "allow get, list: if canAdminIdentity(resource.data.tenantId);", "allow get, list: if myRolesIn(resource.data.tenantId).size() > 0;"],
  ["share-create-any-signed-in", "duaShares", "&& (canAdminIdentity(d().tenantId) || myRolesIn(d().tenantId).size() > 0)", "&& signedIn()"],
  ["share-create-admins-only", "duaShares", "&& (canAdminIdentity(d().tenantId) || myRolesIn(d().tenantId).size() > 0)", "&& canAdminIdentity(d().tenantId)"],
  ["share-create-createdBy-free", "duaShares", "&& (canAdminIdentity(d().tenantId) || myRolesIn(d().tenantId).size() > 0)\n                    && d().createdBy == myUid();", "&& (canAdminIdentity(d().tenantId) || myRolesIn(d().tenantId).size() > 0);"],
  ["share-update-allowed", "duaShares", "allow update: if false;", "allow update: if canAdminIdentity(resource.data.tenantId);"],
];
let caught = 0;
for (const [name, b, old, rep] of M) {
  const [a, z] = block(b);
  const part = src.slice(a, z);
  const n = part.split(old).length - 1;
  if (n < 1) { console.log(`ANCHOR MISSING ${name}`); continue; }
  const file = path.join(dir, `${name}.rules`);
  fs.writeFileSync(file, src.slice(0, a) + part.split(old).join(rep) + src.slice(z));
  const r = spawnSync("node", ["--test", "dua-saving.rules.test.mjs"], { env: { ...process.env, MUTANT_FILE: file }, encoding: "utf8" });
  const red = r.status !== 0;
  console.log(`${red ? "caught   " : "UNPROVEN "} ${name} (${n} occurrence${n > 1 ? "s" : ""} replaced in ${b})`);
  if (red) caught++;
}
console.log(`mutations caught: ${caught} of ${M.length}`);
process.exit(caught === M.length ? 0 : 1);
