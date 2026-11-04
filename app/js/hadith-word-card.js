/**
 * The Hadith Word Card (HWC), Keys to Understanding K1 Part A (PCF MSA J03, the Owner's ticks of 4 Nov 2026).
 *
 * On a HadeethEnc hadith card, "Words" lists the hadith's Arabic words. Tapping one:
 *   - ROOT IS IN THE QUR'AN (the root is computed from the Qur'an data by tools/hadith-data-pull/hadith-word-roots.mjs, never
 *     typed): a link to QR's Word card at that Qur'an word, with ← Back (back=1) -- QR's Word card is QR's, not copied here;
 *   - otherwise: this card, five levels (WbW, Root, Family, Taṣrīf, Depth), each saying plainly what the data does and
 *     does not hold. Grammar the data does not give is NOT invented; a level without data says so.
 * Words are numbered by hadith-words.js, the one tokeniser the marks use too.
 */
import { t, num } from "./i18n.js";
import { el } from "./hadith-shared-ui.js";
import { tokeniseHadith, quranRootOf, normaliseArabic } from "./hadith-words.js";

const FORMS_URL = "../tools/hadith-data-pull/output/hadith-words/quran-forms.json";
let formsPromise = null;
/** The Qur'an form index, fetched once, on the first tap of "Words" (never at startup, I9). */
export function loadQuranForms(fetchImpl = fetch) {
  formsPromise ??= fetchImpl(FORMS_URL).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).then((d) => d.values);
  formsPromise.catch(() => { formsPromise = null; });
  return formsPromise;
}

/** HadeethEnc's own gloss for a word: the words_meanings entry whose words include this one (sourced, never made up). */
export function meaningFor(wordsMeanings, norm) {
  if (!Array.isArray(wordsMeanings)) return null;
  for (const m of wordsMeanings) {
    if (!m || typeof m.word !== "string") continue;
    const parts = normaliseArabic(m.word).split(/\s+/);
    if (parts.includes(norm) || parts.some((p) => p.length > 2 && (norm.endsWith(p) || p.endsWith(norm)) && Math.abs(p.length - norm.length) <= 1)) {
      return { word: m.word, meaning: String(m.meaning ?? "").trim() };
    }
  }
  return null;
}

export function qrWordHref(ref, hadithId) { return `./quranrevival.html?word=${ref}&back=1&from=hadith-${hadithId}`; }

const LEVELS = [["WbW", "word by word"], ["Root", "where it comes from"], ["Family", "its relatives"], ["Taṣrīf", "its forms"], ["Depth", "the sentence"]];

function well(title, ...kids) { const w = el("div", "hwc-well"); if (title) w.appendChild(el("h4", null, title)); for (const k of kids) w.appendChild(typeof k === "string" ? el("p", null, k) : k); return w; }
function noData(text) { return el("p", "hwc-nodata", text); }

function levelBody(i, ctx) {
  const { tok, tokens, wm } = ctx;
  const body = el("div", "hwc-body");
  if (i === 0) {
    const w = well(t("Meaning in this hadith"));
    w.appendChild(wm ? el("p", null, wm.meaning || "—") : noData(t("HadeethEnc gives no meaning for this word. Nothing is guessed here.")));
    if (wm) w.appendChild(el("p", "hwc-src", t("Source: HadeethEnc's list of word meanings for this hadith.")));
    body.appendChild(w);
    body.appendChild(well(t("Word {n} of {total}", { n: num(tok.pos), total: num(tokens.length) })));
  } else if (i === 1) {
    body.appendChild(well(t("Root"), noData(t("The Qur'an's dictionaries do not hold this word's root, and no root has been added for it yet."))));
  } else if (i === 2) {
    const same = tokens.filter((x) => x.norm === tok.norm);
    body.appendChild(well(t("Same word in this hadith"), el("p", null, t("{n} times, at word {positions}", { n: num(same.length), positions: same.map((x) => num(x.pos)).join(", ") }))));
    body.appendChild(well(null, noData(t("Relatives of this word in other hadith are not listed yet."))));
  } else if (i === 3) {
    body.appendChild(well(t("Forms"), noData(t("No grammar data for this word yet. The Qur'an's verb tables cover Qur'an words only."))));
  } else {
    const lo = Math.max(0, tok.pos - 4), hi = Math.min(tokens.length, tok.pos + 3);
    const line = el("p", "hwc-ar"); line.lang = "ar"; line.dir = "rtl";
    tokens.slice(lo, hi).forEach((x, k) => { const s = el("span", x.pos === tok.pos ? "hwc-here" : null, x.written); line.appendChild(s); if (k < hi - lo - 1) line.appendChild(document.createTextNode(" ")); });
    body.appendChild(well(t("The words around it"), line));
    if (wm) { const note = el("p", null, `${wm.word} — ${wm.meaning}`); note.dir = "auto"; body.appendChild(well(t("HadeethEnc's note"), note)); }
  }
  return body;
}

