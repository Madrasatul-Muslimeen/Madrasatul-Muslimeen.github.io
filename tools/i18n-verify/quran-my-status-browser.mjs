// Issue #328 -- "My Status", the whole-Qur'an wheel (Owner decisions 6-8,
// 27 Sep 2026), RENDERED acceptance QA in a real browser, following this
// project's own established practice for a focused, committed browser
// suite. Written here, NOT run here -- this sandbox has no Playwright
// browser binaries installed, the same documented, repeated environment gap
// CLAUDE.md records for every browser-driven suite in this directory. The
// Architect/CI should run this for real before it is trusted.
//
// SCOPE, matching issue #328's own "Prove it" section:
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
// EXTENDED for issue #341, matching that issue's own "Prove it" section:
//   6. An Approach's own detail opens as a CARD ON TOP -- fully on screen,
//      the list's own scroll position unchanged, nothing appended below the
//      list, the header pull-down switches Approach in place, ✕/Escape close
//      it back to the list.
//   7. "By unit" (Juz/Surah/Ruku'/Hizb) figures against a seeded Juz claim,
//      for a YES and a NO Approach, plus an āyah-level Learning claim
//      counting as Started rather than Achieved -- every figure computed
//      independently here from the real packaged indexes via the SAME
//      exported summarizeUnitCoverage()/poolStatus() the app itself calls,
//      never a hand-typed number (the class of independence
//      quran-word-total-boundary.mjs's own juz-word-totals check already
//      uses).
//   8. A Juz-wheel slice inside the detail opens Explore already drilled
//      down to that Juz, on the same Approach.
//
// Real APPROACH_TEMPLATES ids (approach_01..approach_30) are seeded via
// `seedTemplates`, exactly like quranrevival-startup-reads.mjs already does
// -- the default fixture's own trackables use short synthetic ids
// ("memorise", "hifz", ...) that do not correspond to DEFAULT_YES_
// TRACKABLE_IDS at all, so this suite needs the real catalogue to exercise
// the real Yes/No defaults.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
import { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } from "../../app/js/catalogue-data.js";
import { ayahCoverage } from "../../app/js/approach-coverage.js";
import { buildUnitKey, localRukuIndexFromTable } from "../../app/js/unit-keys.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataRoot = path.join(here, "..", "quran-data-pull", "output");

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

