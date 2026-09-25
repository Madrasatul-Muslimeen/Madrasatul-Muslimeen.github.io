// Load-speed measurement (August 2026).
//
// WHY THIS EXISTS, AND WHAT IT CAN AND CANNOT SHOW
//
// tools/i18n-verify stubs Firebase at the network layer so a page's own
// script really runs. That is exactly what is needed here too -- but a stub
// ANSWERS INSTANTLY. Left alone it would report every page as loading in a
// few milliseconds no matter how many Firestore reads it makes, which would
// be a comforting number and a false one.
//
// So two honest things are measured instead:
//
//   1. THE CALL LOG. Every Firestore read/write the page makes before it is
//      usable, in order, with start and end times. That is a fact about the
//      code, not about any network -- it does not change with connection
//      speed, and it is what a fix has to reduce.
//
//   2. WALL CLOCK UNDER SIMULATED LATENCY. Every stubbed call waits a set
//      number of milliseconds before answering, so a read that really costs
//      a round trip costs one here too. Reads the page fires together stay
//      together; reads it does one-after-another stack up, the same way they
//      do on a phone.
//
// The headline figure is "round trips in sequence": the busy time on the
// timeline divided by one round trip. Two reads fired together count as one;
// two reads fired one after the other count as two.
//
// Usage:  node tools/perf/measure.mjs [--latency 150] [--runs 3] [--label before]
//         node tools/perf/measure.mjs --net fast4g --cpu 4 --latency 100
//         node tools/perf/measure.mjs --net slow4g --cpu 4 --latency 150
//
// --net and --cpu (added for issue #272, 25 Sep 2026) are a SEPARATE, real
// throttle from --latency above: --latency only ever delays the STUBBED
// Firestore calls (see the header above and firebase-stub.mjs's __trip()).
// It says nothing about how long the 71 real static files (HTML/JS/CSS,
// served for real by serve.js over loopback) take to arrive -- and those are
// most of what a first-ever open has to pay for. --net throttles the
// browser's REAL network stack via CDP (Network.emulateNetworkConditions),
// so those requests really do compete for a phone-sized pipe; --cpu throttles
// script execution via CDP (Emulation.setCPUThrottlingRate), simulating a
// slower phone processor parsing/running the same JS. Both are Chromium-only,
// which is the only browser this harness ever launches.
import { chromium, newContext, BASE } from "../i18n-verify/harness.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } from "../../app/js/catalogue-data.js";
import { stableImportId } from "../../app/js/notes-import-shared.js";

// The tenant is measured in the state the owner's real one is in: seeded
// weeks ago, nothing left for the seeding paths to write.
const SEEDED = { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES };

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}
const LATENCY = Number(arg("latency", 150));
const RUNS = Number(arg("runs", 3));
const LABEL = arg("label", "run");
const ONLY = arg("only", null);
const NET = arg("net", null); // null | "fast4g" | "slow4g"
const CPU = Number(arg("cpu", 1));

// Throughput figures are the commonly-cited "Fast 4G" / "Slow 4G" phone
// profiles (kbps, converted to bytes/s below) -- deliberately not the
// Chrome DevTools "Fast 3G"/"Slow 3G" presets, which this project's own
// phone setups are faster than. Round-trip latency is NOT set here: it
// reuses whatever --latency was given, so one number describes the
// connection everywhere it is applied (the real static-asset requests AND
// the stubbed Firestore calls), rather than two figures that could disagree.
const NET_PROFILES_KBPS = {
  fast4g: { download: 9000, upload: 9000 },
  slow4g: { download: 1600, upload: 750 },
};
if (NET && !NET_PROFILES_KBPS[NET]) {
  throw new Error(`--net must be "fast4g" or "slow4g", got "${NET}"`);
}

/** Applies real CDP network + CPU throttling to one page. A no-op (returns
 *  null) when neither --net nor --cpu was asked for, so the default run
 *  behaves exactly as it did before this flag existed. */
async function throttle(ctx, page) {
  if (!NET && CPU <= 1) return null;
  const client = await ctx.newCDPSession(page);
  if (NET) {
    const profile = NET_PROFILES_KBPS[NET];
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: (profile.download * 1000) / 8,
      uploadThroughput: (profile.upload * 1000) / 8,
      latency: LATENCY,
    });
  }
  if (CPU > 1) await client.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  return client;
}

