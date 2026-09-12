import assert from "node:assert/strict";
import { quranWordOccurrenceId as id } from "../../app/js/quran-word-identity.js";
import { computeWbwCoverage } from "../../app/js/quran-word-coverage.js";

let passed = 0;
function check(label, fn) { fn(); passed++; console.log(`  PASS  ${label}`); }
const a = id(1, 1, 1), b = id(1, 1, 2), c = id(1, 1, 3), outside = id(2, 1, 1);
check("zero scope has explicit zero denominator", () => assert.deepEqual(computeWbwCoverage([], []), { identityContract: "quran-word-occurrence:v1", total: 0, approved: 0, remaining: 0, percent: 0 }));
check("partial coverage is bounded and precise", () => assert.deepEqual(computeWbwCoverage([a, b, c], [a]), { identityContract: "quran-word-occurrence:v1", total: 3, approved: 1, remaining: 2, percent: 33.33 }));
check("duplicate scope and approvals count once", () => assert.equal(computeWbwCoverage([a, a, b], [a, a]).percent, 50));
check("approved occurrences outside selected scope do not inflate coverage", () => assert.equal(computeWbwCoverage([a, b], [a, outside]).approved, 1));
check("complete coverage is exactly 100 percent", () => assert.equal(computeWbwCoverage([a, b], [a, b]).percent, 100));
check("unknown identity versions are rejected", () => assert.throws(() => computeWbwCoverage([a], ["quran-word-occurrence:v2:1:1:1"]), /Unsupported/));
check("raw actions cannot be used in place of approved occurrence IDs", () => assert.throws(() => computeWbwCoverage([a], ["wbw.engaged"]), /invalid shape/));
console.log(`\n==== Pure WbW coverage: ${passed} passed, 0 failed ====`);
