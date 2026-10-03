// The Bangla dictionary data (decision 62): pure checks over
// tools/quran-data-pull/output/lemma-dictionary-bn.json, built by
// tools/dictionary-pull/bangla from the AQS Quraniyo Obhidhan (কুরআনীয়
// অভিধান, Abu Hena / Yahya, 2nd ed. 2015).
//
// Every expected value below is WRITTEN BY HAND from reading the book's own
// entries (the PDF page is named), or names a fault a check found while the
// matcher was being built: a look-alike word that once got another word's
// meaning, or a font-conversion fault. None is read back out of the build
// scripts. Run from the repository root.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
const out = path.join(root, "tools", "quran-data-pull", "output");

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const nfc = (s) => String(s).normalize("NFC");
const dict = readJson(path.join(out, "lemma-dictionary-bn.json"));
const lemmas = readJson(path.join(out, "lemmas-index.json")).values;
const index = new Map(Object.entries(dict.entries).map(([k, v]) => [nfc(k), v]));
const entry = (typed) => index.get(nfc(typed)) ?? null;
const first = (typed) => entry(typed)?.m?.[0] ?? "";
const all = (typed) => (entry(typed)?.m ?? []).join(" ‖ ");
const allGlosses = [...index.values()].flatMap((e) => e.m);

// ---------------------------------------------------------------------------
console.log("\n1. Shape and credit");
check("the file names the book, its editor, its edition and the PDF", () => {
  for (const s of ["Quraniyo Obhidhan", "Abu Hena", "Muhammad Yahya", "2nd edition", "archive.org/download/mujammufahras/qab.pdf"]) {
    assert.ok(dict.source.includes(s), `source is missing "${s}"`);
  }
  assert.match(dict.licence, /decision 62/);
});
check("every key is a lemma of the Qur'an data, and every entry is { m: [...], p: [...], t }", () => {
  const known = new Set(Object.keys(lemmas).map(nfc));
  for (const [k, e] of Object.entries(dict.entries)) {
    assert.ok(known.has(nfc(k)), `${k} is not a lemma`);
    assert.ok(Array.isArray(e.m) && e.m.length > 0 && e.m.every((g) => typeof g === "string" && g.length >= 3), `${k}: bad m`);
    assert.equal(e.p.length, e.m.length, `${k}: one page per meaning`);
    assert.ok(e.p.every((p) => Number.isInteger(p) && p >= 9 && p <= 223), `${k}: a page outside the dictionary's pages 9–223`);
    assert.ok(["lemma", "stem", "form", "same", "dominant"].includes(e.t), `${k}: tier ${e.t}`);
  }
});
check("coverage: at least 2,600 lemmas and half of all word occurrences", () => {
  assert.ok(Object.keys(dict.entries).length >= 2600, `${Object.keys(dict.entries).length} lemmas`);
  assert.ok(dict.counts.occurrenceCoverage >= 0.5, `${dict.counts.occurrenceCoverage}`);
});

// ---------------------------------------------------------------------------
console.log("\n2. Meanings read from the book");
const expect = [
  // [lemma, words the first meaning must hold]
  ["رَبّ", ["প্রতিপালক", "রব", "প্রভু"]],
  ["قَالَ", ["কথা বলা", "বলা"]],
  ["كَانَ", ["হওয়া", "থাকা"]],
  ["أَرْض", ["ভূমি", "মাটি"]],
  ["نَار", ["আগুন"]],
  ["كِتَٰب", ["বই", "পুস্তক", "গ্রন্থ"]],
  ["سَأَلَ", ["জিজ্ঞাসা করা"]],
  ["زَادَ", ["বৃদ্ধি করা"]],
  ["قَيُّوم", ["চিরস্থায়ী"]],
  ["رَّحِيم", ["দয়ালু"]],
  ["عَلِمَ", ["জানা"]],
  ["أَنزَلَ", ["অবতীর্ণ করা"]],
  ["عَبْد", ["বান্দা", "দাস"]],
  ["زَوْج", ["স্বামী", "স্ত্রী", "পত্নী"]],
];
for (const [l, words] of expect) {
  check(`${l}: the first meaning holds ${words.join(", ")}`, () => {
    const g = first(l);
    assert.ok(g, `${l} has no entry`);
    for (const w of words) assert.ok(nfc(g).includes(nfc(w)), `"${g}" lacks "${w}"`);
  });
}
check("every meaning in section 2 sits on a dictionary page, not the front matter", () => {
  for (const [l] of expect) assert.ok(entry(l).p[0] >= 9, `${l} p.${entry(l).p[0]}`);
});

