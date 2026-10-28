// Helpers shared by the Hadith library (hadith-browser.js) and the Dua tab (dua-browser.js), moved here unchanged
// from hadith-browser.js (PCF MSA J106, at the MSA Architect's request) so the Dua module can mount its own file
// without importing the whole library. Pure UI helpers: no Firebase, no state.
import { t, num } from "./i18n.js";
import { getAppLang } from "./prefs.js";
import { loadHadithTranslation } from "./hadith-translations.js";
import { loadHadithRecords, hadeethEncSourceUrl } from "./hadeethenc-corpus.js";

export const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

export const HADEETHENC_LANG_LABELS = { ar: "العربية", en: "English", bn: "বাংলা" };

let hadithStudyActionsPromise = null;
export function loadHadithStudyActions() {
  if (!hadithStudyActionsPromise) hadithStudyActionsPromise = import("./hadith-study-actions.js");
  return hadithStudyActionsPromise;
}

/**
 * Architect review (#316): a chapter title is shown TIDIED, never stored
 * tidied -- the split data keeps the source's heading as written. Twenty of
 * 5,191 source headings carry an unbalanced bracket ("( 5 كتاب الغسل") or an
 * inline "\\ 390 \\" cross-reference; those marks are dropped for display
 * only, and an empty title reads "(untitled)" rather than a file id.
 */
export function openitiDisplayTitle(title) {
  let s = String(title ?? "").replace(/\\\s*\d+\s*\\/g, " ").replace(/\s+/g, " ").trim();
  const opens = (s.match(/\(/g) || []).length, closes = (s.match(/\)/g) || []).length;
  if (opens > closes) s = s.replace(/^\(\s*/, "");
  if (closes > opens) s = s.replace(/\s*\)$/, "");
  return s || t("(untitled)");
}

export function openitiArabicRowName(text) {
  const span = el("span", "hadith-row-name openiti-row-name-ar", text);
  span.lang = "ar"; span.dir = "rtl";
  return span;
}

export function duaRefLabel(dua, versionUri, std, n, number = null) {
  const book = dua.books.find((b) => b.versionUri === versionUri);
  const name = (getAppLang() === "bn" ? book?.short?.bn : book?.short?.en) ?? book?.titleEn ?? versionUri;
  if (std != null && std !== "") return `${name} ${num(String(std))}`;
  if (number != null) return `${name} ${num(number)}`;
  return t("{book}, passage {n}", { book: name, n: num(n) });
}

/**
 * Decision 89 (the Owner, 8 Oct 2026: "include the Hadith Eng n Bangla languages"): the English and Bangla
 * translations from hadith-api, found by the narration's standard number. Two folds, the reader's language first,
 * each closed and loaded only when opened. `resolveStd` gives the standard number (or null) when first needed.
 */
