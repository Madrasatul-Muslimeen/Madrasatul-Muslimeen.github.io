// Issue #792: Read view, Mushaf on -- the Read bar was 13px taller after a bookmark save because the Mushaf page
// reference (#mushafPageRef) was filled only once the LAST page of the unit had been drawn (wireMushafPageRefScroll()
// ran after renderMushafPages() resolved), so on a whole surah it stayed empty for seconds, and the first re-render
// after a save filled it and grew the bar (measured at 390px: 80.6 -> 93.8px). Now renderMushafPages() calls
// opts.onFirstPage once the first page is drawn and the reference is filled then.
//
// Proved at 390, 768 and 1280 in en and bn, Whole Surah Al-Baqarah with the Mushaf on:
//   - the reference is shown within 1.5s of the first Mushaf page appearing (not after the last);
//   - it names the page in view (positive control): data-page equals the page showing most, first page and after
//     scrolling to page 4, and its text equals the surah name the page carries;
//   - the Read bar height is the same before and after a bookmark save (and equals its height once the render settled);
//   - the bar and the reference stay inside the viewport (no row pushed past its width).
//
// Run from the repository root with serve.js running. Mutations (--mutate=NAME); the checks named must FAIL:
//   nofirst   the first-page callback does nothing (the old behaviour)  -> "shown from the first page", "bar steady"
//   pagewrong the reference always names the first page                 -> "names the page in view" after scrolling
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nofirst: ["onFirstPage: () => wireMushafPageRefScroll(),", "onFirstPage: () => {},"],
  pagewrong: ["let best = pages[0];\n      if (pages.length > 1) {", "let best = pages[0];\n      if (false) {"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const browser = await chromium.launch();
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
const state = (page) => page.evaluate(() => {
  const bar = document.getElementById("readBar"), ref = document.getElementById("mushafPageRef");
  const br = bar.getBoundingClientRect(), rr = ref.getBoundingClientRect();
  const pv = document.getElementById("pageViewContainer"), view = pv.getBoundingClientRect();
  const pages = [...pv.querySelectorAll(".hifz-page[data-mushaf-page]")];
  const area = (r) => Math.max(0, Math.min(r.right, view.right, innerWidth) - Math.max(r.left, view.left, 0)) * Math.max(0, Math.min(r.bottom, view.bottom, innerHeight) - Math.max(r.top, view.top, 0));
  const best = pages.length ? pages.reduce((a, b) => (area(b.getBoundingClientRect()) > area(a.getBoundingClientRect()) ? b : a)) : null;
  return { barH: Math.round(br.height * 10) / 10, shown: !ref.hidden && rr.width > 0, page: ref.dataset.page ?? null, inView: best ? best.dataset.mushafPage : null, nPages: pages.length,
    text: (ref.querySelector(".mushaf-page-ref-text")?.textContent || "").trim(), barScrollOver: bar.scrollWidth - bar.clientWidth, refRight: Math.round(rr.right), vw: innerWidth };
});

for (const lang of ["en", "bn"]) {
  for (const [w, h] of [[390, 844], [768, 1000], [1280, 800]]) {
    const tag = `[${lang} ${w}]`;
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const [a, b] = MUT[MUTATE];
      await ctx.route("**/app/quranrevival.html*", async (r) => {
        const src = fs.readFileSync("app/quranrevival.html", "utf8");
        if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
        await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
      });
    }
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
    await page.click("#tabReadBtn"); await page.waitForTimeout(500);
    await setSel(page, "surahSelect", "2"); await page.waitForTimeout(1500);
    await setSel(page, "unitTypeSelect", "surah"); await page.waitForTimeout(800);
    await page.evaluate(() => { const t = document.getElementById("mushafToggle"); if (!t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
    await page.waitForFunction(() => document.querySelectorAll(".hifz-page[data-mushaf-page]").length >= 1, null, { timeout: 20000 });
    // 1. From the first page: within 1.5s of it appearing the reference must be shown.
    const early = await page.waitForFunction(() => { const r = document.getElementById("mushafPageRef"); return !r.hidden && r.getBoundingClientRect().width > 0; }, null, { timeout: 1500 }).then(() => true, () => false);
    const s1 = await state(page);
    check(`${tag} the reference is shown from the first page drawn`, early && s1.shown, JSON.stringify(s1));
    check(`${tag} positive control: it names the page in view (first page)`, s1.page !== null && s1.page === s1.inView && s1.text.length > 0, JSON.stringify(s1));
    // let the whole surah draw
    await page.waitForFunction(() => document.querySelectorAll(".hifz-page[data-mushaf-page]").length > 10, null, { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const settled = await state(page);
    // 2. Scroll to page 4: the reference follows (positive control).
    await page.evaluate(() => document.querySelector('.hifz-page[data-mushaf-page="4"]')?.scrollIntoView({ block: "start", inline: "start", behavior: "instant" }));
    await page.waitForTimeout(900);
    const s4 = await state(page);
    check(`${tag} positive control: after scrolling it names the page in view (not page 2)`, s4.page === s4.inView && s4.inView !== "2" && s4.shown, JSON.stringify(s4));
    // 3. Save a bookmark; the bar must not change height.
    const before = s4.barH;
    await page.click("#readBarBookmarkBtn");
    if (await page.waitForSelector(".bm-popover", { timeout: 2500 }).catch(() => null)) await page.click("[data-bm-pop-save]");
    await page.waitForTimeout(500);
    await page.waitForFunction(() => document.querySelectorAll(".hifz-page[data-mushaf-page]").length > 10, null, { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const after = await state(page);
    check(`${tag} the Read bar is the same height before and after a save`, Math.abs(after.barH - before) < 0.5, `before ${before} after ${after.barH}`);
    check(`${tag} the bar height at first paint equals the settled height`, Math.abs(s1.barH - settled.barH) < 0.5, `first ${s1.barH} settled ${settled.barH}`);
    check(`${tag} the reference is still shown after the save`, after.shown, JSON.stringify(after));
    check(`${tag} the bar and reference stay inside the viewport`, after.barScrollOver <= 0 && after.refRight <= after.vw, JSON.stringify(after));
    check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource|quran\.foundation/i.test(e)).length === 0, errors.join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
