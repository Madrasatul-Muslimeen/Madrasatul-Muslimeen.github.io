// Issue #335 -- keep the Quran Foundation Mushaf page fonts on the phone for
// offline reading (a follow-up to #332, once the Owner confirmed a Quran
// Foundation Developer Console account -- docs/reports/2026-09-27-tajweed-
// font-permission.md's own "Update, 27 Sep 2026"). RENDERED acceptance QA in
// a real browser, following this project's own established practice for a
// focused, committed browser suite. Written here, NOT run here -- this
// sandbox has no Playwright browser binaries installed (no node_modules at
// all), the same documented, repeated environment gap CLAUDE.md records for
// every browser-driven suite in this directory. The Architect/CI should run
// this for real before it is trusted.
//
// One assumption worth naming, since it can't be checked in this sandbox:
// every `ctx.route()` below is relied on to also intercept the fetch app/
// sw.js's OWN handler makes from inside the worker's script (as opposed to
// a page's own subresource fetch, which every other suite's routing already
// covers) -- documented, stable Playwright behaviour with the default
// `serviceWorkers: "allow"` context option this harness already uses, not
// exercised by any earlier suite here because the pre-#335 worker never
// touched this host at all. If a real run shows routes here going
// unmatched while the worker still behaves correctly, that is what to
// re-check first.
//
// SCOPE, matching the issue's own "Prove it" section, four points:
//   1. A page opened online is later drawn with the network blocked.
//   2. A page never opened is not in the cache.
//   3. A kept copy older than 7 days triggers a background refresh; a fresh
//      one does not.
//   4. Other verses.quran.foundation URLs and the app's own files keep
//      today's behaviour.
//
// Sections 1-4 below drive app/sw.js directly with a plain `fetch()` from a
// signed-in-optional page (about.html) -- this is deliberately the SAME
// mechanism a font's own subresource load uses from the worker's point of
// view (a GET request the fetch handler sees), and it gives exact control
// over timing/timestamps that driving the real Mushaf UI for every case
// would not. Section 5 then proves the same "opened online, later drawn
// with the network blocked" claim (point 1) through the REAL Mushaf
// rendering path, the same way mushaf-tajweed-font-browser.mjs already
// proves the rest of issue #332/#335's UI contract -- so the low-level
// worker behaviour and the on-screen result are both checked, not just one.
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

// Architect review, 27 Sep 2026: the assumption named in the header was
// WRONG as written. In Playwright 1.56 a context route does NOT see a
// request the service worker itself makes unless this flag is set -- the
// worker's fetch went straight to the real network (hits = 0) and, in a
// sandbox that cannot reach the CDN, every case failed with "Failed to
// fetch". Set here, before launch, so the suite needs nothing from whoever
// runs it.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const VIEWPORT = { width: 390, height: 844 };
const ABOUT_PATH = "/app/about.html"; // sign-in-optional; the worker's own behaviour doesn't depend on which page asked for it

// Copied from app/sw.js's own constants -- the coupling is deliberate (the
// same reason every other suite in this stack copies module-level
// constants): a rename on that side without a matching rename here fails
// this suite by name rather than passing vacuously.
const QF_FONT_CACHE_NAME = "mm-qf-fonts-v1";
const QF_FONT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PLAIN_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const TAJWEED_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v4/colrv1/woff2/";
const OTHER_QF_URL = "https://verses.quran.foundation/some-other-endpoint.json"; // not under either font path prefix

const STAND_IN_FONT = fs.readFileSync(new URL("../../app/fonts/notonaskh.woff2", import.meta.url));

async function waitForController(page, timeoutMs = 8000) {
  return page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: timeoutMs })
    .then(() => true).catch(() => false);
}

