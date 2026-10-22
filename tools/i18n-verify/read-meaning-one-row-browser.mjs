// PCF MSA J75 (the Owner, 22 Oct 2026, two phone screenshots of the Read view's Meaning flow): "Organise this view in
// mob. Make one row of buttons. All fits easily. Page number twice. Fix. Tiny line, takes space." Measured before, at
// 412px: English · Bangla · WbW on one line and 🔖 📖 ⤢ ⋯ on the next (the switches 164px + the tools 228px > a 380px
// bar); "↑ Page 176" and "Page 177" both shown at the top of the flow with a dashed line between; a rule under the menus.
// (1) On a phone (412, 390, 360; Mushaf on, Meaning open), the switches and the tools are ONE row, inside the bar.
// (2) The flow's top button reads "↑ Previous page" (its page number only in its tip), the page number shows once.
// (3) No dashed line above the first page's label; no rule under the menu row below 600px.
// (4) A computer (1280) keeps 📖's word and the menu row's rule.
// Run from the repository root, serve.js on :8080 (QR_BASE for another port).
//   --mutate=nobreak  no line break before the switches  -> (1) fails at 412/390
//   --mutate=prevnum  the button names the page number     -> (2) fails
//   --mutate=rule     the first label keeps its dashed line -> (3) fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nobreak: ['#readBar:has(#readMeaningLayersSlot:not([hidden]))::before { content: ""; order: 1; flex: 0 0 100%; height: 0; }', ""],
  prevnum: ['">↑ ${escapeHtml(t("Previous page"))}</button>', '">↑ ${escapeHtml(t("Page {page}", { page: num(Math.max(1, first - 1)) }))}</button>'],
  rule: ["[data-meaning-pages] > .meaning-page-rule:first-child { border-top: 0; padding-top: 0; }", ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const W = { en: { prev: "↑ Previous page", page: "Page" }, bn: { prev: "↑ আগের পৃষ্ঠা", page: "পৃষ্ঠা" } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"]) for (const [width, height] of [[412, 900], [390, 844], [360, 780], [1280, 860]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => { const src = fs.readFileSync("app/quranrevival.html", "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  const ev = (f, a) => P.evaluate(f, a);
  await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove())); await P.waitForTimeout(800);
  if (!(await ev(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(500);
  await ev(() => { const u = document.getElementById("unitTypeSelect"); u.value = "surah"; u.dispatchEvent(new Event("change", { bubbles: true })); const s = document.getElementById("surahSelect"); s.value = "8"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForTimeout(2000);
  if (!(await ev(() => document.getElementById("readMushafBtn").getAttribute("aria-pressed") === "true"))) { await P.click("#readMushafBtn"); await P.waitForTimeout(2000); }
  await P.click("#readMeaningBtn");
  await P.waitForFunction(() => document.querySelector("[data-meaning-pages] .meaning-page-rule"), null, { timeout: 20000 });
  await P.waitForTimeout(600);
  const m = await ev(() => {
    const r = (e) => e?.getBoundingClientRect();
    const bar = r(document.getElementById("readBar")), slot = r(document.getElementById("readMeaningLayersSlot")), end = r(document.getElementById("readBarEnd"));
    const tools = [...document.querySelectorAll("#readBarEnd > button")].filter((b) => b.getBoundingClientRect().width > 0).map((b) => { const x = b.getBoundingClientRect(); return { w: x.width, h: x.height, mid: (x.top + x.bottom) / 2 }; });
    const prev = document.querySelector("[data-meaning-prev]");
    const rule = document.querySelector("[data-meaning-pages] > .meaning-page-rule");
    const cs = getComputedStyle(rule), nav = getComputedStyle(document.getElementById("topNav"));
    const word = document.querySelector("#readMeaningBtn .read-meaning-word");
    return { bar: [bar.left, bar.right], slot: [slot.left, slot.top, slot.bottom, slot.right], end: [end.left, end.top, end.bottom, end.right], tools, prev: prev.textContent.trim(), prevTip: prev.title, rule: rule.textContent.trim(), ruleBorder: cs.borderTopStyle === "none" || parseFloat(cs.borderTopWidth) === 0, navLine: nav.borderBottomStyle !== "none" && parseFloat(nav.borderBottomWidth) > 0, word: !!word && word.getBoundingClientRect().width > 0, sw: document.documentElement.scrollWidth, vw: innerWidth };
  });
  if (width < 900) {
    const mid = (a) => (a[1] + a[2]) / 2;
    const oneRow = Math.abs(mid(m.slot) - mid(m.end)) < 8 && m.slot[3] <= m.end[0] + 1 && m.tools.every((t) => Math.abs(t.mid - mid(m.end)) < 4);
    check(`${tag} English · Bangla · WbW and 🔖 📖 ⤢ ⋯ are one row`, oneRow, JSON.stringify({ slot: m.slot, end: m.end }));
    check(`${tag} ...inside the bar, no sideways scroll, the tools 40px`, m.slot[0] >= m.bar[0] - 1 && m.end[3] <= m.bar[1] + 1 && m.sw <= m.vw && m.tools.every((t) => t.w >= 39.5 && t.h >= 39.5), JSON.stringify(m));
    check(`${tag} no rule under the menu row below 600px`, !m.navLine);
  } else {
    check(`${tag} a computer keeps 📖's word and the menu row's rule`, m.word && m.navLine, JSON.stringify({ word: m.word, nav: m.navLine }));
  }
  check(`${tag} the flow's top button reads "${W[lang].prev}" (no page number on it; the number in its tip)`, m.prev === W[lang].prev && new RegExp(W[lang].page).test(m.prevTip), JSON.stringify({ prev: m.prev, tip: m.prevTip }));
  check(`${tag} the page number shows once at the top: "${m.rule}"`, new RegExp(W[lang].page).test(m.rule) && !/\d|[০-৯]/.test(m.prev));
  check(`${tag} no dashed line above the first page's label`, m.ruleBorder);
  check(`${tag} no page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Read view Meaning flow on a phone: one row, the page number once, no extra lines (J75): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
