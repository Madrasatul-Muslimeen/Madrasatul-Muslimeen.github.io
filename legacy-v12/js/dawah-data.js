// MAP v4 Phase 7 (P7-A) — the Dawah printable-page data layer, for the one
// new collection `dawahPages`. Deliberately UNINVOKED: no page imports this
// module yet (a boundary suite asserts that), and `dawahPages` has no
// deployed Rule, so every write here would be denied in production — I15
// requires that denial to reach the reader rather than be swallowed, which is
// a future screen's job (P7-B), not this module's.
//
// ADR-005 (accepted, pre-existing): a Dawah piece is derived output and must
// never overwrite its source Note. THIS MODULE DOES NOT IMPORT
// `note-foundation.js` AT ALL — not its write functions, not its read
// functions, not even its id helpers — which is the simplest and strongest
// way to keep that claim true regardless of what note-foundation.js exports
// next. Where this module needs to read a Note, a revision, or a source
// binding, it reads those collections directly, read-only, through its own
// tiny local helpers below.
//
// Every write goes through envelope.js (I17).

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { runEnvelopeTransaction } from "./envelope.js";
import {
  DAWAH_STATUS,
  canShareDirectly,
  dawahTransition,
  isValidDawahApprover,
} from "./dawah-contract.js";

function requireToken(name, value) {
  if (typeof value !== "string" || !value.trim() || value.includes("/")) {
    throw new TypeError(`dawah-data: ${name} must be a non-empty path-safe string.`);
  }
  return value;
}

function requireText(name, value) {
  if (typeof value !== "string") throw new TypeError(`dawah-data: ${name} must be a string.`);
  return value;
}

export function newDawahPageId() {
  return crypto.randomUUID().replaceAll("-", "");
}

export function dawahPageDocId(tenantId, pageId) {
  requireToken("tenantId", tenantId);
  requireToken("pageId", pageId);
  return `${tenantId}__${pageId}`;
}

/** Read-only doc id for a `notes`/`noteRevisions` row -- same `tenantId__id` shape note-foundation.js uses, reproduced here rather than imported (see the header comment above). */
function relatedDocId(tenantId, id) {
  return `${tenantId}__${id}`;
}

/**
 * The permanent Study Unit key the source Note is bound to, or `null` when it
 * has none — ADR-009 binding is optional. Reads `noteSources` directly:
 * equality-only on `tenantId`/`ownerPersonId`/`noteId`/`status`, bounded, no
 * `orderBy` and so no composite index. When a Note carries more than one
 * active binding, whichever comes back first is taken — bounded and
 * documented rather than sorted, since sorting would need an index this round
 * does not add.
 */