async function waitForFunction(page, fn, timeoutMs = 8000) {
  // A page-side predicate that returns a promise is ALWAYS truthy to
  // Playwright's own page.waitForFunction, so it would resolve at once.
  // Poll the awaited result here instead.
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

/** Directly seeds the QF font cache with a stamped response -- the same
 *  shape app/sw.js's own stampAndStore() writes -- so a case can start from
 *  a chosen age without waiting real days for one. */
async function seedFontCache(page, url, ageMs) {
  await page.evaluate(async ({ url, cachedAt }) => {
    const cache = await caches.open("mm-qf-fonts-v1");
    const headers = new Headers({ "content-type": "font/woff2", "x-mm-cached-at": String(cachedAt) });
    await cache.put(url, new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers }));
  }, { url, cachedAt: Date.now() - ageMs });
}

// =============================================================================
// 1. A page opened online is later drawn with the network blocked -- proven
//    at the worker level: a fresh (< 7 day) cached copy is served with ZERO
//    network attempt, whether or not the network would actually work.
// =============================================================================
{
  console.log("\n=== Offline font cache -- a fresh cached copy needs no network at all ===");
  const ctx = await newContext(browser, { banner: false, allowServiceWorker: true, viewport: VIEWPORT });
  const url = `${PLAIN_FONT_BASE}p50.woff2`;
  let hits = 0;
  await ctx.route(url, (route) => { hits++; route.fulfill({ status: 200, contentType: "font/woff2", body: STAND_IN_FONT }); });
  const { page } = await openPage(ctx, ABOUT_PATH);
  check("precondition: the page is controlled by the worker", await waitForController(page));

  const first = await page.evaluate((u) => fetch(u).then((r) => r.status), url);
  check("the first request (never opened before) is served over the network", first === 200, String(first));
  check("...and that one request is what got cached", hits === 1, String(hits));

  hits = 0;
  const second = await page.evaluate((u) => fetch(u).then((r) => r.status), url);
  check("a second request for the SAME font, still fresh, is answered without touching the network", second === 200 && hits === 0, `status=${second} hits=${hits}`);

  // Now block the network outright for this URL -- the offline case.
  await ctx.unroute(url);
  await ctx.route(url, (route) => { hits++; route.abort("failed"); });
  const offline = await page.evaluate((u) => fetch(u).then((r) => r.status).catch((e) => `error:${e}`), url);
  check("with the network blocked, the SAME font is still served (from the kept copy), not an error", offline === 200, String(offline));
  check("...and the blocked route was never even reached -- the worker never tried the network", hits === 0, String(hits));
  await ctx.close();
}

// =============================================================================
// 2. A page never opened is not in the cache -- nothing is pre-downloaded
//    (I9), and a fetch failure never leaves a stray entry behind either.
// =============================================================================
{
  console.log("\n=== Offline font cache -- an unopened page's font is never cached ===");
  const ctx = await newContext(browser, { banner: false, allowServiceWorker: true, viewport: VIEWPORT });
  const opened = `${TAJWEED_FONT_BASE}p50.woff2`;
  const neverOpened = `${TAJWEED_FONT_BASE}p51.woff2`;
  const failedOpen = `${PLAIN_FONT_BASE}p604.woff2`;
  await ctx.route(opened, (route) => route.fulfill({ status: 200, contentType: "font/woff2", body: STAND_IN_FONT }));
  await ctx.route(neverOpened, (route) => route.fulfill({ status: 200, contentType: "font/woff2", body: STAND_IN_FONT }));
  await ctx.route(failedOpen, (route) => route.abort("failed"));
  const { page } = await openPage(ctx, ABOUT_PATH);
  check("precondition: the page is controlled by the worker", await waitForController(page));

  check("precondition: the cache starts empty -- nothing pre-downloaded at install", Object.values(await allCaches(page)).every((urls) => !urls.some((u) => u.startsWith("https://verses.quran.foundation/"))));

  await page.evaluate((u) => fetch(u).then((r) => r.status), opened);
  await page.evaluate((u) => fetch(u).catch(() => null), failedOpen); // a genuine network failure

  const caches1 = await allCaches(page);
  const cachedUrls = Object.entries(caches1).filter(([n]) => n.startsWith("mm-qf-fonts-")).flatMap(([, urls]) => urls);
  check("the font that was actually requested IS cached", cachedUrls.includes(opened), JSON.stringify(caches1));
  check("a page whose font was never requested at all is NOT cached", !cachedUrls.includes(neverOpened), JSON.stringify(caches1));
  check("a font whose fetch genuinely failed is NOT cached either -- only a real 200 is kept", !cachedUrls.includes(failedOpen), JSON.stringify(caches1));
  await ctx.close();
}

