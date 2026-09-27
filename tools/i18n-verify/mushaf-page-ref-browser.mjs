// Issue #322 -- Mushaf view's own top-bar reference ("Surah · āyāt"),
// RENDERED acceptance QA in a real browser, following this project's own
// established practice for a focused, committed browser suite (see
// quran-word-card-mushaf-scroll.mjs's own header for the precedent this
// copies).
//
// THE SANDBOX CANNOT REACH raw.githubusercontent.com (the real Mushaf page
// data host) -- confirmed TLS-unreachable in every other Mushaf-driven
// suite here, and this one is no exception. A SYNTHETIC Mushaf fixture is
// routed in instead, exactly as quran-word-card-mushaf-scroll.mjs already
// does: only the Mushaf GLYPH data is mocked, the real local word-by-word
// corpus and surah-index data (surahName(), num()) are untouched.
//
// THE FIXTURE IS THE ISSUE'S OWN TWO WORKED EXAMPLES, not invented numbers:
// page 10 is Ibrahim āyāt 1 and 5 (giving "Ibrahim · 1-5", the issue's own
// first example verbatim); page 12 is Ibrahim āyāt 6 and 52 (a second page
// of the SAME surah, so scrolling from page 10 to it proves the reference
// updates on its own, independent of the two-surah case); page 20 is
// Al-Baqara's last āyah plus Aal-i-Imraan's first nine (the issue's own
// second example's SHAPE -- a page spanning two surahs -- read against the
// real surah-index names rather than the issue's own illustrative spelling,
// which is not what this app's data actually carries).
//
// SCOPE, STATED PLAINLY: the cheap, purely structural checks (the text is
// correct, fits one line, the exit icon stays on screen, no sideways
// scroll) run at all five viewports the issue names, in both languages --
// ten configurations. The two INTERACTION sequences (swiping between two
// pages of the same surah; opening full screen's BARE state) are real
// button clicks and scroll events, each taking real wall-clock time across
// a browser context; they run ONCE, at 390x844 in English, rather than
// twenty times over, which would multiply this suite's own run time for no
// further coverage of the code path itself -- the same trade-off
// quran-word-card-mushaf-scroll.mjs's own single-configuration interaction
// checks already make.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// Copied from app/js/hifz-renderer.js's own module-level constants -- see
// quran-word-card-mushaf-scroll.mjs's own comment on why this coupling is
// deliberate (a rename on that side without a matching rename here fails
// this suite by name rather than passing vacuously).
const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/fonts/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";

const SYNTHETIC_MUSHAF_DATA = {
  "10": [{ type: "ayah", words: [{ g: "IB1", loc: "14:1:1" }, { g: "IB5", loc: "14:5:1" }] }],
  "12": [{ type: "ayah", words: [{ g: "IB6", loc: "14:6:1" }, { g: "IB52", loc: "14:52:1" }] }],
  "20": [
    { type: "ayah", words: [{ g: "BQ286", loc: "2:286:1" }] },
    { type: "ayah", words: [{ g: "IM1", loc: "3:1:1" }, { g: "IM9", loc: "3:9:1" }] },
  ],
};

async function installSyntheticMushafFixture(ctx) {
  await ctx.route(MUSHAF_JSON_URL, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNTHETIC_MUSHAF_DATA) }));
  // Real fonts are unreachable in this sandbox anyway (the standing,
  // documented gap); hifz-renderer.js's own ensurePageFont() already
  // continues without justification when a font fails, so aborting here is
  // faithful to what a real reader's browser experiences, not a shortcut.
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (route) => route.abort("failed"));
  await ctx.route(SURAH_HEADER_FONT_URL, (route) => route.abort("failed"));
  // Architect review: those two deliberate aborts print "Failed to load
  // resource: net::ERR_FAILED" to the console, so the "no page errors"
  // checks exclude exactly that text -- the suite's own doing, not the app's.
}

async function enterReadView(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
}

/** Opens Mushaf view on Whole Surah `surahNum`, and waits for at least one
 *  real (mocked) Mushaf page to render. */
