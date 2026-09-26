// Hadith -- THE TWO OWNER CONTROL GATES, pinned so they cannot drift quietly.
//
// Run from the REPOSITORY ROOT.
//
// WHY THIS EXISTS. Two Hadith decisions are recorded as PROPOSALS behind Owner
// Control Gates, and both rest on facts about code the Hadith stream does not
// own:
//
//   GATE C2 -- the permanent Hadith unit key (H1 section 5). The proposal is
//   `hadith:<editionId>:<occurrenceOrdinal>`. It is safe to propose only
//   because the ACCEPTED regex in study-note-binding.js admits that shape, and
//   it is still only a proposal because unit-keys.js really does build the
//   name-keyed `hadith:<collectionName>:<number>` today -- H0's contradiction
//   C2 with I5 ("units are keyed by permanent ID, never by name").
//
//   GATE APPROACH -- the Hadith Approach registry (H2-B). Its refusal to reuse
//   `approach_NN` rests on three facts: a trackable id IS a document id, claims
//   are keyed by trackableId (I5), and the catalogue seed hardcodes
//   `subjectId: "quran"`.
//
// Every one of those facts lived only in prose. If the Quran side tightened the
// regex, or renumbered the Approaches, or someone "tidied" the hadith key
// builder, the recorded proposals would become wrong and NOTHING would fail.
// This suite makes each fact a check. It asserts what IS, so that a change to
// any of it is a deliberate decision rather than an accident.
//
// IT CHANGES NOTHING AND PROPOSES NOTHING. It allocates no Approach id, applies
// no unit key, and reads only. A failure here means a gate moved.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildUnitKey, parseUnitKey, UNIT_TYPES } from "../../app/js/unit-keys.js";
import { APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } from "../../app/js/catalogue-data.js";

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

// The accepted regex, read OUT of the file rather than retyped here. Retyping
// it would make this suite agree with itself while the app disagreed.
function acceptedHadithPattern() {
  const src = read("app/js/study-note-binding.js");
  const m = src.match(/hadith:\s*(\/\^hadith:[^/]+\/)/);
  assert.ok(m, "the accepted hadith unit-key regex could not be found in study-note-binding.js -- the guard is reading the wrong shape");
  // eslint-disable-next-line no-new-func
  return new Function(`return ${m[1]}`)();
}

console.log("\n=== Hadith Owner Control Gates: the facts the proposals rest on ===\n");

check("POSITIVE CONTROL -- the accepted regex is really read out of the app, not retyped", () => {
  const re = acceptedHadithPattern();
  assert.ok(re instanceof RegExp, "not a regex");
  assert.ok(re.source.includes("hadith:"), `unexpected pattern: ${re.source}`);
  assert.ok(re.test("hadith:bukhari:1"), "the pattern read from the app rejects a key the app itself builds");
});

// ---------------------------------------------------------------------------
// GATE C2 -- the permanent Hadith unit key
// ---------------------------------------------------------------------------

check("C2 -- the LIVE builder is still NAME-keyed, which is the recorded contradiction", () => {
  // This is the fact H0 recorded and the Owner has not decided. If it ever
  // changes, that is a permanent Study Unit key moving and it must not happen
  // silently. Built through buildUnitKey rather than typed, per the standing
  // lesson about hardcoded keys.
  const k = buildUnitKey.hadith("bukhari", 5678);
  assert.equal(k, "hadith:bukhari:5678", "buildUnitKey.hadith no longer produces the name-keyed form");
  const { unitType, parts } = parseUnitKey(k);
  assert.equal(unitType, "hadith");
  assert.deepEqual(parts, ["bukhari", "5678"]);
  assert.ok(UNIT_TYPES.includes("hadith"), "`hadith` is no longer a declared unit type");
});

