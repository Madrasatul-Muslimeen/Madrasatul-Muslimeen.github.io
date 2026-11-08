// J03 K3 "Study Next" (named "Read next" until K3b, 5 Nov 2026) -- the PURE half (no DOM, no fetch). read-next-ui.js draws the box; this file decides what goes
// in it, so the choices can be checked without a browser (tools/i18n-verify/read-next.mjs).
//
// The five tabs, in the order the Owner approved in the keys demo v2 (4 Nov 2026): Qur'an, Hadith, Dictionary,
// Scholars, Tafsīr. A card names only the tabs it can fill; a tab it leaves out is not drawn.
import { lemmaDictionaryEntry } from "./lemma-dictionary.js";

export const READ_NEXT_TABS = Object.freeze(["quran", "hadith", "dictionary", "scholars", "tafsir", "eras"]);
export const READ_NEXT_HADITH_LIMIT = 8;

/** The tabs a ctx fills, in the fixed order. Eras (J115) is there only when the card gives `eras`. Dictionary is there when the card gives lemmas or word meanings. */
export function tabsFor(ctx = {}) {
  const has = (v) => v !== undefined && v !== null && v !== false;
  return READ_NEXT_TABS.filter((k) => (k === "dictionary" ? has(ctx.lemmas) || has(ctx.words) : has(ctx[k])));
}

/** "36:38", [36, 38] or { surah, ayah } -> [36, 38], or null when it is not an āyah reference. */
export function parseAyahRef(ref) {
  let s, a;
  if (Array.isArray(ref)) [s, a] = ref;
  else if (ref && typeof ref === "object") ({ surah: s, ayah: a } = ref);
  else if (typeof ref === "string") [s, a] = ref.split(":");
  s = Number(s); a = Number(a);
  return Number.isInteger(s) && Number.isInteger(a) && s >= 1 && s <= 114 && a >= 1 ? [s, a] : null;
}

/** Āyah references, parsed, in their first order, each once. */
export function uniqueAyahRefs(refs = []) {
  const seen = new Set(), out = [];
  for (const r of refs) {
    const p = parseAyahRef(r);
    if (!p || seen.has(p.join(":"))) continue;
    seen.add(p.join(":")); out.push(p);
  }
  return out;
}

/** The Read view at an āyah, with the way back (decision 86): quranrevival.html shows "← Back to …". */
export function ayahHref([s, a], backTo = null, base = "./quranrevival.html") {
  return `${base}?goto=${s}:${a}&back=1${backTo ? `&backTo=${encodeURIComponent(backTo)}` : ""}`;
}

/** The Hadith library at one narration, with the way back (back=1 shows ← Back on hadith-collections.html). */
export function hadithHref(hit, base = "./hadith-collections.html") {
  return `${base}?openiti=${encodeURIComponent(hit.book)}&passage=${hit.n}&back=1`;
}

/** The hadith that quote the same āyāt: every list joined, each narration once, the card's own narration left out,
 *  the book-labelled finds first (as the Āyah card orders them), capped with the count left over. */
export function otherHadith(lists = [], self = null, limit = READ_NEXT_HADITH_LIMIT) {
  const seen = new Set(), all = [];
  if (self) seen.add(`${self.book}:${self.n}`);
  for (const list of lists) {
    for (const h of list ?? []) {
      const k = `${h.book}:${h.n}`;
      if (seen.has(k)) continue;
      seen.add(k); all.push(h);
    }
  }
  const sorted = all.map((h, i) => [h, i]).sort((x, y) => {
    const lx = x[0].test === "label" ? 0 : 1, ly = y[0].test === "label" ? 0 : 1;
    return lx - ly || x[1] - y[1];
  }).map(([h]) => h);
  return { shown: sorted.slice(0, limit), more: Math.max(0, sorted.length - limit) };
}

/** HadeethEnc's `words_meanings`, in any of the shapes it comes in, as [{ word, meaning }] -- never reordered, never
 *  invented. A plain string item keeps its text as the meaning with no word. */
export function wordMeanings(wm) {
  if (!wm) return [];
  const clean = (s) => String(s ?? "").trim();
  if (Array.isArray(wm)) {
    return wm.map((x) => (typeof x === "string" ? { word: "", meaning: clean(x) } : { word: clean(x?.word), meaning: clean(x?.meaning) }))
      .filter((x) => x.word || x.meaning);
  }
  if (typeof wm === "object") return Object.entries(wm).map(([word, meaning]) => ({ word: clean(word), meaning: clean(meaning) }));
  return clean(wm) ? [{ word: "", meaning: clean(wm) }] : [];
}

/** Dictionary entries for lemmas (as `word.morphology.lemma` holds them): each lemma once, in its first order, with the
 *  English (Wiktionary) and Bangla (Quraniyo Obhidhan) meaning where the app's dictionary has one. `missing` counts the
 *  lemmas neither dictionary holds, so the card can say so rather than drop them silently. */
