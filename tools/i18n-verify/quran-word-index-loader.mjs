import assert from "node:assert/strict";
import { clearWordIdentityIndexCache, loadWordIdentityIndex, occurrenceRefsFor, unpackWordIndexRef } from "../../app/js/quran-word-index.js";

let passed = 0; async function check(name, fn) { await fn(); passed++; console.log(`  PASS  ${name}`); }
await check("packed occurrence decodes", () => assert.deepEqual(unpackWordIndexRef(2_255_007), { surah: 2, ayah: 255, position: 7 }));
await check("invalid packed occurrence is rejected", () => assert.throws(() => unpackWordIndexRef(4), TypeError));
await check("unsupported layer is rejected before fetch", () => assert.rejects(() => loadWordIdentityIndex("surface", { fetchImpl: async () => { throw new Error("must not fetch"); } }), TypeError));
await check("index loads only on explicit request and is cached", async () => {
  clearWordIdentityIndexCache(); let calls = 0;
  const fetchImpl = async () => { calls++; return { ok: true, json: async () => ({ identityContract: "quran-word-occurrence:v1", values: { رحم: [1_003_001] } }) }; };
  assert.equal(calls, 0); await loadWordIdentityIndex("root", { fetchImpl, baseUrl: "/data/" }); await loadWordIdentityIndex("root", { fetchImpl, baseUrl: "/data/" }); assert.equal(calls, 1);
});
await check("occurrences resolve to coordinate objects", async () => {
  clearWordIdentityIndexCache(); const fetchImpl = async () => ({ ok: true, json: async () => ({ identityContract: "quran-word-occurrence:v1", values: { رحم: [1_003_001, 1_004_002] } }) });
  assert.deepEqual(await occurrenceRefsFor("root", "رحم", { fetchImpl }), [{ surah: 1, ayah: 3, position: 1 }, { surah: 1, ayah: 4, position: 2 }]);
});
await check("missing morphology value avoids fetch", async () => { let calls = 0; assert.deepEqual(await occurrenceRefsFor("root", null, { fetchImpl: async () => { calls++; } }), []); assert.equal(calls, 0); });
await check("wrong identity contract is rejected", async () => { clearWordIdentityIndexCache(); await assert.rejects(() => loadWordIdentityIndex("lemma", { fetchImpl: async () => ({ ok: true, json: async () => ({ identityContract: "v2" }) }) }), /Unsupported/); });
console.log(`\n==== Quran word on-demand index loader: ${passed} passed, 0 failed ====`);
