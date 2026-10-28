// Audit part 124 (PCF MSA J29): a save made while the line is DOWN on the shared tools. Offline persistence (D5) lets
// a write finish against the device's own copy, so the page used to say only "Saved" (or nothing) while nothing had
// left the device. errors.js's noteIfSavedOffline() now says so, calmly, after any successful save made offline.
//   Saves driven: Bookmarks "+ New bookmark" (safeWrite), Mapping My Journey "new folder" (runFolderWrite).
// The Firebase stub answers instantly and never queues, so what is measured is what the APP shows (navigator.onLine is
// false under context.setOffline). Online, the notice must NOT appear (positive control). 390 and 1280, en and bn.
//   node tools/i18n-verify/offline-save-shared-tools-browser.mjs [--mutate=no-notice]     (serve.js on :8080)
//   --mutate=no-notice   noteIfSavedOffline() never shows -> every offline-notice check FAILS
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = { "no-notice": ["navigator.onLine !== false) return;", "true) return;"] };
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SHOT = (process.argv.find((a) => a.startsWith("--shots=")) || "").slice(8); // --shots=/tmp/dir writes the bn-390 pictures

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const EN = "Saved on this device — it will be sent when you are online.";
const BN = "এই ডিভাইসে সংরক্ষিত হয়েছে — ইন্টারনেট এলে পাঠানো হবে।";

async function open(lang, w, url, ready) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    await ctx.route("**/js/errors.js*", async (r) => {
      const src = fs.readFileSync("app/js/errors.js", "utf8");
      if (!src.includes(MUT[MUTATE][0])) throw new Error("mutation anchor missing");
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(MUT[MUTATE][0]).join(MUT[MUTATE][1]) });
    });
  }
  const { page } = await openPage(ctx, url);
  await page.waitForSelector(ready, { state: "visible", timeout: 20000 });
  await page.waitForTimeout(800);
  return { ctx, page };
}
const notice = (page) => page.evaluate(() => {
  const el = document.getElementById("qr-offline-save-notice");
  if (!el || getComputedStyle(el).display === "none") return null;
  const r = el.getBoundingClientRect();
  return { text: el.querySelector("[data-offline-save-text]").textContent, inside: r.left >= 0 && r.right <= innerWidth + 0.5, h: Math.round(r.height), sx: document.documentElement.scrollWidth - innerWidth };
});
const wants = (lang) => (lang === "bn" ? BN : EN);

async function bookmark(page) {
  await page.click("#newBookmarkBtn");
  await page.waitForFunction(() => document.getElementById("nbName")?.value, null, { timeout: 10000 });
  await page.click("#nbCreateBtn");
  await page.waitForTimeout(900);
}
async function folder(page, name) {
  await page.fill("#newFolderName", name);
  await page.click("#newFolderForm button[type=submit]");
  await page.waitForTimeout(900);
}

for (const lang of ["en", "bn"]) for (const w of [390, 1280]) {
  const tag = `[${lang} ${w}]`;
  for (const [what, url, ready, act] of [
    ["bookmarks add", "/app/bookmarks.html", "#newBookmarkBtn", (p, n) => bookmark(p)],
    ["journey new folder", "/app/journey-map.html", "#newFolderName", (p, n) => folder(p, "Folder " + n)],
  ]) {
    const { ctx, page } = await open(lang, w, url, ready);
    // Online first: POSITIVE CONTROL -- a save with the line up shows no offline notice.
    await act(page, 1);
    check(`${tag} ${what}: online, no offline notice (positive control)`, (await notice(page)) === null);
    await ctx.setOffline(true);
    check(`${tag} ${what}: the page sees the line is down`, (await page.evaluate(() => navigator.onLine)) === false);
    const before = await page.evaluate(() => (window.__fsLog || []).length);
    await act(page, 2);
    const after = await page.evaluate(() => (window.__fsLog || []).length);
    check(`${tag} ${what}: the save still goes through (writing is not blocked)`, after > before, `${before}->${after}`);
    const n = await notice(page);
    check(`${tag} ${what}: offline, the page says it is saved on this device, in ${lang}`, !!n && n.text === wants(lang), JSON.stringify(n));
    check(`${tag} ${what}: the notice is on screen, 40px+ tall, no sideways scroll`, !!n && n.inside && n.h >= 40 && n.sx <= 0, JSON.stringify(n));
    if (SHOT && lang === "bn" && w === 390) await page.screenshot({ path: `${SHOT}/offline-${what.split(" ")[0]}-bn-390.png` });
    await ctx.setOffline(false);
    await page.waitForTimeout(500);
    check(`${tag} ${what}: when the line returns the notice goes away`, (await notice(page)) === null);
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== offline save, shared tools${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
