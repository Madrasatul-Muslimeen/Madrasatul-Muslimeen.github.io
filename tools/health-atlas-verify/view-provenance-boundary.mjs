// Health Atlas claim-provenance tranche 1 — the provenance rendering guard.
//
// Run from the repository root: node tools/health-atlas-verify/view-provenance-boundary.mjs
//
// This is the mechanical version of the rule written in
// health-atlas-view.js's own header comment: a function statement may only
// ever render as "cited" evidence by going through
// health-atlas-claims.js's registry — never by a hardcoded literal in the
// view module itself. Reads the VIEW MODULE'S OWN SOURCE TEXT rather than
// its behaviour, the same pattern view-boundary.mjs already uses in this
// same tranche's predecessor.
//
// Comments are stripped before scanning (see CLAUDE.md's own standing
// lesson, "strip both comment forms before grepping source for a
// forbidden name") — this file's own header comment names the forbidden
// literal in order to explain the rule, and that must not trip the guard.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const viewPath = path.join(repoRoot, 'app', 'health', 'js', 'health-atlas-view.js');

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

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');
}

const rawSource = readFileSync(viewPath, 'utf8');
const codeOnly = stripComments(rawSource);

check('view module file exists and is non-trivial', () => {
  assert(rawSource.length > 500, 'health-atlas-view.js looks empty or truncated');
});

check('POSITIVE CONTROL: the view module really does import and call the claims registry', () => {
  assert(codeOnly.includes("from './health-atlas-claims.js'"),
    'expected the view to import from health-atlas-claims.js');
  assert(codeOnly.includes('evidenceStatusFor('),
    'expected the view to call evidenceStatusFor()');
  assert(codeOnly.includes('EVIDENCE_STATUS.CITED_EVIDENCE'),
    'expected the view to compare against the imported EVIDENCE_STATUS.CITED_EVIDENCE constant');
  assert(codeOnly.includes('EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY'),
    'expected the view to compare against the imported EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY constant');
});

check('the view module never hardcodes the raw "cited-evidence" string literal (comments excluded)', () => {
  // The badge must be decided by comparing to the imported constant, never
  // by a parallel string literal that could silently diverge from it or be
  // set directly, bypassing the registry.
  assert(!codeOnly.includes("'cited-evidence'") && !codeOnly.includes('"cited-evidence"'),
    'found a literal "cited-evidence" string in executable source, outside a comment');
});

check('the view module never hardcodes the raw "general-reference-only" string literal (comments excluded)', () => {
  assert(!codeOnly.includes("'general-reference-only'") && !codeOnly.includes('"general-reference-only"'),
    'found a literal "general-reference-only" string in executable source, outside a comment');
});

check('every rendered function statement is run through the badge renderer (no bypass path)', () => {
  // renderOrganDetail must call renderEvidenceBadge for each function it
  // lists, not just render organ.functions as bare text.
  assert(codeOnly.includes('renderEvidenceBadge('),
    'expected renderOrganDetail to call a badge renderer for each function statement');
  const functionsBlockMatch = codeOnly.match(/organ\.functions[\s\S]{0,400}/);
  assert(functionsBlockMatch, 'expected to find the organ.functions rendering site');
  assert(functionsBlockMatch[0].includes('renderEvidenceBadge'),
    'the organ.functions rendering site does not call renderEvidenceBadge — a statement could render with no badge at all');
});

check('an unclassified statement is rendered as visibly unclassified, never silently defaulted', () => {
  assert(codeOnly.includes('Unclassified'),
    'expected an explicit "Unclassified" branch for a statement with no registry entry, rather than a silent default');
});

check('the raw (unstripped) source is allowed to explain the boundary in prose', () => {
  assert(rawSource.includes('cited-evidence') || rawSource.includes('EVIDENCE_STATUS'),
    "expected the file's own header comment to explain the provenance rule for a future reader");
});

console.log(`\nHealth Atlas view-provenance-boundary: ${passed} passed, ${failed} failed`);
if (failed) {
  for (const f of failures) console.log('  FAIL:', f);
  process.exit(1);
}
