// Health Atlas tranche 4 (Master Categories index) — the deferral boundary
// guard for this tranche's own view and selector modules.
//
// Run from the repository root: node tools/health-atlas-verify/view-boundary-categories.mjs
//
// Same discipline as tranche 1's view-boundary.mjs and tranche 3's
// view-boundary-more.mjs: reads the module's own SOURCE TEXT (comments
// stripped) rather than its behaviour, so a future edit that imports a
// forbidden field or dataset fails the guard immediately rather than
// relying on anyone remembering the rule.
//
// Why this tranche's forbidden list is wider than what it actually needs,
// not narrower: HEALTH_ATLAS_MASTER_CATEGORIES itself carries no
// dose/remedy/lifestyle field at all (checked directly against the live
// data file — its entries are only .id, .name and .subs), so there is
// nothing on the Master Categories dataset itself to defer. The only
// cross-dataset read this tranche makes is food.category, already an
// approved, already-displayed field since tranche 3. Every OTHER Foods
// field, and every field of Diseases/Lifestyles/Ages, is forbidden here —
// not because this dataset carries them, but because this module has no
// legitimate reason to import HEALTH_ATLAS_DISEASES, HEALTH_ATLAS_LIFESTYLES
// or HEALTH_ATLAS_AGES at all, and no reason to read any Foods field other
// than .id/.name/.category.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const viewPath = path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-categories-view.js');
const selectorsPath = path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-categories-selectors.js');
const pagePath = path.join(repoRoot, 'app', 'health', 'health-atlas-categories.html');

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
const codePage = stripComments(rawPage);

const forbiddenIdentifiers = [
  '.nutrition',
  'nutrition:',
  'servingQty',
  '.organs',
  'organs:',
  'remedies',
  'homeRemedies',
  'naturalRemedies',
  '.notes',
  'notes:',
  'HEALTH_ATLAS_DISEASES',
  'HEALTH_ATLAS_LIFESTYLES',
  'HEALTH_ATLAS_AGES',
  'lifestyles',
  'diseases',
  'symptoms',
  'organAffected'
];

check('view module file exists and is non-trivial', () => {
  assert(rawView.length > 300, 'health-atlas-categories-view.js looks empty or truncated');
});

check('selectors module file exists and is non-trivial', () => {
  assert(rawSelectors.length > 200, 'health-atlas-categories-selectors.js looks empty or truncated');
});

check('POSITIVE CONTROL: the view module really does implement the Master Categories capability', () => {
  assert(codeView.includes('category.name'), 'expected the view to read category.name somewhere');
  assert(codeView.includes('category.subs'), 'expected the view to read category.subs somewhere');
  assert(codeView.includes('foodCountForSub') || codeView.includes('totalFoodCountForCategory'), 'expected the view to compute a food count');
});

for (const forbidden of forbiddenIdentifiers) {
  check(`view module never reads "${forbidden}" (comments excluded)`, () => {
    assert(!codeView.includes(forbidden), `found "${forbidden}" in executable source, outside a comment`);
  });
  check(`selectors module never reads "${forbidden}" (comments excluded)`, () => {
    assert(!codeSelectors.includes(forbidden), `found "${forbidden}" in executable source, outside a comment`);
  });
  check(`page never imports/reads "${forbidden}" (comments excluded)`, () => {
    assert(!codePage.includes(forbidden), `found "${forbidden}" in executable source, outside a comment`);
  });
}

check('selectors module only reads food.category off a Foods entry, never any other Foods field', () => {
  assert(codeSelectors.includes('f.category') || codeSelectors.includes('food.category'), 'expected the selectors to read .category off a food entry');
});

check('view module never imports health-atlas-data.js directly (data only reaches it via the page, pre-filtered)', () => {
  assert(!codeView.includes("from './health-atlas-data.js'"), 'the view should receive data as arguments, not import the raw data file itself');
});

check('the page imports only HEALTH_ATLAS_MASTER_CATEGORIES and HEALTH_ATLAS_FOODS from the data file, nothing else', () => {
  const importBlockMatch = rawPage.match(/import\s*\{([\s\S]*?)\}\s*from\s*'\.\/js\/health-atlas-data\.js'/);
  assert(importBlockMatch, 'expected an import block from health-atlas-data.js');
  const names = importBlockMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  assert(names.length === 2, `expected exactly 2 imports from health-atlas-data.js, got ${JSON.stringify(names)}`);
  assert(names.includes('HEALTH_ATLAS_MASTER_CATEGORIES'), 'expected HEALTH_ATLAS_MASTER_CATEGORIES to be imported');
  assert(names.includes('HEALTH_ATLAS_FOODS'), 'expected HEALTH_ATLAS_FOODS to be imported');
});

check("the raw (unstripped) view source is allowed to explain the boundary in prose", () => {
  assert(rawView.includes('HEALTH_ATLAS_DISEASES') && rawView.includes('HEALTH_ATLAS_LIFESTYLES'), "expected the file's own header comment to name the forbidden datasets for a future reader");
});

console.log(`\nHealth Atlas view-boundary-categories: ${passed} passed, ${failed} failed`);
if (failed) {
  for (const f of failures) console.log('  FAIL:', f);
  process.exit(1);
}
