// PCF MSA J52 -- Āyah posters (the Owner, 20 Oct 2026: "1-4: A, 5. B, 6. A print button in note prints the note.
// The same button in poster prints the Poster."). Two kinds:
//   study  -- for children, for the wall: every word in its own box with its meaning (English, Bangla or both) and,
//             if chosen, its transliteration;
//   dawah  -- the āyāt in Arabic with the translation (English, Bangla or both).
// One āyah or a range of one sūrah (2A). PURE: no DOM, no fetch. The page (ayah-poster.html) feeds it a sūrah file
// from quran-data.js and draws what it returns; ayah-poster-image.js draws the SAME model on a canvas (5B).

import { banglaTranslit } from "./quran-translit-bn.js";

/** The longest range one poster takes. A rukūʿ is at most ~40 āyāt; longer is not a poster. */
export const MAX_AYAHS = 40;
export const KINDS = Object.freeze(["study", "dawah"]);
export const LANGS = Object.freeze(["en", "bn", "both"]);
/** Paper sizes, portrait, in millimetres. */
export const PAPERS = Object.freeze({ a4: { w: 210, h: 297 }, a3: { w: 297, h: 420 } });

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const arabicNumber = (n) => String(n).replace(/\d/g, (d) => AR_DIGITS[d]);

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** A range kept inside the sūrah and at most MAX_AYAHS long (the start wins). */
export function clampRange(ayahCount, from, to) {
  const n = Math.max(1, Number(ayahCount) || 1);
  let a = Math.min(Math.max(1, Math.floor(Number(from) || 1)), n);
  let b = Math.min(Math.max(1, Math.floor(Number(to) || a)), n);
  if (b < a) [a, b] = [b, a];
  if (b - a + 1 > MAX_AYAHS) b = a + MAX_AYAHS - 1;
  return { from: a, to: b };
}

/** The āyāt of the rukūʿ that holds `ayah` (the pulled per-āyah `ruku` number), inside this sūrah. */
export function rukuRange(surah, ayah) {
  const list = surah?.ayahs ?? [];
  const here = list.find((a) => a.ayah === ayah);
  if (!here || here.ruku == null) return { from: ayah, to: ayah };
  const same = list.filter((a) => a.ruku === here.ruku).map((a) => a.ayah);
  return { from: Math.min(...same), to: Math.max(...same) };
}

/**
 * The poster's content: the sūrah's names and, for each āyah of the range, its two translations and its words
 * (Arabic, transliteration, English and Bangla meaning) exactly as the app's word-by-word data has them.
 */
export function posterModel(surah, from, to) {
  const { from: a, to: b } = clampRange(surah?.ayahCount ?? surah?.ayahs?.length, from, to);
  const ayahs = (surah?.ayahs ?? []).filter((x) => x.ayah >= a && x.ayah <= b).map((x) => ({
    n: x.ayah,
    en: x.translations?.en ?? "",
    bn: x.translations?.bn ?? "",
    words: (x.words ?? []).map((w) => ({ ar: w.arabic ?? "", tr: w.transliteration ?? "", trBn: banglaTranslit(w.arabic), en: w.translation?.en ?? "", bn: w.translation?.bn ?? "" })),
  }));
  return {
    surah: surah?.surahNumber ?? null,
    nameAr: surah?.surahNameArabic ?? "",
    nameEn: surah?.surahNameEnglish ?? "",
    nameMeaning: surah?.surahNameTranslation ?? "",
    from: a, to: b, ayahs,
  };
}

/** "112 : 1–4" or "2 : 255" -- the reference in Western digits, as the app prints it elsewhere. */
export function rangeRef(model, num = String) {
  return model.from === model.to ? `${num(model.surah)} : ${num(model.from)}` : `${num(model.surah)} : ${num(model.from)}–${num(model.to)}`;
}

/** The Arabic of the range as one line of text, each āyah closed by its number mark ﴿n﴾. */
export function dawahArabic(model) {
  return model.ayahs.map((a) => `${a.words.map((w) => w.ar).join(" ")} ﴿${arabicNumber(a.n)}﴾`).join(" ");
}
export function dawahTranslation(model, lang) {
  return model.ayahs.map((a) => (lang === "bn" ? a.bn : a.en)).filter(Boolean).join(" ");
}

/** The transliteration choices of the study poster (J58): Latin, Bangla, Both, Off. */
export const TRANSLITS = Object.freeze(["latin", "bn", "both", "off"]);
/** Old callers passed a boolean (true = the Latin line); a name from TRANSLITS is kept; anything else is Latin. */
export const translitMode = (v) => (v === false || v === 0 ? "off" : TRANSLITS.includes(v) ? v : "latin");

/** Which lines a study poster's word box carries: `tr` the Latin transliteration, `trBn` the Bangla one, then the meanings. */
export function studyLines(lang, translit) {
  const m = translitMode(translit);
  return { tr: m === "latin" || m === "both", trBn: m === "bn" || m === "both", en: lang !== "bn", bn: lang !== "en" };
}

