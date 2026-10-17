// Audit part 38 (PCF MSA J29): phone landscape (844x390), 200% zoom reflow (640x450 @ dsf 2) and reduced motion on the MSA pages.
//   control    every detector flags a seeded fault (wide box -> sideways scroll, clipped nowrap label -> clipped text, 1s transition -> slow motion)
//   landscape  no sideways scroll, no control covered, fixed/sticky bars leave >= 50% of 390px
//   zoom       no sideways scroll, no text clipped by overflow + nowrap, controls reachable
//   motion     reducedMotion: reduce -> no transition/animation over 200ms, no smooth scrolling (CSS or script)
// Mutations (each restores one pre-fix rule and must fail the suite) are listed in MUTATIONS.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part38-landscape-zoom-motion-browser.mjs [--only=<page>] [--lang=en|bn] [--mode=landscape|zoom|motion] [--mutate=<name>] [--shots=<dir>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), LONLY = arg("lang"), MONLY = arg("mode"), SHOTS = arg("shots");
// name: [file, route glob, anchor (exactly once), replacement, page path it applies to]
const MUTATIONS = {
  recordstable: ["app/records.html", "**/records.html*", "@media (max-width: 720px) { table { display: block; overflow-x: auto; } }", "@media (max-width: 600px) { table { display: block; overflow-x: auto; } }", "/app/records.html"],
  cataloguescroll: ["app/catalogue.html", "**/catalogue.html*", 'behavior: reduceMotion ? "auto" : "smooth"', 'behavior: "smooth"', "/app/catalogue.html"],
  catalogueflash: ["app/catalogue.html", "**/catalogue.html*", "@media (prefers-reduced-motion: reduce) { .subj-row-flash { animation: none; background: #fff3cd; } }", "", "/app/catalogue.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

// index.html is a redirect stub into quranrevival.html (Quran Study, QR's home): not measured here, its findings go to QR.
const PAGES = ["notes", "journey-map", "bookmarks", "records", "hadith-collections", "hadith-study", "about"];
const MODES = {
  landscape: { viewport: { width: 844, height: 390 } },
  zoom: { viewport: { width: 640, height: 450 } }, // a 1280x900 screen at 200%: layout sees 640x450 CSS px (deviceScaleFactor only sharpens pixels)
  motion: { viewport: { width: 1280, height: 800 } },
};

// ---- detectors (run in the page) ----
function sideways() { const d = document.documentElement; return { sw: d.scrollWidth, cw: d.clientWidth, over: d.scrollWidth > d.clientWidth + 1 }; }
function clippedText() {
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    if (["SCRIPT", "STYLE", "OPTION", "SELECT", "TEXTAREA", "INPUT"].includes(el.tagName)) continue;
    if (el.checkVisibility && !el.checkVisibility({ checkVisibilityCSS: true })) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (!hasText) continue;
    const cs = getComputedStyle(el);
    if (!(cs.overflowX === "hidden" || cs.overflowX === "clip" || cs.textOverflow === "ellipsis")) continue;
    if (el.clientWidth && el.scrollWidth > el.clientWidth + 1) {
      out.push({ d: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""), s: el.textContent.trim().slice(0, 30), sw: el.scrollWidth, cw: el.clientWidth });
    }
  }
  return out;
}
function covered() {
  const out = [];
  for (const el of document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button]")) {
    if (el.disabled) continue;
    if (el.checkVisibility && !el.checkVisibility({ checkVisibilityCSS: true })) continue;
    const r0 = el.getBoundingClientRect();
    if (r0.width < 2 || r0.height < 2) continue;
    const probe = () => {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return { off: true };
      let clipped = false;
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.overflowX !== "visible" || s.overflowY !== "visible") { const b = n.getBoundingClientRect(); if (x < b.left || x > b.right || y < b.top || y > b.bottom) { clipped = true; break; } }
      }
      const top = document.elementFromPoint(x, y);
      return { ok: !clipped && top && (el === top || el.contains(top) || top.contains(el) || (el.labels && [...el.labels].some((l) => l.contains(top)))), clipped, top };
    };
    let pr = probe();
    if (pr.off) continue; // below the fold is reached by scrolling, not covered
    if (!pr.ok) { // a fixed bar over content at the first scroll position is normal: scroll the control to the middle and ask again
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
      pr = probe();
      if (pr.off) continue;
    }
    const { ok, clipped, top } = pr;
    if (!ok) out.push({ d: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""), s: (el.innerText || el.value || el.getAttribute("aria-label") || "").trim().slice(0, 24), by: top ? top.tagName.toLowerCase() + (top.id ? "#" + top.id : "") : "none", clipped });
  }
  return out;
}
function fixedBars() {
  const rows = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" && cs.position !== "sticky") continue;
    if (el.checkVisibility && !el.checkVisibility({ checkVisibilityCSS: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width < innerWidth * 0.5 || r.height < 4) continue;
    if (r.bottom <= 0 || r.top >= innerHeight) continue;
    rows.push({ d: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) });
  }
  const spans = rows.map((r) => [Math.max(0, r.top), Math.min(innerHeight, r.bottom)]).sort((a, b) => a[0] - b[0]);
  let used = 0, end = -1;
  for (const [a, b] of spans) { if (b <= end) continue; used += b - Math.max(a, end); end = b; }
  return { rows, used, free: innerHeight - used, vh: innerHeight };
}
function slowMotion() {
  const sec = (v) => Math.max(0, ...String(v).split(",").map((x) => { x = x.trim(); return x.endsWith("ms") ? parseFloat(x) / 1000 : parseFloat(x) || 0; }));
  const out = [];
  const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : "");
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    const td = sec(cs.transitionDuration) + sec(cs.transitionDelay), ad = sec(cs.animationDuration);
    if (cs.transitionProperty !== "none" && td > 0.2) out.push({ d: name(el), kind: "transition", s: td });
    if (cs.animationName !== "none" && ad > 0.2) out.push({ d: name(el), kind: "animation", s: ad });
    if (cs.scrollBehavior === "smooth") out.push({ d: name(el), kind: "scroll-behavior", s: 1 });
  }
  return out;
}
const SRC = { sideways, clippedText, covered, fixedBars, slowMotion };
const run = (page, fn) => page.evaluate(`(${SRC[fn].toString()})()`);

