// The Owner, 17 Nov 2026 ("Play button here should open a card to select play options" -> "A, Listening in Study Options"): the ⋮ menu's
// ▶ Play opens a card with the SAME choices as Study options > Listening: reciters, Repeat, Mode (Loop with Whole Unit), then ▶ Play.
//   node tools/i18n-verify/ayah-play-options-browser.mjs [--mutate=NAME]   (repo root, serve.js on :8080 / QR_BASE)
//   --mutate=oldplay   ▶ Play plays at once again, no card              -> "▶ Play opens the play-options card" FAILS
//   --mutate=nosync    the card's Repeat does not reach the real control  -> "Repeat on the card IS Study options' Repeat" FAILS
//   --mutate=noloop    Loop never shows (even with Whole Unit)           -> "Loop shows only with Whole Unit (shown ...)" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const F = "app/quranrevival.html";
const MUT = {
  oldplay: [F, "onPlay: openAyahPlayDialog, //", "onPlay: quickPlayAyah, //"],
  nosync: [F, 'if (e.target.matches("[data-play-repeat]")) { setReal("#drillRepeatSelect", "value", e.target.value); return; }', 'if (e.target.matches("[data-play-repeat]")) { return; }'],
  noloop: [F, '${mode === "whole" ? `<label class="ayah-copy-row ayah-play-loop">', '${false ? `<label class="ayah-copy-row ayah-play-loop">'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error(`promise: ${n}`); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const sleep = (p, ms) => p.waitForTimeout(ms);
for (const w of [390, 1280]) {
  const tag = `[${w}]`;
  const ctx = await newContext(browser, { banner: false, viewport: { width: w, height: 860 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) { const [file, a, b] = MUT[MUTATE]; await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (src.split(a).length !== 2) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }); }); }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 500);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await sleep(page, 150); }
  await page.click("#tabReadBtn"); await sleep(page, 500);
  await page.evaluate(() => { const ss = document.getElementById("surahSelect"); ss.value = "81"; ss.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForFunction(() => !!document.querySelector(".ayah-quick-btn, [data-qm-toggle], .ayah-quick-badge"), null, { timeout: 15000 }).catch(() => {});
  await sleep(page, 900);
  const opened = await page.evaluate(() => { const b = document.querySelector(".ayah-quick-btn, [data-qm-toggle], .ayah-quick-badge"); if (!b) return false; b.click(); return true; });
  await sleep(page, 400);
  check(`${tag} (positive control) the ⋮ menu opens with a Play tile`, opened && (await page.$$("[data-qm-play]")).length > 0);
  await page.evaluate(() => document.querySelector("[data-qm-play]")?.click());
  await sleep(page, 500);
  check(`${tag} ▶ Play opens the play-options card`, !!(await page.$("#ayahPlayDlg [data-play-go]")));
  const hasLoopEach = await page.$("#ayahPlayDlg [data-play-loop]");
  check(`${tag} Loop shows only with Whole Unit (hidden under Each Ayah)`, !hasLoopEach);
  await page.evaluate(() => { const s = document.querySelector("#ayahPlayDlg [data-play-mode]"); if (s) { s.value = "whole"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await sleep(page, 300);
  check(`${tag} Loop shows only with Whole Unit (shown under Whole Unit)`, !!(await page.$("#ayahPlayDlg [data-play-loop]")));
  await page.evaluate(() => { const s = document.querySelector("#ayahPlayDlg [data-play-repeat]"); if (s) { s.value = "3"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await sleep(page, 300);
  const realRepeat = await page.evaluate(() => document.getElementById("drillRepeatSelect")?.value ?? null);
  const realMode = await page.evaluate(() => document.getElementById("drillModeSelect")?.value ?? null);
  check(`${tag} Repeat on the card IS Study options' Repeat (3×)`, realRepeat === "3", String(realRepeat));
  check(`${tag} Mode on the card IS Study options' Mode (Whole Unit)`, realMode === "whole", String(realMode));
  const fits = await page.evaluate(() => { const b = document.querySelector("#ayahPlayDlg .ayah-copy-box")?.getBoundingClientRect(); return !!b && b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight; });
  check(`${tag} the card fits inside the screen`, fits);
  await page.keyboard.press("Escape"); await sleep(page, 200);
  check(`${tag} Esc closes the card`, !(await page.$("#ayahPlayDlg")));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
