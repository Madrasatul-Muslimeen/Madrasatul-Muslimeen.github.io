// Issue #265 -- pure-parser suite for app/js/wordpress-import-parser.js.
//
// Runs in plain Node, no browser, no emulator: the module under test imports
// nothing (no DOMParser, no Firebase), so its whole surface -- WXR
// extraction, entity decoding, wpautop, image handling, reference parsing
// and the folder/Note plan -- is exercised directly here, against a small,
// HAND-BUILT fixture (tools/wordpress-import/fixture.wxr.xml) covering every
// title format issue #265 names. It is NOT the Owner's real
// mappingmyjourney.com export, which is never committed to this repository.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  decodeHtmlEntities, parseWxrXml, stableImportId, wpautop, collectImageUrls,
  addLazyLoading, stripTags, titleFromBody, resolveNoteReference,
  findHadithReference, analyzeWxrImport,
} from "../../app/js/wordpress-import-parser.js";

const root = path.resolve(process.argv[2] || process.cwd());
let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    }
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

// A real per-surah ayah-count table, exactly the shape
// tools/quran-data-pull/output/surah-index.json carries -- only the surahs
// this fixture actually references, so a drift in the real file cannot make
// this suite silently pass or fail on unrelated data.
const SURAH_INDEX = [
  { surahNumber: 2, ayahCount: 286 },
  { surahNumber: 4, ayahCount: 176 },
  { surahNumber: 7, ayahCount: 206 },
  { surahNumber: 48, ayahCount: 29 },
  { surahNumber: 49, ayahCount: 18 },
];

// --- entity decoding ---------------------------------------------------
check("decodeHtmlEntities: numeric decimal", () => {
  assert.equal(decodeHtmlEntities("Qur&#8217;an"), "Qur’an");
});
check("decodeHtmlEntities: numeric hex", () => {
  assert.equal(decodeHtmlEntities("&#x41;&#x42;"), "AB");
});
check("decodeHtmlEntities: named", () => {
  assert.equal(decodeHtmlEntities("A &amp; B &lt;tag&gt;"), "A & B <tag>");
});
check("decodeHtmlEntities: leaves raw UTF-8 diacritics untouched", () => {
  assert.equal(decodeHtmlEntities("Al-Ħujurāt"), "Al-Ħujurāt");
});

// --- body shaping --------------------------------------------------------
check("wpautop wraps blank-line-separated plain text in <p> tags", () => {
  assert.equal(wpautop("First line.\n\nSecond line."), "<p>First line.</p>\n<p>Second line.</p>");
});
check("wpautop leaves a body that already has block tags untouched", () => {
  assert.equal(wpautop("<div>already block</div>"), "<div>already block</div>");
});
check("collectImageUrls finds every <img src>, in order", () => {
  const html = '<p><img src="https://a.example/x.jpg"></p><p><img src="https://a.example/y.jpg" alt="y"></p>';
  assert.deepEqual(collectImageUrls(html), ["https://a.example/x.jpg", "https://a.example/y.jpg"]);
});
check("addLazyLoading adds loading=lazy to an <img> without one, and leaves one that already has it", () => {
  assert.equal(addLazyLoading('<img src="a.jpg">'), '<img src="a.jpg" loading="lazy">');
  assert.equal(addLazyLoading('<img src="a.jpg" loading="eager">'), '<img src="a.jpg" loading="eager">');
});
check("stripTags removes markup and decodes entities", () => {
  assert.equal(stripTags("<p>A &amp; <b>B</b></p>"), "A & B");
});
check("titleFromBody takes the first N words", () => {
  assert.equal(titleFromBody("one two three four five six seven eight nine ten"), "one two three four five six seven eight");
});

