// Issue #265 -- writes an already-analyzed WordPress import plan
// (app/js/wordpress-import-parser.js's own analyzeWxrImport() output) into
// the Note Foundation. Only ever reached from app/import-notes.html.
//
// EVERY WRITE IS IDEMPOTENT, BY DOCUMENT IDENTITY -- the same shape ADR-008's
// Activity evidence already uses ("deduplication is enforced by the
// DATABASE"). Folder, Note, source-link and placement ids are all
// DETERMINISTIC (stableImportId(), in the pure parser), so re-running the
// same file after a partial failure re-checks each one by a direct read and
// skips whatever already exists -- it never writes a duplicate, and it
// never deletes anything (I4/D6).
//
// FOLDERS GO THROUGH A BULK PATH, DELIBERATELY NOT createNoteFolder().
// createNoteFolder() re-reads the owner's WHOLE folder list on every call
// whose parentFolderId is set (it has to, to judge the tree) -- correct and
// cheap for one folder at a time, but O(n) reads PER CALL makes an import of
// ~1,500 folders an O(n^2) read cost (millions of reads for the Owner's own
// real file). This module instead pages through the owner's existing
// folders ONCE (journeyFolder()/folderTreeRefusal() -- the same PURE
// validation createNoteFolder() itself uses, from journey-map-contract.js --
// judge an in-memory Map that is updated after each write), and writes
// through envelope.js's createDocument() directly. The WRITTEN SHAPE is
// exactly what createNoteFolder() itself writes, plus the one new optional
// `importSource` field this round's Rules candidate authorises.
//
// NOTES REUSE note-foundation.js's OWN createPermanentNote()/
// createNoteSource()/createNotePlacement() DIRECTLY -- none of those re-read
// a whole collection per call (a transaction touching only the documents it
// names, or an equality-scoped read), so there is no equivalent quadratic
// cost to design around for Notes, source links or placements.
//
// THIS MODULE NEVER IMPORTS study-note-binding.js. See ADR-009 §8 for why:
// a WordPress import already knows its unit's type from the parsed
// reference (analyzeWxrImport() has done that work), so re-deriving
// sourceKind through the single-Note validator adds nothing here, and
// study-note-boundary.mjs's own reachability guard (study-note-binding.js
// reached ONLY through study-note-service.js) is unaffected -- this module
// reaches noteSources a different way, through note-foundation.js directly,
// the same function every other writer ultimately reaches.
//
// EVERY IMPORT-PROVENANCE FIELD IS GATED. `originalCreatedAt`,
// `originalModifiedAt` and `importSource` are optional fields the Rules
// candidate at docs/governance/2026-09-25-wordpress-import-rules-candidate.rules
// authorises -- undeployed until the Owner publishes it.
// isWordpressImportPersistenceReady() is checked at the top of every
// function that would write one of those fields and returns a `blocked: true`
// result without calling Firestore at all while it is false -- the same
// fail-closed shape study-wbw-total-readiness.js's own consumers use, not
// "attempt and swallow the error".

import { TENANT } from "./collections.js";
import { createDocument } from "./envelope.js";
import { journeyFolder, folderTreeRefusal } from "./journey-map-contract.js";
import { buildUnitKey } from "./unit-keys.js";
import { stableImportId } from "./wordpress-import-parser.js";
import { isWordpressImportPersistenceReady } from "./study-wordpress-import-readiness.js";
import {
  NOTE_STATUS,
  noteFoundationDocId,
  createPermanentNote,
  createNoteSource,
  createNotePlacement,
  getNotesByIds,
  getNoteSourcesByIds,
  getNotePlacementsByIds,
  listNoteFoldersForOwnerPage,
} from "./note-foundation.js";

/** A blocked-write result shape, shared by every gated function below. */
const BLOCKED_RESULT = Object.freeze({ created: 0, skipped: 0, refused: 0, blocked: true, refusals: [] });

