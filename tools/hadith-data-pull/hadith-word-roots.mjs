// Builds output/hadith-words/quran-forms.json: every Arabic form the Qur'an uses (word forms AND dictionary words),
// normalised exactly as app/js/hadith-words.js normalises a hadith word, mapped to "root|surah:ayah:position".
// Only forms with ONE root are kept; a form under two roots is left out and counted (never guessed).
// Run from the repository root: node tools/hadith-data-pull/hadith-word-roots.mjs
import fs from "node:fs";
import { normaliseArabic } from "../../app/js/hadith-words.js";
const Q = "tools/quran-data-pull/output/surahs/";
const forms = new Map(); // norm -> { roots:Set, ref, root }
// A rootless use (a particle: عن, من, أن) is recorded as the "" root, so a form the Qur'an ALSO uses as a particle is
// ambiguous and left out: it must never be taken for the rooted word it merely resembles.
function add(norm, root, ref) {
  if (!norm) return;
  const e = forms.get(norm);
  if (!e) forms.set(norm, { roots: new Set([root]), root, ref });
  else e.roots.add(root);
}
for (const f of fs.readdirSync(Q).filter((x) => /^surah_\d+\.json$/.test(x)).sort()) {
  const s = JSON.parse(fs.readFileSync(Q + f, "utf8"));
  for (const a of s.ayahs) for (const w of a.words) {
    const root = w.morphology?.root || "";
    const ref = `${s.surahNumber}:${a.ayah}:${w.position}`;
    add(normaliseArabic(w.arabic), root, ref);
    const lemma = (w.morphology.lemma || "").replace(/[#^]/g, "");
    if (lemma) add(normaliseArabic(lemma), root, ref);
  }
}
const values = {}; let ambiguous = 0;
for (const [k, e] of [...forms].sort((a, b) => a[0].localeCompare(b[0]))) {
  if (e.roots.size === 1 && e.root) values[k] = `${e.root}|${e.ref}`; else ambiguous++;
}
const out = { source: "tools/quran-data-pull/output/surahs", normaliser: "app/js/hadith-words.js normaliseArabic",
  note: "form -> root|surah:ayah:position (first occurrence); forms under two roots, or also used as a rootless particle, are omitted", entryCount: Object.keys(values).length, ambiguousOmitted: ambiguous, values };
fs.writeFileSync("tools/hadith-data-pull/output/hadith-words/quran-forms.json", JSON.stringify(out));
console.log("forms kept", out.entryCount, "ambiguous omitted", ambiguous, "bytes", fs.statSync("tools/hadith-data-pull/output/hadith-words/quran-forms.json").size);
