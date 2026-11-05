// PCF MSA J112 R1 -- THE MAP'S READ-ONLY COPY OF SIYAGAH'S MAPPING MY JOURNEY: THE PURE HALF
//
// Siyagah (v05.66+) is the one MASTER of the Mapping My Journey folders and notes. It keeps a shared copy in its own
// Firebase project, and this module turns that copy's documents into what the Map shows. The contract it follows is
// Siyagah's "The shared Mapping My Journey copy -- for other apps (read-only)" (R1), checked against Siyagah's own
// writer (_msTick): the tree in notebooks/{nb}/mmj/t~0 (+ pieces t~1..t~N, joined ONLY when every piece's g equals
// t~0.g), one note per n~<encodeURIComponent(id) with "." as %2E>, a big note's content in mmjparts as
// n~<same encoded id>~<g>~<i>, gone:true removes, last `at` wins, the cursor is the largest `at` seen.
//
// THIS MODULE IS PURE AND IMPORTS NOTHING: no Firebase, no DOM, no storage. The data module (siyagah-mmj-data.js)
// reads and listens; this one decides. tools/i18n-verify/siyagah-mmj-model.mjs checks every function here.
//
// IT NEVER WRITES ANYTHING OF SIYAGAH'S, and it cannot: it has no way to reach the network at all.

export const MMJ_COPY_VERSION = 1;
export const MMJ_RETRY_MS = 60000; // permission-denied: retry after one minute, never in a loop (the contract)

/** The note's document id in notebooks/{nb}/mmj, exactly as Siyagah writes it. */
export function mmjNoteDocId(noteId) {
  return "n~" + encodeURIComponent(String(noteId)).replace(/\./g, "%2E");
}

/** One piece of a big note's content, in notebooks/{nb}/mmjparts. */
export function mmjPartDocId(noteId, g, i) {
  return mmjNoteDocId(noteId) + "~" + g + "~" + i;
}

/** A server time as milliseconds: a Firestore Timestamp, a Date, {seconds,nanoseconds}, a number or an ISO string. 0 when unknown. */
export function atMillis(at) {
  if (at == null) return 0;
  if (typeof at === "number") return Number.isFinite(at) ? at : 0;
  if (typeof at.toMillis === "function") { const v = at.toMillis(); return Number.isFinite(v) ? v : 0; }
  if (at instanceof Date) { const v = at.getTime(); return Number.isFinite(v) ? v : 0; }
  if (typeof at === "object" && Number.isFinite(at.seconds)) return at.seconds * 1000 + Math.floor((Number(at.nanoseconds) || 0) / 1e6);
  if (typeof at === "string") { const v = Date.parse(at); return Number.isFinite(v) ? v : 0; }
  return 0;
}

/** What kind of document an mmj doc id is: "tree" (t~0), "piece" (t~1..), "note" (n~...) or null. */
export function mmjDocKind(docId) {
  const id = String(docId || "");
  if (id === "t~0") return "tree";
  if (/^t~[1-9]\d*$/.test(id)) return "piece";
  if (id.startsWith("n~") && id.length > 2) return "note";
  return null;
}

function cleanFolder(f) {
  if (!f || typeof f !== "object" || typeof f.id !== "string" || !f.id) return null;
  return {
    id: f.id,
    n: f.n == null ? "" : String(f.n),
    p: typeof f.p === "string" && f.p ? f.p : null,
    o: Number.isFinite(Number(f.o)) ? Number(f.o) : 0,
    u: f.u == null ? null : String(f.u),
    vis: f.vis === 1 ? 1 : 0,
  };
}

/**
 * Join the tree. `t0` is t~0's data; `pieces` is { "t~1": data, ... } (only needed when t0.n is present).
 * Returns { ok:true, tree:{ sec, folders, at, b } } or { ok:false, reason } -- "no-tree", "piece-missing" or
 * "piece-generation" (a write is in progress: read again). Never a half-joined tree.
 */
