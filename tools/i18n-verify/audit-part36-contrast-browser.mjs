// Audit part 36 (PCF MSA J29): text and control colour contrast on the MSA pages, Night and Light looks, English and Bangla.
//   control  the detectors flag a seeded #999 on #fff text, composite a semi-transparent parent correctly, and flag a seeded 1px #ddd border
//   text     every visible text node against its real rendered background (4.5:1, or 3:1 when large)
//   ctl      every enabled button/box/picker whose border or fill marks it out is 3:1 against what is beside it
// Mutations (each must fail the suite) are listed in MUTATIONS.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part36-contrast-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--look=night|light] [--mutate=<name>] [--list]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (process.argv.some((a) => a.startsWith("--out="))) { if (ok) pass++; else { fail++; console.log(`  FAIL  ${name}`); } return; } // a findings run prints names only
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang"), KONLY = arg("look");
const LIST = process.argv.includes("--list");
// name: [file, route glob, anchor (exactly once), replacement, page path it applies to]
const MUTATIONS = {
  muted: ["app/monitor.html", "**/monitor.html*", "  .muted { color: #666; font-size: 0.85rem; }", "  .muted { color: #888; font-size: 0.85rem; }", "/app/monitor.html"],
  learning: ["app/monitor.html", "**/monitor.html*", "  .status-learning { color: #8a6212; }", "  .status-learning { color: #b8862f; }", "/app/monitor.html"],
  fieldborder: ["app/monitor.html", "**/monitor.html*", "input[type=\"month\"] { padding: 0.4rem; font-size: 0.92rem; border: 1px solid #8c8c8c;", "input[type=\"month\"] { padding: 0.4rem; font-size: 0.92rem; border: 1px solid #ccc;", "/app/monitor.html"],
  navlabel: ["app/css/shell.css", "**/css/shell.css*", "  color: #666; margin-bottom: 0.2rem;", "  color: #999; margin-bottom: 0.2rem;", "/app/notes.html"],
  navcurrent: ["app/css/shell.css", "**/css/shell.css*", ".nav-current { color: #666;", ".nav-current { color: #888;", "/app/journey-map.html"],
  // part 37: each restores the pre-fix colour of one rule
  pillended: ["app/course-offers.html", "**/course-offers.html*", "  .pill-ended, .pill-archived { background: #eee; color: #666; }", "  .pill-ended, .pill-archived { background: #eee; color: #888; }", "/app/course-offers.html"],
  pillarchived: ["app/curriculum.html", "**/curriculum.html*", "  .pill-archived { background: #eee; color: #666; }", "  .pill-archived { background: #eee; color: #888; }", "/app/curriculum.html"],
  goldtext: ["app/deen-study.html", "**/deen-study.html*", "cursor: pointer; color: #8a6212; padding: 0.05rem 0.35rem; }", "cursor: pointer; color: #B8862F; padding: 0.05rem 0.35rem; }", "/app/deen-study.html"],
  goldactive: ["app/deen-study.html", "**/deen-study.html*", ".topic-bookmark-btn.active { background: #8a6212; color: #fff; border-color: #8a6212; }", ".topic-bookmark-btn.active { background: #B8862F; color: #fff; border-color: #B8862F; }", "/app/deen-study.html"],
  pathbranch: ["app/journey-map.html", "**/journey-map.html*", ".path-branch.system > .path-branch-head .path-branch-name { color: #8a6212; }", ".path-branch.system > .path-branch-head .path-branch-name { color: #B8862F; }", "/app/journey-map.html"],
  hadithfield: ["app/css/hadith.css", "**/css/hadith.css*", "  .hadith-lang-select { min-height: 40px; min-width: 0; padding: 0.3rem 0.5rem; border-radius: 0.35rem; border: 1px solid var(--hadith-field); }", "  .hadith-lang-select { min-height: 40px; min-width: 0; padding: 0.3rem 0.5rem; border-radius: 0.35rem; border: 1px solid var(--hadith-rule); }", "/app/hadith-collections.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

const PAGES = ["notes", "journey-map", "bookmarks", "records", "monitor", "hadith-collections", "hadith-study", "deen-study", "arabic-study", "people", "classes", "homework", "catalogue", "dawah", "import-notes", "about"];

// Runs in the page. Returns { text: [...], ctl: [...], skipped: {...} } for everything visible.
function scan() {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const desc = (e) => (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : "")).slice(0, 56);
  const root = document.documentElement;
  // The real background behind an element: layers from the element up, composited over the first opaque one.
  // Returns { c, image } where image is true when a background-image / gradient sits in the chain (not measurable by colour).
  const bgBehind = (el, includeSelf) => {
    const layers = []; let image = false; let base = null;
    for (let n = includeSelf ? el : el.parentElement; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      const c = parse(s.backgroundColor);
      if (s.backgroundImage && s.backgroundImage !== "none") image = true;
      if (c && c.a > 0) { layers.push({ c, op: 1 }); if (c.a >= 1) { base = c; break; } }
      if (parseFloat(s.opacity) < 1) layers.push({ opacity: parseFloat(s.opacity) });
    }
    let cur = base || { r: 255, g: 255, b: 255, a: 1 }; // the canvas
    const start = base ? layers.length - 2 : layers.length - 1;
    for (let i = start; i >= 0; i--) {
      const l = layers[i];
      if (l.opacity !== undefined) continue; // an ancestor's opacity is applied to its whole subtree: handled by the caller through effOpacity
      cur = over(l.c, cur);
    }
    return { c: cur, image };
  };
  const effOpacity = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };
  const visible = (el) => {
    // checkVisibility sees closed <details>, content-visibility and display:none ancestors that a rect alone cannot
    if (el.checkVisibility && !el.checkVisibility({ checkVisibilityCSS: true })) return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (n.hasAttribute("hidden") || s.display === "none" || s.visibility === "hidden") return false;
      if (n.tagName === "DETAILS" && !n.open && n !== el && !(el.tagName === "SUMMARY")) { /* summary content only */ }
    }
    return true;
  };
  const text = [], ctl = [];
  const skipped = { disabled: 0, placeholder: 0, image: 0, textOnly: 0, offscreen: 0 };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.nodeValue.trim()) continue;
    const el = t.parentElement;
    if (!el || ["SCRIPT", "STYLE", "NOSCRIPT", "OPTION", "TEMPLATE"].includes(el.tagName)) continue;
    if (!visible(el)) continue;
    // a closed <details>' body is not drawn
    let hiddenInDetails = false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) if (n.tagName === "DETAILS" && !n.open) { const sm = [...n.children].find((c) => c.tagName === "SUMMARY"); if (!(sm && sm.contains(el))) hiddenInDetails = true; }
    if (hiddenInDetails) continue;
    const range = document.createRange(); range.selectNodeContents(t);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) continue;
    const key = el; // one measurement per element is enough: the colour is the element's
    if (seen.has(key)) continue; seen.add(key);
    // clipped away (overflow hidden/scroll ancestor) is not visible
    const r = rects[0];
    if (r.right < 0 || r.bottom < 0 || r.left > innerWidth + 4000 || r.top > document.documentElement.scrollHeight) { skipped.offscreen++; continue; }
    const cs = getComputedStyle(el);
    if (el.closest("[disabled], [aria-disabled='true']") && el.closest("button, input, select, textarea, fieldset")) { skipped.disabled++; continue; }
    const fg0 = parse(cs.color); if (!fg0) continue;
    const bgr = bgBehind(el, true);
    const op = effOpacity(el);
    // opacity composites the text over its backdrop: fold it into the foreground alpha
    const fg = over({ ...fg0, a: fg0.a * op }, bgr.c);
    const bgc = op < 1 ? bgBehind(el, true).c : bgr.c;
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700 || cs.fontWeight === "bold";
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    const rt = ratio(fg, bgc);
    const row = { d: desc(el), s: t.nodeValue.trim().slice(0, 28), fg: hex(fg), bg: hex(bgc), r: Math.round(rt * 100) / 100, need, ok: rt >= need - 0.005, image: bgr.image };
    text.push(row);
  }
  // Controls
  for (const el of document.querySelectorAll("button, select, input:not([type=hidden]), textarea, summary, [role=button]")) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    if (el.disabled || el.getAttribute("aria-disabled") === "true") { skipped.disabled++; continue; }
    const cs = getComputedStyle(el);
    const around = bgBehind(el, false).c;
    const own = parse(cs.backgroundColor);
    const fill = own && own.a > 0 ? over(own, around) : null;
    const bw = Math.max(...["Top", "Right", "Bottom", "Left"].map((s) => parseFloat(cs["border" + s + "Width"]) * (cs["border" + s + "Style"] === "none" ? 0 : 1)));
    const bcol = parse(cs.borderTopColor) && bw > 0 ? over(parse(cs.borderTopColor), fill || around) : null;
    // the border is judged against what is beside it (the parent), the fill likewise
    const bR = bcol ? ratio(bcol, around) : 0, fR = fill ? ratio(fill, around) : 0;
    const marked = (bw > 0 && bcol && bR > 1.05) || (fill && fR > 1.05);
    if (!marked) { skipped.textOnly++; continue; }
    // A button or summary that carries visible text is marked out by that text (1.4.11 exception); a box you type or pick in is not.
    const isField = ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) && !["button", "submit", "reset", "checkbox", "radio"].includes((el.type || "").toLowerCase());
    if (!isField && (el.innerText || "").trim()) { skipped.textOnly++; continue; }
    // shadow also marks a box
    const shadow = cs.boxShadow !== "none";
    const ok = bR >= 3 || fR >= 3;
    ctl.push({ d: desc(el), s: (el.innerText || el.value || el.getAttribute("aria-label") || "").trim().slice(0, 24), border: bcol ? hex(bcol) : "-", fill: fill ? hex(fill) : "-", around: hex(around), bR: Math.round(bR * 100) / 100, fR: Math.round(fR * 100) / 100, ok, shadow });
  }
  return { text, ctl, skipped };
}
const SCAN_SRC = scan.toString();

