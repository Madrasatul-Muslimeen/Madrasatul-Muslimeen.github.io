// Note pane Part C3 -- the Firestore half of the across-devices note settings (see note-user-settings.js).
// `userPrefs/{uid}`, field `mmsaNotes` only, ALWAYS setDoc(..., { merge: true }). No other field of the document is ever written
// (the old app keeps `themeColors` there). Nothing here runs until a Note pane first opens (I9).
import { doc, getDoc, setDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { createSettingsStore, SETTINGS_FIELD } from "./note-user-settings.js";

const LEGACY_FOLD_PREFIX = "qr.journeyNoteCollapsed.";
/** The folds earlier rounds kept in this browser alone, read (never deleted) so they can be copied up once. */
export function readLegacyFolds(storage = globalThis.localStorage) {
  const out = {};
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (!k || !k.startsWith(LEGACY_FOLD_PREFIX)) continue;
      try { const v = JSON.parse(storage.getItem(k) || "[]"); if (Array.isArray(v) && v.length) out[k.slice(LEGACY_FOLD_PREFIX.length)] = v; } catch { /* unreadable: skipped */ }
    }
  } catch { /* storage unavailable */ }
  return out;
}

export function createFirestoreSettingsStore({ db, uid, storage = globalThis.localStorage, onChange }) {
  const ref = doc(db, "userPrefs", uid);
  return createSettingsStore({
    uid, storage, onChange, deleteMark: deleteField(),
    legacyFolds: () => readLegacyFolds(storage),
    readRemote: async () => { const s = await getDoc(ref); return s.exists() ? (s.data()?.[SETTINGS_FIELD] ?? null) : null; },
    writeRemote: (patch) => setDoc(ref, { [SETTINGS_FIELD]: patch }, { merge: true }),
  });
}
