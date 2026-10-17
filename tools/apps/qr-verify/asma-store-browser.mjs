// QR J01 R4: is the Asma app ready for a store? (No store, no account, no money: only what Chromium and the files say.)
//   1. The manifest: every field a store or an install needs; its icons and screenshots are the sizes it says.
//   2. The maskable icon keeps the star inside the safe zone (the middle circle, 80% across) on its real pixels.
//   3. Chromium itself (DevTools protocol: Page.getAppManifest, Page.getInstallabilityErrors) finds NO error.
//   4. The "About and privacy" page at 390 and 1400, English and Bangla: what the app is, that it collects nothing,
//      how to clear what it keeps, the credits, the contact; the way back to the app; and offline.
//
//   node tools/apps/qr-verify/asma-store-browser.mjs        (its own server, on PORT, default 8096)
//   --mutate=<name>   serves one file broken (files on disk untouched); the suite must FAIL
//       maskable      a maskable icon drawn with the star at 95% (past the safe zone) is served instead
//       noicon        the manifest served with no icons
//       browser       the manifest served with display "browser" (Chromium: not installable as an app)
//       aboutoffline  the about page left out of the worker's saved list
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import os from "node:os";
import { chromium } from "playwright";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const MUTATE = arg("mutate") ?? null;
const PORT = Number(process.env.PORT) || 8096;
const ROOT = process.cwd();
const SHOTS = process.env.QR_SHOTS || null;
const FORBIDDEN = /(^|\.)(gstatic\.com|googleapis\.com|firebaseapp\.com|firebaseio\.com|firebase\.google\.com)$/i;

let pass = 0, fail = 0;
const check = (ok, what) => {
  if (ok instanceof Promise) throw new Error(`check() was handed a promise: ${what}`);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
};

// ---- the server: can stop (offline) and can serve a file changed in memory ----
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
const overrides = new Map();
const MUTATIONS = {
  maskable: ["/app/img/asma-icon-maskable-512.png", () => bigStar],
  noicon: ["/app/asma.webmanifest", (b) => { const m = JSON.parse(b.toString("utf8")); delete m.icons; return JSON.stringify(m); }],
  browser: ["/app/asma.webmanifest", (b) => JSON.stringify({ ...JSON.parse(b.toString("utf8")), display: "browser" })],
  aboutoffline: ["/app/sw.js", (b) => b.toString("utf8").replace('  "asma-about.html",\n', "")],
};
let bigStar = null;
if (MUTATE === "maskable") {
  const { svg } = await import("../../qr-icons/make-asma-icons.mjs") /* PORT: tools/qr-icons is not in MSA (later); only --mutate=maskable needs it */;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  await p.setContent(`<html><body style="margin:0">${svg(512, 0.95)}</body></html>`);
  bigStar = await p.locator("svg").screenshot();
  await b.close();
}
if (MUTATE) { if (!MUTATIONS[MUTATE]) throw new Error(`Unknown mutation "${MUTATE}"`); overrides.set(...MUTATIONS[MUTATE]); }
let server;
const sockets = new Set();
function startServer() {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end("Not found"); return; }
      const body = overrides.has(p) ? overrides.get(p)(data) : data;
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
      res.end(body);
    });
  });
  server.on("connection", (s) => { sockets.add(s); s.on("close", () => sockets.delete(s)); });
  return new Promise((r) => server.listen(PORT, r));
}
function stopServer() { for (const s of sockets) s.destroy(); return new Promise((r) => server.close(() => r())); }
const base = `http://localhost:${PORT}`;

