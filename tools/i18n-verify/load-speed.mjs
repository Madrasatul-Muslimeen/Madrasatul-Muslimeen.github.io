// Loading speed of MMSA's own pages (PCF MSA J29, audit part 22).
//
// A small module other suites import (measurePage, median, PAGES) plus a runnable report:
//   node tools/i18n-verify/load-speed.mjs [--write]      measure every page, print the table,
//                                                         --write saves docs/reports/2026-10-16-load-speed-baseline.json
//   node tools/i18n-verify/load-speed.mjs --pages=bookmarks,records
//
// What a measurement is (the Owner's brief): the page opens in Chromium through the harness on a slowed phone
// connection (CDP Network.emulateNetworkConditions: 1.6 Mbit/s down, 750 kbit/s up, 150 ms latency), the Firebase stub
// answers slowly too (latencyMs 150, because it answers instantly otherwise and every number would be a comforting
// lie), and a first visit (empty cache) is followed by a second visit (cache warm). Three numbers per page and width:
// first paint (first-contentful-paint), ready (the page's main content drawn: a real element per page, below) and
// bytes downloaded (with the request count).
//
// The pages are served by a tiny static server of this file's own that sends GitHub Pages' headers (ETag and
// Cache-Control: max-age=600), because serve.js sends neither and a "second visit" against it would be as cold as the
// first. Run from the repository root.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "./harness.mjs";
import { stubFor } from "./firebase-stub.mjs";

const ROOT = process.cwd();
if (!fs.existsSync(path.join(ROOT, "app", "js", "version.js"))) throw new Error("run from the repository root");

export const LATENCY_MS = 150;
export const NETWORK = { offline: false, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150 };
export const WIDTHS = [390, 1400];

// `ready` runs in the page: true once the page's main content is drawn and usable, a real element each time.
const has = (sel, minText = 1) => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.getBoundingClientRect().height > 0 && (e.innerText || "").trim().length >= ${minText}; })()`;
export const PAGES = [
  { key: "hadith-collections", path: "/app/hadith-collections.html", ready: has("#hadithRoot button, #hadithRoot a, #hadithRoot li", 3) },
  { key: "hadith-study", path: "/app/hadith-study.html", ready: has("#hadithCorpusRoot button, #hadithCorpusRoot a, #hadithCorpusRoot li", 3) },
  { key: "notes", path: "/app/notes.html", ready: has("#app", 20) }, // without a Study Unit the page draws its "No Study Unit was given" notice
  { key: "journey-map", path: "/app/journey-map.html", ready: `(() => { const e = document.querySelector("#app"); return !!e && /Folders/.test(e.innerText || "") && !/Loading…/.test(e.innerText || ""); })()` },
  { key: "import-notes", path: "/app/import-notes.html", ready: has("#app", 20) },
  { key: "bookmarks", path: "/app/bookmarks.html", ready: has("#app", 20) },
  { key: "records", path: "/app/records.html", ready: has("#app", 20) },
  { key: "index", path: "/app/index.html", ready: has("#app", 30) },
  { key: "onboarding", path: "/app/onboarding.html", ready: has("#onboardForm", 10) },
  { key: "about", path: "/app/about.html", ready: has("#featureRows", 1) },
];

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
export function startPagesServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split("?")[0]);
      const file = path.join(ROOT, urlPath);
      if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end("Not found"); }
        const etag = `"${data.length}-${fs.statSync(file).mtimeMs}"`;
        const headers = { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", ETag: etag, "Cache-Control": "max-age=600" };
        if (req.headers["if-none-match"] === etag) { res.writeHead(304, headers); return res.end(); }
        res.writeHead(200, headers); res.end(data);
      });
    });
    server.listen(0, () => resolve({ server, base: `http://localhost:${server.address().port}` }));
  });
}

export const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

