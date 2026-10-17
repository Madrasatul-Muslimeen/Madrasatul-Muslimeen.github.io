// Builds app/js/asma-poster-data.js: everything the Asmaul Husna poster (decision 85) needs that the Name data does
// not already carry. Run from the repository root:  node tools/asma-poster/build-poster-data.mjs
//
//  - descriptions: docs/reference/2026-10-01-asma-poster-descriptions.json (word for word from the Owner's archive
//    posters), matched to a Name by its Arabic (diacritics ignored), then by its transliteration. Wording follows the
//    Owner's own template (docs/reference/2026-10-07-asma-poster-template-al-witr.png): "Lord" -> "RABB", "God" (a
//    deity) -> "deity (Ilaha)" (decision 49, in the template's own form). Every changed sentence is listed in REWORDED.
//    Al-Witr's description is the template's own text.
//  - surah names: tools/quran-data-pull/output/surah-index.json (English names), for "Quran 112:1, Surah Al-Ikhlaas".
import fs from "node:fs";
import { ASMA_NAMES } from "../../../app/js/asma-data.js";
import { DEFAULT_EXTRA_ASMA_NAMES } from "../../../app/js/asma-collections-data.js";

// PCA J110: QR's generator lives with QR's own files in MSA. Paths are from the MSA repository root; it writes QR's
// copy of the poster data (apps/qr/site/app/js/asma-poster-data.js), never MSA's app/js. --check compares that file,
// or the one --file=<path> names (the ported check passes the BUILT app's file).
const ROOT = new URL("../../../", import.meta.url).pathname;
const OUT = process.argv.find((a) => a.startsWith("--file="))?.slice(7) || ROOT + "apps/qr/site/app/js/asma-poster-data.js";
const J = JSON.parse(fs.readFileSync(ROOT + "docs/reference/2026-10-01-asma-poster-descriptions.json", "utf8"));
const surahs = JSON.parse(fs.readFileSync(ROOT + "tools/quran-data-pull/output/surah-index.json", "utf8"));
const normAr = (s) => String(s || "").replace(/[ً-ٰٟـ]/g, "").replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, "").trim();
const normTr = (s) => String(s || "").toLowerCase().replace(/^(al|ar|as|ash|at|ad|an|az|adh|ath|aal)[- ]/, "").replace(/[^a-z]/g, "")
  .replace(/ee/g, "i").replace(/oo/g, "u").replace(/aa/g, "a").replace(/(.)\1/g, "$1");
const byAr = new Map(), byTr = new Map();
for (const e of J.entries) { if (!byAr.has(normAr(e.arabic))) byAr.set(normAr(e.arabic), e); if (!byTr.has(normTr(e.transliteration))) byTr.set(normTr(e.transliteration), e); }

// The Owner's template text for Al-Witr, word for word.
const WITR = "The One, the Only, the Single. He has no partners. He is the only deity worthy of worship and only creator and RABB of the universe. He has no equal in His essence, names, attributes and actions. The One Who loves everything odd in number which He has ordained. He is One and Unique and loves to be singled out as the One True deity (Ilaha) Who exclusively deserves to be worshipped.";
// The template's own replacements, applied sentence by sentence and listed.
const REPLACE = [
  [/\bthe only true god\b/g, "the only true deity (Ilaha)"],
  [/\bthe only true God\b/g, "the only true deity (Ilaha)"],
  [/\bThe Sovereign Lord\b/g, "The Sovereign RABB"],
  [/\bThe One and Only God, Lord of all of Creation\b/g, "The One and Only deity (Ilaha), RABB of all of Creation"],
];

// QR J01 R5 (QR is this data's home, PCA J71): spelling and grammar slips in the archive posters, fixed here (the
// transcription keeps the posters' text as printed). The smallest change each, meaning kept; every one is listed in
// POSTER_REWORDED for the Owner. [Name number, "description" or "meaning", as printed, fixed]
const TYPOS = [
  [9, "meaning", "The Compellor & Restorer", "The Compeller & Restorer"],
  [14, "description", "The One forgives those", "The One who forgives those"],
  [26, "description", "each and everyone of their", "each and every one of their"],
  [28, "description", "an atoms weight", "an atom's weight"],
  [28, "description", "greater that the magnitude", "greater than the magnitude"],
  [56, "description", "laws commands and prohibitions", "laws, commands and prohibitions"],
  [76, "description", "The One Who us keenly discerning", "The One Who is keenly discerning"],
  [108, "description", "turns to to satisfy", "turns to satisfy"],
  [110, "description", "by which arranges all affairs", "by which He arranges all affairs"],
  [110, "description", "when He will a thing to be", "when He wills a thing to be"],
  [110, "description", "upon the whatever strength", "upon whatever strength"],
  [124, "description", "He alone who holds the keys", "He alone holds the keys"],
  [132, "description", "absolutely independent upon who all depend", "absolutely independent, upon whom all depend"],
];
// QR J01 R5b: Allah's (132) meaning line. The poster prints it in curly braces, "{The Grand Name}"; the archive's file
// name says "The Proper Name". The owner's Q8 (pending; the QR Architect's default A). One line to change:
//   A "The Grand Name"   B "{The Grand Name}" (as printed)   C "The Proper Name"
const MEANING_132 = "The Grand Name";