// --- reference resolution -------------------------------------------------
check("resolveNoteReference: 'Quran 2:255' -> valid ayah", () => {
  assert.deepEqual(resolveNoteReference({ title: "Quran 2:255", bodyHtml: "", surahIndex: SURAH_INDEX }),
    { kind: "ayah", surah: 2, ayahFrom: 255, ayahTo: 255 });
});
check("resolveNoteReference: trailing period is not part of the ayah number", () => {
  assert.deepEqual(resolveNoteReference({ title: "7:33.", bodyHtml: "", surahIndex: SURAH_INDEX }),
    { kind: "ayah", surah: 7, ayahFrom: 33, ayahTo: 33 });
});
check("resolveNoteReference: leading numeric ref with a trailing surah name", () => {
  assert.deepEqual(resolveNoteReference({ title: "49:13 Al-Ħujurāt", bodyHtml: "", surahIndex: SURAH_INDEX }),
    { kind: "ayah", surah: 49, ayahFrom: 13, ayahTo: 13 });
});
check("resolveNoteReference: 'Sura N (Name) Ayat M' has no colon at all", () => {
  assert.deepEqual(resolveNoteReference({ title: "Sura 48 (Al-Fath) Ayat 29", bodyHtml: "", surahIndex: SURAH_INDEX }),
    { kind: "ayah", surah: 48, ayahFrom: 29, ayahTo: 29 });
});
check("resolveNoteReference: hyphen range", () => {
  assert.deepEqual(resolveNoteReference({ title: "2:1-5", bodyHtml: "", surahIndex: SURAH_INDEX }),
    { kind: "range", surah: 2, ayahFrom: 1, ayahTo: 5 });
});
check("resolveNoteReference: en-dash range normalizes the same as a hyphen", () => {
  assert.deepEqual(resolveNoteReference({ title: "2:1–5", bodyHtml: "", surahIndex: SURAH_INDEX }),
    { kind: "range", surah: 2, ayahFrom: 1, ayahTo: 5 });
});
check("resolveNoteReference: an out-of-range ayah is INVALID, not silently absent", () => {
  assert.deepEqual(resolveNoteReference({ title: "2:300", bodyHtml: "", surahIndex: SURAH_INDEX }),
    { kind: "invalid", surah: 2, ayahFrom: 300, ayahTo: 300 });
});
check("resolveNoteReference: falls through to the body's first 400 characters", () => {
  assert.deepEqual(resolveNoteReference({ title: "A reflection", bodyHtml: "<p>See Quran 4:113 for more.</p>", surahIndex: SURAH_INDEX }),
    { kind: "ayah", surah: 4, ayahFrom: 113, ayahTo: 113 });
});
check("resolveNoteReference: a Hadith-shaped title, no Quran ref present", () => {
  assert.deepEqual(resolveNoteReference({ title: "Sunan Nasaee' 143", bodyHtml: "", surahIndex: SURAH_INDEX }),
    { kind: "hadith", hadithRef: "Sunan Nasaee' 143" });
});
check("resolveNoteReference: a Hadith reference sitting in the middle of the title is still found", () => {
  assert.deepEqual(resolveNoteReference({ title: "Sahih Muslim Book 1 Hadith 164", bodyHtml: "", surahIndex: SURAH_INDEX }),
    { kind: "hadith", hadithRef: "Sahih Muslim Book 1 Hadith 164" });
});
check("resolveNoteReference: no reference of any kind", () => {
  assert.deepEqual(resolveNoteReference({ title: "A quiet afternoon", bodyHtml: "<p>Nothing numeric here.</p>", surahIndex: SURAH_INDEX }),
    { kind: "none" });
});
check("findHadithReference refuses a keyword with no digit at all", () => {
  assert.equal(findHadithReference("A note about Sahih al-Bukhari's methodology"), null);
});

// --- deterministic ids -----------------------------------------------------
check("stableImportId is the same every time for the same (kind, key)", () => {
  assert.equal(stableImportId("note", "101"), stableImportId("note", "101"));
});
check("stableImportId differs across kinds and across keys", () => {
  const a = stableImportId("note", "101");
  const b = stableImportId("folder", "101");
  const c = stableImportId("note", "102");
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});

// --- the fixture, end to end -----------------------------------------------
const fixturePath = path.join(root, "tools/wordpress-import/fixture.wxr.xml");
const fixtureXml = fs.readFileSync(fixturePath, "utf8");
const parsed = parseWxrXml(fixtureXml);

check("parseWxrXml reads every declared category", () => {
  assert.equal(parsed.categories.length, 5);
});
check("parseWxrXml decodes an entity-encoded category name", () => {
  const cat = parsed.categories.find((c) => c.niceName === "quran-study");
  assert.ok(cat, "the quran-study category is missing");
  assert.equal(cat.name, "Qur’an Study");
});
check("parseWxrXml keeps only real posts -- an attachment and a page are excluded", () => {
  assert.equal(parsed.items.length, 14);
  assert.ok(!parsed.items.some((i) => i.postId === "114"), "the attachment (postId 114) was not filtered out");
  assert.ok(!parsed.items.some((i) => i.postId === "115"), "the page (postId 115) was not filtered out");
});
check("parseWxrXml keeps a trashed post -- filtering trash is analyzeWxrImport's job, not the extractor's", () => {
  assert.ok(parsed.items.some((i) => i.postId === "116" && i.status === "trash"));
});
check("parseWxrXml reads a post's categories by nicename, deduplicated", () => {
  const item104 = parsed.items.find((i) => i.postId === "104");
  assert.deepEqual(item104.categoryNiceNames, ["quran-study", "tafsir", "reflections"]);
});

const plan = analyzeWxrImport(parsed, { surahIndex: SURAH_INDEX });

