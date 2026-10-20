// PCF MSA J51 (the Owner, 20 Oct 2026, screenshot of Explore on Al-Baqarah on a PC): "Organise the options in a single
// bar (this is from PC) so that Wheel can be enlarged. Also enable the screen open in this size always."
// On a PC: Back + the sūrah steps, the trail, All / One Approach and Track the Status sit in ONE bar above the whole
// panel; the Explore window opens filling the space between the menu row and the dock at every start (never from a
// stored size); the Quran wheel takes the largest size that fits under the bar. On a phone nothing moves.
// Run from the repository root with serve.js on :8080. Every mutation (--mutate=NAME) must make the suite exit 1:
//   nomove    the bar stays in the wheel's column on a PC            -> "one line, above the whole panel" fails
//   nofill    the window opens at its old default / stored size       -> "opens filling the screen" fails
//   nofit     the wheel keeps its stored / default 360px size          -> "the wheel fills the room" fails
//   qcrshow   the bar stays on screen in the QCR tab                    -> "goes away with the Quran panel" fails
//   phone     the bar is moved above the panel on a phone too           -> "phone: unchanged, in the wheel's column" fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const HTML = "app/quranrevival.html";
const MUT = {
  nomove: [["      if (window.matchMedia(\"(min-width: 900px)\").matches) { if (exploreCtlBarEl.parentElement !== scroller) scroller.prepend(exploreCtlBarEl); }", "      if (false) {}"]],
  nofill: [["      fill: true, // PCF MSA J51: on a PC Explore always opens", "      fill: false, // PCF MSA J51: on a PC Explore always opens"]],
  nofit: [["      if (exploreWheelDragged || !window.matchMedia(\"(min-width: 900px)\").matches || exploreView.hidden) return;", "      return;"]],
  qcrshow: [["    #exploreScroll:has(> #explorePanel[hidden]) > .explore-ctl-bar { display: none; }", ""]],
  phone: [["      if (window.matchMedia(\"(min-width: 900px)\").matches) { if (exploreCtlBarEl.parentElement !== scroller) scroller.prepend(exploreCtlBarEl); }", "      if (true) { if (exploreCtlBarEl.parentElement !== scroller) scroller.prepend(exploreCtlBarEl); }"]],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

// An earlier visit's small window and wheel, kept in this browser: both must be ignored on a PC.
const OLD = { mm_explore_popup_geometry: JSON.stringify({ left: 300, top: 160, width: 700, height: 500 }), mm_wheel_size_exploreQuran: "300" };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function start(lang, width, height) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.addInitScript((kv) => { for (const [k, v] of Object.entries(kv)) try { localStorage.setItem(k, v); } catch {} }, OLD);
  if (MUTATE) {
    let body = fs.readFileSync(HTML, "utf8");
    for (const [a, b] of MUT[MUTATE]) { if (!body.includes(a)) throw new Error(`mutation anchor missing: ${a.slice(0, 60)}`); body = body.split(a).join(b); }
    await ctx.route(`**/${HTML}*`, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.click("#tabExploreBtn");
  await page.waitForFunction(() => !!document.querySelector("#exploreWheelContainer svg"), null, { timeout: 15000 });
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((el) => el.remove()));
  await page.evaluate(() => { const s = [...document.querySelectorAll("#exploreWheelContainer .wheel-seg")].find((x) => x.dataset.key === "2" && (!x.dataset.ringKind || x.dataset.ringKind === "surah")); s?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  await page.waitForFunction(() => !!document.querySelector("#exploreModeRow button"), null, { timeout: 15000 });
  await page.click('#exploreModeRow [data-v="one"]');
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}
const measure = (page) => page.evaluate(() => {
  const box = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { t: b.top, b: b.bottom, l: b.left, r: b.right, w: b.width, h: b.height }; };
  const bar = document.getElementById("exploreCtlBar");
  const parts = ["#exploreNavBar", ".explore-head-row", "#exploreModeRow", "#exploreApproachRow"].map((s) => box(document.querySelector(s))).filter((b) => b && b.h > 0);
  const nav = document.querySelector(".app-nav")?.getBoundingClientRect();
  const dock = document.getElementById("dock")?.getBoundingClientRect();
  return {
    parent: bar?.parentElement?.id || bar?.parentElement?.className || null, parts: parts.length,
    oneLine: parts.length === 4 && Math.max(...parts.map((p) => p.t)) - Math.min(...parts.map((p) => p.t)) < 16,
    barAbovePanel: !!bar && box(bar).b <= document.getElementById("explorePanel").getBoundingClientRect().top + 1,
    win: box(document.getElementById("exploreView")), navBottom: nav?.bottom ?? 0, dockTop: dock?.top ?? innerHeight,
    wheel: box(document.getElementById("exploreWheelResizeWrap")), scroll: box(document.getElementById("exploreScroll")),
    col: Math.round(document.querySelector("#explorePanel .wheel-col").getBoundingClientRect().width),
    navBtns: [...document.querySelectorAll("#exploreNavBar button")].map((b) => ({ h: b.getBoundingClientRect().height, cut: b.scrollWidth > b.clientWidth + 1 })),
    over: document.documentElement.scrollWidth - innerWidth,
  };
});

for (const [lang, width, height] of [["en", 1440, 900], ["en", 1920, 1080], ["bn", 1440, 900], ["en", 390, 844], ["bn", 390, 844]]) {
  const tag = `${lang}/${width}`;
  const pc = width >= 900;
  console.log(`\n=== ${tag} ===`);
  const { ctx, page, errors } = await start(lang, width, height);
  const m = await measure(page);
  if (pc) {
    check(`${tag}: Back, the sūrah steps, the trail, All / One Approach and Track the Status are ONE line, above the whole panel`, m.parent === "exploreScroll" && m.oneLine && m.barAbovePanel, JSON.stringify({ parent: m.parent, parts: m.parts, oneLine: m.oneLine, above: m.barAbovePanel }));
    check(`${tag}: the window opens filling the screen between the menu row and the dock (an old stored 700x500 is ignored)`,
      !!m.win && m.win.w >= width * 0.95 && Math.abs(m.win.t - (m.navBottom + 8)) < 3 && m.win.b <= m.dockTop + 1 && m.win.b >= m.dockTop - 20, JSON.stringify({ win: m.win, navBottom: m.navBottom, dockTop: m.dockTop }));
    check(`${tag}: the wheel fills the room under the bar (an old stored 300px is ignored): bottom within 12px of the scroll area's, or as wide as its column`,
      !!m.wheel && m.wheel.b <= m.scroll.b + 1 && (m.scroll.b - m.wheel.b <= 12 || m.wheel.w >= m.col - 8) && m.wheel.w > 360, JSON.stringify({ wheel: m.wheel, scroll: m.scroll, col: m.col }));
    // Another Explore tab: the bar goes with the Quran panel, and comes back with it.
    await page.click("#explorePaletteQcrBtn"); await page.waitForTimeout(700);
    const q = await page.evaluate(() => document.getElementById("exploreCtlBar").getBoundingClientRect().height);
    await page.click("#explorePaletteQuranBtn"); await page.waitForTimeout(900);
    const back = await page.evaluate(() => document.getElementById("exploreCtlBar").getBoundingClientRect().height);
    check(`${tag}: the bar goes away in the QCR tab and comes back in Quran`, q === 0 && back > 0, JSON.stringify({ q, back }));
  } else {
    check(`${tag}: phone: unchanged, the controls stay in the wheel's column, stacked`, typeof m.parent === "string" && m.parent.includes("wheel-col") && !m.oneLine, JSON.stringify({ parent: m.parent, oneLine: m.oneLine }));
  }
  check(`${tag}: the Back / sūrah buttons are 40px+ and nothing in them is cut`, m.navBtns.length === 3 && m.navBtns.every((b) => b.h >= 40 && !b.cut), JSON.stringify(m.navBtns));
  // Each control still works: Next sūrah opens Āl ʿImrān.
  await page.click('[data-aa="next-surah"]'); await page.waitForTimeout(900);
  const crumb = await page.evaluate(() => document.querySelector("#exploreBreadcrumb .explore-crumb.active")?.textContent.trim() ?? "");
  check(`${tag}: Next sūrah still works from the bar (Āl ʿImrān)`, /Imra|ইমরান|Āl|আল/.test(crumb), crumb);
  check(`${tag}: no sideways scroll`, m.over <= 0, String(m.over));
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
console.log(`\n==== Explore: one bar on a PC (J51)${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
