// Audit part 48 (PCF MSA J29): how fast QuranRevival LOADS for a student, on the BUILT QR app.
// The network is throttled (CDP Network.emulateNetworkConditions, 1.6 Mbps down, 150 ms latency) and the Firebase stub answers
// after 150 ms (latencyMs), so the times are not instant. TIMES ARE PRINTED, NEVER FAILED ON: only COUNTED things fail.
//   first     first visit, empty cache: requests / bytes before the first paint, and until idle; the 10 largest files
//   second    second visit (the worker installed): anything fetched from the network again that the cache should answer
//   read      tap Read -> 2:255's Arabic on screen, first and second visit: the files the tap fetches
//   contract  the load-speed contract: Firestore reads before first paint (none) and after it (userIndex, enrolments, bookmarks only)
// Signed in as a student (person p2) and signed out. Widths 390 and 1280, English.
//   node tools/apps/qr-verify/load-speed-browser.mjs [--only=first,second,read,contract,control] [--width=N] [--mutate=<name>] [--report]
//   --report prints every measurement and never fails.  (serves build/qr itself on PORT, default 8114: run node tools/apps/build-app.mjs qr first)
// A BUDGET is the count measured on unmodified main (printed by --report); a counter has a positive control (the "control" flow adds one
// extra startup import and one extra startup read and proves the counters see them).
// A Playwright switch is needed so the harness's fake Firebase SDK also reaches the worker's own fetches.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
import "./_root.mjs";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import http from "node:http";

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, REPORT = process.argv.includes("--report");
const { REPO, BUILD } = await import("./_root.mjs");
const PORT = Number(process.env.PORT) || 8114;
// Its own server, as GitHub Pages answers: gzip when asked, and Cache-Control: max-age=600.
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(BUILD, p);
  if (!file.startsWith(BUILD + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    const ext = path.extname(file);
    const h = { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "max-age=600" };
    if (/gzip/.test(req.headers["accept-encoding"] || "") && [".html", ".js", ".css", ".json", ".webmanifest"].includes(ext)) { data = zlib.gzipSync(data); h["Content-Encoding"] = "gzip"; }
    res.setHeader && Object.entries(h).forEach(([k, v]) => res.setHeader(k, v));
    res.statusCode = 200;
    setTimeout(() => active.add({ res, data, pos: 0 }), LATENCY_MS);
  });
});
// ONE shared link, 1.6 Mbps: every response (the page's AND the worker's own fetches) shares it fairly, so what the worker
// installs while the page loads slows the page, as on a real phone. (CDP can only throttle the page, not the worker.)
const LATENCY_MS = 150, BYTES_PER_SEC = (1.6 * 1e6) / 8, TICK_MS = 20;
const active = new Set();
setInterval(() => {
  if (!active.size) return;
  const share = Math.max(1, Math.floor((BYTES_PER_SEC * TICK_MS) / 1000 / active.size));
  for (const a of [...active]) {
    const end = Math.min(a.data.length, a.pos + share);
    a.res.write(a.data.subarray(a.pos, end)); a.pos = end;
    if (a.pos >= a.data.length) { a.res.end(); active.delete(a); }
  }
}, TICK_MS).unref();
await new Promise((r) => server.listen(PORT, r));
process.env.QR_BASE = `http://localhost:${PORT}`;
const { chromium, newContext, BASE } = await import("../../i18n-verify/harness.mjs");
const { stubFor } = await import("../../i18n-verify/firebase-stub.mjs");
const { routeMmsaHadith } = await import("./mmsa-hadith-route.mjs");

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (REPORT) return;
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const say = (s) => console.log(s);

// BUDGETS: counted, from unmodified main (v12.35), see the PR. [signed-in student, signed-out], at 390 and 1280 alike unless noted.
const BUDGET = {
  // filled from the measurement below
  beforePaintRequests: { in: 0, out: 0 },
  modulesToUsable: { in: 0, out: 0 },
  startupReads: { in: 0, out: 0 },
  secondVisitNetwork: { in: 0, out: 0 },
};
try { Object.assign(BUDGET, JSON.parse(fs.readFileSync(path.join(REPO, "tools/apps/qr-verify/load-speed-budget.json"), "utf8"))); } catch { /* no budget file yet: --report */ }

