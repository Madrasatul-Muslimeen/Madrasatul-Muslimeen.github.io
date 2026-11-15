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
