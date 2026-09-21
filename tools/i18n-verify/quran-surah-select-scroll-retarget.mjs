// Word Card / flow-nav stack, next candidate: the ONE item PR #139's own
// quran-flow-step-nav.mjs report flagged and deliberately did not touch --
// "The bare `surahSelect`/`ayahSelect` dropdown change handlers share the
// identical root cause ... and are NOT touched here." Issue #113's next
// task-bridge round asked for this adjacent gap to be reproduced for real
// before deciding anything, then fixed only if it actually reproduces.
//
// REPRODUCED for `surahSelect`, NOT for `ayahSelect` -- both checked in a
// real browser before any code changed, not assumed from either flag.
//
// `surahSelect`: picking a different surah is a THIRD, independent way to
// cross a surah boundary (`stepUnit()` and `goToUnitNumber()` are the other
// two, both already fixed). Its own change handler calls `loadSurah()`,
// which always lands on the new surah's own āyah 1 -- the identical target
// `openSurahAt()` uses -- but never called `scrollFlowToCurrentAyah()`.
// Reproduced with a debug run: Whole Surah unit, surah 1 (7 āyahs), flow
// strip scrolled to āyah 7, then surah 2 picked from the dropdown directly.
// State correctly moved to surah 2 āyah 1, but `#pageViewContainer` stayed
// scrolled to the stale offset (āyah 7's position), exactly the
// `renderFlowView()` non-Mushaf-branch "one atomic innerHTML assignment
// does not reset scrollLeft" defect this stack's earlier rounds already
// measured for `stepUnit()`/`goToUnitNumber()`/`navigateToAyah()`.
//
// `ayahSelect`: does NOT reproduce, and NOT because of some accidental
// timing -- structurally impossible. `ayahSelectControl` is hidden exactly
// when `unitRendersWhole()` is true (Mushaf on, or unit is Surah/Range),
// and `#pageViewContainer` (the flow strip) is shown exactly when `usesFlow`
// is true, which is the SAME condition (`isMushaf || isPageUnit`). So
// `ayahSelect` is interactable only while the flow strip is hidden, and
// hidden exactly while the flow strip is shown -- its change handler can
// never run while there is anything for `scrollFlowToCurrentAyah()` to
// retarget. Case 5 below proves this by direct measurement across every
// unit type, rather than trusting the reading of the two `display` toggles.
// Per the task's own instruction ("if it does not reproduce, do not invent
// it"), `ayahSelect`'s handler is left untouched.
//
// THE FIX: one line, calling the SAME already-shipped, never-modified
// `scrollFlowToCurrentAyah()` every other cross-surah site already uses --
// added to the tail of `surahSelect`'s own change handler, after
// `loadSurah()` settles.
//
// A SEPARATE, OUT-OF-SCOPE GAP FOUND WHILE REPRODUCING, flagged and NOT
// fixed here (the task's own instruction: "do not decide cross-surah Range
// content policy"): picking a different surah while a Range unit's window
// does not fully sit inside the new surah (e.g. rangeFrom/rangeTo = 3..7,
// new surah has fewer than 3 āyahs at that position) leaves the RANGE
// WINDOW ITSELF unclamped -- `loadSurah()` resets `currentAyahNum` but never
// touches `rangeFrom`/`rangeTo`, so the flow strip keeps showing the OLD
// window's āyah numbers against the NEW surah's text. Case 3 below isolates
// the scroll-retargeting fix from this separate defect by choosing a window
// (1..5) that stays valid in the destination surah too, so it proves only
// what this round fixes; it does not paper over or silently rely on the
// Range content question being decided.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// This stack's own established splash-interception hardening (PR #135).
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

async function openReadScreen(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await clickSafely(page, "#tabStudyBtn"); await page.waitForTimeout(150); }
  await clickSafely(page, "#tabReadBtn");
  await page.waitForTimeout(500);
}

async function setUnitType(page, unitType) {
  await page.evaluate((ut) => {
    const sel = document.getElementById("unitTypeSelect");
    sel.value = ut;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }, unitType);
  await page.waitForTimeout(800);
}

