// Keys Round 1 -- data check for the āyah–hadith index (tools/hadith-data-pull/output/ayah-hadith/).
//   - the totals the script printed are the totals in the files, and sit near what the Architect measured on 10 Oct
//     (1,107 of 6,236 āyāt in 105 of 114 surahs; the difference is explained in the PR);
//   - no āyah key outside the Qur'an;
//   - every number resolves through the concordance (or is the book's own number where the book has no concordance);
//   - every Test 2 hit's words occur in that one āyah only; every Test 1 hit's label names that āyah;
//   - the reverse (by-book) files say exactly what the surah files say.
// Run from the repository root.
import fs from "node:fs";
import path from "node:path";
import { loadQuran, buildGramMap, concordanceFor, passagesOf, arabicWords, RUN_WORDS, OUT } from "../hadith-data-pull/ayah-hadith-index.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

const { ayahs } = loadQuran();
const ayahCount = {};
const wordsOf = new Map();
for (const a of ayahs) { ayahCount[a.surah] = Math.max(ayahCount[a.surah] ?? 0, a.ayah); wordsOf.set(a.surah * 1000 + a.ayah, a.words); }
const gramMap = buildGramMap(ayahs);

const bySurah = {};
for (let s = 1; s <= 114; s += 1) {
  const f = path.join(OUT, `${s}.json`);
  check(`surah ${s} has its file`, fs.existsSync(f), f);
  bySurah[s] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
}
const hits = [];
for (const [s, o] of Object.entries(bySurah)) for (const [a, list] of Object.entries(o)) for (const h of list) hits.push({ s: Number(s), a: Number(a), h });

// ---- totals ----
const summary = JSON.parse(fs.readFileSync(path.join(OUT, "summary.json"), "utf8"));
const seen = { all: new Set(), label: new Set(), words: new Set() };
for (const { s, a, h } of hits) { seen.all.add(`${s}:${a}`); seen[h.test]?.add(`${s}:${a}`); }
const surahsWithHits = Object.values(bySurah).filter((o) => Object.keys(o).length).length;
check("the Qur'an has 6,236 āyāt", summary.totalAyat === 6236 && ayahs.length === 6236, String(ayahs.length));
check("summary.json matches the files: āyāt found", summary.ayatAny === seen.all.size, `${summary.ayatAny} vs ${seen.all.size}`);
check("summary.json matches the files: Test 1 āyāt", summary.ayatLabel === seen.label.size, `${summary.ayatLabel} vs ${seen.label.size}`);
check("summary.json matches the files: Test 2 āyāt", summary.ayatWords === seen.words.size, `${summary.ayatWords} vs ${seen.words.size}`);
check("surahs with a hit match summary.json", summary.surahsWithHits === surahsWithHits, `${summary.surahsWithHits} vs ${surahsWithHits}`);
check("only the two tests appear", hits.every(({ h }) => h.test === "label" || h.test === "words"));
check("about the measured size: 900-1,400 āyāt found (Architect, 10 Oct: 1,107)", seen.all.size >= 900 && seen.all.size <= 1400, String(seen.all.size));
check("about the measured spread: 95-110 surahs have a hit (Architect: 105)", surahsWithHits >= 95 && surahsWithHits <= 110, String(surahsWithHits));
check("both tests contribute (Test 1 >= 500 āyāt, Test 2 >= 500 āyāt)", seen.label.size >= 500 && seen.words.size >= 500, `${seen.label.size} / ${seen.words.size}`);

// ---- keys inside the Qur'an ----
check("no āyah key outside the Qur'an", Object.entries(bySurah).every(([s, o]) => Object.keys(o).every((a) => /^\d+$/.test(a) && Number(a) >= 1 && Number(a) <= (ayahCount[s] ?? 0))),
  JSON.stringify(Object.entries(bySurah).flatMap(([s, o]) => Object.keys(o).filter((a) => Number(a) < 1 || Number(a) > (ayahCount[s] ?? 0)).map((a) => `${s}:${a}`)).slice(0, 5)));

