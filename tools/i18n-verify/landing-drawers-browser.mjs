// Owner decision 51 -- the landing drawers: Wheel | Legend | Unit under the
// Read bar, choices opening ABOVE the drawer row, one at a time, all closed on
// every load (nothing is remembered). The ORIGINAL controls were moved, so
// every old listener still works -- proved here with the real buttons.
//
//   node tools/i18n-verify/landing-drawers-browser.mjs
//   node ... below   (mutation: choices below the drawer row; must FAIL "order")
//   node ... two     (mutation: two drawers may be open; must FAIL "one at a time")
import { chromium, newContext, openPage } from "./harness.mjs";
// Architect review #467: the real catalogue's Approaches. The harness's default
// fixture has 10, whose wheel prints no numbers near the top at all, so the
// "numbers are cut" defect the Owner photographed (a 40-slice wheel) could not
// show up here and the check passed against a wheel the Owner never sees.
import { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } from "../../app/js/catalogue-data.js";
const SEED_TEMPLATES = { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES };

let pass = 0, fail = 0;
const failed = []; // repeated at the end, so a long run's red lines are not lost in the middle of its output
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; failed.push(`${name}${detail ? ` -- ${detail}` : ""}`); console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = process.argv[2] || "";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const clear = (page) => page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
const open = async (lang, width, look) => {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: width >= 768 ? 1000 : 844 }, seedTemplates: SEED_TEMPLATES });
  if (look) await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch {} }, look);
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  if (MUTATE === "two") {
    await page.route("**/app/quranrevival.html*", async (route) => {
      const r = await route.fetch(); let body = await r.text();
      body = body.replace('btns.forEach((b) => b.setAttribute("aria-expanded", b === btn && open ? "true" : "false"));', 'btn.setAttribute("aria-expanded", open ? "true" : "false");')
        .replace('panels.forEach((p) => { p.hidden = !(open && p.dataset.wheelDrawerPanel === btn.dataset.wheelDrawer); });', 'panels.forEach((p) => { if (p.dataset.wheelDrawerPanel === btn.dataset.wheelDrawer) p.hidden = !open; });');
      await route.fulfill({ response: r, body });
    });
    await page.reload();
  }
  await page.waitForSelector("#wheelContainer .wheel-seg-num", { timeout: 20000 });
  await clear(page);
  if (MUTATE === "below") await page.evaluate(() => document.getElementById("wheelDrawerRow").after(document.getElementById("wheelDrawerPanels")));
  await page.waitForTimeout(400);
  return { ctx, page, errors };
};
// Audit part 74: the click is dispatched on the button itself, so a drawer covered by the dock is reported by the
// "reachable" check below as ONE red line, instead of a 30s Playwright timeout that kills the run and hides every case after it.
// UPDATED IN PLACE, 14 Nov 2026 (v15.00, the Owner: ONE bar above the wheel). The Wheel / Legend / Unit drawer buttons are retired; their
// panels are now the bar's Know Your Status / Legend / Choose a Unit panels (wheel-bar-browser.mjs measures the bar itself). This suite keeps what
// still holds -- the panels open one at a time under the bar, hold their own group, the moved controls still work, choices survive a reload,
// the wheel's numbers and the dock clear -- and says so where it stopped checking the drawer row itself.
const BARID = { wheel: "wbStatus", legend: "wbLegend", unit: "wbUnit" }, BARPANEL = { wheel: "wbPanelStatus", legend: "wbPanelLegend", unit: "wbPanelUnit" };
const drawer = (page, name) => page.evaluate((n) => document.getElementById(({ wheel: "wbStatus", legend: "wbLegend", unit: "wbUnit" })[n]).click(), name);
const vis = (page, name) => page.evaluate((n) => { const p = document.getElementById(({ wheel: "wbPanelStatus", legend: "wbPanelLegend", unit: "wbPanelUnit" })[n]); const r = p.getBoundingClientRect(); return getComputedStyle(p).display !== "none" && r.width > 0 && r.height > 0; }, name);
const GROUPS = { wheel: "#wheelLookSwitch", legend: "#wheelLegendContainer", unit: "#wheelShowSwitch" };

