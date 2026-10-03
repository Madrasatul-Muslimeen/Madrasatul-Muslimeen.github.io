// The "Needs a source" lines (decision 61): pure checks over the three data
// sets the Architect built from named, licensed sources.
//
//   tools/quran-data-pull/output/word-syntax/   QAC treebank (GPL v3): sentence iʿrāb
//   tools/quran-data-pull/output/furuq-index.json   al-ʿAskarī, al-Furūq (OpenITI, CC BY-NC-SA 4.0)
//   tools/quran-data-pull/output/mufradat/      al-Rāghib, al-Mufradāt (OpenITI, CC BY-NC-SA 4.0)
//
// Every expected value below is WRITTEN BY HAND: from the treebank lines quoted
// in docs/reports/2026-10-03-needs-a-source-candidates.md, from the Corpus's own
// documentation, or from reading the two books' text. None is read back out of
// the build scripts. Run from the repository root.

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
const keyIn = (obj, typed) => Object.keys(obj).find((k) => nfc(k) === nfc(typed));

// ---------------------------------------------------------------------------
console.log("\n1. Sentence grammar: the Quranic Arabic Corpus treebank");
const synDir = path.join(out, "word-syntax");
const synManifest = readJson(path.join(synDir, "manifest.json"));
const syn = (s) => readJson(path.join(synDir, `surah_${String(s).padStart(3, "0")}.json`));
const s1 = syn(1), s2 = syn(2);
const graphsOf = (file, key) => (file.words[key] ?? []).map((g) => file.graphs[g]);
const nodeOf = (g, key, piece) => g.n.findIndex((n) => (n[0] === "w" || n[0] === "r") && n[1] === key && n[2] === piece);
const hasEdge = (g, rel, d, h) => g.e.some(([r, x, y]) => r === rel && x === d && y === h);

check("2:102:1 وَاتَّبَعُوا: three pieces (wa, the verb, the plural ending), and the ending is the verb's subject (subj(n3 - n2))", () => {
  const g = graphsOf(s2, "102:1")[0];
  assert.ok(g, "no graph for 2:102:1");
  const [conj, verb, pron] = [0, 1, 2].map((p) => nodeOf(g, "102:1", p));
  assert.ok(conj >= 0 && verb >= 0 && pron >= 0, "a piece of 2:102:1 is missing");
  assert.deepEqual([g.n[conj][3], g.n[verb][3], g.n[pron][3]], ["CONJ", "V", "PRON"]);
  assert.ok(hasEdge(g, "subj", pron, verb), "subj(ending → verb) missing");
});
check("2:102:2 مَا is the object of اتَّبَعُوا (obj(n4 - n2)), and 2:102:4 the subject of تَتْلُوا (subj(n6 - n5))", () => {
  const g = graphsOf(s2, "102:1")[0];
  assert.ok(hasEdge(g, "obj", nodeOf(g, "102:2", 0), nodeOf(g, "102:1", 1)));
  assert.ok(hasEdge(g, "subj", nodeOf(g, "102:4", 0), nodeOf(g, "102:3", 0)));
});
check("1:1 بِسْمِ: the prepositional phrase hangs on a hidden verb (n1 = V(*), link(n7 - n1))", () => {
  const g = graphsOf(s1, "1:1")[0];
  const hidden = g.n.findIndex((n) => n[0] === "h" && n[1] === "V");
  const pp = g.n.findIndex((n) => n[0] === "p" && n[1] === "PP");
  assert.ok(hidden >= 0 && pp >= 0, "hidden verb or PP missing");
  assert.ok(hasEdge(g, "link", pp, hidden));
});
check("1:3 ٱلرَّحْمَٰنِ is an adjective of ٱللَّهِ (1:2:2), met there as a REFERENCE to the earlier āyah", () => {
  const g = graphsOf(s1, "3:1")[0];
  const ref = g.n.findIndex((n) => n[0] === "r" && n[1] === "2:2");
  assert.ok(ref >= 0, "reference to 1:2:2 missing");
  const allah = g.n.findIndex((n, i) => i > ref - 1 && n[0] === "r" && n[1] === "2:2" && n[3] === "PN");
  assert.ok(hasEdge(g, "adj", nodeOf(g, "3:1", 0), allah));
  assert.ok(s1.words["2:2"].includes(s1.graphs.indexOf(g)), "the referenced word does not list the graph");
});
check("coverage: surahs 1–9 and 59–114 have files; 10–58 have none (the treebank stops there)", () => {
  for (let s = 1; s <= 114; s++) {
    const exists = fs.existsSync(path.join(synDir, `surah_${String(s).padStart(3, "0")}.json`));
    assert.equal(exists, s <= 9 || s >= 59, `surah ${s}`);
  }
});
check("surah 9 is the one partial surah (91 of its 129 āyāt)", () => {
  assert.deepEqual(synManifest.perSurah.filter((p) => !p.complete).map((p) => p.surah), [9]);
  const ayahs = new Set(Object.keys(syn(9).words).map((k) => k.split(":")[0]));
  assert.ok(ayahs.size >= 85 && ayahs.size <= 95, `${ayahs.size} āyāt`);
});
check("the Corpus's own names (corpus.quran.com/documentation/syntaxrelation.jsp): 45 relations, subj فاعل, obj مفعول به, poss مضاف إليه, link متعلق", () => {
  const R = synManifest.relations;
  assert.equal(Object.keys(R).length, 45);
  assert.equal(R.subj[0], "فاعل");
  assert.equal(R.obj[0], "مفعول به");
  assert.equal(R.poss[0], "مضاف إليه");
  assert.equal(R.link[0], "متعلق");
  assert.equal(synManifest.phrases.PP[0], "جار ومجرور");
});
check("every edge in every file names a known relation and points at nodes that exist; every phrase spans real nodes", () => {
  for (const f of fs.readdirSync(synDir).filter((x) => /^surah_\d{3}\.json$/.test(x))) {
    const d = readJson(path.join(synDir, f));
    for (const g of d.graphs) {
      for (const [r, a, b] of g.e) {
        assert.ok(synManifest.relations[r], `${f}: relation ${r}`);
        assert.ok(g.n[a] && g.n[b], `${f}: edge ${r}(${a} - ${b}) out of range`);
      }
      for (const n of g.n) if (n[0] === "p") assert.ok(g.n[n[2]] && g.n[n[3]] && synManifest.phrases[n[1]], `${f}: phrase ${n}`);
    }
    for (const [key, list] of Object.entries(d.words)) {
      for (const gi of list) assert.ok(d.graphs[gi].n.some((n) => (n[0] === "w" || n[0] === "r") && n[1] === key), `${f}: ${key} not in graph ${gi}`);
    }
  }
});
check("licence and load boundary: GPL v3 with a link to corpus.quran.com; on demand only", () => {
  assert.equal(synManifest.source.licence, "GNU General Public License v3");
  assert.match(synManifest.source.url, /^https:\/\/corpus\.quran\.com/);
  assert.equal(synManifest.loadBoundary, "on-demand-only");
});
check("irab.tsv (no named source) is never used", () => {
  const scripts = ["build-word-syntax.mjs", "build-furuq.mjs", "build-mufradat.mjs"].map((f) => fs.readFileSync(path.join(root, "tools", "quran-data-pull", f), "utf8")).join("\n");
  assert.ok(!/irab\.tsv/.test(scripts.replace(/\/\/.*$/gm, "")), "a build script reads irab.tsv");
  assert.ok(!fs.readdirSync(out).some((f) => /irab/i.test(f)));
});

