// Decision 90, round 5a: tools/hadith-data-pull/dua-vowels.mjs -> output/dua/vowels-<page>.json. A dua takes vowels
// only where a vowelled text (Hisn al-Muslim, HadeethEnc) holds its WHOLE word sequence, word for word. Expected values
// written BY HAND from the two sources: Dua 4 = HadeethEnc 5502; Dua 11 = Hisn al-Muslim chapter 29, dhikr 4.
// Run from the repository root.
import fs from "node:fs";
const { duaWords, duaWordKey, duaWordTokens, duaWordsFingerprint } = await import("../../app/js/dua-words.js");
const { sourceWords, findRun, cleanSourceWord } = await import("../hadith-data-pull/dua-vowels.mjs");

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const DIR = "tools/hadith-data-pull/output/dua";
// Arabic marks can be stored in either order (shadda then fatha, or fatha then shadda) and look the same: compare in NFC.
const N = (x) => String(x ?? "").normalize("NFC");
const pages = fs.readdirSync(DIR).filter((f) => /^cards-\d+\.json$/.test(f)).map((f) => Number(f.match(/\d+/)[0]));
const files = new Map(pages.map((p) => [p, fs.existsSync(`${DIR}/vowels-${p}.json`) ? JSON.parse(fs.readFileSync(`${DIR}/vowels-${p}.json`, "utf8")) : null]));
check("POSITIVE CONTROL: a vowels file beside each of the 79 pages of cards", pages.length === 79 && [...files.values()].every(Boolean));
const hisn = JSON.parse(fs.readFileSync("tools/hadith-data-pull/sources/hisn-asellam.json", "utf8"));
check("POSITIVE CONTROL: Hisn al-Muslim holds 133 chapters", Object.keys(hisn).length === 133, String(Object.keys(hisn).length));

let n = 0, hisnN = 0, bad = 0, vowelless = 0;
for (const p of pages) {
  const { cards } = JSON.parse(fs.readFileSync(`${DIR}/cards-${p}.json`, "utf8"));
  for (const c of cards) {
    const v = files.get(p).duas[c.dua];
    if (!v) continue;
    n++; if (v.s.startsWith("hisn:")) hisnN++;
    const r = duaWords(c.text), t = r ? duaWordTokens(r.words) : [];
    // Every vowelled word is the same word as the picked one once vowels are off -- the match is word for word.
    if (!r || v.f !== duaWordsFingerprint(r.words) || v.v.length !== t.length || v.v.some((w, i) => ![duaWordKey(w), duaWordKey(w, "ا")].includes(duaWordKey(t[i])))) bad++;
    if (!v.v.some((w) => /[ً-ْ]/u.test(w))) vowelless++;
  }
}
check("239 duas vowelled: 173 from Hisn al-Muslim, 66 from HadeethEnc (a text vowelling under four words in five gives nothing)", n === 239 && hisnN === 173, `${n} ${hisnN}`);
check("every vowelled dua is its own picked words, word for word, with the same fingerprint", bad === 0, String(bad));
check("every vowelled dua really carries vowel marks (a text that leaves the part unvowelled gives nothing)", vowelless === 0, String(vowelless));
const d4 = files.get(1).duas[4], d11 = files.get(1).duas[11];
check("INDEPENDENT -- Dua 4 from HadeethEnc 5502: «اللَّهُمَّ رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ»",
  d4?.s === "hadeethenc:5502" && N(d4.v.join(" ")) === N("اللَّهُمَّ رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ"), JSON.stringify(d4));
check("INDEPENDENT -- Dua 11 from Hisn al-Muslim 29:4: «بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي …»", d11?.s === "hisn:29:4" && N(d11.v.slice(0, 4).join(" ")) === N("بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي"), JSON.stringify(d11?.v.slice(0, 4)));
check("INDEPENDENT -- Hisn al-Muslim chapter 29, dhikr 4 is that text in the source file", N(Object.values(hisn)[28].Adhkar[3].Text).includes(N("بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي")));
check("Dua 1 is NOT vowelled: no source holds its exact words (nothing is guessed)", !files.get(1).duas[1]);
check("findRun: a whole run only, in order; one differing word is no match", (() => { const w = sourceWords("قال: «اللَّهُمَّ اغْفِرْ لِي ذَنْبِي»"); return findRun(w, ["اللهم", "اغفر", "لي"]) === 1 && findRun(w, ["اللهم", "ارحم", "لي"]) === -1; })());
check("cleanSourceWord keeps the vowels and drops the punctuation around the word", cleanSourceWord("«تَعَاهَدُوا،") === "تَعَاهَدُوا");
console.log(`\n==== Dua vowels, word for word from a vowelled text: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
