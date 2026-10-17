// QR J01 R2: the Asma app offline. At 390 and 1400 wide: visit online, let the worker install and take over, save
// the āyāt for offline use, then cut the network (the browser offline AND this suite's own server stopped) and
// reload. Everything must still work. Then: a new version waits for the reader's Reload, makes a fresh cache and
// deletes only the old qr-app- one; and both kill switches (?nosw, mm_disable_service_worker) switch the worker off.
//
//   node tools/apps/qr-verify/asma-offline-browser.mjs                      (its own server, on PORT, default 8093)
//   --width=390                                                        (one width only)
//   --mutate=<name>   serves app/sw.js with one thing broken (the files on disk are never touched); the suite must FAIL
//       precache      asma-cited-hadith.json left out of the list saved at install
//       cleanup       activate deletes no old cache
//       skipwaiting   a new worker takes over by itself (no "new version" note, code swapped mid-visit)
//
// Unlike pages-browser.mjs, this suite does NOT set mm_disable_service_worker.
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const WIDTHS = arg("width") ? [Number(arg("width"))] : [390, 1400];
const MUTATE = arg("mutate") ?? null;
const PORT = Number(process.env.PORT) || 8093;
const ROOT = process.cwd();
const SHOTS = process.env.QR_SHOTS || null; // a folder for the offline Name 1 screenshot at 390

let pass = 0, fail = 0;
const check = (ok, what) => {
  if (ok instanceof Promise) throw new Error(`check() was handed a promise: ${what}`);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
};

// ---- A small server of its own: it can be stopped (really offline), and it can serve a file changed in memory. ----
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const overrides = new Map(); // url path -> (text) => text
const MUTATIONS = {
  precache: (t) => t.replace('  "../tools/hadith-data-pull/output/asma-cited-hadith.json",\n', ""),
  cleanup: (t) => t.replace('if (key.startsWith("qr-app-") && key !== APP_CACHE) await caches.delete(key);', 'if (false) await caches.delete(key);'),
  skipwaiting: (t) => t.replace('  event.waitUntil((async () => {\n    const cache = await caches.open(APP_CACHE);', '  self.skipWaiting();\n  event.waitUntil((async () => {\n    const cache = await caches.open(APP_CACHE);'),
};
if (MUTATE) {
  if (!MUTATIONS[MUTATE]) throw new Error(`Unknown mutation "${MUTATE}"`);
  const src = fs.readFileSync("app/sw.js", "utf8");
  if (MUTATIONS[MUTATE](src) === src) throw new Error(`Mutation "${MUTATE}" did not apply`);
  overrides.set("/app/sw.js", MUTATIONS[MUTATE]);
}
let server = null;
const sockets = new Set();
function startServer() {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end("Not found"); return; }
      const edit = overrides.get(p);
      const body = edit ? edit(data.toString("utf8")) : data;
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
      res.end(body);
    });
  });
  server.on("connection", (s) => { sockets.add(s); s.on("close", () => sockets.delete(s)); });
  return new Promise((r) => server.listen(PORT, r));
}
function stopServer() {
  for (const s of sockets) s.destroy();
  return new Promise((r) => server.close(() => r()));
}
const base = `http://localhost:${PORT}`;
// The version on disk, and the one a "new version" is simulated with (the next number).
const V1 = fs.readFileSync("app/js/qr-version.js", "utf8").match(/APP_VERSION = "([\d.]+)"/)[1];
const V2 = (Number(V1) + 0.01).toFixed(2).padStart(5, "0");
const reV = (v) => v.replace(".", "\\.");

