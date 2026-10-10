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
//
// ISSUE #295 ("Ayah Card, part 1") ADDED, same "written here, not run here"
// caveat: the 320/360 viewports (the layout rule now covers all four widths
// the round is measured at, not just 390/1100), a 40px-minimum sweep over
// every button in the card, and a whole new scenario at the bottom of this
// file covering the third entry point (the number badge, Read AND Note
// view), Take an Approach's real claimStatus() write, and the two Status B
// figures that need real seeded data (Word by Word known count, Hifz).
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
// Issue #332 Part A -- was raw.githubusercontent.com/.../mushaf/fonts/;
// updated to match hifz-renderer.js's own MUSHAF_FONT_BASE, now the Quran
// Foundation v2 CDN (the files are byte-identical -- see
// docs/reports/2026-09-27-tajweed-font-permission.md).
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";

// hifz-renderer.js's own ayahMaxWordPosition is the HIGHEST w.loc position
// recorded for an ayah; the span AT that position is the marker (issue
// #286), every position BELOW it is a real, tappable word. So the fixture
// needs at least two positions per ayah to make the two spans (word vs.
// marker) distinguishable at all -- one real word at position 1, the marker
// at position 2.
// Architect review: short, like the real one-glyph print number. The first
// version used a 21-character string, which at Mushaf size was 267px wide,
// ran off the page's left edge, and put its own centre outside the page --
// so the hit-test failed and the click was intercepted, for a reason the real
// Mushaf never has.
const MARKER_GLYPH = "\u24C2";
const SYNTHETIC_MUSHAF_DATA = {
  "3": [{ type: "ayah", words: [
    { g: "\u24CC", loc: "2:71:1" },
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

// Issue #295 widened this list from [390, 1100] to the four widths the
// Ayah Card round itself is measured at -- the Status part this round adds
// is real extra height inside the same bottom sheet/popover, so the
// smallest phones this project measures (320/360) need their own proof,
// not an inference from 390.
for (const viewport of [
  { width: 320, height: 640, label: "phone 320x640" },
  { width: 360, height: 740, label: "phone 360x740" },
  { width: 390, height: 844, label: "mobile 390x844" },
  { width: 1100, height: 800, label: "desktop 1100x800" },
]) {
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

      // Issue #295's own layout rule, read literally: scrollWidth === innerWidth
      // (not merely "no more than a rounding pixel over") and every BUTTON in
      // the whole card (Actions + the new Status part) at least 40x40 -- the
      // Approach dots and the Hifz chip are deliberately excluded, neither is
      // a <button>.
      const noSidewaysScroll = await page.evaluate(() => document.documentElement.scrollWidth === window.innerWidth);
      check(`${lang} ${viewport.label} the open sheet causes no sideways page scroll (scrollWidth === innerWidth)`, noSidewaysScroll);

      const tinyButtons = await page.evaluate(() => {
        const sheet = document.querySelector("[data-ayah-sheet]");
        if (!sheet) return null;
        return [...sheet.querySelectorAll("button")]
          .map((b) => ({ label: b.textContent.trim().slice(0, 24) || b.getAttribute("aria-label") || b.className, rect: b.getBoundingClientRect() }))
          .filter((b) => b.rect.width > 0 && b.rect.height > 0) // a hidden/zero-size button (none expected here) is a different defect, not this one
          .filter((b) => b.rect.width < 40 || b.rect.height < 40)
          .map((b) => `${b.label} ${Math.round(b.rect.width)}x${Math.round(b.rect.height)}`);
      });
      check(`${lang} ${viewport.label} every button in the card is at least 40x40`, Array.isArray(tinyButtons) && tinyButtons.length === 0, JSON.stringify(tinyButtons));

      // Owner, 2 Oct 2026 (a phone photo of the Āyah card, the Status part
      // circled): "Take this to the top". Read off the RENDERED boxes: Status
      // sits straight under the header and above Play/Copy/Share, and the
      // first thing a reader sees on opening is its heading.
      const order = await page.evaluate(() => {
        const sheet = document.querySelector("[data-ayah-sheet]");
        const box = (el) => el?.getBoundingClientRect();
        // Updated in place 7 Oct 2026: the Owner then asked for the actions "below the Ayah name/ number in a row",
        // so the one-tap action row (and its hints) now sits between the header and Status; Status follows it directly.
        const statusEl = sheet?.querySelector("[data-ayah-sheet-status]");
        const header = box(statusEl?.previousElementSibling);
        const status = box(sheet?.querySelector("[data-ayah-sheet-status]"));
        const play = box(sheet?.querySelector("[data-ayah-sheet-play]"));
        const title = sheet?.querySelector("[data-ayah-sheet-status] .ayah-sheet-section-title");
        const tb = box(title);
        const scroller = sheet;
        const sb = box(scroller);
        return header && status && play && tb ? {
          gapUnderHeader: Math.round(status.top - header.bottom), statusAbovePlay: play.bottom <= status.top + 1,
          titleVisible: tb.top >= sb.top && tb.bottom <= Math.min(sb.bottom, innerHeight), titleText: title.textContent.trim(),
        } : null;
      });
      check(`${lang} ${viewport.label} "Status of this āyah" sits straight under the action row (gap ${order?.gapUnderHeader}px)`, !!order && order.gapUnderHeader >= 0 && order.gapUnderHeader <= 12, JSON.stringify(order));
      check(`${lang} ${viewport.label} ...with Play this āyah in the row above it`, !!order && order.statusAbovePlay, JSON.stringify(order));
      check(`${lang} ${viewport.label} ...and its heading is in view the moment the card opens ("${{ en: "Status of this āyah", bn: order?.titleText }[lang]}")`,
        !!order && order.titleVisible && (lang !== "en" || order.titleText === "Status of this āyah"), JSON.stringify(order));

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
    // ERR_FAILED is this suite's own route.abort() on the Mushaf fonts (above).
    const real = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID|FAILED)/.test(e));
    check(`${lang} ${viewport.label} no unexpected page errors`, real.length === 0, real.join("; "));

    await page.close();
  }
}

// =============================================================================
// Issue #295 -- the Ayah Card. The third entry point (the number badge, Read
// AND Note view -- NOT the Mushaf marker, already covered above), Take an
// Approach's real write, the two new Status B figures that need real seeded
// data (Word by Word known count, Hifz), and a Word by Word chip still
// opening the Word Card. Surah 1 ayah 1 (Al-Fatiha's Bismillah, 4 real
// words) -- the SAME ayah/word-count quran-word-progress-rendered.mjs
// already uses, rather than re-deriving a fresh figure this suite would
// have to trust blind. Run once, English, 390px -- the viewport/language
// MATRIX for the sheet's own layout is the loop above; this section proves
// the new BEHAVIOUR, not a second copy of the layout sweep.
// =============================================================================

const CARD_SEED = `
// A Hifz trackable at the REAL production id (catalogue-data.js's
// approach_02) -- the shared fixture's own default Hifz-equivalent is
// "memorise" (a harness id, not production's), so HIFZ_TRACKABLE_ID needs
// one added under its real id for this scenario to mean anything.
DATA.trackables.push({
  _id: TENANT_ID + "__approach_02", tenantId: TENANT_ID, subjectId: "quran",
  order: 99, status: "active", name: lang("Hifz / Memorising", "হিফজ / মুখস্থকরণ"),
  groupName: lang("Preservation", "সংরক্ষণ"),
  guide: { what: lang("What it is", "এটি কী"), how: lang("How to do it", "কীভাবে করবেন"), measure: lang("How to measure", "কীভাবে মাপবেন") },
  panels: ["text"],
});
DATA.records = [{
  _id: TENANT_ID + "__p1__surah_1", tenantId: TENANT_ID, personId: "p1",
  entries: {
    "ayah:1:1::memorise": { unitType: "ayah", subjectId: "quran", trackableId: "memorise", claimedStatus: "achieved", confirmedStatus: "achieved", confirmState: "confirmed" },
    "ayah:1:1::approach_02": { unitType: "ayah", subjectId: "quran", trackableId: "approach_02", claimedStatus: "practising", confirmedStatus: "practising", confirmState: "confirmed" },
  },
}];
DATA.quranWordProgress = [{
  _id: TENANT_ID + "__p1__wbw__1_1", contractVersion: "quran-word-progress:v1",
  identityContract: "quran-word-occurrence:v1", lane: "learner",
  tenantId: TENANT_ID, personId: "p1", level: "wbw", surah: 1, ayah: 1,
  entries: { "1": { s: "a", at: "2026-09-25T10:00:00.000Z", by: "p1" }, "2": { s: "a", at: "2026-09-25T10:00:00.000Z", by: "p1" } },
}];
DATA.quranWordApprovals = [];
`;

async function enterReadSurah1(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await clickSafely(page, "#tabStudyBtn"); await page.waitForTimeout(150); }
  await clickSafely(page, "#tabReadBtn");
  await page.waitForTimeout(600);
}

