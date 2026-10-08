// HadeethEnc's translations attached to the OpenITI narrations they translate (decision 87, round H-DB3):
// tools/hadith-data-pull/output/hadeethenc-links/*.json, and the library showing them.
//
// THE INDEPENDENT TRUTH is HadeethEnc's own attribution ("رواه مسلم", "متفق عليه", "رواه أبو داود والترمذي"): the
// linker reads only the hadith's words, never its attribution, so a link landing in a book the attribution names is
// evidence the words were matched rightly.
//
// Run from the repository root (needs node serve.js on 8080 for the browser part):
//   node tools/i18n-verify/hadeethenc-openiti-links.mjs          (data, then the library in en and bn)
//   node tools/i18n-verify/hadeethenc-openiti-links.mjs --data   (data only)
import fs from "node:fs";
import path from "node:path";
import { linkHadith } from "../hadith-data-pull/hadeethenc-openiti-links.mjs";

const root = process.cwd();
const LINKS = path.join(root, "tools", "hadith-data-pull", "output", "hadeethenc-links");
const SPLIT = path.join(root, "tools", "hadith-data-pull", "output", "openiti-release", "split");
const HE_AR = path.join(root, "tools", "hadith-data-pull", "output", "hadeethenc", "ar");
let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous");
    if (r === false) throw new Error("false");
    passed++; console.log(`  PASS  ${name}`);
  } catch (e) { failed++; console.log(`  FAIL  ${name} -- ${e.message}`); }
}
async function acheck(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error("false"); passed++; console.log(`  PASS  ${name}`); }
  catch (e) { failed++; console.log(`  FAIL  ${name} -- ${e.message}`); }
}
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const summary = readJson(path.join(LINKS, "summary.json"));
const attribution = new Map();
for (const f of fs.readdirSync(HE_AR).filter((x) => /^cat-\d+\.json$/.test(x))) {
  for (const h of readJson(path.join(HE_AR, f)).hadiths ?? []) attribution.set(String(h.id), h.attribution ?? "");
}
const BOOK_WORDS = [["البخاري", "0256Bukhari.Sahih"], ["مسلم", "0261Muslim"], ["أبو داود", "0275AbuDawud"], ["الترمذي", "0279Tirmidhi"],
  ["النسائي", "0303Nasai.SunanSughra"], ["ابن ماجه", "0273IbnMaja"], ["أحمد", "0241IbnHanbal"], ["مالك", "0179Malik"], ["الدارمي", "0255CabdAllahDarimi"]];
/** The books an attribution names (a prefix of the versionUri each). */
export function namedBooks(a) {
  const out = new Set();
  if (/متفق عليه/.test(a)) { out.add("0256Bukhari.Sahih"); out.add("0261Muslim"); }
  if (/رواه|أخرجه/.test(a)) for (const [w, uri] of BOOK_WORDS) if (a.includes(w)) out.add(uri);
  return out;
}
const linksById = new Map();
const files = summary.books.map((b) => ({ b, data: readJson(path.join(LINKS, `${b.versionUri}.json`)) }));
for (const { b, data } of files) for (const [, id] of data.entries) {
  if (!linksById.has(String(id))) linksById.set(String(id), new Set());
  linksById.get(String(id)).add(b.versionUri);
}

