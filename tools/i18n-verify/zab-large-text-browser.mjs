// Audit part 140 (PCF MSA J29, issue #1354): the fixed 🧰 Zab bar (>= 768px) or corner button (phone) at 100%, 150% and 200% text.
// The 23 pages of large-text-shared-pages-browser.mjs plus hadith-study, dua-study, notes and journey-map; widths 360, 390, 768, 1024, 1440;
// en and bn; the part-126 real-length seed (read out of large-text-shared-pages-browser.mjs so the two never drift).
// Per page / width / language / size:
//   (a) the bar's / corner's rect and whether it grew with the root (rem ratio)                     INFO
//   (b) every visible control or text block the bar / corner overlaps at scroll 0 (px)              INFO (cosmetic)
//   (c) at the END of the page: is any control still under the bar / corner (is #zabSpacer tall enough)   FAIL
//   (d) reach: a control that elementFromPoint never returns at any scroll stop                    FAIL
// Run from the repository root with node serve.js on 8080:
//   node tools/i18n-verify/zab-large-text-browser.mjs [--pages=a.html,b.html] [--widths=360,768] [--langs=en] [--sizes=100,200] [--list] [--shots]
//   --mutate=nospace   spacer height 0 and no scroll-padding: (c) must FAIL
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const MUTATE = arg("mutate"), LIST = process.argv.includes("--list"), SHOTS = process.argv.includes("--shots");
if (MUTATE && MUTATE !== "nospace") throw new Error(`unknown --mutate=${MUTATE}`);
const OUT = "tools/i18n-verify/out/zab-large-text";
fs.mkdirSync(OUT, { recursive: true });

const ALL_PAGES = [
  "classes.html", "course-offers.html", "curriculum.html", "backup.html", "import-notes.html", "dawah.html", "onboarding.html",
  "accept-invite.html?token=not-a-real-link", "monitor.html", "homework.html", "people.html", "records.html", "catalogue.html",
  "about.html", "bookmarks.html", "hadith-collections.html", "index.html", "notes.html", "journey-map.html", "deen-study.html",
  "arabic-study.html", "admin-self-check.html", "taglines.html", "hadith-study.html", "dua-study.html",
];
const PAGES = arg("pages") ? arg("pages").split(",") : ALL_PAGES;
const ALL_W = [[360, 740], [390, 844], [768, 1024], [1024, 768], [1440, 900]];
const WIDTHS = arg("widths") ? ALL_W.filter(([w]) => arg("widths").split(",").map(Number).includes(w)) : ALL_W;
const LANGS = arg("langs") ? arg("langs").split(",") : ["en", "bn"];
const SIZES = (arg("sizes") || "100,150,200").split(",").map(Number);

// the part-126 seed, taken from the sibling suite's source
const src = fs.readFileSync("tools/i18n-verify/large-text-shared-pages-browser.mjs", "utf8");
const m = src.match(/const SEED = `([\s\S]*?)`;\n/);
if (!m || m[1].length < 1000) throw new Error("could not read the seed out of large-text-shared-pages-browser.mjs");
const SEED = m[1];

