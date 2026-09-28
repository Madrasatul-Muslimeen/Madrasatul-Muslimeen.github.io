// Issue #348 -- the Unit Card: acting on and tracking a Ruku', Page, Hizb,
// Juz, Surah or Range from the Read view. RENDERED acceptance QA in a real
// browser, following this project's own established practice for a
// focused, committed browser suite -- the same shape
// mushaf-approach-cards-browser.mjs (issue #325) and
// quran-ayah-action-sheet-browser.mjs (issue #286/#295) already use.
//
// Written here, NOT run here -- this sandbox has no Playwright browser
// binaries and no network access to install them (the same documented,
// repeated environment gap CLAUDE.md records for every browser-driven
// suite in this directory, and the reason mushaf-approach-cards-browser.mjs
// carries the identical notice). The pure computation this round's new
// modules (unit-markers.js, unit-resolve.js) depend on WAS independently
// verified against the real packaged boundary data with plain `node`, not
// a browser -- see this PR's own description for those numbers. The
// Architect/CI should run this file for real before it is trusted.
//
// SCOPE, against the issue's own "Prove it" list:
//   1. Each entry point opens the right unit -- a flow-view marker, the
//      tappable surah heading, an Ayah Card ladder rung, and the Read-bar
//      gold chip.
//   2. The ladder moves between units.
//   3. A stage press writes the right unit key to the right chunk
//      (surah_N for Ruku'/Range/Surah, subject_quran for Juz/Hizb/Page).
//   4. Status counts are checked against claims seeded independently of
//      the app's own effectiveStatus()/poolStatus() -- the expected numbers
//      below are hand-counted from the fixture, never computed by calling
//      the function under test (issue #341's own review lesson).
//   5. Inside chips jump to the right āyah.
//   6. The end-of-unit prompt appears once, saves, and obeys its own
//      Study-options switch.
//   7. The chip and the markers are measured: real >=40px buttons, no
//      sideways scroll, the chip's own fixed max-width holds.
//   8. Mutation-style controls: a claim to the WRONG trackable id, and the
//      prompt with its own switch off, are asserted to read differently
//      from the real case -- proving the checks can fail, not just pass.
//
// FIXTURE: real Surah 2 (Al-Baqara) data, served from this repo's own
// tools/quran-data-pull/output/ -- no synthetic Mushaf JSON is needed
// because this round's entry points are the FLOWING Read view, not Mushaf
// view. The boundary points below are read straight off the real packaged
// tables (juz-index.json / hizb-index.json / page-index.json /
// ruku-index.json), independently re-derived with plain `node` before this
// suite was written (not copied from unit-markers.js's own output):
//   Surah 2, āyāt 1-20 -- NO Juz/Hizb marker falls inside this window at
//   all: Juz 1 and Hizb 1 both began back in Surah 1 (juz-index.json row 1:
//   startSurah 1; hizb-index.json row 1: startSurah 1), so a boundary-table
//   lookup scoped to surahNum=2 correctly finds no "begins" row here --
//   confirmed by running unitBoundaryMarkersInWindow() against the real
//   packaged tables before this suite was written. Page 2 ends at āyah 5;
//   Ruku' 1 (local) ends at āyah 7; Page 3 ends at āyah 16; Ruku' 2 (local)
//   ends at āyah 20. The ladder check below (Juz rung -> "juz:1") is a
//   SEPARATE fact -- āyah 7 of Surah 2 genuinely lies inside Juz 1 (it runs
//   Surah 1:1 to Surah 2:141), it is simply not where Juz 1 BEGINS.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// The default fixture's own `records` seed carries surah_1 and
// subject_asma_ul_husna only. A claim against a document that does not
// exist yet takes the stub's CREATE path, which the stub's own comment
// says plainly is a no-op invisible to __stubWriteData -- see
// mushaf-approach-cards-browser.mjs's own APPROACH_CARDS_SEED for the
// identical reasoning. Also seeds three REAL, independently-hand-counted
// āyah-level claims for the default "memorise" trackable, inside Ruku' 1's
// own span (āyāt 1-7): āyah 2 and āyah 5 "achieved", āyah 7 "learning" --
// so "Āyāt Achieved or Mastered: n of N" for Ruku' 1 has a known right
// answer (2 of 7) that this suite computes BY HAND below, never by calling
// the app's own effectiveStatus()/poolStatus().
const UNIT_CARD_SEED = `
DATA.records.push(
  { _id: TENANT_ID + "__p1__surah_2", tenantId: TENANT_ID, personId: "p1", entries: {
    "ayah:2:2::memorise": { unitType: "ayah", subjectId: "quran", trackableId: "memorise", claimedStatus: "achieved", confirmedStatus: "achieved", confirmState: "confirmed" },
    "ayah:2:5::memorise": { unitType: "ayah", subjectId: "quran", trackableId: "memorise", claimedStatus: "achieved", confirmedStatus: "achieved", confirmState: "confirmed" },
    "ayah:2:7::memorise": { unitType: "ayah", subjectId: "quran", trackableId: "memorise", claimedStatus: "learning", confirmedStatus: null, confirmState: "pending" },
  } },
  { _id: TENANT_ID + "__p1__subject_quran", tenantId: TENANT_ID, personId: "p1", entries: {} }
);
`;

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

