// ADR-007 — permanent Quran word occurrence identity, segmentation contract v1.
// Pure module: no Firebase, DOM, locale, or mutable application state.

export const QURAN_WORD_IDENTITY_VERSION = "v1";
export const QURAN_WORD_IDENTITY_PREFIX = `quran-word-occurrence:${QURAN_WORD_IDENTITY_VERSION}`;

function boundedInteger(value, label, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new TypeError(`${label} must be an integer from ${min} to ${max}.`);
  }
  return value;
}

/** Permanent identity for one occurrence under the immutable v1 segmentation. */
export function quranWordOccurrenceId(surah, ayah, position) {
  const s = boundedInteger(surah, "surah", 1, 114);
  const a = boundedInteger(ayah, "ayah", 1, 286);
  const p = boundedInteger(position, "position", 1, 999);
  return `${QURAN_WORD_IDENTITY_PREFIX}:${s}:${a}:${p}`;
}

/** Strict parser: unknown versions are not silently interpreted as v1. */
export function parseQuranWordOccurrenceId(id) {
  if (typeof id !== "string") throw new TypeError("word occurrence id must be a string.");
  const match = /^quran-word-occurrence:(v\d+):(\d+):(\d+):(\d+)$/.exec(id);
  if (!match) throw new TypeError("word occurrence id has an invalid shape.");
  if (match[1] !== QURAN_WORD_IDENTITY_VERSION) {
    throw new RangeError(`Unsupported Quran word identity contract: ${match[1]}.`);
  }
  const surah = boundedInteger(Number(match[2]), "surah", 1, 114);
  const ayah = boundedInteger(Number(match[3]), "ayah", 1, 286);
  const position = boundedInteger(Number(match[4]), "position", 1, 999);
  return { version: match[1], surah, ayah, position };
}

/**
 * Additive search form only. This value must never be used as identity or
 * replace the source surface token.
 */
export function normalizeArabicForSearch(value) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFC")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ـ/g, "")
    .trim();
}

/** Keeps morphology absence explicit; never derives one layer from another. */
export function wordIdentityLayers({ surah, ayah, position, arabic, morphology } = {}) {
  if (typeof arabic !== "string" || !arabic.trim()) {
    throw new TypeError("arabic source surface token is required.");
  }
  return {
    occurrenceId: quranWordOccurrenceId(surah, ayah, position),
    identityVersion: QURAN_WORD_IDENTITY_VERSION,
    surfaceToken: arabic,
    normalizedSearchForm: normalizeArabicForSearch(arabic),
    lemma: morphology?.lemma || null,
    root: morphology?.root || null,
    grammaticalFamily: null,
  };
}

