// Audit part 54 (PCF MSA J29): the study modules and teaching pages, walked by the PCF User Manual.
//   control    the detectors find a seeded cut-off button, covered button, short ← Back, grey-on-white text and sideways scroll
//   <page>     deen-study, arabic-study (Topic study), people (Hand the device / View as), classes, course-offers, curriculum,
//              catalogue: each opened directly and as a window (?inWindow=1) at 390, 820 and 1280, English and Bangla,
//              the page's main "How to use" claim asserted from the rendered page, then the five detectors
//   hidden     the four hidden modules are not in the menu, and an old link to one still opens it
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part54-study-teach-browser.mjs [--only=<page>] [--width=N] [--lang=en|bn] [--mutate=<name>] [--quiet]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; if (!process.argv.includes("--quiet")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang");
// name: [file, route glob, anchor (exactly once), replacement]. Each puts one fix back to the old code.
const MUTATIONS = {
  offersmuted: ["app/course-offers.html", "**/course-offers.html*", "  .muted { color: #666; font-size: 0.85rem; }", "  .muted { color: #888; font-size: 0.85rem; }"],
  curriculummuted: ["app/curriculum.html", "**/curriculum.html*", "  .muted { color: #666; font-size: 0.85rem; }", "  .muted { color: #888; font-size: 0.85rem; }"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

// ---- in the page: one measurement of everything on screen -------------------------------------------------------------
function measure(scope) {
  const vw = innerWidth;
  const out = { over: document.documentElement.scrollWidth - vw, cut: [], covered: [], backSmall: [], small: [], contrast: [], nCtl: 0, nText: 0 };
  const desc = (e) => (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : "") + ":" + (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 18)).slice(0, 60);
  const folded = (e) => { for (let d = e.closest("details"); d; d = d.parentElement && d.parentElement.closest("details")) { if (!d.open && !(e.closest("summary") && e.closest("summary").parentElement === d)) return true; } return false; };
  const vis = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none" && !e.closest("[hidden]") && !folded(e); };
  const sx = scrollX, sy = scrollY;
  const ctl = [...document.querySelectorAll("button, a[href], select, summary, input:not([type=hidden]), textarea")].filter(vis);
  for (const e of ctl) {
    if (e.closest("#zabCorner, #zabBar, #zabPanel")) continue;
    if (scope && !e.closest(scope)) continue;
    out.nCtl++;
    let r = e.getBoundingClientRect();
    const scrolls = (() => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if ((o === "auto" || o === "scroll") && a.scrollWidth > a.clientWidth) return true; } return false; })();
    if (!scrolls && (r.right > vw + 1 || r.left < -1)) out.cut.push(desc(e) + ` [${Math.round(r.left)},${Math.round(r.right)}]`);
    if (/^←/.test((e.textContent || "").trim()) && r.height < 39.5) out.backSmall.push(desc(e) + ` h=${Math.round(r.height)}`);
    const isFinger = e.matches("button, select, summary") || (e.matches("input") && !/^(checkbox|radio|file)$/.test(e.type)) || (e.matches("a") && e.matches(".btn, .button, [class*=btn]"));
    if (isFinger && Math.min(r.height, 1e9) < 39.5) out.small.push(desc(e) + ` h=${Math.round(r.height)}`);
    e.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    r = e.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > vw) continue;
    const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1), y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
    const at = document.elementFromPoint(x, y);
    if (!at || at === e || e.contains(at) || at.contains(e) || (e.labels && [...e.labels].some((l) => l.contains(at)))) continue;
    out.covered.push(desc(e) + " under " + desc(at));
  }
  scrollTo(sx, sy);
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => {
    const chain = []; for (let n = el; n; n = n.parentElement) chain.push(n);
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = chain.length - 1; i >= 0; i--) {
      const cs = getComputedStyle(chain[i]);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const c = parse(cs.backgroundColor); if (c && c.a > 0) base = over(c, base);
    }
    return base;
  };
  const seen = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const e = n.parentElement; if (!e || seen.has(e) || !vis(e)) continue;
    if (e.closest("script, style, option, svg, canvas, [disabled], [aria-disabled=true], #zabCorner, #zabBar, #zabPanel")) continue;
    seen.add(e); out.nText++;
    const cs = getComputedStyle(e);
    const bg = bgOf(e); if (!bg) continue;
    let fg = parse(cs.color); if (!fg) continue;
    let op = 1; for (let a = e; a; a = a.parentElement) op *= Number(getComputedStyle(a).opacity);
    fg = over({ ...fg, a: fg.a * op }, bg);
    const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    const rr = ratio(fg, bg);
    if (rr < need) out.contrast.push(`${desc(e)} ${rr.toFixed(2)}<${need} (${cs.color} on rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)}))`);
  }
  for (const k of ["cut", "covered", "backSmall", "small", "contrast"]) out[k] = [...new Set(out[k])];
  return out;
}
// English left on a page opened in Bangla: visible Latin words of 4+ letters, minus proper names the page may keep.
const PROPER = /^(Mapping|Journey|WordPress|Google|Zab|Quran|Qur|Tools|Export|CSV|HTML|Madrasatul|Muslimeen|MSA|Ahsan|Maryam|Yusuf|Zayd|Seeded|Fatiha|Surah|Allah|Ikhlas|Kursi|Test|Hadith|Asma|Husna|QuranRevival|Learn|smahk|gmail|Morning|Evening|Class|General|Grades|Year|example|lesson|invited|gone|Ayah|Fiqh|Tajweed|Tafsir|Arabic|Nahw|Sarf|Deen|Study|Studied|Practised|Approach|Approaches|Ladder|Ladders|Level|Levels)$/i;
function latinLeft() {
  const out = new Set(), seen = new Set();
  const vis = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none' && !e.closest('[hidden]'); };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const e = n.parentElement; if (!e || seen.has(e) || !vis(e) || e.closest('script, style, code, #zabCorner, #zabBar, #zabPanel, [lang=en], [data-i18n-skip]' + (window.__latinSkip ? ', ' + window.__latinSkip : ''))) continue;
    for (const m of n.nodeValue.matchAll(/[A-Za-z]{4,}/g)) if (!PROPER.test(m[0]) && !/^(https?|www)$/i.test(m[0])) out.add(m[0] + ' in ' + e.tagName.toLowerCase() + (e.id ? '#' + e.id : ''));
  }
  return [...out];
}
const LATIN_SRC = latinLeft.toString();
const PROPER_SRC = PROPER.toString();
const MEASURE_SRC = measure.toString();

