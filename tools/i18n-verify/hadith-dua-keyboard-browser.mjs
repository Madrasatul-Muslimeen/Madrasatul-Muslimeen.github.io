// Audit part 156 (issue #1422): a keyboard walk of Hadith Study, Hadith Collections and Dua Study. REPORT ONLY -- nothing under app/ changes.
// Per control (a ⋯/pull-down menu, a pop-up dialog, an expander, the Zab panel, the bookmark dialog):
//  (1 reach) Tab from the top of the page reaches the control; (2 opens) Enter and Space open it and aria-expanded follows where it has one;
//  (3 focus in) focus lands inside the opened panel; (4 walks) Tab reaches every visible item in order, never a hidden one;
//  (5 ring) the focused item shows an outline or box-shadow >= 3:1 against its background, day look and night look;
//  (6 escape) Escape closes it and focus returns to the control; (7 no trap) Tab past the last item is never stuck and never lands on a hidden element.
// Plus (8 page) a Tab walk of the whole page: every focused control is on screen and not covered (not under the Zab bar, not scrolled off).
// Mutations (--mutate=name, injected into the page; each must FAIL a named check): no-reach(1) no-open(2) no-aria(2) no-focus-in(3) no-walk(4) hidden-item(4)
//  no-ring(5) no-esc(6) no-esc-return(6) trap(7) offscreen(8) covered(8).
// Run from the repo root with node serve.js on 8080:
//   node tools/i18n-verify/hadith-dua-keyboard-browser.mjs [--page=dua|hcol|hstudy] [--only=id] [--width=390] [--lang=bn] [--scale=200] [--mutate=name]
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const tally = {}; // "page|n" -> [pass, fail]
const check = (page, n, name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  const k = `${page}|${n}`; tally[k] ||= [0, 0];
  if (ok) { pass++; tally[k][0]++; return; }
  fail++; tally[k][1]++;
  const parts = name.split(" / "), key = `${page} / ${parts[1]} / (${n}) ${name.replace(/^[^:]*: \(\d\) /, "").slice(0, 70)}`;
  (distinct[key] ||= { count: 0, where: [], detail: detail.slice(0, 200) }).count++;
  distinct[key].where.push(parts.slice(2).join("/").split(":")[0].replace(/ /g, ""));
  if (!process.argv.includes("--brief")) console.log(`  FAIL  ${name} ${detail}`);
};
const distinct = {};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
const RUNS = [[390, 844, "100"], [1024, 768, "100"], [390, 844, "200"]].filter(([w, , s]) => (!arg("width") || String(w) === arg("width")) && (!arg("scale") || s === arg("scale")));
const LANGS = ["en", "bn"].filter((l) => !arg("lang") || l === arg("lang"));
const NOISE = /ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|gstatic|Failed to load resource/i;
const CAP = 10; // items walked per panel

const PAGES = { dua: "/app/dua-study.html", hcol: "/app/hadith-collections.html", hstudy: "/app/hadith-study.html" };
const ROOT = { dua: "#duaRoot", hcol: "#hadithRoot", hstudy: "#hadithCorpusRoot" };
const openCard = async (P) => { await P.click('[data-dua-no="2"]'); await P.waitForSelector("[data-dua-menu]", { timeout: 8000 }); await P.waitForTimeout(500); };
const hadithDua = async (P) => { await P.click('[data-hadith-tab="dua"]'); await P.waitForSelector("[data-dua-bookmark]", { timeout: 8000 }); await P.waitForTimeout(500); };
const CONTROLS = [];
const add = (page, c) => CONTROLS.push({ page, ...c });
add("dua", { id: "groups-pull", kind: "menu", toggle: '[data-dua-pd="groups"]', panel: ".dua-pull", expanded: true });
for (const k of ["meaning", "source", "narration", "check", "poster", "share"]) add("dua", { id: "card-" + k, kind: "dialog", prep: openCard, toggle: `[data-dua-menu="${k}"]`, panel: ".dua-pop" });
add("dua", { id: "bookmark", kind: "action", prep: openCard, toggle: "[data-dua-bookmark]" });
add("dua", { id: "expander", kind: "expander", prep: async (P) => { await openCard(P); await P.click('[data-dua-menu="narration"]'); await P.waitForTimeout(400); }, toggle: ".dua-pop summary" });
add("dua", { id: "zab", kind: "dialog", toggle: "#zabCorner", toggleWide: "#zabBar > [data-zab-open]", panel: "#zabPanel", slow: true });
for (const pg of ["hcol", "hstudy"]) {
  add(pg, { id: "books-menu", kind: "menu", toggle: '[data-hadith-tab="books"]', panel: '[data-hadith-menu="books"]', expanded: true });
  add(pg, { id: "subjects-menu", kind: "menu", toggle: '[data-hadith-tab="subjects"]', panel: '[data-hadith-menu="subjects"]', expanded: true });
  add(pg, { id: "dua-bookmark", kind: "action", prep: hadithDua, toggle: "[data-dua-bookmark]" });
  add(pg, { id: "dua-expander", kind: "expander", prep: hadithDua, toggle: `${ROOT[pg]} details > summary` });
  add(pg, { id: "zab", kind: "dialog", toggle: "#zabCorner", toggleWide: "#zabBar > [data-zab-open]", panel: "#zabPanel", slow: true });
}

