// Word Card -- Note-view-origin "Back to Word Card" round trip. RENDERED
// acceptance QA, in a real browser, following this project's own established
// practice for a focused un-checked-in script.
//
// Issue #113's own bounded task: PR #135 flagged the Note view's own scroll
// surface as a third, more complex case left the same way as the (then
// unfixed) flow-mode gap -- "a materially different restore this task does
// not reach". PR #138 later found the flow-mode half of that flag WAS a real
// defect. This suite investigates the Note-view half on its own terms,
// per the standing lesson "a failing check is a wrong assertion surprisingly
// often... investigate before 'fixing' the app" -- here inverted: investigate
// before assuming a flagged gap IS a defect.
//
// GATE A FINDING (see the dated report for the full account): reproducing the
// path in a real browser -- open a word from INSIDE the Note view's own
// word-by-word panel (noteScopeCanWbwRoot()/renderWordByWordPanel(), the
// same shared ayah-renderer.js panel the Read screen uses), follow a
// lemma-linked occurrence to a DIFFERENT surah, then press "Back to Word
// Card" -- shows scroll position, the active tab, the lemma list's expanded
// state and keyboard focus are ALL already correct. Reading the mechanism
// explains why: goToWordOccurrence()/openWordOccurrenceAt() never call
// renderNoteViewNow() (grepped -- it is not among renderNoteViewNow()'s own
// call sites). The round trip only ever calls setStageView(), which toggles
// #noteView's [hidden] attribute; #noteView's own .note-body DOM is neither
// destroyed nor rebuilt while the reader is away on the destination āyah's
// Read screen, so there is nothing for a scroll-restore mechanism to do --
// the browser never had a reason to reset it. This differs structurally from
// the flow-mode case PR #138 fixed, where renderFlowView() genuinely replaces
// #pageViewContainer's innerHTML on every surah change.
//
// This suite exists to PROVE that finding by measurement, not merely assert
// it, and to guard it as a regression: if a future round makes the Note-view
// round trip call renderNoteViewNow() (a real possibility -- Prev/Next
// inside Note, a QCR collection toggle and several other paths already do,
// per renderNoteViewNow()'s own call-site comment), the scroll/tab/lemma/
// focus state this suite checks would silently start being lost, exactly the
// class of defect PR #135's Basic-tab lemma list and PR #138's flow-mode
// arrival both were.
//
// CORRECTED 21 Sep 2026 (issue #113 task: "correct the acceptance test in
// #139"). Three defects in THIS ACCEPTANCE TEST, none in the app:
// (1) the "cross-surah" target filter was `!t.startsWith("2:71:")`, which
//     excludes only the origin's own exact surah:āyah prefix -- a target
//     like "2:100:3" (same surah 2, a different āyah) would have wrongly
//     passed as "cross-surah" while landing on the SAME surah. It now
//     compares the target's own leading segment, parsed as a number,
//     against the declared ORIGIN_SURAH constant.
// (2) the only assertion that the destination was really a different surah
//     compared the RENDERED page state against a "wanted" surah/āyah PARSED
//     FROM THE SAME LINK just clicked -- a consistency check on the app's
//     own navigation, not independent proof of a genuine cross-surah trip.
//     A new check compares the rendered `surahSelect` value directly against
//     ORIGIN_SURAH.
// (3) several essential preconditions (the fixture opening in the Note
//     view's own mount at desktop width, a lemma list existing to expand, a
//     cross-surah occurrence existing to follow, and enough Note-body
//     content to scroll) were silent `console.log("SKIP...")` continues with
//     NO check() call recorded -- so a run missing any of them still
//     reported "N passed, 0 failed" while quietly testing nothing for that
//     case. Every one of those is a named, failing check() now.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// The fixture's own origin surah/āyah (surah 2, āyah 71) -- named here rather
// than left as scattered literals so the "genuinely a different SURAH" checks
// below compare against one declared number, not a re-typed one.
const ORIGIN_SURAH = 2;
const ORIGIN_AYAH = 71;

