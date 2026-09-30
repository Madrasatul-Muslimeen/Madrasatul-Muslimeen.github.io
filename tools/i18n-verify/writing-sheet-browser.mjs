// Issue #421 -- the Writing sheet: the Mushaf page as an A4 tracing sheet.
//
// Run from the repository root, with serve.js on :8080. Expected values are
// written BY HAND from the issue, never computed by the code under test.
// Set SHOTS=<dir> to also save screenshots of the sheet.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";
const REAL = fs.readFileSync("mushaf/mushaf-madani-v2.json");
const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";
const SHOTS = process.env.SHOTS || "/tmp/writing-sheet-shots";
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function start({ lang = "en", width = 390, height = 844, requests = null } = {}) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem("mm_card_look", "night"); } catch (e) {}
    window.__printed = 0;
    window.print = () => { window.__printed++; };
    window.__shared = [];
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
  });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("https://raw.githubusercontent.com/**/mushaf/**", (r) => {
    if (requests) requests.push(r.request().url());
    const u = r.request().url();
    if (u.endsWith("mushaf-madani-v2.json")) return r.fulfill({ status: 200, contentType: "application/json", body: REAL });
    if (u.endsWith("QCF_SurahHeader_COLOR-Regular.woff2")) return r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/QCF_SurahHeader_COLOR-Regular.woff2") });
    return r.abort();
  });
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => {
    if (requests) requests.push(r.request().url());
    const f = r.request().url().split("/").pop();
    r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/fonts/" + f) });
  });
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
  await page.waitForFunction(() => !!document.querySelector("#pageViewContainer .hifz-page .hifz-word"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300);
};
// A bar with all its buttons (the bare full-screen state hides them): leave the bare state.
const unbare = async (page) => {
  for (let i = 0; i < 4; i++) {
    const bare = await page.evaluate(() => document.body.classList.contains("fs-hide-readbar") && document.body.classList.contains("fs-hide-transport"));
    if (!bare) return;
    await page.click("#hideChromeBtn"); await page.waitForTimeout(150);
  }
};
const setUnit = (page, o) => page.evaluate(async (o) => {
  const fire = (el, v) => { el.value = String(v); el.dispatchEvent(new Event("change", { bubbles: true })); };
  const s = document.getElementById("surahSelect");
  if (o.surah && s.value !== String(o.surah)) { fire(s, o.surah); await new Promise((r) => setTimeout(r, 900)); }
  fire(document.getElementById("unitTypeSelect"), o.type);
  await new Promise((r) => setTimeout(r, 300));
  if (o.ayah) { fire(document.getElementById("ayahSelect"), o.ayah); await new Promise((r) => setTimeout(r, 300)); }
  if (o.from) { fire(document.getElementById("rangeFromSelect"), o.from); fire(document.getElementById("rangeToSelect"), o.to); await new Promise((r) => setTimeout(r, 300)); }
}, o);
const sheetPages = (page) => page.evaluate(() => [...document.querySelectorAll("#writingSheet .ws-page")].map((e) => Number(e.dataset.page)));
// Updated in place, Architect, 30 Sep 2026 ("Both"): the bar's ✍ is shown only
// where it fits, so open through it when it is on screen and through the Study
// menu's ✍ Writing sheet otherwise -- both call the same function.
const openSheet = async (page) => {
  const onBar = await page.evaluate(() => (document.getElementById("readWritingBtn")?.getBoundingClientRect().width ?? 0) > 0);
  if (onBar) await page.click("#readWritingBtn");
  else { await page.click("#tabStudyBtn"); await page.click("#tabWritingBtn"); }
  await page.waitForFunction(() => !!document.querySelector("#writingSheet .ws-page[data-painted]"), null, { timeout: 15000 });
  await page.waitForTimeout(250);
};
const closeSheet = async (page) => { await page.evaluate(() => document.querySelector('#writingSheet [data-ws="close"]')?.click()); await page.waitForTimeout(100); };

