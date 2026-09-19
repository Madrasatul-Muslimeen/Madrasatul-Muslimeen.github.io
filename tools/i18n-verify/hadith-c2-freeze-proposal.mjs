// Hadith C2 — the PROPOSED claim freeze, and the claims the proposal makes.
//
// Run from the REPOSITORY ROOT.
//
// The proposal says a one-option change stops new name-keyed Hadith records
// while preserving every existing one. That is four separate claims about code
// the Hadith stream does not own, plus one about the proposal's own status --
// it must stay UNAPPLIED. Every one of them is checked here, because a
// proposal nobody can verify is just an opinion with a diff attached.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
// records.js imports the Firebase SDK over https, so it cannot be imported in
// plain Node -- its chunking rule is read out of its SOURCE instead, which is
// also the stronger binding: the check fails if the RULE changes, not merely if
// a call returns something different.
import { UNIT_TYPES, buildUnitKey } from "../../app/js/unit-keys.js";

const root = path.resolve(process.argv[2] || process.cwd());
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

const PATCH = "docs/governance/hadith-c2-claim-freeze-records-html-2026-09-19.patch";
const PROPOSAL = "docs/governance/hadith-c2-claim-freeze-PROPOSAL-2026-09-19.md";
const records = read("app/records.html");
const patch = read(PATCH);
const proposal = read(PROPOSAL);

console.log("\n=== Hadith C2 claim freeze: a PROPOSAL, and what it preserves ===\n");

// ---------------------------------------------------------------------------
// STATUS -- proposed, not applied
// ---------------------------------------------------------------------------

check("STATUS -- the live records.html is NOT patched; the freeze is proposed only", () => {
  assert.ok(!records.includes("FROZEN_UNIT_TYPES"), "the freeze has been APPLIED to a platform surface without authority");
  assert.ok(!records.includes("C2 TEMPORARY FREEZE"), "the freeze marker is in the live file");
  assert.ok(/UNIT_TYPES\s*\n\s*\.map\(/.test(records), "the option list no longer builds straight from UNIT_TYPES -- something changed it");
});

check("STATUS -- the patch still applies cleanly to the current file", () => {
  execFileSync("git", ["apply", "--check", PATCH], { cwd: root });
  // and --check does not modify anything
  assert.equal(read("app/records.html"), records, "running the check altered the file");
});

check("STATUS -- the patch touches app/records.html and NOTHING else", () => {
  const filesIn = (text) => [...text.matchAll(/^diff --git a\/(\S+) b\/(\S+)$/gm)].map((m) => m[1]);
  // POSITIVE CONTROL for the scan itself. A mutation that added a second file
  // to the patch was caught by the "applies cleanly" check instead of this
  // one, so this one had not been proven able to fail. Given a two-file patch
  // it must see two files -- otherwise `deepEqual` below could be passing
  // because the scan finds nothing at all.
  assert.deepEqual(
    filesIn("diff --git a/app/records.html b/app/records.html\ndiff --git a/app/js/i18n/bn.js b/app/js/i18n/bn.js"),
    ["app/records.html", "app/js/i18n/bn.js"],
    "the patch file scan cannot see a second file, so asserting there is only one proves nothing");
  const files = filesIn(patch);
  assert.deepEqual(files, ["app/records.html"], `the patch reaches other files: ${files.join(", ")}`);
  assert.ok(!/i18n\/bn\.js|version\.js|CLAUDE\.md|CHANGELOG\.md|firestore\.rules/.test(patch),
    "the patch reaches a shared file the Hadith stream must not change");
});

check("STATUS -- the patch adds only; it deletes no line of the live file", () => {
  const removed = patch.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---"));
  assert.deepEqual(removed, [], `the patch deletes live lines: ${removed.join(" | ")}`);
});

// ---------------------------------------------------------------------------
// WHAT IT PRESERVES -- read out of the code the proposal is talking about
// ---------------------------------------------------------------------------

check("PRESERVED -- the entry display reads the STORED key, never the picker", () => {
  const i = records.indexOf("function renderEntries(");
  assert.ok(i > 0, "renderEntries is gone; the proposal's display claim is about code that no longer exists");
  const body = records.slice(i, records.indexOf("\n    }", i));
  assert.ok(/chunk\?\.entries/.test(body), "renderEntries no longer reads the stored entries map");
  assert.ok(!/unitTypeSelect/.test(body), "the display path now reads the unit-type picker, so freezing the picker WOULD hide records");
  assert.ok(/unitKeyLabel\(entryKey\.split\("::"\)\[0\]\)/.test(records),
    "the row no longer renders from the stored entry key");
});

check("PRESERVED -- Confirm and Return act on the stored chunk/entry key (I6 untouched)", () => {
  assert.ok(/data-chunk="\$\{chunkKey\}" data-entry="\$\{entryKey\}"/.test(records),
    "the confirm/return buttons no longer carry the stored keys");
  for (const fn of ["confirmEntry", "returnEntry"]) {
    assert.ok(records.includes(fn), `${fn} is gone from the page`);
  }
});

check("PRESERVED -- the chunk holding Hadith entries stays reachable through other unit types", () => {
  // Hadith is not surah-chunked, so it lands in subject_<subjectId> -- and so
  // does every other non-surah type. Freezing ONE type therefore cannot make
  // the document unreachable. Read out of records.js's own source.
  const rec = read("app/js/records.js");
  const m = rec.match(/const SURAH_CHUNKED_TYPES = new Set\(\[([^\]]*)\]\)/);
  assert.ok(m, "SURAH_CHUNKED_TYPES could not be read out of records.js -- the chunking rule has moved");
  const surahChunked = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  assert.ok(!surahChunked.includes("hadith"), "hadith is now surah-chunked; the proposal's reachability claim is about a different layout");
  assert.ok(/return `subject_\$\{subjectId\}`/.test(rec), "the non-surah fallback is no longer subject_<subjectId>");
  const alsoSubjectChunked = UNIT_TYPES.filter((u) => u !== "hadith" && !surahChunked.includes(u));
  assert.ok(alsoSubjectChunked.length > 0,
    "no remaining unit type opens the subject chunk, so the freeze would hide existing records behind no reachable control");
  assert.ok(typeof buildUnitKey.hadith === "function", "buildUnitKey.hadith is gone");
});

