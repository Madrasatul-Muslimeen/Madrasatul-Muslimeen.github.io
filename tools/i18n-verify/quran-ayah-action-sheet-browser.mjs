// Issue #286 -- "This āyah" action sheet, RENDERED acceptance QA in a real
// browser, following this project's own established practice for a focused,
// committed browser suite (the same convention quran-word-card-mushaf-
// scroll.mjs already uses, including its synthetic Mushaf-page fixture
// shape). Written here, NOT run here -- this sandbox has no Playwright
// browser binaries installed, the same documented, repeated environment gap
// CLAUDE.md records for every browser-driven suite in this directory. The
// Architect/CI should run this for real before it is trusted.
//
// SCOPE OF THIS ROUND'S OWN BROWSER SUITE, stated rather than implied: it
// covers the two new ENTRY POINTS (the Mushaf marker tap, the Word Card's
// own "This āyah ⋯" button) and the marker's own hit-test/layout claims --
// the part of the spec this sandbox's own pure-node suite
// (ayah-action-sheet-boundary.mjs) cannot see, because opening the sheet and
// reading its rendered position needs a real DOM and a real click. The
// "File in folder(s)…" round trip (create-a-Note-then-file-it, untick
// retires, a second filing reuses the Note) is deliberately NOT covered by
// THIS suite -- it needs the Note Foundation's own stub write-path seeded
// and driven through several round trips, which this round's own budget did
// not stretch to verifying blind, unrunnable in this sandbox. Flagged as
// the next incremental push, not silently skipped.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

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

// Copied from app/js/hifz-renderer.js's own module-level constants -- the
// coupling is deliberate and closed by the "fixture really intercepted"
// precondition check below (fails by name if the route is never hit).
const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/fonts/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";

// hifz-renderer.js's own ayahMaxWordPosition is the HIGHEST w.loc position
// recorded for an ayah; the span AT that position is the marker (issue
// #286), every position BELOW it is a real, tappable word. So the fixture
// needs at least two positions per ayah to make the two spans (word vs.
// marker) distinguishable at all -- one real word at position 1, the marker
// at position 2.
const MARKER_GLYPH = "TESTGLYPH-2-71-MARKER";
const SYNTHETIC_MUSHAF_DATA = {
  "3": [{ type: "ayah", words: [
    { g: "TESTGLYPH-2-71-WORD1", loc: "2:71:1" },
    { g: MARKER_GLYPH, loc: "2:71:2" },
  ] }],
};

async function installSyntheticMushafFixture(ctx) {
  await ctx.route(MUSHAF_JSON_URL, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNTHETIC_MUSHAF_DATA) });
  });
  // Deliberately fails, exactly as this sandbox's own genuine TLS failure
  // against the real host does -- hifz-renderer.js's own ensurePageFont()
  // already catches this and continues without justification (proven by
  // every other Mushaf suite in this directory, not assumed here).
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (route) => route.abort("failed"));
  await ctx.route(SURAH_HEADER_FONT_URL, (route) => route.abort("failed"));
}

/** Navigates to the Read screen, surah 2, and switches Mushaf page view on -- the same picker sequence quran-word-card-mushaf-scroll.mjs already proved reliable. */
async function openMushafSurah2(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await clickSafely(page, "#tabStudyBtn"); await page.waitForTimeout(150); }
  await clickSafely(page, "#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { const sel = document.getElementById("unitTypeSelect"); sel.value = "surah"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const m = document.getElementById("mushafToggle");
    if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(400);
}

