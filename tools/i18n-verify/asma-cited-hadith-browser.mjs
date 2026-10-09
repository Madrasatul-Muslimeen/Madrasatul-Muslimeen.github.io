// Owner, 9 Oct 2026 (Asma in Explore, part 2): a Name open in Explore → Asma ul Husna writes out the hadith it cites,
// under its āyāt: reference and grade, the Arabic of the library passage, a translation in the reader's language, and
// "Open in Hadith →", whose ← Back returns to that Name (decision 86).
// Expected values written BY HAND from the data (read from the library, concordance and translation files):
//   Name 21 Al-Basit cites Tirmidhi 1314, grade "হাসান সহীহ"; library passage 1331 of 0279Tirmidhi, whose Arabic holds
//     "إن الله هو المسعر القابض الباسط الرزاق"; standard number 1314; English begins 'Narrated Anas: "Prices became
//     excessive', Bangla holds "দ্রব্যমূল্য বৃদ্ধি"; neither has a translator name.
//   Name 71 Al-Muqaddim cites Sahih Muslim 771, grade "সহীহ"; passage 3218, whose Arabic holds "أنت المقدم وأنت المؤخر";
//     standard number 1812 (not 771); English by "Abdul Hamid Siddiqui" begins "Ali b. Abu Talib reported".
//   Name 120 Al-Muhsin cites Sahih al-Jami' 1824, grade "সহীহ": not in the library.
// Run from the repository root, serve.js on :8080.
//   --mutate=nohadith   the Name panel never draws the hadith       --mutate=noarabic    the Arabic is left out
//   --mutate=nolang     the English translation is always chosen    --mutate=nofallback  no other-language fallback
//   --mutate=nograde    the grade is left out                       --mutate=noback      no way back is written
//   --mutate=guess      an unlisted citation is given a passage     --mutate=bnfont      the Arabic rule loses its id
//   --mutate=smallbtn   Open in Hadith → is 20px tall               --mutate=darktext    the translation is dark on dark
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const HTML = "quranrevival.html", MOD = "js/asma-cited-hadith.js";
const MUT = {
  nohadith: [HTML, "      renderAsmaXCitedHadith(entry, asmaXGroupId, asmaXNumber);\n", "\n"],
  noarabic: [MOD, "${escapeHtml(loaded.arabic)}", ""],
  nolang: [MOD, "const want = loaded.translations[lang] ? lang :", "const want = loaded.translations.en ? \"en\" :"],
  nofallback: [MOD, ": loaded.translations[other] ? other : null;", ": null;"],
  nograde: [MOD, "const grade = cite.grade ?", "const grade = false ?"],
  cap99: [HTML, "      if (!Number.isInteger(number) || number < 1) return;", "      if (!Number.isInteger(number) || number < 1 || number > 99) return;"],
  noclear: [HTML, '      try { const u = new URL(location.href); u.searchParams.delete("asmaName"); u.searchParams.delete("asmaGroup"); history.replaceState(history.state, "", u); } catch { /* ignore */ }\n', "\n"],
  noback: [HTML, '          u.searchParams.set("asmaName", String(number));\n', "\n"],
  nojoin: [MOD, "if (link.words && !plainArabic(arabic)", "if (false && !plainArabic(arabic)"],
  guess: [MOD, "if (!cite.link) {", "if (false) {"],
  bnfont: [HTML, "  #asmaXCitedHadith .asmax-cited-hadith-ar {", "  .asmax-cited-hadith-ar {"],
  smallbtn: [HTML, "  .asmax-cited-open { display: inline-flex; align-items: center; min-height: 40px;", "  .asmax-cited-open { display: inline-flex; align-items: center; min-height: 20px;"],
  darktext: [HTML, "overflow-wrap: anywhere; color: #e9eef7; }", "overflow-wrap: anywhere; color: #222; }"],
};
// bnfont: the Arabic loses its Qur'an font, so it falls to the page face (Bangla in Bangla).
MUT.bnfont = [HTML, "  #asmaXCitedHadith .asmax-cited-hadith-ar { font-family: var(--quran-font, serif); font-size", "  #asmaXCitedHadith .asmax-cited-hadith-ar { font-size"];
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
// darktext must beat the page's own light colour on the translation, so it also darkens that.
if (MUTATE === "darktext") MUT.darktext = [HTML, "  .asmax-cited-tr { font-size: 14px; line-height: 1.55; color: #e9eef7; }", "  .asmax-cited-tr { font-size: 14px; line-height: 1.55; color: #222; }"];

