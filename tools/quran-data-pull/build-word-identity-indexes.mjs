// ADR-007 — deterministic, on-demand indexes for Quran word identity v1.
// Packed occurrence references are an index encoding only; the permanent ID
// is reconstructed as quran-word-occurrence:v1:{surah}:{ayah}:{position}.

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "output");
const surahsDir = join(outDir, "surahs");
const files = readdirSync(surahsDir).filter((f) => /^surah_\d{3}\.json$/.test(f)).sort();
const pack = (surah, ayah, position) => surah * 1_000_000 + ayah * 1_000 + position;
const roots = new Map();
const lemmas = new Map();
// v08.22 -- lemma -> grammatical category counts, read from `morphology.pos`.
//
// `pos` describes a WRITTEN TOKEN, not a dictionary form: it is a " + "-joined
// chain of the attached proclitics, the head word, and any attached pronoun
// ("Determiner + Noun", "Conjunction + Verb + Pronoun"). Measured across the
// whole packaged corpus: 359 distinct strings built from 46 distinct segments.
// The HEAD -- the last segment that is not "Pronoun" -- is the category of the
// word itself, and taking it drops the lemmas carrying more than one category
// from 2,067 of 4,832 to 416; 4,416 (91.4%) then have exactly one.
//
// The remaining 416 are real ambiguity in the source, not noise, so every
// attested category is kept with its own count and the reader is told when a
// form has more than one. Nothing here is inferred from spelling.
const lemmaPos = new Map();
const headOf = (pos) => {
  const segs = String(pos).split(" + ").map((s) => s.trim()).filter(Boolean);
  for (let i = segs.length - 1; i >= 0; i--) if (segs[i] !== "Pronoun") return segs[i];
  return segs.length ? "Pronoun" : "";
};
// Word Card derived-form meanings -- lemma -> the most frequent TIDIED
// word-by-word gloss, per language, read from `translation.en`/`translation.bn`.
// A gloss glosses a WRITTEN TOKEN ("and they thank"), so it is tidied before it
// is counted: brackets dropped (their words kept), quote marks and trailing
// punctuation dropped, whitespace collapsed, and a leading separate conjunction
// word ("and"/"so"/"then"; "এবং"/"আর"/"অতঃপর") removed. A gloss that tidies to
// nothing is not counted, and a language with no gloss is omitted, never guessed.
const lemmaGloss = new Map();
const tidyGloss = (raw, lang) => {
  let g = String(raw ?? "").replace(/[()\[\]]/g, " ").replace(/["“”‘’']/g, "").replace(/\s+/g, " ").trim();
  const lead = lang === "bn" ? /^(এবং|আর|অতঃপর)\s+/ : /^(and|so|then)\s+/i;
  while (lead.test(g)) g = g.replace(lead, "");
  g = g.replace(/[\s.,;:!?،؛…-]+$/u, "").trim();
  return g;
};
let occurrences = 0;
let missingRoot = 0;
let missingLemma = 0;

function append(map, key, ref) {
  if (!key) return;
  const refs = map.get(key) ?? [];
  refs.push(ref);
  map.set(key, refs);
}

for (const file of files) {
  const chapter = JSON.parse(readFileSync(join(surahsDir, file), "utf8"));
  for (const ayah of chapter.ayahs ?? []) for (const word of ayah.words ?? []) {
    const ref = pack(chapter.surahNumber, ayah.ayah, word.position);
    occurrences++;
    if (word.morphology?.root) append(roots, word.morphology.root, ref); else missingRoot++;
    if (word.morphology?.lemma) append(lemmas, word.morphology.lemma, ref); else missingLemma++;
    if (word.morphology?.lemma) {
      const per = lemmaGloss.get(word.morphology.lemma) ?? { en: new Map(), bn: new Map() };
      for (const lang of ["en", "bn"]) {
        const g = tidyGloss(word.translation?.[lang], lang);
        if (g) per[lang].set(g, (per[lang].get(g) ?? 0) + 1);
      }
      lemmaGloss.set(word.morphology.lemma, per);
    }
    if (word.morphology?.lemma && word.morphology?.pos) {
      const head = headOf(word.morphology.pos);
      if (head) {
        const counts = lemmaPos.get(word.morphology.lemma) ?? new Map();
        counts.set(head, (counts.get(head) ?? 0) + 1);
        lemmaPos.set(word.morphology.lemma, counts);
      }
    }
  }
}

const orderedObject = (map) => Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b, "ar")));
const artifacts = {
  "roots-index.json": JSON.stringify({ identityContract: "quran-word-occurrence:v1", encoding: "surah*1000000+ayah*1000+position", entryCount: roots.size, occurrences: occurrences - missingRoot, values: orderedObject(roots) }),
  "lemmas-index.json": JSON.stringify({ identityContract: "quran-word-occurrence:v1", encoding: "surah*1000000+ayah*1000+position", entryCount: lemmas.size, occurrences: occurrences - missingLemma, values: orderedObject(lemmas) }),
  "lemma-pos-index.json": JSON.stringify({
    identityContract: "quran-word-occurrence:v1",
    source: "morphology.pos",
    headRule: "last ' + '-separated segment that is not 'Pronoun'",
    entryCount: lemmaPos.size,
    values: Object.fromEntries([...lemmaPos.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "ar"))
      .map(([lemma, counts]) => [lemma, [...counts.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))])),
  }),
};

const topGloss = (counts) => [...counts.entries()]
  .sort((x, y) => y[1] - x[1] || x[0].length - y[0].length || (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0))[0]?.[0];
const meaningValues = {};
for (const [lemma, per] of [...lemmaGloss.entries()].sort(([a], [b]) => a.localeCompare(b, "ar"))) {
  const entry = {};
  for (const lang of ["en", "bn"]) { const t = topGloss(per[lang]); if (t) entry[lang] = t; }
  if (Object.keys(entry).length) meaningValues[lemma] = entry;
}
artifacts["lemma-meaning-index.json"] = JSON.stringify({
  identityContract: "quran-word-occurrence:v1",
  source: "translation.en, translation.bn (word-by-word)",
  rule: "per lemma and language: tidy each gloss (drop brackets keeping their words, drop quote marks and trailing punctuation, collapse whitespace, remove a leading separate conjunction and/so/then or এবং/আর/অতঃপর; skip a gloss that tidies to nothing), count, take the most frequent; ties broken by shortest, then alphabetical; a language with no gloss is omitted",
  entryCount: Object.keys(meaningValues).length,
  values: meaningValues,
});

const filesMeta = {};
for (const [name, body] of Object.entries(artifacts)) {
  writeFileSync(join(outDir, name), body);
  filesMeta[name] = { bytes: Buffer.byteLength(body), sha256: createHash("sha256").update(body).digest("hex") };
}
const manifest = {
  identityContract: "quran-word-occurrence:v1",
  sourceManifestSchemaVersion: JSON.parse(readFileSync(join(outDir, "manifest.json"), "utf8")).schemaVersion,
  occurrenceCount: occurrences,
  missingRoot,
  missingLemma,
  indexEncoding: "surah*1000000+ayah*1000+position",
  loadBoundary: "on-demand-only",
  files: filesMeta,
};
writeFileSync(join(outDir, "word-identity-index-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
