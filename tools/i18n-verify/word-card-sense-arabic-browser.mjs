// PCF J23 (issue #841) -- "Meanings of this word" on the Intermediate tab: every sense row carries small Arabic word
// boxes (the Owner: "why these words are not there and kept blank without the Arabic word?").
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
  noboxes: [JS, '(boxes ? `<span class="word-card-sense-boxes"', '(false ? `<span class="word-card-sense-boxes"'],
  emptybox: [JS, '<span class="word-card-dcard-ar" dir="rtl" lang="ar">${escapeHtml(arabic)}</span><span class="word-card-sense-box-label"', '<span class="word-card-dcard-ar" dir="rtl" lang="ar"></span><span class="word-card-sense-box-label"'],
  tiny: [HTML, "word-card-sense-box { width: auto; min-height: 40px;", "word-card-sense-box { width: auto; height: 20px; min-height: 0;"],
  nogoto: [JS, '<button type="button" class="word-card-dcard word-card-sense-box" data-word-occurrence-goto=', '<button type="button" class="word-card-dcard word-card-sense-box" data-x-goto='],
  wide: [HTML, "word-card-sense-box { width: auto; min-height: 40px;", "word-card-sense-box { width: 900px; flex: none; max-width: 900px !important; min-height: 40px;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function goTo(page, s, a) {
  await page.evaluate(([s, a]) => { const ss = document.getElementById("surahSelect"); if (ss.value !== String(s)) { ss.value = String(s); ss.dispatchEvent(new Event("change", { bubbles: true })); } setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = String(a); as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); }, [s, a]);
  await page.waitForFunction(([s, a]) => !!document.querySelector(`[data-word-occurrence$=":${s}:${a}:1"]`), [s, a], { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}
const measure = (page) => page.evaluate(() => {
  const rows = [...document.querySelectorAll("#quranWordCardMount [data-word-card-sense]")].map((li) => {
    const card = li.closest(".quran-word-card").getBoundingClientRect();
    const lr = { left: Math.max(li.getBoundingClientRect().left, card.left), right: Math.min(li.getBoundingClientRect().right, card.right) };
    if (li.getBoundingClientRect().right > card.right + 0.5) lr.right = -1; // the row itself spills past the card
    const boxes = [...li.querySelectorAll(".word-card-sense-box")].map((b) => {
      const r = b.getBoundingClientRect(), ar = b.querySelector(".word-card-dcard-ar");
      return { h: r.height, w: r.width, inside: r.left >= lr.left - 0.5 && r.right <= lr.right + 0.5, text: ar?.textContent.trim() ?? "", font: ar ? getComputedStyle(ar).fontFamily : "", rtl: ar?.getAttribute("dir") };
    });
    const chips = [...li.querySelectorAll(".word-card-sense-ref")].map((b) => b.getBoundingClientRect().height);
    return { boxes, chips: chips.length };
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
  await page.click('#quranWordCardMount [data-word-card-level="intermediate"]').catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll("#quranWordCardMount [data-word-card-sense]").length > 0, null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
  const m = await measure(page);
  const all = m.rows.flatMap((r) => r.boxes);
  check(`${tag} there are sense rows, and each has at least one Arabic box`, m.rows.length >= 2 && m.rows.every((r) => r.boxes.length >= 1), JSON.stringify(m.rows.map((r) => r.boxes.length)));
  check(`${tag} each box shows real Arabic (no empty middle), right-to-left`, all.length > 0 && all.every((b) => /[؀-ۿ]/.test(b.text) && b.rtl === "rtl"), JSON.stringify(all.map((b) => b.text)));
  check(`${tag} the Arabic is in the Qur'an font`, all.length > 0 && all.every((b) => /Uthmani|Amiri|Scheherazade|Quran|Naskh|KFGQPC|Kitab|Traditional Arabic|serif/i.test(b.font)), JSON.stringify([...new Set(all.map((b) => b.font))]));
  check(`${tag} the boxes stay inside their row`, all.length > 0 && all.every((b) => b.inside));
  check(`${tag} nothing scrolls sideways`, m.over <= 0, String(m.over));
  check(`${tag} every box is at least 40px tall`, all.length > 0 && all.every((b) => b.h >= 39.5), JSON.stringify(all.map((b) => b.h)));
  check(`${tag} the place chips stay`, m.rows.every((r) => r.chips >= 1));

  if (width === 390) {
    const ref = await page.evaluate(() => document.querySelector("#quranWordCardMount .word-card-sense-box")?.dataset.wordOccurrenceGoto ?? null);
    check(`${tag} a box carries the sense's first place`, /^\d+:\d+:\d+$/.test(ref ?? ""), String(ref));
    await page.click("#quranWordCardMount .word-card-sense-box", { timeout: 3000 }).catch(() => {});
    await page.waitForFunction(() => document.querySelector("[data-word-card-origin-back]"), null, { timeout: 5000 }).catch(() => {});
    const there = await page.evaluate(() => ({ surah: document.getElementById("surahSelect").value, ayah: document.getElementById("ayahSelect").value, back: !!document.querySelector("[data-word-card-origin-back]") }));
    check(`${tag} tapping a box opens its place, with "Back to Word Card"`, !!ref && there.back && `${there.surah}:${there.ayah}` === ref.split(":").slice(0, 2).join(":"), JSON.stringify({ ref, there }));
    await page.click("[data-word-card-origin-back]", { timeout: 3000 }).catch(() => {});
    await page.waitForFunction(() => document.querySelector('#quranWordCardMount [role="tab"][aria-selected="true"]')?.dataset.wordCardLevel === "intermediate", null, { timeout: 5000 }).catch(() => {});
    const back = await page.evaluate(() => document.querySelector('#quranWordCardMount [role="tab"][aria-selected="true"]')?.dataset.wordCardLevel ?? null);
    check(`${tag} Back returns to the Word card, Intermediate tab`, back === "intermediate", String(back));
  }
  await ctx.close();
}
console.log(`\n==== Word card sense Arabic boxes (J23)${MUTATE ? ` [MUTATE=${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
