// The Owner, 6 Nov 2026 (option A of the demo): the āyah number and the ⋮ sit on ONE row, before the āyah starts.
//   Reading View (.meaning-ayah): title "Al-Ikhlāṣ 112:1" ... number, ⋮ on the title row; no number row left above the Arabic.
//   ONE-flow view (.page-flow-ayah, a whole sūrah as a flow): the header row holds the number and the ⋮ together.
// The number is still the button that opens the Āyah card; the Arabic starts below the row; nothing is cut or sideways.
// At 360 / 390 / 768 / 1440, en and bn, text 100% and 200%.   --mutate=nolift  leaves the number on its own row -> FAIL.
// Run from the repository root, serve.js on :8080.
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error("promise"); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const MUT = process.argv.includes("--mutate=nolift");
const QUICK = process.argv.includes("--quick");
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
const rowOf = (page, rowSel) => page.evaluate((sel) => {
  const head = document.querySelector(sel); if (!head) return null;
  const art = head.closest(".meaning-ayah, .page-flow-ayah");
  const badge = head.querySelector(".ayah-num-badge"), menu = head.querySelector(".ayah-quick-wrap"), ar = art.querySelector(".ayah-arabic");
  if (!badge || !menu || !ar) return { badge: !!badge, menu: !!menu, ar: !!ar };
  const b = badge.getBoundingClientRect(), m = menu.getBoundingClientRect(), h = head.getBoundingClientRect(), a = ar.getBoundingClientRect();
  const strayRows = [...art.querySelectorAll(".ayah-num-row")].filter((r) => r.closest(".ayah-arabic") === null && r.nextElementSibling?.classList.contains("ayah-arabic")).length;
  return { sameLevel: Math.abs((b.top + b.bottom) / 2 - (m.top + m.bottom) / 2) < 6, badgeBeforeMenu: b.right <= m.left + 1 || b.left >= m.right - 1, gap: Math.round(Math.min(Math.abs(m.left - b.right), Math.abs(b.left - m.right))),
    inHead: b.top >= h.top - 1 && b.bottom <= h.bottom + 1, arabicBelow: a.top >= h.bottom - 1, strayRows, text: badge.textContent.trim(), isButton: badge.tagName === "BUTTON" && badge.hasAttribute("data-ayah-num-badge"),
    inside: b.right <= innerWidth + 1 && m.right <= innerWidth + 1 && b.left >= -1, over: document.documentElement.scrollWidth - innerWidth };
}, rowSel);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const cases = [];
for (const lang of QUICK ? ["en"] : ["en", "bn"]) for (const width of QUICK ? [360] : [360, 390, 768, 1440]) for (const pct of QUICK ? [100] : (width <= 390 ? [100, 200] : [100])) cases.push([lang, width, pct]);
for (const [lang, width, pct] of cases) {
  const tag = `[${lang} ${width}${pct === 100 ? "" : " " + pct + "%"}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUT) await ctx.route("**/app/quranrevival.html*", async (r) => { const res = await r.fetch(); const b = await res.text(); const from = "return m ? { badge: m[1], parts: parts.replace(m[0], \"\") } : { badge: \"\", parts };"; if (b.split(from).length !== 2) throw new Error("anchor"); r.fulfill({ response: res, body: b.replace(from, "return { badge: \"\", parts };") }); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  if (pct !== 100) await page.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; }, pct);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "unitTypeSelect", "surah"); await page.waitForTimeout(800);
  await setSel(page, "surahSelect", "112"); await page.waitForTimeout(1500);
  // the flow view
  await page.waitForSelector(".page-flow-ayah .ayah-quick-header", { timeout: 15000 }).catch(() => {});
  const f = await rowOf(page, ".page-flow-ayah .ayah-quick-header");
  check(`${tag} flow view: number and ⋮ on one level, ⋮ beside the number, Arabic below the row`, !!f && f.sameLevel && f.badgeBeforeMenu && f.arabicBelow && f.inHead, JSON.stringify(f));
  check(`${tag} flow view: no number row left above the Arabic; the number is the Āyah-card button; ≥ 4px between it and the ⋮`, !!f && f.strayRows === 0 && f.isButton && f.text.length > 0 && f.gap >= 4, JSON.stringify(f));
  // the Reading View
  for (let i = 0; i < 3; i++) { if (await page.evaluate(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0)) break; await page.click("#readMeaningBtn"); await page.waitForTimeout(1300); }
  await page.waitForSelector(".meaning-ayah .meaning-ayah-head", { timeout: 15000 }).catch(() => {});
  const r = await rowOf(page, ".meaning-ayah .meaning-ayah-head");
  check(`${tag} Reading View: number and ⋮ on the title row, on one level, Arabic below it`, !!r && r.sameLevel && r.badgeBeforeMenu && r.arabicBelow && r.inHead, JSON.stringify(r));
  check(`${tag} Reading View: no number row left above the Arabic; the number is the Āyah-card button; ≥ 4px between it and the ⋮`, !!r && r.strayRows === 0 && r.isButton && r.text.length > 0 && r.gap >= 4, JSON.stringify(r));
  check(`${tag} Reading View: on screen, no sideways scroll`, !!r && r.inside && r.over <= 0, JSON.stringify(r));
  if (!QUICK && !MUT) {
    await page.evaluate(() => document.querySelector(".meaning-ayah .meaning-ayah-head .ayah-num-badge")?.click());
    await page.waitForSelector("[data-ayah-sheet]", { timeout: 8000 }).catch(() => {});
    check(`${tag} tapping the number opens the Āyah card`, await page.evaluate(() => !!document.querySelector("[data-ayah-sheet]")));
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