const settle = (p, ms = 350) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource|\[write failure\]|denied by the test/i.test(e));
const visible = (p, sel) => ev(p, (s) => [...document.querySelectorAll(s)].some((e) => { const b = e.getBoundingClientRect(), c = getComputedStyle(e); return b.width > 0 && b.height > 0 && c.visibility !== "hidden" && c.display !== "none" && !e.closest("[hidden]"); }), sel);
async function until(name, fn, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 100)); }
  console.log(`  TIMEOUT  waiting for: ${name}`);
  return false;
}

/** Judge one state: it must really be on screen (positive control), then the detectors. */
async function state(t, p, label, mustSee, only = {}) {
  const tt = `${t}: ${label}`;
  const seen = await visible(p, mustSee);
  check(`${tt}: POSITIVE CONTROL it is on screen (${mustSee})`, seen);
  if (!seen) return null;
  const m = await p.evaluate(`(${MEASURE_SRC})(${JSON.stringify(only.scope || null)})`);
  check(`${tt}: ${m.nCtl} controls and ${m.nText} texts were measured`, m.nCtl > 0 && m.nText > 0, JSON.stringify({ n: m.nCtl, t: m.nText }));
  check(`${tt}: no sideways scroll`, m.over <= 0, `scrollWidth - innerWidth = ${m.over}`);
  check(`${tt}: no control cut off at the screen edge`, m.cut.length === 0, m.cut.slice(0, 5).join(" | "));
  check(`${tt}: no control covered by something else`, m.covered.length === 0, m.covered.slice(0, 5).join(" | "));
  check(`${tt}: every ← Back is 40px or taller`, m.backSmall.length === 0, m.backSmall.slice(0, 5).join(" | "));
  check(`${tt}: every finger control is 40px or taller`, m.small.length === 0, m.small.slice(0, 6).join(" | "));
  check(`${tt}: text colour 4.5:1 against its real background`, m.contrast.length === 0, m.contrast.slice(0, 6).join(" | "));
  if (t.startsWith("bn ")) {
    await p.evaluate((k) => { window.__latinSkip = k; }, only.latinSkip || "");
    const left = await p.evaluate(`(() => { const PROPER = ${PROPER_SRC}; return (${LATIN_SRC})(); })()`);
    check(`${tt}: no English left on the Bangla page (proper names aside)`, left.length === 0, left.slice(0, 8).join(" | "));
  }
  return m;
}

