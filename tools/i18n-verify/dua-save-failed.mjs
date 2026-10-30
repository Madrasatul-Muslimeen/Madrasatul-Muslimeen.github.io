// Dua module, round R4 (PCF MSA J104): D20 -- a Dua save that fails says in plain words why, never the computer's own
// error text (j104q1, audit part 103). Pure: duaSaveFailed() against errors.js's own sentences, and every Dua save site
// routed through it. Run from the repository root:  node tools/i18n-verify/dua-save-failed.mjs
import fs from "node:fs";
import { duaSaveFailed } from "../../app/js/dua-check.js";
import { plainMessageFor } from "../../app/js/errors.js";

let passed = 0, failed = 0;
const check = (name, ok, detail = "") => { if (ok) { passed++; console.log(`  PASS  ${name}`); } else { failed++; console.log(`  FAIL  ${name} ${detail}`); } };
const fsErr = (code, message = code) => Object.assign(new Error(message), { code });

check("positive control: errors.js has a plain sentence for permission-denied", /permissions rule/.test(plainMessageFor({ code: "permission-denied" })));
for (const code of ["permission-denied", "unauthenticated", "unavailable", "deadline-exceeded"]) {
  const m = duaSaveFailed(fsErr(code, `FirebaseError: [code=${code}]: Missing or insufficient permissions.`));
  check(`a Firestore "${code}" failure says errors.js's plain sentence, not the raw text`, m === plainMessageFor({ code }) && !/FirebaseError|insufficient/.test(m), m);
}
const net = duaSaveFailed(new TypeError("Failed to fetch"));
check("a network failure with no code (Failed to fetch) is read as offline", net === plainMessageFor({ code: "unavailable" }), net);
const odd = duaSaveFailed(new Error("Cannot read properties of undefined (reading 'x')"));
check("any other failure says the save did not go through, without the computer's text", !/Cannot read/.test(odd) && odd === plainMessageFor({ code: "unknown" }), odd);

const files = ["app/js/dua-browser.js", "app/js/dua-check.js"].map((f) => [f, fs.readFileSync(f, "utf8")]);
for (const [f, s] of files) check(`${f} shows no save failure as "Not saved: <the computer's text>"`, !/Not saved: \{why\}/.test(s));
const sites = files.reduce((n, [, s]) => n + (s.match(/(?<!function )duaSaveFailed\(err\)/g) ?? []).length, 0);
check("all four Dua save sites (progress, word progress, bookmark, ✓ Check) use it", sites === 4, String(sites));

console.log(`\n==== Dua save failures in plain words (D20): ${passed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
