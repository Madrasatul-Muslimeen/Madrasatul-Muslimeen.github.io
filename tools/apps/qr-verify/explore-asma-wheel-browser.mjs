// QR J02 S4c: Quran Study's Explore → Asma ul Husna wheel (the copied quranrevival.html), with QR's one worker running
// (it adds app/js/qr-copied-page.js, which fits the wheel's labels). At 390 and 1440, English and Bangla, signed in
// through MMSA's harness: on the Groups wheel and on a group's Names wheel, no slice label overlaps another label or
// number, every label stays inside its own slice, and every word of each group's title is still there (the owner's
// QR J01 Q3 = A: keep the wording, let it wrap). Then the wheel is drawn again (back to the groups): still calm.
//
//   node tools/apps/qr-verify/explore-asma-wheel-browser.mjs     (its own server, on PORT, default 8104)
//   --mutate=fit   the copied pages run without the fit (as MMSA draws the wheel): the suite must FAIL
//   --width=N --lang=en|bn   one combination only
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { routeMmsaHadith } from "./mmsa-hadith-route.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const MUTATE = arg("mutate") ?? null;
const WIDTHS = arg("width") ? [Number(arg("width"))] : [390, 1440];
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const PORT = Number(process.env.PORT) || 8104;
const ROOT = process.cwd();
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
const MUTATIONS = { fit: ["/app/js/qr-copied-page.js", (t) => t.replace('if (document.getElementById("asmaXWheelContainer")) {', "if (false) {")] };
const overrides = new Map();
if (MUTATE) {
  const [p, edit] = MUTATIONS[MUTATE] ?? [];
  if (!p) throw new Error(`Unknown mutation "${MUTATE}"`);
  if (edit(fs.readFileSync(path.join(ROOT, p), "utf8")) === fs.readFileSync(path.join(ROOT, p), "utf8")) throw new Error(`Mutation "${MUTATE}" did not apply`);
  overrides.set(p, edit);
}
const server = http.createServer((req, res) => {
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
await new Promise((r) => server.listen(PORT, r));
process.env.QR_BASE = `http://localhost:${PORT}`;
const base = process.env.QR_BASE;
const { chromium, newContext } = await import("../../i18n-verify/harness.mjs");

let pass = 0, fail = 0;
const check = (ok, what) => {
  if (ok instanceof Promise) throw new Error(`check() was handed a promise: ${what}`);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
};

const browser = await chromium.launch();
try {
  for (const width of WIDTHS) for (const lang of LANGS) {
    try { await run(width, lang); } catch (err) { check(false, `@${width} ${lang} stopped early: ${String(err.message).split("\n")[0]}`); }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

async function run(width, lang) {
  const tag = `@${width} ${lang}`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, allowServiceWorker: true });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await routeMmsaHadith(ctx);
  await ctx.addInitScript(() => { try { localStorage.setItem("mm_disable_screensaver", "1"); } catch {} });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 90000 });
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  await page.evaluate(() => document.getElementById("tabExploreBtn").click());
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById("explorePaletteAsmaBtn").click());
  await page.waitForFunction(() => document.querySelectorAll("#asmaXWheelContainer svg text.wheel-seg-label").length >= 10, null, { timeout: 20000 });
  await calm(page, `${tag} Groups wheel`, { words: true });
  // A group's Names (the first slice), then back to all the groups: the wheel is drawn again each time.
  await page.evaluate(() => document.querySelector("#asmaXWheelContainer path.wheel-seg")?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForFunction(() => !!document.querySelector("#asmaXWheelContainer svg text.wheel-seg-label tspan.wheel-seg-label-ar"), null, { timeout: 20000 });
  await calm(page, `${tag} Names wheel (group 1)`);
  await page.evaluate(() => { const s = document.querySelector('select[data-asmax-class-select="group"]'); if (s) { s.value = ""; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction(() => document.querySelectorAll("#asmaXWheelContainer svg text.wheel-seg-label").length >= 10 && !document.querySelector("#asmaXWheelContainer tspan.wheel-seg-label-ar"), null, { timeout: 20000 }).catch(() => {});
  await calm(page, `${tag} Groups wheel drawn again`, { words: true });
  if (process.env.SHOTS) await page.locator("#asmaXWheelContainer").screenshot({ path: `${process.env.SHOTS}/explore-asma-${width}-${lang}${MUTATE ? "-" + MUTATE : ""}.png` });
  check(errors.length === 0, `${tag} no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}

/** Every slice label and outer number: inside its own slice, no two overlapping (their real turned boxes, separating-
 *  axis test), and (Groups) every word of each title drawn. The same measure as asma-browser.mjs's wheelLabelsCalm. */
async function calm(page, what, { words = false } = {}) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const svg = document.querySelector("#asmaXWheelContainer svg.mastery-wheel");
    const segs = [...svg.querySelectorAll("path.wheel-seg")];
    const n = segs.length;
    const per = 360 / n, half = (per - Math.min(1.2, per * 0.08)) / 2;
    const toSvg = svg.getScreenCTM().inverse();
    const quads = [], outside = [], lost = [];
    for (const el of svg.querySelectorAll("text.wheel-seg-label, text.wheel-seg-num")) {
      const b = el.getBBox();
      if (!b.width) continue;
      const m = el.getScreenCTM();
      const corners = [[b.x, b.y], [b.x + b.width, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height]]
        .map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
      quads.push({ label: el.textContent.trim().slice(0, 28), pts: corners.map((p) => [p.x, p.y]) });
      if (el.classList.contains("wheel-seg-label")) {
        const px = Number(el.getAttribute("x")) - 180, py = Number(el.getAttribute("y")) - 180;
        const mid = Math.atan2(py, px) * 180 / Math.PI + 90;
        const ok = corners.every((p) => {
          const q = p.matrixTransform(toSvg), X = q.x - 180, Y = q.y - 180, rr = Math.hypot(X, Y);
          const d = Math.abs((((Math.atan2(Y, X) * 180 / Math.PI + 90 - mid) % 360) + 540) % 360 - 180);
          return rr >= 88 - 0.5 && rr <= 176 + 0.5 && d <= half + 0.05;
        });
        if (!ok) outside.push(el.textContent.trim().slice(0, 40));
        const i = Math.min(n - 1, Math.floor(((mid % 360) + 360) % 360 / per));
        const title = segs[i]?.querySelector("title")?.textContent.replace(/\s+/g, " ").trim();
        const drawn = [...el.querySelectorAll("tspan")].map((t) => t.textContent).join(" ").replace(/\s+/g, " ").trim();
        if (title && drawn !== title) lost.push(`"${drawn}" ≠ "${title}"`);
      }
    }
    const axes = (pts) => pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return [-(q[1] - p[1]), q[0] - p[0]]; });
    const proj = (pts, a) => { const v = pts.map((p) => p[0] * a[0] + p[1] * a[1]); return [Math.min(...v), Math.max(...v)]; };
    const overlap = (A, B) => [...axes(A), ...axes(B)].every((a) => { const [a0, a1] = proj(A, a), [b0, b1] = proj(B, a); return a1 > b0 + 0.5 && b1 > a0 + 0.5; });
    const clashes = [];
    for (let i = 0; i < quads.length; i++) for (let j = i + 1; j < quads.length; j++) {
      if (overlap(quads[i].pts, quads[j].pts)) clashes.push(`${quads[i].label} / ${quads[j].label}`);
    }
    return { n, count: quads.length, clashes, outside, lost };
  });
  check(r.count > 0 && r.clashes.length === 0, `${what}: no two of its ${r.count} labels and numbers overlap${r.clashes.length ? ` (${r.clashes.length}): ` + r.clashes.slice(0, 3).join("; ") : ""}`);
  check(r.outside.length === 0, `${what}: every slice label stays inside its own slice (${r.n} slices)${r.outside.length ? ` (${r.outside.length} outside): ` + r.outside.slice(0, 3).join("; ") : ""}`);
  if (words) check(r.lost.length === 0, `${what}: every word of every title is drawn${r.lost.length ? ": " + r.lost.slice(0, 2).join("; ") : ""}`);
}
