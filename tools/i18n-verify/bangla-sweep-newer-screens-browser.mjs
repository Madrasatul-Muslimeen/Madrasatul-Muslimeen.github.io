// Bangla sweep of the newer screens (issue #677): the Dua tab and cards, the Dua word card, the Hadith library
// (OpenITI books, standard numbers, the English and Bangla translation folds), HadeethEnc, Notes on a dua, Dawah.
//
// In Bangla at 390px each screen is opened for real, every VISIBLE text node and every aria-label/title/placeholder is
// collected, and any Latin-script word is a leak -- except what is DATA and not interface: Arabic and anything inside
// lang="ar"/dir="rtl", elements marked lang="en" (the English translation text), translator and source credits, book
// titles and narrator names. The allowance below is by exact phrase and is READ, not grepped: every entry says why.
// The coverage number has been wrong nine times; this is a list to read, and the suite asserts it is empty.
//
// PART B (way-back law, decision 86): notes.html's "Make a printable page" sends the reader to dawah.html?back=1, and
// dawah.html shows ← Back (going back by history), in English and in Bangla.
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/bangla-sweep-newer-screens-browser.mjs
// Mutation: --strip="<English phrase>" makes the page's bn lookup miss that phrase (proves the sweep names it).
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const LIST = process.argv.includes("--list");
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);

// Data, not interface: proper names, credits, book titles and ids that appear INSIDE otherwise-Bangla text, stripped
// before the Latin check. Each token is a name or a licence, never a word a Bangla reader should be given in Bangla.
const NAME_TOKENS = [
  /HadeethEnc(\.com)?/gi, /OpenITI/gi, /hadith-api/gi, /fawazahmed0/gi, /Muhsin Khan/gi, /QuranRevival/gi,
  /CC BY-NC-SA 4\.0/gi, /[\w.+-]+@[\w.-]+\.\w+/g, /synthetic-[\w-]+/gi,
];
// Whole strings that are data: book titles (in the "Also narrated in" lists), the demo-only synthetic note, a HadeethEnc
// category title, and word-by-word glosses in an aria-label.
const DATA_ALLOWED = [
  /^— (al-Muwatta'|Musnad Ahmad|Sunan al-Darimi|Sahih al-Bukhari|al-Adab al-Mufrad|Sahih Muslim|Sunan Ibn Majah|Sunan Abi Dawud|Jami' al-Tirmidhi|Sunan al-Nasa'i|al-Nasa'i's 'Amal al-Yawm wa'l-Layla|Ibn al-Sunni's 'Amal al-Yawm wa'l-Layla|al-Nawawi's al-Adhkar|al-Nawawi's Forty|Riyad al-Salihin)$/,
  /^Sahih al-Bukhari$/,
  // The content-language chooser names each language in its own script (العربية · English · বাংলা), the usual convention.
  // Only an <option> in that chooser; a translation fold's summary is NOT exempt and must read ইংরেজি.
  { optionOnly: true, re: /^English$/ }, /^People of the Sunnah and the Community$/, /^Synthetic development data — these are not real narrations\.$/,
  /^[؀-ۿݐ-ݿ\s]+ — [A-Za-z()' \[\]ʿā-]+$/,
];

const SCAN = () => {
  const out = [];
  const visible = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e.hidden || e.tagName === "SCRIPT" || e.tagName === "STYLE" || e.tagName === "NOSCRIPT" || e.tagName === "TEMPLATE") return false;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      if (e.tagName === "DETAILS" && !e.open && el.closest("details") === e) {
        const sum = el.closest("summary");
        if (!sum || sum.parentElement !== e) return false;
      }
    }
    return true;
  };
  const isData = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const lang = (e.getAttribute?.("lang") || "").toLowerCase();
      if (lang && lang !== "bn") return "lang=" + lang;
      if (e.getAttribute?.("dir") === "rtl") return "rtl";
      if (e.hasAttribute?.("data-i18n-skip")) return "skip";
      if (e.matches?.("[data-standard-translation-text], .hadith-arabic, .dua-word-arabic, .ayah-translation, .wbw-translit, .wbw-gloss, .word-card-transliteration, .dua-word-translit .dua-word-value")) return "data";
    }
    return null;
  };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const text = n.nodeValue.replace(/\s+/g, " ").trim();
    if (!text || !/[A-Za-z]{2,}/.test(text)) continue;
    const el = n.parentElement;
    if (!el || !visible(el) || isData(el)) continue;
    out.push({ kind: "text", text, where: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : "") });
  }
  for (const el of document.body.querySelectorAll("[aria-label],[title],[placeholder]")) {
    if (!visible(el) || isData(el)) continue;
    for (const a of ["aria-label", "title", "placeholder"]) {
      const v = (el.getAttribute(a) || "").replace(/\s+/g, " ").trim();
      if (v && /[A-Za-z]{2,}/.test(v)) out.push({ kind: a, text: v, where: el.tagName.toLowerCase() });
    }
  }
  return out;
};

