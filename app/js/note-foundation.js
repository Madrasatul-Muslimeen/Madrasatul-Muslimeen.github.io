// Stage 5 Note Foundation — permanent private Notes and their relationships.
// This module is deliberately not imported by any UI yet. Every write flows
// through envelope.js; legacy ayahNotes remains unchanged and has no fallback
// or dual-write relationship with these collections.

import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
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

export async function createNoteFolder(db, {
  tenantId, ownerPersonId, ownerUid, name, parentFolderId = null,
  semanticRole = "user", order = 0, folderId = newNoteEntityId(), actorUid,
}) {
  const owner = ownership({ tenantId, ownerPersonId, ownerUid });
  requireText("name", name);
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
