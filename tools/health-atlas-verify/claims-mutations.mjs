// PROVE THE CLAIMS-INTEGRITY GUARD CAN ACTUALLY FAIL.
//
// `claims-integrity.mjs` is a search for things that are wrong. On a
// healthy repository it prints nothing but PASS — which is exactly what a
// completely broken reader would print too. This project's own standing
// lesson is that a guard which cannot fail is worse than no guard, because
// it is believed.
//
// Each mutation below reintroduces a real drift shape and the guard must
// refuse it BY NAME. A mutation that does NOT produce the expected failure
// is reported as UNPROVEN rather than quietly passed.
//
// IT NEVER REACHES FOR `git`. Every file this harness touches is read into
// memory first and written back from memory in a `finally`, so the restore
// cannot depend on the index, the working tree or anything a concurrent
// process is doing. Commit before running it anyway.
//
// Run from the REPOSITORY ROOT:
//   node tools/health-atlas-verify/claims-mutations.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const GUARD = path.join(root, 'tools', 'health-atlas-verify', 'claims-integrity.mjs');
const CLAIMS = path.join(root, 'app', 'health', 'js', 'health-atlas-claims.js');

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      throw new TypeError('check() is synchronous; an async body would hide its own failures.');
    }
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

function runGuard() {
  const r = spawnSync(process.execPath, [GUARD], { cwd: root, encoding: 'utf8' });
  return { code: r.status, text: `${r.stdout || ''}${r.stderr || ''}` };
}

function mutation(name, edits, expectSubstring) {
  check(`MUTATION ${name}`, () => {
    const backup = new Map();
    for (const [file] of edits) backup.set(file, fs.readFileSync(file, 'utf8'));
    try {
      for (const [file, mutate] of edits) {
        const before = backup.get(file);
        const after = mutate(before);
        assert.notEqual(after, before,
          `the mutation changed NOTHING in ${path.basename(file)} — it proves nothing about the guard`);
        fs.writeFileSync(file, after);
      }
      const { code, text } = runGuard();
      assert.notEqual(code, 0, `the guard exited 0 on "${name}" — it is UNPROVEN and must not be trusted`);
      assert.ok(text.includes(expectSubstring),
        `the guard failed, but not naming the expected fault. Expected to find: ${JSON.stringify(expectSubstring)}\nGot:\n${text}`);
    } finally {
      for (const [file] of edits) fs.writeFileSync(file, backup.get(file));
    }
  });
}

// 1. Remove an organ's entire registry entry -> "no registry entry at all"
mutation(
  'remove heart\'s whole registry entry',
  [[CLAIMS, (src) => src.replace(/ {4}"heart": Object\.freeze\(\[[\s\S]*?\n {4}\]\),\n/, '')]],
  'organs with no registry entry at all'
);

// 2. Change one registered statement's text so it no longer matches the data file
mutation(
  'reword one of heart\'s statements without touching the data file',
  [[CLAIMS, (src) => src.replace(
    'statement: "Pumps blood through the body (roughly 100,000 beats/day)"',
    'statement: "Pumps blood through the body (edited, no longer matches the data file)"'
  )]],
  'statement mismatch for organs: heart'
);

// 3. Add an orphan registry entry for an organ id the data file does not have
mutation(
  'add a registry entry for a non-existent organ id',
  [[CLAIMS, (src) => src.replace(
    'export const ORGAN_FUNCTION_CLAIMS = Object.freeze({\n',
    'export const ORGAN_FUNCTION_CLAIMS = Object.freeze({\n' +
    '  "no-such-organ": Object.freeze([Object.freeze({ statement: "x", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY })]),\n'
  )]],
  'orphan registry entries: no-such-organ'
);

// 4. Give a claim an out-of-vocabulary status
mutation(
  'set an invalid status value on a real claim',
  [[CLAIMS, (src) => src.replace(
    'statement: "Pumps blood through the body (roughly 100,000 beats/day)", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY',
    'statement: "Pumps blood through the body (roughly 100,000 beats/day)", status: \'verified\''
  )]],
  'invalid status values'
);

// 5. Claim cited-evidence without a resolvable referenceId — the exact
//    hazard this whole guard exists to prevent: an unqualified claim of
//    verification with nothing backing it.
mutation(
  'mark a claim cited-evidence with a dangling referenceId',
  [[CLAIMS, (src) => src.replace(
    'statement: "Pumps blood through the body (roughly 100,000 beats/day)", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY',
    'statement: "Pumps blood through the body (roughly 100,000 beats/day)", status: EVIDENCE_STATUS.CITED_EVIDENCE, referenceId: \'r99-does-not-exist\''
  )]],
  'cited-evidence claims with a missing/dangling referenceId'
);

// 6. Claim cited-evidence with NO referenceId at all
mutation(
  'mark a claim cited-evidence with no referenceId field at all',
  [[CLAIMS, (src) => src.replace(
    'statement: "Pumps blood through the body (roughly 100,000 beats/day)", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY',
    'statement: "Pumps blood through the body (roughly 100,000 beats/day)", status: EVIDENCE_STATUS.CITED_EVIDENCE'
  )]],
  'cited-evidence claims with a missing/dangling referenceId'
);

// Positive control: a real, well-formed cited-evidence claim (referenceId
// resolves) must NOT fail the guard — proving it refuses on substance, not
// merely on the presence of the word "cited-evidence". Uses a LUNGS
// statement, deliberately not the heart statement the guard's own
// "evidenceStatusFor() resolves a known statement" check hardcodes — using
// the same one would make this mutation collide with that unrelated check
// and misreport a false failure here.
check('POSITIVE CONTROL: a well-formed cited-evidence claim with a real referenceId passes', () => {
  const before = fs.readFileSync(CLAIMS, 'utf8');
  try {
    const after = before.replace(
      'statement: "Gas exchange — oxygen in, carbon dioxide out", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY',
      'statement: "Gas exchange — oxygen in, carbon dioxide out", status: EVIDENCE_STATUS.CITED_EVIDENCE, referenceId: \'r1\''
    );
    assert.notEqual(after, before, 'the edit changed nothing — fixture drifted');
    fs.writeFileSync(CLAIMS, after);
    const { code, text } = runGuard();
    assert.equal(code, 0, `expected a well-formed cited-evidence claim to pass; got:\n${text}`);
  } finally {
    fs.writeFileSync(CLAIMS, before);
  }
});

console.log(`\nHealth Atlas claims-mutations: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
