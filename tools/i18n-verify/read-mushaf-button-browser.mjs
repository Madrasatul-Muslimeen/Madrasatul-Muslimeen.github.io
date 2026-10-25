// QR J16 = PCF MSA J37 (the Owner chose A, 17 Oct 2026) gave the Read bar a "📜 Mushaf" button beside 📖 Meaning.
// PCF MSA J99 (the Owner ticked B, 25 Oct 2026: "what's the two button with similar functions doing here?") made them
// ONE: 📖 moves on round the three views, Āyah (the plain reading) → Meaning → Mushaf → Āyah, and names (icon, word,
// spoken name) the view it goes to NEXT. Mushaf is still the same switch as Options ▸ "Mushaf view" (#mushafToggle), and
// the button stays in full screen. This suite was the 📜 suite; it is UPDATED IN PLACE for the one button, reason recorded:
// every check that drove 📜 now drives the cycle, and 📜 itself must stay out of sight.
// Expected values written BY HAND. Run from the repository root, serve.js on :8080.
//   --mutate=no-fullscreen   #readMeaningBtn dropped from the bare-state :not() list -> the full-screen checks fail
//   --mutate=skip-mushaf     Meaning → Āyah instead of Mushaf                        -> the second-tap checks fail
//   --mutate=mushaf-stuck    the Mushaf tap leaves the tick on                        -> the third-tap checks fail
//   --mutate=stale-icon      the icon never changes from 📖                           -> the next-view checks fail
//   --mutate=dup-mushaf      📜 is shown again beside 📖                              -> the one-button checks fail
//   --mutate=no-focus        the Meaning flow opens at the page's first āyah         -> the "opened at 57:2" checks fail
//   --mutate=wide-in-meaning the switch keeps its word beside the Meaning switches   -> the Meaning-view width checks fail (768)
//   --width=390 --lang=bn    restrict the matrix
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
  "no-fullscreen": [":not(#readMeaningBtn):not(#readMushafBtn):not(#readBarBookmarkBtn)", ":not(#readMushafBtn):not(#readBarBookmarkBtn)"],
  "skip-mushaf": ['if (view === "meaning" && !mushafToggle.checked) {', "if (false) {"],
  "mushaf-stuck": ['if (view === "mushaf") { mushafToggle.checked = false;', 'if (view === "mushaf") { mushafToggle.checked = true;'],
  "stale-icon": ["readMeaningBtn.querySelector('[aria-hidden=\"true\"]').textContent = icon;", "void icon;"],
  "dup-mushaf": ["hidden = true; // J99", "hidden = false; // J99"], // both places (split/join)
  "wide-in-meaning": ["  @media (max-width: 1023.98px) {\n    #readBar:has(#readMeaningLayersSlot:not([hidden])) #readMeaningBtn { padding: 0; width: 40px; }", "  @media (max-width: 1px) {\n    #readBar:has(#readMeaningLayersSlot:not([hidden])) #readMeaningBtn { padding: 0; width: 40px; }"],
  // (Mutation-checked: dropping only meaningFocusKey changes nothing for an āyah unit, whose āyah is the flow's first
  // un-dimmed one anyway; this one opens the flow at the page's first āyah.)
  "no-focus": ['const focus = meaningFocusKey ?? (pageViewContainer.querySelector(".meaning-ayah:not(.out)")', 'const focus = (pageViewContainer.querySelector(".meaning-ayah")'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const WIDTHS = arg("width") ? [Number(arg("width"))] : [320, 360, 390, 412, 768, 1280];
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const SHOT_DIR = process.env.SHOT_DIR || "/tmp";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
// What the button names: the view it goes to next.
const NEXT = {
  en: { meaning: ["📖", "Meaning", "Show the meaning: translations and word by word"], mushaf: ["📜", "Mushaf", "Mushaf view"], ayah: ["↩", "Āyah", "Back to the reading"], reading: ["↩", "Reading", "Back to the reading"] },
  bn: { meaning: ["📖", "অর্থ", "অর্থ দেখুন: অনুবাদ ও শব্দে শব্দে"], mushaf: ["📜", "মুসহাফ", "মুসহাফ দৃশ্য"], ayah: ["↩", "আয়াত", "পড়ায় ফিরে যান"], reading: ["↩", "পড়া", "পড়ায় ফিরে যান"] },
};

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
  const b = document.getElementById("readMeaningBtn"), r = b.getBoundingClientRect();
  const hit = r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
  const old = document.getElementById("readMushafBtn")?.getBoundingClientRect();
  const pages = [...document.querySelectorAll("#pageViewContainer .hifz-page")].filter((e) => e.offsetParent !== null).length;
  // The āyah mark: on a Mushaf page the chosen āyah's words are the ones NOT dimmed; its end marker names it.
  const marked = [...document.querySelectorAll("#pageViewContainer .hifz-ayah-marker:not(.dim)")].map((e) => e.dataset.ayahMarker);
  const flow = [...document.querySelectorAll("#pageViewContainer [data-meaning-key]")];
  // The first āyah whose top is inside the reading area (#readScroll scrolls; one scrolled above it is not "in view").
  const area = document.getElementById("readScroll").getBoundingClientRect();
  const firstInView = flow.find((e) => { const x = e.getBoundingClientRect(); return x.height > 0 && x.top >= area.top - 2 && x.top < area.bottom; });
  const word = b.querySelector(".read-meaning-word");
  return {
    shown: r.width > 0, w: Math.round(r.width), h: Math.round(r.height), tappable: !!hit && b.contains(hit),
    icon: b.querySelector('[aria-hidden="true"]')?.textContent.trim(), word: word?.textContent.trim(), wordShown: getComputedStyle(word).display !== "none",
    label: b.getAttribute("aria-label") ?? "", pressed: b.getAttribute("aria-pressed"), oldShown: !!old && old.width > 0,
    tick: document.getElementById("mushafToggle").checked, pages, marked, flow: flow.length, flowKey: firstInView?.dataset.meaningKey ?? null,
    stored: localStorage.getItem("qr.readMeaning"), ayah: document.getElementById("ayahSelect")?.value,
  };
});
const rows = (page) => page.evaluate(() => {
  const bar = document.getElementById("readBar"), end = document.getElementById("readBarEnd");
  const tops = [...end.children].filter((e) => e.getBoundingClientRect().width > 0).map((e) => Math.round(e.getBoundingClientRect().top));
  const noBtn = document.createElement("style"); noBtn.textContent = "#readMeaningBtn{display:none!important}"; document.head.append(noBtn);
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
async function waitFlow(page, on) {
  await page.waitForFunction((o) => (document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0) === o, on, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
}
const names = (lang, s, which, width) => {
  const [icon, word, label] = NEXT[lang][which];
  // The word's visibility is checked once, in the plain view (other states fold it to save the line, by older rules).
  return s.icon === icon && s.word === word && s.label === label;
};

for (const lang of LANGS) for (const width of WIDTHS) {
  const tag = `[${lang} ${width}]`;
  const { ctx, page, errors } = await start(lang, width);
  await openAyah(page);

  // The three taps, twice: on the normal bar and in full screen's bare state.
  for (const fs of [false, true]) {
    const t = `${tag}${fs ? " full screen" : ""}`;
    if (fs) for (let i = 0; i < 4 && !(await bare(page)); i++) { await page.click("#hideChromeBtn"); await page.waitForTimeout(300); }
    if (fs) check(`${t} POSITIVE CONTROL: the bare full-screen state is on`, await bare(page));
    const s0 = await state(page);
    check(`${t} Āyah view: one switch, 📖 tappable, ≥ 40px, and no 📜 beside it`, s0.shown && s0.tappable && s0.h >= 40 && !s0.oldShown && !s0.tick && s0.flow === 0, JSON.stringify(s0));
    check(`${t} ...it names the next view, Meaning (${width >= 600 ? "icon and word" : "icon alone below 600px, 40px wide"})`, names(lang, s0, "meaning", width) && (fs || s0.wordShown === (width >= 600)) && (width >= 600 || s0.w === 40), JSON.stringify({ icon: s0.icon, word: s0.word, label: s0.label, w: s0.w, wordShown: s0.wordShown }));
    if (!s0.shown) continue; // counted above; nothing to tap
    const r0 = await rows(page);
    check(`${t} ...#readBarEnd is one row and the switch adds no line to the bar (${r0.withIt} vs ${r0.without}), no sideways overflow`, r0.oneRow && r0.withIt === r0.without && r0.over <= 0, JSON.stringify(r0));

    await page.click("#readMeaningBtn"); await waitFlow(page, true);
    const s1 = await state(page);
    check(`${t} tap 1 → the Meaning flow, opened at 57:2, pressed`, s1.flow > 0 && s1.flowKey === "57:2" && s1.pressed === "true" && !s1.tick, JSON.stringify({ flow: s1.flow, key: s1.flowKey, pressed: s1.pressed, tick: s1.tick }));
    check(`${t} ...it names the next view, Mushaf`, names(lang, s1, "mushaf", width) && !s1.oldShown, JSON.stringify({ icon: s1.icon, word: s1.word, label: s1.label, old: s1.oldShown }));
    // In the Meaning view the English / Bangla / WbW switches sit on the bar and take it to a second line at some widths
    // ON MAIN TOO, with the old 📖 (measured side by side, 25 Oct 2026: 320/360 en, 768 en, 320 bn, the same height before
    // and after). What the switch itself owes there is to take the least room: its icon alone, 40px, below 1024px.
    const r1 = await rows(page);
    check(`${t} ...beside the Meaning switches it is the icon alone, 40px, below 1024px; no sideways overflow`, (width >= 1024 || s1.w === 40) && r1.over <= 0, JSON.stringify({ w: s1.w, over: r1.over }));

    await page.click("#readMeaningBtn"); await waitMushaf(page, true);
    const s2 = await state(page);
    check(`${t} tap 2 → the Mushaf (the Options tick on), the flow closed, 57:2 marked on the page`, s2.tick && s2.pages > 0 && s2.flow === 0 && s2.pressed === "false" && s2.stored === "0" && s2.marked.includes("57:2"), JSON.stringify({ tick: s2.tick, pages: s2.pages, flow: s2.flow, marked: s2.marked, stored: s2.stored }));
    check(`${t} ...it names the next view, Āyah`, names(lang, s2, "ayah", width), JSON.stringify({ icon: s2.icon, word: s2.word, label: s2.label }));
    const r2 = await rows(page);
    check(`${t} ...one row, no line added (${r2.withIt} vs ${r2.without})`, r2.oneRow && r2.withIt === r2.without && r2.over <= 0, JSON.stringify(r2));
    if (width === 390) await page.screenshot({ path: `${SHOT_DIR}/read-switch-${lang}-${width}${fs ? "-fullscreen" : ""}-mushaf.png` });

    await page.click("#readMeaningBtn"); await waitMushaf(page, false);
    const s3 = await state(page);
    check(`${t} tap 3 → back to the Āyah view: tick off, no page, no flow, still āyah 57:2${fs ? ", still full screen" : ""}`, !s3.tick && s3.pages === 0 && s3.flow === 0 && s3.ayah === "2" && (!fs || (await bare(page))) && names(lang, s3, "meaning", width), JSON.stringify(s3));
  }
  await page.click("#hideChromeBtn"); await page.waitForTimeout(300);
  for (let i = 0; i < 4 && (await page.evaluate(() => document.body.classList.contains("immersive-read"))); i++) { await page.click("#hideChromeBtn"); await page.waitForTimeout(300); }

  // In step with the Options tick, both ways. The tick is the Options one; its change event is the user's tick.
  await page.evaluate(() => { const t = document.getElementById("mushafToggle"); t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); });
  await waitMushaf(page, true);
  const o1 = await state(page);
  check(`${tag} ticking Mushaf view in Options → the switch names Āyah next`, o1.tick && names(lang, o1, "ayah", width), JSON.stringify(o1));
  // POSITIVE CONTROL: the āyah-mark detector finds the mark on a page opened through the Options tick.
  check(`${tag} POSITIVE CONTROL: the mark detector finds 57:2 on a page opened by the Options tick`, o1.marked.includes("57:2"), JSON.stringify(o1.marked));
  await page.evaluate(() => { const t = document.getElementById("mushafToggle"); t.checked = false; t.dispatchEvent(new Event("change", { bubbles: true })); });
  await waitMushaf(page, false);
  const o2 = await state(page);
  check(`${tag} unticking it in Options → the switch names Meaning next`, !o2.tick && names(lang, o2, "meaning", width), JSON.stringify(o2));

  // A Whole Surah unit still reaches the Mushaf (the Architect: "a Range, Surah or Page unit with Mushaf on must still be reachable").
  await setSel(page, "unitTypeSelect", "surah"); await page.waitForTimeout(1200);
  await page.click("#readMeaningBtn"); await waitFlow(page, true);
  await page.click("#readMeaningBtn"); await waitMushaf(page, true);
  const u1 = await state(page);
  check(`${tag} Whole Surah: two taps reach the Mushaf, and the switch names Reading next`, u1.tick && u1.pages > 0 && names(lang, u1, "reading", width), JSON.stringify({ tick: u1.tick, pages: u1.pages, icon: u1.icon, word: u1.word, label: u1.label }));

  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

console.log(`\n==== Read bar one switch Āyah → Meaning → Mushaf (PCF MSA J99, was 📜 QR J16)${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
