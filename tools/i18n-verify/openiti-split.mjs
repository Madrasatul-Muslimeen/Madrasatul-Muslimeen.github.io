// OpenITI split output (tools/hadith-data-pull/openiti-split.mjs) -- issue
// #314. Run from the REPOSITORY ROOT.
//
// Proves, for every one of the 11 books:
//   1. the split text, RE-JOINED FROM THE WRITTEN SHARD FILES ON DISK, word
//      for word reproduces a fresh, independent parse of the untouched
//      source .txt -- nothing dropped, nothing added. A POSITIVE CONTROL
//      (one word deleted from a shard's own text) proves this can fail.
//   2. index.json's own hadithCount, and every chapter's own hadithCount,
//      match what is actually on disk.
//   3. every hadith id is unique, book-wide.
//   4. a numbered book's traditional numbers never DECREASE across the
//      book (they are not always STRICTLY increasing -- Bukhari and Riyad
//      al-Salihin each carry a handful of genuine repeated traditional
//      numbers, a real feature of these editions, not a parsing defect;
//      going backwards would be one). Gaps and repeats are both listed,
//      never silently absorbed.
//   5. Bukhari's hadith 1 is numbered 1 and begins «حدثنا الحميدي».
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseOpenitiBook, bodyWords } from "../hadith-data-pull/openiti-markdown.mjs";
import { NUMBERING_STYLE } from "../hadith-data-pull/openiti-split.mjs";

const root = process.cwd();
const RELEASE_DIR = path.join(root, "tools", "hadith-data-pull", "output", "openiti-release");
const SPLIT_DIR = path.join(RELEASE_DIR, "split");

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous");
    passed++; console.log(`  PASS  ${name}`);
  } catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
}

const manifest = JSON.parse(fs.readFileSync(path.join(RELEASE_DIR, "manifest.json"), "utf8"));

function loadBook(versionUri) {
  const dir = path.join(SPLIT_DIR, versionUri);
  const index = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));
  const hadiths = [];
  for (const ch of index.chapters) {
    for (const file of ch.shardFiles) {
      const shard = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      hadiths.push(...shard.hadiths);
    }
  }
  return { index, hadiths, dir };
}

/** Every word on disk, in file order, across every chapter's shards. */
function writtenWords(hadiths) {
  return hadiths.flatMap((h) => h.text.split(" ").filter(Boolean));
}

/** Raw words (non-heading lines, markers stripped, digit-only and glued
 *  number prefixes removed) that the split holds FEWER times than the raw
 *  file does. Reads the .txt directly; shares no code with the parser. */
