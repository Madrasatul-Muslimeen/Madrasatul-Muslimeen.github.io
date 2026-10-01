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
  commitFolderBatch,
  createNotePlacement,
  getNotesByIds,
  newNoteEntityId,
  listNoteFoldersForOwner,
  listNoteFoldersForOwnerPage,
  listNotePlacementsForFolder,
  listNotePlacementsForNote,
  listNotesForOwnerPage,
  listNotesForOwnerIdPage,
  listNotePlacementsForOwnerPage,
  moveNotePlacement,
  renameNoteFolder,
  reorderNotePlacement,
  reorderNoteFolder,
  reparentNoteFolder,
  retireNoteFolder,
} from "./note-foundation.js";
import { MAX_FOLDER_DEPTH, buildFolderTree, folderTreeRefusal, notePlacement } from "./journey-map-contract.js";
import { entityIdShardRanges, docIdRangeFor } from "./journey-map-shard.js";

/**
 * The most placements one read will resolve. A cap, not an expected cost.
 *
 * v08.58 -- was 100. Every read asks for ONE MORE than this to detect
 * truncation, so it asked for 101, and the deployed Rules' `listIsBounded()`
 * refuses any list above 100: every folder's contents and every Note's
 * filings were denied in production. Found by
 * journey-map-real-function.rules.test.mjs (issue #247). 99 + 1 = the cap.
 */
export const MAX_PLACEMENTS_PER_READ = 99;

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

  // 1 Oct 2026: every active folder, not the first 100 (see
  // listAllActiveFoldersForOwner() in note-foundation.js) -- a Note filed in a
  // folder past the first 100 silently showed fewer filings.
  const { rows: folders } = await loadAllOwnerFolders(db, { tenantId, ownerPersonId, status: NOTE_STATUS.ACTIVE });
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
 *
 * Issue #265 -- PAGES through every folder rather than reading the capped
 * 100. `listNoteFoldersForOwner()` itself is untouched (deliberately, for
 * every OTHER caller of it), but a WordPress import can create well over a
 * thousand folders, and `listIsBounded()` refuses any single request above
 * 100 — so a person with more than 100 folders could not see the rest of
 * their own tree, at all, until this. `loadAllOwnerFolders()` below is the
 * same bounded page-loop `loadAllOwnerNotes()`/`loadAllOwnerPlacements()`
 * already use, so this stays a fast, cache-free change to what one call
 * fetches, not a new mechanism.
 */
export async function ownerFolderTree(db, { tenantId, ownerPersonId } = {}) {
  const { rows } = await loadAllOwnerFolders(db, { tenantId, ownerPersonId });
  return buildFolderTree(rows);
}

/**
 * Issue #267 -- the whole folder tree plus a `truncated` flag, for the one
 * shared tree every Mapping My Journey view renders from. (When #267 was
 * built `ownerFolderTree()` above still stopped at 100 folders; #265, merged
 * first, made it page too. This one is kept because the page also needs to
 * know whether the safety cap on pages was hit, so it can say so.)
 */
export async function ownerFolderTreePaged(db, { tenantId, ownerPersonId, pageSize = 100 } = {}) {
  const { rows, truncated } = await loadAllPages((after) =>
    listNoteFoldersForOwnerPage(db, { tenantId, ownerPersonId, pageSize, after }));
  return { ...buildFolderTree(rows), truncated };
}

/**
 * Issue #259 -- the folder tree becomes an expandable, all-at-once view (not
 * a one-folder-at-a-time drill-down), so the screen needs its OWNER'S WHOLE
 * set of Notes and placements up front, never capped at 100/99. A bigger
 * `limit()` is refused by the deployed Rules (`listIsBounded()`); paging is
 * the only way past it, so these two loop over `note-foundation.js`'s new
 * paged readers until each is exhausted.
 *
 * A HARD SAFETY CAP, not an expected cost: 50 pages at 100 rows each is 5,000
 * Notes (or placements) for one person, which is pathological, not real. A
 * cap that is hit is REPORTED (`truncated: true`), never spun forever --
 * this is the codebase's own standing shape (`MAX_PLACEMENTS_PER_READ`,
 * `MAX_FOLDER_DEPTH`): a bound is enforced and the caller is told when it
 * was reached, rather than either hanging or lying about completeness.
 */
