// Every named import the app takes from the Firebase CDN must exist as an
// export on the test stub.
//
// Why this file exists: the stub is swapped in for the real firebase-firestore
// module, so a name the app imports and the stub does not export is not a
// missing feature -- it is a module-level SyntaxError that stops the whole
// page from booting. It fails loudly in the harness and never in production,
// where the real SDK does export the name, so it reads as a catastrophic app
// regression and is nothing of the kind.
//
// This has now happened three times in one line of work: runTransaction
// (app/js/envelope.js, merged to main, which took behaviour.mjs from ~800 pass
// to 20 pass / 180 fail), then limit and orderBy (app/js/note-foundation.js).
// One cheap check catches the whole class the moment a module adds an import,
// instead of the next round paying for it in a confusing full-suite collapse.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|html)$/.test(e.name)) out.push(p);
  }
  return out;
}

const IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*["']https:\/\/www\.gstatic\.com\/firebasejs\/[^"']*["']/g;
const imported = new Map();
for (const file of walk(path.join(root, "app"))) {
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(IMPORT_RE)) {
    for (const raw of m[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (name && !imported.has(name)) imported.set(name, path.relative(root, file));
    }
  }
}

const stub = fs.readFileSync(path.join(here, "firebase-stub.mjs"), "utf8");
const exported = new Set([
  ...[...stub.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map((m) => m[1]),
  ...[...stub.matchAll(/export\s+const\s+(\w+)/g)].map((m) => m[1]),
]);

let pass = 0;
const missing = [...imported].filter(([name]) => !exported.has(name));

assert.ok(imported.size > 15, `expected to find the app's Firebase imports, saw ${imported.size}`);
pass++;
console.log(`  PASS  found ${imported.size} Firebase names imported across app/`);

assert.deepEqual(
  missing.map(([n, f]) => `${n} (first imported by ${f})`),
  [],
  "these names would be a module-level SyntaxError in the harness",
);
pass++;
console.log(`  PASS  every imported name is exported by the stub`);

// The stub is only worth anything if it is really the module being loaded.
assert.match(
  fs.readFileSync(path.join(here, "harness.mjs"), "utf8"),
  /gstatic\.com\/firebasejs/,
  "the harness no longer routes the Firebase CDN to the stub",
);
pass++;
console.log("  PASS  the harness still routes the Firebase CDN to the stub");

// Architect review, 25 Sep 2026: firebase-stub.mjs keeps the whole stub
// module inside ONE template literal, so a backtick anywhere in it -- even in
// a comment -- ends the literal early and the file stops parsing. Every
// browser suite then dies at import, which reads like a broken app. It has
// happened twice in one week (issues #259 and #282). Import it here, so the
// guard names the file instead.
{
  let loaded = false, message = "";
  try { await import(new URL("./firebase-stub.mjs", import.meta.url).href); loaded = true; }
  catch (err) { message = err.message; }
  assert.ok(loaded, `firebase-stub.mjs does not parse (${message}) -- look for a backtick inside the stub's template literal, often in a comment`);
  pass++;
  console.log("  PASS  firebase-stub.mjs parses (no stray backtick inside its template literal)");
}

console.log(`\n==== Firebase stub parity: ${pass} passed, 0 failed ====`);
