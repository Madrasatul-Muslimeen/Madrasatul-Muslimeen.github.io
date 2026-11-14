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
/** Stage 1 of the Owner's J119 answers (11 Nov 2026): a word can be in MORE THAN ONE kind, so the saved shape gains a `kinds` map.
 *  It is stored under a NEW key. v1 is only ever READ (a device that has only v1 shows exactly the words it showed before)
 *  and is never rewritten or removed, so going back to an older build loses nothing. */
export const BANGLA_STORAGE_KEY_V2 = "mm_bangla_words.v2";
/** The kinds, in the Owner's order: Names in Bangla, known by Rituals, used in Bangla. A word carries one or more. */
export const BANGLA_KINDS = Object.freeze(["names", "rituals", "bangla"]);
export const BANGLA_CONTRACT = "quran-bangla-words:v1";
export const LIST_ADMIN = "admin";
export const LIST_MINE = "mine";
export const BANGLA_LISTS = Object.freeze([LIST_ADMIN, LIST_MINE]);
/** The three Wheel displays the Owner wanted all available at once (n119c): each is on or off. */
export const BANGLA_WHEEL_DISPLAYS = Object.freeze(["ring", "centre", "tenth"]);

export function emptyBanglaState() {
  return { list: LIST_ADMIN, on: true, admin: [], mine: [], kinds: { admin: {}, mine: {} }, wheel: { ring: true, centre: true, tenth: false } };
}

/** A kinds value read from anywhere becomes the known kinds only, in the Owner's order, no repeats; a word with none is "bangla". */
const cleanKinds = (v) => {
  const set = new Set((Array.isArray(v) ? v : []).filter((k) => BANGLA_KINDS.includes(k)));
  const out = BANGLA_KINDS.filter((k) => set.has(k));
  return out.length ? out : ["bangla"];
};
/** { lemma: [kinds] } for the lemmas of `ids` only: a lemma listed without kinds (every v1 word) is "bangla", so nothing changes for it. */
const cleanKindMap = (ids, map) => {
  const m = map && typeof map === "object" ? map : {};
  const out = {};
  for (const id of ids) out[id] = cleanKinds(m[id]);
  return out;
};

const cleanIds = (v) => [...new Set((Array.isArray(v) ? v : []).filter((x) => typeof x === "string" && x.length > 0 && x.length <= 40))].sort();

/** Anything read back from storage becomes a well-formed state, or the empty one; it never throws. */
export function normaliseBanglaState(raw) {
  const base = emptyBanglaState();
  if (!raw || typeof raw !== "object") return base;
  const w = raw.wheel && typeof raw.wheel === "object" ? raw.wheel : {};
  const admin = cleanIds(raw.admin), mine = cleanIds(raw.mine);
  return {
    list: raw.list === LIST_MINE ? LIST_MINE : LIST_ADMIN,
    on: raw.on !== false,
    admin,
    mine,
    kinds: { admin: cleanKindMap(admin, raw.kinds?.admin), mine: cleanKindMap(mine, raw.kinds?.mine) },
    wheel: { ring: w.ring !== false, centre: w.centre !== false, tenth: w.tenth === true },
  };
}

/** v2 when this device has it, else v1 read through the same normaliser (every v1 word becomes kind "bangla"), else empty. Never throws. */
export function loadBanglaState(storage = globalThis.localStorage) {
  const read = (key) => { try { return JSON.parse(storage.getItem(key)); } catch { return null; } };
  const v2 = read(BANGLA_STORAGE_KEY_V2);
  if (v2 && typeof v2 === "object") return normaliseBanglaState(v2);
  return normaliseBanglaState(read(BANGLA_STORAGE_KEY));
}
/** Writes v2 only. The v1 entry is left exactly as it was. */
export function saveBanglaState(state, storage = globalThis.localStorage) {
  try { storage.setItem(BANGLA_STORAGE_KEY_V2, JSON.stringify(normaliseBanglaState(state))); return true; } catch { return false; }
}

