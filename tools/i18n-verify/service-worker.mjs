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

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? "\n        " + detail : ""}`); }
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const VIEWPORT = { width: 390, height: 844 };
const PAGE_PATH = "/app/about.html"; // a plain, sign-in-optional page -- the worker's own behaviour does not depend on which page asked for it

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

  await page.waitForTimeout(500); // let the background cache-fill (event.waitUntil in sw.js) land
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
  await first.waitForTimeout(500);
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
//    by this worker, whatever a page happens to fetch.
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
  check("nothing off this origin (Firestore, gstatic, jsdelivr, ...) was ever cached",
    offOrigin.length === 0, offOrigin.join(", "));
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
  const beforeCaches = await page.evaluate(() => caches.keys());
  const beforeName = beforeCaches.find((n) => n.startsWith("mm-app-"));
  check("a first-version cache exists before the bump", !!beforeName, JSON.stringify(beforeCaches));

  // Route ONLY this context's copy of version.js to a bumped value -- the
  // repository file itself is never touched.
  await ctx.route(`${BASE}/app/js/version.js`, (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: 'export const APP_VERSION = "99.99";' })
  );
  const reg = await page.evaluate(() => navigator.serviceWorker.getRegistration());
  await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    await r?.update();
  });
  // The new worker installs, then (per sw-register.js's own `updatefound`
  // handler) waits at "installed" rather than taking over immediately --
  // this suite drives the same activation a reader's own "Updated -- tap to
  // reload" tap would.
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    r?.waiting?.postMessage?.({}); // harmless if sw.js never listens for a message; skipWaiting() already ran at install
  });
  await page.reload();
  await waitForActivation(page);
  await page.waitForTimeout(500);

  const afterCaches = await page.evaluate(() => caches.keys());
  check("the new version's cache exists after the bump", afterCaches.some((n) => n === "mm-app-99.99"), JSON.stringify(afterCaches));
  check("the OLD version's cache was deleted on activate", !afterCaches.includes(beforeName), JSON.stringify(afterCaches));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 5. ?nosw unregisters an already-installed worker.
// ---------------------------------------------------------------------------
{
  const ctx = await newContext(browser, { banner: false, allowServiceWorker: true, viewport: VIEWPORT });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${PAGE_PATH}`);
  const before = await waitForActivation(page);
  check("(setup) a worker is controlling the page before ?nosw is used", before.controller === true);

  await page.goto(`${BASE}${PAGE_PATH}?nosw=1`);
  await page.waitForTimeout(300);
  const regs = await page.evaluate(() => navigator.serviceWorker.getRegistrations());
  check("?nosw leaves no registration behind", regs.length === 0, JSON.stringify(regs));
  await ctx.close();
}

console.log(`\n==== Service worker: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
