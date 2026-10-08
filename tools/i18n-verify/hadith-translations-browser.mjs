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
  check(`${tag} ...credited to hadith-api, no translator invented`, bn.credit.includes("hadith-api") && !bn.credit.includes("Muhsin"), bn.credit);

  // The library: Bukhari's Kitab ad-Da'awat, passage 6578 = standard 6306.
  await P.click('[data-dua-mode="chapters"]');
  await P.waitForSelector("[data-dua-book]");
  await P.click('[data-dua-book="0256Bukhari.Sahih.JK000110-ara1"]');
  await P.waitForSelector("[data-dua-chapter]");
  await P.click("[data-dua-chapter]");
  await P.waitForSelector('[data-openiti-passage="6578"]');
  const has = await P.$$eval('[data-openiti-passage="6578"] [data-standard-translation]', (ds) => ds.map((d) => d.dataset.standardTranslation));
  check(`${tag} a library narration with a standard number has the two folds (${first} first)`, has.length === 2 && has[0] === first, JSON.stringify(has));
  if (has.length) {
    await openFold(P, '[data-openiti-passage="6578"] [data-standard-translation="en"]');
    const lib = await foldText(P, '[data-openiti-passage="6578"] [data-standard-translation="en"]');
    check(`${tag} ...Bukhari 6306 in English: Shaddad bin Aus, «the most superior way of asking for forgiveness»`, !!lib.text && /Shaddad bin Aus/.test(lib.text) && /forgiveness/i.test(lib.text), String(lib.text).slice(0, 90));
  }
  const wide = await P.evaluate(() => [...document.querySelectorAll("[data-standard-translation][open]")].filter((d) => d.scrollWidth > d.clientWidth + 1).length);
  check(`${tag} no open fold is wider than its card`, wide === 0, String(wide));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Hadith English and Bangla translations, on Dua cards and library narrations: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
