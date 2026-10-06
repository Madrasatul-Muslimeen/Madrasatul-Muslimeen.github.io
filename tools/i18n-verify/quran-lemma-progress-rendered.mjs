// Issue #303 -- RENDERED acceptance QA for the Word Card's whole-Qur'an/
// lemma numbers, in a real browser, in both languages, at the two widths the
// issue named (390/1100).
//
// UPDATED IN PLACE FOR ISSUE #322, reason recorded: the Owner's report --
// "user don't need to double click to confirm 'mark the word known
// everywhere', this is only a double work" -- removed the dedicated "Mark
// this word known everywhere" row (`lemmaEverywhereBlock()`,
// `[data-lemma-progress-*]`) entirely. The Word progress buttons
// (`[data-word-progress-state]`) now drive BOTH lanes: setting an
// occurrence's state mirrors the same state onto its Dictionary Word's own
// lemma-wide claim, and a supervisor confirm/return mirrors too. Every check
// below that used to click the second row's own control now clicks the
// FIRST row instead and asserts the SAME lemma-wide effect follows from it;
// the "the LEMMA-WIDE button now shows achieved" check is gone outright (no
// such button exists any more) and a new check asserts the row itself is
// absent from the DOM.
//
// Everything below is read off the RENDERED page -- real text, real writes
// (via __stubWriteData) and real reads (via __fsLog) -- never off the
// source and never off `.hidden`.
//
// THE GATE: app/js/study-lemma-progress-readiness.js reads `ready: true` in
// this repository (the Owner published the Rules 26 Sep 2026 -- see that
// file's own header). The first block below proves the real, open-gate
// behaviour against the real file. "With the gate forced open" cases ALSO
// route a REPLACEMENT copy of that one module in (ctx.route(), the same
// interception technique harness.mjs already uses for the Firestore SDK
// itself) -- identical exports, `ready: true` with a well-formed decision --
// so the claim/confirm path is exercised a second way, decoupled from
// whatever the real declaration says on a future run. Nothing else is
// faked: the real quran-lemma-progress.js/-data.js run underneath, against
// the same in-memory Firebase stub every other suite here uses.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

