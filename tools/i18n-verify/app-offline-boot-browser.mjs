// Issue #339 -- the app must open at all with no internet, once it has been
// opened once online. app/sw.js's own isCacheable() refuses every off-origin
// host on principle, and until this round that meant www.gstatic.com/
// firebasejs/... (the Firebase SDK every page's own <script type="module">
// imports at boot) and raw.githubusercontent.com (the Mushaf's own layout
// JSON and banner font) were refused right along with everything else -- so
// with no network those imports THREW and the page never booted at all,
// even though every /app/ file it needed was already on the phone. Firebase
// Auth keeps the signed-in user on the device and Firestore's own offline
// persistence is on (D5), so once the SDK loads, the app opens and shows
// what it last read.
//
// Written here, NOT run here -- this sandbox has no Playwright browser
// binaries installed (no node_modules at all) -- confirmed before writing
// this file, the same documented, repeated environment gap CLAUDE.md
// records for every browser-driven suite in this directory. The
// Architect/CI should run this for real before it is trusted.
//
// PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1, set below before launch:
// without it a context route never sees a request the service worker
// itself makes (see mushaf-font-offline-cache-browser.mjs's own Architect
// review comment) -- the worker's own fetch() calls for the Firebase SDK
// and the Mushaf assets would go straight to the real network instead of
// this harness's routed stubs, and every case here would fail for a reason
// that has nothing to do with the fix under test.
//
// A REAL, LOAD-BEARING TIMING FACT, worth stating up front because every
// case below is built around it: a worker never controls the page that
// registers it -- only pages navigated to AFTER it has installed, activated
// and (via clients.claim(), already in app/sw.js) claimed control. Same-
// origin app files are warmed proactively straight after that first load
// (the "warm" postMessage sw-register.js sends), but the Firebase SDK and
// the Mushaf's off-site assets are cross-origin and are NOT in that warm
// list (loadedAppFiles() only ever collects same-origin URLs) -- they are
// only ever cached from a CONTROLLED fetch, i.e. the SECOND online open
// onward. So "opened online once" is exercised here as two online opens
// followed by an offline one -- not a looser bar than the issue asked for,
// but what "once" already means for the QF fonts one layer up (issue #335)
// and for the app files themselves (issue #272): correct from the SECOND
// open, by construction, not the very first.
//
// SCOPE, matching the issue's own "Prove it" section:
//   1. quranrevival.html, opened online (twice, per the timing fact above),
//      boots with the network fully cut -- the landing screen (Mastery
//      Wheel) renders, no uncaught error. MUTATION TARGET: with the new
//      isFirebaseSdk()/handleFirebaseSdk() branch removed from app/sw.js,
//      this case must fail -- the SDK's cross-origin import throws with no
//      network and nothing after it ever runs.
//   2. The same claim through the real Mushaf rendering path: a page
//      already open online draws again once the network is gone.
//   3. A different host's URL, and a gstatic.com URL outside
//      /firebasejs/10.12.2/, is never cached.
//   4. The app-files cache and the QF font cache (v08.94) still fill
//      exactly as before -- full regression coverage of both lives in
//      their own dedicated suites (service-worker.mjs, mushaf-font-
//      offline-cache-browser.mjs), re-run alongside this one; this is a
//      light sanity check that the two new caches coexist without
//      displacing them.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const VIEWPORT = { width: 390, height: 844 };
const QURANREVIVAL_PATH = "/app/quranrevival.html";

// Copied from app/sw.js's own constants -- the coupling is deliberate (the
// same reason every other suite in this stack copies module-level
// constants): a rename on that side without a matching rename here fails
// this suite by name rather than passing vacuously.
const OTHER_GSTATIC_URL = "https://www.gstatic.com/some-other-thing.js"; // gstatic.com, outside the pinned prefix
const OTHER_HOST_URL = "https://example.com/whatever.js"; // a totally different host

// Copied from app/js/hifz-renderer.js's own module-level constants, same
// reasoning as mushaf-tajweed-font-browser.mjs's own copy of them.
const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";
const PLAIN_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const SYNTHETIC_MUSHAF_DATA = {
  "50": [{ type: "ayah", words: [{ g: "Ⓦ", loc: "3:55:1" }, { g: "Ⓜ", loc: "3:55:2" }] }],
};
const STAND_IN_FONT = fs.readFileSync(new URL("../../app/fonts/notonaskh.woff2", import.meta.url));

