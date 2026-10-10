// Issue #428 (Owner decision 37) -- Take an Approach | Record Your Progress |
// Know Your Status: one gold pill of three equal buttons, in Read (text and
// Mushaf view) and under the Note view's button bar.
//
//   node tools/i18n-verify/approach-record-status-bar-browser.mjs   (from the repo root, serve.js on :8080)
//
// Every expected value is written by hand from the issue.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

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
const LABELS = {
  en: ["Take an Approach", "Record Your Progress", "Know Your Status"],
  bn: ["একটি পদ্ধতি গ্রহণ করুন", "আপনার অগ্রগতি লিপিবদ্ধ করুন", "আপনার অবস্থা জানুন"],
};
const WIDTHS = [320, 340, 360, 390, 412, 768, 1280];

async function start(lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 1024 : 844 }, extraSeedJs: SEED });
  await ctx.route(MUSHAF_JSON_URL, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MUSHAF) }));
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => r.abort("failed"));
  await ctx.route(SURAH_HEADER_FONT_URL, (r) => r.abort("failed"));
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page, errors };
}
async function click(page, sel) {
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    try { await page.click(sel, { timeout: 4000 }); return; } catch (e) { if (i === 3) throw e; }
  }
}
/** Read, Surah 3, unit Whole Surah; mushaf true/false. */
async function openRead(page, mushaf) {
  const inRead = await page.evaluate(() => (document.getElementById("readBar")?.getBoundingClientRect().width ?? 0) > 0);
  if (!inRead) {
    const ok = await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0);
    if (!ok) { await click(page, "#tabStudyBtn"); await page.waitForTimeout(150); }
    await click(page, "#tabReadBtn");
    await page.waitForTimeout(500);
  }
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "3"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const s = document.getElementById("unitTypeSelect"); s.value = "surah"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(800);
  await page.evaluate((m) => {
    const t = document.getElementById("mushafToggle");
    if (t && t.checked !== m) { t.checked = m; t.dispatchEvent(new Event("change", { bubbles: true })); }
  }, mushaf);
  await page.waitForTimeout(800);
  if (mushaf) await page.waitForFunction(() => Number.isFinite(Number(document.getElementById("mushafPageRef")?.dataset.page)), null, { timeout: 10000 }).catch(() => {});
}
async function openNote(page) {
  await page.evaluate(() => window.__dormantOpenNoteView());
  await page.waitForFunction(() => { const v = document.getElementById("noteView"); return v && !v.hidden && v.querySelector("[data-note-approach-bar]"); }, null, { timeout: 10000 });
  await page.waitForTimeout(300);
}

const BAR = { read: "#readApproachBar", note: "[data-note-approach-bar]" };
const measure = (page, sel) => page.evaluate((sel) => {
  const bar = document.querySelector(sel); if (!bar) return null;
  const R = (e) => e.getBoundingClientRect();
  const btns = [...bar.querySelectorAll("button")];
  const cs = getComputedStyle(bar);
  const lines = (b) => Math.round(R(b).height - 0) && Math.round((R(b).height - parseFloat(getComputedStyle(b).paddingTop) - parseFloat(getComputedStyle(b).paddingBottom)) / parseFloat(getComputedStyle(b).lineHeight));
  const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const L = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bg = rgb(cs.backgroundColor);
  return {
    shown: R(bar).width > 0 && R(bar).height > 0 && cs.display !== "none",
    n: btns.length, labels: btns.map((b) => b.textContent.trim()),
    widths: btns.map((b) => R(b).width), heights: btns.map((b) => R(b).height),
    cut: btns.some((b) => b.scrollWidth > b.clientWidth + 1),
    lines: btns.map(lines), left: R(bar).left, right: R(bar).right, vw: innerWidth,
    over: document.documentElement.scrollWidth - innerWidth,
    contrast: btns.map((b) => +ratio(rgb(getComputedStyle(b).color), bg).toFixed(2)),
    barBg: cs.backgroundColor, border: cs.borderTopColor,
    dividers: btns.slice(1).map((b) => [parseFloat(getComputedStyle(b).borderLeftWidth), getComputedStyle(b).borderLeftStyle, getComputedStyle(b).borderLeftColor]),
  };
}, sel);

