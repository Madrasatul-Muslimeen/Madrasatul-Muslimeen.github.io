// PCF MSA J120 step O4 -- "Your own records ready". The Owner's plan (J120 j120p2): "the same tap keeps a copy of your
// Notes, folders, Records and Bookmarks on the device, so they open with no internet."
//
// HOW A COPY IS KEPT: Firestore here runs with its on-device database on (firebase-init.js, persistentLocalCache, D5).
// Every document a read brings back from the server is written into that database, and with no internet a read is
// answered from it. So "keeping a copy" is READING each of the person's own documents once, while online, through the
// very same data-layer functions the pages use (note-foundation.js, records.js, bookmarks.js) -- same queries, same
// page size of 100 the deployed Rules allow (listIsBounded) -- so NOTHING NEW IS WRITTEN and no Firestore Rule changes.
// Offline, the pages' own queries (any filter and order) then run against what is kept.
//
// Called ONLY from the "Get ready for offline" tap (offline-ready.js), never at startup (I9, the load-speed contract):
// it is a deliberate, one-off download the reader asked for.
//
// WHOSE: the signed-in person's own (session-context personId) and, when the pages show someone else (a child chosen
// in a Person picker, selectedPersonId), that person's too -- exactly what the pages would read for them.
//
// NOT KEPT (said in words by the caller): a Note's older versions (one read per Note; they are kept for each Note
// opened before, as now), and pictures inside Notes (they are files, not documents).
//
// A part that fails is reported in words with its reason (I15) and does not stop the other parts.
import {
  NOTE_STATUS,
  listNoteFoldersForOwnerPage,
  listNoteLinksForOwnerPage,
  listNotePlacementsForOwnerPage,
  listNoteSectionsForOwnerPage,
  listNoteSourcesForOwnerPage,
  listNoteTagLinksForOwnerPage,
  listNoteTagsForOwnerPage,
  listNotesForOwnerIdPage,
} from "./note-foundation.js";
import { listAllRecordsForPerson } from "./records.js";
import { getBookmarks } from "./bookmarks.js";
import { isSiyagahSectionsReady } from "./siyagah-sections-readiness.js";
import { isSiyagahFlagsReady } from "./siyagah-flags-readiness.js";

export const MAX_PAGES = 500; // 50,000 documents of one kind; a run that reaches it says so rather than claiming all

/** Reads every page of one paged list. Returns { count, bytes, capped }. */
async function allPages(read) {
  let after = null, count = 0, bytes = 0;
  for (let pageNo = 0; pageNo < MAX_PAGES; pageNo++) {
    const { rows, next } = await read(after);
    count += rows.length;
    for (const r of rows) bytes += approxBytes(r);
    if (!next) return { count, bytes, capped: false };
    after = next;
  }
  return { count, bytes, capped: true };
}

function approxBytes(row) {
  try { return JSON.stringify(row).length; } catch { return 0; }
}

/**
 * The parts, in the order they are kept. `kind` is the word the caller shows ("notes", "folders", "records",
 * "bookmarks"); each part says which person it is for.
 */
export function ownDataParts({ tenantId, personIds }) {
  const sections = isSiyagahSectionsReady();
  const flags = isSiyagahFlagsReady();
  const parts = [];
  for (const ownerPersonId of personIds) {
    const paged = (kind, fn, status) => parts.push({
      kind, personId: ownerPersonId,
      run: (db) => allPages((after) => fn(db, { tenantId, ownerPersonId, status, pageSize: 100, after })),
    });
    // Notes: the active ones and the Trash (retired), so the Trash opens offline too.
    paged("notes", listNotesForOwnerIdPage, NOTE_STATUS.ACTIVE);
    paged("notes", listNotesForOwnerIdPage, NOTE_STATUS.RETIRED);
    paged("folders", listNoteFoldersForOwnerPage, NOTE_STATUS.ACTIVE);
    paged("folders", listNoteFoldersForOwnerPage, NOTE_STATUS.RETIRED);
    paged("filings", listNotePlacementsForOwnerPage, NOTE_STATUS.ACTIVE);
    paged("links", listNoteSourcesForOwnerPage, NOTE_STATUS.ACTIVE);
    if (sections) {
      paged("sections", listNoteSectionsForOwnerPage, NOTE_STATUS.ACTIVE);
      paged("tags", listNoteTagsForOwnerPage, NOTE_STATUS.ACTIVE);
      paged("tagLinks", listNoteTagLinksForOwnerPage, NOTE_STATUS.ACTIVE);
    }
    if (flags) paged("noteLinks", listNoteLinksForOwnerPage, NOTE_STATUS.ACTIVE);
    parts.push({
      kind: "records", personId: ownerPersonId,
      run: async (db) => {
        const rows = await listAllRecordsForPerson(db, tenantId, ownerPersonId);
        return { count: rows.length, bytes: rows.reduce((s, r) => s + approxBytes(r), 0), capped: false };
      },
    });
    parts.push({
      kind: "bookmarks", personId: ownerPersonId,
      run: async (db) => {
        const b = await getBookmarks(db, tenantId, ownerPersonId);
        const count = (b.saved || []).length + Object.keys(b.resume || {}).length + (b.folders || []).length;
        return { count, bytes: approxBytes(b), capped: false };
      },
    });
  }
  return parts;
}

/** The people whose copy is kept: the signed-in person, and the person the pages show when that is someone else. */
export function ownDataPeople(context) {
  if (!context || !context.tenantId || !context.personId) return [];
  const ids = [context.personId];
  if (context.selectedPersonId && context.selectedPersonId !== context.personId) ids.push(context.selectedPersonId);
  return ids;
}

/**
 * Keeps the copy. onProgress({ done, total, counts }) after each part.
 * Returns { counts: { notes, folders, filings, links, sections, tags, tagLinks, noteLinks, records, bookmarks }, bytes, failed: [{ kind,
 * personId, why }], capped: [kind] }.
 */
export async function keepOwnDataOffline(db, { tenantId, personIds }, onProgress = () => {}) {
  const parts = ownDataParts({ tenantId, personIds });
  const counts = { notes: 0, folders: 0, filings: 0, links: 0, sections: 0, tags: 0, tagLinks: 0, noteLinks: 0, records: 0, bookmarks: 0 };
  const failed = [], capped = [];
  let bytes = 0, done = 0;
  // One part at a time: these are the person's own documents, a few thousand at most, and one at a time keeps the
  // line free for anything the reader does meanwhile.
  for (const part of parts) {
    try {
      const r = await part.run(db);
      counts[part.kind] += r.count;
      bytes += r.bytes;
      if (r.capped && !capped.includes(part.kind)) capped.push(part.kind);
    } catch (err) {
      failed.push({ kind: part.kind, personId: part.personId, why: String((err && (err.code || err.message)) || err) });
    }
    done++;
    onProgress({ done, total: parts.length, counts: { ...counts } });
  }
  return { counts, bytes, failed, capped };
}
