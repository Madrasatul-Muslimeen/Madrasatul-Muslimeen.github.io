// The numbering concordance (decision 87, round H-DB2): tools/hadith-data-pull/output/concordance/*.json, and
// the Hadith library showing and jumping by the standard number.
//
// THE EXPECTED VALUES DO NOT COME FROM THE MATCHER. Three independent sources:
//   1. Four Sunan editions in OpenITI (Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah) carry their OWN numbers, and those
//      equal the standard ones (research report §2's table, "same"). The matcher never reads them; agreement with
//      them is ground truth for its output.
//   2. The research report's ranges for Bukhari's Kitab ad-Da'awat: edition 5945-6048 is standard 6304-6411.
//   3. The 14 Hadith on the Asmaul Husna poster, matched by hand in v09.112 (app/js/asma-poster.js), keyed by the
//      standard number (Muslim by Abdul-Baqi's).
//
// Run from the repository root (needs node serve.js on 8080 for the browser part):
//   node tools/i18n-verify/hadith-concordance.mjs            (data, then the browser in en and bn)
//   node tools/i18n-verify/hadith-concordance.mjs --data     (data only)
// Exits 0 only if every check passed.
import fs from "node:fs";
import path from "node:path";
import { matchBook } from "../hadith-data-pull/hadith-concordance.mjs";

const root = process.cwd();
const CONC = path.join(root, "tools", "hadith-data-pull", "output", "concordance");
const SPLIT = path.join(root, "tools", "hadith-data-pull", "output", "openiti-release", "split");
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
const summary = readJson(path.join(CONC, "summary.json"));

function editionNumbers(uri) {
  const index = readJson(path.join(SPLIT, uri, "index.json"));
  const byN = new Map();
  for (const ch of index.chapters) for (const f of ch.shardFiles) {
    for (const h of readJson(path.join(SPLIT, uri, f)).hadiths) byN.set(h.n, { number: h.number ?? null, kind: h.kind });
  }
  return byN;
}

/** Share of matched rows whose standard number's whole part equals the edition's own number. */
function agreement(entries, byN) {
  let comparable = 0, same = 0;
  for (const [n, std] of entries) {
    const ed = byN.get(n)?.number;
    if (ed == null) continue;
    comparable++;
    if (Math.trunc(Number(std)) === ed) same++;
  }
  return { comparable, same, share: comparable ? same / comparable : 0 };
}

console.log("\n===== hadith concordance: data =====");
check("summary.json lists the eight books", () => {
  if (summary.books.length !== 8) throw new Error(`${summary.books.length}`);
});
const files = summary.books.map((b) => ({ b, data: readJson(path.join(CONC, `${b.versionUri}.json`)), byN: editionNumbers(b.versionUri) }));
for (const { b, data, byN } of files) {
  check(`${b.label}: rows are in passage order, each passage once, each a real hadith/passage of the book`, () => {
    let prev = 0;
    for (const row of data.entries) {
      if (!(row[0] > prev)) throw new Error(`order/duplicate at n=${row[0]}`);
      prev = row[0];
      const p = byN.get(row[0]);
      if (!p || !["hadith", "passage"].includes(p.kind)) throw new Error(`n=${row[0]} is not a hadith/passage`);
      if (!(row[2] >= 30 && row[2] <= 100) || ![1, 2].includes(row[3])) throw new Error(`bad score/pass at n=${row[0]}`);
    }
  });
  check(`${b.label}: language-keyed label (I11) and only numbers stored, no text`, () => {
    if (!data.label?.en || !data.label?.bn) throw new Error("label");
    if (data.entries.some((r) => r.some((v) => typeof v === "string" && /[؀-ۿ]/.test(v)))) throw new Error("Arabic text in a row");
  });
}
// Bukhari's floor is lower for a measured reason: this JK edition numbers 7,129 hadith against the standard 7,563
// (research report §2), joining some standard hadith into one, so about 94% is close to the most it can cover.
for (const [label, floor] of [["Bukhari", 0.93], ["Abu Dawud", 0.95], ["Tirmidhi", 0.95], ["Nasa'i", 0.95], ["Ibn Majah", 0.95], ["Muslim", 0.95]]) {
  const f = files.find((x) => x.b.label === label);
  check(`${label}: at least ${floor * 100}% of the standard hadith that have text are covered`, () => {
    const share = f.b.standardCovered / f.b.standardWithText;
    if (share < floor) throw new Error(`${(share * 100).toFixed(1)}%`);
  });
}

