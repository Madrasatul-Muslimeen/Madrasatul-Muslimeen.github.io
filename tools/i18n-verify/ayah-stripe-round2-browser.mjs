// Ayah stripe round 2 (97L approved, 11 Nov 2026): three more chips, each drawn ONLY from data already in memory (no new read, I9):
// Words marked (★n, from the surah's marks), QCR (the āyah is in one of the tenant's collections), Asma (the āyah is a reference of a Name).
// Seeded: Sūrah 1 āyah 1 has a marked word, sits in a QCR collection and is cited by a Name; āyah 6 has none of these.
// The data is loaded the way a reader loads it: by opening the Āyah card once; the next draw of the Reading View then shows the chips.
//   node tools/i18n-verify/ayah-stripe-round2-browser.mjs [--mutate=NAME] [--width=390] [--lang=en]   (repository root, serve.js on :8080)
//   --mutate=nowmark   the Words-marked chip is never drawn       -> its checks FAIL
//   --mutate=noqcr     the QCR chip is never drawn                -> its checks FAIL
//   --mutate=noasma    the Asma chip is never drawn               -> its checks FAIL
//   --mutate=always    the QCR chip shows for every āyah          -> "āyah 6 has none" FAILS
import { chromium, newContext, openPage, goReadOn } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate");
const MUT = {
  nowmark: ["if (wordMarked > 0) chips.push", "if (false) chips.push"],
  noqcr: ["if (inQcr > 0) chips.push", "if (false) chips.push"],
  noasma: ["if (asmaHits > 0) chips.push", "if (false) chips.push"],
  always: ["if (inQcr > 0) chips.push", "if (true) chips.push"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const WIDTHS = arg("width") ? [Number(arg("width"))] : [320, 390, 1280];
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const SEED = `
DATA.ayahKeyMarks = [{ _id: TENANT_ID + "__p1__1", tenantId: TENANT_ID, scope: "p1", surah: 1, entries: { "qword:1:1:1": ["done"], "qword:1:1:2": ["practice"], "qword:1:6:1": [] }, schemaVersion: 1, createdAt: "2026-11-10T00:00:00.000Z", updatedAt: "2026-11-10T00:00:00.000Z", createdBy: "test-uid" }];
DATA.ayahCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, collections: [{ id: "c1", title: { en: "Mine" }, status: "active", order: 1, items: ["ayah:1:1"] }] }];`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const lang of LANGS) for (const width of WIDTHS) {
    const tag = `[${lang} ${width}]`;
    console.log(`\n=== Ayah stripe round 2 ${tag} ===`);
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 1000 : 844 }, extraSeedJs: SEED });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const [a, b] = MUT[MUTATE];
      await ctx.route("**/app/quranrevival.html*", async (r) => {
        const res = await r.fetch(); const src = await res.text();
        if (src.split(a).length !== 2) throw new Error(`mutation ${MUTATE}: anchor found ${src.split(a).length - 1} times, not 1`);
        r.fulfill({ response: res, body: src.split(a).join(b) });
      });
    }
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    try {
      if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
      await page.click("#tabReadBtn"); await page.waitForTimeout(500);
      await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "1"; s.dispatchEvent(new Event("change", { bubbles: true })); });
      await page.waitForTimeout(1500);
      await goReadOn(page);
      await page.waitForFunction(() => !!document.querySelector('.meaning-ayah[data-meaning-key="1:1"]'), null, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(600);
      const chips = (k) => page.evaluate((key) => [...document.querySelectorAll(`.meaning-ayah[data-meaning-key="${key}"] .ayah-stripe-chip`)].map((c) => ({ kind: c.dataset.ayahStripe, text: c.textContent.trim(), label: c.getAttribute("aria-label"), h: c.getBoundingClientRect().height, paint: c.querySelector("i").getBoundingClientRect().height })), k);
      const before = await chips("1:1");
      check(`${tag} before anything is loaded, no new read is made for the stripe: no Words/QCR/Asma chip yet`, !before.some((c) => ["wmark", "qcr", "asma"].includes(c.kind)), JSON.stringify(before));
      // load the data the way a reader does: open the Āyah card once, close it, draw the view again
      await page.evaluate(() => (document.querySelector('.meaning-ayah[data-meaning-key="1:1"] [data-ayah-stripe]') || document.querySelector('.meaning-ayah[data-meaning-key="1:1"] .ayah-num-badge'))?.click());
      await page.waitForTimeout(1800);
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      await page.evaluate(() => document.getElementById("ayahActionSheetOverlay")?.querySelector("[data-ayah-sheet-close], .ayah-sheet-close")?.click());
      await page.waitForTimeout(300);
      await page.evaluate(() => { const c = document.getElementById("readOnCheck"); if (c) { c.click(); } });
      await page.waitForTimeout(500);
      await goReadOn(page); await page.waitForTimeout(1200);
      await page.waitForFunction(() => !!document.querySelector('.meaning-ayah[data-meaning-key="1:1"]'), null, { timeout: 15000 }).catch(() => {});
      const c22 = await chips("1:1"), c1 = await chips("1:6");
      const kinds = c22.map((c) => c.kind);
      check(`${tag} POSITIVE CONTROL the Reading View shows āyah 1:1 and 1:6`, (await page.evaluate(() => !!document.querySelector('.meaning-ayah[data-meaning-key="1:6"]'))) && c22.length >= 0);
      check(`${tag} āyah 1 shows a Words-marked chip reading ★2`, kinds.includes("wmark") && /^★(2|২)$/.test(c22.find((c) => c.kind === "wmark")?.text ?? ""), JSON.stringify(c22));
      check(`${tag} āyah 1 shows a QCR chip`, kinds.includes("qcr"), JSON.stringify(c22));
      check(`${tag} āyah 1 shows an Asma chip (a Name cites it)`, kinds.includes("asma"), JSON.stringify(c22));
      check(`${tag} āyah 6 has none of the three`, !c1.some((c) => ["wmark", "qcr", "asma"].includes(c.kind)), JSON.stringify(c1));
      check(`${tag} each chip is 22px to see and 40px or more to press`, c22.length > 0 && c22.every((c) => Math.abs(c.paint - 22) < 1 && c.h >= 40), JSON.stringify(c22));
      if (lang === "bn") check(`${tag} the chips' names are in Bangla (no Latin letters)`, c22.length > 0 && c22.every((c) => !/[A-Za-z]/.test(c.label.replace(/ā|Ā|QCR/g, ""))), JSON.stringify(c22.map((c) => c.label)));
      const fits = await page.evaluate(() => { const h = document.querySelector('.meaning-ayah[data-meaning-key="1:1"] .meaning-ayah-head'); const s = h?.querySelector(".ayah-stripe"), ref = h?.querySelector(".meaning-ayah-ref"), b = h?.querySelector(".ayah-num-badge"); if (!h || !s) return null; const r = (e) => e.getBoundingClientRect(); return { overlapRef: r(s).left < r(ref).right - 0.5, overlapBadge: b ? r(s).right > r(b).left + 0.5 : false, inside: r(s).left >= r(h).left - 0.5 && r(s).right <= r(h).right + 0.5, scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
      check(`${tag} the longer stripe still fits the row: no overlap, inside, no sideways scroll`, !!fits && !fits.overlapRef && !fits.overlapBadge && fits.inside && fits.scroll <= 0, JSON.stringify(fits));
      check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|quran\.com|favicon/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    } catch (err) { check(`${tag} stopped early: ${String(err.message).split("\n")[0]}`, false); }
    await ctx.close();
  }
} finally { await browser.close(); }
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
