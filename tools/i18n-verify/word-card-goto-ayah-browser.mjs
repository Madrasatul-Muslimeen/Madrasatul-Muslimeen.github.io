// PCF MSA J57 -- the Word card's "Go to its āyah" (the Owner, 21 Oct 2026: "we need a button in WbW to bring the Ayah
// where this word belongs to (choose an Ayah from the first appearance)"). Real data, the Owner's own path: Study →
// Vocabulary → a word in Learn next → its Word card → Go to its āyah → Back to Word Card.
// Run from the repository root with `node serve.js` running:  node tools/i18n-verify/word-card-goto-ayah-browser.mjs [--mutate=NAME]
// Every check is proven by its own mutation (--mutate=NAME must make the named check FAIL, exit 1):
//   nobutton   the button is not drawn                     -> "the WbW level has Go to its āyah"
//   wrongref   the button points at the next word          -> "it names the word's own place"
//   nocolor    the button is painted in a literal navy     -> "painted in the card's purple token"
//   noclose    the card stays open over the āyah           -> "the card closes and the āyah shows"
//   noback     no way back is offered                      -> "Back to Word Card is offered"
//   bnleak     the Bangla label is missing                 -> "Bangla has no English"
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const CARD = "app/js/quran-word-card.js", PAGE = "app/quranrevival.html";
const MUT = {
  nobutton: [CARD, "      ${goToItsAyahButton(word, context, text, formatNumber)}\n", ""],
  wrongref: [CARD, 'data-word-occurrence-goto="${s}:${a}:${w}">${escapeHtml(label)}', 'data-word-occurrence-goto="${s}:${a}:${w + 1}">${escapeHtml(label)}'],
  nocolor: [PAGE, "background: transparent; color: var(--wc-purple-ink); border: 1.5px solid var(--wc-purple-ink);", "background: transparent; color: #1f3a6d; border: 1.5px solid #1f3a6d;"],
  noclose: [PAGE, "      quranWordCardState = closeWordCard(quranWordCardState);\n      clearWordCardMounts();\n      quranWordCardTarget =", "      quranWordCardTarget ="],
  noback: [PAGE, "      bar.hidden = false;\n    }\n\n    /** The āyah an occurrence link opened", "      bar.hidden = true;\n    }\n\n    /** The āyah an occurrence link opened"],
  bnleak: ["app/js/i18n/bn.js", '  "Go to its āyah {ref}": "এর আয়াতে যান {ref}",\n', ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const rows = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/learn-next.json", "utf8")).rows;
const r1 = rows[0];
const FIRST = `${Math.floor(r1.o / 1000000)}:${Math.floor((r1.o % 1000000) / 1000)}:${r1.o % 1000}`; // word 1's first place
const sleep = (page, ms) => page.waitForTimeout(ms);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

for (const [lang, width, height] of [["en", 390, 844], ["en", 320, 640], ["en", 768, 900], ["en", 1280, 900], ["bn", 390, 844]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== Word card · Go to its āyah ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 600);
  // The Owner's path: Study → Vocabulary (Learn next) → word 1.
  if (!(await page.evaluate(() => (document.getElementById("tabVocabularyBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await sleep(page, 150); }
  await page.click("#tabVocabularyBtn");
  await page.waitForFunction(() => document.querySelectorAll("#learnNextSheet .ln-row").length > 0, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-row="1"]')?.click());
  await page.waitForSelector("#quranWordCardMount .quran-word-card", { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(() => !!document.querySelector("#quranWordCardMount .word-card-goto-ayah, #quranWordCardMount .word-card-practise"), null, { timeout: 8000 }).catch(() => {});
  await sleep(page, 600);
  const b = await page.evaluate(() => {
    const btn = document.querySelector("#quranWordCardMount .word-card-goto-ayah");
    if (!btn) return null;
    const r = btn.getBoundingClientRect(), c = getComputedStyle(btn);
    const card = btn.closest(".quran-word-card"), probe = document.createElement("span");
    card.appendChild(probe); probe.style.color = "var(--wc-purple-ink)"; const want = getComputedStyle(probe).color; probe.remove();
    const scroller = btn.closest(".word-card-content");
    const sr = scroller?.getBoundingClientRect();
    return { text: btn.textContent.trim(), ref: btn.dataset.wordOccurrenceGoto, h: r.height, w: r.width, color: c.color, border: c.borderTopColor, want,
      inside: r.left >= (card.getBoundingClientRect().left - 0.5) && r.right <= (card.getBoundingClientRect().right + 0.5),
      panel: document.querySelector("#quranWordCardMount [data-word-card-panel]")?.dataset.wordCardPanel,
      hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  check(`${tag} the WbW level has Go to its āyah, 44px+, inside the card, no sideways scroll`, !!b && b.panel === "wbw" && b.h >= 44 && b.inside && b.hscroll <= 0, JSON.stringify(b));
  check(`${tag} it names the word's own place, here word 1's first appearance (${FIRST})`, b?.ref === FIRST, `${b?.ref} vs ${FIRST}`);
  check(`${tag} painted in the card's purple token (text and border EQUAL --wc-purple-ink)`, !!b && b.color === b.want && b.border === b.want, JSON.stringify(b && [b.color, b.border, b.want]));
  if (lang === "bn") check(`${tag} Bangla has no English in the label`, !!b && !/[A-Za-z]{2,}/.test(b.text) && /আয়াত/.test(b.text), b?.text);
  else check(`${tag} the label reads "Go to its āyah 2:3"`, !!b && b.text === `Go to its āyah ${FIRST.split(":").slice(0, 2).join(":")}`, b?.text);

  await page.evaluate(() => document.querySelector("#quranWordCardMount .word-card-goto-ayah")?.click());
  await sleep(page, 1200);
  const after = await page.evaluate((first) => {
    const [s, a, p] = first.split(":");
    const card = document.querySelector("#quranWordCardMount .quran-word-card");
    const word = [...document.querySelectorAll(`#readView [data-word-occurrence="quran-word-occurrence:v1:${s}:${a}:${p}"]`)].find((el) => el.getClientRects().length);
    const r = word?.getBoundingClientRect();
    const bar = document.getElementById("wordCardReturnBar");
    return { cardOpen: !!card && card.getClientRects().length > 0, wordShown: !!r && r.top >= 0 && r.bottom <= innerHeight && r.width > 0,
      ringed: (document.getElementById("wordCardTargetStyle")?.textContent ?? "").includes(`${s}:${a}:${p}"]`),
      bar: !!bar && !bar.hidden && bar.getClientRects().length > 0, barText: bar?.textContent.trim() ?? "" };
  }, FIRST);
  check(`${tag} the card closes and the āyah shows, with the word on screen and ringed`, !after.cardOpen && after.wordShown && after.ringed, JSON.stringify(after));
  check(`${tag} Back to Word Card is offered, naming the place`, after.bar && after.barText.replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d)).includes(FIRST), after.barText);

  await page.evaluate(() => document.querySelector("#wordCardReturnBar [data-word-card-origin-back]")?.click());
  await page.waitForSelector("#quranWordCardMount .quran-word-card", { timeout: 8000 }).catch(() => {});
  await sleep(page, 800);
  const back = await page.evaluate(() => ({ open: !!document.querySelector("#quranWordCardMount .quran-word-card"), panel: document.querySelector("#quranWordCardMount [data-word-card-panel]")?.dataset.wordCardPanel, btn: !!document.querySelector("#quranWordCardMount .word-card-goto-ayah") }));
  check(`${tag} Back to Word Card brings the same card back at WbW (the way-back law)`, back.open && back.panel === "wbw" && back.btn, JSON.stringify(back));
  if (width === 390 && lang === "en") await page.screenshot({ path: "/tmp/word-card-goto-ayah-390.png" });
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
