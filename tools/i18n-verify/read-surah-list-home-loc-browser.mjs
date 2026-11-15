// The Owner, 15 Nov 2026 (QR Lead): (1) the landing page's Read opens the SURAH LIST, ← Back returns to the landing page, and a surah chosen in the list
// opens the Mushaf view; (2) the Mushaf bar has 🏠 Home (to the landing page); (3) 📍 Location shows in the Mushaf view, on a phone too, and speaks
// about the PAGE on screen; (4) on a phone the surah-name button gives way to 🏠 and 📍. Run from the repo root, serve.js on :8080 (or QR_BASE).
// Mutations (--mutate=NAME) must each exit 1:
//   readdirect  Read goes straight to the Mushaf again          -> "Read opens the Surah list" fails
//   nohome      the Home button is never shown                  -> the Home checks fail
//   noloc       the pin stays hidden below 400px                -> "the pin is on the Mushaf bar on a phone" fails
//   keepname    the surah name stays on a phone                 -> "the surah name is replaced" fails
//   curayah     the pin ignores the page and uses the cursor    -> "the pin names the page's first āyah" fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const HTML = "app/quranrevival.html";
const MUT = {
  readdirect: [HTML, 'setPanel(""); openReadContents(e); });', 'setPanel(""); mushafToggle.checked = true; mushafToggle.dispatchEvent(new Event("change")); openReadingScreen(); });'],
  nohome: [HTML, '  #readBar:has(#mushafPageRef:not([hidden])) .read-home-btn { display: inline-flex;', '  #readBar:has(#mushafPageRef:not([hidden])) .read-home-btn { display: none;'],
  noloc: [HTML, '    #readBar:has(#mushafPageRef:not([hidden])) .read-loc-btn { display: inline-flex; }', '    #readBar:has(#mushafPageRef:not([hidden])) .read-loc-btn { display: none; }'],
  keepname: [HTML, '    #readBar:has(#mushafPageRef:not([hidden])) #mushafPageRef { display: none; }', ''],
  curayah: [HTML, 'if (first) return { surah: first.surah, ayah: first.firstAyah, page: pg, mushaf: true };', ''],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error(`promise: ${n}`); return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`)); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const width of [360, 390, 768, 1280]) {
  console.log(`\n=== Surah list, Home, Location [${width}] ===`);
  const ctx = await newContext(browser, { banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForTimeout(800);
  const listOpen = () => page.evaluate(() => { const m = document.getElementById("readContentsMount"); return !!m && !m.hidden; });
  await page.click("#wbRead"); await page.waitForTimeout(700);
  check(`${width}: Read opens the Surah list`, await listOpen());
  await page.click("#readContentsBackBtn"); await page.waitForTimeout(300);
  check(`${width}: ← Back closes the list and stays on the landing page`, !(await listOpen()) && await page.evaluate(() => document.body.classList.contains("landing-view")));
  await page.click("#wbRead"); await page.waitForTimeout(700);
  await page.click('[data-rc-kind="surah"][data-rc-n="64"]'); await page.waitForTimeout(1800);
  const m = await page.evaluate(() => ({ mushaf: document.getElementById("mushafToggle").checked, list: !document.getElementById("readContentsMount").hidden, landing: document.body.classList.contains("landing-view"), refShown: !document.getElementById("mushafPageRef").hidden, page: document.getElementById("mushafPageRef").dataset.page }));
  check(`${width}: a surah chosen in the list opens the Mushaf view`, m.mushaf && !m.list && !m.landing && m.refShown, JSON.stringify(m));
  const bar = await page.evaluate(() => {
    const vis = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" ? { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top) } : null; };
    return { home: vis("#readHomeBtn"), loc: vis("#readLocBtn"), name: vis("#mushafPageRef"), list: vis("#readListBtn"), scrollW: document.documentElement.scrollWidth - innerWidth };
  });
  check(`${width}: 🏠 Home is on the Mushaf bar, a finger-size tile`, !!bar.home && bar.home.w >= 36 && bar.home.h >= 36, JSON.stringify(bar));
  check(`${width}: the pin is on the Mushaf bar${width < 600 ? " on a phone" : ""}`, !!bar.loc, JSON.stringify(bar));
  if (width < 600) check(`${width}: the surah name is replaced (hidden) on a phone`, bar.name === null, JSON.stringify(bar.name));
  else check(`${width}: the surah name stays on a wide screen`, !!bar.name, JSON.stringify(bar));
  check(`${width}: no sideways scroll`, bar.scrollW <= 0, String(bar.scrollW));
  if (process.argv.includes("--shot")) await page.screenshot({ path: `/tmp/shots/mushaf-${width}.png` });
  // the pin names the page on screen: its first āyah
  const want = await page.evaluate(async () => { const { mushafPageAyahGroups } = await import("/app/js/hifz-renderer.js"); const g = mushafPageAyahGroups(Number(document.getElementById("mushafPageRef").dataset.page))[0]; return g ? `${g.surah}:${g.firstAyah}` : null; });
  await page.evaluate(() => document.getElementById("readLocBtn").click()); await page.waitForTimeout(900);
  const card = await page.evaluate(() => ({ text: document.querySelector("[data-read-loc-list]")?.textContent ?? "", page: document.querySelector("[data-read-loc-page]")?.textContent ?? "" }));
  check(`${width}: the pin names the page's first āyah (${want})`, !!want && card.text.includes(want.split(":")[0] === "64" ? ` ${want}` : want) || card.text.includes(want.replace(":", ":")), JSON.stringify(card).slice(0, 200));
  await page.evaluate(() => document.getElementById("readHomeBtn").click()); await page.waitForTimeout(700);
  check(`${width}: 🏠 Home takes the reader to the landing page`, await page.evaluate(() => document.body.classList.contains("landing-view")));
  check(`${width}: no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Read → Surah list, Home, Location${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
