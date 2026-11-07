// PCF MSA J112 (d) D2 (the Owner, 3:33 pm 7 Nov 2026) -- MSA NOTES KEPT IN STEP WITH SIYAGAH'S MAPPING MY JOURNEY: THE
// PURE HALF. No Firebase, no DOM, no storage, no clock: every decision about what to send, what to take back and what
// the Note's mark says is made here, from plain data, so tests can prove each rule on its own.
//
// The Owner's rules (plan j112p-d2):
//   (1) 'Primary': a Note not yet allocated to a folder of its own (filed only in the Map's system folder) is in
//       'Primary'; Siyagah gets ONE matching folder, PRIMARY_ID, made once through R2's folder.add.
//   (2) MSA -> Siyagah: every saved change of a Note (new, text, title, filed, moved) becomes ONE request; nothing to
//       tap. The device keeps what is waiting (siyagah-sync.js), so it survives offline and a closed page.
//   (3) Siyagah -> MSA: a linked Note whose Siyagah copy is newer than the last agreed one comes back (title and text).
//   (4) Both changed before they met: the later change wins, and the earlier text is kept as an older version
//       (a revision) on the MSA Note -- nothing is lost.
//   (5) The Approach stays on the MSA copy: it is never sent and never read back (it is not a field here at all).
//
// Siyagah is written ONLY by request (siyagah-mmj-write.js, built by siyagah-mmj-model.js's buildFolderRequest /
// buildNoteRequest), so a request this planner proposes is checked by the very same refusals before it is sent.
//
// The device state for one person (one MSA tenant + person), as siyagah-sync.js stores it:
//   { v: 1, since: <ms, the first time this device kept Notes in step>, primary: { reqId, at } | null,
//     base: { <msaNoteId>: <snapshot hash> } -- an older Note as first met here: remembered, not sent, until it changes,
//     links: { <msaNoteId>: {
//       mmjId,                 // the Note's id in Siyagah (mmjIdForNote)
//       base,                  // Siyagah's updatedAt the two copies last agreed on (null before the first add is seen)
//       sent,                  // the hash of the text (title + content) they last agreed on
//       seen,                  // the hash of the MSA snapshot this device last queued or took back (no loop)
//       want,                  // the MSA snapshot waiting to go: { title, bodyHtml, folders, changedAt, seq } | null
//       inflight,              // { reqId, op, prevBase, seq, sentHash } -- one request at a time per Note
//       awaitBase,             // after a done request: the base it was sent against, until the copy shows the new one
//       refused,               // { seq, why } -- not sent again until the Note changes again
//       fallback,              // true when one of its folders is not in Siyagah, so it went to Primary there
//       gone,                  // true when Siyagah no longer has it (deleted there): never re-added by itself
//     } } }

export const SYNC_STATE_VERSION = 1;
/** Siyagah's folder for the Notes not yet allocated in MSA. Fixed, so it is made ONCE however many devices ask. */
export const PRIMARY_ID = "x-msa-primary";
export const PRIMARY_NAME = "Primary";
/** The MSA Map's system folder that holds a Note not yet allocated (journey-map-contract.js's role). */
export const PRIMARY_ROLE = "journey-map";
export const SYNC_REVISION_PULL = "siyagah-sync";
export const SYNC_REVISION_OLDER = "siyagah-older";
export const SYNC_REVISION_KEPT = "siyagah-kept";
const MAX_FOLDERS = 20; // MMJ_FOLDER_IDS_MAX

/** The Note's id in Siyagah: x-msa-n-<MSA note id>. The MSA id is path-safe hex (newNoteEntityId), so it is an MMJ id. */
export function mmjIdForNote(msaNoteId) {
  const id = `x-msa-n-${String(msaNoteId || "")}`;
  return /^[A-Za-z0-9._:~-]{9,120}$/.test(id) ? id : null;
}

