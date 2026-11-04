// QR Lead audit 10, 1 Nov 2026 (the Āyah card, PCF User Manual; PCF MSA J29): below 900px the card is full screen and its
// header is pinned while the card scrolls. Measured on main v13.12 (+ audit 9) with this suite's own probe: on a 320px phone
// that header took three lines at ordinary text (150px: ← alone, the reference + – ×, then ‹ › Full text) and four at 200%
// (281px of a 640px screen, 44%: ←, the reference, – ×, ‹ › Full text); at 390px 200% it was 281px too. Now
// fitAyahSheetHeader() counts the header's lines and, only while they are three or more, gives it .ayah-head-stack: every
// button on line one (← ‹ › … – ×), the reference on line two, Full text beside it when it fits or on line three. 320px:
// 150 -> 129px; 320 and 390px at 200%: 281 -> 219px. Where the header takes one or two lines nothing changes.
//   node tools/i18n-verify/qr-ayah-card-header-large-text-browser.mjs [--mutate=NAME]   (serve.js on :8080, repo root)
//   no-fit    the fit returns at once                  -> "the header takes at most 3 lines" FAILS at 320/390 200%
//   no-contents  ‹ › and Full text stay boxed together -> "line one holds ← ‹ › – ×" FAILS
//   no-cap    – and × keep their 1.5rem glyphs         -> "line one holds ← ‹ › – ×" FAILS at 320 200%
//   no-gap    line one's gaps back to 0.4rem           -> "line one holds ← ‹ › – ×" FAILS at 320 200%
//   no-ro     the header's width is not watched        -> "turned to 320x640, the header is stacked" FAILS
//   no-mo     a button joining the header is not seen  -> "a button joining the header re-fits it" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-fit": ["js", "export function fitAyahSheetHeader(header) {\n  if (!header) return;", "export function fitAyahSheetHeader(header) {\n  if (header) return;"],
  "no-contents": ["html", ".ayah-sheet-header.ayah-head-stack .ayah-sheet-head-tools:not([hidden]) { display: contents; }", ""],
  "no-cap": ["html", "font-size: min(1.5rem, 32px); padding: 0; min-width: 40px; }", "min-width: 40px; }"],
  "no-gap": ["html", "flex-wrap: wrap; column-gap: 0.25rem; row-gap: 0.3rem; }", "flex-wrap: wrap; column-gap: 0.4rem; row-gap: 0.3rem; }"],
  "no-ro": ["js", "  new ResizeObserver(() => { const w = Math.round(header.getBoundingClientRect().width); if (w !== lastW) { lastW = w; fitAyahSheetHeader(header); } }).observe(header);", "  void lastW;"],
  "no-mo": ["js", "  new MutationObserver(() => fitAyahSheetHeader(header)).observe(header, { childList: true });", ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
// The header's lines on main v13.12 (+ audit 9) before this round, measured and written by hand.
const MAIN_LINES = { "320x640 100%": 3, "320x640 200%": 4, "390x844 100%": 2, "390x844 200%": 4, "768x1024 100%": 1, "844x390 100%": 1, "844x390 200%": 1, "1280x800 100%": 1 };
const MAIN_PX = { "320x640 100%": 150, "320x640 200%": 281, "390x844 200%": 281 };
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
  await page.waitForFunction(() => [...document.querySelectorAll("[data-ayah-sheet-actions]")].some((r) => r.getClientRects().length), null, { timeout: 15000 });
  await page.waitForTimeout(500);
  return { ctx, page };
}
const measure = (page) => page.evaluate(() => {
  const sheet = [...document.querySelectorAll("[data-ayah-sheet]")].find((s) => s.getClientRects().length);
  const hd = sheet.querySelector(".ayah-sheet-header"), hr = hd.getBoundingClientRect();
  const items = [];
  for (const c of hd.children) {
    if (c.classList.contains("ayah-sheet-head-tools") && getComputedStyle(c).display === "contents") items.push(...[...c.children].filter((k) => k.getClientRects().length));
    else if (c.getClientRects().length) items.push(c);
  }
  const boxes = items.map((el) => el.getBoundingClientRect()).sort((a, b) => a.top - b.top);
  let lines = 0, bottom = -Infinity;
  for (const b of boxes) { if (b.top >= bottom - 1) { lines++; bottom = b.bottom; } else bottom = Math.max(bottom, b.bottom); }
  const q = (s) => { const el = hd.querySelector(s); return el && el.getClientRects().length ? el.getBoundingClientRect() : null; };
  const btns = [q("[data-ayah-sheet-homeback]"), q(".ayah-sheet-nav-pair"), q(".mm-min-btn"), q(".ayah-sheet-close")];
  const ref = q(".ayah-sheet-ref");
  const lineOne = btns.every((b) => b) && btns.every((b) => b.top < btns[0].bottom - 1 && b.bottom > btns[0].top + 1) && (!ref || ref.top >= btns[0].bottom - 1);
  const outside = items.filter((el) => { const r = el.getBoundingClientRect(); return r.left < hr.left - 1 || r.right > hr.right + 1; }).map((el) => el.className.split(" ")[0]);
  const glyphs = [".mm-min-btn", ".ayah-sheet-close"].map((s) => hd.querySelector(s)).filter(Boolean).every((b) => { const rg = document.createRange(); rg.selectNodeContents(b); const g = rg.getBoundingClientRect(), r = b.getBoundingClientRect(); return r.width >= 40 && r.height >= 40 && g.left >= r.left - 1 && g.right <= r.right + 1; });
  return { stack: hd.classList.contains("ayah-head-stack"), lines, h: Math.round(hr.height), screen: innerHeight, win: !!hd.closest("[data-ayah-win]"), lineOne, outside, glyphs, n: items.length, hasMin: !!q(".mm-min-btn") };
});

