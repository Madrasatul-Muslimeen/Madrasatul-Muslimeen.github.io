// HadeethEnc corpus reader (issue #309, part 2 of #306) -- the pure/lazy
// data layer, tested against synthetic in-memory fixtures shaped exactly
// like tools/hadith-data-pull/hadeethenc-package.mjs's own output, never
// against the real corpus (that is hadeethenc-corpus-integrity.mjs's job).
//
// Run from the REPOSITORY ROOT.
import assert from "node:assert/strict";
import process from "node:process";
import {
  HADEETHENC_LANGS, HADEETHENC_STRUCTURE_LANG,
  loadHadeethEncCategories, loadHadeethEncShard,
  categoryById, childCategories, directHadithIds, resolveCategoryTitle,
  hadithArabicText, rehydrateHadith, loadHadithRecords, loadHadithRecord, hadeethEncSourceUrl,
} from "../../app/js/hadeethenc-corpus.js";

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; use asyncCheck() for a promise-returning body.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}
async function asyncCheck(name, fn) {
  try {
    await fn();
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

// ---------------------------------------------------------------------------
// A tiny in-memory "server", one per test case (unique baseUrl -> unique
// cache key), so no case can see another's fixture through the module's own
// cache.
// ---------------------------------------------------------------------------
let caseCounter = 0;
function fixtureServer(files) {
  const baseUrl = `test://case-${++caseCounter}/`;
  const fetchImpl = async (url) => {
    const rel = url.slice(baseUrl.length);
    if (!(rel in files)) return { ok: false, status: 404 };
    return { ok: true, json: async () => files[rel] };
  };
  return { opts: { fetchImpl, baseUrl } };
}

function categoriesFixture(lang, { categories, roots, categoryHadithIds, hadithFile }) {
  return { language: lang, categories, roots, categoryHadithIds, hadithFile };
}

/** A three-language mini corpus: root 1 has two children (10 leaf, 11 leaf); root 1 itself also holds one DIRECT hadith ("d1"). Bangla only has the 10 subtree; English has everything ar has. */
function threeLangFixture() {
  const cats = [
    { id: "1", title: "Root", parent_id: null, hadeeths_count: "3" },
    { id: "10", title: "Child A", parent_id: "1", hadeeths_count: "1" },
    { id: "11", title: "Child B", parent_id: "1", hadeeths_count: "1" },
  ];
  const roots = [cats[0]];
  const categoryHadithIds = { 1: ["d1", "a10", "b11"], 10: ["a10"], 11: ["b11"] };
  const hadithFile = { d1: "ar/cat-1.json", a10: "ar/cat-10.json", b11: "ar/cat-11.json" };
  const arCats = categoriesFixture("ar", { categories: cats, roots, categoryHadithIds, hadithFile });

  const enCats = categoriesFixture("en", {
    categories: cats, roots,
    categoryHadithIds, hadithFile: { d1: "en/cat-1.json", a10: "en/cat-10.json", b11: "en/cat-11.json" },
  });

  // Bangla only ever pulled the "Child A" subtree -- root "1" and "11" simply
  // do not exist in its own categories.json, matching the real corpus shape
  // (every bn id measured to be a subset of en's).
  const bnCats = categoriesFixture("bn", {
    categories: [cats[1]], roots: [cats[1]],
    categoryHadithIds: { 10: ["a10"] }, hadithFile: { a10: "bn/cat-10.json" },
  });

  const files = {
    "ar/categories.json": arCats, "en/categories.json": enCats, "bn/categories.json": bnCats,
    "ar/cat-1.json": { language: "ar", shard: "cat-1", arabicFromArRecord: {}, hadiths: [{ id: "d1", title: "دال١", hadeeth: "متن دال١", attribution: "راوي" }] },
    "ar/cat-10.json": { language: "ar", shard: "cat-10", arabicFromArRecord: {}, hadiths: [{ id: "a10", title: "عنوان أ", hadeeth: "متن أ", attribution: "راوي أ" }] },
    "ar/cat-11.json": { language: "ar", shard: "cat-11", arabicFromArRecord: {}, hadiths: [{ id: "b11", title: "عنوان ب", hadeeth: "متن ب", attribution: "راوي ب" }] },
    "en/cat-1.json": {
      language: "en", shard: "cat-1", arabicFromArRecord: { d1: ["hadeeth_ar", "attribution_ar"] },
      hadiths: [{ id: "d1", title: "Title D1", hadeeth: "Matn D1 (en)", attribution: "Narrator (en)" }],
    },
    "en/cat-10.json": {
      language: "en", shard: "cat-10", arabicFromArRecord: { a10: ["hadeeth_ar", "attribution_ar"] },
      hadiths: [{ id: "a10", title: "Title A", hadeeth: "Matn A (en)", attribution: "Narrator A (en)" }],
    },
    "en/cat-11.json": {
      language: "en", shard: "cat-11", arabicFromArRecord: { b11: ["hadeeth_ar", "attribution_ar"] },
      hadiths: [{ id: "b11", title: "Title B", hadeeth: "Matn B (en)", attribution: "Narrator B (en)" }],
    },
    "bn/cat-10.json": {
      language: "bn", shard: "cat-10", arabicFromArRecord: { a10: ["hadeeth_ar"] },
      hadiths: [{ id: "a10", title: "শিরোনাম A", hadeeth: "মতন A (bn)" }],
    },
  };
  return fixtureServer(files);
}

console.log("\n=== HadeethEnc corpus model (synthetic fixtures) ===\n");

check("POSITIVE CONTROL -- HADEETHENC_LANGS names exactly ar/en/bn, and Arabic is the structure language", () => {
  assert.deepEqual([...HADEETHENC_LANGS], ["ar", "en", "bn"]);
  assert.equal(HADEETHENC_STRUCTURE_LANG, "ar");
});

// ---------------------------------------------------------------------------
// loadHadeethEncCategories / loadHadeethEncShard -- I9 (lazy) and caching
// ---------------------------------------------------------------------------

await asyncCheck("loadHadeethEncCategories rejects an unpulled language before ever fetching", async () => {
  const { opts } = fixtureServer({});
  await assert.rejects(() => loadHadeethEncCategories("fr", opts), /was not pulled/);
});

await asyncCheck("loadHadeethEncCategories throws on a 404 rather than returning a partial shape", async () => {
  const { opts } = fixtureServer({});
  await assert.rejects(() => loadHadeethEncCategories("ar", opts), /Could not load/);
});

await asyncCheck("loadHadeethEncCategories throws on a malformed body instead of silently accepting it", async () => {
  const { opts } = fixtureServer({ "ar/categories.json": { language: "ar" } });
  await assert.rejects(() => loadHadeethEncCategories("ar", opts), /Invalid HadeethEnc categories/);
});

await asyncCheck("loadHadeethEncCategories fetches each language's categories.json exactly ONCE (cached)", async () => {
  const { opts } = threeLangFixture();
  let calls = 0;
  const countingFetch = (...args) => { calls++; return opts.fetchImpl(...args); };
  const countedOpts = { ...opts, fetchImpl: countingFetch };
  await loadHadeethEncCategories("ar", countedOpts);
  await loadHadeethEncCategories("ar", countedOpts);
  await loadHadeethEncCategories("ar", countedOpts);
  assert.equal(calls, 1, "a second and third call to the SAME language must be served from cache");
});

await asyncCheck("loadHadeethEncShard throws on a 404 shard path", async () => {
  const { opts } = fixtureServer({});
  await assert.rejects(() => loadHadeethEncShard("ar", "ar/cat-999.json", opts), /Could not load HadeethEnc shard/);
});

// ---------------------------------------------------------------------------
// Category tree helpers -- always read against the Arabic structure
// ---------------------------------------------------------------------------

await asyncCheck("childCategories/categoryById read the structure tree by parent_id, as strings", async () => {
  const { opts } = threeLangFixture();
  const ar = await loadHadeethEncCategories("ar", opts);
  assert.equal(categoryById(ar, "10").title, "Child A");
  assert.equal(categoryById(ar, 10).title, "Child A", "a numeric id must resolve the same as its string form");
  assert.equal(categoryById(ar, "no-such-id"), null);
  assert.deepEqual(childCategories(ar, "1").map((c) => c.id), ["10", "11"]);
  assert.deepEqual(childCategories(ar, "10"), [], "a leaf has no children");
});

await asyncCheck("directHadithIds excludes every id already covered by a child, and returns everything for a leaf", async () => {
  const { opts } = threeLangFixture();
  const ar = await loadHadeethEncCategories("ar", opts);
  // Root "1"'s own categoryHadithIds lists all three (transitive); only "d1"
  // is not covered by either child.
  assert.deepEqual(directHadithIds(ar, "1"), ["d1"]);
  assert.deepEqual(directHadithIds(ar, "10"), ["a10"], "a leaf's own set is entirely direct");
  assert.deepEqual(directHadithIds(ar, "11"), ["b11"]);
});

await asyncCheck("resolveCategoryTitle prefers the reader's own language, verbatim, with no fallback flag", async () => {
  const { opts } = threeLangFixture();
  const catsByLang = {
    ar: await loadHadeethEncCategories("ar", opts),
    en: await loadHadeethEncCategories("en", opts),
    bn: await loadHadeethEncCategories("bn", opts),
  };
  const r = resolveCategoryTitle(catsByLang, "10", "bn");
  assert.equal(r.title, "Child A", "bn's own categories.json does carry id 10 -- its title, not en's or ar's, should win");
  assert.equal(r.isFallback, false);
  assert.equal(r.lang, "bn");
  assert.equal(r.count, "1");
});

await asyncCheck("resolveCategoryTitle falls back en -> ar when the reader's own pull lacks the id, and SAYS SO", async () => {
  const { opts } = threeLangFixture();
  const catsByLang = {
    ar: await loadHadeethEncCategories("ar", opts),
    en: await loadHadeethEncCategories("en", opts),
    bn: await loadHadeethEncCategories("bn", opts),
  };
  // bn never pulled root "1" or "11" at all.
  const rootFallback = resolveCategoryTitle(catsByLang, "1", "bn");
  assert.equal(rootFallback.title, "Root");
  assert.equal(rootFallback.lang, "en");
  assert.equal(rootFallback.isFallback, true);

  // With only ar/bn loaded (no en at all), the SAME id must fall straight to ar.
  const arOnly = resolveCategoryTitle({ ar: catsByLang.ar, bn: catsByLang.bn }, "11", "bn");
  assert.equal(arOnly.lang, "ar");
  assert.equal(arOnly.isFallback, true);
});

check("resolveCategoryTitle returns null for an id genuinely absent everywhere it was given", () => {
  assert.equal(resolveCategoryTitle({ ar: { categories: [] } }, "999", "en"), null);
});

// ---------------------------------------------------------------------------
// hadithArabicText / rehydrateHadith
// ---------------------------------------------------------------------------

check("hadithArabicText reads `hadeeth` for ar and `hadeeth_ar` for every other language", () => {
  assert.equal(hadithArabicText({ hadeeth: "متن" }, "ar"), "متن");
  assert.equal(hadithArabicText({ hadeeth: "Matn (en)", hadeeth_ar: "متن" }, "en"), "متن");
  assert.equal(hadithArabicText({ hadeeth: "Matn (en)" }, "en"), null, "no hadeeth_ar at all must not fall back to the translation");
});

check("rehydrateHadith puts back exactly the omitted fields, from the ar record's OWN base field names", () => {
  const en = { id: "1", hadeeth: "Matn (en)", attribution: "Narrator (en)" };
  const ar = { id: "1", hadeeth: "متن", attribution: "راوي", explanation: "شرح" };
  const full = rehydrateHadith(en, ["hadeeth_ar", "attribution_ar"], ar);
  assert.equal(full.hadeeth_ar, "متن");
  assert.equal(full.attribution_ar, "راوي");
  assert.equal(full.hadeeth, "Matn (en)", "the record's own translated field must be untouched");
  assert.equal("explanation_ar" in full, false, "a field never listed as omitted must not be invented");
});

check("rehydrateHadith is a genuine no-op when nothing was omitted", () => {
  const record = { id: "1", hadeeth: "متن" };
  assert.equal(rehydrateHadith(record, [], null), record);
  assert.equal(rehydrateHadith(record, undefined, null), record);
});

check("rehydrateHadith writes null rather than throwing when the ar record itself is missing", () => {
  const full = rehydrateHadith({ id: "1" }, ["hadeeth_ar"], null);
  assert.equal(full.hadeeth_ar, null);
});

// ---------------------------------------------------------------------------
// loadHadithRecords / loadHadithRecord -- the batched, cascading loader
// ---------------------------------------------------------------------------

await asyncCheck("loadHadithRecord resolves the reader's own language directly, with the Arabic rehydrated and isFallback false", async () => {
  const { opts } = threeLangFixture();
  const { record, lang, isFallback, requestedLang } = await loadHadithRecord("a10", "en", opts);
  assert.equal(lang, "en");
  assert.equal(isFallback, false);
  assert.equal(requestedLang, "en");
  assert.equal(record.hadeeth, "Matn A (en)", "the record's own translated text must be untouched");
  assert.equal(record.hadeeth_ar, "متن أ", "rehydrated straight from the ar record");
  assert.equal(record.attribution_ar, "راوي أ");
});

await asyncCheck("loadHadithRecord falls back en -> the record's own language when Bangla lacks this id, and says so", async () => {
  const { opts } = threeLangFixture();
  // b11 was never pulled into Bangla at all.
  const { record, lang, isFallback, requestedLang } = await loadHadithRecord("b11", "bn", opts);
  assert.equal(requestedLang, "bn");
  assert.equal(lang, "en", "en is the next step in the cascade, and en does have this id");
  assert.equal(isFallback, true);
  assert.equal(record.hadeeth, "Matn B (en)");
});

await asyncCheck("loadHadithRecord reads the reader's OWN Bangla text when Bangla genuinely has this id", async () => {
  const { opts } = threeLangFixture();
  const { record, lang, isFallback } = await loadHadithRecord("a10", "bn", opts);
  assert.equal(lang, "bn");
  assert.equal(isFallback, false);
  assert.equal(record.hadeeth, "মতন A (bn)");
  assert.equal(record.hadeeth_ar, "متن أ", "Bangla's own omitted Arabic field is still rehydrated from the ar record");
});

await asyncCheck("loadHadithRecords throws naming the id when it exists in NO pulled language at all", async () => {
  const { opts } = threeLangFixture();
  await assert.rejects(() => loadHadithRecords(["does-not-exist"], "en", opts), /does-not-exist/);
});

await asyncCheck("loadHadithRecords fetches each DISTINCT shard exactly once, even across many requested ids", async () => {
  const { opts } = threeLangFixture();
  let shardFetches = 0;
  const countingFetch = async (url) => {
    if (url.includes("cat-") && url.endsWith(".json") && !url.includes("categories")) shardFetches++;
    return opts.fetchImpl(url);
  };
  const countedOpts = { ...opts, fetchImpl: countingFetch };
  const out = await loadHadithRecords(["a10", "b11", "d1"], "en", countedOpts);
  assert.equal(out.size, 3);
  // Three ids, three DIFFERENT shard files in en (cat-1/cat-10/cat-11) plus
  // three ar shards for rehydration -- six shard fetches, not one per id
  // requested twice over, and never re-fetched by a later call.
  assert.equal(shardFetches, 6);
  await loadHadithRecords(["a10", "b11", "d1"], "en", countedOpts);
  assert.equal(shardFetches, 6, "a repeat request must be served entirely from cache");
});

check("hadeethEncSourceUrl points at the resolved language's own edition of the hadith", () => {
  assert.equal(hadeethEncSourceUrl("en", "4563"), "https://hadeethenc.com/en/browse/hadith/4563");
  assert.equal(hadeethEncSourceUrl("ar", "1"), "https://hadeethenc.com/ar/browse/hadith/1");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
