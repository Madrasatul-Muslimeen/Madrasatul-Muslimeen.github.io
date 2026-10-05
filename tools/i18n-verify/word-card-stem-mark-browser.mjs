// 5 Oct 2026, Owner: the STEM (a word's main part) stands out all over the Word
// card while "Colour word parts" is on -- a soft glow ONLY on the big word at
// the top; glow + highlighter on the meaning, the legend, the Stem box and the
// Dictionary word box. Both card looks. en and bn, 390 and 1280.
// Expected values are written by hand, never read from the code under test.
// Run from the repository root with `node serve.js` running.
//   --mutate-no-mark   strips data-stem-mark from the card: the marking checks must fail.
//   --mutate-highlight-head  gives the top word the highlighter band too: the "glow only" check must fail.
//   --shots            screenshots to /tmp/stem-mark-*.png
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const MUT_MARK = process.argv.includes("--mutate-no-mark");
const MUT_HEAD = process.argv.includes("--mutate-highlight-head");
const SHOTS = process.argv.includes("--shots");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function openWord(page, position) {
  await page.evaluate(() => document.querySelector("[data-word-card-close]")?.click());
  await page.waitForTimeout(250);
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(600);
  await page.evaluate(() => { const s = document.getElementById("ayahSelect"); if (s && s.value !== "7") { s.value = "7"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction((p) => !!document.querySelector(`[data-word-occurrence$=":1:7:${p}"]`), position, { timeout: 8000 }).catch(() => {});
  await page.evaluate((p) => { document.querySelector(`[data-word-occurrence$=":1:7:${p}"]`)?.click(); }, position);
  await page.waitForFunction((p) => document.querySelector("#quranWordCardMount .quran-word-card")?.dataset.occurrenceId?.endsWith(`:1:7:${p}`) && !!document.querySelector("#quranWordCardMount [data-word-card-parts]"), position, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
}

const look = (page) => page.evaluate(() => {
  const root = document.querySelector("#quranWordCardMount .quran-word-card");
  if (!root) return null;
  const cs = (el) => el ? getComputedStyle(el) : null;
  const head = root.querySelector(".word-card-arabic");
  const headStem = head?.querySelector(".word-card-segment-stem");
  const headOther = head?.querySelector(".word-card-segment:not(.word-card-segment-stem)");
  const glossStem = root.querySelector(".word-card-gloss-segment.word-card-segment-stem");
  const legendStem = [...root.querySelectorAll(".word-card-segment-legend-item")].find((i) => i.querySelector(".word-card-segment-stem"));
  const parts = [...root.querySelectorAll("[data-word-card-part]")].map((p) => ({ id: p.dataset.wordCardPart, bg: cs(p).backgroundImage, shadow: cs(p).boxShadow }));
  const dict = root.querySelector('[data-word-card-fact="dict"]');
  const form = root.querySelector('[data-word-card-fact="form"]');
  // the letters still join: the coloured word is as wide as the same text printed plain
  let joinDelta = null;
  if (head) { const c = head.cloneNode(); c.textContent = head.textContent; c.style.display = "inline-block"; const h2 = head.cloneNode(true); h2.style.display = "inline-block"; head.after(c, h2); joinDelta = Math.abs(c.getBoundingClientRect().width - h2.getBoundingClientRect().width); c.remove(); h2.remove(); }
  return {
    mark: root.hasAttribute("data-stem-mark"),
    headStemBg: cs(headStem)?.backgroundImage ?? null, headOtherBg: cs(headOther)?.backgroundImage ?? null,
    glossStemBg: cs(glossStem)?.backgroundImage ?? null, glossStemShadow: cs(glossStem)?.boxShadow ?? null,
    legendBg: cs(legendStem)?.backgroundImage ?? null,
    parts, dictBg: cs(dict)?.backgroundImage ?? null, dictShadow: cs(dict)?.boxShadow ?? null, formBg: cs(form)?.backgroundImage ?? null,
    joinDelta, sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

for (const lang of ["en", "bn"]) for (const width of [390, 1280]) for (const cardLook of ["night", "light"]) {
  const L = `${lang}/${width}/${cardLook}`;
  console.log(`\n=== ${L} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
  await ctx.addInitScript((lk) => { try { localStorage.setItem("mm_card_look", lk); localStorage.setItem("mm_word_segments_colour", "1"); } catch {} }, cardLook);
  if (MUT_MARK || MUT_HEAD) {
    await ctx.route(MUT_MARK ? "**/js/quran-word-card.js" : "**/quranrevival.html", async (route) => {
      const res = await route.fetch(); const src = await res.text();
      const body = MUT_MARK
        ? src.replace('${showSegmentColour ? " data-stem-mark" : ""}', "")
        : src.replace(".quran-word-card[data-stem-mark] .word-card-arabic .word-card-segment-stem { background: radial-gradient(ellipse 60% 34% at 50% 58%, rgba(134, 217, 171, 0.34), rgba(134, 217, 171, 0) 100%); }",
            ".quran-word-card[data-stem-mark] .word-card-arabic .word-card-segment-stem { background: linear-gradient(transparent 50%, rgba(134, 217, 171, 0.32) 50%) !important; }");
      if (body === src) throw new Error("mutation did not apply");
      await route.fulfill({ response: res, body });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(600);
  const green = cardLook === "night" ? "134, 217, 171" : "46, 160, 90";

  // 1:7:6 -- determiner + noun stem
  await openWord(page, 6);
  let m = await look(page);
  check(`[${L}] the card opened on 1:7:6`, !!m);
  if (m) {
    check(`[${L}] the card carries the stem mark while Colour word parts is on`, m.mark);
    check(`[${L}] top word: the stem has a soft round glow`, /radial-gradient/.test(m.headStemBg ?? "") && (m.headStemBg ?? "").includes(green), m.headStemBg);
    check(`[${L}] top word: glow ONLY, no highlighter band`, !/linear-gradient/.test(m.headStemBg ?? ""), m.headStemBg);
    check(`[${L}] top word: the determiner is not marked`, m.headOtherBg === "none", m.headOtherBg);
    check(`[${L}] meaning: the stem words have the highlighter band`, /linear-gradient/.test(m.glossStemBg ?? "") && (m.glossStemBg ?? "").includes(green), m.glossStemBg);
    check(`[${L}] meaning: and the glow`, /rgba\(/.test(m.glossStemShadow ?? "") && m.glossStemShadow !== "none", m.glossStemShadow);
    check(`[${L}] legend: "stem" is highlighted`, /linear-gradient/.test(m.legendBg ?? ""), m.legendBg);
    const stemParts = m.parts.filter((p) => p.bg !== "none");
    check(`[${L}] exactly one part box is marked, and it is the stem`, stemParts.length === 1 && stemParts[0].id.startsWith("stem-"), JSON.stringify(m.parts.map((p) => p.id + ":" + (p.bg !== "none"))));
    check(`[${L}] the Stem box has the top band, the green edge and the glow`, (stemParts[0]?.shadow ?? "").includes("inset") && /rgb\(79, 176, 124\)/.test(stemParts[0]?.shadow ?? "") && /rgba\(29, 138, 78, 0\.18\)/.test(stemParts[0]?.shadow ?? ""), stemParts[0]?.shadow);
    check(`[${L}] the Dictionary word box is marked the same way`, /linear-gradient/.test(m.dictBg ?? "") && (m.dictShadow ?? "").includes("inset"), `${m.dictBg} ${m.dictShadow}`);
    check(`[${L}] the Form box is not marked`, m.formBg === "none" || m.formBg === null, m.formBg);
    check(`[${L}] the Arabic letters still join (same width as plain)`, m.joinDelta !== null && m.joinDelta < 0.5, m.joinDelta);
    check(`[${L}] no sideways scroll`, m.sideways <= 0, m.sideways);
    if (SHOTS) await page.locator("#quranWordCardMount .quran-word-card").screenshot({ path: `/tmp/stem-mark-${lang}-${width}-${cardLook}.png` });
  }
  // 1:7:3 -- a verb stem with an ending
  await openWord(page, 3);
  m = await look(page);
  if (m) {
    const stemParts = m.parts.filter((p) => p.bg !== "none");
    check(`[${L}] verb 1:7:3: only the verb's stem box is marked`, stemParts.length === 1 && stemParts[0].id === "stem-V", JSON.stringify(m.parts.map((p) => p.id + ":" + (p.bg !== "none"))));
    check(`[${L}] verb 1:7:3: top word glow`, /radial-gradient/.test(m.headStemBg ?? ""), m.headStemBg);
  } else check(`[${L}] verb 1:7:3 opened`, false);
  // Basic: the top word and the Dictionary word box keep the mark
  await page.click('#quranWordCardMount [data-word-card-level="basic"]').catch(() => {});
  await page.waitForTimeout(500);
  m = await look(page);
  check(`[${L}] Basic: top word glow and Dictionary word box still marked`, !!m && /radial-gradient/.test(m.headStemBg ?? "") && /linear-gradient/.test(m.dictBg ?? ""), m && `${m.headStemBg} ${m.dictBg}`);
  // Colour word parts OFF: nothing is marked
  await page.evaluate(() => { const t = document.querySelector("#quranWordCardMount [data-word-card-colour-toggle]"); if (t) { t.checked = false; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(500);
  m = await look(page);
  check(`[${L}] Colour word parts off: no stem mark anywhere`, !!m && !m.mark && (m.dictBg === "none" || m.dictBg === null) && m.parts.every((p) => p.bg === "none"), m && `${m.mark} ${m.dictBg}`);
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
