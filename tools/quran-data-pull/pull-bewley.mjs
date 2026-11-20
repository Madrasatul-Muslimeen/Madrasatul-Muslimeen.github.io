// The Noble Qur'an, a New Rendering of its Meaning in English, by Abdalhaqq and Aisha Bewley: the hizb the translators have up NOW.
//
// The Owner, 20 Nov 2026: "Keep doing now for every month, until, In Shaa Allah, I will buy a pdf and upload here later."
// aishabewley.org/quran puts up ONE hizb a month and only one at a time ("There will only be one hizb up at a time"), set the way the printed
// book sets it: a verse number at the first line of each verse, one indent step per nested line, a blank line between stanzas. This script reads
// the current hizb, keeps that layout, and ADDS the sūrahs/āyāt it carries to tools/quran-data-pull/output/bewley/ (what is already there stays:
// each month only adds). The app reads those files (app/js/quran-data.js) only when the reader chooses Bewley as the English translation.
//
// Rights: the translators publish this text for reading on their own site and state no terms for reuse. It is here on the Owner's instruction
// (see docs/governance/bewley-translation.md), credited, and is to be REPLACED by the licensed edition the Owner is buying. Nothing here claims it as ours.
//
//   node tools/quran-data-pull/pull-bewley.mjs                 reads https://aishabewley.org/quran, then the hizb it names
//   node tools/quran-data-pull/pull-bewley.mjs --file page.html [--hizb 38]   reads a saved hizb page (tests, or a page fetched by hand)
//   node tools/quran-data-pull/pull-bewley.mjs --dry           parse and report, write nothing
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "output", "bewley");
const SURAH_INDEX = path.join(HERE, "output", "surah-index.json");
const SITE = "https://aishabewley.org";

const decode = (s) => s.replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'").replace(/&rsquo;|&lsquo;/g, "'");

/** The page's margin-left (px) as an indent step. The site writes 40px for a verse's first line, 120px for the first nested line, then +20px each step. */
export function indentStep(ml) {
  if (ml == null || ml <= 40) return 0;
  if (ml <= 120) return 1;
  return 1 + Math.round((ml - 120) / 20);
}

/**
 * Parse one hizb page into { hizb, surahs: { n: { ayahs: { verse: { lines: [{ i, t }], gap } } } } }.
 *   a heading "26. Surat ash-Shu'ara' - The Poets" starts sūrah 26;
 *   a paragraph "105   text" starts verse 105 (its number is not part of the text); a paragraph with no number continues the verse before it;
 *   an empty paragraph is the book's stanza break: `gap: true` on the NEXT verse.
 * Throws on anything that does not look like a hizb page, so a changed site never writes bad data.
 */