async function firstActiveSourceKeyForNote(db, { tenantId, ownerPersonId, noteId }) {
  const q = query(
    collection(db, TENANT.NOTE_SOURCES),
    where("tenantId", "==", tenantId),
    where("ownerPersonId", "==", ownerPersonId),
    where("noteId", "==", noteId),
    where("status", "==", "active"),
    limit(5),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data().sourceKey ?? null;
}

/**
 * Every fact `isValidDawahApprover()` needs about one (author, approver)
 * pair, read from existing data — nothing invented. `managingGuardianPersonId`
 * comes from `tenantPeople.managedByPersonId` (the field `app/js/people.js`
 * already writes); `isCoEnrolledTeacher` from the same `teacherStudentLinks`
 * mirror the deployed Rules already use (`isCoEnrolledTeacherOf()`);
 * `isOwnerOrPrime` from the two membership documents an owner/prime role
 * would hold, the same per-role `get()` shape `people.js`'s own
 * `getRosterRoles()` already uses instead of a list query.
 */
async function resolveApproverContext(db, { tenantId, authorPersonId, approverPersonId }) {
  const authorSnapshot = await getDoc(doc(db, TENANT.TENANT_PEOPLE, authorPersonId));
  const managingGuardianPersonId = authorSnapshot.exists()
    ? (authorSnapshot.data().managedByPersonId ?? null)
    : null;

  const linkSnapshot = await getDoc(
    doc(db, TENANT.TEACHER_STUDENT_LINKS, `${tenantId}__${approverPersonId}__${authorPersonId}`),
  );
  const isCoEnrolledTeacher = linkSnapshot.exists() && linkSnapshot.data().active === true;

  const isActiveMembership = (snap) => snap.exists() && snap.data().status !== "archived";
  const ownerSnapshot = await getDoc(doc(db, TENANT.MEMBERSHIPS, `${tenantId}__${approverPersonId}__owner`));
  const primeSnapshot = await getDoc(doc(db, TENANT.MEMBERSHIPS, `${tenantId}__${approverPersonId}__prime`));

  return {
    managingGuardianPersonId,
    isCoEnrolledTeacher,
    isOwnerOrPrime: isActiveMembership(ownerSnapshot) || isActiveMembership(primeSnapshot),
  };
}

async function requireValidApprover(db, { tenantId, authorPersonId, approverPersonId }) {
  const context = await resolveApproverContext(db, { tenantId, authorPersonId, approverPersonId });
  if (!isValidDawahApprover({ authorPersonId, approverPersonId, ...context })) {
    throw new Error("This person is not a valid approver for this Dawah page.");
  }
}

/**
 * Whether `authorPersonId`'s own next Dawah page would need approval before
 * it can be shared — a convenience so a future caller need not re-read
 * `tenantPeople` and re-derive ADR-011 §3 itself.
 */
export async function authorNeedsDawahApproval(db, { tenantId, authorPersonId } = {}) {
  requireToken("tenantId", tenantId);
  requireToken("authorPersonId", authorPersonId);
  const snapshot = await getDoc(doc(db, TENANT.TENANT_PEOPLE, authorPersonId));
  if (!snapshot.exists()) throw new Error("Dawah page author does not exist.");
  return snapshot.data().isMinor === true;
}

/**
 * Creates a Dawah page from a pinned Note revision. Returns
 * `{ pageId, pageDocId }`.
 *
 * THE FROZEN COPY IS THE REVISION'S OWN CONTENT, never re-read from the
 * (possibly since-edited) Note — this is ADR-005 as data: once this page
 * exists, it never looks at the Note again, so a later edit to the Note can
 * never reach it. `sourceRevisionId` is the caller's own pinned choice
 * (typically the Note's `currentRevisionId` at this instant); this function
 * only verifies it names a real revision of that Note, owned by this author,
 * in this tenant.
 *
 * `sourceUnitKey` is read BEFORE the transaction opens, the same reason
 * `createNoteFolder()` reads the person's folders first: a Firestore
 * transaction cannot run a `where()` query. It is a snapshot taken at this
 * instant, exactly like the title/bodyHtml snapshot below.
 */
export async function createDawahPage(db, {
  tenantId, authorPersonId, sourceNoteId, sourceRevisionId, pageId = newDawahPageId(), actorUid,
} = {}) {
  requireToken("tenantId", tenantId);
  requireToken("authorPersonId", authorPersonId);
  requireToken("sourceNoteId", sourceNoteId);
  requireToken("sourceRevisionId", sourceRevisionId);
  requireToken("pageId", pageId);
  requireToken("actorUid", actorUid);

  const sourceUnitKey = await firstActiveSourceKeyForNote(db, {
    tenantId, ownerPersonId: authorPersonId, noteId: sourceNoteId,
  });
  const pageDocId = dawahPageDocId(tenantId, pageId);

  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const noteSnapshot = await transaction.get(TENANT.NOTES, relatedDocId(tenantId, sourceNoteId));
    if (!noteSnapshot.exists()) throw new Error("Source Note does not exist.");
    const note = noteSnapshot.data();
    if (note.tenantId !== tenantId || note.ownerPersonId !== authorPersonId) {
      throw new Error("Cross-owner or cross-tenant Dawah page refused.");
    }

    const revisionSnapshot = await transaction.get(TENANT.NOTE_REVISIONS, relatedDocId(tenantId, sourceRevisionId));
    if (!revisionSnapshot.exists()) throw new Error("Source revision does not exist.");
    const revision = revisionSnapshot.data();
    if (revision.noteId !== sourceNoteId || revision.tenantId !== tenantId || revision.ownerPersonId !== authorPersonId) {
      throw new Error("Source revision does not belong to that Note and owner.");
    }

    const existing = await transaction.get(TENANT.DAWAH_PAGES, pageDocId);
    if (existing.exists()) throw new Error("Dawah page ID already exists.");

    transaction.create(TENANT.DAWAH_PAGES, pageDocId, {
      pageId,
      tenantId,
      authorPersonId,
      sourceNoteId,
      sourceRevisionId,
      title: requireText("revision.title", revision.title),
      bodyHtml: requireText("revision.bodyHtml", revision.bodyHtml),
      sourceUnitKey,
      status: DAWAH_STATUS.DRAFT,
      approvedByPersonId: null,
      approvedAt: null,
      returnedNote: null,
    });
  });

  return { pageId, pageDocId };
}

