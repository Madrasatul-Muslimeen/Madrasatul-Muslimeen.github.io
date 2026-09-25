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
  startAfter,
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

/**
 * Issue #259 -- the deployed Rules' `listIsBounded()` refuses any Note
 * Foundation list request whose `limit` exceeds 100. Thrown BEFORE any
 * request is made (a paged reader must never learn the cap by being denied),
 * never silently clamped -- a caller asking for more than the server will
 * ever honour has a bug worth surfacing, not hiding.
 */
function requirePageSize(pageSize) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new RangeError("note-foundation: pageSize must be an integer between 1 and 100.");
  }
  return pageSize;
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
  // Issue #265 -- optional, additive-only provenance for a Note that was
  // IMPORTED rather than written here: the WordPress post's own original
  // dates and a small importSource map. `undefined` by default, so every
  // existing caller (createStudyNote(), promoteQuickNoteToStudyNote()) is
  // byte-identical in behaviour -- nothing is written unless a caller
  // actually supplies it.
  importMeta = null,
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
    // NO PRE-READ OF `notes/{noteDocId}` (removed v08.56). The deployed
    // `allow get` evaluates `resource.data.tenantId`, and on a document that
    // does not exist `resource` is null — so reading a not-yet-created Note is
    // an evaluation error, the whole transaction is denied, and creating a
    // Note has been impossible in production. The id is a random UUID
    // (`newNoteEntityId()`), and `transaction.create()` is the only write
    // here, so there is nothing a duplicate-id read was protecting.

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
      ...(importMeta ?? {}),
    });
  });

  // THE BIRTH-TIME SOURCE LINK IS A SECOND, SEPARATE COMMIT (v08.56). It used
  // to be written inside the transaction above, and the deployed
  // `noteSources` create rule checks REL-01 with `exists()`/`get()` on the
  // Note — which see the database BEFORE this commit, where the Note does not
  // exist yet. So every Note born with a source was denied, and since
  // `createStudyNote()` always passes one, no Note could be created from the
  // Notes screen at all. Proven against the real Rules engine by
  // note-foundation-real-function.rules.test.mjs. Writing the link once the
  // Note has committed satisfies the deployed rule as it stands; if that
  // second write fails, the error is rethrown so it reaches the reader (I15)
  // and says the Note itself WAS saved.
  if (source) {
    try {
      await createNoteSource(db, {
        tenantId, ownerPersonId, ownerUid, noteId, source,
        sourceLinkId: source.sourceLinkId ?? newNoteEntityId(), actorUid,
      });
    } catch (error) {
      const wrapped = new Error(`The Note was saved, but linking it to its study unit failed: ${error?.message ?? error}`);
      wrapped.cause = error;
      wrapped.code = error?.code;
      throw wrapped;
    }
  }

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

// Retiring commits a REAL revision rather than only flipping `status`.
//
// The Phase 5 Rules candidate's `committedRevisionMatches()` re-checks
// `currentRevisionId` on every update, retire included: the revision it
// names must exist and must chain (`previousRevisionId`) from the revision
// the Note is leaving behind. A status-only update leaves `currentRevisionId`
// pointing at the SAME revision it already named, which can never chain from
// itself -- so every retire would be denied the moment these Rules deploy.
// This was found by comparing what the candidate authorises against what
// this function actually wrote (the "ASK WHAT THE ACCEPTED RULES AUTHORISE,
// THEN WHAT THE CODE CAN PERFORM" method this module already uses elsewhere,
// run in the direction nobody had run it before: what the code WRITES that
// the Rules would refuse). The emulator suite's own IMM-03b case already
// expected exactly this shape by hand; the data layer had simply never
// matched it.
export async function retirePermanentNote(db, { tenantId, noteId, expectedRevisionId, actorUid }) {
  const noteDocId = noteFoundationDocId(tenantId, noteId);
  const revisionId = newNoteEntityId();
  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const snapshot = await transaction.get(TENANT.NOTES, noteDocId);
    if (!snapshot.exists()) throw new Error("Note does not exist.");
    const note = snapshot.data();
    if (note.currentRevisionId !== expectedRevisionId) throw new Error("Stale Note revision.");

    transaction.create(TENANT.NOTE_REVISIONS, noteFoundationDocId(tenantId, revisionId), {
      revisionId,
      noteId,
      tenantId: note.tenantId,
      ownerPersonId: note.ownerPersonId,
      ownerUid: note.ownerUid ?? null,
      previousRevisionId: expectedRevisionId,
      title: note.title,
      bodyHtml: note.bodyHtml,
      revisionReason: "retired",
      actorUid,
    });
    transaction.update(TENANT.NOTES, noteDocId, { status: NOTE_STATUS.RETIRED, currentRevisionId: revisionId });
  });
  return revisionId;
}

