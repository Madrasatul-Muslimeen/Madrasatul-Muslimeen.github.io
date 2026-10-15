// Audit part 4 (PCF J29 follow-on, #847): measured on the rendered page, en/bn x 390 / 820 / 1440.
//  - nav-touch: every link/button/picker in the opened Home / Modules / Operation menus and the Bookmark sheet is >= 40px,
//    and each opened ordinary dropdown stays inside the screen (it scrolls inside itself).
//  - zab-spacer: scrolled to the bottom, the Zab bar / floating 🧰 do not cover the last page control
//    (elementFromPoint at its centre finds the control or a child).
// Mutations: --mutate=<name> restores one defect and must make this suite FAIL.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUTATIONS = {
  "navlinks": ["app/css/shell.css", "**/css/shell.css*", "align-items: center; } /* audit4 navlinks */", "align-items: center; min-height: 0; } /* audit4 navlinks */"],
  "navscroll": ["app/css/shell.css", "**/css/shell.css*", "overscroll-behavior: contain; } /* audit4 navscroll */", "overscroll-behavior: contain; max-height: none; overflow: visible; } /* audit4 navscroll */"],
  "zab-spacer": ["app/js/zab-bar.js", "**/js/zab-bar.js*", "#zabSpacer { display: block; height: 68px; }", "#zabSpacer { display: none; height: 0; }"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

async function open(url, lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 800 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
    if (!body.includes(from)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    const ct = file.endsWith(".css") ? "text/css" : "text/javascript";
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: ct, body: body.split(from).join(to) }));
  }
  const { page } = await openPage(ctx, url);
  await page.waitForTimeout(1200);
  return { ctx, page };
}

async function navFlow(tag, page) {
  const cats = await page.evaluate(() => document.querySelectorAll(".nav-cat").length);
  check(`${tag}: POSITIVE CONTROL nav categories exist (${cats})`, cats >= 1);
  for (let i = 0; i < cats; i++) {
    const r = await page.evaluate((i) => {
      const cats = [...document.querySelectorAll(".nav-cat")];
      cats.forEach((c) => { c.open = false; });
      const c = cats[i]; c.open = true;
      const box = c.querySelector(".nav-cat-links");
      const name = (c.querySelector("summary").textContent || "").trim();
      const br = box.getBoundingClientRect();
      const bm = c.classList.contains("nav-cat-bookmark");
      const els = [...box.querySelectorAll("a,button,select,summary")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; });
      const bad = els.filter((e) => { const b = e.getBoundingClientRect(); return b.height < 39.5; })
        .map((e) => `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
      return { name, bm, shown: br.width > 0 && br.height > 0, n: els.length, bad: [...new Set(bad)], bottom: br.bottom, vh: innerHeight, left: br.left, right: br.right, vw: innerWidth };
    }, i);
    const t = `${tag} menu "${r.name}"`;
    check(`${t}: POSITIVE CONTROL open with controls (${r.n})`, r.shown && r.n > 0);
    check(`${t}: each control >= 40px tall`, r.bad.length === 0, r.bad.join(", "));
    check(`${t}: inside the screen sideways`, r.left >= -1 && r.right <= r.vw + 1, `${r.left}..${r.right} of ${r.vw}`);
    if (!r.bm) check(`${t}: bottom inside the screen (${Math.round(r.bottom)} of ${r.vh})`, r.bottom <= r.vh + 1);
  }
  await page.evaluate(() => document.querySelectorAll(".nav-cat").forEach((c) => { c.open = false; }));
}

async function zabFlow(tag, page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const corner = document.getElementById("zabCorner"), bar = document.getElementById("zabBar");
    const active = [corner, bar].some((e) => e && getComputedStyle(e).display !== "none");
    const root = document.getElementById("zabSpacer") && document.getElementById("zabSpacer").parentElement;
    const els = [...document.querySelectorAll("button,a[href],select,input:not([type=hidden]),summary")]
      .filter((e) => !(root && root.contains(e)) && !e.closest("#zabBar,#zabCorner,.nav-cat,nav,header"))
      .filter((e) => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && b.bottom > 0 && b.top < innerHeight; });
    els.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
    const last = els.slice(0, 3);
    const covered = last.filter((e) => {
      const b = e.getBoundingClientRect();
      const x = Math.min(Math.max(b.left + b.width / 2, 1), innerWidth - 1), y = Math.min(b.top + b.height / 2, innerHeight - 1);
      const hit = document.elementFromPoint(x, y);
      const hitOk = hit && (hit === e || e.contains(hit) || hit.contains(e));
      const overlaps = [corner, bar].some((z) => {
        if (!z || getComputedStyle(z).display === "none") return false;
        const q = z.getBoundingClientRect();
        return b.left < q.right && b.right > q.left && b.top < q.bottom && b.bottom > q.top;
      });
      return !hitOk || overlaps;
    }).map((e) => `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}`);
    const sp = document.getElementById("zabSpacer");
    const spH = sp ? sp.getBoundingClientRect().height : 0;
    const need = corner && getComputedStyle(corner).display !== "none" ? 60 : 0;
    return { active, n: els.length, covered, spH, need };
  });
  check(`${tag}: POSITIVE CONTROL Zab present and ${r.n} controls on screen`, r.active);
  check(`${tag}: bottom space (${r.spH}px) clears the floating button`, r.spH >= r.need);
  check(`${tag}: last page controls not covered by Zab`, r.covered.length === 0, r.covered.join(", "));
}

const PAGES = ["quranrevival", "journey-map", "hadith-collections", "hadith-study", "asma-study", "records", "monitor", "people", "classes", "homework", "curriculum", "catalogue"];
for (const lang of ["en", "bn"]) for (const width of [390, 820, 1440]) for (const p of PAGES) {
  const tag = `${lang} ${width}px ${p}`;
  let ctx;
  try {
    const o = await Promise.race([open(`/app/${p}.html`, lang, width), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([
      (async () => { await navFlow(tag, o.page); await zabFlow(tag, o.page); })(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 60000)),
    ]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await ctx.close().catch(() => {});
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
