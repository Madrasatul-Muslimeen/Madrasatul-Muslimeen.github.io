// The Owner, 17 Nov 2026 ("Fix all three views"): the Read bar, tidied.
//   1. Page goes inside the 📍 location button (400-899px, only when the unit IS a page; the gold "Page N" chip steps aside)
//   2. the Show items (English / Bangla / Word by Word) are inside the ⋮ sheet below 900px, not on the bar
//   3. ← and ✕ (the way back) share the bar's second line with the Read on group (the Show button no longer fills line one)
//   4. the beginning of a sūrah in the Reading View is a framed banner: Arabic name, name, Meccan/Medinan, āyāt
//   node tools/i18n-verify/read-bar-tidy-browser.mjs [--mutate=NAME]   (repo root, serve.js on :8080 / QR_BASE)
//   --mutate=chipstay   the gold Page chip stays when the pin carries the page   -> "the chip steps aside" FAILS
//   --mutate=noword     the pin draws no "Page" word                              -> "the pin reads Page N" FAILS
//   --mutate=noshow     the ⋮ sheet's Show group is never drawn                    -> "the ⋮ sheet carries Show" FAILS
//   --mutate=showslot   the Show slot stays on the bar below 900px                 -> "not on the bar" and "← ✕ on line two" FAIL
//   --mutate=plainbanner  the sūrah start is the old plain heading                 -> the banner checks FAIL
//   --mutate=noreopen     ticking a layer in the ⋮ sheet leaves the sheet closed (Codex P2) -> "the sheet stays open" FAILS
//   --mutate=nosearchhide the 🔍 stays beside the way back below 380px            -> "🔍 gives way" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  chipstay: ['.read-unit-chip[data-unit-type="page"] { display: none; }', '.read-unit-chip[data-unit-type="page"] { display: inline-flex; }'],
  noword: ['.read-loc-page::before { content: attr(data-word) " "; }', '.read-loc-page::before { content: ""; }'],
  noshow: ["@media (max-width: 899.98px) { .qm-show:not([hidden]) { display: block; } }", "@media (max-width: 899.98px) { .qm-show:not([hidden]) { display: none !important; } }"],
  showslot: ["if (layersPhoneMq.matches) { home.dataset.title", "if (false) { home.dataset.title"],
  plainbanner: ['class="unit-flow-surah-heading surah-start-banner"', 'class="unit-flow-surah-heading"'],
  noreopen: ["\n        setTimeout(reopen, 50);\n      }", "\n      }"],
  nosearchhide: ["@media (max-width: 379.98px) { #readBar:has(#readBackSlot > *) #readSearchBtn { display: none; } }", ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error(`promise: ${n}`); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);

