// Audit part 46 (PCF MSA J29): QuranRevival as a STUDENT meets it on a real phone BEFORE and AROUND the study:
// a first visit on a fresh device, a slow line, going offline, an app update, and the return from sign-in.
// Runs against the built QR (node tools/apps/build-app.mjs qr), serving it itself.
//   node tools/apps/qr-verify/student-device-browser.mjs     (own server on PORT, default 8108)
//   --only=first|slow|offline|update|signin   --lang=en|bn   --width=360|390|768|1280   --mutate=<name>
//   SHOTS=<dir> saves screenshots at 390 and 1280.   REPORT=1 prints every measurement and never fails on it.
// Detectors (each has a positive control that injects an offender and must see it): sideways, covered, small, english.
// Fix mutations (MUTATIONS below): each restores the old code of one fix and its check must FAIL.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
import "./_root.mjs"; // runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { routeMmsaHadith, MMSA_HADITH } from "./mmsa-hadith-route.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const MUTATE = arg("mutate") ?? null;
const ONLY = arg("only") ?? null, LANG = arg("lang") ?? null, WIDTH = arg("width") ?? null;
const REPORT = !!process.env.REPORT || process.argv.includes("--report");
const PORT = Number(process.env.PORT) || 8108;
const SHOTS = arg("shots") ?? process.env.SHOTS ?? null;
const ROOT = process.cwd();
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };

/** name -> [file inside the built app, edit]. Filled in as fixes land. */
const MUTATIONS = {
  // Fix 1 (app/js/quran-data.js): a surah this device never kept, opened offline, says so in words. Old code: an uncaught "Failed to fetch" and nothing on screen.
  // Fix 2 (app/js/sw-register.js): the "Updated — tap to reload" notice is 40px or more tall and one line. Old code: 35px at 768+, a two-line pill on a phone.
  noticeheight: ["app/js/sw-register.js", (t) => t.replace('minHeight: "44px",', "")],
  noticewidth: ["app/js/sw-register.js", (t) => t.replace('width: "max-content",', "")],
  surahoffline: ["app/js/quran-data.js", (t) => t.replace("if (err instanceof TypeError) announceSurahUnavailable(surahNumber);", "")],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`Unknown mutation "${MUTATE}"`);
const overrides = new Map();
if (MUTATE) {
  const [p, edit] = MUTATIONS[MUTATE];
  const src = fs.readFileSync(path.join(ROOT, p), "utf8");
  if (edit(src) === src) throw new Error(`mutation ${MUTATE} did not apply`);
  overrides.set("/" + p, edit);
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
const base = `http://localhost:${PORT}`;
process.env.QR_BASE = base;
const { chromium, newContext } = await import("../../i18n-verify/harness.mjs");
const { stubFor } = await import("../../i18n-verify/firebase-stub.mjs");

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; if (!silent) console.log(`  PASS  ${name}`); } else { fail++; failures.push(name); if (!silent) console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
let silent = false;
const note = (s) => { if (REPORT) console.log(`  [measured] ${s}`); };
/** Every wait names itself: a timeout fails THAT check, by name, and the run goes on. */
async function waitFor(label, fn, ms = 20000) {
  try { return await fn(ms); } catch (e) { check(`${label}: finished in time`, false, `timed out after ${ms}ms: ${String(e.message).split("\n")[0]}`); return null; }
}
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const NOISE = /ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com|Failed to load resource|ERR_(NAME_NOT_RESOLVED|CONNECTION|INTERNET|TUNNEL|FAILED)|net::ERR_FAILED/;
const STUDENT_SEED = `DATA.tenantMemberUids[0].roles = ["student"]; DATA.tenantPeople[0].roles = ["student"];`;
const WIDTHS = [[360, 740], [390, 844], [768, 1024], [1280, 720]];
const LANGS = ["en", "bn"];
const want = (area, lang, w) => (!ONLY || area.startsWith(ONLY)) && (!LANG || LANG === lang) && (!WIDTH || Number(WIDTH) === w);

async function ctxFor(browser, { lang, width, height, latencyMs = 0, theme = "night", sw = false }) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height }, latencyMs, extraSeedJs: STUDENT_SEED, allowServiceWorker: sw });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("**/api.quran.com/**", (r) => r.abort());
  await routeMmsaHadith(ctx);
  await ctx.addInitScript((t) => { try { if (!localStorage.getItem("mm_card_look")) localStorage.setItem("mm_card_look", t); } catch {} }, theme);
  return ctx;
}
function watch(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !NOISE.test(m.text())) errors.push("console: " + m.text()); });
  return errors;
}

