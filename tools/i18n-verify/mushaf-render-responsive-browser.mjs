// Audit part 79 (24 Oct 2026, MSA Architect's finding to the QR Lead): a 🔖 tap during a long surah's Mushaf render
// waited seconds for the pop-up, in English and Bangla, at 390 and 1280px.
//
// Measured before the fix (Al-Baqarah, Whole Surah, Mushaf on, latencyMs 0): a tap with ~36 of 48 pages drawn opened
// the pop-up 1.9 s later, and one at 47 pages 2.4 s later (the Architect measured 5.5-6.5 s on its machine). Profiled:
// 78% of the render was justifyPageLines() clearing and measuring one line at a time, each measurement laying out every
// page already drawn, so each page cost more than the last. Two more costs: the ResizeObserver's first report justified
// every page a second time, and with the fonts already loaded the whole surah was drawn in ONE task (1.25 s).
//
// Proved here:
//   1. A real 🔖 tap made while the first render is still drawing (>= 30 pages drawn, < 48) opens the pop-up within 800 ms.
//      POSITIVE CONTROL: the render really was still running when the tap was made.
//   2. A second render (fonts loaded: Mushaf off, then on again) has no task longer than 120 ms while the pages are
//      drawn, and draws all 48 pages within 1,500 ms of the first. POSITIVE CONTROL: all 48 pages were drawn and their
//      lines were justified (scaleX on the lines). Measured at en 1280 here: fix 465 ms and no task over 50 ms;
//      interleave 4,145 ms; rotwice 1,239 ms with 180-280 ms tasks; noyield 387-596 ms tasks.
// Run from the repository root with serve.js running. Mutations (--mutate=NAME) put each cost back:
//   interleave  clear, measure and scale one line at a time again  -> 2 (task length and total time)
//   noyield     no turn for the browser between pages              -> 2 (task length)
//   rotwice     the observer's first report justifies again        -> 2 (task length)
// Check 1 is a REGRESSION GUARD of the whole fix: with the yield in place a tap waits behind one page at most, so no
// single mutation fails it; with all three put back ("all") it fails, which is the bug as reported.
// DEBUG=1 prints the second render's time per page; LANGS=en and W=1280 run one case.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  interleave: [
    ['  lines.forEach((lineEl) => { lineEl.style.transform = ""; });\n  const naturals = lines.map((lineEl) => {', '  const naturals = lines.map((lineEl) => {\n    lineEl.style.transform = "";'],
    // ...and scale each line as soon as it is measured, as before: write, then the next line's read forces a layout.
    ["    return Math.max(lineEl.offsetWidth, lineEl.scrollWidth);\n  });",
     "    const n0 = Math.max(lineEl.offsetWidth, lineEl.scrollWidth);\n    if (n0) { lineEl.style.transformOrigin = \"right center\"; lineEl.style.transform = `scaleX(${Math.max(0.8, Math.min(1.5, targetWidth / n0)).toFixed(4)})`; }\n    return n0;\n  });"],
  ],
  noyield: [["    if (p !== pages[pages.length - 1]) await yieldToBrowser();", ""]],
  rotwice: [["  let lastWidth = justifiedAt;", "  let lastWidth = 0;"]],
};
MUT.all = [...MUT.interleave, ...MUT.noyield, ...MUT.rotwice];
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const ignorable = (e) => /ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource|quran\.foundation/i.test(e);
const browser = await chromium.launch();
async function open({ lang, w, h }) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    await ctx.route("**/app/js/hifz-renderer.js*", async (r) => {
      let src = fs.readFileSync("app/js/hifz-renderer.js", "utf8");
      for (const [a, b] of MUT[MUTATE]) {
        const n = src.split(a).length - 1;
        if (!n) throw new Error(`mutation anchor missing: ${MUTATE}`);
        src = src.split(a).join(b);
      }
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src });
    });
    console.log(`  (mutation ${MUTATE}: ${MUT[MUTATE].length} anchor(s) replaced)`);
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page, errors };
}
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
const toggleMushaf = (page, on) => page.evaluate((v) => { const t = document.getElementById("mushafToggle"); t.checked = v; t.dispatchEvent(new Event("change", { bubbles: true })); }, on);
const drawn = (page) => page.evaluate(() => document.querySelectorAll(".hifz-page[data-mushaf-page]").length);
async function waitPages(page, n, ms = 30000) {
  for (const end = Date.now() + ms; Date.now() < end;) { if ((await drawn(page)) >= n) return true; await page.waitForTimeout(40); }
  return false;
}
async function readSurah(page) {
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", "2"); await page.waitForTimeout(1500);
  await setSel(page, "unitTypeSelect", "surah"); await page.waitForTimeout(800);
}

