// PCF MSA J120 step O3 -- NOTES OFFLINE. The Owner's words: "a Note written or changed with no internet is kept on the
// device and saved for real when the internet returns (nothing lost; if the same Note changed elsewhere meanwhile, the
// later change wins and the earlier is kept as an older version, the same rule as Siyagah)."
//
// A Note save is a Firestore TRANSACTION (note-foundation.js -> envelope.js), and a transaction needs the server: offline
// it is REFUSED (code "unavailable"), never queued by the SDK. So this module keeps the refused save on the device -- an
// OUTBOX in localStorage -- and replays it when the line is back.
//
// NOTHING NEW IS WRITTEN. A replay calls the very same note-foundation.js functions an online save calls
// (updatePermanentNoteContent, createPermanentNote, createNoteSource, createNotePlacement) with the very same fields, so
// no Firestore Rule changes. The ids are minted on the device when the Note is written (noteId, revisionId,
// sourceLinkId, placementId), so a replay that runs twice (two frames, or a page closed half-way) can never make a
// second Note: before each create the replay ASKS whether that exact id is already on the server -- by a list query
// bounded to that one document id (the shape the deployed Rules already serve), never by a get of a document that may
// not exist (denied in production: the v08.56 lesson).
//
// CHANGED ELSEWHERE MEANWHILE (rule 4 of Siyagah, siyagah-sync-model.js): the replay re-reads the Note's head.
//   * this device's change is the later -> it is saved ON TOP of the head; the head stays as an older revision.
//   * the other change is the later    -> this device's text is saved as an older revision first, then the head's
//     text again on top, so the later change is still the Note's text. Nothing is lost either way (I4).
//
// A failure that is not "offline" is NOT kept quietly: it is thrown to the caller exactly as before (I15).
//
// O3b (PCF MSA J120, part 2) adds three things, still through the same functions an online save calls:
//   * a FOLDER kept on the device (kind "folder"): the system folder a first Note is filed in, created with
//     createNoteFolder() when online, its id minted here, asked about first, and replayed BEFORE the Note filed in it
//     (the outbox is replayed in the order it was written). A system folder another device made meanwhile is used
//     instead, so a person still has exactly one of each (ADR-010 §3).
//   * a NEW Note filed in SEVERAL folders (a copy keeps every filing of its original).
//   * the Journaling evidence the Notes screen records after a save (ADR-008): kept with the save as the plain
//     arguments journalEvidenceArgs() made when the Note was written offline (strings only: its week and its day are
//     already decided, so nothing is rebuilt), and recorded through recordJournalEvidence() once the Note has landed,
//     by whichever page sends it.

import {
  createNoteFolder,
  createNotePlacement,
  createNoteSource,
  createPermanentNote,
  getNotesByIds,
  listAllActiveFoldersForOwner,
  listNoteFoldersForOwnerPage,
  listNotePlacementsForOwnerPage,
  listNoteSourcesForOwnerPage,
  listNotesForOwnerIdPage,
  newNoteEntityId,
  noteFoundationDocId,
  updatePermanentNoteContent,
} from "./note-foundation.js";

export const OUTBOX_KEY = "mmsa.noteOutbox.v1";
export const OUTBOX_REVISION_OLDER = "offline-older"; // this device's text, kept as an older version (the other was later)
export const OUTBOX_REVISION_KEPT = "offline-kept";   // the later text, put back on top of it

const KINDS = Object.freeze(["revise", "create", "folder"]);
const SYSTEM_FOLDER_ROLES = Object.freeze(["journey-map", "reflection-archive"]); // ADR-010 §3's closed set

const listeners = new Set();
/** Called with { saved: [entry], failed: [{ entry, error }] } after every replay that did something. */
export function onReplayed(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]");
    return Array.isArray(v) ? v.filter((e) => e && typeof e === "object" && KINDS.includes(e.kind)) : [];
  } catch { return []; }
}
function write(list) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list)); return true; } catch { return false; }
}

