import { chromium as pwChromium } from "playwright";
// 10 Oct 2026: a suite that calls chromium.launch() with no executablePath gets CHROMIUM_PATH when it is set, so a
// sandbox without Playwright's own download still runs it (four Notes suites never started here before).
const chromium = Object.create(pwChromium, {
  launch: { value: (opts = {}) => pwChromium.launch({ ...(process.env.CHROMIUM_PATH && !opts.executablePath ? { executablePath: process.env.CHROMIUM_PATH } : {}), ...opts }) },
});
import { stubFor } from "./firebase-stub.mjs";
import { readFileSync } from "node:fs";

const DOMPURIFY_SOURCE = readFileSync(new URL("./vendor/purify.min.js", import.meta.url), "utf8");

export const BASE = process.env.QR_BASE || "http://localhost:8080"; // QR_BASE=http://localhost:8081 for a second serve.js

// appLang seeds THIS DEVICE (localStorage); accountLang seeds the ACCOUNT
// (userIndex/{uid}.appLang) -- v07.37. Setting them differently is what
// exercises the sync: the account's value should win and reload the page.
export async function newContext(browser, { banner = true, appLang = null, accountLang = null, viewport, latencyMs = 0, emptyTenant = false, seedTemplates = null, taglines = null, extraSeedJs = null, allowServiceWorker = false, allowScreensaver = false, timezoneId = null, legacyTools = false } = {}) {
  const ctx = await browser.newContext({ viewport, ...(timezoneId ? { timezoneId } : {}) }); // timezoneId: an IANA zone for the page's clock (default: the machine's)
  const stub = stubFor({ banner, accountLang, latencyMs, emptyTenant, seedTemplates, taglines, extraSeedJs });
  await ctx.route("https://www.gstatic.com/firebasejs/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: stub })
  );
  // PCF MSA J112 R1: under this harness firebase-app.js is imported by ONE module only, siyagah-cloud.js, and only once
  // the Map has opened. Served as its own copy of the stub, that late copy would run AFTER the page's own and reset
  // window.__fsLog and re-point a suite's window.__DATA at a DATA no write ever reaches (measured: journey-s9's placements,
  // journey-editor's saves). So it re-exports the copy already running (firebase-auth.js's): nothing new is evaluated.
  await ctx.route("https://www.gstatic.com/firebasejs/*/firebase-app.js", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: `export * from ${JSON.stringify(route.request().url().replace(/firebase-app\.js$/, "firebase-auth.js"))};` })
  );
  // DOMPurify comes from a CDN in the real app. This sandbox's proxy breaks
  // the browser's certificate check for outside hosts, so a page that renders
  // Note bodies would refuse to (sanitize fails closed) and every such test
  // would fail for a reason that never happens to the Owner. Serve the same
  // library from a vendored copy instead (DOMPurify 3.4.16, Apache-2.0/MPL-2.0).
  await ctx.route("https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: DOMPURIFY_SOURCE })
  );
  await ctx.route("**/js/firebase-init.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/javascript; charset=utf-8",
      body: `import { getAuth, initializeFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
             export const auth = getAuth();
             export const db = initializeFirestore();
             export const firebaseApp = { name: "stub" };`,
    })
  );
  // Splashes would sit over the page and break every measurement; the old
  // app's own preference keys are the supported way to turn them off.
  await ctx.addInitScript(({ lang, allowServiceWorker, allowScreensaver }) => {
    try {
      localStorage.setItem("mm_splash_pref", "never");
      localStorage.setItem("mm_qs_splash_pref", "never");
      // LOAD SPEED (issue #272): a real service worker intercepting fetches
      // on top of this file's own Firebase/DOMPurify request routing is a
      // real-world interaction no existing suite was written to expect --
      // sw-register.js checks this flag before ever calling register(), so
      // every suite here keeps faking the network exactly as it always has.
      // The one suite that tests the worker ITSELF passes
      // `allowServiceWorker: true` to opt back out of this.
      if (!allowServiceWorker) localStorage.setItem("mm_disable_service_worker", "1");
      // 10 Oct 2026: the Asma screensaver starts by itself after a few minutes untouched; a slow suite must never
      // find a poster covering the page it measures. Its own suite opts back in (allowScreensaver: true).
      if (!allowScreensaver) localStorage.setItem("mm_disable_screensaver", "1");
      // Only if ABSENT. addInitScript runs on every navigation, including
      // the reload the v07.37 account-language sync does -- so setting it
      // unconditionally re-imposed the device's value after every adopt
      // and the pair looped forever. A real device stores the preference
      // once and keeps it; nothing re-asserts it on each load.
      if (lang && !localStorage.getItem("mm_app_lang")) localStorage.setItem("mm_app_lang", lang);
    } catch {}
  }, { lang: appLang, allowServiceWorker, allowScreensaver });
  // PCF MSA J114 (7 Nov 2026, ONE menu): the Read bar's ⋯ (More tools) is retired from sight, its two tools and the study buttons being tiles
  // in the ⋮ sheet. THE DEFAULT IS THE REAL PAGE: no style is injected, so every suite sees what a reader sees. A suite that still has to drive
  // the retired ⋯ path (its code is all still there) opts in with `legacyTools: true` and a one-line reason at its call site.
  if (legacyTools) {
    await ctx.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const st = document.createElement("style"); st.id = "zzToolsBack";
        st.textContent = "@media (max-width: 899.98px) { #readBar #readToolsBtn { display: inline-flex !important; } #readToolsMenu.open { display: grid !important; } } @media (min-width: 900px) { #readToolsMenu { display: contents !important; } } @media (max-width: 599.98px) { #readBar #readApproachBar { display: flex !important; } }";
        document.head.append(st);
      });
    });
  }
  return ctx;
}

