// PCF MSA J69 (the Owner, 22 Oct 2026): "Can you give each block a distinctive look?" and "place this Fa A' La as the
// basic form under Tasrif for anytime to go to from all other word under Tasrif", then "Only thing is this buttons take
// another row." (1) Each Taṣrīf table splits into five person blocks (he-group, she-group, you, you (f), I and we), each
// its own plate: its own colour on the pronoun side, a gap before the next block; this āyah's gold row stays gold.
// (2) "Basic form: فَعَلَ" sits at the START of an existing line (a verb's "Form I of …" line, a noun's shape sentence), never
// on a row of its own; it shows the full فَعَلَ table, "← Back to <word>" returns, and another word starts on its own.
// Real data: 2:24:3 تَفْعَلُوا (a verb on ف ع ل) and 12:1:5 ٱلْمُبِينِ (a noun). Run from the repository root, serve.js on :8080.
// Every mutation (--mutate=NAME) must make the suite exit 1:
//   noblocks    the rows are not split into blocks              -> the block checks fail
//   samecolour  every block has the same colour                 -> "five different colours" fails
//   nogap       no gap between blocks                           -> the gap check fails
//   herelost    the gold row takes the block's colour           -> the gold-row check fails
//   ownrow      the button is put on a row of its own           -> the "shares its row" checks fail
//   nobasic     the button shows the word's own table again      -> the basic-form checks fail
//   noback      the basic form offers no way back                -> the way-back checks fail
//   noreset     the basic form follows the reader to every word -> the "another word starts on its own" check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const HTML = "app/quranrevival.html", DJS = "app/js/word-card-depth.js";
const MUT = {
  noblocks: [DJS, '.map(([k, a, b]) => `<tbody class="word-card-cj-blk" data-word-card-conj-blk="${k}">${trs.slice(a, b).join("")}</tbody>`).join("");', '.map(([, a, b]) => trs.slice(a, b).join("")).join("");'],
  samecolour: [HTML, '[data-word-card-conj-blk="3f"] { --cjb-pr: #f9dde8;', '[data-word-card-conj-blk="3f"] { --cjb-pr: #dce8fb;'],
  nogap: [HTML, "  .word-card-cj-blk + .word-card-cj-blk tr:first-child td { border-top: 9px solid transparent; }\n", ""],
  herelost: [HTML, "  .word-card-cj-blk .word-card-cj-here td, .word-card-cj-blk .word-card-cj-here td.word-card-cj-pr { background: #fff4d6; }\n", ""],
  ownrow: [HTML, "  .word-card-basic-bar { display: inline-flex; flex: 0 0 auto; vertical-align: middle; }", "  .word-card-basic-bar { display: flex; width: 100%; }"],
  nobasic: [DJS, "  const lemma = basic ? BASIC_LEMMA : word.morphology?.lemma;", "  const lemma = word.morphology?.lemma;"],
  noback: [DJS, 'data-word-card-conj-basic="${ctx.conjBasic ? "off" : "on"}"', 'data-word-card-conj-basic="on"'],
  noreset: [HTML, "conjBasic: wordCardConjBasic === quranWordCardState.occurrenceId,", "conjBasic: wordCardConjBasic !== null,"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function openTasrif(lang, width, ref) {
  const [S, A] = ref.split(":");
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    const type = file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8";
    await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: type, body: src.split(a).join(b) }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForTimeout(600);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await page.evaluate(([s, a]) => { const ss = document.getElementById("surahSelect"); ss.value = s; ss.dispatchEvent(new Event("change", { bubbles: true })); setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = a; as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); }, [S, A]);
  await page.waitForFunction((r) => !!document.querySelector(`[data-word-occurrence$=":${r}"]`), ref, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.evaluate((r) => document.querySelector(`[data-word-occurrence$=":${r}"]`)?.click(), ref);
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount .quran-word-card"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
  await page.click('#quranWordCardMount [data-word-card-level="tasrif"]').catch(() => {});
  await page.waitForTimeout(1500);
  return { ctx, page, errors };
}
const SAME_SRC = `(bar) => {
  const host = bar.closest(".word-card-dline, .word-card-nline"); if (!host) return { host: null, shares: false };
  const b = bar.querySelector("button").getBoundingClientRect();
  const w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT); const rects = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) { if (bar.contains(n) || !n.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(n); rects.push(...r.getClientRects()); }
  return { host: host.className, shares: rects.some((r) => r.width > 0 && r.top < b.bottom - 4 && r.bottom > b.top + 4) };
}`;
const clickIn = (page, sel) => page.evaluate((s) => document.querySelector(`#quranWordCardMount ${s}`)?.click(), sel).then(() => page.waitForTimeout(700));

// the blocks of every table on screen: keys, row counts, pronoun-cell colour, gap to the next block, the gold row's colour
const blocks = (page) => page.evaluate(() => {
  const m = document.querySelector("#quranWordCardMount");
  const tables = [...m.querySelectorAll("[data-word-card-conj-table] table")].filter((t) => t.getBoundingClientRect().width > 0);
  return tables.map((t) => {
    const bs = [...t.querySelectorAll(":scope > tbody")];
    const info = bs.map((b) => ({ key: b.dataset.wordCardConjBlk ?? null, rows: b.rows.length,
      pr: getComputedStyle(b.querySelector("td.word-card-cj-pr")).backgroundColor,
      top: b.rows[0].getBoundingClientRect().top, bottom: b.rows[b.rows.length - 1].getBoundingClientRect().bottom,
      firstCellTop: b.rows[0].cells[0].getBoundingClientRect().top }));
    const gaps = info.slice(1).map((b, i) => Math.round(b.firstCellTop - info[i].bottom + (b.top - b.firstCellTop)));
    // the gap as painted: the distance from one block's last cell box to the next block's first cell's text box
    const paintGaps = info.slice(1).map((b, i) => { const prev = bs[i].rows[bs[i].rows.length - 1].cells[0], next = bs[i + 1].rows[0].cells[0]; const pb = prev.getBoundingClientRect(), nb = next.getBoundingClientRect(); return Math.round(nb.top + parseFloat(getComputedStyle(next).borderTopWidth) - pb.bottom); });
    const here = t.querySelector(".word-card-cj-here");
    return { info, gaps, paintGaps, here: here ? [...here.cells].map((c) => getComputedStyle(c).backgroundColor) : null };
  });
});

for (const [lang, width] of [["en", 1280], ["en", 390], ["en", 320], ["bn", 1280], ["bn", 390]]) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== Taṣrīf blocks and the basic form [${tag}] ===`);
  const { ctx, page, errors } = await openTasrif(lang, width, "2:24:3");

  // ---- 1. the person blocks, in All three and in one tense ----
  for (const view of ["all", "pres"]) {
    await clickIn(page, `[data-word-card-conj-view="${view}"]`);
    const ts = await blocks(page);
    const t = `${tag} ${view === "all" ? "All three" : "one tense"}:`;
    const allInfo = ts.flatMap((x) => x.info);
    if (view === "all") {
      check(`${t} each of the three tables is five blocks (he-group, she-group, you, you (f), I and we: 3, 3, 3, 3, 2 rows)`, ts.length === 3 && ts.every((x) => x.info.map((b) => `${b.key}:${b.rows}`).join() === "3m:3,3f:3,2m:3,2f:3,1:2"), JSON.stringify(ts.map((x) => x.info.map((b) => `${b.key}:${b.rows}`))));
    } else {
      check(`${t} the three groups hold the blocks (he and she; you and you (f); I and we)`, ts.length === 3 && ts.map((x) => x.info.map((b) => b.key).join("+")).join(" | ") === "3m+3f | 2m+2f | 1", JSON.stringify(ts.map((x) => x.info.map((b) => b.key))));
    }
    const byKey = {};
    for (const b of allInfo) (byKey[b.key] ??= new Set()).add(b.pr);
    const one = Object.values(byKey).map((s) => [...s]);
    check(`${t} the five blocks have five different colours, the same in every table`, one.length === 5 && one.every((s) => s.length === 1) && new Set(one.map((s) => s[0])).size === 5, JSON.stringify(byKey, (k, v) => (v instanceof Set ? [...v] : v)));
    check(`${t} a gap of at least 6px stands between one block and the next (every table with two or more blocks)`, ts.some((x) => x.paintGaps.length > 0) && ts.every((x) => x.paintGaps.length === x.info.length - 1 && x.paintGaps.every((g) => g >= 6)), JSON.stringify(ts.map((x) => x.paintGaps)));
    const here = ts.map((x) => x.here).find(Boolean);
    check(`${t} this āyah's row (2:24:3, you all, present) stays gold`, view === "all" || (here && here.every((c) => c === "rgb(255, 244, 214)")), JSON.stringify(here));
    if (view === "all") check(`${t} the gold row is gold in All three too`, here && here.every((c) => c === "rgb(255, 244, 214)"), JSON.stringify(here));
  }

  // ---- 2. the button: at the end of the "Form I of …" line, never on a row of its own ----
  const place = () => page.evaluate((SAME) => {
    const sameLine = new Function(`return (${SAME})`)();
    const m = document.querySelector("#quranWordCardMount"), bar = m.querySelector(".word-card-basic-bar"), btn = bar?.querySelector("button");
    if (!bar) return null;
    const card = m.querySelector(".quran-word-card").getBoundingClientRect(), b = btn.getBoundingClientRect();
    return { ...sameLine(bar), h: Math.round(b.height), inCard: b.left >= card.left - 0.5 && b.right <= card.right + 0.5, text: btn.textContent.trim(), state: btn.dataset.wordCardConjBasic };
  }, SAME_SRC);
  const p0 = await place();
  check(`${tag} "Basic form: فَعَلَ" is there, in the verb's "Form I of ف ع ل" line`, p0 && /word-card-dline/.test(p0.host) && p0.text.includes("فَعَلَ") && p0.state === "on", JSON.stringify(p0));
  check(`${tag} ...it does not take a row of its own (the line's own text shares its row), inside the card, a finger target`, p0 && p0.shares && p0.inCard && p0.h >= 36, JSON.stringify(p0));

  // ---- 3. the basic form, and the way back ----
  await clickIn(page, '[data-word-card-conj-basic="on"]');
  await clickIn(page, '[data-word-card-conj-view="all"]');
  const b1 = await page.evaluate(() => {
    const m = document.querySelector("#quranWordCardMount"), form = (k, pgn) => m.querySelector(`[data-word-card-conj-table="${k}"] [data-word-card-conj-pgn="${pgn}"] [data-word-card-conj-form]`)?.dataset.wordCardConjForm ?? null;
    return { past: form("past", "3MS"), pres: form("pres", "3MS"), imp: form("imp", "2MS"), here: m.querySelectorAll("[data-word-card-conj-here]").length, who: !!m.querySelector("[data-word-card-whowhen], .word-card-whowhen"), blocks: m.querySelectorAll("[data-word-card-conj-blk]").length };
  });
  check(`${tag} the basic form shows فَعَلَ's own table (فَعَلَ, يَفْعَلُ, اِفْعَلْ), in the same five blocks, with no gold row`, b1.past === "فَعَلَ" && b1.pres === "يَفْعَلُ" && /فْعَلْ$/.test(b1.imp ?? "") && b1.here === 0 && b1.blocks === 15, JSON.stringify(b1));
  const p1 = await place();
  check(`${tag} the basic form offers "← Back to تَفْعَلُوا", also in its line, never a row of its own`, p1 && p1.state === "off" && p1.text.includes("تَفْعَلُوا") && /word-card-dline/.test(p1.host) && p1.shares, JSON.stringify(p1));
  await clickIn(page, '[data-word-card-conj-basic="off"]');
  const back = await page.evaluate(() => { const m = document.querySelector("#quranWordCardMount"); return { here: m.querySelectorAll("[data-word-card-conj-here]").length, state: m.querySelector("[data-word-card-conj-basic]")?.dataset.wordCardConjBasic, focus: document.activeElement?.hasAttribute?.("data-word-card-conj-basic") }; });
  check(`${tag} ← Back returns to the word's own table (its gold row again), with the focus on the button`, back.here === 1 && back.state === "on" && back.focus, JSON.stringify(back));
  // another word: the basic form does not follow the reader
  await clickIn(page, '[data-word-card-conj-basic="on"]');
  await clickIn(page, '[data-word-card-move="previous"]');
  await page.waitForTimeout(600);
  await clickIn(page, '[data-word-card-level="tasrif"]');
  const other = await page.evaluate(() => document.querySelector("#quranWordCardMount [data-word-card-conj-basic]")?.dataset.wordCardConjBasic ?? "none");
  check(`${tag} another word starts on its own Taṣrīf, not the basic form`, other === "on" || other === "none", other);
  check(`${tag} no page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();

  // ---- 4. a noun: the button at the end of the shape sentence; the basic form; the way back ----
  const n = await openTasrif(lang, width, "12:1:5");
  const pn = await n.page.evaluate((SAME) => { const bar = document.querySelector("#quranWordCardMount .word-card-basic-bar"); return bar ? new Function(`return (${SAME})`)()(bar) : null; }, SAME_SRC);
  check(`${tag} a noun (12:1:5): the button sits in the shape sentence, sharing its row with the text`, pn && /word-card-nline/.test(pn.host) && pn.shares, JSON.stringify(pn));
  await clickIn(n.page, '[data-word-card-conj-basic="on"]');
  const nb = await n.page.evaluate(() => ({ table: !!document.querySelector("#quranWordCardMount [data-word-card-conj-table]"), shape: !!document.querySelector("#quranWordCardMount [data-word-card-noun-shape]"), back: document.querySelector("#quranWordCardMount [data-word-card-conj-basic]")?.dataset.wordCardConjBasic }));
  check(`${tag} ...it opens the فَعَلَ table with ← Back`, nb.table && !nb.shape && nb.back === "off", JSON.stringify(nb));
  await clickIn(n.page, '[data-word-card-conj-basic="off"]');
  check(`${tag} ...and ← Back brings the noun's own boxes back`, await n.page.evaluate(() => !!document.querySelector("#quranWordCardMount [data-word-card-noun-shape]")));
  check(`${tag} noun: no page errors`, n.errors.length === 0, n.errors.slice(0, 2).join(" | "));
  await n.ctx.close();
}
await browser.close();
console.log(`\n==== Taṣrīf blocks and the basic form (J69)${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
