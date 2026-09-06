// One-time data pull for Phase 4 (QuranRevival module).
//
// Packages, per surah, everything the ayah renderer needs as one static JSON
// file: Uthmani text, tajweed-tagged text, English + Bangla translations,
// word-by-word (Arabic + transliteration + English gloss + Bangla gloss),
// and root/derivative/lemma/part-of-speech morphology merged in per word.
//
// Sources (matching the legacy index.html's proven plumbing, never Firestore):
//   - alquran.cloud: Uthmani text, en.sahih, bn.bengali, plus juz/page/ruku/
//     manzil/hizbQuarter/sajda metadata that comes free on every ayah.
//   - quran.com API v4: tajweed-tagged text, word-by-word (language=en/bn).
//   - GitHub mirror of the 2011 Quranic Arabic Corpus release: root/lemma/POS.
//
// Output: tools/quran-data-pull/output/surahs/surah_XXX.json (one per surah,
// zero-padded 3-digit to match the audio file convention already in use) plus
// a manifest.json. These are handed off for upload to archive.org -- this
// script never publishes anything itself.

const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "output", "surahs");
const MANIFEST_PATH = path.join(__dirname, "output", "manifest.json");

const REQUEST_DELAY_MS = 200;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(url, attempt = 1) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return await res.json();
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    const backoff = 500 * attempt * attempt;
    console.warn(`  retry ${attempt}/${MAX_RETRIES - 1} for ${url} after ${backoff}ms (${err.message})`);
    await sleep(backoff);
    return fetchJsonWithRetry(url, attempt + 1);
  }
}

// ---------------------------------------------------------------------------
// Morphology (Quranic Arabic Corpus, via community mirror) -- ported verbatim
// from index.html's proven parsing/matching logic (BW2AR, POS_LABELS,
// canonicalRootKey, parseMorphologyLine/Text, normalizeArabicForMatch,
// resolveWordKey), so root/derivative data merges the same way it already
// works in the legacy app. Reference only -- index.html itself is never
// edited or imported.
// ---------------------------------------------------------------------------

const BW2AR = {
  "'": "ء", "|": "آ", ">": "أ", "&": "ؤ", "<": "إ", "}": "ئ", A: "ا", b: "ب", p: "ة", t: "ت", v: "ث",
  j: "ج", H: "ح", x: "خ", d: "د", "*": "ذ", r: "ر", z: "ز", s: "س", $: "ش", S: "ص", D: "ض",
  T: "ط", Z: "ظ", E: "ع", g: "غ", f: "ف", q: "ق", k: "ك", l: "ل", m: "م", n: "ن", h: "ه",
  w: "و", Y: "ى", y: "ي", F: "ً", N: "ٌ", K: "ٍ", a: "َ", u: "ُ", i: "ِ", "~": "ّ", o: "ْ",
  "`": "ٰ", "{": "ٱ", _: "ـ",
};
function bwToAr(bw) {
  if (!bw) return "";
  return bw.split("").map((c) => (BW2AR[c] !== undefined ? BW2AR[c] : c)).join("");
}

const POS_LABELS = {
  N: "Noun", PN: "Proper Noun", V: "Verb", ADJ: "Adjective", P: "Preposition", CONJ: "Conjunction",
  DET: "Determiner", PRON: "Pronoun", REL: "Relative Pronoun", NEG: "Negative Particle",
  SUB: "Subordinating Conj.", COND: "Conditional", T: "Time Adverb", LOC: "Location Adverb",
  VOC: "Vocative Particle", ACC: "Accusative Particle", INTG: "Interrogative Particle",
  ANS: "Answer Particle", AMD: "Amendment Particle", PRP: "Purpose/Jussive Particle",
  FUT: "Future Particle", EMPH: "Emphatic Particle", EXP: "Exceptive Particle",
  CIRC: "Circumstantial", SUP: "Supplemental", RET: "Retraction Particle", CAUS: "Causative Particle",
  DEM: "Demonstrative Pronoun", REM: "Resumption Particle", INC: "Inceptive Particle",
  INTJ: "Interjection", RSLT: "Result Particle", SRF: "Preventive Particle", CERT: "Particle of Certainty",
  ACT_PCPL: "Active Participle", PASS_PCPL: "Passive Participle", IMPN: "Imperative Verb",
  INL: "Quranic Initials", NV: "Verb-like Noun",
};
function posLabel(tag) {
  return POS_LABELS[tag] || tag;
}

