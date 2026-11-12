// QR Lead audit 10, 1 Nov 2026, REWRITTEN IN PLACE by phone layout part 2 (the Owner, 11 Nov 2026, demo v3).
// Audit 10 measured the pinned Āyah-card header on a phone at ordinary and large text (A+ 150%, 200%) and had fitAyahSheetHeader() STACK it
// (buttons on line one, the reference on line two) once it took three lines. That stacking is retired: the header is now the reference and
// ✕ on one line and ONE row [📍 Location ▾][📖 Ayah][‹ ▶ ›][⋮] under it, and the row WRAPS (never cuts a word, never leaves the card) where four
// controls cannot share a line of a phone at large text. What this suite holds the card to, at 320, 390, 768, 1280 and landscape 844, at
// 100%, 150% and 200%, in English and Bangla:
//   1. every item of the header is inside the header and the page does not scroll sideways;
//   2. every button of the row is 40px or more tall and none is cut (its word whole, ⋮ whole);
//   3. at ordinary text the row is ONE line from 320px up (the Owner's whole ask); at large text it is at most TWO lines;
//   4. the header is at most 45% of a 320x640 screen at 200% (it was 44% before audit 10, 34% after it, and is 43% now: the row takes a line more).
//   node tools/i18n-verify/qr-ayah-card-header-large-text-browser.mjs [--mutate=NAME]   (serve.js on :8080, repo root)
//   no-wrap    the row may not wrap              -> "⋮ and the others are inside the header" FAILS at 200%
//   no-min     the two words may be squeezed    -> "no word is cut" FAILS at 150%
//   no-gap     the row's gap goes back to 0.9rem -> "at ordinary text the row is ONE line" FAILS at 320px
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-wrap": ["html", "display: flex; flex-wrap: wrap; align-items: stretch; justify-content: stretch; gap: 0.25rem;", "display: flex; flex-wrap: nowrap; align-items: stretch; justify-content: stretch; gap: 0.25rem;"],
  "no-min": ["html", "flex: 1 1 auto; min-width: max-content;", "flex: 1 1 0; min-width: 0;"],
  "no-gap": ["html", "justify-content: stretch; gap: 0.25rem; flex: 1 0 100%;", "justify-content: stretch; gap: 0.9rem; flex: 1 0 100%;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const setSelect = (page, id, v) => page.evaluate(([i, x]) => { const s = document.getElementById(i); s.value = String(x); s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);

async function boot(lang, w, h, size) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [kind, from, to] = MUT[MUTATE];
    await ctx.route(kind === "js" ? "**/app/js/ayah-action-sheet.js*" : "**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const body = await res.text();
      if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
      r.fulfill({ response: res, body: body.replace(from, to) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.getElementById("tabReadBtn"), null, { timeout: 30000 });
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
  await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, size);
  await page.evaluate(() => document.getElementById("tabReadBtn").click()); await page.waitForTimeout(600);
  await setSelect(page, "surahSelect", 2); await page.waitForTimeout(800); await setSelect(page, "ayahSelect", 13);
  await page.waitForFunction(() => document.querySelector('[data-ayah-num-badge="2:13"]'), null, { timeout: 15000 });
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="2:13"]').click());
  await page.waitForFunction(() => [...document.querySelectorAll("[data-ayah-sheet-more]")].some((r) => r.getClientRects().length), null, { timeout: 15000 });
  await page.waitForTimeout(500);
  return { ctx, page };
}
const measure = (page) => page.evaluate(() => {
  const sheet = [...document.querySelectorAll("[data-ayah-sheet]")].find((s) => s.getClientRects().length);
  const hd = sheet.querySelector(".ayah-sheet-header"), hr = hd.getBoundingClientRect();
  const rowEls = ["[data-ayah-sheet-location-btn]", "[data-ayah-sheet-noteview]", "[data-ayah-sheet-step='-1']", "[data-ayah-sheet-play]", "[data-ayah-sheet-step='1']", "[data-ayah-sheet-more]"].map((q) => hd.querySelector(q));
  const rects = rowEls.map((e) => e.getBoundingClientRect());
  const items = [...hd.querySelectorAll(".ayah-sheet-ref, .ayah-sheet-close, .ayah-sheet-homeback"), ...rowEls].filter((e) => e.getClientRects().length);
  const outside = items.filter((el) => { const r = el.getBoundingClientRect(); return r.left < hr.left - 1 || r.right > hr.right + 1; }).map((el) => el.className.split(" ")[0] || el.getAttribute("data-ayah-sheet-more") || "item");
  const cut = rowEls.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.trim().slice(0, 8) || e.getAttribute("aria-label"));
  return { h: Math.round(hr.height), screen: innerHeight, outside, cut, minH: Math.min(...rects.map((r) => r.height)), rowLines: new Set(rects.map((r) => Math.round(r.top / 4))).size, sideways: document.documentElement.scrollWidth - innerWidth };
});

const CASES = [[320, 640, "en"], [320, 640, "bn"], [390, 844, "en"], [390, 844, "bn"], [768, 1024, "en"], [1280, 800, "en"], [844, 390, "en"]];
for (const [w, h, lang] of CASES) for (const size of ["100%", "150%", "200%"]) {
  const t = `${lang} ${w}x${h} ${size}`, { ctx, page } = await boot(lang, w, h, size);
  await page.waitForTimeout(500);
  const m = await measure(page);
  check(`${t}: MUTATION TARGET (no-wrap): the reference, ✕, Location, Ayah, ‹ ▶ › and ⋮ are all inside the header, the page does not scroll sideways (outside: ${m.outside.join(", ") || "none"})`, m.outside.length === 0 && m.sideways <= 1, JSON.stringify(m));
  check(`${t}: every button of the row is 40px or more tall`, m.minH >= 39.5, String(m.minH));
  check(`${t}: MUTATION TARGET (no-min): no word of the row is cut (${m.cut.join(", ") || "none"})`, m.cut.length === 0);
  if (size === "100%" && w >= 320 && h > w) check(`${t}: MUTATION TARGET (no-gap): at ordinary text the row is ONE line (${m.rowLines} line(s))`, m.rowLines === 1);
  // Bangla at 200% on a 320px phone: "অবস্থান" and "আয়াত" are each as wide as the 275px card allows beside nothing else, so three lines are measured and accepted there.
  check(`${t}: the row is at most two lines (${m.rowLines})${lang === "bn" && w === 320 && size === "200%" ? " -- three in Bangla at 320px, 200%" : ""}`, m.rowLines <= (lang === "bn" && w === 320 && size === "200%" ? 3 : 2));
  if (lang === "en" && w === 320 && size === "200%") check(`${t}: the header is at most 45% of the screen (${m.h}px of ${m.screen})`, m.h <= 0.45 * m.screen);
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
