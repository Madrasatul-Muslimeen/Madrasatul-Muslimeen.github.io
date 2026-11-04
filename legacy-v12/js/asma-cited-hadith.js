// Owner, 9 Oct 2026 (Asma in Explore, part 2): the hadith a Name cites are written out under its āyāt -- reference and
// grade, the Arabic of the passage in the Hadith library, a translation in the reader's language, and a link into the
// library. Nothing here runs until a Name with a hadith citation is opened (I9). A citation with no library entry
// shows its reference and grade and says so; a passage is never guessed.
import { posterHadithHref } from "./asma-poster.js";
import { loadOpenitiBookIndex, loadOpenitiChapter, loadOpenitiConcordance } from "./openiti-corpus.js";
import { loadHadithTranslation } from "./hadith-translations.js";

/** Arabic with its marks, punctuation and extra spaces removed, for finding the narration's own words in a passage. */
export const plainArabic = (s) => String(s ?? "").normalize("NFD").replace(/[ً-ٰٟۖ-ۭـ]/g, "").normalize("NFC")
  .replace(/[^ء-يٱ-ۓ\s]/g, " ").replace(/\s+/g, " ").trim();
// A page marker the library keeps as its own passage: "[ص: 535]" or "- 201 -" (Muslim's edition).
const PAGE_MARKER = /^\s*(\[ص: \d+\]|- ?\d+ ?-|\d+ ?-)\s*$/;

/** One cited hadith's library text and translations: { arabic, translations: { en, bn } } (each null when absent).
 *  Throws if the passage itself cannot be read; a missing translation is just null. */
export async function loadCitedHadith(link, deps = {}) {
  const { versionUri, n } = link.openiti;
  const index = await (deps.loadIndex ?? loadOpenitiBookIndex)(versionUri);
  const chapter = index.chapters.find((c) => (c.hadithPositions ?? []).includes(n));
  const ch = chapter ? await (deps.loadChapter ?? loadOpenitiChapter)(versionUri, chapter) : null;
  const at = ch ? ch.hadiths.findIndex((h) => h.n === n) : -1;
  if (at < 0) throw new Error(`Passage ${n} of ${versionUri} not found.`);
  // Muslim's edition splits a long narration at its page breaks (771 is cut mid-sentence): when the narration's own
  // words (POSTER_HADITH's, checked by reading) are not in the linked passage, the passages that follow it are joined
  // -- skipping page markers, at most three -- but only if that makes the words appear. Otherwise only the passage is shown.
  let arabic = ch.hadiths[at].text;
  if (link.words && !plainArabic(arabic).includes(plainArabic(link.words))) {
    let joined = arabic;
    for (let i = at + 1; i < ch.hadiths.length && i <= at + 4; i++) {
      if (PAGE_MARKER.test(ch.hadiths[i].text)) continue;
      joined += ` ${ch.hadiths[i].text}`;
      if (plainArabic(joined).includes(plainArabic(link.words))) { arabic = joined; break; }
    }
  }
  const passage = { text: arabic };
  const conc = await (deps.loadConcordance ?? loadOpenitiConcordance)(versionUri).catch(() => null);
  const std = conc?.stdByN?.get(n) ?? null;
  const load = deps.loadTranslation ?? loadHadithTranslation;
  const translations = {};
  for (const lang of ["en", "bn"]) translations[lang] = std ? await Promise.resolve(load(versionUri, std, lang)).catch(() => null) : null;
  return { arabic: passage.text, translations };
}

function openLink(cite, t, escapeHtml) {
  return `<div class="asmax-cited-acts"><a class="asmax-cited-open" data-asmax-hadith-open="${escapeHtml(cite.key)}" href="${escapeHtml(posterHadithHref(cite.link))}">${escapeHtml(t("Open in Hadith →"))}</a></div>`;
}

/** items: [{ cite (asmaCitedHadith row), loaded ({arabic, translations} | null), failed }]. Helpers come from the page. */
export function renderCitedHadithHtml({ items, heading, t, escapeHtml, num, lang }) {
  if (!items.length) return "";
  const other = lang === "bn" ? "en" : "bn";
  const langName = (l) => (l === "en" ? t("English") : "বাংলা");
  const rows = items.map(({ cite, loaded, failed }) => {
    const title = lang === "bn" ? cite.titleBn : cite.titleEn;
    const grade = cite.grade ? ` <span class="asmax-cited-grade">${escapeHtml(t("Grade: {grade}", { grade: cite.grade }))}</span>` : "";
    const head = `<div class="asmax-cited-ref">${escapeHtml(`${title} ${num(cite.number)}`)}${grade}</div>`;
    const key = escapeHtml(cite.key ?? `${cite.titleEn}:${cite.number}`);
    if (!cite.link) {
      return `<article class="asmax-cited-hadith" data-asmax-hadith="${key}" data-asmax-hadith-unlinked="true">${head}
        <p class="hint">${escapeHtml(t("This hadith's text is not in the app's Hadith library yet."))}</p></article>`;
    }
    if (failed || !loaded) {
      return `<article class="asmax-cited-hadith" data-asmax-hadith="${key}">${head}
        <p class="hint">${escapeHtml(t("The hadith text could not be loaded right now."))}</p>${openLink(cite, t, escapeHtml)}</article>`;
    }
    const want = loaded.translations[lang] ? lang : loaded.translations[other] ? other : null;
    const tr = want ? loaded.translations[want] : null;
    const credit = tr && (tr.translator
      ? t("Translation: {who} · from hadith-api (fawazahmed0), matched by the standard number", { who: tr.translator })
      : t("Translation from hadith-api (fawazahmed0), matched by the standard number"));
    const trHtml = tr
      ? `${want !== lang ? `<p class="hint asmax-cited-trlang">${escapeHtml(t("{lang} translation", { lang: langName(want) }))}</p>` : ""}
        <div class="asmax-cited-tr${want === "bn" ? " bn" : ""}" lang="${want}" data-asmax-hadith-tr="${want}">${escapeHtml(tr.text)}</div>
        <a class="asmax-cited-credit" href="${escapeHtml(tr.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(credit)}</a>`
      : `<p class="hint">${escapeHtml(t("No translation of this hadith is in the app yet."))}</p>`;
    return `<article class="asmax-cited-hadith" data-asmax-hadith="${key}">${head}
      <div class="asmax-cited-hadith-ar" lang="ar" dir="rtl">${escapeHtml(loaded.arabic)}</div>
      ${trHtml}
      ${openLink(cite, t, escapeHtml)}</article>`;
  }).join("");
  return `<div class="asmax-cited-label asmax-cited-hadith-label">${escapeHtml(heading)}</div>${rows}`;
}
