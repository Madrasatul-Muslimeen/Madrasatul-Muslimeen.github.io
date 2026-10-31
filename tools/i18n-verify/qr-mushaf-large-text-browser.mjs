// QR Lead audit 5, 31 Oct 2026 (Mushaf view, PCF User Manual d9d78ub): the Read view's bare full screen with large text.
// Measured on main v12.139 with this suite's probe: at 360x740 200% ☰ ‹ › and the tiles left the page reference 48px, so
// only ▾ showed (390x844 200% 78px, "Bism…"; 360 150% 72px); and below 600px Notes / Record / Approach, three equal cells,
// cut "Approach" (134px of words in 99px) and Bangla "লিপিবদ্ধ করুন" (119 in 99) at the screen's edge. fitReadBareBar()
// puts the reference on its own line only when its words are cut below 3.5 letters' room, and lets the three take their own
// widths and wrap only when a word is cut; the reading keeps that row's measured height at its foot. Where they fitted,
// nothing moves (PLAIN, recorded from unfixed main by --record).
//   node tools/i18n-verify/qr-mushaf-large-text-browser.mjs [--mutate=NAME] [--record | --main]   (serve.js on :8080, repo root)
//   no-ref     the reference never takes its own line    -> "the page reference shows its words" FAILS at 150/200%
//   always     the reference moves even when it fitted   -> "nothing moves where it fitted" FAILS at 100%
//   no-wrap    the three keep equal cells                -> "every word of Notes / Record / Approach shows" FAILS at 200%
//   no-pad     the reading ignores the taller row        -> "the last line can scroll above the row" FAILS at 360 200% en
//   no-run     fitReadBareBar is never run               -> words and reach FAIL
import { execSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const RECORD = process.argv.includes("--record"), ON_MAIN = RECORD || process.argv.includes("--main");
// [from, to, copies]: every copy is replaced, and the count must be exactly as written.
const MUT = {
  "no-ref": ['body.classList.add("qr-ref-own-line");', "", 1],
  "always": ["&& text.clientWidth < 3.5 * (parseFloat(getComputedStyle(text).fontSize) || 12)", "", 1],
  "no-wrap": ["body.rq-wrap #readQuickRow .rq-btn { flex: 1 1 auto; }", "", 1],
  "no-pad": ["#readScroll { padding-bottom: var(--rq-h, 52px); }", "#readScroll { }", 1],
  "no-run": ["      fitReadBareBar();\n", "", 1],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SHOT_DIR = process.env.SHOT_DIR || "";
// Recorded from unfixed main v12.139 (--record) at 100%: [reference width, Notes/Record/Approach row height or 0].
const PLAIN = {
  "320x640 en": [90, 53], "360x740 en": [88, 53], "360x740 bn": [88, 53], "390x844 en": [118, 53], "390x844 bn": [118, 53],
  "768x1024 en": [352, 0], "1280x800 en": [578, 0], "740x360 en": [324, 0], "740x360 bn": [345, 0],
};
const MAIN = ON_MAIN ? execSync("git show origin/main:app/quranrevival.html", { maxBuffer: 1 << 26 }).toString() : "";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const recorded = {};

async function boot(lang, w, h, size) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE || ON_MAIN) {
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); let body = ON_MAIN ? MAIN : await res.text();
      if (MUTATE) {
        const [from, to, n] = MUT[MUTATE];
        if (body.split(from).length - 1 !== n) throw new Error(`mutation ${MUTATE}: anchor found ${body.split(from).length - 1} times, not ${n}`);
        body = body.split(from).join(to);
      }
      r.fulfill({ response: res, body });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelector("#wheelContainer svg"), null, { timeout: 30000 });
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((e) => e.remove()));
  await page.evaluate(() => { const m = document.getElementById("mushafToggle"); if (!m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, size); await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById("tabReadBtn").click());
  await page.waitForFunction(() => document.querySelector("#readScroll .hifz-page") && document.querySelector("#mushafPageRef .mushaf-page-ref-text")?.textContent.trim(), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  return { ctx, page };
}

const measure = (page) => page.evaluate(() => {
  const R = (e) => e.getBoundingClientRect();
  const hit = (e) => { const r = R(e), x = r.left + r.width / 2, y = r.top + r.height / 2; if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return false; const at = document.elementFromPoint(x, y); return !!at && e.contains(at); };
  const inside = (r) => r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1;
  const ref = document.getElementById("mushafPageRef"), text = ref?.querySelector(".mushaf-page-ref-text");
  const fs = text ? parseFloat(getComputedStyle(text).fontSize) : 0;
  const row = document.getElementById("readQuickRow"), rs = document.getElementById("readScroll");
  const btns = row && row.getClientRects().length ? [...row.querySelectorAll(".rq-btn")].filter((b) => b.getClientRects().length && R(b).width > 0) : [];
  const fixed = !!row && getComputedStyle(row).position === "fixed";
  return {
    mushaf: !!document.querySelector("#readScroll .hifz-page"), bare: document.body.classList.contains("fs-hide-readbar"),
    words: text?.textContent.trim() || "", refW: ref ? Math.round(R(ref).width) : 0,
    refCut: !!text && text.scrollWidth > text.clientWidth + 1 && text.clientWidth < 3.5 * fs, textW: text ? text.clientWidth : 0,
    refReach: !!ref && hit(ref) && inside(R(ref)),
    btnCut: btns.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent.trim() + ":" + b.scrollWidth + ">" + b.clientWidth),
    btnOut: btns.filter((b) => !inside(R(b)) || !hit(b)).map((b) => b.textContent.trim()),
    nBtns: btns.length, rowH: fixed ? Math.round(R(row).height) : 0,
    pad: fixed ? parseFloat(getComputedStyle(rs).paddingBottom) : -1,
  };
});