// The lemma shared by Al-Fatihah 1:5's own words 1 ("إِيَّاكَ") and 3
// ("وَإِيَّاكَ") -- read directly out of the real packaged corpus rather than
// retyped, the same standing lesson quran-lemma-progress-model.mjs already
// follows (a hand-copied Arabic string can silently pick up a different
// Unicode normalization and stop matching the very key it was copied from).
// Chosen for a SMALL total occurrence count (24) so the bounded counter's
// one-time seed walk this suite exercises stays fast, and because BOTH
// occurrences sit in one already-loaded ayah, needing no cross-surah
// navigation to prove the cross-occurrence update on screen.
const s1 = JSON.parse(fs.readFileSync(path.join(repoRoot, "tools/quran-data-pull/output/surahs/surah_001.json"), "utf8"));
const ayah5 = s1.ayahs.find((a) => a.ayah === 5);
const word1 = ayah5.words.find((w) => w.position === 1);
const word3 = ayah5.words.find((w) => w.position === 3);
if (word1.morphology.lemma !== word3.morphology.lemma) {
  throw new Error("fixture assumption broke: Al-Fatihah 1:5 words 1 and 3 no longer share a lemma -- pick a new fixture pair");
}
const lemmaIndex = JSON.parse(fs.readFileSync(path.join(repoRoot, "tools/quran-data-pull/output/lemmas-index.json"), "utf8"));
const LEMMA_OCCURRENCE_COUNT = (lemmaIndex.values[word1.morphology.lemma] || []).length;
if (!(LEMMA_OCCURRENCE_COUNT > 0 && LEMMA_OCCURRENCE_COUNT < 200)) {
  throw new Error(`fixture assumption broke: the shared lemma now has ${LEMMA_OCCURRENCE_COUNT} occurrences -- pick a smaller-count fixture`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// A gate-FORCED-OPEN replacement for study-lemma-progress-readiness.js --
// identical shape and exports to the real file, `ready: true` with a
// well-formed governed decision. Routed in ONLY for the contexts that ask
// for it below.
const FORCED_OPEN_READINESS_SOURCE = `
export const LEMMA_PROGRESS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const LEMMA_PROGRESS_PERSISTENCE_DECLARATION = Object.freeze({
  ready: true,
  decision: Object.freeze({ by: "master-architect", on: "2026-09-26", reference: "test-forced-open" }),
  gate: "E1",
  note: "forced open for tools/i18n-verify/quran-lemma-progress-rendered.mjs",
});
const ISO_DATE = /^\\d{4}-\\d{2}-\\d{2}$/;
export function isLemmaProgressPersistenceReady(declaration = LEMMA_PROGRESS_PERSISTENCE_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!LEMMA_PROGRESS_READINESS_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on)) return false;
  if (typeof d.reference !== "string" || d.reference.trim() === "") return false;
  return true;
}
export const REASON_LEMMA_PROGRESS_NOT_DEPLOYED = "lemma-progress-rules-not-deployed";
export const REASON_LEMMA_PROGRESS_DECISION_INCOMPLETE = "lemma-progress-readiness-decision-incomplete";
export function lemmaProgressUnavailableReason(declaration = LEMMA_PROGRESS_PERSISTENCE_DECLARATION) {
  if (isLemmaProgressPersistenceReady(declaration)) return null;
  if (declaration && declaration.ready === true) return REASON_LEMMA_PROGRESS_DECISION_INCOMPLETE;
  return REASON_LEMMA_PROGRESS_NOT_DEPLOYED;
}
`;

async function newLemmaContext(browser, opts, { forceGateOpen = false } = {}) {
  const ctx = await newContext(browser, opts);
  if (forceGateOpen) {
    await ctx.route("**/js/study-lemma-progress-readiness.js", (route) =>
      route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: FORCED_OPEN_READINESS_SOURCE }));
  }
  return ctx;
}

// A seeded quranWordTotals document so Numbers 1/2 (the whole-Qur'an
// running total) have something real to show from the very first render --
// that collection's own gate (study-wbw-total-readiness.js) already reads
// `ready: true` in this repository, independent of the lemma gate.
const SEEDED_KNOWN = 5;
const SEED_TOTALS = `
DATA.quranWordTotals = [{
  _id: TENANT_ID + "__p1", contractVersion: "quran-word-total:v1",
  tenantId: TENANT_ID, personId: "p1", total: 77429, known: ${SEEDED_KNOWN},
  byJuz: { "1": { known: ${SEEDED_KNOWN}, total: 2580 } },
}];
`;

async function enterReadWithWbw(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const t = document.getElementById("wbwShowToggle");
    if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); }
    // Architect review: the Read screen opens on 1:1 in Single Ayah mode, so
    // 1:5's words are not on screen until āyah 5 is chosen -- without this
    // the suite clicked an element that did not exist and read nothing.
    const a = document.getElementById("ayahSelect");
    if (a && a.value !== "5") { a.value = "5"; a.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(800);
  const present = await page.evaluate(() => !!document.querySelector('[data-word-occurrence$=":1:5:1"]'));
  if (!present) throw new Error("precondition: Al-Fatihah 1:5 word 1 is not on screen -- the suite would read nothing");
}

/** Open the Word Card on Al-Fatihah 1:5's word at `position`, and wait for its progress block to settle. */
async function openWordAt(page, position) {
  await page.evaluate((p) => {
    const el = document.querySelector(`[data-word-occurrence$=":1:5:${p}"]`);
    el?.click();
  }, position);
  await page.waitForFunction(() => {
    const block = document.querySelector("#quranWordCardMount [data-word-progress]");
    return !!block && !/Loading|লোড হচ্ছে/.test(block.querySelector(".word-progress-state")?.textContent ?? "");
  }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(350);
}

const toWestern = (s) => (s || "").replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09E6));

