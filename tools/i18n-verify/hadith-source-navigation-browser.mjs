// Hadith H2 -- rendered-DOM evidence for the Topics/Search -> Books source
// bridge (issue #114, PR #141) and a regression check of #130's own Explore
// coverage sections, in a real Chromium tab rather than an ephemeral probe.
//
// Committed rather than run-and-discarded, per this repository's own
// standing lesson: "a screenshot is not a measurement, but it catches what
// measurements miss" -- and a script nobody can re-run is worth exactly one
// session's word for it. Run in both languages:
//
//   node tools/i18n-verify/hadith-source-navigation-browser.mjs en
//   node tools/i18n-verify/hadith-source-navigation-browser.mjs bn
//
// Exits 0 only if every check passed (the "meaningful exit code" lesson --
// several suites in this directory silently exited 0 on a real regression
// for months before that was fixed).
import { chromium, newContext, openPage } from "./harness.mjs";

const EXE = process.env.CHROMIUM_PATH || undefined;
const LANG = process.argv[2] === "bn" ? "bn" : "en";

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}`); }
}

const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
const ctx = await newContext(browser, { appLang: LANG, viewport: { width: 390, height: 844 } });
const { page, errors } = await openPage(ctx, "/app/hadith-collections.html");

const click = (sel) => page.click(sel);
const has = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const text = (sel) => page.evaluate((s) => document.querySelector(s)?.textContent ?? "", sel);
const settle = () => page.waitForTimeout(150);

console.log(`===== hadith-source-navigation-browser (${LANG}) =====`);

// --- Book breadcrumb: reproduced live, fixed, and now regression-guarded ---
// (issue #114, found by walking the rendered page rather than reading
// source). At the chapter-list level, the breadcrumb used to derive a
// book's title from an occurrence attached to it -- and no occurrence in
// this fixture is ever attached directly to a book that has a chapter
// level, so it silently fell through to the raw internal book id.
await click('[data-hadith-tab="collections"]');
await settle();
await click('[data-hadith-edition="synthetic-alpha-ar-v1"]');
await settle();
// --- Book/chapter row headings carry their own source-script `lang`/`dir`
// (issue #114 Gate B, found by reproduction). `.hadith-row-heading` prints
// the SOURCE edition's own native-script heading (e.g. "كتاب البداية"), and
// every OTHER source-script surface this component renders (the occurrence
// card's Arabic paragraph, the commentary panel's Arabic title) already
// stamps `lang`/`dir` -- this one did not. `getComputedStyle().direction`
// still read "rtl" even before the fix, because the Unicode Bidi Algorithm
// auto-detects a run of pure Arabic characters, so a sighted mouse-only
// check would never have caught this; `lang` has no such fallback, and a
// screen reader with no language cue reads the heading in the page's UI
// language voice, mispronouncing it. Checked at BOTH the book list (this
// edition, chapter-level) and the chapter list below, and again on the
// no-chapter-level edition further down -- `rawHeadingSpan()` is the one
// function all three paths call.
check("a book row's native-script heading carries lang=\"ar\" and dir=\"rtl\"",
  await page.evaluate(() => {
    const h = document.querySelector(".hadith-row-heading");
    return h?.getAttribute("lang") === "ar" && h?.getAttribute("dir") === "rtl" && h.textContent.trim().length > 0;
  }));
await click('[data-hadith-book="synthetic-alpha-b1"]');
await settle();
const bookCrumbText = await text(".hadith-crumb-current");
check("the book breadcrumb shows the book's TRANSLATED title, not its raw internal id",
  !bookCrumbText.includes("synthetic-alpha-b1") && bookCrumbText.trim().length > 0);
check("a chapter row's native-script heading carries lang=\"ar\" and dir=\"rtl\" too",
  await page.evaluate(() => {
    const h = document.querySelector(".hadith-row-heading");
    return h?.getAttribute("lang") === "ar" && h?.getAttribute("dir") === "rtl" && h.textContent.trim().length > 0;
  }));
await click('[data-hadith-chapter="synthetic-alpha-b1-c1"]');
await settle();
const chapterCrumbText = await text(".hadith-crumb-current");
check("the chapter breadcrumb shows the chapter's TRANSLATED title, not its raw internal id",
  !chapterCrumbText.includes("synthetic-alpha-b1-c1") && chapterCrumbText.trim().length > 0);
// Reset navigation state via the "Collections" breadcrumb (not the tab
// button -- state.editionId/bookId/chapterId persist across a tab switch,
// same as state.topicId does for Topics, so only the crumb's own reset
// handler clears them back to the edition list).
await click(".hadith-crumb");
await settle();

// --- Collections tab never shows a self-referential "View in source" -------
await click('[data-hadith-tab="collections"]');
await settle();
await click('[data-hadith-edition="synthetic-alpha-ar-v1"]');
await settle();
await click('[data-hadith-book="synthetic-alpha-b2"]');
await settle();
await click('[data-hadith-chapter="synthetic-alpha-b2-c1"]');
await settle();
check("Collections tab renders the repeat occurrence's own card",
  await has('[data-hadith-occurrence="syn-occ-0006"]'));
check("Collections tab shows NO 'View in source' control anywhere (I2-style self-reference guard)",
  !(await has("[data-hadith-view-source]")));
const repeatBadgeText = await text('[data-hadith-repeat="syn-occ-0005"]');
check("the repeat badge names the ORIGINAL occurrence's id",
  repeatBadgeText.includes("syn-occ-0005"));

// --- The repeat badge navigates to the original occurrence, focused --------
await click('[data-hadith-repeat="syn-occ-0005"]');
await settle();
check("clicking the repeat badge lands on the ORIGINAL occurrence's own card",
  await has('[data-hadith-occurrence="syn-occ-0005"]'));
check("the original occurrence's card carries the one-shot focus class",
  await page.evaluate(() =>
    document.querySelector('[data-hadith-occurrence="syn-occ-0005"]')?.classList.contains("hadith-card-focused")));

// One-shot: switching away and back without a new jump must NOT re-apply it.
await click('[data-hadith-tab="topic"]');
await settle();
await click('[data-hadith-tab="collections"]');
await settle();
check("the focus highlight is ONE-SHOT -- gone on the next unrelated render",
  !(await page.evaluate(() =>
    document.querySelector('[data-hadith-occurrence="syn-occ-0005"]')?.classList.contains("hadith-card-focused"))));

// --- Topics tab: list -> a topic's occurrences carry 'View in source' ------
await click('[data-hadith-tab="topic"]');
await settle();
check("the Topics tab opens on a LIST of topics, not one hardcoded topic",
  (await page.evaluate(() => document.querySelectorAll("[data-hadith-topic-row]").length)) >= 2);
await click('[data-hadith-topic-row="synthetic-topic-salah"]');
await settle();
check("a Topic detail's occurrence cards DO carry 'View in source'",
  await has("[data-hadith-view-source]"));
check("the Topic tab's own breadcrumb current-crumb carries aria-current=\"page\" too (issue #114 Gate A/B)",
  await page.evaluate(() => document.querySelector(".hadith-crumb-current")?.getAttribute("aria-current") === "page"));
const viewInSourceText = await text("[data-hadith-view-source]");

// --- Clicking 'View in source' from Topics jumps to Books, focused ---------
const sourceIdHandle = await page.evaluate(() => document.querySelector("[data-hadith-view-source]")?.dataset.hadithViewSource);
await click("[data-hadith-view-source]");
await settle();
check("the jump lands on the Collections tab",
  await page.evaluate(() => document.querySelector('[data-hadith-tab="collections"]').classList.contains("active")));
check("the jump lands on the SAME occurrence id the control named",
  await has(`[data-hadith-occurrence="${sourceIdHandle}"][data-hadith-focused="true"]`));

// Back to Topics: `state.topicId` persists across a tab switch (by design --
// the tab button only changes `state.view`), so the tab re-opens on the
// SAME topic detail rather than the list; the view's own back-crumb is the
// control that returns to the list, and it is a distinct control from the
// tab button, which this exercises directly rather than assuming.
await click('[data-hadith-tab="topic"]');
await settle();
check("switching back to the Topics tab re-opens the topic last viewed (state persists across tabs)",
  await has('[data-hadith-topic-back]'));
await click("[data-hadith-topic-back]");
await settle();
check("the Topics view's own back-crumb returns to the topic LIST",
  (await page.evaluate(() => document.querySelectorAll("[data-hadith-topic-row]").length)) >= 2);
await click('[data-hadith-topic-row="synthetic-topic-wudu"]');
await settle();
check("a SECOND topic (wudu) opens correctly from the list too",
  await page.evaluate(() => document.querySelector(".hadith-crumb-current")?.textContent?.length > 0));
await click("[data-hadith-topic-back]");
await settle();

// --- Search: a hit also carries 'View in source' and jumps correctly -------
await click('[data-hadith-tab="search"]');
await settle();
await page.fill("#hadithSearchInput", "Prayer");
await settle();
check("a Search hit renders at least one result",
  (await page.evaluate(() => document.querySelectorAll(".hadith-search-hit").length)) > 0);
check("a Search hit ALSO carries 'View in source' (same bridge as Topics)",
  await has(".hadith-search-hit [data-hadith-view-source]"));
const searchSourceId = await page.evaluate(() => document.querySelector(".hadith-search-hit [data-hadith-view-source]")?.dataset.hadithViewSource);
await click(".hadith-search-hit [data-hadith-view-source]");
await settle();
check("a Search jump lands on the Collections tab, on the same occurrence",
  await has(`[data-hadith-occurrence="${searchSourceId}"][data-hadith-focused="true"]`));

// --- #130 regression: both coverage sections still render, no id collision -
await click('[data-hadith-tab="explore"]');
await settle();
const exploreText = await page.evaluate(() => document.body.innerText);
check("Explore still renders 'Translation coverage' (#122/#103 regression)",
  exploreText.includes("Translation coverage"));
check("Explore still renders 'Topic coverage' (#122/#118 regression)",
  exploreText.includes("Topic coverage"));
check("the OLD shared 'hadithCoverageEdition' attribute is GONE (the naming-collision fix holds)",
  !(await has("[data-hadith-coverage-edition]")));
check("translation coverage now uses its OWN renamed attribute",
  (await page.evaluate(() => document.querySelectorAll("[data-hadith-translation-coverage-edition]").length)) > 0);
check("topic coverage now uses its OWN renamed attribute",
  (await page.evaluate(() => document.querySelectorAll("[data-hadith-topic-coverage-edition]").length)) > 0);

// --- Honest fallback: the un-keyed English literals never go blank or
// invent a Bangla string -- they print verbatim in EITHER language, read
// off the render where each one is actually on screen.
check(`the un-keyed literal "View in source" renders verbatim in ${LANG} (honest fallback, never blank)`,
  viewInSourceText.trim() === "View in source");
for (const literal of ["Translation coverage", "Topic coverage"]) {
  check(`the un-keyed literal "${literal}" renders verbatim in ${LANG} (honest fallback, never blank)`,
    exploreText.includes(literal));
}

// --- Keyboard focus survives a Books/chapters navigation step --------------
// (issue #114, reproduced live). `render()` does `root.textContent = ""` and
// rebuilds the whole Collections subtree on every navigation step, so the
// button a keyboard user just pressed no longer exists in the DOM -- and
// without `focusCollectionsLanding()` the browser silently drops focus to
// `<body>`, sending a Tab-only reader back to the top of the page on EVERY
// step through collection -> book -> chapter, and on every step back via the
// breadcrumb. This is independent of the one-shot highlight above (which
// covers only a Topics/Search "View in source" jump and never calls
// `.focus()` at all) and of the breadcrumb TEXT fix earlier in this file
// (which does not touch focus).
await click('[data-hadith-tab="collections"]');
await settle();
// `state.editionId` may already be set from the Search jump above -- reset
// to the top-level edition list first via the breadcrumb's own reset, the
// same control the rest of this file already uses for this.
if (await has(".hadith-crumb")) { await click(".hadith-crumb"); await settle(); }
await click('[data-hadith-edition="synthetic-alpha-ar-v1"]');
await settle();
check("picking an edition does NOT drop keyboard focus to <body>",
  !(await page.evaluate(() => document.activeElement === document.body)));
// --- Gate A independent re-check (issue #114, comment 5761151633) ----------
// The check above only asked "not <body>" -- it never asked what the landing
// element SAYS. Reproduced live: before this fix, the breadcrumb had no
// edition-level crumb at all, so `focusCollectionsLanding()`'s landing
// element (the bar's own last child) was the "Collections" crumb itself,
// unchanged text -- a keyboard/screen-reader user who had just picked an
// edition heard "Collections" again and learned nothing about which one.
const ALPHA_COLLECTION_NAME = { en: "Sample Collection Alpha", bn: "নমুনা সংকলন আলফা" }[LANG];
check(`picking an edition lands focus on a crumb reading the edition's own translated name ("${ALPHA_COLLECTION_NAME}"), not the generic 'Collections' crumb again`,
  await page.evaluate((expected) => {
    const ae = document.activeElement;
    return !!ae && ae !== document.querySelector(".hadith-crumbs > :first-child") && ae.textContent === expected;
  }, ALPHA_COLLECTION_NAME));
