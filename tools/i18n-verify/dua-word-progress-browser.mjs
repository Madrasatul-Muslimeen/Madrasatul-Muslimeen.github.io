// Decision 92, round 6 of "Dua words" (the Owner, 8 Oct 2026: "Go ahead with round 6"): progress on EVERY word of a
// dua, each its own record duaword:<dua>:<position> (position from 1), in one records chunk per dua (duawords_<dua>).
// An unlinked word saves at once and stays on the page; a word linked to the Qur'an saves its own record and then
// counts for the Qur'an word through the Word card (decision 90 Q1). A failed save says so and opens nothing (I15).
// Expected values written BY HAND: Dua 1's 5th word «وفوضت» is unlinked; its 2nd «أسلمت» is linked (أَسْلَمَ).
// Run from the repository root, serve.js on :8080.
//   --mutate=wrongpos  the position is counted from 0       -> the key checks fail
//   --mutate=nosave    the dua word's record is not written -> the save checks fail
//   --mutate=nofollow  a linked word does not go on to the Word card -> the Qur'an check fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
const { buildUnitKey } = await import("../../app/js/unit-keys.js");

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  wrongpos: ["js/hadith-browser.js", "  const position = pos + 1;\n", "  const position = pos;\n"],
  nosave: ["js/hadith-browser.js", "      try { await actions.claimDuaWord(session, dua, position, id); }", "      try { /* not saved */ }"],
  nofollow: ["js/hadith-browser.js", "        location.href = `${wordCardHref(place, dua)}&progress=${id}`;\n", "\n"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const KEY5 = `${buildUnitKey.duaWord(1, 5)}::studied_hadith`, KEY2 = `${buildUnitKey.duaWord(1, 2)}::studied_hadith`;
check("the permanent key is built by buildUnitKey: duaword:1:5", KEY5 === "duaword:1:5::studied_hadith", KEY5);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function context(lang, width, look, extra = null) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 860 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch {} }, look);
  const muts = [MUTATE && MUT[MUTATE], extra].filter(Boolean);
  for (const [file, a, b] of muts) {
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing in ${file}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  return ctx;
}
const recordWrites = (P, key) => P.evaluate((k) => (window.__stubWriteData || []).filter((w) => w.col === "records").map((w) => {
  const e = w.data?.[`entries.${k}`] ?? w.data?.entries?.[k];
  return e ? { id: w.id, status: e.claimedStatus } : null;
}).filter(Boolean), key);
async function openWord(P, i) {
  await P.evaluate((w) => document.querySelector(`[data-dua-card="1"] [data-dua-word="${w}"]`).scrollIntoView({ block: "center" }), i);
  await P.click(`[data-dua-card="1"] [data-dua-word="${i}"]`);
  await P.waitForSelector('[data-dua-word-panel="1"] [data-dua-word-dua-state-now]', { timeout: 10000 }).catch(() => {});
}