async function waitForController(page, timeoutMs = 8000) {
  return page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: timeoutMs })
    .then(() => true).catch(() => false);
}

/** A page-side predicate that returns a promise is ALWAYS truthy to
 *  Playwright's own page.waitForFunction, so it resolves at once. Poll the
 *  AWAITED result here instead (the same fix mushaf-font-offline-cache-
 *  browser.mjs's own Architect review made). `fn` runs IN THE PAGE via
 *  page.evaluate and must be self-contained -- no closure over a Node-side
 *  value such as `page` itself. */
async function waitForCacheState(page, fn, timeoutMs = 8000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await page.evaluate(fn)) return true;
    await page.waitForTimeout(100);
  }
  return false;
}

/** Reads every cache this worker owns, keyed by cache name, for direct
 *  assertions on which cache (if any) holds a given URL. */
async function allCaches(page) {
  return page.evaluate(async () => {
    const names = await caches.keys();
    const out = {};
    for (const n of names) {
      const cache = await caches.open(n);
      out[n] = (await cache.keys()).map((req) => req.url);
    }
    return out;
  });
}

async function sdkIsCached() {
  const names = await caches.keys();
  for (const n of names) {
    const cache = await caches.open(n);
    for (const req of await cache.keys()) {
      if (req.url.startsWith("https://www.gstatic.com/firebasejs/10.12.2/")) return true;
    }
  }
  return false;
}

async function mushafJsonIsCached() {
  const cache = await caches.open("mm-mushaf-v1");
  const keys = await cache.keys();
  return keys.some((r) => r.url.includes("mushaf-madani-v2.json"));
}

async function clickSafely(page, selector, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
    try { await page.click(selector, { timeout: 4000 }); return; } catch (err) { lastErr = err; }
  }
  throw lastErr;
}

/** Opens the Read screen, Surah 3 (Aal-i-Imraan), Whole Surah, Mushaf on --
 *  the same picker sequence every other Mushaf suite here already uses. */
async function openMushafSurah3(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await clickSafely(page, "#tabStudyBtn"); await page.waitForTimeout(150); }
  await clickSafely(page, "#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "3"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { const sel = document.getElementById("unitTypeSelect"); sel.value = "surah"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const m = document.getElementById("mushafToggle");
    if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(500);
}

function waitForAPage(page) {
  return page.waitForFunction(() => document.querySelectorAll(".hifz-page").length >= 1, null, { timeout: 8000 })
    .then(() => true).catch(() => false);
}

const realErrors = (errors) => errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID|FAILED|INTERNET_DISCONNECTED)/.test(e));

// =============================================================================
// 1. quranrevival.html: opened online (twice, per the timing fact above),
//    boots with the network fully cut. MUTATION TARGET.
// =============================================================================
{
  console.log("\n=== Offline boot -- quranrevival.html, opened online, then no network at all ===");
  const ctx = await newContext(browser, { allowServiceWorker: true, viewport: VIEWPORT, appLang: "en" });

  const firstOpen = await openPage(ctx, QURANREVIVAL_PATH);
  check("precondition: the worker takes control of the first, uncontrolled open", await waitForController(firstOpen.page));
  await firstOpen.page.close();

  const secondOpen = await openPage(ctx, QURANREVIVAL_PATH);
  await waitForController(secondOpen.page);
  check("the Firebase SDK is cached after a second, CONTROLLED online open",
    await waitForCacheState(secondOpen.page, sdkIsCached));
  await secondOpen.page.close();

  await ctx.setOffline(true);
  const { page, errors } = await openPage(ctx, QURANREVIVAL_PATH);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
  const booted = await page.waitForFunction(() => document.querySelectorAll("#wheelSection .wheel-seg").length > 0, null, { timeout: 8000 })
    .then(() => true).catch(() => false);
  check("MUTATION TARGET: with the network fully cut, the page still boots -- the Mastery Wheel actually renders", booted);
  check("no uncaught page error while booting offline", realErrors(errors).length === 0, realErrors(errors).join("; "));
  await ctx.close();
}

