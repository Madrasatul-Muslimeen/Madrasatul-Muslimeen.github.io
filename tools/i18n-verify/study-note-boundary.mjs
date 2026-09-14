// MAP Phase 5 (P5-C) -- the STRUCTURAL guards around the Study<->Note binding
// and its service. Everything here is invisible to a functional test.
//
// Three claims are made by P5-C that no behaviour suite can see:
//
//   1. "This changes nothing" -- which is about WIRING. Both modules could
//      pass every functional check while being imported into a live screen.
//   2. "Existing user notes are preserved" -- which is about the FILES the
//      round did not touch, not about the ones it added.
//   3. "The vocabulary has one accepted spelling" -- which is only true while
//      the code and ADR-009 still agree with each other.
//
// So this suite reads the source, the untouched files, and the ADR itself.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { APPROACH_TEMPLATES } from "../../app/js/catalogue-data.js";
import { PROVENANCE_KINDS, RELATIONSHIP_KINDS } from "../../app/js/study-note-binding.js";

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

const GUARDED = ["study-note-binding.js", "study-note-service.js"];

/** A module's CODE, with block comments and whole-line comments removed. Trailing `//` comments stay in scope deliberately: that errs towards a false alarm, never a missed wiring. */
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

// --- 1. UNINVOKED ----------------------------------------------------------
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
  // Without this, a broken regex would make every chain come back empty and the
  // case below would pass vacuously -- a check that cannot fail.
  const control = chainsToTarget("records.js");
  assert.ok(control.length > 0, "the walker found no page importing records.js -- it is not working");
});

check("NO PAGE can reach either module, by any chain of any length", () => {
  const reachable = GUARDED.flatMap((g) => chainsToTarget(g));
  assert.deepEqual(reachable, [], `P5-C is wired in: ${reachable.join(" | ")}`);
});

check("no app source imports the binding or the service", () => {
  const importers = [];
  for (const file of everyAppSource()) {
    if (GUARDED.some((g) => file.endsWith(path.join("js", g)))) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const guarded of GUARDED) {
      const base = guarded.replace(/\.js$/, "");
      // The delimiter class alone matched a BACKTICK, so a prose `study-note-binding.js`
      // in a doc comment counted as an import and reported a wiring that did not
      // exist. Requiring a from/import keyword in front makes it an import scan.
      if (new RegExp(String.raw`(?:from|import)\s*["'\`][./]*(?:js/)?${base}\.js["'\`]`).test(text)) {
        importers.push(`${path.relative(root, file)} -> ${guarded}`);
      }
    }
  }
  assert.deepEqual(importers, [], `P5-C is wired in: ${importers.join(", ")}`);
});

check("the service imports the binding, and the binding imports no database", () => {
  assert.ok(codeOf("study-note-service.js").includes('"./study-note-binding.js"'),
    "the service must go through the binding, not build a source payload itself");
  const binding = codeOf("study-note-binding.js");
  for (const forbidden of ["firebasejs", "envelope.js", "collections.js", "getDoc", "setDoc", "updateDoc"]) {
    assert.ok(!binding.includes(forbidden), `the binding must stay pure: ${forbidden}`);
  }
});

// --- 2. ACTIVITY IS NOT MASTERY (ADR-003) ----------------------------------
check("neither module can reach Mastery", () => {
  for (const name of GUARDED) {
    const text = codeOf(name);
    for (const forbidden of ["records.js", "claimStatus", "confirmEntry", "bulkConfirmWeek", "achieved", "mastered"]) {
      assert.ok(!text.includes(forbidden), `${name} names ${forbidden}`);
    }
  }
});

check("neither module can reach the legacy activity.entries[] array", () => {
  // bulkConfirmWeek() builds its confirm set entirely from entries[]. Evidence
  // appearing there would let saving a Note enlarge what one supervisor click
  // confirms -- in client code, where no Firestore Rule can intervene.
  for (const name of GUARDED) {
    const text = codeOf(name);
    assert.ok(!text.includes("arrayUnion"), `${name} names arrayUnion`);
    assert.ok(!/(?<!Object\.)\bentries\b/.test(text), `${name} names entries`);
    assert.ok(!text.includes("logActivity"), `${name} names logActivity`);
  }
});

