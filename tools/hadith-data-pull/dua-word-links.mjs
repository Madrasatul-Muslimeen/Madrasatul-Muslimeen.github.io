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
//   { schemaVersion, page, entries: [[place, count, arabic, translit, en, bn, root, lemma, lemmaCount, wbwKey, places]],
//     duas: { "<dua>": { f: <fingerprint of the words>, w: [entry index | -1, ...], x?: { "<word index>": how } } } }
// how (round 2) = "و" or "ف" when the word was matched without that leading letter, "~" when through the Qur'an's
// own spelling (صلاة -> صلوة), or both ("و~"). A word matched as it stands has no x entry.
// place = "S:A:W". wbwKey (round 4) is the key the Word card's Word-by-Word progress is saved under for that word
// (its dictionary word, or the stand-in key of a word without one: quran-word-form-key.js wbwClaimKey). places
// (round 3) = the spelling's first PLACES_KEPT places in the Qur'an, each surah*1000000 + ayah*1000 + word. The Dua page reads one file with its page of cards (nothing at startup, I9).
// Usage (repository root): node tools/hadith-data-pull/dua-word-links.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { duaWords, duaWordKey, duaWordTokens, duaWordsFingerprint, duaWordCandidates } from "../../app/js/dua-words.js";
import { wbwClaimKey } from "../../app/js/quran-word-form-key.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SURAHS = path.join(ROOT, "tools/quran-data-pull/output/surahs");
const DUA = path.join(__dirname, "output", "dua");

/** Round 3: how many of a spelling's places in the Qur'an the Dua word card lists (the Word card has them all). */
export const PLACES_KEPT = 8;

/** Pure: add one Qur'an word (its `place` "S:A:W", its number `n`) to a form. */
function addToForm(f, place, n, w) {
  f.count++;
  f.words.push({ place, n, w });
  if (f.places.length < PLACES_KEPT) f.places.push(n);
  const lemma = w.morphology?.lemma ?? "";
  const l = f.byLemma.get(lemma);
  if (l) l.n++;
  else f.byLemma.set(lemma, { n: 1, place, w });
}
const emptyForm = () => ({ count: 0, byLemma: new Map(), places: [], words: [] });

/** Pure: every Qur'an word -> Map(key -> { count, byLemma: Map(lemma -> first word), places: first PLACES_KEPT, words: all }). */
export function buildQuranForms(surahs) {
  const forms = new Map();
  for (const s of surahs) for (const a of s.ayahs) for (const w of a.words) {
    const place = `${s.surahNumber}:${a.ayah}:${w.position}`;
    for (const key of new Set([duaWordKey(w.arabic), duaWordKey(w.arabic, "ا")])) {
      if (!key) continue;
      let f = forms.get(key);
      if (!f) forms.set(key, f = emptyForm());
      addToForm(f, place, s.surahNumber * 1000000 + a.ayah * 1000 + w.position, w);
    }
  }
  return forms;
}

