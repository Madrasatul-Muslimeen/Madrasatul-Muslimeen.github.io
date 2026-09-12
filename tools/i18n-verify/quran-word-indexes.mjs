import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseQuranWordOccurrenceId, quranWordOccurrenceId } from "../../app/js/quran-word-identity.js";

const output = join(dirname(fileURLToPath(import.meta.url)), "../quran-data-pull/output");
const manifest = JSON.parse(readFileSync(join(output, "word-identity-index-manifest.json"), "utf8"));
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS  ${name}`); }
const unpack = (ref) => ({ surah: Math.floor(ref / 1_000_000), ayah: Math.floor((ref % 1_000_000) / 1_000), position: ref % 1_000 });

check("manifest binds indexes to identity v1", () => assert.equal(manifest.identityContract, "quran-word-occurrence:v1"));
check("manifest preserves source missing-value counts", () => { assert.equal(manifest.missingRoot, 27458); assert.equal(manifest.missingLemma, 3307); });
check("indexes are explicitly on-demand", () => assert.equal(manifest.loadBoundary, "on-demand-only"));

for (const name of ["roots-index.json", "lemmas-index.json"]) {
  const body = readFileSync(join(output, name));
  check(`${name} checksum matches`, () => assert.equal(createHash("sha256").update(body).digest("hex"), manifest.files[name].sha256));
  const index = JSON.parse(body);
  check(`${name} uses identity v1`, () => assert.equal(index.identityContract, "quran-word-occurrence:v1"));
  check(`${name} refs decode to valid permanent ids`, () => {
    for (const refs of Object.values(index.values)) for (const ref of refs) {
      const c = unpack(ref); assert.deepEqual(parseQuranWordOccurrenceId(quranWordOccurrenceId(c.surah, c.ayah, c.position)), { version: "v1", ...c });
    }
  });
}
console.log(`\n==== Quran word indexes: ${passed} passed, 0 failed ====`);
