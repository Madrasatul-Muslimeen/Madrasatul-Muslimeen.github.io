// The Owner, 12 Oct 2026 (two phone screenshots, full screen):
//   "Move those buttons up. Save space" -- the Meaning view's English / Bangla / WbW switches sit on the Read bar's
//   own line, not on a sticky line of their own;
//   "Add bookmark button on the top of the Mushaf page" -- 🔖 on the Mushaf bar, beside 📖 and ⤢, kept in the bare
//   full-screen state, bookmarking what the ⋯ menu's 🔖 bookmarks.
// Measured before (main, v10.26, 400px bare full screen): the bar and the switches covered the top 137px; after: 55.
// Run from the repository root, with serve.js on :8080. Mutations (--mutate=NAME) must each FAIL:
//   inflow    the switches drawn back inside the flow -> "on the bar" fails
//   twobm     the ⋮ sheet shows two bookmark tiles    -> "ONE bookmark tile" fails
//   nounit    the ⋮ sheet loses the unit's bookmark   -> the bookmark tile checks fail
import { chromium, newContext, openPage, goReadOn } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  inflow: ['const layersSlot = document.getElementById("readMeaningLayersSlot");\n        if (layersSlot) {', 'const layersSlot = null;\n        if (layersSlot) {'],
  // REPLACED (debt round, 11 Nov 2026): nobm / twobm / fsbm anchored on the Mushaf bar's own 🔖, which is gone (J114 one ⋮), so they could only throw "anchor missing".
  // These break the ONE bookmark tile the ⋮ sheet has now.
  twobm: ["showBookmark: !unitBookmarkOpt()", "showBookmark: true"],          // the sheet shows the āyah's bookmark beside the unit's -> "ONE bookmark tile" fails
  nounit: ["unitBookmark: unitBookmarkOpt()", "unitBookmark: null"],          // the sheet loses the unit's bookmark -> the tile checks fail
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