check("C2 -- the accepted regex still admits the PROPOSED edition/ordinal form", () => {
  // Without this the H1 section 5 proposal is unimplementable, and nothing else
  // in the repository would notice.
  const re = acceptedHadithPattern();
  for (const k of ["hadith:bk1422h:00001", "hadith:bk1422h:00042", "hadith:msl1955h:12345"]) {
    assert.ok(re.test(k), `${k} -- the proposed key form is no longer accepted`);
  }
});

check("C2 -- ...and still admits the LEGACY name-keyed form, so no existing record is orphaned", () => {
  // I4/I16: a key already recorded must stay legible. A regex tightened to the
  // proposal alone would strand every `hadith:bukhari:N` record in production.
  const re = acceptedHadithPattern();
  for (const k of [buildUnitKey.hadith("bukhari", 1), buildUnitKey.hadith("muslim", 1907), buildUnitKey.hadith("abu-dawud", 42)]) {
    assert.ok(re.test(k), `${k} -- a legacy key the app itself builds is no longer accepted`);
  }
});

check("C2 -- the 6-digit ordinal bound is EXACT, and an import past it must fail loudly", () => {
  // The proposal cites this bound as its headroom argument. Measured, not read.
  const re = acceptedHadithPattern();
  assert.ok(re.test("hadith:bk1422h:999999"), "999,999 is no longer inside the bound");
  assert.ok(!re.test("hadith:bk1422h:1000000"), "1,000,000 is now ACCEPTED -- the stated bound has moved");
  assert.ok(!re.test("hadith:bk1422h:"), "an empty ordinal is accepted");
  assert.ok(!re.test("hadith::00001"), "an empty edition id is accepted");
});

// Owner decision 7 (26 Sep 2026, docs/governance/2026-09-26-owner-decisions.md
// row 7, issue #311): Gate C2 is DECIDED for HadeethEnc only -- a HadeethEnc
// hadith is `hadith:hadeethenc:<id>`. `app/js/hadith-study-actions.js` is the
// ONE hadith-owned file authorised to build it, and ONLY when the first
// argument is the literal "hadeethenc" -- every other edition, and every
// other hadith-owned file, is still undecided and must still fail. Pulled out
// as a pure function so the mutation check below can prove it refuses a
// "bukhari" call without needing a second real file on disk.
const EXPECTED_PLATFORM_CALLERS = ["app/records.html"];
const AUTHORIZED_HADEETHENC_CALLER = "app/js/hadith-study-actions.js";

function evaluateHadithKeyCallers(callsByFile) {
  const callers = [...callsByFile.keys()];
  const hadithOwned = callers.filter((c) => /(^|\/)hadith-/.test(c));
  const violations = [];

  const unauthorizedHadithOwned = hadithOwned.filter((c) => c !== AUTHORIZED_HADEETHENC_CALLER);
  if (unauthorizedHadithOwned.length) {
    violations.push(`a HADITH-owned file other than ${AUTHORIZED_HADEETHENC_CALLER} applies the undecided unit key: ${unauthorizedHadithOwned.join(", ")}`);
  }

  if (callsByFile.has(AUTHORIZED_HADEETHENC_CALLER)) {
    const notHadeethenc = callsByFile.get(AUTHORIZED_HADEETHENC_CALLER).filter((a) => a !== "hadeethenc");
    if (notHadeethenc.length) {
      violations.push(`${AUTHORIZED_HADEETHENC_CALLER} builds a hadith key for something other than the literal "hadeethenc": ${JSON.stringify(notHadeethenc)} -- Owner decision 7 covers HadeethEnc only`);
    }
  }

  const unexpected = callers.filter((c) => !EXPECTED_PLATFORM_CALLERS.includes(c) && c !== AUTHORIZED_HADEETHENC_CALLER);
  if (unexpected.length) {
    violations.push(`a new surface builds hadith unit keys: ${unexpected.join(", ")} -- every caller of an undecided permanent key must be deliberate`);
  }

  return violations;
}