console.log("\n===== HadeethEnc ↔ OpenITI links: data =====");
check("at least 2,000 HadeethEnc hadith are linked", () => { if (summary.hadeethencLinked < 2000) throw new Error(`${summary.hadeethencLinked}`); });
for (const { b, data } of files) {
  check(`${b.versionUri}: each row is a real passage of the book and a real HadeethEnc hadith, in order, ids and numbers only`, () => {
    const index = readJson(path.join(SPLIT, b.versionUri, "index.json"));
    const ns = new Set(index.chapters.flatMap((c) => c.hadithPositions ?? []));
    let prev = [0, 0];
    for (const row of data.entries) {
      const [n, id, score] = row;
      if (!attribution.has(String(id))) throw new Error(`unknown HadeethEnc id ${id}`);
      if (!ns.has(n)) throw new Error(`n=${n} is not a passage of the book`);
      if (!(n > prev[0] || (n === prev[0] && id > prev[1]))) throw new Error(`order at ${n}/${id}`);
      if (!(score >= 60 && score <= 100)) throw new Error(`score ${score}`);
      if (row.some((v) => typeof v !== "number")) throw new Error("a non-number in a row");
      prev = [n, id];
    }
  });
}
check("INDEPENDENT -- at least 85% of linked hadith that name a book are linked to a book they name", () => {
  let named = 0, agree = 0;
  for (const [id, books] of linksById) {
    const want = namedBooks(attribution.get(id) ?? "");
    if (!want.size) continue;
    named++;
    if ([...books].some((u) => [...want].some((w) => u.startsWith(w)))) agree++;
  }
  if (named < 1500 || agree / named < 0.85) throw new Error(`${agree}/${named}`);
});
check("INDEPENDENT -- of hadith attributed to Muslim alone and linked to Muslim or Bukhari, 90% land in Muslim", () => {
  let n = 0, inMuslim = 0;
  for (const [id, books] of linksById) {
    const a = attribution.get(id) ?? "";
    if (!/^رواه مسلم\.?$/.test(a.trim())) continue;
    const hit = [...books].filter((u) => u.startsWith("0261Muslim") || u.startsWith("0256Bukhari.Sahih"));
    if (!hit.length) continue;
    n++; if (hit.some((u) => u.startsWith("0261Muslim"))) inMuslim++;
  }
  if (n < 100 || inMuslim / n < 0.9) throw new Error(`${inMuslim}/${n}`);
});
check("POSITIVE CONTROL -- the attribution check refuses links moved to the wrong book", () => {
  let named = 0, agree = 0;
  for (const [id] of linksById) {
    const want = namedBooks(attribution.get(id) ?? "");
    if (!want.size) continue;
    named++;
    if (["0255CabdAllahDarimi"].some((w) => [...want].includes(w))) agree++;
  }
  if (agree / named >= 0.85) throw new Error("a wrong-book table still passed");
});
check("linkHadith: a hadith's words inside a longer passage link; unrelated words do not", () => {
  const H = { id: "1", text: "قال رسول الله صلى الله عليه وسلم إنما الأعمال بالنيات وإنما لكل امرئ ما نوى" };
  const P = [{ uri: "x", n: 1, text: "حدثنا الحميدي حدثنا سفيان قال " + H.text + " فمن كانت هجرته" },
    { uri: "x", n: 2, text: "حدثنا قتيبة حدثنا الليث عن نافع عن ابن عمر في صلاة الليل مثنى مثنى فإذا خشيت الصبح" }];
  const got = linkHadith([H], P, { maxPosting: 10 });
  if (got.length !== 1 || got[0].n !== 1) throw new Error(JSON.stringify(got));
});

// A Bukhari passage whose linked HadeethEnc hadith HAS Bangla, read off the data: its standard number is typed below.
const HE_BN = path.join(root, "tools", "hadith-data-pull", "output", "hadeethenc", "bn");
const bnIds = new Set();
for (const f of fs.readdirSync(HE_BN).filter((x) => /^cat-\d+\.json$/.test(x))) for (const h of readJson(path.join(HE_BN, f)).hadiths ?? []) bnIds.add(String(h.id));
const bukhariLinks = files.find((x) => x.b.versionUri === "0256Bukhari.Sahih.JK000110-ara1").data.entries;
const conc = readJson(path.join(root, "tools", "hadith-data-pull", "output", "concordance", "0256Bukhari.Sahih.JK000110-ara1.json"));
const stdByN = new Map(conc.entries.map((r) => [r[0], r[1]]));
const firstNByStd = new Map(); for (const r of conc.entries) if (!firstNByStd.has(Math.trunc(r[1]))) firstNByStd.set(Math.trunc(r[1]), r[0]);
const linkedIdsByN = new Map(); for (const [n, id] of bukhariLinks) { if (!linkedIdsByN.has(n)) linkedIdsByN.set(n, []); linkedIdsByN.get(n).push(String(id)); }
const pick = (wantBn) => bukhariLinks.find(([n]) => { const s = stdByN.get(n); return s != null && Number.isInteger(s) && firstNByStd.get(s) === n && linkedIdsByN.get(n).every((id) => bnIds.has(id) === wantBn); });
const WITH_BN = pick(true), WITHOUT_BN = pick(false);
check("the data offers a Bukhari passage with a Bangla translation and one without (for the library checks)", () => { if (!WITH_BN || !WITHOUT_BN) throw new Error("none"); });

