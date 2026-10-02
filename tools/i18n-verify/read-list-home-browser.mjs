// Owner, 2 Oct 2026 (a phone photo of the Read -> Surah list): "Enable a way
// to move to home ( page landing) from here." A "⌂ Home" button beside the ✕.
// Run from the repository root, with serve.js on :8080. Expected values hand-written.
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const WORD = { en: "Home", bn: "হোম" };
for (const lang of ["en", "bn"]) for (const width of [320, 390, 1280]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  // The landing page's Read button opens the list (as read-list-button-browser does).
  await page.click("#readContentsBtn");
  await page.waitForFunction(() => !document.getElementById("readContentsMount").hidden && document.querySelectorAll("#readContentsBody .rc-row").length > 0);
  await page.click('#readContentsBody .rc-row[data-rc-kind="surah"][data-rc-n="2"]');
  await page.waitForFunction(() => document.body.classList.contains("read-from-contents"));
  await page.waitForTimeout(300);
  await page.click("#readListBtn");
  await page.waitForFunction(() => !document.getElementById("readContentsMount").hidden && document.querySelectorAll("#readContentsBody .rc-row").length > 0);
  const m = await page.evaluate(() => {
    const r = (id) => document.getElementById(id).getBoundingClientRect();
    const h = r("readContentsHomeBtn"), x = r("readContentsCloseBtn"), t = r("readContentsTitle");
    const over = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const b = document.getElementById("readContentsHomeBtn");
    return { w: Math.round(h.width), h: Math.round(h.height), left: Math.round(h.left), right: Math.round(h.right), vw: innerWidth,
      overClose: over(h, x), overTitle: over(h, t), leftOfClose: h.right <= x.left, word: b.querySelector(".rc-home-word").textContent.trim(), aria: b.getAttribute("aria-label") };
  });
  check(`${tag} a Home button is in the list's header, beside the ✕`, m.w > 0 && m.leftOfClose, JSON.stringify(m));
  check(`${tag} it is finger-sized (40px tall)`, m.h >= 40, JSON.stringify(m));
  check(`${tag} it overlaps neither the ✕ nor the title, inside the screen`, !m.overClose && !m.overTitle && m.left >= 0 && m.right <= m.vw, JSON.stringify(m));
  check(`${tag} it reads "⌂ ${WORD[lang]}", and its name is "${WORD[lang]}"`, m.word === WORD[lang] && m.aria === WORD[lang], JSON.stringify(m));
  await page.click("#readContentsHomeBtn"); await page.waitForTimeout(700);
  const after = await page.evaluate(() => {
    const w = document.getElementById("wheelSection"); const r = w.getBoundingClientRect();
    return { listHidden: document.getElementById("readContentsMount").hidden, wheel: !w.hidden && getComputedStyle(w).display !== "none" && r.height > 100,
      readHidden: (() => { const v = document.getElementById("readView"); return !v || v.hidden || v.getBoundingClientRect().height === 0; })() };
  });
  check(`${tag} pressing it closes the list and opens the landing page (the wheel)`, after.listHidden && after.wheel && after.readHidden, JSON.stringify(after));
  await ctx.close();
}
console.log(`\n==== Surah list Home button: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
