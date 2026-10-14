// Audit part 1, fixes 3-9 (Architect's feature-by-feature audit, 15 Oct 2026; PCF J29). Measured on the rendered page,
// en/bn x 320 / 390 / 820 / 1280 / 1440 where the screen exists at that width:
//   3  Read bar icons + pickers >= 40px, no ragged wrap          6  every listed shared control >= 40px
//   4  Unit drawer pills >= 40px wide and even                   7  the Āyah card heading keeps a name whole, on one line
//   5  the 1440px Mastery Wheel / Explore windows open below the nav row
//   8  the Āyah card's unit ladder fits (nothing scrolls sideways)
//   9  Bangla digits in the Word card reference and the translation's āyah badge
//   +  the Qur'an line is byte-identical to main (same .ayah-arabic height / line-height as the main-branch page)
// Mutations: --mutate=<name>, each must FAIL this suite (see MUTATIONS below).
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const HTML = "app/quranrevival.html";
const MUTATIONS = {
  "read-icons": [HTML, "  #readBar .qr-ico { box-sizing: border-box; min-width: 40px; min-height: 40px;", "  #readBar .qr-ico { box-sizing: border-box; min-width: 0; min-height: 0;"],
  "pickers": [HTML, "box-sizing: border-box; min-height: 40px; } /* audit J29 fix 3", "box-sizing: border-box; min-height: 0; } /* audit J29 fix 3"],
  "popup-inset": [HTML, "return nav ? nav.getBoundingClientRect().bottom + 8 : 0;", "return 0;"],
  "unit-pills": [HTML, ".wheel-show-switch { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.2rem; }", ".wheel-show-switch { display: flex; flex-wrap: nowrap; gap: 0.2rem; }"],
  "heading": [HTML, "    .ayah-sheet-header { flex-wrap: wrap; }\n", ""],
  "ladder": [HTML, "display: grid; grid-template-columns: repeat(auto-fill, minmax(5.8rem, 1fr)); gap: 0.3rem; overflow-x: visible;", "display: flex; gap: 0.3rem; overflow-x: auto;"],
  "digits-word": [HTML, "return num(displayWordRef(surah, ayah, position, fatihaOn(), t(\"Bismillah\")));", "return displayWordRef(surah, ayah, position, fatihaOn(), t(\"Bismillah\"));"],
  "nav-summary": ["app/css/shell.css", "line-height: 40px; height: 40px;", "line-height: 1.2; height: auto;"],
  "tabs": [HTML, "min-height: 40px; /* audit J29 fix 6: the bottom tabs measured 33-35px */", ""],
  "word-header": [HTML, ".quran-word-card header button { width: 40px; height: 40px; } /* audit J29", ".quran-word-card header button { width: 36px; height: 36px; } /* audit J29"],
};
const NAVY = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = String(val); s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
const browser = await chromium.launch();

