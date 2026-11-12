// Bukhari "My index" (the Owner's 97 books in 8 groups) beside the original index in the Chapters pane (the Owner, "Index: All A", 12 Nov 2026).
// Data: tools/hadith-data-pull/output/myindex/bukhari.json, made from the Owner's sheet. Run from the repository root; serve.js on :8080 (QR_BASE for another).
//   --mutate=<name> serves one deliberate break; --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUT = {
  noswitch: ["js/hadith-browser.js", "if (alt) body.appendChild(renderIndexSwitch(oi, localRefresh));", ""],
  alwaysmy: ["js/hadith-myindex.js", '(oi.indexMode || "original") === mode', "true"],
  eager: ["js/hadith-browser.js", "const alt = versionUri && conc && hasMyIndex(versionUri);", "const alt = versionUri && conc && hasMyIndex(versionUri); if (alt) import('./hadith-myindex.js').then((m) => m.loadMyIndex(versionUri));"],
  wrongfirst: ["js/hadith-myindex.js", "conc?.firstNByCite?.get(b.first)", "conc?.firstNByCite?.get(b.first + 1)"],
  nobnname: ["js/hadith-myindex.js", 'lang === "bn" && o.bn &&', "false &&"],
  noheld: ["js/hadith-myindex.js", "if (oi.myIndexHeld) {", "if (false) {"],
  cutname: ["js/hadith-myindex.js", "!/[…]$/.test(o.bn)", "true"],
  everybook: ["js/hadith-myindex.js", 'export const MYINDEX_BOOKS = { "0256Bukhari.Sahih.JK000110-ara1": "bukhari" };', 'export const MYINDEX_BOOKS = { "0256Bukhari.Sahih.JK000110-ara1": "bukhari", "0261Muslim.Sahih.Shamela0001727-ara1": "bukhari" };'],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (process.argv.includes("--prove")) {
  let caught = 0;
  for (const name of Object.keys(MUT)) {
    const r = spawnSync("node", [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const failed = /FAIL/.test(r.stdout) && r.status === 1 && !/anchor missing/.test(r.stdout + r.stderr);
    if (failed) caught++;
    console.log(`  ${failed ? "CAUGHT " : "MISSED "} ${name}: ${(r.stdout.match(/FAIL .*/) || [r.stderr.split("\n")[0]])[0].slice(0, 110)}`);
  }
  console.log(`\n==== hadith-myindex mutations: ${caught} of ${Object.keys(MUT).length} caught ====`);
  process.exit(caught === Object.keys(MUT).length ? 0 : 1);
}
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

// ---- the data file, on disk
const D = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/myindex/bukhari.json", "utf8"));
const nos = Object.keys(D.books).map(Number).sort((a, b) => a - b);
const grouped = D.groups.flatMap((g) => g.books).map(Number).sort((a, b) => a - b);
check("97 books, numbered 1 to 97, each in exactly one of the 8 groups", nos.length === 97 && nos[0] === 1 && nos[96] === 97 && D.groups.length === 8 && grouped.length === 97 && grouped.every((n, i) => n === nos[i]));
const byFirst = nos.map((n) => D.books[n]).sort((a, b) => a.first - b.first);
check("the ranges run on from 1 to 7563 with no gap and no overlap", byFirst[0].first === 1 && byFirst[96].last === 7563 && byFirst.every((b, i) => b.last >= b.first && (i === 0 || b.first === byFirst[i - 1].last + 1)));
check("every book has English, Arabic and Bangla names and counts held; every group has all three names", nos.every((n) => { const b = D.books[n]; return b.en && b.ar && b.bn && b.held && b.held.range === b.last - b.first + 1; }) && D.groups.every((g) => g.en && g.ar && g.bn));
const bnCut = nos.filter((n) => /…$/.test(D.books[n].bn));
check(`the sheet's cut-short Bangla name (book ${bnCut.join(",")}) is known; it shows English until the Owner sends the full name`, bnCut.join() === "46");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const BUK = "0256Bukhari.Sahih.JK000110-ara1", MUS = "0261Muslim.Sahih.Shamela0001727-ara1";
const bnd = (n) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280], ["bn", 360]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html");
  const fetched = [];
  P.on("request", (r) => { if (r.url().includes("/output/myindex/")) fetched.push(r.url().replace(/^.*\/myindex\//, "")); });
  const press = (sel) => P.$eval(sel, (e) => { e.scrollIntoView({ block: "center" }); e.click(); }); // sticky menus cover some buttons on a phone
  await P.click('[data-hadith-tab="books"]');
  await P.waitForSelector(`[data-openiti-book="${BUK}"]`, { timeout: 25000 });
  await press(`[data-openiti-book="${BUK}"]`);
  await P.waitForSelector("[data-myindex-switch]", { timeout: 20000 }).catch(() => {});
  const sw = await P.$$eval("[data-myindex-mode]", (bs) => bs.map((b) => [b.dataset.myindexMode, b.textContent, b.getAttribute("aria-pressed"), b.getBoundingClientRect().height]));
  check(`${tag} Bukhari's Chapters pane has two buttons, original first, original pressed, each >= 40px tall`, sw.length === 2 && sw[0][0] === "original" && sw[0][2] === "true" && sw[1][2] === "false" && sw.every((s) => s[3] >= 40), JSON.stringify(sw));
  check(`${tag} ...worded in the reader's language`, sw.length === 2 && sw[0][1] === (lang === "bn" ? "মূল সূচি" : "Original index") && sw[1][1] === (lang === "bn" ? "আমার সূচি" : "My index"), JSON.stringify(sw.map((s) => s[1])));
  check(`${tag} the original index is untouched: its chapter list shows and My index does not`, (await P.$("[data-openiti-chapter]")) !== null && (await P.$("[data-myindex]")) === null);
  check(`${tag} I9: the index file was not fetched before My index was pressed`, fetched.length === 0, fetched.join());
  if (sw.length === 2) {
    await press('[data-myindex-mode="my"]');
    await P.waitForSelector("[data-myindex-group]", { timeout: 10000 });
    check(`${tag} My index fetched the file once and shows 8 groups, and no original chapter rows`, fetched.join() === "bukhari.json" && (await P.$$("[data-myindex-group]")).length === 8 && (await P.$("[data-openiti-chapter]")) === null, fetched.join());
    const g0 = await P.$eval("[data-myindex-group] .myindex-group-name", (n) => n.textContent);
    check(`${tag} the first group is named in the reader's language`, g0 === (lang === "bn" ? D.groups[0].bn : D.groups[0].en), g0);
    await P.$eval("[data-myindex-group] summary", (e) => e.click());
    const bk = await P.$$eval("[data-myindex-group]:first-of-type [data-myindex-book]", (rows) => rows.map((r) => [r.dataset.myindexBook, r.querySelector(".myindex-book-name").textContent, r.querySelector(".myindex-book-ar").textContent, r.querySelector(".hadith-row-meta").textContent]));
    const b1 = D.books[D.groups[0].books[0]], no1 = D.groups[0].books[0];
    const nm = lang === "bn" ? b1.bn : b1.en;
    check(`${tag} the first book shows number, name, the Arabic name underneath, and range and count`, bk.length === D.groups[0].books.length && bk[0][1] === `${lang === "bn" ? bnd(no1) : no1}. ${nm}` && bk[0][2] === b1.ar && bk[0][3] === `${lang === "bn" ? bnd(b1.first) : b1.first}–${lang === "bn" ? bnd(b1.last) : b1.last} · ${lang === "bn" ? bnd(b1.last - b1.first + 1) : b1.last - b1.first + 1}`, JSON.stringify(bk[0]));
    check(`${tag} no "what the app holds" line until the switch is on`, (await P.$(".myindex-held")) === null);
    await press("[data-myindex-held]");
    await P.waitForSelector(".myindex-held", { timeout: 5000 }).catch(() => {});
    await P.$eval("[data-myindex-group] summary", (e) => { if (!e.parentElement.open) e.click(); });
    const held = await P.$eval(".myindex-held", (n) => n.textContent).catch(() => "");
    const h1 = b1.held;
    check(`${tag} with the switch on, a book shows Arabic, English and Bangla counts`, held === (lang === "bn" ? `আরবি ${bnd(h1.ar)} · ইংরেজি ${bnd(h1.en)} · বাংলা ${bnd(h1.bn)}` : `Arabic ${h1.ar} · English ${h1.en} · Bangla ${h1.bn}`), held);
    await press("[data-myindex-held]"); // off again
    await P.$eval("[data-myindex-group]", (e) => { if (!e.open) e.querySelector("summary").click(); });
    await press('[data-myindex-book="2"]');
    await P.waitForTimeout(1500);
    const shown = await P.evaluate(() => ({ focused: !!document.querySelector('[data-openiti-focused="true"]'), row: document.querySelector(".hadith-reader-row.on")?.textContent ?? "" }));
    const f2 = lang === "bn" ? bnd(D.books[2].first) : String(D.books[2].first);
    check(`${tag} pressing book 2 opens its first hadith (standard number ${D.books[2].first}) as the focused card, its row marked`, shown.focused && shown.row.startsWith(f2) && !new RegExp(`^${f2}\\d`).test(shown.row), JSON.stringify(shown));
    const ov = await P.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (lang === "bn") {
      const g46 = D.groups.find((g) => g.books.map(Number).includes(46));
      const nm46 = await P.evaluate((gname) => { const d = [...document.querySelectorAll("[data-myindex-group]")].find((x) => x.dataset.myindexGroup === gname); d.open = true; return d.querySelector('[data-myindex-book="46"] .myindex-book-name').textContent; }, g46.en);
      check(`${tag} book 46's cut-short Bangla name (ends "…") is not shown: its English name is`, nm46.includes(D.books[46].en) && !nm46.includes("…"), nm46);
    }
    check(`${tag} no sideways overflow`, ov <= 0, String(ov));
  }
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
// another book has no switch
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 1280, height: 900 } });
  if (MUTATE) { const [file, a, b] = MUT[MUTATE]; await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); }); }
  const { page: P } = await openPage(ctx, "/app/hadith-collections.html");
  await P.click('[data-hadith-tab="books"]');
  await P.waitForSelector(`[data-openiti-book="${MUS}"]`, { timeout: 25000 });
  await P.$eval(`[data-openiti-book="${MUS}"]`, (e) => { e.scrollIntoView({ block: "center" }); e.click(); });
  await P.waitForSelector("[data-openiti-chapter]", { timeout: 20000 });
  check("Sahih Muslim's Chapters pane has no index switch (only Bukhari has My index)", (await P.$("[data-myindex-switch]")) === null);
  await ctx.close();
}
await browser.close();
console.log(`\n==== Bukhari My index: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