// ---- opening a page ---------------------------------------------------------------------------------------------------
const SEED = `window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;`;
async function open(lang, width, height, pagePath, extraSeedJs = "") {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: SEED + extraSeedJs });
  await ctx.route((u) => ![new URL(BASE).hostname, "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem("mm_card_look", "night"); } catch { /* */ } });
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css; charset=utf-8" : file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, pagePath, fn, seed = "") {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const height = width < 600 ? 844 : width < 1000 ? 1024 : 800;
  const tag = `${lang} ${width}x${height} ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, height, pagePath, seed), new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT opening the page")), 45000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT in the flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}

// ---- the pages -------------------------------------------------------------------------------------------------------
const PAGES = {
  deen: { file: "deen-study.html", see: "h1" },
  arabic: { file: "arabic-study.html", see: "h1" },
  people: { file: "people.html", see: "h1" },
  classes: { file: "classes.html", see: "h1" },
  offers: { file: "course-offers.html", see: "h1" },
  curriculum: { file: "curriculum.html", see: "h1" },
  catalogue: { file: "catalogue.html", see: "h1" },
};
// The manual's "How to use" names these controls: each must be on the rendered page (or behind its own fold) at this width.
const NEEDS = {
  people: ["#startStudyBtn", "#viewAsSelect"],
  classes: ["#createClassBtn"],
  offers: ["#createOfferBtn"],
  curriculum: ["#createUnitBtn", "#addPlanEntryBtn"],
  catalogue: ["#addSubjBtn", "#addApproachBtn", "#addLadderBtn", "#addLevelBtn"],
};
const ACTIONS = {};
for (const [k, sels] of Object.entries(NEEDS)) ACTIONS[k] = async (t, p) => {
  const TAB = { "#addSubjBtn": "subjects", "#addApproachBtn": "approaches", "#addLadderBtn": "ladders", "#addLevelBtn": "ladders" };
  for (const s of sels) {
    if (k === "catalogue") { await ev(p, (n) => document.querySelector(`[data-cat-tab="${n}"]`)?.click(), TAB[s]); await settle(p, 300); }
    const r = await ev(p, (q) => { const e = document.querySelector(q); if (!e) return null; e.closest("details")?.setAttribute("open", ""); e.scrollIntoView({ block: "center" }); const b = e.getBoundingClientRect(); const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return { w: Math.round(b.width), h: Math.round(b.height), hit: !!at && (at === e || e.contains(at) || at.contains(e)) }; }, s);
    check(`${t}: manual control ${s} exists, has a box and is not covered`, !!r && r.w > 0 && r.h > 0 && r.hit, JSON.stringify(r));
  }
};

function pageFlow(key) {
  const def = PAGES[key];
  return async (t, p, errors) => {
    await until("the page heading shows", () => visible(p, def.see), 20000);
    await settle(p, 900);
    await state(t, p, "first screen", def.see, { latinSkip: def.latinSkip });
    if (ACTIONS[key]) await ACTIONS[key](t, p, errors);
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  };
}

// ---- the detectors prove themselves -------------------------------------------------------------------------------------
if (!ONLY || ONLY.split(",").includes("control")) await flow("control", "en", 390, "/app/about.html", async (t, p) => {
  await ev(p, () => {
    const d = document.createElement("div");
    d.innerHTML = '<button id="c1" style="position:absolute;left:-80px;top:300px;width:60px;height:44px">cut</button>'
      + '<button id="c2" style="position:absolute;left:100px;top:360px;width:90px;height:44px">covered</button><div id="c2x" style="position:absolute;left:90px;top:350px;width:120px;height:70px;background:#fff;z-index:99999"></div>'
      + '<button id="c3" style="position:absolute;left:10px;top:440px;height:30px">← Back</button>'
      + '<p id="c4" style="position:absolute;left:10px;top:500px;margin:0;background:#fff;color:#999">grey on white</p>'
      + '<div id="c5" style="position:absolute;left:0;top:560px;width:2000px;height:10px"></div>';
    document.body.appendChild(d);
  });
  const m = await p.evaluate(`(${MEASURE_SRC})()`);
  check(`${t}: POSITIVE CONTROL a button off the left edge is found`, m.cut.some((x) => x.includes("#c1")), JSON.stringify(m.cut));
  check(`${t}: POSITIVE CONTROL a covered button is found`, m.covered.some((x) => x.includes("#c2")), JSON.stringify(m.covered));
  check(`${t}: POSITIVE CONTROL a 30px ← Back is found`, m.backSmall.some((x) => x.includes("#c3")), JSON.stringify(m.backSmall));
  check(`${t}: POSITIVE CONTROL a 30px button is found as a small finger control`, m.small.some((x) => x.includes("#c3")), JSON.stringify(m.small));
  check(`${t}: POSITIVE CONTROL grey #999 on white is found`, m.contrast.some((x) => x.includes("#c4")), JSON.stringify(m.contrast.slice(0, 3)));
  check(`${t}: POSITIVE CONTROL sideways scroll is found`, m.over > 0, String(m.over));
});
if (!ONLY || ONLY.split(",").includes("control")) await flow("control", "bn", 390, "/app/about.html", async (t, p) => {
  await ev(p, () => { const e = document.createElement("p"); e.id = "c6"; e.textContent = "আপনি teacher হিসেবে"; document.body.prepend(e); });
  const left = await p.evaluate(`(() => { const PROPER = ${PROPER_SRC}; return (${LATIN_SRC})(); })()`);
  check(`${t}: POSITIVE CONTROL an English word on a Bangla page is found`, left.some((x) => x.startsWith("teacher")), JSON.stringify(left.slice(0, 5)));
});

