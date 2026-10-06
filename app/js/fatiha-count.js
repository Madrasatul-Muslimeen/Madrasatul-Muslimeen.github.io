// Al-Fātiḥah display count (issue #482, Owner decisions 2 Oct 2026).
//
// DISPLAY ONLY. Every stored identity stays the standard Madani (Kufan)
// count: buildUnitKey.ayah(1, n), quran-word-occurrence:v1:1:a:p, records,
// notes, bookmarks, the surah data files, the audio and Firestore. This module
// is a mapping IN FRONT of those keys and writes nothing. It imports nothing.
//
// When the reader's setting is ON, for surah 1 only:
//   internal 1:1                -> no number (the Bismillah, unnumbered)
//   internal 1:2 .. 1:6         -> displayed 1 .. 5
//   internal 1:7, words 1-4     -> displayed 6
//   internal 1:7, words 5-9     -> displayed 7   (غَيْرِ starts it)
// Every other surah, and surah 1 with the setting off, is the identity.

export const FATIHA_SURAH = 1;
export const FATIHA_SPLIT_AYAH = 7;
/** Internal 1:7 words 1..SPLIT_AFTER_WORD are displayed ayah 6. */
export const FATIHA_SPLIT_AFTER_WORD = 4;
export const FATIHA_DISPLAY_TOTAL = 7;

/** The Owner-approved translation halves of internal 1:7, verbatim. */
export const FATIHA_7_TRANSLATION_HALVES = Object.freeze({
  en: Object.freeze([
    "The path of those upon whom You have bestowed favor,",
    "not of those who have evoked [Your] anger or of those who are astray.",
  ]),
  bn: Object.freeze([
    "সে সমস্ত লোকের পথ, যাদেরকে তুমি নেয়ামত দান করেছ।",
    "তাদের পথ নয়, যাদের প্রতি তোমার গজব নাযিল হয়েছে এবং যারা পথভ্রষ্ট হয়েছে।",
  ]),
});

const DASH = "–";

export function fatihaCountApplies(surah, on) {
  return !!on && Number(surah) === FATIHA_SURAH;
}

/**
 * How an INTERNAL ayah is shown.
 * { kind: "identity" | "bismillah" | "single" | "span", number, from, to }
 * `number` is null for the Bismillah; a span (internal 1:7) has from=6,to=7.
 */
export function displayForInternalAyah(surah, ayah, on) {
  const a = Number(ayah);
  if (!fatihaCountApplies(surah, on)) return { kind: "identity", number: a, from: a, to: a };
  if (a === 1) return { kind: "bismillah", number: null, from: null, to: null };
  if (a === FATIHA_SPLIT_AYAH) return { kind: "span", number: null, from: 6, to: 7 };
  return { kind: "single", number: a - 1, from: a - 1, to: a - 1 };
}

/** The label of an internal ayah: "Bismillah", "3", "6–7". `bismillah` is the
    caller's own (translated) word. */
export function displayAyahLabel(surah, ayah, on, bismillah = "Bismillah") {
  const d = displayForInternalAyah(surah, ayah, on);
  if (d.kind === "bismillah") return bismillah;
  if (d.kind === "span") return `${d.from}${DASH}${d.to}`;
  return String(d.number);
}

/** "1:6–7", "1:3", or `bismillah` for internal 1:1. */
export function displayAyahRef(surah, ayah, on, bismillah = "Bismillah") {
  const d = displayForInternalAyah(surah, ayah, on);
  if (d.kind === "bismillah") return bismillah;
  return `${surah}:${displayAyahLabel(surah, ayah, on)}`;
}

/** The reference shown for one WORD: internal 1:7:p (p<=4) -> "1:6:p",
    1:7:p (p>=5) -> "1:7:(p-4)", internal 1:1:* -> `bismillah`. */
