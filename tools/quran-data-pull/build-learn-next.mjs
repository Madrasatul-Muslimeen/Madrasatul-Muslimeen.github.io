// Builds output/learn-next.json: every dictionary word (lemma) of the Qur'an, ordered by how often it occurs
// (highest first, ties by the lemma text), with its running share of the 74,122 words, a short English and Bangla
// meaning, and its first occurrence. No network. Run from the repository root:
//   node tools/quran-data-pull/build-learn-next.mjs
// Meaning: the Word card's "Dictionary word" box source (lemma-dictionary-en.json / -bn.json). Only where that has
// nothing is the lemma's most common word-by-word reading used (lemma-meaning-index.json), and the row says so
// with `w: 1`. A meaning is never invented. Long dictionary meanings are cut at a comma/semicolon, never mid-word.
import fs from "node:fs";

const OUT = "tools/quran-data-pull/output/";
const read = (f) => JSON.parse(fs.readFileSync(OUT + f, "utf8"));
const nfc = (s) => String(s).normalize("NFC");

const lemmas = read("lemmas-index.json");
const en = read("lemma-dictionary-en.json");
const bn = read("lemma-dictionary-bn.json");
const wbw = read("lemma-meaning-index.json");

// Same collision rule as app/js/lemma-dictionary.js: a FIXED entry wins.
const enIndex = new Map();
for (const [key, entry] of Object.entries(en.entries ?? {})) {
  const k = nfc(key);
  if (!enIndex.has(k) || (entry.c === "fixed" && enIndex.get(k).c !== "fixed")) enIndex.set(k, entry);
}
const bnIndex = new Map(Object.entries(bn.entries ?? {}).map(([k, v]) => [nfc(k), v]));
const wbwIndex = new Map(Object.entries(wbw.values ?? {}).map(([k, v]) => [nfc(k), v]));

const MAX = 48;
function shorten(text) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= MAX) return s;
  const parts = s.split(/(?<=[,;،])\s+/);
  let out = "";
  for (const p of parts) {
    const next = out ? `${out} ${p}` : p;
    if (next.length > MAX && out) break;
    out = next;
  }
  return out.replace(/[,;،]+$/, "").trim();
}

const total = Object.values(lemmas.values).reduce((n, refs) => n + refs.length, 0);
const rows = Object.entries(lemmas.values)
  .map(([lemma, refs]) => ({ lemma, n: refs.length, first: Math.min(...refs) }))
  .sort((a, b) => b.n - a.n || (a.lemma < b.lemma ? -1 : a.lemma > b.lemma ? 1 : 0));

let running = 0, wbwRows = 0;
const out = rows.map((row, i) => {
  running += row.n;
  const k = nfc(row.lemma);
  const dEn = enIndex.get(k)?.m, dBn = bnIndex.get(k)?.m?.[0], w = wbwIndex.get(k);
  const e = shorten(dEn || w?.en), b = shorten(dBn || w?.bn);
  const r = { r: i + 1, l: row.lemma, n: row.n, p: Math.round((running / total) * 1000) / 10, e, b, o: row.first };
  if (!dEn || !dBn) { r.w = 1; wbwRows++; }
  return r;
});

const doc = { contract: "learn-next:v1", total, count: out.length, rows: out };
const FILE = process.env.LEARN_NEXT_OUT || OUT + "learn-next.json"; // the test suite builds a mutated copy elsewhere
fs.writeFileSync(FILE, JSON.stringify(doc));
console.log(`learn-next.json: ${out.length} words, ${total} occurrences, ${wbwRows} rows with a word-by-word meaning, ${fs.statSync(FILE).size} bytes`);
for (const k of [10, 100, 300, 1000]) console.log(`first ${k}: ${out[k - 1].p}%`);