const leaksOf = (found) => found.filter((f) => {
  if (DATA_ALLOWED.some((a) => (a.optionOnly ? f.where === "option" && a.re.test(f.text) : a.test(f.text)))) return false;
  let rest = f.text;
  for (const re of NAME_TOKENS) rest = rest.replace(re, " ");
  return /[A-Za-z]{2,}/.test(rest);
});
const allLeaks = [];
async function sweep(P, screen) {
  const found = await P.evaluate(SCAN);
  const leaks = leaksOf(found);
  for (const l of leaks) allLeaks.push({ screen, ...l });
  if (LIST) console.log(`[${screen}] ${leaks.length} Latin-script strings:\n` + leaks.map((l) => `    ${l.kind} <${l.where}> ${JSON.stringify(l.text)}`).join("\n"));
  check(`bn 390: "${screen}" shows no English interface text`, leaks.length === 0, JSON.stringify(leaks.slice(0, 8).map((l) => `${l.kind}:${l.text}`)));
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const settle = (P, ms = 300) => P.waitForTimeout(ms);
async function mk(lang, width = 390) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 860 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    // Make one phrase miss in bn.js: rename its key so t() falls back to English.
    await ctx.route("**/app/js/i18n/bn.js*", async (r) => {
      const src = fs.readFileSync("app/js/i18n/bn.js", "utf8");
      const key = JSON.stringify(MUTATE);
      if (!src.includes(key + ":")) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(key + ":").join(JSON.stringify("\u0000" + MUTATE) + ":") });
    });
  }
  return ctx;
}

