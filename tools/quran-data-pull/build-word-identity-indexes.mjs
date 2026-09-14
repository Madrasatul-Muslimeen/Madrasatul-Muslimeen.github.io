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