/** Opens the Read screen, Surah 2 (Al-Baqara), a Range of āyāt 1-20 -- the
    same picker sequence every other Study-Unit suite here already uses. */
async function openSurah2Range1to20(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await clickSafely(page, "#tabStudyBtn"); await page.waitForTimeout(150); }
  await clickSafely(page, "#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { const sel = document.getElementById("unitTypeSelect"); sel.value = "range"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const from = document.getElementById("rangeFromSelect"); from.value = "1"; from.dispatchEvent(new Event("change", { bubbles: true }));
    const to = document.getElementById("rangeToSelect"); to.value = "20"; to.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(1500);
}

function markerKeys(page) {
  return page.evaluate(() => [...document.querySelectorAll("[data-unit-marker]")].map((el) => el.dataset.unitMarker));
}

// =============================================================================
// Layout -- no sideways scroll, markers/chip/heading are real >=40px
// buttons, the Read-bar chip's own fixed max-width holds. Three named
// widths, both languages.
// =============================================================================
for (const [width, height] of [[320, 640], [390, 844], [1100, 900]]) {
  for (const lang of ["en", "bn"]) {
    console.log(`\n=== Unit Card -- layout only, ${width}x${height}, appLang=${lang} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height }, extraSeedJs: UNIT_CARD_SEED });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await openSurah2Range1to20(page);
    const keys = await markerKeys(page);
    check(`[${lang} ${width}] precondition: the real boundary markers rendered inside the flow`, keys.length > 0, JSON.stringify(keys));
    check(`[${lang} ${width}] the Page-2-ends, Ruku'-1-ends, Page-3-ends and Ruku'-2-ends markers are all present`,
      ["page:madani:2", "ruku:2:1", "page:madani:3", "ruku:2:2"].every((k) => keys.includes(k)), JSON.stringify(keys));
    check(`[${lang} ${width}] the tappable surah heading names surah:2`, keys.includes("surah:2"), JSON.stringify(keys));
    const markerBoxes = await page.evaluate(() => [...document.querySelectorAll(".unit-flow-marker, .unit-flow-surah-heading")].map((el) => el.getBoundingClientRect()));
    check(`[${lang} ${width}] every marker/heading is a real >=40px-tall button`, markerBoxes.length > 0 && markerBoxes.every((r) => r.height >= 40), JSON.stringify(markerBoxes.map((r) => r.height)));
    const chipBox = await page.evaluate(() => document.getElementById("readUnitChip")?.getBoundingClientRect());
    check(`[${lang} ${width}] the Read-bar unit chip is on screen and not hidden`, !!chipBox && chipBox.width > 0, JSON.stringify(chipBox));
    const scroll = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    check(`[${lang} ${width}] no sideways page scroll`, scroll.scrollWidth <= scroll.innerWidth + 1, JSON.stringify(scroll));
    const real = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID|FAILED)/.test(e));
    check(`[${lang} ${width}] no unexpected page errors`, real.length === 0, real.join("; "));
    await ctx.close();
  }
}

// =============================================================================
// Interaction: entry points, the ladder, a claim write, the status count,
// Inside chips, the end-of-unit prompt and its switch, and the Read-bar
// chip's own entry point. Once per language, 390x844.
// =============================================================================
for (const lang of ["en", "bn"]) {
  console.log(`\n=== Unit Card -- entry points, ladder, claims, counts, prompt, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 }, extraSeedJs: UNIT_CARD_SEED });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openSurah2Range1to20(page);
  const keys = await markerKeys(page);
  check(`[${lang}] precondition: the boundary markers rendered`, keys.includes("ruku:2:1"), JSON.stringify(keys));
  if (!keys.includes("ruku:2:1")) { await ctx.close(); continue; }

  // --- Entry point 1: a flow marker opens the right Unit Card ----------------
  await clickSafely(page, '[data-unit-marker="ruku:2:1"]');
  await page.waitForTimeout(300);
  const opened = await page.evaluate(() => {
    const card = document.querySelector("[data-unit-card]");
    return card ? { unitType: card.dataset.unitType, unitKey: card.dataset.unitKey } : null;
  });
  check(`[${lang}] tapping the "Ruku' 1 ends" marker opens the Unit Card for ruku:2:1`, opened?.unitKey === "ruku:2:1" && opened?.unitType === "ruku", JSON.stringify(opened));

  // --- The ladder --------------------------------------------------------
  const rungTypes = await page.evaluate(() => [...document.querySelectorAll(".unit-ladder-rung")].map((b) => b.dataset.unitLadderRung.split(":")[0]));
  check(`[${lang}] the ladder offers all six rungs in order (Āyah → Ruku' → Page → Hizb → Juz → Surah)`,
    JSON.stringify(rungTypes) === JSON.stringify(["ayah", "ruku", "page", "hizb", "juz", "surah"]), JSON.stringify(rungTypes));
  const activeRung = await page.evaluate(() => document.querySelector('.unit-ladder-rung[aria-current="true"]')?.dataset.unitLadderRung);
  check(`[${lang}] the Ruku' rung reads as the active one`, activeRung === "ruku:2:1", activeRung);

  // Tap the Juz rung -- moves to a DIFFERENT unit type (juz), chunkKey subject_quran.
  await clickSafely(page, '.unit-ladder-rung[data-unit-ladder-rung^="juz:"]');
  await page.waitForTimeout(300);
  const afterRung = await page.evaluate(() => {
    const card = document.querySelector("[data-unit-card]");
    return card ? { unitType: card.dataset.unitType, unitKey: card.dataset.unitKey } : null;
  });
  check(`[${lang}] tapping the Juz rung redraws the SAME card for Juz 1 (issue #325's own "redraw in place" precedent)`, afterRung?.unitType === "juz" && afterRung?.unitKey === "juz:1", JSON.stringify(afterRung));

  // Back to the Ruku' rung for the claim/count checks below.
  await clickSafely(page, '.unit-ladder-rung[data-unit-ladder-rung^="ruku:"]');
  await page.waitForTimeout(300);

  // --- A stage press writes to the right chunk with the right unit key ----
  await page.evaluate(() => {
    const sel = document.querySelector("[data-approach-stage-select]");
    sel.value = "memorise";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(300);
  await clickSafely(page, '[data-approach-stage-btn="achieved"]');
  await page.waitForTimeout(400);
  const write = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "records").at(-1));
  check(`[${lang}] pressing 'achieved' on the Ruku' Unit Card wrote records/t1__p1__surah_2`, write?.col === "records" && write?.id === "t1__p1__surah_2", JSON.stringify(write));
  check(`[${lang}] the write is keyed to ruku:2:1::memorise (never an ayah: key)`,
    !!write && Object.keys(write.data ?? {}).includes("entries.ruku:2:1::memorise") && !Object.keys(write.data ?? {}).some((k) => k.startsWith("entries.ayah:")),
    JSON.stringify(write?.data && Object.keys(write.data)));
  const writtenEntry = write?.data?.["entries.ruku:2:1::memorise"];
  check(`[${lang}] the claimed status is exactly 'achieved'`, writtenEntry?.claimedStatus === "achieved", JSON.stringify(writtenEntry));
  // Mutation-style control: the write must NOT have landed under a
  // different trackable id -- proves the check above can fail, not just
  // pass, by asking the same question of a key that was never written.
  check(`[${lang}] MUTATION CONTROL: the write does NOT carry a different trackable id (approach_02)`, !Object.keys(write?.data ?? {}).includes("entries.ruku:2:1::approach_02"));

  // --- Status count, hand-counted, never from the app's own function ------
  // Ruku' 1 spans āyāt 1-7 (7 āyāt). The fixture seeded āyah 2 and āyah 5 as
  // "achieved" and āyah 7 as "learning" -- 2 of 7 achieved BEFORE the write
  // above; the write above claims the RUKU ITSELF (not an āyah), which
  // floors every āyah inside it for a Yes Approach. "memorise" is NOT in
  // approach-coverage.js's own DEFAULT_YES_TRACKABLE_IDS list (it is a
  // fixture-only id, not a real approach_0N), so it reads as a No Approach
  // and the wide claim floors nothing -- the count must stay 2 of 7, not
  // jump to 7 of 7. This is the exact distinction Owner decision 6 exists
  // to prove: a No Approach's wider claim counts ONLY for the unit itself.
  await page.waitForTimeout(500); // the achieved-line loads async after the card's first paint
  const countLine = await page.evaluate(() => document.querySelector('[data-unit-card] [data-unit-card-achieved-line]')?.textContent ?? "");
  check(`[${lang}] "Āyāt Achieved or Mastered" reads 2 of 7 -- the hand-counted āyah-level figure, unmoved by the Ruku's own No-Approach claim`,
    /2/.test(countLine) && /7/.test(countLine), countLine);

  // --- Inside chips jump to the right āyah --------------------------------
  const insideChipCount = await page.evaluate(() => document.querySelectorAll('[data-unit-card-inside-block] .unit-card-inside-chip').length);
  check(`[${lang}] Ruku' 1's own "Inside" list shows all 7 āyāt`, insideChipCount === 7, String(insideChipCount));
  await clickSafely(page, '[data-unit-card-inside-block] .unit-card-inside-chip:nth-child(3)'); // the 3rd chip = āyah 3
  await page.waitForTimeout(500);
  const cardClosedAfterJump = await page.evaluate(() => !document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"));
  check(`[${lang}] tapping an Inside chip closes the card`, cardClosedAfterJump);

  // --- The end-of-unit prompt: appears once, saves, obeys its switch ------
  await openSurah2Range1to20(page); // fresh flow render, back to the Range's own end (āyah 20)
  const promptCountOn = await page.evaluate(() => document.querySelectorAll("[data-end-of-unit-prompt]").length);
  check(`[${lang}] the end-of-unit prompt appears exactly once, at the end of the Range`, promptCountOn === 1, String(promptCountOn));
  const promptText = await page.evaluate(() => document.querySelector(".end-of-unit-text")?.textContent ?? "");
  check(`[${lang}] the prompt names the unit ("Ayahs 1–20")`, promptText.length > 0, promptText);
  await clickSafely(page, '[data-end-of-unit-stage="achieved"]');
  await page.waitForTimeout(500);
  const savedText = await page.evaluate(() => document.querySelector(".end-of-unit-saved")?.textContent ?? "");
  check(`[${lang}] pressing a stage on the prompt says "Saved" in words`, savedText.length > 0, savedText);
  const promptWrite = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "records").at(-1));
  check(`[${lang}] the prompt's own write is keyed to range:2:1-20::memorise`, !!promptWrite && Object.keys(promptWrite.data ?? {}).includes("entries.range:2:1-20::memorise"), JSON.stringify(promptWrite?.data && Object.keys(promptWrite.data)));

  // Switch the prompt off in Study options, re-render, and assert it is
  // gone -- the mutation-style control for the whole prompt mechanism: if
  // the switch did nothing, this is the one check that would catch it.
  await clickSafely(page, "#tabStudyBtn");
  await page.waitForTimeout(300);
  await page.evaluate(() => { const t = document.getElementById("endOfUnitPromptToggle"); t.checked = false; t.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(300);
  await openSurah2Range1to20(page);
  const promptCountOff = await page.evaluate(() => document.querySelectorAll("[data-end-of-unit-prompt]").length);
  check(`[${lang}] MUTATION CONTROL: switching the Study-options tick off makes the prompt disappear`, promptCountOff === 0, String(promptCountOff));
  // Turn it back on for cleanliness (not strictly needed -- ctx.close() below tears the whole context down).
  await page.evaluate(() => { const t = document.getElementById("endOfUnitPromptToggle"); t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); });

  // --- Entry point 2: the Read-bar gold chip ------------------------------
  await openSurah2Range1to20(page);
  const chipTextAfter = await page.evaluate(() => document.querySelector("#readUnitChip .read-unit-chip-text")?.textContent ?? "");
  check(`[${lang}] the Read-bar chip names the current Range`, chipTextAfter.length > 0, chipTextAfter);
  await clickSafely(page, "#readUnitChip");
  await page.waitForTimeout(400);
  const chipOpened = await page.evaluate(() => {
    const card = document.querySelector("[data-unit-card]");
    return card ? { unitType: card.dataset.unitType, unitKey: card.dataset.unitKey } : null;
  });
  check(`[${lang}] tapping the Read-bar chip opens the Unit Card for the current Range (range:2:1-20)`, chipOpened?.unitKey === "range:2:1-20", JSON.stringify(chipOpened));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  const real = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID|FAILED)/.test(e));
  check(`[${lang}] no unexpected page errors across the whole scenario`, real.length === 0, real.join("; "));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Unit Card (issue #348): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