// 1. Ground truth: the four Sunan's own numbers.
for (const label of ["Abu Dawud", "Tirmidhi", "Nasa'i", "Ibn Majah"]) {
  const f = files.find((x) => x.b.label === label);
  check(`${label}: INDEPENDENT -- 99% of matches agree with the edition's own number (the matcher never reads it)`, () => {
    const a = agreement(f.data.entries, f.byN);
    if (a.comparable < 3000 || a.share < 0.99) throw new Error(`${a.same}/${a.comparable}`);
  });
  check(`${label}: INDEPENDENT -- pass 2 (between two matches) agrees 99% too`, () => {
    const a = agreement(f.data.entries.filter((r) => r[3] === 2), f.byN);
    if (a.comparable < 300 || a.share < 0.99) throw new Error(`${a.same}/${a.comparable}`);
  });
}
check("POSITIVE CONTROL -- the agreement check refuses a concordance shifted by one row", () => {
  const f = files.find((x) => x.b.label === "Ibn Majah");
  const shifted = f.data.entries.map((r, i, all) => [r[0], (all[i + 1] ?? r)[1], r[2], r[3]]);
  if (agreement(shifted, f.byN).share >= 0.99) throw new Error("a shifted table still passed");
});

// 2. The research report's ranges.
check("Bukhari: INDEPENDENT -- edition 5945-6048 (Kitab ad-Da'awat) lands in standard 6304-6411, at least 90 of them", () => {
  const f = files.find((x) => x.b.label === "Bukhari");
  const rows = f.data.entries.filter(([n]) => { const e = f.byN.get(n)?.number; return e >= 5945 && e <= 6048; });
  const bad = rows.filter((r) => !(r[1] >= 6304 && r[1] <= 6411));
  if (rows.length < 90 || bad.length) throw new Error(`${rows.length} rows, ${bad.length} outside: ${JSON.stringify(bad.slice(0, 3))}`);
});

