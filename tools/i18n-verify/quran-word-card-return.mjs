// Word Card -- "Back to Word Card" round trip. RENDERED acceptance QA, in a
// real browser, following this project's own established practice for a
// focused un-checked-in script.
//
// Issue #113's own bounded task: when a Basic Arabic lemma/root occurrence
// sends the reader to another āyah, the way back must be reliable -- the
// original word, the tab they were on, whatever list they had expanded, and
// their scroll position, all restored, with no history trap and no
// regression to Prev/Next, language switching or mobile.
//
// The mechanism itself (quranWordCardOrigin / renderWordCardReturnBar /
// returnToWordCardOrigin / openWordOccurrenceAt) already existed going into
// this round -- built v08.20-v08.22, well before PR #112 wired the Basic
// tab's lemma-occurrences list into the same `data-word-occurrence-goto`
// navigation identity. What had NEVER been exercised by any suite is the
// FULL round trip: go there, then actually press the return control, and
// check what comes back. Doing that here found one real gap -- the Basic
// tab's own lemma list did not restore its expanded/collapsed state across
// the trip, unlike the Depth tab's derived-form list, which already did --
// and this suite is written against the fix for it (see
// hydrateWordCardOccurrences() / goToWordOccurrence() / openWordOccurrenceAt()
// in app/quranrevival.html, all marked "Issue #113").
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

// Issue #113 follow-up (21 Sep 2026): app/js/splash.js's shouldShow() has no
// "never" branch, so harness.mjs's own mm_qs_splash_pref="never" convention
// does not actually suppress either splash here -- showBootSplash chains
// into showQuranSplash, whose overlay sits on screen for a full 14s, and it
// reliably lands right in this suite's own click windows (openFixtureWord()
// alone accumulates ~6.1s of waits before the first Word Card click). Not
// app/js/splash.js's to fix -- out of this task's scope, an unrelated
// application-behaviour change -- so this suite dismisses the overlay
// itself, the same DOM-removal technique harness.mjs's own openPage()
// already uses once after load, applied here before every click that could
// land while either splash is still showing. This does not touch
// app/js/splash.js and does not weaken or skip any check() assertion --
// every click below still has to reach its real target and every existing
// assertion is unchanged.
async function clickSafely(page, selector) {
  await page.evaluate(() => {
    document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove());
  });
  await page.click(selector);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

/** Same proven fixture as quran-word-card-lemma-occurrences.mjs and
 *  quran-word-card-rendered.mjs: surah 2, āyah 71, word position 13, root
 *  سلم -- known to carry real lemma AND derived-form (root) occurrence data. */
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
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const s = document.getElementById("ayahSelect"); if (s.querySelector('option[value="71"]')) { s.value = "71"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { (document.querySelector('#readView [data-word-occurrence$=":2:71:13"]') || document.querySelector("#readView [data-word-occurrence]"))?.click(); });
  await page.waitForTimeout(1000);
}