// ---- Part A: bn at 390 -----------------------------------------------------
{
  const ctx = await mk("bn");
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html?back=1");

  await sweep(P, "Hadith page, landing");

  await P.click('[data-hadith-tab="collections"]'); await settle(P, 600);
  await sweep(P, "Hadith Collections (OpenITI books, HadeethEnc, pilot)");

  await P.click('[data-hadeethenc-category="3"]'); await settle(P, 600);
  await sweep(P, "HadeethEnc category");
  await P.click('[data-hadeethenc-hadith="4563"]'); await settle(P, 600);
  await sweep(P, "HadeethEnc hadith card");

  await P.click('[data-hadith-tab="dua"]');
  await P.waitForSelector("[data-dua-card]");
  await settle(P, 600);
  await sweep(P, "Dua tab, cards");

  await P.evaluate(() => document.querySelector('[data-dua-card="11"] [data-dua-word="4"]').scrollIntoView({ block: "center" }));
  await P.click('[data-dua-card="11"] [data-dua-word="4"]');
  await P.waitForSelector('[data-dua-word-panel="11"]:not([hidden])', { timeout: 4000 }).catch(() => {});
  await P.waitForSelector('[data-dua-word-panel="11"] [data-dua-word-state-now]', { timeout: 10000 }).catch(() => {});
  await settle(P, 600);
  await sweep(P, "Dua word card (progress, grammar, vowels)");

  await P.evaluate(() => document.querySelector('[data-dua-card="1"]').scrollIntoView({ block: "center" }));
  for (const lg of ["en", "bn"]) {
    await P.evaluate((l) => { const d = document.querySelector(`[data-dua-card="1"] [data-standard-translation="${l}"]`); if (d) d.open = true; }, lg);
  }
  await settle(P, 1500);
  await sweep(P, "Dua card with both translation folds open");

  await P.click('[data-dua-mode="chapters"]');
  await P.waitForSelector("[data-dua-book]");
  await sweep(P, "Dua chapters (eleven books)");
  await P.click('[data-dua-book="0256Bukhari.Sahih.JK000110-ara1"]');
  await P.waitForSelector("[data-dua-chapter]");
  await sweep(P, "Dua chapter list of one book");
  await P.click("[data-dua-chapter]");
  await P.waitForSelector('[data-openiti-passage="6578"]');
  await settle(P, 600);
  await sweep(P, "Library narration (standard number, Also narrated in)");
  await P.evaluate(() => { const m = document.querySelector('[data-openiti-passage="6578"] details.dua-also-more'); if (m) m.open = true; });
  await P.evaluate(() => { for (const l of ["en", "bn"]) { const d = document.querySelector(`[data-openiti-passage="6578"] [data-standard-translation="${l}"]`); if (d) d.open = true; } });
  await settle(P, 1500);
  await sweep(P, "Library narration, folds and more-books open");
  check("bn 390: hadith screens raised no page errors", errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// Notes on a dua, with ← Back.
{
  const ctx = await mk("bn");
  const { page: P, errors } = await openPage(ctx, "/app/notes.html?unit=dua%3A20&label=" + encodeURIComponent("দুআ ২০") + "&back=1");
  await P.waitForFunction(() => document.getElementById("unitBanner")?.textContent.trim().length > 0, null, { timeout: 15000 }).catch(() => {});
  await settle(P, 800);
  await sweep(P, "Notes page on a dua");
  check("bn 390: notes page raised no page errors", errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// Dua word card on the Qur'an page, reached from a Dua.
{
  const ctx = await mk("bn");
  const { page: P } = await openPage(ctx, "/app/quranrevival.html?word=2:131:7&back=1&from=dua-1");
  await P.waitForSelector("[data-word-card-app-back]", { timeout: 20000 }).catch(() => {});
  await settle(P, 1200);
  await sweep(P, "Word card opened from a Dua (Back to Dua)");
  await ctx.close();
}

// Dawah page with the way back.
{
  const ctx = await mk("bn");
  const { page: P } = await openPage(ctx, "/app/dawah.html?back=1");
  await settle(P, 800);
  await sweep(P, "Dawah page (way back from Make a printable page)");
  await ctx.close();
}

// ---- Part B: the way back from "Make a printable page" --------------------
const src = fs.readFileSync("app/notes.html", "utf8");
check("notes.html sends the reader to dawah.html with back=1", /location\.href\s*=\s*"dawah\.html\?back=1"/.test(src));
for (const [lang, word] of [["en", "← Back"], ["bn", "← পেছনে"]]) {
  const ctx = await mk(lang);
  // history so Back goes somewhere: land on the Hadith page, then go to dawah.html as a link would.
  const { page: P } = await openPage(ctx, "/app/hadith-collections.html");
  await P.goto("http://localhost:8080/app/dawah.html?back=1", { waitUntil: "networkidle" });
  await settle(P, 600);
  const b = await P.evaluate(() => { const e = document.getElementById("notesBackBtn"); if (!e) return null; const cs = getComputedStyle(e); return { text: e.textContent.trim(), shown: !e.hidden && cs.display !== "none", h: e.getBoundingClientRect().height, bg: cs.backgroundColor }; });
  check(`dawah.html?back=1 shows "${word}" (${lang}), 40px tall, in the Notes ← Back look`, !!b && b.shown && b.text === word && b.h >= 40 && b.bg === "rgb(31, 58, 110)", JSON.stringify(b));
  await P.click("#notesBackBtn");
  await P.waitForURL(/hadith-collections\.html/, { timeout: 10000 }).catch(() => {});
  check(`...and pressing it goes back by history (${lang})`, /hadith-collections\.html/.test(P.url()), P.url());
  const P2 = await ctx.newPage();
  await P2.goto("http://localhost:8080/app/dawah.html", { waitUntil: "networkidle" });
  await settle(P2, 400);
  const none = await P2.evaluate(() => { const e = document.getElementById("notesBackBtn"); return !e || e.hidden || getComputedStyle(e).display === "none"; });
  check(`dawah.html without back=1 shows no ← Back (${lang})`, none);
  await ctx.close();
}

await browser.close();
if (LIST) console.log("\nALL LEAKS:\n" + JSON.stringify([...new Set(allLeaks.map((l) => l.text))], null, 1));
console.log(`\n==== Bangla sweep of the newer screens: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
