// QR Lead (the MSA Architect, 2 Nov 2026; decision 86, the way-back law): arriving in the Read view from a Hadith or Dua link
// (quranrevival.html?goto=S:A&back=1&backTo=hadith|dua) sets "← Back to the hadith" / "← Back". Opening the Āyah card cleared
// it, so after the card was opened and closed the way back to the other page was gone. Now a way back to another page
// outlives the card, and a way back set inside the page ("Back to Āyah card", after a word is tapped on the card) only stands
// in front of it: used, it brings the card back and the page's way back shows again; the page's own × still removes it.
//   node tools/i18n-verify/qr-page-way-back-survives-card-browser.mjs [--mutate=NAME]   (serve.js on :8080 or QR_BASE, repo root)
//   card-clears   opening the card clears it again          -> "after the Āyah card ... still offers the way back" FAILS
//   no-restore    an in-page way back replaces it for good   -> "shows again after Back to Āyah card" FAILS
//   no-page       the arrival does not mark it as a page's   -> both FAIL
import fs from "node:fs";
import { chromium, newContext, openPage, BASE } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "card-clears": ["      if (!ayahCardReturn?.page) clearAyahCardReturn(); // the card is open again", "      clearAyahCardReturn(); // the card is open again"],
  "no-restore": ["      if (r && !r.page && pageReturn) { ayahCardReturn = pageReturn; pageReturn = null; }", "      if (false) { ayahCardReturn = pageReturn; pageReturn = null; }"],
  "no-page": ['() => history.back(), { page: true });', "() => history.back());"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const pill = (page) => page.evaluate(() => { const p = document.getElementById("ayahCardBackPill"), b = p?.querySelector("[data-ayah-card-back]");
  return p && !p.hidden && b ? (b.getAttribute("aria-label") || "") : null; });
const cardOpen = (page) => page.evaluate(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open") && !!document.querySelector("#ayahActionSheetMount [data-ayah-sheet]"));

for (const [w, h] of [[390, 844], [1280, 900]]) for (const lang of ["en", "bn"]) for (const backTo of ["hadith", "dua"]) {
  const tag = `[${lang} ${w}x${h} from ${backTo}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) await ctx.route("**/app/quranrevival.html*", async (r) => {
    const src = fs.readFileSync("app/quranrevival.html", "utf8"); const [a, b] = MUT[MUTATE];
    if (src.split(a).length !== 2) throw new Error(`mutation anchor not found exactly once: ${MUTATE}`);
    await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
  });
  // A page to come back to (the way back needs history), then the link into the Read view.
  const { page, errors } = await openPage(ctx, "/app/hadith-collections.html");
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/app/quranrevival.html?goto=36:38&back=1&backTo=${backTo}`);
  await page.waitForFunction(() => { const p = document.getElementById("ayahCardBackPill"); return p && !p.hidden; }, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const want = await pill(page);
  check(`${tag} POSITIVE CONTROL the arrival offers its way back`, !!want, String(want));
  // The Āyah card, opened and closed.
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="36:38"]')?.click());
  await page.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
  const opened = await cardOpen(page);
  await page.evaluate(() => document.querySelector("#ayahActionSheetMount .ayah-sheet-close")?.click()); await page.waitForTimeout(600);
  check(`${tag} after the Āyah card is opened and closed, the page still offers the way back (${want})`, opened && (await pill(page)) === want, JSON.stringify({ opened, now: await pill(page) }));
  // A word tapped on the card: "Back to Āyah card" stands in front; used, the card returns and the page's way back shows again.
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="36:38"]')?.click());
  await page.waitForFunction(() => document.querySelector("#ayahActionSheetMount [data-ayah-sheet-status] [data-word-occurrence]"), null, { timeout: 8000 }).catch(() => {});
  const tapped = await page.evaluate(() => { const c = document.querySelector("#ayahActionSheetMount [data-ayah-sheet-status] [data-word-occurrence]"); c?.click(); return !!c; });
  await page.waitForTimeout(1000);
  const inFront = await pill(page);
  check(`${tag} POSITIVE CONTROL a word tapped on the card puts "Back to Āyah card" in front`, tapped && !!inFront && inFront !== want, JSON.stringify({ tapped, inFront }));
  await page.evaluate(() => document.querySelector("#ayahCardBackPill [data-ayah-card-back]")?.click()); await page.waitForTimeout(1200);
  check(`${tag} "Back to Āyah card" brings the card back, and the page's way back shows again`, (await cardOpen(page)) && (await pill(page)) === want, JSON.stringify({ card: await cardOpen(page), now: await pill(page) }));
  await page.evaluate(() => document.querySelector("#ayahActionSheetMount .ayah-sheet-close")?.click()); await page.waitForTimeout(500);
  // The page's own × still removes it.
  await page.evaluate(() => document.querySelector("#ayahCardBackPill [data-ayah-card-back-dismiss]")?.click()); await page.waitForTimeout(400);
  check(`${tag} its × removes the page's way back`, (await pill(page)) === null, String(await pill(page)));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== a way back to another page outlives the Āyah card (QR Lead, decision 86)${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
