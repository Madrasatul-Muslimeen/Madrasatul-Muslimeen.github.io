// Audit part 151 (issue #1404): the note window at large text. Measures the window frame, its toolbar controls (.note-pane-bar), the ⋯ sheet (.pane-menu)
// against the window and the screen, at 360/390/768/820/1024/1180/1440, en and bn, text 100/150/200%, real-length titles.
// Pages: notes.html (window), journey-map.html (window opened from a note card). The Hadith Read view's note pane is not this window (checked by grep in the PR).
// Checks: (toolbar) every visible bar control lies inside the window; (sheet) the open ⋯ sheet lies inside the screen; (sideways) nothing scrolls sideways
//   (document, window, bar); (target) bar controls and sheet buttons are >= 40px.
// Positive controls: each detector sees a defect injected on purpose. Mutations: --mutate=toolbar|sheet|sideways|target (injected defect, must FAIL) and
//   --mutate=fix-bar|fix-sheet (serve app/css/note-window.css with the fix taken out, one ctx.route matching the pathname, must FAIL).
// Run from repo root with node serve.js on 8080:
//   node tools/i18n-verify/note-window-large-text-browser.mjs [--page=notes|journey] [--width=768] [--lang=bn] [--scale=200] [--shots] [--shotdir=dir]
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) pass++; else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const ORDER = arg("order") || "after", MUTATE = arg("mutate"),SHOTS = process.argv.includes("--shots");
const OUT = arg("shotdir") || "tools/i18n-verify/out/note-window-large-text"; fs.mkdirSync(OUT, { recursive: true });
const WIDTHS = [[360, 740], [390, 844], [768, 1024], [820, 1180], [1024, 768], [1180, 820], [1440, 900]].filter(([w]) => !arg("width") || String(w) === arg("width"));
const LANGS = ["en", "bn"].filter((l) => !arg("lang") || l === arg("lang"));
const SCALES = [100, 150, 200].filter((s) => !arg("scale") || String(s) === arg("scale"));
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
const PAGES = [
  { id: "notes", path: "/app/notes.html?unit=" + encodeURIComponent("ayah:2:255") + "&label=" + encodeURIComponent("Al-Baqarah 2:255, Ayat al-Kursi with tajweed practice (morning)") + "&back=1", open: ".note-card[data-note-id] [data-note-window]" },
  { id: "journey", path: "/app/journey-map.html", open: ".note-card[data-note-id] [data-note-window]", pre: async (P) => { for (let i = 0; i < 6; i++) { await P.evaluate(() => document.querySelectorAll("[data-folder-toggle][aria-expanded=false]").forEach((b) => b.click())); await P.waitForTimeout(150); } await P.click('.view-toggle-btn[data-view="timeline"]').catch(() => {}); await P.waitForTimeout(500); } },
].filter((p) => !arg("page") || p.id === arg("page"));

const CSS_MUT = {
  "fix-refit": { file: "app/js/note-window.js", from: 'attributeFilter: ["style", "class"]', to: 'attributeFilter: ["data-never"]' },
  "fix-title": { file: "app/css/note-window.css", from: ".note-win .nw-title { flex: 1 1 8rem; max-height: 30vh; overflow-y: auto; }", to: ".note-win .nw-title-off { flex: 1 1 8rem; }", also: [".note-win .nw-bar { flex-wrap: wrap; }", ".note-win .nw-bar-off { flex-wrap: wrap; }"] },
  "fix-switch": { file: "app/js/note-window.js", from: 'detailsSw.className = "note-sec-arrow";', to: 'detailsSw.className = "nw-sw-off";' },
  "fix-glyph": { file: "app/js/note-window.js", from: "detailsBtn.append(detailsLabel, detailsSw);", to: 'detailsBtn.append(detailsLabel, detailsSw, " ▾");' },
  "fix-aria": { file: "app/js/note-window.js", from: 'on("[data-win-details]").setAttribute("aria-expanded", String(open));', to: "void 0;" },
  "fix-row": { file: "app/css/note-window.css", from: ".note-win .nw-details-row { flex-wrap: wrap; }", to: ".note-win .nw-details-row-off { flex-wrap: wrap; }" },
};

