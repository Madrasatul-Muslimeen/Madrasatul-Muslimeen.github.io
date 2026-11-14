/**
 * The pure half of the madrasah's own names for the Hadith books and their chapters (hadithNames/{tenantId}, S3 part 2).
 * No Firebase and no DOM import. The Rules candidate is tests/firestore/hadith-names-v1.proposed.rules.
 *
 * names.<key> = { bn?, en?, status: "active" | "retired", updatedAt, updatedBy }
 *   book key    = the OpenITI version uri with each "." written "_"          e.g. 0256Bukhari_Sahih_JK000110-ara1
 *   chapter key = the book key, two underscores, the chapter id               e.g. 0256Bukhari_Sahih_JK000110-ara1__ch-3
 * A name is retired, never removed (I4/D6); retiring keeps its words so restoring is one tap.
 */
export const NAMES_CAP = 3000; // the same number the Rules cap `names` at
const KEY_RE = /^[A-Za-z0-9_-]{1,160}$/;
const TEXT_MAX = 160;
const clean = (s) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, TEXT_MAX) : "");

export const bookKey = (versionUri) => String(versionUri).replace(/\./g, "_");
export const groupKey = (versionUri, chapterId) => `${bookKey(versionUri)}__${chapterId}`;
export const isNameKey = (key) => typeof key === "string" && KEY_RE.test(key);

/** The document's names, read defensively (only well-formed keys and entries). */
export function namesFrom(docData) {
  const src = docData?.names;
  const out = {};
  if (!src || typeof src !== "object") return out;
  for (const [key, m] of Object.entries(src)) {
    if (!isNameKey(key) || !m || typeof m !== "object") continue;
    const e = { bn: clean(m.bn), en: clean(m.en), status: m.status === "retired" ? "retired" : "active" };
    if (!e.bn && !e.en) continue;
    if (m.updatedAt) e.updatedAt = m.updatedAt;
    if (m.updatedBy) e.updatedBy = m.updatedBy;
    out[key] = e;
  }
  return out;
}

/** A name in `lang` ("en" | "bn"), or null: only an active entry that has words in THAT language counts. */
export function nameOf(names, key, lang) {
  const e = names?.[key];
  if (!e || e.status === "retired") return null;
  return (lang === "bn" ? e.bn : e.en) || null;
}

/** A new names map with `key` named (Bangla and/or English). Empty words are refused; the same words change nothing. */
export function setName(names, key, { bn, en }, { by, at }) {
  if (!isNameKey(key)) return { names, changed: false, error: "key" };
  const next = { bn: clean(bn), en: clean(en) };
  if (!next.bn && !next.en) return { names, changed: false, error: "empty" };
  const cur = names[key];
  if (cur && cur.status !== "retired" && cur.bn === next.bn && cur.en === next.en) return { names, changed: false };
  if (!cur && Object.keys(names).length >= NAMES_CAP) return { names, changed: false, error: "cap" };
  return { names: { ...names, [key]: { ...next, status: "active", updatedAt: at, updatedBy: by } }, changed: true };
}

/** A new names map with the name on `key` retired (its words kept; it simply stops showing). */
export function retireName(names, key, { by, at }) {
  const cur = names[key];
  if (!cur || cur.status === "retired") return { names, changed: false };
  return { names: { ...names, [key]: { ...cur, status: "retired", updatedAt: at, updatedBy: by } }, changed: true };
}

/**
 * What to write: the FIRST write of a madrasah (no document yet) is a create carrying `names`; after that an update of only the
 * names that changed, as dotted paths (`names.<key>`), so two edits to different books never overwrite each other. The
 * envelope adds its own stamps (createdBy/createdAt/schemaVersion on a create, updatedAt on both; I17). The key spelling has no
 * "." in it, so a dotted path can never be split wrongly.
 */
export function writePlan({ tenantId, names, keys = [], docExists }) {
  if (!docExists) return { kind: "create", data: { tenantId, names } };
  const data = {};
  for (const k of keys) data[`names.${k}`] = names[k];
  return { kind: "update", data };
}
