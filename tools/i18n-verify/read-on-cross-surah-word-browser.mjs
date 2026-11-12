// The Owner, 12 Nov 2026 (a phone photo of Read on running from Al-Hijr into An-Nahl): "Below the Surah line, those words do not popup
// to Word Card while above ones do." Read on carries on past the end of a sūrah, so the flow holds words of a sūrah that is not the
// current one; the persistent Word Card draws only for the current sūrah, so a tap on such a word opened nothing.
//
// Run from the repository root with serve.js up:  node tools/i18n-verify/read-on-cross-surah-word-browser.mjs
//   MUT=nocross ...  mutation: a tap opens the card without first making the word's sūrah the current one (the old behaviour) -> the cross-sūrah checks fail
//   MUT=noback ...   mutation: no way back is left after the jump                                                           -> the way-back checks fail
// Proves, at 390 and 1280, English and Bangla, with Tajweed colours OFF (word buttons) and ON (the inline word spans):
//   1. Sūrah 16 is current, Read on shows the end of sūrah 15 above it. A tap on a word of sūrah 15 (its Arabic AND its Word by Word box)
//      opens that word's Word Card, and sūrah 15 is now the current sūrah.
//   2. A "Back to …" pill is on screen; pressing it closes the card and brings sūrah 16, āyah 1 back (the way-back law).
//   3. Control: a word of the CURRENT sūrah still opens its card at once and leaves no jump pill.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import path from "node:path";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (typeof ok === "function") throw new Error(`check "${name}" was handed a function; pass its value`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}
const ROOT = process.cwd(), MUT = process.env.MUT || "", restores = [];
function mutate(rel, re, to) {
  const f = path.join(ROOT, rel), keep = fs.readFileSync(f, "utf8");
  let n = 0;
  const next = keep.replace(re, (...a) => (n++, typeof to === "function" ? to(...a) : to));
  console.log(`MUTATION ${MUT}: ${n} replacement(s) in ${rel}`);
  if (!n) throw new Error("mutation matched nothing");
  fs.writeFileSync(f, next);
  restores.push(() => fs.writeFileSync(f, keep));
}
const restoreAll = () => { while (restores.length) restores.pop()(); };
process.on("exit", restoreAll);
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { restoreAll(); process.exit(1); });
if (MUT === "nocross") mutate("app/quranrevival.html", /if \(!ref \|\| ref\.surah === currentSurahNum\) \{ openWordCardForOccurrenceId\(occurrenceId, triggerEl\); return; \}/g, "{ openWordCardForOccurrenceId(occurrenceId, triggerEl); return; }");
else if (MUT === "noback") mutate("app/quranrevival.html", /      setAppReturn\(t\("Back to \{ref\}", \{ ref: `\$\{surahDisplayName\(was\.surah\)\} \$\{was\.ayah\}` \}\)/g, "      void (t(\"Back to {ref}\", { ref: `${surahDisplayName(was.surah)} ${was.ayah}` })");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ev = (page, f, a) => page.evaluate(f, a);
const wait = (page, ms) => page.waitForTimeout(ms);
const cardId = (page) => ev(page, () => document.querySelector(".quran-word-card")?.dataset.occurrenceId ?? null);
async function setup(ctx, tajweed) {
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await ev(page, () => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await wait(page, 1200);
  if (!(await ev(page, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await wait(page, 200); }
  await page.click("#tabReadBtn"); await wait(page, 900);
  await ev(page, () => { const s = document.getElementById("surahSelect"); s.value = "16"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await wait(page, 1200);
  await ev(page, (tj) => { const t = document.getElementById("tajweedToggle"); if (t.checked !== tj) { t.checked = tj; t.dispatchEvent(new Event("change", { bubbles: true })); } const c = document.getElementById("readOnCheck"); if (c && !c.checked) c.click(); }, tajweed);
  await wait(page, 1800);
  return page;
}
try {
  const passes = process.env.ONE ? [["en", 390, false]] : [["en", 390, false], ["en", 390, true], ["bn", 390, false], ["en", 1280, true]];
  for (const [lang, width, tajweed] of passes) {
    const tag = `[${lang} ${width} tajweed ${tajweed ? "on" : "off"}]`;
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width === 390 ? 844 : 800 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const page = await setup(ctx, tajweed);
    const ids = await ev(page, () => {
      const q = (sel) => document.querySelector(sel)?.dataset.wordOccurrence ?? null;
      return { arabic15: q('#readView .ayah-arabic [data-word-occurrence^="quran-word-occurrence:v1:15:"]'), wbw15: q('#readView button.wbw-word-clickable[data-word-occurrence^="quran-word-occurrence:v1:15:"]'), own16: q('#readView .ayah-arabic [data-word-occurrence^="quran-word-occurrence:v1:16:"]'), cur: document.getElementById("surahSelect").value };
    });
    check(`${tag} setup: sūrah 16 is current and Read on shows words of sūrah 15 above it (Arabic and Word by Word)`, ids.cur === "16" && !!ids.arabic15 && !!ids.wbw15 && !!ids.own16, JSON.stringify(ids));
    // control first: a word of the current sūrah
    await ev(page, (id) => document.querySelector(`#readView [data-word-occurrence="${id}"]`).click(), ids.own16);
    await wait(page, 1500);
    const ctl = { card: await cardId(page), cur: await ev(page, () => document.getElementById("surahSelect").value), pill: await ev(page, () => !!document.querySelector("#ayahCardBackPill:not([hidden]) [data-ayah-card-back]")) };
    check(`${tag} control: a word of the CURRENT sūrah opens its card at once and leaves no jump pill`, ctl.card === ids.own16 && ctl.cur === "16" && !ctl.pill, JSON.stringify(ctl));
    await ev(page, () => document.querySelector("[data-word-card-close]")?.click()); await wait(page, 500);

    for (const [what, id] of [["its Arabic", ids.arabic15], ["its Word by Word box", ids.wbw15]]) {
      await ev(page, (i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`)?.click(), id);
      await wait(page, 2200);
      const got = { card: await cardId(page), cur: await ev(page, () => document.getElementById("surahSelect").value) };
      check(`${tag} MUTATION TARGET (nocross): a tap on a word of sūrah 15 (${what}) opens THAT word's Word Card and makes sūrah 15 current`, got.card === id && got.cur === "15", JSON.stringify({ id, ...got }));
      const pill = await ev(page, () => { const p = document.querySelector("#ayahCardBackPill:not([hidden])"); const b = p?.querySelector("[data-ayah-card-back]"); const r = b?.getBoundingClientRect(); return b ? { text: p.textContent.trim(), w: r.width, h: r.height } : null; });
      check(`${tag} MUTATION TARGET (noback): a way-back pill is on screen ("${pill?.text ?? ""}")`, !!pill && pill.w > 0 && pill.h >= 30, JSON.stringify(pill));
      if (pill) {
        await ev(page, () => document.querySelector("#ayahCardBackPill [data-ayah-card-back]").click());
        await wait(page, 2200);
        const back = { card: await cardId(page), cur: await ev(page, () => document.getElementById("surahSelect").value), ayah: await ev(page, () => document.getElementById("ayahSelect")?.value) };
        check(`${tag} the way back closes the card and brings sūrah 16, āyah 1 back`, back.card === null && back.cur === "16" && back.ayah === "1", JSON.stringify(back));
      }
      if (what === "its Arabic") { await ev(page, () => { const c = document.getElementById("readOnCheck"); if (c && !c.checked) c.click(); }); await wait(page, 1500); }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  restoreAll();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
