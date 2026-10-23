// Audit part 50, part 3 (MSA Architect, 24 Oct): a surah a student reads on the FIRST visit, before QR's worker has
// taken over, is kept for offline. MMSA's sw-register.js tells the worker what the page loaded ("warm"); QR's worker
// used to skip every /surahs/ file there, so that surah was fetched again later and was missing offline.
// At 390 and 1400: the worker's script is held back until Yā-Sīn (36) is on screen in the Read view, so the page
// fetched it from the network itself; then the worker installs and is sent the warm list. Counted:
//   - the surah file is in the cache the worker reads surahs from (qr-quran-v1), and no surah is in the install list
//     (positive control: otherwise the cache would hold it whatever the warm handler did);
//   - offline (browser offline AND this suite's server stopped), a reload shows Yā-Sīn in the Read view.
//   node tools/apps/qr-verify/qr-surah-warm-browser.mjs [--width=N]      (its own server, on PORT, default 8116)
// Also: the page does not ask for /favicon.ico (quranrevival.html declares an empty icon).
//   --mutate=skip   the warm handler skips /surahs/ files again (the old code); the suite must FAIL
//   --mutate=icon   quranrevival.html declares no icon (the old code); the suite must FAIL
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
import "./_root.mjs"; // runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { routeMmsaHadith } from "./mmsa-hadith-route.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const MUTATE = arg("mutate") ?? null;
const WIDTHS = arg("width") ? [Number(arg("width"))] : [390, 1400];
const PORT = Number(process.env.PORT) || 8116;
const ROOT = process.cwd();
const SURAH = "/tools/quran-data-pull/output/surahs/surah_036.json";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
const MUTATIONS = {
  icon: ["/app/quranrevival.html", (t) => t.replace('<link rel="icon" href="data:," />', "")],
  skip: ["/app/sw.js", (t) => t.replace("if (!isCacheable(request)) return;", "if (!isCacheable(request) || new URL(u).pathname.startsWith(SURAH_PATH)) return;")],
};
const overrides = new Map();
if (MUTATE) {
  const [p, edit] = MUTATIONS[MUTATE] ?? [];
  if (!p) throw new Error(`Unknown mutation "${MUTATE}"`);
  const src = fs.readFileSync(path.join(ROOT, p), "utf8");
  if (edit(src) === src) throw new Error(`Mutation "${MUTATE}" did not apply`);
  overrides.set(p, edit);
}
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
      const body = overrides.has(p) ? overrides.get(p)(data.toString("utf8")) : data;
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
      res.end(body);
    });
  });
  server.on("connection", (s) => { sockets.add(s); s.on("close", () => sockets.delete(s)); });
  return new Promise((r) => server.listen(PORT, r));
}
function stopServer() { for (const s of sockets) s.destroy(); return new Promise((r) => server.close(() => r())); }
await startServer();
process.env.QR_BASE = `http://localhost:${PORT}`;
const base = process.env.QR_BASE;
const { chromium, newContext } = await import("../../i18n-verify/harness.mjs");

let pass = 0, fail = 0;
const check = (ok, what, detail = "") => {
  if (ok instanceof Promise) throw new Error(`check() was handed a promise: ${what}`);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${!ok && detail ? `\n       ${detail}` : ""}`);
};

const browser = await chromium.launch();
try {
  for (const width of WIDTHS) {
    try { await run(width); } catch (err) { check(false, `@${width} stopped early: ${String(err.message).split("\n")[0]}`); }
    if (!server.listening) await startServer();
  }
} finally {
  await browser.close();
  if (server.listening) await stopServer();
}
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

async function readYasin(page) {
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  await page.evaluate(() => document.getElementById("tabReadBtn").click());
  await page.waitForFunction(() => !document.getElementById("readView").hidden, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => { const el = document.getElementById("surahSelect"); if (el.value !== "36") { el.value = "36"; el.dispatchEvent(new Event("change", { bubbles: true })); } });
  return page.waitForFunction(() => !!document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:36:"]'), null, { timeout: 20000 }).then(() => true, () => false);
}

async function run(width) {
  const tag = `@${width}`;
  const ctx = await newContext(browser, { viewport: { width, height: width < 600 ? 844 : 900 }, allowServiceWorker: true });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await routeMmsaHadith(ctx);
  // Hold the worker's script back until the surah is on screen, so the page itself fetched it (not the worker).
  let release; const held = new Promise((r) => { release = r; });
  await ctx.route("**/app/sw.js*", async (r) => { await held; await r.continue(); });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const asked = [];
  // the browser's own favicon request is not a page "request" event; CDP sees it (as load-speed-browser.mjs does)
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  cdp.on("Network.requestWillBeSent", (e) => asked.push(new URL(e.request.url).pathname));
  try {
    await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    check(asked.length > 10 && !asked.includes("/favicon.ico"), `${tag} the page does not ask for /favicon.ico (a 404 on GitHub Pages; it declares its icon)`, `${asked.length} requests; favicon asked: ${asked.includes("/favicon.ico")}`);
    check(await readYasin(page), `${tag} first visit: Yā-Sīn is on screen in the Read view (positive control)`);
    check(!(await page.evaluate(() => !!navigator.serviceWorker.controller)), `${tag} first visit: no worker controlled the page while the surah was fetched`);
    release();
    await ctx.unroute("**/app/sw.js*");
    await page.evaluate(() => navigator.serviceWorker.ready);
    // the warm message is handled in the worker's own time: wait for the STATE, not a number of milliseconds
    // (polled from here: waitForFunction treats an async predicate's promise as truthy, so it could never fail)
    let kept = false;
    for (let i = 0; i < 80 && !kept; i++) {
      kept = await page.evaluate(async (u) => !!(await (await caches.open("qr-quran-v1")).match(u, { ignoreSearch: true })), SURAH);
      if (!kept) await page.waitForTimeout(250);
    }
    const precache = fs.readFileSync(path.join(ROOT, "app/sw.js"), "utf8");
    check(!/surahs\/surah_\d+\.json/.test(precache), `${tag} the worker's install list holds no surah file (positive control for the next check)`);
    check(kept, `${tag} the surah read before the worker took over is kept in qr-quran-v1`, await page.evaluate(async () => { const o = {}; for (const k of await caches.keys()) o[k] = (await (await caches.open(k)).keys()).map((r) => new URL(r.url).pathname).filter((p) => /surah_/.test(p)); return JSON.stringify(o); }));
    // offline: the browser AND the server
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => page.reload({ waitUntil: "load" }));
    await ctx.setOffline(true);
    await stopServer();
    await page.reload({ waitUntil: "load" }).catch(() => {});
    await page.waitForTimeout(1500);
    check(await readYasin(page), `${tag} offline: a reload shows Yā-Sīn in the Read view`);
  } finally {
    await ctx.setOffline(false).catch(() => {});
    await ctx.close();
  }
}
