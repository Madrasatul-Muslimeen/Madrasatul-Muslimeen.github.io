// Splits the 11 OpenITI books (tools/hadith-data-pull/output/openiti-release/
// *.txt, pulled verbatim by openiti-pull.mjs) into book -> chapter -> hadith,
// issue #314. Reads the pulled .txt files and manifest.json; NEVER writes to
// either. Writes output/openiti-release/split/<version_uri>/index.json plus
// chapter shard files beside it.
//
// NUMBERING STYLE per book -- see openiti-markdown.mjs's own header comment
// for the full measured reasoning:
//   "inline-number"      Bukhari, Abu Dawud, Nasa'i, Ibn Majah, Muwatta',
//                        Ahmad, Darimi.
//   "triple-pipe-number" Tirmidhi, Riyad al-Salihin.
//   "sequential"         Muslim, Nawawi's Forty -- numbered by paragraph
//                        order, NEVER the book's own traditional number.
//
// CHAPTER GROUPING. A "chapter" here is the nearest enclosing DEPTH-1 heading
// only (each book's own deeper divisions, where they exist, ride along in
// each hadith's own `chapterPath` for display, but shard/grouping boundaries
// are depth-1 only) -- see openiti-markdown.mjs for why this is the right
// level for what the issue actually asks the UI to browse.
//
// THE JOINING RULE (recorded here, in the output, per the issue's own
// instruction): a hadith's `text` is its paragraph's own words, with
// continuation lines (~~), inline page markers (PageV01P013-shaped), inline
// milestone markers (msNNNN) and the @QB@/@QE@ Qur'an-quote wrapper tags
// (found on inspection, not in the issue's own marker list, but left in the
// text they would show as literal garbage) all stripped and the remaining
// words joined with a single space. No word is changed, added or removed.
//
// IDS. `id` is `openiti:<version_uri>:<n>`, n = 1-based position in the book
// (NOT the traditional `number`) -- several books carry a genuine duplicate
// traditional number (e.g. Bukhari has 11, Riyad al-Salihin several), a real
// feature of these editions, not a parsing defect, so `number` alone cannot
// be a unique id.
//
// Usage (repository root): node tools/hadith-data-pull/openiti-split.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseOpenitiBook } from "./openiti-markdown.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RELEASE_DIR = path.join(__dirname, "output", "openiti-release");
const SPLIT_DIR = path.join(RELEASE_DIR, "split");

export const SHARD_SIZE = 200;

export const NUMBERING_STYLE = Object.freeze({
  "0256Bukhari.Sahih.JK000110-ara1": "inline-number",
  "0275AbuDawudSijistani.Sunan.JK000142-ara1": "inline-number",
  "0303Nasai.SunanSughra.JK000130-ara1": "inline-number",
  "0273IbnMaja.Sunan.JK000141-ara1": "inline-number",
  "0179MalikIbnAnas.Muwatta.Shamela0028107-ara1": "inline-number",
  "0241IbnHanbal.Musnad.Shamela0025794-ara1": "inline-number",
  "0255CabdAllahDarimi.Sunan.JK000842-ara1": "inline-number",
  "0279Tirmidhi.Sunan.JK000140-ara1": "triple-pipe-number",
  "0676Nawawi.RiyadSalihin.Shamela0012014-ara1": "triple-pipe-number",
  "0261Muslim.Sahih.Shamela0001727-ara1": "sequential",
  "0676Nawawi.ArbacunaNawawiyya.Shamela0012836-ara1": "sequential",
});

const JOINING_RULE =
  "text is the paragraph's own words: continuation lines (~~) joined with a " +
  "single space, inline page markers (PageV01P013-shaped), inline milestone " +
  "markers (msNNNN) and the @QB@/@QE@ Qur'an-quote wrapper tags stripped. " +
  "No word is changed, added or removed.";

/**
 * Groups finalized hadith records into chapters by chapterPath[0] -- a NEW
 * chapter starts every time this text changes from the PREVIOUS hadith's,
 * never re-merged with an earlier chapter of the same title.
 *
 * Grouping by title text globally (a first draft did this, keyed on a Map)
 * corrupts the book's own order the moment two DIFFERENT chapters share a
 * title -- measured, not hypothetical: Abu Dawud's own numbering, checked
 * hadith-by-hadith after splitting, jumped backwards from 4023 to 393
 * because two unrelated, distantly-separated chapters both happened to
 * title down to the same cleaned string and were merged into one bucket,
 * splicing a much-later chapter's hadith into the middle of an early one.
 * Grouping by adjacency instead keeps every chapter exactly where its own
 * hadith actually sit in the source, whatever its title has in common with
 * some other chapter far away.
 */
export function groupIntoChapters(hadiths) {
  const chapters = [];
  let current = null;
  for (const h of hadiths) {
    const title = h.chapterPath[0] ?? "";
    if (!current || current.title !== title) {
      current = { id: `ch-${chapters.length + 1}`, title, hadiths: [] };
      chapters.push(current);
    }
    current.hadiths.push(h);
  }
  return chapters;
}