// ---------------------------------------------------------------------------
// Mapping My Journey at the Owner's real size (issue #282, speed part 5):
// 1,464 folders nested up to 6 deep, 1,083 Notes, 2,319 filings -- the exact
// numbers the Owner's own real mappingmyjourney.com export produced (v08.66's
// changelog entry). Built in Node, not as a giant literal inside the stub's
// own template string: `stableImportId()` is the REAL id-shape generator the
// WordPress/Evernote importers use in production
// (wordpress-import-parser.js's own `stableImportId("folder", termId)`), so
// the fixture's ids are genuinely import-shaped -- exercising the SAME
// leading-character clustering ("imp" + kind code + hash) journey-map-shard.js
// exists to split, rather than a synthetic id shape that would flatter it.
//
// updatedAt/createdAt are deliberately OMITTED: the stub's own
// serverTimestamp() returns a plain Date with no `.toDate()`, so journey-
// map.html's own optional-chained date rendering already tolerates their
// absence, and neither of the two profiles measured here (Folders, Path)
// needs a real date to become "usable" per this file's own definition below.
function buildJourneyMapSeed({ tenantId, ownerPersonId, ownerUid, folderCount, noteCount, placementCount, maxDepth }) {
  const folders = [];
  let created = 0;
  let level = [null]; // one virtual root parent, so the first generation are top-level folders
  let depth = 0;
  // A small root count and branching factor -- genuinely reaching maxDepth
  // (6) before folderCount is exhausted matters more here than a wide,
  // shallow tree would: it is what actually exercises deep nesting in the
  // Folders/Path views, not just the raw count.
  while (created < folderCount && depth <= maxDepth) {
    const nextLevel = [];
    for (const parentId of level) {
      if (created >= folderCount) break;
      const childCount = depth === 0 ? 4 : 2 + (created % 2);
      for (let c = 0; c < childCount && created < folderCount; c += 1) {
        const folderId = stableImportId("wordpress-import", "folder", String(created));
        folders.push({ folderId, parentFolderId: parentId, depth });
        nextLevel.push(folderId);
        created += 1;
      }
    }
    level = nextLevel;
    depth += 1;
  }
  // Every folder short of folderCount once maxDepth is reached becomes an
  // EXTRA CHILD of an existing folder (round-robin over every folder created
  // so far), not a new flat root -- a real WordPress category export nests
  // deeply because a real Owner organises by subject, not because every
  // folder sits at the top level. Depth is still capped at maxDepth: a
  // folder chosen as a parent that is already AT maxDepth gets its extra
  // child folded one level shallower instead (its own parent), so nothing
  // this function returns ever exceeds MAX_FOLDER_DEPTH.
  for (let i = 0; created < folderCount; i += 1) {
    const parent = folders[i % folders.length];
    const parentDepth = parent.depth < maxDepth ? parent.depth : parent.depth - 1;
    const parentId = parent.depth < maxDepth ? parent.folderId : parent.parentFolderId;
    const folderId = stableImportId("wordpress-import", "folder", String(created));
    folders.push({ folderId, parentFolderId: parentId, depth: parentDepth + 1 });
    created += 1;
  }

  const notes = Array.from({ length: noteCount }, (_, i) => ({
    noteId: stableImportId("wordpress-import", "note", String(i)),
  }));

  // Every Note gets ONE filing first (so nothing is orphaned), then the
  // remaining filings (placementCount - noteCount) are a SECOND folder for a
  // note chosen round-robin -- a real, if simplified, stand-in for ADR-010
  // §5's many-to-many placement, which is what makes a 🔗-badged Note in the
  // Path view exercisable at all.
  const placements = [];
  for (let i = 0; i < noteCount; i += 1) {
    const folder = folders[i % folders.length];
    placements.push({ noteId: notes[i].noteId, folderId: folder.folderId, rawKey: `${i}|${folder.folderId}` });
  }
  for (let i = 0; placements.length < placementCount; i += 1) {
    const note = notes[i % notes.length];
    const folder = folders[(i * 7 + 1) % folders.length]; // a different stride than the first pass, so it is usually a DIFFERENT folder
    placements.push({ noteId: note.noteId, folderId: folder.folderId, rawKey: `${note.noteId}-extra-${i}|${folder.folderId}` });
  }

  const own = { tenantId, ownerPersonId, ownerUid };
  return {
    noteFolders: folders.map((f, i) => ({
      _id: `${tenantId}__${f.folderId}`, folderId: f.folderId, ...own,
      name: `Folder ${i}`, parentFolderId: f.parentFolderId, semanticRole: "user", order: i, status: "active",
    })),
    notes: notes.map((n, i) => ({
      _id: `${tenantId}__${n.noteId}`, noteId: n.noteId, ...own,
      visibility: "private", title: `Imported Note ${i}`, bodyHtml: `<p>Note ${i}</p>`,
      status: "active", currentRevisionId: stableImportId("wordpress-import", "revision", String(i)),
    })),
    notePlacements: placements.map((p, i) => ({
      _id: `${tenantId}__${stableImportId("wordpress-import", "placement", p.rawKey)}`,
      placementId: stableImportId("wordpress-import", "placement", p.rawKey), ...own,
      noteId: p.noteId, folderId: p.folderId, order: i, status: "active",
    })),
  };
}

