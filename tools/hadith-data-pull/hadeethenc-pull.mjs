// One-time data pull from HadeethEnc.com's public API v1, for issue #306
// (Owner decision "Do b", docs/governance/2026-09-26-owner-decisions.md, row
// 5) -- the Encyclopedia of Translated Hadiths, unmodified and attributed,
// per its own published API terms:
//
//   "No modification, addition, or deletion of the content. Clearly
//    referring to the publisher and the source (HadeethEnc.com)."
//
// GATED ON THE RIGHTS REGISTER. This script does not itself decide HadeethEnc
// may be embedded -- `docs/governance/hadith-source-manifest-2026-09-18.json`
// does, via `importAuthorisation.approvedSources`, and
// `tools/i18n-verify/hadith-source-rights.mjs` refuses a corpus subfolder
// existing for any source not named there. Run that guard after this script;
// it is what makes "we did not import ungranted text" mechanical rather than
// a claim the Owner (a non-coder) would otherwise have to trust.
//
// UNMODIFIED, BY CONSTRUCTION. Every text-bearing field is written EXACTLY as
// the API returns it -- no trim, no re-punctuation, no whitespace collapse,
// no HTML entity decoding beyond what JSON.parse itself does. HTML escaping
// for on-screen rendering is the RENDERER's job, at render time, never this
// script's -- storing an already-escaped string would itself be a
// modification of the content, which the grant forbids.
//
// LAZY BY DESIGN (I9). Output is chunked so nothing downstream ever has to
// load the whole corpus to show one hadith: a small per-language category
// tree (the "topic tree" root -> sub-category -> hadith the module browses
// by), and one file per language PER ROOT CATEGORY holding that root's own
// hadiths, recursively, across every one of its sub-categories.
//
// INTEGRITY. Every hadith record carries its own `contentHash` -- a SHA-256
// over the exact JSON this script wrote for its content fields -- computed
// AT PULL TIME, over the API's own response. `hadeethenc-corpus-integrity.mjs`
// re-reads every file afterwards and recomputes the same hash, so a later
// accidental edit (a stray reformat, a line-ending conversion, a manual
// "fix") is caught byte-for-byte. The hash is a promise about what was
// written here, not a live re-check against the API -- this script is the
// only thing that ever talks to hadeethenc.com.
//
// NETWORK REQUIRED. This sandbox that authored this file could not reach
// hadeethenc.com at all (egress blocked, confirmed by curl and WebFetch both
// refusing the outbound request) -- so this script is written against the
// documented API v1 shape and has NOT been run or proven against a live
// response. Run it from an environment with real network access, then run
// `hadeethenc-corpus-integrity.mjs` against its own output before trusting
// either.
//
// Usage: node tools/hadith-data-pull/hadeethenc-pull.mjs [--langs=ar,en,bn]

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "output", "hadeethenc");
const MANIFEST_PATH = path.join(OUT_DIR, "manifest.json");

const API_BASE = "https://hadeethenc.com/api/v1";
const TERMS_QUOTATION =
  "No modification, addition, or deletion of the content. Clearly referring to the publisher and the source (HadeethEnc.com).";

// The three languages the Owner named. A language not actually listed by the
// API is skipped and reported -- never silently substituted, per this
// module's own "a language is never fabricated" rule (hadith-corpus.js).
const REQUESTED_LANGS = (() => {
  const arg = process.argv.find((a) => a.startsWith("--langs="));
  if (!arg) return ["ar", "en", "bn"];
  return arg.slice("--langs=".length).split(",").map((s) => s.trim()).filter(Boolean);
})();

const REQUEST_DELAY_MS = 250; // be a polite API citizen; this is a one-time pull, not a live dependency.
const MAX_RETRIES = 4;
const SIZE_WARNING_BYTES = 40 * 1024 * 1024; // ~40 MB, per the issue's own instruction to stop and say so.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, attempt = 1) {
  await sleep(REQUEST_DELAY_MS);
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw new Error(`network error fetching ${url}: ${err.message}`);
    const backoff = 600 * attempt * attempt;
    console.warn(`  retry ${attempt}/${MAX_RETRIES - 1} for ${url} after ${backoff}ms (${err.message})`);
    await sleep(backoff);
    return fetchJson(url, attempt + 1);
  }
  if (!res.ok) {
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const backoff = 1500 * attempt;
      console.warn(`  429 rate-limited on ${url}, waiting ${backoff}ms`);
      await sleep(backoff);
      return fetchJson(url, attempt + 1);
    }
    throw new Error(`HTTP ${res.status} from ${url}`);
  }
  // Read as TEXT first so the raw bytes are available for hashing/inspection
  // before JSON.parse -- if the API ever wraps a response in something this
  // script does not expect, the raw text is what a future session needs to
  // see, not a parse error with no context.
  const raw = await res.text();
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`could not parse JSON from ${url}: ${err.message}\nFirst 500 chars: ${raw.slice(0, 500)}`);
  }
}

