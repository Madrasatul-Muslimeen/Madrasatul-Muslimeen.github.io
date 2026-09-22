// MAP Phase 4 (P4-C) -- the STRUCTURAL guards around the evidence writer.
//
// Everything this suite asserts is invisible to a functional test. The writer
// could pass every behaviour check in study-activity-evidence-store.mjs while
// being wired into a Study screen, or while quietly appending to the legacy
// entries[] array -- and the second of those is not a tidiness problem, it is
// the Activity-to-Mastery escalation P4-B was built to prevent:
//
//   records.js bulkConfirmWeek() builds its confirm set ENTIRELY from
//   activity.entries[]. A (unitKey, trackableId) pair appearing there causes
//   the matching PENDING Mastery claim to be confirmed. So if Study evidence
//   ever reached that array, merely reading an ayah would enlarge what one
//   supervisor click confirms -- in client code, where no Firestore Rule can
//   intervene.
//
// The protection is structural, so it is held here, by reading the source.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { APPROACH_TEMPLATES } from "../../app/js/catalogue-data.js";
// Statically imported for the same reason APPROACH_TEMPLATES is: check() is
// synchronous, and a dynamic import() would make the body async -- which this
// suite refuses by name. See the approach-binding check's own comment for the
// round where an async body counted a real failure as a pass.
import * as readiness from "../../app/js/study-evidence-readiness.js";

const root = path.resolve(process.argv[2] || process.cwd());
const appJs = path.join(root, "app", "js");
let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const result = fn();
    // A promise here means an async body whose assertions this synchronous
    // runner would never see -- the failure would land in an uncaught
    // rejection and the case would be counted green. Refuse it loudly.
    if (result && typeof result.then === "function") {
      throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    }
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

const GUARDED = ["study-activity-evidence-id.js", "study-activity-evidence-store.js"];

/** A module's CODE, with block comments and whole-line `//` comments removed -- these checks must read code, not the prose that describes it. Trailing `//` comments stay in scope deliberately: that errs towards a false alarm, never a missed wiring. */
function codeOf(name) {
  return fs.readFileSync(path.join(appJs, name), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((line) => !/^\s*(?:\/\/|\*)/.test(line)).join("\n");
}
/**
 * ONE exported function's body, bounded at the next top-level export.
 *
 * ADDED because a mutation proved it was needed. The two call sites below used
 * `slice(indexOf(fn))` -- to END OF FILE -- and `study-event-wiring.js` has two
 * helpers BELOW recordStudyEvidence() that re-export the readiness predicate.
 * So deleting the gate from inside the function left the symbol in the slice
 * anyway: the assertion written to catch a missing gate could not fail, and the
 * suite only refused the mutation because a DIFFERENT assertion fired, naming
 * the wrong fault. A guard that reports the wrong reason is one nobody can act
 * on. Bounded, these assertions read the function and nothing else.
 */
function functionBody(code, signature) {
  const start = code.indexOf(signature);
  assert.ok(start > -1, `${signature} is gone`);
  const after = code.indexOf("\nexport ", start + 1);
  return after === -1 ? code.slice(start) : code.slice(start, after);
}
/** One element's own markup, from its opening tag to its MATCHING close -- `<div>`s balanced, so a nested element cannot end the slice early and a later sibling cannot be swept into it. */
function elementSlice(html, openTag) {
  const start = html.indexOf(openTag);
  if (start === -1) return "";
  let depth = 0, i = start;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0] === "</div>" ? -1 : 1;
    i = m.index + m[0].length;
    if (depth === 0) break;
  }
  return html.slice(start, i);
}
function appSources() {
  const out = [];
  for (const entry of fs.readdirSync(appJs)) {
    if (entry.endsWith(".js")) out.push({ file: `app/js/${entry}`, text: fs.readFileSync(path.join(appJs, entry), "utf8") });
  }
  const i18n = path.join(appJs, "i18n");
  if (fs.existsSync(i18n)) for (const e of fs.readdirSync(i18n)) {
    if (e.endsWith(".js")) out.push({ file: `app/js/i18n/${e}`, text: fs.readFileSync(path.join(i18n, e), "utf8") });
  }
  for (const e of fs.readdirSync(path.join(root, "app"))) {
    if (e.endsWith(".html")) out.push({ file: `app/${e}`, text: fs.readFileSync(path.join(root, "app", e), "utf8") });
  }
  return out;
}

