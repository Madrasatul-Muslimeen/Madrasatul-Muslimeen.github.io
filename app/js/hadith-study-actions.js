// Hadith H2 -- HadeethEnc study actions (issue #311, Owner decision 7,
// docs/governance/2026-09-26-owner-decisions.md row 7).
//
// v08.84 built the HadeethEnc browsing surface but deliberately stopped at
// Gate C2 -- see hadith-browser.js's own header comment on that section for
// the full history. The Owner has now decided C2 FOR HADEETHENC ONLY: a
// HadeethEnc hadith is keyed `hadith:hadeethenc:<id>`, built with
// `buildUnitKey.hadith("hadeethenc", id)`. This file is the ONE caller of
// that shape, and `tools/i18n-verify/hadith-gate-contracts.mjs`'s C2 check
// admits it BY NAME, and only when the first argument is the literal
// "hadeethenc" -- a call naming any other edition here still fails that
// check, because the gate is decided for HadeethEnc, not for Hadith keys in
// general.
//
// EVERY WRITE GOES THROUGH AN EXISTING SHARED FUNCTION -- no new collection,
// no new field, no new Rule: study-note-service.js/note-foundation.js for
// Notes, bookmarks.js for the star, records.js's claimStatus() for the
// module's existing `studied_hadith` trackable (the same claim path
// hadith-study.html/topic-study.js already uses for every other Hadith
// topic).
//
// LOADED LAZILY, ON PURPOSE. hadith-browser.js stays Firebase-free by
// design (see hadith-study.html's own comment on why the corpus mounts from
// its own <script> tag, separate from topic-study.js -- a CDN/Firebase
// failure must never take Collections/Topics/Search/Explore down with it).
// This module is the one place that boundary is deliberately crossed for
// the three study actions, imported with a dynamic `import()` so a failure
// to load it degrades to "not available right now" instead of breaking the
// whole corpus.
import { auth, db } from "./firebase-init.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { getActiveContext, getSelectedPersonId, effectiveRoles } from "./session-context.js";
import { buildUnitKey } from "./unit-keys.js";
import { chunkKeyFor, getRecordsChunk, claimStatus } from "./records.js";
import { getBookmarks, saveBookmark, removeSavedBookmark, findSavedBookmark } from "./bookmarks.js";
import { notesForStudyUnit } from "./study-note-service.js";
import { listEnrollmentsForPerson } from "./course-offers.js";

const HADITH_MODULE_ID = "hadith";
const HADITH_ROOT_SUBJECT_ID = "hadith"; // matches hadith-study.html's own initTopicStudyPage({ rootSubjectId: "hadith" })
const STUDIED_TRACKABLE_ID = "studied_hadith";
const BOOKMARK_SUBJECT_ID = "hadeethenc";

/** The ONE call this repository authorises to build a HadeethEnc key (Owner decision 7). Never call buildUnitKey.hadith() from here with anything but the literal "hadeethenc". */
export function hadeethEncUnitKey(id) {
  return buildUnitKey.hadith("hadeethenc", String(id));
}

/**
 * A conservative client-side mirror of firestore.rules' own canRecordFor():
 * admin (owner/prime/platformAdmin) OR a guardian of this specific child OR
 * a teacher actually co-enrolled with this specific student, in THIS
 * tenant. Self is handled by the caller (getHadeethEncSession() below) --
 * this is only reached for a DIFFERENT selected person. Never throws: any
 * read failure here means "cannot confirm the standing to record for them",
 * which is the safe reading (never invites a write that would only be
 * denied).
 */