export function joinTree(t0, pieces = {}) {
  if (!t0 || typeof t0 !== "object") return { ok: false, reason: "no-tree" };
  const sec = { id: t0.sec?.id || "mmj-sec", n: t0.sec?.n == null ? "Mapping My Journey" : String(t0.sec.n) };
  let raw;
  if (Array.isArray(t0.folders)) raw = t0.folders;
  else {
    const n = Number(t0.n);
    if (!Number.isInteger(n) || n < 1) return { ok: false, reason: "no-tree" };
    raw = [];
    for (let i = 1; i <= n; i++) {
      const p = pieces && pieces["t~" + i];
      if (!p || !Array.isArray(p.folders)) return { ok: false, reason: "piece-missing" };
      if (p.g !== t0.g) return { ok: false, reason: "piece-generation" };
      raw.push(...p.folders);
    }
  }
  const seen = new Set(), folders = [];
  for (const f of raw) { const c = cleanFolder(f); if (c && !seen.has(c.id)) { seen.add(c.id); folders.push(c); } }
  return { ok: true, tree: { sec, folders, at: atMillis(t0.at), b: t0.b == null ? null : String(t0.b) } };
}

/** The pieces a big note needs, or null for a note whose content is inline. */
export function noteParts(data) {
  if (!data || typeof data !== "object" || data.parts == null) return null;
  const n = Number(data.parts);
  if (!Number.isInteger(n) || n < 1 || n > 10000) return null;
  return { n, g: data.g };
}

/**
 * A big note's content from its pieces ({ d, g } in order). null when a piece is missing or of another generation
 * (a rewrite is in progress: read the note again).
 */
export function joinNoteParts(data, partDocs) {
  const want = noteParts(data);
  if (!want) return null;
  if (!Array.isArray(partDocs) || partDocs.length !== want.n) return null;
  let out = "";
  for (const p of partDocs) {
    if (!p || typeof p.d !== "string" || p.g !== want.g) return null;
    out += p.d;
  }
  return out;
}

/** An empty device copy for notebook `nb`. */
export function emptyCopy(nb) {
  return { v: MMJ_COPY_VERSION, nb: String(nb || ""), tree: null, notes: {}, gone: {}, cursor: 0, savedAt: 0 };
}

/** Read back a stored copy; anything malformed, of another version or another notebook gives an empty one. */
export function parseCopy(value, nb) {
  let c = value;
  if (typeof c === "string") { try { c = JSON.parse(c); } catch { return emptyCopy(nb); } }
  if (!c || typeof c !== "object" || c.v !== MMJ_COPY_VERSION || c.nb !== String(nb || "")) return emptyCopy(nb);
  const out = emptyCopy(nb);
  if (c.tree && Array.isArray(c.tree.folders)) out.tree = { sec: c.tree.sec || { id: "mmj-sec", n: "Mapping My Journey" }, folders: c.tree.folders.map(cleanFolder).filter(Boolean), at: atMillis(c.tree.at), b: c.tree.b ?? null };
  if (c.notes && typeof c.notes === "object") for (const [id, n] of Object.entries(c.notes)) if (n && typeof n === "object" && n.id === id) out.notes[id] = n;
  if (c.gone && typeof c.gone === "object") for (const [id, at] of Object.entries(c.gone)) if (Number.isFinite(at)) out.gone[id] = at;
  out.cursor = Number.isFinite(c.cursor) ? c.cursor : 0;
  out.savedAt = Number.isFinite(c.savedAt) ? c.savedAt : 0;
  return out;
}

