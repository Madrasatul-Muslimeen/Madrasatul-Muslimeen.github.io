// QR J02 S1: ONE service worker for /app/. QR's app/sw.js (Asma's, classic, registered as ./sw.js?v=<version>) owns
// the scope. The MMSA pages copied into QR (quranrevival.html, ldog-study.html) call MMSA's sw-register.js unchanged,
// which registers "/app/sw.js" as a MODULE worker with no ?v=. Measured before the fix: that installed a second,
// "dev" copy of QR's worker (cache qr-app-dev), and the two took turns waiting, each page offering an "update" the
// other undid. app/sw.js now refuses to install when started without ?v=.
// In either order of visits: one registration, its active worker is QR's (?v=), nothing waiting, no qr-app-dev
// cache, no "Updated" notice on the MMSA pages, no "new version" note on Asma.
//
//   node tools/apps/qr-verify/one-worker-browser.mjs        (serves itself on PORT, default 8098)
//   --mutate=split   serves QR's register asking for "./sw.js?v=…" as a classic worker again (R2's way); must FAIL
//
// J02 S3: the rule is now ONE worker for all pages: QR's register and MMSA's unchanged sw-register.js both ask for
// "/app/sw.js" as a module, so whichever page comes first installs it and every page shares it.
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { routeMmsaHadith } from "./mmsa-hadith-route.mjs";

const MUTATE = process.argv.find((a) => a.startsWith("--mutate="))?.split("=")[1] ?? null;
const PORT = Number(process.env.PORT) || 8098;
const ROOT = process.cwd();
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    let body = data;
    if (MUTATE === "split" && p === "/app/js/qr-sw-register.js") body = data.toString("utf8").replace('register("/app/sw.js", { type: "module" })', 'register("./sw.js?v=split", { scope: "./" })');
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(body);
  });
});
await new Promise((r) => server.listen(PORT, r));
process.env.QR_BASE = `http://localhost:${PORT}`;
const { chromium, newContext } = await import("../../i18n-verify/harness.mjs");
const base = process.env.QR_BASE;

let pass = 0, fail = 0;
const check = (ok, what) => {
  if (ok instanceof Promise) throw new Error(`check() was handed a promise: ${what}`);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
};
const browser = await chromium.launch();
try {
  // S1b: the pages Quran Study opens (notes, bookmarks, journey map, records, monitor, about, onboarding,
  // import notes, accept invite) also call MMSA's sw-register.js; each order visits all of them.
  const S1B = ["journey-map.html"]; // J02 S1e: the other S1b pages live in MMSA now (PCA J71)
  for (const order of [["asma.html", "quranrevival.html", "ldog-study.html", ...S1B, "asma.html"], ["quranrevival.html", ...S1B, "asma.html", "ldog-study.html", "notes.html"]]) {
    try { await visit(order); } catch (err) { check(false, `${order.join(" → ")} stopped early: ${String(err.message).split("\n")[0]}`); }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

async function visit(order) {
  // MMSA's harness, but with the worker allowed (its default turns workers off for every MMSA suite).
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 }, allowServiceWorker: true });
  await routeMmsaHadith(ctx);
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const p of order) {
    await page.goto(`${base}/app/${p}`, { waitUntil: "load" });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2500); // MMSA's sw-register registers after "load", then the worker installs (or refuses)
    const s = await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      return {
        regs: regs.map((r) => ({ active: r.active?.scriptURL ?? null, waiting: r.waiting?.scriptURL ?? null, installing: r.installing?.scriptURL ?? null })),
        caches: await caches.keys(),
        mmsaNotice: !!document.getElementById("swUpdateNotice"),
        qrNote: !!document.querySelector("[data-qa-update]:not([hidden])"),
      };
    });
    const tag = `${order.join(" → ")}: after ${p}`;
    check(s.regs.length === 1, `${tag}, exactly one registration (${s.regs.length})`);
    check(s.regs[0]?.active === `${base}/app/sw.js` && !s.regs[0]?.waiting && !s.regs[0]?.installing, `${tag}, the one worker /app/sw.js is active and nothing waits (${JSON.stringify(s.regs[0]).replaceAll(base, "")})`);
    check(!s.caches.includes("qr-app-dev"), `${tag}, no "dev" copy of QR's cache (${s.caches.join(", ") || "none"})`);
    check(!s.mmsaNotice && !s.qrNote, `${tag}, no "Updated" or "new version" notice`);
  }
  check(errors.length === 0, `${order.join(" → ")}: no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}
