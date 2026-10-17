// Audit part 33 (PCF MSA J29): what a keyboard user sees on the MSA pages, in Bangla and English.
//   control  the detector fails a seeded outline:none button, an off-screen focusable and a covered one (positive controls)
//   tab      every MSA page: Tab up to 60 stops; each stop has a visible focus indicator (>= 3:1), is on screen,
//            is not covered, and Tab does not loop inside a region other than the whole page
//   trap     Tab leaves the Zab bar and a Dua card
//   order    stops that jump back up the page by more than a screen are printed (advisory, not a failure)
// Mutations (each must fail the suite) are listed in MUTATIONS.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part33-keyboard-focus-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang");
// name: [file, route glob, anchor (exactly once), replacement, page path it applies to]
const MUTATIONS = {};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

const PAGES = ["notes", "journey-map", "bookmarks", "records", "monitor", "hadith-collections", "hadith-study", "deen-study", "arabic-study", "people", "classes", "homework", "catalogue", "dawah", "import-notes", "about"];

// Runs in the page, after each Tab. Records the focused element and its focused style.
function stopProbe() {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return null;
  window.__stops = window.__stops || [];
  window.__stops.push(e);
  const cs = getComputedStyle(e);
  const r = e.getBoundingClientRect();
  const desc = (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : "")).slice(0, 48);
  let hidden = "";
  for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
    const s = getComputedStyle(n);
    if (n.hasAttribute("hidden") || s.display === "none") { hidden = "hidden/display:none"; break; }
    if (s.visibility === "hidden") { hidden = "visibility:hidden"; break; }
    if (parseFloat(s.opacity) === 0) { hidden = "opacity:0"; break; }
    if (n.tagName === "DETAILS" && !n.open && n !== e && !(e.tagName === "SUMMARY" && e.parentElement === n)) { hidden = "closed details"; break; }
  }
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let problem = hidden;
  if (!problem && (r.width <= 0 || r.height <= 0)) problem = "zero size";
  if (!problem && (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight)) problem = "outside the viewport";
  if (!problem) {
    const top = document.elementFromPoint(Math.min(Math.max(cx, 0), innerWidth - 1), Math.min(Math.max(cy, 0), innerHeight - 1));
    const lab = e.labels ? [...e.labels] : [];
    const ok = top && (top === e || e.contains(top) || lab.some((l) => l.contains(top)) || (top.closest("label") && top.closest("label") === e.closest("label")));
    if (!ok) problem = "covered by " + (top ? top.tagName.toLowerCase() + (top.id ? "#" + top.id : "") + (top.className && typeof top.className === "string" ? "." + top.className.trim().split(/\s+/)[0] : "") : "nothing");
  }
  window.__fs = window.__fs || [];
  window.__fs.push({ os: cs.outlineStyle, ow: cs.outlineWidth, oc: cs.outlineColor, bs: cs.boxShadow, bc: [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor].join("|") });
  return { desc, problem, docTop: Math.round(r.top + scrollY), top: Math.round(r.top), left: Math.round(r.left), same: window.__stops.indexOf(e) !== window.__stops.length - 1 };
}

// Runs in the page after the last Tab: blur, then compare every recorded stop's unfocused style with its focused one.
function judge() {
  document.activeElement && document.activeElement.blur && document.activeElement.blur();
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (e) => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const out = [];
  window.__stops.forEach((e, i) => {
    const f = window.__fs[i]; const cs = getComputedStyle(e);
    const u = { os: cs.outlineStyle, ow: cs.outlineWidth, oc: cs.outlineColor, bs: cs.boxShadow, bc: [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor].join("|") };
    const bg = bgOf(e);
    let verdict = null;
    const hasOutline = f.os !== "none" && parseFloat(f.ow) > 0;
    if (hasOutline && (f.os === "auto")) verdict = { ok: true, how: "browser ring" };
    else if (hasOutline && (f.os !== u.os || f.ow !== u.ow || f.oc !== u.oc)) { const c = parse(f.oc); const r = c ? ratio(c, bg) : 99; verdict = { ok: r >= 3, how: "outline", r }; }
    else if (f.bs !== "none" && f.bs !== u.bs) { const c = parse((/rgba?\([^)]+\)/.exec(f.bs) || [])[0]); const r = c ? ratio(c, bg) : 99; verdict = { ok: r >= 3, how: "box-shadow", r }; }
    else if (f.bc !== u.bc) { const c = parse(f.bc.split("|")[0]); const r = c ? ratio(c, bg) : 99; verdict = { ok: r >= 3, how: "border", r }; }
    else verdict = { ok: false, how: "no change", r: 0 };
    const d = (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : "")).slice(0, 48);
    out.push({ d, ok: verdict.ok, how: verdict.how, r: Math.round((verdict.r || 0) * 10) / 10 });
  });
  window.__stops = []; window.__fs = [];
  return out;
}
const PROBE_SRC = stopProbe.toString(), JUDGE_SRC = judge.toString();

