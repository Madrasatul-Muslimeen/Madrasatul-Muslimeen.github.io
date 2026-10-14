// J23 choice B (the Owner, 14 Oct 2026): a Not started / Learning / Practising press on a place that shows Achieved
// only through ANOTHER mark asks, inside the card, whether to change that mark too ("This also changes ‘X’ to Learning
// in all N places it reaches. Change it?" -- Change it / Cancel). Cancel saves only this place; Achieved is unchanged.
// Cases: known via the WORD's own mark (حَيَوٰة Achieved at 14:3:3, pressed at 14:27:8), via the BASIC meaning group, via
// the ROOT (Intermediate). 390 and 1280, en and bn. Expected values are written by hand. Run from the repository root.
//   --mutate=no-ask       the question never appears, the press saves only this place    -> the question checks fail
//   --mutate=no-write     "Change it" lowers nothing                                       -> the lemma-write checks fail
//   --mutate=cancel-writes Cancel also lowers the other mark                               -> the Cancel checks fail
//   --mutate=wrong-count  the question always says 1 place                                 -> the "76 places" check fails
//   --mutate=achieved-asks an Achieved press asks too                                      -> the Achieved check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise; await it first`);
  return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-ask": ["quranrevival.html", 'if (plan) { wordProgressAsk = plan;', 'if (false) { wordProgressAsk = plan;'],
  "no-write": ["quranrevival.html", "if (item) {", "if (false) {"],
  "cancel-writes": ["quranrevival.html", "{ other: change ? ask.items : false }", "{ other: ask.items }"],
  "wrong-count": ["quranrevival.html", "n: first.count });", "n: 1 });"],
  "achieved-asks": ["quranrevival.html", 'action.kind === "state" && action.state !== "achieved") {\n        wordProgressSaving = { occurrenceId, level, state: null, planning: true };', 'action.kind === "state") {\n        wordProgressSaving = { occurrenceId, level, state: null, planning: true };'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function newPage(lang, width) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: "window.__stubApplyBatches = true;" });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await page.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(400);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(400);
  return { ctx, page, errors };
}
async function openWord(page, surah, ayah, pos) {
  const moved = await page.evaluate((s) => { const e = document.getElementById("surahSelect"); if (e.value === String(s)) return false; e.value = String(s); e.dispatchEvent(new Event("change", { bubbles: true })); return true; }, surah);
  if (moved) await page.waitForFunction((s) => document.querySelector(`#readView [data-word-occurrence^="quran-word-occurrence:v1:${s}:"]`), surah, { timeout: 15000 });
  await page.evaluate((a) => { const e = document.getElementById("ayahSelect"); if (e.value !== String(a)) { e.value = String(a); e.dispatchEvent(new Event("change", { bubbles: true })); } }, ayah);
  await page.waitForFunction(([s, a]) => document.querySelector(`#readView [data-word-occurrence="quran-word-occurrence:v1:${s}:${a}:1"]`), [surah, ayah], { timeout: 8000 });
  const id = `quran-word-occurrence:v1:${surah}:${ayah}:${pos}`;
  await page.evaluate((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`)?.click(), id);
  await page.waitForSelector(`.quran-word-card[data-occurrence-id="${id}"]`, { timeout: 8000 });
  await page.waitForTimeout(1200);
}
const settle = (page) => page.waitForFunction(() => !document.querySelector("#quranWordCardMount [data-word-progress-saving]"), null, { timeout: 10000 }).catch(() => {});
const press = async (page, st) => { await page.click(`#quranWordCardMount [data-word-progress-state="${st}"]`); await settle(page); await page.waitForTimeout(900); };
const pressed = (page) => page.evaluate(() => [...document.querySelectorAll("#quranWordCardMount [data-word-progress] [data-word-progress-state]")].filter((e) => e.getAttribute("aria-pressed") === "true").map((e) => e.dataset.wordProgressState).join());
const ask = (page) => page.evaluate(() => { const q = document.querySelector("#quranWordCardMount [data-word-progress-question]"); if (!q) return null; const r = q.getBoundingClientRect(); return { text: q.querySelector("p").textContent, fits: r.left >= -0.5 && r.right <= innerWidth + 0.5 && r.width > 0, buttons: [...q.querySelectorAll("button")].map((b) => b.dataset.wordProgressAsk + ":" + Math.round(b.getBoundingClientRect().height)) }; });
const held = (page) => page.evaluate(() => document.querySelector("#quranWordCardMount [data-word-progress-held]")?.dataset.wordProgressHeld ?? null);
const mark = (page) => page.evaluate(() => window.__stubWriteData?.length ?? 0);
const writesSince = (page, n) => page.evaluate((k) => (window.__stubWriteData || []).slice(k).map((x) => ({ col: x.col, id: x.id, state: x.data?.state ?? null })), n);
const answer = async (page, which) => { await page.click(`#quranWordCardMount [data-word-progress-ask="${which}"]`); await settle(page); await page.waitForTimeout(1200); };
const lemmaWrites = (w) => w.filter((x) => x.col === "quranLemmaProgress");
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0;

const L = {
  en: { learning: "Learning", q76: /in all 76 places it reaches\. Change it\?/ },
  bn: { learning: "শিখছি", q76: /76/ },
};

for (const lang of ["en", "bn"]) for (const width of [390, 1280]) {
  const T = `[${lang} ${width}]`;

  console.log(`\n=== ${T} 1. known through the WORD's own mark (حَيَوٰة Achieved at 14:3:3, pressed at 14:27:8) ===`);
  {
    const { ctx, page, errors } = await newPage(lang, width);
    await openWord(page, 14, 3, 3);
    await press(page, "achieved");
    await openWord(page, 14, 27, 8);
    check(`${T} 14:27:8 shows Achieved before the press (control)`, (await pressed(page)) === "achieved", await pressed(page));
    let n = await mark(page);
    await page.click('#quranWordCardMount [data-word-progress-state="learning"]'); await page.waitForTimeout(1500);
    let a = await ask(page);
    check(`${T} the question appears in the card, names حَيَوٰة and Learning`, !!a && a.text.includes("حَيَوٰة") && a.text.includes(L[lang].learning), JSON.stringify(a));
    check(`${T} ...with the real N (76 places)`, !!a && L[lang].q76.test(a.text), a?.text);
    check(`${T} ...inside the screen, Change it and Cancel both finger-sized (>=40px)`, !!a && a.fits && a.buttons.length === 2 && a.buttons.every((b) => +b.split(":")[1] >= 40), JSON.stringify(a));
    check(`${T} ...and NOTHING is written before the answer`, (await writesSince(page, n)).length === 0, JSON.stringify(await writesSince(page, n)));
    // Cancel: this place only.
    await answer(page, "cancel");
    let w = await writesSince(page, n);
    check(`${T} Cancel saves this place (quranWordProgress) and writes no dictionary-word claim`, w.some((x) => x.col === "quranWordProgress") && lemmaWrites(w).length === 0, JSON.stringify(w));
    check(`${T} ...the card still shows Achieved and says what was saved here`, (await pressed(page)) === "achieved" && (await held(page)) === "learning", `${await pressed(page)} / ${await held(page)}`);
    check(`${T} ...the question is gone`, (await ask(page)) === null);
    // Change it.
    n = await mark(page);
    await page.click('#quranWordCardMount [data-word-progress-state="practising"]'); await page.waitForTimeout(1500);
    a = await ask(page);
    check(`${T} a second press asks again (Practising)`, !!a, JSON.stringify(a));
    await answer(page, "change");
    w = await writesSince(page, n);
    const lw = lemmaWrites(w);
    check(`${T} Change it writes the dictionary-word claim حَيَوٰة as practising`, lw.length === 1 && lw[0].id.endsWith("حَيَوٰة") && lw[0].state === "practising", JSON.stringify(lw));
    check(`${T} ...and the whole-Qur'an total moves down (75: all places but 14:3:3, which is Achieved on its own)`, w.some((x) => x.col === "quranWordTotals"), JSON.stringify(w.map((x) => x.col)));
    check(`${T} the card then shows Practising, no inherited-Achieved line, no held line`, (await pressed(page)) === "practising" && (await held(page)) === null, `${await pressed(page)} / ${await held(page)}`);
    // Achieved is unchanged: no question.
    n = await mark(page);
    await press(page, "achieved");
    check(`${T} Achieved asks nothing and behaves as before`, (await ask(page)) === null && (await pressed(page)) === "achieved", await pressed(page));
    check(`${T} no page errors`, noErr(errors), errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  console.log(`\n=== ${T} 1b. an Achieved press on a place known elsewhere is unchanged ===`);
  {
    const { ctx, page, errors } = await newPage(lang, width);
    await openWord(page, 14, 3, 3);
    await press(page, "achieved");
    await openWord(page, 14, 27, 8);
    const n = await mark(page);
    await page.click('#quranWordCardMount [data-word-progress-state="achieved"]'); await page.waitForTimeout(1500);
    check(`${T} Achieved asks nothing`, (await ask(page)) === null, JSON.stringify(await ask(page)));
    await settle(page); await page.waitForTimeout(900);
    const w = await writesSince(page, n);
    check(`${T} ...saves this place and writes no dictionary-word claim`, w.some((x) => x.col === "quranWordProgress") && lemmaWrites(w).length === 0, JSON.stringify(w));
    check(`${T} no page errors`, noErr(errors), errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  console.log(`\n=== ${T} 2. known through the BASIC meaning group ===`);
  {
    const { ctx, page, errors } = await newPage(lang, width);
    await openWord(page, 14, 3, 3);
    await page.click('#quranWordCardMount [data-word-card-level="basic"]');
    await page.waitForSelector('#quranWordCardMount [data-word-card-panel="basic"] [data-word-progress-state="achieved"]:not([disabled])', { timeout: 8000 }).catch(() => {});
    await press(page, "achieved");
    await page.click('#quranWordCardMount [data-word-card-level="wbw"]'); await page.waitForTimeout(900);
    await openWord(page, 14, 27, 8);
    check(`${T} 14:27:8 shows Achieved through the Basic group (control)`, (await pressed(page)) === "achieved", await pressed(page));
    let n = await mark(page);
    await page.click('#quranWordCardMount [data-word-progress-state="learning"]'); await page.waitForTimeout(1500);
    let a = await ask(page);
    check(`${T} the question appears for the group mark`, !!a && a.text.includes(L[lang].learning), JSON.stringify(a));
    await answer(page, "cancel");
    let w = await writesSince(page, n);
    check(`${T} Cancel writes only this place`, w.some((x) => x.col === "quranWordProgress") && lemmaWrites(w).length === 0, JSON.stringify(w));
    n = await mark(page);
    await page.click('#quranWordCardMount [data-word-progress-state="learning"]'); await page.waitForTimeout(1500);
    await answer(page, "change");
    w = await writesSince(page, n);
    check(`${T} Change it writes the Basic claim (level basic) as learning`, lemmaWrites(w).length === 1 && /__basic__/.test(lemmaWrites(w)[0].id) && lemmaWrites(w)[0].state === "learning", JSON.stringify(lemmaWrites(w)));
    check(`${T} the card then shows Learning`, (await pressed(page)) === "learning", await pressed(page));
    check(`${T} no page errors`, noErr(errors), errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  console.log(`\n=== ${T} 3. known through the ROOT (Intermediate) -- ٱلْبَوَارِ 14:28:12 ===`);
  {
    const { ctx, page, errors } = await newPage(lang, width);
    await openWord(page, 14, 28, 12);
    await page.click('#quranWordCardMount [data-word-card-level="intermediate"]');
    await page.waitForSelector('#quranWordCardMount [data-word-card-panel="intermediate"] [data-word-progress-state="achieved"]:not([disabled])', { timeout: 8000 }).catch(() => {});
    await press(page, "achieved");
    await page.click('#quranWordCardMount [data-word-card-level="wbw"]');
    await page.waitForSelector('#quranWordCardMount [data-word-card-panel="wbw"]', { timeout: 8000 });
    await page.waitForTimeout(900);
    check(`${T} WbW shows Achieved through the root (control)`, (await pressed(page)) === "achieved", await pressed(page));
    let n = await mark(page);
    await page.click('#quranWordCardMount [data-word-progress-state="learning"]'); await page.waitForTimeout(1500);
    const a = await ask(page);
    check(`${T} the question names the root and Learning`, !!a && a.text.includes("بور") && a.text.includes(L[lang].learning), JSON.stringify(a));
    await answer(page, "change");
    const w = await writesSince(page, n);
    const lw = lemmaWrites(w);
    check(`${T} Change it writes the root claim (level intermediate) as learning`, lw.length >= 1 && lw.some((x) => /__intermediate__/.test(x.id) && x.state === "learning"), JSON.stringify(lw));
    check(`${T} the card then shows Learning, no Achieved`, (await pressed(page)) === "learning", await pressed(page));
    // The Intermediate tab's own place mark at 14:28:12 (an occurrence-level state) is a different mark and stays; only
    // the root claim, which is what spread Achieved to other words, is lowered.
    await page.click('#quranWordCardMount [data-word-card-level="wbw"]'); await page.waitForTimeout(600);
    check(`${T} back on WbW the card still shows Learning`, (await pressed(page)) === "learning", await pressed(page));
    check(`${T} no page errors`, noErr(errors), errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}

await browser.close();
console.log(`\n==== J23 choice B, change the other mark${MUTATE ? ` (mutation ${MUTATE})` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
