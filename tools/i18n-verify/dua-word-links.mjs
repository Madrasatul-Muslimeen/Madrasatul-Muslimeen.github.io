// Decision 90, round 1: tools/hadith-data-pull/dua-word-links.mjs -> output/dua/words-<page>.json. Each picked dua word
// linked to the Qur'an word spelled the same way. Expected values written BY HAND from the Qur'an data (2:131:7 is
// أَسْلَمْتُ, "I (have) submitted", root س ل م; 3:26:2 is ٱللَّهُمَّ). Run from the repository root.
import fs from "node:fs";
const { duaWords, duaWordKey, duaWordTokens, duaWordsFingerprint, duaWordCandidates, QURAN_SPELLINGS } = await import("../../app/js/dua-words.js");
const { wbwClaimKey } = await import("../../app/js/quran-word-form-key.js");
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

const prefixed = [], spelled = [];
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
      // Round 2: a word matched without its leading «و»/«ف», or through the Qur'an's own spelling, says so in x.
      const how = d.x?.[i] ?? "", prefix = how.replace("~", ""), k0 = duaWordKey(tok);
      let k = prefix ? (k0.startsWith(prefix) ? k0.slice(1) : null) : k0;
      if (k && how.includes("~")) k = QURAN_SPELLINGS[k] ?? null;
      if (!w || !k || ![duaWordKey(w.arabic), duaWordKey(w.arabic, "ا")].includes(k) || w.arabic !== e[2] || e[9] !== wbwClaimKey(w)) wrongPlace++;
      if (prefix) prefixed.push(tok); if (how.includes("~")) spelled.push(tok);
      if (/^['"‘’]/u.test(e[4]) || /^['"‘’]/u.test(e[5])) quoteMeaning++;
    });
  }
}
check("every dua with picked words has its links, built from these very words (fingerprint and word count match)", duas === 1091 && misaligned === 0, `${duas} ${misaligned}`);
// Round 2 (decision 90) added the Qur'an's own spellings and a leading «و»/«ف»: 13,517 (74.9%) in round 1, updated in place.
check("18,040 dua words, 14,036 linked to a Qur'an word (77.8%; 14,060 before the vowel check of issue 712, 13,517 before round 2)", toks === 18040 && linked === 14036, `${toks} ${linked}`);
check("every link points at a real Qur'an word spelled the same way (vowels and marks aside, a leading «و»/«ف» or the Qur'an's own spelling as recorded), with that word's own spelling and its Word-by-Word progress key", wrongPlace === 0, String(wrongPlace));
check("ROUND 3: every link lists up to 8 of the spelling's places, in Qur'an order, starting at its own count's first place, each a real word spelled that way",
  [...files.values()].every((f) => f.entries.every((e) => Array.isArray(e[10]) && e[10].length === Math.min(8, e[1]) && e[10].every((n, i, a) => (i === 0 || n > a[i - 1]) && wordAt.has(`${Math.floor(n / 1e6)}:${Math.floor(n / 1e3) % 1000}:${n % 1000}`)))));
check("INDEPENDENT -- «أسلمت»'s places: 2:131:7 and 3:20:4 (its two times in the Qur'an)", JSON.stringify(files.get(1).entries[files.get(1).duas[1].w[1]][10]) === JSON.stringify([2131007, 3020004]), JSON.stringify(files.get(1).entries[files.get(1).duas[1].w[1]][10]));
check("ROUND 2: 520 words matched without a leading «و»/«ف» (522 before the vowel check), 26 through the Qur'an's own spelling", prefixed.length === 520 && spelled.length === 26, `${prefixed.length} ${spelled.length}`);
check("ROUND 2: «وبحمده», «وأتوب» and «الصلاة» are linked; «فلان», «فاجر» and «فجأة» are not", ["وبحمده", "وأتوب"].every((x) => prefixed.includes(x)) && spelled.includes("الصلاة") && !prefixed.includes("فلان") && !prefixed.includes("فاجر") && !spelled.includes("فجأة"));
check("ROUND 2: duaWordCandidates -- «والصلاة» tries itself, then «الصلوه» without «و»; «فيك» keeps its «ف» (it is «في»)",
  JSON.stringify(duaWordCandidates(duaWordKey("والصلاة")).map((c) => c.key)) === JSON.stringify(["والصلاه", "الصلاه", "الصلوه"]) && duaWordCandidates(duaWordKey("فيك")).length === 1);
