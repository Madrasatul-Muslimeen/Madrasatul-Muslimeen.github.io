// The Read view's 📖 Meaning (the Owner, 10 Oct 2026, with a Range 57:1-6 screenshot on Mushaf page 537):
//   "Read view is now Mushaf view, but I want a reading flow with meaning, translations, word meaning that should
//    appear by pressing a button. Then, pressing same button should collapse back to Mushaf view. That button should
//    be visible even in full screen Mushaf view." ... "not only display a single Ayah, rather the entire page and
//    continue."
// Expected values written BY HAND. Run from the repository root, serve.js on :8080.
//   --mutate=nomeaning   renderStudyScreen ignores Meaning                 -> the flow checks fail
//   --mutate=fshides     full screen's bare state hides 📖 again            -> the full-screen checks fail
//   --mutate=nocontinue  the next page never joins                          -> the "and continue" check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nomeaning: ["      const meaningOn = readMeaningOn;", "      const meaningOn = false;"],
  // Re-anchored 10 Oct 2026: 📖 and ⤢ now sit in #readBarEnd, whose bare-state rule keeps exactly those two.
  fshides: ["#readBarEnd > *:not(#hideChromeBtn):not(#readMeaningBtn) { display: none; }", "#readBarEnd > *:not(#hideChromeBtn) { display: none; }"],
  // Re-aimed on its first run: cutting the bookkeeping line still left the page inserted, so it proved nothing.
  // What makes the next page join on its own is the observer on the ↓ button.
  nocontinue: ["        meaningObserver.observe(nextBtn);", "        void nextBtn;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SHOT_DIR = process.env.SHOT_DIR || "/tmp";
const BN = /[ঀ-৿]/;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function start(lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const src = fs.readFileSync("app/quranrevival.html", "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  return { ctx, ...(await openPage(ctx, "/app/quranrevival.html")) };
}
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
async function openRange57(page) {
  const ok = await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0);
  if (!ok) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", "57"); await page.waitForTimeout(1500);
  await setSel(page, "unitTypeSelect", "range"); await page.waitForTimeout(800);
  await setSel(page, "rangeFromSelect", "1"); await page.waitForTimeout(300);
  await setSel(page, "rangeToSelect", "6"); await page.waitForTimeout(800);
  await page.evaluate(() => { const t = document.getElementById("mushafToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction(() => document.querySelector(".hifz-page[data-mushaf-page]"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
}
const btn = (page) => page.evaluate(() => {
  const b = document.getElementById("readMeaningBtn"), r = b?.getBoundingClientRect();
  const hit = r && r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
  return { shown: !!r && r.width > 0, h: r ? Math.round(r.height) : 0, tappable: !!hit && b.contains(hit), pressed: b?.getAttribute("aria-pressed"), word: b?.querySelector(".read-meaning-word")?.textContent.trim() ?? "", label: b?.getAttribute("aria-label") ?? "" };
});
const flow = (page) => page.evaluate(() => {
  const arts = [...document.querySelectorAll("#pageViewContainer [data-meaning-key]")];
  const root = document.body.classList.contains("read-sideways") ? document.querySelector("#pageViewContainer .meaning-flow") : document.getElementById("readScroll");
  const top = root?.getBoundingClientRect().top ?? 0;
  const at = arts.find((el) => el.getBoundingClientRect().bottom > top + 60);
  const a571 = arts.find((el) => el.dataset.meaningKey === "57:1");
  return {
    n: arts.length, keys: arts.map((e) => e.dataset.meaningKey),
    pages: [...document.querySelectorAll("#pageViewContainer [data-meaning-page-rule]")].map((e) => Number(e.dataset.meaningPageRule)),
    out: arts.filter((e) => e.classList.contains("out")).map((e) => e.dataset.meaningKey),
    mushaf: document.querySelectorAll("#pageViewContainer .hifz-page").length,
    topKey: at?.dataset.meaningKey ?? null,
    a571: a571 ? { ar: !!a571.querySelector(".ayah-arabic")?.textContent.trim(), en: !!a571.querySelector(".ayah-translation:not(.ayah-translation-bn)")?.textContent.trim(), bn: !!a571.querySelector(".ayah-translation-bn")?.textContent.trim(), wbw: a571.querySelectorAll(".wbw-word").length } : null,
    over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`;
  const { ctx, page, errors } = await start(lang, width);
  await openRange57(page);
  const b0 = await btn(page);
  check(`${tag} 📖 sits on the Read bar beside ⤢, tappable, unpressed, reading "${lang === "bn" ? "অর্থ" : "Meaning"}"`, b0.shown && b0.tappable && b0.h >= 36 && b0.pressed === "false" && b0.word === (lang === "bn" ? "অর্থ" : "Meaning"), JSON.stringify(b0));
  const pageInView = await page.evaluate(() => Number(document.getElementById("mushafPageRef")?.dataset.page || 0));

  await page.click("#readMeaningBtn");
  await page.waitForFunction(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  const f = await flow(page);
  // Page 537 is Al-Waaqia 77-96 then Al-Hadid 1-3; 57:4-6 run onto page 538 (the range's own pages).
  check(`${tag} pressed, the Mushaf gives way to the whole page(s) as a reading flow: page 537 from 56:77, across into Al-Hadid`, f.mushaf === 0 && f.pages[0] === 537 && f.keys[0] === "56:77" && f.keys.includes("57:1") && f.keys.includes("57:3"), JSON.stringify({ pages: f.pages, first: f.keys[0], n: f.n, mushaf: f.mushaf }));
  check(`${tag} ...the chosen range is drawn plainly, the rest of the page faint (56:77-96 and 57:7 on faint, 57:1-6 not)`, f.out.includes("56:77") && f.out.includes("56:96") && ["57:1", "57:2", "57:3", "57:4", "57:5", "57:6"].every((k) => !f.out.includes(k)) && f.out.includes("57:7"), JSON.stringify(f.out.slice(0, 3)));
  check(`${tag} ...every āyah with its Arabic, English, Bangla and word by word (57:1: all four)`, !!f.a571 && f.a571.ar && f.a571.en && f.a571.bn && f.a571.wbw >= 5, JSON.stringify(f.a571));
  check(`${tag} ...it opens at the reader's place: the first āyah of the range on the page in view (${pageInView}), 57:1`, f.topKey === "57:1", JSON.stringify({ top: f.topKey, pageInView }));
  check(`${tag} ...no sideways scroll`, f.over <= 0, f.over);
  const b1 = await btn(page);
  check(`${tag} ...the same button now reads "${lang === "bn" ? "মুসহাফ" : "Mushaf"}", pressed, and says it goes back`, b1.pressed === "true" && b1.word === (lang === "bn" ? "মুসহাফ" : "Mushaf") && (lang === "bn" ? BN.test(b1.label) : b1.label === "Back to the Mushaf"), JSON.stringify(b1));
  if (lang === "bn" || width === 1280) await page.screenshot({ path: `${SHOT_DIR}/read-meaning-${lang}-${width}.png` });

  // A layer off: Bangla goes, the place stays.
  const topBefore = (await flow(page)).topKey;
  await page.click('[data-meaning-layer="bn"]');
  await page.waitForTimeout(1200);
  const g = await flow(page);
  check(`${tag} unticking Bangla takes the Bangla meaning away and keeps the place (${topBefore})`, !!g.a571 && !g.a571.bn && g.a571.en && g.topKey === topBefore, JSON.stringify({ a571: g.a571, top: g.topKey }));
  await page.click('[data-meaning-layer="bn"]');
  await page.waitForTimeout(1200);

  // "and continue"
  const before = (await flow(page)).pages;
  await page.evaluate(() => document.querySelector("#pageViewContainer [data-meaning-next]")?.scrollIntoView());
  await page.waitForFunction((n) => document.querySelectorAll("#pageViewContainer [data-meaning-page-rule]").length > n, before.length, { timeout: 8000 }).catch(() => {});
  const c = await flow(page);
  check(`${tag} reaching the end, the next page joins on its own (${before.at(-1)} → ${before.at(-1) + 1})`, c.pages.length === before.length + 1 && c.pages.at(-1) === before.at(-1) + 1, JSON.stringify({ before, after: c.pages }));

  // Full screen: the bare state keeps 📖.
  for (let i = 0; i < 4; i++) {
    const bare = await page.evaluate(() => ["immersive-read", "fs-hide-readbar", "fs-hide-transport"].every((c) => document.body.classList.contains(c)));
    if (bare) break;
    await page.click("#hideChromeBtn"); await page.waitForTimeout(300);
  }
  const bareNow = await page.evaluate(() => ["immersive-read", "fs-hide-readbar", "fs-hide-transport"].every((c) => document.body.classList.contains(c)));
  const b2 = await btn(page);
  check(`${tag} in full screen's bare state 📖 is still there and tappable, beside ⤢`, bareNow && b2.shown && b2.tappable, JSON.stringify({ bareNow, ...b2 }));
  if (lang === "en" && width === 390) await page.screenshot({ path: `${SHOT_DIR}/read-meaning-fs-${lang}-${width}.png` });
  await page.evaluate(() => { const el = document.querySelector('#pageViewContainer [data-meaning-key="57:2"]'); el?.scrollIntoView({ block: "start", behavior: "instant" }); });
  await page.waitForTimeout(300);
  await page.click("#readMeaningBtn");
  await page.waitForFunction(() => document.querySelector("#pageViewContainer .hifz-page"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  const back = await page.evaluate(() => ({ mushaf: document.querySelectorAll("#pageViewContainer .hifz-page").length, meaning: document.querySelectorAll("#pageViewContainer [data-meaning-key]").length, page: Number(document.getElementById("mushafPageRef")?.dataset.page || 0), stillFull: document.body.classList.contains("immersive-read") }));
  const b3 = await btn(page);
  check(`${tag} pressed again (in full screen), back to the Mushaf at the page the reader had reached (57:2 → page 537), still full screen`, back.mushaf > 0 && back.meaning === 0 && back.page === 537 && back.stillFull && b3.pressed === "false", JSON.stringify({ ...back, pressed: b3.pressed }));

  // Remembered on this device.
  await page.click("#readMeaningBtn"); await page.waitForTimeout(800);
  await page.reload(); await page.waitForTimeout(800);
  const remembered = await page.evaluate(() => { try { return localStorage.getItem("qr.readMeaning"); } catch { return null; } });
  check(`${tag} the choice is remembered on this device`, remembered === "1", remembered);
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

console.log(`\n==== Read view 📖 Meaning (the Owner, 10 Oct 2026): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
