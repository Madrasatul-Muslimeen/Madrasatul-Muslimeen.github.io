// Issue #320 -- RENDERED acceptance QA for the Word Card's Basic Arabic /
// Arabic in Depth claim controls, in a real browser, in both languages, at
// the two widths the issue names (390/1100).
//
// Everything below is read off the RENDERED page -- real text, real writes
// (via __stubWriteData) and real reads (via __fsLog) -- never off the source
// and never off `.hidden`.
//
// THE GATE: app/js/study-word-levels-readiness.js reads `ready: false` in
// this repository right now (a separate Owner Control Gate from WbW, which
// has been deployed and operational since MAP Phase 3). Most of this suite
// proves the GATE-CLOSED behaviour against the real file. "With the gate
// forced open" cases route a REPLACEMENT copy of that one module in
// (ctx.route(), the same interception technique harness.mjs already uses for
// the Firestore SDK itself) -- identical exports, `ready: true` with a
// well-formed decision -- so the claim/confirm path can be exercised without
// waiting for a real governed enablement. Nothing else is faked: the real
// quran-word-progress.js/-data.js run underneath, against the same in-memory
// Firebase stub every other suite here uses.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// A gate-FORCED-OPEN replacement for study-word-levels-readiness.js --
// identical shape and exports to the real file, `ready: true` with a
// well-formed governed decision. Routed in ONLY for the contexts that ask
// for it below.
const FORCED_OPEN_READINESS_SOURCE = `
export const WORD_LEVELS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const WORD_LEVELS_PERSISTENCE_DECLARATION = Object.freeze({
  ready: true,
  decision: Object.freeze({ by: "master-architect", on: "2026-09-26", reference: "test-forced-open" }),
  gate: "E1",
  note: "forced open for tools/i18n-verify/quran-word-levels-rendered.mjs",
});
const ISO_DATE = /^\\d{4}-\\d{2}-\\d{2}$/;
export function isWordLevelsPersistenceReady(declaration = WORD_LEVELS_PERSISTENCE_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!WORD_LEVELS_READINESS_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on)) return false;
  if (typeof d.reference !== "string" || d.reference.trim() === "") return false;
  return true;
}
export const REASON_WORD_LEVELS_NOT_DEPLOYED = "word-levels-rules-not-deployed";
export const REASON_WORD_LEVELS_DECISION_INCOMPLETE = "word-levels-readiness-decision-incomplete";
export function wordLevelsUnavailableReason(declaration = WORD_LEVELS_PERSISTENCE_DECLARATION) {
  if (isWordLevelsPersistenceReady(declaration)) return null;
  if (declaration && declaration.ready === true) return REASON_WORD_LEVELS_DECISION_INCOMPLETE;
  return REASON_WORD_LEVELS_NOT_DEPLOYED;
}
`;

async function newWordLevelsContext(browser, opts, { forceGateOpen = false } = {}) {
  const ctx = await newContext(browser, opts);
  if (forceGateOpen) {
    await ctx.route("**/js/study-word-levels-readiness.js", (route) =>
      route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: FORCED_OPEN_READINESS_SOURCE }));
  }
  return ctx;
}

// A seeded WbW lane (word 2 achieved), so WbW's own state is proven UNCHANGED
// by anything this suite does at basic/depth on the same words.
const SEED = `
DATA.quranWordProgress = [{
  _id: TENANT_ID + "__p1__wbw__1_1", contractVersion: "quran-word-progress:v1",
  identityContract: "quran-word-occurrence:v1", lane: "learner",
  tenantId: TENANT_ID, personId: "p1", level: "wbw", surah: 1, ayah: 1,
  entries: { "2": { s: "a", at: "2026-09-13T10:00:00.000Z", by: "p1" } },
}];
DATA.quranWordApprovals = [];
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
  });
  await page.waitForTimeout(600);
}

/** Open the Word Card on Al-Fatihah 1:1's word at `position`, and wait for it to settle. */
async function openWord(page, position) {
  await page.evaluate((p) => {
    const el = document.querySelector(`[data-word-occurrence$=":1:1:${p}"]`) || document.querySelectorAll("[data-word-occurrence]")[p - 1];
    el?.click();
  }, position);
  await page.waitForTimeout(400);
}

async function selectTab(page, level) {
  await page.click(`#quranWordCardMount [data-word-card-level="${level}"]`);
  await page.waitForTimeout(350);
}

