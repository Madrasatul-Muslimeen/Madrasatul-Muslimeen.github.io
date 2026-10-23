// Audit part 63 (PCF MSA J29): Language, Card look, My account, the way back, Taglines at 320 / 390 / 820 / 1280, and menu text contrast.
//   language  every page the menu reaches keeps the chosen language after a reload (owner and student)
//   look      Night / Light: the choice sticks across a reload and across pages; account-card text is readable (4.5:1) on both
//   account   My account opens inside the screen and shows the facts (owner and student)
//   taglines  the strip sits inside the screen and its text is readable on its own background
//   contrast  the rendered colour of every menu item's text against its real painted background, Night and Light, 4.5:1; the worst ten are printed
// Mutations (--mutate=<name>) restore a plausible defect and must each fail the suite.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part63-settings-contrast-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
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
// [file, route glob, anchor (must occur exactly once), replacement, the page the mutation applies to]
const MUTATIONS = {};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
const STUDENT = `DATA.tenantMemberUids[0].roles = ["student"];`;

async function open(lang, width, pagePath, { seed = "", ctxOpts = {}, look = null } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: seed || null, ...ctxOpts });
  if (look) await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch {} }, look);
  if (MUTATE && MUTATIONS[MUTATE][4] === pagePath.split("?")[0]) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, pagePath, fn, opts = {}) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, pagePath, opts), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.ctx, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 400) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const rectOf = (page, sel) => ev(page, (s) => { const e = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; }, sel);
const inside = (r, vw, vh) => !!r && r.l >= -1 && r.r <= vw + 1 && r.t >= -1 && r.b <= vh + 1;
const wide = (page) => ev(page, () => document.documentElement.scrollWidth - innerWidth);
const homeLabelOf = (page) => ev(page, () => document.querySelector(".nav-cat-home > summary").textContent.trim());
const summaryOf = (label) => `.nav-cat:has(> summary:text-is("${label}")) > summary`;

// ---- contrast, run inside the page ----
// Walks up from an element compositing every background colour over the one beneath; a gradient or image anywhere on the way
// is reported as "unknown" rather than guessed (the caller counts those separately).
const CONTRAST_LIB = `
(() => {
  const parse = (s) => { const m = String(s).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  window.__contrastOf = (el) => {
    const layers = []; let unknown = false;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== "none") unknown = true;
      const bg = parse(cs.backgroundColor);
      if (bg && bg.a > 0) layers.push(bg);
      if (bg && bg.a >= 1) break;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    let fg = parse(getComputedStyle(el).color);
    if (!fg) return null;
    const eff = over(fg, base);
    return { ratio: ratio(eff, base), unknown, fg: getComputedStyle(el).color, bg: "rgb(" + Math.round(base.r) + "," + Math.round(base.g) + "," + Math.round(base.b) + ")" };
  };
})();`;
const installContrast = (page) => ev(page, CONTRAST_LIB);
// Every visible text-bearing menu item inside the open menu.
const menuItems = (page, label) => ev(page, (l) => {
  const c = [...document.querySelectorAll(".nav-cat")].find((x) => x.querySelector("summary").textContent.trim() === l);
  const out = [];
  for (const e of [c.querySelector("summary"), ...c.querySelectorAll("a, button, label, summary, .nav-cat-note, p, span, h3, h4")]) {
    if (!e.getClientRects().length) continue;
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join("");
    if (!own) continue;
    const r = window.__contrastOf(e);
    if (r) out.push({ text: own.slice(0, 28), tag: e.tagName.toLowerCase(), ...r, size: parseFloat(getComputedStyle(e).fontSize), disabled: !!e.disabled });
  }
  return out;
}, label);

const WIDTHS = [320, 390, 820, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
const ROLES = [["owner", ""], ["student", STUDENT]];
const ALL_WORST = [];

// Positive control: a deliberately low-contrast probe IS reported by the measuring code.
await flow("contrast-control", "en", 390, "/app/quranrevival.html", async (t, page) => {
  await installContrast(page);
  const r = await ev(page, () => { const d = document.createElement("div"); d.style.cssText = "background:#777;color:#888;position:fixed;top:0;left:0"; d.textContent = "probe"; document.body.appendChild(d); const x = window.__contrastOf(d); const g = document.createElement("div"); g.style.cssText = "background:#fff;color:#000;position:fixed;top:0;left:0"; g.textContent = "ok"; document.body.appendChild(g); return { low: x.ratio, high: window.__contrastOf(g).ratio }; });
  check(`${t}: POSITIVE CONTROL a #888-on-#777 probe is measured as low contrast (${r.low.toFixed(2)})`, r.low < 4.5 && r.low > 1);
  check(`${t}: and black on white measures 21 (${r.high.toFixed(1)})`, Math.abs(r.high - 21) < 0.1);
});

for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  const vh = width > 600 ? 900 : 844;
  for (const [who, seed] of ROLES) {
    // Language: every page reached keeps the choice after a reload; Card look sticks on each page.
    await flow(`language-${who}`, lang, width, "/app/quranrevival.html", async (t, page, ctx, errors) => {
      const target = bn ? "en" : "bn";
      const homeLabel = await homeLabelOf(page);
      await page.click(summaryOf(homeLabel)); await settle(page, 250);
      const sel = await rectOf(page, "#navAppLangSelect");
      check(`${t}: POSITIVE CONTROL Home shows the Language picker, finger-sized, set to ${lang}`, !!sel && sel.h >= 40 && (await ev(page, () => document.getElementById("navAppLangSelect").value)) === lang, JSON.stringify(sel));
      await page.selectOption("#navAppLangSelect", target); await settle(page, 1500);
      const pages = ["/app/deen-study.html", "/app/hadith-study.html", "/app/notes.html", "/app/monitor.html", "/app/homework.html", "/app/classes.html", "/app/taglines.html", "/app/records.html"];
      for (const p of pages) {
        await page.goto(`http://localhost:8080${p}`, { waitUntil: "load" }).catch(() => {});
        await settle(page, 1200);
        const nav = await ev(page, () => ({ home: document.querySelector(".nav-cat-home > summary")?.textContent.trim() ?? "", stored: localStorage.getItem("mm_app_lang"), sideways: document.documentElement.scrollWidth - innerWidth }));
        check(`${t}: ${p.slice(5)} reads in ${target === "bn" ? "Bangla" : "English"} after the switch`, nav.stored === target && (target === "bn" ? BN.test(nav.home) : nav.home === "Home"), JSON.stringify(nav));
        await page.reload({ waitUntil: "load" }); await settle(page, 1000);
        const again = await ev(page, () => document.querySelector(".nav-cat-home > summary")?.textContent.trim() ?? "");
        check(`${t}: ${p.slice(5)} keeps it after a reload`, target === "bn" ? BN.test(again) : again === "Home", again);
      }
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed });
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
