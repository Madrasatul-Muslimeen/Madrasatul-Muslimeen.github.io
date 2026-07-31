// F-008 — Admin self-check screen, probe logic (Phase 0, Foundation)
//
// One tap: every collection reachable, a test write to each that can be
// tested safely, offline queue empty, no silent failures. This is the tool
// that lets a non-coder owner verify the app is healthy without reading
// code -- D8. Bug B1 (a broken personId that silently swallowed months of
// progress saves) would have been caught on day one by a screen like this.

import {
  doc,
  getDoc,
  setDoc,
  waitForPendingWrites,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { LEGACY, TENANT } from "./collections.js";
import { createDocument } from "./envelope.js";
import { safeWrite, getSessionErrorBuffer } from "./errors.js";

const TEST_MARKER_ID = "_selfCheckTest";

function markerField() {
  return { _selfCheck: { at: new Date().toISOString(), note: "safe to ignore — self-check marker" } };
}

/** Additive-only probe write for a LEGACY collection: merges one harmless field, touches nothing else. */
async function legacyProbe(db, collectionName, docId) {
  const ref = doc(db, collectionName, docId);
  await setDoc(ref, markerField(), { merge: true });
}

/**
 * Runs every probe and returns a plain-language result per collection.
 * Never throws -- every probe result, pass or fail, is captured individually
 * so one bad collection can't hide the results of the others.
 */
export async function runSelfCheck(db, uid) {
  const results = [];

  // 1. Resolve this admin's own personId the exact way the live app does,
  //    through users/{uid}.personId -- this is the precise value that was
  //    undefined during bug B1, so re-checking it here is deliberate.
  const userSnap = await getDoc(doc(db, LEGACY.USERS, uid));
  const personId = userSnap.exists() ? userSnap.data().personId : undefined;

  if (!personId) {
    results.push({
      label: "Your account's personId",
      status: "fail",
      message:
        "No working personId found on your account. This is exactly what caused bug B1 — " +
        "progress saves would go to a random, unreadable document instead of your real record.",
    });
    // Every probe below needs a real personId to test safely against — stop here
    // rather than writing test data to a guessed/undefined location.
    return { results, personId: null, errorCount: getSessionErrorBuffer().length };
  }

  results.push({
    label: "Your account's personId",
    status: "ok",
    message: `Resolved correctly: ${personId}`,
  });

  // 2. Legacy collections — additive marker-field writes to the admin's own
  //    real records only. Never touches any other field.
  const legacyProbes = [
    { label: "users (your account)", collection: LEGACY.USERS, docId: uid },
    { label: "people (your profile)", collection: LEGACY.PEOPLE, docId: personId },
    { label: "userPrefs (your settings)", collection: LEGACY.USER_PREFS, docId: uid },
    { label: "appSettings (test doc, not the real banner)", collection: LEGACY.APP_SETTINGS, docId: TEST_MARKER_ID },
    { label: "studyProgress", collection: LEGACY.STUDY_PROGRESS, docId: personId },
    { label: "rukuSummaries", collection: LEGACY.RUKU_SUMMARIES, docId: personId },
    { label: "juzSummaries", collection: LEGACY.JUZ_SUMMARIES, docId: personId },
    { label: "juzSummariesPage", collection: LEGACY.JUZ_SUMMARIES_PAGE, docId: personId },
  ];

  for (const probe of legacyProbes) {
    const outcome = await safeWrite(
      () => legacyProbe(db, probe.collection, probe.docId),
      { collection: probe.collection, docId: probe.docId }
    );
    results.push({
      label: probe.label,
      status: outcome.ok ? "ok" : "fail",
      message: outcome.ok ? "Reachable, test write succeeded." : outcome.entry.message,
    });
  }

  // monitorWeeks is a subcollection (monitorWeeks/{personId}/weeks/{weekKey}) —
  // O1 flagged its presence as unconfirmed, so this also answers that.
  {
    const outcome = await safeWrite(
      () => legacyProbe(db, `${LEGACY.MONITOR_WEEKS}/${personId}/weeks`, TEST_MARKER_ID),
      { collection: LEGACY.MONITOR_WEEKS, docId: `${personId}/weeks/${TEST_MARKER_ID}` }
    );
    results.push({
      label: "monitorWeeks (O1 follow-up)",
      status: outcome.ok ? "ok" : "fail",
      message: outcome.ok ? "Reachable, test write succeeded." : outcome.entry.message,
    });
  }

  // rooms/ is deliberately locked (O2) — a denial here is the CORRECT,
  // expected result, not a failure.
  {
    const outcome = await safeWrite(
      () => legacyProbe(db, LEGACY.ROOMS, TEST_MARKER_ID),
      { collection: LEGACY.ROOMS, docId: TEST_MARKER_ID }
    );
    results.push({
      label: "rooms (deliberately locked, O2)",
      status: outcome.ok ? "fail" : "expected-block",
      message: outcome.ok
        ? "Unexpected: this wrote successfully. rooms/ was supposed to be fully locked — tell the admin."
        : "Correctly blocked, as designed. Nothing to act on.",
    });
  }

  // invites and teachers are deliberately NOT probed with a write: a test
  // write would create a real stray invite or teacher record, which is a
  // worse outcome than not testing it (D6 — additive only, no synthetic
  // operational data). Both are exercised implicitly by every other admin
  // read/write above succeeding under the same isAdmin() rule path.
  results.push({
    label: "invites / teachers",
    status: "skipped",
    message: "Not write-tested on purpose — a test write would create a real stray invite or teacher record.",
  });

  // 3. New-generation (TENANT) collections — rules for these (F-003) haven't
  //    been published yet, so a permission-denied here is the EXPECTED
  //    result right now, not a health problem. Only one representative
  //    collection is probed: all 26 would fail identically for the same
  //    documented reason, so testing all of them adds noise, not information.
  {
    const outcome = await safeWrite(
      () => createDocument(db, TENANT.TENANTS, TEST_MARKER_ID, { note: "self-check probe" }, uid),
      { collection: TENANT.TENANTS, docId: TEST_MARKER_ID }
    );
    const blockedAsExpected = !outcome.ok && outcome.entry.code === "permission-denied";
    results.push({
      label: "tenants (new-generation, representative probe)",
      status: outcome.ok ? "ok" : blockedAsExpected ? "expected-block" : "fail",
      message: outcome.ok
        ? "Reachable and writable — F-003 rules must already be published."
        : blockedAsExpected
        ? "Blocked as expected — F-003 (rules for new collections) hasn't been published yet."
        : outcome.entry.message,
    });
  }

  // 4. Offline queue — wait briefly for every write above to actually reach
  //    the server rather than sitting queued (e.g. due to no connection).
  let queueStatus;
  try {
    await Promise.race([
      waitForPendingWrites(db),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);
    queueStatus = { status: "ok", message: "No writes stuck offline." };
  } catch {
    queueStatus = {
      status: "fail",
      message: "Some writes are still queued after 5 seconds — likely no internet connection right now.",
    };
  }
  results.push({ label: "Offline write queue", ...queueStatus });

  return { results, personId, errorCount: getSessionErrorBuffer().length };
}
