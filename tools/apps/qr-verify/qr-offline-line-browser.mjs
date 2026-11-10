// QR Lead 46L (answering MSA Architect 97L, 10 Nov 2026): does QR's frozen worker keep MMSA's "Offline: working from
// this device" line (PCF MSA J120 O5, app/js/offline-line.js) so a QR page opened with no internet shows it?
// Two routes keep the file: it is in the worker's install list (SHELL), and MMSA's sw-register.js sends it in the first
// "warm" message (apps/qr/site/app/sw.js stores each warm url). Counted, at 390 and 1400, on a first visit:
//   - the page itself fetched the file's loader (the worker's script was held back): no worker controlled the page;
//   - online, the line's code is NOT fetched and no line exists (I9: costs nothing online);
//   - the file is in the qr-app-<version> cache;
//   - offline (browser AND this suite's server stopped), a reload shows the line, reading "Offline: working from this device".
//   node tools/apps/qr-verify/qr-offline-line-browser.mjs [--width=N]      (its own server on PORT, default 8117)
//   --mutate=noshell   the install list no longer holds the file: the suite must still PASS (the warm route keeps it)
//   --mutate=none      the install list AND the page's warm message both drop it: the suite must FAIL
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
import "./_root.mjs"; // runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { routeMmsaHadith } from "./mmsa-hadith-route.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const MUTATE = arg("mutate") ?? null;
const WIDTHS = arg("width") ? [Number(arg("width"))] : [390, 1400];
const PORT = Number(process.env.PORT) || 8117;
const ROOT = process.cwd();
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
const dropShell = ["/app/sw.js", (t) => t.replace('  "js/offline-line.js",\n', "")];
const dropWarm = ["/app/js/sw-register.js", (t) => t.replace(', new URL("./offline-line.js", import.meta.url).href]', "]")];
const MUTATIONS = { noshell: [dropShell], none: [dropShell, dropWarm] };
const overrides = new Map();
if (MUTATE) {
  const list = MUTATIONS[MUTATE];
  if (!list) throw new Error(`Unknown mutation "${MUTATE}"`);
  for (const [p, edit] of list) {
    const src = fs.readFileSync(path.join(ROOT, p), "utf8");
    if (edit(src) === src) throw new Error(`Mutation "${MUTATE}" did not apply to ${p}`);
    overrides.set(p, edit);
  }
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
const LINE_FILE = "/app/js/offline-line.js";

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

async function run(width) {
  const tag = `@${width}`;
  const ctx = await newContext(browser, { viewport: { width, height: width < 600 ? 844 : 900 }, allowServiceWorker: true });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await routeMmsaHadith(ctx);
  let release; const held = new Promise((r) => { release = r; });
  await ctx.route("**/app/sw.js*", async (r) => { await held; await r.continue(); });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const asked = [];
  page.on("request", (r) => asked.push(new URL(r.url()).pathname));
  try {
    await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    check(!(await page.evaluate(() => !!navigator.serviceWorker.controller)), `${tag} first visit: no worker controlled the page (positive control)`);
    check(asked.length > 10 && !asked.includes(LINE_FILE), `${tag} online, the line's code is not fetched (I9)`, `${asked.length} requests`);
    check(await page.evaluate(() => !document.getElementById("mmOfflineLine")), `${tag} online, no line exists`);
    release();
    await ctx.unroute("**/app/sw.js*");
    await page.evaluate(() => navigator.serviceWorker.ready);
    // wait for the STATE (polled from here: an async predicate in waitForFunction is always truthy)
    const where = () => page.evaluate(async (u) => { for (const k of await caches.keys()) if (k.startsWith("qr-app-") && await (await caches.open(k)).match(new URL(u, location.href).href)) return k; return ""; }, LINE_FILE);
    let kept = "";
    for (let i = 0; i < 80 && !kept; i++) { kept = await where(); if (!kept) await page.waitForTimeout(250); }
    check(!!kept, `${tag} the worker kept ${LINE_FILE} in its app cache`, await page.evaluate(async () => JSON.stringify(await caches.keys())));
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => page.reload({ waitUntil: "load" }));
    await ctx.setOffline(true);
    await stopServer();
    await page.reload({ waitUntil: "load" }).catch(() => {});
    await page.waitForTimeout(2500);
    const line = await page.evaluate(() => { const e = document.getElementById("mmOfflineLine"); return e ? { text: e.textContent, shown: !e.hidden && e.getBoundingClientRect().height >= 32 } : null; });
    check(!!line && line.shown && /Offline: working from this device/.test(line.text), `${tag} offline, a reloaded QR page shows the line`, JSON.stringify(line));
  } finally {
    await ctx.setOffline(false).catch(() => {});
    await ctx.close();
  }
}
