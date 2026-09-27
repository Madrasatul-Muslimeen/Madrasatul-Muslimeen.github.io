// Issue #325 -- "Take an Approach with all four stages, per āyah and per
// page" from Mushaf view, RENDERED acceptance QA in a real browser,
// following this project's own established practice for a focused,
// committed browser suite. Written here, NOT run here -- this sandbox has
// no Playwright browser binaries installed, the same documented,
// repeated environment gap CLAUDE.md records for every browser-driven
// suite in this directory. The Architect/CI should run this for real
// before it is trusted.
//
// SCOPE: the five scenarios the issue's own "Prove it" section names --
//   1. Ayah Card: pick an Approach, press each stage, assert the `records`
//      write for ayah:3:55 with that status; reopen and assert the pressed
//      button shows the saved state; assert no page-unit write.
//   2. Page card: opens from #mushafPageRef; its stage buttons write only
//      the page: unit key in subject_quran; assert no ayah: write.
//   3. The marker ring appears with the right colour after an āyah claim.
//   4. No new bar exists in the DOM; no sideways scroll; the top bar fits
//      one line.
//   5. The 604-page numbering check is NOT a browser concern -- it is
//      tools/i18n-verify/mushaf-page-numbering-parity.mjs, a plain-Node
//      check over the real packaged data, run separately (and it already
//      found a real, pinned, unresolved disagreement -- see that file's
//      own header).
//
// Scenarios 1-3 are interaction-heavy (several real clicks/writes each) and
// run ONCE per language, at 390x844 -- the same cost trade-off
// quran-ayah-action-sheet-browser.mjs's own "Take an Approach" section and
// mushaf-page-ref-browser.mjs's own swipe/full-screen section already make.
// Scenario 4 (no new bar / no sideways scroll / one line / marker tap area)
// is pure layout and runs at all three named widths (320/390/1100), in both
// languages -- six configurations, matching the issue's own "en + bn at
// 320/390/1100px" instruction literally for the part that is actually
// width-sensitive.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// Copied from app/js/hifz-renderer.js's own module-level constants -- the
// coupling is deliberate and closed by the "fixture really intercepted"
// precondition check below (fails by name if the route is never hit).
const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/fonts/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";

// ONE real page (50), ONE real āyah on it (3:55, Aal-i-Imraan) -- the
// issue's own worked example for the Ayah Card's write ("ayah:3:55"), and
// exactly the same page serves the "This page" card scenario too, so the
// suite never needs a second fixture page. Same two-position-per-ayah shape
// (a real word, then the marker) quran-ayah-action-sheet-browser.mjs's own
// fixture already uses, and the same short, on-page marker glyph its own
// Architect-review comment explains (a long synthetic glyph runs off the
// page and fails its own hit-test).
const MARKER_GLYPH = "Ⓜ";
const SYNTHETIC_MUSHAF_DATA = {
  "50": [{ type: "ayah", words: [
    { g: "Ⓦ", loc: "3:55:1" },
    { g: MARKER_GLYPH, loc: "3:55:2" },
  ] }],
};

// The default fixture's own `records` seed only carries surah_1 and
// subject_asma_ul_husna documents. A claim against a document that does not
// exist yet takes the stub's CREATE path (setDoc), which the stub's own
// comment states plainly is "a pure no-op ... and leaves no trace" -- so the
// very first claim in each scenario would be invisible to __stubWriteData
// without this. Seeded with an empty entries map (not the identical shape
// CARD_SEED's own DATA.records = [{...}] uses, since this suite ADDS to the
// default set rather than replacing it -- surah_1's own seeded claims stay
// intact for every other suite that might one day share a context).
const APPROACH_CARDS_SEED = `
DATA.records.push(
  { _id: TENANT_ID + "__p1__surah_3", tenantId: TENANT_ID, personId: "p1", entries: {} },
  { _id: TENANT_ID + "__p1__subject_quran", tenantId: TENANT_ID, personId: "p1", entries: {} }
);
`;

async function installSyntheticMushafFixture(ctx) {
  await ctx.route(MUSHAF_JSON_URL, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNTHETIC_MUSHAF_DATA) }));
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (route) => route.abort("failed"));
  await ctx.route(SURAH_HEADER_FONT_URL, (route) => route.abort("failed"));
}

async function clickSafely(page, selector, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    await page.evaluate(() => {
      document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove());
    });
    try { await page.click(selector, { timeout: 4000 }); return; } catch (err) { lastErr = err; }
  }
  throw lastErr;
}

