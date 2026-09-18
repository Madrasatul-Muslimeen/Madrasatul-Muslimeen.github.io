// D14 TIMEZONE -- the pure contract. No database, no browser, no emulator.
//
// What this suite exists to pin is the pair of failure modes D14's finding (1)
// names, because a single `timezone` string cannot express either of them:
//   1. a chosen location must survive every sign-in;
//   2. automatic mode must follow the device when the person travels.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || process.cwd());
const mod = await import(pathToFileURL(path.join(root, "app/js/timezone-contract.js")).href);
const {
  TIMEZONE_MODES, TIMEZONE_FIELDS, automaticTimezone, isIanaTimeZone, manualTimezone,
  reconcileOnSignIn, returnToAutomatic, timezoneModeOf, timezoneRefusal,
} = mod;

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
}

const auto = (zone = "Asia/Dhaka", o = {}) => ({ timezone: zone, timezoneMode: "auto", timezoneLocation: null, ...o });
const manual = (zone = "Europe/London", label = "London, United Kingdom") =>
  ({ timezone: zone, timezoneMode: "manual", timezoneLocation: label });

// --- the vocabulary --------------------------------------------------------
check("T1 the mode vocabulary is closed at exactly two", () => {
  assert.deepEqual([...TIMEZONE_MODES], ["auto", "manual"]);
  assert.ok(Object.isFrozen(TIMEZONE_MODES));
});

check("T2 an ABSENT mode reads as auto -- every pre-D14 record already is auto", () => {
  assert.equal(timezoneModeOf({ timezone: "Asia/Dhaka" }), "auto");
  assert.equal(timezoneModeOf({}), "auto");
  assert.equal(timezoneModeOf(null), "auto");
  assert.equal(timezoneModeOf({ timezone: "Asia/Dhaka", timezoneMode: null }), "auto");
});

check("T3 an unknown mode is REFUSED, never coerced to a default", () => {
  assert.equal(timezoneModeOf({ timezoneMode: "sometimes" }), "invalid");
  assert.equal(timezoneRefusal({ timezoneMode: "sometimes" }), "mode-not-in-vocabulary");
});

// --- zone validation -------------------------------------------------------
check("T4 a zone is validated by ASKING Intl, not by matching a pattern", () => {
  // The two cases a regex gets backwards, which is why Intl does this.
  assert.equal(isIanaTimeZone("UTC"), true, "UTC has no slash and is real");
  assert.equal(isIanaTimeZone("Foo/Bar"), false, "Foo/Bar has a slash and is not");
  assert.equal(isIanaTimeZone("Asia/Dhaka"), true);
  assert.equal(isIanaTimeZone("Etc/GMT+5"), true);
  for (const bad of ["", " ", " Asia/Dhaka", "Asia/Dhaka ", null, undefined, 7, {}]) {
    assert.equal(isIanaTimeZone(bad), false, `accepted ${JSON.stringify(bad)}`);
  }
});

// --- the three payloads ----------------------------------------------------
check("T5 automatic carries the zone and an EXPLICIT null location", () => {
  const p = automaticTimezone("Asia/Dhaka");
  assert.deepEqual({ ...p }, { timezone: "Asia/Dhaka", timezoneMode: "auto", timezoneLocation: null });
  assert.ok("timezoneLocation" in p, "the location must be written null, not omitted -- omitting leaves a stale label");
  assert.ok(Object.isFrozen(p));
});

check("T6 a manual choice carries the location that DETERMINED the zone", () => {
  const p = manualTimezone({ locationLabel: "  London, United Kingdom  ", resolvedZone: "Europe/London" });
  assert.deepEqual({ ...p }, { timezone: "Europe/London", timezoneMode: "manual", timezoneLocation: "London, United Kingdom" });
});

check("T7 a manual choice without a location, or without a zone, is refused", () => {
  assert.throws(() => manualTimezone({ resolvedZone: "Europe/London" }), /needs the location/);
  assert.throws(() => manualTimezone({ locationLabel: "  ", resolvedZone: "Europe/London" }), /needs the location/);
  assert.throws(() => manualTimezone({ locationLabel: "London", resolvedZone: "Nowhere/Land" }), /valid IANA/);
  assert.throws(() => automaticTimezone("Nowhere/Land"), /valid IANA/);
});

check("T8 returning to automatic produces the automatic payload, clearing the location", () => {
  assert.deepEqual({ ...returnToAutomatic("Asia/Dhaka") }, { ...automaticTimezone("Asia/Dhaka") });
  assert.equal(returnToAutomatic("Asia/Dhaka").timezoneLocation, null);
});

// --- the stored-record invariant -------------------------------------------
check("T9 auto with a location left on it is refused -- the stale-label state", () => {
  assert.equal(timezoneRefusal({ ...auto(), timezoneLocation: "London" }), "auto-with-location");
});

check("T10 manual without a location, a blank one, or without a zone, is refused", () => {
  assert.equal(timezoneRefusal({ timezone: "Europe/London", timezoneMode: "manual", timezoneLocation: null }), "manual-without-location");
  assert.equal(timezoneRefusal({ timezone: "Europe/London", timezoneMode: "manual", timezoneLocation: "  " }), "manual-location-blank");
  assert.equal(timezoneRefusal({ timezone: null, timezoneMode: "manual", timezoneLocation: "Dhaka" }), "manual-without-zone");
});

