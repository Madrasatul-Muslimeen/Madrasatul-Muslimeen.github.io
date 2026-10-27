// HadeethEnc references, Round 2: the re-check (PCF MSA J103). Decides which Round 1 candidates are PROVEN.
//
// The Owner (28 Oct 2026): "these references you build must be re-checked by yourself". A reference is shown only
// when separate methods agree; anything else stays "number not yet found", never a guess.
//
// For a book with a standard (sunnah.com) numbering in fawazahmed0/hadith-api (al-Bukhari, Muslim, Abu Dawud,
// al-Tirmidhi, al-Nasa'i, Ibn Majah, Malik), a candidate is PROVEN when all hold:
//   R1  Round 1: HadeethEnc's Arabic words are found in the library's own edition (score >= R1_MIN).
//   D   Direct: an independent search of HadeethEnc's words over the STANDARD edition itself (a different printing,
//       numbered as people cite it) puts the same standard number at the top (repeats of the same words tie), at
//       >= DIRECT_MIN. This re-checks the number, not only the words.
//   E   English, where both sides have it: HadeethEnc's English and the book's English translation at that number
//       share enough rare words (IDF-weighted, >= EN_MIN). Different translators, so this is a floor, not a match.
// A candidate Round 1 missed (R1 < R1_MIN) is RECOVERED when D is strong (>= DIRECT_RECOVER) and E holds at
// >= EN_RECOVER: two independent texts, two languages.
//
// For a book with no standard numbering here (Ahmad, al-Darimi, al-Adab al-Mufrad, al-Nasa'i's and Ibn al-Sunni's
// 'Amal al-Yawm wa'l-Layla) the edition's own number is used, and the second check is a different method on the
// same text: the longest run of the hadith's words, in order, in the passage (LCS >= LCS_MIN), and a clear margin
// over the next passage (R1 - second >= MARGIN).
//
// The standard editions are downloaded to --cache (never committed; numbers only are kept, as the concordance does).
// Usage (repository root):
//   NODE_USE_ENV_PROXY=1 node tools/hadith-data-pull/hadeethenc-references-check.mjs --cache <dir>
// Writes tools/hadith-data-pull/output/hadeethenc-references/references.json and summary.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shingles, normaliseArabic } from "./hadith-concordance.mjs";
import { readHadeethEncArabic } from "./hadeethenc-openiti-links.mjs";
import { BOOKS } from "./hadeethenc-references.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "output");
const REF_DIR = path.join(OUT, "hadeethenc-references");
const SPLIT_DIR = path.join(OUT, "openiti-release", "split");
const API = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";

export const R1_MIN = 60, DIRECT_MIN = 60, EN_MIN = 0.2, DIRECT_RECOVER = 75, EN_RECOVER = 0.3, LCS_MIN = 0.7, MARGIN = 10, TIE = 2;
export const STANDARD = { bukhari: "bukhari", muslim: "muslim", abudawud: "abudawud", tirmidhi: "tirmidhi", nasai: "nasai", ibnmajah: "ibnmajah", malik: "malik" };

const STOP = new Set("the a an and of to in on at by for with from that this it he she they his her him them was were is are be been i you we my your our me us as not no or but so if then when which who what said says say upon peace blessings allah messenger prophet narrated reported may pleased abu ibn bin one will would have has had there their do did all any some".split(" "));
export function enTokens(t) {
  return new Set((String(t ?? "").toLowerCase().replace(/’/g, "'").match(/[a-z]+/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.slice(0, 5)));
}

/** Pure: longest common subsequence of words, as a share of `a`'s words (a = HadeethEnc, b = passage). */
export function lcsShare(a, b) {
  const x = normaliseArabic(a).split(" ").filter(Boolean), y = normaliseArabic(b).split(" ").filter(Boolean);
  if (!x.length) return 0;
  let prev = new Uint16Array(y.length + 1), cur = new Uint16Array(y.length + 1);
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) cur[j] = x[i - 1] === y[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    [prev, cur] = [cur, prev];
  }
  return prev[y.length] / x.length;
}

function arg(name) { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; }

async function standardEdition(ed, cache) {
  const p = path.join(cache, `ara-${ed}.json`);
  if (!fs.existsSync(p)) {
    const r = await fetch(`${API}/ara-${ed}.min.json`);
    if (!r.ok) throw new Error(`ara-${ed}: ${r.status}`);
    fs.writeFileSync(p, await r.text());
  }
  return JSON.parse(fs.readFileSync(p, "utf8")).hadiths.filter((h) => h.text);
}

