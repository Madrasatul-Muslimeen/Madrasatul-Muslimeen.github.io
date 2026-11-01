// Audit part 146 (issue #1388): the NIGHT look on hadith-study.html, dua-study.html and hadith-collections.html at 100% and 200% text.
// REPORT ONLY: no file under app/ changes. Method: part 144 (note-window-large-night-browser.mjs) for the night look + part 142's window.__A11Y
// helper (copied by reading shared-tools-a11y-browser.mjs) for contrast and focus; the VIEWS lists are READ from the two part-136 suites at run time
// (large-text-hadith-study-browser.mjs, large-text-dua-study-browser.mjs) so they cannot drift from them.
// Night look: <html data-card-look="night"> from localStorage mm_card_look="night"; day look = mm_card_look="light" (compared once per page).
// Checks per view: (contrast) rendered text vs the real painted background, 4.5:1 / 3:1 large; (focus) a real Tab walk, each focused control's ring >= 3:1;
//   (day) a near-white (luminance > 0.8) panel/card/sheet/input painted inside the dark page; (arrow) a show/hide toggle drawn as an arrow, not the J109 switch.
// Run from repo root with node serve.js on 8080:
//   node tools/i18n-verify/night-hadith-dua-browser.mjs [--page=hadith|dua|collections] [--views=a,b] [--width=390] [--lang=bn] [--scale=200] [--shots] [--list]
//   --mutate=contrast|focus|day|arrow   (each must FAIL)
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) pass++; else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const MUTATE = arg("mutate"), SHOTS = process.argv.includes("--shots");
const OUT = "tools/i18n-verify/out/night-hadith-dua"; fs.mkdirSync(OUT, { recursive: true });
const WIDTHS = [[390, 844], [1440, 900]].filter(([w]) => !arg("width") || String(w) === arg("width"));
const LANGS = ["en", "bn"].filter((l) => !arg("lang") || l === arg("lang"));
const SCALES = [100, 200].filter((s) => !arg("scale") || String(s) === arg("scale"));
const BUKHARI = "0256Bukhari.Sahih.JK000110-ara1";
const NOISE = /ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i;
const slice = (file, from) => { const s = fs.readFileSync("tools/i18n-verify/" + file, "utf8"); const a = s.indexOf(from), v = s.indexOf("const VIEWS = [", a), b = s.indexOf("\n];", v); if (a < 0 || v < 0 || b < 0) throw new Error("cannot read VIEWS from " + file); return s.slice(a, b + 3); };
const HADITH_VIEWS = new Function("BUKHARI", slice("large-text-hadith-study-browser.mjs", "const tab = (P, v)") + "\nreturn VIEWS;")(BUKHARI);
const DUA_VIEWS = new Function("BUKHARI", slice("large-text-dua-study-browser.mjs", "const wait = (P, sel") + "\nreturn VIEWS;")(BUKHARI);
const src = fs.readFileSync("tools/i18n-verify/shared-tools-a11y-browser.mjs", "utf8");
const ia = src.indexOf("const INSTALL = "), ib = src.indexOf("\n};\n", ia);
const INSTALL = (0, eval)("(" + src.slice(ia + 16, ib + 3).replace(/;\s*$/, "") + ")");
const sd = fs.readFileSync("tools/i18n-verify/large-text-hadith-study-browser.mjs", "utf8");
const SEED_BASE = sd.slice(sd.indexOf("const SEED = `") + 14, sd.indexOf("`;", sd.indexOf("const SEED = `"))).replace("${process.argv.includes(\"--names=short\")}", "false");
// extraSeedJs runs inside the Firebase stub, AFTER the page's head script has read mm_card_look, so the look is set by an init script instead.
const withLook = async (ctx, look) => { await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch (e) { /* none */ } }, look); return ctx; };

const PAGES = [
  { id: "hadith", path: "/app/hadith-study.html", views: HADITH_VIEWS.filter((v) => !v.dua), url: (v) => "/app/hadith-study.html" },
  { id: "dua", path: "/app/dua-study.html", views: [...DUA_VIEWS, ...HADITH_VIEWS.filter((v) => v.dua).map((v) => ({ ...v, id: "tab-" + v.id, hadithTab: true }))], url: (v) => v.hadithTab ? "/app/hadith-study.html" : "/app/dua-study.html" + (v.url || "") },
  { id: "collections", path: "/app/hadith-collections.html", views: HADITH_VIEWS, url: () => "/app/hadith-collections.html" },
].filter((p) => !arg("page") || p.id === arg("page"));
const VIEWSEL = arg("views") ? arg("views").split(",") : null;