// Three records chunks (the default fixture only ever seeds surah_1 and
// subject_asma_ul_husna -- see firebase-stub.mjs's own comment on that):
// surah 3 (Aal-i-Imraan, 200 ayat) claimed Achieved for the YES Approach;
// surah 112 (Al-Ikhlas, 4 ayat) claimed Achieved for the NO one, PLUS
// (issue #341) each of its 4 āyāt claimed Learning for the YES Approach --
// a small unit, entirely inside it, isolates "Learning counts as Started,
// not Achieved" from the surah-wide claim above, which is a different
// Approach's own claim and cannot interact with it; and (issue #341)
// subject_quran carries a Juz 1 claim, Achieved, for BOTH Approaches --
// Owner decision 6's own worked comparison (Yes floors every āyah inside;
// No is a whole-unit claim only).
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
    "ayah:112:1::${YES_ID}": { unitType: "ayah", subjectId: "quran", trackableId: "${YES_ID}",
      claimedStatus: "learning", claimedByPersonId: "p1", confirmedStatus: null,
      confirmState: "pending", domainIds: [], notes: "" },
    "ayah:112:2::${YES_ID}": { unitType: "ayah", subjectId: "quran", trackableId: "${YES_ID}",
      claimedStatus: "learning", claimedByPersonId: "p1", confirmedStatus: null,
      confirmState: "pending", domainIds: [], notes: "" },
    "ayah:112:3::${YES_ID}": { unitType: "ayah", subjectId: "quran", trackableId: "${YES_ID}",
      claimedStatus: "learning", claimedByPersonId: "p1", confirmedStatus: null,
      confirmState: "pending", domainIds: [], notes: "" },
    "ayah:112:4::${YES_ID}": { unitType: "ayah", subjectId: "quran", trackableId: "${YES_ID}",
      claimedStatus: "learning", claimedByPersonId: "p1", confirmedStatus: null,
      confirmState: "pending", domainIds: [], notes: "" },
  } },
  { _id: TENANT_ID + "__p1__subject_quran", tenantId: TENANT_ID, personId: "p1", chunkKey: "subject_quran", entries: {
    "juz:1::${YES_ID}": { unitType: "juz", subjectId: "quran", trackableId: "${YES_ID}",
      claimedStatus: "achieved", claimedByPersonId: "p1", confirmedStatus: "achieved",
      confirmState: "confirmed", domainIds: [], notes: "" },
    "juz:1::${NO_ID}": { unitType: "juz", subjectId: "quran", trackableId: "${NO_ID}",
      claimedStatus: "achieved", claimedByPersonId: "p1", confirmedStatus: "achieved",
      confirmState: "confirmed", domainIds: [], notes: "" },
  } }
);
`;

// =============================================================================
// Issue #341 -- the "By unit" figures, computed INDEPENDENTLY here from the
// real packaged indexes and the SAME shared functions the app itself calls
// (summarizeUnitCoverage()/poolStatus()), fed with a hand-built picture of
// exactly what MY_STATUS_SEED above wrote -- never a hand-typed expected
// number. This is what proves the CARD's own wiring (Firestore data through
// to rendered text), not the pooling rule itself (already pure-suite-proven
// in approach-coverage.mjs).
// =============================================================================
const surahIndexData = JSON.parse(fs.readFileSync(path.join(dataRoot, "surah-index.json"), "utf8"));
const juzIndexFixture = JSON.parse(fs.readFileSync(path.join(dataRoot, "juz-index.json"), "utf8"));
const hizbIndexFixture = JSON.parse(fs.readFileSync(path.join(dataRoot, "hizb-index.json"), "utf8"));
const rukuIndexFixture = JSON.parse(fs.readFileSync(path.join(dataRoot, "ruku-index.json"), "utf8"));
const rukuLocalIdx = localRukuIndexFromTable(rukuIndexFixture);

function coverageOf(startSurah, startAyah, endSurah, endAyah) {
  return ayahCoverage(startSurah, startAyah, endSurah, endAyah, surahIndexData);
}
const juzUnitsFixture = juzIndexFixture.map((j) => ({ key: buildUnitKey.juz(j.juz), coverage: coverageOf(j.startSurah, j.startAyah, j.endSurah, j.endAyah) }));
const surahUnitsFixture = surahIndexData.map((s) => ({ key: buildUnitKey.surah(s.surahNumber), coverage: [{ surah: s.surahNumber, from: 1, to: s.ayahCount }] }));
const rukuUnitsFixture = rukuIndexFixture.map((r) => ({ key: buildUnitKey.ruku(r.surah, rukuLocalIdx.get(r.ruku)), coverage: [{ surah: r.surah, from: r.fromAyah, to: r.toAyah }] }));
const hizbUnitsFixture = hizbIndexFixture.map((h) => ({ key: buildUnitKey.hizb(h.hizb), coverage: coverageOf(h.startSurah, h.startAyah, h.endSurah, h.endAyah) }));

const juz1 = juzIndexFixture.find((j) => j.juz === 1);
const surah3AyahCount = surahIndexData.find((s) => s.surahNumber === 3).ayahCount;
const juz1Spans = coverageOf(juz1.startSurah, juz1.startAyah, juz1.endSurah, juz1.endAyah).map((c) => ({ ...c, statusId: "achieved" }));
const surah3Span = { surah: 3, from: 1, to: surah3AyahCount, statusId: "achieved" };

const yesOwnAyah = new Map([["112:1", "learning"], ["112:2", "learning"], ["112:3", "learning"], ["112:4", "learning"]]);
const yesOwnStatus = (surah, ayah) => yesOwnAyah.get(`${surah}:${ayah}`) ?? "not_started";
const yesSpans = [...juz1Spans, surah3Span];
const yesDirectWideStatus = new Map([["juz:1", "achieved"], ["surah:3", "achieved"]]);
const yesTrackable = { id: YES_ID };

const noDirectWideStatus = new Map([["juz:1", "achieved"], ["surah:112", "achieved"]]);
const noTrackable = { id: NO_ID };

// ARCHITECT REVIEW, 28 Sep 2026: EXPECTED used to be computed by calling
// summarizeUnitCoverage() -- the function under test -- so a defect in it
// moved both sides and every count check still passed (the v08.86 lesson:
// a check that compares the code with itself). It is now an INDEPENDENT
// count: plain sets of the āyāt the seed makes Achieved / Learning for each
// Approach, a unit reading Achieved only if every āyah in it is Achieved and
// Started if every āyah is at least Learning, and a No Approach reading only
// its direct whole-unit claims. No app function is called here.
function ayahsOf(coverage) {
  const out = [];
  for (const { surah, from, to } of coverage) for (let a = from; a <= to; a++) out.push(`${surah}:${a}`);
  return out;
}
const yesAchieved = new Set([...ayahsOf(coverageOf(juz1.startSurah, juz1.startAyah, juz1.endSurah, juz1.endAyah)), ...ayahsOf([{ surah: 3, from: 1, to: surah3AyahCount }])]);
const yesLearning = new Set(["112:1", "112:2", "112:3", "112:4"]);
function countYes(units) {
  let achievedOrMastered = 0, started = 0;
  for (const u of units) {
    const all = ayahsOf(u.coverage);
    if (all.every((k) => yesAchieved.has(k))) achievedOrMastered++;
    else if (all.every((k) => yesAchieved.has(k) || yesLearning.has(k))) started++;
  }
  return { achievedOrMastered, started, total: units.length };
}
function countNo(units) {
  const direct = new Set(["juz:1", "surah:112"]);
  return { achievedOrMastered: units.filter((u) => direct.has(u.key)).length, started: 0, total: units.length };
}
const EXPECTED = {
  yes: { juz: countYes(juzUnitsFixture), surah: countYes(surahUnitsFixture), ruku: countYes(rukuUnitsFixture), hizb: countYes(hizbUnitsFixture) },
  no: { juz: countNo(juzUnitsFixture), surah: countNo(surahUnitsFixture) },
};
// Pinned by hand as well, so a fixture drift cannot move the expectation
// silently: Juz 1 + all of Aal-i-Imraan -> Juz 1, Surahs 1 and 3 (Al-Ikhlas
// Started), Hizb 4 (Juz 1's two, plus Hizb 6 = 3:15-92 and Hizb 7 = 3:93-170,
// both wholly inside Aal-i-Imraan), and Ruku' 37 (every Ruku' of Al-Fatiha,
// Al-Baqarah up to 2:141 and Aal-i-Imraan; Al-Ikhlas's one Ruku' Started).
if (EXPECTED.yes.juz.achievedOrMastered !== 1 || EXPECTED.yes.surah.achievedOrMastered !== 2 || EXPECTED.yes.surah.started !== 1
    || EXPECTED.yes.hizb.achievedOrMastered !== 4 || EXPECTED.yes.ruku.achievedOrMastered !== 37 || EXPECTED.yes.ruku.started !== 1 || EXPECTED.no.juz.achievedOrMastered !== 1 || EXPECTED.no.surah.achievedOrMastered !== 1) {
  throw new Error(`fixture expectation drifted: ${JSON.stringify(EXPECTED)}`);
}
console.log(`  [fixture] EXPECTED YES juz=${JSON.stringify(EXPECTED.yes.juz)} surah=${JSON.stringify(EXPECTED.yes.surah)} ruku=${JSON.stringify(EXPECTED.yes.ruku)} hizb=${JSON.stringify(EXPECTED.yes.hizb)}`);
console.log(`  [fixture] EXPECTED NO juz=${JSON.stringify(EXPECTED.no.juz)} surah=${JSON.stringify(EXPECTED.no.surah)}`);

/** The same {en, bn} shape catalogue-data.js's own nameLang()/en() produce -- a small local reader rather than importing the app's real langText() (which needs a currentLang/fallback context this standalone fixture computation does not have). */
function langText(nameObj, lang) {
  return nameObj?.[lang] ?? nameObj?.en ?? "";
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
function toBn(n) { return String(n).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]); }
function numFmt(lang, n) { return lang === "bn" ? toBn(n) : String(n); }

/** The EXACT text renderMyStatusUnitSectionHtml() prints for one row --
 *  built from the same two translation strings bn.js carries (compared by
 *  full-string equality, not by parsing digits back out, which the
 *  Bangla-puts-the-total-first trap this suite's own firstNumberIn() already
 *  documents makes unsafe for THIS string's differing argument order). */
function expectedUnitFigureText(lang, n, total, m) {
  if (lang === "bn") return `অর্জিত + দক্ষ: ${numFmt(lang, total)}টির মধ্যে ${numFmt(lang, n)}টি · শুরু হয়েছে: ${numFmt(lang, m)}টি`;
  return `Achieved + Mastered: ${numFmt(lang, n)} of ${numFmt(lang, total)} · Started: ${numFmt(lang, m)}`;
}

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
    // 28 Sep 2026: the heading's #myStatusBtn is back on phones (<=721px);
    // #myStatusWideBtn is the tablet/PC one. Earlier note kept below.
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

  // Updated in place again 28 Sep 2026: on a phone (this scenario is 390px)
  // "My Status" is the Mastery Wheel bar's #myStatusBtn once more; tablet/PC
  // show #myStatusWideBtn in the one-row band. Press whichever is displayed.
  const statusBtnId = await page.evaluate(() => ["myStatusBtn", "myStatusWideBtn"]
    .find((id) => { const el = document.getElementById(id); return el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0; }));
  check(`[${lang}] a "My Status" button is displayed (#myStatusBtn at 390px)`, statusBtnId === "myStatusBtn", String(statusBtnId));
  await clickSafely(page, `#${statusBtnId}`);
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

  // ===========================================================================
  // Issue #341 part 1 -- the detail opens as a CARD ON TOP, not appended.
  // ===========================================================================

  // Scroll the LIST first, so "closing returns to the list exactly where the
  // reader was" is a real round trip, not a coincidence of starting at 0.
  await page.evaluate(() => { document.getElementById("myStatusBody").scrollTop = 40; });
  const scrollBefore = await page.evaluate(() => document.getElementById("myStatusBody").scrollTop);

  await clickSafely(page, `[data-my-status-open="${YES_ID}"]`);
  await page.waitForFunction(() => document.getElementById("myStatusDetailMount") && !document.getElementById("myStatusDetailMount").hidden, null, { timeout: 5000 });

  const openState = await page.evaluate(() => {
    const mount = document.getElementById("myStatusDetailMount");
    const card = document.getElementById("myStatusDetailCard");
    const r = card.getBoundingClientRect();
    return {
      mountHidden: mount.hidden,
      onScreen: r.width > 0 && r.height > 0 && r.left >= -1 && r.top >= -1 && r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1,
      appendedBelowList: document.querySelectorAll("#myStatusBody .my-status-detail").length,
    };
  });
  check(`[${lang}] tapping a row opens the detail card fully inside the viewport`, openState.mountHidden === false && openState.onScreen, JSON.stringify(openState));
  check(`[${lang}] nothing is appended below the list`, openState.appendedBelowList === 0, JSON.stringify(openState));

  // The pull-down switches the Approach in place, without closing the card.
  await page.selectOption("#myStatusDetailApproachSelect", NO_ID);
  await page.waitForTimeout(150);
  const afterPulldown = await page.evaluate(() => ({
    mountHidden: document.getElementById("myStatusDetailMount").hidden,
    heading: document.querySelector("#myStatusDetailBody h3")?.textContent ?? "",
  }));
  const noName = langText(noTemplate.name, lang);
  check(`[${lang}] the pull-down redraws the card for the newly chosen Approach without closing it`, afterPulldown.mountHidden === false && afterPulldown.heading === noName, JSON.stringify(afterPulldown));

  // ✕ closes the detail card, back to the list -- #myStatusBody untouched,
  // so its own scroll position survived the whole round trip.
  await clickSafely(page, "#myStatusDetailCloseBtn");
  await page.waitForFunction(() => document.getElementById("myStatusDetailMount")?.hidden === true, null, { timeout: 5000 });
  const scrollAfterClose = await page.evaluate(() => document.getElementById("myStatusBody").scrollTop);
  check(`[${lang}] the list's own scroll position is unchanged by opening and closing the detail card`, scrollAfterClose === scrollBefore, `before=${scrollBefore} after=${scrollAfterClose}`);
  check(`[${lang}] the sheet itself is still open after closing just the detail`, (await page.evaluate(() => document.getElementById("myStatusMount").hidden)) === false);

  // Escape closes the detail card too.
  await clickSafely(page, `[data-my-status-open="${YES_ID}"]`);
  await page.waitForFunction(() => !document.getElementById("myStatusDetailMount").hidden, null, { timeout: 5000 });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  const afterEscape = await page.evaluate(() => ({
    detailHidden: document.getElementById("myStatusDetailMount").hidden,
    sheetHidden: document.getElementById("myStatusMount").hidden,
  }));
  check(`[${lang}] Escape closes just the detail card, leaving the sheet open`, afterEscape.detailHidden === true && afterEscape.sheetHidden === false, JSON.stringify(afterEscape));

  // Tapping an OVERVIEW WHEEL SLICE opens the card too, same as a row.
  const wheelSliceOpen = await page.evaluate((id) => {
    const seg = document.querySelector(`#myStatusOverviewWheel .wheel-seg[data-key="${id}"]`);
    if (!seg) return { found: false };
    seg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return { found: true };
  }, YES_ID);
  await page.waitForFunction(() => !document.getElementById("myStatusDetailMount").hidden, null, { timeout: 5000 });
  const wheelOpenState = await page.evaluate(() => ({
    mountHidden: document.getElementById("myStatusDetailMount").hidden,
    heading: document.querySelector("#myStatusDetailBody h3")?.textContent ?? "",
  }));
  const yesName = langText(yesTemplate.name, lang);
  check(`[${lang}] tapping the overview wheel's own slice also opens the detail card, on the SAME Approach`,
    wheelSliceOpen.found && wheelOpenState.mountHidden === false && wheelOpenState.heading === yesName,
    JSON.stringify({ wheelSliceOpen, wheelOpenState }));
  await clickSafely(page, "#myStatusDetailCloseBtn");

  // ===========================================================================
  // Issue #341 part 2 -- "By unit" figures, against EXPECTED (computed above
  // from the real packaged indexes and the shared pooling functions, never a
  // hand-typed number).
  // ===========================================================================

  /** A jump-target row's own figure text ("juz"/"surah"/"ruku"), by its
   *  data-my-status-unit-jump attribute -- the same one the click handler
   *  reads. */
  async function readUnitRowFigure(kind) {
    return page.evaluate((k) => {
      const row = document.querySelector(`[data-my-status-unit-jump="${k}"]`);
      return row ? row.querySelector(".my-status-row-figure")?.textContent ?? "" : null;
    }, kind);
  }

  await clickSafely(page, `[data-my-status-open="${YES_ID}"]`);
  await page.waitForFunction(() => !document.getElementById("myStatusDetailMount").hidden, null, { timeout: 5000 });
  const yesJuzFigure = await readUnitRowFigure("juz");
  const yesSurahFigure = await readUnitRowFigure("surah");
  const yesRukuFigure = await readUnitRowFigure("ruku");
  // UPDATED IN PLACE, issue #342, reason recorded: this used to read the
  // Hizb figure off the one `.my-status-row-static` row and assert Hizb had
  // NO data-my-status-unit-jump at all, because Hizb had no Explore level to
  // jump to. It has one now (Explore's own Hizb view, issue #342), so the
  // row is a button exactly like Juz/Surah/Ruku', read through the same
  // readUnitRowFigure() helper -- the pin is inverted, not removed.
  const yesHizbFigure = await readUnitRowFigure("hizb");
  check(`[${lang}] By unit -- Juz: ${EXPECTED.yes.juz.achievedOrMastered} of ${EXPECTED.yes.juz.total}, Started ${EXPECTED.yes.juz.started} (YES Approach)`,
    yesJuzFigure === expectedUnitFigureText(lang, EXPECTED.yes.juz.achievedOrMastered, EXPECTED.yes.juz.total, EXPECTED.yes.juz.started),
    `got="${yesJuzFigure}"`);
  check(`[${lang}] By unit -- Surah: ${EXPECTED.yes.surah.achievedOrMastered} of ${EXPECTED.yes.surah.total}, Started ${EXPECTED.yes.surah.started} (YES Approach, includes the Learning->Started surah 112 claim)`,
    yesSurahFigure === expectedUnitFigureText(lang, EXPECTED.yes.surah.achievedOrMastered, EXPECTED.yes.surah.total, EXPECTED.yes.surah.started),
    `got="${yesSurahFigure}"`);
  check(`[${lang}] By unit -- Ruku': ${EXPECTED.yes.ruku.achievedOrMastered} of ${EXPECTED.yes.ruku.total}, Started ${EXPECTED.yes.ruku.started} (YES Approach)`,
    yesRukuFigure === expectedUnitFigureText(lang, EXPECTED.yes.ruku.achievedOrMastered, EXPECTED.yes.ruku.total, EXPECTED.yes.ruku.started),
    `got="${yesRukuFigure}"`);
  check(`[${lang}] By unit -- Hizb: ${EXPECTED.yes.hizb.achievedOrMastered} of ${EXPECTED.yes.hizb.total} (YES Approach)`,
    yesHizbFigure === expectedUnitFigureText(lang, EXPECTED.yes.hizb.achievedOrMastered, EXPECTED.yes.hizb.total, EXPECTED.yes.hizb.started),
    `got="${yesHizbFigure}"`);
  // MUTATION control: reverting issue #342's `jump: true` for Hizb back to
  // `jump: false` makes this fail (0 static rows becomes 1, no element
  // answers the selector) -- proving the check really distinguishes the two
  // shapes rather than passing regardless.
  const hizbIsButton = await page.evaluate(() => !!document.querySelector('[data-my-status-unit-jump="hizb"]') && document.querySelectorAll("#myStatusDetailBody .my-status-row-static").length === 0);
  check(`[${lang}] the Hizb row is a button now -- issue #342 gave Hizb its own Explore level`, hizbIsButton);

  await clickSafely(page, "#myStatusDetailCloseBtn");
  await clickSafely(page, `[data-my-status-open="${NO_ID}"]`);
  await page.waitForFunction(() => !document.getElementById("myStatusDetailMount").hidden, null, { timeout: 5000 });
  const noJuzFigure = await readUnitRowFigure("juz");
  const noSurahFigure = await readUnitRowFigure("surah");
  check(`[${lang}] By unit -- Juz: ${EXPECTED.no.juz.achievedOrMastered} of ${EXPECTED.no.juz.total} (NO Approach -- the same Juz claim still counts as a whole-unit claim)`,
    noJuzFigure === expectedUnitFigureText(lang, EXPECTED.no.juz.achievedOrMastered, EXPECTED.no.juz.total, EXPECTED.no.juz.started),
    `got="${noJuzFigure}"`);
  check(`[${lang}] By unit -- Surah: ${EXPECTED.no.surah.achievedOrMastered} of ${EXPECTED.no.surah.total} (NO Approach -- Owner decision 6, never pools into the ayah-level tally)`,
    noSurahFigure === expectedUnitFigureText(lang, EXPECTED.no.surah.achievedOrMastered, EXPECTED.no.surah.total, EXPECTED.no.surah.started),
    `got="${noSurahFigure}"`);

  // Look for the "studied as a whole" line -- the claim must be visible
  // SOMEWHERE, just not in the ayah tally.
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
    detailHidden: document.getElementById("myStatusDetailMount")?.hidden,
    exploreVisible: document.getElementById("exploreView")?.hidden === false,
    trackableSelectValue: document.getElementById("trackableSelect")?.value,
    exploreTabPressed: document.getElementById("tabExploreBtn")?.getAttribute("aria-pressed"),
  }), NO_ID);
  check(`[${lang}] "See in Explore" closes the sheet, detail card included`, exploreState.sheetHidden === true && exploreState.detailHidden === true, JSON.stringify(exploreState));
  check(`[${lang}] "See in Explore" opens the Explore stage view`, exploreState.exploreVisible === true && exploreState.exploreTabPressed === "true", JSON.stringify(exploreState));
  check(`[${lang}] "See in Explore" selects the SAME Approach that was open`, exploreState.trackableSelectValue === NO_ID, JSON.stringify(exploreState));

  await ctx.close();
}

