// MAP v4 Phase 7 (P7-A) -- the STRUCTURAL guards around the Dawah printable-
// page contract and its data layer. Everything here is invisible to a
// functional test.
//
// Two claims are made by P7-A that no behaviour suite can see:
//
//   1. ADR-005 -- "a Dawah piece is derived output and must never overwrite
//      its source Note" -- which is about WHAT `dawah-data.js` can reach,
//      not about what it does with what it reaches. The strongest, simplest
//      way to prove that is to assert it imports NOTHING from
//      note-foundation.js at all (not its write functions, not its read
//      functions, not even its id helpers), rather than trying to name every
//      write function note-foundation.js exports today and hoping the list
//      stays complete.
//   2. "This changes nothing" -- which is about WIRING. `dawah-data.js`
//      could pass every one of its own function-level tests while being
//      imported into a live screen. So this suite walks the real import
//      graph from every `app/*.html` page, the same shape
//      `study-note-boundary.mjs`/`study-approach-contract-boundary.mjs` both
//      already use for an uninvoked module.
//
// UPDATED for P7-B (issue #250), WITH THE REASON RECORDED RATHER THAN THE
// CHECK WEAKENED. "No page reaches dawah-contract.js/dawah-data.js" was true
// only because nothing had yet built the screens these modules exist for.
// P7-B built them (app/dawah.html, and app/notes.html's own "Make a
// printable page" entry point), so asserting continued unreachability now
// would be asserting the round's own wiring does not work -- the identical
// shape study-note-boundary.mjs's own P5-D update, and v08.30's Activity
// reachability guard, both already inverted for exactly this reason. The
// three reachability/importer checks below now assert the STRONGER, NARROWER
// claim instead: EXACTLY app/dawah.html and app/notes.html reach the guarded
// modules, by any chain of any length, and no other file imports them
// directly. A new module, js/dawah-readiness.js (the same readiness-gate
// shape app/js/study-evidence-readiness.js/study-wbw-total-readiness.js
// already use), is added to the same reachability/purity discipline, and a
// new section proves every one of dawah-data.js's six exported WRITE
// functions is called on both pages only from behind that gate -- so a
// reader can never see a permission error from an undeployed collection,
// which is the whole reason the gate exists.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

import { DAWAH_ACTIONS, DAWAH_PAGE_STATUSES, DAWAH_STATUS, dawahTransition } from "../../app/js/dawah-contract.js";
import { DAWAH_READINESS_DECLARATION, isDawahReady } from "../../app/js/dawah-readiness.js";

const root = path.resolve(process.argv[2] || process.cwd());
const appDir = path.join(root, "app");
const appJs = path.join(appDir, "js");

let passed = 0, failed = 0;
function check(name, fn) {
  // A SYNCHRONOUS RUNNER COUNTS AN `async` BODY AS A PASS -- the assertion
  // throws inside an uncaught promise and the case prints PASS. Refuse it.
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    }
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

const GUARDED = ["dawah-contract.js", "dawah-data.js", "dawah-readiness.js"];
const WIRED_PAGES = ["app/dawah.html", "app/notes.html"];

