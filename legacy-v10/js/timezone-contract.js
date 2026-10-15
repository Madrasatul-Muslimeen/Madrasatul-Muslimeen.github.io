// D14 (18 Sep 2026) — the timezone foundation, as PURE policy.
//
// UNINVOKED AND UNREACHABLE. Nothing imports this; a boundary suite asserts
// that by walking the import graph from every page. It decides what the
// Owner's decision MEANS in the data; representing it is a separate task, and
// writing it needs a Rules change that is an Owner Control Gate (see
// docs/governance/d14-timezone-tenantpeople-rules-candidate-2026-09-18.rules).
//
// THE OWNER'S DECISION, D14, in their own shape: automatic capture is the
// DEFAULT, and a person may choose a LOCATION which determines their timezone
// until they change it or return to automatic detection.
//
// D14 recorded three findings, and all three are load-bearing here:
//
//   1. THE DECISION CANNOT BE REPRESENTED BY THE FIELD THAT EXISTS. `timezone`
//      is one string, so auto-detected `Asia/Dhaka` and hand-chosen
//      `Asia/Dhaka` are indistinguishable — re-detecting at each login
//      silently overwrites a deliberate choice, and never re-detecting
//      silently freezes an auto value when the person travels. A MODE is the
//      missing fact, not a second value.
//   2. THE DEPLOYED RULES AUTHORISE `timezone` AND `updatedAt` AND NOTHING
//      ELSE, so every field below is denied in production until that Rules
//      candidate is deployed. This module therefore describes a shape that
//      cannot yet be written, deliberately.
//   3. A LOCATION IS NOT A TIMEZONE. The Owner's wording is exact — a location
//      *determines* a timezone — so the authoritative stored value stays the
//      resolved IANA zone, and the location is provenance beside it.
//
// WHAT `timezone` MEANS DOES NOT CHANGE, and that is the point of this shape:
// it is the resolved IANA zone in BOTH modes. Anything that reads a person's
// timezone reads that one field and never needs to know the mode. The mode
// governs WHO MAY CHANGE IT, not what it means.
//
// THIS MODULE CANNOT REACH ACTIVITY. D14 records that `weekKeyFor()` buckets
// by the DEVICE's local calendar day, and that honouring this decision there
// would change which week live records land in — a behaviour change and a gate
// of its own. So this file imports NOTHING AT ALL, cannot see `weekKeyFor`,
// and a check asserts that absence. Week bucketing is untouched by
// construction, not by intention.

/** D14's two modes. Closed: anything else is refused, never coerced. */
export const TIMEZONE_MODES = Object.freeze(["auto", "manual"]);

/**
 * The mode of a stored person record.
 *
 * ABSENT READS AS "auto", and that is derivable rather than chosen: every
 * record written before D14 carries a zone captured automatically at creation
 * (`identity.js`, `invites.js`, `people.js`) and no mode at all, and D14 says
 * automatic capture is the DEFAULT. So the existing corpus already IS auto,
 * and nothing needs backfilling for this to be true.
 */
export function timezoneModeOf(person) {
  const raw = person?.timezoneMode ?? null;
  if (raw === null || raw === undefined) return "auto";
  return TIMEZONE_MODES.includes(raw) ? raw : "invalid";
}

/**
 * Is this a zone the runtime's own IANA database recognises?
 *
 * Validated by ASKING Intl rather than by matching a pattern: a regex accepts
 * `Foo/Bar` and rejects `UTC`, and neither mistake is one a person could see
 * coming. `Intl` is a language built-in, not I/O, so this file stays pure.
 */