const MORPH_URLS = [
  "https://raw.githubusercontent.com/alstat/QuranTree.jl/master/data/quranic-corpus-morphology-0.4.txt",
  "https://cdn.jsdelivr.net/gh/alstat/QuranTree.jl@master/data/quranic-corpus-morphology-0.4.txt",
];
const MORPH_EXPECTED_ROWS = 128219;

function canonicalRootKey(rootBW) {
  if (!rootBW) return rootBW;
  const last = rootBW.slice(-1);
  if (last === "w" || last === "y") return rootBW.slice(0, -1) + "#";
  return rootBW;
}

function parseMorphologyLine(line) {
  if (!line || line[0] !== "(") return null;
  const closeIdx = line.indexOf(")");
  if (closeIdx === -1) return null;
  const loc = line.slice(1, closeIdx);
  const rest = line.slice(closeIdx + 1).trim();
  if (!rest) return null;
  const tokens = rest.split(/\s+/);
  if (tokens.length < 3) return null;
  const form = tokens[0], tag = tokens[1], features = tokens.slice(2).join("|");
  return { loc, form, tag, features };
}

function parseMorphologyText(text) {
  const idx = {};
  const rootIdx = {};
  const ayahWordSets = {};
  const chapters = new Set();
  let rowCount = 0;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseMorphologyLine(lines[i]);
    if (!parsed) continue;
    const parts = parsed.loc.split(":");
    if (parts.length < 3) continue;
    const sura = parts[0], ayah = parts[1], word = parts[2];
    chapters.add(sura);
    rowCount++;
    const wordKey = `${sura}:${ayah}:${word}`;
    if (!idx[wordKey]) idx[wordKey] = [];
    idx[wordKey].push({ tag: parsed.tag, features: parsed.features, form: parsed.form });

    const ayahKey = `${sura}:${ayah}`;
    if (!ayahWordSets[ayahKey]) ayahWordSets[ayahKey] = new Set();
    ayahWordSets[ayahKey].add(parseInt(word, 10));

    const feats = parsed.features.split("|");
    let rootBW = "", lemBW = "";
    for (const f of feats) {
      if (f.startsWith("ROOT:")) rootBW = f.slice(5);
      else if (f.startsWith("LEM:")) lemBW = f.slice(4);
    }
    if (rootBW) {
      const canonKey = canonicalRootKey(rootBW);
      if (!rootIdx[canonKey]) rootIdx[canonKey] = [];
      rootIdx[canonKey].push({ sura, ayah, word, form: parsed.form, tag: parsed.tag, features: parsed.features, lem: lemBW, root: rootBW });
    }
  }
  const ayahWords = {};
  Object.keys(ayahWordSets).forEach((k) => {
    ayahWords[k] = [...ayahWordSets[k]].sort((a, b) => a - b);
  });
  return { idx, rootIdx, ayahWords, chapterCount: chapters.size, rowCount };
}

