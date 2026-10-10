// Issue #755: the retired Note view's CSS was removed because nothing on the page can match it. This suite
// is the browser half of that proof: in each state below, every selector whose rule was removed matches ZERO
// elements. A positive control (a live class, .qcr-pop-body or #readBar) proves the counting itself works.
// Run from the repository root, serve.js on :8080.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const DEAD = [
  ".note-view", ".note-pickerbar", ".note-wide-notes", ".note-wide-pill", ".note-bar2", ".note-nav-cluster",
  ".note-dot-wrap", ".note-sub-wrap", ".note-sub-popover", ".note-back-btn", ".note-readlink", ".note-palette",
  ".note-palette-label", ".note-popup-side", ".note-popup-side-nav", ".note-popup-side-list", ".note-popup-splitter",
  ".note-popup-row", ".note-popup-row-main", ".note-popup-row-dot", ".note-popup-row-ref", ".note-popup-row-surah",
  ".note-popup-row-noteflag", ".note-popup-row-toggle", ".note-popup-row-body", ".note-popup-row-arabic",
  ".note-popup-row-snippet", ".note-popup-row-note", ".note-field", ".note-field-label-row", ".note-field-toggle",
  ".note-field-label", ".note-ayah-block", ".note-save-status", ".note-approach",
];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await newContext(browser, { appLang: null, banner: false, viewport: { width: 1280, height: 900 } });
await ctx.route("**/archive.org/**", (r) => r.abort());
const { page } = await openPage(ctx, "/app/quranrevival.html");
const setSel = (id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); if (s) { s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); } }, [id, v]);
const sweep = async (state) => {
  const r = await page.evaluate(([dead]) => ({
    hits: dead.map((s) => [s, document.querySelectorAll(s).length]).filter(([, n]) => n > 0),
    live: document.querySelectorAll("#readBar, .qr-ico, button").length,
  }), [DEAD]);
  check(`[${state}] positive control: the page has live buttons`, r.live > 0);
  check(`[${state}] none of the ${DEAD.length} removed selectors matches anything`, r.hits.length === 0, JSON.stringify(r.hits));
};
await sweep("landing");
const shown = await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0);
if (!shown) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
await page.click("#tabReadBtn"); await page.waitForTimeout(500);
await setSel("surahSelect", "1"); await page.waitForTimeout(1500);
await sweep("Read view");
for (const [id, state] of [["readMeaningBtn", "Meaning"], ["readMeaningBtn", "Meaning off"]]) {
  await page.evaluate((i) => document.getElementById(i)?.click(), id); await page.waitForTimeout(700);
  await sweep(state);
}
await page.evaluate(() => document.querySelector(".ayah-menu-btn, [data-ayah-menu]")?.click()); await page.waitForTimeout(400);
await sweep("ayah ⋮ menu");
await page.evaluate(() => { for (const b of document.querySelectorAll("[data-ayah-notes], [data-open-notes], #readNotesBtn")) { b.click(); break; } }); await page.waitForTimeout(600);
await sweep("Notes pane");
await page.evaluate(() => document.querySelector(".word, [data-word-key], .wbw-word")?.click()); await page.waitForTimeout(600);
await sweep("Word card");
const ex = await page.evaluate(() => { const b = document.getElementById("tabExploreBtn") || document.querySelector("[data-tab=explore]"); b?.click(); return !!b; });
await page.waitForTimeout(800);
await sweep(ex ? "Explore" : "Explore (no tab found)");
await browser.close();
console.log(`\n==== Retired Note view CSS: nothing on the page matches the removed selectors: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