/** Is the device offline now? */
export function offlineNow() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
/** A save refused because the device could not reach the server (not a refusal by the server itself). */
export function isOfflineFailure(error) {
  if (offlineNow()) return true;
  const code = String(error?.code ?? "");
  return code === "unavailable" || /client is offline/i.test(String(error?.message ?? ""));
}

/** Every save still waiting on this device (a copy). */
export function pendingEntries() { return read(); }
export function hasPending(filter = {}) { return read().some((e) => matchesOwner(e, filter)); }
export function pendingForNote(noteId) { return read().filter((e) => e.kind !== "folder" && e.noteId === noteId); }
/** The folders kept on this device (for one owner), not yet on the server. */
export function pendingFolders(filter = {}) { return read().filter((e) => e.kind === "folder" && matchesOwner(e, filter)); }

/** Every filing a waiting new Note carries (an entry kept before O3b has one, in folderId/placementId/order). */
function placementsOf(e) {
  if (e.kind !== "create") return [];
  if (Array.isArray(e.placements)) return e.placements;
  return e.folderId ? [{ folderId: e.folderId, placementId: e.placementId, order: e.order ?? 0 }] : [];
}
function placedDone(e, p) { return !!(e.done?.placed?.[p.placementId] || (e.done?.placement && p.placementId === e.placementId)); }

/**
 * Journaling evidence arguments, kept as they are: journalEvidenceArgs() returns plain strings (its week and its day
 * are already decided), so nothing has to be rebuilt on the replay. Anything that would not come back the same from
 * JSON (a Date, a function, a nested object) is refused HERE, where the page can still say so -- never on the replay.
 */
export function keptEvidence(evidence) {
  if (!evidence) return null;
  const plain = JSON.parse(JSON.stringify(evidence));
  const same = Object.keys(evidence).length === Object.keys(plain).length
    && Object.entries(evidence).every(([k, v]) => (v === null || ["string", "number", "boolean"].includes(typeof v)) && plain[k] === v);
  if (!same) throw new TypeError("note-outbox: Journaling evidence must be plain values to be kept on the device.");
  return plain;
}
function matchesOwner(e, { tenantId, ownerPersonId, actorUid } = {}) {
  return (!tenantId || e.tenantId === tenantId) && (!ownerPersonId || e.ownerPersonId === ownerPersonId) && (!actorUid || e.actorUid === actorUid);
}

let replaying = null; // the entry id being replayed now: nothing is folded into it meanwhile

/**
 * Keep an edit on the device. When the Note already has a waiting save that THIS edit builds on (its revision is the
 * one the edit expects), the two are folded into ONE save -- the replay writes one revision, as an online editor that
 * saved once would. Returns the revision id the Note now carries on this device.
 */
export function keepRevise({ tenantId, ownerPersonId = null, noteId, expectedRevisionId, revisionId = newNoteEntityId(), title, bodyHtml, revisionReason = "content-update", actorUid, evidence = null }) {
  const list = read();
  // O3b: a version brought back ("version-restore") is never folded into a waiting edit, nor an edit into it.
  const base = list.find((e) => e.kind !== "folder" && e.noteId === noteId && e.revisionId === expectedRevisionId && e.id !== replaying && !(e.kind === "create" && e.done?.note)
    && (e.kind === "create" || (e.revisionReason ?? "content-update") === revisionReason));
  const at = Date.now();
  const kept = keptEvidence(evidence);
  if (base) {
    // The waiting save's own evidence stands: a creation is recorded once, a revision once a day.
    Object.assign(base, { revisionId, title, bodyHtml, at, evidence: base.evidence ?? kept });
  } else {
    list.push({ kind: "revise", id: newNoteEntityId(), tenantId, ownerPersonId, noteId, expectedRevisionId, revisionId, title, bodyHtml, revisionReason, actorUid, at, evidence: kept });
  }
  if (!write(list)) throw Object.assign(new Error("This device could not keep the Note (its storage is full or private)."), { code: "outbox-full" });
  return revisionId;
}

