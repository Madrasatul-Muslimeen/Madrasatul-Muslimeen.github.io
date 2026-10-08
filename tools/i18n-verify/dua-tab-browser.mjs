// The Dua tab, first cut (decision 87, round H-DB4): the Dua chapters of eleven books, "Also narrated in" across
// books, and every way back (decision 86).
//
// THE DATA'S EXPECTED COUNTS COME FROM THE RESEARCH REPORT (docs/reports/2026-10-07-hadith-dua-sources-research.md
// §2's table), counted by another session with another method, not from dua-index.mjs.
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/dua-tab-browser.mjs
import fs from "node:fs";
import path from "node:path";
import { chromium, newContext, openPage } from "./harness.mjs";
import { groupNarrations } from "../hadith-data-pull/dua-index.mjs";

const EXE = process.env.CHROMIUM_PATH || undefined;
const root = process.cwd();
const IDX = JSON.parse(fs.readFileSync(path.join(root, "tools/hadith-data-pull/output/dua/index.json"), "utf8"));
let passed = 0, failed = 0;
function check(name, fn) {
  try { const r = fn(); if (r && typeof r.then === "function") throw new TypeError("check() is synchronous"); if (r === false) throw new Error("false"); passed++; console.log(`  PASS  ${name}`); }
  catch (e) { failed++; console.log(`  FAIL  ${name} -- ${e.message}`); }
}
async function acheck(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error("false"); passed++; console.log(`  PASS  ${name}`); }
  catch (e) { failed++; console.log(`  FAIL  ${name} -- ${e.message}`); }
}

console.log("\n===== Dua index: data =====");
const byTitle = (t) => IDX.books.find((b) => b.titleEn === t);
for (const [title, want] of [["Sahih al-Bukhari", 104], ["Jami' al-Tirmidhi", 236], ["Sunan al-Nasa'i", 112], ["Sunan Ibn Majah", 66],
  ["Sunan Abi Dawud", 140], ["Riyad al-Salihin", 103], ["Sahih Muslim", 292]]) {
  check(`INDEPENDENT -- ${title}'s Dua chapter holds ${want} narrations, as the research report counted`, () => {
    const b = byTitle(title);
    if (!b || b.narrations !== want) throw new Error(`${b?.narrations}`);
  });
}
check("INDEPENDENT -- Ibn Majah's Kitab ad-Du'a is 22 babs and Abu Dawud's Witr section 32 (research report §2)", () => {
  if (byTitle("Sunan Ibn Majah").chapterIds.length !== 22 || byTitle("Sunan Abi Dawud").chapterIds.length !== 32) throw new Error("count");
});
check("every book has a language-keyed short name (I11)", () => { if (!IDX.books.every((b) => b.short?.en && b.short?.bn)) throw new Error("missing"); });
check("groups hold ids and numbers only", () => { if (IDX.groups.flat().some((m) => m.some((v) => typeof v === "string" && /[؀-ۿ]/.test(v)))) throw new Error("text"); });
check("INDEPENDENT -- Sayyid al-Istighfar (Bukhari 6306) is grouped with Tirmidhi, Nasa'i, Ibn Majah and Abu Dawud", () => {
  const bi = IDX.books.findIndex((b) => b.titleEn === "Sahih al-Bukhari");
  const g = IDX.groups.find((gr) => gr.some(([b, , std]) => b === bi && std === "6306"));
  const titles = new Set((g ?? []).map(([b]) => IDX.books[b].titleEn));
  for (const t of ["Jami' al-Tirmidhi", "Sunan al-Nasa'i", "Sunan Ibn Majah", "Sunan Abi Dawud"]) if (!titles.has(t)) throw new Error(`missing ${t}`);
});
check("groupNarrations: the same supplication joins across books; a different one does not", () => {
  const A = "اللهم إني أعوذ بك من الهم والحزن والعجز والكسل والبخل والجبن وضلع الدين وغلبة الرجال";
  const ps = [{ text: "حدثنا قتيبة قال كان النبي يقول " + A }, { text: "أخبرنا عمرو أن النبي كان يدعو " + A + " ثم ينصرف" },
    { text: "حدثنا مسدد قال كان النبي إذا أوى إلى فراشه قال باسمك اللهم أموت وأحيا وإذا استيقظ قال الحمد لله" }];
  const g = groupNarrations(ps, { join: 0.3, maxPosting: 10 });
  if (!g.some((x) => x.length === 2 && x.includes(0) && x.includes(1)) || !g.some((x) => x.length === 1 && x[0] === 2)) throw new Error(JSON.stringify(g));
});

