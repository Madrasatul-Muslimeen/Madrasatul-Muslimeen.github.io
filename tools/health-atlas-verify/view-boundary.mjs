// Health Atlas foundation tranche 1 — the deferral boundary guard.
//
// Run from the repository root: node tools/health-atlas-verify/view-boundary.mjs
//
// This is the mechanical version of the rule written in
// app/health/README.md: the organ nutrition/food/activity/deterioration
// figures and the disease remedy fields are preserved in the data file but
// must not be rendered by anything in this tranche, because none of it has
// had an accuracy pass. Reads the VIEW MODULE'S OWN SOURCE TEXT rather than
// its behaviour, the same pattern this repository's other boundary suites
// use (e.g. study-approach-contract-boundary.mjs) — a static guard that
// fails the moment a future edit imports one of the deferred fields, rather
// than relying on anyone remembering the rule.
//
// Comments are stripped before scanning: a prose comment that MENTIONS a
// deferred field name (to explain the boundary, as this file's sibling
// modules do) must not itself trip the guard — see CLAUDE.md's own standing
// lesson, "strip both comment forms before grepping source for a forbidden
// name."

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const viewPath = path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-view.js');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failed++;
    failures.push(`${name}: ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');
}

const rawSource = readFileSync(viewPath, 'utf8');
const codeOnly = stripComments(rawSource);

const forbiddenIdentifiers = [
  'nutritionNeeds',
  'foodSources',
  '.activity',
  'deterioration',
  'remedies',
  'homeRemedies',
  'naturalRemedies',
  'HEALTH_ATLAS_FOODS',
  'HEALTH_ATLAS_DISEASES',
  'HEALTH_ATLAS_LIFESTYLES',
  'HEALTH_ATLAS_AGES'
];

check('view module file exists and is non-trivial', () => {
  assert(rawSource.length > 500, 'health-atlas-view.js looks empty or truncated');
});

check('POSITIVE CONTROL: the view module really does implement the organ/functions capability', () => {
  assert(codeOnly.includes('organ.functions'), 'expected the view to read organ.functions somewhere');
  assert(codeOnly.includes('getOrgan') && codeOnly.includes('referencesFor'), 'expected the view to call getOrgan and referencesFor');
});

check('POSITIVE CONTROL: the view module renders organ.partType (parity tranche 12 "Type" pill)', () => {
  assert(codeOnly.includes('organ.partType'), 'expected the view to read organ.partType somewhere');
  assert(codeOnly.includes('ha-bs-type-pill'), 'expected the view to render the ha-bs-type-pill class');
});

for (const forbidden of forbiddenIdentifiers) {
  check(`view module never reads "${forbidden}" (comments excluded)`, () => {
    assert(!codeOnly.includes(forbidden), `found "${forbidden}" in executable source, outside a comment`);
  });
}

check('the raw (unstripped) source is allowed to explain the boundary in prose', () => {
  assert(rawSource.includes('nutritionNeeds'), 'expected the file\'s own header comment to name the deferred fields for a future reader');
});

console.log(`\nHealth Atlas view-boundary: ${passed} passed, ${failed} failed`);
if (failed) {
  for (const f of failures) console.log('  FAIL:', f);
  process.exit(1);
}