async function setSurah(page, n) {
  await page.evaluate((s) => {
    const sel = document.getElementById("surahSelect");
    sel.value = String(s);
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }, n);
  await page.waitForTimeout(1500);
}

function visibleAyahScript() {
  return `(() => {
    const rows = [...document.querySelectorAll(".page-flow-ayah")];
    const c = document.getElementById("pageViewContainer").getBoundingClientRect();
    const mid = c.left + c.width / 2;
    for (const r of rows) {
      const rr = r.getBoundingClientRect();
      if (rr.left <= mid && rr.right >= mid) return r.dataset.ayah;
    }
    return null;
  })()`;
}

// ---------------------------------------------------------------------------
// 1) Whole Surah, non-Mushaf: picking a different surah from the DROPDOWN
//    lands the flow strip on the new surah's own first āyah, not wherever
//    the old scroll offset carries over to. English + Bangla, mobile.
// ---------------------------------------------------------------------------
for (const lang of ["en", "bn"]) {
  console.log(`\n=== surahSelect: Whole Surah flow retargets on a direct surah pick, appLang=${lang}, mobile ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openReadScreen(page);
  await setSurah(page, 1);
  await setUnitType(page, "surah");

  await page.evaluate(() => {
    document.querySelector('.page-flow-ayah[data-ayah="7"]')?.scrollIntoView({ inline: "start", behavior: "instant" });
  });
  await page.waitForTimeout(300);
  const before = await page.evaluate((expr) => ({
    scrollLeft: document.getElementById("pageViewContainer")?.scrollLeft,
    visibleAyah: eval(expr),
  }), visibleAyahScript());
  check(`${lang} precondition: the flow strip is genuinely scrolled to surah 1's own last āyah before the pick`, before.visibleAyah === "7", JSON.stringify(before));

  await setSurah(page, 2);

  const after = await page.evaluate((expr) => ({
    surah: document.getElementById("surahSelect")?.value,
    ayah: document.getElementById("ayahSelect")?.value,
    visibleAyah: eval(expr),
    rowCount: document.querySelectorAll(".page-flow-ayah").length,
  }), visibleAyahScript());
  check(`${lang} state moved to the new surah's own first āyah`, after.surah === "2" && after.ayah === "1", JSON.stringify(after));
  check(`${lang} GATE B: the flow strip is actually SCROLLED to surah 2's own āyah 1 (this is the fix)`, after.visibleAyah === "1", JSON.stringify(after));
  check(`${lang} the new surah's own flow rows actually rendered`, after.rowCount === 286, String(after.rowCount));

  const writes = await page.evaluate(() => (window.__fsLog || [])
    .filter((r) => /setDoc|updateDoc|batchCommit|txCommit/.test(r.kind)).length);
  check(`${lang} the whole surah pick writes nothing`, writes === 0, `writes=${writes}`);

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|ERR_FAILED|archive\.org|api\.quran\.com/.test(e));
  check(`${lang} no page errors across the surah pick`, real.length === 0, real.slice(0, 3).join(" | "));

  await ctx.close();
}

