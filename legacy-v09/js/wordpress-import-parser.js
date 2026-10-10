// Issue #265 -- importing mappingmyjourney.com (a WordPress WXR export) into
// Mapping My Journey: folders, Notes, ayah links.
//
// PURE. No Firebase, no DOM API (no DOMParser, no fetch, no `window`/
// `document`) -- every function here takes plain strings/objects in and
// returns plain objects out, so the whole parsing/analysis pipeline is
// testable in plain Node with a hand-built fixture, and the exact same code
// runs in the browser, where the real import actually happens (there is no
// server -- app/import-notes.html is what reads the Owner's chosen .xml file
// and hands its text to parseWxrXml() below).
//
// DELIBERATELY NOT BUILT ON DOMParser, even though the issue's own wording
// says "parsed in the browser with DOMParser": DOMParser exists only in a
// browser, so logic built on it can only ever be exercised by this project's
// own Playwright harness -- which this sandbox does not have (the same
// documented chromium_headless_shell gap CLAUDE.md already records
// repeatedly). A hand-rolled string extractor tuned to WXR's own fixed,
// well-known tag set (the shape every WordPress export uses) needs no DOM at
// all, so the SAME parsing code the browser runs is exactly what the pure
// Node suite exercises -- no untested browser-only adapter layer standing in
// front of the real logic. The import still happens entirely client-side,
// with no server, which is the actual requirement this satisfies.
//
// This module never imports unit-keys.js or firestore anything -- a
// resolved reference is returned as { kind, surah, ayahFrom, ayahTo }, plain
// numbers, and the CALLER (wordpress-import-service.js, which only ever
// runs in a browser) turns that into a real permanent unit key with the
// real buildUnitKey.ayah/.range. Keeping that conversion out of this file is
// what keeps it importable with zero dependencies.
//
// Issue #271 -- entity decoding, the title/body reference finder and the
// deterministic-id scheme are SOURCE-INDEPENDENT (the Evernote .enex importer
// needs the identical logic), so they now live in notes-import-shared.js and
// are re-exported here unchanged -- every existing caller and test of this
// module keeps working against the same names and the same behaviour.
// stableImportId(kind, rawKey) below is a thin wrapper that only fixes the
// `system` namespace to "wordpress-import", byte-identical to what this file
// computed before the split (same key string, same hash).

import {
  decodeHtmlEntities,
  stripTags,
  titleFromBody,
  resolveNoteReference,
  findHadithReference,
  stableImportId as sharedStableImportId,
} from "./notes-import-shared.js";

export { decodeHtmlEntities, stripTags, titleFromBody, resolveNoteReference, findHadithReference };

/** A stable id for one WordPress entity, the same every time it is called with the same (kind, rawKey). */
export function stableImportId(kind, rawKey) {
  return sharedStableImportId("wordpress-import", kind, rawKey);
}

// ---------------------------------------------------------------------------
// WXR extraction -- string-based, CDATA-aware
// ---------------------------------------------------------------------------

function blocksOf(xml, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "g");
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

/**
 * The whole WXR document, reduced to plain objects: `{ categories, items }`.
 * `items` is filtered to real posts only (`wp:post_type` == "post") -- pages,
 * attachments and nav-menu items are not folders or Notes.
 */
export function parseWxrXml(xmlText) {
  const text = xmlText || "";

  const categories = [];
  for (const block of blocksOf(text, "wp:category")) {
    const termId = field(block, "wp:term_id");
    const niceName = field(block, "wp:category_nicename");
    if (!termId || !niceName) continue;
    const parentNiceName = field(block, "wp:category_parent") || null;
    const name = field(block, "wp:cat_name") || niceName;
    categories.push({ termId, niceName, parentNiceName: parentNiceName || null, name });
  }

  const items = [];
  for (const block of blocksOf(text, "item")) {
    if (field(block, "wp:post_type") !== "post") continue;
    const postId = field(block, "wp:post_id");
    if (!postId) continue;
    const categoryNiceNames = [...block.matchAll(/<category\s+domain="category"\s+nicename="([^"]*)"[^>]*>/g)]
      .map((m) => decodeHtmlEntities(m[1]));
    items.push({
      postId,
      status: field(block, "wp:status") || "publish",
      title: field(block, "title") || "",
      contentEncoded: field(block, "content:encoded") || "",
      postDateGmt: field(block, "wp:post_date_gmt") || null,
      postModifiedGmt: field(block, "wp:post_modified_gmt") || null,
      postDate: field(block, "wp:post_date") || null,
      postModified: field(block, "wp:post_modified") || null,
      link: field(block, "link") || "",
      categoryNiceNames: [...new Set(categoryNiceNames)],
    });
  }

  fillMissingGmtDates(items);
  return { categories, items };
}

