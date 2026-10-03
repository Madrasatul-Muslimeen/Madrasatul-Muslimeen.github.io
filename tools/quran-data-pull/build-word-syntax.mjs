// The "Needs a source" lines (decision 61), part 1 of 3: sentence-level iʿrāb.
//
// The Word card's Naḥw section says, for every word, that what it does in the
// whole sentence "needs the Corpus's sentence data". This script packages that
// data: the Quranic Arabic Corpus's dependency treebank (Kais Dukes, GPL v3,
// https://corpus.quran.com), aligned to the app's own displayed words, in
// ON-DEMAND per-surah files (I9: nothing here is read at startup):
//
//   output/word-syntax/surah_NNN.json   the graphs that touch this surah
//   output/word-syntax/manifest.json    coverage, sizes, the licence and the
//                                       Corpus's own names for every relation
//                                       and phrase tag
//
// The treebank covers surahs 1–8, part of 9, and 59–114 (about 42% of the
// words). A surah outside that has NO file and the card keeps its honest
// "needs a source" line. Nothing is guessed: a Corpus word that does not align
// to a displayed word (the same exact-skeleton rule as build-word-segments.mjs)
// keeps its Corpus location and gets `null` for the displayed key.
//
// Per surah file:
//   graphs  [{ n: [node...], e: [[relation, dependentIndex, headIndex]...] }]
//           node, by its first element:
//             ["w", displayKey|null, piece, tag(, corpusKey)]   a word's piece
//             ["r", displayKey|null, piece, tag(, corpusKey)]   the same, but a
//                    REFERENCE to a word already met in an earlier graph
//             (corpusKey "s:a:w" is added only when the word did not align,
//             so the displayed key is null; no graph spans two surahs, which
//             the build asserts)
//             ["h", tag, arabic|null]   a hidden (elided) word the grammar
//                    needs, e.g. ["h","PRON","هُوَ"], ["h","V",null]
//             ["p", tag, fromIndex, toIndex]   a phrase over a run of nodes
//           `piece` counts the word's Corpus segments with the determiner
//           (ال) left out, which is how the treebank numbers them; `tag` is
//           that segment's own part-of-speech tag from the morphology file
//           (null for the 55 words whose treebank adds an elided piece the
//           morphology does not have). The piece's spelling is NOT copied:
//           the app already has each piece's offsets in output/word-segments.
//           Indices are 0-based positions in `n` (the file's n1 is index 0).
//   words   { "ayah:position": [graph indices] } for every displayed word
//           that appears in a graph (as a word or as a reference)
//
// Run: node tools/quran-data-pull/build-word-syntax.mjs <syntax.txt> <quranic-corpus-morphology-0.4.txt>
// The two files come from
//   https://raw.githubusercontent.com/kaisdukes/quranic-corpus-api/main/src/main/resources/data/syntax.txt
//   https://raw.githubusercontent.com/alstat/QuranTree.jl/master/data/quranic-corpus-morphology-0.4.txt
// (with no paths, both are downloaded).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseMorphologyText, resolveWordKeyExact } from "./build-word-segments.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SURAHS_DIR = path.join(__dirname, "output", "surahs");
const OUT_DIR = path.join(__dirname, "output", "word-syntax");

const SYNTAX_URL = "https://raw.githubusercontent.com/kaisdukes/quranic-corpus-api/main/src/main/resources/data/syntax.txt";
const MORPH_URL = "https://raw.githubusercontent.com/alstat/QuranTree.jl/master/data/quranic-corpus-morphology-0.4.txt";

