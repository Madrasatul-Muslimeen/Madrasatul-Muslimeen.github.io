// The Owner, 15 Nov 2026 (QR Lead): the way a Quran bookmark is captioned. Three examples, then "enable these ways of writing":
//   a range  "Al-Hadid - 57:1-6 - 12.Oct.26"
//   a page   "Al-Baqarah - 2:1-5 - Page 2 - 24.Oct.26"
//   a surah  "At-Taghaabun - 64:1-4 - 15.Nov.26"
// Pure: it takes names and numbers and returns a string (the page does the lookups), so a check can pin every shape.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 12.Oct.26 : two-digit day, three-letter month, two-digit year, the reader's own calendar day. */
export function captionDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}.${MONTHS[d.getMonth()]}.${String(d.getFullYear() % 100).padStart(2, "0")}`;
}

/** "<Surah name> - <surah>:<from>[-<to>] [- <extra>] - <date>". `extra` is "Page 2", "Ruku' 3" ... (optional). */
export function bookmarkCaption({ name, surah, from, to = from, extra = "", date = new Date() }) {
  const span = String(from) === String(to) ? `${from}` : `${from}-${to}`;
  return [name || `Surah ${surah}`, `${surah}:${span}`, extra, captionDate(date)].filter(Boolean).join(" - ");
}

/** The caption for a resolved unit (resolveUnitInfo's output): the span is the part inside the FIRST surah it touches
    (a page that runs into the next surah is captioned by the surah it starts in). `extra` names a page or rukūʿ. */
export function captionForUnit(info, { nameOf, ayahCountOf, extra = "", date = new Date() } = {}) {
  if (!info || !Number.isFinite(info.fromSurah) || !Number.isFinite(info.fromAyah)) return null;
  const surah = info.fromSurah;
  const to = info.toSurah === surah ? info.toAyah : (ayahCountOf?.(surah) ?? info.fromAyah);
  return bookmarkCaption({ name: nameOf?.(surah), surah, from: info.fromAyah, to, extra, date });
}

/** The Owner, 17 Nov 2026 ("how it was skipped?"): every SAVED Quran bookmark is SHOWN by this caption in the Bookmarks list, old ones
    included, from its own unit key and the day it was made (createdAt). Display only: the stored name is never changed (keep1116).
    `tables` = { surahIndex, pageRows } (the same shapes resolveUnitInfo takes). Returns null when the unit cannot be resolved
    (the list then keeps the stored name). `resolve` is resolveUnitInfo, handed in so this file stays pure. */
export function savedBookmarkCaption(b, tables, resolve) {
  if (!b || b.moduleId !== "quranrevival" || typeof b.position !== "string") return null;
  const info = resolve(b.position, tables);
  if (!info) return null;
  const nameOf = (n) => tables.surahIndex?.find((s) => s.surahNumber === n)?.nameEnglish;
  const ayahCountOf = (n) => tables.surahIndex?.find((s) => s.surahNumber === n)?.ayahCount;
  const extra = info.unitType === "page" ? `Page ${b.position.split(":").pop()}` : info.unitType === "ruku" ? `Ruku' ${b.position.split(":").pop()}` : "";
  const when = b.createdAt ? new Date(b.createdAt) : null;
  if (!when || Number.isNaN(when.getTime())) return null;
  return captionForUnit(info, { nameOf, ayahCountOf, extra, date: when });
}
