// PCF MSA J129 (the Owner, 9 Nov 2026 "Place entire Progress Data block with on/off switch"; 11 Nov: "J129:B1"): the Word Card's
// Know Your Status block (ring, totals, circles, "Learn next") is ON by default and has a switch that hides it; the choice is remembered on this device.
//   node tools/i18n-verify/word-card-progress-data-switch-browser.mjs [--mutate=NAME] [--width=390] [--lang=en]   (repository root, serve.js on :8080)
//   --mutate=offdefault  the block starts hidden               -> "ON by default" FAILS
//   --mutate=nohide      the switch hides nothing              -> "switching off hides" FAILS
//   --mutate=noremember  the choice is not stored              -> "remembered on this device" FAILS
//   --mutate=smallsw     the switch is 30px tall               -> the 40px check FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${String(detail).slice(0, 300)}`); }
};
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate");
const JS = "app/js/quran-word-card.js", HTML = "app/quranrevival.html";
const MUT = {
  offdefault: [JS, 'return localStorage.getItem(PROGRESS_DATA_KEY) !== "off";', 'return localStorage.getItem(PROGRESS_DATA_KEY) === "on";'],
  nohide: [JS, "${progressDataOn() ? `<div class=\"word-progress-status-top\">", "${true ? `<div class=\"word-progress-status-top\">"],
  noremember: [JS, 'localStorage.setItem(PROGRESS_DATA_KEY, on ? "on" : "off");', "void 0;"],
  smallsw: [HTML, "  .word-progress-data-switch:focus-visible {", "  html body .word-progress-data-switch { min-height: 0 !important; max-height: 30px !important; overflow: hidden; }\n  .word-progress-data-switch:focus-visible {"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const WIDTHS = arg("width") ? [Number(arg("width"))] : [320, 390, 768, 1280];
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const lang of LANGS) for (const width of WIDTHS) {
    const tag = `[${lang} ${width}]`;
    console.log(`\n=== Word Card progress-data switch ${tag} ===`);
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 1000 : 844 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const [file, a, b] = MUT[MUTATE];
      await ctx.route(`**/${file}*`, async (r) => {
        const src = fs.readFileSync(file, "utf8");
        if (src.split(a).length !== 2) throw new Error(`mutation ${MUTATE}: anchor found ${src.split(a).length - 1} times, not 1`);
        await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) });
      });
    }
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    try {
      await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
      await page.waitForTimeout(1000);
      if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(200); }
      await page.click("#tabReadBtn");
      await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 10000 });
      await page.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "2"; el.dispatchEvent(new Event("change", { bubbles: true })); });
      await page.waitForTimeout(700);
      await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
      await page.waitForTimeout(500);
      const occ = "quran-word-occurrence:v1:1:2:2";
      await page.waitForFunction((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`), occ, { timeout: 8000 });
      await page.evaluate((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`).click(), occ);
      await page.waitForSelector(`.quran-word-card[data-occurrence-id="${occ}"]`, { timeout: 8000 });
      await page.waitForTimeout(800);
      const st = () => page.evaluate(() => { const sw = document.querySelector("[data-word-progress-data-toggle]"); const top = document.querySelector(".word-progress-status-top"); const box = document.querySelector(".word-progress-whole-quran-box"); return { sw: !!sw, h: sw ? sw.getBoundingClientRect().height : 0, text: sw?.textContent.trim(), pressed: sw?.getAttribute("aria-pressed"), top: !!top, box: !!box, stored: (() => { try { return localStorage.getItem("mm_word_card_progress_data.v1"); } catch { return "x"; } })() }; });
      const a = await st();
      check(`${tag} POSITIVE CONTROL the Word Card shows its status block's switch`, a.sw, JSON.stringify(a));
      check(`${tag} ON by default: the ring block is drawn and nothing is stored yet`, a.top && a.pressed === "true" && a.stored === null, JSON.stringify(a));
      check(`${tag} the switch is 40px or more tall`, a.h >= 40, String(a.h));
      if (lang === "bn") check(`${tag} the switch's words are in Bangla`, !/[A-Za-z]/.test(a.text), a.text);
      await page.evaluate(() => document.querySelector("[data-word-progress-data-toggle]").click());
      await page.waitForTimeout(500);
      const b = await st();
      check(`${tag} switching off hides the ring and the totals, and the switch stays to switch back on`, b.sw && !b.top && !b.box && b.pressed === "false" && b.text !== a.text, JSON.stringify(b));
      check(`${tag} the choice is remembered on this device`, b.stored === "off", JSON.stringify(b));
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      check(`${tag} after a reload the stored choice is still off`, (await page.evaluate(() => { try { return localStorage.getItem("mm_word_card_progress_data.v1"); } catch { return "x"; } })) === "off");
      await page.evaluate(() => { const t = document.querySelector("[data-word-progress-data-toggle]"); if (t) t.click(); });
      check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|quran\.com|favicon/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    } catch (err) { check(`${tag} stopped early: ${String(err.message).split("\n")[0]}`, false); }
    await ctx.close();
  }
} finally { await browser.close(); }
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
