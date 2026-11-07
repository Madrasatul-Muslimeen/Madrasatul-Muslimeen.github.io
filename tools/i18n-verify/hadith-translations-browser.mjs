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
const GOD = " O God, forgive us.";
const SRC_6311 = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/translations/bukhari/en/12.json", "utf8"))["6311"];
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nofold: ["js/hadith-browser.js", "if (std) card.appendChild(standardTranslationFolds(conc.versionUri, async () => std));", ""],
  nosplit: ["js/hadith-shared-ui.js", "splitChapterHeading(tr.edition, stdNo, tr.text)", "({ heading: null, text: tr.text })"],
  // The Owner's translation-terms rule (8 Nov 2026), extended to the Text pane's English fold.
  nofoldterms: ["js/hadith-shared-ui.js", "tf.set(text, body);", "text.textContent = body;"],
  noswitchterms: ["js/hadith-shared-ui.js", "{ const sw = tf ? tf.switchEl() : null; if (sw) details.appendChild(sw); }", ""],
  // Review of #1519 (round 2): the Dua cards' HadeethEnc English goes through openitiTranslationFold WITHOUT the opt-in and must stay as sourced.
  nooptin: ["js/hadith-shared-ui.js", "const tf = opts.terms ? termsFolder(r.record, r.lang) : null;", "const tf = termsFolder(r.record, r.lang);"],
  // Review of #1519: the Dua cards pass no Arabic, so the Dua Lead's English must stay as sourced.
  noguard: ["js/hadith-shared-ui.js", "const tf = arabic ? termsFolder({ hadeeth_ar: arabic }, lang) : null;", "const tf = termsFolder({ hadeeth_ar: arabic }, lang);"],
  noarabic: ["js/hadith-browser.js", "async () => std, h.text));", "async () => std));"],
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
  // Review of #1519: one "God" sentence is added to Dua 1's source English, so a fold that ran without the Arabic would show on the page.
  await ctx.route("**/output/translations/bukhari/en/12.json*", async (r) => { const j = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/translations/bukhari/en/12.json", "utf8")); j["6311"] = j["6311"] + GOD; await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(j) }); });
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
  {
    const raw = SRC_6311 + GOD;
    const sw = await P.$('[data-dua-card="1"] [data-standard-translation="en"] [data-hadith-terms-switch]');
    check(`${tag} terms: the Dua card's English is byte-for-byte the source (not folded: no Arabic is given); a «God» sentence stays «God»`, !!raw && en.text?.trim() === raw.trim() && /O God, forgive us\./.test(en.text) && !/O Allah, forgive us\./.test(en.text), String(en.text).slice(0, 100));
    check(`${tag} terms: ...and no "As sourced" switch sits in the Dua card's fold`, sw === null);
  }
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
    // The Owner's rule of 8 Nov 2026, extended to this fold: Rasulullah Sallallahu A'laihi Wa Sallam (never "the Prophet (ﷺ)"), with "As sourced" for the source's own words.
    const enSel = '[data-openiti-passage="6578"] [data-standard-translation="en"]';
    check(`${tag} terms: the Text pane's English says Rasulullah Sallallahu A'laihi Wa Sallam, not "the Prophet (ﷺ)"`, /Rasulullah Sallallahu A'laihi Wa Sallam/.test(lib.text) && !/Prophet \(ﷺ\)|Messenger \(ﷺ\)/.test(lib.text), String(lib.text).slice(0, 140));
    const termsSw = await P.$(`${enSel} [data-hadith-terms-switch]`);
    check(`${tag} terms: an "As sourced" switch sits in the fold`, !!termsSw);
    if (termsSw) {
      await termsSw.click();
      const sourcedText = await P.$eval(`${enSel} [data-standard-translation-text]`, (n) => n.textContent);
      check(`${tag} terms: ON shows the source's own words (the Prophet (ﷺ))`, /Prophet \(ﷺ\)|Messenger \(ﷺ\)/.test(sourcedText) && !/Rasulullah Sallallahu/.test(sourcedText), sourcedText.slice(0, 120));
      await termsSw.click();
      check(`${tag} terms: OFF folds again`, /Rasulullah Sallallahu A'laihi Wa Sallam/.test(await P.$eval(`${enSel} [data-standard-translation-text]`, (n) => n.textContent)));
    }
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
// Review of #1519 (round 2): a Dua card's HadeethEnc English (openitiTranslationFold, called by dua-browser.js without the opt-in)
// is the record's own `hadeeth`, byte for byte, with no "As sourced" switch.
{
  const dir = "tools/hadith-data-pull/output/hadeethenc/en";
  const shardText = (id) => { for (const f of fs.readdirSync(dir)) { const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")); const hs = j.hadiths; const h = Array.isArray(hs) ? hs.find((x) => String(x.id) === String(id)) : hs?.[id]; if (h) return h.hadeeth; } return null; };
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 1280, height: 900 } });
  if (MUTATE && MUT[MUTATE][0] === "js/hadith-shared-ui.js") {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  for (const open of [2, 8]) {
    const { page: P } = await openPage(ctx, `/app/dua-study.html?g=rasul&open=${open}`);
    await P.waitForSelector("details.openiti-translation", { state: "attached" }).catch(() => {});
    await P.evaluate(() => document.querySelectorAll("details.openiti-translation").forEach((d) => { d.open = true; d.dispatchEvent(new Event("toggle")); }));
    await P.waitForFunction(() => { const ds = [...document.querySelectorAll("details.openiti-translation")]; return ds.length > 0 && ds.every((d) => d.querySelector("[data-openiti-translation-text]")); }, null, { timeout: 15000 }).catch(() => {});
    const got = await P.$$eval("details.openiti-translation [data-openiti-translation-text]", (ns) => ns.map((n) => ({ id: n.dataset.openitiTranslationText, text: n.textContent, lang: n.lang })));
    const sw = await P.$$("details.openiti-translation [data-hadith-terms-switch]");
    check(`[dua-study open=${open}] HadeethEnc English was read (${got.length} fold text(s))`, got.length > 0, JSON.stringify(got).slice(0, 100));
    check(`[dua-study open=${open}] each Dua HadeethEnc English is the record's own words, byte for byte`, got.length > 0 && got.every((g) => g.text === shardText(g.id)), JSON.stringify(got.map((g) => [g.id, g.text.slice(0, 40), (shardText(g.id) || "").slice(0, 40)])).slice(0, 300));
    check(`[dua-study open=${open}] ...and no "As sourced" switch is offered there`, sw.length === 0, String(sw.length));
    await P.close();
  }
  await ctx.close();
}
await browser.close();
console.log(`\n==== Hadith English and Bangla translations, on Dua cards and library narrations: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