/** Every `buildUnitKey.hadith(...)` call site under app/js and app, keyed by "dir/file", each entry the plain-string first argument of one call (or `null` when it isn't a plain string literal -- that can never equal "hadeethenc" either, so it fails exactly like a wrong edition would). */
function scanHadithKeyCallers() {
  const callsByFile = new Map();
  for (const dir of ["app/js", "app"]) {
    const base = path.join(root, dir);
    if (!fs.existsSync(base)) continue;
    for (const f of fs.readdirSync(base)) {
      if (!/\.(js|html)$/.test(f)) continue;
      const src = fs.readFileSync(path.join(base, f), "utf8");
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
      const matches = [...code.matchAll(/buildUnitKey\s*\.\s*hadith\s*\(\s*(?:(["'])([^"']*)\1)?/g)];
      if (matches.length) callsByFile.set(`${dir}/${f}`, matches.map((m) => m[2] ?? null));
    }
  }
  return callsByFile;
}

check("C2 -- the undecided key is applied by the pre-existing PLATFORM surface, and by HadeethEnc's own authorised caller only", () => {
  // This check first asserted that NOBODY builds a hadith key. That was WRONG,
  // and the failure is the tranche's most useful finding: `app/records.html`
  // has a generic unit-key switch covering every unit type, hadith included
  // (line ~279), and it predates the Hadith stream entirely. So the C2
  // contradiction -- a permanent Study Unit key built from a collection NAME,
  // against I5 -- is LIVE AND REACHABLE in the Records surface today, not a
  // latent one waiting on a decision.
  //
  // The invariant worth holding is therefore not "nobody calls it" but "only
  // the platform surface that already did, plus HadeethEnc's own authorised
  // caller, and only for the literal HadeethEnc gets built for.
  const callsByFile = scanHadithKeyCallers();
  const violations = evaluateHadithKeyCallers(callsByFile);
  assert.deepEqual(violations, [], violations.join(" | "));
  for (const platformCaller of EXPECTED_PLATFORM_CALLERS) {
    assert.ok(callsByFile.has(platformCaller), `the recorded platform caller is missing: ${platformCaller}`);
  }
});

check("C2 -- MUTATION: a hadith-owned file naming any edition other than \"hadeethenc\" is refused", () => {
  // Proves evaluateHadithKeyCallers() itself refuses the exact shape this
  // round's own instruction named ("a call with 'bukhari' in the new file
  // must fail") -- without needing a second real file on disk to do it.
  const clean = new Map([[AUTHORIZED_HADEETHENC_CALLER, ["hadeethenc"]], ...EXPECTED_PLATFORM_CALLERS.map((c) => [c, ["bukhari"]])]);
  assert.deepEqual(evaluateHadithKeyCallers(clean), [], "the authorised shape itself was rejected -- the guard is not a check, it is a blanket refusal");

  const mutated = new Map(clean);
  mutated.set(AUTHORIZED_HADEETHENC_CALLER, ["hadeethenc", "bukhari"]);
  const violations = evaluateHadithKeyCallers(mutated);
  assert.ok(violations.length > 0, "a \"bukhari\" call inside the authorised HadeethEnc caller was not refused");
  assert.ok(violations.some((v) => v.includes("hadeethenc")), `the refusal does not name the actual defect: ${violations.join(" | ")}`);

  const secondHadithOwnedFile = new Map(clean);
  secondHadithOwnedFile.set("app/js/hadith-other-surface.js", ["hadeethenc"]);
  assert.ok(evaluateHadithKeyCallers(secondHadithOwnedFile).length > 0,
    "a SECOND hadith-owned file calling buildUnitKey.hadith(\"hadeethenc\", ...) was not refused -- only hadith-study-actions.js is authorised");
});

// ---------------------------------------------------------------------------
// GATE APPROACH -- the Hadith Approach registry
// ---------------------------------------------------------------------------

check("APPROACH -- the 30 Quran Approaches are intact and still numbered approach_01..approach_30", () => {
  // The registry PROPOSAL refuses to reuse these ids. A renumber would make the
  // refusal argue about ids that no longer exist.
  assert.equal(APPROACH_TEMPLATES.length, 30, `APPROACH_TEMPLATES holds ${APPROACH_TEMPLATES.length}, not 30`);
  const ids = APPROACH_TEMPLATES.map((a) => a.id);
  assert.equal(ids[0], "approach_01");
  assert.equal(ids.at(-1), "approach_30");
  assert.equal(new Set(ids).size, 30, "an Approach id is duplicated");
});

check("APPROACH -- NO Hadith Approach id has been allocated, anywhere", () => {
  // The whole gate, in one assertion. Scans the catalogue rather than trusting
  // that nobody added one.
  const ids = new Set([...APPROACH_TEMPLATES, ...TOPIC_TRACKABLE_TEMPLATES].map((t) => t.id));
  const hadithApproach = [...ids].filter((id) => /^hadith[_-]?approach/i.test(id));
  assert.deepEqual(hadithApproach, [], `a Hadith Approach id exists: ${hadithApproach.join(", ")}`);
  for (const f of ["app/js/catalogue-data.js", "app/js/catalogue.js"]) {
    assert.ok(!/hadith_approach/i.test(read(f)), `${f} names a Hadith Approach id`);
  }
});

check("APPROACH -- studied_hadith is still a GENERIC module row, not an Approach", () => {
  // If this ever gained a subjectId or an Approach-shaped name, the module
  // would be presenting a generic row as an approved Approach -- the exact
  // misleading claim the instruction forbade.
  const h = TOPIC_TRACKABLE_TEMPLATES.find((t) => t.id === "studied_hadith");
  assert.ok(h, "studied_hadith is gone");
  assert.equal(h.moduleId, "hadith");
  assert.equal(h.subjectId, null, "studied_hadith has gained a subjectId -- it is no longer module-wide");
  assert.equal(h.name.en, "Studied", `studied_hadith is now named "${h.name.en}"`);
  assert.ok(!/approach/i.test(JSON.stringify(h)), "studied_hadith now describes itself as an Approach");
});

check("APPROACH -- the seed still binds every Approach to Quran, which is the refusal's own reason", () => {
  // The proposal refuses approach_NN reuse partly BECAUSE the seed hardcodes
  // the subject. If that stopped being true the refusal would need rewriting.
  const src = read("app/js/catalogue.js");
  assert.ok(/subjectId:\s*"quran"/.test(src), "the catalogue seed no longer hardcodes subjectId: \"quran\"");
  assert.ok(/moduleId:\s*"quranrevival"/.test(src), "the catalogue seed no longer hardcodes moduleId: \"quranrevival\"");
});

check("APPROACH -- the Hadith module still claims no APPROACH of its own, and only its one authorised caller claims the GENERIC studied_hadith trackable", () => {
  // Read off the module's own source, so a future surface cannot quietly start
  // naming one. Owner decision 7 (issue #311) authorised exactly ONE
  // hadith-owned file to call records.js's claimStatus() for the module's
  // PRE-EXISTING, GENERIC studied_hadith trackable (unchanged since before
  // this decision -- see the APPROACH check just above, still passing) --
  // that legitimately means writing the literal strings "studied_hadith" and
  // "trackableId" (a claimStatus() argument name). It does NOT touch the
  // Approach refusal: "approach_" and "APPROACH_TEMPLATES" stay forbidden in
  // EVERY hadith-owned file, this one included.
  const AUTHORIZED_STUDIED_CALLER = path.basename(AUTHORIZED_HADEETHENC_CALLER);
  for (const f of fs.readdirSync(path.join(root, "app", "js")).filter((n) => /^hadith-.*\.js$/.test(n))) {
    const src = fs.readFileSync(path.join(root, "app", "js", f), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    const forbidden = f === AUTHORIZED_STUDIED_CALLER
      ? ["approach_", "APPROACH_TEMPLATES"]
      : ["approach_", "studied_hadith", "trackableId", "APPROACH_TEMPLATES"];
    for (const term of forbidden) {
      assert.ok(!code.includes(term), `app/js/${f} names ${term}`);
    }
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
