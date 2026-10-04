// Decision 64 (4 Oct 2026) -- Choose a Unit carries Read and Play: the next
// step after choosing. RENDERED, in a real browser, at 320/360/390/600/768/1280,
// English and Bangla.
//
//   node tools/i18n-verify/wheel-unit-go-browser.mjs            (repo root, node serve.js running)
//   --mutate-no-play   Play stops calling playCurrentSelection(): the Play checks must fail
//   --mutate-read-plays  Read also calls playCurrentSelection(): "Read starts no audio" must fail
//   --mutate-no-close  removes Read's own closeAllBarPalettes(): still PASSES, because
//                      openReadingScreen() closes every palette itself (line ~9468) --
//                      so the explicit close is belt-and-braces, and recorded as such.
//
// Audio cannot load in the sandbox, so "playback started" is a count of calls
// to HTMLMediaElement.prototype.play, read in the SAME task as the click (the
// gesture rule: nothing may be awaited before playCurrentSelection()).
import { chromium, newContext, openPage } from "./harness.mjs";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const MUT_PLAY = process.argv.includes("--mutate-no-play");
const MUT_CLOSE = process.argv.includes("--mutate-no-close");
const MUT_READPLAY = process.argv.includes("--mutate-read-plays");

const WIDTHS = [[320, 640], [360, 740], [390, 844], [600, 960], [768, 1024], [1280, 800]];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const real = (errors) => errors.filter((e) => !/Failed to load resource: net::ERR_|ERR_CERT/.test(e));
const waitWheel = (page) => page.waitForFunction(() => document.querySelectorAll("#wheelContainer .wheel-seg").length > 0, null, { timeout: 20000 });

// Mutations edit a throwaway copy of the page, never the app file.
let target = "/app/quranrevival.html", tmp = null;
if (MUT_PLAY || MUT_CLOSE || MUT_READPLAY) {
  let src = readFileSync("app/quranrevival.html", "utf8");
  const before = src;
  if (MUT_PLAY) src = src.replace(/(getElementById\("wheelUnitPlayBtn"\)[^]*?openReadingScreen\(\);\s*)playCurrentSelection\(\);/, "$1");
  if (MUT_CLOSE) src = src.replace(/(getElementById\("wheelUnitReadBtn"\)\?\.addEventListener\("click", \(\) => \{\s*)closeAllBarPalettes\(null\);/, "$1");
  if (MUT_READPLAY) src = src.replace(/(getElementById\("wheelUnitReadBtn"\)[^]*?openReadingScreen\(\);)/, "$1 playCurrentSelection();");
  if (src === before) { console.log("mutation did not apply"); process.exit(2); }
  tmp = "app/_mut-quranrevival.html"; writeFileSync(tmp, src); target = "/app/_mut-quranrevival.html";
}

async function open(lang, [w, h]) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width: w, height: h } });
  await ctx.addInitScript(() => {
    window.__plays = 0;
    const p = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...a) { window.__plays++; return p.apply(this, a); };
  });
  const { page, errors } = await openPage(ctx, target);
  await waitWheel(page);
  await page.click("#wheelCtaBtn");
  await page.waitForTimeout(250);
  return { ctx, page, errors };
}
const setUnit = (page, unit) => page.evaluate((u) => { const s = document.getElementById("wheelUnitTypeSelect"); s.value = u; s.dispatchEvent(new Event("change")); }, unit);
const openPalette = async (page) => { if ((await page.getAttribute("#wheelUnitBtn", "aria-expanded")) !== "true") await page.click("#wheelUnitBtn"); await page.waitForTimeout(150); };
const readViewShown = (page) => page.evaluate(() => { const r = document.getElementById("readView"); const b = r.getBoundingClientRect(); return !r.hidden && getComputedStyle(r).display !== "none" && b.width > 0 && b.height > 0; });
const paletteState = (page) => page.evaluate(() => {
  const p = document.querySelector(".wheel-unit-palette"), b = p.getBoundingClientRect();
  return { shown: getComputedStyle(p).display !== "none" && getComputedStyle(p).visibility !== "hidden" && b.width > 0, expanded: document.getElementById("wheelUnitBtn").getAttribute("aria-expanded") };
});