// ---- the sweep ----------------------------------------------------------------------------------------------------------
const WIDTHS = [390, 820, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
for (const key of Object.keys(PAGES)) for (const lang of LANGS) for (const width of WIDTHS) {
  const f = PAGES[key].file;
  await flow(key, lang, width, `/app/${f}`, pageFlow(key), PAGES[key].seed || "");
  await flow(key + "-window", lang, width, `/app/${f}?inWindow=1`, pageFlow(key), PAGES[key].seed || "");
}

// ---- hidden modules: out of the menu, still open by an old link ------------------------------------------------------------
if (!ONLY || ONLY.split(",").includes("hidden")) {
  await flow("hidden-menu", "en", 1280, "/app/quranrevival.html", async (t, p) => {
    await settle(p, 800);
    const hrefs = await ev(p, () => [...document.querySelectorAll(".app-nav a[href]")].map((a) => a.getAttribute("href")));
    check(`${t}: POSITIVE CONTROL the menu lists links (${hrefs.length}), among them Hadith`, hrefs.length > 5 && hrefs.some((h) => h.startsWith("hadith-study")), hrefs.join(","));
    for (const f of ["general-study", "naturelife-study", "life-skill", "health-study"]) check(`${t}: the menu has no link to ${f}`, !hrefs.some((h) => h.startsWith(f)), hrefs.join(","));
  });
  for (const f of ["general-study.html", "naturelife-study.html", "life-skill.html", "health-study.html"]) {
    await flow("hidden-link-" + f, "en", 390, `/app/${f}`, async (t, p, errors) => {
      check(`${t}: an old link still opens the page (heading on screen)`, await until("heading", () => visible(p, "h1"), 20000));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    });
  }
}

await browser.close();
console.log(`\n==== audit-part54${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
