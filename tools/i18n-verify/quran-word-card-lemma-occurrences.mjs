// Word Card -- the Basic tab's own "{count} occurrences of this Dictionary Word" line,
// made expandable. RENDERED acceptance QA, in a real browser, following this
// project's own established practice for a focused un-checked-in script
// (see quran-word-card-rendered.mjs, whose fixture -- surah 2, āyah 71, word
// position 13, root سلم -- this reuses so the measurement is against a word
// this project has already proven carries real derived-form data).
//
// Before this round the line was plain, uninteractive text: a count the card
// already knew (context.lemmaOccurrences, fetched since v08.21 for the
// derived-forms list) but rendered nowhere as a list. This proves a reader
// can now expand it, see real occurrence rows with the exact WRITTEN text at
// each place, follow one to its āyah, and that nothing about it writes or
// regresses the geometry this project already measured clean.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

/** Open the Read view, switch to WbW, load surah 2 āyah 71, and open the
 *  known word at position 13 (this project's own proven fixture). */
async function openFixtureWord(page) {
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
  await page.waitForTimeout(1500);
  await page.evaluate(() => { (document.querySelector('#readView [data-word-occurrence$=":2:71:13"]') || document.querySelector("#readView [data-word-occurrence]"))?.click(); });
  await page.waitForTimeout(1000);
  await page.click('#quranWordCardMount [data-word-card-level="basic"]');
  await page.waitForTimeout(2800);
}

