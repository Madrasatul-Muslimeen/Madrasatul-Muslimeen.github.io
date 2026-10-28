// Audit part 119 (PCF MSA J29): loading speed with a HEAVY account.
//
// Audit part 91 measured the shared pages with the stub's small default seed. A family that studies daily has hundreds
// of notes and bookmarks. This suite seeds, for the signed-in person p1:
//   600 notes (bodies of 300-1,500 characters, a third Bangla, some with Arabic; filed to folders; 450 linked to an
//   ayah or a hadith), 40 note folders (8 of them nested), 200 bookmarks in 15 bookmark folders, 150 Continue / resume entries.
// and opens notes.html, journey-map.html and bookmarks.html at 390x844 on the slowed phone line of part 91 and at
// 1440x900 unthrottled, in English and in Bangla (stub latency 150 ms). Per page it records:
//   FCP, ready (the later of the last Firestore read and the first 2 quiet frames after it), Firestore reads and documents
//   read (window.__fsLog), every main-thread long task over 50 ms, and the time from a scroll to the next frame over 20
//   steps to the end of the page.
// It also opens quranrevival.html with the same account and records the Notes pane's open time. MEASURE ONLY: frozen page.
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/heavy-account-speed-browser.mjs
//   --page=<file>      one page only        --lang=en|bn   one language only     --profile=phone|desktop
//   --report=<path>    write the rows (JSON)  --verbose  print passes   --no-qr  skip the quranrevival.html measurement
//   --mutate=<name>    bring a removed slow path back (each must FAIL); names are in MUTATIONS below
import { chromium, newContext, BASE } from "./harness.mjs";
import { writeFileSync, mkdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { createServer } from "node:http";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const ONLY = arg("page"), ONLY_LANG = arg("lang"), ONLY_PROFILE = arg("profile"), REPORT = arg("report"), MUTATE = arg("mutate");
const LATENCY = 150;
const FCP_MAX = 3000, READY_MAX = 6000, LONG_TASK_MAX = 200, SCROLL_MAX = 100;
// Reads that fetch "everything for a person" are judged per collection: a single read may return at most 100 documents
// (the deployed Rules' listIsBounded cap) and a page may not issue more than this many reads in all.
const READ_DOC_CAP = 100;

const PAGES = [["Notes", "notes.html?unit=ayah:2:255"], ["Journey map", "journey-map.html"], ["Bookmarks", "bookmarks.html"]];
const PROFILES = [
  { key: "phone", w: 390, h: 844, throttle: true },
  { key: "desktop", w: 1440, h: 900, throttle: false },
];
const LANGS = ["en", "bn"];

// ---- the seed (runs inside the stub, where DATA, TENANT_ID and lang() are in scope) ----
const SEED = `
(function () {
  var TID = "t1", PID = "p1", UID = "test-uid";
  var seedN = 7; function rnd() { seedN = (seedN * 1103515245 + 12345) & 0x7fffffff; return seedN / 0x7fffffff; }
  var EN = "The believer who studies the Book of Allah with care returns to it each day, reflecting on its meanings, comparing one verse with another, and noting what the scholars said about it. ";
  var BN = "যে ব্যক্তি আল্লাহর কিতাব যত্ন সহকারে পড়ে সে প্রতিদিন তার কাছে ফিরে আসে, এর অর্থ নিয়ে চিন্তা করে, এক আয়াতকে অন্য আয়াতের সাথে মিলিয়ে দেখে এবং আলেমগণ কী বলেছেন তা লিখে রাখে। ";
  var AR = "بسم الله الرحمن الرحيم الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين ";
  function body(i) {
    var len = 300 + Math.floor(rnd() * 1200), src = (i % 3 === 0) ? BN : EN, s = "";
    while (s.length < len) s += src;
    s = s.slice(0, len);
    var html = "<p>" + s + "</p>";
    if (i % 7 === 0) html += '<p dir="rtl" lang="ar">' + AR + "</p>";
    return html;
  }
  var notes = [], folders = [], placements = [], sources = [];
  var base = Date.parse("2026-01-01T00:00:00.000Z");
  for (var f = 0; f < 40; f++) {
    var fid = "fold" + f;
    folders.push({ _id: TID + "__" + fid, folderId: fid, tenantId: TID, ownerPersonId: PID, ownerUid: UID,
      name: (f % 3 === 0 ? "ফোল্ডার " : "Folder ") + (f + 1) + " – " + (f % 2 ? "Tafsir of Surah Al-Baqarah, reflections and questions" : "Hadith notes"),
      parentFolderId: f >= 32 ? "fold" + (f - 32) : null, semanticRole: "user", order: f, status: "active",
      createdAt: new Date(base + f * 1000).toISOString(), updatedAt: new Date(base + f * 1000).toISOString() });
  }
  for (var i = 0; i < 600; i++) {
    var nid = "note" + i, rid = "rev" + i, at = new Date(base + (600 - i) * 3600000).toISOString();
    notes.push({ _id: TID + "__" + nid, noteId: nid, tenantId: TID, ownerPersonId: PID, ownerUid: UID, visibility: "private",
      title: (i % 3 === 0 ? "নোট " : "Note ") + (i + 1) + (i % 3 === 0 ? " – আয়াত নিয়ে ভাবনা" : " – reflections on the verse and its context"),
      bodyHtml: body(i), status: "active", currentRevisionId: rid, createdAt: at, updatedAt: at });
    if (i < 540) placements.push({ _id: TID + "__pl" + i, placementId: "pl" + i, tenantId: TID, ownerPersonId: PID, ownerUid: UID,
      noteId: nid, folderId: "fold" + (i % 40), order: i, status: "active", createdAt: at, updatedAt: at });
    if (i < 450) sources.push({ _id: TID + "__src" + i, sourceLinkId: "src" + i, tenantId: TID, ownerPersonId: PID, ownerUid: UID, noteId: nid,
      sourceKind: i % 5 === 0 ? "hadith-unit" : "quran-unit", sourceKey: i % 5 === 0 ? "hadith:bukhari:" + (1 + i) : (i % 3 === 1 ? "ayah:2:255" : "ayah:" + (1 + (i % 114)) + ":" + (1 + (i % 7))),
      relationshipKind: "origin", approachId: null, provenanceKind: "authored", status: "active", createdAt: at, updatedAt: at });
  }
  DATA.notes = notes; DATA.noteFolders = folders; DATA.notePlacements = placements; DATA.noteSources = sources;
  DATA.noteLinks = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = [];

  var bfolders = [], saved = [], resume = {};
  for (var b = 0; b < 15; b++) bfolders.push({ id: "bf" + b, name: "Bookmark folder " + (b + 1) + " – " + (b % 2 ? "Daily recitation" : "Revision of Juz Amma"), parentId: b >= 12 ? "bf" + (b - 12) : null, personTagId: null, removed: false, createdAt: "2026-01-01T00:00:00.000Z" });
  for (var s = 0; s < 200; s++) {
    var sur = 1 + (s % 114), ay = 1 + (s % 6);
    saved.push({ id: "bm" + s, programId: "none", moduleId: "quranrevival", subjectId: "quran", name: (s % 3 === 0 ? "বুকমার্ক " : "Bookmark ") + (s + 1) + " – Surah " + sur + " ayah " + ay + " (with a longer, real-length name)",
      position: "ayah:" + sur + ":" + ay, folderId: "bf" + (s % 15), removed: false,
      settings: { unitType: "ayah", surahNum: sur, ayahNum: ay, trackableId: "tafsir", tajweedOn: true, wbwOn: false, rootsOn: false, mushafOn: false },
      createdAt: new Date(base + s * 60000).toISOString() });
  }
  for (var r = 0; r < 150; r++) resume["quranrevival::none::subject" + r] = { position: "ayah:" + (1 + (r % 114)) + ":1", settings: { unitType: "ayah", surahNum: 1 + (r % 114), ayahNum: 1 }, updatedAt: new Date(base + r * 60000).toISOString() };
  DATA.bookmarks = [{ _id: TID + "__" + PID, tenantId: TID, personId: PID, resume: resume, folders: bfolders, saved: saved }];
})();
`;

// Mutations are filled in as slow paths are fixed (see the report). Each one routes a page file back to its old text.
// A mutation is a text replacement the suite's own gzip server applies to one served file.
const MUTATIONS = {
  // bookmarks.html builds every row's two selects with the full option list again (6,700 nodes, 140-190 ms long task).
  "eager-selects": { file: "bookmarks.html", from: "const LAZY_ROW_SELECTS = true;", to: "const LAZY_ROW_SELECTS = false;" },
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`unknown --mutate=${MUTATE}`);
const MUT = MUTATE ? MUTATIONS[MUTATE] : null;

// Pages sends text files gzip-compressed and serve.js does not, so (as part 94 did for the part 91 suite) the app's files
// are fetched through this suite's own gzip server; the browser still sees the page's own URL.
const ROOT = resolve("."), TEXT = new Set(["html", "js", "mjs", "css", "json", "svg", "txt", "xml"]);
const MIME = { html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8", json: "application/json; charset=utf-8", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", webp: "image/webp", woff2: "font/woff2", ico: "image/x-icon" };
const extOf = (u) => (u.split("?")[0].match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || "";
let gzipPort = 0;
const gzipServer = createServer((req, res) => {
  const u = new URL(req.url, "http://x"), e = extOf(u.pathname);
  const file = join(ROOT, decodeURIComponent(u.pathname));
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end("not found"); }
  let body = readFileSync(file);
  if (MUT && u.pathname === `/app/${MUT.file}`) {
    const text = body.toString();
    if (!text.includes(MUT.from)) { res.writeHead(500); return res.end(`mutation text not found in ${MUT.file}`); }
    body = Buffer.from(text.split(MUT.from).join(MUT.to));
  }
  const headers = { "content-type": MIME[e] || "application/octet-stream", "cache-control": "no-store", "access-control-allow-origin": "*" };
  if (TEXT.has(e)) { headers["content-encoding"] = "gzip"; body = gzipSync(body); }
  res.writeHead(200, headers); res.end(body);
});
await new Promise((ok) => gzipServer.listen(0, "127.0.0.1", () => { gzipPort = gzipServer.address().port; ok(); }));
async function routeGzip(ctx) {
  await ctx.route(`${BASE}/app/**`, (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.endsWith("/js/firebase-init.js")) return route.fallback();
    return route.continue({ url: `http://127.0.0.1:${gzipPort}${u.pathname}${u.search}` });
  });
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const rows = [];

const LONGTASK_INIT = () => {
  window.__long = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push({ s: e.startTime, d: e.duration }); }).observe({ type: "longtask", buffered: true }); } catch {}
};

