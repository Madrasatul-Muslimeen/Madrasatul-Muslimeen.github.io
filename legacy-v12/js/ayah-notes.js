// Ayah Note panel — data layer (phase 1 of the round). See CLAUDE.md's
// "The Āyah Note panel" section for the full shape: a per-āyah quick-actions
// menu (Copy / Share / Play) plus a deeper Note & more view (collapsible
// Arabic/English/Bangla + a rich-text Notes field). This file only ever
// covers the Notes half of that — the star reuses bookmarks.js (see
// findSavedBookmark() there), Copy/Share/Play never touch Firestore at all.
//
// ayahNotes/{tenantId}__{personId} -- ONE document per person, same shape as
// bookmarks/{tenantId}__{personId}: notes{ "<unitKey>": {html, updatedAt} }.
// A save OVERWRITES the one entry for that unitKey, same as bookmarks.resume
// -- this is a person's current note on that āyah, not an append-only log,
// so I4 doesn't apply to it any differently than it applies to resume.
//
// Nothing existing fit a free per-āyah rich-text field (records.entries has
// a notes string, but that's scoped to one trackable's claim, not the āyah
// itself -- see records.js). Same "small additive collection, no precedent
// to reuse" shape as D12's domains.

import {
  doc,
  getDoc,
  waitForPendingWrites,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";
import { safeWrite } from "./errors.js";
import { t } from "./i18n.js";

function ayahNotesDocId(tenantId, personId) {
  return `${tenantId}__${personId}`;
}

export async function getAyahNotes(db, tenantId, personId) {
  const snap = await getDoc(doc(db, TENANT.AYAH_NOTES, ayahNotesDocId(tenantId, personId)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : { notes: {} };
}

/** Reads one āyah's saved note (its HTML) out of an already-fetched ayahNotes doc. Empty string when nothing's been saved yet -- never null/undefined, so a caller can drop it straight into a contenteditable without a null check. */
export function ayahNoteHtml(notesDoc, unitKey) {
  return notesDoc?.notes?.[unitKey]?.html ?? "";
}

/** True only once real text has been saved -- the Copy/Share quick menu's "My note" checkbox and the ⋮ badge's own filled-in state both read this, so an empty contenteditable (just formatting marks, no text) doesn't count as "has a note." */
export function ayahHasNote(notesDoc, unitKey) {
  const html = ayahNoteHtml(notesDoc, unitKey);
  if (!html) return false;
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").trim().length > 0;
}

/** Same create-or-update shape as bookmarks.js's touchResume() -- getDoc first to decide, so the very first note anyone saves creates the document rather than failing an update against nothing. */
export async function saveAyahNote(db, { tenantId, personId, unitKey, html, uid }) {
  const docId = ayahNotesDocId(tenantId, personId);
  const entry = { html, updatedAt: new Date().toISOString() };

  const existingSnap = await getDoc(doc(db, TENANT.AYAH_NOTES, docId));
  if (existingSnap.exists()) {
    await updateDocument(db, TENANT.AYAH_NOTES, docId, { [`notes.${unitKey}`]: entry, tenantId, personId });
  } else {
    await createDocument(db, TENANT.AYAH_NOTES, docId, { tenantId, personId, notes: { [unitKey]: entry } }, uid);
  }
  return docId;
}

// Write-capability probe (spec item 8): "verify write capability once at
// startup ... rather than discovering failures only when the user edits
// something." Doing this at APP startup would add a round trip to every
// page load whether or not anyone ever opens a note (I9 -- nothing joins
// the startup path without being flagged). Instead this runs once, the
// first time the Note & more view is actually opened in a session --
// same "on first use" treatment this app already gives the reciter timing
// map (v07.39) and the search index (v07.40).
//
// A real write, not just an API-presence check: touches the person's own
// ayahNotes doc (creates it empty if it doesn't exist yet, otherwise a
// no-op update that still stamps updatedAt), then races
// waitForPendingWrites() against a short timeout -- the same pattern
// self-check.js's own offline-queue check already uses, because D5's
// offline persistence means a write's promise can resolve from the local
// cache alone, before it has actually reached the server.
const writabilityChecked = new Set();

async function touchAyahNotesDoc(db, tenantId, personId, uid) {
  const docId = ayahNotesDocId(tenantId, personId);
  const existingSnap = await getDoc(doc(db, TENANT.AYAH_NOTES, docId));
  if (existingSnap.exists()) {
    // envelope.js's updateDocument is the only thing allowed to call
    // updateDoc -- an empty data object still stamps updatedAt, which is
    // exactly the harmless real write this probe needs.
    await updateDocument(db, TENANT.AYAH_NOTES, docId, {});
  } else {
    await createDocument(db, TENANT.AYAH_NOTES, docId, { tenantId, personId, notes: {} }, uid);
  }
}

/**
 * Call once, right when the Note & more view opens (before the reader starts
 * typing) -- never at page load. Cached per person for the rest of the
 * session, so re-opening the panel doesn't re-probe every time.
 * Returns { ok: true } or { ok: false, message } -- a false result should
 * degrade quietly (spec item 8): a small on-screen notice, not a blocking
 * error, since the reader can still write notes locally and the panel
 * itself already surfaces any real save failure through safeWrite/I15.
 */
export async function ensureAyahNotesWritable(db, { tenantId, personId, uid }) {
  const docId = ayahNotesDocId(tenantId, personId);
  if (writabilityChecked.has(docId)) return { ok: true };

  const outcome = await safeWrite(
    () => touchAyahNotesDoc(db, tenantId, personId, uid),
    { collection: TENANT.AYAH_NOTES, action: "ensureWritable" }
  );
  if (!outcome.ok) return { ok: false, message: outcome.entry.message };

  try {
    await Promise.race([
      waitForPendingWrites(db),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
  } catch {
    return { ok: false, message: t("Changes aren't reaching the server right now — notes will save once the connection is back.") };
  }

  writabilityChecked.add(docId);
  return { ok: true };
}
