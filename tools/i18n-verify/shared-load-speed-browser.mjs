// Audit part 51 (PCF MSA J29): how fast My Notes (app/notes.html) and Mapping My Journey (app/journey-map.html) LOAD.
// Modelled on tools/apps/qr-verify/load-speed-browser.mjs: its own server answers like GitHub Pages (gzip, max-age=600) and
// shares ONE 1.6 Mbps link with 150 ms latency between the page and the worker; the Firebase stub answers after 150 ms.
// TIMES ARE PRINTED, NEVER FAILED ON: only COUNTED things fail.
//   "usable" is a STATE, named per page:
//     notes.html        #app is shown (the sign-in check is done and the page has chosen what to show)
//     journey-map.html  #app is shown AND #viewFolders has been filled (the folder view is drawn)
//   first    first visit, empty cache: requests / modules / KB before first paint and until usable; reads with their call stack
//   second   second visit with the worker installed: anything fetched from the network again
//   contract Firestore reads before first paint (none); no read of all records for a person
// Signed in as the owner (p1) and as the student p2. Widths 390 and 1280, English.
//   node tools/i18n-verify/shared-load-speed-browser.mjs [--page=notes|journey] [--width=N] [--who=owner|student] [--mutate=<name>] [--report] [--waterfall]
// Needs no other server (serves the repository root itself on PORT, default 8115).
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import http from "node:http";
import { fileURLToPath } from "node:url";

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), PONLY = arg("page"), WONLY = Number(arg("width")) || 0, WHO = arg("who"), REPORT = process.argv.includes("--report");
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = Number(process.env.PORT) || 8115;
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
const LATENCY_MS = 150, BYTES_PER_SEC = (1.6 * 1e6) / 8, TICK_MS = 20;
const active = new Set();
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(REPO, p);
  if (!file.startsWith(REPO + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    const ext = path.extname(file);
    const h = { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "max-age=600" };
    if (/gzip/.test(req.headers["accept-encoding"] || "") && [".html", ".js", ".css", ".json", ".webmanifest"].includes(ext)) { data = zlib.gzipSync(data); h["Content-Encoding"] = "gzip"; }
    Object.entries(h).forEach(([k, v]) => res.setHeader(k, v));
    res.statusCode = 200;
    setTimeout(() => active.add({ res, data, pos: 0 }), LATENCY_MS);
  });
});
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
const { chromium, newContext, BASE } = await import("./harness.mjs");
const { stubFor } = await import("./firebase-stub.mjs");

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (REPORT) return;
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const say = (s) => console.log(s);

// BUDGETS: counted, measured on unmodified main (v12.38); see the PR. Keyed page -> who.
const BUDGET = JSON.parse(fs.readFileSync(path.join(REPO, "tools/i18n-verify/shared-load-speed-budget.json"), "utf8"));

// name: [file, route glob, [[anchor (exactly once), replacement], ...]]. Each puts one fix back (filled as fixes land).
const MUTATIONS = {
  "tags-no-unit": ["app/notes.html", "**/app/notes.html*", [
    ["      if (!unitKey || !tagsReady() || !activeTenantId || !selectedPersonId) return;", "      if (!tagsReady() || !activeTenantId || !selectedPersonId) return;"],
  ]],
  "tags-serial": ["app/notes.html", "**/app/notes.html*", [
    ["      const tagsDone = loadTags();\n", "      await loadTags(); const tagsDone = null;\n"],
  ]],
};
// Positive control: ONE extra startup module, which the counters must see.
const CONTROLS = { "extra-import": ["app/notes.html", "**/app/notes.html*", [["</body>", '<script type="module" src="./js/writing-sheet.js"></script></body>']]] };
const ALL = { ...MUTATIONS, ...CONTROLS };
if (MUTATE && !ALL[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);

const browser = await chromium.launch();
const SEED = `window.__DATA = DATA; DATA.notes = []; DATA.noteFolders = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSources = []; DATA.userPrefs = [{ _id: "test-uid" }];`;

function whoStub(s, who) {
  if (who !== "student") return s;
  const owner = 'personId: "p1", roles: ["owner", "prime"] },\n  ],\n  tenants:';
  if (!s.includes(owner)) throw new Error("stub shape changed: owner tenantMemberUids row not found");
  s = s.replace(owner, 'personId: "p2", roles: ["student"] },\n  ],\n  tenants:');
  const p2 = '{ _id: "p2", tenantId: TENANT_ID, personId: "p2",';
  if (!s.includes(p2)) throw new Error("stub shape changed: p2 not found");
  return s.replace(p2, p2 + " authUid: UID,");
}
async function makeContext(width, who) {
  const height = width < 600 ? 844 : 720;
  const ctx = await newContext(browser, { banner: false, viewport: { width, height }, latencyMs: 150, allowServiceWorker: true, extraSeedJs: SEED });
  const body = whoStub(stubFor({ banner: false, latencyMs: 150, extraSeedJs: SEED }), who);
  await ctx.route("https://www.gstatic.com/firebasejs/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route((u) => ![new URL(BASE).hostname, "www.gstatic.com", "cdn.jsdelivr.net", "madrasatul-muslimeen.github.io"].includes(u.hostname), (r) => r.abort());
  if (MUTATE) {
    const [file, glob, pairs] = ALL[MUTATE];
    let src = fs.readFileSync(path.join(REPO, file), "utf8");
    for (const [from, to] of pairs) {
      const n = src.split(from).length - 1;
      if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
      src = src.split(from).join(to);
    }
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: /\.html/.test(file) ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: src }));
  }
  ctx.__sw = [];
  ctx.on("request", (r) => { if (r.serviceWorker()) ctx.__sw.push({ url: r.url(), t: Date.now() }); });
  return ctx;
}

