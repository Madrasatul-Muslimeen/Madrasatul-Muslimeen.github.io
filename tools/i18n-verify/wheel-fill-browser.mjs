// PCF MSA J44 (the Owner, 20 Oct 2026: "I want always the app starts with this page setting (mostly size of the pop up
// and the wheel) in PC even after a new version"). On a PC (>= 900px) the Mastery Wheel window opens filling the space
// between the menu row and the dock, and the wheel inside takes the largest size at which it and every control under
// it still fit -- at EVERY start, whatever an earlier visit stored. A drag this visit is kept. Phones are untouched.
//
// Run from the repository root with serve.js running. MUTATE=<name> serves one deliberate break (see MUTATIONS) and
// the suite must then FAIL; that is how each check below was proven able to fail.

// Updated in place for PCF MSA J72 (the Owner, 22 Oct 2026: "resizeable from all side and all corners"): the resize
// handles now live in their own frame over the window's edge ([data-popup-win-frame="wheel"], note-popup.js), because
// inside the scrolling window the bottom and right ones could not be grabbed. Same handles, new place.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

const HTML = "app/quranrevival.html", POPUP = "app/js/note-popup.js";
const MUTATIONS = {
  "no-fill": [HTML, "      fill: true, // PCF MSA J44", "      // fill: true, // PCF MSA J44"],
  // "fill only when nothing is stored": both the opening size and the re-fit defer to an old stored size.
  "stored-wins": [POPUP, ["  const openingGeometry = () => (fill\n", "  const openingGeometry = () => (fill && !readJson(geometryKeyFor(id))\n"],
    ["if (fill) { if (!touched) commit(", "if (fill && !readJson(geometryKeyFor(id))) { if (!touched) commit("]],
  "wheel-stored-wins": [HTML, "      if (approachWheelDragged || !window.matchMedia", "      if (approachWheelDragged || getWheelSize(\"approach\") || !window.matchMedia"],
  "resize-ignores-touch": [POPUP, "    if (fill && !touched) { commit(fillGeometry(", "    if (fill) { commit(fillGeometry("],
  "no-control-observe": [HTML, "      wheelColEl.querySelectorAll(\"button, .wheel-intro-settled\").forEach((el) => fitRO.observe(el));", ""],
  "drag-not-kept": [HTML, "      if (approachWheelDragged || !window.matchMedia", "      if (!window.matchMedia"],
  "no-refit": [HTML, "fitQueued = false; wheelPopupWin?.refit(); fitApproachWheelToWindow();", "fitQueued = false; fitApproachWheelToWindow();"],
};
const MUTATE = process.env.MUTATE || "";

let passed = 0, failed = 0;
function check(name, cond, detail = "") {
  if (cond && typeof cond.then === "function") throw new TypeError("check() takes a value, not a promise");
  if (cond) { passed++; console.log(`  PASS  ${name}`); } else { failed++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const browser = await chromium.launch();
async function open(width, height, { seedOld = false } = {}) {
  const ctx = await newContext(browser, { viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, ...rest] = MUTATIONS[MUTATE] || (() => { throw new Error(`no such mutation ${MUTATE}`); })();
    const pairs = Array.isArray(rest[0]) ? rest : [rest];
    let body = fs.readFileSync(file, "utf8");
    for (const [from, to] of pairs) {
      if (!body.includes(from)) throw new Error(`mutation anchor missing: ${MUTATE}: ${from.slice(0, 50)}`);
      body = body.split(from).join(to);
    }
    const glob = file === HTML ? "**/app/quranrevival.html*" : "**/app/js/note-popup.js*";
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file === HTML ? "text/html; charset=utf-8" : "text/javascript", body }));
  }
  if (seedOld) {
    // What an earlier visit (or an earlier version) left behind: a small window and a small wheel.
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("mm_wheel_popup_geometry", JSON.stringify({ width: 600, height: 420, top: 150, left: 120 }));
        localStorage.setItem("mm_wheel_size_approach", "300");
      } catch { /* storage blocked: the check below says so */ }
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}
const measure = (page) => page.evaluate(() => {
  const box = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, right: b.right, bottom: b.bottom }; };
  const col = document.querySelector("#wheelSection .wheel-col");
  const controls = [...col.querySelectorAll("button")].filter((b) => b.getBoundingClientRect().width > 0);
  return {
    vw: innerWidth, vh: innerHeight,
    win: box(document.getElementById("wheelPopupView")),
    inlineWidth: document.getElementById("wheelPopupView").style.width,
    nav: box(document.getElementById("topNav")),
    dockTop: document.getElementById("dock").getBoundingClientRect().top,
    section: box(document.getElementById("wheelSection")),
    wheel: box(document.querySelector("#wheelSection svg.mastery-wheel")),
    wrapW: document.getElementById("wheelResizeWrap").getBoundingClientRect().width,
    lowestControl: Math.max(...controls.map((b) => b.getBoundingClientRect().bottom)),
    controlCount: controls.length,
    stored: [localStorage.getItem("mm_wheel_popup_geometry"), localStorage.getItem("mm_wheel_size_approach")],
  };
});
/** Is the wheel the LARGEST that fits? Grow it by 12px for a moment: something must then leave the window (or the
 *  wheel is already as wide as its column). This is the positive control for "fits": the same test must be able to fail. */
const growWouldOverflow = (page) => page.evaluate(() => {
  const wrap = document.getElementById("wheelResizeWrap");
  const col = document.querySelector("#wheelSection .wheel-col");
  const limit = document.getElementById("wheelSection").getBoundingClientRect().bottom - 8;
  const before = wrap.style.width, w = wrap.getBoundingClientRect().width;
  const cs = getComputedStyle(col);
  const colContent = col.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  wrap.style.width = `${w + 12}px`;
  const over = [...col.querySelectorAll("button, .wheel-resize-wrap")].some((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.bottom > limit; });
  wrap.style.width = before;
  return over || w + 12 > colContent - 4;
});