// ---------------------------------------------------------------------------
// Architect review, 25 Sep 2026 -- measured on the Owner's real export: 246
// of 519 drafts carry `post_date_gmt` "0000-00-00 00:00:00" (WordPress does
// not set a GMT date on a draft until it is published), while every one of
// them still has its LOCAL `post_date`. Without this those Notes would lose
// their original date entirely. The site's own UTC offset is read off the
// posts that carry both dates (the most common difference, so one odd post
// cannot skew it) and applied to the local date.
// ---------------------------------------------------------------------------
const ZERO_DATE = /^0000-00-00/;
function wpDateMs(value) {
  if (!value || ZERO_DATE.test(value)) return null;
  const ms = Date.parse(`${value.trim().replace(" ", "T")}Z`);
  return Number.isNaN(ms) ? null : ms;
}
function formatWpDate(ms) {
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}
export function fillMissingGmtDates(items) {
  const offsets = new Map();
  for (const item of items) {
    const local = wpDateMs(item.postDate), gmt = wpDateMs(item.postDateGmt);
    if (local !== null && gmt !== null) offsets.set(local - gmt, (offsets.get(local - gmt) || 0) + 1);
  }
  let offset = 0, best = -1;
  for (const [value, count] of offsets) if (count > best) { best = count; offset = value; }
  for (const item of items) {
    for (const [gmtKey, localKey] of [["postDateGmt", "postDate"], ["postModifiedGmt", "postModified"]]) {
      if (wpDateMs(item[gmtKey]) !== null) continue;
      const local = wpDateMs(item[localKey]);
      item[gmtKey] = local === null ? null : formatWpDate(local - offset);
    }
  }
  return offset;
}

// ---------------------------------------------------------------------------
// Body shaping
// ---------------------------------------------------------------------------

const BLOCK_TAG_RE = /<(p|div|ul|ol|h1|h2|h3)[\s>]/i;

