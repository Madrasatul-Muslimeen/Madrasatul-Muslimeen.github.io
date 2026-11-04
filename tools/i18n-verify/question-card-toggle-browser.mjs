// The Note question card's on/off toggle in Study options (PCF MSA J05, T15 A). On by default; Off is remembered across a reload;
// whole and >= 40px at 360 px / 200% text in English and Bangla. --mutate=nosave must FAIL.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok) pass++; else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [lang, width, pct] of [["en", 1440, 100], ["bn", 360, 200]]) {
  const tag = `[${lang} ${width} ${pct}%]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 800 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) await ctx.route("**/app/js/critical-reasoning-guides.js*", async (r) => { const s = fs.readFileSync("app/js/critical-reasoning-guides.js", "utf8"); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: s.replace('if (mode !== "on" && mode !== "off") return false;', "return true;") }); });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(1200);
  await page.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; }, pct);
  const state = async () => { await page.evaluate(() => document.getElementById("tabStudyOptionsBtn")?.click()); await page.waitForTimeout(300);
    return page.evaluate(() => { const bs = [...document.querySelectorAll("[data-question-card-mode]")]; return { pressed: bs.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.questionCardMode), n: bs.length, cut: bs.filter((b) => b.scrollWidth > b.clientWidth + 1).length, short: bs.filter((b) => b.getBoundingClientRect().height < 39.5).length }; }); };
  let s = await state();
  check(`${tag} the toggle has On and Off, On pressed by default, whole, >= 40px`, s.n === 2 && s.pressed.join() === "on" && s.cut === 0 && s.short === 0, JSON.stringify(s));
  await page.evaluate(() => document.querySelector('[data-question-card-mode="off"]').click()); await page.waitForTimeout(300);
  await page.reload(); await page.waitForTimeout(1500);
  s = await state();
  check(`${tag} Off is remembered across a reload`, s.pressed.join() === "off", JSON.stringify(s));
  const real = errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
  check(`${tag} no page errors`, real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Question card toggle (page): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
