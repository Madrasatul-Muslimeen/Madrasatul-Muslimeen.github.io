// The Owner, 15 Nov 2026 (a Word card opened from the vocabulary list): "Move the back button to the right beside the cross
// button. Widen the right side section." Fails unless, on a wide card (1600/1280), the card's way back is the element
// right before × (ⓘ ← × ☰), and the Record-your-Progress column is wider than the old 19rem (304px) on a card wide enough
// for it (1600) while the 1280 card keeps its left column >= 640px.
//   node tools/i18n-verify/word-card-back-beside-close-browser.mjs [--mutate=before-word|narrow-side]
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "before-word": ["if (head && closeBtn) head.insertBefore(back, closeBtn); else if", "if (head && before) head.insertBefore(back, before); else if"],
  "narrow-side": ["clamp(19rem, 28%, 26rem)", "19rem"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const rows = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/learn-next.json", "utf8")).rows;
const first = rows[1];
const S = Math.floor(first.o / 1000000), A = Math.floor((first.o % 1000000) / 1000), P = first.o % 1000;
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
for (const [w, h] of [[1600, 1000], [1280, 900]]) {
  const tag = `[${w}]`;
  const ctx = await newContext(browser, { appLang: "en", banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [from, to] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const body = await res.text();
      if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
      r.fulfill({ response: res, body: body.replace(from, to) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", String(S)); await page.waitForTimeout(1200);
  await setSel(page, "ayahSelect", String(A)); await page.waitForTimeout(900);
  await page.evaluate(([s, a, p]) => document.querySelector(`[data-word-occurrence$=":${s}:${a}:${p}"]`)?.click(), [S, A, P]);
  await page.waitForFunction(() => !!document.querySelector("#quranWordCardMount .word-card-learnnext"), null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.querySelector("#quranWordCardMount [data-learn-next-open]")?.click());
  await page.waitForFunction(() => !!document.querySelector("#quranWordCardMount [data-word-card-app-back]"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => {
    const head = document.querySelector("#quranWordCardMount .quran-word-card > header");
    const b = head?.querySelector("[data-word-card-app-back]"), x = head?.querySelector("[data-word-card-close]");
    const side = document.querySelector("#quranWordCardMount .word-card-side"), main = document.querySelector("#quranWordCardMount .word-card-main");
    if (!b || !x) return { found: false };
    const rb = b.getBoundingClientRect(), rx = x.getBoundingClientRect();
    return { found: true, adjacent: b.nextElementSibling === x, sameLine: Math.abs((rb.top + rb.bottom) / 2 - (rx.top + rx.bottom) / 2) < 4, gap: Math.round(rx.left - rb.right),
      side: side ? Math.round(side.getBoundingClientRect().width) : 0, main: main ? Math.round(main.getBoundingClientRect().width) : 0 };
  });
  check(`${tag} POSITIVE CONTROL: the Word card has its way back and ×`, m.found, JSON.stringify(m));
  if (m.found) {
    check(`${tag} the way back is right before ×, on its line, a few px apart`, m.adjacent && m.sameLine && m.gap >= 0 && m.gap <= 12, JSON.stringify(m));
    if (w === 1600) check(`${tag} the Record column is wider than the old 304px`, m.side > 330, JSON.stringify(m));
    else check(`${tag} the left column keeps >= 640px`, m.main >= 640, JSON.stringify(m));
  }
  await ctx.close();
}
await browser.close();
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