// =============================================================================
// Issue #341 part 3/8 -- a Juz-wheel slice inside an Approach's own detail
// opens Explore ALREADY DRILLED DOWN to that Juz, on the same Approach. A
// fresh context/page: the scenario above already leaves My Status closed and
// Explore open by the time it finishes, so this needs its own clean start.
// =============================================================================
async function runJuzSliceScenario(lang) {
  const ctx = await newContext(browser, {
    banner: false, viewport: { width: 390, height: 844 }, appLang: lang,
    seedTemplates: SEED_TEMPLATES, extraSeedJs: MY_STATUS_SEED,
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await waitForWheelReady(page);

  await clickSafely(page, "#myStatusBtn");
  await page.waitForFunction(() => document.getElementById("myStatusBody")?.querySelectorAll(".my-status-row-btn").length > 0, null, { timeout: 10000 });
  await clickSafely(page, `[data-my-status-open="${YES_ID}"]`);
  await page.waitForFunction(() => !document.getElementById("myStatusDetailMount").hidden, null, { timeout: 5000 });
  await page.waitForFunction(() => !!document.getElementById("myStatusJuzWheel")?.querySelector("svg"), null, { timeout: 5000 });

  // Juz 3's own wedge, by data-key -- the same attribute attachScopedWheelClickHandler() reads.
  await page.click('#myStatusJuzWheel .wheel-seg[data-key="3"]');
  await page.waitForTimeout(500);

  const state = await page.evaluate((id) => ({
    sheetHidden: document.getElementById("myStatusMount")?.hidden,
    exploreVisible: document.getElementById("exploreView")?.hidden === false,
    trackableSelectValue: document.getElementById("trackableSelect")?.value,
    exploreCrumb: [...document.querySelectorAll(".explore-crumb")].map((c) => c.textContent).join(" > "),
  }), YES_ID);
  check(`[${lang}] tapping Juz 3's wedge closes My Status`, state.sheetHidden === true, JSON.stringify(state));
  check(`[${lang}] ...and opens Explore`, state.exploreVisible === true, JSON.stringify(state));
  check(`[${lang}] ...on the SAME Approach that was open`, state.trackableSelectValue === YES_ID, JSON.stringify(state));
  // num() prints "3" in English and "৩" in Bangla -- either is proof the
  // crumb names Juz 3, not Juz 1 (openExplore()'s own reset value).
  check(`[${lang}] ...already drilled down to Juz 3`, /3|৩/.test(state.exploreCrumb), `crumb="${state.exploreCrumb}"`);

  await ctx.close();
}

// ARCHITECT REVIEW, 28 Sep 2026 -- decision 7 ("Explore and My Status must
// always agree") compared against EXPLORE ITSELF, not a recomputation: tap
// the card's Juz / Surah row, then count the units Explore's own list marks
// Achieved/Mastered and Started (its `chip-<status>` class).
async function runExploreAgreementScenario() {
  const ctx = await newContext(browser, {
    banner: false, viewport: { width: 1100, height: 844 }, appLang: "en",
    seedTemplates: SEED_TEMPLATES, extraSeedJs: MY_STATUS_SEED,
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await waitForWheelReady(page);
  for (const kind of ["juz", "surah", "hizb"]) { // hizb added with #342: its row now opens Explore's Hizb view
    await clickSafely(page, "#tabApproachBtn"); // back from Explore after the first pass
    await clickSafely(page, "#myStatusWideBtn");
    await page.waitForFunction(() => document.getElementById("myStatusBody")?.querySelectorAll(".my-status-row-btn").length > 0, null, { timeout: 10000 });
    await clickSafely(page, `[data-my-status-open="${YES_ID}"]`);
    await page.waitForFunction(() => !document.getElementById("myStatusDetailMount").hidden, null, { timeout: 5000 });
    const cardFigure = await page.evaluate((k) => document.querySelector(`[data-my-status-unit-jump="${k}"] .my-status-row-figure`)?.textContent ?? "", kind);
    await clickSafely(page, `[data-my-status-unit-jump="${kind}"]`);
    const want = { juz: 30, surah: 114, hizb: 60 }[kind];
    let counts = null;
    for (let i = 0; i < 60; i++) {
      counts = await page.evaluate(() => {
        const chips = [...document.querySelectorAll("#exploreSidebarContainer .status-chip")];
        const has = (c, ...names) => names.some((n) => c.classList.contains(`chip-${n}`));
        return { rows: chips.length, done: chips.filter((c) => has(c, "achieved", "mastered")).length, started: chips.filter((c) => has(c, "learning", "practising")).length };
      });
      if (counts.rows === want) break;
      await page.waitForTimeout(100);
    }
    const exp = EXPECTED.yes[kind];
    check(`[en] ${kind}: Explore's own list has all ${want} units`, counts.rows === want, JSON.stringify(counts));
    check(`[en] ${kind}: Explore colours ${exp.achievedOrMastered} Achieved/Mastered and ${exp.started} Started -- the same as the card`,
      counts.done === exp.achievedOrMastered && counts.started === exp.started
        && cardFigure === expectedUnitFigureText("en", counts.done, want, counts.started),
      `explore=${JSON.stringify(counts)} card="${cardFigure}"`);
  }
  await ctx.close();
}

for (const lang of ["en", "bn"]) await runScenarios(lang);
for (const lang of ["en", "bn"]) await runJuzSliceScenario(lang);
await runExploreAgreementScenario();

await browser.close();
console.log(`\n==== "My Status" (issue #328/#341) browser suite: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