function assertLayout(tag, lang, width, m) {
  check(`${tag}: one bar, exactly three buttons, labels ${JSON.stringify(LABELS[lang])}`, m?.shown && m.n === 3 && JSON.stringify(m.labels) === JSON.stringify(LABELS[lang]), JSON.stringify(m));
  if (!m) return;
  check(`${tag}: three buttons of equal width (±2px)`, Math.max(...m.widths) - Math.min(...m.widths) <= 2, JSON.stringify(m.widths));
  check(`${tag}: no label cut`, !m.cut, JSON.stringify(m));
  check(`${tag}: each label at most two lines`, m.lines.every((l) => l <= 2), JSON.stringify(m.lines));
  check(`${tag}: every button at least 36px tall`, m.heights.every((h) => h >= 35.5), JSON.stringify(m.heights));
  check(`${tag}: inside the screen, no sideways scroll`, m.left >= -0.5 && m.right <= m.vw + 0.5 && m.over <= 0, JSON.stringify({ l: m.left, r: m.right, over: m.over }));
  check(`${tag}: label colour reads on its background (>=4.5:1)`, m.contrast.every((c) => c >= 4.5), JSON.stringify(m.contrast));
  // Architect review, 30 Sep 2026: the issue asks for "a 1.5px gold divider
  // between buttons". In the Read bar an id rule (border: 0) removed them and
  // no check noticed; the screenshot did.
  check(`${tag}: a 1.5px gold (#d8c68a) divider between each pair of buttons`, m.dividers.length === 2 && m.dividers.every(([w, st, c]) => w >= 1 && st === "solid" && c === "rgb(216, 198, 138)"), JSON.stringify(m.dividers));
}

// ---- 1. Layout, every width, both languages, three views
for (const lang of ["en", "bn"]) {
  for (const width of WIDTHS) {
    const { ctx, page, errors } = await start(lang, width);
    await openRead(page, false);
    assertLayout(`[${lang} ${width}] Read text view`, lang, width, await measure(page, BAR.read));
    if (width === 320 && lang === "bn" || width === 390 && lang === "en" || width === 1280 && lang === "en") await page.screenshot({ path: `/tmp/bar-read-text-${lang}-${width}.png` });
    await openRead(page, true);
    const m = await measure(page, BAR.read);
    assertLayout(`[${lang} ${width}] Read Mushaf view`, lang, width, m);
    check(`[${lang} ${width}] Read: the bar is on its own line below the page reference`, await page.evaluate(() => document.getElementById("readApproachBar").getBoundingClientRect().top >= document.getElementById("mushafPageRef").getBoundingClientRect().bottom - 1), "");
    check(`[${lang} ${width}] #readApproachCapsule is gone`, await page.evaluate(() => !document.getElementById("readApproachCapsule")));
    const pal = await page.evaluate(() => { const c = getComputedStyle(document.getElementById("readApproachBar")); return [c.backgroundColor, c.borderTopColor]; });
    check(`[${lang} ${width}] Read palette: gold border #d8c68a on #fdf6e3`, pal[0] === "rgb(253, 246, 227)" && pal[1] === "rgb(216, 198, 138)", JSON.stringify(pal));
    if (width === 320 && lang === "bn" || width === 390 && lang === "en" || width === 1280 && lang === "en") await page.screenshot({ path: `/tmp/bar-read-mushaf-${lang}-${width}.png` });
    await openNote(page);
    assertLayout(`[${lang} ${width}] Note view`, lang, width, await measure(page, BAR.note));
    const np = await page.evaluate(() => { const c = getComputedStyle(document.querySelector("[data-note-approach-bar]")); return [c.backgroundColor, c.borderTopColor, getComputedStyle(document.querySelector("[data-note-approach-bar] button")).color]; });
    check(`[${lang} ${width}] Note palette: navy #1F3A6E, gold border, cream label`, np[0] === "rgb(31, 58, 110)" && np[1] === "rgb(216, 198, 138)" && np[2] === "rgb(253, 246, 227)", JSON.stringify(np));
    check(`[${lang} ${width}] Note: the bar sits directly under the button bar`, await page.evaluate(() => { const a = document.querySelector(".note-bar2").getBoundingClientRect(), b = document.querySelector("[data-note-approach-bar]").getBoundingClientRect(); return b.top >= a.bottom - 1 && b.top - a.bottom < 30; }), await page.evaluate(() => { const a = document.querySelector(".note-bar2").getBoundingClientRect(), b = document.querySelector("[data-note-approach-bar]").getBoundingClientRect(); return JSON.stringify([a.top, a.bottom, b.top, b.bottom]); }));
    if (width === 320 && lang === "bn" || width === 390 && lang === "en" || width === 1280 && lang === "en") await page.screenshot({ path: `/tmp/bar-note-${lang}-${width}.png` });
    const real = errors.filter((e) => !/Failed to load resource|net::ERR_/.test(e));
    check(`[${lang} ${width}] no page errors`, real.length === 0, real.join("; "));
    await ctx.close();
  }
}

