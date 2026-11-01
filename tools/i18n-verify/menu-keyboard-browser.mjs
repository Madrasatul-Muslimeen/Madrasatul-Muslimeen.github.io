// Audit part 154 (issue #1415): a keyboard walk of the ⋯ menus -- the note window's ⋯ sheet (notes.html, journey-map.html) and the journey-map page ⋯ menu.
// bookmarks.html and records.html have no ⋯ menu (grep in the PR), so there is nothing to walk there.
// Per menu: (1 opens) Enter and Space open it and aria-expanded follows; (2 focus in) focus lands on a visible item; (3 walks) Tab reaches every visible item
//  in order, never a hidden one; (4 ring) each focused item shows an outline or box-shadow >= 3:1 against its background, day and night; (5 activates) Enter
//  does what a click does, two items; (6 escape) Escape closes and focus returns to the ⋯ button; (7 no trap) Tab past the last item leaves the menu closed or inside it.
// Mutations (--mutate=..., one ctx.route per file by pathname, must FAIL): no-open, no-focus-in, no-esc, no-esc-return, no-tab-close, no-walk, no-ring, no-activate.
// Run from the repo root with node serve.js on 8080:
//   node tools/i18n-verify/menu-keyboard-browser.mjs [--page=notes|journey] [--width=390] [--lang=bn] [--scale=200] [--mutate=name]
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) pass++; else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
const RUNS = [[390, 844, "100"], [1024, 768, "100"], [390, 844, "200"]].filter(([w, , s]) => (!arg("width") || String(w) === arg("width")) && (!arg("scale") || s === arg("scale")));
const LANGS = ["en", "bn"].filter((l) => !arg("lang") || l === arg("lang"));
const NOISE = /ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i;

const SEED = `(function () {
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1, createdBy: "test-uid" }, TS = "2026-09-01T10:00:00.000Z";
  DATA.notes = DATA.notes || []; DATA.noteSources = DATA.noteSources || []; DATA.noteRevisions = DATA.noteRevisions || [];
  function N(c, title, body) {
    var id = c.repeat(32);
    DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", visibility: "private", createdAt: TS, updatedAt: TS }, own));
    DATA.noteSources.push(Object.assign({ _id: "t1__s-" + id, sourceLinkId: "s-" + id, noteId: id, sourceKey: "ayah:2:255", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active", createdAt: TS, updatedAt: TS }, own));
  }
  N("a", "Reflections on the throne verse and what my teacher said after Fajr about its virtues", "<p>First body with a long line of text.</p><h1>Heading one</h1><p>x</p>");
  N("b", "আয়াতুল কুরসির তাফসির ও আমার ব্যক্তিগত অনুধাবন নিয়ে একটি দীর্ঘ নোট", "<p>দ্বিতীয় নোটের বিবরণ।</p>");
})();`;
const NOTE_OPEN = ".note-card[data-note-id] [data-note-window]";
const PAGES = [
  { id: "notes", path: "/app/notes.html?unit=" + encodeURIComponent("ayah:2:255") + "&label=" + encodeURIComponent("Al-Baqarah 2:255, Ayat al-Kursi with tajweed practice (morning)") + "&back=1", menus: ["sheet"] },
  { id: "journey", path: "/app/journey-map.html", menus: ["page", "sheet"], pre: async (P) => { for (let i = 0; i < 6; i++) { await P.evaluate(() => document.querySelectorAll("[data-folder-toggle][aria-expanded=false]").forEach((b) => b.click())); await P.waitForTimeout(150); } await P.click('.view-toggle-btn[data-view="timeline"]').catch(() => {}); await P.waitForTimeout(500); } },
].filter((p) => !arg("page") || p.id === arg("page"));
const MENUS = {
  page: { toggle: '[data-bar-palette-toggle="pageMenu"]', menu: '[data-bar-palette="pageMenu"]' },
  sheet: { toggle: ".note-win [data-pane-menu-btn]", menu: ".note-win [data-pane-menu]" },
};

const FILE_MUT = {
  "no-open": ["app/js/bar-palette.js", 'toggle.setAttribute("aria-expanded", String(willOpen));', ""],
  "no-esc": ["app/js/bar-palette.js", 'if (e.key === "Escape") closeAllBarPalettes(null);', ""],
  "no-focus-in": ["app/js/palette-keys.js", "if (first) first.focus();", ""],
  "no-esc-return": ["app/js/palette-keys.js", 'if (inside && !pop.classList.contains("open")) toggle.focus();', ""],
  "no-ring": ["app/js/palette-keys.js", "document.head.appendChild(ringStyle);", ""],
  "no-tab-close": ["app/js/palette-keys.js", "if (wrap && !wrap.contains(e.target)", "if (false && !wrap.contains(e.target)"],
};

