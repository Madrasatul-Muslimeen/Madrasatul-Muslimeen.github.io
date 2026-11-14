// v15.02 (the Owner, 15 Nov 2026: "sign in using google ... auto signin to the same account, doesn't ask for another
// account. So, I can't signin now using my owner account"). Every Google sign-in in app/ must ask Google for the
// account picker (prompt: "select_account"), or a browser signed in to one Google account can never choose another.
// Run from the repository root. Exits 0 only when every check passed. --prove runs the mutations (each must FAIL).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const MUT = process.argv.find((a) => a.startsWith("--mutate="))?.slice(9);
if (process.argv.includes("--prove")) {
  let missed = 0;
  for (const m of ["drop-one", "new-page"]) {
    const r = spawnSync(process.execPath, [process.argv[1], `--mutate=${m}`], { encoding: "utf8" });
    const ff = (r.stdout || "").split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && ff) console.log(`  CAUGHT  ${m}: ${ff.trim()}`); else { missed++; console.log(`  MISSED  ${m}`); }
  }
  process.exit(missed ? 1 : 0);
}
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); } };

const files = [];
const walk = (d) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else if (/\.(js|html)$/.test(e.name)) files.push(p); } };
walk("app");
const src = new Map(files.map((f) => [f, fs.readFileSync(path.join(root, f), "utf8")]));
if (MUT === "drop-one") { const f = "app/about.html"; src.set(f, src.get(f).replace('.setCustomParameters({ prompt: "select_account" })', "")); }
if (MUT === "new-page") src.set("app/_mutant.html", "<script type=module>signInWithPopup(auth, new GoogleAuthProvider()).catch(() => {});</script>");

const signIns = [...src].flatMap(([f, s]) => [...s.matchAll(/signIn\w*\(\s*auth\s*,([^\n]*)/g)].map((m) => ({ f, arg: m[1] })));
const google = signIns.filter((x) => /GoogleAuthProvider/.test(x.arg));
check("POSITIVE CONTROL: the Google sign-ins are found (at least 20 pages)", google.length >= 20, `found ${google.length}`);
const bare = google.filter((x) => !/new GoogleAuthProvider\(\)\.setCustomParameters\(\{ prompt: "select_account" \}\)/.test(x.arg));
check("every Google sign-in asks for the account picker (prompt: select_account)", bare.length === 0, bare.map((x) => x.f).join(", "));
const providers = [...src].flatMap(([f, s]) => [...s.matchAll(/new GoogleAuthProvider\(\)(?!\.setCustomParameters\(\{ prompt: "select_account" \}\))/g)].map(() => f));
check("no GoogleAuthProvider is made anywhere without the picker", providers.length === 0, providers.join(", "));
const stub = fs.readFileSync(path.join(root, "tools/i18n-verify/firebase-stub.mjs"), "utf8");
check("the harness stub's GoogleAuthProvider has setCustomParameters returning the provider (as the real SDK)", /GoogleAuthProvider\.prototype\.setCustomParameters = function \(params\) \{ this\.customParameters = params; return this; \};/.test(stub));
console.log(`\n==== google-account-picker: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
