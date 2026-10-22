// The Owner, 23 Oct 2026 (a PC screenshot of the Āyah card's Ruku' tab): "Only ayah tab shows the correct view not
// other tabs (Ruku, page, Hijb etc) FIX. all tabs should render same view as the Ayah in the Ayah Card view."
// On a PC (>= 900px) the unit card (Ruku', Page, Hizb, Juz, Surah) opens as the SAME window as the Āyah card (J70):
// the same place and size, ← Back, the unit's āyāt in the left pane, Approach / Record / Status in the right pane.
// Below 900px the unit card is the one column it was. Real data (22:3's ladder), en and bn, 1915x1220 and 1280x900;
// 390 for "unchanged". Run from the repository root, with `node serve.js` running.
//   --mutate=nowindow   the window ignores the unit card again (ayah-card-window.js, routed)   -> window checks fail
//   --mutate=noft       the left pane is never filled (quranrevival.html, routed)              -> āyāt checks fail
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nowindow: ["app/js/ayah-card-window.js", "**/app/js/ayah-card-window.js*", 'mountEl.querySelector("[data-ayah-sheet], [data-unit-card]")', 'mountEl.querySelector("[data-ayah-sheet]")', "text/javascript"],
  noft: ["app/quranrevival.html", "**/app/quranrevival.html*", "      fillUnitCardFullText(info);\n", "\n", "text/html"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const TABS = ["ruku:22:1", "page:madani:332", "hizb:34", "juz:17", "surah:22"];

async function open(lang, width, height) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, glob, from, to, type] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (src.split(from).length !== 2) throw new Error(`mutation anchor for ${MUTATE} not found exactly once`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: `${type}; charset=utf-8`, body: src.replace(from, to) }));
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  await P.waitForTimeout(1200);
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await P.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(400);
  await P.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "22"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:22:"]'), null, { timeout: 15000 });
  await P.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "3"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForFunction(() => document.querySelector('[data-ayah-num-badge="22:3"]'), null, { timeout: 8000 });
  await P.waitForTimeout(400);
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await P.evaluate(() => document.querySelector('[data-ayah-num-badge="22:3"]')?.click());
  await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
  await P.waitForTimeout(600);
  return { ctx, P, errors };
}
const measure = (P) => P.evaluate(() => {
  const c = document.querySelector("[data-ayah-sheet], [data-unit-card]");
  if (!c) return null;
  const r = (e) => { const b = e?.getBoundingClientRect(); return b && b.width > 0 ? { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) } : null; };
  const lum = (rgb) => { const v = (rgb.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const contrast = (a, b) => { const [h, l] = [lum(a), lum(b)].sort((p, q) => q - p); return (h + 0.05) / (l + 0.05); };
  const ar = c.querySelector(".ayah-ft-ar"), back = c.querySelector(".ayah-sheet-homeback");
  const bc = back && back.getBoundingClientRect(), onTop = back && (() => { const t = document.elementFromPoint(bc.left + bc.width / 2, bc.top + bc.height / 2); return !!t && (t === back || back.contains(t)); })();
  const text = c.querySelector("[data-ayah-sheet-text]"), info = c.querySelector("[data-ayah-sheet-paneinfo]");
  return { unit: c.hasAttribute("data-unit-card"), win: c.hasAttribute("data-ayah-win"), rect: r(c), text: r(text), info: r(info),
    ayahs: [...c.querySelectorAll("[data-unit-ft-ayah]")].map((e) => e.dataset.unitFtAyah),
    backH: bc ? Math.round(bc.height) : 0, backOnTop: !!onTop, record: !!info?.querySelector("[data-approach-stage-btn], .approach-stage-btn, select"),
    status: !!info?.querySelector("[data-unit-card-status]"), sideways: text ? text.scrollWidth - text.clientWidth : 0,
    arContrast: ar ? contrast(getComputedStyle(ar).color, getComputedStyle(c).backgroundColor) : 0 };
});
const expectAyahs = { "ruku:22:1": [1, 10], "surah:22": [1, 78] };

for (const lang of ["en", "bn"]) for (const [width, height] of [[1915, 1220], [1280, 900]]) {
  const tag = `${lang}/${width}`;
  let o;
  try { o = await open(lang, width, height); } catch (e) { check(`${tag}: the Āyah card opens (timed out)`, false, String(e).slice(0, 160)); continue; }
  const { ctx, P, errors } = o;
  const ayah = await measure(P);
  check(`${tag}: POSITIVE CONTROL the Āyah tab is the J70 window`, ayah && !ayah.unit && ayah.win && ayah.rect?.w > 800, JSON.stringify(ayah?.rect));
  for (const key of TABS) {
    await P.evaluate((k) => document.querySelector(`[data-unit-ladder-rung="${k}"]`)?.click(), key);
    try { await P.waitForFunction((k) => document.querySelector(`[data-unit-card][data-unit-key="${k}"]`), key, { timeout: 8000 }); }
    catch { check(`${tag} ${key}: the tab opens its card (timed out)`, false); continue; }
    await P.waitForFunction(() => document.querySelector("[data-unit-card] [data-unit-ft-ayah], [data-unit-card] [data-unit-card-ft] .ayah-status-empty:not(:only-child)"), null, { timeout: 12000 }).catch(() => {});
    await P.waitForTimeout(300);
    const m = await measure(P);
    const t = `${tag} ${key}`;
    check(`${t}: opens as the same window as the Āyah tab (same place and size)`, m?.unit && m.win && ayah?.rect && ["x", "y", "w", "h"].every((k) => Math.abs(m.rect[k] - ayah.rect[k]) <= 2), `${JSON.stringify(m?.rect)} vs ${JSON.stringify(ayah?.rect)}`);
    check(`${t}: two panes side by side, the full text on the left`, !!m?.text && !!m?.info && m.text.x < m.info.x && m.text.w > 200 && m.info.w > 200, JSON.stringify({ text: m?.text, info: m?.info }));
    const want = expectAyahs[key];
    const first = m?.ayahs?.[0], last = m?.ayahs?.at(-1);
    check(`${t}: the left pane lists the unit's āyāt${want ? ` (22:${want[0]}–22:${want[1]})` : ""}, 22:3 among them`, (m?.ayahs?.length ?? 0) > 0 && m.ayahs.includes("22:3") && (!want || (first === `22:${want[0]}` && last === `22:${want[1]}` && m.ayahs.length === want[1] - want[0] + 1)), `${m?.ayahs?.length} ${first}…${last}`);
    check(`${t}: ← Back is there, 40px+, on top`, m?.backH >= 40 && m?.backOnTop, `${m?.backH} ${m?.backOnTop}`);
    check(`${t}: the right pane holds Record and the unit's Status`, m?.record && m?.status);
    check(`${t}: the text pane does not run sideways; its Arabic reads at 4.5:1 or more`, m?.sideways <= 1 && m?.arContrast >= 4.5, `${m?.sideways} ${m?.arContrast?.toFixed(2)}`);
  }
  check(`${tag}: no page errors`, errors.filter((e) => !/net::|archive\.org|ERR_CERT/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
// A phone: unchanged -- one column, no text pane, not a window.
for (const lang of ["en", "bn"]) {
  let o;
  try { o = await open(lang, 390, 844); } catch (e) { check(`${lang}/390: the Āyah card opens (timed out)`, false); continue; }
  const { ctx, P } = o;
  await P.evaluate(() => document.querySelector('[data-unit-ladder-rung="ruku:22:1"]')?.click());
  await P.waitForFunction(() => document.querySelector("[data-unit-card]"), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(800);
  const m = await measure(P);
  check(`${lang}/390: the unit card on a phone is the one column it was (no window, no text pane)`, m?.unit && !m.win && !m.text && m.record && m.status, JSON.stringify({ win: m?.win, text: m?.text }));
  check(`${lang}/390: ← Back is there, 40px+`, m?.backH >= 40, String(m?.backH));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
