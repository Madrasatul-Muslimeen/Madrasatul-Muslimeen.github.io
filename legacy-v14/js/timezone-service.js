// D14 TIMEZONE — the data layer, UNINVOKED and UNREACHABLE.
//
// Nothing imports this. A boundary suite walks the import graph from every
// page and asserts no chain of any length reaches it, with a positive control
// so the walker cannot pass vacuously.
//
// IT CANNOT BE ACTIVATED BY IMPORTING IT ALONE. Every write below is denied by
// the DEPLOYED rules today: `tenantPeople`'s self-update clause is
// `hasOnly(['timezone', 'updatedAt'])`, and `timezoneMode`/`timezoneLocation`
// are not in it (D14 finding 2). Activation needs
// `docs/governance/d14-timezone-tenantpeople-rules-candidate-2026-09-18.rules`
// deployed, which is an Owner Control Gate on the same access dependency as
// Phases 4-6.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO
//
//   - It does not render anything. D14 is a data decision; where a person
//     chooses a location is a separate product question and no setting exists.
//   - It does not resolve a location NAME to a zone. That needs a geographic
//     database; the caller resolves and hands both in (see the contract).
//   - IT CANNOT REACH ACTIVITY OR WEEK BUCKETING. D14 records that
//     `weekKeyFor()` buckets by the device's local calendar day and that
//     honouring the stored zone there would change which week live records
//     land in -- a behaviour change on real data and a gate of its own. This
//     file imports neither `activity.js` nor anything that reaches it, and a
//     check asserts that. Untouched by construction, not by intention.

import { TENANT } from "./collections.js";
import { updateDocument } from "./envelope.js";
import {
  automaticTimezone,
  manualTimezone,
  reconcileOnSignIn,
  returnToAutomatic,
  timezoneModeOf,
  timezoneRefusal,
} from "./timezone-contract.js";

/**
 * The zone this device believes it is in, or `null` when it will not say.
 *
 * `null` rather than a guessed default: a browser that cannot report its zone
 * is not evidence that the person moved, and the reconciler treats it as
 * "write nothing" rather than as a new location.
 */
export function detectDeviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/**
 * Called when a person signs in. Writes only when the stored record and the
 * device actually disagree, and NEVER when the person has chosen a location.
 *
 * Returns the contract's own decision object so a caller can say what happened
 * -- including `{ action: "refuse" }` for a record whose fields contradict each
 * other, which must reach the reader rather than be silently repaired (I15).
 *
 * THE MANUAL CHOICE SURVIVING EVERY SIGN-IN IS THIS FUNCTION'S WHOLE POINT.
 * The decision is the contract's, not this file's -- so the rule that protects
 * it is unit-testable without a database.
 */
export async function reconcileTimezoneOnSignIn(db, { personId, person } = {}) {
  requireToken("personId", personId);
  const decision = reconcileOnSignIn({ stored: person, detectedZone: detectDeviceTimeZone() });
  if (decision.action !== "write") return decision;
  await updateDocument(db, TENANT.TENANT_PEOPLE, personId, decision.payload);
  return decision;
}

/**
 * The person chooses a location. `resolvedZone` is the IANA zone that location
 * determines, resolved by the caller.
 *
 * The contract refuses a location without a zone, so a half-resolved choice
 * cannot be stored as if it were complete.
 */
export async function chooseTimezoneLocation(db, { personId, locationLabel, resolvedZone } = {}) {
  requireToken("personId", personId);
  const payload = manualTimezone({ locationLabel, resolvedZone });
  await updateDocument(db, TENANT.TENANT_PEOPLE, personId, payload);
  return payload;
}

/**
 * The person returns to automatic detection.
 *
 * The payload sets `timezoneLocation` to null EXPLICITLY. Omitting it would
 * leave the previous choice's label on the document beside a mode that says
 * auto -- the contradiction the Rules candidate also refuses, so neither side
 * is the only guard.
 */
export async function returnTimezoneToAutomatic(db, { personId } = {}) {
  requireToken("personId", personId);
  const detected = detectDeviceTimeZone();
  if (detected === null) {
    // Refused rather than guessed: returning to automatic when the device will
    // not say which zone it is in would store a zone nobody detected.
    throw new Error("Cannot return to automatic detection: this device did not report a time zone.");
  }
  const payload = returnToAutomatic(detected);
  await updateDocument(db, TENANT.TENANT_PEOPLE, personId, payload);
  return payload;
}

/** What a surface would need to show, with no opinion about how to show it. */
export function timezoneStateOf(person) {
  return Object.freeze({
    mode: timezoneModeOf(person),
    zone: person?.timezone ?? null,
    location: person?.timezoneLocation ?? null,
    refusal: timezoneRefusal(person),
    deviceZone: detectDeviceTimeZone(),
  });
}

/** Re-exported so a caller never has to reach past this module into the contract. */
export { automaticTimezone };

function requireToken(name, value) {
  if (typeof value !== "string" || !value.trim() || value.includes("/")) {
    throw new TypeError(`timezone-service: ${name} must be a non-empty path-safe string.`);
  }
}