/** A module's CODE, with block comments and whole-line `//` comments removed -- so a forbidden name in a doc comment never counts as a real reference. */
function codeOf(name) {
  return fs.readFileSync(path.join(appJs, name), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(?:\/\/|\*)/.test(line))
    .join("\n");
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

// --- 1. UNINVOKED, BY ANY CHAIN OF ANY LENGTH -------------------------------

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

check("POSITIVE CONTROL: the reachability walker really does find a wired module", () => {
  // Without this, a broken regex would make every chain come back empty and
  // the cases below would pass vacuously -- a check that cannot fail.
  const control = chainsToTarget("records.js");
  assert.ok(control.length > 0, "the walker found no page importing records.js -- it is not working");
});

// UPDATED for P7-B (issue #250) -- see the header comment above. "Exactly
// these two pages" is the stronger, narrower claim continued unreachability
// can no longer make.
check("EXACTLY app/dawah.html and app/notes.html reach dawah-data.js, by any chain of any length", () => {
  const reachable = chainsToTarget("dawah-data.js");
  const pages = reachable.map((r) => r.split(" -> ")[0]).sort();
  assert.deepEqual(pages, WIRED_PAGES, `unexpected page(s) reaching dawah-data.js: ${reachable.join(" | ")}`);
});

check("EXACTLY app/dawah.html and app/notes.html reach dawah-contract.js, by any chain of any length", () => {
  const reachable = chainsToTarget("dawah-contract.js");
  const pages = reachable.map((r) => r.split(" -> ")[0]).sort();
  assert.deepEqual(pages, WIRED_PAGES, `unexpected page(s) reaching dawah-contract.js: ${reachable.join(" | ")}`);
});

check("EXACTLY app/dawah.html and app/notes.html reach dawah-readiness.js, by any chain of any length", () => {
  const reachable = chainsToTarget("dawah-readiness.js");
  const pages = reachable.map((r) => r.split(" -> ")[0]).sort();
  assert.deepEqual(pages, WIRED_PAGES, `unexpected page(s) reaching dawah-readiness.js: ${reachable.join(" | ")}`);
});

check("the only direct importers of the guarded modules are the two wired pages, by a direct textual scan", () => {
  const importers = [];
  for (const file of everyAppSource()) {
    if (GUARDED.some((g) => file.endsWith(path.join("js", g)))) continue;
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file).split(path.sep).join("/");
    for (const guarded of GUARDED) {
      const base = guarded.replace(/\.js$/, "");
      if (new RegExp(String.raw`(?:from|import)\s*["'\`][./]*(?:js/)?${base}\.js["'\`]`).test(text)) {
        importers.push(`${rel} -> ${guarded}`);
      }
    }
  }
  // notes.html reaches dawah-contract.js only TRANSITIVELY (through
  // dawah-data.js's own import of it) -- it has no reason to name
  // dawah-contract.js directly, and doesn't. dawah.html imports all three
  // guarded modules directly: DAWAH_STATUS for its status groupings/labels,
  // the gate, and the six write functions plus the three list reads.
  const expected = [
    "app/dawah.html -> dawah-contract.js",
    "app/dawah.html -> dawah-data.js",
    "app/dawah.html -> dawah-readiness.js",
    "app/notes.html -> dawah-data.js",
    "app/notes.html -> dawah-readiness.js",
  ];
  assert.deepEqual(importers.sort(), expected.sort(), `unexpected importer set for the guarded modules: ${JSON.stringify(importers)}`);
});

// --- 2. ADR-005: dawah-data.js DOES NOT IMPORT note-foundation.js AT ALL ----

check("dawah-contract.js imports nothing at all -- pure policy, same pattern as journey-map-contract.js", () => {
  const text = fs.readFileSync(path.join(appJs, "dawah-contract.js"), "utf8");
  assert.equal([...text.matchAll(/^\s*import\s/gm)].length, 0);
});

// P7-B (issue #250) -- the readiness gate copies study-evidence-readiness.js/
// study-wbw-total-readiness.js's own enforcement-by-inability EXACTLY: it
// cannot infer readiness from firestore.rules because it cannot read
// anything at all, and this is what proves that rather than merely asserting it.
check("dawah-readiness.js imports nothing at all -- it cannot consult firestore.rules even by accident", () => {
  const text = fs.readFileSync(path.join(appJs, "dawah-readiness.js"), "utf8");
  assert.equal([...text.matchAll(/^\s*import\s/gm)].length, 0);
});