// --- Gate A/B, issue #114 comment 5761973722: the current crumb carries no
// assistive-tech signal for "this is where you are", which only grew more
// load-bearing once the edition crumb above made the trail deeper. Fixed
// with `aria-current="page"` -- a fixed ARIA token, not translatable text,
// so it needs no new Bangla key. Exclusive to the CURRENT crumb: a mutation
// that stamped it onto every crumb must fail the second check below.
check("the edition-level landing crumb carries aria-current=\"page\"",
  await page.evaluate(() => document.activeElement?.getAttribute("aria-current") === "page"));
check("no CLICKABLE crumb (a real .hadith-crumb button) carries aria-current",
  await page.evaluate(() => Array.from(document.querySelectorAll(".hadith-crumbs .hadith-crumb"))
    .every((b) => b.getAttribute("aria-current") === null)));
// The fix must not regress the OTHER half of Gate A: the very next real Tab
// key press (not a click) still has to continue at the first BOOK row, never
// back at the top of the page and never stuck on the crumb it just landed on.
await page.keyboard.press("Tab");
check("the next real Tab key press from that landing continues at the first book row",
  await page.evaluate(() => document.activeElement?.getAttribute("data-hadith-book") === "synthetic-alpha-b1"));
// The landing crumb is a NEW element the click above created; the "Collections"
// crumb before it is a pre-existing, genuinely interactive control and must
// keep its normal (non -1) tab order rather than inheriting the landing
// element's own `tabindex="-1"` by having briefly been the bar's last child.
check("the 'Collections' crumb before it is NOT stripped from the normal tab order",
  await page.evaluate(() => document.querySelector(".hadith-crumb")?.getAttribute("tabindex") !== "-1"));
