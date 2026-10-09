// Shared scanner for the Bangla sweeps (issue #677, reused by #680): finds Latin-script interface text on the open page.
// Data is allowed only by exact phrase (see NAME_TOKENS / DATA_ALLOWED); every entry says why.
// Data, not interface: proper names, credits, book titles and ids that appear INSIDE otherwise-Bangla text, stripped
// before the Latin check. Each token is a name or a licence, never a word a Bangla reader should be given in Bangla.
export const NAME_TOKENS = [
  /HadeethEnc(\.com)?/gi, /OpenITI/gi, /hadith-api/gi, /fawazahmed0/gi, /Muhsin Khan/gi, /QuranRevival/gi,
  /\bQCR\b/g, // the Ayah-collections feature name, deliberately kept in Latin script in bn.js ("QCR": "QCR")
  /CC BY-NC-SA 4\.0/gi, /[\w.+-]+@[\w.-]+\.\w+/g, /synthetic-[\w-]+/gi,
];
// Whole strings that are data: book titles (in the "Also narrated in" lists), the demo-only synthetic note, a HadeethEnc
// category title, and word-by-word glosses in an aria-label.
export const DATA_ALLOWED = [
  /^— (al-Muwatta'|Musnad Ahmad|Sunan al-Darimi|Sahih al-Bukhari|al-Adab al-Mufrad|Sahih Muslim|Sunan Ibn Majah|Sunan Abi Dawud|Jami' al-Tirmidhi|Sunan al-Nasa'i|al-Nasa'i's 'Amal al-Yawm wa'l-Layla|Ibn al-Sunni's 'Amal al-Yawm wa'l-Layla|al-Nawawi's al-Adhkar|al-Nawawi's Forty|Riyad al-Salihin)$/,
  /^Sahih al-Bukhari$/,
  // The content-language chooser names each language in its own script (العربية · English · বাংলা), the usual convention.
  // Only an <option> in that chooser; a translation fold's summary is NOT exempt and must read ইংরেজি.
  { optionOnly: true, re: /^English$/ }, /^People of the Sunnah and the Community$/, /^Synthetic development data — these are not real narrations\.$/,
  /^[؀-ۿݐ-ݿ\s]+ — [A-Za-z()' \[\]ʿā-]+$/,
];

export const SCAN = () => {
  const out = [];
  const visible = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e.hidden || e.tagName === "SCRIPT" || e.tagName === "STYLE" || e.tagName === "NOSCRIPT" || e.tagName === "TEMPLATE") return false;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      if (e.tagName === "DETAILS" && !e.open && el.closest("details") === e) {
        const sum = el.closest("summary");
        if (!sum || sum.parentElement !== e) return false;
      }
    }
    return true;
  };
  const isData = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const lang = (e.getAttribute?.("lang") || "").toLowerCase();
      if (lang && lang !== "bn") return "lang=" + lang;
      if (e.getAttribute?.("dir") === "rtl") return "rtl";
      if (e.hasAttribute?.("data-i18n-skip")) return "skip";
      if (e.matches?.("[data-standard-translation-text], .hadith-arabic, .dua-word-arabic, .ayah-translation, .note-english, .qcr-list-title, .qcr-way-snippet, #qcrLevelSelect, .wbw-translit, .wbw-gloss, .word-card-transliteration, .dua-word-translit .dua-word-value")) return "data";
    }
    return null;
  };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const text = n.nodeValue.replace(/\s+/g, " ").trim();
    if (!text || !/[A-Za-z]{2,}/.test(text)) continue;
    const el = n.parentElement;
    if (!el || !visible(el) || isData(el)) continue;
    out.push({ kind: "text", text, where: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : "") });
  }
  for (const el of document.body.querySelectorAll("[aria-label],[title],[placeholder]")) {
    if (!visible(el) || isData(el)) continue;
    for (const a of ["aria-label", "title", "placeholder"]) {
      const v = (el.getAttribute(a) || "").replace(/\s+/g, " ").trim();
      if (v && /[A-Za-z]{2,}/.test(v)) out.push({ kind: a, text: v, where: el.tagName.toLowerCase() });
    }
  }
  return out;
};

export const leaksOf = (found) => found.filter((f) => {
  if (DATA_ALLOWED.some((a) => (a.optionOnly ? f.where === "option" && a.re.test(f.text) : a.test(f.text)))) return false;
  let rest = f.text;
  for (const re of NAME_TOKENS) rest = rest.replace(re, " ");
  return /[A-Za-z]{2,}/.test(rest);
});
