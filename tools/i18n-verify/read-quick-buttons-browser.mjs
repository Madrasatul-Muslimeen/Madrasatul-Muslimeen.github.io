// Issue #419 -- Note View / Track / Approach quick buttons on the bare Read view
// for readers who came in through the Read contents list.
//
// Run from the repository root, with serve.js on :8080. Expected values are
// written BY HAND from the issue, never computed by the code under test.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";
const REAL = fs.readFileSync("mushaf/mushaf-madani-v2.json");
const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function start({ lang = "en", width = 390, height = 844, look = "night" } = {}) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
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
  await page.click(await readBtnSel(page));
  await page.waitForFunction(() => document.querySelectorAll("#readContentsBody .rc-row").length > 0);
  if (tab !== "surah") await page.click(`[data-rc-tab="${tab}"]`);
  await page.waitForFunction((t) => document.querySelector(`#readContentsBody .rc-row[data-rc-kind="${t}"]`), tab);
  await page.click(`#readContentsBody .rc-row[data-rc-kind="${tab}"][data-rc-n="${n}"]`);
  await page.waitForFunction(() => document.body.classList.contains("immersive-read"));
  await page.waitForFunction(() => !!document.querySelector("#pageViewContainer .hifz-page .hifz-word"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
};
const shown = (page) => page.evaluate(() => { const r = document.getElementById("readQuickRow").getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(document.getElementById("readQuickRow")).display !== "none"; });
const labels = (page) => page.evaluate(() => [...document.querySelectorAll("#readQuickRow .rq-btn")].map((b) => b.textContent.trim()));
const audioWrites = (page) => page.evaluate(() => ({
  played: window.__played,
  writes: (window.__fsLog || []).filter((x) => /set|add|update|delete|write|commit/i.test(x.kind || "")).length,
}));

// UPDATED IN PLACE (Owner, 2 Oct 2026): "Track (pls name it as Record)".
// UPDATED IN PLACE (decision 95, v10.03): "Note View" is "Notes" now -- it opens the Notes pane, not the Note view.
const EN = ["Notes", "Record", "Approach"];
const BN = ["নোট", "লিপিবদ্ধ করুন", "পদ্ধতি"];

// ---- placement, both languages
const measure = (page) => page.evaluate(() => {
  const R = (e) => e.getBoundingClientRect();
  const row = document.getElementById("readQuickRow"), rr = R(row);
  const btns = [...row.querySelectorAll(".rq-btn")].map(R);
  const hide = R(document.getElementById("hideChromeBtn")), ref = R(document.getElementById("mushafPageRef"));
  const bar = document.getElementById("readBar"), de = document.documentElement;
  // Words on the page in view (left edge on screen), lowest bottom.
  let last = 0;
  // Only the page being read (the one whole page on screen); the others sit off to the side.
  const cur = [...document.querySelectorAll("#pageViewContainer .hifz-page")].find((p) => { const r = R(p); return r.left >= -0.5 && r.right <= innerWidth + 0.5; });
  // A page scrolls inside itself: scroll it (and the reading area) to the end first.
  if (cur) cur.scrollTop = cur.scrollHeight;
  document.getElementById("readScroll").scrollTop = 1e6;
  for (const w of (cur ? cur.querySelectorAll(".hifz-word") : [])) {
    const r = R(w); if (!r.width) continue;
    last = Math.max(last, r.bottom - parseFloat(getComputedStyle(w).paddingBottom || 0));
  }
  const kids = [...bar.children].filter((e) => R(e).width > 0);
  const tops = kids.map((e) => Math.round(R(e).top + R(e).height / 2));
  return {
    row: { top: rr.top, bottom: rr.bottom, left: rr.left, right: rr.right },
    widths: btns.map((b) => Math.round(b.width * 10) / 10), heights: btns.map((b) => b.height),
    cut: [...row.querySelectorAll(".rq-btn")].some((b) => b.scrollWidth > b.clientWidth + 1),
    inView: btns.every((b) => b.left >= -0.5 && b.right <= innerWidth + 0.5 && b.top >= 0 && b.bottom <= innerHeight + 0.5),
    over: de.scrollWidth > de.clientWidth, vh: innerHeight, vw: innerWidth,
    ctr: btns.map((b) => b.top + b.height / 2), hideCtr: hide.top + hide.height / 2,
    between: btns[0].left >= ref.right - 0.5 && btns[2].right <= hide.left + 0.5, refShown: ref.width > 0,
    barOneLine: Math.max(...tops) - Math.min(...tops) <= 4, barH: Math.round(R(bar).height),
    lastWordBottom: last, fixed: getComputedStyle(row).position,
  };
});

for (const lang of ["en", "bn"]) {
  const want = lang === "en" ? EN : BN;
  for (const width of [320, 340, 360, 390, 412, 480, 599, 600, 768, 900, 1280]) {
    const { ctx, page } = await start({ lang, width, height: width >= 768 ? 1024 : 800 });
    await pick(page, "surah", 67);
    const tag = `[${lang} ${width}]`;
    check(`${tag} the three buttons are visible in the bare state`, await shown(page));
    check(`${tag} labelled ${want.join(" / ")}`, JSON.stringify(await labels(page)) === JSON.stringify(want), JSON.stringify(await labels(page)));
    const m = await measure(page);
    check(`${tag} bare state (positive control: full-screen cycle is on)`, await page.evaluate(() => ["immersive-read", "fs-hide-readbar", "fs-hide-transport"].every((c) => document.body.classList.contains(c))));
    check(`${tag} each button >= 36px tall`, m.heights.every((h) => h >= 35.5), JSON.stringify(m.heights));
    check(`${tag} none cut, all inside the viewport, no sideways scroll`, !m.cut && m.inView && !m.over, JSON.stringify(m));
    if (width < 600) {
      check(`${tag} fixed row at the bottom of the screen`, m.fixed === "fixed" && m.row.bottom >= m.vh - 0.5, JSON.stringify(m.row));
      check(`${tag} one line, three equal widths`, Math.max(...m.widths) - Math.min(...m.widths) <= 1 && m.ctr.every((c) => Math.abs(c - m.ctr[0]) < 1), JSON.stringify(m.widths));
      check(`${tag} the last Mushaf line is not covered by the row`, m.lastWordBottom > 0 && m.lastWordBottom <= m.row.top + 0.5, `last word bottom ${m.lastWordBottom} vs row top ${m.row.top}`);
    } else {
      check(`${tag} on the top line, same centre as the full-screen button`, m.ctr.every((c) => Math.abs(c - m.hideCtr) < 4), JSON.stringify(m.ctr) + " vs " + m.hideCtr);
      check(`${tag} between the page reference and the full-screen button`, m.between && m.refShown, JSON.stringify(m));
      check(`${tag} #readBar still one line`, m.barOneLine, `bar height ${m.barH}`);
    }
    await ctx.close();
  }
}

// ---- when they show: Study menu Read never shows them; flag clears; ⤢ hides them
{
  const { ctx, page } = await start({ width: 390 });
  await page.evaluate(() => { const m = document.getElementById("mushafToggle"); if (!m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.click("#tabStudyBtn");
  await page.click("#tabReadBtn");
  await page.waitForFunction(() => document.body.classList.contains("immersive-read"));
  await page.waitForTimeout(400);
  check("Study-menu Read (Mushaf ticked, bare): NO quick buttons", !(await shown(page)));
  await ctx.close();
}
{
  const { ctx, page } = await start({ width: 390 });
  await pick(page, "surah", 67);
  check("contents-list Read: buttons shown (control for the next checks)", await shown(page));
  // [hidden] trap: the row's display rule must not beat the hidden attribute.
  await page.evaluate(() => { document.getElementById("readQuickRow").hidden = true; });
  check("[hidden] on the row really hides it (display rule does not beat it)", !(await shown(page)));
  await page.evaluate(() => { document.getElementById("readQuickRow").hidden = false; });
  check("...and clearing hidden shows it again (positive control)", await shown(page));
  await page.click("#hideChromeBtn");
  await page.waitForTimeout(300);
  check("pressing ⤢ hides the buttons", !(await shown(page)));
  // leave to the wheel and come back through the Study menu: not back
  await page.evaluate(() => document.getElementById("tabApproachBtn").click());
  await page.waitForTimeout(300);
  check("leaving Read clears the flag", await page.evaluate(() => !document.body.classList.contains("read-from-contents")));
  await page.click("#tabStudyBtn");
  await page.click("#tabReadBtn");
  await page.waitForFunction(() => document.body.classList.contains("immersive-read"));
  await page.waitForTimeout(400);
  check("coming back through the Study menu does NOT bring them back", !(await shown(page)));
  await ctx.close();
}

// ---- what each button does
// Baseline: writes made by the Study menu's own Note item on the same āyah.
let noteBaselineWrites;
{
  const { ctx, page } = await start({ width: 390 });
  await pick(page, "surah", 67);
  await page.click("#hideChromeBtn");
  const before = await audioWrites(page);
  await page.click("#tabStudyBtn");
  await page.evaluate(() => window.__dormantOpenNoteView()); // R3c: the dormant Note view, by its test seam
  await page.waitForTimeout(700);
  noteBaselineWrites = (await audioWrites(page)).writes - before.writes;
  console.log(`  (Study-menu Note baseline: ${noteBaselineWrites} write(s))`);
  await ctx.close();
}
for(const [name, tab, n] of [["surah 67", "surah", 67], ["page 50", "page", 50]]) {
  for (const which of ["Note", "Track", "Approach"]) {
    const { ctx, page } = await start({ width: 390 });
    await pick(page, tab, n);
    const before = await audioWrites(page);
    const ayah = await page.evaluate(() => document.getElementById("ayahSelect").value);
    await page.click(`#readQuick${which}Btn`);
    await page.waitForTimeout(700);
    const after = await audioWrites(page);
    const tag = `[${name}] ${which}`;
    if (which === "Note") {
      if (tab === "surah") {
        // UPDATED IN PLACE (decision 95, v10.03): the quick Notes opens the Notes pane on the āyah on screen.
        await page.waitForFunction(() => !document.getElementById("readNotePane")?.hidden, null, { timeout: 8000 }).catch(() => {});
        const s = await page.evaluate(() => ({ pane: !!document.getElementById("readNotePane") && !document.getElementById("readNotePane").hidden, src: document.querySelector("#readNotePane iframe")?.getAttribute("src") ?? "", cur: document.getElementById("ayahSelect").value }));
        check(`${tag}: opens the Notes pane on the āyah on screen`, s.pane && s.src.includes(`unit=ayah%3A67%3A${s.cur}`) && s.cur === ayah, JSON.stringify(s));
      }
    } else if (which === "Track") {
      const t = await page.evaluate(() => {
        const open = document.getElementById("ayahActionSheetOverlay").classList.contains("open");
        const cards = [...document.querySelectorAll("#ayahActionSheetMount [data-unit-card]")].filter((e) => e.getBoundingClientRect().width > 0);
        return { n: open ? cards.length : 0, text: cards.map((c) => c.textContent.replace(/\s+/g, " ").slice(0, 200)).join(" | ") };
      });
      const want = tab === "surah" ? /67|Mulk|মুল্ক/i : /50/;
      check(`${tag}: opens the Unit Card for ${name}`, t.n > 0 && want.test(t.text), JSON.stringify(t));
    } else {
      check(`${tag}: opens the wheel (Approach) view`, await page.evaluate(() => !document.getElementById("wheelPopupView").hidden && document.getElementById("readView").hidden));
    }
    check(`${tag}: no audio requested`, after.played === before.played && after.played === 0, JSON.stringify(after));
    // The Note view itself records one ayahNotes update when it opens (its own
    // behaviour, identical from the Study menu's Note item -- proven below);
    // the button adds nothing of its own.
    // UPDATED IN PLACE (decision 95, v10.03): the quick Notes opens the Notes pane, which writes nothing on opening (the
    // Note view's own ayahNotes update on opening was the reason for the baseline). So it is 0 for all three now.
    const allowed = 0;
    check(`${tag}: no Firestore write beyond what the existing route does (${allowed})`, after.writes - before.writes === allowed, JSON.stringify({ before, after }));
    await ctx.close();
  }
}

// ---- rendered contrast of a label against its own background, both looks
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
for (const look of ["night", "light"]) {
  const { ctx, page } = await start({ width: 390, look });
  await pick(page, "surah", 67);
  const c = await page.evaluate(() => {
    const p = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
    return [...document.querySelectorAll("#readQuickRow .rq-btn")].map((b) => { const cs = getComputedStyle(b); return { fg: p(cs.color), bg: p(cs.backgroundColor) }; });
  });
  const ratios = c.map(({ fg, bg }) => { const a = lum(fg), b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); });
  check(`[${look}] card look really applied (positive control)`, await page.evaluate((l) => document.documentElement.getAttribute("data-card-look") === l, look));
  check(`[${look}] label contrast >= 4.5:1 (${ratios.map((r) => r.toFixed(2)).join(", ")})`, ratios.length === 3 && ratios.every((r) => r >= 4.5));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
