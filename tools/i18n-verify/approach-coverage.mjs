// Issue #328 -- pure suite for approach-coverage.js: the per-Approach
// "counts for each ayah inside" setting (Owner decision 6, 27 Sep 2026), the
// shared floor/pooling core Explore's poolCoverageStatus()/
// effectiveAyahStatus() and the whole-Qur'an "My Status" wheel both call,
// and the whole-Qur'an ayah tally itself. No Firebase, no DOM -- every
// exported function here is pure.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  QURAN_TOTAL_AYAH_COUNT, WBW_TRACKABLE_ID, RAMP_ORDER, DEFAULT_YES_TRACKABLE_IDS,
  countsForEachAyah, floorStatus, effectiveStatus, ayahCoverage, spanForUnitKey,
  tallyWideClaimsByUnitType, summarizeApproachAyahCoverage, achievedOrMasteredRatio, poolStatus,
} from "../../app/js/approach-coverage.js";

const root = path.resolve(process.argv[2] || process.cwd());

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

// ===========================================================================
// countsForEachAyah() -- the setting itself, Owner decision 6.
// ===========================================================================

check("constants: 6,236 ayat, 30 Approaches' worth of RAMP_ORDER, WbW is approach_04", () => {
  assert.equal(QURAN_TOTAL_AYAH_COUNT, 6236);
  assert.equal(WBW_TRACKABLE_ID, "approach_04");
  assert.deepEqual(RAMP_ORDER, ["not_started", "learning", "practising", "achieved", "mastered"]);
});

check("the default Yes list is exactly the eight Approaches the Architect named", () => {
  assert.deepEqual(
    [...DEFAULT_YES_TRACKABLE_IDS].sort(),
    ["approach_01", "approach_02", "approach_03", "approach_04", "approach_05", "approach_07", "approach_08", "approach_11"].sort()
  );
});

check("countsForEachAyah(): a Yes-listed Approach with no stored field reads Yes", () => {
  assert.equal(countsForEachAyah({ id: "approach_02" }), true); // Hifz
});

check("countsForEachAyah(): an unlisted Approach with no stored field reads No", () => {
  assert.equal(countsForEachAyah({ id: "approach_06" }), false);
});

check("countsForEachAyah(): a module 'Studied' trackable (no approach_NN id at all) reads No", () => {
  assert.equal(countsForEachAyah({ id: "studied_health" }), false);
});

check("countsForEachAyah(): a stored field OVERRIDES the default in both directions", () => {
  assert.equal(countsForEachAyah({ id: "approach_02", countsForEachAyah: false }), false, "Yes-by-default moved to No");
  assert.equal(countsForEachAyah({ id: "approach_06", countsForEachAyah: true }), true, "No-by-default moved to Yes");
});

check("countsForEachAyah(): a non-boolean stored value (e.g. a stale string) is NOT trusted -- falls back to the default", () => {
  assert.equal(countsForEachAyah({ id: "approach_02", countsForEachAyah: "false" }), true);
});

check("countsForEachAyah(): a null/undefined trackable reads No, never throws", () => {
  assert.equal(countsForEachAyah(null), false);
  assert.equal(countsForEachAyah(undefined), false);
});

// ===========================================================================
// floorStatus() / effectiveStatus() -- the per-ayah rule.
// ===========================================================================

const YES = { id: "approach_02" }; // Hifz, Yes by default
const NO = { id: "approach_06" }; // No by default

check("floorStatus(): Not Applicable wins outright, never floored by a higher span", () => {
  assert.equal(floorStatus("not_applicable", [{ surah: 1, from: 1, to: 5, statusId: "mastered" }], 1, 3), "not_applicable");
});

check("floorStatus(): a wider span raises a lower own claim, never lowers a higher one", () => {
  assert.equal(floorStatus("not_started", [{ surah: 1, from: 1, to: 5, statusId: "achieved" }], 1, 3), "achieved");
  assert.equal(floorStatus("mastered", [{ surah: 1, from: 1, to: 5, statusId: "learning" }], 1, 3), "mastered");
});

check("floorStatus(): a span outside this ayah's own (surah, ayah) does not apply", () => {
  assert.equal(floorStatus("not_started", [{ surah: 1, from: 1, to: 2, statusId: "achieved" }], 1, 3), "not_started");
  assert.equal(floorStatus("not_started", [{ surah: 2, from: 1, to: 5, statusId: "achieved" }], 1, 3), "not_started");
});