for (const lang of ["en", "bn"]) {
  console.log(`\n=== lemma-occurrences toggle, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openFixtureWord(page);

  const before = await page.evaluate(() => {
    const btn = document.querySelector("[data-word-lemma-toggle]");
    return btn ? { present: true, expanded: btn.getAttribute("aria-expanded"), text: btn.textContent.trim(), tag: btn.tagName } : { present: false };
  });
  check(`${lang} the lemma-occurrences line is a real, collapsed toggle`,
        before.present && before.tag === "BUTTON" && before.expanded === "false",
        JSON.stringify(before));
  // Bengali digits (০-৯), not \d -- this project's own rule (I11: a count is
  // rendered in the reader's own digits on a Bangla page).
  check(`${lang} it names a real count`, /[০-৯0-9]/.test(before.text || ""), before.text);
  if (!before.present) { await ctx.close(); continue; }

  // BEFORE evidence: the line as it renders collapsed -- the same text the
  // pre-existing count-only <p> always showed, now a real toggle.
  await page.screenshot({ path: `/tmp/lemma-collapsed-${lang}.png` });

  const beforeList = await page.evaluate(() => document.querySelectorAll("[data-word-occurrence-goto]").length);

  await page.click("[data-word-lemma-toggle]");
  await page.waitForTimeout(2000);
  // AFTER evidence: the SAME line, expanded to the occurrence list the count
  // could not previously be turned into.
  await page.screenshot({ path: `/tmp/lemma-expanded-${lang}.png` });

  const after = await page.evaluate(() => {
    const btn = document.querySelector("[data-word-lemma-toggle]");
    const rows = [...document.querySelectorAll("[data-word-occurrence-goto]")];
    return {
      expanded: btn?.getAttribute("aria-expanded"),
      rowCount: rows.length,
      firstRef: rows[0]?.getAttribute("data-word-occurrence-goto"),
      firstArabic: rows[0]?.querySelector(".word-card-occurrence-arabic")?.textContent.trim(),
      note: document.querySelector(".word-card-content [data-word-progress] ~ *")?.textContent || "",
    };
  });
  check(`${lang} expanding sets aria-expanded=true`, after.expanded === "true", after.expanded);
  check(`${lang} at least one occurrence row renders`, after.rowCount > beforeList,
        `before=${beforeList} after=${after.rowCount}`);
  check(`${lang} a row carries a real Arabic word`, /[؀-ۿ]/.test(after.firstArabic || ""), after.firstArabic);
  check(`${lang} a row carries a real surah:ayah:position ref`, /^\d+:\d+:\d+$/.test(after.firstRef || ""), after.firstRef);
  check(`${lang} no more than the stated cap is rendered`, after.rowCount <= 50, after.rowCount);

  // Collapse and confirm the list is really gone, not merely hidden by CSS.
  await page.click("[data-word-lemma-toggle]");
  await page.waitForTimeout(300);
  const collapsed = await page.evaluate(() => ({
    expanded: document.querySelector("[data-word-lemma-toggle]")?.getAttribute("aria-expanded"),
    rows: document.querySelectorAll("[data-word-occurrence-goto]").length,
  }));
  check(`${lang} collapsing sets aria-expanded=false`, collapsed.expanded === "false", collapsed.expanded);
  check(`${lang} collapsing removes the rows from the DOM`, collapsed.rows === beforeList,
        `expected=${beforeList} got=${collapsed.rows}`);

  // Re-expand, then follow the first row to its āyah -- the SAME navigation
  // identity (data-word-occurrence-goto) the derived-forms list already uses,
  // so this is proving the shared plumbing carries a second caller correctly,
  // not a new navigation path.
  await page.click("[data-word-lemma-toggle]");
  await page.waitForTimeout(2000);
  const target = await page.evaluate(() => document.querySelector("[data-word-occurrence-goto]")?.getAttribute("data-word-occurrence-goto"));
  await page.click("[data-word-occurrence-goto]");
  await page.waitForTimeout(1200);
  const navigated = await page.evaluate((wanted) => {
    const [s, a] = wanted.split(":").map(Number);
    return {
      surahSelect: document.getElementById("surahSelect")?.value,
      ayahSelect: document.getElementById("ayahSelect")?.value,
      wantedSurah: s, wantedAyah: a,
      cardClosed: !document.querySelector(".quran-word-card"),
      returnBarVisible: !document.getElementById("wordCardReturnBar")?.hidden,
    };
  }, target);
  check(`${lang} following a lemma-occurrence row navigates to its āyah`,
        Number(navigated.surahSelect) === navigated.wantedSurah && Number(navigated.ayahSelect) === navigated.wantedAyah,
        JSON.stringify(navigated));
  check(`${lang} the card closes on the way out (does not overlay the destination)`, navigated.cardClosed, JSON.stringify(navigated));
  check(`${lang} the existing "way back" bar appears, reused rather than duplicated`, navigated.returnBarVisible, JSON.stringify(navigated));

  // The whole interaction is a read. No write of any kind.
  const writes = await page.evaluate(() => (window.__fsLog || [])
    .filter((r) => /setDoc|updateDoc|batchCommit|txCommit/.test(r.kind)).length);
  check(`${lang} expanding and following lemma occurrences writes nothing`, writes === 0, `writes=${writes}`);

  // ERR_CERT_AUTHORITY_INVALID is this sandbox's own TLS interception on any
  // HTTPS fetch (recitation audio, etc.) -- a documented environmental
  // artifact (CLAUDE.md "Standing lessons"), not something the owner's real
  // browser will ever see. reading.mjs and panel.mjs already carve it out the
  // same way.
  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
  check(`${lang} no page errors`, real.length === 0, real.slice(0, 2).join(" | "));

  await page.screenshot({ path: `/tmp/lemma-occurrences-${lang}.png` });
  await ctx.close();
}

// A word whose lemma has exactly the count the card already showed BEFORE
// this round proves nothing was invented: the toggle must show precisely
// what the count line already claimed, never more, never fewer.
{
  console.log("\n=== the expanded list matches the count already shown ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openFixtureWord(page);
  const countClaimed = await page.evaluate(() => {
    const btn = document.querySelector("[data-word-lemma-toggle]");
    const m = btn?.textContent.match(/\d+/);
    return m ? Number(m[0]) : null;
  });
  await page.click("[data-word-lemma-toggle]");
  await page.waitForTimeout(2000);
  const shown = await page.evaluate(() => {
    const rows = document.querySelectorAll("[data-word-occurrence-goto]").length;
    const note = document.querySelector(".word-card-forms-note")?.textContent || "";
    const m = note.match(/of (\d+)/);
    return { rows, statedTotal: m ? Number(m[1]) : rows };
  });
  check("the stated total matches the count line exactly", shown.statedTotal === countClaimed,
        `claimed=${countClaimed} statedTotal=${shown.statedTotal}`);
  check("rows never exceed 50 even when the total is larger", shown.rows <= 50 && shown.rows <= shown.statedTotal,
        JSON.stringify(shown));
  await ctx.close();
}

// Moving to a different word collapses a previously-expanded lemma list --
// it is always THIS word's own lemma, never carried over onto a new one.
{
  console.log("\n=== the expansion does not leak onto the next word ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openFixtureWord(page);
  await page.click("[data-word-lemma-toggle]");
  await page.waitForTimeout(2000);
  const openedBefore = await page.evaluate(() => document.querySelector("[data-word-lemma-toggle]")?.getAttribute("aria-expanded"));
  check("expanded before moving", openedBefore === "true", openedBefore);
  await page.click('[data-word-card-move="next"]');
  await page.waitForTimeout(2000);
  const afterMove = await page.evaluate(() => {
    const btn = document.querySelector("[data-word-lemma-toggle]");
    return { expanded: btn?.getAttribute("aria-expanded"), rows: document.querySelectorAll("[data-word-occurrence-goto]").length };
  });
  check("the NEW word's own toggle starts collapsed", afterMove.expanded !== "true", JSON.stringify(afterMove));
  await ctx.close();
}

// Responsive: the added toggle/caret must not regress what this project has
// already measured clean for this exact card and fixture.
{
  console.log("\n=== geometry: the toggle does not cost tap-target or overflow regressions ===");
  const VIEWPORTS = [["320x640", 320, 640], ["390x844", 390, 844], ["412x915", 412, 915]];
  for (const lang of ["en", "bn"]) {
    for (const [name, width, height] of VIEWPORTS) {
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height } });
      const { page } = await openPage(ctx, "/app/quranrevival.html");
      await openFixtureWord(page);
      const m = await page.evaluate((vw) => {
        const btn = document.querySelector("[data-word-lemma-toggle]");
        const r = btn?.getBoundingClientRect();
        return {
          present: !!btn,
          tapH: r ? Math.round(r.height) : 0,
          right: r ? Math.round(r.right) : 0,
          docOverflow: document.documentElement.scrollWidth > vw,
        };
      }, width);
      check(`${lang} ${name} the toggle is a real tap target (>=36px tall)`, m.present && m.tapH >= 36, JSON.stringify(m));
      check(`${lang} ${name} the toggle stays inside the viewport`, m.right <= width, JSON.stringify(m));
      check(`${lang} ${name} the page does not scroll sideways`, !m.docOverflow, m.docOverflow);
      await ctx.close();
    }
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