export function displayWordRef(surah, ayah, position, on, bismillah = "Bismillah") {
  const a = Number(ayah);
  const p = Number(position);
  if (!fatihaCountApplies(surah, on)) return `${surah}:${a}:${p}`;
  if (a === 1) return bismillah;
  if (a === FATIHA_SPLIT_AYAH) {
    return p <= FATIHA_SPLIT_AFTER_WORD ? `${surah}:6:${p}` : `${surah}:7:${p - FATIHA_SPLIT_AFTER_WORD}`;
  }
  return `${surah}:${a - 1}:${p}`;
}

/** DISPLAYED ayah number -> INTERNAL ayah (for Go to, typed references,
    pickers). { ayah, half } where half is null, "a" (displayed 6) or "b"
    (displayed 7). null if n is outside 1..7. With the setting off: identity. */
export function internalForDisplayedAyah(surah, n, on) {
  const d = Number(n);
  if (!fatihaCountApplies(surah, on)) return { ayah: d, half: null };
  if (!Number.isInteger(d) || d < 1 || d > FATIHA_DISPLAY_TOTAL) return null;
  if (d <= 5) return { ayah: d + 1, half: null };
  return { ayah: FATIHA_SPLIT_AYAH, half: d === 6 ? "a" : "b" };
}

/** The ayah count a reader is told: 7 either way for surah 1. */
export function displayAyahCount(surah, internalCount) {
  return Number(surah) === FATIHA_SURAH ? FATIHA_DISPLAY_TOTAL : internalCount;
}

/**
 * "Āyāt achieved of 7"-style totals. `counts(internalAyah, recordAyah)`
 * returns whatever the caller counts with (a truthy "counts" flag). Returns
 * { count, total }. Internal 1:1 is excluded; internal 1:7 is TWO records
 * (decisions 76-77): displayed 6 is record 7 and displayed 7 is record 8
 * (FATIHA_SEVEN_RECORD_AYAH), each counted on its own.
 * With the setting off (or another surah) every internal ayah counts once
 * (the caller reads internal 1:7 as the weaker of its two records).
 */
export function displayCount(surah, internalCount, on, counts) {
  let count = 0;
  if (!fatihaCountApplies(surah, on)) {
    for (let a = 1; a <= internalCount; a++) if (counts(a, a)) count++;
    return { count, total: internalCount };
  }
  for (let a = 2; a <= 6; a++) if (counts(a, a)) count++;
  if (counts(FATIHA_SPLIT_AYAH, FATIHA_SPLIT_AYAH)) count++;
  if (counts(FATIHA_SPLIT_AYAH, FATIHA_SEVEN_RECORD_AYAH)) count++;
  return { count, total: FATIHA_DISPLAY_TOTAL };
}

// -- progress RECORD keys (decisions 76-77) ----------------------------------
// Content (text, words, audio, Mushaf) stays internal 1:7. Only the RECORD key
// of displayed Ayah 7 differs: `ayah:1:8`, a spare storage key that is never
// shown (it fits the activity-evidence Rules regex ayah:[0-9]{1,3}:[0-9]{1,3}).
// `ayah:1:7` stays the record of displayed 6.

export const FATIHA_SEVEN_RECORD_AYAH = 8;

/** Status ids worst to best, as a plain list so this module still imports
    nothing (a check binds it to approach-coverage's RAMP_ORDER). */
export const FATIHA_RAMP = Object.freeze(["not_started", "learning", "practising", "achieved", "mastered"]);

/** The ayah NUMBER of the progress record for an internal ayah. With the count
    on, displayed 7 (internal 1:7, half "b") is record 8. Otherwise identity. */
export function recordAyahFor(surah, internalAyah, half, on) {
  const a = Number(internalAyah);
  if (fatihaCountApplies(surah, on) && a === FATIHA_SPLIT_AYAH && half === "b") return FATIHA_SEVEN_RECORD_AYAH;
  return a;
}

/** The record ayah numbers a CLAIM on an internal ayah writes. One, except
    with the count OFF where stored 1:7 is one Ayah and a claim writes both. */