await click('[data-hadith-book="synthetic-alpha-b1"]');
await settle();
check("picking a book lands focus on the breadcrumb's own current-location crumb",
  await page.evaluate(() => document.activeElement?.classList.contains("hadith-crumb-current")));
check("the book-level current crumb carries aria-current=\"page\" too",
  await page.evaluate(() => document.activeElement?.getAttribute("aria-current") === "page"));
await click('[data-hadith-chapter="synthetic-alpha-b1-c1"]');
await settle();
check("picking a chapter lands focus on the breadcrumb's own current-location crumb",
  await page.evaluate(() => document.activeElement?.classList.contains("hadith-crumb-current")));
check("the chapter-level current crumb carries aria-current=\"page\" too",
  await page.evaluate(() => document.activeElement?.getAttribute("aria-current") === "page"));
// The immediate-parent crumb is always the LAST clickable one (the very last
// crumb of all is the non-clickable current-location span) -- not a fixed
// index, which the edition crumb added above would otherwise silently shift.
const crumbButtons = await page.$$(".hadith-crumbs .hadith-crumb");
const bookCrumbBack = crumbButtons[crumbButtons.length - 1];
await bookCrumbBack.click();
await settle();
check("stepping back one level (book crumb) also lands focus, not <body>",
  !(await page.evaluate(() => document.activeElement === document.body)));
