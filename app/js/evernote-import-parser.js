// Issue #271 -- importing an Evernote .enex export (one notebook per file)
// into Mapping My Journey: folders, Notes, ayah links -- the second importer
// built on the pattern issue #265's WordPress importer established. See that
// module's own header for why this is a hand-rolled string extractor rather
// than DOMParser (this sandbox has no Playwright), and why entity decoding,
// the reference finder and the deterministic-id scheme are SHARED rather
// than forked (notes-import-shared.js).
//
// PURE. No Firebase, no DOM API -- every function here takes plain
// strings/objects/File-less inputs (the browser reads a File to text and
// hands the STRING here; this module never touches File/Blob/FileReader) and
// returns plain objects, so the whole pipeline -- .enex extraction, ENML->
// HTML shaping, MD5 (needed to match an `<en-media hash>` to its resource --
// no browser exposes an MD5 primitive, Web Crypto only offers SHA), the
// reference finder and the folder/Note plan -- is exercised directly in
// plain Node against a hand-built fixture, and the exact same code runs in
// the browser.
//
// This module never imports unit-keys.js or firestore anything -- a resolved
// reference is returned as plain { kind, surah, ayahFrom, ayahTo }; the
// CALLER (evernote-import-service.js, which only ever runs in a browser)
// turns that into a real permanent unit key.

import {
  decodeHtmlEntities,
  stripTags,
  titleFromBody,
  resolveNoteReference,
  stableImportId as sharedStableImportId,
} from "./notes-import-shared.js";

export { decodeHtmlEntities, stripTags, titleFromBody, resolveNoteReference };

/** A stable id for one Evernote-imported entity -- see notes-import-shared.js's own header on why this is namespaced separately from WordPress's. */
export function stableImportId(kind, rawKey) {
  return sharedStableImportId("evernote-import", kind, rawKey);
}

// ---------------------------------------------------------------------------
// MD5 -- RFC 1321, over a byte array, returned as lowercase hex. Needed
// because a resource's `<data>` carries no hash of its own; `<en-media
// hash="...">` names the MD5 of the DECODED bytes, and that is the only way
// to match a picture/attachment reference in the body back to its resource.
// The K constants are computed from the RFC's own formula (K[i] =
// floor(abs(sin(i+1)) * 2^32)) rather than typed as 64 magic numbers, which
// is the standard way to keep this verifiably correct rather than
// transcribed. Verified against the RFC's own test vectors in this round's
// parser suite (md5("") / md5("abc") / md5("message digest") / the alphabet
// / an 80-digit string -- all five match RFC 1321 Appendix A.5 exactly).
// ---------------------------------------------------------------------------

const MD5_K = (() => {
  const k = new Uint32Array(64);
  for (let i = 0; i < 64; i++) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
  return k;
})();
const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