export function parseHizbPage(htmlText, hizbHint = null) {
  const found = Number((/Hizb\s+(\d+)/i.exec(htmlText) || [])[1]) || null;
  const hizb = hizbHint ?? found;
  const body = htmlText.slice(Math.max(0, htmlText.search(/Hizb\s+\d+/i)));
  const blocks = [...body.matchAll(/<p([^>]*)>([\s\S]*?)(?=<p[\s>]|<\/blockquote>|<\/body>|$)/gi)];
  const surahs = {};
  let cur = null, last = null, pendingGap = false, verses = 0;
  for (const [, attrs, inner] of blocks) {
    const text = decode(inner.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    const ml = Number((/margin-left:\s*(\d+)px/i.exec(attrs) || [])[1]) || null;
    if (!text) { if (last) pendingGap = true; continue; }
    const head = /^(\d{1,3})\.\s*Surat\b/i.exec(text);
    if (head) { cur = Number(head[1]); surahs[cur] ??= { ayahs: {} }; last = null; pendingGap = false; continue; }
    if (/^in the name of allah/i.test(text) || /^return to home page/i.test(text)) continue;
    if (cur == null) continue;
    const m = /^(\d{1,3})\s+(\S.*)$/.exec(text);
    if (m && (ml == null || ml <= 40)) {
      const v = Number(m[1]);
      surahs[cur].ayahs[v] = { lines: [{ i: 0, t: m[2].trim() }] };
      if (pendingGap) surahs[cur].ayahs[v].gap = true;
      last = v; pendingGap = false; verses++;
    } else if (last != null) {
      surahs[cur].ayahs[last].lines.push({ i: indentStep(ml), t: text });
      pendingGap = false;
    }
  }
  if (!verses) throw new Error("no verses found: the page does not look like a hizb page");
  return { hizb, surahs };
}

function curl(url) {
  return execFileSync("curl", ["-sS", "-L", "-m", "40", "-A", "MMSA-Bewley-monthly-pull (personal study app)", url], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}

/** Add the parsed hizb to the files already there. Returns a summary. Verifies every verse number is inside its sūrah. */
export function mergeIntoOutput(parsed, { dry = false, out = OUT, surahIndexPath = SURAH_INDEX } = {}) {
  const idx = JSON.parse(fs.readFileSync(surahIndexPath, "utf8"));
  const count = (n) => (Array.isArray(idx) ? idx : idx.surahs).find((s) => (s.surahNumber ?? s.number) === n)?.ayahCount;
  const summary = [];
  fs.mkdirSync(out, { recursive: true });
  const indexPath = path.join(out, "index.json");
  const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, "utf8")) : { source: "aishabewley.org", hizbs: [], surahs: {} };
  for (const [n, data] of Object.entries(parsed.surahs)) {
    const total = count(Number(n));
    if (!total) throw new Error(`sūrah ${n} is not in the sūrah index`);
    const file = path.join(out, `surah_${String(n).padStart(3, "0")}.json`);
    const have = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { surah: Number(n), ayahs: {} };
    let added = 0;
    for (const [v, a] of Object.entries(data.ayahs)) {
      if (Number(v) < 1 || Number(v) > total) throw new Error(`sūrah ${n}: verse ${v} is outside 1-${total}`);
      if (JSON.stringify(have.ayahs[v]) !== JSON.stringify(a)) added++;
      have.ayahs[v] = a;
    }
    const nums = Object.keys(have.ayahs).map(Number).sort((x, y) => x - y);
    summary.push({ surah: Number(n), verses: Object.keys(data.ayahs).length, changed: added, now: nums.length, of: total });
    index.surahs[n] = { ayahs: nums, of: total };
    if (!dry) { const sorted = {}; for (const k of nums) sorted[k] = have.ayahs[k]; fs.writeFileSync(file, JSON.stringify({ surah: Number(n), ayahs: sorted }) + "\n"); }
  }
  if (parsed.hizb && !index.hizbs.includes(parsed.hizb)) index.hizbs.push(parsed.hizb);
  index.hizbs.sort((a, b) => a - b);
  index.updated = new Date().toISOString().slice(0, 10);
  index.credit = "The Noble Qur'an: A New Rendering of its Meaning in English, by Abdalhaqq and Aisha Bewley (aishabewley.org)";
  if (!dry) fs.writeFileSync(indexPath, JSON.stringify(index, null, 1) + "\n");
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };
  const dry = process.argv.includes("--dry");
  let html, hizb = arg("hizb") ? Number(arg("hizb")) : null;
  if (arg("file")) html = fs.readFileSync(arg("file"), "utf8");
  else {
    const home = curl(`${SITE}/quran`);
    const link = /href=['"]\/?(quran\d+)['"]/i.exec(home);
    if (!link) throw new Error("aishabewley.org/quran names no current hizb (the page changed?)");
    hizb = Number(link[1].replace("quran", ""));
    console.log(`The current hizb is ${hizb}`);
    html = curl(`${SITE}/${link[1]}`);
  }
  const parsed = parseHizbPage(html, hizb);
  const summary = mergeIntoOutput(parsed, { dry });
  console.log(`Hizb ${parsed.hizb ?? "?"}: ${summary.map((s) => `sūrah ${s.surah}: ${s.verses} verses read (${s.changed} new or changed; ${s.now} of ${s.of} held)`).join("; ")}${dry ? " [dry run, nothing written]" : ""}`);
}
