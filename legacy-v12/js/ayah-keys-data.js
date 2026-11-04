// Keys to Understanding -- the saving layer (PCF J03, Builder round K2, 14 Oct 2026).
//
// One document per sūrah per scope, so opening a sūrah costs at most TWO reads and
// only when the keys are first shown (I9):
//   ayahKeyMarks/{tenantId}__madrasah__{surah}   the madrasah's keys
//   ayahKeyMarks/{tenantId}__{personId}__{surah} one person's own keys
// Each holds `entries`: { [ayah unit key]: [key ids] }, where the unit key is
// buildUnitKey.ayah(surah, ayah) (I5). Removing a key writes the SHORTER list; the
// document is never deleted and an empty list stays an empty list (I4, D6).
//
// K2: NO PAGE IMPORTS THIS MODULE. The Rules it needs are a CANDIDATE only
// (docs/governance/2026-10-15-ayah-keys-candidate.rules), not published. Nothing
// here runs at start-up (I9). Every write goes through envelope.js inside
// safeWrite() (I15: a failed save reaches the user).
//
// Every function takes `ctx = { tenantId, personId, uid }`.

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

const docKey = (tenantId, scope, surah) => `${tenantId}__${scope}__${surah}`;

function requireCtx(ctx) {
  if (!ctx || !ctx.tenantId || !ctx.personId || !ctx.uid) {
    throw new Error("ayah-keys-data: ctx must carry tenantId, personId and uid.");
  }
}

const validSurah = (n) => Number.isInteger(n) && n >= 1 && n <= 114;

/**
 * The madrasah's keys and this person's own keys for one sūrah: `{ madrasah, mine }`, each a map
 * from an āyah's unit key to its list of key ids ({} when nothing is marked yet). Two reads, no more.
 */
export async function loadSurahKeys(db, ctx, surah) {
  requireCtx(ctx);
  if (!validSurah(surah)) throw new Error("ayah-keys-data: surah must be a whole number from 1 to 114.");
  const read = async (scope) => {
    const snap = await getDoc(doc(db, TENANT.AYAH_KEY_MARKS, docKey(ctx.tenantId, scope, surah)));
    return snap.exists() ? { ...(snap.data().entries || {}) } : {};
  };
  const [madrasah, mine] = await Promise.all([read(MADRASAH_SCOPE), read(ctx.personId)]);
  return { madrasah, mine };
}

/**
 * Switch one key on or off for one āyah. `scope` is "madrasah" or a personId.
 * Returns `{ ok: true, keys }` (the āyah's list now), `{ ok: false, refused }` when the request itself is
 * wrong, or `{ ok: false, entry }` when the save failed (already reported to the user, I15).
 */
export async function setAyahKey(db, ctx, { scope, surah, ayah, keyId, on } = {}) {
  requireCtx(ctx);
  if (!isKeyId(keyId)) return { ok: false, refused: "unknown-key" };
  if (!validSurah(surah) || !Number.isInteger(ayah) || ayah < 1) return { ok: false, refused: "bad-ayah" };
  if (typeof scope !== "string" || !scope || scope.includes("__")) return { ok: false, refused: "bad-scope" };
  const unitKey = buildUnitKey.ayah(surah, ayah);
  const id = docKey(ctx.tenantId, scope, surah);
  let keys = [];
  const res = await safeWrite(async () => {
    const ref = doc(db, TENANT.AYAH_KEY_MARKS, id);
    const snap = await getDoc(ref);
    const current = snap.exists() ? (snap.data().entries || {})[unitKey] : null;
    const had = Array.isArray(current) ? current : [];
    keys = on ? (had.includes(keyId) ? had : [...had, keyId]) : had.filter((k) => k !== keyId);
    if (!snap.exists() && !on) return; // nothing marked, nothing to remove: no document is made just to hold an empty list
    if (snap.exists()) {
      await updateDocument(db, TENANT.AYAH_KEY_MARKS, id, { [`entries.${unitKey}`]: keys });
    } else {
      await createDocument(db, TENANT.AYAH_KEY_MARKS, id,
        { tenantId: ctx.tenantId, scope, surah, entries: { [unitKey]: keys } }, ctx.uid);
    }
  }, { collection: TENANT.AYAH_KEY_MARKS, docId: id, action: "set āyah key" });
  return res.ok ? { ok: true, keys } : res;
}