// =============================================================================
// 3. A kept copy older than 7 days triggers a background refresh; a fresh
//    one does not.
// =============================================================================
{
  console.log("\n=== Offline font cache -- refreshed past 7 days, left alone before then ===");
  const ctx = await newContext(browser, { banner: false, allowServiceWorker: true, viewport: VIEWPORT });
  const staleUrl = `${PLAIN_FONT_BASE}p1.woff2`;
  const freshUrl = `${PLAIN_FONT_BASE}p2.woff2`;
  let staleHits = 0, freshHits = 0;
  // Architect review: the refetch is slowed to 1.5s so "answered without
  // waiting on the network" is measured as TIME. The original check read the
  // hit counter right after the fetch resolved, and the background refresh
  // (started in the same tick, correctly) had usually already reached the
  // route -- a race the check lost, not a defect in the worker.
  const SLOW_MS = 1500;
  await ctx.route(staleUrl, async (route) => { staleHits++; await new Promise((r) => setTimeout(r, SLOW_MS)); route.fulfill({ status: 200, contentType: "font/woff2", body: STAND_IN_FONT }).catch(() => {}); });
  await ctx.route(freshUrl, (route) => { freshHits++; route.fulfill({ status: 200, contentType: "font/woff2", body: STAND_IN_FONT }); });
  const { page } = await openPage(ctx, ABOUT_PATH);
  check("precondition: the page is controlled by the worker", await waitForController(page));

  await seedFontCache(page, staleUrl, QF_FONT_MAX_AGE_MS + 60 * 60 * 1000); // 7 days + 1 hour
  await seedFontCache(page, freshUrl, QF_FONT_MAX_AGE_MS - 60 * 60 * 1000); // 7 days - 1 hour

  const timed = (u) => page.evaluate(async (u) => { const t = performance.now(); const s = await fetch(u).then((r) => r.status); return { s, ms: performance.now() - t }; }, u);
  const staleAns = await timed(staleUrl);
  const freshAns = await timed(freshUrl);
  const staleStatus = staleAns.s, freshStatus = freshAns.s;
  check("a request for a stale-but-kept copy is still answered immediately", staleStatus === 200, String(staleStatus));
  check("a request for a fresh copy is answered immediately too", freshStatus === 200, String(freshStatus));
  check("neither answer waited on the network -- the stale copy came back well inside the 1.5s refetch", staleAns.ms < SLOW_MS / 2 && freshAns.ms < SLOW_MS / 2, `stale=${Math.round(staleAns.ms)}ms fresh=${Math.round(freshAns.ms)}ms`);

  // Wait for the STATE -- the refreshed entry's own stamp -- not a guess.
  await waitForFunction(page, `(async () => {
    const res = await (await caches.open("mm-qf-fonts-v1")).match(${JSON.stringify(staleUrl)});
    return Date.now() - Number(res?.headers.get("x-mm-cached-at")) < 60000;
  })()`);
  check("the STALE copy triggered exactly one background refetch", staleHits === 1, String(staleHits));
  check("the FRESH copy triggered no refetch at all", freshHits === 0, String(freshHits));

  const after = await allCaches(page);
  const staleEntryAge = await page.evaluate(async (u) => {
    const cache = await caches.open("mm-qf-fonts-v1");
    const res = await cache.match(u);
    const t = Number(res?.headers.get("x-mm-cached-at"));
    return Number.isFinite(t) ? Date.now() - t : null;
  }, staleUrl);
  check("the stale entry's own stored time was updated by the refresh (no longer >7 days old)", staleEntryAge !== null && staleEntryAge < QF_FONT_MAX_AGE_MS, `age=${staleEntryAge}`);
  void after;
  await ctx.close();
}