// ---- 1. Static: the list the worker saves covers everything the page uses. ----
const swSrc = fs.readFileSync("app/sw.js", "utf8");
const servedSw = overrides.get("/app/sw.js")?.(swSrc) ?? swSrc;
const precache = [...servedSw.slice(servedSw.indexOf("const PRECACHE = ["), servedSw.indexOf("];", servedSw.indexOf("const PRECACHE = ["))).matchAll(/"([^"]+)"/g)].map((m) => path.normalize(path.join("app", m[1])));
{
  const re = /(?:import\s[^'"]*?from\s*|import\s*\(\s*|import\s+)["'](\.{1,2}\/[^"']+\.js)["']/g;
  const seen = new Set();
  // screensaver-idle.js -> MMSA's asma-screensaver.js is never called by the Asma app (asma-browser.mjs proves it).
  const skip = new Set(["app/js/screensaver-idle.js -> app/js/asma-screensaver.js"]);
  const walk = (f) => { if (seen.has(f)) return; seen.add(f); for (const m of fs.readFileSync(f, "utf8").matchAll(re)) { const p = path.normalize(path.join(path.dirname(f), m[1])); if (!skip.has(`${f} -> ${p}`) && fs.existsSync(p)) walk(p); } };
  walk("app/asma.html");
  walk("app/asma-about.html");
  const html = fs.readFileSync("app/asma.html", "utf8") + fs.readFileSync("app/asma-about.html", "utf8");
  const linked = [...html.matchAll(/(?:href|src)="\.\/([^"#?]+)"/g)].map((m) => path.normalize(path.join("app", m[1])));
  const manifest = JSON.parse(fs.readFileSync("app/asma.webmanifest", "utf8")).icons.map((i) => path.normalize(path.join("app", i.src)));
  // The fonts the Asma pages use: every file app/css/qr-fonts.css names (app/fonts also holds Quran Study's, J02 S1).
  const fonts = [...fs.readFileSync("app/css/qr-fonts.css", "utf8").matchAll(/url\(\.\.\/fonts\/([^)]+)\)/g)].map((m) => path.join("app/fonts", m[1]));
  const need = [...seen, ...linked, ...manifest, ...fonts, "app/img/asma-poster-frame.webp", "tools/hadith-data-pull/output/asma-cited-hadith.json"];
  const missing = [...new Set(need)].filter((f) => !precache.includes(f));
  check(missing.length === 0, `static: the worker saves all ${new Set(need).size} files the page uses${missing.length ? "; missing: " + missing.join(", ") : ""}`);
  const absent = precache.filter((f) => !fs.existsSync(f));
  check(absent.length === 0, `static: every file in the list exists${absent.length ? ": " + absent.join(", ") : ""}`);
  const bytes = precache.reduce((n, f) => n + (fs.existsSync(f) ? fs.statSync(f).size : 0), 0);
  console.log(`     (saved at install: ${precache.length} files, ${(bytes / 1e6).toFixed(2)} MB)`);
}

await startServer();
const browser = await chromium.launch();
try {
  for (const width of WIDTHS) {
    try { await runWidth(width); } catch (err) { check(false, `@${width} stopped early: ${String(err.message).split("\n")[0]}`); if (!server.listening) await startServer(); }
  }
  try { await versionBump(); } catch (err) { check(false, `version bump stopped early: ${String(err.message).split("\n")[0]}`); }
  try { await killSwitches(); } catch (err) { check(false, `kill switches stopped early: ${String(err.message).split("\n")[0]}`); }
} finally {
  await browser.close();
  if (server.listening) await stopServer();
}
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

/** Which version a worker is: it answers QR's GET_VERSION message ("controller", or the registration's "waiting"). */
async function workerVersion(page, which) {
  return page.evaluate(async (w) => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sw = w === "controller" ? navigator.serviceWorker.controller : reg?.[w];
    if (!sw) return null;
    return new Promise((resolve) => {
      const ch = new MessageChannel();
      ch.port1.onmessage = (e) => resolve(e.data);
      sw.postMessage({ type: "GET_VERSION" }, [ch.port2]);
      setTimeout(() => resolve(null), 3000);
    });
  }, which);
}

async function controlled(page) {
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 });
}
async function cacheReport(page) {
  return page.evaluate(async () => {
    const out = {};
    for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).length;
    return out;
  });
}