await click(".hadith-crumb"); // "Collections" -- full reset to the top level
await settle();
check("resetting to the top level (Collections crumb) lands focus on the 'Collections' heading",
  await page.evaluate(() => document.activeElement?.tagName === "H2"));
// An edition with NO chapter level (Beta) steps book -> occurrence directly;
// the same landing logic must hold on that shorter path too.
await click('[data-hadith-edition="synthetic-beta-ar-v1"]');
await settle();
check("on the no-chapter-level edition too, its book row's native-script heading carries lang=\"ar\" and dir=\"rtl\"",
  await page.evaluate(() => {
    const h = document.querySelector(".hadith-row-heading");
    return h?.getAttribute("lang") === "ar" && h?.getAttribute("dir") === "rtl" && h.textContent.trim().length > 0;
  }));
await click('[data-hadith-book]');
await settle();
check("on a no-chapter-level edition, picking the book also lands focus, not <body>",
  !(await page.evaluate(() => document.activeElement === document.body)));
check("on the no-chapter-level edition too, that landing crumb carries aria-current=\"page\"",
  await page.evaluate(() => document.activeElement?.getAttribute("aria-current") === "page"));
await click(".hadith-crumb"); // reset before the checks below reuse Alpha ids

// --- Keyboard focus survives a TOP-LEVEL TAB SWITCH, not just an in-tab
// Collections step (issue #114, found by reproduction while re-verifying the
// crumb `aria-current` fix above). `render()` tears down and rebuilds the
// WHOLE subtree -- tab bar included -- on every click, exactly as it does for
// an in-tab Collections step; `focusCollectionsLanding()` (above) and
// `focusPendingOccurrence()` (the one-shot Topics/Search "View in source"
// highlight) both cover a step WITHIN a tab, but nothing restored focus on
// the plain act of switching tabs itself -- so a keyboard user lost their
// place to <body> on EVERY tab click, including landing back in Collections
// via "View in source" and then clicking back to Search: the query and
// results survive (state.query persists on `state`, proven below), but the
// reader's keyboard position did not, every single time, on every tab.
await click('[data-hadith-tab="search"]');
await settle();
check("switching to the Search tab lands keyboard focus on the Search tab button, not <body>",
  await page.evaluate(() => document.activeElement?.dataset?.hadithTab === "search"));
