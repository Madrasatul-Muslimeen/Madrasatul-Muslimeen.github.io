// F-073 — Bookmarks (Phase 7, Bookmarks/programs/routines)
//
// bookmarks/{tenantId}__{personId} -- ONE document per person (Architecture
// s3, Layer 2):
//   resume{ "<moduleId>::<programId>::<subjectId>": {position, settings, updatedAt} }
//   saved[]{ id, programId, moduleId, subjectId, name, position, settings, folderId, removed }
//   folders[]{ id, name, parentId, removed, createdAt }
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
//
// Enhancement round (23 Aug 2026) -- the Bookmark Manager (bookmarks.html),
// the owner's own request answered "Both" on layers: bookmarks are grouped
// by MODULE automatically (folderId: null, the default -- a bookmark stays
// under whichever module it was made from until moved), and a person can
// also create their own named folders and move bookmarks into one, across
// modules. Folders can nest (parentId), which is where "multilayered" comes
// from -- moveFolder() re-parents a folder the same way moveBookmarkToFolder()
// moves a bookmark, and both are I4/D6 soft-remove-only, same shape saved[]
// already used. A bookmark whose folderId points at a removed (or otherwise
// missing) folder is treated as unfiled by the manager's own display logic
// -- nothing is destroyed, it just falls back to its module grouping.
//
// settings stays a free-form object, populated per module: Quran's own star
// (quranrevival.html) captures the full study state (unit, Approach, reading
// ticks) so a bookmark reopens exactly as it was; every other module's star
// (topic-study.js/routine-study.js/asma-study.js) leaves it null -- those
// modules have no comparable per-position reading state yet, so a bookmark
// there is exactly "which subject/topic/Name", restored the same way
// ?resume= already jumps there today (Continue strip's own mechanism).

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
  return snap.exists() ? { id: snap.id, folders: [], ...snap.data() } : { resume: {}, saved: [], folders: [] };
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