async function open(lang, mode, pagePath, motionReduce) {
  const m = MODES[mode];
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: m.viewport });
  await ctx.route((u) => ![new URL(BASE).hostname, "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  if (MUTATE && pagePath.includes(MUTATIONS[MUTATE][4])) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css; charset=utf-8" : file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page } = await openPage(ctx, pagePath);
  if (motionReduce) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page };
}
async function flow(tag, lang, mode, pagePath, motionReduce, fn) {
  let ctx;
  try {
    const o = await Promise.race([open(lang, mode, pagePath, motionReduce), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(o.page), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 90000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const fmt = (a) => a.slice(0, 6).map((x) => JSON.stringify(x)).join(" ");
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

// ---- positive controls: each detector must flag a seeded fault ----
if (!ONLY) {
  const ctx = await newContext(browser, { banner: false, viewport: { width: 640, height: 450 } });
  const { page } = await openPage(ctx, "/app/about.html");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const w = document.createElement("div"); w.id = "p38wide"; w.style.cssText = "width:2000px;height:10px"; document.body.appendChild(w);
    const c = document.createElement("div"); c.id = "p38clip"; c.textContent = "A seeded label that is far too long for its box"; c.style.cssText = "width:60px;overflow:hidden;white-space:nowrap"; document.body.appendChild(c);
    const t = document.createElement("div"); t.id = "p38slow"; t.style.cssText = "transition:opacity 1s"; document.body.appendChild(t);
    const b = document.createElement("button"); b.id = "p38btn"; b.textContent = "seeded"; b.style.cssText = "position:fixed;left:10px;top:10px;z-index:1"; document.body.appendChild(b);
    const cover = document.createElement("div"); cover.id = "p38cover"; cover.style.cssText = "position:fixed;left:0;top:0;width:200px;height:100px;z-index:99999"; document.body.appendChild(cover);
    const bar = document.createElement("div"); bar.id = "p38bar"; bar.style.cssText = "position:fixed;left:0;right:0;top:0;height:300px;z-index:1;pointer-events:none"; document.body.appendChild(bar);
  });
  check("control: a seeded 2000px box is flagged as sideways scroll", (await run(page, "sideways")).over);
  check("control: a seeded clipped nowrap label is flagged", (await run(page, "clippedText")).some((x) => x.d === "div#p38clip"));
  check("control: a seeded 1s transition is flagged", (await run(page, "slowMotion")).some((x) => x.d === "div#p38slow" && x.kind === "transition"));
  check("control: a seeded button under an overlay is flagged as covered", (await run(page, "covered")).some((x) => x.d === "button#p38btn"));
  check("control: a seeded 300px fixed bar leaves under 50% of 450px", (await run(page, "fixedBars")).free < 225);
  await page.evaluate(() => { document.getElementById("p38wide").remove(); });
  check("control: with the wide box removed, sideways scroll clears", !(await run(page, "sideways")).over);
  await ctx.close();
}

for (const lang of LANGS) for (const pg of PAGES) {
  if (ONLY && !ONLY.split(",").some((o) => pg.includes(o))) continue;
  const p = `/app/${pg}.html`;
  if (!MONLY || MONLY === "landscape") {
    const tag = `${lang} landscape 844x390 ${pg}`;
    await flow(tag, lang, "landscape", p, false, async (page) => {
      const s = await run(page, "sideways");
      check(`${tag}: no sideways scroll`, !s.over, `scrollWidth ${s.sw} > ${s.cw}`);
      const cv = await run(page, "covered");
      check(`${tag}: no control cut off or covered`, cv.length === 0, fmt(cv));
      const fb = await run(page, "fixedBars");
      check(`${tag}: fixed/sticky bars leave >= 50% of the height`, fb.free >= fb.vh / 2, `${fb.used}px used of ${fb.vh}: ${fmt(fb.rows)}`);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${lang}-landscape-${pg}.png`) });
    });
  }
  if (!MONLY || MONLY === "zoom") {
    const tag = `${lang} zoom 640x450 ${pg}`;
    await flow(tag, lang, "zoom", p, false, async (page) => {
      const s = await run(page, "sideways");
      check(`${tag}: no sideways scroll`, !s.over, `scrollWidth ${s.sw} > ${s.cw}`);
      const ct = await run(page, "clippedText");
      check(`${tag}: no text clipped by overflow + nowrap`, ct.length === 0, fmt(ct));
      const cv = await run(page, "covered");
      check(`${tag}: no control cut off or covered`, cv.length === 0, fmt(cv));
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${lang}-zoom-${pg}.png`) });
    });
  }
  if (!MONLY || MONLY === "motion") {
    const tag = `${lang} reduced-motion ${pg}`;
    await flow(tag, lang, "motion", p, true, async (page) => {
      const sm = await run(page, "slowMotion");
      check(`${tag}: nothing runs over 200ms or scrolls smoothly`, sm.length === 0, fmt(sm));
    });
  }
}