const rawSize = (u) => { try { const x = new URL(u); if (x.origin !== BASE) return 0; return fs.statSync(path.join(REPO, decodeURIComponent(x.pathname))).size; } catch { return 0; } };
const gzSize = (u) => { try { const x = new URL(u); if (x.origin !== BASE) return 0; return zlib.gzipSync(fs.readFileSync(path.join(REPO, decodeURIComponent(x.pathname)))).length; } catch { return 0; } };
const short = (u) => u.replace(BASE, "").replace("https://", "");
const kb = (n) => (n / 1024).toFixed(0) + " KB";
const sizeOf = (r) => (r.sw || r.disk ? gzSize(r.url) || rawSize(r.url) : r.enc || rawSize(r.url));

async function track(ctx) {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  const reqs = new Map();
  cdp.on("Network.requestWillBeSent", (e) => { if (!reqs.has(e.requestId)) reqs.set(e.requestId, { url: e.request.url, type: e.type, t: e.wallTime * 1000, from: (e.initiator && (e.initiator.url || e.initiator.stack?.callFrames?.[0]?.url)) || e.initiator?.type || "" }); });
  cdp.on("Network.responseReceived", (e) => { const r = reqs.get(e.requestId); if (r) { r.sw = !!e.response.fromServiceWorker; r.disk = !!e.response.fromDiskCache; } });
  cdp.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) r.enc = e.encodedDataLength; });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return { page, reqs, errors, list: () => [...reqs.values()].filter((r) => !/^data:/.test(r.url)) };
}
async function idle(page, quietMs = 1500, maxMs = 60000) {
  const t0 = Date.now(); let last = Date.now();
  const bump = () => { last = Date.now(); };
  page.on("request", bump);
  while (Date.now() - last < quietMs) { if (Date.now() - t0 > maxMs) { say("  TIMEOUT waiting for the page to go idle"); break; } await new Promise((r) => setTimeout(r, 200)); }
  page.off("request", bump);
}

const PAGES = {
  notes: { file: "/app/notes.html", usable: () => { const a = document.getElementById("app"); return !!a && getComputedStyle(a).display !== "none"; }, usableText: "#app shown" },
  notesUnit: { file: "/app/notes.html?unit=ayah:2:255", usable: () => { const a = document.getElementById("app"); const e = document.getElementById("emptyMsg"); return !!a && getComputedStyle(a).display !== "none" && !!e && getComputedStyle(e).display !== "none"; }, usableText: "#app shown and the empty-notes line shown" },
  journey: { file: "/app/journey-map.html", usable: () => { const a = document.getElementById("app"); return !!a && getComputedStyle(a).display !== "none" && document.getElementById("viewFolders").children.length > 0; }, usableText: "#app shown and #viewFolders drawn" },
};