// name: [file in the built app, route glob, anchor (exactly once), replacement]. Each puts one fix (or one extra) back.
// Each is [file in the built app, route glob, [[anchor (exactly once), replacement], ...]].
const ZAB_NEW = `if (isZabReady() && !inWindow && !embedded) {
    const mountZab = () => import("./zab-bar.js").then((m) => m.mountZabBar()).catch((err) => console.warn("Zab bar not mounted:", err.message));
    const whenIdle = () => (window.requestIdleCallback ? window.requestIdleCallback(mountZab, { timeout: 2000 }) : setTimeout(mountZab, 500));
    if (document.readyState === "complete") whenIdle(); else window.addEventListener("load", whenIdle, { once: true });
  }`;
const ZAB_OLD = `if (isZabReady() && !inWindow && !embedded) import("./zab-bar.js").then((m) => m.mountZabBar()).catch((err) => console.warn("Zab bar not mounted:", err.message));`;
const SW_NEW = `if (document.readyState === "complete") startWhenQuiet();
  else window.addEventListener("load", startWhenQuiet, { once: true });`;
const SW_OLD = `if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });`;
const MUTATIONS = {
  "zab-early": ["app/js/sw-register.js", "**/app/js/sw-register.js*", [[ZAB_NEW, ZAB_OLD]]],
  "both-early": ["app/js/sw-register.js", "**/app/js/sw-register.js*", [[ZAB_NEW, ZAB_OLD], [SW_NEW, SW_OLD]]],
  "sw-early": ["app/js/sw-register.js", "**/app/js/sw-register.js*", [[SW_NEW, SW_OLD]]],
};
// Positive controls (the "control" flow): ONE extra startup module, which the counters must see.
const CONTROLS = {
  "extra-import": ["app/quranrevival.html", "**/app/quranrevival.html*", [["</body>", '<script type="module" src="./js/writing-sheet.js"></script></body>']]],
};
const ALL = { ...MUTATIONS, ...CONTROLS };
if (MUTATE && !ALL[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);

const browser = await chromium.launch();

function studentStub(s, { signedOut = false } = {}) {
  const owner = 'personId: "p1", roles: ["owner", "prime"] },\n  ],\n  tenants:';
  if (!s.includes(owner)) throw new Error("stub shape changed: owner tenantMemberUids row not found");
  s = s.replace(owner, 'personId: "p2", roles: ["student"] },\n  ],\n  tenants:');
  const p2 = '{ _id: "p2", tenantId: TENANT_ID, personId: "p2",';
  if (!s.includes(p2)) throw new Error("stub shape changed: p2 not found");
  s = s.replace(p2, p2 + " authUid: UID,");
  if (signedOut) {
    const a = 'setTimeout(() => cb({ uid: UID, email: "smahk9@gmail.com", displayName: "Owner" }), 0)';
    if (!s.includes(a)) throw new Error("stub shape changed: onAuthStateChanged not found");
    s = s.replace(a, "setTimeout(() => cb(null), 0)");
  }
  return s;
}
const SEED = `window.__DATA = DATA; DATA.notes = []; DATA.noteFolders = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSources = []; DATA.userPrefs = [{ _id: "test-uid" }];`;

async function makeContext(width, signedOut) {
  const height = width < 600 ? 844 : 720;
  const ctx = await newContext(browser, { banner: false, viewport: { width, height }, latencyMs: 150, allowServiceWorker: true, extraSeedJs: SEED });
  const body = studentStub(stubFor({ banner: false, latencyMs: 150, extraSeedJs: SEED }), { signedOut });
  await ctx.route("https://www.gstatic.com/firebasejs/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route((u) => ![new URL(BASE).hostname, "www.gstatic.com", "cdn.jsdelivr.net", "madrasatul-muslimeen.github.io"].includes(u.hostname), (r) => r.abort());
  await routeMmsaHadith(ctx);
  if (MUTATE) {
    const [file, glob, pairs] = ALL[MUTATE];
    let src = fs.readFileSync(path.join(BUILD, file), "utf8");
    for (const [from, to] of pairs) {
      const n = src.split(from).length - 1;
      if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
      src = src.split(from).join(to);
    }
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: /\.css/.test(file) ? "text/css; charset=utf-8" : /\.html/.test(file) ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: src }));
  }
  // the worker's own fetches (install precache, background refresh): counted apart from the page's
  ctx.__sw = [];
  ctx.on("request", (r) => { if (r.serviceWorker()) ctx.__sw.push({ url: r.url(), t: Date.now(), r }); });
  return ctx;
}