// ---- in-page helpers (serialised into each evaluate) ----
const HELP = () => {
  const vis = (e) => e.getClientRects().length > 0 && !e.closest("[hidden]") && getComputedStyle(e).visibility !== "hidden" && getComputedStyle(e).display !== "none";
  window.__items = (menu, toggle) => [...menu.querySelectorAll("button, a[href], input, select, textarea, [tabindex]")].filter((e) => !e.disabled && e !== toggle && e.getAttribute("tabindex") !== "-1" && vis(e));
  const lum = (c) => { const m = (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map((v) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  window.__back = (e) => { for (let el = e; el; el = el.parentElement) { const c = getComputedStyle(el).backgroundColor; if (!/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return "rgb(255, 255, 255)"; };
  // the ring of the focused element: outline if drawn, else the first colour of a box-shadow; returns a problem string or ""
  window.__ring = (e) => {
    const cs = getComputedStyle(e), bg = window.__back(e);
    let col = null;
    if (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) col = cs.outlineColor;
    else if (cs.boxShadow && cs.boxShadow !== "none") col = (cs.boxShadow.match(/rgba?\([^)]*\)/) || [])[0] || null;
    if (!col) return "no focus ring on " + (e.textContent || e.tagName).trim().slice(0, 16);
    const r = ratio(col, bg);
    return r < 3 ? "ring " + col + " on " + bg + " is " + r.toFixed(2) + ":1 (< 3:1) on " + (e.textContent || e.tagName).trim().slice(0, 16) : "";
  };
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let views = 0;

async function press(P, key) { await P.keyboard.press(key); await P.waitForTimeout(120); }
const state = (P, M) => P.evaluate(({ M }) => {
  const t = document.querySelector(M.toggle), m = document.querySelector(M.menu), a = document.activeElement;
  return { ex: t?.getAttribute("aria-expanded"), open: !!m?.classList.contains("open"), inMenu: !!(m && a && m.contains(a) && a !== t), onToggle: a === t, hiddenFocus: !!(a && a !== document.body && a.getClientRects().length === 0), label: a ? (a.id || (a.textContent || "").trim().slice(0, 20)) : "" };
}, { M });

async function walkMenu(P, tag, M, openFresh) {
  // 1 opens: Enter then Space
  for (const key of ["Enter", "Space"]) {
    await openFresh();
    await P.focus(M.toggle); await press(P, key); await P.waitForTimeout(150);
    const s = await state(P, M);
    check(`${tag}: (1 opens) ${key} on ⋯ opens the menu and aria-expanded follows`, s.open && s.ex === "true", JSON.stringify(s));
    if (key === "Enter") {
      // 2 focus goes in
      check(`${tag}: (2 focus in) after opening focus is on an item inside the menu`, s.inMenu, JSON.stringify(s));
    }
    if (key === "Enter") continue;
    await press(P, "Escape");
  }
  // 3 walks (Space-opened menu is open; reopen with Enter for a clean start)
  await openFresh();
  await P.focus(M.toggle); await press(P, "Enter"); await P.waitForTimeout(150);
  const expected = await P.evaluate(({ M }) => { window.__helpInit?.(); return window.__items(document.querySelector(M.menu), document.querySelector(M.toggle)).map((e) => e.id || (e.textContent || "").trim().slice(0, 20)); }, { M });
  // start from the first item
  const first = await P.evaluate(({ M }) => { const it = window.__items(document.querySelector(M.menu), document.querySelector(M.toggle))[0]; it?.focus(); return !!it; }, { M });
  const seen = [], rings = [], backs = [];
  for (let i = 0; i < expected.length && first; i++) {
    const s = await state(P, M);
    seen.push(s.label); if (s.hiddenFocus) backs.push("hidden element focused: " + s.label);
    rings.push(await P.evaluate(() => window.__ring(document.activeElement)));
    if (i < expected.length - 1) await press(P, "Tab");
  }
  check(`${tag}: (3 walks) Tab reaches all ${expected.length} visible items in order, none hidden`, first && JSON.stringify(seen) === JSON.stringify(expected) && backs.length === 0, "expected " + JSON.stringify(expected) + " saw " + JSON.stringify(seen) + backs.join(";"));
  check(`${tag}: (4 ring) all ${expected.length} focused items show a >= 3:1 ring, day look`, rings.every((r) => r === ""), rings.filter(Boolean).slice(0, 3).join(" | "));
  // night look ring
  await P.evaluate(() => document.documentElement.setAttribute("data-card-look", "night")); await P.waitForTimeout(150);
  const nr = [];
  await P.evaluate(({ M }) => window.__items(document.querySelector(M.menu), document.querySelector(M.toggle))[0]?.focus(), { M });
  for (let i = 0; i < expected.length; i++) { nr.push(await P.evaluate(() => window.__ring(document.activeElement))); if (i < expected.length - 1) await press(P, "Tab"); }
  check(`${tag}: (4 ring) all ${expected.length} focused items show a >= 3:1 ring, night look`, nr.every((r) => r === ""), nr.filter(Boolean).slice(0, 3).join(" | "));
  await P.evaluate(() => document.documentElement.removeAttribute("data-card-look"));
  // 7 no trap: Tab past the last item
  await P.evaluate(({ M }) => { const l = window.__items(document.querySelector(M.menu), document.querySelector(M.toggle)); l[l.length - 1]?.focus(); }, { M });
  await press(P, "Tab"); await P.waitForTimeout(150);
  const t7 = await state(P, M);
  check(`${tag}: (7 no trap) Tab past the last item leaves the menu closed or keeps focus inside it, never on a hidden element`, !t7.hiddenFocus && (!t7.open || t7.inMenu), JSON.stringify(t7));
  // 6 escape
  await openFresh();
  await P.focus(M.toggle); await press(P, "Enter"); await P.waitForTimeout(150);
  await press(P, "Escape"); await P.waitForTimeout(150);
  const s6 = await state(P, M);
  check(`${tag}: (6 escape) Escape closes the menu (aria-expanded false) and focus returns to ⋯`, !s6.open && s6.ex === "false" && s6.onToggle, JSON.stringify(s6));
}

// 5 activates: two items per menu
async function activate(P, tag, M, kind, openFresh) {
  await openFresh(); await P.focus(M.toggle); await press(P, "Enter"); await P.waitForTimeout(150);
  if (kind === "page") {
    await P.focus("#openFavouritesBtn"); await P.keyboard.press("Enter"); await P.waitForTimeout(500);
    const dlg = await P.evaluate(() => [...document.querySelectorAll("dialog[open], [role=dialog], .modal, .mm-modal")].some((e) => e.getClientRects().length > 0));
    check(`${tag}: (5 activates) Enter on ⭐ Favourites opens its dialog`, dlg);
    await P.keyboard.press("Escape").catch(() => {}); await P.waitForTimeout(200);
    await openFresh(); await P.focus(M.toggle); await press(P, "Enter"); await P.waitForTimeout(150);
    const href = await P.evaluate(() => [...document.querySelectorAll('[data-bar-palette="pageMenu"] a[href]')].map((a) => a.getAttribute("href"))[0] || "");
    await P.evaluate(() => document.querySelector('[data-bar-palette="pageMenu"] a[href]').focus());
    const [nav] = await Promise.all([P.waitForURL((u) => /import/i.test(u.href), { timeout: 6000 }).then(() => true, () => false), P.keyboard.press("Enter")]);
    check(`${tag}: (5 activates) Enter on Import Notes… follows its link (${href})`, nav);
  } else {
    // Enter must leave the page in the same state a click leaves it: compare on two fresh loads, for two items
    const SIG = () => { const vis = (e) => e.getClientRects().length > 0; const p = document.querySelector(".note-win [data-pane-previews]"); return JSON.stringify({ open: !!document.querySelector(".note-win [data-pane-menu].open"), pressed: p?.getAttribute("aria-pressed") ?? null, fields: [...document.querySelectorAll(".note-win input, .note-win textarea, .note-win [contenteditable=true], [role=dialog]")].filter(vis).length }); };
    for (const sel of ["[data-pane-rename]", "[data-pane-previews]"]) {
      await openFresh(); await P.focus(M.toggle); await press(P, "Enter"); await P.waitForTimeout(150);
      const has = await P.evaluate((s) => !!document.querySelector(".note-win " + s), sel);
      await P.evaluate((s) => document.querySelector(".note-win " + s).click(), sel); await P.waitForTimeout(500);
      const viaClick = await P.evaluate(SIG);
      await openFresh(); await P.focus(M.toggle); await press(P, "Enter"); await P.waitForTimeout(150);
      await P.evaluate((s) => document.querySelector(".note-win " + s).focus(), sel); await P.keyboard.press("Enter"); await P.waitForTimeout(500);
      const viaEnter = await P.evaluate(SIG);
      check(`${tag}: (5 activates) Enter on ${sel} does what a click does`, has && viaClick === viaEnter && JSON.parse(viaEnter).pressed !== undefined, viaClick + " vs " + viaEnter);
    }
    await openFresh(); await P.focus(M.toggle); await press(P, "Enter"); await P.waitForTimeout(150);
    await P.evaluate(() => document.querySelector(".note-win .pane-menu-x")?.focus());
    await P.keyboard.press("Enter"); await P.waitForTimeout(250);
    const s = await state(P, M);
    check(`${tag}: (5 activates) Enter on the menu's × closes the menu`, !s.open && s.ex === "false", JSON.stringify(s));
  }
}

for (const pg of PAGES) for (const [w, h, scale] of RUNS) for (const lang of LANGS) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const fm = FILE_MUT[MUTATE];
  if (fm) {
    const src = fs.readFileSync(fm[0], "utf8");
    if (!src.includes(fm[1])) throw new Error("mutation " + MUTATE + ": anchor not found in " + fm[0]);
    await ctx.route((u) => new URL(u).pathname.endsWith(fm[0].replace(/^app/, "")), (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: src.split(fm[1]).join(fm[2]) }));
  }
  const { page: P, errors } = await openPage(ctx, pg.path);
  for (const mk of pg.menus) {
    const M = MENUS[mk], tag = `${pg.id} / ${mk} menu / ${w} / ${lang} / ${scale}%`;
    const openFresh = async () => {
      await P.goto(new URL(pg.path, P.url()).href, { waitUntil: "networkidle" }); await P.waitForTimeout(700);
      await P.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay, .app-splash-overlay').forEach((e) => e.remove()));
      if (pg.pre) await pg.pre(P);
      if (scale !== "100") await P.evaluate((s) => { document.documentElement.style.fontSize = s + "%"; }, scale);
      if (mk === "sheet") { await P.waitForSelector(NOTE_OPEN, { state: "attached" }); await P.evaluate((s) => document.querySelector(s).click(), NOTE_OPEN); await P.waitForSelector(".note-win", { timeout: 8000 }); await P.waitForTimeout(500); }
      await P.evaluate(HELP); await P.evaluate(() => { window.__helpInit = () => {}; });
      if (MUTATE === "no-activate") await P.evaluate(() => document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.closest("[data-pane-menu], [data-bar-palette]") && !e.target.matches("[data-bar-palette-toggle]:not(.pane-menu-x)")) e.preventDefault(); }, true));
      if (MUTATE === "no-walk") await P.evaluate(() => { const l = [...document.querySelectorAll("[data-pane-menu] button, [data-bar-palette=pageMenu] button, [data-bar-palette=pageMenu] a")]; if (l[1]) l[1].setAttribute("tabindex", "-1"); });
    };
    try {
      await openFresh();
      if (mk === "sheet" && !(await P.$(M.toggle))) throw new Error("no ⋯ button");
    } catch (e) { check(`${tag}: the page and menu were found (positive control)`, false, String(e.message).slice(0, 140)); continue; }
    views++;
    const wasNoWalk = MUTATE === "no-walk";
    if (wasNoWalk) { /* the tabindex is set inside openFresh, only items that exist then are changed */ }
    await walkMenu(P, tag, M, openFresh);
    await activate(P, tag, M, mk, openFresh);
  }
  const pe = errors.filter((e) => !NOISE.test(e));
  check(`${pg.id} / ${w} / ${lang} / ${scale}%: no page errors`, pe.length === 0, pe.slice(0, 2).join(" | "));
  await ctx.close();
}
console.log(`\nmenus walked: ${views}`);
console.log(pass + " passed, " + fail + " failed" + (MUTATE ? " (mutation: " + MUTATE + ")" : ""));
await browser.close();
process.exit(fail || views === 0 ? 1 : 0);
