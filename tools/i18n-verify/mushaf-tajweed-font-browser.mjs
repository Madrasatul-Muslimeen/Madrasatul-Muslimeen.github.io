// Issue #332 -- Mushaf fonts from Quran Foundation + a per-page Tajweed
// colours toggle, RENDERED acceptance QA in a real browser, following this
// project's own established practice for a focused, committed browser
// suite. Written here, NOT run here -- this sandbox has no Playwright
// browser binaries installed (no node_modules at all), the same documented,
// repeated environment gap CLAUDE.md records for every browser-driven suite
// in this directory. The Architect/CI should run this for real before it is
// trusted.
//
// Permission check: docs/reports/2026-09-27-tajweed-font-permission.md.
// Its five points are what the checks below are proving:
//   1/2. The Tajweed font is loaded from the CDN at runtime, one page at a
//        time, only when the toggle is on -- never copied into this repo.
//   3.   Point 3 UPDATED, 27 Sep 2026: caching these fonts is now
//        permitted (the Owner holds a Quran Foundation Developer Console
//        account) -- issue #335 turns it on. What this suite still proves
//        (section 5, below) is the narrower, still-binding half: a kept
//        font is NEVER in the app-files cache. The rest of #335's own
//        contract (survives offline, refreshes past 7 days, an unopened
//        page stays uncached) is proven in its own dedicated suite,
//        mushaf-font-offline-cache-browser.mjs.
//   4.   The credit is shown (about.html, and a line while Tajweed is on).
//   5.   Plain stays the default.
//
// SCOPE, matching the issue's own "Prove it" section:
//   Part A -- the plain Mushaf requests page fonts only from
//   verses.quran.foundation/.../hafs/v2/, never from
//   raw.githubusercontent.com/.../mushaf/fonts/.
//   Part B -- the toggle (present, >=40px), no Tajweed font request before
//   it, exactly one per page shown after, word/marker taps still work,
//   the preference persists, a failed font load shows a message and keeps
//   the plain page, a kept CDN font never lands in the app-files cache
//   (issue #335 changed what "keeps" means here -- see point 3 above),
//   the credit is shown.
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// Copied from app/js/hifz-renderer.js's own module-level constants -- the
// coupling is deliberate (same reason every other Mushaf suite in this
// directory copies them): a rename on that side without a matching rename
// here fails this suite by name rather than passing vacuously.
const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";
// The OLD host -- issue #332 Part A moves the plain page fonts off this
// host. Routed and counted below so "never requested any more" is proven,
// not assumed.
const OLD_MUSHAF_FONT_BASE = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/fonts/";
const PLAIN_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const TAJWEED_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v4/colrv1/woff2/";
const QURAN_FOUNDATION_URL = "https://quran.foundation/";

const STAND_IN_FONT = fs.readFileSync(new URL("../../app/fonts/notonaskh.woff2", import.meta.url));

// Two real pages (50 and 51 -- the ones surah 3's own fixture pages already
// use elsewhere in this stack), so "exactly one [font request] per page
// shown" is a real >1 count, not a coincidence of a single-page fixture.
const SYNTHETIC_MUSHAF_DATA = {
  "50": [{ type: "ayah", words: [{ g: "Ⓦ", loc: "3:55:1" }, { g: "Ⓜ", loc: "3:55:2" }] }],
  "51": [{ type: "ayah", words: [{ g: "Ⓧ", loc: "3:56:1" }, { g: "Ⓝ", loc: "3:56:2" }] }],
};

/** `onFont(kind, route)` sees every plain/Tajweed font request as it happens,
 *  `kind` being "plain" or "tajweed" -- callers count from there rather than
 *  this function keeping its own counters, so a suite section that installs
 *  the fixture twice (e.g. across a reload) never has to reset anything. */
