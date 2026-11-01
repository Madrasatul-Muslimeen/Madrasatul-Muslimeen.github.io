// QR Lead audit 8, 1 Nov 2026 (Explore, PCF User Manual; PCF MSA J29): Explore is a fixed-height screen below 900px, and with
// large text the header, the palette rows and the docked tabs took the whole screen. Measured on main v13.09 with this suite's
// own probe: #exploreView was 0px tall at 320x640 200% and on every phone turned sideways at 150-200% (640x360, 740x360 bn,
// 844x390): no wheel, no list, nothing to tap; 390x844 at 200% left the Explore area 0px (en) / 94px (bn); sideways at
// ORDINARY text it was 42px. At the Surah level the steps were cut ("‹ Al-Fa…" at 320px even at 100%, "‹…" 44px at 200%).
// Now checkExploreFit() sets body.explore-tall only while the Explore area is really under 12rem (the page scrolls, the area
// keeps the screen's height less the tabs and still scrolls inside itself), .aa-nav-wrap gives the steps their own line only
// while their words are cut, and #explorePanel's sides stop at 24px. On a PC Explore is a window (J51) and nothing changes.
//   node tools/i18n-verify/qr-explore-large-text-browser.mjs [--mutate=NAME]   (serve.js on :8080, from the repo root)
//   no-watch  the watcher is not started              -> "the Explore area has room" FAILS on phones at 200% and sideways
//   no-css    body.explore-tall's page scroll removed  -> the same FAIL (the class is set, nothing scrolls for a finger)
//   no-cap    the area floored at 12rem, not 4rem      -> "the Explore area ends above the tabs" FAILS sideways at 150/200%
//   no-wrap   .aa-nav-wrap never set                   -> "no control's words are cut" FAILS at the Surah level
//   no-break  the steps never break inside a name      -> the same FAIL at 320x640 200%
//   no-pad    the 24px cap on the panel's sides gone   -> "the Explore panel's sides are never more than 24px" FAILS at 150/200%
//   no-seg    All / One Approach never stack           -> "no control's words are cut" FAILS at the Surah level at 150/200%
//   no-zab    the tabs not lifted above the Zab bar    -> "the docked tabs are not covered" FAILS at 768x1024 200% and 844x390
//   no-stack  Take ▸ never goes under the name         -> "no Approach name breaks inside a word" FAILS at 768x1024 200%
//   no-max    the Juz / Surahs / Hizb row not capped   -> "no control runs past the Explore view's sides" FAILS at 320x640 200%
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-watch": ['    if (typeof ResizeObserver === "function" && document.getElementById("exploreView")) watchExploreFit();\n', ""],
  "no-css": ["  body.explore-tall { height: auto; min-height: 100vh; min-height: 100dvh; overflow: visible; }\n", ""],
  "no-cap": ['body.style.setProperty("--explore-tall-h", Math.max(Math.round(4 * rem)', 'body.style.setProperty("--explore-tall-h", Math.max(Math.round(12 * rem)'],
  "no-wrap": ['b.scrollWidth > b.clientWidth + 1)) nav.classList.add("aa-nav-wrap");', 'b.scrollWidth > b.clientWidth + 1)) void 0;'],
  "no-break": ["max-width: 100%; white-space: normal; text-overflow: clip;", "max-width: 100%;"],
  "no-seg": ['b.scrollWidth > b.clientWidth + 1)) seg.classList.add("aa-seg-stack");', 'b.scrollWidth > b.clientWidth + 1)) void 0;'],
  "no-max": ["flex: 0 0 auto; margin: 0; max-width: 100%; }", "flex: 0 0 auto; margin: 0; }"],
  "no-zab": ["  @media (min-width: 768px) { body.zab-bar-on.explore-tall #dock, body.zab-bar-on.read-tall #dock { bottom: 2.75rem; } }\n", ""],
  "no-stack": ['if (broken) rows.classList.add("aa-rows-stack");', 'if (broken) void 0;'],
  "no-pad": ["  #explorePanel { padding-left: min(1.5rem, 24px); padding-right: min(1.5rem, 24px); }\n", ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SHOT_DIR = process.env.SHOT_DIR || "";
// The Explore view's height at ordinary text, measured on main v13.09 (before this round) and written by hand.
const PLAIN = { "en 320x640": 361, "en 390x844": 577, "bn 390x844": 573, "en 768x1024": 783, "bn 768x1024": 783, "en 1280x800": 551 };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function boot(lang, w, h, size) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [from, to] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const body = await res.text();
      if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
      r.fulfill({ response: res, body: body.replace(from, to) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelector("#wheelContainer svg"), null, { timeout: 30000 });
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((e) => e.remove()));
  await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, size); await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById("tabExploreBtn").click());
  await page.waitForFunction(() => document.querySelector("#exploreWheelContainer .wheel-seg"), null, { timeout: 15000 });
  await page.waitForTimeout(700);
  return { ctx, page };
}
const toSurah2 = async (page) => {
  await page.evaluate(() => { const s = [...document.querySelectorAll("#exploreWheelContainer .wheel-seg")].find((x) => x.dataset.key === "2" && x.dataset.ringKind === "surah"); s.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  await page.waitForFunction(() => { const n = document.getElementById("exploreNavBar"); return n && !n.hidden && n.querySelector('[data-aa="next-surah"]'); }, null, { timeout: 15000 });
  await page.waitForTimeout(600);
};
const measure = (page) => page.evaluate(() => {
  const R = (e) => e.getBoundingClientRect(), dock = document.getElementById("dock"), ev = document.getElementById("exploreView"), es = document.getElementById("exploreScroll");
  const html = getComputedStyle(document.documentElement).overflowY, bodyO = getComputedStyle(document.body).overflowY;
  const userScroll = /auto|scroll/.test(html) || (html === "visible" && !/hidden|clip/.test(bodyO));
  const dockShown = dock.getClientRects().length > 0 && R(dock).height > 0;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const name = (b) => (b.id || b.dataset.aa || b.getAttribute("aria-label") || b.textContent).trim().slice(0, 20);
  const ctl = [...ev.querySelectorAll("#exploreBar button, #exploreCtlBar button, #exploreListCollapseBtn, .aa-take")].filter((b) => b.getClientRects().length && R(b).width > 0);
  const shown = ctl.filter((b, i) => !b.matches(".aa-take") || ctl.findIndex((x) => x.matches(".aa-take")) === i);
  document.scrollingElement.scrollTop = 0; es.scrollTop = 0;
  const unreachable = shown.filter((b) => {
    b.scrollIntoView({ block: "center" });
    if (!userScroll) document.scrollingElement.scrollTop = 0;
    const r = R(b), x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return true;
    if (dockShown && y > R(dock).top) return true;
    const at = document.elementFromPoint(x, y); return !at || !b.contains(at);
  }).map(name);
  document.scrollingElement.scrollTop = 0; es.scrollTop = 0;
  const all = [...ev.querySelectorAll("button")].filter((b) => b.getClientRects().length && R(b).width > 0 && b.textContent.trim());
  const cut = all.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => name(b) + " " + b.scrollWidth + "/" + b.clientWidth);
  const evR = R(ev), outside = all.filter((b) => R(b).right > evR.right + 1 || R(b).left < evR.left - 1).map(name);
  const pcs = getComputedStyle(document.getElementById("explorePanel")), padL = parseFloat(pcs.paddingLeft), padR = parseFloat(pcs.paddingRight);
  const steps = [...ev.querySelectorAll("#exploreNavBar .aa-pn button")].map((b) => Math.round(b.clientWidth));
  const names = [...ev.querySelectorAll(".aa-nm")].filter((n) => n.getClientRects().length);
  const brokenNames = names.filter((n) => { const was = n.style.overflowWrap; n.style.overflowWrap = "normal"; const b = n.scrollWidth > n.clientWidth + 1; n.style.overflowWrap = was; return b; }).map((n) => n.firstChild.textContent.slice(0, 20));
  if (userScroll) es.scrollIntoView({ block: "start" });
  const s = R(es), d = R(dock);
  // The tabs are a finger's way out of Explore: the one under the finger must be the tab itself, not the Zab bar on top of it.
  const tab = document.getElementById("tabExploreBtn"), tr = R(tab), atTab = dockShown ? document.elementFromPoint(tr.left + tr.width / 2, Math.min(tr.bottom - 4, innerHeight - 1)) : null;
  const tabCovered = dockShown && !(atTab && tab.contains(atTab));
  const r = { userScroll, tall: document.body.classList.contains("explore-tall"), popup: getComputedStyle(ev).position === "fixed",
    evH: Math.round(evR.height), room: Math.round((dockShown ? Math.min(s.bottom, d.top) : Math.min(s.bottom, innerHeight)) - Math.max(s.top, 0)),
    esBottom: Math.round(s.bottom), dockTop: dockShown ? Math.round(d.top) : innerHeight, want: Math.round(Math.min(12 * rem, innerHeight - (dockShown ? dock.offsetHeight : 0) - 8)),
    rem, unreachable, cut, outside, steps, padL, padR, names: names.length, brokenNames, tabCovered, sideways: document.scrollingElement.scrollWidth > innerWidth };
  document.scrollingElement.scrollTop = 0; return r;
});

const CASES = [[320, 640, "en"], [360, 740, "bn"], [390, 844, "en"], [390, 844, "bn"], [414, 896, "en"], [768, 1024, "en"], [768, 1024, "bn"], [1280, 800, "en"], [1440, 900, "bn"], [640, 360, "en"], [740, 360, "bn"], [844, 390, "en"]];
for (const [w, h, lang] of CASES) {
  for (const size of ["100%", "150%", "200%"]) {
    const t = `${lang} ${w}x${h} ${size}`, { ctx, page } = await boot(lang, w, h, size);
    for (const level of ["Whole Quran", "Surah 2"]) {
      if (level === "Surah 2") await toSurah2(page);
      const m = await measure(page), tl = `${t} ${level}`;
      // On a PC Explore is a window filling the space between the menu row and the tabs (J51); it scrolls inside itself.
      if (w < 900) check(`${tl}: the Explore area has room (${m.room}px, wants ${m.want})`, m.room >= m.want - 2 && m.room > 0, JSON.stringify({ evH: m.evH, tall: m.tall }));
      check(`${tl}: the Explore area ends above the tabs (it scrolls inside itself, so a hidden end could never be reached)`, m.popup || m.esBottom <= m.dockTop + 1, `${m.esBottom} > ${m.dockTop}`);
      check(`${tl}: every Explore control can be reached`, m.unreachable.length === 0, m.unreachable.join(", "));
      check(`${tl}: no control's words are cut`, m.cut.length === 0, m.cut.join(", "));
      check(`${tl}: no control runs past the Explore view's sides`, m.outside.length === 0 && !m.sideways, m.outside.join(", "));
      if (!m.popup) check(`${tl}: the docked tabs are not covered (the Zab bar from 768px)`, !m.tabCovered);
      if (level === "Surah 2") check(`${tl}: no Approach name breaks inside a word (${m.names} rows)`, m.names > 0 && m.brokenNames.length === 0, m.brokenNames.join(", "));
      if (level === "Surah 2") check(`${tl}: both steps are on screen`, m.steps.length === 2 && m.steps.every((x) => x >= 44), JSON.stringify(m.steps));
      check(`${tl}: the Explore panel's sides are never more than 24px (${m.padL}/${m.padR})`, m.padL <= 24.5 && m.padR <= 24.5);
      if (w >= 900) check(`${tl}: on a PC Explore stays a window and the page never scrolls`, m.popup && !m.tall && !m.userScroll);
      const k = `${lang} ${w}x${h}`;
      if (size === "100%" && level === "Whole Quran" && PLAIN[k]) check(`${tl}: at ordinary text nothing moves (Explore ${m.evH}px, was ${PLAIN[k]})`, !m.tall && Math.abs(m.evH - PLAIN[k]) <= 1);
      if (SHOT_DIR) { await page.evaluate(() => { if (document.body.classList.contains("explore-tall")) document.getElementById("exploreScroll").scrollIntoView({ block: "start" }); }); await page.screenshot({ path: `${SHOT_DIR}/explore-${lang}-${w}x${h}-${size.replace("%", "")}-${level === "Surah 2" ? "s2" : "q"}.png` }); await page.evaluate(() => { document.scrollingElement.scrollTop = 0; }); }
    }
    if (w === 640 && size === "200%") {
      // Explore's own full screen hides the header and the tabs; the area then has the whole screen less its bar.
      await page.evaluate(() => document.getElementById("exploreFullscreenBtn").click()); await page.waitForTimeout(500);
      const m = await measure(page);
      check(`${t}: in Explore's full screen the area has room (${m.room}px)`, m.room >= m.want - 2 && m.room > 0);
      await page.evaluate(() => document.getElementById("exploreFullscreenBtn").click()); await page.waitForTimeout(300);
    }
    if (size === "200%" && w < 900) {
      await page.evaluate(() => document.getElementById("tabReadBtn").click()); await page.waitForTimeout(700);
      check(`${t}: leaving Explore clears explore-tall`, !(await page.evaluate(() => document.body.classList.contains("explore-tall"))));
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
