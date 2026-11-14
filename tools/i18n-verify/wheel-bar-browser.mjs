// The Owner, 14 Nov 2026 (v15.00 layout): ONE bar above the wheel, below the "40 Ways" heading, in two groups.
//   gold: Read (straight to the Mushaf) | Take an Approach | Choose a Unit      navy: Know Your Status | (i) Legend
// "Choose a Unit" is a button of the bar ONLY (it is no longer inside Take an Approach); the old bottom buttons and the Wheel / Legend /
// Unit drawers are gone from sight. This suite proves the order, the place, the size (>= 40px, one row, nothing cut), the colour groups,
// that each button does its own job, that the three panels hold the ORIGINAL controls (moved, working), and that nothing is offered twice.
//   --mutate=twice   the old bottom row (with a second "Choose a Unit") is shown again -> "offered once" fails by name
//   --mutate=readlist  Read opens the contents list instead of the Mushaf          -> "Read goes straight to the Mushaf" fails by name
// Run from the repository root with serve.js up:  node tools/i18n-verify/wheel-bar-browser.mjs [--lang=en|bn] [--mutate=twice|readlist]
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
const PAGE = "app/quranrevival.html";
const swap = (src, a, b) => { if (!src.includes(a)) throw new Error(`mutation anchor missing: ${a}`); return src.replace(a, b); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of arg("lang") ? [arg("lang")] : ["en", "bn"]) for (const [w, h] of [[320, 700], [390, 844], [820, 1100], [1280, 800]]) {
  const tag = `[${lang} ${w}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
  if (MUTATE) await ctx.route("**/app/quranrevival.html*", async (r) => {
    let src = fs.readFileSync(PAGE, "utf8");
    if (MUTATE === "twice") src = swap(src, '<div id="wheelIntroSettled" class="wheel-intro-settled" hidden>', '<div id="wheelIntroSettled" class="wheel-intro-settled">');
    if (MUTATE === "readlist") src = swap(src, 'mushafToggle.checked = true; mushafToggle.dispatchEvent(new Event("change")); openReadingScreen(); });', 'openReadContents(); });');
    await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src });
  });
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await P.waitForTimeout(1500);
  const geo = await P.evaluate(() => {
    const r = (e) => { const q = e.getBoundingClientRect(); return { l: q.left, r: q.right, t: q.top, b: q.bottom, w: q.width, h: q.height }; };
    const bar = document.getElementById("wheelBar"); if (!bar) return null;
    const btns = [...bar.querySelectorAll(".wheel-bar-btn")].map((b) => ({ id: b.id, text: b.textContent.trim(), dir: getComputedStyle(b).flexDirection, ...r(b), cut: b.scrollWidth > b.clientWidth + 1 }));
    const g1 = bar.querySelector(".wheel-bar-g1"), g2 = bar.querySelector(".wheel-bar-g2");
    const head = document.querySelector("h2.wheel-heading"), headBar = document.getElementById("wheelPopupTitleBar");
    const heading = [head, headBar].find((e) => e && e.getBoundingClientRect().height > 0);
    return { bar: r(bar), btns, g1bg: getComputedStyle(g1).backgroundColor, g2bg: getComputedStyle(g2).backgroundColor,
      headB: heading ? heading.getBoundingClientRect().bottom : null, wheelT: document.getElementById("wheelStageWrap").getBoundingClientRect().top,
      sw: document.documentElement.scrollWidth, legendTxt: document.getElementById("wbLegend").textContent.trim(), legendLabel: document.getElementById("wbLegend").getAttribute("aria-label") };
  });
  check(`${tag} the bar exists`, !!geo);
  if (!geo) { await ctx.close(); continue; }
  const ids = geo.btns.map((b) => b.id).join(",");
  check(`${tag} five buttons in order: Read, Take an Approach, Choose a Unit | Know Your Status, Legend`, ids === "wbRead,wbApproach,wbUnit,wbStatus,wbLegend", ids);
  if (lang === "en") check(`${tag} the words read Read | Take an Approach | Choose a Unit | Know Your Status | (icon only)`, geo.btns.slice(0, 4).map((b) => b.text).join("|") === "Read|Take an Approach|Choose a Unit|Know Your Status" && geo.legendTxt === "" && geo.legendLabel === "Legend", JSON.stringify([geo.btns.map((b) => b.text), geo.legendTxt, geo.legendLabel]));
  else check(`${tag} the words are in Bangla and the Legend is icon only`, geo.btns.slice(0, 4).every((b) => /[ঀ-৿]/.test(b.text)) && geo.legendTxt === "", JSON.stringify(geo.btns.map((b) => b.text)));
  check(`${tag} the bar sits below the heading and above the wheel`, geo.headB <= geo.bar.t + 1 && geo.bar.b <= geo.wheelT + 1, JSON.stringify([geo.headB, geo.bar.t, geo.bar.b, geo.wheelT]));
  check(`${tag} every button is at least 40px tall, whole, inside the screen, all five on ONE row`, geo.btns.every((b) => b.h >= 40 && !b.cut && b.l >= -0.5 && b.r <= w + 0.5) && Math.max(...geo.btns.map((b) => b.t)) - Math.min(...geo.btns.map((b) => b.t)) <= 6 && geo.sw <= w + 1, JSON.stringify(geo.btns.map((b) => [b.id, Math.round(b.w), Math.round(b.h), b.cut])));
  check(`${tag} two groups: the two colours differ`, geo.g1bg !== geo.g2bg, `${geo.g1bg} / ${geo.g2bg}`);
  check(`${tag} ${w < 581 ? "a phone shows the icon over the word" : "a tablet or computer shows the icon beside the word"}`, geo.btns.slice(0, 4).every((b) => b.dir === (w < 581 ? "column" : "row")), geo.btns.map((b) => b.dir).join());
  const once = await P.evaluate(() => {
    const vis = (e) => { const q = e.getBoundingClientRect(); const cs = getComputedStyle(e); return q.width > 0 && q.height > 0 && cs.visibility !== "hidden"; };
    const wording = [...document.querySelectorAll("button, [role=button]")].filter((e) => vis(e) && /^\s*Choose a Unit\s*▾?\s*$/.test(e.textContent) && !e.closest("#wheelBar")).length;
    return { wording, drawers: document.querySelectorAll("[data-wheel-drawer]").length, intro: vis(document.getElementById("wheelIntroSettled")), zab: !!document.querySelector("[data-zab-dock]") };
  });
  check(`${tag} MUTATION TARGET (twice): "Choose a Unit" is offered ONCE (only in the bar); no Wheel/Legend/Unit drawer buttons; the old bottom row is gone`, once.wording === 0 && once.drawers === 0 && !once.intro, JSON.stringify(once));
  check(`${tag} the 🧰 dock is still there`, once.zab);
  // panels: one at a time
  const open = (id) => P.evaluate((i) => document.getElementById(i).click(), id).then(() => P.waitForTimeout(350));
  const shown = () => P.evaluate(() => [...document.querySelectorAll("#wheelBar [data-wb-panel]")].filter((p) => p.getBoundingClientRect().height > 0).map((p) => p.dataset.wbPanel).join());
  await open("wbUnit");
  const u = await P.evaluate(() => { const v = (s) => { const e = document.querySelector(s); return !!e && e.getBoundingClientRect().height > 0; }; return { panel: v("#wbPanelUnit"), show: document.querySelectorAll("#wbPanelUnit [data-wheel-show]").length, showVis: v("#wheelShowSwitch"), type: v("#wheelUnitTypeSelect"), read: v("#wheelUnitReadBtn"), exp: document.getElementById("wbUnit").getAttribute("aria-expanded") }; });
  check(`${tag} Choose a Unit opens a panel holding the seven "what the wheel shows" buttons and the unit pickers`, u.panel && u.show === 7 && u.showVis && u.type && u.read && u.exp === "true", JSON.stringify(u));
  await P.evaluate(() => document.querySelector('#wbPanelUnit [data-wheel-show="juz"]').click()); await P.waitForTimeout(500);
  check(`${tag} the moved "Juz" button still works (it is pressed after a tap)`, await P.evaluate(() => document.querySelector('[data-wheel-show="juz"]').getAttribute("aria-pressed") === "true"));
  await open("wbStatus");
  check(`${tag} Know Your Status opens its own panel and closes the other (one at a time)`, (await shown()) === "status", await shown());
  const st = await P.evaluate(() => ({ kinds: [...document.querySelectorAll("#wbPanelStatus [data-wheel-kind]")].map((b) => b.dataset.wheelKind).join(), look: document.querySelectorAll("#wbPanelStatus [data-wheel-look]").length, card: !!document.getElementById("wbStatusCardBtn") }));
  check(`${tag} the status panel holds Approaches | Vocabulary | Difficulty Level, the wheel look and the full status card`, st.kinds === "approaches,vocab,marks" && st.look === 3 && st.card, JSON.stringify(st));
  await P.evaluate(() => document.querySelector('#wbPanelStatus [data-wheel-kind="vocab"]').click()); await P.waitForTimeout(700);
  check(`${tag} the moved Vocabulary button still switches the wheel`, await P.evaluate(() => document.getElementById("wheelStageWrap").classList.contains("wheel-vocab")));
  await open("wbLegend");
  check(`${tag} the Legend icon opens the legend panel with its content`, (await shown()) === "legend" && (await P.evaluate(() => document.getElementById("wheelLegendContainer").textContent.trim().length > 0)), await shown());
  await open("wbLegend");
  check(`${tag} tapping the open one again closes it`, (await shown()) === "", await shown());
  // Take an Approach
  await open("wbApproach");
  check(`${tag} Take an Approach lifts the veil (the same as the wheel's own centre button) and returns to the Approaches wheel even from Vocabulary`, await P.evaluate(() => !document.getElementById("wheelStageWrap").classList.contains("wheel-veiled") && !document.getElementById("wheelStageWrap").classList.contains("wheel-vocab")));
  // Read goes straight to the Mushaf
  await open("wbRead");
  const rd = await P.evaluate(() => ({ mushaf: document.getElementById("mushafToggle").checked, list: (() => { const m = document.getElementById("readContentsMount"); return !!m && !m.hidden; })(), landing: document.body.classList.contains("landing-view") }));
  check(`${tag} MUTATION TARGET (readlist): Read goes straight to the Mushaf (no contents list in between)`, rd.mushaf && !rd.list && !rd.landing, JSON.stringify(rd));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
console.log(`\n==== Wheel bar (v15.00 layout)${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
