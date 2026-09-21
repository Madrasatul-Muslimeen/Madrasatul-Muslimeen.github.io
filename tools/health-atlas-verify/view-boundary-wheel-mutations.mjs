// PROVE THE view-boundary-wheel GUARD CAN ACTUALLY FAIL.
//
// Same discipline as view-boundary-more-mutations.mjs and
// view-boundary-categories-mutations.mjs: a guard that only ever prints
// PASS is indistinguishable from a broken reader. Each mutation below
// reintroduces one hazard the wheel/diagram/search tranche must never
// carry, and the guard must refuse it BY NAME.
//
// IT NEVER REACHES FOR `git`. Every file this harness touches is read into
// memory first and written back from memory in a `finally`.
//
// Run from the REPOSITORY ROOT:
//   node tools/health-atlas-verify/view-boundary-wheel-mutations.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const GUARD = path.join(root, 'tools', 'health-atlas-verify', 'view-boundary-wheel.mjs');
const VIEW = path.join(root, 'app', 'health', 'js', 'health-atlas-view.js');
const SELECTORS = path.join(root, 'app', 'health', 'js', 'health-atlas-selectors.js');
const DIAGRAMS = path.join(root, 'app', 'health', 'js', 'health-atlas-diagrams.js');
const HTML = path.join(root, 'app', 'health', 'health-atlas.html');

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

function mutation(name, file, mutate, expectSubstring) {
  check(`MUTATION ${name}`, () => {
    const before = fs.readFileSync(file, 'utf8');
    try {
      const after = mutate(before);
      assert.notEqual(after, before, 'the mutation changed NOTHING — it proves nothing about the guard');
      fs.writeFileSync(file, after);
      const { code, text } = runGuard();
      assert.notEqual(code, 0, `the guard exited 0 on "${name}" — it is UNPROVEN and must not be trusted`);
      assert.ok(text.includes(expectSubstring),
        `the guard failed, but not naming the expected fault. Expected to find: ${JSON.stringify(expectSubstring)}\nGot:\n${text}`);
    } finally {
      fs.writeFileSync(file, before);
    }
  });
}

// POSITIVE CONTROL: the guard passes clean on the real, unmutated files.
check('POSITIVE CONTROL: the guard passes clean on the real files', () => {
  const { code, text } = runGuard();
  assert.equal(code, 0, `expected the guard to pass on unmutated source; got:\n${text}`);
});

// 1. Reintroduce a nutrition dose field into the wheel's own detail render.
mutation(
  'render organ.nutritionNeeds from inside the detail column',
  VIEW,
  (src) => src.replace(
    "el('div', { class: 'ha-section-label', text: 'Functions' }),",
    "el('div', { class: 'ha-section-label', text: 'Nutrition' }),\n      el('div', { text: (organ.nutritionNeeds || []).join(', ') }),\n      el('div', { class: 'ha-section-label', text: 'Functions' }),"
  ),
  'nutritionNeeds'
);

// 2. Import HEALTH_ATLAS_DISEASES into the page, widening the wheel to a
//    dataset it was never built to reach.
mutation(
  'import HEALTH_ATLAS_DISEASES into health-atlas.html',
  HTML,
  (src) => src.replace(
    'HEALTH_ATLAS_REFERENCES',
    'HEALTH_ATLAS_REFERENCES,\n    HEALTH_ATLAS_DISEASES'
  ),
  'HEALTH_ATLAS_DISEASES'
);

// 3. Widen the search selector to also match on a deterioration factor —
//    the exact "search as a side door" hazard this guard's positive control
//    for search exists to catch.
mutation(
  'widen matchesOrganSearch to also read organ.deterioration',
  SELECTORS,
  (src) => src.replace(
    "return (organ.functions || []).some(fn => String(fn).toLowerCase().includes(needle));",
    "if ((organ.deterioration || []).some(d => String(d).toLowerCase().includes(needle))) return true;\n  return (organ.functions || []).some(fn => String(fn).toLowerCase().includes(needle));"
  ),
  'deterioration'
);

// 4. Add a fourth "diagram" entry for a system the source never built one
//    for, silently claiming parity the source itself does not have.
mutation(
  'add a diagram entry for the cardio system, which the source has no diagram for',
  DIAGRAMS,
  (src) => src.replace(
    '  sensory: Object.freeze({',
    '  cardio: Object.freeze({ viewBox: \'0 0 10 10\', caption: \'x\', shapes: Object.freeze([]), partMap: Object.freeze({}) }),\n  sensory: Object.freeze({'
  ),
  'exactly [renal, sensory, integument]'
);

// 5. Switch a DOM build over to innerHTML, the exact pattern this codebase
//    has never used and this guard exists to keep it from starting.
mutation(
  'use innerHTML in the detail column instead of building DOM nodes',
  VIEW,
  (src) => src.replace(
    "function buildDetailColumn(state, data, callbacks) {",
    "function buildDetailColumn(state, data, callbacks) {\n  document.body.innerHTML += ''; // hazard: innerHTML usage"
  ),
  'innerHTML'
);

console.log(`\nHealth Atlas view-boundary-wheel-mutations: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
