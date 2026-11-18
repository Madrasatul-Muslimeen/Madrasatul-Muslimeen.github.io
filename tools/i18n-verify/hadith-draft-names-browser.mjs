// Draft English chapter names for the Hadith Books (the Owner, 18 Nov 2026: "You draft the chapter names, make it editable by me. For all books").
// Data: one file per book (tools/hadith-data-pull/output/chapter-names-en/<versionUri>.json), every chapter that has a title has a draft.
// Page: the chapter rows show the draft in English beside the Arabic with a "draft" tag; the names editor starts the English box from the draft
//   (the owner corrects it and saves it as their own); saving only a Bangla name does NOT confirm the draft as the owner's own.
// Run from the repository root with serve.js on :8080.   --mutate=<name> serves one deliberate break; --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUT = {
  nodraft: ["js/hadith-browser.js", "  if (hasDraftNames(versionUri)) {", "  if (false) {"],
  nomark: ["js/hadith-browser.js", "        e.appendChild(mark);\n", ""],
  noprefill: ["js/hadith-names.js", "inputEn.value = cur?.en || draft || \"\";", "inputEn.value = cur?.en || \"\";"],
  confirmdraft: ["js/hadith-names.js", "(inputEn.dataset.hadithNamesDraft != null && inputEn.value === draft && input.value.trim()) ? \"\" : inputEn.value", "inputEn.value"],
  noawait: ["js/hadith-names.js", "await loadDraftNames(versionUri).catch(() => {});", ""],
  nohear: ["js/hadith-browser.js", "mark = el(\"span\", \"hadith-draft-mark\", t(\"draft\")); // read aloud too", "mark = el(\"span\", \"hadith-draft-mark\", t(\"draft\")); mark.setAttribute(\"aria-hidden\", \"true\"); // read aloud too"],
  ownlose: ["js/hadith-browser.js", "if (!d || !row || row.querySelector(\"[data-openiti-chapter-en]\")) continue;", "if (!d || !row) continue;"],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
if (process.argv.includes("--prove")) {
  const missed = []; let caught = 0;
  for (const name of Object.keys(MUT)) {
    const r = spawnSync(process.execPath, [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const ff = (r.stdout || "").split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && ff && !/mutation anchor missing/.test(ff)) { caught++; console.log(`  CAUGHT  ${name}: ${ff.trim().slice(0, 130)}`); } else { missed.push(name); console.log(`  MISSED  ${name}`); }
  }
  console.log(`\n==== hadith-draft-names mutations: ${caught} of ${caught + missed.length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

// ---- 1. the data: every titled chapter of every book has a draft ---------------
{
  const split = "tools/hadith-data-pull/output/openiti-release/split/", out = "tools/hadith-data-pull/output/chapter-names-en/";
  const src = fs.readFileSync("app/js/hadith-draft-names.js", "utf8");
  const listed = [...src.matchAll(/^  "(0[^"]+)",$/gm)].map((m) => m[1]);
  const books = fs.readdirSync(split).filter((b) => b.startsWith("0"));
  check(`the app's list names exactly the ${books.length} books that have a draft file`, JSON.stringify([...listed].sort()) === JSON.stringify([...books].sort()), `${listed.length} listed`);
  let bad = [];
  for (const b of books) {
    const idx = JSON.parse(fs.readFileSync(`${split}${b}/index.json`, "utf8"));
    const want = idx.chapters.filter((c) => String(c.title ?? "").trim()).map((c) => c.id);
    const have = JSON.parse(fs.readFileSync(`${out}${b}.json`, "utf8"));
    const miss = want.filter((id) => !String(have[id] ?? "").trim());
    const extra = Object.keys(have).filter((id) => !want.includes(id));
    const arabicLeft = Object.values(have).filter((v) => /[؀-ۿ]/.test(v)).length;
    if (miss.length || extra.length || arabicLeft > 3) bad.push(`${b}: ${miss.length} missing, ${extra.length} extra, ${arabicLeft} still Arabic`);
  }
  check("every titled chapter has a draft, none is for a chapter the book lacks, and the drafts are English", bad.length === 0, bad.join("; "));
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const MUS = "0261Muslim.Sahih.Shamela0001727-ara1";
async function open(lang, width, seedJs = "", { book = MUS, delayDrafts = 0 } = {}) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: "window.__stubApplyUpdates = true;" + seedJs });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    if (!fs.readFileSync(`app/${file}`, "utf8").includes(a)) { console.log(`  FAIL  mutation anchor missing: ${MUTATE}`); process.exit(1); }
    await ctx.route(`**/app/${file}*`, (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: fs.readFileSync(`app/${file}`, "utf8").split(a).join(b) }));
  }
  if (delayDrafts) await ctx.route("**/chapter-names-en/*.json", async (r) => { await new Promise((ok) => setTimeout(ok, delayDrafts)); await r.continue(); });
  const { page, errors } = await openPage(ctx, "/app/hadith-study.html");
  await page.waitForSelector(`[data-openiti-book="${book}"]`, { state: "attached" });
  await page.click(`[data-openiti-book="${book}"]`);
  await page.waitForSelector("[data-openiti-chapter]", { state: "attached" });
  await page.waitForTimeout(900);
  return { ctx, page, errors };
}
const settle = (p, ms = 250) => p.waitForTimeout(ms);
const press = (p, sel) => p.$eval(sel, (e) => { e.scrollIntoView({ block: "center" }); e.click(); }).catch(() => console.log(`  note: could not press ${sel}`));