async function loadMorphology() {
  let lastErr = null;
  for (const url of MORPH_URLS) {
    try {
      console.log(`Fetching morphology corpus from ${url} ...`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      const text = await res.text();
      const { idx, rootIdx, ayahWords, chapterCount, rowCount } = parseMorphologyText(text);
      console.log(`  ${rowCount} rows (expected ~${MORPH_EXPECTED_ROWS}), ${Object.keys(idx).length} words, ${chapterCount}/114 chapters.`);
      if (chapterCount < 114 || rowCount < MORPH_EXPECTED_ROWS * 0.97) {
        throw new Error(`incomplete data -- ${rowCount}/${MORPH_EXPECTED_ROWS} rows, ${chapterCount}/114 chapters`);
      }
      return { idx, rootIdx, ayahWords, chapterCount, rowCount };
    } catch (err) {
      console.warn(`  morphology source failed, trying next: ${err.message}`);
      lastErr = err;
    }
  }
  throw lastErr || new Error("all morphology sources failed");
}

function normalizeArabicForMatch(s) {
  return (s || "")
    .replace(/[ً-ْٰۖ-ۭ]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ـ/g, "")
    .trim();
}

function reconstructWordArabic(morphIdx, wordKey) {
  const segs = morphIdx[wordKey];
  if (!segs) return "";
  return segs.map((s) => bwToAr(s.form || "")).join("");
}

function resolveWordKey(morph, ayahKey, arabicText, positionFallback) {
  const wordNums = morph.ayahWords[ayahKey];
  if (wordNums && wordNums.length) {
    const target = normalizeArabicForMatch(arabicText);
    for (const wn of wordNums) {
      const key = `${ayahKey}:${wn}`;
      if (normalizeArabicForMatch(reconstructWordArabic(morph.idx, key)) === target) return key;
    }
  }
  return `${ayahKey}:${positionFallback}`;
}

function morphDataForWord(morph, wordKey) {
  const segs = morph.idx[wordKey];
  if (!segs || !segs.length) return null;
  const tags = segs.map((s) => posLabel(s.tag)).join(" + ");
  let root = "", lemma = "", rootBW = "";
  segs.forEach((s) => {
    const feats = (s.features || "").split("|");
    const rf = feats.find((f) => f.startsWith("ROOT:"));
    const lf = feats.find((f) => f.startsWith("LEM:"));
    if (rf && !root) { rootBW = rf.slice(5); root = bwToAr(rootBW); }
    if (lf && !lemma) lemma = bwToAr(lf.slice(4));
  });
  const rootCount = rootBW && morph.rootIdx[canonicalRootKey(rootBW)] ? morph.rootIdx[canonicalRootKey(rootBW)].length : 0;
  return { root, lemma, pos: tags, rootCount };
}

// ---------------------------------------------------------------------------
// Per-surah pull
// ---------------------------------------------------------------------------

async function fetchSurah(surahNum, morph) {
  const uthmani = await fetchJsonWithRetry(`https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`);
  await sleep(REQUEST_DELAY_MS);
  const en = await fetchJsonWithRetry(`https://api.alquran.cloud/v1/surah/${surahNum}/en.sahih`);
  await sleep(REQUEST_DELAY_MS);
  const bn = await fetchJsonWithRetry(`https://api.alquran.cloud/v1/surah/${surahNum}/bn.bengali`);
  await sleep(REQUEST_DELAY_MS);
  const tajweed = await fetchJsonWithRetry(`https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number=${surahNum}`);
  await sleep(REQUEST_DELAY_MS);
  const wbwEn = await fetchJsonWithRetry(
    `https://api.quran.com/api/v4/verses/by_chapter/${surahNum}?words=true&word_fields=text_uthmani,transliteration&translation_fields=text&language=en&per_page=300`
  );
  await sleep(REQUEST_DELAY_MS);
  const wbwBn = await fetchJsonWithRetry(
    `https://api.quran.com/api/v4/verses/by_chapter/${surahNum}?words=true&word_fields=text_uthmani,transliteration&translation_fields=text&language=bn&per_page=300`
  );
  await sleep(REQUEST_DELAY_MS);

  const tajweedByAyah = {};
  for (const v of tajweed.verses) {
    const ayahNum = Number(v.verse_key.split(":")[1]);
    tajweedByAyah[ayahNum] = v.text_uthmani_tajweed;
  }
  const bnByAyah = {};
  for (const a of bn.data.ayahs) bnByAyah[a.numberInSurah] = a.text;
  const enByAyah = {};
  for (const a of en.data.ayahs) enByAyah[a.numberInSurah] = a.text;
  const wbwBnByAyah = {};
  for (const v of wbwBn.verses) wbwBnByAyah[v.verse_key] = v.words;

  const ayahs = uthmani.data.ayahs.map((a) => {
    const ayahNum = a.numberInSurah;
    const verseKey = `${surahNum}:${ayahNum}`;
    const wbwEnVerse = wbwEn.verses.find((v) => v.verse_key === verseKey);
    const bnWords = wbwBnByAyah[verseKey] || [];

    const words = (wbwEnVerse ? wbwEnVerse.words : [])
      .filter((w) => w.char_type_name === "word")
      .map((w, i) => {
        const arabic = w.text_uthmani || w.text || "";
        const bnWord = bnWords.find((bw) => bw.position === w.position) || null;
        const wordKey = resolveWordKey(morph, verseKey, arabic, w.position);
        const morphData = morphDataForWord(morph, wordKey);
        return {
          position: w.position,
          arabic,
          transliteration: w.transliteration && w.transliteration.text ? w.transliteration.text : "",
          translation: {
            en: w.translation && w.translation.text ? w.translation.text.replace(/<[^>]*>/g, "") : "",
            bn: bnWord && bnWord.translation && bnWord.translation.text ? bnWord.translation.text.replace(/<[^>]*>/g, "") : "",
          },
          morphology: morphData,
        };
      });

    return {
      ayah: ayahNum,
      uthmaniText: a.text,
      tajweedText: tajweedByAyah[ayahNum] || null,
      translations: { en: enByAyah[ayahNum] || "", bn: bnByAyah[ayahNum] || "" },
      juz: a.juz,
      page: a.page,
      ruku: a.ruku,
      manzil: a.manzil,
      hizbQuarter: a.hizbQuarter,
      sajda: !!a.sajda,
      words,
    };
  });

  return {
    surahNumber: surahNum,
    surahNameArabic: uthmani.data.name,
    surahNameEnglish: uthmani.data.englishName,
    surahNameTranslation: uthmani.data.englishNameTranslation,
    revelationType: uthmani.data.revelationType,
    ayahCount: ayahs.length,
    ayahs,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startArg = Number(process.argv[2]) || 1;
  const endArg = Number(process.argv[3]) || 114;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const morph = await loadMorphology();

  let totalAyahs = 0;
  let totalWords = 0;
  let wordsWithRoot = 0;
  const failures = [];

  for (let n = startArg; n <= endArg; n++) {
    process.stdout.write(`Surah ${n}/${endArg} ... `);
    try {
      const data = await fetchSurah(n, morph);
      const outPath = path.join(OUT_DIR, `surah_${String(n).padStart(3, "0")}.json`);
      fs.writeFileSync(outPath, JSON.stringify(data));
      totalAyahs += data.ayahCount;
      for (const a of data.ayahs) {
        totalWords += a.words.length;
        wordsWithRoot += a.words.filter((w) => w.morphology && w.morphology.root).length;
      }
      console.log(`ok (${data.ayahCount} ayahs)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      failures.push({ surah: n, error: err.message });
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
    range: { start: startArg, end: endArg },
    surahCount: endArg - startArg + 1 - failures.length,
    totalAyahs,
    totalWords,
    wordsWithRoot,
    morphology: { chapterCount: morph.chapterCount, rowCount: morph.rowCount },
    sources: [
      "alquran.cloud (Uthmani text, en.sahih, bn.bengali translations, juz/page/ruku/manzil/hizbQuarter/sajda metadata)",
      "api.quran.com v4 (tajweed-tagged text, word-by-word Arabic/transliteration/English/Bangla)",
      "GitHub mirror of the 2011 Quranic Arabic Corpus release (root/lemma/part-of-speech)",
    ],
    failures,
  };
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`\nDone. ${manifest.surahCount} surahs, ${totalAyahs} ayahs, ${totalWords} words (${wordsWithRoot} with root data).`);
  if (failures.length) console.log(`${failures.length} surah(s) failed: ${failures.map((f) => f.surah).join(", ")}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
