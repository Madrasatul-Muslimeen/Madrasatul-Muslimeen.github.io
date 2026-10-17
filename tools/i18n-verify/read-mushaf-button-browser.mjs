// QR J16 = PCF MSA J37 (the Owner chose A, 17 Oct 2026): a "📜 Mushaf" button on the Read bar beside 📖 Meaning,
// one tap, also in full screen. It is the same switch as Options ▸ "Mushaf view" (#mushafToggle).
// Expected values written BY HAND. Run from the repository root, serve.js on :8080.
//   --mutate=no-fullscreen    #readMushafBtn dropped from the bare-state :not() list  -> the full-screen checks fail
//   --mutate=not-same-switch  the tap flips a private flag, not the tick             -> the switch checks fail
//   --mutate=no-pressed       aria-pressed never updates                              -> the pressed checks fail
//   --mutate=dup-mushaf      📜 stays beside 📖 "Mushaf" in the Meaning flow       -> the step-aside check fails
//   --mutate=meaning-stuck    the tap does not close an open Meaning flow             -> the Meaning check fails
//   --width=390 --lang=bn     restrict the matrix
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
const MUT = {
  "no-fullscreen": [":not(#readMeaningBtn):not(#readMushafBtn):not(#readBarBookmarkBtn)", ":not(#readMeaningBtn):not(#readBarBookmarkBtn)"],
  "not-same-switch": ["mushafToggle.checked = !mushafToggle.checked;", "window.__privMushaf = !window.__privMushaf;"],
  "no-pressed": ['readMushafBtn.setAttribute("aria-pressed", String(mushafToggle.checked));', "void 0;"],
  "dup-mushaf": ["hidden = readMeaningOn && mushafToggle.checked;", "hidden = false;"], // both places (split/join)
  "meaning-stuck": ["      if (readMeaningOn) {\n        // Close the Meaning flow first", "      if (false) {\n        // Close the Meaning flow first"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const WIDTHS = arg("width") ? [Number(arg("width"))] : [320, 390, 820, 1280, 1440];
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const SHOT_DIR = process.env.SHOT_DIR || "/tmp";
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
async function openAyah(page) {
  const ok = await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0);
  if (!ok) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", "57"); await page.waitForTimeout(1500);
  await setSel(page, "unitTypeSelect", "ayah"); await page.waitForTimeout(500);
  await setSel(page, "ayahSelect", "2"); await page.waitForTimeout(800);
}
const state = (page) => page.evaluate(() => {
  const b = document.getElementById("readMushafBtn"), r = b?.getBoundingClientRect();
  const hit = r && r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
  const pages = [...document.querySelectorAll("#pageViewContainer .hifz-page")].filter((e) => e.offsetParent !== null).length;
  // The āyah mark: on a Mushaf page the chosen āyah's words are the ones NOT dimmed; its end marker names it.
  const marked = [...document.querySelectorAll("#pageViewContainer .hifz-ayah-marker:not(.dim)")].map((e) => e.dataset.ayahMarker);
  return {
    shown: !!r && r.width > 0, w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0, tappable: !!hit && b.contains(hit),
    pressed: b?.getAttribute("aria-pressed"), label: b?.getAttribute("aria-label") ?? "", word: b?.querySelector(".read-mushaf-word")?.textContent.trim() ?? "",
    wordShown: !!b && getComputedStyle(b.querySelector(".read-mushaf-word")).display !== "none",
    tick: document.getElementById("mushafToggle").checked, pages, marked,
    ayah: document.getElementById("ayahSelect")?.value,
  };
});
const rows = (page) => page.evaluate(() => {
  const bar = document.getElementById("readBar"), end = document.getElementById("readBarEnd");
  const tops = [...end.children].filter((e) => e.getBoundingClientRect().width > 0).map((e) => Math.round(e.getBoundingClientRect().top));
  const noBtn = document.createElement("style"); noBtn.textContent = "#readMushafBtn{display:none!important}"; document.head.append(noBtn);
  const without = bar.getBoundingClientRect().height;
  noBtn.remove();
  const withIt = bar.getBoundingClientRect().height;
  return { oneRow: Math.max(...tops) - Math.min(...tops) <= 2, tops, withIt: Math.round(withIt), without: Math.round(without), over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
});
const bare = (page) => page.evaluate(() => ["immersive-read", "fs-hide-readbar", "fs-hide-transport"].every((c) => document.body.classList.contains(c)));
async function waitMushaf(page, on) {
  await page.waitForFunction((o) => [...document.querySelectorAll("#pageViewContainer .hifz-page")].some((e) => e.offsetParent !== null) === o, on, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
}

for (const lang of LANGS) for (const width of WIDTHS) {
  const tag = `[${lang} ${width}]`;
  const bn = lang === "bn";
  const { ctx, page, errors } = await start(lang, width);
  await openAyah(page);
  const s0 = await state(page);
  check(`${tag} 📜 is on the Read bar, tappable, ≥ 40px tall, unpressed`, s0.shown && s0.tappable && s0.h >= 40 && s0.pressed === "false" && !s0.tick, JSON.stringify(s0));
  check(`${tag} its spoken name is ${bn ? "in Bangla (মুসহাফ দৃশ্য)" : '"Mushaf view"'}`, bn ? s0.label === "মুসহাফ দৃশ্য" : s0.label === "Mushaf view", s0.label);
  // Review (v11.35): 480px → 768px; at 600px the word wrapped the bar to two lines (read-quick-buttons 600).
  check(`${tag} the word shows only from 768px up (${width >= 768}), 📜 alone below at 40px wide`, s0.wordShown === (width >= 768) && (width >= 768 || s0.w === 40), JSON.stringify({ w: s0.w, wordShown: s0.wordShown }));
  if (s0.wordShown) check(`${tag} the word reads ${bn ? "মুসহাফ" : "Mushaf"}`, s0.word === (bn ? "মুসহাফ" : "Mushaf"), s0.word);
  const r0 = await rows(page);
  check(`${tag} #readBarEnd keeps one row (tops ${r0.tops.join(",")}) and the bar is no taller for 📜 (${r0.withIt} vs ${r0.without}), no sideways overflow`, r0.oneRow && r0.withIt === r0.without && r0.over <= 0, JSON.stringify(r0));

  // One tap: the same switch as the Options tick.
  await page.click("#readMushafBtn");
  await waitMushaf(page, true);
  const s1 = await state(page);
  check(`${tag} one tap → #mushafToggle is checked, the printed page shows, pressed`, s1.tick && s1.pages > 0 && s1.pressed === "true", JSON.stringify(s1));
  check(`${tag} ...the current āyah (57:2) is the one marked on the page`, s1.marked.includes("57:2") && !s1.marked.includes("57:1"), JSON.stringify(s1.marked));
  const r1 = await rows(page);
  check(`${tag} ...Mushaf view: one row, bar no taller for 📜 (${r1.withIt} vs ${r1.without})`, r1.oneRow && r1.withIt === r1.without && r1.over <= 0, JSON.stringify(r1));
  if (lang === "en" || bn) if (width === 390) await page.screenshot({ path: `${SHOT_DIR}/read-mushaf-${lang}-${width}-normal.png` });

  // Full screen: the bare state keeps 📜.
  for (let i = 0; i < 4 && !(await bare(page)); i++) { await page.click("#hideChromeBtn"); await page.waitForTimeout(300); }
  const sf = await state(page);
  check(`${tag} in full screen's bare state 📜 is still there, tappable, pressed`, (await bare(page)) && sf.shown && sf.tappable && sf.pressed === "true" && sf.h >= 40, JSON.stringify(sf));
  const rf = await rows(page);
  check(`${tag} ...full screen: one row, bar no taller for 📜 (${rf.withIt} vs ${rf.without})`, rf.oneRow && rf.withIt === rf.without && rf.over <= 0, JSON.stringify(rf));
  if (width === 390) await page.screenshot({ path: `${SHOT_DIR}/read-mushaf-${lang}-${width}-fullscreen.png` });

  // Second tap, still in full screen: back, same āyah.
  await page.click("#readMushafBtn");
  await waitMushaf(page, false);
  const s2 = await state(page);
  check(`${tag} a second tap (in full screen) → back to the Read view: tick off, no page, unpressed, still āyah 57:2, still full screen`, !s2.tick && s2.pages === 0 && s2.pressed === "false" && s2.ayah === "2" && (await bare(page)), JSON.stringify(s2));
  await page.click("#hideChromeBtn"); await page.waitForTimeout(300);
  for (let i = 0; i < 4 && (await page.evaluate(() => document.body.classList.contains("immersive-read"))); i++) { await page.click("#hideChromeBtn"); await page.waitForTimeout(300); }

  // In step with the Options tick, both ways. The tick is the Options one; its change event is the user's tick.
  await page.evaluate(() => { const t = document.getElementById("mushafToggle"); t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); });
  await waitMushaf(page, true);
  const s3 = await state(page);
  check(`${tag} ticking Mushaf view in Options presses 📜`, s3.tick && s3.pressed === "true", JSON.stringify(s3));
  // POSITIVE CONTROL: the āyah-mark detector finds the mark on a page opened through the Options tick.
  check(`${tag} POSITIVE CONTROL: the mark detector finds 57:2 on a page opened by the Options tick`, s3.marked.includes("57:2"), JSON.stringify(s3.marked));
  await page.evaluate(() => { const t = document.getElementById("mushafToggle"); t.checked = false; t.dispatchEvent(new Event("change", { bubbles: true })); });
  await waitMushaf(page, false);
  const s4 = await state(page);
  check(`${tag} unticking it in Options un-presses 📜`, !s4.tick && s4.pressed === "false", JSON.stringify(s4));

  // From an open Meaning flow.
  await page.click("#readMeaningBtn");
  await page.waitForFunction(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  const m0 = await page.evaluate(() => ({ flow: document.querySelectorAll("#pageViewContainer [data-meaning-key]").length, on: document.getElementById("readMeaningBtn").getAttribute("aria-pressed") }));
  const sm = await state(page);
  check(`${tag} POSITIVE CONTROL: the Meaning flow is open and 📜 is still shown`, m0.flow > 0 && m0.on === "true" && sm.shown && sm.tappable, JSON.stringify({ m0, shown: sm.shown }));
  await page.click("#readMushafBtn");
  await waitMushaf(page, true);
  const m1 = await page.evaluate(() => ({ flow: document.querySelectorAll("#pageViewContainer [data-meaning-key]").length, on: document.getElementById("readMeaningBtn").getAttribute("aria-pressed"), stored: localStorage.getItem("qr.readMeaning") }));
  const s5 = await state(page);
  check(`${tag} tapping 📜 from the Meaning flow closes it (📖 un-pressed) and opens the Mushaf at 57:2`, m1.flow === 0 && m1.on === "false" && m1.stored === "0" && s5.tick && s5.pages > 0 && s5.marked.includes("57:2"), JSON.stringify({ m1, tick: s5.tick, pages: s5.pages, marked: s5.marked }));

  // Review (v11.35): the Meaning flow opened OVER the Mushaf makes 📖 read "Mushaf" (back to the Mushaf), so 📜 steps
  // aside rather than be a second "Mushaf" button doing the opposite; closing the flow brings it back, pressed.
  await page.click("#readMeaningBtn");
  await page.waitForFunction(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  const d0 = await state(page), w0 = await page.evaluate(() => document.querySelector("#readMeaningBtn .read-meaning-word").textContent.trim());
  check(`${tag} Meaning over the Mushaf: 📖 reads ${bn ? "মুসহাফ" : "Mushaf"} and 📜 steps aside (one "Mushaf" button, not two)`, !d0.shown && d0.tick && w0 === (bn ? "মুসহাফ" : "Mushaf"), JSON.stringify({ shown: d0.shown, w0 }));
  await page.click("#readMeaningBtn");
  await waitMushaf(page, true);
  const d1 = await state(page);
  check(`${tag} ...closing it brings 📜 back, pressed, tappable`, d1.shown && d1.tappable && d1.pressed === "true", JSON.stringify(d1));

  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

console.log(`\n==== Read bar 📜 Mushaf button (QR J16 = PCF MSA J37)${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
