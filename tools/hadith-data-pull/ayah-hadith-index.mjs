// The āyah–hadith index (Keys to Understanding, Round 1; Owner's go PCF J03, 12 Oct 2026).
//
// Which hadith in our books quote which āyah, found by two tests and kept as data:
//   Test 1, "label": the printed edition marks the Qur'an quotation itself, e.g. {...} [يس: 38]. Muslim, the
//            Musnad, the Muwatta' and Riyad as-Salihin carry these. The label is parsed to surah:ayah.
//   Test 2, "words": in the books WITHOUT labels, a run of five words (no vowel marks, alif forms unified) that occurs
//            in EXACTLY ONE āyah of the Qur'an. A run found in two or more āyāt is never used, so common phrases
//            cannot match. The run is extended while the next five-word window still points at the same single āyah.
//
// Finding is not grading: nothing here says whether a hadith is sound. Qur'an text and hadith text are only read.
//
// Reads  tools/hadith-data-pull/output/openiti-release/split/<book>/ , output/concordance/ and
//        tools/quran-data-pull/output/surahs/ .
// Writes tools/hadith-data-pull/output/ayah-hadith/<surah>.json       { "<ayah>": [ hit, ... ] }
//        tools/hadith-data-pull/output/ayah-hadith/by-book/<book>.json { "<n>": [ [surah, ayah, test], ... ] }
//   hit = { book (the OpenITI version uri), n (the passage's permanent position in that book, what the Hadith library
//           opens), number (the STANDARD hadith number through the concordance; the book's own number for books with
//           no concordance), openitiId, test, quote }
// Usage (repository root): node tools/hadith-data-pull/ayah-hadith-index.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPLIT = path.join(__dirname, "output", "openiti-release", "split");
const CONC = path.join(__dirname, "output", "concordance");
const QURAN = path.join(__dirname, "..", "quran-data-pull", "output", "surahs");
export const OUT = path.join(__dirname, "output", "ayah-hadith");

export const RUN_WORDS = 5;
export const LABELLED_BOOKS = new Set([
  "0179MalikIbnAnas.Muwatta.Shamela0028107-ara1",
  "0241IbnHanbal.Musnad.Shamela0025794-ara1",
  "0261Muslim.Sahih.Shamela0001727-ara1",
  "0676Nawawi.RiyadSalihin.Shamela0012014-ara1",
]);

/** Arabic words as a spelling-tolerant skeleton: vowel marks, tatweel and Qur'anic signs removed, every alif form and
 *  hamza dropped (the Uthmani script writes some alifs only as a small mark, the hadith books write them out),
 *  yeh / alif maqsura and teh marbuta unified, doubled letters collapsed. Applied identically to both sides, so a
 *  run still has to match letter for letter in the same order. */
export function arabicWords(s) {
  return String(s ?? "")
    .replace(/[ً-ٰٟؐ-ؚۖ-ۭـ]/g, "")
    .replace(/[أإآٱاءؤئ]/g, "")
    .replace(/[ىي]/g, "ي").replace(/ة/g, "ه")
    .replace(/[^ء-ي\s]/g, " ")
    .replace(/(.)\1+/g, "$1")
    .split(/\s+/).filter(Boolean);
}

