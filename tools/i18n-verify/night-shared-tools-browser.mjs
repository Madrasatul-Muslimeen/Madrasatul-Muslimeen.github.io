// Audit part 149 (issue #1398): the NIGHT look on the shared tools bookmarks.html, records.html and journey-map.html, at 360/390/768/1024/1440,
// English and Bangla, 100% and 200% text. Modelled on night-hadith-dua-browser.mjs (part 146): same harness, same look switch
// (localStorage mm_card_look -> <html data-card-look="night">), same window.__A11Y helper (read out of shared-tools-a11y-browser.mjs).
// The data is the real-length seed of large-text-shared-pages-browser.mjs (12 long folder names, 40 long bookmark names, 30 long notes), READ from that file.
// Checks per view: (contrast) text vs its real painted background, 4.5:1 / 3:1 large; (focus) a real Tab walk, every focused ring >= 3:1;
//   (day-panel) no near-white panel/input inside a dark painted box; (arrow) a show/hide toggle drawn as an arrow instead of the J109 ON/OFF switch
//   (menus keep ▾, folder trees keep ▸); (day-look) once per page+view at 390 en: the day look with mm_card_look="light" equals the look with NO key at all.
// Positive controls: each detector sees a defect injected on purpose; and on each page the night look differs from the day look (else it is recorded as
//   a FINDING "no night look", never a pass).
// Run from repo root with node serve.js on 8080:
//   node tools/i18n-verify/night-shared-tools-browser.mjs [--page=bookmarks|records|journey] [--views=a,b] [--width=390] [--lang=bn] [--scale=200] [--shots] [--shotdir=dir]
//   --mutate=contrast|focus|day|arrow|daylook   (each must FAIL)   plus one --mutate=<fix> per night-only CSS fix (see MUTATE_CSS below)
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) pass++; else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const MUTATE = arg("mutate"), SHOTS = process.argv.includes("--shots");
const OUT = arg("shotdir") || "tools/i18n-verify/out/night-shared-tools"; fs.mkdirSync(OUT, { recursive: true });
const WIDTHS = [[360, 740], [390, 844], [768, 1024], [1024, 768], [1440, 900]].filter(([w]) => !arg("width") || String(w) === arg("width"));
const LANGS = ["en", "bn"].filter((l) => !arg("lang") || l === arg("lang"));
const SCALES = [100, 200].filter((s) => !arg("scale") || String(s) === arg("scale"));
const NOISE = /ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i;

const src = fs.readFileSync("tools/i18n-verify/shared-tools-a11y-browser.mjs", "utf8");
const ia = src.indexOf("const INSTALL = "), ib = src.indexOf("\n};\n", ia);
const INSTALL = (0, eval)("(" + src.slice(ia + 16, ib + 3).replace(/;\s*$/, "") + ")");
const sd = fs.readFileSync("tools/i18n-verify/large-text-shared-pages-browser.mjs", "utf8");
const sa = sd.indexOf("const SEED = `");
if (sa < 0) throw new Error("cannot read the SEED from large-text-shared-pages-browser.mjs");
const SEED = sd.slice(sa + 14, sd.indexOf("`;", sa));
const withLook = async (ctx, look) => { if (look) await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch (e) { /* none */ } }, look); return ctx; };

