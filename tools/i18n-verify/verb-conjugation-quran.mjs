// Word card rebuild, round 5 (decision 59; spec §2): "every generated form that
// occurs in the Qur'an must equal the Corpus spelling, as a mechanical check
// over the whole Qur'an".
//
// For every active verb in the Qur'an whose root the engine supports
// (app/js/verb-conjugation.js), the engine's form for that tense, person and
// mood is compared with the Corpus's own spelling
// (tools/quran-data-pull/output/verb-occurrences-corpus.json, test data only).
// A match may go through:
//   - normaliseForCompare(): fixed Uthmani spelling and word-joining facts,
//     applied to both sides (see its own comment);
//   - one of the NAMED Qur'anic variants below, each a rule of Arabic grammar
//     that the Qur'an uses and the standard table does not show;
//   - the EXCEPTIONS list: single places where the Corpus tags a word in a way
//     the spelling contradicts, each with its reason. The list is pinned: an
//     entry that stops failing, or a new failure, fails this suite.
// Expected tables for the fixture verbs are hand-written. Run from the
// repository root.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || process.cwd());
const E = await import(pathToFileURL(path.join(root, "app", "js", "verb-conjugation.js")).href);
const out = path.join(root, "tools", "quran-data-pull", "output");
const VF = JSON.parse(fs.readFileSync(path.join(out, "verb-forms.json"), "utf8")).values;
const OCC = JSON.parse(fs.readFileSync(path.join(out, "verb-occurrences-corpus.json"), "utf8")).rows;

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

// --------------------------------------------------------------------------
// The Qur'an's own variants of Forms V and VI, and of a merged tā.
// --------------------------------------------------------------------------
const MERGING_FIRST_LETTERS = new Set(["t", "v", "d", "*", "z", "s", "$", "S", "D", "T", "Z"]);

export function quranVariants(verb, tense, generated, { afterQuestion = false } = {}) {
  const v = [];
  const [r1] = [...verb.root];
  if ([5, 6].includes(verb.form)) {
    // حذف إحدى التاءين: تَتَذَكَّرُونَ → تَذَكَّرُونَ
    if (tense === "IMPF" && /^tata/.test(generated)) v.push(["one-ta-dropped", generated.replace(/^tata/, "ta")]);
    // إدغام التاء في فاء الفعل: يَتَذَكَّرُ → يَذَّكَّرُ, تَطَهَّرُوا → اطَّهَّرُوا
    if (MERGING_FIRST_LETTERS.has(r1)) {
      if (tense === "IMPF") v.push(["ta-merged", generated.replace(new RegExp(`^(.[au])ta${r1.replace(/[$*]/g, "\\$&")}`), `$1${r1}~`)]);
      if (tense === "IMPV" || tense === "PERF") v.push(["ta-merged", generated.replace(new RegExp(`^ta${r1.replace(/[$*]/g, "\\$&")}`), `{${r1}~`)]);
    }
  }
  // After a question (or equalising) hamza the joining alif is not written:
  // أَطَّلَعَ, أَسْتَكْبَرْتَ, سَوَاءٌ عَلَيْهِمْ أَسْتَغْفَرْتَ.
  if (afterQuestion && generated.startsWith("{")) v.push(["joining-alif-after-question", generated.slice(1)]);
  // A d, ṭ or ẓ before the tā of a past ending is written merged in the
  // Uthmani script: عَاهَدتُّمْ, بَسَطتَّ.
  if (tense === "PERF") v.push(["merged-before-ta", generated.replace(/([dTZ])ot/, "$1t~")]);
  return v;
}

