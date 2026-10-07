// Mutation proof for note-images-storage.rules.test.mjs: each Rules check, removed alone, must make the suite fail.
// Run from tools/firestore-emulator: node note-images-storage-mutations.mjs
import fs from "node:fs";
import { execSync } from "node:child_process";
const RULES = fs.readFileSync("../../docs/governance/2026-10-storage-rules-candidate.rules", "utf8");
const MUTATIONS = {
  "any-uid-create": ["allow create: if request.auth != null && request.auth.uid == uid", "allow create: if request.auth != null"],
  "overwrite-allowed": ["&& resource == null", ""],
  "no-size": ["&& request.resource.size <= 400 * 1024", ""],
  "no-type": ["&& request.resource.contentType == 'image/webp'", ""],
  "any-name": ["&& file.matches('[A-Za-z0-9_-]{8,40}[.]webp')", ""],
  "any-uid-read": ["allow read: if request.auth != null && request.auth.uid == uid;", "allow read: if request.auth != null;"],
  "delete-allowed": ["// no update, no delete", "allow delete: if request.auth != null && request.auth.uid == uid;"],
};
let unproven = 0;
for (const [name, [a, b]] of Object.entries(MUTATIONS)) {
  const n = RULES.split(a).length - 1;
  if (n !== 1) { console.log(`  UNPROVEN ${name}: anchor found ${n} times`); unproven++; continue; }
  const file = `.mutant-${name}.rules`;
  fs.writeFileSync(file, RULES.split(a).join(b));
  let failed = false, out = "";
  try { execSync("npm run --silent note-images-storage", { env: { ...process.env, MUTATE_RULES: file }, stdio: "pipe" }); }
  catch (e) { failed = true; out = String(e.stdout || ""); }
  fs.unlinkSync(file);
  const fails = (out.match(/^not ok \d+ - (.*)$/gm) || []).map((l) => l.replace(/^not ok \d+ - /, ""));
  console.log(`  ${failed ? "CAUGHT  " : "UNPROVEN"} ${name}${fails.length ? `: ${fails.join(" | ")}` : ""}`);
  if (!failed) unproven++;
}
console.log(`\n==== Storage Rules mutations: ${Object.keys(MUTATIONS).length - unproven} caught, ${unproven} unproven ====`);
process.exit(unproven ? 1 : 0);
