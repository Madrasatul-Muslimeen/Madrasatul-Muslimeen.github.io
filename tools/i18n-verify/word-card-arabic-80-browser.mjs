// The Owner, 15 Nov 2026 (offline phone screenshots, word ربحت 2:16:7; PCF MSA J139 ask 2): the Arabic is 20% smaller in two places of the Word Card,
// like "Learn the Next Word": (a) Taṣrīf's "Basic form: فَعَلَ" pill and its "Form I of ر ب ح" line: 0.8 of the Taṣrīf block's OWN Arabic size (its words are 0.9 of the head word; J61 holds those at 90%),
// (b) Depth > Morphology (Ṣarf): Pieces, Form, Tense, Who and Voice: 0.8 of the Word Card's small Arabic. The Form line must stay inside the card at 390 / 360 / 320 / a computer.
// (Corrected after the Architect's review: the first version took 0.8 of the SMALL Arabic for (a) and made the line 1.6x the Taṣrīf block's words.)
//   node tools/i18n-verify/word-card-arabic-80-browser.mjs [--mutate=basicbtn|morph|formline|nowrap]
//   --mutate=basicbtn  the pill's Arabic keeps its old size    -> "the Basic-form pill's Arabic is 0.8" FAILS
//   --mutate=morph     Ṣarf's Arabic keeps its old size         -> "Morphology's Arabic ... 0.8" FAILS
//   --mutate=formline  the "Form I of" line keeps its old size  -> "the Form line's Arabic is 0.8" FAILS
//   --mutate=nowrap    the root's letters may split across lines -> same check FAILS (a root letter alone on a line)
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const F = "app/quranrevival.html";
const MUT = {
  basicbtn: [".quran-word-card .word-card-acc[data-word-card-sec=\"conj\"] .word-card-basic-btn [lang=\"ar\"],\n  .quran-word-card .word-card-basic-row", ".quran-word-card .word-card-acc[data-word-card-sec=\"conj\"] .word-card-basic-btn-X [lang=\"ar\"],\n  .quran-word-card .word-card-basic-row"],
  morph: [".quran-word-card .word-card-morph .word-card-ar { font-size: var(--wc-ar-80); }", ".quran-word-card .word-card-morph-X .word-card-ar { font-size: var(--wc-ar-80); }"],
  nowrap: ["word-card-form-only .word-card-ar { white-space: nowrap; }", "word-card-form-only .word-card-ar { white-space: normal; }"],
  formline: ["  .quran-word-card .word-card-acc[data-word-card-sec=\"conj\"] .word-card-dline[data-word-card-dline=\"rule\"] .word-card-ar,\n  .quran-word-card .word-card-acc[data-word-card-sec=\"conj\"] .word-card-form-only .word-card-ar {", "  .quran-word-card .word-card-never-X .word-card-ar,\n  .quran-word-card .word-card-never-Y .word-card-ar {"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [w, h] of [[390, 844], [360, 740], [320, 640], [1280, 900]]) {
  const tag = `[${w}]`;
  const ctx = await newContext(browser, { banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route(`**/${F}*`, async (r) => { const src = fs.readFileSync(F, "utf8"); if (src.split(a).length !== 2) throw new Error(`mutation anchor missing/duplicated: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html", body: src.replace(a, b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  const setSel = (id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
  await setSel("surahSelect", "2"); await page.waitForTimeout(1500);
  await setSel("ayahSelect", "16"); await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":2:16:7"]')?.click()); // ربحت
  await page.waitForSelector("#quranWordCardMount .quran-word-card", { timeout: 15000 });
  await page.waitForTimeout(600);
  const level = async (name) => { await page.evaluate((n) => document.querySelector(`#quranWordCardMount [data-word-card-level="${n}"]`)?.click(), name); await page.waitForTimeout(1200); };
  // the Taṣrīf block's OWN Arabic size is 0.9 of the head word (--wc-tasrif-ar); Morphology is measured against the Word Card's small Arabic (--wc-small-ar)
  const refOf = (expr) => page.evaluate((e) => { const c = document.querySelector("#quranWordCardMount .quran-word-card"); const p = document.createElement("span"); p.style.cssText = `font-size:${e};position:absolute;visibility:hidden`; p.textContent = "x"; c.appendChild(p); const v = parseFloat(getComputedStyle(p).fontSize); p.remove(); return v; }, expr);
  const ratio = (sel) => page.evaluate(([s, r]) => { const e = document.querySelector(s); return e ? +(parseFloat(getComputedStyle(e).fontSize) / r).toFixed(3) : null; }, [sel]);
  const refPx = await refOf("calc(var(--wc-head-ar) * 0.9)");
  const rt = (sel) => page.evaluate(([s, r]) => { const e = document.querySelector(s); return e ? +(parseFloat(getComputedStyle(e).fontSize) / r).toFixed(3) : null; }, [sel, refPx]);
  // (a) Taṣrīf
  await level("tasrif");
  const basic = await rt('#quranWordCardMount .word-card-basic-btn [lang="ar"]');
  check(`${tag} POSITIVE CONTROL: Taṣrīf shows the Basic-form pill and the Form line (Taṣrīf block size ${refPx}px)`, basic !== null && (await page.evaluate(() => !!document.querySelector("#quranWordCardMount .word-card-form-only, #quranWordCardMount .word-card-dline[data-word-card-dline='rule']"))));
  check(`${tag} the Basic-form pill's Arabic is 0.8 of the Taṣrīf block's own size (${basic})`, basic !== null && Math.abs(basic - 0.8) < 0.03);
  const form = await page.evaluate((r) => {
    const l = document.querySelector("#quranWordCardMount .word-card-form-only") ?? document.querySelector("#quranWordCardMount .word-card-dline[data-word-card-dline='rule']");
    const a = l?.querySelector(".word-card-ar"), c = document.querySelector("#quranWordCardMount .quran-word-card").getBoundingClientRect(), lr = l?.getBoundingClientRect();
    return l ? { ratio: +(parseFloat(getComputedStyle(a).fontSize) / r).toFixed(3), oneLine: a.getClientRects().length === 1 && a.getBoundingClientRect().height < parseFloat(getComputedStyle(a).fontSize) * 2.2, inside: lr.left >= c.left - 1 && lr.right <= c.right + 1, over: l.scrollWidth - l.clientWidth } : null;
  }, refPx);
  check(`${tag} the Form line's Arabic is 0.8 and the line stays inside the card with no sideways overflow (${JSON.stringify(form)})`, !!form && Math.abs(form.ratio - 0.8) < 0.03 && form.oneLine && form.inside && form.over <= 1);
  // (b) Depth > Morphology
  await level("depth");
  await page.evaluate(() => { const s = document.querySelector('[data-word-card-sec="morph"]'); const t = s?.querySelector("[data-word-card-acc-toggle], button, summary"); if (s && !s.querySelector(".word-card-morph")) t?.click(); });
  await page.waitForTimeout(600);
  const smallPx = await refOf("var(--wc-small-ar)");
  const morph = await page.evaluate((r) => [...document.querySelectorAll("#quranWordCardMount .word-card-morph .word-card-ar")].map((e) => +(parseFloat(getComputedStyle(e).fontSize) / r).toFixed(3)), smallPx);
  check(`${tag} POSITIVE CONTROL: Depth > Morphology shows its Arabic (${morph.length} pieces)`, morph.length >= 3);
  check(`${tag} Morphology's Arabic (Pieces, Form, Tense, Who, Voice) is 0.8 of the small Arabic (${morph.join("/")})`, morph.length >= 3 && morph.every((x) => Math.abs(x - 0.8) < 0.03));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Word Card Arabic 80%${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
