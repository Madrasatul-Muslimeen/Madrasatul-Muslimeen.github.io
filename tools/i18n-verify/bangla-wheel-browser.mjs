// PCF MSA J119 (n119c = F, G, H) -- the Bangla words on the Vocabulary Wheel: a thin outer ring, a centre line "Bangla x.xx%", a tenth part.
//   node tools/i18n-verify/bangla-wheel-browser.mjs [--mutate=noring|nocentre|notenth]     (serve.js on :8080)
// Fails unless: with all three on the Wheel has the gold ring, the centre line with the right share, and a 10th part;
// each switch removes only its own display; the whole-list switch removes all three; the tenth part opens nothing;
// the three switches are at least 40px tall; nothing runs past the screen at 320, 390 and 1440, in English and Bangla.
//   --mutate=noring    the ring is always drawn (even when its switch is off)   -> the ring-off check FAILS
//   --mutate=nocentre  the centre line is never drawn                           -> the centre check FAILS
//   --mutate=notenth   the tenth part is never drawn                            -> the tenth check FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const HTML = "app/quranrevival.html";
const MUT = {
  noring: [HTML, "...(bnPlan.ring ? { ring: bnPlan.ring } : {}),", "ring: { ratio: 0.05 },"],
  nocentre: [HTML, "if (bnPlan.centre !== null) {", "if (false) {"],
  notenth: [HTML, "if (bnPlan.tenth) {", "if (false) {"],
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const data = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/learn-next.json", "utf8"));
const picks = data.rows.slice(0, 12);
const words = picks.length, occ = picks.reduce((n, r) => n + r.n, 0), sharePct = (100 * occ) / data.total;
const STATE = JSON.stringify({ v: 1, list: "admin", on: true, admin: picks.map((r) => r.l), mine: [], wheel: { ring: true, centre: true, tenth: true } });
const digits = (s) => String(s).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const info = (page) => page.evaluate(() => {
  const svg = document.querySelector("#wheelContainer svg[data-vocab-wheel]");
  return {
    segs: [...document.querySelectorAll("#wheelContainer .wheel-seg")].map((s) => s.dataset.key),
    ring: document.querySelectorAll("#wheelContainer .wheel-ring-fill").length,
    centre: svg?.querySelector("[data-vocab-wheel-bn]")?.textContent ?? null,
    sw: [...document.querySelectorAll("#wheelLegendContainer [data-bangla-wheel], #wheelSidebarContainer [data-bangla-wheel]")].map((b) => [b.dataset.banglaWheel, b.getAttribute("aria-pressed"), Math.round(b.getBoundingClientRect().height)]),
    reach: [...document.querySelectorAll("#wheelLegendContainer [data-bangla-wheel], #wheelSidebarContainer [data-bangla-wheel]")].map((b) => { const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && (e === b || b.contains(e)); }),
    over: document.documentElement.scrollWidth - innerWidth,
    right: Math.max(0, ...[...document.querySelectorAll("#wheelLegendContainer *, #wheelContainer svg")].map((e) => e.getBoundingClientRect().right)) - innerWidth,
  };
});
const click = (page, k) => page.evaluate((key) => document.querySelector(`[data-bangla-wheel="${key}"]`).click(), k);

for (const lang of ["en", "bn"]) for (const [width, height] of [[1440, 900], [390, 844], [320, 640]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== Bangla on the Vocabulary Wheel ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.addInitScript((s) => { try { if (!localStorage.getItem("mm_bangla_words.v1")) localStorage.setItem("mm_bangla_words.v1", s); } catch {} }, STATE);
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => {
      const src = fs.readFileSync(file, "utf8");
      if (src.split(a).length !== 2) throw new Error(`mutation anchor not found exactly once: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.replace(a, b) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.waitForTimeout(1200);
  if (width < 900) { await page.click('#wheelDrawerRow [data-wheel-drawer="wheel"]').catch(() => {}); await page.waitForTimeout(250); }
  await page.evaluate(() => document.querySelector('[data-wheel-kind="vocab"]').click());
  if (width >= 900) { await page.waitForTimeout(300); await page.evaluate(() => document.getElementById("wheelPopupMaximizeBtn")?.click()); await page.waitForTimeout(600); }
  await page.waitForFunction(() => document.querySelector("#wheelContainer svg[data-vocab-wheel]"), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(300);

  await page.evaluate(() => document.querySelector('#wheelDrawerRow [data-wheel-drawer="legend"]')?.click()); await page.waitForTimeout(250);
  let w = await info(page);
  check(`${tag} (positive control) the Vocabulary Wheel drew its nine steps`, w.segs.filter((k) => k !== "vstep-bangla").length === 9, JSON.stringify(w.segs));
  check(`${tag} all three on: a tenth part`, w.segs.length === 10 && w.segs[9] === "vstep-bangla", JSON.stringify(w.segs));
  check(`${tag} all three on: the thin gold ring`, w.ring >= 1, String(w.ring));
  check(`${tag} all three on: the centre line says ${sharePct.toFixed(2)}%`, !!w.centre && digits(w.centre).includes(`${sharePct.toFixed(2)}%`) && (lang === "bn" ? /বাংলা/.test(w.centre) : /Bangla/.test(w.centre)), String(w.centre));
  check(`${tag} the three switches are at least 40px tall and all pressed`, w.sw.length === 3 && w.sw.every(([, p, h]) => p === "true" && h >= 40), JSON.stringify(w.sw));
  check(`${tag} each switch can be tapped (nothing covers its centre)`, w.reach.length === 3 && w.reach.every(Boolean), JSON.stringify(w.reach));
  check(`${tag} nothing runs past the screen`, w.over <= 0 && w.right <= 1, JSON.stringify({ over: w.over, right: w.right }));

  await click(page, "ring"); await page.waitForTimeout(300); w = await info(page);
  check(`${tag} ring off: no ring, centre and tenth stay`, w.ring === 0 && !!w.centre && w.segs.length === 10, JSON.stringify({ ring: w.ring, c: w.centre, s: w.segs.length }));
  await click(page, "ring"); await click(page, "centre"); await page.waitForTimeout(300); w = await info(page);
  check(`${tag} centre off: no centre line, ring and tenth stay`, !w.centre && w.ring >= 1 && w.segs.length === 10, JSON.stringify({ ring: w.ring, c: w.centre, s: w.segs.length }));
  await click(page, "centre"); await click(page, "tenth"); await page.waitForTimeout(300); w = await info(page);
  check(`${tag} tenth off: nine steps again, ring and centre stay`, w.segs.length === 9 && w.ring >= 1 && !!w.centre, JSON.stringify({ ring: w.ring, c: w.centre, s: w.segs.length }));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("mm_bangla_words.v1")).wheel);
  check(`${tag} the switches are remembered on this device`, stored.tenth === false && stored.ring === true && stored.centre === true, JSON.stringify(stored));
  await click(page, "tenth"); await page.waitForTimeout(300);

  // the tenth part opens nothing
  const before = await page.evaluate(() => !!document.querySelector("#learnNextSheet, [data-learn-next]"));
  await page.evaluate(() => document.querySelector('#wheelContainer .wheel-seg[data-key="vstep-bangla"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => !!document.querySelector("#learnNextSheet:not([hidden]), [data-learn-next]:not([hidden])"));
  check(`${tag} the tenth part opens no step`, !after || before === after, JSON.stringify({ before, after }));

  // the whole list off: no display at all
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("mm_bangla_words.v1")); s.on = false; localStorage.setItem("mm_bangla_words.v1", JSON.stringify(s)); });
  await page.reload(); await page.waitForTimeout(1500);
  if (width < 900) { await page.click('#wheelDrawerRow [data-wheel-drawer="wheel"]').catch(() => {}); await page.waitForTimeout(250); }
  await page.evaluate(() => document.querySelector('[data-wheel-kind="vocab"]').click());
  await page.waitForFunction(() => document.querySelector("#wheelContainer svg[data-vocab-wheel]"), null, { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('#wheelDrawerRow [data-wheel-drawer="legend"]')?.click()); await page.waitForTimeout(250);
  w = await info(page);
  check(`${tag} the whole list off: nine steps, no ring, no centre line`, w.segs.length === 9 && w.ring === 0 && !w.centre, JSON.stringify({ s: w.segs.length, ring: w.ring, c: w.centre }));
  await ctx.close();
}
await browser.close();
console.log(`\nbangla-wheel-browser: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
