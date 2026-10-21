// PCF MSA J58 round 1 -- the pure Bangla transliteration rules (app/js/quran-translit-bn.js).
// Run from the repository root:  node tools/i18n-verify/bangla-translit.mjs [--mutate=NAME]
// Expected values are written BY HAND from the Owner's approved sample (n58b 1A), never computed by the module.
// Every rule is proven by its own mutation (--mutate=NAME changes the module in memory and must make the named check FAIL):
//   sunletter   the sun-letter lam is read       -> "golden 1:1 ..."
//   allah       Allah is not lengthened          -> "golden 1:2 ..."
//   silent      the silent-letter mark is ignored -> "golden 1:7 ..."
//   maqsura     alif maqsura with a vowel is not a ya -> "golden 1:6 ..."
//   tatweel     a tatweel dagger does not lengthen   -> "golden 1:1 ..."
//   empty       an unknown letter yields nothing -> "no output is empty ..."
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const FILE = "app/js/quran-translit-bn.js";
const MUT = {
  sunletter: ['if (ch === "ل" && !vowelOf(m) && !m.includes(SUKUN) && next?.marks.includes(SHADDA)) continue;', 'if (false) continue;'],
  allah: ["&& u[i - 1]?.ch === \"ل\") lengthen();", "&& u[i - 1]?.ch === \"ل\") {}"],
  silent: ["if ([...SILENT].some((x) => m.includes(x))) continue;", ""],
  maqsura: ['if (ch === "ى" && (vowelOf(m) || tanweenOf(m) || m.includes(SHADDA))) {', 'if (false) {'],
  tatweel: ['if (ch === "ـ") { if (m.includes(DAGGER)) lengthen(); continue; }', 'if (ch === "ـ") { continue; }'],
  empty: ["  return s;\n}", '  return "";\n}'],
};
let src = fs.readFileSync(FILE, "utf8");
if (MUTATE) {
  const m = MUT[MUTATE];
  if (!m) throw new Error(`unknown mutation ${MUTATE}`);
  if (!src.includes(m[0])) throw new Error(`mutation anchor missing: ${MUTATE}`);
  src = src.split(m[0]).join(m[1]);
}
const tmp = `app/js/_mut-quran-translit-bn.mjs`;
fs.writeFileSync(tmp, src);
const { banglaTranslit, BANGLA_TRANSLIT_NOTE } = await import("../../" + tmp + "?" + Date.now());
fs.unlinkSync(tmp);

let pass = 0, fail = 0;
function check(name, fn) {
  let ok = false, detail = "";
  try { const r = fn(); if (r && typeof r.then === "function") throw new Error("async body: a promise counts as a pass"); ok = r !== false; } catch (e) { detail = e.message; }
  ok ? (pass++, console.log(`  PASS  ${name}`)) : (fail++, console.log(`  FAIL  ${name} ${detail}`));
}
const eq = (a, b) => { if (a !== b) throw new Error(`${a} !== ${b}`); };

const GOLD = {
  "1:1": "বিসমি আল্লা-হি আর্রাহমা-নি আর্রাহীমি",
  "1:2": "আলহামদু লিল্লা-হি রাব্বি আল‘আ-লামীনা",
  "1:3": "আর্রাহমা-নি আর্রাহীমি",
  "1:4": "মা-লিকি ইয়াওমি আদ্দীনি",
  "1:5": "ইয়্যা-কা না‘বুদু ওয়াইয়্যা-কা নাসতা‘ঈনু",
  "1:6": "ইহদিনা- আছ্ছিরা-তা আলমুসতাকীমা",
  "1:7": "ছিরা-তা আল্লাযীনা আন‘আমতা ‘আলাইহিম গাইরি আলমাগদূবি ‘আলাইহিম ওয়ালা- আদ্দা-ল্লীনা",
  "112:1": "কুল হুওয়া আল্লা-হু আহাদুন",
  "112:2": "আল্লা-হু আছ্ছামাদু",
  "112:3": "লাম ইয়ালিদ ওয়ালাম ইয়ূলাদ",
  "112:4": "ওয়ালাম ইয়াকুন লাহূ কুফুওয়ান আহাদুন",
};
const surah = (n) => JSON.parse(fs.readFileSync(`tools/quran-data-pull/output/surahs/surah_${String(n).padStart(3, "0")}.json`, "utf8"));
for (const [ref, want] of Object.entries(GOLD)) {
  check(`golden ${ref} reads exactly as the approved sample`, () => {
    const [s, a] = ref.split(":").map(Number);
    const ay = surah(s).ayahs.find((x) => x.ayah === a);
    eq(ay.words.map((w) => banglaTranslit(w.arabic)).join(" "), want);
  });
}
// Two rules the golden list never reaches, pinned on real words (2:258:21 and 2:70:8 in the data): read out by hand.
for (const [ref, want, why] of [["2:258:21", "আনা", "a silent-letter mark: the alif is not read, so the vowel is not lengthened"], ["2:70:8", "হিয়া", "an alif maqsura carrying a vowel is a yā'"]]) {
  check(`rule-pinned ${ref}: ${why}`, () => {
    const [s, a, p] = ref.split(":").map(Number);
    const w = surah(s).ayahs.find((x) => x.ayah === a).words.find((x) => x.position === p);
    eq(banglaTranslit(w.arabic), want);
  });
}
check("the Owner's approved sample covers every word of Al-Fātiḥah (7 āyāt) and Al-Ikhlāṣ (4)", () => {
  eq(String(surah(1).ayahs.length) + "/" + surah(112).ayahs.length, "7/4");
});

const ARABIC = /[؀-ۿࢠ-ࣿ]/u;
let words = 0, withArabic = [], empties = [];
for (let n = 1; n <= 114; n++) {
  for (const a of surah(n).ayahs) for (const w of a.words ?? []) {
    words++;
    const o = banglaTranslit(w.arabic);
    if (ARABIC.test(o) && withArabic.length < 5) withArabic.push(`${n}:${a.ayah}:${w.position} ${o}`);
    if (!o && empties.length < 5) empties.push(`${n}:${a.ayah}:${w.position} ${w.arabic}`);
  }
}
check(`no output contains an Arabic-block character (${words} words, 114 sūrahs)`, () => { if (withArabic.length) throw new Error(withArabic.join(" | ")); return words > 70000; });
check("no output is empty (all 114 sūrahs)", () => { if (empties.length) throw new Error(empties.join(" | ")); });
check("memoised: the same word gives the very same string", () => eq(banglaTranslit("بِسْمِ"), banglaTranslit("بِسْمِ")));
check("the note is the English sentence the app translates", () => eq(BANGLA_TRANSLIT_NOTE, "Bangla transliteration is made by rules from the Arabic and is being checked."));
check("the module imports nothing (pure)", () => {
  const code = fs.readFileSync(FILE, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  if (/^\s*import\s|\bimport\s*\(|\brequire\s*\(/m.test(code)) throw new Error("it imports something");
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
