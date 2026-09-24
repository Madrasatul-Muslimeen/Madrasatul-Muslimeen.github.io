// MAP v4 Phase 4 (P4-F, issue #230/#238) -- Monitor's "Study activity this
// week" section, executed against the REAL app/js/monitor.js source (its
// Firebase-touching imports rewritten to injected stubs, the same technique
// study-activity-evidence-store.mjs already uses), not a copy of it.
//
// What this proves, per the issue's own item 4: the section renders all four
// kinds from seeded evidence, renders the empty state, and monitor.js's own
// fetch+render wrapper (studyActivitySectionForWeek) calls P4-E's reader with
// the right arguments and turns its result into the same HTML. The STATIC
// "monitor.js imports only the reader, never the writer" check lives in
// study-activity-evidence-boundary.mjs instead, alongside the rest of that
// module's reachability guards, which is where a later session will look for
// it.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || process.cwd());
const appJs = path.join(root, "app", "js");

function fileUrl(name) { return pathToFileURL(path.join(appJs, name)).href; }

let calls = [];
globalThis.__monitorTestReader = {
  listStudyActivityEvidence: async (db, args) => {
    calls.push({ db, args });
    return globalThis.__monitorTestReaderResult;
  },
};

let source = fs.readFileSync(path.join(appJs, "monitor.js"), "utf8")
  .replace(/import \{ weekKeyFor, getWeekActivity \} from "\.\/activity\.js";/,
    'const weekKeyFor = () => { throw new Error("not needed by this suite"); }; const getWeekActivity = weekKeyFor;')
  .replace(/import \{ listAllRecordsForPerson \} from "\.\/records\.js";/,
    'const listAllRecordsForPerson = async () => { throw new Error("not needed by this suite"); };')
  .replace(/import \{ summarizeStatuses, unitKeyLabel \} from "\.\/unit-keys\.js";/,
    `import { summarizeStatuses, unitKeyLabel } from "${fileUrl("unit-keys.js")}";`)
  .replace(/import \{ langText \} from "\.\/lang\.js";/,
    `import { langText } from "${fileUrl("lang.js")}";`)
  .replace(/import \{ getAppLang \} from "\.\/prefs\.js";/,
    `import { getAppLang } from "${fileUrl("prefs.js")}";`)
  .replace(/import \{ t, num \} from "\.\/i18n\.js";/,
    `import { t, num } from "${fileUrl("i18n.js")}";`)
  .replace(/import \{ listStudyActivityEvidence \} from "\.\/study-activity-evidence-store\.js";/,
    "const { listStudyActivityEvidence } = globalThis.__monitorTestReader;");

// POSITIVE CONTROL for the rewrite itself: if any of the six replacements
// above stopped matching (the real file's import line changed shape), the
// unmodified original specifier would still be in the source and the dynamic
// import below would fail on the CDN/relative URL exactly as it does when run
// under plain `node` -- caught here, by name, instead of as an opaque
// ERR_UNSUPPORTED_ESM_URL_SCHEME three lines down.
for (const stale of ['from "./activity.js"', 'from "./records.js"', 'from "./unit-keys.js"',
  'from "./lang.js"', 'from "./prefs.js"', 'from "./i18n.js"', 'from "./study-activity-evidence-store.js"']) {
  if (source.includes(stale)) {
    console.error(`FATAL: rewrite of monitor.js did not match -- an import line changed shape: ${stale}`);
    process.exit(2);
  }
}

