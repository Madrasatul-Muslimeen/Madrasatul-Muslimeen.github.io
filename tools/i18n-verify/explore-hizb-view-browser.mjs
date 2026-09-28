// Issue #342 -- Explore gains a Hizb view (60 Hizb) at the Quran level, and
// a Hizb level, on top of #341's merged My Status. RENDERED acceptance QA in
// a real browser, following this project's own established practice for a
// focused, committed browser suite. Written here, NOT run here -- this
// sandbox has no Playwright browser binaries installed, the same
// documented, repeated environment gap CLAUDE.md records for every
// browser-driven suite in this directory. The Architect/CI should run this
// for real before it is trusted.
//
// SCOPE, matching issue #342's own "Prove it" section:
//   1. The switch shows three options (Juz/Surahs/Hizb) at the Quran level,
//      and remembers Hizb across reloads.
//   2. There are 60 wedges in the Hizb view.
//   3. Seeded claims give the right colours:
//      - a "Yes" Approach (Hifz, approach_02) with Juz 1 claimed Achieved
//        colours Hizb 1 and 2 Achieved, Hizb 3 not (Hizb 1+2 ARE Juz 1 --
//        verified against the real packaged hizb-index.json, not assumed);
//      - a "No" Approach (Basic Grammar, approach_06) with a direct
//        `hizb:5` claim colours only Hizb 5.
//   4. Tapping Hizb 2 shows its Surah portions (Al-Baqarah from ayah 75).
//   5. Tapping a portion opens that Surah.
//   6. My Status's Hizb row opens the Hizb view.
//   7. Both languages.
//   8. Layout: 320/360/390/412/1100px, both languages -- the three-button
//      row must not wrap untidily or be cut, and every button >=36px tall.
//
// Every expected colour below is read off the real packaged
// hizb-index.json (which Hizb aligns with which Juz) rather than computed
// with any app function -- the architect's own instruction for this round:
// never compute an expected number with the function under test, compare
// with Explore's own chip-<status> list instead (the sidebar's real
// rendered `.status-chip.chip-<id>` classes).
//
// Real APPROACH_TEMPLATES ids are seeded via `seedTemplates`, exactly like
// quran-my-status-browser.mjs already does -- the default fixture's own
// trackables use short synthetic ids that do not correspond to the real
// Yes/No defaults at all.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
import { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } from "../../app/js/catalogue-data.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const dataRoot = path.join(here, "..", "quran-data-pull", "output");

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

const SEED_TEMPLATES = { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES };

// approach_02 = "Hifz / Memorising", Yes by default. approach_06 =
// "Language Learning (Basic Grammar)", No by default. Same ids
// quran-my-status-browser.mjs already established as this codebase's own
// real fixture pair, read straight off catalogue-data.js so a future rename
// cannot silently desync this fixture.
const YES_ID = "approach_02";
const NO_ID = "approach_06";
const yesTemplate = APPROACH_TEMPLATES.find((t) => t.id === YES_ID);
const noTemplate = APPROACH_TEMPLATES.find((t) => t.id === NO_ID);
if (!yesTemplate || !noTemplate) throw new Error("fixture Approach ids not found in APPROACH_TEMPLATES -- catalogue-data.js has changed shape");

// The real boundary table, read directly rather than through the app --
// this is what proves Hizb 1+2 really ARE Juz 1 and Hizb 5 is a real,
// addressable Hizb, instead of assuming the packaged data matches the
// issue's own worked example.
const hizbIndexFixture = JSON.parse(fs.readFileSync(path.join(dataRoot, "hizb-index.json"), "utf8"));
if (hizbIndexFixture.length !== 60) throw new Error(`fixture expectation drifted: hizb-index.json has ${hizbIndexFixture.length} rows, not 60`);
const hizb1 = hizbIndexFixture.find((h) => h.hizb === 1);
const hizb2 = hizbIndexFixture.find((h) => h.hizb === 2);
const hizb3 = hizbIndexFixture.find((h) => h.hizb === 3);
const hizb5 = hizbIndexFixture.find((h) => h.hizb === 5);
if (hizb1.juz !== 1 || hizb2.juz !== 1 || hizb3.juz !== 2) {
  throw new Error(`fixture expectation drifted: Hizb 1/2/3 no longer align with Juz 1/1/2 (${JSON.stringify({ hizb1, hizb2, hizb3 })})`);
}
// The issue's own worked example -- pinned so a future data re-pull that
// moved this boundary would fail loudly here, not silently in a screenshot.
if (hizb2.startSurah !== 2 || hizb2.startAyah !== 75) {
  throw new Error(`fixture expectation drifted: Hizb 2 no longer starts at Al-Baqarah 75 (${JSON.stringify(hizb2)})`);
}

