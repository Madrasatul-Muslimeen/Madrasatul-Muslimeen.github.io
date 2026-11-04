// The intention card above a Mushaf page (the Architect, 4 Nov 2026: at 360px it wrapped to several lines and pushed the page
// down; "a page is a page", shell round 17). In the Mushaf view the card is ONE line; in the Āyah view it is the full card.
// At 360 / 390 / 768 / 1440, en and bn: Mushaf ticked -> the card is one line (<= 64px tall, intention text on one line, inside the
// screen, Bismillah still a 44px target and still closes it); unticked -> the full card again (taller, label shown).
// Run from the repository root, serve.js on :8080.   --mutate=wrap  removes the one-line class -> the one-line checks FAIL.
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error("promise"); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const MUT = process.argv.includes("--mutate=wrap");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"]) for (const width of [360, 390, 768, 1440]) for (const pct of width <= 390 ? [100, 200] : [100]) {
  const tag = `[${lang} ${width}${pct === 100 ? "" : " " + pct + "%"}]`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUT) await ctx.route("**/app/quranrevival.html*", async (r) => { const res = await r.fetch(); const b = (await res.text()).replace('host.classList.toggle("intention-one-line", !!mushafToggle.checked);', "").replace('document.getElementById("intentionHost")?.classList.toggle("intention-one-line", !!mushafToggle.checked)', "0"); r.fulfill({ response: res, body: b }); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (/intention/i.test(k)) localStorage.removeItem(k); } catch {} });
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  if (pct !== 100) await page.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; }, pct);
  await page.click("#tabReadBtn"); await page.waitForTimeout(700);
  const card = () => page.evaluate(() => { const c = document.querySelector("#intentionHost [data-intention-card]"); if (!c) return null; const r = c.getBoundingClientRect(), t = c.querySelector(".intention-text").getBoundingClientRect(), b = c.querySelector("[data-intention-bismillah]").getBoundingClientRect(), l = c.querySelector(".intention-lab");
    return { h: Math.round(r.height), textH: Math.round(t.height), lh: parseFloat(getComputedStyle(c.querySelector(".intention-text")).lineHeight) || 0, inside: r.left >= -1 && r.right <= innerWidth + 1, btnH: Math.round(b.height), lab: getComputedStyle(l).display !== "none", sideways: document.documentElement.scrollWidth > innerWidth + 1 }; });
  const full = await card();
  await page.evaluate(() => { const m = document.getElementById("mushafToggle"); m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(900);
  const one = await card();
  check(`${tag} Mushaf: the card is there`, !!one && !!full);
  check(`${tag} Mushaf: ONE line (text no taller than 1.5 line-heights, card no taller than its button + 20px), inside the screen, no sideways scroll`, !!one && one.lh > 0 && one.textH <= one.lh * 1.5 && one.h <= one.btnH + 20 && one.inside && !one.sideways, JSON.stringify(one));
  check(`${tag} Mushaf: Bismillah is still a 44px target`, !!one && one.btnH >= 43.5, JSON.stringify(one));
  check(`${tag} Mushaf: the label is folded away; the full card (Āyah view) has it`, !!one && !one.lab && !!full && full.lab, JSON.stringify({ one, full }));
  await page.click("#intentionHost [data-intention-bismillah]").catch(() => {});
  check(`${tag} Mushaf: Bismillah closes it`, (await page.locator("#intentionHost [data-intention-card]").count()) === 0);
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