// Surah names keep their alifs (An-Nas and An-Nisa are the same word once alifs are dropped).
export const surahNameKey = (s) => String(s ?? "")
  .replace(/[ً-ٰٟؐ-ؚۖ-ۭـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
  .replace(/[^ء-ي\s]/g, " ").trim().split(/\s+/).filter((w, i) => !(i === 0 && w === "سوره")).join("").replace(/^ال/, "");

export function loadQuran() {
  const ayahs = []; // { surah, ayah, words }
  const names = new Map();
  for (let n = 1; n <= 114; n += 1) {
    const d = JSON.parse(fs.readFileSync(path.join(QURAN, `surah_${String(n).padStart(3, "0")}.json`), "utf8"));
    names.set(surahNameKey(d.surahNameArabic), n);
    for (const a of d.ayahs) ayahs.push({ surah: n, ayah: a.ayah, words: arabicWords(a.uthmaniText) });
  }
  names.set("ذريات", 51); // the editions' spelling of Adh-Dhariyat
  return { ayahs, names };
}

/** The surah number a printed label names, or null. A label that lost its first alif ("لأنفال") still resolves. */
export function surahOfLabel(names, raw) {
  const key = surahNameKey(raw);
  return names.get(key) ?? names.get(key.replace(/^ل/, "ا")) ?? names.get(key.replace(/^ل/, "")) ?? null;
}

/** gram -> ayah code (surah*1000+ayah), or -1 when the gram occurs in more than one āyah. */
export function buildGramMap(ayahs, k = RUN_WORDS) {
  const map = new Map();
  for (const a of ayahs) {
    const code = a.surah * 1000 + a.ayah;
    for (let i = 0; i + k <= a.words.length; i += 1) {
      const g = a.words.slice(i, i + k).join(" ");
      const prev = map.get(g);
      map.set(g, prev === undefined || prev === code ? code : -1);
    }
  }
  return map;
}

const LABEL = /\[([^\]\[:]{2,20}):\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*\]/g;
/** Test 1: [{ surah, ayah, quote }] from the printed labels in one passage. */
export function labelHits(text, names, ayahCount) {
  const out = [];
  for (const m of String(text).matchAll(LABEL)) {
    const surah = surahOfLabel(names, m[1]);
    if (!surah) continue;
    const from = Number(m[2]);
    const to = m[3] ? Number(m[3]) : from;
    if (!(from >= 1) || to < from || to - from > 20) continue;
    // the quotation sits in braces just before the label
    const before = String(text).slice(Math.max(0, m.index - 400), m.index);
    const q = before.match(/\{([^{}]+)\}\s*$/);
    for (let a = from; a <= to; a += 1) {
      if (a > ayahCount[surah]) continue;
      out.push({ surah, ayah: a, quote: q ? q[1].trim() : m[0] });
    }
  }
  return out;
}

/** Test 2: [{ surah, ayah, quote }] for runs of >= k words found in exactly one āyah. */
export function wordHits(text, gramMap, k = RUN_WORDS) {
  const words = arabicWords(text);
  const found = new Map(); // code -> longest run (words)
  let i = 0;
  while (i + k <= words.length) {
    const code = gramMap.get(words.slice(i, i + k).join(" "));
    if (code === undefined || code === -1) { i += 1; continue; }
    let end = i + k;
    while (end < words.length && gramMap.get(words.slice(end - k + 1, end + 1).join(" ")) === code) end += 1;
    const run = words.slice(i, end).join(" ");
    if (!found.has(code) || found.get(code).length < run.length) found.set(code, run);
    i = end;
  }
  return [...found].map(([code, quote]) => ({ surah: Math.floor(code / 1000), ayah: code % 1000, quote }));
}

/** n -> { number, standard } for a book that has a concordance: "number" is what the Hadith library cites (the
 *  concordance's citeColumn: the standard number, or Abdul-Baqi's for Muslim), "standard" the hadith-api number. */
export function concordanceFor(versionUri) {
  const file = path.join(CONC, `${versionUri}.json`);
  if (!fs.existsSync(file)) return null;
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  const stdCol = d.columns.indexOf("standardNumber");
  const citeCol = d.columns.indexOf(d.citeColumn);
  const map = new Map();
  for (const row of d.entries) {
    const standard = Number(row[stdCol]) > 0 ? Math.trunc(Number(row[stdCol])) : null;
    const cite = String(row[citeCol] ?? "").trim().replace(/\.\d+$/, "");
    const number = cite ? Number(cite) : standard;
    if (Number.isFinite(number) && number > 0) map.set(row[0], { number, standard });
  }
  return map;
}

export function* passagesOf(versionUri) {
  const dir = path.join(SPLIT, versionUri);
  const index = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));
  for (const ch of index.chapters) {
    for (const f of ch.shardFiles) {
      const shard = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      for (const h of shard.hadiths) yield h;
    }
  }
}