const CASES = [[320, 640, "en"], [320, 640, "bn"], [390, 844, "en"], [390, 844, "bn"], [768, 1024, "en"], [1280, 800, "en"], [844, 390, "en"]];
for (const [w, h, lang] of CASES) for (const size of ["100%", "150%", "200%"]) {
  const key = `${w}x${h} ${size}`, t = `${lang} ${key}`, { ctx, page } = await boot(lang, w, h, size);
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] .mm-min-btn"), null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  const m = await measure(page);
  check(`${t}: positive control, the header's buttons and reference are there (${m.n} items, – ${m.hasMin})`, m.n >= 5 && m.hasMin);
  check(`${t}: the header takes at most 3 lines (${m.lines}; ${m.h}px of ${m.screen})`, m.lines <= 3);
  check(`${t}: every header item is inside the header`, m.outside.length === 0, m.outside.join(", "));
  check(`${t}: – and × keep 40px boxes with their glyphs inside`, m.glyphs);
  if (m.stack) check(`${t}: line one holds ← ‹ › – × and the reference is below it`, m.lineOne);
  if (MAIN_LINES[key] !== undefined && MAIN_LINES[key] <= 2) check(`${t}: a header of ${MAIN_LINES[key]} line(s) on main is left as it was (not stacked, ${m.lines} lines)`, !m.stack && m.lines === MAIN_LINES[key]);
  if (lang === "en" && MAIN_PX[key]) check(`${t}: the header is shorter than on main (${m.h}px, was ${MAIN_PX[key]}px) and stacked`, m.stack && m.h <= MAIN_PX[key] - 20);
  if (lang === "en" && w === 320 && size === "200%") check(`${t}: the header is at most 35% of the screen (${m.h}px of ${m.screen})`, m.h <= 0.35 * m.screen);
  if (size === "100%" && w === 320 && lang === "en") {
    // A± while the card is open: the header's sides are rem, so its width changes and it is fitted again.
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; }); await page.waitForTimeout(700);
    const m2 = await measure(page);
    check(`${t}: after A± to 200% the header is stacked, at most 3 lines, line one whole (${m2.lines} lines, ${m2.h}px)`, m2.stack && m2.lines <= 3 && m2.lineOne);
  }
  if (size === "200%" && w === 844 && lang === "en") {
    // The phone turned upright with the card open: the header's width changes and it is fitted again.
    await page.setViewportSize({ width: 320, height: 640 }); await page.waitForTimeout(700);
    const m4 = await measure(page);
    check(`${t}: turned to 320x640, the header is stacked, at most 3 lines, line one whole (${m4.lines} lines, ${m4.h}px)`, m4.stack && m4.lines <= 3 && m4.lineOne);
  }
  if (size === "100%" && w === 390 && lang === "en") {
    // A button joining the header after the card opened (the way – Minimise does) re-fits it: a wide one makes 3 lines.
    await page.evaluate(() => { const hd = [...document.querySelectorAll("[data-ayah-sheet] .ayah-sheet-header")].find((x) => x.getClientRects().length); const b = document.createElement("button"); b.textContent = "x"; b.style.cssText = "width:90px;height:40px;flex:0 0 auto"; b.className = "qr-test-btn"; hd.querySelector(".ayah-sheet-close").before(b); });
    await page.waitForTimeout(500);
    const m3 = await measure(page);
    check(`${t}: a button joining the header re-fits it (stacked ${m3.stack}, ${m3.lines} lines)`, m3.stack && m3.lines <= 3);
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
