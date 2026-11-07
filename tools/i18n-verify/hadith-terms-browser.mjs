// The Hadith Study translation-terms fold (the Owner's rule of 8 Nov 2026, docs/governance/hadith-translation-terms-rule.md):
// Rabb stays Rabb, Allah stays Allah (only ilah may be "God"), our Prophet is written Rasulullah Sallallahu A'laihi Wa Sallam.
//   - the pure fold, case by case, and over ALL 2,328 HadeethEnc English hadith (never a "Lord" left where the Arabic has رب,
//     never a doubled formula, the same answer when folded twice);
//   - on the real card (HadeethEnc 6270): the folded words show, an "As sourced" switch brings back the source's own words and
//     back again, the switch is 40px tall and fits 360px at 200% text.
// Run from the repository root with serve.js on :8080. Exits 0 only when every check passed.
//   --mutate=<name> serves one deliberate break (the run must FAIL); --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUT = {
  norabb: ["js/hadith-terms.js", "if (f.rabb) { did.rabb++; return \"Rabb\"; }", "if (false) { did.rabb++; return \"Rabb\"; }"],
  godall: ["js/hadith-terms.js", "if (/\\b(no|any|another|other|false|a)\\s+$/i.test(before)) { left.god++; return m; }", ""],
  anyprophet: ["js/hadith-terms.js", "(?<![Aa] )(?<!\\\\bO )", ""],
  namedprophet: ["js/hadith-terms.js", "(?!\\\\s+(?:[A-Z][a-z]+))", ""],
  keeppeace: ["js/hadith-terms.js", "(?=[^)]{0,100}peace)", "(?=[^)]{0,100}NEVERPEACE)"],
  noswitch: ["js/hadith-terms-ui.js", "      if (!changed) return null;\n", "      return null;\n"],
  switchnoop: ["js/hadith-terms-ui.js", "for (const [node, sourced, folded] of items) node.textContent = asSourced ? sourced : folded;", ""],
  alwaysfold: ["js/hadith-terms.js", "return { rabb: /رب/.test(a), prophet: /النبي|نبي|رسول الله|رسول/.test(a) };", "return { rabb: true, prophet: true };"],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