export function isIanaTimeZone(zone) {
  if (typeof zone !== "string" || zone.trim() === "" || zone !== zone.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function requireZone(zone, label) {
  if (!isIanaTimeZone(zone)) {
    throw new TypeError(`timezone-contract: ${label} must be a valid IANA time zone; got ${JSON.stringify(zone)}.`);
  }
}

/**
 * The payload for AUTOMATIC detection.
 *
 * `timezoneLocation` is explicitly `null`, never omitted. Omitting it would
 * leave a previous manual choice's label sitting on the document while the
 * mode said auto — the stale-label failure that makes "return to automatic"
 * a lie. Writing null is what erases it.
 */
export function automaticTimezone(detectedZone) {
  requireZone(detectedZone, "detectedZone");
  return Object.freeze({ timezone: detectedZone, timezoneMode: "auto", timezoneLocation: null });
}

/**
 * The payload for a CHOSEN LOCATION.
 *
 * The caller resolves the location to its zone and hands both in. This module
 * deliberately does NOT resolve a location itself: that needs a geographic
 * database, which is exactly the kind of dependency a pure contract must not
 * acquire — and D14's finding (3) is that the ZONE is the authoritative value
 * either way, so the label is provenance, not the fact.
 */
export function manualTimezone({ locationLabel, resolvedZone } = {}) {
  requireZone(resolvedZone, "resolvedZone");
  if (typeof locationLabel !== "string" || locationLabel.trim() === "") {
    throw new TypeError("timezone-contract: a manual timezone needs the location that determined it.");
  }
  return Object.freeze({
    timezone: resolvedZone,
    timezoneMode: "manual",
    timezoneLocation: locationLabel.trim(),
  });
}

/** "Return to automatic detection" — the same payload as automatic, named for what it is. */
export function returnToAutomatic(detectedZone) {
  return automaticTimezone(detectedZone);
}

/**
 * Why a stored record is not a valid D14 record, or `null` when it is.
 *
 * A REASON rather than a boolean, for the same purpose ADR-010's refusals
 * serve: each of these has to be able to become a sentence.
 */
export function timezoneRefusal(person) {
  const mode = timezoneModeOf(person);
  if (mode === "invalid") return "mode-not-in-vocabulary";

  const zone = person?.timezone ?? null;
  // `null` is a real stored state: migrate.html writes it, and a record whose
  // zone was never captured must stay representable rather than be refused.
  if (zone !== null && !isIanaTimeZone(zone)) return "zone-not-iana";

  const location = person?.timezoneLocation ?? null;
  if (mode === "auto" && location !== null) return "auto-with-location";
  if (mode === "manual") {
    if (location === null) return "manual-without-location";
    if (typeof location !== "string" || location.trim() === "") return "manual-location-blank";
    if (zone === null) return "manual-without-zone";
  }
  return null;
}

/**
 * What to write when a person signs in, given what is stored and what the
 * device now reports — or `null` when nothing should be written.
 *
 * THE TWO REQUIREMENTS D14's FINDING (1) NAMES ARE BOTH HERE, and they are
 * the same function seen from two sides:
 *
 *   - A MANUAL CHOICE SURVIVES EVERY SIGN-IN. Manual mode returns null no
 *     matter what the device says. This is the half that a single `timezone`
 *     field cannot express, and the reason the mode exists at all.
 *   - AUTOMATIC FOLLOWS THE DEVICE. Auto mode returns an update when the
 *     detected zone differs from the stored one, so a person who travels is
 *     not frozen at the zone they first signed up in.
 *
 * A record with no stored zone at all is adopted into auto, which is what a
 * `migrate.html` record (`timezone: null`) needs to become usable.
 *
 * An UNREADABLE device zone writes nothing rather than guessing: a browser
 * that cannot report its zone is not evidence that the person moved.
 */
export function reconcileOnSignIn({ stored, detectedZone } = {}) {
  const refusal = timezoneRefusal(stored);
  if (refusal) return { action: "refuse", reason: refusal };

  if (timezoneModeOf(stored) === "manual") {
    return { action: "keep", reason: "manual-choice-is-authoritative" };
  }
  if (!isIanaTimeZone(detectedZone)) {
    return { action: "keep", reason: "device-zone-unreadable" };
  }

  const storedZone = stored?.timezone ?? null;
  const modeMissing = (stored?.timezoneMode ?? null) === null;
  const locationStale = (stored?.timezoneLocation ?? null) !== null;

  if (storedZone === detectedZone && !modeMissing && !locationStale) {
    return { action: "keep", reason: "already-current" };
  }
  return {
    action: "write",
    reason: storedZone === null ? "adopting-detected-zone"
      : storedZone !== detectedZone ? "device-zone-changed"
      : "recording-mode",
    payload: automaticTimezone(detectedZone),
  };
}

/** The exact field set D14 adds, for the Rules candidate and its audit to agree with. */
export const TIMEZONE_FIELDS = Object.freeze(["timezone", "timezoneMode", "timezoneLocation"]);
