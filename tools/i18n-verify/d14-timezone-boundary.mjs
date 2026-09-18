// D14 TIMEZONE -- the boundary. What this tranche claims is that it changed
// NOTHING a person can reach, and no function-level test can see that: a suite
// that calls the contract's functions passes just as happily once the module is
// wired into a live sign-in path.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
const appDir = path.join(root, "app");
const appJs = path.join(appDir, "js");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
}

const TARGETS = ["timezone-contract.js", "timezone-service.js"];

function localImportsOf(file) {
  const text = fs.readFileSync(file, "utf8");
  return [...text.matchAll(/from\s+["']\.\/([A-Za-z0-9._-]+\.js)["']/g)].map((m) => m[1]);
}

/** Every page->module chain of any length that reaches `target`. */
function chainsToTarget(target) {
  const found = [];
  for (const entry of fs.readdirSync(appDir)) {
    if (!entry.endsWith(".html")) continue;
    const seen = new Set();
    const queue = [...read(`app/${entry}`)
      .matchAll(/["'`](?:\.\/)?js\/([A-Za-z0-9._-]+\.js)["'`]/g)].map((m) => [m[1]]);
    while (queue.length) {
      const chain = queue.shift();
      const head = chain[chain.length - 1];
      if (seen.has(head)) continue;
      seen.add(head);
      if (head === target) { found.push(`app/${entry} -> ${chain.join(" -> ")}`); break; }
      const full = path.join(appJs, head);
      if (!fs.existsSync(full)) continue;
      for (const next of localImportsOf(full)) queue.push([...chain, next]);
    }
  }
  return found;
}

check("POSITIVE CONTROL: the walker really does find a wired module", () => {
  // Without this, one broken regex makes every chain come back empty and every
  // case below pass while proving nothing.
  const wired = chainsToTarget("records.js");
  assert.ok(wired.length > 0, "the walker found no page reaching records.js; it has stopped working");
});

check("NO PAGE can reach the D14 contract or its service, by any chain", () => {
  for (const target of TARGETS) {
    const chains = chainsToTarget(target);
    assert.deepEqual(chains, [], `${target} is reachable: ${chains.slice(0, 3).join(" | ")}`);
  }
});

check("the only importer of the contract is the service, which is itself unreachable", () => {
  const importers = fs.readdirSync(appJs)
    .filter((f) => f.endsWith(".js"))
    .filter((f) => localImportsOf(path.join(appJs, f)).includes("timezone-contract.js"));
  assert.deepEqual(importers.sort(), ["timezone-service.js"],
    `unexpected importer(s) of the contract: ${importers}`);
});

check("no .html under app/ names either module", () => {
  for (const entry of fs.readdirSync(appDir).filter((f) => f.endsWith(".html"))) {
    const text = read(`app/${entry}`);
    for (const target of TARGETS) {
      assert.ok(!text.includes(target), `app/${entry} names ${target}`);
    }
  }
});

// --- the constraint the Owner stated outright ------------------------------
check("WEEK BUCKETING IS UNTOUCHED: neither module can reach activity.js", () => {
  // D14 records that weekKeyFor() buckets by the DEVICE's local calendar day,
  // and that honouring a stored zone there would change which week live
  // records land in. Enforced by INABILITY: walk the import graph forward from
  // each module and assert activity.js is not in it, at any depth.
  for (const target of TARGETS) {
    const seen = new Set();
    const queue = [target];
    while (queue.length) {
      const head = queue.shift();
      if (seen.has(head)) continue;
      seen.add(head);
      assert.notEqual(head === target ? null : head, "activity.js",
        `${target} reaches activity.js -- week bucketing is no longer untouched by construction`);
      const full = path.join(appJs, head);
      if (!fs.existsSync(full)) continue;
      for (const next of localImportsOf(full)) queue.push(next);
    }
    assert.ok(!seen.has("activity.js"), `${target} reaches activity.js`);
  }
});

check("...and neither NAMES weekKeyFor, records or a chunkKey", () => {
  for (const target of TARGETS) {
    const code = read(`app/js/${target}`)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    for (const forbidden of ["weekKeyFor", "chunkKey", "claimStatus", "trackableId", "bulkConfirmWeek"]) {
      assert.ok(!code.includes(forbidden), `${target} names ${forbidden} outside a comment`);
    }
  }
  // The contract imports NOTHING AT ALL -- that is what makes the above
  // structural rather than a promise.
  const contract = read("app/js/timezone-contract.js");
  assert.equal([...contract.matchAll(/^\s*import\s/gm)].length, 0,
    "timezone-contract.js has acquired an import; its isolation was the enforcement");
});

// --- nothing deployed, nothing reshaped ------------------------------------
check("firestore.rules is UNTOUCHED -- the candidate is a candidate", () => {
  const deployed = read("firestore.rules");
  assert.ok(!deployed.includes("timezoneMode"), "firestore.rules now mentions timezoneMode -- has it been edited?");
  assert.ok(deployed.includes("hasOnly(['timezone', 'updatedAt'])"),
    "the deployed self-update clause has changed; re-audit this tranche");
});

check("the assembled Phase 4-6 deployment candidate is UNTOUCHED by D14", () => {
  const assembled = read("docs/governance/phase4-6-DEPLOYMENT-candidate-2026-09-17.rules");
  assert.ok(!assembled.includes("timezoneMode"),
    "D14 has leaked into the Phase 4-6 deployment candidate, which this tranche must not change");
});

check("no existing app file changed: D14 is two NEW files and nothing else", () => {
  // The three sites that write `timezone` today must still write exactly what
  // they wrote before -- D14 adds a candidate, it does not alter live capture.
  for (const [file, needle] of [
    ["app/js/identity.js", "timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null"],
    ["app/js/invites.js", "timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null"],
    ["app/js/people.js", "timezone: timezone ?? null"],
  ]) {
    assert.ok(read(file).includes(needle), `${file} no longer writes timezone as it did -- live capture was altered`);
    assert.ok(!read(file).includes("timezoneMode"), `${file} now writes timezoneMode -- that is activation`);
  }
});

check("no reachable setting was added: no page offers a timezone control", () => {
  for (const entry of fs.readdirSync(appDir).filter((f) => f.endsWith(".html"))) {
    const text = read(`app/${entry}`);
    for (const needle of ["timezoneMode", "timezoneLocation", "chooseTimezoneLocation", "returnTimezoneToAutomatic"]) {
      assert.ok(!text.includes(needle), `app/${entry} carries ${needle} -- a reachable setting was added`);
    }
  }
});

console.log(`\n==== D14 timezone boundary: ${passed} passed, ${failed} failed ====`);
process.exit(failed === 0 ? 0 : 1);
