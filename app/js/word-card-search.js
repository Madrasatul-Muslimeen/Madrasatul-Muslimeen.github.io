// Word card rebuild, round 6 (decision 59) -- the Search row's matching, pure.
//
// Takes the word-forms index (quran-word-features.js: loadWordFormsIndex) and
// a typed query; returns what to show. No DOM, no fetch: the page loads the
// index (only when the reader presses Search, I9) and renders the result.
//
// Decided in this order: a place s:a:w; Arabic letters; anything else is a
// meaning in the reader's language, falling back to the other language.

export const SEARCH_RESULT_LIMIT = 30;

// Arabic marks (harakat, shadda, sukun, dagger alif, Quranic annotation marks)
// and the tatweel are optional in a search; alif wasla reads as a plain alif.
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const HAS_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/;
const ARABIC_LETTER = /[ء-يٱ-ۓ]/;

export function stripArabic(text) {
  return String(text).replace(MARKS, "").replace(/ٱ/g, "ا");
}

/** Bangla and Arabic-Indic digits to ASCII, so "২:৩০:২৮" reads as a place. */
export function asciiDigits(text) {
  return String(text)
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09E6))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

/** { surah, ayah, position } for a typed "s:a:w", or null if it is not one. */
export function parsePlace(query) {
  const m = /^(\d{1,3})\s*:\s*(\d{1,3})\s*:\s*(\d{1,3})$/.exec(asciiDigits(String(query).trim()));
  return m ? { surah: Number(m[1]), ayah: Number(m[2]), position: Number(m[3]) } : null;
}

export const placeId = (surah, ayah, position) => surah * 1000000 + ayah * 1000 + position;
export function placeFromId(id) {
  return { surah: Math.floor(id / 1000000), ayah: Math.floor(id / 1000) % 1000, position: id % 1000 };
}

/** The form whose occurrence list holds `id`, for opening a typed place. */
export function formHoldingPlace(forms, id) {
  return forms.find((row) => row[4].includes(id)) ?? null;
}

function rank(rows) {
  return rows.slice().sort((a, b) => b[4].length - a[4].length);
}

/**
 * -> { kind: "place"|"forms"|"none", place?, forms?, total? }
 * `forms` is index rows, at most SEARCH_RESULT_LIMIT, most frequent first;
 * `total` is how many matched before that cut.
 */
export function searchWordForms(index, query, lang = "en") {
  const q = String(query ?? "").trim();
  if (!q) return { kind: "none" };
  const rows = index.forms;
  const place = parsePlace(q);
  if (place) {
    const id = placeId(place.surah, place.ayah, place.position);
    return formHoldingPlace(rows, id) ? { kind: "place", place, id } : { kind: "none", unknownPlace: place };
  }
  let matches;
  if (ARABIC_LETTER.test(q)) {
    const want = stripArabic(q);
    matches = rows.filter((r) => stripArabic(r[0]) === want);
    // Typed marks mean the reader meant that exact form: it goes first.
    if (HAS_MARKS.test(q)) {
      const exact = matches.filter((r) => r[0] === q);
      matches = [...rank(exact), ...rank(matches.filter((r) => r[0] !== q))];
      return finish(matches, true);
    }
  } else {
    const needle = q.toLowerCase();
    const at = lang === "bn" ? 3 : 2;
    const other = lang === "bn" ? 2 : 3;
    const by = (i) => rows.filter((r) => r[i].toLowerCase().includes(needle));
    matches = by(at);
    if (!matches.length) matches = by(other);
  }
  return finish(matches, false);
}

function finish(matches, ordered) {
  if (!matches.length) return { kind: "none" };
  const list = ordered ? matches : rank(matches);
  return { kind: "forms", forms: list.slice(0, SEARCH_RESULT_LIMIT), total: list.length };
}
