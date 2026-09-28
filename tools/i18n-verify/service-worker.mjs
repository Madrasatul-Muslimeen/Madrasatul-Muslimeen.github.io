// The app's on-device cache -- app/sw.js and app/js/sw-register.js (load
// speed, issue #272, 25 Sep 2026).
//
// Every other suite in this stack disables the service worker via
// harness.mjs's own kill switch (`newContext()`'s `mm_disable_service_worker`
// localStorage flag) -- Playwright's own request routing is how all of them
// fake Firebase/Firestore, and a real worker intercepting fetches on top of
// that is a real-world interaction none of them were written to expect. This
// is the one suite that turns the worker back ON (`allowServiceWorker: true`)
// and tests it directly.
//
// NOT RUN in this sandbox: there is no `node_modules` here at all (no
// Playwright, no Chromium) -- confirmed before writing this file, not
// assumed. Written to run once an environment with Playwright installed is
// available (`node tools/i18n-verify/service-worker.mjs`); a real-phone
// check (open the app, background it, reopen with the network off) is the
// documented substitute this repository's own standing lessons already
// recommend for exactly this class of environment gap.
import { chromium, newContext, BASE } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? "\n        " + detail : ""}`); }
};

// Issue #339: sw.js's fetch handler now makes its OWN fetch() call for the
// Firebase SDK (www.gstatic.com/firebasejs/...) whenever a page it already
// controls re-requests it -- test 2 below is exactly that case (a second
// navigation, after the worker has claimed control). In Playwright 1.56 a
// context route does NOT see a request the worker itself makes unless this
// flag is set (see mushaf-font-offline-cache-browser.mjs's own Architect
// review comment) -- without it that fetch would reach the real network
// instead of harness.mjs's own gstatic stub route, breaking the page's
// Firebase Auth import for a reason that has nothing to do with the worker.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const VIEWPORT = { width: 390, height: 844 };
const PAGE_PATH = "/app/about.html"; // a plain, sign-in-optional page -- the worker's own behaviour does not depend on which page asked for it

/** Architect review: the cache fills asynchronously (the page tells the
 *  worker what it loaded once the worker is ready), so poll rather than
 *  guess a fixed pause. */
async function waitForCached(page, suffix, timeoutMs = 8000) {
  // Architect review, 27 Sep 2026 (#339): this used page.waitForFunction()
  // with an ASYNC predicate. A pending promise is always truthy to
  // Playwright, so it resolved at once and never waited -- "the page it just
  // opened is itself in the cache" then failed intermittently whenever the
  // warm message had not landed yet (seen once in three runs). Poll the
  // awaited answer instead.
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const found = await page.evaluate(async (sfx) => {
      for (const n of await caches.keys()) {
        if (!n.startsWith("mm-app-")) continue;
        const keys = await (await caches.open(n)).keys();
        if (keys.some((r) => r.url.endsWith(sfx))) return true;
      }
      return false;
    }, suffix);
    if (found) return true;
    await page.waitForTimeout(100);
  }
  return false;
}

async function waitForController(page, timeoutMs = 8000) {
  return page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: timeoutMs }).then(() => true).catch(() => false);
}

async function waitForActivation(page) {
  return page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return { supported: false };
    try {
      const reg = await navigator.serviceWorker.ready;
      return { supported: true, scope: reg.scope, controller: !!navigator.serviceWorker.controller };
    } catch (err) {
      return { supported: true, error: String(err) };
    }
  });
}

// ---------------------------------------------------------------------------
// 1. It registers, at the right scope, and its own cache actually fills.
// ---------------------------------------------------------------------------
{
  const ctx = await newContext(browser, { banner: false, allowServiceWorker: true, viewport: VIEWPORT });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${PAGE_PATH}`);
  const state = await waitForActivation(page);
  check("the browser supports service workers (a precondition, not the feature)", state.supported === true);
  check("a registration becomes ready with no error", !state.error, state.error);
  check("the registration's scope is /app/", typeof state.scope === "string" && state.scope.endsWith("/app/"), state.scope);

  await waitForCached(page, PAGE_PATH);
  const cacheNames = await page.evaluate(() => caches.keys());
  check("a versioned mm-app-* cache exists", cacheNames.some((n) => n.startsWith("mm-app-")), JSON.stringify(cacheNames));
  const cachedUrls = await page.evaluate(async (names) => {
    const urls = [];
    for (const n of names.filter((x) => x.startsWith("mm-app-"))) {
      const cache = await caches.open(n);
      for (const req of await cache.keys()) urls.push(req.url);
    }
    return urls;
  }, cacheNames);
  check("the page it just opened is itself in the cache", cachedUrls.some((u) => u.endsWith(PAGE_PATH)), JSON.stringify(cachedUrls));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 2. A second load makes no network request for app files -- served by the
