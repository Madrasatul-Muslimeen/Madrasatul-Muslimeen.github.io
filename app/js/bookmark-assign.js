// The Owner, 12 Oct 2026 (from real use, the Read view's 🔖 dialog with three
// people under "Assign to"): "I tried to add bookmark for children but
// couldn't add, but for myself only? yes, ok. Pls fix".
//
// What really happened, reproduced in the browser harness before anything was
// changed: the write DID land, in the child's own bookmarks/{tenant}__{child}
// document. Three things made it look as if it had not:
//   1. Nothing said so. The dialog closed, and the 🔖 on screen stayed 🔖,
//      because this page only holds the SELECTED person's document (the
//      Owner's own) in memory -- and the Owner's Bookmark menu reads only that
//      document too. A bookmark saved for a child alone was invisible from
//      where the Owner was standing.
//   2. The child's copy was tagged "For" the Owner: the For picker defaulted to
//      the selected person and did not follow the ticks, so a bookmark living
//      in Maryam's document said it was for Ahsan.
//   3. One of the Owner's own folders, chosen for a single child, handed that
//      folder's ID to the child's document, where no such folder exists -- so
//      the child's copy fell silently back to Unfiled.
//
// This module is the one save loop the four bookmark dialogs' callers
// (quranrevival.html, asma-study.js, topic-study.js, routine-study.js) used
// to carry four copies of. It fixes (3) here -- a folder is filed by its NAME
// in another person's document, found there or created there, the same way
// "+ New folder…" already creates one by name in each document -- and returns
// who it was really saved for, so the caller can say so (1). (2) is fixed in
// bookmark-popover.js, where the For picker lives.
//
// Nothing about WHERE a bookmark is written changed: still one write per
// ticked person, on that person's own document, which the bookmarks Rules
// (canRecordFor) already allow an owner/prime/guardian to write.

import { getBookmarks, saveBookmark, createFolder } from "./bookmarks.js";
import { safeWrite } from "./errors.js";
import { TENANT } from "./collections.js";

const sameName = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

/**
 * Saves the dialog's `choice` (openBookmarkNamePopover()'s result) into every
 * ticked person's own bookmarks document. `bookmark` is the module's own
 * fields: { moduleId, subjectId, name, position, settings }.
 * Resolves with { results: [{ personId, ok, bookmark, folders }], savedFor }
 * -- `folders` are any folders created in that person's document, `savedFor`
 * the ids whose bookmark really was written. Every failure has already been
 * put in front of the reader by safeWrite() (I15).
 */
export async function saveBookmarkForAssignees(db, { tenantId, uid, selectedPersonId, choice, bookmark }) {
  const assigneeIds = choice?.assigneeIds?.length ? choice.assigneeIds : [selectedPersonId];
  const multi = assigneeIds.length > 1;
  const personTagId = multi ? null : (choice.personTagId ?? null);
  const results = await Promise.all(assigneeIds.map(async (pid) => {
    const out = { personId: pid, ok: false, bookmark: null, folders: [] };
    let folderId = null;
    const makeFolder = async (name) => {
      const made = await safeWrite(
        () => createFolder(db, { tenantId, personId: pid, name, personTagId, uid }),
        { collection: TENANT.BOOKMARKS, action: "createFolder" }
      );
      if (!made.ok) return null;
      out.folders.push(made.result);
      return made.result.id;
    };
    if (choice.newFolderName) {
      folderId = await makeFolder(choice.newFolderName);
      if (!folderId) return out;
    } else if (!multi && choice.folderId) {
      if (pid === selectedPersonId || !choice.folderName) {
        folderId = choice.folderId;
      } else {
        // The folder was listed from the selected person's document; this
        // person's document has folders of its own. File it in theirs by name.
        const theirs = await safeWrite(() => getBookmarks(db, tenantId, pid), { collection: TENANT.BOOKMARKS, action: "getBookmarks" });
        if (!theirs.ok) return out;
        const match = (theirs.result.folders ?? []).find((f) => !f.removed && sameName(f.name, choice.folderName));
        folderId = match ? match.id : await makeFolder(choice.folderName);
        if (!folderId) return out;
      }
    }
    const saved = await safeWrite(
      () => saveBookmark(db, { tenantId, personId: pid, ...bookmark, folderId, personTagId, uid }),
      { collection: TENANT.BOOKMARKS, action: "saveBookmark" }
    );
    if (saved.ok) { out.ok = true; out.bookmark = saved.result; }
    return out;
  }));
  return { results, savedFor: results.filter((r) => r.ok).map((r) => r.personId) };
}

/** The selected person's document after a save: their new bookmark and any new folder patched in, no re-fetch. */
export function patchSelectedDoc(bookmarksDoc, outcome, selectedPersonId) {
  const mine = outcome.results.find((r) => r.personId === selectedPersonId);
  if (!mine) return bookmarksDoc;
  let doc = bookmarksDoc;
  if (mine.folders.length) doc = { ...doc, folders: [...(doc.folders ?? []), ...mine.folders] };
  if (mine.ok) doc = { ...doc, saved: [...(doc.saved ?? []), mine.bookmark] };
  return doc;
}