// UPDATED IN PLACE, 24 Sep 2026: the declaration was ENABLED by a governed
// decision after the Owner published the Dawah Rules. Only the assertion
// about the REAL file's CURRENT state changed (it is ready, and ready ONLY
// through a well-formed decision whose reference file exists); every
// malformed-shape refusal below is asserted exactly as strictly as before.
check("the readiness declaration is enabled ONLY through a governed decision naming a real record", () => {
  assert.equal(DAWAH_READINESS_DECLARATION.ready, true);
  const dec = DAWAH_READINESS_DECLARATION.decision;
  assert.ok(dec && dec.by === "master-architect" && /^\d{4}-\d{2}-\d{2}$/.test(dec.on), "decision must name the authority and a real date");
  assert.ok(fs.existsSync(path.join(root, dec.reference)), `the decision's reference ${dec.reference} does not exist`);
  assert.equal(isDawahReady(), true);
  assert.equal(isDawahReady({ ...DAWAH_READINESS_DECLARATION, decision: null }), false, "the same ready:true without its decision must refuse");
  assert.equal(isDawahReady({ ready: true, decision: null }), false, "ready:true with no decision must still refuse");
  assert.equal(isDawahReady({ ready: true, decision: { by: "master-architect", on: "2026-09-24", reference: "x" } }), true,
    "a genuinely well-formed governed decision must be accepted");
  assert.equal(isDawahReady({ ready: true, decision: { by: "the-author-itself", on: "2026-09-24", reference: "x" } }), false,
    "an authority outside the closed set must be refused");
});

