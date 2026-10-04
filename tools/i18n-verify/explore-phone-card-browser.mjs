// The Owner, 4 Oct 2026, a phone screenshot of Explore → Quran: "unreadable"
// and "card overlapping". The dark #explorePanel was shrinking to the scroll
// box's height (flex: 1 1 auto; min-height: 0), so its background ended under
// the ring key and the Whole Quran card, the words-known line, the hint and
// every surah row ran on past it -- pale text on the white page.
//
// Checks, by measurement: at phone widths every piece of the panel's content
// ends inside the panel's own box, and the panel leaves no empty scroll below
// it (720px included: there the two sit side by side and had the same fault);
// above 720px (wheel and list side by side) the card is never shorter than
// the wheel column -- the Owner, 4 Oct 2026: "fix the Explore overhang on
// desktop too" (40-140px on a short window) -- while the surah list still
// scrolls inside the card rather than making it thousands of px tall.
// Mutations: --mutate-shrink serves the page without the phone rule (the
// phone checks fail); --mutate-desk without the desktop rule (the desktop
// overhang checks fail). Run from the repository root with serve.js running.
import { readFileSync } from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUT = process.argv.includes("--mutate-shrink");
const MUT_DESK = process.argv.includes("--mutate-desk");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const lang of ["en", "bn"]) {
  for (const [w, h] of [[360, 740], [390, 844], [412, 915], [600, 900], [720, 900], [721, 800], [820, 700], [820, 1180], [900, 700], [1024, 768], [1280, 800], [1280, 1000], [1920, 1080]]) {
    const tag = `${lang} ${w}x${h}`;
    const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h } });
    if (MUT) {
      let src = readFileSync("app/quranrevival.html", "utf8");
      const rule = /  @media \(max-width: 720px\) \{\n    #explorePanel \{ flex: 1 0 auto; \}\n    #explorePanel \.wheel-sidebar \{ height: auto; \}\n  \}\n/;
      if (!rule.test(src)) { console.log("mutation did not apply"); process.exit(2); }
      src = src.replace(rule, "");
      await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src }));
    }
    if (MUT_DESK) {
      let src = readFileSync("app/quranrevival.html", "utf8");
      const rule = /  @media \(min-width: 721px\) \{\n    #explorePanel \{ flex: 1 0 auto; \}\n    #explorePanel \.wheel-sidebar \{ contain: size; \}\n  \}\n/;
      if (!rule.test(src)) { console.log("mutation did not apply"); process.exit(2); }
      src = src.replace(rule, "");
      await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src }));
    }
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await page.click("#tabExploreBtn");
    await page.waitForFunction(() => document.querySelectorAll("#explorePanel .way-row").length > 0, null, { timeout: 15000 });
    const r = await page.evaluate(() => {
      const p = document.getElementById("explorePanel"), sc = document.getElementById("exploreScroll");
      const pr = p.getBoundingClientRect();
      // Content that is really visible: not inside a box that scrolls or clips it away.
      let bottom = 0, last = "";
      for (const e of p.querySelectorAll("*")) {
        const b = e.getBoundingClientRect(); if (!(b.height > 0)) continue;
        // What is VISIBLE: an element below a clipping box is hidden, and one
        // cut by it is visible only down to that box's edge (a half-shown
        // row at the foot of the scrolling list is not past the card).
        let a = e.parentElement, clipped = false, visBottom = b.bottom;
        while (a && a !== p) {
          if (getComputedStyle(a).overflowY !== "visible") { const ab = a.getBoundingClientRect().bottom; if (b.top >= ab - 1) clipped = true; visBottom = Math.min(visBottom, ab); }
          a = a.parentElement;
        }
        if (!clipped && visBottom > bottom) { bottom = visBottom; last = String(e.className || e.tagName).slice(0, 30); }
      }
      const inPanel = (sel) => { const e = p.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return b.top >= pr.top - 1 && b.bottom <= pr.bottom + 1; };
      return {
        stacked: getComputedStyle(p).flexDirection === "row" && p.querySelector(".wheel-sidebar").getBoundingClientRect().top >= p.querySelector(".wheel-col").getBoundingClientRect().bottom - 1,
        over: Math.round(bottom - pr.bottom), last,
        hint: inPanel(".hint"), firstRow: inPanel(".way-row"),
        emptyBelow: Math.round(sc.scrollHeight - (pr.bottom - sc.getBoundingClientRect().top + sc.scrollTop)),
        panelH: Math.round(pr.height), scrollH: sc.clientHeight,
        sideBySide: (() => { const c = p.querySelector(".wheel-col").getBoundingClientRect(), d = p.querySelector(".wheel-sidebar").getBoundingClientRect(); return d.top < c.bottom - 1; })(),
        listScrolls: (() => { const l = p.querySelector(".ways-list"); return !!l && l.scrollHeight > l.clientHeight + 1; })(),
        listInside: (() => { const l = p.querySelector(".ways-list")?.getBoundingClientRect(); return !!l && l.height > 100 && l.bottom <= pr.bottom + 1; })(),
      };
    });
    if (w <= 720) {
      check(`${tag}: POSITIVE CONTROL -- the card holds surah rows and is taller than the screen`, r.firstRow !== null && r.panelH > r.scrollH, JSON.stringify(r));
      check(`${tag}: nothing in Explore runs past its dark card`, r.over <= 0, JSON.stringify(r));
      check(`${tag}: the hint and the first surah row sit on the card`, r.hint === true && r.firstRow === true, JSON.stringify(r));
      check(`${tag}: no empty scroll below the card`, r.emptyBelow <= 2, JSON.stringify(r));
    } else {
      check(`${tag}: POSITIVE CONTROL -- the wheel and the surah list sit side by side`, r.sideBySide, JSON.stringify(r));
      check(`${tag}: nothing in the card runs past its bottom edge (the wheel column overhung by 40-140px on a short window)`, r.over <= 0, JSON.stringify(r));
      check(`${tag}: the surah list is inside the card and scrolls inside it`, r.listInside && r.listScrolls, JSON.stringify(r));
      check(`${tag}: the card stays a sensible height (the 114-row list does not stretch it)`, r.panelH < 1200, JSON.stringify(r));
      check(`${tag}: the card still fills the window, with nothing blank below it`, r.panelH >= r.scrollH - 1 && r.emptyBelow <= 2, JSON.stringify(r));
    }
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
