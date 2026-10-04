// The Owner, 4 Oct 2026, a phone screenshot of Explore → Quran: "unreadable"
// and "card overlapping". The dark #explorePanel was shrinking to the scroll
// box's height (flex: 1 1 auto; min-height: 0), so its background ended under
// the ring key and the Whole Quran card, the words-known line, the hint and
// every surah row ran on past it -- pale text on the white page.
//
// Checks, by measurement: at phone widths every piece of the panel's content
// ends inside the panel's own box, and the panel leaves no empty scroll below
// it (720px included: there the two sit side by side and had the same fault);
// at 820px and 1280px the layout is unchanged (the card is bounded by the
// screen and its list scrolls inside it).
// Mutation: --mutate-shrink serves the page without the phone rule; the phone
// checks must fail. Run from the repository root with serve.js running.
import { readFileSync } from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUT = process.argv.includes("--mutate-shrink");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const lang of ["en", "bn"]) {
  for (const [w, h] of [[360, 740], [390, 844], [412, 915], [600, 900], [720, 900], [820, 1180], [1280, 800]]) {
    const tag = `${lang} ${w}px`;
    const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h } });
    if (MUT) {
      let src = readFileSync("app/quranrevival.html", "utf8");
      const rule = /  @media \(max-width: 720px\) \{\n    #explorePanel \{ flex: 1 0 auto; \}\n    #explorePanel \.wheel-sidebar \{ height: auto; \}\n  \}\n/;
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
        let a = e.parentElement, clipped = false;
        while (a && a !== p) { const o = getComputedStyle(a).overflowY; if (o !== "visible" && b.top >= a.getBoundingClientRect().bottom - 1) clipped = true; a = a.parentElement; }
        if (!clipped && b.bottom > bottom) { bottom = b.bottom; last = String(e.className || e.tagName).slice(0, 30); }
      }
      const inPanel = (sel) => { const e = p.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return b.top >= pr.top - 1 && b.bottom <= pr.bottom + 1; };
      return {
        stacked: getComputedStyle(p).flexDirection === "row" && p.querySelector(".wheel-sidebar").getBoundingClientRect().top >= p.querySelector(".wheel-col").getBoundingClientRect().bottom - 1,
        over: Math.round(bottom - pr.bottom), last,
        hint: inPanel(".hint"), firstRow: inPanel(".way-row"),
        emptyBelow: Math.round(sc.scrollHeight - (pr.bottom - sc.getBoundingClientRect().top + sc.scrollTop)),
        panelH: Math.round(pr.height), scrollH: sc.clientHeight,
      };
    });
    if (w <= 720) {
      check(`${tag}: POSITIVE CONTROL -- the card holds surah rows and is taller than the screen`, r.firstRow !== null && r.panelH > r.scrollH, JSON.stringify(r));
      check(`${tag}: nothing in Explore runs past its dark card`, r.over <= 0, JSON.stringify(r));
      check(`${tag}: the hint and the first surah row sit on the card`, r.hint === true && r.firstRow === true, JSON.stringify(r));
      check(`${tag}: no empty scroll below the card`, r.emptyBelow <= 2, JSON.stringify(r));
    } else {
      check(`${tag}: unchanged -- the card is bounded by the screen and its list scrolls inside it`, r.panelH <= r.scrollH + 1, JSON.stringify(r));
      // KNOWN, NOT FIXED HERE (4 Oct 2026): on a short desktop window the
      // wheel column can overhang the bounded card by a few dozen px (26-58px
      // measured at 1280x800), present before this round. Printed, so a change
      // in it is seen; fixing it means re-sizing the pop-out's list, a round of
      // its own.
      if (r.over > 0) console.log(`  NOTE  ${tag}: wheel column overhangs the card by ${r.over}px (known, pre-existing)`);
    }
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