// ---- detectors (run INSIDE the page so a positive control can call the same code on an injected offender) ----
const DETECTORS = `
window.__sd = {
  sideways: () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  visible: (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[hidden]") && !el.disabled && !(el.closest("details:not([open])") && !el.closest("summary")); },
  small: (root) => [...(root || document).querySelectorAll("button, select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), [role=button]")]
    .filter((el) => window.__sd.visible(el) && el.getBoundingClientRect().height < 40)
    .filter((el) => { const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      // Scrolled out of view inside a scrolling panel: scrolling reaches it, as covered() already says (the MSA-QR-LEAD,
      // 23 Oct: #ayahPanels is 90px tall at 360x740 and the āyah number sat below it, so its tap test hit #studyScreen).
      if (window.__sd.clipped(el, cx, cy)) return false;
      const hits = (y) => { if (y < 0 || y > innerHeight || cx < 0 || cx > innerWidth) return true; /* off the screen edge: scrolling reaches it, not a defect */ const h = document.elementFromPoint(cx, y); return !!h && (h === el || el.contains(h)); };
      return !(hits(cy - 19) && hits(cy + 19)); })
    .map((el) => (el.id || el.className || el.tagName) + ":" + Math.round(el.getBoundingClientRect().height)),
  clipped: (el, x, y) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(o.overflowY + o.overflowX)) { const r = p.getBoundingClientRect(); if (x < r.left || x > r.right || y < r.top || y > r.bottom) return true; } } return false; },
  covered: (root) => [...(root || document).querySelectorAll("button, a[href], select")]
    .filter((el) => window.__sd.visible(el))
    .filter((el) => { const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight || window.__sd.clipped(el, x, y)) return false; const hit = document.elementFromPoint(x, y); if (!hit || hit === el || el.contains(hit) || hit.contains(el)) return false; for (let p = hit; p && p !== document.body; p = p.parentElement) if (/fixed|sticky/.test(getComputedStyle(p).position) && root === undefined) return false; return true; })
    .map((el) => el.id || el.textContent.trim().slice(0, 20)),
  english: () => {
    const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      const p = n.parentElement; if (!p || /SCRIPT|STYLE|NOSCRIPT|OPTION/.test(p.tagName) || p.closest("[data-sd-skip], [data-i18n-skip], #ayahPanels, [lang=ar], [lang=en], .arabic, .ar, [dir=rtl]") || !window.__sd.visible(p)) continue;
      const t = n.textContent.trim(); if (!t) continue;
      if (!/[\\u0980-\\u09FF]/.test(t) && /\\b[a-z]{3,}\\b(\\s+\\b[a-z]{2,}\\b){1,}/.test(t)) out.push(t.slice(0, 40));
    }
    return out;
  },
  // WCAG contrast of an element's text colour against the first opaque background up its ancestors
  contrast: (el) => {
    const parse = (c) => { const m = c.match(/[\\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 1]; };
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const fg = parse(getComputedStyle(el).color); let bg = [255, 255, 255, 1];
    for (let p = el; p; p = p.parentElement) { const c = parse(getComputedStyle(p).backgroundColor); if (c.length >= 3 && (c[3] ?? 1) >= 0.95) { bg = c; break; } }
    const a = lum(fg) + 0.05, b = lum(bg) + 0.05; return Math.max(a, b) / Math.min(a, b);
  },
};`;
/** The standard "nothing wrong on this state" measurements. */
async function measure(page) {
  await page.evaluate(DETECTORS);
  return page.evaluate(() => ({ sideways: window.__sd.sideways(), small: window.__sd.small(), covered: window.__sd.covered(), english: window.__sd.english() }));
}
// Findings in QR-only files (app/quranrevival.html), which belong to the MSA-QR-LEAD: listed, not failed, and the
// run says so when a listed id STOPS occurring (a fixed finding must leave this list).
//   ayah-num-badge: the Read view's āyah number button is 24px with a 40px ::after tap area, but its top 8px lies
//   outside the panel (`.ayah-num-row` margin 0.3rem), so a tap there lands on #studyScreen. Smallest fix: margin-top 0.5rem.
const FOR_QR_LEAD = []; // QR Lead PR: "ayah-num-badge" fixed (.ayah-num-row margin-top 0.5rem) and removed
const seenKnown = new Set();
function judge(tag, m, lang) {
  check(`${tag}: no sideways scroll`, m.sideways <= 0, `${m.sideways}px`);
  check(`${tag}: nothing under another control`, m.covered.length === 0, m.covered.slice(0, 6).join(", "));
  const known = m.small.filter((x) => FOR_QR_LEAD.some((k) => x.startsWith(k + ":")));
  known.forEach((x) => seenKnown.add(x.split(":")[0]));
  if (known.length) console.log(`  KNOWN (for the QR Lead, app/quranrevival.html) ${tag}: ${[...new Set(known)].join(", ")}`);
  check(`${tag}: finger controls at least 40px tall`, m.small.length === known.length, m.small.filter((x) => !known.includes(x)).slice(0, 8).join(", "));
  if (lang === "bn") check(`${tag}: no English prose on the Bangla page`, m.english.length === 0, m.english.slice(0, 6).join(" | "));
}
const shot = async (page, name, w) => { if (SHOTS && (w === 390 || w === 1280)) await page.screenshot({ path: `${SHOTS}/${name}-${w}.png` }); };

