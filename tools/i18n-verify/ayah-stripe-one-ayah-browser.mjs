// The Owner, 15 Nov 2026 (two phone screenshots of the ONE Ayah view: "this Ayah is attached to QCR / Asma ... it doesn't appear on the Ayah stripe"):
// the status stripe (Approaches, Notes, Words marked, QCR, Asma) never drew in the ONE Ayah view at all, and in the Reading View its QCR and Asma chips drew
// only when something else had already loaded those two small tenant documents. Now the ONE Ayah view's number row carries the stripe, and the first draw
// of a Read view loads the two documents once (after the view is painted, on first use -- never at startup, I9) and fills the chips in place.
// Seeded: sūrah 2 āyah 255 has a marked word, sits in a QCR collection and is cited by a Name; āyah 254 has none of these.
//   node tools/i18n-verify/ayah-stripe-one-ayah-browser.mjs [--mutate=NAME] [--width=390] [--lang=en]   (repository root, serve.js on :8080)
//   --mutate=noload    the two documents are never fetched here      -> the QCR and Asma chips FAIL (the Owner's report)
//   --mutate=nostripe  the stripe is never drawn                     -> every chip check FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate");
const MUT = {
  noload: ["Promise.all([ensureQcrDataLoaded(), ensureAsmaXDataLoaded()]).catch(() => null).finally(", "Promise.resolve().finally("],
  nostripe: ["function ayahStripeHtml(surahNum, ayahNum) {\n      const chips = [];", "function ayahStripeHtml(surahNum, ayahNum) {\n      return \"\";\n      const chips = [];"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const WIDTHS = arg("width") ? [Number(arg("width"))] : [320, 390, 1280];
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const SEED_JS = `
DATA.ayahKeyMarks = [{ _id: TENANT_ID + "__p1__2", tenantId: TENANT_ID, scope: "p1", surah: 2, entries: { "qword:2:255:1": ["done"], "qword:2:255:2": ["practice"], "qword:2:254:1": [] }, schemaVersion: 1, createdAt: "2026-11-10T00:00:00.000Z", updatedAt: "2026-11-10T00:00:00.000Z", createdBy: "test-uid" }];
DATA.ayahCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, collections: [{ id: "c1", title: { en: "Mine" }, status: "active", order: 1, items: ["ayah:2:255"] }] }];
DATA.asmaCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, schemaVersion: 1, nameRefOverrides: { "1": "Quran 2:255" } }];`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const lang of LANGS) for (const width of WIDTHS) {
    const tag = `[${lang} ${width}]`;
    console.log(`\n=== ONE Ayah view stripe ${tag} ===`);
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 1000 : 844 }, extraSeedJs: SEED_JS });
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
      const show = async (n) => {
        if (!(await page.evaluate(() => document.getElementById("surahSelect").value === "2"))) {
          await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
          await page.waitForFunction(() => /Surah 2|সূরা ২|সূরা/.test(document.getElementById("ayahPosition")?.textContent ?? "") && document.getElementById("ayahSelect").options.length > 200, null, { timeout: 20000 });
        }
        await page.evaluate((a) => { const y = document.getElementById("ayahSelect"); y.value = String(a); y.dispatchEvent(new Event("change", { bubbles: true })); }, n);
        await page.waitForTimeout(2500);
      };
      const chips = () => page.evaluate(() => ({
        kinds: [...document.querySelectorAll("#ayahPanels .ayah-num-row > .ayah-stripe .ayah-stripe-chip")].map((c) => c.dataset.ayahStripe),
        onRow: !!document.querySelector("#ayahPanels .ayah-num-row > .ayah-stripe"),
        readOn: !!document.querySelector("[data-meaning-key]"),
      }));
      await show(255);
      const one = await chips();
      check(`${tag} the ONE Ayah view is on screen (positive control: not the Read on flow)`, !one.readOn);
      check(`${tag} MUTATION TARGET (nostripe): āyah 255's number row carries the stripe`, one.onRow, JSON.stringify(one));
      // The Words-marked chip waits for the surah's own marks (loaded by the Word Card / the marks wheel, not by this round); it is not asserted here.
      check(`${tag} MUTATION TARGET (noload): the QCR chip appears without opening anything else first`, one.kinds.includes("qcr"), JSON.stringify(one));
      check(`${tag} MUTATION TARGET (noload): the Asma chip appears without opening anything else first`, one.kinds.includes("asma"), JSON.stringify(one));
      await show(254);
      const six = await chips();
      check(`${tag} āyah 254 has none of the three (the chips are per āyah, not for every āyah)`, !six.kinds.some((k) => ["wmark", "qcr", "asma"].includes(k)), JSON.stringify(six));
      await show(255);
      const back = await chips();
      check(`${tag} back on āyah 255 the chips are still there`, back.kinds.includes("qcr") && back.kinds.includes("asma"), JSON.stringify(back));
      const hit = await page.evaluate(() => { const c = document.querySelector('#ayahPanels .ayah-stripe-chip.qcr'); if (!c) return null; const r = c.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { h: Math.round(r.height), right: Math.round(r.right), vw: innerWidth, ok: !!e && c.contains(e) }; });
      check(`${tag} the QCR chip is a finger-size target (40px+), on screen and the element at its own centre`, !!hit && hit.h >= 40 && hit.right <= hit.vw + 1 && hit.ok, JSON.stringify(hit));
      check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    } finally { await ctx.close(); }
  }
} finally { await browser.close(); }
console.log(`\n==== ONE Ayah view stripe${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
