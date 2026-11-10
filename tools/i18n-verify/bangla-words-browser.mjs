// PCF MSA J119 -- the Word Card's "Also in Bangla" block, in the real page. Route: Read, 2:14:8 (خَلَوْا), its Word Card.
//   node tools/i18n-verify/bangla-words-browser.mjs [--mutate=nosave|nocount|smallswitch]      (serve.js on :8080, or QR_BASE)
// Fails unless: the block is in the Word Card; the blue button marks the word (and the tag shows); the mark survives a reload
// (device storage); the list shows the word with its own switch; the heading-row switch turns the whole list off and the
// button then marks nothing; "Mine" is a separate list; the count line says how many words and what share; the card still
// fits the screen (no sideways overflow) at 390 and 1280 in English and Bangla; Learn next treats a marked word as known.
//   --mutate=nosave  marks are not written to storage          -> the reload check FAILS
//   --mutate=smallswitch the on/off switches are 26px tall again -> the touch-target check FAILS
//   --mutate=keepon  the switch keeps its state on a new word -> "OFF for the next word" FAILS
//   --mutate=resetsame the switch resets on every redraw  -> "a redraw of the same word keeps it" FAILS
//   --mutate=savesw  the card switch writes the saved whole-list setting (Wheel would lose Bangla) -> "saved setting untouched" FAILS
//   --mutate=nocount the count line is not drawn               -> the count check FAILS
//   --mutate=nosaved the saved whole-list switch (J134 follow-up) is not drawn -> its present/off/on checks FAIL
//   --mutate=savedwrong the saved switch writes the opposite of what was asked -> "turns the saved setting off" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nosave: ["try { storage.setItem(BANGLA_STORAGE_KEY, JSON.stringify(normaliseBanglaState(state))); return true; }", "try { return true; }", "app/js/bangla-words.js"],
  smallswitch: [".bnw-sw{width:52px;height:40px;", ".bnw-sw{width:52px;height:26px;", "app/js/bangla-words-ui.js"],
  // J134 (9 Nov 2026): the switch is OFF for every new word.
  keepon: ["      banglaSwitchWordId = id; banglaCardOn = false;", "      banglaSwitchWordId = id;", "app/quranrevival.html"],
  resetsame: ["      if (id === banglaSwitchWordId) return;\n", "", "app/quranrevival.html"],
  savesw: ["onOnOff: (on) => { banglaCardOn = on; if (quranWordCardState?.open) renderPersistentWordCard(); },", "onOnOff: (on) => { banglaCardOn = on; banglaChanged({ ...banglaState, on }); },", "app/quranrevival.html"],
  nosaved: ['${listOn === null ? "" :', '${true ? "" :', "app/js/bangla-words-ui.js"],
  savedwrong: ["onSaved: (on) => banglaChanged({ ...banglaState, on }),", "onSaved: (on) => banglaChanged({ ...banglaState, on: !on }),", "app/quranrevival.html"],
  nocount: ["${count ? `<div class=\"bnw-count\" data-bangla-count>${count}</div>` : \"\"}", "", "app/js/bangla-words-ui.js"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);

async function openCard(ctx) {
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", "2"); await page.waitForTimeout(1200);
  await setSel(page, "ayahSelect", "14"); await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":2:14:8"]')?.click());
  await page.waitForFunction(() => !!document.querySelector("#quranWordCardMount [data-bangla-block]"), null, { timeout: 15000 }).catch(() => {});
  // UPDATED IN PLACE (J125, 9 Nov 2026): the Bangla block now lives in the card's ☰ menu, shut until it is opened; every check below opens it first.
  await page.evaluate(() => { const p = document.querySelector("#quranWordCardMount [data-word-card-menu-panel]"); if (p?.hidden) document.querySelector("#quranWordCardMount [data-word-card-menu-toggle]")?.click(); }); await page.waitForTimeout(300);
  return page;
}
const tap = (loc) => loc.click({ timeout: 3000 }).catch(() => {}); // a mutated page may leave a control disabled: the CHECK must fail, not the run
const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("mm_bangla_words.v1") || "null") ?? { admin: [], on: null, list: null, mine: [] }); // never null: a mutation that stops saving must FAIL a check, not crash the run