/** Opens the Read screen, Surah 3 (Aal-i-Imraan), Whole Surah, Mushaf on -- the same picker sequence every other Mushaf suite here already uses, just surah 3 instead of 2/14. */
async function openMushafSurah3(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await clickSafely(page, "#tabStudyBtn"); await page.waitForTimeout(150); }
  await clickSafely(page, "#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "3"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { const sel = document.getElementById("unitTypeSelect"); sel.value = "surah"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const m = document.getElementById("mushafToggle");
    if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(500);
}

// "Fits one line" is about #mushafPageRef ITSELF (the ▾ and the ellipsis
// text sharing one row), not the whole #readBar -- #readBar is KNOWN,
// PRE-EXISTING, ACCEPTED behaviour to wrap onto more than one row at 320px
// (CLAUDE.md's own v08.30 entry measures this directly), so a whole-bar
// "everything on one line" assertion would fail at 320px for a reason that
// has nothing to do with this round. The element-level line-height check is
// the same shape mushaf-page-ref-browser.mjs's own readPageRef() already
// uses for the identical reason.
function readLayout(page) {
  return page.evaluate(() => {
    const ref = document.getElementById("mushafPageRef");
    const refRect = ref?.getBoundingClientRect();
    const exit = document.getElementById("hideChromeBtn")?.getBoundingClientRect();
    const marker = document.querySelector('[data-ayah-marker="3:55"]');
    const markerBox = marker ? marker.getBoundingClientRect() : null;
    return {
      // Architect review: measured on the nowrap text span, not the 40px button.
      refFitsOneLine: (() => { const tx = ref?.querySelector(".mushaf-page-ref-text"); if (!tx) return null; const h = tx.getBoundingClientRect().height; return h <= (parseFloat(getComputedStyle(tx).lineHeight) || h) * 1.6; })(),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      exitOnScreen: !!exit && exit.right <= window.innerWidth && exit.left >= 0,
      mushafPageRefParentIsReadBar: document.getElementById("mushafPageRef")?.parentElement?.id === "readBar",
      rejectedHintTextPresent: document.body.textContent.includes("Tap ۝") || document.body.textContent.includes("tap the title for this page"),
      markerTapArea: markerBox ? { width: markerBox.width, height: markerBox.height } : null,
    };
  });
}

// =============================================================================
// Scenario 4 -- no new bar, no sideways scroll, top bar fits one line, the
// marker's own tap area still >=40px. Pure layout: all three named widths,
// both languages.
// =============================================================================
for (const [width, height] of [[320, 640], [390, 844], [1100, 900]]) {
  for (const lang of ["en", "bn"]) {
    console.log(`\n=== Mushaf Approach cards -- layout only, ${width}x${height}, appLang=${lang} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height } });
    await installSyntheticMushafFixture(ctx);
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await openMushafSurah3(page);
    const settled = await page.waitForFunction(
      (marker) => !!document.querySelector(".hifz-page") && document.body.textContent.includes(marker),
      MARKER_GLYPH,
      { timeout: 5000 },
    ).then(() => true).catch(() => false);
    check(`[${lang} ${width}] precondition: the synthetic Mushaf page rendered (route really intercepted)`, settled);
    if (settled) {
      const layout = await readLayout(page);
      check(`[${lang} ${width}] #mushafPageRef stays inside #readBar -- no new bar was added to hold it`, layout.mushafPageRefParentIsReadBar === true, JSON.stringify(layout));
      check(`[${lang} ${width}] the rejected hint-strip text (Owner decision 1) is nowhere in the DOM`, layout.rejectedHintTextPresent === false, JSON.stringify(layout));
      check(`[${lang} ${width}] the top-bar reference fits one line (its own rect height <= ~1.6x its own line-height)`, layout.refFitsOneLine === true, JSON.stringify(layout));
      check(`[${lang} ${width}] no sideways page scroll`, layout.scrollWidth <= layout.innerWidth + 1, JSON.stringify(layout));
      check(`[${lang} ${width}] the exit full-screen icon stays fully on screen`, layout.exitOnScreen === true, JSON.stringify(layout));
      check(`[${lang} ${width}] the āyah-end marker's own tap area is still >=40x40 (unchanged by the new ring CSS)`,
        !!layout.markerTapArea && layout.markerTapArea.width >= 40 && layout.markerTapArea.height >= 40, JSON.stringify(layout.markerTapArea));
    }
    const real = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID|FAILED)/.test(e));
    check(`[${lang} ${width}] no unexpected page errors`, real.length === 0, real.join("; "));
    await ctx.close();
  }
}