// ---------------------------------------------------------------------------
console.log("\n2. Near-synonyms: al-ʿAskarī, al-Furūq al-Lughawiyya");
const F = readJson(path.join(out, "furuq-index.json"));
const entriesFor = (typed) => (F.lemmas[keyIn(F.lemmas, typed)] ?? []).map((i) => F.entries[i]);
const headsFor = (typed) => entriesFor(typed).map((e) => e.h);

check("عِلْم links «الفرق بين العلم والمعرفة», pp. 80–81 of the Salīm edition, text as the book has it", () => {
  const e = entriesFor("عِلْم").find((x) => x.h === "الفرق بين العلم والمعرفة");
  assert.ok(e, "entry not linked to عِلْم");
  assert.deepEqual(e.p, [80, 81]);
  assert.match(e.t, /^أن المعرفة أخص من العلم/);
});
// Narrowed in place (3 Oct 2026): the first version asserted عَلِمَ gets no
// entry at all, which went red for a CORRECT link: «قولنا يحسن وقولنا يعلم»
// compares the verb يعلم itself. The rule is about terms written with ال.
check("the grammar rule: a term written with ال is a noun, so العلم never links the verb عَلِمَ (only «قولنا يعلم», the verb itself, does)", () => {
  const terms = entriesFor("عَلِمَ").flatMap((e) => e.terms);
  assert.ok(!terms.includes("العلم"), `عَلِمَ linked through: ${terms.join(", ")}`);
  assert.deepEqual(entriesFor("عَلِمَ").map((e) => e.h), ["الفرق بين قولنا يحسن وقولنا يعلم"]);
});
check("the hand review: الذكر is ذِكْر (remembrance), never ذَكَر (male)", () => {
  assert.ok(headsFor("ذِكْر").includes("الفرق بين العلم والذكر"));
  assert.ok(!headsFor("ذَكَر").some((h) => /الذكر/.test(h)));
});
check("the per-entry review: خُبْر (knowing through and through) takes «العلم والخبر»; خَبَر (a report) takes «النبإ والخبر» and not that one", () => {
  assert.ok(headsFor("خُبْر").includes("الفرق بين العلم والخبر"));
  assert.ok(headsFor("خَبَر").includes("الفرق بين النبإ والخبر"));
  assert.ok(!headsFor("خَبَر").includes("الفرق بين العلم والخبر"));
});
check("an entry started as a plain paragraph is its own entry: «الظلم والهضم» stands alone and is not inside «السوء والقبيح»", () => {
  assert.ok(F.entries.some((e) => e.h === "الفرق بين الظلم والهضم"));
  const sw = F.entries.find((e) => e.h === "الفرق بين السوء والقبيح");
  assert.ok(sw && !/الهضم/.test(sw.t));
});
check("a heading the transcription ran into its first sentence is cut back: «الفرق بين الأخذ والتناول»", () => {
  const e = entriesFor("أَخْذ").find((x) => x.h === "الفرق بين الأخذ والتناول");
  assert.ok(e);
  assert.match(e.t, /^يقتضي أخذ شيء/);
});
check("every packaged entry is linked to some Dictionary word, and no term is left ambiguous unreviewed", () => {
  const linked = new Set(Object.values(F.lemmas).flat());
  assert.equal(linked.size, F.entries.length);
  assert.deepEqual(readJson(path.join(root, "tools", "quran-data-pull", "furuq-ambiguous.json")).values, {});
});
check("no OpenITI markers or markup in any entry", () => {
  for (const e of F.entries) assert.ok(!/PageV|\bms\d|<\/?span|«\d+»/.test(e.h + e.t), e.h);
});
check("licence and credit: CC BY-NC-SA 4.0, OpenITI's DOI, the work, author and edition", () => {
  assert.equal(F.source.licence, "CC BY-NC-SA 4.0");
  assert.match(F.source.corpus, /10\.5281\/zenodo\.3082463/);
  assert.match(F.source.edition, /Salīm/);
  assert.equal(F.loadBoundary, "on-demand-only");
});

