// Issue #328 -- "My Status", the whole-Qur'an wheel (Owner decisions 6-8,
// 27 Sep 2026), RENDERED acceptance QA in a real browser, following this
// project's own established practice for a focused, committed browser
// suite. Written here, NOT run here -- this sandbox has no Playwright
// browser binaries installed, the same documented, repeated environment gap
// CLAUDE.md records for every browser-driven suite in this directory. The
// Architect/CI should run this for real before it is trusted.
//
// SCOPE, matching the issue's own "Prove it" section:
//   1. The "My Status" button fits the caption row, en+bn, at
//      320/360/390/412/1100px -- no wrap/overflow.
//   2. I9: no `records` QUERY (listAllRecordsForPerson's own getDocs) before
//      the button is pressed; one appears after.
//   3. The sheet is a full-screen cover at a phone width, and a smaller
//      centred window at a desktop width.
//   4. Slice/row counts agree with a seeded fixture: a Surah claim on a
//      YES Approach (Hifz, approach_02) floors every ayah of that surah, so
//      its headline reads a non-zero Achieved+Mastered figure; the SAME
//      SHAPE of claim on a NO Approach (Basic Grammar, approach_06) reads a
//      ZERO headline and shows up under "studied as a whole" instead.
//   5. "See in Explore" opens Explore on the same Approach
//      (changeCurrentTrackable() + tabExploreBtn's own open sequence).
//
// Real APPROACH_TEMPLATES ids (approach_01..approach_30) are seeded via
// `seedTemplates`, exactly like quranrevival-startup-reads.mjs already does
// -- the default fixture's own trackables use short synthetic ids
// ("memorise", "hifz", ...) that do not correspond to DEFAULT_YES_
// TRACKABLE_IDS at all, so this suite needs the real catalogue to exercise
// the real Yes/No defaults.
import { chromium, newContext, openPage } from "./harness.mjs";
import { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } from "../../app/js/catalogue-data.js";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

const SEED_TEMPLATES = { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES };

// approach_02 = "Hifz / Memorising", Yes by default. approach_06 =
// "Language Learning (Basic Grammar)", No by default (not in
// DEFAULT_YES_TRACKABLE_IDS). Real names, read straight off catalogue-data.js
// rather than retyped, so a future rename cannot silently desync this fixture.
const YES_ID = "approach_02";
const NO_ID = "approach_06";
const yesTemplate = APPROACH_TEMPLATES.find((t) => t.id === YES_ID);
const noTemplate = APPROACH_TEMPLATES.find((t) => t.id === NO_ID);
if (!yesTemplate || !noTemplate) throw new Error("fixture Approach ids not found in APPROACH_TEMPLATES -- catalogue-data.js has changed shape");

