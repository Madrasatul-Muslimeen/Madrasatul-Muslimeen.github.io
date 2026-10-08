// The Owner, 8 Oct 2026: "Go ahead with clean dua words on each card" and "For Dua, I want same Quranic font."
// Each Dua card shows the supplication's own words (dua-words.js) large, in the Quranic font chosen in Options, says the
// computer picked them out and a person checks them, and keeps the whole narration one tap away with the words marked.
// A card where nothing is picked out shows its narration as before. Expected words are read from the real card data
// through dua-words.js (its own suite, dua-words.mjs, holds the hand-written values).
// Run from the repository root, serve.js on :8080.
//   --mutate=nowire  the card never picks words        -> the picked-card checks fail
//   --mutate=nofont  the words keep the page's font     -> the Quranic font check fails
//   --mutate=nomark  the narration has no marked words  -> the mark check fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
const { duaWords } = await import("../../app/js/dua-words.js");

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nowire: ["js/hadith-browser.js", "const picked = duaWords(c.text);", "const picked = null;"],
  nofont: ["js/hadith-browser.js", "words.style.fontFamily = quranFontStack();", ""],
  nomark: ["js/hadith-browser.js", "text.append(full.slice(0, picked.start), mark, full.slice(picked.end));", "text.append(full);"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const dir = "tools/hadith-data-pull/output/dua";
const cards = fs.readdirSync(dir).filter((f) => /^cards-\d+\.json$/.test(f)).flatMap((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")).cards);
const byN = new Map(cards.map((c) => [String(c.dua), c]));
check("POSITIVE CONTROL: the 3,126 cards are read", cards.length === 3126, String(cards.length));

const lum = (rgb) => { const c = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map((v) => { v = Number(v) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [lang, width, look, font] of [["en", 390, "light", null], ["bn", 390, "night", null], ["en", 1280, "night", "amiriquran"]]) {
  const tag = `[${lang} ${width} ${look}${font ? " " + font : ""}]`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
  if (font) await ctx.addInitScript((f) => { try { localStorage.setItem("mm_quran_font", f); } catch {} }, font);
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html");
  await P.evaluate((l) => document.documentElement.setAttribute("data-card-look", l), look);
  await P.click('[data-hadith-tab="dua"]');
  await P.click('[data-dua-mode="duas"]').catch(() => {});
  await P.waitForSelector("[data-dua-card]");
  await P.waitForTimeout(600);

  const shown = await P.evaluate(() => [...document.querySelectorAll("[data-dua-card]")].map((c) => ({
    n: c.dataset.duaCard,
    // Round 5a (decision 90) shows some cards WITH vowels; each word keeps its picked form in data-plain, which is
    // what is compared here (updated in place; the vowels have their own suite, dua-vowels-browser).
    words: c.querySelector("[data-dua-words]") ? [...c.querySelectorAll("[data-dua-word]")].map((w) => w.dataset.plain).join(" ") : null,
    arabicOutside: !!c.querySelector(":scope > .hadith-arabic"), note: c.querySelector(".dua-words-note")?.textContent ?? "",
    fold: c.querySelector("[data-dua-narration]") ? { open: c.querySelector("[data-dua-narration]").open } : null })));
  const want = shown.map((s) => ({ n: s.n, r: duaWords(byN.get(s.n)?.text ?? "") }));
  const picked = want.filter((w) => w.r).length;
  check(`${tag} POSITIVE CONTROL: the page has 40 cards, and on them dua-words.js picks words for some (${picked}) and not others`, shown.length === 40 && picked > 0 && picked < 40, `${shown.length} ${picked}`);
  check(`${tag} every card with picked words shows exactly those words`, want.every((w, i) => !w.r || shown[i].words === w.r.words), JSON.stringify(shown.find((s, i) => want[i].r && s.words !== want[i].r.words))?.slice(0, 200));
  check(`${tag} ...says the computer picked them and a person checks them`, want.every((w, i) => !w.r || shown[i].note === (lang === "bn" ? "কম্পিউটার দোয়ার শব্দগুলো বেছে নিয়েছে · একজন মানুষ তা যাচাই করবেন" : "Words picked out by the computer · a person checks them")));
  check(`${tag} ...and keeps the whole narration in a fold, closed`, want.every((w, i) => !w.r || (shown[i].fold && !shown[i].fold.open && !shown[i].arabicOutside)));
  check(`${tag} a card with nothing picked shows its narration as before, and says why`, want.every((w, i) => w.r || (shown[i].words === null && shown[i].arabicOutside && shown[i].note === (lang === "bn" ? "এই বর্ণনা থেকে দোয়ার শব্দগুলো এখনো আলাদা করা হয়নি।" : "The dua's own words are not picked out of this narration yet."))));

  const first = want.find((w) => w.r);
  if (first) {
    await P.evaluate((n) => { const d = document.querySelector(`[data-dua-card="${n}"] [data-dua-narration]`); d.scrollIntoView({ block: "center" }); d.querySelector("summary").click(); }, first.n);
    await P.waitForTimeout(300);
    const m = await P.evaluate((n) => {
      const c = document.querySelector(`[data-dua-card="${n}"]`), w = c.querySelector("[data-dua-words]"), mk = c.querySelector("[data-dua-narration] mark"), cs = getComputedStyle(w);
      const bg = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; } return "rgb(255,255,255)"; };
      const body = parseFloat(getComputedStyle(c.querySelector(".hadith-card-head")).fontSize);
      return { family: cs.fontFamily, size: parseFloat(cs.fontSize), body, fontReady: document.fonts.check(`20px ${cs.fontFamily.split(",")[0]}`),
        open: c.querySelector("[data-dua-narration]").open, mark: mk?.textContent ?? null,
        fg: cs.color, bg: bg(w), markFg: mk ? getComputedStyle(mk).color : null, markBg: mk ? getComputedStyle(mk).backgroundColor : null,
        cardW: c.getBoundingClientRect().width, wordsW: w.scrollWidth, wordsBox: w.clientWidth };
    }, first.n);
    const fam = font === "amiriquran" ? "QR Amiri Quran" : "QR Scheherazade";
    check(`${tag} the words are in the Quranic font chosen in Options (${fam})`, m.family.includes(fam) && m.fontReady, JSON.stringify([m.family, m.fontReady]));
    check(`${tag} ...large: at least 1.8x the card's own text`, m.size >= 1.8 * m.body, `${m.size} vs ${m.body}`);
    check(`${tag} ...readable on the card (contrast ${ratio(m.fg, m.bg).toFixed(1)} >= 4.5)`, ratio(m.fg, m.bg) >= 4.5, `${m.fg} on ${m.bg}`);
    check(`${tag} ...and never wider than their box`, m.wordsW <= m.wordsBox + 1, `${m.wordsW} > ${m.wordsBox}`);
    check(`${tag} opening the fold shows the narration with the same words marked`, m.open && m.mark === first.r.words, String(m.mark).slice(0, 80));
    check(`${tag} ...the mark readable (contrast ${m.markFg ? ratio(m.markFg, m.markBg).toFixed(1) : "-"} >= 4.5)`, !!m.markFg && ratio(m.markFg, m.markBg) >= 4.5, `${m.markFg} on ${m.markBg}`);
  } else check(`${tag} a card with picked words exists`, false);
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Dua cards: the dua's own words, Quranic font, narration one tap away: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