/** One person's folders, for judging a tree. Equality-only and bounded, so it needs no composite index (P5-E). */
// v08.58 -- `maximum` was 500, and the deployed Rules' `listIsBounded()`
// refuses any list whose limit is above 100, so EVERY folder list was denied
// in production: the folder tree Mapping My Journey draws on open, and every
// create-with-parent / move / retire that reads the tree first. Found by
// journey-map-real-function.rules.test.mjs (issue #247). 100 is the Rules cap.
export async function listNoteFoldersForOwner(db, { tenantId, ownerPersonId, status = NOTE_STATUS.ACTIVE, maximum = 100 }) {
  const q = query(collection(db, TENANT.NOTE_FOLDERS),
    where("tenantId", "==", requireToken("tenantId", tenantId)),
    where("ownerPersonId", "==", requireToken("ownerPersonId", ownerPersonId)),
    where("status", "==", status), limit(maximum));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

/**
 * Issue #265 -- the paged twin of `listNoteFoldersForOwner()` above, the same
 * shape `listNotePlacementsForOwnerPage()` already uses: equality filters
 * only (tenantId, ownerPersonId, status), so a `startAfter` cursor on the
 * implicit document-id ordering needs no composite index. `listNoteFoldersForOwner()`
 * itself is unchanged -- every existing caller that only ever wanted "up to
 * 100 folders" still gets exactly that -- but an owner with more than 100
 * folders (the WordPress import can create over a thousand) could never see
 * the rest through it, in any view.
 */
export async function listNoteFoldersForOwnerPage(db, {
  tenantId, ownerPersonId, status = NOTE_STATUS.ACTIVE, pageSize = 100, after = null,
}) {
  requirePageSize(pageSize);
  const q = query(collection(db, TENANT.NOTE_FOLDERS),
    where("tenantId", "==", requireToken("tenantId", tenantId)),
    where("ownerPersonId", "==", requireToken("ownerPersonId", ownerPersonId)),
    where("status", "==", status),
    ...(after ? [startAfter(after)] : []),
    limit(pageSize));
  const snapshot = await getDocs(q);
  const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const next = snapshot.docs.length < pageSize ? null : snapshot.docs[snapshot.docs.length - 1];
  return { rows, next };
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

/**
 * MAP Phase 6 (P6-D) — the folder UPDATE side, which did not exist.
 *
 * `noteFolders` was create-only in this data layer while the accepted Phase 6
 * Rules candidate already authorises the opposite, in its own words: "A folder
 * may be renamed, reordered, re-parented or retired; it may never become a
 * different folder, change owner, or change what KIND of folder it is
 * (ADR-010 §3)." So the accepted decision was unexecutable — the same shape as
 * P6-C's finding that ADR-010 §5's retire-and-create had no retire function.
 * Nothing new is decided here; what the Rules already permit is made reachable.
 *
 * WHAT IS FROZEN, and where it is enforced: `tenantId`, `ownerPersonId`,
 * `ownerUid`, `folderId`, `semanticRole` and `createdBy` are write-once. These
 * functions never send them, and the candidate Rules refuse them as well, so
 * neither side is the only guard.
 *
 * WHY A READ, NOT A TRANSACTION, for a re-parent: exactly as
 * `createNoteFolder()` says above — judging a tree needs a query and a
 * transaction cannot run one. The rename, reorder and retire paths need no
 * tree, so those ARE transactions.
 */
async function loadOwnFolder(transaction, tenantId, ownerPersonId, folderId) {
  const docId = noteFoundationDocId(tenantId, requireToken("folderId", folderId));
  const snapshot = await transaction.get(TENANT.NOTE_FOLDERS, docId);
  if (!snapshot.exists()) throw new Error("Folder does not exist.");
  const folder = snapshot.data();
  if (folder.tenantId !== tenantId || folder.ownerPersonId !== ownerPersonId) {
    throw new Error("Cross-owner or cross-tenant folder refused.");
  }
  return { docId, folder };
}

/** Rename a folder. I11 — a folder name is user-visible, so it is validated, never blank. */
export async function renameNoteFolder(db, { tenantId, ownerPersonId, folderId, name, actorUid }) {
  requireText("name", name);
  // Validated through the contract so a rename cannot accept a name a create
  // would refuse. `parentFolderId: null` and the default role are placeholders
  // for the field rules this call is actually exercising -- the stored parent
  // and role are untouched below.
  journeyFolder({ tenantId, ownerPersonId, name });
  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const { docId, folder } = await loadOwnFolder(transaction, tenantId, ownerPersonId, folderId);
    if (folder.status !== NOTE_STATUS.ACTIVE) throw new Error("A retired folder cannot be renamed.");
    transaction.update(TENANT.NOTE_FOLDERS, docId, { name });
  });
}