/** `extraSeedJs` for `newContext()`: appends the Owner's real-scale Mapping My Journey data to DATA, additively (concat, never replacing what the base stub already seeds for p1/t1). */
function journeyMapExtraSeedJs() {
  const seed = buildJourneyMapSeed({
    tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid",
    folderCount: 1464, noteCount: 1083, placementCount: 2319, maxDepth: 6,
  });
  return `
DATA.noteFolders = (DATA.noteFolders || []).concat(${JSON.stringify(seed.noteFolders)});
DATA.notes = (DATA.notes || []).concat(${JSON.stringify(seed.notes)});
DATA.notePlacements = (DATA.notePlacements || []).concat(${JSON.stringify(seed.notePlacements)});
`;
}

const JOURNEY_MAP_SEED_JS = journeyMapExtraSeedJs();

// "Usable" is per page: the moment the thing a person came for is on screen,
// not merely the moment the shell paints. Each predicate runs in the page.
const PAGES = [
  {
    path: "/app/quranrevival.html",
    name: "Quran Study (landing page)",
    usable: () => {
      const app = document.getElementById("app");
      const wheel = document.getElementById("wheelContainer");
      return !!app && app.style.display !== "none" && !!wheel && !!wheel.querySelector("svg");
    },
  },
  {
    path: "/app/deen-study.html",
    name: "Deen Study (a topic module)",
    usable: () => {
      const app = document.getElementById("app");
      const list = document.getElementById("listContainer");
      return !!app && app.style.display !== "none" && !!list && list.children.length > 0;
    },
  },
  {
    path: "/app/health-study.html",
    name: "Health (a routine module)",
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
  // Issue #285 (speed, part 6a) -- "usable" is the page's own weekly/monthly
  // report table, not the Quran breakdown or activity sections below it,
  // which are scoped to a single student and can legitimately say "Pick a
  // student first" -- the report is what every visit is for.
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
  // Issue #282 (speed, part 5) -- "usable" is the issue's own definition:
  // the folder tree is drawn. Neither profile waits for Notes/placements to
  // finish loading in the background (this round's own progressive-render
  // change) -- that would be measuring the OLD, sequential-everything
  // behaviour this round replaces, not what a reader actually waits through.
  // Computed ONCE (JOURNEY_MAP_SEED_JS below) and reused by both profiles --
  // it is a pure function of fixed numbers, and building the 4,866-row
  // fixture twice would cost real seconds for no reason.
  {
    path: "/app/journey-map.html#folders",
    name: "Mapping My Journey -- Folders, at real size (1,464 folders)",
    extraSeedJs: JOURNEY_MAP_SEED_JS,
    usable: () => {
      const app = document.getElementById("app");
      const tree = document.querySelector("[data-folder-tree]");
      return !!app && app.style.display !== "none" && !!tree && tree.children.length > 0;
    },
  },
  {
    path: "/app/journey-map.html#path",
    name: "Mapping My Journey -- Path, at real size (1,464 folders, 1,083 Notes)",
    extraSeedJs: JOURNEY_MAP_SEED_JS,
    usable: () => {
      const app = document.getElementById("app");
      const tree = document.querySelector("[data-path-tree]");
      return !!app && app.style.display !== "none" && !!tree && tree.children.length > 0;
    },
  },
];

/** Busy time on the timeline (union of every call's interval), in ms. */
function busyMs(log) {
  const iv = log
    .filter((r) => r.t1 != null)
    .map((r) => [r.t0, r.t1])
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let curStart = null;
  let curEnd = null;
  for (const [s, e] of iv) {
    if (curEnd === null || s > curEnd) {
      if (curEnd !== null) total += curEnd - curStart;
      curStart = s;
      curEnd = e;
    } else if (e > curEnd) curEnd = e;
  }
  if (curEnd !== null) total += curEnd - curStart;
  return total;
}

async function measureOnce(browser, page) {
  const ctx = await newContext(browser, {
    banner: false,
    viewport: { width: 390, height: 844 },
    latencyMs: LATENCY,
    seedTemplates: SEEDED,
    extraSeedJs: page.extraSeedJs ?? null,
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await throttle(ctx, p);

  const t0 = Date.now();
  await p.goto(`${BASE}${page.path}`);
  // Two moments, not one. "Shell" is when the page stops saying
  // "Checking sign-in…" and the app frame appears at all; "usable" is when
  // the thing the person came for is actually on screen.
  let shellMs = null;
  const shellWatch = p
    .waitForFunction(() => {
      const app = document.getElementById("app");
      return !!app && app.style.display !== "none";
    }, null, { timeout: 40000 })
    .then(() => { shellMs = Date.now() - t0; })
    .catch(() => {});
  let usableMs = null;
  try {
    // The predicate stamps the page's own clock the first time it is true,
    // so the call log can be split into "before the page was usable" and
    // "after" -- background work that lands later must not be counted
    // against the wait the person actually experiences.
    await p.waitForFunction((fn) => {
      // eslint-disable-next-line no-new-func
      const ok = new Function("return (" + fn + ")()")();
      if (ok && window.__usableAt == null) window.__usableAt = performance.now();
      return ok;
    }, page.usable.toString(), { timeout: 40000 });
    usableMs = Date.now() - t0;
  } catch {
    usableMs = null;
  }
  await shellWatch;
  // Let anything still in flight land, so the call log is complete.
  await p.waitForTimeout(600);

  const log = await p.evaluate(() => window.__fsLog || []);
  const usableAt = await p.evaluate(() => window.__usableAt ?? null);
  const navMs = await p.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0];
    return n ? { domContentLoaded: n.domContentLoadedEventEnd, load: n.loadEventEnd } : null;
  });
  await ctx.close();

  return { usableMs, shellMs, usableAt, log, navMs, errors };
}

