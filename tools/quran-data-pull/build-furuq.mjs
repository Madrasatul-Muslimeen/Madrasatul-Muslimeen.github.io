// The "Needs a source" lines (decision 61), part 2 of 3: near-synonym
// distinctions, for the Word card's "Word Choice & Distinctions" section.
//
// Source: Abū Hilāl al-ʿAskarī (d. c. 395 AH), al-Furūq al-Lughawiyya, ed.
// Muḥammad Ibrāhīm Salīm (Dār al-ʿIlm wa-l-Thaqāfa, Cairo), in the OpenITI
// corpus (Romanov & Seydi, doi:10.5281/zenodo.3082463), CC BY-NC-SA 4.0:
//   https://raw.githubusercontent.com/OpenITI/0400AH/master/data/0395AbuHilalCaskari/0395AbuHilalCaskari.FuruqLughawiyya/0395AbuHilalCaskari.FuruqLughawiyya.Shamela0010414-ara1
//
// Output (ON DEMAND, I9; read only when the reader opens that section):
//   output/furuq-index.json
//     entries  [{ h, terms, p: [fromPage, toPage], t }]   (only entries that
//              some Dictionary word links to; `entryCount` counts the book)
//              h      the heading as printed ("الفرق بين العلم والمعرفة")
//              terms  the words it compares, as printed
//              p      the edition's pages (OpenITI PageV01Pnnn markers)
//              t      the entry's text, as transcribed (paragraphs joined by
//                     "\n"; OpenITI milestones removed; nothing else changed,
//                     so the transcription's own typos stay and the card says
//                     "as transcribed")
//     lemmas   { dictionaryWord: [entry indices] }   the Word card's lookup
//
// An entry is linked to a Qur'an Dictionary word ONLY when one of its terms,
// with vowels and ال removed, names exactly ONE Dictionary word: first by the
// Dictionary word itself, else by a written form found in the Qur'an. A term
// naming two or more is left unlinked unless `furuq-reviewed.json` names the
// one(s) it means (`values`: per term; `byEntry`: per heading, which wins),
// after a person read the entry; null there means "none of them". One grammar rule narrows the
// field first: a term written with ال is a noun, so a verb is never meant
// (العلم is عِلْم, never عَلِمَ). Nothing is linked by guess.
//
// Run: node tools/quran-data-pull/build-furuq.mjs [path/to/the OpenITI file]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "output");
const URL_ = "https://raw.githubusercontent.com/OpenITI/0400AH/master/data/0395AbuHilalCaskari/0395AbuHilalCaskari.FuruqLughawiyya/0395AbuHilalCaskari.FuruqLughawiyya.Shamela0010414-ara1";
const REVIEWED = path.join(__dirname, "furuq-reviewed.json");

/** Letters only: vowels, Qur'anic marks, tatweel and the pull's markers out;
 *  hamza seats, tā' marbūṭa and alif maqṣūra folded. `dagger` is what the
 *  superscript alif becomes ("" or "ا"), since the book writes it either way. */
