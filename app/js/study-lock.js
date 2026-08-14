// F-016 — Study Mode handover lock (Phase 1, Identity & access)
//
// Owner-confirmed meaning: while a managed (child) account is actively
// being studied on -- e.g. a shared family tablet -- switching to a
// DIFFERENT managed person is blocked until the session is explicitly
// ended. This prevents progress being silently misattributed to the wrong
// child, or interrupted by someone else jumping in. It is an accident
// guard, not a security boundary (client-side only, sessionStorage-backed
// -- matches how the owner described the need, not an adversarial threat).
//
// D10 -- IMPORTANT SCOPE NOTE for Phase 3/4 (records/activity, the
// QuranRevival study screens): this lock must ONLY ever be engaged by an
// explicit "hand this device to a child to study independently" action.
// It must NEVER apply to a guardian/teacher recording progress for
// several people in one sitting (e.g. teaching the same Ayah to two
// children, then logging it for each of them, then for themselves, all
// from a simple person-picker). That is normal, fast, expected admin
// behaviour and must never be blocked or require "ending a session" --
// confirmed directly by the owner. A records/progress screen's person
// dropdown should not call acquireStudyLock() at all; only a genuine
// "start independent study session" action should.

import { t } from "./i18n.js";

const STORAGE_KEY = "qr.studyLock";

/** { personId, acquiredAt } or null if no lock is currently held. */
export function getStudyLock() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function acquireStudyLock(personId) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ personId, acquiredAt: new Date().toISOString() }));
}

export function releaseStudyLock() {
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Checks whether switching to targetPersonId is allowed right now. Always
 * allowed if no lock is held, or if the target IS the locked person.
 * Blocked only when a DIFFERENT managed person is currently locked in.
 */
export function canSwitchTo(targetPersonId) {
  const lock = getStudyLock();
  if (!lock) return { allowed: true };
  if (lock.personId === targetPersonId) return { allowed: true };
  return {
    allowed: false,
    // I15's spirit: the ONLY explanation the person gets for a refused
    // switch, so it has to be readable in their own language.
    reason: t("A study session is in progress for another person. End that session first before switching."),
  };
}
