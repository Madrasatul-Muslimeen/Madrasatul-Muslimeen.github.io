// The intention reminder in the page (PCF MSA J05; the Owner, 4 Nov 2026: "Reminder text for all MSA, Build it").
// (1) nothing at start-up: no line until the Read view opens. (2) opening Read shows the day's intention, in English or Bangla,
// with one Bismillah. (3) once a day (the default): Bismillah closes it and reopening Read the same day shows nothing.
// (4) Every time: it shows again each opening. (5) Off: never. (6) the setting is remembered across a reload.
// (7) fit: the card is inside the screen, whole, the button >= 44px, at 360 px and 200% text, in both languages.
// Run from the repository root, serve.js on :8080. --mutate=NAME must FAIL: noclose | startup | nosetting
import { chromium, newContext, openPage } from "./harness.mjs";
import { INTENTIONS, intentionIndexFor, localDay } from "../../app/js/intention-reminder.js";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok) pass++; else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const MUT = {
  noclose: ["app/quranrevival.html", "intentionClosedThisOpening = true; markClosedToday(person, today); host.innerHTML = \"\";", "host.innerHTML = \"\";"],
  startup: ["app/quranrevival.html", "const show = readOpen && shouldShowIntention", "const show = shouldShowIntention"],
  nosetting: ["app/quranrevival.html", "setIntentionMode(intentionPerson(), b.dataset.intentionMode);", ""],
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !MUT[MUTATE]) throw new Error("bad mutation");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ev = (p, f, a) => p.evaluate(f, a);
const settle = (p, ms = 400) => p.waitForTimeout(ms);
const idx = intentionIndexFor(localDay());
for (const [lang, width, pct] of [["en", 1440, 100], ["bn", 1440, 100], ["en", 360, 200], ["bn", 360, 200]]) {
  const tag = `[${lang} ${width} ${pct}%]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 800 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) await ctx.route("**/app/quranrevival.html*", async (r) => {
    const [f, a, b] = MUT[MUTATE]; const src = fs.readFileSync(f, "utf8"); if (!src.includes(a)) throw new Error("anchor " + MUTATE);
    await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
  });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await settle(page, 1000);
  await ev(page, (p) => { document.documentElement.style.fontSize = p + "%"; }, pct);
  const card = () => ev(page, () => { const c = document.querySelector("#intentionHost [data-intention-card]"); if (!c) return null; const r = c.getBoundingClientRect(); const b = c.querySelector("button").getBoundingClientRect(); const t = c.querySelector(".intention-text");
    return { text: t.textContent, idx: Number(c.dataset.intentionIndex), inside: r.left >= -1 && r.right <= innerWidth + 1, whole: t.scrollWidth <= t.clientWidth + 1, btnH: Math.round(b.height), over: document.documentElement.scrollWidth - innerWidth, vis: r.width > 0 }; });
  const openRead = async () => { if (!(await ev(page, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await settle(page, 200); } await page.click("#tabReadBtn"); await page.waitForFunction(() => !document.getElementById("readView").hidden, null, { timeout: 8000 }); await settle(page, 400); };
  const leaveRead = async () => { await ev(page, () => document.getElementById("tabApproachBtn")?.click()); await settle(page, 400); };
  const setMode = async (m) => { await ev(page, (m) => { document.getElementById("tabStudyOptionsBtn")?.click(); document.querySelector(`[data-intention-mode="${m}"]`)?.click(); }, m); await settle(page, 300); };

  check(`${tag} (1) no line at start-up, before Read opens`, (await card()) === null);
  await openRead();
  let c = await card();
  check(`${tag} (2) opening Read shows today's intention (${lang}), number ${idx + 1} of 4`, !!c && c.idx === idx && c.text === (lang === "bn" ? INTENTIONS[idx].bn : INTENTIONS[idx].en), JSON.stringify(c));
  check(`${tag} (7) the card is inside the screen, whole, its button >= 44px, no sideways scroll`, !!c && c.inside && c.whole && c.btnH >= 44 && c.over <= 0, JSON.stringify(c));
  if (width === 360 && lang === "bn") await page.screenshot({ path: "/tmp/intention-bn-360-200.png" }).catch(() => {});
  await ev(page, () => document.querySelector("[data-intention-bismillah]").click()); await settle(page, 200);
  check(`${tag} (3) Bismillah closes it`, (await card()) === null);
  await leaveRead(); await openRead();
  check(`${tag} (3) once a day (default): reopening Read the same day shows nothing`, (await card()) === null);
  await leaveRead(); await setMode("every"); await openRead();
  check(`${tag} (4) Every time: it shows again`, (await card()) !== null);
  await ev(page, () => document.querySelector("[data-intention-bismillah]").click()); await leaveRead(); await openRead();
  check(`${tag} (4) Every time: closed, then shown again on the next opening`, (await card()) !== null);
  await leaveRead(); await setMode("off"); await openRead();
  check(`${tag} (5) Off: never`, (await card()) === null);
  await page.reload(); await settle(page, 1500);
  await ev(page, () => document.getElementById("tabStudyOptionsBtn")?.click()); await settle(page, 300);
  const pressed = await ev(page, () => [...document.querySelectorAll("[data-intention-mode]")].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.intentionMode));
  check(`${tag} (6) the setting (Off) is remembered across a reload`, pressed.join() === "off", JSON.stringify(pressed));
  const real = errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
  check(`${tag} no page errors`, real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Intention reminder (page): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
