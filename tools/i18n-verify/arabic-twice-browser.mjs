// The Owner, 12 Nov 2026 (a photo of the Study Next Scholars tab): "Make the Arabic text bigger by 100% both in Ayah n Word view and in all these tabs."
// Every Arabic in the Study Next tabs, the Āyah card's Word-by-Word chips and the Word Card (but its head word, which was already large) is TWICE its old size.
//
// Run from the repository root with serve.js up:  node tools/i18n-verify/arabic-twice-browser.mjs   (QR_BASE=... for another port)
//   MUT=studynext ... mutation: Study Next's Arabic is back at its old size   -> the Study Next size checks
//   MUT=wordcard ...  mutation: the Word Card's Arabic is back at its old size -> the Word Card size checks
//   MUT=ayahchip ...  mutation: the Āyah card's Word-by-Word chips are back   -> the chip size check
// Measured, rendered, at 320, 390, 768 and 1280: the computed size is at least twice the OLD size (never a guess about px at one width), and nothing runs off the screen.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import path from "node:path";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}
const ROOT = process.cwd(), MUT = process.env.MUT || "", restores = [];
function mutate(rel, re, to) {
  const f = path.join(ROOT, rel), keep = fs.readFileSync(f, "utf8"); let n = 0;
  const next = keep.replace(re, (...a) => (n++, typeof to === "function" ? to(...a) : to));
  console.log(`MUTATION ${MUT}: ${n} replacement(s) in ${rel}`);
  if (!n) throw new Error("mutation matched nothing");
  fs.writeFileSync(f, next); restores.push(() => fs.writeFileSync(f, keep));
}
const restoreAll = () => { while (restores.length) restores.pop()(); };
process.on("exit", restoreAll);
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { restoreAll(); process.exit(1); });
if (MUT === "studynext") { mutate("app/js/read-next-ui.js", /font-size: 2\.4rem; line-height: 1\.8/g, "font-size: 1.2rem; line-height: 1.8"); mutate("app/js/read-next-ui.js", /\.rn-ar-name \{ font-size: 1\.64rem/g, ".rn-ar-name { font-size: 0.82rem"); mutate("app/js/read-next-ui.js", /\.rn-era-quote \{ margin: 4px 0 0; font-size: 2\.1rem/g, ".rn-era-quote { margin: 4px 0 0; font-size: 1.05rem"); }
else if (MUT === "wordcard") mutate("app/quranrevival.html", /\.word-card-dpop-ar \{ font-family: var\(--quran-font\); font-size: 3\.4rem/g, ".word-card-dpop-ar { font-family: var(--quran-font); font-size: 1.7rem");
else if (MUT === "ayahchip") mutate("app/quranrevival.html", /\.ayah-wbw-chip \[lang="ar"\] \{ font-family: var\(--quran-font\); font-size: 2\.4rem/g, '.ayah-wbw-chip [lang="ar"] { font-family: var(--quran-font); font-size: 1.2rem');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const px = (rem) => rem * 16;
// the OLD sizes (rem) before this round, the smallest any media rule gave them; the new size must be at least twice
const WORD_CARD_OLD = { "word-card-dcard-ar": 1.15, "word-card-dpop-ar": 1.7, "word-card-fv-ar": 1.45, "word-card-form-arabic": 1.3, "word-card-occurrence-arabic": 1.2, "word-card-search-res-ar": 1.35, "word-card-fact-ar": 1.05, "word-card-learnnext-ar": 1.15 };
try {
  for (const width of process.env.ONE ? [390] : [320, 390, 768, 1280]) {
    const tag = `[${width}]`;
    // ---- Study Next (the Āyah card's Dictionary, Scholars, Tafsīr, Eras)
    let ctx = await newContext(browser, { viewport: { width, height: 900 } });
    let { page } = await openPage(ctx, "/app/about.html");
    await page.evaluate(async () => {
      const { renderReadNext } = await import("/app/js/read-next-ui.js");
      const host = document.createElement("div"); host.id = "probe"; host.style.cssText = "max-width:100%;padding:8px"; document.body.prepend(host);
      renderReadNext(host, { lemmas: ["شمس"], scholars: "tafsir", tafsir: { ayat: ["2:228"] }, eras: () => ({ ref: "2:228", rows: [{ id: "a28", name: { en: "Sahaba" } }] }) });
    });
    const sz = async (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? parseFloat(getComputedStyle(e).fontSize) : 0; }, sel);
    await page.locator('#probe [data-read-next-tab="scholars"]').click().catch(() => {});
    await page.waitForTimeout(400);
    const nameSize = await sz("#probe .rn-ar-name");
    check(`${tag} MUTATION TARGET (studynext): a scholar's Arabic name in the Scholars tab is twice its old size (26px or more; was 13px)`, nameSize >= 26, String(nameSize));
    const dictSize = await page.evaluate(() => { const i = document.createElement("div"); i.className = "read-next-item"; i.innerHTML = '<p class="rn-ar" lang="ar" dir="rtl">شمس</p>'; document.querySelector("#probe").appendChild(i); return parseFloat(getComputedStyle(i.firstChild).fontSize); });
    check(`${tag} MUTATION TARGET (studynext): the Arabic in the Dictionary tab (and Scholars' and Tafsīr's headings) is twice its old size (38px or more; was 19px)`, dictSize >= 38, String(dictSize));
    const quoteSize = await page.evaluate(() => { const p = document.createElement("p"); p.className = "rn-era-quote"; p.textContent = "قال"; document.querySelector("#probe").appendChild(p); return parseFloat(getComputedStyle(p).fontSize); });
    check(`${tag} MUTATION TARGET (studynext): an Eras source's Arabic quotation is twice its old size (33px or more; was 17px)`, quoteSize >= 33, String(quoteSize));
    const over = await page.evaluate(() => ({ page: document.documentElement.scrollWidth - innerWidth, panel: [...document.querySelectorAll("#probe .read-next-item, #probe .rn-era-quote")].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).length }));
    check(`${tag} Study Next does not run off the screen at the bigger size`, over.page <= 1 && over.panel === 0, JSON.stringify(over));
    await ctx.close();

    // ---- the Āyah card's Word-by-Word chips and the Word Card
    ctx = await newContext(browser, { viewport: { width, height: 900 }, banner: false });
    ({ page } = await openPage(ctx, "/app/quranrevival.html"));
    await page.waitForTimeout(1200);
    const sizes = await page.evaluate((old) => {
      const host = document.createElement("div"); host.className = "quran-word-card"; document.body.appendChild(host);
      const out = {};
      for (const cls of Object.keys(old)) { const e = document.createElement(cls === "word-card-fact-ar" ? "b" : "span"); e.className = cls; e.setAttribute("lang", "ar"); e.textContent = "ك"; if (cls === "word-card-fact-ar") { const f = document.createElement("div"); f.className = "word-card-fact"; f.appendChild(e); host.appendChild(f); } else host.appendChild(e); out[cls] = parseFloat(getComputedStyle(e).fontSize); }
      const chipHost = document.createElement("div"); chipHost.innerHTML = '<button class="ayah-wbw-chip"><span lang="ar">ك</span></button>'; document.body.appendChild(chipHost);
      out.chip = parseFloat(getComputedStyle(chipHost.querySelector("[lang=ar]")).fontSize);
      return out;
    }, WORD_CARD_OLD);
    for (const [cls, old] of Object.entries(WORD_CARD_OLD)) check(`${tag} MUTATION TARGET (wordcard): .${cls} is at least twice its old size (${px(old * 2)}px or more)`, sizes[cls] >= px(old * 2) - 0.5, String(sizes[cls]));
    check(`${tag} MUTATION TARGET (ayahchip): the Āyah card's Word-by-Word Arabic is twice its old size (38.4px or more; was 19.2px)`, sizes.chip >= 38.3, String(sizes.chip));
    await ctx.close();
  }
} finally { await browser.close(); restoreAll(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
