// MSA · QR J132 (the Owner, 10 Nov 2026: "Study moves to dot. Place it elegantly. That will make space for play, nav buttons. n132c:B"):
// ONE Read bar. The picker row (unit / sūrah / āyah), the gold Take an Approach | Record Your Progress | Know Your Status pill and the
// Study ▾ row are no longer on the Read bar; they are ONE labelled "Study" group at the top of the bar's ⋮ sheet. ⏮ ⏭ ▶ ■ stay on the bar.
// Bismillah stays on the intention card only (untouched here).
//
//   node tools/i18n-verify/read-one-bar-browser.mjs [--mutate=NAME] [--width=390] [--lang=en]   (repository root, serve.js on :8080)
//   --mutate=pillback   the old pill is shown again                       -> "the old rows are not on the bar" FAILS
//   --mutate=nostudy    the ⋮ sheet loses its Study group (ONE Ayah view) -> the Study group / picker / tile checks FAIL
//   --mutate=nofwd      a pick made in the sheet is not passed on         -> "a pick in the sheet changes the real picker" FAILS
//   --mutate=noreopen   the sheet is not opened again after a pick        -> "the sheet is open again" FAILS
//   --mutate=noflow     Read on has no ⋮ with the Study group             -> the Read on check FAILS
//   --mutate=nomushaf   the Mushaf's ⋮ has no Study group                 -> the Mushaf check FAILS
// Expected values are written BY HAND. Every number is measured on the rendered page, not read from the code under test.
import { chromium, newContext, openPage, goReadOn } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate");
const MUT = {
  pillback: ["#readPickers, #readBar #readApproachBar, #readBar #readQuickRow, body.immersive-read #readBar #readQuickRow { display: none !important; }", "#readPickers, #readBar #readQuickRow, body.immersive-read #readBar #readQuickRow { display: none !important; }"],
  nostudy: ["extraTiles: barUnitTilesHtml(), studyBlock: studyGroupHtml(),\n          // Text-tools round", "extraTiles: barUnitTilesHtml(),\n          // Text-tools round"],
  nofwd: ["src.value = m.value; src.dispatchEvent(new Event(\"change\", { bubbles: true }));\n    });", "void 0;\n    });"],
  noreopen: ["if (Date.now() - studySheetKeepOpenAt > 4000) return;", "return;"],
  noflow: ["{ sheet: true, studyOnly: true, studyBlock: studyGroupHtml(), extraTiles: barUnitTilesHtml() }", "{ sheet: true, studyOnly: true, studyBlock: \"\", extraTiles: \"\" }"],
  nomushaf: ["extraTiles: barUnitTilesHtml(), studyBlock: studyGroupHtml() });\n      attachAyahQuickMenus(readQuickMenuSlot);", "extraTiles: barUnitTilesHtml() });\n      attachAyahQuickMenus(readQuickMenuSlot);"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const WIDTHS = arg("width") ? [Number(arg("width"))] : [320, 360, 390, 768, 1280];
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const MUSHAF = fs.readFileSync("mushaf/mushaf-madani-v2.json");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function start(lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 1000 : 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: MUSHAF }));
  await ctx.route("https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/**", (r) => { const f = r.request().url().split("/").pop(); r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/fonts/" + f) }); });
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const src = await res.text();
      if (src.split(a).length !== 2) throw new Error(`mutation ${MUTATE}: anchor found ${src.split(a).length - 1} times, not 1`);
      r.fulfill({ response: res, body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page, errors };
}
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
async function openAyah(page) {
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", "57"); await page.waitForTimeout(1500);
  await setSel(page, "unitTypeSelect", "ayah"); await page.waitForTimeout(500);
  await setSel(page, "ayahSelect", "5"); await page.waitForTimeout(800);
}
const SHEET = "#readQuickMenuSlot .quick-menu";
const sheetOpen = (page) => page.evaluate((q) => !!document.querySelector(q)?.classList.contains("open"), SHEET);
async function openSheet(page) { if (!(await sheetOpen(page))) { await page.click("#readQuickMenuSlot .ayah-quick-btn", { timeout: 8000 }); await page.waitForTimeout(350); } }
const BN = /[ঀ-৿]/;

const bar = (page) => page.evaluate(() => {
  const R = (e) => e.getBoundingClientRect(), vis = (e) => R(e).width > 0 && R(e).height > 0 && getComputedStyle(e).visibility !== "hidden";
  const old = ["readPickers", "readApproachBar", "readQuickRow"].map((id) => [id, document.getElementById(id) ? Math.round(R(document.getElementById(id)).width) : -1]);
  const ctl = [...document.querySelectorAll("#readBar button, #readBar label.read-on-switch, #readBar select")].filter(vis);
  const tops = [...new Set(ctl.map((e) => Math.round(R(e).top)))];
  return {
    old, n: ctl.length, ids: ctl.map((e) => e.id || e.className).slice(0, 14),
    small: ctl.filter((e) => R(e).height < 39.5).map((e) => (e.id || e.className) + ":" + Math.round(R(e).height)),
    cut: ctl.filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== "visible").map((e) => e.id || e.className),
    out: ctl.filter((e) => R(e).left < -0.5 || R(e).right > innerWidth + 0.5).map((e) => e.id || e.className),
    over: document.documentElement.scrollWidth - document.documentElement.clientWidth, lines: tops.length,
    transport: ["prevUnitBtn", "nextUnitBtn", "readPlayBtn", "readStopBtn"].map((id) => !!document.getElementById(id) && vis(document.getElementById(id))),
    readOn: !!document.getElementById("readOnSwitch") && vis(document.getElementById("readOnSwitch")),
  };
});
const sheet = (page) => page.evaluate((q) => {
  const R = (e) => e.getBoundingClientRect(), m = document.querySelector(q); if (!m) return null;
  const g = m.querySelector(".qm-study"), mb = R(m);
  const places = [...m.querySelectorAll("[data-qm-place]")].filter((e) => R(e).width > 0);
  const tiles = [...m.querySelectorAll(".qm-study-tiles .qm-tile")];
  const grid = m.querySelector(".qm-tiles:not(.qm-study-tiles)");
  return {
    group: !!g, title: g?.querySelector(".qm-group-title")?.textContent.trim() ?? "", first: !!g && m.firstElementChild === g,
    placeIds: places.map((e) => e.dataset.qmPlace), placeH: places.map((e) => Math.round(R(e).height)), placeCut: places.filter((e) => R(e).right > mb.right + 0.5 || R(e).left < mb.left - 0.5).length,
    tileLabels: tiles.map((t) => t.getAttribute("aria-label")), tileH: tiles.map((t) => Math.round(R(t).height)), tileRow: new Set(tiles.map((t) => Math.round(R(t).top))).size === 1,
    tileCut: tiles.some((t) => t.scrollWidth > t.clientWidth + 1),
    above: !!g && !!grid && R(g).bottom <= R(grid).top + 1, inside: mb.left >= -1 && mb.right <= innerWidth + 1 && mb.bottom <= innerHeight + 1, over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    play: !!m.querySelector("[data-qm-play]"),
  };
}, SHEET);

for (const lang of LANGS) for (const width of WIDTHS) {
  const tag = `[${lang} ${width}]`;
  const { ctx, page, errors } = await start(lang, width);
  await openAyah(page);

  const b = await bar(page);
  check(`${tag} the old rows (picker row, Approach pill, Study ▾) are not on the bar`, b.old.every(([, w]) => w === 0), JSON.stringify(b.old));
  check(`${tag} ⏮ ⏭ ▶ ■ are on the bar, and Read on`, b.transport.every(Boolean) && b.readOn, JSON.stringify(b));
  check(`${tag} every control on the bar is 40px tall, none cut, none off the screen, no sideways scroll`, b.small.length === 0 && b.cut.length === 0 && b.out.length === 0 && b.over <= 0, JSON.stringify(b));
  check(`${tag} the bar is ${width >= 600 ? "one line" : "at most two lines"} (${b.lines})`, width >= 600 ? b.lines === 1 : b.lines <= 2, JSON.stringify(b));

  await openSheet(page);
  const s = await sheet(page);
  check(`${tag} the ⋮ sheet opens with ONE labelled Study group at its top`, !!s?.group && s.first && (lang === "bn" ? BN.test(s.title) : s.title === "Study"), JSON.stringify(s));
  check(`${tag} Study holds the unit, sūrah and āyah pickers, each 40px or more, inside the sheet`, !!s && JSON.stringify(s.placeIds) === JSON.stringify(["readUnitTypeSelect", "readSurahSelect", "readAyahSelect"]) && s.placeH.every((h) => h >= 39.5) && s.placeCut === 0, JSON.stringify(s));
  const want = lang === "bn" ? [BN, BN, BN] : ["Take an Approach", "Record Your Progress", "Know Your Status"];
  check(`${tag} Study holds the three Approach tiles in one row, 40px or more, none cut`, !!s && s.tileLabels.length === 3 && s.tileLabels.every((l, i) => (want[i] instanceof RegExp ? want[i].test(l) : l === want[i])) && s.tileRow && s.tileH.every((h) => h >= 39.5) && !s.tileCut, JSON.stringify(s));
  check(`${tag} the Study group sits above the tiles, the sheet inside the screen, no sideways scroll`, !!s && s.above && s.inside && s.over <= 0, JSON.stringify(s));
  if (width === 390 || width === 1280) await page.screenshot({ path: `/tmp/one-bar-${lang}-${width}-sheet.png` });

  // a pick in the sheet changes the real picker, and the sheet is open again
  await page.selectOption('[data-qm-place="readAyahSelect"]', "7"); await page.waitForTimeout(1500);
  const p1 = await page.evaluate(() => ({ real: document.getElementById("ayahSelect").value, bar: document.getElementById("readAyahSelect").value }));
  check(`${tag} a pick in the sheet changes the real picker (āyah 7)`, p1.real === "7" && p1.bar === "7", JSON.stringify(p1));
  check(`${tag} ...and the sheet is open again, showing 7`, (await sheetOpen(page)) && (await page.evaluate(() => document.querySelector('[data-qm-place="readAyahSelect"]').value)) === "7");
  await page.selectOption('[data-qm-place="readUnitTypeSelect"]', "range"); await page.waitForTimeout(1500);
  const p2 = await page.evaluate(() => ({ unit: document.getElementById("unitTypeSelect").value, shown: [...document.querySelectorAll("[data-qm-place]")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.dataset.qmPlace) }));
  check(`${tag} choosing Range in the sheet brings From and To (and takes the āyah picker away)`, p2.unit === "range" && JSON.stringify(p2.shown) === JSON.stringify(["readUnitTypeSelect", "readSurahSelect", "readRangeFromSelect", "readRangeToSelect"]), JSON.stringify(p2));
  await page.selectOption('[data-qm-place="readUnitTypeSelect"]', "ayah"); await page.waitForTimeout(1200);
  await page.keyboard.press("Escape");
  await page.evaluate(() => document.body.click()); await page.waitForTimeout(200);

  // the three tiles press what the three buttons always pressed (way back: each opens the card / view it always did, closed by its own ←)
  if (width === 390 || width === 1280) {
    await openSheet(page); await page.click(`${SHEET} [data-qm-act="record"]`); await page.waitForTimeout(900);
    check(`${tag} Record Your Progress (tile) opens the Unit card`, await page.evaluate(() => !!document.querySelector("#ayahActionSheetMount [data-unit-card], #ayahActionSheetMount [data-ayah-card], #ayahActionSheetOverlay.open")));
    await page.keyboard.press("Escape"); await page.evaluate(() => { document.getElementById("ayahActionSheetOverlay")?.click(); document.querySelector("[data-unit-card-close]")?.click(); }); await page.waitForTimeout(400);
    await openSheet(page); await page.click(`${SHEET} [data-qm-act="approach"]`); await page.waitForTimeout(900);
    check(`${tag} Take an Approach (tile) shows the Approaches wheel`, await page.evaluate(() => { const w = document.getElementById("wheelPopupView"); return !!w && !w.hidden; }));
  }

  // Mushaf and Read on keep the same ⋮ with the Study group
  if (width === 390 || width === 1280) { await page.evaluate(() => { const w = document.getElementById("wheelPopupView"); if (w && !w.hidden) document.getElementById("tabStudyBtn")?.click(); }); await openAyah(page); } // back to the Read view after the wheel
  await page.evaluate(() => document.getElementById("readMushafBtn")?.click()); await page.waitForTimeout(1800);
  const hasDots = await page.evaluate(() => (document.querySelector("#readQuickMenuSlot .ayah-quick-btn")?.getBoundingClientRect().width ?? 0) > 0);
  if (hasDots) { await openSheet(page); }
  const sm = hasDots ? await sheet(page) : null;
  check(`${tag} Mushaf: the ⋮ is on the bar and its sheet has the Study group`, hasDots && !!sm?.group && sm.placeIds.length >= 2 && sm.tileLabels.length === 3, JSON.stringify(sm));
  await page.keyboard.press("Escape"); await page.evaluate(() => document.body.click());
  await page.evaluate(() => { const c = document.getElementById("mushafToggle"); if (c?.checked) document.getElementById("readMeaningBtn")?.click(); }); await page.waitForTimeout(1200);
  for (let i = 0; i < 3; i++) { if (await page.evaluate(() => [...document.querySelectorAll("#pageViewContainer [data-meaning-key]")].some((e) => e.offsetParent !== null))) break; await goReadOn(page); await page.waitForTimeout(1300); }
  const flowOn = await page.evaluate(() => [...document.querySelectorAll("#pageViewContainer [data-meaning-key]")].some((e) => e.offsetParent !== null));
  const dots2 = await page.evaluate(() => (document.querySelector("#readQuickMenuSlot .ayah-quick-btn")?.getBoundingClientRect().width ?? 0) > 0);
  if (dots2) await openSheet(page);
  const sr = dots2 ? await sheet(page) : null;
  check(`${tag} Read on: POSITIVE CONTROL the flow is on`, flowOn);
  check(`${tag} Read on: the bar has a ⋮ whose sheet has the Study group (and no per-āyah Play tile: that is each āyah's own)`, dots2 && !!sr?.group && sr.tileLabels.length === 3 && !sr.play, JSON.stringify(sr));
  const real = errors.filter((e) => !/Failed to load resource|net::ERR_/.test(e));
  check(`${tag} no page errors`, real.length === 0, real.join("; "));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