// The vowel-aware check (issue 712). duaWordKey is the loose key: it drops vowels and makes أ إ آ ٱ one letter, which
// linked و\u064eأ\u064eن\u064eا ("and I") to و\u064eإ\u0650ن\u064e\u0651آ ("and indeed we"). A dua word that carries vowels (vowels-<page>.json) is now
// linked only to a Qur'an word that agrees with it on hamza seats and on the consonants WITH shadda; the Qur'an's own
// script marks (dagger alef, madda sign, small high marks, tatweel, ٱ for ا) count as plain spelling.
const ALL_MARKS = /[\u0610-\u061a\u064b-\u065f\u06d6-\u06ed\u08d3-\u08ff]/gu;
/** One word's skeleton: letters, hamza seats and shadda kept; short vowels, small marks and tatweel off. `dagger` as in duaWordKey. */
export function duaWordSkeleton(word, dagger = "") {
  let t = String(word ?? "").normalize("NFC").replace(/ـ/gu, "").replace(/\u0670/gu, dagger);
  t = t.replace(ALL_MARKS, (m) => (m === "\u0651" ? m : "")).replace(/ٱ/gu, "ا");
  // Hamza written as its own letter before an alef is the madda alef (ء\u064eام\u064eن\u064e = آم\u064eن\u064e), kept apart from the other seats.
  t = t.replace(/ءا/gu, "آ").replace(/ى/gu, "ي").replace(/ة/gu, "ه");
  // A madda alef after the first letter is just a long «ا» (إ\u0650ل\u064e\u0651آ = إ\u0650ل\u064e\u0651ا); at the start it is its own seat.
  // (A «و»/«ف» in front does not count as a letter: وآجله keeps its seat, the dua word being linked without the «و».)
  t = t.replace(/(?<=.)(?<!^[وف])آ/gsu, "ا");
  t = t.replace(/[^ء-ي\u0651]/gu, "");
  // Nothing takes a shadda on an alef: the dua texts' إ\u0650لا\u064e\u0651 is the Qur'an's إ\u0650ل\u064e\u0651ا.
  t = t.replace(/(.)ا\u0651/gu, "$1\u0651ا");
  // The vowelled dua texts often leave out the shadda a sun letter takes after «ال» (الذ\u0650ي, الله\u0650) and on «لله», which
  // is the same word, not another one (measured: 91 الل\u064e\u0651ه\u064fم\u064e\u0651 and 69 الل\u064e\u0651ه\u064f were typed without it somewhere), so that
  // one shadda is not compared. Every other shadda is (ك\u064fف\u064fو\u064bا is not ك\u064fف\u064f\u0651و\u0653ا\u06df).
  return t.replace(/^([وفبكل]?ال)\u0651/u, "$1").replace(/^([وفبكل]?ال.)\u0651/u, "$1").replace(/^([وفبك]?لل)\u0651/u, "$1");
}
/** The short vowels only (fatha, damma, kasra, tanweens), in order; the Qur'an's small alef counts as a fatha. */
export function duaWordVowels(word) {
  return String(word ?? "").normalize("NFC").replace(/\u0670/gu, "\u064e").replace(/[^\u064b-\u0650\u08f0-\u08f2]/gu, "")
    .replace(/\u08f0/gu, "\u064b").replace(/\u08f1/gu, "\u064c").replace(/\u08f2/gu, "\u064d");
}

/**
 * Pure: the Qur'an words of `form` that agree with a vowelled dua word (leading letter `prefix` already cut off its
 * skeleton), as a form of its own -- or null when none agrees. Prefers the words whose short vowels agree too.
 */
export function agreeingForm(form, vowelled, prefix = "") {
  let sk = duaWordSkeleton(vowelled);
  let vw = String(vowelled ?? "").normalize("NFC");
  if (prefix) {
    if (!sk.startsWith(prefix)) return null;
    sk = sk.slice(prefix.length);
    vw = vw.replace(/^[^\u064b-\u0652]*[\u064b-\u0652]*/u, "");
  }
  const same = form.words.filter(({ w }) => [duaWordSkeleton(w.arabic), duaWordSkeleton(w.arabic, "ا")].includes(sk));
  if (!same.length) return null;
  const dv = duaWordVowels(vw);
  const vowelsAgree = same.filter(({ w }) => duaWordVowels(w.arabic) === dv);
  const f = emptyForm();
  for (const x of vowelsAgree.length ? vowelsAgree : same) addToForm(f, x.place, x.n, x.w);
  return f;
}

/**
 * Pure: link one dua word. `vowelled` is its vowelled form or "" (none: today's link, the first candidate that exists).
 * Returns { hit, form } or null (unlinked).
 */
export function linkWord(tok, vowelled, forms) {
  const key = duaWordKey(tok);
  if (!key) return null;
  for (const c of duaWordCandidates(key)) {
    const whole = forms.get(c.key);
    if (!whole) continue;
    // Through the Qur'an's own spelling (صلاة -> صلوة) there is no letter-for-letter skeleton to compare.
    if (!vowelled || c.spelling) return { hit: c, form: whole };
    const form = agreeingForm(whole, vowelled, c.prefix);
    if (form) return { hit: c, form };
  }
  return null;
}