function summarise(page, results) {
  const ok = results.filter((r) => r.usableMs != null);
  const times = ok.map((r) => r.usableMs).sort((a, b) => a - b);
  const median = times.length ? times[Math.floor(times.length / 2)] : null;
  const shells = results.map((r) => r.shellMs).filter((v) => v != null).sort((a, b) => a - b);
  const shellMedian = shells.length ? shells[Math.floor(shells.length / 2)] : null;
  const log = results[0].log;
  const usableAt = results[0].usableAt;
  const busy = busyMs(log);
  // Only the calls the person actually waited for. Anything that starts
  // after the page is usable (the background catalogue check) is real work
  // and real reads, but it is not part of the wait.
  const blockingBusy = busyMs(usableAt == null ? log : log.filter((r) => r.t0 < usableAt));
  return {
    page: page.name,
    path: page.path,
    shellMedianMs: shellMedian,
    usableMedianMs: median,
    usableAllMs: results.map((r) => r.usableMs),
    firestoreCalls: log.length,
    firestoreCallsBeforeUsable: usableAt == null ? log.length : log.filter((r) => r.t0 < usableAt).length,
    roundTripsBeforeUsable: LATENCY > 0 ? Math.round(blockingBusy / LATENCY) : null,
    roundTripsInSequence: LATENCY > 0 ? Math.round(busy / LATENCY) : null,
    busyMs: Math.round(busy),
    calls: log.map((r) => ({ n: r.n, kind: r.kind, col: r.col, id: r.id, t0: Math.round(r.t0), t1: Math.round(r.t1 ?? 0) })),
    errors: results[0].errors,
  };
}

/**
 * The second-open measurement the PR checklist asks for: one context (so the
 * service worker it installs and the Cache Storage it fills both survive),
 * two navigations of the same page. The FIRST navigation is what installs
 * the worker; the SECOND is the one that matters -- with the cache warm, it
 * should need no network request for any app file.
 *
 * `response.fromServiceWorker()` is Playwright's own way to tell "answered by
 * the worker" apart from "answered by the network" -- a plain page reload
 * without a worker would show every app-file response with this false.
 */
