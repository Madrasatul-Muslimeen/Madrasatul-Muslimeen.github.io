// QR J02 S3: Quran Study and LDOG offline, through QR's one worker (app/sw.js). Signed in through MMSA's harness
// (Firebase faked at the network layer; the worker keeps the faked SDK files just as it keeps the real ones).
// At 390 and 1400: visit online (the worker installs and takes over), open the Read view of Al-Fatiha and an Āyah
// card, open LDOG; then cut the network (the browser offline AND this suite's own server stopped) and reload: the
// wheel, the Read view, the Āyah card with its related hadith, and LDOG's list must all still work.
// Then a new version: MMSA's "Updated — tap to reload" appears on Quran Study, the tap brings the new version, its
// qr-app- cache holds what the old one held (carried forward), the old qr-app- cache is gone and nothing else is.
//
//   node tools/apps/qr-verify/qr-offline-browser.mjs                 (its own server, on PORT, default 8099)
//   --mutate=<name>   serves one file broken (files on disk untouched); the suite must FAIL
//       shell   ldog-study.html left out of the shell saved at install
//       sdk     the Firebase SDK is not kept (the worker passes it to the network)
//       carry   a new version does not carry forward what the old one held
//       hadith  the hadith files from MMSA's address are not kept (J02 S1d)
// Playwright's request routing (how MMSA's harness fakes Firebase) sees a service worker's own fetches only with
// this switch; without it the worker would save the REAL firebase-init.js and SDK and the page would not sign in.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { routeMmsaHadith, MMSA_HADITH } from "./mmsa-hadith-route.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const MUTATE = arg("mutate") ?? null;
const WIDTHS = arg("width") ? [Number(arg("width"))] : [390, 1400];
const PORT = Number(process.env.PORT) || 8099;
const ROOT = process.cwd();
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
const overrides = new Map();
const MUTATIONS = {
  shell: ["/app/sw.js", (t) => t.replace('  "ldog-study.html",\n', "")],
  sdk: ["/app/sw.js", (t) => t.replace("if (isFirebaseSdk(req)) { event.respondWith(handleFirebaseSdk(req)); return; }", "")],
  carry: ["/app/sw.js", (t) => t.replace("await carryOverPreviousCache().catch(() => 0);", "")],
  hadith: ["/app/sw.js", (t) => t.replace("event.respondWith(hadithFile(event)); return;", "return;")],
};
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
const V1 = fs.readFileSync("app/js/qr-version.js", "utf8").match(/APP_VERSION = "([\d.]+)"/)[1];
const V2 = (Number(V1) + 0.01).toFixed(2).padStart(5, "0");

let pass = 0, fail = 0;
const check = (ok, what) => {
  if (ok instanceof Promise) throw new Error(`check() was handed a promise: ${what}`);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
};
const LDOG_SEED = `
DATA.subjects.push(
  { _id: TENANT_ID + "__ldog", tenantId: TENANT_ID, subjectId: "ldog", parentId: null, name: lang("Learn Deen On-the-Go"), moduleIds: ["ldog"], ancestorIds: [], status: "active", order: 9 },
  { _id: TENANT_ID + "__daily_deen_habit", tenantId: TENANT_ID, subjectId: "daily_deen_habit", parentId: "ldog", name: lang("Daily Deen Learning Habit for Life"), moduleIds: ["ldog"], ancestorIds: ["ldog"], status: "active", order: 1, isTrackable: true }
);`;

const browser = await chromium.launch();
try {
  for (const width of WIDTHS) {
    try { await run(width); } catch (err) { check(false, `@${width} stopped early: ${String(err.message).split("\n")[0]}`); if (!server.listening) await startServer(); }
  }
  try { await versionBump(); } catch (err) { check(false, `version bump stopped early: ${String(err.message).split("\n")[0]}`); if (!server.listening) await startServer(); }
} finally {
  await browser.close();
  if (server.listening) await stopServer();
}
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

