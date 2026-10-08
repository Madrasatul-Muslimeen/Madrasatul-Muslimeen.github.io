// The numbering concordance (decision 87, round H-DB2; research report
// docs/reports/2026-10-07-hadith-dua-sources-research.md §2 caution 1 and §4.1 item 2).
//
// WHY. The OpenITI editions in this repository do not carry the numbers people cite. The JK Bukhari has 7,129
// numbered hadith against the standard 7,563 (its Kitab ad-Da'awat is 5945-6048, not 6304-6411); Muslim's file
// has no hadith numbers at all; Riyad as-Salihin is 8 out. The H1 rule: "never infer cross-edition equivalence
// from a number alone". So equivalence is found by MATCHING THE WORDS, and only the resulting numbers are kept.
//
// WHAT IT STORES. Numbers only, never anyone's text: for each OpenITI passage that matched, its permanent
// position `n` (the library's own key, `openiti:<versionUri>:<n>`), the standard number, and the match score.
// The standard numbering is the one fawazahmed0/hadith-api uses (sunnah.com's), with Muslim's Abdul-Baqi number
// beside its sequential one. Numbers and section ranges are facts; the hadith-api repository is public domain
// (Unlicense) in any case. Its Arabic is downloaded to a temporary folder for the matching and never committed.
//
// HOW. Both texts are normalised (diacritics, tatweel and punctuation removed; alef, ya, ta marbuta, hamza seats
// unified). Each text becomes a set of word 3-grams. 3-grams found in more than MAX_POSTING standard hadith (the
// shared chains of narrators, "حدثنا عبد الله بن ...") are ignored, so a match rests on the words of the hadith
// itself. A passage's best candidate is the standard hadith sharing the most 3-grams; ties go to the one nearest
// the position the previous match predicts (both books run in the same order). Score = shared / the smaller set.
// A match is kept only at score >= MIN_SCORE. Many-to-one is allowed and reported: an edition may split one
// standard hadith in two, or join two.
//
// Usage (repository root):
//   NODE_USE_ENV_PROXY=1 node tools/hadith-data-pull/hadith-concordance.mjs [--cache <dir>]
// Writes tools/hadith-data-pull/output/concordance/<versionUri>.json and concordance/summary.json.
// tools/i18n-verify/hadith-concordance.mjs checks the output.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPLIT_DIR = path.join(__dirname, "output", "openiti-release", "split");
const OUT_DIR = path.join(__dirname, "output", "concordance");
const API = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1";

export const MIN_SCORE = 0.5;
export const MAX_POSTING = 40;
export const GAP_SCORE = 0.3;
export const NEAR = 30;
export const NEAR_SLACK = 0.15;

/** OpenITI book -> the hadith-api edition carrying its standard numbering. */
export const PAIRS = Object.freeze([
  { versionUri: "0256Bukhari.Sahih.JK000110-ara1", edition: "bukhari", label: "Bukhari", labelBn: "বুখারী" },
  { versionUri: "0261Muslim.Sahih.Shamela0001727-ara1", edition: "muslim", label: "Muslim", labelBn: "মুসলিম" },
  { versionUri: "0275AbuDawudSijistani.Sunan.JK000142-ara1", edition: "abudawud", label: "Abu Dawud", labelBn: "আবু দাউদ" },
  { versionUri: "0279Tirmidhi.Sunan.JK000140-ara1", edition: "tirmidhi", label: "Tirmidhi", labelBn: "তিরমিযী" },
  { versionUri: "0303Nasai.SunanSughra.JK000130-ara1", edition: "nasai", label: "Nasa'i", labelBn: "নাসাঈ" },
  { versionUri: "0273IbnMaja.Sunan.JK000141-ara1", edition: "ibnmajah", label: "Ibn Majah", labelBn: "ইবনু মাজাহ" },
  { versionUri: "0179MalikIbnAnas.Muwatta.Shamela0028107-ara1", edition: "malik", label: "Malik", labelBn: "মালিক" },
  { versionUri: "0676Nawawi.ArbacunaNawawiyya.Shamela0012836-ara1", edition: "nawawi", label: "an-Nawawi's Forty", labelBn: "নববীর চল্লিশ হাদীস" },
]);