const OWNER_LOAD_PAGE_SAFETY_CAP = 50;

async function loadAllPages(fetchPage) {
  const rows = [];
  let after = null;
  for (let page = 0; page < OWNER_LOAD_PAGE_SAFETY_CAP; page += 1) {
    const result = await fetchPage(after);
    rows.push(...result.rows);
    if (!result.next) return { rows, truncated: false };
    after = result.next;
  }
  return { rows, truncated: true };
}

/** Issue #265 -- the folder-side twin of the two below, used by `ownerFolderTree()` above so the tree is never capped at 100. */
export async function loadAllOwnerFolders(db, { tenantId, ownerPersonId, status, pageSize = 100 } = {}) {
  return loadAllPages((after) => listNoteFoldersForOwnerPage(db, { tenantId, ownerPersonId, status, pageSize, after }));
}

export async function loadAllOwnerNotes(db, { tenantId, ownerPersonId, status, pageSize = 100 } = {}) {
  return loadAllPages((after) => listNotesForOwnerPage(db, { tenantId, ownerPersonId, status, pageSize, after }));
}

export async function loadAllOwnerPlacements(db, { tenantId, ownerPersonId, status, pageSize = 100 } = {}) {
  return loadAllPages((after) => listNotePlacementsForOwnerPage(db, { tenantId, ownerPersonId, status, pageSize, after }));
}

// ---------------------------------------------------------------------------
// Issue #282 -- SHARDED parallel loading. journey-map.html's own #folders/
// #path/#timeline data is the whole of one owner's set, across three
// collections, and the functions above page each one through a SINGLE
// cursor chain: at the Owner's real import size that is ~15 sequential
// folder pages, ~11 note pages, ~24 placement pages -- 24 round trips in a
// row for the largest one alone. These new functions are ADDITIVE
// (`loadAllOwnerFolders`/`loadAllOwnerNotes`/`loadAllOwnerPlacements` above,
// and every existing test pinning their exact single-chain call shape, are
// untouched) and run `shardCount` independent cursor chains over disjoint
// id ranges (`journey-map-shard.js`) at once, merging the results. Same
// safety-cap discipline as `loadAllPages()`: each shard is bounded at
// `OWNER_LOAD_PAGE_SAFETY_CAP` pages of its own, reported truncated rather
// than hung or silently incomplete if it is ever hit.
// ---------------------------------------------------------------------------
// 5, not 4: shard 0 is reserved for a plain UUID (a folder/Note/placement
// created by hand rather than imported -- see journey-map-shard.js's own
// header), which the Owner's real, ~100%-imported population leaves empty.
// 4 USEFUL shards for the import block is what actually gives the largest
// collection (placements, ~24 sequential pages at the Owner's real scale)
// its real ~4-way parallelism, proven at that scale in journey-map-shard.mjs.
const DEFAULT_SHARD_COUNT = 5;

async function loadOneShard(fetchPage, idRange) {
  const rows = [];
  let after = null;
  for (let page = 0; page < OWNER_LOAD_PAGE_SAFETY_CAP; page += 1) {
    const result = await fetchPage(after, idRange);
    rows.push(...result.rows);
    if (!result.next) return { rows, truncated: false };
    after = result.next;
  }
  return { rows, truncated: true };
}

async function loadAllPagesSharded(kind, fetchPage, { tenantId, shardCount = DEFAULT_SHARD_COUNT } = {}) {
  const ranges = entityIdShardRanges(kind, shardCount);
  try {
    const results = await Promise.all(
      ranges.map((entityRange) => loadOneShard(fetchPage, docIdRangeFor(tenantId, entityRange))));
    return {
      rows: results.flatMap((r) => r.rows),
      truncated: results.some((r) => r.truncated),
    };
  } catch (err) {
    // Architect review: a documentId() range beside equality filters should
    // be served by single-field indexes, but no emulator can prove what
    // production will accept (the emulator does not enforce indexes). If
    // production ever answers "needs an index", fall back to the one-cursor
    // chain every earlier version used, so the page is slower, never broken.
    if (err?.code !== "failed-precondition") throw err;
    console.warn(`Sharded ${kind} load refused (${err.message}); falling back to a single cursor.`);
    return loadOneShard(fetchPage, null);
  }
}

