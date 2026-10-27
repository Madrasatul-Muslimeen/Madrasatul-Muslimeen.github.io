// HadeethEnc references: the book, chapter and number of each HadeethEnc hadith (PCF MSA J103, Round 1).
//
// WHY. HadeethEnc gives a hadith's words and a line such as "رواه مسلم" or "متفق عليه", never a number or a chapter.
// The Owner (28 Oct 2026): "have all Hadith books reference to original book's Hadith numbers … re-checked by
// yourself". This finds, for each hadith and EACH book its line names, the same words in that book in the library
// (tools/hadith-data-pull/output/openiti-release/split), and records where they are.
//
// RULES. (1) Only a book the line NAMES is searched: a hadith found in another book is not its reference.
// (2) "متفق عليه" names al-Bukhari and Muslim. (3) A book the library does not hold (Ibn Hibban, al-Hakim,
// al-Nasa'i's Kubra …) is recorded as "outside", never searched for in a different book.
// (4) Nothing here is shown to a reader. Round 2 (hadeethenc-references-check.mjs) decides what is proven.
//
// HOW. The words are matched the way the concordance and the links are (hadith-concordance.mjs): both texts
// normalised, word 3-grams, 3-grams found in more than MAX_POSTING passages of that book ignored (shared chains of
// narrators). Score = HadeethEnc 3-grams found in the passage / all its 3-grams. The best and second-best passages
// are both kept, so Round 2 can see a close call.
//
// WHAT IT STORES. Numbers only: output/hadeethenc-references/candidates.json, one row per (hadith, named book):
// [hadeethencId, book, n, editionNumber, standardNumber, citeNumber, score, secondN, secondScore, via]. Chapter names are read from
// the book's own shard by `n` when shown, so no text is copied here.
//
// Usage (repository root): node tools/hadith-data-pull/hadeethenc-references.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shingles } from "./hadith-concordance.mjs";
import { readHadeethEncArabic } from "./hadeethenc-openiti-links.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPLIT_DIR = path.join(__dirname, "output", "openiti-release", "split");
const CONC_DIR = path.join(__dirname, "output", "concordance");
const OUT_DIR = path.join(__dirname, "output", "hadeethenc-references");

export const MAX_POSTING = 40;
export const MIN_SHINGLES = 3;

/** The library's books by the key used in this job. */
export const BOOKS = {
  bukhari: "0256Bukhari.Sahih.JK000110-ara1",
  muslim: "0261Muslim.Sahih.Shamela0001727-ara1",
  abudawud: "0275AbuDawudSijistani.Sunan.JK000142-ara1",
  tirmidhi: "0279Tirmidhi.Sunan.JK000140-ara1",
  nasai: "0303Nasai.SunanSughra.JK000130-ara1",
  ibnmajah: "0273IbnMaja.Sunan.JK000141-ara1",
  ahmad: "0241IbnHanbal.Musnad.Shamela0025794-ara1",
  malik: "0179MalikIbnAnas.Muwatta.Shamela0028107-ara1",
  darimi: "0255CabdAllahDarimi.Sunan.JK000842-ara1",
  adab: "0256Bukhari.AdabMufrad.JK000011-ara1",
  nasaiAmal: "0303Nasai.CamalYawmWaLayla.JK000735-ara1",
  ibnsunni: "0364IbnSunniDinawari.CamalYawmWaLayl.JK000943-ara1",
};

/**
 * Pure: an Arabic attribution line -> { books: [key…] in the library, outside: [name…] not in it }.
 * Longer names are taken out first, so "البخاري في الأدب المفرد" is never also read as al-Bukhari's Sahih,
 * and "النسائي في الكبرى" (the Kubra, not in the library) never as the Sunan.
 */
export function parseAttribution(line) {
  let s = ` ${String(line ?? "").replace(/[ًٌٍَُِّْ]/g, "").replace(/\s+/g, " ")} `;
  const books = new Set();
  const outside = new Set();
  const take = (re, key, isOutside = false) => {
    if (re.test(s)) { (isOutside ? outside : books).add(key); s = s.replace(new RegExp(re.source, "g"), " "); }
  };
  take(/متفق عليها?/, "agreed");
  if (books.delete("agreed")) { books.add("bukhari"); books.add("muslim"); }
  take(/البخاري في الأدب المفرد|الأدب المفرد/, "adab");
  take(/النسائي في (السنن )?الكبرى|السنن الكبرى للنسائي/, "النسائي في الكبرى", true);
  take(/النسائي في عمل اليوم والليلة/, "nasaiAmal");
  take(/ابن السني/, "ibnsunni");
  take(/البخاري/, "bukhari");
  take(/مسلم/, "muslim");
  take(/أبو داود|أبي داود/, "abudawud");
  take(/الترمذي/, "tirmidhi");
  take(/النسائي/, "nasai");
  take(/ابن ماجه/, "ibnmajah");
  take(/مالك/, "malik");
  take(/الدارمي/, "darimi");
  take(/أحمد/, "ahmad");
  // What is left names books outside the library (or is connective wording): keep the names, drop the glue.
  const left = s.replace(/الرواية (الأولى|الثانية|الثالثة)\s*:?/g, " ").replace(/رواه(ا|ما)?|أخرجه|وغيره(م)?|بنحوه|بمعناه|نحوه|مختصرا|مطولا|[:.،,()]/g, " ")
    .split(/\s+و|\s+/).map((w) => w.trim()).filter((w) => w && w !== "في" && w !== "و");
  if (left.length) outside.add(left.join(" "));
  return { books: [...books], outside: [...outside] };
}