/** SHA-256 over the canonical JSON of exactly the content fields this script stores -- the same shape hashed at pull time and re-hashed by the integrity check. */
export function contentHash(record) {
  const canonical = JSON.stringify({
    id: record.id,
    title: record.title,
    hadeeth: record.hadeeth,
    attribution: record.attribution,
    grade: record.grade,
    explanation: record.explanation,
    hints: record.hints,
    words_meanings: record.words_meanings,
    reference: record.reference,
    categories: record.categories,
  });
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// API calls -- one function per endpoint, matching the issue's own naming
// ---------------------------------------------------------------------------

/**
 * GET /languages/ -- the API's own supported-language list. Defensive about
 * shape (an array of strings, or an array of {id,name} objects) because this
 * script was written without ever seeing a real response; whichever shape it
 * gets, it reduces to a plain array of language codes and SAYS which shape it
 * saw, so a future session can tell the difference between "bn is genuinely
 * absent" and "the parser guessed wrong".
 */
export function normaliseLanguageList(raw) {
  if (!Array.isArray(raw)) throw new Error(`/languages/ did not return an array: ${JSON.stringify(raw).slice(0, 200)}`);
  if (raw.length === 0) return [];
  if (typeof raw[0] === "string") return raw;
  if (typeof raw[0] === "object" && raw[0] !== null) {
    const key = ["id", "code", "key"].find((k) => k in raw[0]);
    if (key) return raw.map((r) => r[key]);
  }
  throw new Error(`/languages/ returned an unrecognised shape: ${JSON.stringify(raw[0]).slice(0, 200)}`);
}

async function pullLanguages() {
  const raw = await fetchJson(`${API_BASE}/languages/`);
  return normaliseLanguageList(raw);
}

/** Flat list of every category in this language: {id, title, parent_id, has_sub_categories}. */
async function pullCategoriesFlat(lang) {
  return fetchJson(`${API_BASE}/categories/list/?language=${lang}`);
}

/** Root categories only, in this language. */
async function pullCategoryRoots(lang) {
  return fetchJson(`${API_BASE}/categories/roots/?language=${lang}`);
}

/** Every hadith id/title summary filed directly under one category, paginated. */
async function pullHadithSummariesForCategory(lang, categoryId) {
  const results = [];
  let page = 1;
  for (;;) {
    const batch = await fetchJson(`${API_BASE}/hadeeths/list/?language=${lang}&category_id=${categoryId}&page=${page}`);
    const rows = Array.isArray(batch) ? batch : (batch?.data ?? batch?.results ?? null);
    if (!Array.isArray(rows)) {
      throw new Error(`/hadeeths/list/ for category ${categoryId} (${lang}) page ${page} returned an unrecognised shape`);
    }
    results.push(...rows);
    if (rows.length === 0) break;
    // Stop when a short page is returned -- the common REST pagination
    // signal. If the API instead always returns a full page and needs an
    // explicit "last page" flag, this will simply request one extra empty
    // page and stop there instead; harmless, just one wasted request.
    if (rows.length < 20) break;
    page += 1;
  }
  return results;
}

/** The full record for one hadith id, in one language. */
async function pullHadithDetail(lang, id) {
  return fetchJson(`${API_BASE}/hadeeths/one/?language=${lang}&id=${id}`);
}

// ---------------------------------------------------------------------------
// Tree assembly
// ---------------------------------------------------------------------------

/** Every category id reachable from a root, including the root itself, by walking parent_id links in the flat list. */
export function descendantsOf(rootId, flatCategories) {
  const byParent = new Map();
  for (const c of flatCategories) {
    const key = c.parent_id ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(c);
  }
  const ids = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift();
    for (const child of byParent.get(id) ?? []) {
      ids.push(child.id);
      queue.push(child.id);
    }
  }
  return ids;
}

