// PCF MSA J127 (the Owner, 9 Nov 2026 "Place both nav button together"; 11 Nov: "J127:A" = the Word Card's < and > buttons):
// the Word Card's ‹ and › sit TOGETHER at the start of the header row.
//   node tools/i18n-verify/word-card-nav-together-browser.mjs [--mutate=NAME] [--width=390] [--lang=en]   (repository root, serve.js on :8080)
//   --mutate=apart     › is drawn at the far end again (the old order and push)  -> "together" and "same row" FAIL
//   --mutate=smallnav  the nav buttons shrink to 30px                           -> the 40px check FAILS
//   --mutate=nopush    the push to × on a card up to 22rem is removed             -> "together" FAILS at 360 (the row spreads out)
// Expected values are written BY HAND; every number is measured on the rendered card (gap between the two, row, containment).
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${String(detail).slice(0, 300)}`); }
};
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate");
const JS = "app/js/quran-word-card.js", HTML = "app/quranrevival.html";
const NEXT = '      <button type="button" data-word-card-move="next" aria-label="${escapeHtml(text.next)}"${context.hasNext ? "" : " disabled"}>›</button>\n';
const MUT = {
  apart: [JS, NEXT + '      <button type="button" class="word-card-search-btn"', '      <button type="button" class="word-card-search-btn"', (src) => src.replace(NEXT, "").replace('      <button type="button" data-word-card-close', NEXT + '      <button type="button" data-word-card-close')],
  smallnav: [HTML, ".quran-word-card header button:disabled { opacity: 0.4; cursor: default; }", ".quran-word-card header button:disabled { opacity: 0.4; cursor: default; }\n  .quran-word-card header > [data-word-card-move] { width: 30px; height: 30px; }"],
  nopush: [HTML, "    .quran-word-card header > [data-word-card-close] { margin-inline-start: auto; }\n  }\n  @container wordcard (max-width: 25rem) {\n    .quran-word-card header:has(> .word-card-app-back) > button.word-card-legend-btn { margin-inline-start: 0; }", "  }\n  @container wordcard (max-width: 25rem) {\n    .quran-word-card header:has(> .word-card-app-back) > button.word-card-legend-btn { margin-inline-start: 0; }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const WIDTHS = arg("width") ? [Number(arg("width"))] : [320, 360, 390, 768, 1280];
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const lang of LANGS) for (const width of WIDTHS) {
    const tag = `[${lang} ${width}]`;
    console.log(`\n=== Word Card nav together ${tag} ===`);
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 1000 : 844 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const m = MUT[MUTATE]; const file = m[0];
      await ctx.route(`**/${file}*`, async (r) => {
        let src = fs.readFileSync(file, "utf8");
        if (m[3]) { const out = m[3](src); if (out === src) throw new Error(`mutation ${MUTATE}: nothing changed`); src = out; }
        else { if (!src.includes(m[1])) throw new Error(`mutation ${MUTATE}: anchor missing`); src = src.split(m[1]).join(m[2]); }
        await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src });
      });
    }
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    try {
      await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
      await page.waitForTimeout(1000);
      if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(200); }
      await page.click("#tabReadBtn");
      await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 10000 });
      await page.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "2"; el.dispatchEvent(new Event("change", { bubbles: true })); });
      await page.waitForTimeout(700);
      await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
      await page.waitForTimeout(500);
      const occ = "quran-word-occurrence:v1:1:2:2";
      await page.waitForFunction((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`), occ, { timeout: 8000 });
      await page.evaluate((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`).click(), occ);
      await page.waitForSelector(`.quran-word-card[data-occurrence-id="${occ}"]`, { timeout: 8000 });
      await page.waitForTimeout(800);
      const m = await page.evaluate(() => {
        const card = document.querySelector(".quran-word-card"), h = card.querySelector("header");
        const r = (s) => { const e = h.querySelector(s); return e && e.getBoundingClientRect(); };
        const p = r('[data-word-card-move="previous"]'), n = r('[data-word-card-move="next"]'), x = r("[data-word-card-close]"), cr = card.getBoundingClientRect(), hr = h.getBoundingClientRect();
        const kids = [...h.children].filter((c) => c.getBoundingClientRect().width > 0).map((c) => c.getBoundingClientRect());
        return { p, n, x, cr: { l: cr.left, r: cr.right }, hr: { l: hr.left, r: hr.right }, inside: kids.every((k) => k.left >= cr.left - 0.5 && k.right <= cr.right + 0.5), scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      const gap = m.n.left - m.p.right;
      check(`${tag} POSITIVE CONTROL: the card has ‹, › and × on screen`, !!m.p && !!m.n && !!m.x && m.p.width > 0 && m.n.width > 0 && m.x.width > 0);
      check(`${tag} ‹ and › sit TOGETHER: › starts within 8px after ‹ ends (gap ${gap.toFixed(1)}px)`, gap >= -0.5 && gap <= 8, JSON.stringify({ p: m.p.right, n: m.n.left }));
      check(`${tag} ...on the same row`, Math.abs(m.p.top - m.n.top) <= 1.5, JSON.stringify({ pt: m.p.top, nt: m.n.top }));
      check(`${tag} ...both 40px or more to press`, m.p.width >= 40 && m.p.height >= 40 && m.n.width >= 40 && m.n.height >= 40, JSON.stringify({ p: [m.p.width, m.p.height], n: [m.n.width, m.n.height] }));
      check(`${tag} the header stays inside the card (every control), with no sideways scroll`, m.inside && m.scroll <= 0, JSON.stringify({ inside: m.inside, scroll: m.scroll }));
      check(`${tag} × is not next to ‹ ›: it stays in the right-hand group`, m.x.left > m.n.right + 20 || m.x.top > m.n.bottom, JSON.stringify({ xl: m.x.left, nr: m.n.right }));
      await page.evaluate(() => document.querySelector('[data-word-card-move="next"]').click());
      await page.waitForTimeout(700);
      const after = await page.evaluate(() => document.querySelector(".quran-word-card")?.dataset.occurrenceId);
      check(`${tag} › still goes to the next word (1:2:3)`, after === "quran-word-occurrence:v1:1:2:3", String(after));
      check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|quran\.com|favicon/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    } catch (err) { check(`${tag} stopped early: ${String(err.message).split("\n")[0]}`, false); }
    await ctx.close();
  }
} finally { await browser.close(); }
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
