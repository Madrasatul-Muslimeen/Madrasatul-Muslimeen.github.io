// Offline Phase 3 planning aid. Estimates JSON payloads, not Firestore wire size or billed costs.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const output = join(dirname(fileURLToPath(import.meta.url)), "output");
const files = readdirSync(join(output, "surahs")).filter((name) => /^surah_\d+\.json$/.test(name));
let totalAyahs = 0, totalWords = 0, maxWords = { surah: 0, ayah: 0, words: 0 };
let maxPayload = { surah: 0, ayah: 0, bytes: 0 };
const state = { self: "learning", claim: "practicing", confirmation: "pending", updatedAt: "2026-09-12T00:00:00.000Z" };
for (const file of files) {
  const chapter = JSON.parse(readFileSync(join(output, "surahs", file), "utf8"));
  for (const ayah of chapter.ayahs) {
    totalAyahs++;
    totalWords += ayah.words?.length ?? 0;
    if ((ayah.words?.length ?? 0) > maxWords.words) maxWords = { surah: chapter.surahNumber, ayah: ayah.ayah, words: ayah.words.length };
    const positions = Object.fromEntries((ayah.words ?? []).map((word) => [word.position, state]));
    const sample = { tenantId: "t".repeat(64), personId: "p".repeat(64), identityContract: "quran-word-occurrence:v1", surah: chapter.surahNumber, ayah: ayah.ayah, positions };
    const bytes = Buffer.byteLength(JSON.stringify(sample));
    if (bytes > maxPayload.bytes) maxPayload = { surah: chapter.surahNumber, ayah: ayah.ayah, bytes };
  }
}
const manifest = JSON.parse(readFileSync(join(output, "manifest.json"), "utf8"));
if (totalAyahs !== manifest.totalAyahs || totalWords !== manifest.totalWords) throw new Error("Dataset totals differ from manifest.");
console.log(JSON.stringify({ totalAyahs, totalWords, maxWords, maxPayload, allOccurrenceDocs: totalWords, allAyahDocs: totalAyahs, chunk64Docs: Math.ceil(totalWords / 64) }, null, 2));