// =============================================================================
// 2. The same claim through the REAL Mushaf rendering path: a page already
//    opened online draws again once the network is gone.
// =============================================================================
{
  console.log("\n=== Offline boot -- Mushaf view, opened online, then no network at all ===");
  const ctx = await newContext(browser, { allowServiceWorker: true, viewport: VIEWPORT, appLang: "en" });
  await ctx.route(MUSHAF_JSON_URL, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNTHETIC_MUSHAF_DATA) }));
  await ctx.route(SURAH_HEADER_FONT_URL, (route) => route.abort("failed")); // this fixture's own surah never needs it
  await ctx.route(`${PLAIN_FONT_BASE}**`, (route) => route.fulfill({ status: 200, contentType: "font/woff2", body: STAND_IN_FONT }));

  const firstOpen = await openPage(ctx, QURANREVIVAL_PATH);
  await waitForController(firstOpen.page);
  await firstOpen.page.close();

  const { page: onlinePage } = await openPage(ctx, QURANREVIVAL_PATH);
  await waitForController(onlinePage);
  await openMushafSurah3(onlinePage);
  check("precondition: the Mushaf page rendered online", await waitForAPage(onlinePage));
  check("the Mushaf's own layout JSON is cached after being opened online",
    await waitForCacheState(onlinePage, mushafJsonIsCached));
  await onlinePage.close();

  // Now cut the network AND make every one of these off-origin URLs fail
  // outright if actually requested -- proving what draws next comes from the
  // worker's own kept copy, not a route stub still standing in for it.
  await ctx.unroute(MUSHAF_JSON_URL);
  await ctx.route(MUSHAF_JSON_URL, (route) => route.abort("failed"));
  await ctx.unroute(`${PLAIN_FONT_BASE}**`);
  await ctx.route(`${PLAIN_FONT_BASE}**`, (route) => route.abort("failed"));
  await ctx.setOffline(true);

  const { page, errors } = await openPage(ctx, QURANREVIVAL_PATH);
  await openMushafSurah3(page);
  const redrawn = await waitForAPage(page);
  check("with the network fully cut (and the routes themselves now refusing), the Mushaf page STILL draws", redrawn);
  check("no uncaught page error while redrawing the Mushaf offline", realErrors(errors).length === 0, realErrors(errors).join("; "));
  await ctx.close();
}

// =============================================================================
// 3. A different host's URL, and a gstatic.com URL outside
//    /firebasejs/10.12.2/, is never cached.
// =============================================================================
{
  console.log("\n=== Offline boot -- everything else off-origin stays uncached ===");
  const ctx = await newContext(browser, { allowServiceWorker: true, viewport: VIEWPORT, appLang: "en" });
  let otherGstaticHits = 0, otherHostHits = 0;
  await ctx.route(OTHER_GSTATIC_URL, (route) => { otherGstaticHits++; route.fulfill({ status: 200, contentType: "text/javascript", body: "" }); });
  await ctx.route(OTHER_HOST_URL, (route) => { otherHostHits++; route.fulfill({ status: 200, contentType: "text/javascript", body: "" }); });
  const { page } = await openPage(ctx, QURANREVIVAL_PATH);
  await waitForController(page);

  await page.evaluate((u) => fetch(u).then((r) => r.status).catch(() => null), OTHER_GSTATIC_URL);
  await page.evaluate((u) => fetch(u).then((r) => r.status).catch(() => null), OTHER_HOST_URL);
  await page.waitForTimeout(300);

  const cached = await allCaches(page);
  const allUrls = Object.values(cached).flat();
  check("a gstatic.com URL OUTSIDE /firebasejs/10.12.2/ is fetched (proving the route works) but never cached",
    otherGstaticHits > 0 && !allUrls.includes(OTHER_GSTATIC_URL), JSON.stringify({ otherGstaticHits, cached }));
  check("a URL on a totally different host is fetched but never cached",
    otherHostHits > 0 && !allUrls.includes(OTHER_HOST_URL), JSON.stringify({ otherHostHits, cached }));
  await ctx.close();
}

