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
  organCountsBySystem
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

console.log(`\nHealth Atlas selectors: ${passed} passed, ${failed} failed`);
if (failed) {
  for (const f of failures) console.log('  FAIL:', f);
  process.exit(1);
}
