/**
 * PCF MSA J106 S3 part 1 -- the madrasah's Subjects are editable: their names, their order, adding a Subject, and
 * retiring one. The pure half, with NO Firebase and no DOM import, so the rules of the edit are checkable alone.
 *
 * Where it lives: ONE extra map, `subjectMeta`, on the document that already exists, hadithSubjects/{tenantId}
 * (the published Rules need no change: they pin tenantId/createdBy/createdAt/schemaVersion, require `subjects` to stay
 * a map, and allow owner/prime to write anything else). Each key is a Subject id:
 *   subjectMeta.<id> = { name?: { en, bn }, order: number, status: "active" | "retired", updatedAt, updatedBy }
 * A built-in Subject (the four the app ships) has meta only once someone edits it; until then it is its shipped self.
 * A Subject the madrasah adds has an id `s-` + 8 hex characters and always has meta (its name has to live somewhere).
 *
 * Nothing is deleted (I4/D6): retiring sets status "retired". No key is ever removed from subjectMeta, and a retired
 * Subject keeps its hadith list in `subjects.<id>` untouched, so restoring it brings everything back.
 */

export const CUSTOM_ID = /^s-[0-9a-f]{8}$/;
const NAME_MAX = 120;

const clean = (s) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, NAME_MAX) : "");

/** A Subject id is valid when it is a built-in id or a madrasah-made one. */
export function isSubjectId(id, builtins) {
  return typeof id === "string" && (builtins.some((b) => b.id === id) || CUSTOM_ID.test(id));
}

/** The document's subjectMeta, read defensively (only well-formed entries, ids that are built-in or `s-xxxxxxxx`). */
export function subjectMetaFrom(docData, builtins) {
  const src = docData?.subjectMeta;
  const out = {};
  if (!src || typeof src !== "object") return out;
  for (const [id, m] of Object.entries(src)) {
    if (!isSubjectId(id, builtins) || !m || typeof m !== "object") continue;
    const e = {};
    if (m.name && typeof m.name === "object") {
      const name = { en: clean(m.name.en), bn: clean(m.name.bn) };
      if (name.en || name.bn) e.name = name;
    }
    if (Number.isFinite(Number(m.order))) e.order = Number(m.order);
    e.status = m.status === "retired" ? "retired" : "active";
    if (m.updatedAt) e.updatedAt = m.updatedAt;
    if (m.updatedBy) e.updatedBy = m.updatedBy;
    out[id] = e;
  }
  return out;
}

/**
 * Every Subject the reader can see, in order. `builtins` is [{ id, name, about }] (the shipped four).
 * Returns [{ id, name, nameOverride, about, custom, retired, order }]; `includeRetired` keeps retired ones (for the
 * edit panel, which restores them). A built-in's `name` stays the shipped English text (the caller translates it with
 * t()); `nameOverride` is { en, bn } when the madrasah has renamed it or made it.
 */
export function effectiveSubjects(builtins, meta, { includeRetired = false } = {}) {
  const list = builtins.map((b, i) => {
    const m = meta?.[b.id];
    return { id: b.id, name: b.name, nameOverride: m?.name ?? null, about: b.about, custom: false, retired: m?.status === "retired", order: Number.isFinite(m?.order) ? m.order : (i + 1) * 10 };
  });
  for (const [id, m] of Object.entries(meta ?? {})) {
    if (builtins.some((b) => b.id === id) || !CUSTOM_ID.test(id)) continue;
    list.push({ id, name: m.name?.en || m.name?.bn || id, nameOverride: m.name ?? null, about: "", custom: true, retired: m.status === "retired", order: Number.isFinite(m.order) ? m.order : 1000 });
  }
  // A stable sort: equal orders keep the shipped-then-added order.
  const ordered = list.map((s, i) => ({ s, i })).sort((a, b) => a.s.order - b.s.order || a.i - b.i).map((x) => x.s);
  return includeRetired ? ordered : ordered.filter((s) => !s.retired);
}

/** The Subject's name in `lang` ("en" | "bn"): the madrasah's own wording when it has one, else null (use the shipped text). */
export function overrideName(subject, lang) {
  const n = subject?.nameOverride;
  if (!n) return null;
  return (lang === "bn" ? n.bn || n.en : n.en || n.bn) || null;
}