// ---------------------------------------------------------------- 1. first visit on a fresh device
async function firstVisit(browser, lang, [w, h], latencyMs) {
  const tag = `first-visit ${w}x${h} ${lang} latency ${latencyMs}`;
  const ctx = await ctxFor(browser, { lang, width: w, height: h, latencyMs, theme: w === 390 ? "night" : "light" });
  const page = await ctx.newPage();
  const errors = watch(page);
  page.setDefaultTimeout(30000);
  const early = []; // data files requested before first paint would break the load-speed contract (Architecture Part 8)
  page.on("request", (r) => { if (/\/tools\/(quran|hadith)-data-pull\/output\//.test(r.url())) early.push({ url: r.url().split("/output/")[1], at: Date.now() }); });
  const t0 = Date.now();
  await page.goto(`${base}/`, { waitUntil: "commit" });
  // the front page, then the study page: a student's first tap
  await page.waitForLoadState("domcontentloaded");
  const frontWords = await page.evaluate(() => document.body.innerText.trim().length);
  check(`${tag}: the front page shows words, not a blank screen`, frontWords > 20, `${frontWords} chars`);
  await page.waitForLoadState("load");
  // headless Chromium sometimes reports no first-contentful-paint entry: the page's own DOMContentLoaded time stands in
  const fcpFront = await page.evaluate(() => performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? performance.getEntriesByType("navigation")[0]?.domContentLoadedEventEnd ?? -1);
  note(`${tag}: front page first contentful paint ${Math.round(fcpFront)}ms, load ${Date.now() - t0}ms`);
  check(`${tag}: front page paints (first contentful paint ${Math.round(fcpFront)}ms)`, fcpFront > 0 && fcpFront < 4000, `${fcpFront}`);
  await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "commit" });
  const t1 = Date.now();
  await page.waitForLoadState("domcontentloaded");
  const words = await page.evaluate(() => document.body.innerText.trim().length);
  check(`${tag}: Quran Study shows words at once (${words} chars), not a blank screen`, words > 20, `${words}`);
  await page.waitForLoadState("load");
  const fcp = await page.evaluate(() => performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? performance.getEntriesByType("navigation")[0]?.domContentLoadedEventEnd ?? -1);
  const beforePaint = early.filter((e) => e.at - t1 < fcp);
  check(`${tag}: no Qur'an/Hadith data file was fetched before first paint (${beforePaint.length})`, beforePaint.length === 0, beforePaint.map((e) => e.url).join(", "));
  const usable = await waitFor(`${tag}: usable Home with a Language choice`, () => page.evaluate(() => { document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()); }).then(() => page.waitForSelector("details.nav-cat-home", { state: "attached" })));
  if (usable) {
    await page.evaluate(() => { document.querySelector("details.nav-cat-home").open = true; });
    const sel = await waitFor(`${tag}: Language box`, () => page.waitForSelector("#navAppLangSelect", { state: "visible" }));
    const tUsable = Date.now() - t1;
    note(`${tag}: Quran Study fcp ${Math.round(fcp)}ms, usable Home ${tUsable}ms`);
    check(`${tag}: usable Home with Language within ${latencyMs ? 15 : 8}s (${tUsable}ms; first paint ${Math.round(fcp)}ms)`, !!sel && tUsable < (latencyMs ? 15000 : 8000), `${tUsable}`);
    if (sel) {
      const other = lang === "en" ? "bn" : "en";
      const hb0 = await page.evaluate(() => document.querySelector("details.nav-cat-home > summary")?.textContent ?? "");
      await Promise.all([page.waitForLoadState("load").catch(() => {}), page.selectOption("#navAppLangSelect", other)]);
      await page.waitForFunction((b) => (document.querySelector("details.nav-cat-home > summary")?.textContent ?? b) !== b, hb0, { timeout: 20000 }).catch(() => {});
      const hb1 = await page.evaluate(() => document.querySelector("details.nav-cat-home > summary")?.textContent ?? "");
      check(`${tag}: the Language choice changes the page's words (${hb0.trim()} -> ${hb1.trim()})`, hb1 !== hb0);
      await page.selectOption("#navAppLangSelect", lang).catch(() => {});
      await page.waitForFunction((b) => (document.querySelector("details.nav-cat-home > summary")?.textContent ?? "") === b, hb0, { timeout: 20000 }).catch(() => {});
    }
    await settle(page, 1200);
    await page.evaluate(() => { const d = document.querySelector("details.nav-cat-home"); if (d) d.open = false; });
    judge(tag, await measure(page), lang);
    if (latencyMs === 0) await shot(page, `first-visit-${lang}`, w);
  }
  check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 4).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------- 2. slow line (data files answer after 3 s)