// Opens one browser context with the stub and the shared routes, then loads the page twice in it (cold, then warm).
// `mutate` (optional) is a function(ctx) run before the first load, for a --mutate that restores a slow version.
export async function measurePage(browser, base, def, width, { mutate = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  // CDP Fetch interception, not ctx.route(): Playwright switches the HTTP cache OFF while any route exists, which would
  // make the "second visit" as cold as the first.
  const purify = fs.readFileSync(path.join(ROOT, "tools/i18n-verify/vendor/purify.min.js"), "utf8");
  const stub = stubFor({ banner: false, accountLang: null, latencyMs: LATENCY_MS, emptyTenant: false, seedTemplates: null, taglines: null, extraSeedJs: null });
  const initJs = `import { getAuth, initializeFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";\nexport const auth = getAuth();\nexport const db = initializeFirestore();\nexport const firebaseApp = { name: "stub" };`;
  const answer = (url) => {
    if (url.startsWith("https://www.gstatic.com/firebasejs/")) return stub;
    if (url.includes("dompurify@3/dist/purify.min.js")) return purify;
    if (url.includes("/js/firebase-init.js")) return initJs;
    return null;
  };
  await ctx.addInitScript(() => { try { localStorage.setItem("mm_splash_pref", "never"); localStorage.setItem("mm_qs_splash_pref", "never"); localStorage.setItem("mm_disable_service_worker", "1"); localStorage.setItem("mm_disable_screensaver", "1"); } catch {} });
  if (mutate) await mutate(ctx);
  const out = {};
  for (const visit of ["first", "second"]) {
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    cdp.on("Fetch.requestPaused", async (e) => {
      const body = answer(e.request.url);
      if (body === null) return cdp.send("Fetch.continueRequest", { requestId: e.requestId }).catch(() => {});
      await new Promise((r) => setTimeout(r, LATENCY_MS));
      cdp.send("Fetch.fulfillRequest", { requestId: e.requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "text/javascript; charset=utf-8" }, { name: "Access-Control-Allow-Origin", value: "*" }], body: Buffer.from(body).toString("base64") }).catch(() => {});
    });
    await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "https://www.gstatic.com/*" }, { urlPattern: "https://cdn.jsdelivr.net/npm/dompurify*" }, { urlPattern: "*/js/firebase-init.js" }] });
    await cdp.send("Network.emulateNetworkConditions", NETWORK);
    if (process.argv.includes("--debug")) { page.on("pageerror", (e) => console.log("pageerror", String(e).slice(0, 200))); page.on("requestfailed", (r) => console.log("failed", r.url(), r.failure()?.errorText)); }
    let bytes = 0, requests = 0;
    cdp.on("Network.loadingFinished", (e) => { bytes += e.encodedDataLength || 0; });
    cdp.on("Network.requestWillBeSent", () => { requests++; });
    await page.addInitScript(() => { window.__t0 = performance.now(); });
    const start = Date.now();
    await page.goto(base + def.path, { waitUntil: "commit" });
    let ready = null;
    const deadline = start + 30000;
    while (Date.now() < deadline) {
      let ok = false;
      try { ok = await page.evaluate(def.ready); } catch { /* navigating */ }
      if (ok) { ready = Date.now() - start; break; }
      await page.waitForTimeout(25);
    }
    await page.waitForTimeout(300);
    const fcp = await page.evaluate(() => performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null).catch(() => null);
    out[visit] = { firstPaintMs: fcp === null ? null : Math.round(fcp), readyMs: ready, bytes, requests };
    await page.close();
  }
  await ctx.close();
  return out;
}

// Median of `runs` measurements, field by field.
export async function measureMedian(browser, base, def, width, runs = 3, opts = {}) {
  const all = [];
  for (let i = 0; i < runs; i++) all.push(await measurePage(browser, base, def, width, opts));
  const pick = (visit, f) => { const v = all.map((r) => r[visit][f]).filter((x) => x !== null); return v.length ? median(v) : null; };
  const res = {};
  for (const visit of ["first", "second"]) res[visit] = { firstPaintMs: pick(visit, "firstPaintMs"), readyMs: pick(visit, "readyMs"), bytes: pick(visit, "bytes"), requests: pick(visit, "requests") };
  return res;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = (process.argv.find((a) => a.startsWith("--pages=")) || "").slice(8).split(",").filter(Boolean);
  const runs = Number((process.argv.find((a) => a.startsWith("--runs=")) || "--runs=3").slice(7));
  const defs = PAGES.filter((p) => !only.length || only.includes(p.key));
  const { server, base } = await startPagesServer();
  const browser = await chromium.launch();
  const rows = [];
  for (const def of defs) {
    for (const width of WIDTHS) {
      const m = await measureMedian(browser, base, def, width, runs);
      for (const visit of ["first", "second"]) {
        const row = { page: def.key, width, visit, firstPaintMs: m[visit].firstPaintMs, readyMs: m[visit].readyMs, bytes: m[visit].bytes, requests: m[visit].requests };
        rows.push(row);
        console.log(`${def.key.padEnd(20)} ${String(width).padStart(5)}px ${visit.padEnd(6)} paint ${String(row.firstPaintMs).padStart(6)} ms  ready ${String(row.readyMs).padStart(6)} ms  ${String(row.bytes).padStart(8)} B  ${String(row.requests).padStart(3)} req`);
      }
    }
  }
  await browser.close(); server.close();
  if (process.argv.includes("--write")) {
    const file = "docs/reports/2026-10-16-load-speed-baseline.json";
    fs.writeFileSync(file, JSON.stringify({ measured: "16 Oct 2026", network: NETWORK, stubLatencyMs: LATENCY_MS, runsPerCell: runs, rows }, null, 2) + "\n");
    console.log("wrote " + file);
  }
}