/** Reorder a folder among its siblings. `order` is display only -- nothing is keyed by it (I5). */
export async function reorderNoteFolder(db, { tenantId, ownerPersonId, folderId, order, actorUid }) {
  if (!Number.isInteger(order)) throw new TypeError("note-foundation: order must be an integer.");
  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const { docId, folder } = await loadOwnFolder(transaction, tenantId, ownerPersonId, folderId);
    if (folder.status !== NOTE_STATUS.ACTIVE) throw new Error("A retired folder cannot be reordered.");
    transaction.update(TENANT.NOTE_FOLDERS, docId, { order });
  });
}

/**
 * Re-parent a folder, judged against ADR-010's tree rules first.
 *
 * THE OPERATION FIRESTORE RULES CANNOT SECURE. They enforce one hop and can
 * never walk an ancestor chain, so cycle and depth enforcement for a move is
 * client-side only — stated in the Phase 6 Rules candidate's own header and
 * the reason every consumer of this tree bounds its own walk. This is also the
 * path that exposed `folderTreeRefusal()`'s depth arithmetic: a create places
 * a LEAF, a move carries a whole subtree, and the height of what is carried is
 * counted now (see that function's own P6-D note).
 *
 * A system folder cannot be re-parented at all: `journeyFolder()` refuses a
 * parent on one, and moving one to a new place under the tree is exactly the
 * "locked distinction undone by a drag" ADR-010 §3 forbids. `parentFolderId:
 * null` is accepted and is how a folder is lifted back to the top.
 */
export async function reparentNoteFolder(db, {
  tenantId, ownerPersonId, folderId, parentFolderId, actorUid,
}) {
  requireToken("folderId", folderId);
  if (parentFolderId !== null && (typeof parentFolderId !== "string" || !parentFolderId.trim())) {
    throw new TypeError("note-foundation: parentFolderId must be a folder id or null.");
  }
  if (parentFolderId === folderId) throw new Error("Folder parent refused: self-parent");

  const folders = await listNoteFoldersForOwner(db, { tenantId, ownerPersonId });
  const byId = new Map(folders.map((f) => [f.folderId, f]));
  const own = byId.get(folderId);
  if (!own) throw new Error("Folder does not exist.");
  // The whole proposed folder goes back through the contract, exactly as a
  // create does -- which is what refuses a system folder gaining a parent
  // ("a system folder IS the root of its own meaning") without this file
  // holding a second copy of that rule. Reusing `journeyFolder()` rather than
  // re-testing `semanticRole` here is also why this module needs no new
  // import, and so why the insertion-only guard still holds.
  journeyFolder({
    tenantId, ownerPersonId, name: own.name, parentFolderId,
    semanticRole: own.semanticRole, order: own.order ?? 0,
  });
  if (parentFolderId !== null) {
    const refusal = folderTreeRefusal({ folders: byId, tenantId, ownerPersonId, folderId, parentFolderId });
    if (refusal) throw new Error(`Folder parent refused: ${refusal}`);
  }

  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const { docId, folder } = await loadOwnFolder(transaction, tenantId, ownerPersonId, folderId);
    if (folder.status !== NOTE_STATUS.ACTIVE) throw new Error("A retired folder cannot be re-parented.");
    if ((folder.parentFolderId ?? null) === parentFolderId) throw new Error("A move must change parent.");
    transaction.update(TENANT.NOTE_FOLDERS, docId, { parentFolderId });
  });
}