//    worker instead. response.fromServiceWorker() is Playwright's own way to
//    tell the two apart (a plain reload with no worker would answer false
//    for every one of these).
// ---------------------------------------------------------------------------
{
  const ctx = await newContext(browser, { banner: false, allowServiceWorker: true, viewport: VIEWPORT });
  const first = await ctx.newPage();
  await first.goto(`${BASE}${PAGE_PATH}`);
  await waitForActivation(first);
  await waitForCached(first, PAGE_PATH);
  await first.waitForTimeout(500); // let the rest of the warm list land
  await first.close();

  const second = await ctx.newPage();
  const responses = [];
  second.on("response", (r) => responses.push(r));
  await second.goto(`${BASE}${PAGE_PATH}`);
  await second.waitForLoadState("networkidle").catch(() => {});
  await second.waitForTimeout(300);

  const appResponses = responses.filter((r) => r.url().startsWith(`${BASE}/app/`));
  check("the second load produced at least one app-file response to check", appResponses.length > 0, `${appResponses.length}`);
  const fromNetwork = appResponses.filter((r) => {
    try { return !r.fromServiceWorker(); } catch { return true; }
  });
  check("every app-file response on the second load came from the worker, not the network",
    fromNetwork.length === 0, fromNetwork.map((r) => r.url()).join(", "));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 3. Firestore/gstatic (and anything else off this origin) is never cached
//    by this worker, whatever a page happens to fetch -- EXCEPT the one
//    pinned Firebase SDK prefix issue #339 deliberately adds (see
//    service-worker's own "mushaf-font-offline-cache-browser.mjs" sibling,
//    mushaf-tajweed-font-browser.mjs and the new offline-boot suite for the
//    positive proof that prefix really does get cached and reused offline;
//    this check's job stays purely negative -- nothing UNEXPECTED joins it).
// ---------------------------------------------------------------------------
{
  const ctx = await newContext(browser, { banner: false, allowServiceWorker: true, viewport: VIEWPORT });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${PAGE_PATH}`);
  await waitForActivation(page);
  await page.waitForTimeout(500);
  const allCachedUrls = await page.evaluate(async () => {
    const names = await caches.keys();
    const urls = [];
    for (const n of names) {
      const cache = await caches.open(n);
      for (const req of await cache.keys()) urls.push(req.url);
    }
    return urls;
  });
  const offOrigin = allCachedUrls.filter((u) => !u.startsWith(BASE));
  const EXPECTED_EXT_PREFIX = "https://www.gstatic.com/firebasejs/10.12.2/";
  const unexpected = offOrigin.filter((u) => !u.startsWith(EXPECTED_EXT_PREFIX));
  check("the only off-origin URLs ever cached are the pinned Firebase SDK files (issue #339) -- nothing else (Firestore, jsdelivr, ...) is",
    unexpected.length === 0, unexpected.join(", "));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 4. Bumping APP_VERSION makes the next load fetch fresh files and delete
//    the old cache. sw.js imports APP_VERSION directly, so routing its own
//    import of version.js to a different value is enough to change the
//    worker's own bytes -- exactly what the browser's real update check
//    compares.
// ---------------------------------------------------------------------------
{
  const ctx = await newContext(browser, { banner: false, allowServiceWorker: true, viewport: VIEWPORT });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${PAGE_PATH}`);
  await waitForActivation(page);
  await page.waitForTimeout(500);
  await waitForCached(page, PAGE_PATH);
  const beforeCaches = await page.evaluate(() => caches.keys());
  const beforeName = beforeCaches.find((n) => n.startsWith("mm-app-"));
  check("a first-version cache exists before the bump", !!beforeName, JSON.stringify(beforeCaches));

  // Architect review: bump the version the way a real publish does -- the
  // served version.js changes -- and put it back whatever happens. (Routing
  // the page's own request cannot reach the worker's update check.)
  const versionPath = new URL("../../app/js/version.js", import.meta.url);
  const original = fs.readFileSync(versionPath, "utf8");
  try {
    fs.writeFileSync(versionPath, original.replace(/APP_VERSION = "[^"]+"/, 'APP_VERSION = "99.99"'));
    await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r?.update(); });
    // Architect review, 27 Sep 2026 (#339): this was page.waitForFunction()
    // with an async predicate, which is always truthy to Playwright -- the
    // check could not fail. Poll the awaited answer instead.
    let waiting = false;
    for (const end = Date.now() + 8000; Date.now() < end && !waiting; ) {
      waiting = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting);
      if (!waiting) await page.waitForTimeout(100);
    }
    // ...and is STILL waiting a second later: a worker that calls
    // skipWaiting() at install passes through "waiting" for an instant and
    // then takes over, which a single observation cannot tell apart (proven
    // by that exact mutation passing the old form of this check).
    if (waiting) {
      await page.waitForTimeout(1000);
      waiting = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting);
    }
    check("the new version downloads and WAITS instead of taking over the open page", waiting);
    const still = await page.evaluate(() => caches.keys());
    check("while it waits, the open page keeps its own version's files (no mixing)", still.includes(beforeName), JSON.stringify(still));
    const notice = await page.waitForSelector("#swUpdateNotice", { timeout: 5000 }).then(() => true).catch(() => false);
    check("the reader is told: \"Updated — tap to reload\"", notice);
    if (notice) {
      await Promise.all([page.waitForNavigation({ timeout: 10000 }).catch(() => {}), page.click("#swUpdateNotice")]);
    }
    await waitForActivation(page);
    await page.waitForTimeout(500);
    const afterCaches = await page.evaluate(() => caches.keys());
    check("after the tap, the new version's cache is in use", afterCaches.includes("mm-app-99.99"), JSON.stringify(afterCaches));
    check("the OLD version's cache was deleted on activate", !afterCaches.includes(beforeName), JSON.stringify(afterCaches));
  } finally {
    fs.writeFileSync(versionPath, original);
  }
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 5. ?nosw unregisters an already-installed worker.
// ---------------------------------------------------------------------------
{
  const ctx = await newContext(browser, { banner: false, allowServiceWorker: true, viewport: VIEWPORT });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${PAGE_PATH}`);
  await waitForActivation(page);
  check("(setup) a worker is controlling the page before ?nosw is used", await waitForController(page));

  await page.goto(`${BASE}${PAGE_PATH}?nosw=1`);
  await page.waitForTimeout(300);
  const regs = await page.evaluate(() => navigator.serviceWorker.getRegistrations());
  check("?nosw leaves no registration behind", regs.length === 0, JSON.stringify(regs));
  await ctx.close();
}

console.log(`\n==== Service worker: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
