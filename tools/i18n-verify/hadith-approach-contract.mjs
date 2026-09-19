// Hadith H2-C — the Approach contract's guards.
//
// Run from the REPOSITORY ROOT.
//
// The module's entire safety case is three claims, and every one of them is the
// kind that no function-level test can see: it allocates no id, it is reachable
// from no page, and it can reach nothing. This suite asserts all three by
// reading source and walking the import graph, and then checks the behaviour on
// top. A failure here means the contract stopped being a contract and started
// being a feature.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  HADITH_APPROACH_SLOTS, HADITH_APPROACH_INTENT, HADITH_APPROACH_IDS,
  isHadithApproachSlot, hadithApproachId, allocationState, hadithStudySlot, blockersFor,
} from "../../app/js/hadith-approach-contract.js";

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

const MODULE = "app/js/hadith-approach-contract.js";
const src = read(MODULE);
/** Source with BOTH comment forms stripped -- a module's doc comment names the things it must never touch, in order to say so. */
const code = src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");

console.log("\n=== Hadith H2-C: the Approach contract, pure and unallocated ===\n");

// ---------------------------------------------------------------------------
// THE EMPTY TABLE -- the point of the module
// ---------------------------------------------------------------------------

check("ALLOCATION -- the permanent-id table is EMPTY, and frozen", () => {
  assert.deepEqual(Object.keys(HADITH_APPROACH_IDS), [], "an id has been allocated in the contract; allocation is the Master Architect's");
  assert.ok(Object.isFrozen(HADITH_APPROACH_IDS));
});

check("ALLOCATION -- every slot reports NO id, and the contract reports itself unusable", () => {
  for (const s of HADITH_APPROACH_SLOTS) assert.equal(hadithApproachId(s), null, `${s} has acquired an id`);
  const st = allocationState();
  assert.deepEqual([st.total, st.allocated, st.usable], [3, 0, false]);
  assert.deepEqual([...st.pending], [...HADITH_APPROACH_SLOTS]);
});

check("ALLOCATION -- NO `approach_`-shaped ID appears anywhere in the file, comments included", () => {
  // CASE-SENSITIVE, and that is the point. A trackable id is lowercase
  // (`approach_07`, `hadith_approach_01`, `approach_h01`); an UPPERCASE
  // APPROACH_ is this module's own symbol naming. The first version of this
  // check was case-insensitive and flagged HADITH_APPROACH_SLOTS -- a wrong
  // assertion, not a defect, and a check that fired on correct code would have
  // been "fixed" by weakening the module rather than the check.
  const hits = [...src.matchAll(/\bapproach_[a-z0-9]\w*/g)].map((m) => m[0]);
  assert.deepEqual(hits, [], `an Approach id appears in the contract: ${hits.join(", ")}`);
  // ALL THREE are case-sensitive, and the second and third were NOT on the
  // first attempt -- they matched this module's own HADITH_APPROACH_* symbols
  // and failed on correct code. The same mistake, twice, in one check: a
  // case-insensitive sweep for a LOWERCASE id convention will always collide
  // with SCREAMING_CASE symbol names that share the word.
  assert.ok(!/\bapproach_\d/.test(src), "a numbered Approach id appears in the contract");
  assert.ok(!/\bhadith_approach_|\bapproach_h\d/.test(src), "a candidate Hadith Approach id has been written down -- allocation is the Master Architect's");
});

check("ALLOCATION -- no Quran Approach id is reachable from here even by accident", () => {
  for (const meta of Object.values(HADITH_APPROACH_INTENT)) {
    assert.ok(!/^approach_/i.test(meta.quranAnalogueSymbol), "an analogue is recorded as an ID rather than a symbol");
    assert.ok(/^[A-Z_]+$/.test(meta.quranAnalogueSymbol), `the analogue ${meta.quranAnalogueSymbol} is not a symbol`);
  }
});

// ---------------------------------------------------------------------------
// PURITY -- enforcement by inability
// ---------------------------------------------------------------------------