function readLemmaCard(page) {
  return page.evaluate(() => {
    const b = document.querySelector("#quranWordCardMount [data-word-progress]");
    if (!b) return null;
    return {
      wholeQuranLine: b.querySelector(".word-progress-whole-quran")?.textContent?.trim() ?? null,
      wholeQuranPercentLine: b.querySelector(".word-progress-whole-quran-percent")?.textContent?.trim() ?? null,
      shareOfQuranLine: b.querySelector(".word-card-share-of-quran")?.textContent?.trim() ?? null,
      learnDeltaLine: b.querySelector(".word-progress-learn-delta")?.textContent?.trim() ?? null,
      // Issue #322 -- the second row is gone; this is now an ABSENCE check.
      secondRowPresent: !!b.querySelector("[data-lemma-progress], [data-lemma-progress-state]"),
      coverage: b.querySelector(".word-progress-coverage")?.textContent?.trim() ?? null,
      // Owner, 2 Oct 2026: the total is "eye-catching, bold" -- read off the
      // RENDERED style, never the class name.
      wholeQuranStyle: (() => {
        const box = b.querySelector(".word-progress-whole-quran-box");
        const nums = box ? [...box.querySelectorAll(".word-progress-whole-quran-num")] : [];
        if (!box || !nums.length) return null;
        const p = getComputedStyle(box.querySelector("p")), n = getComputedStyle(nums[0]);
        return { numCount: nums.length, lineWeight: Number(p.fontWeight), lineSize: parseFloat(p.fontSize), numWeight: Number(n.fontWeight), numSize: parseFloat(n.fontSize), numColor: n.color, lineColor: p.color, boxBg: getComputedStyle(box).backgroundColor };
      })(),
      occurrenceStatePressed: [...b.querySelectorAll("[data-word-progress-state]")].find((el) => el.getAttribute("aria-pressed") === "true")?.dataset.wordProgressState ?? null,
    };
  });
}

function readCoverageNumbers(coverageText) {
  const western = toWestern(coverageText ?? "");
  return (western.match(/\d+/g) || []).map(Number);
}

