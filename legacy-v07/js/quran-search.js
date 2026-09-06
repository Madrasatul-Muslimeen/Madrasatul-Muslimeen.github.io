// Whole-Qur'an word and phrase search (shell round 14, 15 Aug 2026).
//
// The owner asked for a Search that reaches all three languages. Pure logic:
// no DOM, no Firebase, no rendering -- the page that calls it decides how a
// result looks (I2). Data comes from js/quran-data.js, which stays the only
// place that reads the packaged static files.
//
// THE LANGUAGE IS CHOSEN BY WHAT WAS TYPED, not by the app's language
// setting. Someone reading the app in Bangla may well search for an Arabic
// word, and a Bangla-only reader typing Bengali script should not be handed
// English results. It also means only ONE index is ever downloaded per
// search rather than all three (see build-search-index.js).

import { getSearchIndex } from "./quran-data.js";

const ARABIC = /[؀-ۿݐ-ݿ]/;
const BENGALI = /[ঀ-৿]/;

/** Which index a query belongs in, decided by the script it is written in. */
export function searchLangFor(query) {
  const q = String(query ?? "");
  if (ARABIC.test(q)) return "ar";
  if (BENGALI.test(q)) return "bn";
  return "en";
}

// The small marks above and below Arabic letters. Nobody types them into a
// search box, and the packaged uthmani text is full of them, so both sides
// are stripped before matching. Everything here either REMOVES a character
// or swaps one for one -- which is what lets a match found in the stripped
// text be mapped back to its place in the original (see originalRange).
//
// THE ALEF IS DROPPED TOO, and that is not tidiness -- it is the fix for a
// real miss found while checking whether phrase search worked. The Uthmani
// script writes some long A sounds as a SUPERSCRIPT alef rather than a full
// one, so the text of 1:2 contains no plain alef in its last word at all. A
// reader types it WITH the alef, and got nothing back. Stripping the mark
// alone cannot fix that -- the two sides still differ by a letter -- and
// folding the mark INTO an alef breaks the opposite case, a word people type
// WITHOUT an alef against a text that carries the superscript one.
//
// Dropping every alef from the comparison makes both work, and it is the
// same alef-insensitive matching Qur'an search tools generally use. The
// accepted cost: two words differing only by an alef stop being told apart,
// so Arabic search is slightly broader than literal. Broader beats silently
// empty, which is what it was.
const AR_STRIP = /[ؐ-ًؚ-ٰٟۖ-ۭـ​-‏﻿]/;
const AR_FOLD = new Map([
  ["آ", "ا"], ["أ", "ا"], ["إ", "ا"], ["ٱ", "ا"], // آ أ إ ٱ -> ا
  ["ى", "ي"], // ى -> ي
  ["ة", "ه"], // ة -> ه
]);

const ALEF = "\u0627";

/** True when this character disappears during normalisation for this language.
    Checked in the same order normalize() applies things -- strip first, then
    fold, then drop anything that folded to an alef -- so the two can never
    disagree about which characters survived. originalRange() depends on that
    agreement to map a match back onto the pointed original. */
function isDropped(lang, ch) {
  if (lang !== "ar") return false;
  if (AR_STRIP.test(ch)) return true;
  return (AR_FOLD.get(ch) ?? ch) === ALEF;
}

/** The form both the query and the ayah text are compared in. */
export function normalize(lang, text) {
  const s = String(text ?? "");
  if (lang !== "ar") return s.toLowerCase();
  let out = "";
  for (const ch of s) {
    if (isDropped("ar", ch)) continue;
    out += AR_FOLD.get(ch) ?? ch;
  }
  return out;
}

/**
 * Where a match found in the NORMALISED text sits in the ORIGINAL one.
 *
 * For English and Bangla normalising is only lowercasing, so the two strings
 * line up character for character. For Arabic the marks are removed, so the
 * positions drift apart -- this walks the original, counting only the
 * characters that survived, and reports the real span. That is what lets a
 * result highlight the matched words in properly-pointed Arabic rather than
 * showing the stripped form or giving up on highlighting altogether.
 */
export function originalRange(lang, original, normFrom, normLength) {
  if (lang !== "ar") return { from: normFrom, to: normFrom + normLength };
  const chars = [...original];
  let seen = 0;
  let from = null;
  let i = 0;
  for (; i < chars.length; i++) {
    if (isDropped(lang, chars[i])) continue;
    if (seen === normFrom && from === null) from = i;
    if (seen === normFrom + normLength) break;
    seen++;
  }
  if (from === null) from = chars.length;
  // Include any trailing marks that belong to the last matched letter --
  // cutting them off would render a bare letter next to its own vowel sign.
  while (i < chars.length && isDropped(lang, chars[i])) i++;
  // ...and the same backwards, or a word whose first letter is a dropped
  // alef gets highlighted from its SECOND letter, leaving a stray character
  // outside the highlight.
  while (from > 0 && isDropped(lang, chars[from - 1])) from--;
  // Character offsets, not code-unit offsets: the caller slices with [...str].
  return { from, to: i };
}

const unpackSurah = (ref) => Math.floor(ref / 1000);
const unpackAyah = (ref) => ref % 1000;

// Normalised copies are built once per language and kept for the session --
// re-normalising 6,236 ayahs on every keystroke would be the one slow thing
// in an otherwise instant search.
const normalizedCache = new Map(); // lang -> string[]

/**
 * Search one language's whole index.
 *
 * Returns { lang, total, results, truncated }. `results` is capped at `limit`
 * because a common word ("Allah", "আল্লাহ") legitimately matches thousands of
 * ayahs, and a list that long is slower to render than the search itself is
 * to run -- `total` still reports the real number so the screen can say so.
 */
export async function searchQuran(query, { limit = 50 } = {}) {
  const raw = String(query ?? "").trim().replace(/\s+/g, " ");
  const lang = searchLangFor(raw);
  if (!raw) return { lang, total: 0, results: [], truncated: false, query: raw };

  const index = await getSearchIndex(lang);
  if (!normalizedCache.has(lang)) {
    normalizedCache.set(lang, index.texts.map((s) => normalize(lang, s)));
  }
  const haystacks = normalizedCache.get(lang);
  const needle = normalize(lang, raw);
  if (!needle) return { lang, total: 0, results: [], truncated: false, query: raw };

  const results = [];
  let total = 0;
  for (let i = 0; i < haystacks.length; i++) {
    const at = haystacks[i].indexOf(needle);
    if (at < 0) continue;
    total++;
    if (results.length >= limit) continue;
    const text = index.texts[i];
    const span = originalRange(lang, text, at, needle.length);
    const chars = [...text];
    results.push({
      surah: unpackSurah(index.refs[i]),
      ayah: unpackAyah(index.refs[i]),
      text,
      before: chars.slice(0, span.from).join(""),
      match: chars.slice(span.from, span.to).join(""),
      after: chars.slice(span.to).join(""),
    });
  }
  return { lang, total, results, truncated: total > results.length, query: raw };
}