check("effectiveStatus(): a Yes Approach floors an ayah under a wider span", () => {
  const spans = [{ surah: 1, from: 1, to: 5, statusId: "achieved" }];
  assert.equal(effectiveStatus({ own: "not_started", spans, surah: 1, ayah: 2, trackable: YES }), "achieved");
});

check("effectiveStatus(): a No Approach shows only its own claim -- the wider span is never consulted (Owner decision 6)", () => {
  const spans = [{ surah: 1, from: 1, to: 5, statusId: "achieved" }];
  assert.equal(effectiveStatus({ own: "not_started", spans, surah: 1, ayah: 2, trackable: NO }), "not_started");
  assert.equal(effectiveStatus({ own: "learning", spans, surah: 1, ayah: 2, trackable: NO }), "learning");
});

check("effectiveStatus(): Not Applicable wins outright regardless of the Yes/No setting", () => {
  const spans = [{ surah: 1, from: 1, to: 5, statusId: "mastered" }];
  assert.equal(effectiveStatus({ own: "not_applicable", spans, surah: 1, ayah: 2, trackable: YES }), "not_applicable");
  assert.equal(effectiveStatus({ own: "not_applicable", spans, surah: 1, ayah: 2, trackable: NO }), "not_applicable");
});

// ===========================================================================
// ayahCoverage() / spanForUnitKey() -- resolving a wider claim's own extent,
// from bundled indexes only, identically for Explore and "My Status".
// ===========================================================================

const FIXTURE_SURAH_INDEX = [
  { surahNumber: 1, ayahCount: 3 },
  { surahNumber: 2, ayahCount: 4 },
  { surahNumber: 3, ayahCount: 2 },
];
const FIXTURE_JUZ_INDEX = [
  { juz: 1, startSurah: 1, startAyah: 2, endSurah: 2, endAyah: 3 },
];
const FIXTURE_PAGE_INDEX = [
  { page: 12, startSurah: 2, startAyah: 1, endSurah: 3, endAyah: 1 },
];

check("ayahCoverage(): a boundary spanning three surahs covers each one's own real range", () => {
  const cov = ayahCoverage(1, 2, 3, 1, FIXTURE_SURAH_INDEX);
  assert.deepEqual(cov, [
    { surah: 1, from: 2, to: 3 },
    { surah: 2, from: 1, to: 4 },
    { surah: 3, from: 1, to: 1 },
  ]);
});

check("ayahCoverage(): a boundary within one surah is a single range", () => {
  assert.deepEqual(ayahCoverage(2, 1, 2, 3, FIXTURE_SURAH_INDEX), [{ surah: 2, from: 1, to: 3 }]);
});

const LOOKUPS = { surahIndex: FIXTURE_SURAH_INDEX, juzIndexData: FIXTURE_JUZ_INDEX, pageIndexData: FIXTURE_PAGE_INDEX };

check("spanForUnitKey(): surah:N is that surah's own full range", () => {
  assert.deepEqual(spanForUnitKey("surah:2", LOOKUPS), [{ surah: 2, from: 1, to: 4 }]);
});

check("spanForUnitKey(): range:N:from-to is exactly that slice", () => {
  assert.deepEqual(spanForUnitKey("range:2:2-3", LOOKUPS), [{ surah: 2, from: 2, to: 3 }]);
});

check("spanForUnitKey(): juz:N resolves through the juz index and ayahCoverage()", () => {
  assert.deepEqual(spanForUnitKey("juz:1", LOOKUPS), [{ surah: 1, from: 2, to: 3 }, { surah: 2, from: 1, to: 3 }]);
});

check("spanForUnitKey(): page:<edition>:N resolves through the page index", () => {
  assert.deepEqual(spanForUnitKey("page:madani:12", LOOKUPS), [{ surah: 2, from: 1, to: 4 }, { surah: 3, from: 1, to: 1 }]);
});

check("spanForUnitKey(): ruku:N:idx resolves through the caller's own per-surah ranges", () => {
  const rukuRangesBySurah = new Map([[2, new Map([[1, { from: 1, to: 2 }]])]]);
  assert.deepEqual(spanForUnitKey("ruku:2:1", { ...LOOKUPS, rukuRangesBySurah }), [{ surah: 2, from: 1, to: 2 }]);
});

