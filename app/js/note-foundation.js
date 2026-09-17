// Stage 5 Note Foundation — permanent private Notes and their relationships.
// This module is deliberately not imported by any UI yet. Every write flows
// through envelope.js; legacy ayahNotes remains unchanged and has no fallback
// or dual-write relationship with these collections.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { folderTreeRefusal, journeyFolder } from "./journey-map-contract.js";
import { createDocument, runEnvelopeTransaction } from "./envelope.js";

export const NOTE_STATUS = Object.freeze({ ACTIVE: "active", RETIRED: "retired" });
export const NOTE_VISIBILITY = "private";

export function newNoteEntityId() {
  return crypto.randomUUID().replaceAll("-", "");
}

export function noteFoundationDocId(tenantId, entityId) {
  requireToken("tenantId", tenantId);
  requireToken("entityId", entityId);
  return `${tenantId}__${entityId}`;
}

function requireToken(name, value) {
  if (typeof value !== "string" || !value.trim() || value.includes("/")) {
    throw new Error(`${name} must be a non-empty path-safe string.`);
  }
  return value;
}

function requireText(name, value) {
  if (typeof value !== "string") throw new Error(`${name} must be a string.`);
  return value;
}

function ownership({ tenantId, ownerPersonId, ownerUid }) {
  requireToken("tenantId", tenantId);
  requireToken("ownerPersonId", ownerPersonId);
  if (ownerUid !== null) requireToken("ownerUid", ownerUid);
  return { tenantId, ownerPersonId, ownerUid };
}

function relationBase(owner, noteId) {
  return { ...ownership(owner), noteId: requireToken("noteId", noteId) };
}

export async function createPermanentNote(db, {
  tenantId,
  ownerPersonId,
  ownerUid,
  title = "",
  bodyHtml = "",
  noteId = newNoteEntityId(),
  revisionId = newNoteEntityId(),
  source = null,
  actorUid,
}) {
  const owner = ownership({ tenantId, ownerPersonId, ownerUid });
  requireToken("actorUid", actorUid);
  requireText("title", title);
  requireText("bodyHtml", bodyHtml);
  requireToken("noteId", noteId);
  requireToken("revisionId", revisionId);

  const noteDocId = noteFoundationDocId(tenantId, noteId);
  const revisionDocId = noteFoundationDocId(tenantId, revisionId);

  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const existing = await transaction.get(TENANT.NOTES, noteDocId);
    if (existing.exists()) throw new Error("Note ID already exists.");

    transaction.create(TENANT.NOTE_REVISIONS, revisionDocId, {
      revisionId,
      noteId,
      ...owner,
      previousRevisionId: null,
      title,
      bodyHtml,
      revisionReason: "created",
      actorUid,
    });
    transaction.create(TENANT.NOTES, noteDocId, {
      noteId,
      ...owner,
      visibility: NOTE_VISIBILITY,
      title,
      bodyHtml,
      status: NOTE_STATUS.ACTIVE,
      currentRevisionId: revisionId,
    });

    if (source) {
      const sourceLinkId = source.sourceLinkId ?? newNoteEntityId();
      transaction.create(TENANT.NOTE_SOURCES, noteFoundationDocId(tenantId, sourceLinkId), {
        sourceLinkId,
        ...relationBase(owner, noteId),
        sourceKind: requireToken("sourceKind", source.sourceKind),
        sourceKey: requireToken("sourceKey", source.sourceKey),
        relationshipKind: requireToken("relationshipKind", source.relationshipKind),
        approachId: source.approachId ?? null,
        provenanceKind: requireToken("provenanceKind", source.provenanceKind),
        status: NOTE_STATUS.ACTIVE,
      });
    }
  });

  return { noteId, revisionId, noteDocId, revisionDocId };
}