function cleanNote(data, content) {
  return {
    id: String(data.id),
    title: data.title == null ? "" : String(data.title),
    content: typeof content === "string" ? content : (typeof data.content === "string" ? data.content : ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    folderIds: Array.isArray(data.folderIds) ? data.folderIds.filter((x) => typeof x === "string") : [],
    kind: data.kind == null ? null : String(data.kind),
    createdAt: data.createdAt == null ? null : String(data.createdAt),
    updatedAt: data.updatedAt == null ? null : String(data.updatedAt),
    vis: data.vis === 1 ? 1 : 0,
    at: atMillis(data.at),
  };
}

/**
 * Apply one n~ document to the copy (a NEW copy is returned; the old one is not changed).
 * `content` is the joined content of a big note (joinNoteParts), required when the doc has `parts`.
 * Returns { copy, changed, needParts } -- needParts is true when a big note arrived without its content (read the
 * pieces, then call again). Last `at` wins: a document older than what the copy holds for that id changes nothing.
 * gone:true removes the note.
 */
export function applyNoteDoc(copy, docId, data, content) {
  if (!data || typeof data !== "object" || data.id == null) return { copy, changed: false, needParts: false };
  const id = String(data.id);
  if (mmjNoteDocId(id) !== docId) return { copy, changed: false, needParts: false }; // a doc whose id does not match its note: ignored
  const at = atMillis(data.at);
  const held = copy.notes[id];
  const heldAt = held ? held.at : (copy.gone[id] ?? -1);
  if (at < heldAt) return { copy, changed: false, needParts: false };
  if (data.gone === true) {
    if (!held && copy.gone[id] === at) return { copy, changed: false, needParts: false };
    const notes = { ...copy.notes }; delete notes[id];
    return { copy: { ...copy, notes, gone: { ...copy.gone, [id]: at }, cursor: Math.max(copy.cursor, at) }, changed: true, needParts: false };
  }
  if (noteParts(data) && typeof content !== "string") return { copy, changed: false, needParts: true };
  const note = cleanNote(data, noteParts(data) ? content : undefined);
  const gone = { ...copy.gone }; delete gone[id];
  return { copy: { ...copy, notes: { ...copy.notes, [id]: note }, gone, cursor: Math.max(copy.cursor, at) }, changed: true, needParts: false };
}

/** Put a joined tree into the copy (last `at` wins). */
export function applyTree(copy, tree) {
  if (!tree || !Array.isArray(tree.folders)) return { copy, changed: false };
  if (copy.tree && tree.at < copy.tree.at) return { copy, changed: false };
  return { copy: { ...copy, tree, cursor: Math.max(copy.cursor, tree.at) }, changed: true };
}

/** Move the cursor forward for a document seen (a t~ piece, say) without changing anything else. */
export function seeAt(copy, at) {
  const ms = atMillis(at);
  return ms > copy.cursor ? { ...copy, cursor: ms } : copy;
}

function byOrder(a, b) {
  return a.o - b.o || a.n.localeCompare(b.n) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * The folder tree the Map shows: [{ folder, children:[...], notes:[note...] }] ordered by `o`, then name. A folder
 * whose parent is not in the set sits at the top (never lost). A parent loop is broken, never followed forever.
 * Notes are sorted newest first (updatedAt), then by title. `loose` holds notes in no folder of the set.
 */
export function folderView(copy) {
  const folders = (copy.tree?.folders || []).slice();
  const ids = new Set(folders.map((f) => f.id));
  const kids = new Map();
  for (const f of folders) {
    const parent = f.p && ids.has(f.p) && f.p !== f.id ? f.p : null;
    if (!kids.has(parent)) kids.set(parent, []);
    kids.get(parent).push(f);
  }
  const notesIn = new Map();
  const loose = [];
  for (const n of Object.values(copy.notes)) {
    const own = n.folderIds.filter((x) => ids.has(x));
    if (!own.length) loose.push(n);
    for (const fid of own) { if (!notesIn.has(fid)) notesIn.set(fid, []); notesIn.get(fid).push(n); }
  }
  const noteOrder = (a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) || a.title.localeCompare(b.title) || (a.id < b.id ? -1 : 1);
  const placed = new Set();
  const build = (parent, path) => (kids.get(parent) || []).slice().sort(byOrder).flatMap((f) => {
    if (path.has(f.id) || placed.has(f.id)) return [];
    placed.add(f.id);
    const next = new Set(path); next.add(f.id);
    return [{ folder: f, children: build(f.id, next), notes: (notesIn.get(f.id) || []).slice().sort(noteOrder) }];
  });
  const roots = build(null, new Set());
  // Folders caught in a parent loop never reach the top: put them there so nothing the owner made is hidden.
  for (const f of folders.slice().sort(byOrder)) if (!placed.has(f.id)) { placed.add(f.id); roots.push({ folder: f, children: build(f.id, new Set([f.id])), notes: (notesIn.get(f.id) || []).slice().sort(noteOrder) }); }
  return { roots, loose: loose.sort(noteOrder), folderCount: folders.length, noteCount: Object.keys(copy.notes).length };
}

/** A note's pictures, in order: [{ sha, mime }] from <img ... data-pic="<sha256>" data-mime="..."> (only a real sha256). */
export function pictureRefs(html) {
  const out = [];
  for (const m of String(html || "").matchAll(/<img\b[^>]*>/gi)) {
    const sha = (m[0].match(/\bdata-pic\s*=\s*["']([0-9a-f]{64})["']/i) || [])[1];
    if (!sha) continue;
    const mime = (m[0].match(/\bdata-mime\s*=\s*["'](image\/[a-z0-9.+-]+)["']/i) || [])[1] || "";
    out.push({ sha: sha.toLowerCase(), mime: mime.toLowerCase() });
  }
  return out;
}

/**
 * What to read for one picture, from its meta doc ({ n, t, p, sm? }). Returns { want, parts, size, type } where
 * `want` is the sha the BYTES must have (the smaller copy's when `sm` is a sha256) and the picparts ids are want~0..;
 * throws on a meta that is wrong, exactly as Siyagah's _picFetch refuses one.
 */
export function picturePlan(sha, meta, mime = "") {
  if (!/^[0-9a-f]{64}$/.test(String(sha))) throw new Error("not a picture id");
  if (!meta || typeof meta !== "object") throw new Error("picture is not in the cloud");
  const parts = Number(meta.p);
  if (!(Number.isInteger(parts) && parts >= 1 && parts <= 5000)) throw new Error("picture meta is wrong");
  const sm = typeof meta.sm === "string" && /^[0-9a-f]{64}$/.test(meta.sm) ? meta.sm : null;
  const type = typeof meta.t === "string" && /^image\/[a-z0-9.+-]+$/i.test(meta.t) ? meta.t : (mime || "image/jpeg");
  return { want: sm || sha, parts, size: meta.n == null ? null : Number(meta.n), type };
}

/** Do these bytes pass? `hex` is their sha256. A picture that fails is never shown. */
export function pictureBytesOk(plan, total, hex) {
  if (plan.size != null && plan.size !== total) return false;
  return typeof hex === "string" && hex === plan.want;
}

/** Firestore's refusal, in any of the shapes it arrives in. */
export function isPermissionDenied(err) {
  const code = String(err?.code || "");
  return code === "permission-denied" || code === "firestore/permission-denied" || /missing or insufficient permissions/i.test(String(err?.message || ""));
}

/** May the reader try again now? Only once a minute after a refusal -- never a loop. */
export function mayRetry(lastTryMs, nowMs, gap = MMJ_RETRY_MS) {
  return !(Number.isFinite(lastTryMs) && lastTryMs > 0) || nowMs - lastTryMs >= gap;
}

// ---------------------------------------------------------------------------------------------------------------------
// J112 R2a (5 Nov 2026) -- WRITING BY REQUEST: FOLDERS ONLY. Siyagah v05.68's "Writing (R2)" contract (MMJ-SHARE.md):
// an app never writes Siyagah's records; it CREATES one request document notebooks/{nb}/mmjin/{reqId} with
// {v:1, op, from, at:<serverTimestamp>, st:'new', ...the op's fields} and never changes it after. Siyagah applies it
// and writes the outcome (st 'done' or 'refused' + why) on the same document. Any field not listed for the op is
// refused, so the field lists below are exact. Still pure: the write module (siyagah-mmj-write.js) adds `at` and
// writes; this half decides what may be asked.

/** The fields each folder op carries, exactly as the contract lists them (`before` is optional on a move). */
export const MMJ_FOLDER_OPS = Object.freeze({
  "folder.add": Object.freeze(["id", "name", "parent"]),
  "folder.rename": Object.freeze(["id", "name"]),
  "folder.move": Object.freeze(["id", "parent", "before"]),
  "folder.delete": Object.freeze(["id"]),
  "folder.vis": Object.freeze(["id", "vis"]),
});
/** The envelope every request carries, besides the op's own fields (`at` is the server's time, added by the writer). */
export const MMJ_REQUEST_ENVELOPE = Object.freeze(["v", "op", "from", "at", "st"]);
export const MMJ_NAME_MAX = 200;
/** How long a request may stay unanswered before the row says it is still waiting (it never asks again by itself). */
export const MMJ_STILL_WAITING_MS = 20000;

/** The contract's ids: letters, digits and . _ : ~ -, 1 to 120 characters. */
export function isMmjId(id) {
  return typeof id === "string" && /^[A-Za-z0-9._:~-]{1,120}$/.test(id);
}

/** `from` for this app: 'qr' on QuranRevival's site (built from this repository), 'msa' everywhere else. */
export function mmjFromForHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "quranrevival.github.io" || h.endsWith(".quranrevival.github.io") ? "qr" : "msa";
}

/** A random id from `bytes` (a Uint8Array from crypto.getRandomValues): letters and digits only. */
export function mmjRandomId(bytes, prefix = "") {
  const abc = "0123456789abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (const b of bytes || []) out += abc[b % 36];
  return prefix + out;
}

/** A folder name as Siyagah will keep it: control characters removed, trimmed. */
export function cleanMmjName(name) {
  // eslint-disable-next-line no-control-regex
  return String(name == null ? "" : name).replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

/** The ids of folder `id` and every folder below it (a parent loop is never followed forever). */
export function folderSubtree(folders, id) {
  const kids = new Map();
  for (const f of folders || []) { if (!kids.has(f.p)) kids.set(f.p, []); kids.get(f.p).push(f.id); }
  const out = new Set();
  const walk = (x) => { if (out.has(x)) return; out.add(x); for (const k of kids.get(x) || []) walk(k); };
  walk(id);
  return out;
}

/**
 * What deleting folder `id` takes to Siyagah's Trash (the D6 rule): its subfolders, and the notes whose ONLY folders
 * of the set are inside that subtree. { folders: <subfolders, not counting itself>, notes }.
 */
export function folderDeleteReach(copy, id) {
  const folders = copy?.tree?.folders || [];
  const sub = folderSubtree(folders, id);
  const ids = new Set(folders.map((f) => f.id));
  let notes = 0;
  for (const n of Object.values(copy?.notes || {})) {
    const own = (n.folderIds || []).filter((x) => ids.has(x));
    if (own.length && own.every((x) => sub.has(x))) notes++;
  }
  return { folders: sub.size - 1, notes };
}

/** The parents folder `id` may move under: null (the top) and every folder that is not itself or below it. */
export function moveTargets(folders, id) {
  const sub = folderSubtree(folders, id);
  return [null, ...(folders || []).filter((f) => !sub.has(f.id)).map((f) => f.id)];
}

/**
 * Build one folder request (without `at`). `fields` are the op's own; `folders` the tree as this app holds it; `from`
 * 'msa' or 'qr'. Returns { ok:true, req } with EXACTLY the envelope (minus `at`) and the op's listed fields, or
 * { ok:false, reason } in words the reader can be shown -- the same refusals Siyagah would give, said before asking.
 */
export function buildFolderRequest(op, fields, { folders = [], from = "msa" } = {}) {
  const want = MMJ_FOLDER_OPS[op];
  if (!want) return { ok: false, reason: "unknown op" };
  if (from !== "msa" && from !== "qr") return { ok: false, reason: "bad from" };
  const f = fields || {};
  for (const k of Object.keys(f)) if (!want.includes(k)) return { ok: false, reason: `unknown field "${k}"` };
  const byId = new Map((folders || []).map((x) => [x.id, x]));
  if (!isMmjId(f.id)) return { ok: false, reason: "bad id" };
  const req = { v: 1, op, from, st: "new", id: f.id };
  if (op === "folder.add") {
    if (byId.has(f.id)) return { ok: false, reason: "id already used" };
  } else if (!byId.has(f.id)) return { ok: false, reason: "not a Mapping My Journey folder" };
  if (op === "folder.add" || op === "folder.rename") {
    const name = cleanMmjName(f.name);
    if (!name || name.length > MMJ_NAME_MAX) return { ok: false, reason: "bad name" };
    req.name = name;
  }
  if (op === "folder.add" || op === "folder.move") {
    const parent = f.parent == null ? null : f.parent;
    if (parent !== null && !byId.has(parent)) return { ok: false, reason: "not a Mapping My Journey folder" };
    if (op === "folder.move" && parent !== null && folderSubtree(folders, f.id).has(parent)) return { ok: false, reason: "cannot move a folder into itself or one of its own subfolders" };
    req.parent = parent;
  }
  if (op === "folder.move" && f.before != null) {
    const b = byId.get(f.before);
    if (!b || f.before === f.id || (b.p || null) !== req.parent) return { ok: false, reason: "before is not beside it" };
    req.before = f.before;
  }
  if (op === "folder.vis") {
    if (f.vis !== 1 && f.vis !== 0) return { ok: false, reason: "vis must be 1 or 0" };
    req.vis = f.vis;
  }
  return { ok: true, req };
}

/** The `before` that moves folder `id` one place up (dir -1) or down (+1) among its siblings, or undefined when it cannot. */
export function siblingStep(folders, id, dir) {
  const me = (folders || []).find((f) => f.id === id);
  if (!me) return undefined;
  const sibs = folders.filter((f) => (f.p || null) === (me.p || null)).sort(byOrder);
  const i = sibs.findIndex((f) => f.id === id);
  if (dir < 0) return i > 0 ? { parent: me.p || null, before: sibs[i - 1].id } : undefined;
  if (i < 0 || i >= sibs.length - 1) return undefined;
  return i + 2 < sibs.length ? { parent: me.p || null, before: sibs[i + 2].id } : { parent: me.p || null, before: null };
}

/** Has the copy Siyagah shares caught up with this request? (Its change then shows from the copy, never from us.) */
export function requestReflected(copy, req) {
  if (MMJ_NOTE_OPS[req?.op]) return noteReflected(copy, req);
  const folders = copy?.tree?.folders || [];
  const f = folders.find((x) => x.id === req.id);
  switch (req.op) {
    case "folder.add": return !!f;
    case "folder.rename": return !!f && f.n === req.name;
    case "folder.move": return !!f && (f.p || null) === req.parent;
    case "folder.delete": return !f;
    case "folder.vis": return !!f && f.vis === req.vis;
    default: return true;
  }
}

/**
 * The copy as the reader should see it while requests are out: the contract says show the change AT ONCE, marked as
 * waiting for Siyagah. `pending` is [{ reqId, req, st }] in the order asked; a refused request is never in it (the row
 * goes back as it was). Returns { copy, marks, noteMarks } -- marks[folderId] = { reqId, op, st, still } for the folder
 * row that waits, noteMarks[noteId] the same for a note (R2b: their own map, so a folder and a note with the same id
 * never mark each other). The copy passed in is never changed.
 */
export function withPending(copy, pending) {
  if (!copy?.tree || !Array.isArray(pending) || !pending.length) return { copy, marks: {}, noteMarks: {} };
  let folders = copy.tree.folders.map((f) => ({ ...f }));
  const marks = {}, noteMarks = {};
  let notes = null;
  const lastO = (parent) => folders.filter((f) => (f.p || null) === parent).reduce((m, f) => Math.max(m, f.o), -1);
  for (const p of pending) {
    const r = p.req;
    if (!r) continue;
    if (MMJ_NOTE_OPS[r.op]) {
      notes = notes || { ...(copy.notes || {}) };
      if (notePending(notes, folders, r)) noteMarks[r.id] = { reqId: p.reqId ?? null, op: r.op, st: p.st || "new", still: !!p.still };
      continue;
    }
    if (!MMJ_FOLDER_OPS[r.op]) continue;
    const f = folders.find((x) => x.id === r.id);
    if (r.op === "folder.add") { if (!f) folders.push({ id: r.id, n: r.name, p: r.parent, o: lastO(r.parent) + 1, u: null, vis: 0 }); }
    else if (!f) continue;
    else if (r.op === "folder.rename") f.n = r.name;
    else if (r.op === "folder.vis") f.vis = r.vis;
    else if (r.op === "folder.move") {
      f.p = r.parent;
      const b = r.before ? folders.find((x) => x.id === r.before && (x.p || null) === r.parent) : null;
      f.o = b ? b.o - 0.5 : lastO(r.parent) + 1;
    }
    // folder.delete: the row stays, marked, until Siyagah's copy drops it (it is going to Trash, not gone yet).
    marks[r.id] = { reqId: p.reqId ?? null, op: r.op, st: p.st || "new", still: !!p.still };
  }
  return { copy: { ...copy, tree: { ...copy.tree, folders }, ...(notes ? { notes } : {}) }, marks, noteMarks };
}

/** A request document's outcome as this app reads it: "waiting" (new / work / not seen yet), "done" or "refused". */
export function requestOutcome(data) {
  const st = data && typeof data === "object" ? data.st : null;
  if (st === "done") return { kind: "done" };
  if (st === "refused") return { kind: "refused", why: data.why == null ? "" : String(data.why) };
  return { kind: "waiting", st: st === "work" ? "work" : "new" };
}

// ---------------------------------------------------------------------------------------------------------------------
// J112 R2b (5 Nov 2026) -- WRITING BY REQUEST: NOTES. The same contract ("Writing (R2)", MMJ-SHARE.md), its note ops.
// `base` is the note's updatedAt exactly as read from mmj/n~...; Siyagah refuses a base that is not its note's own
// ("changed in Siyagah since", with cur) and never overwrites a newer change. Still pure.

/** The fields each note op MAY carry, exactly as the contract lists them (`kind` optional on an add; an edit carries any of title/content/tags/kind). */
export const MMJ_NOTE_OPS = Object.freeze({
  "note.add": Object.freeze(["id", "title", "content", "tags", "folderIds", "kind"]),
  "note.edit": Object.freeze(["id", "base", "title", "content", "tags", "kind"]),
  "note.move": Object.freeze(["id", "base", "folderIds"]),
  "note.delete": Object.freeze(["id", "base"]),
  "note.vis": Object.freeze(["id", "vis"]),
});
export const MMJ_TITLE_MAX = 300;
export const MMJ_TAGS_MAX = 60;
export const MMJ_TAG_MAX = 100;
export const MMJ_FOLDER_IDS_MAX = 20;
export const MMJ_CONTENT_MAX = 900 * 1024; // bytes of UTF-8

/** The UTF-8 length of a string, counted without any browser or Node API. */
export function utf8Length(s) {
  let n = 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length && (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

/** Plain text typed into a box, as a note's HTML: a blank line starts a new <p>, a single line break is a <br>; every character escaped. */
export function textToNoteHtml(text) {
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  return String(text == null ? "" : text).replace(/\r\n?/g, "\n").split(/\n[ \t]*\n+/)
    .map((p) => p.replace(/^\n+|\n+$/g, "")).filter((p) => p.trim() !== "")
    .map((p) => `<p>${p.split("\n").map(esc).join("<br>")}</p>`).join("");
}

/** The note's folders that are MMJ folders (in the tree this app holds). */
export function mmjFolderIdsOf(note, folders) {
  const ids = new Set((folders || []).map((f) => f.id));
  return (note?.folderIds || []).filter((x) => ids.has(x));
}

/**
 * Build one note request (without `at`). `copy` is the copy as this app shows it (folders and notes); `from` 'msa' or
 * 'qr'. Returns { ok:true, req } with EXACTLY the envelope (minus `at`) and the fields given (each one the op lists), or
 * { ok:false, reason } -- the refusals Siyagah would give, said before asking. `base` must be the note's updatedAt as
 * this copy holds it (a different one is "changed in Siyagah since": the copy is newer than what the reader changed).
 */
export function buildNoteRequest(op, fields, { copy = null, from = "msa" } = {}) {
  const want = MMJ_NOTE_OPS[op];
  if (!want) return { ok: false, reason: "unknown op" };
  if (from !== "msa" && from !== "qr") return { ok: false, reason: "bad from" };
  const f = fields || {};
  for (const k of Object.keys(f)) if (!want.includes(k)) return { ok: false, reason: `unknown field "${k}"` };
  if (!isMmjId(f.id)) return { ok: false, reason: "bad id" };
  const folders = copy?.tree?.folders || [];
  const folderSet = new Set(folders.map((x) => x.id));
  const note = copy?.notes?.[f.id] || null;
  const req = { v: 1, op, from, st: "new", id: f.id };
  if (op === "note.add") { if (note) return { ok: false, reason: "id already used" }; }
  else if (!note) return { ok: false, reason: "not a Mapping My Journey note" };
  if (op === "note.edit" || op === "note.move" || op === "note.delete") {
    if (typeof f.base !== "string" || !f.base) return { ok: false, reason: "base is required" };
    if (f.base !== note.updatedAt) return { ok: false, reason: "changed in Siyagah since" };
    req.base = f.base;
  }
  if (op === "note.edit" && !["title", "content", "tags", "kind"].some((k) => k in f)) return { ok: false, reason: "nothing to change" };
  if ("title" in f || op === "note.add") {
    if (f.title != null && typeof f.title !== "string") return { ok: false, reason: "bad title" };
    const title = cleanMmjName(f.title);
    if (title.length > MMJ_TITLE_MAX) return { ok: false, reason: "bad title" };
    req.title = title;
  }
  if ("content" in f || op === "note.add") {
    const c = f.content == null ? "" : f.content;
    if (typeof c !== "string" || utf8Length(c) > MMJ_CONTENT_MAX) return { ok: false, reason: "bad content" };
    req.content = c;
  }
  if ("tags" in f || op === "note.add") {
    const tags = f.tags == null ? [] : f.tags;
    if (!Array.isArray(tags) || tags.length > MMJ_TAGS_MAX) return { ok: false, reason: "bad tags" };
    const out = [];
    for (const tg of tags) {
      if (typeof tg !== "string") return { ok: false, reason: "bad tags" };
      const c = cleanMmjName(tg);
      if (!c || c.length > MMJ_TAG_MAX || c.includes(",")) return { ok: false, reason: "bad tags" };
      if (!out.includes(c)) out.push(c);
    }
    req.tags = out;
  }
  if (op === "note.add" || op === "note.move") {
    if (!Array.isArray(f.folderIds)) return { ok: false, reason: "folderIds must be 1 to 20 folders" };
    const uniq = [...new Set(f.folderIds)];
    if (uniq.length < 1 || uniq.length > MMJ_FOLDER_IDS_MAX) return { ok: false, reason: "folderIds must be 1 to 20 folders" };
    if (!uniq.every((x) => typeof x === "string" && folderSet.has(x))) return { ok: false, reason: "not a Mapping My Journey folder" };
    req.folderIds = uniq;
  }
  if ("kind" in f && f.kind !== undefined) {
    if (typeof f.kind !== "string" || !f.kind || f.kind.length > 100) return { ok: false, reason: "bad kind" };
    req.kind = f.kind;
  }
  if (op === "note.vis") {
    if (f.vis !== 1 && f.vis !== 0) return { ok: false, reason: "vis must be 1 or 0" };
    req.vis = f.vis;
  }
  return { ok: true, req };
}

/** Has the copy caught up with this note request? (An edit: the copy holds a version other than the one it was based on.) */
function noteReflected(copy, req) {
  const n = copy?.notes?.[req.id] || null;
  switch (req.op) {
    case "note.add": return !!n;
    case "note.edit": return !n || n.updatedAt !== req.base;
    case "note.move": {
      if (!n) return true;
      const have = mmjFolderIdsOf(n, copy?.tree?.folders).slice().sort();
      return JSON.stringify(have) === JSON.stringify(req.folderIds.slice().sort());
    }
    case "note.delete": return !n;
    case "note.vis": return !n || n.vis === req.vis;
    default: return true;
  }
}

/** A note as it shows while its request is out (the copy's own note is never changed). */
function notePending(notes, folders, r) {
  const n = notes[r.id];
  if (r.op === "note.add") {
    if (!n) notes[r.id] = { id: r.id, title: r.title, content: r.content, tags: r.tags.slice(), folderIds: r.folderIds.slice(), kind: r.kind ?? null, createdAt: null, updatedAt: null, vis: 0, at: 0 };
    return true;
  }
  if (!n) return false;
  const m = { ...n };
  if (r.op === "note.edit") { for (const k of ["title", "content", "kind"]) if (k in r) m[k] = r[k]; if ("tags" in r) m.tags = r.tags.slice(); }
  else if (r.op === "note.move") {
    // Siyagah sets only the MMJ part; a note's other folders are kept.
    const mmj = new Set((folders || []).map((f) => f.id));
    m.folderIds = (n.folderIds || []).filter((x) => !mmj.has(x)).concat(r.folderIds);
  } else if (r.op === "note.vis") m.vis = r.vis;
  // note.delete: the row stays, marked, until Siyagah's copy drops it.
  notes[r.id] = m;
  return true;
}