// ---- in-page helpers ----
const HELP = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && !e.closest("[hidden]") && cs.visibility !== "hidden" && cs.display !== "none"; };
  window.__vis = vis;
  window.__items = (panel, toggle) => [...panel.querySelectorAll("button, a[href], input, select, textarea, summary, [tabindex]")].filter((e) => !e.disabled && e !== toggle && (e.tabIndex >= 0 || e.matches("button, a[href], input, select, textarea, summary")) && vis(e)).slice(0, 10);
  const lum = (c) => { const m = (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map((v) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  window.__back = (e) => { for (let el = e; el; el = el.parentElement) { const c = getComputedStyle(el).backgroundColor; if (!/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return "rgb(255, 255, 255)"; };
  window.__ring = (e) => {
    const cs = getComputedStyle(e), bg = window.__back(e);
    let col = null;
    if (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) col = cs.outlineColor;
    else if (cs.boxShadow && cs.boxShadow !== "none") col = (cs.boxShadow.match(/rgba?\([^)]*\)/) || [])[0] || null;
    const nm = (e.textContent || e.tagName).trim().slice(0, 16);
    if (!col) return "no focus ring on " + nm;
    const r = ratio(col, bg);
    return r < 3 ? "ring " + col + " on " + bg + " is " + r.toFixed(2) + ":1 (< 3:1) on " + nm : "";
  };
  window.__label = (e) => e ? (e.dataset?.k56 ?? "") + ":" + (e.id || (e.textContent || "").trim().slice(0, 14)) : "";
};

// ---- mutations, injected into the page ----
const MUT_INIT = ([m, c]) => {
  const q = (s) => document.querySelector(s);
  if (m === "no-reach") { const f = () => q(c.toggle)?.setAttribute("tabindex", "-1"); f(); new MutationObserver(f).observe(document.documentElement, { childList: true, subtree: true }); }
  if (m === "no-open") for (const t of ["keydown", "keyup"]) window.addEventListener(t, (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches?.(c.toggle)) e.preventDefault(); }, true);
  if (m === "no-aria") new MutationObserver(() => { const t = q(c.toggle); if (t && t.getAttribute("aria-expanded") === "true") t.setAttribute("aria-expanded", "false"); }).observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ["aria-expanded"] });
  if (m === "no-focus-in") window.addEventListener("keyup", (e) => { if (e.key === "Enter" || e.key === " ") setTimeout(() => document.activeElement?.blur(), 60); }, true);
  if (m === "no-ring") { const s = document.createElement("style"); s.textContent = "*:focus,*:focus-visible{outline:none!important;box-shadow:none!important}"; document.head.appendChild(s); }
  if (m === "no-esc") window.addEventListener("keydown", (e) => { if (e.key === "Escape") e.stopImmediatePropagation(); }, true);
  if (m === "no-esc-return") window.addEventListener("keydown", (e) => { if (e.key === "Escape") setTimeout(() => document.activeElement?.blur(), 20); }, true);
  if (m === "trap") window.addEventListener("keydown", (e) => { if (e.key === "Tab" && !e.shiftKey && window.__trapLast && document.activeElement === window.__trapLast) { e.preventDefault(); } }, true);
  if (m === "offscreen") { const b = document.createElement("button"); b.textContent = "off"; b.style.cssText = "position:fixed;top:-300px;left:0"; document.body.prepend(b); }
  if (m === "covered") { const d = document.createElement("div"); d.style.cssText = "position:fixed;left:0;right:0;top:0;height:100vh;z-index:99999;background:rgba(0,0,0,.01)"; document.body.appendChild(d); }
};
const MUT_OPEN = ([m, c]) => {
  const q = (s) => document.querySelector(s);
  const panel = q(c.panel);
  if (m === "no-walk" && panel) { const l = window.__items(panel, q(c.toggle)); if (l[1]) l[1].setAttribute("tabindex", "-1"); }
  if (m === "hidden-item" && panel) { const a = document.createElement("a"); a.href = "#"; a.setAttribute("aria-label", "ghost"); a.style.cssText = "display:inline-block;width:0;height:0;overflow:hidden;padding:0;border:0"; const l = window.__items(panel, q(c.toggle)); (l[1]?.parentElement || panel).insertBefore(a, l[1] || null); }
  if (m === "trap" && panel) { const l = window.__items(panel, q(c.toggle)); window.__trapLast = l[l.length - 1]; }
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let views = 0;
const press = async (P, key, wait = 110) => { await P.keyboard.press(key); if (wait) await P.waitForTimeout(wait); };

async function load(P, page, c, scale) {
  await P.goto(new URL(PAGES[page], P.url()).href, { waitUntil: "networkidle" });
  await P.waitForTimeout(900);
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay, .app-splash-overlay').forEach((e) => e.remove()));
  await P.evaluate(() => document.documentElement.setAttribute("data-card-look", "light"));
  if (scale !== "100") await P.evaluate((s) => { document.documentElement.style.fontSize = s + "%"; }, scale);
  await P.evaluate(HELP);
  if (MUTATE && c) await P.evaluate(MUT_INIT, [MUTATE, { toggle: c.toggle, panel: c.panel }]).catch(() => {});
  if (c?.prep) await c.prep(P);
  await P.evaluate(HELP);
}
const state = (P, c) => P.evaluate(({ c }) => {
  const t = document.querySelector(c.toggle), p = c.panel ? document.querySelector(c.panel) : null, a = document.activeElement;
  const open = c.kind === "expander" ? !!t?.parentElement?.open : !!(p && window.__vis(p));
  const hidden = !!(a && a !== document.body && !window.__vis(a));
  return { ex: t?.getAttribute("aria-expanded"), open, inPanel: !!(p && a && p.contains(a) && a !== t), onToggle: a === t, hiddenFocus: hidden, body: a === document.body || !a, label: window.__label(a) };
}, { c });

async function reach(P, c) {
  await P.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  for (let i = 0; i < 220; i++) {
    await P.keyboard.press("Tab");
    if (await P.evaluate((s) => document.activeElement?.matches(s), c.toggle)) return i + 1;
  }
  return 0;
}

async function walkControl(P, page, c0, tag) {
  const c = { ...c0 }; delete c.prep; // functions cannot be serialised into the page
  const C =(n, name, ok, d) => check(page, n, `${tag}: (${n}) ${name}`, ok, d);
  const exists = await P.$(c.toggle);
  if (!exists) { C(0, "the control was found (positive control)", false, c.toggle); return; }
  views++;
  const steps = await reach(P, c);
  C(1, "Tab from the top reaches the control", steps > 0, "after 220 Tabs");
  if (!steps) await P.focus(c.toggle).catch(() => {});
  if (c.kind === "expander" || c.kind === "action") {
    // an expander (<details>) or a one-tap action (the Dua 🔖, which saves at once and has no dialog): Enter and Space each change it
    const mark = () => P.evaluate(({ c }) => c.kind === "action" ? document.querySelector(c.toggle)?.textContent.trim() : String(!!document.querySelector(c.toggle)?.parentElement?.open), { c });
    for (const key of ["Enter", "Space"]) {
      const before = await mark();
      await press(P, key, 400);
      const after = await mark();
      const s = await state(P, c);
      C(2, `${key} ${c.kind === "action" ? "does its action" : "toggles the expander"}`, after !== before, before + " -> " + after);
      if (key === "Enter") {
        const rings = [];
        for (const look of ["light", "night"]) { await P.evaluate((l) => document.documentElement.setAttribute("data-card-look", l), look); rings.push(await P.evaluate((s) => window.__ring(document.querySelector(s)), c.toggle)); }
        C(5, "focused expander shows a >= 3:1 ring, day and night", rings.every((r) => r === ""), rings.filter(Boolean).join(" | "));
        await P.evaluate(() => document.documentElement.setAttribute("data-card-look", "light"));
      }
    }
    await press(P, "Tab", 120);
    const s7 = await state(P, c);
    C(7, "Tab from the expander moves on and never lands on a hidden element", !s7.hiddenFocus && !s7.onToggle, JSON.stringify(s7));
    return;
  }
  // ---- opens (Enter), focus in, walk, rings, trap, escape ----
  await P.focus(c.toggle);
  await press(P, "Enter", c.slow ? 700 : 200);
  if (MUTATE) await P.evaluate(MUT_OPEN, [MUTATE, { toggle: c.toggle, panel: c.panel }]).catch(() => {});
  let s = await state(P, c);
  C(2, "Enter opens it", s.open, JSON.stringify(s));
  if (c.expanded) C(2, "aria-expanded follows (true while open)", s.ex === "true", JSON.stringify(s));
  C(3, "after opening, focus is inside the panel", s.inPanel, JSON.stringify(s));
  const exp = await P.evaluate(({ c }) => { const l = window.__items(document.querySelector(c.panel), document.querySelector(c.toggle)); l.forEach((e, i) => { e.dataset.k56 = String(i); }); l[0]?.focus(); return l.map((e, i) => String(i) + ":" + (e.id || (e.textContent || "").trim().slice(0, 14))); }, { c });
  const seen = [], rings = [], hid = [];
  for (let i = 0; i < exp.length; i++) {
    const st = await state(P, c);
    seen.push(st.label); if (st.hiddenFocus) hid.push(st.label);
    rings.push(await P.evaluate(() => window.__ring(document.activeElement)));
    if (i < exp.length - 1) await press(P, "Tab", 80);
  }
  C(4, `Tab reaches all ${exp.length} visible items in order, none hidden`, exp.length > 0 && JSON.stringify(seen) === JSON.stringify(exp) && hid.length === 0, "expected " + JSON.stringify(exp) + " saw " + JSON.stringify(seen));
  C(5, "every focused item shows a >= 3:1 ring, day look", exp.length > 0 && rings.every((r) => r === ""), rings.filter(Boolean).slice(0, 2).join(" | "));
  await P.evaluate(() => document.documentElement.setAttribute("data-card-look", "night"));
  const nr = [];
  await P.evaluate(({ c }) => window.__items(document.querySelector(c.panel), document.querySelector(c.toggle))[0]?.focus(), { c });
  for (let i = 0; i < exp.length; i++) { nr.push(await P.evaluate(() => window.__ring(document.activeElement))); if (i < exp.length - 1) await press(P, "Tab", 60); }
  C(5, "every focused item shows a >= 3:1 ring, night look", exp.length > 0 && nr.every((r) => r === ""), nr.filter(Boolean).slice(0, 2).join(" | "));
  await P.evaluate(() => document.documentElement.setAttribute("data-card-look", "light"));
  // 7: Tab past the last item
  const last = await P.evaluate(({ c }) => { const l = window.__items(document.querySelector(c.panel), document.querySelector(c.toggle)); const e = l[l.length - 1]; e?.focus(); return window.__label(e); }, { c });
  await press(P, "Tab", 200);
  const s7 = await state(P, c);
  C(7, "Tab past the last item is not stuck and not on a hidden element", !s7.hiddenFocus && s7.label !== last, JSON.stringify(s7) + " last=" + last);
  // 6: Escape, from inside the panel
  await P.evaluate(({ c }) => { const p = document.querySelector(c.panel); if (p && window.__vis(p)) window.__items(p, document.querySelector(c.toggle))[0]?.focus(); }, { c });
  await press(P, "Escape", c.slow ? 500 : 200);
  s = await state(P, c);
  C(6, "Escape closes it (aria-expanded false where present)", !s.open && (!c.expanded || s.ex === "false"), JSON.stringify(s));
  C(6, "after Escape, focus returns to the control that opened it", s.onToggle, JSON.stringify(s));
  // 2 again, with Space
  if (!s.open) {
    await P.focus(c.toggle);
    await press(P, "Space", c.slow ? 700 : 200);
    const sp = await state(P, c);
    C(2, "Space opens it", sp.open, JSON.stringify(sp));
    await press(P, "Escape", 300);
  }
}

// 8: whole page walk
async function pageWalk(P, page, tag) {
  await load(P, page, null, "100").catch(() => {});
  if (MUTATE) await P.evaluate(MUT_INIT, [MUTATE, {}]).catch(() => {});
  await P.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  const bad = []; let n = 0, prev = "";
  for (let i = 0; i < 140; i++) {
    await P.keyboard.press("Tab"); await P.waitForTimeout(15);
    const r = await P.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return { body: true };
      const b = e.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
      const inView = b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < vh && b.right > 0 && b.left < vw;
      let covered = false;
      if (inView) { const x = Math.min(Math.max(b.left + b.width / 2, 1), vw - 1), y = Math.min(Math.max(b.top + Math.min(b.height / 2, 20), 1), vh - 1); const top = document.elementFromPoint(x, y); covered = !!top && !(e === top || e.contains(top) || top.contains(e)); }
      const same = window.__lastTab === e; window.__lastTab = e;
      return { same, label: (e.id || e.tagName + "." + String(e.className).slice(0, 20) + " " + (e.textContent || "").trim().slice(0, 14)), inView, covered };
    });
    if (r.body) { if (n > 5) break; continue; }
    n++;
    if (r.same) { bad.push("stuck on " + r.label); break; }
    prev = r.label;
    if (!r.inView) bad.push("off screen: " + r.label);
    else if (r.covered) bad.push("covered: " + r.label);
  }
  check(page, 8, `${tag}: (8 page) every one of ${n} Tab stops is on screen and not covered`, n > 5 && bad.length === 0, bad.slice(0, 3).join(" | "));
}