/** The kinds one word carries in a list (default: the viewed list); [] when the word is not in it. */
export function banglaKindsOf(state, lemma, list) {
  const s = normaliseBanglaState(state);
  return s.kinds[list ?? s.list]?.[lemma] ? [...s.kinds[list ?? s.list][lemma]] : [];
}

/** The lemma ids in force that carry `kind` (all of them when `kind` is omitted). Empty while the list is switched off. */
export function banglaWordsOfKind(state, kind) {
  const s = normaliseBanglaState(state);
  if (!s.on) return [];
  return s[s.list].filter((id) => !kind || s.kinds[s.list][id].includes(kind));
}

/** A NEW state with the word's kinds set (the word is added if it was not there; an empty `kinds` array removes it).
 *  Refuses a list the reader cannot edit, exactly like setBanglaWord. */
export function setBanglaWordKinds(state, lemma, kinds, { list, canAdmin = false } = {}) {
  const s = normaliseBanglaState(state);
  const target = list ?? s.list;
  if (!BANGLA_LISTS.includes(target) || !canEditList(target, canAdmin) || typeof lemma !== "string" || !lemma) return s;
  const wanted = (Array.isArray(kinds) ? kinds : []).filter((k) => BANGLA_KINDS.includes(k));
  const ids = new Set(s[target]);
  const map = { ...s.kinds[target] };
  if (!wanted.length) { ids.delete(lemma); delete map[lemma]; } else { ids.add(lemma); map[lemma] = cleanKinds(wanted); }
  return { ...s, [target]: cleanIds([...ids]), kinds: { ...s.kinds, [target]: map } };
}

/** The Owner, 13 Nov 2026 ("Quranic/ Arabic word in Bangla Language:"): a tap on one of the three kind chips. A word may carry one kind or all
 *  three, so a tap switches THAT kind on or off and leaves the others; switching the last one off takes the word out of the list. A word that
 *  was in the list with no kind of its own (every v1 word) already carries "bangla" ("In Daily Use"), so it shows that chip pressed. */
export function toggleBanglaKind(state, lemma, kind, { list, canAdmin = false } = {}) {
  const s = normaliseBanglaState(state);
  if (!BANGLA_KINDS.includes(kind)) return s;
  const current = banglaKindsOf(s, lemma, list);
  const next = current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind];
  return setBanglaWordKinds(s, lemma, next, { list, canAdmin });
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
  const map = { ...s.kinds[target] };
  if (on) map[lemma] = map[lemma] ?? ["bangla"]; else delete map[lemma];
  return { ...s, [target]: cleanIds([...set]), kinds: { ...s.kinds, [target]: map } };
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

/** Switch ONE of the three Wheel displays (ring, centre, tenth) on or off; anything else is refused unchanged. */
export function setBanglaWheel(state, key, on) {
  if (!["ring", "centre", "tenth"].includes(key)) return state;
  return { ...state, wheel: { ...state.wheel, [key]: on === true } };
}

/**
 * What the Vocabulary Wheel draws for the Bangla words (J119, n119c = F, G, H: all three, each on or off).
 * Nothing at all while the whole list is off or empty. `ring` is the thin outer ring's ratio (0..1), `centre` the share
 * as a number for the centre line, `tenth` the extra part. Pure: the page makes the picture.
 */
export function banglaWheelPlan(state, figures) {
  const none = { ring: null, centre: null, tenth: null };
  if (!state || !state.on || !figures || !(figures.words > 0)) return none;
  const w = state.wheel ?? {};
  const ratio = Math.max(0, Math.min(1, figures.share / 100));
  return {
    ring: w.ring ? { ratio } : null,
    centre: w.centre ? figures.share : null,
    tenth: w.tenth ? { words: figures.words, occurrences: figures.occurrences, share: figures.share } : null,
  };
}
