// Round 1 of "Dua words that work like Qur'an words" (decision 90; the research report
// https://claude.ai/code/artifact/de27ba8c-24df-4661-a366-f1ed31a44db7, round 1).
//
// For every Dua card whose words are picked out (app/js/dua-words.js), each word is linked to the Qur'an word
// spelled the same way once vowels and marks are taken off (duaWordKey): its place in the Qur'an, how often that
// spelling occurs there, its vowelled spelling, transliteration, word-by-word English and Bangla, root and
// dictionary word (lemma). Where the spelling has several dictionary words in the Qur'an, the most frequent is
// given and the link says it is one of several. A word not spelled like any Qur'an word is left unlinked.
// Everything here is a computer's suggestion; the card says so.
//
// Writes tools/hadith-data-pull/output/dua/words-<page>.json beside cards-<page>.json:
//   { schemaVersion, page, entries: [[place, count, arabic, translit, en, bn, root, lemma, lemmaCount]],
//     duas: { "<dua>": { f: <fingerprint of the words>, w: [entry index | -1, ...] } } }
// place = "S:A:W". The Dua page reads one file with its page of cards (nothing at startup, I9).
// Usage (repository root): node tools/hadith-data-pull/dua-word-links.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { duaWords, duaWordKey, duaWordTokens, duaWordsFingerprint } from "../../app/js/dua-words.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SURAHS = path.join(ROOT, "tools/quran-data-pull/output/surahs");
const DUA = path.join(__dirname, "output", "dua");

/** Pure: every Qur'an word -> Map(key -> { count, byLemma: Map(lemma -> first word) }). */
export function buildQuranForms(surahs) {
  const forms = new Map();
  for (const s of surahs) for (const a of s.ayahs) for (const w of a.words) {
    const place = `${s.surahNumber}:${a.ayah}:${w.position}`;
    for (const key of new Set([duaWordKey(w.arabic), duaWordKey(w.arabic, "ا")])) {
      if (!key) continue;
      let f = forms.get(key);
      if (!f) forms.set(key, f = { count: 0, byLemma: new Map() });
      f.count++;
      const lemma = w.morphology?.lemma ?? "";
      const l = f.byLemma.get(lemma);
      if (l) l.n++;
      else f.byLemma.set(lemma, { n: 1, place, w });
    }
  }
  return forms;
}

/** Pure: one form -> its link row (the most frequent dictionary word's first place). */
export function linkRow(form) {
  const [lemma, best] = [...form.byLemma].sort((a, b) => b[1].n - a[1].n || (a[0] ? 0 : 1) - (b[0] ? 0 : 1))[0];
  const w = best.w;
  const lemmas = [...form.byLemma.keys()].filter(Boolean).length;
  // The word-by-word source opens some meanings with stray quote marks ("''হে আল্লাহ"); they are not part of the meaning.
  const clean = (x) => String(x ?? "").replace(/^['\u2018\u2019"]+/u, "").trim();
  return [best.place, form.count, w.arabic, w.transliteration ?? "", clean(w.translation?.en), clean(w.translation?.bn),
    w.morphology?.root ?? "", lemma, lemmas];
}

async function main() {
  const surahs = fs.readdirSync(SURAHS).filter((f) => /^surah_\d+\.json$/.test(f)).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(SURAHS, f), "utf8")));
  const forms = buildQuranForms(surahs);
  let words = 0, linked = 0, bytes = 0;
  for (const f of fs.readdirSync(DUA).filter((x) => /^cards-\d+\.json$/.test(x))) {
    const page = Number(f.match(/\d+/)[0]);
    const { cards } = JSON.parse(fs.readFileSync(path.join(DUA, f), "utf8"));
    const entries = [], index = new Map(), duas = {};
    for (const c of cards) {
      const r = duaWords(c.text);
      if (!r) continue;
      const w = duaWordTokens(r.words).map((tok) => {
        words++;
        const key = duaWordKey(tok);
        const form = key && forms.get(key);
        if (!form) return -1;
        linked++;
        if (!index.has(key)) { index.set(key, entries.length); entries.push(linkRow(form)); }
        return index.get(key);
      });
      duas[c.dua] = { f: duaWordsFingerprint(r.words), w };
    }
    const out = JSON.stringify({ schemaVersion: 1, page, entries, duas });
    bytes += out.length;
    fs.writeFileSync(path.join(DUA, `words-${page}.json`), out);
  }
  console.log(`dua words ${words}, linked to a Qur'an word ${linked} (${(100 * linked / words).toFixed(1)}%), ${(bytes / 1024).toFixed(0)}K characters`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