/** Opens the five-level sheet. `onClose` runs when it closes (focus returns to the word chip). */
export function openHadithWordCard({ tok, tokens, wordsMeanings, hadithLabel, onClose }) {
  const overlay = el("div", "hwc-overlay");
  const sheet = el("section", "hwc-sheet"); sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true");
  sheet.dataset.hwcSheet = String(tok.pos);
  const head = el("div", "hwc-head");
  const back = el("button", "hwc-back", t("← Back to the hadith card")); back.type = "button"; back.dataset.hwcBack = "true";
  head.appendChild(back);
  head.appendChild(el("span", "hwc-title", t("Hadith Word Card")));
  sheet.appendChild(head);
  const big = el("p", "hwc-big", tok.written); big.lang = "ar"; big.dir = "rtl"; sheet.appendChild(big);
  sheet.appendChild(el("p", "hwc-draft", t("Draft: not yet checked by a scholar.")));
  if (hadithLabel) { const lab = el("p", "hwc-label", hadithLabel); lab.dir = "auto"; sheet.appendChild(lab); }
  const wm = meaningFor(wordsMeanings, tok.norm);
  const ctx = { tok, tokens, wm };
  const tabs = el("div", "hwc-tabs"); tabs.setAttribute("role", "tablist");
  const host = el("div", "hwc-host");
  const show = (i) => { for (const b of tabs.children) b.setAttribute("aria-pressed", String(b.dataset.level === String(i))); host.replaceChildren(levelBody(i, ctx)); };
  LEVELS.forEach(([name, sub], i) => {
    const b = el("button", "hwc-tab"); b.type = "button"; b.dataset.level = String(i); b.setAttribute("role", "tab");
    b.append(el("span", null, t(name)), el("small", null, t(sub)));
    b.addEventListener("click", () => show(i)); tabs.appendChild(b);
  });
  sheet.append(tabs, host); show(0);
  overlay.appendChild(sheet); document.body.appendChild(overlay);
  const close = () => { document.removeEventListener("keydown", onKey); overlay.remove(); onClose?.(); };
  function onKey(e) { if (e.key === "Escape") close(); }
  document.addEventListener("keydown", onKey);
  back.addEventListener("click", close);
  back.focus();
  return close;
}

/**
 * The "Words" section of a hadith card: an ON/OFF switch (J109) that, when on, lists the words as buttons.
 * `arabic` is the hadith's Arabic text (hadithArabicText); `getForms` resolves the Qur'an form index.
 */
export function hadithWordsSection({ id, arabic, wordsMeanings, hadithLabel, getForms = loadQuranForms }) {
  const box = el("div", "hwc-words"); box.dataset.hwcWords = String(id);
  const tokens = tokeniseHadith(arabic);
  if (!tokens.length) return box;
  const sw = el("button", "hwc-switch"); sw.type = "button"; sw.setAttribute("aria-expanded", "false");
  sw.innerHTML = '<span class="mm-sw" aria-hidden="true"></span> ';
  sw.append(t("Words"), " · ", num(tokens.length));
  const list = el("div", "hwc-list"); list.hidden = true;
  box.append(sw, list);
  let built = false;
  sw.addEventListener("click", async () => {
    const open = sw.getAttribute("aria-expanded") !== "true";
    sw.setAttribute("aria-expanded", String(open)); list.hidden = !open;
    if (!open || built) return;
    built = true; list.appendChild(el("p", "hwc-nodata", t("Loading…")));
    let forms = null;
    try { forms = await getForms(); } catch { forms = null; }
    list.replaceChildren();
    if (!forms) { list.appendChild(el("p", "hwc-nodata", t("The word list could not be opened. Check the connection and press Words again."))); built = false; return; }
    list.appendChild(el("p", "hwc-key", t("A word with a root in the Qur'an opens the Qur'an's Word card (↗). Any other word opens the Hadith Word Card.")));
    const row = el("div", "hwc-chips");
    for (const tok of tokens) {
      const hit = quranRootOf(forms, tok.norm);
      let node;
      if (hit) {
        node = el("a", "hwc-chip hwc-q"); node.href = qrWordHref(hit.ref, id); node.dataset.hwcKind = "q"; node.dataset.hwcRoot = hit.root;
        node.append(tok.written, " ↗");
      } else {
        node = el("button", "hwc-chip hwc-h"); node.type = "button"; node.dataset.hwcKind = "h";
        node.textContent = tok.written;
        node.addEventListener("click", () => openHadithWordCard({ tok, tokens, wordsMeanings, hadithLabel, onClose: () => node.focus() }));
      }
      node.lang = "ar"; node.dir = "rtl"; node.dataset.hwcPos = String(tok.pos);
      row.appendChild(node);
    }
    list.appendChild(row);
  });
  return box;
}
