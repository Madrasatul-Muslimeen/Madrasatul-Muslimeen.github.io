// Speed part 4 (issue #280, 25 Sep 2026): the same fix quranrevival-startup-
// reads.mjs pins for Quran Study (issue #278), applied to the shared
// bootstrap path (getMyMembershipRoles()/pickContext()/hydrateMemberships())
// four more pages take -- Deen Study and Health (topic-study.js/
// routine-study.js), Asma ul Husna (asma-study.js) and Records
// (records.html, its own inline bootstrap). Each must be usable after at
// most 4 database round trips IN SEQUENCE, and none may read its own
// tenant document twice (the exact repeat issue #278 fixed for
// quranrevival.html -- these four pages had the same repeat: the tenant
// document read once by hydrateMemberships() for the tenant picker's real
// names, and again by loadContextData()'s own Promise.all).
//
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, BASE } from "./harness.mjs";
import { SUBJECT_TEMPLATES, MODULE_TEMPLATES } from "../../app/js/catalogue-data.js";
import { APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } from "../../app/js/catalogue-data.js";

const LATENCY = 150;
const LIMIT = 4;
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? "\n        " + detail : ""}`); }
};

/** Round trips in sequence: overlapping calls count once (the union of their intervals, in units of one latency). Same shape as quranrevival-startup-reads.mjs -- kept in sync deliberately rather than imported, so a change to one page's measurement never silently changes another's. */
function sequentialTrips(log) {
  const iv = log.filter((r) => r.t1 != null).map((r) => [r.t0, r.t1]).sort((a, b) => a[0] - b[0]);
  let trips = 0, end = -Infinity;
  for (const [s, e] of iv) { if (s >= end - 1) { trips++; end = e; } else if (e > end) end = e; }
  return trips;
}

const SEEDED = { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES };

const PAGES = [
  {
    path: "/app/deen-study.html",
    name: "Deen Study",
    usable: () => {
      const app = document.getElementById("app");
      const list = document.getElementById("listContainer");
      return !!app && app.style.display !== "none" && !!list && list.children.length > 0;
    },
  },
  {
    path: "/app/health-study.html",
    name: "Health",
    usable: () => {
      const app = document.getElementById("app");
      const list = document.getElementById("listContainer");
      return !!app && app.style.display !== "none" && !!list && list.children.length > 0;
    },
  },
  {
    path: "/app/asma-study.html",
    name: "Asma ul Husna",
    usable: () => {
      const app = document.getElementById("app");
      const grid = document.getElementById("gridContainer");
      return !!app && app.style.display !== "none" && !!grid && grid.children.length > 0;
    },
  },
  {
    path: "/app/records.html",
    name: "Records",
    usable: () => {
      const app = document.getElementById("app");
      const body = document.getElementById("entriesBody");
      return !!app && app.style.display !== "none" && !!body && body.children.length > 0;
    },
  },
];

const browser = await chromium.launch();

for (const page of PAGES) {
  const ctx = await newContext(browser, {
    banner: false, viewport: { width: 390, height: 844 }, latencyMs: LATENCY, seedTemplates: SEEDED,
  });
  const p = await ctx.newPage();
  await p.goto(`${BASE}${page.path}`);
  await p.waitForFunction((fn) => {
    // eslint-disable-next-line no-new-func
    const ok = new Function("return (" + fn + ")()")();
    if (ok && window.__usableAt == null) window.__usableAt = performance.now();
    return ok;
  }, page.usable.toString(), { timeout: 30000 });
  await p.waitForTimeout(1200); // let background work (catalogue repair, etc.) land, so a late repeat read is seen too
  const { log, usableAt } = await p.evaluate(() => ({ log: window.__fsLog, usableAt: window.__usableAt }));
  const before = log.filter((r) => r.t0 <= usableAt);
  const trips = sequentialTrips(before);
  check(`${page.name} is usable after at most ${LIMIT} database round trips in sequence (measured ${trips})`, trips <= LIMIT,
    before.map((r) => `${r.kind} ${r.col}${r.id ? "/" + r.id : ""}`).join(" | "));
  const tenantReads = log.filter((r) => r.col === "tenants" && r.kind === "getDoc").length;
  check(`${page.name} reads its own tenant document at most once, including background work after the page is usable (measured ${tenantReads})`,
    tenantReads <= 1);
  await ctx.close();
}

await browser.close();
console.log(`\n==== Module startup reads (Deen Study, Health, Asma ul Husna, Records): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