/** WordPress's own GMT date string ("2018-01-05 09:00:00", always UTC, no offset) as a real JS Date, or null. */
function gmtToDate(gmtString) {
  if (!gmtString) return null;
  const iso = `${gmtString.trim().replace(" ", "T")}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * A hard, generous safety cap on how many pages this will ever read while
 * enumerating an owner's EXISTING folders -- the same bounded-not-infinite
 * shape `journey-map-service.js`'s own `loadAllPages()` uses (50 pages *
 * 100 = 5,000 folders; the Owner's real file measures 1,464).
 */
const FOLDER_PAGE_SAFETY_CAP = 60;

/**
 * Creates every folder in `folders` (analyzeWxrImport()'s own topologically-
 * ordered output) that does not already exist, skipping the rest. Returns
 * `{ created, skipped, refused, refusals }`.
 */
export async function importWordpressFolders(db, {
  tenantId, ownerPersonId, ownerUid = null, actorUid, folders, onProgress,
} = {}) {
  if (!isWordpressImportPersistenceReady()) return BLOCKED_RESULT;

  const known = new Map();
  let after = null;
  for (let page = 0; page < FOLDER_PAGE_SAFETY_CAP; page += 1) {
    const { rows, next } = await listNoteFoldersForOwnerPage(db, { tenantId, ownerPersonId, after });
    for (const row of rows) known.set(row.folderId, row);
    if (!next) break;
    after = next;
  }

  let created = 0, skipped = 0, refused = 0;
  const refusals = [];
  for (const folder of folders) {
    if (known.has(folder.folderId)) {
      skipped += 1;
    } else {
      try {
        journeyFolder({
          tenantId, ownerPersonId, name: folder.name,
          parentFolderId: folder.parentFolderId, semanticRole: "user", order: folder.order,
        });
        if (folder.parentFolderId !== null) {
          const refusal = folderTreeRefusal({
            folders: known, tenantId, ownerPersonId, folderId: folder.folderId, parentFolderId: folder.parentFolderId,
          });
          if (refusal) throw new Error(`Folder parent refused: ${refusal}`);
        }
        await createDocument(db, TENANT.NOTE_FOLDERS, noteFoundationDocId(tenantId, folder.folderId), {
          folderId: folder.folderId, tenantId, ownerPersonId, ownerUid,
          name: folder.name, parentFolderId: folder.parentFolderId,
          semanticRole: "user", order: folder.order, status: NOTE_STATUS.ACTIVE,
          importSource: folder.importSource,
        }, actorUid);
        known.set(folder.folderId, {
          folderId: folder.folderId, tenantId, ownerPersonId, parentFolderId: folder.parentFolderId,
          semanticRole: "user", status: NOTE_STATUS.ACTIVE,
        });
        created += 1;
      } catch (err) {
        refused += 1;
        refusals.push({ folderId: folder.folderId, name: folder.name, message: err?.message ?? String(err) });
      }
    }
    onProgress?.({ phase: "folders", created, skipped, refused, total: folders.length });
  }
  return { created, skipped, refused, refusals };
}

/**
 * Creates every Note in `notes` (analyzeWxrImport()'s own output) that does
 * not already exist, then -- independently, whether the Note was just
 * created or already existed from an earlier partial run -- links its
 * ayah/range reference (if any) and files it into every one of its
 * category folders, each idempotent by its own deterministic id. Returns
 * `{ created, skipped, refused, refusals }`, `created` counting Notes.
 */
export async function importWordpressNotes(db, {
  tenantId, ownerPersonId, ownerUid = null, actorUid, notes, onProgress,
} = {}) {
  if (!isWordpressImportPersistenceReady()) return BLOCKED_RESULT;

  let created = 0, skipped = 0, refused = 0;
  const refusals = [];

  for (const note of notes) {
    let noteReady = false;
    const existing = await getNotesByIds(db, tenantId, [note.noteId]);
    if (existing.length) {
      noteReady = true;
      skipped += 1;
    } else {
      try {
        const importMeta = {
          ...(gmtToDate(note.postDateGmt) ? { originalCreatedAt: gmtToDate(note.postDateGmt) } : {}),
          ...(gmtToDate(note.postModifiedGmt) ? { originalModifiedAt: gmtToDate(note.postModifiedGmt) } : {}),
          importSource: note.importSource,
        };
        await createPermanentNote(db, {
          tenantId, ownerPersonId, ownerUid,
          title: note.title, bodyHtml: note.bodyHtml,
          noteId: note.noteId, revisionId: stableImportId("revision", note.postId),
          actorUid, importMeta,
        });
        created += 1;
        noteReady = true;
      } catch (err) {
        refused += 1;
        refusals.push({ postId: note.postId, title: note.title, stage: "note", message: err?.message ?? String(err) });
      }
    }
    if (!noteReady) {
      onProgress?.({ phase: "notes", created, skipped, refused, total: notes.length });
      continue;
    }

    if (note.reference.kind === "ayah" || note.reference.kind === "range") {
      const sourceLinkId = stableImportId("source", note.postId);
      const existingSource = await getNoteSourcesByIds(db, tenantId, [sourceLinkId]);
      if (!existingSource.length) {
        try {
          const unitKey = note.reference.kind === "ayah"
            ? buildUnitKey.ayah(note.reference.surah, note.reference.ayahFrom)
            : buildUnitKey.range(note.reference.surah, note.reference.ayahFrom, note.reference.ayahTo);
          await createNoteSource(db, {
            tenantId, ownerPersonId, ownerUid, noteId: note.noteId,
            source: {
              sourceKind: "quran-unit", sourceKey: unitKey,
              relationshipKind: "origin", provenanceKind: "imported", approachId: null,
            },
            sourceLinkId, actorUid,
          });
        } catch (err) {
          refusals.push({ postId: note.postId, title: note.title, stage: "source", message: err?.message ?? String(err) });
        }
      }
    }

    for (const folderId of note.folderIds) {
      const placementId = stableImportId("placement", `${note.postId}|${folderId}`);
      const existingPlacement = await getNotePlacementsByIds(db, tenantId, [placementId]);
      if (existingPlacement.length) continue;
      try {
        await createNotePlacement(db, {
          tenantId, ownerPersonId, ownerUid, noteId: note.noteId, folderId, order: 0, placementId, actorUid,
        });
      } catch (err) {
        refusals.push({ postId: note.postId, title: note.title, stage: "placement", folderId, message: err?.message ?? String(err) });
      }
    }

    onProgress?.({ phase: "notes", created, skipped, refused, total: notes.length });
  }
  return { created, skipped, refused, refusals };
}

/**
 * The whole import, folders then Notes (ADR-010's own "a folder's parent
 * must exist before the folder does" rule applies one level up too: a
 * placement needs its folder to exist first). `onProgress` is called
 * repeatedly through both phases with `{ phase, created, skipped, refused,
 * total }`, which is all app/import-notes.html needs to show a live count.
 */
export async function runWordpressImport(db, {
  tenantId, ownerPersonId, ownerUid = null, actorUid, plan, onProgress,
} = {}) {
  if (!isWordpressImportPersistenceReady()) {
    return { folders: BLOCKED_RESULT, notes: BLOCKED_RESULT, blocked: true };
  }
  const folders = await importWordpressFolders(db, {
    tenantId, ownerPersonId, ownerUid, actorUid, folders: plan.folders, onProgress,
  });
  const notes = await importWordpressNotes(db, {
    tenantId, ownerPersonId, ownerUid, actorUid, notes: plan.notes, onProgress,
  });
  return { folders, notes, blocked: false };
}