function directSearcher(hadiths) {
  const postings = new Map();
  hadiths.forEach((h, i) => { for (const g of shingles(h.text)) { let a = postings.get(g); if (!a) postings.set(g, (a = [])); a.push(i); } });
  return (text) => {
    const a = shingles(text);
    const counts = new Map();
    let usable = 0;
    for (const g of a) {
      const post = postings.get(g);
      if (post && post.length > 40) continue;
      usable++;
      if (post) for (const i of post) counts.set(i, (counts.get(i) ?? 0) + 1);
    }
    const ranked = [...counts].map(([i, c]) => ({ number: hadiths[i].hadithnumber, score: Math.round((100 * c) / Math.max(1, usable)) })).sort((p, q) => q.score - p.score);
    return ranked;
  };
}

function readEnglish() {
  const he = new Map();
  for (const f of fs.readdirSync(path.join(OUT, "hadeethenc", "en")).filter((x) => /^cat-\d+\.json$/.test(x))) {
    for (const h of JSON.parse(fs.readFileSync(path.join(OUT, "hadeethenc", "en", f), "utf8")).hadiths ?? []) he.set(String(h.id), h.hadeeth);
  }
  const books = {};
  const df = new Map();
  let N = 0;
  for (const [key, ed] of Object.entries(STANDARD)) {
    const dir = path.join(OUT, "translations", ed, "en");
    books[key] = new Map();
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      for (const [n, t] of Object.entries(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))) {
        if (typeof t !== "string") continue;
        books[key].set(Number(n), t);
        for (const w of enTokens(t)) df.set(w, (df.get(w) ?? 0) + 1);
        N++;
      }
    }
  }
  const idf = (w) => Math.log((N + 1) / ((df.get(w) ?? 0) + 1));
  const sim = (a, b) => {
    const A = enTokens(a), B = enTokens(b);
    let tot = 0, hit = 0;
    for (const w of A) { const v = idf(w); tot += v; if (B.has(w)) hit += v; }
    return tot ? hit / tot : 0;
  };
  return { he, books, sim };
}

const reverseCache = {};
/** standard number -> { n, edition, cite } for a book, from its concordance (the best-scoring passage wins). */
function reverseConcordance(book) {
  if (reverseCache[book]) return reverseCache[book];
  const m = new Map();
  const p = path.join(OUT, "concordance", `${BOOKS[book]}.json`);
  if (fs.existsSync(p)) {
    const d = JSON.parse(fs.readFileSync(p, "utf8"));
    const best = new Map();
    for (const row of d.entries) {
      const r = Object.fromEntries(d.columns.map((c, i) => [c, row[i]]));
      if (r.pass === 0) continue;
      let cite = d.citeColumn ? r[d.citeColumn] : r.standardNumber;
      if (d.citeColumn === "abdulBaqiNumber") cite = cite ? String(cite).replace(/\.\d+$/, "") : null;
      if (!best.has(r.standardNumber) || best.get(r.standardNumber).score < r.score) best.set(r.standardNumber, { n: r.n, cite: cite || null, score: r.score });
    }
    const passages = readPassages(BOOKS[book], true);
    for (const [num, v] of best) m.set(num, { n: v.n, cite: v.cite, edition: passages.get(v.n)?.number ?? null });
  }
  return (reverseCache[book] = m);
}

function readPassages(uri, full = false) {
  const index = JSON.parse(fs.readFileSync(path.join(SPLIT_DIR, uri, "index.json"), "utf8"));
  const m = new Map();
  for (const ch of index.chapters) for (const f of ch.shardFiles) for (const h of JSON.parse(fs.readFileSync(path.join(SPLIT_DIR, uri, f), "utf8")).hadiths) m.set(h.n, full ? h : h.text);
  return m;
}

