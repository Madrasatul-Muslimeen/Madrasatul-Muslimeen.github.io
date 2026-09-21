// PROVE THE view-boundary-more GUARD CAN ACTUALLY FAIL.
//
// `view-boundary-more.mjs` is a search for things that are wrong. On a
// healthy repository it prints nothing but PASS — which is exactly what a
// completely broken reader would print too. This project's own standing
// lesson is that a guard which cannot fail is worse than no guard, because
// it is believed.
//
// Each mutation below reintroduces the exact hazard this guard exists to
// catch: a dose, remedy or lifestyle-recommendation field leaking into the
// tranche-3 view. The guard must refuse it BY NAME. A mutation that does
// NOT produce the expected failure is reported as UNPROVEN rather than
// quietly passed.
//
// IT NEVER REACHES FOR `git`. Every file this harness touches is read into
// memory first and written back from memory in a `finally`.
//
// Run from the REPOSITORY ROOT:
//   node tools/health-atlas-verify/view-boundary-more-mutations.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const GUARD = path.join(root, 'tools', 'health-atlas-verify', 'view-boundary-more.mjs');
const VIEW = path.join(root, 'app', 'health', 'js', 'health-atlas-more-view.js');
const SELECTORS = path.join(root, 'app', 'health', 'js', 'health-atlas-more-selectors.js');

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

// 1. Reintroduce a food dose/serving field into the view.
mutation(
  'render food.servingQty in the food detail card',
  VIEW,
  (src) => src.replace(
    "el('div', { class: 'ha-meta', text: `Category: ${food.category}` }),",
    "el('div', { class: 'ha-meta', text: `Category: ${food.category}` }),\n    el('div', { class: 'ha-meta', text: `Serving: ${food.servingQty}` }),"
  ),
  'servingQty'
);

// 2. Reintroduce a disease remedy field into the view.
mutation(
  'render disease.remedies in the disease detail card',
  VIEW,
  (src) => src.replace(
    "el('div', { class: 'ha-section-label', text: 'Symptoms sometimes reported' }),",
    "el('div', { class: 'ha-section-label', text: 'Remedies' }),\n    plainList(disease.remedies),\n    el('div', { class: 'ha-section-label', text: 'Symptoms sometimes reported' }),"
  ),
  'remedies'
);

// 3. Reintroduce age.notes into the view.
mutation(
  'render age.notes in the age-group detail card',
  VIEW,
  (src) => src.replace(
    "el('div', { class: 'ha-meta', text: `Range: ${age.range}` }),",
    "el('div', { class: 'ha-meta', text: `Range: ${age.range}` }),\n    plainList(age.notes),"
  ),
  '.notes'
);

// 3b. Revert the organ-name strip and read food.organs directly again —
//     the EXACT real defect this tranche's own browser walk found before
//     ever shipping (several foods embed a dose in that field).
mutation(
  'read food.organs directly instead of calling organNamesFor(food)',
  VIEW,
  (src) => src.replace(
    "const organs = plainList(organNamesFor(food), 'ha-plain');",
    "const organs = plainList(food.organs, 'ha-plain');"
  ),
  'food.organs" read directly'
);

// 4. Import the Lifestyles dataset into the page — the whole excluded
//    export, not just one field.
mutation(
  'import HEALTH_ATLAS_LIFESTYLES into the page',
  path.join(root, 'app', 'health', 'health-atlas-more.html'),
  (src) => src.replace(
    'HEALTH_ATLAS_AGES,',
    'HEALTH_ATLAS_AGES,\n    HEALTH_ATLAS_LIFESTYLES,'
  ),
  'HEALTH_ATLAS_LIFESTYLES'
);

// 5. Add a selector that reads a forbidden field, proving the selectors
//    module is guarded independently of the view module.
mutation(
  'add a selector exposing disease.homeRemedies',
  SELECTORS,
  (src) => src + "\nexport function homeRemediesFor(disease) { return disease.homeRemedies; }\n",
  'homeRemedies'
);

console.log(`\nHealth Atlas view-boundary-more-mutations: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
