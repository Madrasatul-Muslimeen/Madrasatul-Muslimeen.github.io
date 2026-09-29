// The app language, synced to the ACCOUNT (v07.37).
//
// The owner's ask, in their words: "A setting user does in one device
// should reflect in any device when signing, setting again is just
// annoying." Before this the language lived in localStorage alone (their
// own v07.30 call, taken to keep it off the startup path), so it was per
// BROWSER -- set Bangla on the phone and the tablet still opened in
// English.
//
// ---------------------------------------------------------------------
// WHERE IT IS STORED, AND WHY THAT COSTS NOTHING
// ---------------------------------------------------------------------
// On `userIndex/{uid}`, as one extra field. That document is ALREADY read
// by every signed-in page in this app, in the same auth bootstrap that
// resolves the person's default tenant -- so this adds:
//
//   - no new Firestore read (the snapshot is already in hand)
//   - no new collection
//   - nothing at all to the pre-first-paint path
//
// which is the whole reason it is here rather than in a `userPrefs`
// collection of its own. The load-speed contract (Architecture Part 8)
// allows exactly three reads after first paint -- userIndex, enrolments,
// bookmarks -- and this rides on the first of them. I9 is satisfied
// because the startup path did not change at all.
//
// It DOES need one firestore.rules change: userIndex's update rule pins
// the writable fields with hasOnly(), so 'appLang' had to be added to that
// list. Nothing else in the rules moved.
//
// ---------------------------------------------------------------------
// WHY THIS IS A SEPARATE FILE FROM js/prefs.js
// ---------------------------------------------------------------------
// prefs.js is imported by PURE RENDERERS -- asma-renderer.js reads
// getAppLang(), nav.js reads APP_LANGS -- and those must never gain a
// Firebase dependency (I2). So prefs.js stays Firebase-free and owns the
// synchronous, localStorage half; this file owns the Firestore half and is
// imported only by page controllers, which already talk to Firebase.
//
// ---------------------------------------------------------------------
// WHICH VALUE WINS
// ---------------------------------------------------------------------
// The account's, on load; and every change on any device writes to the
// account. So the last change made ANYWHERE is what every other device
// picks up next time it loads. That is exactly what the owner asked for,
// and it means there is no merge to reason about: no timestamps compared,
// no per-device precedence. A change made offline is queued by Firestore's
// own persistence (D5) and lands when that device reconnects, so the
// "last change" is really the last one to reach the server.

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { updateDocument } from "./envelope.js";
import { safeWrite } from "./errors.js";
import { adoptAppLang, mountAppLangControl, reloadOnAppLangChange } from "./prefs.js";

/**
 * Adopt the account's language, given the userIndex snapshot the calling
 * page has ALREADY read. Pass the snapshot itself; a missing document, a
 * document with no appLang, or a value matching this device is a no-op.
 *
 * Returns true if it reloaded the page, in which case the caller should
 * stop what it is doing:
 *
 *   if (adoptAppLangFromUserIndex(userIndexSnap)) return;
 *
 * That one line is the entire read side, and it goes immediately after the
 * existing getDoc so the language settles before anything renders.
 */
export function adoptAppLangFromUserIndex(userIndexSnap) {
  const stored = userIndexSnap?.exists?.() ? userIndexSnap.data()?.appLang : null;
  if (!stored || !adoptAppLang(stored)) return false;
  location.reload();
  return true;
}

/**
 * Same thing when the snapshot is not already in hand. Only for a caller
 * with no userIndex read of its own -- prefer the function above, which
 * costs nothing.
 */
export async function adoptAppLangForUid(db, uid) {
  if (!uid) return false;
  try {
    return adoptAppLangFromUserIndex(await getDoc(doc(db, TENANT.USER_INDEX, uid)));
  } catch {
    // Best-effort: never let a preference read break a page's bootstrap.
    return false;
  }
}

/**
 * Save the chosen language to the account. Goes through safeWrite() like
 * every other write in this app, so a failure is reported to the reader,
 * logged, and recorded in the session buffer the admin self-check (F-008)
 * reads -- I15, the standard way, rather than a second private channel.
 *
 * Note this can only ever be an UPDATE: userIndex/{uid} is created when the
 * person first gets an account, and every caller here has already read it.
 * A person with no userIndex document has no account to sync to yet, and
 * their choice stays on the device, which is correct.
 */
export async function pushAppLang(db, uid, lang) {
  if (!uid) return { ok: true };
  return safeWrite(
    () => updateDocument(db, TENANT.USER_INDEX, uid, { appLang: lang }),
    { collection: TENANT.USER_INDEX, docId: uid, action: "setAppLang" }
  );
}

// How long to wait for the save before giving up and reloading anyway.
// Offline, Firestore's own persistence queues the write and it lands on
// reconnect -- so a slow answer is not a failure and must not hold the
// reader up. Only a real REJECTION (permission denied, most likely because
// the rules change below has not been deployed yet) is worth stopping for.
const SAVE_WAIT_MS = 1500;

/**
 * The Language control in Home -> Settings, wired to save to the account.
 *
 * Drop-in replacement for prefs.js's mountAppLangControl() on any page that
 * has a db and a signed-in uid. The local change always applies -- that is
 * what the reader asked for, and it must never depend on the network. Only
 * the SAVE can fail.
 */
export function mountSyncedAppLangControl(container, { db, uid, onChange = reloadOnAppLangChange } = {}) {
  return mountAppLangControl(container, async (lang) => {
    const outcome = await Promise.race([
      pushAppLang(db, uid, lang),
      new Promise((resolve) => setTimeout(() => resolve({ ok: true, pending: true }), SAVE_WAIT_MS)),
    ]);
    // On failure, deliberately do NOT reload: safeWrite() has just put the
    // reason on screen and a reload would throw it away before it could be
    // read. The language itself has already changed on this device, so
    // every page opened next is in it either way -- what failed is only
    // the part that would have carried it to another device.
    if (outcome.ok) onChange(lang);
  });
}