// Runs in the page. The box is the bar (>= 768) or the corner (phone).
const MEASURE = ({ mutate }) => {
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const shown = (e) => e && e.getClientRects().length > 0 && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== "hidden";
  const bar = document.querySelector("#zabBar"), corner = document.querySelector("#zabCorner"), spacer = document.querySelector("#zabSpacer");
  const kind = shown(bar) ? "bar" : shown(corner) ? "corner" : "none";
  const res = { kind, root, a: null, b: [], c: [], d: [], n: 0, docH: document.documentElement.scrollHeight };
  if (mutate) {
    const s = document.createElement("style");
    s.textContent = "#zabSpacer{display:none!important} html,html:has(.nw-switch){scroll-padding-bottom:0!important}";
    document.head.appendChild(s);
  }
  if (kind === "none") return res;
  const box = kind === "bar" ? bar : corner;
  const rect = () => box.getBoundingClientRect();
  const r0 = rect();
  res.a = { w: Math.round(r0.width), h: Math.round(r0.height), hRem: +(r0.height / root).toFixed(2), wRem: +(r0.width / root).toFixed(2), spacerPx: spacer ? Math.round(spacer.getBoundingClientRect().height) : 0, spacerRem: spacer ? +(spacer.getBoundingClientRect().height / root).toFixed(2) : 0 };
  const vis = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e.hidden || e.inert) return false;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
      const d = e.parentElement?.closest("details");
      if (d && !d.open && e.parentElement === d && e.tagName !== "SUMMARY") return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/)[0] : "")) + ` "${(el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 28)}"`;
  const nested = (el) => {
    if (el.closest("details:not([open])") && !el.closest("summary")) return true;
    for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (/(auto|scroll)/.test(cs.overflowY) && a.scrollHeight > a.clientHeight + 1) return true;
      if (cs.position === "fixed" || cs.position === "sticky") return true;
    }
    return false;
  };
  const SEL = "button, a[href], select, input:not([type=hidden]), textarea, summary";
  const ours = (e) => e.closest("#zabRoot") || e.closest("[data-bm-back]") || e.classList.contains("zab-dock-btn");
  const controls = [...document.querySelectorAll(SEL)].filter((e) => !ours(e) && vis(e) && getComputedStyle(e).position !== "fixed" && !nested(e));
  res.n = controls.length;
  const hit = (b, z) => b.width > 0 && b.left < z.right && b.right > z.left && b.top < z.bottom - 1 && b.bottom > z.top + 1 && b.top < innerHeight && b.bottom > 0;
  const ov = (b, z) => `${Math.round(Math.min(b.right, z.right) - Math.max(b.left, z.left))}x${Math.round(Math.min(b.bottom, z.bottom) - Math.max(b.top, z.top))}`;

  // (b) at scroll 0
  scrollTo(0, 0);
  const z0 = rect();
  const texts = [...document.body.querySelectorAll("*")].filter((e) => !ours(e) && !/^(SCRIPT|STYLE|SVG|PATH|OPTION|TEMPLATE|NOSCRIPT)$/i.test(e.tagName) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && vis(e) && getComputedStyle(e).position !== "fixed");
  const seen = new Set();
  for (const e of [...controls, ...texts]) {
    const b = e.getBoundingClientRect();
    if (hit(b, z0) && !seen.has(e)) { seen.add(e); res.b.push(`${name(e)} ${ov(b, z0)}px`); }
  }

  // (c) at the end of the page: scroll to the very bottom and look at every control the page still shows under the box
  const maxY = Math.max(0, document.documentElement.scrollHeight - innerHeight);
  scrollTo(0, maxY);
  const zEnd = rect();
  for (const e of controls) {
    const b = e.getBoundingClientRect();
    if (hit(b, zEnd)) res.c.push(`${name(e)} (${Math.round(b.top)}-${Math.round(b.bottom)}) under the ${kind} (${Math.round(zEnd.top)}-${Math.round(zEnd.bottom)}) ${ov(b, zEnd)}px`);
  }
  res.spacerOk = !!spacer && spacer.getBoundingClientRect().height + 0.5 >= zEnd.height;
  res.spacerGap = spacer ? Math.round(zEnd.height - spacer.getBoundingClientRect().height) : Math.round(zEnd.height);

  // (d) reach: every control must be returned by elementFromPoint at some scroll stop (the pill is not shown here)
  return res;
};

const REACH = async () => {
  const vis = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e.hidden || e.inert) return false;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
      const d = e.parentElement?.closest("details");
      if (d && !d.open && e.parentElement === d && e.tagName !== "SUMMARY") return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/)[0] : "")) + ` "${(el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 28)}"`;
  const nested = (el) => {
    for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (/(auto|scroll)/.test(cs.overflowY) && a.scrollHeight > a.clientHeight + 1) return true;
      if (cs.position === "fixed" || cs.position === "sticky") return true;
    }
    return false;
  };
  const controls = [...document.querySelectorAll("button, a[href], select, input:not([type=hidden]), textarea, summary")].filter((el) => !el.closest("#zabRoot") && !el.classList.contains("zab-dock-btn") && vis(el) && getComputedStyle(el).position !== "fixed" && !nested(el));
  const maxY = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const stops = [];
  for (let y = 0; y < maxY(); y += Math.max(100, Math.floor(innerHeight / 2))) stops.push(y);
  stops.push(maxY());
  const state = new Map(controls.map((el) => [el, false]));
  for (const y of stops) {
    scrollTo(0, y);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (const el of controls) {
      if (state.get(el)) continue;
      let r = el.getBoundingClientRect();
      if (r.left + r.width / 2 > innerWidth || r.left + r.width / 2 < 0) {
        for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
          const ox = getComputedStyle(a).overflowX;
          if ((ox === "auto" || ox === "scroll") && a.scrollWidth > a.clientWidth) { a.scrollLeft += r.left + r.width / 2 - innerWidth / 2; break; }
        }
      }
      // an inline link that wraps has several line boxes: its bounding-box centre can sit on another line, so try the centre of each line box
      for (const q of el.getClientRects()) {
        const cx = q.left + q.width / 2, cy = q.top + q.height / 2;
        if (q.width <= 0 || cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;
        const h = document.elementFromPoint(cx, cy);
        if (h && (h === el || el.contains(h))) { state.set(el, true); break; }
      }
    }
  }
  scrollTo(0, 0);
  return [...state].filter(([, ok]) => !ok).map(([el]) => name(el));
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const rows = [];
const setRoot = (P, pct) => P.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; }, pct);

