// Round 5b (decision 91, issue 662): tapping a dua word no Qur'an word is spelled like shows the "Grammar suggestion
// (computer, to be checked)" block: dictionary word (Quranic font), root, part of speech in plain words, and the two
// dictionary links at the root. The grammar file is a FIXTURE here (served at grammar-1.json from the real
// fingerprint), so this suite tests the card, not the generated data (dua-word-grammar.mjs tests that).
// Hand-written expected values: Dua 1's word 4 «وفوضت» is unlinked; fixture root فوض -> Buckwalter fwD.
// Run from the repository root, serve.js on :8080.
//   --mutate=nogram   the block is not shown               -> the block/links checks fail
//   --mutate=nofp     the fingerprint is not compared      -> the "stale file is ignored" check fails
//   --mutate=rawpos   the raw tag is shown, not plain words -> the part-of-speech checks fail
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nogram: ["js/hadith-browser.js", "    if (grammar) panel.appendChild(duaGrammarBlock(grammar));\n", "\n"],
  nofp: ["js/hadith-browser.js", "idx < 0 && gram?.f === links.f ?", "idx < 0 && gram ?"],
  rawpos: ["js/hadith-browser.js", "t(duaGrammarPosLabel(pos))", "pos"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const fp = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/dua/words-1.json", "utf8")).duas;
const GOOD = { schemaVersion: 1, page: 1, tool: "fixture", duas: { 1: { f: fp[1].f, g: { 4: ["فَوَّضَ", "فوض", "verb", "فَوَّضْتُ"] } }, 2: { f: "stale-fingerprint", g: { 9: ["x", "ابت", "noun", "x"] } } } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function context(lang, width, look) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 860 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("**/output/dua/grammar-1.json*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(GOOD) }));
  await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch {} }, look);
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  return ctx;
}
async function tap(P, dua, i) {
  await P.evaluate(([d, w]) => document.querySelector(`[data-dua-card="${d}"] [data-dua-word="${w}"]`).scrollIntoView({ block: "center" }), [dua, i]);
  await P.click(`[data-dua-card="${dua}"] [data-dua-word="${i}"]`);
  await P.waitForSelector(`[data-dua-word-panel="${dua}"]:not([hidden])`, { timeout: 4000 }).catch(() => {});
}
const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

for (const [lang, width, look] of [["en", 390, "light"], ["bn", 390, "night"], ["en", 1280, "night"]]) {
  const tag = `[${lang} ${width} ${look}]`;
  const ctx = await context(lang, width, look);
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html?back=1");
  await P.click('[data-hadith-tab="dua"]');
  await P.waitForSelector('[data-dua-card="1"] [data-dua-word]');
  await tap(P, 1, 4);
  await P.waitForSelector('[data-dua-word-panel="1"] [data-dua-word-dict="ejtaal"]', { timeout: 6000 }).catch(() => {});
  const r = await P.evaluate(() => {
    const p = document.querySelector('[data-dua-word-panel="1"]'), b = p.querySelector("[data-dua-word-grammar]");
    const box = (e) => { const x = e.getBoundingClientRect(); return [Math.round(x.width), Math.round(x.height)]; };
    const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    let bg = b, bgc = [0, 0, 0, 0];
    while (bg && !(bgc = (getComputedStyle(bg).backgroundColor.match(/[\d.]+/g) || []).map(Number), bgc.length < 4 || bgc[3] > 0.5)) bg = bg.parentElement;
    const lab = b?.querySelector(".dua-word-label");
    const lemma = b?.querySelector(".dua-word-lemma .dua-word-value");
    return { has: !!b, head: b?.querySelector(".dua-also-head")?.textContent, text: b?.innerText ?? "", lemmaFont: lemma ? getComputedStyle(lemma).fontFamily : "", lemmaLang: lemma?.lang,
      dicts: [...(b?.querySelectorAll("[data-dua-word-dict]") ?? [])].map((a) => [a.dataset.duaWordDict, a.getAttribute("href"), a.target, box(a)]),
      fg: lab ? rgb(getComputedStyle(lab).color) : [], bgc: bgc.length ? bgc.slice(0, 3) : [255, 255, 255], wide: p.scrollWidth > p.clientWidth + 1 || (b ? b.scrollWidth > b.clientWidth + 1 : false),
      past: b ? b.getBoundingClientRect().right > p.getBoundingClientRect().right + 1 : true, other: !!document.querySelector('[data-dua-word-panel="2"] [data-dua-word-grammar]') };
  });
  check(`${tag} tapping an unlinked word shows the block "${lang === "bn" ? "ব্যাকরণের প্রস্তাব" : "Grammar suggestion (computer, to be checked)"}"`, r.has && r.head === (lang === "bn" ? "ব্যাকরণের প্রস্তাব (কম্পিউটারের, যাচাই করা হবে)" : "Grammar suggestion (computer, to be checked)"), r.head);
  check(`${tag} the dictionary word فَوَّضَ is in the Quranic font, marked Arabic`, r.text.includes("فَوَّضَ") && r.lemmaLang === "ar" && /quran|uthman|amiri|scheherazade|naskh|arab/i.test(r.lemmaFont), r.lemmaFont);
  check(`${tag} the root فوض is shown`, r.text.includes("فوض"));
  check(`${tag} the part of speech is plain words (${lang === "bn" ? "ক্রিয়া" : "Verb"}), not the tag "verb"`, r.text.includes(lang === "bn" ? "ক্রিয়া" : "Verb") && !/\bverb\b/.test(r.text), r.text);
  check(`${tag} the two dictionaries open at the root: Quranic Arabic Corpus (q=fwD) and Lane · Hans Wehr (bwq=fwD), new tab`,
    r.dicts.length === 2 && r.dicts[0][1] === "https://corpus.quran.com/qurandictionary.jsp?q=fwD" && r.dicts[1][1] === "https://ejtaal.net/aa/#bwq=fwD" && r.dicts.every((d) => d[2] === "_blank"), JSON.stringify(r.dicts));
  check(`${tag} the dictionary buttons are at least 40px tall`, r.dicts.length === 2 && r.dicts.every((d) => d[3][1] >= 40), JSON.stringify(r.dicts.map((d) => d[3])));
  const cr = r.fg.length === 3 ? ratio(r.fg, r.bgc) : 0;
  check(`${tag} contrast of the labels is at least 4.5:1 (${cr.toFixed(2)})`, cr >= 4.5, JSON.stringify([r.fg, r.bgc]));
  check(`${tag} nothing is wider than the card`, r.has && !r.wide && !r.past);
  // A stale fingerprint (Dua 2's file entry) must not be used for another dua's words.
  await tap(P, 2, 9);
  check(`${tag} a grammar entry whose fingerprint does not match is ignored`, !(await P.evaluate(() => !!document.querySelector('[data-dua-word-panel="2"] [data-dua-word-grammar]'))));
  // A LINKED word shows no suggestion.
  await tap(P, 1, 1);
  check(`${tag} a word linked to the Qur'an shows no grammar suggestion`, !(await P.evaluate(() => !!document.querySelector('[data-dua-word-panel="1"] [data-dua-word-grammar]'))));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Dua word grammar card: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
