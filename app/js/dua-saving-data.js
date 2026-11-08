// The Dua module's saving layer (PCF MSA J104, round R6, 9 Nov 2026). The Rules are PUBLISHED (firestore.rules, the
// Owner's tick of 9 Nov 2026), three collections:
//   duaPlans/{tenantId}__{personId}   D10 the memorising-plan marks, ONE document per person:
//       marks { [duaKey]: "today" | "next" | "urgent" | "revising" | "memorised" }, important [duaKey, ...]  (★ Important)
//       Read and written by exactly canRecordFor(): the person, their guardian, a co-enrolled teacher, an owner/prime.
//   duaEdits/{tenantId}__{duaKey}     D03 add / move / several groups / hide, and D05 titles (I11), ONE document per dua the
//       madrasah has changed or added. "Delete" is HIDE (hidden: true, undoable). Owner and Prime write; every member reads.
//   duaShares/{autoId}                D15 one record per share, append-only. Any member records; Owner and Prime read.
// Nothing here runs at start-up (I9): every read happens when its screen is first opened. No function deletes (I4, D6):
// clearing a mark writes the map without it, hiding a dua writes hidden: true. Every write goes through envelope.js inside
// safeWrite() (I15: a failed save reaches the user, and the function returns `{ ok: false, entry }`); every document
// carries schemaVersion, createdAt, updatedAt and createdBy (I17), stamped by the envelope.
//
// Every function takes `ctx = { tenantId, personId, uid }`. A set*/save*/record* function returns `{ ok: true, ... }`,
// `{ ok: false, refused }` when the request itself is wrong (nothing read or written), or `{ ok: false, entry }` when the
// save failed (already reported to the user). Rules cannot inspect each key of a map or each element of a list, so the
// checks on marks, placements and titles are made HERE, within the sizes the Rules cap.
//
// NOT WIRED to any page in this round (R6 builds the writers and the Rules-parity guard; the screens that call them follow,
// one PR each): tools/i18n-verify/dua-saving-data.mjs pins that, and rules-authorisation-executable.mjs compares every
// field below with the published blocks, both ways.

import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";
import { safeWrite } from "./errors.js";

/** Every field this module can ever put on a duaPlans document (the published Rules must allow all of them). */
export const DUA_PLAN_WRITES = Object.freeze(["tenantId", "personId", "marks", "important"]);
/** Every field this module can ever put on a duaEdits document. */
export const DUA_EDIT_WRITES = Object.freeze(["tenantId", "duaKey", "title", "placements", "hidden", "added"]);
/** Every field this module can ever put on a duaShares document. */
export const DUA_SHARE_WRITES = Object.freeze(["tenantId", "duaKey", "where", "whoFor", "occasion", "sharedAt"]);

/** D10's marks, in the Owner's order. Each has its own colour on the card (not decided here). */
export const DUA_MARKS = Object.freeze(["today", "next", "urgent", "revising", "memorised"]);
export const DUA_SHARE_WHERE = Object.freeze(["whatsapp", "facebook", "email", "print", "masjidBoard", "other"]);
export const DUA_SHARE_WHO_FOR = Object.freeze(["family", "students", "teachers", "masjidCommunity", "public", "other"]);

const MAX_MARKS = 5000, MAX_PLACEMENTS = 50, MAX_ADDED = 20, MAX_TITLE = 300, MAX_OCCASION = 300;
const DUA_KEY = /^([0-9]{1,6}|new-[A-Za-z0-9_-]{6,40})$/;
export const isDuaKey = (k) => typeof k === "string" && DUA_KEY.test(k);
const isNewKey = (k) => typeof k === "string" && k.startsWith("new-");
const validId = (s) => typeof s === "string" && s.length > 0 && !s.includes("__") && !s.includes("/");

function requireCtx(ctx) {
  if (!ctx || !ctx.tenantId || !ctx.personId || !ctx.uid) throw new Error("dua-saving-data: ctx must carry tenantId, personId and uid.");
}

// --- D10: the memorising plan -----------------------------------------------------------------------------------------

const planId = (ctx, personId) => `${ctx.tenantId}__${personId}`;

async function readPlan(db, ctx, personId) {
  const snap = await getDoc(doc(db, TENANT.DUA_PLANS, planId(ctx, personId)));
  if (!snap.exists()) return { exists: false, marks: {}, important: [] };
  const d = snap.data();
  return { exists: true, marks: { ...(d.marks || {}) }, important: Array.isArray(d.important) ? [...d.important] : [] };
}

