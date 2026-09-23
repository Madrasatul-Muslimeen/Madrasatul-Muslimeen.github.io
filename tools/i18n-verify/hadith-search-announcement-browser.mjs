// Hadith Search -- the result-count announcement gap (issue #114 Gate B).
//
// Reproduced live: `renderSearch()`'s "{n} results" line is a plain <p>
// inside `#hadithSearchResults`, and every keystroke does
// `out.textContent = ""` before rebuilding it -- so the paragraph carrying
// the count is destroyed and recreated on every character typed. Nothing in
// the row carries `role="status"`/`aria-live`, so a screen-reader user typing
// a query hears nothing at all: not the count changing, not "0 results",
// nothing. This script proves that gap against the UNFIXED component and
// proves the fix against the FIXED one -- same file, run at both points in
// history, per this repository's own "verify old code fails, fixed code
// passes" rule.
//
// The fix this script also verifies is deliberately narrow: ONE persistent
// status element, updated by `textContent` rather than replaced, holding
// ONLY the count text -- never the interactive `.hadith-search-hit` cards
// themselves, which must stay outside it so a screen reader is not made to
// announce a whole card on every keystroke. No new translation key: the
// count text reuses the existing `"{n} results"` string already carried in
// both `en` and `bn`.
//
// Committed rather than run-and-discarded, per this repository's own
// standing lesson: "a screenshot is not a measurement, but it catches what
// measurements miss" -- and a script nobody can re-run is worth exactly one
// session's word for it. Run in both languages:
//
//   node tools/i18n-verify/hadith-search-announcement-browser.mjs en
//   node tools/i18n-verify/hadith-search-announcement-browser.mjs bn
//
// Exits 0 only if every check passed.
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

const settle = () => page.waitForTimeout(150);
const hitCount = () => page.evaluate(() => document.querySelectorAll(".hadith-search-hit").length);
const statusEl = () => page.evaluate(() => {
  const s = document.querySelector('[data-hadith-search-status]');
  if (!s) return null;
  return {
    text: s.textContent,
    role: s.getAttribute("role"),
    ariaLive: s.getAttribute("aria-live"),
    hasHitInside: !!s.querySelector(".hadith-search-hit"),
    insideResultsRegion: !!document.querySelector("#hadithSearchResults")?.contains(s),
  };
});

console.log(`===== hadith-search-announcement-browser (${LANG}) =====`);

await page.click('[data-hadith-tab="search"]');
await settle();

// --- The announcer must exist and be correctly wired before any typing -----
const initial = await statusEl();
check("a status/live-region element for the search-result count exists on the Search tab",
  initial !== null);
check('the announcer carries role="status"',
  initial?.role === "status");
check('the announcer carries aria-live="polite"',
  initial?.ariaLive === "polite");
check("the announcer is empty before any query is typed (nothing to announce yet)",
  initial?.text === "");

// --- Typing a real query announces the count, and ONLY the count -----------
await page.fill("#hadithSearchInput", "Prayer");
await settle();
const afterPrayer = await statusEl();
const prayerHits = await hitCount();
check("a real query still renders its result cards normally (unaffected by the live-region change)",
  prayerHits > 0);
const prayerDigits = afterPrayer?.text?.match(/\d+/)?.[0];
check("the announcer's text names the SAME count as the number of rendered result cards",
  prayerDigits !== undefined && Number(prayerDigits) === prayerHits);
check("the announcer NEVER contains an interactive result card (cards are not re-announced on every keystroke)",
  afterPrayer?.hasHitInside === false);
check("the announcer sits OUTSIDE the results region that is torn down and rebuilt on every keystroke",
  afterPrayer?.insideResultsRegion === false);

// --- The announcer is the SAME node across a query change, not recreated ---
// A screen reader only reliably announces a change to a live region that
// was already in the DOM before the mutation -- a node that is removed and
// a lookalike re-inserted is not guaranteed to be announced at all.
const probeTagged = await page.evaluate(() => {
  const s = document.querySelector('[data-hadith-search-status]');
  if (!s) return false;
  s.dataset.probe = "keep-me";
  return true;
});
await page.fill("#hadithSearchInput", "Prayers");
await settle();
check("the announcer is the SAME DOM node after a further query change (never destroyed and recreated)",
  probeTagged && await page.evaluate(() => document.querySelector('[data-hadith-search-status]')?.dataset.probe === "keep-me"));

// --- Zero-result query still announces "0", not silence ---------------------
await page.fill("#hadithSearchInput", "zzz-no-such-word-zzz");
await settle();
const zeroHits = await hitCount();
const zeroState = await statusEl();
check("a query with no matches still renders zero result cards",
  zeroHits === 0);
check('a zero-result query announces "0", not silence (a reader must be told the search actually ran)',
  zeroState?.text?.match(/\d+/)?.[0] === "0");

// --- Clearing the query back to empty clears the announcement --------------
await page.fill("#hadithSearchInput", "");
await settle();
check("clearing the query back to empty clears the announcement (nothing stale left behind)",
  (await statusEl())?.text === "");

// --- Repeated identical query still announces each time it becomes active ---
await page.fill("#hadithSearchInput", "Prayer");
await settle();
const firstRepeat = (await statusEl())?.text;
await page.fill("#hadithSearchInput", "");
await settle();
await page.fill("#hadithSearchInput", "Prayer");
await settle();
const secondRepeat = (await statusEl())?.text;
check("re-typing the SAME query after clearing announces the count again (not left stale from the first time)",
  firstRepeat && secondRepeat && firstRepeat === secondRepeat && secondRepeat.match(/\d+/)?.[0] === String(prayerHits));

// --- No new translation key was introduced: the announcer is built from
// exactly the pre-existing `t("{n} results", ...)` call, read at the SOURCE
// level rather than assumed from the DOM ------------------------------------
const { readFileSync } = await import("node:fs");
const { fileURLToPath } = await import("node:url");
const source = readFileSync(fileURLToPath(new URL("../../app/js/hadith-browser.js", import.meta.url)), "utf8");
check('the announcer is populated from the pre-existing t("{n} results", ...) call (no new translation key added)',
  /status\.textContent\s*=\s*t\("\{n\} results",\s*\{\s*n:/.test(source));
check("the count text itself still matches the digit-for-digit count on a repeated query (established above)",
  secondRepeat?.match(/\d+/)?.[0] === String(prayerHits));

check("no page error was raised anywhere in this run", errors.length === 0);
if (errors.length) console.log("--- page errors ---\n", errors.join("\n"));

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
