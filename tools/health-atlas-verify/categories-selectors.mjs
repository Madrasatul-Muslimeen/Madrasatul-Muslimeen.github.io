// Health Atlas tranche 4 (Master Categories index) — pure selector logic
// checks.
//
// Run from the repository root: node tools/health-atlas-verify/categories-selectors.mjs

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

const {
  listMasterCategories,
  getMasterCategory,
  foodCountForSub,
  totalFoodCountForCategory
} = await importEsmFile(path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-categories-selectors.js'));

const {
  HEALTH_ATLAS_MASTER_CATEGORIES,
  HEALTH_ATLAS_FOODS
} = await importEsmFile(path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-data.js'));

check('listMasterCategories returns all 8 categories, and a copy not the live array', () => {
  const list = listMasterCategories(HEALTH_ATLAS_MASTER_CATEGORIES);
  assert(list.length === 8, `got ${list.length}`);
  assert(list !== HEALTH_ATLAS_MASTER_CATEGORIES, 'selector returned the same array reference');
});

check('getMasterCategory resolves a known category and returns null for an unknown id', () => {
  const protein = getMasterCategory(HEALTH_ATLAS_MASTER_CATEGORIES, 'protein');
  assert(protein && protein.name === 'Protein', 'did not resolve protein');
  assert(Array.isArray(protein.subs) && protein.subs.length === 4, `protein.subs expected 4 entries, got ${JSON.stringify(protein.subs)}`);
  assert(getMasterCategory(HEALTH_ATLAS_MASTER_CATEGORIES, 'no-such-category') === null, 'unknown category id should return null');
});

check('every sub-category label matches at least one real food.category value — no orphan label', () => {
  const foodCategorySet = new Set(HEALTH_ATLAS_FOODS.map(f => f.category));
  for (const category of HEALTH_ATLAS_MASTER_CATEGORIES) {
    for (const sub of category.subs) {
      assert(foodCategorySet.has(sub), `sub-category "${sub}" (under "${category.id}") matches no food.category in the live dataset`);
    }
  }
});

check('every food.category value is claimed by exactly one master category\'s subs — no orphan food category, no double-claim', () => {
  const foodCategorySet = new Set(HEALTH_ATLAS_FOODS.map(f => f.category));
  for (const fc of foodCategorySet) {
    const claimants = HEALTH_ATLAS_MASTER_CATEGORIES.filter(c => c.subs.includes(fc));
    assert(claimants.length === 1, `food.category "${fc}" is claimed by ${claimants.length} master categories, expected exactly 1`);
  }
});

check('foodCountForSub counts exactly, e.g. "Meat" against the live dataset', () => {
  const count = foodCountForSub(HEALTH_ATLAS_FOODS, 'Meat');
  const expected = HEALTH_ATLAS_FOODS.filter(f => f.category === 'Meat').length;
  assert(count === expected, `foodCountForSub("Meat") = ${count}, expected ${expected}`);
  assert(foodCountForSub(HEALTH_ATLAS_FOODS, 'No Such Sub') === 0, 'an unknown sub-category should count 0, not throw');
});

check('totalFoodCountForCategory sums each category\'s own subs with no loss and no overlap, and all 8 sum to the dataset total', () => {
  let grandTotal = 0;
  for (const category of HEALTH_ATLAS_MASTER_CATEGORIES) {
    const total = totalFoodCountForCategory(HEALTH_ATLAS_FOODS, category);
    const expected = category.subs.reduce((sum, sub) => sum + HEALTH_ATLAS_FOODS.filter(f => f.category === sub).length, 0);
    assert(total === expected, `totalFoodCountForCategory("${category.id}") = ${total}, expected ${expected}`);
    grandTotal += total;
  }
  assert(grandTotal === HEALTH_ATLAS_FOODS.length, `sum of all category totals is ${grandTotal}, expected ${HEALTH_ATLAS_FOODS.length} (the whole Foods dataset, since every category partitions it with no loss and no overlap)`);
});

check('Protein totals 10 foods across its 4 subs (Meat/Fish/Beans-Lentils/Nuts) — a concrete cross-check against the live dataset, not just an internal-consistency sum', () => {
  const protein = getMasterCategory(HEALTH_ATLAS_MASTER_CATEGORIES, 'protein');
  const total = totalFoodCountForCategory(HEALTH_ATLAS_FOODS, protein);
  assert(total === 10, `Protein totalled ${total}, expected 10`);
});

console.log(`\nHealth Atlas categories-selectors: ${passed} passed, ${failed} failed`);
if (failed) {
  for (const f of failures) console.log('  FAIL:', f);
  process.exit(1);
}
