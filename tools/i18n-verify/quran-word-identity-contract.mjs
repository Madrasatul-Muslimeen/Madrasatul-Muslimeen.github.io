import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeArabicForSearch,
  parseQuranWordOccurrenceId,
  quranWordOccurrenceId,
  wordIdentityLayers,
} from "../../app/js/quran-word-identity.js";

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS  ${name}`); }

check("v1 occurrence id round-trips", () => {
  const id = quranWordOccurrenceId(2, 255, 7);
  assert.equal(id, "quran-word-occurrence:v1:2:255:7");
  assert.deepEqual(parseQuranWordOccurrenceId(id), { version: "v1", surah: 2, ayah: 255, position: 7 });
});
check("unknown identity versions are rejected", () => assert.throws(() => parseQuranWordOccurrenceId("quran-word-occurrence:v2:1:1:1"), RangeError));
check("invalid coordinate bounds are rejected", () => assert.throws(() => quranWordOccurrenceId(0, 1, 1), TypeError));
check("normalization is additive and deterministic", () => assert.equal(normalizeArabicForSearch("ٱلرَّحِيمِ"), "الرحيم"));
check("missing morphology remains explicitly null", () => {
  const layers = wordIdentityLayers({ surah: 1, ayah: 1, position: 1, arabic: "بِسْمِ" });
  assert.equal(layers.root, null); assert.equal(layers.lemma, null); assert.equal(layers.grammaticalFamily, null);
});

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, "../quran-data-pull/output/surahs");
const ids = new Set(); let words = 0;
for (const filename of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const chapter = JSON.parse(fs.readFileSync(path.join(dir, filename), "utf8"));
  for (const ayah of chapter.ayahs ?? []) for (const word of ayah.words ?? []) {
    const id = quranWordOccurrenceId(chapter.surahNumber, ayah.ayah, word.position);
    assert.ok(!ids.has(id), `duplicate ${id}`); ids.add(id); words++;
  }
}
check("all packaged occurrences have unique v1 identities", () => { assert.equal(words, 77429); assert.equal(ids.size, words); });
console.log(`\n==== Quran word identity contract: ${passed} passed, 0 failed ====`);