// ---------------------------------------------------------------------------
// 2) Same case, DESKTOP width -- the flow strip's own layout differs enough
//    by width (this project's own recurring lesson: measure at more than
//    one viewport) that the fix needs proving there too, not assumed from
//    the mobile case.
// ---------------------------------------------------------------------------
{
  console.log("\n=== surahSelect: Whole Surah flow retargets on a direct surah pick, desktop width ===");
  const ctx = await newContext(browser, { viewport: { width: 1100, height: 800 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openReadScreen(page);
  await setSurah(page, 2);
  await setUnitType(page, "surah");
  await page.evaluate(() => {
    document.querySelector('.page-flow-ayah[data-ayah="50"]')?.scrollIntoView({ inline: "start", behavior: "instant" });
  });
  await page.waitForTimeout(300);
  const before = await page.evaluate((expr) => ({ visibleAyah: eval(expr) }), visibleAyahScript());
  check("desktop precondition: scrolled well into surah 2", before.visibleAyah !== "1" && before.visibleAyah !== null, JSON.stringify(before));

  await setSurah(page, 1);
  const after = await page.evaluate((expr) => ({
    surah: document.getElementById("surahSelect")?.value,
    ayah: document.getElementById("ayahSelect")?.value,
    visibleAyah: eval(expr),
  }), visibleAyahScript());
  check("desktop state moved to surah 1's own āyah 1", after.surah === "1" && after.ayah === "1", JSON.stringify(after));
  check("desktop GATE B: the flow strip is actually SCROLLED to surah 1's own āyah 1", after.visibleAyah === "1", JSON.stringify(after));

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
  check("desktop no page errors", real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 3) Range unit, non-Mushaf: the window (1..5) stays valid in the new surah
//    too, isolating the scroll-retargeting fix from the separate,
//    deliberately-not-decided Range cross-surah content question (see the
//    file header).
// ---------------------------------------------------------------------------
{
  console.log("\n=== surahSelect: Range flow retargets on a direct surah pick (window stays valid in the new surah) ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openReadScreen(page);
  await setSurah(page, 1);
  await setUnitType(page, "range");
  await page.evaluate(() => {
    const f = document.getElementById("rangeFromSelect");
    if (f.querySelector('option[value="1"]')) { f.value = "1"; f.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const t = document.getElementById("rangeToSelect");
    if (t.querySelector('option[value="5"]')) { t.value = "5"; t.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    document.querySelector('.page-flow-ayah[data-ayah="5"]')?.scrollIntoView({ inline: "start", behavior: "instant" });
  });
  await page.waitForTimeout(300);
  const before = await page.evaluate((expr) => ({ visibleAyah: eval(expr) }), visibleAyahScript());
  check("precondition: scrolled to the range window's own last āyah", before.visibleAyah === "5", JSON.stringify(before));

  await setSurah(page, 2);
  const after = await page.evaluate((expr) => ({
    surah: document.getElementById("surahSelect")?.value,
    ayah: document.getElementById("ayahSelect")?.value,
    visibleAyah: eval(expr),
    rows: [...document.querySelectorAll(".page-flow-ayah")].map((r) => r.dataset.ayah),
  }), visibleAyahScript());
  check("state moved to surah 2, āyah 1", after.surah === "2" && after.ayah === "1", JSON.stringify(after));
  check("the window's own rows are the new surah's 1..5 (this fixture's window stays valid there)", after.rows.join(",") === "1,2,3,4,5", JSON.stringify(after));
  check("GATE B: the flow strip is actually SCROLLED to the new surah's own āyah 1", after.visibleAyah === "1", JSON.stringify(after));

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
  check("no page errors", real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 4) Mushaf mode, surahSelect change: HONESTLY RECORDED, not glossed over,
//    the same way quran-flow-step-nav.mjs's own case 5 records its Mushaf
//    case -- this passes EITHER WAY, fixed or reverted (verified by manual
//    revert-and-confirm, see the dated report), because
//    renderMushafPages()'s own `innerHTML = ""` step already resets
//    scrollLeft to 0 before painting the new surah's page(s), and a direct
//    surah pick always lands on the destination's own first āyah -- exactly
//    what a reset-to-0 container already shows. Kept as a real, passing
//    correctness/regression check, not overclaimed as GATE B proof.
// ---------------------------------------------------------------------------
const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/fonts/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";
const ORIGIN_MARKER = "TESTGLYPH-1-7";
const DEST_MARKER = "TESTGLYPH-2-1";
const SYNTHETIC_MUSHAF_DATA = {
  "3": [{ type: "ayah", words: [{ g: "TESTGLYPH-1-1", loc: "1:1:1" }] }],
  "4": [{ type: "ayah", words: [{ g: "TESTGLYPH-1-4", loc: "1:4:1" }] }],
  "5": [{ type: "ayah", words: [{ g: ORIGIN_MARKER, loc: "1:7:1" }] }],
  "45": [{ type: "ayah", words: [{ g: DEST_MARKER, loc: "2:1:1" }] }],
};
{
  console.log("\n=== surahSelect: Mushaf mode, direct surah pick (correctness; not gate-differentiating -- see file header) ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  await ctx.route(MUSHAF_JSON_URL, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNTHETIC_MUSHAF_DATA) }));
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (route) => route.abort("failed"));
  await ctx.route(SURAH_HEADER_FONT_URL, (route) => route.abort("failed"));
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openReadScreen(page);
  await setSurah(page, 1);
  await setUnitType(page, "surah");
  await page.evaluate(() => {
    const m = document.getElementById("mushafToggle");
    if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); }
  });

  const originRendered = await page.waitForFunction(
    (marker) => document.body.textContent.includes(marker),
    ORIGIN_MARKER,
    { timeout: 5000 },
  ).then(() => true).catch(() => false);
  check("precondition: surah 1's own synthetic Mushaf page(s) rendered", originRendered);

  if (originRendered) {
    await page.evaluate((marker) => {
      const spans = [...document.querySelectorAll(".hifz-word")].filter((s) => s.textContent === marker);
      spans[0]?.scrollIntoView({ inline: "start", behavior: "instant" });
    }, ORIGIN_MARKER);
    await page.waitForTimeout(300);
    const scrollBefore = await page.evaluate(() => document.getElementById("pageViewContainer")?.scrollLeft);
    check("precondition: scrolling within surah 1 genuinely moved scrollLeft away from 0", scrollBefore !== 0, String(scrollBefore));

    await setSurah(page, 2);

    const landed = await page.evaluate((marker) => {
      const spans = [...document.querySelectorAll(".hifz-word")].filter((s) => s.textContent === marker);
      if (!spans.length) return { found: false };
      const r = spans[0].getBoundingClientRect();
      const inViewport = r.top >= -2 && r.left >= -2 && r.bottom <= window.innerHeight + 2 && r.right <= window.innerWidth + 2;
      return { found: true, inViewport };
    }, DEST_MARKER);
    const surah = await page.evaluate(() => document.getElementById("surahSelect")?.value);
    check("state moved to surah 2", surah === "2", String(surah));
    check("the destination Mushaf page renders in view after a direct surah pick (correctness; not gate-differentiating -- see file header)", landed.inViewport === true, JSON.stringify(landed));
  }

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|ERR_FAILED|archive\.org|api\.quran\.com/.test(e));
  check("no page errors across the Mushaf-mode surah pick", real.length === 0, real.slice(0, 3).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 5) ayahSelect: proves the STRUCTURAL reason it needs no matching call --
//    it is only ever interactable while the flow strip is hidden, across
//    every unit type this app has, both languages. Not a claim from reading
//    the two `display` toggles; measured on the rendered page.
// ---------------------------------------------------------------------------
for (const lang of ["en", "bn"]) {
  console.log(`\n=== ayahSelect: never interactable while the flow strip is shown, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openReadScreen(page);
  await setSurah(page, 2);

  for (const unitType of ["ayah", "ruku", "surah", "range"]) {
    await setUnitType(page, unitType);
    const state = await page.evaluate(() => ({
      ayahSelectShown: getComputedStyle(document.getElementById("ayahSelectControl")).display !== "none",
      flowShown: getComputedStyle(document.getElementById("pageViewContainer")).display !== "none",
    }));
    check(`${lang} ${unitType}: ayahSelect and the flow strip are never BOTH visible at once`,
      !(state.ayahSelectShown && state.flowShown), JSON.stringify(state));
  }

  // Mushaf on top of a non-flow unit type also hides ayahSelect -- the
  // other half of unitRendersWhole()'s own condition.
  await setUnitType(page, "ruku");
  await page.evaluate(() => {
    const m = document.getElementById("mushafToggle");
    if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(500);
  const mushafState = await page.evaluate(() => ({
    ayahSelectShown: getComputedStyle(document.getElementById("ayahSelectControl")).display !== "none",
    flowShown: getComputedStyle(document.getElementById("pageViewContainer")).display !== "none",
  }));
  check(`${lang} Mushaf on a non-flow unit type also hides ayahSelect, not just Surah/Range`,
    !mushafState.ayahSelectShown && mushafState.flowShown, JSON.stringify(mushafState));

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|ERR_FAILED|archive\.org|api\.quran\.com/.test(e));
  check(`${lang} no page errors`, real.length === 0, real.slice(0, 3).join(" | "));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
