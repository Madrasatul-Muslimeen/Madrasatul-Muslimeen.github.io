// Health Atlas tranche 3 (Foods / Diseases / Age Groups) — pure selector
// logic checks.
//
// Run from the repository root: node tools/health-atlas-verify/more-selectors.mjs

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
  listFoodCategories,
  foodsByCategory,
  getFood,
  organNamesFor,
  listDiseases,
  getDisease,
  listAgeGroups,
  getAgeGroup,
  matchesFoodSearch,
  matchesDiseaseSearch
} = await importEsmFile(path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-more-selectors.js'));

const {
  HEALTH_ATLAS_FOODS,
  HEALTH_ATLAS_DISEASES,
  HEALTH_ATLAS_AGES
} = await importEsmFile(path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-data.js'));

check('listFoodCategories returns each category exactly once, in first-seen order', () => {
  const cats = listFoodCategories(HEALTH_ATLAS_FOODS);
  assert(new Set(cats).size === cats.length, 'a category appeared more than once');
  assert(cats[0] === 'Air', `first category was ${cats[0]}, expected Air`);
});

check('foodsByCategory partitions all 34 foods with no loss and no overlap', () => {
  const cats = listFoodCategories(HEALTH_ATLAS_FOODS);
  const total = cats.reduce((sum, c) => sum + foodsByCategory(HEALTH_ATLAS_FOODS, c).length, 0);
  assert(total === HEALTH_ATLAS_FOODS.length, `partitioned total ${total} !== ${HEALTH_ATLAS_FOODS.length}`);
  for (const c of cats) {
    assert(foodsByCategory(HEALTH_ATLAS_FOODS, c).every(f => f.category === c), `foodsByCategory("${c}") leaked a food from another category`);
  }
});

check('getFood resolves a known food and returns null for an unknown id', () => {
  const water = getFood(HEALTH_ATLAS_FOODS, 'water-plain');
  assert(water && water.name === 'Plain Water', 'did not resolve water-plain');
  assert(getFood(HEALTH_ATLAS_FOODS, 'no-such-food') === null, 'unknown food id should return null');
});

check('organNamesFor strips a dose recommendation off the six known real-data entries that embed one', () => {
  // Found by walking every rendered food in a real browser before shipping,
  // not assumed from the field's own (mostly clean-looking) shape.
  const doseEmbedded = [
    ['oats', ['Heart', 'Pancreas', 'Large Intestine']],
    ['almonds', ['Heart', 'Skin', 'Brain']],
    ['walnuts', ['Brain', 'Heart']],
    ['lentils', ['Liver', 'Skeletal Muscles', 'Large Intestine']],
    ['spinach', ['Liver', 'Eyes', 'Bones']],
    ['berries', ['Brain', 'Heart', 'Kidneys']]
  ];
  for (const [id, expectedNames] of doseEmbedded) {
    const food = getFood(HEALTH_ATLAS_FOODS, id);
    assert(food, `fixture food "${id}" not found -- has the source data changed?`);
    const names = organNamesFor(food);
    assert(JSON.stringify(names) === JSON.stringify(expectedNames), `organNamesFor("${id}") = ${JSON.stringify(names)}, expected ${JSON.stringify(expectedNames)}`);
    assert(!names.some(n => /\d/.test(n)), `organNamesFor("${id}") left a digit in an organ name: ${JSON.stringify(names)}`);
  }
});

check('organNamesFor leaves no digit in ANY of the 34 foods -- proves the strip works dataset-wide, not just on the 6 known cases', () => {
  for (const food of HEALTH_ATLAS_FOODS) {
    const names = organNamesFor(food);
    assert(!names.some(n => /\d/.test(n)), `food "${food.id}" still has a digit after organNamesFor: ${JSON.stringify(names)}`);
  }
});

check('listDiseases returns all 17 diseases and a copy, not the live array', () => {
  const list = listDiseases(HEALTH_ATLAS_DISEASES);
  assert(list.length === 17, `got ${list.length}`);
  assert(list !== HEALTH_ATLAS_DISEASES, 'selector returned the same array reference');
});

check('getDisease resolves Coronary Artery Disease and returns null for an unknown id', () => {
  const cad = getDisease(HEALTH_ATLAS_DISEASES, 'cad');
  assert(cad && cad.name === 'Coronary Artery Disease', 'did not resolve cad');
  assert(Array.isArray(cad.cause) && cad.cause.length > 0, 'cad has no cause list');
  assert(Array.isArray(cad.symptoms) && cad.symptoms.length > 0, 'cad has no symptoms list');
  assert(getDisease(HEALTH_ATLAS_DISEASES, 'no-such-disease') === null, 'unknown disease id should return null');
});

check('listAgeGroups returns all 6 age groups in source order', () => {
  const list = listAgeGroups(HEALTH_ATLAS_AGES);
  assert(list.length === 6, `got ${list.length}`);
  assert(list[0].id === 'infant', `first age group was ${list[0].id}, expected infant`);
});

check('getAgeGroup resolves a known age group and returns null for an unknown id', () => {
  const child = getAgeGroup(HEALTH_ATLAS_AGES, 'child');
  assert(child && child.range === '3–12 years', 'did not resolve child with its range');
  assert(getAgeGroup(HEALTH_ATLAS_AGES, 'no-such-age') === null, 'unknown age id should return null');
});

check('matchesFoodSearch: empty term matches everything', () => {
  const avocado = getFood(HEALTH_ATLAS_FOODS, 'avocado');
  assert(matchesFoodSearch(avocado, ''), 'expected an empty term to match');
  assert(matchesFoodSearch(avocado, '   '), 'expected a whitespace-only term to match');
});

check('matchesFoodSearch matches on name and category, case-insensitively', () => {
  const avocado = getFood(HEALTH_ATLAS_FOODS, 'avocado');
  assert(matchesFoodSearch(avocado, 'Avo'), 'expected a name-prefix match');
  assert(matchesFoodSearch(avocado, 'FAT'), 'expected a category match regardless of case');
  assert(!matchesFoodSearch(avocado, 'zzz-no-such-term'), 'expected no match for an unrelated term');
});

check('matchesFoodSearch does NOT match on the excluded .nutrition field -- a real, present value must stay invisible to search', () => {
  const avocado = getFood(HEALTH_ATLAS_FOODS, 'avocado');
  assert(avocado.nutrition.some(n => /potassium/i.test(n)), 'fixture assumption broke: avocado no longer lists Potassium in .nutrition');
  assert(!matchesFoodSearch(avocado, 'potassium'), 'search matched a term that only appears in the excluded .nutrition field -- this is exactly the indirect leak the boundary comment warns about');
});

check('matchesDiseaseSearch: empty term matches everything', () => {
  const cad = getDisease(HEALTH_ATLAS_DISEASES, 'cad');
  assert(matchesDiseaseSearch(cad, ''), 'expected an empty term to match');
});

check('matchesDiseaseSearch matches on name, cause, symptoms and organAffected', () => {
  const cad = getDisease(HEALTH_ATLAS_DISEASES, 'cad');
  assert(matchesDiseaseSearch(cad, 'coronary'), 'expected a name match');
  assert(matchesDiseaseSearch(cad, 'plaque'), 'expected a .cause match');
  assert(matchesDiseaseSearch(cad, 'chest pain'), 'expected a .symptoms match');
  assert(matchesDiseaseSearch(cad, 'heart'), 'expected an .organAffected match');
  assert(!matchesDiseaseSearch(cad, 'zzz-no-such-term'), 'expected no match for an unrelated term');
});

check('matchesDiseaseSearch does NOT match on .remedies/.homeRemedies/.naturalRemedies -- present, real values must stay invisible to search', () => {
  const cad = getDisease(HEALTH_ATLAS_DISEASES, 'cad');
  assert(cad.remedies.some(r => /statin/i.test(r)), 'fixture assumption broke: cad no longer mentions statins in .remedies');
  assert(!matchesDiseaseSearch(cad, 'statin'), 'search matched a term that only appears in the excluded .remedies field -- a hit list is itself a disclosure of that hidden text');
  assert(!matchesDiseaseSearch(cad, 'angioplasty'), 'search matched a term that only appears in the excluded .remedies field');
});

check('matchesFoodSearch and matchesDiseaseSearch never throw on an entry missing an optional array field', () => {
  assert(matchesDiseaseSearch({ id: 'x', name: 'X' }, 'anything') === false, 'expected a graceful non-match, not a throw, on a disease with no cause/symptoms/organAffected');
  assert(matchesFoodSearch({ id: 'x', name: 'X' }, 'anything') === false, 'expected a graceful non-match, not a throw, on a food with no category');
});

console.log(`\nHealth Atlas more-selectors: ${passed} passed, ${failed} failed`);
if (failed) {
  for (const f of failures) console.log('  FAIL:', f);
  process.exit(1);
}
