// The Owner, 13 Nov 2026 (the picture demo, "Menu: Read on: 2 lines as shown in the image"): on a PHONE in Read on the Read bar was THREE lines (151px) at every
// width below 600px; its four step buttons (⏮ ◂ ▸ ⏭) now live in the bar's ⋮ menu, which makes the bar TWO lines (104px) from 360px.
// Run from the repository root with serve.js up:  node tools/i18n-verify/read-bar-steps-browser.mjs
//   MUT=nohide ...  mutation: the bar keeps its four step buttons on a phone     -> "the four step buttons are not on the bar" and "two lines"
//   MUT=notiles ... mutation: the ⋮ menu never shows the four step tiles          -> "the ⋮ menu shows the four step tiles"
//   MUT=nomap ...   mutation: the Next āyah tile presses nothing                  -> "each tile presses the bar button it stands for"
//   MUT=always ...  mutation: the move happens with Read on OFF too               -> "with Read on off the four buttons stay on the bar"
// Rendered and measured at 320, 360, 390, 412, 599, 600, 768 and 1280, in English and Bangla (320 stays THREE lines: its first line is 21px too wide).
import { chromium, newContext, openPage, goReadOn } from "./harness.mjs";
import fs from "node:fs";
import path from "node:path";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}
const ROOT = process.cwd(), MUT = process.env.MUT || "", restores = [];
function mutate(rel, re, to) {
  const f = path.join(ROOT, rel), keep = fs.readFileSync(f, "utf8"); let n = 0;
  const next = keep.replace(re, (...a) => (n++, typeof to === "function" ? to(...a) : to));
  console.log(`MUTATION ${MUT}: ${n} replacement(s) in ${rel}`);
  if (!n) throw new Error("mutation matched nothing");
  fs.writeFileSync(f, next); restores.push(() => fs.writeFileSync(f, keep));
}
const restoreAll = () => { while (restores.length) restores.pop()(); };
process.on("exit", restoreAll);
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { restoreAll(); process.exit(1); });
const PAGE = "app/quranrevival.html";
if (MUT === "nohide") mutate(PAGE, /body\.read-bar-steps-in-menu #readBar :is\(#prevUnitBtn, #prevAyahBtn, #nextAyahBtn, #nextUnitBtn\) \{ display: none !important; \}/g, "");
else if (MUT === "notiles") mutate(PAGE, /body\.read-bar-steps-in-menu \.qm-sheet \.qm-tile\.qm-step-tile \{ display: flex; \}/g, "");
else if (MUT === "nomap") mutate(PAGE, /stepnextayah: "nextAyahBtn", /g, "");
else if (MUT === "always") mutate(PAGE, /setReadBarStepsWanted\(meaningOn && !isMushaf\);/g, "setReadBarStepsWanted(true);");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
const WIDTHS = process.env.ONE ? [390] : [320, 360, 390, 412, 599, 600, 768, 1280];
const LANGS = process.env.ONE ? ["en"] : ["en", "bn"];
const IDS = ["prevUnitBtn", "prevAyahBtn", "nextAyahBtn", "nextUnitBtn"];
try {
  for (const lang of LANGS) for (const width of WIDTHS) {
    const tag = `[${lang} ${width}]`, phone = width < 600;
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 900 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
    await page.click("#tabReadBtn"); await page.waitForTimeout(500);
    await setSel(page, "surahSelect", "14"); await page.waitForTimeout(1500);
    await setSel(page, "unitTypeSelect", "range"); await page.waitForTimeout(800);
    await setSel(page, "rangeFromSelect", "25"); await page.waitForTimeout(300); await setSel(page, "rangeToSelect", "33"); await page.waitForTimeout(800);
    // Read on OFF first (the ONE Ayah View / the plain range): the four buttons are where they were
    const off = await page.evaluate((ids) => ({ cls: document.body.classList.contains("read-bar-steps-in-menu"), vis: ids.filter((i) => document.getElementById(i).getClientRects().length).length, on: !!document.getElementById("readOnCheck")?.checked }), IDS);
    if (!off.on) check(`${tag} MUTATION TARGET (always): with Read on off the four buttons stay on the bar (${off.vis} of 4 on screen, class ${off.cls})`, !off.cls && off.vis >= 2, JSON.stringify(off));
    for (let i = 0; i < 3 && !(await page.evaluate(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0)); i++) { await goReadOn(page); await page.waitForTimeout(1200); }
    await page.waitForTimeout(800);
    const bar = await page.evaluate((ids) => { const b = document.getElementById("readBar"), r = b.getBoundingClientRect(); return { h: Math.round(r.height), vis: ids.filter((i) => document.getElementById(i).getClientRects().length).length, cls: document.body.classList.contains("read-bar-steps-in-menu"), sideways: document.documentElement.scrollWidth - innerWidth }; }, IDS);
    if (phone && width >= 360) {
      check(`${tag} MUTATION TARGET (nohide): in Read on the bar is TWO lines (${bar.h}px, was 151px)`, bar.h <= 105, JSON.stringify(bar));
      check(`${tag} MUTATION TARGET (nohide): the four step buttons are not on the bar`, bar.vis === 0 && bar.cls, JSON.stringify(bar));
    } else if (phone) {
      check(`${tag} at 320px the bar is still THREE lines (${bar.h}px): its first line is 21px too wide for two`, bar.h <= 152 && bar.vis === 0, JSON.stringify(bar));
    } else {
      check(`${tag} from 600px the bar is unchanged: the four step buttons stay on it (${bar.vis} of 4), no step tiles`, bar.vis === 4 && !bar.cls, JSON.stringify(bar));
    }
    check(`${tag} the page does not scroll sideways`, bar.sideways <= 1, String(bar.sideways));
    // the ⋮ menu
    await page.click("#readBar .ayah-quick-btn").catch(() => {});
    await page.waitForTimeout(500);
    const tiles = await page.evaluate(() => { const sheet = document.querySelector("#readBar .qm-sheet"), sr = sheet?.getBoundingClientRect(); return [...document.querySelectorAll("#readBar .qm-step-tile")].filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return { label: e.getAttribute("aria-label"), w: Math.round(r.width), h: Math.round(r.height), inside: !!sr && r.left >= sr.left - 1 && r.right <= sr.right + 1 }; }); });
    if (phone) {
      check(`${tag} MUTATION TARGET (notiles): the ⋮ menu shows the four step tiles, each 40px or more, inside the menu`, tiles.length === 4 && tiles.every((x) => x.w >= 40 && x.h >= 40 && x.inside), JSON.stringify(tiles));
      // each tile presses the bar button it stands for: count the clicks the real buttons receive
      const res = await page.evaluate((ids) => {
        const got = {}; ids.forEach((i) => { got[i] = 0; document.getElementById(i).addEventListener("click", () => { got[i]++; }, true); });
        const out = {};
        for (const [act, id] of [["stepprevunit", "prevUnitBtn"], ["stepprevayah", "prevAyahBtn"], ["stepnextayah", "nextAyahBtn"], ["stepnextunit", "nextUnitBtn"]]) {
          for (const k of ids) got[k] = 0;
          const t = document.querySelector(`#readBar [data-qm-act="${act}"]`); if (!t) { out[act] = "no tile"; continue; }
          if (t.disabled) { out[act] = "disabled"; continue; }
          t.click();
          out[act] = ids.map((k) => `${k}:${got[k]}`).filter((x) => !x.endsWith(":0")).join(",") === `${id}:1` ? "ok" : JSON.stringify(got);
        }
        return out;
      }, IDS);
      // the bar's own buttons are enabled (flow: both ◂ ▸ always on); ⏮ at the first unit may be disabled, and then its tile says so
      const bad = Object.entries(res).filter(([, v]) => v !== "ok" && v !== "disabled");
      check(`${tag} MUTATION TARGET (nomap): each tile presses the bar button it stands for (${JSON.stringify(res)})`, bad.length === 0 && res.stepnextayah === "ok", JSON.stringify(res));
    } else {
      check(`${tag} from 600px the ⋮ menu has no step tiles`, tiles.length === 0, JSON.stringify(tiles));
    }
    if (width === 390 && lang === "en") await page.screenshot({ path: `${process.env.SHOTS || "/tmp"}/read-bar-steps-390.png` });
    await ctx.close();
  }
} finally { await browser.close(); restoreAll(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