// =============================================================================
// 4. Other verses.quran.foundation URLs, and the app's own files, keep
//    today's behaviour.
// =============================================================================
{
  console.log("\n=== Offline font cache -- everything else is untouched ===");
  const ctx = await newContext(browser, { banner: false, allowServiceWorker: true, viewport: VIEWPORT });
  let otherHits = 0;
  await ctx.route(OTHER_QF_URL, (route) => { otherHits++; route.fulfill({ status: 200, contentType: "application/json", body: "{}" }); });
  const { page } = await openPage(ctx, ABOUT_PATH);
  check("precondition: the page is controlled by the worker", await waitForController(page));

  await page.evaluate((u) => fetch(u).then((r) => r.status), OTHER_QF_URL);
  await page.evaluate((u) => fetch(u).then((r) => r.status), OTHER_QF_URL);
  check("a verses.quran.foundation URL outside the two font paths is fetched over the network EVERY time (no caching)", otherHits === 2, String(otherHits));
  const caches1 = await allCaches(page);
  const anywhereCached = Object.values(caches1).some((urls) => urls.includes(OTHER_QF_URL));
  check("...and it is never put in any cache this worker owns", !anywhereCached, JSON.stringify(caches1));

  // The app's own files: unaffected by this round's change, still served
  // through the pre-existing mm-app-* stale-while-revalidate path. Polled
  // (the "warm" message only lands once navigator.serviceWorker.ready
  // resolves), the same pattern service-worker.mjs's own waitForCached()
  // uses, rather than a guessed fixed pause.
  await waitForFunction(page, `caches.keys().then((names) => Promise.all(
      names.filter((n) => n.startsWith("mm-app-")).map((n) => caches.open(n).then((c) => c.keys()))
    )).then((lists) => lists.some((keys) => keys.some((r) => r.url.endsWith(${JSON.stringify(ABOUT_PATH)}))))`);
  const caches2 = await allCaches(page);
  const appCacheUrls = Object.entries(caches2).filter(([n]) => n.startsWith("mm-app-")).flatMap(([, urls]) => urls);
  check("the app's own mm-app-* cache still fills as before -- this page's own URL is in it", appCacheUrls.some((u) => u.endsWith(ABOUT_PATH)), JSON.stringify(caches2));
  await ctx.close();
}

