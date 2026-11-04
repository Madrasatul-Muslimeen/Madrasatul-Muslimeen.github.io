// J03 K3 "Read next" -- the pure half (app/js/read-next.js) and its data file (app/data/tafsir-scholars.json).
// Run from the repository root:  node tools/i18n-verify/read-next.mjs
//   - the data file EQUALS what tools/scholars/build-tafsir-scholars.mjs makes from the Scholars Database v1.5, and a
//     one-value change to it is caught (mutation, in memory);
//   - every value it keeps is the database's own (names, life dates, Approaches, tafsīr text), and nothing is marked checked;
//   - the compiler matches (Bukhārī's Ṣaḥīḥ -> s008 ...), and a wrong death year matches nothing;
//   - the pure functions: tabs, āyah refs and links (with back=1), other hadith (self left out, labelled first, capped),
//     HadeethEnc word meanings in every shape, dictionary entries (NFC, both dictionaries, misses counted),
//     grouping by Approach (each scholar once, by Approach number);
//   - wiring: read-next.js has no DOM and no fetch; hadith-browser.js places the box with ONE call; nothing is fetched
//     when the box is drawn (the UI fetches only inside a tab's panel).
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildTafsirScholars, serialise, matchBooks, deathYearAH, OUTPUT, SOURCE } from "../scholars/build-tafsir-scholars.mjs";
import * as RN from "../../app/js/read-next.js";

let pass = 0, fail = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new Error("async body: a promise counts as a pass");
    pass++; console.log("PASS", name);
  } catch (e) { fail++; console.log("FAIL", name, "-", e.message); }
}

// ---- the data file -----------------------------------------------------------------------------------------------
const made = serialise(buildTafsirScholars());
const file = fs.readFileSync(OUTPUT, "utf8");
const data = JSON.parse(file);
const db = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
const byId = new Map(db.rows.map((r) => [r.id, r]));

check("app/data/tafsir-scholars.json equals what the script makes from v1.5 (byte for byte)", () => assert.equal(file, made));
check("mutation: one changed value in the file is caught by the same comparison", () => {
  const bad = file.replace('"lifeAH": "224 AH – 310 AH"', '"lifeAH": "224 AH – 311 AH"');
  assert.notEqual(bad, file, "the mutation did not apply (positive control)");
  assert.notEqual(bad, made);
});
check("it names its source, v1.5, and is marked NOT checked", () => {
  assert.equal(data.source, SOURCE); assert.equal(data.sourceVersion, "v1.5"); assert.equal(data.checked, false);
});
check("a plausible number of scholars: 40+ tafsīr scholars, 5+ compilers (positive control for the filters)", () => {
  const tf = data.scholars.filter((s) => s.roles.includes("tafsir")).length;
  const co = data.scholars.filter((s) => s.roles.includes("compiler")).length;
  assert.ok(tf >= 40 && co >= 5, `${tf} tafsīr, ${co} compilers`);
});
check("every tafsīr scholar is a database 'mufassir' row, and every mufassir row is here", () => {
  const mf = db.rows.filter((r) => r.type === "mufassir").map((r) => r.id).sort();
  assert.deepEqual(data.scholars.filter((s) => s.roles.includes("tafsir")).map((s) => s.id).sort(), mf);
});
check("every kept value is the database's own: en, ar, lifeAH, lifeCE, Approaches text", () => {
  for (const s of data.scholars) {
    const r = byId.get(s.id);
    assert.ok(r, s.id);
    assert.equal(s.en, r.en, s.id); assert.equal(s.ar, r.ar ?? null, s.id);
    assert.equal(s.lifeAH, r.lifeAH ?? null, s.id); assert.equal(s.lifeCE, r.lifeCE ?? null, s.id);
    assert.equal(s.approachesText, r.approaches ?? "", s.id);
    assert.equal(s.approaches.join(" · "), r.approaches, s.id);
    assert.ok(String(r.quranWorks).startsWith(s.quranWork), s.id);
  }
});
check("each tafsīr title is a piece of the database's quranWorks text (al-Wāḥidī: three titles)", () => {
  for (const s of data.scholars) for (const title of s.tafsir) assert.ok(byId.get(s.id).quranWorks.includes(title), `${s.id} ${title}`);
  assert.deepEqual(data.scholars.find((s) => s.id === "s030").tafsir, ["al-Wasīṭ", "al-Wajīz", "Asbāb al-Nuzūl"]);
});
check("Bangla names: only the seven from the approved demo, each saying so; the rest null", () => {
  const bn = data.scholars.filter((s) => s.bn);
  assert.equal(bn.length, 7);
  assert.ok(bn.every((s) => s.bnFrom === "keys demo v2" && /[ঀ-৿]/.test(s.bn)));
  assert.ok(data.scholars.filter((s) => !s.bn).every((s) => s.bn === null && !("bnFrom" in s)));
});
check("compilers: Ṣaḥīḥ al-Bukhārī -> s008, Ṣaḥīḥ Muslim -> s009, Musnad Aḥmad -> s007, al-Tirmidhī -> s012", () => {
  assert.equal(data.books["0256Bukhari.Sahih.JK000110-ara1"], "s008");
  assert.equal(data.books["0261Muslim.Sahih.Shamela0001727-ara1"], "s009");
  assert.equal(data.books["0241IbnHanbal.Musnad.Shamela0025794-ara1"], "s007");
  assert.equal(data.books["0279Tirmidhi.Sunan.JK000140-ara1"], "s012");
});
check("a book whose author is not in the database matches nothing (al-Nawawī, al-Dārimī)", () => {
  assert.equal(data.books["0676Nawawi.RiyadSalihin.Shamela0012014-ara1"], undefined);
  assert.equal(data.books["0255CabdAllahDarimi.Sunan.JK000842-ara1"], undefined);
});
check("mutation: a wrong death year in a book id matches nobody", () => {
  assert.deepEqual(matchBooks(db.rows, ["0257Bukhari.Sahih.JK000110-ara1"]), {});
  assert.deepEqual(matchBooks(db.rows, ["0256Bukhari.Sahih.JK000110-ara1"]), { "0256Bukhari.Sahih.JK000110-ara1": "s008" });
});
check("deathYearAH reads the last AH year ('194 AH – 256 AH' -> 256, 'd. 671 AH' -> 671)", () => {
  assert.equal(deathYearAH({ lifeAH: "194 AH – 256 AH" }), 256);
  assert.equal(deathYearAH({ lifeAH: "d. 671 AH" }), 671);
  assert.equal(deathYearAH({}), null);
});

