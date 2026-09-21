// Word Card -- Mushaf-mode cross-surah occurrence arrival. RENDERED
// acceptance QA, in a real browser, following this project's own established
// practice for a focused un-checked-in script.
//
// Issue #113's own next-named candidate, per PR #139's own report: "restructure
// scrollFlowToCurrentAyah()'s Mushaf branch to await the real render". PR #138
// closed the equivalent gap in the ORDINARY (non-Mushaf) flow view -- a raw
// pixel `scrollLeft` surviving a surah change -- and left Mushaf mode
// untouched, because hifz-renderer.js's word spans have no ayah-identifying
// attribute for `.page-flow-ayah[data-ayah]`-style targeting AND this
// sandbox cannot reach the real Mushaf page data at all
// (raw.githubusercontent.com -- confirmed TLS-unreachable, `ERR_CERT_
// AUTHORITY_INVALID` in a real browser, `curl` succeeds against the same
// host trusting this sandbox's own CA bundle -- so the sandbox's OWN network
// policy is what refuses it, not a real certificate problem, and
// `--ignore-certificate-errors` stays off the table per this project's own
// standing rule).
//
// GATE A, reproduced by READING first (see the dated report for the full
// account), then confirmed here by measurement: hifz-renderer.js in fact
// DOES keep a per-ayah registry (`wordRegistry`, keyed exactly like the
// non-Mushaf branch's own `data-ayah`) -- what actually blocks a scroll is
// TIMING, not a missing primitive. renderStudyScreen() fires the Mushaf
// branch's `renderFlowView(...)` (async: ensureMushafData() + a PER-PAGE
// font load + line justification inside renderMushafPages()) without
// awaiting it -- correctly, since renderStudyScreen() is synchronous and has
// ~24 call sites that never need to know when a Mushaf page settles -- and
// the word-card jump's own navigateToAyah() used to call
// scrollFlowToCurrentAyah() on the very next line. Before this round that
// function's Mushaf branch was a permanent, deliberate no-op (see PR #135's
// own comment); this suite is written against the fix
// (app/quranrevival.html's `flowRenderPromise` + the awaited
// scrollFlowToCurrentAyah(), and app/js/hifz-renderer.js's new
// `scrollToAyahIfRendered()` export -- both marked "Issue #113").
//
// THE FIXTURE: `page.route()` intercepts the THREE real network calls
// hifz-renderer.js makes (the page-layout JSON, the per-page glyph fonts,
// the surah-header font) and serves a small SYNTHETIC two-page Mushaf --
// page 3 carrying the origin āyah (2:71) and page 45 carrying the
// cross-surah destination (4:92:17, the same lemma-linked occurrence
// quran-word-card-flow-nav.mjs already proves exists on the REAL local
// word-index data, which is untouched by this mock -- only the Mushaf GLYPH
// data is remote/mocked). No TLS verification is bypassed anywhere: nothing
// here changes how Playwright or the browser negotiates TLS, `page.route()`
// simply answers the request before it ever leaves the browser's own
// network stack. The font route is deliberately DELAYED (not merely slow --
// genuinely paced, 300ms) before it fails, which is what turns "the render
// is asynchronous" into a WIDE, RELIABLY SAMPLEABLE window for a test to
// look inside -- without that delay a fast local mock could resolve inside a
// single microtask tick and the race would be un-observable even though it
// is real (the same class of trap this project's own harness notes call out
// for a stub that "answers INSTANTLY").
//
// Every essential precondition below is a NAMED, FAILING check() -- never a
// silent SKIP -- per the correction issue #113's own task explicitly asked
// this stack's other suites to make (see quran-word-card-note-origin-
// return.mjs's own dated correction).
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// PR #135's own finding, carried into every suite in this stack since:
// showBootSplash()/showQuranSplash() sit on screen for up to 14s and
// harness.mjs's own "mm_qs_splash_pref = never" convention does not
// actually suppress it (app/js/splash.js's shouldShow() has no "never"
// branch -- a real, separate, out-of-scope finding, flagged not fixed).
//
// A ONE-SHOT removal is not enough, and this suite is what found the reason
// (read from app/js/splash.js, not assumed): showBootSplash() chains into
// showQuranSplash() through an `onDone` callback fired from setTimeout()s
// scheduled inside the FIRST splash's own closure -- timers that keep
// running even after their overlay element has been removed from the DOM,
// because removing an element does not cancel a pending timer holding a
// reference to it. So a SECOND, brand-new overlay (the ~14.5s Quran-brand
// one) can still appear several seconds after an earlier removal, and under
// real load (this suite opens ~9 browser contexts in one run) the exact
// timing shifts enough that a single removal-then-click can still lose the
// race. Retried rather than assumed safe: each attempt removes whatever
// overlay exists RIGHT BEFORE that attempt's own click, so a freshly
// re-appeared overlay is caught too. Still not app/js/splash.js's to fix
// here -- out of this task's scope, an unrelated application-behaviour
// change -- and still never silently swallowed: if every attempt fails, the
// real error propagates, exactly as an un-retried click would.
async function clickSafely(page, selector, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    await page.evaluate(() => {
      document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove());
    });
    try {
      await page.click(selector, { timeout: 4000 });
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

// Copied from app/js/hifz-renderer.js's own module-level constants -- these
// three strings ARE the coupling between this fixture and the real module,
// and a rename on that side without a matching rename here would make every
// route below miss silently. Closed by the "origin's own Mushaf page
// rendered from the SYNTHETIC fixture" check below, which fails by name
// (not merely passes vacuously) if the mock is never hit.
const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/fonts/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";

const ORIGIN_MARKER = "TESTGLYPH-2-71";
const DEST_MARKER = "TESTGLYPH-4-92";
// The LAST page in render order (44 -> 45 -> 46), named so a caller can wait
// for the WHOLE destination render -- not merely the marker's own page --
// before reading scroll state. Real defect this closed, found by this
// round's own revert-and-confirm step: `renderMushafPages()` renders pages
// SEQUENTIALLY and `scrollToAyahIfRendered()` only runs once the render's
// own promise resolves, i.e. after ALL THREE pages, but DEST_MARKER (on the
// MIDDLE page) appears in the DOM as soon as page 45 alone is done --
// earlier than that. A wait keyed only on DEST_MARKER let this suite read
// scroll state in the genuine gap between "the middle page exists" and "the
// fix's own scroll call has actually run", reporting a false GATE B failure
// against CORRECTLY FIXED code. Waiting for the LAST page's own marker
// closes that gap without weakening what GATE B itself asserts.
const LAST_PAGE_MARKER = "TESTGLYPH-4-176-FILLER";
const JSON_DELAY_MS = 250;
const FONT_DELAY_MS = 300;

// THE DESTINATION SURAH DELIBERATELY SPANS THREE PAGES, NOT ONE, and getting
// this wrong is what made an early version of this suite's own GATE B check
// PASS VACUOUSLY against the UNFIXED code (found by the revert-and-confirm
// step this task itself requires -- not by reasoning about it in advance).
// `body.read-sideways #pageViewContainer > *` gives every rendered page
// `flex: 0 0 100%` -- so with only ONE page in the container, that page is
// the whole scrollable width and is "in view" the instant it exists,
// scrolled to or not; a scroll assertion against a single-page render can
// never fail. Surah 4 here spans pages 44/45/46 (44 and 46 carry an
// unrelated filler word so `getMushafPagesForKeys()` returns all three), with
// the destination āyah (4:92) on the MIDDLE one -- so a render that never
// scrolls leaves whichever page the browser defaults to (44, the first in
// DOM order) in view, and 45 genuinely is not, giving GATE B somewhere real
// to fail. The origin surah (2:71, page 3) stays single-page: nothing here
// asserts a SCROLL happened on the origin's own arrival, only that its
// content exists to set up the round trip.
const SYNTHETIC_MUSHAF_DATA = {
  "3": [{ type: "ayah", words: [
    { g: ORIGIN_MARKER, loc: "2:71:13" },
  ] }],
  "44": [{ type: "ayah", words: [
    { g: "TESTGLYPH-4-1-FILLER", loc: "4:1:1" },
  ] }],
  "45": [{ type: "ayah", words: [
    { g: DEST_MARKER, loc: "4:92:17" },
  ] }],
  "46": [{ type: "ayah", words: [
    { g: LAST_PAGE_MARKER, loc: "4:176:1" },
  ] }],
};

async function installSyntheticMushafFixture(ctx) {
  let jsonRequests = 0, fontRequests = 0;
  await ctx.route(MUSHAF_JSON_URL, async (route) => {
    jsonRequests++;
    await new Promise((r) => setTimeout(r, JSON_DELAY_MS));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNTHETIC_MUSHAF_DATA) });
  });
  await ctx.route(`${MUSHAF_FONT_BASE}**`, async (route) => {
    fontRequests++;
    // Deliberately fails (not a valid font), after a real delay -- exactly
    // what this sandbox's own genuine TLS failure against the real host
    // does, paced wide enough to sample reliably (see the module header).
    // hifz-renderer.js's own ensurePageFont() already catches this and
    // continues without justification -- proven, not assumed, by the
    // existing MAP suites' own baseline against the real unreachable host.
    await new Promise((r) => setTimeout(r, FONT_DELAY_MS));
    await route.abort("failed");
  });
  await ctx.route(SURAH_HEADER_FONT_URL, (route) => route.abort("failed"));
  return { counts: () => ({ jsonRequests, fontRequests }) };
}

