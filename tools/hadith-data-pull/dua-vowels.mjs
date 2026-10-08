// Round 5a of "Dua words that work like Qur'an words" (decision 90: Q3 "Use it, remind me about permission"; the
// research report https://claude.ai/code/artifact/de27ba8c-24df-4661-a366-f1ed31a44db7, round 5).
//
// A dua's picked words (app/js/dua-words.js) carry no vowels: OpenITI's texts are unvowelled. Two vowelled texts hold
// many of the same duas, and a dua takes its vowels from one of them ONLY when its whole word sequence is found
// there, word for word (the same key as the Qur'an links: duaWordKey, the small alef tried both ways). Nothing is
// vowelled by a machine, because a wrong vowel in a dua is a recitation mistake. The card still says a person checks it.
//   1. Hisn al-Muslim (al-Qahtani), as typed and checked by Abdellah Sellam: asellam/HisnElMuslim hisn.json, MIT,
//      (c) 2021 Abdellah Sellam (docs/reports/2026-10-06-dua-module-resources.md); copied to sources/hisn-asellam.json.
//   2. HadeethEnc's Arabic (tools/hadith-data-pull/output/hadeethenc/ar), shown as it stands; its permission for this
//      use is the Owner's to settle with HadeethEnc (decision 90 reminder).
//
// Writes tools/hadith-data-pull/output/dua/vowels-<page>.json:
//   { schemaVersion, page, duas: { "<dua>": { f: <fingerprint of the words>, v: [vowelled word, ...], s: source } } }
// s = "hisn:<chapter number>:<dhikr number>" or "hadeethenc:<id>". v has one word per picked word.
// Usage (repository root): node tools/hadith-data-pull/dua-vowels.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { duaWords, duaWordKey, duaWordTokens, duaWordsFingerprint } from "../../app/js/dua-words.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DUA = path.join(__dirname, "output", "dua");
const HE = path.join(__dirname, "output", "hadeethenc", "ar");
const HISN = path.join(__dirname, "sources", "hisn-asellam.json");

const VOWEL_MARK = /[\u064B-\u0652]/u;

/** A source word as shown: its letters and vowel marks, without the punctuation around it. */
export function cleanSourceWord(tok) {
  return String(tok ?? "").replace(/[«»"“”()\[\]{}،؛,.:!?…ـ*]/gu, "").trim();
}

/** Pure: a text -> its words, each { shown, keys:Set } (keys: the small alef dropped or written as alef). */
export function sourceWords(text) {
  return String(text ?? "").split(/\s+/u).map(cleanSourceWord).filter((w) => duaWordKey(w))
    .map((shown) => ({ shown, keys: new Set([duaWordKey(shown), duaWordKey(shown, "ا")]) }));
}

/** Pure: the first place in `words` where every key of `keys` matches in order, or -1. */
export function findRun(words, keys) {
  outer: for (let i = 0; i + keys.length <= words.length; i++) {
    for (let j = 0; j < keys.length; j++) if (!words[i + j].keys.has(keys[j])) continue outer;
    return i;
  }
  return -1;
}

export function loadSources() {
  const out = [];
  const hisn = JSON.parse(fs.readFileSync(HISN, "utf8"));
  Object.values(hisn).forEach((chapter, ci) => (chapter.Adhkar ?? []).forEach((d, di) => out.push({ s: `hisn:${ci + 1}:${di + 1}`, words: sourceWords(d.Text) })));
  for (const f of fs.readdirSync(HE).filter((x) => x.endsWith(".json")).sort()) {
    for (const h of JSON.parse(fs.readFileSync(path.join(HE, f), "utf8")).hadiths ?? []) out.push({ s: `hadeethenc:${h.id}`, words: sourceWords(h.hadeeth) });
  }
  return out;
}

async function main() {
  const sources = loadSources();
  // An index on the first word's key, so each dua is compared only with texts holding its first word.
  const byKey = new Map();
  sources.forEach((src, si) => src.words.forEach((w) => w.keys.forEach((k) => { if (!byKey.has(k)) byKey.set(k, new Set()); byKey.get(k).add(si); })));
  let picked = 0, vowelled = 0, fromHisn = 0;
  for (const f of fs.readdirSync(DUA).filter((x) => /^cards-\d+\.json$/.test(x))) {
    const page = Number(f.match(/\d+/)[0]);
    const { cards } = JSON.parse(fs.readFileSync(path.join(DUA, f), "utf8"));
    const duas = {};
    for (const c of cards) {
      const r = duaWords(c.text);
      if (!r) continue;
      picked++;
      const toks = duaWordTokens(r.words), keys = toks.map((t) => duaWordKey(t));
      if (keys.some((k) => !k)) continue;
      for (const si of [...(byKey.get(keys[0]) ?? [])].sort((a, b) => a - b)) {
        const at = findRun(sources[si].words, keys);
        if (at < 0) continue;
        // A text that leaves this part unvowelled (HadeethEnc vowels the Prophet's words, not always the rest) gives
        // nothing: at least four words in five must carry a vowel mark.
        const run = sources[si].words.slice(at, at + keys.length);
        if (run.filter((w) => VOWEL_MARK.test(w.shown)).length < 0.8 * run.length) continue;
        duas[c.dua] = { f: duaWordsFingerprint(r.words), v: sources[si].words.slice(at, at + keys.length).map((w) => w.shown), s: sources[si].s };
        vowelled++;
        if (sources[si].s.startsWith("hisn:")) fromHisn++;
        break;
      }
    }
    fs.writeFileSync(path.join(DUA, `vowels-${page}.json`), JSON.stringify({ schemaVersion: 1, page, duas }));
  }
  console.log(`duas with picked words ${picked}; vowelled from a matching text ${vowelled} (Hisn al-Muslim ${fromHisn}, HadeethEnc ${vowelled - fromHisn})`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
