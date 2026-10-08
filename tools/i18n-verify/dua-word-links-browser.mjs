// Decision 90, round 1 (the Owner, 8 Oct 2026: "Go ahead with Dua words rounds 0 and 1"): each word of a Dua card's
// words opens what the Qur'an's own data knows about the same spelling; "Open in the Word card" opens the real Word
// card at that Qur'an place, whose own "← Back to Dua n" returns to the same card (decision 86). Expected values
// written BY HAND: Dua 1's second word «أسلمت» = 2:131:7 أَسْلَمْتُ, aslamtu, root سلم.
// Run from the repository root, serve.js on :8080.
//   --mutate=nolinks   the card ignores the links file        -> the word checks fail
//   --mutate=noincard  the way back is not put inside the card -> on a phone the way back is covered
//   --mutate=noreturn  the page address is not set before leaving -> Back lands on the Hadith page's first view
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nolinks: ["js/hadith-browser.js", "const linked = !!links && links.f === duaWordsFingerprint(picked.words);", "const linked = false;"],
  noincard: ["quranrevival.html", '"", () => history.back(), { inWordCard: true });', '"", () => history.back());'],
  noreturn: ["js/hadith-browser.js", "      history.replaceState(history.state, \"\", u);\n", "\n"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const W1 = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/dua/words-1.json", "utf8"));
const linkedInDua1 = W1.duas[1].w.filter((i) => i >= 0).length;
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
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html?back=1");
  const fetched = [];
  P.on("request", (r) => { const m = /\/output\/dua\/(words-\d+\.json)/.exec(r.url()); if (m) fetched.push(m[1]); });
  await P.waitForTimeout(500);
  check(`${tag} nothing of the links is read before the Dua tab is opened (I9)`, fetched.length === 0, fetched.join());
  await P.click('[data-hadith-tab="dua"]');
  await P.waitForSelector('[data-dua-card="1"] [data-dua-word]');
  await P.waitForTimeout(300);
  const words = await P.evaluate(() => [...document.querySelectorAll('[data-dua-card="1"] [data-dua-word]')].map((s) => ({ role: s.getAttribute("role"), linked: s.classList.contains("dua-word-linked"), line: getComputedStyle(s).textDecorationLine, h: s.getBoundingClientRect().height })));
  check(`${tag} Dua 1's words are each a button; ${linkedInDua1} of ${words.length} underlined as linked (as the links file says)`, words.length === W1.duas[1].w.length && words.every((w) => w.role === "button") && words.filter((w) => w.linked && w.line.includes("underline")).length === linkedInDua1, JSON.stringify(words.slice(0, 3)));
  check(`${tag} ...each a big enough target (>= 32px tall)`, words.every((w) => w.h >= 32), String(Math.min(...words.map((w) => w.h))));
  check(`${tag} only page 1's links were read, once`, fetched.join() === "words-1.json", fetched.join());

  await P.click('[data-dua-card="1"] [data-dua-word="1"]');
  await P.waitForSelector('[data-dua-word-panel="1"]:not([hidden])', { timeout: 4000 }).catch(() => {});
  const panel = await P.evaluate(() => {
    const p = document.querySelector('[data-dua-word-panel="1"]');
    if (!p || p.hidden) return null;
    const q = p.querySelector(".dua-word-quran .dua-word-value"), bgOf = (e) => { for (; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (!/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; } return "rgb(255,255,255)"; };
    const r = p.getBoundingClientRect();
    return { text: p.innerText, quran: q?.textContent, qfont: q ? getComputedStyle(q).fontFamily : "", meanings: [...p.querySelectorAll("[class*=dua-word-meaning-]")].map((m) => m.className.match(/meaning-(\w+)/)[1]),
      href: p.querySelector("[data-dua-word-open]")?.getAttribute("href"), fg: getComputedStyle(p).color, bg: bgOf(p), inside: r.left >= 0 && r.right <= innerWidth + 0.5,
      pressed: document.querySelector('[data-dua-card="1"] [data-dua-word="1"]').getAttribute("aria-pressed") };
  });
  check(`${tag} tapping «أسلمت» opens its panel: in the Qur'an أَسْلَمْتُ, in the Quranic font`, panel?.quran === "أَسْلَمْتُ" && /QR /.test(panel.qfont) && panel.pressed === "true", JSON.stringify(panel)?.slice(0, 200));
  check(`${tag} ...sounds like "aslamtu", root سلم, dictionary word أَسْلَمَ, 2 times in the Qur'an`, !!panel && panel.text.includes("aslamtu") && panel.text.includes("سلم") && panel.text.includes("أَسْلَمَ") && panel.text.includes(lang === "bn" ? "২ বার" : "2 times"), panel?.text.slice(0, 300));
  check(`${tag} ...both meanings, ${lang === "bn" ? "Bangla" : "English"} first: "I (have) submitted (myself)", «আমি আত্মসমর্পণ করলাম»`, !!panel && panel.meanings.join() === (lang === "bn" ? "bn,en" : "en,bn") && panel.text.includes("I (have) submitted (myself)") && panel.text.includes("আমি আত্মসমর্পণ করলাম"), JSON.stringify(panel?.meanings));
  check(`${tag} ...says the computer linked it by spelling, to be checked`, !!panel && panel.text.includes(lang === "bn" ? "কম্পিউটার বানান মিলিয়ে যুক্ত করেছে" : "Linked by the computer by spelling"));
  check(`${tag} ...readable (contrast ${panel ? ratio(panel.fg, panel.bg).toFixed(1) : "-"} >= 4.5) and inside the screen`, !!panel && ratio(panel.fg, panel.bg) >= 4.5 && panel.inside, panel && `${panel.fg} on ${panel.bg}`);
  await P.click('[data-dua-card="1"] [data-dua-word="4"]');
  await P.waitForTimeout(150);
  const unl = await P.evaluate(() => document.querySelector('[data-dua-word-panel="1"]')?.innerText ?? "");
  check(`${tag} an unlinked word («وفوضت») says no Qur'an word is spelled that way`, unl.includes(lang === "bn" ? "কুরআনের কোনো শব্দের বানান এমন নয়" : "No word of the Qur'an is spelled this way"), unl.slice(0, 80));
  await P.click('[data-dua-card="1"] [data-dua-word="4"]');
  await P.waitForTimeout(150);
  check(`${tag} tapping the same word again closes the panel`, await P.evaluate(() => document.querySelector('[data-dua-word-panel="1"]').hidden));

  await P.click('[data-dua-card="1"] [data-dua-word="1"]');
  await P.waitForTimeout(150);
  check(`${tag} "Open in the Word card" points at 2:131:7, from Dua 1, with a way back`, panel?.href === "./quranrevival.html?word=2:131:7&back=1&from=dua-1", panel?.href);
  await Promise.all([P.waitForURL(/quranrevival\.html\?word=/, { timeout: 15000 }), P.click('[data-dua-word-panel="1"] [data-dua-word-open]')]).catch(() => {});
  await P.waitForFunction(() => document.querySelector("[data-word-card-close]") && /2:131:7/.test(document.querySelector("[data-word-card-content]")?.innerText ?? ""), null, { timeout: 25000 }).catch(() => {});
  await P.waitForTimeout(600);
  const wc = await P.evaluate((l) => {
    const content = document.querySelector("[data-word-card-content]"), b = document.querySelector("[data-word-card-app-back]");
    const r = b?.getBoundingClientRect();
    const reach = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest("[data-word-card-app-back]") === b : false;
    return { open: !!content && /2:131:7/.test(content.innerText), word: content?.innerText.includes("أَسْلَمْتُ"), back: b?.textContent.trim() ?? null, reach, h: r?.height ?? 0 };
  }, lang);
  check(`${tag} the Word card opens at 2:131:7 (أَسْلَمْتُ)`, wc.open && wc.word, JSON.stringify(wc));
  check(`${tag} ...with "← ${lang === "bn" ? "দুআ ১-এ ফিরে যান" : "Back to Dua 1"}" inside the card, on top and tappable (40px)`, wc.back === `← ${lang === "bn" ? "দুআ ১-এ ফিরে যান" : "Back to Dua 1"}` && wc.reach && wc.h >= 40, JSON.stringify(wc));
  if (wc.back) {
    await Promise.all([P.waitForURL(/hadith-collections\.html/, { timeout: 15000 }), P.click("[data-word-card-app-back]")]).catch(() => {});
    await P.waitForSelector('[data-dua-card="1"]', { timeout: 15000 }).catch(() => {});
    await P.waitForTimeout(600);
    const back = await P.evaluate(() => { const c = document.querySelector('[data-dua-card="1"]'), r = c?.getBoundingClientRect(); return { url: location.search, focused: !!c?.classList.contains("hadith-card-focused"), inView: !!r && r.top < innerHeight && r.bottom > 0, tab: document.querySelector('[data-hadith-tab="dua"]')?.getAttribute("aria-pressed") ?? document.querySelector('[data-hadith-tab="dua"]')?.className }; });
    check(`${tag} Back returns to the Duas, on Dua 1, picked out and in view`, back.focused && back.inView && /view=dua/.test(back.url), JSON.stringify(back));
  } else check(`${tag} Back returns to the Duas`, false, "no way back");
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Dua words open their Qur'an word, and the Word card, with the way back: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