export function skeleton(s, dagger = "") {
  return String(s ?? "")
    .replace(/\u0627\^/g, "\u0627").replace(/\u0670/g, dagger)
    .replace(/[\u064B-\u065F\u06D6-\u06ED\u0640^#@`\d]/g, "")
    .replace(/[ٱأإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/ء/g, "")
    .replace(/[^ء-ي]/g, "");
}
export const stripAl = (s) => (s.length > 3 && (s.startsWith("ال") || s.startsWith("لل")) ? s.slice(2) : s);

/** The words an entry heading compares, or null when it is not a "difference
 *  between" heading. Tolerates the transcription's known slips (بينالعقل,
 *  يبن, ين, قين, الفقرق). A chapter heading ("الفرق بين ما يخالف …") is not an
 *  entry. Where the transcription ran the entry's first sentence into its
 *  heading, a term written with ال is cut to its first word and `rest` is the
 *  run-on text, which the parser puts back at the start of the entry. */
export function splitHeading(heading) {
  // "بين" must be followed by a space or by ال run on (بينالعقل): "بينها"
  // and "بينه" point back at the entry before and compare no word of their own.
  const m = String(heading).match(/^((?:في\s+)?ال(?:فرق|فقرق|فروق)\s+(?:بين\s+|بين(?=ال)|يبن\s+|ين\s+|قين\s+|بينها\s+بوين\s+))(.+)$/);
  if (!m || /^ما\s/.test(m[2])) return null;
  // A chapter title ("في الفرق بين … وما يجري مع ذلك") is not an entry.
  if (/^في\s/.test(m[1]) || /وما\s+(يجري|يقرب|يخالف)|وفي\s+الفرق/.test(m[2])) return null;
  const parts = m[2].split(/\s+و(?=\S)/).map((t) => t.replace(/^بين\s+/, "").trim()).filter(Boolean);
  let rest = "";
  const terms = parts.map((t, i) => {
    if (rest) return null;
    const words = t.split(/\s+/);
    if (/^(ال|لل)/.test(words[0]) && words.length > 1) {
      rest = words.slice(1).join(" ") + (i < parts.length - 1 ? " و" + parts.slice(i + 1).join(" و") : "");
      return words[0];
    }
    if (words.length > 4) { rest = t + (i < parts.length - 1 ? " و" + parts.slice(i + 1).join(" و") : ""); return null; }
    return t;
  }).filter(Boolean);
  if (!terms.length) return null;
  return { terms, rest: rest.trim(), heading: rest ? `${m[1]}${terms.join(" و")}` : heading };
}
export const headingTerms = (h) => splitHeading(h)?.terms ?? null;

/** Parse the OpenITI file into entries. */
export function parseFuruq(text) {
  const start = text.indexOf("#META#Header#End#");
  if (start < 0) throw new Error("not an OpenITI file (no header end)");
  const lines = text.slice(start).split("\n").slice(1);
  const entries = [];
  let page = 0; // the last page marker seen: an entry starts on page + 1
  let cur = null;
  const close = () => {
    if (!cur) return;
    cur.t = cur.lines.join(" ").replace(/<[^>]*>/g, "").replace(/\s*\n\s*/g, "\n").replace(/[ \t]+/g, " ").trim();
    delete cur.lines;
    // A chapter heading ("في الفرق بين … وما يجري مع ذلك") has no text of its own.
    if (cur.terms && cur.t.length >= 15) entries.push(cur);
    cur = null;
  };
  for (const raw of lines) {
    const pm = raw.match(/PageV\d+P(\d+)/);
    const line = raw.replace(/PageV\d+P\d+/g, "").replace(/\bms\d+\b/g, "").trimEnd();
    // The transcription sometimes starts an entry as a plain paragraph
    // ("# الفرق بين الظلم والهضم") instead of a heading: that is a new entry
    // too, or its text would be shown under the previous one.
    const paraHeading = line.startsWith("# ") && splitHeading(line.slice(2).trim()) ? line.slice(2).trim() : null;
    if (line.startsWith("### |") || paraHeading) {
      close();
      const split = splitHeading(paraHeading ?? line.slice(5).trim());
      cur = { h: split?.heading ?? line.slice(5).trim(), terms: split?.terms ?? null, p: [page + 1, page + 1], lines: split?.rest ? [split.rest] : [] };
    } else if (cur) {
      if (line.startsWith("# ")) cur.lines.push("\n" + line.slice(2));
      else if (line.startsWith("~~")) cur.lines.push(line.slice(2));
      else if (line.trim() && line.trim() !== "#") cur.lines.push(line);
    }
    if (pm) {
      page = Number(pm[1]);
      // A marker inside an entry's text means the entry runs on to the next page.
      if (cur && line.trim()) cur.p[1] = page + 1; else if (cur && cur.lines.length) cur.p[1] = Math.max(cur.p[1], page);
    }
  }
  close();
  return entries;
}

// A term written with ال is a noun (a verb or a particle never takes the
// article), so for such a term only these Dictionary words can be meant.
export const NOMINAL = new Set(["Noun", "Adjective", "Proper Noun"]);

/** skeleton → Set of Dictionary words: by the Dictionary word as spelled (the
 *  superscript alif read as ا), then with it dropped, then by a written form. */
export function buildLookups(lemmasIndex, wordForms) {
  const byLemma = new Map();
  const byLemmaLoose = new Map();
  const add = (map, k, v) => (map.get(k) ?? map.set(k, new Set()).get(k)).add(v);
  for (const lemma of Object.keys(lemmasIndex)) {
    add(byLemma, skeleton(lemma, "ا"), lemma);
    add(byLemmaLoose, skeleton(lemma, ""), lemma);
  }
  const occToLemma = new Map();
  for (const [lemma, occ] of Object.entries(lemmasIndex)) for (const o of occ) occToLemma.set(o, lemma);
  const byForm = new Map();
  for (const [ar, , , , occ] of wordForms) {
    for (const d of ["", "ا"]) {
      const k = stripAl(skeleton(ar, d));
      for (const o of occ) { const l = occToLemma.get(o); if (l) add(byForm, k, l); }
    }
  }
  return { byLemma, byLemmaLoose, byForm };
}

/** The ONE Dictionary word a term names, or { ambiguous: [...] } or null.
 *  `pos` is lemma-pos-index.json's values. Each tier is tried in turn; a tier
 *  that names two or more stops the search (it never falls through to a
 *  looser tier that happens to name one). */
export function resolveTerm(term, lookups, pos, reviewed = {}) {
  if (term in reviewed) return { lemmas: [reviewed[term]].flat().filter(Boolean), how: "reviewed" };
  // "قولك أجاب" is "your saying أجاب": the expression is the one word after it.
  const said = term.match(/^قول(?:ك|نا|هم)\s+(\S+)$/);
  if (said) return resolveTerm(said[1], lookups, pos, reviewed);
  if (/^قول(?:ك|نا|هم)(\s|$)/.test(term)) return null;
  const { byLemma, byLemmaLoose, byForm } = lookups;
  const withAl = /^\s*(ال|لل)/.test(term) && skeleton(term).length > 3;
  const k = stripAl(skeleton(term));
  const nominal = (set) => (withAl ? [...set].filter((l) => (pos[l] ?? []).some(([p]) => NOMINAL.has(p))) : [...set]);
  for (const [map, how] of [[byLemma, "lemma"], [byLemmaLoose, "lemma"], [byForm, "form"]]) {
    const hit = map.get(k);
    if (!hit) continue;
    const c = nominal(hit);
    if (c.length === 1) return { lemmas: [c[0]], how };
    if (c.length > 1) return { ambiguous: c };
  }
  return null;
}

async function main() {
  const text = process.argv[2] ? fs.readFileSync(process.argv[2], "utf8") : await (await fetch(URL_)).text();
  const entries = parseFuruq(text);
  const lemmas = JSON.parse(fs.readFileSync(path.join(OUT, "lemmas-index.json"), "utf8")).values;
  const forms = JSON.parse(fs.readFileSync(path.join(OUT, "word-forms-index.json"), "utf8")).forms;
  const reviewedFile = fs.existsSync(REVIEWED) ? JSON.parse(fs.readFileSync(REVIEWED, "utf8")) : { values: {}, byEntry: {} };
  // The review is typed by hand, so its marks may come in a different order
  // from the pull's spelling: match in NFC and store the pull's own key.
  const lemmaByNfc = new Map(Object.keys(lemmas).map((k) => [k.normalize("NFC"), k]));
  const toKey = (v) => {
    if (v === null) return null;
    if (Array.isArray(v)) return v.map(toKey);
    const k = lemmaByNfc.get(String(v).normalize("NFC"));
    if (!k) throw new Error(`furuq-reviewed.json names ${v}, which is not a Dictionary word`);
    return k;
  };
  const mapValues = (o) => Object.fromEntries(Object.entries(o ?? {}).map(([t, v]) => [t, toKey(v)]));
  const reviewed = mapValues(reviewedFile.values);
  const byEntry = Object.fromEntries(Object.entries(reviewedFile.byEntry ?? {}).map(([h, o]) => [h, mapValues(o)]));
  const headings = new Set(entries.map((e) => e.h));
  for (const h of Object.keys(byEntry)) if (!headings.has(h)) throw new Error(`furuq-reviewed.json byEntry names a heading that is not in the book: ${h}`);
  const pos = JSON.parse(fs.readFileSync(path.join(OUT, "lemma-pos-index.json"), "utf8")).values;
  const lookups = buildLookups(lemmas, forms);
  const index = {};
  const ambiguous = {};
  const how = { lemma: 0, form: 0, reviewed: 0 };
  let terms = 0;
  entries.forEach((e, i) => {
    for (const term of e.terms) {
      terms++;
      const r = resolveTerm(term, lookups, pos, { ...reviewed, ...(byEntry[e.h] ?? {}) });
      if (r?.lemmas) {
        if (r.lemmas.length) how[r.how]++; // a reviewed [] or null: the term names none of them
        for (const l of r.lemmas) { const list = (index[l] ||= []); if (!list.includes(i)) list.push(i); }
      } else if (r?.ambiguous) ambiguous[term] = r.ambiguous;
    }
  });
  // Only an entry some Dictionary word links to can ever be shown, so only
  // those are packaged (renumbered in book order).
  const kept = [...new Set(Object.values(index).flat())].sort((a, b) => a - b);
  const renumber = new Map(kept.map((old, i) => [old, i]));
  for (const l of Object.keys(index)) index[l] = index[l].map((i) => renumber.get(i));
  const linkedEntries = kept.length;
  const out = {
    contract: "furuq-index:v1",
    loadBoundary: "on-demand-only",
    source: {
      work: "al-Furūq al-Lughawiyya",
      workAr: "الفروق اللغوية",
      author: "Abū Hilāl al-ʿAskarī (d. c. 395 AH)",
      authorAr: "أبو هلال العسكري",
      edition: "ed. Muḥammad Ibrāhīm Salīm, Dār al-ʿIlm wa-l-Thaqāfa, Cairo",
      transcription: "OpenITI 0395AbuHilalCaskari.FuruqLughawiyya.Shamela0010414-ara1",
      corpus: "Romanov, Maxim, and Masoumeh Seydi, OpenITI: A Machine-Readable Corpus of Islamicate Texts, Zenodo, doi:10.5281/zenodo.3082463",
      licence: "CC BY-NC-SA 4.0",
      licenceUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      shareAlike: "This file is derived from the OpenITI text and is shared under the same licence, CC BY-NC-SA 4.0 (attribution, non-commercial, share-alike).",
      credit: "al-ʿAskarī, al-Furūq al-Lughawiyya, ed. Salīm, p. {p}. Text: OpenITI (Romanov & Seydi), CC BY-NC-SA 4.0",
    },
    entryCount: entries.length,
    linkedEntryCount: linkedEntries,
    termCount: terms,
    links: how,
    unresolvedAmbiguousTerms: Object.keys(ambiguous).length,
    entries: kept.map((i) => entries[i]).map(({ h, terms: t, p, t: body }) => ({ h, terms: t, p: p[0] === p[1] ? [p[0]] : p, t: body })),
    lemmas: index,
  };
  fs.writeFileSync(path.join(OUT, "furuq-index.json"), JSON.stringify(out));
  fs.writeFileSync(path.join(__dirname, "furuq-ambiguous.json"), JSON.stringify({ note: "Terms that name more than one Dictionary word. To link one, a person reads the entry and adds term → Dictionary word (or null for none) to furuq-reviewed.json.", values: ambiguous }, null, 1));
  console.log(`furuq: ${entries.length} entries, ${linkedEntries} linked to ${Object.keys(index).length} Dictionary words (${JSON.stringify(how)}), ${Object.keys(ambiguous).length} ambiguous terms left unlinked, ${Buffer.byteLength(JSON.stringify(out))} bytes.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
}
