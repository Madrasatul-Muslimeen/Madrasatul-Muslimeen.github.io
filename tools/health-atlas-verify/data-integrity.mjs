// Health Atlas foundation tranche 1 — data preservation checks.
//
// Run from the repository root: node tools/health-atlas-verify/data-integrity.mjs
//
// Asserts app/health/js/health-atlas-data.js is a faithful, unmodified port
// of the verified source dataset (compared against the fixture pulled
// directly from health/source-v02-04-handover at commit ed4dbb2e), and that
// internal cross-references (organ.system, and every refs[] id) resolve.

import { readFileSync } from 'node:fs';
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

const fixture = JSON.parse(readFileSync(
  path.join(here, 'fixtures', 'health-atlas-v02.04-source-data.json'), 'utf8'
));

const mod = await importEsmFile(path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-data.js'));
// Loaded at top level (not inside a check body) precisely because check()
// above is SYNCHRONOUS and does not await a promise a check body returns —
// an async check body here would report PASS immediately, before its own
// assertions ever ran (the exact "a synchronous check runner counts an
// async body as a PASS" trap CLAUDE.md's own standing lessons name).
const diagramsMod = await importEsmFile(path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-diagrams.js'));

check('HEALTH_ATLAS_STATUS is the literal string DRAFT', () => {
  assert(mod.HEALTH_ATLAS_STATUS === 'DRAFT', `got ${JSON.stringify(mod.HEALTH_ATLAS_STATUS)}`);
});

check('provenance matches the verified source exactly', () => {
  const p = mod.HEALTH_ATLAS_PROVENANCE;
  assert(p.sourceCommit === 'ed4dbb2e535ba6b95ea286a5f3b29a32122ea4b9', 'sourceCommit mismatch');
  assert(p.sourceBlobSha === 'dae1476867b6ad28f6911961f1bfd9769dc815d4', 'sourceBlobSha mismatch');
  assert(p.sourceSha256 === 'f7cb56980ae125bb387118c9282bf50c92b5fe414ca3480fa92547e9af9685a1', 'sourceSha256 mismatch');
  assert(p.sourceByteLength === 115697, 'sourceByteLength mismatch');
  assert(p.sourceBranch === 'health/source-v02-04-handover', 'sourceBranch mismatch');
  assert(p.sourcePath === 'docs/health-source/health-atlas-v02.04-standalone.html', 'sourcePath mismatch');
});

const entityMap = [
  ['HEALTH_ATLAS_REFERENCES', 'references', null],
  ['HEALTH_ATLAS_SYSTEMS', 'systems', 9],
  ['HEALTH_ATLAS_ORGANS', 'organs', 46],
  ['HEALTH_ATLAS_FOODS', 'foods', 34],
  ['HEALTH_ATLAS_DISEASES', 'diseases', 17],
  ['HEALTH_ATLAS_LIFESTYLES', 'lifestyles', 10],
  ['HEALTH_ATLAS_AGES', 'ages', 6],
  ['HEALTH_ATLAS_MASTER_CATEGORIES', 'masterCategories', 8]
];

for (const [exportName, fixtureKey, expectedCount] of entityMap) {
  check(`${exportName} is byte-identical to the verified source fixture`, () => {
    const actual = JSON.stringify(mod[exportName]);
    const expected = JSON.stringify(fixture[fixtureKey]);
    assert(actual === expected, 'value diverges from the fixture pulled from the verified source commit');
  });
  if (expectedCount !== null) {
    check(`${exportName} has exactly ${expectedCount} entries (matches the issue's own count)`, () => {
      const n = Array.isArray(mod[exportName]) ? mod[exportName].length : Object.keys(mod[exportName]).length;
      assert(n === expectedCount, `got ${n}`);
    });
  }
}

check('every organ.system references a real system id', () => {
  const systemIds = new Set(mod.HEALTH_ATLAS_SYSTEMS.map(s => s.id));
  const bad = mod.HEALTH_ATLAS_ORGANS.filter(o => !systemIds.has(o.system));
  assert(bad.length === 0, `organs with unknown system id: ${bad.map(o => o.id).join(', ')}`);
});

check('every id is unique within each entity array', () => {
  for (const [exportName] of entityMap) {
    if (exportName === 'HEALTH_ATLAS_REFERENCES') continue;
    const ids = mod[exportName].map(item => item.id);
    const unique = new Set(ids);
    assert(unique.size === ids.length, `${exportName} has a duplicate id`);
  }
});

check('every refs[] id across organs/foods/diseases/lifestyles resolves to a real reference', () => {
  const refIds = new Set(Object.keys(mod.HEALTH_ATLAS_REFERENCES));
  const arrays = [mod.HEALTH_ATLAS_ORGANS, mod.HEALTH_ATLAS_FOODS, mod.HEALTH_ATLAS_DISEASES, mod.HEALTH_ATLAS_LIFESTYLES];
  const dangling = [];
  for (const arr of arrays) {
    for (const item of arr) {
      for (const r of item.refs || []) {
        if (!refIds.has(r)) dangling.push(`${item.id} -> ${r}`);
      }
    }
  }
  assert(dangling.length === 0, `dangling refs: ${dangling.join(', ')}`);
});

check('every organ.partType is one of the source\'s own seven closed values (parity tranche 12)', () => {
  // The v02.04 source's own SCHEMAS.organ.partType field def:
  // ['Organ','Vein','Artery','Nerve','Tissue','Gland','Duct']. Bound to
  // that set rather than hardcoded loosely, so a future data change that
  // widens it fails here first rather than silently reaching the view's
  // "Type" pill (health-atlas-view.js, parity tranche 12) with an
  // unexpected value.
  const closedSet = new Set(['Organ', 'Vein', 'Artery', 'Nerve', 'Tissue', 'Gland', 'Duct']);
  const missing = mod.HEALTH_ATLAS_ORGANS.filter(o => !o.partType);
  assert(missing.length === 0, `organs missing partType: ${missing.map(o => o.id).join(', ')}`);
  const bad = mod.HEALTH_ATLAS_ORGANS.filter(o => !closedSet.has(o.partType));
  assert(bad.length === 0, `organs with an unexpected partType: ${bad.map(o => `${o.id}=${o.partType}`).join(', ')}`);
});

check('every diagram partMap entry (parity tranche 13) names a real organ AND a real shape id in the SAME system', () => {
  // Cross-file consistency: health-atlas-diagrams.js's partMap is keyed by
  // organ NAME and valued by a shape id, both of which must correspond to
  // something real in health-atlas-data.js / the diagram's own shapes array
  // — otherwise health-atlas-view.js's highlight lookup
  // (diagram.partMap[organ.name]) would silently resolve to undefined (no
  // highlight, no error) for a real organ, or point at a shape id that does
  // not exist in that system's own diagram.
  for (const [systemId, diagram] of Object.entries(diagramsMod.HEALTH_ATLAS_DIAGRAMS)) {
    const organsInSystem = new Set(mod.HEALTH_ATLAS_ORGANS.filter(o => o.system === systemId).map(o => o.name));
    const shapeIdsInDiagram = new Set(diagram.shapes.map(s => s.id).filter(Boolean));
    for (const [organName, shapeId] of Object.entries(diagram.partMap)) {
      assert(organsInSystem.has(organName), `${systemId}.partMap names organ "${organName}", which is not a real organ in that system`);
      assert(shapeIdsInDiagram.has(shapeId), `${systemId}.partMap["${organName}"] = "${shapeId}", which is not a real shape id in that diagram`);
    }
  }
});

check('every exported entity array/object is frozen (Object.freeze)', () => {
  for (const [exportName] of entityMap) {
    assert(Object.isFrozen(mod[exportName]), `${exportName} is not frozen`);
  }
});

console.log(`\nHealth Atlas data-integrity: ${passed} passed, ${failed} failed`);
if (failed) {
  for (const f of failures) console.log('  FAIL:', f);
  process.exit(1);
}
