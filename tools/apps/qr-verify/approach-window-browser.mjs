// QR J10 (the Owner, 17 Oct 2026): the Approach (Mastery Wheel) window on a desktop width.
//   1. "resizeable from any corner and any side": a never-moved window opens clear of the bottom bar, every one of
//      its 8 handles is on top where it sits (nothing covers it) and a drag on it moves that edge or corner;
//   2. "the menu bar also overflow ... not the entire banner": maximized, the menu row (Home, Modules, Operation,
//      Bookmark) shows above the window, as the bottom bar does; the title line does not; nothing inside the window
//      hides behind either bar.
// At 1287x851 (the Owner's screen) and 1400x900; at 390 the phone layout has no window and no sideways scroll.
//
//   node tools/apps/qr-verify/approach-window-browser.mjs     (serves itself on PORT, default 8099)
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import { spawn } from "node:child_process";

const PORT = Number(process.env.PORT) || 8099;
let server = null;
const { chromium, newContext } = await import("../../i18n-verify/harness.mjs");

let pass = 0, fail = 0;
const check = (ok, what) => { ok ? pass++ : fail++; console.log(`${ok ? "ok  " : "FAIL"} ${what}`); };
const browser = await chromium.launch();
try {
  for (const [w, h] of [[1287, 851], [1400, 900], [390, 844]]) {
    try { await run(w, h); } catch (err) { check(false, `@${w} stopped early: ${String(err.message).split("\n")[0]}`); }
  }
} finally {
  await browser.close();
  server?.kill();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

async function run(width, height) {
  const tag = `@${width}`;
  const ctx = await newContext(browser, { viewport: { width, height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${process.env.QR_BASE}/app/quranrevival.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  const rect = (sel) => page.evaluate((s) => { const b = document.querySelector(s)?.getBoundingClientRect(); return b ? { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height } : null; }, sel);

  if (width < 900) {
    const r = await page.evaluate(() => ({ pos: getComputedStyle(document.getElementById("wheelPopupView")).position, nav: getComputedStyle(document.getElementById("topNav")).zIndex, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    check(r.pos !== "fixed" && r.nav === "auto", `${tag} the phone layout is unchanged: no floating window, the menu row as before (${JSON.stringify(r)})`);
    check(r.sw <= r.cw, `${tag} no sideways scroll (${r.sw} <= ${r.cw})`);
    check(errors.length === 0, `${tag} no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
    await ctx.close();
    return;
  }

  const win = await rect("#wheelPopupView"), dock = await rect("#dock");
  check(win && dock && win.b <= dock.t + 1, `${tag} the window opens clear of the bottom bar (window bottom ${Math.round(win?.b)} <= bar top ${Math.round(dock?.t)})`);

  // Each handle: on top where it sits, and a drag on it moves the right edges.
  const dirs = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
  for (const d of dirs) {
    const before = await rect("#wheelPopupView");
    const hit = await page.evaluate((dir) => {
      // Updated in place for MSA v12.20 (PCF MSA J72): the handles live in their own frame over the window's edge.
      const h = document.querySelector(`[data-popup-win-frame="wheel"] > .note-popup-resize[data-note-resize="${dir}"]`) || document.querySelector(`#wheelPopupView > .note-popup-resize[data-note-resize="${dir}"]`);
      const b = h.getBoundingClientRect();
      const x = b.left + b.width / 2, y = b.top + b.height / 2;
      return { x, y, w: b.width, h: b.height, top: document.elementFromPoint(x, y) === h };
    }, d);
    check(hit.top && Math.min(hit.w, hit.h) >= 12, `${tag} the ${d} handle is on top where it sits (${Math.round(hit.w)}x${Math.round(hit.h)})`);
    // Updated in place 20 Oct 2026 (PCF MSA J44, released in v12.05): the window now opens FILLING the space between the
    // menu row and the dock, so an outward drag of the left or right edge runs into the screen's edge and is rightly
    // refused. Every edge is dragged INWARD instead (n and s already were), which proves each handle resizes just as well.
    const dx = d.includes("e") ? -40 : d.includes("w") ? 40 : 0;
    const dy = d.includes("s") ? -40 : d.includes("n") ? 30 : 0; // s: pull up (below is the bottom bar); n: push down (above is the menu row)
    await page.mouse.move(hit.x, hit.y); await page.mouse.down();
    await page.mouse.move(hit.x + dx, hit.y + dy, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(200);
    const after = await rect("#wheelPopupView");
    const moved = {
      l: Math.round(after.l - before.l), t: Math.round(after.t - before.t), r: Math.round(after.r - before.r), b: Math.round(after.b - before.b),
    };
    const want = {
      l: d.includes("w") ? 40 : 0, r: d.includes("e") ? -40 : 0,
      t: d.includes("n") ? 30 : 0, b: d.includes("s") ? -40 : 0,
    };
    const ok = ["l", "t", "r", "b"].every((k) => Math.abs(moved[k] - want[k]) <= 2);
    check(ok, `${tag} dragging ${d} moves that side (moved ${JSON.stringify(moved)})`);
  }

  // Maximized: the menu row shows above the window; the title line above it does not.
  await page.evaluate(() => document.getElementById("wheelPopupMaximizeBtn").click());
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => {
    const v = document.getElementById("wheelPopupView").getBoundingClientRect();
    const nav0 = document.getElementById("topNav").getBoundingClientRect();
    const btns = [...document.querySelectorAll("#topNav summary, #topNav > button, #topNav > a")].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.top >= nav0.top - 1 && r.bottom <= nav0.bottom + 1; }); // the row's own buttons, not its closed menus
    const onTop = btns.map((b) => { const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return b.contains(e) || e === b; });
    const nav = document.getElementById("topNav").getBoundingClientRect();
    const title = [...document.querySelectorAll("h1, .app-title, #appVersion")].find((e) => e.getBoundingClientRect().height > 0);
    const tr = title?.getBoundingClientRect();
    const titleCovered = tr ? document.getElementById("wheelPopupView").contains(document.elementFromPoint(tr.left + 4, tr.top + tr.height / 2)) : null;
    return { pressed: document.getElementById("wheelPopupMaximizeBtn").getAttribute("aria-pressed"), covers: v.top < nav.top && v.bottom > nav.bottom, buttons: btns.length, onTop: onTop.filter(Boolean).length, titleCovered };
  });
  check(m.pressed === "true" && m.covers, `${tag} maximized, the window reaches over the menu row's place (${JSON.stringify(m)})`);
  check(m.buttons >= 4 && m.onTop === m.buttons, `${tag} maximized, the menu row (${m.onTop} of ${m.buttons} buttons) shows above the window`);
  check(m.titleCovered === true, `${tag} maximized, the title line stays under the window (only the menu row comes over)`);
  // ...and nothing inside the window hides behind either bar: its first and last controls are on top where they sit.
  const inside = await page.evaluate(() => {
    const ctl = [...document.querySelectorAll("#wheelSection button")].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const onTop = (b) => { const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && (b === e || b.contains(e)); };
    const sorted = ctl.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    const first = sorted[0], last = sorted[sorted.length - 1];
    return { first: first?.textContent.trim().slice(0, 20), firstTop: first ? onTop(first) : false, last: last?.textContent.trim().slice(0, 20), lastTop: last ? onTop(last) : false };
  });
  check(inside.firstTop && inside.lastTop, `${tag} maximized, nothing in the window hides behind the menu row or the bottom bar (${JSON.stringify(inside)})`);
  await page.screenshot({ path: `${process.env.QR_SHOTS ?? "/tmp"}/j10-${width}-max.png` });
  // The Modules menu still opens and is usable over the window.
  const sum = await page.evaluate(() => { const b = [...document.querySelectorAll("#topNav summary")].find((x) => /Modules/.test(x.textContent) && x.getBoundingClientRect().width > 0)?.getBoundingClientRect(); return b ? [b.left + b.width / 2, b.top + b.height / 2] : null; });
  if (sum) await page.mouse.click(sum[0], sum[1]); // a real click where the menu row shows over the window
  await page.waitForTimeout(500);
  const menu = await page.evaluate(() => {
    const det = [...document.querySelectorAll("#topNav details")].find((d) => d.open);
    const items = det ? [...det.querySelectorAll("a, button")].filter((a) => { const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) : [];
    const first = items[0]?.getBoundingClientRect();
    const hit = first ? document.elementFromPoint(first.left + first.width / 2, first.top + first.height / 2) : null;
    return { n: items.length, top: !!hit && det.contains(hit), hit: hit ? `${hit.tagName}.${String(hit.className).slice(0, 30)}` : null };
  });
  check(menu.n > 0 && menu.top, `${tag} maximized, an opened menu shows above the window (${JSON.stringify(menu)})`);
  await page.evaluate(() => document.body.click());
  await page.evaluate(() => document.getElementById("wheelPopupMaximizeBtn").click());
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${process.env.QR_SHOTS ?? "/tmp"}/j10-${width}.png` });
  check(errors.length === 0, `${tag} no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}