// ---- 2. the rows ------------------------------------------------------------------------------------------------------------------
for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width} rows]`;
  const { ctx, page: P } = await open(lang, width);
  const rows = await P.evaluate(() => [...document.querySelectorAll("[data-openiti-chapter]")].slice(0, 6).map((r) => { const e = r.querySelector("[data-draft]"); const m = e?.querySelector(".hadith-draft-mark"); const b = e?.getBoundingClientRect(); return { en: e?.textContent ?? null, lang: e?.lang, mark: m?.textContent ?? null, markVisible: !!m && m.getClientRects().length > 0, title: e?.title ?? "", w: b?.width ?? 0, inside: b ? b.right <= document.documentElement.clientWidth + 0.5 : false }; }));
  check(`${tag} the chapter rows show an English draft name with a "draft" tag`, rows.filter((r) => r.en && r.markVisible).length >= 5, JSON.stringify(rows.slice(0, 2)));
  check(`${tag} the draft is marked as English text and says it is to be checked`, rows.every((r) => !r.en || (r.lang === "en" && r.title.length > 5)));
  check(`${tag} nothing runs outside the screen`, rows.every((r) => !r.en || r.inside));
  if (width === 390 || width === 1280) await P.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/draft-${lang}-${width}.png` });
  await ctx.close();
}