// ---- 1. the manifest, as served ----
function pngSize(buf) { return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`; }
const servedManifest = JSON.parse((overrides.get("/app/asma.webmanifest") ?? ((b) => b))(fs.readFileSync("app/asma.webmanifest")).toString());
{
  const m = servedManifest;
  for (const k of ["id", "name", "short_name", "description", "lang", "dir", "start_url", "scope", "display", "orientation", "theme_color", "background_color", "categories", "icons", "screenshots"]) {
    check(m[k] != null && m[k] !== "", `manifest has "${k}"`);
  }
  check(m.name === "Asma ul Husna" && m.short_name === "Asma" && m.display === "standalone" && m.orientation === "any", "manifest: name, short_name, display standalone, orientation any");
  check(JSON.stringify(m.categories) === '["education","books"]', `manifest: categories education and books (${JSON.stringify(m.categories)})`);
  check((m.description ?? "").length >= 40 && (m.description ?? "").length <= 300, `manifest: a description (${(m.description ?? "").length} characters)`);
  const icons = m.icons ?? [];
  check(icons.some((i) => i.purpose === "any" && i.sizes === "512x512") && icons.some((i) => i.purpose === "maskable"), "manifest: an icon for any use and a maskable one");
  for (const i of icons) {
    const f = path.join("app", i.src);
    check(fs.existsSync(f) && pngSize(fs.readFileSync(f)) === i.sizes, `icon ${i.src} is really ${i.sizes}`);
  }
  const shots = m.screenshots ?? [];
  check(shots.filter((s) => s.form_factor === "narrow").length === 2 && shots.filter((s) => s.form_factor === "wide").length === 2, "manifest: 2 narrow and 2 wide screenshots");
  for (const s of shots) {
    const f = path.join("app", s.src);
    check(fs.existsSync(f) && pngSize(fs.readFileSync(f)) === s.sizes && !!s.label, `screenshot ${s.src} is really ${s.sizes}, with a label`);
  }
  check((m.shortcuts ?? []).every((s) => s.url.startsWith("./asma.html")), "manifest: shortcuts stay inside the app");
}

await startServer();
const browser = await chromium.launch();
try {
  for (const step of [maskableSafeZone, installability, ...[[390, "en"], [390, "bn"], [1400, "en"], [1400, "bn"]].map(([w, l]) => () => aboutPage(w, l)), aboutOffline]) {
    try { await step(); } catch (err) { check(false, `${step.name || "about"} stopped early: ${String(err.message).split("\n")[0]}`); if (!server.listening) await startServer(); }
  }
} finally {
  await browser.close();
  if (server.listening) await stopServer();
}
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

// ---- 2. the maskable icon's safe zone, on its real pixels ----
async function maskableSafeZone() {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${base}/app/asma-about.html?nosw`);
  const icon = servedManifest.icons?.find((i) => i.purpose === "maskable")?.src ?? "img/asma-icon-maskable-512.png";
  const r = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
    let far = 0, gold = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const k = (y * width + x) * 4;
      if (data[k] > 150 && data[k + 1] > 120 && data[k + 2] < 140) { // the star's gold
        gold++;
        far = Math.max(far, Math.hypot(x + 0.5 - width / 2, y + 0.5 - height / 2) / width);
      }
    }
    const k0 = 0; // a corner: the teal background must reach the edges (no transparency for the mask to show)
    return { gold, far, corner: [data[k0], data[k0 + 1], data[k0 + 2], data[k0 + 3]], width };
  }, `${base}/app/${icon}`);
  check(r.gold > 1000, `maskable icon: the gold star is there (${r.gold} gold pixels)`);
  check(r.far <= 0.4, `maskable icon: the star stays inside the safe zone (furthest gold at ${(r.far * 100).toFixed(1)}% of the width from the centre; the limit is 40%)`);
  check(r.corner[3] === 255 && r.corner[2] > r.corner[0], `maskable icon: full-bleed teal to the corners (${r.corner.join(",")})`);
  await ctx.close();
}