// ===========================================================================
// THE REAL GATE, AS COMMITTED. UPDATED IN PLACE, 26 Sep 2026: this block
// proved the GATE-CLOSED behaviour while study-lemma-progress-readiness.js
// read `ready: false`. The Owner published the rules and the gate is open by
// governed decision, so the same page is now asserted OPEN: lemma documents
// are read, Number 4 counts the Dictionary Word's real total -- and
// (Architect review) merely viewing still writes NOTHING.
//
// UPDATED IN PLACE AGAIN FOR ISSUE #322, reason recorded: "the control is
// offered" USED to mean the second row; that row is gone, so this now
// asserts its ABSENCE instead -- the Word progress buttons are what drive
// the lemma-wide claim now, proved by the FORCED-OPEN block below.
// ===========================================================================
for (const [width, height] of [[390, 844], [1100, 900]]) {
  for (const lang of ["en", "bn"]) {
    console.log(`\n=== real gate (open), ${width}x${height}, appLang=${lang} ===`);
    const ctx = await newLemmaContext(browser, { appLang: lang, viewport: { width, height }, extraSeedJs: SEED_TOTALS }, { forceGateOpen: false });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await enterReadWithWbw(page);
    await openWordAt(page, 1);
    await page.waitForTimeout(1200);

    const lemmaReads = await page.evaluate(() => (window.__fsLog || []).filter((r) => /quranLemma/.test(r.col || "")).length);
    check(`[${lang} ${width}] gate open: the lemma collections are read`, lemmaReads > 0, String(lemmaReads));
    const viewWrites = await page.evaluate(() => (window.__fsLog || []).filter((r) => /setDoc|updateDoc|batchCommit|txCommit/.test(r.kind)).length);
    check(`[${lang} ${width}] merely viewing the Word Card writes NOTHING (no counter seeded on view)`, viewWrites === 0, String(viewWrites));

    const card = await readLemmaCard(page);
    check(`[${lang} ${width}] Number 1 -- whole-Qur'an known line renders`, !!card?.wholeQuranLine, JSON.stringify(card));
    check(`[${lang} ${width}] Number 1 -- names the seeded known count`, (card?.wholeQuranLine ?? "").includes(String(SEEDED_KNOWN)) || toWestern(card?.wholeQuranLine ?? "").includes(String(SEEDED_KNOWN)), card?.wholeQuranLine);
    check(`[${lang} ${width}] Number 2 -- whole-Qur'an percent line renders`, !!card?.wholeQuranPercentLine, JSON.stringify(card));
    // Owner, 2 Oct 2026: "Make these eye-catching, bold, make the wordings,
    // 'You know ... of .... words of the Quran'". Expected words hand-written.
    const YOU = { en: ["You know ", " of ", " words of the Qur'an"], bn: ["আপনি কুরআনের ", "টি শব্দের মধ্যে ", "টি জানেন"] }[lang];
    const YOU_PCT = { en: ["You know ", "% of the words of the Qur'an"], bn: ["আপনি কুরআনের ", "% শব্দ জানেন"] }[lang];
    check(`[${lang} ${width}] the total reads "${YOU.join("…")}"`, YOU.every((w) => (card?.wholeQuranLine ?? "").includes(w)), card?.wholeQuranLine);
    check(`[${lang} ${width}] the percent reads "${YOU_PCT.join("…")}"`, YOU_PCT.every((w) => (card?.wholeQuranPercentLine ?? "").includes(w)), card?.wholeQuranPercentLine);
    const st = card?.wholeQuranStyle;
    // UPDATED IN PLACE, 2 Oct 2026 -- the Owner published the Basic/Depth Rules
    // and that gate is open, so the box carries ONE pair of lines PER LEVEL
    // (decision 58: WbW, Basic, Depth), three numbers each: 3 x 3 = 9. The
    // per-level wording is proved in lemma-levels-browser.mjs.
    check(`[${lang} ${width}] both lines are bold (weight >= 700) and the numbers (three per level, three levels) bigger and heavier still`,
      !!st && st.numCount === 9 && st.lineWeight >= 700 && st.numWeight >= 800 && st.numSize >= st.lineSize * 1.15, JSON.stringify(st));
    check(`[${lang} ${width}] the numbers stand out in the card's accent colour, unlike the sentence`, !!st && st.numColor !== st.lineColor, JSON.stringify(st));
    check(`[${lang} ${width}] Number 3 -- this word's own share-of-Qur'an line renders (unaffected by the lemma gate)`, !!card?.shareOfQuranLine, JSON.stringify(card));
    check(`[${lang} ${width}] Number 3 -- names this lemma's real occurrence count`, toWestern(card?.shareOfQuranLine ?? "").includes(String(LEMMA_OCCURRENCE_COUNT)), card?.shareOfQuranLine);
    check(`[${lang} ${width}] Number 4 -- learn-delta line renders`, !!card?.learnDeltaLine, JSON.stringify(card));
    check(`[${lang} ${width}] Number 4 -- gate open counts the Dictionary Word's real total (${LEMMA_OCCURRENCE_COUNT}), not just this occurrence`, toWestern(card?.learnDeltaLine ?? "").includes(String(LEMMA_OCCURRENCE_COUNT)), card?.learnDeltaLine);
    check(`[${lang} ${width}] issue #322 -- no second "Mark this word known everywhere" row in the DOM`, card?.secondRowPresent === false, JSON.stringify(card));

    check(`[${lang} ${width}] no page errors`, errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
    await ctx.close();
  }
}

// ===========================================================================
// GATE FORCED OPEN -- pressing "Achieved" on the WORD PROGRESS buttons (the
// only control now) mirrors the claim onto the lemma, and marking one
// occurrence known updates ANOTHER occurrence of the same lemma on screen.
//
// UPDATED IN PLACE FOR ISSUE #322, reason recorded: this block used to click
// a separate `[data-lemma-progress-state="achieved"]` button and prove the
// occurrence's OWN claim was left untouched by it. That control is gone --
// the Word progress "Achieved" button is now the ONLY way to reach this
// path, and it writes BOTH lanes in one press, so the assertion inverts: the
// occurrence claim is no longer "untouched", it is the write that started
// the whole mirror. Every other assertion in this block (the shared-lemma
// write, the learn-delta disappearing, the whole-Qur'an total moving by the
// lemma's FULL count rather than double-counting the pressed occurrence, and
// word 3's cross-occurrence proof) is unchanged in substance, because the
// underlying counter mechanics (quran-lemma-progress-data.js) were not
// touched by issue #322 -- only which UI action reaches them.
// ===========================================================================
console.log(`\n=== gate FORCED OPEN: pressing Achieved mirrors onto the lemma, and another occurrence of the same lemma updates ===`);
{
  const ctx = await newLemmaContext(browser, { appLang: "en", viewport: { width: 390, height: 844 }, extraSeedJs: SEED_TOTALS }, { forceGateOpen: true });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await enterReadWithWbw(page);

  // Word 3 ("وَإِيَّاكَ") first, so its own occurrence-level state is proven
  // NOT_STARTED before word 1 is ever touched.
  await openWordAt(page, 3);
  const before = await readLemmaCard(page);
  check("[forced-open] before any claim: no second row, only the Word progress buttons", before?.secondRowPresent === false, JSON.stringify(before));
  check("[forced-open] before any claim: word 3 itself reads not_started", before?.occurrenceStatePressed === "not_started", JSON.stringify(before));
  const coverageBefore = readCoverageNumbers(before?.coverage);
  check("[forced-open] before any claim: 0 of 4 known in this ayah", coverageBefore[0] === 0 && coverageBefore[1] === 4, JSON.stringify(coverageBefore));

  // Now open word 1 ("إِيَّاكَ") -- the SAME lemma -- and press ACHIEVED on
  // the Word progress buttons. Issue #322: this one press is now the only
  // route to "known everywhere".
  await openWordAt(page, 1);
  await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
  await page.waitForTimeout(600);

  const occurrenceWrite = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranWordProgress").at(-1));
  check("[forced-open] the press wrote word 1's own OCCURRENCE lane",
    occurrenceWrite?.col === "quranWordProgress" && /__wbw__1_5$/.test(occurrenceWrite?.id ?? ""), JSON.stringify(occurrenceWrite?.id));

  const claimWrite = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranLemmaProgress").at(-1));
  const expectedSuffix = `__wbw__${word1.morphology.lemma}`;
  check("[forced-open] the SAME press also wrote to quranLemmaProgress, keyed by the shared lemma (the mirror)",
    claimWrite?.col === "quranLemmaProgress" && (claimWrite?.id ?? "").endsWith(expectedSuffix), JSON.stringify({ id: claimWrite?.id, expectedSuffix }));

  const afterClaimOnWord1 = await readLemmaCard(page);
  check("[forced-open] after pressing: word 1's own OCCURRENCE button shows achieved -- the press that started the mirror",
    afterClaimOnWord1?.occurrenceStatePressed === "achieved", JSON.stringify(afterClaimOnWord1));
  check("[forced-open] after pressing: the learn-delta line is GONE (nothing left to gain)", !afterClaimOnWord1?.learnDeltaLine, afterClaimOnWord1?.learnDeltaLine);
  const totalAfter = toWestern(afterClaimOnWord1?.wholeQuranLine ?? "").match(/\d+/g)?.map(Number) ?? [];
  check("[forced-open] the whole-Qur'an total moved by the LEMMA'S full occurrence count, not double-counting word 1",
    totalAfter.includes(SEEDED_KNOWN + LEMMA_OCCURRENCE_COUNT), JSON.stringify({ totalAfter, expected: SEEDED_KNOWN + LEMMA_OCCURRENCE_COUNT }));

  // --- THE CROSS-OCCURRENCE PROOF: word 3, never itself touched, now
  // reads as known -- because it shares word 1's lemma. ---
  const ownWritesBefore = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranWordProgress").length);
  await openWordAt(page, 3);
  const afterOnWord3 = await readLemmaCard(page);
  // Updated in place, Architect, 6 Oct 2026: this check read the PRESSED button as
  // a proxy for word 3's own claim. The Owner's report that day ("Achieved in one
  // place should mark both places") made the card show Achieved for a place known
  // through its word, so the proxy changed meaning. The two facts are now checked
  // separately: no claim was written for word 3, and the card says why it is known.
  const ownWritesAfter = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranWordProgress").length);
  check("[forced-open] CROSS-OCCURRENCE: word 3's OWN claim was never written -- it was never individually touched",
    ownWritesAfter === ownWritesBefore, JSON.stringify({ ownWritesBefore, ownWritesAfter }));
  check("[forced-open] CROSS-OCCURRENCE: word 3's card shows Achieved, with the line saying it is known through another place",
    afterOnWord3?.occurrenceStatePressed === "achieved"
      && await page.evaluate(() => !!document.querySelector("#quranWordCardMount [data-word-progress-known-elsewhere]")),
    JSON.stringify(afterOnWord3));
  const coverageAfter = readCoverageNumbers(afterOnWord3?.coverage);
  check("[forced-open] CROSS-OCCURRENCE: the ayah's own coverage now counts BOTH word 1 and word 3 as known (2 of 4), via the shared lemma",
    coverageAfter[0] === 2 && coverageAfter[1] === 4, JSON.stringify(coverageAfter));

  check("[forced-open] no page errors", errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

// ===========================================================================
// GATE FORCED OPEN -- mirroring downward. Issue #322's own instruction:
// "Mirror Learning and Not started too, so the two can never disagree." A
// press of a LOWER state after the lemma is already known everywhere
// revokes it -- proven here on the SAME word (word 1), not merely asserted.
// ===========================================================================
console.log(`\n=== gate FORCED OPEN: pressing a lower state mirrors DOWN too ===`);
{
  const ctx = await newLemmaContext(browser, { appLang: "en", viewport: { width: 390, height: 844 }, extraSeedJs: SEED_TOTALS }, { forceGateOpen: true });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await enterReadWithWbw(page);
  await openWordAt(page, 1);
  await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
  await page.waitForTimeout(600);
  const known = await readLemmaCard(page);
  check("[forced-open, downward] word 1 reads achieved before the downward press", known?.occurrenceStatePressed === "achieved", JSON.stringify(known));

  await page.click('#quranWordCardMount [data-word-progress-state="learning"]');
  await page.waitForTimeout(600);
  const lastLemmaWrite = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranLemmaProgress").at(-1));
  check("[forced-open, downward] the SAME press mirrored 'learning' onto the lemma lane too",
    lastLemmaWrite?.col === "quranLemmaProgress" && lastLemmaWrite?.data?.state === "learning", JSON.stringify(lastLemmaWrite?.data));

  const afterDowngrade = await readLemmaCard(page);
  check("[forced-open, downward] word 1's own button now shows learning", afterDowngrade?.occurrenceStatePressed === "learning", JSON.stringify(afterDowngrade));
  // Word 3 shares word 1's lemma and was never itself touched -- with the
  // lemma no longer known everywhere, it reverts to unknown too.
  await openWordAt(page, 3);
  const coverageAfterDowngrade = readCoverageNumbers((await readLemmaCard(page))?.coverage);
  check("[forced-open, downward] CROSS-OCCURRENCE: word 3 is no longer counted known now the lemma was downgraded (0 of 4)",
    coverageAfterDowngrade[0] === 0 && coverageAfterDowngrade[1] === 4, JSON.stringify(coverageAfterDowngrade));

  check("[forced-open, downward] no page errors", errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Rendered lemma-progress numbers (issue #303): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