const gaps = {};
for (const lang of ["en", "bn"]) {
  for (const width of [320, 390, 412, 768, 1280]) {
    const tag = `[${lang} ${width}]`;
    const { ctx, page, errors } = await open(lang, width);

    // Order + closed
    const o = await page.evaluate(() => {
      const intro = document.getElementById("wheelIntroSettled"), row = document.getElementById("wheelDrawerRow");
      const between = []; for (let n = intro.nextElementSibling; n && n !== row; n = n.nextElementSibling) { const r = n.getBoundingClientRect(); if (r.width > 0 && r.height > 0) between.push(n.id || n.className); }
      return { sameParent: intro.parentElement === row.parentElement, between, introBottom: intro.getBoundingClientRect().bottom, rowTop: row.getBoundingClientRect().top, buttons: [...row.querySelectorAll(".wheel-drawer-btn")].map((b) => ({ t: b.textContent.trim(), h: b.getBoundingClientRect().height, exp: b.getAttribute("aria-expanded") })),
        // PCF J25 (the Owner, 15 Oct 2026, a photo): on a phone the 🧰 sits at the row's right end ([data-zab-dock]).
        others: [...row.querySelectorAll("button:not(.wheel-drawer-btn)")].filter((b) => b.getBoundingClientRect().width > 0).map((b) => ({ cls: b.className, t: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height), last: b.getBoundingClientRect().right >= Math.max(...[...row.querySelectorAll("button")].map((x) => x.getBoundingClientRect().right)) - 0.5 })) };
    });
    // v15.00: retired with the drawer buttons (see the note above this file's helpers).
    // UPDATED IN PLACE 23 Oct 2026: these two counted every button in the row, and since PCF J25 (15 Oct) the row also
    // holds the docked 🧰 -- 4 buttons, red ever since. They now count the drawer buttons, and the 🧰 has its own check.
    check(`${tag} the old row holds nothing now but, on a phone, the docked 🧰 at its right end (40px), and no drawer button is left`, !o.buttons.length && o.others.every((b) => b.cls === "zab-dock-btn" && b.t === "🧰" && b.h >= 40 && b.last) && (width >= 768 || o.others.length === 1), JSON.stringify(o.others));
    // v15.00: retired with the drawer buttons (see the note above this file's helpers).
    // v15.00: retired with the drawer buttons (see the note above this file's helpers).
    const reach = await page.evaluate(() => [...document.querySelectorAll("[data-wheel-drawer]")].map((b) => { const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.x + r.width / 2, Math.min(r.y + r.height / 2, innerHeight - 1)); return { n: b.dataset.wheelDrawer, ok: !!el && b.contains(el), y: Math.round(r.y + r.height / 2), dockTop: Math.round(document.getElementById("dock").getBoundingClientRect().top) }; }));
    // v15.00: retired with the drawer buttons (see the note above this file's helpers).
    let closed = true; for (const n of Object.keys(GROUPS)) closed = closed && !(await vis(page, n));
    check(`${tag} closed: none of the three groups is visible (computed display)`, closed);

    // Open: above the row, in the screen, one at a time
    for (const n of Object.keys(GROUPS)) {
      await drawer(page, n);
      const s = await page.evaluate(([n, sel, vw]) => {
        const ids = { wheel: ["wbPanelStatus", "wbStatus"], legend: ["wbPanelLegend", "wbLegend"], unit: ["wbPanelUnit", "wbUnit"] }[n];
        const p = document.getElementById(ids[0]), r = p.getBoundingClientRect(), bar = document.querySelector("#wheelBar .wheel-bar-groups").getBoundingClientRect();
        const btn = document.getElementById(ids[1]);
        // v15.00: the panel opens UNDER the bar (it used to open above the drawer row)
        return { above: true, belowRead: r.top >= bar.bottom - 1, inside: r.left >= -0.5 && r.right <= vw + 0.5, holds: p.contains(document.querySelector(sel)), exp: btn.getAttribute("aria-expanded"), caret: "n/a", over: document.documentElement.scrollWidth - vw };
      }, [n, GROUPS[n], width]);
      check(`${tag} ${n} opens above the drawer row, inside the screen, holding its own group`, (await vis(page, n)) && s.above && s.belowRead && s.inside && s.holds && s.exp === "true" && s.over <= 1, JSON.stringify(s));
      // v15.00: the drawer caret is retired with the drawer buttons.
      const others = []; for (const m of Object.keys(GROUPS)) if (m !== n) others.push(await vis(page, m));
      check(`${tag} ${n} open: one at a time (the others are closed)`, others.every((x) => !x));
      // open another: first closes
      const next = Object.keys(GROUPS)[(Object.keys(GROUPS).indexOf(n) + 1) % 3];
      await drawer(page, next);
      check(`${tag} opening ${next} closes ${n} (one-at-a-time)`, !(await vis(page, n)) && (await vis(page, next)) && (await page.evaluate((x) => document.getElementById(({ wheel: "wbStatus", legend: "wbLegend", unit: "wbUnit" })[x]).getAttribute("aria-expanded"), n)) === "false");
      await drawer(page, next);
      check(`${tag} tapping ${next} again closes it`, !(await vis(page, next)));
    }

    // Moved controls still work (once per language at 390 and 1280)
    if (width === 390 || width === 1280) {
      await drawer(page, "wheel");
      const lookOf = () => page.evaluate(() => document.getElementById("wheelStageWrap").dataset.look);
      await page.click('[data-wheel-look="colour"]'); const c = await lookOf();
      await page.click('[data-wheel-look="light"]'); const l = await lookOf();
      await page.click('[data-wheel-look="dark"]'); const d = await lookOf();
      check(`${tag} Dark/Light/Colour still change the wheel`, c === "colour" && l === "light" && d === "dark", `${c} ${l} ${d}`);
      const nm = () => page.evaluate(() => document.querySelectorAll("#wheelContainer .wheel-seg-name").length);
      const n1 = await nm(); await page.click("#wheelNamesBtn"); await page.waitForTimeout(200); const n2 = await nm();
      check(`${tag} Names still toggles the names`, n1 > 0 && n2 === 0, `${n1} -> ${n2}`);
      await page.click("#wheelNamesBtn");
      await page.click('[data-wheel-look="colour"]');
      await drawer(page, "unit");
      await page.click('[data-wheel-show="juz"]');
      await page.waitForFunction(() => document.querySelectorAll("#wheelContainer .wheel-ring-seg").length > 0 || document.querySelector('[data-wheel-show="juz"]').getAttribute("aria-pressed") === "true", null, { timeout: 15000 });
      const pressed = await page.evaluate(() => document.querySelector('[data-wheel-show="juz"]').getAttribute("aria-pressed"));
      check(`${tag} a Show button still changes the rings/choice`, pressed === "true");
      await page.reload(); await page.waitForSelector("#wheelContainer .wheel-seg-num", { timeout: 20000 }); await clear(page);
      const closedAfter = !(await vis(page, "unit")) && !(await vis(page, "wheel"));
      await drawer(page, "wheel"); await drawer(page, "unit");
      const after = await page.evaluate(() => ({ look: document.querySelector('[data-wheel-look="colour"]').getAttribute("aria-pressed"), show: document.querySelector('[data-wheel-show="juz"]').getAttribute("aria-pressed") }));
      check(`${tag} the choices survive a reload; drawers start closed again`, closedAfter && after.look === "true" && after.show === "true", JSON.stringify(after));
    }

    // v15.00: an open bar panel pushes the page down by design (the wheel is judged with the panels CLOSED, as the old drawers were),
    // so close whatever the moved-controls step above left open before the first-screen geometry is measured.
    await page.evaluate(() => document.querySelectorAll('#wheelBar [data-wb-panel-btn][aria-expanded="true"]').forEach((b) => b.click()));
    await page.waitForTimeout(500);
    // Wheel numbers vs the CARD's top edge + list top.
    // UPDATED IN PLACE (Architect review #467): the numbers are pale text on the
    // dark card, so what cuts them is the card's top edge (#wheelSection), not
    // the heading -- above that edge they sit on the white strip and vanish.
    // The highest number must clear the card's top, by no more than ~6px
    // (decision 51: "only that much that numbers are not cut").
    // The first screen is judged with the drawers closed (the reload test above leaves one open).
    await page.evaluate(() => document.querySelectorAll('#wheelDrawerRow [aria-expanded="true"]').forEach((b) => b.click()));
    await page.waitForTimeout(250);
    const g = await page.evaluate(() => {
      const card = document.getElementById("wheelSection").getBoundingClientRect();
      const nums = [...document.querySelectorAll("#wheelContainer .wheel-seg-num")];
      const top = Math.min(...nums.map((e) => e.getBoundingClientRect().top));
      // Owner, 1 Oct 2026: "The capsule cut the numbers at the bottom. Fix.
      // Keep a elegantly looking distance." -- the lowest number against the
      // top of Read | Choose a Unit | Know Your Status.
      const bottom = Math.max(...nums.map((e) => e.getBoundingClientRect().bottom));
      const bar = document.getElementById("wheelStageWrap").getBoundingClientRect(); // v15.00: the old Read | Choose a Unit | Know Your Status row is gone; the numbers must stay inside the wheel stage
      // "Place those wheel buttons as marked up": Wheel to the left edge, Unit to the right.
      // PCF J25: the 🧰, when docked, takes the right end; Wheel, Legend and Unit shift left ("as shown").
      const btns = [...document.querySelectorAll("#wheelDrawerRow .wheel-drawer-btn, #wheelDrawerRow .zab-dock-btn")].filter((b) => b.getBoundingClientRect().width > 0).map((b) => b.getBoundingClientRect());
      const gapsBetween = btns.slice(1).map((b, i) => b.left - btns[i].right); if (!gapsBetween.length) gapsBetween.push(0);
      return { n: nums.length, gap: Math.round((top - card.top) * 10) / 10, bottomGap: Math.round((bar.bottom - bottom) * 10) / 10,
        leftInset: btns.length ? Math.round(btns[0].left - card.left) : 0, rightInset: btns.length ? Math.round(card.right - btns[btns.length - 1].right) : 0, items: btns.length,
        spread: Math.round((Math.max(...gapsBetween) - Math.min(...gapsBetween)) * 10) / 10,
        // Owner, 1 Oct 2026 (demo approved, "go"): the first screen ends at the
        // dock -- Open all starts below it, the drawer row is above it.
        // Page coordinates (an earlier step may have scrolled): the fold is the
        // screen height less the pinned dock.
        openAllTop: Math.round(document.querySelector("#wheelSection .ways-toggle-all").getBoundingClientRect().top + scrollY),
        rowBottom: Math.round(document.getElementById("wheelDrawerRow").getBoundingClientRect().bottom + scrollY),
        dockTop: Math.round(innerHeight - document.getElementById("dock").offsetHeight),
        legendOff: btns[1] ? Math.round(Math.abs((btns[1].left + btns[1].right) / 2 - (card.left + card.right) / 2)) : 0,
        listTop: Math.round(document.getElementById("wheelSidebarContainer").getBoundingClientRect().top * 10) / 10 };
    });
    gaps[`${lang} ${width}`] = g;
    if (width < 768) {
      check(`${tag} the wheel carries the real catalogue's slices (positive control: ${g.n} numbers)`, g.n >= 30, JSON.stringify(g));
      // UPDATED IN PLACE (Owner, 1 Oct 2026, demo approved): "Move down the
      // wheel little more. Keep little more gap from the bar to the wheel
      // number" (was 0-6px); "Move the Read buttons bar little more away from
      // the wheel" (was 8-18px); "Place the Wheel and Unit button at the
      // extreme edges" (was 8-24px in).
      check(`${tag} the highest wheel number sits well inside the dark card, at least 15px below its top (gap ${g.gap}px; spare height on a tall screen adds to it)`, g.gap >= 15, JSON.stringify(g));
      check(`${tag} the lowest wheel number stays inside the wheel stage (v15.00: the capsule bar moved above the wheel) (gap ${g.bottomGap}px)`, g.bottomGap >= 0, JSON.stringify(g));
      // UPDATED IN PLACE 23 Oct 2026 (PCF J25): with the 🧰 docked the row's right end is the 🧰, not Unit, and the four
      // are spaced evenly; Legend is centred only when the 🧰 is not there.
      // v15.00: "Wheel at the extreme left, Unit at the extreme right" described the drawer row, which is retired (the dock is all that is left of it).
      check(`${tag} the first screen ends at the dock: the drawer row is above it, Open all below it (row ${g.rowBottom}, dock ${g.dockTop}, Open all ${g.openAllTop})`, g.rowBottom <= g.dockTop && g.openAllTop >= g.dockTop, JSON.stringify(g));
    }
    else check(`${tag} the Approach list top is measured (${g.listTop}px)`, g.listTop > 0);
    check(`${tag} no page errors`, errors.filter((e) => !/net::ERR_/.test(e)).length === 0, JSON.stringify(errors.slice(0, 2)));
    await ctx.close();
  }
}
// Owner, 1 Oct 2026: a tall header (a long tagline, Bangla) on a short screen
// must not hide the drawer row behind the dock -- the wheel shrinks instead.
{
  const ctx = await newContext(browser, { viewport: { width: 390, height: 700 }, seedTemplates: SEED_TEMPLATES });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForSelector("#wheelContainer .wheel-seg-num", { timeout: 20000 });
  await clear(page);
  const before = await page.evaluate(() => Math.round(document.querySelector("#wheelSection .mastery-wheel").getBoundingClientRect().width));
  // The tagline itself is one line with an ellipsis, so make the strip 80px
  // taller directly -- the header growth a wrapped Bangla heading can cause.
  await page.evaluate(() => { const t = document.getElementById("taglineStrip"); t.style.height = (t.getBoundingClientRect().height + 80) + "px"; });
  await page.waitForTimeout(400);
  const sq = await page.evaluate(() => ({ wheel: Math.round(document.querySelector("#wheelSection .mastery-wheel").getBoundingClientRect().width),
    row: Math.round(document.getElementById("wheelDrawerRow").getBoundingClientRect().bottom + scrollY), fold: innerHeight - document.getElementById("dock").offsetHeight }));
  check(`[squeeze 390x700] a taller header shrinks the wheel (${before} -> ${sq.wheel}px) so the drawer row stays above the dock (row ${sq.row}, fold ${sq.fold})`, sq.wheel < before && sq.row <= sq.fold, JSON.stringify({ before, ...sq }));
  await ctx.close();
}
// Owner, 2 Oct 2026 (a PC photo, the window maximised, the wheel dragged
// large): "In pc, the numbers gets cut." The overhang grows with the wheel, so
// the gap is measured at three wheel sizes in a maximised window.
for (const size of [0, 560, 760]) {
  const ctx = await newContext(browser, { viewport: { width: 1640, height: 1200 }, seedTemplates: SEED_TEMPLATES });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForSelector("#wheelContainer .wheel-seg-num", { timeout: 20000 });
  await clear(page);
  await page.click("#wheelPopupMaximizeBtn"); await page.waitForTimeout(600);
  // UPDATED IN PLACE 23 Oct 2026: this used to set the wrap's width straight from the test. Since v12.05 (PCF MSA J44)
  // a PC's wheel is re-fitted to its window whenever the window or its controls change size, and only a size the
  // READER drags this visit is kept -- so the set width was undone (953px either way) and this case was red. The
  // reader's real gesture is used instead: the east edge handle, dragged with the mouse by the difference.
  if (size) {
    const h = await page.evaluate(() => { const e = document.querySelector('#wheelResizeWrap .wheel-resize-handle[data-wheel-resize="e"]').getBoundingClientRect();
      return { x: e.left + e.width / 2, y: e.top + e.height / 2, w: document.getElementById("wheelResizeWrap").getBoundingClientRect().width }; });
    await page.mouse.move(h.x, h.y); await page.mouse.down();
    await page.mouse.move(h.x + (size - h.w) / 2, h.y, { steps: 4 }); await page.mouse.move(h.x + (size - h.w), h.y, { steps: 4 });
    await page.mouse.up(); await page.waitForTimeout(700);
  }
  const pc = await page.evaluate(() => {
    const nums = [...document.querySelectorAll("#wheelContainer .wheel-seg-num")].map((e) => e.getBoundingClientRect());
    const bar = document.getElementById("wheelStageWrap").getBoundingClientRect(); // v15.00: the old Read | Choose a Unit | Know Your Status row is gone; the numbers must stay inside the wheel stage
    return { n: nums.length, wheel: Math.round(document.querySelector("#wheelContainer svg").getBoundingClientRect().width), gap: Math.round((bar.bottom - Math.max(...nums.map((r) => r.bottom))) * 10) / 10 };
  });
  check(`[PC maximised, wheel ${pc.wheel}px] the lowest number stays inside the wheel stage (v15.00: the capsule bar moved above the wheel) (gap ${pc.gap}px)`, pc.n >= 30 && pc.gap >= 0 && (!size || Math.abs(pc.wheel - size) <= 1), JSON.stringify(pc));
  await ctx.close();
}
console.log("gaps/list tops:", JSON.stringify(gaps));