async function canRecordForSelected(tenantId, effRoles, myPersonId, selectedPersonId) {
  try {
    if (effRoles.some((r) => r === "owner" || r === "prime" || r === "platformAdmin")) return true;
    if (effRoles.includes("guardian")) {
      const rosterSnap = await getDocs(query(collection(db, TENANT.TENANT_PEOPLE), where("tenantId", "==", tenantId)));
      const person = rosterSnap.docs.map((d) => ({ id: d.id, ...d.data() })).find((p) => p.id === selectedPersonId);
      if (person?.managedByPersonId === myPersonId) return true;
    }
    if (effRoles.includes("teacher") && myPersonId) {
      const [teacherEnrollments, studentEnrollments] = await Promise.all([
        listEnrollmentsForPerson(db, tenantId, myPersonId),
        listEnrollmentsForPerson(db, tenantId, selectedPersonId),
      ]);
      const teacherContextIds = new Set(
        teacherEnrollments.filter((e) => e.roleInClass === "teacher" && e.status === "active").map((e) => e.contextId)
      );
      if (studentEnrollments.some((e) => e.roleInClass === "student" && e.status === "active" && teacherContextIds.has(e.contextId))) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * The session this card needs to act, or `null` when there is none to act
 * with (not signed in, or no tenant/person chosen yet) -- every caller
 * treats `null` as "show why, offer nothing", never as a reason to guess.
 *
 * `isSelf`: only the reader's own record may create/file a Note
 * (isNoteOwner() in firestore.rules is deliberately stricter than
 * canRecordFor() -- a Note is a person's own private writing).
 * `canRecordFor`: the broader set that may bookmark and claim "Studied" for
 * the selected person (mirrors firestore.rules' own canRecordFor()).
 */
export async function getHadeethEncSession() {
  const uid = auth.currentUser?.uid ?? null;
  if (!uid) return null;
  const ctx = getActiveContext();
  if (!ctx?.tenantId) return null;
  const myPersonId = ctx.personId ?? null;
  const personId = getSelectedPersonId() ?? myPersonId;
  if (!personId) return null;
  const isSelf = personId === myPersonId;
  const effRoles = effectiveRoles(ctx.roles ?? [], ctx.viewAsRole ?? null);
  const canRecordFor = isSelf || (await canRecordForSelected(ctx.tenantId, effRoles, myPersonId, personId));
  return { uid, tenantId: ctx.tenantId, personId, isSelf, canRecordFor };
}

// ---------------------------------------------------------------------------
// Note -- a link into notes.html, which already supports `?unit=&label=` and
// already does the actual create/revise/retire work (createStudyNote(),
// study-note-binding.js's accepted hadith key shape). No second editor.
// ---------------------------------------------------------------------------

export function noteHrefFor(id, title) {
  const params = new URLSearchParams({ unit: hadeethEncUnitKey(id) });
  if (title) params.set("label", title);
  return `notes.html?${params.toString()}`;
}

/** How many active Notes the reader already has on this hadith -- read-only, shown only for isSelf (only self can ever create one anyway). */
export async function noteCountFor(session, id) {
  const { rows } = await notesForStudyUnit(db, {
    tenantId: session.tenantId, ownerPersonId: session.personId, unitKey: hadeethEncUnitKey(id),
  });
  return rows.length;
}

// ---------------------------------------------------------------------------
// Bookmark -- the same bookmarks.js an āyah uses. subjectId is a fixed
// "hadeethenc" bucket; `position` (the unit key) is what actually
// distinguishes one hadith's bookmark from another's, the same shape
// topic-study.js's own toggleTopicBookmark() uses (subjectId/position both
// the node's own id there; here position alone carries the identity).
// `position` doubles as the resume value bookmarks.html already builds
// (`${page}?resume=${position}`) -- hadith-study.html's own corpus-mounting
// script reads it back to reopen this exact hadith (issue #311's "the
// bookmark must reopen the Hadith page on this hadith").
// ---------------------------------------------------------------------------

export async function isHadeethEncBookmarked(session, id) {
  const bookmarksDoc = await getBookmarks(db, session.tenantId, session.personId);
  return !!findSavedBookmark(bookmarksDoc, { moduleId: HADITH_MODULE_ID, subjectId: BOOKMARK_SUBJECT_ID, position: hadeethEncUnitKey(id) });
}

/** Toggles the bookmark and returns the new state (true = now bookmarked). */
export async function toggleHadeethEncBookmark(session, id, name) {
  const unitKey = hadeethEncUnitKey(id);
  const bookmarksDoc = await getBookmarks(db, session.tenantId, session.personId);
  const existing = findSavedBookmark(bookmarksDoc, { moduleId: HADITH_MODULE_ID, subjectId: BOOKMARK_SUBJECT_ID, position: unitKey });
  if (existing) {
    await removeSavedBookmark(db, session.tenantId, session.personId, existing.id);
    return false;
  }
  await saveBookmark(db, {
    tenantId: session.tenantId, personId: session.personId, moduleId: HADITH_MODULE_ID,
    subjectId: BOOKMARK_SUBJECT_ID, name, position: unitKey, uid: session.uid,
  });
  return true;
}

// ---------------------------------------------------------------------------
// Studied -- the module's existing `studied_hadith` trackable, via the same
// claim path hadith-study.html/topic-study.js uses: claimStatus() against
// subjectId "hadith" (the module's root subject, exactly what
// initTopicStudyPage({ rootSubjectId: "hadith" }) chunks every other Hadith
// topic claim under -- chunkKeyFor() only ever looks at the subjectId
// argument for a unit type outside SURAH_CHUNKED_TYPES, so this lands in
// the SAME `subject_hadith` records chunk, not a new one).
// ---------------------------------------------------------------------------

export async function hadeethEncStudiedStatus(session, id) {
  const unitKey = hadeethEncUnitKey(id);
  const chunkKey = chunkKeyFor(unitKey, HADITH_ROOT_SUBJECT_ID);
  const chunk = await getRecordsChunk(db, session.tenantId, session.personId, chunkKey);
  const entry = chunk?.entries?.[`${unitKey}::${STUDIED_TRACKABLE_ID}`] ?? null;
  return entry?.claimedStatus ?? null;
}

export async function claimHadeethEncStudied(session, id, statusId) {
  const unitKey = hadeethEncUnitKey(id);
  return claimStatus(db, {
    tenantId: session.tenantId, personId: session.personId, subjectId: HADITH_ROOT_SUBJECT_ID,
    unitKey, trackableId: STUDIED_TRACKABLE_ID, statusId, notes: "", domainIds: [],
    claimedByPersonId: session.personId, claimedByUid: session.uid,
  });
}
