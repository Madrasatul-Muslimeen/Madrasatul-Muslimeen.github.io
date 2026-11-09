// MSA · QR J125 -- Word Card: a ☰ menu in the top-right corner; ⓘ and × sit to its left; the whole "Also in Bangla" block lives in
// the menu (nothing of it on the card until it is opened). Run from the repo root, serve.js on :8080.
//   node tools/i18n-verify/word-card-menu-browser.mjs [--mutate=outside]
//   --mutate=outside  the Bangla block is put back on the card (menu panel removed) -> "nothing of Bangla on the card" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
const MUTATE = process.argv.includes("--mutate=outside");
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const lang of ["en", "bn"]) for (const width of [320, 360, 390, 768, 1280]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) await ctx.route("**/app/js/quran-word-card.js*", (r) => { const s = fs.readFileSync("app/js/quran-word-card.js", "utf8").replace('data-word-card-bangla${context.menuOpen ? "" : " hidden"}>', 'data-word-card-bangla>'); r.fulfill({ status: 200, contentType: "text/javascript", body: s.replace("${context.banglaHtml ? menuPanelHtml(context, text) : \"\"}", "") + "" }); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(600);
  if (!(await page.evaluate(() => (document.getElementById("tabVocabularyBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabVocabularyBtn");
  await page.waitForFunction(() => document.querySelectorAll("#learnNextSheet .ln-row").length > 0, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-row="1"]')?.click());
  await page.waitForSelector("#quranWordCardMount .quran-word-card", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(700);
  const geo = () => page.evaluate(() => {
    const root = document.querySelector("#quranWordCardMount .quran-word-card"); const h = root.querySelector("header"), hr = h.getBoundingClientRect();
    const r = (s) => { const e = h.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, w: b.width, h: b.height }; };
    const menu = r("[data-word-card-menu-toggle]"), legend = r("[data-word-card-legend-toggle]"), close = r("[data-word-card-close]"), next = r('[data-word-card-move="next"]');
    const panel = root.querySelector("[data-word-card-menu-panel]");
    const vis = (e) => !!e && e.getBoundingClientRect().width > 0;
    const hb = [...h.querySelectorAll("button")].filter((b) => b.getBoundingClientRect().width > 0).map((b) => b.getBoundingClientRect());
    return { hr: { l: hr.left, r: hr.right, t: hr.top, b: hr.bottom }, menu, legend, close, next, panelVisible: vis(panel), bnVisible: [...root.querySelectorAll(".bnw-mark, [data-bangla-block]")].some(vis), minH: Math.min(...hb.map((b) => b.height)), minW: Math.min(...hb.map((b) => b.width)), hasPanel: !!panel };
  });
  const g = await geo();
  check(`${tag} the menu button is in the top-right corner (the last, rightmost tile of the header, ≥40px)`, !!g.menu && g.menu.w >= 40 && g.menu.h >= 40 && g.menu.r >= g.hr.r - 2 && [g.close, g.legend, g.next].every((x) => !x || x.r <= g.menu.l + 1 || x.t > g.menu.t + 10), JSON.stringify(g));
  check(`${tag} × sits right beside it, on its left`, !!g.close && Math.abs(g.close.t - g.menu.t) < 2 && g.close.r <= g.menu.l + 1 && g.menu.l - g.close.r < 12, JSON.stringify({ c: g.close, m: g.menu }));
  check(`${tag} ⓘ is left of the menu (same row) or, on a narrow card, on the second row; every header tile ≥40px and inside the card`, !!g.legend && g.legend.r <= g.hr.r + 1 && g.legend.l >= g.hr.l - 1 && g.minH >= 39.5 && g.minW >= 39.5, JSON.stringify({ l: g.legend, hr: g.hr, minH: g.minH }));
  check(`${tag} nothing of "Also in Bangla" shows on the card while the menu is shut`, g.hasPanel && !g.panelVisible && !g.bnVisible, JSON.stringify({ p: g.panelVisible, b: g.bnVisible }));
  await page.click("[data-word-card-menu-toggle]"); await page.waitForTimeout(300);
  // a mutated card may have no panel (--mutate=outside): the CHECK must fail, not the run, so this read is null-safe
  const o = await page.evaluate(() => { const root = document.querySelector("#quranWordCardMount .quran-word-card"); const p = root.querySelector("[data-word-card-menu-panel]")?.getBoundingClientRect() ?? { width: 0, left: 0, right: 0 }, c = root.getBoundingClientRect(); const mark = root.querySelector("[data-word-card-menu-panel] .bnw-mark"); const segs = [...root.querySelectorAll("[data-word-card-menu-panel] .bnw-seg")].length; return { open: p.width > 0, inside: p.left >= c.left - 1 && p.right <= c.right + 1, mark: !!mark && mark.getBoundingClientRect().width > 0, segs, expanded: root.querySelector("[data-word-card-menu-toggle]")?.getAttribute("aria-expanded"), markH: mark ? mark.getBoundingClientRect().height : 0 }; });
  check(`${tag} tapping ☰ opens a panel inside the card holding the Bangla mark button and the Admin's / Mine list`, o.open && o.inside && o.mark && o.segs >= 2 && o.expanded === "true" && o.markH >= 40, JSON.stringify(o));
  if (width === 320 || width === 390 || width === 1280) await page.screenshot({ path: `/tmp/j125-${lang}-${width}-${MUTATE ? "mut" : "ok"}.png` });
  await page.click("[data-word-card-menu-panel] .bnw-seg:nth-of-type(2), [data-word-card-menu-panel] [data-bangla-list]").catch(() => {});
  await page.waitForTimeout(400);
  const still = await page.evaluate(() => document.querySelector("#quranWordCardMount [data-word-card-menu-panel]")?.getBoundingClientRect().width > 0);
  check(`${tag} a tap inside the panel keeps it open (the card re-renders)`, still);
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  const shut = await page.evaluate(() => !(document.querySelector("#quranWordCardMount [data-word-card-menu-panel]")?.getBoundingClientRect().width > 0));
  check(`${tag} Esc closes it`, shut);
  await page.close(); await ctx.close();
}
await browser.close();
console.log(`\n==== J125 Word Card menu${MUTATE ? " [mutated: outside]" : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