/** Given the raw `data-word-occurrence-goto` targets on the open Word Card,
 *  find one landing on a surah NUMBER different from ORIGIN_SURAH.
 *
 *  CORRECTED 21 Sep 2026 (issue #113 task): the original filter was
 *  `t.startsWith("2:71:")`, which excludes only the origin's own exact
 *  "surah:ayah:" prefix -- so a target like "2:100:3" (surah 2, a DIFFERENT
 *  āyah) does not start with "2:71:" and would have wrongly passed as a
 *  "cross-surah" target while landing on the SAME surah. Comparing the
 *  target's own leading segment, parsed as a number, against ORIGIN_SURAH is
 *  the actual acceptance criterion the task names: "target surah != origin
 *  surah, not merely a different occurrence/ayah". */
function findCrossSurahTarget(targets) {
  return targets.find((t) => Number(t.split(":")[0]) !== ORIGIN_SURAH);
}

/** Same proven fixture surah/āyah as quran-word-card-return.mjs and
 *  quran-word-card-flow-nav.mjs (surah 2, āyah 71) -- known to carry real
 *  lemma occurrence data reaching a DIFFERENT surah (4:92), which is what
 *  proves this is a genuine cross-surah round trip and not a same-content
 *  coincidence. Lands on the Note view directly, with word-by-word on, so
 *  the fixture word is opened from INSIDE #noteView's own WbW panel rather
 *  than from the Read screen -- the one thing PR #135's own suite never
 *  covered. */