if (process.argv.includes("--prove")) {
  const missed = []; let caught = 0;
  for (const name of Object.keys(MUT)) {
    const r = spawnSync(process.execPath, [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const out = (r.stdout || "").trim(); const ff = out.split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && ff) { caught++; console.log(`  CAUGHT  ${name}: ${ff.trim().slice(0, 130)}`); } else { missed.push(name); console.log(`  MISSED  ${name}`); }
  }
  console.log(`\n==== hadith-terms mutations: ${caught} of ${Object.keys(MUT).length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}

// The pure module, mutated in-process when a mutation is on (a data: import, with the one relative import made absolute).
let src = fs.readFileSync("app/js/hadith-terms.js", "utf8").replace('"./hadith-words.js"', JSON.stringify(new URL("../../app/js/hadith-words.js", import.meta.url).href));
if (MUTATE && MUT[MUTATE][0] === "js/hadith-terms.js") { if (!src.includes(MUT[MUTATE][1])) throw new Error(`mutation anchor missing: ${MUTATE}`); src = src.split(MUT[MUTATE][1]).join(MUT[MUTATE][2]); }
const { foldTerms, RASULULLAH } = await import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const AR = "عن ابن عباس رضي الله عنهما أن النبي صلى الله عليه وسلم قال: رب العرش العظيم";
const f = (e, a = AR) => foldTerms(e, a);
console.log("\n===== the pure fold =====");
check("Lord becomes Rabb where the Arabic has رب", f("my Lord, the Lord of the worlds").text === "my Rabb, the Rabb of the worlds");
check("Lord is LEFT where the Arabic has no رب (and counted)", f("his Lord", "قال الله").text === "his Lord" && f("his Lord", "قال الله").left.lord === 1);
check("God becomes Allah", f("O God, forgive").text === "O Allah, forgive");
check('"no God" and "any other God" stay (an ilah may be God)', f("there is no God but You").text === "there is no God but You" && f("do not call on any other God").text === "do not call on any other God");
check("the Prophet with the peace formula becomes exactly Rasulullah Sallallahu A'laihi Wa Sallam", f("the Prophet (may Allah's peace and blessings be upon him) said").text === `${RASULULLAH} said`, f("the Prophet (may Allah's peace and blessings be upon him) said").text);
check("the curly-apostrophe and comma forms of the formula too", f("the Prophet (may Allah’s peace and blessings be upon him) said").text === `${RASULULLAH} said` && f("the Prophet, may Allah's peace and blessings be upon him, said").text.startsWith(RASULULLAH));
check("the Messenger of Allah and Allah's Messenger become Rasulullah Sallallahu A'laihi Wa Sallam", f("the Messenger of Allah said").text === `${RASULULLAH} said` && f("Allah's Messenger said").text === `${RASULULLAH} said`);
check('"O Messenger of Allah" (a call) becomes "O Rasulullah"', f("O Messenger of Allah, I said").text === "O Rasulullah, I said");
check('"a Prophet", "the Prophets" and "O Prophet" are not changed', f("a Prophet came").text === "a Prophet came" && f("the Prophets said").text === "the Prophets said" && f("[O Prophet] a clear conquest").text === "[O Prophet] a clear conquest");
check("another prophet by name is not changed", f("the Prophet Musa spoke and Prophet Dawūd (peace be upon him)").text === "the Prophet Musa spoke and Prophet Dawūd (peace be upon him)");
check("the ﷺ sign (alone or in brackets) after the Prophet, the Messenger of Allah or Allah's Apostle is folded", f("the Prophet (ﷺ) said").text === `${RASULULLAH} said` && f("Allah's Messenger (ﷺ) said").text === `${RASULULLAH} said` && f("Allah's Apostle ﷺ said").text === `${RASULULLAH} said`);
check('a call to him ("O Allah\'s Apostle!", "O Messenger of Allah") is "O Rasulullah"', f("He said: O Allah's Apostle! O Messenger of Allah,").text === "He said: O Rasulullah! O Rasulullah,");
check("with no Prophet word in the Arabic nothing is guessed", f("the Prophet said", "قال زيد").text === "the Prophet said");
check("no doubled formula, and folding twice changes nothing more", !f("the Messenger of Allah (may Allah's peace and blessings be upon him) said").text.includes("(may") && f(f("the Prophet (may Allah's peace and blessings be upon him) said").text).text === f("the Prophet (may Allah's peace and blessings be upon him) said").text);

console.log("\n===== all 2,328 HadeethEnc English hadith =====");
{
  const D = "tools/hadith-data-pull/output/hadeethenc/"; const ar = {};
  for (const file of fs.readdirSync(D + "ar")) { if (!/^cat-/.test(file)) continue; for (const h of JSON.parse(fs.readFileSync(D + "ar/" + file, "utf8")).hadiths) ar[h.id] = [h.hadeeth, h.explanation, ...(h.hints || [])].join(" "); }
  let n = 0, rabb = 0, ras = 0, badLord = 0, doubled = 0, notIdem = 0, peaceLeft = 0;
  for (const file of fs.readdirSync(D + "en")) { if (!/^cat-/.test(file)) continue;
    for (const h of JSON.parse(fs.readFileSync(D + "en/" + file, "utf8")).hadiths) { n++;
      for (const t of [h.title, h.hadeeth, h.explanation, ...(h.hints || [])]) { if (!t) continue; const r = foldTerms(t, ar[h.id]);
        rabb += r.did.rabb; ras += r.did.rasulullah;
        if (/\bLord\b/.test(r.text) && /رب/.test((ar[h.id] || "").replace(/[ً-ٰٟ]/g, ""))) badLord++;
        if (/Rasulullah Sallallahu A'laihi Wa Sallam\s*\((?:may|peace)/.test(r.text)) doubled++;
        if (r.text.includes(`${RASULULLAH} (may`)) peaceLeft++;
        if (foldTerms(r.text, ar[h.id]).text !== r.text) notIdem++; } } }
  check("every hadith was read (2,328)", n === 2328, String(n));
  check("Rabb: at least 700 changes (the corpus has ~770 'Lord')", rabb >= 700, String(rabb));
  check("Rasulullah Sallallahu A'laihi Wa Sallam: at least 8,000 changes", ras >= 8000, String(ras));
  check("no 'Lord' is left where the Arabic of that hadith has رب", badLord === 0, String(badLord));
  check("no formula is followed by the old peace formula (3 source parentheticals have no closing bracket and stay as sourced)", doubled <= 3 && peaceLeft <= 3, `${doubled}/${peaceLeft}`);
  check("folding twice gives the same text, in every field of every hadith", notIdem === 0, String(notIdem));
}

console.log("\n===== on the real card (HadeethEnc 6270) =====");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function open(width, zoom = 1) {
  const ctx = await newContext(browser, { appLang: "en", viewport: { width, height: 800 } });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const s = fs.readFileSync(`app/${file}`, "utf8"); if (!s.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: s.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/hadith-study.html?resume=hadith:hadeethenc:6270");
  if (zoom !== 1) await page.evaluate((z) => { document.documentElement.style.fontSize = `${16 * z}px`; }, zoom);
  await page.waitForSelector('[data-hadeethenc-card="6270"] .hadith-translation-text', { timeout: 25000 }).catch(() => {});
  return { ctx, page, errors };
}
for (const [width, zoom] of [[1280, 1], [360, 2]]) {
  const tag = `[en ${width}px x${zoom}]`;
  const { ctx, page: P, errors } = await open(width, zoom);
  const text = () => P.$eval('[data-hadeethenc-card="6270"] .hadith-translation-text', (n) => n.textContent);
  const folded = await text();
  check(`${tag} the card shows Rasulullah Sallallahu A'laihi Wa Sallam, not "the Prophet (may…"`, folded.includes("Rasulullah Sallallahu A'laihi Wa Sallam reported") || folded.includes("Rasulullah Sallallahu A'laihi Wa Sallam said") || folded.includes("Rasulullah Sallallahu A'laihi Wa Sallam") && !/the Prophet \(may/.test(folded), folded.slice(0, 160));
  check(`${tag} the card shows Rabb, not Lord`, /Rabb of the great Throne/.test(folded) && !/\bLord\b/.test(folded), folded.slice(-190));
  check(`${tag} Allah is untouched`, /Allah the Great/.test(folded));
  check(`${tag} the title is folded too`, !/\bLord\b/.test(await P.$eval('[data-hadeethenc-card="6270"] .hadith-row-name', (n) => n.textContent)));
  const sw = await P.$("[data-hadith-terms-switch]");
  check(`${tag} an "As sourced" switch is there`, !!sw);
  if (sw) {
    check(`${tag} the switch is at least 40px tall`, (await sw.evaluate((n) => n.getBoundingClientRect().height)) >= 39.5);
    check(`${tag} it starts OFF`, (await sw.getAttribute("aria-expanded")) === "false");
    await sw.click();
    const sourced = await text();
    check(`${tag} ON shows the source's own words (the Prophet (may…, Lord)`, /the Prophet \(may Allah's peace and blessings be upon him\)/.test(sourced) && /Lord of the great Throne/.test(sourced), sourced.slice(0, 120));
    check(`${tag} ON reads ON`, (await sw.getAttribute("aria-expanded")) === "true");
    await sw.click();
    check(`${tag} OFF folds again`, (await text()) === folded);
    check(`${tag} the card fits the screen`, (await P.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
  }
  check(`${tag} the Arabic is untouched (still has its vowels and النبي)`, await P.$eval('[data-hadeethenc-card="6270"] .hadith-arabic', (n) => n.textContent.replace(/[\u064B-\u065F\u0670]/g, "").includes("النبي") && /[\u064B-\u065F]/.test(n.textContent)));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== hadith-terms: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
