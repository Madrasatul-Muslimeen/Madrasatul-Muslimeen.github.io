// STAGE-5-TASK-15 — Firebase-free synthetic size preflight for the accepted
// immutable full-snapshot Note revision direction.
//
// JSON UTF-8 size is a deterministic local proxy, not Cloud Firestore's
// authoritative encoded document size. No Firebase SDK, emulator, project, or
// network connection is used. Representative-corpus and emulator measurement
// remain later acceptance gates.

import assert from "node:assert/strict";

const FIRESTORE_DOCUMENT_LIMIT_BYTES = 1_048_576;
const FIRESTORE_FIELD_VALUE_LIMIT_BYTES = 1_048_487;
const encoder = new TextEncoder();

function utf8Bytes(value) {
  return encoder.encode(value).byteLength;
}

function jsonUtf8Bytes(value) {
  return utf8Bytes(JSON.stringify(value));
}

function buildSnapshot({ title, bodyHtml }) {
  return {
    revisionId: "rev_demo_01",
    noteId: "note_demo_01",
    tenantId: "tenant_demo",
    ownerPersonId: "person_demo",
    ownerUid: "uid_demo",
    previousRevisionId: null,
    title,
    bodyHtml,
    revisionReason: "content-update",
    actorUid: "uid_demo",
    schemaVersion: 1,
    createdAt: "2026-09-11T00:00:00.000Z",
    updatedAt: "2026-09-11T00:00:00.000Z",
    createdBy: "uid_demo",
  };
}

function repeatToMinimumBytes(seed, minimumBytes) {
  let value = seed;
  while (utf8Bytes(value) < minimumBytes) value += seed;
  return value;
}

const fixtures = [
  { name: "short-English", title: "Reflection", bodyHtml: "<p>Read, reflect, and preserve.</p>" },
  { name: "multilingual", title: "Reflection — تدبر — চিন্তা", bodyHtml: "<p>القرآن الكريم — কুরআন — Quran</p>" },
  { name: "rich-64KiB", title: "Structured reflection", bodyHtml: repeatToMinimumBytes("<p><strong>Ayah</strong> reflection — تدبر — চিন্তা.</p>", 64 * 1024) },
  { name: "rich-256KiB", title: "Long structured reflection", bodyHtml: repeatToMinimumBytes("<p><em>Preserved full snapshot</em> — القرآن — কুরআন.</p>", 256 * 1024) },
  { name: "boundary-probe-768KiB", title: "Synthetic boundary probe", bodyHtml: repeatToMinimumBytes("<p>Boundary probe — آية — আয়াত.</p>", 768 * 1024) },
];

const results = fixtures.map((fixture) => {
  const snapshot = buildSnapshot(fixture);
  assert.equal(snapshot.title, fixture.title);
  assert.equal(snapshot.bodyHtml, fixture.bodyHtml);
  return {
    fixture: fixture.name,
    titleUtf8Bytes: utf8Bytes(fixture.title),
    bodyUtf8Bytes: utf8Bytes(fixture.bodyHtml),
    jsonUtf8ProxyBytes: jsonUtf8Bytes(snapshot),
    documentLimitBytes: FIRESTORE_DOCUMENT_LIMIT_BYTES,
    fieldValueLimitBytes: FIRESTORE_FIELD_VALUE_LIMIT_BYTES,
  };
});

for (let index = 1; index < results.length; index += 1) {
  assert.ok(results[index].bodyUtf8Bytes > results[index - 1].bodyUtf8Bytes);
  assert.ok(results[index].jsonUtf8ProxyBytes > results[index - 1].jsonUtf8ProxyBytes);
}

assert.ok(utf8Bytes("القرآن") > "القرآن".length, "measurement must be UTF-8 byte-aware");
assert.ok(utf8Bytes("কুরআন") > "কুরআন".length, "measurement must be UTF-8 byte-aware");

console.log(JSON.stringify({
  status: "synthetic-json-utf8-preflight-only",
  authoritativeFirestoreSizeClaimed: false,
  representativeUserCorpusClaimed: false,
  productionOrEmulatorAccess: false,
  results,
}, null, 2));
console.log(`\n==== ${results.length} synthetic fixtures measured; no Firestore PASS claimed ====`);