export async function updatePermanentNoteContent(db, {
  tenantId,
  noteId,
  expectedRevisionId,
  revisionId = newNoteEntityId(),
  title,
  bodyHtml,
  revisionReason = "content-update",
  actorUid,
}) {
  requireText("title", title);
  requireText("bodyHtml", bodyHtml);
  requireToken("expectedRevisionId", expectedRevisionId);
  requireToken("revisionReason", revisionReason);
  requireToken("actorUid", actorUid);
  const noteDocId = noteFoundationDocId(tenantId, noteId);

  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const noteSnapshot = await transaction.get(TENANT.NOTES, noteDocId);
    if (!noteSnapshot.exists()) throw new Error("Note does not exist.");
    const note = noteSnapshot.data();
    if (note.status !== NOTE_STATUS.ACTIVE) throw new Error("Retired Note cannot be edited.");
    if (note.currentRevisionId !== expectedRevisionId) throw new Error("Stale Note revision.");

    transaction.create(TENANT.NOTE_REVISIONS, noteFoundationDocId(tenantId, revisionId), {
      revisionId,
      noteId,
      tenantId: note.tenantId,
      ownerPersonId: note.ownerPersonId,
      ownerUid: note.ownerUid ?? null,
      previousRevisionId: expectedRevisionId,
      title,
      bodyHtml,
      revisionReason,
      actorUid,
    });
    transaction.update(TENANT.NOTES, noteDocId, { title, bodyHtml, currentRevisionId: revisionId });
  });

  return revisionId;
}

export async function retirePermanentNote(db, { tenantId, noteId, expectedRevisionId, actorUid }) {
  const noteDocId = noteFoundationDocId(tenantId, noteId);
  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const snapshot = await transaction.get(TENANT.NOTES, noteDocId);
    if (!snapshot.exists()) throw new Error("Note does not exist.");
    const note = snapshot.data();
    if (note.currentRevisionId !== expectedRevisionId) throw new Error("Stale Note revision.");
    transaction.update(TENANT.NOTES, noteDocId, { status: NOTE_STATUS.RETIRED });
  });
}

