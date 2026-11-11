// Printed Mushaf view, 98L MUST-DO 1: the 604 printed-page pictures (.../output/mushaf-printed/...) are NEVER kept by
// either service worker's run-time caches. They are ~100 MB; only the reader's own "keep in the app" choice (its own
// cache, mm-printed-pages-v1) may hold them.
//
// Run from the repository root:   node tools/i18n-verify/mushaf-printed-worker-exclusion-browser.mjs
//   (builds nothing; for the QR half run  node tools/apps/build-app.mjs qr  first -- it is skipped by name if build/qr is missing)
//   MUT=msa  ...  mutation: MSA's app/sw.js loses its exclusion AND someone lists the printed folder as cacheable -> the MSA checks FAIL
//   MUT=qr   ...  mutation: QR's worker loses its exclusion                                                          -> the QR checks FAIL
// What it proves, in a real browser with the real worker installed and controlling the page: the page fetches a printed
// page picture (200, a PNG) and a CONTROL file the worker does keep; afterwards no cache holds the printed picture, and
// the control IS in a cache (positive control: the worker was really running and really caching).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
let pass = 0, fail = 0;
const check = (ok, what) => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${what}" was handed a promise`);
  ok ? pass++ : fail++; console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
};
const MUT = process.env.MUT || "";
const restores = [];
function mutate(rel, re, to) {
  const f = path.join(ROOT, rel), keep = fs.readFileSync(f, "utf8");
  let n = 0; const next = keep.replace(re, (...a) => (n++, typeof to === "function" ? to(...a) : to));
  console.log(`MUTATION ${MUT}: ${n} replacement(s) in ${rel}`);
  if (!n) throw new Error("mutation matched nothing");
  fs.writeFileSync(f, next); restores.push(() => fs.writeFileSync(f, keep));
}
const restoreAll = () => { while (restores.length) restores.pop()(); };
process.on("exit", restoreAll);
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { restoreAll(); process.exit(1); });

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const PRINTED = "/tools/quran-data-pull/output/mushaf-printed/ksu-madani/001.png";
const CONTROL = "/tools/quran-data-pull/output/surahs/001.json";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
function serve(root, port) {
  const s = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
    if (p === PRINTED) { res.writeHead(200, { "Content-Type": "image/png" }); res.end(PNG); return; } // present in BOTH builds, so the test never depends on the copy rules
    if (p === CONTROL && !fs.existsSync(path.join(root, p))) { res.writeHead(200, { "Content-Type": "application/json" }); res.end('{"control":true}'); return; }
    const f = path.join(root, p);
    if (!f.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (e, d) => e ? (res.writeHead(404), res.end()) : (res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" }), res.end(d)));
  });
  return new Promise((r) => s.listen(port, () => r(s)));
}

if (MUT === "msa") {
  mutate("app/sw.js", /\n  if \(url\.pathname\.includes\("\/mushaf-printed\/"\)\) return false; \/\/ PRINTED-EXCLUDED[^\n]*/, "");
  mutate("app/sw.js", /const CACHEABLE_PATH_PREFIXES = \[\n  "\/app\/",/, 'const CACHEABLE_PATH_PREFIXES = [\n  "/app/",\n  "/tools/quran-data-pull/output/mushaf-printed/",');
}
if (MUT === "qr") mutate("apps/qr/site/app/sw.js", /\n  if \(url\.pathname\.includes\("\/mushaf-printed\/"\)\) return false; \/\/ PRINTED-EXCLUDED[^\n]*/, "");

async function run(label, root, port, pagePath) {
  const srv = await serve(root, port);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  try {
    const ctx = await browser.newContext({ serviceWorkers: "allow" });
    const page = await ctx.newPage();
    const base = `http://localhost:${port}`;
    console.log(`step  ${label}: opening`); await page.goto(base + pagePath, { waitUntil: "load" }); console.log(`step  ${label}: loaded`);
    const ready = await page.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise((r) => setTimeout(() => r(false), 20000))]));
    check(ready, `${label}: the worker becomes ready (a hang here is a broken worker, not a pass)`);
    await page.reload({ waitUntil: "load", timeout: 30000 });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {});
    check(!!(await page.evaluate(() => navigator.serviceWorker.controller)), `${label}: the worker is installed and controls the page`);
    const got = await page.evaluate(async ({ a, b }) => {
      const r1 = await fetch(a), r2 = await fetch(b);
      return { printed: r1.status, type: r1.headers.get("content-type"), control: r2.status };
    }, { a: PRINTED, b: CONTROL });
    check(got.printed === 200 && /png/.test(got.type), `${label}: the printed page picture is fetched through the worker (200, a PNG)`);
    await page.waitForTimeout(1500); // the worker writes to its cache after answering
    const kept = await page.evaluate(async () => {
      const out = [];
      for (const n of await caches.keys()) for (const r of await (await caches.open(n)).keys()) out.push(n + " " + new URL(r.url).pathname);
      return out;
    });
    check(!kept.some((k) => k.includes("/mushaf-printed/")), `${label}: NO cache holds the printed page picture${kept.some((k) => k.includes("/mushaf-printed/")) ? " -> " + kept.filter((k) => k.includes("/mushaf-printed/")).join(", ") : ""}`);
    check(kept.length > 5, `${label}: control, the worker did keep other files (${kept.length} entries), so "nothing kept" is not just a dead worker`);
  } finally { await browser.close(); srv.close(); }
}

await run("MSA worker", ROOT, 8191, "/app/quranrevival.html");
if (MUT === "qr") (await import("node:child_process")).execSync("node tools/apps/build-app.mjs qr", { stdio: "ignore" }); // the QR half runs against the BUILT app, so a source mutation needs a rebuild
if (fs.existsSync(path.join(ROOT, "build/qr/app/sw.js"))) await run("QR worker", path.join(ROOT, "build/qr"), 8192, "/app/quranrevival.html");
else console.log("skip  QR half: build/qr is missing (run node tools/apps/build-app.mjs qr)"), (MUT === "qr" && fail++);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
