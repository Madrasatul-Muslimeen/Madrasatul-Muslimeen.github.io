// MSA · QR J128 -- Word Card: the three marks (Difficult / Need practice / Done) and "Learn" are ONE row of FOUR, BELOW the
// Word Progress buttons; nothing of the marks sits above the tabs any more. Run from the repo root, node serve.js on :8080.
//   node tools/i18n-verify/word-card-marks-row-browser.mjs [--mutate=top|stack|rename]
//   --mutate=top     the marks row is rendered above the tabs again       -> "below the Progress buttons" FAILS
//   --mutate=stack   the five buttons go five across on a phone (J136; was: the three marks stack) -> the tidy-grid check FAILS (needs --width <= 520)
//   --mutate=rename  the five buttons lose their names (J136: names come from word-effort.js) -> the names check FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
const PAGE = "app/quranrevival.html", JS = "app/js/quran-word-card.js";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  top: [JS, "    ${originBar(context.origin, text)}\n", "    ${context.marksHtml ? `<div class=\"word-card-markrow\" data-word-card-marks>${context.marksHtml}</div>` : \"\"}\n    ${originBar(context.origin, text)}\n"],
  stack: ["app/js/word-effort.js", "@media (max-width:520px) { .we-buttons { grid-template-columns:repeat(3,minmax(0,1fr)); }", "@media (max-width:520px) { .we-buttons { grid-template-columns:repeat(5,minmax(0,1fr)); }"],
  rename: ["app/js/word-effort.js", '<span class="we-name">${esc(m.names[lang] || m.names.en)}</span>', '<span class="we-name"></span>'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error("unknown mutation");
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const lang of ["en", "bn"]) for (const width of [320, 390, 768, 1024, 1280, 1440]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE]; const src = fs.readFileSync(file, "utf8");
    if (src.split(a).length !== 2) throw new Error("anchor " + MUTATE);
    await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript", body: src.replace(a, b) }));
  }
  const { page } = await openPage(ctx, "/" + PAGE);
  await page.waitForTimeout(600);
  if (!(await page.evaluate(() => (document.getElementById("tabVocabularyBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabVocabularyBtn");
  await page.waitForFunction(() => document.querySelectorAll("#learnNextSheet .ln-row").length > 0, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-row="1"]')?.click());
  await page.waitForSelector("#quranWordCardMount .quran-word-card", { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(() => !!document.querySelector("#quranWordCardMount .word-card-markrow"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const root = document.querySelector("#quranWordCardMount .quran-word-card"); if (!root) return null;
    const row = root.querySelector(".word-card-markrow"); if (!row) return { noRow: true };
    const names = [...row.querySelectorAll("[data-word-mark] .we-name")].map((n) => n.textContent.trim());
    const btns = [...row.querySelectorAll("[data-word-mark]")].map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), top: Math.round(r.top), h: Math.round(r.height), l: r.left, rt: r.right, cls: b.className }; });
    const st = root.querySelector(".word-progress-states")?.getBoundingClientRect();
    const rowR = row.getBoundingClientRect(), card = root.getBoundingClientRect();
    const tabs = root.querySelector('[role="tablist"]')?.getBoundingClientRect();
    return { names, btns, statesBottom: st ? Math.round(st.bottom) : null, rowTop: Math.round(rowR.top), rowL: rowR.left, rowR: rowR.right, cardL: card.left, cardR: card.right, tabsTop: tabs ? Math.round(tabs.top) : null, overflow: [...row.querySelectorAll("button")].some((b) => b.scrollWidth > b.clientWidth + 1) };
  });
  if (!m || m.noRow) { check(`${tag} the row is there`, false, JSON.stringify(m)); await ctx.close(); continue; }
  const names = m.btns.map((b) => b.t);
  // UPDATED IN PLACE (MSA · QR J136, 10 Nov 2026, the Owner's "Approved with recommended"): the Word Mark row is now FIVE buttons,
  // Already Known · Difficult · Learn · Learned Easy · Very Hard (js/word-effort.js). Before this the row was three (J135).
  // Each button's accessible text is its name plus a small caption, so the NAME is read from .we-name.
  const nm = m.names;
  // UPDATED IN PLACE (12 Nov 2026, the Owner: "Place another level before Difficult, 'Little Difficult'"): six buttons.
  // UPDATED IN PLACE (13 Nov 2026, the Owner: "Mark chips order: Already known, Learned Easy, Little Hard, Difficult, Very Hard, Learn"): that order (labels unchanged).
  const EN = ["Already Known", "Learned Easy", "Little Hard", "Hard", "Very Hard", "Learn Now"]; // UPDATED IN PLACE 13 Nov 2026 (the Owner: "write Little Hard, Hard, Very Hard, Learn Now")
  check(`${tag} six buttons: Already Known · Learned Easy · Little Hard · Hard · Very Hard · Learn Now`, m.btns.length === 6 && nm.length === 6 && (lang === "en" ? EN.every((x, i) => nm[i] === x) : nm.every((x) => x && !/^[A-Za-z ]+$/.test(x))), nm.join(" | "));
  const widths = m.btns.map((b) => Math.round(b.rt - b.l));
  const perRow = Object.values(m.btns.reduce((a, b) => (a[b.top] = (a[b.top] || 0) + 1, a), {}));
  check(`${tag} a tidy grid: equal-width buttons${width <= 520 ? ", at most 3 to a row" : ""}`, Math.max(...widths) - Math.min(...widths) <= 2 && (width > 520 || Math.max(...perRow) <= 3), `widths ${widths} per row ${perRow}`);
  check(`${tag} below the Word Progress buttons (not above the tabs)`, m.statesBottom !== null && m.rowTop >= m.statesBottom - 1 && (m.tabsTop === null || m.rowTop > m.tabsTop), `states ${m.statesBottom} row ${m.rowTop} tabs ${m.tabsTop}`);
  check(`${tag} each button at least 40px tall, inside the card, text not clipped`, m.btns.every((b) => b.h >= 40 && b.l >= m.cardL - 1 && b.rt <= m.cardR + 1) && !m.overflow, JSON.stringify(m.btns.map((b) => [b.h, Math.round(b.l), Math.round(b.rt)])) + " " + m.cardL + "-" + m.cardR);
  if (width === 320 || width === 390 || width === 1280) { await page.evaluate(() => document.querySelector(".word-card-markrow")?.scrollIntoView({ block: "center" })); await page.waitForTimeout(150); await page.screenshot({ path: `/tmp/j128-${lang}-${width}-${MUTATE || "ok"}.png` }); }
  await page.close(); await ctx.close();
}
await browser.close();
console.log(`\n==== J128 marks+Learn row${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
