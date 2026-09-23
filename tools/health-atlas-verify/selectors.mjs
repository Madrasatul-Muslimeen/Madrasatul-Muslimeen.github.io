// Health Atlas foundation tranche 1 — pure selector logic checks.
//
// Run from the repository root: node tools/health-atlas-verify/selectors.mjs

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
  listSystems,
  systemById,
  organsForSystem,
  getOrgan,
  referencesFor,
  organCountsBySystem,
  matchesOrganSearch,
  organsForReference
} = await importEsmFile(path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-selectors.js'));

const {
  HEALTH_ATLAS_SYSTEMS,
  HEALTH_ATLAS_ORGANS,
  HEALTH_ATLAS_REFERENCES
} = await importEsmFile(path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-data.js'));

check('listSystems returns all 9 systems, in source order', () => {
  const list = listSystems(HEALTH_ATLAS_SYSTEMS);
  assert(list.length === 9, `got ${list.length}`);
  assert(list[0].id === 'cardio', `first system was ${list[0].id}, expected cardio`);
});

check('listSystems returns a copy, not the live array', () => {
  const list = listSystems(HEALTH_ATLAS_SYSTEMS);
  assert(list !== HEALTH_ATLAS_SYSTEMS, 'selector returned the same array reference');
});

check('systemById finds a known system and returns null for an unknown one', () => {
  const cardio = systemById(HEALTH_ATLAS_SYSTEMS, 'cardio');
  assert(cardio && cardio.name === 'Cardiovascular', 'did not resolve cardio');
  assert(systemById(HEALTH_ATLAS_SYSTEMS, 'no-such-system') === null, 'unknown system id should return null');
});

check('organsForSystem("cardio") includes the Heart and only cardio organs', () => {
  const organs = organsForSystem(HEALTH_ATLAS_ORGANS, 'cardio');
  assert(organs.some(o => o.id === 'heart'), 'heart missing from cardio organs');
  assert(organs.every(o => o.system === 'cardio'), 'organsForSystem leaked an organ from another system');
});

check('getOrgan resolves the Heart by id and returns null for an unknown id', () => {
  const heart = getOrgan(HEALTH_ATLAS_ORGANS, 'heart');
  assert(heart && heart.name === 'Heart', 'did not resolve heart');
  assert(Array.isArray(heart.functions) && heart.functions.length > 0, 'heart has no functions list');
  assert(getOrgan(HEALTH_ATLAS_ORGANS, 'no-such-organ') === null, 'unknown organ id should return null');
});

check('referencesFor resolves ref ids to {name,url} entries in order', () => {
  const heart = getOrgan(HEALTH_ATLAS_ORGANS, 'heart');
  const refs = referencesFor(heart, HEALTH_ATLAS_REFERENCES);
  assert(refs.length === heart.refs.length, 'reference count mismatch');
  assert(refs.every(r => typeof r.name === 'string' && typeof r.url === 'string'), 'a resolved reference is missing name/url');
});

check('referencesFor is safe against an entity with no refs field', () => {
  const refs = referencesFor({}, HEALTH_ATLAS_REFERENCES);
  assert(Array.isArray(refs) && refs.length === 0, 'expected an empty array');
});

check('organCountsBySystem sums to the total organ count, once each', () => {
  const counts = organCountsBySystem(HEALTH_ATLAS_SYSTEMS, HEALTH_ATLAS_ORGANS);
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  assert(total === HEALTH_ATLAS_ORGANS.length, `counts summed to ${total}, expected ${HEALTH_ATLAS_ORGANS.length}`);
});

// matchesOrganSearch (parity tranche 6, additive).
check('matchesOrganSearch: empty/blank term matches everything', () => {
  const heart = getOrgan(HEALTH_ATLAS_ORGANS, 'heart');
  assert(matchesOrganSearch(heart, '') === true, 'empty term should match');
  assert(matchesOrganSearch(heart, '   ') === true, 'blank term should match');
});

check('matchesOrganSearch: matches on organ name, case-insensitively', () => {
  const heart = getOrgan(HEALTH_ATLAS_ORGANS, 'heart');
  assert(matchesOrganSearch(heart, 'HeArT') === true, 'expected a case-insensitive name match');
  assert(matchesOrganSearch(heart, 'kidney') === false, 'heart should not match "kidney"');
});

check('matchesOrganSearch: matches on a function statement substring', () => {
  const heart = getOrgan(HEALTH_ATLAS_ORGANS, 'heart');
  assert(matchesOrganSearch(heart, 'blood pressure') === true,
    'expected a match against one of heart.functions ("Helps maintain blood pressure")');
});

check('matchesOrganSearch: a term matching neither name nor any function returns false', () => {
  const heart = getOrgan(HEALTH_ATLAS_ORGANS, 'heart');
  assert(matchesOrganSearch(heart, 'xyz-no-such-term') === false, 'expected no match');
});

check('matchesOrganSearch: is safe against an organ with no functions array', () => {
  assert(matchesOrganSearch({ name: 'X' }, 'anything') === false, 'expected false, not a throw');
  assert(matchesOrganSearch({ name: 'X' }, '') === true, 'blank term should still match');
});

// organsForReference (references-index tranche 9, additive) — the reverse
// of referencesFor(): reference id -> organs whose own .refs[] names it.
check('organsForReference: r1 (MedlinePlus) is cited by every one of the 46 organs', () => {
  const organs = organsForReference(HEALTH_ATLAS_ORGANS, 'r1');
  assert(organs.length === HEALTH_ATLAS_ORGANS.length, `got ${organs.length}, expected all ${HEALTH_ATLAS_ORGANS.length}`);
});

check('organsForReference: r5 (USDA FoodData Central) is cited by no organ — a real case, not hypothetical', () => {
  const organs = organsForReference(HEALTH_ATLAS_ORGANS, 'r5');
  assert(Array.isArray(organs) && organs.length === 0, `got ${organs.length}, expected 0`);
});

check('organsForReference: every returned organ really names the id in its own .refs[]', () => {
  const organs = organsForReference(HEALTH_ATLAS_ORGANS, 'r7');
  assert(organs.length > 0, 'expected at least one organ for r7 (World Health Organization)');
  assert(organs.every(o => Array.isArray(o.refs) && o.refs.includes('r7')), 'a returned organ does not actually name r7');
});

check('organsForReference: an unknown reference id returns an empty array, not a throw', () => {
  const organs = organsForReference(HEALTH_ATLAS_ORGANS, 'no-such-ref');
  assert(Array.isArray(organs) && organs.length === 0, 'expected an empty array for an unknown reference id');
});

check('organsForReference: is safe against a non-array organs list entry with no refs field', () => {
  const organs = organsForReference([{ id: 'x', name: 'X' }], 'r1');
  assert(Array.isArray(organs) && organs.length === 0, 'expected an empty array, not a throw');
});

check('sanity: HEALTH_ATLAS_REFERENCES has exactly the 8 ids the source defines', () => {
  const ids = Object.keys(HEALTH_ATLAS_REFERENCES).sort();
  const expected = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'];
  assert(ids.length === expected.length && expected.every(id => ids.includes(id)), `got [${ids.join(', ')}]`);
});

console.log(`\nHealth Atlas selectors: ${passed} passed, ${failed} failed`);
if (failed) {
  for (const f of failures) console.log('  FAIL:', f);
  process.exit(1);
}