for (const [lang, W] of [["en", 400], ["bn", 400], ["en", 390], ["en", 1280]]) {
  const tag = `[${lang} ${W}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: W, height: 860 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => { const src = fs.readFileSync("app/quranrevival.html", "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  const setSel = (id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel("surahSelect", "14"); await page.waitForTimeout(1500);
  await setSel("unitTypeSelect", "range"); await page.waitForTimeout(800);
  await setSel("rangeFromSelect", "25"); await page.waitForTimeout(300); await setSel("rangeToSelect", "33"); await page.waitForTimeout(800);
  await page.evaluate(() => { const t = document.getElementById("mushafToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction(() => document.querySelector(".hifz-page[data-mushaf-page]"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  const shownBm0 = await page.evaluate(() => [...document.querySelectorAll("#readBar button")].filter((b) => /🔖|★/.test(b.textContent) && b.getBoundingClientRect().width > 0).map((b) => b.id));
  // UPDATED IN PLACE (debt round, 11 Nov 2026; the Owner's J114 option B of 6 Nov, "ONE ⋮ beside the āyah", and 11 Nov "why two BM?"): the Mushaf bar no longer carries its own 🔖.
  // The bookmark is ONE tile of the bar's ⋮ sheet: with a range / whole-sūrah unit, the unit's bookmark (data-qm-unit-bookmark) and no second one. The checks below say so.
  const sheetBm = async () => { if (!(await page.evaluate(() => !!document.querySelector("#readQuickMenuSlot .quick-menu.open, #readQuickMenuSlot .quick-menu[data-open]") || (document.querySelector("#readQuickMenuSlot .quick-menu [data-qm-unit-bookmark], #readQuickMenuSlot .quick-menu [data-qm-bookmark]")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#readQuickMenuSlot .ayah-quick-btn"); await page.waitForTimeout(350); }
    return page.evaluate(() => [...document.querySelectorAll("#readQuickMenuSlot .quick-menu [data-qm-bookmark], #readQuickMenuSlot .quick-menu [data-qm-unit-bookmark]")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => ({ a: e.hasAttribute("data-qm-unit-bookmark") ? "unit" : "ayah", g: e.textContent.trim().slice(0, 1), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) }))); };
  check(`${tag} the Mushaf bar has no 🔖 of its own (POSITIVE CONTROL: the ⋮ is there)`, shownBm0.length === 0 && await page.evaluate(() => (document.querySelector("#readQuickMenuSlot .ayah-quick-btn")?.getBoundingClientRect().width ?? 0) > 0), JSON.stringify(shownBm0));
  const t0 = await sheetBm();
  check(`${tag} the ⋮ sheet has ONE bookmark tile (the unit's), at least 40px`, t0.length === 1 && t0[0].a === "unit" && t0[0].w >= 40 && t0[0].h >= 40, JSON.stringify(t0));
  await page.keyboard.press("Escape"); await page.waitForTimeout(250);
  for (let i = 0; i < 4; i++) { if (await page.evaluate(() => ["immersive-read", "fs-hide-readbar", "fs-hide-transport"].every((c) => document.body.classList.contains(c)))) break; await page.click("#hideChromeBtn"); await page.waitForTimeout(400); }
  const bare = await page.evaluate(() => ["immersive-read", "fs-hide-readbar", "fs-hide-transport"].every((c) => document.body.classList.contains(c)));
  check(`${tag} precondition: full screen's bare state`, bare);
  const bm = () => page.evaluate(() => {
    const b = document.getElementById("readBarBookmarkBtn"), bar = document.getElementById("readBar").getBoundingClientRect(), m = document.getElementById("readMeaningBtn").getBoundingClientRect();
    const r = b?.getBoundingClientRect(); const hit = r && r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
    return { shown: !!r && r.width > 0, w: Math.round(r?.width ?? 0), h: Math.round(r?.height ?? 0), tappable: !!hit && b.contains(hit), sameLine: !!r && Math.abs(r.top - m.top) < 4, beforeMeaning: !!r && r.right <= m.left + 1, inBar: !!r && r.left >= bar.left - 1 && r.right <= bar.right + 1, label: b?.getAttribute("aria-label") ?? "", glyph: b?.textContent.trim() };
  });
  check(`${tag} in bare full screen the bar still has no 🔖, and stays one line (≤ 44px tall)`, (await page.evaluate(() => [...document.querySelectorAll("#readBar button")].filter((x) => /🔖|★/.test(x.textContent) && x.getBoundingClientRect().width > 0).length)) === 0 && await page.evaluate(() => document.getElementById("readBar").getBoundingClientRect().height <= 44), String(await page.evaluate(() => document.getElementById("readBar").getBoundingClientRect().height)));
  // Leave full screen so the ⋮ is reachable, then bookmark through the unit tile: the popover names it, and the tile turns ★ once saved.
  for (let i = 0; i < 4 && (await page.evaluate(() => document.body.classList.contains("immersive-read"))); i++) { await page.click("#hideChromeBtn"); await page.waitForTimeout(500); }
  await sheetBm(); await page.click("#readQuickMenuSlot .quick-menu [data-qm-unit-bookmark]", { timeout: 4000 }).catch(() => {}); // a mutant that removes the tile must end in the named FAIL below, not a timeout crash (98L, 11 Nov 2026)
  await page.waitForSelector(".bm-popover-overlay", { timeout: 5000 }).catch(() => {});
  await page.fill("[data-bm-pop-name]", "From the Mushaf bar").catch(() => {});
  await page.click("[data-bm-pop-save]").catch(() => {});
  await page.waitForTimeout(900);
  const t1 = await sheetBm();
  check(`${tag} tapping the unit tile bookmarks the unit: the tile turns ★`, t1.length === 1 && t1[0].g === "★", JSON.stringify(t1));
  await page.keyboard.press("Escape"); await page.waitForTimeout(250);

  // PCF MSA J99 (the Owner ticked B): 📖 cycles Āyah → Meaning → Mushaf, so from the Mushaf it takes two taps to Meaning
  // (via the plain reading). Updated in place, reason recorded.
  for (let i = 0; i < 3 && !(await page.evaluate(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0)); i++) { await goReadOn(page); await page.waitForTimeout(1200); }
  await page.waitForFunction(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(700);
  // PCF MSA J110 A (the Owner ticked A, 2 Nov 2026): below 600px the switches are behind ONE "Show ▾" on 📖's line; it is
  // measured there, then opened so the switches themselves are checked as before. Updated in place, reason recorded.
  // RESOLVED (13 Nov 2026, the Owner: "Read on: 2 lines"; PR read-bar-steps): the bound below is now 106px. On a phone in Read on the four step buttons moved into the ⋮ menu, so the bar is TWO lines (104px) from 360px, which is
  // what this check's three red-by-name failures at 360-412px were waiting for. (320px stays three lines, 151px; this suite does not measure it.)
  // WAS RED BY NAME ON PURPOSE (98L, 11 Nov 2026): with a range unit this Read-on bar is THREE lines (151px) at 360, 390 and 412px, not the two it was made to be. Its content is 782px
  // wide (the sum of the controls 699px plus 13 gaps of 6.4px) against 2 x the bar's width: 656px at 360, 716px at 390, 760px at 412, so it is 126px, 66px and 22px short of two lines.
  // The widest parts: the unit chip 98px, "Show 3 ▾" 95px, "Read on" 65px, and ten 40px buttons. Left failing until the Owner chooses (see PR #1649).
  const barH0 = await page.evaluate(() => Math.round(document.getElementById("readBar").getBoundingClientRect().height)); // before the Show menu opens (it opens inside the bar)
  const showTop = await page.evaluate(() => { const b = document.querySelector("#readMeaningLayersSlot [data-ml-menu]"), r = b?.getBoundingClientRect(); return r && r.width > 0 ? Math.round(r.top) : null; });
  if (showTop !== null) { await page.click("#readMeaningLayersSlot [data-ml-menu]", { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(250); }
  const L = await page.evaluate(() => {
    const slot = document.getElementById("readMeaningLayersSlot"), bar = document.getElementById("readBar").getBoundingClientRect(), m = document.getElementById("readMeaningBtn").getBoundingClientRect();
    const labels = [...(slot?.querySelectorAll("label") ?? [])].map((l) => { const r = l.getBoundingClientRect(); return { t: l.textContent.trim(), on: l.querySelector("input").checked, top: Math.round(r.top), h: Math.round(r.height), whole: l.scrollWidth <= l.clientWidth + 1, inBar: r.left >= bar.left - 1 && r.right <= bar.right + 1 }; });
    // UPDATED IN PLACE (debt round, 11 Nov 2026): this measured the ABSOLUTE bottom of the bar (and of the switches' own block) from the page top, which was ~60px in Oct and is
    // ~230px now because the head row, the intention card and the Surah list sit above the Read bar. What the check is about is how much room the bar and its switches take,
    // so measure the bar's own height (the switches are on it, or behind its one "Show" button, never in a block of their own: inFlow === 0 is asserted beside it).
    const cover = Math.round(document.getElementById("readBar").getBoundingClientRect().height);
    return { labels, inFlow: document.querySelectorAll("#pageViewContainer [data-meaning-layer]").length, mTop: Math.round(m.top), cover, over: document.documentElement.scrollWidth - innerWidth };
  });
  L.cover = barH0;
  // PCF MSA J75 (the Owner, 22 Oct 2026: "For English, write only Eng"): below 480px the English switch reads "Eng".
  const want = lang === "bn" ? ["ইংরেজি", "বাংলা", "শব্দে শব্দে"] : [W < 480 ? "Eng" : "English", "Bangla", "WbW"];
  check(`${tag} the three switches are on the Read bar, none left in the flow, each whole and 36px tall: ${want.join(" / ")}`, L.inFlow === 0 && JSON.stringify(L.labels.map((l) => l.t)) === JSON.stringify(want) && L.labels.every((l) => l.whole && l.inBar && l.h >= 36), JSON.stringify(L));
  check(`${tag} ...on 📖's own line, so the bar and switches take at most 60px (one line) from 600px, and at most 106px (two lines: in Read on its four step buttons are in the ⋮ menu, the Owner 13 Nov) below it (137px before, 151px three lines)`, (showTop !== null ? W < 600 && Math.abs(showTop - L.mTop) < 4 : W >= 600 && L.labels.every((l) => Math.abs(l.top - L.mTop) < 4)) && L.cover <= (W < 600 ? 106 : 60), JSON.stringify({ cover: L.cover, showTop, tops: L.labels.map((l) => l.top), mTop: L.mTop }));
  check(`${tag} no sideways scroll`, L.over <= 0, String(L.over));
  // Switching Bangla off still works from the bar, and the bar keeps the switches.
  await page.click('#readMeaningLayersSlot [data-meaning-layer="bn"]', { timeout: 4000 }).catch(() => {}); // bounded: a mutant with no switches must end in counted FAILs, not a crash
  await page.waitForFunction(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0 && !document.querySelector("#pageViewContainer .ayah-translation-bn"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  const off = await page.evaluate(() => ({ bn: document.querySelectorAll("#pageViewContainer .ayah-translation-bn").length, box: document.querySelector('#readMeaningLayersSlot [data-meaning-layer="bn"]')?.checked, filled: (() => { const e = document.querySelector('#readMeaningLayersSlot [data-meaning-layer="bn"]'); return e ? getComputedStyle(e.parentElement).backgroundColor : null; })() }));
  check(`${tag} tapping Bangla turns it off: no Bangla in the flow, its pill outlined (white)`, off.bn === 0 && off.box === false && off.filled === "rgb(255, 255, 255)", JSON.stringify(off));
  await page.click("#readMeaningBtn"); await page.waitForTimeout(900);
  check(`${tag} back on the Mushaf, the switches leave the bar`, await page.evaluate(() => { const s = document.getElementById("readMeaningLayersSlot"); return !!s && s.hidden && s.getBoundingClientRect().width === 0; }));
  const bad = errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
  check(`${tag} no page errors`, bad.length === 0, bad.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Read bar 🔖 and Meaning switches (the Owner, 12 Oct 2026)${MUTATE ? ` [MUTATE=${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
