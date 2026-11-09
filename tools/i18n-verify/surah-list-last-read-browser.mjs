// MSA · QR J123 -- the Surah list header has a "Last read" button (between "Read" and Home). Tapping it lists the last 5 places read
// (one per sūrah, newest first, on this device); choosing one opens the Read view there. Run from the repo root, serve.js on :8080.
//   [--mutate=nolist]  the button opens an empty list -> the "lists the sūrahs just read" check FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
const MUTATE = process.argv.includes("--mutate=nolist");
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const openList = async (page) => {
  const vis = (id) => page.evaluate((i) => (document.getElementById(i)?.getBoundingClientRect().width ?? 0) > 0, id);
  for (const id of ["readListBtn", "readContentsBtn"]) if (await vis(id)) { await page.click("#" + id); break; }
  await page.waitForSelector('#readContentsMount:not([hidden]) .rc-row[data-rc-kind="surah"]', { timeout: 8000 });
};
for (const lang of ["en", "bn"]) for (const width of [320, 390, 768, 1280]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) await ctx.route("**/app/quranrevival.html*", async (r) => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace("const list = recentReads();", "const list = [];") }); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(700);
  await openList(page);
  // empty first: the button opens and says so
  const btn = "#readContentsLastBtn";
  const pos = await page.evaluate(() => { const h = document.getElementById("readContentsHomeBtn").getBoundingClientRect(), l = document.getElementById("readContentsLastBtn").getBoundingClientRect(), t = document.getElementById("readContentsTitle").getBoundingClientRect(), c = document.getElementById("readContentsCloseBtn").getBoundingClientRect(); return { l: [l.left, l.right, l.top, l.height], h: [h.left, h.right], t: t.right, c: c.right, vw: innerWidth }; });
  check(`${tag} "Last read" sits between the title and Home, on one row, ≥40px, on screen`, pos.l[0] >= pos.t - 1 && pos.l[1] <= pos.h[0] + 1 && pos.l[3] >= 40 && pos.c <= pos.vw + 1, JSON.stringify(pos));
  await page.click(btn);
  check(`${tag} empty: it opens and says there are no reads yet`, (await page.locator("#readContentsRecent:not([hidden]) .rc-recent-empty").count()) === 1);
  await page.click(btn);
  // read sūrah 3, then 5, then 2 through the real list
  for (const n of [3, 5, 2]) {
    await page.click(`#readContentsBody .rc-row[data-rc-kind="surah"][data-rc-n="${n}"]`);
    await page.waitForTimeout(1500);
    await openList(page);
  }
  await page.click(btn);
  const items = await page.evaluate(() => [...document.querySelectorAll("#readContentsRecent [data-recent-read]")].map((b) => ({ t: b.textContent, h: Math.round(b.getBoundingClientRect().height), r: b.getBoundingClientRect().right })));
  check(`${tag} lists the sūrahs just read, newest first (2, 5, 3), each ≥44px`, items.length === 3 && items.every((i) => i.h >= 44) && /Baqara|বাকারা|বাক/i.test(items[0].t), JSON.stringify(items));
  check(`${tag} the panel fits the screen`, items.every((i) => i.r <= width + 1));
  if (width === 320 || width === 1280) await page.screenshot({ path: `/tmp/j123-${lang}-${width}-${MUTATE ? "mut" : "ok"}.png` });
  await page.click('#readContentsRecent [data-recent-read="2"]');
  await page.waitForTimeout(1500);
  const sel = await page.evaluate(() => ({ surah: document.getElementById("surahSelect")?.value, listHidden: document.getElementById("readContentsMount").hidden }));
  check(`${tag} choosing the third (sūrah 3) closes the list and opens sūrah 3`, sel.listHidden && sel.surah === "3", JSON.stringify(sel));
  await page.close(); await ctx.close();
}
await browser.close();
console.log(`\n==== J123 Last read${MUTATE ? " [mutated: nolist]" : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
