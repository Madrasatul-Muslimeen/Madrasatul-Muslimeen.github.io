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
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 844 }, latencyMs: LATENCY, seedTemplates: SEEDED });
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
      await navigator.serviceWorker.ready;
      return "ready";
    } catch {
      return "error";
    }
  });
  await first.waitForTimeout(500);
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