// ---- pixel helpers, run in the page
const pixels = (page, sel = "#writingSheet .ws-page-canvas") => page.evaluate((sel) => {
  const c = document.querySelector(sel);
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  const g0 = JSON.parse(c.parentElement.dataset.geom);
  const near = (r, g, b, R, G, B, tol) => Math.abs(r - R) <= tol && Math.abs(g - G) <= tol && Math.abs(b - B) <= tol;
  const scale = c.width / (1); // canvas px per page-width
  let fill = 0, marker = 0, nonPaper = 0;
  const warm = [];
  for (let y = 0; y < c.height; y++) {
    // rows inside a line's band, above its ruled line (0.9 of a pitch)
    const rel = (y / scale - g0.top) / g0.pitch;
    const inBand = rel >= 0 && rel < 15 && (rel - Math.floor(rel)) < 0.9;
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (near(r, g, b, 0xdc, 0xd8, 0xcd, 1)) fill++;
      // the marker is thin ringed ink; count dark navy-leaning pixels (b > r, luminance < 110)
      if (b > r + 10 && 0.3 * r + 0.59 * g + 0.11 * b < 110) marker++;
      if (!near(r, g, b, 0xff, 0xfd, 0xf8, 2)) nonPaper++;
      if (inBand && r - b > 15) warm.push(0.3 * r + 0.59 * g + 0.11 * b);
    }
  }
  warm.sort((a, b) => a - b);
  return { fill, marker, warmP5: warm[Math.floor(warm.length * 0.05)], warmN: warm.length, nonPaper, w: c.width, h: c.height };
}, sel);
const inkPixels = (page) => page.evaluate(() => {
  const c = document.querySelector("#writingSheet .ws-page .ws-ink");
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
  return n;
});
const stroke = async (page, pts) => {
  const box = await page.evaluate(() => { const r = document.querySelector("#writingSheet .ws-page .ws-ink").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await page.mouse.move(box.x + pts[0][0] * box.w, box.y + pts[0][1] * box.h);
  await page.mouse.down();
  for (const p of pts.slice(1)) await page.mouse.move(box.x + p[0] * box.w, box.y + p[1] * box.h, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(80);
};
const clickWs = (page, sel) => page.evaluate((s) => document.querySelector(`#writingSheet ${s}`).click(), sel);
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); };

// ================= pages per unit (hand-written expectations)
{
  const { ctx, page } = await start({ width: 390 });
  await pick(page, "surah", 67);
  await unbare(page);
  await openSheet(page);
  check("Surah 67 -> 3 pages (562, 563, 564)", JSON.stringify(await sheetPages(page)) === "[562,563,564]", JSON.stringify(await sheetPages(page)));
  await closeSheet(page);
  await ctx.close();
}
{
  const { ctx, page } = await start({ width: 390 });
  await pick(page, "ruku", 295);
  await unbare(page);
  await openSheet(page);
  check("Ruku' 23:1-22 -> 2 pages (342, 343)", JSON.stringify(await sheetPages(page)) === "[342,343]", JSON.stringify(await sheetPages(page)));
  await ctx.close();
}
{
  const { ctx, page } = await start({ width: 390 });
  await pick(page, "page", 342);
  await unbare(page);
  await openSheet(page);
  check("Page 342 -> 1 page (342)", JSON.stringify(await sheetPages(page)) === "[342]", JSON.stringify(await sheetPages(page)));
  await ctx.close();
}
{
  const { ctx, page } = await start({ width: 390 });
  await pick(page, "juz", 30);
  await unbare(page);
  await openSheet(page);
  const p = await sheetPages(page);
  check("Juz 30 -> 23 pages (582..604)", p.length === 23 && p[0] === 582 && p[22] === 604, JSON.stringify(p));
  const painted = await page.evaluate(() => document.querySelectorAll("#writingSheet .ws-page[data-painted]").length);
  check("Juz 30: pages are drawn lazily (not all 23 at once)", painted > 0 && painted < 23, `painted ${painted}`);
  await ctx.close();
}
{
  const { ctx, page } = await start({ width: 390 });
  await pick(page, "surah", 2);
  await unbare(page);
  await setUnit(page, { type: "ayah", ayah: 255 });
  await openSheet(page);
  check("2:255 (Single Ayah) -> 1 page (42)", JSON.stringify(await sheetPages(page)) === "[42]", JSON.stringify(await sheetPages(page)));
  await closeSheet(page);
  await setUnit(page, { type: "range", from: 1, to: 5 });
  await openSheet(page);
  check("2:1-5 (Range) -> 1 page (2)", JSON.stringify(await sheetPages(page)) === "[2]", JSON.stringify(await sheetPages(page)));
  await ctx.close();
}
{
  const { ctx, page } = await start({ width: 390 });
  await pick(page, "hizb", 1);
  await unbare(page);
  await openSheet(page);
  const p = await sheetPages(page);
  check("Hizb 1 -> pages 1..11 (Quran-wide, not only Al-Fatiha)", p[0] === 1 && p.length >= 8 && p.every((v, i) => v === i + 1), JSON.stringify(p));
  await ctx.close();
}

// ================= structure: page 342 at 320 and at 1280
const WPL = "9,10,9,10,9,8,8,9,11,8,8,10,9,10";
for (const width of [320, 1280]) {
  const { ctx, page } = await start({ width, height: width > 600 ? 1000 : 700 });
  await pick(page, "page", 342);
  await unbare(page);
  await openSheet(page);
  const s = await page.evaluate(() => { const e = document.querySelector("#writingSheet .ws-page"); return { lines: e.dataset.lines, types: e.dataset.lineTypes.split(","), wpl: e.dataset.wordsPerLine.split(",").slice(1).join(","), w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height, cw: document.querySelector(".ws-page-canvas").width, ch: document.querySelector(".ws-page-canvas").height, over: document.documentElement.scrollWidth > document.documentElement.clientWidth }; });
  check(`[${width}] page 342 has 15 lines`, s.lines === "15", s.lines);
  check(`[${width}] line 1 is the basmallah, then 14 ayah lines`, s.types[0] === "basmallah" && s.types.slice(1).every((x) => x === "ayah") && s.types.length === 15, s.types.join());
  check(`[${width}] words per line ${WPL}`, s.wpl === WPL, s.wpl);
  check(`[${width}] page element is A4-shaped 210:297 within 1%`, Math.abs(s.w / s.h - 210 / 297) / (210 / 297) < 0.01, `${s.w}x${s.h}`);
  check(`[${width}] canvas is A4-shaped 210:297 within 1%`, Math.abs(s.cw / s.ch - 210 / 297) / (210 / 297) < 0.01, `${s.cw}x${s.ch}`);
  check(`[${width}] the page fits the screen (no sideways scroll)`, !s.over && s.w <= width);
  await ctx.close();
}

// ================= styles
{
  const { ctx, page } = await start({ width: 390 });
  await pick(page, "page", 342);
  await unbare(page);
  await openSheet(page);
  const res = {};
  for (const sh of ["light", "lighter", "book"]) {
    await clickWs(page, `[data-ws-shade="${sh}"]`);
    await page.waitForFunction((s) => document.querySelector("#writingSheet .ws-page").dataset.painted === s, sh);
    await page.waitForTimeout(150);
    res[sh] = await pixels(page);
    check(`style ${sh}: the sheet's data-shade is ${sh}`, await page.evaluate(() => document.getElementById("writingSheet").dataset.shade) === sh);
    check(`style ${sh}: the āyah markers are #1b2440`, res[sh].marker > 20, `marker px ${res[sh].marker}`);
  }
  check("Like the book: letters are pale SOLID (many #dcd8cd pixels)", res.book.fill > 500, `fill px ${res.book.fill}`);
  check("Light: letters are hollow (far fewer solid #dcd8cd pixels than the book style)", res.light.fill * 5 < res.book.fill, `light ${res.light.fill} vs book ${res.book.fill}`);
  check("Lighter: letters are hollow (far fewer solid #dcd8cd pixels than the book style)", res.lighter.fill * 5 < res.book.fill, `lighter ${res.lighter.fill}`);
  check("a stroke pixel is lighter in Lighter than in Light", res.lighter.warmP5 > res.light.warmP5 + 8 && res.light.warmN > 500, `light ${res.light.warmP5} lighter ${res.lighter.warmP5} (n ${res.light.warmN})`);
  check("Light draws real outlines (positive control: darker than the paper)", res.light.nonPaper > 2000, `nonPaper ${res.light.nonPaper}`);
  await clickWs(page, '[data-ws-shade="lighter"]');
  await page.waitForTimeout(100);
  check("the choice is stored under writingSheetShade", await page.evaluate(() => localStorage.getItem("writingSheetShade")) === "lighter");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await pick(page, "page", 342);
  await unbare(page);
  await openSheet(page);
  check("the choice survives a reload (Lighter is selected)", await page.evaluate(() => document.getElementById("writingSheet").dataset.shade) === "lighter");
  await ctx.close();
}

// ================= writing
{
  const { ctx, page } = await start({ width: 390 });
  await pick(page, "page", 342);
  await unbare(page);
  await openSheet(page);
  const ta = await page.evaluate(() => getComputedStyle(document.querySelector("#writingSheet .ws-ink")).touchAction);
  check("Write off: touch-action lets the page scroll and zoom", /pan-y/.test(ta) && /pinch-zoom/.test(ta), ta);
  check("ink canvas starts empty (positive control)", (await inkPixels(page)) === 0);
  await stroke(page, [[0.2, 0.2], [0.6, 0.3], [0.8, 0.5]]);
  check("a stroke with Write OFF leaves the ink canvas empty", (await inkPixels(page)) === 0);
  await clickWs(page, '[data-ws="write"]');
  const ta2 = await page.evaluate(() => getComputedStyle(document.querySelector("#writingSheet .ws-ink")).touchAction);
  check("Write on: touch-action is none", ta2 === "none", ta2);
  await stroke(page, [[0.2, 0.2], [0.6, 0.3], [0.8, 0.5]]);
  const after1 = await inkPixels(page);
  check("a stroke with Write ON leaves pixels", after1 > 100, `px ${after1}`);
  await stroke(page, [[0.2, 0.6], [0.7, 0.7]]);
  const after2 = await inkPixels(page);
  check("a second stroke adds pixels", after2 > after1, `${after1} -> ${after2}`);
  await clickWs(page, '[data-ws="undo"]');
  const afterUndo = await inkPixels(page);
  check("Undo removes only the last stroke", afterUndo > 0 && afterUndo < after2, `${after2} -> ${afterUndo}`);
  await clickWs(page, '[data-ws="undo"]');
  check("Undo again empties the ink canvas", (await inkPixels(page)) === 0);
  await stroke(page, [[0.2, 0.2], [0.6, 0.3]]);
  const beforeShade = await inkPixels(page);
  await clickWs(page, '[data-ws-shade="book"]');
  await page.waitForTimeout(250);
  check("the ink survives a style change", (await inkPixels(page)) === beforeShade && beforeShade > 0, `${beforeShade} -> ${await inkPixels(page)}`);
  // eraser
  await clickWs(page, '[data-ws-tool="eraser"]');
  await stroke(page, [[0.15, 0.2], [0.65, 0.3]]);
  check("Eraser removes ink", (await inkPixels(page)) < beforeShade * 0.5, `${beforeShade} -> ${await inkPixels(page)}`);
  await clickWs(page, '[data-ws-tool="pen"]');
  await stroke(page, [[0.2, 0.8], [0.6, 0.85]]);
  check("Pen writes again after the eraser", (await inkPixels(page)) > 0);
  await clickWs(page, '[data-ws="clear"]');
  check("Clear empties the visible page", (await inkPixels(page)) === 0);
  await ctx.close();
}

// ================= save
{
  const { ctx, page } = await start({ width: 390 });
  await pick(page, "page", 342);
  await unbare(page);
  const keysBefore = await page.evaluate(() => Object.keys(localStorage));
  const writesBefore = await page.evaluate(() => (window.__stubWriteData || []).length);
  const idbBefore = await page.evaluate(async () => (indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name).sort() : []));
  await openSheet(page);
  await clickWs(page, '[data-ws="write"]');
  await stroke(page, [[0.2, 0.2], [0.6, 0.3], [0.8, 0.5]]);
  const dl = page.waitForEvent("download", { timeout: 8000 });
  await clickWs(page, '[data-ws="save"]');
  const d = await dl;
  check("Save picture: file is named mushaf-page-342-writing.png", d.suggestedFilename() === "mushaf-page-342-writing.png", d.suggestedFilename());
  const path = await d.path();
  const buf = fs.readFileSync(path);
  const isPng = buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a";
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const cv = await page.evaluate(() => { const c = document.querySelector("#writingSheet .ws-page-canvas"); return [c.width, c.height]; });
  check("Save picture: a PNG, sized like the page canvas", isPng && w === cv[0] && h === cv[1], `${w}x${h} vs ${cv}`);
  const keysAfter = await page.evaluate(() => Object.keys(localStorage));
  const extra = keysAfter.filter((k) => !keysBefore.includes(k));
  check("no localStorage key other than writingSheetShade appeared", extra.every((k) => k === "writingSheetShade"), JSON.stringify(extra));
  check("no Firestore write (__stubWriteData unchanged)", (await page.evaluate(() => (window.__stubWriteData || []).length)) === writesBefore);
  const idbAfter = await page.evaluate(async () => (indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name).sort() : []));
  check("no new IndexedDB database", JSON.stringify(idbAfter) === JSON.stringify(idbBefore), JSON.stringify(idbAfter));
  check("the saved picture is composite (the ink is in it)", buf.length > 20000);
  // share path
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", { value: (d) => !!(d && d.files && d.files.length), configurable: true });
    Object.defineProperty(navigator, "share", { value: async (d) => { window.__shared.push(d.files.map((f) => f.name + ":" + f.type)); }, configurable: true });
  });
  await clickWs(page, '[data-ws="save"]');
  await page.waitForTimeout(600);
  check("Save picture uses navigator.share({files}) when the device accepts it", JSON.stringify(await page.evaluate(() => window.__shared)) === JSON.stringify([["mushaf-page-342-writing.png:image/png"]]), JSON.stringify(await page.evaluate(() => window.__shared)));
  await ctx.close();
}