async function installMushafFixture(ctx, { onFont, tajweedOutcome = "ok" } = {}) {
  await ctx.route(MUSHAF_JSON_URL, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNTHETIC_MUSHAF_DATA) }));
  await ctx.route(SURAH_HEADER_FONT_URL, (route) => route.abort("failed"));
  // Part A's own proof: the OLD host must never be asked for anything. If it
  // ever is, fail the request (so the app's own quiet-fallback path is what
  // a stray old-URL reference would hit) and let the counter below catch it.
  await ctx.route(`${OLD_MUSHAF_FONT_BASE}**`, (route) => {
    onFont?.("old-host", route.request().url());
    route.abort("failed");
  });
  await ctx.route(`${PLAIN_FONT_BASE}**`, (route) => {
    onFont?.("plain", route.request().url());
    route.fulfill({ status: 200, contentType: "font/woff2", body: STAND_IN_FONT });
  });
  await ctx.route(`${TAJWEED_FONT_BASE}**`, (route) => {
    onFont?.("tajweed", route.request().url());
    if (tajweedOutcome === "fail") return route.abort("failed");
    return route.fulfill({ status: 200, contentType: "font/woff2", body: STAND_IN_FONT });
  });
}

async function clickSafely(page, selector, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    await page.evaluate(() => {
      document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove());
    });
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

async function waitForBothPages(page) {
  return page.waitForFunction(
    () => document.querySelectorAll(".hifz-page").length >= 2,
    null,
    { timeout: 5000 },
  ).then(() => true).catch(() => false);
}

function tajweedToggles(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll(".hifz-tajweed-toggle input[type=checkbox]")].map((el) => ({
      checked: el.checked,
      disabled: el.disabled,
      rect: el.closest("label").getBoundingClientRect(),
    })));
}

const realErrors = (errors) => errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID|FAILED)/.test(e));

// =============================================================================
// 1. Layout: the toggle is present and >=40px, at 320/390/1100, en + bn.
//    Part A companion: the plain font is requested from the NEW host only,
//    never the old one, in ordinary (Tajweed-off) use.
// =============================================================================
for (const [width, height] of [[320, 640], [390, 844], [1100, 900]]) {
  for (const lang of ["en", "bn"]) {
    console.log(`\n=== Mushaf Tajweed toggle -- layout + Part A host check, ${width}x${height}, appLang=${lang} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height } });
    const fontHits = [];
    await installMushafFixture(ctx, { onFont: (kind, url) => fontHits.push({ kind, url }) });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await openMushafSurah3(page);
    const settled = await waitForBothPages(page);
    check(`[${lang} ${width}] precondition: both synthetic Mushaf pages rendered`, settled);
    if (settled) {
      const toggles = await tajweedToggles(page);
      check(`[${lang} ${width}] a Tajweed toggle is present beside each page's own "Page N" label`, toggles.length === 2, JSON.stringify(toggles));
      check(`[${lang} ${width}] every toggle's own tap target is >=40px tall`, toggles.every((t) => t.rect.height >= 40), JSON.stringify(toggles.map((t) => t.rect.height)));
      check(`[${lang} ${width}] Plain stays the default -- every toggle starts unchecked`, toggles.every((t) => t.checked === false), JSON.stringify(toggles));
      check(`[${lang} ${width}] no new bar was added -- the toggle lives inside .hifz-page-header, not a sibling bar`,
        await page.evaluate(() => [...document.querySelectorAll(".hifz-tajweed-toggle")].every((el) => el.closest(".hifz-page-header"))));
      check(`[${lang} ${width}] Part A: the plain page font is requested from the Quran Foundation v2 CDN`, fontHits.some((h) => h.kind === "plain"), JSON.stringify(fontHits));
      check(`[${lang} ${width}] Part A: the old raw.githubusercontent.com/.../mushaf/fonts/ host is never requested`, fontHits.every((h) => h.kind !== "old-host"), JSON.stringify(fontHits));
      check(`[${lang} ${width}] no Tajweed font request happened before the toggle was ever touched`, fontHits.every((h) => h.kind !== "tajweed"), JSON.stringify(fontHits));
    }
    check(`[${lang} ${width}] no unexpected page errors`, realErrors(errors).length === 0, realErrors(errors).join("; "));
    await ctx.close();
  }
}

