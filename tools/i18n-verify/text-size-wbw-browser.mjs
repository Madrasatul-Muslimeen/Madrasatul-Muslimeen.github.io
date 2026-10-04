// The Owner, 4 Oct 2026: "Can you enable these words enlargeable, both in Read
// and Note view?" -- the Word-by-Word boxes under an ayah. The A± popover
// (text-size.js) gains a fourth slider, "Word by Word", that scales every box
// (its Arabic, transliteration and meaning); "All" and "Reset" include it; the
// Arabic/English/Bangla running text keeps its own sliders.
//
// Measured, never read off a property: computed font sizes before and after.
// Mutation: --mutate-no-css serves the page with the --qr-wbw-scale CSS
// removed, so the slider exists but changes nothing; the size checks fail.
// Run from the repository root with serve.js running.
import { readFileSync } from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUT = process.argv.includes("--mutate-no-css");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function open(lang, width, view) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 } });
  if (MUT) {
    let src = readFileSync("app/quranrevival.html", "utf8");
    const n = (src.match(/ \* var\(--qr-wbw-scale, 1\)/g) || []).length;
    if (n < 5) { console.log(`mutation did not apply (${n})`); process.exit(2); }
    src = src.replaceAll(" * var(--qr-wbw-scale, 1)", "");
    await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src }));
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (!t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.evaluate((v) => document.getElementById(v === "read" ? "tabReadBtn" : "tabNoteBtn").click(), view);
  await page.waitForFunction(() => [...document.querySelectorAll(".wbw-arabic")].some((e) => e.getBoundingClientRect().height > 0), null, { timeout: 15000 });
  return { ctx, page, errors };
}
const sizes = (page) => page.evaluate(() => {
  const vis = (sel) => [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().height > 0);
  const px = (sel) => { const e = vis(sel); return e ? parseFloat(getComputedStyle(e).fontSize) : null; };
  return { wbwAr: px(".wbw-arabic"), wbwGloss: px(".wbw-gloss"), wbwTr: px(".wbw-translit"), ayahAr: px(".ayah-arabic, .note-arabic") };
});
const prefix = (view) => (view === "read" ? "read" : "noteview");
async function openPopover(page, view) {
  const p = prefix(view);
  if (view === "note") {
    // The Note view's A± lives in its own ⋮ menu; open that first if the toggle is not on screen.
    const shown = await page.evaluate((p) => { const b = document.querySelector(`[data-text-size-toggle="${p}"]`); return !!b && b.getBoundingClientRect().height > 0; }, p);
    if (!shown) await page.evaluate(() => { [...document.querySelectorAll('[data-note-menu-toggle="tools"]')].find((b) => b.getBoundingClientRect().height > 0)?.click(); });
  }
  await page.evaluate((p) => document.querySelector(`[data-text-size-toggle="${p}"]`).click(), p);
  return p;
}
const slide = (page, p, kind, v) => page.evaluate(({ p, kind, v }) => {
  const s = document.querySelector(`[data-text-size-slider="${kind}"][data-text-size-for="${p}"]`);
  s.value = String(v); s.dispatchEvent(new Event("input", { bubbles: true }));
}, { p, kind, v });

for (const view of ["read", "note"]) {
  for (const lang of ["en", "bn"]) {
    for (const width of [390, 1280]) {
      const tag = `${view} ${lang} ${width}px`;
      const { ctx, page, errors } = await open(lang, width, view);
      const base = await sizes(page);
      check(`${tag}: POSITIVE CONTROL -- the Word-by-Word boxes are on screen`, base.wbwAr > 0 && base.wbwGloss > 0, JSON.stringify(base));
      const p = await openPopover(page, view);
      const row = await page.evaluate((p) => {
        const s = document.querySelector(`[data-text-size-slider="wbw"][data-text-size-for="${p}"]`);
        const label = s?.closest(".text-size-row")?.querySelector(".text-size-row-label");
        const r = s?.getBoundingClientRect();
        return { has: !!s, shown: !!r && r.width > 0, label: label?.textContent.trim() || "", labelCut: label ? label.scrollWidth > label.clientWidth + 1 : true };
      }, p);
      check(`${tag}: A± has a Word by Word slider, on screen`, row.has && row.shown, JSON.stringify(row));
      check(`${tag}: its label is in ${lang === "bn" ? "Bangla" : "English"} and not cut`, (lang === "bn" ? /[ঀ-৿]/.test(row.label) : row.label === "Word by Word") && !row.labelCut, JSON.stringify(row));
      await slide(page, p, "wbw", 1.5);
      await page.waitForTimeout(150);
      const big = await sizes(page);
      const near = (a, b) => Math.abs(a - b) < 0.6;
      check(`${tag}: Word by Word 150% enlarges the boxes' Arabic`, near(big.wbwAr, base.wbwAr * 1.5), JSON.stringify({ base, big }));
      check(`${tag}: ...and their meaning and transliteration`, near(big.wbwGloss, base.wbwGloss * 1.5) && (base.wbwTr == null || near(big.wbwTr, base.wbwTr * 1.5)), JSON.stringify({ base, big }));
      check(`${tag}: ...and leaves the ayah's own Arabic alone (it has its own slider)`, near(big.ayahAr, base.ayahAr), JSON.stringify({ base, big }));
      const stored = await page.evaluate(() => localStorage.getItem("mm_text_size_wbw"));
      check(`${tag}: the choice is remembered on this device`, stored === "1.5", String(stored));
      await slide(page, p, "wbw", 1.6);
      await page.waitForTimeout(150);
      const fit = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth, w: window.innerWidth,
        out: [...document.querySelectorAll(".wbw-word")].filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && (r.left < -1 || r.right > window.innerWidth + 1); }).length,
      }));
      check(`${tag}: at the largest size every box stays on screen, no sideways scroll`, fit.out === 0 && fit.sw <= fit.w + 1, JSON.stringify(fit));
      await page.evaluate((p) => document.querySelector(`[data-text-size-reset="${p}"]`).click(), p);
      await page.waitForTimeout(150);
      check(`${tag}: Reset brings the boxes back to their size`, near((await sizes(page)).wbwAr, base.wbwAr));
      await slide(page, p, "all", 1.2);
      await page.waitForTimeout(150);
      const all = await sizes(page);
      check(`${tag}: "All" moves the boxes with everything else`, near(all.wbwAr, base.wbwAr * 1.2) && near(all.ayahAr, base.ayahAr * 1.2), JSON.stringify(all));
      await page.evaluate((p) => document.querySelector(`[data-text-size-reset="${p}"]`).click(), p);
      check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
      await ctx.close();
    }
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