// ---------------------------------------------------------------------------
console.log("\n3. Classical usage: al-Rāghib, al-Mufradāt");
const mDir = path.join(out, "mufradat");
const M = readJson(path.join(mDir, "manifest.json"));
const book = (n) => readJson(path.join(mDir, `${n}.json`)).entries;
const roots = readJson(path.join(out, "roots-index.json")).values;

check("علم (the ʿayn book, 18): the bare-paragraph entry is found; p. 580 of al-Dāwūdī; «العلم: إدراك الشيء بحقيقته»", () => {
  const e = book(18)["علم"]?.[0];
  assert.ok(e, "علم missing");
  assert.equal(e.p[0], 580);
  assert.match(e.t, /^العلم: إدراك الشيء بحقيقته/);
});
check("أبا (ابو): the page-break fragment is glued back (…عنى الأب), not filed as a root of its own", () => {
  const t = book(1)["ابو"][0].t;
  assert.match(t, /عنى الأب/);
  assert.ok(!/عنى ال أب/.test(t));
  assert.ok(!book(1)["ابب"].some((e) => /ما كان محمد أبا/.test(e.t)), "the أبا text was filed under ابب");
});
check("أبّ (ابب) is its own entry, quoting وَفَاكِهَةً وَأَبًّا (ʿAbasa 80:31)", () => {
  assert.ok(book(1)["ابب"].some((e) => e.q.some(([s, a]) => s === 80 && a === 31)));
});
check("ساح treats two roots and quotes both (al-Ṣāffāt 37:177 سوح; al-Tawba 9:2 سيح): filed under each", () => {
  assert.ok(book(12)["سوح"]?.some((e) => e.h === "ساح"));
  assert.ok(book(12)["سيح"]?.some((e) => e.h === "ساح"));
});
check("بدأ is بدا (to begin) only, never بدو (to appear)", () => {
  assert.ok(book(2)["بدا"]?.some((e) => e.h === "بدأ"));
  assert.ok(!(book(2)["بدو"] ?? []).some((e) => e.h === "بدأ"));
});
check("every entry quotes at least one āyah that contains a word of its root (re-checked against roots-index.json)", () => {
  for (let b = 1; b <= 28; b++) {
    for (const [r, list] of Object.entries(book(b))) {
      const ayahs = new Set((roots[r] ?? []).map((o) => `${Math.floor(o / 1e6)}:${Math.floor(o / 1e3) % 1000}`));
      for (const e of list) assert.ok(e.q.some(([s, a]) => ayahs.has(`${s}:${a}`)), `${r} / ${e.h} p${e.p[0]}`);
      assert.equal(r[0], M.letters[b - 1], `${r} is in letter-book ${b}`);
    }
  }
});
check("no OpenITI markers, footnote callers or markup in any entry", () => {
  for (let b = 1; b <= 28; b++) for (const list of Object.values(book(b))) for (const e of list) assert.ok(!/PageV|\bms\d|<\/?span|«\d+»/.test(e.t), e.h);
});
check("coverage as measured on 3 Oct 2026: 1,476 of the Qur'an's 1,642 roots; every sūra name in a citation is known", () => {
  assert.equal(M.quranRoots, 1642);
  assert.equal(M.rootsCovered, 1476);
  assert.deepEqual(M.unknownSurahNames, {});
});
check("licence and credit: CC BY-NC-SA 4.0, OpenITI's DOI, al-Dāwūdī's edition", () => {
  assert.equal(M.source.licence, "CC BY-NC-SA 4.0");
  assert.match(M.source.corpus, /10\.5281\/zenodo\.3082463/);
  assert.match(M.source.edition, /Dāwūdī/);
  assert.equal(M.loadBoundary, "on-demand-only");
});

console.log(`\nneeds-a-source-data: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