for (const [w, h, lang] of [[1280, 900, "en"], [390, 844, "en"], [390, 844, "bn"]]) {
  const tag = `[${lang} ${w}]`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [from, to, file] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => {
      const res = await r.fetch(); const body = await res.text();
      if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
      r.fulfill({ response: res, body: body.replace(from, to) });
    });
  }
  const page = await openCard(ctx);
  const has = await page.evaluate(() => !!document.querySelector("#quranWordCardMount [data-bangla-block] [data-bangla-word]"));
  check(`${tag} the Bangla block is in the Word Card`, has);
  if (!has) { await ctx.close(); continue; }
  const btn = () => page.locator("#quranWordCardMount [data-bangla-block] .bnw-mark");
  const sw = () => page.locator("#quranWordCardMount [data-bangla-onoff]");
  // UPDATED IN PLACE (J134, 9 Nov 2026): the whole-list switch starts OFF (the mark button is disabled until it is switched ON).
  check(`${tag} the switch starts OFF and the mark button waits for it`, (await sw().getAttribute("aria-pressed")) === "false" && (await btn().isDisabled()));
  await tap(sw()); await page.waitForTimeout(300);
  const dis = await btn().isDisabled();
  check(`${tag} (positive control) with the switch ON the signed-in owner can mark`, !dis);
  const lemma = await btn().getAttribute("data-bangla-word");
  await tap(btn()); await page.waitForTimeout(400);
  check(`${tag} the button is pressed after a tap`, (await btn().getAttribute("aria-pressed")) === "true");
  check(`${tag} the tag shows`, await page.evaluate(() => !!document.querySelector("#quranWordCardMount [data-bangla-tag]")));
  const st = await state(page);
  check(`${tag} the mark is stored on the device`, !!st && st.admin.includes(lemma), JSON.stringify(st));
  check(`${tag} the count line says how many words`, await page.evaluate(() => /\d/.test(document.querySelector("#quranWordCardMount [data-bangla-count]")?.textContent ?? "")));
  // the list and its switches
  await page.evaluate(() => { document.querySelector("#quranWordCardMount [data-bangla-details]").open = true; });
  check(`${tag} the list shows the word with a switch`, await page.evaluate((l) => !!document.querySelector(`#quranWordCardMount .bnw-body [data-bangla-word="${l}"]`), lemma));
  // every pressable box in the block is at least 40px tall (the standing touch-target lesson); the two kinds of switch are named
  const boxes = await page.evaluate(() => [...document.querySelectorAll("#quranWordCardMount [data-bangla-block] button")].filter((b) => b.getBoundingClientRect().width > 0).map((b) => [b.className, Math.round(b.getBoundingClientRect().height)]));
  check(`${tag} (positive control) the block shows its switches`, boxes.filter(([c]) => c === "bnw-sw").length >= 2, JSON.stringify(boxes));
  check(`${tag} every button in the block, the on/off switches included, is at least 40px tall`, boxes.every(([, h]) => h >= 40), JSON.stringify(boxes.filter(([, h]) => h < 40)));
  // the whole-list switch
  check(`${tag} the switch is the CARD's, in memory only: J119's saved whole-list setting is untouched (still on) while the card switch is ON`, (await state(page)).on !== false && (await sw().getAttribute("aria-pressed")) === "true");
  await tap(sw()); await page.waitForTimeout(300);
  check(`${tag} the heading switch turns the whole list off`, (await btn().getAttribute("aria-pressed")) === "false" && (await btn().isDisabled()));
  check(`${tag} turning it off keeps the words`, (await state(page)).admin.includes(lemma) && (await state(page)).on !== false); // J134: the card switch no longer writes the saved setting
  await tap(sw()); await page.waitForTimeout(300);
  check(`${tag} turning it on brings the word back`, (await btn().getAttribute("aria-pressed")) === "true");
  // Mine is its own list
  await tap(page.locator('#quranWordCardMount [data-bangla-list="mine"]')); await page.waitForTimeout(300);
  check(`${tag} "Mine" starts empty and separate`, (await btn().getAttribute("aria-pressed")) === "false" && (await state(page)).mine.length === 0);
  await tap(page.locator('#quranWordCardMount [data-bangla-list="admin"]')); await page.waitForTimeout(300);
  // fit
  const fit = await page.evaluate(() => { const c = document.querySelector("#quranWordCardMount .bnw"); const m = document.querySelector("#quranWordCardMount"); return c.scrollWidth <= c.clientWidth + 1 && c.getBoundingClientRect().right <= m.getBoundingClientRect().right + 1 && document.documentElement.scrollWidth <= innerWidth + 1; });
  check(`${tag} the block fits the screen`, fit);
  // a redraw of the SAME word keeps the switch; the NEXT word starts OFF again
  await page.evaluate(() => document.querySelector('#quranWordCardMount [data-word-card-level="intermediate"]')?.click()); await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('#quranWordCardMount [data-word-card-level="wbw"]')?.click()); await page.waitForTimeout(600);
  await page.evaluate(() => { const p = document.querySelector("#quranWordCardMount [data-word-card-menu-panel]"); if (p?.hidden) document.querySelector("#quranWordCardMount [data-word-card-menu-toggle]")?.click(); }); await page.waitForTimeout(300);
  check(`${tag} a redraw of the same word keeps it ON`, (await sw().getAttribute("aria-pressed")) === "true");
  await page.evaluate(() => document.querySelector('#quranWordCardMount [data-word-card-move="next"]')?.click()); await page.waitForTimeout(900);
  await page.evaluate(() => { const p = document.querySelector("#quranWordCardMount [data-word-card-menu-panel]"); if (p?.hidden) document.querySelector("#quranWordCardMount [data-word-card-menu-toggle]")?.click(); }); await page.waitForTimeout(300);
  check(`${tag} the next word starts with the switch OFF`, (await sw().getAttribute("aria-pressed")) === "false");
  await page.evaluate(() => document.querySelector('#quranWordCardMount [data-word-card-move="prev"]')?.click()); await page.waitForTimeout(900);
  await page.evaluate(() => { const p = document.querySelector("#quranWordCardMount [data-word-card-menu-panel]"); if (p?.hidden) document.querySelector("#quranWordCardMount [data-word-card-menu-toggle]")?.click(); }); await page.waitForTimeout(300);
  check(`${tag} (positive control) back on the marked word its mark is still stored (switch OFF hides it, ON shows it)`, (await state(page)).admin.includes(lemma));
  // reload keeps the mark
  await page.reload(); await page.waitForTimeout(800);
  const page2 = await openCard(ctx);
  await tap(page2.locator("#quranWordCardMount [data-bangla-onoff]")); await page2.waitForTimeout(300);
  check(`${tag} the mark is still there after a reload (once the switch is ON)`, (await page2.locator("#quranWordCardMount [data-bangla-block] .bnw-mark").getAttribute("aria-pressed")) === "true");
  // J134 follow-up (the MSA Architect 93L, A): the SAVED whole-list setting (banglaState.on, no new key) has its own switch in the Bangla list's panel,
  // so a reader who saved it OFF before v14.05 is never stuck. It is independent of the card's own switch above.
  const ss = () => page2.locator("#quranWordCardMount [data-bangla-saved-onoff]");
  const cardSw = () => page2.locator("#quranWordCardMount [data-bangla-onoff]");
  const savedPresent = (await ss().count()) === 1;
  check(`${tag} the Bangla list panel has a saved whole-list switch, ON by default`, savedPresent && (await ss().getAttribute("aria-pressed")) === "true");
  const sbox = savedPresent ? await ss().boundingBox() : null;
  check(`${tag} the saved switch is a finger-size control inside the screen`, !!sbox && sbox.height >= 40 && sbox.x >= 0 && sbox.x + sbox.width <= w + 1, JSON.stringify(sbox));
  const cardBefore = await cardSw().getAttribute("aria-pressed");
  await tap(ss()); await page2.waitForTimeout(300);
  check(`${tag} tapping it turns the saved setting off, on the existing key (no new key)`, (await state(page2)).on === false && (await ss().getAttribute("aria-pressed")) === "false" && (await page2.evaluate(() => Object.keys(localStorage).filter((k) => /bangla/i.test(k)).join(",") === "mm_bangla_words.v1")));
  check(`${tag} the card's own switch is untouched by it`, (await cardSw().getAttribute("aria-pressed")) === cardBefore);
  await page2.reload(); await page2.waitForTimeout(800);
  const page3 = await openCard(ctx);
  const ss3 = page3.locator("#quranWordCardMount [data-bangla-saved-onoff]");
  check(`${tag} (positive control) the saved OFF survives a reload and the switch shows it OFF`, (await state(page3)).on === false && (await ss3.getAttribute("aria-pressed")) === "false");
  await tap(ss3); await page3.waitForTimeout(300);
  check(`${tag} the way back: tapping it again turns the saved setting on`, (await state(page3)).on === true && (await ss3.getAttribute("aria-pressed")) === "true");
  if (lang === "bn") check(`${tag} the saved switch's words are Bangla`, await page3.evaluate(() => !/[A-Za-z]{4,}/.test(document.querySelector("#quranWordCardMount [data-bangla-saved-row]")?.textContent ?? "x")));
  await ctx.close();
}
await browser.close();
console.log(`bangla-words-browser${MUTATE ? " --mutate=" + MUTATE : ""}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
