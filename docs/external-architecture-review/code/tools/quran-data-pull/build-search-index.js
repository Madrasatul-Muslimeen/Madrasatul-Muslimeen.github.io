// Builds the word/phrase search indexes (shell round 14, 15 Aug 2026).
//
// The owner asked for a Search that reaches the WHOLE Qur'an in all three
// languages. The obvious shape -- one file with everything in it -- is 4.3MB
// raw, and a phone would pay for all three languages to search in one. So it
// is THREE files, one per language, and the app fetches only the one that
// matches the script the person actually typed in (Latin -> en, Bengali ->
// bn, Arabic -> ar). See app/js/quran-search.js.
//
//   search-en.json   904KB raw   ~276KB over the wire (GitHub Pages gzips)
//   search-bn.json  2084KB raw   ~346KB
//   search-ar.json  1340KB raw   ~262KB
//
// None of these is ever on the startup path. They are fetched the first time
// someone presses Search, which is exactly what the load-speed contract's
// "screensaver, About, resources: on first use" row allows.
//
// Text is stored EXACTLY as it appears in the surah files -- originals, not
// normalised. Matching needs a normalised form (lowercased for en/bn, and
// for Arabic stripped of the small marks above and below the letters, which
// nobody types), but normalising here would mean shipping both forms and
// doubling the file. The client normalises once on load and keeps it in
// memory instead. Displaying a result needs the original anyway.
//
//   node tools/quran-data-pull/build-search-index.js
//
// Re-run this whenever pull.js re-packages the surah files.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT = path.join(__dirname, "output");
const SURAHS = path.join(OUT, "surahs");

// One number per ayah instead of a [surah, ayah] pair: surah*1000+ayah packs
// both without ambiguity (surah <= 114, ayah <= 286) and costs far fewer
// bytes than a nested array 6,236 times over.
const packRef = (surah, ayah) => surah * 1000 + ayah;

const langs = { en: [], bn: [], ar: [] };
const refs = [];

for (let n = 1; n <= 114; n++) {
  const file = path.join(SURAHS, `surah_${String(n).padStart(3, "0")}.json`);
  const surah = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const a of surah.ayahs) {
    refs.push(packRef(n, a.ayah));
    langs.en.push(a.translations?.en ?? "");
    langs.bn.push(a.translations?.bn ?? "");
    // ﻿ really is present at the head of some uthmani strings in the
    // packaged data; it would otherwise ride along into every search hit.
    langs.ar.push((a.uthmaniText ?? "").replace(/﻿/g, ""));
  }
}

const kb = (bytes) => (bytes / 1024).toFixed(0) + "KB";
console.log(`${refs.length} ayahs indexed.`);

for (const [lang, texts] of Object.entries(langs)) {
  const body = JSON.stringify({ lang, count: refs.length, refs, texts });
  const target = path.join(OUT, `search-${lang}.json`);
  fs.writeFileSync(target, body);
  const empty = texts.filter((s) => !s.trim()).length;
  console.log(
    `  search-${lang}.json  ${kb(Buffer.byteLength(body))} raw, ` +
      `${kb(zlib.gzipSync(body, { level: 9 }).length)} gzipped` +
      (empty ? `  (${empty} ayahs have no text in this language)` : "")
  );
}
