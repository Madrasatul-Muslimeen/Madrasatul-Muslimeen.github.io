/**
 * Keys to Understanding K1 Part B (PCF MSA J03): the marks Difficult / Need practice / Done on a HadeethEnc hadith card
 * (one hadith) and on the Hadith Word Card (one word), on K0's saving layer (ayah-keys-data.js).
 *
 * - Scope is the reader's own personId; the collection is "hadeethenc" (the only hadith key the Owner has decided).
 * - A word is numbered by hadith-words.js (position from 1 over the hadith's Arabic words), the SAME tokeniser the
 *   Hadith Word Card uses, so a mark and the word it sits on can never disagree.
 * - Nothing is read until a marks row first shows, and then ONCE per page (I9); each toggle writes through K0, whose
 *   safeWrite() reports a refused or failed save to the reader (I15). A refusal is also said on the row.
 */
import { auth, db } from "./firebase-init.js";
import { getActiveContext } from "./session-context.js";
import { t } from "./i18n.js";
import { getAppLang } from "./prefs.js";
import { el } from "./hadith-shared-ui.js";
import { MARK_IDS, keyName, marksIn } from "./ayah-keys.js";
import { loadHadithKeys, setHadithKey, setHadithWordKey } from "./ayah-keys-data.js";
import { buildUnitKey } from "./unit-keys.js";
import { hadeethEncUnitKey } from "./hadith-study-actions.js"; // the ONE authorised builder of the HadeethEnc key (hadith-gate-contracts C2)

export const MARKS_COLLECTION = "hadeethenc";

/** { uid, tenantId, personId } for the signed-in reader, or null (signed out: marks are shown off, with a note). */
export function marksSession() {
  const uid = auth.currentUser?.uid ?? null;
  const ctx = getActiveContext();
  if (!uid || !ctx?.tenantId || !ctx?.personId) return null;
  return { uid, tenantId: ctx.tenantId, personId: ctx.personId };
}

let readPromise = null;
let readFor = null;
/** The reader's own marks for the collection: { [unit key]: [key ids] }. Read once per person, on first need. */
export function loadMyMarks(session) {
  const who = `${session.tenantId}|${session.personId}`;
  if (readPromise && readFor === who) return readPromise;
  readFor = who;
  readPromise = loadHadithKeys(db, session, MARKS_COLLECTION).then((r) => r.mine || {});
  readPromise.catch(() => { readPromise = null; });
  return readPromise;
}
/** Test hook: forget what was read. */
export function forgetMarks() { readPromise = null; readFor = null; }

const unitKeyOf = (number, position) => (position ? buildUnitKey.hadithWord(MARKS_COLLECTION, number, position) : hadeethEncUnitKey(number));

/**
 * A row of the three marks. `number` is the HadeethEnc id; `position` (from 1) makes it one word's row.
 * Returns the row element; it fills itself in once the marks are read.
 */
export function hadithMarksRow({ number, position = null, label = null }) {
  const row = el("div", "hkm-row"); row.dataset.hkmRow = position ? `${number}:${position}` : String(number);
  row.setAttribute("role", "group"); row.setAttribute("aria-label", label ?? t(position ? "Marks for this word" : "Marks for this hadith"));
  const note = el("p", "hkm-note"); note.hidden = true; note.setAttribute("role", "status");
  const lang = getAppLang();
  const buttons = new Map();
  for (const id of MARK_IDS) {
    const b = el("button", "hkm-btn", keyName(id, lang)); b.type = "button"; b.dataset.hkmMark = id; b.setAttribute("aria-pressed", "false");
    buttons.set(id, b); row.appendChild(b);
  }
  row.appendChild(note);
  const paint = (keys) => { const have = marksIn(keys); for (const [id, b] of buttons) b.setAttribute("aria-pressed", String(have.includes(id))); };
  const say = (text) => { note.textContent = text ?? ""; note.hidden = !text; };
  const session = marksSession();
  if (!session) { say(t("Sign in to put marks on this.")); for (const b of buttons.values()) b.disabled = true; return row; }
  const uk = unitKeyOf(number, position);
  let current = [];
  loadMyMarks(session).then((mine) => { current = mine[uk] ?? []; paint(current); })
    .catch(() => say(t("Your marks could not be read. Check the connection and open this again.")));
  for (const [id, b] of buttons) {
    b.addEventListener("click", async () => {
      say(null);
      const on = !marksIn(current).includes(id);
      const args = { scope: session.personId, collection: MARKS_COLLECTION, number: String(number), keyId: id, on };
      b.disabled = true;
      let res;
      try { res = position ? await setHadithWordKey(db, session, { ...args, position }) : await setHadithKey(db, session, args); }
      catch { res = { ok: false }; }
      b.disabled = false;
      if (res?.ok) {
        current = res.keys; paint(current);
        const cache = await loadMyMarks(session).catch(() => null); if (cache) cache[uk] = res.keys; // later rows see it without a read
      } else say(t("That mark was not saved. Check the connection and try again."));
    });
  }
  return row;
}