// ---- 3. Chromium's own installability verdict ----
// The headless shell Playwright uses by default answers "no errors" for ANY page (even one with no manifest), and a
// normal browser context is incognito ("in-incognito"). So this step runs the full Chromium (channel "chromium",
// new headless) with a real, throw-away profile. A page with no manifest must be refused, proving the check is live.
async function installability() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qr-install-"));
  const ctx = await chromium.launchPersistentContext(dir, { channel: "chromium", viewport: { width: 390, height: 844 } });
  try {
    const page = ctx.pages()[0] ?? await ctx.newPage();
    page.setDefaultTimeout(30000);
    const cdp = await ctx.newCDPSession(page);
    await page.goto(`${base}/`, { waitUntil: "load" });
    const control = (await cdp.send("Page.getInstallabilityErrors")).installabilityErrors ?? [];
    check(control.some((e) => e.errorId === "no-manifest"), `Chromium's check is live: the front page (no manifest) is refused (${control.map((e) => e.errorId).join(", ")})`);
    await page.goto(`${base}/app/asma.html`, { waitUntil: "load" });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const man = await cdp.send("Page.getAppManifest");
    check(man.url.endsWith("/app/asma.webmanifest") && (man.errors ?? []).length === 0, `Chromium reads the manifest with no errors${(man.errors ?? []).length ? ": " + man.errors.map((e) => e.message).join("; ") : ""}`);
    const errs = (await cdp.send("Page.getInstallabilityErrors")).installabilityErrors ?? [];
    check(errs.length === 0, `Chromium reports NO installability errors for the Asma app${errs.length ? ": " + errs.map((e) => e.errorId).join(", ") : ""}`);
  } finally {
    await ctx.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---- 4. the About and privacy page ----
async function aboutPage(width, lang) {
  const tag = `about @${width} ${lang}`;
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 } });
  await ctx.addInitScript((l) => {
    if (sessionStorage.getItem("qr-seeded")) return;
    localStorage.clear();
    localStorage.setItem("mm_app_lang", l);
    localStorage.setItem("mm_disable_service_worker", "1");
    localStorage.setItem("mm_disable_screensaver", "1");
    sessionStorage.setItem("qr-seeded", "1");
  }, lang);
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const errors = [], requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => requests.push(r.url()));

  // From the app's footer, on a scrolled Name page; and back to exactly there.
  await page.goto(`${base}/app/asma.html#v=name&n=7`, { waitUntil: "load" });
  await page.waitForSelector('[data-qa-detail="7"]');
  await page.evaluate(() => { localStorage.setItem("qr_asma_studied_v1", "[1,7]"); localStorage.setItem("mm_screensaver", '{"eachSec":5}'); });
  const link = page.locator('a[href="./asma-about.html"]');
  check(await link.isVisible() && /About|পরিচিতি/.test(await link.innerText()), `${tag} the app's footer links "About and privacy"`);
  await link.scrollIntoViewIfNeeded(); // the reader scrolls down to the footer to tap it
  const y0 = await page.evaluate(() => Math.round(scrollY));
  await link.click();
  await page.waitForSelector("main.ab");
  const shown = page.locator(`[data-ab-lang="${lang}"]:not([hidden])`).first();
  const text = await page.locator(`main [data-ab-lang="${lang}"]`).innerText();
  check(await shown.isVisible() && await page.locator(`main [data-ab-lang="${lang === "en" ? "bn" : "en"}"]`).isHidden(), `${tag} shows the reader's language only`);
  const must = lang === "en"
    ? ["What this app is", "collects nothing", "no sign-in", "no ads", "no tracking", "this device only", "To clear what is kept"]
    : ["এই অ্যাপটি কী", "কিছুই সংগ্রহ করে না", "সাইন-ইন নেই", "বিজ্ঞাপন নেই", "ট্র্যাকিং নেই", "শুধু এই ডিভাইসে", "মুছতে"];
  const missing = must.filter((s) => !text.includes(s));
  check(missing.length === 0, `${tag} says what it is, that it collects nothing, and how to clear${missing.length ? "; missing: " + missing.join(", ") : ""}`);
  const credits = ["Learn Deen On-the-Go", "Madrasatul Muslimeen", "Quran Revival", "OpenITI", "CC BY-NC-SA 4.0", "alquran.cloud", "en.sahih", "bn.bengali", "api.quran.com v4", "Quranic Arabic Corpus", "hadith-api (fawazahmed0)", "Amiri", "Noto Naskh Arabic", "Noto Sans Bengali", "Tinos", "SIL Open Font Licence 1.1", "Apache Licence 2.0", "https://quranrevival.github.io"];
  const noCredit = credits.filter((s) => !text.includes(s));
  check(noCredit.length === 0, `${tag} the credits and the contact${noCredit.length ? "; missing: " + noCredit.join(", ") : ""}`);
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check(sw <= cw, `${tag} no sideways scroll (${sw} <= ${cw})`);
  const small = await page.evaluate(() => [...document.querySelectorAll("button, .ab p > a, header a")]
    .filter((el) => el.getClientRects().length && !el.closest("[hidden]"))
    .map((el) => ({ h: el.getBoundingClientRect().height, t: el.textContent.trim().slice(0, 24) })).filter((x) => x.h < 39.5));
  check(small.length === 0, `${tag} every control is at least 40px tall${small.length ? ": " + small.map((x) => `${x.t} ${Math.round(x.h)}px`).join(", ") : ""}`);
  if (SHOTS && !MUTATE && ((width === 390 && lang === "en") || (width === 1400 && lang === "bn"))) {
    await page.screenshot({ path: path.join(SHOTS, `about-${width}-${lang}.png`), fullPage: width === 390 });
  }

  // Clearing asks twice, then removes the ticks and the screensaver settings only.
  const box = page.locator(`[data-ab-lang="${lang}"] [data-ab-privacy]`);
  await box.locator("[data-ab-clear]").click();
  check(await page.evaluate(() => localStorage.getItem("qr_asma_studied_v1")) === "[1,7]", `${tag} the first tap on Clear only asks`);
  await box.locator("[data-ab-clear-yes]").click();
  const left = await page.evaluate(() => ({ s: localStorage.getItem("qr_asma_studied_v1"), ss: localStorage.getItem("mm_screensaver"), lang: localStorage.getItem("mm_app_lang") }));
  check(left.s === null && left.ss === null && left.lang === lang, `${tag} "Yes" clears the ticks and screensaver settings, and keeps the language`);

  // The other language, then back.
  const other = lang === "en" ? "bn" : "en";
  await page.click(`[data-ab-set="${other}"]`);
  check(await page.locator(`main [data-ab-lang="${other}"]`).isVisible() && await page.evaluate(() => document.documentElement.lang) === other, `${tag} the language switch works`);
  await page.click(`[data-ab-set="${lang}"]`);

  await page.click("[data-ab-back]");
  await page.waitForSelector('[data-qa-detail="7"]');
  const y1 = await page.evaluate(() => Math.round(scrollY));
  check(/v=name&n=7/.test(page.url()) && Math.abs(y1 - y0) <= 2, `${tag} ← Back returns to the same Name at the same place (y ${y0} -> ${y1})`);

  check(errors.length === 0, `${tag} no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
  const bad = requests.filter((u) => { try { return FORBIDDEN.test(new URL(u).hostname); } catch { return false; } });
  check(bad.length === 0, `${tag} no request to Firebase or Google hosts`);
  await ctx.close();
}

// ---- 4b. the About page offline ----
async function aboutOffline() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/app/asma.html`, { waitUntil: "load" });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await ctx.setOffline(true);
  await stopServer();
  const res = await page.goto(`${base}/app/asma-about.html`, { waitUntil: "load" }).catch(() => null);
  const ok = !!res && res.ok() && await page.locator("main.ab [data-ab-credits]").first().isVisible().catch(() => false);
  check(ok, "about offline: the page opens from the saved copy, with its credits");
  check(errors.length === 0, `about offline: no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.setOffline(false);
  await startServer();
  await ctx.close();
}
