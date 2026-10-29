// Audit part 130 (issue #1313, REPORT ONLY): Hadith Study and Hadith collections with no internet after one visit.
// For each page (hadith-study.html, hadith-collections.html) at 390, en and bn, with the REAL service worker on:
//   online: Hadith Books -> one book -> its chapters; Dua; Encyclopedia -> one category; then setOffline(true), reload,
//   and the same opens again. The CHECKS guard what already works (the online opens are the positive controls, and
//   offline the page shell, the menu bar and the absence of an uncaught page error). What a student should see and
//   does not is printed as INFO lines (the findings in docs/reports/2026-10-30-audit-part130-hadith-offline.md).
//   node tools/i18n-verify/hadith-offline-audit-browser.mjs      (serve.js on :8080, or QR_BASE)
// Nothing here changes app/. INFO lines never fail the run.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0, info = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const INFO = (msg) => { info++; console.log(`  INFO  ${msg}`); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const PAGES = ["/app/hadith-study.html", "/app/hadith-collections.html"];
const bodyText = (page) => page.evaluate(() => (document.querySelector(".hadith-body") || document.body).innerText.replace(/\s*\n+\s*/g, " / "));
const settle = (page) => page.waitForTimeout(1800);
const clickFirst = async (page, sel) => {
  try { await page.locator(sel).first().click({ timeout: 4000 }); return true; } catch { return false; }
};

// One walk: returns what each step showed.
async function walk(page) {
  const out = {};
  await page.locator('[data-hadith-tab="books"]').click({ timeout: 6000 }).catch(() => {});
  await settle(page);
  out.shelf = { text: await bodyText(page), rows: await page.locator(".hadith-row").count() };
  out.bookClick = await clickFirst(page, ".hadith-row");
  await settle(page);
  out.book = { text: await bodyText(page), rows: await page.locator(".hadith-row").count() };
  await page.locator('[data-hadith-tab="dua"]').click({ timeout: 6000 }).catch(() => {});
  await settle(page);
  out.dua = { text: await bodyText(page), cards: await page.locator("#hadithBody [class*='dua'], .hadith-body [class*='dua']").count() };
  await page.locator('[data-hadith-tab="collections"]').click({ timeout: 6000 }).catch(() => {});
  await settle(page);
  out.encyc = { text: await bodyText(page), rows: await page.locator(".hadith-row").count() };
  out.encycClick = await clickFirst(page, ".hadith-row");
  await settle(page);
  out.encycOpen = { text: await bodyText(page) };
  return out;
}

const RAW = /Failed to fetch|TypeError|NetworkError|undefined|\[object/i;
const fetched = new Set();
for (const path of PAGES) for (const lang of ["en", "bn"]) {
  const tag = `[${path.replace("/app/", "")} ${lang} 390]`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 }, allowServiceWorker: true });
  ctx.on("request", (r) => { if (/hadith-data-pull/.test(r.url())) fetched.add(r.url().replace(/.*output\//, "")); });
  const { page, errors } = await openPage(ctx, path);
  await page.waitForTimeout(2000);
  const swOn = await page.evaluate(() => navigator.serviceWorker ? navigator.serviceWorker.ready.then(() => true) : false).catch(() => false);
  const on = await walk(page);
  // positive controls: the online opens work
  check(`${tag} ONLINE POSITIVE CONTROL: the shelf lists books`, on.shelf.rows >= 10, `rows=${on.shelf.rows}`);
  check(`${tag} ONLINE POSITIVE CONTROL: a book opens on its chapters`, on.bookClick && /Muwatta/.test(on.book.text) && !RAW.test(on.book.text), on.book.text.slice(0, 120));
  check(`${tag} ONLINE POSITIVE CONTROL: Dua lists duas with no error`, /ا/.test(on.dua.text) && on.dua.text.length > 200 && !RAW.test(on.dua.text), on.dua.text.slice(0, 120));
  check(`${tag} ONLINE POSITIVE CONTROL: the Encyclopedia opens a real category`, on.encycClick && on.encycOpen.text.length > 150 && !/Sample Collection Alpha/.test(on.encycOpen.text.split("Synthetic")[0] || ""), on.encycOpen.text.slice(0, 120));

  // Offline: the SW has had its one visit.
  await ctx.setOffline(true);
  const errsBefore = errors.length;
  let reloaded = true;
  await page.reload({ waitUntil: "load" }).catch(() => { reloaded = false; });
  await page.waitForTimeout(2500);
  check(`${tag} OFFLINE: the page reloads (service worker serves the shell: ${swOn ? "SW ready" : "no SW"})`, reloaded);
  const bar = await page.locator(".hadith-menubar").count();
  check(`${tag} OFFLINE: the menu bar is there`, bar === 1, `bars=${bar}`);
  const off = await walk(page);
  const pageErrors = errors.slice(errsBefore).filter((e) => !/^console:/.test(e));
  check(`${tag} OFFLINE: no uncaught page error`, pageErrors.length === 0, pageErrors.slice(0, 2).join(" | "));

  const slice = (s) => JSON.stringify(s.slice(0, 160));
  INFO(`${tag} OFFLINE shelf: rows=${off.shelf.rows} ${RAW.test(off.shelf.text) ? "RAW ERROR" : "no raw error"}; tail ${slice(off.shelf.text.slice(-70))}`);
  INFO(`${tag} OFFLINE book open: clicked=${off.bookClick} rows=${off.book.rows} ${RAW.test(off.book.text) ? "RAW ERROR" : "ok"}`);
  INFO(`${tag} OFFLINE dua: ${RAW.test(off.dua.text) ? "RAW ERROR" : "ok"}; tail ${slice(off.dua.text.slice(-60))}`);
  INFO(`${tag} OFFLINE encyclopedia: ${slice(off.encyc.text.slice(0, 140))}`);
  INFO(`${tag} OFFLINE encyclopedia opened: ${/Sample Collection|নমুনা সংকলন/.test(off.encycOpen.text) ? "lands on SYNTHETIC sample collection" : "real"}`);
  const loading = /Loading|লোড হচ্ছে/.test(off.shelf.text + off.book.text + off.dua.text);
  INFO(`${tag} OFFLINE stuck on Loading…: ${loading}`);
  await ctx.close();
}

console.log("\nINFO data files fetched under /tools/hadith-data-pull/output/ (online walks):");
for (const f of [...fetched].sort()) console.log(`  INFO  ${f}`);

// Is that tree even cacheable by the worker? Read the source of truth.
import { readFileSync } from "node:fs";
const sw = readFileSync("app/sw.js", "utf8");
INFO(`app/sw.js CACHEABLE_PATH_PREFIXES names /tools/hadith-data-pull/: ${/CACHEABLE_PATH_PREFIXES[\s\S]*?\];/.exec(sw)[0].includes("hadith-data-pull")}`);
INFO(`app/ has a Seerah page: ${(await import("node:fs")).readdirSync("app").some((f) => /seerah/i.test(f))}`);

await browser.close();
console.log(`\n==== Hadith offline audit (part 130): ${pass} passed, ${fail} failed, ${info} INFO ====`);
process.exit(fail ? 1 : 0);