/**
 * Keep a NEW Note on the device: the Note, its study-unit link (createStudyNote's source, or null) and its filings
 * (`folderId` + `order`, or `placements`: [{ folderId, order, placementId? }] for several), each with its id minted
 * now -- or the ids a page already minted for an online try the server never answered (`noteId`, `revisionId`,
 * `sourceLinkId`, each placement's `placementId`), `done` naming the steps that DID land. `evidence` is the Journaling
 * evidence to record once the Note lands (the Notes screen's), or null.
 * Returns { noteId, revisionId, placementId, placementIds, sourceLinkId }.
 */
export function keepCreate({ tenantId, ownerPersonId, ownerUid, actorUid, title = "", bodyHtml = "", source = null, folderId = null, order = 0, unitKey = null,
  noteId = newNoteEntityId(), revisionId = newNoteEntityId(), sourceLinkId = null, placements = null, done = {}, evidence = null }) {
  const filings = (placements ?? (folderId ? [{ folderId, order }] : []))
    .map((p) => ({ folderId: p.folderId, order: p.order ?? 0, placementId: p.placementId ?? newNoteEntityId() }));
  const entry = {
    kind: "create", id: newNoteEntityId(), tenantId, ownerPersonId, ownerUid, actorUid,
    noteId, revisionId, title, bodyHtml, unitKey,
    source: source ? { ...source } : null, sourceLinkId: source ? (sourceLinkId ?? source.sourceLinkId ?? newNoteEntityId()) : null,
    folderId: filings[0]?.folderId ?? null, placementId: filings[0]?.placementId ?? null, order: filings[0]?.order ?? order,
    placements: filings, at: Date.now(), done: { ...done }, evidence: keptEvidence(evidence),
  };
  if (entry.source) delete entry.source.sourceLinkId;
  const list = read();
  list.push(entry);
  if (!write(list)) throw Object.assign(new Error("This device could not keep the Note (its storage is full or private)."), { code: "outbox-full" });
  return { noteId: entry.noteId, revisionId: entry.revisionId, placementId: entry.placementId, placementIds: filings.map((p) => p.placementId), sourceLinkId: entry.sourceLinkId };
}

/**
 * Keep a FOLDER on the device (createNoteFolder()'s own fields), its id minted now (or the page's, for an online try
 * the server never answered). A system folder already waiting here for the same owner is the one returned: a person
 * has one of each (ADR-010 §3). Returns the folder id.
 */
export function keepFolder({ tenantId, ownerPersonId, ownerUid, actorUid, name, parentFolderId = null, semanticRole = "user", order = 0, folderId = newNoteEntityId() }) {
  const list = read();
  if (SYSTEM_FOLDER_ROLES.includes(semanticRole)) {
    const same = list.find((e) => e.kind === "folder" && e.semanticRole === semanticRole && e.tenantId === tenantId && e.ownerPersonId === ownerPersonId);
    if (same) return same.folderId;
  }
  list.push({ kind: "folder", id: newNoteEntityId(), tenantId, ownerPersonId, ownerUid, actorUid, folderId, name, parentFolderId, semanticRole, order, at: Date.now() });
  if (!write(list)) throw Object.assign(new Error("This device could not keep the Note (its storage is full or private)."), { code: "outbox-full" });
  return folderId;
}

/**
 * The page's own save of an edit, offline-safe: online it is updatePermanentNoteContent() exactly as before; offline
 * (or refused for want of the server) it is kept here and the revision id it will carry is returned. `onDevice(id)`
 * tells the page afterwards whether that revision is only on the device. Any other failure is thrown, as before.
 */
export async function reviseKeepingOffline(db, args) {
  const revisionId = args.revisionId ?? newNoteEntityId();
  const payload = { ...args, revisionId };
  if (offlineNow()) return keepRevise(payload);
  // A save waiting for this Note goes first, so this one builds on it rather than on a revision the server never saw.
  if (pendingForNote(args.noteId).length) {
    await replayOutbox(db, { actorUid: args.actorUid });
    if (pendingForNote(args.noteId).length && offlineNow()) return keepRevise(payload);
  }
  const { ownerPersonId, ...forFoundation } = payload; // updatePermanentNoteContent takes no owner: the Note carries it
  try {
    return await updatePermanentNoteContent(db, forFoundation);
  } catch (error) {
    if (isOfflineFailure(error)) return keepRevise(payload);
    throw error;
  }
}
/** Is this revision of this Note still only on the device? */
export function keptOnDevice(noteId, revisionId) {
  return read().some((e) => e.kind !== "folder" && e.noteId === noteId && (!revisionId || e.revisionId === revisionId));
}