/** A person's own named shortcut -- distinct from resume's silent auto-tracking. folderId defaults to null (unfiled -- grouped by moduleId until moved into a real folder). */
export async function saveBookmark(db, {
  tenantId, personId, moduleId, programId = NO_PROGRAM, subjectId, name, position = null, settings = null, folderId = null, uid,
}) {
  const docId = bookmarksDocId(tenantId, personId);
  const bookmark = {
    id: crypto.randomUUID(),
    programId, moduleId, subjectId, name, position, settings, folderId,
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
  // The full object, not just its id: a caller that keeps its own in-memory
  // copy of this person's bookmarksDoc (e.g. the Ayah Note panel's star) can
  // append it directly rather than re-fetching -- the write already tells us
  // exactly what changed, so a re-fetch is both an unneeded round trip and,
  // immediately after a create, a real race against a backend that may not
  // have caught up yet.
  return bookmark;
}

/** First non-removed saved[] entry matching this module/subject/position -- lets a caller (e.g. the Ayah Note panel's ⋮ star) check "is this already bookmarked" before rendering a toggle's state, without inventing a second bookmark mechanism (spec: "no separate bookmarks list is required unless one already exists elsewhere in the app"). Generic over any caller's own position value -- the Ayah Note panel passes a unitKey ("ayah:16:36"), matching I5. */
export function findSavedBookmark(bookmarksDoc, { moduleId, subjectId, position }) {
  return (
    (bookmarksDoc?.saved ?? []).find(
      (b) => !b.removed && b.moduleId === moduleId && b.subjectId === subjectId && b.position === position
    ) ?? null
  );
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

/** I2/D6-shaped rename (item 2: "enable editing it") -- patches one saved[] entry's own name, in place, same read-patch-write shape as removeSavedBookmark(). */
export async function renameSavedBookmark(db, tenantId, personId, bookmarkId, name) {
  const docId = bookmarksDocId(tenantId, personId);
  const snap = await getDoc(doc(db, TENANT.BOOKMARKS, docId));
  if (!snap.exists()) return false;
  const saved = (snap.data().saved ?? []).map((b) => (b.id === bookmarkId ? { ...b, name } : b));
  await updateDocument(db, TENANT.BOOKMARKS, docId, { saved });
  return true;
}

/** The Bookmark Manager's own Retire/Restore toggle -- unlike removeSavedBookmark() (used by every star toggle, always removing), this sets `removed` either way, since the manager is the one screen that needs to flip it back. */
export async function setSavedBookmarkRemoved(db, tenantId, personId, bookmarkId, removed) {
  const docId = bookmarksDocId(tenantId, personId);
  const snap = await getDoc(doc(db, TENANT.BOOKMARKS, docId));
  if (!snap.exists()) return false;
  const saved = (snap.data().saved ?? []).map((b) => (b.id === bookmarkId ? { ...b, removed } : b));
  await updateDocument(db, TENANT.BOOKMARKS, docId, { saved });
  return true;
}

/** Item 3 ("moveable among layers") -- patches one saved[] entry's own folderId. folderId null moves it back to unfiled (grouped by its own moduleId). */
export async function moveBookmarkToFolder(db, tenantId, personId, bookmarkId, folderId) {
  const docId = bookmarksDocId(tenantId, personId);
  const snap = await getDoc(doc(db, TENANT.BOOKMARKS, docId));
  if (!snap.exists()) return false;
  const saved = (snap.data().saved ?? []).map((b) => (b.id === bookmarkId ? { ...b, folderId } : b));
  await updateDocument(db, TENANT.BOOKMARKS, docId, { saved });
  return true;
}

/** A person's own folder -- the "layer" a bookmark (or another folder, for real multi-layer nesting) can be moved into. Same create-or-update shape as saveBookmark(). */
export async function createFolder(db, { tenantId, personId, name, parentId = null, uid }) {
  const docId = bookmarksDocId(tenantId, personId);
  const folder = { id: crypto.randomUUID(), name, parentId, removed: false, createdAt: new Date().toISOString() };

  const existingSnap = await getDoc(doc(db, TENANT.BOOKMARKS, docId));
  if (existingSnap.exists()) {
    const folders = [...(existingSnap.data().folders ?? []), folder];
    await updateDocument(db, TENANT.BOOKMARKS, docId, { folders, tenantId, personId });
  } else {
    await createDocument(db, TENANT.BOOKMARKS, docId, { tenantId, personId, resume: {}, saved: [], folders: [folder] }, uid);
  }
  return folder; // same "return the whole object, not just its id" reasoning as saveBookmark() above
}

export async function renameFolder(db, tenantId, personId, folderId, name) {
  const docId = bookmarksDocId(tenantId, personId);
  const snap = await getDoc(doc(db, TENANT.BOOKMARKS, docId));
  if (!snap.exists()) return false;
  const folders = (snap.data().folders ?? []).map((f) => (f.id === folderId ? { ...f, name } : f));
  await updateDocument(db, TENANT.BOOKMARKS, docId, { folders });
  return true;
}

/** True when `candidateId` is `ancestorId` itself, or sits anywhere under it in the parentId chain -- the cycle a re-parent must never be allowed to create (a folder cannot become its own descendant's child). */
export function isFolderOrDescendant(folders, candidateId, ancestorId) {
  let current = folders.find((f) => f.id === candidateId);
  const seen = new Set();
  while (current) {
    if (current.id === ancestorId) return true;
    if (seen.has(current.id)) return false; // already-corrupt data -- stop rather than loop forever
    seen.add(current.id);
    current = current.parentId ? folders.find((f) => f.id === current.parentId) : null;
  }
  return false;
}

/** Item 3's "multilayered... moveable" for folders themselves, not only the bookmarks inside them -- re-parents one folder. Refuses (returns false, no write) a move that would nest a folder inside its own descendant, the one shape that would otherwise corrupt the tree into a cycle. */
export async function moveFolder(db, tenantId, personId, folderId, newParentId) {
  if (newParentId === folderId) return false;
  const docId = bookmarksDocId(tenantId, personId);
  const snap = await getDoc(doc(db, TENANT.BOOKMARKS, docId));
  if (!snap.exists()) return false;
  const folders = snap.data().folders ?? [];
  if (newParentId && isFolderOrDescendant(folders, newParentId, folderId)) return false;
  const updated = folders.map((f) => (f.id === folderId ? { ...f, parentId: newParentId } : f));
  await updateDocument(db, TENANT.BOOKMARKS, docId, { folders: updated });
  return true;
}

/** Soft-remove (D6/I4) -- the bookmarks inside stay exactly where they are (folderId untouched); the manager's own display falls back to showing them as unfiled once their folder is gone, per this file's own header comment. Nothing cascades, nothing is destroyed. */
export async function removeFolder(db, tenantId, personId, folderId) {
  return setFolderRemoved(db, tenantId, personId, folderId, true);
}

/** The Bookmark Manager's own Retire/Restore toggle for a folder -- same reasoning as setSavedBookmarkRemoved() above. removeFolder() is kept as the always-true convenience wrapper. */
export async function setFolderRemoved(db, tenantId, personId, folderId, removed) {
  const docId = bookmarksDocId(tenantId, personId);
  const snap = await getDoc(doc(db, TENANT.BOOKMARKS, docId));
  if (!snap.exists()) return false;
  const folders = (snap.data().folders ?? []).map((f) => (f.id === folderId ? { ...f, removed } : f));
  await updateDocument(db, TENANT.BOOKMARKS, docId, { folders });
  return true;
}