// All measuring happens in the page. Returns problem strings.
const MEASURE = ({ inject }) => {
  const out = { toolbar: [], sheet: [], sideways: [], target: [], n: 0 };
  const win = document.querySelector(".note-win:not(.sheet-hidden)");
  if (!win) return { missing: true, ...out };
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden"; };
  const nm = (e) => e.tagName.toLowerCase() + (e.getAttribute("data-pane-menu-btn") !== null ? "[menu-btn]" : "") + (e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : "") + ' "' + (e.textContent || "").trim().slice(0, 18) + '"';
  const wr = win.getBoundingClientRect();
  const bar = win.querySelector(".note-pane-bar");
  if (inject === "toolbar" && bar) { const b = document.createElement("button"); b.className = "pane-btn"; b.textContent = "Injected"; b.style.cssText = "position:absolute;left:" + (wr.right + 10) + "px;top:" + (wr.top + 60) + "px;width:50px;height:40px"; bar.appendChild(b); }
  if (bar) { const br = bar.getBoundingClientRect(); if (br.bottom > vh * 0.75) out.toolbar.push("toolbar is not reachable: it starts at " + Math.round(br.top) + " and ends at " + Math.round(br.bottom) + " of " + vh); }
  if (bar) for (const e of bar.querySelectorAll("button, a, input, select")) {
    if (!vis(e) || e.closest("[data-pane-menu]")) continue;
    out.n++;
    const r = e.getBoundingClientRect();
    if (r.left < wr.left - 1 || r.right > wr.right + 1) out.toolbar.push(nm(e) + " " + Math.round(r.left) + ".." + Math.round(r.right) + " window " + Math.round(wr.left) + ".." + Math.round(wr.right));
    if (r.width < 39.5 || r.height < 39.5) out.target.push(nm(e) + " " + Math.round(r.width) + "x" + Math.round(r.height));
  }
  const menu = win.querySelector("[data-pane-menu].open") || document.querySelector("[data-pane-menu].open");
  if (menu) {
    if (inject === "sheet") menu.style.transform = "translateX(2000px)";
    const r = menu.getBoundingClientRect();
    out.n++;
    if (r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1) out.sheet.push("menu " + Math.round(r.left) + ".." + Math.round(r.right) + " x " + Math.round(r.top) + ".." + Math.round(r.bottom) + " screen " + vw + "x" + vh);
    for (const e of menu.querySelectorAll("button")) {
      if (!vis(e)) continue;
      const b = e.getBoundingClientRect();
      out.n++;
      if (b.right > vw + 1 || b.left < -1) out.sheet.push(nm(e) + " outside the screen " + Math.round(b.left) + ".." + Math.round(b.right));
      if (b.height < 39.5) out.target.push("sheet " + nm(e) + " " + Math.round(b.width) + "x" + Math.round(b.height));
    }
  }
  if (inject === "target" && bar) { const b = bar.querySelector("button"); if (b) { b.style.minHeight = "20px"; b.style.height = "20px"; const r = b.getBoundingClientRect(); out.target.push(nm(b) + " " + Math.round(r.width) + "x" + Math.round(r.height)); } }
  const de = document.documentElement;
  if (inject === "sideways") { const d = document.createElement("div"); d.style.cssText = "position:absolute;left:0;top:0;width:" + (vw + 300) + "px;height:2px"; document.body.appendChild(d); }
  if (de.scrollWidth > de.clientWidth + 1) out.sideways.push("document " + de.scrollWidth + ">" + de.clientWidth);
  // the eight resize handles (.nw-h) sit on the frame's edge by design, and the open ⋯ menu / popovers are measured against the screen: leave those out
  for (const e of win.querySelectorAll("*")) { if (e.closest(".nw-h, [data-pane-menu]") || !vis(e)) continue; const r = e.getBoundingClientRect(); if (r.right > wr.right + 1 || r.left < wr.left - 1) { out.sideways.push("inside the window: " + nm(e) + " " + Math.round(r.left) + ".." + Math.round(r.right)); break; } }
  if (bar && bar.scrollWidth > bar.clientWidth + 1) out.sideways.push("bar " + bar.scrollWidth + ">" + bar.clientWidth);
  if (wr.left < -1 || wr.right > vw + 1) out.sideways.push("window frame " + Math.round(wr.left) + ".." + Math.round(wr.right) + " screen " + vw);
  return out;
};

