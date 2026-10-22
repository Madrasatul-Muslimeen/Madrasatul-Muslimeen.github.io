// PCF MSA J74 (the Owner's tick n72b B, 22 Oct 2026: "Also show each page as a window at the home size over the landing
// screen"). On a computer a link in the Qur'an page's menus opens its page in a window (app/js/page-window.js) at the
// home rect (home-window.js), over the landing screen:
// (1) Records and Hadith open in the window, at exactly the home rect; the landing screen stays where it was.
// (2) The page inside has no menu row and no Zab bar of its own (nav.js / sw-register.js, ?inWindow=1), its heading shows.
// (3) ← Back (40px) closes it; so do ✕ and Escape; ↗ opens the page itself, full size.
// (4) Resizing the window from its corner sets the shared home rect.
// (5) On a phone (390) a menu link is a plain link, as before (the page with its ← Back chip).
// Run from the repository root, serve.js on :8080 (QR_BASE for another port).
//   --mutate=nowindow  the menus keep plain links          -> (1) fails
//   --mutate=nohide    the page inside keeps its menu row   -> (2) fails
//   --mutate=noback    ← Back does nothing                  -> (3) fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nowindow: ["js/page-window.js", "  navEl.addEventListener(\"click\", (e) => {", "  if (true) return;\n  navEl.addEventListener(\"click\", (e) => {"],
  nohide: ["js/nav.js", "html.in-window .app-nav, ", ""],
  noback: ["js/page-window.js", "back.addEventListener(\"click\", closePageWindow);", "void 0;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function start(lang, width, height) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await P.waitForTimeout(1000);
  return { ctx, P, errors };
}
const clickMenu = (P, file) => P.evaluate((f) => { const a = [...document.querySelectorAll(".app-nav a.nav-link[href]")].find((x) => x.getAttribute("href").startsWith(f)); if (!a) return null; a.closest("details")?.setAttribute("open", ""); a.click(); return a.textContent.trim(); }, file);
const winState = (P) => P.evaluate(() => { const w = document.getElementById("pageWindow"); if (!w || w.hidden) return null; const r = w.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), title: w.querySelector(".pgw-title")?.textContent ?? "" }; });
const home = (P) => P.evaluate(() => JSON.parse(localStorage.getItem("mmsa-home-window-v1") || "null"));
const same = (a, b) => !!a && !!b && Math.abs(a.x - b.x) <= 2 && Math.abs(a.y - b.y) <= 2 && Math.abs(a.w - b.w) <= 2 && Math.abs(a.h - b.h) <= 2;
const frameOf = async (P, file) => { for (let i = 0; i < 60; i++) { const f = P.frames().find((x) => x.url().includes(`/app/${file}`) && /inWindow=1/.test(x.url())); if (f) return f; await P.waitForTimeout(100); } return null; };

for (const lang of ["en", "bn"]) {
  const tag = `[${lang} 1440]`;
  const { ctx, P, errors } = await start(lang, 1440, 900);
  for (const file of ["records.html", "hadith-study.html"]) {
    const label = await clickMenu(P, file);
    await P.waitForTimeout(1500);
    const st = await winState(P), hr = await home(P);
    check(`${tag} ${file}: the menu link "${label}" opens the page in a window at the home rect, over the landing screen`, !!st && same(st, hr) && st.title === label && /quranrevival\.html/.test(P.url()), JSON.stringify({ st, hr, url: P.url() }));
    const F = await frameOf(P, file);
    await F?.waitForSelector("h1", { timeout: 15000 }).catch(() => {});
    const inside = F ? await F.evaluate(() => ({ nav: getComputedStyle(document.querySelector(".app-nav")).display, h1: !!document.querySelector("h1")?.getBoundingClientRect().height, zab: !!document.getElementById("zabBar")?.getBoundingClientRect().height })) : null;
    check(`${tag} ${file}: inside, no menu row and no Zab bar of its own; its heading shows`, !!inside && inside.nav === "none" && inside.h1 && !inside.zab, JSON.stringify(inside));
    const back = await P.evaluate(() => { const b = document.querySelector("#pageWindow [data-pgw-back]"); const r = b?.getBoundingClientRect(); return r ? { h: r.height, t: b.textContent } : null; });
    check(`${tag} ${file}: ← Back is on the window's bar, 40px`, !!back && back.h >= 39.5 && /←/.test(back.t), JSON.stringify(back));
    await P.click("#pageWindow [data-pgw-back]"); await P.waitForTimeout(300);
    check(`${tag} ${file}: ← Back closes it, back on the landing screen`, !(await winState(P)) && /quranrevival\.html/.test(P.url()) && (await P.evaluate(() => document.getElementById("wheelPopupView").getBoundingClientRect().width > 0)));
  }
  await clickMenu(P, "records.html"); await P.waitForTimeout(1200);
  await P.click("#pageWindow [data-pgw-close]"); await P.waitForTimeout(250);
  check(`${tag} ✕ closes it`, !(await winState(P)));
  await clickMenu(P, "records.html"); await P.waitForTimeout(1200);
  await P.keyboard.press("Escape"); await P.waitForTimeout(250);
  check(`${tag} Escape closes it`, !(await winState(P)));
  // (4) resize from the corner
  await clickMenu(P, "records.html"); await P.waitForTimeout(1200);
  const se = await P.evaluate(() => { const b = document.querySelector('#pageWindow .pgw-h[data-h="se"]').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  const before = await winState(P);
  await P.mouse.move(se.x, se.y); await P.mouse.down(); await P.mouse.move(se.x - 100, se.y - 60, { steps: 6 }); await P.mouse.up(); await P.waitForTimeout(250);
  const after = await winState(P), hr2 = await home(P);
  check(`${tag} its corner resizes it, and that becomes the shared home rect`, !!after && Math.abs(after.w - (before.w - 100)) <= 2 && Math.abs(after.h - (before.h - 60)) <= 2 && same(after, hr2), JSON.stringify({ before, after, hr2 }));
  // ↗ the page itself
  await Promise.all([P.waitForNavigation({ waitUntil: "networkidle" }), P.click("#pageWindow [data-pgw-full]")]);
  check(`${tag} ↗ opens the page itself, full size`, /\/app\/records\.html/.test(P.url()) && !/inWindow/.test(P.url()), P.url());
  check(`${tag} no page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
// (5) a phone
{
  const { ctx, P } = await start("en", 390, 844);
  await Promise.all([P.waitForNavigation({ waitUntil: "networkidle" }), clickMenu(P, "records.html")]);
  await P.waitForTimeout(800);
  const chip = await P.evaluate(() => !!document.querySelector("[data-bm-back] .bm-back")?.getBoundingClientRect().width);
  check("[en 390] on a phone the menu link opens the page itself, with its ← Back chip", /\/app\/records\.html\?navBack=1/.test(P.url()) && chip, P.url());
  await ctx.close();
}
await browser.close();
console.log(`\n==== Menu pages as windows over the landing screen (J74): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