/** Surah 2 āyah 71, word position 13, root سلم -- the same proven fixture
 *  quran-word-card-return.mjs and quran-word-card-flow-nav.mjs both use,
 *  known to carry a lemma occurrence at 4:92:17 in a DIFFERENT surah. Opens
 *  the word card from the ORDINARY (non-Mushaf) render, because
 *  hifz-renderer.js's own words carry no data-word-occurrence attribute --
 *  a reader can never open a card from inside Mushaf content itself; Mushaf
 *  is switched on AFTER, while the card stays open as a persistent overlay
 *  (renderPersistentWordCard() is not gated on usesFlow). */
async function openFixtureWordThenEnableMushaf(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await clickSafely(page, "#tabStudyBtn"); await page.waitForTimeout(150); }
  await clickSafely(page, "#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const t = document.getElementById("wbwShowToggle");
    if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const s = document.getElementById("ayahSelect"); if (s.querySelector('option[value="71"]')) { s.value = "71"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(1000);
  await page.evaluate(() => { const sel = document.getElementById("unitTypeSelect"); sel.value = "surah"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { document.querySelector('.page-flow-ayah[data-ayah="71"]')?.scrollIntoView({ inline: "start", behavior: "instant" }); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { document.querySelector('#readView [data-word-occurrence$=":2:71:13"]')?.click(); });
  await page.waitForTimeout(1000);
  await clickSafely(page, '#quranWordCardMount [data-word-card-level="basic"]').catch(() => {});
  await page.waitForTimeout(2500);
  await clickSafely(page, "[data-word-lemma-toggle]").catch(() => {});
  await page.waitForTimeout(2000);

  // NOW turn Mushaf on -- the card stays open, floating over whatever the
  // underlying view renders.
  await page.evaluate(() => {
    const m = document.getElementById("mushafToggle");
    if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); }
  });
}

for (const viewport of [{ width: 390, height: 844, label: "mobile 390x844" }, { width: 1100, height: 800, label: "desktop 1100x800" }]) {
  for (const lang of ["en", "bn"]) {
    console.log(`\n=== Mushaf cross-surah word-card arrival, appLang=${lang}, ${viewport.label} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width: viewport.width, height: viewport.height } });
    const fixture = await installSyntheticMushafFixture(ctx);
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");

    await openFixtureWordThenEnableMushaf(page);

    // The origin's own Mushaf render: wait for the synthetic page 3 to
    // settle (JSON delay + font delay), bounded rather than guessed --
    // waitForFunction polls a real DOM state, not a fixed sleep.
    const originSettled = await page.waitForFunction(
      (marker) => !!document.querySelector(".hifz-page") && document.body.textContent.includes(marker),
      ORIGIN_MARKER,
      { timeout: 5000 },
    ).then(() => true).catch(() => false);
    check(`${lang} ${viewport.label} precondition: the origin's own Mushaf page rendered from the SYNTHETIC fixture (route really intercepted)`, originSettled);
    if (!originSettled) { await ctx.close(); continue; }

    const lemmaTarget = await page.evaluate(() => {
      const links = [...document.querySelectorAll("[data-word-occurrence-goto]")];
      return links.find((l) => l.getAttribute("data-word-occurrence-goto") === "4:92:17")
        ?.getAttribute("data-word-occurrence-goto") ?? null;
    });
    check(`${lang} ${viewport.label} precondition: the lemma list still carries the 4:92:17 cross-surah occurrence`, lemmaTarget === "4:92:17", String(lemmaTarget));
    if (lemmaTarget !== "4:92:17") { await ctx.close(); continue; }

    const beforeCounts = fixture.counts();

    // Click the occurrence link INSIDE the still-open word card (Mushaf's
    // own page content has no clickable occurrence spans at all).
    await page.evaluate(() => {
      const links = [...document.querySelectorAll("[data-word-occurrence-goto]")];
      links.find((l) => l.getAttribute("data-word-occurrence-goto") === "4:92:17")?.click();
    });

    // ---- GATE A: sample INSIDE the async render's own delay window. -----
    // navigateToAyah()'s own state mutations (surahSelect/ayahSelect,
    // stageView) run BEFORE the async Mushaf render even starts; the
    // destination's own words cannot exist in the DOM until renderPage()
    // finishes appending them, which this fixture deliberately holds open
    // for >= FONT_DELAY_MS. Sampled well inside that window (80ms, against
    // a >=300ms gap) rather than at a guessed instant.
    await page.waitForTimeout(80);
    const midFlight = await page.evaluate((marker) => ({
      surah: document.getElementById("surahSelect")?.value,
      ayah: document.getElementById("ayahSelect")?.value,
      destinationRendered: document.body.textContent.includes(marker),
    }), DEST_MARKER);
    check(`${lang} ${viewport.label} GATE A: navigateToAyah()'s own state already moved to the destination surah before the render settles`, midFlight.surah === "4", JSON.stringify(midFlight));
    check(`${lang} ${viewport.label} GATE A: the destination āyah's own Mushaf content is genuinely NOT YET rendered at this sampled instant (the real async gap)`, midFlight.destinationRendered === false, JSON.stringify(midFlight));

    // ---- Now let the (fixed) code's own await catch up, bounded. --------
    // Waits for the LAST page in render order, not DEST_MARKER's own page --
    // see LAST_PAGE_MARKER's own comment for the real gap this closed.
    const destSettled = await page.waitForFunction(
      (marker) => document.body.textContent.includes(marker),
      DEST_MARKER,
      { timeout: 5000 },
    ).then(() => true).catch(() => false);
    const wholeRenderSettled = await page.waitForFunction(
      (marker) => document.body.textContent.includes(marker),
      LAST_PAGE_MARKER,
      { timeout: 5000 },
    ).then(() => true).catch(() => false);
    check(`${lang} ${viewport.label} the destination āyah's own Mushaf page eventually renders`, destSettled);
    check(`${lang} ${viewport.label} the WHOLE destination render (all three pages) settles before scroll state is read`, wholeRenderSettled);

    const afterCounts = fixture.counts();
    check(`${lang} ${viewport.label} a fresh per-page font request really was made for the new page (45), proving this is a distinct render, not a cached one`, afterCounts.fontRequests > beforeCounts.fontRequests, JSON.stringify({ before: beforeCounts, after: afterCounts }));

    // One more real gap closed by the revert-and-confirm step: the LAST
    // PAGE's own marker landing in the DOM (waited for just above) still
    // precedes the fix's own scroll call by a microtask or two --
    // `renderMushafPages()`'s promise resolves, THEN whoever awaited it
    // resumes and calls scrollToAyahIfRendered(). A direct Node<->browser
    // round trip (this evaluate itself) is already enough real time for
    // that gap in practice, but polling for the scroll itself -- the exact
    // thing GATE B asserts -- is the honest way to stop guessing at it.
    await page.waitForFunction(
      () => document.getElementById("pageViewContainer")?.scrollLeft !== 0,
      { timeout: 3000 },
    ).catch(() => {}); // a genuine "never scrolled" is what GATE B itself must then report, not this wait

    // ---- THE ACTUAL FIX UNDER TEST: is the destination word ON SCREEN? --
    const landed = await page.evaluate((marker) => {
      const spans = [...document.querySelectorAll(".hifz-word")].filter((s) => s.textContent === marker);
      if (!spans.length) return { found: false };
      const r = spans[0].getBoundingClientRect();
      const inViewport = r.top >= -2 && r.left >= -2 && r.bottom <= window.innerHeight + 2 && r.right <= window.innerWidth + 2;
      return { found: true, inViewport, rect: { top: r.top, left: r.left, bottom: r.bottom, right: r.right }, win: { w: window.innerWidth, h: window.innerHeight } };
    }, DEST_MARKER);
    check(`${lang} ${viewport.label} the destination āyah's own word span exists once rendered`, landed.found === true, JSON.stringify(landed));
    check(`${lang} ${viewport.label} GATE B: the destination āyah is actually SCROLLED INTO VIEW (this is the fix)`, landed.inViewport === true, JSON.stringify(landed));

    // ---- Card return, focus, Range semantics, no write: unaffected. -----
    const backBtn = await page.locator("[data-word-card-origin-back]").count();
    check(`${lang} ${viewport.label} the "Back to Word Card" control is present after a Mushaf-mode jump`, backBtn > 0, String(backBtn));
    if (backBtn > 0) {
      await clickSafely(page, "[data-word-card-origin-back]");
      await page.waitForFunction(
        (marker) => document.body.textContent.includes(marker),
        ORIGIN_MARKER,
        { timeout: 5000 },
      ).catch(() => {});
      const back = await page.evaluate(() => ({
        surah: document.getElementById("surahSelect")?.value,
        ayah: document.getElementById("ayahSelect")?.value,
        occurrenceId: document.querySelector(".quran-word-card")?.getAttribute("data-occurrence-id"),
      }));
      check(`${lang} ${viewport.label} the return trip lands back on the origin surah/āyah`, back.surah === "2" && back.ayah === "71", JSON.stringify(back));
      check(`${lang} ${viewport.label} the ORIGINAL word reopens (card return preserved)`, back.occurrenceId === "quran-word-occurrence:v1:2:71:13", back.occurrenceId);
    }

    const writes = await page.evaluate(() => (window.__fsLog || [])
      .filter((r) => /setDoc|updateDoc|batchCommit|txCommit/.test(r.kind)).length);
    check(`${lang} ${viewport.label} the whole Mushaf-mode round trip writes nothing`, writes === 0, `writes=${writes}`);

    const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|ERR_FAILED|archive\.org|api\.quran\.com/.test(e));
    check(`${lang} ${viewport.label} no unexpected page errors across the Mushaf-mode round trip`, real.length === 0, real.slice(0, 3).join(" | "));

    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
// Regression control: the SAME cross-surah jump with Mushaf OFF (the
// ordinary flow view PR #138 already fixed) must still work exactly as that
// suite already proves -- checked here too, in the SAME file, so a future
// change that breaks one while fixing the other cannot hide behind "that's
// a different suite". Range-unit semantics and the non-flow (single-āyah)
// no-op path are already covered in full by quran-word-card-flow-nav.mjs and
// are not duplicated here.
// ---------------------------------------------------------------------------
{
  console.log("\n=== Regression: the same cross-surah jump with Mushaf OFF (non-Mushaf flow view, PR #138) ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  // Standing lesson (CLAUDE.md): #tabReadBtn lives inside #studyPillarMenu,
  // which starts `hidden` -- present in the DOM but zero-width until
  // #tabStudyBtn opens it, so an EXISTENCE-only check reports "reachable"
  // for a control Playwright can never click. Checked by measured width,
  // matching the rest of this file and quran-word-card-flow-nav.mjs's own
  // openFixtureWordInFlow() -- this was the actual defect behind an earlier
  // run's own "element is not visible" timeout here, not a splash race.
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await clickSafely(page, "#tabStudyBtn"); await page.waitForTimeout(150); }
  await clickSafely(page, "#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(600);
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const s = document.getElementById("ayahSelect"); if (s.querySelector('option[value="71"]')) { s.value = "71"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(1000);
  await page.evaluate(() => { const sel = document.getElementById("unitTypeSelect"); sel.value = "surah"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { document.querySelector('.page-flow-ayah[data-ayah="71"]')?.scrollIntoView({ inline: "start", behavior: "instant" }); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { document.querySelector('#readView [data-word-occurrence$=":2:71:13"]')?.click(); });
  await page.waitForTimeout(1000);
  await clickSafely(page, '#quranWordCardMount [data-word-card-level="basic"]').catch(() => {});
  await page.waitForTimeout(2500);
  await clickSafely(page, "[data-word-lemma-toggle]").catch(() => {});
  await page.waitForTimeout(2000);

  const target = await page.evaluate(() => {
    const links = [...document.querySelectorAll("[data-word-occurrence-goto]")];
    return links.find((l) => l.getAttribute("data-word-occurrence-goto") === "4:92:17")?.getAttribute("data-word-occurrence-goto") ?? null;
  });
  check("precondition: the lemma list carries the 4:92:17 occurrence (Mushaf-off control)", target === "4:92:17", String(target));
  if (target === "4:92:17") {
    await page.evaluate(() => { [...document.querySelectorAll("[data-word-occurrence-goto]")].find((l) => l.getAttribute("data-word-occurrence-goto") === "4:92:17")?.click(); });
    await page.waitForTimeout(2500);
    const away = await page.evaluate(() => ({
      surah: document.getElementById("surahSelect")?.value,
      ayah: document.getElementById("ayahSelect")?.value,
    }));
    check("Mushaf-off: the cross-surah jump still lands on the destination surah/āyah (unaffected by this round's Mushaf-only fix)", away.surah === "4" && away.ayah === "92", JSON.stringify(away));
  }
  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|ERR_FAILED|archive\.org|api\.quran\.com/.test(e));
  check("no page errors in the Mushaf-off regression control", real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