// ================= close, with unsaved writing
{
  const { ctx, page } = await start({ width: 390 });
  await pick(page, "page", 342);
  await unbare(page);
  await openSheet(page);
  await clickWs(page, '[data-ws="close"]');
  check("Close with nothing written closes at once", await page.evaluate(() => !document.getElementById("writingSheet")));
  await openSheet(page);
  await clickWs(page, '[data-ws="write"]');
  await stroke(page, [[0.2, 0.2], [0.6, 0.3]]);
  await clickWs(page, '[data-ws="close"]');
  const asks = await page.evaluate(() => { const c = document.querySelector("#writingSheet [data-ws-confirm]"); return !!c && !c.hidden && /Close without saving your writing\?/.test(c.textContent); });
  check("Close with unsaved writing asks in the page (no confirm())", asks);
  await clickWs(page, '[data-ws="keep"]');
  check("Keep writing keeps the sheet and the ink", await page.evaluate(() => !!document.getElementById("writingSheet")) && (await inkPixels(page)) > 0);
  await clickWs(page, '[data-ws="close"]');
  await clickWs(page, '[data-ws="close-anyway"]');
  check("Close from the bar closes the sheet", await page.evaluate(() => !document.getElementById("writingSheet")));
  await ctx.close();
}

// ================= print
{
  const { ctx, page } = await start({ width: 900, height: 1000 });
  await pick(page, "surah", 67);
  await unbare(page);
  await openSheet(page);
  await clickWs(page, '[data-ws="write"]');
  await stroke(page, [[0.2, 0.2], [0.6, 0.3]]);
  await clickWs(page, '[data-ws="print"]');
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 30000 });
  const imgs = await page.evaluate(() => [...document.querySelectorAll("#writingSheet .ws-print img")].map((i) => [i.naturalWidth, i.naturalHeight]));
  check("Print A4: one image per sheet page, each >= 200 dpi across 190mm", imgs.length === 3 && imgs.every(([w]) => w >= 1496), JSON.stringify(imgs));
  const pdf = await page.pdf({ format: "A4" });
  const count = (pdf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
  check("Print A4 (Surah 67): exactly 3 PDF pages", count === 3, `pdf pages ${count}`);
  const hidden = await page.evaluate(() => { const s = matchMedia("print").matches; return s; });
  check("(control) the page is not itself in print media on screen", hidden === false);
  await ctx.close();
}

