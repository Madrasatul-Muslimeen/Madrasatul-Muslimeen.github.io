// STAGE-5-TASK-08 — testing-only Note Foundation contract and absence
// characterisation. This does not implement collections, Rules, UI, data
// access, migration, or deployment. It protects the accepted legacy boundary
// and locks implementation authority without granting deployment authority.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
let passed = 0;
let failed = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const contract = JSON.parse(read("tools/i18n-verify/note-foundation-contract.json"));
const collections = read("app/js/collections.js");
const envelope = read("app/js/envelope.js");
const ayahNotes = read("app/js/ayah-notes.js");
const firestoreRules = read("firestore.rules");
const quranShell = read("app/quranrevival.html");

console.log("\n=== Approved physical Note Foundation test contract ===");
check("contract records bounded implementation authority", contract.status === "implementation-authorised-contract");
check("five Foundation collections are named exactly once",
  contract.foundationCollections.length === 5 &&
  new Set(contract.foundationCollections).size === 5);
check("import and derived-output collections remain deferred",
  contract.deferredCollections.length === 3);
check("Note identity remains opaque, stable and non-derived",
  contract.identity.noteId === "opaque-stable-non-derived");
check("Study Unit keys remain source references only",
  contract.identity.studyUnitKeyUse === "source-reference-only");
check("folder placement remains relational",
  contract.identity.folderPlacement === "many-to-many-relation");
check("immutable full-snapshot revisions remain measurement-gated",
  contract.revisionDirection === "immutable-full-snapshot-measure-before-implementation");

console.log("\n=== Amended scoped access contract ===");
check("self access is limited to the same auth-linked tenant person",
  contract.access.self.scope === "same-auth-linked-tenant-person" &&
  contract.access.self.read === "automatic" && contract.access.self.edit === "automatic");
check("guardian automatic read is limited to a linked managed child",
  contract.access.guardian.scope === "linked-managed-child-only" &&
  contract.access.guardian.read === "automatic");
check("managed-child editing requires per-Note guardian approval",
  contract.access.guardian.edit === "per-note-guardian-approval" &&
  contract.access.managedChildWithoutLogin.edit === "per-note-guardian-approval");
check("managed child without login is view-only by default",
  contract.access.managedChildWithoutLogin.read === "view-only-by-default");
check("teacher automatic read is limited to an active linked student",
  contract.access.teacher.scope === "active-linked-student-only" &&
  contract.access.teacher.read === "automatic");
check("tenant administrator read remains tenant-scoped",
  contract.access.tenantAdministrator.scope === "authorised-tenant-only" &&
  contract.access.tenantAdministrator.read === "automatic");
check("teacher and administrator receive no automatic edit authority",
  [contract.access.teacher, contract.access.tenantAdministrator, contract.access.platformAdministrator]
    .every((entry) => entry.edit === "no-automatic-authority"));
check("managed-child approval is locked to 30 server-enforced minutes",
  contract.access.managedChildApproval.durationMinutes === 30 &&
  contract.access.managedChildApproval.clock === "server-enforced" &&
  contract.access.managedChildApproval.scope === "one-note-one-guardian-one-child-one-tenant");
check("managed-child approval is renewable and terminable early",
  contract.access.managedChildApproval.renewal === "guardian-quick-approval" &&
  contract.access.managedChildApproval.earlyTermination === "revocation-or-context-exit-where-enforceable");

console.log("\n=== Existing application remains untouched ===");
check("legacy ayahNotes collection remains explicit",
  /AYAH_NOTES:\s*"ayahNotes"/.test(collections));
check("legacy notes remain keyed by unitKey",
  /notes\?\.\[unitKey\]\?\.html/.test(ayahNotes) && /`notes\.\$\{unitKey\}`/.test(ayahNotes));
check("legacy save remains one-entry overwrite behaviour",
  /\[`notes\.\$\{unitKey\}`\]: entry/.test(ayahNotes));
check("five Foundation collection constants are implemented exactly",
  contract.foundationCollections.every((name) => collections.includes(`"${name}"`)) &&
  ["NOTES", "NOTE_SOURCES", "NOTE_FOLDERS", "NOTE_PLACEMENTS", "NOTE_REVISIONS"]
    .every((name) => new RegExp(`\\b${name}:`).test(collections)));
check("read-dependent writes remain inside the envelope gateway",
  /export async function runEnvelopeTransaction/.test(envelope) &&
  /runTransaction\(db/.test(envelope));
check("no Foundation Rules match is implemented",
  contract.foundationCollections.every((name) => !firestoreRules.includes(`match /${name}/`)));
check("no per-Note guardian approval UI is implemented",
  !/data-note-guardian-approval|approveGuardianNoteEdit/.test(quranShell));

console.log("\n=== Explicit non-authority ===");
check("Stage 5 implementation is authorised", contract.implementationAuthorised === true);
check("Stage 5 Rules modification is authorised", contract.rulesModificationAuthorised === true);
check("no deployment is authorised", contract.deploymentAuthorised === false);
check("legacy compatibility forbids dual write and automatic migration",
  contract.legacyCompatibility.ayahNotesUnchanged === true &&
  contract.legacyCompatibility.dualWrite === false &&
  contract.legacyCompatibility.automaticMigration === false &&
  contract.legacyCompatibility.userControlledCopyWithProvenance === true);

console.log(`\n==== ${passed} passed, ${failed} failed ====`);
process.exit(failed === 0 ? 0 : 1);
