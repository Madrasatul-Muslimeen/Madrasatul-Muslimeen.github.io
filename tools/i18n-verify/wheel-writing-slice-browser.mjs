// The Owner, 6 Oct 2026 (two asks, one screenshot of the landing wheel):
//   1. the gold pill in the wheel's centre reads "Take an Approach" (its second line, the unit, stays);
//   2. tapping the Arabic Writing slice opens the Writing sheet "for writing practice".
// Run from the REPOSITORY ROOT with serve.js on :8080. Expected values are written by hand.
//   --mutate=no-route   the slice goes to the Track card as before   -> the sheet checks fail
//   --mutate=all-slices every slice opens the sheet                  -> the "other slice" check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import { APPROACH_TEMPLATES } from "../../app/js/catalogue-data.js";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);

// The hardcoded id is bound back to its source of truth (CLAUDE.md): approach_05 must still be Arabic Writing.
const t05 = APPROACH_TEMPLATES.find((t) => t.id === "approach_05");
check('the catalogue\'s approach_05 is still "Arabic Writing"', t05?.name?.en === "Arabic Writing", JSON.stringify(t05?.name));

const REAL = fs.readFileSync("mushaf/mushaf-madani-v2.json");
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
// The live tenant's Approaches are seeded from the catalogue, so its Arabic Writing is "approach_05"
// (sourceTemplateId approach_05). The default fixture's Approaches carry short ids, so add it.
const SEED = `
DATA.trackables.push({ _id: TENANT_ID + "__approach_05", tenantId: TENANT_ID, subjectId: "quran", order: 2, status: "active",
  name: lang("Arabic Writing", "আরবি লিখন অনুশীলন"), groupName: lang("Preservation", "সংরক্ষণ"), sourceTemplateId: "approach_05",
  guide: { what: lang("What it is", "এটি কী"), how: lang("How", "কীভাবে"), measure: lang("Measure", "মাপ") }, panels: ["text"] });`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function start(lang, width) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("https://raw.githubusercontent.com/**/mushaf/**", (r) => {
    const u = r.request().url();
    if (u.endsWith("mushaf-madani-v2.json")) return r.fulfill({ status: 200, contentType: "application/json", body: REAL });
    if (u.endsWith("QCF_SurahHeader_COLOR-Regular.woff2")) return r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/QCF_SurahHeader_COLOR-Regular.woff2") });
    return r.abort();
  });
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/fonts/" + r.request().url().split("/").pop()) }));
  if (MUTATE) {
    await ctx.route("**/app/quranrevival.html", async (route) => {
      const res = await route.fetch();
      let body = await res.text();
      const anchor = "        if (isWritingApproach(key)) {";
      if (!body.includes(anchor)) throw new Error("mutation anchor missing");
      body = body.split(anchor).join(MUTATE === "no-route" ? "        if (false) {" : "        if (true) {");
      route.fulfill({ response: res, body });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => !!document.querySelector('#wheelContainer .wheel-seg[data-key]'), null, { timeout: 15000 });
  return { ctx, page, errors };
}
const tapSlice = (page, key) => page.evaluate((k) => document.querySelector(`#wheelContainer .wheel-seg[data-key="${k}"]`)?.dispatchEvent(new MouseEvent("click", { bubbles: true })), key);
const sheetOpen = (page) => page.evaluate(() => !!document.querySelector("#writingSheet") && getComputedStyle(document.querySelector("#writingSheet")).display !== "none" && !!document.querySelector("#writingSheet .ws-page"));

for (const lang of ["en", "bn"]) for (const width of [390, 1280]) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== ${tag} ===`);
  {
    const { ctx, page } = await start(lang, width);
    const pill = await page.evaluate(() => document.querySelector("#wheelCtaBtn .wheel-cta-line1")?.textContent.trim());
    check(`${tag}: the centre pill reads "Take an Approach"`, pill === (lang === "bn" ? "একটি পদ্ধতি গ্রহণ করুন" : "Take an Approach"), pill);
    check(`${tag}: the Arabic Writing slice is on the wheel`, await page.evaluate(() => !!document.querySelector('#wheelContainer .wheel-seg[data-key="approach_05"]')));
    await tapSlice(page, "approach_05");
    const opened = await page.waitForFunction(() => !!document.querySelector("#writingSheet .ws-page[data-painted]"), null, { timeout: 15000 }).then(() => true).catch(() => false);
    check(`${tag}: tapping Arabic Writing opens the Writing sheet, with its page drawn`, opened && await sheetOpen(page));
    check(`${tag}: ...and not the Track card`, await page.evaluate(() => { const v = document.getElementById("noteView"); return !v || v.hidden || getComputedStyle(v).display === "none"; }));
    check(`${tag}: ...with Arabic Writing chosen as the Approach`, await page.evaluate(() => document.getElementById("trackableSelect")?.value === "approach_05"));
    await ctx.close();
  }
  {
    const { ctx, page } = await start(lang, width);
    await tapSlice(page, "tajweed");
    await page.waitForTimeout(1500);
    // UPDATED in place (decision 95, R3a): the Track card is the Notes pane's Track tab now, not the Note view.
    check(`${tag}: another slice (Tajweed) still opens its Track card, not the sheet`, !(await sheetOpen(page)) && await page.evaluate(() => !!document.querySelector(".rnp-track:not([hidden]) .way-embed") && !document.getElementById("noteView"))); // #742: the Note view is deleted, not just hidden
    await ctx.close();
  }
}

await browser.close();
console.log(`\n==== Wheel: "Take an Approach" and the Arabic Writing slice: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
