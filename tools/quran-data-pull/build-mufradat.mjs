// The "Needs a source" lines (decision 61), part 3 of 3: classical usage, for
// the Word card's "Classical Arabic Usage" section.
//
// Source: al-Rāghib al-Iṣfahānī (d. 502 AH), al-Mufradāt fī Gharīb al-Qurʾān,
// ed. Ṣafwān ʿAdnān al-Dāwūdī (Dār al-Qalam / al-Dār al-Shāmiyya,
// Damascus–Beirut, 1st ed. 1412 AH), in the OpenITI corpus (Romanov & Seydi,
// doi:10.5281/zenodo.3082463), CC BY-NC-SA 4.0:
//   https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.Shamela0023636-ara1
//
// Output (ON DEMAND, I9; read only when the reader opens that section), one
// file per letter-book so a card fetches only its root's letter:
//   output/mufradat/<n>.json   n = 1..28, the book's letter order (ا ب ت … ي)
//     entries  { root: [{ h, p: [fromPage, toPage], t, q: [[surah, ayah]...] }] }
//              (an entry that treats two roots and quotes both is under each)
//              h  the headword as printed; p  the Dāwūdī edition's pages;
//              t  the entry as transcribed (footnote callers «n» and OpenITI
//                 milestones removed; paragraphs joined by "\n")
//              q  the āyāt it quotes, from its own [Sūra/ n] citations
//   output/mufradat/manifest.json   letters, coverage, the licence
//
// The transcription's headings are not reliable: a page break can leave a
// false heading in the middle of an entry (### | أب inside أبا), poem numbers
// appear as headings (### | 3-), and some real entries are only a bare
// paragraph (# علم). So a heading starts an entry ONLY when all three hold,
// each read from the data:
//   1. it spells a root the Qur'an has (roots-index.json), by the fixed
//      spelling rules in rootCandidates();
//   2. that root's first letter is the current letter-book's letter;
//   3. the entry's own text quotes at least one āyah that contains a word of
//      that root.
// Anything else is text of the entry before it. Nothing is guessed.
//
// Run: node tools/quran-data-pull/build-mufradat.mjs [path/to/the OpenITI file]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "output");
const OUT_DIR = path.join(OUT, "mufradat");
const URL_ = "https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.Shamela0023636-ara1";

export const BOOKS = ["الألف", "الباء", "التاء", "الثاء", "الجيم", "الحاء", "الخاء", "الدال", "الذال", "الراء", "الزاي", "السين", "الشين", "الصاد", "الضاد", "الطاء", "الظاء", "العين", "الغين", "الفاء", "القاف", "الكاف", "اللام", "الميم", "النون", "الهاء", "الواو", "الياء"];
export const BOOK_LETTER = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";

const plain = (s) => String(s ?? "").replace(/[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g, "").replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627").replace(/\u0649/g, "\u064A").replace(/\u0629/g, "\u0647").trim();

// Sūra names as the book cites them, beyond the index's own names.
const SURAH_ALIASES = { "عم": 78, "الدهر": 76, "بني اسراييل": 17, "سوره النمل": 27, "المومن": 40, "حم السجده": 41, "الشرح": 94, "الانشقا ق": 84 };

export function surahNumberMap(surahIndex) {
  const map = new Map();
  for (const s of surahIndex) {
    map.set(surahKey(plain(s.nameArabic).replace(/^سوره\s+/, "")), s.surahNumber);
  }
  for (const [k, v] of Object.entries(SURAH_ALIASES)) map.set(surahKey(k), v);
  return map;
}
// Spaces and line breaks are dropped: the transcription splits names ("آل\nعمران", "الش عر\nاء").
function surahKey(name) { return plain(name).replace(/ms\d+/g, "").replace(/ء/g, "").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/\s+/g, ""); }

/** Every [Sūra/ n] citation in a text, as [surah, ayah]; unknown names are counted. */
export function citations(text, surahMap, unknown) {
  const out = [];
  // [البقرة/ 133] and ranges [الدخان/ 43- 44] (every āyah of the range).
  for (const m of String(text).matchAll(/\[([^\]\/]{1,30})\/\s*(\d+)(?:\s*-\s*(\d+))?\s*\]/g)) {
    const s = surahMap.get(surahKey(m[1]));
    if (!s) { unknown?.set(m[1], (unknown.get(m[1]) ?? 0) + 1); continue; }
    const from = Number(m[2]);
    const to = m[3] && Number(m[3]) >= from && Number(m[3]) - from < 20 ? Number(m[3]) : from;
    for (let a = from; a <= to; a++) out.push([s, a]);
  }
  return out;
}

