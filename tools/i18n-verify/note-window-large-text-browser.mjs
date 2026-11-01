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