/** A child's own action: draft -> awaiting-approval. */
export async function submitDawahPageForApproval(db, { tenantId, pageId, actorUid } = {}) {
  requireToken("tenantId", tenantId);
  requireToken("pageId", pageId);
  requireToken("actorUid", actorUid);
  const pageDocId = dawahPageDocId(tenantId, pageId);

  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const snapshot = await transaction.get(TENANT.DAWAH_PAGES, pageDocId);
    if (!snapshot.exists()) throw new Error("Dawah page does not exist.");
    const next = dawahTransition("submit", snapshot.data().status);
    if (!next) throw new Error(`Cannot submit a Dawah page from status "${snapshot.data().status}".`);
    transaction.update(TENANT.DAWAH_PAGES, pageDocId, { status: next });
  });
}

/**
 * The approver's action: awaiting-approval -> shared. Eligibility is checked
 * twice, deliberately: once BEFORE the transaction (so an ineligible caller
 * fails fast without a transaction retry loop), and once more inside the
 * transaction against a freshly re-read status (so a page that moved between
 * the pre-check and the write — e.g. was returned in the meantime — is
 * refused rather than approved against a stale assumption).
 */
export async function approveDawahPage(db, { tenantId, pageId, approverPersonId, actorUid } = {}) {
  requireToken("tenantId", tenantId);
  requireToken("pageId", pageId);
  requireToken("approverPersonId", approverPersonId);
  requireToken("actorUid", actorUid);
  const pageDocId = dawahPageDocId(tenantId, pageId);

  const pageSnapshot = await getDoc(doc(db, TENANT.DAWAH_PAGES, pageDocId));
  if (!pageSnapshot.exists()) throw new Error("Dawah page does not exist.");
  const page = pageSnapshot.data();
  const next = dawahTransition("approve", page.status);
  if (!next) throw new Error(`Cannot approve a Dawah page from status "${page.status}".`);
  await requireValidApprover(db, { tenantId, authorPersonId: page.authorPersonId, approverPersonId });

  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const snapshot = await transaction.get(TENANT.DAWAH_PAGES, pageDocId);
    if (!snapshot.exists()) throw new Error("Dawah page does not exist.");
    if (dawahTransition("approve", snapshot.data().status) !== next) {
      throw new Error(`Cannot approve a Dawah page from status "${snapshot.data().status}".`);
    }
    transaction.update(TENANT.DAWAH_PAGES, pageDocId, {
      status: next, approvedByPersonId: approverPersonId, approvedAt: serverTimestamp(),
    });
  });
}

/** The approver's action: awaiting-approval -> draft, with a reason (`returnedNote`). Same double-check shape as approveDawahPage(). */
export async function returnDawahPageToDraft(db, {
  tenantId, pageId, approverPersonId, returnedNote, actorUid,
} = {}) {
  requireToken("tenantId", tenantId);
  requireToken("pageId", pageId);
  requireToken("approverPersonId", approverPersonId);
  requireToken("actorUid", actorUid);
  requireText("returnedNote", returnedNote);
  if (returnedNote.trim() === "") {
    throw new TypeError("dawah-data: returnedNote must explain why the page was returned.");
  }
  const pageDocId = dawahPageDocId(tenantId, pageId);

  const pageSnapshot = await getDoc(doc(db, TENANT.DAWAH_PAGES, pageDocId));
  if (!pageSnapshot.exists()) throw new Error("Dawah page does not exist.");
  const page = pageSnapshot.data();
  const next = dawahTransition("return", page.status);
  if (!next) throw new Error(`Cannot return a Dawah page from status "${page.status}".`);
  await requireValidApprover(db, { tenantId, authorPersonId: page.authorPersonId, approverPersonId });

  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const snapshot = await transaction.get(TENANT.DAWAH_PAGES, pageDocId);
    if (!snapshot.exists()) throw new Error("Dawah page does not exist.");
    if (dawahTransition("return", snapshot.data().status) !== next) {
      throw new Error(`Cannot return a Dawah page from status "${snapshot.data().status}".`);
    }
    transaction.update(TENANT.DAWAH_PAGES, pageDocId, { status: next, returnedNote });
  });
}

/**
 * An adult's own action: draft -> shared directly. Refused, before any write
 * is attempted, when the author is a minor (ADR-011 §3) — a child's piece
 * always needs `approveDawahPage()` instead, never this function.
 */