const settle = (P) => P.waitForTimeout(1200);
const openHome = async (P) => { await settle(P); await P.evaluate(() => { const d = document.querySelector("details.nav-cat-home"); if (d) d.open = true; }); await P.waitForTimeout(300); };
const openCard = async (P) => { await openHome(P); await P.click("[data-open-account-card]"); await P.waitForSelector("#accountCardOverlay.open", { timeout: 5000 }); await P.waitForTimeout(300); };
const expandTree = async (P) => { await settle(P); for (let i = 0; i < 6; i++) { await P.evaluate(() => document.querySelectorAll("[data-folder-toggle][aria-expanded=false]").forEach((b) => b.click())); await P.waitForTimeout(150); } };
const pickView = (v) => async (P) => { await expandTree(P); await P.click('.view-toggle-btn[data-view="' + v + '"]'); await P.waitForTimeout(500); };
const PAGES = [
  { id: "bookmarks", path: "/app/bookmarks.html", views: [
    { id: "opens", go: settle }, { id: "home-menu", go: openHome }, { id: "account-card", go: openCard },
    { id: "new-bookmark", go: async (P) => { await settle(P); await P.click("#newBookmarkBtn"); await P.waitForTimeout(500); } },
    { id: "new-folder", go: async (P) => { await settle(P); await P.click("#newFolderBtn"); await P.waitForTimeout(500); } }] },
  { id: "records", path: "/app/records.html", views: [
    { id: "opens", go: settle }, { id: "home-menu", go: openHome }, { id: "account-card", go: openCard }] },
  { id: "journey", path: "/app/journey-map.html", views: [
    { id: "opens", go: expandTree }, { id: "home-menu", go: openHome }, { id: "account-card", go: openCard },
    { id: "timeline", go: pickView("timeline") }, { id: "path", go: pickView("path") },
    { id: "note-pane", go: async (P) => { await pickView("timeline")(P); await P.click("#viewTimeline .note-card[data-note-id] [data-note-open]"); await P.waitForSelector("#notePane:not([hidden])", { timeout: 8000 }); await P.waitForTimeout(400); } },
    { id: "page-menu", go: async (P) => { await expandTree(P); await P.click("[data-bar-palette-toggle=pageMenu]"); await P.waitForSelector("#openTrashBtn", { state: "visible" }); } },
    { id: "trash", go: async (P) => { await expandTree(P); await P.click("[data-bar-palette-toggle=pageMenu]"); await P.click("#openTrashBtn"); await P.waitForTimeout(600); } },
    { id: "favourites", go: async (P) => { await expandTree(P); await P.click("[data-bar-palette-toggle=pageMenu]"); await P.click("#openFavouritesBtn"); await P.waitForTimeout(600); } }] },
].filter((p) => !arg("page") || p.id === arg("page"));
const VIEWSEL = arg("views") ? arg("views").split(",") : null;

// Night-only CSS fixes are mutated by serving the page's CSS with the fix taken out. One entry per fix: { file: pathname suffix, from, to }.
// (filled in with the fixes found by this audit; see the report)
const MUTATE_CSS = {
  "menu-buttons": { page: "journey", file: "app/journey-map.html", from: '[data-card-look="night"] .page-menu-wrap .bar-palette button.secondary {', to: '[data-card-look="off"] .page-menu-wrap .bar-palette button.secondary {' },
  "menu-links": { page: "journey", file: "app/journey-map.html", from: '[data-card-look="night"] .page-menu-wrap .bar-palette a.secondary {', to: '[data-card-look="off"] .page-menu-wrap .bar-palette a.secondary {' },
};

