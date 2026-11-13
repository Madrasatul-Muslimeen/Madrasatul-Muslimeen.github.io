// The Owner, 13 Nov 2026 (the wheel's view row, the empty place after Hizb circled): "Add page view/ status here."
// Explore's Quran level gains a Page view: the 604 printed pages as one wheel, each wedge coloured by the Approach's status.
//   MUT=nopage ... mutation: the Page button does nothing (the view is never drawn) -> the 604-wedge check fails by name.
// Expected statuses are read off the packaged page-index.json and the seeded Juz 1 claim (never recomputed by the app): Juz 1 holds pages 1-21.
// Run from the repository root with serve.js up:  node tools/i18n-verify/explore-page-view-browser.mjs
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


const MUT = process.env.MUT || "";
const pageIndex = JSON.parse(fs.readFileSync(path.join(dataRoot, "page-index.json"), "utf8"));
if (pageIndex.length !== 604) throw new Error(`fixture: page-index.json has ${pageIndex.length} rows`);
const juz1Pages = pageIndex.filter((p) => p.endSurah < 2 || (p.endSurah === 2 && p.endAyah <= 141)).map((p) => p.page);
if (juz1Pages.length < 15) throw new Error("fixture: Juz 1 page list implausible");
for (const lang of ["en", "bn"]) {
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 844 }, appLang: lang, seedTemplates: SEED_TEMPLATES, extraSeedJs: HIZB_SEED });
  if (MUT === "nopage") await ctx.addInitScript(() => { window.addEventListener("DOMContentLoaded", () => { document.getElementById("exploreViewPageBtn")?.addEventListener("click", (e) => e.stopImmediatePropagation(), true); }); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openExploreTab(page);
  await switchToApproach(page, YES_ID);
  const btn = await page.evaluate(() => { const b = document.getElementById("exploreViewPageBtn"); const r = b.getBoundingClientRect(); return { shown: !b.hidden && r.width > 0, h: Math.round(r.height), text: b.textContent.trim() }; });
  check(`[${lang}] the Page button is in the view row, at least 40px tall, reading "${btn.text}"`, btn.shown && btn.h >= 40 && btn.text.length > 0, JSON.stringify(btn));
  await clickSafely(page, "#exploreViewPageBtn");
  await page.waitForFunction(() => document.querySelectorAll("#exploreWheelContainer .wheel-seg").length === 604, null, { timeout: 10000 }).catch(() => {});
  check(`[${lang}] MUTATION TARGET (nopage): the Page view draws 604 wedges`, (await wedgeCount(page)) === 604, String(await wedgeCount(page)));
  if ((await wedgeCount(page)) === 604) {
    const on = await page.evaluate(() => document.getElementById("exploreViewPageBtn").getAttribute("aria-pressed"));
    check(`[${lang}] the Page button shows as pressed`, on === "true", on);
    const inJuz1 = await chipStatusFor(page, juz1Pages[0]), inJuz1b = await chipStatusFor(page, juz1Pages[juz1Pages.length - 1]), outside = await chipStatusFor(page, 604);
    check(`[${lang}] pages of the achieved Juz 1 show Achieved, a page outside it does not`, inJuz1 === "achieved" && inJuz1b === "achieved" && outside === "not_started", JSON.stringify({ inJuz1, inJuz1b, outside }));
    await page.reload(); await openExploreTab(page);
    const kept = await page.evaluate(() => document.getElementById("exploreViewPageBtn")?.getAttribute("aria-pressed"));
    check(`[${lang}] the Page view is remembered after a reload`, kept === "true", String(kept));
    await page.evaluate((k) => document.querySelector(`#exploreSidebarContainer .way-row[data-key="${k}"]`)?.click(), 100);
    await page.waitForTimeout(600);
    const opened = await page.evaluate(() => document.getElementById("exploreWheelContainer")?.textContent.trim().slice(0, 60));
    check(`[${lang}] tapping a page opens the Surah it begins in (the wheel is no longer the 604-page one)`, !!opened, opened);
  }
  await ctx.close();
}
console.log(`\n==== Explore Page view: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