async function fresh(page) {
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
}
async function readFatiha(page) {
  await page.evaluate(() => document.getElementById("tabReadBtn").click());
  await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 15000 }).catch(() => {});
  // The page reopens where the reader last was (36:38 after the Āyah card): go to Al-Fatiha 1:1 the way a reader does.
  await page.evaluate(() => { const el = document.getElementById("surahSelect"); if (el.value !== "1") { el.value = "1"; el.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction(() => document.getElementById("readSurahSelect")?.value === "1" && /بِسْمِ|ٱللَّهِ/.test(document.getElementById("ayahPanels")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => { const el = document.getElementById("ayahSelect"); if (el.value !== "1") { el.value = "1"; el.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(600);
  return page.evaluate(() => ({ sel: ["readSurahSelect", "readAyahSelect"].map((i) => document.getElementById(i)?.value).join(":"), text: document.getElementById("ayahPanels")?.textContent ?? "" }));
}
async function ayahCard(page) {
  await page.evaluate(() => { const el = document.getElementById("surahSelect"); el.value = "36"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForFunction(() => !!document.querySelector('#ayahSelect option[value="38"]'), null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "38"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForSelector('[data-ayah-num-badge="36:38"]', { state: "attached", timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  for (let i = 0; i < 3 && !(await page.evaluate(() => !!document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"))); i++) {
    await page.evaluate(() => document.querySelector('[data-ayah-num-badge="36:38"]')?.click());
    await page.waitForTimeout(1500);
  }
  await page.waitForFunction(() => [...document.querySelectorAll("[data-ayah-hadith-open]")].some((b) => /Bukhari|Muslim/.test(b.textContent)), null, { timeout: 15000 }).catch(() => {});
  return page.evaluate(() => ({
    open: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"),
    unit: document.querySelector("[data-ayah-sheet]")?.dataset.unitKey,
    rows: [...document.querySelectorAll("[data-ayah-hadith-open]")].map((b) => b.textContent.replace(/\s+/g, " ").trim()),
  }));
}
async function ldogList(page) {
  await page.waitForFunction(() => (document.getElementById("listContainer")?.textContent.trim().length ?? 0) > 20, null, { timeout: 15000 }).catch(() => {});
  return page.evaluate(() => document.getElementById("listContainer")?.textContent.trim() ?? "");
}
function cacheReport(page) {
  return page.evaluate(async () => { const o = {}; for (const k of await caches.keys()) o[k] = (await (await caches.open(k)).keys()).length; return o; });
}

async function run(width) {
  const tag = `@${width}`;
  const ctx = await newContext(browser, { viewport: { width, height: width < 600 ? 844 : 900 }, allowServiceWorker: true, extraSeedJs: LDOG_SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await routeMmsaHadith(ctx);
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Online: the first visit installs the worker; the second is served by it.
  await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 60000 });
  const c1 = await cacheReport(page);
  // J02 S1e: everything the worker saves at install (Asma's list + the shell), counted from app/sw.js itself.
  const swAll = fs.readFileSync("app/sw.js", "utf8");
  const INSTALL_FILES = ["const PRECACHE = [", "const SHELL = ["].reduce((n, k) => n + [...swAll.slice(swAll.indexOf(k), swAll.indexOf("];", swAll.indexOf(k))).matchAll(/^  "[^"]+",?$/gm)].length, 0);
  check((c1[`qr-app-${V1}`] ?? 0) >= INSTALL_FILES, `${tag} the worker saved the pages and their code at install (${c1[`qr-app-${V1}`]} files in qr-app-${V1})`);
  // Every file of the shell (as on disk) was saved at install, before anything was opened.
  const swText = fs.readFileSync("app/sw.js", "utf8");
  const shellBlock = swText.slice(swText.indexOf("const SHELL = ["), swText.indexOf("];", swText.indexOf("const SHELL = [")));
  const shell = [...shellBlock.matchAll(/^  "([^"]+)",?$/gm)].map((m) => m[1]);
  const notSaved = await page.evaluate(async ([name, files]) => {
    const c = await caches.open(name); const out = [];
    for (const f of files) if (!(await c.match(`${location.origin}/app/${f}`, { ignoreSearch: true }))) out.push(f);
    return out;
  }, [`qr-app-${V1}`, shell]);
  check(shell.length > 100 && notSaved.length === 0, `${tag} all ${shell.length} shell files saved at install${notSaved.length ? "; missing " + notSaved.slice(0, 5).join(", ") : ""}`);
  await page.reload({ waitUntil: "load" });
  await fresh(page);
  const sdk = (await cacheReport(page))["qr-ext-v1"] ?? 0;
  check(sdk >= 1, `${tag} the Firebase SDK files are kept in qr-ext-v1 (${sdk})`);
  const r1 = await readFatiha(page);
  check(r1.sel === "1:1" && /بِسْمِ|ٱللَّهِ/.test(r1.text), `${tag} online: the Read view shows Al-Fatiha`);
  const a1 = await ayahCard(page);
  check(a1.open && a1.rows.some((t) => /Bukhari|Muslim/.test(t)), `${tag} online: the Āyah card 36:38 with its related hadith`);
  await page.goto(`${base}/app/ldog-study.html`, { waitUntil: "load" });
  check(/Daily Deen/.test(await ldogList(page)), `${tag} online: LDOG's list`);
  await page.waitForTimeout(800); // the worker's background saves finish
  // J02 S1d: the hadith files come from MMSA's address; the ones the card opened are kept in qr-hadith-v1.
  const hadithKept = (await cacheReport(page))["qr-hadith-v1"] ?? 0;
  check(hadithKept >= 2, `${tag} the hadith files the card opened (from MMSA's address) are kept in qr-hadith-v1 (${hadithKept})`);

  // Offline (and MMSA's address no longer answered either).
  await ctx.unroute(`${MMSA_HADITH}**`);
  await ctx.route(`${MMSA_HADITH}**`, (r) => r.abort("internetdisconnected"));
  await ctx.setOffline(true);
  await stopServer();
  await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" }).catch(() => {});
  await fresh(page);
  const ver = await page.locator("#appVersion").innerText().catch(() => "");
  check(/^v\d+\.\d+$/.test(ver), `${tag} offline: Quran Study opens and its code runs (${ver || "nothing"})`);
  await page.waitForSelector("#wheelSection .wheel-seg", { timeout: 15000 }).catch(() => {});
  check(await page.locator("#wheelSection .wheel-seg").count() > 0, `${tag} offline: the wheel`);
  const r2 = await readFatiha(page);
  check(r2.sel === "1:1" && /بِسْمِ|ٱللَّهِ/.test(r2.text), `${tag} offline: the Read view of Al-Fatiha (its data kept on first use)`);
  const a2 = await ayahCard(page);
  check(a2.open && a2.unit === "ayah:36:38", `${tag} offline: the Āyah card opened online opens again`);
  check(a2.rows.length >= 3 && /Muslim 159\b/.test(a2.rows.join("|")) && /Bukhari 3199/.test(a2.rows.join("|")), `${tag} offline: its related hadith name their books (${a2.rows.length} rows)`);
  await page.goto(`${base}/app/ldog-study.html`, { waitUntil: "load" }).catch(() => {});
  check(/Daily Deen/.test(await ldogList(page)), `${tag} offline: LDOG's list`);
  check(errors.length === 0, `${tag} no page errors${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""}`);
  await ctx.setOffline(false);
  await startServer();
  await ctx.close();
}

async function versionBump() {
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 }, allowServiceWorker: true });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await routeMmsaHadith(ctx);
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  overrides.delete("/app/js/qr-version.js");
  await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 60000 });
  await page.reload({ waitUntil: "load" });
  await fresh(page);
  await readFatiha(page); // kept on use: Qur'an data in qr-app- (indexes) and qr-quran-v1 (the surah)
  await ayahCard(page); // J02 S1d: and its hadith files in qr-hadith-v1, which a new version must keep
  await page.waitForTimeout(800);
  const dataUrl = `${base}/tools/quran-data-pull/output/surah-index.json`;
  const before = await page.evaluate(async (u) => ({ keys: await caches.keys(), has: !!(await caches.match(u)) }), dataUrl);
  check(before.keys.includes(`qr-app-${V1}`) && before.has, `update: before, qr-app-${V1} holds data opened on use (surah-index.json)`);
  await page.evaluate(async () => { await (await caches.open("mm-app-11.04")).put("/x", new Response("x")); });

  // A real bump changes app/js/qr-version.js AND the copy make-precache.mjs writes into app/sw.js (J02 S3b).
  overrides.set("/app/js/qr-version.js", (t) => t.replace(`APP_VERSION = "${V1}"`, `APP_VERSION = "${V2}"`));
  const swBefore = overrides.get("/app/sw.js");
  overrides.set("/app/sw.js", (t) => (swBefore ? swBefore(t) : String(t)).replace(`const APP_VERSION = "${V1}";`, `const APP_VERSION = "${V2}";`));
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector("#swUpdateNotice", { timeout: 60000 }).catch(() => {});
  check(await page.locator("#swUpdateNotice").isVisible().catch(() => false), `update: Quran Study shows MMSA's "Updated — tap to reload"`);
  const mid = await page.evaluate(async (u) => ({ keys: await caches.keys(), carried: !!(await (await caches.open(u[1])).match(u[0])) }), [dataUrl, `qr-app-${V2}`]);
  check(mid.keys.includes(`qr-app-${V2}`) && mid.keys.includes(`qr-app-${V1}`), `update: the new version saved qr-app-${V2} while qr-app-${V1} still serves`);
  check(mid.carried, `update: qr-app-${V2} already holds the data the reader had opened (carried forward)`);
  await Promise.all([page.waitForEvent("load", { timeout: 60000 }), page.click("#swUpdateNotice")]);
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => caches.keys());
  check(after.includes(`qr-app-${V2}`) && !after.includes(`qr-app-${V1}`), `update: qr-app-${V1} deleted, qr-app-${V2} kept (${after.join(", ")})`);
  check(before.keys.includes("qr-hadith-v1"), `update: before, qr-hadith-v1 holds the hadith the card opened`);
  const kept = before.keys.filter((k) => !k.startsWith("qr-app-")).concat("mm-app-11.04");
  check(kept.every((k) => after.includes(k)), `update: only qr-app- went (${kept.join(", ")} kept)`);
  check(errors.length === 0, `update: no page errors${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""}`);
  overrides.delete("/app/js/qr-version.js");
  if (swBefore) overrides.set("/app/sw.js", swBefore); else overrides.delete("/app/sw.js");
  await ctx.close();
}
