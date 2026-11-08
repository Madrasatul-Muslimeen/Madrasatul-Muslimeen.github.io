// D24 (PCF MSA J104): the Dua Word Card's levels. A dua word no Qur'an word is spelled like opens the card with the
// levels WbW / Root / Family / Taṣrīf / Depth, ‹ n / N › to move between the dua's words, and "Back to the dua".
// The grammar file is a FIXTURE (as in dua-word-grammar-browser): Dua 1 word 4 «فَوَّضَ» verb, root فوض (not a Qur'an lemma
// here -> "No dictionary entry yet"); word 7 a noun of the SAME root; word 8 the particle «مِن» (a real entry in the
// English dictionary -> its meaning and the Wiktionary credit).
// Run from the repository root, serve.js on :8080.
//   --mutate=nosuggest the suggested Wiktionary meaning is not shown -> the suggested-meaning check fails
//   --mutate=nolevels  the level bar is not built       -> the five-levels / level-switch checks fail
//   --mutate=nokin     Family lists nothing             -> the Family checks fail
//   --mutate=nostep    the ‹ › buttons do nothing       -> the word-step checks fail
//   --mutate=nodict    the meaning is never looked up   -> the meaning/credit checks fail
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nosuggest: ["js/dua-word-card.js", "        if (wik) {", "        if (false) {"],
  nolevels: ["js/dua-word-card.js", "  for (const id of DUA_WORD_LEVELS) {", "  for (const id of []) {"],
  nokin: ["js/dua-word-card.js", "family.filter((w) => w.i !== here && w.grammar?.[1] === root)", "[]"],
  nostep: ["js/dua-word-card.js", 'b.addEventListener("click", () => go?.((here + d + family.length) % Math.max(1, family.length)));', ""],
  nodict: ["js/dua-word-card.js", "  if (!lemma) return { en: null, bn: null };", "  return { en: null, bn: null };"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const fp = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/dua/words-1.json", "utf8")).duas;
const GOOD = { schemaVersion: 1, page: 1, tool: "fixture", duas: { 1: { f: fp[1].f, g: {
  4: ["فَوَّضَ", "فوض", "verb", "فَوَّضْتُ"], 7: ["تَفْوِيض", "فوض", "noun", "تَفْوِيضِي"], 8: ["مِن", "", "particle", "مِنْ"] } } } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function context(lang, width) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 860 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("**/output/dua/grammar-1.json*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(GOOD) }));
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript", body: src.replace(a, b) }); });
  }
  return ctx;
}
const P1 = '[data-dua-word-panel="1"]';
async function tap(P, i) {
  await P.evaluate((w) => document.querySelector(`[data-dua-card="1"] [data-dua-word="${w}"]`).scrollIntoView({ block: "center" }), i);
  await P.click(`[data-dua-card="1"] [data-dua-word="${i}"]`);
  await P.waitForSelector(`${P1}:not([hidden]) [data-dua-wc]`, { timeout: 5000 }).catch(() => {});
}
const shown = (P) => P.evaluate((s) => document.querySelector(`${s} [data-dua-wc-shown]`)?.dataset.duaWcShown ?? null, P1);
const text = (P) => P.evaluate((s) => document.querySelector(`${s} .dua-wc-body`)?.innerText ?? "", P1);

for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await context(lang, width);
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html?back=1");
  await P.click('[data-hadith-tab="dua"]');
  await P.waitForSelector('[data-dua-card="1"] [data-dua-word]');
  await tap(P, 4);
  const lv = await P.evaluate((s) => [...document.querySelectorAll(`${s} [data-dua-wc-level]`)].map((b) => [b.dataset.duaWcLevel, b.getBoundingClientRect().height, b.getAttribute("aria-pressed")]), P1);
  check(`${tag} five levels in order WbW, Root, Family, Taṣrīf, Depth`, lv.map((x) => x[0]).join() === "wbw,root,family,tasrif,depth", JSON.stringify(lv));
  check(`${tag} WbW is the open level and every level button is at least 40px tall`, lv[0]?.[2] === "true" && lv.every((x) => x[1] >= 40), JSON.stringify(lv));
  check(`${tag} WbW holds the grammar block and the progress block`, await P.evaluate((s) => !!document.querySelector(`${s} .dua-wc-body [data-dua-word-grammar]`) && !!document.querySelector(`${s} .dua-wc-body [data-dua-word-progress]`), P1));
  await P.waitForSelector(`${P1} .dua-wc-nodict`, { timeout: 8000 }).catch(() => {});
  // 9 Nov 2026 (tick 17 A): a word with no Qur'an dictionary form now shows Wiktionary's suggested meaning, marked "to be checked".
  await P.waitForSelector(`${P1} .dua-word-meaning-suggested`, { timeout: 8000 }).catch(() => {});
  check(`${tag} a word with no Qur'an dictionary form shows a SUGGESTED meaning, marked to be checked, not a settled one`, await P.evaluate((s) => { const b = document.querySelector(`${s} .dua-wc-body`); return !!b?.querySelector(".dua-word-meaning-suggested .dua-word-value")?.textContent.trim() && !b.querySelector(".dua-word-meaning-en") && /to be checked/i.test(b.querySelector(".dua-wc-suggested-note")?.textContent ?? "") || /যাচাই করা হবে/.test(b?.querySelector(".dua-wc-suggested-note")?.textContent ?? ""); }, P1));
  await P.click(`${P1} [data-dua-wc-level="root"]`);
  check(`${tag} Root shows the root فوض`, (await shown(P)) === "root" && (await text(P)).includes("فوض"));
  await P.click(`${P1} [data-dua-wc-level="family"]`);
  const kin = await P.evaluate((s) => [...document.querySelectorAll(`${s} [data-dua-wc-kin]`)].map((b) => b.dataset.duaWcKin), P1);
  check(`${tag} Family lists the other word of the same root (word 7) and not itself or other roots`, kin.join() === "7", kin.join());
  await P.click(`${P1} [data-dua-wc-kin="7"]`);
  await P.waitForSelector(`${P1}:not([hidden]) [data-dua-wc]`);
  check(`${tag} tapping a family word opens that word's card (word 7 is pressed)`, await P.evaluate(() => document.querySelector('[data-dua-card="1"] [data-dua-word="7"]').getAttribute("aria-pressed") === "true" && document.querySelector('[data-dua-card="1"] [data-dua-word="4"]').getAttribute("aria-pressed") === "false"));
  await P.click(`${P1} [data-dua-wc-level="tasrif"]`);
  check(`${tag} Taṣrīf of a noun says it is not applicable`, (await text(P)).length > 0 && await P.evaluate((s) => !!document.querySelector(`${s} .dua-wc-notas`), P1));
  await P.click(`${P1} [data-dua-wc-level="depth"]`);
  check(`${tag} Depth opens and says what comes later`, (await shown(P)) === "depth" && await P.evaluate((s) => !!document.querySelector(`${s} .dua-wc-depth`), P1));
  // ‹ › move between the dua's words (a grammar word that is not unlinked: 8 is the next with grammar? steps go to the next word of the dua, linked or not).
  const before = await P.evaluate((s) => document.querySelector(`${s} .dua-wc-count`)?.textContent, P1);
  await P.click(`${P1} [data-dua-wc-next]`);
  await P.waitForSelector(`${P1}:not([hidden])`);
  const after = await P.evaluate((s) => document.querySelector(`${s} .dua-wc-count`)?.textContent ?? document.querySelector(`${s} .dua-word-panel-ar`)?.textContent, P1);
  check(`${tag} › moves to the next word (was ${before}, now ${after})`, !!before && after !== before, `${before} -> ${after}`);
  // Word 8 («مِن»): its meaning comes from the English dictionary, with the credit.
  // › from word 7 landed on word 8, so its card is already open.
  await P.waitForSelector(`${P1} .dua-word-meaning-en`, { timeout: 8000 }).catch(() => {});
  const m = await text(P);
  check(`${tag} a word whose dictionary form is in the dictionary shows its meaning and the Wiktionary credit`, /partitive|of, some of/.test(m) && /Wiktionary|উইকশনারি/.test(m), m.slice(0, 160));
  if (lang === "bn") check(`${tag} the card is in Bangla (Back to the dua / level names)`, /দুআয় ফিরুন/.test(await P.evaluate((s) => document.querySelector(s).innerText, P1)));
  const g = await P.evaluate((s) => { const p = document.querySelector(s); return { wide: p.scrollWidth > p.clientWidth + 1 }; }, P1);
  check(`${tag} nothing is wider than the card`, !g.wide);
  await P.click(`${P1} [data-dua-wc-back]`);
  check(`${tag} "Back to the dua" closes the card and returns to the word`, await P.evaluate((s) => document.querySelector(s).hidden && document.activeElement?.dataset?.duaWord === "8", P1));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
// Pure (tick 17 A): the Wiktionary lookup picks by part of speech, ignores vowel marks, and says nothing for a form it lacks.
const { wiktionaryGlosses } = await import("../../app/js/dua-word-card.js");
const wd = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/dua/wiktionary-meanings.json", "utf8"));
check("a verb form gets a verb gloss (فَوَّض, verb)", /^to /.test(wiktionaryGlosses(wd, "فَوَّض", "verb") ?? ""), String(wiktionaryGlosses(wd, "فَوَّض", "verb")));
check("the same letters get the noun gloss for a noun, and it differs from the verb's (بُخْل)", !!wiktionaryGlosses(wd, "بُخْل", "noun") && wiktionaryGlosses(wd, "بُخْل", "noun") !== wiktionaryGlosses(wd, "بُخْل", "verb"));
check("a form Wiktionary lacks gives null, never a made-up meaning", wiktionaryGlosses(wd, "ءءءءء", "noun") === null && wiktionaryGlosses(null, "بخل", "noun") === null);
console.log(`\n==== Dua Word Card levels: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
