// Owner, 2 Oct 2026: "Read>Surah List>Surah>Read View. What's the way from
// read view to Surah list? Make one." Demo approved ("the ☰ Surah list button
// at the top left. go").
//
// Run from the repository root, with serve.js on :8080.
// Expected values are written BY HAND, never computed by the code under test.
//
// Proves, at 320 / 390 / 1280 in English and Bangla:
//   - the button is NOT shown when the Read view was opened another way;
//   - after Read -> list -> a surah it IS shown, top left, 36px tall, clear of
//     the ⤢ button and the page reference, inside the screen;
//   - pressing it opens the same list, on the tab last used (Juz after a juz);
//   - picking another surah from it opens that surah, and the button stays;
//   - the label: "Surah list" / "সূরার তালিকা" from 360px, the ☰ alone below,
//     with the aria-label carrying the words either way.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const LABEL = { en: "Surah list", bn: "সূরার তালিকা" };

async function start(lang, width) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page };
}
const openList = async (page, sel = "#readContentsBtn") => {
  await page.click(sel);
  await page.waitForFunction(() => !document.getElementById("readContentsMount")?.hidden && document.querySelectorAll("#readContentsBody .rc-row").length > 0);
};
const pickRow = async (page, tab, n) => {
  if (tab !== "surah") await page.click(`[data-rc-tab="${tab}"]`);
  await page.waitForFunction((t) => document.querySelector(`#readContentsBody .rc-row[data-rc-kind="${t}"]`), tab);
  await page.click(`#readContentsBody .rc-row[data-rc-kind="${tab}"][data-rc-n="${n}"]`);
  await page.waitForFunction(() => document.body.classList.contains("read-from-contents"));
  await page.waitForTimeout(300);
};
const btn = (page) => page.evaluate(() => {
  const b = document.getElementById("readListBtn"); const r = b.getBoundingClientRect();
  const full = document.getElementById("hideChromeBtn").getBoundingClientRect();
  const ref = document.getElementById("mushafPageRef"); const rr = ref.getBoundingClientRect();
  const word = b.querySelector(".read-list-word");
  const bar = document.getElementById("readBar").getBoundingClientRect();
  const overlap = (a, c) => c.width > 0 && a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom;
  return { shown: r.width > 0 && getComputedStyle(b).display !== "none", left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width),
    vw: innerWidth, barLeft: Math.round(bar.left), overFull: overlap(r, full), overRef: !ref.hidden && overlap(r, rr), aria: b.getAttribute("aria-label"),
    word: word && getComputedStyle(word).display !== "none" ? word.textContent.trim() : null };
});

for (const lang of ["en", "bn"]) for (const width of [320, 390, 1280]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== ☰ Surah list ${tag} ===`);
  const { ctx, page } = await start(lang, width);

  // Another way into Read: the button must not be there.
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  check(`${tag} Read opened another way: no ☰ Surah list button`, !(await btn(page)).shown, JSON.stringify(await btn(page)));
  await page.click("#tabApproachBtn").catch(() => {}); await page.waitForTimeout(400);

  // Read -> list -> surah 2.
  await openList(page);
  await pickRow(page, "surah", 2);
  const b = await btn(page);
  check(`${tag} after Read -> list -> a surah, the button is shown`, b.shown, JSON.stringify(b));
  check(`${tag} it sits top left of the Read bar, inside the screen (left ${b.left}px, bar ${b.barLeft}px, top ${b.top}px)`, b.left >= 0 && b.left - b.barLeft <= 16 && b.top >= 0 && b.top <= 80 && b.right <= b.vw, JSON.stringify(b));
  check(`${tag} it is 36px tall, a finger-sized target`, b.h === 36 && b.w >= 36, JSON.stringify(b));
  check(`${tag} it overlaps neither the ⤢ button nor the page reference`, !b.overFull && !b.overRef, JSON.stringify(b));
  check(`${tag} its accessible name is "${LABEL[lang]}"`, b.aria === LABEL[lang], JSON.stringify(b));
  if (width < 360) check(`${tag} below 360px it is the ☰ alone (square)`, b.word === null && b.w === 36, JSON.stringify(b));
  else check(`${tag} it reads "☰ ${LABEL[lang]}"`, b.word === LABEL[lang], JSON.stringify(b));

  // Press it: the list, on the tab last used. Go to a Juz first.
  await openList(page, "#readListBtn");
  const tab1 = await page.evaluate(() => document.querySelector('[data-rc-tab][aria-selected="true"]')?.dataset.rcTab);
  check(`${tag} pressing it opens the list, on the Surah tab it was opened from`, tab1 === "surah", tab1);
  await pickRow(page, "juz", 30);
  await openList(page, "#readListBtn");
  const tab2 = await page.evaluate(() => document.querySelector('[data-rc-tab][aria-selected="true"]')?.dataset.rcTab);
  check(`${tag} after opening a Juz, it reopens on the Juz tab`, tab2 === "juz", tab2);

  // Pick another surah from it: that surah opens, the button stays.
  await page.click('[data-rc-tab="surah"]');
  await pickRow(page, "surah", 67);
  const st = await page.evaluate(() => ({ surah: document.getElementById("surahSelect").value, type: document.getElementById("unitTypeSelect").value }));
  check(`${tag} picking Al-Mulk (67) from it opens surah 67`, st.surah === "67" && st.type === "surah", JSON.stringify(st));
  check(`${tag} and the button is still there`, (await btn(page)).shown);
  await ctx.close();
}

console.log(`\n==== ☰ Surah list button: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
