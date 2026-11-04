// Keys to Understanding -- the saving layer (PCF J03, Builder round K2, 14 Oct 2026; K0, 4 Nov 2026).
//
// QUR'AN: one document per sūrah per scope, so opening a sūrah costs at most TWO reads and only when the
// keys are first shown (I9):
//   ayahKeyMarks/{tenantId}__madrasah__{surah}   the madrasah's keys
//   ayahKeyMarks/{tenantId}__{personId}__{surah} one person's own keys
// Each holds `entries`: { [unit key]: [key ids] }. The unit key is buildUnitKey.ayah(surah, ayah) for an āyah
// and (K0) buildUnitKey.qword(surah, ayah, position) for one of its words: a word's marks live with its
// sūrah's āyah marks, so the Status wheel's three views (āyāt of a sūrah; words of one āyah; words of every
// āyah) are all read from the same one document.
//
// HADITH (K0): the same shape, one document per hadith collection per scope:
//   hadithKeyMarks/{tenantId}__madrasah__{collection}   hadithKeyMarks/{tenantId}__{personId}__{collection}
// with buildUnitKey.hadith(collection, number) for a hadith and buildUnitKey.hadithWord(collection, number,
// position) for one of its words. `collection` is the key's own collection part, and only a collection whose key
// the Owner has decided is accepted (HADITH_KEY_COLLECTIONS: "hadeethenc", decision 7).
//
// Removing a key writes the SHORTER list; the document is never deleted and an empty list stays an empty
// list (I4, D6).
//
// NO PAGE IMPORTS THIS MODULE YET. The Rules it needs are a CANDIDATE only
// (docs/governance/2026-10-15-ayah-keys-candidate.rules), not published. Nothing here runs at start-up (I9).
// Every write goes through envelope.js inside safeWrite() (I15: a failed save reaches the user).
//
// Every function takes `ctx = { tenantId, personId, uid }`. Each set* returns `{ ok: true, keys }` (that
// item's list now), `{ ok: false, refused }` when the request itself is wrong (nothing read or written), or
// `{ ok: false, entry }` when the save failed (already reported to the user, I15).

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";
import { safeWrite } from "./errors.js";
import { buildUnitKey } from "./unit-keys.js";
import { isKeyId, MADRASAH_SCOPE } from "./ayah-keys.js";

/** Every field this module can ever put on an ayahKeyMarks document (the Rules candidate must allow all of them). */
export const AYAH_KEY_WRITES = Object.freeze([
  "tenantId", "scope", "surah", "entries",
]);

/** Every field this module can ever put on a hadithKeyMarks document (the Rules candidate must allow all of them). */
export const HADITH_KEY_WRITES = Object.freeze([
  "tenantId", "scope", "collection", "entries",
]);

const docKey = (tenantId, scope, part) => `${tenantId}__${scope}__${part}`;

function requireCtx(ctx) {
  if (!ctx || !ctx.tenantId || !ctx.personId || !ctx.uid) {
    throw new Error("ayah-keys-data: ctx must carry tenantId, personId and uid.");
  }
}

const validSurah = (n) => Number.isInteger(n) && n >= 1 && n <= 114;
const validPos = (n) => Number.isInteger(n) && n >= 1;
const validScope = (s) => typeof s === "string" && s.length > 0 && !s.includes("__");
/**
 * The hadith collections whose permanent unit key is DECIDED: HadeethEnc only (Owner decision 7, 26 Sep 2026,
 * `hadith:hadeethenc:<id>`). Every other edition's key is still undecided, so no mark can be saved on it; adding
 * one here is an Owner decision (tools/i18n-verify/hadith-gate-contracts.mjs holds this list to that). The Rules
 * candidate accepts any a-z/0-9/- id, so a decided edition later needs no Rules change.
 */
