// QR Lead (the Owner, 23 Oct 2026, a Read view in English still showing "সম্পূর্ণ সূরা", "২. আল-বাকারা" and
// "সূরার তালিকা"): "Why Bangla is showing in Eng Lang selection?"
// quranrevival.html is the one page that changes language WITHOUT a reload (applyAppLangChange()). The surah and āyah
// pickers, the range and unit-number pickers, ☰'s word and Home ▾'s sign-in line are written by script, and the Read
// bar's / wheel's pickers are mirrors that were re-copied only when their VALUES changed. So after Bangla -> English
// they kept their Bangla. This check switches in place, both ways, at a computer and a phone, and fails unless every
// one of them is in the new language, with the same surah / āyah still chosen and no reload.
//   node tools/i18n-verify/qr-lang-switch-in-place-browser.mjs [--mutate=values-only|no-refill]   (serve.js :8080)
//   --mutate=values-only   the mirrors compare values only again    -> the Read bar pickers stay in the old language
//   --mutate=no-refill     applyAppLangChange() no longer re-fills the surah / āyah pickers -> they (and their mirrors) do
// Not covered here: the 🧰 Zab button (zab-bar.js, a shared script: sent to the MSA Architect as a change request).
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "values-only": ["\n          || mirror.options[0]?.textContent !== source.options[0]?.textContent;", ";"],
  "no-refill": ["      fillSurahSelect();\n      if (currentSurahData) {\n        const keepAyah", "      if (false) {\n        const keepAyah"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const BN = /[ঀ-৿]/;

for (const [w, h] of [[1300, 900], [390, 844]]) for (const [from, to] of [["bn", "en"], ["en", "bn"]]) {
  const tag = `[${from}→${to} ${w}]`;
  const ctx = await newContext(browser, { appLang: from, viewport: { width: w, height: h } });
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const body = await res.text();
      const n = body.split(a).length - 1;
      if (n < 1) throw new Error(`mutation ${MUTATE}: anchor not found`);
      r.fulfill({ response: res, body: body.split(a).join(b) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(1500);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(800);
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const s = document.getElementById("ayahSelect"); s.value = "40"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1000);
  const read = () => page.evaluate(() => {
    const opt = (id) => { const s = document.getElementById(id); return s ? { v: s.value, t: s.selectedOptions[0]?.textContent ?? "", all: [...s.options].slice(0, 3).map((o) => o.textContent).join(" / ") } : null; };
    return { lang: document.documentElement.lang, surah: opt("surahSelect"), ayah: opt("ayahSelect"), unit: opt("unitTypeSelect"), rSurah: opt("readSurahSelect"), rAyah: opt("readAyahSelect"), rUnit: opt("readUnitTypeSelect"), list: document.querySelector("#readListBtn .read-list-word")?.textContent ?? "", who: document.getElementById("who")?.textContent ?? "" };
  });
  const b0 = await read();
  const inLang = (x, l) => (l === "bn" ? BN.test(x) : !BN.test(x) && /[A-Za-z0-9]/.test(x));
  check(`${tag} POSITIVE CONTROL: the page starts in ${from} (surah "${b0.rSurah?.t}", ☰ "${b0.list}")`, b0.lang === from && inLang(b0.rSurah?.t ?? "", from) && inLang(b0.list, from), JSON.stringify(b0));
  let reloads = 0; page.on("framenavigated", (f) => { if (f === page.mainFrame()) reloads++; });
  await page.evaluate(() => { const d = document.querySelector("details.nav-cat-home"); if (d) d.open = true; });
  await page.selectOption("#navAppLangSelect", to);
  await page.waitForFunction((l) => document.documentElement.lang === l, to, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const a = await read();
  check(`${tag} the switch happened in place (no reload) and the page says ${to}`, reloads === 0 && a.lang === to, JSON.stringify({ reloads, lang: a.lang }));
  for (const [k, name] of [["rUnit", "Read bar: Study Unit"], ["rSurah", "Read bar: Surah"], ["rAyah", "Read bar: Āyah"], ["unit", "Study options: Study Unit"], ["surah", "Study options: Surah"], ["ayah", "Study options: Āyah"]]) {
    check(`${tag} ${name} is in ${to} ("${a[k]?.all}")`, !!a[k] && inLang(a[k].all, to), JSON.stringify(a[k]));
  }
  check(`${tag} the same surah and āyah are still chosen (2, 40), on the Read bar too`, a.surah?.v === "2" && a.ayah?.v === "40" && a.rSurah?.v === "2" && a.rAyah?.v === "40", JSON.stringify({ surah: a.surah?.v, ayah: a.ayah?.v, r: [a.rSurah?.v, a.rAyah?.v] }));
  check(`${tag} ☰ reads in ${to} ("${a.list}")`, inLang(a.list, to), a.list);
  check(`${tag} Home ▾'s sign-in line is in ${to} ("${a.who}")`, inLang(a.who.replace(/\S+@\S+/, ""), to), a.who);
  await ctx.close();
}
await browser.close();
console.log(`\n==== QR language switch in place${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