async function open(lang, width, { baseline = false } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const swaps = [];
  if (baseline) swaps.push([HTML, fs.readFileSync("/tmp/audit-main-quranrevival.html", "utf8")]);
  if (MUTATE) {
    const [file, from, to] = MUTATIONS[MUTATE] || (() => { throw new Error(`no such mutation ${MUTATE}`); })();
    const body = fs.readFileSync(file, "utf8");
    if (!body.includes(from)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    swaps.push([file, body.split(from).join(to)]);
  }
  for (const [file, body] of swaps) {
    const glob = file.endsWith(".css") ? "**/css/shell.css*" : "**/app/quranrevival.html*";
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css" : "text/html; charset=utf-8", body }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page };
}
const rectsOf = (page, sels) => page.evaluate((list) => list.flatMap((s) => [...document.querySelectorAll(s)].map((e, i) => {
  const r = e.getBoundingClientRect();
  return { s: s + (i ? `[${i}]` : ""), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, y: Math.round(r.y) };
}).filter((x) => x.w > 0 && x.h > 0)), sels);
const needBox = (tag, rs, minW = 40, minH = 40) => {
  const bad = rs.filter((r) => r.h < minH - 0.5 || r.w < minW - 0.5);
  check(`${tag}: ${rs.length} controls, each >= ${minW}x${minH}`, rs.length > 0 && bad.length === 0, bad.map((b) => `${b.s} ${b.w}x${b.h}`).join(", "));
};
const toRead = async (page) => {
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
};
const toAyah = async (page) => {
  await NAVY(page, "surahSelect", 2); await page.waitForTimeout(1200);
  await NAVY(page, "unitTypeSelect", "ayah"); await page.waitForTimeout(500);
  await page.evaluate(() => { const s = document.getElementById("ayahSelect"); if (s) { s.value = "255"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForSelector("button.ayah-word-clickable", { timeout: 10000 });
  await page.waitForTimeout(500);
};

for (const lang of ["en", "bn"]) {
  for (const width of [320, 390, 820, 1280, 1440]) {
    const tag = `${lang} ${width}px`;
    const { ctx, page } = await open(lang, width);
    try {
      check(`${tag}: POSITIVE CONTROL -- the page is in ${lang}`, (await page.evaluate(() => document.documentElement.lang)) === "bn" ? lang === "bn" : lang === "en");
      // ---- landing (the Approach tab): shared controls, capsules, Unit drawer, popups
      needBox(`${tag} landing: head search, nav buttons, bottom tabs`, await rectsOf(page, ["#headSearchBtn", ".nav-cat > summary", "#tabApproachBtn", "#tabStudyBtn", "#tabExploreBtn", "#tabJourneyBtn"]), 40, 40);
      needBox(`${tag} landing: Unit / Know Your Status / Read capsules`, await rectsOf(page, ["#wheelUnitBtn", "#myStatusWideBtn", "#readContentsBtn"]), 0, 40);
      if (width <= 720) {
        await page.click("[data-wheel-drawer=unit]"); await page.waitForTimeout(400);
        const pills = await rectsOf(page, ["#wheelShowSwitch .wheel-show-btn"]);
        needBox(`${tag} Unit drawer pills`, pills, 40, 40);
        const rest = pills.slice(1).map((p) => p.w);
        check(`${tag} Unit drawer: the pills after "All units" are one even width (${rest.join("/")})`, rest.length === 6 && Math.max(...rest) - Math.min(...rest) <= 1.5);
        check(`${tag} Unit drawer: two tidy rows (${pills.map((p) => p.y).join(",")})`, new Set(pills.map((p) => p.y)).size === 2);
      }
      if (width >= 900) {
        const navBottom = await page.evaluate(() => document.querySelector(".app-nav").getBoundingClientRect().bottom);
        await page.click("#tabApproachBtn"); await page.waitForTimeout(400);
        const wy = await page.evaluate(() => document.getElementById("wheelPopupView").getBoundingClientRect().y);
        check(`${tag} Mastery Wheel window opens below the nav row (top ${Math.round(wy)} >= nav bottom ${Math.round(navBottom)})`, wy >= navBottom - 0.5);
        needBox(`${tag} wheel window maximize button`, await rectsOf(page, ["#wheelPopupMaximizeBtn"]), 40, 40);
        await page.click("#tabExploreBtn"); await page.waitForTimeout(600);
        const ey = await page.evaluate(() => document.getElementById("exploreView").getBoundingClientRect().y);
        check(`${tag} Explore window opens below the nav row (top ${Math.round(ey)} >= nav bottom ${Math.round(navBottom)})`, ey >= navBottom - 0.5);
      }
      // ---- Read view
      await toRead(page);
      const bar = await rectsOf(page, ["#prevUnitBtn", "#nextUnitBtn", "#readPlayBtn", "#readStopBtn", "#prevAyahBtn", "#nextAyahBtn", "#hideChromeBtn", "#readToolsBtn", "#readWindowBtn", "#readNotesBtn", "#readWritingBtn", "#readCompleteBtn", "#readAttachAsmaBtn"]);
      needBox(`${tag} Read bar icon buttons`, bar, 40, 40);
      check(`${tag} Read bar has the transport buttons`, ["#prevUnitBtn", "#nextUnitBtn", "#readPlayBtn", "#readStopBtn"].every((s) => bar.some((b) => b.s === s)));
      if (width >= 900) check(`${tag} Read bar shows Notes/Writing/Complete inline`, ["#readNotesBtn", "#readWritingBtn", "#readCompleteBtn"].every((s) => bar.some((b) => b.s === s)));
      needBox(`${tag} Read pickers`, await rectsOf(page, ["#readAyahSelect", "#readSurahSelect", "#readUnitTypeSelect"]), 0, 40);
      const rows = new Set(bar.filter((b) => !/hideChrome|readTools|readWindow/.test(b.s)).map((b) => b.y));
      check(`${tag} Read bar: transport + tools sit on at most two tidy lines (${[...rows].join(",")})`, rows.size <= 2);
      const pk = await rectsOf(page, ["#readPickers select"]);
      check(`${tag} Read pickers: one line (${[...new Set(pk.map((p) => p.y))].join(",")})`, new Set(pk.map((p) => p.y)).size === 1);
      const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
      check(`${tag} no sideways page overflow after the changes`, noOverflow);

      // ---- Āyah in the Read view: Qur'an line, Word card, Āyah card
      await toAyah(page);
      const ar = await page.evaluate(() => { const e = document.querySelector(".ayah-arabic"); const w = document.querySelector("button.ayah-word-clickable"); return e ? { h: Math.round(e.getBoundingClientRect().height * 10) / 10, lh: getComputedStyle(w).lineHeight, fs: getComputedStyle(w).fontSize } : null; });
      if (width === 390 || width === 1440) globalThis.__quran = { ...(globalThis.__quran || {}), [tag]: ar };
      const badge = await page.evaluate(() => { const b = document.querySelector("button.ayah-num-badge"); const r = b.getBoundingClientRect(); const a = getComputedStyle(b, "::after"); return { w: r.width, h: r.height, aw: parseFloat(a.width), ah: parseFloat(a.height) }; });
      check(`${tag} āyah-number badge keeps its line (${badge.h}px tall) and has a >=40px invisible tap area (${badge.aw}x${badge.ah})`, badge.aw >= 40 && badge.ah >= 40 && badge.h <= 26);
      await page.click("button.ayah-word-clickable"); await page.waitForSelector(".quran-word-card header", { timeout: 10000 }); await page.waitForTimeout(500);
      const wh = await rectsOf(page, [".quran-word-card header button"]);
      needBox(`${tag} Word card header buttons (‹ › × 🔍, This āyah ⋯)`, wh, 0, 40);
      check(`${tag} Word card: ‹ › × 🔍 are 40 wide too`, wh.filter((b) => b.w < 70).every((b) => b.w >= 39.5), wh.map((b) => `${b.w}x${b.h}`).join(" "));
      const refTxt = await page.evaluate(() => document.querySelector(".word-card-reference")?.textContent || "");
      check(`${tag} Word card reference reads "${refTxt}" in ${lang === "bn" ? "Bengali" : "Latin"} digits`, lang === "bn" ? /[০-৯]/.test(refTxt) && !/[0-9]/.test(refTxt) : /[0-9]/.test(refTxt));
      await page.click("[data-word-card-close]"); await page.waitForTimeout(300);
      const tb = await page.evaluate(() => [...document.querySelectorAll(".ayah-translation, .ayah-translation-bn")].length);
      void tb;
      await page.click("[data-ayah-num-badge]"); await page.waitForSelector("[data-ayah-sheet]", { timeout: 10000 }); await page.waitForTimeout(500);
      const ref = await page.evaluate(() => { const e = document.querySelector(".ayah-sheet-ref"); const cs = getComputedStyle(e); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3; return { h: e.getBoundingClientRect().height, lh, hy: cs.hyphens, ow: cs.overflowWrap }; });
      check(`${tag} Āyah card heading: no hyphen split, no mid-name break (hyphens ${ref.hy}, overflow-wrap ${ref.ow})`, ref.hy === "none" && ref.ow === "normal");
      if (width >= 390) check(`${tag} Āyah card heading is one line (${ref.h}px)`, ref.h < ref.lh * 1.6);
      const lad = await page.evaluate(() => { const l = document.querySelector(".unit-ladder"); const lr = l.getBoundingClientRect(); const rungs = [...l.querySelectorAll(".unit-ladder-rung")].map((b) => b.getBoundingClientRect()); return { sw: l.scrollWidth, cw: l.clientWidth, inside: rungs.every((r) => r.left >= lr.left - 0.5 && r.right <= lr.right + 0.5), n: rungs.length, minH: Math.min(...rungs.map((r) => r.height)) }; });
      check(`${tag} unit ladder fits: ${lad.n} rungs inside it, scrollWidth ${lad.sw} <= clientWidth ${lad.cw}`, lad.n >= 3 && lad.sw <= lad.cw + 1 && lad.inside && lad.minH >= 39.5);
      needBox(`${tag} Āyah card close / step buttons`, await rectsOf(page, [".ayah-sheet-close", ".ayah-sheet-nav"]), 40, 40);
      await page.click("[data-ayah-sheet-close]"); await page.waitForTimeout(300);
      // the translation's āyah badge (Bangla app: the English block follows the app digits)
      await page.evaluate(() => { const s = document.querySelector("#readTranslationToggle"); void s; });
      const badges = await page.evaluate(async () => {
        const mod = await import("/app/js/ayah-renderer.js");
        const html = mod.renderTranslationPanel({ ayah: 255, translations: { en: "x", bn: "y" } }, ["en", "bn"]);
        return [...html.matchAll(/ayah-num-badge">([^<]*)</g)].map((m) => m[1]);
      });
      check(`${tag} translation badges ${JSON.stringify(badges)}`, badges.length === 2 && (lang === "bn" ? badges.every((b) => /^[০-৯]+$/.test(b)) : badges[0] === "255" && /^[০-৯]+$/.test(badges[1])));
    } catch (err) {
      check(`${tag}: the flow ran to the end`, false, String(err && err.stack || err).split("\n").slice(0, 3).join(" | "));
    }
    await ctx.close();
  }
}

// ---- the Qur'an line against the main-branch page
if (!MUTATE) {
  fs.writeFileSync("/tmp/audit-main-quranrevival.html", execFileSync("git", ["show", "main:app/quranrevival.html"], { maxBuffer: 1 << 28 }));
  for (const lang of ["en", "bn"]) for (const width of [390, 1440]) {
    const tag = `${lang} ${width}px`;
    const { ctx, page } = await open(lang, width, { baseline: true });
    try {
      await toRead(page); await toAyah(page);
      const base = await page.evaluate(() => { const e = document.querySelector(".ayah-arabic"); const w = document.querySelector("button.ayah-word-clickable"); return { h: Math.round(e.getBoundingClientRect().height * 10) / 10, lh: getComputedStyle(w).lineHeight, fs: getComputedStyle(w).fontSize }; });
      const now = globalThis.__quran?.[tag];
      check(`${tag} Qur'an line identical to main (now ${JSON.stringify(now)} / main ${JSON.stringify(base)})`, !!now && now.h === base.h && now.lh === base.lh && now.fs === base.fs);
    } catch (err) { check(`${tag} baseline flow`, false, String(err && err.message || err)); }
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== audit part 1 fixes 3-9${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