const stamp = ({ by, at }) => ({ updatedAt: at, updatedBy: by });

/** Every Subject's order, rewritten as 10, 20, 30... in the visible order (so a move never ties). */
function renumbered(builtins, meta) {
  const next = { ...meta };
  effectiveSubjects(builtins, meta, { includeRetired: true }).forEach((s, i) => {
    next[s.id] = { status: s.retired ? "retired" : "active", ...(meta[s.id] ?? {}), order: (i + 1) * 10 };
  });
  return next;
}

/** A new meta with Subject `id` renamed. Both names empty is refused (`error`); nothing changes when the name is the same. */
export function renameSubject(builtins, meta, id, { en, bn }, ctx) {
  if (!isSubjectId(id, builtins)) return { meta, changed: false, error: "unknown" };
  const name = { en: clean(en), bn: clean(bn) };
  if (!name.en && !name.bn) return { meta, changed: false, error: "empty" };
  const cur = meta[id]?.name;
  if (cur && cur.en === name.en && cur.bn === name.bn) return { meta, changed: false };
  const base = meta[id] ?? { status: "active" };
  const order = Number.isFinite(base.order) ? base.order : effectiveSubjects(builtins, meta, { includeRetired: true }).find((s) => s.id === id).order;
  return { meta: { ...meta, [id]: { ...base, name, order, ...stamp(ctx) } }, changed: true };
}

/** A new meta with Subject `id` moved one place up (dir -1) or down (+1) among the visible Subjects. */
export function moveSubject(builtins, meta, id, dir, ctx) {
  const vis = effectiveSubjects(builtins, meta, { includeRetired: true }).filter((s) => !s.retired);
  const i = vis.findIndex((s) => s.id === id);
  const j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= vis.length) return { meta, changed: false };
  // Renumber every Subject in the current order, swap the two, and stamp only the two that moved.
  const all = effectiveSubjects(builtins, meta, { includeRetired: true });
  const ai = all.findIndex((s) => s.id === id), aj = all.findIndex((s) => s.id === vis[j].id);
  [all[ai], all[aj]] = [all[aj], all[ai]];
  const next = renumbered(builtins, meta);
  all.forEach((s, k) => {
    const moved = s.id === id || s.id === vis[j].id;
    next[s.id] = { ...next[s.id], order: (k + 1) * 10, ...(moved ? stamp(ctx) : {}) };
  });
  return { meta: next, changed: true };
}

/** A new meta with a Subject the madrasah makes. `newId` is `s-` + 8 hex characters (the caller draws it). */
export function addSubject(builtins, meta, { en, bn }, newId, ctx) {
  if (!CUSTOM_ID.test(newId) || meta[newId] || builtins.some((b) => b.id === newId)) return { meta, changed: false, error: "id" };
  const name = { en: clean(en), bn: clean(bn) };
  if (!name.en && !name.bn) return { meta, changed: false, error: "empty" };
  const last = Math.max(0, ...effectiveSubjects(builtins, meta, { includeRetired: true }).map((s) => s.order));
  return { meta: { ...meta, [newId]: { name, order: last + 10, status: "active", ...stamp(ctx) } }, changed: true, id: newId };
}

/** A new meta with Subject `id` retired (retired true) or restored (false). The key stays; so does its hadith list. */
export function setSubjectRetired(builtins, meta, id, retired, ctx) {
  if (!isSubjectId(id, builtins)) return { meta, changed: false, error: "unknown" };
  const status = retired ? "retired" : "active";
  const cur = effectiveSubjects(builtins, meta, { includeRetired: true }).find((s) => s.id === id);
  if (!cur || cur.retired === !!retired) return { meta, changed: false };
  if (retired && effectiveSubjects(builtins, meta).length <= 1) return { meta, changed: false, error: "last" };
  const base = meta[id] ?? {};
  return { meta: { ...meta, [id]: { ...base, order: Number.isFinite(base.order) ? base.order : cur.order, status, ...stamp(ctx) } }, changed: true };
}