/**
 * Retire a folder (I4 — never deleted).
 *
 * REFUSED WHILE IT STILL HAS ACTIVE CHILDREN, and that is DERIVED from the
 * accepted Rules rather than chosen here: `parentOneHopOk()` requires a
 * parent to be `status == 'active'`, so the moment a parent is retired every
 * update to a child is denied — including the re-parent that would rescue it.
 * Retiring first and tidying after would therefore strand a whole subtree
 * beyond reach of its own author. The children are moved or retired first.
 *
 * ITS PLACEMENTS ARE DELIBERATELY UNTOUCHED. Same asymmetry as P5-E and P6-C:
 * retiring never rewrites the relations that point at the thing retired (I4
 * keeps them), and the read side already excludes a retired folder by reading
 * `listNoteFoldersForOwner()`'s active-only default. Cascading the retirement
 * into placements would destroy the record of where a Note had been filed.
 */
export async function retireNoteFolder(db, { tenantId, ownerPersonId, folderId, actorUid }) {
  requireToken("folderId", folderId);
  const children = (await listNoteFoldersForOwner(db, { tenantId, ownerPersonId }))
    .filter((f) => (f.parentFolderId ?? null) === folderId);
  if (children.length > 0) {
    // Named, not counted: a refusal a person cannot act on is a dead end.
    throw new Error(`Folder still holds active folders: ${children.map((f) => f.folderId).join(", ")}`);
  }
  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const { docId, folder } = await loadOwnFolder(transaction, tenantId, ownerPersonId, folderId);
    if (folder.status !== NOTE_STATUS.ACTIVE) throw new Error("Folder is already retired.");
    transaction.update(TENANT.NOTE_FOLDERS, docId, { status: NOTE_STATUS.RETIRED });
  });
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

/**
 * MAP Phase 5 (P5-F) — retire a source link, which nothing could do.
 *
 * The accepted Phase 5 Rules candidate says it in one line — "A link may be
 * retired, never repointed and never deleted" — permits an update affecting
 * only `status` and `updatedAt`, and its emulator suite proves the server
 * allows it (REL-05). `listNoteSourcesForUnit()` already defaults to
 * active-only, so the READ side was built for a writer that did not exist.
 * The consequence was user-facing: a person could anchor a Note to a Study
 * Unit and never un-anchor it, so an origin recorded by mistake was permanent.
 *
 * NOT A REPOINT AND NOT A DELETE. `sourceKey`, `sourceKind`,
 * `relationshipKind`, `provenanceKind`, `noteId` and the ownership fields are
 * never sent; the Rules refuse them as well (REL-06), so neither side is the
 * only guard. What this changes is which links a unit's read returns — the
 * link itself is kept (I4), and ADR-009's record of where a Note came from is
 * still in the database.
 *
 * IT DOES NOT TOUCH THE NOTE. Retiring the last link on a Note leaves the Note
 * active and reachable through `listNotesForOwner()`; a Note is not defined by
 * what it is about (ADR-004), and cascading would make Origin able to delete a
 * Note, which is precisely the derivation ADR-010 §2 forbids in the other
 * direction.
 */
