// Word Card -- each derived form carries its MEANING (reader's language)
// between the Arabic and the count. Run from the REPOSITORY ROOT.
//
// Expected index values are hand-counted from the surah files (counting shown
// in the PR) and typed in as literals; a second, deliberately simple raw tally
// below re-derives them WITHOUT the build script's tidy function.
import assert from "node:assert/strict";
import fs from "node:fs";
import { quranWordOccurrenceId } from "../../app/js/quran-word-identity.js";
import { createWordCardState, openWordCard, renderQuranWordCard, selectWordCardLevel } from "../../app/js/quran-word-card.js";
import { rootFormsFor, clearWordIdentityIndexCache } from "../../app/js/quran-word-index.js";

const OUT = "tools/quran-data-pull/output/";
const index = JSON.parse(fs.readFileSync(`${OUT}lemma-meaning-index.json`, "utf8"));
const byBase = (base) => Object.keys(index.values).find((k) => k.replace(/[^ء-ي]/g, "") === base);
let passed = 0;
function check(name, fn) {
  const r = fn();
  if (r && typeof r.then === "function") throw new TypeError("check() is synchronous.");
  passed++; console.log(`  PASS  ${name}`);
}
async function acheck(name, fn) { await fn(); passed++; console.log(`  PASS  ${name}`); }

