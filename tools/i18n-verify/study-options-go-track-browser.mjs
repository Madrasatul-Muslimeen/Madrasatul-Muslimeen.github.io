// The Owner, 5 Oct 2026 (phone screenshot of Study options, Range 1-9 of
// Surah 36): "How about adding a 'go' button here, to straight away go to the
// page selected?" and "I pressed Track, the screen appeared but the option
// screen didn't move, still stayed over the read screen."
//
// Go: beside From/To, it closes Study options and opens the reading view at
// the chosen unit's first ayah (Range, Single Ayah and Page). Track: closes
// Study options so the Track card is on top (it opened UNDER the panel, which
// lives in the dock, a higher layer). en/bn, 360/390/768/1280.
// Track is also pressed straight from the landing page, where on a computer
// the Mastery Wheel window sits over it. Mutations: --mutate-go (Go does
// nothing), --mutate-track (Track leaves the panel open) and --mutate-layer
// (the Track card back on its old layer, 50): each fails its checks.
// Run from the repository root with serve.js.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MGO = process.argv.includes("--mutate-go"), MTRACK = process.argv.includes("--mutate-track"), MLAYER = process.argv.includes("--mutate-layer");
function mutated() {
  let src = fs.readFileSync("app/quranrevival.html", "utf8");
  const swap = (a, b) => { if (src.split(a).length !== 2) { console.log(`mutation did not apply: ${a.slice(0, 60)}`); process.exit(2); } src = src.replace(a, b); };
  if (MGO) swap('document.getElementById("unitGoBtn").addEventListener("click", () => { openReadingScreen(); });', "");
  if (MLAYER) swap("align-items: center; justify-content: center; z-index: 900; }", "align-items: center; justify-content: center; z-index: 50; }");
  if (MTRACK) swap('trackUnitBtn.addEventListener("click", () => { closeAllPanels(); openUnitWayModal(); });', 'trackUnitBtn.addEventListener("click", () => { openUnitWayModal(); });');
  return src;
}
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function start(lang, w, h) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h } });
  if (MGO || MTRACK || MLAYER) { const body = mutated(); await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body })); }
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  return { ctx, page, errors };
}
async function openOptions(page) {
  // Already open (a Go that did nothing leaves it open): nothing to do.
  if (await page.evaluate(() => !document.getElementById("panelStudyOptions").hidden)) return;
  await page.click("#tabStudyBtn"); await page.waitForTimeout(150);
  await page.click("#tabStudyOptionsBtn"); await page.waitForTimeout(250);
}
const state = (page) => page.evaluate(() => ({
  optionsHidden: document.getElementById("panelStudyOptions").hidden,
  readShown: !document.getElementById("readView").hidden,
  ayah: document.getElementById("ayahSelect").value,
}));

