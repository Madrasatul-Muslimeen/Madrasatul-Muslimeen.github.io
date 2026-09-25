// Issue #271 -- pure-parser suite for app/js/evernote-import-parser.js.
//
// Runs in plain Node, no browser, no emulator: the module under test imports
// only notes-import-shared.js (also pure), so its whole surface -- .enex
// extraction, ENML->HTML shaping, MD5, the reference finder and the
// folder/Note plan -- is exercised directly here, against small, HAND-BUILT
// fixtures (tools/evernote-import/fixture.enex and fixture-second.enex)
// covering every shape the issue names: an <en-media> picture, an āyah
// title, a range title, a Hadith title, an invalid (out-of-range) title, an
// empty title falling back to the body, an <en-todo> pair (checked and
// unchecked), an attachment (non-image) resource, tags, and two files
// sharing one Owner-typed stack folder. Neither fixture is a real Evernote
// export, which is never committed to this repository.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  decodeHtmlEntities, stripTags, titleFromBody, resolveNoteReference,
  stableImportId, md5Hex, base64ToBytes, parseEnexXml, enmlToHtml,
  analyzeEnexFile, planEnexImport,
} from "../../app/js/evernote-import-parser.js";

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

// Same real per-surah ayah-count shape wordpress-import-parser.mjs's own
// suite uses -- only the surahs this fixture actually references.
const SURAH_INDEX = [
  { surahNumber: 1, ayahCount: 7 },
  { surahNumber: 2, ayahCount: 286 },
  { surahNumber: 48, ayahCount: 29 },
];

// --- MD5, verified against RFC 1321 Appendix A.5's own test vectors --------
const te = (s) => new TextEncoder().encode(s);
check("md5Hex('') matches RFC 1321", () => {
  assert.equal(md5Hex(te("")), "d41d8cd98f00b204e9800998ecf8427e");
});
check("md5Hex('abc') matches RFC 1321", () => {
  assert.equal(md5Hex(te("abc")), "900150983cd24fb0d6963f7d28e17f72");
});
check("md5Hex('message digest') matches RFC 1321", () => {
  assert.equal(md5Hex(te("message digest")), "f96b697d7cb7938d525a2f31aaf161d0");
});
check("md5Hex(a-z) matches RFC 1321", () => {
  assert.equal(md5Hex(te("abcdefghijklmnopqrstuvwxyz")), "c3fcd3d76192e4007dfb496cca67e13b");
});
check("md5Hex(80-digit string, spans two 64-byte blocks) matches RFC 1321", () => {
  const long = "12345678901234567890123456789012345678901234567890123456789012345678901234567890";
  assert.equal(md5Hex(te(long)), "57edf4a22be3c955ac49da2e2107b67a");
});
check("base64ToBytes round-trips through md5Hex to the fixture's own picture hash", () => {
  const b64 = "RkFLRS1KUEVHLUJZVEVTLUZPUi1URVNUSU5HLU9OTFk=";
  assert.equal(md5Hex(base64ToBytes(b64)), "9032b3c0e57285522b5dcf4c4dbfe803");
});
check("base64ToBytes tolerates the line-wrapped whitespace a real .enex <data> carries", () => {
  const wrapped = "RkFLRS1K\nUEVHLUJZ\nVEVTLUZP\nUi1URVNU\nSU5HLU9O\nTFk=\n";
  assert.equal(md5Hex(base64ToBytes(wrapped)), "9032b3c0e57285522b5dcf4c4dbfe803");
});

// --- reused shared logic, sanity-checked through this module's own re-export ---
check("decodeHtmlEntities is the shared implementation, re-exported unchanged", () => {
  assert.equal(decodeHtmlEntities("A &amp; B"), "A & B");
});
check("stripTags/titleFromBody/resolveNoteReference are the shared implementations", () => {
  assert.equal(stripTags("<p>A &amp; B</p>"), "A & B");
  assert.equal(titleFromBody("one two three four five six seven eight nine"), "one two three four five six seven eight");
  assert.deepEqual(resolveNoteReference({ title: "2:255", bodyHtml: "", surahIndex: SURAH_INDEX }),
    { kind: "ayah", surah: 2, ayahFrom: 255, ayahTo: 255 });
});

