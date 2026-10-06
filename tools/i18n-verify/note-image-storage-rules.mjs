// Pictures in Notes (item 35) -- reads the Storage Rules CANDIDATE as text (the Storage emulator needs firebase-tools, which the
// Action does not have; the Architect runs `firebase emulators:exec --only storage` on it). Checks the shape the issue decided:
// private to the uid, create-only (no update, no delete), < 400 KB, image/webp, the file-name pattern the sanitiser also uses,
// everything else denied, and that nothing deploys it. Run from the repository root.
import assert from "node:assert/strict";
import fs from "node:fs";
import { NOTE_IMAGE_PATH_RE } from "../../app/js/note-image-path.js";

let pass = 0, fail = 0;
function check(name, fn) { try { fn(); pass++; console.log(`  PASS  ${name}`); } catch (e) { fail++; console.log(`  FAIL  ${name}\n        ${e.message}`); } }
const raw = fs.readFileSync("docs/governance/2026-10-storage-rules-candidate.rules", "utf8");
const src = raw.replace(/^\s*\/\/.*$/gm, "");
const block = (src.match(/match \/noteImages\/\{uid\}\/\{file\} \{([\s\S]*?)\n    \}/) || [])[1] ?? "";

check("the noteImages/{uid}/{file} match is there", () => assert.ok(block.length > 50, "no match block"));
check("read: only the signed-in uid", () => assert.match(block, /allow read: if request\.auth != null && request\.auth\.uid == uid;/));
check("create: the same uid, under 400 KB, image/webp, file-name pattern", () => {
  const create = block.match(/allow create:[^;]*;/s)?.[0] ?? "";
  assert.match(create, /request\.auth\.uid == uid/);
  assert.match(create, /request\.resource\.size < 400 \* 1024/);
  assert.match(create, /request\.resource\.contentType == 'image\/webp'/);
  assert.match(create, /file\.matches\('\[A-Za-z0-9_-\]\{8,40\}\[\.\]webp'\)/);
});
check("NO update and NO delete anywhere (D6)", () => assert.ok(!/allow\s+[^;]*\b(update|delete|write)\b/.test(block), "the noteImages block allows update/delete/write"));
check("everything else is denied", () => assert.match(src, /match \/\{allPaths=\*\*\} \{\s*allow read, write: if false;/));
check("the file-name pattern in the Rules is the one the sanitiser uses", () => {
  assert.ok(NOTE_IMAGE_PATH_RE.test("noteImages/u/AbCdEf12.webp") && !NOTE_IMAGE_PATH_RE.test("noteImages/u/Ab.webp"));
});
check("firebase.json does not deploy it (the Owner publishes it)", () => assert.ok(!/storage/i.test(fs.readFileSync("firebase.json", "utf8"))));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