for (const lang of ["en", "bn"]) {
  for (const [w, h] of [[360, 640], [390, 844], [768, 1024], [1280, 800]]) {
    const tag = `${lang} ${w}px`;
    // --- Go, Range 3-5 ---
    {
      const { ctx, page, errors } = await start(lang, w, h);
      await openOptions(page);
      await page.selectOption("#unitTypeSelect", "range"); await page.waitForTimeout(250);
      await page.selectOption("#rangeFromSelect", "3"); await page.waitForTimeout(150);
      await page.selectOption("#rangeToSelect", "5"); await page.waitForTimeout(250);
      const g = await page.evaluate(() => {
        const b = document.getElementById("unitGoBtn"), to = document.getElementById("rangeToSelect");
        const panel = document.getElementById("panelStudyOptions");
        const r = b.getBoundingClientRect(), t = to.getBoundingClientRect(), p = panel.getBoundingClientRect();
        const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { text: b.textContent.trim(), w: r.width, h: r.height, rightOfTo: r.left >= t.right - 0.5, bottomsMeet: Math.abs(r.bottom - t.bottom) <= 1.5,
          inPanel: r.left >= p.left && r.right <= p.right + 0.5, reachable: at === b, cut: b.scrollWidth > b.clientWidth + 1 };
      });
      const before = await state(page);
      check(`${tag}: POSITIVE CONTROL -- options open, reading view not`, !before.optionsHidden && !before.readShown, JSON.stringify(before));
      check(`${tag}: a Go button sits right of "To", its bottom level with it`, g.rightOfTo && g.bottomsMeet, JSON.stringify(g));
      check(`${tag}: ...inside the panel, tappable, its word not cut, in ${lang === "bn" ? "Bangla" : "English"}`, g.inPanel && g.reachable && !g.cut && (lang === "bn" ? g.text === "যান" : g.text === "Go"), JSON.stringify(g));
      await page.click("#unitGoBtn"); await page.waitForTimeout(500);
      const s = await state(page);
      check(`${tag}: Go closes Study options and opens the reading view`, s.optionsHidden && s.readShown, JSON.stringify(s));
      check(`${tag}: ...at the range's first ayah (3)`, s.ayah === "3", s.ayah);
      check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
      await ctx.close();
    }
    // --- Go, Single Ayah 4; Track ---
    {
      const { ctx, page } = await start(lang, w, h);
      await openOptions(page);
      await page.selectOption("#unitTypeSelect", "ayah"); await page.waitForTimeout(250);
      await page.selectOption("#ayahSelect", "4"); await page.waitForTimeout(250);
      const shown = await page.evaluate(() => document.getElementById("unitGoBtn").getBoundingClientRect().width > 0);
      check(`${tag}: Go is offered for a Single Ayah too`, shown);
      await page.click("#unitGoBtn"); await page.waitForTimeout(500);
      const s = await state(page);
      check(`${tag}: Go on Ayah 4 opens the reading view at ayah 4`, s.optionsHidden && s.readShown && s.ayah === "4", JSON.stringify(s));
      await openOptions(page);
      check(`${tag}: POSITIVE CONTROL -- options open again before Track`, !(await state(page)).optionsHidden);
      await page.click("#trackUnitBtn"); await page.waitForTimeout(600);
      const t = await page.evaluate(() => {
        const ov = document.getElementById("wayModalOverlay"), card = document.getElementById("wayModalMount")?.firstElementChild;
        const r = card?.getBoundingClientRect();
        const at = r ? document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(30, r.height / 2)) : null;
        return { open: ov.classList.contains("open"), optsHidden: document.getElementById("panelStudyOptions").hidden, onTop: !!(at && card.contains(at)) };
      });
      check(`${tag}: Track opens the Track card`, t.open, JSON.stringify(t));
      check(`${tag}: ...and Study options closes, so the card is on top`, t.optsHidden && t.onTop, JSON.stringify(t));
      await ctx.close();
    }
    // --- Track straight from the landing page (the Mastery Wheel is showing) ---
    {
      const { ctx, page } = await start(lang, w, h);
      await openOptions(page);
      await page.click("#trackUnitBtn"); await page.waitForTimeout(600);
      const t = await page.evaluate(() => {
        const card = document.getElementById("wayModalMount")?.firstElementChild; const r = card?.getBoundingClientRect();
        const pts = []; if (r) for (const fy of [0.1, 0.5, 0.9]) for (const fx of [0.1, 0.5, 0.9]) { const e = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy); pts.push(!!e && card.contains(e)); }
        return { optsHidden: document.getElementById("panelStudyOptions").hidden, pts, wheelShown: (() => { const x = document.getElementById("wheelSection"); return !!x && x.getBoundingClientRect().width > 0; })() };
      });
      check(`${tag}: POSITIVE CONTROL -- the Mastery Wheel is on screen behind it`, t.wheelShown, JSON.stringify(t));
      check(`${tag}: from the landing page, the whole Track card is on top (9 points)`, t.optsHidden && t.pts.length === 9 && t.pts.every(Boolean), JSON.stringify(t));
      await page.click(".way-modal-close, [data-way-close], #wayModalMount button[aria-label='Close']", { timeout: 3000 }).catch(() => {});
      await ctx.close();
    }
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