// --- deterministic ids, namespaced apart from WordPress's own -------------
check("stableImportId is the same every time for the same (kind, key)", () => {
  assert.equal(stableImportId("note", "x"), stableImportId("note", "x"));
});
const { stableImportId: wpStableImportId } = await import("../../app/js/wordpress-import-parser.js");
check("stableImportId is namespaced 'evernote-import' -- different from wordpress-import-parser.js's own id for the identical (kind, key)", () => {
  assert.notEqual(stableImportId("note", "101"), wpStableImportId("note", "101"),
    "an Evernote id and a WordPress id collided for the same raw key -- the system namespace is not doing its job");
});

// --- ENML -> HTML -----------------------------------------------------------
check("enmlToHtml drops the XML/DOCTYPE preamble and the <en-note> wrapper", () => {
  const enml = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">\n<en-note><div>Hello</div></en-note>';
  assert.equal(enmlToHtml(enml, []), "<div>Hello</div>");
});
check("enmlToHtml turns a checked <en-todo> into ☑ and an unchecked one into ☐", () => {
  const html = enmlToHtml('<en-note><en-todo checked="true"/>Done<en-todo checked="false"/>Not done</en-note>', []);
  assert.ok(html.includes("☑Done"), "checked en-todo did not become ☑");
  assert.ok(html.includes("☐Not done"), "unchecked en-todo did not become ☐");
});
check("enmlToHtml replaces a picture <en-media> with a visible [picture: file-name] placeholder, matched by hash", () => {
  const resources = [{ fileName: "photo.jpg", mime: "image/jpeg", md5: "abc123", size: 10 }];
  const html = enmlToHtml('<en-note><en-media hash="abc123" type="image/jpeg"/></en-note>', resources);
  assert.ok(html.includes("[picture: photo.jpg]"), html);
});
check("enmlToHtml replaces a non-image <en-media> with a visible [attachment: file-name] placeholder", () => {
  const resources = [{ fileName: "notes.pdf", mime: "application/pdf", md5: "def456", size: 10 }];
  const html = enmlToHtml('<en-note><en-media hash="def456" type="application/pdf"/></en-note>', resources);
  assert.ok(html.includes("[attachment: notes.pdf]"), html);
});
check("enmlToHtml falls back to a generic label when no resource matches the hash", () => {
  const html = enmlToHtml('<en-note><en-media hash="unknown" type="image/png"/></en-note>', []);
  assert.ok(html.includes("[picture: file]"), html);
});

// --- the fixtures, end to end ------------------------------------------------
const fixture1Path = path.join(root, "tools/evernote-import/fixture.enex");
const fixture2Path = path.join(root, "tools/evernote-import/fixture-second.enex");
const parsed1 = parseEnexXml(fs.readFileSync(fixture1Path, "utf8"));
const parsed2 = parseEnexXml(fs.readFileSync(fixture2Path, "utf8"));

check("parseEnexXml reads every <note> in the fixture", () => {
  assert.equal(parsed1.items.length, 7);
  assert.equal(parsed2.items.length, 1);
});
check("parseEnexXml reads <created>/<updated> verbatim, and a missing <updated> is null", () => {
  const q255 = parsed1.items.find((i) => i.title === "Quran 2:255");
  assert.equal(q255.created, "20180105T090000Z");
  assert.equal(q255.updated, "20180106T100000Z");
  const packing = parsed1.items.find((i) => i.title === "Packing list");
  assert.equal(packing.updated, null, "a note with no <updated> tag must read null, never a made-up date");
});
check("parseEnexXml reads every <tag>", () => {
  const q255 = parsed1.items.find((i) => i.title === "Quran 2:255");
  assert.deepEqual(q255.tags, ["tafsir", "memorisation"]);
  const fatiha = parsed1.items.find((i) => i.title.includes("Fatiha"));
  assert.deepEqual(fatiha.tags, [], "a note with no <tag> elements must read an empty array, not throw");
});
check("parseEnexXml reads note-attributes' source-url", () => {
  const q255 = parsed1.items.find((i) => i.title === "Quran 2:255");
  assert.equal(q255.sourceUrl, "https://example.com/notes/1");
});
check("parseEnexXml reads a resource's file name, mime, size and a real MD5 of its decoded bytes", () => {
  const photo = parsed1.items.find((i) => i.title === "A photo from our trip");
  assert.equal(photo.resources.length, 1);
  assert.equal(photo.resources[0].fileName, "trip-photo.jpg");
  assert.equal(photo.resources[0].mime, "image/jpeg");
  assert.equal(photo.resources[0].md5, "9032b3c0e57285522b5dcf4c4dbfe803");
  assert.equal(photo.resources[0].size, "FAKE-JPEG-BYTES-FOR-TESTING-ONLY".length);
});