check("PURITY -- the contract imports NOTHING", () => {
  const imports = [...src.matchAll(/^\s*import\s[\s\S]*?$/gm)].map((m) => m[0].trim());
  assert.deepEqual(imports, [], `the contract acquired an import: ${imports.join(" | ")}`);
  assert.ok(!/\bimport\s*\(/.test(code), "a dynamic import appeared");
  assert.ok(!/\brequire\s*\(/.test(code), "a require appeared");
});

check("PURITY -- it cannot reach the database, the records layer, or the catalogue", () => {
  for (const forbidden of [
    "firebasejs", "firestore", "getDocs", "setDoc", "updateDoc", "runTransaction", "arrayUnion",
    "records.js", "activity.js", "claimStatus", "confirmEntry", "trackables", "APPROACH_TEMPLATES",
    "buildUnitKey", "unit-keys", "TOPIC_TRACKABLE_TEMPLATES",
  ]) {
    assert.ok(!code.includes(forbidden), `the contract names ${forbidden} -- it is pure symbolic policy`);
  }
});

check("PURITY -- it produces no evidence payload and no claim shape", () => {
  for (const forbidden of ["eventType", "unitKey", "weekKey", "dedupe", "evidence", "chunkKey", "entryKey"]) {
    assert.ok(!code.includes(forbidden), `the contract names ${forbidden} -- it returns a SLOT and stops`);
  }
});

check("PURITY -- it carries no user-visible string, because display names are a product decision (I11)", () => {
  assert.ok(!/\bt\(/.test(code), "the contract has acquired a translation call");
  assert.ok(!code.includes("document."), "the contract touches the DOM");
});

// ---------------------------------------------------------------------------
// REACHABILITY -- with a positive control, or it passes vacuously
// ---------------------------------------------------------------------------

/** Every module an entry file can reach, by any chain of any length. */
function reachableFrom(entryFiles) {
  const seen = new Set();
  const queue = [...entryFiles];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file) || !fs.existsSync(path.join(root, file))) continue;
    seen.add(file);
    const text = fs.readFileSync(path.join(root, file), "utf8");
    for (const m of text.matchAll(/(?:import|export)[^'"]*?from\s*["'](\.[^"']+)["']|import\s*\(\s*["'](\.[^"']+)["']|<script[^>]*src=["'](\.?[^"':]+\.js)["']/g)) {
      const spec = m[1] || m[2] || m[3];
      if (!spec) continue;
      const dir = path.dirname(file);
      queue.push(path.normalize(path.join(dir, spec)).replace(/\\/g, "/"));
    }
    // app/*.html inline modules import "./js/x.js" relative to app/
    for (const m of text.matchAll(/from\s*["']\.\/js\/([^"']+)["']/g)) queue.push(`app/js/${m[1]}`);
  }
  return seen;
}

const pages = fs.readdirSync(path.join(root, "app")).filter((f) => f.endsWith(".html")).map((f) => `app/${f}`);
const reachable = reachableFrom(pages);

check("POSITIVE CONTROL -- the import walk really reaches wired modules", () => {
  assert.ok(pages.length > 10, `only ${pages.length} pages were found; the entry scan is broken`);
  assert.ok(reachable.has("app/js/records.js"), "records.js is unmistakably wired and the walk did not reach it -- the walk is broken, so every absence below would be meaningless");
  assert.ok(reachable.size > 40, `only ${reachable.size} modules were reached; the walk is not walking`);
});

check("REACHABILITY -- NO page reaches the contract, by any chain of any length", () => {
  assert.ok(!reachable.has(MODULE), "the Hadith Approach contract is now reachable from a page: it is no longer uninvoked policy, and its gates are no longer closed");
});

check("REACHABILITY -- nothing in app/ imports it directly either", () => {
  const importers = [];
  for (const dir of ["app", "app/js"]) {
    for (const f of fs.readdirSync(path.join(root, dir))) {
      const p = `${dir}/${f}`;
      if (!/\.(js|html)$/.test(f) || p === MODULE) continue;
      if (/hadith-approach-contract/.test(fs.readFileSync(path.join(root, p), "utf8"))) importers.push(p);
    }
  }
  assert.deepEqual(importers, [], `the contract is named by: ${importers.join(", ")}`);
});

// ---------------------------------------------------------------------------
// BEHAVIOUR
// ---------------------------------------------------------------------------

check("SLOTS -- exactly the three v1 candidates, frozen, and no fourth", () => {
  assert.deepEqual([...HADITH_APPROACH_SLOTS], ["READ_ARABIC", "READ_WITH_MEANING", "MEMORISE"]);
  assert.ok(Object.isFrozen(HADITH_APPROACH_SLOTS));
  assert.deepEqual(Object.keys(HADITH_APPROACH_INTENT).sort(), [...HADITH_APPROACH_SLOTS].sort(),
    "the slot list and the intent table have drifted apart");
});

check("SLOTS -- every slot declares NO data dependency, which is why these three and not the other five", () => {
  for (const [slot, meta] of Object.entries(HADITH_APPROACH_INTENT)) {
    assert.equal(meta.dataDependency, "none", `${slot} has grown a data dependency and no longer belongs in v1`);
  }
});

check("SIGNAL -- reading with a translation on screen is a DIFFERENT slot from reading without", () => {
  assert.equal(hadithStudySlot({ interaction: "read", translationShown: true }), "READ_WITH_MEANING");
  assert.equal(hadithStudySlot({ interaction: "read", translationShown: false }), "READ_ARABIC");
  assert.equal(hadithStudySlot({ interaction: "read" }), "READ_ARABIC", "the default must be the stricter reading, not the richer one");
});

check("SIGNAL -- memorising is its own slot", () => {
  assert.equal(hadithStudySlot({ interaction: "memorise" }), "MEMORISE");
});

check("SIGNAL -- an interaction v1 has no slot for records NOTHING, quietly", () => {
  for (const i of ["listen", "grade", "isnad", "commentary", "", undefined, null]) {
    assert.equal(hadithStudySlot({ interaction: i }), null, `"${i}" was given a slot it has no business having`);
  }
  assert.equal(hadithStudySlot(), null, "called with nothing at all, it must not throw and must not guess");
});

check("FAIL-CLOSED -- a KNOWN slot with no id returns null; an UNKNOWN slot THROWS", () => {
  assert.equal(hadithApproachId("MEMORISE"), null);
  assert.throws(() => hadithApproachId("MEMORIZE"), /not a Hadith Approach slot/,
    "a typo must never read as a pending decision");
  assert.throws(() => hadithApproachId("approach_01"), /not a Hadith Approach slot/);
  assert.equal(isHadithApproachSlot("READ_ARABIC"), true);
  assert.equal(isHadithApproachSlot("read_arabic"), false, "slots are case-sensitive symbols");
});

check("BLOCKERS -- both gates are named, so a surface can say WHICH thing is missing", () => {
  const b = blockersFor("READ_ARABIC");
  assert.ok(b.some((x) => /no permanent Approach id/.test(x)), "the Approach gate is not named");
  assert.ok(b.some((x) => /gate C2/.test(x)), "the C2 key gate is not named");
  assert.deepEqual([...blockersFor("NOPE")], ["not a Hadith Approach slot"]);
});

check("BLOCKERS -- C2 is named for every slot, including one that later gets an id", () => {
  for (const s of HADITH_APPROACH_SLOTS) {
    assert.ok(blockersFor(s).some((x) => /gate C2/.test(x)),
      `${s} stopped naming C2 -- allocating an Approach id does not decide the unit key`);
  }
});

// ---------------------------------------------------------------------------
// THE FACTS THIS CONTRACT RESTS ON, read out of code it does not own
// ---------------------------------------------------------------------------

check("CONTEXT -- the 30 Quran Approaches are still approach_01..approach_30 and still not Hadith's", () => {
  const cat = read("app/js/catalogue-data.js");
  const ids = [...cat.matchAll(/id:\s*"(approach_\d+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, 30, `expected 30 Quran Approach ids, found ${ids.length}`);
  assert.equal(new Set(ids).size, 30, "a Quran Approach id is duplicated");
});

check("CONTEXT -- studied_hadith is still the ONLY Hadith trackable, and still generic", () => {
  const cat = read("app/js/catalogue-data.js");
  assert.ok(cat.includes('"studied_hadith"') || cat.includes("studied_hadith"), "the existing generic Hadith row is gone -- real claims are keyed to it (I4/I6)");
  const hadithApproachIds = [...cat.matchAll(/id:\s*"(hadith_approach_\w+|approach_h\w+)"/g)].map((m) => m[0]);
  assert.deepEqual(hadithApproachIds, [], `a Hadith Approach id has been seeded into the catalogue: ${hadithApproachIds.join(", ")}`);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
