// QR Lead (the Owner, 29 Oct 2026, a phone screenshot of the Āyah card on page 604: "Ayah NaN", "Quran 114:NaN — Surah
// An-Naas", and a pink "That save did not go through (unknown) · Ref: read Arabic word progress"; "What's this msg about?
// Fix."): a route handed openAyahActionSheet a key with no real āyah number; the card drew "NaN" and its word-progress
// read threw. The card now never opens on a broken āyah (it falls back to the āyah the reader is on in that sūrah, else
// āyah 1) and keeps the bad key in window.__badAyahCardKeys. The route the Owner took is not yet known, so this suite
// drives a bad key through the app's OWN Mushaf marker handler (a marker carrying "114:undefined" on page 604), with a
// real marker (114:6) as the positive control.
//   node tools/i18n-verify/qr-ayah-card-no-nan-browser.mjs [--mutate=no-guard]   (serve.js on :8080)
//   --mutate=no-guard   the guard removed from the served page -> the bad-key checks FAIL (NaN on the card, the banner)
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const GUARD = "      if (!Number.isInteger(ayahNum) || ayahNum < 1 || ayahNum > ayahCount) {";
if (MUTATE && MUTATE !== "no-guard") throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const [w, h, lang] of [[390, 844, "en"], [600, 960, "bn"], [1280, 900, "en"]]) {
  const tag = `[${lang} ${w}]`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: w, height: h } });
  if (MUTATE) {
    const html = fs.readFileSync("app/quranrevival.html", "utf8");
    if (html.split(GUARD).length !== 2) throw new Error("mutation anchor not found exactly once");
    await ctx.route(/\/app\/quranrevival\.html(\?.*)?$/, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html.replace(GUARD, "      if (false) {") }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForSelector("#readContentsBtn", { state: "visible", timeout: 20000 });
  await page.click("#readContentsBtn");
  await page.locator('#readContentsMount [data-rc-kind="surah"][data-rc-n="114"]').first().click(); // by number: the name is translated
  await page.waitForFunction(() => !!document.querySelector('.hifz-page[data-mushaf-page="604"] [data-ayah-marker="114:6"]'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const card = () => page.evaluate(() => {
    const m = document.getElementById("ayahActionSheetMount"), ov = m?.closest(".open") ?? m;
    const banner = document.getElementById("qr-write-failure-banner");
    return { text: (m?.innerText ?? "").replace(/\s+/g, " ").slice(0, 160), key: m?.querySelector("[data-unit-key]")?.dataset.unitKey ?? null,
      banner: !!banner && banner.style.display !== "none" ? banner.innerText.replace(/\s+/g, " ").slice(0, 120) : "", bad: window.__badAyahCardKeys ?? [] };
  });
  const close = async () => { await page.keyboard.press("Escape"); await page.evaluate(() => { document.querySelector("#ayahActionSheetMount [data-ayah-sheet-close], #ayahActionSheetMount .ayah-sheet-close")?.click(); const b = document.getElementById("qr-write-failure-banner"); if (b) b.style.display = "none"; }); await page.waitForTimeout(300); };
  // positive control: the real last marker of the Qur'an
  await page.evaluate(() => document.querySelector('.hifz-page[data-mushaf-page="604"] [data-ayah-marker="114:6"]')?.click());
  await page.waitForTimeout(1200);
  const real = await card();
  check(`${tag} POSITIVE CONTROL: the 114:6 marker opens its Āyah card, with no NaN and no failure banner`, /114|১১৪/.test(real.text) && /[6৬]/.test(real.text) && !/NaN/.test(real.text) && !real.banner, JSON.stringify(real));
  await close();
  // a marker carrying a key with no real āyah number, through the app's own marker handler
  await page.evaluate(() => {
    const host = document.querySelector('.hifz-page[data-mushaf-page="604"] [data-ayah-marker="114:6"]');
    const bad = host.cloneNode(true); bad.dataset.ayahMarker = "114:undefined"; bad.id = "badMarker"; host.after(bad);
    bad.click();
  });
  await page.waitForTimeout(1500);
  const b = await card();
  check(`${tag} a key with no real āyah number never puts "NaN" on the Āyah card`, b.text.length > 0 && !/NaN/.test(b.text), JSON.stringify(b));
  check(`${tag} ...it opens on a real āyah of that sūrah (An-Naas)`, /114|১১৪/.test(b.text) && !/NaN/.test(b.text), JSON.stringify(b.text));
  check(`${tag} ...no "That save did not go through" banner appears`, !b.banner, b.banner);
  check(`${tag} ...and the bad key is kept for diagnosis (window.__badAyahCardKeys)`, b.bad.some((x) => x.key === "114:undefined"), JSON.stringify(b.bad));
  if (w === 390) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/qr-ayah-card-no-nan-${lang}-${w}.png` });
  await ctx.close();
}
await browser.close();
console.log(`\n==== QR Āyah card never opens on a broken āyah${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