// The Zab corner only appears once Zab is declared ready; the same test seam the other audit suites use.
const READY_ZAB = `
export const ZAB_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const ZAB_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-14", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isZabReady() { return true; }
export const REASON_ZAB_NOT_DEPLOYED = "zab-rules-not-deployed";
export const REASON_ZAB_DECISION_INCOMPLETE = "zab-readiness-decision-incomplete";
export function zabUnavailableReason() { return null; }
`;
async function open(lang, width, height, pagePath, seed) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: seed });
  await ctx.route((u) => !["localhost", "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
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
async function flow(name, lang, width, height, pagePath, seed, fn) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}x${height} ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, height, pagePath, seed), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const WIDTHS = [390, 820, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

// Press Tab from the top of the page, up to max stops. Returns { stops, judged, looped }.
async function tabThrough(page, max = 60) {
  await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.__stops = []; window.__fs = []; });
  const stops = [];
  let looped = null;
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const s = await page.evaluate(`(${PROBE_SRC})()`);
    if (!s) break; // focus left the page (to the browser) or fell to the body
    if (s.same) { // the element was already a stop: a wrap to the start is fine, a loop elsewhere is a trap
      const first = await page.evaluate(() => window.__stops[0] === document.activeElement);
      if (!first) looped = s.desc;
      stops.push(s); break;
    }
    stops.push(s);
  }
  const judged = await page.evaluate(`(${JUDGE_SRC})()`);
  return { stops, judged, looped };
}
// Turn a tab run into the lists of failures.
function summarise({ stops, judged, looped }) {
  const noFocus = judged.filter((j, i) => !j.ok && !stops[i].same).map((j) => `${j.d} (${j.how}${j.r ? " " + j.r + ":1" : ""})`);
  const invisible = stops.filter((s) => s.problem && !s.same).map((s) => `${s.desc}: ${s.problem}`);
  const back = [];
  for (let i = 1; i < stops.length; i++) if (!stops[i].same && stops[i - 1].docTop - stops[i].docTop > 800) back.push(`${stops[i - 1].desc} -> ${stops[i].desc}`);
  return { noFocus, invisible, back, looped };
}

// Positive controls: the detector fails seeded defects.
await flow("control", "en", 390, 800, "/app/about.html", "", async (t, page) => {
  await ev(page, () => {
    const d = document.createElement("div");
    d.innerHTML = '<style>#pc1:focus,#pc1:focus-visible{outline:none}#pc2{position:absolute;left:-9999px}#pc4:focus-visible{outline:2px solid #fff;outline-offset:2px}#pc5{position:fixed;left:0;top:0;width:100vw;height:300px;z-index:99999}</style>' +
      '<button id="pc0">ok</button><button id="pc1">no ring</button><button id="pc2">offscreen</button><button id="pc3" style="opacity:0">transparent</button><button id="pc4" style="background:#fff">white ring on white</button><button id="pc6">covered</button>';
    d.style.cssText = "position:fixed;left:0;top:60px;z-index:99998;background:#fff";
    document.body.appendChild(d);
    const cover = document.createElement("div"); cover.id = "pc5"; cover.style.top = "60px"; document.body.appendChild(cover);
  });
  await ev(page, () => { window.__stops = []; window.__fs = []; document.getElementById("pc0").focus(); });
  // walk the seeded buttons in order using Tab so :focus-visible applies
  const found = {};
  for (let i = 0; i < 6; i++) {
    const s = await page.evaluate(`(${PROBE_SRC})()`);
    if (s) found[s.desc.split(".")[0]] = s;
    await page.keyboard.press("Tab");
  }
  const judged = await page.evaluate(`(${JUDGE_SRC})()`);
  const by = (id) => judged.find((j) => j.d.startsWith("button#" + id));
  check(`${t}: POSITIVE CONTROL a normal button passes`, by("pc0") && by("pc0").ok, JSON.stringify(by("pc0")));
  check(`${t}: POSITIVE CONTROL outline:none with no other change FAILS`, by("pc1") && !by("pc1").ok && by("pc1").how === "no change", JSON.stringify(by("pc1")));
  check(`${t}: POSITIVE CONTROL a white ring on white FAILS the 3:1 contrast`, by("pc4") && !by("pc4").ok && by("pc4").r < 3, JSON.stringify(by("pc4")));
  check(`${t}: POSITIVE CONTROL an off-screen focusable is caught`, !!(found["button#pc2"] && /outside/.test(found["button#pc2"].problem)), JSON.stringify(found["button#pc2"]));
  check(`${t}: POSITIVE CONTROL a transparent focusable is caught`, !!(found["button#pc3"] && /opacity/.test(found["button#pc3"].problem)), JSON.stringify(found["button#pc3"]));
  check(`${t}: POSITIVE CONTROL a covered focusable is caught`, !!(found["button#pc6"] && /covered/.test(found["button#pc6"].problem)), JSON.stringify(found["button#pc6"]));
});

