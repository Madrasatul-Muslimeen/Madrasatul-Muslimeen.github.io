// Issue #263 -- Word Card word-part colouring. RENDERED acceptance QA, in a
// real browser, following this project's own established practice for a
// focused un-checked-in script (see quran-word-card-return.mjs).
//
// NOT RUN IN THIS SANDBOX -- `playwright` is not resolvable here (the same,
// repeatedly-documented environment gap CLAUDE.md's own standing lessons
// record for every prior Word Card round). Written against the real app and
// the real generated data so it is ready to run wherever Playwright is
// available; run it with `node serve.js` from the repo root in one terminal
// and `node tools/i18n-verify/word-card-segments-browser.mjs` in another.
//
// Fixture: 14:3:7 (وَيَصُدُّونَ) -- the Owner's own worked example, aligned by
// build-word-segments.mjs into particle/person/stem/person with cues "and",
// "they", null, "they" (see tools/i18n-verify/word-segments-data.mjs, which
// DID run and proves this against the real generated file).
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

async function clickSafely(page, selector) {
  await page.evaluate(() => {
    document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove());
  });
  await page.click(selector);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

/** Opens the Read screen on 14:3 and clicks word position 7. */
async function openFixtureWord(page) {
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
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "14"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const s = document.getElementById("ayahSelect"); if (s.querySelector('option[value="3"]')) { s.value = "3"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { (document.querySelector('#readView [data-word-occurrence$=":14:3:7"]') || document.querySelector("#readView [data-word-occurrence]"))?.click(); });
  // The segments load asynchronously (hydrateWordCardOccurrences), same as
  // the root/lemma occurrence data this Word Card already waits for.
  await page.waitForTimeout(2500);
}

function relativeLuminance([r, g, b]) {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1), l2 = relativeLuminance(rgb2);
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}
function parseRgb(str) {
  const m = str.match(/(\d+),\s*(\d+),\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

for (const lang of ["en", "bn"]) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1100, height: 900 }]) {
    console.log(`\n=== Word Card segment colouring, appLang=${lang}, ${viewport.width}px ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await openFixtureWord(page);
    // Colouring defaults to ON (prefs.js getColourWordParts()) and each
    // browser context here is fresh, so no localStorage seeding is needed.

    const segInfo = await page.evaluate(() => {
      const spans = [...document.querySelectorAll(".word-card-arabic .word-card-segment")];
      return {
        count: spans.length,
        roles: spans.map((s) => [...s.classList].find((c) => c.startsWith("word-card-segment-") && c !== "word-card-segment")?.replace("word-card-segment-", "")),
        colors: spans.map((s) => getComputedStyle(s).color),
        text: document.querySelector(".word-card-arabic")?.textContent || "",
      };
    });
    check(`${lang}/${viewport.width}: four coloured spans render for 14:3:7`, segInfo.count === 4, JSON.stringify(segInfo));
    check(`${lang}/${viewport.width}: the four roles are particle/person/stem/person`,
      JSON.stringify(segInfo.roles) === JSON.stringify(["particle", "person", "stem", "person"]), JSON.stringify(segInfo.roles));

    // Contrast: each distinct colour against the card's own background.
    const bg = await page.evaluate(() => getComputedStyle(document.querySelector(".quran-word-card")).backgroundColor);
    const bgRgb = parseRgb(bg);
    for (const [role, color] of [...new Set(segInfo.roles)].map((r) => [r, segInfo.colors[segInfo.roles.indexOf(r)]])) {
      const rgb = parseRgb(color);
      const ratio = rgb && bgRgb ? contrastRatio(rgb, bgRgb) : 0;
      check(`${lang}/${viewport.width}: "${role}" colour (${color}) is >= 4.5:1 against the card background (${bg}), measured ${ratio.toFixed(2)}:1`, ratio >= 4.5);
    }

    // The real English gloss ("and hinder") -- "and" is coloured to match
    // the particle segment; the real data has no word matching the person
    // cue "they" (see word-segments-data.mjs's own comment on this), so a
    // separate, direct check of segmentedGlossHtml() below proves that
    // mechanism against a synthetic gloss that does contain it.
    const glossInfo = await page.evaluate(() => {
      const p = document.querySelector(".word-card-meaning-en");
      const and = [...p.querySelectorAll(".word-card-gloss-segment")].find((s) => s.textContent.toLowerCase() === "and");
      return { html: p?.innerHTML || "", andColor: and ? getComputedStyle(and).color : null, andClass: and ? [...and.classList] : null };
    });
    check(`${lang}/${viewport.width}: the gloss word "and" is coloured (word-card-segment-particle)`,
      !!glossInfo.andClass?.includes("word-card-segment-particle"), JSON.stringify(glossInfo));

    // Direct proof of the person-cue gloss mechanism, via the real exported
    // pure function, against a synthetic gloss that DOES contain "they" --
    // the real data for this word does not (see above).
    const syntheticGloss = await page.evaluate(async () => {
      const mod = await import("/app/js/quran-word-card.js");
      const segs = [
        { from: 0, to: 1, role: "particle", cue: "and" },
        { from: 1, to: 2, role: "person", cue: "they" },
        { from: 2, to: 3, role: "stem", cue: null },
      ];
      return mod.segmentedGlossHtml("and they hinder", segs);
    });
    check("segmentedGlossHtml() colours a synthetic gloss's 'and' and 'they' to match their segments",
      syntheticGloss.includes('word-card-segment-particle">and<') && syntheticGloss.includes('word-card-segment-person">they<'),
      syntheticGloss);

    // Shaping: the coloured word's rendered width must match the plain
    // word's, within 1px -- proves span boundaries did not break Arabic
    // letter joining.
    const widthColoured = await page.evaluate(() => document.querySelector(".word-card-arabic")?.getBoundingClientRect().width);
    await page.evaluate(() => { const cb = document.querySelector("[data-word-card-colour-toggle]"); if (cb?.checked) { cb.checked = false; cb.dispatchEvent(new Event("change", { bubbles: true })); } });
    await page.waitForTimeout(200);
    const afterToggleOff = await page.evaluate(() => ({
      segmentCount: document.querySelectorAll(".word-card-arabic .word-card-segment").length,
      width: document.querySelector(".word-card-arabic")?.getBoundingClientRect().width,
      text: document.querySelector(".word-card-arabic")?.textContent || "",
    }));
    check(`${lang}/${viewport.width}: the switch turns colouring off (0 spans, plain text unchanged)`,
      afterToggleOff.segmentCount === 0 && afterToggleOff.text === segInfo.text, JSON.stringify(afterToggleOff));
    check(`${lang}/${viewport.width}: coloured vs. plain rendered width within 1px (shaping preserved)`,
      Math.abs((widthColoured ?? 0) - (afterToggleOff.width ?? 0)) <= 1,
      `coloured=${widthColoured} plain=${afterToggleOff.width}`);

    // Re-enable for cleanliness / next iteration's localStorage assumption.
    await page.evaluate(() => { const cb = document.querySelector("[data-word-card-colour-toggle]"); if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event("change", { bubbles: true })); } });

    // The sandbox proxy intercepts outside HTTPS (audio, fonts), which shows up
    // as a failed resource load. That is environmental, not a page error.
    const realErrors = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID)/.test(e));
    check(`${lang}/${viewport.width}: no page errors`, realErrors.length === 0, JSON.stringify(realErrors));
    await ctx.close();
  }
}

console.log(`\n==== Word Card segment colouring (issue #263): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