async function start(lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const src = fs.readFileSync("app/quranrevival.html", "utf8");
      if (src.split(a).length !== 2) throw new Error(`mutation anchor missing or not unique: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  return { ctx, page };
}
const pickUnit = async (page, type) => { await setSel(page, "surahSelect", "57"); await page.waitForTimeout(1200); await setSel(page, "unitTypeSelect", type); await page.waitForTimeout(900); };
const bar = (page) => page.evaluate(() => {
  const q = (s) => document.querySelector(s), box = (e) => { const r = e?.getBoundingClientRect(); return r && r.width > 0 ? { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) } : null; };
  const chip = q("#readUnitChip"), loc = q("#readLocBtn"), lp = q("[data-read-loc-page]");
  return {
    chip: box(chip), loc: box(loc), locText: lp?.textContent.trim() ?? "", locWord: lp ? getComputedStyle(lp, "::before").content : "none", locPageShown: !!lp && getComputedStyle(lp).display !== "none" && lp.getBoundingClientRect().width > 0,
    prev: box(q("#prevAyahBtn")), end: box(q("#readBarEnd")), search: box(q("#readSearchBtn")), over: document.documentElement.scrollWidth - innerWidth,
    slot: box(q("#readMeaningLayersSlot")),
  };
});

for (const [lang, width] of [["en", 412], ["en", 1280], ["en", 390], ["en", 360], ["bn", 412]]) {
  const tag = `[${lang} ${width}]`;
  const { ctx, page } = await start(lang, width);
  // ---- 1. Page inside the 📍 -------------------------------------------------------------------------------------
  await pickUnit(page, "page");
  const p = await bar(page);
  const inPin = width >= 400 && width < 900;
  check(`${tag} POSITIVE CONTROL: the unit is a page (chip says so) and the pin is on the bar from 400px`, !!p.chip || inPin, JSON.stringify(p));
  if (inPin) {
    check(`${tag} 1: the gold Page chip steps aside (the pin says it)`, p.chip === null, JSON.stringify(p.chip));
    check(`${tag} 1: the pin reads Page N (the word, then a number), still a 40px tile`, p.locPageShown && /^\d+$|^[০-৯]+$/.test(p.locText) && /Page|পৃষ্ঠা/.test(p.locWord) && p.loc && p.loc.h >= 40 && p.loc.w > 40, JSON.stringify({ t: p.locText, w: p.locWord, loc: p.loc }));
    check(`${tag} 1: the pin and ◂ ▸ share one line, no sideways scroll`, !p.prev || Math.abs(p.loc.top - p.prev.top) <= 2, JSON.stringify({ loc: p.loc, prev: p.prev, over: p.over }));
    check(`${tag} 1: no sideways scroll`, p.over <= 0, String(p.over));
    // any other unit keeps its chip, and the pin goes back to the icon alone
    await pickUnit(page, "surah");
    const s = await bar(page);
    check(`${tag} 1: a sūrah unit keeps its own chip and the pin is the icon alone`, !!s.chip && !s.locPageShown, JSON.stringify(s));
  } else {
    check(`${tag} 1: outside 400-899px the gold chip stays and the pin stays icon-only or number-only (no "Page" word)`, (width < 400 ? !!p.chip : true) && !/Page|পৃষ্ঠা/.test(p.locWord), JSON.stringify(p));
    if (width >= 900) check(`${tag} 1: from 900px the pin shows the printed page number alone, beside the chip`, p.locText === "" || /^\d+$/.test(p.locText), JSON.stringify(p));
  }

  // ---- 2. Show in the ⋮ -----------------------------------------------------------------------------------------
  await pickUnit(page, "ayah"); await setSel(page, "ayahSelect", "2"); await page.waitForTimeout(600);
  await page.click("#readOnCheck", { force: true }); await page.waitForSelector("#pageViewContainer [data-meaning-key]", { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(800);
  const flowOn = await page.evaluate(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length);
  check(`${tag} POSITIVE CONTROL: Read on shows the flow`, flowOn > 0, String(flowOn));
  const b2 = await bar(page);
  const sheet = () => page.evaluate(() => { const g = document.querySelector("#readQuickMenuSlot .qm-show"), r = g?.getBoundingClientRect(); return { shown: !!r && r.height > 0, keys: [...(g?.querySelectorAll("[data-qm-layer]") ?? [])].map((b) => b.dataset.qmLayer).join() }; });
  await page.click("#readQuickMenuSlot .ayah-quick-btn"); await page.waitForTimeout(400);
  const sh = await sheet();
  if (width < 900) {
    check(`${tag} 2: the Show switches are not on the bar`, b2.slot === null, JSON.stringify(b2.slot));
    check(`${tag} 2: the ⋮ sheet carries Show: English, Bangla, Word by Word`, sh.shown && sh.keys === "en,bn,wbw", JSON.stringify(sh));
  } else {
    check(`${tag} 2: from 900px the switches stand on the bar and the ⋮ sheet has no Show group`, !!b2.slot && !sh.shown, JSON.stringify({ slot: b2.slot, sh }));
  }
  if (width < 900) {
    // Codex P2 on #1807: ticking a layer repaints the Read bar and used to close the ⋮ sheet, so a second tick meant reopening it.
    const flip = (k) => page.evaluate((x) => document.querySelector(`#readQuickMenuSlot [data-qm-layer="${x}"]`)?.click(), k);
    const st = () => page.evaluate(() => { const m = document.querySelector("#readQuickMenuSlot .quick-menu"), g = m?.querySelector(".qm-show"); return { open: !!m?.classList.contains("open") && m.getBoundingClientRect().height > 0, on: [...(g?.querySelectorAll("[data-qm-layer]") ?? [])].map((b) => b.checked).join() }; });
    const before = await st();
    await flip("bn"); await page.waitForTimeout(1800);
    const after1 = await st();
    check(`${tag} 2: ticking Bangla in the sheet keeps the sheet open, now with Bangla off`, before.open && after1.open && before.on === "true,true,true" && after1.on === "true,false,true", JSON.stringify({ before, after1 }));
    await flip("wbw"); await page.waitForTimeout(1800);
    const after2 = await st();
    check(`${tag} 2: a second tick works without reopening ⋮ (Word by Word off too)`, after2.open && after2.on === "true,false,false", JSON.stringify(after2));
    await flip("bn"); await page.waitForTimeout(1200); await flip("wbw"); await page.waitForTimeout(1200); // put both back
  }
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);

  // ---- 3. ← ✕ on the second line ---------------------------------------------------------------------------------
  if (width < 900) {
    await page.evaluate(() => { const s = document.getElementById("readBackSlot"); s.innerHTML = '<div class="ayah-card-back-pill back-docked" id="tidyBack"><button class="ayah-card-back-btn" type="button" aria-label="Back"><span class="ayah-card-back-arrow">←</span><span class="ayah-card-back-text"> Back</span></button><button class="ayah-card-back-x" type="button" aria-label="Close">✕</button></div>'; });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => { const b = (s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && r.width > 0 ? { top: Math.round(r.top), h: Math.round(r.height), left: Math.round(r.left), right: Math.round(r.right) } : null; }; return { back: b("#tidyBack"), end: b("#readBarEnd"), loc: b("#readLocWrap"), list: b("#readListBtn"), barH: Math.round(document.getElementById("readBar").getBoundingClientRect().height), over: document.documentElement.scrollWidth - innerWidth }; });
    check(`${tag} 3: ← ✕ sit on line two beside the Read on group, under ☰ (not squeezed on line one)`, !!r.back && !!r.end && Math.abs((r.back.top + r.back.h / 2) - (r.end.top + r.end.h / 2)) <= 6 && r.back.top > r.list.top + 20 && r.over <= 0, JSON.stringify(r));
    if (width < 380) {
      const sb = await bar(page);
      check(`${tag} 3: 🔍 gives way below 380px while the way back is shown`, sb.search === null, JSON.stringify(sb.search));
    }
  }

  // ---- 4. the beginning of a sūrah ------------------------------------------------------------------------------
  await page.evaluate(() => { document.getElementById("readBackSlot").innerHTML = ""; });
  await pickUnit(page, "surah"); await page.waitForSelector("#pageViewContainer [data-meaning-key]", { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(800);
  const bn = await page.evaluate(() => { const b = document.querySelector("#pageViewContainer .surah-start-banner"), r = b?.getBoundingClientRect(); const cs = b ? getComputedStyle(b) : null;
    return { has: !!b, ar: b?.querySelector(".ssb-ar")?.textContent.trim() ?? "", name: b?.querySelector(".ssb-name")?.textContent.trim() ?? "", facts: b?.querySelector(".ssb-facts")?.textContent.trim() ?? "", w: Math.round(r?.width ?? 0), h: Math.round(r?.height ?? 0), border: cs?.borderTopColor ?? "", unit: b?.dataset.unitMarker ?? "", fits: !!r && r.left >= 0 && r.right <= innerWidth + 1 }; });
  check(`${tag} 4: the sūrah starts with a framed banner: Arabic name, name, where revealed, āyāt`, bn.has && bn.ar.includes("الحَدِيدِ") && bn.name.length > 2 && (lang === "bn" ? /মাদানী/.test(bn.facts) : /Medinan/.test(bn.facts)) && /29|২৯/.test(bn.facts), JSON.stringify(bn));
  check(`${tag} 4: the banner is gold-framed, wide, on screen, still ONE button for the sūrah card`, bn.has && bn.h >= 56 && bn.w >= innerWidthOf(width) * 0.6 && bn.fits && /^rgb\(184, 134, 47\)$/.test(bn.border) && bn.unit.length > 0, JSON.stringify(bn));
  if (width === 412 && lang === "en") await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/read-bar-tidy-surah-start-${width}.png` });
  await ctx.close();
}
function innerWidthOf(w) { return w; }
await browser.close();
console.log(`\n==== Read bar tidy (the Owner, 17 Nov 2026)${MUTATE ? ` [MUTATE=${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