const DATA_GLOB = ["**/tools/quran-data-pull/output/**", "**/tools/hadith-data-pull/output/**"];
async function slowLine(browser, lang, [w, h]) {
  const ctx = await ctxFor(browser, { lang, width: w, height: h, theme: w === 390 ? "night" : "light" });
  for (const g of DATA_GLOB) await ctx.route(g, async (r) => { await new Promise((x) => setTimeout(x, 3000)); r.fallback(); });
  const page = await ctx.newPage();
  const errors = watch(page);
  page.setDefaultTimeout(30000);
  // Asma ul Husna and LDOG: words while loading (at ~1 s), nothing cut, and the content after 3 s
  for (const [name, p] of [["asma", "/app/asma.html"], ["ldog", "/app/ldog-study.html"]]) {
    const tag = `slow-line ${name} ${w}x${h} ${lang}`;
    await page.goto(`${base}${p}`, { waitUntil: "commit" });
    await page.waitForLoadState("domcontentloaded");
    await settle(page, 1000);
    const mid = await page.evaluate(() => document.body.innerText.trim());
    check(`${tag}: while the data is on its way the page says something in words (${mid.length} chars)`, mid.length > 20, mid.slice(0, 60));
    judge(`${tag} (loading)`, await measure(page), lang);
    await settle(page, 4500);
    const after = await page.evaluate(() => document.body.innerText.trim().length);
    check(`${tag}: after the data arrives there is more to read (${mid.length} -> ${after})`, after > mid.length || after > 200);
    judge(`${tag} (loaded)`, await measure(page), lang);
    await shot(page, `slow-${name}-${lang}`, w);
  }
  // Read a surah
  {
    const tag = `slow-line read ${w}x${h} ${lang}`;
    await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" });
    await settle(page, 2500);
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    const opened = await waitFor(`${tag}: Read`, async () => {
      if (!(await page.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await settle(page, 200); }
      await page.click("#tabReadBtn");
      return true;
    });
    if (opened) {
      await settle(page, 1000);
      const mid = await page.evaluate(() => ({ read: !document.getElementById("readView").hidden, text: document.getElementById("ayahPanels").textContent.trim().length, all: document.body.innerText.trim().length }));
      note(`${tag}: at 1 s of a 3 s delay: ${JSON.stringify(mid)}`);
      // KNOWN, for the QR Lead (app/quranrevival.html): the Read view is an empty box, with no loading words, until the surah arrives.
      const readWords = await page.evaluate(() => /loading|লোড/i.test(document.getElementById("readView").innerText));
      if (!readWords) console.log(`  KNOWN (for the QR Lead, app/quranrevival.html) ${tag}: the Read view is an empty box at 1 s of a 3 s delay (no loading words)`);
      check(`${tag}: while the surah loads the page still shows words (${mid.all} chars)`, mid.all > 20);
      judge(`${tag} (loading)`, await measure(page), lang);
      const ok = await waitFor(`${tag}: the āyahs appear`, () => page.waitForFunction(() => document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 15000 }));
      check(`${tag}: the āyahs appear after the delay`, !!ok);
      await settle(page, 500);
      judge(`${tag} (loaded)`, await measure(page), lang);
      await shot(page, `slow-read-${lang}`, w);
    }
  }
  check(`slow-line ${w}x${h} ${lang}: no page errors`, errors.length === 0, errors.slice(0, 4).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------- 3. offline after one visit
async function offline(browser, lang, [w, h]) {
  const tag = `offline ${w}x${h} ${lang}`;
  const ctx = await ctxFor(browser, { lang, width: w, height: h, sw: true, theme: w === 390 ? "night" : "light" });
  const page = await ctx.newPage();
  const errors = watch(page);
  page.setDefaultTimeout(30000);
  await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" });
  await waitFor(`${tag}: the worker takes over`, () => page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 60000 }));
  await page.reload({ waitUntil: "load" });
  await settle(page, 1500);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  // read surah 1 online (kept on first use)
  await page.evaluate(() => document.getElementById("tabReadBtn")?.click());
  await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 20000 }).catch(() => {});
  for (const p of ["/app/asma.html", "/app/journey-map.html", "/"]) { await page.goto(`${base}${p}`, { waitUntil: "load" }); await settle(page, 1500); }
  await settle(page, 1500);
  await ctx.setOffline(true);
  await stopServer();
  const gone = [];
  for (const [name, p, expect] of [["front", "/app/index.html", null], ["asma", "/app/asma.html", null], ["journey-map", "/app/journey-map.html", null], ["read", "/app/quranrevival.html", "read"]]) {
    const t = `${tag} ${name}`;
    await page.goto(`${base}${p}`, { waitUntil: "load" }).catch(() => {});
    await settle(page, 2500);
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    if (expect === "read") {
      await page.evaluate(() => document.getElementById("tabReadBtn")?.click());
      await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 15000 }).catch(() => {});
    }
    const o = await page.evaluate(() => ({ text: document.body.innerText.trim().length, title: document.title, read: document.getElementById("ayahPanels")?.textContent.trim().length ?? 0 }));
    check(`${t}: opens offline and shows words (${o.text} chars)`, o.text > 40, JSON.stringify(o));
    if (expect === "read") check(`${t}: a surah already read opens offline`, o.read > 20, JSON.stringify(o));
    judge(t, await measure(page), lang);
    await shot(page, `offline-${name}-${lang}`, w);
  }
  // a surah never read: it must SAY it is not available offline, in the page's language (I15)
  {
    const t = `${tag} unread surah`;
    await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" }).catch(() => {});
    await settle(page, 2000);
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await page.evaluate(() => document.getElementById("tabReadBtn")?.click());
    await settle(page, 800);
    const errsBefore = errors.length;
    await page.evaluate(() => { const s = document.getElementById("readSurahSelect"); if (s) { s.value = "77"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
    await settle(page, 2500);
    await page.evaluate(DETECTORS);
    const o = await page.evaluate(() => { const n = document.getElementById("surahOfflineNotice"); const r = n?.getBoundingClientRect(); const hit = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
      return { panels: document.getElementById("ayahPanels")?.innerText.slice(0, 200) ?? "", note: n?.textContent ?? "", h: r ? Math.round(r.height) : 0, inView: !!r && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, hit: !!hit && (hit === n || n.contains(hit)), contrast: n ? Math.round(window.__sd.contrast(n) * 100) / 100 : 0 }; });
    note(`${t}: ${JSON.stringify(o).slice(0, 300)}`);
    check(`${t}: says in words that the surah is not saved and the internet is needed`, /internet|ইন্টারনেট/.test(o.note), `panels: ${o.panels.replace(/\s+/g, " ").slice(0, 80)}`);
    check(`${t}: the note is on screen, not covered, 40px or more (${o.h}px) and readable (${o.contrast}:1)`, o.inView && o.hit && o.h >= 40 && o.contrast >= 4.5, JSON.stringify(o).slice(0, 200));
    if (lang === "bn") check(`${t}: and the note is in Bangla`, /[ঀ-৿]/.test(o.note), o.note);
    await shot(page, `offline-unread-${lang}`, w);
    // KNOWN, for the QR Lead (app/quranrevival.html loadSurah): the rejection is not caught there, and the old surah's words stay under the new name.
    const fresh = errors.slice(errsBefore);
    const known = fresh.filter((m) => /Failed to fetch/.test(m));
    console.log(`  KNOWN (for the QR Lead, app/quranrevival.html loadSurah) ${t}: ${known.length} uncaught "Failed to fetch"; the Read view still shows "${o.panels.replace(/\s+/g, " ").slice(0, 40)}" under surah 77`);
    errors.splice(errsBefore, fresh.length, ...fresh.filter((m) => !/Failed to fetch/.test(m)));
  }
  // KNOWN, for the QR Lead (apps/qr): the site address "/" is outside the worker's scope (/app/), so offline it is the browser's own error page.
  {
    const t = `${tag} site address /`;
    await page.goto(`${base}/`, { waitUntil: "load" }).catch(() => {});
    await settle(page, 800);
    const words = await page.evaluate(() => document.body?.innerText.trim().length ?? 0).catch(() => 0);
    console.log(`  KNOWN (for the QR Lead, apps/qr) ${t}: ${words} chars of words offline`);
  }
  check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 4).join(" | "));
  await ctx.setOffline(false);
  await startServer();
  await ctx.close();
}

