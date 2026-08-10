// F-073 — Bookmarks (Phase 7, Bookmarks/programs/routines)
//
// bookmarks/{tenantId}__{personId} -- ONE document per person (Architecture
// s3, Layer 2):
//   resume{ "<moduleId>::<programId>::<subjectId>": {position, settings, updatedAt} }
//   saved[]{ id, programId, moduleId, subjectId, name, position, settings, removed }
//
// resume is auto-touched every time someone opens a subject/topic/routine
// in any module -- "continue where I left off." It overwrites the one
// entry for that moduleId::programId key each time, never appends -- this
// is a position, not a history log, so I4 doesn't apply to it the way it
// applies to records/activity.
//
// saved[] IS something a person explicitly created, so I4/D6 do apply:
// "removing" a saved bookmark sets removed:true on that array element
// rather than splicing it out. The whole array is read, patched in JS, and
// written back -- Firestore has no per-element array update, and this list
// is small (a person's own shortcuts, not an activity trail).
//
// programId is "none" for every entry until courseOffers/routines (a later
// round of this phase, deferred by the owner 10 Aug 2026) give a real
// program id to key against -- same "reserved field, populated later" shape
// as activity.js's viaProgramId sitting null until now.

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";

export const NO_PROGRAM = "none";

function bookmarksDocId(tenantId, personId) {
  return `${tenantId}__${personId}`;
}

export function resumeKey(moduleId, subjectId, programId = NO_PROGRAM) {
  return `${moduleId}::${programId}::${subjectId}`;
}

export async function getBookmarks(db, tenantId, personId) {
  const snap = await getDoc(doc(db, TENANT.BOOKMARKS, bookmarksDocId(tenantId, personId)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : { resume: {}, saved: [] };
}

/** Auto-resume: overwrites this module's one "where was I" position. Never a log. */
export async function touchResume(db, {
  tenantId, personId, moduleId, programId = NO_PROGRAM, subjectId, position = null, settings = null, uid,
}) {
  const docId = bookmarksDocId(tenantId, personId);
  const key = resumeKey(moduleId, subjectId, programId);
  const entry = { position, settings, updatedAt: new Date().toISOString() };

  const existingSnap = await getDoc(doc(db, TENANT.BOOKMARKS, docId));
  if (existingSnap.exists()) {
    await updateDocument(db, TENANT.BOOKMARKS, docId, { [`resume.${key}`]: entry, tenantId, personId });
  } else {
    await createDocument(db, TENANT.BOOKMARKS, docId, { tenantId, personId, resume: { [key]: entry }, saved: [] }, uid);
  }
  return key;
}

/** Most-recently-touched resume entries, newest first, capped at `limit` -- what the Continue strip actually shows. */
export function recentResumeEntries(bookmarksDoc, limit = 5) {
  return Object.entries(bookmarksDoc?.resume ?? {})
    .map(([key, entry]) => {
      const [moduleId, programId, subjectId] = key.split("::");
      return { moduleId, programId, subjectId, ...entry };
    })
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, limit);
}

/** A person's own named shortcut -- distinct from resume's silent auto-tracking. */
export async function saveBookmark(db, {
  tenantId, personId, moduleId, programId = NO_PROGRAM, subjectId, name, position = null, settings = null, uid,
}) {
  const docId = bookmarksDocId(tenantId, personId);
  const bookmark = {
    id: crypto.randomUUID(),
    programId, moduleId, subjectId, name, position, settings,
    removed: false,
    createdAt: new Date().toISOString(),
  };

  const existingSnap = await getDoc(doc(db, TENANT.BOOKMARKS, docId));
  if (existingSnap.exists()) {
    const saved = [...(existingSnap.data().saved ?? []), bookmark];
    await updateDocument(db, TENANT.BOOKMARKS, docId, { saved, tenantId, personId });
  } else {
    await createDocument(db, TENANT.BOOKMARKS, docId, { tenantId, personId, resume: {}, saved: [bookmark] }, uid);
  }
  return bookmark.id;
}

/** Soft-remove (D6: no client-side delete) -- flips removed:true on one saved[] entry, in place. */
export async function removeSavedBookmark(db, tenantId, personId, bookmarkId) {
  const docId = bookmarksDocId(tenantId, personId);
  const snap = await getDoc(doc(db, TENANT.BOOKMARKS, docId));
  if (!snap.exists()) return false;
  const saved = (snap.data().saved ?? []).map((b) => (b.id === bookmarkId ? { ...b, removed: true } : b));
  await updateDocument(db, TENANT.BOOKMARKS, docId, { saved });
  return true;
}