export async function retireNoteSource(db, { tenantId, ownerPersonId, sourceLinkId, actorUid }) {
  const docId = noteFoundationDocId(tenantId, requireToken("sourceLinkId", sourceLinkId));
  requireToken("ownerPersonId", ownerPersonId);
  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const snapshot = await transaction.get(TENANT.NOTE_SOURCES, docId);
    if (!snapshot.exists()) throw new Error("Source link does not exist.");
    const link = snapshot.data();
    if (link.tenantId !== tenantId || link.ownerPersonId !== ownerPersonId) {
      throw new Error("Cross-owner or cross-tenant source link refused.");
    }
    if (link.status !== NOTE_STATUS.ACTIVE) throw new Error("Source link is already retired.");
    transaction.update(TENANT.NOTE_SOURCES, docId, { status: NOTE_STATUS.RETIRED });
  });
}

/**
 * MAP Phase 5 (P5-G) — bind an EXISTING, already-created Note to a further
 * permanent Study Unit key, independent of the Note's own creation
 * transaction. `createPermanentNote()` could only ever write one `noteSources`
 * link, at birth; nothing let an already-created Note gain a SECOND active
 * link, whether because it never had one, or because its only link was later
 * retired by `retireNoteSource()`.
 *
 * THE RULES ALREADY AUTHORISE THIS. The accepted Phase 5 candidate's
 * `noteSources` `allow create` names no birth-transaction requirement — any
 * well-formed link naming a Note the requester owns is permitted at any time.
 * This is the same "ask what the accepted Rules authorise, then what the code
 * can perform" method P5-F/P6-D/P6-E already used to close this exact class of
 * gap.
 *
 * SAME WRITE SHAPE AS BIRTH, reused rather than reinvented: identical field
 * set to the `source` block inside `createPermanentNote()`, built through the
 * same `ownership()`/`relationBase()`/`requireToken()` helpers, so both writes
 * are provably the one shape the Rules candidate governs.
 *
 * THE VOCABULARY IS NOT THIS FUNCTION'S TO DECIDE. `sourceKind`,
 * `relationshipKind` and `provenanceKind` are taken from the caller's `source`
 * exactly as `createPermanentNote()` already takes them — validated for
 * non-empty presence only. ADR-009's closed sets are `study-note-binding.js`'s
 * job alone, unchanged and still uninvoked; this function does not import it
 * and does not re-implement its checks a second, driftable way.
 *
 * NEVER TOUCHES THE NOTE, AND NEVER TOUCHES A PLACEMENT. `notes` and
 * `notePlacements` are absent from this function by construction (no
 * `journey-map-contract.js` import, no `TENANT.NOTE_PLACEMENTS` reference) —
 * the same Origin/Destination separation ADR-010 §2 requires elsewhere: a
 * Study source binding (Origin) must never be derived from, or reshape, where
 * a Note is filed (Destination), and vice versa. Note identity — `noteId`,
 * `tenantId`, `ownerPersonId`, `ownerUid`, `title`, `bodyHtml`,
 * `currentRevisionId`, `status` — is immutable through this call: the only
 * write this function ever performs is one `noteSources` create.
 *
 * A RETIRED NOTE REFUSES A NEW BINDING, a data-layer decision stricter than
 * the Rules candidate (which does not itself check the Note's `status` on
 * create — REL-01 checks existence and ownership only). This mirrors
 * `updatePermanentNoteContent()`'s own "Retired Note cannot be edited" rule:
 * gaining a further origin/reference binding is, like a content revision, an
 * action ON the Note that a reader would expect a retired Note to refuse. Not
 * an accepted decision restated — a data-layer choice flagged in this round's
 * own report for confirmation, since the Rules candidate itself is silent.
 *
 * SOURCE-LINK IDS ARE NOT PRE-READ (v08.56): reading a document that does not
 * exist is an evaluation error under the deployed `allow get`, which denied
 * every source link in production. The id is a random UUID. TWO ACTIVE LINKS NAMING THE SAME `sourceKey` ARE NOT REFUSED —
 * nothing in the accepted Rules, ADR-009, or `listNoteSourcesForUnit()`'s own
 * read contract forbids a Note being bound twice to one unit (once `origin`,
 * once later `reference`, for instance), so inventing that constraint here
 * would be a new decision, not an implementation of one already accepted.
 */