export function recordAyahsToWrite(surah, internalAyah, half, on) {
  const a = Number(internalAyah);
  if (Number(surah) === FATIHA_SURAH && a === FATIHA_SPLIT_AYAH && !on) return [FATIHA_SPLIT_AYAH, FATIHA_SEVEN_RECORD_AYAH];
  return [recordAyahFor(surah, a, half, on)];
}

/** Record ayah -> the INTERNAL (content) ayah it belongs to: 8 -> 7 in surah 1. */
export function internalAyahOfRecord(surah, recordAyah) {
  const a = Number(recordAyah);
  return Number(surah) === FATIHA_SURAH && a === FATIHA_SEVEN_RECORD_AYAH ? FATIHA_SPLIT_AYAH : a;
}

/** The records a roll-up walks for surah 1, as { record, internal }.
    On: Bismillah excluded, 2..6, then 7 (displayed 6) and 8 (displayed 7).
    Off: 1..internalCount, one each (record 7 reads as the weaker of its two keys). */
export function fatihaRollupRecords(on, internalCount = 7) {
  const out = [];
  if (on) {
    for (let a = 2; a <= 6; a++) out.push({ record: a, internal: a });
    out.push({ record: FATIHA_SPLIT_AYAH, internal: FATIHA_SPLIT_AYAH });
    out.push({ record: FATIHA_SEVEN_RECORD_AYAH, internal: FATIHA_SPLIT_AYAH });
  } else {
    for (let a = 1; a <= internalCount; a++) out.push({ record: a, internal: a });
  }
  return out;
}

function weakerStatus(a, b) {
  if (a === undefined) return b;
  if (b === undefined) return a;
  if (a === "not_applicable") return b;
  if (b === "not_applicable") return a;
  return FATIHA_RAMP.indexOf(a) <= FATIHA_RAMP.indexOf(b) ? a : b;
}

/**
 * The status of one RECORD ayah of surah 1 for one trackable.
 * `raw(ayah)` returns the stored claimedStatus of record `ayah:1:<ayah>` or
 * undefined when that entry does not exist. Returns undefined when nothing is
 * stored (the caller's default applies).
 *   record 8      -> its own entry, else the old shared ayah:1:7 mark (decision 77)
 *   record 7, on  -> its own entry only
 *   record 7, off -> the weaker of the two (stored 1:7 is one Ayah)
 * Any other surah / ayah: its own entry.
 */
export function recordStatusOf(surah, recordAyah, on, raw) {
  const a = Number(recordAyah);
  if (Number(surah) !== FATIHA_SURAH) return raw(a);
  if (a === FATIHA_SEVEN_RECORD_AYAH) return raw(FATIHA_SEVEN_RECORD_AYAH) ?? raw(FATIHA_SPLIT_AYAH);
  if (a === FATIHA_SPLIT_AYAH && !on) return weakerStatus(raw(FATIHA_SPLIT_AYAH), raw(FATIHA_SEVEN_RECORD_AYAH) ?? raw(FATIHA_SPLIT_AYAH));
  return raw(a);
}

/** Whether a first claim must first copy the old ayah:1:7 entries to ayah:1:8
    (decision 77): the chunk holds ayah:1:7:: entries and no ayah:1:8:: entry.
    `keys` = the keys of the loaded chunk's entries. */
export function needsFatihaCopy(surah, recordAyah, keys) {
  if (Number(surah) !== FATIHA_SURAH) return false;
  const a = Number(recordAyah);
  if (a !== FATIHA_SPLIT_AYAH && a !== FATIHA_SEVEN_RECORD_AYAH) return false;
  const list = [...keys];
  return list.some((k) => k.startsWith("ayah:1:7::")) && !list.some((k) => k.startsWith("ayah:1:8::"));
}

// -- reading-view expansion -------------------------------------------------