// The Corpus's own names, copied from https://corpus.quran.com/documentation/syntaxrelation.jsp
// and phrasetags.jsp (3 Oct 2026): [Arabic name, English name, dependent → head].
// A check asserts every relation in syntax.txt is named here.
export const RELATIONS = {
  adj: ["صفة", "Adjective", "adjective → noun"],
  poss: ["مضاف إليه", "Possessive construction", "second noun → first noun"],
  pred: ["مبتدأ وخبر", "Predicate of a subject", "predicate → subject"],
  app: ["بدل", "Apposition", "second noun → first noun"],
  spec: ["تمييز", "Specification", "second noun → first noun"],
  cpnd: ["مركب", "Compound", "second number → first number"],
  subj: ["فاعل", "Subject of a verb", "subject → verb"],
  pass: ["نائب فاعل", "Passive verb subject representative", "subject representative → verb"],
  obj: ["مفعول به", "Object of a verb", "object → verb"],
  subjx: ["اسم كان", "Subject of a special verb or particle", "subject → verb or particle"],
  predx: ["خبر كان", "Predicate of a special verb or particle", "predicate → verb or particle"],
  impv: ["أمر", "Imperative", "imperfect verb → imperative particle"],
  imrs: ["جواب أمر", "Imperative result", "result → imperative verb"],
  pro: ["نهي", "Prohibition", "imperfect verb → prohibitive particle"],
  gen: ["جار ومجرور", "Preposition phrase", "preposition → noun"],
  link: ["متعلق", "PP attachment", "PP phrase → verb or noun"],
  conj: ["معطوف", "Coordinating conjunction", "second phrase → first phrase"],
  sub: ["صلة", "Subordinate clause", "subordinate clause → particle"],
  cond: ["شرط", "Condition", "condition → conditional particle"],
  rslt: ["جواب شرط", "Result", "result → conditional particle"],
  circ: ["حال", "Circumstantial accusative", "accusative → verb"],
  cog: ["مفعول مطلق", "Cognate accusative", "accusative → verb"],
  prp: ["المفعول لأجله", "Accusative of purpose", "accusative → verb"],
  com: ["المفعول معه", "Comitative object", "accusative → verb"],
  emph: ["توكيد", "Emphasis", "verb → emphatic particle"],
  intg: ["استفهام", "Interrogation", "verb → interrogative particle"],
  neg: ["نفي", "Negation", "imperfect verb → negative particle"],
  fut: ["استقبال", "Future clause", "imperfect verb → future particle"],
  voc: ["منادي", "Vocative", "noun → vocative particle"],
  exp: ["مستثني", "Exceptive", "noun → exceptive particle"],
  res: ["حصر", "Restriction", "noun → restriction particle"],
  avr: ["ردع", "Aversion", "dependent → aversion particle"],
  cert: ["تحقيق", "Certainty", "dependent → particle of certainty"],
  ret: ["اضراب", "Retraction", "dependent → retraction particle"],
  prev: ["كاف", "Preventive", "preventive particle → accusative particle"],
  ans: ["جواب", "Answer", "dependent → answer particle"],
  inc: ["ابتداء", "Inceptive", "dependent → inceptive particle"],
  sur: ["فجاءة", "Surprise", "dependent → surprise particle"],
  sup: ["زائد", "Supplemental", "dependent → supplemental particle"],
  exh: ["تحضيض", "Exhortation", "dependent → exhortation particle"],
  exl: ["تفصيل", "Explanation", "dependent → explanation particle"],
  eq: ["تسوية", "Equalization", "verb → equalization particle"],
  caus: ["سببية", "Cause", "imperfect verb → particle of cause"],
  amd: ["استدراك", "Amendment", "dependent → amendment particle"],
  int: ["تفسير", "Interpretation", "dependent → particle of interpretation"],
};
export const PHRASES = {
  S: ["جملة", "Sentence"],
  NS: ["جملة اسمية", "Nominal sentence"],
  VS: ["جملة فعلية", "Verbal sentence"],
  CS: ["جملة شرطية", "Conditional sentence"],
  PP: ["جار ومجرور", "Preposition phrase"],
  SC: ["تأويل مصدر", "Subordinate clause"],
};

