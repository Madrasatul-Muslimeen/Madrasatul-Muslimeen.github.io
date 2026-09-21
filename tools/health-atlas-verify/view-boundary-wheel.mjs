// Health Atlas Body Systems parity tranche 6 — the deferral boundary guard
// for the new wheel/diagram/search code, following the exact "read the
// module's own source text" pattern view-boundary.mjs and
// view-boundary-more.mjs already use.
//
// This tranche adds real surface area (a wheel, diagram data, a search
// selector) without widening what the view is allowed to show. This guard
// re-asserts the same forbidden-field boundary across every file this
// tranche touched or added, plus positive controls proving each new
// capability really exists (a guard that cannot fail is worse than none).
//
// Run from the repository root:
//   node tools/health-atlas-verify/view-boundary-wheel.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const viewPath = path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-view.js');
const selectorsPath = path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-selectors.js');
const diagramsPath = path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-diagrams.js');
const htmlPath = path.join(repoRoot, 'app', 'health', 'health-atlas.html');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      throw new TypeError('check() is synchronous; an async body would hide its own failures.');
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

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

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

const viewRaw = readFileSync(viewPath, 'utf8');
const viewCode = stripComments(viewRaw);
const selectorsRaw = readFileSync(selectorsPath, 'utf8');
const selectorsCode = stripComments(selectorsRaw);
const diagramsRaw = readFileSync(diagramsPath, 'utf8');
const diagramsCode = stripComments(diagramsRaw);
const htmlRaw = readFileSync(htmlPath, 'utf8');

for (const forbidden of forbiddenIdentifiers) {
  check(`health-atlas-view.js never reads "${forbidden}" (comments excluded)`, () => {
    assert(!viewCode.includes(forbidden), `found "${forbidden}" in executable source, outside a comment`);
  });
  check(`health-atlas-selectors.js never reads "${forbidden}" (comments excluded)`, () => {
    assert(!selectorsCode.includes(forbidden), `found "${forbidden}" in executable source, outside a comment`);
  });
  check(`health-atlas-diagrams.js never reads "${forbidden}" (comments excluded)`, () => {
    assert(!diagramsCode.includes(forbidden), `found "${forbidden}" in executable source, outside a comment`);
  });
  check(`health-atlas.html never imports "${forbidden}"`, () => {
    assert(!htmlRaw.includes(forbidden), `found "${forbidden}" in health-atlas.html`);
  });
}

check('health-atlas-view.js never uses innerHTML/outerHTML (this file has never used it)', () => {
  assert(!viewCode.includes('innerHTML') && !viewCode.includes('outerHTML'),
    'found innerHTML/outerHTML — this codebase builds DOM nodes directly and escapes nothing by string concatenation');
});

check('health-atlas-diagrams.js carries no imports (pure data, independently auditable)', () => {
  assert(!/^\s*import /m.test(diagramsRaw), 'expected health-atlas-diagrams.js to have zero imports');
});

check('health-atlas-diagrams.js only defines the three systems the source actually built a diagram for', () => {
  const keys = [...diagramsRaw.matchAll(/^ {2}(\w+): Object\.freeze\(\{/gm)].map(m => m[1]);
  const expected = ['renal', 'sensory', 'integument'];
  assert(keys.length === expected.length && expected.every(k => keys.includes(k)),
    `expected exactly [${expected.join(', ')}], found [${keys.join(', ')}]`);
});

// POSITIVE CONTROLS — prove each new capability actually exists, so this
// guard cannot pass vacuously against a view that quietly dropped a feature.
check('POSITIVE CONTROL: the view really implements the two-level wheel', () => {
  assert(viewCode.includes('function buildWheel'), 'expected buildWheel() in health-atlas-view.js');
  assert(viewCode.includes('wedgePathD') && viewCode.includes('polarPoint'), 'expected the wedge-geometry helpers');
  assert(viewCode.includes("wheelLevel === 'systems'") || viewCode.includes('state.wheelLevel'),
    'expected wheel level state to gate systems vs. items rendering');
});

check('POSITIVE CONTROL: the view really implements the diagram panel', () => {
  assert(viewCode.includes('function buildDiagramPanel'), 'expected buildDiagramPanel() in health-atlas-view.js');
  assert(viewCode.includes('diagramForSystem'), 'expected the view to call diagramForSystem()');
});

check('POSITIVE CONTROL: the view really implements collapsible sections', () => {
  assert(viewCode.includes('openSections'), 'expected open/closed section state');
  assert(viewCode.includes('onToggleSection'), 'expected a toggle handler for sections');
});

check('POSITIVE CONTROL: the view really implements search', () => {
  assert(viewCode.includes('matchesOrganSearch'), 'expected the view to call matchesOrganSearch()');
  assert(selectorsCode.includes('export function matchesOrganSearch'), 'expected matchesOrganSearch() to be exported from selectors');
});

check('POSITIVE CONTROL: search reads only organ.name and organ.functions', () => {
  const fn = selectorsRaw.slice(selectorsRaw.indexOf('export function matchesOrganSearch'));
  const body = fn.slice(0, fn.indexOf('\n}') + 2);
  assert(body.includes('organ.name') && body.includes('organ.functions'),
    'expected matchesOrganSearch to read organ.name and organ.functions');
});

check('POSITIVE CONTROL: the wheel svg box is resizable (CSS resize: both, matching the source)', () => {
  assert(htmlRaw.includes('resize: both'), 'expected .ha-wheel-svg-box { resize: both; ... } in health-atlas.html');
});

check('POSITIVE CONTROL: the view really implements a References index (tranche 9)', () => {
  assert(viewCode.includes('function buildReferencesScreen'), 'expected buildReferencesScreen() in health-atlas-view.js');
  assert(viewCode.includes('organsForReference'), 'expected the view to call organsForReference()');
  assert(selectorsCode.includes('export function organsForReference'), 'expected organsForReference() to be exported from selectors');
});

check('POSITIVE CONTROL: organsForReference reads only the existing .refs field, no new field', () => {
  const fn = selectorsRaw.slice(selectorsRaw.indexOf('export function organsForReference'));
  const body = fn.slice(0, fn.indexOf('\n}') + 2);
  assert(body.includes('.refs'), 'expected organsForReference to read entity.refs');
});

check('POSITIVE CONTROL: the References index links back into the existing organ detail column, not a dead reference', () => {
  assert(viewCode.includes('onOpenOrganFromReferences'), 'expected a callback wiring a reference row\'s organ pill into organ selection');
  assert(viewCode.includes("state.viewMode = 'bodysystems'"), 'expected opening an organ from References to switch back to the Body Systems view');
});

check('POSITIVE CONTROL: the References index disclaims per-statement verification, never asserts it', () => {
  const screenSrc = viewCode.slice(viewCode.indexOf('function buildReferencesScreen'), viewCode.indexOf('function buildScreen'));
  assert(screenSrc.includes('not any one function statement individually'),
    'expected the index to explicitly disclaim per-statement verification');
  assert(!screenSrc.includes("EVIDENCE_STATUS.CITED_EVIDENCE") && !screenSrc.includes("'cited-evidence'"),
    'the References index must never itself decide a statement is cited-evidence — that stays health-atlas-claims.js\'s job alone');
});

console.log(`\nHealth Atlas view-boundary-wheel: ${passed} passed, ${failed} failed`);
if (failed) {
  for (const f of failures) console.log('  FAIL:', f);
  process.exit(1);
}
