// Shell round 23 — build the bundled Qur'an typefaces.
//
// Why this exists at all: `.ayah-arabic` asked for `'Traditional Arabic',
// 'Amiri', serif` and NEITHER was bundled, so every phone showed whatever it
// happened to have — which is exactly why the Arabic looked different on the
// owner's device from the app they compared it with.
//
// Why we subset it OURSELVES rather than linking Google Fonts:
//   1. Google's own woff2 subsets are cut by unicode-range for Latin-first
//      pages. Measured during this round, they render Qur'anic marks
//      differently from the complete font.
//   2. The app already has one hard dependency on a third-party host
//      (archive.org, for every recitation) and that host is the prime suspect
//      in the owner's "Play doesn't work" report. Adding fonts.gstatic.com
//      would be a second host that can fail independently of our own.
//      Self-hosted means: if the app loads at all, the font loads.
//
// The subset is driven by the ACTUAL TEXT we ship — every codepoint in every
// ayah of `tools/quran-data-pull/output`, which came to 74 — and keeps ALL
// OpenType layout features (`--layout-features='*'`), because Arabic shaping
// and mark positioning live in those tables and dropping them is what turns
// a Qur'an font into mush.
//
// Verified when written: the subset renders IDENTICALLY to the full original.
//
//   pip install fonttools brotli
//   node tools/fonts/build-fonts.mjs
//
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");
const surahs = join(repo, "tools", "quran-data-pull", "output", "surahs");
const out = join(repo, "app", "fonts");
const work = join(here, "_work");

// google/fonts serves the complete, unsubsetted originals. All three are OFL.
const FACES = [
  ["scheherazade", "ofl/scheherazadenew/ScheherazadeNew-Regular.ttf"],
  ["notonaskh", "ofl/notonaskharabic/NotoNaskhArabic%5Bwght%5D.ttf"],
  ["amiriquran", "ofl/amiriquran/AmiriQuran-Regular.ttf"],
];

/** Every codepoint the shipped Qur'an text actually uses — ayah text, the
 *  word-by-word words, and the surah names. Nothing else needs to be in a
 *  font whose only job is displaying the Qur'an. */
function codepoints() {
  const set = new Set();
  const eat = (s) => { for (const ch of s || "") set.add(ch.codePointAt(0)); };
  for (let n = 1; n <= 114; n++) {
    const d = JSON.parse(readFileSync(join(surahs, `surah_${String(n).padStart(3, "0")}.json`), "utf8"));
    eat(d.surahNameArabic);
    for (const a of d.ayahs) {
      eat(a.uthmaniText);
      for (const w of a.words || []) eat(w.arabic);
    }
  }
  return [...set].sort((a, b) => a - b);
}

mkdirSync(work, { recursive: true });
mkdirSync(out, { recursive: true });

const cps = codepoints();
const listFile = join(work, "codepoints.txt");
writeFileSync(listFile, cps.map((c) => "U+" + c.toString(16).toUpperCase().padStart(4, "0")).join(","));
console.log(`${cps.length} distinct codepoints in the whole Qur'an text`);

for (const [slug, path] of FACES) {
  const ttf = join(work, `${slug}.ttf`);
  execFileSync("curl", ["-sSL", "--max-time", "120", "-o", ttf,
    `https://raw.githubusercontent.com/google/fonts/main/${path}`]);
  execFileSync("python3", ["-m", "fontTools.subset", ttf,
    `--unicodes-file=${listFile}`,
    "--layout-features=*",   // Arabic shaping and mark positioning live here
    "--notdef-glyph", "--notdef-outline", "--recommended-glyphs",
    "--name-IDs=*",          // keep the licence and family names in the file
    "--flavor=woff2",
    `--output-file=${join(out, `${slug}.woff2`)}`]);
  const size = readFileSync(join(out, `${slug}.woff2`)).length;
  console.log(`${slug.padEnd(14)} ${String(size).padStart(7)} bytes (${Math.round(size / 1024)}KB)`);
}
