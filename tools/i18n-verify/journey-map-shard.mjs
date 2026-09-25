// Speed, part 5 (issue #282) -- journey-map-shard.js's own pure contract,
// executed with no Firebase, no emulator and no browser: the id-range split
// that lets journey-map-service.js page Mapping My Journey's three Note
// Foundation collections in PARALLEL rather than one long cursor chain.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

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

const { hexCuts, entityIdShardRanges, docIdRangeFor, IMPORT_KIND_CODE } =
  await import(pathToFileURL(path.join(root, "app/js/journey-map-shard.js")).href);
const { stableImportId } = await import(pathToFileURL(path.join(root, "app/js/notes-import-shared.js")).href);

check("POSITIVE CONTROL: the module really loaded (not silently empty)", () => {
  assert.equal(typeof hexCuts, "function", "hexCuts is missing from journey-map-shard.js");
  assert.equal(typeof entityIdShardRanges, "function", "entityIdShardRanges is missing from journey-map-shard.js");
  assert.equal(typeof docIdRangeFor, "function", "docIdRangeFor is missing from journey-map-shard.js");
  assert.ok(IMPORT_KIND_CODE && typeof IMPORT_KIND_CODE === "object", "IMPORT_KIND_CODE is missing from journey-map-shard.js");
});

// --- hexCuts -----------------------------------------------------------------
check("hexCuts(n) returns n distinct, ascending, in-alphabet cut characters", () => {
  for (const n of [1, 2, 3, 4, 8, 16]) {
    const cuts = hexCuts(n);
    assert.equal(cuts.length, n, `hexCuts(${n}) returned ${cuts.length} cuts`);
    assert.deepEqual(new Set(cuts).size, n, `hexCuts(${n}) produced a duplicate: ${cuts.join(",")}`);
    assert.deepEqual([...cuts].sort(), cuts, `hexCuts(${n}) is not ascending: ${cuts.join(",")}`);
    for (const c of cuts) assert.match(c, /^[0-9a-f]$/, `"${c}" is not a hex digit`);
  }
  assert.deepEqual(hexCuts(4), ["0", "4", "8", "c"]);
});
check("hexCuts() refuses a non-positive-integer count", () => {
  for (const bad of [0, -1, 1.5, "4"]) {
    assert.throws(() => hexCuts(bad), RangeError, `hexCuts(${JSON.stringify(bad)}) should have thrown`);
  }
});

// --- entityIdShardRanges -----------------------------------------------------
check("entityIdShardRanges() refuses fewer than 2 shards and an unknown kind", () => {
  assert.throws(() => entityIdShardRanges("folder", 1), RangeError);
  assert.throws(() => entityIdShardRanges("folder", 0), RangeError);
  assert.throws(() => entityIdShardRanges("bogus-kind-nobody-uses", 4), RangeError);
});
check("entityIdShardRanges() covers the WHOLE space with no gap and no overlap, for every known kind and several shard counts", () => {
  for (const kind of Object.keys(IMPORT_KIND_CODE)) {
    for (const count of [2, 3, 4, 8]) {
      const ranges = entityIdShardRanges(kind, count);
      assert.equal(ranges.length, count);
      assert.equal(ranges[0].gte, undefined, "the first shard must have no lower bound");
      assert.equal(ranges[ranges.length - 1].lt, undefined, "the last shard must have no upper bound");
      for (let i = 0; i < ranges.length - 1; i += 1) {
        assert.equal(ranges[i].lt, ranges[i + 1].gte,
          `shard ${i}'s upper bound and shard ${i + 1}'s lower bound must be the SAME string, or an id could fall through the gap between them or be counted by both`);
      }
    }
  }
});
check("entityIdShardRanges() splits the import block, not just the leading character -- the whole point of this file", () => {
  // Every "leading character" of every id an import mints in one collection
  // is IDENTICAL ("imp" + that collection's own fixed kind code) -- a naive
  // split on character 0 would put the Owner's whole real import in ONE
  // shard. Proven here: at least one boundary must fall STRICTLY INSIDE the
  // "imp<kindCode>" block (i.e. after its own 4-character header), not at
  // or before its start.
  for (const kind of Object.keys(IMPORT_KIND_CODE)) {
    const header = `imp${IMPORT_KIND_CODE[kind]}`;
    const ranges = entityIdShardRanges(kind, 4);
    const insideImportBlock = ranges.some((r) =>
      (r.gte !== undefined && r.gte.startsWith(header) && r.gte.length > header.length)
      || (r.lt !== undefined && r.lt.startsWith(header) && r.lt.length > header.length));
    assert.ok(insideImportBlock, `no shard boundary for "${kind}" falls inside its own "${header}" import block`);
  }
});
// realImportIds() -- the REAL shape a WordPress/Evernote import mints
// (wordpress-import-parser.js: `stableImportId("folder", c.termId)`,
// `stableImportId("note", item.postId)`; the placement id folds a pair of
// ids together). `rawKey` is therefore ordinarily a bare, small, sequential
// integer (a term/post id), not an artificial long shared-text prefix --
// tested at the Owner's real scale (issue #265/#267: 1,464 folders).
function realImportIds(kind, count) {
  return Array.from({ length: count }, (_, i) => stableImportId("wordpress-import", kind, String(i)));
}

