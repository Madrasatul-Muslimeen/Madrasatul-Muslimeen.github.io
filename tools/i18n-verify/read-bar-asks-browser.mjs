// The Owner, 11 Nov 2026, three asks on the Read bar's global ⋮ ("dot card") and bar, with phone screenshots:
//  (1) "Why two BM?"  The bar's ⋮ with a unit wider than one āyah ("Whole Surah 14") showed TWO bookmark tiles. Now ONE: the unit's.
//  (2) "This is global dot card. Add WbW, Root, Derivatives choices here." In Read on, the ⋮ gets Word by Word, Root and Derivatives
//      tiles (Word by Word = the flow's own layer, the same state as its Show ▾ switch); the flow now draws Root and Derivatives too.
//  (3) "Enable a quick search button here. You can only show the 3 lines (not Surah written) to make space." A 🔍 on the Read bar's
//      right-hand group (also in the bare full-screen state, where the Owner's gap is), opening the same search as the banner's 🔍;
//      the ☰ button's word is dropped ONLY when that saves a row of the bar.
//   node tools/i18n-verify/read-bar-asks-browser.mjs [--mutate=NAME] [--lang=en] [--width=390]   (repository root, serve.js on :8080)
//   --mutate=twobm      the bar's sheet draws both bookmark tiles again       -> (1) FAILS
//   --mutate=notools    Read on's sheet loses the three text tiles            -> (2) FAILS
//   --mutate=noroot     the Reading flow does not draw Root / Derivatives     -> (2) FAILS
//   --mutate=nosearch   the 🔍 is removed from the bar                        -> (3) FAILS
//   --mutate=nofit      the ☰ word is never dropped                           -> (3) the 360px one-row check FAILS
// Every size is measured on the rendered page; the expected values are written BY HAND.
import { chromium, newContext, openPage, goReadOn } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${String(detail).slice(0, 300)}`); }
};
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate");
const HTML = "app/quranrevival.html", REND = "app/js/ayah-note-renderer.js";
const MUT = {
  twobm: [HTML, "showBookmark: !unitBookmarkOpt(),\n          sheet: true,", "showBookmark: true,\n          sheet: true,"],
  notools: [HTML, "showTextTools: true, isWbwOn: !!readMeaningLayers.wbw,", "showTextTools: false, isWbwOn: !!readMeaningLayers.wbw,"],
  noroot: [HTML, '...(rootsToggle.checked ? ["root"] : []), ...(derivativesToggle.checked ? ["derivatives"] : [])]; // J', "]; // J"],
  nosearch: [HTML, '<button type="button" class="secondary qr-ico" id="readSearchBtn"', '<button type="button" hidden class="secondary qr-ico" id="readSearchBtn"'],
  nofit: [HTML, "      list.classList.add(\"word-off\");\n      if (rows() >= before)", "      if (rows() >= before)"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const WIDTHS = arg("width") ? [Number(arg("width"))] : [320, 360, 390, 412];
const BARE = ["immersive-read", "fs-hide-banner", "fs-hide-topnav", "fs-hide-dock", "fs-hide-readbar", "fs-hide-transport"];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function start(lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 800 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file.replace("app/", "")}*`, async (r) => {
      const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation ${MUTATE}: anchor missing`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.waitForTimeout(600);
  if (!(await page.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.evaluate(() => document.getElementById("tabStudyBtn").click()); await page.waitForTimeout(200); }
  await page.evaluate(() => document.getElementById("tabReadBtn").click()); await page.waitForTimeout(700);
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "14"; s.dispatchEvent(new Event("change", { bubbles: true })); }); await page.waitForTimeout(1500);
  return { ctx, page, errors };
}
const setUnit = (page, v) => page.evaluate((val) => { const u = document.getElementById("unitTypeSelect"); u.value = val; u.dispatchEvent(new Event("change", { bubbles: true })); }, v);
const openSheet = async (page) => { await page.evaluate(() => document.querySelector("#readQuickMenuSlot .ayah-quick-btn").click()); await page.waitForTimeout(500); };
const closeSheet = (page) => page.evaluate(() => document.querySelector("#readQuickMenuSlot .ayah-quick-btn.active, #readQuickMenuSlot [data-qm-toggle]")?.click());
const tiles = (page) => page.evaluate(() => ({ bookmark: document.querySelectorAll("#readQuickMenuSlot .qm-sheet [data-qm-bookmark]").length, unitBookmark: document.querySelectorAll("#readQuickMenuSlot .qm-sheet [data-qm-unit-bookmark]").length, wbw: document.querySelectorAll("#readQuickMenuSlot .qm-sheet [data-qm-wbw]").length, roots: document.querySelectorAll("#readQuickMenuSlot .qm-sheet [data-qm-roots]").length, derivs: document.querySelectorAll("#readQuickMenuSlot .qm-sheet [data-qm-derivatives]").length, label: document.querySelector("#readQuickMenuSlot [data-qm-unit-bookmark]")?.textContent.replace(/\s+/g, " ").trim() ?? null }));
try {
  for (const lang of LANGS) {
    // ---------------- (1) and (2) once per language at 390 ----------------
    {
      const tag = `[${lang} 390]`;
      console.log(`\n=== Read bar asks (1)(2) ${tag} ===`);
      const { ctx, page, errors } = await start(lang, 390);
      try {
        // (a) the one-āyah view with a Ruku' unit (wider than one āyah): the bar's sheet draws the unit's bookmark only
        await setUnit(page, "ruku"); await page.waitForTimeout(1000);
        await openSheet(page); let t = await tiles(page);
        check(`${tag} (1) POSITIVE CONTROL: a Ruku' unit's bar sheet is open and has the unit's bookmark tile`, t.unitBookmark === 1, JSON.stringify(t));
        check(`${tag} (1) the one-āyah view: ONE bookmark tile (the unit's), not two`, t.unitBookmark === 1 && t.bookmark === 0, JSON.stringify(t));
        await closeSheet(page); await page.waitForTimeout(300);
        // (b) the Mushaf bar with Whole Surah 14: the case of the Owner's screenshot
        await setUnit(page, "surah"); await page.waitForTimeout(700);
        await page.evaluate(() => { const m = document.getElementById("mushafToggle"); if (!m.checked) m.click(); }); await page.waitForTimeout(2500);
        await openSheet(page); t = await tiles(page);
        check(`${tag} (1) the Mushaf bar, Whole Surah 14 (the screenshot): ONE bookmark tile, "Bookmark · Whole Surah 14", not two`, t.unitBookmark === 1 && t.bookmark === 0 && /14|১৪/.test(t.label ?? ""), JSON.stringify(t));
        await closeSheet(page); await page.waitForTimeout(300);
        await setUnit(page, "ayah"); await page.waitForTimeout(1500);
        await openSheet(page); t = await tiles(page);
        check(`${tag} (1) the Mushaf bar with a ONE-āyah unit keeps the plain "Bookmark" tile, and has no unit tile`, t.bookmark === 1 && t.unitBookmark === 0, JSON.stringify(t));
        await closeSheet(page); await page.waitForTimeout(300);
        await page.evaluate(() => { const m = document.getElementById("mushafToggle"); if (m.checked) m.click(); }); await page.waitForTimeout(2000);
        // (2) Read on
        await goReadOn(page); await page.waitForTimeout(2200);
        await page.waitForSelector(".meaning-ayah", { timeout: 10000 });
        await openSheet(page); const t2 = await tiles(page);
        check(`${tag} (2) Read on's global ⋮ has the Word by Word, Root and Derivatives tiles`, t2.wbw === 1 && t2.roots === 1 && t2.derivs === 1, JSON.stringify(t2));
        const press = async (sel) => { await page.evaluate((q) => document.querySelector(`#readQuickMenuSlot .qm-sheet ${q}`).click(), sel); await page.waitForTimeout(1500); };
        const flow = () => page.evaluate(() => ({ root: document.querySelectorAll(".meaning-ayah .root-panel").length, deriv: document.querySelectorAll(".meaning-ayah .derivatives-panel").length, wbwOn: !!document.querySelector('[data-meaning-layer="wbw"]')?.checked, ayat: document.querySelectorAll(".meaning-ayah").length }));
        const f0 = await flow();
        check(`${tag} (2) before: no Root or Derivatives panel in the flow`, f0.ayat > 0 && f0.root === 0 && f0.deriv === 0, JSON.stringify(f0));
        await press("[data-qm-roots]"); await openSheet(page).catch(() => {}); const f1 = await flow();
        check(`${tag} (2) the Root tile makes the flow draw a Root panel under each āyah`, f1.root > 0 && f1.deriv === 0, JSON.stringify(f1));
        await page.evaluate(() => { if (!document.querySelector("#readQuickMenuSlot .qm-sheet [data-qm-derivatives]")) document.querySelector("#readQuickMenuSlot .ayah-quick-btn").click(); }); await page.waitForTimeout(400);
        await press("[data-qm-derivatives]"); const f2 = await flow();
        check(`${tag} (2) the Derivatives tile makes it draw the Derivatives panel as well`, f2.root > 0 && f2.deriv > 0, JSON.stringify(f2));
        await page.evaluate(() => { if (!document.querySelector("#readQuickMenuSlot .qm-sheet [data-qm-wbw]")) document.querySelector("#readQuickMenuSlot .ayah-quick-btn").click(); }); await page.waitForTimeout(400);
        const wasOn = f2.wbwOn; await press("[data-qm-wbw]"); const f3 = await flow();
        check(`${tag} (2) the Word by Word tile flips the flow's own layer (the Show ▾ switch follows): ${wasOn} → ${f3.wbwOn}`, f3.wbwOn === !wasOn, JSON.stringify({ wasOn, f3 }));
        check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|quran\.com|favicon/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
      } catch (err) { check(`${tag} (1)(2) stopped early: ${String(err.message).split("\n")[0]}`, false); }
      await ctx.close();
    }
    // ---------------- (3) the bare full-screen bar, per width ----------------
    for (const width of WIDTHS) {
      const tag = `[${lang} ${width}]`;
      console.log(`\n=== Read bar asks (3) ${tag} ===`);
      const { ctx, page } = await start(lang, width);
      try {
        await page.evaluate((c) => document.body.classList.add(...c), BARE);
        await page.evaluate(() => { document.getElementById("readMushafBtn").hidden = false; }); await page.waitForTimeout(900);
        const m = await page.evaluate(() => {
          const bar = document.getElementById("readBar"), br = bar.getBoundingClientRect(), r = (id) => { const e = document.getElementById(id); const x = e?.getBoundingClientRect(); return x && x.width > 0 ? { l: x.left, r: x.right, t: x.top - br.top, w: x.width, h: x.height } : null; };
          const word = document.querySelector("#readListBtn .read-list-word");
          return { barH: Math.round(br.height), list: r("readListBtn"), on: r("readOnSwitch"), search: r("readSearchBtn"), mushaf: r("readMushafBtn"), wordShown: !!word && getComputedStyle(word).display !== "none", scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth, barRight: br.right };
        });
        check(`${tag} (3) the 🔍 is on the bar in the bare full-screen state, 40px or more`, !!m.search && m.search.w >= 40 && m.search.h >= 40, JSON.stringify(m.search));
        // From 360px the bar is one row and the 🔍 sits in the gap between "Read on" and 📜. At 320px the six controls are wider than the bar even
        // with the word gone (☰ 40 + Read on 57 + four 40px buttons + gaps > 288), so the group takes its own second row, as it did before the 🔍.
        if (width >= 360) check(`${tag} (3) it sits between "Read on" and 📜 (in the gap), inside the bar`, !!m.search && !!m.on && !!m.mushaf && m.search.l >= m.on.r - 0.5 && m.search.r <= m.mushaf.l + 0.5 && m.search.r <= m.barRight + 0.5, JSON.stringify({ on: m.on, s: m.search, mu: m.mushaf }));
        else check(`${tag} (3) at ${width}px the right-hand group takes a second row, and the 🔍 is inside the bar and before 📜`, !!m.search && !!m.mushaf && m.search.r <= m.barRight + 0.5 && m.search.r <= m.mushaf.l + 0.5 && m.search.t === m.mushaf.t, JSON.stringify({ s: m.search, mu: m.mushaf }));
        check(`${tag} no sideways scroll`, m.scroll <= 0, String(m.scroll));
        if (width >= 360) check(`${tag} (3) the bar is ONE row (${m.barH}px): at ${width}px ☰ ${m.wordShown ? "keeps" : "drops"} its word only as far as needed`, m.barH <= 41, JSON.stringify({ barH: m.barH, wordShown: m.wordShown }));
        else check(`${tag} (3) at ${width}px nothing more can be dropped (the word is already gone): ☰ is the 40px icon`, !m.wordShown && m.list && m.list.w <= 41, JSON.stringify({ wordShown: m.wordShown, list: m.list }));
        if (lang === "en" && width === 360) check(`${tag} (3) the word "Surah" was dropped here because it cost a row (☰ alone is ${m.list ? Math.round(m.list.w) : "?"}px wide)`, !m.wordShown && m.list && m.list.w <= 41, JSON.stringify({ wordShown: m.wordShown, list: m.list }));
        if (width >= 390) check(`${tag} (3) with room to spare the word stays: ☰ Surah`, m.wordShown, JSON.stringify(m.list));
        // press it
        await page.evaluate(() => { document.body.classList.remove("immersive-read", "fs-hide-banner", "fs-hide-topnav", "fs-hide-dock", "fs-hide-readbar", "fs-hide-transport"); }); await page.waitForTimeout(500);
        await page.evaluate(() => document.getElementById("readSearchBtn")?.click()); await page.waitForTimeout(800);
        const s = await page.evaluate(() => ({ open: !document.getElementById("panelStudyOptions").hidden, focus: document.activeElement?.id }));
        check(`${tag} (3) pressing it opens Study options with the cursor in the search box`, s.open && s.focus === "jumpInput", JSON.stringify(s));
      } catch (err) { check(`${tag} (3) stopped early: ${String(err.message).split("\n")[0]}`, false); }
      await ctx.close();
    }
  }
} finally { await browser.close(); }
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