async function runWidth(width) {
  const tag = `@${width}`;
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Online: the worker installs and takes over.
  await page.goto(`${base}/app/asma.html`, { waitUntil: "load" });
  await controlled(page);
  const caches1 = await cacheReport(page);
  // J02 S3: the same cache also holds Quran Study's shell; every file of Asma's own list must be in it.
  const missingSaved = await page.evaluate(async ([name, files]) => {
    const c = await caches.open(name);
    const out = [];
    for (const f of files) if (!(await c.match(new URL(f, location.origin + "/").href, { ignoreSearch: true }))) out.push(f);
    return out;
  }, [`qr-app-${V1}`, precache]);
  check(missingSaved.length === 0 && caches1[`qr-app-${V1}`] >= precache.length, `${tag} the worker saved all ${precache.length} of Asma's files in qr-app-${V1} (${caches1[`qr-app-${V1}`]} files in it)${missingSaved.length ? "; missing " + missingSaved.join(", ") : ""}`);
  const sw = await page.evaluate(() => navigator.serviceWorker.controller.scriptURL);
  const v = await workerVersion(page, "controller");
  check(sw === `${base}/app/sw.js` && v === V1, `${tag} the worker is app/sw.js, version ${v} (${sw.replace(base, "")})`);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).scope);
  check(scope === `${base}/app/`, `${tag} its scope is /app/`);
  check(await page.locator("[data-qa-update]").isHidden(), `${tag} no "new version" note on a first visit`);

  // Save for offline, with progress.
  const btn = page.locator("[data-qa-offline-save]");
  check(await btn.isVisible(), `${tag} "Save for offline" shows (${(await btn.innerText()).trim()})`);
  const bb = await btn.boundingBox();
  check(bb && bb.height >= 40, `${tag} it is finger-sized (${Math.round(bb?.height ?? 0)}px)`);
  await btn.click();
  await page.waitForFunction(() => /✓/.test(document.querySelector("[data-qa-offline-note]")?.textContent ?? ""), null, { timeout: 120000 });
  const caches2 = await cacheReport(page);
  check(caches2["qr-quran-v1"] === 51, `${tag} all 51 surah files the Names cite are saved (${caches2["qr-quran-v1"]})`);
  check(await btn.isHidden(), `${tag} once saved, the button goes and "Ready for offline use ✓" stays`);
  const { sw2, cw } = await page.evaluate(() => ({ sw2: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check(sw2 <= cw, `${tag} no sideways scroll with the offline strip (${sw2} <= ${cw})`);

  // Offline: the browser offline AND the server stopped.
  await ctx.setOffline(true);
  await stopServer();
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector("[data-qa-grid] .qa-card");
  check(await page.locator(".qa-card").count() === 99, `${tag} offline: the 99 Names`);
  await page.click('[data-qa-tab="groups"]');
  await page.waitForSelector("[data-qa-wheel] .wheel-seg");
  check(await page.locator("[data-qa-wheel] .wheel-seg").count() === 19, `${tag} offline: the groups wheel`);
  await page.goto(`${base}/app/asma.html#v=name&n=1`, { waitUntil: "load" });
  await page.waitForSelector('[data-qa-detail="1"]');
  await page.waitForSelector(".qa-poster-inline .ahp");
  const frameOk = await page.evaluate(async () => (await fetch("img/asma-poster-frame.webp")).ok);
  check(await page.locator(".qa-poster-inline .ahp").count() === 1 && frameOk, `${tag} offline: Name 1 with its poster (and the poster's frame image)`);
  await page.waitForSelector("#qaCitedAyat .asmax-cited-words", { timeout: 10000 }).catch(() => {});
  const ayah = (await page.locator("#qaCitedAyat .asmax-cited-words").first().innerText().catch(() => "")).trim();
  check(/[؀-ۿ]/.test(ayah), `${tag} offline: Name 1's cited āyāt are written out`);
  const fontOk = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px "Amiri"', "الرحمن"); });
  check(fontOk, `${tag} offline: the Arabic font loads from the saved copy`);
  if (width === 390 && SHOTS && !MUTATE) await page.screenshot({ path: path.join(SHOTS, "offline-name1-390-en.png"), fullPage: true });
  await page.click("[data-qa-next]");
  await page.waitForSelector('[data-qa-detail="2"]', { timeout: 3000 }).catch(() => {});
  const two = await page.locator('[data-qa-detail="2"]').count();
  await page.click("[data-qa-prev]");
  await page.waitForSelector('[data-qa-detail="1"]', { timeout: 3000 }).catch(() => {});
  check(two === 1 && await page.locator('[data-qa-detail="1"]').count() === 1, `${tag} offline: › and ‹`);
  // The 🌙 screensaver, offline: its code was saved at install, and the template posters need nothing else.
  await page.click("[data-qa-saver]");
  await page.waitForSelector("#mmSaver .mms-slide.on .ahp", { timeout: 8000 }).catch(() => {});
  check(await page.locator("#mmSaver .mms-slide.on .ahp").count() >= 1, `${tag} offline: the 🌙 screensaver opens with a poster`);
  await page.keyboard.press("Escape");
  await page.waitForSelector("#mmSaver", { state: "detached", timeout: 3000 }).catch(() => {});
  check(await page.locator("#mmSaver").count() === 0 && await page.locator('[data-qa-detail="1"]').count() === 1, `${tag} offline: closing it returns to Name 1`);
  await page.goto(`${base}/app/asma.html#v=name&n=20`, { waitUntil: "load" });
  await page.waitForSelector("#qaCitedHadith .asmax-cited-hadith-ar", { timeout: 8000 }).catch(() => {});
  const had = (await page.locator("#qaCitedHadith .asmax-cited-hadith-ar").first().innerText().catch(() => "")).trim();
  check(had.length > 50, `${tag} offline: Name 20's cited hadith (${had.length} chars)`);
  await page.click('[data-qa-lang="bn"]');
  await page.waitForFunction(() => /[ঀ-৿]/.test(document.querySelector('[data-qa-tab="names"]')?.textContent ?? ""), null, { timeout: 8000 }).catch(() => {});
  const bnTab = (await page.locator('[data-qa-tab="names"]').innerText()).trim();
  const bnMean = (await page.locator("[data-qa-meaning]").innerText()).trim();
  check(/[ঀ-৿]/.test(bnTab) && /[ঀ-৿]/.test(bnMean), `${tag} offline: the Bangla switch works ("${bnTab}", "${bnMean}")`);
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-qa-detail="20"]');
  check(/[ঀ-৿]/.test(await page.locator("[data-qa-meaning]").innerText()), `${tag} offline: a reload in Bangla works (bn.js saved)`);
  await page.click('[data-qa-lang="en"]');
  check(errors.length === 0, `${tag} no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);

  await ctx.setOffline(false);
  await startServer();
  await ctx.close();
}

/** A new APP_VERSION: the new worker waits for the reader; Reload swaps it in; the old qr-app- cache goes, the
 *  Qur'an cache and every non-qr-app cache stay. */
async function versionBump() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  overrides.delete("/app/js/qr-version.js");
  await page.goto(`${base}/app/asma.html#v=name&n=5`, { waitUntil: "load" });
  await controlled(page);
  await page.evaluate(async () => { await (await caches.open("mm-app-11.04")).put("/x", new Response("x")); await (await caches.open("someone-else")).put("/x", new Response("x")); });
  const before = await cacheReport(page);
  check(!!before[`qr-app-${V1}`] && "qr-quran-v1" in before, `update: before, qr-app-${V1} and qr-quran-v1 (${Object.keys(before).join(", ")})`);

  // A real bump changes app/js/qr-version.js AND the copy make-precache.mjs writes into app/sw.js (J02 S3b).
  overrides.set("/app/js/qr-version.js", (t) => t.replace(`APP_VERSION = "${V1}"`, `APP_VERSION = "${V2}"`));
  const swBefore = overrides.get("/app/sw.js");
  overrides.set("/app/sw.js", (t) => (swBefore ? swBefore(t) : String(t)).replace(`const APP_VERSION = "${V1}";`, `const APP_VERSION = "${V2}";`));
  const marker = await page.evaluate(() => (window.__qrMarker = Math.random()));
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector("[data-qa-update]:not([hidden])", { timeout: 30000 }).catch(() => {});
  check(await page.locator("[data-qa-update]").isVisible(), `update: "A new version is ready · Reload" shows`);
  const still = await workerVersion(page, "controller");
  const waitingV = await workerVersion(page, "waiting");
  check(still === V1 && waitingV === V2, `update: the page keeps running ${still} until Reload, ${waitingV} waits`);
  const note = page.locator("[data-qa-update] button");
  const nb = await note.boundingBox();
  check(nb && nb.height >= 40, `update: Reload is finger-sized (${Math.round(nb?.height ?? 0)}px)`);
  const mid = await cacheReport(page);
  check(!!mid[`qr-app-${V2}`] && !!mid[`qr-app-${V1}`], `update: the new version saved qr-app-${V2} while the old one still serves (${Object.keys(mid).join(", ")})`);
  void marker;
  await Promise.all([page.waitForEvent("load", { timeout: 30000 }), note.click()]);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 }).catch(() => {});
  let now = null;
  for (let i = 0; i < 20 && now !== V2; i++) { now = await workerVersion(page, "controller"); if (now !== V2) await page.waitForTimeout(500); }
  check(now === V2, `update: after Reload, the new version runs (${now})`);
  const after = await cacheReport(page);
  check(!!after[`qr-app-${V2}`] && !after[`qr-app-${V1}`], `update: qr-app-${V1} deleted, qr-app-${V2} kept (${Object.keys(after).join(", ")})`);
  check(!!after["qr-quran-v1"] && !!after["mm-app-11.04"] && !!after["someone-else"], `update: only qr-app- caches are deleted (qr-quran-v1, mm-app-11.04 and someone-else kept)`);
  check(await page.locator('[data-qa-detail="5"]').count() === 1, `update: the reader is back on the same Name after Reload`);
  check(errors.length === 0, `update: no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
  overrides.delete("/app/js/qr-version.js");
  if (swBefore) overrides.set("/app/sw.js", swBefore); else overrides.delete("/app/sw.js");
  await ctx.close();
}

/** ?nosw and mm_disable_service_worker = "1" each unregister the worker and skip it. */
async function killSwitches() {
  for (const how of ["nosw", "storage"]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(`${base}/app/asma.html`, { waitUntil: "load" });
    await controlled(page);
    if (how === "storage") await page.evaluate(() => localStorage.setItem("mm_disable_service_worker", "1"));
    await page.goto(`${base}/app/asma.html${how === "nosw" ? "?nosw" : ""}`, { waitUntil: "load" });
    await page.waitForSelector("[data-qa-grid] .qa-card");
    await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistrations()).length === 0, null, { timeout: 10000 }).catch(() => {});
    const regs = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
    check(regs === 0, `kill switch ${how === "nosw" ? "?nosw" : "mm_disable_service_worker=1"}: the worker is unregistered (${regs} left)`);
    check(await page.locator("[data-qa-offline]").isHidden(), `kill switch ${how === "nosw" ? "?nosw" : "mm_disable_service_worker=1"}: no offline strip`);
    await ctx.close();
  }
}