// =============================================================================
// 5. The same "opened online, later drawn with the network blocked" claim
//    (point 1), through the REAL Mushaf rendering path rather than a direct
//    fetch() -- the same fixture/flow mushaf-tajweed-font-browser.mjs uses.
// =============================================================================
{
  console.log("\n=== Offline font cache -- a real Mushaf page redraws with Tajweed while offline ===");
  const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
  const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";
  const SYNTHETIC_MUSHAF_DATA = {
    "50": [{ type: "ayah", words: [{ g: "Ⓦ", loc: "3:55:1" }, { g: "Ⓜ", loc: "3:55:2" }] }],
    "51": [{ type: "ayah", words: [{ g: "Ⓧ", loc: "3:56:1" }, { g: "Ⓝ", loc: "3:56:2" }] }],
  };

  const ctx = await newContext(browser, { appLang: "en", viewport: VIEWPORT, allowServiceWorker: true });
  await ctx.route(MUSHAF_JSON_URL, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNTHETIC_MUSHAF_DATA) }));
  await ctx.route(SURAH_HEADER_FONT_URL, (route) => route.abort("failed"));
  await ctx.route(`${PLAIN_FONT_BASE}**`, (route) => route.fulfill({ status: 200, contentType: "font/woff2", body: STAND_IN_FONT }));
  let tajweedHits = 0;
  await ctx.route(`${TAJWEED_FONT_BASE}**`, (route) => { tajweedHits++; route.fulfill({ status: 200, contentType: "font/woff2", body: STAND_IN_FONT }); });

  async function clickSafely(page, selector, attempts = 4) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
      try { await page.click(selector, { timeout: 4000 }); return; } catch (err) { lastErr = err; }
    }
    throw lastErr;
  }
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
  async function waitForBothPages(page) {
    return page.waitForFunction(() => document.querySelectorAll(".hifz-page").length >= 2, null, { timeout: 5000 })
      .then(() => true).catch(() => false);
  }

  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await waitForController(page);
  await openMushafSurah3(page);
  const settled = await waitForBothPages(page);
  check("precondition: both synthetic Mushaf pages rendered", settled);
  if (settled) {
    await page.evaluate(() => {
      const cb = document.querySelector(".hifz-tajweed-toggle input[type=checkbox]");
      cb.checked = true;
      cb.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".hifz-page")].every((p) => p.style.fontFamily.includes("tajweed")),
      null, { timeout: 5000 }).catch(() => {});
    // Architect review: page 51's Tajweed font is fetched about a second
    // after page 50's (as it nears the screen), so the request count was
    // read before it existed. Wait for BOTH fonts to be in the kept cache.
    await waitForFunction(page, `(async () => {
      const keys = await (await caches.open("mm-qf-fonts-v1")).keys();
      return [50, 51].every((n) => keys.some((r) => r.url === ${JSON.stringify(TAJWEED_FONT_BASE)} + "p" + n + ".woff2"));
    })()`, 10000);
    const onlineFamilies = await page.evaluate(() => [...document.querySelectorAll(".hifz-page")].map((p) => p.style.fontFamily));
    check("online: both pages drew in their Tajweed family", onlineFamilies.every((f) => /hifz-tajweed-p/.test(f)), JSON.stringify(onlineFamilies));
    check("...costing exactly one Tajweed font request per page (2)", tajweedHits === 2, String(tajweedHits));

    // Now go offline for the Tajweed font specifically, and force a fresh
    // render of the same pages (a reload resets hifz-renderer.js's own
    // in-memory FontFace cache, so this genuinely re-asks the worker).
    await ctx.unroute(`${TAJWEED_FONT_BASE}**`);
    tajweedHits = 0;
    await ctx.route(`${TAJWEED_FONT_BASE}**`, (route) => { tajweedHits++; route.abort("failed"); });
    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
    await openMushafSurah3(page);
    const settledAgain = await waitForBothPages(page);
    check("after reload, both synthetic pages render again", settledAgain);
    if (settledAgain) {
      await page.evaluate(() => {
        const cb = document.querySelector(".hifz-tajweed-toggle input[type=checkbox]");
        if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event("change", { bubbles: true })); }
      });
      await page.waitForFunction(() =>
        [...document.querySelectorAll(".hifz-page")].every((p) => p.style.fontFamily.includes("tajweed")),
        null, { timeout: 5000 }).catch(() => {});
      const offlineFamilies = await page.evaluate(() => [...document.querySelectorAll(".hifz-page")].map((p) => p.style.fontFamily));
      check("point 1: with the Tajweed font's network route now blocked, both pages STILL draw Tajweed -- served from the kept copy",
        offlineFamilies.every((f) => /hifz-tajweed-p/.test(f)), JSON.stringify(offlineFamilies));
      check("...and the blocked route was never actually reached -- no network attempt at all", tajweedHits === 0, String(tajweedHits));
    }
  }
  const real = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID|FAILED)/.test(e));
  check("no unexpected page errors", real.length === 0, real.join("; "));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Mushaf font offline cache (issue #335): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