/** One person's folders, for judging a tree. Equality-only and bounded, so it needs no composite index (P5-E). */
export async function listNoteFoldersForOwner(db, { tenantId, ownerPersonId, status = NOTE_STATUS.ACTIVE, maximum = 500 }) {
  const q = query(collection(db, TENANT.NOTE_FOLDERS),
    where("tenantId", "==", requireToken("tenantId", tenantId)),
    where("ownerPersonId", "==", requireToken("ownerPersonId", ownerPersonId)),
    where("status", "==", status), limit(maximum));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

/**
 * MAP Phase 6 (P6-B). This function used to validate `parentFolderId` NOT AT
 * ALL — no existence check, no tenant or owner check, no cycle check — where
 * its sibling `createNotePlacement()` did all three in a transaction. A folder
 * could name a parent that did not exist, belonged to another person or
 * tenant, or was itself; two folders could name each other. Harmless while the
 * collection was unruled and uninvoked; it is the core structure of Mapping My
 * Journey, so ADR-010 gave it a contract and this closes it against that.
 *
 * WHY A READ AND NOT A TRANSACTION. Judging a tree needs the person's other
 * folders, and a Firestore transaction cannot run a query. So the folders are
 * read, judged, and then the document is created. The race that leaves is
 * narrow and bounded: two CONCURRENT creates by the same person could close a
 * cycle, and the candidate Rules cannot catch it either (they can enforce one
 * hop, never an ancestor chain — see the Phase 6 Rules candidate's own header).
 * Stated rather than hidden, and the reason every consumer of this tree must
 * bound its own walk regardless.
 */
export async function createNoteFolder(db, {
  tenantId, ownerPersonId, ownerUid, name, parentFolderId = null,
  semanticRole = "user", order = 0, folderId = newNoteEntityId(), actorUid,
}) {
  const owner = ownership({ tenantId, ownerPersonId, ownerUid });
  requireText("name", name);
  // ADR-010's field rules first: role vocabulary, name, and "a system folder
  // has no parent". These need no read, so a malformed folder never costs one.
  journeyFolder({ tenantId, ownerPersonId, name, parentFolderId, semanticRole, order });

  if (parentFolderId !== null) {
    const folders = new Map((await listNoteFoldersForOwner(db, { tenantId, ownerPersonId }))
      .map((f) => [f.folderId, f]));
    const refusal = folderTreeRefusal({ folders, tenantId, ownerPersonId, folderId, parentFolderId });
    if (refusal) throw new Error(`Folder parent refused: ${refusal}`);
  }

  await createDocument(db, TENANT.NOTE_FOLDERS, noteFoundationDocId(tenantId, folderId), {
    folderId, ...owner, name, parentFolderId, semanticRole, order, status: NOTE_STATUS.ACTIVE,
  }, actorUid);
  return folderId;
}

export async function createNotePlacement(db, {
  tenantId, ownerPersonId, ownerUid, noteId, folderId,
  order = 0, placementId = newNoteEntityId(), actorUid,
}) {
  const owner = ownership({ tenantId, ownerPersonId, ownerUid });
  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const noteSnapshot = await transaction.get(TENANT.NOTES, noteFoundationDocId(tenantId, noteId));
    const folderSnapshot = await transaction.get(TENANT.NOTE_FOLDERS, noteFoundationDocId(tenantId, folderId));
    if (!noteSnapshot.exists() || !folderSnapshot.exists()) throw new Error("Note and Folder must exist.");
    for (const entity of [noteSnapshot.data(), folderSnapshot.data()]) {
      if (entity.tenantId !== tenantId || entity.ownerPersonId !== ownerPersonId || (entity.ownerUid ?? null) !== ownerUid) {
        throw new Error("Cross-owner or cross-tenant placement refused.");
      }
      if (entity.status !== NOTE_STATUS.ACTIVE) throw new Error("Placement target must be active.");
    }
    transaction.create(TENANT.NOTE_PLACEMENTS, noteFoundationDocId(tenantId, placementId), {
      placementId, ...relationBase(owner, noteId), folderId, order, status: NOTE_STATUS.ACTIVE,
    });
  });
  return placementId;
}

