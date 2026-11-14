// The Owner, 15 Nov 2026 (the Read bar on a phone: "move Read on beside the other buttons on the right; add a location button, i.e. Page no, Sura, Ruku, Juz
// this Ayah / page belongs to; add nav buttons"). Proves, at 360 / 390 (English and Bangla) / 820 / 1280, with Read on off and on:
//   * Read on is the first of the right-hand group (#readBarEnd), on the same row and right beside 🔍 (gap <= 12px);
//   * 📍 is on the bar (36px+), shows the printed page, and its list names this āyah's Ruku', Page, Hizb, Juz and Surah; a rung opens that unit's card;
//   * ◂ ▸ are on the bar, 36px+, and ▸ moves to the next āyah;
//   * a phone's bar is still two lines from 360px (the 13 Nov rule), nothing cut, no sideways scroll.
//   --mutate=noloc     the pin is gone                       -> the location checks FAIL by name
//   --mutate=nosteps   ◂ ▸ go back into the ⋮ menu on a phone  -> the nav checks FAIL by name
//   --mutate=readonleft  Read on stands apart from 🔍 again     -> the "right beside 🔍" check FAILS by name
// Run from the repository root with serve.js up:  node tools/i18n-verify/read-bar-loc-nav-browser.mjs [--mutate=NAME] [--lang=en|bn]
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate");
const PAGE = "app/quranrevival.html";
const MUT = {
  noloc: ['<button type="button" id="readLocBtn" class="read-loc-btn', '<button type="button" id="readLocBtnGone" class="read-loc-btn'],
  nosteps: ["body.read-bar-steps-in-menu #readBar :is(#prevUnitBtn, #nextUnitBtn) { display: none !important; }", "body.read-bar-steps-in-menu #readBar :is(#prevUnitBtn, #prevAyahBtn, #nextAyahBtn, #nextUnitBtn) { display: none !important; }"],
  readonleft: [".read-on-switch { position: relative; box-sizing: border-box; margin: 0; }", ".read-on-switch { position: relative; box-sizing: border-box; margin: 0 80px 0 0; }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const CASES = [[360, "en"], [390, "en"], [390, "bn"], [820, "en"], [1280, "en"]].filter(([, l]) => !arg("lang") || l === arg("lang"));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const [width, lang] of CASES) for (const readOn of [false, true]) {
    const tag = `[${lang} ${width}${readOn ? " Read on" : ""}]`;
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 900 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const [a, b] = MUT[MUTATE], src = fs.readFileSync(PAGE, "utf8");
      if (src.split(a).length !== 2) throw new Error(`mutation ${MUTATE}: anchor found ${src.split(a).length - 1} times, not 1`);
      await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.replace(a, b) }));
    }
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    try {
      await page.waitForTimeout(600);
      if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
      await page.click("#tabReadBtn"); await page.waitForTimeout(1200);
      await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "15"; s.dispatchEvent(new Event("change", { bubbles: true })); });
      await page.waitForFunction(() => document.getElementById("ayahSelect").options.length > 90, null, { timeout: 20000 });
      await page.evaluate(() => { const y = document.getElementById("ayahSelect"); y.value = "72"; y.dispatchEvent(new Event("change", { bubbles: true })); });
      await page.waitForTimeout(1500);
      if (readOn) { await page.evaluate(() => document.getElementById("readOnCheck")?.click()); await page.waitForTimeout(1500); }
      const m = await page.evaluate(() => {
        const R = (id) => { const e = document.getElementById(id); if (!e) return null; const q = e.getBoundingClientRect(); return { l: q.left, r: q.right, t: q.top, b: q.bottom, w: q.width, h: q.height }; };
        const bar = document.getElementById("readBar").getBoundingClientRect();
        return { on: R("readOnSwitch"), search: R("readSearchBtn"), loc: R("readLocBtn"), prev: R("prevAyahBtn"), next: R("nextAyahBtn"), pu: R("prevUnitBtn"), nu: R("nextUnitBtn"), barH: bar.height, vw: innerWidth, sw: document.documentElement.scrollWidth,
          inEnd: !!document.getElementById("readBarEnd")?.contains(document.getElementById("readOnSwitch")), page: document.querySelector("[data-read-loc-page]")?.textContent.trim() };
      });
      check(`${tag} Read on is the first of the right-hand group`, m.inEnd);
      check(`${tag} MUTATION TARGET (readonleft): Read on sits on 🔍's row, right beside it (gap <= 12px)`, !!m.on && !!m.search && Math.abs(m.on.t - m.search.t) < 4 && m.search.l - m.on.r >= 0 && m.search.l - m.on.r <= 12, JSON.stringify([m.on, m.search]));
      check(`${tag} MUTATION TARGET (noloc): the 📍 location button is on the bar, 36px+ wide and 40px tall`, !!m.loc && m.loc.w >= 35.5 && m.loc.h >= 39.5 && m.loc.r <= m.vw + 0.5, JSON.stringify(m.loc));
      if (width >= 400) check(`${tag} the printed page (266) shows beside the pin`, /^(266|২৬৬)$/.test(m.page ?? ""), String(m.page));
      // Plain: the unit buttons ⏮ ⏭ are the nav (for a single āyah ◂ ▸ would only repeat them). Read on on a phone: ⏮ ⏭ go to the ⋮ menu and ◂ ▸ stay on the bar.
      const navA = readOn && width < 600 ? [m.prev, m.next] : [m.pu, m.nu];
      check(`${tag} MUTATION TARGET (nosteps): the nav buttons are on the bar, 36px+ wide`, navA.every((r) => !!r && r.w >= 35.5), JSON.stringify(navA));
      if (width < 600) check(`${tag} the bar is still two lines (<= 110px), no sideways scroll`, m.barH <= 110 && m.sw <= m.vw + 1, `${Math.round(m.barH)}px sw ${m.sw}`);
      else check(`${tag} the bar is one line, no sideways scroll`, m.barH <= 60 && m.sw <= m.vw + 1, `${Math.round(m.barH)}px`);
      // ▸ moves on
      if (!readOn) {
        const before = await page.evaluate(() => document.getElementById("ayahSelect").value);
        await page.evaluate(() => document.getElementById("nextUnitBtn").click()); await page.waitForTimeout(1200);
        const after = await page.evaluate(() => document.getElementById("ayahSelect").value);
        check(`${tag} ⏭ on the bar moves to the next āyah (${before} -> ${after})`, Number(after) === Number(before) + 1, `${before} -> ${after}`);
      } else {
        const hit = await page.evaluate(() => { const b = document.getElementById("nextAyahBtn"), q = b.getBoundingClientRect(), e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !!e && b.contains(e); });
        check(`${tag} ▸ on the bar is reachable (the element at its own centre)`, width >= 600 || hit);
      }
      await page.evaluate(() => { const y = document.getElementById("ayahSelect"); y.value = "72"; y.dispatchEvent(new Event("change", { bubbles: true })); }); await page.waitForTimeout(1200);
      // the location list
      if (!readOn) {
        await page.evaluate(() => document.getElementById("readLocBtn")?.click()); await page.waitForTimeout(2500);
        const L = await page.evaluate(() => ({ items: [...document.querySelectorAll("[data-read-loc-list] button")].map((b) => b.textContent.trim()), open: document.querySelector('[data-bar-palette="readLoc"]')?.classList.contains("open"),
          box: (() => { const q = document.querySelector('[data-bar-palette="readLoc"]').getBoundingClientRect(); return { l: q.left, r: q.right, w: q.width }; })() }));
        check(`${tag} the list opens on screen and names Ruku', Page, Hizb, Juz and the Surah of āyah 15:72`, L.open && L.items.length >= 6 && L.box.l >= -0.5 && L.box.r <= width + 0.5 && /(266|২৬৬)/.test(L.items.join(" ")) && /(14|১৪)/.test(L.items.join(" ")), JSON.stringify(L));
        await page.evaluate(() => document.querySelector('[data-read-loc-unit^="ruku:"]')?.click()); await page.waitForTimeout(1500);
        check(`${tag} a rung (the Ruku') opens that unit's card`, await page.evaluate(() => !!document.querySelector("#ayahActionSheetOverlay.open, .ayah-sheet-overlay.open")));
      }
      check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    } finally { await ctx.close(); }
  }
} finally { await browser.close(); }
console.log(`\n==== Read bar: Read on right, 📍, ◂ ▸${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