async function pullOneLanguage(lang) {
  console.log(`\n=== ${lang} ===`);
  const [flat, roots] = await Promise.all([pullCategoriesFlat(lang), pullCategoryRoots(lang)]);
  console.log(`  ${flat.length} categories, ${roots.length} roots`);

  fs.mkdirSync(path.join(OUT_DIR, lang), { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, lang, "categories.json"),
    JSON.stringify({ language: lang, categories: flat, roots }, null, 2),
  );

  const rootSummaries = [];
  const seenHadithIds = new Set(); // one hadith can sit under more than one category; pulled once per language.

  for (const root of roots) {
    const rootId = root.id;
    const categoryIds = descendantsOf(rootId, flat);
    console.log(`  root ${rootId} (${root.title ?? ""}) -- ${categoryIds.length} categories`);

    const idsInThisRoot = new Set();
    for (const catId of categoryIds) {
      const summaries = await pullHadithSummariesForCategory(lang, catId);
      for (const s of summaries) idsInThisRoot.add(s.id);
    }

    const hadiths = [];
    for (const id of idsInThisRoot) {
      if (seenHadithIds.has(id)) continue; // already pulled under an earlier root this language
      seenHadithIds.add(id);
      const detail = await pullHadithDetail(lang, id);
      hadiths.push({ ...detail, contentHash: contentHash(detail) });
    }

    const fileName = `root-${rootId}.json`;
    fs.writeFileSync(
      path.join(OUT_DIR, lang, fileName),
      JSON.stringify({ language: lang, rootCategoryId: rootId, rootCategoryTitle: root.title ?? null, hadiths }, null, 2),
    );
    console.log(`  wrote ${fileName}: ${hadiths.length} hadiths`);
    rootSummaries.push({ rootCategoryId: rootId, rootCategoryTitle: root.title ?? null, file: `${lang}/${fileName}`, hadithCount: hadiths.length });
  }

  return { language: lang, categoriesCount: flat.length, rootsCount: roots.length, hadithCount: seenHadithIds.size, roots: rootSummaries };
}

function dirSizeBytes(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSizeBytes(p) : fs.statSync(p).size;
  }
  return total;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Fetching supported languages from ${API_BASE}/languages/ ...`);
  const available = await pullLanguages();
  console.log(`  API lists: ${available.join(", ")}`);

  const langsToRequest = REQUESTED_LANGS.filter((l) => available.includes(l));
  const missing = REQUESTED_LANGS.filter((l) => !available.includes(l));
  if (missing.length) console.warn(`  requested but NOT listed by the API, skipping: ${missing.join(", ")}`);
  if (!langsToRequest.length) throw new Error("none of the requested languages are listed by the API -- nothing to pull");

  const perLanguage = [];
  for (const lang of langsToRequest) perLanguage.push(await pullOneLanguage(lang));

  const totalHadithRecords = perLanguage.reduce((n, l) => n + l.hadithCount, 0);
  const sizeBytes = dirSizeBytes(OUT_DIR);
  const manifest = {
    manifestVersion: "hadeethenc-pull:v1",
    sourceId: "hadeethenc",
    pulledAt: new Date().toISOString(),
    apiBase: API_BASE,
    termsQuotation: TERMS_QUOTATION,
    requestedLanguages: REQUESTED_LANGS,
    languagesAvailableFromApi: available,
    languagesPulled: langsToRequest,
    languagesRequestedButUnavailable: missing,
    perLanguage: perLanguage.map((l) => ({
      language: l.language, categoriesCount: l.categoriesCount, rootsCount: l.rootsCount, hadithCount: l.hadithCount, roots: l.roots,
    })),
    totals: { hadithRecordsAcrossAllLanguages: totalHadithRecords, outputBytes: sizeBytes },
    sizeWarning: sizeBytes > SIZE_WARNING_BYTES
      ? `Output is ${(sizeBytes / (1024 * 1024)).toFixed(1)} MB, over the ~40 MB threshold -- STOP and confirm before committing (issue #306, "Size").`
      : null,
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`\nDone. ${totalHadithRecords} hadith records across ${langsToRequest.length} language(s).`);
  console.log(`Output: ${(sizeBytes / (1024 * 1024)).toFixed(1)} MB at ${path.relative(process.cwd(), OUT_DIR)}`);
  if (manifest.sizeWarning) {
    console.warn(`\n!!! ${manifest.sizeWarning}`);
    process.exitCode = 2;
  }
}

// Guarded so `hadeethenc-pull-logic.mjs` can import the pure helpers above
// (contentHash, normaliseLanguageList, descendantsOf) without triggering a
// real network pull -- only running this file directly runs main().
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