/**
 * What a page loaded from the server, brought up to what this device holds: a waiting edit's text replaces the loaded
 * text (and its revision id), and a Note made here offline is added (with its filing). Returns { notes, placements }
 * that were ADDED, so the page can keep them through its own reloads.
 */
export function overlayPending(notes, placements, { tenantId, ownerPersonId } = {}) {
  const added = { notes: [], placements: [] };
  for (const e of read()) {
    if (e.kind === "folder") continue; // a waiting folder: pendingFolders()
    if (!matchesOwner(e, { tenantId, ownerPersonId: e.kind === "create" ? ownerPersonId : undefined })) continue;
    let note = notes.find((n) => n.noteId === e.noteId);
    if (!note && e.kind === "create" && (!ownerPersonId || e.ownerPersonId === ownerPersonId)) {
      const ms = e.at;
      note = { noteId: e.noteId, tenantId: e.tenantId, ownerPersonId: e.ownerPersonId, ownerUid: e.ownerUid, unitKey: e.unitKey ?? null,
        status: "active", createdAt: { toDate: () => new Date(ms), toMillis: () => ms } };
      notes.push(note);
      added.notes.push(note);
    }
    if (note) Object.assign(note, { title: e.title, bodyHtml: e.bodyHtml, currentRevisionId: e.revisionId, updatedAt: { toDate: () => new Date(e.at), toMillis: () => e.at } });
    for (const f of placementsOf(e)) {
      if (!placements || placements.some((p) => p.placementId === f.placementId)) continue;
      const p = { placementId: f.placementId, noteId: e.noteId, folderId: f.folderId, order: f.order, status: "active", tenantId: e.tenantId, ownerPersonId: e.ownerPersonId };
      placements.push(p);
      added.placements.push(p);
    }
  }
  return added;
}

/** One document by its own id, by a list query bounded to that id (never a get of a document that may not exist). */
async function existsById(lister, db, { tenantId, ownerPersonId }, entityId) {
  const gte = noteFoundationDocId(tenantId, entityId);
  const { rows } = await lister(db, { tenantId, ownerPersonId, pageSize: 1, idRange: { gte, lt: `${gte}\u0000` } });
  return rows.length > 0;
}

function timeOf(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  const n = new Date(ts).getTime();
  return Number.isFinite(n) ? n : 0;
}

/**
 * The Journaling evidence kept with a save, recorded once its Note has landed -- through recordJournalEvidence(), the
 * function the Notes screen calls after an online save (loaded only when there is evidence to record). A refusal for
 * want of the server stops the replay (the save stays kept and is asked about again); any other is reported with the
 * saved Note, which is not undone, so the page can say the activity was not recorded (I15).
 */
async function recordKeptEvidence(db, e) {
  if (!e.evidence || e.done?.evidence) return null;
  const { recordJournalEvidence } = await import("./study-note-service.js");
  try {
    return await recordJournalEvidence(db, e.evidence, e.actorUid);
  } catch (error) {
    if (isOfflineFailure(error)) throw error;
    return { eventId: null, written: false, blocked: true, skipped: false, reason: String(error?.message ?? error) };
  }
}