const monitor = await import(`data:text/javascript,${encodeURIComponent(source)}`);

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    }
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}
async function asyncCheck(name, fn) {
  try { await fn(); passed++; console.log(`  PASS  ${name}`); }
  catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

check("POSITIVE CONTROL: the rewritten module loaded and exports what this suite needs", () => {
  for (const name of ["studyActivityKind", "studyActivityKindLabel", "groupStudyActivityByKind",
    "studyActivitySectionHtml", "studyActivitySectionForWeek"]) {
    assert.equal(typeof monitor[name], "function", `monitor.js no longer exports ${name}`);
  }
});

const ALL_FOUR_ROWS = [
  { eventType: "reading.completed", unitKey: "ayah:2:255", dateIso: "2026-09-20" },
  { eventType: "listening.completed", unitKey: "surah:18", dateIso: "2026-09-21" },
  { eventType: "journal.note-created", unitKey: "ayah:1:1", dateIso: "2026-09-22" },
  { eventType: "journal.note-revised", unitKey: "ayah:1:1", dateIso: "2026-09-23" },
  { eventType: "wbw.engaged", unitKey: "range:2:1-7", dateIso: "2026-09-24" },
];

// --- studyActivityKind / grouping -------------------------------------------

check("studyActivityKind maps all five ADR-008 eventTypes to Monitor's four kinds", () => {
  assert.equal(monitor.studyActivityKind("reading.completed"), "reading");
  assert.equal(monitor.studyActivityKind("listening.completed"), "listening");
  assert.equal(monitor.studyActivityKind("journal.note-created"), "journaling");
  assert.equal(monitor.studyActivityKind("journal.note-revised"), "journaling");
  assert.equal(monitor.studyActivityKind("wbw.engaged"), "wbw");
});
check("an unrecognised eventType maps to null rather than a guessed kind", () => {
  assert.equal(monitor.studyActivityKind("something.new"), null);
  assert.equal(monitor.studyActivityKind(undefined), null);
});

check("groupStudyActivityByKind groups all four kinds from five rows (two Journaling events collapse into one kind)", () => {
  const groups = monitor.groupStudyActivityByKind(ALL_FOUR_ROWS);
  assert.equal(groups.length, 4, `expected 4 present kinds, saw ${groups.length}: ${groups.map((g) => g.kind).join(",")}`);
  const byKind = Object.fromEntries(groups.map((g) => [g.kind, g]));
  assert.equal(byKind.reading.count, 1);
  assert.equal(byKind.listening.count, 1);
  assert.equal(byKind.journaling.count, 2, "the two journal.* eventTypes did not collapse into one kind");
  assert.equal(byKind.wbw.count, 1);
  assert.deepEqual(byKind.reading.items, [{ unitKey: "ayah:2:255", dateIso: "2026-09-20" }]);
});
check("a kind with nothing recorded is absent, not printed as a zero", () => {
  const groups = monitor.groupStudyActivityByKind([ALL_FOUR_ROWS[0]]);
  assert.deepEqual(groups.map((g) => g.kind), ["reading"]);
});
check("an unrecognised eventType is silently excluded from every group, not miscounted into one", () => {
  const groups = monitor.groupStudyActivityByKind([...ALL_FOUR_ROWS, { eventType: "status.claimed", unitKey: "ayah:1:1", dateIso: "2026-09-24" }]);
  const total = groups.reduce((n, g) => n + g.count, 0);
  assert.equal(total, 5, "an unrecognised eventType was counted somewhere");
});

// --- studyActivitySectionHtml -----------------------------------------------

check("the empty state renders when nothing was recorded, and only then", () => {
  const html = monitor.studyActivitySectionHtml([], false);
  assert.match(html, /No study activity recorded this week\./);
});
check("all four kinds render from seeded evidence, each with its own count and unit label", () => {
  const html = monitor.studyActivitySectionHtml(ALL_FOUR_ROWS, false);
  assert.doesNotMatch(html, /No study activity recorded this week\./, "the empty state rendered despite real rows");
  for (const label of ["Reading", "Listening", "Journaling", "Word by Word"]) {
    assert.match(html, new RegExp(label), `"${label}" is missing from the rendered section`);
  }
  // Journaling shows its collapsed count (2), not one journal.* eventType's own count (1).
  assert.match(html, /Journaling \(2\)/);
  // Units are printed through unitKeyLabel() -- the app's existing reader --
  // never the raw stored key.
  assert.match(html, /Ayah/);
  assert.doesNotMatch(html, /ayah:2:255/, "a raw unit key leaked into the rendered section");
});
check("truncation gets an honest note; an untruncated read gets none", () => {
  const truncated = monitor.studyActivitySectionHtml(ALL_FOUR_ROWS, true);
  const whole = monitor.studyActivitySectionHtml(ALL_FOUR_ROWS, false);
  assert.match(truncated, /More study activity was recorded this week than is shown here\./);
  assert.doesNotMatch(whole, /More study activity was recorded this week than is shown here\./);
});
check("ADR-003: the rendered section carries no link, button or claim/confirm affordance", () => {
  const html = monitor.studyActivitySectionHtml(ALL_FOUR_ROWS, true);
  for (const forbidden of ["<a ", "<a>", "<button", "onclick", "status-achieved", "status-mastered", "claimedStatus", "confirmedStatus"]) {
    assert.ok(!html.includes(forbidden), `the rendered section contains "${forbidden}" -- this must stay plain, read-only text`);
  }
});

// --- studyActivitySectionForWeek: the fetch+render wrapper ------------------

await asyncCheck("studyActivitySectionForWeek calls the reader with exactly the given arguments and renders its result", async () => {
  calls = [];
  globalThis.__monitorTestReaderResult = { rows: ALL_FOUR_ROWS, truncated: false };
  const fakeDb = { marker: "fake-db" };
  const html = await monitor.studyActivitySectionForWeek(fakeDb, { tenantId: "t1", personId: "p1", weekKey: "2026-09-20" });
  assert.equal(calls.length, 1, "the reader was not called exactly once");
  assert.equal(calls[0].db, fakeDb, "the wrapper did not pass through the caller's db handle");
  assert.deepEqual(calls[0].args, { tenantId: "t1", personId: "p1", weekKey: "2026-09-20" },
    "the wrapper did not pass through tenantId/personId/weekKey unchanged");
  assert.match(html, /Reading/);
  assert.doesNotMatch(html, /No study activity recorded this week\./);
});
await asyncCheck("studyActivitySectionForWeek renders the empty state when the reader returns nothing", async () => {
  calls = [];
  globalThis.__monitorTestReaderResult = { rows: [], truncated: false };
  const html = await monitor.studyActivitySectionForWeek({}, { tenantId: "t1", personId: "p1", weekKey: "2026-09-20" });
  assert.match(html, /No study activity recorded this week\./);
});

console.log(`\n==== Monitor Study activity section: ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