/** The folder-side sharded loader, feeding `ownerFolderTreePagedSharded()` below. */
export async function loadAllOwnerFoldersSharded(db, { tenantId, ownerPersonId, status, pageSize = 100, shardCount = DEFAULT_SHARD_COUNT } = {}) {
  return loadAllPagesSharded("folder",
    (after, idRange) => listNoteFoldersForOwnerPage(db, { tenantId, ownerPersonId, status, pageSize, after, idRange }),
    { tenantId, shardCount });
}

/** Every Note the owner has ever written, across `shardCount` parallel cursors. Order is not preserved (see `listNotesForOwnerIdPage()`'s own header) -- nothing here needs it. */
export async function loadAllOwnerNotesSharded(db, { tenantId, ownerPersonId, status, pageSize = 100, shardCount = DEFAULT_SHARD_COUNT } = {}) {
  return loadAllPagesSharded("note",
    (after, idRange) => listNotesForOwnerIdPage(db, { tenantId, ownerPersonId, status, pageSize, after, idRange }),
    { tenantId, shardCount });
}

/** Every placement the owner has ever created, across `shardCount` parallel cursors. */
export async function loadAllOwnerPlacementsSharded(db, { tenantId, ownerPersonId, status, pageSize = 100, shardCount = DEFAULT_SHARD_COUNT } = {}) {
  return loadAllPagesSharded("placement",
    (after, idRange) => listNotePlacementsForOwnerPage(db, { tenantId, ownerPersonId, status, pageSize, after, idRange }),
    { tenantId, shardCount });
}

/**
 * The sharded twin of `ownerFolderTreePaged()` -- the whole folder tree plus
 * a `truncated` flag, loaded across `shardCount` parallel cursors instead of
 * one chain.
 */
export async function ownerFolderTreePagedSharded(db, { tenantId, ownerPersonId, pageSize = 100, shardCount = DEFAULT_SHARD_COUNT } = {}) {
  const { rows, truncated } = await loadAllOwnerFoldersSharded(db, { tenantId, ownerPersonId, pageSize, shardCount });
  return { ...buildFolderTree(rows), truncated };
}

/**
 * Issue #259 -- how many DISTINCT active Notes sit in one folder, or any
 * folder beneath it. Pure, and deliberately so: `folders`/`placements`/
 * `notes` are plain arrays already read by the caller, so this can be
 * mutation-tested with no Firebase and no browser (`journey-map-counts.mjs`).
 *
 * USES `buildFolderTree()` FOR THE WALK -- no second recursive walk of the
 * raw folder set is written here. `buildFolderTree()` is already bounded
 * (`MAX_FOLDER_DEPTH`) and cycle-safe (P6-B/P6-D), so aggregating over its
 * OWN returned `children` arrays inherits that bound for free: a cyclic or
 * orphaned folder is simply absent from `roots`, so it (and anything only
 * reachable through it) contributes to no ancestor's count, exactly as
 * `buildFolderTree()`'s own "nothing is silently dropped, it is NAMED
 * elsewhere" contract already promises the caller.
 *
 * SETS, NOT SUMS, is what makes "a Note filed in two folders of the same
 * subtree counts once for their common ancestor" true: each node's subtree
 * count is the SIZE of the union of its own directly-filed Notes and each
 * child's own subtree set, so a Note reachable through two children of one
 * folder still contributes exactly one member to that folder's set.
 *
 * A RETIRED NOTE COUNTS NOWHERE, decided by the NOTE's own status -- the
 * same rule `folderContents()` already applies, for the same reason: I4
 * never touches a placement when its Note is retired, so an active
 * placement pointing at a retired Note is normal, not corruption, and must
 * not inflate a badge the reader would read as "still there".
 *
 * Returns a plain object keyed by folderId (never a Map): every caller here
 * is UI code building an HTML string with `${counts[folderId] ?? 0}`, and a
 * plain object is what that reads most simply against.
 */