/** Saves one waiting edit (and then its Journaling evidence). Resolves to the entry as saved ({ ...entry, finalRevisionId, keptOlder, journal }). */
async function replayRevise(db, e) {
  const done = await replayReviseNote(db, e);
  return { ...done, journal: await recordKeptEvidence(db, e) };
}
async function replayReviseNote(db, e) {
  const save = (expectedRevisionId, revisionId, title, bodyHtml, revisionReason) => updatePermanentNoteContent(db, {
    tenantId: e.tenantId, noteId: e.noteId, expectedRevisionId, revisionId, title, bodyHtml, revisionReason, actorUid: e.actorUid,
  });
  try {
    await save(e.expectedRevisionId, e.revisionId, e.title, e.bodyHtml, e.revisionReason ?? "content-update");
    return { ...e, finalRevisionId: e.revisionId };
  } catch (error) {
    if (error?.message !== "Stale Note revision.") throw error;
  }
  // Changed elsewhere meanwhile: read the head and decide by the later change (Siyagah's rule 4).
  const [head] = await getNotesByIds(db, e.tenantId, [e.noteId]);
  if (!head) throw new Error("Note does not exist.");
  if (head.currentRevisionId === e.revisionId) return { ...e, finalRevisionId: e.revisionId }; // already saved (another frame, or a page closed after the commit)
  if (timeOf(head.updatedAt) > e.at) {
    // The other change is the later: this device's text becomes an older version, then the later text goes back on top.
    await save(head.currentRevisionId, e.revisionId, e.title, e.bodyHtml, OUTBOX_REVISION_OLDER);
    const keptId = newNoteEntityId();
    await save(e.revisionId, keptId, head.title ?? "", head.bodyHtml ?? "", OUTBOX_REVISION_KEPT);
    return { ...e, finalRevisionId: keptId, keptOlder: true, title: head.title ?? "", bodyHtml: head.bodyHtml ?? "" };
  }
  // This device's change is the later: saved on top of the head, which stays as an older revision.
  await save(head.currentRevisionId, e.revisionId, e.title, e.bodyHtml, e.revisionReason ?? "content-update");
  return { ...e, finalRevisionId: e.revisionId, rebased: true };
}

/** Saves one Note made offline, step by step; each step is marked done on the device as soon as it lands. */
async function replayCreate(db, e, mark) {
  const owner = { tenantId: e.tenantId, ownerPersonId: e.ownerPersonId };
  if (!e.done.note) {
    if (!(await existsById(listNotesForOwnerIdPage, db, owner, e.noteId))) {
      // createStudyNote() is createPermanentNote() with its source written as a second commit (createNoteSource);
      // the two are called here separately, with the ids minted on the device, so each step can be asked about first.
      await createPermanentNote(db, { tenantId: e.tenantId, ownerPersonId: e.ownerPersonId, ownerUid: e.ownerUid ?? null,
        title: e.title, bodyHtml: e.bodyHtml, noteId: e.noteId, revisionId: e.revisionId, actorUid: e.actorUid });
    }
    e.done.note = true; mark(e);
  }
  if (e.source && !e.done.source) {
    if (!(await existsById(listNoteSourcesForOwnerPage, db, owner, e.sourceLinkId))) {
      await createNoteSource(db, { tenantId: e.tenantId, ownerPersonId: e.ownerPersonId, ownerUid: e.ownerUid ?? null,
        noteId: e.noteId, source: e.source, sourceLinkId: e.sourceLinkId, actorUid: e.actorUid });
    }
    e.done.source = true; mark(e);
  }
  for (const p of placementsOf(e)) {
    if (placedDone(e, p)) continue;
    if (!(await existsById(listNotePlacementsForOwnerPage, db, owner, p.placementId))) {
      await createNotePlacement(db, { tenantId: e.tenantId, ownerPersonId: e.ownerPersonId, ownerUid: e.ownerUid ?? null,
        noteId: e.noteId, folderId: p.folderId, order: p.order, placementId: p.placementId, actorUid: e.actorUid });
    }
    e.done.placed = { ...(e.done.placed ?? {}), [p.placementId]: true }; mark(e);
  }
  const journal = await recordKeptEvidence(db, e);
  if (e.evidence) { e.done.evidence = true; mark(e); }
  return { ...e, finalRevisionId: e.revisionId, journal };
}

/**
 * Saves one folder made offline, with createNoteFolder() and its own fields, once: asked about first by its own id.
 * A SYSTEM folder made meanwhile elsewhere (another id, the same role) is used instead of making a second one: every
 * Note waiting here that is filed in the device's folder is moved to it before it is sent.
 */