check("no meaning keeps the source's stray leading quote marks", quoteMeaning === 0, String(quoteMeaning));
check(`small: ${(bytes / 1024).toFixed(0)} KB in all, the largest page ${(maxFile / 1024).toFixed(1)} KB (loaded only with its page)`, bytes < 1536 * 1024 && maxFile < 64 * 1024);

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
// ---- Issue 712: a word with vowels links only to a Qur'an word that agrees with its hamza seat and shadda. Expected values by hand.
const { linkWord } = await import("../hadith-data-pull/dua-word-links.mjs");
const F1 = files.get(1), D2 = F1.duas[2], at2 = (i) => F1.entries[D2.w[i]];
check("ISSUE 712 -- Dua 2 «وأنا» (words 9 and 11) link to 2:160:9 وَأَنَا, never to وَإِنَّآ at 2:70:13", [8, 10].every((i) => at2(i)?.[0] === "2:160:9" && at2(i)[2] === "وَأَنَا") && !JSON.stringify(F1).includes("2:70:13"), JSON.stringify([at2(8), at2(10)]));
check("ISSUE 712 -- no dua word in any page links to the Qur'an's وَإِنَّآ", ![...files.values()].some((f) => f.entries.some((e) => e[2] === "وَإِنَّآ")));
check("ISSUE 712 -- Dua 2 «إلا» is still linked, to 2:9:7 إِلَّآ (the madda sign is plain spelling)", at2(5)?.[0] === "2:9:7" && at2(5)[2].replace(/[^ء-ي]/gu, "").replace("آ", "ا") === "إلا", JSON.stringify(at2(5)));
check("ISSUE 712 -- «إِلَّا», «سُبْحَانَ» and «السَّلَامُ» are still linked (dagger alef, madda sign, ٱ are plain spelling)",
  linkWord("إلا", "إِلَّا", forms) && linkWord("إلا", "إِلاَّ", forms) && linkWord("سبحان", "سُبْحَانَ", forms) && linkWord("السلام", "السَّلَامُ", forms));
check("ISSUE 712 -- «كُفُوًا» links to 112:4:4 كُفُوًا and not to كُفُّوٓا۟ (which has a shadda)",
  (() => { const r = linkWord("كفوا", "كُفُوًا", forms); return r && r.form.words.length === 1 && r.form.words[0].place === "112:4:4"; })());
check("ISSUE 712 -- «إِنْ» links only to Qur'an words seated on إ; «أَنْ» only to أ", (() => {
  const a = linkWord("إن", "إِنْ", forms), b = linkWord("أن", "أَنْ", forms);
  return a && b && a.form.words.length > 0 && a.form.words.every((x) => x.w.arabic.includes("إ")) && b.form.words.every((x) => x.w.arabic.includes("أ"));
})());
check("ISSUE 712 -- a word without vowels keeps its old link: «أسلمت» -> 2:131:7 and «اللهم» -> 3:26:2", linkWord("أسلمت", "", forms)?.form.places[0] === 2131007 && linkWord("اللهم", "", forms)?.form.places[0] === 3026002);
check("ISSUE 712 -- «الله», «اللهم», «الذي», «لله» typed without their sun-letter shadda stay linked", ["الله|اللهِ", "اللهم|اللهُمَّ", "الذي|الذِي", "لله|لِلهِ"].every((p) => { const [k, v] = p.split("|"); return !!linkWord(k, v, forms); }));
// Mutations: the same tool, run with one rule broken, must fail the check written for it.
const SRC = "tools/hadith-data-pull/dua-word-links.mjs";
const src = fs.readFileSync(SRC, "utf8");
async function mutant(name, from, to) {
  if (src.split(from).length !== 2) throw new Error(`mutation ${name}: expected exactly one occurrence of the line to break`);
  const file = `tools/hadith-data-pull/_mutant-${name}.mjs`;
  fs.writeFileSync(file, src.replace(from, to));
  try { return await import(`../../${file}`); } finally { fs.unlinkSync(file); }
}
const noHamza = await mutant("hamza", 't = t.replace(/[^ء-ي\\u0651]/gu, "");', 't = t.replace(/[أإآ]/gu, "ا").replace(/[^ء-ي\\u0651]/gu, "");');
const { duaWordSkeleton } = await import("../hadith-data-pull/dua-word-links.mjs");
check("hamza seats stay apart: «وَأَنَا» and «وَإِنَا» have different skeletons", duaWordSkeleton("وَأَنَا") !== duaWordSkeleton("وَإِنَا"));
check("MUTATION -- hamza seats collapsed again: «وَأَنَا» and «وَإِنَا» get one skeleton, and the check above would FAIL", noHamza.duaWordSkeleton("وَأَنَا") === noHamza.duaWordSkeleton("وَإِنَا"));
const noShadda = await mutant("shadda", 't = t.replace(/[^ء-ي\\u0651]/gu, "");', 't = t.replace(/[^ء-ي]/gu, "");');
const ms = noShadda.buildQuranForms(surahs);
check("shadda is compared: «كُفُوًا» and «كُفُّوٓا۟» have different skeletons", duaWordSkeleton("كُفُوًا") !== duaWordSkeleton("كُفُّوٓا۟"));
check("MUTATION -- shadda ignored: «كُفُوًا» and «كُفُّوٓا۟» get one skeleton, and the check above would FAIL", noShadda.duaWordSkeleton("كُفُوًا") === noShadda.duaWordSkeleton("كُفُّوٓا۟") && ms.size > 0);
console.log(`\n==== Dua words linked to Qur'an words: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