/** Split markup on spaces that are NOT inside a <tag ...>. */
function splitTajweedTopLevel(raw) {
  const parts = [];
  let cur = "";
  let inTag = false;
  for (const ch of raw) {
    if (ch === "<") inTag = true;
    if (ch === ">") inTag = false;
    if (ch === " " && !inTag) { parts.push(cur); cur = ""; } else cur += ch;
  }
  parts.push(cur);
  return parts.filter((p) => p !== "");
}

const TAJWEED_END_RE = /<span class=end>[^<]*<\/span>/;
const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
function arabicIndic(n) {
  return String(n).replace(/\d/g, (d) => ARABIC_INDIC[d]);
}

/** Tajweed markup with its trailing end-marker number replaced (or dropped
    when `number` is null). */
function withEndNumber(raw, number) {
  if (!raw) return raw;
  const stripped = raw.replace(/\s*<span class=end>[^<]*<\/span>\s*$/, "");
  return number == null ? stripped : `${stripped} <span class=end>${arabicIndic(number)}</span>`;
}

/**
 * The ayahs of surah 1 as the READER counts them, for the Read and Note views.
 * Each entry is a copy of the stored ayah carrying display fields:
 *   ayah           internal (unchanged: it is what occurrence ids use)
 *   displayAyah    the number to print, or null for no badge (Bismillah)
 *   words          for the two halves of 1:7, the stored word objects whose
 *                  `position` is UNCHANGED (word identity is internal)
 *   half           "a" | "b" for the halves of 1:7, else undefined
 * Any other surah, or the setting off, returns `ayahs` untouched.
 */
export function expandAyahsForDisplay(surah, ayahs, on) {
  if (!fatihaCountApplies(surah, on)) return ayahs;
  const out = [];
  for (const a of ayahs) {
    if (a.ayah === 1) {
      out.push({ ...a, displayAyah: null, tajweedText: withEndNumber(a.tajweedText, null) });
    } else if (a.ayah === FATIHA_SPLIT_AYAH) {
      out.push(...splitSeventh(a));
    } else {
      out.push({ ...a, displayAyah: a.ayah - 1, tajweedText: withEndNumber(a.tajweedText, a.ayah - 1) });
    }
  }
  return out;
}

function splitSeventh(a) {
  const words = a.words ?? [];
  const wordsA = words.filter((w) => w.position <= FATIHA_SPLIT_AFTER_WORD);
  const wordsB = words.filter((w) => w.position > FATIHA_SPLIT_AFTER_WORD);
  const plain = String(a.uthmaniText ?? "").trim().split(/ +/).filter(Boolean);
  const plainA = plain.slice(0, FATIHA_SPLIT_AFTER_WORD).join(" ");
  const plainB = plain.slice(FATIHA_SPLIT_AFTER_WORD).join(" ");
  let tajA = a.tajweedText;
  let tajB = a.tajweedText;
  if (a.tajweedText) {
    const parts = splitTajweedTopLevel(a.tajweedText.replace(TAJWEED_END_RE, "").trim());
    tajA = `${parts.slice(0, FATIHA_SPLIT_AFTER_WORD).join(" ")} <span class=end>${arabicIndic(6)}</span>`;
    tajB = `${parts.slice(FATIHA_SPLIT_AFTER_WORD).join(" ")} <span class=end>${arabicIndic(7)}</span>`;
  }
  const tr = (lang, i) => (a.translations?.[lang] ? FATIHA_7_TRANSLATION_HALVES[lang]?.[i] ?? a.translations[lang] : a.translations?.[lang]);
  const translationsFor = (i) => ({ ...a.translations, en: tr("en", i), bn: tr("bn", i) });
  return [
    { ...a, half: "a", displayAyah: 6, words: wordsA, uthmaniText: plainA, tajweedText: tajA, translations: translationsFor(0) },
    { ...a, half: "b", displayAyah: 7, words: wordsB, uthmaniText: plainB, tajweedText: tajB, translations: translationsFor(1) },
  ];
}

/** The number a badge prints for an (possibly expanded) ayah object. */
export function badgeNumber(ayah) {
  return "displayAyah" in ayah ? ayah.displayAyah : ayah.ayah;
}
