// PCF MSA J110 / inbox qr46lstripe01 (the Owner ticked A, 11 Nov 2026): the āyah's STATUS stripe in the Reading View's header row.
// Round 1: Approaches (how many Approaches have a stage on the āyah; opens the Āyah card) and Notes (opens the latest Note). A button
// shows only when that status exists. Seeded: Sūrah 57, āyah 1 has a stage on "recite" and a Note; āyah 2 has stages on "recite" and "memorise" and no Note;
// āyah 3 has nothing.
//   node tools/i18n-verify/ayah-stripe-browser.mjs [--mutate=NAME] [--width=390] [--lang=en]     (repository root, serve.js on :8080)
//   --mutate=nostripe   the stripe is never drawn                         -> the chip checks FAIL
//   --mutate=always     the Approaches chip shows even with no stage      -> "no stripe on āyah 3" FAILS
//   --mutate=noopen     tapping the Approaches chip does nothing          -> "opens the Āyah card" FAILS
// Expected values are written BY HAND; sizes are measured on the rendered page.
import { chromium, newContext, openPage, goReadOn } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate");
const MUT = {
  nostripe: ["return chips.length ? `<span class=\"ayah-stripe\"", "return false ? `<span class=\"ayah-stripe\""],
  always: ["if (started > 0) chips.push(chip(\"appr\"", "if (true) chips.push(chip(\"appr\""],
  noopen: ["else openAyahActionSheet(ayahStripeBtn.dataset.ayahStripeKey);", "else void 0;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const WIDTHS = arg("width") ? [Number(arg("width"))] : [320, 390, 768, 1280];
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const SEED = `
DATA.records.push({ _id: TENANT_ID + "__p1__surah_57", tenantId: TENANT_ID, personId: "p1", chunkKey: "surah_57", entries: {
  "ayah:57:1::recite": { claimedStatus: "practising" },
  "ayah:57:2::recite": { claimedStatus: "practising" }, "ayah:57:2::memorise": { claimedStatus: "practising" } } });
DATA.ayahNotes[0].notes = { "ayah:57:1": { html: "<p>My reflection</p>" } };`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const lang of LANGS) for (const width of WIDTHS) {
    const tag = `[${lang} ${width}]`;
    console.log(`\n=== Ayah stripe ${tag} ===`);
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
      await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "57"; s.dispatchEvent(new Event("change", { bubbles: true })); });
      await page.waitForTimeout(1500);
      await goReadOn(page);
      await page.waitForFunction(() => !!document.querySelector('.meaning-ayah[data-meaning-key="57:3"]'), null, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(800);
      const head = (k) => page.evaluate((key) => {
        const h = document.querySelector(`.meaning-ayah[data-meaning-key="${key}"] .meaning-ayah-head`);
        if (!h) return null;
        const r = (e) => e && e.getBoundingClientRect();
        const chips = [...h.querySelectorAll(".ayah-stripe-chip")].map((c) => ({ kind: c.dataset.ayahStripe, text: c.textContent.trim(), label: c.getAttribute("aria-label"), box: r(c).height, paint: r(c.querySelector("i")).height }));
        const ref = r(h.querySelector(".meaning-ayah-ref")), stripe = r(h.querySelector(".ayah-stripe")), badge = r(h.querySelector(".ayah-num-badge")), hr = r(h);
        return { chips, hasStripe: !!stripe, overlapRef: stripe ? stripe.left < ref.right - 0.5 : false, overlapBadge: stripe && badge ? stripe.right > badge.left + 0.5 : false, inside: stripe ? stripe.left >= hr.left && stripe.right <= hr.right + 0.5 : true, scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      }, k);
      const a1 = await head("57:1"), a2 = await head("57:2"), a3 = await head("57:3");
      check(`${tag} POSITIVE CONTROL the three seeded āyāt are in the Reading View`, !!a1 && !!a2 && !!a3);
      check(`${tag} āyah 1 shows an Approaches chip and a Notes chip`, a1?.chips.map((c) => c.kind).join() === "appr,note", JSON.stringify(a1?.chips));
      check(`${tag} the Approaches chip reads 1 of the tenant's Approaches (a "1/N" figure)`, /^1\/\d+$|^[০-৯]\/[০-৯]+$|^১\/[০-৯]+$/.test(a1?.chips[0]?.text ?? ""), a1?.chips[0]?.text);
      check(`${tag} āyah 2 shows the Approaches chip with 2 and no Notes chip`, a2?.chips.length === 1 && /^(2|২)\//.test(a2.chips[0].text), JSON.stringify(a2?.chips));
      check(`${tag} āyah 3 has no stripe at all`, a3?.hasStripe === false, JSON.stringify(a3?.chips));
      const sizes = a1?.chips ?? [];
      check(`${tag} each chip is 22px to see and 40px or more to press`, sizes.length > 0 && sizes.every((c) => Math.abs(c.paint - 22) < 1 && c.box >= 40), JSON.stringify(sizes));
      check(`${tag} the stripe sits between the name and the number: no overlap, inside the row, no sideways scroll`, a1 && !a1.overlapRef && !a1.overlapBadge && a1.inside && a1.scroll <= 0, JSON.stringify({ r: a1?.overlapRef, b: a1?.overlapBadge, i: a1?.inside, s: a1?.scroll }));
      if (lang === "bn") check(`${tag} the chips' names are in Bangla (no Latin letters)`, sizes.length > 0 && sizes.every((c) => !/[A-Za-z]/.test(c.label.replace(/ā|Ā/g, ""))), JSON.stringify(sizes.map((c) => c.label)));
      await page.evaluate(() => document.querySelector('.meaning-ayah[data-meaning-key="57:1"] [data-ayah-stripe="appr"]')?.click());
      await page.waitForTimeout(900);
      check(`${tag} tapping the Approaches chip opens the Āyah card`, await page.evaluate(() => !!document.querySelector("#ayahActionSheetOverlay.open")));
      check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|quran\.com|favicon/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    } catch (err) { check(`${tag} stopped early: ${String(err.message).split("\n")[0]}`, false); }
    await ctx.close();
  }
} finally { await browser.close(); }
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
