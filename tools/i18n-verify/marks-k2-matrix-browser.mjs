// PCF MSA J03 K2, the Architect's review matrix (4 Nov 2026): 360/390, 768, 1024, 1440 x en/bn x text 100/150/200%.
// At every cell the three marks on the Āyah card and on the Word card, and the Marks wheel with its view switch, must be whole:
// no mark or switch label cut (scrollWidth <= clientWidth), each inside its card/window, the wheel on screen, no sideways
// scroll, and every mark button at least 40px tall. Real-length names (the longest Bangla one is "অনুশীলন দরকার"). Screenshots of
// the tightest cells go to /tmp/marks-k2-matrix-*.png and are LOOKED at.
// --mutate=cut  gives a mark button a fixed 60px width -> the cut check fails.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { if (ok) { pass++; } else { fail++; console.log(`  FAIL  ${name} ${detail}`); } };
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const SEED = `\nDATA.ayahKeyMarks = [{ _id: "t1__p1__1", tenantId: "t1", scope: "p1", surah: 1, entries: { "ayah:1:2": ["hard","practice","done"], "qword:1:1:1": ["practice","done"] }, schemaVersion: 1, createdAt: "2026-11-04T00:00:00.000Z", updatedAt: "2026-11-04T00:00:00.000Z", createdBy: "test-uid" }];\nwindow.__stubApplyBatches = true;`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 400) => page.waitForTimeout(ms);
const QUICK = process.argv.includes("--quick");
const cells = [];
for (const lang of ["bn", "en"]) for (const width of [360, 390, 768, 1024, 1440]) for (const pct of [100, 150, 200]) cells.push([lang, width, pct]);
for (const [lang, width, pct] of QUICK ? cells.filter((c) => c[1] === 360 && c[2] === 200) : cells) {
  const tag = `[${lang} ${width} ${pct}%]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 800 }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) await ctx.route("**/app/js/marks-ui.js*", async (r) => {
    const src = fs.readFileSync("app/js/marks-ui.js", "utf8");
    await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.replace(".mk-btn { min-height:40px;", ".mk-btn { width:60px; overflow:hidden; min-height:40px;") });
  });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.waitForTimeout(1000);
  await ev(page, (p) => { document.documentElement.style.fontSize = p + "%"; }, pct);
  // Read tab, āyah 2
  if (await ev(page, () => document.getElementById("readView").hidden)) {
    if (!(await ev(page, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await settle(page, 200); }
    await page.click("#tabReadBtn");
    await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 8000 });
  }
  await ev(page, () => { const el = document.getElementById("ayahSelect"); el.value = "2"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await settle(page, 900);
  const geo = (sel, box) => ev(page, ({ sel, box }) => {
    const rows = [...document.querySelectorAll(sel)].filter((r) => r.getBoundingClientRect().width > 0);
    const row = rows[0]; if (!row) return { none: true };
    const bs = [...row.querySelectorAll("[data-mark-key]")];
    const cb = (document.querySelector(box) ?? document.body).getBoundingClientRect();
    const r = row.getBoundingClientRect();
    return { n: bs.length, cut: bs.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent), short: bs.filter((b) => b.getBoundingClientRect().height < 39.5).length,
      inside: r.left >= cb.left - 1 && r.right <= cb.right + 1, over: document.documentElement.scrollWidth - innerWidth };
  }, { sel, box });
  // Āyah card
  await ev(page, () => document.querySelector('[data-ayah-num-badge="1:2"]')?.click());
  await page.waitForSelector("[data-ayah-sheet] [data-marks-row]", { timeout: 6000 }).catch(() => {});
  let g = await geo("[data-ayah-sheet] [data-marks-row]", "[data-ayah-sheet]");
  check(`${tag} Āyah card marks whole, inside, tall`, !g.none && g.n === 3 && g.cut.length === 0 && g.short === 0 && g.inside && g.over <= 0, JSON.stringify(g));
  if (width === 360 && pct === 200) await page.screenshot({ path: `/tmp/marks-k2-matrix-card-${lang}-360-200.png` }).catch(() => {});
  await ev(page, () => document.querySelector("[data-ayah-sheet-close]")?.click());
  await settle(page, 300);
  // Word card
  await ev(page, () => { const el = document.getElementById("ayahSelect"); el.value = "1"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await settle(page, 700);
  await ev(page, () => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await settle(page, 500);
  const occ = "quran-word-occurrence:v1:1:1:1";
  await page.waitForFunction((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`), occ, { timeout: 8000 }).catch(() => {});
  await ev(page, (i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`)?.click(), occ);
  await page.waitForSelector(".quran-word-card [data-marks-row]", { timeout: 6000 }).catch(() => {});
  g = await geo(".quran-word-card [data-marks-row]", ".quran-word-card");
  check(`${tag} Word card marks whole, inside, tall`, !g.none && g.n === 3 && g.cut.length === 0 && g.short === 0 && g.inside && g.over <= 0, JSON.stringify(g));
  if (width === 360 && pct === 200) await page.screenshot({ path: `/tmp/marks-k2-matrix-word-${lang}-360-200.png` }).catch(() => {});
  await ev(page, () => document.querySelector("[data-word-card-close]")?.click());
  await settle(page, 300);
  // Marks wheel
  await ev(page, () => document.getElementById("tabApproachBtn")?.click());
  await settle(page, 500);
  if (width < 900) { await page.click('#wheelDrawerRow [data-wheel-drawer="wheel"]').catch(() => {}); await settle(page, 300); }
  await ev(page, () => document.querySelector('[data-wheel-kind="marks"]')?.click());
  await page.waitForSelector("#wheelContainer svg[data-mk-wheel]", { timeout: 6000 }).catch(() => {});
  await ev(page, () => document.querySelector('[data-mk-view="all-words"]')?.click());
  await settle(page, 500);
  const w = await ev(page, () => {
    const svg = document.querySelector("#wheelContainer svg[data-mk-wheel]"); if (!svg) return { none: true };
    const r = svg.getBoundingClientRect();
    const sw = [...document.querySelectorAll("[data-mk-view]")];
    const wc = document.getElementById("wheelContainer").getBoundingClientRect();
    return { w: Math.round(r.width), onScreen: r.left >= -1 && r.right <= innerWidth + 1, cut: sw.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent),
      tall: sw.filter((b) => b.getBoundingClientRect().height < 35).length, swInside: sw.every((b) => { const q = b.getBoundingClientRect(); return q.left >= wc.left - 1 && q.right <= wc.right + 1; }), over: document.documentElement.scrollWidth - innerWidth };
  });
  check(`${tag} Marks wheel on screen, view switch whole`, !w.none && w.w > 150 && w.onScreen && w.cut.length === 0 && w.tall === 0 && w.swInside && w.over <= 0, JSON.stringify(w));
  if (width <= 390 && pct === 200 || width === 1024 && pct === 150) await page.screenshot({ path: `/tmp/marks-k2-matrix-wheel-${lang}-${width}-${pct}.png` }).catch(() => {});
  await ctx.close();
}
await browser.close();
console.log(`\n==== Marks K2 matrix: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