for (const [w, h, lang] of [[320, 640, "en"], [360, 740, "en"], [360, 740, "bn"], [390, 844, "en"], [390, 844, "bn"], [768, 1024, "en"], [1280, 800, "en"], [740, 360, "en"], [740, 360, "bn"]]) {
  for (const size of ["100%", "150%", "200%"]) {
    const tag = `${w}x${h} ${lang} ${size}`, key = `${w}x${h} ${lang}`;
    const { ctx, page } = await boot(lang, w, h, size);
    const m = await measure(page);
    if (RECORD) { if (size === "100%") recorded[key] = [m.refW, m.rowH]; console.log(tag, JSON.stringify(m)); await ctx.close(); continue; }
    check(`${tag}: POSITIVE CONTROL the Mushaf page shows in the bare full screen, its reference filled in`, m.mushaf && m.bare && m.words.length > 0, JSON.stringify(m));
    check(`${tag}: the page reference shows its words ("${m.words}")`, !m.refCut, `text ${m.textW}px`);
    check(`${tag}: the page reference can be tapped, inside the screen`, m.refReach);
    if (m.nBtns) {
      check(`${tag}: every word of Notes / Record / Approach shows`, m.btnCut.length === 0, m.btnCut.join(" "));
      check(`${tag}: Notes / Record / Approach are inside the screen and can be tapped`, m.btnOut.length === 0, m.btnOut.join(" "));
    }
    if (m.rowH) check(`${tag}: the last line can scroll above the row (${m.pad}px at the foot for a ${m.rowH}px row)`, m.pad >= m.rowH - 1);
    if (size === "100%") check(`${tag}: nothing moves where it fitted`, JSON.stringify([m.refW, m.rowH]) === JSON.stringify(PLAIN[key]), `${JSON.stringify([m.refW, m.rowH])} vs ${JSON.stringify(PLAIN[key])}`);
    if (SHOT_DIR && size === "200%") await page.screenshot({ path: `${SHOT_DIR}/qr-mushaf-large-${w}x${h}-${lang}.png` });
    await ctx.close();
  }
}
await browser.close();
if (RECORD) { console.log("PLAIN =", JSON.stringify(recorded)); process.exit(0); }
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
