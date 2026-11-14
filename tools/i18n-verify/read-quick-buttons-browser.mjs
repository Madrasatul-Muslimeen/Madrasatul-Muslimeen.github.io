// Issue #419 -- Note / Record / Approach quick routes on the bare Read view for readers who came in through the Read contents list.
//
// REWRITTEN IN PLACE, MSA · QR J132 (the Owner, 10 Nov 2026: "Study moves to dot"). The bare full screen's bottom row of three pills, and
// its tablet "Study ▾" button, are gone. What this suite always claimed -- a reader on the bare Read view reaches Notes, Record and
// Approach, wherever the screen, and each does exactly what it did -- now holds through the bar's ⋮ sheet, which the bare bar keeps: Notes is
// the sheet's Take Note tile and Record / Approach are tiles of its Study group. The row's own placement, fixed-bottom, tablet-menu,
// [hidden]-trap and pill-contrast checks went with the row. Expected values are written BY HAND. Run from the repository root, serve.js on :8080.
//   --mutate=row-back   the old row is shown again (the J132 hide rule loses #readQuickRow)  -> "the old row is not on screen" FAILS
//   --mutate=no-study   the ⋮ sheet loses its Study group (no Record / Approach tiles)       -> the tile checks FAIL
//   --mutate=no-bare-dots   the bare full screen hides the bar's ⋮ (the three would be unreachable) -> "the bar's ⋮ is on the bare bar" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "row-back": ["#readPickers, #readBar #readApproachBar, #readBar #readQuickRow, body.immersive-read #readBar #readQuickRow { display: none !important; }", "#readPickers, #readBar #readApproachBar { display: none !important; }"],
  "no-bare-dots": [":not(#readBarBookmarkBtn):not(#readQuickMenuSlot) { display: none; }", ":not(#readBarBookmarkBtn) { display: none; }"],
  "no-study": ["extraTiles: barUnitTilesHtml(), studyBlock: studyGroupHtml() });\n      attachAyahQuickMenus(readQuickMenuSlot);", "extraTiles: barUnitTilesHtml() });\n      attachAyahQuickMenus(readQuickMenuSlot);"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const TABLET = (w) => w >= 600 && w < 1024;
const REAL = fs.readFileSync("mushaf/mushaf-madani-v2.json");
const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function start({ lang = "en", width = 390, height = 844, look = "night" } = {}) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  if (MUTATE) {
    const [from, to] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const body = await res.text();
      if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
      r.fulfill({ response: res, body: body.replace(from, to) });
    });
  }
  await ctx.addInitScript((lk) => {
    try { localStorage.setItem("mm_card_look", lk); } catch (e) {}
    window.__played = 0;
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...a) { window.__played++; return orig.apply(this, a); };
  }, look);
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route(MUSHAF_JSON_URL, (r) => r.fulfill({ status: 200, contentType: "application/json", body: REAL }));
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => { const f = r.request().url().split("/").pop(); r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/fonts/" + f) }); });
  await ctx.route(SURAH_HEADER_FONT_URL, (r) => r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/QCF_SurahHeader_COLOR-Regular.woff2") }));
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page };
}
const readBtnSel = (page) => page.evaluate(() => ((document.getElementById("readHeadBtn")?.getBoundingClientRect().width ?? 0) > 0 ? "#readHeadBtn" : "#readContentsBtn"));
const pick = async (page, tab, n) => {
  await page.evaluate((s) => document.querySelector(s).click(), await readBtnSel(page)); // v15.00: the landing Read button is retired from sight but wired (the bar's Read goes to the Mushaf)
  await page.waitForFunction(() => document.querySelectorAll("#readContentsBody .rc-row").length > 0);
  if (tab !== "surah") await page.click(`[data-rc-tab="${tab}"]`);
  await page.waitForFunction((t) => document.querySelector(`#readContentsBody .rc-row[data-rc-kind="${t}"]`), tab);
  await page.click(`#readContentsBody .rc-row[data-rc-kind="${tab}"][data-rc-n="${n}"]`);
  await page.waitForFunction(() => document.body.classList.contains("immersive-read"));
  await page.waitForFunction(() => !!document.querySelector("#pageViewContainer .hifz-page .hifz-word"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
};

const SHEET = "#readQuickMenuSlot .quick-menu";
const rowGone = (page) => page.evaluate(() => (document.getElementById("readQuickRow")?.getBoundingClientRect().width ?? 0) === 0 && (document.getElementById("readApproachBar")?.getBoundingClientRect().width ?? 0) === 0);
const openSheet = async (page) => { if (await page.evaluate((q) => !document.querySelector(q)?.classList.contains("open"), SHEET)) { await page.click("#readQuickMenuSlot .ayah-quick-btn", { timeout: 8000 }); await page.waitForTimeout(300); } };
const TILE = { Note: "[data-qm-note]", Track: '[data-qm-act="record"]', Approach: '[data-qm-act="approach"]' };
const audioWrites = (page) => page.evaluate(() => ({ played: window.__played, writes: (window.__fsLog || []).filter((x) => /set|add|update|delete|write|commit/i.test(x.kind || "")).length }));
const EN = ["Take Note", "Record", "Approach"];
const measure = (page) => page.evaluate((q) => {
  const R = (e) => e.getBoundingClientRect(), de = document.documentElement;
  const m = document.querySelector(q);
  const tiles = ["[data-qm-note]", '[data-qm-act="record"]', '[data-qm-act="approach"]'].map((k) => m.querySelector(k));
  const dots = R(document.querySelector("#readQuickMenuSlot .ayah-quick-btn")), hide = R(document.getElementById("hideChromeBtn"));
  const bar = document.getElementById("readBar"), kids = [...bar.children].filter((e) => R(e).width > 0), tops = kids.map((e) => Math.round(R(e).top + R(e).height / 2));
  return { labels: tiles.map((t) => t?.querySelector(".qm-label")?.textContent.trim()), heights: tiles.map((t) => (t ? R(t).height : 0)),
    inView: tiles.every((t) => t && R(t).left >= -0.5 && R(t).right <= innerWidth + 0.5 && R(t).top >= 0 && R(t).bottom <= innerHeight + 0.5),
    cut: tiles.some((t) => t && t.scrollWidth > t.clientWidth + 1), over: de.scrollWidth > de.clientWidth,
    dotsSize: [Math.round(R(document.querySelector("#readQuickMenuSlot .ayah-quick-btn")).width), Math.round(R(document.querySelector("#readQuickMenuSlot .ayah-quick-btn")).height)],
    dotsCtr: dots.top + dots.height / 2, hideCtr: hide.top + hide.height / 2, barOneLine: Math.max(...tops) - Math.min(...tops) <= 4, barH: Math.round(R(bar).height) };
}, SHEET);

// ---- placement, both languages
for (const lang of ["en", "bn"]) {
  for (const width of [320, 340, 360, 390, 412, 480, 599, 600, 768, 900, 1280]) {
    const { ctx, page } = await start({ lang, width, height: width >= 768 ? 1024 : 800 });
    await pick(page, "surah", 67);
    const tag = `[${lang} ${width}]`;
    check(`${tag} bare state (positive control: full-screen cycle is on)`, await page.evaluate(() => ["immersive-read", "fs-hide-readbar", "fs-hide-transport"].every((c) => document.body.classList.contains(c))));
    check(`${tag} the old row of three pills and Study ▾ are not on screen`, await rowGone(page));
    check(`${tag} the bar's ⋮ is on the bare bar, a finger's size`, await page.evaluate(() => { const r = document.querySelector("#readQuickMenuSlot .ayah-quick-btn")?.getBoundingClientRect(); return !!r && r.width >= 36 && r.height >= 36; }));
    await openSheet(page);
    const m = await measure(page);
    if (lang === "en") check(`${tag} the sheet carries Notes (Take Note) / Record / Approach`, JSON.stringify(m.labels) === JSON.stringify(EN), JSON.stringify(m.labels));
    else check(`${tag} their labels are Bangla`, m.labels.every((l) => l && /[\u0980-\u09FF]/.test(l)), JSON.stringify(m.labels));
    check(`${tag} each tile >= 36px tall`, m.heights.every((h) => h >= 35.5), JSON.stringify(m.heights));
    check(`${tag} none cut, all inside the viewport, no sideways scroll`, !m.cut && m.inView && !m.over, JSON.stringify(m));
    if (width >= 600) check(`${tag} #readBar is one line, ⋮ on the full-screen button's line`, m.barOneLine && Math.abs(m.dotsCtr - m.hideCtr) < 4, JSON.stringify(m));
    await ctx.close();
  }
}

// ---- when they are reachable: every way into Read is the same; the full-screen cycle keeps the ⋮
{
  const { ctx, page } = await start({ width: 390 });
  await page.evaluate(() => { const m = document.getElementById("mushafToggle"); if (!m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.click("#tabStudyBtn");
  await page.click("#tabReadBtn");
  await page.waitForFunction(() => document.body.classList.contains("immersive-read"));
  await page.waitForTimeout(400);
  await openSheet(page);
  check("Study-menu Read (Mushaf ticked, bare): the ⋮ sheet has the three, as on the list route", (await measure(page)).labels.every(Boolean));
  await ctx.close();
}
{
  const { ctx, page } = await start({ width: 390 });
  await pick(page, "surah", 67);
  await page.click("#hideChromeBtn");
  await page.waitForTimeout(300);
  check("pressing ⤢ leaves the bare state and the ⋮ is still on the bar", await page.evaluate(() => !document.body.classList.contains("fs-hide-readbar") && (document.querySelector("#readQuickMenuSlot .ayah-quick-btn")?.getBoundingClientRect().width ?? 0) > 0));
  await page.evaluate(() => document.getElementById("tabApproachBtn").click());
  await page.waitForTimeout(300);
  check("leaving Read clears the flag", await page.evaluate(() => !document.body.classList.contains("read-from-contents")));
  await page.click("#tabStudyBtn");
  await page.click("#tabReadBtn");
  await page.waitForFunction(() => document.body.classList.contains("immersive-read"));
  await page.waitForTimeout(400);
  await openSheet(page);
  check("coming back through the Study menu brings the three back (every Read is the same)", (await measure(page)).labels.every(Boolean));
  await ctx.close();
}

// ---- what each tile does, from the surah route and the page route
for (const [name, tab, n] of [["surah 67", "surah", 67], ["page 50", "page", 50]]) {
  for (const which of ["Note", "Track", "Approach"]) {
    const { ctx, page } = await start({ width: 390 });
    await pick(page, tab, n);
    const before = await audioWrites(page);
    const ayah = await page.evaluate(() => document.getElementById("ayahSelect").value);
    await openSheet(page);
    await page.click(`${SHEET} ${TILE[which]}`);
    await page.waitForTimeout(900);
    const after = await audioWrites(page);
    const tag = `[${name}] ${which}`;
    if (which === "Note") {
      if (tab === "surah") {
        // The Take Note tile makes the Note in the shared Note window (J130 (a)); the page underneath does not move.
        await page.waitForFunction(() => { const w = document.getElementById("noteOpener"); return w && !w.hidden && w.getBoundingClientRect().width > 0; }, null, { timeout: 8000 }).catch(() => {});
        const s = await page.evaluate(() => { const w = document.getElementById("noteOpener"); return { opener: !!w && !w.hidden && w.getBoundingClientRect().width > 0, cur: document.getElementById("ayahSelect").value }; });
        check(`${tag}: opens the Note in the opener, the āyah on screen unchanged`, s.opener && s.cur === ayah, JSON.stringify(s));
      }
    } else if (which === "Track") {
      const t = await page.evaluate(() => {
        const open = document.getElementById("ayahActionSheetOverlay").classList.contains("open");
        const cards = [...document.querySelectorAll("#ayahActionSheetMount [data-unit-card]")].filter((e) => e.getBoundingClientRect().width > 0);
        return { n: open ? cards.length : 0, text: cards.map((c) => c.textContent.replace(/\s+/g, " ").slice(0, 200)).join(" | ") };
      });
      const want = tab === "surah" ? /67|Mulk|মুল্ক/i : /50/;
      // UPDATED IN PLACE, MSA · QR J132: the Record TILE presses the bar's Record Your Progress button (the one handler for Record, as on the
      // old pill): for a chosen Page in the Mushaf that opens the PAGE's card, for a Surah the Unit Card (the old Study ▾ Record always opened the Unit Card).
      const pageCard = tab === "page" ? await page.evaluate(() => { const c = document.querySelector(".page-approach-card"); return c && c.getBoundingClientRect().width > 0 ? c.textContent.replace(/\s+/g, " ").slice(0, 200) : ""; }) : "";
      if (tab === "page") check(`${tag}: opens the page's card for ${name}`, want.test(pageCard), JSON.stringify({ pageCard, t }));
      else check(`${tag}: opens the Unit Card for ${name}`, t.n > 0 && want.test(t.text), JSON.stringify(t));
    } else {
      check(`${tag}: opens the wheel (Approach) view`, await page.evaluate(() => !document.getElementById("wheelPopupView").hidden && document.getElementById("readView").hidden));
    }
    check(`${tag}: no audio requested`, after.played === before.played && after.played === 0, JSON.stringify(after));
    // Record and Approach write nothing on opening; the Note tile creates the Note, which is its job (J130 (a)).
    if (which !== "Note") check(`${tag}: no Firestore write (opening a card writes nothing)`, after.writes - before.writes === 0, JSON.stringify({ before, after }));
    await ctx.close();
  }
}

// ---- the surah name is whole: the longest name (Al-Munaafiqoon, 63) at every width from 600px (the Owner's 600px tablet first)
for (const width of [600, 680, 768, 900, 1023, 1024, 1280]) {
  const { ctx, page } = await start({ width, height: width >= 768 ? 1024 : 960 });
  await pick(page, "surah", 63);
  await page.waitForFunction(() => !!document.getElementById("mushafPageRef")?.dataset.page, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => { const t = document.querySelector("#mushafPageRef .mushaf-page-ref-text"); return { text: t?.textContent ?? "", need: t?.scrollWidth ?? 0, has: t?.clientWidth ?? 0 }; });
  check(`[name ${width}] POSITIVE CONTROL the reference names Al-Munaafiqoon`, /Munaafiqoon/.test(r.text), JSON.stringify(r));
  check(`[name ${width}] the surah name is shown whole (${r.need}px in ${r.has}px)`, r.has > 0 && r.need <= r.has + 0.5, JSON.stringify(r));
  await ctx.close();
}

// ---- rendered contrast of a tile label against its own background, both looks
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
for (const look of ["night", "light"]) {
  const { ctx, page } = await start({ width: 390, look });
  await pick(page, "surah", 67);
  await openSheet(page);
  const c = await page.evaluate((q) => {
    const p = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
    return ["[data-qm-note]", '[data-qm-act="record"]', '[data-qm-act="approach"]'].map((k) => { const b = document.querySelector(`${q} ${k}`), cs = getComputedStyle(b); return { fg: p(cs.color), bg: p(cs.backgroundColor) }; });
  }, SHEET);
  const ratios = c.map(({ fg, bg }) => { const a = lum(fg), b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); });
  check(`[${look}] card look really applied (positive control)`, await page.evaluate((l) => document.documentElement.getAttribute("data-card-look") === l, look));
  check(`[${look}] tile label contrast >= 4.5:1 (${ratios.map((r) => r.toFixed(2)).join(", ")})`, ratios.length === 3 && ratios.every((r) => r >= 4.5));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
