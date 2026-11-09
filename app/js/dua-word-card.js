// D24 (PCF MSA J104), the Dua Word Card: what a tapped dua word shows when no Qur'an word is spelled like it.
// Quran Study keeps its own Word Card for the words the Qur'an has (they open it, D08); this card is for the rest, with
// the same five levels (WbW, Root, Family, Taṣrīf, Depth). Read-only: no Firestore write lives here. The progress
// block (already built, decision 92) is handed in and sits under WbW.
// Meanings come from the app's dictionaries, which are keyed by Qur'an lemmas, so a dua word whose dictionary form is
// not a Qur'an lemma says "No dictionary entry yet" -- never a made-up meaning (PCF MSA J104, 4 Nov, answer 12).
import { t, num } from "./i18n.js";
import { getAppLang, quranFontStack } from "./prefs.js";
import { duaGrammarPosLabel } from "./dua-words.js";
import { lemmaDictionaryEntry, loadLemmaDictionary, loadBanglaLemmaDictionary } from "./lemma-dictionary.js";
import { el } from "./hadith-shared-ui.js";

export const DUA_WORD_LEVELS = Object.freeze(["wbw", "root", "family", "tasrif", "depth"]);
const LEVEL_LABEL = { wbw: "WbW", root: "Root", family: "Family", tasrif: "Taṣrīf", depth: "Depth" };

/** The meanings the dictionaries hold for a dictionary form: { en, bn } (each null when none). Never throws. */
export async function duaWordMeaning(lemma) {
  if (!lemma) return { en: null, bn: null };
  const [en, bn] = await Promise.all([
    loadLemmaDictionary().then((d) => lemmaDictionaryEntry(d, lemma)?.m ?? null).catch(() => null),
    getAppLang() === "bn" ? loadBanglaLemmaDictionary().then((d) => lemmaDictionaryEntry(d, lemma)?.m ?? null).catch(() => null) : Promise.resolve(null),
  ]);
  return { en: en || null, bn: Array.isArray(bn) ? bn.join("، ") || null : bn };
}

const ROOT_INDEX_URL = "../tools/hadith-data-pull/output/dua/root-index.json";
let rootIndexPromise = null;
/** Which other duas hold a word of the same root (tick 18, 9 Nov 2026), read once on the first Family level, never at startup. */
export function loadDuaRootIndex({ fetchImpl = fetch, url = ROOT_INDEX_URL } = {}) {
  if (!rootIndexPromise) {
    rootIndexPromise = fetchImpl(url).then((r) => { if (!r.ok) throw new Error(`Root index (${r.status})`); return r.json(); });
    rootIndexPromise.catch(() => { rootIndexPromise = null; });
  }
  return rootIndexPromise;
}
/** Pure: the words of `root` in duas OTHER than `dua`, as [{ dua, lemma }] in dua order. */
export function otherDuasOfRoot(index, root, dua) {
  const list = index?.roots?.[root];
  if (!Array.isArray(list)) return [];
  return list.filter((x) => x[0] !== Number(dua)).map(([d, lemma]) => ({ dua: d, lemma }));
}
const OTHER_DUAS_SHOWN = 40;
const WIKTIONARY_URL = "../tools/hadith-data-pull/output/dua/wiktionary-meanings.json";
let wiktionaryPromise = null;
/** The dua-word Wiktionary file (tick 17 A, 9 Nov 2026), read once on the first WbW card, never at startup (I9). */
export function loadDuaWiktionary({ fetchImpl = fetch, url = WIKTIONARY_URL } = {}) {
  if (!wiktionaryPromise) {
    wiktionaryPromise = fetchImpl(url).then((r) => { if (!r.ok) throw new Error(`Wiktionary meanings (${r.status})`); return r.json(); });
    wiktionaryPromise.catch(() => { wiktionaryPromise = null; });
  }
  return wiktionaryPromise;
}
const plainLetters = (w) => String(w ?? "").normalize("NFC").replace(/[\u0640\u064B-\u065F\u0670]/gu, "");
const WIKTIONARY_POS = { noun_prop: "name", noun: "noun", adj: "adj", verb: "verb", adv: "adv", prep: "prep", conj: "conj", pron: "pron", part: "particle" };
/** Pure: the suggested English glosses for a dictionary form and the grammar tool's part of speech, or null. */
export function wiktionaryGlosses(data, lemma, pos) {
  const byPos = data?.meanings?.[plainLetters(lemma)];
  if (!byPos) return null;
  const head = String(pos ?? "");
  const want = WIKTIONARY_POS[head] ?? WIKTIONARY_POS[head.split("_")[0]];
  const g = (want && byPos[want]) || byPos[Object.keys(byPos)[0]];
  return g?.length ? g.join("; ") : null;
}
/** Pure: tick 17 A is for words with NO English dictionary meaning; beside one, the suggestion is not shown (never two English meanings, one unchecked). */
export function suggestedToShow(en, wik) {
  return en ? null : (wik || null);
}
/** The suggested English meaning for a dictionary form, or null. Never throws. */
export async function duaWordSuggested(lemma, pos) {
  if (!lemma) return null;
  return loadDuaWiktionary().then((d) => wiktionaryGlosses(d, lemma, pos)).catch(() => null);
}