async function main() {
  const cache = arg("--cache");
  if (!cache) { console.error("usage: --cache <dir>"); process.exit(2); }
  fs.mkdirSync(cache, { recursive: true });
  const C = JSON.parse(fs.readFileSync(path.join(REF_DIR, "candidates.json"), "utf8"));
  const rows = C.rows.map((r) => Object.fromEntries(C.columns.map((c, i) => [c, r[i]])));
  const heAr = readHadeethEncArabic();
  const en = readEnglish();
  const direct = {};
  for (const [key, ed] of Object.entries(STANDARD)) direct[key] = directSearcher(await standardEdition(ed, cache));
  const passages = {};
  const out = [];
  for (const r of rows) {
    const text = heAr.get(String(r.hadeethencId))?.text ?? "";
    const heEn = en.he.get(String(r.hadeethencId)) ?? null;
    const rec = { id: r.hadeethencId, book: r.book, n: r.n, edition: r.editionNumber, standard: r.standardNumber, cite: r.citeNumber, r1: r.score };
    if (STANDARD[r.book]) {
      const ranked = direct[r.book](text);
      const top = ranked[0]?.score ?? 0;
      const topSet = ranked.filter((x) => x.score >= top - TIE).map((x) => x.number);
      rec.direct = top;
      // Whether the standard edition's own best (ties within TIE) holds Round 1's number: the two searches agree.
      rec.agree = r.standardNumber != null && topSet.includes(r.standardNumber);
      const enAt = (num) => (heEn && en.books[r.book].get(num) ? en.sim(heEn, en.books[r.book].get(num)) : null);
      if (r.score >= R1_MIN && r.standardNumber != null && topSet.includes(r.standardNumber) && top >= DIRECT_MIN) {
        rec.en = enAt(r.standardNumber);
        rec.status = rec.en == null || rec.en >= EN_MIN ? "proven" : "unproven:english";
      } else if (top >= DIRECT_RECOVER && ranked[0]) {
        // Round 1 missed or disagreed: the standard edition's own best is a candidate if English agrees too.
        const num = ranked[0].number;
        rec.en = enAt(num);
        if (rec.en != null && rec.en >= EN_RECOVER) {
          // The library passage for that standard number (the concordance read backwards), so the card can open it.
          const back = reverseConcordance(r.book).get(num) ?? null;
          Object.assign(rec, { recovered: true, standard: num, n: back?.n ?? null, edition: back?.edition ?? null, cite: back?.cite ?? (r.book === "muslim" ? null : num), status: "proven" });
        } else rec.status = rec.en == null ? "unproven:no-english-to-confirm" : "unproven:english";
      } else rec.status = r.standardNumber == null && r.score >= R1_MIN ? "unproven:no-standard-number" : r.score < R1_MIN ? "unproven:not-found" : "unproven:numbers-disagree";
    } else {
      if (r.n == null || r.score < R1_MIN) rec.status = "unproven:not-found";
      else {
        passages[r.book] ??= readPassages(BOOKS[r.book]);
        rec.lcs = Math.round(100 * lcsShare(text, passages[r.book].get(r.n) ?? "")) / 100;
        rec.status = rec.lcs >= LCS_MIN && r.score - r.secondScore >= MARGIN ? "proven" : "unproven:second-method";
      }
    }
    out.push(rec);
  }
  const ids = new Set(out.map((r) => r.id));
  const provenIds = new Set(out.filter((r) => r.status === "proven").map((r) => r.id));
  const byBook = {};
  for (const r of out) { const b = (byBook[r.book] ??= { pairs: 0, proven: 0, recovered: 0, reasons: {} }); b.pairs++; if (r.status === "proven") { b.proven++; if (r.recovered) b.recovered++; } else b.reasons[r.status] = (b.reasons[r.status] ?? 0) + 1; }
  fs.writeFileSync(path.join(REF_DIR, "references.json"), JSON.stringify({ schemaVersion: 1,
    note: "Generated by tools/hadith-data-pull/hadeethenc-references-check.mjs (J103 Round 2). Do not edit by hand. Only status 'proven' may be shown.",
    thresholds: { R1_MIN, DIRECT_MIN, EN_MIN, DIRECT_RECOVER, EN_RECOVER, LCS_MIN, MARGIN, TIE }, rows: out }) + "\n");
  const summary = { schemaVersion: 1, hadeethencArabic: heAr.size, withInLibraryBook: ids.size, withAProvenReference: provenIds.size, books: byBook };
  fs.writeFileSync(path.join(REF_DIR, "summary.json"), JSON.stringify(summary, null, 1) + "\n");
  console.log(JSON.stringify(summary, null, 1));
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
