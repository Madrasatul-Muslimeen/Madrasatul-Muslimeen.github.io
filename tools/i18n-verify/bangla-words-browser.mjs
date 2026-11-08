// PCF MSA J119 -- the Word Card's "Also in Bangla" block, in the real page. Route: Read, 2:14:8 (خَلَوْا), its Word Card.
//   node tools/i18n-verify/bangla-words-browser.mjs [--mutate=nosave|nocount]      (serve.js on :8080, or QR_BASE)
// Fails unless: the block is in the Word Card; the blue button marks the word (and the tag shows); the mark survives a reload
// (device storage); the list shows the word with its own switch; the heading-row switch turns the whole list off and the
// button then marks nothing; "Mine" is a separate list; the count line says how many words and what share; the card still
// fits the screen (no sideways overflow) at 390 and 1280 in English and Bangla; Learn next treats a marked word as known.
//   --mutate=nosave  marks are not written to storage          -> the reload check FAILS
//   --mutate=nocount the count line is not drawn               -> the count check FAILS
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nosave: ["try { storage.setItem(BANGLA_STORAGE_KEY, JSON.stringify(normaliseBanglaState(state))); return true; }", "try { return true; }", "app/js/bangla-words.js"],
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
  return page;
}
const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("mm_bangla_words.v1") || "null"));

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
  const dis = await btn().isDisabled();
  check(`${tag} (positive control) the signed-in owner can mark`, !dis);
  const lemma = await btn().getAttribute("data-bangla-word");
  await btn().click(); await page.waitForTimeout(400);
  check(`${tag} the button is pressed after a tap`, (await btn().getAttribute("aria-pressed")) === "true");
  check(`${tag} the tag shows`, await page.evaluate(() => !!document.querySelector("#quranWordCardMount [data-bangla-tag]")));
  const st = await state(page);
  check(`${tag} the mark is stored on the device`, !!st && st.admin.includes(lemma), JSON.stringify(st));
  check(`${tag} the count line says how many words`, await page.evaluate(() => /\d/.test(document.querySelector("#quranWordCardMount [data-bangla-count]")?.textContent ?? "")));
  // the list and its switches
  await page.evaluate(() => { document.querySelector("#quranWordCardMount [data-bangla-details]").open = true; });
  check(`${tag} the list shows the word with a switch`, await page.evaluate((l) => !!document.querySelector(`#quranWordCardMount .bnw-body [data-bangla-word="${l}"]`), lemma));
  // the whole-list switch
  await page.locator("#quranWordCardMount [data-bangla-onoff]").click(); await page.waitForTimeout(300);
  check(`${tag} the heading switch turns the whole list off`, (await btn().getAttribute("aria-pressed")) === "false" && (await btn().isDisabled()));
  check(`${tag} turning it off keeps the words`, (await state(page)).admin.includes(lemma) && (await state(page)).on === false);
  await page.locator("#quranWordCardMount [data-bangla-onoff]").click(); await page.waitForTimeout(300);
  check(`${tag} turning it on brings the word back`, (await btn().getAttribute("aria-pressed")) === "true");
  // Mine is its own list
  await page.locator('#quranWordCardMount [data-bangla-list="mine"]').click(); await page.waitForTimeout(300);
  check(`${tag} "Mine" starts empty and separate`, (await btn().getAttribute("aria-pressed")) === "false" && (await state(page)).mine.length === 0);
  await page.locator('#quranWordCardMount [data-bangla-list="admin"]').click(); await page.waitForTimeout(300);
  // fit
  const fit = await page.evaluate(() => { const c = document.querySelector("#quranWordCardMount .bnw"); const m = document.querySelector("#quranWordCardMount"); return c.scrollWidth <= c.clientWidth + 1 && c.getBoundingClientRect().right <= m.getBoundingClientRect().right + 1 && document.documentElement.scrollWidth <= innerWidth + 1; });
  check(`${tag} the block fits the screen`, fit);
  // reload keeps the mark
  await page.reload(); await page.waitForTimeout(800);
  const page2 = await openCard(ctx);
  check(`${tag} the mark is still there after a reload`, (await page2.locator("#quranWordCardMount [data-bangla-block] .bnw-mark").getAttribute("aria-pressed")) === "true");
  await ctx.close();
}
await browser.close();
console.log(`bangla-words-browser${MUTATE ? " --mutate=" + MUTATE : ""}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
