// PCF J23 (issue #841) -- "Meanings of this word" on the Intermediate tab: every sense row carries small Arabic word
// boxes (the Owner: "why these words are not there and kept blank without the Arabic word?").
// UPDATED IN PLACE 20 Oct 2026 (PCF MSA J45, the Owner's ticks 1A 2A 3A): "Meanings of this word" became Family's purple
// column, one block per word of the row, each opening with that word in Arabic and listing every place as a chip. The
// same promise is asserted of it: each meaning's word is shown in Arabic (the block's heading), in the Qur'an font,
// right to left, inside its row, and each place is a finger-sized way to its āyah and back. The mutations are
// re-anchored on the new markup; "tiny" and "wide" now act on the place chips.
// Run from the repository root with serve.js on :8080. Mutations (--mutate=NAME) must each FAIL:
//   noboxes    no Arabic boxes are drawn                -> existence / font / tap checks fail
//   emptybox   the box prints no Arabic                 -> the "not empty" check fails
//   tiny       boxes are 20px tall                      -> the 40px check fails
//   nogoto     the box is not a way to the word         -> the tap / way-back checks fail
//   wide       boxes are forced 900px wide              -> inside-row / no-sideways checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const JS = "app/js/quran-word-card.js", HTML = "app/quranrevival.html";
const MUT = {
  noboxes: [JS, '`<p class="word-card-family-who"><span dir="rtl" lang="ar">${escapeHtml(lemmaText(form.lemma))}</span> · ', '`<p class="word-card-family-who">'],
  emptybox: [JS, '`<p class="word-card-family-who"><span dir="rtl" lang="ar">${escapeHtml(lemmaText(form.lemma))}</span> · ', '`<p class="word-card-family-who"><span dir="rtl" lang="ar"></span> · '],
  tiny: [HTML, "button.word-card-family-chip { font: inherit; font-size: 0.78rem; min-height: 36px;", "button.word-card-family-chip { font: inherit; font-size: 0.78rem; height: 20px; min-height: 0;"],
  nogoto: [JS, '"${mine ? \' aria-current="true"\' : ""} data-word-occurrence-goto="${s}:${a}:${w}"', '"${mine ? \' aria-current="true"\' : ""} data-x-goto="${s}:${a}:${w}"'],
  wide: [HTML, "button.word-card-family-chip { font: inherit; font-size: 0.78rem; min-height: 36px;", "button.word-card-family-chip { width: 900px; flex: none; max-width: 900px !important; font: inherit; font-size: 0.78rem; min-height: 36px;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function goTo(page, s, a) {
  await page.evaluate(([s, a]) => { const ss = document.getElementById("surahSelect"); if (ss.value !== String(s)) { ss.value = String(s); ss.dispatchEvent(new Event("change", { bubbles: true })); } setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = String(a); as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); }, [s, a]);
  await page.waitForFunction(([s, a]) => !!document.querySelector(`[data-word-occurrence$=":${s}:${a}:1"]`), [s, a], { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}
const measure = (page) => page.evaluate(() => {
  const rows = [...document.querySelectorAll("#quranWordCardMount [data-word-card-family-word]")].map((li) => {
    const card = li.closest(".quran-word-card").getBoundingClientRect();
    const box = li.closest("[data-word-card-meaning-group]").getBoundingClientRect();
    const lr = { left: Math.max(box.left, card.left), right: Math.min(box.right, card.right) };
    if (box.right > card.right + 0.5) lr.right = -1; // the row itself spills past the card
    const inside = (r) => r.left >= lr.left - 0.5 && r.right <= lr.right + 0.5;
    const boxes = [...li.querySelectorAll('.word-card-family-who [lang="ar"]')].map((ar) => {
      const r = ar.getBoundingClientRect();
      return { inside: inside(r), text: ar.textContent.trim(), font: getComputedStyle(ar).fontFamily, rtl: ar.getAttribute("dir") };
    });
    // UPDATED IN PLACE 21 Oct 2026 (MSA Architect): a word's later places sit behind "+ N more" as [hidden] chips, which
    // measure 0x0 and read as "0px tall, outside the row". Only the chips on screen are measured; a row still needs one.
    const chips = [...li.querySelectorAll(".word-card-family-chip")].filter((b) => !b.hidden && b.getBoundingClientRect().width > 0).map((b) => { const r = b.getBoundingClientRect(); return { h: r.height, inside: inside(r) }; });
    return { boxes, chips };
  });
  return { rows, over: document.documentElement.scrollWidth - innerWidth };
});

for (const lang of ["en", "bn"]) for (const width of [320, 390, 820, 1440]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(600);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await goTo(page, 14, 22);
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":14:22:8"]')?.click());
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount .quran-word-card"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  // Updated in place 19 Oct 2026 (five-levels change, J38/J39): "Meanings of this word" moved from the Intermediate tab to
  // FAMILY (stored id "basic"), so the sense rows are read there.
  await page.click('#quranWordCardMount [data-word-card-level="basic"]').catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll("#quranWordCardMount [data-word-card-family-word]").length > 0, null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
  const m = await measure(page);
  const all = m.rows.flatMap((r) => r.boxes);
  const chips = m.rows.flatMap((r) => r.chips);
  check(`${tag} there are word blocks, and each opens with its word in Arabic`, m.rows.length >= 2 && m.rows.every((r) => r.boxes.length === 1), JSON.stringify(m.rows.map((r) => r.boxes.length)));
  check(`${tag} each box shows real Arabic (no empty middle), right-to-left`, all.length > 0 && all.every((b) => /[؀-ۿ]/.test(b.text) && b.rtl === "rtl"), JSON.stringify(all.map((b) => b.text)));
  check(`${tag} the Arabic is in the Qur'an font`, all.length > 0 && all.every((b) => /Uthmani|Amiri|Scheherazade|Quran|Naskh|KFGQPC|Kitab|Traditional Arabic|serif/i.test(b.font)), JSON.stringify([...new Set(all.map((b) => b.font))]));
  check(`${tag} the Arabic and every place chip stay inside their row`, all.length > 0 && all.every((b) => b.inside) && chips.length > 0 && chips.every((c) => c.inside));
  check(`${tag} nothing scrolls sideways`, m.over <= 0, String(m.over));
  check(`${tag} every place chip is a finger target, at least 36px tall`, chips.length > 0 && chips.every((c) => c.h >= 35.5), JSON.stringify([...new Set(chips.map((c) => c.h))]));
  check(`${tag} every word block lists its places`, m.rows.every((r) => r.chips.length >= 1));

  if (width === 390) {
    const ref = await page.evaluate(() => document.querySelector("#quranWordCardMount .word-card-family-chip")?.dataset.wordOccurrenceGoto ?? null);
    check(`${tag} a chip carries its place`, /^\d+:\d+:\d+$/.test(ref ?? ""), String(ref));
    await page.click("#quranWordCardMount .word-card-family-chip", { timeout: 3000 }).catch(() => {});
    await page.waitForFunction(() => document.querySelector("[data-word-card-origin-back]"), null, { timeout: 5000 }).catch(() => {});
    const there = await page.evaluate(() => ({ surah: document.getElementById("surahSelect").value, ayah: document.getElementById("ayahSelect").value, back: !!document.querySelector("[data-word-card-origin-back]") }));
    check(`${tag} tapping a chip opens its place, with "Back to Word Card"`, !!ref && there.back && `${there.surah}:${there.ayah}` === ref.split(":").slice(0, 2).join(":"), JSON.stringify({ ref, there }));
    await page.click("[data-word-card-origin-back]", { timeout: 3000 }).catch(() => {});
    await page.waitForFunction(() => document.querySelector('#quranWordCardMount [role="tab"][aria-selected="true"]')?.dataset.wordCardLevel === "basic", null, { timeout: 5000 }).catch(() => {});
    const back = await page.evaluate(() => document.querySelector('#quranWordCardMount [role="tab"][aria-selected="true"]')?.dataset.wordCardLevel ?? null);
    check(`${tag} Back returns to the Word card, Family tab`, back === "basic", String(back));
  }
  await ctx.close();
}
console.log(`\n==== Word card sense Arabic boxes (J23)${MUTATE ? ` [MUTATE=${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