export async function createNoteSource(db, {
  tenantId, ownerPersonId, ownerUid = null, noteId, source, sourceLinkId = newNoteEntityId(), actorUid,
}) {
  const owner = ownership({ tenantId, ownerPersonId, ownerUid });
  requireToken("noteId", noteId);
  requireToken("sourceLinkId", sourceLinkId);
  if (!source || typeof source !== "object") throw new TypeError("note-foundation: source is required.");

  const noteDocId = noteFoundationDocId(tenantId, noteId);
  const sourceDocId = noteFoundationDocId(tenantId, sourceLinkId);

  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const noteSnapshot = await transaction.get(TENANT.NOTES, noteDocId);
    if (!noteSnapshot.exists()) throw new Error("Note does not exist.");
    // NO PRE-READ OF `noteSources/{sourceDocId}` (removed v08.56) — the same
    // null-`resource` evaluation error as `createPermanentNote()`; see there.

    const note = noteSnapshot.data();
    if (note.tenantId !== tenantId || note.ownerPersonId !== ownerPersonId) {
      throw new Error("Cross-owner or cross-tenant source binding refused.");
    }
    if (note.status !== NOTE_STATUS.ACTIVE) throw new Error("A retired Note cannot gain a new source binding.");

    transaction.create(TENANT.NOTE_SOURCES, sourceDocId, {
      sourceLinkId,
      ...relationBase(owner, noteId),
      sourceKind: requireToken("sourceKind", source.sourceKind),
      sourceKey: requireToken("sourceKey", source.sourceKey),
      relationshipKind: requireToken("relationshipKind", source.relationshipKind),
      approachId: source.approachId ?? null,
      provenanceKind: requireToken("provenanceKind", source.provenanceKind),
      status: NOTE_STATUS.ACTIVE,
    });
  });
  return sourceLinkId;
}

/**
 * MAP Phase 6 (P6-E) — reorder a Note within its folder, which nothing could do.
 *
 * `placementIdentityUnchanged()` freezes `placementId`, `noteId` and
 * `folderId`, so `order` and `status` are the only fields an update may touch.
 * `retireNotePlacement()` covered `status`. Nothing covered `order` — and the
 * Phase 6 composite index candidate exists FOR IT, ordering a folder's
 * contents by `order`, while `folderContents()`'s own comment promises "in the
 * author's own order". The author had no way to set that order after creation.
 *
 * A MOVE BETWEEN FOLDERS IS STILL `moveNotePlacement()` and still
 * retire-and-create (ADR-010 §5, I4). This changes position WITHIN one folder,
 * where there is no record to preserve: `order` is display only and nothing is
 * keyed by it (I5).
 */
export async function reorderNotePlacement(db, { tenantId, ownerPersonId, placementId, order, actorUid }) {
  const docId = noteFoundationDocId(tenantId, requireToken("placementId", placementId));
  requireToken("ownerPersonId", ownerPersonId);
  if (!Number.isInteger(order)) throw new TypeError("note-foundation: order must be an integer.");
  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const snapshot = await transaction.get(TENANT.NOTE_PLACEMENTS, docId);
    if (!snapshot.exists()) throw new Error("Placement does not exist.");
    const placement = snapshot.data();
    if (placement.tenantId !== tenantId || placement.ownerPersonId !== ownerPersonId) {
      throw new Error("Cross-owner or cross-tenant placement refused.");
    }
    if (placement.status !== NOTE_STATUS.ACTIVE) throw new Error("A retired placement cannot be reordered.");
    transaction.update(TENANT.NOTE_PLACEMENTS, docId, { order });
  });
}

