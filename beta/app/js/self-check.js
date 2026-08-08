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
import { safeWrite, getSessionErrorBuffer, reportWriteFailure } from "./errors.js";
import { getMyMemberships } from "./session-context.js";
import { listModules } from "./modules.js";
import { getSubjectTree, getTrackables } from "./catalogue.js";
import { listDomains } from "./domains.js";
import { claimStatus, getRecordsChunk, computeConfirmationRequired, chunkKeyFor } from "./records.js";
import { logActivity, getWeekActivity, weekKeyFor } from "./activity.js";

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

    // 3b. Phase 2 — Layer 1 (catalogue). Real checks against this tenant's
    // actual seeded catalogue, not synthetic data -- same reasoning as
    // above: a marker-field merge into an already-owned, real row is both
    // a truer test and safely repeatable.
    let modules = [];
    try {
      modules = await listModules(db, uid);
      results.push({
        label: "modules (platform registry)",
        status: modules.length === 7 ? "ok" : "fail",
        message: modules.length === 7
          ? "Reachable, all 7 modules present."
          : `Reachable, but found ${modules.length} modules, expected 7 — tell the admin.`,
      });
    } catch (err) {
      results.push({ label: "modules (platform registry)", status: "fail", message: reportWriteFailure(err, { collection: TENANT.MODULES }).message });
    }

    let subjects = [];
    try {
      subjects = await getSubjectTree(db, tenantId);
      const badAncestors = subjects.filter((n) => !Array.isArray(n.ancestorIds));
      const enoughNodes = subjects.length >= 41; // >= not ===: a tenant may have added its own custom subjects on top of the 41 platform ones
      results.push({
        label: "subjects (your tenant's subject tree)",
        status: enoughNodes && badAncestors.length === 0 ? "ok" : "fail",
        message: enoughNodes && badAncestors.length === 0
          ? `Reachable, ${subjects.length} nodes present with a valid ancestorIds chain on every one.`
          : `Reachable, but found ${subjects.length} nodes (expected at least 41) and ${badAncestors.length} with a broken ancestorIds field — tell the admin.`,
      });
    } catch (err) {
      results.push({ label: "subjects (your tenant's subject tree)", status: "fail", message: reportWriteFailure(err, { collection: TENANT.SUBJECTS }).message });
    }

    let trackables = [];
    try {
      trackables = await getTrackables(db, tenantId);
      const groups = new Set(trackables.map((t) => t.group));
      results.push({
        label: "trackables (the 30 Approaches)",
        status: trackables.length === 30 && groups.size === 7 ? "ok" : "fail",
        message: trackables.length === 30 && groups.size === 7
          ? "Reachable, all 30 Approaches present across all 7 sections."
          : `Reachable, but found ${trackables.length} Approaches across ${groups.size} sections (expected 30 across 7) — tell the admin.`,
      });
    } catch (err) {
      results.push({ label: "trackables (the 30 Approaches)", status: "fail", message: reportWriteFailure(err, { collection: TENANT.TRACKABLES }).message });
    }

    // A real, additive test write against one already-owned Layer 1 row,
    // same "merge a harmless marker field" pattern as tenants/tenantPeople
    // above -- proves catalogue WRITE access (owner/prime), not just read.
    if (subjects.some((n) => n.id === "quran")) {
      const subjectWriteOutcome = await safeWrite(
        () => updateDocument(db, TENANT.SUBJECTS, `${tenantId}__quran`, markerField()),
        { collection: TENANT.SUBJECTS, docId: `${tenantId}__quran` }
      );
      results.push({
        label: "subjects write access (owner/prime only, by design)",
        status: subjectWriteOutcome.ok ? "ok" : "expected-block",
        message: subjectWriteOutcome.ok
          ? "Reachable, test write succeeded — you hold owner or prime in this tenant."
          : "Blocked, as expected for a role other than owner/prime. Nothing to act on unless you expected write access.",
      });
    }

    // 3c. Phase 3 — Layer 2 (tracking core). Real checks against the
    // caller's own real personId (same "additive marker, safely repeatable"
    // reasoning as everything above). SC_SUBJECT must be a real, already-
    // seeded subject id ("quran" -- guaranteed present by Phase 2's
    // catalogue seed) rather than a synthetic one: claimStatus() reads
    // subjects/{tenantId}__{subjectId} to check confirmationRequired, and
    // for a NONEXISTENT subject doc that get() is denied outright (Firestore
    // hands the rule a null `resource`, so `resource.data.tenantId` errors
    // and every `allow read` clause on subjects fails closed) -- a real
    // subject was misdiagnosed as a permissions bug the first time this ran.
    // SC_TRACKABLE/SC_UNIT_KEY stay synthetic and clearly marked so this can
    // never be confused with real content; statusId "not_applicable" so it
    // never counts toward any real total (I7).
    const SC_SUBJECT = "quran";
    const SC_TRACKABLE = "_selfCheckTest";
    const SC_UNIT_KEY = "topic:_selfCheckTest";

    try {
      const domains = await listDomains(db, tenantId);
      results.push({
        label: "domains (D12 tag registry)",
        status: "ok",
        message: `Reachable, ${domains.length} domain tag(s) defined so far.`,
      });
    } catch (err) {
      results.push({ label: "domains (D12 tag registry)", status: "fail", message: reportWriteFailure(err, { collection: TENANT.DOMAINS }).message });
    }

    const claimOutcome = await safeWrite(
      () => claimStatus(db, {
        tenantId, personId, subjectId: SC_SUBJECT, unitKey: SC_UNIT_KEY, trackableId: SC_TRACKABLE,
        statusId: "not_applicable", notes: "safe to ignore — self-check marker", domainIds: [],
        claimedByPersonId: personId, claimedByUid: uid,
      }),
      { collection: TENANT.RECORDS, action: "selfCheckClaim" }
    );
    if (claimOutcome.ok) {
      const chunkKey = chunkKeyFor(SC_UNIT_KEY, SC_SUBJECT);
      const chunk = await getRecordsChunk(db, tenantId, personId, chunkKey);
      const entry = chunk?.entries?.[`${SC_UNIT_KEY}::${SC_TRACKABLE}`];
      results.push({
        label: "records (chunked claim/confirm write path)",
        status: entry ? "ok" : "fail",
        message: entry
          ? `Reachable, test claim wrote and read back correctly (confirmState: ${entry.confirmState}).`
          : "The write reported success but the entry could not be read back — tell the admin.",
      });
    } else {
      results.push({ label: "records (chunked claim/confirm write path)", status: "fail", message: claimOutcome.entry.message });
    }

    const activityOutcome = await safeWrite(
      () => logActivity(db, {
        tenantId, personId, date: new Date(), weekStartsOn: 6,
        subjectId: SC_SUBJECT, unitKey: SC_UNIT_KEY, trackableId: SC_TRACKABLE,
        action: "selfCheck", uid,
      }),
      { collection: TENANT.ACTIVITY, action: "selfCheckLogActivity" }
    );
    if (activityOutcome.ok) {
      const weekKey = weekKeyFor(new Date(), 6);
      const week = await getWeekActivity(db, tenantId, personId, weekKey);
      const found = (week?.entries ?? []).some((e) => e.trackableId === SC_TRACKABLE && e.action === "selfCheck");
      results.push({
        label: "activity (weekly, append-only write path)",
        status: found ? "ok" : "fail",
        message: found
          ? "Reachable, test entry appended and read back correctly."
          : "The write reported success but the entry could not be read back — tell the admin.",
      });
    } else {
      results.push({ label: "activity (weekly, append-only write path)", status: "fail", message: activityOutcome.entry.message });
    }

    try {
      const needsConfirmation = await computeConfirmationRequired(db, tenantId, personId, null);
      results.push({
        label: "Confirmation rule (Architecture s6, computed)",
        status: "ok",
        message: `Ran without error. For your own account right now, this computes to: ${needsConfirmation ? "waits for confirmation" : "self-confirmed"}.`,
      });
    } catch (err) {
      results.push({ label: "Confirmation rule (Architecture s6, computed)", status: "fail", message: reportWriteFailure(err, { collection: TENANT.MEMBERSHIPS }).message });
    }
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