// One subject_quran chunk carries both seeded claims -- the same document
// shape quran-my-status-browser.mjs's own MY_STATUS_SEED uses. Juz 1
// Achieved for the YES Approach floors every ayah inside it (Hizb 1+2);
// a direct hizb:5 claim for the NO Approach is never pooled at all (Owner
// decision 6) and shows up only as that one wedge's own direct status.
const HIZB_SEED = `
DATA.records.push(
  { _id: TENANT_ID + "__p1__subject_quran", tenantId: TENANT_ID, personId: "p1", chunkKey: "subject_quran", entries: {
    "juz:1::${YES_ID}": { unitType: "juz", subjectId: "quran", trackableId: "${YES_ID}",
      claimedStatus: "achieved", claimedByPersonId: "p1", confirmedStatus: "achieved",
      confirmState: "confirmed", domainIds: [], notes: "" },
    "hizb:5::${NO_ID}": { unitType: "hizb", subjectId: "quran", trackableId: "${NO_ID}",
      claimedStatus: "achieved", claimedByPersonId: "p1", confirmedStatus: "achieved",
      confirmState: "confirmed", domainIds: [], notes: "" },
  } }
);
`;

async function clickSafely(page, selector, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    await page.evaluate(() => {
      document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((el) => el.remove());
    });
    try { await page.click(selector, { timeout: 4000 }); return; } catch (err) { lastErr = err; }
  }
  throw lastErr;
}

async function openExploreTab(page) {
  await page.click("#tabExploreBtn");
  await page.waitForFunction(() => !!document.querySelector("#exploreWheelContainer svg"), null, { timeout: 10000 });
}

/** The sidebar's own rendered chip class for one segment key -- the "compare
 *  with Explore's own chip-<status> list" the round's own instruction asks
 *  for, never a status recomputed by any app function. */
async function chipStatusFor(page, key) {
  return page.evaluate((k) => {
    const row = document.querySelector(`#exploreSidebarContainer .way-row[data-key="${k}"]`);
    const chip = row?.querySelector(".status-chip");
    const cls = [...(chip?.classList ?? [])].find((c) => c.startsWith("chip-"));
    return cls ? cls.slice("chip-".length) : null;
  }, key);
}

async function wedgeCount(page) {
  return page.evaluate(() => document.querySelectorAll("#exploreWheelContainer .wheel-seg").length);
}

async function switchToHizbView(page) {
  await clickSafely(page, "#exploreViewHizbBtn");
  await page.waitForFunction(() => document.querySelectorAll("#exploreWheelContainer .wheel-seg").length === 60, null, { timeout: 10000 });
}

async function switchToApproach(page, trackableId) {
  await clickSafely(page, "#exploreApproachBtn");
  await clickSafely(page, `#exploreApproachList [data-approach-id="${trackableId}"]`);
  await page.waitForTimeout(400);
}

