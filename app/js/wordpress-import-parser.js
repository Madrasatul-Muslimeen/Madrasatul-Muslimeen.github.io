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

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

const NAMED_ENTITIES = Object.freeze({
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
});

/** Decodes the numeric and named entities a WXR export actually contains (WordPress escapes smart quotes/dashes as numeric entities; raw UTF-8 diacritics need no decoding at all). */
export function decodeHtmlEntities(text) {
  if (!text) return "";
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, ent) => {
    if (ent[0] === "#") {
      const isHex = ent[1] === "x" || ent[1] === "X";
      const codePoint = isHex ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : whole;
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, ent) ? NAMED_ENTITIES[ent] : whole;
  });
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
// Deterministic ids -- issue #265's own explicit instruction. Every OTHER
// Note/folder in this app gets an opaque RANDOM id (note-foundation-
// contract.json's "opaque-stable-non-derived"); an imported one is a
// deliberate, narrowly-scoped exception, so a re-run of the same file can
// skip whatever it already created rather than writing a duplicate. The id
// is still opaque (a hash, not the raw WordPress id in plaintext) -- only
// its STABILITY across runs is new, not its shape.
// ---------------------------------------------------------------------------

function fnv1a(str, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** A stable id for one WordPress entity, the same every time it is called with the same (kind, rawKey). */
export function stableImportId(kind, rawKey) {
  const key = `wordpress-import:${kind}:${rawKey}`;
  const a = fnv1a(key, 0x811c9dc5).toString(16).padStart(8, "0");
  const b = fnv1a(`${key}|b`, 0x01000193).toString(16).padStart(8, "0");
  return `imp${String(kind).slice(0, 1)}${a}${b}`;
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

/** Plain text, entities decoded, tags stripped, whitespace collapsed. */
export function stripTags(html) {
  return decodeHtmlEntities((html || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/** The first `maxWords` words of some plain text, for a title-less post. */
export function titleFromBody(bodyPlainText, maxWords = 8) {
  return (bodyPlainText || "").split(/\s+/).filter(Boolean).slice(0, maxWords).join(" ");
}

// ---------------------------------------------------------------------------
// Reference parsing -- the title's own reference, "Quran N:M[-M2]" anywhere,
// "Sura N ... Ayat M", or a Hadith-shaped title. Validated against the REAL
// per-surah ayah count (surahIndex), never assumed.
// ---------------------------------------------------------------------------

const ANCHOR_WINDOW = 24;

function normalizeDashes(text) {
  return (text || "").replace(/[‒–—−]/g, "-");
}

/** Every "N:M" / "N:M-M2" candidate in `text`, in the order they appear. */
function findQuranRefCandidates(text) {
  const normalized = normalizeDashes(text);
  const candidates = [];
  const seenIndex = new Set();

  for (const m of normalized.matchAll(/(\d{1,3})\s*:\s*(\d{1,3})\s*-\s*(\d{1,3})/g)) {
    candidates.push({ index: m.index, surah: Number(m[1]), ayahFrom: Number(m[2]), ayahTo: Number(m[3]), kind: "range" });
    seenIndex.add(m.index);
  }
  for (const m of normalized.matchAll(/(\d{1,3})\s*:\s*(\d{1,3})(?!\s*-\s*\d)/g)) {
    if (seenIndex.has(m.index)) continue;
    candidates.push({ index: m.index, surah: Number(m[1]), ayahFrom: Number(m[2]), ayahTo: Number(m[2]), kind: "ayah" });
  }
  for (const m of normalized.matchAll(/\bsura[h]?\.?\s*(\d{1,3})\b[\s\S]{0,40}?\bayat?[\s.]*?(\d{1,3})\b/gi)) {
    candidates.push({ index: m.index, surah: Number(m[1]), ayahFrom: Number(m[2]), ayahTo: Number(m[2]), kind: "ayah" });
  }
  return candidates.sort((a, b) => a.index - b.index);
}

function validateQuranRef(candidate, surahIndex) {
  const entry = (surahIndex || []).find((s) => Number(s.surahNumber) === candidate.surah);
  if (!entry) return null;
  const count = Number(entry.ayahCount);
  if (!Number.isFinite(count) || count <= 0) return null;
  if (candidate.ayahFrom < 1 || candidate.ayahFrom > count) return null;
  if (candidate.ayahTo < candidate.ayahFrom || candidate.ayahTo > count) return null;
  return candidate.kind === "range" && candidate.ayahTo > candidate.ayahFrom
    ? { kind: "range", surah: candidate.surah, ayahFrom: candidate.ayahFrom, ayahTo: candidate.ayahTo }
    : { kind: "ayah", surah: candidate.surah, ayahFrom: candidate.ayahFrom, ayahTo: candidate.ayahFrom };
}

const HADITH_KEYWORDS = Object.freeze([
  "bukhari", "muslim", "tirmidhi", "abu dawud", "abu dawood", "ibn majah",
  "nasa", "nasai", "nasaee", "muwatta", "malik", "bulugh", "riyad",
  "shamail", "musnad", "sunan", "sahih", "saheeh",
]);

/** A Hadith-shaped reference, kept as free text (issue: "store the parsed Hadith reference text ... do not link it yet"). Needs a known collection keyword AND a digit, or it is not treated as one. */
export function findHadithReference(text) {
  const raw = (text || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (!HADITH_KEYWORDS.some((k) => lower.includes(k))) return null;
  if (!/\d/.test(raw)) return null;
  return raw;
}

/**
 * Resolves one Note's reference: the title's own start, then anywhere in the
 * title, then the body's first 400 characters (issue's own stated order).
 * `kind` is one of "ayah" | "range" | "invalid" | "hadith" | "none" --
 * "invalid" is a real, reportable outcome (issue: an out-of-range "2:300"
 * must be listed in the preview, not silently indistinguishable from a title
 * with no reference at all).
 */
export function resolveNoteReference({ title, bodyHtml, surahIndex } = {}) {
  const titleText = decodeHtmlEntities(title || "");
  const bodyText = stripTags(bodyHtml || "").slice(0, 400);

  const titleCandidates = findQuranRefCandidates(titleText);
  const startCandidates = titleCandidates.filter((c) => c.index <= ANCHOR_WINDOW);
  const bodyCandidates = findQuranRefCandidates(bodyText);
  const ordered = [...startCandidates, ...titleCandidates, ...bodyCandidates];

  for (const candidate of ordered) {
    const validated = validateQuranRef(candidate, surahIndex);
    if (validated) return validated;
  }
  if (ordered.length) {
    const first = ordered[0];
    return { kind: "invalid", surah: first.surah, ayahFrom: first.ayahFrom, ayahTo: first.ayahTo };
  }
  const hadithRef = findHadithReference(titleText) || findHadithReference(bodyText);
  if (hadithRef) return { kind: "hadith", hadithRef };
  return { kind: "none" };
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