async function openFixtureWordInNoteView(page) {
  const studyReachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!studyReachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const t = document.getElementById("wbwShowToggle");
    if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(600);
  await page.evaluate((surah) => { const s = document.getElementById("surahSelect"); s.value = String(surah); s.dispatchEvent(new Event("change", { bubbles: true })); }, ORIGIN_SURAH);
  await page.waitForTimeout(2500);
  await page.evaluate((ayah) => { const s = document.getElementById("ayahSelect"); if (s.querySelector(`option[value="${ayah}"]`)) { s.value = String(ayah); s.dispatchEvent(new Event("change", { bubbles: true })); } }, ORIGIN_AYAH);
  await page.waitForTimeout(1500);
  const noteReachable = await page.evaluate(() => {
    const b = document.getElementById("tabNoteBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!noteReachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabNoteBtn");
  await page.waitForTimeout(1500);
  await page.evaluate((suffix) => {
    (document.querySelector(`#noteView [data-word-occurrence$="${suffix}"]`) || document.querySelector("#noteView [data-word-occurrence]"))?.click();
  }, `:${ORIGIN_SURAH}:${ORIGIN_AYAH}:13`);
  await page.waitForTimeout(1000);
}

// ---------------------------------------------------------------------------
// 1) The full round trip, opened from the Note view: scroll, tab, lemma
//    expansion and keyboard focus, both languages, a genuine cross-surah hop.
// ---------------------------------------------------------------------------
for (const lang of ["en", "bn"]) {
  console.log(`\n=== Note-view-origin round trip, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openFixtureWordInNoteView(page);

  const landed = await page.evaluate(() => ({
    noteHidden: document.getElementById("noteView")?.hidden,
    cardInNoteMount: !!document.querySelector("#quranWordCardMountNote .quran-word-card"),
  }));
  check(`${lang} the word opens INTO the Note view's own mount, not the Read one`,
        landed.noteHidden === false && landed.cardInNoteMount, JSON.stringify(landed));
  if (!landed.cardInNoteMount) { console.log("  SKIP -- fixture did not open in the Note view this run"); await ctx.close(); continue; }

  // Baseline AFTER the Note view's own one-time "ensure this ayahNotes doc is
  // writable" touch (ensureAyahNotesWritable() in ayah-notes.js, called by
  // openNoteView() on every first visit, gated by its own writabilityChecked
  // cache so it never repeats) -- that write belongs to opening the Note
  // view at all, not to the word-card round trip this suite is testing, so
  // the "writes nothing" check below counts writes AFTER this baseline only.
  const writesBaseline = await page.evaluate(() => (window.__fsLog || [])
    .filter((r) => /setDoc|updateDoc|batchCommit|txCommit/.test(r.kind)).length);

  await page.click('#quranWordCardMountNote [data-word-card-level="basic"]');
  await page.waitForTimeout(2800);
  const hasLemmaToggle = await page.evaluate(() => !!document.querySelector("#quranWordCardMountNote [data-word-lemma-toggle]"));
  // CORRECTED 21 Sep 2026 (issue #113 task): a missing lemma list is an
  // ESSENTIAL precondition for everything below -- without it there is no
  // cross-surah occurrence to follow, so the rest of this round trip proves
  // nothing. This used to be a silent `continue` with no check() recorded at
  // all, which let the run report "N passed, 0 failed" while quietly
  // testing nothing for this language. It is a named, failing check now.
  check(`${lang} the fixture's Basic tab carries a lemma list to expand (essential precondition)`, hasLemmaToggle, hasLemmaToggle);
  if (!hasLemmaToggle) { console.log("  fixture carries no lemma list this run -- recorded as a failure above, not a skip"); await ctx.close(); continue; }
  await page.click("#quranWordCardMountNote [data-word-lemma-toggle]");
  await page.waitForTimeout(2000);

  // Pick an occurrence on a DIFFERENT surah than the origin (2:71) -- a
  // same-surah hop would prove nothing about whether the Note view's own
  // content genuinely survives being left and returned to.
  const allTargets = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#quranWordCardMountNote [data-word-occurrence-goto]"))
      .map((e) => e.getAttribute("data-word-occurrence-goto")));
  const crossSurahTarget = findCrossSurahTarget(allTargets);
  // CORRECTED 21 Sep 2026: same class of fix as above -- a fixture with no
  // cross-surah occurrence available is an essential precondition failure,
  // not a thing to silently skip past.
  check(`${lang} the fixture's lemma list contains at least one occurrence on a genuinely different SURAH than the origin (essential precondition)`,
        !!crossSurahTarget, `origin surah=${ORIGIN_SURAH}, targets=${JSON.stringify(allTargets)}`);
  if (!crossSurahTarget) { console.log(`  fixture's lemma list has no cross-surah occurrence this run (targets=${allTargets}) -- recorded as a failure above, not a skip`); await ctx.close(); continue; }
  const targetSurah = Number(crossSurahTarget.split(":")[0]);
  check(`${lang} the chosen target's own surah number (${targetSurah}) really differs from the origin's (${ORIGIN_SURAH}) -- not merely a different occurrence/āyah`,
        targetSurah !== ORIGIN_SURAH, crossSurahTarget);
  await page.evaluate((t) => {
    document.querySelectorAll("#quranWordCardMountNote [data-word-occurrence-goto]")
      .forEach((e) => { if (e.getAttribute("data-word-occurrence-goto") === t) e.setAttribute("data-repro-target", "1"); });
  }, crossSurahTarget);

  const origin = await page.evaluate(() => ({
    occurrenceId: document.querySelector(".quran-word-card")?.getAttribute("data-occurrence-id"),
  }));

  // Scroll the Note view's own body to a distinctive, non-zero position --
  // .note-body is Note view's real scroll surface (overflow-y: auto),
  // exactly parallel to #ayahPanels for the Read view (see
  // readViewScrollContainer()'s own comment in app/quranrevival.html and
  // swipeDragEl()'s pre-existing use of the identical selector).
  const scrollBefore = await page.evaluate(() => {
    const el = document.querySelector("#noteView .note-body");
    if (!el) return null;
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTop = Math.min(120, Math.max(max, 0));
    return el.scrollTop;
  });
  // CORRECTED 21 Sep 2026: an unscrollable fixture at this viewport is an
  // essential precondition for the scroll-restore assertion below (line
  // ~198) -- it used to be a bare console.log with no check() call at all,
  // so a fixture that never scrolled would silently drop scroll coverage
  // while the run still reported full success. Recorded as a named,
  // failing check now; the final restore assertion still only runs when
  // this precondition actually held (asserting equality against a
  // meaningless near-zero scrollBefore would prove nothing).
  check(`${lang} the Note view's own body actually has enough content to scroll at this viewport (essential precondition for the scroll-restore assertion below)`,
        scrollBefore !== null && scrollBefore >= 5, `scrollBefore=${scrollBefore}`);

  await page.click('[data-repro-target="1"]');
  await page.waitForTimeout(1200);

  const away = await page.evaluate((wanted) => {
    const [s, a] = wanted.split(":").map(Number);
    return {
      surahSelect: Number(document.getElementById("surahSelect")?.value),
      ayahSelect: Number(document.getElementById("ayahSelect")?.value),
      wantedSurah: s, wantedAyah: a,
      noteHidden: document.getElementById("noteView")?.hidden,
      returnBarVisible: !document.getElementById("wordCardReturnBar")?.hidden,
    };
  }, crossSurahTarget);
  check(`${lang} the occurrence link really navigates to the OTHER surah`,
        away.surahSelect === away.wantedSurah && away.ayahSelect === away.wantedAyah, JSON.stringify(away));
  // CORRECTED 21 Sep 2026 (issue #113 task): the check above only proves the
  // app went where its OWN href said it would -- a consistency check on the
  // app's own navigation, not independent proof the destination is really a
  // different surah. This reads the ACTUAL rendered `surahSelect` value off
  // the live page and compares it against the declared ORIGIN_SURAH
  // constant directly, asserting the real destination reached in the
  // browser -- not assumed from the link href.
  check(`${lang} the destination actually reached is a GENUINELY DIFFERENT surah than the origin (${ORIGIN_SURAH}), read off the rendered page state`,
        away.surahSelect !== ORIGIN_SURAH, `origin=${ORIGIN_SURAH} away.surahSelect=${away.surahSelect}`);
  check(`${lang} the Note view is left (Read screen takes over) while away`, away.noteHidden === true, away.noteHidden);
  check(`${lang} the "Back to Word Card" bar appears`, away.returnBarVisible, away.returnBarVisible);

  await page.click("[data-word-card-origin-back]");
  await page.waitForTimeout(2600);

  const back = await page.evaluate(() => ({
    noteHidden: document.getElementById("noteView")?.hidden,
    occurrenceId: document.querySelector(".quran-word-card")?.getAttribute("data-occurrence-id"),
    level: document.querySelector('.quran-word-card [role="tab"][aria-selected="true"]')?.getAttribute("data-word-card-level"),
    lemmaExpanded: document.querySelector("[data-word-lemma-toggle]")?.getAttribute("aria-expanded"),
    scrollTop: document.querySelector("#noteView .note-body")?.scrollTop ?? null,
    surahSelect: Number(document.getElementById("surahSelect")?.value),
    ayahSelect: Number(document.getElementById("ayahSelect")?.value),
    returnBarHidden: document.getElementById("wordCardReturnBar")?.hidden,
    focusIsCloseButton: document.activeElement?.hasAttribute("data-word-card-close") === true
      && document.getElementById("quranWordCardMountNote")?.contains(document.activeElement) === true,
  }));
  check(`${lang} returning lands back on the Note view`, back.noteHidden === false, back.noteHidden);
  check(`${lang} the ORIGINAL surah/āyah (${ORIGIN_SURAH}:${ORIGIN_AYAH}) is restored, not the destination`,
        back.surahSelect === ORIGIN_SURAH && back.ayahSelect === ORIGIN_AYAH, JSON.stringify(back));
  check(`${lang} the ORIGINAL word reopens`, back.occurrenceId === origin.occurrenceId,
        `origin=${origin.occurrenceId} back=${back.occurrenceId}`);
  check(`${lang} the ORIGINAL tab (Basic) is restored`, back.level === "basic", back.level);
  check(`${lang} the lemma list is restored EXPANDED`, back.lemmaExpanded === "true", back.lemmaExpanded);
  check(`${lang} the return bar is gone once back (no trap)`, back.returnBarHidden === true, back.returnBarHidden);
  check(`${lang} focus returns to the reopened card's own close button, inside the Note mount`,
        back.focusIsCloseButton, JSON.stringify(back));
  if (scrollBefore !== null && scrollBefore >= 5) {
    check(`${lang} the Note view's own scroll position is exactly where the reader left it`,
          back.scrollTop === scrollBefore, `before=${scrollBefore} after=${back.scrollTop}`);
  }

  const writesAfter = await page.evaluate(() => (window.__fsLog || [])
    .filter((r) => /setDoc|updateDoc|batchCommit|txCommit/.test(r.kind)).length);
  check(`${lang} the round trip itself writes nothing (beyond the Note view's own one-time open touch)`,
        writesAfter === writesBaseline, `baseline=${writesBaseline} after=${writesAfter}`);

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
  check(`${lang} no page errors across the round trip`, real.length === 0, real.slice(0, 2).join(" | "));

  await page.screenshot({ path: `/tmp/word-card-note-origin-${lang}.png` });
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 2) Desktop width (>=900px): the Note view is its own movable/resizable
//    popup window there (PR #137's own mechanism) rather than the mobile
//    fixed layout -- confirm the same round trip still restores everything
//    inside that different chrome.
// ---------------------------------------------------------------------------
{
  console.log("\n=== Note-view-origin round trip at desktop width (popup chrome) ===");
  const ctx = await newContext(browser, { viewport: { width: 1100, height: 800 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openFixtureWordInNoteView(page);
  const landed = await page.evaluate(() => !!document.querySelector("#quranWordCardMountNote .quran-word-card"));
  // CORRECTED 21 Sep 2026 (issue #113 task): every precondition below used to
  // be a bare `console.log("SKIP...")` with NO check() call anywhere in this
  // branch -- so if the fixture failed to open, carried no lemma list, or had
  // no cross-surah occurrence at desktop width, this whole section silently
  // asserted nothing while the run still reported full success. Each
  // precondition is a named, failing check now, matching the mobile section
  // above.
  check("desktop: the fixture word opens into the Note popup's own mount (essential precondition)", landed, landed);
  if (!landed) {
    console.log("  fixture did not open in the Note view this run -- recorded as a failure above, not a skip");
  } else {
    await page.click('#quranWordCardMountNote [data-word-card-level="basic"]');
    await page.waitForTimeout(2800);
    const hasLemmaToggle = await page.evaluate(() => !!document.querySelector("#quranWordCardMountNote [data-word-lemma-toggle]"));
    check("desktop: the fixture's Basic tab carries a lemma list to expand (essential precondition)", hasLemmaToggle, hasLemmaToggle);
    if (!hasLemmaToggle) {
      console.log("  fixture carries no lemma list this run -- recorded as a failure above, not a skip");
    } else {
      await page.click("#quranWordCardMountNote [data-word-lemma-toggle]");
      await page.waitForTimeout(2000);
      const allTargets = await page.evaluate(() =>
        Array.from(document.querySelectorAll("#quranWordCardMountNote [data-word-occurrence-goto]"))
          .map((e) => e.getAttribute("data-word-occurrence-goto")));
      const crossSurahTarget = findCrossSurahTarget(allTargets);
      check("desktop: the fixture's lemma list contains at least one occurrence on a genuinely different SURAH than the origin (essential precondition)",
            !!crossSurahTarget, `origin surah=${ORIGIN_SURAH}, targets=${JSON.stringify(allTargets)}`);
      if (!crossSurahTarget) {
        console.log(`  fixture's lemma list has no cross-surah occurrence this run (targets=${allTargets}) -- recorded as a failure above, not a skip`);
      } else {
        const targetSurah = Number(crossSurahTarget.split(":")[0]);
        check(`desktop: the chosen target's own surah number (${targetSurah}) really differs from the origin's (${ORIGIN_SURAH})`,
              targetSurah !== ORIGIN_SURAH, crossSurahTarget);
        await page.evaluate((t) => {
          document.querySelectorAll("#quranWordCardMountNote [data-word-occurrence-goto]")
            .forEach((e) => { if (e.getAttribute("data-word-occurrence-goto") === t) e.setAttribute("data-repro-target", "1"); });
        }, crossSurahTarget);
        const scrollBefore = await page.evaluate(() => {
          const el = document.querySelector("#noteView .note-body");
          if (!el) return null;
          const max = el.scrollHeight - el.clientHeight;
          el.scrollTop = Math.min(120, Math.max(max, 0));
          return el.scrollTop;
        });
        check("desktop: the Note popup's own body actually has enough content to scroll at this viewport (essential precondition for the scroll-restore assertion below)",
              scrollBefore !== null && scrollBefore >= 5, `scrollBefore=${scrollBefore}`);
        await page.click('[data-repro-target="1"]');
        await page.waitForTimeout(1200);
        const away = await page.evaluate((wanted) => {
          const [s, a] = wanted.split(":").map(Number);
          return {
            surahSelect: Number(document.getElementById("surahSelect")?.value),
            ayahSelect: Number(document.getElementById("ayahSelect")?.value),
            wantedSurah: s, wantedAyah: a,
          };
        }, crossSurahTarget);
        check("desktop: the occurrence link really navigates to the OTHER surah",
              away.surahSelect === away.wantedSurah && away.ayahSelect === away.wantedAyah, JSON.stringify(away));
        check(`desktop: the destination actually reached is a GENUINELY DIFFERENT surah than the origin (${ORIGIN_SURAH}), read off the rendered page state`,
              away.surahSelect !== ORIGIN_SURAH, `origin=${ORIGIN_SURAH} away.surahSelect=${away.surahSelect}`);
        await page.click("[data-word-card-origin-back]");
        await page.waitForTimeout(2600);
        const back = await page.evaluate(() => ({
          noteHidden: document.getElementById("noteView")?.hidden,
          scrollTop: document.querySelector("#noteView .note-body")?.scrollTop ?? null,
          cardInNoteMount: !!document.querySelector("#quranWordCardMountNote .quran-word-card"),
        }));
        check("desktop: returning lands back on the Note view popup", back.noteHidden === false, back.noteHidden);
        check("desktop: the card reopens inside the Note popup's own mount", back.cardInNoteMount, back.cardInNoteMount);
        if (scrollBefore !== null && scrollBefore >= 5) {
          check("desktop: scroll position is exactly where the reader left it",
                back.scrollTop === scrollBefore, `before=${scrollBefore} after=${back.scrollTop}`);
        }
      }
    }
  }
  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
  check("desktop: no page errors", real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 3) The mechanism-level assertion behind the whole finding: the round trip
//    never calls renderNoteViewNow(). Proven structurally (source contains no
//    call to it inside the three functions that drive the trip), which is
//    WHY the scroll/tab/lemma/focus checks above pass without any restore
//    code written for this case -- and is exactly what a future round adding
//    such a call would break, which is the regression this suite exists to
//    catch even if it never runs against source again.
// ---------------------------------------------------------------------------
{
  console.log("\n=== source check: the round trip never rebuilds the Note view mid-trip ===");
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("../../app/quranrevival.html", import.meta.url), "utf8");
  const grab = (name) => {
    const start = src.indexOf(`function ${name}(`);
    if (start === -1) return null;
    let depth = 0, i = src.indexOf("{", start), end = i;
    for (; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
    return src.slice(start, end + 1);
  };
  const bodies = ["goToWordOccurrence", "navigateToAyah", "openWordOccurrenceAt", "returnToWordCardOrigin"]
    .map(grab).filter(Boolean).join("\n");
  check("goToWordOccurrence/navigateToAyah/openWordOccurrenceAt/returnToWordCardOrigin all resolved from source",
        bodies.length > 200, bodies.length);
  check("none of the round-trip functions call renderNoteViewNow()",
        !/renderNoteViewNow\s*\(/.test(bodies), "found a call -- the Note view IS rebuilt mid-trip now; the scroll/tab/lemma/focus checks above are the real acceptance test for that case, not this one");
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