check("spanForUnitKey(): hizb:N resolves through the caller's own hizb index", () => {
  const hizbIndex = [{ hizb: 5, startSurah: 1, startAyah: 1, endSurah: 1, endAyah: 2 }];
  assert.deepEqual(spanForUnitKey("hizb:5", { ...LOOKUPS, hizbIndex }), [{ surah: 1, from: 1, to: 2 }]);
});

check("spanForUnitKey(): an unresolvable reference (missing index row) returns [] rather than throwing", () => {
  assert.deepEqual(spanForUnitKey("juz:99", LOOKUPS), []);
  assert.deepEqual(spanForUnitKey("page:madani:999", LOOKUPS), []);
  assert.deepEqual(spanForUnitKey("ruku:1:1", LOOKUPS), []); // no rukuRangesBySurah supplied at all
  assert.deepEqual(spanForUnitKey("hizb:1", LOOKUPS), []); // no hizbIndex supplied at all
});

check("spanForUnitKey(): an ayah:/name: key (never a wider unit) returns []", () => {
  assert.deepEqual(spanForUnitKey("ayah:1:1", LOOKUPS), []);
  assert.deepEqual(spanForUnitKey("name:5", LOOKUPS), []);
});

// ===========================================================================
// poolStatus() -- the "weakest link" pooling core Explore's
// poolCoverageStatus() and My Status's Juz strip both call.
// ===========================================================================

check("poolStatus(): a No Approach never pools at all -- null immediately, whatever the ayahs hold", () => {
  const ownStatus = () => "mastered";
  assert.equal(poolStatus([{ surah: 1, from: 1, to: 3 }], { ownStatus, spans: [], trackable: NO }), null);
});

check("poolStatus(): a Yes Approach pools the WORST status across the coverage", () => {
  const statuses = { "1:1": "mastered", "1:2": "learning", "1:3": "achieved" };
  const ownStatus = (surah, ayah) => statuses[`${surah}:${ayah}`] ?? "not_started";
  assert.equal(poolStatus([{ surah: 1, from: 1, to: 3 }], { ownStatus, spans: [], trackable: YES }), "learning");
});

check("poolStatus(): Not Applicable ayahs are excluded from the pool, not counted as a low score (I7)", () => {
  const statuses = { "1:1": "not_applicable", "1:2": "mastered" };
  const ownStatus = (surah, ayah) => statuses[`${surah}:${ayah}`] ?? "not_started";
  assert.equal(poolStatus([{ surah: 1, from: 1, to: 2 }], { ownStatus, spans: [], trackable: YES }), "mastered");
});

check("poolStatus(): every ayah Not Applicable pools to null -- the caller falls back to a direct claim", () => {
  const ownStatus = () => "not_applicable";
  assert.equal(poolStatus([{ surah: 1, from: 1, to: 2 }], { ownStatus, spans: [], trackable: YES }), null);
});

check("poolStatus(): a wider span still floors the pooled ayahs for a Yes Approach", () => {
  const ownStatus = () => "not_started";
  const spans = [{ surah: 1, from: 1, to: 2, statusId: "achieved" }];
  assert.equal(poolStatus([{ surah: 1, from: 1, to: 2 }], { ownStatus, spans, trackable: YES }), "achieved");
});

// The agreement guarantee (Owner decision 7): Explore's own poolCoverageStatus()
// and "My Status"'s own Juz strip are two DIFFERENT callers -- one sources
// `ownStatus` from per-surah chunk objects (Explore's shape), the other from
// a flat whole-person Map (My Status's shape) -- computed here from the SAME
// underlying claims, proving the two cannot disagree.
check("poolStatus(): Explore's own per-surah-chunk shape and My Status's own whole-person-map shape agree, from one fixture", () => {
  const claims = { "1:1": "learning", "1:2": "mastered", "2:1": "achieved" };

  // Explore's own shape: a Map(surahNum -> {entries: {"ayah:S:A::id": {claimedStatus}}}).
  const chunksBySurah = new Map();
  for (const [key, statusId] of Object.entries(claims)) {
    const [surah, ayah] = key.split(":").map(Number);
    if (!chunksBySurah.has(surah)) chunksBySurah.set(surah, { entries: {} });
    chunksBySurah.get(surah).entries[`ayah:${surah}:${ayah}::approach_02`] = { claimedStatus: statusId };
  }
  const exploreOwnStatus = (surah, ayah) =>
    chunksBySurah.get(surah)?.entries?.[`ayah:${surah}:${ayah}::approach_02`]?.claimedStatus ?? "not_started";

  // My Status's own shape: a flat Map("surah:ayah" -> statusId).
  const ownAyahStatuses = new Map(Object.entries(claims));
  const myStatusOwnStatus = (surah, ayah) => ownAyahStatuses.get(`${surah}:${ayah}`) ?? "not_started";

  const coverage = [{ surah: 1, from: 1, to: 2 }, { surah: 2, from: 1, to: 1 }];
  const fromExplore = poolStatus(coverage, { ownStatus: exploreOwnStatus, spans: [], trackable: YES });
  const fromMyStatus = poolStatus(coverage, { ownStatus: myStatusOwnStatus, spans: [], trackable: YES });
  assert.equal(fromExplore, fromMyStatus);
  assert.equal(fromExplore, "learning"); // the worst of learning/mastered/achieved
});