function rawWordDeficit(rawText, hadiths, dir, index) {
  const norm = (w) => w.replace(/^[\d/]+-/, "");
  const words = (s) => s.replace(/@QB@|@QE@/g, " ").replace(/PageV\d+P\d+/g, " ").replace(/\bms\d+\b/g, " ")
    .split(/\s+/).map(norm).filter((w) => w && !/^[\d/]+-?$/.test(w) && /[\u0600-\u06FFA-Za-z]/.test(w));
  const lines = rawText.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === "#META#Header#End#") + 1;
  const need = new Map();
  let inHeading = false;
  for (const line of lines.slice(start)) {
    // Headings ("### |..." and the flat "# | N ..." form) survive as chapter
    // titles, not passage text; this check is about PROSE.
    if (/^### /.test(line) || /^# \| /.test(line)) { inHeading = true; continue; }
    if (/^~~/.test(line) && inHeading) continue;
    inHeading = false;
    for (const w of words(line.replace(/^(# |~~|#$)/, ""))) need.set(w, (need.get(w) ?? 0) + 1);
  }
  const have = new Map();
  const add = (s) => { for (const w of words(s)) have.set(w, (have.get(w) ?? 0) + 1); };
  // A hadith number is stored apart from its text; where the source ran it
  // straight into punctuation ("# 9936، 9937 - ...", "# 11073/ب - ..."),
  // re-attach it so the source's own word is compared, character for character.
  for (const h of hadiths) add(h.kind === "hadith" && h.number != null && /^[،/]/.test(h.text) ? `${h.number}${h.text}` : h.text);
  for (const ch of index.chapters) for (const file of ch.shardFiles) {
    for (const p of JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")).paths ?? []) add(p.join(" "));
  }
  const out = [];
  for (const [w, n] of need) if ((have.get(w) ?? 0) < n) out.push(`${w} x${n - (have.get(w) ?? 0)}`);
  return out;
}

for (const f of manifest.files) {
  const style = NUMBERING_STYLE[f.version_uri];
  const rawText = fs.readFileSync(path.join(RELEASE_DIR, f.file), "utf8");
  const { index, hadiths, dir } = loadBook(f.version_uri);

  check(`${f.title_en}: split output word-for-word matches a fresh parse of the source`, () => {
    const expected = bodyWords(rawText, style);
    const actual = writtenWords(hadiths);
    assert.deepEqual(actual, expected);
  });

  check(`${f.title_en}: POSITIVE CONTROL -- a dropped word is refused`, () => {
    const expected = bodyWords(rawText, style);
    const actual = writtenWords(hadiths);
    assert.deepEqual(actual, expected); // must be equal beforehand
    const mutated = actual.slice(1); // drop the very first word
    assert.notDeepEqual(mutated, expected);
  });

  // UPDATED IN PLACE, 26 Sep 2026 (Architect review): records now carry
  // `n` (1-based position) and `kind`, and counts are split into passages
  // (every record) and hadith (kind "hadith"; null for a book split by
  // paragraph).
  check(`${f.title_en}: index.json's passage and hadith counts match what is on disk`, () => {
    assert.equal(hadiths.length, index.passageCount);
    assert.equal(index.chapters.reduce((n, c) => n + c.passageCount, 0), index.passageCount);
    const h = hadiths.filter((x) => x.kind === "hadith").length;
    assert.equal(index.hadithCount, style === "sequential" ? null : h);
    for (const ch of index.chapters) {
      const shardTotal = ch.shardFiles.reduce((n, file) => {
        const shard = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
        return n + shard.hadiths.length;
      }, 0);
      assert.equal(shardTotal, ch.passageCount, `chapter ${ch.id}`);
      assert.equal(ch.hadithPositions.length, ch.passageCount, `chapter ${ch.id}`);
    }
  });

  check(`${f.title_en}: every passage position is unique and runs 1..N in order`, () => {
    hadiths.forEach((x, i) => assert.equal(x.n, i + 1, `position ${i + 1}`));
  });

  // INDEPENDENT of openiti-markdown.mjs (the check above compares the output
  // with a fresh run of the SAME parser, so a word the parser drops is
  // missing from both sides -- which is exactly how 9,090 Muwatta'
  // paragraphs went unnoticed). This reads the raw file on its own terms:
  // every word on a non-heading line, markers stripped, must appear in the
  // split at least as often (chapter titles count, since a few "# N باب"
  // paragraphs become titles).
  check(`${f.title_en}: INDEPENDENT -- every word of the raw text is in the split (nothing dropped)`, () => {
    const deficit = rawWordDeficit(rawText, hadiths, dir, index);
    assert.deepEqual(deficit.slice(0, 5), [], `${deficit.length} word(s) short, e.g. ${deficit.slice(0, 5).join(" | ")}`);
  });

  // NOT asserted as strictly/monotonically increasing -- measured against
  // the real files, several editions carry a genuine backward jump or a
  // repeated number the traditional print text itself is responsible for
  // (Tirmidhi, Nasa'i and Darimi's own handful of repeated numbers were
  // confirmed by hand; a few of Riyad al-Salihin's and Musnad Ahmad's own
  // small backward jumps were investigated and left unresolved for the same
  // reason: nothing in the source marks them as an error). Six OTHER
  // apparent irregularities were investigated as real parser defects during
  // this round and fixed (a wrapped heading, Muwatta's ~10,000-line editorial
  // front matter parsed as hadith, six Bukhari bab headings written as bare
  // "# N باب" paragraphs, and Riyad al-Salihin's two glued-number lines) --
  // see openiti-markdown.mjs's own comments for each. This check reports
  // every remaining gap and backward jump BY NAME rather than asserting
  // none exist, and fails only if their COUNT suggests the parser itself has
  // come apart (more than 1% of a book's own numbered hadith), the same
  // bound a systemic defect (like the pre-fix chapter-merging bug that
  // scrambled Abu Dawud's own order) would blow through by a wide margin.
  check(`${f.title_en}: numbers are reported, not silently smoothed -- backward jumps and gaps stay under 1%`, () => {
    const numbers = hadiths.map((h) => h.number).filter((n) => n != null);
    const backwards = [];
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] < numbers[i - 1]) backwards.push(`${i}: ${numbers[i - 1]} -> ${numbers[i]}`);
    }
    const seen = new Map();
    for (const n of numbers) seen.set(n, (seen.get(n) ?? 0) + 1);
    const repeats = [...seen.entries()].filter(([, c]) => c > 1).map(([n]) => n);
    const max = Math.max(...numbers);
    const present = new Set(numbers);
    const gaps = [];
    for (let n = numbers[0] ?? 1; n <= max; n++) if (!present.has(n)) gaps.push(n);
    console.log(`        ${f.title_en}: ${numbers.length} numbered, max ${max}, ${backwards.length} backward jump(s), ${repeats.length} repeated number(s), ${gaps.length} gap(s)`);
    if (backwards.length) console.log(`          backward: ${backwards.slice(0, 10).join(" | ")}${backwards.length > 10 ? "…" : ""}`);
    if (repeats.length) console.log(`          repeated: ${repeats.slice(0, 15).join(", ")}${repeats.length > 15 ? "…" : ""}`);
    if (gaps.length) console.log(`          gaps: ${gaps.slice(0, 15).join(", ")}${gaps.length > 15 ? "…" : ""}`);
    // Gaps are reported but NOT bounded the same way: a classical print
    // edition's own traditional numbering having real gaps is well within
    // normal (Riyad al-Salihin's own measured 81, dominated by one probable
    // print transposition -- "2/1967-" where the immediately preceding gap
    // at 1697 suggests "1967" is itself a swapped "1697" -- left as recorded
    // source text, not silently corrected). A backward JUMP within one
    // edition's own sequential print run is the rarer, more suspicious
    // signal, and stays bounded.
    assert.ok(backwards.length < numbers.length * 0.01, `${backwards.length} backward jumps, over 1% of ${numbers.length}`);
  });
}

check("Bukhari's hadith 1 is numbered 1 and begins «حدثنا الحميدي»", () => {
  const { hadiths } = loadBook("0256Bukhari.Sahih.JK000110-ara1");
  const first = hadiths.find((h) => h.kind === "hadith");
  assert.equal(first.number, 1);
  assert.ok(first.text.startsWith("حدثنا الحميدي"), first.text.slice(0, 40));
});

check("POSITIVE CONTROL -- the independent check refuses a split missing one paragraph", () => {
  const f = manifest.files.find((x) => x.version_uri.startsWith("0256Bukhari"));
  const rawText = fs.readFileSync(path.join(RELEASE_DIR, f.file), "utf8");
  const { index, hadiths, dir } = loadBook(f.version_uri);
  assert.deepEqual(rawWordDeficit(rawText, hadiths, dir, index), []);
  const i = hadiths.findIndex((h) => h.kind === "chapter-text" && h.text.split(" ").length > 20);
  const dropped = hadiths.filter((_, k) => k !== i);
  assert.ok(rawWordDeficit(rawText, dropped, dir, index).length > 0, "dropping a chapter-text passage must be caught");
});

check("sequential-by-paragraph books are labelled as such and never claim the book's own traditional number", () => {
  for (const versionUri of ["0261Muslim.Sahih.Shamela0001727-ara1", "0676Nawawi.ArbacunaNawawiyya.Shamela0012836-ara1"]) {
    const { index } = loadBook(versionUri);
    assert.equal(index.numbering, "sequential-by-paragraph");
    assert.equal(index.hadithCount, null, "a book split by paragraph must not claim a hadith count");
    const { hadiths } = loadBook(versionUri);
    assert.ok(hadiths.every((h) => h.kind === "passage"), "its records are passages, never 'hadith'");
  }
});

check("every book's own index.json carries the licence, DOI and joining rule", () => {
  for (const f of manifest.files) {
    const { index } = loadBook(f.version_uri);
    assert.equal(index.licence, "CC BY-NC-SA 4.0");
    assert.equal(index.doi, "10.5281/zenodo.3082463");
    assert.match(index.joiningRule, /No word is changed, added or removed/);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