check("PRESERVED -- the key builder keeps its hadith case, so the freeze is reversible and nothing is unreadable", () => {
  assert.ok(/case "hadith":/.test(records), "buildUnitKeyFromInput lost its hadith case");
  assert.ok(typeof buildUnitKey.hadith === "function", "buildUnitKey.hadith is gone");
  assert.ok(UNIT_TYPES.includes("hadith"), "hadith has been removed from UNIT_TYPES itself -- that is a far larger change than this proposal");
});

check("PRESERVED -- the patch's insertion point is declared BEFORE it is used", () => {
  const decl = records.indexOf("const unitRefHint");
  const use = records.indexOf("unitTypeSelect.innerHTML");
  assert.ok(decl > 0 && decl < use, "unitRefHint is declared after the insertion point; variant B would throw at load");
});

// ---------------------------------------------------------------------------
// WHAT THE PROPOSAL MUST SAY
// ---------------------------------------------------------------------------

check("DISCLOSURE -- the proposal names its bn.js dependency as a PLATFORM action", () => {
  assert.ok(/bn\.js/.test(proposal), "the proposal does not name the Bangla catalogue at all");
  assert.ok(/shared platform file the Hadith stream must not touch|platform/i.test(proposal),
    "the proposal does not say the bn.js key is somebody else's to add");
  const bn = read("app/js/i18n/bn.js");
  assert.ok(!bn.includes("Hadith records are paused"),
    "the Bangla key has appeared in a shared file -- if the platform added it, this check should be updated deliberately");
});

check("DISCLOSURE -- the proposal states it is NOT applied, and offers the silent variant too", () => {
  assert.ok(/NOT APPLIED/.test(proposal), "the proposal no longer says it is unapplied");
  assert.ok(/Variant|variant/.test(proposal) && /silent/.test(proposal), "the minimal variant is no longer offered");
});

check("DISCLOSURE -- the proposal claims no decision on C2 itself", () => {
  assert.ok(/does not decide C2|not decide C2/i.test(proposal), "the proposal stopped disclaiming the C2 decision");
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