// ---- pure functions ----------------------------------------------------------------------------------------------
check("tabsFor: the fixed order; a missing entry draws no tab; Dictionary from lemmas OR words", () => {
  assert.deepEqual(RN.tabsFor({ tafsir: true, quran: [], lemmas: [], hadith: [], scholars: "tafsir" }), ["quran", "hadith", "dictionary", "scholars", "tafsir"]);
  assert.deepEqual(RN.tabsFor({ words: [] }), ["dictionary"]);
  assert.deepEqual(RN.tabsFor({ quran: null, hadith: undefined, scholars: false }), []);
});
check("parseAyahRef / uniqueAyahRefs: '36:38', [36,38] and {surah, ayah}; each once; bad refs dropped", () => {
  assert.deepEqual(RN.uniqueAyahRefs(["36:38", [36, 38], { surah: 36, ayah: 40 }, "115:1", "x", [2, 0]]), [[36, 38], [36, 40]]);
});
check("ayahHref keeps the way back (back=1, backTo)", () => {
  assert.equal(RN.ayahHref([36, 38], "hadith"), "./quranrevival.html?goto=36:38&back=1&backTo=hadith");
  assert.equal(RN.ayahHref([2, 255]), "./quranrevival.html?goto=2:255&back=1");
});
check("hadithHref opens the narration in the Hadith library with back=1", () => {
  assert.equal(RN.hadithHref({ book: "0261Muslim.Sahih.Shamela0001727-ara1", n: 611 }), "./hadith-collections.html?openiti=0261Muslim.Sahih.Shamela0001727-ara1&passage=611&back=1");
});
check("otherHadith: the card's own narration left out, each once, book-labelled first, capped with the count left", () => {
  const A = { book: "b", n: 1, test: "words" }, B = { book: "b", n: 2, test: "label" }, C = { book: "c", n: 1, test: "words" };
  const r = RN.otherHadith([[A, B], [B, C, { book: "self", n: 9 }]], { book: "self", n: 9 }, 2);
  assert.deepEqual(r.shown, [B, A]); assert.equal(r.more, 1);
});
check("wordMeanings: HadeethEnc's [{word, meaning}] (trimmed), plain strings, and an object map", () => {
  assert.deepEqual(RN.wordMeanings([{ word: "يوشك", meaning: " يقرب." }]), [{ word: "يوشك", meaning: "يقرب." }]);
  assert.deepEqual(RN.wordMeanings(["a — b"]), [{ word: "", meaning: "a — b" }]);
  assert.deepEqual(RN.wordMeanings({ x: "y" }), [{ word: "x", meaning: "y" }]);
  assert.deepEqual(RN.wordMeanings(null), []);
});
check("dictionaryEntries: each lemma once (NFC), English and Bangla, misses counted, never invented", () => {
  const en = { entries: { "شَمْس": { m: "sun", c: "high", u: "u1" } } };
  const bn = { entries: { "شَمْس": { m: ["সূর্য", "রবি"] }, "جَرَيْ": { m: ["চলা"] } } };
  const r = RN.dictionaryEntries(["شَمْس", "شَمْس", "جَرَيْ", "لا-شيء", null], en, bn);
  assert.deepEqual(r.entries, [{ lemma: "شَمْس", en: "sun", enUrl: "u1", bn: "সূর্য; রবি" }, { lemma: "جَرَيْ", en: null, enUrl: null, bn: "চলা" }]);
  assert.equal(r.missing, 1);
  assert.equal(RN.entryMeaning(r.entries[1], "en"), "চলা"); // English reader, no English entry: the Bangla one, not nothing
});
check("dictionaryEntries reads the REAL dictionaries: شَمْس is 'sun' / সূর্য", () => {
  const en = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/lemma-dictionary-en.json", "utf8"));
  const bn = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/lemma-dictionary-bn.json", "utf8"));
  const r = RN.dictionaryEntries(["شَمْس"], en, bn);
  assert.equal(r.entries[0].en, "sun"); assert.match(r.entries[0].bn, /সূর্য/);
});
check("groupByApproach: each tafsīr scholar exactly once, under their first Approach, groups by Approach number", () => {
  const list = RN.tafsirScholars(data);
  const groups = RN.groupByApproach(list);
  const ids = groups.flatMap((g) => g.scholars.map((s) => s.id));
  assert.equal(ids.length, list.length); assert.equal(new Set(ids).size, list.length);
  for (const g of groups) for (const s of g.scholars) assert.equal(s.approaches[0] ?? "", g.approach);
  const nums = groups.map((g) => RN.approachNumber(g.approach));
  assert.deepEqual(nums, [...nums].sort((a, b) => a - b));
  assert.equal(groups.find((g) => g.approach === "30 Gen1").scholars[0].id, "s021"); // al-Ṭabarī, in the database's order
});
check("compilerOf / scholarName / lifeLine: Bukhārī's book -> s008 with its Bangla name in Bangla, English otherwise", () => {
  const c = RN.compilerOf(data, "0256Bukhari.Sahih.JK000110-ara1");
  assert.equal(c.id, "s008");
  assert.equal(RN.scholarName(c, "bn"), "ইমাম মুহাম্মাদ আল-বুখারী"); assert.equal(RN.scholarName(c, "en"), "Imām Muḥammad al-Bukhārī");
  assert.equal(RN.lifeLine(c), "194 AH – 256 AH · 810 CE – 870 CE");
  assert.equal(RN.compilerOf(data, "nope"), null);
  const noBn = data.scholars.find((s) => !s.bn); assert.equal(RN.scholarName(noBn, "bn"), noBn.en);
});
check("whereToRead: one row per tafsīr title, every tafsīr scholar present", () => {
  const rows = RN.whereToRead(data);
  assert.equal(rows.length, RN.tafsirScholars(data).reduce((n, s) => n + s.tafsir.length, 0));
  assert.ok(rows.some((r) => r.title === "Tafsīr al-Qurʾān al-ʿAẓīm" && r.scholar.id === "s048"));
});
check("hadithExplanation: explanation and benefits kept; a record with neither gives null", () => {
  assert.deepEqual(RN.hadithExplanation({ explanation: " x ", hints: ["a", " "] }), { explanation: "x", hints: ["a"] });
  assert.equal(RN.hadithExplanation({ title: "t" }), null);
  assert.equal(RN.hadithExplanation(null), null);
});

