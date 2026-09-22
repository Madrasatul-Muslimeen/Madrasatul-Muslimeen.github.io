// Health Atlas claim-provenance tranche 1 — claim registry integrity.
//
// Run from the repository root: node tools/health-atlas-verify/claims-integrity.mjs
//
// Asserts app/health/js/health-atlas-claims.js (the evidence-status
// registry) stays in lockstep with app/health/js/health-atlas-data.js (the
// dataset it classifies): every organ's function statements have an
// explicit registry entry, in the same order and with the exact text the
// data file carries; no registry entry exists for an organ the data file
// no longer has; every status is one of the closed two-value vocabulary;
// and any 'cited-evidence' claim names a referenceId that really resolves
// in HEALTH_ATLAS_REFERENCES. "No entry" and "wrong status" are both
// distinct failure shapes, checked separately, so a fault names itself.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { importEsmFile } from './import-esm-file.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      throw new Error('check() is synchronous; an async body would hide its own failures.');
    }
    passed++;
  } catch (err) {
    failed++;
    failures.push(`${name}: ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const claims = await importEsmFile(path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-claims.js'));
const data = await importEsmFile(path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-data.js'));

const organs = data.HEALTH_ATLAS_ORGANS;
const referenceIds = new Set(Object.keys(data.HEALTH_ATLAS_REFERENCES));

check('EVIDENCE_STATUS carries exactly the two accepted values', () => {
  const values = Object.values(claims.EVIDENCE_STATUS).sort();
  assert(JSON.stringify(values) === JSON.stringify(['cited-evidence', 'general-reference-only']),
    `got ${JSON.stringify(values)}`);
});

check('POSITIVE CONTROL: the data file really has organs with function statements to classify', () => {
  const totalStatements = organs.reduce((sum, o) => sum + (o.functions || []).length, 0);
  assert(organs.length > 0 && totalStatements > 0,
    'expected at least one organ with at least one function statement');
});

check('every organ in HEALTH_ATLAS_ORGANS has a claim-registry entry', () => {
  const missing = organs.filter(o => !claims.ORGAN_FUNCTION_CLAIMS[o.id]).map(o => o.id);
  assert(missing.length === 0, `organs with no registry entry at all: ${missing.join(', ')}`);
});

check('every organ\'s registered statements match its data-file functions exactly, same order, same count', () => {
  const mismatches = [];
  for (const organ of organs) {
    const entries = claims.ORGAN_FUNCTION_CLAIMS[organ.id] || [];
    const registered = entries.map(e => e.statement);
    const actual = organ.functions || [];
    if (JSON.stringify(registered) !== JSON.stringify(actual)) {
      mismatches.push(organ.id);
    }
  }
  assert(mismatches.length === 0, `statement mismatch for organs: ${mismatches.join(', ')}`);
});

check('no registry entry exists for an organ id the data file does not have (no orphans)', () => {
  const dataIds = new Set(organs.map(o => o.id));
  const orphans = Object.keys(claims.ORGAN_FUNCTION_CLAIMS).filter(id => !dataIds.has(id));
  assert(orphans.length === 0, `orphan registry entries: ${orphans.join(', ')}`);
});

check('every claim entry carries a status from the closed vocabulary', () => {
  const bad = [];
  for (const [organId, entries] of Object.entries(claims.ORGAN_FUNCTION_CLAIMS)) {
    for (const entry of entries) {
      if (!claims.isValidStatus(entry.status)) bad.push(`${organId}: "${entry.status}"`);
    }
  }
  assert(bad.length === 0, `invalid status values: ${bad.join(', ')}`);
});

check('every "cited-evidence" claim names a referenceId that resolves in HEALTH_ATLAS_REFERENCES', () => {
  const bad = [];
  for (const [organId, entries] of Object.entries(claims.ORGAN_FUNCTION_CLAIMS)) {
    for (const entry of entries) {
      if (entry.status === claims.EVIDENCE_STATUS.CITED_EVIDENCE) {
        if (!entry.referenceId || !referenceIds.has(entry.referenceId)) {
          bad.push(`${organId}: "${entry.statement}" -> ${entry.referenceId}`);
        }
      }
    }
  }
  assert(bad.length === 0, `cited-evidence claims with a missing/dangling referenceId: ${bad.join(', ')}`);
});

check('HONEST-STATE CHECK: no statement is claimed as cited-evidence without deliberate review (documented, not a hard rule)', () => {
  let cited = 0;
  let general = 0;
  for (const entries of Object.values(claims.ORGAN_FUNCTION_CLAIMS)) {
    for (const entry of entries) {
      if (entry.status === claims.EVIDENCE_STATUS.CITED_EVIDENCE) cited++;
      else if (entry.status === claims.EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY) general++;
    }
  }
  console.log(`    (informational) cited-evidence: ${cited}, general-reference-only: ${general}`);
  // This check documents the count rather than enforcing a specific number —
  // a real citation found later is a legitimate change, not a regression.
  assert(cited + general > 0, 'expected at least one classified statement');
});

check('evidenceStatusFor() resolves a known statement and returns null for an unknown one', () => {
  const heart = data.HEALTH_ATLAS_ORGANS.find(o => o.id === 'heart');
  const known = heart.functions[0];
  assert(claims.evidenceStatusFor('heart', known) === claims.EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY,
    'expected the known heart statement to resolve to general-reference-only');
  assert(claims.evidenceStatusFor('heart', 'a statement nobody wrote') === null,
    'expected an unregistered statement to resolve to null, not a default status');
  assert(claims.evidenceStatusFor('no-such-organ', known) === null,
    'expected an unknown organ id to resolve to null');
});

check('referenceIdFor() never returns a reference id for a non-cited claim', () => {
  const heart = data.HEALTH_ATLAS_ORGANS.find(o => o.id === 'heart');
  const known = heart.functions[0];
  assert(claims.referenceIdFor('heart', known) === null,
    'a general-reference-only statement must not resolve to a reference id');
});

console.log(`\nHealth Atlas claims-integrity: ${passed} passed, ${failed} failed`);
if (failed) {
  for (const f of failures) console.log('  FAIL:', f);
  process.exit(1);
}
