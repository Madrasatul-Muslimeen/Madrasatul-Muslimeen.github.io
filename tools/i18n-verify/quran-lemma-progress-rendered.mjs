// Issue #303 -- RENDERED acceptance QA for the Word Card's whole-Qur'an/
// lemma numbers and "Mark this word known everywhere", in a real browser,
// in both languages, at the two widths the issue names (390/1100).
//
// Everything below is read off the RENDERED page -- real text, real writes
// (via __stubWriteData) and real reads (via __fsLog) -- never off the
// source and never off `.hidden`.
//
// THE GATE: app/js/study-lemma-progress-readiness.js reads `ready: false` in
// this repository right now (an Owner Control Gate, not yet enabled). Most
// of this suite proves the GATE-CLOSED behaviour against the real file.
// "With the gate forced open" cases route a REPLACEMENT copy of that one
// module in (ctx.route(), the same interception technique harness.mjs
// already uses for the Firestore SDK itself) -- identical exports, `ready:
// true` with a well-formed decision -- so the claim/confirm path can be
// exercised without waiting for a real governed enablement. Nothing else is
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
      markControlPresent: !!b.querySelector("[data-lemma-progress]"),
      lemmaButtons: [...b.querySelectorAll("[data-lemma-progress-state]")].map((el) => el.dataset.lemmaProgressState),
      lemmaStatePressed: [...b.querySelectorAll("[data-lemma-progress-state]")].find((el) => el.getAttribute("aria-pressed") === "true")?.dataset.lemmaProgressState ?? null,
      coverage: b.querySelector(".word-progress-coverage")?.textContent?.trim() ?? null,
      occurrenceStatePressed: [...b.querySelectorAll("[data-word-progress-state]")].find((el) => el.getAttribute("aria-pressed") === "true")?.dataset.wordProgressState ?? null,
    };
  });
}

function readCoverageNumbers(coverageText) {
  const western = toWestern(coverageText ?? "");
  return (western.match(/\d+/g) || []).map(Number);
}