/** One person's plan: `{ marks, important }` ({} and [] when nothing is marked yet). One read; the Rules decide who may. */
export async function loadDuaPlan(db, ctx, personId = ctx?.personId) {
  requireCtx(ctx);
  if (!validId(personId)) throw new Error("dua-saving-data: personId must be a person's id.");
  const { marks, important } = await readPlan(db, ctx, personId);
  return { marks, important };
}

/**
 * Sets (or, with mark null, clears) one dua's memorising mark for a person. The map is written WITHOUT the key when cleared:
 * the document is never deleted (I4, D6). Returns `{ ok: true, marks }` (the person's marks now).
 */
export async function setDuaMark(db, ctx, { personId = ctx?.personId, duaKey, mark } = {}) {
  requireCtx(ctx);
  if (!validId(personId)) return { ok: false, refused: "bad-person" };
  if (!isDuaKey(duaKey)) return { ok: false, refused: "bad-dua" };
  if (mark !== null && !DUA_MARKS.includes(mark)) return { ok: false, refused: "unknown-mark" };
  let marks = {};
  const res = await safeWrite(async () => {
    const cur = await readPlan(db, ctx, personId);
    marks = { ...cur.marks };
    if (mark === null) delete marks[duaKey]; else marks[duaKey] = mark;
    if (!cur.exists && mark === null) return; // nothing marked, nothing to clear: no document is made just to hold an empty map
    if (Object.keys(marks).length > MAX_MARKS) throw new Error("dua-saving-data: too many marks.");
    const id = planId(ctx, personId);
    if (cur.exists) await updateDocument(db, TENANT.DUA_PLANS, id, { marks });
    else await createDocument(db, TENANT.DUA_PLANS, id, { tenantId: ctx.tenantId, personId, marks, important: [] }, ctx.uid);
  }, { collection: TENANT.DUA_PLANS, docId: planId(ctx, personId), action: "set dua mark" });
  return res.ok ? { ok: true, marks } : res;
}

/** Switches ★ Important on or off for one dua. Returns `{ ok: true, important }`. */
export async function setDuaImportant(db, ctx, { personId = ctx?.personId, duaKey, on } = {}) {
  requireCtx(ctx);
  if (!validId(personId)) return { ok: false, refused: "bad-person" };
  if (!isDuaKey(duaKey)) return { ok: false, refused: "bad-dua" };
  let important = [];
  const res = await safeWrite(async () => {
    const cur = await readPlan(db, ctx, personId);
    important = on ? (cur.important.includes(duaKey) ? cur.important : [...cur.important, duaKey]) : cur.important.filter((k) => k !== duaKey);
    if (!cur.exists && !on) return;
    if (important.length > MAX_MARKS) throw new Error("dua-saving-data: too many important duas.");
    const id = planId(ctx, personId);
    if (cur.exists) await updateDocument(db, TENANT.DUA_PLANS, id, { important });
    else await createDocument(db, TENANT.DUA_PLANS, id, { tenantId: ctx.tenantId, personId, marks: {}, important }, ctx.uid);
  }, { collection: TENANT.DUA_PLANS, docId: planId(ctx, personId), action: "set dua important" });
  return res.ok ? { ok: true, important } : res;
}

// --- D03 / D05: the madrasah's edits ----------------------------------------------------------------------------------

const editId = (ctx, duaKey) => `${ctx.tenantId}__${duaKey}`;

/** A fresh key for a dua the madrasah ADDS ("new-" + 10 characters the Rules accept). */
export function newDuaKey(random = Math.random) {
  const abc = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += abc[Math.floor(random() * abc.length)];
  return `new-${s}`;
}

/** Pure: a title { en?, bn? }, each at most 300 characters, or null when it is not one. */
export function cleanTitle(t) {
  if (!t || typeof t !== "object" || Array.isArray(t)) return null;
  const out = {};
  for (const k of Object.keys(t)) {
    if (k !== "en" && k !== "bn") return null;
    if (typeof t[k] !== "string" || t[k].length > MAX_TITLE) return null;
    if (t[k].trim()) out[k] = t[k];
  }
  return out;
}

/** Pure: a placements list (at most 50) of { group, part?, order }, or null when it is not one. */
export function cleanPlacements(list) {
  if (!Array.isArray(list) || list.length > MAX_PLACEMENTS) return null;
  const out = [];
  for (const p of list) {
    if (!p || typeof p !== "object" || typeof p.group !== "string" || !p.group || !Number.isFinite(p.order)) return null;
    if (p.part != null && typeof p.part !== "string") return null;
    out.push(p.part != null ? { group: p.group, part: p.part, order: p.order } : { group: p.group, order: p.order });
  }
  return out;
}

