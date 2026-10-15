// Owner, 9 Oct 2026 (demo docs/reference/2026-10-09-asma-cited-ayat-demo.html, "build it"): when a Name is open in
// Explore → Asma ul Husna, the āyāt it cites are written out in the empty space under its card, every word tappable
// for the Word card, each āyah with an Āyah card button. This file is pure: no Firebase, no DOM, no fetch (I2). The
// caller loads each āyah with quran-data.js's getAyah() and wires the buttons.
import { normalizeArabicForSearch } from "./quran-word-identity.js";

const bare = (s) => normalizeArabicForSearch(String(s ?? "")).replace(/^ال/, "");

/** The roots of the Name, read off the cited āyāt themselves: a word whose dictionary form (lemma) is the Name
 *  without its "al-" gives its root (al-Wakīl → وَكِيل → و ك ل). Nothing is hand-marked; a Name whose word does
 *  not appear in its own āyāt marks nothing. */
export function nameRootsInAyat(nameArabic, ayat) {
  const name = bare(nameArabic);
  const roots = new Set();
  if (!name) return roots;
  for (const a of ayat) {
    for (const w of a?.data?.words ?? []) {
      const root = w?.morphology?.root;
      if (root && bare(w?.morphology?.lemma) === name) roots.add(root);
    }
  }
  return roots;
}

/** ayat: [{ surah, ayah, data (getAyah() result) | null }]. Helpers come from the page so the words stay translated
 *  the page's way: t, escapeHtml, num (digits in the reader's language), refLabel(surah, ayah), lang ("en" | "bn"). */
export function renderCitedAyatHtml({ ayat, roots, heading, t, escapeHtml, num, refLabel, lang }) {
  if (!ayat.length) return "";
  const rows = ayat.map(({ surah, ayah, data }) => {
    const ref = escapeHtml(refLabel(surah, ayah));
    if (!data) {
      return `<article class="asmax-cited-ayah" data-asmax-cited="${surah}:${ayah}">
        <div class="asmax-cited-ref">${ref}</div>
        <p class="hint">${escapeHtml(t("Couldn't load this āyah. Check the connection and open the Name again."))}</p>
      </article>`;
    }
    const words = (data.words ?? []).map((w) => {
      const hit = roots.has(w?.morphology?.root) ? " hit" : "";
      const meaning = (lang === "bn" ? w.translation?.bn : w.translation?.en) || w.translation?.en || "";
      return `<button type="button" class="asmax-cited-word${hit}" data-asmax-cited-word="${surah}:${ayah}:${w.position}" aria-label="${escapeHtml(`${w.transliteration ?? ""} — ${meaning}`)}">${escapeHtml(w.arabic)}</button>`;
    }).join("");
    const tr = (lang === "bn" ? data.translations?.bn : data.translations?.en) || data.translations?.en || "";
    return `<article class="asmax-cited-ayah" data-asmax-cited="${surah}:${ayah}">
      <div class="asmax-cited-ref">${ref}</div>
      <div class="asmax-cited-words" lang="ar" dir="rtl">${words}<span class="asmax-cited-end">﴿${escapeHtml(num(ayah))}﴾</span></div>
      <div class="asmax-cited-tr${lang === "bn" ? " bn" : ""}">${escapeHtml(tr)}</div>
      <div class="asmax-cited-acts"><button type="button" class="asmax-cited-card" data-asmax-cited-card="${surah}:${ayah}">${escapeHtml(t("Āyah card"))}</button></div>
    </article>`;
  }).join("");
  return `<div class="asmax-cited-label">${escapeHtml(heading)}</div>
    <p class="hint asmax-cited-hint">${escapeHtml(t("Tap a word for its Word card. Words from the Name's root are marked."))}</p>
    ${rows}`;
}
