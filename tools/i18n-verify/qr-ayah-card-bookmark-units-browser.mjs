// QR Lead 3c (the Owner's tick A, PCF MSA J29 j29qrl16q, 1 Nov 2026): "Wasn't bookmark enabled for all units before?" The
// Read bar's 🔖 always offered every unit; the Āyah card's own 🔖 saved its āyah only. Now the card's 🔖 offers the same
// choices for the CARD'S āyah (not the āyah on screen): This āyah (preselected), This page, This rukūʿ, Whole sūrah, This
// juz, Range from that āyah; each saves that unit's key, and every exit still brings the card back (J82 part 2).
// Before Al-Fātiḥah (Aʿūdhu billāh) keeps the āyah-only window.
//   node tools/i18n-verify/qr-ayah-card-bookmark-units-browser.mjs [--mutate=NAME]   (serve.js on :8080 or QR_BASE, repo root)
//   no-choices  the card hands in no choices (as before)       -> "six choices" FAILS
//   screen      the choices follow the āyah on screen          -> the page / rukūʿ / name / Range-start checks FAIL
//               (this mutation is also the proof that the āyah on screen is not the card's, so those checks can fail)
//   no-back     the card is not brought back after Save        -> "the Āyah card is open again" FAILS
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-choices": ["try { await toggleAyahBookmark(unitKey, undefined, undefined, { unitChoices: ayahCardBookmarkChoices(unitKey, half, intro) }); }", "try { await toggleAyahBookmark(unitKey); }"],
  screen: ["const { ayah, half, page } = at ?? bookmarkAyahOnScreen();", "const { ayah, half, page } = bookmarkAyahOnScreen();"],
  "no-back": ["            if (!ayahSheetUnitKey) {\n              if (intro?.opening)", "            if (false) {\n              if (intro?.opening)"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const S36 = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/surahs/surah_036.json", "utf8"));
const A = 60, rec = S36.ayahs.find((a) => a.ayah === A);
const rukus = [...new Set(S36.ayahs.map((a) => a.ruku))];
const rukuIdx = rukus.indexOf(rec.ruku) + 1;

async function start(lang, w, h) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const src = fs.readFileSync("app/quranrevival.html", "utf8");
      if (src.split(a).length !== 2) throw new Error(`mutation anchor not found exactly once: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  const setSel = (id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
  await setSel("surahSelect", "36"); await page.waitForTimeout(1500);
  await setSel("unitTypeSelect", "surah"); await page.waitForTimeout(1200);
  return { ctx, page, errors };
}
const cardKey = (page) => page.evaluate(() => document.querySelector("#ayahActionSheetMount [data-ayah-sheet]") ? (document.querySelector("#ayahActionSheetMount [data-ayah-sheet]").dataset.ayahSheetKey ?? "open") : "");
async function openCardDialog(page) {
  await page.evaluate((a) => { window.__stubWriteData = []; document.querySelector(`[data-ayah-num-badge="36:${a}"]`)?.click(); }, A);
  await page.waitForFunction(() => !!document.querySelector("#ayahActionSheetMount [data-ayah-sheet]"), null, { timeout: 8000 }).catch(() => {});
  const key = await cardKey(page);
  await page.evaluate(() => document.querySelector("[data-ayah-sheet-bookmark]")?.click());
  await page.waitForFunction(() => !!document.querySelector("[data-bm-pop-cancel], [data-bm-exists-add]"), null, { timeout: 8000 }).catch(() => {});
  if (await page.$("[data-bm-exists-add]")) { await page.click("[data-bm-exists-add]"); await page.waitForSelector("[data-bm-pop-save]", { timeout: 5000 }); }
  return key;
}
const chips = (page) => page.evaluate(() => [...document.querySelectorAll("[data-bm-pop-unit]")].map((b) => ({ id: b.dataset.bmPopUnit, text: b.textContent.trim(), on: b.getAttribute("aria-checked"), h: Math.round(b.getBoundingClientRect().height) })));
const nameOf = (page) => page.evaluate(() => document.querySelector("[data-bm-pop-name]")?.value ?? "");
const digits = (s) => String(s).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
const lastSaved = (page) => page.evaluate(() => { const w = (window.__stubWriteData || []).filter((x) => x.col === "bookmarks" && x.data.saved).at(-1); return w ? w.data.saved.at(-1) : null; });
async function saveAndBack(page, key0, tag, what) {
  await page.click("[data-bm-pop-save]"); await page.waitForTimeout(1000);
  await page.waitForFunction(() => !!document.querySelector("#ayahActionSheetMount [data-ayah-sheet]"), null, { timeout: 5000 }).catch(() => {});
  const key1 = await cardKey(page);
  check(`${tag} after Save (${what}) the Āyah card is open again for 36:${A}`, !!key1 && key1 === key0, `${key1} vs ${key0}`);
  await page.evaluate(() => document.querySelector("[data-ayah-sheet-close]")?.click()); await page.waitForTimeout(300);
}

for (const [lang, w, h] of [["en", 390, 844], ["bn", 390, 844], ["en", 1280, 900], ["en", 320, 640]]) {
  const tag = `[${lang} ${w}x${h} Yā-Sīn, Whole Surah, the card of 36:${A}]`;
  const { ctx, page, errors } = await start(lang, w, h);
  let key0 = await openCardDialog(page);
  check(`${tag} POSITIVE CONTROL the card opened and its Bookmark window is open`, !!key0 && !!(await page.$("[data-bm-pop-save]")), key0);
  const cs = await chips(page);
  check(`${tag} six choices in order: āyah (picked), page, rukūʿ, sūrah, juz, Range`, cs.map((c) => `${c.id}:${c.on}`).join(",") === "ayah:true,page:false,ruku:false,surah:false,juz:false,range:false", JSON.stringify(cs));
  check(`${tag} every choice is 40px tall`, cs.length === 6 && cs.every((c) => c.h >= 40), JSON.stringify(cs));
  if (lang === "en") check(`${tag} the choices read This āyah | This page | This rukūʿ | Whole sūrah | This juz | Range`, cs.map((c) => c.text).join("|") === "This āyah|This page|This rukūʿ|Whole sūrah|This juz|Range", JSON.stringify(cs.map((c) => c.text)));
  else check(`${tag} the choices have no English`, cs.length === 6 && cs.every((c) => !/[A-Za-z]/.test(c.text)), JSON.stringify(cs.map((c) => c.text)));
  check(`${tag} the default Name is the card's āyah (36:${A}), not the āyah on screen`, new RegExp(`36:${A}\\b`).test(digits(await nameOf(page))), await nameOf(page));
  await page.click('[data-bm-pop-unit="page"]');
  check(`${tag} This page names the card's page (${rec.page})`, digits(await nameOf(page)).includes(String(rec.page)), await nameOf(page));
  await page.click('[data-bm-pop-unit="ruku"]');
  check(`${tag} This rukūʿ names rukūʿ ${rukuIdx} of sūrah 36`, ((n) => new RegExp(`\\b${rukuIdx}\\b`).test(n) && /\b36\b/.test(n))(digits(await nameOf(page))), await nameOf(page));
  await page.click('[data-bm-pop-unit="range"]');
  const from = await page.evaluate(() => { const i = document.querySelector(".bm-popover input[type=number], .bm-popover select"); return i ? i.value : null; });
  check(`${tag} Range starts at the card's āyah (${A})`, digits(from) === String(A), String(from));
  await page.click('[data-bm-pop-unit="page"]');
  await saveAndBack(page, key0, tag, "This page");
  let bm = await lastSaved(page);
  check(`${tag} This page saves page:madani:${rec.page}, opening as the Page unit at 36:${A}`, bm?.position === `page:madani:${rec.page}` && bm?.settings?.unitType === "page" && bm?.settings?.ayahNum === A, JSON.stringify(bm && { p: bm.position, u: bm.settings?.unitType, a: bm.settings?.ayahNum }));
  if (lang === "en" && w === 390) {
    key0 = await openCardDialog(page); await page.click('[data-bm-pop-unit="ruku"]'); await saveAndBack(page, key0, tag, "This rukūʿ");
    bm = await lastSaved(page);
    check(`${tag} This rukūʿ saves ruku:36:${rukuIdx}`, bm?.position === `ruku:36:${rukuIdx}`, JSON.stringify(bm?.position));
    key0 = await openCardDialog(page); await saveAndBack(page, key0, tag, "This āyah, as picked");
    bm = await lastSaved(page);
    check(`${tag} the preselected This āyah saves ayah:36:${A}, opening as Single Ayah at ${A}`, bm?.position === `ayah:36:${A}` && bm?.settings?.unitType === "ayah" && bm?.settings?.ayahNum === A, JSON.stringify(bm && { p: bm.position, u: bm.settings?.unitType, a: bm.settings?.ayahNum }));
  }
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Āyah card 🔖 unit choices (QR Lead 3c)${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