for (const [lang, width, look] of [["en", 390, "light"], ["bn", 390, "night"], ["en", 1280, "night"]]) {
  const tag = `[${lang} ${width} ${look}]`;
  const ctx = await context(lang, width, look);
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html");
  await P.click('[data-hadith-tab="dua"]');
  await P.waitForSelector('[data-dua-card="1"] [data-dua-word="4"]');
  await openWord(P, 4);
  const before = await P.evaluate(() => { const p = document.querySelector('[data-dua-word-panel="1"] [data-dua-word-progress]'); const b = [...(p?.querySelectorAll("[data-dua-word-state]") ?? [])]; return { pos: p?.dataset.duaWordPosition, here: p?.querySelector("[data-dua-word-dua-state-now]")?.textContent, quran: !!p?.querySelector("[data-dua-word-state-now]"), n: b.length, h: Math.min(...b.map((x) => x.getBoundingClientRect().height)) }; });
  check(`${tag} the unlinked word «وفوضت» (Dua 1, word 5) has its own progress: ${lang === "bn" ? "এই দুআয়: শুরু হয়নি" : "In this dua: Not started"}, four 40px states`, before.pos === "5" && before.here === (lang === "bn" ? "এই দুআয়: শুরু হয়নি" : "In this dua: Not started") && !before.quran && before.n === 4 && before.h >= 40, JSON.stringify(before));
  await P.evaluate(() => { window.__stubWriteData = []; });
  const url0 = P.url();
  await P.click('[data-dua-word-panel="1"] [data-dua-word-state="learning"]');
  await P.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "records"), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(400);
  const w5 = await recordWrites(P, KEY5);
  const after = await P.evaluate(() => ({ here: document.querySelector('[data-dua-word-panel="1"] [data-dua-word-dua-state-now]')?.textContent, current: document.querySelector('[data-dua-word-panel="1"] [data-dua-word-state][aria-current="true"]')?.dataset.duaWordState, lemma: (window.__stubWriteData || []).some((w) => /quranLemma|quranWord/.test(w.col)) }));
  check(`${tag} pressing Learning saves duaword:1:5 as learning, in the person's own per-dua chunk (t1__p1__duawords_1)`, w5.some((w) => w.id === "t1__p1__duawords_1" && w.status === "learning"), JSON.stringify(w5));
  check(`${tag} ...stays on the page, shows ${lang === "bn" ? "এই দুআয়: শিখছি" : "In this dua: Learning"}, Learning marked`, P.url() === url0 && after.here === (lang === "bn" ? "এই দুআয়: শিখছি" : "In this dua: Learning") && after.current === "learning", JSON.stringify(after));
  check(`${tag} ...and touches no Qur'an record (the word is not a Qur'an word)`, !after.lemma);

  // A linked word: its own record first, then the Word card for the Qur'an word.
  await openWord(P, 1);
  const lk = await P.evaluate(() => { const p = document.querySelector('[data-dua-word-panel="1"] [data-dua-word-progress]'); return { pos: p?.dataset.duaWordPosition, here: p?.querySelector("[data-dua-word-dua-state-now]")?.textContent ?? "", quran: p?.querySelector("[data-dua-word-state-now]")?.textContent ?? "" }; });
  check(`${tag} the linked word «أسلمت» (word 2) shows both: in this dua, and the same word in the Qur'an`, lk.pos === "2" && lk.here.length > 0 && lk.quran.startsWith(lang === "bn" ? "কুরআনে একই শব্দ" : "The same word in the Qur'an"), JSON.stringify(lk));
  await P.evaluate(() => { window.__stubWriteData = []; });
  let navigated = true;
  await Promise.all([P.waitForURL(/quranrevival\.html\?word=2:131:7/, { timeout: 15000 }), P.click('[data-dua-word-panel="1"] [data-dua-word-state="achieved"]')]).catch(() => { navigated = false; });
  // The page has moved on: its own write log went with it; the dua-word write was made before leaving.
  check(`${tag} pressing Achieved on a linked word goes on to the Word card at 2:131:7`, navigated);
  if (navigated) {
    await P.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "quranLemmaProgress"), null, { timeout: 30000 }).catch(() => {});
    const lw = await P.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranLemmaProgress").map((w) => [w.data?.lemmaId, w.data?.state]));
    check(`${tag} ...where the Qur'an word أَسْلَمَ is counted achieved (decision 90 Q1)`, lw.some(([l, st]) => l === "أَسْلَمَ" && st === "achieved"), JSON.stringify(lw));
  }
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();

  // The linked word's own record is written BEFORE leaving (read from a page that does not leave: the follow-on is cut).
  const ctx2 = await context(lang, width, look, ["js/hadith-browser.js", "        location.href = `${wordCardHref(place, dua)}&progress=${id}`;\n", "        window.__wouldGo = `${wordCardHref(place, dua)}&progress=${id}`;\n"]);
  const { page: Q } = await openPage(ctx2, "/app/hadith-collections.html");
  await Q.click('[data-hadith-tab="dua"]');
  await Q.waitForSelector('[data-dua-card="1"] [data-dua-word="1"]');
  await openWord(Q, 1);
  await Q.evaluate(() => { window.__stubWriteData = []; });
  await Q.click('[data-dua-word-panel="1"] [data-dua-word-state="achieved"]');
  await Q.waitForTimeout(800);
  const w2 = await recordWrites(Q, KEY2);
  const go = await Q.evaluate(() => window.__wouldGo ?? null);
  check(`${tag} a linked word saves its own duaword:1:2 (achieved) first, then would open the Word card with progress=achieved`, w2.some((w) => w.id === "t1__p1__duawords_1" && w.status === "achieved") && go === "./quranrevival.html?word=2:131:7&back=1&from=dua-1&progress=achieved", JSON.stringify([w2, go]));
  await ctx2.close();

  // I15: a failed save says so, keeps the old state, and opens nothing.
  const ctx3 = await context(lang, width, look, ["js/hadith-study-actions.js", "  const unitKey = duaWordUnitKey(number, position);\n  const result", "  throw new Error(\"permission-denied\");\n  const unitKey = duaWordUnitKey(number, position);\n  const result"]);
  const { page: R } = await openPage(ctx3, "/app/hadith-collections.html");
  await R.click('[data-hadith-tab="dua"]');
  await R.waitForSelector('[data-dua-card="1"] [data-dua-word="1"]');
  await openWord(R, 1);
  const u = R.url();
  await R.click('[data-dua-word-panel="1"] [data-dua-word-state="achieved"]');
  await R.waitForTimeout(800);
  const failed = await R.evaluate(() => ({ msg: document.querySelector('[data-dua-word-panel="1"] .dua-word-progress [role="status"]')?.textContent ?? "", current: document.querySelector('[data-dua-word-panel="1"] [data-dua-word-state][aria-current="true"]')?.dataset.duaWordState }));
  check(`${tag} I15: a failed save says "${lang === "bn" ? "সংরক্ষিত হয়নি" : "Not saved"}", keeps Not started, and opens nothing`, R.url() === u && /permission-denied/.test(failed.msg) && failed.current === "not_started", JSON.stringify(failed));
  await ctx3.close();
}
await browser.close();
console.log(`\n==== Dua word progress, every word its own record: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