function readProgressBlock(page) {
  return page.evaluate(() => {
    const b = document.querySelector("#quranWordCardMount [data-word-progress]");
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return {
      onScreen: r.width > 0 && r.height > 0,
      buttons: [...b.querySelectorAll("[data-word-progress-state]")].map((el) => ({ state: el.dataset.wordProgressState, pressed: el.getAttribute("aria-pressed") })),
      pressed: [...b.querySelectorAll("[data-word-progress-state]")].find((el) => el.getAttribute("aria-pressed") === "true")?.dataset.wordProgressState ?? null,
      coverage: b.querySelector(".word-progress-coverage")?.textContent?.trim() ?? null,
      wholeQuranLine: b.querySelector(".word-progress-whole-quran")?.textContent?.trim() ?? null,
    };
  });
}

function lastWrite(page, level) {
  return page.evaluate((lvl) => (window.__stubWriteData || []).filter((w) => w.col === "quranWordProgress" && (w.id || "").includes(`__${lvl}__`)).at(-1), level);
}

// ===========================================================================
// THE REAL GATE, AS COMMITTED: basic/depth show no controls, and nothing is
// ever read for either level. WbW itself is completely unaffected.
// ===========================================================================
for (const [width, height] of [[390, 844], [1100, 900]]) {
  for (const lang of ["en", "bn"]) {
    console.log(`\n=== real gate (closed), ${width}x${height}, appLang=${lang} ===`);
    const ctx = await newWordLevelsContext(browser, { appLang: lang, viewport: { width, height }, extraSeedJs: SEED }, { forceGateOpen: false });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await enterReadWithWbw(page);
    await openWord(page, 2);

    const wbwBlock = await readProgressBlock(page);
    check(`[${lang} ${width}] WbW itself still shows its seeded achieved state`, wbwBlock?.pressed === "achieved", JSON.stringify(wbwBlock));

    await selectTab(page, "basic");
    const basicBlockClosed = await readProgressBlock(page);
    check(`[${lang} ${width}] gate closed: the Basic tab shows NO progress block at all`, basicBlockClosed === null, JSON.stringify(basicBlockClosed));

    await selectTab(page, "depth");
    const depthBlockClosed = await readProgressBlock(page);
    check(`[${lang} ${width}] gate closed: the Arabic in Depth tab shows NO progress block at all`, depthBlockClosed === null, JSON.stringify(depthBlockClosed));

    const levelReads = await page.evaluate(() =>
      (window.__fsLog || []).filter((r) =>
        /quranWord(Progress|Approvals)/.test(r.col || "") && ((r.id || "").includes("__basic__") || (r.id || "").includes("__depth__"))
      ).length);
    check(`[${lang} ${width}] gate closed: no basic/depth document was ever read`, levelReads === 0, String(levelReads));

    const writesSoFar = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => /quranWord/.test(w.col || "")).length);
    check(`[${lang} ${width}] gate closed: browsing every tab wrote NOTHING`, writesSoFar === 0, String(writesSoFar));

    check(`[${lang} ${width}] no page errors`, errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
    await ctx.close();
  }
}

