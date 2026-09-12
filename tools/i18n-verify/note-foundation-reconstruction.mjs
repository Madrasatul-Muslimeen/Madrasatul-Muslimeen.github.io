import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const foundation = read("app/js/note-foundation.js");
const shell = read("app/quranrevival.html");
const renderer = read("app/js/ayah-note-renderer.js");
const backup = read("app/js/backup.js");
const bn = read("app/js/i18n/bn.js");
let passed = 0;
const check = (name, ok) => { if (!ok) throw new Error(name); passed += 1; };

check("source-local lookup", /listNotesForSource/.test(foundation));
check("prior-copy lookup fails closed", /Creation is disabled for safety/.test(shell));
check("explicit copy", /data-note-save-permanent/.test(renderer) && /createPermanentNote/.test(shell));
check("no dual write", !/saveAyahNote|AYAH_NOTES/.test(foundation));
check("multiple notes remain possible", /Create another\?/.test(shell));
check("stale revision guard", /expectedRevisionId/.test(foundation) && /Reload the latest version/.test(shell));
check("source-local reopen", /data-note-open-permanent/.test(renderer));
check("managed child view-only", /View only until guardian approval/.test(shell));
check("guardian approval", /durationMinutes:\s*30/.test(foundation) && /grantManagedChildNoteApproval/.test(shell));
check("guardian revocation", /revokeManagedChildNoteApproval/.test(shell));
check("five backup collections", ["NOTES", "NOTE_SOURCES", "NOTE_FOLDERS", "NOTE_PLACEMENTS", "NOTE_REVISIONS"].every((name) => backup.includes(`TENANT.${name}`)));
check("retired notes are not filtered from backup", /listFoundationCollectionForOwner/.test(backup));
check("backup failures are isolated", /await attempt\(notes, `Permanent Notes/.test(backup));
check("Bangla visible strings", /এই উৎসের স্থায়ী নোটসমূহ/.test(bn));
check("version 08.09", /APP_VERSION = "08\.09"/.test(read("app/js/version.js")));

console.log(`==== Stage 5 reconstructed application boundary: ${passed} passed ====`);