export function build() {
  const { ayahs, names } = loadQuran();
  const ayahCount = {};
  for (const a of ayahs) ayahCount[a.surah] = Math.max(ayahCount[a.surah] ?? 0, a.ayah);
  const gramMap = buildGramMap(ayahs);
  const books = fs.readdirSync(SPLIT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const bySurah = {};
  const byBook = {};
  const stats = { books: {}, texts: 0 };
  for (const versionUri of books) {
    const std = concordanceFor(versionUri);
    const labelled = LABELLED_BOOKS.has(versionUri);
    byBook[versionUri] = {};
    const st = { texts: 0, hits: 0, label: 0, words: 0, noNumber: 0 };
    for (const h of passagesOf(versionUri)) {
      if (!h.text) continue;
      st.texts += 1;
      const hits = labelled ? labelHits(h.text, names, ayahCount).map((x) => ({ ...x, test: "label" }))
        : wordHits(h.text, gramMap).map((x) => ({ ...x, test: "words" }));
      for (const x of hits) {
        const c = std ? std.get(h.n) ?? null : (h.number != null ? { number: h.number, standard: h.number } : null);
        const number = c ? c.number : null;
        // A passage with no citable number (a chapter heading, an editor's note, a continuation the concordance
        // could not match) cannot be shown as "book + number", so it is not linked; counted so nothing is hidden.
        if (number === null) { st.noNumber += 1; continue; }
        const hit = { book: versionUri, n: h.n, number, standard: c.standard, openitiId: `openiti:${versionUri}:${h.n}`, test: x.test, quote: x.quote };
        const s = (bySurah[x.surah] ??= {});
        const list = (s[x.ayah] ??= []);
        if (list.some((o) => o.book === versionUri && o.n === h.n)) continue; // one link per passage per āyah
        list.push(hit);
        (byBook[versionUri][h.n] ??= []).push([x.surah, x.ayah, x.test]);
        st.hits += 1;
        st[x.test] += 1;
      }
    }
    stats.texts += st.texts;
    stats.books[versionUri] = st;
  }
  return { bySurah, byBook, stats, ayahCount };
}

export function summarise({ bySurah, stats, ayahCount }) {
  const ayat = { label: new Set(), words: new Set(), all: new Set() };
  for (const [s, o] of Object.entries(bySurah)) {
    for (const [a, list] of Object.entries(o)) {
      const key = `${s}:${a}`;
      ayat.all.add(key);
      for (const h of list) ayat[h.test].add(key);
    }
  }
  return {
    texts: stats.texts,
    totalAyat: Object.values(ayahCount).reduce((x, y) => x + y, 0),
    ayatLabel: ayat.label.size, ayatWords: ayat.words.size, ayatAny: ayat.all.size,
    surahsWithHits: Object.keys(bySurah).length,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = build();
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, "by-book"), { recursive: true });
  // every surah gets a file (an empty object when nothing quotes it) so a card never has to fetch a 404
  for (let s = 1; s <= 114; s += 1) fs.writeFileSync(path.join(OUT, `${s}.json`), JSON.stringify(result.bySurah[s] ?? {}));
  for (const [b, o] of Object.entries(result.byBook)) fs.writeFileSync(path.join(OUT, "by-book", `${b}.json`), JSON.stringify(o));
  const sum = summarise(result);
  fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify({ ...sum, books: result.stats.books }, null, 1));
  console.log(`texts read: ${sum.texts}`);
  for (const [b, st] of Object.entries(result.stats.books)) console.log(`  ${b}: ${st.texts} texts, ${st.hits} links (label ${st.label}, words ${st.words}), no number ${st.noNumber}`);
  console.log(`ayat found by Test 1 (label): ${sum.ayatLabel}`);
  console.log(`ayat found by Test 2 (words): ${sum.ayatWords}`);
  console.log(`ayat found by either: ${sum.ayatAny} of ${sum.totalAyat}, in ${sum.surahsWithHits} of 114 surahs`);
}
