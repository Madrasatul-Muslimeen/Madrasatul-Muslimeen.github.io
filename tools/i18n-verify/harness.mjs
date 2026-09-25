import { chromium } from "playwright";
import { stubFor } from "./firebase-stub.mjs";
import { readFileSync } from "node:fs";

const DOMPURIFY_SOURCE = readFileSync(new URL("./vendor/purify.min.js", import.meta.url), "utf8");

export const BASE = "http://localhost:8080";

// appLang seeds THIS DEVICE (localStorage); accountLang seeds the ACCOUNT
// (userIndex/{uid}.appLang) -- v07.37. Setting them differently is what
// exercises the sync: the account's value should win and reload the page.
export async function newContext(browser, { banner = true, appLang = null, accountLang = null, viewport, latencyMs = 0, emptyTenant = false, seedTemplates = null, taglines = null, extraSeedJs = null, allowServiceWorker = false } = {}) {
  const ctx = await browser.newContext({ viewport });
  const stub = stubFor({ banner, accountLang, latencyMs, emptyTenant, seedTemplates, taglines, extraSeedJs });
  await ctx.route("https://www.gstatic.com/firebasejs/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: stub })
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
  await ctx.addInitScript(({ lang, allowServiceWorker }) => {
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
      // Only if ABSENT. addInitScript runs on every navigation, including
      // the reload the v07.37 account-language sync does -- so setting it
      // unconditionally re-imposed the device's value after every adopt
      // and the pair looped forever. A real device stores the preference
      // once and keeps it; nothing re-asserts it on each load.
      if (lang && !localStorage.getItem("mm_app_lang")) localStorage.setItem("mm_app_lang", lang);
    } catch {}
  }, { lang: appLang, allowServiceWorker });
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
