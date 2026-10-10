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
//
// UPDATED IN PLACE 10 Oct 2026 (Note view retirement, step b, issue #742).
// The Note view is gone: decision 95 made the Read view's 📝 Notes pane THE
// note, and #742 deleted #noteView, its renderer and the
// window.__dormantOpenNoteView() test seam this suite opened it by. So there
// is no "word opened from inside the Note view" any more, and the round trip
// this suite measured cannot be started. What it guarded still matters in one
// form: a word's way back (decision 86) must land on a view that EXISTS. The
// word round trip from the Read view -- the only origin left -- is measured in
// full (scroll, tab, lemma list, focus, a genuine cross-surah hop) by
// quran-word-card-return.mjs on the same 2:71 fixture; it is not repeated here.
// This suite now proves, with a positive control each, that:
//   1. the page boots with the Read view and a Word Card mount, and the
//      Note view and its seam are absent (so no origin can name it);
//   2. the round-trip functions still exist, return to "read", and never
//      name the Note view or call its deleted renderer.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// ---------------------------------------------------------------------------
// 1) Rendered: the Note view cannot be an origin, because it is not there.
// ---------------------------------------------------------------------------
for (const lang of ["en", "bn"]) {
  console.log(`\n=== the Note view is gone, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(800);
  const s = await page.evaluate(() => ({
    readView: !!document.getElementById("readView"),
    surahSelect: !!document.getElementById("surahSelect"),
    noteView: !!document.getElementById("noteView"),
    noteViewClass: !!document.querySelector(".note-view"),
    seam: typeof window.__dormantOpenNoteView,
  }));
  // Positive control: the page really booted, so the absences below are not
  // the vacuous result of a page that rendered nothing.
  check(`${lang} positive control: the page booted with #readView and #surahSelect`, s.readView && s.surahSelect, JSON.stringify(s));
  check(`${lang} #noteView is absent`, s.noteView === false, s.noteView);
  check(`${lang} no .note-view element is rendered`, s.noteViewClass === false, s.noteViewClass);
  check(`${lang} the dormant Note-view test seam is gone`, s.seam === "undefined", s.seam);
  const real = errors.filter((e) => !/ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com/.test(e));
  check(`${lang} no page errors`, real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 2) Source: the word round trip returns to the Read view and nothing else.
// ---------------------------------------------------------------------------
{
  console.log("\n=== source check: the round trip names only the Read view ===");
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
  // Comments are stripped first: several still describe the Note view's history.
  const strip = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const names = ["goToWordOccurrence", "navigateToAyah", "openWordOccurrenceAt", "returnToWordCardOrigin"];
  const found = names.map(grab);
  check("positive control: all four round-trip functions resolve from source",
        found.every(Boolean), names.filter((_, i) => !found[i]).join(", "));
  const bodies = strip(found.filter(Boolean).join("\n"));
  check("returnToWordCardOrigin returns to the Read view",
        /const returnView = "read"/.test(strip(found[3] || "")), "no `const returnView = \"read\"` in returnToWordCardOrigin");
  check("none of the round-trip functions call renderNoteViewNow()", !/renderNoteViewNow\s*\(/.test(bodies));
  check("none of the round-trip functions name #noteView or a \"note\" stage view",
        !/noteView|setStageView\(\s*["']note["']/.test(bodies));
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