export async function openPage(ctx, path) {
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  // Hide any splash overlay that still slipped through.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('[id*="splash"], .mm-splash-overlay')) el.remove();
  });
  return { page, errors };
}

export { chromium };

/** 10 Oct 2026 (the Owner: the Read bar's tools "under one button so that a row space is saved"): below 900px Text size,
 *  Bookmark, Notes, Mark complete, Writing sheet and Attach to Asma sit behind ⋯ (#readToolsBtn). Clicks `sel` the way a
 *  reader would: opening ⋯ first when the tool is not on screen. From 900px it is a plain click. */
// v10.27 (12 Oct 2026, "Add bookmark button on the top of the Mushaf page") and v12.16 (J63, the bar's 🔖 in the plain Read
// view too): from 900px, while the bar's own 🔖 (#readBarBookmarkBtn) shows, ⋯'s #readBookmarkBtn steps aside (`#readBar.bar-bm-on`) -- the bar's one forwards to it, the
// same bookmark. A reader presses the one on screen, so this does too (behaviour.mjs crashed on the hidden twin, measured on v12.22-23,
// stopping before sections 45-56).
const READ_TOOL_TWINS = { "#readBookmarkBtn": "#readBarBookmarkBtn" };
// MSA · QR J130 (a): since J114 (ONE ⋮ menu) #readNotesBtn and #readBookmarkBtn are display:none !important at every width (legacyTools does NOT bring
// them back); the real route to each is its tile in the ⋮ sheet. clickReadTool falls back to the tile when the old button is not on screen and the ⋮ is.
const READ_TOOL_TILES = { "#readNotesBtn": "#readQuickMenuSlot .qm-sheet [data-qm-note]", "#readBookmarkBtn": "#readQuickMenuSlot .qm-sheet [data-qm-bookmark]" };
// MSA · QR J132 (the Owner, 10 Nov 2026: "Study moves to dot"): the three Take an Approach | Record Your Progress | Know Your Status buttons are tiles in
// the Study group of the bar's ⋮ sheet at EVERY width (the gold pill and Study ▾ are off the bar). The buttons stay in the page, hidden, as what the
// tiles press; a suite that wants the reader's route opens ⋮ and presses the tile.
export const STUDY_TILES = { "#readBarTakeBtn": '[data-qm-act="approach"]', "#readBarRecordBtn": '[data-qm-act="record"]', "#readBarStatusBtn": '[data-qm-act="status"]' };
export async function clickStudyTile(page, sel) {
  const tile = `#readQuickMenuSlot .quick-menu ${STUDY_TILES[sel]}`;
  const open = await page.evaluate(() => !!document.querySelector("#readQuickMenuSlot .quick-menu")?.classList.contains("open"));
  if (!open) { await page.click("#readQuickMenuSlot .ayah-quick-btn", { timeout: 8000 }); await page.waitForTimeout(300); }
  await page.click(tile, { timeout: 8000 });
}
export async function clickReadTool(page, sel) {
  if (STUDY_TILES[sel]) return clickStudyTile(page, sel);
  const tile = READ_TOOL_TILES[sel];
  const shownNow = (q) => page.evaluate((s) => (document.querySelector(s)?.getBoundingClientRect().width ?? 0) > 0, q);
  if (tile && !(await shownNow(sel)) && !(await shownNow("#readBarBookmarkBtn"))) {
    if (!(await shownNow(tile)) && (await shownNow("#readQuickMenuSlot .ayah-quick-btn"))) { await page.click("#readQuickMenuSlot .ayah-quick-btn"); await page.waitForTimeout(300); }
    if (await shownNow(tile)) { await page.click(tile); return; }
  }
  const twin = READ_TOOL_TWINS[sel];
  if (twin && await page.evaluate(([s, t]) => (document.querySelector(s)?.getBoundingClientRect().width ?? 0) === 0 && (document.querySelector(t)?.getBoundingClientRect().width ?? 0) > 0, [sel, twin])) sel = twin;
  const shown = await page.evaluate((s) => (document.querySelector(s)?.getBoundingClientRect().width ?? 0) > 0, sel);
  if (!shown && await page.evaluate(() => (document.getElementById("readToolsBtn")?.getBoundingClientRect().width ?? 0) > 0)) {
    await page.click("#readToolsBtn");
    await page.waitForTimeout(150);
  }
  await page.click(sel);
}

/** The Owner, 9 Nov 2026 (Demo 1): the Reading View is "Read on" inside the ONE Ayah view. One step toward Read on being ON:
 *  out of the Mushaf first (📖 goes Mushaf → ONE Ayah view), then the switch. Suites loop this until the flow shows. */
export async function goReadOn(page) {
  await page.evaluate(() => {
    if (document.getElementById("mushafToggle")?.checked) { document.getElementById("readMeaningBtn").click(); return; }
    const c = document.getElementById("readOnCheck"); if (c && !c.checked) c.click();
  });
}
