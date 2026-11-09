// MSA · QR J133 (the Owner, 9 Nov 2026) -- the Learn next sheet's LEVEL SWITCH: WbW | Root | Family | Taṣrīf | Depth.
// Run from the repository root with `node serve.js` running:  node tools/i18n-verify/learn-next-levels-browser.mjs [--mutate=NAME]
// Each check is proven by its own mutation (--mutate=NAME must make the named check FAIL):
//   DATA  (builder source changed, a copy built and read)
//     nofold     Family rows ignore the meaning groups            -> "Family: one row per group or lone word"
//     rootcum    root cumulative % forgets the current row        -> "Root % so far climbs and ends at the rooted share"
//   BROWSER
//     noswitch   the switch is not drawn                          -> "five buttons"
//     samerows   every level lists the WbW rows                   -> "Root lists 1,642 rows" etc.
//     rootknown  the Root level asks the WbW claims               -> "a Root mark makes that ROOT's row known"
//     vocabshow  Learn/Practise/Step test stay on other levels    -> "Vocabulary buttons only on WbW"
//     rowopen    a Family/Root row opens rank N of the WBW list   -> "a Family row opens the word card of its first place"
//     nolang     one Bangla string missing                        -> "Bangla has no English left"
//     nowrap     the switch cannot shrink (nowrap, no min-width)  -> "the switch fits 320..1440"
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";
import { execFileSync } from "child_process";
import { lemmaText } from "../../app/js/lemma-text.js";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const OUT = "tools/quran-data-pull/output/";
const BUILDER = "tools/quran-data-pull/build-learn-next-levels.mjs";
const DATA_MUT = {
  nofold: ["const family = fold((l) => groups[l] || l,", "const family = fold((l) => l,"],
  rootcum: ["    running += e.n;\n    const r = {", "    const r = {"],
};
const MUT = {
  noswitch: ["app/quranrevival.html", 'const levelSwitch = learnNextLevelsAvailable().length > 1', 'const levelSwitch = false'],
  samerows: ["app/js/learn-next.js", 'if (level === "basic") return levels?.family?.rows ?? [];', 'if (level === "basic") return base?.rows ?? [];\n  if (level === "intermediate") return base?.rows ?? [];'],
  rootknown: ["app/quranrevival.html", "if (level === \"wbw\") return learnNextIsKnown(row);\n      const c = learnNextCtx;", "return learnNextIsKnown(row);\n      const c = learnNextCtx;"],
  vocabshow: ["app/quranrevival.html", '(isWbw ? `<div class="ln-vocab"', '(true ? `<div class="ln-vocab"'],
  rowopen: ["app/quranrevival.html", "const row = lnRows()[rank - 1];", "const row = learnNextCtx?.data.rows[rank - 1];"],
  nolang: ["app/js/i18n/bn.js", '"Hide families I know ({n} known)": "আমার জানা পরিবার লুকান ({n}টি জানা)",', ""],
  nowrap: ["app/quranrevival.html", ".ln-level { min-height: 40px; min-width: 0; padding: 0 0.2rem;", ".ln-level { min-height: 40px; min-width: max-content; white-space: nowrap; padding: 0 0.9rem;"],
};
if (MUTATE && !MUT[MUTATE] && !DATA_MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const nfc = (s) => s.normalize("NFC");

{
  console.log("\n=== data: learn-next-levels.json ===");
  let file = OUT + "learn-next-levels.json";
  if (DATA_MUT[MUTATE]) {
    const [a, b] = DATA_MUT[MUTATE];
    let src = fs.readFileSync(BUILDER, "utf8");
    if (!src.includes(a)) throw new Error(`data mutation anchor missing: ${MUTATE}`);
    src = src.split(a).join(b).replace('OUT + "learn-next-levels.json"', '"/tmp/learn-next-levels-mutated.json"').replace('OUT + "learn-next-levels.json"', '"/tmp/learn-next-levels-mutated.json"');
    file = "/tmp/learn-next-levels-mutated.json";
    execFileSync("node", ["--input-type=module"], { input: src, stdio: ["pipe", "ignore", "inherit"] });
  }
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  const base = JSON.parse(fs.readFileSync(OUT + "learn-next.json", "utf8"));
  const groups = JSON.parse(fs.readFileSync(OUT + "lemma-meaning-groups.json", "utf8")).byLemma;
  const wantFamilies = new Set(base.rows.map((r) => groups[r.l] || r.l)).size;
  const ordered = (rows) => rows.every((r, i) => r.r === i + 1 && (i === 0 || rows[i - 1].n >= r.n));
  check(`Family: one row per group or lone word (${wantFamilies})`, doc.family.rows.length === wantFamilies, String(doc.family.rows.length));
  check("Family rows add up to every one of the 74,122 words, ordered by count", doc.family.rows.reduce((n, r) => n + r.n, 0) === 74122 && ordered(doc.family.rows) && doc.family.rows.at(-1).p === 100);
  check("Root: 1,642 roots, ordered by count", doc.root.rows.length === 1642 && ordered(doc.root.rows));
  const rootTotal = doc.root.rows.reduce((n, r) => n + r.n, 0);
  let run = 0; const climbs = doc.root.rows.every((r) => { run += r.n; return r.p === Math.round((run / 74122) * 1000) / 10; });
  check(`Root % so far climbs and ends at the rooted share (${rootTotal} of 74,122)`, climbs && rootTotal > 40000 && rootTotal < 74122, String(rootTotal));
  check("every row has a key, Arabic, meanings and a first place", [...doc.family.rows, ...doc.root.rows].every((r) => r.l && r.a && r.e && r.b && r.o > 1000000 && r.k >= 1));
  check("file under 900 KB", fs.statSync(file).size < 900 * 1024, String(fs.statSync(file).size));
}
if (DATA_MUT[MUTATE]) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const levels = JSON.parse(fs.readFileSync(OUT + "learn-next-levels.json", "utf8"));
const base = JSON.parse(fs.readFileSync(OUT + "learn-next.json", "utf8"));
const wlog = (page, n = 0) => page.evaluate((n) => (window.__stubWriteData || []).slice(n).map((w) => `${w.col}:${w.id}`), n);
const wcount = (page) => page.evaluate(() => (window.__stubWriteData || []).length);
const press = (page, sel, i = 0) => page.evaluate(([sel, i]) => document.querySelectorAll("#quranWordCardMount " + sel)[i]?.click(), [sel, i]);
async function goTo(page, s, a) {
  await page.evaluate(([s, a]) => { const ss = document.getElementById("surahSelect"); if (ss.value !== String(s)) { ss.value = String(s); ss.dispatchEvent(new Event("change", { bubbles: true })); } setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = String(a); as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); }, [s, a]);
  await page.waitForFunction(([s, a]) => !!document.querySelector(`[data-word-occurrence$=":${s}:${a}:1"]`), [s, a], { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}
async function openWordOf(page, o) {
  const s = Math.floor(o / 1000000), a = Math.floor((o % 1000000) / 1000), p = o % 1000;
  await goTo(page, s, a);
  await page.evaluate(([s, a, p]) => document.querySelector(`[data-word-occurrence$=":${s}:${a}:${p}"]`)?.click(), [s, a, p]);
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount .quran-word-card"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
}
const openTab = async (page, level) => {
  await page.click(`#quranWordCardMount [data-word-card-level="${level}"]`).catch(() => {});
  await page.waitForFunction((l) => document.querySelector(`#quranWordCardMount [data-word-card-panel="${l}"]`), level, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
};
const openSheet = async (page) => {
  await page.evaluate(() => document.getElementById("tabVocabularyBtn")?.click());
  await page.waitForFunction(() => { const s = document.getElementById("learnNextSheet"); return s && !s.hidden && s.querySelectorAll(".ln-row").length > 0; }, null, { timeout: 12000 }).catch(() => {});
};
const pickLevel = async (page, level) => {
  await page.evaluate((l) => document.querySelector(`#learnNextSheet [data-ln-level="${l}"]`)?.click(), level);
  await page.waitForFunction((l) => document.querySelector(`#learnNextSheet [data-ln-level="${l}"][aria-pressed="true"]`), level, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(300);
};
const info = (page) => page.evaluate(() => {
  const s = document.getElementById("learnNextSheet");
  const sw = s.querySelector("[data-ln-levels]");
  const btns = [...(sw?.querySelectorAll(".ln-level") ?? [])];
  const rowEls = [...s.querySelectorAll(".ln-row")];
  const sc = s.querySelector("[data-ln-scroll]");
  return {
    buttons: btns.map((b) => b.dataset.lnLevel), pressed: btns.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.lnLevel),
    labels: btns.map((b) => b.textContent.trim()), cut: btns.filter((b) => b.scrollWidth > b.clientWidth + 1).length, tall: Math.min(...btns.map((b) => b.getBoundingClientRect().height)),
    switchOver: sw ? sw.scrollWidth - sw.clientWidth : 0, pageOver: document.documentElement.scrollWidth - innerWidth, bodyOver: sc.scrollWidth - sc.clientWidth,
    rows: rowEls.length, first: rowEls[0]?.querySelector(".ln-ar")?.textContent, known: s.querySelectorAll(".ln-row.ln-known").length,
    vocab: s.querySelectorAll(".ln-vbtn").length, review: !!s.querySelector("[data-ln-review]"), hideLabel: s.querySelector(".ln-hide span")?.textContent.trim(),
    showing: s.querySelector("[data-ln-showing]")?.textContent.trim(), tiles: s.querySelectorAll(".ln-tile").length,
    chrome: [...s.querySelectorAll(".ln-level, .ln-hide span, .ln-showing, .ln-title")].map((e) => e.textContent).join(" | "),
  };
});

for (const [lang, width, height] of [["en", 320, 640], ["en", 390, 844], ["en", 768, 900], ["en", 1440, 900], ["bn", 320, 640], ["bn", 390, 844], ["bn", 1440, 900]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== Learn next levels ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  let fetchedLevels = 0;
  page.on("request", (rq) => { if (/learn-next-levels\.json/.test(rq.url())) fetchedLevels++; });
  await page.waitForTimeout(600);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await openWordOf(page, base.rows[0].o);
  await openSheet(page);
  let i = await info(page);
  check(`${tag} five buttons in the Word Card's order, WbW pressed; levels file NOT fetched yet`, JSON.stringify(i.buttons) === JSON.stringify(["wbw", "intermediate", "basic", "tasrif", "depth"]) && i.pressed.join() === "wbw" && fetchedLevels === 0, JSON.stringify(i) + fetchedLevels);
  check(`${tag} the switch fits ${width}px: no label cut, no sideways scroll, buttons >= 40px tall`, i.cut === 0 && i.switchOver <= 0 && i.pageOver <= 0 && i.bodyOver <= 0 && i.tall >= 40, JSON.stringify({ c: i.cut, s: i.switchOver, p: i.pageOver, b: i.bodyOver, t: i.tall }));
  check(`${tag} WbW shows the Vocabulary badge/review block as before`, i.review, JSON.stringify(i));

  for (const [level, count, unit] of [["intermediate", 1642, "root"], ["basic", levels.family.count, "family"], ["tasrif", 1642, "root"], ["depth", 1642, "root"]]) {
    await pickLevel(page, level);
    i = await info(page);
    const rows = unit === "root" ? levels.root.rows : levels.family.rows;
    check(`${tag} ${level} lists ${count} rows, first is the commonest ${unit}`, i.pressed.join() === level && i.rows === 100 && nfc(i.first) === nfc(lemmaText(rows[0].a)), JSON.stringify({ p: i.pressed, r: i.rows, f: i.first, want: lemmaText(rows[0].a) }));
    check(`${tag} ${level}: Vocabulary buttons and review only on WbW (none here)`, i.vocab === 0 && !i.review, JSON.stringify({ v: i.vocab, r: i.review }));
    if (level === "intermediate") {
      await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-tile=\"100\"]")?.click());
      await page.waitForTimeout(200);
      const j = await info(page);
      check(`${tag} Root: tile 100 says "the first 100 roots", no Learn/Practise/Step test`, /100|১০০/.test(j.showing ?? "") && (lang === "bn" ? /মূল/.test(j.showing) : /roots/.test(j.showing)) && j.vocab === 0, j.showing);
      await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-tile=\"100\"]")?.click());
    }
    if (width === 320 || width === 1440) check(`${tag} ${level}: the switch still fits`, i.cut === 0 && i.switchOver <= 0 && i.pageOver <= 0 && i.bodyOver <= 0, JSON.stringify(i));
  }
  check(`${tag} the levels file was fetched exactly once (on first leaving WbW)`, fetchedLevels === 1, String(fetchedLevels));
  await pickLevel(page, "wbw");
  i = await info(page);
  check(`${tag} back on WbW: the original list and badge return`, i.pressed.join() === "wbw" && i.review && i.rows === 100, JSON.stringify(i));
  if (lang === "bn") {
    await pickLevel(page, "basic");
    i = await info(page);
    check(`${tag} Bangla has no English left in the switch and hide line (${i.chrome})`, !/[A-Za-z]{3,}/.test(i.chrome.replace(/WbW|Taṣrīf/g, "")), i.chrome);
  }
  if (width === 390 && lang === "en") {
    // known marks: a Root mark on قَالَ (root ق و ل) makes the ROOT row known at Root level only; a WbW mark does not.
    await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-back]")?.click());
    const rooted = base.rows.find((r) => nfc(r.l) === nfc("قَالَ"));
    await openWordOf(page, rooted.o);
    const w0 = await wcount(page);
    await openTab(page, "intermediate");
    await press(page, '.word-card-side [data-word-progress-state="achieved"]');
    await page.waitForTimeout(2000);
    const wrote = (await wlog(page, w0)).filter((x) => /^quranLemmaProgress:t1__p1__intermediate__/.test(x));
    check(`${tag} POSITIVE CONTROL: the Root mark wrote a claim (${wrote.join(",")})`, wrote.length === 1, wrote.join(","));
    await openSheet(page);
    await pickLevel(page, "intermediate");
    i = await info(page);
    const marked = await page.evaluate((l) => [...document.querySelectorAll("#learnNextSheet .ln-row.ln-known")].map((r) => r.dataset.lnRow), 0);
    const rootRank = levels.root.rows.find((r) => r.l === wrote[0].split("__").pop())?.r;
    check(`${tag} a Root mark makes that ROOT's row known (rank ${rootRank}), and only it`, !!rootRank && i.known === 1 && marked.includes(String(rootRank)), JSON.stringify({ k: i.known, marked, rootRank }));
    await pickLevel(page, "wbw");
    i = await info(page);
    check(`${tag} the same Root mark leaves WbW with nothing known`, i.known === 0, String(i.known));
    await pickLevel(page, "basic");
    i = await info(page);
    check(`${tag} ...and Family with nothing known`, i.known === 0, String(i.known));
    // a Family row opens the word card of its first place (way back is the existing one)
    // Rank 1 is the same word on both lists, so pick a rank where the two lists differ (else the mutation proves nothing).
    const k = levels.family.rows.findIndex((r, ix) => ix < 50 && r.o !== base.rows[ix].o) + 1;
    check(`${tag} (setup) a rank within the first 100 where Family and WbW differ exists (${k})`, k > 0);
    await page.evaluate((k) => document.querySelector(`#learnNextSheet [data-ln-row="${k}"]`)?.click(), k);
    await page.waitForFunction(() => document.querySelector("#quranWordCardMount .quran-word-card"), null, { timeout: 8000 }).catch(() => {});
    const o = levels.family.rows[k - 1].o;
    const occ = await page.evaluate(() => document.querySelector("#quranWordCardMount .quran-word-card")?.getAttribute("data-occurrence-id") ?? document.querySelector("#quranWordCardMount [data-occurrence-id]")?.getAttribute("data-occurrence-id") ?? "");
    const s = Math.floor(o / 1000000), a = Math.floor((o % 1000000) / 1000), p = o % 1000;
    check(`${tag} a Family row opens the word card of its first place (${s}:${a}:${p})`, occ.endsWith(`:${s}:${a}:${p}`) || occ.endsWith(`${s}:${a}:${p}`), occ);
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