// The reader-language choice, checked on the pure renderer too (every case at once, no browser).
{
  // The module under test, mutated too when the mutation is on it (the pure checks do not go through the browser).
  let modPath = "../../app/js/asma-cited-hadith.js", tmp = null;
  if (MUTATE && MUT[MUTATE][0] === MOD) {
    tmp = "app/js/_mut-asma-cited-hadith.js";
    fs.writeFileSync(tmp, fs.readFileSync(`app/${MOD}`, "utf8").split(MUT[MUTATE][1]).join(MUT[MUTATE][2]));
    modPath = "../../" + tmp;
  }
  const { renderCitedHadithHtml } = await import(modPath);
  if (tmp) fs.unlinkSync(tmp);
  const t = (k, v = {}) => k.replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const cite = { key: "tirmidhi:1314", titleEn: "Jami' at-Tirmidhi", titleBn: "তিরমিযী", number: 1314, grade: "", link: { openiti: { versionUri: "0279Tirmidhi.Sunan.JK000140-ara1", n: 1331 } } };
  const tr = (text) => ({ text, translator: null, sourceUrl: "https://example.org/" });
  const draw = (lang, translations) => renderCitedHadithHtml({ items: [{ cite, loaded: { arabic: "نص", translations } }], heading: "H", t, escapeHtml: esc, num: String, lang });
  const bnOnly = draw("en", { en: null, bn: tr("BANGLA-TEXT") });
  check("[pure] an English reader with only a Bangla translation gets it, labelled", bnOnly.includes("BANGLA-TEXT") && bnOnly.includes('lang="bn"') && bnOnly.includes("বাংলা translation"), bnOnly);
  const enOnly = draw("bn", { en: tr("ENGLISH-TEXT"), bn: null });
  check("[pure] a Bangla reader with only an English translation gets it, labelled", enOnly.includes("ENGLISH-TEXT") && enOnly.includes('lang="en"') && enOnly.includes("{lang} translation".replace("{lang}", "English")), enOnly);
  const none = draw("en", { en: null, bn: null });
  check("[pure] no translation at all says so in words", none.includes("No translation of this hadith is in the app yet.") && !none.includes("asmax-cited-tr\""), none);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const settle = (P, ms) => P.waitForTimeout(ms);
const noSplash = (P) => P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
// Diacritics and punctuation ignored (the library writes "سبوح قدوس، رب" where the poster's words have no comma).
const strip = (s) => String(s).normalize("NFD").replace(/[ً-ٰٟۖ-ۭـ]/g, "").normalize("NFC").replace(/[^ء-يٱ-ۓ\s]/g, " ").replace(/\s+/g, " ").trim();

async function openName(P, value, key) {
  await noSplash(P);
  // After ← Back, Explore is already open on the Name: clicking its tab again would close it.
  if (!(await P.evaluate(() => !!document.getElementById("asmaXSingleSelect")?.getClientRects().length))) {
    await P.evaluate(() => document.getElementById("tabExploreBtn")?.click()); await settle(P, 900);
    await P.evaluate(() => document.getElementById("explorePaletteAsmaBtn")?.click()); await settle(P, 1200);
  }
  await P.waitForFunction(() => document.querySelectorAll("#asmaXSingleSelect option").length > 1, null, { timeout: 10000 }).catch(() => {});
  await P.selectOption("#asmaXSingleSelect", value).catch(() => {});
  await P.waitForFunction((k) => !!document.querySelector(`#asmaXCitedHadith [data-asmax-hadith="${k}"]`) && !document.querySelector("#asmaXCitedHadith > p.hint"), key, { timeout: 12000 }).catch(() => {});
}
const read = (P, key) => P.evaluate((key) => {
  const a = document.querySelector(`#asmaXCitedHadith [data-asmax-hadith="${key}"]`);
  const sec = document.getElementById("asmaXCitedHadith");
  const ar = a?.querySelector(".asmax-cited-hadith-ar"), tr = a?.querySelector(".asmax-cited-tr"), open = a?.querySelector(".asmax-cited-open");
  const rgb = (c) => (c.match(/\d+/g) ?? [0, 0, 0]).slice(0, 3).map(Number);
  return {
    shown: !!sec && !sec.hidden && sec.getBoundingClientRect().height > 0,
    label: sec?.querySelector(".asmax-cited-hadith-label")?.textContent ?? "",
    ref: a?.querySelector(".asmax-cited-ref")?.firstChild?.textContent?.trim() ?? "",
    grade: a?.querySelector(".asmax-cited-grade")?.textContent ?? "",
    arabic: ar?.textContent ?? "", arDir: ar ? getComputedStyle(ar).direction : "", arFont: ar ? getComputedStyle(ar).fontFamily : "",
    tr: tr?.textContent ?? "", trLang: tr?.getAttribute("lang") ?? "", trSum: tr ? rgb(getComputedStyle(tr).color).reduce((x, y) => x + y, 0) / 3 : 0,
    arSum: ar ? rgb(getComputedStyle(ar).color).reduce((x, y) => x + y, 0) / 3 : 0,
    credit: a?.querySelector(".asmax-cited-credit")?.textContent ?? "",
    href: open?.getAttribute("href") ?? "", openH: open ? Math.round(open.getBoundingClientRect().height) : 0,
    note: a?.querySelector("p.hint")?.textContent ?? "", hasOpen: !!open, unlinked: a?.dataset.asmaxHadithUnlinked === "true",
    over: document.documentElement.scrollWidth - innerWidth,
    small: [...(sec?.querySelectorAll("button, a") ?? [])].filter((b) => b.getBoundingClientRect().height < 40).length,
  };
}, key);

for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`, bn = lang === "bn";
  const ctx = await newContext(browser, { appLang: bn ? "bn" : null, banner: false, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing in ${file}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");

  // --- Name 21: Tirmidhi 1314 ---
  await openName(P, "21", "tirmidhi:1314");
  let v = await read(P, "tirmidhi:1314");
  check(`${tag} Al-Basit open: the hadith section is shown, headed in the reader's language`, v.shown && v.label === (bn ? "যে হাদিসগুলোতে আল-বাসিত নামটি এসেছে" : "The hadith Al-Basit is named in"), JSON.stringify([v.shown, v.label]));
  check(`${tag} ...the reference reads ${bn ? "তিরমিযী ১৩১৪" : "Jami' at-Tirmidhi 1314"}`, v.ref === (bn ? "তিরমিযী ১৩১৪" : "Jami' at-Tirmidhi 1314"), v.ref);
  check(`${tag} ...the grade reads ${bn ? "গ্রেড: হাসান সহীহ" : "Grade: হাসান সহীহ"}`, v.grade === (bn ? "গ্রেড: হাসান সহীহ" : "Grade: হাসান সহীহ"), v.grade);
  check(`${tag} ...the Arabic holds the narration's own words, right to left`, strip(v.arabic).includes(strip("إن الله هو المسعر القابض الباسط الرزاق")) && v.arDir === "rtl", JSON.stringify([v.arabic.slice(0, 40), v.arDir]));
  check(`${tag} ...the Arabic is in the Qur'an font (not a Bangla face)`, /QR Scheherazade|QR Noto Naskh|QR Amiri/.test(v.arFont), v.arFont);
  check(`${tag} ...the translation is in the reader's language`, bn ? v.trLang === "bn" && v.tr.includes("দ্রব্যমূল্য বৃদ্ধি") : v.trLang === "en" && v.tr.includes("Prices became excessive"), JSON.stringify([v.trLang, v.tr.slice(0, 60)]));
  check(`${tag} ...its credit is shown as the Hadith pages show it (no translator named)`, v.credit === (bn ? "অনুবাদ hadith-api (fawazahmed0) থেকে, প্রচলিত নম্বর মিলিয়ে" : "Translation from hadith-api (fawazahmed0), matched by the standard number"), v.credit);
  check(`${tag} ...Open in Hadith → links to passage 1331 of the Tirmidhi, with back=1`, v.href === "./hadith-collections.html?openiti=0279Tirmidhi.Sunan.JK000140-ara1&passage=1331&back=1", v.href);
  check(`${tag} ...no sideways scroll; every button and link at least 40px tall; ${"Open in Hadith →"} is ${v.openH}px`, v.over <= 0 && v.small === 0 && v.openH >= 40, JSON.stringify([v.over, v.small, v.openH]));
  check(`${tag} ...the Arabic and the translation are light on the dark panel`, v.trSum > 180 && v.arSum > 180, JSON.stringify([v.trSum, v.arSum]));
  await P.evaluate(() => document.querySelector("#asmaXCitedHadith .asmax-cited-hadith-label")?.scrollIntoView({ block: "start" }));
  await settle(P, 300);
  await P.screenshot({ path: `/tmp/asma-cited-hadith-${lang}-${width}.png` });

  // --- Open in Hadith →, then ← Back ---
  await P.evaluate(() => document.querySelector('[data-asmax-hadith-open="tirmidhi:1314"]')?.click());
  await P.waitForFunction(() => location.pathname.endsWith("hadith-collections.html"), null, { timeout: 15000 }).catch(() => {});
  await P.waitForFunction(() => { const b = document.getElementById("hadithBackBtn"); return b && !b.hidden && b.textContent.trim(); }, null, { timeout: 15000 }).catch(() => {});
  const lib = await P.evaluate(() => ({ path: location.pathname.split("/").pop(), back: document.getElementById("hadithBackBtn")?.textContent.trim() ?? "", hidden: document.getElementById("hadithBackBtn")?.hidden }));
  check(`${tag} Open in Hadith → opens the library with ← Back showing`, lib.path === "hadith-collections.html" && lib.hidden === false && lib.back.includes("←"), JSON.stringify(lib));
  await P.evaluate(() => document.getElementById("hadithBackBtn")?.click());
  await P.waitForFunction(() => location.pathname.endsWith("quranrevival.html"), null, { timeout: 15000 }).catch(() => {});
  await P.waitForFunction(() => !!document.querySelector('#asmaXCitedHadith [data-asmax-hadith="tirmidhi:1314"]') && !!document.getElementById("asmaXPosterPanel"), null, { timeout: 20000 }).catch(() => {});
  const back = await P.evaluate(() => ({ path: location.pathname.split("/").pop(), poster: !!document.getElementById("asmaXPosterPanel"), sel: document.getElementById("asmaXSingleSelect")?.value ?? null, hadith: !!document.querySelector('#asmaXCitedHadith [data-asmax-hadith="tirmidhi:1314"]'), explore: !!document.getElementById("asmaXRefCard")?.getClientRects().length }));
  check(`${tag} ← Back lands on Al-Basit in Explore again, with its hadith`, back.path === "quranrevival.html" && back.poster && back.hadith && back.explore, JSON.stringify(back));

  // --- Name 71: Muslim 771 ---
  await openName(P, "71", "muslim:771");
  v = await read(P, "muslim:771");
  check(`${tag} Al-Muqaddim: the reference reads ${bn ? "সহীহ মুসলিম ৭৭১" : "Sahih Muslim 771"}, grade ${bn ? "গ্রেড: সহীহ" : "Grade: সহীহ"}`, v.ref === (bn ? "সহীহ মুসলিম ৭৭১" : "Sahih Muslim 771") && v.grade === (bn ? "গ্রেড: সহীহ" : "Grade: সহীহ"), JSON.stringify([v.ref, v.grade]));
  check(`${tag} ...the Arabic holds "أنت المقدم وأنت المؤخر"`, strip(v.arabic).includes(strip("أنت المقدم وأنت المؤخر")), v.arabic.slice(0, 60));
  check(`${tag} ...the translation is found by standard number 1812, in the reader's language`, bn ? v.trLang === "bn" && v.tr.includes("মুহাম্মাদ ইবনু আবূ বাকর আল মুকাদ্দামী") : v.trLang === "en" && v.tr.startsWith("Ali b. Abu Talib reported"), JSON.stringify([v.trLang, v.tr.slice(0, 50)]));
  check(`${tag} ...${bn ? "the Bangla translation names no translator" : "the English translation credits Abdul Hamid Siddiqui"}`, bn ? v.credit === "অনুবাদ hadith-api (fawazahmed0) থেকে, প্রচলিত নম্বর মিলিয়ে" : v.credit.startsWith("Translation: Abdul Hamid Siddiqui"), v.credit);

  // --- Name 104: Muslim 487, whose words carry a comma in the library ---
  await openName(P, "104", "muslim:487");
  v = await read(P, "muslim:487");
  check(`${tag} As-Subbuh: reference ${bn ? "সহীহ মুসলিম ৪৮৭" : "Sahih Muslim 487"} and the Arabic holds "سبوح قدوس رب الملائكة والروح"`, v.ref === (bn ? "সহীহ মুসলিম ৪৮৭" : "Sahih Muslim 487") && strip(v.arabic).includes(strip("سبوح قدوس رب الملائكة والروح")), JSON.stringify([v.ref, v.arabic.slice(0, 40)]));
  // Architect review: the way back for a Name beyond the 99 (the first version capped the reopen at 99), and the address
  // is cleared once used (a later reload must not reopen the Name).
  await P.evaluate(() => document.querySelector('[data-asmax-hadith-open="muslim:487"]')?.click());
  await P.waitForFunction(() => location.pathname.endsWith("hadith-collections.html"), null, { timeout: 15000 }).catch(() => {});
  await P.waitForFunction(() => { const b = document.getElementById("hadithBackBtn"); return b && !b.hidden; }, null, { timeout: 15000 }).catch(() => {});
  await P.evaluate(() => document.getElementById("hadithBackBtn")?.click());
  await P.waitForFunction(() => location.pathname.endsWith("quranrevival.html"), null, { timeout: 15000 }).catch(() => {});
  await P.waitForFunction(() => !!document.querySelector('#asmaXCitedHadith [data-asmax-hadith="muslim:487"]'), null, { timeout: 20000 }).catch(() => {});
  const back104 = await P.evaluate(() => ({ hadith: !!document.querySelector('#asmaXCitedHadith [data-asmax-hadith="muslim:487"]'), search: location.search }));
  check(`${tag} As-Subbuh (104, beyond the 99): ← Back from the library lands on it again, and the address is cleared`, back104.hadith && !/asmaName/.test(back104.search), JSON.stringify(back104));

  // --- Name 120: not in the library ---
  await openName(P, "120", "sahihjami:1824");
  v = await read(P, "sahihjami:1824");
  check(`${tag} Al-Muhsin: reference ${bn ? "সহীহুল জামি' ১৮২৪" : "Sahih al-Jami' 1824"} and grade, no text, no link, and a plain line`, v.ref === (bn ? "সহীহুল জামি' ১৮২৪" : "Sahih al-Jami' 1824") && v.grade.includes("সহীহ") && v.unlinked && !v.hasOpen && !v.arabic && !v.tr
    && v.note === (bn ? "এই হাদিসের পাঠ এখনও অ্যাপের হাদিস লাইব্রেরিতে নেই।" : "This hadith's text is not in the app's Hadith library yet."), JSON.stringify(v));
  if (bn || width === 1280) await P.screenshot({ path: `/tmp/asma-cited-hadith-unlinked-${lang}-${width}.png` });

  // --- A Name with no hadith citation draws no hadith section ---
  await openName(P, "1", "none");
  const none = await P.evaluate(() => { const s = document.getElementById("asmaXCitedHadith"); return { hidden: !s || s.hidden, kids: s?.children.length ?? 0 }; });
  check(`${tag} Ar-Rahman (no hadith cited): no hadith section`, none.hidden && none.kids === 0, JSON.stringify(none));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource|quran\.foundation/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Asma: a Name's cited hadith: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