// Places where the Corpus's tag and its own spelling disagree. Each one was
// read by hand (3 Oct 2026); the reason is the evidence.
const EXCEPTIONS = {
  "2:175:9": "مَا أَصْبَرَهُمْ is the exclamatory أَفْعَلَ; the Corpus files it under Form I صَبَرَ",
  "9:49:7": "وَلَا تَفْتِنِّي: the last root letter نْ merges into the نِّي that follows",
  "18:95:3": "مَكَّنِّي: the last root letter نْ merges into the نِّي that follows",
  "11:37:6": "وَلَا تُخَاطِبْنِي is a prohibition (present jussive after لَا); the Corpus tags it a command",
  "28:48:22": "تَظَاهَرَا is Form VI; the Corpus files it under Form IV أَظْهَرَ",
  "33:14:11": "تَلَبَّثُوا is Form V; the Corpus files it under Form I لَبِثَ",
  "36:49:8": "يَخِصِّمُونَ (Ḥafṣ) is يَخْتَصِمُونَ with its tā merged into the ṣād",
  "37:47:7": "يُنزَفُونَ is passive; the Corpus does not mark it PASS",
  "39:45:5": "ٱشْمَأَزَّتْ is a four-letter verb with a hamza in its pattern; the Corpus files it as Form VIII of ش م ز",
  "7:190:4": "جَعَلَا is dual; the Corpus tags it 3MS",
  "4:43:33": "لَٰمَسْتُمُ is Form III (لَامَسَ); the Corpus files it under Form I لَمَسَ",
  "5:6:35": "لَٰمَسْتُمُ is Form III (لَامَسَ); the Corpus files it under Form I لَمَسَ",
};

const results = { supported: 0, exact: 0, variant: {}, exception: [], failures: [] };
for (const [key, lemma, tense, pgn, mood, bw, afterQuestion] of OCC) {
  const v = VF[lemma];
  if (!v || E.unsupportedReason(v.r)) continue;
  const verb = { root: v.r, form: v.f, pastVowel: v.pv ?? null, presentVowel: v.sv ?? null };
  const g = E.conjugateOne(verb, tense, pgn, mood || "IND");
  if (!g) continue;
  results.supported++;
  const joins = /o$/.test(g.bw);
  const n = (s) => E.normaliseForCompare(s, { finalSukunMayJoin: joins });
  if (n(g.bw) === n(bw)) { results.exact++; continue; }
  const hit = quranVariants(verb, tense, g.bw, { afterQuestion: !!afterQuestion }).find(([, alt]) => n(alt) === n(bw));
  if (hit) { results.variant[hit[0]] = (results.variant[hit[0]] || 0) + 1; continue; }
  if (EXCEPTIONS[key]) { results.exception.push(key); continue; }
  results.failures.push(`${key} ${lemma} ${tense} ${pgn} ${mood || ""}: Qur'an ${bw}, engine ${g.bw}`);
}

console.log("\n1. The whole Qur'an");
console.log(`        ${results.supported} active verbs the engine supports; ${results.exact} exact, variants ${JSON.stringify(results.variant)}, ${results.exception.length} listed exceptions`);
check("every supported verb in the Qur'an equals the Corpus spelling (exactly, or by a named rule)", () => {
  assert.deepEqual(results.failures.slice(0, 15), [], `${results.failures.length} failures`);
});
check("the check really covers the Qur'an: over 7,000 verbs compared", () => {
  assert.ok(results.supported > 7000, String(results.supported));
});
check("the exception list is exact: every entry is still needed, none is unused", () => {
  assert.deepEqual([...results.exception].sort(), Object.keys(EXCEPTIONS).sort());
});
check("the exceptions stay a handful (under 0.25% of the verbs compared)", () => {
  assert.ok(Object.keys(EXCEPTIONS).length * 400 < results.supported);
});

console.log("\n2. Hand-written tables");
const ar = (rows) => rows.map((r) => (r ? r.ar.normalize("NFC") : null));
const nfc = (a) => a.map((x) => (x ? x.normalize("NFC") : null));