console.log(`\nwheel-fill-browser${MUTATE ? ` (MUTATION ${MUTATE})` : ""}`);

console.log("\n1. A PC opens the wheel window filling the screen, and the wheel as large as fits");
for (const [w, h] of [[1600, 1240], [1920, 1080], [1366, 768], [1280, 800], [900, 700]]) {
  const { ctx, page, errors } = await open(w, h);
  const m = await measure(page);
  const side = Math.max(16, Math.round(w * 0.02));
  check(`${w}x${h}: window spans the width less ${side}px each side (x ${m.win.x.toFixed(0)}, right ${m.win.right.toFixed(0)})`,
    Math.abs(m.win.x - side) <= 2 && Math.abs(w - m.win.right - side) <= 2);
  check(`${w}x${h}: window top (${m.win.y.toFixed(0)}) is below the menu row (${m.nav.bottom.toFixed(0)})`, m.win.y >= m.nav.bottom - 0.5);
  check(`${w}x${h}: window bottom (${m.win.bottom.toFixed(0)}) is above the dock (${m.dockTop.toFixed(0)}) and within 16px of it`,
    m.win.bottom <= m.dockTop + 0.5 && m.dockTop - m.win.bottom <= 16);
  check(`${w}x${h}: all ${m.controlCount} controls under the wheel are inside the window (lowest ${m.lowestControl.toFixed(0)} <= ${(m.section.bottom - 8).toFixed(0)})`,
    m.controlCount >= 3 && m.lowestControl <= m.section.bottom - 8 + 0.5);
  check(`${w}x${h}: the wheel (${m.wrapW.toFixed(0)}px) is the largest that fits: 12px more would not`, await growWouldOverflow(page));
  check(`${w}x${h}: no sideways page scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check(`${w}x${h}: no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::/.test(e)).length === 0, errors.join(" | "));
  if (w === 1600) check(`1600x1240 (the Owner's screen): the wheel is big, at least 700px (${m.wheel.w.toFixed(0)})`, m.wheel.w >= 700);
  await ctx.close();
}

console.log("\n2. A size stored by an earlier visit or version does NOT win at start");
{
  const { ctx, page } = await open(1600, 1240, { seedOld: true });
  const m = await measure(page);
  check("positive control: the old small sizes really are stored in this browser", m.stored[0]?.includes("600") && m.stored[1] === "300", JSON.stringify(m.stored));
  check(`the window still fills (width ${m.win.w.toFixed(0)}, not 600)`, m.win.w >= 1600 - 2 * 32 - 2);
  check(`the wheel is still as large as fits (${m.wheel.w.toFixed(0)}, not 300)`, m.wheel.w >= 700);
  await ctx.close();
}

console.log("\n3. What the reader does THIS visit is kept");
{
  const { ctx, page } = await open(1600, 1240);
  const before = await measure(page);
  // Shrink the window from its bottom-right corner, the way a reader drags it.
  const h = await page.evaluate(() => { const b = document.querySelector('[data-popup-win-frame="wheel"] > .note-popup-resize[data-note-resize="se"]').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  await page.mouse.move(h.x, h.y); await page.mouse.down(); await page.mouse.move(h.x - 300, h.y - 200, { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(300);
  const dragged = await measure(page);
  check(`positive control: the corner drag shrank the window (${before.win.w.toFixed(0)} -> ${dragged.win.w.toFixed(0)})`, dragged.win.w < before.win.w - 200);
  check(`the wheel refits the smaller window (${before.wrapW.toFixed(0)} -> ${dragged.wrapW.toFixed(0)}), controls still inside`,
    dragged.wrapW < before.wrapW && dragged.lowestControl <= dragged.section.bottom - 8 + 0.5);
  await page.setViewportSize({ width: 1500, height: 1200 });
  await page.waitForTimeout(400);
  const after = await measure(page);
  check(`a browser resize afterwards does not throw the dragged window back to full (width ${after.win.w.toFixed(0)})`, Math.abs(after.win.w - dragged.win.w) <= 2);
  await ctx.close();
}
{
  const { ctx, page } = await open(1600, 1240);
  const before = await measure(page);
  const h = await page.evaluate(() => { const b = document.querySelector('#wheelResizeWrap .wheel-resize-handle[data-wheel-resize="se"]').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  await page.mouse.move(h.x, h.y); await page.mouse.down(); await page.mouse.move(h.x - 150, h.y - 150, { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(300);
  const dragged = await measure(page);
  check(`positive control: dragging the wheel's corner made it smaller (${before.wrapW.toFixed(0)} -> ${dragged.wrapW.toFixed(0)})`, dragged.wrapW < before.wrapW - 100);
  await page.setViewportSize({ width: 1620, height: 1240 });
  await page.waitForTimeout(400);
  const after = await measure(page);
  check(`the dragged wheel keeps its size after the window changes (${after.wrapW.toFixed(0)})`, Math.abs(after.wrapW - dragged.wrapW) <= 2);
  await ctx.close();
}

console.log("\n4. Below 900px nothing changes");
{
  const { ctx, page } = await open(390, 844, { seedOld: true });
  const m = await measure(page);
  check("390x844: the wheel window carries no window geometry (the phone layout owns it)", m.inlineWidth === "");
  check("390x844: no sideways page scroll", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await ctx.close();
}

await browser.close();
console.log(`\nwheel-fill-browser: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