// Two fresh records chunks (the default fixture only ever seeds surah_1 and
// subject_asma_ul_husna -- see firebase-stub.mjs's own comment on that), each
// carrying one WHOLE-SURAH claim: surah 3 (Aal-i-Imraan, 200 ayat) for the
// YES Approach, surah 112 (Al-Ikhlas, 4 ayat -- short on purpose, so the
// suite need not know Aal-i-Imraan's real ayah count) for the NO one.
const MY_STATUS_SEED = `
DATA.records.push(
  { _id: TENANT_ID + "__p1__surah_3", tenantId: TENANT_ID, personId: "p1", chunkKey: "surah_3", entries: {
    "surah:3::${YES_ID}": { unitType: "surah", subjectId: "quran", trackableId: "${YES_ID}",
      claimedStatus: "achieved", claimedByPersonId: "p1", confirmedStatus: "achieved",
      confirmState: "confirmed", domainIds: [], notes: "" },
  } },
  { _id: TENANT_ID + "__p1__surah_112", tenantId: TENANT_ID, personId: "p1", chunkKey: "surah_112", entries: {
    "surah:112::${NO_ID}": { unitType: "surah", subjectId: "quran", trackableId: "${NO_ID}",
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

/** The headline's own leading count, in whichever script it was rendered
 *  (num() prints Bengali digits in Bangla) -- reading it back as a plain
 *  JS number is what lets one assertion work in both languages. */
// Architect review, 27 Sep 2026: the headline's own COUNT, not merely its first
// number. Bangla puts the total first ("{total}টির মধ্যে {n}টি আয়াত"), so the
// first number in a Bangla headline is 6,236 whatever the count is -- the NO
// Approach read "6236" and failed for a reason in the test, not the app.
function firstNumberIn(text) {
  const str = String(text ?? "");
  const m = str.match(/([0-9০-৯]+)টি আয়াত/)?.slice(1) ?? str.match(/:\s*([0-9০-৯]+)/)?.slice(1) ?? str.match(/[0-9০-৯]+/);
  if (!m) return null;
  const westernized = m[0].replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
  return Number(westernized);
}

async function waitForWheelReady(page) {
  await page.waitForFunction(() => {
    const wheel = document.getElementById("wheelContainer");
    return !!wheel && !!wheel.querySelector("svg");
  }, null, { timeout: 30000 });
}

function readButtonLayout(page) {
  return page.evaluate(() => {
    // UPDATED IN PLACE, 27 Sep 2026, reason recorded: the heading's own
    // #myStatusBtn is gone -- the Owner asked for equal capsules, and the
    // landing page now scrolls on a phone, so #myStatusWideBtn is the one
    // "My Status" button at every width. Both ids are still looked up so the
    // check keeps finding whichever one is really displayed.
    const btn = ["myStatusBtn", "myStatusWideBtn"].map((id) => document.getElementById(id))
      .find((el) => el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0);
    const rect = btn ? btn.getBoundingClientRect() : null;
    return {
      present: !!btn,
      onScreen: !!rect && rect.width > 0 && rect.height > 0 && rect.right <= window.innerWidth + 1 && rect.left >= -1,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      minHeight: rect ? rect.height : 0,
    };
  });
}

// =============================================================================
// 1. Layout -- en + bn, 320/360/390/412/1100px. The button must be present,
//    fully on screen and must not force the page to scroll sideways.
//    Not asserted here (would need layout.mjs's own Approach-row counter,
//    which this suite does not have access to): whether adding the button
//    costs an Approach row at any width. Flagged for the Architect's own
//    layout.mjs run, per the issue's own instruction that it is run there.
// =============================================================================
for (const lang of ["en", "bn"]) {
  for (const width of [320, 360, 390, 412, 1100]) {
    const ctx = await newContext(browser, { banner: false, viewport: { width, height: 844 }, appLang: lang, seedTemplates: SEED_TEMPLATES });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await waitForWheelReady(page);
    const r = await readButtonLayout(page);
    check(`[${lang} ${width}px] "My Status" button is present and on screen`, r.present && r.onScreen, JSON.stringify(r));
    check(`[${lang} ${width}px] no sideways scroll`, r.scrollWidth <= r.innerWidth + 2, `scrollWidth=${r.scrollWidth} innerWidth=${r.innerWidth}`);
    await ctx.close();
  }
}

// =============================================================================
// 2/3/4/5 -- one real context, phone width, both the I9/read-timing and the
// functional/data scenarios (they share the one fixture and one page load,
// the same cost trade-off the Mushaf Approach Cards suite already makes).
// =============================================================================
async function runScenarios(lang) {
  const ctx = await newContext(browser, {
    banner: false, viewport: { width: 390, height: 844 }, appLang: lang,
    seedTemplates: SEED_TEMPLATES, extraSeedJs: MY_STATUS_SEED,
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await waitForWheelReady(page);

  // ---- 2. I9: nothing reads `records` by QUERY before the press. ----
  const before = await page.evaluate(() => window.__fsLog.filter((r) => r.col === "records" && r.kind === "getDocs").length);
  check(`[${lang}] I9: no records QUERY before "My Status" is pressed (measured ${before})`, before === 0);

  await clickSafely(page, "#myStatusWideBtn"); // updated in place 27 Sep 2026 -- see readButtonLayout()
  await page.waitForFunction(() => {
    const body = document.getElementById("myStatusBody");
    return !!body && body.querySelectorAll(".my-status-row-btn").length > 0;
  }, null, { timeout: 10000 });

  const after = await page.evaluate(() => window.__fsLog.filter((r) => r.col === "records" && r.kind === "getDocs").length);
  check(`[${lang}] I9: exactly one records QUERY fires once pressed (measured ${after})`, after === 1);

  // ---- 3. The sheet is a full-screen cover at 390px. ----
  const sheetRect = await page.evaluate(() => {
    const mount = document.getElementById("myStatusMount");
    const r = mount.getBoundingClientRect();
    return { hidden: mount.hidden, width: r.width, height: r.height, top: r.top, left: r.left };
  });
  check(`[${lang}] the sheet is open`, sheetRect.hidden === false);
  check(`[${lang}] the sheet covers the whole viewport below 900px`, sheetRect.width >= 389 && sheetRect.height >= 843 && sheetRect.top === 0 && sheetRect.left === 0, JSON.stringify(sheetRect));

  // ---- 4. Slice/row counts agree with the seeded fixture. ----
  // Architect review, 27 Sep 2026: the harness fixture carries 10 invented
  // Quran trackables on top of the 30 seeded templates, and the landing wheel
  // lists all 40 too -- "My Status" shows the same list the wheel does. So the
  // check is that every one of the REAL 30 is listed, and the list matches the
  // wheel's own count, not a hardcoded 30.
  const rowIds = await page.evaluate(() => [...document.querySelectorAll(".my-status-row-btn")].map((b) => b.dataset.myStatusOpen));
  const real30 = APPROACH_TEMPLATES.map((a) => a.id);
  const missing = real30.filter((id) => !rowIds.includes(id));
  check(`[${lang}] the overview lists all 30 real Approaches`, missing.length === 0, `missing ${missing.join(",")}`);
  const wheelCount = await page.evaluate(() => document.querySelectorAll("#wheelSection .way-row").length);
  check(`[${lang}] the overview lists the same Approaches as the landing wheel`, wheelCount > 0 && rowIds.length === wheelCount, `status ${rowIds.length} vs wheel ${wheelCount}`);

  const yesRowText = await page.evaluate((id) => {
    const btn = document.querySelector(`[data-my-status-open="${id}"]`);
    return btn ? btn.querySelector(".my-status-row-figure")?.textContent ?? "" : null;
  }, YES_ID);
  const yesCount = firstNumberIn(yesRowText);
  check(`[${lang}] the YES Approach's headline is non-zero -- the Surah claim floored its ayat`, yesCount > 0, `text="${yesRowText}" parsed=${yesCount}`);

  const noRowText = await page.evaluate((id) => {
    const btn = document.querySelector(`[data-my-status-open="${id}"]`);
    return btn ? btn.querySelector(".my-status-row-figure")?.textContent ?? "" : null;
  }, NO_ID);
  const noCount = firstNumberIn(noRowText);
  check(`[${lang}] the NO Approach's headline reads zero -- Owner decision 6, the Surah claim does not count per-ayah`, noCount === 0, `text="${noRowText}" parsed=${noCount}`);

  // Open the NO Approach's own detail and look for the "studied as a
  // whole" line -- the claim must be visible SOMEWHERE, just not in the
  // ayah tally.
  await clickSafely(page, `[data-my-status-open="${NO_ID}"]`);
  await page.waitForTimeout(200);
  // Architect review, 27 Sep 2026: this read `... || noDetailText.length > 0`,
  // which passes for ANY detail text at all -- the cannot-fail `A || B` shape
  // CLAUDE.md warns about. It now reads the detail's own "studied as a whole"
  // line and requires the seeded Surah in it, in either language.
  const wholeLine = await page.evaluate(() => document.querySelector("#myStatusDetailBody .my-status-whole-line")?.textContent ?? "");
  const wholePhrase = lang === "bn" ? "সম্পূর্ণভাবে অধ্যয়ন করা হয়েছে" : "studied as a whole";
  check(`[${lang}] the NO Approach's detail names "studied as a whole" with its one Surah`, wholeLine.includes(wholePhrase) && /[1১]/.test(wholeLine), `line="${wholeLine}"`);

  // ---- 5. "See in Explore" opens Explore on the same Approach. ----
  await clickSafely(page, "#myStatusSeeInExploreBtn");
  await page.waitForTimeout(500);
  const exploreState = await page.evaluate((id) => ({
    sheetHidden: document.getElementById("myStatusMount")?.hidden,
    exploreVisible: document.getElementById("exploreView")?.hidden === false,
    trackableSelectValue: document.getElementById("trackableSelect")?.value,
    exploreTabPressed: document.getElementById("tabExploreBtn")?.getAttribute("aria-pressed"),
  }), NO_ID);
  check(`[${lang}] "See in Explore" closes the sheet`, exploreState.sheetHidden === true, JSON.stringify(exploreState));
  check(`[${lang}] "See in Explore" opens the Explore stage view`, exploreState.exploreVisible === true && exploreState.exploreTabPressed === "true", JSON.stringify(exploreState));
  check(`[${lang}] "See in Explore" selects the SAME Approach that was open`, exploreState.trackableSelectValue === NO_ID, JSON.stringify(exploreState));

  await ctx.close();
}

for (const lang of ["en", "bn"]) await runScenarios(lang);

await browser.close();
console.log(`\n==== "My Status" (issue #328) browser suite: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