// =============================================================================
// 4. The app-files cache and the QF font cache (v08.94) still fill exactly
//    as before.
// =============================================================================
{
  console.log("\n=== Offline boot -- the app-files and QF font caches still work as before ===");
  const ctx = await newContext(browser, { allowServiceWorker: true, viewport: VIEWPORT, appLang: "en" });
  await ctx.route(MUSHAF_JSON_URL, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNTHETIC_MUSHAF_DATA) }));
  await ctx.route(SURAH_HEADER_FONT_URL, (route) => route.abort("failed"));
  await ctx.route(`${PLAIN_FONT_BASE}**`, (route) => route.fulfill({ status: 200, contentType: "font/woff2", body: STAND_IN_FONT }));

  const { page } = await openPage(ctx, QURANREVIVAL_PATH);
  await waitForController(page);
  await openMushafSurah3(page);
  await waitForAPage(page);
  await page.waitForTimeout(500);

  const cached = await allCaches(page);
  const appCacheUrls = Object.entries(cached).filter(([n]) => n.startsWith("mm-app-")).flatMap(([, urls]) => urls);
  const qfFontUrls = Object.entries(cached).filter(([n]) => n.startsWith("mm-qf-fonts-")).flatMap(([, urls]) => urls);
  check("the app-files (mm-app-*) cache still fills -- this page's own URL is in it",
    appCacheUrls.some((u) => u.endsWith(QURANREVIVAL_PATH)), JSON.stringify(cached));
  check("the QF font cache (mm-qf-fonts-*) still fills -- the plain glyph font just used is in it",
    qfFontUrls.some((u) => u.startsWith(PLAIN_FONT_BASE)), JSON.stringify(cached));
  await ctx.close();
}

// =============================================================================
// 5. Notes offline (v08.98): DOMPurify is the app's own copy now, so the
//    Note page can render a Note's body with no network. MUTATION TARGET:
//    point notes.html back at the CDN and window.DOMPurify is undefined
//    offline, so sanitizeNoteHtml() throws (it fails closed).
// =============================================================================
{
  console.log("\n=== Offline -- notes.html can still sanitise and show a Note body ===");
  const ctx = await newContext(browser, { allowServiceWorker: true, viewport: VIEWPORT, appLang: "en" });
  const firstOpen = await openPage(ctx, "/app/notes.html");
  await waitForController(firstOpen.page);
  check("the vendored DOMPurify is in the app-files cache after one online open",
    await waitForCacheState(firstOpen.page, async () => {
      for (const n of await caches.keys()) {
        if (!n.startsWith("mm-app-")) continue;
        const keys = await (await caches.open(n)).keys();
        if (keys.some((r) => r.url.endsWith("/app/vendor/purify.min.js"))) return true;
      }
      return false;
    }));
  await firstOpen.page.close();
  // harness.mjs routes the jsDelivr DOMPurify URL to a local copy (the
  // sandbox proxy breaks that CDN's certificate). Real offline has no such
  // stand-in, so refuse it here -- otherwise a page still pointing at the CDN
  // would pass this case for a reason the Owner's phone never has.
  const CDN = "https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js";
  await ctx.unroute(CDN);
  await ctx.route(CDN, (route) => route.abort("internetdisconnected"));
  await ctx.setOffline(true);
  const { page } = await openPage(ctx, "/app/notes.html");
  const result = await page.evaluate(async () => {
    const hasPurify = typeof window.DOMPurify?.sanitize === "function";
    let clean = null, err = null;
    try {
      const m = await import("/app/js/note-sanitize.js");
      clean = m.sanitizeNoteHtml('<p>Bismillah<script>alert(1)</script><b>x</b></p>');
    } catch (e) { err = String(e?.message || e); }
    return { hasPurify, clean, err };
  });
  check("MUTATION TARGET: offline, window.DOMPurify is loaded on notes.html", result.hasPurify, JSON.stringify(result));
  check("offline, a Note body is sanitised (script removed, formatting kept)",
    !!result.clean && result.clean.includes("<b>x</b>") && !/script/i.test(result.clean), JSON.stringify(result));
  await ctx.close();
}

console.log(`\n==== App offline boot (issue #339): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