for (const lang of (process.env.LANGS || "en,bn").split(",")) {
  for (const [w, h] of [[390, 844], [1280, 800]].filter(([x]) => !process.env.W || String(x) === process.env.W)) {
    const tag = `[${lang} ${w}]`;
    const { ctx, page, errors } = await open({ lang, w, h });
    await readSurah(page);
    // 1. The tap during the first render. The click is timed in the page (capture listener -> pop-up in the DOM) so
    //    Playwright's own waiting is not counted; the pop-up is polled from Node.
    await page.evaluate(() => {
      window.__rr = {};
      document.addEventListener("click", (e) => { if (e.target.id === "readBarBookmarkBtn" && !__rr.tap) { __rr.tap = performance.now(); __rr.pagesAtTap = document.querySelectorAll(".hifz-page[data-mushaf-page]").length; } }, true);
      new MutationObserver(() => { if (__rr.tap && !__rr.pop && document.querySelector(".bm-popover")) __rr.pop = performance.now(); }).observe(document.body, { childList: true, subtree: true });
    });
    await toggleMushaf(page, true);
    await waitPages(page, 30);
    const tapAt = await page.evaluate(() => performance.now());
    // A real tap (mouse events through the browser's input queue), never element.click(): that runs at once inside
    // the evaluate and skips the very queue this checks.
    await page.click("#readBarBookmarkBtn", { force: true, noWaitAfter: true, timeout: 10000 });
    for (const end = Date.now() + 10000; Date.now() < end;) { if (await page.evaluate(() => !!__rr.pop)) break; await page.waitForTimeout(25); }
    const r = await page.evaluate(() => __rr);
    check(`${tag} POSITIVE CONTROL -- the tap came while the first render was still drawing (${r.pagesAtTap} of 48 pages)`, r.pagesAtTap >= 30 && r.pagesAtTap < 48, JSON.stringify(r));
    const waited = r.pop && r.tap ? Math.round(r.pop - tapAt) : null;
    check(`${tag} the 🔖 pop-up opens within 800 ms of the tap (${waited} ms)`, waited !== null && waited <= 800, JSON.stringify({ waited, r }));
    await page.keyboard.press("Escape");
    await page.evaluate(() => document.querySelectorAll(".bm-popover").forEach((el) => el.remove()));
    await waitPages(page, 48);
    await page.waitForTimeout(800);

    // 2. A second render, fonts loaded: no long freeze while the pages are drawn.
    await toggleMushaf(page, false);
    await page.waitForTimeout(1500);
    await page.evaluate(() => { window.__pt = []; new MutationObserver(() => { const n = document.querySelectorAll(".hifz-page[data-mushaf-page]").length; if (n && n !== __pt.length) __pt.push(performance.now()); }).observe(document.getElementById("pageViewContainer"), { childList: true, subtree: true }); });
    await page.evaluate(() => { window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => __lt.push(Math.round(e.duration)))).observe({ type: "longtask" }); });
    await toggleMushaf(page, true);
    const all = await waitPages(page, 48);
    await page.waitForTimeout(500);
    const lt = await page.evaluate(() => __lt);
    const pt = await page.evaluate(() => __pt);
    if (process.env.DEBUG) { const d = pt.slice(1).map((t, i) => Math.round(t - pt[i])); console.log("  page ms", pt.length, "total", Math.round(pt.at(-1) - pt[0]), JSON.stringify(d)); }
    const scaled = await page.evaluate(() => [...document.querySelectorAll(".hifz-page[data-mushaf-page] .hifz-line:not(.centered)")].filter((l) => /scaleX/.test(l.style.transform)).length);
    check(`${tag} POSITIVE CONTROL -- the second render drew all 48 pages and justified their lines (${scaled} lines scaled)`, all && scaled > 48 * 10, JSON.stringify({ all, scaled }));
    const longest = lt.length ? Math.max(...lt) : 0;
    check(`${tag} the second render has no task over 120 ms (longest ${longest} ms, ${lt.length} long tasks)`, longest <= 120, JSON.stringify(lt));
    const total = pt.length >= 48 ? Math.round(pt[47] - pt[0]) : null;
    check(`${tag} the second render draws all 48 pages within 1,500 ms of the first (${total} ms)`, total !== null && total <= 1500, JSON.stringify({ pages: pt.length, total }));
    check(`${tag} no page errors`, errors.filter((e) => !ignorable(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Audit part 79: the Mushaf render leaves room for a tap: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