// ===========================================================================
// tallyWideClaimsByUnitType() -- the No-Approach "studied as a whole" tally.
// ===========================================================================

check("tallyWideClaimsByUnitType(): counts distinct claims per unit type, Not Applicable and not_started excluded", () => {
  const entries = [
    { unitType: "surah", statusId: "achieved" },
    { unitType: "surah", statusId: "mastered" },
    { unitType: "surah", statusId: "not_applicable" },
    { unitType: "juz", statusId: "learning" },
    { unitType: "surah", statusId: "not_started" },
  ];
  assert.deepEqual(tallyWideClaimsByUnitType(entries), { surah: 2, juz: 1 });
});

check("tallyWideClaimsByUnitType(): no wide entries at all is an empty object, not an error", () => {
  assert.deepEqual(tallyWideClaimsByUnitType([]), {});
  assert.deepEqual(tallyWideClaimsByUnitType(undefined), {});
});

// ===========================================================================
// summarizeApproachAyahCoverage() -- the whole-Qur'an tally "My Status"'s
// own headline is built from, Yes vs No for a Surah/Juz/page claim, I7, and
// the Achieved+Mastered headline (Owner decision 8).
// ===========================================================================

// A tiny 9-ayah "Qur'an": surah 1 (3 ayat), surah 2 (4 ayat), surah 3 (2 ayat).
const SURAH_AYAH_COUNTS = FIXTURE_SURAH_INDEX.map((s) => ({ surahNumber: s.surahNumber, ayahCount: s.ayahCount }));

function surahClaimSpans(surah, statusId) {
  const count = FIXTURE_SURAH_INDEX.find((s) => s.surahNumber === surah).ayahCount;
  return [{ surah, from: 1, to: count, statusId }];
}

check("summarizeApproachAyahCoverage(): a Surah claim floors every ayah inside it for a YES Approach", () => {
  const summary = summarizeApproachAyahCoverage({
    trackable: YES,
    surahAyahCounts: SURAH_AYAH_COUNTS,
    ownAyahStatusesBySurahAyah: new Map(),
    wideSpans: surahClaimSpans(2, "achieved"),
    wideClaimsByUnitType: { surah: 1 },
  });
  assert.equal(summary.countsForEachAyah, true);
  assert.equal(summary.counts.achieved, 4, "all 4 ayat of surah 2 should read achieved");
  assert.equal(summary.counts.not_started, 5, "surahs 1 and 3's 5 ayat are untouched");
  assert.equal(summary.studiedAsWhole, null, "a Yes summary never carries a studiedAsWhole tally");
});

check("summarizeApproachAyahCoverage(): the SAME Surah claim counts ONLY as a whole-unit claim for a NO Approach (Owner decision 6)", () => {
  const summary = summarizeApproachAyahCoverage({
    trackable: NO,
    surahAyahCounts: SURAH_AYAH_COUNTS,
    ownAyahStatusesBySurahAyah: new Map(),
    wideSpans: surahClaimSpans(2, "achieved"),
    wideClaimsByUnitType: { surah: 1 },
  });
  assert.equal(summary.countsForEachAyah, false);
  assert.equal(summary.counts.achieved, 0, "the Surah claim must NOT floor any ayah for a No Approach");
  assert.equal(summary.counts.not_started, 9, "every ayah reads not_started -- none was ever claimed directly");
  assert.deepEqual(summary.studiedAsWhole, { surah: 1 });
});

