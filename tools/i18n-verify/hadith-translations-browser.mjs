// Decision 89 (the Owner, 8 Oct 2026: "include the Hadith Eng n Bangla languages"): every Dua card whose book has
// translations, and every library narration with a standard number, carries an English and a Bangla fold, the
// reader's language first, closed, loaded when opened, credited. Expected words written BY HAND from the source:
// Dua 1 = Bukhari 6311 (the bedtime dua); Bukhari passage 6578 = standard 6306, Sayyid al-Istighfar.
// Run from the repository root, serve.js on :8080.
//   --mutate=nofold   library cards get no translation  -> the library checks fail
//   --mutate=bypos    the passage's position is used, not its standard number -> the wording checks fail
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nofold: ["js/hadith-browser.js", "if (std) card.appendChild(standardTranslationFolds(conc.versionUri, async () => std));", ""],
  nosplit: ["js/hadith-shared-ui.js", "splitChapterHeading(tr.edition, stdNo, tr.text)", "({ heading: null, text: tr.text })"],
  bypos: ["js/hadith-browser.js", "const std = conc?.stdByN?.get(h.n);", "const std = conc?.stdByN?.get(h.n) && h.n;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const openFold = (P, sel) => P.evaluate((s) => { const d = document.querySelector(s); d.scrollIntoView({ block: "center" }); d.querySelector("summary").click(); }, sel);
const foldText = (P, sel) => P.waitForFunction((s) => { const d = document.querySelector(s); return d && (d.querySelector("[data-standard-translation-text]") || [...d.querySelectorAll(".hadith-note")].some((p) => !/Loading|লোড/.test(p.textContent))); }, sel, { timeout: 10000 }).then(() => P.evaluate((s) => {
  const d = document.querySelector(s), t = d.querySelector("[data-standard-translation-text]"), c = d.querySelector(".standard-translation-credit");
  return { text: t?.textContent ?? null, lang: t?.lang ?? null, credit: c?.textContent ?? "", href: c?.href ?? "", note: d.querySelector(".hadith-note")?.textContent ?? "" };
}, sel)).catch(() => ({ text: null }));

for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html");
  const fetched = [];
  P.on("request", (r) => { if (r.url().includes("/output/translations/")) fetched.push(r.url().replace(/^.*\/translations\//, "")); });
  await P.click('[data-hadith-tab="dua"]');
  await P.waitForSelector('[data-dua-card="1"]');
  const order = await P.$$eval('[data-dua-card="1"] [data-standard-translation]', (ds) => ds.map((d) => ({ l: d.dataset.standardTranslation, open: d.open, s: d.querySelector("summary").textContent })));
  const first = lang === "bn" ? "bn" : "en";
  check(`${tag} Dua 1 has two translation folds, ${first === "bn" ? "বাংলা" : "English"} first, both closed`, order.length === 2 && order[0].l === first && order.every((o) => !o.open), JSON.stringify(order));
  check(`${tag} nothing is fetched before a fold is opened (I9)`, fetched.length === 0, fetched.join(","));
  await openFold(P, '[data-dua-card="1"] [data-standard-translation="en"]');
  const en = await foldText(P, '[data-dua-card="1"] [data-standard-translation="en"]');
  check(`${tag} English: Bukhari 6311, «Narrated Al-Bara bin \`Azib … When you want to go to bed»`, en.text?.startsWith("Narrated Al-Bara bin `Azib") && en.text.includes("When you want to go to bed") && en.lang === "en", String(en.text).slice(0, 80));
  check(`${tag} ...credited to Muhsin Khan and hadith-api, linked`, en.credit.includes("Muhsin Khan") && en.credit.includes("hadith-api") && en.href.includes("github.com/fawazahmed0/hadith-api"), en.credit);
  check(`${tag} ...and only one chunk was fetched for it (summary + bukhari/en/12)`, fetched.filter((f) => f !== "summary.json").join() === "bukhari/en/12.json", fetched.join(","));
  await openFold(P, '[data-dua-card="1"] [data-standard-translation="bn"]');
  const bn = await foldText(P, '[data-dua-card="1"] [data-standard-translation="bn"]');
  check(`${tag} Bangla: «বারাআ ইবনু ‘আযিব (রাঃ) হতে বর্ণিত …»`, bn.text?.startsWith("বারাআ ইবনু ‘আযিব (রাঃ) হতে বর্ণিত") && bn.lang === "bn", String(bn.text).slice(0, 60));
  check(`${tag} J97: Bukhari 6311 (no chapter heading in the source) shows no heading line`, await P.$('[data-dua-card="1"] [data-standard-translation="bn"] [data-standard-translation-heading]') === null);
  check(`${tag} ...credited to hadith-api, no translator invented`, bn.credit.includes("hadith-api") && !bn.credit.includes("Muhsin"), bn.credit);

  // The library: Bukhari's Kitab ad-Da'awat, passage 6578 = standard 6306.
  await P.click('[data-dua-mode="chapters"]');
  await P.waitForSelector("[data-dua-book]");
  await P.click('[data-dua-book="0256Bukhari.Sahih.JK000110-ara1"]');
  await P.waitForSelector("[data-dua-chapter]");
  await P.click("[data-dua-chapter]");
  // Updated in place 28 Oct 2026 (PCF MSA J106 round 1): the chapter now opens in the three-pane reader on its
  // first sub-chapter, showing one narration; 6578 sits in sub-chapter 2. It is reached with the reader's own "Go to
  // hadith number" box by its standard number, 6306 (on a phone, after the Chapters step button).
  await P.waitForSelector("[data-openiti-goto-input]", { state: "attached" });
  const chaptersStep = await P.$('[data-reader-show="chapters"]');
  if (chaptersStep && await chaptersStep.isVisible()) await chaptersStep.click();
  await P.fill("[data-openiti-goto-input]", "6306");
  await P.click("[data-openiti-goto-btn]");
  await P.waitForSelector('[data-openiti-passage="6578"]');
  const has = await P.$$eval('[data-openiti-passage="6578"] [data-standard-translation]', (ds) => ds.map((d) => d.dataset.standardTranslation));
  check(`${tag} a library narration with a standard number has the two folds (${first} first)`, has.length === 2 && has[0] === first, JSON.stringify(has));
  if (has.length) {
    await openFold(P, '[data-openiti-passage="6578"] [data-standard-translation="en"]');
    const lib = await foldText(P, '[data-openiti-passage="6578"] [data-standard-translation="en"]');
    check(`${tag} ...Bukhari 6306 in English: Shaddad bin Aus, «the most superior way of asking for forgiveness»`, !!lib.text && /Shaddad bin Aus/.test(lib.text) && /forgiveness/i.test(lib.text), String(lib.text).slice(0, 90));
    // PCF MSA J97 (the Owner, answer A): Bukhārī's Bangla 6306 begins with its chapter heading; it is its own small grey line.
    const bnSel = '[data-openiti-passage="6578"] [data-standard-translation="bn"]';
    await openFold(P, bnSel);
    const lb = await foldText(P, bnSel);
    const head = await P.evaluate((s) => {
      const d = document.querySelector(s), h = d.querySelector("[data-standard-translation-heading]"), t = d.querySelector("[data-standard-translation-text]");
      if (!h || !t) return null;
      const hc = getComputedStyle(h), tc = getComputedStyle(t);
      return { text: h.textContent, before: !!(h.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING), hs: parseFloat(hc.fontSize), ts: parseFloat(tc.fontSize), color: hc.color, tcolor: tc.color, w: h.scrollWidth - h.clientWidth };
    }, bnSel);
    check(`${tag} J97: Bangla 6306 starts with its number and narrator «৬৩০৬. শাদ্দাদ ইবনু আউস»`, !!lb.text?.startsWith("৬৩০৬. শাদ্দাদ ইবনু আউস"), String(lb.text).slice(0, 40));
    check(`${tag} J97: ...its chapter heading sits above it as one line «${lang === "bn" ? "অধ্যায়:" : "Chapter:"} وَقَوْلِهِ تَعَالَى …»`, !!head && head.before && head.text.startsWith(lang === "bn" ? "অধ্যায়: " : "Chapter: ") && head.text.includes("وَقَوْلِهِ تَعَالَى") && head.text.includes("(সূরা আলে ‘ইমরান ৩/১৩৫)"), JSON.stringify(head && { t: head.text.slice(0, 40), before: head.before }));
    if (process.argv.includes("--shots")) { fs.mkdirSync("tools/i18n-verify/out", { recursive: true }); await (await P.$(bnSel)).screenshot({ path: `tools/i18n-verify/out/j97-6306-${lang}-${width}.png` }); }
    check(`${tag} J97: ...small and grey (smaller than the hadith, a different colour), inside its fold`, !!head && head.hs < head.ts && head.color !== head.tcolor && head.w <= 1, JSON.stringify(head && { hs: head.hs, ts: head.ts, c: head.color, tc: head.tcolor, w: head.w }));
  }
  const wide = await P.evaluate(() => [...document.querySelectorAll("[data-standard-translation][open]")].filter((d) => d.scrollWidth > d.clientWidth + 1).length);
  check(`${tag} no open fold is wider than its card`, wide === 0, String(wide));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Hadith English and Bangla translations, on Dua cards and library narrations: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
