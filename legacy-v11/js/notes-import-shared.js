// Issue #271 -- the SOURCE-INDEPENDENT parts of "import notes from somewhere
// else into Mapping My Journey", split out of app/js/wordpress-import-
// parser.js (built for issue #265) so a second importer (Evernote's own
// .enex export) can reuse them rather than fork them: entity decoding, the
// title/body Qur'an-reference finder, the Hadith-reference finder, and the
// deterministic-id scheme.
//
// PURE. No Firebase, no DOM API (no DOMParser, no fetch, no `window`/
// `document`) -- every function here takes plain strings/objects in and
// returns plain objects out, so it is testable in plain Node and runs
// unchanged in the browser, where the real imports actually happen. See
// wordpress-import-parser.js's own header for why this project prefers a
// hand-rolled extractor to DOMParser (this sandbox has no Playwright).
//
// This module never imports unit-keys.js or firestore anything -- a resolved
// reference is returned as plain { kind, surah, ayahFrom, ayahTo }; each
// CALLER (a *-import-service.js, which only ever runs in a browser) turns
// that into a real permanent unit key with buildUnitKey.ayah/.range.

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

const NAMED_ENTITIES = Object.freeze({
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
});

/** Decodes the numeric and named entities a real export actually contains. */
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

/** Plain text, entities decoded, tags stripped, whitespace collapsed. */
export function stripTags(html) {
  return decodeHtmlEntities((html || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/** The first `maxWords` words of some plain text, for a title-less item. */
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

/** A Hadith-shaped reference, kept as free text (stored, never linked). Needs a known collection keyword AND a digit, or it is not treated as one. */
export function findHadithReference(text) {
  const raw = (text || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (!HADITH_KEYWORDS.some((k) => lower.includes(k))) return null;
  if (!/\d/.test(raw)) return null;
  return raw;
}

/**
 * Resolves one item's reference: the title's own start, then anywhere in the
 * title, then the body's first 400 characters. `kind` is one of
 * "ayah" | "range" | "invalid" | "hadith" | "none" -- "invalid" is a real,
 * reportable outcome (an out-of-range "2:300" must be listed in the preview,
 * not silently indistinguishable from a title with no reference at all).
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
// Deterministic ids -- every importer's own explicit requirement (issue #265,
// carried into issue #271): every OTHER Note/folder in this app gets an
// opaque RANDOM id (note-foundation-contract.json's "opaque-stable-non-
// derived"); an imported one is a deliberate, narrowly-scoped exception, so a
// re-run of the same file(s) can skip whatever it already created rather than
// writing a duplicate. The id is still opaque (a hash, not the raw source id
// in plaintext) -- only its STABILITY across runs is new, not its shape.
//
// `system` namespaces the hash per importer ("wordpress-import",
// "evernote-import", ...) so the SAME raw key from two different sources can
// never collide on one id -- a WordPress post id "101" and an Evernote note
// keyed "101" (however unlikely) must never resolve to the same Note.
// ---------------------------------------------------------------------------

function fnv1a(str, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** A stable id for one imported entity, the same every time it is called with the same (system, kind, rawKey). */
export function stableImportId(system, kind, rawKey) {
  const key = `${system}:${kind}:${rawKey}`;
  const a = fnv1a(key, 0x811c9dc5).toString(16).padStart(8, "0");
  const b = fnv1a(`${key}|b`, 0x01000193).toString(16).padStart(8, "0");
  return `imp${String(kind).slice(0, 1)}${a}${b}`;
}
