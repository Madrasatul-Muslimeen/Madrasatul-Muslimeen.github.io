// MAP Phase 6 (P6-A) — ADR-010 Mapping My Journey foundation, as PURE policy.
//
// No Firebase, no DOM, no mutable state, no I/O. Deliberately uninvoked, and
// `noteFolders` / `notePlacements` remain unruled and unactivated: this module
// decides what they MEAN, and activating them is a separate task behind a
// deployment dependency.
//
// MMJ IS A DESTINATION OVER THE NOTE FOUNDATION, NOT A SECOND NOTEBOOK.
// Nothing here stores, copies, or re-identifies Note content. A folder holds a
// reference to a permanent `noteId` and nothing else — ADR-004's "moving a Note
// never changes its identity" is only true while that stays so.
//
// ORIGIN AND DESTINATION MAY NEVER BE DERIVED FROM EACH OTHER (ADR-010 §2).
// This module therefore never imports `study-note-binding.js`, has no concept
// of a Study Unit key, and cannot see one: auto-filing a Note under the surah
// it is about would make Destination a function of Origin and quietly collapse
// a locked distinction. The absence of that import is the enforcement.

/** ADR-010 §3 — closed set. The two system roles are what make "Reflection Archive ≠ Personal Journey Map" a fact in the data rather than a description. */
export const FOLDER_SEMANTIC_ROLES = Object.freeze(["journey-map", "reflection-archive", "user"]);

/** At most one of each per (tenant, person); never renameable into another role. */
export const SYSTEM_FOLDER_ROLES = Object.freeze(["journey-map", "reflection-archive"]);

/** ADR-010 §4 — including the root. Every consumer of a tree walks it; an unbounded depth turns one pathological chain into an unbounded read on a screen that must open fast. */
export const MAX_FOLDER_DEPTH = 8;

export function isSystemFolderRole(semanticRole) {
  return SYSTEM_FOLDER_ROLES.includes(semanticRole);
}

function requireOwner({ tenantId, ownerPersonId }) {
  for (const [name, value] of [["tenantId", tenantId], ["ownerPersonId", ownerPersonId]]) {
    if (typeof value !== "string" || !value.trim() || value.includes("/")) {
      throw new TypeError(`journey-map-contract: ${name} must be a non-empty path-safe string.`);
    }
  }
}

/**
 * The fields a folder may carry, validated.
 *
 * `parentFolderId` is only checked for SHAPE here. Whether that parent exists,
 * is active, belongs to the same owner, and does not close a cycle cannot be
 * decided without the other folders — that is `folderTreeRefusal()` below, and
 * it is a separate function precisely so a caller cannot satisfy the easy half
 * and believe it has satisfied both.
 */
export function journeyFolder({
  tenantId, ownerPersonId, name, parentFolderId = null, semanticRole = "user", order = 0,
} = {}) {
  requireOwner({ tenantId, ownerPersonId });
  if (typeof name !== "string" || name.trim() === "") {
    throw new TypeError("journey-map-contract: a folder needs a name.");
  }
  if (!FOLDER_SEMANTIC_ROLES.includes(semanticRole)) {
    throw new TypeError(`journey-map-contract: semanticRole must be one of ${FOLDER_SEMANTIC_ROLES.join(", ")}.`);
  }
  if (parentFolderId !== null && (typeof parentFolderId !== "string" || !parentFolderId.trim())) {
    throw new TypeError("journey-map-contract: parentFolderId must be a folder id or null.");
  }
  if (isSystemFolderRole(semanticRole) && parentFolderId !== null) {
    // A system folder IS the root of its own meaning. Nesting the Reflection
    // Archive inside a user folder would let a person hide it, or move it under
    // the Journey Map and make one a part of the other — which is the locked
    // distinction quietly undone by a drag.
    throw new TypeError("journey-map-contract: a system folder cannot have a parent.");
  }
  if (!Number.isInteger(order)) throw new TypeError("journey-map-contract: order must be an integer.");
  return Object.freeze({ tenantId, ownerPersonId, name, parentFolderId, semanticRole, order });
}

