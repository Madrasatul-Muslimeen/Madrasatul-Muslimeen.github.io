// Zab -- the family's saving layer (PCF J25, Builder round Z1, 14 Oct 2026).
//
// ONE shared family Zab per tenant (Owner answer 3 B): pockets and the items
// inside them are tenant-shared documents, `zabPockets/{tenantId}__{pocketId}`
// and `zabItems/{tenantId}__{itemId}`, one document per record. The field names
// are Siyagah's (guide G05: "How Zab is built"), kept exactly so data can move
// between the two apps -- notably `ztype` for a pocket's type (never `kind`),
// while `kind` on an ITEM is its Note Type.
//
// Z2: THIS MODULE IS IMPORTED ONLY BY zab-bar.js, which sw-register.js loads only
// when zab-readiness.js says ready. The Rules it needs are a CANDIDATE only (docs/governance/2026-10-14-zab-candidate.rules), not
// published. Nothing here runs at start-up (I9): every read happens only when
// a function below is called. Nothing is ever deleted (I4, D6): trashing sets
// `status: "trashed"` and `deletedAt`; restoring reverses it.
//
// Every function takes `ctx = { tenantId, personId, uid }` -- who is writing,
// for which Madrasah. Every write goes through envelope.js (which stamps
// `updatedAt`, I17) inside safeWrite() (I15: a failed save reaches the user).
// A write returns `{ ok: true, ... }`, or `{ ok: false, entry }` when the
// save failed, or `{ ok: false, refused }` when the request itself was
// refused (a move into a descendant, trashing a pocket that is not empty).

import { collection, query, where, getDocs, doc, deleteField, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument, commitEnvelopeBatch } from "./envelope.js";
import { safeWrite } from "./errors.js";

export const ZTYPES = Object.freeze(["plain", "links", "tasks", "ideas", "shop"]);

/** Every field this module can ever put on a pocket document (the Rules candidate must allow all of them). */
export const ZAB_POCKET_WRITES = Object.freeze([
  "pocketId", "tenantId", "addedByPersonId", "status", "deletedAt", "order",
  "name", "icon", "color", "ztype", "parentId", "names",
]);
/** Every field this module can ever put on an item document. */
export const ZAB_ITEM_WRITES = Object.freeze([
  "itemId", "tenantId", "pocketId", "addedByPersonId", "status", "deletedAt", "order",
  "text", "done", "folderIds", "tags", "kind", "journal",
  "url", "ttl", "ch", "th", "people", "issues",
  "due", "pri", "steps", "stars", "topics", "qty", "shop", "noteId",
]);

// The fields a caller may set on a pocket / item (allow-listed; everything else is dropped).
const POCKET_EDITABLE = ["name", "icon", "color", "ztype", "order"];
const ITEM_KIND_FIELDS = ["folderIds", "tags", "kind", "journal", "url", "ttl", "ch", "th", "people", "issues", "due", "pri", "steps", "stars", "topics", "qty", "shop"];
const ITEM_EDITABLE = ["text", "order", ...ITEM_KIND_FIELDS]; // `order` so the bar can reorder (Z2)
const ARRAY_FIELDS = new Set(["folderIds", "tags", "people", "issues", "steps", "topics"]);

/** The four seeded study pockets (Owner answer 4 B). Fixed ids, so a second device cannot make a second set. */
export const SEED_POCKETS = Object.freeze([
  { pocketId: "zp-memorise", names: { en: "To memorise", bn: "মুখস্থ করতে হবে" }, icon: "🧠", color: "#2f7d5b" },
  { pocketId: "zp-revise", names: { en: "To revise", bn: "পুনরাবৃত্তি করতে হবে" }, icon: "🔁", color: "#2b6cb0" },
  { pocketId: "zp-questions", names: { en: "Questions", bn: "প্রশ্ন" }, icon: "❓", color: "#b7791f" },
  { pocketId: "zp-links", names: { en: "Links", bn: "লিংক" }, icon: "🔗", color: "#6b46c1", ztype: "links" },
]);