export async function listNotesForOwner(db, { tenantId, ownerPersonId, status = NOTE_STATUS.ACTIVE, maximum = 100 }) {
  const q = query(collection(db, TENANT.NOTES),
    where("tenantId", "==", requireToken("tenantId", tenantId)),
    where("ownerPersonId", "==", requireToken("ownerPersonId", ownerPersonId)),
    where("status", "==", status), orderBy("updatedAt", "desc"), limit(maximum));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listNoteRevisions(db, { tenantId, ownerPersonId, noteId, maximum = 100 }) {
  const q = query(collection(db, TENANT.NOTE_REVISIONS),
    where("tenantId", "==", requireToken("tenantId", tenantId)),
    where("ownerPersonId", "==", requireToken("ownerPersonId", ownerPersonId)),
    where("noteId", "==", requireToken("noteId", noteId)),
    orderBy("createdAt", "desc"), limit(maximum));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

// ---------------------------------------------------------------------------
// MAP Phase 5 (P5-E) — reading a unit's Notes back
// ---------------------------------------------------------------------------
// ADR-009 gave a Note a source binding and nothing ever read one: `noteSources`
// was write-only. These two functions are the read side of it. They are the
// data layer only — a unit key is JUDGED by `study-note-binding.js` and nowhere
// else, so nothing here inspects the shape of `sourceKey`.

/**
 * The source links binding one permanent Study Unit key to this person's Notes.
 *
 * ORDERED, and that is not decoration. The bound exists to stop an unbounded
 * read; without an order, hitting it would return an ARBITRARY subset and the
 * reader would silently lose Notes they wrote. Ordered newest-first, a
 * truncation means "the most recent N", which a surface can state honestly.
 *
 * The order costs a composite index — see
 * `docs/governance/phase5-note-foundation-indexes-candidate-2026-09-15.json`.
 * Until that index exists in the project, this query fails in production with
 * `failed-precondition`, and the emulator will NOT warn about it.
 */
export async function listNoteSourcesForUnit(db, {
  tenantId, ownerPersonId, sourceKey, status = NOTE_STATUS.ACTIVE, maximum = 100,
}) {
  const q = query(collection(db, TENANT.NOTE_SOURCES),
    where("tenantId", "==", requireToken("tenantId", tenantId)),
    where("ownerPersonId", "==", requireToken("ownerPersonId", ownerPersonId)),
    where("sourceKey", "==", requireToken("sourceKey", sourceKey)),
    where("status", "==", status),
    orderBy("createdAt", "desc"), limit(maximum));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

/**
 * Notes by their permanent ids, as one parallel batch.
 *
 * One read per Note, deliberately, rather than a `documentId() in [...]`
 * query: `activity.js` already resolves a set of documents this way
 * (`Promise.all` over the week keys it needs), so this is the shape this
 * codebase already has rather than a new one. The typical cost is one or two
 * reads — the number of Notes a person actually wrote on one unit — and the
 * caller's bound is the cap, not the expected cost.
 *
 * A missing id is DROPPED rather than throwing: a source link can outlive the
 * Note it names, and one dangling link must not deny a reader every other Note
 * on the unit.
 */
export async function getNotesByIds(db, tenantId, noteIds) {
  requireToken("tenantId", tenantId);
  const snapshots = await Promise.all(noteIds.map(
    (noteId) => getDoc(doc(db, TENANT.NOTES, noteFoundationDocId(tenantId, noteId)))));
  return snapshots.filter((snap) => snap.exists()).map((snap) => ({ id: snap.id, ...snap.data() }));
}

// ---------------------------------------------------------------------------
// MAP Phase 6 (P6-C) — reading and moving placements
// ---------------------------------------------------------------------------
// `notePlacements` was WRITE-ONLY: created and never read, which is precisely
// the shape `noteSources` was in before P5-E. A folder's contents could not be
// listed and there was no way to ask where a Note had been filed. And ADR-010
// §5's "a move is retire-and-create" was unexecutable, because no retire
// existed at all.

/**
 * What is filed in one folder, in the author's own order.
 *
 * ORDERED, for the reason P5-E gave: the bound exists to stop an unbounded
 * read, and without an order, hitting it would return an ARBITRARY subset and
 * the reader would silently lose Notes they filed. Ordered, a truncation means
 * "the first N as you arranged them". That order costs a composite index — see
 * `docs/governance/phase6-journey-map-indexes-candidate-2026-09-17.json`.
 */
export async function listNotePlacementsForFolder(db, {
  tenantId, ownerPersonId, folderId, status = NOTE_STATUS.ACTIVE, maximum = 100,
}) {
  const q = query(collection(db, TENANT.NOTE_PLACEMENTS),
    where("tenantId", "==", requireToken("tenantId", tenantId)),
    where("ownerPersonId", "==", requireToken("ownerPersonId", ownerPersonId)),
    where("folderId", "==", requireToken("folderId", folderId)),
    where("status", "==", status),
    orderBy("order", "asc"), limit(maximum));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

/**
 * Where one Note has been filed — every folder holding it (ADR-010 §5:
 * placement is many-to-many).
 *
 * DELIBERATELY UNORDERED, and the asymmetry with the function above is
 * reasoned rather than accidental: a folder may hold hundreds of Notes, so
 * truncating it arbitrarily would really lose things; the set of folders ONE
 * Note sits in is inherently tiny, so an equality-only query is bounded in
 * practice by the data itself. That saves a second composite index, and the
 * caller sorts the handful it gets. Hitting this bound means a Note filed in
 * more than `maximum` folders, which is pathological rather than expected.
 */
export async function listNotePlacementsForNote(db, {
  tenantId, ownerPersonId, noteId, status = NOTE_STATUS.ACTIVE, maximum = 100,
}) {
  const q = query(collection(db, TENANT.NOTE_PLACEMENTS),
    where("tenantId", "==", requireToken("tenantId", tenantId)),
    where("ownerPersonId", "==", requireToken("ownerPersonId", ownerPersonId)),
    where("noteId", "==", requireToken("noteId", noteId)),
    where("status", "==", status), limit(maximum));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

/** Retires one placement. Never deletes it (I4): the record that the Note was filed here is history. */
export async function retireNotePlacement(db, { tenantId, placementId, actorUid }) {
  const docId = noteFoundationDocId(tenantId, requireToken("placementId", placementId));
  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const snapshot = await transaction.get(TENANT.NOTE_PLACEMENTS, docId);
    if (!snapshot.exists()) throw new Error("Placement does not exist.");
    if (snapshot.data().status !== NOTE_STATUS.ACTIVE) throw new Error("Placement is already retired.");
    transaction.update(TENANT.NOTE_PLACEMENTS, docId, { status: NOTE_STATUS.RETIRED });
  });
}

/**
 * ADR-010 §5 — moves a Note from one folder to another as ONE transaction:
 * retire the placement that exists, create the one that should.
 *
 * ATOMIC ON PURPOSE. Done as two separate writes, a failure between them leaves
 * the Note filed in both folders or in neither, and the reader has no way to
 * tell which happened. Both ids are known up front, so no query is needed and a
 * transaction is available — unlike `createNoteFolder()`, which must read a
 * whole folder set to judge a tree and therefore cannot use one.
 *
 * There is deliberately no path here that rewrites a placement's `folderId`:
 * that would destroy the record that the Note was ever filed where it was (I4),
 * and the candidate Rules freeze the field so the server refuses it too.
 */
export async function moveNotePlacement(db, {
  tenantId, ownerPersonId, ownerUid = null, noteId, fromPlacementId, toFolderId,
  order = 0, placementId = newNoteEntityId(), actorUid,
}) {
  const owner = ownership({ tenantId, ownerPersonId, ownerUid });
  requireToken("fromPlacementId", fromPlacementId);
  requireToken("toFolderId", toFolderId);
  const fromDocId = noteFoundationDocId(tenantId, fromPlacementId);

  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const existing = await transaction.get(TENANT.NOTE_PLACEMENTS, fromDocId);
    if (!existing.exists()) throw new Error("Placement to move does not exist.");
    const from = existing.data();
    if (from.status !== NOTE_STATUS.ACTIVE) throw new Error("A retired placement cannot be moved.");
    if (from.noteId !== noteId) throw new Error("Placement does not hold that Note.");
    if (from.folderId === toFolderId) throw new Error("A move must change folder.");

    const target = await transaction.get(TENANT.NOTE_FOLDERS, noteFoundationDocId(tenantId, toFolderId));
    if (!target.exists()) throw new Error("Target folder does not exist.");
    const folder = target.data();
    if (folder.tenantId !== tenantId || folder.ownerPersonId !== ownerPersonId) {
      throw new Error("Cross-owner or cross-tenant placement refused.");
    }
    if (folder.status !== NOTE_STATUS.ACTIVE) throw new Error("Placement target must be active.");

    transaction.update(TENANT.NOTE_PLACEMENTS, fromDocId, { status: NOTE_STATUS.RETIRED });
    transaction.create(TENANT.NOTE_PLACEMENTS, noteFoundationDocId(tenantId, placementId), {
      placementId, ...relationBase(owner, noteId), folderId: toFolderId, order, status: NOTE_STATUS.ACTIVE,
    });
  });
  return placementId;
}
