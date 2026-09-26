// Hadith HadeethEnc pull -- the PURE helpers, tested without any network.
//
// tools/hadith-data-pull/hadeethenc-pull.mjs was written against the
// documented HadeethEnc API v1 shape in a sandbox with no outbound network
// access (curl and WebFetch both refused hadeethenc.com), so it has never
// been run end-to-end against a real response. This suite cannot close that
// gap -- only a real pull can -- but it proves the script's own LOGIC is
// self-consistent: category-tree walking, the content hash's stability and
// sensitivity, and the defensive /languages/ shape-sniffing. Run this before
// trusting the script's tree-walking or hashing, and re-run
// `hadeethenc-corpus-integrity.mjs` after a real pull to check the output
// itself.
//
// Run from the REPOSITORY ROOT.
import assert from "node:assert/strict";
import {
  contentHash, normaliseLanguageList, descendantsOf,
} from "../hadith-data-pull/hadeethenc-pull.mjs";

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    }
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

// ---------------------------------------------------------------------------
// normaliseLanguageList -- defensive against a shape never actually observed
// ---------------------------------------------------------------------------

check("normaliseLanguageList: a plain array of language codes passes through", () => {
  assert.deepEqual(normaliseLanguageList(["ar", "en", "bn"]), ["ar", "en", "bn"]);
});

check("normaliseLanguageList: an array of {id,name} objects is reduced to ids", () => {
  assert.deepEqual(
    normaliseLanguageList([{ id: "ar", name: "العربية" }, { id: "en", name: "English" }]),
    ["ar", "en"],
  );
});

check("normaliseLanguageList: an array of {code,...} objects is reduced to codes", () => {
  assert.deepEqual(normaliseLanguageList([{ code: "ar" }, { code: "bn" }]), ["ar", "bn"]);
});

check("normaliseLanguageList: an empty array is empty, not an error", () => {
  assert.deepEqual(normaliseLanguageList([]), []);
});

check("normaliseLanguageList: a non-array response throws by name rather than guessing", () => {
  assert.throws(() => normaliseLanguageList({ languages: ["ar"] }), /did not return an array/);
});

check("normaliseLanguageList: an unrecognised object shape throws by name rather than guessing", () => {
  assert.throws(() => normaliseLanguageList([{ nope: "ar" }]), /unrecognised shape/);
});

// ---------------------------------------------------------------------------
// descendantsOf -- the category-tree walk that scopes one root's own file
// ---------------------------------------------------------------------------

const FLAT_CATEGORIES = [
  { id: 1, parent_id: null, title: "Root A" },
  { id: 2, parent_id: 1, title: "A > child 1" },
  { id: 3, parent_id: 1, title: "A > child 2" },
  { id: 4, parent_id: 2, title: "A > child 1 > grandchild" },
  { id: 10, parent_id: null, title: "Root B" },
  { id: 11, parent_id: 10, title: "B > child" },
];

check("descendantsOf: includes the root itself", () => {
  assert.ok(descendantsOf(1, FLAT_CATEGORIES).includes(1));
});

check("descendantsOf: reaches every depth, not just direct children", () => {
  const ids = descendantsOf(1, FLAT_CATEGORIES);
  assert.deepEqual([...ids].sort((a, b) => a - b), [1, 2, 3, 4]);
});

check("descendantsOf: a DIFFERENT root's own subtree stays separate -- no cross-root leakage", () => {
  const ids = descendantsOf(10, FLAT_CATEGORIES);
  assert.deepEqual([...ids].sort((a, b) => a - b), [10, 11]);
  assert.ok(!ids.includes(1) && !ids.includes(2), "Root B's walk must not include any of Root A's categories");
});

check("descendantsOf: a leaf with no children returns only itself", () => {
  assert.deepEqual(descendantsOf(4, FLAT_CATEGORIES), [4]);
});

check("POSITIVE CONTROL -- descendantsOf actually walks, it does not just echo every category back", () => {
  // If the walk were broken (e.g. matched on the wrong field), asking for
  // Root B's descendants would come back empty rather than [10, 11] -- so an
  // empty result here would be a real failure of the function under test,
  // not a passing edge case.
  const ids = descendantsOf(10, FLAT_CATEGORIES);
  assert.ok(ids.length > 1, "Root B has a real child in the fixture; the walk must find it");
});

// ---------------------------------------------------------------------------
// contentHash -- stable, and sensitive to the fields that matter
// ---------------------------------------------------------------------------

const SAMPLE_RECORD = {
  id: 5678, title: "Sample title", hadeeth: "Sample matn text.",
  attribution: "Narrated by Someone", grade: "Sahih",
  explanation: "Sample explanation.", hints: ["hint one"],
  words_meanings: [{ word: "w", meaning: "m" }], reference: "Sample reference",
  categories: [1, 2],
};

check("contentHash: identical content hashes identically", () => {
  assert.equal(contentHash(SAMPLE_RECORD), contentHash({ ...SAMPLE_RECORD }));
});

check("contentHash: changing the matn text changes the hash -- 'unmodified' is checkable", () => {
  const mutated = { ...SAMPLE_RECORD, hadeeth: `${SAMPLE_RECORD.hadeeth} `.trimEnd() + "!" };
  assert.notEqual(contentHash(SAMPLE_RECORD), contentHash(mutated));
});

check("contentHash: a field this script does not store (e.g. a server-side timestamp) does NOT change the hash", () => {
  const withExtra = { ...SAMPLE_RECORD, contentHash: "irrelevant", fetchedFromServerAt: "2026-09-26T00:00:00Z" };
  assert.equal(contentHash(SAMPLE_RECORD), contentHash(withExtra));
});

check("contentHash: field ORDER in the source object does not change the hash -- canonical, not incidental", () => {
  const reordered = {
    categories: SAMPLE_RECORD.categories, reference: SAMPLE_RECORD.reference,
    words_meanings: SAMPLE_RECORD.words_meanings, hints: SAMPLE_RECORD.hints,
    explanation: SAMPLE_RECORD.explanation, grade: SAMPLE_RECORD.grade,
    attribution: SAMPLE_RECORD.attribution, hadeeth: SAMPLE_RECORD.hadeeth,
    title: SAMPLE_RECORD.title, id: SAMPLE_RECORD.id,
  };
  assert.equal(contentHash(SAMPLE_RECORD), contentHash(reordered));
});

check("contentHash: is a hex SHA-256 (64 hex chars)", () => {
  assert.match(contentHash(SAMPLE_RECORD), /^[0-9a-f]{64}$/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