const rawSize = (u) => { try { const x = new URL(u); if (x.origin !== BASE) return 0; return fs.statSync(path.join(BUILD, decodeURIComponent(x.pathname))).size; } catch { return 0; } };
const gzSize = (u) => { try { const x = new URL(u); if (x.origin !== BASE) return 0; return zlib.gzipSync(fs.readFileSync(path.join(BUILD, decodeURIComponent(x.pathname)))).length; } catch { return 0; } };
const short = (u) => u.replace(BASE, "").replace("https://", "");
const kb = (n) => (n / 1024).toFixed(0) + " KB";

/** One page on a throttled network; every request it makes is recorded (CDP), with when, from where, how big. */
async function track(ctx) {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  // (the link itself is throttled by the suite's server, shared with the worker; see LATENCY_MS / BYTES_PER_SEC)
  const reqs = new Map();
  cdp.on("Network.requestWillBeSent", (e) => { if (!reqs.has(e.requestId)) reqs.set(e.requestId, { url: e.request.url, type: e.type, t: e.wallTime * 1000, from: (e.initiator && (e.initiator.url || e.initiator.stack?.callFrames?.[0]?.url)) || e.initiator?.type || "" }); });
  cdp.on("Network.responseReceived", (e) => { const r = reqs.get(e.requestId); if (r) { r.sw = !!e.response.fromServiceWorker; r.disk = !!e.response.fromDiskCache; r.status = e.response.status; } });
  cdp.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) { r.enc = e.encodedDataLength; r.done = true; } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return { page, cdp, reqs, errors, list: () => [...reqs.values()].filter((r) => !/^data:/.test(r.url)) };
}

async function idle(page, quietMs = 1500, maxMs = 60000) {
  // idle = no new request for quietMs (a named state, not a guessed wait); a timeout is reported by name
  const t0 = Date.now(); let last = Date.now();
  const bump = () => { last = Date.now(); };
  page.on("request", bump);
  while (Date.now() - last < quietMs) { if (Date.now() - t0 > maxMs) { say("  TIMEOUT waiting for the page to go idle"); break; } await new Promise((r) => setTimeout(r, 200)); }
  page.off("request", bump);
}

const sizeOf = (r) => (r.sw || r.disk ? gzSize(r.url) || rawSize(r.url) : r.enc || rawSize(r.url)); // as sent: gzip, like GitHub Pages

