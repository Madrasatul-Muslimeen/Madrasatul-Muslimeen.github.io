// The Dua index, first cut (decision 87, round H-DB4; research report §2 and §4.4).
//
// STEP 1, THE DUA CHAPTERS. Which passages of the 15 OpenITI books are in a Dua chapter, found by each book's own
// headings exactly as the research report located them (§2's table): Bukhari's Kitab ad-Da'awat, Muslim's Kitab
// adh-Dhikr wa'd-Du'a, Tirmidhi's Kitab ad-Da'awat, Nasa'i's Kitab al-Isti'adha, Riyad as-Salihin's Kitab al-Adhkar
// and Kitab ad-Da'awat, Ibn Majah's Kitab ad-Du'a (22 babs from "1 باب فضل الدعاء", rebuilt where the bab number
// restarts at 1), Abu Dawud's babs 337-368 (the Witr section), ad-Darimi's babs whose titles name du'a, dhikr,
// tasbih or istighfar, and three books that are Dua books from cover to cover: al-Nasa'i's and Ibn al-Sunni's
// 'Amal al-Yawm wa'l-Layla and al-Nawawi's al-Adhkar.
//
// STEP 2, ONE DUA, MANY NARRATIONS (§4.4). Narrations are grouped when they share the same words: a pair is joined
// when at least JOIN of the smaller one's word 3-grams (narrator chains, i.e. 3-grams in more than MAX_POSTING of
// these passages, ignored) are in the other. Groups are the connected sets. This is a PROPOSAL for a person to
// confirm, never a decision (§4.4: "proposed by the computer and confirmed by a person"); nothing reads it as fact.
//
// WHAT IT STORES. Ids and numbers only: output/dua/index.json.
// Usage (repository root): node tools/hadith-data-pull/dua-index.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shingles } from "./hadith-concordance.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPLIT = path.join(__dirname, "output", "openiti-release", "split");
const CONC = path.join(__dirname, "output", "concordance");
const OUT = path.join(__dirname, "output", "dua");

export const JOIN = 0.3;
export const MAX_POSTING = 40;

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

/** Each book's Dua chapters: a rule over its index's chapters (title + edition numbers). */
/** A short, language-keyed name for each book (I11), as a reader cites it: shown on "Also narrated in" links. */
export const SHORT_NAMES = Object.freeze({
  "0256Bukhari.Sahih.JK000110-ara1": { en: "Bukhari", bn: "বুখারী" },
  "0261Muslim.Sahih.Shamela0001727-ara1": { en: "Muslim", bn: "মুসলিম" },
  "0279Tirmidhi.Sunan.JK000140-ara1": { en: "Tirmidhi", bn: "তিরমিযী" },
  "0303Nasai.SunanSughra.JK000130-ara1": { en: "Nasa'i", bn: "নাসাঈ" },
  "0676Nawawi.RiyadSalihin.Shamela0012014-ara1": { en: "Riyad as-Salihin", bn: "রিয়াদুস সালিহীন" },
  "0273IbnMaja.Sunan.JK000141-ara1": { en: "Ibn Majah", bn: "ইবনু মাজাহ" },
  "0275AbuDawudSijistani.Sunan.JK000142-ara1": { en: "Abu Dawud", bn: "আবু দাউদ" },
  "0255CabdAllahDarimi.Sunan.JK000842-ara1": { en: "ad-Darimi", bn: "দারিমী" },
  "0303Nasai.CamalYawmWaLayla.JK000735-ara1": { en: "Nasa'i, 'Amal al-Yawm", bn: "নাসাঈ, আমালুল ইয়াওম" },
  "0364IbnSunniDinawari.CamalYawmWaLayl.JK000943-ara1": { en: "Ibn as-Sunni", bn: "ইবনুস সুন্নী" },
  "0676Nawawi.Adhkar.JK001249-ara1": { en: "an-Nawawi's al-Adhkar", bn: "নববীর আল-আযকার" },
});