let typosApplied = 0;
const fixTypos = (number, field, text) => {
  for (const [n, f, from, to] of TYPOS) {
    if (n !== number || f !== field) continue;
    if (!text.includes(from)) throw new Error(`typo fix ${n} ${f}: "${from}" is not in the text`);
    const sentence = (t, w) => (field === "meaning" ? t : t.match(new RegExp(`[^.]*${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^.]*\\.?`))?.[0]?.trim() ?? w);
    const next = text.replace(from, to);
    reworded.push({ number: n, from: sentence(text, from), to: sentence(next, to), why: "spelling or grammar (QR J01 R5)" });
    text = next;
    typosApplied++;
  }
  return text;
};

const descriptions = {};
const meanings = {};
const arabics = {};
const reworded = [];
const missing = [];
for (const n of [...ASMA_NAMES, ...DEFAULT_EXTRA_ASMA_NAMES]) {
  // The transliteration fallback may never pair a Name with a poster of a DIFFERENT Arabic word: "Al-Maalik" (112, المالك)
  // and "Al-Maleek" (113, المليك) both reduce to "malik", so 112 was given 113's poster word for word (PCA, 16 Oct 2026).
  const byT = byTr.get(normTr(n.transliteration));
  const e = byAr.get(normAr(n.arabic)) || (byT && (!n.arabic || !byT.arabic || normAr(byT.arabic) === normAr(n.arabic)) ? byT : null);
  if (!e) { missing.push(`${n.number} ${n.transliteration}`); continue; }
  let text = e.description.replace(/\s+/g, " ").trim();
  if (n.transliteration === "Al-Witr") { if (text !== WITR) reworded.push({ number: n.number, from: text, to: WITR, why: "the Owner's template text" }); text = WITR; }
  for (const [re, to] of REPLACE) {
    const next = text.replace(re, to);
    if (next !== text) { reworded.push({ number: n.number, from: text.match(new RegExp(`[^.]*${re.source}[^.]*\\.`))?.[0] ?? re.source, to: next.match(new RegExp(`[^.]*${to.replace(/[()]/g, "\\$&")}[^.]*\\.`))?.[0] ?? to, why: "decision 49, in the template's form" }); text = next; }
  }
  text = fixTypos(n.number, "description", text);
  if (/\b(Lord|God|god)\b/.test(text)) throw new Error(`unreplaced Lord/God in ${n.transliteration}: ${text}`);
  descriptions[n.number] = text;
  // The poster's own English meaning line ("The One"); the 99-Name list's meaning is the fallback in the renderer.
  // The poster's Arabic is the archive poster's, fully vowelled (the template's الوِتْر; the Name list writes الوتر).
  if (e.arabic) arabics[n.number] = String(e.arabic).trim();
  if (n.number === 132 && e.meaning && MEANING_132 !== String(e.meaning).trim()) {
    reworded.push({ number: 132, from: String(e.meaning).trim(), to: MEANING_132, why: "the owner's Q8 (QR J01 R5b)" });
    meanings[132] = MEANING_132;
  } else if (e.meaning) meanings[n.number] = fixTypos(n.number, "meaning", String(e.meaning).replace(/\bLord\b/g, "RABB").replace(/\bGod\b/g, "deity (Ilaha)").trim());
}

const out = `// GENERATED by tools/asma-poster/build-poster-data.mjs -- do not edit by hand; edit the sources it names and re-run.
// The Asmaul Husna poster's own data (Owner decision 85): descriptions by Name number, and the English Surah names.
// ${Object.keys(descriptions).length} Names have a description; ${missing.length} have none yet (the poster says so): ${missing.join(", ")}.

export const POSTER_DESCRIPTIONS = Object.freeze(${JSON.stringify(descriptions, null, 1)});

/** The poster's Arabic, fully vowelled, from the same archive posters. */
export const POSTER_ARABIC = Object.freeze(${JSON.stringify(arabics, null, 1)});

/** The poster's English meaning line, from the same archive posters. */
export const POSTER_MEANINGS = Object.freeze(${JSON.stringify(meanings, null, 1)});

/** English Surah names, index = Surah number - 1 (surah-index.json's nameEnglish). */
export const POSTER_SURAH_NAMES = Object.freeze(${JSON.stringify(surahs.map((s) => s.nameEnglish))});

/** Every sentence reworded from the archive posters, for the Owner to check (decision 49). */
export const POSTER_REWORDED = Object.freeze(${JSON.stringify(reworded, null, 1)});
`;
if (typosApplied !== TYPOS.length) throw new Error(`${TYPOS.length - typosApplied} typo fix(es) found no Name to apply to`);
// QR J01 R5: --check writes nothing and fails if app/js/asma-poster-data.js is not what this would write (npm test).
if (process.argv.includes("--check")) {
  const ok = fs.readFileSync(OUT, "utf8") === out;
  console.log(`${ok ? "ok  " : "FAIL"} app/js/asma-poster-data.js is what tools/asma-poster/build-poster-data.mjs writes`);
  process.exit(ok ? 0 : 1);
}
fs.writeFileSync(OUT, out);
console.log(`descriptions ${Object.keys(descriptions).length}, missing ${missing.length}, reworded ${reworded.length}`);
for (const r of reworded) console.log(`  ${r.number}: ${r.from}\n      -> ${r.to}`);