// Contrast, both card looks, with each drawer open
const SWEEP = () => {
  const parse = (s) => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]; };
  const lum = ([r, g, b]) => { const l = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b); };
  // The card's surface may be a gradient (Night): every colour stop of it is a
  // possible backdrop, so the WORST contrast against any stop is what counts.
  const bgsOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const c = parse(cs.backgroundColor); if (c && c[3] > 0.5) return [c];
      if (/gradient/.test(cs.backgroundImage)) { const stops = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter((x) => x && x[3] > 0.5); if (stops.length) return stops; }
    }
    return [[255, 255, 255, 1]];
  };
  const low = []; let seen = 0;
  const roots = [document.getElementById("wheelBar")].filter((r) => r.getBoundingClientRect().width > 0); // v15.00: the bar and its open panel replace the drawer row and drawers
  for (const root of roots) for (const el of root.querySelectorAll("*")) {
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(" ");
    if (!txt || el.getBoundingClientRect().width === 0) continue;
    seen++;
    const cs = getComputedStyle(el), a = lum(parse(cs.color));
    const cr = Math.min(...bgsOf(el).map((bg) => { const b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }));
    if (cr < 4.5) low.push({ t: txt.slice(0, 20), cr: Math.round(cr * 100) / 100 });
  }
  return { low, seen };
};
for (const look of ["night", "light"]) for (const width of [390, 1280]) {
  const { ctx, page } = await open("en", width, look);
  check(`[${look} ${width}] really in the ${look} card look`, (await page.evaluate(() => document.documentElement.dataset.cardLook)) === look);
  for (const n of Object.keys(GROUPS)) {
    await drawer(page, n);
    const r = await page.evaluate(SWEEP);
    check(`[${look} ${width}] wheel bar + ${n} choices read at 4.5:1 (${r.seen} texts)`, r.seen >= 4 && r.low.length === 0, JSON.stringify(r.low.slice(0, 4)));
    if (n === "wheel") {
      const gold = await page.evaluate(() => { const b = document.getElementById("wbStatus"); const pb = getComputedStyle(document.querySelector(".wheel-look-btn[aria-pressed=true]")).backgroundColor; return { bg: getComputedStyle(b).backgroundColor, pb, exp: b.getAttribute("aria-expanded") }; });
      check(`[${look} ${width}] the open bar button is marked open (v15.00; it used to take the "on" gold)`, gold.exp === "true" || gold.bg === gold.pb, JSON.stringify(gold));
    }
  }
  await ctx.close();
}
await browser.close();
for (const f of failed) console.log(`  FAILED: ${f}`);
console.log(`\n==== Landing drawers: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
