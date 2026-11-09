// MSA · QR J121 -- the Owner's Sūrah al-Wāqiʿah recording, played for real in a browser (the REAL 13 MB file, not a stub).
// Run from the repository root with node serve.js on :8080.  node tools/i18n-verify/waqiah-reciter-browser.mjs [--mutate=no-surah-filter]
//   A  on sūrah 56 the reciter is offered; ticking it and pressing Play plays waqiah.webm and the shared <audio> clock moves.
//   B  on sūrah 1 it is NOT offered.
//   C  Play on āyah 1 then the run moves to āyah 2 by itself (segmented seek + boundary).
//   --mutate=no-surah-filter   renderListeningControls offers it on every sūrah  -> B FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error("promise"); ok ? (pass++, console.log("  PASS ", n)) : (fail++, console.log("  FAIL ", n, d)); };
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = { "no-surah-filter": ["app/quranrevival.html", "reciterIsReady(r.id) && reciterOffersSurah(r.id, currentSurahNum));", "reciterIsReady(r.id));"] };
if (MUTATE && !MUT[MUTATE]) throw new Error("unknown mutation");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"]) for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  const tag = `${lang} ${vp.width}`;
  const ctx = await newContext(browser, { banner: false, viewport: vp, appLang: lang });
  if (MUTATE) {
    const [f, a, b] = MUT[MUTATE]; const s = fs.readFileSync(f, "utf8");
    if (s.split(a).length !== 2) throw new Error("anchor");
    await ctx.route(/\/app\/quranrevival\.html(\?.*)?$/, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: s.replace(a, b) }));
  }
  await ctx.addInitScript(() => { window.__aud = []; const pl = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (!window.__aud.includes(this)) window.__aud.push(this); return pl.apply(this, arguments); }; });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  if (!(await page.evaluate(() => (document.getElementById("tabStudyOptionsBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabStudyOptionsBtn"); await page.waitForTimeout(200);
  const offered = () => page.evaluate(() => !!document.querySelector('.drill-reciter-check[value="waqiah"]'));
  await page.selectOption("#surahSelect", "1"); await page.waitForTimeout(500);
  check(`B ${tag}: not offered on sūrah 1`, !(await offered()));
  await page.selectOption("#surahSelect", "56"); await page.waitForTimeout(700);
  check(`A ${tag}: offered on sūrah 56`, await offered());
  for (const id of ["ar", "bn"]) { const b = `.drill-reciter-check[value="${id}"]`; if (await page.$(b) && await page.isChecked(b)) await page.uncheck(b); }
  await page.check('.drill-reciter-check[value="waqiah"]');
  await page.evaluate(() => { window.__ayahs = []; const sel = document.getElementById("ayahSelect"), d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    Object.defineProperty(sel, "value", { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, v); window.__ayahs.push(String(v)); } }); });
  await page.selectOption("#unitTypeSelect", "ruku"); await page.waitForTimeout(300);
  await page.click("#drillPlayBtn");
  const started = await page.waitForFunction(() => window.__aud.some((a) => /waqiah\.webm/.test(a.currentSrc || a.src) && a.currentTime > 0.3 && !a.paused), null, { timeout: 20000 }).then(() => true).catch(() => false);
  check(`A ${tag}: Play plays waqiah.webm and its clock moves`, started);
  // āyah 1 is 8.57 s to 16.52 s in the recording: the clock must be SEEKED there, not left at 0 (a file with no seek index would stay at 0)
  const inWindow = await page.waitForFunction(() => window.__aud.some((a) => /waqiah/.test(a.currentSrc) && a.currentTime >= 8.5 && a.currentTime <= 16.6), null, { timeout: 20000 }).then(() => true).catch(() => false);
  const t = await page.evaluate(() => { const a = window.__aud.find((x) => /waqiah/.test(x.currentSrc)); return a ? a.currentTime : -1; });
  const err = await page.evaluate(() => window.__aud.map((a) => a.error && a.error.code));
  check(`A ${tag}: no media error and the clock is inside āyah 1's window 8.57-16.52 s (t=${t.toFixed(2)}s)`, inWindow && err.every((e) => !e), JSON.stringify(err));
  const next = await page.waitForFunction(() => window.__ayahs.includes("2"), null, { timeout: 20000 }).then(() => true).catch(() => false);
  check(`C ${tag}: the run moves on to āyah 2 by itself`, next, JSON.stringify(await page.evaluate(() => window.__ayahs)));
  await page.screenshot({ path: `/tmp/waqiah-${lang}-${vp.width}.png` });
  await page.close(); await ctx.close();
}
await browser.close();
console.log(`\n==== waqiah browser${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