// in-page: near-white painted boxes and arrow toggles
const SCAN = () => {
  const vis = (e) => window.__A11Y.vis(e);
  const parse = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const bodyBg = parse(getComputedStyle(document.body).backgroundColor), htmlBg = parse(getComputedStyle(document.documentElement).backgroundColor);
  const pageLum = lum((bodyBg && bodyBg[3] > 0 ? bodyBg : htmlBg) || [255, 255, 255]);
  const day = [], arrows = [];
  const key = (e) => window.__A11Y.key(e);
  if (pageLum < 0.2) for (const e of document.body.querySelectorAll("*")) {
    if (!vis(e) || /^(IMG|SVG|CANVAS|VIDEO|OPTION)$/i.test(e.tagName)) continue;
    const c = parse(getComputedStyle(e).backgroundColor);
    if (!c || c[3] < 0.95 || lum(c) <= 0.8) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 40 || r.height < 18) continue;
    const kind = /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.tagName) ? "control" : "panel";
    day.push(key(e) + " (" + kind + " " + Math.round(r.width) + "x" + Math.round(r.height) + ")");
  }
  for (const e of document.body.querySelectorAll("summary, button[aria-expanded], [data-toggle], [aria-controls]")) {
    if (!vis(e)) continue;
    const t = (e.textContent || "").replace(/\s+/g, " ").trim();
    if (!/[▸▶►▼▲◂◀▴▾▿▹]/.test(t) && !/[▸▶►▼▲▴▾]/.test(getComputedStyle(e, "::before").content + getComputedStyle(e, "::after").content)) continue;
    // menus keep ▾ (a popup opener) and folder trees keep ▸
    if (e.hasAttribute("aria-haspopup") || e.matches("details.nav-cat > summary") || e.closest("[role=tree],[data-folder-tree],.note-folder-tree") || /^\s*[^▸▾]*▾\s*$/.test(t) && /menu|pick|tab/i.test((e.getAttribute("data-hadith-tab") || "") + e.className + (e.getAttribute("data-dua-pd") || ""))) continue;
    if (e.tagName === "SUMMARY" || e.hasAttribute("aria-expanded")) arrows.push(key(e) + ' "' + t.slice(0, 30) + '"');
  }
  return { day: [...new Set(day)], arrows: [...new Set(arrows)], pageLum: Math.round(pageLum * 1000) / 1000 };
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
const CSS = (s) => (s === 100 ? "" : "html{font-size:" + s + "% !important}");
const NORING_CSS = "*,*:focus,*:focus-visible{outline:none!important;box-shadow:none!important}";

// ---- positive controls, correct by construction ----
{
  const ctx = await withLook(await newContext(browser, { banner: false, viewport: { width: 390, height: 844 }, extraSeedJs: SEED_BASE }), "night");
  const { page: P } = await openPage(ctx, "/app/hadith-study.html"); await P.waitForTimeout(1200);
  await P.evaluate(INSTALL, "#none");
  check("positive control: night look attribute is on", (await P.evaluate(() => document.documentElement.getAttribute("data-card-look"))) === "night");
  await P.evaluate(() => { document.body.innerHTML = '<div style="background:#0b1530;padding:8px"><p style="color:#fff;font-size:16px">Light on navy line</p><p style="color:#999;background:#aaa;font-size:16px">Grey on grey line</p><div id="wh" style="background:#fff;width:120px;height:40px">white panel</div><details><summary>▸ Show things</summary>x</details><button aria-haspopup="menu">Books ▾</button></div>'; document.body.style.background = "#0b1530"; });
  const c = await P.evaluate(() => window.__A11Y.contrast());
  check("positive control (contrast): grey-on-grey is reported, light-on-navy is not", c.fail.some((x) => x.txt.includes("Grey on grey")) && !c.fail.some((x) => x.txt.includes("Light on navy")));
  const s = await P.evaluate(SCAN);
  check("positive control (day): the white panel on the dark page is reported", s.day.some((x) => x.includes("#wh")), JSON.stringify(s));
  check("positive control (arrow): the ▸ summary is reported, the ▾ menu button is not", s.arrows.length === 1 && s.arrows[0].includes("Show things"), JSON.stringify(s.arrows));
  await P.evaluate(() => { document.body.innerHTML = '<button id="b1">One</button><button id="b2" style="outline:none">Two</button>'; document.body.style.background = "#0b1530"; });
  await P.addStyleTag({ content: "#b1:focus-visible{outline:3px solid #fff;outline-offset:2px}" });
  const w = await tabWalk(P);
  check("positive control (focus): the button with a ring passes and the one without is reported", w.n === 2 && w.bad.length === 1 && w.bad[0].includes("b2"), JSON.stringify(w));
  await ctx.close();
  // a page that ignores the look shows up: day and night differ on each page
  for (const pg of PAGES) {
    const bgs = {};
    for (const look of ["light", "night"]) {
      const cx = await withLook(await newContext(browser, { banner: false, viewport: { width: 390, height: 844 }, extraSeedJs: SEED_BASE }), look);
      const { page: Q } = await openPage(cx, pg.path); await Q.waitForTimeout(1500);
      bgs[look] = await Q.evaluate(() => document.documentElement.getAttribute("data-card-look") + "/" + getComputedStyle(document.body).backgroundColor);
      await cx.close();
    }
    check(pg.id + ": the day look and the night look really differ (the page honours mm_card_look)", bgs.light !== bgs.night && bgs.night.startsWith("night/"), JSON.stringify(bgs));
  }
}