// ---------------------------------------------------------------------------
console.log("\n3. Look-alikes that once took another word's meaning");
check("سَأَلَ does not carry سلَّ \"pull out slowly\" or سلا \"forget\" (hamza is a letter)", () => {
  assert.doesNotMatch(all("سَأَلَ"), /টেনে বের|ভূলে যাওয়া|ভুলে যাওয়া/);
});
check("قَالَ does not carry قيل \"take a midday nap\" (the root in brackets must agree)", () => {
  assert.doesNotMatch(all("قَالَ"), /নিদ্রা|ঘুমানো/);
});
check("زَادَ is \"to increase\" (root زيد), not زود \"to provision\"", () => {
  assert.doesNotMatch(all("زَادَ"), /পাথেয়/);
});
check("وَلَدَ does not carry لَدَّ \"quarrel\" (a verb's present form is not its spelling)", () => {
  assert.doesNotMatch(all("وَلَدَ"), /ঝগড়া/);
});
check("كِتَٰب does not carry \"writer\" (كاتب or كتَّاب; a dagger alif is not dropped on a three-letter word)", () => {
  assert.doesNotMatch(all("كِتَٰب"), /লেখক|যিনি লেখেন/);
});
check("ٱللَّه takes nothing from the phrase الله أكبر, and أَكْبَر nothing either", () => {
  assert.doesNotMatch(all("ٱللَّه"), /বড়ত্ব ঘোষণা/);
  assert.doesNotMatch(all("أَكْبَر"), /বড়ত্ব ঘোষণা/);
});
check("تَبَرَّجْ (Form V, \"display finery\") does not carry a Form I meaning", () => {
  assert.doesNotMatch(all("تَبَرَّجْ"), /খাদ্য খাওয়া/);
});
check("رَجّ keeps the book's own entry and nothing from a form-only look-alike (أرجاء \"sides\")", () => {
  assert.doesNotMatch(all("رَجّ"), /প্রান্ত|কিনারা/);
});
check("مَسَّ carries no page-foot number and no مزّق \"tear to pieces\"", () => {
  assert.doesNotMatch(all("مَسَّ"), /^[০-৯]|ছিন্ন বিচ্ছিন্ন/);
});

// ---------------------------------------------------------------------------
console.log("\n4. The Bangla text itself");
check("the ref and ল্ল are converted right: no আলস্নাহ, উলেস্নখ, ধমর্, পযর্ন্ত, নিদির্ষ্ট anywhere", () => {
  const bad = allGlosses.filter((g) => /আলস্নাহ|উলেস্নখ|ধমর্|পযর্ন্ত|নিদির্ষ্ট|সবর্নাম/.test(g));
  assert.equal(bad.length, 0, bad.slice(0, 3).join(" | "));
});
check("আল্লাহ is spelled right where the book names Allah (রহিম's sibling entries and the Names)", () => {
  assert.ok(allGlosses.filter((g) => g.includes("আল্লাহ")).length >= 20);
});
check("no meaning starts with a digit, a bracket, a quote mark or a grammar word", () => {
  const bad = allGlosses.filter((g) => /^[০-৯\d(),'‘’"]|^(দেখুন|বহুবচন|একবচন|শব্দটি)/.test(g));
  assert.equal(bad.length, 0, bad.slice(0, 3).join(" | "));
});
check("no meaning ends in a grammar note (বহুবচন, স্ত্রীলিঙ্গ, কর্মবাচ্য ...)", () => {
  const bad = allGlosses.filter((g) => /(বহুবচন|একবচন|দ্বিবচন|স্ত্রীলিঙ্গ|কর্মবাচ্য|দেখুন)$/.test(g));
  assert.equal(bad.length, 0, bad.slice(0, 3).join(" | "));
});
check("a meaning may start with বান্দা or স্ত্রী: \"বা\" (or) and the gender note স্ত্রী are skipped only as whole words", () => {
  assert.match(first("عَبْد"), /^বান্দা/);
  assert.match(first("زَوْج"), /স্ত্রী/);
});
check("no vowel sign is doubled (বৃৃদ্ধি for বৃদ্ধি: a Bijoy glyph drawn twice)", () => {
  const bad = allGlosses.filter((g) => /([\u09BE-\u09CC\u09D7])\1/.test(g));
  assert.equal(bad.length, 0, bad.slice(0, 3).join(" | "));
});
check("no meaning holds an HTML entity or a Bijoy byte left unconverted (যতœবান, আহŸান, ভ‚মি)", () => {
  const bad = allGlosses.filter((g) => /&[a-z#0-9]+;|[^\u0980-\u09FF\s\u200c\u200d,.\-/'‘’"?!:;()–—।]/.test(g));
  assert.equal(bad.length, 0, bad.slice(0, 3).join(" | "));
});

// ---------------------------------------------------------------------------
console.log("\n5. Load boundary");
check("the app does not load the Bangla dictionary at startup (no page or module names it yet, or names it only in a first-use loader)", () => {
  const app = path.join(root, "app");
  const hits = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) { if (!["vendor"].includes(f.name)) walk(p); }
    else if (/\.(js|html)$/.test(f.name) && fs.readFileSync(p, "utf8").includes("lemma-dictionary-bn.json")) hits.push(path.relative(root, p));
  } };
  walk(app);
  assert.ok(hits.every((h) => h === "app/js/lemma-dictionary.js"), `named in ${hits.join(", ")}`);
});

console.log(`\nbangla-dictionary-data: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
