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
await click('[data-hadith-book="synthetic-alpha-b1"]');
await settle();
const bookCrumbText = await text(".hadith-crumb-current");
check("the book breadcrumb shows the book's TRANSLATED title, not its raw internal id",
  !bookCrumbText.includes("synthetic-alpha-b1") && bookCrumbText.trim().length > 0);
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

check("no page error was raised anywhere in this run", errors.length === 0);
if (errors.length) console.log("--- page errors ---\n", errors.join("\n"));

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
