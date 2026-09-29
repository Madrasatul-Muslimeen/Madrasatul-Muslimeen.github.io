// Issue #348 -- the Unit Card: acting on and tracking a Ruku', Page, Hizb,
// Juz, Surah or Range from the Read view. RENDERED acceptance QA in a real
// browser, following this project's own established practice for a
// focused, committed browser suite -- the same shape
// mushaf-approach-cards-browser.mjs (issue #325) and
// quran-ayah-action-sheet-browser.mjs (issue #286/#295) already use.
//
// Run by the Architect at review (28 Sep 2026) in a real browser: the
// Builder's sandbox had no browser, and this suite crashed on its first real
// run (the prompt's buttons sit on a page not yet scrolled to). Review also
// replaced a count check that passed on any line containing a 2 and a 7,
// and added hand-counted Yes-Approach cases (a Surah claim and a Juz claim
// flooring the Ruku's āyāt), which the card had got wrong.
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
  { _id: TENANT_ID + "__p1__subject_quran", tenantId: TENANT_ID, personId: "p1", entries: {
    "juz:1::tajweed": { unitType: "juz", subjectId: "quran", trackableId: "tajweed", claimedStatus: "achieved", confirmedStatus: null, confirmState: "pending" },
  } }
);
// Review: two Yes Approaches (countsForEachAyah true), each with ONE wider
// claim covering Ruku' 1 (2:1-7) -- "recite" by a Whole Surah 2 claim (in
// surah_2), "tajweed" by a Juz 1 claim (in subject_quran). Hand count: every
// āyah of Ruku' 1 is floored to Achieved -> 7 of 7 for each. And a No
// Approach ("memorise") Whole Surah claim that must NOT floor anything.
for (const id of ["recite", "tajweed"]) DATA.trackables.find((t) => t._id === TENANT_ID + "__" + id).countsForEachAyah = true;
Object.assign(DATA.records.find((r) => r._id === TENANT_ID + "__p1__surah_2").entries, {
  "surah:2::recite": { unitType: "surah", subjectId: "quran", trackableId: "recite", claimedStatus: "achieved", confirmedStatus: null, confirmState: "pending" },
  "ayah:2:3::recite": { unitType: "ayah", subjectId: "quran", trackableId: "recite", claimedStatus: "learning", confirmedStatus: null, confirmState: "pending" },
  "surah:2::memorise": { unitType: "surah", subjectId: "quran", trackableId: "memorise", claimedStatus: "achieved", confirmedStatus: null, confirmState: "pending" },
});
`;

/** The digits in a line, in order, Bangla digits read as ASCII -- so a count
    line is compared as numbers, in either language's word order. */
function digitsIn(text) {
  const ascii = String(text).replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  return (ascii.match(/\d+/g) ?? []).map(Number);
}
/** "n of total" in the reader's own language: en "…: n of total", bn "{total} এর মধ্যে {n} …". */
function readCount(text, lang) {
  const d = digitsIn(text);
  if (d.length !== 2) return null;
  return lang === "bn" ? { n: d[1], total: d[0] } : { n: d[0], total: d[1] };
}
async function pickCardApproach(page, id) {
  await page.evaluate((v) => {
    const sel = document.querySelector("[data-approach-stage-select]");
    sel.value = v;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }, id);
  await page.waitForTimeout(900);
  return page.evaluate(() => document.querySelector("[data-unit-card] [data-unit-card-achieved-line]")?.textContent ?? "");
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

/** Opens the Read screen, Surah 2 (Al-Baqara), a Range of āyāt 1-20 -- the
    same picker sequence every other Study-Unit suite here already uses. */
async function openSurah2Range1to20(page) {
  // Review fix: pressing Read while the Read screen is already showing takes
  // the reader back to the landing page, so only press it when it is not.
  const alreadyReading = await page.evaluate(() => getComputedStyle(document.getElementById("readView")).display !== "none");
  if (!alreadyReading) await openReadScreen(page);
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

async function openReadScreen(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await clickSafely(page, "#tabStudyBtn"); await page.waitForTimeout(150); }
  await clickSafely(page, "#tabReadBtn");
  await page.waitForTimeout(500);
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
    // Review: ON by default means a reader who has never chosen an Approach
    // on any card still sees it, claiming for the Study-options Approach.
    const fresh = await page.evaluate(() => ({ n: document.querySelectorAll("[data-end-of-unit-prompt]").length, approach: document.querySelector("[data-end-of-unit-approach]")?.textContent ?? "" }));
    check(`[${lang} ${width}] a fresh reader sees the end-of-unit prompt once, naming the Study-options Approach`, fresh.n === 1 && /Memorise|মুখস্থ/.test(fresh.approach), JSON.stringify(fresh));
    // Markers on the view being shown (the flow); the hidden one-āyah view
    // keeps its own from before the Range was chosen, at 0x0.
    const markerBoxes = await page.evaluate(() => [...document.querySelectorAll("#pageViewContainer .unit-flow-marker, #pageViewContainer .unit-flow-surah-heading")].map((el) => el.getBoundingClientRect()));
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

  // --- Issue #349: "Mark as read" for Ruku'/Page --------------------------
  // UPDATED 29 Sep 2026: the Owner published the Ruku'/Page rules and the
  // reading-units gate is OPEN (docs/reports/2026-09-29-reading-ruku-page-
  // enabled.md). Ruku'/Page now read ENABLED with no hint, and pressing
  // Ruku''s writes one evidence document. The old "not switched on yet"
  // sentence must no longer appear. Hizb keeps its own "planned for later".
  const markAsReadState = () => page.evaluate(() => {
    const btn = document.querySelector("[data-unit-card-mark-read]");
    if (!btn) return null;
    const hint = btn.nextElementSibling?.classList?.contains("ayah-sheet-hint") ? btn.nextElementSibling.textContent : "";
    return { ariaDisabled: btn.getAttribute("aria-disabled"), hint };
  });
  const READING_UNITS_HINT = {
    en: "Recording a Ruku' or Page as read is not switched on yet.",
    bn: "রুকু' বা পৃষ্ঠা পড়া হয়েছে বলে রেকর্ড করা এখনও চালু হয়নি।",
  };
  const rukuMarkAsRead = await markAsReadState();
  check(`[${lang}] Ruku' "Mark as read" is ENABLED now the reading-units gate is open, with no hint`,
    rukuMarkAsRead?.ariaDisabled === "false" && rukuMarkAsRead?.hint === "",
    JSON.stringify(rukuMarkAsRead));
  const evBefore = await page.evaluate(() => (window.__fsLog || []).filter((e) => /\/evidence/.test(JSON.stringify(e)) && /ruku:2:1/.test(JSON.stringify(e))).length);
  await clickSafely(page, "[data-unit-card-mark-read]");
  await page.waitForTimeout(400);
  const evAfter = await page.evaluate(() => (window.__fsLog || []).filter((e) => /\/evidence/.test(JSON.stringify(e)) && /ruku:2:1/.test(JSON.stringify(e))).length);
  // This check is also the guard for a live defect found 29 Sep 2026: the
  // card's buttons close the card first, closing cleared unitCardCurrentInfo,
  // and markUnitAsRead() read that and returned -- so "Mark as read" never
  // saved anything (Surah/Range included) from v08.103 until v08.108.
  check(`[${lang}] pressing Ruku' "Mark as read" writes an evidence document for ruku:2:1`,
    evAfter > evBefore, JSON.stringify({ evBefore, evAfter, tail: await page.evaluate(() => (window.__fsLog || []).slice(-4).map((e) => [e.kind, e.col, e.id])) }));
  // The press closes the card (as every card action does); reopen it.
  await clickSafely(page, '[data-unit-marker="ruku:2:1"]');
  await page.waitForTimeout(300);

  await clickSafely(page, '.unit-ladder-rung[data-unit-ladder-rung^="page:"]');
  await page.waitForTimeout(300);
  const pageMarkAsRead = await markAsReadState();
  check(`[${lang}] Page "Mark as read" is ALSO enabled, with no hint`,
    pageMarkAsRead?.ariaDisabled === "false" && pageMarkAsRead?.hint === "",
    JSON.stringify(pageMarkAsRead));

  await clickSafely(page, '.unit-ladder-rung[data-unit-ladder-rung^="surah:"]');
  await page.waitForTimeout(300);
  const surahMarkAsRead = await markAsReadState();
  check(`[${lang}] Surah "Mark as read" is UNAFFECTED -- still enabled, no hint (the reading-units gate never applies to it)`,
    surahMarkAsRead?.ariaDisabled === "false" && surahMarkAsRead?.hint === "",
    JSON.stringify(surahMarkAsRead));

  await clickSafely(page, '.unit-ladder-rung[data-unit-ladder-rung^="hizb:"]');
  await page.waitForTimeout(300);
  const hizbMarkAsRead = await markAsReadState();
  check(`[${lang}] Hizb "Mark as read" still reads its OWN "planned for later" wording, not the retired Ruku'/Page sentence`,
    hizbMarkAsRead?.ariaDisabled === "true" && hizbMarkAsRead?.hint !== READING_UNITS_HINT[lang] && hizbMarkAsRead?.hint.length > 0,
    JSON.stringify({ hizbMarkAsRead }));

  // Back to the Ruku' rung before the existing flow below continues.
  await clickSafely(page, '.unit-ladder-rung[data-unit-ladder-rung^="ruku:"]');
  await page.waitForTimeout(300);

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
  const c1 = readCount(countLine, lang);
  check(`[${lang}] "Āyāt Achieved or Mastered" reads exactly 2 of 7 -- hand-counted, unmoved by the No-Approach Ruku' and Surah claims`,
    c1?.n === 2 && c1?.total === 7, countLine);
  // Yes Approach, floored by a WHOLE SURAH claim held in surah_2 (and āyah 3's
  // own "learning" floored up): hand count 7 of 7.
  const reciteLine = await pickCardApproach(page, "recite");
  const c2 = readCount(reciteLine, lang);
  check(`[${lang}] a Yes Approach with a Whole Surah claim reads 7 of 7 on Ruku' 1 (wider claim counts, as in Explore)`, c2?.n === 7 && c2?.total === 7, reciteLine);
  // Yes Approach, floored by a JUZ claim held in subject_quran: 7 of 7.
  const tajweedLine = await pickCardApproach(page, "tajweed");
  const c3 = readCount(tajweedLine, lang);
  check(`[${lang}] a Yes Approach with a Juz 1 claim (subject_quran) reads 7 of 7 on Ruku' 1`, c3?.n === 7 && c3?.total === 7, tajweedLine);
  // An Approach with no claims at all: 0 of 7.
  const listenLine = await pickCardApproach(page, "listen");
  const c4 = readCount(listenLine, lang);
  check(`[${lang}] an Approach with no claims reads 0 of 7`, c4?.n === 0 && c4?.total === 7, listenLine);
  await pickCardApproach(page, "memorise");

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
  // The prompt sits under the Range's last āyah, on a page the reader turns
  // to; bring it on screen the way a reader would reach it, then press.
  await page.evaluate(() => document.querySelector("[data-end-of-unit-prompt]")?.scrollIntoView({ block: "center", inline: "start" }));
  await page.waitForTimeout(500);
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

  // Review: a Ruku'/Juz/Hizb/Page is read ONE āyah at a time (not as a
  // flow), so the markers and the prompt must appear on that view too, and
  // the prompt only on the unit's REAL last āyah. Juz 2 is 2:142-252; Juz 3
  // runs 2:253 to 3:92, so 2:286 is NOT its end.
  const singleAyahState = async (unitType, unitNum, ayah) => {
    await page.evaluate(([ty]) => { const sel = document.getElementById("unitTypeSelect"); sel.value = ty; sel.dispatchEvent(new Event("change", { bubbles: true })); }, [unitType]);
    await page.waitForTimeout(600);
    if (unitNum != null) {
      await page.evaluate((n) => { const sel = document.getElementById("unitNumSelect"); sel.value = String(n); sel.dispatchEvent(new Event("change", { bubbles: true })); }, unitNum);
      await page.waitForTimeout(1500);
    }
    await page.evaluate((a) => { const sel = document.getElementById("ayahSelect"); sel.value = String(a); sel.dispatchEvent(new Event("change", { bubbles: true })); }, ayah);
    await page.waitForTimeout(1500);
    return page.evaluate(() => {
      const panels = document.getElementById("ayahPanels");
      return {
        shown: getComputedStyle(panels).display !== "none",
        ayah: panels.dataset.ayahCollapsibleFor,
        prompts: panels.querySelectorAll("[data-end-of-unit-prompt]").length,
        markers: [...panels.querySelectorAll("[data-unit-marker]")].map((b) => b.dataset.unitMarker),
      };
    });
  };
  const j2end = await singleAyahState("juz", 2, 252);
  check(`[${lang}] Juz 2, āyah 2:252 (its last): the one-āyah view shows the prompt once`, j2end.shown && j2end.ayah === "ayah:2:252" && j2end.prompts === 1, JSON.stringify(j2end));
  const j2mid = await singleAyahState("juz", null, 251);
  check(`[${lang}] Juz 2, āyah 2:251: no prompt`, j2mid.ayah === "ayah:2:251" && j2mid.prompts === 0, JSON.stringify(j2mid));
  const j3 = await singleAyahState("juz", 3, 286);
  check(`[${lang}] Juz 3, āyah 2:286 (not its end, which is 3:92): no prompt`, j3.ayah === "ayah:2:286" && j3.prompts === 0, JSON.stringify(j3));
  check(`[${lang}] Juz 3's first āyah view carries its "Juz 3 begins" marker`, (await singleAyahState("juz", 3, 253)).markers.includes("juz:3"));
  const r1 = await singleAyahState("ruku", 1, 7);
  check(`[${lang}] Ruku' 1, āyah 2:7 (its last): the "Ruku' 1 ends" marker and the prompt`, r1.ayah === "ayah:2:7" && r1.markers.includes("ruku:2:1") && r1.prompts === 1, JSON.stringify(r1));
  // The marker on the one-āyah view opens the Unit Card too.
  await clickSafely(page, '#ayahPanels [data-unit-marker="ruku:2:1"]');
  await page.waitForTimeout(400);
  check(`[${lang}] the one-āyah view's Ruku' marker opens the Unit Card for ruku:2:1`, (await page.evaluate(() => document.querySelector("[data-unit-card]")?.dataset.unitKey)) === "ruku:2:1");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  const real = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID|FAILED)/.test(e));
  check(`[${lang}] no unexpected page errors across the whole scenario`, real.length === 0, real.join("; "));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Unit Card (issue #348): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
