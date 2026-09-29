// F-073 — Bookmarks (Phase 7, Bookmarks/programs/routines)
//
// bookmarks/{tenantId}__{personId} -- ONE document per person (Architecture
// s3, Layer 2):
//   resume{ "<moduleId>::<programId>::<subjectId>": {position, settings, updatedAt} }
//   saved[]{ id, programId, moduleId, subjectId, name, position, settings, folderId, personTagId, removed }
//   folders[]{ id, name, parentId, personTagId, removed, createdAt }
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

/** A person's own named shortcut -- distinct from resume's silent auto-tracking. folderId defaults to null (unfiled -- grouped by moduleId until moved into a real folder). personTagId defaults to null (untagged) -- see setBookmarkPersonTag() below for what the tag means and how it differs from personId. */
export async function saveBookmark(db, {
  tenantId, personId, moduleId, programId = NO_PROGRAM, subjectId, name, position = null, settings = null, folderId = null, personTagId = null, uid,
}) {
  const docId = bookmarksDocId(tenantId, personId);
  const bookmark = {
    id: crypto.randomUUID(),
    programId, moduleId, subjectId, name, position, settings, folderId, personTagId,
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

// ---------------------------------------------------------------------------
// Fixes round (23 Aug 2026) -- shared, pure tree helpers. bookmarks.html and
// the new nav.js bookmark dropdown (js/bookmark-nav.js) both need to answer
// "what folders are there, what's inside one, what's unfiled" -- these used
// to be duplicated (bookmarks.html's own allFolders()/liveFolderIdFor()/
// roots computation), which is exactly how the two screens could quietly
// disagree about what "unfiled" means. One implementation now, reused by
// both, with `includeRemoved` as the one real difference between them: the
// Manager shows retired items too (greyed, per I4 -- nothing hidden), the
// nav dropdown (item 3, a quick way to JUMP to a bookmark) shows only what's
// live.
// ---------------------------------------------------------------------------

export function folderById(bookmarksDoc, id) {
  return (bookmarksDoc?.folders ?? []).find((f) => f.id === id) ?? null;
}

/** A bookmark's own folder counts only if it exists AND isn't retired -- otherwise it's unfiled, grouped by its own moduleId (this file's own header rule). */
export function liveFolderIdFor(bookmarksDoc, bookmark) {
  const f = bookmark.folderId ? folderById(bookmarksDoc, bookmark.folderId) : null;
  return f && !f.removed ? f.id : null;
}

/** Root folders -- no parentId, or a parentId that points nowhere (never happens through the Manager's own UI, but cheap to guard). A folder nests under its literal parent whether or not that parent is itself retired -- retiring a folder makes ITS OWN row inert, it doesn't unroot its children. */
export function rootFolders(bookmarksDoc, { includeRemoved = true } = {}) {
  const all = bookmarksDoc?.folders ?? [];
  const pool = includeRemoved ? all : all.filter((f) => !f.removed);
  return pool.filter((f) => !f.parentId || !all.some((p) => p.id === f.parentId));
}

export function childFolders(bookmarksDoc, parentId, { includeRemoved = true } = {}) {
  const all = bookmarksDoc?.folders ?? [];
  const pool = includeRemoved ? all : all.filter((f) => !f.removed);
  return pool.filter((f) => f.parentId === parentId);
}

export function bookmarksInFolder(bookmarksDoc, folderId, { includeRemoved = false } = {}) {
  const all = bookmarksDoc?.saved ?? [];
  const pool = includeRemoved ? all : all.filter((b) => !b.removed);
  return pool.filter((b) => liveFolderIdFor(bookmarksDoc, b) === folderId);
}

export function unfiledBookmarks(bookmarksDoc, { includeRemoved = false } = {}) {
  return bookmarksInFolder(bookmarksDoc, null, { includeRemoved });
}

/**
 * Fixes round, item 1 -- the folder tree flattened into one depth-ordered
 * list (`[{id, name, depth}]`), live folders only. This is what feeds the
 * bookmark-name popover's own folder picker (js/bookmark-popover.js, a pure
 * renderer that must never import this Firebase-touching file itself, per
 * I2) -- the caller (a page controller, which already imports bookmarks.js
 * for saveBookmark()/createFolder()) builds this list and hands it over as
 * plain data.
 */
/**
 * Fixes round 2 -- the person-tag counterpart of rootFolders/bookmarksInFolder
 * above, for the dropdown's "group by Person" mode. Returns
 * `{ untagged: [...], groups: [{ personTagId, bookmarks: [...] }] }`, groups
 * ordered by the roster order the caller passes (so the dropdown reads in the
 * same order as every Person picker in the app) with any tag NOT in that
 * roster last -- a person can be archived out of the roster without their
 * tagged bookmarks silently vanishing (I4: nothing is ever lost, it just falls
 * to the end).
 *
 * Pure, like every helper in this block: names are the caller's job (they need
 * langText() and the app language, which this Firebase-touching data module
 * has no business knowing about).
 */
export function groupBookmarksByPerson(bookmarksDoc, rosterIds = [], { includeRemoved = false } = {}) {
  const all = bookmarksDoc?.saved ?? [];
  const pool = includeRemoved ? all : all.filter((b) => !b.removed);
  const untagged = pool.filter((b) => !b.personTagId);
  const byTag = new Map();
  for (const b of pool) {
    if (!b.personTagId) continue;
    if (!byTag.has(b.personTagId)) byTag.set(b.personTagId, []);
    byTag.get(b.personTagId).push(b);
  }
  const ordered = [
    ...rosterIds.filter((id) => byTag.has(id)),
    ...[...byTag.keys()].filter((id) => !rosterIds.includes(id)),
  ];
  return { untagged, groups: ordered.map((personTagId) => ({ personTagId, bookmarks: byTag.get(personTagId) })) };
}

/**
 * Bookmark-issues round -- the MODULE counterpart of groupBookmarksByPerson()
 * above, for a "Group by: Module" view. Ignores folderId entirely (a filed
 * bookmark shows here too, under its own moduleId) -- this is "everything
 * from Deen Study, wherever I filed it," a different question from the
 * folder tree's own "what's inside this folder." `moduleOrder` is the
 * caller's own MODULE_PAGES/MODULE_LABELS key order (continue-strip.js),
 * so headings read in the app's usual module order rather than whatever
 * order they happen to appear in saved[]; any module not in that list
 * (shouldn't happen, but cheap to guard) sorts last rather than vanishing.
 */
export function groupBookmarksByModule(bookmarksDoc, moduleOrder = [], { includeRemoved = false } = {}) {
  const all = bookmarksDoc?.saved ?? [];
  const pool = includeRemoved ? all : all.filter((b) => !b.removed);
  const byModule = new Map();
  for (const b of pool) {
    if (!byModule.has(b.moduleId)) byModule.set(b.moduleId, []);
    byModule.get(b.moduleId).push(b);
  }
  const ordered = [
    ...moduleOrder.filter((id) => byModule.has(id)),
    ...[...byModule.keys()].filter((id) => !moduleOrder.includes(id)),
  ];
  return ordered.map((moduleId) => ({ moduleId, bookmarks: byModule.get(moduleId) }));
}

export function flattenFolderTree(bookmarksDoc, { includeRemoved = false } = {}) {
  const result = [];
  function walk(list, depth) {
    for (const f of list) {
      result.push({ id: f.id, name: f.name, depth });
      walk(childFolders(bookmarksDoc, f.id, { includeRemoved }), depth + 1);
    }
  }
  walk(rootFolders(bookmarksDoc, { includeRemoved }), 0);
  return result;
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

/**
 * Bookmark creation/update round -- patches one saved[] entry's own
 * `position`/`settings` in place, leaving name/folderId/personTagId
 * untouched (those are edited from the Manager, not overwritten by a study
 * screen). Backs the Ayah Note screen's own "Update bookmark" action
 * (quranrevival.html's `updateOpenedBookmark()`): a bookmark can now be
 * created from the Manager with no captured reading state at all, and this
 * is what lets a reader who opens it, changes the Approach/reading ticks/
 * position while studying, and saves save that state into the SAME
 * bookmark rather than needing to retire it and make a new one.
 */
export async function updateSavedBookmarkFields(db, tenantId, personId, bookmarkId, { position, settings }) {
  const docId = bookmarksDocId(tenantId, personId);
  const snap = await getDoc(doc(db, TENANT.BOOKMARKS, docId));
  if (!snap.exists()) return false;
  const saved = (snap.data().saved ?? []).map((b) => (b.id === bookmarkId ? { ...b, position, settings } : b));
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

/**
 * Fixes round 2 -- patches one saved[] entry's own personTagId. The owner's
 * ask: "enable a bookmark to be saved tagging with a person (students/family
 * members)", so the dropdown can group by who a bookmark is FOR.
 *
 * This is deliberately NOT the same thing as the document's own personId, and
 * the difference is worth understanding before touching this. The document key
 * (`bookmarks/{tenantId}__{personId}`) is WHOSE LIST a bookmark lives in --
 * whichever person was selected in the page's own Person picker when the star
 * was tapped. personTagId is WHO THE BOOKMARK IS FOR, chosen explicitly at
 * creation and editable afterwards from the Manager. A guardian teaching three
 * children keeps their own person selected, bookmarks an ayah, and tags it for
 * whichever child it is meant for -- that is the workflow the grouping serves.
 * Tag null = untagged, which the dropdown shows as direct links rather than
 * inside a group (symmetric with how an unfiled bookmark behaves in folder
 * mode).
 */
export async function setBookmarkPersonTag(db, tenantId, personId, bookmarkId, personTagId) {
  const docId = bookmarksDocId(tenantId, personId);
  const snap = await getDoc(doc(db, TENANT.BOOKMARKS, docId));
  if (!snap.exists()) return false;
  const saved = (snap.data().saved ?? []).map((b) => (b.id === bookmarkId ? { ...b, personTagId } : b));
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

/**
 * A person's own folder -- the "layer" a bookmark (or another folder, for
 * real multi-layer nesting) can be moved into. Same create-or-update shape
 * as saveBookmark().
 *
 * Bookmark-issues round -- personTagId joins folders here, same field,
 * same meaning, same null-means-untagged default as saveBookmark()'s own
 * copy: WHO a folder is FOR (a student/family member), not whose document
 * it lives in. A caller creating a folder from the naming popover (which
 * already asks "for whom" for the bookmark itself) can hand the same
 * choice straight through as a sensible default -- see
 * bookmark-popover.js's own header comment.
 */
export async function createFolder(db, { tenantId, personId, name, parentId = null, personTagId = null, uid }) {
  const docId = bookmarksDocId(tenantId, personId);
  const folder = { id: crypto.randomUUID(), name, parentId, personTagId, removed: false, createdAt: new Date().toISOString() };

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

/** The folder counterpart of setBookmarkPersonTag() above -- same field name, same meaning, same shape. */
export async function setFolderPersonTag(db, tenantId, personId, folderId, personTagId) {
  const docId = bookmarksDocId(tenantId, personId);
  const snap = await getDoc(doc(db, TENANT.BOOKMARKS, docId));
  if (!snap.exists()) return false;
  const folders = (snap.data().folders ?? []).map((f) => (f.id === folderId ? { ...f, personTagId } : f));
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