check("T11 a null zone is a REAL state -- migrate.html writes one", () => {
  assert.equal(timezoneRefusal({ timezone: null }), null);
  assert.equal(timezoneRefusal({ timezone: null, timezoneMode: "auto", timezoneLocation: null }), null);
  assert.equal(timezoneRefusal({ timezone: "Not/AZone" }), "zone-not-iana");
});

check("T12 a valid record of either mode is refused for nothing", () => {
  assert.equal(timezoneRefusal(auto()), null);
  assert.equal(timezoneRefusal(manual()), null);
  assert.equal(timezoneRefusal({ timezone: "Asia/Dhaka" }), null, "a pre-D14 record is valid as it stands");
});

// --- D14 finding (1), both halves ------------------------------------------
check("T13 A MANUAL CHOICE SURVIVES EVERY SIGN-IN, whatever the device says", () => {
  for (const detected of ["Asia/Dhaka", "America/New_York", "UTC", null, "nonsense"]) {
    const out = reconcileOnSignIn({ stored: manual(), detectedZone: detected });
    assert.equal(out.action, "keep", `a device reporting ${detected} moved a manual choice`);
    assert.equal(out.reason, "manual-choice-is-authoritative");
  }
});

check("T14 AUTOMATIC FOLLOWS THE DEVICE when the person travels", () => {
  const out = reconcileOnSignIn({ stored: auto("Asia/Dhaka"), detectedZone: "Europe/London" });
  assert.equal(out.action, "write");
  assert.equal(out.reason, "device-zone-changed");
  assert.deepEqual({ ...out.payload }, { timezone: "Europe/London", timezoneMode: "auto", timezoneLocation: null });
});

check("T15 automatic writes NOTHING when it is already current", () => {
  assert.deepEqual(reconcileOnSignIn({ stored: auto("Asia/Dhaka"), detectedZone: "Asia/Dhaka" }),
    { action: "keep", reason: "already-current" });
});

check("T16 an unreadable device zone writes nothing rather than guessing", () => {
  for (const bad of [null, undefined, "", "Nowhere/Land"]) {
    const out = reconcileOnSignIn({ stored: auto("Asia/Dhaka"), detectedZone: bad });
    assert.equal(out.action, "keep", `a device reporting ${JSON.stringify(bad)} caused a write`);
    assert.equal(out.reason, "device-zone-unreadable");
  }
});

check("T17 a pre-D14 record gains its mode on the next sign-in, without changing its zone", () => {
  const out = reconcileOnSignIn({ stored: { timezone: "Asia/Dhaka" }, detectedZone: "Asia/Dhaka" });
  assert.equal(out.action, "write");
  assert.equal(out.reason, "recording-mode");
  assert.equal(out.payload.timezone, "Asia/Dhaka", "recording the mode must not move the zone");
  assert.equal(out.payload.timezoneMode, "auto");
});

check("T18 a migrate.html record (zone null) adopts the detected zone", () => {
  const out = reconcileOnSignIn({ stored: { timezone: null }, detectedZone: "Asia/Dhaka" });
  assert.equal(out.action, "write");
  assert.equal(out.reason, "adopting-detected-zone");
  assert.equal(out.payload.timezone, "Asia/Dhaka");
});

check("T19 a contradictory stored record is REFUSED, not silently repaired (I15)", () => {
  const out = reconcileOnSignIn({ stored: { ...auto(), timezoneLocation: "London" }, detectedZone: "Asia/Dhaka" });
  assert.equal(out.action, "refuse");
  assert.equal(out.reason, "auto-with-location");
});

check("T20 a stale location beside auto is CLEARED by the reconciler's own payload", () => {
  // The refusal above is the reader's signal; if a caller then re-detects, the
  // payload it gets must erase the label rather than leave it.
  assert.equal(automaticTimezone("Asia/Dhaka").timezoneLocation, null);
});

// --- the field list the Rules candidate must agree with --------------------
check("T21 the field list is bound to the Rules candidate, both ways", () => {
  const raw = fs.readFileSync(path.join(root,
    "docs/governance/d14-timezone-tenantpeople-rules-candidate-2026-09-18.rules"), "utf8");
  // STRIP COMMENTS FIRST. The candidate's own comment quotes the DEPLOYED
  // clause -- "was hasOnly(['timezone', 'updatedAt'])" -- and matching that
  // instead of the live one made this check compare the contract against the
  // rule D14 replaces. It reported drift that did not exist.
  const rules = raw.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  const all = [...rules.matchAll(/hasOnly\(\[[^\]]*'timezone'[^\]]*\]\)/g)];
  assert.equal(all.length, 1,
    `expected exactly one live timezone hasOnly list in the candidate, found ${all.length}`);
  const inRules = [...all[0][0].matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]).filter((f) => f !== "updatedAt");
  assert.deepEqual(inRules.sort(), [...TIMEZONE_FIELDS].sort(),
    "the contract's TIMEZONE_FIELDS and the Rules candidate's writable set have drifted apart");
});

console.log(`\n==== D14 timezone contract: ${passed} passed, ${failed} failed ====`);
process.exit(failed === 0 ? 0 : 1);