check("dawah-data.js does not import note-foundation.js at all -- ADR-005, the strongest form of the claim", () => {
  // codeOf(), not the raw file text: this module's own header comment NAMES
  // note-foundation.js in prose, precisely to explain why it is not
  // imported -- the same "strip comments before grepping for a forbidden
  // name" lesson this codebase's own standing rules record.
  assert.ok(!/note-foundation\.js/.test(codeOf("dawah-data.js")), "dawah-data.js names note-foundation.js outside a comment");
  const text = fs.readFileSync(path.join(appJs, "dawah-data.js"), "utf8");
  const specifiers = [...text.matchAll(/^\s*import[^;]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  const local = specifiers.filter((s) => s.startsWith("./"));
  assert.deepEqual(local.sort(), ["./collections.js", "./dawah-contract.js", "./envelope.js"],
    `dawah-data.js's local imports have drifted from the expected, minimal set: ${local.join(", ")}`);
});

// A closed list, named explicitly and checked as its own thing (belt AND
// braces alongside the import check above): even if note-foundation.js were
// ever imported by accident, none of its WRITE functions may be named.
const NOTE_WRITING_FUNCTIONS = [
  "createPermanentNote", "updatePermanentNoteContent", "retirePermanentNote",
  "createNoteFolder", "renameNoteFolder", "reorderNoteFolder", "reparentNoteFolder", "retireNoteFolder",
  "createNotePlacement", "reorderNotePlacement", "retireNotePlacement", "moveNotePlacement",
  "createNoteSource", "retireNoteSource",
];
check("dawah-data.js never names a note-foundation.js WRITE function", () => {
  const text = codeOf("dawah-data.js");
  const offenders = NOTE_WRITING_FUNCTIONS.filter((name) => text.includes(name));
  assert.deepEqual(offenders, [], `dawah-data.js names note-writing function(s): ${offenders.join(", ")}`);
});

check("dawah-data.js reads notes/noteRevisions/noteSources read-only -- no setDoc/updateDoc/addDoc/runTransaction of its own on those collections", () => {
  const text = codeOf("dawah-data.js");
  for (const forbidden of ["setDoc(", "updateDoc(", "addDoc(", "runTransaction(", "writeBatch(", "deleteDoc("]) {
    assert.ok(!text.includes(forbidden), `dawah-data.js calls ${forbidden} directly -- every write must go through envelope.js`);
  }
});

// --- 3. the closed vocabulary is bound to ADR-011 ---------------------------

check("every status and action ADR-011 names is exactly what the contract implements", () => {
  const adr = fs.readFileSync(path.join(root, "docs/governance/adr/ADR-011-dawah-printable-pages-v1.md"), "utf8");
  for (const status of DAWAH_PAGE_STATUSES) {
    assert.ok(adr.includes(`\`${status}\``), `ADR-011 does not record the status ${status}`);
  }
  assert.deepEqual([...DAWAH_PAGE_STATUSES].sort(),
    [DAWAH_STATUS.DRAFT, DAWAH_STATUS.AWAITING_APPROVAL, DAWAH_STATUS.SHARED, DAWAH_STATUS.RETIRED].sort());
  for (const action of DAWAH_ACTIONS) {
    assert.ok(adr.includes(`\`${action}\``), `ADR-011 does not record the action ${action}`);
  }
});

check("the named transitions match ADR-011's own table exactly", () => {
  assert.equal(dawahTransition("submit", "draft"), "awaiting-approval");
  assert.equal(dawahTransition("share", "draft"), "shared");
  assert.equal(dawahTransition("approve", "awaiting-approval"), "shared");
  assert.equal(dawahTransition("return", "awaiting-approval"), "draft");
  for (const status of DAWAH_PAGE_STATUSES) {
    if (status === "retired") continue;
    assert.equal(dawahTransition("retire", status), "retired", `retire from ${status} should reach retired`);
  }
  assert.equal(dawahTransition("retire", "retired"), null, "retiring an already-retired page must refuse, not no-op silently");
});

check("no transition skips a status ADR-011 does not name -- e.g. no draft -> shared for a page that needs approval is expressed here", () => {
  // The contract itself cannot check "does this author need approval" (it
  // imports nothing and has no concept of an author) -- that gate is
  // dawah-data.js's own canShareDirectly() call before invoking this
  // transition. What the contract CAN guarantee is that every OTHER move
  // stays exactly the one named move, never a shortcut.
  assert.equal(dawahTransition("approve", "draft"), null, "approve must not be reachable from draft");
  assert.equal(dawahTransition("share", "awaiting-approval"), null, "share must not be reachable from awaiting-approval");
  assert.equal(dawahTransition("submit", "shared"), null, "submit must not be reachable from shared");
  assert.equal(dawahTransition("return", "draft"), null, "return must not be reachable from draft");
  assert.equal(dawahTransition("retire", "bogus-status"), null, "an unrecognised status must refuse, not guess");
});

// --- 4. EVERY WRITE FUNCTION IS CALLED ONLY BEHIND THE READINESS GATE ------
// (issue #250, build step 8) -- "No Firestore call is made at all" while the
// gate is closed is a claim about EVERY call site, not about the gate module
// existing. Both pages gate every write with the same two markers:
// dawah.html's own dawahGateOpenOrExplain() (a single "return true when
// ready, else explain and return false" helper used by every write handler)
// and notes.html's bare isDawahReady() check inside makeDawahPage(). A write
// call is identified by its own real call shape (`funcName(db,` -- the same
// text no import statement can ever contain), and the gate marker must
// appear somewhere in the WINDOW of source immediately before it -- measured
// against the actual longest gap this round's own code has (returnPage(),
// ~360 characters from its own `dawahGateOpenOrExplain()` guard clause to
// its `returnDawahPageToDraft(db,` call), with real margin on top of that.
const DAWAH_WRITE_FUNCTIONS = [
  "createDawahPage", "submitDawahPageForApproval", "approveDawahPage",
  "returnDawahPageToDraft", "shareDawahPage", "retireDawahPage",
];
const GATE_MARKERS = ["isDawahReady()", "dawahGateOpenOrExplain("];
const GATE_WINDOW = 500;

/** Every write-function call in `text` (identified by its own `funcName(db,` shape) with no readiness-gate marker in the GATE_WINDOW characters immediately before it. Pure -- operates on whatever text it is given, real or mutated. */
function gatedOffenders(text, label) {
  const offenders = [];
  for (const fn of DAWAH_WRITE_FUNCTIONS) {
    const marker = `${fn}(db,`;
    let idx = -1;
    while ((idx = text.indexOf(marker, idx + 1)) !== -1) {
      const before = text.slice(Math.max(0, idx - GATE_WINDOW), idx);
      if (!GATE_MARKERS.some((g) => before.includes(g))) {
        offenders.push(`${label}: ${fn}() call with no readiness gate in the preceding ${GATE_WINDOW} characters`);
      }
    }
  }
  return offenders;
}

const dawahHtmlText = fs.readFileSync(path.join(appDir, "dawah.html"), "utf8");
const notesHtmlText = fs.readFileSync(path.join(appDir, "notes.html"), "utf8");

check("every write function dawah-data.js exports is called only behind the readiness gate, on both pages that reach it", () => {
  const offenders = [...gatedOffenders(dawahHtmlText, "app/dawah.html"), ...gatedOffenders(notesHtmlText, "app/notes.html")];
  assert.deepEqual(offenders, [], `ungated write call(s) found: ${offenders.join(" | ")}`);
});

check("this check is not vacuous -- both pages really do call real write functions", () => {
  const callsIn = (text) => DAWAH_WRITE_FUNCTIONS.filter((fn) => text.includes(`${fn}(db,`));
  const dawahCalls = callsIn(dawahHtmlText);
  const notesCalls = callsIn(notesHtmlText);
  assert.ok(dawahCalls.length >= 5, `expected app/dawah.html to call most of the six write functions, found: ${dawahCalls.join(", ")}`);
  assert.deepEqual(notesCalls, ["createDawahPage"], `expected app/notes.html to call exactly createDawahPage(), found: ${notesCalls.join(", ")}`);
});

// MUTATION-PROVEN #1 (issue #250's own instruction): strip the ONE gate
// clause guarding returnPage()'s own call -- the real function with the
// largest measured gap between its guard and its write -- from a real,
// in-memory copy of dawah.html's own text (never the file on disk), and
// confirm gatedOffenders() now names it. If this did not fail, the window or
// the marker search would be too loose to mean anything.
check("MUTATION-PROVEN: removing returnPage()'s own gate clause makes the check above fail", () => {
  const marker = 'async function returnPage(page) {\n      if (!dawahGateOpenOrExplain()) return;\n';
  const at = dawahHtmlText.indexOf(marker);
  assert.ok(at !== -1, "returnPage()'s own guard clause is not where expected -- the source shape changed");
  const mutated = dawahHtmlText.slice(0, at)
    + 'async function returnPage(page) {\n'
    + dawahHtmlText.slice(at + marker.length);
  assert.notEqual(mutated, dawahHtmlText, "the mutation did not change the source");
  const offenders = gatedOffenders(mutated, "app/dawah.html (mutated)");
  assert.ok(offenders.some((o) => o.includes("returnDawahPageToDraft")),
    `removing the gate clause did not surface as an offender -- the check is not proving what it claims to: ${JSON.stringify(offenders)}`);
});

// MUTATION-PROVEN #2: an accidental THIRD page importing dawah-data.js must
// be caught by the reachability walker, not silently accepted. A real,
// disposable scratch file is written under app/ (chainsToTarget() reads real
// files, so this cannot be proven purely in-memory), the walk is re-run
// against the real, now-three-page repository state, and the file is always
// removed afterwards even if an assertion throws.
check("MUTATION-PROVEN: an accidental third importer of dawah-data.js changes the reachable page set", () => {
  const scratchPath = path.join(appDir, "zz-dawah-mutation-scratch.html");
  assert.ok(!fs.existsSync(scratchPath), "a stray scratch file from a previous run was not cleaned up");
  fs.writeFileSync(scratchPath, '<script type="module">import { createDawahPage } from "./js/dawah-data.js";</script>\n');
  try {
    const reachable = chainsToTarget("dawah-data.js");
    const pages = reachable.map((r) => r.split(" -> ")[0]).sort();
    assert.ok(pages.includes("app/zz-dawah-mutation-scratch.html"), "the walker did not detect the new importer at all");
    assert.notDeepEqual(pages, WIRED_PAGES, "the reachable page set did not change when a third importer was added -- this check has no bite");
  } finally {
    fs.unlinkSync(scratchPath);
  }
});

// --- 5. no Rules/index/version material was touched this round -------------

function unchangedSinceMain(relPath) {
  const head = execFileSync("git", ["show", `origin/main:${relPath}`], { cwd: root, encoding: "utf8" });
  const now = fs.readFileSync(path.join(root, relPath), "utf8");
  assert.equal(now, head, `${relPath} is NOT byte-identical to origin/main`);
}

// UPDATED IN PLACE, 25 Sep 2026 (issue #272, load speed). This used to
// require app/js/version.js BYTE-IDENTICAL to main, which was really
// checking two different things at once: the version VALUE (this round's own
// concern) and the file's 580-odd lines of round-by-round history comments
// (never this round's concern, and a real cost -- 40KB of comments in a
// module every page imports before first paint). Issue #272 moved that
// history to docs/governance/version-history.md and trimmed the comment to
// two lines, EXPLICITLY leaving the APP_VERSION value untouched -- so the
// check now asserts the one fact its own name describes, read out of the
// real exported constant on each side rather than the file's raw bytes.
function versionValue(relPath, ref) {
  const src = ref
    ? execFileSync("git", ["show", `${ref}:${relPath}`], { cwd: root, encoding: "utf8" })
    : fs.readFileSync(path.join(root, relPath), "utf8");
  const m = src.match(/APP_VERSION\s*=\s*"([\d.]+)"/);
  assert.ok(m, `APP_VERSION not found in ${ref ? `${ref}:` : ""}${relPath}`);
  return m[1];
}

check("app/js/version.js is untouched -- no version bump from this round", () => {
  assert.equal(
    versionValue("app/js/version.js"),
    versionValue("app/js/version.js", "origin/main"),
    "app/js/version.js's own APP_VERSION value differs from origin/main"
  );
});

// UPDATED IN PLACE, 24 Sep 2026. This check used to assert firestore.rules
// named no dawahPages at all -- true until the Owner published the Dawah
// Rules in the Firebase Console the same day ("Dawah rules are live"). It now
// asserts the repository copy is BYTE-IDENTICAL to the audited, append-only
// deployment file the Owner was given, so nothing else can ride in with it.
// firebase.json still carries no Dawah material (no index was needed).
// Updated in place 25 Sep 2026 (Architect): the Owner has since published a
// LATER whole-file deployment built on top of the Dawah one (the WordPress/
// Evernote import rules), so "firestore.rules equals the Dawah file" stopped
// being true for a correct reason. The check keeps both halves of its intent:
// firestore.rules must be byte-identical to an Owner-PUBLISHED deployment file
// (nothing unaudited rides in), and the dawahPages block inside it must still
// be byte-identical to the one the Owner published for Dawah.
const PUBLISHED_DEPLOYMENTS = [
  "docs/governance/phase7-dawah-DEPLOYMENT-candidate-2026-09-24.rules",
  "docs/governance/2026-09-25-wordpress-import-DEPLOYMENT-candidate.rules",
  "docs/governance/2026-09-26-lemma-progress-DEPLOYMENT-candidate.rules",
];
function dawahBlock(text) {
  const start = text.indexOf("match /dawahPages/");
  assert.notEqual(start, -1, "no dawahPages block");
  const open = text.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error("unterminated dawahPages block");
}
check("firestore.rules is exactly an Owner-published deployment file, its dawahPages block is the published Dawah one, and firebase.json is unchanged", () => {
  const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
  const matches = PUBLISHED_DEPLOYMENTS.filter((p) => fs.readFileSync(path.join(root, p), "utf8") === rules);
  assert.equal(matches.length >= 1, true, "firestore.rules is not byte-identical to any Owner-published deployment file");
  const dawahPublished = fs.readFileSync(path.join(root, PUBLISHED_DEPLOYMENTS[0]), "utf8");
  assert.equal(dawahBlock(rules), dawahBlock(dawahPublished), "the live dawahPages block differs from the one the Owner published for Dawah");
  unchangedSinceMain("firebase.json");
});

check("the Rules candidate is a self-contained extract governing exactly dawahPages, and was not pasted into production", () => {
  const candidatePath = path.join(root, "docs/governance/phase7-dawah-pages-rules-candidate-2026-09-24.rules");
  assert.ok(fs.existsSync(candidatePath), "the Phase 7 Rules candidate file is missing");
  const candidate = fs.readFileSync(candidatePath, "utf8");
  const blocks = [...new Set([...candidate.matchAll(/match \/(\w+)\//g)].map((m) => m[1]))].filter((n) => n !== "databases");
  assert.deepEqual(blocks, ["dawahPages"], `the candidate must govern exactly dawahPages, saw: ${blocks}`);
  assert.ok(candidate.includes("STATUS: CANDIDATE. NOT DEPLOYED."), "the candidate does not state its own non-deployed status");
});

console.log(`\n==== Phase 7 Dawah pages boundary: ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
