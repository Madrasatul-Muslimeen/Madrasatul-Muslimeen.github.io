// Speed part 3 (issue #278, 25 Sep 2026): Quran Study must be usable after at
// most 3 database round trips IN SEQUENCE, and must read `trackables` once.
// v08.70 left it at 4: getMyMemberships() hydrated every membership's own
// tenant document -- a round trip pickContext() never needed -- BEFORE
// tenantPeople/trackables could even start. session-context.js now splits
// that into a roles-only read (getMyMembershipRoles(), enough to pick the
// active tenant) and a separate hydration step (hydrateMemberships()) that
// quranrevival.html fires ALONGSIDE tenantPeople/trackables instead of
// before them, folding what were two round trips into one. Every round trip
// is one full phone-network wait, so this is a speed floor, not a style
// point. Run from the repository root with `node serve.js` running.
import { chromium, newContext, BASE } from "./harness.mjs";
import { SUBJECT_TEMPLATES, MODULE_TEMPLATES } from "../../app/js/catalogue-data.js";
import { APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } from "../../app/js/catalogue-data.js";

const LATENCY = 150;
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? "\n        " + detail : ""}`); }
};

/** Round trips in sequence: overlapping calls count once (the union of their intervals, in units of one latency). */
function sequentialTrips(log) {
  const iv = log.filter((r) => r.t1 != null).map((r) => [r.t0, r.t1]).sort((a, b) => a[0] - b[0]);
  let trips = 0, end = -Infinity;
  for (const [s, e] of iv) { if (s >= end - 1) { trips++; end = e; } else if (e > end) end = e; }
  return trips;
}

const browser = await chromium.launch();
const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 844 }, latencyMs: LATENCY,
  seedTemplates: { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } });
const page = await ctx.newPage();
await page.goto(`${BASE}/app/quranrevival.html`);
await page.waitForFunction(() => {
  const app = document.getElementById("app"), wheel = document.getElementById("wheelContainer");
  const ok = !!app && app.style.display !== "none" && !!wheel && !!wheel.querySelector("svg");
  if (ok && window.__usableAt == null) window.__usableAt = performance.now();
  return ok;
}, null, { timeout: 30000 });
await page.waitForTimeout(1200); // let background work land, so a late repeat read is seen too
const { log, usableAt } = await page.evaluate(() => ({ log: window.__fsLog, usableAt: window.__usableAt }));
const before = log.filter((r) => r.t0 <= usableAt);
const trips = sequentialTrips(before);
check(`Quran Study is usable after at most 3 database round trips in sequence (measured ${trips})`, trips <= 3,
  before.map((r) => `${r.kind} ${r.col}${r.id ? "/" + r.id : ""}`).join(" | "));
const trackableReads = log.filter((r) => r.col === "trackables" && r.kind === "getDocs").length;
check(`trackables is read once, including background work after the page is usable (measured ${trackableReads})`, trackableReads === 1);
await browser.close();
console.log(`\n==== Quran Study startup reads: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