export function folderNoteCounts(folders, placements, notes) {
  const activeNoteIds = new Set(
    (notes ?? []).filter((n) => n && n.status === NOTE_STATUS.ACTIVE).map((n) => n.noteId));
  const directByFolder = new Map();
  for (const p of placements ?? []) {
    if (!p || p.status !== NOTE_STATUS.ACTIVE) continue;
    if (!activeNoteIds.has(p.noteId)) continue;
    if (!directByFolder.has(p.folderId)) directByFolder.set(p.folderId, new Set());
    directByFolder.get(p.folderId).add(p.noteId);
  }

  const { roots } = buildFolderTree(folders ?? []);
  const counts = {};
  function walk(node) {
    const subtree = new Set(directByFolder.get(node.folderId) ?? []);
    for (const child of node.children ?? []) {
      for (const noteId of walk(child)) subtree.add(noteId);
    }
    counts[node.folderId] = subtree.size;
    return subtree;
  }
  for (const root of roots) walk(root);
  return counts;
}

/**
 * Issue #259 -- why a proposed drag-and-drop move would be refused, or
 * `null` when it would not, WITHOUT attempting the write. `journey-map.html`
 * deliberately does not import `journey-map-contract.js` a second, direct
 * way (`journey-map-boundary.mjs` pins the contract as reachable only via
 * `note-foundation.js` or this module) -- so the screen's drag-and-drop
 * preview reaches `folderTreeRefusal()` through this one-line forward,
 * exactly the "everything else goes through the service" shape every other
 * folder-editing wrapper in this file already uses.
 */
