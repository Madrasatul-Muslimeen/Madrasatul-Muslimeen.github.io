// MAP Phase 3 — pure WbW coverage projection, not a generic Approach claim.
// Callers provide a bounded set of v1 occurrence IDs and explicit approved IDs.
// No reading, listening, or opening event implies approval.

import { parseQuranWordOccurrenceId } from "./quran-word-identity.js";

export function computeWbwCoverage(occurrenceIds, approvedIds) {
  if (!Array.isArray(occurrenceIds) || !Array.isArray(approvedIds)) {
    throw new TypeError("Occurrence and approved identifiers must be arrays.");
  }
  const scope = new Set();
  for (const id of occurrenceIds) {
    parseQuranWordOccurrenceId(id);
    scope.add(id);
  }
  const approved = new Set();
  for (const id of approvedIds) {
    parseQuranWordOccurrenceId(id);
    if (scope.has(id)) approved.add(id);
  }
  return Object.freeze({
    identityContract: "quran-word-occurrence:v1",
    total: scope.size,
    approved: approved.size,
    remaining: scope.size - approved.size,
    percent: scope.size ? Math.round(approved.size * 10000 / scope.size) / 100 : 0,
  });
}