async function measureSecondOpen(browser, page) {
  // allowServiceWorker: the harness switches the worker OFF by default, and
  // without this the wait for it below never ends (found in review).
  const ctx = await newContext(browser, { banner: false, allowServiceWorker: true, viewport: { width: 390, height: 844 }, latencyMs: LATENCY, seedTemplates: SEEDED });
  const first = await ctx.newPage();
  await throttle(ctx, first);
  await first.goto(`${BASE}${page.path}`);
  await first.waitForFunction((fn) => new Function("return (" + fn + ")()")(), page.usable.toString(), { timeout: 40000 }).catch(() => {});
  // Give the worker time to finish installing/activating and populating its
  // cache in the background -- both happen after the page is already usable,
  // by design (registration must never block first paint).
  await first.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return "unsupported";
    try {
      await Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 15000))]);
      return "ready";
    } catch {
      return "error";
    }
  });
  // The page hands the worker the list of files it loaded; give that a moment.
  await first.waitForTimeout(1500);
  await first.close();

  const responses = [];
  const second = await ctx.newPage();
  await throttle(ctx, second);
  second.on("response", (res) => responses.push(res));
  const t0 = Date.now();
  await second.goto(`${BASE}${page.path}`);
  await second.waitForFunction((fn) => new Function("return (" + fn + ")()")(), page.usable.toString(), { timeout: 40000 }).catch(() => {});
  const usableMs = Date.now() - t0;

  const appFile = (url) => url.startsWith(`${BASE}/app/`);
  const appResponses = responses.filter((r) => appFile(r.url()));
  const fromWorker = appResponses.filter((r) => { try { return r.fromServiceWorker(); } catch { return false; } });
  const fromNetwork = appResponses.filter((r) => !fromWorker.includes(r));

  console.log(`\n=== ${page.name} -- second open, warm cache ===`);
  console.log(`  time to usable       : ${usableMs} ms`);
  console.log(`  app-file responses   : ${appResponses.length} total`);
  console.log(`  served by the worker : ${fromWorker.length}`);
  console.log(`  hit the network      : ${fromNetwork.length}${fromNetwork.length ? " -- " + fromNetwork.map((r) => r.url().replace(BASE, "")).join(", ") : ""}`);

  await ctx.close();
  return { page: page.name, usableMs, appResponses: appResponses.length, fromWorker: fromWorker.length, fromNetwork: fromNetwork.length };
}

// Chromium: use whatever this machine has. CHROMIUM_PATH overrides.
const EXE = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});

if (arg("warm", null) !== null) {
  const page = PAGES.find((p) => (ONLY ? p.path.includes(ONLY) : true)) ?? PAGES[0];
  const result = await measureSecondOpen(browser, page);
  await browser.close();
  mkdirSync("tools/perf/results", { recursive: true });
  writeFileSync(`tools/perf/results/${LABEL}-warm.json`, JSON.stringify(result, null, 2));
  console.log(`\nWritten to tools/perf/results/${LABEL}-warm.json`);
  process.exit(0);
}

const out = [];
for (const page of PAGES) {
  if (ONLY && !page.path.includes(ONLY)) continue;
  const results = [];
  for (let i = 0; i < RUNS; i++) results.push(await measureOnce(browser, page));
  const s = summarise(page, results);
  out.push(s);

  console.log(`\n=== ${s.page}  (${s.path}) ===`);
  console.log(`  app frame appears: ${s.shellMedianMs ?? "-"} ms`);
  console.log(`  time to usable   : ${s.usableMedianMs ?? "NEVER BECAME USABLE"} ms  (runs: ${s.usableAllMs.join(", ")})`);
  console.log(`  Firestore calls  : ${s.firestoreCallsBeforeUsable} before usable, ${s.firestoreCalls} in total`);
  console.log(`  round trips in sequence BEFORE USABLE: ${s.roundTripsBeforeUsable}   (all: ${s.roundTripsInSequence})`);
  if (s.errors.length) console.log(`  page errors      : ${s.errors.slice(0, 3).join(" | ")}`);
  console.log("  order of calls:");
  let prevEnd = 0;
  for (const c of s.calls) {
    const together = c.t0 < prevEnd - 5 ? " (with the one before)" : "";
    console.log(`    ${String(c.n).padStart(2)}. ${String(c.t0).padStart(5)}ms  ${c.kind} ${c.col}${c.id ? "/" + c.id : ""}${together}`);
    prevEnd = Math.max(prevEnd, c.t1);
  }
}

await browser.close();
mkdirSync("tools/perf/results", { recursive: true });
writeFileSync(`tools/perf/results/${LABEL}-${LATENCY}ms.json`, JSON.stringify({ latency: LATENCY, runs: RUNS, pages: out }, null, 2));
console.log(`\nWritten to tools/perf/results/${LABEL}-${LATENCY}ms.json`);
