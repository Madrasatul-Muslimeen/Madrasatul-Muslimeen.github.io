// F-004 — Document envelope (Phase 0, Foundation)
//
// I17: every document carries schemaVersion, createdAt, updatedAt, createdBy.
// This is the ONLY function in the new codebase allowed to call setDoc /
// updateDoc. Every other module writes through here, so the stamp can never
// be forgotten on some new code path later.
//
// This module only ever touches TENANT (new-generation) collections — the
// legacy app and its data (index.html) are never written to from here.

import {
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Bump this when the shape of new documents changes in a way that later
// code needs to know about. Starts at 1 — nothing has shipped yet.
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Create a brand-new document. Always stamps all four envelope fields.
 * Refuses to run if a uid isn't supplied — createdBy must never be blank.
 */
export async function createDocument(db, collectionName, docId, data, uid) {
  if (!uid) {
    throw new Error(
      `createDocument(${collectionName}/${docId}) refused: no uid supplied for createdBy.`
    );
  }
  const ref = doc(db, collectionName, docId);
  const stamped = {
    ...data,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: uid,
  };
  await setDoc(ref, stamped);
  return ref;
}

/**
 * Update an existing document. Only ever refreshes updatedAt.
 * schemaVersion, createdAt and createdBy are never touched by an update —
 * they describe the document's origin, not its current state (I6-style:
 * origin facts are frozen once set).
 */
export async function updateDocument(db, collectionName, docId, data) {
  const ref = doc(db, collectionName, docId);
  const stamped = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(ref, stamped);
  return ref;
}

/**
 * F-009 — Batched envelope writes (Phase 1, Identity & access).
 *
 * Some operations touch several documents that must land together or not
 * at all — e.g. onboarding creates a tenant, a person, and a membership row
 * in one step. This is still the only place new-generation writes happen:
 * every create/update in the batch gets the same stamping rules as
 * createDocument/updateDocument above, just committed atomically.
 *
 * creates: [{ collectionName, docId, data }]
 * updates: [{ collectionName, docId, data }]
 */
export async function commitEnvelopeBatch(db, { creates = [], updates = [] }, uid) {
  if (creates.length && !uid) {
    throw new Error("commitEnvelopeBatch refused: no uid supplied for createdBy on a create.");
  }
  const batch = writeBatch(db);

  for (const { collectionName, docId, data } of creates) {
    const ref = doc(db, collectionName, docId);
    batch.set(ref, {
      ...data,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: uid,
    });
  }

  for (const { collectionName, docId, data } of updates) {
    const ref = doc(db, collectionName, docId);
    batch.update(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}
