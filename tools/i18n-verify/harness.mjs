import { chromium } from "playwright";
import { stubFor } from "./firebase-stub.mjs";

export const BASE = "http://localhost:8080";

// appLang seeds THIS DEVICE (localStorage); accountLang seeds the ACCOUNT
// (userIndex/{uid}.appLang) -- v07.37. Setting them differently is what
// exercises the sync: the account's value should win and reload the page.
export async function newContext(browser, { banner = true, appLang = null, accountLang = null, viewport, latencyMs = 0, emptyTenant = false, seedTemplates = null } = {}) {
  const ctx = await browser.newContext({ viewport });
  const stub = stubFor({ banner, accountLang, latencyMs, emptyTenant, seedTemplates });
  await ctx.route("https://www.gstatic.com/firebasejs/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: stub })
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
  await ctx.addInitScript((lang) => {
    try {
      localStorage.setItem("mm_splash_pref", "never");
      localStorage.setItem("mm_qs_splash_pref", "never");
      // Only if ABSENT. addInitScript runs on every navigation, including
      // the reload the v07.37 account-language sync does -- so setting it
      // unconditionally re-imposed the device's value after every adopt
      // and the pair looped forever. A real device stores the preference
      // once and keeps it; nothing re-asserts it on each load.
      if (lang && !localStorage.getItem("mm_app_lang")) localStorage.setItem("mm_app_lang", lang);
    } catch {}
  }, appLang);
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