for (const pg of PAGES) for (const [w, h] of WIDTHS) for (const lang of LANGS) {
  const ctx = await withLook(await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: SEED_BASE }), "night");
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page: P, errors } = await openPage(ctx, pg.path);
  for (const v of pg.views.filter((x) => !VIEWSEL || VIEWSEL.includes(x.id))) {
    const tag = `${pg.id}:${v.id} / ${w} / ${lang}`;
    try {
      await P.goto(new URL(pg.url(v), P.url()).href, { waitUntil: "networkidle" });
      await P.waitForTimeout(500);
      await P.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay, .app-splash-overlay').forEach((e) => e.remove()));
      await Promise.race([v.go(P), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout driving the view")), 60000))]);
    } catch (e) { check(`${tag}: the view opened (positive control)`, false, String(e.message).slice(0, 140)); continue; }
    await P.waitForTimeout(300);
    for (const scale of SCALES) {
      const where = w + lang + "@" + scale, t2 = tag + " / " + scale + "%";
      if (scale !== 100) { await P.evaluate((s) => { document.documentElement.style.fontSize = s + "%"; }, scale); await P.waitForTimeout(300); }
      await P.evaluate(INSTALL, "#none");
      if (MUTATE === "contrast") await P.evaluate(() => { const p = document.createElement("p"); p.textContent = "Injected grey on grey line"; p.style.cssText = "position:fixed;top:60px;left:10px;margin:0;color:#999;background:#aaa;font-size:16px;z-index:9999"; document.body.appendChild(p); });
      if (MUTATE === "day") await P.evaluate(() => { const p = document.createElement("div"); p.textContent = "Injected white panel"; p.style.cssText = "position:fixed;top:100px;left:10px;width:200px;height:60px;background:#fff;color:#000;z-index:9999"; document.body.appendChild(p); });
      if (MUTATE === "arrow") await P.evaluate(() => { const d = document.createElement("details"); d.innerHTML = "<summary>▸ Injected arrow toggle</summary>x"; d.style.cssText = "position:fixed;top:170px;left:10px;z-index:9999;color:#fff"; document.body.appendChild(d); });
      const look = await P.evaluate(() => document.documentElement.getAttribute("data-card-look"));
      check(t2 + ": night look is on (positive control)", look === "night", "data-card-look=" + look);
      const con = await P.evaluate(() => window.__A11Y.contrast());
      const bad = con.fail.map((c) => c.key + ' "' + c.txt + '" ' + c.ratio + ":1 (need " + c.need + ") " + c.fg + " on " + c.bg);
      check(t2 + ": (contrast) all text meets its ratio", bad.length === 0, "\n      " + bad.slice(0, 3).join("\n      "));
      bad.forEach((m) => add("DEFECT contrast", `${pg.id}:${v.id}: ` + m, where));
      const sc = await P.evaluate(SCAN);
      check(t2 + ": (day) no near-white panel on the dark page", sc.day.length === 0, "\n      " + sc.day.slice(0, 3).join("\n      "));
      sc.day.forEach((m) => add("DEFECT day-colour", `${pg.id}:${v.id}: ` + m, where));
      check(t2 + ": (arrow) no show/hide arrow", sc.arrows.length === 0, "\n      " + sc.arrows.slice(0, 3).join("\n      "));
      sc.arrows.forEach((m) => add("DEFECT arrow", `${pg.id}:${v.id}: ` + m, where));
      if (MUTATE === "focus") await P.addStyleTag({ content: NORING_CSS });
      const tw = await tabWalk(P);
      check(t2 + ": (focus) every focused control has a ring >= 3:1", tw.bad.length === 0, "\n      " + tw.bad.slice(0, 3).join("\n      "));
      tw.bad.forEach((m) => add("DEFECT focus", `${pg.id}:${v.id}: ` + m, where));
      if (SHOTS && scale === 200 && [390, 1440].includes(w) && lang === "en") await P.screenshot({ path: `${OUT}/${pg.id}-${v.id}-${w}-${scale}.png` });
    }
    await P.evaluate(() => { document.documentElement.style.fontSize = ""; });
  }
  const pe = errors.filter((e) => !NOISE.test(e));
  check(`${pg.id} / ${w} / ${lang}: no page errors in the sweep`, pe.length === 0, pe.slice(0, 2).join(" | "));
  await ctx.close();
}
fs.writeFileSync(OUT + "/findings" + (arg("page") ? "-" + arg("page") : "") + ".json", JSON.stringify([...findings.values()].map((f) => ({ ...f, w: [...f.w] })), null, 1));
console.log("\n=== findings (kind | measurement | width+language@scale) ===");
let n = 0; for (const f of findings.values()) console.log("  #" + (++n) + " " + f.k + " | " + f.m.slice(0, 230) + " | " + [...f.w].slice(0, 6).join(",") + (f.w.size > 6 ? "...(" + f.w.size + ")" : ""));
console.log("\n" + pass + " passed, " + fail + " failed");
await browser.close();
process.exit(fail ? 1 : 0);
