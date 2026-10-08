// Decision 90, round 1: tools/hadith-data-pull/dua-word-links.mjs -> output/dua/words-<page>.json. Each picked dua word
// linked to the Qur'an word spelled the same way. Expected values written BY HAND from the Qur'an data (2:131:7 is
// أَسْلَمْتُ, "I (have) submitted", root س ل م; 3:26:2 is ٱللَّهُمَّ). Run from the repository root.
import fs from "node:fs";
const { duaWords, duaWordKey, duaWordTokens, duaWordsFingerprint } = await import("../../app/js/dua-words.js");
const { buildQuranForms, linkRow } = await import("../hadith-data-pull/dua-word-links.mjs");

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const DIR = "tools/hadith-data-pull/output/dua";
const pages = fs.readdirSync(DIR).filter((f) => /^cards-\d+\.json$/.test(f)).map((f) => Number(f.match(/\d+/)[0])).sort((a, b) => a - b);
const files = new Map(pages.map((p) => [p, fs.existsSync(`${DIR}/words-${p}.json`) ? JSON.parse(fs.readFileSync(`${DIR}/words-${p}.json`, "utf8")) : null]));
check("POSITIVE CONTROL: 79 pages of cards, and a words file beside every one", pages.length === 79 && [...files.values()].every(Boolean), `${pages.length}`);

const surahs = fs.readdirSync("tools/quran-data-pull/output/surahs").filter((f) => /^surah_\d+\.json$/.test(f)).sort()
  .map((f) => JSON.parse(fs.readFileSync(`tools/quran-data-pull/output/surahs/${f}`, "utf8")));
const wordAt = new Map();
for (const s of surahs) for (const a of s.ayahs) for (const w of a.words) wordAt.set(`${s.surahNumber}:${a.ayah}:${w.position}`, w);
check("POSITIVE CONTROL: the Qur'an data holds its 77,429 words", wordAt.size === 77429, String(wordAt.size));

let duas = 0, toks = 0, linked = 0, misaligned = 0, wrongPlace = 0, quoteMeaning = 0, bytes = 0, maxFile = 0;
for (const p of pages) {
  const { cards } = JSON.parse(fs.readFileSync(`${DIR}/cards-${p}.json`, "utf8"));
  const f = files.get(p);
  const raw = fs.statSync(`${DIR}/words-${p}.json`).size; bytes += raw; maxFile = Math.max(maxFile, raw);
  for (const c of cards) {
    const r = duaWords(c.text);
    const d = f.duas[c.dua];
    if (!r) { if (d) misaligned++; continue; }
    duas++;
    const t = duaWordTokens(r.words);
    if (!d || d.f !== duaWordsFingerprint(r.words) || d.w.length !== t.length) { misaligned++; continue; }
    t.forEach((tok, i) => {
      toks++;
      const idx = d.w[i];
      if (idx < 0) return;
      linked++;
      const e = f.entries[idx], w = wordAt.get(e[0]);
      if (!w || ![duaWordKey(w.arabic), duaWordKey(w.arabic, "ا")].includes(duaWordKey(tok)) || w.arabic !== e[2]) wrongPlace++;
      if (/^['"‘’]/u.test(e[4]) || /^['"‘’]/u.test(e[5])) quoteMeaning++;
    });
  }
}
check("every dua with picked words has its links, built from these very words (fingerprint and word count match)", duas === 1091 && misaligned === 0, `${duas} ${misaligned}`);
check("18,040 dua words, 13,517 linked to a Qur'an word (74.9%)", toks === 18040 && linked === 13517, `${toks} ${linked}`);
check("every link points at a real Qur'an word spelled the same way (vowels and marks aside), with that word's own spelling", wrongPlace === 0, String(wrongPlace));
check("no meaning keeps the source's stray leading quote marks", quoteMeaning === 0, String(quoteMeaning));
check(`small: ${(bytes / 1024).toFixed(0)} KB in all, the largest page ${(maxFile / 1024).toFixed(1)} KB (loaded only with its page)`, bytes < 1024 * 1024 && maxFile < 40 * 1024);

const d1 = files.get(1).duas[1], e = (i) => files.get(1).entries[d1.w[i]];
check("INDEPENDENT -- Dua 1, word 2 «أسلمت» -> 2:131:7 أَسْلَمْتُ, aslamtu, \"I (have) submitted (myself)\", root سلم, dictionary word أَسْلَمَ",
  JSON.stringify(e(1)?.slice(0, 5)) === JSON.stringify(["2:131:7", 2, "أَسْلَمْتُ", "aslamtu", "I (have) submitted (myself)"]) && e(1)[6] === "سلم" && e(1)[7] === "أَسْلَمَ", JSON.stringify(e(1)));
check("INDEPENDENT -- Dua 1, word 1 «اللهم» -> 3:26:2 ٱللَّهُمَّ, Bangla «হে আল্লাহ» (the source's '' taken off)", e(0)?.[0] === "3:26:2" && e(0)[5] === "হে আল্লাহ", JSON.stringify(e(0)));
check("Dua 1, word 5 «وفوضت» is not linked (round 1 matches whole spellings; «و» is taken off in round 2)", d1.w[4] === -1);
const forms = buildQuranForms(surahs);
const many = forms.get(duaWordKey("من"));
check("a spelling with several dictionary words («من»: min / man) gives the most frequent one and says how many there are", !!many && linkRow(many)[8] >= 2 && linkRow(many)[7] === "مِن", JSON.stringify(many && linkRow(many)));
check("duaWordKey: vowels, marks, alef shapes, ya and ta marbuta unified; the small alef tried both ways",
  duaWordKey("ٱلْعَٰلَمِينَ") === "العلمين" && duaWordKey("ٱلْعَٰلَمِينَ", "ا") === "العالمين" && duaWordKey("رَحْمَةً") === "رحمه" && duaWordKey("عَلَىٰ") === "علي");
console.log(`\n==== Dua words linked to Qur'an words: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