// --- reachability: what can a PAGE actually load? --------------------------
//
// UPDATED 2026-09-15 (P5-C), with the reason recorded rather than the check
// deleted. The two cases below used to assert that NOTHING under app/ imports
// the writer at all. P5-C adds `study-note-service.js`, which imports it and is
// itself imported by nothing -- so the original mechanism failed while the
// claim it stands for ("no Study surface records evidence") stayed true.
//
// A blunter answer would have been an exception for that one file, which is
// exactly the "worked around" this project forbids: the next module importing
// the writer would need another exception, and the tenth would be a live
// wiring nobody noticed. So the mechanism is now STRICTER, not looser -- it
// follows the import graph from every page in app/ and asserts the writer is
// not reachable from any of them by any chain of any length. A wiring is
// caught wherever in that chain it happens.

/** Local `./x.js` imports of one module. */
function localImportsOf(file) {
  const text = fs.readFileSync(file, "utf8");
  return [
    ...[...text.matchAll(/from\s*["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]),
    ...[...text.matchAll(/import\s*["'`]\.\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]),
  ];
}

/** The modules one page loads directly, via a script src or an inline module import. */
function entryModulesOf(htmlPath) {
  return [...fs.readFileSync(htmlPath, "utf8").matchAll(/["'`](?:\.\/)?js\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => m[1]);
}

/** Every `app/*.html` page that can reach `target`, with the chain by which it does. */
function chainsToTarget(target) {
  const found = [];
  for (const entry of fs.readdirSync(path.join(root, "app"))) {
    if (!entry.endsWith(".html")) continue;
    const seen = new Set();
    const queue = entryModulesOf(path.join(root, "app", entry)).map((m) => [m]);
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

/** The modules that import one of the guarded files directly. */
function directImportersOf() {
  const importers = [];
  for (const { file, text } of appSources()) {
    if (GUARDED.includes(path.basename(file))) continue;
    for (const guarded of GUARDED) {
      const base = guarded.replace(/\.js$/, "");
      if (new RegExp(String.raw`(?:from|import)\s*["'\`][./]*(?:js/)?${base}\.js["'\`]`).test(text)) importers.push(path.basename(file));
    }
  }
  return [...new Set(importers)].sort();
}

// --- 1. the writer is UNINVOKED -------------------------------------------
check("POSITIVE CONTROL: the reachability walker really does find a wired module", () => {
  // Without this, a broken regex in entryModulesOf() would make every chain
  // come back empty and the three cases below would pass vacuously -- a check
  // that cannot fail, which this project has shipped before. So the walker is
  // first asked for a module that IS unmistakably wired into a real page.
  const control = chainsToTarget("records.js");
  assert.ok(control.length > 0, "the walker found no page importing records.js -- it is not working");
  assert.ok(control.some((c) => c.includes("quranrevival.html")), `unexpected control result: ${control[0]}`);
});
// v08.30 INVERTS THESE THREE, and the reason is worth keeping: two true
// invariants met here and neither survives alone.
//
//   Before v08.30 this suite said NO PAGE may reach the writer, because through
//   P5/P6 nothing was wired and that was the whole safety case.
//   From v08.30 the Study surfaces are wired ON PURPOSE, so "unreachable" is
//   simply false -- and asserting it would be asserting that the wiring does
//   not work.
//
// What is kept is main's REACHABILITY WALKER, which is the stronger mechanism:
// it catches a wiring wherever in the chain it happens. What changes is the
// invariant it serves -- every page-reachable path to the writer must pass
// THROUGH the one audited entry point. A second module quietly learning to
// write evidence is what that catches, and it is a real risk now that one
// legitimate path exists.
//
// RE-DERIVED on current main, not ported: main gained P4-E's reader guards
// (below) after the historical branch was cut, and a conflict-free merge would
// have placed two invariants side by side without reconciling them.
const WIRING = "study-event-wiring.js";

check("every page-reachable path to the writer passes THROUGH the wiring module", () => {
  const chains = GUARDED.flatMap((guarded) => chainsToTarget(guarded));
  // The positive control a negative assertion needs: zero chains would satisfy
  // a naive "no unaudited path" test while meaning the wiring is broken.
  assert.ok(chains.length > 0,
    "no page reaches the writer at all -- the v08.30 Study wiring is live, so that means it is broken");
  const unaudited = chains.filter((chain) => !chain.includes(`-> ${WIRING} ->`));
  assert.deepEqual(unaudited, [],
    `a page reaches the writer WITHOUT going through ${WIRING}: ${unaudited.join(" | ")}`);
});
check("the importer set is EXACTLY the wiring module -- nothing else imports the store", () => {
  // NARROWED, and the narrowing is the whole of this tranche. Until now this
  // read `[WIRING, "study-note-service.js"]`: P5-C's service imported the
  // store directly and was tolerated because it is page-unreachable. That made
  // "recordStudyEvidence() is the ONE chokepoint" a claim about REACHABILITY,
  // which expires silently the day somebody wires D3 Journaling. The service
  // goes through recordStudyEvidence() now, so the list is a list of one and
  // the claim rests on the code.
  //
  // A tolerated exception is how a list of one becomes a list of ten. There is
  // no exception left to add to.
  const importers = directImportersOf();
  assert.deepEqual(importers, [WIRING],
    `the set of modules importing the evidence store has changed -- route it through ${WIRING} instead of widening this list: ${importers.join(", ")}`);
});
check("no PAGE-REACHABLE source but the wiring module names a Study event writer", () => {
  const offenders = [];
  for (const { file, text } of appSources()) {
    const base = path.basename(file);
    if (GUARDED.includes(base)) continue;
    if (base === WIRING) continue;                                          // the audited entry point
    if (!/writeStudyActivityEvidence|studyEvidenceId|buildStudyEvidenceDocument/.test(text)) continue;
    if (file.endsWith(".js") && chainsToTarget(base).length === 0) continue; // queued, not wired
    offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});
check("the wiring module is the ONLY thing the page imports for evidence, and it cannot reach Mastery", () => {
  // The whole point of routing through one module: that module must itself be
  // unable to do the thing the boundary forbids.
  const text = fs.readFileSync(path.join(appJs, WIRING), "utf8");
  const code = text.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  for (const forbidden of ["records.js", "claimStatus", "confirmEntry", "arrayUnion", "achieved", "mastered", "entries["]) {
    assert.ok(!code.includes(forbidden), `${WIRING} can reach ${forbidden} -- Activity is one step from Mastery`);
  }
});


// --- 2. evidence can never reach legacy entries[] -------------------------
check("activity.js is untouched: still the arrayUnion append path", () => {
  const text = codeOf("activity.js");
  assert.ok(text.includes("arrayUnion"), "activity.js no longer appends with arrayUnion");
  assert.ok(!text.includes("v1Events"), "activity.js carries the rejected keyed-map writer");
  assert.ok(!text.includes("study-activity-evidence"), "activity.js has been wired to the evidence writer");
  assert.ok(!text.includes("evidence"), "activity.js mentions evidence");
});
check("the writer never writes an entries[] array, nor arrayUnion", () => {
  // `entries` is matched with a negative lookbehind for `Object.`: the first
  // version of this check flagged `Object.entries(UNIT_KEY_SHAPES)`, a plain
  // JavaScript builtin, and the module was correct all along. The hazard is
  // the FIRESTORE array of that name, so that is what is matched.
  for (const name of GUARDED) {
    const text = codeOf(name);
    for (const forbidden of ["arrayUnion", "logActivity"]) {
      assert.ok(!text.includes(forbidden), `${name} references ${forbidden}`);
    }
    const firestoreEntries = text.match(/(?<!Object\.)\bentries\b/g) ?? [];
    assert.deepEqual(firestoreEntries, [], `${name} touches the legacy entries[] array`);
  }
});
check("the writer only ever addresses the evidence SUBcollection", () => {
  const text = codeOf("study-activity-evidence-store.js");
  assert.ok(/\/evidence`/.test(text) || text.includes("/evidence"), "no evidence subcollection path found");
  // TENANT.ACTIVITY may appear only as the prefix of that subcollection path.
  for (const line of text.split("\n").filter((l) => l.includes("TENANT.ACTIVITY"))) {
    assert.ok(line.includes("/evidence"), `TENANT.ACTIVITY used at document level: ${line.trim()}`);
  }
});
// P4-E added a READER to that module, so the guards above must hold for it as
// well as for the writer. The dangerous shape is not the read itself -- the
// candidate Rules have authorised it since P4-C -- it is a read whose RESULT
// could travel into the Mastery workflow.
check("P4-E's reader queries the SUBcollection only, and only with a bound", () => {
  const text = codeOf("study-activity-evidence-store.js");
  const fn = text.slice(text.indexOf("export async function listStudyActivityEvidence"));
  assert.ok(fn.length > 100, "listStudyActivityEvidence() not found -- re-check this guard");
  assert.ok(/collection\(db, collectionPath\)/.test(fn),
    "the reader must query the path evidenceCollectionPath() builds, never activity/ itself");
  assert.ok(/\blimit\(/.test(fn), "an unbounded read of a person's week is a cost defect and an I9 risk");
  // An orderBy here would need a composite index that NO candidate declares,
  // so the query would die in production with failed-precondition -- and no
  // emulator run would warn, which P5-E proved.
  assert.ok(!/\borderBy\(/.test(fn), "the reader gained an orderBy; it now needs a composite index");
  assert.ok(!/\bwhere\(/.test(fn), "the reader gained a where(); the PATH is already the whole scope");
});
check("P4-E's reader cannot be reached from records.js or the Mastery workflow", () => {
  const records = fs.readFileSync(path.join(appJs, "records.js"), "utf8");
  for (const name of ["listStudyActivityEvidence", "study-activity-evidence-store", "MAX_EVIDENCE_PER_READ"]) {
    assert.ok(!records.includes(name),
      `records.js now names ${name} -- evidence is one step from the set bulkConfirmWeek() confirms`);
  }
});
check("bulkConfirmWeek() still reads only entries[], so it cannot see evidence", () => {
  const records = fs.readFileSync(path.join(appJs, "records.js"), "utf8");
  const fn = records.slice(records.indexOf("export async function bulkConfirmWeek"));
  const body = fn.slice(0, fn.indexOf("\n}\n") + 3);
  assert.ok(body.includes("activitySnap.data().entries"), "bulkConfirmWeek no longer reads entries[] -- re-check this guard");
  assert.ok(!body.includes("evidence"), "bulkConfirmWeek now reads evidence -- the Mastery coupling is live");
  assert.ok(!body.includes("collection("), "bulkConfirmWeek now runs a query -- it may be reaching the subcollection");
});

// --- 3. Activity is not Mastery -------------------------------------------
check("the writer has no dependency on Records or the Mastery workflow", () => {
  for (const name of GUARDED) {
    const text = codeOf(name);
    for (const forbidden of ["./records.js", "records", "claimStatus", "confirmEntry", "returnEntry",
                             "achieved", "mastered", "confirmState", "claimedStatus", "confirmedStatus"]) {
      assert.ok(!text.includes(forbidden), `${name} references ${forbidden}`);
    }
  }
});
check("the writer can only ever express a practised, no-mastery action", () => {
  const text = codeOf("study-activity-evidence-id.js");
  assert.ok(/action:\s*"practised"/.test(text), "action is not pinned to practised");
  assert.ok(/masteryEffect:\s*"none"/.test(text), "masteryEffect is not pinned to none");
  assert.ok(!/action:\s*"claimed"/.test(text), "the writer can express a claimed action");
});
check("status.claimed and status.confirmed are not in the event table", () => {
  const text = codeOf("study-activity-evidence-id.js");
  assert.ok(!text.includes("status.claimed"), "status.claimed is expressible");
  assert.ok(!text.includes("status.confirmed"), "status.confirmed is expressible");
});

// --- 4. the accepted Approach mapping is bound to its source of truth ------
check("every Approach the writer can credit still IS that Approach", () => {
  // A hardcoded id silently comes to mean a different Approach after a
  // catalogue renumber, and nothing on any screen would show it.
  //
  // This check was ASYNC in its first version, and check() is synchronous --
  // so the assertion threw inside an uncaught promise, the case was counted as
  // a pass, and a deliberate renumber of approach_07 sailed straight through
  // it. A passing check carrying precisely the blind spot it was written to
  // close. APPROACH_TEMPLATES is imported statically now and the body is
  // synchronous, so there is no promise for a failure to hide in.
  const expected = {
    approach_01: "Reading (with Tajweed)", approach_03: "Reading (with Meaning)",
    approach_04: "Reading — Word-by-Word Meaning", approach_07: "Listening Attentively (Arabic only)",
    approach_08: "Listening Attentively (Arabic with meaning)", approach_10: "Journaling",
  };
  const byId = new Map(APPROACH_TEMPLATES.map((t) => [t.id, t]));
  const text = codeOf("study-activity-evidence-id.js");
  const referenced = [...new Set([...text.matchAll(/approach_\d\d/g)].map((m) => m[0]))].sort();
  assert.deepEqual(referenced, Object.keys(expected).sort(), "the writer references an unexpected Approach set");
  for (const [id, name] of Object.entries(expected)) {
    assert.ok(byId.has(id), `${id} is not in APPROACH_TEMPLATES`);
    assert.equal(byId.get(id).name.en, name, `${id} has been renumbered or renamed`);
  }
  assert.equal(APPROACH_TEMPLATES.length, 30);
});

// --- 5. Rules/index deployment state matches what is ACTUALLY true ---------
// Until 22 Sep 2026 this checked the opposite: that firestore.rules carried
// NO evidence material at all, because until the Owner published in the
// Firebase Console, saying otherwise would have been the repository claiming
// a deployment nobody had performed. That deployment happened (Rules and
// indexes both, confirmed by the Owner directly) -- `rules-deployment-
// candidate-phase3-6.mjs` is where the byte-exact proof of a faithful sync
// lives, so this check does not repeat it. What it still needs to prove,
// unaffected by whether Rules are deployed, is the fact right below it (the
// readiness declaration): the evidence WRITE PATH's own gate did not move
// just because the database now has a rule for it to write against.
check("production firestore.rules carries the deployed evidence material, and only that -- no keyed-Activity leak", () => {
  const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
  assert.ok(rules.includes("/evidence/"), "firestore.rules does not carry the evidence subcollection -- deployment record is stale, or the sync regressed");
  assert.ok(rules.includes("study-approach-contract:v1"), "firestore.rules does not pin the accepted contract version");
  assert.ok(fs.existsSync(path.join(root, "firestore.indexes.json")), "the live index file is missing -- deployment record is stale, or the sync regressed");
  // The one thing that must still be ABSENT: the rejected keyed-Activity
  // design (a hashed eventKey Rules cannot verify) never made it in alongside
  // the accepted one, deployment or no deployment.
  assert.ok(!rules.includes("v1Events"), "firestore.rules references the rejected keyed-Activity v1Events map");
});
check("the gated keyed-Activity material is still absent", () => {
  for (const rel of ["app/js/study-activity-week.js", "tests/firestore/activity-v1.proposed.rules"]) {
    assert.ok(!fs.existsSync(path.join(root, rel)), `${rel} leaked in`);
  }
});
check("the candidate Rules are a candidate, not the deployed file", () => {
  const candidate = path.join(root, "docs/governance/phase4-activity-evidence-rules-candidate-2026-09-14.rules");
  assert.ok(fs.existsSync(candidate), "the candidate Rules are missing");
  const text = fs.readFileSync(candidate, "utf8");
  assert.ok(text.includes("NOT DEPLOYED"), "the candidate does not declare itself undeployed");
  const blocks = [...new Set([...text.matchAll(/match \/(\w+)\//g)].map((m) => m[1]))].filter((n) => n !== "databases");
  assert.deepEqual(blocks, ["activity"], `the candidate must govern one collection, saw: ${blocks}`);
});

// --- 6. v08.31 -- THE PERSISTENCE-READINESS GATE --------------------------
//
// Structural, because every one of these facts is invisible to a functional
// test. The gate could return exactly the right answer today while importing
// the rules text, while being bypassable at a call site, or while the ✓ kept
// offering an action it cannot perform.
const READINESS = "study-evidence-readiness.js";

check("the readiness declaration DEFAULTS TO FALSE, as a literal", () => {
  const src = fs.readFileSync(path.join(appJs, READINESS), "utf8");
  const m = src.match(/EVIDENCE_PERSISTENCE_DECLARATION\s*=\s*Object\.freeze\(\{[\s\S]*?ready:\s*(true|false)/);
  assert.ok(m, "ready is not a plain literal -- a computed default is not a default");
  assert.equal(m[1], "false", "the standing declaration is not false; E1 is CLOSED");
});

check("readiness CANNOT be inferred from firestore.rules -- the module imports nothing at all", () => {
  // Requirement 2, enforced by INABILITY rather than restraint, the same shape
  // ADR-010 uses for Origin/Destination. A module with no imports cannot read
  // the rules text, cannot fetch, and cannot reach a module that does -- so
  // "it does not infer readiness from the repository's rules file" is provable
  // by reading its import list rather than trusted.
  const raw = fs.readFileSync(path.join(appJs, READINESS), "utf8");
  const code = codeOf(READINESS);
  const imports = [...code.matchAll(/^\s*import\s/gm)].length + [...code.matchAll(/\bimport\s*\(/g)].length;
  assert.equal(imports, 0, "the readiness module has acquired an import; it must be unable to see anything");
  for (const forbidden of ["firestore.rules", "fetch(", "XMLHttpRequest", "require(", "readFileSync"]) {
    assert.ok(!code.includes(forbidden), `the readiness module reaches ${forbidden}`);
  }
  // The PROSE may name firestore.rules -- it has to, in order to say it does
  // not read it -- so this pair is what tells the two apart. Without it the
  // check above would pass just as happily on a module that never mentioned
  // the subject at all, and would prove nothing about intent.
  assert.ok(raw.includes("firestore.rules"), "the module no longer explains why it does not read the rules file");
});

check("a bare flip of `ready` does NOT enable persistence", () => {
  // Enablement is a governed decision (requirement 5). Asserted against the
  // real predicate rather than the source, because this is the one fact here
  // a regex genuinely cannot see.
  const m = readiness;
  assert.equal(m.isStudyEvidencePersistenceReady(), false, "the standing declaration reads ready");
  assert.equal(m.isStudyEvidencePersistenceReady({ ready: true }), false, "a bare flip enabled it");
  assert.equal(m.isStudyEvidencePersistenceReady({ ready: true, decision: {} }), false, "an empty decision enabled it");
  assert.equal(m.isStudyEvidencePersistenceReady({ ready: true, decision: { by: "quran", on: "2026-09-19", reference: "x" } }), false,
    "a module authorised its own enablement");
  assert.equal(m.isStudyEvidencePersistenceReady({ ready: true, decision: { by: "master-architect", on: "soon", reference: "x" } }), false,
    "a decision with no real date enabled it");
  // POSITIVE CONTROL: a predicate that simply returned false would satisfy
  // every assertion above and prove nothing.
  assert.equal(m.isStudyEvidencePersistenceReady({ ready: true, decision: { by: "master-architect", on: "2026-09-19", reference: "docs/x.md" } }), true,
    "a fully governed decision is refused -- this is a blanket refusal, not a gate");
});

check("the WRITE CHOKEPOINT refuses before the store is reached", () => {
  // "No evidence write may be attempted" is a claim about every D1/D2/D4 call
  // site at once. It is provable in one place only because recordStudyEvidence()
  // is the single funnel -- so this asserts both halves: that the funnel is
  // gated, and that nothing page-reachable calls the store around it.
  const w = codeOf("study-event-wiring.js");
  const body = functionBody(w, "export async function recordStudyEvidence");
  // The positive control the bound itself needs: a slice that silently ran past
  // its own function would put all three assertions back where they started.
  assert.ok(!/export function studyEvidencePersistenceReady/.test(body),
    "the chokepoint slice runs past its own function -- it is reading the helpers below it");
  const gate = body.indexOf("isStudyEvidencePersistenceReady");
  const store = body.indexOf("writeStudyActivityEvidence(db");
  assert.ok(gate > -1, "recordStudyEvidence() no longer consults readiness");
  assert.ok(store > -1, "recordStudyEvidence() no longer calls the store");
  assert.ok(gate < store, "the readiness gate is not ahead of the store call");
  assert.ok(/blocked:\s*true/.test(body), "a refusal is not distinguishable from the store's own written:false");
  // THIS CHECK'S OWN FIRST RUN FOUND A SECOND CALLER -- P5-C's
  // `study-note-service.js`, which called the store directly for D3
  // Journaling. It was recorded rather than excluded by name, and pinned as
  // unreachable so that wiring it would fail loudly. This tranche closed it at
  // the source instead: the service calls recordStudyEvidence(), so the
  // exception is GONE rather than tolerated, and the assertion below is the
  // strictly stronger one it was always standing in for.
  //
  // COMMENTS ARE STRIPPED FIRST, and that is not fussiness: the service's own
  // doc comment now names `writeStudyActivityEvidence()` in order to explain
  // that it no longer calls it. Scanning raw text would fail against correct
  // code -- this repository's own recorded trap.
  const callers = [];
  for (const { file, text } of appSources()) {
    if (file.endsWith("study-activity-evidence-store.js")) continue;
    const code = text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n").filter((line) => !/^\s*(?:\/\/|\*)/.test(line)).join("\n");
    if (/writeStudyActivityEvidence\s*\(/.test(code)) callers.push(file);
  }
  assert.deepEqual(callers, [`app/js/${WIRING}`],
    `the evidence store is called from outside ${WIRING}: ${callers.join(", ")} -- route it through recordStudyEvidence()`);
});

check("D3 Journaling goes through the gate, and its outcomes stay distinguishable", () => {
  // The service is still unreachable, so this is a claim about the SOURCE, and
  // the source is where it has to hold: whoever builds P5-D inherits a gated
  // path rather than a bypass they must remember to close.
  const svc = codeOf("study-note-service.js");
  assert.ok(/import \{ recordStudyEvidence \} from "\.\/study-event-wiring\.js";/.test(svc),
    "study-note-service.js no longer imports the chokepoint");
  assert.ok(!/writeStudyActivityEvidence/.test(svc),
    "study-note-service.js still names the evidence store in code");
  const body = functionBody(svc, "export async function recordJournalEvidence");
  assert.ok(/recordStudyEvidence\(db, evidence, \{ uid \}\)/.test(body),
    "recordJournalEvidence() does not call recordStudyEvidence()");
  // The null return is CHECKED, not spread. `{ ...null }` is a silent no-op in
  // JavaScript, so spreading would yield a shape with no `written` field -- and
  // a missing field reads as falsy, which is exactly "already recorded".
  assert.ok(/if \(!outcome \|\| typeof outcome !== "object"\)/.test(body),
    "the null outcome is not checked before it is read");
  assert.ok(body.indexOf("if (!outcome") < body.indexOf("outcome.written"),
    "the outcome is read before it is checked");
  // Four outcomes, each its own field. `written: false` must never be the only
  // thing standing between "the gate refused" and "this was already recorded".
  for (const field of ["written:", "blocked:", "skipped:", "reason:"]) {
    assert.ok(body.includes(field), `recordJournalEvidence() no longer reports ${field.replace(":", "")}`);
  }
  assert.ok(/blocked: outcome\.blocked === true/.test(body),
    "a refusal is not carried through as its own fact");
});

check("the writer still FAILS CLOSED underneath the gate -- defence in depth", () => {
  // Requirement 4. The gate is a UI-honesty fix, not a replacement for the
  // store's own refusal: if the gate were ever wrong, the write must still
  // fail and still reach the user (I15). Weakening this to make the UI look
  // successful was explicitly forbidden in v08.30 and stays forbidden.
  const store = codeOf("study-activity-evidence-store.js");
  assert.ok(/\bthrow\b/.test(store), "the evidence store no longer rethrows");
  assert.ok(!store.includes("isStudyEvidencePersistenceReady"),
    "the store now consults the gate -- the two layers must be independent, or there is only one layer");
});

check("the ✓ is not actionable while the gate is shut, and keeps its tap target", () => {
  const page = fs.readFileSync(path.join(root, "app", "quranrevival.html"), "utf8");
  assert.ok(page.includes('btn.setAttribute("aria-disabled", ready ? "false" : "true")'),
    "the completion control no longer reports itself disabled while gated");
  assert.ok(/#readBar button\[aria-disabled="true"\] \{ opacity: 0\.45; \}/.test(page),
    "a gated control is not visually distinguishable from a live one");
  // Requirement 8. The gate must change no geometry: #readBar .qr-ico's own
  // padding rule is what sets the box, and no gated variant may shrink it.
  assert.ok(/#readBar \.qr-ico \{ font-size: 0\.95rem; line-height: 1; padding: 0\.3rem 0\.5rem; flex: 0 0 auto; \}/.test(page),
    "the icon control's own sizing rule changed -- the tap target must not be reduced");
  assert.ok(!/\[aria-disabled="true"\][^{]*\{[^}]*(font-size|padding|width|height)/.test(page),
    "the gated state changes the control's size");
  // The notice must live OUTSIDE #readBar -- inside it, it would take width on
  // the app's densest row and worsen the accepted O4-READBAR-WRAP debt.
  //
  // THIS PAIR WAS VACUOUS IN ITS FIRST FORM, and the mutation suite is what
  // said so. It sliced from `<div id="readBar"` to `id="readPickers"` -- and
  // #readPickers comes EARLIER in the document, so the slice was the empty
  // string and `!"".includes(...)` was true whatever the markup did. The
  // mutation that moves the notice into the bar came back UNPROVEN, which is a
  // finding about the guard, not about the code. Balance the element's own
  // <div>s instead, and assert the slice is real before reading it.
  const bar = elementSlice(page, '<div id="readBar">');
  assert.ok(bar.length > 200 && bar.includes("readCompleteBtn"),
    "the #readBar slice did not come back -- this check would pass vacuously");
  assert.ok(!bar.includes("qrStudyNotice"), "the notice is inside #readBar and will cost the row width");
  assert.ok(/#qrStudyNotice \{[\s\S]{0,200}?position: fixed/.test(page), "the notice is in flow");
});

check("both unavailability sentences are translated (I11)", () => {
  const page = fs.readFileSync(path.join(root, "app", "quranrevival.html"), "utf8");
  const bn = fs.readFileSync(path.join(appJs, "i18n", "bn.js"), "utf8");
  const keys = [...page.matchAll(/t\("(Recording study activity[^"]*)"\)/g)].map((m) => m[1]);
  assert.equal(keys.length, 2, `expected the short and long unavailability sentences, saw ${keys.length}`);
  for (const k of keys) {
    const at = bn.indexOf(`"${k}":`);
    assert.ok(at > -1, `bn.js has no key for: ${k}`);
    const value = bn.slice(at + k.length + 3).match(/"([^"]*)"/)[1];
    assert.ok(/[\u0980-\u09FF]/.test(value), `the Bangla for "${k}" is not Bangla`);
    assert.ok(!/&\w+;/.test(value), `the Bangla for "${k}" carries an HTML entity`);
  }
});

check("D2 Listening and D4 WbW are gated too", () => {
  const page = fs.readFileSync(path.join(root, "app", "quranrevival.html"), "utf8");
  // Both are silent by design -- neither invites a press -- so what is asserted
  // is that each asks before doing anything, not that each says something.
  const settle = page.slice(page.indexOf("async function settleListeningSession"));
  const settleHead = settle.slice(0, settle.indexOf("listeningCompletionArgs"));
  assert.ok(settleHead.includes("if (!studyEvidencePersistenceReady()) return;"),
    "D2 builds its evidence arguments before asking whether anything can be written");
  const at = page.indexOf("const wbwRef = parseQuranWordOccurrenceId");
  assert.ok(at > -1, "D4's evidence write is gone");
  const before = page.slice(0, at);
  assert.ok(before.lastIndexOf("if (studyEvidencePersistenceReady()) {") > before.lastIndexOf("setWordState"),
    "D4's evidence write is not inside the readiness gate");
});

console.log(`\n==== Study Activity evidence boundary: ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