// --- the multi-file plan, exactly as app/import-notes.html would build it --
const files = [
  { notebookName: "Reflections", parentFolderName: "Personal Journal", items: parsed1.items },
  { notebookName: "Tafsir Notes", parentFolderName: "Personal Journal", items: parsed2.items },
];
const plan = planEnexImport(files, { surahIndex: SURAH_INDEX });

check("planEnexImport: one parent (stack) folder plus one folder per notebook, parent-before-child", () => {
  assert.equal(plan.folders.length, 3);
  const byName = new Map(plan.folders.map((f) => [f.name, f]));
  const stack = byName.get("Personal Journal");
  assert.ok(stack && stack.parentFolderId === null);
  for (const name of ["Reflections", "Tafsir Notes"]) {
    assert.equal(byName.get(name).parentFolderId, stack.folderId, `${name} is not filed under the stack folder`);
  }
  const indexOf = new Map(plan.folders.map((f, i) => [f.folderId, i]));
  assert.ok(indexOf.get(stack.folderId) < indexOf.get(byName.get("Reflections").folderId),
    "the stack folder must be ordered before its children");
});
check("planEnexImport: two files naming the same stack produce exactly ONE stack folder, not two", () => {
  const stacks = plan.folders.filter((f) => f.name === "Personal Journal");
  assert.equal(stacks.length, 1);
});
check("planEnexImport: sibling notebooks under the same stack get distinct sibling orders", () => {
  const reflections = plan.folders.find((f) => f.name === "Reflections");
  const tafsir = plan.folders.find((f) => f.name === "Tafsir Notes");
  assert.notEqual(reflections.order, tafsir.order);
});
check("planEnexImport: every Note belongs to exactly one folder -- its own notebook", () => {
  for (const note of plan.notes) assert.equal(note.folderIds.length, 1);
});
check("planEnexImport: preview counts match the fixtures exactly", () => {
  assert.deepEqual(plan.preview, {
    fileCount: 2, folderCount: 3, noteCount: 8,
    ayahLinkCount: 2, rangeLinkCount: 1, hadithCount: 1, invalidRefCount: 1, noRefCount: 3,
    resourceCount: 2,
    unmatchedSample: plan.preview.unmatchedSample, // asserted separately below
  });
});
check("planEnexImport: the unmatched sample names both no-reference and invalid-reference titles", () => {
  assert.deepEqual(plan.preview.unmatchedSample,
    ["A photo from our trip", "2:300 misprint", "(untitled)", "Packing list"]);
});
check("planEnexImport: an ayah reference (title starts with the reference)", () => {
  const note = plan.notes.find((n) => n.title === "Quran 2:255");
  assert.deepEqual(note.reference, { kind: "ayah", surah: 2, ayahFrom: 255, ayahTo: 255 });
});
check("planEnexImport: a range reference", () => {
  const note = plan.notes.find((n) => n.title.includes("Fatiha"));
  assert.deepEqual(note.reference, { kind: "range", surah: 1, ayahFrom: 1, ayahTo: 7 });
});
check("planEnexImport: a Hadith reference is stored, not linked", () => {
  const note = plan.notes.find((n) => n.title === "Sahih Bukhari Hadith 1");
  assert.equal(note.reference.kind, "hadith");
  assert.equal(note.importSource.system, "evernote");
});
check("planEnexImport: an out-of-range reference is INVALID, not silently absent", () => {
  const note = plan.notes.find((n) => n.title === "2:300 misprint");
  assert.deepEqual(note.reference, { kind: "invalid", surah: 2, ayahFrom: 300, ayahTo: 300 });
});
check("planEnexImport: a second file's own ayah reference resolves correctly (48:29)", () => {
  const note = plan.notes.find((n) => n.title.includes("Al-Fath"));
  assert.deepEqual(note.reference, { kind: "ayah", surah: 48, ayahFrom: 29, ayahTo: 29 });
});
check("planEnexImport: an empty title falls back to the first words of the body", () => {
  const note = plan.notes.find((n) => n.importSource.notebook === "Reflections" && n.title.startsWith("Just a quiet"));
  assert.equal(note.title, "Just a quiet reflection this evening with no");
});
check("planEnexImport: a checked and an unchecked en-todo both render as their own glyph", () => {
  const note = plan.notes.find((n) => n.title === "Quran 2:255");
  assert.ok(note.bodyHtml.includes("☑Read the tafsir"), note.bodyHtml);
  assert.ok(note.bodyHtml.includes("☐Memorise the ayah"), note.bodyHtml);
});
check("planEnexImport: a picture en-media becomes a visible placeholder and is recorded in importSource.resources", () => {
  const note = plan.notes.find((n) => n.title === "A photo from our trip");
  assert.ok(note.bodyHtml.includes("[picture: trip-photo.jpg]"), note.bodyHtml);
  assert.equal(note.importSource.resources.length, 1);
  assert.equal(note.importSource.resources[0].fileName, "trip-photo.jpg");
  assert.equal(note.importSource.resources[0].md5, "9032b3c0e57285522b5dcf4c4dbfe803");
});
check("planEnexImport: an attachment en-media becomes a visible placeholder, distinct wording from a picture", () => {
  const note = plan.notes.find((n) => n.title === "Packing list");
  assert.ok(note.bodyHtml.includes("[attachment: packing-list.pdf]"), note.bodyHtml);
});
check("planEnexImport: tags are recorded in importSource.tags -- no folder is created from a tag", () => {
  const note = plan.notes.find((n) => n.title === "Quran 2:255");
  assert.deepEqual(note.importSource.tags, ["tafsir", "memorisation"]);
  assert.ok(!plan.folders.some((f) => f.name === "tafsir" || f.name === "memorisation"),
    "a tag must never become a folder");
});
check("planEnexImport: every Note and folder id is unique", () => {
  assert.equal(new Set(plan.folders.map((f) => f.folderId)).size, plan.folders.length);
  assert.equal(new Set(plan.notes.map((n) => n.noteId)).size, plan.notes.length);
});
check("planEnexImport: ids are stable across two independent runs on the same files (idempotency)", () => {
  const again = planEnexImport(
    [
      { notebookName: "Reflections", parentFolderName: "Personal Journal", items: parseEnexXml(fs.readFileSync(fixture1Path, "utf8")).items },
      { notebookName: "Tafsir Notes", parentFolderName: "Personal Journal", items: parseEnexXml(fs.readFileSync(fixture2Path, "utf8")).items },
    ],
    { surahIndex: SURAH_INDEX },
  );
  assert.deepEqual(again.folders.map((f) => f.folderId), plan.folders.map((f) => f.folderId));
  assert.deepEqual(again.notes.map((n) => n.noteId), plan.notes.map((n) => n.noteId));
});
check("planEnexImport: no stack name -- a notebook becomes a root folder", () => {
  const noStack = planEnexImport([{ notebookName: "Solo Notebook", parentFolderName: null, items: [] }], { surahIndex: SURAH_INDEX });
  assert.equal(noStack.folders.length, 1);
  assert.equal(noStack.folders[0].parentFolderId, null);
});
check("planEnexImport: the same notebook name appearing in two files is combined into one folder, with a warning", () => {
  const dup = planEnexImport([
    { notebookName: "Same Name", parentFolderName: null, items: [{ title: "A", contentEnml: "<en-note>a</en-note>", created: null, updated: null, tags: [], sourceUrl: "", resources: [] }] },
    { notebookName: "Same Name", parentFolderName: null, items: [{ title: "B", contentEnml: "<en-note>b</en-note>", created: null, updated: null, tags: [], sourceUrl: "", resources: [] }] },
  ], { surahIndex: SURAH_INDEX });
  assert.equal(dup.folders.filter((f) => f.name === "Same Name").length, 1);
  assert.equal(dup.notes.length, 2);
  assert.ok(dup.warnings.some((w) => w.includes("Same Name")));
});

console.log(`\n==== evernote-import-parser: ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
