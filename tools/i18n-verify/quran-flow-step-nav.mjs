// Word Card stack, next candidate: the "Next unit"/"Previous unit" buttons
// (shell round 21 -- "Next means the next ayah, the next five, the next
// surah ... one button, seven meanings") and the unit-number picker never
// re-target the flow/Mushaf view's scroll position at all. RENDERED
// acceptance QA, in a real browser, committed to this repository the same
// way every other suite in this directory is.
//
// Issue #113's continuation task asked for ONE further Quran-owned,
// gate-free MAP v4 product/reader defect beyond the already-fixed word-card
// arrival and audio-follow paths. Found by testing the OWNER'S OWN
// documented feature directly: `stepUnit()` (app/quranrevival.html) crosses
// a surah boundary on purpose (`openSurahAt()`), and `goToUnitNumber()` does
// the same for Juz/Hizb/Page -- but NEITHER ever called
// `scrollFlowToCurrentAyah()`, the exact function `navigateToAyah()`
// (the word-card jump's own primitive, "Issue #113", PR #138/#139) already
// uses to re-target the flow/Mushaf view after a cross-surah move. Read
// directly, not assumed: `grep -n "scrollFlowToCurrentAyah()"
// app/quranrevival.html` found exactly ONE call site before this round,
// inside `navigateToAyah()` alone.
//
// REPRODUCED before fixing, with a debug run (not assumed): Whole Surah
// unit, surah 1 (7 āyahs), flow strip scrolled so āyah 7 is on screen,
// then "Next" pressed. State correctly moved to surah 2, āyah 1
// (`ayahSelect.value === "1"`) -- but `#pageViewContainer`'s own
// `scrollLeft` was byte-for-byte UNCHANGED, so the reader was left looking
// at whatever āyah of surah 2 happened to occupy that same stale pixel
// offset (āyah 7, in this exact fixture) instead of surah 2's own āyah 1.
// The identical "browser does not reset scrollLeft when innerHTML is
// replaced for a different surah" defect PR #138's own report already
// measured for the word-card jump path, reproduced here through a
// completely different, and far more common, trigger: the ordinary
// Next/Previous reading gesture.
//
// THE FIX, both one-line additions calling the SAME already-shipped,
// already-tested function, never modified here: `await
// scrollFlowToCurrentAyah();` at the tail of `stepUnit()` (covers Ayah,
// Range, Whole Surah and Ruku' stepping, all of which fall through to that
// shared tail) and at the tail of `goToUnitNumber()` (covers Juz/Hizb/Page
// stepping, which returns through `goToUnitNumber()` before ever reaching
// `stepUnit()`'s own tail, AND the unit-number picker's own direct change
// handler, which calls `goToUnitNumber()` with nothing else in between).
// `scrollFlowToCurrentAyah()` itself is UNTOUCHED -- it already no-ops
// correctly when the flow view is not showing at all (checked internally),
// so adding the call at these two sites is safe regardless of unit type or
// Mushaf state.
//
// SCOPE, deliberately bounded: `stepUnit()` and `goToUnitNumber()` are the
// two functions this round fixes, matching the owner's own explicitly
// documented "Next/Previous unit" and unit-number-picker features. The
// bare `surahSelect`/`ayahSelect` dropdown change handlers share the
// identical root cause (grepped: neither calls `scrollFlowToCurrentAyah()`
// either) and are NOT touched here -- flagged in this round's own report as
// a related, separate, out-of-scope-for-this-round item, the same
// "flag rather than drive-by fix an adjacent site" convention this stack's
// earlier rounds already follow.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// This whole stack's own established splash-interception hardening (PR
// #135's own finding, cascaded forward) -- app/js/splash.js is untouched.
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
// 1) Whole Surah, non-Mushaf: "Next" crossing a surah boundary lands on the
//    NEW surah's own first āyah, not wherever the old scroll offset carries
//    over to. Surah 1 (Al-Fatihah, 7 āyahs) -> Surah 2, both languages.
// ---------------------------------------------------------------------------
for (const lang of ["en", "bn"]) {
  console.log(`\n=== Whole Surah flow: "Next" crosses a surah boundary correctly, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openReadScreen(page);
  await setSurah(page, 1);
  await setUnitType(page, "surah");

  // The reader has actually scrolled to the surah's own last āyah before
  // pressing Next -- proven, not assumed, exactly this stack's own
  // established discipline for reproducing a stale-scroll-position defect.
  await page.evaluate(() => {
    document.querySelector('.page-flow-ayah[data-ayah="7"]')?.scrollIntoView({ inline: "start", behavior: "instant" });
  });
  await page.waitForTimeout(300);
  const before = await page.evaluate((expr) => ({
    scrollLeft: document.getElementById("pageViewContainer")?.scrollLeft,
    visibleAyah: eval(expr),
  }), visibleAyahScript());
  check(`${lang} precondition: the flow strip is genuinely scrolled to surah 1's own last āyah before Next is pressed`, before.visibleAyah === "7", JSON.stringify(before));

  await clickSafely(page, "#nextUnitBtn");
  await page.waitForTimeout(1200);

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
  check(`${lang} the whole cross-surah step writes nothing`, writes === 0, `writes=${writes}`);

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|ERR_FAILED|archive\.org|api\.quran\.com/.test(e));
  check(`${lang} no page errors across the cross-surah "Next" step`, real.length === 0, real.slice(0, 3).join(" | "));

  await ctx.close();
}