async function visit(ctx, pg, label) {
  const t = await track(ctx);
  const t0 = Date.now();
  // the time of the usable state is read inside the page, on the page's own clock
  await t.page.addInitScript((src) => {
    const f = new Function("return (" + src + ")()");
    window.__usableAt = null;
    const poll = () => { try { if (window.__usableAt == null && f()) window.__usableAt = performance.now(); } catch (e) { /* not ready */ } if (window.__usableAt == null) setTimeout(poll, 25); };
    poll();
  }, pg.usable.toString());
  await t.page.goto(`${BASE}${pg.file}`, { waitUntil: "load" }).catch((e) => say(`  goto: ${e.message.split("\n")[0]}`));
  await t.page.waitForFunction(() => window.__usableAt != null, null, { timeout: 60000 }).catch(() => {});
  await idle(t.page);
  const nav = await t.page.evaluate(() => {
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    const logs = (window.__fsLog || []).map((x) => ({ kind: x.kind, col: x.col, id: x.id, t0: x.t0, stack: x.stack || "" }));
    return { origin: performance.timeOrigin, fcp: fcp ? fcp.startTime : null, usable: window.__usableAt, logs, controlled: !!navigator.serviceWorker.controller };
  });
  const all = t.list();
  const fcpEpoch = nav.fcp == null ? Infinity : nav.origin + nav.fcp;
  const usableEpoch = nav.usable == null ? Infinity : nav.origin + nav.usable;
  const isJs = (r) => /\.m?js(\?|$)/.test(r.url) && r.url.startsWith(BASE);
  const before = all.filter((r) => r.t <= fcpEpoch), toUse = all.filter((r) => r.t <= usableEpoch);
  const net = all.filter((r) => !r.sw && !r.disk);
  const reads = nav.logs;
  return {
    label, t, nav, all, idleMs: Date.now() - t0, fcpMs: nav.fcp == null ? null : Math.round(nav.fcp), usableMs: nav.usable == null ? null : Math.round(nav.usable),
    requests: all.length, beforePaintRequests: before.length, beforePaintModules: before.filter(isJs).length, beforePaintBytes: before.reduce((a, r) => a + sizeOf(r), 0),
    toUsableRequests: toUse.length, modulesToUsable: toUse.filter(isJs).length, bytesToUsable: toUse.reduce((a, r) => a + sizeOf(r), 0),
    modules: all.filter(isJs).length, sameNet: net.filter((r) => r.url.startsWith(BASE)), reads, readsBefore: reads.filter((l) => l.t0 <= (nav.fcp ?? 0)),
    readsToUsable: reads.filter((l) => l.t0 <= (nav.usable ?? Infinity)), errors: t.errors,
  };
}
function callerOf(stack) {
  const out = [];
  for (const f of String(stack || "").split("\n").slice(1)) {
    const m = f.match(/at (?:async )?(?:(.+?) \()?(https?:\/\/[^)\s]+?):(\d+):\d+\)?\s*$/);
    if (!m || /firebase|stub|__trip/i.test(m[2])) continue;
    out.push(`${m[1] || "(anon)"} @ ${m[2].replace(/^https?:\/\/[^/]+\//, "").replace(/\?.*$/, "")}:${m[3]}`);
    if (out.length >= 3) break;
  }
  return out.join(" <- ") || "(no app frame)";
}
function print(v, tag, pg) {
  say(`  [${tag}] ${v.label}: FCP ${v.fcpMs} ms; usable (${pg.usableText}) ${v.usableMs == null ? "NEVER" : v.usableMs + " ms"}; idle after ${v.idleMs} ms; worker controls: ${v.nav.controlled}`);
  say(`    requests ${v.requests}; JS modules ${v.modules}`);
  say(`    before first paint: ${v.beforePaintRequests} requests, ${v.beforePaintModules} modules, ${kb(v.beforePaintBytes)}; Firestore reads before paint ${v.readsBefore.length}`);
  say(`    until usable: ${v.toUsableRequests} requests, ${v.modulesToUsable} modules, ${kb(v.bytesToUsable)}; Firestore reads until usable ${v.readsToUsable.length}; in all ${v.reads.length}`);
  if (process.argv.includes("--waterfall")) {
    const t0 = Math.min(...v.all.map((r) => r.t));
    for (const r of [...v.all].sort((a, b) => a.t - b.t)) say(`      +${String(Math.round(r.t - t0)).padStart(6)}ms ${String(kb(sizeOf(r))).padStart(7)} ${r.sw ? "sw" : "net"} ${short(r.url)}  <- ${short(r.from || "")}`);
  }
  // identical reads (same collection, same caller) are listed once with a count: the sharded loads repeat five times
  const groups = new Map();
  for (const l of v.reads) { const k = `${l.kind} ${l.col}${l.id ? "/" + l.id : ""}  <- ${callerOf(l.stack)}`; const g = groups.get(k) || { n: 0, at: Math.round(l.t0) }; g.n++; groups.set(k, g); }
  for (const [k, g] of groups) say(`      read x${g.n} @${g.at}ms ${k}`);
}
function top10(v, tag) {
  const seen = new Map();
  for (const r of v.all) seen.set(r.url, Math.max(seen.get(r.url) || 0, sizeOf(r)));
  say(`    [${tag}] the 10 largest files (raw / gzipped):`);
  for (const [u, n] of [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) say(`      ${String(kb(n)).padStart(8)} / ${String(kb(gzSize(u) || n)).padStart(7)}  ${short(u)}`);
}
async function swInstall(page) {
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 90000 }).catch(() => say("  TIMEOUT waiting for the worker to take control"));
  await page.evaluate(async () => { for (let i = 0; i < 200; i++) { const k = await caches.keys(); if (k.some((n) => n.startsWith("mm-app-"))) { const c = await caches.open(k.find((n) => n.startsWith("mm-app-"))); if ((await c.keys()).length > 20) return; } await new Promise((r) => setTimeout(r, 300)); } });
}