const arLine = (label, value, cls) => {
  const p = el("p", `dua-word-line ${cls}`);
  p.appendChild(el("span", "dua-word-label", label));
  const v = el("span", "dua-word-value", value);
  v.lang = "ar"; v.dir = "rtl"; v.style.fontFamily = quranFontStack();
  p.appendChild(v);
  return p;
};

/**
 * The card's body for a word with grammar [lemma, root, pos]. `grammarBlock` and `progressBlock` are the existing blocks
 * (kept as they are); `family` is the dua's own words as [{ i, text, grammar }]; `here` is this word's index in it;
 * `go(i)` opens another word of the dua, `back()` closes the card and returns to the dua's words.
 */
export function duaWordCardBody({ grammar, grammarBlock, progressBlock, family = [], here = 0, go = null, back = null, dua = null }) {
  const [lemma, root, pos] = grammar;
  const box = el("div", "dua-wc");
  box.dataset.duaWc = "";
  let level = "wbw";
  const bar = el("div", "dua-wc-levels");
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", t("Levels"));
  const body = el("div", "dua-wc-body");
  const paint = () => {
    bar.querySelectorAll("[data-dua-wc-level]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.duaWcLevel === level)));
    body.textContent = "";
    body.dataset.duaWcShown = level;
    if (level === "wbw") {
      const mean = el("div", "dua-wc-meaning");
      mean.dataset.duaWcMeaning = "";
      mean.appendChild(el("p", "hadith-note", t("Loading…")));
      body.appendChild(mean);
      Promise.all([duaWordMeaning(lemma), duaWordSuggested(lemma, pos)]).then(([{ en, bn }, wik]) => {
        if (level !== "wbw" || !mean.isConnected) return;
        mean.textContent = "";
        const bnFirst = getAppLang() === "bn";
        const rows = bnFirst ? [[bn, "bn"], [en, "en"]] : [[en, "en"], [bn, "bn"]];
        let any = false;
        for (const [m, l] of rows) {
          if (!m) continue;
          any = true;
          const p = el("p", `dua-word-line dua-word-meaning-${l}`);
          p.appendChild(el("span", "dua-word-label", l === "bn" ? t("Meaning (Bangla)") : t("Meaning (English)")));
          const v = el("span", "dua-word-value", m);
          v.lang = l;
          p.appendChild(v);
          mean.appendChild(p);
        }
        if (any) mean.appendChild(el("p", "dua-words-note", [en ? t("English: Wiktionary (CC BY-SA 4.0)") : "", bn ? t("Bangla: Quraniyo Obhidhan") : ""].filter(Boolean).join(" · ")));
        const sug = suggestedToShow(en, wik);
        if (sug) {
          any = true;
          const p = el("p", "dua-word-line dua-word-meaning-suggested");
          p.appendChild(el("span", "dua-word-label", t("Suggested meaning (English)")));
          const v = el("span", "dua-word-value", sug);
          v.lang = "en";
          p.appendChild(v);
          mean.appendChild(p);
          mean.appendChild(el("p", "dua-words-note dua-wc-suggested-note", t("Suggested, to be checked: Wiktionary (CC BY-SA 4.0), matched by the word's letters, so it may be the wrong sense.")));
        }
        if (!any) mean.appendChild(el("p", "hadith-note dua-wc-nodict", t("No dictionary entry yet for this word.")));
      });
      body.appendChild(grammarBlock);
      if (progressBlock) body.appendChild(progressBlock);
    } else if (level === "root") {
      if (root) body.appendChild(arLine(t("Root"), root, "dua-word-root"));
      else body.appendChild(el("p", "hadith-note", t("No root is suggested for this word yet.")));
      body.appendChild(el("p", "dua-words-note", t("Root meanings and other words of the root are in the dictionaries linked under WbW.")));
    } else if (level === "family") {
      const kin = root ? family.filter((w) => w.i !== here && w.grammar?.[1] === root) : [];
      body.appendChild(el("p", "dua-also-head", t("Other words of this dua from the same root")));
      if (!kin.length) body.appendChild(el("p", "hadith-note dua-wc-nokin", t("No other word of this dua has this root.")));
      else {
        const row = el("div", "dua-wc-kin");
        for (const w of kin) {
          const b = el("button", "dua-ref dua-wc-kin-word", w.text);
          b.type = "button"; b.lang = "ar"; b.dir = "rtl"; b.style.fontFamily = quranFontStack();
          b.dataset.duaWcKin = String(w.i);
          b.addEventListener("click", () => go?.(w.i));
          row.appendChild(b);
        }
        body.appendChild(row);
      }
      // Tick 18 (9 Nov 2026): the same root in OTHER duas, from the root index (free, built from the grammar files).
      const other = el("div", "dua-wc-other-duas");
      other.dataset.duaWcOther = "";
      body.appendChild(other);
      if (!root) { other.appendChild(el("p", "dua-words-note", t("Words of the same root in other duas need a root, and this word has none yet."))); }
      else {
        other.appendChild(el("p", "dua-also-head", t("The same root in other duas")));
        const slot = el("p", "hadith-note", t("Loading…"));
        other.appendChild(slot);
        loadDuaRootIndex().then((idx) => {
          if (level !== "family" || !slot.isConnected) return;
          const list = otherDuasOfRoot(idx, root, dua);
          if (!list.length) { slot.textContent = t("No other dua has a word of this root."); slot.classList.add("dua-wc-noother"); return; }
          const row = el("div", "dua-wc-kin dua-wc-other-row");
          for (const x of list.slice(0, OTHER_DUAS_SHOWN)) {
            const a = el("a", "dua-ref dua-wc-other", `${x.lemma} · ${t("Dua {n}", { n: num(x.dua) })}`);
            a.href = `./dua-study.html?g=rasul&open=${x.dua}&back=1`;
            a.lang = "ar"; a.dir = "rtl"; a.style.fontFamily = quranFontStack();
            a.dataset.duaWcOtherDua = String(x.dua);
            row.appendChild(a);
          }
          slot.replaceWith(row);
          if (list.length > OTHER_DUAS_SHOWN) row.after(el("p", "dua-words-note", t("{n} more not shown.", { n: num(list.length - OTHER_DUAS_SHOWN) })));
        }).catch(() => { if (slot.isConnected) slot.textContent = t("Could not load the other duas just now."); });
        other.appendChild(el("p", "dua-words-note", t("Roots are a computer's guess, to be checked.")));
      }
    } else if (level === "tasrif") {
      if (pos === "verb") body.appendChild(el("p", "hadith-note dua-wc-notas", t("The verb table for dua words is not built yet.")));
      else body.appendChild(el("p", "hadith-note dua-wc-notas", t("Not applicable: this word is not a verb, so it has no verb table.")));
      if (pos) body.appendChild(el("p", "dua-word-line dua-word-pos", `${t("Part of speech")}: ${t(duaGrammarPosLabel(pos))}`));
    } else {
      body.appendChild(el("p", "hadith-note dua-wc-depth", t("Dictionary entries and how the word is used in the hadith will come later.")));
    }
  };
  for (const id of DUA_WORD_LEVELS) {
    const b = el("button", "dua-ref dua-wc-level", t(LEVEL_LABEL[id]));
    b.type = "button";
    b.dataset.duaWcLevel = id;
    b.addEventListener("click", () => { level = id; paint(); });
    bar.appendChild(b);
  }
  const nav = el("div", "dua-wc-nav");
  const step = (d, label, id) => {
    const b = el("button", "dua-ref dua-wc-step", label);
    b.type = "button"; b.dataset[id] = "";
    b.setAttribute("aria-label", d < 0 ? t("Previous word") : t("Next word"));
    b.addEventListener("click", () => go?.((here + d + family.length) % Math.max(1, family.length)));
    return b;
  };
  nav.append(step(-1, "‹", "duaWcPrev"), el("span", "dua-wc-count", `${num(here + 1)} / ${num(family.length)}`), step(1, "›", "duaWcNext"));
  if (back) {
    const b = el("button", "dua-ref dua-wc-back", t("Back to the dua"));
    b.type = "button"; b.dataset.duaWcBack = "";
    b.addEventListener("click", back);
    nav.appendChild(b);
  }
  box.append(nav, bar, body);
  paint();
  return box;
}