// =============================================================================
// Scenarios 1-3 -- the Ayah Card's four stages, the "This page" card, and
// the marker ring. Once per language, 390x844.
// =============================================================================
for (const lang of ["en", "bn"]) {
  console.log(`\n=== Mushaf Approach cards -- Ayah Card four stages, This page card, marker ring, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 }, extraSeedJs: APPROACH_CARDS_SEED });
  await installSyntheticMushafFixture(ctx);
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openMushafSurah3(page);
  const settled = await page.waitForFunction(
    (marker) => !!document.querySelector(".hifz-page") && document.body.textContent.includes(marker),
    MARKER_GLYPH,
    { timeout: 5000 },
  ).then(() => true).catch(() => false);
  check(`[${lang}] precondition: the synthetic Mushaf page rendered`, settled);
  if (!settled) { await ctx.close(); continue; }

  // --- Scenario 1: the Ayah Card's four stages -------------------------------
  await clickSafely(page, '[data-ayah-marker="3:55"]');
  await page.waitForTimeout(300);
  const opened = await page.evaluate(() => document.querySelector("[data-ayah-sheet]")?.dataset.unitKey === "ayah:3:55");
  check(`[${lang}] tapping the marker opens the Ayah Card for ayah:3:55`, opened);

  await page.evaluate(() => {
    const sel = document.querySelector("[data-approach-stage-select]");
    sel.value = "recite";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const stageIds = ["not_started", "learning", "practising", "achieved"];
  for (const statusId of stageIds) {
    await clickSafely(page, `[data-approach-stage-btn="${statusId}"]`);
    await page.waitForTimeout(400);
    const write = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "records").at(-1));
    check(`[${lang}] pressing ${statusId} wrote records/t1__p1__surah_3 with entries.ayah:3:55::recite`,
      write?.col === "records" && write?.id === "t1__p1__surah_3" && Object.keys(write?.data ?? {}).includes("entries.ayah:3:55::recite"),
      JSON.stringify(write));
    const entry = write?.data?.["entries.ayah:3:55::recite"];
    check(`[${lang}] the written claimedStatus is exactly '${statusId}'`, entry?.claimedStatus === statusId, JSON.stringify(entry));
    check(`[${lang}] the write never touches a page: unit key`, !Object.keys(write?.data ?? {}).some((k) => k.includes("page:")), JSON.stringify(write?.data && Object.keys(write.data)));
    check(`[${lang}] pressing a stage never closes the card`, await page.evaluate(() => !!document.getElementById("ayahActionSheetOverlay")?.classList.contains("open")));
  }

  // --- Scenario 3: the marker ring, right after the last press (achieved -- green) ---
  const ringAfterAchieved = await page.evaluate(() => {
    const marker = document.querySelector('[data-ayah-marker="3:55"]');
    return { ring: marker?.classList.contains("hifz-ayah-marker-ring"), color: marker?.style.getPropertyValue("--ayah-marker-ring-color") };
  });
  check(`[${lang}] the marker carries a ring after an āyah claim`, ringAfterAchieved.ring === true, JSON.stringify(ringAfterAchieved));
  check(`[${lang}] the ring's colour is 'achieved' green (#14532d), matching the last stage pressed`, ringAfterAchieved.color.trim() === "#14532d", JSON.stringify(ringAfterAchieved));

  // Press 'not_started' again so the ring's OTHER direction (removal) is
  // proven too, not just that a colour can appear.
  await clickSafely(page, '[data-approach-stage-btn="not_started"]');
  await page.waitForTimeout(400);
  const ringAfterNotStarted = await page.evaluate(() => {
    const marker = document.querySelector('[data-ayah-marker="3:55"]');
    return { ring: marker?.classList.contains("hifz-ayah-marker-ring") };
  });
  check(`[${lang}] the ring disappears once the status is Not started again`, ringAfterNotStarted.ring === false, JSON.stringify(ringAfterNotStarted));

  // Re-claim 'practising' (blue) so the reopen check below has a real, non-default state to find.
  await clickSafely(page, '[data-approach-stage-btn="practising"]');
  await page.waitForTimeout(400);

  // --- Reopen: the pressed button shows the SAVED state, not a reset -----
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const closedByEscape = await page.evaluate(() => !document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"));
  check(`[${lang}] Escape closes the Ayah Card`, closedByEscape);
  await clickSafely(page, '[data-ayah-marker="3:55"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const sel = document.querySelector("[data-approach-stage-select]");
    sel.value = "recite";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const reopened = await page.evaluate(() =>
    [...document.querySelectorAll("[data-approach-stage-btn]")].map((b) => [b.dataset.approachStageBtn, b.getAttribute("aria-pressed")]));
  check(`[${lang}] reopening the card and re-picking the same Approach shows 'practising' pressed -- the saved state`,
    JSON.stringify(reopened) === JSON.stringify([["not_started", "false"], ["learning", "false"], ["practising", "true"], ["achieved", "false"]]),
    JSON.stringify(reopened));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // --- Scenario 2: the "This page" card --------------------------------------
  const pageNum = await page.evaluate(() => document.getElementById("mushafPageRef")?.dataset.page ?? null);
  check(`[${lang}] the top-bar reference names a real page number (the synthetic fixture's own page 50)`, pageNum === "50", pageNum);
  await clickSafely(page, "#mushafPageRef");
  await page.waitForTimeout(400);
  const pageCardOpen = await page.evaluate(() => !!document.querySelector("[data-page-approach-card]") && !!document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"));
  check(`[${lang}] tapping the top-bar reference opens the "This page" card`, pageCardOpen);
  const pageCardHeading = await page.evaluate(() => document.querySelector(".page-approach-card .ayah-sheet-ref")?.textContent ?? "");
  // Bangla digits, not "50" -- num(50) renders as Bengali numerals, so this
  // checks for the middot formatMushafPageRef()/the "Page {page} · ref"
  // join always uses, rather than an ASCII digit that only exists in English.
  check(`[${lang}] the card names the page and this page's own surah/āyāt text`, pageCardHeading.includes("·") && pageCardHeading.length > 4, pageCardHeading);
  // "full screen below 900px" (this suite runs at 390px): the card fills
  // the viewport rather than sitting as an 82vh bottom sheet the way the
  // Ayah Card does.
  const pageCardRect = await page.evaluate(() => document.querySelector(".page-approach-card")?.getBoundingClientRect());
  check(`[${lang}] below 900px the "This page" card is full screen (fills the viewport height)`,
    !!pageCardRect && pageCardRect.top <= 1 && pageCardRect.height >= 843, JSON.stringify(pageCardRect));
  // The Ayah Card is closed by construction (mutually exclusive, shared mount) -- prove it rather than assume it.
  check(`[${lang}] opening the page card leaves no Ayah Card sheet behind (mutually exclusive, shared mount)`, await page.evaluate(() => !document.querySelector("[data-ayah-sheet]")));

  await page.evaluate(() => {
    const sel = document.querySelector("[data-approach-stage-select]");
    sel.value = "recite";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(300);
  await clickSafely(page, '[data-approach-stage-btn="learning"]');
  await page.waitForTimeout(400);
  const pageWrite = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "records").at(-1));
  check(`[${lang}] the page card wrote records/t1__p1__subject_quran with entries.page:madani:50::recite`,
    pageWrite?.col === "records" && pageWrite?.id === "t1__p1__subject_quran" && Object.keys(pageWrite?.data ?? {}).includes("entries.page:madani:50::recite"),
    JSON.stringify(pageWrite));
  const pageEntry = pageWrite?.data?.["entries.page:madani:50::recite"];
  check(`[${lang}] the page claim is recorded as 'learning'`, pageEntry?.claimedStatus === "learning", JSON.stringify(pageEntry));
  check(`[${lang}] the page card's write never touches an ayah: unit key (Owner decision 4)`,
    !Object.keys(pageWrite?.data ?? {}).some((k) => k.includes("ayah:")), JSON.stringify(pageWrite?.data && Object.keys(pageWrite.data)));
  check(`[${lang}] pressing a stage on the page card does not close it either`, await page.evaluate(() => !!document.getElementById("ayahActionSheetOverlay")?.classList.contains("open")));

  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  const real = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID|FAILED)/.test(e));
  check(`[${lang}] no unexpected page errors across the whole scenario`, real.length === 0, real.join("; "));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Mushaf Approach cards (issue #325): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