/** A short, stable hash of a string (FNV-1a, 32 bit, as 8 hex digits). Never a security measure: only "did it change". */
export function hashText(s) {
  let h = 0x811c9dc5;
  const str = String(s == null ? "" : s);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
export const textHash = (title, content) => hashText(JSON.stringify([String(title ?? ""), String(content ?? "")]));
const normName = (s) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * One MSA Note as the sync sees it. `folders` is [{ role, path }] -- path the folder's names from the top (a system
 * folder's path is [] and its role says which). Returns { title, bodyHtml, folders, hash }.
 */
export function noteSnapshot({ title = "", bodyHtml = "", folders = [] } = {}) {
  const fl = (folders || []).map((f) => ({ role: f.role || "user", path: (f.path || []).map((x) => String(x ?? "")) }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const snap = { title: String(title ?? ""), bodyHtml: String(bodyHtml ?? ""), folders: fl };
  return { ...snap, hash: hashText(JSON.stringify(snap)) };
}

export function emptySyncState(nowMs) {
  return { v: SYNC_STATE_VERSION, since: Number(nowMs) || 0, primary: null, links: {}, base: {} };
}
/** A stored state, checked: anything else (old, broken, another shape) starts again empty -- never a broken Map. */
export function parseSyncState(value, nowMs) {
  if (!value || typeof value !== "object" || value.v !== SYNC_STATE_VERSION || typeof value.links !== "object" || !value.links) return emptySyncState(nowMs);
  const base = value.base && typeof value.base === "object" ? { ...value.base } : {};
  return { v: SYNC_STATE_VERSION, since: Number(value.since) || Number(nowMs) || 0, primary: value.primary || null, links: { ...value.links }, base };
}

/**
 * Should this saved Note be queued? `note` { noteId, updatedAtMs, createdAtMs, snapshot }. A Note already seen with
 * the same snapshot: no. A Note this device has never seen: only when it was made or changed since the device started
 * keeping Notes in step (state.since) -- an older Note nobody touched is never sent by itself (J112 (e)).
 * Returns the next state (unchanged object when nothing to do).
 */
export function queueNote(state, note, nowMs) {
  const id = note?.noteId;
  const mmjId = mmjIdForNote(id);
  if (!mmjId || !note.snapshot) return state;
  const link = state.links[id];
  if (link && link.seen === note.snapshot.hash) return state;
  let base = state.base || {};
  if (!link) {
    // An older Note this device meets for the first time is only REMEMBERED (its snapshot in `base`), never sent: it
    // goes the first time it changes after that. A Note made or saved since the device started keeping Notes in step
    // goes at once.
    const prev = base[id];
    if (prev === note.snapshot.hash) return state;
    const touched = Math.max(Number(note.updatedAtMs) || 0, Number(note.createdAtMs) || 0);
    if (prev === undefined && !(touched >= state.since)) return { ...state, base: { ...base, [id]: note.snapshot.hash } };
    if (prev !== undefined) { base = { ...base }; delete base[id]; }
  }
  if (link?.gone) return { ...state, links: { ...state.links, [id]: { ...link, seen: note.snapshot.hash } } };
  const seq = ((link?.want?.seq ?? link?.refused?.seq ?? link?.lastSeq) || 0) + 1;
  const { hash, ...snap } = note.snapshot;
  // When the change was made, for rule 4: the moment this device found it (a page's own copy of a Note keeps its old
  // updatedAt after an edit). Erring late only means Siyagah's text is kept as an older version -- never lost.
  const changedAt = Math.max(Number(note.updatedAtMs) || 0, Number(nowMs) || 0);
  const next = {
    mmjId, base: null, sent: null, inflight: null, refused: null, fallback: false, gone: false,
    ...(link || {}),
    seen: hash, lastSeq: seq,
    want: { ...snap, changedAt, seq },
  };
  return { ...state, base, links: { ...state.links, [id]: next } };
}

/** The Siyagah folders the Note goes in: a system folder -> Primary, a user folder -> the Siyagah folder with the same
 * names from the top, else Primary (fallback: true, said on the Note). */
export function targetFolderIds(folders, siyagahFolders) {
  const sf = siyagahFolders || [];
  const byId = new Map(sf.map((f) => [f.id, f]));
  const pathOf = (f) => { const out = []; let x = f, guard = 0; while (x && guard++ < 70) { out.unshift(normName(x.n)); x = x.p ? byId.get(x.p) : null; } return out.join("\u0000"); };
  const byPath = new Map();
  for (const f of sf) if (f.id !== PRIMARY_ID) { const k = pathOf(f); if (!byPath.has(k)) byPath.set(k, f.id); }
  const ids = [];
  let fallback = false;
  for (const f of folders || []) {
    let id = null;
    if (f.role === "user" && f.path?.length) id = byPath.get(f.path.map(normName).join("\u0000")) || null;
    if (!id) { id = PRIMARY_ID; if (f.role === "user") fallback = true; }
    if (!ids.includes(id)) ids.push(id);
  }
  if (!ids.length) ids.push(PRIMARY_ID);
  return { ids: ids.slice(0, MAX_FOLDERS), fallback };
}
const sameSet = (a, b) => { const x = [...new Set(a || [])].sort(), y = [...new Set(b || [])].sort(); return x.length === y.length && x.every((v, i) => v === y[i]); };
const msOf = (iso) => { const t = Date.parse(String(iso || "")); return Number.isFinite(t) ? t : 0; };

/**
 * After the copy changes: settle what the copy now shows (a done request's new base, a Note gone in Siyagah).
 * Returns the next state (the same object when nothing changed).
 */
export function settleWithCopy(state, copy) {
  if (!copy?.tree) return state;
  let links = null;
  for (const [id, l] of Object.entries(state.links)) {
    const cn = copy.notes?.[l.mmjId] || null;
    let n = null;
    if (l.awaitBase !== undefined && cn && cn.updatedAt !== l.awaitBase) {
      n = { ...l, base: cn.updatedAt, sent: l.awaitHash ?? l.sent };
      delete n.awaitBase; delete n.awaitHash;
    } else if (!cn && l.base != null && !l.inflight && l.awaitBase === undefined && !l.gone) {
      n = { ...l, gone: true, want: null };
    }
    if (n) { links = links || { ...state.links }; links[id] = n; }
  }
  let primary = state.primary;
  if (primary && (copy.tree.folders || []).some((f) => f.id === PRIMARY_ID)) primary = null;
  return links || primary !== state.primary ? { ...state, links: links || state.links, primary } : state;
}

/**
 * What to do now, given the copy Siyagah shares. Returns a list of steps, in order:
 *   { kind: "primary", fields }                          -- folder.add Primary (once)
 *   { kind: "send", noteId, op, fields, sentHash, prevBase, fallback } -- one note request
 *   { kind: "pull", noteId, title, bodyHtml, base }      -- Siyagah's newer copy comes back to MSA (rule 3, or rule 4
 *                                                           when Siyagah's change is the later)
 *   { kind: "keep-older", noteId, title, bodyHtml, base } -- rule 4, MSA's change is the later: Siyagah's text is kept
 *                                                           as an older version on the MSA Note first, then MSA's goes
 *   { kind: "adopt", noteId, base }                      -- a copy made elsewhere: agree on it, then send what differs
 *   { kind: "clear", noteId }                            -- nothing left to send for it
 * Never two steps for one Note, and none for a Note with a request still out.
 */
export function planSync(state, copy) {
  const steps = [];
  if (!copy?.tree) return steps;
  const folders = copy.tree.folders || [];
  const hasPrimary = folders.some((f) => f.id === PRIMARY_ID);
  let primaryNeeded = false;
  for (const [noteId, l] of Object.entries(state.links)) {
    if (l.inflight || l.awaitBase !== undefined || l.gone) continue;
    const cn = copy.notes?.[l.mmjId] || null;
    const siyChanged = !!cn && l.base != null && cn.updatedAt !== l.base;
    const w = l.want && !(l.refused && l.refused.seq === l.want.seq) ? l.want : null;
    if (!w) {
      if (siyChanged) steps.push({ kind: "pull", noteId, title: cn.title ?? "", bodyHtml: cn.content ?? "", base: cn.updatedAt });
      continue;
    }
    const target = targetFolderIds(w.folders, folders);
    if (target.ids.includes(PRIMARY_ID) && !hasPrimary) { primaryNeeded = true; continue; }
    const wHash = textHash(w.title, w.bodyHtml);
    if (!cn) {
      if (l.base != null) continue; // was in Siyagah and is gone: settleWithCopy marks it, never re-added by itself
      steps.push({ kind: "send", noteId, op: "note.add", fields: { id: l.mmjId, title: w.title, content: w.bodyHtml, tags: [], folderIds: target.ids }, sentHash: wHash, prevBase: null, fallback: target.fallback });
      continue;
    }
    if (l.base == null) { // an add was done but its copy was never settled (another device made it): agree on it now
      steps.push({ kind: "adopt", noteId, title: cn.title ?? "", bodyHtml: cn.content ?? "", base: cn.updatedAt });
      continue;
    }
    if (siyChanged) {
      if (msOf(cn.updatedAt) > (Number(w.changedAt) || 0)) steps.push({ kind: "pull", noteId, title: cn.title ?? "", bodyHtml: cn.content ?? "", base: cn.updatedAt });
      else steps.push({ kind: "keep-older", noteId, title: cn.title ?? "", bodyHtml: cn.content ?? "", base: cn.updatedAt });
      continue;
    }
    if (wHash !== l.sent) {
      const fields = { id: l.mmjId, base: cn.updatedAt };
      if (String(w.title) !== String(cn.title ?? "")) fields.title = w.title;
      if (String(w.bodyHtml) !== String(cn.content ?? "")) fields.content = w.bodyHtml;
      if (!("title" in fields) && !("content" in fields)) fields.title = w.title;
      steps.push({ kind: "send", noteId, op: "note.edit", fields, sentHash: wHash, prevBase: cn.updatedAt, fallback: target.fallback });
      continue;
    }
    const have = (cn.folderIds || []).filter((x) => folders.some((f) => f.id === x));
    if (!sameSet(have, target.ids)) {
      steps.push({ kind: "send", noteId, op: "note.move", fields: { id: l.mmjId, base: cn.updatedAt, folderIds: target.ids }, sentHash: wHash, prevBase: cn.updatedAt, fallback: target.fallback });
      continue;
    }
    steps.push({ kind: "clear", noteId, fallback: target.fallback });
  }
  if (primaryNeeded && !state.primary) steps.unshift({ kind: "primary", fields: { id: PRIMARY_ID, name: PRIMARY_NAME, parent: null } });
  return steps;
}

/** The state after a step was carried out. `outcome` for "send": { reqId } once sent. */
export function afterStep(state, step, outcome = {}) {
  const l = step.noteId ? state.links[step.noteId] : null;
  const put = (n) => ({ ...state, links: { ...state.links, [step.noteId]: n } });
  switch (step.kind) {
    case "primary": return { ...state, primary: { reqId: outcome.reqId || null, at: outcome.at || 0 } };
    case "send": return l ? put({ ...l, fallback: !!step.fallback, inflight: { reqId: outcome.reqId || null, op: step.op, prevBase: step.prevBase, seq: l.want?.seq || 0, sentHash: step.sentHash } }) : state;
    case "pull": return l ? put({ ...l, base: step.base, sent: textHash(step.title, step.bodyHtml), want: null, seen: outcome.seen ?? l.seen, refused: null }) : state;
    case "keep-older": return l ? put({ ...l, base: step.base }) : state;
    case "adopt": return l ? put({ ...l, base: step.base, sent: textHash(step.title, step.bodyHtml) }) : state;
    case "clear": return l ? put({ ...l, want: null, fallback: !!step.fallback }) : state;
    default: return state;
  }
}

/** A request's answer. `outcome` is requestOutcome()'s { kind: "done" | "refused" | "waiting", why }. */
export function afterAnswer(state, noteId, outcome) {
  const l = state.links[noteId];
  if (!l?.inflight || !outcome || outcome.kind === "waiting") return state;
  const inf = l.inflight;
  const n = { ...l, inflight: null };
  if (outcome.kind === "done") {
    n.awaitBase = inf.prevBase; n.awaitHash = inf.sentHash;
  } else if (outcome.kind === "refused") {
    // "changed in Siyagah since": the copy is newer -- the next plan meets it (rule 4). Anything else: not sent again
    // until the Note changes again, and the reason is said on the Note.
    if (!/changed in Siyagah since/.test(outcome.why || "")) n.refused = { seq: inf.seq, why: outcome.why || "" };
  }
  return { ...state, links: { ...state.links, [noteId]: n } };
}

/**
 * The Note's small mark: null (not linked), or { kind, why? }:
 *   "waiting"  -- a change is waiting to go (or out, not answered yet)
 *   "synced"   -- In Siyagah ✓ (fallback: one of its folders is not in Siyagah, so it is in Primary there)
 *   "refused"  -- Siyagah did not take it (why)
 *   "gone"     -- removed in Siyagah; MSA keeps its copy
 */
export function syncMark(link) {
  if (!link) return null;
  if (link.gone) return { kind: "gone" };
  if (link.refused && (!link.want || link.refused.seq === link.want.seq)) return { kind: "refused", why: link.refused.why || "" };
  if (link.want || link.inflight || link.awaitBase !== undefined || link.base == null) return { kind: "waiting" };
  return { kind: "synced", fallback: !!link.fallback };
}