check("every real id this codebase mints (both shapes) sorts into EXACTLY ONE shard, for every known kind", () => {
  // A plain UUID (newNoteEntityId()'s own shape -- 32 lowercase hex chars),
  // the two edges of the hex alphabet (all-"0"s, all-"f"s), and 1,464 real
  // imported ids (the Owner's own real folder count) -- a mixed, realistic
  // population, not a synthetic one built to flatter the split.
  const sampleUuid = "0123456789abcdef0123456789abcdef";
  for (const kind of Object.keys(IMPORT_KIND_CODE)) {
    const ranges = entityIdShardRanges(kind, 4);
    const ids = [sampleUuid, "f".repeat(32), "0".repeat(32), ...realImportIds(kind, 1464)];
    for (const id of ids) {
      const hits = ranges.filter((r) => (r.gte === undefined || id >= r.gte) && (r.lt === undefined || id < r.lt));
      assert.equal(hits.length, 1, `"${id}" (kind "${kind}") matched ${hits.length} shards, expected exactly 1`);
    }
  }
});
check("that split is EFFECTIVE at the Owner's real scale, not merely correct: 1,464 real imported ids spread across every IMPORT shard, none starved below 10% of an even split", () => {
  // Correctness (above) tolerates an uneven split; this is the actual
  // performance claim the whole module exists for. If the real import
  // clustered into one or two shards, sharding this collection would buy
  // little or nothing for the exact case issue #282 names.
  //
  // Shard 0 is DELIBERATELY excluded from this measurement: it is reserved
  // for the "before the import block" population (a plain UUID, whose own
  // leading character always sorts before "i" -- entityIdShardRanges()'s own
  // header). An Owner whose folders are ~100% imported (this test's own
  // population, and the Owner's real one) legitimately puts nothing there --
  // that is shard 0 correctly doing its OTHER job, not a starved import
  // shard. So a 4-shard config gives 3-way parallelism for an import-heavy
  // collection, not 4-way; still a real, measured win (a ~24-page placement
  // chain becomes ~3 chains of ~8), and it is the shape that stays correct
  // (never loses or duplicates a row) whichever population turns out to
  // dominate for a given owner.
  for (const kind of Object.keys(IMPORT_KIND_CODE)) {
    const shardCount = 4;
    const ranges = entityIdShardRanges(kind, shardCount);
    const ids = realImportIds(kind, 1464);
    const perShard = new Array(shardCount).fill(0);
    for (const id of ids) {
      perShard[ranges.findIndex((r) => (r.gte === undefined || id >= r.gte) && (r.lt === undefined || id < r.lt))] += 1;
    }
    assert.equal(perShard[0], 0, `kind "${kind}" shard 0 (reserved for plain UUIDs) unexpectedly caught an imported id -- entityIdShardRanges()'s own header boundary moved`);
    const importShards = perShard.slice(1);
    const evenShare = ids.length / importShards.length;
    for (const [i, n] of importShards.entries()) {
      assert.ok(n >= evenShare * 0.1, `kind "${kind}" import-shard ${i + 1} got only ${n} of ${ids.length} ids (an even split of the import shards would be ~${evenShare.toFixed(0)}) -- the split is not spreading the import block`);
    }
  }
});

// --- the IMPORT_KIND_CODE table itself never silently drifts from stableImportId() ---
check("IMPORT_KIND_CODE matches what the REAL stableImportId() actually stamps, for every kind it names -- a future importer renaming its own kind argument fails HERE, not by silently unbalancing the shards", () => {
  const kindNameFor = { folder: "folder", note: "note", placement: "placement" };
  for (const [kind, code] of Object.entries(IMPORT_KIND_CODE)) {
    const real = stableImportId("journey-map-shard-test", kindNameFor[kind], "probe");
    assert.ok(real.startsWith(`imp${code}`), `stableImportId(..., "${kindNameFor[kind]}", ...) => "${real}" does not start with "imp${code}" -- IMPORT_KIND_CODE.${kind} is stale`);
  }
});

// --- docIdRangeFor ------------------------------------------------------------
check("docIdRangeFor() prefixes both ends with the tenant, and passes an unbounded end through unchanged", () => {
  assert.equal(docIdRangeFor("t1", null), null);
  assert.deepEqual(docIdRangeFor("t1", { gte: "impf0", lt: "impf8" }), { gte: "t1__impf0", lt: "t1__impf8" });
  assert.deepEqual(docIdRangeFor("t1", { gte: undefined, lt: "impf8" }), { gte: undefined, lt: "t1__impf8" });
  assert.deepEqual(docIdRangeFor("t1", { gte: "impf8", lt: undefined }), { gte: "t1__impf8", lt: undefined });
});
check("docIdRangeFor()'s prefixing keeps entityIdShardRanges()'s own completeness -- no gap, no overlap, once the tenant is applied", () => {
  const ranges = entityIdShardRanges("placement", 4).map((r) => docIdRangeFor("t7", r));
  assert.equal(ranges[0].gte, undefined);
  assert.equal(ranges[ranges.length - 1].lt, undefined);
  for (let i = 0; i < ranges.length - 1; i += 1) assert.equal(ranges[i].lt, ranges[i + 1].gte);
});

console.log(`\n==== journey-map-shard: ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