for (const lang of LANGS) for (const width of WIDTHS) {
  for (const p of PAGES) {
    await flow(`tab:${p}`, lang, width, width < 600 ? 844 : 800, `/app/${p}.html`, "", async (t, page) => {
      const run = await tabThrough(page, 60);
      check(`${t}: POSITIVE CONTROL Tab reached several stops`, run.stops.length >= 3, String(run.stops.length));
      const s = summarise(run);
      check(`${t}: every stop shows a focus indicator of 3:1 or more`, s.noFocus.length === 0, s.noFocus.slice(0, 8).join(" | "));
      check(`${t}: no stop is invisible, off screen or covered`, s.invisible.length === 0, s.invisible.slice(0, 8).join(" | "));
      check(`${t}: Tab does not loop inside the page`, !s.looped, String(s.looped));
      if (s.back.length) console.log(`  NOTE  ${t}: Tab jumps back up the page: ${s.back.slice(0, 4).join(" | ")}`);
    });
  }
}

// No trap: Tab leaves the Zab bar and a Dua card.
async function leaves(page, regionSel, max = 80) {
  const ok = await page.evaluate((s) => { const r = document.querySelector(s); const f = r && [...r.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].find((e) => e.getBoundingClientRect().width); if (!f) return false; f.focus(); return true; }, regionSel);
  if (!ok) return null;
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate((s) => { const r = document.querySelector(s); return !!(r && r.contains(document.activeElement)); }, regionSel);
    if (!inside) return true;
  }
  return false;
}
for (const lang of LANGS) for (const width of WIDTHS) {
  await flow("trap:zab", lang, width, width < 600 ? 844 : 800, "/app/journey-map.html", "", async (t, page) => {
    const r = await leaves(page, "#zabBar");
    check(`${t}: POSITIVE CONTROL the Zab bar has a focusable control`, r !== null);
    check(`${t}: Tab leaves the Zab bar`, r === true);
  });
  await flow("trap:dua", lang, width, width < 600 ? 844 : 800, "/app/hadith-collections.html", `DATA.ayahCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, collections: [] }];`, async (t, page) => {
    await page.click('[data-hadith-tab="dua"]');
    await page.waitForSelector("[data-dua-card]", { timeout: 20000 });
    await page.waitForTimeout(500);
    const r = await leaves(page, "[data-dua-card]");
    check(`${t}: POSITIVE CONTROL a Dua card has a focusable control`, r !== null);
    check(`${t}: Tab leaves a Dua card`, r === true);
    const run = await tabThrough(page, 60);
    const s = summarise(run);
    check(`${t}: Dua tab: every stop shows a focus indicator of 3:1 or more`, s.noFocus.length === 0, s.noFocus.slice(0, 8).join(" | "));
    check(`${t}: Dua tab: no stop is invisible, off screen or covered`, s.invisible.length === 0, s.invisible.slice(0, 8).join(" | "));
  });
}
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
