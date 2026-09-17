// MAP Phase 6 (P6-C) — reading Mapping My Journey.
//
// UNINVOKED. `noteFolders` and `notePlacements` have no deployed Rule, so every
// write here would be denied in production and I15 requires that denial to
// reach the reader. A boundary suite asserts no page can reach this module.
//
// ADR-010 §2 — ORIGIN ≠ DESTINATION — is enforced here the same way the
// contract enforces it: by inability. This module never imports
// `study-note-binding.js` or `study-note-service.js`, has no concept of a Study
// Unit key, and so cannot file a Note by what it is about.

import {
  NOTE_STATUS,
  getNotesByIds,
  listNoteFoldersForOwner,
  listNotePlacementsForFolder,
  listNotePlacementsForNote,
  moveNotePlacement,
} from "./note-foundation.js";
import { buildFolderTree, notePlacement } from "./journey-map-contract.js";

/** The most placements one read will resolve. A cap, not an expected cost. */
export const MAX_PLACEMENTS_PER_READ = 100;

/**
 * What is in one folder, as `{ rows, truncated }` where each row is
 * `{ placement, note }`, in the author's own order.
 *
 * A RETIRED NOTE IS EXCLUDED, filtered on the NOTE's status rather than the
 * placement's — the same asymmetry P5-E found for source links, and for the
 * same reason: retiring a Note never touches its placements (I4 keeps them),
 * so an active placement pointing at a retired Note is the NORMAL
 * post-retirement state, not a corruption. Filtering on the placement would
 * leave retired Notes on screen for ever.
 */
export async function folderContents(db, {
  tenantId, ownerPersonId, folderId, maximum = MAX_PLACEMENTS_PER_READ,
} = {}) {
  const placements = await listNotePlacementsForFolder(db, {
    tenantId, ownerPersonId, folderId, maximum: maximum + 1,
  });
  const truncated = placements.length > maximum;
  const kept = placements.slice(0, maximum);

  const notes = await getNotesByIds(db, tenantId, [...new Set(kept.map((p) => p.noteId))]);
  const byId = new Map(notes.map((note) => [note.noteId, note]));

  const rows = kept
    .map((placement) => ({ placement, note: byId.get(placement.noteId) ?? null }))
    .filter((row) => row.note !== null && row.note.status === NOTE_STATUS.ACTIVE);

  return { rows, truncated };
}

/**
 * Every folder one Note is filed in (ADR-010 §5 — placement is many-to-many),
 * as `{ rows, truncated }` where each row is `{ placement, folder }`.
 *
 * Sorted here rather than by the database: the query behind it is deliberately
 * equality-only, because the set of folders ONE Note sits in is inherently tiny
 * and ordering it in Firestore would cost a second composite index for no real
 * gain. See `listNotePlacementsForNote()`.
 */
export async function noteFilings(db, {
  tenantId, ownerPersonId, noteId, maximum = MAX_PLACEMENTS_PER_READ,
} = {}) {
  const placements = await listNotePlacementsForNote(db, {
    tenantId, ownerPersonId, noteId, maximum: maximum + 1,
  });
  const truncated = placements.length > maximum;
  const kept = placements.slice(0, maximum);

  const folders = await listNoteFoldersForOwner(db, { tenantId, ownerPersonId });
  const byId = new Map(folders.map((folder) => [folder.folderId, folder]));

  const rows = kept
    .map((placement) => ({ placement, folder: byId.get(placement.folderId) ?? null }))
    .filter((row) => row.folder !== null)
    .sort((a, b) => (a.folder.name ?? "").localeCompare(b.folder.name ?? ""));

  return { rows, truncated };
}

/**
 * The person's folder tree, already walked safely.
 *
 * Returns the contract's own `{ roots, orphaned, cyclic }` — a surface must
 * show the reader that orphaned or cyclic folders exist rather than quietly
 * omitting them, because a folder missing from the screen is indistinguishable,
 * to its author, from a folder that was lost.
 */
export async function ownerFolderTree(db, { tenantId, ownerPersonId } = {}) {
  return buildFolderTree(await listNoteFoldersForOwner(db, { tenantId, ownerPersonId }));
}

/**
 * ADR-010 §5 — moves a Note between folders as one atomic retire-and-create.
 *
 * The destination is validated through the contract before the write, so a
 * placement that the contract would refuse never reaches the database.
 */
export async function moveNoteToFolder(db, {
  tenantId, ownerPersonId, ownerUid = null, noteId, fromPlacementId, toFolderId,
  order = 0, actorUid, ...rest
} = {}) {
  // `...rest` is forwarded to the contract deliberately. Building the payload
  // from named fields alone would make an Origin field a SILENTLY IGNORED
  // argument rather than a refused one, and a caller who passed `sourceKey`
  // would believe it had done something. Forwarding makes the service's
  // guarantee exactly the contract's (ADR-010 §2), not a weaker cousin of it.
  notePlacement({ tenantId, ownerPersonId, noteId, folderId: toFolderId, order, ...rest });
  return moveNotePlacement(db, {
    tenantId, ownerPersonId, ownerUid, noteId, fromPlacementId, toFolderId, order, actorUid,
  });
}
