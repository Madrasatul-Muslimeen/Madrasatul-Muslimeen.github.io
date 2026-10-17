// Audit part 31 (PCF MSA J29): the names a screen reader speaks (aria-label, title, alt, placeholder, aria-description)
// on the MSA pages in Bangla and English, and the Dua cards at tablet width.
//   control  the detector finds a seeded English aria-label / empty button / entity (positive control)
//   names    every MSA page: attributes in Bangla, every button / link / field has a name, no literal entity
//   dua      Hadith -> Dua tab at 768x1024, 820x1180, 1024x768: no sideways scroll, nothing cut, controls >= 40px
// Mutations (each must fail the suite) are listed in MUTATIONS.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part31-accessible-names-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
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
const MUTATIONS = {
  monweek: ["app/monitor.html", "**/monitor.html*", ' id="weekPrevBtn" type="button" aria-label="Previous week">', ' id="weekPrevBtn" type="button">', "/app/monitor.html"],
  monanchor: ["app/monitor.html", "**/monitor.html*", ' id="monthAnchor" aria-label="Month" />', ' id="monthAnchor" />', "/app/monitor.html"],
  impfile: ["app/import-notes.html", "**/import-notes.html*", ' accept=".xml" aria-label="File" />', ' accept=".xml" />', "/app/import-notes.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

const PAGES = ["notes", "journey-map", "bookmarks", "records", "monitor", "hadith-collections", "hadith-study", "deen-study", "arabic-study", "people", "classes", "homework", "catalogue", "dawah", "import-notes", "about"];

// Runs in the page. Returns { attrs, unnamed, entities } for everything currently in the DOM.
function scan(bn) {
  const out = { attrs: [], unnamed: [], entities: [] };
  const desc = (e) => (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : "")).slice(0, 48);
  const latin = (s) => /[A-Za-z]{3,}/.test(s.replace(/Mapping My Journey|https?:\/\/\S*|e\.g\.|MMSA/g, "")); // product names and URL hints stay Latin
  const ent = /&(?:[a-z]+|#\d+);/i;
  for (const e of document.querySelectorAll("*")) {
    if (e.closest("script, style, [data-i18n-skip], [contenteditable=true], .note-editor")) continue;
    for (const a of ["aria-label", "title", "alt", "placeholder", "aria-description"]) {
      const v = e.getAttribute(a); if (v == null) continue;
      if (ent.test(v)) out.entities.push(`${desc(e)}[${a}]=${v}`);
      if (bn && v.trim() && latin(v)) out.attrs.push(`${desc(e)}[${a}]=${v.slice(0, 40)}`);
    }
    if (!["TEXTAREA", "SCRIPT", "STYLE"].includes(e.tagName)) {
      for (const n of e.childNodes) if (n.nodeType === 3 && ent.test(n.nodeValue)) out.entities.push(`${desc(e)} text=${n.nodeValue.trim().slice(0, 40)}`);
    }
    if (e.matches("button, a[href], [role=button], select, input:not([type=hidden]), textarea, summary")) {
      if (e.closest("[hidden]") || getComputedStyle(e).display === "none") continue;
      let name = (e.getAttribute("aria-label") || "").trim() || (e.getAttribute("title") || "").trim();
      const lb = e.getAttribute("aria-labelledby");
      if (!name && lb) name = lb.split(/\s+/).map((i) => (document.getElementById(i) || {}).textContent || "").join("").trim();
      if (!name && e.labels && e.labels.length) name = [...e.labels].map((l) => l.textContent).join("").trim();
      if (!name && e.closest("label")) name = e.closest("label").textContent.trim();
      if (!name && e.tagName === "INPUT" && ["button", "submit", "reset"].includes(e.type)) name = (e.value || "").trim();
      if (!name && e.getAttribute("placeholder")) name = e.getAttribute("placeholder").trim();
      if (!name) { const tx = (e.textContent || "").replace(/\s+/g, " ").trim(); if (/[\p{L}\p{N}]/u.test(tx)) name = tx; } // a bare glyph (◀ ▶ ⋯ ✕) is not a name
      if (!name && e.querySelector("img[alt]:not([alt=''])")) name = "img";
      if (!name) out.unnamed.push(desc(e));
    }
  }
  out.attrs = [...new Set(out.attrs)]; out.unnamed = [...new Set(out.unnamed)]; out.entities = [...new Set(out.entities)];
  return out;
}
const SCAN_SRC = scan.toString();

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
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 90000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const runScan = (page, bn) => page.evaluate(`(${SCAN_SRC})(${bn})`);
const WIDTHS = [320, 390, 820, 1280, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

// Positive control: the detector finds seeded defects.
await flow("control", "bn", 390, 800, "/app/about.html", "", async (t, page) => {
  await ev(page, () => { const d = document.createElement("div"); d.innerHTML = '<button id="sb1" aria-label="Show details">x</button><button id="sb2"></button><a href="#" id="sb3" title="Open &amp;rarr; now">x</a><a href="#" id="sb4">a &amp;rarr; b</a>'; d.querySelector("#sb3").setAttribute("title", "Open &rarr; now"); d.querySelector("#sb4").appendChild(document.createTextNode(" &mdash;")); document.body.appendChild(d); });
  const r = await runScan(page, true);
  check(`${t}: POSITIVE CONTROL finds a seeded English aria-label`, r.attrs.some((a) => a.includes("sb1") && a.includes("Show details")), JSON.stringify(r.attrs.slice(0, 3)));
  check(`${t}: POSITIVE CONTROL finds a seeded empty button`, r.unnamed.some((a) => a.includes("sb2")), JSON.stringify(r.unnamed.slice(0, 3)));
  check(`${t}: POSITIVE CONTROL finds a seeded literal entity`, r.entities.some((a) => a.includes("&rarr;")) && r.entities.some((a) => a.includes("&mdash;")), JSON.stringify(r.entities.slice(0, 3)));
});

const DUA_WIDTHS = [[768, 1024], [820, 1180], [1024, 768]].filter(([w]) => !WONLY || w === WONLY);
const settle = (page, ms = 400) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const SEED_CHECK = `DATA.ayahCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, collections: [] }];`;

for (const lang of LANGS) {
  const bn = lang === "bn";
  // Menus once opened: the nav categories, the page ⋯ palette and the Zab corner, scanned after each is opened.
  for (const width of WIDTHS) {
    await flow(`menus`, lang, width, width < 600 ? 844 : 800, "/app/journey-map.html", "", async (t, page) => {
      const sels = ".nav-cat > summary, [data-bar-palette-toggle], #zabCorner button, #zabCorner [role=button]";
      const n = await ev(page, (s) => [...document.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().width).length, sels);
      check(`${t}: POSITIVE CONTROL there are menu buttons to open`, n >= 3, String(n));
      const bad = { attrs: [], unnamed: [], entities: [] };
      for (let i = 0; i < Math.min(n, 12); i++) {
        await page.evaluate(([s, i]) => [...document.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().width)[i]?.click(), [sels, i]);
        await settle(page, 250);
        const r = await runScan(page, bn);
        for (const k of Object.keys(bad)) bad[k].push(...r[k]);
        await page.keyboard.press("Escape"); await settle(page, 100);
      }
      for (const k of Object.keys(bad)) bad[k] = [...new Set(bad[k])];
      if (bn) check(`${t}: opened menus: no English aria-label / title / alt / placeholder`, bad.attrs.length === 0, bad.attrs.slice(0, 8).join(" | "));
      check(`${t}: opened menus: every button, link and field has a name`, bad.unnamed.length === 0, bad.unnamed.slice(0, 8).join(" | "));
      check(`${t}: opened menus: no literal entity`, bad.entities.length === 0, bad.entities.slice(0, 8).join(" | "));
    });
  }
  // Dua cards at tablet width.
  for (const [width, height] of DUA_WIDTHS) {
    await flow("dua", lang, width, height, "/app/hadith-collections.html", SEED_CHECK, async (t, page, errors) => {
      await page.click('[data-hadith-tab="dua"]');
      await page.waitForSelector("[data-dua-card]", { timeout: 20000 });
      await settle(page, 600);
      const nCards = await ev(page, () => document.querySelectorAll("[data-dua-card]").length);
      check(`${t}: POSITIVE CONTROL the Duas list shows cards`, nCards >= 10, String(nCards));
      const hasCheck = await ev(page, () => !!document.querySelector("[data-dua-card] [data-dua-check], [data-dua-card] [data-dua-check-open]"));
      const res = await ev(page, () => {
        const cards = [...document.querySelectorAll("[data-dua-card]")].slice(0, 6);
        const bad = { wide: [], small: [], cut: [], zab: [] };
        const zab = document.getElementById("zabCorner"); const zb = zab && getComputedStyle(zab).display !== "none" ? zab.getBoundingClientRect() : null;
        for (const c of cards) {
          const cb = c.getBoundingClientRect();
          if (cb.left < -1 || cb.right > innerWidth + 1) bad.wide.push("card " + c.dataset.duaCard);
          for (const e of c.querySelectorAll("*")) {
            const b = e.getBoundingClientRect(); const s = getComputedStyle(e);
            if (!b.width || !b.height || s.display === "none" || s.visibility === "hidden") continue;
            if (b.right > innerWidth + 1 || b.left < -1) bad.wide.push(`${c.dataset.duaCard}:${e.className || e.tagName}`.slice(0, 40));
            if (e.matches("button, select, input:not([type=checkbox]):not([type=hidden]), [role=button]") && b.height < 39.5) bad.small.push(`${c.dataset.duaCard}:${(e.textContent || e.className).trim().slice(0, 20)}:${Math.round(b.width)}x${Math.round(b.height)}`);
            const clips = s.overflow !== "visible" || s.overflowX !== "visible" || s.textOverflow === "ellipsis";
            if (clips && e.textContent.trim() && e.scrollWidth > e.clientWidth + 1 && !["INPUT", "TEXTAREA"].includes(e.tagName) && !e.closest("[data-dua-also-list], .dua-also-refs")) bad.cut.push(`${c.dataset.duaCard}:${String(e.className || e.tagName).slice(0, 24)}:${e.scrollWidth}>${e.clientWidth}`);
            if (zb && e.matches("button, a[href], select, input") && b.left < zb.right && b.right > zb.left && b.top < zb.bottom && b.bottom > zb.top) bad.zab.push(`${c.dataset.duaCard}:${(e.textContent || "").trim().slice(0, 16)}`);
          }
        }
        return { bad, over: document.documentElement.scrollWidth - innerWidth, zab: !!zb };
      });
      check(`${t}: no sideways scroll`, res.over <= 0, String(res.over));
      check(`${t}: nothing in the first six cards runs past the screen`, res.bad.wide.length === 0, res.bad.wide.slice(0, 6).join(" | "));
      check(`${t}: every control in the cards is 40px or more tall`, res.bad.small.length === 0, res.bad.small.slice(0, 6).join(" | "));
      check(`${t}: nothing in the cards is cut`, res.bad.cut.length === 0, res.bad.cut.slice(0, 6).join(" | "));
      check(`${t}: no card control sits under the Zab corner`, res.bad.zab.length === 0, res.bad.zab.slice(0, 6).join(" | "));
      const scan = await runScan(page, bn);
      if (bn) check(`${t}: cards: no English aria-label / title / alt / placeholder`, scan.attrs.length === 0, scan.attrs.slice(0, 8).join(" | "));
      check(`${t}: cards: every control has a name`, scan.unnamed.length === 0, scan.unnamed.slice(0, 8).join(" | "));
      check(`${t}: cards: no literal entity`, scan.entities.length === 0, scan.entities.slice(0, 8).join(" | "));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    });
  }
}

for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  for (const p of PAGES) {
    await flow(`names:${p}`, lang, width, width < 600 ? 844 : 800, `/app/${p}.html`, "", async (t, page) => {
      const res = await runScan(page, bn);
      check(`${t}: POSITIVE CONTROL page rendered controls`, await ev(page, () => document.querySelectorAll("button, a[href]").length > 2));
      if (bn) check(`${t}: no English aria-label / title / alt / placeholder`, res.attrs.length === 0, res.attrs.slice(0, 8).join(" | "));
      check(`${t}: every button, link and field has a name`, res.unnamed.length === 0, res.unnamed.slice(0, 8).join(" | "));
      check(`${t}: no literal entity in an attribute or text`, res.entities.length === 0, res.entities.slice(0, 8).join(" | "));
    });
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
