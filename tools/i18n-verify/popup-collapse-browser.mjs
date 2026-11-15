// PCF MSA J140 (15 Nov 2026) -- every pop-up: a ✕, a double-click on its top bar collapses it to the top left (as wide as the
// 3-pane layout's left pane), a click on another control collapses it and the clicked thing opens in front.
// Run from the repository root with `node serve.js` running:  node tools/i18n-verify/popup-collapse-browser.mjs [--mutate=NAME]
// Every check is proven by its own mutation (--mutate=NAME must make the named check FAIL):
//   noclose    Learn next loses its ✕                               -> "a ✕ at least 40px"
//   nodbl      the double-click does nothing                        -> "double-click collapses ..." and the dependants
//   badwidth   the bar is half the screen, not 4/13                 -> "the 3-pane left-pane width"
//   norestore  a double-click on the bar restores nothing           -> "second double-click restores the same rect and scroll"
//   nostack    the bars sit side by side, not stacked               -> "two collapsed pop-ups stack"
//   nonav      the top nav no longer collapses a pop-up             -> "clicking Modules"
//   notab      the bottom tabs no longer collapse a pop-up          -> "clicking the bottom tab Explore"
//   inside     a click inside the pop-up collapses it               -> "a click inside the pop-up does not collapse it"
//   menuback   the open nav menu is back behind pop-ups (z-index)   -> "an open nav menu is on top of an open pop-up"
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MIN = "app/js/minimise.js", QR = "app/quranrevival.html", CSS = "app/css/shell.css";
const MUT = {
  noclose: [[QR, [['class="ln-close" data-ln-back', 'class="ln-closex" data-ln-back']]]],
  nodbl: [[MIN, [["if (bar && bar.contains(el)) {", "if (false) {"]]]],
  badwidth: [[MIN, [["export const COLLAPSED_PANE_FRACTION = 4 / 13;", "export const COLLAPSED_PANE_FRACTION = 1 / 2;"]]]],
  norestore: [[MIN, [['bar.addEventListener("dblclick", (e) => { if (!e.target.closest("button")) restoreWindow(target); });', ""]]]],
  nostack: [[MIN, [["flex-direction: column; gap: 2px; width: calc", "flex-direction: row; gap: 2px; width: calc"]]]],
  nonav: [[MIN, [["#topNav summary, ", ""]]]],
  notab: [[MIN, [["#tabRow button, ", ""]]]],
  inside: [[MIN, [["closest(CONTROLS) : null;\n    if (!b) return;", 'closest(CONTROLS + ", #learnNextSheet button, #learnNextSheet h2") : null;\n    if (!b) return;'], ["root !== inside && !root.contains(inside)", "true"]]]],
  nofull: [[MIN, [["e.stopPropagation(); toggleFull(root); });", "e.stopPropagation(); });"]]]],      // -> "⛶ fills the viewport"
  nodrag: [[MIN, [['startDrag(e, "move", ctx());', ""]]]],                                          // -> "a drag by the title bar moves the window"
  noresize: [[MIN, [["e.stopPropagation(); startDrag(e, h, ctx());", "e.stopPropagation();"]]]],     // -> "the n/s/e/w/ne/nw/se/sw handle changes the size"
  menuback: [[CSS, [[".nav-cat[open] > .nav-cat-links { z-index: 1450; }", ".nav-cat[open] > .nav-cat-links { z-index: 100; }"]]]],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch();

const sheetState = (page) => page.evaluate(() => {
  const s = document.getElementById("learnNextSheet");
  if (!s) return null;
  const r = s.getBoundingClientRect(), sc = s.querySelector("[data-ln-scroll]");
  return { shown: !s.hidden && s.getClientRects().length > 0, x: r.x, y: r.y, w: r.width, h: r.height, scroll: sc ? sc.scrollTop : -1 };
});
const barInfo = (page, i = 0) => page.evaluate((i) => {
  const b = document.querySelectorAll("#mmColStack .mm-col-bar")[i];
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom };
}, i);
const count = (page) => page.evaluate(() => document.querySelectorAll("#mmColStack .mm-col-bar").length);
const dbl = (page, sel) => page.evaluate((sel) => { const el = document.querySelector(sel); el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, view: window })); }, sel);
const near = (a, b, e = 1.5) => Math.abs(a - b) <= e;