/** Parse syntax.txt into raw graphs: { words: [{names, kind, loc|tag|text}], phrases, edges }. */
export function parseSyntaxText(text) {
  const graphs = [];
  let g = null;
  let block = null;
  const fresh = () => ({ nodes: new Map(), order: [], edges: [] });
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line === "go") { if (g) graphs.push(g); g = null; block = null; continue; }
    if (line.startsWith("--")) { g ||= fresh(); block = line.slice(2).trim(); continue; }
    g ||= fresh();
    if (block === "words" || block === "phrases") {
      const m = line.match(/^(n\d+(?:,\s*n\d+)*)\s*=\s*([A-Za-z]+)\((.*)\)$/);
      if (!m) throw new Error(`unreadable node line: ${line}`);
      const names = m[1].split(/,\s*/);
      const [, , kind, arg] = m;
      if (kind === "word" || kind === "reference") {
        if (!/^\d+:\d+:\d+$/.test(arg)) throw new Error(`bad location: ${line}`);
        names.forEach((name, piece) => { g.nodes.set(name, { kind: kind === "word" ? "w" : "r", loc: arg, piece }); g.order.push(name); });
      } else if (block === "phrases") {
        const pm = arg.match(/^(n\d+)\s*-\s*(n\d+)$/);
        if (!pm || names.length !== 1) throw new Error(`bad phrase: ${line}`);
        g.nodes.set(names[0], { kind: "p", tag: kind, from: pm[1], to: pm[2] }); g.order.push(names[0]);
      } else {
        if (names.length !== 1) throw new Error(`bad hidden node: ${line}`);
        g.nodes.set(names[0], { kind: "h", tag: kind, text: arg === "*" ? null : arg }); g.order.push(names[0]);
      }
    } else if (block === "edges") {
      const m = line.match(/^([a-z]+)\((n\d+)\s*-\s*(n\d+)\)$/);
      if (!m) throw new Error(`unreadable edge: ${line}`);
      g.edges.push([m[1], m[2], m[3]]);
    } else throw new Error(`line outside a block: ${line}`);
  }
  if (g && g.order.length) throw new Error("the file ends inside a graph (no closing go)");
  return graphs;
}

/** The node names must be n1..nK in order, so the index is the number - 1. */
function checkNumbering(g) {
  g.order.forEach((name, i) => { if (name !== `n${i + 1}`) throw new Error(`node ${name} out of order at ${i}`); });
}

