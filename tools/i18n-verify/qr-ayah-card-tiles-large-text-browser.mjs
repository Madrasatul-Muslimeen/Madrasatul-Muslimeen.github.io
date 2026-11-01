// QR Lead audit 9, 1 Nov 2026 (the Āyah card, PCF User Manual; PCF MSA J29): the card's tool tiles (Bookmark, Note, Poster,
// Asma, QCR, Folder, Play, Copy, Share) sit in a grid of fixed 58px columns (64px in the computer window) while their words
// grow with the text. Measured on main v13.11 with this suite's own probe: at 150% "Bookmark" was cut on every phone and
// tablet (78px of word in a 64px tile), and at 200% Poster, Folder, Share and Asma too (320-390px); and the card's ← Back,
// a fixed 40x40 box, let its arrow slip out at its bottom-right, leaving an empty oval. Now fitAyahActionRow() makes all the
// words a little smaller together while one is cut (to 7/10 at most, never below ordinary) and only then widens the
// columns, so the tiles take three tidy rows on a 320px phone at 200%; the ← Back box grows with its arrow from 40px.
//   node tools/i18n-verify/qr-ayah-card-tiles-large-text-browser.mjs [--mutate=NAME]   (serve.js on :8080, repo root)
//   no-fit    the fit returns at once                 -> "no tile's word is cut" FAILS at 150/200%
//   no-shrink the words are never made smaller        -> "the tiles take at most 3 rows" FAILS at 320/390 200%
//   no-cols   the columns are never widened           -> "no tile's word is cut" FAILS at 320/390 200%
//   no-floor  the 7/10 floor lowered to 4/10          -> "tile words keep at least 7/10 of their size" FAILS at 200%
//   no-watch  A± changes are not followed             -> "after A± to 200% no word is cut" FAILS
//   no-back   the ← Back box fixed at 40x40 again     -> "the ← Back arrow sits inside its box" FAILS at 150/200%
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-fit": ["js", "export function fitAyahActionRow(row) {\n  if (!row) return;", "export function fitAyahActionRow(row) {\n  if (row) return;"],
  "no-shrink": ["js", "const scale = Math.min(1, Math.max(0.7, ordinary / px, room / widest));", "const scale = 1;"],
  "no-cols": ["js", "  row.style.gridTemplateColumns = `repeat(auto-fit, minmax(min(100%, ${Math.ceil(need) + 2}px), 1fr))`;", "  void need;"],
  "no-floor": ["js", "Math.max(0.7, ordinary / px, room / widest)", "Math.max(0.4, room / widest)"],
  "no-watch": ["js", "    new MutationObserver(() => requestAnimationFrame(() => document.querySelectorAll(\"[data-ayah-sheet-actions]\").forEach(fitAyahActionRow)))", "    ({ observe() {} })"],
  "no-back": ["html", "min-width: 40px; min-height: 40px; padding: 0.15rem 0.35rem; display: inline-flex; align-items: center; justify-content: center; border: 1px solid #c9a24b;", "width: 40px; height: 40px; border: 1px solid #c9a24b;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
// Rows of tiles at ordinary text, measured on main v13.11 before this round and written by hand.
const PLAIN_ROWS = { "320x640": 3, "390x844": 2, "768x1024": 1, "1280x800": 1, "844x390": 1 };
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
  const row = [...document.querySelectorAll("[data-ayah-sheet-actions]")].find((r) => r.getClientRects().length);
  const acts = [...row.querySelectorAll(".ayah-sheet-act")].filter((a) => a.getClientRects().length);
  const labels = acts.map((a) => a.querySelector(".ayah-sheet-act-label"));
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const cut = labels.filter((l) => l.scrollWidth > l.clientWidth + 1 || l.closest(".ayah-sheet-act").scrollWidth > l.closest(".ayah-sheet-act").clientWidth + 1).map((l) => l.textContent);
  const sizes = labels.map((l) => parseFloat(getComputedStyle(l).fontSize));
  const rows = new Set(acts.map((a) => Math.round(a.getBoundingClientRect().top))).size;
  const rr = row.getBoundingClientRect();
  const outside = acts.filter((a) => { const r = a.getBoundingClientRect(); return r.left < rr.left - 1 || r.right > rr.right + 1 || r.height < 40; }).map((a) => a.textContent.trim());
  const back = [...document.querySelectorAll("[data-ayah-sheet-homeback]")].find((b) => b.getClientRects().length);
  let backOk = null, backBox = null;
  if (back) {
    const br = back.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(back);
    const gr = rg.getBoundingClientRect();
    backBox = [Math.round(br.width), Math.round(br.height), Math.round(gr.left - br.left), Math.round(br.right - gr.right), Math.round(gr.top - br.top), Math.round(br.bottom - gr.bottom)];
    backOk = br.width >= 40 && br.height >= 40 && gr.left >= br.left && gr.right <= br.right && gr.top >= br.top - 1 && gr.bottom <= br.bottom + 1;
  }
  return { win: !!row.closest("[data-ayah-win]"), n: acts.length, cut, sizes, intended: 0.68 * rootPx, rows, outside, styled: !!row.getAttribute("style") || labels.some((l) => l.getAttribute("style")), backOk, backBox };
});

const CASES = [[320, 640, "en"], [320, 640, "bn"], [390, 844, "en"], [390, 844, "bn"], [768, 1024, "en"], [768, 1024, "bn"], [1280, 800, "en"], [1280, 800, "bn"], [844, 390, "en"]];
for (const [w, h, lang] of CASES) for (const size of ["100%", "150%", "200%"]) {
  const t = `${lang} ${w}x${h} ${size}`, { ctx, page } = await boot(lang, w, h, size), m = await measure(page);
  check(`${t}: positive control, the nine tiles are there`, m.n === 9, String(m.n));
  check(`${t}: no tile's word is cut`, m.cut.length === 0, m.cut.join(", "));
  check(`${t}: tile words keep at least 7/10 of their size and never go below ordinary (${Math.min(...m.sizes).toFixed(1)}px of ${m.intended.toFixed(1)})`, m.sizes.every((s) => s >= Math.max(0.68 * 16, 0.7 * m.intended) - 0.1));
  check(`${t}: the tiles take at most 3 rows`, m.rows <= 3, String(m.rows));
  check(`${t}: every tile is inside the row and a finger high`, m.outside.length === 0, m.outside.join(", "));
  if (m.backOk !== null) check(`${t}: the ← Back arrow sits inside its box (${m.backBox})`, m.backOk);
  if (m.backOk !== null && size === "100%") check(`${t}: at ordinary text the ← Back box is still 40x40`, m.backBox[0] === 40 && m.backBox[1] === 40, String(m.backBox));
  if (size === "100%") check(`${t}: at ordinary text nothing changes (no fitted sizes; ${m.rows} rows, was ${PLAIN_ROWS[`${w}x${h}`]})`, !m.styled && m.rows === PLAIN_ROWS[`${w}x${h}`]);
  if (size === "100%" && w < 900 && lang === "en") {
    // A± while the card is open: the words grow, the row's width does not.
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; }); await page.waitForTimeout(600);
    const m2 = await measure(page);
    check(`${t}: after A± to 200% no word is cut`, m2.cut.length === 0, m2.cut.join(", "));
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