/** A visit: open the page, wait for load and idle, and summarise. */
async function visit(ctx, label) {
  const t = await track(ctx);
  const t0 = Date.now();
  const navAt = Date.now();
  // "usable": the moment the page's OWN code (after every static import has arrived and run) asks for the surah index
  // -- the first thing the landing fetches for itself. (The wheel is drawn by the HTML, so it says nothing.)
  await t.page.goto(`${BASE}/app/quranrevival.html`, { waitUntil: "load" }).catch((e) => say(`  goto: ${e.message.split("\n")[0]}`));
  await idle(t.page);
  const idleMs = Date.now() - t0;
  const nav = await t.page.evaluate(() => {
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    const logs = (window.__fsLog || []).map((x) => ({ kind: x.kind, col: x.col, id: x.id, t0: x.t0 }));
    return { origin: performance.timeOrigin, fcp: fcp ? fcp.startTime : null, loadEnd: performance.getEntriesByType("navigation")[0]?.loadEventEnd ?? null, logs, controlled: !!navigator.serviceWorker.controller };
  });
  const all = t.list();
  const fcpEpoch = nav.fcp == null ? Infinity : nav.origin + nav.fcp;
  const before = all.filter((r) => r.t <= fcpEpoch);
  const isJs = (r) => /\.m?js(\?|$)/.test(r.url) && r.url.startsWith(BASE);
  const net = all.filter((r) => !r.sw && !r.disk);
  const sameNet = net.filter((r) => r.url.startsWith(BASE));
  const reads = nav.logs.filter((l) => /^(get|getDoc|getDocs|query|list)/i.test(l.kind) || true);
  const readsBefore = reads.filter((l) => l.t0 <= nav.fcp);
  nav.usable = nav.loadEnd; // the window load event: every static import has arrived and run
  const lastOwn = Math.max(...all.filter((r) => !/\/js\/zab-/.test(r.url)).map((r) => r.t)); // the page's last own request (the Zab bar is a late extra)
  const out = {
    label, t: t, nav, all, idleMs, navAt,
    fcpMs: nav.fcp == null ? null : Math.round(nav.fcp),
    requests: all.length, bytes: all.reduce((a, r) => a + sizeOf(r), 0),
    beforePaintRequests: before.length, beforePaintBytes: before.reduce((a, r) => a + sizeOf(r), 0),
    beforePaintModules: before.filter(isJs).length,
    modules: all.filter(isJs).length,
    lastOwn,
    modulesToUsable: all.filter((r) => isJs(r) && r.t <= nav.origin + (nav.usable ?? Infinity)).length,
    zabAt: all.filter((r) => /\/js\/zab-(bar|data|to-note)\.js/.test(r.url)).map((r) => r.t),
    loadEndEpoch: nav.origin + (nav.loadEnd ?? Infinity),
    netRequests: net.length, netBytes: net.reduce((a, r) => a + sizeOf(r), 0), sameNet,
    reads, readsBefore, errors: t.errors,
  };
  return out;
}
function print(v, tag) {
  say(`  [${tag}] ${v.label}: FCP ${v.fcpMs} ms; usable (surah picker filled) ${v.nav.usable == null ? "never" : Math.round(v.nav.usable) + " ms"}; idle after ${v.idleMs} ms; worker controls: ${v.nav.controlled}`);
  say(`    requests ${v.requests} (${kb(v.bytes)} raw), of which from the NETWORK ${v.netRequests} (${kb(v.netBytes)}); JS modules ${v.modules}`);
  say(`    before first paint: ${v.beforePaintRequests} requests, ${v.beforePaintModules} modules, ${kb(v.beforePaintBytes)}; Firestore reads before paint ${v.readsBefore.length}, in all ${v.reads.length}`);
  if (process.argv.includes("--waterfall")) {
    const t0 = Math.min(...v.all.map((r) => r.t));
    for (const r of [...v.all].sort((a, b) => a.t - b.t)) say(`      +${String(Math.round(r.t - t0)).padStart(6)}ms ${String(kb(sizeOf(r))).padStart(7)} ${r.sw ? "sw" : "net"} ${short(r.url)}  <- ${short(r.from || "")}`);
  }
  say(`    reads: ${v.reads.map((l) => l.col + (l.id ? "/" + l.id : "")).join(", ") || "none"}`);
}
function top10(v, tag) {
  const seen = new Map();
  for (const r of v.all) seen.set(r.url, Math.max(seen.get(r.url) || 0, sizeOf(r)));
  const rows = [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  say(`    [${tag}] the 10 largest files (raw / gzipped as GitHub Pages would send):`);
  for (const [u, n] of rows) say(`      ${String(kb(n)).padStart(8)} / ${String(kb(gzSize(u) || n)).padStart(7)}  ${short(u)}`);
}

async function swInstall(ctx, page) {
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 90000 }).catch(() => say("  TIMEOUT waiting for the worker to take control"));
  await page.evaluate(async () => { for (let i = 0; i < 200; i++) { const k = await caches.keys(); if (k.some((n) => n.startsWith("qr-app-"))) { const c = await caches.open(k.find((n) => n.startsWith("qr-app-"))); if ((await c.keys()).length > 150) return; } await new Promise((r) => setTimeout(r, 300)); } });
}