/**
 * Pure: the Prophet's (or the Companion's) quoted words only -- the «…» parts HadeethEnc marks -- or null when they
 * are too short to search by. The book wraps the same words in its own chain of narrators and lead-in, so the
 * HadeethEnc lead-in ("عن أبي هريرة رضي الله عنه قال …") counts against a match that is really there (J103 Round 4).
 */
export function matnOf(text, minWords = 6) {
  const parts = String(text ?? "").match(/«([^»]+)»/g);
  if (!parts) return null;
  const q = parts.map((x) => x.slice(1, -1)).join(" ");
  return q.trim().split(/\s+/).length >= minWords ? q : null;
}

function readBook(uri) {
  const index = JSON.parse(fs.readFileSync(path.join(SPLIT_DIR, uri, "index.json"), "utf8"));
  const passages = [];
  for (const ch of index.chapters) for (const f of ch.shardFiles) {
    for (const h of JSON.parse(fs.readFileSync(path.join(SPLIT_DIR, uri, f), "utf8")).hadiths) {
      if (h.kind === "hadith" || h.kind === "passage") passages.push({ n: h.n, number: h.number ?? null, text: h.text });
    }
  }
  return passages;
}

function readStandard(uri) {
  const p = path.join(CONC_DIR, `${uri}.json`);
  if (!fs.existsSync(p)) return null;
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  const cols = d.columns;
  // standardNumber is the translation's key (fawazahmed0's numbering); the cited number is d.citeColumn
  // (Muslim: Abdul-Baqi's, "1279.01" cited as 1279, as app/js/openiti-corpus.js buildConcordance does).
  const m = new Map();
  for (const row of d.entries) {
    const r = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
    if (r.pass === undefined || r.pass) {
      let cite = d.citeColumn ? r[d.citeColumn] : r.standardNumber;
      if (d.citeColumn === "abdulBaqiNumber") cite = cite ? String(cite).replace(/\.\d+$/, "") : null;
      m.set(r.n, { standard: r.standardNumber, cite: cite || null });
    }
  }
  return m;
}

/** Pure: one book's passages -> a search function (HadeethEnc text -> [best, second]). */
export function bookSearcher(passages, { maxPosting = MAX_POSTING } = {}) {
  const postings = new Map();
  passages.forEach((p, i) => { for (const g of shingles(p.text)) { let a = postings.get(g); if (!a) postings.set(g, (a = [])); a.push(i); } });
  return (text) => {
    const a = shingles(text);
    if (a.size < MIN_SHINGLES) return { size: a.size, best: null, second: null };
    const counts = new Map();
    let usable = 0;
    for (const g of a) {
      const post = postings.get(g);
      if (post && post.length > maxPosting) continue;
      usable++;
      if (!post) continue;
      for (const i of post) counts.set(i, (counts.get(i) ?? 0) + 1);
    }
    const ranked = [...counts].sort((x, y) => y[1] - x[1]).slice(0, 2);
    const at = (r) => (r ? { i: r[0], score: r[1] / Math.max(1, usable) } : null);
    return { size: a.size, best: at(ranked[0]), second: at(ranked[1]) };
  };
}

function main() {
  const he = readHadeethEncArabic();
  const searchers = {};
  const passagesOf = {};
  const standardOf = {};
  for (const [key, uri] of Object.entries(BOOKS)) {
    passagesOf[key] = readBook(uri);
    searchers[key] = bookSearcher(passagesOf[key]);
    standardOf[key] = readStandard(uri);
  }
  const rows = [];
  const outsideCount = new Map();
  let noBook = 0;
  for (const h of he.values()) {
    const { books, outside } = parseAttribution(h.attribution);
    for (const o of outside) outsideCount.set(o, (outsideCount.get(o) ?? 0) + 1);
    if (!books.length) noBook++;
    for (const key of books) {
      // The whole text, and the quoted words alone; the better match is kept, with which one it was ("via").
      let r = searchers[key](h.text);
      let via = "full";
      const matn = matnOf(h.text);
      if (matn) {
        const m = searchers[key](matn);
        if (m.best && (!r.best || m.best.score > r.best.score)) { r = m; via = "matn"; }
      }
      const p = r.best ? passagesOf[key][r.best.i] : null;
      const q = r.second ? passagesOf[key][r.second.i] : null;
      const st = p ? (standardOf[key]?.get(p.n) ?? null) : null;
      rows.push([Number(h.id), key, p?.n ?? null, p?.number ?? null, st?.standard ?? null, st?.cite ?? null,
        r.best ? Math.round(r.best.score * 100) : 0, q?.n ?? null, r.second ? Math.round(r.second.score * 100) : 0, via]);
    }
  }
  rows.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "candidates.json"), JSON.stringify({
    schemaVersion: 1, note: "Generated by tools/hadith-data-pull/hadeethenc-references.mjs (J103 Round 1). Do not edit by hand. Not proven: Round 2 decides.",
    columns: ["hadeethencId", "book", "n", "editionNumber", "standardNumber", "citeNumber", "score", "secondN", "secondScore", "via"],
    books: BOOKS, hadeethencArabic: he.size, noBookInLibrary: noBook,
    outside: Object.fromEntries([...outsideCount].sort((a, b) => b[1] - a[1])), rows,
  }) + "\n");
  const by = (min) => rows.filter((r) => r[6] >= min).length;
  console.log(`${he.size} HadeethEnc hadith; ${rows.length} (hadith, named book) pairs; ${noBook} name no book in the library`);
  for (const m of [90, 80, 70, 60, 50]) console.log(`  score >= ${m}: ${by(m)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
