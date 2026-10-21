// PCF MSA J61 part 2 (the Owner, 21 Oct 2026: "Arabic bigger in Tasrif? Yes. And to other places where it was that
// small."): the verb Taṣrīf section's Arabic -- its title, the toggle's three tense names, each table's lead line, the
// pronouns and the verbs -- is 90% of the big word at the top of the card (2rem, 1.55rem at 520px, 1.3rem at 340px), as
// part 1 did for nouns. The one-tense view keeps its larger sizes (verbs 2rem, pronouns at least 1.35rem). On a 320px
// phone the toggle keeps every tense name whole ("Command" broke as "Comma / nd" before J61 too).
// Real data, at 1:5:2 نَعْبُدُ. Run from the repository root with serve.js on :8080 (or QR_BASE=http://localhost:8082).
// Every mutation (--mutate=NAME) must make the suite exit 1:
//   nosize    the size rule is gone (the old 45-65% sizes)            -> the 90% checks fail
//   notoken   the section's token is gone                            -> the 90% checks fail
//   onepron   the one-tense view's pronouns lose their floor          -> the one-tense pronoun check fails at 390
//   btn       the toggle's buttons keep their padding and type at 320 -> the "whole names" checks fail at 320
//   cols      the toggle keeps four equal columns at 320              -> the "inside its button" check fails at 320
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const HTML = "app/quranrevival.html";
const MUT = {
  nosize: [HTML, "  .word-card-acc-ar > span[lang], .word-card-conj-toggle button small, .word-card-cj-lead, .word-card-cj-pr .word-card-ar, .word-card-cj-vb, .word-card-cj-mood .word-card-ar { font-size: var(--wc-tasrif-ar); }\n", ""],
  notoken: [HTML, '  .word-card-acc[data-word-card-sec="conj"] { --wc-tasrif-ar: calc(var(--wc-head-ar) * 0.9); }\n', ""],
  onepron: [HTML, "  .word-card-cj-one .word-card-cj-pr .word-card-ar { font-size: max(1.35rem, var(--wc-tasrif-ar)); }\n", ""],
  btn: [HTML, "    .word-card-conj-toggle button { padding: 4px 1px; font-size: 0.8rem; }\n", ""],
  cols: [HTML, " grid-template-columns: repeat(4, auto); }", " }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

const measure = (page) => page.evaluate(() => {
  const m = document.querySelector("#quranWordCardMount");
  const card = m.querySelector(".quran-word-card").getBoundingClientRect();
  const head = parseFloat(getComputedStyle(m.querySelector(".word-card-arabic")).fontSize);
  const shown = (s) => [...m.querySelectorAll(s)].filter((x) => x.getBoundingClientRect().width > 0);
  const sz = (s) => [...new Set(shown(s).map((x) => parseFloat(getComputedStyle(x).fontSize)))];
  const lines = (node) => { const r = document.createRange(); r.selectNodeContents(node); return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size; };
  const buttons = shown(".word-card-conj-toggle button");
  // a tense name is whole when its text sits on one line: the English text node and the Arabic <small>
  const broken = buttons.flatMap((b) => [b.firstChild, b.querySelector("small")].filter(Boolean).filter((n) => lines(n) > 1).map((n) => n.textContent.trim()));
  // the button's content fits inside it (no clipped or spilled name)
  const spill = buttons.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent.trim());
  const cellSpill = shown(".word-card-cj-vb, .word-card-cj-pr").filter((c) => c.scrollWidth > c.clientWidth + 1).length;
  const outOfCard = shown("[data-word-card-sec='conj'], [data-word-card-sec='conj'] *").filter((x) => { const r = x.getBoundingClientRect(); return r.left < card.left - 0.5 || r.right > card.right + 0.5; }).length;
  return {
    head, vb: sz(".word-card-cj-vb"), pr: sz(".word-card-cj-pr .word-card-ar"), lead: sz(".word-card-cj-lead"),
    tog: sz(".word-card-conj-toggle small"), acc: sz(".word-card-acc-ar > span[lang]"), nToggle: buttons.length,
    one: !!m.querySelector("[data-word-card-conj-single]"), broken, spill, cellSpill, outOfCard, over: document.documentElement.scrollWidth - innerWidth,
  };
});
const near = (arr, v) => arr.length > 0 && arr.every((x) => Math.abs(x - v) < 0.2);

const runs = [["en", 1280], ["en", 768], ["en", 390], ["en", 320], ["bn", 1280], ["bn", 390], ["bn", 320]];
for (const [lang, width] of runs) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== Taṣrīf verb Arabic size [${tag}] ===`);
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
  await page.evaluate(() => { const ss = document.getElementById("surahSelect"); ss.value = "1"; ss.dispatchEvent(new Event("change", { bubbles: true })); setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = "5"; as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); });
  await page.waitForFunction(() => !!document.querySelector('[data-word-occurrence$=":1:5:2"]'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":1:5:2"]')?.click());
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount .quran-word-card"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.click('#quranWordCardMount [data-word-card-level="tasrif"]').catch(() => {});
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount [data-word-card-conj-table]"), null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(500);
  // the head word's own size at this width, written by hand from the card's CSS (2rem, 1.55rem ≤ 520px, 1.3rem ≤ 340px)
  const wantHead = width <= 340 ? 20.8 : width <= 520 ? 24.8 : 32;
  const want = wantHead * 0.9;
  for (const view of ["all", "pres"]) {
    await page.click(`#quranWordCardMount [data-word-card-conj-view="${view}"]`).catch(() => {});
    await page.waitForFunction((v) => !!document.querySelector("#quranWordCardMount [data-word-card-conj-single]") === (v !== "all"), view, { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(300);
    const s = await measure(page);
    const t = `${tag} ${view === "all" ? "all three" : "one tense"}:`;
    check(`${t} the big word at the top is ${wantHead}px, and the view is the one asked for`, Math.abs(s.head - wantHead) < 0.2 && s.one === (view !== "all"), JSON.stringify({ h: s.head, one: s.one }));
    check(`${t} the title, the toggle's three tense names and the lead line are 90% of it (${want.toFixed(2)}px)`, s.nToggle === 4 && near(s.acc, want) && near(s.tog, want) && near(s.lead, want), JSON.stringify({ acc: s.acc, tog: s.tog, lead: s.lead }));
    if (view === "all") check(`${t} every pronoun and every verb is 90% too`, near(s.pr, want) && near(s.vb, want), JSON.stringify({ pr: s.pr, vb: s.vb }));
    else check(`${t} the verbs keep 2rem and the pronouns at least 1.35rem (and at least 90%)`, near(s.vb, 32) && near(s.pr, Math.max(21.6, want)), JSON.stringify({ pr: s.pr, vb: s.vb }));
    check(`${t} every tense name on the toggle is whole, on one line, inside its button`, s.broken.length === 0 && s.spill.length === 0, JSON.stringify({ b: s.broken, s: s.spill }));
    check(`${t} no verb or pronoun spills out of its cell, nothing leaves the card, no sideways scroll`, s.cellSpill === 0 && s.outOfCard === 0 && s.over <= 0, JSON.stringify({ cs: s.cellSpill, c: s.outOfCard, o: s.over }));
    if (process.argv.includes("--shot")) {
      await page.evaluate(() => document.querySelector("#quranWordCardMount [data-word-card-sec='conj']")?.scrollIntoView({ block: "start" }));
      await page.screenshot({ path: `${process.env.SHOT_DIR}/j61b-${lang}-${width}-${view}.png` });
    }
  }
  await ctx.close();
}
console.log(`\n==== Taṣrīf verb Arabic size (J61 part 2)${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