async function scenario(pageKey, width, who) {
  const pg = PAGES[pageKey], tag = `${pageKey} ${width} ${who}`, B = BUDGET[pageKey]?.[who] || {};
  say(`\n== ${tag} ==`);
  const ctx = await makeContext(width, who);
  try {
    const first = await visit(ctx, pg, "FIRST visit, empty cache");
    print(first, tag, pg); top10(first, tag);
    if (first.errors.length) say(`    page errors: ${first.errors.slice(0, 3).join(" | ")}`);
    check(`${tag}: POSITIVE CONTROL the page became usable`, first.usableMs != null);
    check(`${tag}: POSITIVE CONTROL the counters saw requests and the page's reads`, first.requests > 5 && first.reads.length > 0, `${first.requests} requests, ${first.reads.length} reads`);
    check(`${tag}: no Firestore read before first paint`, first.readsBefore.length === 0, first.readsBefore.map((l) => l.col).join(","));
    const wide = first.reads.filter((l) => /^records$|listAllRecords/.test(l.col) && !l.id);
    check(`${tag}: no read of all records for a person`, wide.length === 0, wide.map((l) => l.col).join(","));
    const tagReads = first.reads.filter((l) => l.col === "noteTags");
    if (pageKey === "notes") check(`${tag}: no tag reads when the address names no Study Unit (no cards are drawn)`, tagReads.length === 0, `${tagReads.length}`);
    if (pageKey === "notesUnit") {
      const nr = first.reads.find((l) => l.col === "noteSources");
      check(`${tag}: POSITIVE CONTROL the tag read and the notes read were both seen`, tagReads.length > 0 && !!nr, `${tagReads.length} tag reads, noteSources read ${!!nr}`);
      check(`${tag}: the tag reads start beside the notes read, not after it`, !!nr && tagReads.length > 0 && Math.abs(tagReads[0].t0 - nr.t0) <= 50, `tags @${Math.round(tagReads[0]?.t0)} notes @${Math.round(nr?.t0)}`);
    }
    check(`${tag}: JS modules fetched until usable within the budget (${B.modulesToUsable})`, first.modulesToUsable <= B.modulesToUsable, `${first.modulesToUsable}`);
    check(`${tag}: Firestore reads until usable within the budget (${B.readsToUsable})`, first.readsToUsable.length <= B.readsToUsable, `${first.readsToUsable.length}: ${first.readsToUsable.map((l) => l.col + (l.id ? "/" + l.id : "")).join(",")}`);
    check(`${tag}: Firestore reads in all within the budget (${B.readsTotal})`, first.reads.length <= B.readsTotal, `${first.reads.length}`);
    await swInstall(first.t.page);
    say(`  the worker made ${ctx.__sw.length} fetches of its own during the first visit`);
    await first.t.page.close();
    ctx.__sw.length = 0;
    const second = await visit(ctx, pg, "SECOND visit, worker installed");
    print(second, tag, pg);
    const again = second.sameNet.filter((r) => !/\/favicon\.ico$/.test(new URL(r.url).pathname)).map((r) => short(r.url));
    say(`    page fetched from the NETWORK again (same site): ${again.length}${again.length ? " -> " + again.slice(0, 12).join(", ") : ""}`);
    await new Promise((r) => setTimeout(r, 1500));
    const swAgain = ctx.__sw.map((x) => short(x.url));
    say(`    worker's own network fetches (background refresh): ${swAgain.length}${swAgain.length ? " -> " + swAgain.slice(0, 12).join(", ") : ""}`);
    check(`${tag}: POSITIVE CONTROL the second visit is controlled by the worker`, second.nav.controlled);
    check(`${tag}: second visit, files fetched from the network again within the budget (${B.secondVisitNetwork})`, again.length + swAgain.length <= B.secondVisitNetwork, `${again.length + swAgain.length}`);
    await second.t.page.close();
  } finally { await ctx.close().catch(() => {}); }
}

for (const pk of Object.keys(PAGES)) {
  if (PONLY && PONLY !== pk) continue;
  for (const w of WONLY ? [WONLY] : [390, 1280]) for (const who of ["owner", "student"]) {
    if (WHO && WHO !== who) continue;
    try { await scenario(pk, w, who); } catch (e) { check(`${pk} ${w} ${who}: scenario ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); say(String(e.stack || e)); }
  }
}
await browser.close();
server.close(); server.closeAllConnections?.();
say(REPORT ? "\n(report mode: nothing is failed)" : `\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(REPORT || !fail ? 0 : 1);