// ---- 3. the editor starts from the draft; a Bangla-only save does not confirm it ----------------------------------------------------
{
  const tag = "[en 1280 editor]";
  const { ctx, page: P } = await open("en", 1280);
  await press(P, '[data-reader-tool="actions"]'); await P.waitForSelector("[data-hadith-names-open]", { timeout: 8000 }).catch(() => {});
  await press(P, "[data-hadith-names-open]"); await P.waitForSelector("[data-hadith-names-row]", { state: "attached", timeout: 8000 }).catch(() => {});
  await settle(P);
  const first = await P.evaluate(() => { const row = [...document.querySelectorAll("[data-hadith-names-row]")].find((r) => r.querySelector("[data-hadith-names-draft]")); if (!row) return null; const en = row.querySelector("[data-hadith-names-en]"); return { key: row.dataset.hadithNamesRow, en: en.value }; });
  check(`${tag} the English box of a chapter starts from the draft (the owner corrects it)`, !!first && first.en.length > 3, JSON.stringify(first));
  if (first) {
    await P.fill(`[data-hadith-names-row="${first.key}"] [data-hadith-names-bn]`, "অধ্যায়");
    await P.evaluate((k) => document.querySelector(`[data-hadith-names-row="${k}"] [data-hadith-names-save]`).click(), first.key);
    await settle(P, 600);
    const w = await P.evaluate(() => JSON.stringify(window.__stubWriteData || []));
    check(`${tag} saving only a Bangla name does NOT save the draft English as the owner's own`, w.includes("অধ্যায়") && !w.includes(`"en":"${first.en}"`), w.slice(0, 300));
  }
  await ctx.close();
}
// ---- 3b. the editor opened before the draft file arrived still starts from the draft ----------------------------------------------------
{
  const tag = "[en 1280 slow draft]";
  const { ctx, page: P } = await open("en", 1280, "", { delayDrafts: 1500 });
  await press(P, '[data-reader-tool="actions"]'); await P.waitForSelector("[data-hadith-names-open]", { timeout: 8000 }).catch(() => {});
  await press(P, "[data-hadith-names-open]"); await P.waitForSelector("[data-hadith-names-row] [data-hadith-names-draft]", { state: "attached", timeout: 12000 }).catch(() => {});
  const v = await P.evaluate(() => { const e = document.querySelector("[data-hadith-names-row] [data-hadith-names-draft]"); return e ? e.value : null; });
  check(`${tag} opening Edit names while the draft file is still on its way: the English box still starts from the draft`, !!v && v.length > 3, String(v));
  await ctx.close();
}
// ---- 3c. a screen reader hears the draft tag ----------------------------------------------------------------------------------------------
{
  const tag = "[en 390 a11y]";
  const { ctx, page: P } = await open("en", 390);
  const hid = await P.evaluate(() => { const m = document.querySelector(".hadith-draft-mark"); return m ? { text: m.textContent, hidden: !!m.closest("[aria-hidden='true']") } : null; });
  check(`${tag} the "draft" tag is in the accessibility tree (not aria-hidden)`, !!hid && hid.text.length > 0 && !hid.hidden, JSON.stringify(hid));
  await ctx.close();
}
// ---- 3d. Bukhari's Sahih: its rows have English drafts on the Original index too (the exact-start MyIndex lookup only matched 5 of 100) ----------
{
  const tag = "[en 1280 Bukhari]";
  const { ctx, page: P } = await open("en", 1280, "", { book: "0256Bukhari.Sahih.JK000110-ara1" });
  await settle(P, 800);
  const r = await P.evaluate(() => { const rows = [...document.querySelectorAll("[data-openiti-chapter]")]; const en = rows.map((x) => x.querySelector("[data-openiti-chapter-en]")?.textContent ?? ""); return { rows: rows.length, withEn: en.filter(Boolean).length, ghusl: en[rows.findIndex((x) => /الغسل/.test(x.textContent))] ?? null }; });
  check(`${tag} (nearly) every chapter row has an English name`, r.rows > 20 && r.withEn >= r.rows - 1, JSON.stringify(r));
  check(`${tag} the Ghusl chapter (which starts at 245 in this index, 248 in MyIndex) reads as the full bath`, /Full Bath/i.test(r.ghusl ?? ""), JSON.stringify(r));
  await ctx.close();
}

// ---- 4. a name the madrasah typed beats the draft (no second English line, no draft tag on that row) -----------------------------------
{
  const tag = "[en 1280 own name]";
  const key = `${MUS.replace(/\./g, "_")}__ch-3`;
  const seed = `DATA.hadithNames = [{ _id: "t1", tenantId: "t1", schemaVersion: 1, createdBy: "test-uid", names: { "${key}": { bn: "", en: "Checked name", status: "active" } } }];`;
  const { ctx, page: P } = await open("en", 1280, seed);
  const row = await P.evaluate(() => { const r = document.querySelector('[data-openiti-chapter="ch-3"]'); return r ? { lines: [...r.querySelectorAll("[data-openiti-chapter-en]")].map((e) => e.textContent), draft: !!r.querySelector("[data-draft]") } : null; });
  check(`${tag} the typed English name shows once, with no draft tag`, !!row && row.lines.length === 1 && row.lines[0] === "Checked name" && !row.draft, JSON.stringify(row));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Hadith draft names: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