/** WordPress's own `wpautop` rule, simplified: a body with no block tags at all gets blank-line-separated paragraphs; a body that already has some is left alone. */
export function wpautop(html) {
  const trimmed = (html || "").trim();
  if (!trimmed) return "";
  if (BLOCK_TAG_RE.test(trimmed)) return trimmed;
  return trimmed
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

/** Every `<img src>` in `html`, in document order, entity-decoded, absolute WordPress site URLs kept as they are (issue: "images stay on the site for now"). */
export function collectImageUrls(html) {
  return [...(html || "").matchAll(/<img\b[^>]*\ssrc=["']([^"']+)["']/gi)].map((m) => decodeHtmlEntities(m[1]));
}

/** Adds `loading="lazy"` to every `<img>` tag that does not already carry a `loading` attribute. */
export function addLazyLoading(html) {
  return (html || "").replace(/<img\b([^>]*)>/gi, (whole, attrs) => (
    /\sloading\s*=/.test(attrs) ? whole : `<img${attrs} loading="lazy">`
  ));
}

// ---------------------------------------------------------------------------
// The whole plan: folders (topologically ordered, roots first) and Notes,
// each carrying everything the import service needs and nothing it does not.
// ---------------------------------------------------------------------------

/**
 * `{ categories, items }` (parseWxrXml's own output) plus the real per-surah
 * ayah counts, reduced to an import plan: `{ folders, notes, warnings, preview }`.
 *
 * `folders` is returned PARENT-BEFORE-CHILD (a breadth-first walk from every
 * root), which is what lets the import service create them in one pass
 * without re-sorting -- ADR-010's own rule that a folder's parent must exist
 * before the folder does.
 */
export function analyzeWxrImport({ categories = [], items = [] } = {}, { surahIndex = [] } = {}) {
  const byNiceName = new Map(categories.map((c) => [c.niceName, c]));
  const folderIdByTermId = new Map(categories.map((c) => [c.termId, stableImportId("folder", c.termId)]));

  const childrenOf = new Map();
  const roots = [];
  for (const c of categories) {
    const parent = c.parentNiceName ? byNiceName.get(c.parentNiceName) : null;
    if (parent) {
      if (!childrenOf.has(parent.termId)) childrenOf.set(parent.termId, []);
      childrenOf.get(parent.termId).push(c);
    } else {
      roots.push(c);
    }
  }
  const byName = (a, b) => (a.name || a.niceName).localeCompare(b.name || b.niceName);
  roots.sort(byName);
  for (const list of childrenOf.values()) list.sort(byName);

  const folders = [];
  const warnings = [];
  const seenTermIds = new Set();

  function walk(cat, parentFolderId, order) {
    if (seenTermIds.has(cat.termId)) {
      warnings.push(`Category ${cat.termId} appears more than once in the file -- the repeat was skipped.`);
      return;
    }
    seenTermIds.add(cat.termId);
    const folderId = folderIdByTermId.get(cat.termId);
    folders.push({
      termId: cat.termId, niceName: cat.niceName, name: cat.name || cat.niceName,
      folderId, parentFolderId, order,
      importSource: { system: "wordpress", termId: cat.termId, niceName: cat.niceName },
    });
    (childrenOf.get(cat.termId) || []).forEach((kid, i) => walk(kid, folderId, i));
  }
  roots.forEach((r, i) => walk(r, null, i));

  // A category naming a parent that does not resolve -- not expected in the
  // real file (the issue's own measurement: 0 orphans) but a fixture or a
  // future export could carry one, and silently promoting it to root without
  // saying so would misfile it quietly.
  for (const c of categories) {
    if (seenTermIds.has(c.termId)) continue;
    warnings.push(`Category ${c.termId} (${c.name}) names an unresolved parent -- imported as a root folder instead.`);
    folders.push({
      termId: c.termId, niceName: c.niceName, name: c.name || c.niceName,
      folderId: folderIdByTermId.get(c.termId), parentFolderId: null, order: folders.length,
      importSource: { system: "wordpress", termId: c.termId, niceName: c.niceName },
    });
  }

  const notes = [];
  let ayahLinkCount = 0, rangeLinkCount = 0, hadithCount = 0, invalidRefCount = 0, noRefCount = 0;
  const unmatchedSample = [];

  for (const item of items) {
    if (item.status === "trash") continue; // issue: import published and drafts, skip trash

    const bodyPlain = stripTags(item.contentEncoded);
    let title = decodeHtmlEntities(item.title || "").trim();
    if (!title) {
      title = titleFromBody(bodyPlain);
      if (!title) title = `Untitled (${(item.postDateGmt || "").slice(0, 10) || "unknown date"})`;
    }

    const reference = resolveNoteReference({ title: item.title, bodyHtml: item.contentEncoded, surahIndex });
    if (reference.kind === "ayah") ayahLinkCount += 1;
    else if (reference.kind === "range") rangeLinkCount += 1;
    else if (reference.kind === "hadith") hadithCount += 1;
    else if (reference.kind === "invalid") { invalidRefCount += 1; unmatchedSample.push(item.title || "(untitled)"); }
    else { noRefCount += 1; if (unmatchedSample.length < 20) unmatchedSample.push(item.title || "(untitled)"); }

    const folderIds = [...new Set(item.categoryNiceNames)]
      .map((niceName) => byNiceName.get(niceName))
      .filter(Boolean)
      .map((cat) => folderIdByTermId.get(cat.termId));

    notes.push({
      postId: item.postId,
      noteId: stableImportId("note", item.postId),
      title,
      bodyHtml: addLazyLoading(wpautop(item.contentEncoded || "")),
      status: item.status,
      postDateGmt: item.postDateGmt,
      postModifiedGmt: item.postModifiedGmt,
      folderIds,
      reference,
      importSource: {
        system: "wordpress",
        site: "mappingmyjourney.com",
        postId: item.postId,
        status: item.status,
        link: item.link || "",
        imageUrls: collectImageUrls(item.contentEncoded || ""),
        hadithRef: reference.kind === "hadith" ? reference.hadithRef : null,
      },
    });
  }

  return {
    folders,
    notes,
    warnings,
    preview: {
      folderCount: folders.length,
      noteCount: notes.length,
      ayahLinkCount,
      rangeLinkCount,
      hadithCount,
      invalidRefCount,
      noRefCount,
      unmatchedSample,
    },
  };
}
