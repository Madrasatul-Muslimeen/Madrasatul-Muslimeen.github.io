// Health Atlas tranche 3 (Foods / Diseases / Age Groups) — the deferral
// boundary guard for this tranche's own view and selector modules.
//
// Run from the repository root: node tools/health-atlas-verify/view-boundary-more.mjs
//
// Same discipline as tranche 1's view-boundary.mjs: reads the module's own
// SOURCE TEXT (comments stripped) rather than its behaviour, so a future
// edit that imports a deferred field fails the guard immediately rather
// than relying on anyone remembering the rule.
//
// What this tranche defers, and why:
//   - Foods: .nutrition and .servingQty are nutrient-dose-shaped
//     ("~2.7L/day", "Adequate fibre 25-38g/day, incl. food moisture").
//   - Diseases: .remedies, .homeRemedies and .naturalRemedies are
//     treatment/remedy content.
//   - Age Groups: .notes is nutrition-guidance prose keyed to age
//     ("Iron needs rise further...", "Portion sizes scale with age").
//   - HEALTH_ATLAS_LIFESTYLES is not read AT ALL by this tranche. Its own
//     substantive fields (.activities, .food, .avoid) are themselves
//     lifestyle recommendations end to end — there is no
//     structural/organizational subset of that dataset, so the whole
//     export is excluded rather than partially shown.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const viewPath = path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-more-view.js');
const selectorsPath = path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-more-selectors.js');
const pagePath = path.join(repoRoot, 'app', 'health', 'health-atlas-more.html');

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

const rawView = readFileSync(viewPath, 'utf8');
const rawSelectors = readFileSync(selectorsPath, 'utf8');
const rawPage = readFileSync(pagePath, 'utf8');
const codeView = stripComments(rawView);
const codeSelectors = stripComments(rawSelectors);

const forbiddenIdentifiers = [
  '.nutrition',
  'nutrition:',
  'servingQty',
  'remedies',
  'homeRemedies',
  'naturalRemedies',
  '.notes',
  'notes:',
  'HEALTH_ATLAS_LIFESTYLES',
  'lifestyles'
];

check('view module file exists and is non-trivial', () => {
  assert(rawView.length > 500, 'health-atlas-more-view.js looks empty or truncated');
});

check('POSITIVE CONTROL: the view module really does implement the Foods/Diseases/Ages capability', () => {
  assert(codeView.includes('food.category'), 'expected the view to read food.category somewhere');
  assert(codeView.includes('disease.cause') || codeView.includes('disease.symptoms'), 'expected the view to read disease.cause/symptoms');
  assert(codeView.includes('age.range'), 'expected the view to read age.range');
});

for (const forbidden of forbiddenIdentifiers) {
  check(`view module never reads "${forbidden}" (comments excluded)`, () => {
    assert(!codeView.includes(forbidden), `found "${forbidden}" in executable source, outside a comment`);
  });
  check(`selectors module never reads "${forbidden}" (comments excluded)`, () => {
    assert(!codeSelectors.includes(forbidden), `found "${forbidden}" in executable source, outside a comment`);
  });
}

check('view module reads organ names ONLY through organNamesFor(), never food.organs directly', () => {
  assert(!codeView.includes('food.organs'), 'found "food.organs" read directly in executable source — several real entries embed a nutrient-dose recommendation in that field (e.g. "Heart: 40g/day"); use organNamesFor() instead');
  assert(codeView.includes('organNamesFor(food)'), 'expected the view to call organNamesFor(food) to strip the organs field to organ names only');
});

check('view module never imports health-atlas-data.js directly (data only reaches it via the page, pre-filtered)', () => {
  assert(!codeView.includes("from './health-atlas-data.js'"), 'the view should receive data as arguments, not import the raw data file itself');
});

check('the page never imports HEALTH_ATLAS_LIFESTYLES', () => {
  assert(!rawPage.includes('HEALTH_ATLAS_LIFESTYLES'), 'health-atlas-more.html imports the Lifestyles export');
});

check("the raw (unstripped) view source is allowed to explain the boundary in prose", () => {
  assert(rawView.includes('servingQty') && rawView.includes('HEALTH_ATLAS_LIFESTYLES'), "expected the file's own header comment to name the deferred fields/dataset for a future reader");
});

console.log(`\nHealth Atlas view-boundary-more: ${passed} passed, ${failed} failed`);
if (failed) {
  for (const f of failures) console.log('  FAIL:', f);
  process.exit(1);
}