check("summarizeApproachAyahCoverage(): a Juz claim (spanning two surahs) floors exactly the ayat it covers, for YES", () => {
  const juzSpans = spanForUnitKey("juz:1", LOOKUPS).map((s) => ({ ...s, statusId: "mastered" }));
  const summary = summarizeApproachAyahCoverage({
    trackable: YES,
    surahAyahCounts: SURAH_AYAH_COUNTS,
    ownAyahStatusesBySurahAyah: new Map(),
    wideSpans: juzSpans,
    wideClaimsByUnitType: { juz: 1 },
  });
  // juz:1 covers surah 1 ayat 2-3 (2 ayat) and surah 2 ayat 1-3 (3 ayat) = 5 ayat.
  assert.equal(summary.counts.mastered, 5);
  assert.equal(summary.counts.not_started, 4);
});

check("summarizeApproachAyahCoverage(): the same Juz claim is 'studied as a whole' only, for NO", () => {
  const juzSpans = spanForUnitKey("juz:1", LOOKUPS).map((s) => ({ ...s, statusId: "mastered" }));
  const summary = summarizeApproachAyahCoverage({
    trackable: NO,
    surahAyahCounts: SURAH_AYAH_COUNTS,
    ownAyahStatusesBySurahAyah: new Map(),
    wideSpans: juzSpans,
    wideClaimsByUnitType: { juz: 1 },
  });
  assert.equal(summary.counts.mastered, 0);
  assert.equal(summary.counts.not_started, 9);
  assert.deepEqual(summary.studiedAsWhole, { juz: 1 });
});

check("summarizeApproachAyahCoverage(): a page claim floors exactly the ayat it covers, for YES; is 'studied as a whole' for NO", () => {
  const pageSpans = spanForUnitKey("page:madani:12", LOOKUPS).map((s) => ({ ...s, statusId: "practising" }));
  const yesSummary = summarizeApproachAyahCoverage({
    trackable: YES, surahAyahCounts: SURAH_AYAH_COUNTS, ownAyahStatusesBySurahAyah: new Map(),
    wideSpans: pageSpans, wideClaimsByUnitType: { page: 1 },
  });
  // page:madani:12 covers surah 2 (4 ayat) + surah 3 (1 ayah) = 5 ayat.
  assert.equal(yesSummary.counts.practising, 5);
  const noSummary = summarizeApproachAyahCoverage({
    trackable: NO, surahAyahCounts: SURAH_AYAH_COUNTS, ownAyahStatusesBySurahAyah: new Map(),
    wideSpans: pageSpans, wideClaimsByUnitType: { page: 1 },
  });
  assert.equal(noSummary.counts.practising, 0);
  assert.deepEqual(noSummary.studiedAsWhole, { page: 1 });
});

check("summarizeApproachAyahCoverage(): Not Applicable ayat are excluded from countedTotal, not counted as zero (I7)", () => {
  const own = new Map([["1:1", "not_applicable"], ["1:2", "learning"]]);
  const summary = summarizeApproachAyahCoverage({
    trackable: YES, surahAyahCounts: SURAH_AYAH_COUNTS, ownAyahStatusesBySurahAyah: own,
    wideSpans: [], wideClaimsByUnitType: {},
  });
  assert.equal(summary.excludedNotApplicable, 1);
  assert.equal(summary.countedTotal, 8, "9 fixture ayat minus the 1 excluded");
});

check("summarizeApproachAyahCoverage(): the headline is Achieved + Mastered, never Practising or Learning (Owner decision 8)", () => {
  const own = new Map([["1:1", "achieved"], ["1:2", "mastered"], ["1:3", "practising"], ["2:1", "learning"]]);
  const summary = summarizeApproachAyahCoverage({
    trackable: YES, surahAyahCounts: SURAH_AYAH_COUNTS, ownAyahStatusesBySurahAyah: own,
    wideSpans: [], wideClaimsByUnitType: {},
  });
  assert.equal(summary.achievedOrMastered, 2);
  assert.equal(achievedOrMasteredRatio(summary), 2 / 9);
});

check("achievedOrMasteredRatio(): 0 when nothing is countable yet, never NaN", () => {
  assert.equal(achievedOrMasteredRatio({ achievedOrMastered: 0, countedTotal: 0 }), 0);
  assert.equal(achievedOrMasteredRatio(undefined), 0);
});

// ===========================================================================
// Mutation-proven: flipping one Approach's own setting changes the counts,
// and nothing else's -- exactly the round's own "Prove it" requirement.
// ===========================================================================