/**
 * Why a proposed parent is refused, or `null` when the tree stays a tree.
 *
 * `folders` is a Map (or plain object) of folderId → the folder as stored. A
 * caller supplies the person's own folders; this function judges them and
 * touches nothing.
 *
 * Returns a REASON rather than throwing, and rather than a bare boolean: every
 * one of these refusals has to reach a person as a sentence, and "false" cannot
 * be translated into one.
 */
export function folderTreeRefusal({ folders, tenantId, ownerPersonId, folderId, parentFolderId } = {}) {
  if (parentFolderId === null || parentFolderId === undefined) return null;
  const at = (id) => (folders instanceof Map ? folders.get(id) : folders?.[id]);

  if (parentFolderId === folderId) return "self-parent";

  const parent = at(parentFolderId);
  if (!parent) return "parent-missing";
  if (parent.tenantId !== tenantId || parent.ownerPersonId !== ownerPersonId) return "parent-not-mine";
  if (parent.status !== "active") return "parent-not-active";
  if (isSystemFolderRole(parent.semanticRole)) {
    // Symmetric to the rule above: a system folder is neither nested nor nestable.
    return "parent-is-system";
  }

  // Walk up from the proposed parent. The walk is bounded by the number of
  // folders as well as by depth, so a cycle that predates this contract cannot
  // spin here either.
  const seen = new Set([folderId]);
  let depth = 2; // the new folder, plus its proposed parent
  let cursor = parent;
  let cursorId = parentFolderId;
  while (cursor) {
    if (seen.has(cursorId)) return "cycle";
    seen.add(cursorId);
    if (cursor.parentFolderId == null) break;
    depth += 1;
    if (depth > MAX_FOLDER_DEPTH) return "too-deep";
    cursorId = cursor.parentFolderId;
    cursor = at(cursorId);
    if (!cursor) return "ancestor-missing";
  }
  return null;
}

/**
 * The fields a placement may carry, validated.
 *
 * ADR-010 §2: a placement names a Note and a folder, and NOTHING about what the
 * Note is about. The four Origin field names are refused explicitly rather than
 * merely omitted, so an attempt to smuggle one through fails loudly instead of
 * being silently dropped.
 */
const ORIGIN_ONLY_FIELDS = Object.freeze(["sourceKey", "sourceKind", "relationshipKind", "provenanceKind"]);

export function notePlacement({ tenantId, ownerPersonId, noteId, folderId, order = 0, ...rest } = {}) {
  requireOwner({ tenantId, ownerPersonId });
  for (const [label, value] of [["noteId", noteId], ["folderId", folderId]]) {
    if (typeof value !== "string" || !value.trim()) {
      throw new TypeError(`journey-map-contract: a placement needs a ${label}.`);
    }
  }
  const smuggled = ORIGIN_ONLY_FIELDS.filter((field) => field in rest);
  if (smuggled.length) {
    throw new TypeError(`journey-map-contract: a placement may not carry Origin fields (${smuggled.join(", ")}) — ADR-010 §2.`);
  }
  if (!Number.isInteger(order)) throw new TypeError("journey-map-contract: order must be an integer.");
  return Object.freeze({ tenantId, ownerPersonId, noteId, folderId, order });
}

/**
 * ADR-010 §5 — a move is two facts, never a rewrite.
 *
 * Returns the pair of operations a move consists of: retire the placement that
 * exists, create the one that should. There is deliberately no "update the
 * placement's folderId" shape anywhere in this module, because that operation
 * would destroy the record that the Note was ever filed where it was (I4).
 */
export function placementMove({ from, to } = {}) {
  if (!from || typeof from.placementId !== "string" || !from.placementId.trim()) {
    throw new TypeError("journey-map-contract: a move needs the placement it is leaving.");
  }
  const created = notePlacement(to);
  if (created.folderId === from.folderId) {
    throw new TypeError("journey-map-contract: a move must change folder.");
  }
  return Object.freeze({
    retire: Object.freeze({ placementId: from.placementId, status: "retired" }),
    create: created,
  });
}