// ===========================================================================
// GATE FORCED OPEN -- claim/confirm works at both new levels, independently
// of WbW and of each other, on the SAME word.
// ===========================================================================
console.log(`\n=== gate FORCED OPEN: claim at basic and depth, independent of wbw and of each other ===`);
{
  const ctx = await newWordLevelsContext(browser, { appLang: "en", viewport: { width: 390, height: 844 }, extraSeedJs: SEED }, { forceGateOpen: true });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await enterReadWithWbw(page);
  await openWord(page, 2);

  await selectTab(page, "basic");
  const basicBefore = await readProgressBlock(page);
  check("[forced-open] before any claim: the Basic tab DOES offer controls", basicBefore?.onScreen === true, JSON.stringify(basicBefore));
  check("[forced-open] before any claim: Basic's own state is not_started (independent of the seeded wbw achieved)", basicBefore?.pressed === "not_started", JSON.stringify(basicBefore));
  check("[forced-open] Basic shows no coverage line and no whole-Qur'an total (WbW-only extras)", !basicBefore?.coverage && !basicBefore?.wholeQuranLine, JSON.stringify(basicBefore));

  await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
  await page.waitForTimeout(500);
  const basicWrite = lastWrite(page, "basic");
  check("[forced-open] claiming Basic wrote to the basic lane", basicWrite?.id?.endsWith("__basic__1_1") === true, JSON.stringify(basicWrite?.id));

  const basicAfter = await readProgressBlock(page);
  check("[forced-open] Basic's own tab now shows achieved", basicAfter?.pressed === "achieved", JSON.stringify(basicAfter));

  await selectTab(page, "depth");
  const depthBefore = await readProgressBlock(page);
  check("[forced-open] Depth's own state is not_started too -- claiming Basic did not leak into Depth", depthBefore?.pressed === "not_started", JSON.stringify(depthBefore));
  await page.click('#quranWordCardMount [data-word-progress-state="learning"]');
  await page.waitForTimeout(500);
  const depthWrite = lastWrite(page, "depth");
  check("[forced-open] claiming Depth wrote to the depth lane, not the basic one", depthWrite?.id?.endsWith("__depth__1_1") === true, JSON.stringify(depthWrite?.id));

  await selectTab(page, "wbw");
  const wbwAfterAll = await readProgressBlock(page);
  check("[forced-open] WbW's own seeded state is still exactly what it was -- untouched by either new-level claim", wbwAfterAll?.pressed === "achieved", JSON.stringify(wbwAfterAll));

  await selectTab(page, "basic");
  const basicStillAfter = await readProgressBlock(page);
  check("[forced-open] Basic's own claim is still achieved after visiting every other tab", basicStillAfter?.pressed === "achieved", JSON.stringify(basicStillAfter));

  check("[forced-open] no page errors", errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

// Bangla, at the larger width, for the same forced-open claim path.
console.log(`\n=== gate FORCED OPEN, bn, 1100x900 ===`);
{
  const ctx = await newWordLevelsContext(browser, { appLang: "bn", viewport: { width: 1100, height: 900 }, extraSeedJs: SEED }, { forceGateOpen: true });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await enterReadWithWbw(page);
  await openWord(page, 3);
  await selectTab(page, "basic");
  const before = await readProgressBlock(page);
  check("[bn forced-open] the Basic tab offers controls", before?.onScreen === true, JSON.stringify(before));
  await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
  await page.waitForTimeout(500);
  const write = lastWrite(page, "basic");
  check("[bn forced-open] claiming Basic wrote to the basic lane", write?.id?.endsWith("__basic__1_1") === true, JSON.stringify(write?.id));
  const bangla = /[ঀ-৿]/;
  const buttonTexts = await page.evaluate(() => [...document.querySelectorAll('#quranWordCardMount [data-word-progress-state]')].map((el) => el.textContent.trim()));
  check("[bn forced-open] the claim buttons are in Bangla, same shared labels as WbW", buttonTexts.every((t) => bangla.test(t)), JSON.stringify(buttonTexts));
  check("[bn forced-open] no page errors", errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Rendered word-levels claim controls (issue #320): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