export function normaliseArabic(s) {
  return String(s ?? "")
    .replace(/[ً-ٰٟۖ-ۭـ]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/[^ء-ي\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function shingles(text, k = 3) {
  const w = normaliseArabic(text).split(" ").filter(Boolean);
  const out = new Set();
  for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(" "));
  return out;
}

/**
 * Matches `passages` ([{ n, text }], in book order) against `standard` ([{ number, text }], in book order).
 * Returns [{ n, index, score }] for every passage whose best candidate scores >= MIN_SCORE (index into standard).
 */
export function matchBook(passages, standard, { minScore = MIN_SCORE, maxPosting = MAX_POSTING, gapScore = GAP_SCORE } = {}) {
  const sets = standard.map((h) => shingles(h.text));
  const postings = new Map();
  sets.forEach((set, j) => { for (const g of set) { let p = postings.get(g); if (!p) postings.set(g, (p = [])); p.push(j); } });
  const matches = [];
  let expected = 0;
  for (const p of passages) {
    const a = shingles(p.text);
    if (a.size < 3) continue;
    const counts = new Map();
    for (const g of a) {
      const post = postings.get(g);
      if (!post || post.length > maxPosting) continue;
      for (const j of post) counts.set(j, (counts.get(j) ?? 0) + 1);
    }
    let best = -1, bestScore = 0, bestDist = Infinity;
    for (const [j, c] of counts) {
      const score = c / Math.min(a.size, sets[j].size || 1);
      const dist = Math.abs(j - expected);
      if (score > bestScore + 1e-9 || (Math.abs(score - bestScore) <= 1e-9 && dist < bestDist)) { best = j; bestScore = score; bestDist = dist; }
    }
    // A hadith repeated (nearly) word for word elsewhere in the book: when a candidate within NEAR of the expected
    // position scores within NEAR_SLACK of the best, the nearby one is taken. Measured on the four Sunan whose own
    // numbers equal the standard ones: this turned most of pass 1's disagreements into agreements.
    let near = -1, nearScore = 0, nearDist = Infinity;
    for (const [j, c] of counts) {
      const dist = Math.abs(j - expected);
      if (dist > NEAR) continue;
      const score = c / Math.min(a.size, sets[j].size || 1);
      if (score > nearScore + 1e-9 || (Math.abs(score - nearScore) <= 1e-9 && dist < nearDist)) { near = j; nearScore = score; nearDist = dist; }
    }
    if (near >= 0 && near !== best && nearScore >= minScore && nearScore >= bestScore - NEAR_SLACK) { best = near; bestScore = nearScore; }
    if (best >= 0 && bestScore >= minScore) {
      matches.push({ n: p.n, index: best, score: Math.min(1, bestScore), pass: 1 });
      expected = best + 1;
    }
  }
  // PASS 2: a passage left unmatched between two pass-1 matches (standard indexes lo < hi) is compared, with
  // every 3-gram counted (chains included), only against the standard hadith strictly between lo and hi, and is
  // kept at >= GAP_SCORE. The narrow window is what makes the lower bar safe; the order of both books is the
  // evidence it adds, the words are still what decide.
  const byN = new Map(matches.map((m) => [m.n, m]));
  const order = passages.filter((p) => shingles(p.text).size >= 3);
  let prev = null;
  const pending = [];
  const flushGap = (lo, hi) => {
    for (const p of pending) {
      const a = shingles(p.text);
      let best = -1, bestScore = 0;
      for (let j = lo + 1; j < hi; j++) {
        const b = sets[j];
        if (!b.size) continue;
        let c = 0; for (const g of a) if (b.has(g)) c++;
        const score = c / Math.min(a.size, b.size);
        if (score > bestScore) { best = j; bestScore = score; }
      }
      if (best >= 0 && bestScore >= gapScore) matches.push({ n: p.n, index: best, score: Math.min(1, bestScore), pass: 2 });
    }
    pending.length = 0;
  };
  for (const p of order) {
    const m = byN.get(p.n);
    if (m) {
      if (prev && pending.length && m.index - prev.index > 1 && m.index - prev.index <= 60) flushGap(prev.index, m.index);
      pending.length = 0;
      prev = m;
    } else if (prev) pending.push(p);
  }
  return matches.sort((x, y) => x.n - y.n);
}

function readPassages(versionUri) {
  const index = JSON.parse(fs.readFileSync(path.join(SPLIT_DIR, versionUri, "index.json"), "utf8"));
  const out = [];
  for (const ch of index.chapters) {
    for (const file of ch.shardFiles) {
      const shard = JSON.parse(fs.readFileSync(path.join(SPLIT_DIR, versionUri, file), "utf8"));
      for (const h of shard.hadiths) if (h.kind === "hadith" || h.kind === "passage") out.push({ n: h.n, number: h.number ?? null, text: h.text });
    }
  }
  return { index, passages: out.sort((x, y) => x.n - y.n) };
}

async function loadEdition(edition, cacheDir) {
  const file = path.join(cacheDir, `ara-${edition}.json`);
  if (!fs.existsSync(file)) {
    const res = await fetch(`${API}/editions/ara-${edition}.min.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ara-${edition}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function main() {
  const at = process.argv.indexOf("--cache");
  const cacheDir = at > 0 ? process.argv[at + 1] : fs.mkdtempSync(path.join(os.tmpdir(), "hadith-api-"));
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const summary = [];
  for (const pair of PAIRS) {
    const { passages } = readPassages(pair.versionUri);
    const ed = await loadEdition(pair.edition, cacheDir);
    const standard = ed.hadiths.map((h) => ({ number: h.hadithnumber, arabicnumber: h.arabicnumber ?? null, text: h.text ?? "" }));
    const matches = matchBook(passages, standard);
    const matchedStandard = new Set(matches.map((m) => m.index));
    const withText = standard.filter((h) => h.text.trim()).length;
    const isMuslim = pair.edition === "muslim";
    const entries = matches.map((m) => {
      const s = standard[m.index];
      const row = [m.n, s.number, Math.round(m.score * 100), m.pass];
      if (isMuslim) row.push(String(s.arabicnumber ?? ""));
      return row;
    });
    const out = {
      schemaVersion: 1,
      versionUri: pair.versionUri,
      // The reference a reader cites, language-keyed (I11). Muslim is cited by Abdul-Baqi's number (the last column).
      label: { en: pair.label, bn: pair.labelBn },
      citeColumn: isMuslim ? "abdulBaqiNumber" : "standardNumber",
      standard: {
        source: `fawazahmed0/hadith-api@1 editions/ara-${pair.edition} (the sunnah.com numbering)`,
        licence: "Unlicense (public domain); only numbers are kept here",
        url: `${API}/editions/ara-${pair.edition}.min.json`,
        count: standard.length,
        countWithText: withText,
      },
      method: `word 3-grams after normalisation, 3-grams in more than ${MAX_POSTING} standard hadith ignored, best shared/smaller-set score, kept at >= ${MIN_SCORE}`,
      columns: isMuslim ? ["n", "standardNumber", "score", "pass", "abdulBaqiNumber"] : ["n", "standardNumber", "score", "pass"],
      openitiPassages: passages.length,
      matchedPassages: entries.length,
      standardCovered: matchedStandard.size,
      entries,
      generatedBy: "tools/hadith-data-pull/hadith-concordance.mjs",
    };
    fs.writeFileSync(path.join(OUT_DIR, `${pair.versionUri}.json`), JSON.stringify(out) + "\n");
    const row = { label: pair.label, versionUri: pair.versionUri, openitiPassages: passages.length, matchedPassages: entries.length,
      standardWithText: withText, standardCovered: matchedStandard.size };
    summary.push(row);
    console.log(`${pair.label}: ${entries.length}/${passages.length} passages matched; ${matchedStandard.size}/${withText} standard hadith (with text) covered`);
  }
  fs.writeFileSync(path.join(OUT_DIR, "summary.json"), JSON.stringify({ schemaVersion: 1, note: "Generated by tools/hadith-data-pull/hadith-concordance.mjs. Do not edit by hand.", books: summary }, null, 1) + "\n");
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exitCode = 1; });