/** MD5, over a Uint8Array, returned as a lowercase hex string. */
export function md5Hex(bytes) {
  const origLenBits = bytes.length * 8;
  const padLen = ((56 - (bytes.length + 1) % 64) + 64) % 64;
  const total = bytes.length + 1 + padLen + 8;
  const msg = new Uint8Array(total);
  msg.set(bytes, 0);
  msg[bytes.length] = 0x80;
  const view = new DataView(msg.buffer);
  view.setUint32(total - 8, origLenBits >>> 0, true);
  view.setUint32(total - 4, Math.floor(origLenBits / 4294967296) >>> 0, true);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const M = new Uint32Array(16);
  for (let chunk = 0; chunk < total; chunk += 64) {
    for (let j = 0; j < 16; j++) M[j] = view.getUint32(chunk + j * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | (~D)); g = (7 * i) % 16; }
      F = (F + A + MD5_K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      const rot = MD5_S[i];
      B = (B + ((F << rot) | (F >>> (32 - rot)))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  ov.setUint32(0, a0, true); ov.setUint32(4, b0, true); ov.setUint32(8, c0, true); ov.setUint32(12, d0, true);
  return Array.from(out).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A base64 string (Evernote's own `<data>`, usually line-wrapped) to raw bytes. Works in both the browser (`atob`) and Node 18+ (which also has a global `atob`), with a Buffer fallback for anything older. */
export function base64ToBytes(base64) {
  const clean = (base64 || "").replace(/\s+/g, "");
  if (!clean) return new Uint8Array(0);
  if (typeof atob === "function") {
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  /* c8 ignore next */
  return Uint8Array.from(Buffer.from(clean, "base64"));
}

function md5HexOfText(str) {
  return md5Hex(new TextEncoder().encode(str || ""));
}

// ---------------------------------------------------------------------------
// .enex extraction -- string-based, CDATA-aware, the same technique as WXR
// (wordpress-import-parser.js's own blocksOf()/field()), tuned to .enex's
// own fixed, well-known tag set: <en-export><note>...<title>, <content>
// (ENML/XHTML inside CDATA), <created>, <updated>, zero or more <tag>,
// <note-attributes> (source-url, author), zero or more <resource> (base64
// <data>, <mime>, <resource-attributes><file-name>).
// ---------------------------------------------------------------------------

function blocksOf(xml, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "g");
  return [...xml.matchAll(re)].map((m) => m[0]);
}

/** One tag's text content inside `xml`, CDATA-aware and entity-decoded, or null if the tag is absent. */
function field(xml, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`);
  const m = xml.match(re);
  if (!m) return null;
  const raw = m[1] !== undefined ? m[1] : (m[2] ?? "");
  return decodeHtmlEntities(raw).trim();
}

/** One tag's text content, WITHOUT entity decoding -- used only for the raw base64 payload, where decoding would corrupt the data. */
function rawField(xml, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`);
  const m = xml.match(re);
  if (!m) return null;
  return (m[1] !== undefined ? m[1] : (m[2] ?? "")).trim();
}

/**
 * The whole .enex document, reduced to plain objects: `{ items }`, one per
 * `<note>`. Every item keeps its raw `<created>`/`<updated>` strings
 * (YYYYMMDDTHHMMSSZ, UTC) -- date-string-to-Date conversion is the SERVICE's
 * job (evernote-import-service.js), the same split wordpress-import-
 * service.js's own gmtToDate() already uses, so this module stays pure.
 */
export function parseEnexXml(enexText) {
  const text = enexText || "";
  const items = [];
  for (const block of blocksOf(text, "note")) {
    const title = field(block, "title") || "";
    const contentEnml = field(block, "content") || "";
    const created = field(block, "created") || null;
    const updated = field(block, "updated") || null;
    const tags = [...block.matchAll(/<tag(?:\s[^>]*)?>([\s\S]*?)<\/tag>/g)]
      .map((m) => decodeHtmlEntities(m[1]).trim())
      .filter(Boolean);

    const attrsBlock = (block.match(/<note-attributes>([\s\S]*?)<\/note-attributes>/) || [])[0] || "";
    const sourceUrl = field(attrsBlock, "source-url") || "";
    const author = field(attrsBlock, "author") || "";

    const resources = [];
    for (const resBlock of blocksOf(block, "resource")) {
      const mime = field(resBlock, "mime") || "";
      const base64 = rawField(resBlock, "data") || "";
      const resAttrsBlock = (resBlock.match(/<resource-attributes>([\s\S]*?)<\/resource-attributes>/) || [])[0] || "";
      const fileName = field(resAttrsBlock, "file-name") || "";
      const bytes = base64ToBytes(base64);
      resources.push({ fileName, mime, size: bytes.length, md5: md5Hex(bytes) });
    }

    items.push({ title, contentEnml, created, updated, tags, sourceUrl, author, resources });
  }
  return { items };
}

// ---------------------------------------------------------------------------
// ENML -> HTML. Issue #271's own instruction: "drop the <en-note> wrapper,
// keep text formatting, turn <en-todo> into checkbox glyphs, and drop
// anything the sanitizer would drop anyway" -- the last part means this need
// not be an exhaustive ENML validator: whatever it leaves untouched still
// goes through sanitizeNoteHtml() (DOMPurify) at render time, same as every
// other imported Note.
// ---------------------------------------------------------------------------

function escapeHtmlText(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Converts one note's ENML `<content>` (already entity-decoded by field()) into plain HTML, substituting a visible, non-destructive placeholder for every `<en-media>` (issue #271: pictures/attachments are NOT stored this round). */
export function enmlToHtml(contentEnml, resources = []) {
  let html = (contentEnml || "").trim();
  html = html.replace(/^<\?xml[^>]*\?>\s*/i, "");
  html = html.replace(/^<!DOCTYPE[^>]*>\s*/i, "");
  html = html.replace(/^<en-note[^>]*>/i, "").replace(/<\/en-note>\s*$/i, "");

  html = html.replace(/<en-todo\b([^>]*)\/?>(?:<\/en-todo>)?/gi, (whole, attrs) => (
    /checked\s*=\s*["']?true["']?/i.test(attrs) ? "☑" : "☐"
  ));

  html = html.replace(/<en-media\b([^>]*)\/?>(?:<\/en-media>)?/gi, (whole, attrs) => {
    const hashMatch = attrs.match(/\bhash\s*=\s*["']([^"']+)["']/i);
    const typeMatch = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i);
    const hash = hashMatch ? hashMatch[1] : null;
    const resource = hash ? resources.find((r) => r.md5 === hash) : null;
    const mime = resource?.mime || (typeMatch ? typeMatch[1] : "");
    const fileName = resource?.fileName || "file";
    const label = mime.startsWith("image/") ? `[picture: ${fileName}]` : `[attachment: ${fileName}]`;
    return `<span class="evernote-import-placeholder">${escapeHtmlText(label)}</span>`;
  });

  return html;
}

// ---------------------------------------------------------------------------
// The whole plan, across one or more chosen .enex files (the Owner may
// choose several at once). One file = one notebook = one folder; an
// optional, Owner-typed stack name becomes ONE shared parent folder above
// every notebook the Owner assigns to it. Folder ids are deterministic from
// notebook/stack NAME (issue's own instruction), so two files that name the
// same stack, or a second run of the same file(s), resolve to the same
// folder rather than a duplicate.
// ---------------------------------------------------------------------------

/**
 * Analyzes the raw `{ items }` of ONE already-parsed .enex file into notes,
 * folder descriptions and per-file preview counts. Does not decide ids or
 * merge across files -- planEnexImport() (below) is the multi-file entry
 * point every caller should actually use; this is exported mainly so the
 * test suite can exercise one file's own shaping in isolation.
 */
export function analyzeEnexFile({ items = [] } = {}, { notebookName, surahIndex = [] } = {}) {
  const notes = [];
  let ayahLinkCount = 0, rangeLinkCount = 0, hadithCount = 0, invalidRefCount = 0, noRefCount = 0, resourceCount = 0;
  const unmatchedSample = [];

  for (const item of items) {
    const bodyHtml = enmlToHtml(item.contentEnml, item.resources);
    let title = decodeHtmlEntities(item.title || "").trim();
    if (!title) {
      title = titleFromBody(stripTags(bodyHtml));
      if (!title) title = `Untitled (${(item.created || "").slice(0, 8) || "unknown date"})`;
    }

    const reference = resolveNoteReference({ title: item.title, bodyHtml, surahIndex });
    if (reference.kind === "ayah") ayahLinkCount += 1;
    else if (reference.kind === "range") rangeLinkCount += 1;
    else if (reference.kind === "hadith") hadithCount += 1;
    else if (reference.kind === "invalid") { invalidRefCount += 1; unmatchedSample.push(item.title || "(untitled)"); }
    else { noRefCount += 1; if (unmatchedSample.length < 20) unmatchedSample.push(item.title || "(untitled)"); }
    resourceCount += item.resources.length;

    notes.push({
      title, bodyHtml, reference,
      created: item.created || null,
      updated: item.updated || null,
      noteKey: `${notebookName}|${item.title || ""}|${item.created || ""}`,
      importSource: {
        system: "evernote",
        notebook: notebookName,
        sourceUrl: item.sourceUrl || "",
        tags: item.tags,
        contentHash: md5HexOfText(item.contentEnml || ""),
        resources: item.resources,
      },
    });
  }

  return {
    notes,
    preview: {
      notebookName, noteCount: notes.length,
      ayahLinkCount, rangeLinkCount, hadithCount, invalidRefCount, noRefCount,
      resourceCount, unmatchedSample,
    },
  };
}

/**
 * The multi-file entry point: `files` is `[{ notebookName, parentFolderName,
 * items }, ...]` (`items` = parseEnexXml()'s own output for that file,
 * `parentFolderName` the Owner-typed stack name or null). Returns
 * `{ folders, notes, warnings, filePreviews, preview }` -- `folders`/`notes`
 * in exactly the shape app/js/evernote-import-service.js (and, by design,
 * the same reader wordpress-import-service.js already established) needs:
 * `folders` topologically ordered parent-before-child, `notes` each carrying
 * a single-element `folderIds` (an Evernote Note belongs to one notebook).
 */
export function planEnexImport(files = [], { surahIndex = [] } = {}) {
  const folderById = new Map();
  const notes = [];
  const warnings = [];
  const filePreviews = [];
  const orderCounters = new Map();

  function nextOrder(parentKey) {
    const n = orderCounters.get(parentKey) ?? 0;
    orderCounters.set(parentKey, n + 1);
    return n;
  }

  for (const file of files) {
    const { notebookName, parentFolderName = null, items = [] } = file;
    const notebookFolderId = stableImportId("folder", notebookName);
    const parentFolderId = parentFolderName ? stableImportId("folder", parentFolderName) : null;

    if (parentFolderName && !folderById.has(parentFolderId)) {
      folderById.set(parentFolderId, {
        name: parentFolderName, folderId: parentFolderId, parentFolderId: null,
        order: nextOrder("root"),
        importSource: { system: "evernote", stack: parentFolderName },
      });
    }
    if (folderById.has(notebookFolderId)) {
      warnings.push(`Notebook "${notebookName}" appears in more than one chosen file -- its Notes were combined into the one folder.`);
    } else {
      folderById.set(notebookFolderId, {
        name: notebookName, folderId: notebookFolderId, parentFolderId,
        order: nextOrder(parentFolderId || "root"),
        importSource: { system: "evernote", notebook: notebookName },
      });
    }

    const fileAnalysis = analyzeEnexFile({ items }, { notebookName, surahIndex });
    filePreviews.push(fileAnalysis.preview);
    for (const note of fileAnalysis.notes) {
      notes.push({
        ...note,
        noteId: stableImportId("note", note.noteKey),
        folderIds: [notebookFolderId],
      });
    }
  }

  const folders = [...folderById.values()];
  const preview = filePreviews.reduce((acc, p) => ({
    fileCount: acc.fileCount + 1,
    folderCount: folders.length,
    noteCount: acc.noteCount + p.noteCount,
    ayahLinkCount: acc.ayahLinkCount + p.ayahLinkCount,
    rangeLinkCount: acc.rangeLinkCount + p.rangeLinkCount,
    hadithCount: acc.hadithCount + p.hadithCount,
    invalidRefCount: acc.invalidRefCount + p.invalidRefCount,
    noRefCount: acc.noRefCount + p.noRefCount,
    resourceCount: acc.resourceCount + p.resourceCount,
    unmatchedSample: acc.unmatchedSample.length < 20
      ? [...acc.unmatchedSample, ...p.unmatchedSample].slice(0, 20)
      : acc.unmatchedSample,
  }), {
    fileCount: 0, folderCount: folders.length, noteCount: 0,
    ayahLinkCount: 0, rangeLinkCount: 0, hadithCount: 0, invalidRefCount: 0, noRefCount: 0,
    resourceCount: 0, unmatchedSample: [],
  });

  return { folders, notes, warnings, filePreviews, preview };
}