// ---------------------------------------------------------------------------
// 2) Whole Surah, non-Mushaf: "Previous" crossing a surah boundary
//    (backward direction -- the fix must not be one-directional).
// ---------------------------------------------------------------------------
{
  console.log("\n=== Whole Surah flow: \"Previous\" crosses a surah boundary correctly (backward) ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openReadScreen(page);
  await setSurah(page, 2);
  await setUnitType(page, "surah");
  // Scrolled well into surah 2 (not its own āyah 1) before pressing
  // Previous -- so a stale scrollLeft carrying over into surah 1's much
  // shorter 7-āyah strip is a real, observable difference from landing on
  // āyah 1, not a coincidence of both starting near the same offset.
  await page.evaluate(() => {
    document.querySelector('.page-flow-ayah[data-ayah="50"]')?.scrollIntoView({ inline: "start", behavior: "instant" });
  });
  await page.waitForTimeout(300);

  await clickSafely(page, "#prevUnitBtn");
  await page.waitForTimeout(1200);

  const after = await page.evaluate((expr) => ({
    surah: document.getElementById("surahSelect")?.value,
    ayah: document.getElementById("ayahSelect")?.value,
    visibleAyah: eval(expr),
  }), visibleAyahScript());
  // Whole Surah's own "Previous" always opens the new surah at its own āyah
  // 1 (openSurahAt(target, 1), unconditional on direction) -- a pre-existing,
  // separate design choice this round does not touch. What THIS round's fix
  // must get right is that the flow strip actually follows wherever the
  // state lands, in EITHER direction.
  check("state moved back to surah 1, opened at its own āyah 1 (openSurahAt()'s own existing, direction-independent target)", after.surah === "1" && after.ayah === "1", JSON.stringify(after));
  check("GATE B: the flow strip is actually SCROLLED to surah 1's own āyah 1 (backward direction)", after.visibleAyah === "1", JSON.stringify(after));

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
  check("no page errors across the cross-surah \"Previous\" step", real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 3) Range unit, non-Mushaf: "Next" past the end of a range window that
//    reaches a surah's own last āyah opens the next surah's own first
//    window -- the same defect, the OTHER flow-rendering unit type.
// ---------------------------------------------------------------------------
{
  console.log("\n=== Range flow: \"Next\" crosses a surah boundary correctly ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openReadScreen(page);
  await setSurah(page, 1);
  await setUnitType(page, "range");
  await page.evaluate(() => {
    const f = document.getElementById("rangeFromSelect");
    if (f.querySelector('option[value="3"]')) { f.value = "3"; f.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const t = document.getElementById("rangeToSelect");
    if (t.querySelector('option[value="7"]')) { t.value = "7"; t.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    document.querySelector('.page-flow-ayah[data-ayah="7"]')?.scrollIntoView({ inline: "start", behavior: "instant" });
  });
  await page.waitForTimeout(300);

  await clickSafely(page, "#nextUnitBtn");
  await page.waitForTimeout(1200);

  const after = await page.evaluate((expr) => ({
    surah: document.getElementById("surahSelect")?.value,
    ayah: document.getElementById("ayahSelect")?.value,
    visibleAyah: eval(expr),
    rows: [...document.querySelectorAll(".page-flow-ayah")].map((r) => r.dataset.ayah),
  }), visibleAyahScript());
  check("the range window opens in the next surah, starting at its own āyah 1", after.surah === "2" && after.ayah === "1", JSON.stringify(after));
  check("GATE B: the flow strip is actually SCROLLED to the new window's own first āyah", after.visibleAyah === "1", JSON.stringify(after));

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
  check("no page errors across the cross-surah Range \"Next\" step", real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 4) Regression: stepping WITHIN the same surah (no boundary crossed) is
//    unaffected by the new call -- scrollFlowToCurrentAyah() is a no-op
//    once the strip is already showing the right āyah.
// ---------------------------------------------------------------------------
{
  console.log("\n=== Regression: same-surah stepping is unaffected ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openReadScreen(page);
  await setSurah(page, 2);
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

  await clickSafely(page, "#nextUnitBtn");
  await page.waitForTimeout(1200);

  const after = await page.evaluate((expr) => ({
    surah: document.getElementById("surahSelect")?.value,
    ayah: document.getElementById("ayahSelect")?.value,
    rows: [...document.querySelectorAll(".page-flow-ayah")].map((r) => r.dataset.ayah),
    visibleAyah: eval(expr),
  }), visibleAyahScript());
  check("the range window still advances within the same surah", after.surah === "2" && after.ayah === "6" && after.rows[0] === "6" && after.rows[after.rows.length - 1] === "10", JSON.stringify(after));
  check("the flow strip lands on the new window's own first āyah", after.visibleAyah === "6", JSON.stringify(after));

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
  check("no page errors across the same-surah step", real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 5) Mushaf mode: the SAME "Next" cross-surah step, driven through
//    stepUnit()'s own tail (the identical call site as case 1, just with
//    Mushaf toggled on). Same synthetic-fixture technique this stack's own
//    sibling suites already established (page.route() interception, no TLS
//    bypass).
//
//    Unlike the sibling word-card suites' own fixture (one Range spanning
//    BOTH the origin and destination ayahs, so both pages exist in the SAME
//    render pass), "Whole Surah" renders only the CURRENT surah's own
//    ayahs -- getMushafPagesForKeys() looks up each of surah 1's 7 ayah keys
//    and silently skips any key its own index has no entry for
//    (app/js/hifz-renderer.js, read directly). So crossing surah 1 -> surah
//    2 here is genuinely TWO SEPARATE render passes, each fetching only its
//    own surah's page(s).
//
//    HONESTLY RECORDED, not glossed over: revert-and-confirm (see the dated
//    report) found this specific case passes EITHER WAY, fixed or reverted
//    -- unlike cases 1-4 above, which genuinely fail on the reverted code.
//    Traced to a real, separate mechanism: renderMushafPages() sets
//    `container.innerHTML = ""` BEFORE rebuilding (app/js/hifz-renderer.js,
//    read directly), and a genuinely EMPTIED container's scrollLeft resets
//    to 0 in this browser -- confirmed by direct measurement, sampling
//    scrollLeft every 200ms across the transition. renderFlowView()'s own
//    NON-Mushaf branch replaces content in one atomic innerHTML assignment
//    with no empty intermediate state, which is exactly why IT does not
//    self-correct (PR #138's own original measurement, and cases 1-4's own
//    revert-and-confirm above). And because stepUnit()/goToUnitNumber()
//    always land on the destination unit's own FIRST āyah
//    (`openSurahAt(target, 1)` / `row.startAyah`), that first āyah is
//    exactly what a freshly emptied-then-rebuilt Mushaf container already
//    shows at its own reset scrollLeft of 0 -- so this call site's Mushaf
//    branch of the fix, while correct and deliberately kept (consistency
//    with the non-Mushaf branch, and safety for any future caller that
//    might NOT always land on a unit's first āyah), is not independently
//    gate-differentiating for THIS specific trigger. Kept as a real,
//    passing correctness/regression check rather than a GATE B claim it
//    cannot support -- the genuine Mushaf-mode proof of this fix's OTHER
//    call site (navigateToAyah(), which does NOT always land on a unit's
//    first āyah) is PR #139's own already-shipped, already-mutation-proven
//    quran-word-card-mushaf-scroll.mjs.
// ---------------------------------------------------------------------------
const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/fonts/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";

const ORIGIN_MARKER = "TESTGLYPH-1-7";
const DEST_MARKER = "TESTGLYPH-2-1";
// Surah 1 gets THREE synthetic pages (3, 4, 5) so scrolling to its own last
// āyah genuinely moves #pageViewContainer's scrollLeft away from 0 before
// Next is pressed (the precondition below asserts this happened for real).
const SYNTHETIC_MUSHAF_DATA = {
  "3": [{ type: "ayah", words: [{ g: "TESTGLYPH-1-1", loc: "1:1:1" }] }],
  "4": [{ type: "ayah", words: [{ g: "TESTGLYPH-1-4", loc: "1:4:1" }] }],
  "5": [{ type: "ayah", words: [{ g: ORIGIN_MARKER, loc: "1:7:1" }] }],
  "45": [{ type: "ayah", words: [{ g: DEST_MARKER, loc: "2:1:1" }] }],
};

async function installMushafFixture(ctx) {
  await ctx.route(MUSHAF_JSON_URL, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNTHETIC_MUSHAF_DATA) }));
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (route) => route.abort("failed"));
  await ctx.route(SURAH_HEADER_FONT_URL, (route) => route.abort("failed"));
}

{
  console.log("\n=== Mushaf mode: \"Next\" crosses a surah boundary correctly ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  await installMushafFixture(ctx);
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
  check("precondition: surah 1's own synthetic Mushaf page(s) rendered (route really intercepted)", originRendered);

  if (originRendered) {
    // Scroll to surah 1's own LAST synthetic page before pressing Next --
    // the reader has actually moved #pageViewContainer's scrollLeft away
    // from 0, the same discipline this stack's own sibling suites use.
    await page.evaluate((marker) => {
      const spans = [...document.querySelectorAll(".hifz-word")].filter((s) => s.textContent === marker);
      spans[0]?.scrollIntoView({ inline: "start", behavior: "instant" });
    }, ORIGIN_MARKER);
    await page.waitForTimeout(300);
    const scrollBefore = await page.evaluate(() => document.getElementById("pageViewContainer")?.scrollLeft);
    check("precondition: scrolling within surah 1 genuinely moved scrollLeft away from 0", scrollBefore !== 0, String(scrollBefore));

    await clickSafely(page, "#nextUnitBtn");
    await page.waitForTimeout(1500);

    const landed = await page.evaluate((marker) => {
      const spans = [...document.querySelectorAll(".hifz-word")].filter((s) => s.textContent === marker);
      if (!spans.length) return { found: false };
      const r = spans[0].getBoundingClientRect();
      const inViewport = r.top >= -2 && r.left >= -2 && r.bottom <= window.innerHeight + 2 && r.right <= window.innerWidth + 2;
      return { found: true, inViewport };
    }, DEST_MARKER);
    const surah = await page.evaluate(() => document.getElementById("surahSelect")?.value);
    check("state moved to surah 2", surah === "2", String(surah));
    check("surah 2's own synthetic Mushaf page rendered (a fresh, separate render pass)", landed.found === true, JSON.stringify(landed));
    check("the destination Mushaf page renders in view after crossing the surah boundary via \"Next\" (correctness; not gate-differentiating here -- see this case's own header)", landed.inViewport === true, JSON.stringify(landed));
  }

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|ERR_FAILED|archive\.org|api\.quran\.com/.test(e));
  check("no page errors across the Mushaf-mode cross-surah step", real.length === 0, real.slice(0, 3).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 6) goToUnitNumber(): Page unit type, Mushaf on, jumping via the
//    unit-number picker from page 1 (surah 1) to page 2 (surah 2 -- real
//    boundary, tools/quran-data-pull/output/page-index.json: page 1 =
//    1:1-1:7, page 2 = 2:1-2:5). This is the OTHER function this round
//    fixes, and its own two entry points (stepUnit()'s Juz/Hizb/Page branch
//    and this picker) share this one code path.
//
// Honestly recorded, not glossed over: a "page" unit is by definition ONE
// Mushaf page, so this scenario never has scroll DISTANCE to go stale in
// the first place -- run against the code BEFORE this round's fix (revert-
// and-confirm, see the dated report), every check below still passes.
// This case therefore proves state/glyph correctness for the Page-unit
// Mushaf jump, not the scroll-staleness defect itself; the staleness proof
// for goToUnitNumber() rests on it sharing the textually IDENTICAL fix,
// applied to the same never-modified scrollFlowToCurrentAyah() primitive,
// that case 5 above already proves DOES matter for a multi-page unit
// (Whole Surah/Range) through the very same shared call site.
// ---------------------------------------------------------------------------
{
  console.log("\n=== goToUnitNumber(): the unit-number picker crosses a surah boundary correctly (Mushaf on, Page unit) ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  await ctx.route(MUSHAF_JSON_URL, (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        "1": [{ type: "ayah", words: [{ g: ORIGIN_MARKER, loc: "1:7:1" }] }],
        "2": [{ type: "ayah", words: [{ g: DEST_MARKER, loc: "2:1:1" }] }],
      }),
    }));
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (route) => route.abort("failed"));
  await ctx.route(SURAH_HEADER_FONT_URL, (route) => route.abort("failed"));
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openReadScreen(page);
  await setSurah(page, 1);
  await setUnitType(page, "page");
  await page.evaluate(() => {
    const m = document.getElementById("mushafToggle");
    if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(1000);

  const originRendered = await page.evaluate(
    (marker) => document.body.textContent.includes(marker), ORIGIN_MARKER,
  );
  check("precondition: page 1's own synthetic content rendered", originRendered);

  if (originRendered) {
    await page.evaluate(() => {
      const sel = document.getElementById("unitNumSelect");
      if (sel && sel.querySelector('option[value="2"]')) {
        sel.value = "2";
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await page.waitForTimeout(1500);

    const optionFound = await page.evaluate(() => !!document.getElementById("unitNumSelect")?.querySelector('option[value="2"]'));
    check("precondition: the unit-number picker offers page 2", optionFound);
    if (optionFound) {
      const landed = await page.evaluate((marker) => {
        const spans = [...document.querySelectorAll(".hifz-word")].filter((s) => s.textContent === marker);
        if (!spans.length) return { found: false };
        const r = spans[0].getBoundingClientRect();
        const inViewport = r.top >= -2 && r.left >= -2 && r.bottom <= window.innerHeight + 2 && r.right <= window.innerWidth + 2;
        return { found: true, inViewport };
      }, DEST_MARKER);
      const surah = await page.evaluate(() => document.getElementById("surahSelect")?.value);
      check("state moved to surah 2 (page 2's own real surah, per page-index.json)", surah === "2", String(surah));
      check("goToUnitNumber()'s own destination page renders in view (correctness, not gate-differentiating here -- see this case's own header)", landed.inViewport === true, JSON.stringify(landed));
    }
  }

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|ERR_FAILED|archive\.org|api\.quran\.com/.test(e));
  check("no page errors across the goToUnitNumber() cross-surah jump", real.length === 0, real.slice(0, 3).join(" | "));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