async function openSheet(page) {
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(400);
  await page.evaluate(() => document.getElementById("tabVocabularyBtn")?.click());
  await page.waitForFunction(() => { const s = document.getElementById("learnNextSheet"); return s && !s.hidden && s.querySelectorAll(".ln-row").length > 0; }, null, { timeout: 15000 }).catch(() => {});
}

for (const [lang, width, height] of [["en", 1280, 900], ["bn", 1280, 900], ["en", 768, 900], ["bn", 768, 900], ["en", 390, 844], ["bn", 390, 844], ["en", 320, 640], ["bn", 320, 640]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== popup collapse ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    for (const [file, pairs] of MUT[MUTATE]) {
      await ctx.route(`**/${file}*`, async (r) => {
        let src = fs.readFileSync(file, "utf8");
        for (const [a, b] of pairs) { if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); src = src.split(a).join(b); }
        await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html; charset=utf-8", body: src });
      });
    }
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(500);
  await openSheet(page);
  const s0 = await sheetState(page);
  check(`${tag} Learn next is open (positive control)`, !!s0?.shown, JSON.stringify(s0));

  // 1. ✕
  const x = await page.evaluate(() => { const b = document.querySelector("#learnNextSheet .ln-close"); if (!b) return null; const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, label: b.getAttribute("aria-label"), right: r.right, vw: innerWidth }; });
  check(`${tag} Learn next has a ✕ at least 40px, top right, with a translated label`, !!x && x.w >= 40 && x.h >= 40 && x.right > x.vw - 120 && !!x.label && (lang === "en" ? x.label === "Close" : x.label !== "Close"), JSON.stringify(x));
  if (width === 1280 || width === 390) await page.screenshot({ path: `/tmp/popup-collapse-open-${lang}-${width}.png` });

  // scroll the list so a restore can be compared
  await page.evaluate(() => { const sc = document.querySelector("#learnNextSheet [data-ln-scroll]"); if (sc) sc.scrollTop = 240; });
  const before = await sheetState(page);

  // J140 part 2: ⛶ full screen, drag, eight handles, reachability
  await page.waitForTimeout(300);
  const rectOf = () => page.evaluate(() => { const r = document.getElementById("learnNextSheet").getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const hit = await page.evaluate(() => ["mm-full-btn", "mm-min-btn:not(.mm-full-btn)", "ln-close"].map((c) => { const b = document.querySelector("#learnNextSheet ." + c); if (!b) return false; const r = b.getBoundingClientRect(); const h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return h === b || b.contains(h); }));
  check(`${tag} ⛶, – and ✕ are each reachable (elementFromPoint at the centre)`, hit.every(Boolean), JSON.stringify(hit));
  const fb = await page.evaluate(() => { const b = document.querySelector("#learnNextSheet .mm-full-btn"); if (!b) return null; const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, label: b.getAttribute("aria-label") }; });
  check(`${tag} ⛶ is at least 40px with a translated label`, !!fb && fb.w >= 40 && fb.h >= 40 && (lang === "en" ? fb.label === "Full screen" : fb.label !== "Full screen"), JSON.stringify(fb));
  const r0 = await rectOf();
  await page.click("#learnNextSheet .mm-full-btn");
  const rf = await rectOf();
  check(`${tag} ⛶ fills the viewport`, near(rf.x, 0) && near(rf.y, 0) && near(rf.w, width) && near(rf.h, height), JSON.stringify(rf));
  await page.click("#learnNextSheet .mm-full-btn");
  const rr = await rectOf();
  check(`${tag} pressing ⛶ again restores the same rect`, near(rr.x, r0.x) && near(rr.y, r0.y) && near(rr.w, r0.w) && near(rr.h, r0.h), JSON.stringify({ r0, rr }));
  if (width > 640) {
    await page.evaluate(() => { const s = document.getElementById("learnNextSheet"); Object.assign(s.style, { left: "300px", top: "120px", width: "500px", height: "400px" }); });
    const hd = await page.$eval("#learnNextSheet .ln-title", (e) => { const r = e.getBoundingClientRect(); return { x: r.x + Math.min(r.width / 2, 20), y: r.y + r.height / 2 }; });
    const a = await rectOf();
    await page.mouse.move(hd.x, hd.y); await page.mouse.down(); await page.mouse.move(hd.x - 60, hd.y + 40, { steps: 4 }); await page.mouse.up();
    const b = await rectOf();
    check(`${tag} a drag by the title bar moves the window`, Math.abs((b.x - a.x) + 60) < 3 && Math.abs((b.y - a.y) - 40) < 3, JSON.stringify({ a, b }));
    for (const h of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
      await page.evaluate(() => { const s = document.getElementById("learnNextSheet"); s.style.left = "200px"; s.style.top = "120px"; s.style.width = "500px"; s.style.height = "400px"; });
      const a2 = await rectOf();
      const p = await page.$eval(`#learnNextSheet > .mm-h[data-h="${h}"]`, (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      const dx = h.includes("e") ? -30 : h.includes("w") ? 30 : 0, dy = h.includes("s") ? -30 : h.includes("n") ? 30 : 0;
      await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + dx, p.y + dy, { steps: 4 }); await page.mouse.up();
      const b2 = await rectOf();
      check(`${tag} the ${h} handle changes the size`, Math.abs((b2.w - a2.w) - (h.includes("e") ? dx : h.includes("w") ? -dx : 0)) < 3 && Math.abs((b2.h - a2.h) - (h.includes("s") ? dy : h.includes("n") ? -dy : 0)) < 3 && (b2.w !== a2.w || b2.h !== a2.h), JSON.stringify({ a2, b2 }));
    }
  }
  await page.evaluate((r) => { const s = document.getElementById("learnNextSheet"); Object.assign(s.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" }); }, r0);

  // 2. double-click on the top bar
  await dbl(page, "#learnNextSheet .ln-title");
  await page.waitForTimeout(100);
  const after = await sheetState(page), bar = await barInfo(page);
  const wantW = width <= 640 ? width : width * 4 / 13;
  check(`${tag} double-click on the top bar collapses Learn next to a bar`, !!after && !after.shown && (await count(page)) === 1, JSON.stringify({ after }));
  check(`${tag} the bar is at the top left`, !!bar && near(bar.x, 0) && near(bar.y, 0), JSON.stringify(bar));
  check(`${tag} the bar has the 3-pane left-pane width (${wantW.toFixed(1)}px)`, !!bar && near(bar.w, wantW), JSON.stringify(bar));
  if (width === 1280 || width === 390) await page.screenshot({ path: `/tmp/popup-collapse-bar-${lang}-${width}.png` });

  // 3. two collapsed pop-ups stack (a second window is added through the shared .fc-floating card)
  await page.evaluate(() => {
    const d = document.createElement("div");
    d.className = "fc-floating"; d.id = "j140Probe";
    d.style.cssText = "position:fixed;right:20px;top:120px;width:200px;height:120px;background:#fff;z-index:1300";
    d.innerHTML = '<header style="display:flex"><h3>Probe</h3><button type="button" data-close style="min-width:40px;min-height:40px">✕</button></header>';
    document.body.appendChild(d);
  });
  await page.waitForTimeout(150);
  await dbl(page, "#j140Probe h3");
  await page.waitForTimeout(100);
  const b0 = await barInfo(page, 0), b1 = await barInfo(page, 1);
  check(`${tag} two collapsed pop-ups stack down from the top left, in the order collapsed`, !!b0 && !!b1 && near(b1.x, 0) && b1.y >= b0.bottom - 0.5, JSON.stringify({ b0, b1 }));

  // 4. restore: the second double-click gives back the same rect and scroll
  await dbl(page, '#mmColStack [data-mm-col-bar="learnnext"] [data-mm-title]').catch(() => {});
  await page.waitForTimeout(100);
  const back = await sheetState(page);
  check(`${tag} a second double-click restores the same rect and scroll`, !!back && back.shown && near(back.x, before.x) && near(back.y, before.y) && near(back.w, before.w) && near(back.h, before.h) && near(back.scroll, before.scroll, 2), JSON.stringify({ before, back }));
  await page.evaluate(() => { document.querySelector("#j140Probe [data-close]")?.click(); document.getElementById("j140Probe")?.remove(); });
  await page.waitForTimeout(100);

  // 5. a click inside the pop-up does not collapse it
  await page.evaluate(() => document.querySelector("#learnNextSheet .ln-note, #learnNextSheet .ln-body")?.click());
  await page.evaluate(() => document.querySelector("#learnNextSheet .ln-title")?.click());
  await page.evaluate(() => document.querySelector("#learnNextSheet button.ln-tile, #learnNextSheet .ln-tile")?.click());
  await page.waitForTimeout(100);
  const inside = await sheetState(page);
  check(`${tag} a click inside the pop-up does not collapse it`, !!inside?.shown && (await count(page)) === 0, JSON.stringify(inside));

  // 6. an open nav menu is on top of an open pop-up (the Owner's report: it stayed behind)
  const menuTop = await page.evaluate(() => {
    const d = [...document.querySelectorAll("#topNav details.nav-cat")][1] ?? document.querySelector("#topNav details.nav-cat");
    if (!d) return null;
    d.open = true;
    const m = d.querySelector(".nav-cat-links"), r = m.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + Math.min(r.height / 2, 30));
    const ok = !!hit && m.contains(hit);
    d.open = false;
    return { ok, hit: hit ? hit.tagName + "." + hit.className : null };
  });
  check(`${tag} an open nav menu is on top of an open pop-up (elementFromPoint at its centre)`, !!menuTop?.ok, JSON.stringify(menuTop));

  // 7. clicking the top nav "Modules" collapses Learn next and the menu is on top
  const nav = await page.evaluate(() => {
    const sums = [...document.querySelectorAll("#topNav details.nav-cat > summary")];
    const s = sums[1] ?? sums[0];
    if (!s) return null;
    s.click();
    const d = s.parentElement, m = d.querySelector(".nav-cat-links"), r = m.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + Math.min(r.height / 2, 30));
    const sheet = document.getElementById("learnNextSheet");
    return { open: d.open, onTop: !!hit && m.contains(hit), collapsed: sheet.hasAttribute("data-mm-min") };
  });
  check(`${tag} clicking the top nav Modules collapses Learn next AND the menu is on top`, !!nav && nav.open && nav.collapsed && nav.onTop, JSON.stringify(nav));
  await page.evaluate(() => document.querySelectorAll("#topNav details[open]").forEach((d) => { d.open = false; }));
  await dbl(page, "#mmColStack .mm-col-bar [data-mm-title]").catch(() => {});
  await page.waitForTimeout(100);

  // 8. the bottom tab Explore
  const tab = await page.evaluate(() => {
    const b = document.getElementById("tabExploreBtn");
    if (!b) return null;
    const sheet = document.getElementById("learnNextSheet");
    const wasShown = !sheet.hidden && !sheet.hasAttribute("data-mm-min");
    b.click();
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { wasShown, collapsed: sheet.hasAttribute("data-mm-min"), btnReachable: !!hit && (hit === b || b.contains(hit)) };
  });
  check(`${tag} clicking the bottom tab Explore collapses the pop-up and the tab is reachable`, !!tab && tab.wasShown && tab.collapsed && tab.btnReachable, JSON.stringify(tab));

  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