/** Splits one chapter's hadith into shard-sized parts, returning [{ file, hadiths }]. */
function shardChapter(chapterId, hadiths) {
  if (hadiths.length <= SHARD_SIZE) return [{ file: `${chapterId}.json`, hadiths }];
  const parts = [];
  for (let i = 0; i < hadiths.length; i += SHARD_SIZE) {
    const partNum = Math.floor(i / SHARD_SIZE) + 1;
    parts.push({ file: `${chapterId}-${partNum}.json`, hadiths: hadiths.slice(i, i + SHARD_SIZE) });
  }
  return parts;
}

function splitOneBook(bookMeta, numberingStyle, rawText) {
  const { hadiths: parsed, warnings } = parseOpenitiBook(rawText, numberingStyle);
  const withIds = parsed.map((h, i) => ({
    id: `openiti:${bookMeta.version_uri}:${i + 1}`,
    number: h.number,
    chapterPath: h.chapterPath,
    text: h.text,
    pageRefs: h.pageRefs,
  }));
  const chapters = groupIntoChapters(withIds);

  const outDir = path.join(SPLIT_DIR, bookMeta.version_uri);
  fs.mkdirSync(outDir, { recursive: true });

  const chapterIndex = [];
  for (const ch of chapters) {
    const shards = shardChapter(ch.id, ch.hadiths);
    for (const shard of shards) {
      fs.writeFileSync(path.join(outDir, shard.file), JSON.stringify({ hadiths: shard.hadiths }));
    }
    const numbers = ch.hadiths.map((h) => h.number).filter((n) => n != null);
    chapterIndex.push({
      id: ch.id,
      title: ch.title,
      hadithCount: ch.hadiths.length,
      firstNumber: numbers.length ? numbers[0] : null,
      lastNumber: numbers.length ? numbers[numbers.length - 1] : null,
      shardFiles: shards.map((s) => s.file),
      // Bare sequential positions, not the full "openiti:<versionUri>:<n>"
      // string repeated once per hadith -- across the 11 books' ~77,000
      // hadith that repetition alone cost several MB against the ~60 MB
      // budget. The full id is always `openiti:${versionUri}:${n}` (this
      // file's own `versionUri` above), reconstructed by any reader.
      hadithPositions: ch.hadiths.map((h) => Number(h.id.split(":").pop())),
    });
  }

  const index = {
    schemaVersion: 1,
    sourceId: "openiti-release",
    versionUri: bookMeta.version_uri,
    titleAr: bookMeta.title_ar,
    titleEn: bookMeta.title_en,
    authorAr: bookMeta.author_ar,
    licence: "CC BY-NC-SA 4.0",
    doi: "10.5281/zenodo.3082463",
    creditLine: "Source: OpenITI (CC BY-NC-SA 4.0)",
    numbering: numberingStyle === "sequential" ? "sequential-by-paragraph" : "book-number",
    joiningRule: JOINING_RULE,
    hadithCount: withIds.length,
    shardSize: SHARD_SIZE,
    chapters: chapterIndex,
  };
  // Not pretty-printed: with ~1,300-1,900 chapters in some of these books
  // (Ibn Majah, Abu Dawud, Darimi), 2-space indentation alone cost real MB
  // against the ~60 MB budget for no reader-facing benefit -- nobody reads
  // this file by eye.
  fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index));

  return { hadithCount: withIds.length, chapterCount: chapters.length, warnings };
}

function dirSizeBytes(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSizeBytes(p) : fs.statSync(p).size;
  }
  return total;
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(RELEASE_DIR, "manifest.json"), "utf8"));
  fs.mkdirSync(SPLIT_DIR, { recursive: true });

  let totalHadiths = 0;
  for (const bookMeta of manifest.files) {
    const style = NUMBERING_STYLE[bookMeta.version_uri];
    if (!style) throw new Error(`No numbering style configured for ${bookMeta.version_uri}`);
    const rawText = fs.readFileSync(path.join(RELEASE_DIR, bookMeta.file), "utf8");
    const { hadithCount, chapterCount, warnings } = splitOneBook(bookMeta, style, rawText);
    totalHadiths += hadithCount;
    console.log(`  ${bookMeta.title_en}: ${hadithCount} hadith, ${chapterCount} chapters, ${warnings.length} warnings`);
    if (warnings.length) console.log(`    ${warnings.slice(0, 5).join(" | ")}`);
  }

  const sizeMB = dirSizeBytes(SPLIT_DIR) / 1048576;
  console.log(`\nDone: ${totalHadiths} hadith across 11 books, split output ${sizeMB.toFixed(1)} MB`);
  if (sizeMB > 60) {
    console.error(`STOP: split output is ${sizeMB.toFixed(1)} MB, over the ~60 MB budget.`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