check("analyzeWxrImport skips the trashed post", () => {
  assert.equal(plan.notes.length, 13);
  assert.ok(!plan.notes.some((n) => n.postId === "116"));
});
check("analyzeWxrImport: preview counts match the fixture exactly", () => {
  assert.deepEqual(plan.preview, {
    folderCount: 5, noteCount: 13,
    ayahLinkCount: 5, rangeLinkCount: 2, hadithCount: 2, invalidRefCount: 1, noRefCount: 3,
    unmatchedSample: plan.preview.unmatchedSample, // asserted separately below
  });
});
check("analyzeWxrImport: the invalid-reference sample names the unmatched title", () => {
  assert.ok(plan.preview.unmatchedSample.includes("2:300"));
});
check("analyzeWxrImport: folders are topologically ordered -- a parent always appears before its child", () => {
  const indexOf = new Map(plan.folders.map((f, i) => [f.folderId, i]));
  for (const folder of plan.folders) {
    if (folder.parentFolderId === null) continue;
    assert.ok(indexOf.get(folder.parentFolderId) < indexOf.get(folder.folderId),
      `${folder.name} (parent ${folder.parentFolderId}) is not ordered after its parent`);
  }
});
check("analyzeWxrImport: every folder and note id is unique", () => {
  assert.equal(new Set(plan.folders.map((f) => f.folderId)).size, plan.folders.length);
  assert.equal(new Set(plan.notes.map((n) => n.noteId)).size, plan.notes.length);
});
check("analyzeWxrImport: ids are stable across two independent runs on the same file (issue #265's own idempotency requirement)", () => {
  const again = analyzeWxrImport(parseWxrXml(fixtureXml), { surahIndex: SURAH_INDEX });
  assert.deepEqual(again.folders.map((f) => f.folderId), plan.folders.map((f) => f.folderId));
  assert.deepEqual(again.notes.map((n) => n.noteId), plan.notes.map((n) => n.noteId));
});
check("analyzeWxrImport: a post filed in three categories gets three folder ids", () => {
  const note104 = plan.notes.find((n) => n.postId === "104");
  assert.equal(note104.folderIds.length, 3);
});
check("analyzeWxrImport: an empty title falls back to the first words of the body", () => {
  const note111 = plan.notes.find((n) => n.postId === "111");
  assert.equal(note111.title, "Reflecting on patience during a difficult week of");
});
check("analyzeWxrImport: an empty title with an empty body falls back to 'Untitled (date)'", () => {
  const note112 = plan.notes.find((n) => n.postId === "112");
  assert.equal(note112.title, "Untitled (2018-01-17)");
});
check("analyzeWxrImport: an <img> keeps its absolute site URL, gains loading=lazy, and is recorded in importSource", () => {
  const note113 = plan.notes.find((n) => n.postId === "113");
  assert.ok(note113.bodyHtml.includes('src="https://mappingmyjourney.com/wp-content/uploads/2018/01/photo.jpg"'));
  assert.ok(note113.bodyHtml.includes('loading="lazy"'));
  assert.deepEqual(note113.importSource.imageUrls, ["https://mappingmyjourney.com/wp-content/uploads/2018/01/photo.jpg"]);
});
check("analyzeWxrImport: a body already wrapped in <p> is left alone by wpautop", () => {
  const note101 = plan.notes.find((n) => n.postId === "101");
  assert.equal(note101.bodyHtml, "<p>Ayat al-Kursi, the greatest ayah in the Qur'an.</p>");
});
check("analyzeWxrImport: a draft keeps its WordPress status in the import metadata", () => {
  const note102 = plan.notes.find((n) => n.postId === "102");
  assert.equal(note102.status, "draft");
  assert.equal(note102.importSource.status, "draft");
});
check("analyzeWxrImport: a Hadith reference is stored, not linked", () => {
  const note109 = plan.notes.find((n) => n.postId === "109");
  assert.equal(note109.reference.kind, "hadith");
  assert.equal(note109.importSource.hadithRef, "Sunan Nasaee' 143");
});
check("analyzeWxrImport: an invalid reference records no link", () => {
  const note108 = plan.notes.find((n) => n.postId === "108");
  assert.equal(note108.reference.kind, "invalid");
});
check("analyzeWxrImport: a valid range is recorded on the note", () => {
  const note106 = plan.notes.find((n) => n.postId === "106");
  assert.deepEqual(note106.reference, { kind: "range", surah: 2, ayahFrom: 1, ayahTo: 5 });
  const note107 = plan.notes.find((n) => n.postId === "107");
  assert.deepEqual(note107.reference, { kind: "range", surah: 2, ayahFrom: 1, ayahTo: 5 });
});

console.log(`\n==== wordpress-import-parser: ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
