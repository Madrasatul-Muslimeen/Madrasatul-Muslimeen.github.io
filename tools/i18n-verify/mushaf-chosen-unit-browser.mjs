// The Owner, 9 Oct 2026, with two screenshots (Range 18:1-15 chosen, Mushaf view): "Range is chosen but the
// indication shows page. Then 'record your progress' for range is chosen but the card shows page number again here
// too. Fix." In Mushaf view the Read bar's reference names the CHOSEN Study Unit, and both it and Record Your
// Progress open that unit's card and record against THAT unit -- unless the chosen unit is a page, when the page on
// screen keeps the reference and the page card (decisions 3 and 37, the positive control below).
// Fixture written by hand: Mushaf page 50 holds 3:55 only; the unit chosen is Range 3:55-60.
// Run from the repository root, serve.js on :8080.
//   --mutate=pagewins   the chosen unit is ignored (the old behaviour) -> every Range check fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
const { buildUnitKey } = await import("../../app/js/unit-keys.js");

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = { pagewins: ["quranrevival.html", '      return info.unitType === "page" ? null : info;', "      return null;"] };
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";
const MUSHAF = { "50": [{ type: "ayah", words: [{ g: "Ⓦ", loc: "3:55:1" }, { g: "Ⓜ", loc: "3:55:2" }] }] };
const SEED = `
DATA.records.push(
  { _id: TENANT_ID + "__p1__surah_3", tenantId: TENANT_ID, personId: "p1", entries: {} },
  { _id: TENANT_ID + "__p1__subject_quran", tenantId: TENANT_ID, personId: "p1", entries: {} }
);
`;
const RANGE_KEY = buildUnitKey.range(3, 55, 60), PAGE_KEY = buildUnitKey.page("madani", 50);
check("the keys are built by buildUnitKey: range:3:55-60 and page:madani:50", RANGE_KEY === "range:3:55-60" && PAGE_KEY === "page:madani:50", `${RANGE_KEY} ${PAGE_KEY}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function start(lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 1024 : 844 }, extraSeedJs: SEED });
  await ctx.route(MUSHAF_JSON_URL, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MUSHAF) }));
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => r.abort("failed"));
  await ctx.route(SURAH_HEADER_FONT_URL, (r) => r.abort("failed"));
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing in ${file}`);
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  return { ctx, ...(await openPage(ctx, "/app/quranrevival.html")) };
}
async function click(page, sel) {
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    try { await page.click(sel, { timeout: 4000 }); return; } catch (e) { if (i === 3) throw e; }
  }
}
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
async function openMushaf(page, unit) {
  const inRead = await page.evaluate(() => (document.getElementById("readBar")?.getBoundingClientRect().width ?? 0) > 0);
  if (!inRead) {
    const ok = await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0);
    if (!ok) { await click(page, "#tabStudyBtn"); await page.waitForTimeout(150); }
    await click(page, "#tabReadBtn");
    await page.waitForTimeout(500);
  }
  await setSel(page, "surahSelect", "3"); await page.waitForTimeout(1500);
  await setSel(page, "unitTypeSelect", unit); await page.waitForTimeout(800);
  if (unit === "range") { await setSel(page, "rangeFromSelect", "55"); await page.waitForTimeout(300); await setSel(page, "rangeToSelect", "60"); await page.waitForTimeout(800); }
  await page.evaluate(() => { const t = document.getElementById("mushafToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction(() => { const r = document.getElementById("mushafPageRef"); return r && !r.hidden && r.dataset.page; }, null, { timeout: 10000 }).catch(() => {});
}
const overlay = (page) => page.evaluate(() => {
  const vis = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 0);
  const unit = vis("#ayahActionSheetMount [data-unit-card]"), pageCard = vis(".page-approach-card");
  return { unit: unit.length, page: pageCard.length, head: (unit[0] ?? pageCard[0])?.querySelector(".ayah-sheet-ref, .unit-card-title, h2, h3")?.textContent ?? (unit[0] ?? pageCard[0])?.textContent.slice(0, 80) ?? "" };
});
const closeCards = async (page) => { await page.keyboard.press("Escape"); await page.evaluate(() => document.querySelector("#ayahActionSheetMount [data-unit-card-close], #ayahActionSheetMount [data-page-approach-close]")?.click()); await page.waitForTimeout(300); };

for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`, bn = lang === "bn";
  const R = bn ? "৫৫–৬০" : "55–60";
  const { ctx, page, errors } = await start(lang, width);
  await openMushaf(page, "range");
  const ref = await page.evaluate(() => { const r = document.getElementById("mushafPageRef"); return { page: r.dataset.page, text: r.querySelector(".mushaf-page-ref-text")?.textContent ?? "", label: r.getAttribute("aria-label") ?? "" }; });
  check(`${tag} Mushaf view, Range 3:55–60 chosen: the page on screen is 50 (fixture)`, ref.page === "50", JSON.stringify(ref));
  check(`${tag} ...and the Read bar's reference names the Range ("${R}"), not the page's āyāt`, ref.text.includes(R), JSON.stringify(ref));

  await click(page, "#readBarRecordBtn");
  await page.waitForTimeout(900);
  const rec = await overlay(page);
  check(`${tag} Record Your Progress opens the Range's card, not the page card`, rec.unit === 1 && rec.page === 0 && rec.head.includes(R), JSON.stringify(rec));
  // Record a stage: the write is the Range's record, in the Surah's chunk; nothing is written for the page.
  await page.evaluate(() => { window.__stubWriteData = []; });
  await page.evaluate(() => { const s = document.querySelector("#ayahActionSheetMount [data-approach-stage-select]"); if (s && !s.value) { s.value = s.options[1]?.value ?? ""; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('#ayahActionSheetMount [data-approach-stage-btn="learning"]')?.click());
  await page.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "records"), null, { timeout: 8000 }).catch(() => {});
  const keys = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "records").flatMap((w) => Object.keys(w.data ?? {}).concat(Object.keys(w.data?.entries ?? {})).map((k) => `${w.id} ${k}`)));
  check(`${tag} pressing Learning records range:3:55-60 in t1__p1__surah_3, and nothing for page:madani:50`, keys.some((k) => k.startsWith("t1__p1__surah_3") && k.includes(RANGE_KEY)) && !keys.some((k) => k.includes(PAGE_KEY)), JSON.stringify(keys).slice(0, 300));
  await closeCards(page);

  await click(page, "#mushafPageRef");
  await page.waitForTimeout(900);
  const tap = await overlay(page);
  check(`${tag} tapping the reference opens the Range's card too`, tap.unit === 1 && tap.page === 0 && tap.head.includes(R), JSON.stringify(tap));
  await closeCards(page);

  // Positive control: the chosen unit IS a page -> the page on screen, its reference and its card, as before.
  await openMushaf(page, "page");
  const pref = await page.evaluate(() => document.querySelector("#mushafPageRef .mushaf-page-ref-text")?.textContent ?? "");
  check(`${tag} with Page chosen, the reference names the page's own āyāt ("· ${bn ? "৫৫" : "55"}")`, pref.endsWith(bn ? "৫৫" : "55") && !pref.includes(R), pref);
  await click(page, "#readBarRecordBtn");
  await page.waitForTimeout(900);
  const pc = await overlay(page);
  check(`${tag} ...and Record Your Progress opens the page card (Page ${bn ? "৫০" : "50"})`, pc.page === 1 && pc.unit === 0 && pc.head.includes(bn ? "৫০" : "50"), JSON.stringify(pc));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource|quran\.foundation/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Mushaf view follows the chosen unit: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