// --- 3. THE QUICK NOTE IS UNTOUCHED (ADR-009 §5) ---------------------------
check("the service holds no reference to the quick-note surface", () => {
  const text = codeOf("study-note-service.js");
  for (const forbidden of ["ayah-notes", "ayahNotes", "AYAH_NOTES", "saveAyahNote", "ayahNoteHtml", "ensureAyahNotesWritable"]) {
    assert.ok(!text.includes(forbidden), `the promotion path names ${forbidden}`);
  }
});

function unchangedSinceMain(relPath) {
  const head = execFileSync("git", ["show", `origin/main:${relPath}`], { cwd: root, encoding: "utf8" });
  const now = fs.readFileSync(path.join(root, relPath), "utf8");
  assert.equal(now, head, `${relPath} is NOT byte-identical to origin/main`);
}

check("app/js/ayah-notes.js is byte-identical to origin/main -- existing notes preserved", () => {
  unchangedSinceMain("app/js/ayah-notes.js");
});
check("app/js/note-foundation.js changed by INSERTION ONLY -- nothing removed or reshaped", () => {
  // UPDATED 2026-09-15 (P5-E), with the reason recorded rather than the check
  // deleted. P5-E adds the read side of ADR-009 to this file, so byte-identity
  // is no longer the right claim -- but "not reshaped" still is, and it is the
  // one that matters: every existing export must behave exactly as it did.
  // An addition-only diff proves that mechanically, and is a STRICTER thing to
  // assert than "some lines changed and I read them and they looked fine".
  const diff = execFileSync("git", ["diff", "--numstat", "origin/main", "--", "app/js/note-foundation.js"],
    { cwd: root, encoding: "utf8" }).trim();
  if (diff === "") return; // identical to origin/main
  const [added, removed] = diff.split(/\s+/);
  assert.equal(removed, "0", `note-foundation.js has ${removed} REMOVED lines -- an existing behaviour may have been reshaped`);
  assert.ok(Number(added) > 0, "a non-empty diff with no additions makes no sense");
});
check("app/js/activity.js and records.js are byte-identical to origin/main", () => {
  unchangedSinceMain("app/js/activity.js");
  unchangedSinceMain("app/js/records.js");
});
check("firestore.rules is byte-identical to origin/main -- nothing deployed, nothing proposed in place", () => {
  unchangedSinceMain("firestore.rules");
});
check("no migration or backfill material was added", () => {
  for (const name of GUARDED) {
    const text = codeOf(name);
    for (const forbidden of ["migrat", "backfill", "deleteDoc", "writeBatch"]) {
      assert.ok(!text.toLowerCase().includes(forbidden), `${name} names ${forbidden}`);
    }
  }
});

// --- 4. THE VOCABULARY IS BOUND TO ADR-009 ---------------------------------
check("every vocabulary word in the code appears in ADR-009, and vice versa", () => {
  // A closed vocabulary that drifts from the decision recording it is just a
  // second spelling with extra steps -- which is the exact failure ADR-009
  // exists to stop. So the words are read out of the ADR, not retyped here.
  const adr = fs.readFileSync(path.join(root, "docs/governance/adr/ADR-009-study-note-source-binding-v1.md"), "utf8");
  for (const word of [...RELATIONSHIP_KINDS, ...PROVENANCE_KINDS]) {
    assert.ok(adr.includes("`" + word + "`"), `ADR-009 does not record the vocabulary word ${word}`);
  }
  for (const kind of ["quran-unit", "hadith-unit", "topic-unit", "name-unit"]) {
    assert.ok(adr.includes("`" + kind + "`"), `ADR-009 does not record the sourceKind ${kind}`);
    assert.ok(codeOf("study-note-binding.js").includes(`"${kind}"`), `the binding does not derive ${kind}`);
  }
  assert.equal(RELATIONSHIP_KINDS.length, 2);
  assert.equal(PROVENANCE_KINDS.length, 2);
});