async function openAndMeasure(path, prof, lang, { scroll = true } = {}) {
  const ctx = await newContext(browser, { banner: false, appLang: lang === "bn" ? "bn" : null, viewport: { width: prof.w, height: prof.h }, latencyMs: LATENCY, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.addInitScript(LONGTASK_INIT);
  await routeGzip(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  if (process.argv.includes("--debug")) { page.on("console", (m) => console.log("   [console]", m.text())); page.on("requestfailed", (r) => console.log("   [failed]", r.url())); }
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (prof.throttle) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await page.goto(`${BASE}/app/${path}${path.includes("?") ? "&" : "?"}navBack=1`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(800);
  const data = await page.evaluate(async () => {
    const paint = performance.getEntriesByType("paint").find((p) => p.name === "first-contentful-paint");
    const log = (window.__fsLog || []).map((r) => ({ kind: r.kind, col: r.col, t0: r.t0, t1: r.t1, docs: r.docs ?? 0 }));
    const lastRead = Math.max(0, ...log.map((r) => r.t1 || 0));
    return { fcp: paint ? paint.startTime : null, log, lastRead, long: window.__long || [], nodes: document.getElementsByTagName("*").length, height: document.documentElement.scrollHeight };
  });
  // Scroll: 20 steps to the end; time from the scroll to the next painted frame.
  let scrollMs = [];
  if (scroll) {
    scrollMs = await page.evaluate(async () => {
      const el = document.scrollingElement || document.documentElement;
      const max = Math.max(0, el.scrollHeight - innerHeight), out = [];
      const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      for (let i = 1; i <= 20; i++) {
        const t = performance.now();
        el.scrollTop = Math.round((max * i) / 20);
        window.dispatchEvent(new Event("scroll"));
        await frame();
        out.push(performance.now() - t);
      }
      return out;
    });
  }
  const longAfter = await page.evaluate(() => window.__long || []);
  await ctx.close();
  const reads = data.log.filter((r) => ["getDoc", "getDocs", "getCount", "txGet"].includes(r.kind));
  const ready = Math.max(data.fcp || 0, data.lastRead);
  const byCol = {};
  for (const r of reads) { const c = String(r.col); byCol[c] = byCol[c] || { reads: 0, docs: 0, maxDocs: 0 }; byCol[c].reads++; byCol[c].docs += r.docs; byCol[c].maxDocs = Math.max(byCol[c].maxDocs, r.docs); }
  const longTasks = longAfter.filter((t) => t.s < ready + 1500).map((t) => t.d);
  return { fcp: data.fcp, ready, reads: reads.length, docs: reads.reduce((a, r) => a + r.docs, 0), byCol, maxLong: Math.max(0, ...longTasks), longTasks: longTasks.length, scrollMax: Math.max(0, ...scrollMs), scrollAvg: scrollMs.length ? scrollMs.reduce((a, b) => a + b, 0) / scrollMs.length : 0, nodes: data.nodes, height: data.height, errors: errors.length };
}

for (const [name, path] of PAGES) {
  if (ONLY && !path.startsWith(ONLY)) continue;
  for (const prof of PROFILES) {
    if (ONLY_PROFILE && ONLY_PROFILE !== prof.key) continue;
    for (const lang of LANGS) {
      if (ONLY_LANG && ONLY_LANG !== lang) continue;
      const m = { name, path, prof: prof.key, lang, ...(await openAndMeasure(path, prof, lang)) };
      rows.push(m);
      const tag = `${name} / ${prof.key} / ${lang}`;
      console.log(`   ${tag.padEnd(34)} FCP ${String(Math.round(m.fcp ?? -1)).padStart(5)}  ready ${String(Math.round(m.ready)).padStart(5)}  reads ${String(m.reads).padStart(3)}  docs ${String(m.docs).padStart(4)}  long ${m.longTasks} (max ${Math.round(m.maxLong)})  scroll max ${Math.round(m.scrollMax)} avg ${Math.round(m.scrollAvg)}  nodes ${m.nodes}`);
      console.log(`      reads by collection: ${Object.entries(m.byCol).map(([c, v]) => `${c} ${v.reads}x/${v.docs}d`).join(", ")}`);
      check(`${tag}: no page error`, m.errors === 0, `${m.errors} page errors`);
      check(`${tag}: FCP was measured`, m.fcp != null);
      check(`${tag}: no read returns more than ${READ_DOC_CAP} documents`, Object.values(m.byCol).every((v) => v.maxDocs <= READ_DOC_CAP), JSON.stringify(m.byCol));
      check(`${tag}: no main-thread long task over ${LONG_TASK_MAX} ms`, m.maxLong <= LONG_TASK_MAX, `${Math.round(m.maxLong)} ms`);
      check(`${tag}: scroll-to-frame <= ${SCROLL_MAX} ms at every step`, m.scrollMax <= SCROLL_MAX, `${Math.round(m.scrollMax)} ms`);
      if (path === "bookmarks.html") check(`${tag}: 200 bookmarks in 15 folders draw in under 4,000 DOM nodes (6,767 with a full option list in every row)`, m.nodes < 4000, `${m.nodes} nodes`);
      if (prof.throttle) {
        check(`${tag}: FCP <= ${FCP_MAX} ms`, m.fcp != null && m.fcp <= FCP_MAX, `${Math.round(m.fcp)} ms`);
        check(`${tag}: ready <= ${READY_MAX} ms`, m.ready <= READY_MAX, `${Math.round(m.ready)} ms`);
      }
    }
  }
}

// bookmarks.html: a lazy select must still work. Reaching for it fills the full list and keeps the chosen value.
if (!ONLY || "bookmarks.html".startsWith(ONLY)) {
  const ctx = await newContext(browser, { banner: false, viewport: { width: 1440, height: 900 }, latencyMs: 0, extraSeedJs: SEED });
  await routeGzip(ctx);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app/bookmarks.html?navBack=1`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("[data-bm-move]");
  const before = await page.evaluate(() => { const s = document.querySelector("[data-bm-move]"); return { n: s.options.length, v: s.value }; });
  await page.locator("[data-bm-move]").first().focus();
  const after = await page.evaluate(() => { const s = document.querySelector("[data-bm-move]"); return { n: s.options.length, v: s.value }; });
  check("bookmarks: a row's Move select opens with every folder (16) and keeps its chosen folder", after.n === 16 && after.v === before.v && before.v !== "", JSON.stringify({ before, after }));
  const person = await page.evaluate(() => { const s = document.querySelector("[data-bm-person]"); s.dispatchEvent(new Event("pointerdown", { bubbles: true })); return s.options.length; });
  check("bookmarks: a row's For select lists the whole roster after a touch", person >= 2, `${person} options`);
  await ctx.close();
}

// quranrevival.html: the Notes pane's open time beside the Read view. Measure only; nothing is asserted on that frozen page.
const qr = { opened: null, note: "not measured" };
if (!process.argv.includes("--no-qr") && (!ONLY || "quranrevival.html".startsWith(ONLY))) {
  const ctx = await newContext(browser, { banner: false, viewport: { width: 1440, height: 900 }, latencyMs: LATENCY, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.addInitScript(LONGTASK_INIT);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app/quranrevival.html?navBack=1`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(800);
  const t0 = Date.now();
  const clicked = await page.evaluate(() => {
    const el = document.querySelector("[data-note-master-toggle], #readNotesBtn, [data-read-notes-toggle], #notePaneToggle");
    if (el) { el.click(); return el.id || el.getAttribute("data-note-master-toggle") || "toggle"; }
    return null;
  });
  if (clicked) {
    await page.waitForFunction(() => document.querySelector("#readNotePane, .read-note-pane, [data-read-note-pane]"), null, { timeout: 15000 }).catch(() => {});
    qr.opened = Date.now() - t0; qr.note = `via ${clicked}`;
  } else qr.note = "no Notes-pane toggle found by the suite's selectors";
  const reads = await page.evaluate(() => (window.__fsLog || []).filter((r) => r.col === "notes" || r.col === "notePlacements" || r.col === "noteSources").map((r) => `${r.kind} ${r.col} ${r.docs ?? 0}d`));
  qr.reads = reads;
  console.log(`   quranrevival.html Notes pane (desktop, en, MEASURE ONLY): open ${qr.opened ?? "n/a"} ms (${qr.note}); note reads: ${reads.length}`);
  await ctx.close();
}

if (REPORT) { mkdirSync(dirname(REPORT), { recursive: true }); writeFileSync(REPORT, JSON.stringify({ rows, qr }, null, 1)); }
await browser.close();
gzipServer.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
