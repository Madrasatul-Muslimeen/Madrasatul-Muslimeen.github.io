// PCF MSA J122 (the Owner, 11 Nov 2026: "I see many times the form is missing for verbs. Recheck your existing work on Verb Form."):
// the Word Card's Taṣrīf level names the verb's Form (I to XII) for EVERY verb. It used to draw the Form only together with the
// conjugation table, so a root the engine cannot do safely (a weak letter, a hamza, a doubled letter, four letters: 711 of the 1,475
// packaged verbs) showed no Form at all. Now the Form line comes first and the existing "needs a source" line still follows; the
// table itself is never invented.
//   node tools/i18n-verify/word-card-tasrif-form-line-browser.mjs [--mutate=noformline] [--lang=en] [--width=1280]   (repository root, serve.js on :8080)
//   --mutate=noformline   the Form line is not drawn for an unsupported root (the old code)  -> the Form checks FAIL
// Expected Form numbers come from the data file (verb-forms.json) and are written as Roman numerals BY HAND below; the kind of each
// verb (supported or not) comes from the pure engine only to PICK the samples, never to decide what is expected.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${String(detail).slice(0, 300)}`); }
};
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate");
const DEPTH = "app/js/word-card-depth.js";
const MUT = { noformline: [DEPTH, '"word-card-form-only") + need(', '"word-card-form-only").slice(0, 0) + need('] };
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII" };
const O = "tools/quran-data-pull/output/";
const VF = JSON.parse(fs.readFileSync(`${O}verb-forms.json`, "utf8")).values;
const { conjugate } = await import(pathToFileURL(path.resolve("app/js/verb-conjugation.js")).href);
// ---- pick real samples: [kind, lemma, surah, ayah, position] -------------------------------------------------------------------
const want = { "weak-or-hamzated": 3, doubled: 2, "not-triliteral": 1, supported: 2 };
const kindOf = (e) => { const r = conjugate({ root: e.r, form: e.f, pastVowel: e.pv ?? null, presentVowel: e.sv ?? null }); return r.supported ? "supported" : r.reason; };
const need = { ...want }, picks = [], seenForms = { "weak-or-hamzated": new Set() };
for (let n = 1; n <= 114 && Object.values(need).some((v) => v > 0); n++) {
  const s = JSON.parse(fs.readFileSync(`${O}surahs/surah_${String(n).padStart(3, "0")}.json`, "utf8"));
  for (const a of s.ayahs) for (const w of a.words) {
    const m = w.morphology || {}; if (m.pos !== "Verb" || !VF[m.lemma]) continue;
    const e = VF[m.lemma], k = kindOf(e); if (!(need[k] > 0) || picks.some((p) => p.lemma === m.lemma)) continue;
    if (k === "weak-or-hamzated") { if (seenForms[k].has(e.f)) continue; seenForms[k].add(e.f); }
    need[k]--; picks.push({ kind: k, lemma: m.lemma, form: e.f, s: n, a: a.ayah, p: w.position, ar: w.arabic });
  }
}
if (picks.length !== Object.values(want).reduce((x, y) => x + y, 0)) throw new Error(`fixture: found ${picks.length} samples`);
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const WIDTHS = arg("width") ? [Number(arg("width"))] : [390, 1280];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const lang of LANGS) for (const width of WIDTHS) {
    const tag = `[${lang} ${width}]`;
    console.log(`\n=== Taṣrīf Form line ${tag} ===`);
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const [file, a, b] = MUT[MUTATE];
      await ctx.route(`**/${file.replace("app/", "")}*`, async (r) => {
        const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation ${MUTATE}: anchor missing`);
        await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) });
      });
    }
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    try {
      await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
      await page.waitForTimeout(800);
      if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(200); }
      await page.click("#tabReadBtn"); await page.waitForTimeout(800);
      await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
      await page.waitForTimeout(400);
      for (const k of picks) {
        const label = `${k.kind} ${k.s}:${k.a}:${k.p} ${k.ar} (Form ${ROMAN[k.form]})`;
        await page.evaluate(([s, a]) => { const ss = document.getElementById("surahSelect"); if (ss.value !== String(s)) { ss.value = String(s); ss.dispatchEvent(new Event("change", { bubbles: true })); } setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = String(a); as.dispatchEvent(new Event("change", { bubbles: true })); }, 500); }, [k.s, k.a]);
        await page.waitForFunction(([s, a, p]) => !!document.querySelector(`#readView [data-word-occurrence="quran-word-occurrence:v1:${s}:${a}:${p}"]`), [k.s, k.a, k.p], { timeout: 12000 });
        await page.waitForTimeout(500);
        await page.evaluate(([s, a, p]) => document.querySelector(`#readView [data-word-occurrence="quran-word-occurrence:v1:${s}:${a}:${p}"]`).click(), [k.s, k.a, k.p]);
        await page.waitForSelector(".quran-word-card", { timeout: 8000 }); await page.waitForTimeout(600);
        await page.click('#quranWordCardMount [data-word-card-level="tasrif"]'); await page.waitForFunction(() => document.querySelector('#quranWordCardMount [data-word-card-panel="tasrif"] [data-word-card-dline="rule"], #quranWordCardMount [data-word-card-panel="tasrif"] .word-card-need'), null, { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(900);
        const m = await page.evaluate(() => {
          const p = document.querySelector('#quranWordCardMount [data-word-card-panel="tasrif"]');
          const lines = [...p.querySelectorAll('[data-word-card-dline="rule"]')].map((e) => e.textContent.replace(/\s+/g, " ").trim());
          return { lines, formOnly: [...p.querySelectorAll(".word-card-form-only")].map((e) => e.textContent.replace(/\s+/g, " ").trim()), need: p.querySelectorAll(".word-card-need").length, table: !!p.querySelector("[data-word-card-conj-grid], .word-card-conj-wrap"), inView: (() => { const r = p.getBoundingClientRect(); return r.right <= innerWidth + 0.5; })() };
        });
        const bnDigit = String(k.form).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
        const formText = lang === "bn" ? new RegExp(`ফর্ম ${bnDigit}`) : new RegExp(`Form ${ROMAN[k.form]}\\b`);
        const formShown = m.lines.some((t) => formText.test(t));
        check(`${tag} ${label}: Taṣrīf names the Form`, formShown, JSON.stringify(m.lines));
        if (k.kind === "supported") {
          check(`${tag} ${label}: (control) a sound root still gets its table, and no "Form only" line`, m.table && m.formOnly.length === 0, JSON.stringify({ table: m.table, formOnly: m.formOnly }));
        } else {
          check(`${tag} ${label}: the Form comes with the "needs a source" line, and NO table is invented`, m.formOnly.length === 1 && m.need >= 1 && !m.table, JSON.stringify({ formOnly: m.formOnly, need: m.need, table: m.table }));
        }
        check(`${tag} ${label}: the panel stays inside the screen`, m.inView);
        await page.evaluate(() => document.querySelector("[data-word-card-close]")?.click()); await page.waitForTimeout(250);
      }
      check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|quran\.com|favicon/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    } catch (err) { check(`${tag} stopped early: ${String(err.message).split("\n")[0]}`, false); }
    await ctx.close();
  }
} finally { await browser.close(); }
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
