// W1 (6 Oct 2026) -- the Writing sheet: choose the Ayah / Range / Surah / Page on the sheet, and
// Show changes the app's own Study Unit everywhere (decision 75); Save + Print live under ⋯.
//
// Run from the repository root, with serve.js on :8080. Expected values are written BY HAND from
// the issue (pages: 2:255 on 42, Yaseen 36:1 on 440, Surah 112 on 604), never computed by the code
// under test. The two-row toolbar at every width is measured in writing-sheet-browser.mjs.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";
const REAL = fs.readFileSync("mushaf/mushaf-madani-v2.json");
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const BN = "০১২৩৪৫৬৭৮৯";
const digits = (n, lang) => (lang === "bn" ? String(n).replace(/[0-9]/g, (d) => BN[d]) : String(n));

async function start({ lang = "en", width = 390, height = 800 } = {}) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem("mm_card_look", "night"); } catch (e) {}
    window.__printed = 0;
    window.print = () => { window.__printed++; };
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
  });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("https://raw.githubusercontent.com/**/mushaf/**", (r) => {
    const u = r.request().url();
    if (u.endsWith("mushaf-madani-v2.json")) return r.fulfill({ status: 200, contentType: "application/json", body: REAL });
    if (u.endsWith("QCF_SurahHeader_COLOR-Regular.woff2")) return r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/QCF_SurahHeader_COLOR-Regular.woff2") });
    return r.abort();
  });
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/fonts/" + r.request().url().split("/").pop()) }));
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page, errors };
}
const readBtnSel = (page) => page.evaluate(() => ((document.getElementById("readHeadBtn")?.getBoundingClientRect().width ?? 0) > 0 ? "#readHeadBtn" : "#readContentsBtn"));
const pick = async (page, tab, n) => {
  await page.click(await readBtnSel(page));
  await page.waitForFunction(() => document.querySelectorAll("#readContentsBody .rc-row").length > 0);
  if (tab !== "surah") await page.click(`[data-rc-tab="${tab}"]`);
  await page.waitForFunction((t) => document.querySelector(`#readContentsBody .rc-row[data-rc-kind="${t}"]`), tab);
  await page.click(`#readContentsBody .rc-row[data-rc-kind="${tab}"][data-rc-n="${n}"]`);
  await page.waitForFunction(() => document.body.classList.contains("immersive-read"));
  await page.waitForTimeout(400);
};
const unbare = async (page) => {
  for (let i = 0; i < 4; i++) {
    const bare = await page.evaluate(() => document.body.classList.contains("fs-hide-readbar") && document.body.classList.contains("fs-hide-transport"));
    if (!bare) return;
    await page.click("#hideChromeBtn"); await page.waitForTimeout(150);
  }
};
const openSheet = async (page) => {
  const onBar = await page.evaluate(() => (document.getElementById("readWritingBtn")?.getBoundingClientRect().width ?? 0) > 0);
  if (onBar) await page.click("#readWritingBtn");
  else { await page.click("#tabStudyBtn"); await page.click("#tabWritingBtn"); }
  await page.waitForFunction(() => !!document.querySelector("#writingSheet .ws-page[data-painted]"), null, { timeout: 15000 });
  await page.waitForTimeout(250);
};
const label = (page) => page.evaluate(() => document.querySelector('#writingSheet [data-ws="unit"]').textContent.trim());
const sheet = (page) => page.evaluate(() => {
  const pgs = [...document.querySelectorAll("#writingSheet .ws-page")];
  return { pages: pgs.map((e) => Number(e.dataset.page)), dimmed: pgs.map((e) => Number(e.dataset.dimmed)), undimmed: pgs.map((e) => Number(e.dataset.undimmed)) };
});
const appUnit = (page) => page.evaluate(() => ({
  type: document.getElementById("unitTypeSelect").value, surah: document.getElementById("surahSelect").value,
  ayah: document.getElementById("ayahSelect").value, from: document.getElementById("rangeFromSelect").value, to: document.getElementById("rangeToSelect").value,
  num: document.getElementById("unitNumSelect")?.value,
}));
// Press 📖, set the panel through its real controls, press Show, and wait for the sheet to re-open on the new unit.
async function choose(page, c) {
  const before = await label(page);
  await page.click('#writingSheet [data-ws="unit"]');
  await page.waitForSelector("#writingSheet [data-ws-unitpanel]:not([hidden])");
  const sel = (k) => `#writingSheet [data-ws-u="${k}"]`;
  await page.selectOption(sel("type"), c.type);
  if (c.surah) await page.selectOption(sel("surah"), String(c.surah));
  if (c.type === "ayah") await page.selectOption(sel("ayah"), String(c.from));
  if (c.type === "range") { await page.selectOption(sel("from"), String(c.from)); await page.selectOption(sel("to"), String(c.to)); }
  if (c.type === "page") await page.selectOption(sel("page"), String(c.page));
  await page.click('#writingSheet [data-ws="unit-show"]');
  return before;
}
const reopened = async (page, before) => {
  await page.waitForFunction((b) => {
    const u = document.querySelector('#writingSheet [data-ws="unit"]');
    return u && u.textContent.trim() !== b && !!document.querySelector("#writingSheet .ws-page[data-painted]");
  }, before, { timeout: 8000 }).catch(() => check("the sheet re-opened on the chosen unit (its label changed)", false, `still "${before}"`));
  await page.waitForTimeout(300);
};
const closeSheet = async (page) => { await page.evaluate(() => document.querySelector('#writingSheet [data-ws="close"]')?.click()); await page.waitForTimeout(150); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const lang of ["en", "bn"]) {
  const { ctx, page, errors } = await start({ lang });
  const tag = `[${lang}]`;
  await pick(page, "surah", 1);
  await unbare(page);
  await openSheet(page);

  // ---- the label and the panel
  const l0 = await label(page);
  // Updated in place, Architect review (#603): the label names the Surah ("Al-Faatiha"), not "Whole Surah 1".
  check(`${tag} the 📖 control shows what the sheet holds now (the Surah's name, in the reader's language)`, l0.includes("📖") && (lang === "bn" ? /আল-ফাতিহা/.test(l0) : /Al-Faatiha/.test(l0)) && !/Whole Surah|সম্পূর্ণ সূরা/.test(l0), l0);
  await page.click('#writingSheet [data-ws="unit"]');
  const panel = await page.evaluate(() => {
    const p = document.querySelector("#writingSheet [data-ws-unitpanel]");
    // Updated in place, Architect review (#603): the RENDERED box, not the [hidden] attribute -- the label's
    // display:flex rule beat [hidden], so every field showed while this check (reading the attribute) passed.
    const vis = (e) => !!e && (e.closest("label") ?? e).getBoundingClientRect().width > 0 && e.getBoundingClientRect().width > 0;
    const types = [...p.querySelectorAll('[data-ws-u="type"] option')].map((o) => o.value);
    return {
      open: !p.hidden, types, surahs: p.querySelectorAll('[data-ws-u="surah"] option').length,
      surahVisible: vis(p.querySelector('[data-ws-u="surah"]')), pageHidden: !vis(p.querySelector('[data-ws-u="page"]')),
      show: !!p.querySelector('[data-ws="unit-show"]'), cancel: !!p.querySelector('[data-ws="unit-cancel"]'),
      firstSurah: p.querySelector('[data-ws-u="surah"] option').textContent,
      inside: [...p.querySelectorAll("select,button")].filter(vis).every((e) => { const r = e.getBoundingClientRect(); return r.left >= -0.5 && r.right <= innerWidth + 0.5; }),
      minH: Math.min(...[...p.querySelectorAll("select,button")].filter(vis).map((e) => e.getBoundingClientRect().height)),
    };
  });
  check(`${tag} the panel offers Ayah · Range · Surah · Page, all 114 surahs, Show and Cancel`, same(panel.types, ["ayah", "range", "surah", "page"]) && panel.surahs === 114 && panel.show && panel.cancel && panel.open, JSON.stringify(panel));
  check(`${tag} ...surah names are in the reader's language (digits in Bangla), controls >= 40px and on screen`, panel.firstSurah.startsWith(digits(1, lang)) && panel.inside && panel.minH >= 40 && panel.surahVisible && panel.pageHidden, JSON.stringify(panel));
  await page.click('#writingSheet [data-ws="unit-cancel"]');
  check(`${tag} Cancel closes the panel and changes nothing`, (await page.evaluate(() => document.querySelector("#writingSheet [data-ws-unitpanel]").hidden)) && (await label(page)) === l0 && same((await appUnit(page)).type, "surah"));

  // ---- Ayah 2:255
  let before = await choose(page, { type: "ayah", surah: 2, from: 255 });
  await reopened(page, before);
  let sh = await sheet(page), au = await appUnit(page);
  check(`${tag} Ayah 2:255 shows page 42 with the other words dimmed`, same(sh.pages, [42]) && sh.dimmed[0] > 0 && sh.undimmed[0] > 0 && sh.undimmed[0] < sh.dimmed[0], JSON.stringify(sh));
  check(`${tag} ...and the app's Study Unit is now Ayah 2:255`, au.type === "ayah" && au.surah === "2" && au.ayah === "255", JSON.stringify(au));
  check(`${tag} ...the label updated`, (await label(page)).includes(digits(255, lang)), await label(page));

  // ---- Range 36:1–12
  before = await choose(page, { type: "range", surah: 36, from: 1, to: 12 });
  await reopened(page, before);
  sh = await sheet(page); au = await appUnit(page);
  check(`${tag} Range 36:1–12 starts on page 440, every page holds some of the range`, sh.pages[0] === 440 && sh.pages.length <= 2 && sh.undimmed.every((n) => n > 0) && sh.dimmed[0] > 0, JSON.stringify(sh));
  check(`${tag} ...and the app's unit is that range`, au.type === "range" && au.surah === "36" && au.from === "1" && au.to === "12", JSON.stringify(au));
  check(`${tag} ...the label updated`, (await label(page)).includes(digits(12, lang)), await label(page));

  // ---- Surah 112
  before = await choose(page, { type: "surah", surah: 112 });
  await reopened(page, before);
  sh = await sheet(page); au = await appUnit(page);
  check(`${tag} Surah 112 shows page 604`, same(sh.pages, [604]) && sh.undimmed[0] > 0, JSON.stringify(sh));
  check(`${tag} ...and the app's unit is Surah 112`, au.type === "surah" && au.surah === "112", JSON.stringify(au));

  // ---- Page 50: nothing dimmed
  before = await choose(page, { type: "page", page: 50 });
  await reopened(page, before);
  sh = await sheet(page); au = await appUnit(page);
  check(`${tag} Page 50 shows page 50 with NOTHING dimmed`, same(sh.pages, [50]) && sh.dimmed[0] === 0 && sh.undimmed[0] > 0, JSON.stringify(sh));
  check(`${tag} ...and the app's unit is page 50`, au.type === "page" && au.num === "50", JSON.stringify(au));
  check(`${tag} ...the label updated`, (await label(page)).includes(digits(50, lang)), await label(page));

  // ---- after closing: the Read view and the wheel's centre show the new unit
  await closeSheet(page);
  const after = await page.evaluate(() => ({
    gone: !document.getElementById("writingSheet"),
    // The Read bar's own pickers are the readout of the unit (the bar's header comment says so).
    chip: `${document.getElementById("readUnitTypeSelect")?.value}:${document.getElementById("readUnitNumSelect")?.value}`,
    hub: (document.getElementById("wheelHubUnitLine1")?.textContent || "") + " " + (document.getElementById("wheelHubUnitLine2")?.textContent || ""),
    hubTitle: document.getElementById("wheelHubUnitLabel")?.title || "",
  }));
  check(`${tag} after closing, the Read view's own unit pickers say page 50`, after.gone && after.chip === "page:50", JSON.stringify(after));
  check(`${tag} ...and the wheel's centre label names page 50`, (after.hub + after.hubTitle).includes(digits(50, lang)), JSON.stringify(after));

  // ---- with writing on the sheet, Show asks first
  await openSheet(page);
  await page.click('#writingSheet [data-ws="write"]');
  const box = await page.evaluate(() => { const r = document.querySelector("#writingSheet .ws-ink").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await page.mouse.move(box.x + box.w * 0.3, box.y + box.h * 0.3);
  await page.mouse.down(); await page.mouse.move(box.x + box.w * 0.6, box.y + box.h * 0.4, { steps: 5 }); await page.mouse.up();
  const lBefore = await label(page);
  await choose(page, { type: "surah", surah: 112 });
  await page.waitForTimeout(300);
  const asked = await page.evaluate(() => { const c = document.querySelector("#writingSheet [data-ws-confirm-unit]"); return !!c && !c.hidden && /Change what you practise\?|অনুশীলনের অংশ বদলাবেন/.test(c.textContent); });
  check(`${tag} with writing on the sheet, Show asks first (inside the sheet)`, asked && (await label(page)) === lBefore && (await appUnit(page)).type === "page");
  await page.click('#writingSheet [data-ws="unit-keep"]');
  const kept = await page.evaluate(() => ({ asking: !document.querySelector("#writingSheet [data-ws-confirm-unit]").hidden, ink: document.querySelector("#writingSheet .ws-ink").getContext("2d").getImageData(0, 0, 50, 50) && true }));
  check(`${tag} Keep writing keeps the sheet and leaves the app's unit unchanged`, !kept.asking && (await label(page)) === lBefore && (await appUnit(page)).type === "page" && (await appUnit(page)).num === "50");
  // The panel is still open after Keep writing; press Show again, then Change.
  await page.click('#writingSheet [data-ws="unit-show"]');
  await page.click('#writingSheet [data-ws="unit-change"]');
  await reopened(page, lBefore);
  au = await appUnit(page);
  check(`${tag} Change clears the writing and applies the unit`, au.type === "surah" && au.surah === "112" && (await sheet(page)).pages[0] === 604, JSON.stringify(au));

  // ---- Save + Print under ⋯
  await page.click('#writingSheet [data-ws="more"]');
  const menu = await page.evaluate(() => {
    const m = document.querySelector("#writingSheet [data-ws-menu]");
    const r = (s) => m.querySelector(s).getBoundingClientRect();
    return { open: !m.hidden, save: r('[data-ws="save"]').width > 0, print: r('[data-ws="print"]').width > 0, h: Math.min(r('[data-ws="save"]').height, r('[data-ws="print"]').height), inside: m.getBoundingClientRect().right <= innerWidth + 0.5 && m.getBoundingClientRect().left >= -0.5 };
  });
  check(`${tag} ⋯ opens Save picture and Print A4 (>= 40px, on screen)`, menu.open && menu.save && menu.print && menu.h >= 40 && menu.inside, JSON.stringify(menu));
  await page.click('#writingSheet [data-ws="print"]');
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 30000 });
  check(`${tag} Print A4 works through ⋯ (and the menu closes)`, await page.evaluate(() => document.querySelector("#writingSheet [data-ws-menu]").hidden));
  await page.click('#writingSheet [data-ws="more"]');
  const dl = page.waitForEvent("download", { timeout: 15000 }).catch(() => null);
  await page.click('#writingSheet [data-ws="save"]');
  const d = await dl;
  check(`${tag} Save picture works through ⋯ (a PNG download)`, !!d && /\.png$/.test(d.suggestedFilename()), d ? d.suggestedFilename() : "no download");

  // ---- Hide and show the tools
  await page.click('#writingSheet [data-ws="tools"]'); await page.waitForTimeout(150);
  const hid = await page.evaluate(() => ({ unit: document.querySelector('#writingSheet [data-ws="unit"]').getBoundingClientRect().width, tg: document.querySelector('#writingSheet [data-ws="tools"]').getBoundingClientRect() }));
  check(`${tag} Hide hides the tools and leaves one button to bring them back`, hid.unit === 0 && hid.tg.width >= 40 && hid.tg.right <= 390.5 && hid.tg.left >= 0);
  await page.click('#writingSheet [data-ws="tools"]'); await page.waitForTimeout(150);
  check(`${tag} ...and it brings them back`, (await page.evaluate(() => document.querySelector('#writingSheet [data-ws="unit"]').getBoundingClientRect().width)) > 40);

  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|Failed to load resource/.test(e)).length === 0, errors.join(" | ").slice(0, 300));
  await ctx.close();
}

// ---- Juz opens as today, and the panel still works from it
{
  const { ctx, page } = await start({ lang: "en" });
  await pick(page, "juz", 30);
  await unbare(page);
  await openSheet(page);
  const l = await label(page);
  check("a Juz unit opens as today, with the control saying so", /Juz/.test(l) && /30/.test(l), l);
  const before = await choose(page, { type: "surah", surah: 112 });
  await reopened(page, before);
  check("...and the panel changes it to Surah 112 (the app's unit follows)", (await appUnit(page)).type === "surah" && (await appUnit(page)).surah === "112");
  await ctx.close();
}

console.log(`\nwriting-sheet-unit-toolbar-browser: ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
