/**
 * Hadith word tokeniser and root lookup (Keys to Understanding, K1, PCF MSA J03).
 *
 * ONE tokeniser serves the Hadith Word Card and the word marks (K0's `hadithword:<collection>:<n>:<pos>` key), so a
 * word's position can never mean two things. A WORD is a run of Arabic letters; position counts from 1 over the words of
 * the hadith's Arabic text (hadithArabicText), in reading order. Pure: no DOM, no network, nothing imported.
 */
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const WORD = /[ء-غف-يٱ-ۓـً-ٰٟۖ-ۭ]+/g;

/** Letters only, marks removed, alef and yaa variants folded, so the text matches the Qur'an form index. */
export function normaliseArabic(s) {
  return String(s ?? "").replace(MARKS, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي");
}

/** [{ pos (from 1), written (as in the text), norm }] for every Arabic word in `text`. */
export function tokeniseHadith(text) {
  const out = [];
  for (const m of String(text ?? "").matchAll(WORD)) {
    const norm = normaliseArabic(m[0]);
    if (norm) out.push({ pos: out.length + 1, written: m[0], norm });
  }
  return out;
}

const CLITICS = ["و", "ف", "ب", "ل", "ك", "ال"];
/** Candidate stems of a normalised word: itself, then with up to two leading clitics (و ف ب ل ك ال) removed. */
export function stemCandidates(norm) {
  const seen = [norm];
  let frontier = [norm];
  for (let round = 0; round < 2; round++) {
    const next = [];
    for (const f of frontier) for (const c of CLITICS) {
      if (f.startsWith(c) && f.length - c.length >= 2) { const s = f.slice(c.length); if (!seen.includes(s)) { seen.push(s); next.push(s); } }
    }
    frontier = next;
  }
  return seen;
}

/**
 * Looks a hadith word up in the Qur'an form index (`values`: normalised form -> "root|surah:ayah:position").
 * Returns { root, ref, via } for the FIRST candidate stem the index holds (exact form first), or null. A form the
 * Qur'an uses under more than one root is not in the index at all (the build leaves it out), so an ambiguous word is
 * never matched by guess: it opens the Hadith Word Card instead.
 */
export function quranRootOf(values, norm) {
  for (const cand of stemCandidates(norm)) {
    const v = values[cand];
    if (v) { const [root, ref] = v.split("|"); return { root, ref, via: cand === norm ? "exact" : "stem" }; }
  }
  return null;
}
