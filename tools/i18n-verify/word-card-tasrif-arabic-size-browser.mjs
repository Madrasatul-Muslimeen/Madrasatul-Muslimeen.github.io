// PCF MSA J61 (the Owner, 21 Oct 2026, a phone screenshot of the Word card's Taṣrīf at 12:1:5 ٱلْمُبِينِ, the chips, the
// table and the Forms line circled): "Make the Arabic bigger as the equal size of the main word itself (may be 10% less)".
// Every Arabic word in the two Taṣrīf boxes is 90% of the big word at the top of the card, at every width (that word is
// 2rem, 1.55rem at 520px and 1.3rem at 340px), and nothing it grows into is cut or pushed past the card.
// Real data, at 12:1:5. Run from the repository root with serve.js on :8080 (or QR_BASE=http://localhost:8082).
// Every mutation (--mutate=NAME) must make the suite exit 1:
//   nosize    the rule is gone (the old small sizes)                -> the 90% checks fail
//   notoken   the phone widths do not follow the big word           -> the 90% checks fail at 320/390
//   wrap      the table's cells cannot shrink their words           -> the "inside its box" checks fail at 320
//   headsize  the column heads keep their size on a 320 phone       -> the "case names whole" check fails at 320
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const HTML = "app/quranrevival.html";
const MUT = {
  nosize: [HTML, '  .word-card-noun-box [lang="ar"] { font-size: var(--wc-tasrif-ar); line-height: 1.45; }\n', ""],
  notoken: [HTML, "    .quran-word-card { --wc-head-ar: 1.55rem; }\n", ""],
  wrap: [HTML, "text-align: center; border: 1px solid var(--wc-purple-line); border-radius: 0.4rem; background: transparent; color: inherit; overflow-wrap: anywhere; min-width: 0; }",
    "text-align: center; border: 1px solid var(--wc-purple-line); border-radius: 0.4rem; background: transparent; color: inherit; white-space: nowrap; min-width: max-content; }"],
  headsize: [HTML, "@container wordcard (max-width: 20rem) { .word-card-ntable thead th { font-size: 0.64rem; } }", ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

const sizes = (page) => page.evaluate(() => {
  const m = document.querySelector("#quranWordCardMount");
  const card = m.querySelector(".quran-word-card").getBoundingClientRect();
  const head = parseFloat(getComputedStyle(m.querySelector(".word-card-arabic")).fontSize);
  const ar = [...m.querySelectorAll(".word-card-noun-box [lang='ar']")].filter((e) => e.getBoundingClientRect().width > 0);
  const where = (e) => e.closest(".word-card-nchip") ? "chip" : e.closest("th") ? "table head" : e.closest(".word-card-ncell") ? "cell" : e.closest(".word-card-nform") ? "forms" : e.closest(".word-card-nplace") ? "places" : e.closest("h4") ? "heading" : "line";
  const kinds = {};
  for (const e of ar) { const k = where(e); (kinds[k] ??= new Set()).add(parseFloat(getComputedStyle(e).fontSize)); }
  // an Arabic word is inside its own chip / cell / place button, and every box is inside the card
  const outOfBox = ar.filter((e) => {
    const box = e.closest(".word-card-nchip, .word-card-ncell, .word-card-nplace, th") ?? e.closest(".word-card-noun-box");
    const r = e.getBoundingClientRect(), b = box.getBoundingClientRect();
    return r.left < b.left - 1 || r.right > b.right + 1;
  }).map((e) => `${where(e)}:${e.textContent.trim()}`);
  const outOfCard = [...m.querySelectorAll(".word-card-noun-box, .word-card-noun-box *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.left < card.left - 0.5 || r.right > card.right + 0.5); }).length;
  // each column head's English case name is on ONE line (the text node's own line boxes, not the cell's)
  const broken = [...m.querySelectorAll(".word-card-ntable thead th")].map((th) => {
    // the English name is the head's first <span> (the Arabic is the second); an empty corner head has none
    const t = th.querySelector("span:not([lang])")?.firstChild;
    if (!t) return null;
    const r = document.createRange(); r.selectNodeContents(t);
    return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size > 1 ? t.textContent.trim() : null;
  }).filter(Boolean);
  const heads = [...m.querySelectorAll(".word-card-ntable thead th span:not([lang])")].length;
  return { heads, broken, head, kinds: Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, [...v]])), n: ar.length, outOfBox, outOfCard, over: document.documentElement.scrollWidth - innerWidth };
});

const runs = [["en", 1280], ["en", 768], ["en", 390], ["en", 320], ["bn", 1280], ["bn", 390], ["bn", 320]];
for (const [lang, width] of runs) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== Taṣrīf Arabic size [${tag}] ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(600);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await page.evaluate(() => { const ss = document.getElementById("surahSelect"); ss.value = "12"; ss.dispatchEvent(new Event("change", { bubbles: true })); setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = "1"; as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); });
  await page.waitForFunction(() => !!document.querySelector('[data-word-occurrence$=":12:1:5"]'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":12:1:5"]')?.click());
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount .quran-word-card"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.click('#quranWordCardMount [data-word-card-level="tasrif"]').catch(() => {});
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount [data-noun-cell]"), null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(600);
  // the head word's own size at this width, written by hand from the card's CSS (2rem, 1.55rem ≤ 520px, 1.3rem ≤ 340px)
  const wantHead = width <= 340 ? 20.8 : width <= 520 ? 24.8 : 32;
  const want = wantHead * 0.9;
  let s = await sizes(page);
  check(`${tag} the big word at the top is ${wantHead}px`, Math.abs(s.head - wantHead) < 0.2, String(s.head));
  const all = Object.values(s.kinds).flat();
  check(`${tag} every Arabic word in the chips, the table head and the cells is 90% of it (${want.toFixed(2)}px)`, ["chip", "table head", "cell", "heading"].every((k) => s.kinds[k]?.length) && all.every((v) => Math.abs(v - want) < 0.2), JSON.stringify(s.kinds));
  check(`${tag} every Arabic word sits inside its own chip / cell / heading`, s.outOfBox.length === 0, JSON.stringify(s.outOfBox));
  check(`${tag} every column head's case name is whole, on one line (3 names read)`, s.heads === 3 && s.broken.length === 0, JSON.stringify(s.broken));
  check(`${tag} nothing in the two boxes leaves the card, and no sideways scroll`, s.outOfCard === 0 && s.over <= 0, JSON.stringify({ c: s.outOfCard, o: s.over }));
  // A tapped box opens its Forms line and Places: they are 90% too.
  await page.evaluate(() => document.querySelector('#quranWordCardMount button[data-noun-cell="SG"], #quranWordCardMount button[data-noun-cell]')?.click());
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount [data-noun-list-form]"), null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(300);
  s = await sizes(page);
  check(`${tag} a tapped box's Forms and Places Arabic is 90% too`, s.kinds.forms?.length && s.kinds.places?.length && [...s.kinds.forms, ...s.kinds.places].every((v) => Math.abs(v - want) < 0.2), JSON.stringify(s.kinds));
  check(`${tag} with the list open, nothing leaves its box or the card`, s.outOfBox.length === 0 && s.outOfCard === 0 && s.over <= 0, JSON.stringify({ b: s.outOfBox, c: s.outOfCard, o: s.over }));
  if (process.argv.includes("--shot") && lang === "en" && width === 320) {
    await page.evaluate(() => document.documentElement.setAttribute("data-card-look", "night"));
    await page.evaluate(() => document.querySelector("#quranWordCardMount [data-word-card-noun-forms]")?.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: `${process.env.SHOT_DIR}/j61-tasrif-320-night.png` });
  }
  await ctx.close();
}
console.log(`\n==== Taṣrīf Arabic size (J61)${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