// =============================================================================
// 2. Turning the toggle on: exactly one Tajweed font request per page shown,
//    word/marker taps still work, the credit line appears.
// =============================================================================
for (const lang of ["en", "bn"]) {
  console.log(`\n=== Mushaf Tajweed toggle -- turning it on, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
  const fontHits = [];
  await installMushafFixture(ctx, { onFont: (kind, url) => fontHits.push({ kind, url }) });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openMushafSurah3(page);
  const settled = await waitForBothPages(page);
  check(`[${lang}] precondition: both synthetic Mushaf pages rendered`, settled);
  if (!settled) { await ctx.close(); continue; }

  fontHits.length = 0; // only what happens FROM HERE counts as "after the toggle"
  await page.evaluate(() => {
    const cb = document.querySelector(".hifz-tajweed-toggle input[type=checkbox]");
    cb.checked = true;
    cb.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(600);
  const tajweedHits = fontHits.filter((h) => h.kind === "tajweed");
  check(`[${lang}] turning the toggle on requests the Tajweed font exactly once per page shown (2 pages)`, tajweedHits.length === 2, JSON.stringify(fontHits));
  check(`[${lang}] every Tajweed request went to the v4 colrv1 CDN`, tajweedHits.every((h) => h.url.startsWith(TAJWEED_FONT_BASE)), JSON.stringify(tajweedHits));

  const toggles = await tajweedToggles(page);
  check(`[${lang}] every page's own toggle now reflects the one shared preference (checked)`, toggles.every((t) => t.checked === true), JSON.stringify(toggles));

  const creditLink = await page.evaluate(() => !!document.querySelector(`a[href="${"https://quran.foundation/"}"]`));
  check(`[${lang}] the "Quran fonts provided by Quran Foundation" credit is shown while Tajweed is on`, creditLink);

  // Word tap still opens the Word Card, in Tajweed mode.
  await page.evaluate(() => { document.querySelector('.hifz-word[data-word-occurrence]')?.click(); });
  await page.waitForTimeout(400);
  const wordCardOpen = await page.evaluate(() => !!document.querySelector("#quranWordCardMount .quran-word-card"));
  check(`[${lang}] a word tap still opens the Word Card with Tajweed on`, wordCardOpen);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // Marker tap still opens the Ayah Card, in Tajweed mode.
  await clickSafely(page, '[data-ayah-marker="3:55"]');
  await page.waitForTimeout(300);
  const ayahCardOpen = await page.evaluate(() => document.querySelector("[data-ayah-sheet]")?.dataset.unitKey === "ayah:3:55");
  check(`[${lang}] an āyah-marker tap still opens the Ayah Card with Tajweed on`, ayahCardOpen);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // Toggling on a SECOND time (after turning it off) must not re-request the
  // already-cached Tajweed font for either page -- I9's "loaded once per
  // session" promise, proven rather than assumed.
  fontHits.length = 0;
  await page.evaluate(() => {
    const cb = document.querySelector(".hifz-tajweed-toggle input[type=checkbox]");
    cb.checked = false;
    cb.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const cb = document.querySelector(".hifz-tajweed-toggle input[type=checkbox]");
    cb.checked = true;
    cb.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(400);
  check(`[${lang}] re-enabling Tajweed for a page already loaded this session makes no new font request`,
    fontHits.filter((h) => h.kind === "tajweed").length === 0, JSON.stringify(fontHits));

  check(`[${lang}] no unexpected page errors`, realErrors(errors).length === 0, realErrors(errors).join("; "));
  await ctx.close();
}

// =============================================================================
// 3. The preference persists across a reload.
// =============================================================================
{
  const lang = "en";
  console.log(`\n=== Mushaf Tajweed toggle -- persists across a reload, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
  const fontHits = [];
  await installMushafFixture(ctx, { onFont: (kind, url) => fontHits.push({ kind, url }) });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openMushafSurah3(page);
  check("precondition: both synthetic Mushaf pages rendered", await waitForBothPages(page));

  await page.evaluate(() => {
    const cb = document.querySelector(".hifz-tajweed-toggle input[type=checkbox]");
    cb.checked = true;
    cb.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(500);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.evaluate(() => { document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()); });
  await openMushafSurah3(page);
  const settledAfterReload = await waitForBothPages(page);
  check("both pages render again after reload", settledAfterReload);
  if (settledAfterReload) {
    const toggles = await tajweedToggles(page);
    check("the toggle opens back up already ON -- the reader's own last choice, not reset to plain",
      toggles.length > 0 && toggles.every((t) => t.checked === true), JSON.stringify(toggles));
  }
  check("no unexpected page errors", realErrors(errors).length === 0, realErrors(errors).join("; "));
  await ctx.close();
}

// =============================================================================
// 3b. Architect review, 27 Sep 2026 -- two defects found by LOOKING at a real
// Tajweed page, neither visible to the stand-in font above:
//  (a) toggling on a later page re-rendered the Mushaf and left the reader on
//      the unit's FIRST page (page 53 of Aal-i-Imraan -> page 50);
//  (b) the label row and credit inherited the page's glyph font, whose space
//      is zero-width, so they read "Page1" / "Tajweedcolours".
// =============================================================================
{
  const lang = "en";
  console.log(`\n=== Mushaf Tajweed toggle -- stays on the page, labels keep a text font, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
  await installMushafFixture(ctx);
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openMushafSurah3(page);
  check("precondition: both synthetic Mushaf pages rendered", await waitForBothPages(page));
  const inView = () => page.evaluate(() => {
    const c = document.getElementById("pageViewContainer"); const cr = c.getBoundingClientRect();
    let best = null, bw = 0;
    for (const p of c.querySelectorAll(".hifz-page")) {
      const r = p.getBoundingClientRect();
      const a = Math.max(0, Math.min(r.right, cr.right) - Math.max(r.left, cr.left)) * Math.max(0, Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top));
      if (a > bw) { bw = a; best = p; }
    }
    return best?.dataset.mushafPage ?? null;
  });
  const first = await inView();
  await page.evaluate(() => [...document.querySelectorAll(".hifz-page")][1].scrollIntoView({ inline: "start", block: "nearest", behavior: "instant" }));
  await page.waitForTimeout(400);
  const second = await inView();
  check("precondition: the reader is on the SECOND page before toggling", second && second !== first, `first=${first} second=${second}`);
  await page.evaluate((pg) => {
    const cb = document.querySelector(`.hifz-page[data-mushaf-page="${pg}"] .hifz-tajweed-toggle input[type=checkbox]`);
    cb.checked = true; cb.dispatchEvent(new Event("change", { bubbles: true }));
  }, second);
  await page.waitForFunction((pg) => {
    const c = document.getElementById("pageViewContainer"); const cr = c.getBoundingClientRect();
    const el = c.querySelector(`.hifz-page[data-mushaf-page="${pg}"]`);
    if (!el || !el.style.fontFamily.includes("tajweed")) return false;
    const r = el.getBoundingClientRect();
    return r.left >= cr.left - 5 && r.right <= cr.right + 5;
  }, second, { timeout: 5000 }).catch(() => {});
  check("after toggling on the second page, the reader is still on it (not sent back to the first)", (await inView()) === second, `in view: ${await inView()}, expected ${second}`);
  const fonts = await page.evaluate(() => [...document.querySelectorAll(".hifz-page-header, .hifz-tajweed-credit")].map((el) => getComputedStyle(el).fontFamily));
  check("the label row and credit use a text font, never the page's glyph font",
    fonts.length > 0 && fonts.every((f) => !/hifz-/.test(f)), JSON.stringify(fonts));
  check("no unexpected page errors", realErrors(errors).length === 0, realErrors(errors).join("; "));
  await ctx.close();
}

// =============================================================================
// 4. A failed Tajweed font load shows the message and keeps the plain page.
// =============================================================================
{
  const lang = "en";
  console.log(`\n=== Mushaf Tajweed toggle -- failed font load falls back to plain, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
  const fontHits = [];
  await installMushafFixture(ctx, { onFont: (kind, url) => fontHits.push({ kind, url }), tajweedOutcome: "fail" });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openMushafSurah3(page);
  check("precondition: both synthetic Mushaf pages rendered", await waitForBothPages(page));

  await page.evaluate(() => {
    const cb = document.querySelector(".hifz-tajweed-toggle input[type=checkbox]");
    cb.checked = true;
    cb.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(600);

  const state = await page.evaluate(() => ({
    families: [...document.querySelectorAll(".hifz-page")].map((p) => p.style.fontFamily),
    stillHasWords: !!document.querySelector(".hifz-word"),
    fallbackMessageShown: document.body.textContent.length > 0 && [...document.querySelectorAll(".hifz-page")].some((p) => p.querySelector(".hifz-line-error")),
  }));
  check("every page falls back to its own plain 'hifz-p{page}' family, not the failed Tajweed one",
    state.families.every((f) => /hifz-p\d+/.test(f) && !/hifz-tajweed-p/.test(f)), JSON.stringify(state.families));
  check("the page still shows its words -- the plain page is kept, not blanked", state.stillHasWords);
  check("a page whose Tajweed font failed shows the reader a message in words (I15)", state.fallbackMessageShown, JSON.stringify(state));

  const real = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID|FAILED)/.test(e) && !e.includes(TAJWEED_FONT_BASE));
  check("no unexpected page errors (the deliberate Tajweed-font abort itself is excluded)", real.length === 0, real.join("; "));
  await ctx.close();
}

// =============================================================================
// 5. app/sw.js keeps a verses.quran.foundation font ONLY in its own
//    dedicated cache, never in the app-files cache.
//
//    UPDATED IN PLACE, reason recorded: this check used to assert that
//    sw.js stores NO verses.quran.foundation request at all -- true when
//    #332 shipped, per the permission report's point 3 (caching needed a
//    Quran Foundation Developer Console account the Owner had not yet
//    confirmed). The SAME report's own "Update, 27 Sep 2026" records that
//    the Owner does hold one, so issue #335 turns offline caching of these
//    two font paths ON, deliberately, in a cache kept separate from the
//    app files (mm-app-*) so an app update never throws a kept font away --
//    see app/sw.js's own comment. The old assertion would now fail on
//    correct, intended behaviour; the new one is the narrower claim that
//    still has to hold: NEVER in the app-files cache. Full offline-serving
//    behaviour (survives a network block, refreshes past 7 days, a page
//    never opened stays uncached) is proven in its own dedicated suite,
//    mushaf-font-offline-cache-browser.mjs.
// =============================================================================
{
  const lang = "en";
  console.log(`\n=== Mushaf Tajweed toggle -- sw.js keeps the CDN font out of the app-files cache, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 }, allowServiceWorker: true });
  await installMushafFixture(ctx);
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller || true, null, { timeout: 8000 }).catch(() => {});
  await openMushafSurah3(page);
  const settled = await waitForBothPages(page);
  check("precondition: both synthetic Mushaf pages rendered", settled);
  if (settled) {
    await page.evaluate(() => {
      const cb = document.querySelector(".hifz-tajweed-toggle input[type=checkbox]");
      cb.checked = true;
      cb.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(1500); // let the worker's own background work settle
    const byCache = await page.evaluate(async () => {
      const names = await caches.keys();
      const out = {};
      for (const n of names) {
        const cache = await caches.open(n);
        out[n] = (await cache.keys()).map((req) => req.url);
      }
      return out;
    });
    const appCacheUrls = Object.entries(byCache).filter(([n]) => n.startsWith("mm-app-")).flatMap(([, urls]) => urls);
    const fontCacheUrls = Object.entries(byCache).filter(([n]) => n.startsWith("mm-qf-fonts-")).flatMap(([, urls]) => urls);
    check("no verses.quran.foundation URL is ever in the app-files (mm-app-*) cache",
      appCacheUrls.every((u) => !u.startsWith("https://verses.quran.foundation/")), JSON.stringify(byCache));
    check("issue #335: the plain and Tajweed fonts just opened ARE kept, but only in their own dedicated cache",
      fontCacheUrls.some((u) => u.startsWith("https://verses.quran.foundation/")), JSON.stringify(byCache));
  }
  const real = realErrors(errors);
  check("no unexpected page errors", real.length === 0, real.join("; "));
  await ctx.close();
}

// =============================================================================
// 6. The credit on about.html.
// =============================================================================
for (const lang of ["en", "bn"]) {
  console.log(`\n=== about.html -- Quran Foundation credit, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/about.html");
  const hasCredit = await page.evaluate(() => !!document.querySelector(`a[href="${"https://quran.foundation/"}"][target="_blank"]`));
  check(`[${lang}] about.html links to Quran Foundation with a real, tappable credit`, hasCredit);
  check(`[${lang}] no unexpected page errors`, realErrors(errors).length === 0, realErrors(errors).join("; "));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Mushaf Tajweed font toggle (issue #332): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