const docKey = (tenantId, id) => `${tenantId}__${id}`;
const stripKey = (tenantId, docId) => (docId.startsWith(`${tenantId}__`) ? docId.slice(tenantId.length + 2) : docId);
const isEmpty = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

function requireCtx(ctx) {
  if (!ctx || !ctx.tenantId || !ctx.personId || !ctx.uid) {
    throw new Error("zab-data: ctx must carry tenantId, personId and uid.");
  }
}

/** Keep only allow-listed fields, copy arrays, drop the empty ones. */
function cleanFields(patch, allowed) {
  const out = {};
  for (const f of allowed) {
    if (!(f in (patch || {})) || isEmpty(patch[f])) continue;
    const v = patch[f];
    out[f] = ARRAY_FIELDS.has(f) ? v.map((x) => (x && typeof x === "object" ? { ...x } : x)) : v;
  }
  return out;
}

/** For an edit: the cleaned fields, plus deleteField() for every allow-listed field the patch names but leaves empty. */
function editFields(patch, allowed) {
  const out = cleanFields(patch, allowed);
  for (const f of allowed) {
    if (f in (patch || {}) && isEmpty(patch[f])) out[f] = deleteField();
  }
  return out;
}

// ---------- reads (only when called) --------------------------------------

async function listAll(db, collectionName, tenantId, idField, extraWhere) {
  const clauses = [where("tenantId", "==", tenantId)];
  if (extraWhere) clauses.push(where(extraWhere[0], "==", extraWhere[1]));
  const snap = await getDocs(query(collection(db, collectionName), ...clauses));
  return snap.docs
    .map((d) => ({ ...d.data(), [idField]: d.data()[idField] ?? stripKey(tenantId, d.id) }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Pockets of the tenant. Trashed ones are left out unless `includeTrashed`. */
export async function listPockets(db, tenantId, { includeTrashed = false } = {}) {
  const rows = await listAll(db, TENANT.ZAB_POCKETS, tenantId, "pocketId");
  return includeTrashed ? rows : rows.filter((p) => p.status !== "trashed");
}

/** Items in one pocket. Trashed ones are left out unless `includeTrashed`. */
export async function listItems(db, tenantId, pocketId, { includeTrashed = false } = {}) {
  const rows = await listAll(db, TENANT.ZAB_ITEMS, tenantId, "itemId", ["pocketId", pocketId]);
  return includeTrashed ? rows : rows.filter((i) => i.status !== "trashed");
}

// ---------- pockets --------------------------------------------------------

export async function addPocket(db, ctx, fields = {}) {
  requireCtx(ctx);
  const name = String(fields.name ?? "").trim();
  if (!name) return { ok: false, refused: "name-required" };
  if (fields.ztype !== undefined && fields.ztype !== null && !ZTYPES.includes(fields.ztype)) return { ok: false, refused: "bad-ztype" };
  const pocketId = fields.pocketId || doc(collection(db, TENANT.ZAB_POCKETS)).id;
  const data = {
    pocketId, tenantId: ctx.tenantId, addedByPersonId: ctx.personId, status: "active",
    order: Number.isFinite(fields.order) ? fields.order : Date.now(),
    name, icon: fields.icon || "📁", color: fields.color || "#4a5568",
  };
  if (fields.ztype) data.ztype = fields.ztype;
  if (fields.parentId) data.parentId = fields.parentId;
  const res = await safeWrite(
    () => createDocument(db, TENANT.ZAB_POCKETS, docKey(ctx.tenantId, pocketId), data, ctx.uid),
    { collection: TENANT.ZAB_POCKETS, docId: docKey(ctx.tenantId, pocketId), action: "add Zab pocket" });
  return res.ok ? { ok: true, pocketId } : res;
}

/** Rename / restyle. A rename writes `name` and removes the seeded `names` (I11). */
export async function editPocket(db, ctx, pocketId, patch = {}) {
  requireCtx(ctx);
  if (patch.ztype && !ZTYPES.includes(patch.ztype)) return { ok: false, refused: "bad-ztype" };
  if ("name" in patch && !String(patch.name ?? "").trim()) return { ok: false, refused: "name-required" };
  const data = editFields("name" in patch ? { ...patch, name: String(patch.name).trim() } : patch, POCKET_EDITABLE);
  if ("name" in patch) data.names = deleteField();
  const res = await safeWrite(
    () => updateDocument(db, TENANT.ZAB_POCKETS, docKey(ctx.tenantId, pocketId), data),
    { collection: TENANT.ZAB_POCKETS, docId: docKey(ctx.tenantId, pocketId), action: "edit Zab pocket" });
  return res.ok ? { ok: true } : res;
}

/** True when `candidateId` is `pocketId` or sits anywhere beneath it. */
export function isSelfOrDescendant(pockets, pocketId, candidateId) {
  const byId = new Map(pockets.map((p) => [p.pocketId, p]));
  const seen = new Set();
  for (let id = candidateId; id != null && !seen.has(id); id = byId.get(id)?.parentId ?? null) {
    if (id === pocketId) return true;
    seen.add(id);
  }
  return false;
}

// ---------- the pocket tree (Z6): pure readers over the flat list ----------------
// `parentId` places a pocket in the tree; absent / null = top level, so every pocket made before Z6 stays where it
// is. `order` is the order among SIBLINGS. Nothing here reads or writes Firestore.

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
const isActive = (p) => p.status !== "trashed";

/** Active pockets directly inside `id`, in sibling order. */
export function zabChildren(pockets, id) {
  return (pockets || []).filter((p) => isActive(p) && p.parentId === id).sort(byOrder);
}

/** True when this active pocket has no live parent to hang from: no parentId, or the parent is trashed / missing (an ORPHAN), or it sits in a corrupt parent cycle. */
function isTopLevel(pockets, p) {
  if (!p.parentId) return true;
  const byId = new Map(pockets.map((x) => [x.pocketId, x]));
  const par = byId.get(p.parentId);
  if (!par || !isActive(par)) return true;
  const seen = new Set([p.pocketId]);
  for (let q = par; q; q = byId.get(q.parentId)) {
    if (seen.has(q.pocketId)) return true; // a cycle: show it at the top rather than hide it
    seen.add(q.pocketId);
    if (!q.parentId) break;
  }
  return false;
}

/** The pockets shown at the top level: no parent, or an orphan (its parentId is kept, nothing is hidden). */
export function zabTopLevel(pockets) {
  const all = pockets || [];
  return all.filter((p) => isActive(p) && isTopLevel(all, p)).sort(byOrder);
}

/** From the top level down to the pocket itself (inclusive). An orphan's path starts at the orphan. [] when the pocket is unknown. */
export function zabPath(pockets, id) {
  const all = pockets || [];
  const byId = new Map(all.map((p) => [p.pocketId, p]));
  const out = [];
  const seen = new Set();
  for (let p = byId.get(id); p && !seen.has(p.pocketId); p = byId.get(p.parentId)) {
    seen.add(p.pocketId);
    out.unshift(p);
    const par = byId.get(p.parentId);
    if (!par || !isActive(par)) break;
  }
  return out;
}

/** Every active pocket in tree order with its depth: [{ pocket, depth }], parents before their children. */
export function zabTree(pockets) {
  const all = pockets || [];
  const out = [];
  const seen = new Set();
  const walk = (p, depth) => {
    if (seen.has(p.pocketId)) return;
    seen.add(p.pocketId);
    out.push({ pocket: p, depth });
    for (const c of zabChildren(all, p.pocketId)) walk(c, depth + 1);
  };
  for (const p of zabTopLevel(all)) walk(p, 0);
  return out;
}

/** Where `id` may legally move: every active pocket except itself and its own descendants, in tree order with depth. */
export function zabMoveTargets(pockets, id) {
  return zabTree(pockets).filter((n) => !isSelfOrDescendant(pockets, id, n.pocket.pocketId));
}

/** The pockets that share a list with `id` (its siblings, itself included): the top level for a top-level pocket or an orphan. */
export function zabSiblings(pockets, id) {
  const all = pockets || [];
  const p = all.find((x) => x.pocketId === id);
  if (!p) return [];
  return isActive(p) && isTopLevel(all, p) ? zabTopLevel(all) : zabChildren(all, p.parentId);
}

/** Re-parent a pocket (`newParentId` null = top level). Refuses a move into itself or its own descendant. */
export async function movePocket(db, ctx, pocketId, newParentId) {
  requireCtx(ctx);
  if (newParentId) {
    const all = await listPockets(db, ctx.tenantId, { includeTrashed: true });
    if (isSelfOrDescendant(all, pocketId, newParentId)) return { ok: false, refused: "into-itself-or-descendant" };
  }
  const res = await safeWrite(
    () => updateDocument(db, TENANT.ZAB_POCKETS, docKey(ctx.tenantId, pocketId), { parentId: newParentId || deleteField() }),
    { collection: TENANT.ZAB_POCKETS, docId: docKey(ctx.tenantId, pocketId), action: "move Zab pocket" });
  return res.ok ? { ok: true } : res;
}

/** Trash a pocket -- refused while it still holds an active item or an active pocket. */
export async function trashPocket(db, ctx, pocketId) {
  requireCtx(ctx);
  const [pockets, items] = await Promise.all([
    listPockets(db, ctx.tenantId),
    listItems(db, ctx.tenantId, pocketId),
  ]);
  if (items.length || pockets.some((p) => p.parentId === pocketId)) return { ok: false, refused: "not-empty" };
  const res = await safeWrite(
    () => updateDocument(db, TENANT.ZAB_POCKETS, docKey(ctx.tenantId, pocketId), { status: "trashed", deletedAt: serverTimestamp() }),
    { collection: TENANT.ZAB_POCKETS, docId: docKey(ctx.tenantId, pocketId), action: "trash Zab pocket" });
  return res.ok ? { ok: true } : res;
}

export async function restorePocket(db, ctx, pocketId) {
  requireCtx(ctx);
  const res = await safeWrite(
    () => updateDocument(db, TENANT.ZAB_POCKETS, docKey(ctx.tenantId, pocketId), { status: "active", deletedAt: deleteField() }),
    { collection: TENANT.ZAB_POCKETS, docId: docKey(ctx.tenantId, pocketId), action: "restore Zab pocket" });
  return res.ok ? { ok: true } : res;
}

/** Seed the four study pockets ONCE: only when the tenant has no pocket at all (trashed ones count). */
export async function seedPockets(db, ctx) {
  requireCtx(ctx);
  const existing = await listPockets(db, ctx.tenantId, { includeTrashed: true });
  if (existing.length) return { ok: true, seeded: false };
  const base = Date.now();
  const creates = SEED_POCKETS.map((p, i) => {
    const data = {
      pocketId: p.pocketId, tenantId: ctx.tenantId, addedByPersonId: ctx.personId, status: "active",
      order: base + i, name: p.names.en, names: { ...p.names }, icon: p.icon, color: p.color,
    };
    if (p.ztype) data.ztype = p.ztype;
    return { collectionName: TENANT.ZAB_POCKETS, docId: docKey(ctx.tenantId, p.pocketId), data };
  });
  const res = await safeWrite(
    () => commitEnvelopeBatch(db, { creates }, ctx.uid),
    { collection: TENANT.ZAB_POCKETS, docId: ctx.tenantId, action: "seed Zab pockets" });
  return res.ok ? { ok: true, seeded: true } : res;
}

// ---------- items ----------------------------------------------------------

export async function addItem(db, ctx, pocketId, fields = {}) {
  requireCtx(ctx);
  const text = String(fields.text ?? "").trim();
  if (!text) return { ok: false, refused: "text-required" };
  const itemId = fields.itemId || doc(collection(db, TENANT.ZAB_ITEMS)).id;
  const data = {
    itemId, tenantId: ctx.tenantId, pocketId, addedByPersonId: ctx.personId, status: "active",
    order: Number.isFinite(fields.order) ? fields.order : Date.now(),
    text, done: false,
    ...cleanFields(fields, ITEM_KIND_FIELDS),
  };
  const res = await safeWrite(
    () => createDocument(db, TENANT.ZAB_ITEMS, docKey(ctx.tenantId, itemId), data, ctx.uid),
    { collection: TENANT.ZAB_ITEMS, docId: docKey(ctx.tenantId, itemId), action: "add Zab item" });
  return res.ok ? { ok: true, itemId } : res;
}

/** Allow-listed fields only; arrays are copied; an empty kind field is REMOVED, not stored. */
export async function editItem(db, ctx, itemId, patch = {}) {
  requireCtx(ctx);
  if ("text" in patch && !String(patch.text ?? "").trim()) return { ok: false, refused: "text-required" };
  const data = editFields("text" in patch ? { ...patch, text: String(patch.text).trim() } : patch, ITEM_EDITABLE);
  const res = await safeWrite(
    () => updateDocument(db, TENANT.ZAB_ITEMS, docKey(ctx.tenantId, itemId), data),
    { collection: TENANT.ZAB_ITEMS, docId: docKey(ctx.tenantId, itemId), action: "edit Zab item" });
  return res.ok ? { ok: true } : res;
}

export async function toggleDone(db, ctx, itemId, done) {
  requireCtx(ctx);
  const res = await safeWrite(
    () => updateDocument(db, TENANT.ZAB_ITEMS, docKey(ctx.tenantId, itemId), { done: !!done }),
    { collection: TENANT.ZAB_ITEMS, docId: docKey(ctx.tenantId, itemId), action: "tick Zab item" });
  return res.ok ? { ok: true } : res;
}

export async function moveItem(db, ctx, itemId, toPocketId) {
  requireCtx(ctx);
  const res = await safeWrite(
    () => updateDocument(db, TENANT.ZAB_ITEMS, docKey(ctx.tenantId, itemId), { pocketId: toPocketId }),
    { collection: TENANT.ZAB_ITEMS, docId: docKey(ctx.tenantId, itemId), action: "move Zab item" });
  return res.ok ? { ok: true } : res;
}

export async function trashItem(db, ctx, itemId) {
  requireCtx(ctx);
  const res = await safeWrite(
    () => updateDocument(db, TENANT.ZAB_ITEMS, docKey(ctx.tenantId, itemId), { status: "trashed", deletedAt: serverTimestamp() }),
    { collection: TENANT.ZAB_ITEMS, docId: docKey(ctx.tenantId, itemId), action: "trash Zab item" });
  return res.ok ? { ok: true } : res;
}

/** → Note (Z5): trash the item AND remember which Note it became. Never a delete. */
export async function trashItemAsNote(db, ctx, itemId, noteId) {
  requireCtx(ctx);
  if (typeof noteId !== "string" || !noteId) return { ok: false, refused: "note-id-required" };
  const res = await safeWrite(
    () => updateDocument(db, TENANT.ZAB_ITEMS, docKey(ctx.tenantId, itemId), { status: "trashed", deletedAt: serverTimestamp(), noteId }),
    { collection: TENANT.ZAB_ITEMS, docId: docKey(ctx.tenantId, itemId), action: "trash Zab item as Note" });
  return res.ok ? { ok: true } : res;
}

export async function restoreItem(db, ctx, itemId) {
  requireCtx(ctx);
  const res = await safeWrite(
    () => updateDocument(db, TENANT.ZAB_ITEMS, docKey(ctx.tenantId, itemId), { status: "active", deletedAt: deleteField() }),
    { collection: TENANT.ZAB_ITEMS, docId: docKey(ctx.tenantId, itemId), action: "restore Zab item" });
  return res.ok ? { ok: true } : res;
}

/** Ticked items in a pocket -> trashed (never deleted). */
export async function clearDone(db, ctx, pocketId) {
  requireCtx(ctx);
  const ticked = (await listItems(db, ctx.tenantId, pocketId)).filter((i) => i.done === true);
  const BATCH = 400;
  for (let i = 0; i < ticked.length; i += BATCH) {
    const updates = ticked.slice(i, i + BATCH).map((it) => ({
      collectionName: TENANT.ZAB_ITEMS, docId: docKey(ctx.tenantId, it.itemId),
      data: { status: "trashed", deletedAt: serverTimestamp() },
    }));
    const res = await safeWrite(
      () => commitEnvelopeBatch(db, { updates }, ctx.uid),
      { collection: TENANT.ZAB_ITEMS, docId: pocketId, action: "clear ticked Zab items" });
    if (!res.ok) return res;
  }
  return { ok: true, cleared: ticked.length };
}

// ---------- pocket kinds (Z3): tasks and links ---------------------------------

/** THE one reader of a pocket's kind: `ztype` when present, otherwise `plain`. Every drawing branch asks this and nothing else. */
export function zabType(pocket) {
  const z = pocket && pocket.ztype;
  return ZTYPES.includes(z) ? z : "plain";
}

/** A date as the device's local `YYYY-MM-DD` (never UTC: a task due "today" means the reader's day). */
export function localDay(date = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
export function addDays(day, n) {
  const [y, m, d] = day.split("-").map(Number);
  return localDay(new Date(y, m - 1, d + n));
}
export const isDay = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && addDays(v, 0) === v;

/**
 * Quick typing for a task: a lone `!` (or one stuck to a word) sets high priority; the word today / tomorrow
 * (or the Bangla আজ / আগামীকাল) sets the due date. The words are removed from the text. Returns { text, pri?, due? }.
 */
export function parseQuickTask(raw, now = new Date()) {
  const out = {};
  const today = localDay(now);
  const kept = [];
  for (const tok of String(raw ?? "").split(/\s+/).filter(Boolean)) {
    const bare = tok.replace(/^!+|!+$/g, "");
    const low = bare.toLowerCase();
    if (tok !== bare) out.pri = 1;
    if (!bare) continue; // a lone "!"
    if (tok === bare && (low === "today" || bare === "আজ")) { out.due = today; continue; }
    if (tok === bare && (low === "tomorrow" || bare === "আগামীকাল")) { out.due = addDays(today, 1); continue; }
    kept.push(bare);
  }
  out.text = kept.join(" ");
  return out;
}

/** Which heading a task sits under: Overdue, Today, Tomorrow, Later, No date -- or Done, whatever its date. */
export function dueGroup(item, now = new Date()) {
  if (item && item.done === true) return "done";
  const d = item && item.due;
  if (!isDay(d)) return "nodate";
  const today = localDay(now);
  if (d < today) return "overdue";
  if (d === today) return "today";
  if (d === addDays(today, 1)) return "tomorrow";
  return "later";
}
export const TASK_GROUPS = Object.freeze(["overdue", "today", "tomorrow", "later", "nodate", "done"]);

/** `{ done, total }` for an item's steps. */
export function stepCount(steps) {
  const a = Array.isArray(steps) ? steps : [];
  return { done: a.filter((s) => s && s.d === true).length, total: a.length };
}

/** A pasted web address: one token, http or https. Returns it, or null. */
export function asUrl(text) {
  const s = String(text ?? "").trim();
  if (!s || /\s/.test(s)) return null;
  try { const u = new URL(s); return u.protocol === "http:" || u.protocol === "https:" ? s : null; } catch { return null; }
}
/** The site name shown beside a link: the host without a leading www. */
export function siteName(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

// ---------- step helpers (pure; persist the result with editItem({ steps })) ----

const newStepId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Steps are `{ id, t, d }`: id, text, done. These return a NEW array. */
export function addStep(steps, text) {
  const t = String(text ?? "").trim();
  return t ? [...(steps || []).map((s) => ({ ...s })), { id: newStepId(), t, d: false }] : (steps || []).map((s) => ({ ...s }));
}
export function toggleStep(steps, stepId) {
  return (steps || []).map((s) => (s.id === stepId ? { ...s, d: !s.d } : { ...s }));
}
export function editStep(steps, stepId, text) {
  const t = String(text ?? "").trim();
  return (steps || []).map((s) => (s.id === stepId && t ? { ...s, t } : { ...s }));
}
export function removeStep(steps, stepId) {
  return (steps || []).filter((s) => s.id !== stepId).map((s) => ({ ...s }));
}

// ---------- pocket kinds (Z4): ideas and shopping ------------------------------

export const MAX_STARS = 3;
/** The stars after a tap on star `n`: tapping the star already set clears it (null = remove the field). */
export function nextStars(current, n) {
  const k = Math.round(Number(n));
  if (!(k >= 1 && k <= MAX_STARS)) return null;
  return current === k ? null : k;
}
/** Items sorted by stars, high first (unstarred last), ties kept in pocket order. */
export function sortByStars(items) {
  return (items || []).slice().sort((a, b) => ((b.stars || 0) - (a.stars || 0)) || ((a.order ?? 0) - (b.order ?? 0)));
}
/** A topic is a short trimmed string; returns the new array (no duplicates, case-insensitive), or a copy of the old one if `text` is empty. */
export function addTopic(topics, text) {
  const s = String(text ?? "").trim().slice(0, 40);
  const cur = Array.isArray(topics) ? topics : [];
  if (!s || cur.some((x) => String(x).toLowerCase() === s.toLowerCase())) return cur.slice();
  return [...cur, s];
}
export function removeTopic(topics, text) {
  return (Array.isArray(topics) ? topics : []).filter((x) => x !== text);
}

/**
 * Quick typing for a shopping item: a leading number is the quantity, and everything after the first `@` (spaces
 * allowed, to the end) is the shop. `2 milk @Coles` -> { qty: "2", text: "milk", shop: "Coles" }. Returns { text, qty?, shop? }.
 */
export function parseQuickShop(raw) {
  let s = String(raw ?? "").trim();
  const out = {};
  const m = /(^|\s)@(.*)$/s.exec(s);
  if (m) {
    const shop = m[2].trim();
    if (shop) out.shop = shop;
    s = s.slice(0, m.index).trim();
  }
  const q = /^(\d+(?:[.,]\d+)?)(?:\s+|$)/.exec(s);
  if (q && s.slice(q[0].length).trim()) { out.qty = q[1]; s = s.slice(q[0].length).trim(); }
  out.text = s;
  return out;
}
/** Shopping groups: one per shop name (A-Z), then "No shop" (key ""), then Done. Each group is { key, items }; empty ones are left out. */
export function shopGroups(items) {
  const open = new Map();
  const done = [];
  for (const it of (items || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    if (it.done === true) { done.push(it); continue; }
    const k = typeof it.shop === "string" ? it.shop.trim() : "";
    if (!open.has(k)) open.set(k, []);
    open.get(k).push(it);
  }
  const named = [...open.keys()].filter((k) => k).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const groups = named.map((k) => ({ key: k, items: open.get(k) }));
  if (open.has("")) groups.push({ key: "", items: open.get("") });
  if (done.length) groups.push({ key: "\u0000done", items: done, done: true });
  return groups;
}
