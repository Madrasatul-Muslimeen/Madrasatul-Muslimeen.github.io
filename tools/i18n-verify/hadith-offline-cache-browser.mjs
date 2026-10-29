// v12.120 (audit part 130 finding F4): the Hadith and Dua data is kept by the service worker on first use, so
// after one visit with internet, Hadith Books -> a book, Dua and the Encyclopedia -> a category open with none.
// For hadith-study.html and hadith-collections.html, en and bn, at 390 and 1440, with the REAL service worker:
//   online walk (positive controls), setOffline(true), reload, the same walk again -- now asserted, not INFO.
//   node tools/i18n-verify/hadith-offline-cache-browser.mjs            (serve.js on :8080)
//   node tools/i18n-verify/hadith-offline-cache-browser.mjs --mutate=dispatch   (the worker never routes Hadith
//     data to its cache: the offline opens must FAIL)  --mutate=cleanup  (activate deletes mm-hadith-v1: the
//     "kept across a release" check must FAIL)
// The mutation is served from a temporary copy of app/sw.js, restored on exit.
import { chromium, newContext, openPage } from "./harness.mjs";
import { readFileSync, writeFileSync } from "node:fs";

const MUT = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const SW = "app/sw.js";
const swSrc = readFileSync(SW, "utf8");
const restore = () => writeFileSync(SW, swSrc);
if (MUT) {
  let m = swSrc, n = 0;
  if (MUT === "dispatch") m = m.replace(/  if \(isHadithData\(request\)\) \{[\s\S]*?return;\n  \}\n/g, () => (n++, ""));
  else if (MUT === "cleanup") m = m.replace(/\(n\.startsWith\("mm-hadith-"\) && n !== HADITH_CACHE_NAME\)/g, () => (n++, 'n.startsWith("mm-hadith-")'));
  else throw new Error(`unknown --mutate=${MUT}`);
  console.log(`MUTATION ${MUT}: ${n} replacement(s)`);
  if (!n) throw new Error("mutation matched nothing");
  writeFileSync(SW, m);
  process.on("exit", restore);
  for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { restore(); process.exit(1); });
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const PAGES = process.env.ONE ? ["/app/hadith-study.html"] : ["/app/hadith-study.html", "/app/hadith-collections.html"];
const bodyText = (page) => page.evaluate(() => (document.querySelector(".hadith-body") || document.body).innerText.replace(/\s*\n+\s*/g, " / "));
const settle = (page) => page.waitForTimeout(1800);
const clickFirst = async (page, sel) => {
  try { await page.locator(sel).first().click({ timeout: 4000 }); return true; } catch { return false; }
};
// The book is clicked BY NAME (الموطأ, the same in both languages): the shelf's first row is "All Hadith Books",
// which opens nothing new -- audit part 130's walk clicked that one, so its "a book opens" control never opened a
// book. The Encyclopedia opens on its first category already, so a real open is three levels down: category ->
// sub-category -> its hadith list.
async function walk(page) {
  const out = {};
  await page.locator('[data-hadith-tab="books"]').click({ timeout: 6000 }).catch(() => {});
  await settle(page);
  out.bookClick = await clickFirst(page, '.hadith-row:has-text("الموطأ")');
  await settle(page);
  out.book = await bodyText(page);
  await page.locator('[data-hadith-tab="dua"]').click({ timeout: 6000 }).catch(() => {});
  await settle(page);
  out.dua = await bodyText(page);
  await page.locator('[data-hadith-tab="collections"]').click({ timeout: 6000 }).catch(() => {});
  await settle(page);
  out.encycClick = (await clickFirst(page, ".hadith-row")) && (await settle(page), await clickFirst(page, ".hadith-row"))
    && (await settle(page), await clickFirst(page, ".hadith-row"));
  await settle(page);
  out.encyc = await bodyText(page);
  return out;
}
const CHAPTERS = /وقوت الصلاة/; // al-Muwatta's first named chapter, listed only once the book is open
const RAW = /Failed to fetch|TypeError|NetworkError|undefined|\[object/i;
const SAMPLE = /Sample Collection Alpha|নমুনা সংকলন/; // only before the synthetic block
const real = (t) => t.split(/Synthetic pilot|কৃত্রিম পাইলট|Synthetic development/)[0];

const VIEWPORTS = process.env.ONE ? [[390, 844]] : [[390, 844], [1440, 900]];
for (const path of PAGES) for (const lang of ["en", "bn"]) for (const [w, h] of VIEWPORTS) {
  const tag = `[${path.replace("/app/", "")} ${lang} ${w}]`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: w, height: h }, allowServiceWorker: true });
  const { page } = await openPage(ctx, path);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true)).catch(() => false);
  // The worker must CONTROL the page from its first request: clients.claim() can take over a page whose shelf
  // file was already fetched (and remembered by the module) before the worker existed. A reader who has visited the
  // app before is in exactly this reloaded state; a brand-new device's very first page load is not kept by any
  // worker, the Qur'an data included.
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1500);
  check(`${tag} the service worker controls the page`, await page.evaluate(() => !!navigator.serviceWorker.controller));
  const on = await walk(page);
  check(`${tag} ONLINE POSITIVE CONTROL: a book opens on its chapters`, on.bookClick && CHAPTERS.test(on.book) && !/Musnad Ahmad|মুসনাদ/.test(on.book) && !RAW.test(on.book), on.book.slice(0, 120));
  check(`${tag} ONLINE POSITIVE CONTROL: Dua lists duas`, /ا/.test(on.dua) && on.dua.length > 200 && !RAW.test(on.dua), on.dua.slice(0, 120));
  check(`${tag} ONLINE POSITIVE CONTROL: the Encyclopedia opens a real category`, on.encycClick && real(on.encyc).length > 150 && !SAMPLE.test(real(on.encyc)) && !RAW.test(on.encyc), on.encyc.slice(0, 120));
  const kept = await page.evaluate(async () => (await caches.keys()).includes("mm-hadith-v1") ? (await (await caches.open("mm-hadith-v1")).keys()).length : -1);
  check(`${tag} the Hadith data cache holds the opened files`, kept > 0, `entries=${kept}`);

  const failedReqs = []; page.on("requestfailed", (r) => failedReqs.push(r.url().replace(/^https?:\/\/[^/]+/, "")));
  await ctx.setOffline(true);
  await page.reload({ waitUntil: "load" }).catch(() => {});
  await page.waitForTimeout(2500);
  const off = await walk(page);
  check(`${tag} OFFLINE: the same book opens on its chapters`, off.bookClick && CHAPTERS.test(off.book) && !RAW.test(off.book), `got ${JSON.stringify(off.book.slice(140, 420))} failed: ${failedReqs.slice(0, 4).join(" ")}`);
  check(`${tag} OFFLINE: Dua lists the same duas, no raw error`, off.dua === on.dua && !RAW.test(off.dua), JSON.stringify(off.dua.slice(-120)));
  check(`${tag} OFFLINE: the Encyclopedia opens the same real category`, off.encycClick && off.encyc === on.encyc, JSON.stringify(off.encyc.slice(0, 120)));
  await page.screenshot({ path: `/tmp/claude-0/hadith-offline-${path.replace(/\W/g, "")}-${lang}-${w}.png` }).catch(() => {});

  // A release: the worker's activate clean-up must leave the Hadith cache alone. Run the same filter it runs by
  // simulating its effect: a newer app cache name exists, the old worker's caches are judged by the new code.
  if (w === 390) {
    await ctx.setOffline(false);
    const survives = await page.evaluate(async (src) => {
      const m = /names\s*\.filter\(\(n\) =>([\s\S]*?)\)\s*\.map\(\(n\) => caches\.delete\(n\)\)/.exec(src);
      if (!m) return "no filter found";
      const consts = {};
      for (const [, k, v] of src.matchAll(/const (\w+_CACHE_NAME) = "([^"]+)";/g)) consts[k] = v;
      const f = new Function("n", "CACHE_NAME", ...Object.keys(consts), `return (${m[1].replace(/\/\/[^\n]*/g, "")});`);
      return !f("mm-hadith-v1", "mm-app-99.99", ...Object.values(consts));
    }, readFileSync(SW, "utf8"));
    check(`${tag} a release's clean-up keeps the Hadith cache`, survives === true, String(survives));
  }
  await ctx.close();
}

await browser.close();
if (MUT) restore();
console.log(`\n==== Hadith offline cache (v12.120): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