export const DUA_CHAPTER_RULES = Object.freeze([
  { versionUri: "0256Bukhari.Sahih.JK000110-ara1", label: "Kitab ad-Da'awat", pick: (cs) => cs.filter((c) => /كتاب الدعوات/.test(c.title)) },
  { versionUri: "0261Muslim.Sahih.Shamela0001727-ara1", label: "Kitab adh-Dhikr wa'd-Du'a", pick: (cs) => cs.filter((c) => /كتاب الذكر والدعاء/.test(c.title)) },
  { versionUri: "0279Tirmidhi.Sunan.JK000140-ara1", label: "Kitab ad-Da'awat", pick: (cs) => cs.filter((c) => /كتاب الدعوات/.test(c.title)) },
  { versionUri: "0303Nasai.SunanSughra.JK000130-ara1", label: "Kitab al-Isti'adha", pick: (cs) => cs.filter((c) => /كتاب الاستعاذة/.test(c.title)) },
  { versionUri: "0676Nawawi.RiyadSalihin.Shamela0012014-ara1", label: "Kitab al-Adhkar, Kitab ad-Da'awat", pick: (cs) => cs.filter((c) => /كتاب (الأذكار|الدعوات)/.test(c.title)) },
  { versionUri: "0273IbnMaja.Sunan.JK000141-ara1", label: "Kitab ad-Du'a", pick: (cs) => {
    const i = cs.findIndex((c) => /^\s*1 باب فضل الدعاء/.test(c.title));
    if (i < 0) return [];
    let j = i + 1;
    while (j < cs.length && !/^\s*1 باب/.test(cs[j].title)) j++;
    return cs.slice(i, j);
  } },
  { versionUri: "0275AbuDawudSijistani.Sunan.JK000142-ara1", label: "Witr section, babs 337-368", pick: (cs) => cs.filter((c) => c.firstNumber >= 1416 && c.firstNumber <= 1555) },
  { versionUri: "0255CabdAllahDarimi.Sunan.JK000842-ara1", label: "babs on du'a, dhikr, tasbih, istighfar", pick: (cs) => cs.filter((c) => /الدعاء|الدعوات|الذكر|التسبيح|الاستغفار|يدعو|دعا/.test(c.title)) },
  { versionUri: "0303Nasai.CamalYawmWaLayla.JK000735-ara1", label: "the whole book", pick: (cs) => cs },
  { versionUri: "0364IbnSunniDinawari.CamalYawmWaLayl.JK000943-ara1", label: "the whole book", pick: (cs) => cs },
  { versionUri: "0676Nawawi.Adhkar.JK001249-ara1", label: "the whole book", pick: (cs) => cs },
]);

function passagesOf(uri, chapters) {
  const out = [];
  for (const ch of chapters) for (const f of ch.shardFiles) {
    const shard = readJson(path.join(SPLIT, uri, f));
    for (const h of shard.hadiths) if (h.kind === "hadith" || h.kind === "passage") {
      const trail = shard.paths?.[h.p] ?? [];
      out.push({ uri, n: h.n, number: h.kind === "hadith" ? h.number ?? null : null, text: h.text, heading: trail[trail.length - 1] ?? "" });
    }
  }
  return out;
}

/** Pure: passages -> groups (arrays of indexes, largest first), joined by shared words. */
export function groupNarrations(passages, { join = JOIN, maxPosting = MAX_POSTING } = {}) {
  const sets = passages.map((p) => shingles(p.text));
  const postings = new Map();
  sets.forEach((s, i) => { for (const g of s) { let a = postings.get(g); if (!a) postings.set(g, (a = [])); a.push(i); } });
  const parent = passages.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (let i = 0; i < sets.length; i++) {
    const counts = new Map();
    for (const g of sets[i]) {
      const p = postings.get(g);
      if (!p || p.length > maxPosting) continue;
      for (const j of p) if (j > i) counts.set(j, (counts.get(j) ?? 0) + 1);
    }
    for (const [j, c] of counts) {
      const small = Math.min(sets[i].size, sets[j].size);
      if (small >= 4 && c / small >= join) parent[find(i)] = find(j);
    }
  }
  const groups = new Map();
  passages.forEach((_, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i); });
  return [...groups.values()].sort((a, b) => b.length - a.length || a[0] - b[0]);
}