for (const lang of ["en", "bn"]) for (const vp of WIDTHS) {
  const tag = `[${vp[0]} ${lang}]`;
  console.log(`\n=== ${tag} ===`);
  let { ctx, page, errors } = await open(lang, vp);
  await openPalette(page);
  const g = await page.evaluate(() => {
    const pal = document.querySelector(".wheel-unit-palette").getBoundingClientRect();
    const out = {};
    for (const id of ["wheelUnitReadBtn", "wheelUnitPlayBtn"]) {
      const e = document.getElementById(id);
      if (!e) { out[id] = null; continue; }
      const b = e.getBoundingClientRect(), svg = e.querySelector("svg");
      out[id] = { l: b.left, r: b.right, t: b.top, bt: b.bottom, w: b.width, h: b.height, text: e.textContent.trim(), svgHidden: svg?.getAttribute("aria-hidden") === "true" };
    }
    out.pal = { l: pal.left, r: pal.right, t: pal.top, b: pal.bottom };
    out.vw = document.documentElement.clientWidth; out.vh = window.innerHeight;
    out.sideways = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return out;
  });
  const [R, P] = [g.wheelUnitReadBtn, g.wheelUnitPlayBtn];
  check(`${tag} both buttons exist`, !!R && !!P);
  if (R && P) {
    const inPal = (x) => x.l >= g.pal.l - 0.5 && x.r <= g.pal.r + 0.5 && x.t >= g.pal.t - 0.5 && x.bt <= g.pal.b + 0.5;
    const inVp = (x) => x.l >= -0.5 && x.r <= g.vw + 0.5 && x.t >= -0.5 && x.bt <= g.vh + 0.5;
    check(`${tag} inside the open palette's box and inside the viewport`, inPal(R) && inPal(P) && inVp(R) && inVp(P), JSON.stringify(g));
    check(`${tag} the whole palette is on screen`, g.pal.l >= -0.5 && g.pal.r <= g.vw + 0.5 && g.pal.t >= -0.5 && g.pal.b <= g.vh + 0.5, JSON.stringify(g.pal));
    check(`${tag} each at least 40px tall, equal in width`, R.h >= 39.5 && P.h >= 39.5 && Math.abs(R.w - P.w) < 1, `${R.h}/${P.h} ${R.w}/${P.w}`);
    check(`${tag} 8px gap between them`, Math.abs(P.l - R.r - 8) < 1, `${P.l - R.r}`);
    check(`${tag} icons are aria-hidden`, R.svgHidden && P.svgHidden);
    const want = lang === "bn" ? ["পড়ুন", "চালান"] : ["Read", "Play"];
    check(`${tag} labels are ${want.join("/")}`, R.text === want[0] && P.text === want[1], `${R.text}/${P.text}`);
  }
  if (vp[0] === 320) check(`${tag} no sideways scroll`, g.sideways <= 0, String(g.sideways));
  if (vp[0] === 390 || vp[0] === 600) await page.screenshot({ path: `/tmp/wheel-unit-go-${lang}-${vp[0]}.png` });
  await ctx.close();

  // ---- Read: Page 257 -----------------------------------------------------
  ({ ctx, page, errors } = await open(lang, vp));
  await openPalette(page);
  await setUnit(page, "page"); await page.waitForTimeout(250); await openPalette(page);
  await page.selectOption("#wheelUnitNumSelect", "257"); await page.waitForTimeout(400); await openPalette(page);
  check(`${tag} (positive control) reading view is NOT shown before Read`, !(await readViewShown(page)));
  await page.click("#wheelUnitReadBtn");
  await page.waitForFunction(() => { const r = document.getElementById("readView"); return r && !r.hidden && r.getBoundingClientRect().height > 0; }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  const rd = await page.evaluate(() => ({ surah: document.getElementById("surahSelect").value, unit: document.getElementById("unitTypeSelect").value, num: document.getElementById("unitNumSelect").value, plays: window.__plays, text: document.getElementById("readView").innerText.slice(0, 400) }));
  check(`${tag} Read opens the rendered reading view`, await readViewShown(page));
  check(`${tag} it is Page 257 and #surahSelect is 14`, rd.unit === "page" && rd.num === "257" && rd.surah === "14", JSON.stringify(rd));
  check(`${tag} the reading view has content`, rd.text.trim().length > 20, rd.text);
  check(`${tag} Read starts no audio`, rd.plays === 0, String(rd.plays));
  const ps = await paletteState(page);
  check(`${tag} after Read the palette is hidden and aria-expanded=false`, !ps.shown && ps.expanded === "false", JSON.stringify(ps));
  check(`${tag} no page errors (Read)`, real(errors).length === 0, real(errors).slice(0, 3).join(" | "));
  await ctx.close();

  // ---- Play: range 2:1-5 --------------------------------------------------
  ({ ctx, page, errors } = await open(lang, vp));
  await openPalette(page);
  await page.selectOption("#wheelUnitSurahSelect", "2"); await page.waitForTimeout(300); await openPalette(page);
  await setUnit(page, "range"); await page.waitForTimeout(300); await openPalette(page);
  await page.selectOption("#wheelUnitFromSelect", "1"); await page.waitForTimeout(150);
  await page.selectOption("#wheelUnitToSelect", "5"); await page.waitForTimeout(300); await openPalette(page);
  const pre = await page.evaluate(() => ({ s: document.getElementById("surahSelect").value, u: document.getElementById("unitTypeSelect").value }));
  check(`${tag} the canonical controls mirror the palette (range, Surah 2)`, pre.s === "2" && pre.u === "range", JSON.stringify(pre));
  // Click and count in ONE task: no await between the tap and the read.
  const plays = await page.evaluate(() => { const before = window.__plays; document.getElementById("wheelUnitPlayBtn").click(); return window.__plays - before; });
  check(`${tag} Play starts playback in the same click`, plays >= 1, String(plays));
  await page.waitForTimeout(500);
  check(`${tag} Play opens the reading screen`, await readViewShown(page));
  const ps2 = await paletteState(page);
  check(`${tag} after Play the palette is hidden and aria-expanded=false`, !ps2.shown && ps2.expanded === "false", JSON.stringify(ps2));
  check(`${tag} no page errors (Play)`, real(errors).length === 0, real(errors).slice(0, 3).join(" | "));
  await ctx.close();
}

await browser.close();
if (tmp) try { unlinkSync(tmp); } catch {}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