// ---- 2. What each button opens (390, English)
{
  const { ctx, page } = await start("en", 390);
  const wheelShown = () => page.evaluate(() => { const w = document.getElementById("wheelSection"); return !!w && !w.hidden && w.getBoundingClientRect().width > 0; });
  const statusShown = () => page.evaluate(() => { const m = document.getElementById("myStatusMount"); return !!m && !m.hidden && m.getBoundingClientRect().width > 0; });

  // Read, text view
  await openRead(page, false);
  await click(page, "#readBarRecordBtn");
  await page.waitForTimeout(700);
  const unit = await page.evaluate(() => { const o = document.getElementById("ayahActionSheetOverlay"); const cards = [...document.querySelectorAll("#ayahActionSheetMount [data-unit-card]")].filter((e) => e.getBoundingClientRect().width > 0); return { open: o.classList.contains("open"), n: cards.length, text: cards.map((c) => c.textContent).join(" ") }; });
  check("Read text: Record Your Progress opens the Unit Card for the chosen unit (Surah 3)", unit.open && unit.n > 0 && /Imraan|Imran|3/.test(unit.text), JSON.stringify(unit).slice(0, 300));
  await page.keyboard.press("Escape"); await page.evaluate(() => document.getElementById("ayahActionSheetOverlay")?.click()); await page.waitForTimeout(300);
  await click(page, "#readBarStatusBtn");
  await page.waitForTimeout(700);
  check("Read text: Know Your Status opens Know Your Status", await statusShown());
  await page.evaluate(() => document.getElementById("myStatusCloseBtn").click()); await page.waitForTimeout(300);
  await click(page, "#readBarTakeBtn");
  await page.waitForTimeout(700);
  check("Read text: Take an Approach shows the Approaches wheel view", await wheelShown());

  // Read, Mushaf view
  await openRead(page, true);
  const pageNum = await page.evaluate(() => document.getElementById("mushafPageRef").dataset.page);
  check("Mushaf: the page on screen is 50 (hand-written fixture)", pageNum === "50", pageNum);
  // UPDATED IN PLACE, 9 Oct 2026 (the Owner: "Range is chosen but the indication shows page. Fix."): with Whole
  // Surah chosen, Mushaf view's Record Your Progress opens the SURAH's card, as text view does; the page card is
  // for a chosen Page, checked next.
  await click(page, "#readBarRecordBtn");
  await page.waitForTimeout(800);
  const mu = await page.evaluate(() => { const cards = [...document.querySelectorAll("#ayahActionSheetMount [data-unit-card]")].filter((e) => e.getBoundingClientRect().width > 0); return { n: cards.length, page: !!document.querySelector(".page-approach-card"), text: cards.map((c) => c.textContent).join(" ").slice(0, 160) }; });
  check("Mushaf, Whole Surah chosen: Record Your Progress opens the Surah's Unit Card, not the page card", mu.n > 0 && !mu.page && /Imraan|Imran|3/.test(mu.text), JSON.stringify(mu));
  await page.keyboard.press("Escape"); await page.evaluate(() => document.getElementById("ayahActionSheetOverlay")?.click()); await page.waitForTimeout(300);
  await page.evaluate(() => { const s = document.getElementById("unitTypeSelect"); s.value = "page"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1200);
  await click(page, "#readBarRecordBtn");
  await page.waitForFunction(() => !!document.querySelector(".page-approach-card"), null, { timeout: 8000 }).catch(() => {});
  const card = await page.evaluate(() => { const c = document.querySelector(".page-approach-card"); return c ? { w: c.getBoundingClientRect().width, text: c.textContent } : null; });
  check("Mushaf, Page chosen: Record Your Progress opens the page card for page 50", !!card && card.w > 0 && /50/.test(card.text), JSON.stringify(card && card.text.slice(0, 120)));
  const title = await page.evaluate(() => document.getElementById("readBarRecordBtn").title);
  check("Mushaf: the Record button's title carries the chosen-Approach text (\"Choose an Approach\" before one is chosen)", title === "Choose an Approach", title);
  await page.keyboard.press("Escape"); await page.evaluate(() => document.getElementById("ayahActionSheetOverlay")?.click()); await page.waitForTimeout(300);
  await click(page, "#readBarStatusBtn");
  await page.waitForTimeout(700);
  check("Mushaf: Know Your Status opens Know Your Status", await statusShown());
  await page.evaluate(() => document.getElementById("myStatusCloseBtn").click()); await page.waitForTimeout(300);
  await click(page, "#readBarTakeBtn");
  await page.waitForTimeout(700);
  check("Mushaf: Take an Approach shows the Approaches wheel view", await wheelShown());

  // Note view
  await openRead(page, false);
  await openNote(page);
  await click(page, '[data-note-ab="record"]');
  await page.waitForTimeout(800);
  const tr = await page.evaluate(() => {
    const f = document.querySelector('#noteView [data-note-field="approach"]'); if (!f) return null;
    const body = f.querySelector(".note-field-body"); const r = f.getBoundingClientRect(), v = document.querySelector("#noteView .note-body").getBoundingClientRect();
    return { open: body.style.display !== "none" && body.getBoundingClientRect().height > 0, inside: r.bottom > v.top && r.top < v.bottom };
  });
  check("Note: Record Your Progress unfolds the Track card and brings it into view", !!tr && tr.open && tr.inside, JSON.stringify(tr));
  await click(page, '[data-note-ab="status"]');
  await page.waitForTimeout(700);
  check("Note: Know Your Status opens Know Your Status", await statusShown());
  await page.evaluate(() => document.getElementById("myStatusCloseBtn").click()); await page.waitForTimeout(300);
  await click(page, '[data-note-ab="take"]');
  await page.waitForTimeout(700);
  check("Note: Take an Approach shows the Approaches wheel view", await wheelShown());
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