export function dictionaryEntries(lemmas = [], enDict = null, bnDict = null) {
  const seen = new Set(), entries = [];
  let missing = 0;
  for (const raw of lemmas) {
    if (!raw) continue;
    const lemma = String(raw).normalize("NFC");
    if (seen.has(lemma)) continue;
    seen.add(lemma);
    const en = lemmaDictionaryEntry(enDict, lemma);
    const bn = lemmaDictionaryEntry(bnDict, lemma);
    const bnText = Array.isArray(bn?.m) ? bn.m.join("; ") : (bn?.m ?? null);
    if (!en?.m && !bnText) { missing++; continue; }
    entries.push({ lemma, en: en?.m ?? null, enUrl: en?.u ?? null, bn: bnText || null });
  }
  return { entries, missing };
}

/** The meaning to show in the reader's language, falling back to the other dictionary when one has none. */
export function entryMeaning(entry, lang) {
  return lang === "bn" ? (entry.bn ?? entry.en) : (entry.en ?? entry.bn);
}

/** The approach number at the start of an Approach text ("30 Gen1" -> 30), or Infinity for one with none ("Gen5"). */
export function approachNumber(text) {
  const m = /^(\d+)\b/.exec(String(text ?? ""));
  return m ? Number(m[1]) : Infinity;
}

/** Scholars grouped by Approach. Each scholar sits under the FIRST Approach the database records for them (its own
 *  order), so no one is listed twice; the card shows all of their Approaches on their row. Groups go by Approach
 *  number, then those without one in the order met; scholars keep the database's (time) order. */
export function groupByApproach(scholars = []) {
  const groups = new Map();
  for (const s of scholars) {
    const key = s.approaches?.[0] ?? "";
    if (!groups.has(key)) groups.set(key, { approach: key, scholars: [], first: groups.size });
    groups.get(key).scholars.push(s);
  }
  return [...groups.values()]
    .sort((a, b) => approachNumber(a.approach) - approachNumber(b.approach) || a.first - b.first)
    .map(({ approach, scholars: list }) => ({ approach, scholars: list }));
}

export function tafsirScholars(data) {
  return (data?.scholars ?? []).filter((s) => s.roles?.includes("tafsir"));
}

/** The compiler of an OpenITI book, from the data file's `books` map, or null when the database has none for it. */
export function compilerOf(data, bookId) {
  const id = data?.books?.[bookId];
  return id ? (data.scholars ?? []).find((s) => s.id === id) ?? null : null;
}

/** A scholar's name in the reader's language; the database has few Bangla names, so English is the fallback. */
export function scholarName(s, lang) {
  return (lang === "bn" && s?.bn) || s?.en || "";
}

/** The life dates as the database writes them: "AH · CE", whichever exist. */
export function lifeLine(s) {
  return [s?.lifeAH, s?.lifeCE].filter(Boolean).join(" · ");
}

/** "Where to read" for the Tafsīr tab: one row per tafsīr title, with its author, in the database's order. */
export function whereToRead(data) {
  const out = [];
  for (const s of tafsirScholars(data)) for (const title of s.tafsir ?? []) out.push({ title, scholar: s });
  return out;
}

/** K3b (the Owner, 5 Nov 2026): a scholar's name opens THAT scholar's own row of the Scholars Database (by its fixed
 *  id, s001…), in a new tab, with ← Back. The database page lives in the repository (docs/reference/scholars-database),
 *  served by GitHub Pages; the absolute address keeps it working from QR's site too. */
export const SCHOLARS_DB_PAGE = "https://madrasatul-muslimeen.github.io/docs/reference/scholars-database/Scholars%20Database%20-%20v1.6.html";
export function scholarHref(id, page = SCHOLARS_DB_PAGE) {
  return /^s\d{3}$/.test(String(id ?? "")) ? `${page}?s=${id}&back=1` : null;
}

/** K3b (the Owner, 5 Nov 2026): one tafsīr book's link straight to āyah s:a, from app/data/tafsir-links.json, or null
 *  when the book has no per-āyah text online (the card then says "not online yet"). */
export function tafsirLinkHref(links, link, s, a) {
  const pattern = link?.site ? links?.sites?.[link.site]?.pattern : null;
  if (!pattern || !link.book || !Number.isInteger(s) || !Number.isInteger(a)) return null;
  return pattern.replace("{book}", encodeURIComponent(link.book)).replace("{s}", String(s)).replace("{a}", String(a));
}

/** The link entry for one tafsīr title of one scholar, or null when the list does not name it. */
export function tafsirLinkFor(links, scholarId, title) {
  return (links?.links ?? []).find((l) => l.scholar === scholarId && l.title === title) ?? null;
}

/** A HadeethEnc record's explanation and benefits, or null when it has neither. */
export function hadithExplanation(record) {
  if (!record) return null;
  const explanation = String(record.explanation ?? "").trim();
  const hints = (record.hints ?? []).map((h) => String(h).trim()).filter(Boolean);
  return explanation || hints.length ? { explanation, hints } : null;
}