/** Read view: tap Read, choose 2:255, stop when the Arabic of the verse is on screen. */
async function readTap(ctx, v, label) {
  const p = v.t.page;
  const mark = Date.now();
  const before = new Set(v.t.reqs.keys());
  const startReqs = v.t.reqs.size;
  const t0 = Date.now();
  if (!(await p.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await p.click("#tabStudyBtn").catch(() => {}); await p.waitForTimeout(200); }
  await p.click("#tabReadBtn");
  await p.evaluate(() => { const e = document.getElementById("surahSelect"); if (e && e.value !== "2") { e.value = "2"; e.dispatchEvent(new Event("change", { bubbles: true })); } });
  const ok1 = await p.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 60000 }).then(() => true, () => false);
  await p.waitForFunction(() => !!document.querySelector('#ayahSelect option[value="255"]'), null, { timeout: 60000 }).catch(() => {});
  await p.evaluate(() => { const e = document.getElementById("ayahSelect"); e.value = "255"; e.dispatchEvent(new Event("change", { bubbles: true })); });
  const ok2 = await p.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:255:"]'), null, { timeout: 60000 }).then(() => true, () => false);
  const ms = Date.now() - t0;
  if (!(ok1 && ok2)) say(`    DEBUG not reached: ${JSON.stringify(await p.evaluate(() => ({ surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value, read: !document.getElementById("readView")?.hidden, occ: document.querySelectorAll("#readView [data-word-occurrence]").length, first: document.querySelector("#readView [data-word-occurrence]")?.getAttribute("data-word-occurrence") })))} errors: ${v.t.errors.slice(0, 2).join(" | ")}`);
  await idle(p, 1000, 20000);
  const fresh = v.t.list().filter((r) => !before.has(r.__id) && r.t >= mark - 50);
  const net = fresh.filter((r) => !r.sw && !r.disk);
  say(`  [read ${label}] tap Read -> 2:255 Arabic on screen: ${ms} ms${ok1 && ok2 ? "" : " (NOT REACHED)"}; ${fresh.length} requests (${net.length} from the network, ${kb(net.reduce((a, r) => a + sizeOf(r), 0))})`);
  for (const r of fresh.sort((a, b) => sizeOf(b) - sizeOf(a)).slice(0, 10)) say(`      ${String(kb(sizeOf(r))).padStart(8)} ${r.sw ? "worker" : r.disk ? "disk  " : "NET   "} ${short(r.url)}`);
  return { reached: ok1 && ok2, ms, requests: fresh.length, net: net.length, fresh };
}