if (!process.argv.includes("--data")) {
  const { chromium, newContext, openPage } = await import("./harness.mjs");
  const EXE = process.env.CHROMIUM_PATH || undefined;
  for (const [lang, width] of [["bn", 390], ["en", 1280]]) {
    console.log(`\n===== HadeethEnc ↔ OpenITI links: library (${lang}, ${width}px) =====`);
    const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
    const { page, errors } = await openPage(ctx, "/app/hadith-collections.html");
    await page.click('[data-hadith-tab="collections"]');
    await page.waitForSelector("[data-openiti-book]");
    await page.click('[data-openiti-book="0256Bukhari.Sahih.JK000110-ara1"]');
    await page.waitForSelector("[data-openiti-goto-input]");
    await page.fill("[data-openiti-goto-input]", String(stdByN.get(WITH_BN[0])));
    await page.click("[data-openiti-goto-btn]");
    await page.waitForSelector("[data-openiti-focused]");
    await acheck(`Bukhari ${stdByN.get(WITH_BN[0])} offers HadeethEnc's translation, closed until opened`, async () => {
      const t = await page.$("[data-openiti-focused] [data-openiti-translation]");
      if (!t) throw new Error("no translation fold");
      if (await t.evaluate((d) => d.open)) throw new Error("open before asked");
    });
    await acheck(`opening it shows the ${lang === "bn" ? "Bangla" : "English"} words, credited to HadeethEnc with a link`, async () => {
      await page.click("[data-openiti-focused] [data-openiti-translation] summary");
      await page.waitForSelector("[data-openiti-focused] [data-openiti-translation-text]", { timeout: 8000 });
      const r = await page.$eval("[data-openiti-focused] [data-openiti-translation]", (d) => ({
        text: d.querySelector("[data-openiti-translation-text]").textContent,
        credit: d.querySelector("a[href*='hadeethenc.com']")?.textContent ?? "",
        lang: d.querySelector("[data-openiti-translation-text]").lang,
      }));
      const script = lang === "bn" ? /[ঀ-৿]/ : /[A-Za-z]/;
      if (!script.test(r.text) || !/HadeethEnc/i.test(r.credit) || r.lang !== lang) throw new Error(JSON.stringify(r).slice(0, 200));
    });
    for (const look of ["light", "night"]) {
      await acheck(`${look}: the fold's heading and its words read clearly (4.5:1)`, async () => {
        await page.evaluate((l) => document.documentElement.setAttribute("data-card-look", l), look);
        const pairs = await page.$eval("[data-openiti-focused] [data-openiti-translation]", (d) => {
          const bgOf = (n) => { let el = n, bg = "rgba(0, 0, 0, 0)"; while (el && (bg === "rgba(0, 0, 0, 0)" || bg === "transparent")) { bg = getComputedStyle(el).backgroundColor; el = el.parentElement; } return bg; };
          return [d.querySelector("summary"), d.querySelector("[data-openiti-translation-text]")].map((n) => [getComputedStyle(n).color, bgOf(n)]);
        });
        const lum = (rgb) => { const c = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map((v) => { v = Number(v) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
        const ratio = ([a, b]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
        const r = pairs.map(ratio);
        if (r.some((v) => v < 4.5)) throw new Error(`${r.map((v) => v.toFixed(2))} ${JSON.stringify(pairs)}`);
      });
    }
    await acheck("the translation stays inside the screen", async () => {
      const right = await page.$eval("[data-openiti-focused] [data-openiti-translation]", (d) => d.getBoundingClientRect().right);
      if (right > width) throw new Error(`${right}`);
    });
    if (lang === "bn") {
      await acheck(`Bukhari ${stdByN.get(WITHOUT_BN[0])}, whose HadeethEnc hadith has no Bangla, says so and shows English`, async () => {
        await page.click("[data-openiti-crumbs] button:nth-of-type(2)");
        await page.waitForSelector("[data-openiti-goto-input]");
        await page.fill("[data-openiti-goto-input]", String(stdByN.get(WITHOUT_BN[0])));
        await page.click("[data-openiti-goto-btn]");
        await page.waitForSelector("[data-openiti-focused] [data-openiti-translation] summary");
        await page.click("[data-openiti-focused] [data-openiti-translation] summary");
        await page.waitForSelector("[data-openiti-focused] .hadith-fallback", { timeout: 8000 });
        const r = await page.$eval("[data-openiti-focused] [data-openiti-translation]", (d) => [d.querySelector(".hadith-fallback").textContent, d.querySelector("[data-openiti-translation-text]")?.lang]);
        if (!/বাংলা/.test(r[0]) || r[1] !== "en") throw new Error(JSON.stringify(r));
      });
    }
    await acheck("no page errors", async () => { if (errors.length) throw new Error(errors.slice(0, 2).join(" | ")); });
    await browser.close();
  }
}
console.log(`\n==== HadeethEnc ↔ OpenITI links: ${passed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