// ---------------------------------------------------------------------------
// STEP 3, PERMANENT DUA NUMBERS (decision 88: progress is saved under dua:<n>, counted once per dua). A unit key is
// permanent (I5), but the groups above are recomputed on every run, so their order and even their membership can
// change. output/dua/registry.json therefore remembers, for every narration ever placed in a numbered dua, the number
// it was given. A group takes the number its narrations already carry (the smallest, if a re-run merged two; the
// other is RETIRED, never reused); a group with no numbered narration gets the next new number. A number is never
// given to a second dua.
// ---------------------------------------------------------------------------

/** Pure. groups: arrays of narration keys ("<versionUri>:<n>"); registry: { next, byNarration, retired }. */
export function assignDuaNumbers(groups, registry = { next: 1, byNarration: {}, retired: [] }) {
  const reg = { next: registry.next ?? 1, byNarration: { ...(registry.byNarration ?? {}) }, retired: [...(registry.retired ?? [])] };
  const taken = new Set();
  const numbers = groups.map((keys) => {
    const known = [...new Set(keys.map((k) => reg.byNarration[k]).filter((x) => x != null))].sort((a, b) => a - b);
    let n = known.find((x) => !taken.has(x));
    if (n == null) n = reg.next++;
    for (const x of known) if (x !== n && !taken.has(x) && !reg.retired.includes(x)) reg.retired.push(x);
    taken.add(n);
    for (const k of keys) if (reg.byNarration[k] == null || reg.byNarration[k] !== n && !taken.has(reg.byNarration[k])) reg.byNarration[k] = n;
    return n;
  });
  // A number some group still uses is not retired.
  reg.retired = reg.retired.filter((x) => !taken.has(x)).sort((a, b) => a - b);
  return { numbers, registry: reg };
}

/** "( 2 باب أفضل الاستغفار" -> "باب أفضل الاستغفار": the bab's own words, without its number or a stray bracket. */
export function cleanHeading(h) {
  return String(h ?? "").replace(/^[\s(\-*]*\d*\s*[-–]?\s*/, "").replace(/\s*[)]\s*$/, "").replace(/\s+/g, " ").trim();
}

export const CARDS_PER_FILE = 40;
const TEXT_MAX = 1400;