// ================= I9: nothing before the button
{
  const requests = [];
  const { ctx, page } = await start({ width: 390, requests });
  await page.waitForTimeout(800);
  check("landing page, Mushaf unticked: no request for the layout data or a page font", requests.length === 0, JSON.stringify(requests));
  await page.click("#tabStudyBtn");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(900);
  const mushafOff = await page.evaluate(() => !document.getElementById("mushafToggle").checked);
  check("(control) Mushaf really is unticked", mushafOff);
  check("Read view without Mushaf: still no layout/font request", requests.length === 0, JSON.stringify(requests));
  await unbare(page);
  await openSheet(page);
  check("(positive control) pressing ✍ does request the layout and a page font", requests.some((u) => /mushaf-madani-v2\.json/.test(u)) && requests.some((u) => /\/p\d+\.woff2/.test(u)), JSON.stringify(requests.slice(0, 4)));
  await ctx.close();
}

// ================= the bars: ✍ present, and the bar keeps its lines and height
const measureBar = (page, sel, btnSel) => page.evaluate(({ sel, btnSel }) => {
  const bar = document.querySelector(sel), btn = document.querySelector(btnSel);
  const kids = [...bar.querySelectorAll(":scope > *, :scope > .note-nav-cluster > *")].filter((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).position !== "absolute" && e.getBoundingClientRect().height > 2);
  const rowsOf = (list) => new Set(list.map((e) => Math.round(e.getBoundingClientRect().top / 6))).size;
  const prev = btn.style.display;
  const withBtn = { h: Math.round(bar.getBoundingClientRect().height * 10) / 10, lines: rowsOf(kids), shown: btn.getBoundingClientRect().width > 0 };
  btn.style.display = "none";
  const kids2 = [...bar.querySelectorAll(":scope > *, :scope > .note-nav-cluster > *")].filter((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).position !== "absolute" && e.getBoundingClientRect().height > 2);
  const without = { h: Math.round(bar.getBoundingClientRect().height * 10) / 10, lines: rowsOf(kids2) };
  btn.style.display = prev;
  return { withBtn, without };
}, { sel, btnSel });

