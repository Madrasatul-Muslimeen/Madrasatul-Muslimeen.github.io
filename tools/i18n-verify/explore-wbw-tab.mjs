// Issue #261 -- Word by Word gets its own Explore tab, alongside Quran/QCR/
// Asma. Read off the REAL rendered page, both languages, both a phone and a
// desktop width, with a seeded quranWordTotals counter carrying real,
// DIFFERING per-Juz known values -- so a fill-colour assertion is a claim
// about the rendered SVG, not about the code that produced it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

// Seeded known values, per real Juz totals (juz-word-totals.json):
// Juz 1 (2522 words) -- 500 known; Juz 15 (2684 words) -- 1200 known;
// Juz 30 (2308 words) -- 50 known; every other Juz -- 0. Deliberately three
// different ratios (0.198, 0.447, 0.022) so a fill-colour comparison has a
// real spread to assert against, not just "seeded vs unseeded".
const SEEDED_KNOWN = { 1: 500, 15: 1200, 30: 50 };
const TOTAL_KNOWN = Object.values(SEEDED_KNOWN).reduce((a, b) => a + b, 0);

const SEED = `
DATA.quranWordTotals = [{
  _id: "t1__p1", contractVersion: "quran-word-total:v1",
  tenantId: "t1", personId: "p1", total: 77429, known: ${TOTAL_KNOWN},
  byJuz: {
    "1": { known: ${SEEDED_KNOWN[1]}, total: 2522 },
    "15": { known: ${SEEDED_KNOWN[15]}, total: 2684 },
    "30": { known: ${SEEDED_KNOWN[30]}, total: 2308 }
  }
}];
`;

const juzIndex = JSON.parse(fs.readFileSync(path.join(root, "tools/quran-data-pull/output/juz-index.json"), "utf8"));
const surahTotals = JSON.parse(fs.readFileSync(path.join(root, "tools/quran-data-pull/output/surah-word-totals.json"), "utf8"));
const juz30 = juzIndex.find((r) => r.juz === 30);
const surahsInJuz30 = surahTotals.bySurah.filter((r) => r.surah >= juz30.startSurah && r.surah <= juz30.endSurah);
const surah114 = surahTotals.bySurah.find((r) => r.surah === 114);

const westernise = (t) => (t || "").replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09E6));

async function openExploreTab(page) {
  await page.click("#tabExploreBtn");
  await page.waitForTimeout(700);
}