export async function shareDawahPage(db, { tenantId, pageId, actorUid } = {}) {
  requireToken("tenantId", tenantId);
  requireToken("pageId", pageId);
  requireToken("actorUid", actorUid);
  const pageDocId = dawahPageDocId(tenantId, pageId);

  const pageSnapshot = await getDoc(doc(db, TENANT.DAWAH_PAGES, pageDocId));
  if (!pageSnapshot.exists()) throw new Error("Dawah page does not exist.");
  const page = pageSnapshot.data();
  const next = dawahTransition("share", page.status);
  if (!next) throw new Error(`Cannot share a Dawah page from status "${page.status}".`);

  const authorSnapshot = await getDoc(doc(db, TENANT.TENANT_PEOPLE, page.authorPersonId));
  if (!authorSnapshot.exists()) throw new Error("Dawah page author no longer exists.");
  if (!canShareDirectly({ authorIsMinor: authorSnapshot.data().isMinor === true })) {
    throw new Error("A child's Dawah page needs approval before it can be shared.");
  }

  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const snapshot = await transaction.get(TENANT.DAWAH_PAGES, pageDocId);
    if (!snapshot.exists()) throw new Error("Dawah page does not exist.");
    if (dawahTransition("share", snapshot.data().status) !== next) {
      throw new Error(`Cannot share a Dawah page from status "${snapshot.data().status}".`);
    }
    transaction.update(TENANT.DAWAH_PAGES, pageDocId, { status: next });
  });
}

/** I4: retire, never delete. Reachable from any non-retired status. */
export async function retireDawahPage(db, { tenantId, pageId, actorUid } = {}) {
  requireToken("tenantId", tenantId);
  requireToken("pageId", pageId);
  requireToken("actorUid", actorUid);
  const pageDocId = dawahPageDocId(tenantId, pageId);

  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const snapshot = await transaction.get(TENANT.DAWAH_PAGES, pageDocId);
    if (!snapshot.exists()) throw new Error("Dawah page does not exist.");
    const next = dawahTransition("retire", snapshot.data().status);
    if (!next) throw new Error("Dawah page is already retired.");
    transaction.update(TENANT.DAWAH_PAGES, pageDocId, { status: next });
  });
}

/** Every page shared tenant-wide (decision 1: visible inside the Madrasah only). Equality-only, bounded, no orderBy — no composite index needed. */
export async function listSharedDawahPages(db, { tenantId, maximum = 100 } = {}) {
  requireToken("tenantId", tenantId);
  const q = query(
    collection(db, TENANT.DAWAH_PAGES),
    where("tenantId", "==", tenantId),
    where("status", "==", DAWAH_STATUS.SHARED),
    limit(maximum),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

/** Every Dawah page this person has authored, at any status (I4 — a retired one is kept, not hidden). */
export async function listOwnDawahPages(db, { tenantId, authorPersonId, maximum = 100 } = {}) {
  requireToken("tenantId", tenantId);
  requireToken("authorPersonId", authorPersonId);
  const q = query(
    collection(db, TENANT.DAWAH_PAGES),
    where("tenantId", "==", tenantId),
    where("authorPersonId", "==", authorPersonId),
    limit(maximum),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

/**
 * Every page awaiting `approverPersonId`'s own decision.
 *
 * A Firestore query cannot ask "am I a valid approver for this document's
 * author" — the same "a rule (or a query) cannot inspect a dynamic
 * relationship" limitation this codebase already accepts for subjects,
 * trackables and records entries. So the tenant's `awaiting-approval` pages
 * are read first (equality-only, bounded, no new index), then judged one by
 * one against `isValidDawahApprover()` — the identical eligibility rule the
 * write path and the Rules candidate both enforce, so a person only ever
 * sees a page they could actually act on.
 */
export async function listDawahPagesAwaitingMyApproval(db, { tenantId, approverPersonId, maximum = 100 } = {}) {
  requireToken("tenantId", tenantId);
  requireToken("approverPersonId", approverPersonId);
  const q = query(
    collection(db, TENANT.DAWAH_PAGES),
    where("tenantId", "==", tenantId),
    where("status", "==", DAWAH_STATUS.AWAITING_APPROVAL),
    limit(maximum),
  );
  const snapshot = await getDocs(q);
  const candidates = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

  const out = [];
  for (const page of candidates) {
    const context = await resolveApproverContext(db, {
      tenantId, authorPersonId: page.authorPersonId, approverPersonId,
    });
    if (isValidDawahApprover({ authorPersonId: page.authorPersonId, approverPersonId, ...context })) {
      out.push(page);
    }
  }
  return out;
}