/** PCF MSA J65 (the Owner, 21 Oct 2026: "Enable the poster with Arabic, Eng and Bangla options single and multiple to
 *  choose from over the words. Try to keep half of the page for Ayah and half for words"): the study poster can carry the
 *  whole āyah (range) above its word boxes, in any of these, one or several. */
export const TOP_LINES = Object.freeze(["ar", "en", "bn"]);
/** The āyah's share of the space under the heading, tried in order: half first ("try to keep half of the page for Ayah
 *  and half for words"), then less, only while the words would otherwise be printed below WORDS_K_MIN of full size. */
export const TOP_SHARES = Object.freeze([0.5, 0.45, 0.4, 0.35, 0.3]);
export const WORDS_K_MIN = 0.5;
/** The chosen top lines in TOP_LINES order: from an array, or from the address form "ar,en" ("0" or "" = none). */
export function topLines(v) {
  const list = Array.isArray(v) ? v : String(v ?? "").split(",");
  return TOP_LINES.filter((k) => list.includes(k));
}

/**
 * The study poster's HTML. `text` carries the page's own translated words (title line, footer); every size is a
 * multiple of `--k`, which the page lowers until the whole poster fits its sheet.
 */
export function renderStudyPosterHtml(model, { lang = "both", translit = "latin", top = [], text = {} } = {}) {
  const show = studyLines(lang, translit);
  const tl = topLines(top);
  // J65: with any top line chosen, the space under the heading is two equal halves, the āyah over the words; each half
  // has its own --k (the page fits each), and the heading keeps its full size.
  const topHtml = tl.length ? `<div class="ap-kid-top" data-ap-top-block>${tl.includes("ar") ? `<p class="ap-ar ap-top-ar" lang="ar" dir="rtl">${escapeHtml(dawahArabic(model))}</p>` : ""}${tl.includes("ar") && tl.length > 1 ? `<span class="ap-top-rule" aria-hidden="true"></span>` : ""}${tl.includes("en") ? `<p class="ap-top-en" lang="en">${escapeHtml(dawahTranslation(model, "en"))}</p>` : ""}${tl.includes("bn") ? `<p class="ap-top-bn" lang="bn">${escapeHtml(dawahTranslation(model, "bn"))}</p>` : ""}</div>` : "";
  const ayahs = model.ayahs.map((a) => `<div class="ap-kid-ayah">${a.words.map((w) => `<div class="ap-kid-word"><span class="ap-ar" lang="ar" dir="rtl">${escapeHtml(w.ar)}</span>${show.tr ? `<span class="ap-tr">${escapeHtml(w.tr)}</span>` : ""}${show.trBn && w.trBn ? `<span class="ap-tr ap-tr-bn" lang="bn">${escapeHtml(w.trBn)}</span>` : ""}${show.en ? `<span class="ap-m-en" lang="en">${escapeHtml(w.en)}</span>` : ""}${show.bn ? `<span class="ap-m-bn" lang="bn">${escapeHtml(w.bn)}</span>` : ""}</div>`).join("")}<span class="ap-kid-num" aria-label="${escapeHtml(text.ayahLabel ? text.ayahLabel(a.n) : `āyah ${a.n}`)}">${arabicNumber(a.n)}</span></div>`).join("");
  return `<div class="ap-poster ap-kid" data-poster-kind="study"${tl.length ? ` data-ap-top="${tl.join(",")}"` : ""}><div class="ap-kid-head"><span class="ap-ar ap-name" lang="ar" dir="rtl">${escapeHtml(model.nameAr)}</span><span class="ap-en-name">${escapeHtml(text.title ?? model.nameEn)}</span><span class="ap-ref">${escapeHtml(text.ref ?? rangeRef(model))}</span></div>${topHtml}<div class="ap-kid-ayahs">${ayahs}</div><div class="ap-kid-foot"><span>${escapeHtml(text.from ?? "Madrasatul Muslimeen")}</span><span>${escapeHtml(text.tip ?? "")}</span></div></div>`;
}

/** The Dawah poster's HTML: the reference, the Arabic, a gold rule, then the chosen translation(s). */
export function renderDawahPosterHtml(model, { lang = "both", text = {} } = {}) {
  const en = lang !== "bn" ? dawahTranslation(model, "en") : "";
  const bn = lang !== "en" ? dawahTranslation(model, "bn") : "";
  return `<div class="ap-poster ap-dawah" data-poster-kind="dawah"><span class="ap-ref">${escapeHtml(text.ref ?? rangeRef(model))}</span><p class="ap-ar" lang="ar" dir="rtl">${escapeHtml(dawahArabic(model))}</p><span class="ap-rule" aria-hidden="true"></span>${en ? `<p class="ap-t-en" lang="en">${escapeHtml(en)}</p>` : ""}${bn ? `<p class="ap-t-bn" lang="bn">${escapeHtml(bn)}</p>` : ""}<span class="ap-from">${escapeHtml(text.from ?? "")}</span></div>`;
}

/** A file name for the picture: "ayah-poster-study-112-1-4.png". */
export function posterFileName(model, kind) {
  return `ayah-poster-${kind}-${model.surah}-${model.from}${model.to !== model.from ? `-${model.to}` : ""}.png`;
}