function main() {
  const books = [];
  const all = [];
  for (const rule of DUA_CHAPTER_RULES) {
    const index = readJson(path.join(SPLIT, rule.versionUri, "index.json"));
    const chapters = rule.pick(index.chapters);
    const ps = passagesOf(rule.versionUri, chapters);
    let label = null, std = new Map();
    const cf = path.join(CONC, `${rule.versionUri}.json`);
    if (fs.existsSync(cf)) {
      const c = readJson(cf);
      label = c.label;
      const col = c.columns.indexOf(c.citeColumn);
      std = new Map(c.entries.map((r) => [r[0], String(r[col]).replace(c.citeColumn === "abdulBaqiNumber" ? /\.\d+$/ : /$^/, "")]));
    }
    books.push({ versionUri: rule.versionUri, titleEn: index.titleEn, titleAr: index.titleAr, label, short: SHORT_NAMES[rule.versionUri], where: rule.label,
      chapterIds: chapters.map((c) => c.id), narrations: ps.length });
    for (const p of ps) all.push({ ...p, std: std.get(p.n) ?? null });
  }
  const groups = groupNarrations(all);
  fs.mkdirSync(OUT, { recursive: true });
  const out = {
    schemaVersion: 1,
    note: "Generated by tools/hadith-data-pull/dua-index.mjs. A PROPOSAL: narrations grouped by shared words, to be confirmed by a person (research report §4.4).",
    method: `word 3-grams; a pair joins at >= ${JOIN} of the smaller one's 3-grams; 3-grams in more than ${MAX_POSTING} passages ignored`,
    books,
    columns: ["versionUri index", "n", "standard number or null", "the edition's own hadith number or null"],
    groups: groups.map((g) => g.map((i) => [DUA_CHAPTER_RULES.findIndex((r) => r.versionUri === all[i].uri), all[i].n, all[i].std, all[i].number])),
  };
  // Permanent numbers.
  const keyOf = (i) => `${all[i].uri}:${all[i].n}`;
  const regFile = path.join(OUT, "registry.json");
  const prev = fs.existsSync(regFile) ? readJson(regFile) : undefined;
  const { numbers, registry } = assignDuaNumbers(groups.map((g) => g.map(keyOf)), prev);
  out.duaNumbers = numbers;
  fs.writeFileSync(regFile, JSON.stringify({ schemaVersion: 1,
    note: "Generated by tools/hadith-data-pull/dua-index.mjs. Each narration's permanent dua number (unit key dua:<n>, decision 88). Never edit a number by hand; a number is never reused.",
    ...registry }) + "\n");
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(out) + "\n");

  // The cards (the Dua tab's "Duas" view), most-narrated first, CARDS_PER_FILE to a file so a page loads one file.
  const heByKey = new Map();
  const LINKS = path.join(__dirname, "output", "hadeethenc-links");
  for (const b of books) {
    const f = path.join(LINKS, `${b.versionUri}.json`);
    if (!fs.existsSync(f)) continue;
    for (const [n, id] of readJson(f).entries) { const k = `${b.versionUri}:${n}`; if (!heByKey.has(k)) heByKey.set(k, []); heByKey.get(k).push(id); }
  }
  const bookIdx = (uri) => DUA_CHAPTER_RULES.findIndex((r) => r.versionUri === uri);
  const order = groups.map((g, gi) => gi).sort((a, b) => groups[b].length - groups[a].length || numbers[a] - numbers[b]);
  const cards = order.map((gi) => {
    const g = groups[gi];
    const anchor = g.find((i) => all[i].std != null) ?? g[0];
    const a = all[anchor];
    const he = [...new Set(g.flatMap((i) => heByKey.get(keyOf(i)) ?? []))];
    return {
      dua: numbers[gi],
      heading: cleanHeading(a.heading),
      text: a.text.length > TEXT_MAX ? `${a.text.slice(0, TEXT_MAX)}…` : a.text,
      anchor: [bookIdx(a.uri), a.n, a.std, a.number],
      members: g.map((i) => [bookIdx(all[i].uri), all[i].n, all[i].std, all[i].number]),
      hadeethenc: he,
    };
  });
  for (const f of fs.readdirSync(OUT).filter((x) => /^cards-\d+\.json$/.test(x))) fs.rmSync(path.join(OUT, f));
  const files = Math.ceil(cards.length / CARDS_PER_FILE);
  for (let k = 0; k < files; k++) {
    fs.writeFileSync(path.join(OUT, `cards-${k + 1}.json`), JSON.stringify({ schemaVersion: 1, page: k + 1, cards: cards.slice(k * CARDS_PER_FILE, (k + 1) * CARDS_PER_FILE) }) + "\n");
  }
  fs.writeFileSync(path.join(OUT, "cards.json"), JSON.stringify({ schemaVersion: 1,
    note: "Generated by tools/hadith-data-pull/dua-index.mjs: the Duas view's pages. Arabic from OpenITI (CC BY-NC-SA 4.0).",
    books: books.map((b) => ({ versionUri: b.versionUri, titleEn: b.titleEn, titleAr: b.titleAr, short: b.short })),
    columns: ["book index", "n", "standard number or null", "the edition's own hadith number or null"],
    cardsPerFile: CARDS_PER_FILE, cards: cards.length, files }) + "\n");
  const multi = groups.filter((g) => g.length > 1);
  const multiBook = groups.filter((g) => new Set(g.map((i) => all[i].uri)).size > 1);
  console.log(`${all.length} narrations in ${books.length} books -> ${groups.length} groups (${multi.length} with 2+ narrations, ${multiBook.length} across 2+ books)`);
  for (const b of books) console.log(`  ${b.titleEn}: ${b.narrations} narrations (${b.where})`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