export async function listNotesForOwner(db, { tenantId, ownerPersonId, status = NOTE_STATUS.ACTIVE, maximum = 100 }) {
  const q = query(collection(db, TENANT.NOTES),
    where("tenantId", "==", requireToken("tenantId", tenantId)),
    where("ownerPersonId", "==", requireToken("ownerPersonId", ownerPersonId)),
    where("status", "==", status), orderBy("updatedAt", "desc"), limit(maximum));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

/**
 * Issue #259 -- the deployed Rules' `listIsBounded()` refuses any Note
 * Foundation list request above 100 (v08.58's own finding, the same cap that
 * bit `listNoteFoldersForOwner()`). `listNotesForOwner()` above is unchanged
 * -- callers that only ever wanted "the most recent 100" still get exactly
 * that -- but an owner with MORE than 100 Notes could never see the rest
 * through it, in any view. The fix is paging, never a bigger `limit()`: a
 * bigger number is still refused the moment it exceeds the cap the server
 * itself enforces.
 *
 * SAME QUERY SHAPE AS `listNotesForOwner()`, deliberately: the same
 * `orderBy("updatedAt", "desc")`, so a page of this function is served by the
 * exact same deployed composite index `listNotesForOwner()` already uses --
 * no new index candidate needed.
 */
export async function listNotesForOwnerPage(db, {
  tenantId, ownerPersonId, status = NOTE_STATUS.ACTIVE, pageSize = 100, after = null,
}) {
  requirePageSize(pageSize);
  const q = query(collection(db, TENANT.NOTES),
    where("tenantId", "==", requireToken("tenantId", tenantId)),
    where("ownerPersonId", "==", requireToken("ownerPersonId", ownerPersonId)),
    where("status", "==", status),
    orderBy("updatedAt", "desc"),
    ...(after ? [startAfter(after)] : []),
    limit(pageSize));
  const snapshot = await getDocs(q);
  const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const next = snapshot.docs.length < pageSize ? null : snapshot.docs[snapshot.docs.length - 1];
  return { rows, next };
}

/**
 * Issue #259 -- the placement-side twin of `listNotesForOwnerPage()` above.
 * Each folder showed at most 99 filed Notes (`journey-map-service.js`'s own
 * `MAX_PLACEMENTS_PER_READ`), so the Owner's real folder of 187 Notes was cut
 * off; paging this read is what lets a caller assemble the whole set.
 *
 * DELIBERATELY NO `orderBy` -- equality filters only (tenantId, ownerPersonId,
 * status), exactly `listNotePlacementsForFolder()`'s own reasoning for why it
 * costs no composite index: Firestore serves an equality-only query, plus a
 * `startAfter` cursor on its own implicit document-id ordering, from
 * single-field indexes alone.
 */
export async function listNotePlacementsForOwnerPage(db, {
  tenantId, ownerPersonId, status = NOTE_STATUS.ACTIVE, pageSize = 100, after = null,
}) {
  requirePageSize(pageSize);
  const q = query(collection(db, TENANT.NOTE_PLACEMENTS),
    where("tenantId", "==", requireToken("tenantId", tenantId)),
    where("ownerPersonId", "==", requireToken("ownerPersonId", ownerPersonId)),
    where("status", "==", status),
    ...(after ? [startAfter(after)] : []),
    limit(pageSize));
  const snapshot = await getDocs(q);
  const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const next = snapshot.docs.length < pageSize ? null : snapshot.docs[snapshot.docs.length - 1];
  return { rows, next };
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

/**
 * Issue #265, Architect review -- every source link one person owns, a page
 * at a time. The importer needs "which links already exist?" and must NOT
 * ask it by reading each link's id directly: the deployed `allow get`
 * evaluates `resource.data`, so a get of a link that does not exist yet is
 * DENIED, not empty (the v08.56 lesson), and every first run would stop on
 * the first Note. Equality filters only and no `orderBy`, so it is served by
 * single-field indexes and needs no composite index -- the same reasoning as
 * `listNotePlacementsForOwnerPage()`.
 */
export async function listNoteSourcesForOwnerPage(db, {
  tenantId, ownerPersonId, status = NOTE_STATUS.ACTIVE, pageSize = 100, after = null,
}) {
  requirePageSize(pageSize);
  const q = query(collection(db, TENANT.NOTE_SOURCES),
    where("tenantId", "==", requireToken("tenantId", tenantId)),
    where("ownerPersonId", "==", requireToken("ownerPersonId", ownerPersonId)),
    where("status", "==", status),
    ...(after ? [startAfter(after)] : []),
    limit(pageSize));
  const snapshot = await getDocs(q);
  const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const next = snapshot.docs.length < pageSize ? null : snapshot.docs[snapshot.docs.length - 1];
  return { rows, next };
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
