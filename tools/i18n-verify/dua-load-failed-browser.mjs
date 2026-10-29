// MSA audit part 130 (F2): offline, the Dua tab printed the browser's own English ("Failed to fetch") under its heading
// and no dua opened. Now a failed Dua load shows the app's one plain read-failure sentence (errors.js, audit part 128) in
// the reader's language, with a Try again button that really loads again.
//
// The Dua data files are cut off with route.abort("internetdisconnected"), which is what the browser does offline. The
// expected sentences are read out of errors.js and bn.js, not retyped, so they cannot drift.
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/dua-load-failed-browser.mjs
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

const EXE = process.env.CHROMIUM_PATH || undefined;
const KEY = "That information could not be loaded ({code}). Please check your connection and try again.";
const ERRORS = fs.readFileSync("app/js/errors.js", "utf8");
const BN = fs.readFileSync("app/js/i18n/bn.js", "utf8");
let passed = 0, failed = 0;
async function acheck(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error("false"); passed++; console.log(`  PASS  ${name}`); }
  catch (e) { failed++; console.log(`  FAIL  ${name} -- ${e.message}`); }
}
function bnValue(key) {
  const i = BN.indexOf(JSON.stringify(key) + ":");
  if (i < 0) throw new Error("no bn key");
  const m = /^\s*"((?:[^"\\]|\\.)*)"/.exec(BN.slice(i + JSON.stringify(key).length + 1));
  return JSON.parse(`"${m[1]}"`);
}
const digits = (s, lang) => lang === "bn" ? s.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]) : s;

console.log("\n===== the sentence the Dua tab must show =====");
await acheck("positive control: errors.js still has the read-failure sentence the Dua tab uses", () => { if (!ERRORS.includes(JSON.stringify(KEY))) throw new Error("missing"); });
await acheck("positive control: bn.js translates it", () => { if (!/[ঀ-৿]/.test(bnValue(KEY))) throw new Error("no Bangla"); });

const DATA = /\/tools\/hadith-data-pull\/output\/(dua|openiti-release)\//;
for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1440], ["bn", 1440]]) {
  console.log(`\n===== Dua data cut off (${lang}, ${width}px) =====`);
  const want = (lang === "bn" ? bnValue(KEY) : KEY).replace("{code}", "unknown");
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
  let offline = true;
  await ctx.route(DATA, (route) => offline ? route.abort("internetdisconnected") : route.continue());
  const { page } = await openPage(ctx, "/app/hadith-collections.html");
  const failedBox = () => page.evaluate(() => {
    const b = document.querySelector("[data-dua-load-failed]");
    const btn = b?.querySelector("[data-dua-retry]");
    const r = btn?.getBoundingClientRect();
    return b ? { text: b.querySelector("p")?.textContent ?? "", btn: btn?.textContent ?? "", h: r?.height ?? 0, w: r?.width ?? 0,
      inView: r ? r.left >= 0 && r.right <= innerWidth : false } : null;
  });
  const pageHasRaw = () => page.evaluate(() => /Failed to fetch|ERR_INTERNET|TypeError/.test(document.body.innerText));

  await page.click('[data-hadith-tab="dua"]');
  await page.waitForSelector("[data-dua-load-failed]", { timeout: 15000 }).catch(() => {});
  const one = await failedBox();
  await acheck("Duas: a failed load shows the plain sentence, in this language", () => { if (one?.text !== digits(want, lang) && one?.text !== want) throw new Error(JSON.stringify(one)); });
  await acheck("Duas: the browser's own English ('Failed to fetch') is nowhere on the page", async () => { if (await pageHasRaw()) throw new Error("raw text shown"); });
  await acheck("Duas: a Try again button, translated, finger-sized (at least 36px tall) and on screen", () => {
    const label = lang === "bn" ? bnValue("Try again") : "Try again";
    if (one?.btn !== label || one.h < 36 || !one.inView) throw new Error(JSON.stringify(one));
  });
  offline = false;
  await page.click("[data-dua-retry]");
  await acheck("Duas: Try again, once the line is back, loads the 40 cards of the page", async () => {
    await page.waitForSelector("[data-dua-card]", { timeout: 20000 });
    const n = await page.$$eval("[data-dua-card]", (r) => r.length);
    if (n !== 40 || await page.$("[data-dua-load-failed]")) throw new Error(`${n}`);
  });

  offline = true;
  // The chapter list reads the Dua index (cached by now) and then each book's own index -- cut that off.
  await page.click('[data-dua-mode="chapters"]');
  await page.waitForSelector("[data-dua-book]", { timeout: 15000 }).catch(() => {});
  await page.click("[data-dua-book]").catch(() => {});
  await page.waitForSelector("[data-dua-load-failed]", { timeout: 15000 }).catch(() => {});
  const two = await failedBox();
  await acheck("Dua chapters: a book whose index cannot load shows the same plain sentence and Try again", () => { if ((one?.text ?? "") !== (two?.text ?? "-") || !two?.btn) throw new Error(JSON.stringify(two)); });
  await acheck("Dua chapters: no 'Failed to fetch' either", async () => { if (await pageHasRaw()) throw new Error("raw text shown"); });
  offline = false;
  await page.click("[data-dua-retry]").catch(() => {});
  await acheck("Dua chapters: Try again loads the book's Dua chapters", async () => {
    await page.waitForSelector("[data-dua-chapter]", { timeout: 20000 });
    if (await page.$("[data-dua-load-failed]")) throw new Error("still failed");
  });
  await browser.close();
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