// ---------------------------------------------------------------- 4. an update
async function update(browser, lang, [w, h]) {
  const tag = `update ${w}x${h} ${lang}`;
  const V1 = fs.readFileSync("app/js/qr-version.js", "utf8").match(/APP_VERSION = "([\d.]+)"/)[1];
  const V2 = (Number(V1) + 0.01).toFixed(2).padStart(5, "0");
  const swKey = "/app/sw.js", verKey = "/app/js/qr-version.js", pageVerKey = "/app/js/version.js";
  const ctx = await ctxFor(browser, { lang, width: w, height: h, sw: true, theme: w === 390 ? "night" : "light" });
  const page = await ctx.newPage();
  const errors = watch(page);
  page.setDefaultTimeout(30000);
  await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" });
  await waitFor(`${tag}: the worker takes over`, () => page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 60000 }));
  await page.reload({ waitUntil: "load" });
  await settle(page, 1500);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  // the student's place: Read, surah 2, āyah 255
  await page.evaluate(() => document.getElementById("tabReadBtn")?.click());
  await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => { const s = document.getElementById("readSurahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await settle(page, 1500);
  await page.evaluate(() => { const s = document.getElementById("readAyahSelect"); if (s) { s.value = "255"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await settle(page, 1200);
  const place0 = await page.evaluate(() => [document.getElementById("readSurahSelect")?.value, document.getElementById("readAyahSelect")?.value].join(":"));
  const sv = overrides.get(verKey), sw0 = overrides.get(swKey);
  overrides.set(verKey, (t) => (sv ? sv(t) : String(t)).replace(`APP_VERSION = "${V1}"`, `APP_VERSION = "${V2}"`));
  overrides.set(swKey, (t) => (sw0 ? sw0(t) : String(t)).replace(`const APP_VERSION = "${V1}";`, `const APP_VERSION = "${V2}";`));
  const pv0 = overrides.get(pageVerKey); // the page prints MSA's version.js (the build copies it to qr-version.js)
  overrides.set(pageVerKey, (t) => (pv0 ? pv0(t) : String(t)).replace(`APP_VERSION = "${V1}"`, `APP_VERSION = "${V2}"`));
  await page.reload({ waitUntil: "load" });
  const shown = await page.waitForSelector("#swUpdateNotice", { timeout: 60000 }).then(() => true).catch(() => false);
  check(`${tag}: the student is told in words that a new version is ready`, shown);
  if (shown) {
    await page.evaluate(DETECTORS);
    const n = await page.evaluate(() => { const el = document.getElementById("swUpdateNotice"); const r = el.getBoundingClientRect(); const fs = parseFloat(getComputedStyle(el).fontSize); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { text: el.textContent.trim(), h: Math.round(r.height), w: Math.round(r.width), fs, contrast: Math.round(window.__sd.contrast(el) * 100) / 100, hit: !!hit && (hit === el || el.contains(hit)), inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth }; });
    note(`${tag}: notice ${JSON.stringify(n)}`);
    check(`${tag}: the notice is a finger control (40px or more; ${n.h}px)`, n.h >= 40, JSON.stringify(n));
    check(`${tag}: the notice is one line, not squeezed into a two-line pill (${n.h}px, ${n.w}px wide)`, n.h <= 48, JSON.stringify(n));
    check(`${tag}: the notice is on screen and nothing covers it`, n.inView && n.hit, JSON.stringify(n));
    check(`${tag}: the notice text is readable (contrast ${n.contrast}:1, ${n.fs}px)`, n.contrast >= 4.5 && n.fs >= 14, JSON.stringify(n));
    if (lang === "bn") check(`${tag}: the notice is in Bangla`, /[ঀ-৿]/.test(n.text), n.text);
    await shot(page, `update-${lang}`, w);
    await Promise.all([page.waitForEvent("load", { timeout: 60000 }), page.click("#swUpdateNotice")]);
    await settle(page, 2500);
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    const ver = await page.locator("#appVersion").innerText().catch(() => "");
    check(`${tag}: after the tap the new version runs (${ver})`, ver.includes(V2), ver);
    await page.evaluate(() => document.getElementById("tabReadBtn")?.click());
    await page.waitForFunction(() => !document.getElementById("readView").hidden, null, { timeout: 15000 }).catch(() => {});
    await settle(page, 1500);
    const place1 = await page.evaluate(() => [document.getElementById("readSurahSelect")?.value, document.getElementById("readAyahSelect")?.value].join(":"));
    check(`${tag}: the student keeps their place (${place0} -> ${place1})`, place1 === place0 && place0.startsWith("2:"));
    judge(`${tag} (after)`, await measure(page), lang);
  }
  check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 4).join(" | "));
  if (sv) overrides.set(verKey, sv); else overrides.delete(verKey);
  if (sw0) overrides.set(swKey, sw0); else overrides.delete(swKey);
  if (pv0) overrides.set(pageVerKey, pv0); else overrides.delete(pageVerKey);
  await ctx.close();
}

// ---------------------------------------------------------------- 5. sign-in return
async function signIn(browser, lang, [w, h]) {
  const tag = `sign-in-return ${w}x${h} ${lang}`;
  const ctx = await ctxFor(browser, { lang, width: w, height: h, theme: w === 390 ? "night" : "light" });
  let stub = stubFor({ banner: true, extraSeedJs: STUDENT_SEED });
  const a = "export function onAuthStateChanged(auth, cb) { setTimeout(() => cb({ uid: UID, email: \"smahk9@gmail.com\", displayName: \"Owner\" }), 0); return () => {}; }";
  const b = "export function signInWithPopup() { return Promise.resolve(); }";
  if (!stub.includes(a) || !stub.includes(b)) throw new Error("stub auth functions changed: the sign-in return suite needs updating");
  stub = stub.replace(a, "export function onAuthStateChanged(auth, cb) { (window.__authCbs ||= []).push(cb); setTimeout(() => cb({ uid: UID, email: \"smahk9@gmail.com\", displayName: \"Owner\" }), 0); return () => {}; }")
    .replace(b, "export function signInWithPopup() { (window.__authCbs || []).forEach((cb) => cb({ uid: UID, email: \"smahk9@gmail.com\", displayName: \"Owner\" })); return Promise.resolve(); }");
  await ctx.route("https://www.gstatic.com/firebasejs/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: stub }));
  const page = await ctx.newPage();
  const errors = watch(page);
  page.setDefaultTimeout(30000);
  await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" });
  await settle(page, 2000);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.evaluate(() => document.getElementById("tabReadBtn")?.click());
  await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => { const s = document.getElementById("readSurahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await settle(page, 1500);
  await page.evaluate(() => { const s = document.getElementById("readAyahSelect"); if (s) { s.value = "255"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await settle(page, 1200);
  const place = () => page.evaluate(() => [document.getElementById("readSurahSelect")?.value, document.getElementById("readAyahSelect")?.value, !document.getElementById("readView")?.hidden].join(":"));
  const p0 = await place();
  check(`${tag}: set up on Read 2:255 (${p0})`, p0 === "2:255:true");
  // the session ends (token expiry): the student is signed out on the same page
  await page.evaluate(() => (window.__authCbs || []).forEach((cb) => cb(null)));
  await settle(page, 1500);
  const out = await page.evaluate(() => { const b = document.getElementById("bootStatusSignIn"); const r = b?.getBoundingClientRect(); return { btn: !!b && !b.hidden && r.width > 0, h: r ? Math.round(r.height) : 0, text: document.getElementById("bootStatusText")?.textContent ?? "" }; });
  check(`${tag}: signed out, the page says so in words and offers Sign in`, out.btn && out.text.length > 5, JSON.stringify(out));
  check(`${tag}: the Sign in button is a finger control (${out.h}px)`, out.h >= 40, JSON.stringify(out));
  if (lang === "bn") check(`${tag}: the signed-out words are Bangla`, /[ঀ-৿]/.test(out.text), out.text);
  judge(`${tag} (signed out)`, await measure(page), lang);
  await shot(page, `signin-out-${lang}`, w);
  await page.click("#bootStatusSignIn");
  await settle(page, 4000);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  const p1 = await place();
  check(`${tag}: after signing in the student is back on Read 2:255 (${p0} -> ${p1})`, p1 === p0, p1);
  judge(`${tag} (back)`, await measure(page), lang);
  check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 4).join(" | "));
  await ctx.close();
}

const browser = await chromium.launch();
try {
  // Positive controls first: each detector must see an offender injected into a page, or its silence means nothing.
  {
    const ctx = await ctxFor(browser, { lang: "bn", width: 390, height: 844 });
    const page = await ctx.newPage();
    await page.goto(`${base}/app/ldog-study.html`, { waitUntil: "load" });
    await page.evaluate(DETECTORS);
    await page.waitForTimeout(500);
    const pc = await page.evaluate(() => {
      const d = document.createElement("div");
      d.innerHTML = '<button id="sdSmall" style="height:20px;position:fixed;left:5px;top:5px;z-index:1">x</button>'
        + '<button id="sdUnder" style="width:80px;height:50px;position:fixed;left:100px;top:100px;z-index:1">under</button><div style="position:fixed;left:90px;top:90px;width:120px;height:80px;z-index:9;background:red"></div>'
        + '<p id="sdEn">This sentence is plain English prose</p>'
        + '<p id="sdLow" style="color:#777;background:#888">low</p>'
        + '<div id="sdWide" style="position:absolute;left:0;top:0;width:' + (innerWidth + 300) + 'px;height:5px"></div>'
        + '<div style="position:fixed;left:5px;top:300px;width:100px;height:60px;overflow:auto;z-index:1"><div style="height:200px"></div><button id="sdScrolled" style="height:20px">y</button></div>';
      document.body.append(d);
      return { smallIds: window.__sd.small(d), small: window.__sd.small(d).length, covered: window.__sd.covered(d).length, english: window.__sd.english().length, sideways: window.__sd.sideways(), low: window.__sd.contrast(document.getElementById("sdLow")) };
    });
    check("POSITIVE CONTROL small: an injected 20px button is found", pc.small >= 1, JSON.stringify(pc));
    check("small: a 20px button scrolled out of view inside a scrolling panel is NOT counted (scrolling reaches it)", !pc.smallIds.some((x) => x.startsWith("sdScrolled:")) && pc.smallIds.some((x) => x.startsWith("sdSmall:")), JSON.stringify(pc.smallIds));
    check("POSITIVE CONTROL covered: an injected button under an overlay is found", pc.covered >= 1, JSON.stringify(pc));
    check("POSITIVE CONTROL english: English prose on a Bangla page is found", pc.english >= 1, JSON.stringify(pc));
    check("POSITIVE CONTROL sideways: an injected over-wide block is found", pc.sideways > 0, JSON.stringify(pc));
    check("POSITIVE CONTROL contrast: grey on grey measures under 4.5:1", pc.low < 4.5, JSON.stringify(pc));
    const bad = new Promise((_, rej) => setTimeout(() => rej(new Error("boom")), 10));
    let threw = false; try { check("x", bad); } catch { threw = true; } bad.catch(() => {});
    check("POSITIVE CONTROL check(): a promise is refused", threw);
    const before = fail; silent = true;
    const r = await waitFor("POSITIVE CONTROL timeout", () => new Promise((_, rej) => setTimeout(() => rej(new Error("late")), 5)), 50);
    silent = false;
    const timed = fail === before + 1 && r === null && /POSITIVE CONTROL timeout: finished in time/.test(failures[failures.length - 1] ?? "");
    if (timed) { fail--; failures.pop(); }
    check("POSITIVE CONTROL waitFor(): a timeout fails by name", timed);
    await ctx.close();
  }
  const run = async (area, fn) => {
    for (const lang of LANGS) for (const vp of WIDTHS) {
      if (!want(area, lang, vp[0])) continue;
      try { await fn(lang, vp); } catch (e) { check(`${area} ${vp[0]} ${lang}: stopped early`, false, String(e.message).split("\n")[0]); if (!server.listening) await startServer(); }
    }
  };
  // latency 800 at the phone and desktop widths that bracket the range (the stub answers instantly otherwise)
  await run("first", async (lang, vp) => { for (const lat of vp[0] === 390 || vp[0] === 1280 ? [0, 800] : [0]) await firstVisit(browser, lang, vp, lat); });
  await run("slow", (lang, vp) => slowLine(browser, lang, vp));
  await run("offline", (lang, vp) => offline(browser, lang, vp));
  await run("update", (lang, vp) => update(browser, lang, vp));
  await run("signin", (lang, vp) => signIn(browser, lang, vp));
  if (!ONLY && !WIDTH && !LANG) for (const id of FOR_QR_LEAD) check(`the known QR Lead finding "${id}" still occurs (else remove it from FOR_QR_LEAD: it was fixed)`, seenKnown.has(id));
} finally {
  await browser.close();
  if (server.listening) await stopServer();
}
console.log(`\n==== QR student on a device${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
if (fail && REPORT) console.log(failures.slice(0, 120).join("\n"));
process.exit(fail && !REPORT ? 1 : 0);
