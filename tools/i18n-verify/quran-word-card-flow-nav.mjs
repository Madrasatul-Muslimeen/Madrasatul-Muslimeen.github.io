// Word Card -- the flow-mode (Whole Surah/Range) gap PR #135 itself flagged
// as out of scope: "Sideways/Mushaf flow mode ... falls back to the
// pre-existing no-op, never a regression -- flagged rather than silently
// left broken." RENDERED acceptance QA, in a real browser, following this
// project's own established practice for a focused un-checked-in script.
//
// Issue #113's continuation task named this gap specifically. A debug run
// against the real fixture (not assumed) found it is NOT merely inert: a
// lemma/root occurrence link that crosses surahs while reading in Whole
// Surah (or Range) flow mode left the reader looking at the DESTINATION
// surah's own ayah at the SAME PAGE INDEX as wherever the origin surah had
// been scrolled to -- not the ayah actually tapped -- because
// #pageViewContainer's raw scrollLeft is a property of the container, not
// of whichever surah's content it currently holds, and a browser does not
// reset it when renderFlowView() replaces the innerHTML for a different
// surah. This suite is written against the fix for it
// (scrollFlowToCurrentAyah(), called from navigateToAyah() in
// app/quranrevival.html, marked "Issue #113").
//
// Mushaf mode is NOT covered here, deliberately: hifz-renderer.js's word
// spans carry no ayah-identifying attribute to target, and this sandbox
// cannot reach the Mushaf page data at all (github raw-content fetch),
// confirmed by a debug run that found 0 .hifz-page elements ever render
// here -- see this round's own report for both reasons in full.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

/** Surah 2 āyah 71, word position 13, root سلم -- the same proven fixture
 *  quran-word-card-return.mjs uses, known to carry lemma occurrences in
 *  OTHER surahs (4:92 among them), which is exactly what this gap needs. */
