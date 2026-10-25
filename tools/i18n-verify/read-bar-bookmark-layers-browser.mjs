// The Owner, 12 Oct 2026 (two phone screenshots, full screen):
//   "Move those buttons up. Save space" -- the Meaning view's English / Bangla / WbW switches sit on the Read bar's
//   own line, not on a sticky line of their own;
//   "Add bookmark button on the top of the Mushaf page" -- 🔖 on the Mushaf bar, beside 📖 and ⤢, kept in the bare
//   full-screen state, bookmarking what the ⋯ menu's 🔖 bookmarks.
// Measured before (main, v10.26, 400px bare full screen): the bar and the switches covered the top 137px; after: 55.
// Run from the repository root, with serve.js on :8080. Mutations (--mutate=NAME) must each FAIL:
//   inflow    the switches drawn back inside the flow -> "on the bar" fails
//   nobm      the bar 🔖 never shown                  -> the 🔖 checks fail
//   fsbm      the bare full-screen rule hides the 🔖   -> "kept in bare full screen" fails
//   twobm     ⋯'s 🔖 stays beside the bar's one       -> "on the bar once" fails at 1280
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  inflow: ['const layersSlot = document.getElementById("readMeaningLayersSlot");\n        if (layersSlot) {', 'const layersSlot = null;\n        if (layersSlot) {'],
  nobm: ["readBarBookmarkBtn.hidden = !mushafToggle.checked;", "readBarBookmarkBtn.hidden = true;"],
  twobm: ["#readBar.bar-bm-on #readBookmarkBtn { display: none !important; }", "#readBar.bar-bm-on #readBookmarkBtn { }"],
  fsbm: [":not(#hideChromeBtn):not(#readMeaningBtn):not(#readBarBookmarkBtn) { display: none; }", ":not(#hideChromeBtn):not(#readMeaningBtn) { display: none; }"],
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
  check(`${tag} before full screen too, 🔖 is on the Mushaf bar once`, JSON.stringify(shownBm0) === '["readBarBookmarkBtn"]', JSON.stringify(shownBm0));
  for (let i = 0; i < 4; i++) { if (await page.evaluate(() => ["immersive-read", "fs-hide-readbar", "fs-hide-transport"].every((c) => document.body.classList.contains(c)))) break; await page.click("#hideChromeBtn"); await page.waitForTimeout(400); }
  const bare = await page.evaluate(() => ["immersive-read", "fs-hide-readbar", "fs-hide-transport"].every((c) => document.body.classList.contains(c)));
  check(`${tag} precondition: full screen's bare state`, bare);
  const bm = () => page.evaluate(() => {
    const b = document.getElementById("readBarBookmarkBtn"), bar = document.getElementById("readBar").getBoundingClientRect(), m = document.getElementById("readMeaningBtn").getBoundingClientRect();
    const r = b?.getBoundingClientRect(); const hit = r && r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
    return { shown: !!r && r.width > 0, w: Math.round(r?.width ?? 0), h: Math.round(r?.height ?? 0), tappable: !!hit && b.contains(hit), sameLine: !!r && Math.abs(r.top - m.top) < 4, beforeMeaning: !!r && r.right <= m.left + 1, inBar: !!r && r.left >= bar.left - 1 && r.right <= bar.right + 1, label: b?.getAttribute("aria-label") ?? "", glyph: b?.textContent.trim() };
  });
  const b0 = await bm();
  check(`${tag} 🔖 on the Mushaf bar in bare full screen: 36px+, tappable, beside 📖 on its line, inside the bar`, b0.shown && b0.w >= 36 && b0.h >= 36 && b0.tappable && b0.sameLine && b0.beforeMeaning && b0.inBar, JSON.stringify(b0));
  const shownBm = await page.evaluate(() => [...document.querySelectorAll("#readBar button")].filter((b) => /🔖|★/.test(b.textContent) && b.getBoundingClientRect().width > 0).map((b) => b.id));
  check(`${tag} 🔖 is on the bar once (from 900px ⋯'s copy, on the same bar, steps aside; below 900px it stays inside the ⋯ panel)`, JSON.stringify(shownBm) === '["readBarBookmarkBtn"]', JSON.stringify(shownBm));
  check(`${tag} the Mushaf bar stays one line (≤ 44px tall)`, await page.evaluate(() => document.getElementById("readBar").getBoundingClientRect().height <= 44), String(await page.evaluate(() => document.getElementById("readBar").getBoundingClientRect().height)));
  // The same bookmark as ⋯'s 🔖: tapping it toggles the unit's bookmark (★ once saved).
  await page.click("#readBarBookmarkBtn");
  await page.waitForSelector(".bm-popover-overlay", { timeout: 5000 }).catch(() => {});
  await page.fill("[data-bm-pop-name]", "From the Mushaf bar").catch(() => {});
  await page.click("[data-bm-pop-save]").catch(() => {});
  await page.waitForTimeout(900);
  const b1 = await bm(), viaTools = await page.evaluate(() => document.getElementById("readBookmarkBtn")?.textContent.trim());
  check(`${tag} tapping 🔖 bookmarks the unit: it turns ★ and the ⋯ menu's 🔖 agrees`, b1.glyph === "★" && viaTools === "★", JSON.stringify({ b1: b1.glyph, viaTools }));

  // PCF MSA J99 (the Owner ticked B): 📖 cycles Āyah → Meaning → Mushaf, so from the Mushaf it takes two taps to Meaning
  // (via the plain reading). Updated in place, reason recorded.
  for (let i = 0; i < 3 && !(await page.evaluate(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0)); i++) { await page.click("#readMeaningBtn"); await page.waitForTimeout(1200); }
  await page.waitForFunction(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(700);
  const L = await page.evaluate(() => {
    const slot = document.getElementById("readMeaningLayersSlot"), bar = document.getElementById("readBar").getBoundingClientRect(), m = document.getElementById("readMeaningBtn").getBoundingClientRect();
    const labels = [...(slot?.querySelectorAll("label") ?? [])].map((l) => { const r = l.getBoundingClientRect(); return { t: l.textContent.trim(), on: l.querySelector("input").checked, top: Math.round(r.top), h: Math.round(r.height), whole: l.scrollWidth <= l.clientWidth + 1, inBar: r.left >= bar.left - 1 && r.right <= bar.right + 1 }; });
    const cover = Math.round(Math.max(...[document.getElementById("readBar"), document.querySelector("#pageViewContainer [data-meaning-layer]")?.closest("div")].filter(Boolean).map((e) => e.getBoundingClientRect().bottom)));
    return { labels, inFlow: document.querySelectorAll("#pageViewContainer [data-meaning-layer]").length, mTop: Math.round(m.top), cover, over: document.documentElement.scrollWidth - innerWidth };
  });
  // PCF MSA J75 (the Owner, 22 Oct 2026: "For English, write only Eng"): below 480px the English switch reads "Eng".
  const want = lang === "bn" ? ["ইংরেজি", "বাংলা", "শব্দে শব্দে"] : [W < 480 ? "Eng" : "English", "Bangla", "WbW"];
  check(`${tag} the three switches are on the Read bar, none left in the flow, each whole and 36px tall: ${want.join(" / ")}`, L.inFlow === 0 && JSON.stringify(L.labels.map((l) => l.t)) === JSON.stringify(want) && L.labels.every((l) => l.whole && l.inBar && l.h >= 36), JSON.stringify(L));
  check(`${tag} ...on 📖's own line, so the bar and switches cover at most 60px (137px before)`, L.labels.every((l) => Math.abs(l.top - L.mTop) < 4) && L.cover <= 60, JSON.stringify({ cover: L.cover, tops: L.labels.map((l) => l.top), mTop: L.mTop }));
  check(`${tag} no sideways scroll`, L.over <= 0, String(L.over));
  // Switching Bangla off still works from the bar, and the bar keeps the switches.
  await page.click('#readMeaningLayersSlot [data-meaning-layer="bn"]');
  await page.waitForFunction(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0 && !document.querySelector("#pageViewContainer .ayah-translation-bn"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  const off = await page.evaluate(() => ({ bn: document.querySelectorAll("#pageViewContainer .ayah-translation-bn").length, box: document.querySelector('#readMeaningLayersSlot [data-meaning-layer="bn"]')?.checked, filled: getComputedStyle(document.querySelector('#readMeaningLayersSlot [data-meaning-layer="bn"]').parentElement).backgroundColor }));
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
