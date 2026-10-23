// QR's own ADDRESS opens offline (https://quranrevival.github.io/ and /index.html). QR's worker is /app/sw.js (scope /app/),
// so the address had none, and offline a student got the browser's own "no internet" page. The front page now also registers
// the tiny /root-sw.js (scope /), which answers the address from the caches /app/sw.js keeps when the network fails.
// At 390 and 1400, signed out, counted:
//   - visiting the address registers both workers, each active (/app/ and /);
//   - an /app/ page is still controlled by /app/sw.js (the browser picks the longest scope), so QR's worker is unchanged;
//   - offline (browser offline AND this suite's server stopped): the address and /index.html show the real front page
//     (its title, its three cards, its styles applied, controlled by /root-sw.js), and tapping Quran Study opens it offline;
//   - ?nosw on the address (QR's kill switch) unregisters both workers.
//   node tools/apps/qr-verify/qr-root-offline-browser.mjs [--width=N]      (its own server, on PORT, default 8117)
//   --mutate=noreg       the front page does not register /root-sw.js (the old code); the suite must FAIL
//   --mutate=nofallback  /root-sw.js has no offline answer (network only); the suite must FAIL
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
const MUTATIONS = {
  noreg: ["/app/js/qr-front.js", (t) => t.replace('navigator.serviceWorker.register("/root-sw.js", { scope: "/" })', "Promise.resolve()")],
  nofallback: ["/root-sw.js", (t) => t.replace("event.respondWith(fetch(request).catch(", "event.respondWith(fetch(request).catch(() => Response.error()) || (")],
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
// Polled from Node (an async predicate in waitForFunction resolves at once: a promise is truthy).
async function until(page, fn, ms = 30000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await page.evaluate(fn).catch(() => null);
    if (v) return v;
    if (Date.now() > end) return null;
    await new Promise((r) => setTimeout(r, 250));
  }
}
const regs = () => navigator.serviceWorker.getRegistrations().then((rs) => rs.map((r) => ({ scope: r.scope, active: r.active?.scriptURL ?? null, state: r.active?.state ?? null })));
const front = () => {
  const cards = [...document.querySelectorAll(".qf-card")].map((a) => a.getAttribute("href"));
  const card = document.querySelector(".qf-card");
  return { title: document.title, cards, styled: card ? getComputedStyle(card).display !== "inline" : false, text: document.body.innerText.length,
    controller: navigator.serviceWorker.controller?.scriptURL ?? null };
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

async function run(width) {
  const tag = `@${width}`;
  const ctx = await newContext(browser, { viewport: { width, height: 800 }, allowServiceWorker: true });
  await routeMmsaHadith(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(`${base}/`, { waitUntil: "load" });
    const both = await until(page, () => navigator.serviceWorker.getRegistrations().then((rs) => {
      const a = rs.find((r) => r.scope.endsWith("/app/")), b = rs.find((r) => new URL(r.scope).pathname === "/");
      return a?.active?.state === "activated" && b?.active?.state === "activated";
    }), 60000);
    const r = await page.evaluate(regs);
    check(!!both, `${tag} the address registers both workers, each active (${r.map((x) => new URL(x.scope).pathname + " " + (x.active || "").replace(base, "")).join(", ")})`);
    // /app/sw.js has saved its shell (the front page among it) before the network goes away
    const saved = await until(page, () => caches.keys().then(async (ks) => { for (const k of ks) if (await (await caches.open(k)).match("/app/index.html")) return true; return false; }), 60000);
    check(!!saved, `${tag} /app/sw.js has saved the front page (/app/index.html)`);

    await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" });
    const ctl = await until(page, () => navigator.serviceWorker.controller?.scriptURL ?? null, 15000);
    check(ctl === `${base}/app/sw.js`, `${tag} an /app/ page is still controlled by /app/sw.js (${(ctl || "none").replace(base, "")})`);

    await ctx.setOffline(true);
    await stopServer();
    for (const at of ["/", "/index.html"]) {
      let f = null, why = "";
      try { await page.goto(`${base}${at}`, { waitUntil: "load", timeout: 15000 }); f = await page.evaluate(front); } catch (e) { why = String(e.message).split("\n")[0]; }
      check(!!f && f.title === "QuranRevival" && f.cards.length === 3 && f.styled && f.text > 200,
        `${tag} offline, ${at} shows the front page: title, 3 cards, styles applied`, why || JSON.stringify(f));
      check(f?.controller === `${base}/root-sw.js`, `${tag} offline, ${at} is answered by /root-sw.js (${(f?.controller || "none").replace(base, "")})`);
    }
    let opened = false, why = "";
    try {
      await page.goto(`${base}/`, { waitUntil: "load", timeout: 15000 });
      await Promise.all([page.waitForURL(/\/app\/quranrevival\.html/, { timeout: 15000 }), page.click("#qfQuran")]);
      opened = !!(await until(page, () => document.title.includes("QuranRevival") && !!document.querySelector("#surahSelect option"), 20000));
    } catch (e) { why = String(e.message).split("\n")[0]; }
    check(opened, `${tag} offline, tapping Quran Study on the front page opens it (surah list filled)`, why);
    await ctx.setOffline(false);
    await startServer();

    await page.goto(`${base}/?nosw`, { waitUntil: "load" });
    const gone = await until(page, () => navigator.serviceWorker.getRegistrations().then((rs) => rs.length === 0), 15000);
    check(!!gone, `${tag} ?nosw on the address unregisters both workers`);
    check(errors.length === 0, `${tag} no page errors${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""}`);
  } finally { await ctx.close(); }
}
