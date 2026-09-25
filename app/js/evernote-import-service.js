// Issue #271 -- writes an already-analyzed Evernote import plan
// (app/js/evernote-import-parser.js's own planEnexImport() output) into the
// Note Foundation. Only ever reached from app/import-notes.html. This is
// deliberately the SAME SHAPE as app/js/wordpress-import-service.js (issue
// #265) rather than a shared writer module -- both write the identical two
// Note Foundation collections through the identical note-foundation.js
// functions, under the identical gate, so keeping them as parallel,
// independently-readable modules costs a little duplication in exchange for
// never risking the already-verified WordPress path while this one is built.
// See that module's own header for the full reasoning behind each design
// choice below; only what is genuinely Evernote-specific is re-explained.
//
// THE GATE IS THE SAME GATE, ON PURPOSE. Both importers write exactly the
// same three optional fields (`originalCreatedAt`, `originalModifiedAt`,
// `importSource`) on exactly the same two collections (`notes`,
// `noteFolders`), authorised by the identical Rules candidate
// (docs/governance/2026-09-25-wordpress-import-rules-candidate.rules --
// `importSource` is authorised as `is map` with no per-`system` shape check,
// so an Evernote `importSource` needs nothing new from it). Inventing a
// second gate for the identical dependency would be exactly the fork issue
// #271 asks this round not to build; isWordpressImportPersistenceReady() is
// reused unchanged, by name, from the same module.
//
// EVERY WRITE IS IDEMPOTENT, BY DOCUMENT IDENTITY -- see
// wordpress-import-service.js's own header on why (ADR-008's evidence
// writer's own "deduplication is enforced by the DATABASE" shape). Folder,
// Note, source-link and placement ids are all DETERMINISTIC
// (evernote-import-parser.js's own stableImportId(), namespaced
// "evernote-import" so it can never collide with a WordPress-imported id),
// so re-running the same file(s) re-checks each one by a PAGED LIST (never a
// direct id read -- v08.56's lesson: the deployed `allow get` rules deny a
// read of a document that does not exist yet) and skips whatever already
// exists.
//
// FOLDERS GO THROUGH A BULK PATH for the identical O(n) vs O(n^2) reason
// wordpress-import-service.js's own header explains -- pages the owner's
// EXISTING folders once, judges each new one against an in-memory Map kept
// up to date after every write, writes through envelope.js's
// createDocument() directly rather than createNoteFolder() (which re-reads
// the whole folder list on every single call whose parentFolderId is set).
//
// NOTES REUSE note-foundation.js's OWN createPermanentNote()/
// createNoteSource()/createNotePlacement() DIRECTLY, and this module never
// imports study-note-binding.js, for the identical reasons
// wordpress-import-service.js's own header records (ADR-009 §8).

import { TENANT } from "./collections.js";
import { createDocument } from "./envelope.js";
import { journeyFolder, folderTreeRefusal } from "./journey-map-contract.js";
import { buildUnitKey } from "./unit-keys.js";
import { stableImportId } from "./evernote-import-parser.js";
import { isWordpressImportPersistenceReady } from "./study-wordpress-import-readiness.js";
import {
  NOTE_STATUS,
  noteFoundationDocId,
  createPermanentNote,
  createNoteSource,
  createNotePlacement,
  listNoteFoldersForOwnerPage,
  listNotesForOwnerPage,
  listNoteSourcesForOwnerPage,
  listNotePlacementsForOwnerPage,
} from "./note-foundation.js";

/** A blocked-write result shape, shared by every gated function below. */
const BLOCKED_RESULT = Object.freeze({ created: 0, skipped: 0, refused: 0, blocked: true, refusals: [] });