export const HADITH_KEY_COLLECTIONS = Object.freeze(["hadeethenc"]);
const validCollection = (c) => typeof c === "string" && /^[a-z0-9-]{1,40}$/.test(c) && HADITH_KEY_COLLECTIONS.includes(c);
/** A hadith number: a whole number from 1, or digits optionally followed by lower-case letters ("3199", "12a"). */
function hadithNumber(n) {
  if (Number.isInteger(n) && n >= 1) return String(n);
  if (typeof n === "string" && /^[1-9][0-9]{0,6}[a-z]{0,3}$/.test(n)) return n;
  return null;
}

/** Reads one document's `entries` (a copy; {} when it does not exist). */
async function readEntries(db, col, id) {
  const snap = await getDoc(doc(db, col, id));
  return snap.exists() ? { ...(snap.data().entries || {}) } : {};
}

/** Switches `keyId` on or off for `unitKey` in document `col/id`, creating it with `fields` on the first mark. */
async function toggleKey(db, ctx, col, id, fields, unitKey, keyId, on, action) {
  let keys = [];
  const res = await safeWrite(async () => {
    const ref = doc(db, col, id);
    const snap = await getDoc(ref);
    const current = snap.exists() ? (snap.data().entries || {})[unitKey] : null;
    const had = Array.isArray(current) ? current : [];
    keys = on ? (had.includes(keyId) ? had : [...had, keyId]) : had.filter((k) => k !== keyId);
    if (!snap.exists() && !on) return; // nothing marked, nothing to remove: no document is made just to hold an empty list
    if (snap.exists()) {
      await updateDocument(db, col, id, { [`entries.${unitKey}`]: keys });
    } else {
      await createDocument(db, col, id, { ...fields, entries: { [unitKey]: keys } }, ctx.uid);
    }
  }, { collection: col, docId: id, action });
  return res.ok ? { ok: true, keys } : res;
}

// --- Qur'an ------------------------------------------------------------------

function requireSurah(surah) {
  if (!validSurah(surah)) throw new Error("ayah-keys-data: surah must be a whole number from 1 to 114.");
}

/**
 * The madrasah's keys and this person's own keys for one sūrah: `{ madrasah, mine }`, each a map from a unit
 * key (āyah or word) to its list of key ids ({} when nothing is marked yet). Two reads, no more.
 */
export async function loadSurahKeys(db, ctx, surah) {
  requireCtx(ctx);
  requireSurah(surah);
  const [madrasah, mine] = await Promise.all([
    readEntries(db, TENANT.AYAH_KEY_MARKS, docKey(ctx.tenantId, MADRASAH_SCOPE, surah)),
    readEntries(db, TENANT.AYAH_KEY_MARKS, docKey(ctx.tenantId, ctx.personId, surah)),
  ]);
  return { madrasah, mine };
}

/**
 * ONE other person's own keys for one sūrah (the teacher's view, PCF J03 Q4): a map from unit key to key ids.
 * One read. Whether the reader may see them is the Rules' call (canRecordFor), never this function's.
 */
export async function loadPersonSurahKeys(db, ctx, surah, personId) {
  requireCtx(ctx);
  requireSurah(surah);
  if (!validScope(personId) || personId === MADRASAH_SCOPE) throw new Error("ayah-keys-data: personId must be a person's id.");
  return readEntries(db, TENANT.AYAH_KEY_MARKS, docKey(ctx.tenantId, personId, surah));
}

/** Switch one key on or off for one āyah. `scope` is "madrasah" or a personId. */
export async function setAyahKey(db, ctx, { scope, surah, ayah, keyId, on } = {}) {
  requireCtx(ctx);
  if (!isKeyId(keyId)) return { ok: false, refused: "unknown-key" };
  if (!validSurah(surah) || !validPos(ayah)) return { ok: false, refused: "bad-ayah" };
  if (!validScope(scope)) return { ok: false, refused: "bad-scope" };
  return toggleKey(db, ctx, TENANT.AYAH_KEY_MARKS, docKey(ctx.tenantId, scope, surah),
    { tenantId: ctx.tenantId, scope, surah }, buildUnitKey.ayah(surah, ayah), keyId, !!on, "set āyah key");
}