check("Form V of ع ل م, present: the demo's 14 forms", () => {
  const t = E.conjugate({ root: "Elm", form: 5 });
  assert.equal(t.supported, true);
  assert.deepEqual(ar(t.present), nfc([
    "يَتَعَلَّمُ", "يَتَعَلَّمَانِ", "يَتَعَلَّمُونَ", "تَتَعَلَّمُ", "تَتَعَلَّمَانِ", "يَتَعَلَّمْنَ",
    "تَتَعَلَّمُ", "تَتَعَلَّمَانِ", "تَتَعَلَّمُونَ", "تَتَعَلَّمِينَ", "تَتَعَلَّمَانِ", "تَتَعَلَّمْنَ",
    "أَتَعَلَّمُ", "نَتَعَلَّمُ"]));
});
check("Form V of ع ل م, past and command, as the demo", () => {
  const t = E.conjugate({ root: "Elm", form: 5 });
  assert.deepEqual(ar(t.past), nfc([
    "تَعَلَّمَ", "تَعَلَّمَا", "تَعَلَّمُوا", "تَعَلَّمَتْ", "تَعَلَّمَتَا", "تَعَلَّمْنَ",
    "تَعَلَّمْتَ", "تَعَلَّمْتُمَا", "تَعَلَّمْتُمْ", "تَعَلَّمْتِ", "تَعَلَّمْتُمَا", "تَعَلَّمْتُنَّ",
    "تَعَلَّمْتُ", "تَعَلَّمْنَا"]));
  assert.deepEqual(ar(t.command), nfc([null, null, null, null, null, null,
    "تَعَلَّمْ", "تَعَلَّمَا", "تَعَلَّمُوا", "تَعَلَّمِي", "تَعَلَّمَا", "تَعَلَّمْنَ", null, null]));
});
check("Form I needs its vowels: عَلِمَ يَعْلَمُ (from the data), and none is guessed without them", () => {
  const v = Object.entries(VF).find(([k]) => k.normalize("NFC") === "عَلِمَ".normalize("NFC"))[1];
  assert.equal(v.pv, "i"); assert.equal(v.sv, "a");
  const t = E.conjugate({ root: "Elm", form: 1, pastVowel: "i", presentVowel: "a" });
  assert.equal(t.past[0].ar.normalize("NFC"), "عَلِمَ".normalize("NFC"));
  assert.equal(t.present[2].ar.normalize("NFC"), "يَعْلَمُونَ".normalize("NFC"));
  assert.equal(t.command[6].ar.normalize("NFC"), "ٱعْلَمْ".normalize("NFC"));
  const blind = E.conjugate({ root: "Elm", form: 1 });
  assert.ok(blind.past.every((x) => x === null) && blind.present.every((x) => x === null));
});
check("a doubled letter merges: لَعَنَّا, not لَعَنْنَا", () => {
  assert.equal(E.conjugateOne({ root: "lEn", form: 1, pastVowel: "a" }, "PERF", "1P").bw, "laEan~aA");
});
check("Form VIII assimilates: اصْطَبَرَ, اتَّبَعَ, ازْدَجَرَ", () => {
  assert.equal(E.conjugateOne({ root: "Sbr", form: 8 }, "PERF", "3MS").bw, "{SoTabara");
  assert.equal(E.conjugateOne({ root: "tbE", form: 8 }, "PERF", "3MS").bw, "{t~abaEa");
  assert.equal(E.conjugateOne({ root: "zjr", form: 8 }, "PERF", "3MS").bw, "{zodajara");
});
check("a weak, hamzated or doubled root is not conjugated, and says why", () => {
  assert.deepEqual(E.conjugate({ root: "qwl", form: 1 }), { supported: false, reason: "weak-or-hamzated" });
  assert.equal(E.conjugate({ root: "Amn", form: 4 }).reason, "weak-or-hamzated");
  assert.equal(E.conjugate({ root: "mdd", form: 1 }).reason, "doubled");
});
check("the Qur'an counts are kept per form: يَتَعَلَّمُونَ (present, they) twice", () => {
  const v = Object.entries(VF).find(([k]) => k.normalize("NFC") === "يَتَعَلَّمُ".normalize("NFC"))[1];
  assert.equal(v.n["IMPF.3MP.IND"], 2);
});
check("I9: no app page or module imports the engine or names verb-forms.json yet", () => {
  const hits = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(js|html)$/.test(e.name) && e.name !== "verb-conjugation.js") { const t = fs.readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""); if (/verb-conjugation\.js|verb-forms\.json|verb-occurrences-corpus/.test(t)) hits.push(path.relative(root, p)); } } };
  walk(path.join(root, "app"));
  assert.deepEqual(hits, []);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