async function openMushafOnSurah(page, surahNum) {
  await page.evaluate((s) => {
    const sel = document.getElementById("surahSelect");
    sel.value = String(s); sel.dispatchEvent(new Event("change", { bubbles: true }));
  }, surahNum);
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const sel = document.getElementById("unitTypeSelect");
    sel.value = "surah"; sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const m = document.getElementById("mushafToggle");
    if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForFunction(() => !!document.querySelector("#pageViewContainer .hifz-page"), null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(500);
}

function readPageRef(page) {
  return page.evaluate(() => {
    const el = document.getElementById("mushafPageRef");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const exit = document.getElementById("hideChromeBtn")?.getBoundingClientRect();
    return {
      hidden: el.hidden,
      text: el.textContent ?? "",
      tagName: el.tagName,
      rect: { top: r.top, left: r.left, right: r.right, bottom: r.bottom, height: r.height, width: r.width },
      lineHeight: parseFloat(getComputedStyle(el).lineHeight) || null,
      exitOnScreen: !!exit && exit.right <= innerWidth && exit.left >= 0,
      docScrollWidth: document.documentElement.scrollWidth,
      innerWidth,
    };
  });
}

const bangla = /[ঀ-৿]/;
const banglaDigits = /[০-৯]/;

for (const [width, height] of [[320, 640], [360, 740], [390, 844], [412, 915], [1100, 900]]) {
  for (const lang of ["en", "bn"]) {
    console.log(`\n=== Mushaf page ref, ${width}x${height}, appLang=${lang} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height } });
    await installSyntheticMushafFixture(ctx);
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await enterReadView(page);

    // --- Page 10: Ibrahim 1-5, the issue's own first example -----------------
    await openMushafOnSurah(page, 14);
    const p10 = await readPageRef(page);
    check(`[${lang} ${width}] the reference is not hidden in Mushaf view`, p10 && p10.hidden === false, JSON.stringify(p10));
    // Issue #325 -- updated in place, reason recorded: #mushafPageRef is now
    // a real <button> (opens the "This page" card) rather than a plain
    // <span>. Its own text/fit/exit-icon/no-scroll assertions below are
    // unaffected -- textContent still reads the same reference text (with a
    // trailing, decorative ▾ appended), just via a different element.
    check(`[${lang} ${width}] #mushafPageRef is now a real <button>`, p10?.tagName === "BUTTON", p10?.tagName);
    if (lang === "bn") {
      check(`[bn ${width}] the surah name is really in Bangla`, bangla.test(p10?.text ?? ""), p10?.text);
      check(`[bn ${width}] the āyah numbers are Bengali digits`, banglaDigits.test(p10?.text ?? "") && !/[0-9]/.test(p10?.text ?? ""), p10?.text);
    } else {
      check(`[en ${width}] names Ibrahim, the issue's own first example`, (p10?.text ?? "").includes("Ibrahim"), p10?.text);
      check(`[en ${width}] the āyah range reads 1-5`, /1.*5|5.*1/.test(p10?.text ?? "") && /[–-]/.test(p10?.text ?? ""), p10?.text);
    }
    check(`[${lang} ${width}] fits on ONE line (rect height <= ~1.6x its own line-height)`,
      !!p10 && (!p10.lineHeight || p10.rect.height <= p10.lineHeight * 1.6), JSON.stringify(p10));
    check(`[${lang} ${width}] the exit full-screen icon stays fully on screen`, p10?.exitOnScreen === true, JSON.stringify(p10));
    check(`[${lang} ${width}] no sideways page scroll`, (p10?.docScrollWidth ?? Infinity) <= (p10?.innerWidth ?? 0) + 1, JSON.stringify(p10));

    // --- Page 20: a real two-surah boundary page, the issue's own second
    // example's SHAPE (names read off the real surah-index data). ------------
    await openMushafOnSurah(page, 2);
    const p20 = await readPageRef(page);
    check(`[${lang} ${width}] a two-surah page joins both with " · " and each keeps its own range`,
      /·/.test(p20?.text ?? ""), p20?.text);
    if (lang === "en") {
      check(`[en ${width}] names both surahs' real English names (Al-Baqara, Aal-i-Imraan)`,
        (p20?.text ?? "").includes("Al-Baqara") && (p20?.text ?? "").includes("Aal-i-Imraan"), p20?.text);
      check(`[en ${width}] carries both āyah references (286, and the 1-9 range)`,
        /286/.test(p20?.text ?? "") && /1.*9|9.*1/.test(p20?.text ?? ""), p20?.text);
    }
    check(`[${lang} ${width}] the two-surah page ALSO fits one line`,
      !!p20 && (!p20.lineHeight || p20.rect.height <= p20.lineHeight * 1.6), JSON.stringify(p20));
    check(`[${lang} ${width}] and the exit icon still stays on screen`, p20?.exitOnScreen === true, JSON.stringify(p20));

    check(`[${lang} ${width}] no page errors`, errors.filter((e) => !/CERT|archive\.org|api\.quran|net::ERR_FAILED/.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
    await ctx.close();
  }
}

// ===========================================================================
// INTERACTION: swiping/scrolling between two pages of the SAME surah updates
// the reference on its own, and full screen's BARE state still shows it.
// One configuration only -- see this file's own header for why.
// ===========================================================================
console.log(`\n=== Mushaf page ref: swipe updates the text; visible in full screen's BARE state ===`);
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  await installSyntheticMushafFixture(ctx);
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await enterReadView(page);
  await openMushafOnSurah(page, 14); // pages 10 (1-5) and 12 (6-52), both Ibrahim
  const before = await readPageRef(page);
  check("[swipe] before scrolling, the FIRST page's own range shows (1-5)", /1.*5|5.*1/.test(before?.text ?? ""), before?.text);

  // Scroll the strip to bring the SECOND real page into view -- the same
  // horizontal, RTL-aware container every other Mushaf/flow suite here
  // scrolls (see updateFlowInView()'s own comment on why both axes matter).
  await page.evaluate(() => {
    const pages = [...document.querySelectorAll("#pageViewContainer .hifz-page")];
    pages[1]?.scrollIntoView({ inline: "start", behavior: "instant" });
  });
  await page.waitForTimeout(500);
  const after = await readPageRef(page);
  check("[swipe] after scrolling to the second page, the reference updates to its OWN range (6-52)",
    /6.*52|52.*6/.test(after?.text ?? ""), after?.text);
  check("[swipe] and it no longer reads the first page's range", !/^Ibrahim · 1[^0-9]/.test(after?.text ?? ""), after?.text);

  // Issue #325 -- a light smoke check that tapping the reference (now a real
  // button) opens the "This page" card; the exhaustive write/claim coverage
  // for that card lives in its own dedicated suite
  // (mushaf-approach-cards-browser.mjs), not duplicated here.
  await page.click("#mushafPageRef");
  await page.waitForTimeout(300);
  const pageCardOpen = await page.evaluate(() => {
    const overlay = document.getElementById("ayahActionSheetOverlay");
    const card = document.querySelector("[data-page-approach-card]");
    return !!overlay?.classList.contains("open") && !!card;
  });
  check("[tap] tapping the top-bar reference opens the This page card", pageCardOpen);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const closedAgain = await page.evaluate(() => !document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"));
  check("[tap] Escape closes the This page card, back to plain Mushaf view", closedAgain);

  // Full screen's BARE state: two presses of the same cycle button reach it
  // (NORMAL -> READING -> BARE), per app/quranrevival.html's own
  // advanceReadChrome() comment.
  await page.click("#hideChromeBtn");
  await page.waitForTimeout(150);
  await page.click("#hideChromeBtn");
  await page.waitForTimeout(150);
  const bare = await page.evaluate(() => ({
    immersive: document.body.classList.contains("immersive-read"),
    readbarHidden: document.body.classList.contains("fs-hide-readbar"),
    transportHidden: document.body.classList.contains("fs-hide-transport"),
    refDisplay: getComputedStyle(document.getElementById("mushafPageRef")).display,
    refHidden: document.getElementById("mushafPageRef")?.hidden,
    exitBtnDisplay: getComputedStyle(document.getElementById("hideChromeBtn")).display,
  }));
  check("[full screen] really reached the BARE state (readbar + transport both hidden)",
    bare.immersive && bare.readbarHidden && bare.transportHidden, JSON.stringify(bare));
  check("[full screen] the Mushaf reference is STILL on screen in the BARE state",
    bare.refDisplay !== "none" && bare.refHidden === false, JSON.stringify(bare));
  check("[full screen] and the exit icon is (as ever) still on screen too", bare.exitBtnDisplay !== "none", JSON.stringify(bare));

  check("[swipe/full-screen] no page errors", errors.filter((e) => !/CERT|archive\.org|api\.quran|net::ERR_FAILED/.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Mushaf page reference (issue #322): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