/** Switch one key on or off for one WORD of an āyah (`position` counted from 1, as the Word card counts it). */
export async function setWordKey(db, ctx, { scope, surah, ayah, position, keyId, on } = {}) {
  requireCtx(ctx);
  if (!isKeyId(keyId)) return { ok: false, refused: "unknown-key" };
  if (!validSurah(surah) || !validPos(ayah)) return { ok: false, refused: "bad-ayah" };
  if (!validPos(position)) return { ok: false, refused: "bad-word" };
  if (!validScope(scope)) return { ok: false, refused: "bad-scope" };
  return toggleKey(db, ctx, TENANT.AYAH_KEY_MARKS, docKey(ctx.tenantId, scope, surah),
    { tenantId: ctx.tenantId, scope, surah }, buildUnitKey.qword(surah, ayah, position), keyId, !!on, "set word key");
}

// --- Hadith ------------------------------------------------------------------

function requireCollection(collection) {
  if (!validCollection(collection)) throw new Error("ayah-keys-data: collection must be a hadith collection whose key is decided (HADITH_KEY_COLLECTIONS).");
}

/** The madrasah's keys and this person's own keys for one hadith collection: `{ madrasah, mine }`. Two reads. */
export async function loadHadithKeys(db, ctx, collection) {
  requireCtx(ctx);
  requireCollection(collection);
  const [madrasah, mine] = await Promise.all([
    readEntries(db, TENANT.HADITH_KEY_MARKS, docKey(ctx.tenantId, MADRASAH_SCOPE, collection)),
    readEntries(db, TENANT.HADITH_KEY_MARKS, docKey(ctx.tenantId, ctx.personId, collection)),
  ]);
  return { madrasah, mine };
}

/** ONE other person's own keys for one hadith collection (the teacher's view). One read; the Rules decide. */
export async function loadPersonHadithKeys(db, ctx, collection, personId) {
  requireCtx(ctx);
  requireCollection(collection);
  if (!validScope(personId) || personId === MADRASAH_SCOPE) throw new Error("ayah-keys-data: personId must be a person's id.");
  return readEntries(db, TENANT.HADITH_KEY_MARKS, docKey(ctx.tenantId, personId, collection));
}

/** Switch one key on or off for one hadith. */
export async function setHadithKey(db, ctx, { scope, collection, number, keyId, on } = {}) {
  requireCtx(ctx);
  if (!isKeyId(keyId)) return { ok: false, refused: "unknown-key" };
  const n = hadithNumber(number);
  if (!validCollection(collection) || n === null) return { ok: false, refused: "bad-hadith" };
  if (!validScope(scope)) return { ok: false, refused: "bad-scope" };
  return toggleKey(db, ctx, TENANT.HADITH_KEY_MARKS, docKey(ctx.tenantId, scope, collection),
    { tenantId: ctx.tenantId, scope, collection }, buildUnitKey.hadith(collection, n), keyId, !!on, "set hadith key");
}

/** Switch one key on or off for one WORD of a hadith (`position` counted from 1 among its Arabic words). */
export async function setHadithWordKey(db, ctx, { scope, collection, number, position, keyId, on } = {}) {
  requireCtx(ctx);
  if (!isKeyId(keyId)) return { ok: false, refused: "unknown-key" };
  const n = hadithNumber(number);
  if (!validCollection(collection) || n === null) return { ok: false, refused: "bad-hadith" };
  if (!validPos(position)) return { ok: false, refused: "bad-word" };
  if (!validScope(scope)) return { ok: false, refused: "bad-scope" };
  return toggleKey(db, ctx, TENANT.HADITH_KEY_MARKS, docKey(ctx.tenantId, scope, collection),
    { tenantId: ctx.tenantId, scope, collection }, buildUnitKey.hadithWord(collection, n, position), keyId, !!on, "set hadith word key");
}