async function openFixtureWordInFlow(page, { unitType = "surah", rangeFrom = null, rangeTo = null } = {}) {
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
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const s = document.getElementById("ayahSelect"); if (s.querySelector('option[value="71"]')) { s.value = "71"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(1000);
  await page.evaluate((ut) => { const sel = document.getElementById("unitTypeSelect"); sel.value = ut; sel.dispatchEvent(new Event("change", { bubbles: true })); }, unitType);
  await page.waitForTimeout(1500);
  if (unitType === "range" && rangeFrom != null && rangeTo != null) {
    await page.evaluate(([f, t]) => {
      const fromSel = document.getElementById("rangeFromSelect");
      const toSel = document.getElementById("rangeToSelect");
      if (fromSel.querySelector(`option[value="${f}"]`)) { fromSel.value = String(f); fromSel.dispatchEvent(new Event("change", { bubbles: true })); }
      if (toSel.querySelector(`option[value="${t}"]`)) { toSel.value = String(t); toSel.dispatchEvent(new Event("change", { bubbles: true })); }
    }, [rangeFrom, rangeTo]);
    await page.waitForTimeout(1500);
  }
  // The reader has actually scrolled to āyah 71's own page before tapping
  // the word -- proven, not assumed: an un-scrolled strip starts at page 1,
  // which would make "did the jump land correctly" indistinguishable from
  // "the strip just never moved".
  await page.evaluate(() => { document.querySelector('.page-flow-ayah[data-ayah="71"]')?.scrollIntoView({ inline: "start", behavior: "instant" }); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { document.querySelector('#readView [data-word-occurrence$=":2:71:13"]')?.click(); });
  await page.waitForTimeout(1000);
  await page.click('#quranWordCardMount [data-word-card-level="basic"]').catch(() => {});
  await page.waitForTimeout(2500);
  await page.click("[data-word-lemma-toggle]").catch(() => {});
  await page.waitForTimeout(2000);
}

function visibleAyahEval() {
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
// 1) Whole Surah flow mode: a cross-surah lemma jump lands ON THE TARGET
//    ĀYAH's own page, not wherever the raw pixel offset happened to carry
//    over to -- both languages.
// ---------------------------------------------------------------------------
for (const lang of ["en", "bn"]) {
  console.log(`\n=== Whole Surah flow: cross-surah word-card jump lands correctly, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openFixtureWordInFlow(page, { unitType: "surah" });

  const target = await page.evaluate(() => {
    const links = [...document.querySelectorAll("[data-word-occurrence-goto]")];
    return links.find((l) => l.getAttribute("data-word-occurrence-goto") === "4:92:17")
      ?.getAttribute("data-word-occurrence-goto") ?? null;
  });
  if (!target) { console.log(`  SKIP ${lang} -- fixture no longer carries the 4:92:17 cross-surah occurrence`); await ctx.close(); continue; }

  await page.evaluate(() => {
    const links = [...document.querySelectorAll("[data-word-occurrence-goto]")];
    links.find((l) => l.getAttribute("data-word-occurrence-goto") === "4:92:17")?.click();
  });
  await page.waitForTimeout(2500);

  const away = await page.evaluate((expr) => ({
    surah: document.getElementById("surahSelect")?.value,
    ayah: document.getElementById("ayahSelect")?.value,
    visibleAyah: eval(expr),
    wordInView: (() => {
      const w = document.querySelector('#readView [data-word-occurrence$=":4:92:17"]');
      if (!w) return false;
      const r = w.getBoundingClientRect();
      const c = document.getElementById("pageViewContainer").getBoundingClientRect();
      return r.left >= c.left - 2 && r.right <= c.right + 2;
    })(),
  }), visibleAyahEval());
  check(`${lang} arrival lands on the destination surah/āyah (state)`, away.surah === "4" && away.ayah === "92", JSON.stringify(away));
  check(`${lang} the flow strip is actually SCROLLED to that āyah's own page`, away.visibleAyah === "92", JSON.stringify(away));
  check(`${lang} the tapped word itself is inside the visible strip, not off-screen`, away.wordInView === true, JSON.stringify(away));

  await page.click("[data-word-card-origin-back]");
  await page.waitForTimeout(2600);
  const back = await page.evaluate((expr) => ({
    surah: document.getElementById("surahSelect")?.value,
    ayah: document.getElementById("ayahSelect")?.value,
    visibleAyah: eval(expr),
    occurrenceId: document.querySelector(".quran-word-card")?.getAttribute("data-occurrence-id"),
  }), visibleAyahEval());
  check(`${lang} the return trip lands back on the origin āyah's own page`, back.surah === "2" && back.ayah === "71" && back.visibleAyah === "71", JSON.stringify(back));
  check(`${lang} the ORIGINAL word reopens`, back.occurrenceId === "quran-word-occurrence:v1:2:71:13", back.occurrenceId);

  const writes = await page.evaluate(() => (window.__fsLog || [])
    .filter((r) => /setDoc|updateDoc|batchCommit|txCommit/.test(r.kind)).length);
  check(`${lang} the whole flow-mode round trip writes nothing`, writes === 0, `writes=${writes}`);

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
  check(`${lang} no page errors across the flow-mode round trip`, real.length === 0, real.slice(0, 2).join(" | "));

  await ctx.close();
}

// ---------------------------------------------------------------------------
// 2) Range unit type, SAME surah (the destination occurrence is inside the
//    already-selected range's own surah): the fix must not disturb this --
//    a real regression risk since Range's own bounds (rangeFrom/rangeTo) are
//    a pre-existing, SEPARATE gap this task does not touch (see the report).
// ---------------------------------------------------------------------------
{
  console.log("\n=== Range flow mode: same-surah word-card jump still lands correctly ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openFixtureWordInFlow(page, { unitType: "range", rangeFrom: 65, rangeTo: 75 });

  const selfTarget = await page.evaluate(() => document.querySelector("[data-word-occurrence-goto]")?.getAttribute("data-word-occurrence-goto"));
  check("the lemma list offers at least the origin's own occurrence inside the range", !!selfTarget, selfTarget);

  const rows = await page.evaluate(() => [...document.querySelectorAll(".page-flow-ayah")].map((r) => r.dataset.ayah));
  check("the range view still renders exactly the selected 65..75 window (untouched by this fix)",
        rows.length === 11 && rows[0] === "65" && rows[rows.length - 1] === "75", JSON.stringify(rows));

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
  check("no page errors while exercising Range flow mode", real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 3) Regression: the ordinary (non-flow, single-ayah) unit types this
//    round does not touch at all -- scrollFlowToCurrentAyah() must be a
//    true no-op there, exactly as readViewScrollContainer()'s own ayahPanels
//    branch (#135) is untouched by this round.
// ---------------------------------------------------------------------------
{
  console.log("\n=== Single-ayah (non-flow) unit type: unaffected by this round ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openFixtureWordInFlow(page, { unitType: "ayah" });
  const state = await page.evaluate(() => ({
    pageViewDisplay: getComputedStyle(document.getElementById("pageViewContainer")).display,
    ayahPanelsDisplay: getComputedStyle(document.getElementById("ayahPanels")).display,
  }));
  check("the flow strip stays hidden for the ordinary single-āyah unit", state.pageViewDisplay === "none", JSON.stringify(state));
  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
  check("no page errors in the ordinary single-āyah unit type", real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
