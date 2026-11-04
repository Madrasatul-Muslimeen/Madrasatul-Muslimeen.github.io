// J03 K3 "Read next" -- the shared box any card places with ONE call:
//
//   import { renderReadNext } from "./read-next-ui.js";
//   renderReadNext(hostElement, ctx);      // appends the box to hostElement and returns it
//
// Five tabs, in the approved order (keys demo v2, 4 Nov 2026): Qur'an, Hadith, Dictionary, Scholars, Tafsīr. A card
// gives only what it has; a tab whose ctx entry is missing is not drawn. Every ctx value may be the value itself, a
// function returning it, or a function returning a promise of it: NOTHING is read when the box is drawn -- a tab's
// data is fetched the first time that tab is opened (I9 / the load-speed contract), then kept.
//
// ctx = {
//   quran:   ["36:38" | [36, 38] | { surah, ayah }, ...]   āyāt to read next; each opens the Read view with a way back
//   backTo:  "hadith" | "ayah" | ...                         passed to the Read view so its pill says where it returns
//   hadith:  [hit, ...] | { shown, more }                    other hadith (ayah-hadith.js hits: { book, n, number, test })
//   self:    { book, n }                                     this card's own narration, left out of `hadith`
//   words:   HadeethEnc words_meanings (any shape)           meanings given with a hadith
//   lemmas:  ["شَمْس", ...]                                  Qur'an lemmas for the app's two dictionaries
//   lemmasFrom: "the āyah it quotes" (already translated)    optional heading for the lemma entries
//   scholars: "tafsir" | "hadith+tafsir"                     tafsīr scholars by Approach; +compiler of `compilerBook`
//   compilerBook: OpenITI book id                            for "hadith+tafsir"
//   tafsir:  true | { explanation, hints, ayat: [refs] }     HadeethEnc explanation/benefits (if any) + where to read
// }
import { t, num, surahName } from "./i18n.js";
import { getAppLang } from "./prefs.js";
import { getSurah } from "./quran-data.js";
import { describeHit } from "./ayah-hadith.js";
import { loadLemmaDictionary, loadBanglaLemmaDictionary } from "./lemma-dictionary.js";
import {
  tabsFor, uniqueAyahRefs, ayahHref, hadithHref, otherHadith, wordMeanings, dictionaryEntries, entryMeaning,
  groupByApproach, tafsirScholars, compilerOf, scholarName, lifeLine, whereToRead, hadithExplanation,
} from "./read-next.js";

