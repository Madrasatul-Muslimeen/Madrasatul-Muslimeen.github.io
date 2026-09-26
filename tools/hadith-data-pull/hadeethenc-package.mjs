// Packages a raw HadeethEnc pull (tools/hadith-data-pull/raw-pull/hadeethenc,
// written by hadeethenc-pull.mjs, NOT committed) into the files the app loads
// (tools/hadith-data-pull/output/hadeethenc, committed). Issue #306.
//
// Two things happen here, and neither changes a single character of content.
//
// 1. SMALL FILES (I9). One file per topic shard instead of one per root: a
//    category is its own file while it holds at most SHARD_MAX not-yet-placed
//    hadiths; a bigger one is split among its sub-categories, the remainder
//    staying in its own file. Each language's `categories.json` carries
//    `hadithFile` (id -> file), so opening a topic loads only its own shard.
//    Measured before this step: one root file was 6.7 MB.
//
// 2. EACH ARABIC TEXT STORED ONCE. Every en/bn record as the API returns it
//    repeats the Arabic record's fields as `hadeeth_ar`, `explanation_ar`,
//    `hints_ar`, ... -- measured 26 Sep 2026: 27,200 of 27,201 such fields
//    byte-identical to the ar record's own field. A field that is identical
//    is left out of the en/bn file and listed in that record's entry of the
//    file's `arabicFromArRecord` map; one that differs is kept verbatim.
//    Nothing is lost: `rehydrate()` puts every omitted field back from the ar
//    record, and `hadeethenc-corpus-integrity.mjs` re-hashes the rebuilt
//    record against the `contentHash` taken over the WHOLE API response at
//    pull time. So "byte-identical to what the API returned" is proven for
//    the full record, not asserted. This took the corpus from 41.4 MB to the
//    size the manifest records.
//
// Usage (from the repository root): node tools/hadith-data-pull/hadeethenc-package.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, "raw-pull", "hadeethenc");
const OUT_DIR = path.join(__dirname, "output", "hadeethenc");
export const SHARD_MAX = 250;

/** The ar record's field an en/bn `_ar` field repeats: `hadeeth_ar` -> `hadeeth`. */
export const arBaseField = (key) => (key.endsWith("_ar") ? key.slice(0, -3) : null);

/** Put back every field listed in `omitted` from the Arabic record. Pure. */
export function rehydrate(record, omitted, arRecord) {
  if (!omitted?.length) return record;
  const full = { ...record };
  for (const k of omitted) full[k] = arRecord[arBaseField(k)];
  return full;
}

/**
 * Shard assignment: category id -> file id, and hadith id -> file id.
 * Walks roots in the API's order, depth first, children in the API's order.
 */
export function planShards(categories, roots, categoryHadithIds, max = SHARD_MAX) {
  const children = new Map();
  for (const c of categories) {
    const p = c.parent_id ?? null;
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(c.id);
  }
  const hadithFile = {};
  const shards = new Map(); // file id -> [hadith ids]
  const place = (catId) => {
    const pending = (categoryHadithIds[catId] ?? []).filter((id) => !(id in hadithFile));
    const kids = children.get(catId) ?? [];
    if (pending.length > max && kids.length) for (const k of kids) place(k);
    const rest = (categoryHadithIds[catId] ?? []).filter((id) => !(id in hadithFile));
    if (rest.length) {
      shards.set(`cat-${catId}`, rest);
      for (const id of rest) hadithFile[id] = `cat-${catId}`;
    }
  };
  for (const r of roots) place(r.id);
  return { hadithFile, shards };
}

function readRaw(lang) {
  const dir = path.join(RAW_DIR, lang);
  const cats = JSON.parse(fs.readFileSync(path.join(dir, "categories.json"), "utf8"));
  const records = new Map();
  for (const f of fs.readdirSync(dir).filter((f) => f.startsWith("root-"))) {
    for (const h of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).hadiths) records.set(String(h.id), h);
  }
  return { cats, records };
}

function main() {
  const rawManifest = JSON.parse(fs.readFileSync(path.join(RAW_DIR, "manifest.json"), "utf8"));
  const langs = rawManifest.languagesPulled;
  if (!langs.includes("ar")) throw new Error("the Arabic pull is required: every other language's Arabic is taken from it");
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  const ar = readRaw("ar");
  const perLanguage = [];
  let omittedFields = 0, keptDifferent = 0;
  for (const lang of langs) {
    const { cats, records } = lang === "ar" ? ar : readRaw(lang);
    const { hadithFile, shards } = planShards(cats.categories, cats.roots, cats.categoryHadithIds);
    fs.mkdirSync(path.join(OUT_DIR, lang), { recursive: true });
    const files = [];
    for (const [fileId, ids] of shards) {
      const arabicFromArRecord = {};
      const hadiths = ids.map((id) => {
        const h = records.get(id);
        if (!h) throw new Error(`${lang}: category lists ${id} but no record was pulled`);
        if (lang === "ar") return h;
        const a = ar.records.get(id);
        const out = { ...h };
        const omitted = [];
        for (const k of Object.keys(h)) {
          const base = arBaseField(k);
          if (!base || !a) continue;
          if (JSON.stringify(h[k]) === JSON.stringify(a[base])) { delete out[k]; omitted.push(k); omittedFields++; } else keptDifferent++;
        }
        if (omitted.length) arabicFromArRecord[id] = omitted;
        return out;
      });
      const file = `${lang}/${fileId}.json`;
      fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify({ language: lang, shard: fileId, arabicFromArRecord, hadiths }));
      files.push({ file, hadithCount: hadiths.length });
    }
    const hadithFileOut = Object.fromEntries(Object.entries(hadithFile).map(([id, f]) => [id, `${lang}/${f}.json`]));
    fs.writeFileSync(path.join(OUT_DIR, lang, "categories.json"),
      JSON.stringify({ language: lang, categories: cats.categories, roots: cats.roots, categoryHadithIds: cats.categoryHadithIds, hadithFile: hadithFileOut }));
    perLanguage.push({ language: lang, categoriesCount: cats.categories.length, rootsCount: cats.roots.length, hadithCount: records.size, files });
  }
  const sizeBytes = (function size(d) { return fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0); })(OUT_DIR);
  const manifest = {
    manifestVersion: "hadeethenc-package:v1",
    sourceId: "hadeethenc",
    pulledAt: rawManifest.pulledAt,
    packagedAt: new Date().toISOString(),
    apiBase: rawManifest.apiBase,
    termsQuotation: rawManifest.termsQuotation,
    languagesAvailableFromApi: rawManifest.languagesAvailableFromApi,
    languagesPulled: langs,
    shardMax: SHARD_MAX,
    arabicStoredOnce: { omittedFields, keptBecauseDifferent: keptDifferent },
    perLanguage,
    totals: { hadithRecordsAcrossAllLanguages: perLanguage.reduce((n, l) => n + l.hadithCount, 0), outputBytes: sizeBytes },
    sizeWarning: sizeBytes > 40 * 1024 * 1024 ? `Output is ${(sizeBytes / 1048576).toFixed(1)} MB, over ~40 MB` : null,
  };
  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`packaged ${manifest.totals.hadithRecordsAcrossAllLanguages} records, ${(sizeBytes / 1048576).toFixed(1)} MB; Arabic fields stored once: ${omittedFields} (kept, different: ${keptDifferent})`);
  for (const l of perLanguage) console.log(`  ${l.language}: ${l.hadithCount} hadiths in ${l.files.length} files, largest ${Math.max(...l.files.map((f) => f.hadithCount))}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