const SCAN = () => {
  const vis = (e) => window.__A11Y.vis(e);
  const parse = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const bodyBg = parse(getComputedStyle(document.body).backgroundColor), htmlBg = parse(getComputedStyle(document.documentElement).backgroundColor);
  const pageLum = lum(bodyBg && bodyBg[3] > 0 ? bodyBg : htmlBg && htmlBg[3] > 0 ? htmlBg : [255, 255, 255]);
  const day = [], arrows = [];
  const key = (e) => window.__A11Y.key(e);
  const darkAround = (e) => { for (let a = e.parentElement; a; a = a.parentElement) { const c = parse(getComputedStyle(a).backgroundColor); if (c && c[3] >= 0.95) return lum(c) < 0.2; } return pageLum < 0.2; };
  for (const e of document.body.querySelectorAll("*")) {
    if (!vis(e) || /^(IMG|SVG|CANVAS|VIDEO|OPTION)$/i.test(e.tagName)) continue;
    if (e.matches('[aria-pressed="true"], [aria-current]:not([aria-current="false"]), mark')) continue;
    const c = parse(getComputedStyle(e).backgroundColor);
    if (!c || c[3] < 0.95 || lum(c) <= 0.8 || !darkAround(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 40 || r.height < 18) continue;
    day.push(key(e) + " (" + (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.tagName) ? "control" : "panel") + " " + Math.round(r.width) + "x" + Math.round(r.height) + ")");
  }
  for (const e of document.body.querySelectorAll("summary, button[aria-expanded], [data-toggle], [aria-controls]")) {
    if (!vis(e)) continue;
    const t = (e.textContent || "").replace(/\s+/g, " ").trim();
    if (!/[▸▶►▼▲◂◀▴▾▿▹]/.test(t) && !/[▸▶►▼▲▴▾]/.test(getComputedStyle(e, "::before").content + getComputedStyle(e, "::after").content)) continue;
    if (e.hasAttribute("aria-haspopup") || e.matches("details.nav-cat > summary") || e.closest("[role=tree],[data-folder-tree],.note-folder-tree,.folder-row,#folderTree")) continue;
    // Part 149, measured: Path's [data-path-branch-toggle] expands a FOLDER branch (a tree: keeps its arrow) and [data-note-toggle] is the note card's
    // "More" actions button (a menu opener: keeps ▾). Neither is a show/hide of content, so the first run's 5 arrow findings were a stale check.
    if (e.matches("[data-path-branch-toggle]") || (e.matches("[data-note-toggle]") && /^(more|আরও)/i.test(e.getAttribute("aria-label") || ""))) continue;
    if (e.tagName === "SUMMARY" || e.hasAttribute("aria-expanded")) arrows.push(key(e) + ' "' + t.slice(0, 30) + '"');
  }
  return { day: [...new Set(day)], arrows: [...new Set(arrows)], pageLum: Math.round(pageLum * 1000) / 1000 };
};
// the day look signature: computed colours of the first visible elements, in document order
const SIG = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden"; };
  const out = [document.documentElement.getAttribute("data-card-look") ? "x" : "", getComputedStyle(document.body).backgroundColor];
  let n = 0;
  for (const e of document.body.querySelectorAll("*")) { if (/^(SCRIPT|STYLE|OPTION|PATH)$/i.test(e.tagName) || !vis(e)) continue; const cs = getComputedStyle(e); out.push(e.tagName + ":" + cs.color + ":" + cs.backgroundColor + ":" + cs.borderTopColor); if (++n >= 400) break; }
  return out.slice(1).join("|");
};
const TAB_STOPS = 30;
async function tabWalk(P) {
  await P.evaluate(() => { const m = document.createElement("a"); m.id = "tab-start"; m.tabIndex = 0; m.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px"; document.body.prepend(m); m.focus(); });
  const bad = [];
  let n = 0;
  for (let i = 0; i < TAB_STOPS; i++) {
    await P.keyboard.press("Tab");
    const d = await P.evaluate(() => window.__A11Y.focused());
    if (d.body) break;
    n++;
    if (!d.ringOn) bad.push(d.key + " has no focus ring");
    else if (d.ringRatio !== null && d.ringRatio < 3) bad.push(d.key + " ring " + Math.round(d.ringRatio * 100) / 100 + ":1");
  }
  await P.evaluate(() => document.getElementById("tab-start")?.remove());
  return { n, bad };
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const findings = new Map();
const add = (k, m0, w) => { const m = m0.replace(/\d+x\d+/g, "WxH").replace(/\d+(\.\d+)?px/g, "Npx"); const key = k + "|" + m; const e = findings.get(key) || { k, m, w: new Set() }; e.w.add(w); findings.set(key, e); };
const NORING_CSS = "*,*:focus,*:focus-visible{outline:none!important;box-shadow:none!important}";
const mk = (look, o) => withLook(newContext(browser, { banner: false, extraSeedJs: SEED, ...o }), look);
let checksRun = 0;
const RECORD = process.argv.includes("--record-day"), BASE_FILE = "tools/i18n-verify/night-shared-tools-day-baseline.json";
const DAY = RECORD || !fs.existsSync(BASE_FILE) ? {} : JSON.parse(fs.readFileSync(BASE_FILE, "utf8"));

// ---- positive controls, correct by construction ----
{
  const ctx = await withLook(await newContext(browser, { banner: false, viewport: { width: 390, height: 844 }, extraSeedJs: SEED }), "night");
  const { page: P } = await openPage(ctx, "/app/records.html"); await P.waitForTimeout(1200);
  await P.evaluate(INSTALL, "#none");
  check("positive control: night look attribute is on", (await P.evaluate(() => document.documentElement.getAttribute("data-card-look"))) === "night");
  await P.evaluate(() => { document.body.innerHTML = '<div style="background:#0b1530;padding:8px"><p style="color:#fff;font-size:16px">Light on navy line</p><p style="color:#999;background:#aaa;font-size:16px">Grey on grey line</p><div id="wh" style="background:#fff;width:120px;height:40px">white panel</div><details><summary>▸ Show things</summary>x</details><button aria-haspopup="menu">Books ▾</button></div>'; document.body.style.background = "#0b1530"; });
  const c = await P.evaluate(() => window.__A11Y.contrast());
  check("positive control (contrast): grey-on-grey is reported, light-on-navy is not", c.fail.some((x) => x.txt.includes("Grey on grey")) && !c.fail.some((x) => x.txt.includes("Light on navy")));
  const s = await P.evaluate(SCAN);
  check("positive control (day-panel): the white panel on the dark page is reported", s.day.some((x) => x.includes("#wh")), JSON.stringify(s));
  check("positive control (arrow): the ▸ summary is reported, the ▾ menu button is not", s.arrows.length === 1 && s.arrows[0].includes("Show things"), JSON.stringify(s.arrows));
  await P.evaluate(() => { document.body.innerHTML = '<button id="b1">One</button><button id="b2" style="outline:none">Two</button>'; document.body.style.background = "#0b1530"; });
  await P.addStyleTag({ content: "#b1:focus-visible{outline:3px solid #fff;outline-offset:2px}" });
  const w = await tabWalk(P);
  check("positive control (focus): the button with a ring passes and the one without is reported", w.n === 2 && w.bad.length === 1 && w.bad[0].includes("b2"), JSON.stringify(w));
  await ctx.close();
  // the night look must really differ from the day look on each page; a page with no night look is a FINDING, not a pass
  for (const pg of PAGES) {
    const bgs = {};
    for (const look of ["light", "night"]) {
      const cx = await withLook(await newContext(browser, { banner: false, viewport: { width: 390, height: 844 }, extraSeedJs: SEED }), look);
      const { page: Q } = await openPage(cx, pg.path); await Q.waitForTimeout(1500);
      bgs[look] = await Q.evaluate(SIG);
      bgs[look + "-attr"] = await Q.evaluate(() => document.documentElement.getAttribute("data-card-look"));
      await cx.close();
    }
    const differs = bgs.light !== bgs.night;
    if (!differs) add("DEFECT no-night-look", pg.id + ": the page paints the same colours under the night look as under the day look", "390en");
    check(pg.id + ": positive control, the night look really differs from the day look (page honours mm_card_look)", differs && bgs["night-attr"] === "night", "attr=" + bgs["night-attr"]);
  }
}

for (const pg of PAGES) for (const [w, h] of WIDTHS) for (const lang of LANGS) {
  const ctx = await withLook(await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: SEED }), "night");
  await ctx.route("**/archive.org/**", (r) => r.abort());
  for (const [name, m] of Object.entries(MUTATE_CSS)) if (MUTATE === name && m.page === pg.id) {
    const css = fs.readFileSync(m.file, "utf8");
    if (css.split(m.from).length !== 2) throw new Error("mutation " + name + ": anchor not found exactly once in " + m.file);
    await ctx.route((u) => new URL(u).pathname.endsWith(m.file.replace(/^app/, "")), (r) => r.fulfill({ status: 200, contentType: m.file.endsWith(".css") ? "text/css" : "text/html; charset=utf-8", body: css.replace(m.from, m.to) }));
  }
  const { page: P, errors } = await openPage(ctx, pg.path);
  for (const v of pg.views.filter((x) => !VIEWSEL || VIEWSEL.includes(x.id))) {
    const tag = `${pg.id}:${v.id} / ${w} / ${lang}`;
    try {
      await P.goto(new URL(pg.path, P.url()).href, { waitUntil: "networkidle" });
      await P.waitForTimeout(500);
      await P.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay, .app-splash-overlay').forEach((e) => e.remove()));
      await Promise.race([v.go(P), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout driving the view")), 60000))]);
    } catch (e) { check(`${tag}: the view opened (positive control)`, false, String(e.message).slice(0, 140)); continue; }
    await P.waitForTimeout(300);
    // (day-look) once per page+view at 390 en: day look with mm_card_look="light" == no key at all
    // NOTE: with no key stored the app wears the NIGHT look (the head script treats anything but "light" as night), so the day look is compared with a
    // recorded BASELINE (tools/i18n-verify/night-shared-tools-day-baseline.json, recorded on unmodified main with --record-day), element by element.
    if (w === 390 && lang === "en" && SCALES.includes(100)) {
      const cx = await withLook(await newContext(browser, { banner: false, viewport: { width: w, height: h }, extraSeedJs: SEED }), "light");
      const { page: Q } = await openPage(cx, pg.path);
      let sig;
      try { await Q.waitForTimeout(500); await Q.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay, .app-splash-overlay').forEach((e) => e.remove())); await v.go(Q); await Q.waitForTimeout(300); sig = await Q.evaluate(SIG); } catch (e) { sig = "ERR " + e.message; }
      await cx.close();
      if (MUTATE === "daylook") sig += "|mutated";
      const key = pg.id + ":" + v.id;
      if (RECORD) DAY[key] = sig;
      else {
        const base = DAY[key];
        check(`${tag}: (day-look) the day look is unchanged from the recorded baseline (positive control: a baseline exists and the page rendered ${sig.length > 200})`, !!base && !sig.startsWith("ERR") && sig === base && sig.length > 200, !base ? "no baseline for " + key : (() => { const a = sig.split("|"), b = base.split("|"); const i = a.findIndex((x, j) => x !== b[j]); return "first difference at element " + i + ": now=" + a[i] + " baseline=" + b[i] + " (" + a.length + " vs " + b.length + ")"; })());
        checksRun++;
      }
    }
    for (const scale of SCALES) {
      const where = w + lang + "@" + scale, t2 = tag + " / " + scale + "%";
      if (scale !== 100) { await P.evaluate((s) => { document.documentElement.style.fontSize = s + "%"; }, scale); await P.waitForTimeout(300); }
      await P.evaluate(INSTALL, "#none");
      if (MUTATE === "contrast") await P.evaluate(() => { const p = document.createElement("p"); p.textContent = "Injected grey on grey line"; p.style.cssText = "position:fixed;top:60px;left:10px;margin:0;color:#999;background:#aaa;font-size:16px;z-index:9999"; document.body.appendChild(p); });
      if (MUTATE === "day") await P.evaluate(() => { const p = document.createElement("div"); p.textContent = "Injected white panel"; p.style.cssText = "width:200px;height:60px;background:#fff;color:#000"; const dark = [...document.body.querySelectorAll("*")].find((e) => { const m = /rgba?\(([^)]+)\)/.exec(getComputedStyle(e).backgroundColor); if (!m) return false; const c = m[1].split(/[ ,/]+/).map(parseFloat); const r = e.getBoundingClientRect(); return (c.length < 4 || c[3] >= 0.95) && (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) < 60 && r.width > 220 && r.height > 40; }); if (!dark) throw new Error("mutation day: no dark box on this view"); dark.appendChild(p); });
      if (MUTATE === "arrow") await P.evaluate(() => { const d = document.createElement("details"); d.innerHTML = "<summary>▸ Injected arrow toggle</summary>x"; d.style.cssText = "position:fixed;top:170px;left:10px;z-index:9999;color:#fff"; document.body.appendChild(d); });
      const look = await P.evaluate(() => document.documentElement.getAttribute("data-card-look"));
      check(t2 + ": night look is on (positive control)", look === "night", "data-card-look=" + look);
      const con = await P.evaluate(() => window.__A11Y.contrast());
      const bad = con.fail.map((c) => c.key + ' "' + c.txt + '" ' + c.ratio + ":1 (need " + c.need + ") " + c.fg + " on " + c.bg);
      check(t2 + ": (contrast) all text meets its ratio", bad.length === 0, "\n      " + bad.slice(0, 3).join("\n      "));
      bad.forEach((m) => add("DEFECT contrast", `${pg.id}:${v.id}: ` + m, where));
      const sc = await P.evaluate(SCAN);
      check(t2 + ": (day-panel) no near-white panel on the dark page", sc.day.length === 0, "\n      " + sc.day.slice(0, 3).join("\n      "));
      sc.day.forEach((m) => add("DEFECT day-colour", `${pg.id}:${v.id}: ` + m, where));
      check(t2 + ": (arrow) no show/hide arrow", sc.arrows.length === 0, "\n      " + sc.arrows.slice(0, 3).join("\n      "));
      sc.arrows.forEach((m) => add("DEFECT arrow", `${pg.id}:${v.id}: ` + m, where));
      if (MUTATE === "focus") await P.addStyleTag({ content: NORING_CSS });
      const tw = await tabWalk(P);
      check(t2 + ": (focus) every focused control has a ring >= 3:1", tw.bad.length === 0, "\n      " + tw.bad.slice(0, 3).join("\n      "));
      tw.bad.forEach((m) => add("DEFECT focus", `${pg.id}:${v.id}: ` + m, where));
      checksRun += 4;
      if (SHOTS && ((scale === 100 && w === 360 && lang === "en") || (scale === 200 && w === 768 && lang === "bn"))) await P.screenshot({ path: `${OUT}/${pg.id}-${v.id}-${w}-${lang}-${scale}.png` });
    }
    await P.evaluate(() => { document.documentElement.style.fontSize = ""; });
  }
  const pe = errors.filter((e) => !NOISE.test(e));
  check(`${pg.id} / ${w} / ${lang}: no page errors in the sweep`, pe.length === 0, pe.slice(0, 2).join(" | "));
  await ctx.close();
}
if (RECORD) { fs.writeFileSync(BASE_FILE, JSON.stringify(DAY)); console.log("recorded " + Object.keys(DAY).length + " day-look signatures to " + BASE_FILE); }
fs.writeFileSync(OUT + "/findings" + (arg("page") ? "-" + arg("page") : "") + ".json", JSON.stringify([...findings.values()].map((f) => ({ ...f, w: [...f.w] })), null, 1));
console.log("\n=== findings (kind | measurement | width+language@scale) ===");
let n = 0; for (const f of findings.values()) console.log("  #" + (++n) + " " + f.k + " | " + f.m.slice(0, 230) + " | " + [...f.w].slice(0, 6).join(",") + (f.w.size > 6 ? "...(" + f.w.size + ")" : ""));
console.log("\nview checks run: " + checksRun + " (a wrong --page/--views/--width/--lang name runs 0 of these and only the positive controls)");
console.log(pass + " passed, " + fail + " failed" + (MUTATE ? " (mutation: " + MUTATE + ")" : ""));
await browser.close();
process.exit(fail || checksRun === 0 ? 1 : 0);