for (const page of Object.keys(PAGES)) {
  if (arg("page") && arg("page") !== page) continue;
  for (const [w, h, scale] of RUNS) for (const lang of LANGS) {
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const { page: P, errors } = await openPage(ctx, PAGES[page]);
    for (const c0 of CONTROLS.filter((x) => x.page === page && (!arg("only") || x.id.includes(arg("only"))))) {
      const c = c0.toggleWide && w >= 768 ? { ...c0, toggle: c0.toggleWide } : c0; // the Zab bar's own button replaces the 🧰 corner from 768px
      const tag = `${page} / ${c.id} / ${w} / ${lang} / ${scale}%`;
      try { await load(P, page, c, scale); } catch (e) { check(page, 0, `${tag}: loaded (positive control)`, false, String(e.message).slice(0, 120)); continue; }
      try { await walkControl(P, page, c, tag); } catch (e) { check(page, 0, `${tag}: walked without a script error`, false, String(e.message).slice(0, 160)); }
    }
    if (!arg("only")) await pageWalk(P, page, `${page} / ${w} / ${lang} / ${scale}%`).catch((e) => check(page, 0, `${page}: page walk ran`, false, String(e.message).slice(0, 120)));
    const pe = errors.filter((e) => !NOISE.test(e));
    check(page, 9, `${page} / ${w} / ${lang} / ${scale}%: no page errors`, pe.length === 0, pe.slice(0, 2).join(" | "));
    await ctx.close();
  }
}
console.log(`\ncontrols walked: ${views}`);
for (const [k, [p, f]] of Object.entries(tally).sort()) console.log(`  ${k.padEnd(10)} pass ${p}  fail ${f}`);
console.log("\ndistinct defects (control / check: runs failing):");
for (const [k, v] of Object.entries(distinct).sort()) console.log(`  ${k}  x${v.count}  [${v.where.join(" ")}]\n      ${v.detail}`);
console.log(pass + " passed, " + fail + " failed" + (MUTATE ? " (mutation: " + MUTATE + ")" : ""));
await browser.close();
process.exit(fail || views === 0 ? 1 : 0);