// --- 5. ADR-009 IS BOUND TO THE ACCEPTED NOTE FOUNDATION CONTRACT ----------
check("ADR-009 implements the ACCEPTED contract's legacy-compatibility terms, not a new decision", () => {
  // ADR-009 §5 (promote, never migrate) is not an invention of this round: the
  // accepted Note Foundation contract already fixed all four of these. If any
  // of them ever changes, §5 stops being an implementation of an accepted term
  // and becomes a decision needing its own authority -- so it is read from the
  // contract rather than restated here.
  const contract = JSON.parse(fs.readFileSync(path.join(root, "tools/i18n-verify/note-foundation-contract.json"), "utf8"));
  assert.deepEqual(contract.legacyCompatibility, {
    ayahNotesUnchanged: true, dualWrite: false, automaticMigration: false, userControlledCopyWithProvenance: true,
  }, "the accepted legacy-compatibility terms have changed -- re-audit ADR-009 §5");
  assert.equal(contract.identity.studyUnitKeyUse, "source-reference-only",
    "the accepted contract no longer confines the Study Unit key to a source reference -- re-audit ADR-009 §1");
  assert.equal(contract.deploymentAuthorised, false,
    "deployment authority has changed -- P5-C's held state must be re-audited");
});

check("the service performs a COPY, never a move: nothing clears a source", () => {
  const text = codeOf("study-note-service.js");
  for (const forbidden of ["deleteField", "delete ", "clear(", "remove("]) {
    assert.ok(!text.includes(forbidden), `the promotion path names ${forbidden} -- a copy must not remove anything`);
  }
});

check("every source-binding word written by a FIXTURE is in the accepted vocabulary", () => {
  // The drift ADR-009 closed lived in test fixtures, not in app code -- two of
  // them spelling the same two facts four ways. Correcting them once is not the
  // fix; binding them to the vocabulary is, because the next fixture would
  // otherwise invent a fifth spelling with nothing to catch it.
  const SOURCE_KINDS = ["quran-unit", "hadith-unit", "topic-unit", "name-unit"];
  const files = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(mjs|js|json)$/.test(entry.name)) files.push(full);
    }
  })(path.join(root, "tools"));

  const offenders = [];
  for (const file of files) {
    // A line that CALLS studyNoteSource() is exercising the validator, not
    // seeding a document -- proving a bad word is refused necessarily means
    // writing that bad word down. Skipping those lines keeps this a check about
    // FIXTURES, which is what it is for, rather than a filename exception.
    const lines = fs.readFileSync(file, "utf8").split("\n").filter((l) => !l.includes("studyNoteSource("));
    for (const [field, allowed] of [["sourceKind", SOURCE_KINDS],
                                    ["relationshipKind", RELATIONSHIP_KINDS],
                                    ["provenanceKind", PROVENANCE_KINDS]]) {
      for (const m of lines.join("\n").matchAll(new RegExp(`${field}:\\s*"([^"]+)"`, "g"))) {
        if (!allowed.includes(m[1])) offenders.push(`${path.relative(root, file)} ${field}: "${m[1]}"`);
      }
    }
  }
  assert.deepEqual(offenders, [], `fixtures spell source-binding fields outside ADR-009: ${offenders.join(" | ")}`);
});

check("approach_10 still IS Journaling", () => {
  // A hardcoded id silently comes to mean a different Approach after a
  // catalogue renumber, and nothing on any screen would show it.
  const byId = new Map(APPROACH_TEMPLATES.map((t) => [t.id, t]));
  assert.equal(byId.get("approach_10")?.name.en, "Journaling", "approach_10 has been renumbered or renamed");
  assert.equal(APPROACH_TEMPLATES.length, 30);
  const referenced = [...new Set([...codeOf("study-note-service.js").matchAll(/approach_\d\d/g)].map((m) => m[0]))];
  assert.deepEqual(referenced, [], "the service must take the Journaling id from the P5-B bridge, not retype it");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