// ---- numbers resolve ----
const books = [...new Set(hits.map(({ h }) => h.book))];
const conc = new Map(books.map((b) => [b, concordanceFor(b)]));
const ownNumber = new Map();
for (const b of books.filter((x) => !conc.get(x))) for (const p of passagesOf(b)) ownNumber.set(`${b}:${p.n}`, p.number);
const bad = [];
for (const { s, a, h } of hits) {
  const c = conc.get(h.book);
  const ok = c ? c.get(h.n)?.number === h.number : ownNumber.get(`${h.book}:${h.n}`) === h.number;
  if (!ok || !(h.number > 0) || h.openitiId !== `openiti:${h.book}:${h.n}`) bad.push(`${s}:${a} ${h.book} n${h.n} #${h.number}`);
}
check("every hit's number resolves through the concordance (or is the book's own number)", bad.length === 0, bad.slice(0, 5).join("; "));
check("books with a concordance: Bukhari, Muslim, Tirmidhi are among them", ["0256Bukhari.Sahih.JK000110-ara1", "0261Muslim.Sahih.Shamela0001727-ara1", "0279Tirmidhi.Sunan.JK000140-ara1"].every((b) => conc.get(b)));

// ---- Test 2: the words occur in that one āyah only ----
const t2bad = [];
let t2checked = 0;
for (const { s, a, h } of hits.filter(({ h }) => h.test === "words")) {
  t2checked += 1;
  const q = arabicWords(h.quote);
  const code = s * 1000 + a;
  let ok = q.length >= RUN_WORDS;
  for (let i = 0; ok && i + RUN_WORDS <= q.length; i += 1) ok = gramMap.get(q.slice(i, i + RUN_WORDS).join(" ")) === code; // every five-word window is in exactly this āyah
  if (ok) ok = (wordsOf.get(code) ?? []).join(" ").includes(q.join(" ")); // and the whole run is one stretch of it
  if (!ok) t2bad.push(`${s}:${a} ${h.quote}`);
}
check(`Test 2: all ${t2checked} hits have >= ${RUN_WORDS} words found in that one āyah and no other`, t2checked > 0 && t2bad.length === 0, t2bad.slice(0, 3).join("; "));
// the same claim from the other side: count āyāt containing the run, straight from the text
let multi = 0;
for (const { h } of hits.filter(({ h }) => h.test === "words").slice(0, 400)) {
  const q = arabicWords(h.quote).join(" ");
  let n = 0;
  for (const w of wordsOf.values()) if (` ${w.join(" ")} `.includes(` ${q} `)) n += 1; // whole words only
  if (n !== 1) multi += 1;
}
check("Test 2 (independent text search, first 400 hits): each run is in exactly one āyah", multi === 0, String(multi));

// ---- Test 1: the label names the āyah ----
const t1 = hits.filter(({ h }) => h.test === "label");
check("Test 1 hits exist and carry the printed quotation or its label", t1.length > 0 && t1.every(({ h }) => String(h.quote).length > 0));

// ---- the expectations from the issue ----
const has = (s, a, book, number) => (bySurah[s][a] ?? []).some((h) => h.book.includes(book) && h.number === number);
check("36:38 -> Bukhari 4802, Bukhari 3199, Muslim 159", has(36, 38, "Bukhari.Sahih", 4802) && has(36, 38, "Bukhari.Sahih", 3199) && has(36, 38, "Muslim.Sahih", 159));
check("36:12 -> Tirmidhi 3226", has(36, 12, "Tirmidhi", 3226));

// ---- the reverse files agree ----
let reverseMismatch = 0, reverseTotal = 0;
for (const b of books) {
  const f = path.join(OUT, "by-book", `${b}.json`);
  if (!fs.existsSync(f)) { reverseMismatch += 1; continue; }
  const rev = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const [n, list] of Object.entries(rev)) for (const [s, a, test] of list) {
    reverseTotal += 1;
    if (!(bySurah[s]?.[a] ?? []).some((h) => h.book === b && String(h.n) === n && h.test === test)) reverseMismatch += 1;
  }
}
check("every by-book entry is in the surah files", reverseTotal > 0 && reverseMismatch === 0, String(reverseMismatch));
check("every surah-file hit is in its by-book file", hits.length === reverseTotal, `${hits.length} vs ${reverseTotal}`);

console.log(`\n==== Āyah–hadith index data: ${pass} passed, ${fail} failed (${hits.length} links, ${seen.all.size} āyāt: ${seen.label.size} by label, ${seen.words.size} by words, ${surahsWithHits} surahs) ====`);
process.exit(fail ? 1 : 0);