// ---- positive control: a button injected at the page foot is found under the bar once the spacer is gone, and is clear with it ----
{
  const ctx = await newContext(browser, { banner: false, viewport: { width: 768, height: 1024 }, extraSeedJs: SEED });
  const { page: P } = await openPage(ctx, "/app/about.html");
  await P.waitForTimeout(1000);
  const put = () => P.evaluate(() => {
    const b = document.createElement("button");
    // pinned to the document's last 44px, as if the page's own content ran to its very end with no room kept (the page's padding is not relied on)
    b.id = "__foot"; b.textContent = "injected foot button"; b.style.cssText = "position:absolute;left:0;width:200px;height:44px;margin:0;top:" + (document.documentElement.scrollHeight - 44) + "px";
    document.body.appendChild(b);
  });
  await setRoot(P, 200);
  await P.waitForTimeout(250);
  await put();
  const before = await P.evaluate(MEASURE, { mutate: false });
  check("positive control: the Zab bar is on screen at 768", before.kind === "bar", JSON.stringify(before.a));
  check("positive control: a button at the document's last pixels is found under the bar (c) at 200%", before.c.some((s) => s.includes("injected foot")), before.c.join(" | ") || "nothing found");
  await P.evaluate(() => document.getElementById("__foot").remove());
  const clean = await P.evaluate(MEASURE, { mutate: false });
  check("positive control: the same page without the injected button has nothing under the bar at its end", !clean.c.some((s) => s.includes("injected foot")), clean.c.join(" | "));
  await ctx.close();
}

// ---- the sweep ----
let barSeen = 0, cornerSeen = 0;
for (const pg of PAGES) {
  console.log(`\n== ${pg} ==`);
  const pgKey = pg.replace(/\.html.*$/, "");
  for (const [w, h] of WIDTHS) for (const lang of LANGS) {
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: SEED });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const url = pg === "notes.html" ? "/app/notes.html?unit=ayah:2:255&label=Ayat%20al-Kursi%20with%20tajweed%20practice%20(morning)" : "/app/" + pg;
    const { page: P } = await openPage(ctx, url);
    await P.waitForTimeout(1000);
    if (pg === "journey-map.html") for (let i = 0; i < 6; i++) { await P.evaluate(() => document.querySelectorAll("[data-folder-toggle][aria-expanded=false]").forEach((b) => b.click())); await P.waitForTimeout(200); }
    const len = await P.evaluate(() => document.body.innerText.length);
    check(`${pg} / ${w} / ${lang}: page rendered text (positive control)`, len > 20, `innerText length ${len}`);
    for (const pct of SIZES) {
      await setRoot(P, pct);
      await P.waitForTimeout(250);
      const r = await P.evaluate(MEASURE, { mutate: !!MUTATE && pct === SIZES[0] ? true : false });
      const tag = `${pg} / ${w} / ${lang} / ${pct}%`;
      if (SHOTS && pct === 200 && ((pgKey === "dua-study" && w === 768 && lang === "en") || (pgKey === "notes" && w === 390 && lang === "bn") || (pgKey === "people" && w === 1440 && lang === "en") || (pgKey === "hadith-study" && w === 1024 && lang === "bn"))) {
        await P.evaluate(() => scrollTo(0, 0));
        await P.screenshot({ path: `${OUT}/${pgKey}-${w}-${lang}-200-top.png` });
        await P.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await P.waitForTimeout(150);
        await P.screenshot({ path: `${OUT}/${pgKey}-${w}-${lang}-200-end.png` });
        await P.evaluate(() => scrollTo(0, 0));
      }
      if (r.kind === "bar") barSeen++; else if (r.kind === "corner") cornerSeen++;
      let unreachable = [];
      if (r.kind !== "none") unreachable = await P.evaluate(REACH);
      rows.push({ pg, w, lang, pct, kind: r.kind, a: r.a, b: r.b, c: r.c, spacerOk: r.spacerOk, spacerGap: r.spacerGap, d: unreachable, n: r.n });
      if (r.kind === "none") { if (LIST) console.log(`  info  ${tag}: no Zab bar or corner shown`); continue; }
      const grew = Math.abs(r.a.hRem - (r.kind === "bar" ? 2.75 : 3)) < 0.01;
      console.log(`  INFO [${tag}] ${r.kind} ${r.a.w}x${r.a.h}px (${r.a.hRem}rem, ${grew ? "grew with text" : "DID NOT grow"}), spacer ${r.a.spacerPx}px (${r.a.spacerRem}rem), (b) covers ${r.b.length} at scroll 0${r.b.length && LIST ? ": " + r.b.slice(0, 4).join("; ") : ""}`);
      check(`${tag}: nothing is under the ${r.kind} at the end of the page (c; ${r.n} controls, spacer gap ${r.spacerGap}px)`, r.c.length === 0, "\n      " + r.c.slice(0, 4).join("\n      "));
      check(`${tag}: every control is reachable by elementFromPoint at some scroll stop (d)`, unreachable.length === 0, "\n      " + unreachable.slice(0, 4).join("\n      "));
    }
    await ctx.close();
  }
}
fs.writeFileSync(`${OUT}/rows${arg("tag") ? "-" + arg("tag") : ""}.json`, JSON.stringify(rows, null, 1));
console.log(`\nINFO: bar seen ${barSeen} times, corner ${cornerSeen} times; (b) covered something in ${rows.filter((r) => r.b.length).length} of ${rows.length} combinations.`);
if (!arg("pages")) check("the bar or corner was found on most combinations (positive control for the sweep)", barSeen + cornerSeen >= rows.length * 0.8, `found ${barSeen + cornerSeen} of ${rows.length}`);
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
await browser.close();
process.exit(fail ? 1 : 0);