// =============================================================================
// 1/2/3 -- the switch itself: three options, remembered across reload, and
// hidden below the Quran level (the Juz level keeps its own Pages/Surahs
// pair, unchanged).
// =============================================================================
async function runSwitchScenario(lang) {
  const ctx = await newContext(browser, {
    banner: false, viewport: { width: 390, height: 844 }, appLang: lang,
    seedTemplates: SEED_TEMPLATES, extraSeedJs: HIZB_SEED,
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openExploreTab(page);

  const toggleState = await page.evaluate(() => {
    const wrap = document.getElementById("exploreViewToggle");
    const btns = [...wrap.querySelectorAll(".explore-view-btn")].filter((b) => !b.hidden);
    return {
      hidden: wrap.hidden,
      count: btns.length,
      labels: btns.map((b) => b.textContent.trim()),
      views: btns.map((b) => b.dataset.view ?? b.id),
    };
  });
  check(`[${lang}] the switch is shown at the Quran level, with THREE options`, !toggleState.hidden && toggleState.count === 3, JSON.stringify(toggleState));

  // The Juz level keeps exactly its own two-button pair -- unchanged.
  await page.evaluate(() => document.querySelector('#exploreWheelContainer .wheel-seg[data-key="1"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForTimeout(600);
  const juzLevelToggle = await page.evaluate(() => {
    const wrap = document.getElementById("exploreViewToggle");
    return { hidden: wrap.hidden, count: [...wrap.querySelectorAll(".explore-view-btn")].filter((b) => !b.hidden).length };
  });
  check(`[${lang}] the Juz level's own switch still shows exactly two options (Pages/Surahs unchanged)`, !juzLevelToggle.hidden && juzLevelToggle.count === 2, JSON.stringify(juzLevelToggle));

  // Back to the Quran level, switch to Hizb, then reload -- the choice
  // must survive (mm_explore_quran_view, the same localStorage shape
  // Juz/Surahs already use).
  await clickSafely(page, '.explore-crumb[data-level="quran"]');
  await page.waitForTimeout(400);
  await switchToHizbView(page);
  const pressedBeforeReload = await page.evaluate(() => document.getElementById("exploreViewHizbBtn")?.getAttribute("aria-pressed"));
  check(`[${lang}] Hizb reads pressed once chosen`, pressedBeforeReload === "true", String(pressedBeforeReload));

  await page.reload();
  await openExploreTab(page);
  const remembered = await page.evaluate(() => document.getElementById("exploreViewHizbBtn")?.getAttribute("aria-pressed"));
  const wedgesAfterReload = await wedgeCount(page);
  check(`[${lang}] Hizb is remembered across a reload (opens straight into the 60-wedge view)`, remembered === "true" && wedgesAfterReload === 60, `pressed=${remembered} wedges=${wedgesAfterReload}`);

  await ctx.close();
}

// =============================================================================
// 4/5/6 -- the wheel, the colours, the drill-down, and My Status's own row.
// =============================================================================
async function runScenarios(lang) {
  const ctx = await newContext(browser, {
    banner: false, viewport: { width: 390, height: 844 }, appLang: lang,
    seedTemplates: SEED_TEMPLATES, extraSeedJs: HIZB_SEED,
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openExploreTab(page);
  await switchToHizbView(page);

  const count = await wedgeCount(page);
  check(`[${lang}] the Hizb view has 60 wedges`, count === 60, String(count));

  // ---- Colour check, YES Approach (default trackable -- Hifz is already
  // current by default in the shared fixture). ----
  const hizb1Status = await chipStatusFor(page, "1");
  const hizb2Status = await chipStatusFor(page, "2");
  const hizb3Status = await chipStatusFor(page, "3");
  // MUTATION-PROOF, colour check: if poolCoverageStatus() were never called
  // (a hardcoded "not_started" fallback, or the floor mechanism broken),
  // Hizb 1/2/3 would ALL read not_started, identically to every other
  // unseeded Hizb -- this differential (1 and 2 differ from 3, which is one
  // Hizb further and NOT part of the claimed Juz) fails under exactly that
  // mutation and cannot pass by coincidence, since Hizb 3's own default is
  // the thing being compared against.
  check(`[${lang}] Hizb 1 (inside claimed Juz 1) shows achieved`, hizb1Status === "achieved", String(hizb1Status));
  check(`[${lang}] Hizb 2 (inside claimed Juz 1) shows achieved`, hizb2Status === "achieved", String(hizb2Status));
  check(`[${lang}] Hizb 3 (one Hizb past the claimed Juz) is NOT achieved`, hizb3Status !== "achieved", String(hizb3Status));

  // ---- Colour check + fallback, NO Approach. ----
  await switchToApproach(page, NO_ID);
  await page.waitForFunction(() => document.querySelectorAll("#exploreWheelContainer .wheel-seg").length === 60, null, { timeout: 10000 });
  const noHizb5 = await chipStatusFor(page, "5");
  const noHizb1 = await chipStatusFor(page, "1");
  const noHizb6 = await chipStatusFor(page, "6");
  // MUTATION-PROOF, fallback check: if the direct-claim fallback
  // (`exploreSubjectChunk?.entries?.[...hizb:n...]`) were removed or
  // pointed at the wrong key, Hizb 5 would read not_started identically to
  // its neighbours 1 and 6 -- this is the exact shape Owner decision 6
  // describes ("a No Approach's claim counts only as a claim on that whole
  // unit"), and ONE wedge differing among 60 is resistant to a mutation
  // that colours everything, or nothing.
  check(`[${lang}] the NO Approach's direct hizb:5 claim colours ONLY Hizb 5 (achieved)`, noHizb5 === "achieved", String(noHizb5));
  check(`[${lang}] Hizb 1 and 6 (no direct claim) are NOT achieved for the NO Approach`, noHizb1 !== "achieved" && noHizb6 !== "achieved", JSON.stringify({ noHizb1, noHizb6 }));

  // Back to the YES Approach for the drill-down.
  await switchToApproach(page, YES_ID);
  await page.waitForFunction(() => document.querySelectorAll("#exploreWheelContainer .wheel-seg").length === 60, null, { timeout: 10000 });

  // ---- Tapping Hizb 2 shows its Surah portions (Al-Baqarah from ayah 75). ----
  await page.evaluate(() => document.querySelector('#exploreWheelContainer .wheel-seg[data-key="2"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForTimeout(600);
  const crumbAfterHizb = await page.evaluate(() => document.querySelector("#exploreBreadcrumb .explore-crumb.active")?.textContent.trim() ?? null);
  check(`[${lang}] tapping Hizb 2's wedge reached the Hizb level (crumb: ${crumbAfterHizb})`, /2|২/.test(crumbAfterHizb ?? ""), String(crumbAfterHizb));

  const hizbLevelRows = await page.evaluate(() => [...document.querySelectorAll("#exploreSidebarContainer .way-row")].map((r) => r.querySelector(".name")?.textContent ?? ""));
  check(`[${lang}] Hizb 2 shows exactly one portion (it does not cross a surah boundary)`, hizbLevelRows.length === 1, JSON.stringify(hizbLevelRows));
  const westernise = (s) => (s || "").replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09E6));
  const portionNums = (westernise(hizbLevelRows[0] ?? "").match(/\d+/g) || []).map(Number);
  check(`[${lang}] the portion names Al-Baqarah starting at ayah 75`, portionNums.includes(75), hizbLevelRows[0] ?? "");

  // ---- Tapping the portion opens that Surah. ----
  await page.evaluate(() => document.querySelector('#exploreWheelContainer .wheel-seg[data-key="2"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForTimeout(700);
  const afterSurahJump = await page.evaluate(() => ({
    crumb: document.querySelector("#exploreBreadcrumb .explore-crumb.active")?.textContent.trim() ?? null,
    hizbCrumbStillShown: !!document.querySelector('#exploreBreadcrumb .explore-crumb[data-level="hizb"]'),
  }));
  check(`[${lang}] tapping the portion opens the Surah level (crumb: ${afterSurahJump.crumb})`, /Baqara|বাকারা/i.test(afterSurahJump.crumb ?? ""), JSON.stringify(afterSurahJump));
  check(`[${lang}] the "Hizb 2" crumb is still shown above the Surah crumb`, afterSurahJump.hizbCrumbStillShown, JSON.stringify(afterSurahJump));

  // Back to "Whole Quran" resets both the Hizb and Juz drill-down position
  // (mutual exclusivity -- see exploreHizbNum's own comment).
  await clickSafely(page, '.explore-crumb[data-level="quran"]');
  await page.waitForTimeout(400);
  const backAtQuran = await page.evaluate(() => ({
    crumbCount: document.querySelectorAll("#exploreBreadcrumb .explore-crumb").length,
    wedges: document.querySelectorAll("#exploreWheelContainer .wheel-seg").length,
  }));
  check(`[${lang}] "Whole Quran" resets the trail to one crumb and the Hizb wheel`, backAtQuran.crumbCount === 1 && backAtQuran.wedges === 60, JSON.stringify(backAtQuran));

  await ctx.close();
}

// =============================================================================
// My Status's Hizb row opens Explore in Hizb view -- same shape as the
// existing Juz/Surah/Ruku' rows (issue #341 part 3).
// =============================================================================
async function runMyStatusScenario(lang) {
  const ctx = await newContext(browser, {
    banner: false, viewport: { width: 390, height: 844 }, appLang: lang,
    seedTemplates: SEED_TEMPLATES, extraSeedJs: HIZB_SEED,
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => {
    const wheel = document.getElementById("wheelContainer");
    return !!wheel && !!wheel.querySelector("svg");
  }, null, { timeout: 30000 });

  const statusBtnId = await page.evaluate(() => ["myStatusBtn", "myStatusWideBtn"]
    .find((id) => { const el = document.getElementById(id); return el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0; }));
  await clickSafely(page, `#${statusBtnId}`);
  await page.waitForFunction(() => document.getElementById("myStatusBody")?.querySelectorAll(".my-status-row-btn").length > 0, null, { timeout: 10000 });
  await clickSafely(page, `[data-my-status-open="${YES_ID}"]`);
  await page.waitForFunction(() => !document.getElementById("myStatusDetailMount").hidden, null, { timeout: 5000 });

  await clickSafely(page, '[data-my-status-unit-jump="hizb"]');
  await page.waitForFunction(() => !!document.querySelector("#exploreWheelContainer svg"), null, { timeout: 10000 });
  await page.waitForTimeout(400);

  const stateAfter = await page.evaluate((id) => ({
    sheetHidden: document.getElementById("myStatusMount")?.hidden,
    exploreVisible: document.getElementById("exploreView")?.hidden === false,
    trackableSelectValue: document.getElementById("trackableSelect")?.value,
    hizbBtnPressed: document.getElementById("exploreViewHizbBtn")?.getAttribute("aria-pressed"),
    wedges: document.querySelectorAll("#exploreWheelContainer .wheel-seg").length,
  }), YES_ID);
  check(`[${lang}] My Status's Hizb row closes the sheet and opens Explore`, stateAfter.sheetHidden === true && stateAfter.exploreVisible === true, JSON.stringify(stateAfter));
  check(`[${lang}] it opens on the SAME Approach that was open`, stateAfter.trackableSelectValue === YES_ID, JSON.stringify(stateAfter));
  check(`[${lang}] it opens the Quran level in HIZB view (not drilled into a specific Hizb)`, stateAfter.hizbBtnPressed === "true" && stateAfter.wedges === 60, JSON.stringify(stateAfter));

  await ctx.close();
}

// =============================================================================
// Layout -- 320/360/390/412/1100px, both languages. The three-button row
// must not wrap untidily (the three stay together, either sharing the
// breadcrumb's line or taking one tidy line of their own below 380px) or be
// cut, and every button is >=36px tall. No sideways page scroll.
// =============================================================================
async function runLayoutCheck(lang, width) {
  const ctx = await newContext(browser, {
    banner: false, viewport: { width, height: 844 }, appLang: lang,
    seedTemplates: SEED_TEMPLATES, extraSeedJs: HIZB_SEED,
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openExploreTab(page);

  const layout = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("#exploreViewToggle .explore-view-btn")].filter((b) => !b.hidden);
    const rects = btns.map((b) => b.getBoundingClientRect());
    const tops = rects.map((r) => Math.round(r.top));
    const sameLine = tops.every((t) => Math.abs(t - tops[0]) <= 2);
    const minHeight = Math.min(...rects.map((r) => r.height));
    return {
      count: btns.length,
      sameLine,
      minHeight,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      rects: rects.map((r) => ({ left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) })),
    };
  });
  check(`[${lang} ${width}px] all three buttons present and on the SAME line as each other`, layout.count === 3 && layout.sameLine, JSON.stringify(layout));
  check(`[${lang} ${width}px] every button is at least 36px tall`, layout.minHeight >= 36, `minHeight=${layout.minHeight}`);
  check(`[${lang} ${width}px] no sideways page scroll`, layout.scrollWidth <= layout.innerWidth + 2, `scrollWidth=${layout.scrollWidth} innerWidth=${layout.innerWidth}`);
  // Not cut: each button's own right edge is within the viewport.
  const noneCut = layout.rects.every((r) => r.right <= width + 1 && r.width > 0);
  check(`[${lang} ${width}px] no button is cut off the right edge`, noneCut, JSON.stringify(layout.rects));

  await ctx.close();
}

for (const lang of ["en", "bn"]) {
  await runSwitchScenario(lang);
  await runScenarios(lang);
  await runMyStatusScenario(lang);
  for (const width of [320, 360, 390, 412, 1100]) {
    await runLayoutCheck(lang, width);
  }
}

// -----------------------------------------------------------------------
// A real page-errors pass, both languages, so a thrown exception anywhere
// in the round above cannot hide behind a passing functional assertion.
// -----------------------------------------------------------------------
for (const lang of ["en", "bn"]) {
  const ctx = await newContext(browser, {
    banner: false, viewport: { width: 390, height: 844 }, appLang: lang,
    seedTemplates: SEED_TEMPLATES, extraSeedJs: HIZB_SEED,
  });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openExploreTab(page);
  await switchToHizbView(page);
  await page.evaluate(() => document.querySelector('#exploreWheelContainer .wheel-seg[data-key="2"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForTimeout(600);
  check(`[${lang}] no page errors across the whole Hizb path`, errors.length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Explore Hizb view (issue #342): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