check("MUTATION: flipping countsForEachAyah for one Approach changes ITS OWN counts and no other Approach's", () => {
  const claimSpans = surahClaimSpans(1, "mastered"); // surah 1, 3 ayat
  const build = (trackable) => summarizeApproachAyahCoverage({
    trackable, surahAyahCounts: SURAH_AYAH_COUNTS, ownAyahStatusesBySurahAyah: new Map(),
    wideSpans: claimSpans, wideClaimsByUnitType: { surah: 1 },
  });
  const before = build({ id: "approach_20", countsForEachAyah: false });
  const after = build({ id: "approach_20", countsForEachAyah: true });
  assert.notEqual(before.counts.mastered, after.counts.mastered, "the mutation must actually move the count");
  assert.equal(before.counts.mastered, 0);
  assert.equal(after.counts.mastered, 3);
  // A different Approach's own claims are untouched by this one's setting.
  const other = build({ id: "approach_21", countsForEachAyah: false });
  assert.equal(other.counts.mastered, 0);
});

// ===========================================================================
// approach-coverage.js's own real Yes/No default list agrees with the
// Owner's own decision 6 wording, read straight from the module's source --
// a hardcoded id list is a silent-drift hazard (CLAUDE.md's own standing
// lesson), so this pins the list against being edited without the reason
// being visible in the same diff.
// ===========================================================================

check("the module source states the Owner's decision 6 by name, not just by list", () => {
  const src = fs.readFileSync(path.join(root, "app", "js", "approach-coverage.js"), "utf8");
  assert.ok(src.includes("Owner decision 6"), "the module no longer cites the decision its own default list implements");
  assert.ok(src.includes("27 Sep 2026"), "the module no longer dates the decision it implements");
});

// ===========================================================================
// catalogue.js's setApproachCountsForEachAyah() -- writes only
// countsForEachAyah (+ updatedAt, stamped by updateDocument() itself) and
// never edited:true. Read as SOURCE rather than imported: the module
// imports the Firestore SDK by URL, the same technique
// quran-word-total-boundary.mjs already uses for its own impure sibling.
// ===========================================================================

function codeOf(absPath) {
  return fs.readFileSync(absPath, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((line) => !/^\s*\/\//.test(line.trim())).join("\n");
}

function functionBody(code, signature) {
  const start = code.indexOf(signature);
  assert.ok(start > -1, `${signature} is gone`);
  const after = code.indexOf("\nexport ", start + 1);
  return after === -1 ? code.slice(start) : code.slice(start, after);
}

check("setApproachCountsForEachAyah() writes only countsForEachAyah -- never edited:true", () => {
  const code = codeOf(path.join(root, "app", "js", "catalogue.js"));
  const body = functionBody(code, "export async function setApproachCountsForEachAyah(");
  assert.ok(body.includes("updateDocument("), "no longer uses the plain updateDocument() writer");
  assert.ok(!body.includes("editCatalogueNode("), "must never go through editCatalogueNode() -- that stamps edited:true");
  assert.ok(!body.includes("edited"), "must never write the edited flag itself");
  const dataArgMatch = body.match(/updateDocument\([^,]+,[^,]+,[^,]+,\s*\{([^}]*)\}/s);
  assert.ok(dataArgMatch, "could not find updateDocument()'s own data argument");
  const fields = [...dataArgMatch[1].matchAll(/(\w+)\s*:/g)].map((m) => m[1]);
  assert.deepEqual(fields, ["countsForEachAyah"], "the write must name exactly one field, countsForEachAyah");
});

check("MUTATION: a body that also wrote edited:true would be caught", () => {
  const mutated = `export async function setApproachCountsForEachAyah(db, tenantId, trackableId, value) {
  return updateDocument(db, TENANT.TRACKABLES, \`\${tenantId}__\${trackableId}\`, { countsForEachAyah: !!value, edited: true });
}
export async function other() {}`;
  let threw = false;
  try {
    const body = functionBody(mutated, "export async function setApproachCountsForEachAyah(");
    assert.ok(!body.includes("edited"), "must never write the edited flag itself");
  } catch { threw = true; }
  assert.ok(threw, "the mutated body (carrying edited:true) should have failed the assertion above");
});

console.log(`\n==== Approach coverage (issue #328) pure suite: ${passed} passed, ${failed} failed ====`);
if (failed > 0) process.exit(1);