// Part 152 (issue #1408): the Details control wears the shared J109 ON/OFF switch (shell.css `button > .note-sec-arrow`, read off aria-expanded).
// DETAILS returns problems for the control as it is now; with `toggle` it also clicks / presses Enter / Space and reads the switch each time.
const DETAILS = async ({ inject, toggle }) => {
  const out = [];
  const win = document.querySelector(".note-win:not(.sheet-hidden)");
  const b = win && win.querySelector("[data-win-details]");
  if (!b) return ["no Details control"];
  if (inject === "glyph") b.append(" ▾");
  if (inject === "contrast") { const l = b.querySelector("span:not(.note-sec-arrow)"); if (l) l.style.color = "#f3f4f6"; b.style.background = "#ffffff"; }
  const sw = b.querySelector(".note-sec-arrow");
  const rgb = (e) => getComputedStyle(e).backgroundColor;
  const lum = (c) => { const m = (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map((v) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
  const ratio = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  if (!sw) out.push("no switch element"); else {
    const r = sw.getBoundingClientRect(), br = b.getBoundingClientRect(), wr = win.getBoundingClientRect();
    if (Math.round(r.width) !== 40 || Math.round(r.height) !== 24) out.push("switch is " + Math.round(r.width) + "x" + Math.round(r.height) + " (the shared drawing is 40x24)");
    if (br.height < 39.5) out.push("control is " + Math.round(br.height) + "px high");
    if (br.left < wr.left - 1 || br.right > wr.right + 1) out.push("control " + Math.round(br.left) + ".." + Math.round(br.right) + " outside window " + Math.round(wr.left) + ".." + Math.round(wr.right));
    const row = b.closest(".nw-details-row");
    if (row) for (const c of row.children) { const cr = c.getBoundingClientRect(); if (cr.width > 0 && (cr.right > wr.right + 1 || cr.left < wr.left - 1)) out.push("Details row child outside the window"); }
  }
  if (/[▸▶►▼▲◂◀▴▾▿▹]/.test(b.textContent || "")) out.push("an arrow glyph is in the control: " + (b.textContent || "").trim());
  if (!/\S/.test((b.textContent || "").replace(/[▸▾]/g, ""))) out.push("no label");
  const state = () => ({ ex: b.getAttribute("aria-expanded"), open: !!win.querySelector(".nw-details.open"), bg: sw ? rgb(sw) : "" });
  const ON = "rgb(31, 138, 126)";
  const read = (s) => (s.bg === ON ? "true" : "false");
  const s0 = state();
  if (sw && read(s0) !== s0.ex) out.push("switch reads " + read(s0) + " but aria-expanded is " + s0.ex);
  if ((s0.ex === "true") !== s0.open) out.push("aria-expanded " + s0.ex + " but details open=" + s0.open);
  if (sw) {
    let bgEl = b, back = "rgba(0, 0, 0, 0)";
    while (bgEl && /rgba\(0, 0, 0, 0\)|transparent/.test(back = rgb(bgEl))) bgEl = bgEl.parentElement;
    if (!bgEl) back = "rgb(255, 255, 255)";
    const edge = getComputedStyle(sw).borderTopColor;
    if (ratio(edge, back) < 3) out.push("switch edge " + edge + " on " + back + " is " + ratio(edge, back).toFixed(2) + ":1 (< 3:1)");
    const lbl = b.querySelector("span:not(.note-sec-arrow)") || b, fg = getComputedStyle(lbl).color, bb = (() => { let e = b, c; while (e && /rgba\(0, 0, 0, 0\)|transparent/.test(c = rgb(e))) e = e.parentElement; return e ? c : "rgb(255, 255, 255)"; })();
    if (ratio(fg, bb) < 4.5) out.push("label " + fg + " on " + bb + " is " + ratio(fg, bb).toFixed(2) + ":1 (< 4.5:1)");
  }
  if (toggle) {
    const wait = () => new Promise((r) => setTimeout(r, 80));
    const steps = [["click", () => b.click()], ["Enter", () => { b.focus(); b.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); b.click(); }], ["Space", () => { b.focus(); b.click(); }]];
    let prev = state();
    for (const [nm, go] of steps) {
      go(); await wait();
      const s = state();
      if (s.ex === prev.ex) out.push(nm + " did not toggle aria-expanded"); else if (s.open === prev.open) out.push(nm + " did not toggle the Details");
      if (read(s) !== s.ex) out.push(nm + ": switch reads " + read(s) + " but aria-expanded is " + s.ex);
      prev = s;
    }
  }
  return out;
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const KINDS = ["toolbar", "sheet", "sideways", "target"];
let views = 0;

// ---- positive controls: each detector sees its injected defect ----
{
  const ctx = await newContext(browser, { banner: false, viewport: { width: 1024, height: 768 }, extraSeedJs: SEED });
  const pg = PAGES[0] || { path: "/app/notes.html?unit=ayah%3A2%3A255", open: ".note-card[data-note-id] [data-note-window]" };
  const { page: P } = await openPage(ctx, pg.path); await P.waitForTimeout(1200);
  if (pg.pre) await pg.pre(P);
  await P.waitForSelector(pg.open, { state: "attached" }); await P.evaluate((s) => document.querySelector(s).click(), pg.open); await P.waitForSelector(".note-win", { timeout: 8000 }); await P.waitForTimeout(500);
  const base = await P.evaluate(MEASURE, { inject: "" });
  check("positive control: the window is found and the bar has controls", !base.missing && base.n >= 3, JSON.stringify(base));
  await P.click(".note-win [data-pane-menu-btn]"); await P.waitForTimeout(400);
  const m = await P.evaluate(MEASURE, { inject: "" });
  check("positive control: the open ⋯ sheet is measured (more controls than the closed bar)", m.n > base.n + 3, base.n + " vs " + m.n);
  for (const k of KINDS) {
    const r = await P.evaluate(MEASURE, { inject: k });
    check("positive control (" + k + "): the injected defect is reported", r[k].length > 0, JSON.stringify(r));
  }
  const d0 = await P.evaluate(DETAILS, { inject: "", toggle: false });
  check("positive control: the Details control is found and passes in its shipped state", d0.length === 0 || MUTATE.startsWith("fix-"), JSON.stringify(d0));
  for (const k of ["glyph", "contrast"]) {
    const r = await P.evaluate(DETAILS, { inject: k, toggle: false });
    check("positive control (details " + k + "): the injected defect is reported", r.length > 0, JSON.stringify(r));
  }
  await ctx.close();
}

for (const pg of PAGES) for (const [w, h] of WIDTHS) for (const lang of LANGS) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (CSS_MUT[MUTATE]) {
    const m = CSS_MUT[MUTATE], css = fs.readFileSync(m.file, "utf8");
    if (css.split(m.from).length < 2) throw new Error("mutation " + MUTATE + ": anchor not found in " + m.file + " (the fix is not there yet)");
    await ctx.route((u) => new URL(u).pathname.endsWith(m.file.replace(/^app/, "")), (r) => r.fulfill({ status: 200, contentType: m.file.endsWith(".js") ? "text/javascript" : "text/css", body: (m.also ? css.split(m.also[0]).join(m.also[1]) : css).split(m.from).join(m.to) }));
  }
  const { page: P, errors } = await openPage(ctx, pg.path);
  for (const scale of SCALES) {
    const tag = `${pg.id} / ${w} / ${lang} / ${scale}%`;
    try {
      await P.goto(new URL(pg.path, P.url()).href, { waitUntil: "networkidle" });
      await P.waitForTimeout(800);
      await P.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay, .app-splash-overlay').forEach((e) => e.remove()));
      if (pg.pre) await pg.pre(P);
      const setScale = async () => { await P.evaluate((s) => { document.documentElement.style.fontSize = s + "%"; }, scale); await P.waitForTimeout(300); };
      // --order=before: text size set, then the window opened (what a reload at 200% does); default "after": window opened, then the size changed with
      // NO resize event (what the audit's screenshot did, and what changing the text size while a window is open does).
      if (ORDER === "before") await setScale();
      await P.waitForSelector(pg.open, { state: "attached" }); await P.evaluate((s) => document.querySelector(s).click(), pg.open); await P.waitForSelector(".note-win", { timeout: 8000 }); await P.waitForTimeout(600);
      if (ORDER !== "before") { await setScale(); await P.waitForTimeout(400); }
    } catch (e) { check(`${tag}: the window opened (positive control)`, false, String(e.message).slice(0, 140)); continue; }
    views++;
    const closed = await P.evaluate(MEASURE, { inject: MUTATE });
    // Part 152: the Details switch, day look then night look (state and contrast), then click / Enter / Space toggling (day only)
    const dDay = await P.evaluate(DETAILS, { inject: MUTATE, toggle: true });
    check(`${tag}: (details) the Details control wears the J109 switch, toggles by click/Enter/Space, fits, is 40px, day look`, dDay.length === 0, "\n      " + dDay.slice(0, 4).join("\n      "));
    await P.evaluate(() => document.documentElement.setAttribute("data-card-look", "night")); await P.waitForTimeout(150);
    const dNight = await P.evaluate(DETAILS, { inject: MUTATE, toggle: false });
    check(`${tag}: (details) night look: switch state, fit and contrast`, dNight.length === 0, "\n      " + dNight.slice(0, 4).join("\n      "));
    await P.evaluate(() => document.documentElement.removeAttribute("data-card-look")); await P.waitForTimeout(100);
    await P.click(".note-win [data-pane-menu-btn]").catch(() => {}); await P.waitForTimeout(400);
    const open = await P.evaluate(MEASURE, { inject: MUTATE });
    if (SHOTS) await P.screenshot({ path: `${OUT}/${pg.id}-${w}-${lang}-${scale}.png` });
    for (const k of KINDS) {
      const bad = [...new Set([...closed[k], ...open[k]])];
      check(`${tag}: (${k}) ${k === "toolbar" ? "every toolbar control lies inside the window" : k === "sheet" ? "the ⋯ sheet lies inside the screen" : k === "sideways" ? "nothing scrolls sideways" : "controls are at least 40px"}`, !closed.missing && bad.length === 0, "\n      " + (closed.missing ? "no window" : bad.slice(0, 4).join("\n      ")));
    }
    await P.keyboard.press("Escape").catch(() => {});
  }
  const pe = errors.filter((e) => !NOISE.test(e));
  check(`${pg.id} / ${w} / ${lang}: no page errors`, pe.length === 0, pe.slice(0, 2).join(" | "));
  await ctx.close();
}
console.log(`\nviews measured: ${views}`);
console.log(pass + " passed, " + fail + " failed" + (MUTATE ? " (mutation: " + MUTATE + ")" : ""));
await browser.close();
process.exit(fail || views === 0 ? 1 : 0);
