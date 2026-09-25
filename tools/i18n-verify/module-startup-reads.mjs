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
// Speed part 6a (issue #285, 25 Sep 2026) adds Monitor and Catalogue to the
// same pin. Monitor was five round trips in a row (roster+tenant, then
// subjectTree, then trackables, then the report, then the Quran breakdown,
// then the activity section); Catalogue was 8+ (three unconditional seeding
// checks, three unconditional placement-repair checks each re-reading the
// subject tree, then five more sequential loads -- the last, ladders, its
// own N+1 of one round trip per ladder). Both now fire their independent
// reads together and skip the seeding/repair checks entirely when what was
// just read shows nothing missing.
//
// Speed part 7 (issue #291, 25 Sep 2026) adds Notes, Bookmarks, People,
// Classes and Dawah to the same pin. Notes/Bookmarks/People/Dawah were each
// five or six sequential round trips (userIndex, then getMyMembershipRoles,
// then hydrateMemberships, then tenantPeople, then the page's own reads --
// none of it fired together). Classes was the worst: on top of the same
// chain, one listEnrollmentsForOffer() round trip PER CLASS CARD -- replaced
// with the whole-tenant listAllEnrollmentsForTenant() course-offers.html
// already uses, grouped client-side per card instead.
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
  // Issue #285 (speed, part 6a) -- "usable" is the weekly/monthly report
  // table, not the Quran breakdown or activity sections below it (both are
  // scoped to a single student and can legitimately say "Pick a student
  // first" without ever drawing a table).
  {
    path: "/app/monitor.html",
    name: "Monitor",
    usable: () => {
      const app = document.getElementById("app");
      const body = document.getElementById("reportBody");
      return !!app && app.style.display !== "none" && !!body && !!body.querySelector("table");
    },
  },
  // Issue #285 (speed, part 6a) -- "usable" is the Modules table, the first
  // thing this admin page draws.
  {
    path: "/app/catalogue.html",
    name: "Catalogue",
    usable: () => {
      const app = document.getElementById("app");
      const body = document.getElementById("modulesBody");
      return !!app && app.style.display !== "none" && !!body && body.children.length > 0;
    },
  },
  // Issue #288 (speed, part 6b) -- "usable" is the Assignments list, the
  // first thing this page draws. assignmentsBody starts as static markup
  // carrying a "Loading…" placeholder (unlike a bare empty <tbody>), so the
  // loading state is told apart from the loaded one by the
  // `.loading-placeholder` class every render of that placeholder carries,
  // not by children.length alone.
  {
    path: "/app/homework.html",
    name: "Homework",
    usable: () => {
      const app = document.getElementById("app");
      const body = document.getElementById("assignmentsBody");
      return !!app && app.style.display !== "none" && !!body && body.children.length > 0 && !body.querySelector(".loading-placeholder");
    },
  },
  // Issue #288 (speed, part 6b) -- "usable" is the Curriculum units list,
  // the first thing this admin page draws. Same loading-placeholder marker
  // reasoning as Homework above.
  {
    path: "/app/curriculum.html",
    name: "Curriculum",
    usable: () => {
      const app = document.getElementById("app");
      const body = document.getElementById("unitsBody");
      return !!app && app.style.display !== "none" && !!body && body.children.length > 0 && !body.querySelector(".loading-placeholder");
    },
  },
  // Issue #288 (speed, part 6b) -- "usable" is the Course offers list, the
  // first thing this page draws. Same loading-placeholder marker reasoning
  // as Homework above.
  {
    path: "/app/course-offers.html",
    name: "Course Offers",
    usable: () => {
      const app = document.getElementById("app");
      const body = document.getElementById("offersBody");
      return !!app && app.style.display !== "none" && !!body && body.children.length > 0 && !body.querySelector(".loading-placeholder");
    },
  },
  // Issue #291 (speed, part 7) -- "usable" is the Notes list for the one
  // Study Unit this screen is scoped to, same shape measure.mjs's own copy
  // of this predicate uses.
  {
    path: "/app/notes.html?unit=" + encodeURIComponent("ayah:1:1"),
    name: "My Notes",
    usable: () => {
      const app = document.getElementById("app");
      const banner = document.getElementById("unitBanner");
      const notesContainer = document.getElementById("notesContainer");
      const emptyMsg = document.getElementById("emptyMsg");
      return !!app && app.style.display !== "none" && banner.style.display === "block"
        && (notesContainer.children.length > 0 || emptyMsg.style.display === "block");
    },
  },
  // Issue #291 (speed, part 7) -- "usable" is the bookmarks manager's own
  // rendered state (a folder/unfiled/tagged-for row, or the empty message).
  {
    path: "/app/bookmarks.html",
    name: "Bookmarks",
    usable: () => {
      const app = document.getElementById("app");
      const folders = document.getElementById("foldersContainer");
      const unfiled = document.getElementById("unfiledContainer");
      const tagged = document.getElementById("taggedForContainer");
      const emptyMsg = document.getElementById("emptyMsg");
      return !!app && app.style.display !== "none"
        && (folders.children.length > 0 || unfiled.children.length > 0 || tagged.children.length > 0 || emptyMsg.style.display === "block");
    },
  },
  // Issue #291 (speed, part 7) -- "usable" is the roster table, the first
  // thing this page draws.
  {
    path: "/app/people.html",
    name: "People",
    usable: () => {
      const app = document.getElementById("app");
      const body = document.getElementById("rosterBody");
      return !!app && app.style.display !== "none" && !!body && body.children.length > 0;
    },
  },
  // Issue #291 (speed, part 7) -- "usable" is the Classes list, the first
  // thing this page draws. Same loading-placeholder marker reasoning as
  // Homework/Curriculum/Course Offers above.
  {
    path: "/app/classes.html",
    name: "Classes",
    usable: () => {
      const app = document.getElementById("app");
      const body = document.getElementById("classesBody");
      return !!app && app.style.display !== "none" && !!body && body.children.length > 0 && !body.querySelector(".loading-placeholder");
    },
  },
  // Issue #291 (speed, part 7) -- "usable" is the default "My pages" view,
  // the first thing this page draws.
  {
    path: "/app/dawah.html",
    name: "Dawah",
    usable: () => {
      const app = document.getElementById("app");
      const view = document.getElementById("viewMine");
      return !!app && app.style.display !== "none" && !!view && view.children.length > 0;
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
console.log(`\n==== Module startup reads (Deen Study, Health, Asma ul Husna, Records, Monitor, Catalogue, Homework, Curriculum, Course Offers, My Notes, Bookmarks, People, Classes, Dawah): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