/** Pure: one form -> its link row (the most frequent dictionary word's first place). */
export function linkRow(form) {
  const [lemma, best] = [...form.byLemma].sort((a, b) => b[1].n - a[1].n || (a[0] ? 0 : 1) - (b[0] ? 0 : 1))[0];
  const w = best.w;
  const lemmas = [...form.byLemma.keys()].filter(Boolean).length;
  // The word-by-word source opens some meanings with stray quote marks ("''হে আল্লাহ"); they are not part of the meaning.
  const clean = (x) => String(x ?? "").replace(/^['\u2018\u2019"]+/u, "").trim();
  return [best.place, form.count, w.arabic, w.transliteration ?? "", clean(w.translation?.en), clean(w.translation?.bn),
    w.morphology?.root ?? "", lemma, lemmas, wbwClaimKey(w) ?? "", form.places];
}

async function main() {
  const surahs = fs.readdirSync(SURAHS).filter((f) => /^surah_\d+\.json$/.test(f)).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(SURAHS, f), "utf8")));
  const forms = buildQuranForms(surahs);
  let words = 0, linked = 0, bytes = 0, changed = 0, dropped = 0, newKey = 0;
  const moves = new Map(), bump = (k) => moves.set(k, (moves.get(k) ?? 0) + 1);
  for (const f of fs.readdirSync(DUA).filter((x) => /^cards-\d+\.json$/.test(x))) {
    const page = Number(f.match(/\d+/)[0]);
    const { cards } = JSON.parse(fs.readFileSync(path.join(DUA, f), "utf8"));
    const vf = path.join(DUA, `vowels-${page}.json`);
    const vowels = fs.existsSync(vf) ? JSON.parse(fs.readFileSync(vf, "utf8")).duas : {};
    const entries = [], index = new Map(), duas = {};
    for (const c of cards) {
      const r = duaWords(c.text);
      if (!r) continue;
      const how = {};
      const fp = duaWordsFingerprint(r.words);
      const v = vowels[c.dua]?.f === fp ? vowels[c.dua].v : null;
      const w = duaWordTokens(r.words).map((tok, i) => {
        words++;
        // Round 2: the Qur'an's own spelling, then without a leading «و»/«ف». Issue 712: with vowels, only a word that agrees.
        const old = linkWord(tok, "", forms);
        const got = linkWord(tok, v?.[i] ?? "", forms);
        if (!got) { if (old) { dropped++; bump(`${tok} → ${linkRow(old.form)[2]} → (unlinked)`); } return -1; }
        linked++;
        const { hit, form } = got;
        const row = linkRow(form);
        if (old) {
          const was = linkRow(old.form);
          if (row[0] !== was[0] || row[2] !== was[2]) {
            changed++;
            if (row[9] !== was[9]) newKey++;
            bump(`${tok} → ${was[2]} → ${row[2]}`);
          }
        }
        if (hit.prefix || hit.spelling) how[i] = `${hit.prefix}${hit.spelling ? "~" : ""}`;
        const ik = `${hit.key}|${form.count}|${row[0]}`;
        if (!index.has(ik)) { index.set(ik, entries.length); entries.push(row); }
        return index.get(ik);
      });
      duas[c.dua] = { f: fp, w, ...(Object.keys(how).length ? { x: how } : {}) };
    }
    const out = JSON.stringify({ schemaVersion: 1, page, entries, duas });
    bytes += out.length;
    fs.writeFileSync(path.join(DUA, `words-${page}.json`), out);
  }
  console.log(`dua words ${words}, linked to a Qur'an word ${linked} (${(100 * linked / words).toFixed(1)}%), ${(bytes / 1024).toFixed(0)}K characters`);
  console.log(`vowel check: ${changed} links moved to another Qur'an word (${newKey} to a different wbwKey), ${dropped} dropped`);
  for (const [k, n] of [...moves].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`  ${n} x ${k}`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
