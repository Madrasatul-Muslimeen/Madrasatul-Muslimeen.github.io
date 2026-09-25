// Issue #263 -- the per-segment colouring data
// (tools/quran-data-pull/output/word-segments/*.json), built by
// tools/quran-data-pull/build-word-segments.mjs from the same Quranic
// Arabic Corpus morphology file `pull.js` already downloads.
//
// Pure: reads the already-generated output files and the already-packaged
// output/surahs/*.json (never touched by this round), plus imports the
// build script's own exported pure functions to prove the alignment
// algorithm itself is deterministic without re-fetching the morphology
// file over the network on every test run.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  segmentsForWord, resolveWordKeyExact, classifyRow, expandRow,
  personCodeFromFeatures, personCue, bwToAr, skeletonString,
} from "../quran-data-pull/build-word-segments.mjs";

const root = path.resolve(process.argv[2] || process.cwd());
const segDir = path.join(root, "tools", "quran-data-pull", "output", "word-segments");
const surahDir = path.join(root, "tools", "quran-data-pull", "output", "surahs");

let passed = 0, failed = 0;
function check(name, fn) {
  // A synchronous runner counts an `async` body as a pass -- see this
  // repository's own standing lesson. Refuse it rather than silently
  // trusting an unawaited assertion.
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

function loadSurah(n) {
  const file = `surah_${String(n).padStart(3, "0")}.json`;
  const seg = JSON.parse(fs.readFileSync(path.join(segDir, file), "utf8"));
  const surah = JSON.parse(fs.readFileSync(path.join(surahDir, file), "utf8"));
  return { seg, surah };
}

function wordArabic(surah, ayah, position) {
  const a = surah.ayahs.find((x) => x.ayah === ayah);
  return a?.words?.find((w) => w.position === position)?.arabic;
}

/** Pure validator: does `segments` cover `text` exactly, in order, with no
 *  gaps or overlaps? Used both by the real sweep below and by the mutation
 *  proofs, so the mutation proofs are evidence about the SAME function the
 *  sweep relies on, not a second copy of it. */
function coversExactly(segments, text) {
  let cursor = 0;
  for (const s of segments) {
    if (s.from !== cursor) return false;
    if (s.to <= s.from) return false;
    cursor = s.to;
  }
  return cursor === text.length;
}

const VALID_ROLES = new Set(["particle", "person", "determiner", "stem"]);

// ---------------------------------------------------------------------------
// 1. The worked example from the issue itself: 14:3:7, وَيَصُدُّونَ.
// ---------------------------------------------------------------------------

const { seg: seg014, surah: surah014 } = loadSurah(14);

check("14:3:7 (وَيَصُدُّونَ) segments are exactly particle وَ / person يَ / stem صُدُّ / person ونَ, with cues 'and', 'they', null, 'they'", () => {
  // Compared against the packaged data's own `arabic` string, never a
  // hand-typed literal: Arabic combining-mark order is not stable across a
  // text editor / tool round trip (this round's own build script had to
  // solve exactly this for QAC vs. Uthmani spelling -- see its own header),
  // so a literal here would be comparing two different normalisations of
  // the same word rather than proving anything about the real data.
  const arabic = wordArabic(surah014, 3, 7);
  assert.ok(arabic && arabic.length === 12, `expected the packaged 14:3:7 word to be 12 characters, got ${JSON.stringify(arabic)}`);
  const segs = seg014.words["3:7"];
  assert.ok(segs, "14:3:7 has no entry at all");
  assert.equal(segs.length, 4, `expected 4 segments, got ${segs.length}`);
  // Skeleton (letters only, diacritics stripped) rather than the raw slice:
  // a base Arabic letter is a single stable code point, but the FULL slice
  // (with its own diacritics) is not safe to compare against a hand-typed
  // literal -- see the comment above.
  const skeletons = segs.map((s) => skeletonString(arabic.slice(s.from, s.to)));
  assert.deepEqual(skeletons, ["و", "ي", "صد", "ون"], "the four segments are not the letters particle-w / person-y / stem-Sd / person-wn");
  assert.deepEqual(segs.map((s) => s.role), ["particle", "person", "stem", "person"]);
  assert.deepEqual(segs.map((s) => s.cue), ["and", "they", null, "they"]);
});

check("14:3:7's segments deepEqual comparison actually distinguishes a wrong answer (mutation proof)", () => {
  const segs = seg014.words["3:7"];
  const mutated = segs.map((s, i) => (i === 0 ? { ...s, cue: "then" } : s));
  assert.throws(() => assert.deepEqual(mutated.map((s) => s.cue), ["and", "they", null, "they"]));
});

// ---------------------------------------------------------------------------
// 2. Full sweep: every aligned word in every surah covers its own `arabic`
//    string exactly, in order, with no gaps or overlaps, and every role/cue
//    value is one this round's own vocabulary allows.
// ---------------------------------------------------------------------------

check("coversExactly() rejects a gap and an overlap (mutation proof the sweep below is not vacuous)", () => {
  assert.equal(coversExactly([{ from: 0, to: 2 }, { from: 3, to: 5 }], "12345"), false, "a gap at [2,3) was not caught");
  assert.equal(coversExactly([{ from: 0, to: 3 }, { from: 2, to: 5 }], "12345"), false, "an overlap at [2,3) was not caught");
  assert.equal(coversExactly([{ from: 0, to: 2 }, { from: 2, to: 5 }], "12345"), true, "real contiguous coverage was rejected");
});

check("every aligned word, every surah: segments cover the whole `arabic` string exactly, roles and cues are well-formed", () => {
  const files = fs.readdirSync(segDir).filter((f) => /^surah_\d{3}\.json$/.test(f));
  assert.ok(files.length === 114, `expected 114 surah segment files, found ${files.length}`);
  let checkedWords = 0;
  for (const file of files) {
    const surahNumber = Number(file.match(/\d{3}/)[0]);
    const { seg, surah } = loadSurah(surahNumber);
    const byKey = {};
    for (const a of surah.ayahs) for (const w of a.words) byKey[`${a.ayah}:${w.position}`] = w.arabic;
    for (const [key, segs] of Object.entries(seg.words)) {
      checkedWords++;
      const arabic = byKey[key];
      assert.ok(arabic !== undefined, `${file} ${key}: segments exist for a word the packaged surah file does not have`);
      assert.ok(coversExactly(segs, arabic), `${file} ${key} (${arabic}): segments do not exactly cover the word (${JSON.stringify(segs)})`);
      for (const s of segs) {
        assert.ok(VALID_ROLES.has(s.role), `${file} ${key}: unknown role "${s.role}"`);
        assert.ok(s.cue === null || (typeof s.cue === "string" && s.cue.length > 0), `${file} ${key}: cue is neither null nor a non-empty string`);
        if (s.role === "stem") assert.equal(s.cue, null, `${file} ${key}: a stem segment carries a cue -- the spec requires null`);
      }
    }
  }
  assert.ok(checkedWords > 70000, `expected to have checked tens of thousands of aligned words, only checked ${checkedWords}`);
  console.log(`        (checked ${checkedWords} aligned words across 114 surahs)`);
});

// ---------------------------------------------------------------------------
// 3. A determiner example and a preposition example, both real words from
//    the packaged corpus (not invented).
// ---------------------------------------------------------------------------

check("2:2:2 (ٱلْكِتَـٰبُ, 'the Book') is determiner ٱل + stem, cue 'the' on the determiner", () => {
  const { seg, surah } = loadSurah(2);
  const arabic = wordArabic(surah, 2, 2);
  const segs = seg.words["2:2"];
  assert.ok(segs, "2:2:2 has no entry");
  assert.equal(segs.length, 2);
  assert.equal(segs[0].role, "determiner");
  assert.equal(segs[0].cue, "the");
  assert.equal(skeletonString(arabic.slice(segs[0].from, segs[0].to)), "ال");
  assert.equal(segs[1].role, "stem");
  assert.equal(segs[1].cue, null);
});

check("2:3:3 (بِٱلْغَيْبِ, 'in the unseen') opens with a preposition particle ب, cue 'with|by|in'", () => {
  const { seg, surah } = loadSurah(2);
  const arabic = wordArabic(surah, 3, 3);
  const segs = seg.words["3:3"];
  assert.ok(segs, "2:3:3 has no entry");
  assert.equal(segs[0].role, "particle");
  assert.equal(segs[0].cue, "with|by|in");
  assert.equal(skeletonString(arabic.slice(segs[0].from, segs[0].to)), "ب");
});

// ---------------------------------------------------------------------------
// 4. An unalignable word produces no entry -- never a guess. 2:4:10
//    (وَبِٱلْـَٔاخِرَةِ) uses the Qur'anic combining-hamza-on-tatweel spelling
//    for its medial hamza, which this round's own skeleton alignment
//    deliberately does not collapse into a letter (see build-word-
//    segments.mjs's own comment on "never guess"), so the segment count
//    genuinely cannot be proven to match.
// ---------------------------------------------------------------------------

check("an unalignable real word (2:4:10, spelled with the Qur'anic combining-hamza-on-tatweel convention) has no entry at all", () => {
  const { seg, surah } = loadSurah(2);
  const arabic = wordArabic(surah, 4, 10);
  assert.ok(arabic, "2:4:10 does not exist in the packaged data -- pick a different real example");
  assert.equal(Object.prototype.hasOwnProperty.call(seg.words, "4:10"), false, "2:4:10 was given an entry despite being unalignable");
});

// ---------------------------------------------------------------------------
// 5. Coverage is at least the figure the script printed (99.64%, 77147 of
//    77429 words, recorded in the PR).
// ---------------------------------------------------------------------------

check("alignment coverage is at least 99% (99.64%, 77147/77429, printed by the build script)", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(segDir, "manifest.json"), "utf8"));
  assert.equal(manifest.totalWords, 77429);
  assert.ok(manifest.totalAligned >= 77000, `expected at least 77000 aligned words, manifest says ${manifest.totalAligned}`);
  assert.ok(manifest.coveragePercent >= 99, `expected at least 99% coverage, manifest says ${manifest.coveragePercent}%`);

  // Cross-check the manifest against the real files rather than trust it blindly.
  let recount = 0;
  for (const file of fs.readdirSync(segDir).filter((f) => /^surah_\d{3}\.json$/.test(f))) {
    recount += Object.keys(JSON.parse(fs.readFileSync(path.join(segDir, file), "utf8")).words).length;
  }
  assert.equal(recount, manifest.totalAligned, "the manifest's own totalAligned does not match a fresh recount of the per-surah files");
});

