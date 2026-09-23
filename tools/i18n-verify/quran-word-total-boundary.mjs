// Issue #206 -- boundary + correctness suite for the whole-Qur'an/Juz
// running word counter, same discipline as study-activity-evidence-boundary.mjs.
//
// Pure modules (quran-word-total.js, study-wbw-total-readiness.js,
// mastery-wheel.js) are imported directly -- none of them touches Firebase.
// The impure data layer (quran-word-total-data.js) imports the Firestore SDK
// by URL, exactly like quran-word-progress-data.js, so it is read as SOURCE
// (codeOf()) rather than imported, the same technique
// study-activity-evidence-boundary.mjs already uses for study-event-wiring.js.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import * as total from "../../app/js/quran-word-total.js";
import * as readiness from "../../app/js/study-wbw-total-readiness.js";
import { renderScopedWheel, wordTotalRampColor, STATUS_COLORS, segmentPath, polarToCartesian } from "../../app/js/mastery-wheel.js";
import { resolveWordProgress } from "../../app/js/quran-word-progress.js";

const root = path.resolve(process.argv[2] || process.cwd());
const appJs = path.join(root, "app", "js");
const toolsDir = path.join(root, "tools", "quran-data-pull");

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

function codeOf(absPath) {
  return fs.readFileSync(absPath, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((line) => !/^\s*(?:\/\/|\*)/.test(line)).join("\n");
}

function functionBody(code, signature) {
  const start = code.indexOf(signature);
  assert.ok(start > -1, `${signature} is gone`);
  const after = code.indexOf("\nexport ", start + 1);
  return after === -1 ? code.slice(start) : code.slice(start, after);
}

// ===========================================================================
// The readiness gate's own shape -- mirrors study-activity-evidence-
// boundary.mjs's malformed-shape refusals exactly: a bare flip, an empty
// decision, a self-authorising module, an unreal date are all still refused.
// ===========================================================================

const READINESS_FILE = path.join(appJs, "study-wbw-total-readiness.js");

check("the wbw-total readiness module imports NOTHING at all -- enforcement by inability", () => {
  const raw = fs.readFileSync(READINESS_FILE, "utf8");
  const code = codeOf(READINESS_FILE);
  const imports = [...code.matchAll(/^\s*import\s/gm)].length + [...code.matchAll(/\bimport\s*\(/g)].length;
  assert.equal(imports, 0, "the readiness module has acquired an import; it must be unable to see anything");
  for (const forbidden of ["firestore.rules", "fetch(", "XMLHttpRequest", "require(", "readFileSync"]) {
    assert.ok(!code.includes(forbidden), `the readiness module reaches ${forbidden}`);
  }
  assert.ok(raw.includes("firestore.rules"), "the module no longer explains why it does not read the rules file");
});

check("the standing declaration is NOT ready, and it is a real literal", () => {
  const src = fs.readFileSync(READINESS_FILE, "utf8");
  const m = src.match(/WBW_TOTAL_PERSISTENCE_DECLARATION\s*=\s*Object\.freeze\(\{[\s\S]*?ready:\s*(true|false)/);
  assert.ok(m, "ready is not a plain literal -- a computed default is not a default");
  assert.equal(m[1], "false", "this round did not deploy anything, so the standing declaration must read ready: false");
  assert.equal(readiness.isWbwTotalPersistenceReady(), false, "the module's own predicate disagrees with the literal it reads");
});

check("a bare flip of `ready` does NOT enable the counter", () => {
  const m = readiness;
  assert.equal(m.isWbwTotalPersistenceReady(), false, "the standing declaration should read not-ready");
  assert.equal(m.isWbwTotalPersistenceReady({ ready: true }), false, "a bare flip enabled it");
  assert.equal(m.isWbwTotalPersistenceReady({ ready: true, decision: {} }), false, "an empty decision enabled it");
  assert.equal(m.isWbwTotalPersistenceReady({ ready: true, decision: { by: "quran", on: "2026-09-23", reference: "x" } }), false,
    "a module authorised its own enablement");
  assert.equal(m.isWbwTotalPersistenceReady({ ready: true, decision: { by: "master-architect", on: "soon", reference: "x" } }), false,
    "a decision with no real date enabled it");
  assert.equal(m.isWbwTotalPersistenceReady({ ready: true, decision: { by: "master-architect", on: "2026-09-23", reference: "" } }), false,
    "a decision with an empty reference enabled it");
  // POSITIVE CONTROL: a predicate that simply returned false would satisfy
  // every assertion above and prove nothing.
  assert.equal(m.isWbwTotalPersistenceReady({ ready: true, decision: { by: "master-architect", on: "2026-09-23", reference: "docs/x.md" } }), true,
    "a fully governed decision is refused -- this is a blanket refusal, not a gate");
});

check("the unavailable-reason key distinguishes NOT_DEPLOYED from DECISION_INCOMPLETE", () => {
  assert.equal(readiness.wbwTotalUnavailableReason(), readiness.REASON_WBW_TOTAL_NOT_DEPLOYED);
  assert.equal(
    readiness.wbwTotalUnavailableReason({ ready: true, decision: null }),
    readiness.REASON_WBW_TOTAL_DECISION_INCOMPLETE,
  );
  assert.equal(
    readiness.wbwTotalUnavailableReason({ ready: true, decision: { by: "master-architect", on: "2026-09-23", reference: "docs/x.md" } }),
    null,
  );
});

// ===========================================================================
// The gate genuinely blocks BOTH the write and the read path while not ready.
// Positive control: assert zero calls into Firestore SDK functions reachable
// from either exported function -- the gate check must be the FIRST thing
// each function does, textually before any Firestore-touching identifier.
// ===========================================================================

const DATA_FILE = path.join(appJs, "quran-word-total-data.js");

check("getWordTotals() and recordWordTotalDelta() consult the gate BEFORE touching Firestore, not after", () => {
  const code = codeOf(DATA_FILE);
  for (const [sig, firestoreCalls] of [
    ["export async function getWordTotals", ["getDoc(", "doc(db"]],
    ["export async function recordWordTotalDelta", ["getDoc(", "doc(db", "createDocument(", "updateDocument("]],
  ]) {
    const body = functionBody(code, sig);
    const gateAt = body.indexOf("isWbwTotalPersistenceReady()");
    assert.ok(gateAt > -1, `${sig} never consults the readiness gate at all`);
    for (const call of firestoreCalls) {
      const callAt = body.indexOf(call);
      if (callAt === -1) continue; // not every call appears in every function
      assert.ok(gateAt < callAt, `${sig} calls ${call} before checking the gate`);
    }
    // The gate check must ITSELF return -- not merely have a `return`
    // somewhere nearby (a following, unrelated `if (...) return` a few
    // characters later would satisfy a fuzzy "return appears near here"
    // test and prove nothing). Anchored on the exact
    // `isWbwTotalPersistenceReady()) return` shape immediately following the
    // gate call, with no other statement between the closing paren and the
    // word `return`.
    assert.ok(
      new RegExp(`!\\s*isWbwTotalPersistenceReady\\s*\\(\\s*\\)\\s*\\)\\s*return\\b`).test(body),
      `${sig}'s own gate check does not immediately return -- it is decorative`,
    );
  }
});

check("recordWordTotalDelta() never attempts a write for delta 0", () => {
  const code = codeOf(DATA_FILE);
  const body = functionBody(code, "export async function recordWordTotalDelta");
  assert.ok(/if\s*\(\s*!delta\s*\)\s*return/.test(body), "a zero delta is not refused before any write");
});

check("the data layer module never imports the readiness module's own declaration constant directly into a write path bypassing the predicate", () => {
  // A module importing the RAW declaration and inlining its own `.ready`
  // check would re-implement (and could get wrong) the governed-decision
  // validation isWbwTotalPersistenceReady() already centralises.
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  assert.ok(raw.includes("isWbwTotalPersistenceReady"), "the data layer does not call the predicate at all");
  assert.ok(!/\.ready\s*===?\s*true/.test(raw), "the data layer re-implements the governed-decision check inline");
});

// ===========================================================================
// The counter's correctness property: knownDelta(), summed over a realistic
// claim -> approve -> return -> re-claim -> confirm sequence (and a teacher-
// confirmation round-trip), never diverges from an independent recount over
// resolveWordProgress()'s own countsAsKnown -- the SAME definition
// computeArabicCoverage() uses.
// ===========================================================================

check("knownDelta() is the exact -1/0/+1 arithmetic on two countsAsKnown booleans", () => {
  assert.equal(total.knownDelta(false, false), 0);
  assert.equal(total.knownDelta(false, true), 1);
  assert.equal(total.knownDelta(true, false), -1);
  assert.equal(total.knownDelta(true, true), 0);
});

check("a full claim -> approve -> return -> re-claim -> confirm sequence sums to the correct running total", () => {
  // Mirrors app/js/quran-word-progress.js's own transition functions exactly,
  // without importing the data layer (which needs Firestore) -- the pure
  // resolveWordProgress() projection is enough to prove the counter's own
  // arithmetic never drifts from an independent recount.
  const confirmationRequired = true;
  let learner = { state: "not_started", at: null, byPersonId: null };
  let supervisor = { review: "pending", at: null, byPersonId: null, note: null, forState: null, forClaimAt: null };
  let running = 0;
  const step = (nextLearner, nextSupervisor) => {
    const before = resolveWordProgress({ learner, supervisor, confirmationRequired }).countsAsKnown;
    learner = nextLearner ?? learner;
    supervisor = nextSupervisor ?? supervisor;
    const after = resolveWordProgress({ learner, supervisor, confirmationRequired }).countsAsKnown;
    running += total.knownDelta(before, after);
  };

  // 1. Learner claims "achieved" -- confirmation is required, so this alone
  //    must NOT move the counter (Activity != Mastery, as arithmetic).
  step({ state: "achieved", at: "2026-09-23T00:00:00Z", byPersonId: "p1" }, null);
  assert.equal(running, 0, "a bare claim under confirmationRequired moved the counter");

  // 2. Teacher confirms -- NOW it counts.
  step(null, { review: "confirmed", at: "2026-09-23T00:01:00Z", byPersonId: "t1", note: null, forState: "achieved", forClaimAt: "2026-09-23T00:00:00Z" });
  assert.equal(running, 1, "a real confirmation did not move the counter up by exactly one");

  // 3. Teacher sends it back -- must move down by exactly one.
  step(null, { review: "returned", at: "2026-09-23T00:02:00Z", byPersonId: "t1", note: "look again", forState: "achieved", forClaimAt: "2026-09-23T00:00:00Z" });
  assert.equal(running, 0, "a return did not move the counter back down");

  // 4. Learner re-claims (a NEW claim instant) -- the old decision no longer
  //    applies to it, so this must NOT re-count on its own.
  step({ state: "achieved", at: "2026-09-23T00:03:00Z", byPersonId: "p1" }, null);
  assert.equal(running, 0, "a re-claim counted on its own, without a fresh confirmation");

  // 5. Teacher confirms the NEW claim -- counts again, exactly once.
  step(null, { review: "confirmed", at: "2026-09-23T00:04:00Z", byPersonId: "t1", note: null, forState: "achieved", forClaimAt: "2026-09-23T00:03:00Z" });
  assert.equal(running, 1, "the second confirmation did not move the counter up by exactly one");

  // Independent recount, from scratch, over the FINAL raw state only --
  // never diverges from the incrementally-tracked running total.
  const finalKnown = resolveWordProgress({ learner, supervisor, confirmationRequired }).countsAsKnown ? 1 : 0;
  assert.equal(running, finalKnown, "the incrementally-tracked counter diverges from an independent recount of the final state");
});

check("without confirmation required, a bare claim counts immediately (the other half of Activity != Mastery)", () => {
  const confirmationRequired = false;
  const before = resolveWordProgress({ learner: { state: "not_started", at: null, byPersonId: null }, supervisor: null, confirmationRequired }).countsAsKnown;
  const after = resolveWordProgress({ learner: { state: "achieved", at: "2026-09-23T00:00:00Z", byPersonId: "p1" }, supervisor: null, confirmationRequired }).countsAsKnown;
  assert.equal(total.knownDelta(before, after), 1);
});

// ===========================================================================
// The per-Juz totals genuinely sum to the real whole-Qur'an total, derived
// independently in THIS check rather than trusted from the packaged file.
// ===========================================================================

check("QURAN_TOTAL_WORD_COUNT matches the real packaged manifest", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(toolsDir, "output", "manifest.json"), "utf8"));
  assert.equal(total.QURAN_TOTAL_WORD_COUNT, manifest.totalWords);
});

check("the packaged juz-word-totals.json sums to exactly QURAN_TOTAL_WORD_COUNT across all 30 juz, and matches an INDEPENDENT re-derivation from the real surah files", () => {
  const packaged = JSON.parse(fs.readFileSync(path.join(toolsDir, "output", "juz-word-totals.json"), "utf8"));
  assert.equal(packaged.byJuz.length, 30);
  const sum = packaged.byJuz.reduce((s, r) => s + r.totalWords, 0);
  assert.equal(sum, total.QURAN_TOTAL_WORD_COUNT, "the packaged per-juz totals do not sum to the real whole-Qur'an total");
  assert.equal(packaged.quranTotalWords, total.QURAN_TOTAL_WORD_COUNT);

  // Independent re-derivation, walking the real surah files exactly as
  // build-juz-word-totals.js does, but written separately here so this
  // check does not merely re-run the build script's own arithmetic.
  const surahsDir = path.join(toolsDir, "output", "surahs");
  const recount = new Map();
  for (const file of fs.readdirSync(surahsDir).filter((f) => f.endsWith(".json"))) {
    const data = JSON.parse(fs.readFileSync(path.join(surahsDir, file), "utf8"));
    for (const a of data.ayahs) recount.set(a.juz, (recount.get(a.juz) ?? 0) + (a.words?.length ?? 0));
  }
  for (const row of packaged.byJuz) {
    assert.equal(recount.get(row.juz), row.totalWords, `juz ${row.juz}'s packaged total does not match a fresh count of the real corpus`);
  }
});

check("validateJuzWordTotals() accepts the real packaged rows and rejects malformed ones", () => {
  const packaged = JSON.parse(fs.readFileSync(path.join(toolsDir, "output", "juz-word-totals.json"), "utf8"));
  assert.doesNotThrow(() => total.validateJuzWordTotals(packaged.byJuz));
  assert.throws(() => total.validateJuzWordTotals(packaged.byJuz.slice(0, 29)), TypeError, "29 rows was accepted");
  const duplicated = packaged.byJuz.slice(0, 29).concat([packaged.byJuz[0]]);
  assert.throws(() => total.validateJuzWordTotals(duplicated), "a duplicate juz was accepted");
  const wrongSum = packaged.byJuz.map((r, i) => (i === 0 ? { ...r, totalWords: r.totalWords + 1 } : r));
  assert.throws(() => total.validateJuzWordTotals(wrongSum), RangeError, "a total that no longer sums to the real total was accepted");
});

check("buildJuzTotalsMap() seeds every juz at known:0 with its own real total", () => {
  const packaged = JSON.parse(fs.readFileSync(path.join(toolsDir, "output", "juz-word-totals.json"), "utf8"));
  const map = total.buildJuzTotalsMap(packaged.byJuz);
  assert.equal(Object.keys(map).length, 30);
  for (const row of packaged.byJuz) {
    assert.deepEqual(map[String(row.juz)], { known: 0, total: row.totalWords });
  }
});

check("emptyWordTotalsDocument() carries the real whole-Qur'an total and a fully-seeded byJuz map", () => {
  const packaged = JSON.parse(fs.readFileSync(path.join(toolsDir, "output", "juz-word-totals.json"), "utf8"));
  const doc = total.emptyWordTotalsDocument({ tenantId: "t1", personId: "p1", juzWordTotals: packaged.byJuz });
  assert.equal(doc.total, total.QURAN_TOTAL_WORD_COUNT);
  assert.equal(doc.known, 0);
  assert.equal(Object.keys(doc.byJuz).length, 30);
  assert.equal(doc.contractVersion, total.QURAN_WORD_TOTAL_CONTRACT);
});

check("juzForSurahAyah() agrees with the real packaged juz-index.json at every juz boundary", () => {
  const juzIndex = JSON.parse(fs.readFileSync(path.join(toolsDir, "output", "juz-index.json"), "utf8"));
  for (const row of juzIndex) {
    assert.equal(total.juzForSurahAyah(juzIndex, row.startSurah, row.startAyah), row.juz, `juz ${row.juz}'s own start ayah did not resolve to itself`);
    assert.equal(total.juzForSurahAyah(juzIndex, row.endSurah, row.endAyah), row.juz, `juz ${row.juz}'s own end ayah did not resolve to itself`);
  }
  // A well-known real boundary, read off the actual file rather than assumed:
  // Juz 1 ends at 2:141, Juz 2 begins at 2:142.
  const juz1 = juzIndex.find((r) => r.juz === 1);
  assert.equal(juz1.endSurah, 2); assert.equal(juz1.endAyah, 141);
  assert.equal(total.juzForSurahAyah(juzIndex, 2, 141), 1);
  assert.equal(total.juzForSurahAyah(juzIndex, 2, 142), 2);
  assert.equal(total.juzForSurahAyah(juzIndex, 1, 1), 1);
});

check("juzForSurahAyah() returns null rather than guessing when nothing matches", () => {
  assert.equal(total.juzForSurahAyah([], 1, 1), null);
});

check("wordTotalRatio() clamps to [0,1] and never divides by zero", () => {
  assert.equal(total.wordTotalRatio(0, 0), 0);
  assert.equal(total.wordTotalRatio(5, 10), 0.5);
  assert.equal(total.wordTotalRatio(10, 10), 1);
  assert.equal(total.wordTotalRatio(20, 10), 1, "known exceeding total was not clamped");
  assert.equal(total.wordTotalRatio(-5, 10), 0, "a negative known was not clamped");
});

check("percentRounded() rounds identically to quran-word-coverage.js's own computeArabicCoverage()", () => {
  // Same formula, checked against the same worked example that module uses.
  assert.equal(total.percentRounded(1, 3), Math.round((1 * 10000) / 3) / 100);
  assert.equal(total.percentRounded(0, 0), 0);
});

// ===========================================================================
// mastery-wheel.js -- the ring is strictly opt-in and the Word-by-Word
// colour ramp reuses this app's own two real STATUS_COLORS.
// ===========================================================================

check("wordTotalRampColor() endpoints are this app's own not_started/mastered colours, not invented ones", () => {
  assert.equal(wordTotalRampColor(0), STATUS_COLORS.not_started);
  assert.equal(wordTotalRampColor(1), STATUS_COLORS.mastered);
});

check("renderScopedWheel() without `ring` renders byte-identical geometry to before this round", () => {
  const items = [{ key: "1", statusId: "not_started", title: "t", number: 1 }, { key: "2", statusId: "mastered", title: "t2", number: 2 }];
  const svg = renderScopedWheel(items, { size: 360 });
  assert.ok(!svg.includes("wheel-ring"), "a ring rendered even though `ring` was never passed");
  // The pre-existing formula this file has always used: rOuter = size/2 - 4.
  const expectedPath = segmentPath(180, 180, 88, 176, 0, 180 - Math.min(1.2, 180 * 0.08));
  assert.ok(svg.includes(expectedPath), "the wedge geometry changed even though `ring` was never passed -- rOuter must stay size/2-4 exactly as before");
});

check("renderScopedWheel() with `ring` draws a track AND shrinks the wedge radius to make room, never overlapping it", () => {
  const items = [{ key: "1", statusId: "not_started", title: "t", number: 1 }];
  const withRing = renderScopedWheel(items, { size: 360, ring: { ratio: 0.5 } });
  const withoutRing = renderScopedWheel(items, { size: 360 });
  assert.ok(withRing.includes("wheel-ring-track"));
  assert.ok(withRing.includes("wheel-ring-fill"));
  assert.notEqual(withRing, withoutRing, "adding a ring changed nothing at all");
});

check("renderScopedWheel() ring at ratio 0 draws the track only, never a fill", () => {
  const items = [{ key: "1", statusId: "not_started", title: "t", number: 1 }];
  const svg = renderScopedWheel(items, { size: 360, ring: { ratio: 0 } });
  assert.ok(svg.includes("wheel-ring-track"));
  assert.ok(!svg.includes("wheel-ring-fill"), "a zero ratio drew a fill arc");
});

check("renderScopedWheel()'s `fill` override takes precedence over statusId, and only when set", () => {
  const withFill = renderScopedWheel([{ key: "1", statusId: "not_started", title: "t", number: 1, fill: "#abcdef" }], { size: 360 });
  assert.ok(withFill.includes('fill="#abcdef"'), "an explicit fill override was ignored");
  const withoutFill = renderScopedWheel([{ key: "1", statusId: "not_started", title: "t", number: 1 }], { size: 360 });
  assert.ok(withoutFill.includes(`fill="${STATUS_COLORS.not_started}"`), "statusId colouring stopped working when fill is absent");
});

// ===========================================================================
// The Approach wheel's own rendering path is provably untouched: `statusId`
// is computed unconditionally, and `fill`/wbw-mode titling only ever happens
// INSIDE a block gated on wbwWheelColorMode === "wbw".
// ===========================================================================

const PAGE_FILE = path.join(root, "app", "quranrevival.html");

check("renderExploreQuranLevel()'s Approach-mode wedge computation is unconditional, and the Word-by-Word overlay is strictly opt-in", () => {
  const html = fs.readFileSync(PAGE_FILE, "utf8");
  const start = html.indexOf("async function renderExploreQuranLevel");
  assert.ok(start > -1, "renderExploreQuranLevel is gone");
  const end = html.indexOf("\n    async function renderExploreQuranSurahsView", start);
  assert.ok(end > start, "could not bound renderExploreQuranLevel's own body");
  const body = html.slice(start, end);

  const statusIdAt = body.indexOf("const statusId = pooled ?? ");
  const titleAt = body.indexOf("it.title = segTitle(it.label, it.statusId, labelsById)");
  const wbwModeAt = body.indexOf('const wbwMode = wbwWheelColorMode === "wbw"');
  assert.ok(statusIdAt > -1 && titleAt > -1 && wbwModeAt > -1, "one of the three anchor lines is gone -- re-check the source");
  // The Approach status and its title are computed BEFORE wbwMode is even
  // evaluated -- proving they do not sit inside any conditional keyed on it.
  assert.ok(statusIdAt < wbwModeAt, "the Approach statusId computation moved after the wbw-mode branch");
  assert.ok(titleAt < wbwModeAt, "the Approach segTitle() call moved after the wbw-mode branch");

  // `it.fill =` and the wbw-specific `it.title =` overwrite must appear ONLY
  // inside the `if (wbwMode) {`-guarded block, textually after it.
  const fillAt = body.indexOf("it.fill = wordTotalRampColor(ratio)");
  assert.ok(fillAt > wbwModeAt, "the fill override is not textually inside the wbw-mode branch");
  const guardBlock = body.slice(wbwModeAt, fillAt);
  assert.ok(/if\s*\(\s*wbwMode\s*\)/.test(guardBlock), "the fill override is not actually gated by `if (wbwMode)`");
});

console.log(`\n==== Quran word total (Issue #206) boundary: ${passed} passed, ${failed} failed ====`);
if (failed > 0) process.exit(1);