// (a) the index -- hand-counted literals.
const shakara = byBase("شكر");
check("index header carries the rule and the identity contract", () => {
  assert.equal(index.identityContract, "quran-word-occurrence:v1");
  assert.match(index.rule, /most frequent/); assert.match(index.rule, /shortest, then alphabetical/);
  assert.equal(index.entryCount, Object.keys(index.values).length);
});
check("شَكَرَ en = 'be grateful' (hand count: 7 '(be) grateful' + 5 'be grateful' + 4 'and be grateful' + 1 'And be grateful' = 17; next best 'grateful' 4)", () => {
  assert.ok(Object.keys(index.values).includes("شَكَرَ"));
  assert.equal(index.values["شَكَرَ"].en, "be grateful");
});
check("مَّشْكُور en = 'appreciated' (tie 1-1 with '(is) appreciated' -> shortest)", () => {
  assert.equal(index.values[byBase("مشكور")].en, "appreciated");
});
check("شَكَرَ bn = 'কৃতজ্ঞতা প্রকাশ করো' (hand count: 6 plain + 1 'এবং …' + 1 '\"…' = 8; next 'কৃতজ্ঞতা প্রকাশ করে' 4)", () => {
  assert.equal(index.values["شَكَرَ"].bn, "কৃতজ্ঞতা প্রকাশ করো");
});
check("independent raw tally agrees for شَكَرَ (no tidy function shared with the build)", () => {
  const raw = { en: {}, bn: {} };
  for (const f of fs.readdirSync(`${OUT}surahs`)) {
    const c = JSON.parse(fs.readFileSync(`${OUT}surahs/${f}`, "utf8"));
    for (const a of c.ayahs) for (const w of a.words) if (w.morphology?.lemma === "شَكَرَ") {
      for (const l of ["en", "bn"]) raw[l][w.translation[l]] = (raw[l][w.translation[l]] || 0) + 1;
    }
  }
  const sum = (l, keys) => keys.reduce((n, k) => n + (raw[l][k] || 0), 0);
  assert.equal(sum("en", ["(be) grateful", "be grateful", "and be grateful", "And be grateful"]), 17);
  assert.equal(sum("bn", ["কৃতজ্ঞতা প্রকাশ করো", "এবং কৃতজ্ঞতা প্রকাশ করো", "\"কৃতজ্ঞতা প্রকাশ করো"]), 8);
});
check("no stored meaning starts with a conjunction, holds a bracket or a quote", () => {
  for (const [lemma, m] of Object.entries(index.values)) {
    if (m.en) { assert.doesNotMatch(m.en, /^(and|so|then)\s/i, lemma); assert.doesNotMatch(m.en, /[()"“”]/, lemma); }
    if (m.bn) { assert.doesNotMatch(m.bn, /^(এবং|আর|অতঃপর)\s/, lemma); assert.doesNotMatch(m.bn, /[()"“”]/, lemma); }
  }
});

// Wiring: rootFormsFor() carries the meaning; a failed load leaves it empty.
const fetchLocal = async (url) => {
  const file = url.replace(/^.*output\//, OUT);
  return fs.existsSync(file) ? { ok: true, json: async () => JSON.parse(fs.readFileSync(file, "utf8")) } : { ok: false, status: 404 };
};
await acheck("rootFormsFor() attaches { en, bn } to each form", async () => {
  clearWordIdentityIndexCache();
  const r = await rootFormsFor("شكر", { fetchImpl: fetchLocal, baseUrl: OUT });
  const f = r.forms.find((x) => x.lemma === "شَكَرَ");
  assert.equal(f.meaning.en, "be grateful"); assert.equal(f.meaning.bn, "কৃতজ্ঞতা প্রকাশ করো");
});
await acheck("a failed meaning-index load leaves meanings empty and still lists the forms", async () => {
  clearWordIdentityIndexCache();
  const f2 = async (url) => /lemma-meaning/.test(url) ? { ok: false, status: 500 } : fetchLocal(url);
  const r = await rootFormsFor("شكر", { fetchImpl: f2, baseUrl: OUT });
  assert.ok(r.forms.length > 3);
  assert.ok(r.forms.every((x) => x.meaning.en === "" && x.meaning.bn === ""));
});

// Rendering.
const chapter = { surahNumber: 1 }, ayah = { ayah: 1 };
const word = { position: 1, arabic: "بِسْمِ", translation: { en: "x", bn: "y" }, morphology: { root: "سمو", lemma: "ٱسْم", pos: "Noun" } };
const id = quranWordOccurrenceId(1, 1, 1);
const forms = (meaning) => ({ rootForms: { root: "سمو", totalOccurrences: 5, formCount: 1, unclassified: 0, forms: [
  { lemma: "شَكَرَ", count: 5, refs: [], pos: "Verb", posCounts: [["Verb", 5]], posAmbiguous: false, meaning },
] } });
const render = (level, ctx, lang) => renderQuranWordCard({ state: selectWordCardLevel(openWordCard(createWordCardState(), id), level), chapter, ayah, word, context: ctx, labels: lang ? { formMeaningLang: lang } : {} });
const M = { en: "be grateful", bn: "কৃতজ্ঞতা প্রকাশ করো" };

for (const level of ["basic", "depth"]) {
  check(`${level}: order is category -> Arabic -> meaning -> count`, () => {
    const h = render(level, forms(M), "en");
    const at = ["word-card-form-pos\"", "word-card-form-arabic", "word-card-form-meaning", "word-card-form-count"].map((s) => h.indexOf(s));
    assert.ok(at.every((i) => i > -1), JSON.stringify(at));
    assert.deepEqual([...at].sort((a, b) => a - b), at);
  });
  check(`${level}: English reader sees the English meaning, tagged lang=en`, () => {
    const h = render(level, forms(M), "en");
    assert.match(h, /<span class="word-card-form-meaning" lang="en">be grateful<\/span>/);
    assert.doesNotMatch(h, /কৃতজ্ঞতা প্রকাশ করো/);
  });
  check(`${level}: Bangla reader sees the Bangla meaning, tagged lang=bn`, () => {
    const h = render(level, forms(M), "bn");
    assert.match(h, /<span class="word-card-form-meaning" lang="bn">কৃতজ্ঞতা প্রকাশ করো<\/span>/);
    assert.doesNotMatch(h, />be grateful</);
  });
  check(`${level}: fallback to the other language, correctly tagged`, () => {
    assert.match(render(level, forms({ en: "be grateful", bn: "" }), "bn"), /lang="en">be grateful</);
    assert.match(render(level, forms({ en: "", bn: "কৃতজ্ঞ" }), "en"), /lang="bn">কৃতজ্ঞ</);
  });
  check(`${level}: no meaning at all prints no meaning span, and the row still renders`, () => {
    for (const m of [{ en: "", bn: "" }, undefined]) {
      const h = render(level, forms(m), "en");
      assert.doesNotMatch(h, /word-card-form-meaning/);
      assert.match(h, /word-card-form-count/);
    }
  });
}
check("default language (none supplied) is English", () => {
  assert.match(render("basic", forms(M)), /lang="en">be grateful</);
});
check("the page hands the card the reader's app language", () => {
  const html = fs.readFileSync("app/quranrevival.html", "utf8");
  assert.match(html, /formMeaningLang:\s*getAppLang\(\)\s*===\s*"bn"\s*\?\s*"bn"\s*:\s*"en"/);
});
check("the meaning index is never loaded at startup (I9): only quran-word-index.js names it", () => {
  const hits = [];
  for (const dir of ["app", "app/js"]) for (const f of fs.readdirSync(dir)) {
    if (/\.(js|html)$/.test(f) && fs.readFileSync(`${dir}/${f}`, "utf8").includes("lemma-meaning-index")) hits.push(f);
  }
  assert.deepEqual(hits, ["quran-word-index.js"]);
});

console.log(`\n==== word-card form meaning: ${passed} passed, 0 failed ====`);