console.log(`\n=== Ayah Card -- number badge, Take an Approach, Status B (issue #295) ===`);
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 }, extraSeedJs: CARD_SEED });
  // UPDATED IN PLACE, issue #482: this scenario taps the number badge of 1:1,
  // which is unnumbered under Al-Fātiḥah's new default display count. It is a
  // scenario about the Ayah Card, not about the count, so it runs with that
  // reading setting OFF (today's numbering); fatiha-count-browser covers ON.
  await ctx.addInitScript(() => localStorage.setItem("mm_fatiha_bismillah_unnumbered", "0"));
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await enterReadSurah1(page);

  // --- entry point (c), Read view: tap the number badge ---
  const badge = await page.$('#readView [data-ayah-num-badge="1:1"]');
  check("the Read view's own ayah-number badge exists for 1:1, as a real element", !!badge);
  if (badge) {
    const tag = await badge.evaluate((el) => el.tagName);
    check("the number badge is a real <button> element", tag === "BUTTON", tag);
    await clickSafely(page, '#readView [data-ayah-num-badge="1:1"]');
    await page.waitForTimeout(400);
    const opened = await page.evaluate(() => document.querySelector("[data-ayah-sheet]")?.dataset.unitKey === "ayah:1:1");
    check("tapping the Read view's number badge opens the card for ayah:1:1", opened);
  }

  // --- Status B.1 Approach: the two seeded statuses show as coloured dots ---
  const dots = await page.evaluate(() => [...document.querySelectorAll(".ayah-approach-dot")].map((d) => d.getAttribute("style")));
  check("Status B.1 renders one dot per active Approach (10 default + the seeded Hifz)", dots.length === 11, String(dots.length));
  check("Status B.1's seeded 'achieved' status (memorise) is coloured with STATUS_COLORS.achieved", dots.some((s) => s?.includes("#5b84c4")), JSON.stringify(dots));

  // --- Status B.3 Hifz: the seeded 'practising' status shows, by name ---
  const hifzText = await page.evaluate(() => document.querySelector(".ayah-hifz-chip")?.textContent.trim());
  check("Status B.3 Hifz shows the seeded approach_02 status ('Practising')", hifzText === "Practising", hifzText);

  // --- Status B.2 Word by Word: 2 of 4 known, matching the seed independently ---
  await page.waitForFunction(() => /Known \d+ of \d+ words/.test(document.querySelector(".ayah-wbw-count")?.textContent ?? ""), null, { timeout: 4000 }).catch(() => {});
  const wbwCount = await page.evaluate(() => document.querySelector(".ayah-wbw-count")?.textContent.trim());
  check("Status B.2 reads 'Known 2 of 4 words', matching the seeded lane independently (not the app's own arithmetic)", wbwCount === "Known 2 of 4 words", wbwCount);
  const knownChips = await page.evaluate(() => document.querySelectorAll(".ayah-wbw-chip.is-known").length);
  check("exactly 2 chips carry is-known, the same 2 the count line reports", knownChips === 2, String(knownChips));
  // Architect review: the chips first shipped with no colour of their own and
  // inherited the app's WHITE button text -- invisible on cream, while every
  // other assertion here passed. Measure the rendered contrast of both kinds.
  const chipContrast = await page.evaluate(() => {
    const lum = (c) => { const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (el) => { const cs = getComputedStyle(el); const a = lum(cs.color), b = lum(cs.backgroundColor); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
    return [...document.querySelectorAll(".ayah-wbw-chip")].map(ratio);
  });
  check("every Word by Word chip's text is readable: contrast at least 4.5:1 against its own background",
    chipContrast.length > 0 && chipContrast.every((r) => r >= 4.5), JSON.stringify(chipContrast.map((r) => r.toFixed(2))));

  // --- tapping a Word by Word chip still opens the Word Card ---
  await clickSafely(page, ".ayah-wbw-row .ayah-wbw-chip:not(.is-known)");
  await page.waitForTimeout(500);
  const wordCardFromChip = await page.evaluate(() =>
    !!document.querySelector("#quranWordCardMount .quran-word-card") && !document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"));
  check("tapping a Word by Word chip closes the card and opens the Word Card for that word", wordCardFromChip);

  // Architect review of #325: since v08.89 the Word Card opens full screen
  // below 900px and covers the reading screen, so close it before tapping
  // the āyah badge behind it (this suite was red on main for that reason).
  await page.click("#quranWordCardMount [data-word-card-close]").catch(() => {});
  await page.waitForTimeout(300);

  // --- Issue #325 -- updated in place, reason recorded: choosing an
  // Approach no longer claims Learning and closes the card. It reveals a
  // four-stage row instead; pressing a stage writes through the SAME
  // claimStatus() the Track tab uses, and the card stays open afterwards so
  // more than one stage can be tried without reopening it. ---
  await clickSafely(page, '#readView [data-ayah-num-badge="1:1"]');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const sel = document.querySelector("[data-approach-stage-select]");
    sel.value = "recite";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const afterPick = await page.evaluate(() => ({
    open: !!document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"),
    stageButtons: [...document.querySelectorAll("[data-approach-stage-btn]")].map((b) => b.dataset.approachStageBtn),
    writesSoFar: (window.__stubWriteData || []).filter((w) => w.col === "records").length,
  }));
  check("picking an Approach does NOT close the card", afterPick.open === true, JSON.stringify(afterPick));
  // UPDATED IN PLACE, Owner 1 Oct 2026: the harness signs in as the owner, who now also sees Mastered and Not Applicable.
  check("picking an Approach reveals exactly the six stage buttons (owner), in order", JSON.stringify(afterPick.stageButtons) === JSON.stringify(["not_started", "learning", "practising", "achieved", "mastered", "not_applicable"]), JSON.stringify(afterPick.stageButtons));
  check("picking an Approach writes NOTHING by itself", afterPick.writesSoFar === 0, JSON.stringify(afterPick));

  await clickSafely(page, '[data-approach-stage-btn="practising"]');
  await page.waitForTimeout(400);
  const claimWrite = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "records").at(-1));
  check("pressing a stage button wrote to the records collection", claimWrite?.col === "records", JSON.stringify(claimWrite));
  check("the write touches exactly this āyah's own entry for the chosen Approach (dot-path, not the whole map)",
    !!claimWrite && Object.keys(claimWrite.data ?? {}).includes("entries.ayah:1:1::recite"), JSON.stringify(claimWrite?.data && Object.keys(claimWrite.data)));
  check("no page: unit key was ever written by the Ayah Card", !Object.keys(claimWrite?.data ?? {}).some((k) => k.startsWith("entries.page:")), JSON.stringify(claimWrite?.data && Object.keys(claimWrite.data)));
  const writtenEntry = claimWrite?.data?.["entries.ayah:1:1::recite"];
  check("the claim is recorded as 'practising' -- the stage actually pressed, not a fixed default", writtenEntry?.claimedStatus === "practising", JSON.stringify(writtenEntry));

  const afterStage = await page.evaluate(() => ({
    open: !!document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"),
    pressed: [...document.querySelectorAll("[data-approach-stage-btn]")].map((b) => [b.dataset.approachStageBtn, b.getAttribute("aria-pressed")]),
  }));
  check("pressing a stage button does NOT close the card either", afterStage.open === true, JSON.stringify(afterStage));
  check("the just-pressed 'practising' button now shows aria-pressed=true, the other five false",
    JSON.stringify(afterStage.pressed) === JSON.stringify([["not_started", "false"], ["learning", "false"], ["practising", "true"], ["achieved", "false"], ["mastered", "false"], ["not_applicable", "false"]]),
    JSON.stringify(afterStage.pressed));

  // --- Reopening the card (closed, then the same āyah opened again) shows
  // the saved state once the same Approach is re-picked. ---
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  await clickSafely(page, '#readView [data-ayah-num-badge="1:1"]');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const sel = document.querySelector("[data-approach-stage-select]");
    sel.value = "recite";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const reopened = await page.evaluate(() =>
    [...document.querySelectorAll("[data-approach-stage-btn]")].map((b) => [b.dataset.approachStageBtn, b.getAttribute("aria-pressed")]));
  check("reopening the card and re-picking the same Approach shows 'practising' pressed -- the saved state, not a reset placeholder",
    JSON.stringify(reopened) === JSON.stringify([["not_started", "false"], ["learning", "false"], ["practising", "true"], ["achieved", "false"], ["mastered", "false"], ["not_applicable", "false"]]),
    JSON.stringify(reopened));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // --- entry point (c): UPDATED IN PLACE (Note view retirement, step b). The Note view and its locally-built number badge are
  // deleted; the same job (a real number-badge <button> that opens the card for ayah:1:1) is done by the Read view's badge. ---
  const noteGone = await page.evaluate(() => ({ view: document.getElementById("noteView"), seam: typeof window.__dormantOpenNoteView }));
  check("#noteView and __dormantOpenNoteView are absent (the Note view's own number badge no longer exists)", noteGone.view === null && noteGone.seam === "undefined", JSON.stringify(noteGone));
  await page.waitForTimeout(1200);
  const noteBadge = await page.$('#readView [data-ayah-num-badge="1:1"]');
  check("the Read view's number badge exists for 1:1, as a real element", !!noteBadge);
  if (noteBadge) {
    const tag = await noteBadge.evaluate((el) => el.tagName);
    check("the Read view's number badge is a real <button> element too", tag === "BUTTON", tag);
    await clickSafely(page, '#readView [data-ayah-num-badge="1:1"]');
    await page.waitForTimeout(400);
    const openedFromNote = await page.evaluate(() => document.querySelector("[data-ayah-sheet]")?.dataset.unitKey === "ayah:1:1");
    check("tapping the Read view's number badge opens the card for ayah:1:1", openedFromNote);
  }

  const real = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID|FAILED)/.test(e));
  check("no unexpected page errors across the whole Ayah Card scenario", real.length === 0, real.join("; "));

  await page.close();
}

await browser.close();
console.log(`\n==== "This āyah" action sheet / Ayah Card -- entry points, Take an Approach, Status B (issues #286, #295): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