/** Every edit the madrasah has made: an array of edit documents' data. One list read (tenantId equality, no index). */
export async function loadDuaEdits(db, ctx) {
  requireCtx(ctx);
  const snap = await getDocs(query(collection(db, TENANT.DUA_EDITS), where("tenantId", "==", ctx.tenantId)));
  return snap.docs.map((d) => d.data());
}

/**
 * Saves what the madrasah has done to ONE dua: `title` (D05, English/Bangla), `placements` (D03, any number of groups) and
 * `hidden` (D03, "delete" = hide). Fields not given keep their value; a dua not edited before gets a new document. `added`
 * (the dua's own text) is accepted ONLY with a "new-" key. Owner and Prime only (the Rules decide).
 */
export async function saveDuaEdit(db, ctx, { duaKey, title, placements, hidden, added } = {}) {
  requireCtx(ctx);
  if (!isDuaKey(duaKey)) return { ok: false, refused: "bad-dua" };
  const t = title === undefined ? undefined : cleanTitle(title);
  if (t === null) return { ok: false, refused: "bad-title" };
  const pl = placements === undefined ? undefined : cleanPlacements(placements);
  if (pl === null) return { ok: false, refused: "bad-placements" };
  if (hidden !== undefined && typeof hidden !== "boolean") return { ok: false, refused: "bad-hidden" };
  if (added !== undefined) {
    if (!isNewKey(duaKey)) return { ok: false, refused: "added-only-on-new" };
    if (!added || typeof added !== "object" || Array.isArray(added) || Object.keys(added).length > MAX_ADDED) return { ok: false, refused: "bad-added" };
  }
  const id = editId(ctx, duaKey);
  let saved = null;
  const res = await safeWrite(async () => {
    const snap = await getDoc(doc(db, TENANT.DUA_EDITS, id));
    if (snap.exists()) {
      const patch = {};
      if (t !== undefined) patch.title = t;
      if (pl !== undefined) patch.placements = pl;
      if (hidden !== undefined) patch.hidden = hidden;
      if (added !== undefined) patch.added = added;
      if (Object.keys(patch).length) await updateDocument(db, TENANT.DUA_EDITS, id, patch);
      saved = { ...snap.data(), ...patch };
    } else {
      const data = { tenantId: ctx.tenantId, duaKey, title: t ?? {}, placements: pl ?? [], hidden: hidden ?? false };
      if (isNewKey(duaKey)) data.added = added ?? {}; // a new dua carries its text; the Rules require `added` exactly there
      await createDocument(db, TENANT.DUA_EDITS, id, data, ctx.uid);
      saved = data;
    }
  }, { collection: TENANT.DUA_EDITS, docId: id, action: "save dua edit" });
  return res.ok ? { ok: true, edit: saved } : res;
}

/** Hides (D03 "delete") or brings back a dua. Never deletes. */
export function setDuaHidden(db, ctx, { duaKey, hidden } = {}) {
  if (typeof hidden !== "boolean") return Promise.resolve({ ok: false, refused: "bad-hidden" });
  return saveDuaEdit(db, ctx, { duaKey, hidden });
}

// --- D15: the share record --------------------------------------------------------------------------------------------

/** Records one share (append-only). Any member of the madrasah may; only Owner and Prime can read them back. */
export async function recordDuaShare(db, ctx, { duaKey, where: via, whoFor, occasion = "", sharedAt = new Date() } = {}) {
  requireCtx(ctx);
  if (!isDuaKey(duaKey)) return { ok: false, refused: "bad-dua" };
  if (!DUA_SHARE_WHERE.includes(via)) return { ok: false, refused: "bad-where" };
  if (!DUA_SHARE_WHO_FOR.includes(whoFor)) return { ok: false, refused: "bad-who-for" };
  if (typeof occasion !== "string" || occasion.length > MAX_OCCASION) return { ok: false, refused: "bad-occasion" };
  if (!(sharedAt instanceof Date) || Number.isNaN(sharedAt.getTime())) return { ok: false, refused: "bad-date" };
  const id = doc(collection(db, TENANT.DUA_SHARES)).id; // an auto id: a record is never overwritten
  const res = await safeWrite(
    () => createDocument(db, TENANT.DUA_SHARES, id, { tenantId: ctx.tenantId, duaKey, where: via, whoFor, occasion, sharedAt }, ctx.uid),
    { collection: TENANT.DUA_SHARES, docId: id, action: "record dua share" });
  return res.ok ? { ok: true, id } : res;
}

/** The share records of this madrasah (D15 "Seen by Owner and Prime only": the Rules refuse anyone else). */
export async function loadDuaShares(db, ctx) {
  requireCtx(ctx);
  const snap = await getDocs(query(collection(db, TENANT.DUA_SHARES), where("tenantId", "==", ctx.tenantId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