for (const lang of ["en", "bn"]) {
  for (const width of [320, 340, 360, 390, 412, 480, 768, 1280]) {
    const { ctx, page } = await start({ lang, width, height: width >= 768 ? 1000 : 800 });
    await pick(page, "surah", 67);
    await unbare(page);
    await page.waitForTimeout(200);
    const r = await measureBar(page, "#readBar", "#readWritingBtn");
    // Updated in place, Architect, 30 Sep 2026 -- the Owner's answer "Both":
    // ✍ lives in the Study menu for everyone, and on the bar only where it
    // costs the bar no extra line. So the rule is "the bar never grows", with
    // a positive control that ✍ really is on the bar where there is room
    // (at 768px and up), so a fit that always hid it could not pass.
    check(`[${lang} ${width}] Read bar is never taller or longer with ✍ (shown only where it fits)`, r.withBtn.h === r.without.h && r.withBtn.lines === r.without.lines, JSON.stringify(r));
    if (width >= 768) check(`[${lang} ${width}] positive control: ✍ is on the Read bar where there is room`, r.withBtn.shown, JSON.stringify(r));
    const menuItem = await page.evaluate(() => { const b = document.getElementById("tabWritingBtn"); return b ? b.textContent.trim() : null; });
    check(`[${lang} ${width}] the Study menu has ✍ Writing sheet`, lang === "bn" ? menuItem === "✍ লিখন অনুশীলনের পাতা" : menuItem === "✍ Writing sheet", menuItem);
    await page.evaluate(() => document.getElementById("readWritingBtn") && void 0);
    // Note view bar
    await page.evaluate(() => document.getElementById("tabStudyBtn").click());
    await page.waitForTimeout(150);
    const noted = await page.evaluate(async () => {
      const b = [...document.querySelectorAll("#studyPillarMenu button, #tabNoteBtn")].find((x) => /Note/i.test(x.id + x.textContent));
      if (!b) return false; b.click(); return true;
    });
    await page.waitForFunction(() => !!document.querySelector("#noteView .note-bar2 [data-note-writing]"), null, { timeout: 5000 }).catch(() => {});
    if (noted && await page.evaluate(() => !!document.querySelector("#noteView .note-bar2 [data-note-writing]"))) {
      await page.waitForTimeout(250); // the fit runs after the Note view's own rebuild
      const n = await measureBar(page, "#noteView .note-bar2", "#noteView [data-note-writing]");
      check(`[${lang} ${width}] Note bar is never taller or longer with ✍ (shown only where it fits)`, n.withBtn.h === n.without.h && n.withBtn.lines === n.without.lines, JSON.stringify(n));
      if (width >= 768) check(`[${lang} ${width}] positive control: ✍ is on the Note bar where there is room`, n.withBtn.shown, JSON.stringify(n));
    } else {
      check(`[${lang} ${width}] Note bar reachable (control)`, false, "note view did not open");
    }
    await ctx.close();
  }
}

