// Issue #301 -- the boundary guard around lemma-level word progress.
// UPDATED for issue #303, reason recorded rather than the suite silently
// dropped or weakened: #301 built ONLY the data layer and the Rules
// candidate, and "no page imports it" was the whole safety case for adding
// two new Firestore collections with no version bump and no product
// decision about what a reader sees. #303 is exactly the round that wires
// it in -- the Word Card's whole-Qur'an numbers, "Mark this word known
// everywhere", and effectiveOccurrenceState() applied to every "known"
// figure the app shows. The claim this suite makes is narrowed, not
// removed: EXACTLY app/quranrevival.html may reach the guarded pair, by any
// chain of any length, and no other page may. That claim is still about
// WIRING, and no functional test can see wiring -- a suite that only calls
// the exported functions would pass just as happily if a SECOND page also
// started calling them without anyone noticing. So this still walks the
// import graph from every app/*.html page, exactly the technique
// study-note-boundary.mjs and study-approach-contract-boundary.mjs use, with
// the same POSITIVE CONTROL: without proof the walker can find a module
// that IS wired (records.js), a broken regex would make every chain come
// back empty and the "only this one page reaches it" case below would pass
// vacuously.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
const appDir = path.join(root, "app");
const appJs = path.join(appDir, "js");

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    }
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

const GUARDED = ["quran-lemma-progress.js", "quran-lemma-progress-data.js"];

/** A module's CODE, with block comments and whole-line comments removed. */
function codeOf(name) {
  return fs.readFileSync(path.join(appJs, name), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((line) => !/^\s*(?:\/\/|\*)/.test(line)).join("\n");
}

function everyAppSource() {
  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|html)$/.test(entry.name)) out.push(full);
    }
  })(appDir);
  return out;
}

/** Local `./x.js` imports of one module. */
function localImportsOf(file) {
  const text = fs.readFileSync(file, "utf8");
  return [
    ...[...text.matchAll(/from\s*["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]),
    ...[...text.matchAll(/import\s*["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]),
  ];
}
/** The modules one page loads directly. */
function entryModulesOf(htmlPath) {
  return [...fs.readFileSync(htmlPath, "utf8").matchAll(/["'`](?:\.\/)?js\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]);
}
/** Every `app/*.html` page that can reach `target`, with the chain by which it does. */
function chainsToTarget(target) {
  const found = [];
  for (const entry of fs.readdirSync(appDir)) {
    if (!entry.endsWith(".html")) continue;
    const seen = new Set();
    const queue = entryModulesOf(path.join(appDir, entry)).map((m) => [m]);
    while (queue.length) {
      const chain = queue.shift();
      const head = chain[chain.length - 1];
      if (seen.has(head)) continue;
      seen.add(head);
      if (head === target) { found.push(`app/${entry} -> ${chain.join(" -> ")}`); break; }
      const full = path.join(appJs, head);
      if (!fs.existsSync(full)) continue;
      for (const next of localImportsOf(full)) queue.push([...chain, next]);
    }
  }
  return found;
}

// ===========================================================================
// 1. REACHABLE BY EXACTLY ONE PAGE, by any chain of any length -- with a
// positive control. Issue #303 wired the pair into app/quranrevival.html
// (the Word Card's whole-Qur'an numbers and "Mark this word known
// everywhere"); the invariant this suite protects is narrower now -- not
// "unreachable", but "reachable from nowhere else".
// ===========================================================================

const AUTHORISED_PAGE = "quranrevival.html";

check("POSITIVE CONTROL: the reachability walker really does find a wired module", () => {
  const control = chainsToTarget("records.js");
  assert.ok(control.length > 0, "the walker found no page importing records.js -- it is not working");
});

check("quran-lemma-progress.js is reached by EXACTLY app/quranrevival.html, by any chain of any length", () => {
  const reachable = chainsToTarget("quran-lemma-progress.js");
  const pages = reachable.map((chain) => chain.split(" -> ")[0].replace("app/", ""));
  assert.deepEqual(pages, [AUTHORISED_PAGE], `unexpected page(s) reaching quran-lemma-progress.js: ${reachable.join(" | ")}`);
});

check("quran-lemma-progress-data.js is reached by EXACTLY app/quranrevival.html, by any chain of any length", () => {
  const reachable = chainsToTarget("quran-lemma-progress-data.js");
  const pages = reachable.map((chain) => chain.split(" -> ")[0].replace("app/", ""));
  assert.deepEqual(pages, [AUTHORISED_PAGE], `unexpected page(s) reaching quran-lemma-progress-data.js: ${reachable.join(" | ")}`);
});

check("no app source imports either module directly, outside the guarded pair itself and the one authorised page", () => {
  const importers = [];
  for (const file of everyAppSource()) {
    if (GUARDED.some((g) => file.endsWith(path.join("js", g)))) continue;
    if (file.endsWith(AUTHORISED_PAGE)) continue;
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file).split(path.sep).join("/");
    for (const guarded of GUARDED) {
      const base = guarded.replace(/\.js$/, "");
      if (new RegExp(String.raw`(?:from|import)\s*["'\`][./]*(?:js/)?${base}\.js["'\`]`).test(text)) {
        importers.push(`${rel} -> ${guarded}`);
      }
    }
  }
  assert.deepEqual(importers, [], `unexpected importer(s) of the guarded pair: ${JSON.stringify(importers)}`);
});

// ===========================================================================
// 2. The data layer reaches the pure module, and reuses it, rather than
// re-implementing the same state machine a second time.
// ===========================================================================

check("the data layer imports the pure module rather than re-implementing its state machine", () => {
  const raw = fs.readFileSync(path.join(appJs, "quran-lemma-progress-data.js"), "utf8");
  assert.ok(raw.includes('from "./quran-lemma-progress.js"'), "quran-lemma-progress-data.js does not import quran-lemma-progress.js");
});

check("the pure module reuses quran-word-progress.js's own transition functions rather than re-typing the state machine", () => {
  const raw = fs.readFileSync(path.join(appJs, "quran-lemma-progress.js"), "utf8");
  assert.ok(raw.includes('from "./quran-word-progress.js"'), "quran-lemma-progress.js does not import quran-word-progress.js");
  for (const reused of ["claimLearnerState", "decideApproval", "resolveWordProgress", "wordProgressAuthority"]) {
    assert.ok(raw.includes(reused), `quran-lemma-progress.js no longer reuses ${reused} from the occurrence module`);
  }
});

// ===========================================================================
// 3. THE THREE MAP LOCKS quran-word-progress.js's own header states, proven
// to hold for the lemma module too -- reusing the same functions makes this
// true by construction, and this check makes sure nothing local reopens it.
// ===========================================================================

check("neither module can reach Mastery (records.js/activity.js) or the legacy entries[] array", () => {
  for (const name of GUARDED) {
    const text = codeOf(name);
    for (const forbidden of ["records.js", "activity.js", "arrayUnion", "claimStatus", "bulkConfirmWeek", "mastered"]) {
      assert.ok(!text.includes(forbidden), `${name} names ${forbidden}`);
    }
  }
});

check("neither module writes a lemma progress event as a side effect of anything but an explicit named act", () => {
  // Mirrors quran-word-progress.js's own lock 1: no projectWordState(event).
  for (const name of GUARDED) {
    const text = codeOf(name);
    assert.ok(!/project\w*State\s*\(/i.test(text), `${name} appears to derive a state from an event rather than an explicit act`);
  }
});

console.log(`\n==== Quran lemma progress boundary (issue #301): ${passed} passed, ${failed} failed ====`);
if (failed > 0) process.exit(1);
