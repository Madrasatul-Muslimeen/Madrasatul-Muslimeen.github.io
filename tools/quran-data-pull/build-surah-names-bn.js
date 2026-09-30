// Issue #415 part 2 -- the Bangla meaning of each surah's name, for the Read
// contents list's Surah tab (the Owner: "Yes, do Bangla as well whenever it's
// easy"). Fetched from api.quran.com, the same source pull.js already uses, and
// never hand-typed: a meaning nobody checked against a source is worse than
// the English fallback the app shows without it.
//
// Adds ONE field, `nameTranslationBn`, to every row of
// output/surah-index.json. Every existing field is kept exactly as it was, in
// the same order, written back in the same compact form -- legacy-v07/ and
// legacy-v08/ read this file by absolute path, so this is additive only, and
// the script refuses to write if it would change anything else.
//
// Re-runnable: running it again replaces nameTranslationBn and nothing else.
// Run: node build-surah-names-bn.js

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const indexPath = join(here, "output", "surah-index.json");
const URL = "https://api.quran.com/api/v4/chapters?language=bn";

const res = await fetch(URL);
if (!res.ok) throw new Error(`${URL} answered ${res.status}`);
const { chapters } = await res.json();
if (!Array.isArray(chapters) || chapters.length !== 114) throw new Error(`expected 114 chapters, got ${chapters?.length}`);

const bnById = new Map();
for (const c of chapters) {
  const name = c.translated_name?.name ?? "";
  // A chapter the API has no Bangla for comes back in English; refuse it
  // rather than store English under a Bangla field.
  if (c.translated_name?.language_name !== "bengali" || !/[ঀ-৿]/.test(name)) {
    throw new Error(`chapter ${c.id} has no Bangla meaning: ${JSON.stringify(c.translated_name)}`);
  }
  bnById.set(c.id, name.trim());
}

const before = JSON.parse(readFileSync(indexPath, "utf8"));
if (before.length !== 114) throw new Error(`surah-index.json has ${before.length} rows, expected 114`);

const after = before.map((row) => {
  const { nameTranslationBn: _old, ...rest } = row;
  const bn = bnById.get(row.surahNumber);
  if (!bn) throw new Error(`no Bangla meaning for surah ${row.surahNumber}`);
  return { ...rest, nameTranslationBn: bn };
});

// Guard: every field other than the new one is unchanged.
after.forEach((row, i) => {
  const { nameTranslationBn: _a, ...a } = row;
  const { nameTranslationBn: _b, ...b } = before[i];
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`surah ${row.surahNumber}: an existing field would change`);
});

writeFileSync(indexPath, JSON.stringify(after));
console.log(`wrote nameTranslationBn for ${after.length} surahs to ${indexPath}`);