// ===========================================================================
// GATE CLOSED (the real, current state of this repository).
// ===========================================================================
for (const [width, height] of [[390, 844], [1100, 900]]) {
  for (const lang of ["en", "bn"]) {
    console.log(`\n=== gate closed, ${width}x${height}, appLang=${lang} ===`);
    const ctx = await newLemmaContext(browser, { appLang: lang, viewport: { width, height }, extraSeedJs: SEED_TOTALS }, { forceGateOpen: false });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await enterReadWithWbw(page);
    await openWordAt(page, 1);

    const lemmaReads = await page.evaluate(() => (window.__fsLog || []).filter((r) => /quranLemma/.test(r.col || "")).length);
    check(`[${lang} ${width}] gate closed: ZERO lemma collection reads`, lemmaReads === 0, String(lemmaReads));

    const card = await readLemmaCard(page);
    check(`[${lang} ${width}] Number 1 -- whole-Qur'an known line renders`, !!card?.wholeQuranLine, JSON.stringify(card));
    check(`[${lang} ${width}] Number 1 -- names the seeded known count`, (card?.wholeQuranLine ?? "").includes(String(SEEDED_KNOWN)) || toWestern(card?.wholeQuranLine ?? "").includes(String(SEEDED_KNOWN)), card?.wholeQuranLine);
    check(`[${lang} ${width}] Number 2 -- whole-Qur'an percent line renders`, !!card?.wholeQuranPercentLine, JSON.stringify(card));
    check(`[${lang} ${width}] Number 3 -- this word's own share-of-Qur'an line renders (unaffected by the lemma gate)`, !!card?.shareOfQuranLine, JSON.stringify(card));
    check(`[${lang} ${width}] Number 3 -- names this lemma's real occurrence count`, toWestern(card?.shareOfQuranLine ?? "").includes(String(LEMMA_OCCURRENCE_COUNT)), card?.shareOfQuranLine);
    check(`[${lang} ${width}] Number 4 -- learn-delta line renders even while the gate is closed`, !!card?.learnDeltaLine, JSON.stringify(card));
    check(`[${lang} ${width}] Number 4 -- gate closed counts only THIS occurrence (1), never the lemma's real total`, toWestern(card?.learnDeltaLine ?? "").includes("1") && !toWestern(card?.learnDeltaLine ?? "").includes(String(LEMMA_OCCURRENCE_COUNT)), card?.learnDeltaLine);
    check(`[${lang} ${width}] "Mark this word known everywhere" is ENTIRELY ABSENT, not merely disabled`, card?.markControlPresent === false, JSON.stringify(card?.lemmaButtons));

    check(`[${lang} ${width}] no page errors`, errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
    await ctx.close();
  }
}

// ===========================================================================
// GATE FORCED OPEN -- claim/confirm works, and marking one occurrence known
// updates ANOTHER occurrence of the same lemma on screen.
// ===========================================================================
console.log(`\n=== gate FORCED OPEN: claim, then another occurrence of the same lemma updates ===`);
{
  const ctx = await newLemmaContext(browser, { appLang: "en", viewport: { width: 390, height: 844 }, extraSeedJs: SEED_TOTALS }, { forceGateOpen: true });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await enterReadWithWbw(page);

  // Word 3 ("وَإِيَّاكَ") first, so its own occurrence-level state is proven
  // NOT_STARTED before word 1 is ever touched.
  await openWordAt(page, 3);
  const before = await readLemmaCard(page);
  check("[forced-open] before any claim: the control IS offered", before?.markControlPresent === true, JSON.stringify(before));
  check("[forced-open] before any claim: three lemma-wide state buttons", before?.lemmaButtons.length === 3, JSON.stringify(before?.lemmaButtons));
  const coverageBefore = readCoverageNumbers(before?.coverage);
  check("[forced-open] before any claim: 0 of 4 known in this ayah", coverageBefore[0] === 0 && coverageBefore[1] === 4, JSON.stringify(coverageBefore));

  // Now open word 1 ("إِيَّاكَ") -- the SAME lemma -- and claim it known
  // everywhere.
  await openWordAt(page, 1);
  await page.click('#quranWordCardMount [data-lemma-progress-state="achieved"]');
  await page.waitForTimeout(600);

  const claimWrite = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranLemmaProgress").at(-1));
  const expectedSuffix = `__wbw__${word1.morphology.lemma}`;
  check("[forced-open] the claim wrote to quranLemmaProgress, keyed by the shared lemma",
    claimWrite?.col === "quranLemmaProgress" && (claimWrite?.id ?? "").endsWith(expectedSuffix), JSON.stringify({ id: claimWrite?.id, expectedSuffix }));

  const afterClaimOnWord1 = await readLemmaCard(page);
  check("[forced-open] after claiming: the LEMMA-WIDE button now shows achieved", afterClaimOnWord1?.lemmaStatePressed === "achieved", JSON.stringify(afterClaimOnWord1));
  check("[forced-open] after claiming: word 1's own OCCURRENCE claim is untouched (still not_started) -- the lemma action never writes the occurrence lane",
    afterClaimOnWord1?.occurrenceStatePressed === "not_started", JSON.stringify(afterClaimOnWord1));
  check("[forced-open] after claiming: the learn-delta line is GONE (nothing left to gain)", !afterClaimOnWord1?.learnDeltaLine, afterClaimOnWord1?.learnDeltaLine);
  const totalAfter = toWestern(afterClaimOnWord1?.wholeQuranLine ?? "").match(/\d+/g)?.map(Number) ?? [];
  check("[forced-open] the whole-Qur'an total moved by the LEMMA'S full occurrence count, not just 1",
    totalAfter.includes(SEEDED_KNOWN + LEMMA_OCCURRENCE_COUNT), JSON.stringify({ totalAfter, expected: SEEDED_KNOWN + LEMMA_OCCURRENCE_COUNT }));

  // --- THE CROSS-OCCURRENCE PROOF: word 3, never itself touched, now
  // reads as known -- because it shares word 1's lemma. ---
  await openWordAt(page, 3);
  const afterOnWord3 = await readLemmaCard(page);
  check("[forced-open] CROSS-OCCURRENCE: word 3's OWN claim is still not_started -- it was never individually touched",
    afterOnWord3?.occurrenceStatePressed === "not_started", JSON.stringify(afterOnWord3));
  const coverageAfter = readCoverageNumbers(afterOnWord3?.coverage);
  check("[forced-open] CROSS-OCCURRENCE: the ayah's own coverage now counts BOTH word 1 and word 3 as known (2 of 4), via the shared lemma",
    coverageAfter[0] === 2 && coverageAfter[1] === 4, JSON.stringify(coverageAfter));

  check("[forced-open] no page errors", errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Rendered lemma-progress numbers (issue #303): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