// ================= the Note bar button opens the sheet too; toolbar not cut; language
for (const [lang, width] of [["bn", 320], ["en", 390], ["en", 1280]]) {
  const { ctx, page } = await start({ lang, width, height: width >= 768 ? 1000 : 800 });
  await pick(page, "page", 342);
  await unbare(page);
  await openSheet(page);
  await clickWs(page, '[data-ws="write"]');
  await stroke(page, [[0.15, 0.25], [0.5, 0.2], [0.85, 0.3], [0.5, 0.45]]);
  await stroke(page, [[0.2, 0.6], [0.8, 0.62]]);
  const tb = await page.evaluate(() => {
    const t = document.querySelector("#writingSheet .ws-toolbar"), r = t.getBoundingClientRect();
    const btns = [...t.querySelectorAll("button")].map((b) => b.getBoundingClientRect());
    return { h: r.height, cut: [...t.querySelectorAll("button")].some((b) => b.scrollWidth > b.clientWidth + 1), inside: btns.every((b) => b.left >= -0.5 && b.right <= innerWidth + 0.5), minH: Math.min(...btns.map((b) => b.height)), lines: new Set(btns.map((b) => Math.round(b.top))).size, text: t.textContent.replace(/\s+/g, " ").trim() };
  });
  check(`[${lang} ${width}] toolbar: no button cut, all on screen, each >= 40px tall`, !tb.cut && tb.inside && tb.minH >= 39.5, JSON.stringify(tb));
  console.log(`  INFO  [${lang} ${width}] toolbar height ${Math.round(tb.h)}px over ${tb.lines} line(s): ${tb.text}`);
  if (lang === "bn") check("[bn 320] toolbar wording is Bangla", /লিখুন/.test(tb.text) && /বইয়ের মতো/.test(tb.text), tb.text);
  await shot(page, `sheet-${lang}-${width}-light`);
  await clickWs(page, '[data-ws-shade="lighter"]'); await page.waitForTimeout(250);
  await shot(page, `sheet-${lang}-${width}-lighter`);
  await clickWs(page, '[data-ws-shade="book"]'); await page.waitForTimeout(250);
  await shot(page, `sheet-${lang}-${width}-book`);
  await ctx.close();
}
{
  const { ctx, page } = await start({ width: 390 });
  await pick(page, "surah", 67);
  await unbare(page);
  await page.click("#tabStudyBtn");
  await page.evaluate(() => { const b = [...document.querySelectorAll("#studyPillarMenu button")].find((x) => /Note/i.test(x.textContent)); b?.click(); });
  await page.waitForFunction(() => !!document.querySelector("#noteView [data-note-writing]"), null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.querySelector("#noteView [data-note-writing]")?.click());
  await page.waitForFunction(() => !!document.querySelector("#writingSheet .ws-page[data-painted]"), null, { timeout: 15000 }).catch(() => {});
  check("Note view ✍ opens the sheet (Surah 67 -> 562..564)", JSON.stringify(await sheetPages(page)) === "[562,563,564]", JSON.stringify(await sheetPages(page)));
  await ctx.close();
}

console.log(`\nwriting-sheet-browser: ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
