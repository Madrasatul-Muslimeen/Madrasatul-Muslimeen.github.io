// PROVE THE view-boundary-categories GUARD CAN ACTUALLY FAIL.
//
// `view-boundary-categories.mjs` is a search for things that are wrong. On
// a healthy repository it prints nothing but PASS — which is exactly what a
// completely broken reader would print too. This project's own standing
// lesson is that a guard which cannot fail is worse than no guard, because
// it is believed.
//
// Each mutation below reintroduces a hazard the guard exists to catch: a
// forbidden Foods field, or an import of a whole dataset this tranche has
// no legitimate reason to touch. The guard must refuse it BY NAME. A
// mutation that does NOT produce the expected failure is reported as
// UNPROVEN rather than quietly passed.
//
// IT NEVER REACHES FOR `git`. Every file this harness touches is read into
// memory first and written back from memory in a `finally`.
//
// Run from the REPOSITORY ROOT:
//   node tools/health-atlas-verify/view-boundary-categories-mutations.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const GUARD = path.join(root, 'tools', 'health-atlas-verify', 'view-boundary-categories.mjs');
const VIEW = path.join(root, 'app', 'health', 'js', 'health-atlas-categories-view.js');
const SELECTORS = path.join(root, 'app', 'health', 'js', 'health-atlas-categories-selectors.js');
const PAGE = path.join(root, 'app', 'health', 'health-atlas-categories.html');

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
  'render food.servingQty in the category detail card',
  VIEW,
  (src) => src.replace(
    "el('h2', { text: category.name }),",
    "el('h2', { text: category.name }),\n    el('div', { class: 'ha-meta', text: `Serving: ${data.foods[0].servingQty}` }),"
  ),
  'servingQty'
);

// 2. Read food.organs directly (the exact real defect tranche 3 found and
//    fixed for its own view — this tranche should never reintroduce it).
mutation(
  'read food.organs directly in the categories view',
  VIEW,
  (src) => src.replace(
    "function renderCategoryDetail(data, categoryId, onBack) {",
    "function renderCategoryDetail(data, categoryId, onBack) {\n  void data.foods[0].organs;"
  ),
  '.organs'
);

// 3. Import HEALTH_ATLAS_DISEASES into the page — a whole dataset this
//    tranche has no legitimate reason to touch.
mutation(
  'import HEALTH_ATLAS_DISEASES into the page',
  PAGE,
  (src) => src.replace(
    'HEALTH_ATLAS_FOODS\n  } from',
    'HEALTH_ATLAS_FOODS,\n    HEALTH_ATLAS_DISEASES\n  } from'
  ),
  'HEALTH_ATLAS_DISEASES'
);

// 4. Import HEALTH_ATLAS_LIFESTYLES into the page — the same excluded
//    dataset tranche 3 also refused to touch.
mutation(
  'import HEALTH_ATLAS_LIFESTYLES into the page',
  PAGE,
  (src) => src.replace(
    'HEALTH_ATLAS_FOODS\n  } from',
    'HEALTH_ATLAS_FOODS,\n    HEALTH_ATLAS_LIFESTYLES\n  } from'
  ),
  'HEALTH_ATLAS_LIFESTYLES'
);

// 5. Add a selector that reads a forbidden field, proving the selectors
//    module is guarded independently of the view module.
mutation(
  'add a selector exposing food.nutrition',
  SELECTORS,
  (src) => src + "\nexport function nutritionFor(food) { return food.nutrition; }\n",
  '.nutrition'
);

// 6. Widen the page's data-file import beyond the two names this tranche
//    is authorised to touch.
mutation(
  'import an unauthorised third name from health-atlas-data.js',
  PAGE,
  (src) => src.replace(
    'HEALTH_ATLAS_FOODS\n  } from',
    'HEALTH_ATLAS_FOODS,\n    HEALTH_ATLAS_AGES\n  } from'
  ),
  'exactly 2 imports'
);

console.log(`\nHealth Atlas view-boundary-categories-mutations: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