/** Evernote's own `<created>`/`<updated>` string ("20180105T090000Z", always UTC, no offset) as a real JS Date, or null. */
function enexDateToDate(value) {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/.exec((value || "").trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const dt = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Same bounded-not-infinite shape as wordpress-import-service.js's own FOLDER_PAGE_SAFETY_CAP. */
const FOLDER_PAGE_SAFETY_CAP = 60;

/** Identical to wordpress-import-service.js's own loadOwnedRows() -- every row one person owns, both active and retired, a page at a time, never a direct id read (v08.56). */
async function loadOwnedRows(listPage, db, { tenantId, ownerPersonId }) {
  const rows = [];
  for (const status of [NOTE_STATUS.ACTIVE, NOTE_STATUS.RETIRED]) {
    let after = null;
    for (let page = 0; page < FOLDER_PAGE_SAFETY_CAP; page += 1) {
      const result = await listPage(db, { tenantId, ownerPersonId, status, after });
      rows.push(...result.rows);
      if (!result.next) break;
      after = result.next;
    }
  }
  return rows;
}

/**
 * Creates every folder in `folders` (planEnexImport()'s own topologically-
 * ordered output -- a stack folder always precedes the notebook folders
 * filed under it) that does not already exist, skipping the rest. Returns
 * `{ created, skipped, refused, refusals }`.
 */
export async function importEvernoteFolders(db, {
  tenantId, ownerPersonId, ownerUid = null, actorUid, folders, onProgress,
} = {}) {
  if (!isWordpressImportPersistenceReady()) return BLOCKED_RESULT;

  const known = new Map();
  for (const row of await loadOwnedRows(listNoteFoldersForOwnerPage, db, { tenantId, ownerPersonId })) {
    known.set(row.folderId, row);
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
 * Creates every Note in `notes` (planEnexImport()'s own output) that does
 * not already exist, then links its ayah/range reference (if any) and files
 * it into its one notebook folder -- each idempotent by its own
 * deterministic id, and attempted whether the Note was just created or
 * already existed from an earlier partial run. Returns
 * `{ created, skipped, refused, refusals }`, `created` counting Notes.
 */
export async function importEvernoteNotes(db, {
  tenantId, ownerPersonId, ownerUid = null, actorUid, notes, onProgress,
} = {}) {
  if (!isWordpressImportPersistenceReady()) return BLOCKED_RESULT;

  let created = 0, skipped = 0, refused = 0;
  const refusals = [];

  const scope = { tenantId, ownerPersonId };
  const noteIds = new Set((await loadOwnedRows(listNotesForOwnerPage, db, scope)).map((r) => r.noteId));
  const sourceIds = new Set((await loadOwnedRows(listNoteSourcesForOwnerPage, db, scope)).map((r) => r.sourceLinkId));
  const placementIds = new Set((await loadOwnedRows(listNotePlacementsForOwnerPage, db, scope)).map((r) => r.placementId));

  for (const note of notes) {
    let noteReady = false;
    if (noteIds.has(note.noteId)) {
      noteReady = true;
      skipped += 1;
    } else {
      try {
        const importMeta = {
          ...(enexDateToDate(note.created) ? { originalCreatedAt: enexDateToDate(note.created) } : {}),
          ...(enexDateToDate(note.updated) ? { originalModifiedAt: enexDateToDate(note.updated) } : {}),
          importSource: note.importSource,
        };
        await createPermanentNote(db, {
          tenantId, ownerPersonId, ownerUid,
          title: note.title, bodyHtml: note.bodyHtml,
          noteId: note.noteId, revisionId: stableImportId("revision", note.noteId),
          actorUid, importMeta,
        });
        created += 1;
        noteIds.add(note.noteId);
        noteReady = true;
      } catch (err) {
        refused += 1;
        refusals.push({ title: note.title, stage: "note", message: err?.message ?? String(err) });
      }
    }
    if (!noteReady) {
      onProgress?.({ phase: "notes", created, skipped, refused, total: notes.length });
      continue;
    }

    if (note.reference.kind === "ayah" || note.reference.kind === "range") {
      const sourceLinkId = stableImportId("source", note.noteId);
      if (!sourceIds.has(sourceLinkId)) {
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
          sourceIds.add(sourceLinkId);
        } catch (err) {
          refusals.push({ title: note.title, stage: "source", message: err?.message ?? String(err) });
        }
      }
    }

    for (const folderId of note.folderIds) {
      const placementId = stableImportId("placement", `${note.noteId}|${folderId}`);
      if (placementIds.has(placementId)) continue;
      try {
        await createNotePlacement(db, {
          tenantId, ownerPersonId, ownerUid, noteId: note.noteId, folderId, order: 0, placementId, actorUid,
        });
        placementIds.add(placementId);
      } catch (err) {
        refusals.push({ title: note.title, stage: "placement", folderId, message: err?.message ?? String(err) });
      }
    }

    onProgress?.({ phase: "notes", created, skipped, refused, total: notes.length });
  }
  return { created, skipped, refused, refusals };
}

/**
 * The whole import, folders then Notes (a placement needs its folder to
 * exist first). `onProgress` is called repeatedly through both phases with
 * `{ phase, created, skipped, refused, total }`, the identical shape
 * app/import-notes.html already renders for the WordPress path.
 */
export async function runEvernoteImport(db, {
  tenantId, ownerPersonId, ownerUid = null, actorUid, plan, onProgress,
} = {}) {
  if (!isWordpressImportPersistenceReady()) {
    return { folders: BLOCKED_RESULT, notes: BLOCKED_RESULT, blocked: true };
  }
  const folders = await importEvernoteFolders(db, {
    tenantId, ownerPersonId, ownerUid, actorUid, folders: plan.folders, onProgress,
  });
  const notes = await importEvernoteNotes(db, {
    tenantId, ownerPersonId, ownerUid, actorUid, notes: plan.notes, onProgress,
  });
  return { folders, notes, blocked: false };
}
