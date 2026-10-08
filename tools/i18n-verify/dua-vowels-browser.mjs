// Decision 90, round 5a: a Dua card whose whole words are found in a vowelled text shows them WITH vowels, says where
// the vowels come from and that a person checks them, and switches to the words without vowels and back in one tap.
// The words keep working as before (each opens its Qur'an word). Expected values written BY HAND: Dua 4 = HadeethEnc
// 5502 «اللَّهُمَّ رَبَّنَا آتِنَا …»; Dua 11 = Hisn al-Muslim; Dua 1 has no vowelled source.
// Run from the repository root, serve.js on :8080.
//   --mutate=novowels  the card ignores the vowels file -> the vowel checks fail
//   --mutate=notoggle  the switch changes nothing       -> the switch checks fail
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  novowels: ["js/hadith-browser.js", "const vowelled = !!vow && vow.f ===", "const vowelled = false && vow.f ==="],
  notoggle: ["js/hadith-browser.js", "words.querySelectorAll(\"[data-dua-word]\").forEach((w) => { w.textContent = plain ? w.dataset.plain : w.dataset.vowelled; });", ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const N = (x) => String(x ?? "").normalize("NFC");
const D4 = N("اللَّهُمَّ رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ");
const D4_PLAIN = "اللهم ربنا أتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار";
const lum = (rgb) => { const c = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map((v) => { v = Number(v) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [lang, width, look] of [["en", 390, "light"], ["bn", 390, "night"], ["en", 1280, "night"]]) {
  const tag = `[${lang} ${width} ${look}]`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 860 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch {} }, look);
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html");
  const fetched = [];
  P.on("request", (r) => { const m = /\/output\/dua\/(vowels-\d+\.json)/.exec(r.url()); if (m) fetched.push(m[1]); });
  await P.waitForTimeout(400);
  check(`${tag} nothing of the vowels is read before the Dua tab is opened (I9)`, fetched.length === 0);
  await P.click('[data-hadith-tab="dua"]');
  await P.waitForSelector('[data-dua-card="4"] [data-dua-word]');
  await P.waitForTimeout(300);
  const read = (n) => P.evaluate((d) => {
    const c = document.querySelector(`[data-dua-card="${d}"]`), note = c.querySelector("[data-dua-vowels]"), sw = c.querySelector("[data-dua-vowels-toggle]");
    const bg = (e) => { for (; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (!/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; } return "rgb(255,255,255)"; };
    return { words: c.querySelector("[data-dua-words]").textContent, note: note?.textContent ?? null, src: note?.dataset.duaVowels ?? null, sw: sw ? { text: sw.textContent, h: sw.getBoundingClientRect().height, pressed: sw.getAttribute("aria-pressed") } : null,
      fg: note ? getComputedStyle(note).color : null, bg: note ? bg(note) : null };
  }, n);
  const d4 = await read(4);
  check(`${tag} Dua 4 shows its words WITH vowels (HadeethEnc 5502)`, N(d4.words) === D4 && d4.src === "hadeethenc:5502", d4.words);
  check(`${tag} ...says where the vowels come from and that a person checks them`, !!d4.note && d4.note.includes(lang === "bn" ? "শব্দে শব্দে মিলিয়েছে" : "matched word for word by the computer") && /HadeethEnc|হাদিস/.test(d4.note), d4.note);
  check(`${tag} ...readable (contrast ${d4.fg ? ratio(d4.fg, d4.bg).toFixed(1) : "-"} >= 4.5), with a 40px switch "${lang === "bn" ? "হরকত ছাড়া" : "Without vowels"}"`, !!d4.fg && ratio(d4.fg, d4.bg) >= 4.5 && d4.sw?.h >= 40 && d4.sw.text === (lang === "bn" ? "হরকত ছাড়া" : "Without vowels"), JSON.stringify(d4.sw));
  if (d4.sw) {
    await P.click('[data-dua-card="4"] [data-dua-vowels-toggle]');
    const off = await read(4);
    check(`${tag} the switch shows the words without vowels, and says "${lang === "bn" ? "হরকতসহ" : "With vowels"}"`, off.words === D4_PLAIN && off.sw.pressed === "true" && off.sw.text === (lang === "bn" ? "হরকতসহ" : "With vowels"), off.words);
    await P.click('[data-dua-card="4"] [data-dua-vowels-toggle]');
    const on = await read(4);
    check(`${tag} ...and back with vowels`, N(on.words) === D4 && on.sw.pressed === "false", on.words);
  } else check(`${tag} the switch exists`, false);
  const d11 = await read(11);
  check(`${tag} Dua 11's vowels come from Hisn al-Muslim, and say so`, d11.src === "hisn:29:4" && /Hisn al-Muslim|হিসনুল মুসলিম/.test(d11.note ?? ""), d11.note);
  const d1 = await read(1);
  check(`${tag} Dua 1 has no vowelled source: no vowels, no note, no switch (nothing is guessed)`, d1.note === null && d1.sw === null && !/[ً-ْ]/u.test(d1.words), d1.words.slice(0, 40));
  // The vowelled words still open their Qur'an word.
  await P.evaluate(() => document.querySelector('[data-dua-card="4"] [data-dua-word="1"]').scrollIntoView({ block: "center" }));
  await P.click('[data-dua-card="4"] [data-dua-word="1"]');
  await P.waitForSelector('[data-dua-word-panel="4"]:not([hidden])', { timeout: 4000 }).catch(() => {});
  const panel = await P.evaluate(() => document.querySelector('[data-dua-word-panel="4"]')?.innerText ?? "");
  check(`${tag} a vowelled word («رَبَّنَا») still opens its Qur'an word, its head written with the vowels`, N(panel).startsWith(N("رَبَّنَا")) && panel.includes(lang === "bn" ? "কুরআনে" : "In the Qur'an"), panel.slice(0, 60));
  check(`${tag} only page 1's vowels were read, once`, fetched.join() === "vowels-1.json", fetched.join());
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Dua vowels on the cards, with their source and the switch: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