async function open(lang, look, width, height, pagePath, seed) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: seed });
  await ctx.addInitScript((lk) => { try { localStorage.setItem("mm_card_look", lk); } catch {} }, look);
  await ctx.route((u) => ![new URL(BASE).hostname, "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  await ctx.route("**/js/zab-readiness.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_ZAB }));
  if (MUTATE && pagePath.includes(MUTATIONS[MUTATE][4])) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css; charset=utf-8" : file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
// The Zab corner only appears once Zab is declared ready; the same test seam the other audit suites use.
const READY_ZAB = `
export const ZAB_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const ZAB_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-14", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isZabReady() { return true; }
export const REASON_ZAB_NOT_DEPLOYED = "zab-rules-not-deployed";
export const REASON_ZAB_DECISION_INCOMPLETE = "zab-readiness-decision-incomplete";
export function zabUnavailableReason() { return null; }
`;
async function flow(name, lang, look, width, height, pagePath, seed, fn) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${look} ${width}x${height} ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, look, width, height, pagePath, seed), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const WIDTHS = [390, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
const LOOKS = ["night", "light"].filter((l) => !KONLY || l === KONLY);

// Judge one scan: returns the failing text rows and control rows (image-backed text is reported, not failed).
// Each nav menu is measured open, one at a time (the nav closes the others), and the results are merged.
async function measure(page, opts = {}) {
  const s = await page.evaluate(`(${SCAN_SRC})()`);
  const n = opts.nav === false ? 0 : await page.evaluate(() => document.querySelectorAll(".nav-cat").length);
  for (let i = 0; i < n; i++) {
    await page.evaluate((k) => { document.querySelectorAll(".nav-cat").forEach((c, j) => { c.open = j === k; }); }, i);
    await page.waitForTimeout(60);
    const o = await page.evaluate(`(${SCAN_SRC})()`);
    const have = new Set(s.text.map((x) => x.d + x.s)), haveC = new Set(s.ctl.map((x) => x.d + x.s));
    o.text.forEach((x) => { if (!have.has(x.d + x.s)) s.text.push(x); });
    o.ctl.forEach((x) => { if (!haveC.has(x.d + x.s)) s.ctl.push(x); });
    for (const k of Object.keys(o.skipped)) s.skipped[k] = Math.max(s.skipped[k], o.skipped[k]);
  }
  if (opts.nav !== false) await page.evaluate(() => document.querySelectorAll(".nav-cat").forEach((c) => { c.open = false; }));
  const badText = s.text.filter((x) => !x.ok && !x.image);
  const imgText = s.text.filter((x) => !x.ok && x.image);
  const badCtl = s.ctl.filter((x) => !x.ok);
  return { s, badText, imgText, badCtl };
}
const FOUND = new Map();
const fmtText = (x) => `${x.d} "${x.s}" ${x.fg} on ${x.bg} = ${x.r}:1 (needs ${x.need})`;
const fmtCtl = (x) => `${x.d} "${x.s}" border ${x.border} (${x.bR}:1) fill ${x.fill} (${x.fR}:1) beside ${x.around}`;
// Part 37: text over an image or gradient, judged on the real pixels behind it (the scan above can only report these).
// Marks up to `cap` visible text elements whose background chain holds an image/gradient, hides each one's text in turn,
// screenshots the text box, and compares the text colour with the DARKEST and the LIGHTEST pixel behind it. The worse one is judged.
function markImageText(cap) {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  document.querySelectorAll("[data-p37i]").forEach((e) => e.removeAttribute("data-p37i"));
  const out = []; const seen = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = w.nextNode(); t && out.length < cap; t = w.nextNode()) {
    if (!t.nodeValue.trim()) continue;
    const el = t.parentElement;
    if (!el || seen.has(el) || ["SCRIPT", "STYLE", "NOSCRIPT", "OPTION", "TEMPLATE"].includes(el.tagName)) continue;
    if (el.checkVisibility && !el.checkVisibility({ checkVisibilityCSS: true })) continue;
    let image = false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== "none") { image = true; break; }
      const c = parse(s.backgroundColor); if (c && c.a >= 1) break;
    }
    if (!image) continue;
    const range = document.createRange(); range.selectNodeContents(t);
    const rs = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
    if (!rs.length) continue;
    seen.add(el);
    el.setAttribute("data-p37i", String(out.length));
    out.push({ i: out.length, d: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""), s: t.nodeValue.trim().slice(0, 24) });
  }
  return out;
}
// Runs in the page with a PNG data URL: returns the darkest and the lightest pixel as { r, g, b }.
async function extremes(url) {
  const img = new Image(); img.src = url; await img.decode();
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  let lo = null, hi = null, loL = 9, hiL = -1;
  for (let k = 0; k < d.length; k += 4) { const L = 0.2126 * f(d[k]) + 0.7152 * f(d[k + 1]) + 0.0722 * f(d[k + 2]); if (L < loL) { loL = L; lo = { r: d[k], g: d[k + 1], b: d[k + 2] }; } if (L > hiL) { hiL = L; hi = { r: d[k], g: d[k + 1], b: d[k + 2] }; } }
  return { lo, hi };
}
const lumOf = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const ratioOf = (a, b) => { const x = lumOf(a), y = lumOf(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// Judge the marked element `sel`: { fg, lo, hi, worst, need, ok }.
async function pixelJudge(page, sel) {
  const info = await page.evaluate((s) => {
    const el = document.querySelector(s); if (!el) return null;
    el.scrollIntoView({ block: "center" });
    const t = [...el.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim()) || el.firstChild;
    const range = document.createRange(); range.selectNodeContents(t || el);
    const rs = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
    if (!rs.length) return null;
    const x0 = Math.min(...rs.map((r) => r.left)), y0 = Math.min(...rs.map((r) => r.top)), x1 = Math.max(...rs.map((r) => r.right)), y1 = Math.max(...rs.map((r) => r.bottom));
    const cs = getComputedStyle(el), m = /rgba?\(([^)]+)\)/.exec(cs.color).slice(1)[0].split(/[ ,\/]+/).map(Number);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
    const st = document.createElement("style"); st.id = "p37hide"; st.textContent = `${s}, ${s} * { color: transparent !important; text-shadow: none !important; -webkit-text-fill-color: transparent !important; }`;
    document.head.appendChild(st);
    return { clip: { x: Math.max(0, x0), y: Math.max(0, y0), width: Math.min(innerWidth, x1) - Math.max(0, x0), height: Math.min(innerHeight, y1) - Math.max(0, y0) }, fg: { r: m[0], g: m[1], b: m[2] }, need: size >= 24 || (bold && size >= 18.66) ? 3 : 4.5 };
  }, sel);
  if (!info || info.clip.width < 1 || info.clip.height < 1) return null;
  const png = await page.screenshot({ clip: info.clip });
  await page.evaluate(() => document.getElementById("p37hide")?.remove());
  const { lo, hi } = await page.evaluate(`(async () => { const ex = ${extremes.toString()}; return ex(${JSON.stringify("data:image/png;base64," + png.toString("base64"))}); })()`);
  const rLo = ratioOf(info.fg, lo), rHi = ratioOf(info.fg, hi), worst = Math.min(rLo, rHi);
  return { fg: info.fg, lo, hi, worst: Math.round(worst * 100) / 100, need: info.need, ok: worst >= info.need - 0.005 };
}
const rgbHex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
async function judgeImageText(t, page, cap = 10) {
  const els = await page.evaluate(`(${markImageText.toString()})(${cap})`);
  const bad = [];
  for (const e of els) {
    const j = await pixelJudge(page, `[data-p37i="${e.i}"]`);
    if (j && !j.ok) bad.push(`${e.d} "${e.s}" ${rgbHex(j.fg)} vs darkest ${rgbHex(j.lo)} / lightest ${rgbHex(j.hi)} = ${j.worst}:1 (needs ${j.need})`);
  }
  check(`${t}: text over an image or gradient (${els.length} found) meets its ratio at the worst pixel behind it`, bad.length === 0, bad.slice(0, 6).join(" | "));
  for (const b of bad) FOUND.set(`${page.url().replace(/^.*\/app\//, "").replace(/\?.*/, "")}  IMG  ${b.split(" ")[0]}`, b);
}
async function judgePage(t, page, opts) {
  const m = await measure(page, opts && opts.nav === false ? opts : {});
  if (!(opts && opts.noImage)) await judgeImageText(t, page);
  check(`${t}: POSITIVE CONTROL the page has visible text`, m.s.text.length >= 5, String(m.s.text.length));
  check(`${t}: every text node meets 4.5:1 (3:1 large) over its real background`, m.badText.length === 0, m.badText.slice(0, 8).map(fmtText).join(" | "));
  check(`${t}: every enabled control that is marked out by a border or fill is 3:1 beside its surroundings`, m.badCtl.length === 0, m.badCtl.slice(0, 8).map(fmtCtl).join(" | "));
  if (m.imgText.length) console.log(`  NOTE  ${t}: text over an image or gradient, not measurable by colour: ${m.imgText.slice(0, 4).map(fmtText).join(" | ")}`);
  if (!process.argv.includes("--quiet") && !arg("out")) console.log(`  NOTE  ${t}: skipped disabled ${m.s.skipped.disabled}, text-only controls ${m.s.skipped.textOnly}, measured ${m.s.text.length} text and ${m.s.ctl.length} controls`);
  const pg = page.url().replace(/^.*\/app\//, "").replace(/\?.*/, "");
  for (const x of m.badText) FOUND.set(`${pg}  TEXT ${x.d} ${x.fg} on ${x.bg}`, fmtText(x));
  for (const x of m.badCtl) FOUND.set(`${pg}  CTL  ${x.d} ${x.border} ${x.fill}`, fmtCtl(x).replace(/\n/g, " "));
}

// Positive controls: the detectors flag seeded defects and composite correctly.
for (const look of LOOKS) await flow("control", "en", look, 390, 800, "/app/about.html", "", async (t, page) => {
  await ev(page, () => {
    const d = document.createElement("div");
    d.id = "pcRoot";
    d.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:99998;background:#fff;color:#000";
    d.innerHTML =
      '<p id="pc0" style="color:#000;margin:4px">solid black on white</p>' +
      '<p id="pc1" style="color:#999;margin:4px">grey on white</p>' +
      '<div style="background:rgba(0,0,0,0.5)"><p id="pc2" style="color:#fff;margin:4px">white on a half black parent</p></div>' +
      '<div style="background:rgba(0,0,0,0.5)"><p id="pc3" style="color:#555;margin:4px">dark on a half black parent</p></div>' +
      '<p id="pc4" style="color:#000;opacity:0.4;margin:4px">faded black on white</p>' +
      '<p id="pc5" style="color:#999;font-size:26px;margin:4px">large grey</p>' +
      '<input id="pc6" value="light border" style="border:1px solid #ddd;background:#fff;color:#000">' +
      '<input id="pc7" value="dark border" style="border:1px solid #555;background:#fff;color:#000">' +
      '<button id="pc10" style="border:1px solid #ddd;background:#fff;color:#000">bordered button with text</button>' +
      '<button id="pc8" style="border:0;background:transparent;color:#000">text only</button>' +
      '<button id="pc9" disabled style="border:1px solid #ddd;background:#fff;color:#000">disabled</button>';
    document.body.appendChild(d);
  });
  const s = await page.evaluate(`(${SCAN_SRC})()`);
  const tx = (id) => s.text.find((x) => x.d.includes("#" + id));
  const cl = (id) => s.ctl.find((x) => x.d.includes("#" + id));
  check(`${t}: POSITIVE CONTROL #000 on #fff passes`, tx("pc0") && tx("pc0").ok, JSON.stringify(tx("pc0")));
  check(`${t}: POSITIVE CONTROL #999 on #fff (2.8:1) is flagged`, tx("pc1") && !tx("pc1").ok && tx("pc1").r > 2.7 && tx("pc1").r < 2.9, JSON.stringify(tx("pc1")));
  check(`${t}: POSITIVE CONTROL white text over a half-black parent composites to about 0.5 black on white (passes, 7+:1)`, tx("pc2") && tx("pc2").bg === "#808080" || (tx("pc2") && tx("pc2").bg === "#7f7f7f"), JSON.stringify(tx("pc2")));
  check(`${t}: POSITIVE CONTROL #555 over that composited grey is flagged`, tx("pc3") && !tx("pc3").ok, JSON.stringify(tx("pc3")));
  check(`${t}: POSITIVE CONTROL element opacity is folded into the text colour`, tx("pc4") && tx("pc4").fg !== "#000000" && tx("pc4").r < 7, JSON.stringify(tx("pc4")));
  check(`${t}: POSITIVE CONTROL large text is judged at 3:1 (grey #999 on white at 26px is flagged only if under 3)`, tx("pc5") && tx("pc5").need === 3 && !tx("pc5").ok, JSON.stringify(tx("pc5")));
  check(`${t}: POSITIVE CONTROL a 1px #ddd border on #fff is flagged`, cl("pc6") && !cl("pc6").ok && cl("pc6").bR < 3, JSON.stringify(cl("pc6")));
  check(`${t}: POSITIVE CONTROL a 1px #555 border on #fff passes`, cl("pc7") && cl("pc7").ok, JSON.stringify(cl("pc7")));
  check(`${t}: POSITIVE CONTROL a pale-bordered button that carries text is marked out by its text (exempt, counted)`, !cl("pc10"), JSON.stringify(cl("pc10")));
  check(`${t}: POSITIVE CONTROL a text-only button is not a control to measure`, !cl("pc8"), JSON.stringify(cl("pc8")));
  check(`${t}: POSITIVE CONTROL a disabled control is skipped and counted`, !cl("pc9") && s.skipped.disabled >= 1, JSON.stringify(s.skipped));
});

for (const lang of LANGS) for (const look of LOOKS) for (const width of WIDTHS) {
  for (const p of PAGES) {
    await flow(`page:${p}`, lang, look, width, width < 600 ? 844 : 800, `/app/${p}.html`, "", judgePage);
  }
}

if (LIST) {
  const lines = [...FOUND.entries()].sort().map(([k, v]) => `${k}  =>  ${v}`);
  if (arg("out")) fs.writeFileSync(arg("out"), lines.join("\n") + "\n");
  else { console.log("\nDISTINCT FINDINGS"); lines.forEach((l) => console.log("  " + l)); }
}
// A Dua card opened, and the Zab bar (wide) or corner (narrow).
for (const lang of LANGS) for (const look of LOOKS) {
  await flow("dua", lang, look, 1280, 800, "/app/hadith-collections.html", `DATA.ayahCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, collections: [] }];`, async (t, page) => {
    await page.click('[data-hadith-tab="dua"]');
    await page.waitForSelector("[data-dua-card]", { timeout: 20000 });
    await page.waitForTimeout(500);
    await judgePage(`${t} Dua tab`, page);
  });
  for (const w of [320, 1280]) await flow("zab", lang, look, w, w < 600 ? 844 : 800, "/app/journey-map.html", "", async (t, page) => {
    const sel = w >= 768 ? "#zabBar" : "#zabCorner";
    check(`${t}: POSITIVE CONTROL the Zab ${sel} is on screen`, await page.evaluate((s) => { const e = document.querySelector(s); return !!e && e.getBoundingClientRect().width > 0; }, sel));
    await judgePage(`${t} Zab`, page);
  });
}

// ---------------------------------------------------------------- Part 37: opened windows and dialogs, pills, gold text, text over images
const P37_SEED = `(function(){window.__stubApplyBatches=true;window.__stubRecordTxData=true;window.__DATA=DATA;
var own={tenantId:"t1",ownerPersonId:"p1",ownerUid:"test-uid",schemaVersion:1};
function ts(d){return{toDate:function(){return new Date(d||"2026-09-01T10:00:00Z")},toMillis:function(){return new Date(d||"2026-09-01T10:00:00Z").getTime()}}}
DATA.noteFolders=[];DATA.notes=[];DATA.notePlacements=[];DATA.noteRevisions=[];DATA.noteSections=[];DATA.noteTags=[];DATA.noteTagLinks=[];DATA.noteSources=[];DATA.noteLinks=[];
["fA","fB"].forEach(function(id,i){DATA.noteFolders.push(Object.assign({_id:"t1__"+id,folderId:id,name:"Folder "+(i+1),parentFolderId:null,semanticRole:"user",order:i,status:"active",updatedAt:ts()},own))});
function hx(l){return l.slice(1).repeat(32)}
function N(l,title,day,extra){var id=hx(l);DATA.notes.push(Object.assign({_id:"t1__"+id,noteId:id,title:title,bodyHtml:"<p>Body "+l+"</p>",currentRevisionId:"rev-"+id,status:"active",visibility:"private",createdAt:ts("2026-08-0"+day+"T09:00:00Z"),updatedAt:ts("2026-09-0"+day+"T10:00:00Z")},own,extra||{}));
DATA.noteSources.push(Object.assign({_id:"t1__s-"+id,sourceLinkId:"s-"+id,noteId:id,sourceKey:"ayah:2:255",sourceKind:"quran-unit",relationshipKind:"origin",approachId:null,provenanceKind:"study-note",status:"active",createdAt:ts(),updatedAt:ts()},own))}
function P(id,l,folder,o){DATA.notePlacements.push(Object.assign({_id:"t1__"+id,placementId:id,noteId:hx(l),folderId:folder,order:o,status:"active"},own))}
N("n1","First note",1,{favourite:true});N("n3","Third note",3);N("n4","Fourth note",4);
P("p1","n1","fA",0);P("p3","n3","fB",0);P("p4","n4","fB",1);
})();`;
const P37_NOTES = "/app/notes.html?unit=" + encodeURIComponent("ayah:2:255") + "&label=Test";
const opened = (page, sel) => ev(page, (s) => [...document.querySelectorAll(s)].some((e) => { const b = e.getBoundingClientRect(); const c = getComputedStyle(e); return b.width > 0 && b.height > 0 && c.visibility !== "hidden" && c.display !== "none" && !e.closest("[hidden]"); }), sel);
const settle = (page, ms = 350) => page.waitForTimeout(ms);
// Seeds a fixture of real classes into the page, so the page's OWN stylesheet colours it; returns the scan rows by element id.
async function fixtureRows(page, html, hostSel) {
  await ev(page, ([h, host]) => { const w = document.createElement("div"); w.id = "p37fx"; w.innerHTML = h; (document.querySelector(host) || document.body).appendChild(w); w.scrollIntoView({ block: "center" }); }, [html, hostSel || "main"]);
  const s = await page.evaluate(`(${SCAN_SRC})()`);
  return { text: (id) => s.text.find((x) => x.d.includes("#" + id)), ctl: (id) => s.ctl.find((x) => x.d.includes("#" + id)) };
}

// Text over an image or gradient: the pixel-read detector flags what the colour scan cannot see.
for (const look of LOOKS) await flow("p37-pixel-control", "en", look, 390, 800, "/app/about.html", "", async (t, page) => {
  await ev(page, () => {
    const d = document.createElement("div"); d.id = "pxRoot";
    d.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:99998;background:#fff";
    d.innerHTML =
      '<div style="background:linear-gradient(to right,#000,#fff);margin:6px"><p id="px1" style="color:#fff;margin:0;padding:8px;font-size:20px">white over black-to-white</p></div>' +
      '<div style="background:linear-gradient(#000,#222);margin:6px"><p id="px2" style="color:#fff;margin:0;padding:8px;font-size:20px">white over near black</p></div>' +
      '<div style="background:linear-gradient(#fff,#ddd);margin:6px"><p id="px3" style="color:#000;margin:0;padding:8px;font-size:20px">black over near white</p></div>' +
      '<div style="background:linear-gradient(to right,#fff 50%,#222 50%);margin:6px"><p id="px4" style="color:#777;margin:0;padding:8px;font-size:20px">mid grey over half white half black</p></div>';
    document.body.appendChild(d);
  });
  const j1 = await pixelJudge(page, "#px1"), j2 = await pixelJudge(page, "#px2"), j3 = await pixelJudge(page, "#px3"), j4 = await pixelJudge(page, "#px4");
  check(`${t}: POSITIVE CONTROL white text over a black-to-white gradient is flagged (the lighter pixels behind the text box give under 3:1)`, j1 && !j1.ok && j1.worst < 3, JSON.stringify(j1));
  check(`${t}: POSITIVE CONTROL white text over near-black passes`, j2 && j2.ok, JSON.stringify(j2));
  check(`${t}: POSITIVE CONTROL black text over near-white passes`, j3 && j3.ok, JSON.stringify(j3));
  check(`${t}: POSITIVE CONTROL grey text over a half-white half-black image is flagged by the worse side`, j4 && !j4.ok, JSON.stringify(j4));
  const marked = await page.evaluate(`(${markImageText.toString()})(10)`);
  check(`${t}: POSITIVE CONTROL the marker finds the four seeded gradient texts`, marked.length === 4, JSON.stringify(marked));
});

// Pills, gold text, the path-branch name: real classes injected into the real pages.
for (const lang of LANGS) for (const look of LOOKS) for (const width of WIDTHS) {
  const H = width < 600 ? 844 : 800;
  for (const [pg, cls] of [["course-offers", ["pill-ended", "pill-archived"]], ["curriculum", ["pill-archived"]]]) {
    await flow(`p37-pill-${pg}`, lang, look, width, H, `/app/${pg}.html`, "", async (t, page) => {
      const fx = await fixtureRows(page, cls.map((c, i) => `<p><span id="pill${i}" class="pill ${c}">${c}</span></p>`).join(""), "main, .container, body");
      cls.forEach((c, i) => { const r = fx.text("pill" + i); check(`${t}: .${c} meets 4.5:1`, !!r && r.ok, JSON.stringify(r)); });
    });
  }
  for (const pg of ["deen-study", "hadith-study"]) {
    await flow(`p37-gold-${pg}`, lang, look, width, H, `/app/${pg}.html`, "", async (t, page) => {
      const fx = await fixtureRows(page, '<h2>Topic <button type="button" id="gold0" class="topic-bookmark-btn">★</button> <button type="button" id="gold1" class="topic-bookmark-btn active">★</button></h2>', "main, .container, body");
      const a = fx.text("gold0"), b = fx.text("gold1");
      check(`${t}: .topic-bookmark-btn gold text meets 3:1 (large) or 4.5:1`, !!a && a.ok, JSON.stringify(a));
      check(`${t}: .topic-bookmark-btn.active white text on its gold fill meets 4.5:1`, !!b && b.ok, JSON.stringify(b));
    });
  }
  await flow("p37-path-branch", lang, look, width, H, "/app/journey-map.html", P37_SEED, async (t, page) => {
    await page.waitForSelector(".folder-row[data-folder-id=fA]", { timeout: 15000 });
    const fx = await fixtureRows(page, '<div class="path-branch system"><div class="path-branch-head"><span id="pb0" class="path-branch-name">System branch</span></div></div>', ".folder-row");
    const r = fx.text("pb0");
    check(`${t}: .path-branch.system .path-branch-name meets 4.5:1`, !!r && r.ok, JSON.stringify(r));
  });
}

// Opened windows and dialogs.
for (const lang of LANGS) for (const look of LOOKS) {
  for (const width of [390, 1280].filter((w) => !WONLY || w === WONLY)) {
    const H = width < 600 ? 844 : 800;
    await flow("p37-notewin", lang, look, width, H, P37_NOTES, P37_SEED, async (t, page) => {
      await page.waitForSelector(".note-card[data-note-id]", { timeout: 15000 });
      const card = (l) => `.note-card[data-note-id="${l.slice(1).repeat(32)}"] [data-note-window]`;
      await ev(page, (s) => document.querySelector(s).click(), card("n1")); await settle(page, 700);
      check(`${t}: POSITIVE CONTROL a Note window is open`, await opened(page, ".note-win"));
      await judgePage(`${t} Note window title bar`, page, { nav: false });
      await ev(page, () => document.querySelector(".note-win [data-pane-menu-btn]")?.click()); await settle(page, 400);
      check(`${t}: POSITIVE CONTROL the window ⋯ menu is open`, await opened(page, ".note-win [data-pane-menu].open"));
      await judgePage(`${t} Note window ⋯ menu`, page, { nav: false });
      await page.keyboard.press("Escape"); await settle(page, 300);
      for (const l of ["n3", "n4"]) { await ev(page, (s) => document.querySelector(s)?.click(), card(l)); await settle(page, 500); }
      check(`${t}: POSITIVE CONTROL three windows and a switcher`, (await ev(page, () => document.querySelectorAll("[data-win-switch]").length)) === 3);
      await judgePage(`${t} window switcher`, page, { nav: false });
    });
    await flow("p37-bmpop", lang, look, width, H, P37_NOTES, P37_SEED, async (t, page) => {
      await page.waitForSelector(".nav-cat-bookmark > summary", { timeout: 15000 });
      await ev(page, async () => { const m = await import("./js/bookmark-popover.js"); m.openBookmarkNamePopover({ defaultName: "Al-Baqarah 255", folders: [{ id: "f1", name: "Folder one", parentId: null }, { id: "f2", name: "Child", parentId: "f1" }], people: [], roster: [{ id: "p1", name: "Me" }, { id: "p2", name: "Other" }], selectedPersonId: "p1", units: [{ id: "ayah", label: "This āyah", defaultName: "a" }, { id: "range", label: "A range", defaultName: "b", ayahCount: 286, from: 1, to: 3 }] }); await new Promise((r) => setTimeout(r, 300)); });
      check(`${t}: POSITIVE CONTROL the bookmark dialog is open`, await opened(page, ".bm-popover [data-bm-pop-save]"));
      await judgePage(`${t} Bookmark dialog`, page, { nav: false });
      await ev(page, () => { const n = document.querySelector("[data-bm-pop-newfolder-row]"); if (n) n.style.display = ""; const s = document.querySelector("[data-bm-pop-folder]"); if (s) { s.value = s.options[s.options.length - 1].value; s.dispatchEvent(new Event("change", { bubbles: true })); } });
      await settle(page, 250);
      await judgePage(`${t} Bookmark dialog, new-folder field`, page, { nav: false, noImage: true });
      await page.keyboard.press("Escape"); await settle(page, 300);
      await ev(page, async () => { const m = await import("./js/bookmark-popover.js"); m.openBookmarkExistsChoice(); await new Promise((r) => setTimeout(r, 300)); });
      check(`${t}: POSITIVE CONTROL the Already-bookmarked dialog is open`, await opened(page, "[data-bm-exists-choice]"));
      await judgePage(`${t} Already-bookmarked dialog`, page, { nav: false });
    });
    await flow("p37-journey", lang, look, width, H, "/app/journey-map.html", P37_SEED, async (t, page) => {
      await page.waitForSelector(".folder-row[data-folder-id=fA]", { timeout: 15000 });
      await ev(page, () => document.querySelector('.folder-row[data-folder-id="fA"] .folder-menu-btn').click()); await settle(page, 300);
      await ev(page, () => document.querySelector('.folder-row[data-folder-id="fA"] [data-folder-move]').click()); await settle(page, 500);
      check(`${t}: POSITIVE CONTROL the folder picker is open`, await opened(page, "#folderPicker .folder-picker"));
      await judgePage(`${t} folder picker`, page, { nav: false });
      await page.keyboard.press("Escape"); await settle(page, 300);
      await ev(page, () => document.querySelector('.folder-row[data-folder-id="fA"]')?.click()); await settle(page, 600);
      const has = await ev(page, () => !!document.querySelector("[data-note-window]"));
      check(`${t}: POSITIVE CONTROL a note can be opened in a window from the journey map`, has);
      if (has) {
        await ev(page, () => document.querySelector("[data-note-window]").click()); await settle(page, 800);
        check(`${t}: POSITIVE CONTROL the Note window is open on the journey map`, await opened(page, ".note-win"));
        await judgePage(`${t} Note window (journey map)`, page, { nav: false });
        await ev(page, () => document.querySelector(".note-win [data-pane-menu-btn]")?.click()); await settle(page, 400);
        await judgePage(`${t} Note window ⋯ menu (journey map)`, page, { nav: false });
      }
    });
  }
  for (const width of [320, 1280].filter((w) => !WONLY || w === WONLY)) {
    await flow("p37-zabpanels", lang, look, width, width < 600 ? 844 : 800, "/app/journey-map.html", P37_SEED, async (t, page) => {
      const opener = width >= 768 ? "#zabBar [data-zab-open]" : "#zabCorner";
      await page.waitForSelector(opener, { timeout: 10000 });
      await page.click(opener); await page.waitForSelector("#zabPanel:not([hidden]) [data-zab-pocket]", { timeout: 10000 });
      await settle(page, 400);
      await judgePage(`${t} Zab pocket list`, page, { nav: false });
      await page.click('#zabPanel [data-zab-pocket="pk-tasks"]'); await page.waitForSelector("#zabPanel [data-zab-new-item]", { timeout: 8000 });
      await page.fill("#zabPanel [data-zab-new-item]", "Audit task"); await page.press("#zabPanel [data-zab-new-item]", "Enter");
      await page.waitForSelector('#zabPanel .zab-text:text-is("Audit task")', { timeout: 8000 });
      await judgePage(`${t} Zab a pocket with a task`, page, { nav: false });
      await page.click("#zabPanel [data-zab-steps]"); await settle(page, 300);
      await judgePage(`${t} Zab task steps`, page, { nav: false });
      await ev(page, () => document.querySelector("#zabPanel [data-zab-iedit]")?.click()); await settle(page, 300);
      check(`${t}: POSITIVE CONTROL the Zab task editor is open`, await opened(page, "#zabPanel [data-zab-item-text]"));
      await judgePage(`${t} Zab task editor`, page, { nav: false });
      await ev(page, () => document.querySelector("#zabPanel [data-zab-cancel-edit]")?.click()); await settle(page, 200);
      await ev(page, () => document.querySelector('#zabPanel [data-zab-nav="list"]')?.click()); await settle(page, 300);
      await ev(page, () => document.querySelector("#zabPanel [data-zab-pedit]")?.click()); await settle(page, 300);
      check(`${t}: POSITIVE CONTROL the Zab pocket editor is open`, await opened(page, "#zabPanel [data-zab-f='name']"));
      await judgePage(`${t} Zab pocket editor`, page, { nav: false });
    });
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
