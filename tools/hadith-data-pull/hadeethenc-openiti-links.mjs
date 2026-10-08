// HadeethEnc's translated hadith attached to the OpenITI narrations they translate (decision 87, round H-DB3;
// research report §4.3 step 2: "HadeethEnc's Bangla and English attached to those books where HadeethEnc's
// attribution names one").
//
// HadeethEnc gives each hadith's words (the Companion and the Prophet's words, without the full chain) and an
// attribution such as "رواه مسلم" or "متفق عليه", but no book number. So the link is found the way the
// concordance is (tools/hadith-data-pull/hadith-concordance.mjs): by MATCHING THE WORDS. A HadeethEnc hadith is
// linked to an OpenITI passage when at least MIN_CONTAINMENT of its word 3-grams (chains shared by more than
// MAX_POSTING passages ignored) are in that passage. The same words in several passages (a hadith the book repeats,
// or the same hadith in two books) give several links: each is a place the translation belongs.
//
// WHAT IT STORES. Numbers and ids only: output/hadeethenc-links/<versionUri>.json, rows [n, hadeethencId, score].
// The translations stay where decision 7 put them (HadeethEnc's own package), loaded by hadeethenc-corpus.js.
//
// Usage (repository root): node tools/hadith-data-pull/hadeethenc-openiti-links.mjs
// tools/i18n-verify/hadeethenc-openiti-links.mjs checks the output (HadeethEnc's attribution is its independent truth).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shingles } from "./hadith-concordance.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPLIT_DIR = path.join(__dirname, "output", "openiti-release", "split");
const HE_DIR = path.join(__dirname, "output", "hadeethenc", "ar");
const OUT_DIR = path.join(__dirname, "output", "hadeethenc-links");

export const MIN_CONTAINMENT = 0.6;
export const MAX_POSTING = 200;
export const MIN_SHINGLES = 4;

export function readOpenitiPassages() {
  const books = JSON.parse(fs.readFileSync(path.join(SPLIT_DIR, "books-summary.json"), "utf8")).books.map((b) => b.versionUri);
  const out = [];
  for (const uri of books) {
    const index = JSON.parse(fs.readFileSync(path.join(SPLIT_DIR, uri, "index.json"), "utf8"));
    for (const ch of index.chapters) for (const f of ch.shardFiles) {
      for (const h of JSON.parse(fs.readFileSync(path.join(SPLIT_DIR, uri, f), "utf8")).hadiths) {
        if (h.kind === "hadith" || h.kind === "passage") out.push({ uri, n: h.n, text: h.text });
      }
    }
  }
  return { books, passages: out };
}

export function readHadeethEncArabic() {
  const out = new Map();
  for (const f of fs.readdirSync(HE_DIR).filter((x) => /^cat-\d+\.json$/.test(x)).sort()) {
    for (const h of JSON.parse(fs.readFileSync(path.join(HE_DIR, f), "utf8")).hadiths ?? []) {
      if (h.hadeeth && !out.has(h.id)) out.set(String(h.id), { id: String(h.id), text: h.hadeeth, attribution: h.attribution ?? "" });
    }
  }
  return out;
}

/** Pure: [{id,text}] x [{uri,n,text}] -> [{ id, uri, n, score }]. */
export function linkHadith(heList, passages, { minContainment = MIN_CONTAINMENT, maxPosting = MAX_POSTING } = {}) {
  const sets = passages.map((p) => shingles(p.text));
  const postings = new Map();
  sets.forEach((set, i) => { for (const g of set) { let a = postings.get(g); if (!a) postings.set(g, (a = [])); a.push(i); } });
  const links = [];
  for (const h of heList) {
    const a = shingles(h.text);
    if (a.size < MIN_SHINGLES) continue;
    const counts = new Map();
    for (const g of a) {
      const post = postings.get(g);
      if (!post || post.length > maxPosting) continue;
      for (const i of post) counts.set(i, (counts.get(i) ?? 0) + 1);
    }
    for (const [i, c] of counts) {
      const score = c / a.size;
      if (score >= minContainment) links.push({ id: h.id, uri: passages[i].uri, n: passages[i].n, score });
    }
  }
  return links;
}

function main() {
  const { books, passages } = readOpenitiPassages();
  const he = readHadeethEncArabic();
  const links = linkHadith([...he.values()], passages);
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const summary = [];
  for (const uri of books) {
    const rows = links.filter((l) => l.uri === uri).sort((x, y) => x.n - y.n || Number(x.id) - Number(y.id))
      .map((l) => [l.n, Number(l.id), Math.round(l.score * 100)]);
    if (!rows.length) continue;
    fs.writeFileSync(path.join(OUT_DIR, `${uri}.json`), JSON.stringify({
      schemaVersion: 1, versionUri: uri, columns: ["n", "hadeethencId", "score"],
      method: `HadeethEnc's Arabic words, word 3-grams, >= ${MIN_CONTAINMENT} of them in the passage; 3-grams in more than ${MAX_POSTING} passages ignored`,
      entries: rows, generatedBy: "tools/hadith-data-pull/hadeethenc-openiti-links.mjs",
    }) + "\n");
    summary.push({ versionUri: uri, links: rows.length, passages: new Set(rows.map((r) => r[0])).size, hadeethenc: new Set(rows.map((r) => r[1])).size });
  }
  const linked = new Set(links.map((l) => l.id));
  fs.writeFileSync(path.join(OUT_DIR, "summary.json"), JSON.stringify({ schemaVersion: 1,
    note: "Generated by tools/hadith-data-pull/hadeethenc-openiti-links.mjs. Do not edit by hand.",
    hadeethencArabic: he.size, hadeethencLinked: linked.size, books: summary }, null, 1) + "\n");
  console.log(`${linked.size} of ${he.size} HadeethEnc hadith linked, ${links.length} links`);
  for (const s of summary) console.log(`  ${s.versionUri}: ${s.passages} passages, ${s.hadeethenc} HadeethEnc hadith`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
