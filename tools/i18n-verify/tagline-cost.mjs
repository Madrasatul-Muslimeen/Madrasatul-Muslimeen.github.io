// Pixel cost of a one-line tagline strip under the app banner, measured the
// LAYOUT-BACKLOG.md way. Three states per viewport:
//   base    -- the page as it ships today
//   added   -- a strip inserted BELOW the static tagline (an extra line)
//   replace -- the strip standing IN PLACE of the static tagline
// Reports the two things the owner asked for: the pixels, and what they cost
// in visible Approach rows.
import { chromium, newContext, openPage } from "./harness.mjs";

const VIEWPORTS = [
  ["390x844", { width: 390, height: 844 }],
  ["412x915", { width: 412, height: 915 }],
  ["390x700", { width: 390, height: 700 }],
  ["360x640", { width: 360, height: 640 }],
];

const MEASURE = () => {
  const q = (s) => document.querySelector(s);
  const heading = [...document.querySelectorAll("h2, h3")].find((h) => /Mastery Wheel/i.test(h.textContent));
  const dock = q("#dock");
  const card = q("#wheelSection");
  const sidebar = q("#wheelSidebarContainer");
  const svg = q("#wheelContainer svg");
  const dockRect = dock?.getBoundingClientRect();
  let rows = 0;
  if (sidebar && dockRect) {
    for (const r of sidebar.querySelectorAll(".way-row")) {
      const rr = r.getBoundingClientRect();
      if (rr.height > 4 && rr.bottom <= dockRect.top + 0.5 && rr.top >= 0) rows++;
    }
  }
  const tag = q(".app-tagline");
  const cardRect = card?.getBoundingClientRect();
  return {
    headingTop: heading ? Math.round(heading.getBoundingClientRect().top) : null,
    wheelWidth: svg ? Math.round(svg.getBoundingClientRect().width) : null,
    approachRows: rows,
    gapAboveDock: cardRect && dockRect ? Math.round(dockRect.top - cardRect.bottom) : null,
    dockFullyVisible: dockRect ? dockRect.bottom <= window.innerHeight + 0.5 : null,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    taglineH: tag ? Math.round(tag.getBoundingClientRect().height) : null,
    taglineOuter: tag ? Math.round(tag.getBoundingClientRect().height + parseFloat(getComputedStyle(tag).marginBottom)) : null,
    stripH: (() => { const s = q("#taglineStripProto"); return s ? Math.round(s.getBoundingClientRect().height) : null; })(),
  };
};

// The prototype: one line, ellipsised, a link inside it. Sized to the same
// typographic scale as .app-tagline so the cost is honest, not flattering.
const INJECT = (mode) => {
  const tag = document.querySelector(".app-tagline");
  const s = document.createElement("div");
  s.id = "taglineStripProto";
  s.style.cssText = "font-size:0.85rem;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#1F3A6E;margin:0 0 0.3rem;padding:0.1rem 0;";
  s.innerHTML = '<a href="#" style="color:#1F3A6E">Read the Approach Guide →</a>';
  if (mode === "replace") { tag.replaceWith(s); } else { tag.after(s); }
};

const browser = await chromium.launch();
for (const banner of [true, false]) {
  console.log(`\n#### tenant banner ${banner ? "SET" : "CLEARED"} ####`);
  console.log("viewport   state    headingTop  rows  wheel  gap  dockOK  ovf  taglineH  stripH");
  for (const [name, viewport] of VIEWPORTS) {
    const ctx = await newContext(browser, { banner, viewport });
    await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    for (const mode of ["base", "added", "replace"]) {
      const { page } = await openPage(ctx, "/app/quranrevival.html");
      if (mode !== "base") { await page.evaluate(INJECT, mode); await page.waitForTimeout(150); }
      const m = await page.evaluate(MEASURE);
      console.log(
        `${name.padEnd(10)} ${mode.padEnd(8)} ${String(m.headingTop).padStart(8)}  ${String(m.approachRows).padStart(4)}  ${String(m.wheelWidth).padStart(5)}  ${String(m.gapAboveDock).padStart(3)}  ${String(m.dockFullyVisible).padStart(6)}  ${String(m.overflowX).padStart(3)}  ${String(m.taglineH).padStart(8)}  ${String(m.stripH).padStart(6)}`
      );
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
