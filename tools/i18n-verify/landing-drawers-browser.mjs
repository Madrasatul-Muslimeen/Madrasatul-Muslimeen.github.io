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
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
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
const drawer = (page, name) => page.click(`[data-wheel-drawer="${name}"]`);
const vis = (page, name) => page.evaluate((n) => { const p = document.querySelector(`[data-wheel-drawer-panel="${n}"]`); const r = p.getBoundingClientRect(); return getComputedStyle(p).display !== "none" && r.width > 0 && r.height > 0; }, name);
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
      return { sameParent: intro.parentElement === row.parentElement, between, introBottom: intro.getBoundingClientRect().bottom, rowTop: row.getBoundingClientRect().top, buttons: [...row.querySelectorAll("button")].map((b) => ({ t: b.textContent.trim(), h: b.getBoundingClientRect().height, exp: b.getAttribute("aria-expanded") })) };
    });
    check(`${tag} order: Read bar, then the drawer row, nothing visible between them while closed`, o.sameParent && o.between.length === 0 && o.rowTop >= o.introBottom - 1, JSON.stringify(o));
    check(`${tag} three drawer buttons, 40px+, all closed`, o.buttons.length === 3 && o.buttons.every((b) => b.h >= 40 && b.exp === "false"), JSON.stringify(o.buttons));
    check(`${tag} the three names go through t()`, lang === "en" ? o.buttons.map((b) => b.t).join("|").replace(/▴/g, "") === "Wheel|Legend|Unit" : o.buttons.every((b) => /[ঀ-৿]/.test(b.t)), JSON.stringify(o.buttons.map((b) => b.t)));
    let closed = true; for (const n of Object.keys(GROUPS)) closed = closed && !(await vis(page, n));
    check(`${tag} closed: none of the three groups is visible (computed display)`, closed);

    // Open: above the row, in the screen, one at a time
    for (const n of Object.keys(GROUPS)) {
      await drawer(page, n);
      const s = await page.evaluate(([n, sel, vw]) => {
        const p = document.querySelector(`[data-wheel-drawer-panel="${n}"]`), r = p.getBoundingClientRect(), row = document.getElementById("wheelDrawerRow").getBoundingClientRect(), intro = document.getElementById("wheelIntroSettled").getBoundingClientRect();
        const btn = document.querySelector(`[data-wheel-drawer="${n}"]`);
        return { above: r.bottom <= row.top + 1, belowRead: r.top >= intro.bottom - 1, inside: r.left >= -0.5 && r.right <= vw + 0.5, holds: p.contains(document.querySelector(sel)), exp: btn.getAttribute("aria-expanded"), caret: getComputedStyle(btn.querySelector(".wheel-drawer-caret")).transform, over: document.documentElement.scrollWidth - innerWidth };
      }, [n, GROUPS[n], width]);
      check(`${tag} ${n} opens above the drawer row, inside the screen, holding its own group`, (await vis(page, n)) && s.above && s.belowRead && s.inside && s.holds && s.exp === "true" && s.over <= 1, JSON.stringify(s));
      check(`${tag} ${n}: caret turns when open`, s.caret !== "none");
      const others = []; for (const m of Object.keys(GROUPS)) if (m !== n) others.push(await vis(page, m));
      check(`${tag} ${n} open: one at a time (the others are closed)`, others.every((x) => !x));
      // open another: first closes
      const next = Object.keys(GROUPS)[(Object.keys(GROUPS).indexOf(n) + 1) % 3];
      await drawer(page, next);
      check(`${tag} opening ${next} closes ${n} (one-at-a-time)`, !(await vis(page, n)) && (await vis(page, next)) && (await page.evaluate((x) => document.querySelector(`[data-wheel-drawer="${x}"]`).getAttribute("aria-expanded"), n)) === "false");
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
      const bar = document.getElementById("wheelIntroSettled").getBoundingClientRect();
      // "Place those wheel buttons as marked up": Wheel to the left edge, Unit to the right.
      const btns = [...document.querySelectorAll("#wheelDrawerRow .wheel-drawer-btn")].map((b) => b.getBoundingClientRect());
      return { n: nums.length, gap: Math.round((top - card.top) * 10) / 10, bottomGap: Math.round((bar.top - bottom) * 10) / 10,
        leftInset: Math.round(btns[0].left - card.left), rightInset: Math.round(card.right - btns[2].right),
        // Owner, 1 Oct 2026 (demo approved, "go"): the first screen ends at the
        // dock -- Open all starts below it, the drawer row is above it.
        // Page coordinates (an earlier step may have scrolled): the fold is the
        // screen height less the pinned dock.
        openAllTop: Math.round(document.querySelector("#wheelSection .ways-toggle-all").getBoundingClientRect().top + scrollY),
        rowBottom: Math.round(document.getElementById("wheelDrawerRow").getBoundingClientRect().bottom + scrollY),
        dockTop: Math.round(innerHeight - document.getElementById("dock").offsetHeight),
        legendOff: Math.round(Math.abs((btns[1].left + btns[1].right) / 2 - (card.left + card.right) / 2)),
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
      check(`${tag} the lowest wheel number clears the capsule bar by 18-28px (gap ${g.bottomGap}px)`, g.bottomGap >= 18 && g.bottomGap <= 28, JSON.stringify(g));
      check(`${tag} Wheel sits at the extreme left edge, Unit at the extreme right (insets ${g.leftInset}/${g.rightInset}px), Legend centred`, g.leftInset <= 10 && g.rightInset <= 10 && g.leftInset >= 2 && g.rightInset >= 2 && g.legendOff <= 3, JSON.stringify(g));
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
  const roots = [document.getElementById("wheelDrawerRow"), ...document.querySelectorAll(".wheel-drawer-panel")].filter((r) => r.getBoundingClientRect().width > 0);
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
    check(`[${look} ${width}] drawer row + ${n} choices read at 4.5:1 (${r.seen} texts)`, r.seen >= 4 && r.low.length === 0, JSON.stringify(r.low.slice(0, 4)));
    if (n === "wheel") {
      const gold = await page.evaluate(() => { const b = document.querySelector('[data-wheel-drawer="wheel"]'); const pb = getComputedStyle(document.querySelector(".wheel-look-btn[aria-pressed=true]")).backgroundColor; return { bg: getComputedStyle(b).backgroundColor, pb }; });
      check(`[${look} ${width}] the open drawer button uses the "on" style`, gold.bg === gold.pb, JSON.stringify(gold));
    }
  }
  await ctx.close();
}
await browser.close();
console.log(`\n==== Landing drawers: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
