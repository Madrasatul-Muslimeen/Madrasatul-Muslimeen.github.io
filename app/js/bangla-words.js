// PCF MSA J119 (QR Lead, 8 Nov 2026) -- "Words the Qur'an shares with Bangla".
//
// The Owner (7 Nov): "a word used in Bangla with the same meanings, 100s of them. I want a button in the Word Card to
// mark that, count them (number and percentage), display in the Wheel." Demo v03 (the Owner's n119e = K, 8 Nov).
//
// PURE: no Firestore, no DOM. A word is the lemma id that learn-next.json calls `l`, so a mark reaches every form of the
// word (the meaning travels with the mark: khalā "passed away" is not the Bangla "খালি", which is why a reader chooses).
// Two lists: the ADMIN's list (the same for everyone) and the reader's OWN list. Until the Owner publishes the new saving
// Rules (docs/proposals/bangla-words-rules.candidate.rules, a CANDIDATE, firestore.rules is untouched), both lists live
// on THIS DEVICE only (localStorage), and the page says so. Nothing here is wired to Firestore.

export const BANGLA_STORAGE_KEY = "mm_bangla_words.v1";
export const BANGLA_CONTRACT = "quran-bangla-words:v1";
export const LIST_ADMIN = "admin";
export const LIST_MINE = "mine";
export const BANGLA_LISTS = Object.freeze([LIST_ADMIN, LIST_MINE]);
/** The three Wheel displays the Owner wanted all available at once (n119c): each is on or off. */
export const BANGLA_WHEEL_DISPLAYS = Object.freeze(["ring", "centre", "tenth"]);

export function emptyBanglaState() {
  return { list: LIST_ADMIN, on: true, admin: [], mine: [], wheel: { ring: true, centre: true, tenth: false } };
}

const cleanIds = (v) => [...new Set((Array.isArray(v) ? v : []).filter((x) => typeof x === "string" && x.length > 0 && x.length <= 40))].sort();

/** Anything read back from storage becomes a well-formed state, or the empty one; it never throws. */
export function normaliseBanglaState(raw) {
  const base = emptyBanglaState();
  if (!raw || typeof raw !== "object") return base;
  const w = raw.wheel && typeof raw.wheel === "object" ? raw.wheel : {};
  return {
    list: raw.list === LIST_MINE ? LIST_MINE : LIST_ADMIN,
    on: raw.on !== false,
    admin: cleanIds(raw.admin),
    mine: cleanIds(raw.mine),
    wheel: { ring: w.ring !== false, centre: w.centre !== false, tenth: w.tenth === true },
  };
}

export function loadBanglaState(storage = globalThis.localStorage) {
  try { return normaliseBanglaState(JSON.parse(storage.getItem(BANGLA_STORAGE_KEY))); } catch { return emptyBanglaState(); }
}
export function saveBanglaState(state, storage = globalThis.localStorage) {
  try { storage.setItem(BANGLA_STORAGE_KEY, JSON.stringify(normaliseBanglaState(state))); return true; } catch { return false; }
}

/** May this reader change this list? Their own list: always. The admin's: only an admin (the page passes canAdmin). */
export function canEditList(list, canAdmin) {
  return list === LIST_MINE ? true : list === LIST_ADMIN ? canAdmin === true : false;
}

/** The set of lemma ids in force: empty when the whole Bangla word list is switched off (the heading-row switch). */
export function activeBanglaSet(state) {
  const s = normaliseBanglaState(state);
  return s.on ? new Set(s[s.list]) : new Set();
}

export function hasBanglaWord(state, lemma) { return activeBanglaSet(state).has(lemma); }

/** Returns a NEW state with `lemma` switched on or off in `list` (or the viewed list), refusing a list the reader cannot edit. */
export function setBanglaWord(state, lemma, on, { list, canAdmin = false } = {}) {
  const s = normaliseBanglaState(state);
  const target = list ?? s.list;
  if (!BANGLA_LISTS.includes(target) || !canEditList(target, canAdmin) || typeof lemma !== "string" || !lemma) return s;
  const set = new Set(s[target]);
  if (on) set.add(lemma); else set.delete(lemma);
  return { ...s, [target]: cleanIds([...set]) };
}

/**
 * The figures for the counter and the Wheel, from the vocabulary rows ({ l: lemma, n: occurrences }) and the app's own
 * `isKnown(row)`. A Bangla word counts as KNOWN (n119b = E) AND fills its own segment, with no word counted twice: a word
 * the reader already knew is in `known` once and is NOT added again to `knownWithBangla`; `bangla*` is the whole list.
 */
export function banglaFigures(rows, total, banglaSet, isKnown = () => false) {
  let words = 0, occurrences = 0, known = 0, knownOcc = 0, extraWords = 0, extraOcc = 0;
  for (const row of rows ?? []) {
    const n = Number(row?.n) || 0;
    const inB = banglaSet.has(row?.l);
    const was = isKnown(row) === true;
    if (inB) { words++; occurrences += n; }
    if (was) { known++; knownOcc += n; } else if (inB) { extraWords++; extraOcc += n; }
  }
  const pct = (x) => (total > 0 ? (100 * x) / total : 0);
  return {
    words, occurrences, share: pct(occurrences),
    knownBefore: known, knownBeforeShare: pct(knownOcc),
    addedWords: extraWords, addedOccurrences: extraOcc,
    knownWithBangla: known + extraWords, knownWithBanglaShare: pct(knownOcc + extraOcc),
  };
}

/** A known-test that also counts the Bangla words: the one place the badge, the Wheel and the Word Card all read. */
export function knownWithBanglaTest(isKnown, banglaSet) {
  return (row) => isKnown(row) === true || banglaSet.has(row?.l);
}

/** The text of the tag beside the marks when this word is in the list. */
export function banglaTagText(bn, lang = "en") {
  const word = String(bn ?? "").split(/[,،]/)[0].trim();
  return word ? (lang === "bn" ? `বাংলায়ও: ${word}` : `Also in Bangla: ${word}`) : (lang === "bn" ? "বাংলায়ও" : "Also in Bangla");
}