async function loadText(localPath, url) {
  if (localPath) return fs.readFileSync(localPath, "utf8");
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download failed ${r.status}: ${url}`);
  return r.text();
}

/** Corpus word key "s:a:w" → displayed key "a:position", for every surah. */
export function alignmentFromSurahs(morph, surahsDir = SURAHS_DIR) {
  const map = {};
  let words = 0;
  for (const file of fs.readdirSync(surahsDir).filter((f) => /^surah_\d{3}\.json$/.test(f))) {
    const s = Number(file.match(/\d{3}/)[0]);
    const data = JSON.parse(fs.readFileSync(path.join(surahsDir, file), "utf8"));
    for (const a of data.ayahs) {
      const usedWn = new Set();
      for (const w of a.words) {
        words++;
        const key = resolveWordKeyExact(morph, `${s}:${a.ayah}`, w.arabic, usedWn);
        if (key) map[key] = `${a.ayah}:${w.position}`;
      }
    }
  }
  return { map, words };
}

async function main() {
  const syntaxText = await loadText(process.argv[2], SYNTAX_URL);
  const morph = parseMorphologyText(await loadText(process.argv[3], MORPH_URL));
  if (morph.chapterCount < 114) throw new Error(`incomplete Corpus file: ${morph.chapterCount}/114 chapters`);
  const { map: align } = alignmentFromSurahs(morph);
  const raw = parseSyntaxText(syntaxText);

  const unknown = new Set();
  const perSurah = new Map(); // surah -> { graphs: [], words: {} }
  const covered = new Map(); // surah -> Set of corpus word keys appearing as "w"
  let unaligned = 0;
  let missingPiece = 0;
  for (const g of raw) {
    checkNumbering(g);
    const index = new Map(g.order.map((name, i) => [name, i]));
    const surahs = new Set();
    const nodes = g.order.map((name) => {
      const n = g.nodes.get(name);
      if (n.kind === "w" || n.kind === "r") {
        const s = Number(n.loc.split(":")[0]);
        surahs.add(s);
        if (n.kind === "w") (covered.get(s) ?? covered.set(s, new Set()).get(s)).add(n.loc);
        const rows = (morph.idx[n.loc] || []).filter((r) => r.tag !== "DET");
        const row = rows[n.piece];
        if (!row) missingPiece++;
        const shown = align[n.loc] ?? null;
        if (!shown && n.kind === "w") unaligned++;
        return shown ? [n.kind, shown, n.piece, row?.tag ?? null] : [n.kind, null, n.piece, row?.tag ?? null, n.loc];
      }
      if (n.kind === "p") {
        if (!PHRASES[n.tag]) unknown.add(`phrase:${n.tag}`);
        return ["p", n.tag, index.get(n.from), index.get(n.to)];
      }
      return ["h", n.tag, n.text];
    });
    const edges = g.edges.map(([rel, d, h]) => {
      if (!RELATIONS[rel]) unknown.add(`relation:${rel}`);
      if (!index.has(d) || !index.has(h)) throw new Error(`edge to a missing node: ${rel}(${d} - ${h})`);
      return [rel, index.get(d), index.get(h)];
    });
    if (surahs.size !== 1) throw new Error(`a graph spans ${surahs.size} surahs; the displayed keys would be ambiguous`);
    for (const s of surahs) {
      const slot = perSurah.get(s) ?? perSurah.set(s, { graphs: [], words: {} }).get(s);
      const gi = slot.graphs.length;
      slot.graphs.push({ n: nodes, e: edges });
      for (const node of nodes) {
        if ((node[0] === "w" || node[0] === "r") && node[1]) {
          const list = (slot.words[node[1]] ||= []);
          if (!list.includes(gi)) list.push(gi);
        }
      }
    }
  }
  if (unknown.size) throw new Error(`names missing from RELATIONS/PHRASES: ${[...unknown].join(", ")}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const f of fs.readdirSync(OUT_DIR)) if (/^surah_\d{3}\.json$/.test(f)) fs.unlinkSync(path.join(OUT_DIR, f));
  const list = [];
  let totalBytes = 0, maxBytes = 0, totalWords = 0;
  for (const s of [...perSurah.keys()].sort((a, b) => a - b)) {
    const slot = perSurah.get(s);
    const json = JSON.stringify({ schemaVersion: 1, surahNumber: s, graphs: slot.graphs, words: slot.words });
    fs.writeFileSync(path.join(OUT_DIR, `surah_${String(s).padStart(3, "0")}.json`), json);
    const bytes = Buffer.byteLength(json);
    const corpusWords = Object.keys(morph.idx).filter((k) => k.startsWith(`${s}:`)).length;
    const inGraphs = covered.get(s)?.size ?? 0;
    totalBytes += bytes; maxBytes = Math.max(maxBytes, bytes); totalWords += inGraphs;
    list.push({ surah: s, graphs: slot.graphs.length, corpusWords, wordsInGraphs: inGraphs, complete: inGraphs === corpusWords, bytes });
  }
  const manifest = {
    schemaVersion: 1,
    contract: "word-syntax:v1",
    generatedFrom: "syntax.txt, the Quranic Arabic Corpus dependency treebank (kaisdukes/quranic-corpus-api), aligned with quranic-corpus-morphology-0.4.txt",
    source: {
      name: "Quranic Arabic Corpus, Syntactic Treebank",
      author: "Kais Dukes (University of Leeds); maintained by the quran.com team",
      url: "https://corpus.quran.com",
      licence: "GNU General Public License v3",
      licenceUrl: "https://corpus.quran.com/license.jsp",
      credit: "Sentence grammar: Quranic Arabic Corpus (corpus.quran.com), GPL v3",
      namesFrom: "https://corpus.quran.com/documentation/syntaxrelation.jsp and phrasetags.jsp",
    },
    loadBoundary: "on-demand-only",
    surahsWithFiles: list.length,
    totalGraphs: raw.length,
    wordsInGraphs: totalWords,
    totalQuranWords: 77429,
    coveragePercent: Math.round((10000 * totalWords) / 77429) / 100,
    unalignedWordNodes: unaligned,
    nodesWithoutMorphologyPiece: missingPiece,
    totalBytes, maxBytes,
    relations: RELATIONS,
    phrases: PHRASES,
    perSurah: list,
  };
  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`word-syntax: ${raw.length} graphs, ${list.length} surah files, ${totalWords} Corpus words (${manifest.coveragePercent}%), ${unaligned} word nodes unaligned, ${missingPiece} pieces without a morphology row, ${totalBytes} bytes, largest ${maxBytes}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
}