export function folderMoveRefusal({ folders, tenantId, ownerPersonId, folderId, parentFolderId } = {}) {
  return folderTreeRefusal({ folders, tenantId, ownerPersonId, folderId, parentFolderId });
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

/**
 * MAP Phase 6 (P6-D) — the folder-editing side of the same surface.
 *
 * Thin on purpose. Every rule lives in the contract and the data layer, so
 * these exist to give a surface ONE place to call and to keep the read and
 * write halves of Mapping My Journey in one module — not to add policy. A
 * wrapper that validated anything of its own would be a second, divergent
 * copy of ADR-010, which is the drift ADR-009 closed for `noteSources`.
 *
 * `moveFolder` is the one worth naming: it is the operation Firestore Rules
 * cannot secure (they enforce one hop, never an ancestor chain), so its cycle
 * and depth refusals are client-side and REACH THE CALLER as an error — I15,
 * not a console line.
 */
export async function renameFolder(db, { tenantId, ownerPersonId, folderId, name, actorUid } = {}) {
  return renameNoteFolder(db, { tenantId, ownerPersonId, folderId, name, actorUid });
}

export async function reorderFolder(db, { tenantId, ownerPersonId, folderId, order, actorUid } = {}) {
  return reorderNoteFolder(db, { tenantId, ownerPersonId, folderId, order, actorUid });
}

export async function moveFolder(db, { tenantId, ownerPersonId, folderId, parentFolderId, actorUid } = {}) {
  return reparentNoteFolder(db, { tenantId, ownerPersonId, folderId, parentFolderId, actorUid });
}

export async function retireFolder(db, { tenantId, ownerPersonId, folderId, actorUid } = {}) {
  return retireNoteFolder(db, { tenantId, ownerPersonId, folderId, actorUid });
}

/**
 * P6-E — a Note's position WITHIN a folder, which nothing could set.
 *
 * `folderContents()` promises "in the author's own order" and the Phase 6
 * composite index candidate exists to serve it; the author had no way to
 * change that order once a placement was created. A move BETWEEN folders is
 * still `moveNoteToFolder()` and still retire-and-create (ADR-010 §5, I4) --
 * this is position inside one folder, where there is no record to preserve.
 */
export async function reorderFiling(db, { tenantId, ownerPersonId, placementId, order, actorUid } = {}) {
  return reorderNotePlacement(db, { tenantId, ownerPersonId, placementId, order, actorUid });
}

// ---------------------------------------------------------------------------
// Siyagah port round 1 -- Trash / Restore, the "still holds notes" refusal, and
// Copy / Move for Notes and folders. DATA LAYER ONLY: no screen calls these yet.
//
// Nothing is ever deleted (I4, D6): Trash is `retired`, Restore is `active`.
// MMSA is not Siyagah on sync -- every folder, placement and Note is its own
// document -- so only §5.3's rule carries over: AN OPERATION ONLY EVER CHANGES
// WHAT IT NAMES. Every write below names its documents and sends only `status`
// (updates) or a complete new document (creates). Numbering stays derived
// (decision 42.2): nothing is ever written into a name.
//
// HOW THE RULES SHAPE THE ORDER OF WRITES. `parentOneHopOk()` (folders) and
// `bothEndsOk()` (placements) read with `get()`, which sees the state BEFORE a
// batch commits -- not `getAfter()`. Two consequences, both handled here:
//   * Within ONE batch, any order is fine for a status change: a child retired
//     in the same batch as its parent still sees an active parent. ACROSS
//     batches the parent must still be active, so Trash retires DEEPEST FIRST.
//   * A create or a restore that names a parent changed in the SAME batch is
//     denied (the parent is not yet active/existing). So Restore and Copy commit
//     ONE DEPTH LEVEL PER BATCH, shallowest first, and Copy writes every folder
//     before any placement (a placement's folder must already exist).
// ---------------------------------------------------------------------------

/** Firestore allows 500 writes per batch; 450 leaves headroom. */
export const BATCH_CHUNK = 450;

const REFUSAL = Object.freeze({
  system: "System folders cannot be moved to Trash.",
  systemCopy: "System folders cannot be copied.",
  missing: "Folder does not exist.",
  truncated: "There are too many folders or Notes to judge this safely. Nothing was changed.",
  notInTrash: "Folder is not in Trash.",
  alreadyFiled: "This note is already filed in that folder.",
  notFiledThere: "This note is not filed in that folder.",
  targetGone: "That folder does not exist or is in Trash.",
});

function noteCountRefusal(n) {
  return `This folder still holds ${n} notes. Move or delete them first.`;
}

function chunked(rows, size = BATCH_CHUNK) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/** Folder and every descendant in `byId`, with depth below `rootId` (root = 0). Visited-set bounded, so a corrupt cycle cannot spin. */
function subtreeOf(byId, rootId) {
  const children = new Map();
  for (const f of byId.values()) {
    const pid = f.parentFolderId ?? null;
    if (pid === null) continue;
    if (!children.has(pid)) children.set(pid, []);
    children.get(pid).push(f.folderId);
  }
  const out = [];
  const seen = new Set([rootId]);
  let level = [rootId];
  for (let depth = 0; level.length > 0; depth += 1) {
    const next = [];
    for (const id of level) {
      if (byId.has(id)) out.push({ folder: byId.get(id), depth });
      for (const child of children.get(id) ?? []) {
        if (seen.has(child)) continue;
        seen.add(child);
        next.push(child);
      }
    }
    level = next;
  }
  return out;
}

function nextOrder(rows) {
  let max = -1;
  for (const r of rows) if (Number.isInteger(r.order) && r.order > max) max = r.order;
  return max + 1;
}

async function loadActiveState(db, own) {
  const folders = await loadAllOwnerFolders(db, { ...own, status: NOTE_STATUS.ACTIVE });
  const placements = await loadAllOwnerPlacements(db, { ...own, status: NOTE_STATUS.ACTIVE });
  const notes = await loadAllOwnerNotes(db, { ...own, status: NOTE_STATUS.ACTIVE });
  if (folders.truncated || placements.truncated || notes.truncated) throw new Error(REFUSAL.truncated);
  return { folders: folders.rows, placements: placements.rows, notes: notes.rows };
}

/**
 * Move a folder to Trash, with every active folder beneath it -- or refuse,
 * BEFORE any write, when the subtree still holds an active Note through an
 * active placement (M4). `n` is the distinct count `folderNoteCounts()` gives.
 * A retired Note does not count. System folders are never trashed.
 *
 * Retires DEEPEST FIRST, chunked at 450 (see the header for why).
 */
export async function trashFolder(db, { tenantId, ownerPersonId, ownerUid = null, folderId, actorUid } = {}) {
  const own = { tenantId, ownerPersonId };
  const { folders, placements, notes } = await loadActiveState(db, own);
  const byId = new Map(folders.map((f) => [f.folderId, f]));
  const target = byId.get(folderId);
  if (!target) throw new Error(REFUSAL.missing);
  if ((target.semanticRole ?? "user") !== "user") throw new Error(REFUSAL.system);

  const subtree = subtreeOf(byId, folderId);
  const inSubtree = new Set(subtree.map((s) => s.folder.folderId));
  // `folderNoteCounts()` walks `buildFolderTree()`, so a folder it cannot reach
  // (orphaned or cyclic) is absent from it; the direct count below covers that
  // case, and the larger of the two is used so neither can under-report.
  const activeNoteIds = new Set(notes.filter((n) => n.status === NOTE_STATUS.ACTIVE).map((n) => n.noteId));
  const direct = new Set(placements
    .filter((p) => p.status === NOTE_STATUS.ACTIVE && inSubtree.has(p.folderId) && activeNoteIds.has(p.noteId))
    .map((p) => p.noteId));
  const n = Math.max(folderNoteCounts(folders, placements, notes)[folderId] ?? 0, direct.size);
  if (n > 0) throw new Error(noteCountRefusal(n));

  const ordered = subtree.slice().sort((a, b) => b.depth - a.depth).map((s) => s.folder.folderId);
  for (const ids of chunked(ordered)) {
    await commitFolderBatch(db, {
      tenantId, ownerPersonId, ownerUid, actorUid,
      folderStatus: ids.map((id) => ({ folderId: id, status: NOTE_STATUS.RETIRED })),
    });
  }
  return { retired: ordered };
}

/**
 * Restore a folder from Trash: the folder, every retired ancestor above it (so
 * `parentOneHopOk()` passes), and its retired descendants. Refuses when the
 * result would sit deeper than MAX_FOLDER_DEPTH, or an ancestor is gone.
 * Commits one depth level per batch, shallowest first.
 */
export async function restoreFolder(db, { tenantId, ownerPersonId, ownerUid = null, folderId, actorUid } = {}) {
  const own = { tenantId, ownerPersonId };
  const active = await loadAllOwnerFolders(db, { ...own, status: NOTE_STATUS.ACTIVE });
  const retired = await loadAllOwnerFolders(db, { ...own, status: NOTE_STATUS.RETIRED });
  if (active.truncated || retired.truncated) throw new Error(REFUSAL.truncated);
  const all = new Map([...active.rows, ...retired.rows].map((f) => [f.folderId, f]));
  const target = all.get(folderId);
  if (!target) throw new Error(REFUSAL.missing);
  if (target.status !== NOTE_STATUS.RETIRED) throw new Error(REFUSAL.notInTrash);

  // The chain upward, counting levels (target = 1). Retired ancestors come back
  // too; the walk stops at the first active one. Bounded by the set size.
  const ancestors = [];
  let depthOfTarget = 1;
  let cursor = target;
  const seen = new Set([folderId]);
  while ((cursor.parentFolderId ?? null) !== null) {
    const parent = all.get(cursor.parentFolderId);
    if (!parent) throw new Error("Folder parent refused: parent-missing");
    if (seen.has(parent.folderId)) throw new Error("Folder parent refused: cycle");
    seen.add(parent.folderId);
    depthOfTarget += 1;
    // Only the UNBROKEN run of retired ancestors is restored: an active parent ends the chain.
    if (parent.status === NOTE_STATUS.RETIRED && ancestors.length === depthOfTarget - 2) ancestors.push(parent);
    cursor = parent;
  }
  const below = subtreeOf(all, folderId).filter((s) => s.folder.status === NOTE_STATUS.RETIRED);
  const height = Math.max(...below.map((s) => s.depth)) + 1;
  if (depthOfTarget + height - 1 > MAX_FOLDER_DEPTH) throw new Error("Folder parent refused: too-deep");

  // Levels, shallowest first: ancestors (top-most first), then the folder's own subtree by depth.
  // An active folder sitting BETWEEN two retired ones is not touched, and does not break the chain.
  const levels = ancestors.reverse().map((f) => [f.folderId]);
  for (let d = 0; d < height; d += 1) {
    levels.push(below.filter((s) => s.depth === d).map((s) => s.folder.folderId));
  }
  const restored = [];
  for (const level of levels) {
    for (const ids of chunked(level)) {
      await commitFolderBatch(db, {
        tenantId, ownerPersonId, ownerUid, actorUid,
        folderStatus: ids.map((id) => ({ folderId: id, status: NOTE_STATUS.ACTIVE })),
      });
      restored.push(...ids);
    }
  }
  return { restored };
}

/**
 * The owner's Trash: retired folders and retired Notes, paged like
 * `loadAllOwnerNotes()`, `truncated` reported when either hit the page cap.
 * Both queries are equality-only (tenantId, ownerPersonId, status) -- the
 * shape the paged readers already use -- so no composite index is needed.
 */
export async function loadOwnerTrash(db, { tenantId, ownerPersonId, pageSize = 100 } = {}) {
  const folders = await loadAllOwnerFolders(db, { tenantId, ownerPersonId, status: NOTE_STATUS.RETIRED, pageSize });
  const notes = await loadAllOwnerNotes(db, { tenantId, ownerPersonId, status: NOTE_STATUS.RETIRED, pageSize });
  return { folders: folders.rows, notes: notes.rows, truncated: folders.truncated || notes.truncated };
}

async function requireActiveFolder(db, own, folderId) {
  const folders = await loadAllOwnerFolders(db, { ...own, status: NOTE_STATUS.ACTIVE });
  if (folders.truncated) throw new Error(REFUSAL.truncated);
  const target = folders.rows.find((f) => f.folderId === folderId);
  if (!target) throw new Error(REFUSAL.targetGone);
  return target;
}

async function endOfFolder(db, { tenantId, ownerPersonId, folderId }) {
  const rows = await listNotePlacementsForFolder(db, { tenantId, ownerPersonId, folderId, maximum: MAX_PLACEMENTS_PER_READ });
  return nextOrder(rows);
}

/**
 * Copy to…, for a Note: ONE Note in one more folder (M1) -- an active placement
 * in the target, the existing ones kept. Never a second Note. A duplicate is
 * refused in words.
 */
export async function copyNoteToFolder(db, {
  tenantId, ownerPersonId, ownerUid = null, noteId, toFolderId, actorUid,
} = {}) {
  const own = { tenantId, ownerPersonId };
  await requireActiveFolder(db, own, toFolderId);
  const filed = await listNotePlacementsForNote(db, { ...own, noteId, maximum: MAX_PLACEMENTS_PER_READ });
  if (filed.some((p) => p.folderId === toFolderId)) throw new Error(REFUSAL.alreadyFiled);
  const order = await endOfFolder(db, { ...own, folderId: toFolderId });
  return createNotePlacement(db, { tenantId, ownerPersonId, ownerUid, noteId, folderId: toFolderId, order, actorUid });
}

/**
 * Move to…, for a Note. From a given folder it is the existing atomic
 * retire-and-create. With NO current folder, every active placement the Note
 * has is retired and one is created in the target, in one batch.
 */
export async function moveNote(db, {
  tenantId, ownerPersonId, ownerUid = null, noteId, fromFolderId = null, toFolderId, actorUid,
} = {}) {
  const own = { tenantId, ownerPersonId };
  await requireActiveFolder(db, own, toFolderId);
  const filed = await listNotePlacementsForNote(db, { ...own, noteId, maximum: MAX_PLACEMENTS_PER_READ });
  const order = await endOfFolder(db, { ...own, folderId: toFolderId });

  if (fromFolderId !== null) {
    const from = filed.find((p) => p.folderId === fromFolderId);
    if (!from) throw new Error(REFUSAL.notFiledThere);
    if (fromFolderId === toFolderId) throw new Error("A move must change folder.");
    if (filed.some((p) => p.folderId === toFolderId)) throw new Error(REFUSAL.alreadyFiled);
    return moveNoteToFolder(db, {
      tenantId, ownerPersonId, ownerUid, noteId, fromPlacementId: from.placementId,
      toFolderId, order, actorUid,
    });
  }

  const already = filed.some((p) => p.folderId === toFolderId);
  const others = filed.filter((p) => p.folderId !== toFolderId);
  if (already && others.length === 0) throw new Error(REFUSAL.alreadyFiled);
  const placementId = already ? null : newNoteEntityId();
  await commitFolderBatch(db, {
    tenantId, ownerPersonId, ownerUid, actorUid,
    placementStatus: others.map((p) => ({ placementId: p.placementId, status: NOTE_STATUS.RETIRED })),
    placementCreates: already ? [] : [{ placementId, noteId, folderId: toFolderId, order }],
  });
  return placementId;
}

/**
 * Copy to…, for a folder: new folders with NEW ids for the folder and its whole
 * active subtree, under `toParentFolderId` (null = top level), and the Notes
 * LINKED -- one new placement in the matching new folder for each active
 * placement in the source subtree. Note content is never duplicated.
 *
 * Refused: a copy into its own subtree, a system folder, and anything the
 * contract's `folderTreeRefusal()` refuses (depth beyond 8 included).
 * Folders are written first, one depth level per batch; placements after,
 * chunked at 450 (a placement's folder must exist before the batch, see header).
 */
export async function copyFolder(db, {
  tenantId, ownerPersonId, ownerUid = null, folderId, toParentFolderId = null, actorUid,
} = {}) {
  const own = { tenantId, ownerPersonId };
  const { folders, placements, notes } = await loadActiveState(db, own);
  const byId = new Map(folders.map((f) => [f.folderId, f]));
  const source = byId.get(folderId);
  if (!source) throw new Error(REFUSAL.missing);
  if ((source.semanticRole ?? "user") !== "user") throw new Error(REFUSAL.systemCopy);

  const subtree = subtreeOf(byId, folderId);
  if (toParentFolderId !== null) {
    if (subtree.some((s) => s.folder.folderId === toParentFolderId)) throw new Error("Folder parent refused: cycle");
    // folderId is the SOURCE, so its subtree's height is counted, as for a move.
    const refusal = folderTreeRefusal({ folders: byId, tenantId, ownerPersonId, folderId, parentFolderId: toParentFolderId });
    if (refusal) throw new Error(`Folder parent refused: ${refusal}`);
  }

  const newIdOf = new Map(subtree.map((s) => [s.folder.folderId, newNoteEntityId()]));
  const rootOrder = nextOrder(folders.filter((f) => (f.parentFolderId ?? null) === toParentFolderId));
  const byDepth = [];
  for (const { folder, depth } of subtree) {
    (byDepth[depth] ??= []).push({
      folderId: newIdOf.get(folder.folderId),
      name: folder.name,
      parentFolderId: depth === 0 ? toParentFolderId : newIdOf.get(folder.parentFolderId),
      order: depth === 0 ? rootOrder : (Number.isInteger(folder.order) ? folder.order : 0),
    });
  }
  for (const level of byDepth) {
    for (const rows of chunked(level)) {
      await commitFolderBatch(db, { tenantId, ownerPersonId, ownerUid, actorUid, folderCreates: rows });
    }
  }

  const activeNoteIds = new Set(notes.filter((n) => n.status === NOTE_STATUS.ACTIVE).map((n) => n.noteId));
  const links = placements
    .filter((p) => p.status === NOTE_STATUS.ACTIVE && newIdOf.has(p.folderId) && activeNoteIds.has(p.noteId))
    .map((p) => ({
      placementId: newNoteEntityId(), noteId: p.noteId, folderId: newIdOf.get(p.folderId),
      order: Number.isInteger(p.order) ? p.order : 0,
    }));
  for (const rows of chunked(links)) {
    await commitFolderBatch(db, { tenantId, ownerPersonId, ownerUid, actorUid, placementCreates: rows });
  }
  return { rootFolderId: newIdOf.get(folderId), folders: newIdOf.size, placements: links.length };
}