// Script-driven smooth scrolling: every in-scope script must honour reduced motion.
if (!ONLY && (!MONLY || MONLY === "motion")) {
  const files = [...fs.readdirSync(path.join(ROOT, "app/js")).filter((f) => f.endsWith(".js") && !/^(_prev|hifz-|asma|ldog|qcr|quran|word-|screensaver)/.test(f)).map((f) => `app/js/${f}`),
    ...["bookmarks", "records", "notes", "journey-map", "hadith-collections", "hadith-study", "about", "index"].map((f) => `app/${f}.html`)];
  files.push("app/catalogue.html");
  const read = (f) => { const rel = MUTATE && MUTATIONS[MUTATE][0] === f ? MUTATIONS[MUTATE] : null; const b = fs.readFileSync(path.join(ROOT, f), "utf8"); return rel ? b.split(rel[2]).join(rel[3]) : b; };
  const hits = files.filter((f) => /behavior\s*:\s*["']smooth["']/.test(read(f)));
  check("motion: no in-scope script asks for smooth scrolling unconditionally", hits.length === 0, hits.join(", "));
  const cat = read("app/catalogue.html");
  check("motion: the catalogue row highlight does not fade under reduced motion", /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.subj-row-flash\s*\{\s*animation:\s*none/.test(cat));
  check("motion: the catalogue jump asks for instant scrolling under reduced motion", /reduceMotion \? "auto" : "smooth"/.test(cat));
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
