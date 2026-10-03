// Word card rebuild, round 6 (decision 59) -- the word-forms index for Search.
//
// Reads only the local surah files (no network) and writes
// output/word-forms-index.json, ON DEMAND (I9): the Word card's Search loads it
// the first time the reader presses Search, never at startup.
//
//   forms: one row per EXACT WRITTEN FORM,
//          [arabic, transliteration, en, bn, [occurrence ids...]]
//
// The written form is the word's `arabic` without a trailing pause mark (and
// the space before it) and without a leading ۞ (the quarter-hizb sign). Every
// other mark stays, so تَعْلَمُونَ and تَّعْلَمُونَ are separate forms.
// Occurrence ids use the same encoding as word-identity-index-manifest.json:
// surah*1000000 + ayah*1000 + position. Transliteration and meaning are the
// most frequent ones among a form's occurrences.
//
// Run: node tools/quran-data-pull/build-word-forms-index.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "output");

export const PAUSE_MARKS = "ۖۗۘۙۚۛ";

// A trailing sajda sign (۩) and invisible direction marks are not part of the word either.
const TRAILING = `${PAUSE_MARKS}۩‌-‏`;

/** The exact written form of one word, or "" if nothing is left. */
export function writtenForm(arabic) {
  return String(arabic)
    .replace(/^۞\s*/, "")
    .replace(new RegExp(`[\\s${TRAILING}]+$`), "")
    // a few words are written with an inner space (بَعْدَ مَا): joined, so no form holds a space
    .replace(/\s+/g, "");
}

function mostFrequent(counts) {
  let best = "", bestN = 0;
  for (const [value, n] of counts) if (n > bestN) { best = value; bestN = n; }
  return best;
}

export function buildForms(surahsDir = path.join(OUT, "surahs")) {
  const byForm = new Map();
  for (let s = 1; s <= 114; s++) {
    const data = JSON.parse(fs.readFileSync(path.join(surahsDir, `surah_${String(s).padStart(3, "0")}.json`), "utf8"));
    for (const ayah of data.ayahs) {
      for (const w of ayah.words || []) {
        const form = writtenForm(w.arabic);
        if (!form) continue;
        if (!byForm.has(form)) byForm.set(form, { tr: new Map(), en: new Map(), bn: new Map(), ids: [] });
        const row = byForm.get(form);
        const bump = (m, v) => m.set(v ?? "", (m.get(v ?? "") || 0) + 1);
        bump(row.tr, w.transliteration);
        bump(row.en, w.translation?.en);
        bump(row.bn, w.translation?.bn);
        row.ids.push(s * 1000000 + ayah.ayah * 1000 + w.position);
      }
    }
  }
  return [...byForm].map(([form, r]) => [form, mostFrequent(r.tr), mostFrequent(r.en), mostFrequent(r.bn), r.ids]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const forms = buildForms();
  const file = path.join(OUT, "word-forms-index.json");
  fs.writeFileSync(file, JSON.stringify({ contract: "word-forms-index:v1", loadBoundary: "on-demand-only", indexEncoding: "surah*1000000+ayah*1000+position", forms }));
  console.log(`word-forms-index.json: ${forms.length} forms, ${fs.statSync(file).size} bytes`);
}