// ---- wiring ------------------------------------------------------------------------------------------------------
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const pure = strip(fs.readFileSync("app/js/read-next.js", "utf8"));
check("read-next.js is pure: no document, window, fetch; it imports only lemma-dictionary.js", () => {
  assert.doesNotMatch(pure, /\b(document|window|fetch|localStorage)\b/);
  assert.deepEqual([...pure.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]), ["./lemma-dictionary.js"]);
});
const ui = strip(fs.readFileSync("app/js/read-next-ui.js", "utf8"));
check("read-next-ui.js fetches only inside loadTafsirScholars (first use), never at import or on drawing the box", () => {
  assert.equal((ui.match(/\bfetch\(/g) ?? []).length, 1);
  const render = ui.slice(ui.indexOf("export function renderReadNext"), ui.indexOf("function fillPanel"));
  assert.ok(render.length > 200, "renderReadNext found (positive control)");
  assert.doesNotMatch(render, /\b(fetch|loadTafsirScholars|getSurah|describeHit|loadLemmaDictionary|resolve)\(/);
});
const hb = fs.readFileSync("app/js/hadith-browser.js", "utf8");
check("hadith-browser.js places the box with ONE call, inside the passage card", () => {
  assert.equal((hb.match(/renderReadNext\(/g) ?? []).length, 1);
  const card = hb.slice(hb.indexOf("function openitiPassageCard"), hb.indexOf("return card;", hb.indexOf("function openitiPassageCard")));
  assert.match(card, /renderReadNext\(card, hadithReadNextCtx\(versionUri, h\.n, heIds \?\? null\)\)/);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
