// PROVE THE VIEW-PROVENANCE-BOUNDARY GUARD CAN ACTUALLY FAIL.
//
// `view-provenance-boundary.mjs` is a search for things that are wrong. On
// a healthy repository it prints nothing but PASS — which is exactly what
// a completely broken reader would print too. This project's own standing
// lesson is that a guard which cannot fail is worse than no guard, because
// it is believed.
//
// Each mutation below reintroduces the exact hazard this guard exists to
// catch: a function statement rendering as "cited" without going through
// the registry. The guard must refuse it BY NAME. A mutation that does NOT
// produce the expected failure is reported as UNPROVEN rather than quietly
// passed.
//
// IT NEVER REACHES FOR `git`. Every file this harness touches is read into
// memory first and written back from memory in a `finally`.
//
// Run from the REPOSITORY ROOT:
//   node tools/health-atlas-verify/view-provenance-mutations.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const GUARD = path.join(root, 'tools', 'health-atlas-verify', 'view-provenance-boundary.mjs');
const VIEW = path.join(root, 'app', 'health', 'js', 'health-atlas-view.js');

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

function mutation(name, mutate, expectSubstring) {
  check(`MUTATION ${name}`, () => {
    const before = fs.readFileSync(VIEW, 'utf8');
    try {
      const after = mutate(before);
      assert.notEqual(after, before, 'the mutation changed NOTHING — it proves nothing about the guard');
      fs.writeFileSync(VIEW, after);
      const { code, text } = runGuard();
      assert.notEqual(code, 0, `the guard exited 0 on "${name}" — it is UNPROVEN and must not be trusted`);
      assert.ok(text.includes(expectSubstring),
        `the guard failed, but not naming the expected fault. Expected to find: ${JSON.stringify(expectSubstring)}\nGot:\n${text}`);
    } finally {
      fs.writeFileSync(VIEW, before);
    }
  });
}

// 1. Reintroduce a hardcoded 'cited-evidence' literal, bypassing the
//    imported constant — the exact live-bypass shape this guard exists to
//    catch (a future edit that decides "cited" without the registry).
mutation(
  'hardcode a raw "cited-evidence" string literal in the badge renderer',
  (src) => src.replace(
    "if (status === EVIDENCE_STATUS.CITED_EVIDENCE) {",
    "if (status === EVIDENCE_STATUS.CITED_EVIDENCE || status === 'cited-evidence') {"
  ),
  'literal "cited-evidence" string'
);

// 2. Remove the import of the claims registry entirely (view falls back to
//    rendering functions with no provenance at all).
mutation(
  'remove the import of health-atlas-claims.js',
  (src) => src.replace(
    /import \{\n {2}EVIDENCE_STATUS,\n {2}evidenceStatusFor,\n {2}referenceIdFor\n\} from '\.\/health-atlas-claims\.js';\n/,
    ''
  ),
  'expected the view to import from health-atlas-claims.js'
);

// 3. Render organ.functions as bare text again, dropping the badge call —
//    the exact pre-tranche shape, now a regression.
mutation(
  'render function statements without calling the badge renderer',
  (src) => src.replace(
    `(organ.functions || []).map(fn => el('li', {}, [
      el('span', { class: 'ha-function-text', text: fn }),
      renderEvidenceBadge(organ.id, fn, data.referencesById)
    ])));`,
    `(organ.functions || []).map(fn => el('li', { text: fn })));`
  ),
  'organ.functions rendering site does not call renderEvidenceBadge'
);

// 4. Remove the "Unclassified" branch, so an unregistered statement would
//    silently fall through with no visible flag.
mutation(
  'remove the visible "Unclassified" fallback branch',
  (src) => src.replace(
    "  // No registry entry at all: say so plainly rather than guessing a status.\n  return el('span', { class: 'ha-evidence-badge ha-evidence-unclassified', text: 'Unclassified — no provenance record yet' });\n",
    "  return el('span', { class: 'ha-evidence-badge ha-evidence-general', text: 'General reference only — not verified as evidence for this specific statement' });\n"
  ),
  'Unclassified'
);

console.log(`\nHealth Atlas view-provenance-mutations: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