await page.fill("#hadithSearchInput", "Prayer");
await settle();
await click(".hadith-search-hit [data-hadith-view-source]");
await settle();
await click('[data-hadith-tab="search"]');
await settle();
check("returning to Search after a 'View in source' jump lands focus on the Search tab button, not <body>",
  await page.evaluate(() => document.activeElement?.dataset?.hadithTab === "search"));
check("returning to Search after the jump keeps the SAME query and results (nothing was lost, only focus needed restoring)",
  (await page.inputValue("#hadithSearchInput")) === "Prayer" &&
  (await page.evaluate(() => document.querySelectorAll(".hadith-search-hit").length)) > 0);
await click('[data-hadith-tab="collections"]');
await settle();
check("switching to the Collections tab lands keyboard focus on the Collections tab button, not <body>",
  await page.evaluate(() => document.activeElement?.dataset?.hadithTab === "collections"));
await click('[data-hadith-tab="explore"]');
await settle();
check("switching to the Explore tab lands keyboard focus on the Explore tab button, not <body>",
  await page.evaluate(() => document.activeElement?.dataset?.hadithTab === "explore"));
await click('[data-hadith-tab="collections"]');
await settle();

check("no page error was raised anywhere in this run", errors.length === 0);
if (errors.length) console.log("--- page errors ---\n", errors.join("\n"));

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