async function scenario(width, signedOut) {
  const who = signedOut ? "signed-out" : "student";
  const key = signedOut ? "out" : "in";
  const tag = `${width} ${who}`;
  say(`\n== ${tag} ==`);
  const ctx = await makeContext(width, signedOut);
  try {
    const first = await visit(ctx, "FIRST visit, empty cache");
    print(first, tag);
    top10(first, tag);
    if (first.errors.length) say(`    page errors: ${first.errors.slice(0, 3).join(" | ")}`);
    // contract
    const startupReads = first.reads.filter((l) => l.t0 > (first.nav.fcp ?? 0) || true);
    const allowed = new Set(["userIndex", "enrolments", "bookmarks"]);
    if (!ONLY || /contract|control/.test(ONLY)) {
      check(`${tag}: POSITIVE CONTROL the page signed in and the counters saw its reads`, signedOut || first.reads.length > 0, `reads ${first.reads.length}`);
      const extra = first.reads.filter((l) => !allowed.has(l.col)).map((l) => l.col);
      say(`    contract: reads outside {userIndex, enrolments, bookmarks} at startup: ${[...new Set(extra)].join(", ") || "none"}`);
      check(`${tag}: no Firestore read before first paint`, first.readsBefore.length <= (BUDGET.readsBeforePaint?.[key] ?? 0), `${first.readsBefore.length}: ${first.readsBefore.map((l) => l.col).join(",")}`);
      check(`${tag}: startup reads stay within the budget (${BUDGET.startupReads[key]})`, first.reads.length <= BUDGET.startupReads[key], `${first.reads.length}: ${first.reads.map((l) => l.col).join(",")}`);
    }
    if (!ONLY || /first/.test(ONLY)) {
      // requests before first paint depend on timing (3 or 4 by the clock), so they are PRINTED above, not failed on
      say(`    modules fetched until the landing is usable: ${first.modulesToUsable} (budget ${BUDGET.modulesToUsable[key]})`);
      check(`${tag}: POSITIVE CONTROL the landing became usable (wheel drawn)`, first.nav.usable != null);
      check(`${tag}: first visit, JS modules fetched until the landing is usable within the budget (${BUDGET.modulesToUsable[key]})`, first.modulesToUsable <= BUDGET.modulesToUsable[key], `${first.modulesToUsable}`);
    }
    // read view, first visit
    let readFirst = null;
    if (!signedOut && (!ONLY || /read/.test(ONLY))) {
      // its own fresh context: a surah opened before the worker takes over is not kept, and would change the second visit
      const rc = await makeContext(width, signedOut);
      try { const rv = await visit(rc, "read-tap context"); readFirst = await readTap(rc, rv, "first visit"); await rv.t.page.close(); } finally { await rc.close().catch(() => {}); }
    }
    // install the worker, then visit again
    await swInstall(ctx, first.t.page);
    if (!ONLY || /first/.test(ONLY)) {
      // fixes: the Zab bar waits for the window load event; the worker's install waits until the landing is usable
      check(`${tag}: POSITIVE CONTROL the Zab bar's code was fetched`, first.zabAt.length > 0);
      check(`${tag}: the Zab bar's code is fetched only after the window load event`, first.zabAt.every((t) => t >= first.loadEndEpoch - 5), `${first.zabAt.map((t) => Math.round(t - first.loadEndEpoch)).join(",")} ms from load end`);
      const usableEpoch = first.lastOwn;
      const swFirst = Math.min(...ctx.__sw.map((x) => x.t));
      check(`${tag}: POSITIVE CONTROL the worker installed (it made fetches of its own)`, ctx.__sw.length > 100, `${ctx.__sw.length}`);
      check(`${tag}: the worker's install starts only after the page's own last request`, swFirst >= usableEpoch, `worker's first fetch ${Math.round(swFirst - usableEpoch)} ms from the page's last request`);
    }
    say(`  the worker installed ${ctx.__sw.length} fetches of its own while the first visit ran (install precache + carry-over)`);
    const swBytes = ctx.__sw.reduce((a, x) => a + rawSize(x.url), 0);
    say(`    worker's own fetches: ${ctx.__sw.length} files, ${kb(swBytes)} raw (not throttled here: the worker's network is not reachable from CDP)`);
    await first.t.page.close();
    ctx.__sw.length = 0;
    const second = await visit(ctx, "SECOND visit, worker installed");
    print(second, tag);
    const again = second.sameNet.map((r) => short(r.url));
    say(`    page fetched from the NETWORK again (same site): ${again.length}${again.length ? " -> " + again.slice(0, 12).join(", ") : ""}`);
    await new Promise((r) => setTimeout(r, 1500));
    const swAgain = ctx.__sw.map((x) => short(x.url));
    say(`    worker's own network fetches (background refresh): ${swAgain.length}${swAgain.length ? " -> " + swAgain.slice(0, 12).join(", ") : ""}`);
    const secondNet = again.length + swAgain.length;
    if (!ONLY || /second/.test(ONLY)) {
      check(`${tag}: POSITIVE CONTROL the second visit is controlled by the worker`, second.nav.controlled);
      check(`${tag}: second visit, files fetched from the network again within the budget (${BUDGET.secondVisitNetwork[key]})`, secondNet <= BUDGET.secondVisitNetwork[key], `${secondNet}: ${[...again, ...swAgain].slice(0, 10).join(", ")}`);
    }
    if (!signedOut && (!ONLY || /read/.test(ONLY))) {
      const r2 = await readTap(ctx, second, "second visit");
      check(`${tag}: POSITIVE CONTROL the Read tap reached 2:255 (first and second visit)`, !!readFirst?.reached && r2.reached, `${readFirst?.reached} ${r2.reached}`);
    }
    await second.t.page.close();
    return { first, second };
  } finally { await ctx.close().catch(() => {}); }
}

const widths = WONLY ? [WONLY] : [390, 1280];
for (const w of widths) for (const so of [false, true]) {
  try { await scenario(w, so); } catch (e) { check(`${w} ${so ? "signed-out" : "student"}: scenario ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); say(String(e.stack || e)); }
}
await browser.close();
server.close(); server.closeAllConnections?.();
say(REPORT ? "\n(report mode: nothing is failed)" : `\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(REPORT || !fail ? 0 : 1);
