// Dua groups, scored (issue 709). dua-index.mjs groups narrations by shared word 3-grams, connected sets, so one shared
// phrase can chain a DIFFERENT dua into a group (dua 2, Sayyid al-Istighfar, holds five narrations of "رب اغفر لي وتب
// علي"). This tool scores every member of every dua group so a person checking the groups sees the doubtful ones first.
// A PROPOSAL for a person to confirm, never a decision.
//
// SCORE. The share (0-1, 2 places) of the dua's OWN words that appear in the member's text. The dua's own words are the
// vowels-<page>.json word list with the vowels stripped when the dua has one, otherwise the anchor narration's matn.
// Words are compared as a set, after the normalisation hadith-concordance.mjs already uses (normaliseArabic), the same
// one dua-index.mjs groups with.
//
// MATN RULE (the trap). OpenITI's " * " normally marks where the chain ends, but not always: al-Nasa'i's 'Amal al-Yawm
// 467 carries its only "*" in a page note at the very end, "( * 345 آ )", so the text after it is three tokens while the
// narration is the whole Sayyid al-Istighfar. The text after the first " * " is used only when it holds at least
// MATN_MIN_WORDS (8) Arabic words; otherwise the WHOLE text is used. The same rule picks the anchor's matn.
//
// FLAGS. "short": the member's whole text has fewer than SHORT_WORDS (5) Arabic words (too little to score).
// "low": share below LOW_BELOW, chosen from the printed distribution (see the PR).
//
// STORES ids and numbers only, no text: output/dua/fit-<page>.json, one per cards-<page>.json, same paging:
//   { schemaVersion, page, duas: { "<dua>": [[share, flag?], ...] } }   one entry per member, in `members` order;
// flag is "short" or "low", and the entry is just [share] when there is none.
// Usage (repository root): node tools/hadith-data-pull/dua-group-fit.mjs [--out <dir>] [--pages 1,2]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normaliseArabic } from "./hadith-concordance.mjs";
import { DUA_CHAPTER_RULES } from "./dua-index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DUA = path.join(__dirname, "output", "dua");
const SPLIT = path.join(__dirname, "output", "openiti-release", "split");

export const MATN_MIN_WORDS = 8;
export const SHORT_WORDS = 5;
export const LOW_BELOW = 0.5;

const words = (t) => normaliseArabic(t).split(" ").filter(Boolean);

/** The text to score: after the first " * " when that holds a matn, else the whole text. */
export function matnOf(text) {
  const i = String(text).indexOf(" * ");
  if (i >= 0) {
    const rest = text.slice(i + 3);
    if (words(rest).length >= MATN_MIN_WORDS) return rest;
  }
  return String(text);
}

/** Share (0-1, 2 places) of `own` (normalised words) found in `text`'s matn. */
export function share(own, text) {
  const set = new Set(words(matnOf(text)));
  const uniq = [...new Set(own)];
  if (!uniq.length) return 0;
  return Math.round((uniq.filter((w) => set.has(w)).length / uniq.length) * 100) / 100;
}

export function flagOf(sh, text) {
  if (words(text).length < SHORT_WORDS) return "short";
  return sh < LOW_BELOW ? "low" : null;
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

function textLoader() {
  const books = new Map();
  return (bookIdx, n) => {
    const uri = DUA_CHAPTER_RULES[bookIdx].versionUri;
    if (!books.has(uri)) {
      const m = new Map();
      const dir = path.join(SPLIT, uri);
      for (const f of fs.readdirSync(dir).filter((x) => /^ch-.*\.json$/.test(x))) for (const h of readJson(path.join(dir, f)).hadiths) m.set(h.n, h.text);
      books.set(uri, m);
    }
    return books.get(uri).get(n) ?? "";
  };
}

export function fitPage(page, load, dir = DUA) {
  const { cards } = readJson(path.join(dir, `cards-${page}.json`));
  const vf = path.join(dir, `vowels-${page}.json`);
  const vowels = fs.existsSync(vf) ? readJson(vf).duas : {};
  const duas = {};
  for (const c of cards) {
    const v = vowels[c.dua];
    const own = v ? v.v.map(normaliseArabic).filter(Boolean) : words(matnOf(load(c.anchor[0], c.anchor[1])));
    duas[c.dua] = c.members.map((m) => {
      const text = load(m[0], m[1]);
      const sh = share(own, text);
      const fl = flagOf(sh, text);
      return fl ? [sh, fl] : [sh];
    });
  }
  return { schemaVersion: 1, page, duas };
}

function main() {
  const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const out = arg("--out") ? path.resolve(arg("--out")) : DUA;
  const only = arg("--pages") ? arg("--pages").split(",").map(Number) : null;
  const pages = fs.readdirSync(DUA).filter((f) => /^cards-\d+\.json$/.test(f)).map((f) => Number(f.match(/\d+/)[0])).sort((a, b) => a - b)
    .filter((p) => !only || only.includes(p));
  fs.mkdirSync(out, { recursive: true });
  const load = textLoader();
  let nDua = 0, withLow = 0, withShort = 0, low = 0, short = 0, members = 0;
  const hist = new Array(20).fill(0);
  for (const p of pages) {
    const f = fitPage(p, load);
    fs.writeFileSync(path.join(out, `fit-${p}.json`), JSON.stringify(f) + "\n");
    for (const arr of Object.values(f.duas)) {
      nDua++;
      const l = arr.filter((e) => e[1] === "low").length, s = arr.filter((e) => e[1] === "short").length;
      low += l; short += s; members += arr.length; if (l) withLow++; if (s) withShort++;
      if (arr.length > 1) for (const e of arr) hist[Math.min(19, Math.floor(e[0] * 20))]++;
    }
  }
  console.log(`${nDua} duas, ${members} members, ${pages.length} pages -> ${out}`);
  console.log(`duas with any low member: ${withLow} (${low} low members); with any short member: ${withShort} (${short} short members)`);
  console.log("share distribution, members of duas with 2+ members (bucket: count):");
  hist.forEach((c, i) => console.log(`  ${(i / 20).toFixed(2)}-${((i + 1) / 20).toFixed(2)}: ${c}`));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