async function replayFolder(db, e) {
  const owner = { tenantId: e.tenantId, ownerPersonId: e.ownerPersonId };
  if (SYSTEM_FOLDER_ROLES.includes(e.semanticRole)) {
    const there = (await listAllActiveFoldersForOwner(db, owner)).find((f) => f.semanticRole === e.semanticRole);
    if (there && there.folderId !== e.folderId) {
      const now = read();
      for (const x of now) {
        if (x.kind !== "create") continue;
        const moved = placementsOf(x).map((p) => (p.folderId === e.folderId ? { ...p, folderId: there.folderId } : p));
        Object.assign(x, { placements: moved, folderId: moved[0]?.folderId ?? x.folderId });
      }
      write(now);
      return { ...e, folderId: there.folderId, usedExisting: true };
    }
    if (there) return { ...e };
  } else if (await existsById(listNoteFoldersForOwnerPage, db, owner, e.folderId)) {
    return { ...e };
  }
  await createNoteFolder(db, { tenantId: e.tenantId, ownerPersonId: e.ownerPersonId, ownerUid: e.ownerUid ?? null, name: e.name,
    parentFolderId: e.parentFolderId ?? null, semanticRole: e.semanticRole, order: e.order ?? 0, folderId: e.folderId, actorUid: e.actorUid });
  return { ...e };
}

let running = null;
/**
 * Save everything waiting on this device for `actorUid`, in the order it was written. Stops (keeping the rest) the
 * moment the line drops again. A save the server REFUSES is kept (nothing is deleted), marked, and reported to the
 * page (I15). One replay at a time per page; across the frames of one page, a Web Lock where the browser has one.
 */
export function replayOutbox(db, { actorUid } = {}) {
  if (running) return running;
  const run = async () => {
    const saved = [], failed = [];
    for (;;) {
      if (offlineNow()) break;
      const list = read();
      // A Note filed in a folder that could not be made waits with it: kept, never filed into nothing.
      const stuck = new Set(failed.filter((f) => f.entry.kind === "folder").map((f) => f.entry.folderId));
      const e = list.find((x) => (!actorUid || x.actorUid === actorUid) && !failed.some((f) => f.entry.id === x.id)
        && !placementsOf(x).some((p) => stuck.has(p.folderId)));
      if (!e) break;
      replaying = e.id;
      const mark = (changed) => { const now = read(); const i = now.findIndex((x) => x.id === changed.id); if (i >= 0) { now[i] = { ...now[i], done: { ...changed.done } }; write(now); } };
      try {
        const done = e.kind === "create" ? await replayCreate(db, e, mark) : e.kind === "folder" ? await replayFolder(db, e) : await replayRevise(db, e);
        // Removed only if nothing was folded into it meanwhile (the same revision id): otherwise its newer text goes next.
        const now = read();
        const i = now.findIndex((x) => x.id === e.id);
        if (i >= 0 && now[i].revisionId === e.revisionId) { now.splice(i, 1); write(now); }
        else if (i >= 0) { now[i] = { ...now[i], kind: "revise", expectedRevisionId: done.finalRevisionId, done: undefined, evidence: e.evidence ? null : (now[i].evidence ?? null) }; write(now); }
        saved.push(done);
      } catch (error) {
        if (isOfflineFailure(error)) break;
        const now = read();
        const i = now.findIndex((x) => x.id === e.id);
        if (i >= 0) { now[i] = { ...now[i], lastError: String(error?.message ?? error), tries: (now[i].tries ?? 0) + 1 }; write(now); }
        failed.push({ entry: e, error });
      } finally {
        replaying = null;
      }
    }
    if (saved.length || failed.length) for (const fn of listeners) { try { fn({ saved, failed }); } catch (err) { console.error("[note outbox]", err); } }
    return { saved, failed };
  };
  const locked = typeof navigator !== "undefined" && navigator.locks?.request
    ? navigator.locks.request("mmsa-note-outbox", run)
    : run();
  running = Promise.resolve(locked).finally(() => { running = null; });
  return running;
}