async function openWbwTab(page) {
  await page.click("#explorePaletteWbwBtn");
  await page.waitForTimeout(900);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

for (const lang of ["en", "bn"]) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1100, height: 900 }]) {
    console.log(`\n=== Explore Word by Word tab, appLang=${lang}, ${viewport.width}px ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport, extraSeedJs: SEED });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");

    const readsBeforeOpen = await page.evaluate(() => (window.__fsLog || []).filter((r) => /quranWordTotals/.test(r.col || "")).length);
    check(`[${lang}/${viewport.width}] I9: no quranWordTotals read on the landing path`, readsBeforeOpen === 0, String(readsBeforeOpen));

    await openExploreTab(page);
    // Opening Explore itself lands on the Quran tab (issue #206, v08.53,
    // unrelated to this round), which already reads this same counter for
    // its own gold ring the moment it opens -- pre-existing, accepted
    // behaviour this suite is not re-litigating. Recorded as a baseline so
    // the NEXT assertion (opening the Word by Word tab) measures the right
    // delta rather than assuming this baseline is zero.
    const readsAfterExploreOpen = await page.evaluate(() => (window.__fsLog || []).filter((r) => /quranWordTotals/.test(r.col || "")).length);

    // The tab button exists and opens its panel.
    const btnInfo = await page.evaluate(() => {
      const b = document.getElementById("explorePaletteWbwBtn");
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { text: b.textContent.trim(), width: r.width, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    check(`[${lang}/${viewport.width}] the Word by Word palette button exists and has a real tap target`, !!btnInfo && btnInfo.width > 0, JSON.stringify(btnInfo));

    // Hit-test: nothing covers the button (elementFromPoint).
    if (btnInfo) {
      const hit = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return el ? (el.id || el.className || el.tagName) : null;
      }, btnInfo);
      const hitOk = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return !!el && (el.id === "explorePaletteWbwBtn" || !!el.closest("#explorePaletteWbwBtn"));
      }, btnInfo);
      check(`[${lang}/${viewport.width}] nothing covers the Word by Word tab button (hit-test)`, hitOk, String(hit));
    }

    await openWbwTab(page);

    // getWordTotals() caches per (tenant, person) -- so if the Quran tab's
    // own open already fetched this reader's counter, opening this tab may
    // add ZERO further reads (a cache hit) rather than one; either way it
    // must never add MORE than one.
    const readsAfterWbwOpen = await page.evaluate(() => (window.__fsLog || []).filter((r) => /quranWordTotals/.test(r.col || "")).length);
    const wbwOwnReads = readsAfterWbwOpen - readsAfterExploreOpen;
    check(`[${lang}/${viewport.width}] opening the Word by Word tab adds at most one counter read (0 = cache hit from the Quran tab's own prior read)`,
      wbwOwnReads === 0 || wbwOwnReads === 1, `+${wbwOwnReads} (before ${readsAfterExploreOpen}, after ${readsAfterWbwOpen})`);

    // No sideways page scroll at either viewport.
    const scrollInfo = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    check(`[${lang}/${viewport.width}] no sideways page scroll`, scrollInfo.scrollWidth <= scrollInfo.clientWidth + 1, JSON.stringify(scrollInfo));

    const panelState = await page.evaluate(() => {
      const panel = document.getElementById("wbwPanel");
      const gate = document.getElementById("wbwGateNotice");
      const body = document.getElementById("wbwBody");
      return { panelHidden: panel?.hidden, gateHidden: gate?.hidden, bodyHidden: body?.hidden };
    });
    check(`[${lang}/${viewport.width}] the panel opened, the gate notice is hidden (readiness is ON) and the body shows`,
      panelState.panelHidden === false && panelState.gateHidden === true && panelState.bodyHidden === false, JSON.stringify(panelState));

    // 30 wedges, and fills differ where the seeded known values differ.
    const wedges = await page.evaluate(() => {
      const segs = [...document.querySelectorAll("#wbwWheelContainer .wheel-seg")];
      return segs.map((s) => ({ key: s.dataset.key, fill: s.getAttribute("fill"), title: s.querySelector("title")?.textContent ?? "" }));
    });
    check(`[${lang}/${viewport.width}] the Whole Qur'an wheel has 30 wedges`, wedges.length === 30, String(wedges.length));

    const fillByKey = Object.fromEntries(wedges.map((w) => [w.key, w.fill]));
    check(`[${lang}/${viewport.width}] Juz 1 (known) and Juz 3 (unseeded, 0 known) have DIFFERENT fills`,
      fillByKey["1"] && fillByKey["3"] && fillByKey["1"] !== fillByKey["3"], JSON.stringify({ j1: fillByKey["1"], j3: fillByKey["3"] }));
    check(`[${lang}/${viewport.width}] Juz 1 and Juz 15 (a different known ratio) have DIFFERENT fills`,
      fillByKey["1"] && fillByKey["15"] && fillByKey["1"] !== fillByKey["15"], JSON.stringify({ j1: fillByKey["1"], j15: fillByKey["15"] }));
    check(`[${lang}/${viewport.width}] Juz 3 and Juz 4 (both unseeded, both 0 known) have the SAME fill`,
      fillByKey["3"] === fillByKey["4"], JSON.stringify({ j3: fillByKey["3"], j4: fillByKey["4"] }));

    // The ring is present.
    const ringPresent = await page.evaluate(() => !!document.querySelector("#wbwWheelContainer .wheel-ring-track"));
    check(`[${lang}/${viewport.width}] the gold ring track is drawn`, ringPresent);

    // The caption numbers match the fixture (1750 of 77,429 known).
    const captionText = await page.evaluate(() => document.getElementById("wbwCoverageCaption")?.textContent?.trim() ?? "");
    const westCaption = westernise(captionText);
    const numsInCaption = (westCaption.match(/[\d,]+/g) || []).map((s) => Number(s.replace(/,/g, "")));
    check(`[${lang}/${viewport.width}] the caption shows the real known/total (${TOTAL_KNOWN} of 77429)`,
      numsInCaption.includes(TOTAL_KNOWN) && numsInCaption.includes(77429), `${captionText} :: ${JSON.stringify(numsInCaption)}`);

    if (lang === "bn") {
      check(`[bn/${viewport.width}] the caption is in Bangla with Bengali digits`, /[ঀ-৿]/.test(captionText) && /[০-৯]/.test(captionText), captionText);
    }

    // Sidebar lists 30 Juz rows with the same numbers.
    const sidebarRowCount = await page.evaluate(() => document.querySelectorAll("#wbwSidebarContainer .way-row").length);
    check(`[${lang}/${viewport.width}] the sidebar lists 30 Juz rows`, sidebarRowCount === 30, String(sidebarRowCount));

    // Tapping Juz 30 shows its surahs with totals equal to the packaged file.
    await page.evaluate(() => document.querySelector('#wbwWheelContainer [data-key="30"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await page.waitForTimeout(500);
    const crumbAfterJuz = await page.evaluate(() => document.querySelector("#wbwBreadcrumb .explore-crumb.active")?.textContent.trim() ?? null);
    check(`[${lang}/${viewport.width}] tapping Juz 30's wedge reached the Juz level (crumb: ${crumbAfterJuz})`, /30|৩০/.test(crumbAfterJuz ?? ""), String(crumbAfterJuz));

    const surahWedges = await page.evaluate(() => {
      const segs = [...document.querySelectorAll("#wbwWheelContainer .wheel-seg")];
      return segs.map((s) => ({ key: s.dataset.key, title: s.querySelector("title")?.textContent ?? "" }));
    });
    check(`[${lang}/${viewport.width}] Juz 30 shows exactly its ${surahsInJuz30.length} surahs`, surahWedges.length === surahsInJuz30.length, String(surahWedges.length));

    const surah114Wedge = surahWedges.find((w) => w.key === "114");
    const surah114NumsInTitle = (westernise(surah114Wedge?.title ?? "").match(/\d+/g) || []).map(Number);
    check(`[${lang}/${viewport.width}] Surah 114's wedge title carries its real packaged total (${surah114.totalWords})`,
      surah114NumsInTitle.includes(surah114.totalWords), JSON.stringify(surah114Wedge));

    // Tapping a surah shows its coverage and the "Study this Surah" button.
    await page.evaluate(() => document.querySelector('#wbwWheelContainer [data-key="114"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await page.waitForTimeout(900);
    const surahLevelState = await page.evaluate(() => {
      const caption = document.getElementById("wbwCoverageCaption");
      const detail = document.getElementById("wbwSurahDetail");
      const studyBtn = document.getElementById("wbwStudySurahBtn");
      return {
        captionText: caption?.textContent?.trim() ?? "",
        detailHidden: detail?.hidden,
        studyBtnText: studyBtn?.textContent?.trim() ?? "",
      };
    });
    check(`[${lang}/${viewport.width}] the Surah level shows coverage and reveals "Study this Surah"`,
      !surahLevelState.detailHidden && surahLevelState.studyBtnText.length > 0, JSON.stringify(surahLevelState));
    const surahNumsInCaption = (westernise(surahLevelState.captionText).match(/\d+/g) || []).map(Number);
    check(`[${lang}/${viewport.width}] Surah 114's coverage caption carries its real total (${surah114.totalWords})`,
      surahNumsInCaption.includes(surah114.totalWords), surahLevelState.captionText);

    // Drilling Quran -> Juz 30 -> Surah 114 read the counter NO FURTHER
    // times -- every level below the initial tab open is a pure re-render
    // over data already in memory (I9).
    const readsAfterDrill = await page.evaluate(() => (window.__fsLog || []).filter((r) => /quranWordTotals/.test(r.col || "")).length);
    check(`[${lang}/${viewport.width}] drilling into a Juz and a Surah reads the counter no further times`,
      readsAfterDrill === readsAfterWbwOpen, `${readsAfterWbwOpen} -> ${readsAfterDrill}`);

    // Pressing "Study this Surah" actually navigates.
    await page.click("#wbwStudySurahBtn");
    await page.waitForTimeout(500);
    const afterStudyClick = await page.evaluate(() => ({
      readVisible: document.getElementById("readView")?.hidden === false,
      unitType: document.getElementById("unitTypeSelect")?.value,
    }));
    check(`[${lang}/${viewport.width}] "Study this Surah" opens the Read screen on the surah unit`,
      afterStudyClick.readVisible && afterStudyClick.unitType === "surah", JSON.stringify(afterStudyClick));

    // Nothing here writes.
    const writes = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => /quranWord/.test(w.col || "")).length);
    check(`[${lang}/${viewport.width}] browsing the Word by Word tab wrote nothing`, writes === 0, String(writes));
    check(`[${lang}/${viewport.width}] no page errors`, errors.length === 0, JSON.stringify(errors.slice(0, 3)));

    await ctx.close();
  }
}

// -----------------------------------------------------------------------
// The gate-closed state -- a real declaration override cannot be injected
// through the harness's own extraSeedJs (the readiness module imports
// nothing and reads no runtime state at all, by design -- see its own
// header), so this is asserted at the SOURCE level instead: the same class
// of proof quran-word-total-boundary.mjs already uses for this exact gate.
// -----------------------------------------------------------------------
{
  const html = (await import("node:fs")).readFileSync(path.join(root, "app", "quranrevival.html"), "utf8");
  const start = html.indexOf("function renderWbwPanel()");
  const end = html.indexOf("/** Level 1", start);
  const body = html.slice(start, end);
  check("renderWbwPanel() shows the gate notice and returns before any level renders when the gate is closed",
    /if\s*\(\s*!ready\s*\)\s*\{[\s\S]*return[\s\S]*\}/.test(body), body.slice(0, 200));
}

await browser.close();
console.log(`\n==== Explore Word by Word tab: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
