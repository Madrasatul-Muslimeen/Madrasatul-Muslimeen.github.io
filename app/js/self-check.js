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
import { updateDocument } from "./envelope.js";
import { safeWrite, getSessionErrorBuffer } from "./errors.js";
import { getMyMemberships } from "./session-context.js";

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

  // 3. New-generation (TENANT / Layer 0) collections — real checks against
  //    the caller's own actual tenant, not a synthetic test tenant. A fake
  //    tenant would only be creatable once (the second self-check run
  //    would hit it as an update, which the caller has no membership to
  //    authorize) -- merging a harmless marker field into real, already-
  //    owned records is both a truer test and safely repeatable, same
  //    pattern as the legacy probes above.
  const memberships = await getMyMemberships(db, uid);
  if (memberships.length === 0) {
    results.push({
      label: "tenants / tenantPeople / memberships (Layer 0)",
      status: "skipped",
      message: "You haven't created an account yet (onboarding.html) — nothing to check here until you do.",
    });
  } else {
    const { tenantId, personId, roles } = memberships[0];

    const tenantOutcome = await safeWrite(
      () => updateDocument(db, TENANT.TENANTS, tenantId, markerField()),
      { collection: TENANT.TENANTS, docId: tenantId }
    );
    results.push({
      label: "tenants (your real account)",
      status: tenantOutcome.ok ? "ok" : "fail",
      message: tenantOutcome.ok ? "Reachable, test write succeeded." : tenantOutcome.entry.message,
    });

    const personOutcome = await safeWrite(
      () => updateDocument(db, TENANT.TENANT_PEOPLE, personId, markerField()),
      { collection: TENANT.TENANT_PEOPLE, docId: personId }
    );
    results.push({
      label: "tenantPeople (your own person record)",
      status: personOutcome.ok ? "ok" : "fail",
      message: personOutcome.ok ? "Reachable, test write succeeded." : personOutcome.entry.message,
    });

    const membershipId = `${tenantId}__${personId}__${roles[0]}`;
    const membershipOutcome = await safeWrite(
      () => updateDocument(db, TENANT.MEMBERSHIPS, membershipId, markerField()),
      { collection: TENANT.MEMBERSHIPS, docId: membershipId }
    );
    results.push({
      label: `memberships (your ${roles[0]} role)`,
      status: membershipOutcome.ok ? "ok" : "fail",
      message: membershipOutcome.ok ? "Reachable, test write succeeded." : membershipOutcome.entry.message,
    });
  }

  // I10 negative test: trying to grant yourself platformAdmin must ALWAYS
  // be refused. This is the single most convincing proof-of-safety on this
  // whole screen -- if this ever shows "ok" (succeeded), that is a real,
  // urgent security problem, not a self-check failure to shrug off.
  {
    const outcome = await safeWrite(
      () => updateDocument(db, TENANT.USER_INDEX, uid, { platformAdmin: true }),
      { collection: TENANT.USER_INDEX, docId: uid }
    );
    results.push({
      label: "Cannot self-grant platformAdmin (I10)",
      status: outcome.ok ? "fail" : "expected-block",
      message: outcome.ok
        ? "URGENT: this succeeded. Your account may now incorrectly have platform-admin access — tell the admin immediately, this needs fixing in the Firebase console."
        : "Correctly blocked, as designed. Nothing to act on.",
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