for (const viewport of [{ width: 390, height: 844, label: "mobile 390x844" }, { width: 1100, height: 800, label: "desktop 1100x800" }]) {
  for (const lang of ["en", "bn"]) {
    console.log(`\n=== "This āyah" action sheet, appLang=${lang}, ${viewport.label} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width: viewport.width, height: viewport.height } });
    await installSyntheticMushafFixture(ctx);
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await openMushafSurah2(page);

    const settled = await page.waitForFunction(
      (marker) => !!document.querySelector(".hifz-page") && document.body.textContent.includes(marker),
      MARKER_GLYPH,
      { timeout: 5000 },
    ).then(() => true).catch(() => false);
    check(`${lang} ${viewport.label} precondition: the synthetic Mushaf page rendered (route really intercepted)`, settled);
    if (!settled) continue;

    // --- (a) tapping the āyah-end marker opens the sheet for the right āyah
    const markerHandle = await page.$('[data-ayah-marker="2:71"]');
    check(`${lang} ${viewport.label} the marker span exists and carries data-ayah-marker="2:71"`, !!markerHandle);
    if (markerHandle) {
      const box = await markerHandle.boundingBox();
      check(`${lang} ${viewport.label} the marker's own padded tap area is at least 40x40`,
        !!box && box.width >= 40 && box.height >= 40, box ? `got ${box.width}x${box.height}` : "no bounding box");

      // Hit-test: the browser's own topmost-element-at-point, not merely
      // "present in the DOM" (the same class of check journey-map-screen.mjs
      // uses for its own ⋯ menu, and for the identical reason: a control
      // that exists but sits BEHIND something else is not really tappable).
      const hit = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return el ? { insideMarker: !!el.closest("[data-ayah-marker]") } : null;
      }, [box.x + box.width / 2, box.y + box.height / 2]);
      check(`${lang} ${viewport.label} the marker is hit-testable: elementFromPoint() at its own centre lands on it`, !!hit && hit.insideMarker);

      await clickSafely(page, '[data-ayah-marker="2:71"]');
      await page.waitForTimeout(300);
      const sheetOpen = await page.evaluate(() => {
        const overlay = document.getElementById("ayahActionSheetOverlay");
        const sheet = document.querySelector("[data-ayah-sheet]");
        return !!overlay?.classList.contains("open") && sheet?.dataset.unitKey === "ayah:2:71";
      });
      check(`${lang} ${viewport.label} tapping the marker opens the sheet, scoped to ayah:2:71`, sheetOpen);

      const noSidewaysScroll = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
      check(`${lang} ${viewport.label} the open sheet causes no sideways page scroll`, noSidewaysScroll);

      // Escape closes it.
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      const closedByEscape = await page.evaluate(() => !document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"));
      check(`${lang} ${viewport.label} Escape closes the sheet`, closedByEscape);
    }

    // --- (b) the Word Card's own "This āyah ⋯" opens it for the word's āyah
    await clickSafely(page, '#readView [data-word-occurrence$=":2:71:1"]');
    await page.waitForTimeout(600);
    const wordCardOpen = await page.evaluate(() => !!document.querySelector("#quranWordCardMount .quran-word-card"));
    check(`${lang} ${viewport.label} precondition: the Word Card opened from the real word span`, wordCardOpen);
    if (wordCardOpen) {
      const ayahActionBtn = await page.$('[data-word-card-ayah-action]');
      check(`${lang} ${viewport.label} the Word Card carries a "This āyah ⋯" button`, !!ayahActionBtn);
      if (ayahActionBtn) {
        await clickSafely(page, '[data-word-card-ayah-action]');
        await page.waitForTimeout(300);
        const sheetFromCard = await page.evaluate(() => {
          const overlay = document.getElementById("ayahActionSheetOverlay");
          const sheet = document.querySelector("[data-ayah-sheet]");
          return !!overlay?.classList.contains("open") && sheet?.dataset.unitKey === "ayah:2:71";
        });
        check(`${lang} ${viewport.label} the Word Card's "This āyah ⋯" opens the sheet for the word's own āyah`, sheetFromCard);
      }
    }

    // --- Word taps still open the Word Card (regression guard for THIS suite's own fixture -- the full regression suites are quran-word-card*.mjs / quran-mushaf-*.mjs, run separately).
    const real = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID)/.test(e));
    check(`${lang} ${viewport.label} no unexpected page errors`, real.length === 0, real.join("; "));

    await page.close();
  }
}

await browser.close();
console.log(`\n==== "This āyah" action sheet -- Mushaf marker + Word Card entry points (issue #286): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