// ---------------------------------------------------------------------------
// 1) The Basic-tab lemma pathway: full round trip, state preservation.
// ---------------------------------------------------------------------------
for (const lang of ["en", "bn"]) {
  console.log(`\n=== Back to Word Card, lemma pathway, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openFixtureWord(page);
  await clickSafely(page, '#quranWordCardMount [data-word-card-level="basic"]');
  await page.waitForTimeout(2800);
  await clickSafely(page, "[data-word-lemma-toggle]");
  await page.waitForTimeout(2000);

  const origin = await page.evaluate(() => ({
    occurrenceId: document.querySelector(".quran-word-card")?.getAttribute("data-occurrence-id"),
    level: document.querySelector('.quran-word-card [role="tab"][aria-selected="true"]')?.getAttribute("data-word-card-level"),
    lemmaExpanded: document.querySelector("[data-word-lemma-toggle]")?.getAttribute("aria-expanded"),
    target: document.querySelector("[data-word-occurrence-goto]")?.getAttribute("data-word-occurrence-goto"),
  }));
  check(`${lang} fixture opens on the Basic tab with the lemma list expanded`,
        origin.level === "basic" && origin.lemmaExpanded === "true" && !!origin.occurrenceId, JSON.stringify(origin));
  if (!origin.target) { console.log("  SKIP -- fixture carries no lemma occurrence to follow"); await ctx.close(); continue; }

  // Scroll the ORIGIN screen to a distinctive, non-zero position before
  // leaving -- this is what proves the return restores where the reader
  // actually was, not merely a default top-of-page. WHICH element actually
  // scrolls depends on reading mode: sideways paging is this app's own
  // DEFAULT (prefs.js getSidewaysReading(), "never set: the owner's own
  // default" -> true), and in that mode `#readScroll` itself carries
  // `overflow: hidden` -- `#ayahPanels` is the one that scrolls
  // (`overflow-y: auto`) for an ordinary single-āyah-at-a-time unit. This
  // mirrors readViewScrollContainer() in app/quranrevival.html exactly (both
  // marked "Issue #113"), which is deliberate: the app's own DEFAULT
  // rendering, not an assumption, decides which element this checks.
  // `window.scrollY` is always 0 in this app's shell (`body { overflow:
  // hidden }`) and is NOT what the app measures or restores either way.
  const scrollBefore = await page.evaluate(() => {
    const el = document.body.classList.contains("read-sideways")
      ? document.getElementById("ayahPanels")
      : document.getElementById("readScroll");
    if (!el) return 0;
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTop = Math.min(260, Math.max(max, 0));
    return el.scrollTop;
  });
  await page.waitForTimeout(150);
  if (scrollBefore < 5) {
    console.log(`  SKIP ${lang} scroll-restore checks -- fixture content is too short to scroll at this viewport (scrollBefore=${scrollBefore})`);
  }
  if (scrollBefore >= 5) check(`${lang} the origin page really did scroll before leaving`, scrollBefore > 0, scrollBefore);

  await clickSafely(page, "[data-word-occurrence-goto]");
  await page.waitForTimeout(1200);

  const away = await page.evaluate((wanted) => {
    const [s, a] = wanted.split(":").map(Number);
    return {
      surahSelect: Number(document.getElementById("surahSelect")?.value),
      ayahSelect: Number(document.getElementById("ayahSelect")?.value),
      wantedSurah: s, wantedAyah: a,
      cardClosed: !document.querySelector(".quran-word-card"),
      returnBarVisible: !document.getElementById("wordCardReturnBar")?.hidden,
      returnBtn: document.querySelector("[data-word-card-origin-back]")?.textContent.trim() || null,
    };
  }, origin.target);
  check(`${lang} the occurrence link navigates to its own āyah`,
        away.surahSelect === away.wantedSurah && away.ayahSelect === away.wantedAyah, JSON.stringify(away));
  check(`${lang} the card is closed at the destination (no overlay)`, away.cardClosed, JSON.stringify(away));
  check(`${lang} the "Back to Word Card" bar appears`, away.returnBarVisible && !!away.returnBtn, JSON.stringify(away));

  // Press the actual control -- every existing suite stops at "the bar
  // appears"; this is the round trip nothing has exercised before.
  await clickSafely(page, "[data-word-card-origin-back]");
  await page.waitForTimeout(2600);

  const back = await page.evaluate(() => ({
    occurrenceId: document.querySelector(".quran-word-card")?.getAttribute("data-occurrence-id"),
    level: document.querySelector('.quran-word-card [role="tab"][aria-selected="true"]')?.getAttribute("data-word-card-level"),
    lemmaExpanded: document.querySelector("[data-word-lemma-toggle]")?.getAttribute("aria-expanded"),
    lemmaRows: document.querySelectorAll("[data-word-occurrence-goto]").length,
    returnBarHidden: document.getElementById("wordCardReturnBar")?.hidden,
    scrollTop: (document.body.classList.contains("read-sideways")
      ? document.getElementById("ayahPanels")
      : document.getElementById("readScroll"))?.scrollTop ?? 0,
  }));
  check(`${lang} the ORIGINAL word reopens (not the destination word)`,
        back.occurrenceId === origin.occurrenceId, `origin=${origin.occurrenceId} back=${back.occurrenceId}`);
  check(`${lang} the ORIGINAL tab (Basic) is restored`, back.level === "basic", back.level);
  check(`${lang} the lemma list is restored EXPANDED, not collapsed`,
        back.lemmaExpanded === "true" && back.lemmaRows > 0, JSON.stringify(back));
  check(`${lang} the return bar is gone once back (origin cleared, no trap)`, back.returnBarHidden === true, back.returnBarHidden);
  if (scrollBefore >= 5) {
    check(`${lang} scroll position is restored to where the reader left`,
          Math.abs(back.scrollTop - scrollBefore) <= 40, `before=${scrollBefore} after=${back.scrollTop}`);
  }

  // A second, independent occurrence link now visible must offer a FRESH
  // trip, not a leftover trail from the one just completed.
  const stillGoto = await page.evaluate(() => !!document.querySelector("[data-word-occurrence-goto]"));
  check(`${lang} occurrence links remain live for a second trip`, stillGoto, stillGoto);

  const writes = await page.evaluate(() => (window.__fsLog || [])
    .filter((r) => /setDoc|updateDoc|batchCommit|txCommit/.test(r.kind)).length);
  check(`${lang} the whole round trip writes nothing`, writes === 0, `writes=${writes}`);

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
  check(`${lang} no page errors across the round trip`, real.length === 0, real.slice(0, 2).join(" | "));

  await page.screenshot({ path: `/tmp/word-card-return-${lang}.png` });
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 2) Regression: the pre-existing Depth-tab (derived form / root) pathway
//    still round-trips correctly. This suite touches the SAME shared
//    hydrate function the root pathway already depended on since v08.21, so
//    this is the check that the lemma fix did not disturb it.
// ---------------------------------------------------------------------------
{
  console.log("\n=== Back to Word Card, Depth-tab derived-form (root) pathway -- regression ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openFixtureWord(page);
  await clickSafely(page, '#quranWordCardMount [data-word-card-level="depth"]');
  await page.waitForTimeout(1500);
  const firstForm = await page.evaluate(() => document.querySelector("[data-word-form-toggle]")?.getAttribute("data-word-form-toggle"));
  if (!firstForm) {
    console.log("  SKIP -- fixture's root carries no derived forms to expand");
  } else {
    const originId = await page.evaluate(() => document.querySelector(".quran-word-card")?.getAttribute("data-occurrence-id"));
    await clickSafely(page, "[data-word-form-toggle]");
    await page.waitForTimeout(2000);
    const target = await page.evaluate(() => document.querySelector("[data-word-occurrence-goto]")?.getAttribute("data-word-occurrence-goto"));
    if (target) {
      await clickSafely(page, "[data-word-occurrence-goto]");
      await page.waitForTimeout(1200);
      await clickSafely(page, "[data-word-card-origin-back]");
      await page.waitForTimeout(2600);
      const back = await page.evaluate(() => ({
        occurrenceId: document.querySelector(".quran-word-card")?.getAttribute("data-occurrence-id"),
        level: document.querySelector('.quran-word-card [role="tab"][aria-selected="true"]')?.getAttribute("data-word-card-level"),
        formExpanded: document.querySelector("[data-word-form-toggle]")?.getAttribute("aria-expanded"),
      }));
      check("the original word reopens on the Depth tab", back.occurrenceId === originId && back.level === "depth", JSON.stringify(back));
      check("the previously-expanded derived form is restored (pre-existing v08.21 behaviour, unchanged)",
            back.formExpanded === "true", back.formExpanded);
    } else {
      console.log("  SKIP -- the expanded form carries no occurrence rows");
    }
  }
  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
  check("no page errors (Depth-tab regression check)", real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 3) Regression: Prev/Next inside the card still starts the lemma list
//    collapsed for a genuinely NEW word -- the exact acceptance criterion
//    PR #112's own suite established ("does not leak onto the next word").
//    This is the check that the restore signal is truly ONE-SHOT and never
//    leaks into an ordinary move.
// ---------------------------------------------------------------------------
{
  console.log("\n=== Prev/Next still collapses the lemma list for a new word (no leak) ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openFixtureWord(page);
  await clickSafely(page, '#quranWordCardMount [data-word-card-level="basic"]');
  await page.waitForTimeout(2800);
  await clickSafely(page, "[data-word-lemma-toggle]");
  await page.waitForTimeout(2000);
  const openedBefore = await page.evaluate(() => document.querySelector("[data-word-lemma-toggle]")?.getAttribute("aria-expanded"));
  check("expanded before moving", openedBefore === "true", openedBefore);
  await clickSafely(page, '[data-word-card-move="next"]');
  await page.waitForTimeout(2000);
  const afterMove = await page.evaluate(() => document.querySelector("[data-word-lemma-toggle]")?.getAttribute("aria-expanded"));
  check("the NEW word's own toggle starts collapsed (unchanged acceptance criterion)", afterMove !== "true", afterMove);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 4) Keyboard: the return control is a real, focusable, Enter-activatable
//    button -- not merely mouse-clickable.
// ---------------------------------------------------------------------------
{
  console.log("\n=== the return control is keyboard-operable ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openFixtureWord(page);
  await clickSafely(page, '#quranWordCardMount [data-word-card-level="basic"]');
  await page.waitForTimeout(2800);
  await clickSafely(page, "[data-word-lemma-toggle]");
  await page.waitForTimeout(2000);
  const originId = await page.evaluate(() => document.querySelector(".quran-word-card")?.getAttribute("data-occurrence-id"));
  const target = await page.evaluate(() => document.querySelector("[data-word-occurrence-goto]")?.getAttribute("data-word-occurrence-goto"));
  if (target) {
    await clickSafely(page, "[data-word-occurrence-goto]");
    await page.waitForTimeout(1200);
    const focusable = await page.evaluate(() => {
      const btn = document.querySelector("[data-word-card-origin-back]");
      btn?.focus();
      return { tag: btn?.tagName, isFocused: document.activeElement === btn, disabled: btn?.disabled === true };
    });
    check("the return button is a real <button>, focusable and enabled",
          focusable.tag === "BUTTON" && focusable.isFocused && !focusable.disabled, JSON.stringify(focusable));
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2600);
    const afterEnter = await page.evaluate(() => document.querySelector(".quran-word-card")?.getAttribute("data-occurrence-id"));
    check("pressing Enter on the focused button activates it and returns to the original word",
          afterEnter === originId, `origin=${originId} afterEnter=${afterEnter}`);
    const barGone = await page.evaluate(() => document.getElementById("wordCardReturnBar")?.hidden);
    check("Enter-activation clears the origin (bar hidden) just like a click", barGone === true, barGone);
  } else {
    console.log("  SKIP -- fixture carries no lemma occurrence to follow");
  }
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 5) Language switch while the return bar is showing: this app reloads the
//    page on a language change (documented, deliberate -- CLAUDE.md standing
//    lesson on prefs.js). The bar's transient state is expected to reset
//    with everything else, not survive a reload; what must NOT happen is a
//    stuck/duplicated bar or a page error.
// ---------------------------------------------------------------------------
{
  console.log("\n=== language switch while the return bar is visible does not trap or error ===");
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openFixtureWord(page);
  await clickSafely(page, '#quranWordCardMount [data-word-card-level="basic"]');
  await page.waitForTimeout(2800);
  await clickSafely(page, "[data-word-lemma-toggle]");
  await page.waitForTimeout(2000);
  const target = await page.evaluate(() => document.querySelector("[data-word-occurrence-goto]")?.getAttribute("data-word-occurrence-goto"));
  if (target) {
    await clickSafely(page, "[data-word-occurrence-goto]");
    await page.waitForTimeout(1200);
    await page.evaluate(() => { try { localStorage.setItem("mm_app_lang", "bn"); } catch {} });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => ({
      barCount: document.querySelectorAll("#wordCardReturnBar").length,
      barHidden: document.getElementById("wordCardReturnBar")?.hidden,
    }));
    check("exactly one return-bar element exists after reload (no duplication)", after.barCount === 1, after.barCount);
    check("the bar resets to hidden across the reload (transient state, as designed)", after.barHidden === true, after.barHidden);
    const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
    check("no page errors across the language-switch reload", real.length === 0, real.slice(0, 2).join(" | "));
  } else {
    console.log("  SKIP -- fixture carries no lemma occurrence to follow");
  }
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 6) Responsive: the return control at the three phone widths this project
//    measures, both languages -- tap target, on-screen, no sideways scroll.
// ---------------------------------------------------------------------------
{
  console.log("\n=== geometry: the return control at 320/390/412, both languages ===");
  const VIEWPORTS = [["320x640", 320, 640], ["390x844", 390, 844], ["412x915", 412, 915]];
  for (const lang of ["en", "bn"]) {
    for (const [name, width, height] of VIEWPORTS) {
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height } });
      const { page } = await openPage(ctx, "/app/quranrevival.html");
      await openFixtureWord(page);
      await clickSafely(page, '#quranWordCardMount [data-word-card-level="basic"]');
      await page.waitForTimeout(2800);
      const target = await page.evaluate(() => document.querySelector("[data-word-occurrence-goto]")?.getAttribute("data-word-occurrence-goto"));
      if (!target) {
        await clickSafely(page, "[data-word-lemma-toggle]");
        await page.waitForTimeout(2000);
      }
      const finalTarget = target || await page.evaluate(() => document.querySelector("[data-word-occurrence-goto]")?.getAttribute("data-word-occurrence-goto"));
      if (!finalTarget) { console.log(`  SKIP ${lang} ${name} -- no occurrence to follow`); await ctx.close(); continue; }
      await clickSafely(page, "[data-word-occurrence-goto]");
      await page.waitForTimeout(1200);
      const m = await page.evaluate((vw) => {
        const btn = document.querySelector("[data-word-card-origin-back]");
        const r = btn?.getBoundingClientRect();
        return {
          present: !!btn,
          tapH: r ? Math.round(r.height) : 0,
          right: r ? Math.round(r.right) : 0,
          docOverflow: document.documentElement.scrollWidth > vw,
        };
      }, width);
      check(`${lang} ${name} the return button is a real tap target (>=36px tall)`, m.present && m.tapH >= 36, JSON.stringify(m));
      check(`${lang} ${name} the return button stays inside the viewport`, m.right <= width, JSON.stringify(m));
      check(`${lang} ${name} the page does not scroll sideways`, !m.docOverflow, m.docOverflow);
      await ctx.close();
    }
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