const STANDARD_TRANSLATION_LABELS = { en: "English", bn: "বাংলা" };
// "English" goes through t() so a Bangla reader sees ইংরেজি, not a Latin word in the middle of a Bangla label.
const standardLangLabel = (lang) => (lang === "en" ? t("English") : STANDARD_TRANSLATION_LABELS[lang]);
export function standardTranslationFolds(versionUri, resolveStd) {
  const frag = document.createDocumentFragment();
  const langs = getAppLang() === "bn" ? ["bn", "en"] : ["en", "bn"];
  for (const lang of langs) {
    const details = document.createElement("details");
    details.className = "hadeethenc-explanation standard-translation";
    details.dataset.standardTranslation = lang;
    const summary = document.createElement("summary");
    summary.textContent = t("{lang} translation", { lang: standardLangLabel(lang) });
    details.appendChild(summary);
    let loaded = false;
    details.addEventListener("toggle", () => {
      if (!details.open || loaded) return;
      loaded = true;
      const wait = el("p", "hadith-note", t("Loading…"));
      details.appendChild(wait);
      Promise.resolve(resolveStd()).then((std) => (std ? loadHadithTranslation(versionUri, std, lang) : null)).then((tr) => {
        wait.remove();
        if (!tr) { details.appendChild(el("p", "hadith-note", t("No {lang} translation was found for this narration.", { lang: standardLangLabel(lang) }))); return; }
        const text = el("p", "hadith-translation-text standard-translation-text", tr.text);
        text.lang = lang;
        text.dataset.standardTranslationText = lang;
        details.appendChild(text);
        const credit = document.createElement("a");
        credit.className = "hadith-view-source standard-translation-credit";
        credit.href = tr.sourceUrl;
        credit.target = "_blank";
        credit.rel = "noopener noreferrer";
        credit.textContent = tr.translator
          ? t("Translation: {who} · from hadith-api (fawazahmed0), matched by the standard number", { who: tr.translator })
          : t("Translation from hadith-api (fawazahmed0), matched by the standard number");
        details.appendChild(credit);
      }).catch(() => { wait.remove(); details.appendChild(el("p", "hadith-note", t("The translation could not be loaded right now."))); loaded = false; });
    });
    frag.appendChild(details);
  }
  return frag;
}

/**
 * Round H-DB3 (decision 87): HadeethEnc's translation of this narration, in the reader's language (Bangla or
 * English), closed until opened and loaded only then. HadeethEnc's conditions (decision 7): its words unchanged,
 * named, linked. Its wording can follow another narration of the same hadith, and the fold says so.
 */
export function openitiTranslationFold(ids) {
  const want = getAppLang() === "bn" ? "bn" : "en";
  const details = document.createElement("details");
  details.className = "hadeethenc-explanation openiti-translation";
  details.dataset.openitiTranslation = ids.join(",");
  const summary = document.createElement("summary");
  summary.textContent = t("{lang} translation (HadeethEnc)", { lang: HADEETHENC_LANG_LABELS[want] ?? want });
  details.appendChild(summary);
  let loaded = false;
  details.addEventListener("toggle", () => {
    if (!details.open || loaded) return;
    loaded = true;
    const wait = el("p", "hadith-note", t("Loading…"));
    details.appendChild(wait);
    loadHadithRecords(ids, want).then((records) => {
      wait.remove();
      details.appendChild(el("p", "hadith-note openiti-translation-note", t("HadeethEnc's wording may follow another narration of this hadith.")));
      for (const id of ids) {
        const r = records.get(String(id));
        if (!r) continue;
        const box = el("div", "hadith-translation");
        if (r.lang === "ar") {
          box.appendChild(el("p", "hadith-fallback", t("No {lang} translation for this hadith. Showing the Arabic source only.", { lang: HADEETHENC_LANG_LABELS[want] ?? want })));
        } else {
          if (r.isFallback) box.appendChild(el("p", "hadith-fallback", t("No {lang} translation for this hadith. Showing {shown}.", { lang: HADEETHENC_LANG_LABELS[want] ?? want, shown: HADEETHENC_LANG_LABELS[r.lang] ?? r.lang })));
          const text = el("p", "hadith-translation-text", r.record.hadeeth ?? "");
          text.lang = r.lang;
          text.dataset.openitiTranslationText = id;
          box.appendChild(text);
        }
        if (r.record.grade) box.appendChild(el("p", "hadith-attribution", t("Grade: {grade}", { grade: r.record.grade })));
        if (r.record.attribution) box.appendChild(el("p", "hadith-attribution", r.record.attribution));
        const src = document.createElement("a");
        src.className = "hadith-view-source";
        src.href = hadeethEncSourceUrl(r.lang, id);
        src.target = "_blank";
        src.rel = "noopener noreferrer";
        src.textContent = t("Source: HadeethEnc.com");
        box.appendChild(src);
        details.appendChild(box);
      }
    }).catch((err) => { wait.textContent = String(err?.message ?? err); loaded = false; });
  });
  return details;
}
