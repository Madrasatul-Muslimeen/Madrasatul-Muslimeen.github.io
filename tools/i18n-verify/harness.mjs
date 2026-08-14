import { chromium } from "playwright";
import { stubFor } from "./firebase-stub.mjs";

export const BASE = "http://localhost:8080";

export async function newContext(browser, { banner = true, appLang = null, viewport } = {}) {
  const ctx = await browser.newContext({ viewport });
  const stub = stubFor({ banner });
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
      if (lang) localStorage.setItem("mm_app_lang", lang);
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