/** The Qur'an roots a headword can spell (letters as roots-index writes them:
 *  hamza as ا). أبا → ابو/ابي, أبى → ابي/ابو, أب → ابب, علم → علم. */
export function rootCandidates(headword) {
  const w = plain(headword).replace(/ء/g, "ا").replace(/ؤ/g, "ا").replace(/ئ/g, "ا");
  if (!/^[ء-ي]{2,4}$/.test(w)) return [];
  const out = new Set([w]);
  if (w.length === 2) out.add(w + w[1]);
  if (w.length === 3 && w.endsWith("ا")) { out.add(w.slice(0, 2) + "و"); out.add(w.slice(0, 2) + "ي"); }
  if (w.length === 3 && w.endsWith("ي")) out.add(w.slice(0, 2) + "و");
  if (w.length === 3 && w.endsWith("و")) out.add(w.slice(0, 2) + "ي");
  if (w.length === 3 && w[1] === "ا") { out.add(w[0] + "و" + w[2]); out.add(w[0] + "ي" + w[2]); }
  return [...out];
}

/** The book's lines as headings and paragraphs, with page numbers. */
export function parseMufradat(text) {
  const start = text.indexOf("#META#Header#End#");
  if (start < 0) throw new Error("not an OpenITI file (no header end)");
  const items = []; // { kind: "head"|"book"|"line", text, page }
  let page = 0;
  for (const raw of text.slice(start).split("\n").slice(1)) {
    const pm = [...raw.matchAll(/PageV\d+P(\d+)/g)];
    const line = raw.replace(/<[^>]*>/g, "").replace(/PageV\d+P\d+/g, "").replace(/\bms\d+\b/g, "").replace(/«\d+»/g, "").replace(/\s+$/, "");
    const body = line.replace(/^(### \||#|~~)\s*/, "").trim();
    if (line.startsWith("### |")) {
      const b = body.match(/^كتاب\s+(\S+)/);
      if (b && BOOKS.includes(b[1])) items.push({ kind: "book", text: b[1], page: page + 1 });
      else if (/^\d+-\s*$/.test(body) || !body) items.push({ kind: "line", text: "", page: page + 1, para: true });
      else items.push({ kind: "head", text: body, page: page + 1 });
    } else if (line.startsWith("# ") && /^[ء-ي]{2,4}$/.test(plain(body).replace(/ء/g, "ا"))) {
      items.push({ kind: "head", text: body, page: page + 1, bare: true });
    } else if (body) {
      items.push({ kind: "line", text: body, page: page + 1, para: !line.startsWith("~~") });
    }
    if (pm.length) page = Number(pm[pm.length - 1][1]);
  }
  return items;
}

async function main() {
  const text = process.argv[2] ? fs.readFileSync(process.argv[2], "utf8") : await (await fetch(URL_)).text();
  const roots = JSON.parse(fs.readFileSync(path.join(OUT, "roots-index.json"), "utf8")).values;
  const surahMap = surahNumberMap(JSON.parse(fs.readFileSync(path.join(OUT, "surah-index.json"), "utf8")));
  // root -> Set("s:a") of the āyāt that contain a word of it
  const rootAyahs = new Map(Object.entries(roots).map(([r, occ]) => [r, new Set(occ.map((o) => `${Math.floor(o / 1e6)}:${Math.floor(o / 1e3) % 1000}`))]));

  const items = parseMufradat(text);
  const firstBook = items.findIndex((it) => it.kind === "book");
  const unknownSurahs = new Map();
  const entries = []; // { root, h, p, lines, book }
  let cur = null;
  const rejected = { notARoot: 0, wrongBook: 0, noQuote: 0, unverifiedEntry: 0, lostQuote: 0 };

  // Which heading starts an entry, in two passes. Pass 1 checks each heading
  // against its text up to the next root-like heading; pass 2 re-checks the
  // rest against their text up to the next ACCEPTED heading, so a false
  // heading (a page break inside an entry) cannot cut a real entry short of
  // its own quotation. A heading is accepted only when its quoted āyāt contain
  // its root.
  const bookAt = [];
  { let b = -1; for (let i = 0; i < items.length; i++) { if (items[i].kind === "book") b = BOOKS.indexOf(items[i].text); bookAt[i] = b; } }
  const cands = items.map((it, i) => {
    if (it.kind !== "head" || i < firstBook) return null;
    const all = rootCandidates(it.text).filter((r) => roots[r]);
    if (!all.length) { rejected.notARoot++; return null; }
    const inBook = all.filter((r) => r[0] === BOOK_LETTER[bookAt[i]]);
    if (!inBook.length) { rejected.wrongBook++; return null; }
    return inBook;
  });
  const accepted = new Map(); // item index -> root
  const textUntil = (i, stop) => {
    const out = [];
    for (let j = i + 1; j < items.length && items[j].kind !== "book" && !stop(j); j++) out.push(items[j].text);
    return out.join(" ");
  };
  const decide = (i, text) => {
    const quoted = citations(text, surahMap, null);
    // Every candidate root the entry quotes: al-Rāghib sometimes treats two
    // roots under one headword (ساح: سوح and سيح), and quotes both.
    // When the headword spells one of them exactly (بدأ is بدا, not بدو), only that one.
    const ok = cands[i].filter((r) => quoted.some(([s, a]) => rootAyahs.get(r).has(`${s}:${a}`)));
    const exact = plain(items[i].text).replace(/[\u0621\u0624\u0626]/g, "\u0627");
    if (ok.includes(exact)) return [exact];
    return ok.length ? ok : null;
  };
  cands.forEach((c, i) => { if (c) { const r = decide(i, textUntil(i, (j) => !!cands[j])); if (r) accepted.set(i, r); } });
  for (let pass = 0; pass < 3; pass++) {
    let added = 0;
    cands.forEach((c, i) => {
      if (!c || accepted.has(i)) return;
      const r = decide(i, textUntil(i, (j) => accepted.has(j)));
      if (r) { accepted.set(i, r); added++; }
    });
    if (!added) break;
  }

  // An unaccepted heading is either a false one inside an entry (its text
  // belongs to the entry before) or a real entry that quotes no āyah of its
  // root (its text is dropped, never filed under another root). It is taken
  // as real when it is a full heading line and the text before it ends a
  // sentence.
  const endsSentence = (t) => /[.\]\)»:؟!]\s*$/.test(t);
  let dropping = false;
  let glueNext = false;
  for (let i = firstBook; i < items.length; i++) {
    const it = items[i];
    if (it.kind === "book") { if (cur) entries.push(cur); cur = null; dropping = false; continue; }
    if (it.kind === "head" && accepted.has(i)) {
      if (cur) entries.push(cur);
      cur = { roots: accepted.get(i), h: it.text, p: [it.page, it.page], lines: [], book: bookAt[i] };
      dropping = false;
      continue;
    }
    if (it.kind === "head" && cands[i]) {
      rejected.noQuote++;
      const prev = cur?.lines[cur.lines.length - 1]?.text ?? "";
      const next = items[i + 1]?.kind === "line" ? items[i + 1].text : "";
      // A heading whose next line starts mid-word ("ك أنه", "مة،") is a
      // fragment of the entry before, whatever came before it.
      const nextMidWord = /^[\u0621-\u064A]{1,2}[\s،,.:]/.test(next) && !/^(في|من|عن|إن|أن|لا|ما|لم|لن|قد|هو|هي|أو|ثم|بل|كل|إذ|يا)[\s،,.:]/.test(next);
      if (!it.bare && (!cur || endsSentence(prev)) && !nextMidWord) {
        rejected.unverifiedEntry++;
        dropping = true;
        if (process.env.MUFRADAT_DEBUG) console.error(`dropped ${it.text} p${it.page} :: ${textUntil(i, (j) => accepted.has(j)).slice(0, 80)}`);
        continue;
      }
      if (process.env.MUFRADAT_DEBUG) console.error(`merged ${it.text} p${it.page} into ${cur?.h} :: ${prev.slice(-40)} | ${textUntil(i, (j) => accepted.has(j)).slice(0, 60)}`);
      // A fragment from a page break: it continues the word before it when
      // that line ends in a letter, and the next line continues it when that
      // line starts mid-word ("عنى ال" + "أب" + " الذي", "وال" + "أذي" + "ن:").
      if (!dropping && cur && !it.bare) {
        const last = cur.lines[cur.lines.length - 1];
        if (last && /[\u0621-\u064A]$/.test(last.text)) last.text += it.text;
        else cur.lines.push({ text: it.text, para: false });
        glueNext = nextMidWord;
        cur.p[1] = it.page;
        continue;
      }
    }
    if (dropping) continue;
    if (cur && it.text && glueNext && it.kind === "line") { cur.lines[cur.lines.length - 1].text += it.text; glueNext = false; cur.p[1] = it.page; continue; }
    glueNext = false;
    if (cur && it.text) { cur.lines.push({ text: it.text, para: it.kind === "head" ? !!it.bare : it.para }); cur.p[1] = it.page; }
  }
  if (cur) entries.push(cur);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const f of fs.readdirSync(OUT_DIR)) if (/^\d+\.json$/.test(f)) fs.unlinkSync(path.join(OUT_DIR, f));
  const perBook = [];
  const coveredRoots = new Set();
  let totalBytes = 0, maxBytes = 0;
  for (let b = 0; b < BOOKS.length; b++) {
    const byRoot = {};
    for (const e of entries.filter((x) => x.book === b)) {
      const t = e.lines.reduce((acc, l) => acc + (l.para && acc ? "\n" : acc ? " " : "") + l.text, "").replace(/[ \t]+/g, " ").trim();
      const entry = { h: e.h, p: e.p[0] === e.p[1] ? [e.p[0]] : e.p, t, q: citations(t, surahMap, unknownSurahs) };
      // The guarantee holds on the FINAL text: a root is filed only if this
      // text, as assembled, quotes an āyah containing it.
      for (const r of e.roots) {
        if (!entry.q.some(([s, a]) => rootAyahs.get(r).has(`${s}:${a}`))) { rejected.lostQuote++; continue; }
        (byRoot[r] ||= []).push(entry); coveredRoots.add(r);
      }
    }
    const json = JSON.stringify({ schemaVersion: 1, book: b + 1, letter: BOOK_LETTER[b], entries: byRoot });
    fs.writeFileSync(path.join(OUT_DIR, `${b + 1}.json`), json);
    const bytes = Buffer.byteLength(json);
    totalBytes += bytes; maxBytes = Math.max(maxBytes, bytes);
    perBook.push({ book: b + 1, letter: BOOK_LETTER[b], roots: Object.keys(byRoot).length, bytes });
  }
  const quranRoots = Object.keys(roots).length;
  const manifest = {
    schemaVersion: 1,
    contract: "mufradat:v1",
    loadBoundary: "on-demand-only",
    fileFor: "the root's first letter's position in `letters` (1-based) → <n>.json",
    letters: BOOK_LETTER,
    source: {
      work: "al-Mufradāt fī Gharīb al-Qurʾān",
      workAr: "المفردات في غريب القرآن",
      author: "al-Rāghib al-Iṣfahānī (d. 502 AH)",
      authorAr: "الراغب الأصفهاني",
      edition: "ed. Ṣafwān ʿAdnān al-Dāwūdī, Dār al-Qalam / al-Dār al-Shāmiyya, Damascus–Beirut, 1st ed. 1412 AH",
      transcription: "OpenITI 0502RaghibIsbahani.Mufradat.Shamela0023636-ara1",
      corpus: "Romanov, Maxim, and Masoumeh Seydi, OpenITI: A Machine-Readable Corpus of Islamicate Texts, Zenodo, doi:10.5281/zenodo.3082463",
      licence: "CC BY-NC-SA 4.0",
      licenceUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      shareAlike: "This file is derived from the OpenITI text and is shared under the same licence, CC BY-NC-SA 4.0 (attribution, non-commercial, share-alike).",
      credit: "al-Rāghib al-Iṣfahānī, al-Mufradāt, ed. al-Dāwūdī, p. {p}. Text: OpenITI (Romanov & Seydi), CC BY-NC-SA 4.0",
    },
    entryCount: entries.length,
    rootsCovered: coveredRoots.size,
    quranRoots,
    coveragePercent: Math.round((10000 * coveredRoots.size) / quranRoots) / 100,
    headingsRejected: rejected,
    unknownSurahNames: Object.fromEntries(unknownSurahs),
    totalBytes, maxBytes,
    perBook,
  };
  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`mufradat: ${entries.length} entries for ${coveredRoots.size}/${quranRoots} Qur'an roots (${manifest.coveragePercent}%), rejected ${JSON.stringify(rejected)}, unknown sūra names ${JSON.stringify(manifest.unknownSurahNames)}, ${totalBytes} bytes, largest ${maxBytes}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
}