// 3. The poster's 14 hand-matched Hadith.
const posterSrc = fs.readFileSync(path.join(root, "app", "js", "asma-poster.js"), "utf8");
const poster = [...posterSrc.matchAll(/"(\w+):(\d+)": \{ openiti: \{ versionUri: "([^"]+)", n: (\d+)/g)];
check("the poster's 14 hand-matched Hadith were read", () => { if (poster.length !== 14) throw new Error(`${poster.length}`); });
for (const [, book, std, uri, n] of poster) {
  check(`INDEPENDENT -- poster ${book}:${std} (passage ${n}) has the same standard number here`, () => {
    const f = files.find((x) => x.b.versionUri === uri);
    const row = f.data.entries.find((r) => r[0] === Number(n));
    if (!row) throw new Error("not matched");
    const col = f.data.columns.indexOf(f.data.citeColumn);
    const cite = String(row[col]).replace(f.data.citeColumn === "abdulBaqiNumber" ? /\.\d+$/ : /$^/, "");
    if (cite !== std) throw new Error(`got ${cite}`);
  });
}

// The pure matcher on a hand-made book: repeated texts go to the nearby copy, an unrelated text is not matched.
check("matchBook: in order, a repeat taken near its neighbours, an unrelated passage left unmatched", () => {
  const W = (s) => s.split(" ").map((w, i) => w + "ا".repeat(i % 3)).join(" ");
  const A = W("قال رسول الله الصلاة نور والصدقة برهان والصبر ضياء والقرآن حجة لك");
  const B = W("من كان يؤمن بالله واليوم الآخر فليقل خيرا او ليصمت ومن كان يؤمن");
  const C = W("الدين النصيحة قلنا لمن قال لله ولكتابه ولرسوله ولائمة المسلمين وعامتهم");
  const standard = [{ text: A }, { text: B }, { text: A }, { text: C }];
  const passages = [{ n: 1, text: A }, { n: 2, text: B }, { n: 3, text: A }, { n: 4, text: C }, { n: 5, text: W("كلام لا علاقة له باي حديث هنا ابدا ولا شيء منه مطلقا") }];
  const m = matchBook(passages, standard, { maxPosting: 10 });
  const got = Object.fromEntries(m.map((x) => [x.n, x.index]));
  if (got[1] !== 0 || got[2] !== 1 || got[3] !== 2 || got[4] !== 3 || 5 in got) throw new Error(JSON.stringify(got));
});

// ---------------------------------------------------------------------------
if (!process.argv.includes("--data")) {
  const { chromium, newContext, openPage } = await import("./harness.mjs");
  const EXE = process.env.CHROMIUM_PATH || undefined;
  const lum = (rgb) => { const c = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map((v) => { v = Number(v) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const [lang, width, look] of [["en", 1280, "light"], ["bn", 390, "light"], ["en", 390, "night"], ["bn", 1280, "night"]]) {
    console.log(`\n===== hadith concordance: library (${lang}, ${width}px, ${look}) =====`);
    const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
    const { page, errors } = await openPage(ctx, "/app/hadith-collections.html");
    await page.evaluate((l) => document.documentElement.setAttribute("data-card-look", l), look);
    await page.click('[data-hadith-tab="collections"]');
    await page.waitForSelector("[data-openiti-book]");
    const digits = (s) => lang === "bn" ? String(s).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]) : String(s);

    await page.click('[data-openiti-book="0256Bukhari.Sahih.JK000110-ara1"]');
    await page.waitForSelector("[data-openiti-goto-input]");
    await acheck("Bukhari offers the numbering choice, standard first", async () => {
      const v = await page.$eval("[data-openiti-goto-mode]", (s) => [s.value, s.options.length, s.getBoundingClientRect().width > 0]);
      if (v[0] !== "standard" || v[1] !== 2 || !v[2]) throw new Error(JSON.stringify(v));
    });
    await acheck("the Go row stays inside the screen", async () => {
      const r = await page.$eval(".openiti-goto", (n) => [...n.children].map((c) => c.getBoundingClientRect().right));
      if (Math.max(...r) > width) throw new Error(JSON.stringify(r));
    });
    await page.fill("[data-openiti-goto-input]", "6306");
    await page.click("[data-openiti-goto-btn]");
    await page.waitForSelector("[data-openiti-focused]");
    await acheck("standard 6306 opens Sayyid al-Istighfar (edition passage 6578), highlighted", async () => {
      const f = await page.$eval("[data-openiti-focused]", (n) => [n.dataset.openitiPassage, n.querySelector("[data-openiti-standard]")?.textContent ?? "", n.querySelector(".hadith-arabic").textContent.includes("سيد الاستغفار")]);
      if (f[0] !== "6578" || !f[1].includes(digits(6306)) || !f[2]) throw new Error(JSON.stringify(f));
    });
    await acheck("the standard number reads clearly on its card (4.5:1)", async () => {
      const c = await page.$eval("[data-openiti-focused] [data-openiti-standard]", (n) => {
        let el = n, bg = "rgba(0, 0, 0, 0)";
        while (el && (bg === "rgba(0, 0, 0, 0)" || bg === "transparent")) { bg = getComputedStyle(el).backgroundColor; el = el.parentElement; }
        return [getComputedStyle(n).color, bg];
      });
      const r = ratio(c[0], c[1]);
      if (r < 4.5) throw new Error(`${r.toFixed(2)} ${JSON.stringify(c)}`);
    });
    await acheck("the neighbouring narration says 6307", async () => {
      const t = await page.$eval('[data-openiti-passage="6579"] [data-openiti-standard]', (n) => n.textContent);
      if (!t.includes(digits(6307))) throw new Error(t);
    });
    await acheck("This edition's number still works: 5000 opens the chapter holding it", async () => {
      await page.click("[data-openiti-crumbs] button:nth-of-type(2)");
      await page.waitForSelector("[data-openiti-goto-mode]");
      await page.selectOption("[data-openiti-goto-mode]", "edition");
      await page.fill("[data-openiti-goto-input]", "5000");
      await page.click("[data-openiti-goto-btn]");
      await page.waitForSelector("[data-openiti-passage]");
      const nums = await page.$$eval('[data-openiti-kind="hadith"] .hadith-card-head', (ns) => ns.map((n) => n.textContent));
      if (!nums.some((x) => x.includes(digits(5000)))) throw new Error("5000 not in the opened chapter");
    });

    await page.click("[data-openiti-crumbs] button");
    await page.click('[data-openiti-book="0261Muslim.Sahih.Shamela0001727-ara1"]');
    await page.waitForSelector(".openiti-goto");
    await acheck("Muslim, which has no numbers of its own, can now be jumped by Abdul-Baqi's number", async () => {
      if (!(await page.$("[data-openiti-goto-input]"))) throw new Error("no input");
      await page.fill("[data-openiti-goto-input]", "91");
      await page.click("[data-openiti-goto-btn]");
      await page.waitForSelector("[data-openiti-focused]");
      const f = await page.$eval("[data-openiti-focused]", (n) => [n.dataset.openitiPassage, n.querySelector("[data-openiti-standard]")?.textContent ?? ""]);
      if (f[0] !== "374" || !f[1].includes(digits(91))) throw new Error(JSON.stringify(f));
    });
    await acheck("an unknown standard number says so", async () => {
      await page.click("[data-openiti-crumbs] button:nth-of-type(2)");
      await page.waitForSelector("[data-openiti-goto-input]");
      await page.fill("[data-openiti-goto-input]", "99999");
      await page.click("[data-openiti-goto-btn]");
      const m = await page.$eval("[data-openiti-goto-msg]", (n) => n.textContent);
      if (!m.includes(digits(99999))) throw new Error(m);
    });

    await page.click("[data-openiti-crumbs] button");
    await page.click('[data-openiti-book="0676Nawawi.RiyadSalihin.Shamela0012014-ara1"]');
    await page.waitForSelector("[data-openiti-goto-input]");
    await acheck("Riyad as-Salihin (no concordance) keeps its own numbers and no choice", async () => {
      if (await page.$("[data-openiti-goto-mode]")) throw new Error("a choice was offered");
    });
    await acheck("no page errors", async () => { if (errors.length) throw new Error(errors.slice(0, 2).join(" | ")); });
    await browser.close();
  }
}

console.log(`\n==== Hadith concordance: ${passed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
