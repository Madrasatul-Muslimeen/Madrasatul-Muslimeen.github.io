// Word card rebuild, round 4 (#511): the Naḥw lines' grammar, checked against
// real Qur'an words with the Arabic written BY HAND (Architect review of #513).
// Four cases the first build named wrongly, and the plain ones it got right:
//   - a present verb with the feminine-plural nūn is built on sukūn (يَطْهُرْنَ 2:222:14);
//   - one carrying the emphatic nūn is built on fatḥa (وَلَيَكُونًا… 12:32:17, لَيُسْجَنَنَّ 12:32:16);
//   - a passive verb's ending is نَائِب فَاعِل (يُنصَرُونَ 2:48:19);
//   - on كَانَ and its sisters the ending is their اسم (تَكُونُوا 2:41:8);
//   - a plain doer ending is فَاعِل, with ثُبُوتُ النُّون (فَيَتَعَلَّمُونَ 2:102:35).
// Pure: it calls app/js/word-card-depth.js directly. Run from the repository root.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const D = await import(pathToFileURL(path.join(root, "app/js/word-card-depth.js")).href);
const read = (s, kind) => JSON.parse(fs.readFileSync(path.join(root, `tools/quran-data-pull/output/${kind}/surah_${String(s).padStart(3, "0")}.json`), "utf8"));

let passed = 0, failed = 0;
function check(name, fn) {
  try { const r = fn(); if (r && typeof r.then === "function") throw new TypeError("async body"); passed++; console.log(`  PASS  ${name}`); }
  catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
}

function nahw(s, a, p, lang = "en") {
  const surah = read(s, "surahs"), feats = read(s, "word-features").words, segs = read(s, "word-segments").words;
  const ayah = surah.ayahs.find((x) => x.ayah === a);
  const word = ayah.words.find((w) => w.position === p);
  const layers = { root: word.morphology?.root ?? null, lemma: word.morphology?.lemma ?? null, surfaceToken: word.arabic };
  const html = D.depthSectionsHtml({
    word, layers, features: feats[`${a}:${p}`],
    ctx: { lang, formatNumber: String, segments: segs[`${a}:${p}`], ayahFeatures: feats, ayahWords: ayah.words, surahNumber: s, ayahNumber: a },
    open: { nahw: true },
  });
  const i = html.indexOf('data-word-card-section="nahw"');
  return (i >= 0 ? html.slice(i) : html).normalize("NFC");
}
const has = (h, ar) => h.includes(ar.normalize("NFC"));

check("يَطْهُرْنَ (2:222:14): built on sukūn for the feminine-plural nūn, never called مَرْفُوعٌ", () => {
  const h = nahw(2, 222, 14);
  assert.ok(has(h, "فِعْلٌ مُضَارِعٌ مَبْنِيٌّ عَلَى السُّكُونِ لِاتِّصَالِهِ بِنُونِ النِّسْوَة"), "no built-on-sukūn line");
  assert.ok(!has(h, "فِعْلٌ مُضَارِعٌ مَرْفُوعٌ"), "still says مَرْفُوعٌ");
});
check("12:32:17 (with the emphatic nūn): built on fatḥa, never called مَرْفُوعٌ", () => {
  const h = nahw(12, 32, 17);
  assert.ok(has(h, "فِعْلٌ مُضَارِعٌ مَبْنِيٌّ عَلَى الْفَتْحِ لِاتِّصَالِهِ بِنُونِ التَّوْكِيد"));
  assert.ok(!has(h, "فِعْلٌ مُضَارِعٌ مَرْفُوعٌ"));
});
check("يُنصَرُونَ (2:48:19, passive): the ending is نَائِب فَاعِل, not فَاعِل", () => {
  const h = nahw(2, 48, 19);
  assert.ok(has(h, "ضَمِيرٌ مُتَّصِلٌ فِي مَحَلِّ رَفْعِ نَائِبِ فَاعِل"));
  assert.ok(!has(h, "فِي مَحَلِّ رَفْعِ فَاعِل"));
});
check("تَكُونُوا (2:41:8, كَانَ): the ending is its اسم, not فَاعِل; jussive by حَذْفُ النُّون", () => {
  const h = nahw(2, 41, 8);
  assert.ok(has(h, "ضَمِيرٌ مُتَّصِلٌ فِي مَحَلِّ رَفْعِ اسْمِهَا"));
  assert.ok(!has(h, "فِي مَحَلِّ رَفْعِ فَاعِل"));
  assert.ok(has(h, "فِعْلٌ مُضَارِعٌ مَجْزُومٌ وَعَلَامَةُ جَزْمِهِ حَذْفُ النُّون"));
});
check("فَيَتَعَلَّمُونَ (2:102:35): indicative by ثُبُوتُ النُّون, and its ending is فَاعِل", () => {
  const h = nahw(2, 102, 35);
  assert.ok(has(h, "فِعْلٌ مُضَارِعٌ مَرْفُوعٌ وَعَلَامَةُ رَفْعِهِ ثُبُوتُ النُّون"));
  assert.ok(has(h, "ضَمِيرٌ مُتَّصِلٌ فِي مَحَلِّ رَفْعِ فَاعِل"));
});
check("تَكْفُرْ (2:102:34): jussive by السُّكُون", () => {
  assert.ok(has(nahw(2, 102, 34), "فِعْلٌ مُضَارِعٌ مَجْزُومٌ وَعَلَامَةُ جَزْمِهِ السُّكُون"));
});
check("the Bangla labels follow: নায়েবে ফায়েল on 2:48:19", () => {
  assert.ok(nahw(2, 48, 19, "bn").includes("নায়েবে ফায়েল সর্বনাম"));
});
check("isKanaFamily: كَانَ, أَصْبَحَ (IV); not عَلِمَ, and not صَبَحَ as Form I", () => {
  assert.equal(D.isKanaFamily("كون", undefined), true);
  assert.equal(D.isKanaFamily("صبح", 4), true);
  assert.equal(D.isKanaFamily("صبح", 1), false);
  assert.equal(D.isKanaFamily("علم", 1), false);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