const lum = (rgb) => { const c = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map((v) => { v = Number(v) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

for (const [lang, width, look] of [["bn", 390, "light"], ["en", 1280, "night"], ["en", 390, "night"]]) {
  console.log(`\n===== Dua tab (${lang}, ${width}px, ${look}) =====`);
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
  const { page, errors } = await openPage(ctx, "/app/hadith-collections.html");
  await page.evaluate((l) => document.documentElement.setAttribute("data-card-look", l), look);
  const digits = (s) => lang === "bn" ? String(s).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]) : String(s);
  await acheck("the Hadith page has a Dua tab, and it lists the eleven books", async () => {
    await page.click('[data-hadith-tab="dua"]');
    await page.waitForSelector("[data-dua-book]");
    const n = await page.$$eval("[data-dua-book]", (r) => r.length);
    if (n !== 11) throw new Error(`${n}`);
  });
  await acheck("Bukhari opens its Kitab ad-Da'awat; tapping it opens the chapter in view, with ← Back to Dua", async () => {
    await page.click('[data-dua-book="0256Bukhari.Sahih.JK000110-ara1"]');
    await page.waitForSelector("[data-dua-chapter]");
    await page.click("[data-dua-chapter]");
    await page.waitForSelector('[data-openiti-passage="6578"]');
    const r = await page.evaluate(() => {
      const back = document.querySelector("[data-openiti-trail-back]");
      const body = back?.getBoundingClientRect();
      return { back: back?.textContent ?? "", inView: !!body && body.top >= -1 && body.top < innerHeight };
    });
    if (!r.back.includes(lang === "bn" ? "দুআয়" : "Back to Dua") || !r.inView) throw new Error(JSON.stringify(r));
  });
  await acheck("Bukhari 6306 shows 'Also narrated in' with Tirmidhi, Nasa'i, Ibn Majah, Abu Dawud, said to be a proposal", async () => {
    const r = await page.$eval('[data-openiti-passage="6578"] [data-dua-also]', (d) => ({ text: d.textContent, refs: [...d.querySelectorAll("[data-dua-ref]")].map((b) => b.textContent) }));
    const want = lang === "bn" ? ["তিরমিযী", "নাসাঈ", "ইবনু মাজাহ", "আবু দাউদ", "যাচাই"] : ["Tirmidhi", "Nasa'i", "Ibn Majah", "Abu Dawud", "to be checked"];
    for (const w of want) if (!r.text.includes(w)) throw new Error(`missing ${w}: ${r.refs.join(", ")}`);
  });
  await acheck("the Day-and-Night books sit behind one closed '+N more' fold, and show each book's own hadith number", async () => {
    const r = await page.$eval('[data-openiti-passage="6578"] [data-dua-also]', (d) => {
      const more = d.querySelector("details.dua-also-more");
      return { has: !!more, open: more?.open, shown: [...d.querySelectorAll(":scope > .dua-also-refs [data-dua-ref]")].length,
        hidden: more ? [...more.querySelectorAll("[data-dua-ref]")].map((b) => b.textContent) : [] };
    });
    const passageWord = lang === "bn" ? "অনুচ্ছেদ" : "passage";
    if (!r.has || r.open || r.shown < 4 || r.shown > 8 || r.hidden.length < 10 || r.hidden.some((x) => x.includes(passageWord))) throw new Error(JSON.stringify(r).slice(0, 300));
  });
  await acheck("the links read clearly (4.5:1) and are 40px tall", async () => {
    const r = await page.$eval('[data-openiti-passage="6578"] [data-dua-ref]', (b) => {
      let el = b, bg = "rgba(0, 0, 0, 0)"; while (el && (bg === "rgba(0, 0, 0, 0)" || bg === "transparent")) { bg = getComputedStyle(el).backgroundColor; el = el.parentElement; }
      return { color: getComputedStyle(b).color, bg, h: b.getBoundingClientRect().height, head: getComputedStyle(b.closest("[data-dua-also]").querySelector(".dua-also-head")).color, headBg: (() => { let e = b.closest(".hadith-card"); return getComputedStyle(e).backgroundColor; })() };
    });
    if (ratio(r.color, r.bg) < 4.5 || r.h < 39.5 || ratio(r.head, r.headBg) < 4.5) throw new Error(JSON.stringify(r));
  });
  await acheck("Abu Dawud's link opens that narration, highlighted, with ← Back to Bukhari 6306", async () => {
    const ad = await page.$('[data-openiti-passage="6578"] [data-dua-ref^="0275AbuDawudSijistani"]');
    if (!ad) throw new Error("no Abu Dawud link");
    const target = (await ad.getAttribute("data-dua-ref")).split(":")[1];
    await ad.click();
    await page.waitForSelector(`[data-openiti-passage="${target}"][data-openiti-focused]`);
    const back = await page.$eval("[data-openiti-trail-back]", (b) => b.textContent);
    if (!back.includes(digits(6306))) throw new Error(back);
  });
  await acheck("← Back returns to Bukhari 6306, highlighted, with ← Back to Dua again", async () => {
    await page.click("[data-openiti-trail-back]");
    await page.waitForSelector('[data-openiti-passage="6578"][data-openiti-focused]');
    const back = await page.$eval("[data-openiti-trail-back]", (b) => b.textContent);
    if (!back.includes(lang === "bn" ? "দুআয়" : "Back to Dua")) throw new Error(back);
  });
  await acheck("← Back to Dua returns to Bukhari's Dua chapter list, where the reader was", async () => {
    await page.click("[data-openiti-trail-back]");
    await page.waitForSelector("[data-dua-chapter]");
    if (!(await page.$("[data-dua-back]"))) throw new Error("not on Bukhari's chapter list");
  });
  await acheck("no sideways scroll", async () => {
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (o > 0) throw new Error(`${o}`);
  });
  await acheck("no page errors", async () => { if (errors.length) throw new Error(errors.slice(0, 2).join(" | ")); });
  await browser.close();
}
console.log(`\n==== Dua tab: ${passed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