// ---------------------------------------------------------------------------
// 6. The build is reproducible: the pure alignment functions are
//    deterministic given the same input (proven here without a network
//    fetch); the full build script was independently re-run twice during
//    this round and produced byte-identical output both times (recorded in
//    the PR, since a second full network fetch does not belong in a test
//    suite that runs offline).
// ---------------------------------------------------------------------------

check("segmentsForWord() is deterministic: the same morphology + target text produces byte-identical output on repeated calls", () => {
  const morph = {
    idx: {
      "14:3:1": [{ tag: "V", features: "STEM|POS:V|LEM:kaAn|MOOD:IND", form: "kaAnuwA" }],
      "14:3:2": [{ tag: "CONJ", features: "PREFIX|w:CONJ+", form: "wa" }, { tag: "V", features: "STEM|POS:V|IMPF|LEM:Sad~a|ROOT:Sdd|3MP", form: "yaSud~u" }, { tag: "PRON", features: "SUFFIX|PRON:3MP", form: "wna" }],
    },
    ayahWords: { "14:3": [1, 2] },
  };
  const arabic = "وَيَصُدُّونَ";
  const first = segmentsForWord(morph, "14:3", 2, arabic, new Set());
  const second = segmentsForWord(morph, "14:3", 2, arabic, new Set());
  assert.deepEqual(first, second);
  assert.ok(first.length === 4, "the synthetic fixture did not reproduce the 4-segment split");
});

check("resolveWordKeyExact() does not reuse a word number already claimed at an earlier position in the same āyah", () => {
  const morph = {
    idx: {
      "9:9:1": [{ tag: "N", features: "STEM|POS:N|LEM:kitab", form: "kitaAb" }],
      "9:9:2": [{ tag: "N", features: "STEM|POS:N|LEM:kitab", form: "kitaAb" }],
    },
    ayahWords: { "9:9": [1, 2] },
  };
  const used = new Set();
  const first = resolveWordKeyExact(morph, "9:9", "كِتَاب", used);
  const second = resolveWordKeyExact(morph, "9:9", "كِتَاب", used);
  assert.equal(first, "9:9:1");
  assert.equal(second, "9:9:2", "the second identical word reused the first word's own morphology entry instead of claiming its own");
});

console.log(`\n==== Word-segment data (issue #263): ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
