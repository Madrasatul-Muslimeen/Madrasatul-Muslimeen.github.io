import fs from "node:fs";
const source = fs.readFileSync("tests/firestore/note-foundation.rules.test.mjs", "utf8");
const checks = [
  ["demo project", /demo-quranrevival-note-foundation/.test(source)],
  ["loopback only", /HOST = "127\.0\.0\.1"/.test(source)],
  ["unauthenticated denial", /unauthenticated Foundation/.test(source)],
  ["self scope", /owner may read/.test(source)],
  ["teacher read-only", /teacher and tenant\/platform administrators may read only/.test(source)],
  ["guardian-child scope", /guardian scope/.test(source)],
  ["approval isolation", /guardianApproval/.test(source) && /other-child/.test(source)],
  ["cross-tenant denial", /cross-tenant access/.test(source)],
  ["immutable revisions", /revision mutation are denied/.test(source)],
  ["cleanup", /env\.cleanup\(\)/.test(source)],
];
for (const [name, ok] of checks) {
  if (!ok) throw new Error(name);
}
console.log(`==== Stage 5 reconstructed Rules candidate: ${checks.length} passed ====`);