const DATA_URL = new URL("../data/tafsir-scholars.json", import.meta.url).href;
let dataPromise = null;
/** The scholars file, fetched on first use only. */
export function loadTafsirScholars() {
  if (!dataPromise) {
    dataPromise = fetch(DATA_URL).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the scholars list (HTTP ${res.status}).`);
      return res.json();
    }).catch((err) => { dataPromise = null; throw err; });
  }
  return dataPromise;
}

const NARROW_SPANS = { 1: [6], 2: [3, 3], 3: [2, 2, 2], 4: [3, 3, 3, 3], 5: [2, 2, 2, 3, 3] };
const LABELS = { quran: "Qur'an", hadith: "Hadith", dictionary: "Dictionary", scholars: "Scholars", tafsir: "Tafsīr" };

const CSS = `
/* The box sits on light cards and on the dark reader windows alike: its headings and notes take the card's own text
   colour (a palette belongs to a surface); the tabs and the item boxes carry their own light background. */
.read-next { container-type: inline-size; display: grid; gap: 0.5rem; margin: 0.75rem 0 0; padding: 0.6rem 0 0; border-top: 1px dashed #c9b98f; }
.read-next[hidden] { display: none; }
.read-next-head { margin: 0; font-size: 0.95rem; font-weight: 700; color: inherit; }
.read-next-tabs { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; }
.read-next-tabs > button { grid-column: span var(--rn-span, 2); min-width: 0; min-height: 40px; padding: 0 3px; border: 1px solid #c9b98f; border-radius: 10px; background: #fff; color: #1F3A6E; font: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.read-next-tabs > button[aria-pressed="true"] { border-color: #1F3A6E; background: #eef2fa; box-shadow: inset 0 -3px 0 #c9a24b; }
@container (min-width: 480px) {
  .read-next-tabs { grid-template-columns: repeat(var(--rn-n, 5), minmax(0, 1fr)); }
  .read-next-tabs > button { grid-column: auto; }
}
.read-next-body { display: grid; gap: 0.5rem; }
.read-next-body[hidden], .read-next-panel[hidden] { display: none; }
.read-next-panel { display: grid; gap: 0.5rem; }
.read-next-note { margin: 0; font-size: 0.85rem; color: inherit; opacity: 0.85; }
.read-next-sub { margin: 0.25rem 0 0; font-size: 0.9rem; font-weight: 700; color: inherit; }
.read-next-item { display: grid; gap: 0.25rem; padding: 0.5rem 0.6rem; border: 1px solid #e3dcc8; border-radius: 10px; background: #fffdf7; color: #222; min-width: 0; overflow-wrap: anywhere; }
.read-next-item p { margin: 0; }
.read-next-item .rn-ref { font-weight: 700; color: #1F3A6E; }
.read-next-item .rn-ar { font-family: "KFGQPC Uthmanic Script HAFS", "Amiri Quran", "Amiri", "Noto Naskh Arabic", serif; font-size: 1.2rem; line-height: 1.9; text-align: right; }
.read-next-item .rn-small { font-size: 0.82rem; color: #555; }
a.read-next-go, a.read-next-item { color: #1F3A6E; text-decoration: none; }
a.read-next-go { display: inline-flex; align-items: center; justify-self: start; min-height: 40px; padding: 0 0.8rem; border: 1px solid #1F3A6E; border-radius: 10px; font-weight: 600; }
a.read-next-item { min-height: 40px; }
a.read-next-item:hover, a.read-next-go:hover { background: #eef2fa; }
.read-next-group > summary { min-height: 40px; display: flex; align-items: center; cursor: pointer; font-weight: 700; color: inherit; }
.read-next-group > div { display: grid; gap: 0.4rem; }
/* The night look (audit part 146): no near-white tab, box or button inside the dark page; the card's own night palette. */
[data-card-look="night"] .read-next-tabs > button { background: var(--card-bg-inset); color: var(--card-text); border-color: var(--card-line); }
[data-card-look="night"] .read-next-tabs > button[aria-pressed="true"] { background: var(--card-bg); color: var(--card-heading); border-color: var(--card-heading); }
[data-card-look="night"] .read-next-item { background: var(--card-bg-inset); color: var(--card-text); border-color: var(--card-line); }
[data-card-look="night"] .read-next-item .rn-ref, [data-card-look="night"] a.read-next-go, [data-card-look="night"] a.read-next-item { color: var(--card-heading); }
[data-card-look="night"] .read-next-item .rn-small { color: var(--card-text-muted); }
[data-card-look="night"] a.read-next-go { border-color: var(--card-heading); }
[data-card-look="night"] a.read-next-item:hover, [data-card-look="night"] a.read-next-go:hover { background: var(--card-bg); }
`;
function ensureStyle(doc) {
  if (doc.getElementById("readNextStyle")) return;
  const style = doc.createElement("style");
  style.id = "readNextStyle";
  style.textContent = CSS;
  doc.head.appendChild(style);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function arabic(tag, cls, text) {
  const e = el(tag, cls, text);
  e.lang = "ar"; e.dir = "rtl";
  return e;
}
/** HadeethEnc text may be Arabic, English or Bangla (it falls back): the browser takes the direction from the text. */
function autoDir(tag, cls, text) {
  const e = el(tag, cls, text);
  e.dir = "auto";
  return e;
}
const note = (text) => el("p", "read-next-note", text);
async function resolve(v) { return typeof v === "function" ? v() : v; }

/** Draws the box into `host` (appended) and returns it. Safe to call on any card; draws nothing if ctx fills no tab. */
export function renderReadNext(host, ctx = {}) {
  ensureStyle(host.ownerDocument ?? document);
  const tabs = tabsFor(ctx);
  const box = el("section", "read-next");
  box.dataset.readNext = tabs.join(",");
  if (!tabs.length) { box.hidden = true; host.appendChild(box); return box; }
  const head = el("h3", "read-next-head", t("Read next"));
  const bar = el("div", "read-next-tabs");
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", t("Read next"));
  const body = el("div", "read-next-body");
  body.hidden = true;
  const panels = new Map();
  // A narrow card (below 480px of box) lays the tabs out on a 6-column grid in tidy rows -- five as 3 + 2 -- and a
  // wider one puts them all on one row (the container query in CSS). Never a ragged wrap.
  bar.style.setProperty("--rn-n", String(tabs.length));
  const spans = NARROW_SPANS[tabs.length];
  tabs.forEach((key, i) => {
    const b = el("button", null, t(LABELS[key]));
    b.type = "button";
    b.dataset.readNextTab = key;
    b.setAttribute("aria-pressed", "false");
    b.style.setProperty("--rn-span", String(spans[i]));
    b.addEventListener("click", () => {
      const open = b.getAttribute("aria-pressed") === "true";
      for (const x of bar.children) x.setAttribute("aria-pressed", "false");
      for (const p of panels.values()) p.hidden = true;
      if (open) { body.hidden = true; return; } // a second tap closes it
      b.setAttribute("aria-pressed", "true");
      body.hidden = false;
      if (!panels.has(key)) {
        const panel = el("div", "read-next-panel");
        panel.dataset.readNextPanel = key;
        panels.set(key, panel);
        body.appendChild(panel);
        fillPanel(key, panel, ctx);
      }
      panels.get(key).hidden = false;
    });
    bar.appendChild(b);
  });
  box.append(head, bar, body);
  host.appendChild(box);
  return box;
}

function fillPanel(key, panel, ctx) {
  const wait = note(t("Loading…"));
  panel.appendChild(wait);
  const job = { quran: quranPanel, hadith: hadithPanel, dictionary: dictionaryPanel, scholars: scholarsPanel, tafsir: tafsirPanel }[key];
  job(panel, ctx).then(() => { panel.dataset.readNextLoaded = "true"; }, (err) => {
    console.error(err);
    panel.appendChild(note(t("This could not be loaded just now. Try again later.")));
    panel.dataset.readNextLoaded = "error";
  }).finally(() => wait.remove());
}

async function quranPanel(panel, ctx) {
  const refs = uniqueAyahRefs(await resolve(ctx.quran) ?? []);
  if (!refs.length) { panel.appendChild(note(t("No āyāt are linked to this card yet."))); return; }
  const lang = getAppLang();
  for (const [s, a] of refs) {
    const item = el("div", "read-next-item");
    item.dataset.readNextAyah = `${s}:${a}`;
    const surah = await getSurah(s).catch(() => null);
    const ayah = surah?.ayahs?.find((x) => x.ayah === a);
    item.appendChild(el("span", "rn-ref", `${num(s)}:${num(a)}${surah ? ` · ${surahName(s, surah.surahNameEnglish)}` : ""}`));
    if (ayah?.uthmaniText) item.appendChild(arabic("p", "rn-ar", ayah.uthmaniText));
    const tr = ayah?.translations?.[lang === "bn" ? "bn" : "en"];
    if (tr) item.appendChild(el("p", "rn-small", tr));
    const go = el("a", "read-next-go", t("Open the āyah"));
    go.href = ayahHref([s, a], ctx.backTo ?? null);
    go.dataset.readNextAyahLink = `${s}:${a}`;
    item.appendChild(go);
    panel.appendChild(item);
  }
}

async function hadithPanel(panel, ctx) {
  const got = await resolve(ctx.hadith);
  const { shown, more } = Array.isArray(got) ? otherHadith([got], ctx.self ?? null) : (got ?? { shown: [], more: 0 });
  if (!shown.length) { panel.appendChild(note(t("No other hadith in our books quotes the same āyah."))); return; }
  panel.appendChild(note(t("From the app's āyah–hadith index: hadith whose words quote the same āyah.")));
  const lang = getAppLang();
  const described = await Promise.all(shown.map((h) => describeHit(h)));
  for (const d of described) {
    const a = el("a", "read-next-item");
    a.href = hadithHref(d);
    a.dataset.readNextHadith = `${d.book}:${d.n}`;
    const title = (lang === "bn" ? d.titleAr : d.titleEn) || d.titleEn || d.titleAr || d.book;
    a.appendChild(el("span", "rn-ref", `${title} ${num(d.number ?? d.standard ?? "")}`.trim()));
    if (d.firstLine) a.appendChild(arabic("span", "rn-ar", d.firstLine));
    a.appendChild(el("span", "rn-small", t("quotes the same āyah")));
    panel.appendChild(a);
  }
  if (more > 0) panel.appendChild(note(t("and {count} more", { count: num(more) })));
  panel.appendChild(note(t("Source: OpenITI (CC BY-NC-SA 4.0)")));
}

async function dictionaryPanel(panel, ctx) {
  const lang = getAppLang();
  const words = wordMeanings(await resolve(ctx.words));
  let shownAny = false;
  if (words.length) {
    shownAny = true;
    panel.appendChild(el("p", "read-next-sub", t("Meanings given with this hadith (HadeethEnc)")));
    for (const w of words) {
      const item = el("div", "read-next-item");
      item.dataset.readNextWord = w.word;
      item.appendChild(autoDir("p", null, w.word ? `${w.word}: ${w.meaning}` : w.meaning));
      panel.appendChild(item);
    }
  }
  const lemmas = (await resolve(ctx.lemmas)) ?? [];
  if (lemmas.length) {
    const [en, bn] = await Promise.all([
      loadLemmaDictionary().catch(() => null),
      lang === "bn" ? loadBanglaLemmaDictionary().catch(() => null) : Promise.resolve(null),
    ]);
    const { entries } = dictionaryEntries(lemmas, en, bn);
    if (entries.length) {
      shownAny = true;
      panel.appendChild(el("p", "read-next-sub", ctx.lemmasFrom ?? t("Dictionary words")));
      panel.appendChild(note(t("English: Wiktionary. Bangla: Quraniyo Obhidhan (credit the book on every use).")));
      for (const e of entries) {
        const item = el("div", "read-next-item");
        item.dataset.readNextLemma = e.lemma;
        item.appendChild(arabic("p", "rn-ar", e.lemma));
        item.appendChild(el("span", null, entryMeaning(e, lang)));
        panel.appendChild(item);
      }
    }
  }
  if (!shownAny) panel.appendChild(note(t("No dictionary words are recorded for this card yet.")));
}

function scholarRow(s, lang, extra) {
  const item = el("div", "read-next-item");
  item.dataset.readNextScholar = s.id;
  item.appendChild(el("span", "rn-ref", `${scholarName(s, lang)}${lifeLine(s) ? ` · ${lifeLine(s)}` : ""}`));
  if (s.ar) item.appendChild(arabic("span", "rn-small", s.ar));
  if (extra) item.appendChild(el("span", null, extra));
  item.appendChild(el("span", "rn-small", `${t("Approaches")}: ${s.approaches.join(" · ") || "—"} · ${s.id}`));
  return item;
}

async function scholarsPanel(panel, ctx) {
  const data = await loadTafsirScholars();
  const lang = getAppLang();
  if (ctx.scholars === "hadith+tafsir") {
    panel.appendChild(el("p", "read-next-sub", t("The compiler of this book")));
    const c = ctx.compilerBook ? compilerOf(data, ctx.compilerBook) : null;
    if (c) panel.appendChild(scholarRow(c, lang, c.quranWork ? `${t("On the Qur'an")}: ${c.quranWork}` : null));
    else panel.appendChild(note(t("The Scholars Database does not name this book's compiler yet.")));
  }
  panel.appendChild(el("p", "read-next-sub", t("Scholars who wrote a tafsīr, by Approach")));
  panel.appendChild(note(t("From your Scholars Database (v1.5), as it records them; not yet checked.")));
  groupByApproach(tafsirScholars(data)).forEach((g, i) => {
    const d = el("details", "read-next-group");
    d.dataset.readNextApproach = g.approach;
    if (i === 0) d.open = true;
    d.appendChild(el("summary", null, `${t("Approach")}: ${g.approach || "—"} (${num(g.scholars.length)})`));
    const list = el("div");
    for (const s of g.scholars) list.appendChild(scholarRow(s, lang, s.tafsir.join("; ")));
    d.appendChild(list);
    panel.appendChild(d);
  });
}

async function tafsirPanel(panel, ctx) {
  const info = (await resolve(ctx.tafsir)) ?? {};
  const ex = hadithExplanation(typeof info === "object" ? info : null);
  if (ex) {
    if (ex.explanation) {
      const d = el("details", "read-next-group");
      d.dataset.readNextExplanation = "true";
      d.appendChild(el("summary", null, t("Explanation of the hadith (HadeethEnc)")));
      d.appendChild(autoDir("p", "read-next-item", ex.explanation));
      panel.appendChild(d);
    }
    if (ex.hints.length) {
      const d = el("details", "read-next-group");
      d.dataset.readNextBenefits = String(ex.hints.length);
      d.appendChild(el("summary", null, t("What the hadith teaches (HadeethEnc)")));
      const ul = autoDir("ul", "read-next-item", null);
      for (const h of ex.hints) ul.appendChild(el("li", null, h));
      d.appendChild(ul);
      panel.appendChild(d);
    }
  }
  const p = note(t("The tafsīr texts are not in the app yet; adding them is a later data step."));
  p.dataset.readNextTafsirMissing = "true";
  panel.appendChild(p);
  const ayat = uniqueAyahRefs(typeof info === "object" ? info.ayat ?? [] : []);
  panel.appendChild(el("p", "read-next-sub", ayat.length
    ? t("Where to read the tafsīr of {refs}", { refs: ayat.map(([s, a]) => `${num(s)}:${num(a)}`).join(", ") })
    : t("Where to read the tafsīr")));
  const data = await loadTafsirScholars();
  const lang = getAppLang();
  for (const { title, scholar } of whereToRead(data)) {
    const item = el("div", "read-next-item");
    item.dataset.readNextTafsir = scholar.id;
    item.appendChild(el("span", "rn-ref", title));
    item.appendChild(el("span", "rn-small", `${scholarName(scholar, lang)}${lifeLine(scholar) ? ` · ${lifeLine(scholar)}` : ""}`));
    panel.appendChild(item);
  }
}
