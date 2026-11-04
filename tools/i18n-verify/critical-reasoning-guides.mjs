// The Critical Reasoning guides' text and the question card (PCF MSA J05, T15 A), data + toggle. Run from the repository root.
// --mutate=gapA|gapB|toggle-default|off-ignored|bn-missing must make this FAIL.
import assert from "node:assert/strict";
import fs from "node:fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
let src = fs.readFileSync("app/js/critical-reasoning-guides.js", "utf8");
const M = {
  gapA: ["First read the passage around the āyah and know why it came down (asbāb al-nuzūl): ", ""],
  gapB: ["First gather every āyah on the same subject", "First gather an āyah"],
  "toggle-default": ['export const QUESTION_CARD_DEFAULT = "on";', 'export const QUESTION_CARD_DEFAULT = "off";'],
  "off-ignored": ['const qs = mode === "off" ? [] : questionsFor(approach);', "const qs = questionsFor(approach);"],
  "bn-missing": ['bn: "আমি কোথায় ভুল হতে পারি?"', 'bn: ""'],
};
if (MUTATE) { if (!M[MUTATE] || !src.includes(M[MUTATE][0])) throw new Error("bad mutation " + MUTATE); src = src.replace(M[MUTATE][0], M[MUTATE][1]); }
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
const m = await import(`data:text/javascript;base64,${Buffer.from(src).toString("base64")}`);
let pass = 0, fail = 0;
const check = (n, f) => { try { const r = f(); if (r && typeof r.then === "function") throw new Error("async check"); pass++; } catch (e) { fail++; console.log(`  FAIL  ${n}\n        ${e.message.split("\n")[0]}`); } };
check("the five Approaches have a what / how / measure, all filled", () => { assert.deepEqual(Object.keys(m.GUIDE_TEXT).map(Number), [14, 15, 20, 21, 27]); for (const g of Object.values(m.GUIDE_TEXT)) for (const k of ["what", "how", "measure"]) assert.ok(g[k].length > 20, k); });
check("T15 A, gap A: Primary (15) reads the passage and why it came down", () => { assert.match(m.GUIDE_TEXT[15].how, /passage/); assert.match(m.GUIDE_TEXT[15].how, /asbāb al-nuzūl/); assert.ok(m.QUESTIONS[15].some((q) => /passage/.test(q.en))); });
check("T15 A, gaps B and C: Advanced (21) gathers every āyah on the subject, then the authentic Sunnah before any scholar", () => {
  assert.match(m.GUIDE_TEXT[21].how, /every āyah on the same subject/); assert.match(m.GUIDE_TEXT[21].how, /authentic Sunnah[^.]*before any scholar/);
  assert.ok(m.QUESTIONS[21].some((q) => /Qur'an say/.test(q.en)) && m.QUESTIONS[21].some((q) => /Sunnah/.test(q.en))); });
check("T15 A, gap E: a check on one's own bias at 21 and 27, certain against probable, Allah knows best", () => {
  for (const n of [21, 27]) assert.match(m.GUIDE_TEXT[n].how, /what I want it to say/); assert.match(m.GUIDE_TEXT[21].how, /certain from what is only probable/); assert.match(m.GUIDE_TEXT[21].how, /Allah knows best/); });
check("after Rasulullah the blessing is in full (saw128)", () => { assert.match(m.GUIDE_TEXT[14].how, /Rasulullah Sallallahu A'laihi Wa Sallam/); });
check("every question has a unique permanent id, an English text and a Bangla text in Bangla script", () => {
  const ids = new Set();
  for (const [n, qs] of Object.entries(m.QUESTIONS)) for (const q of qs) { assert.ok(q.id.startsWith(`q${n}-`), q.id); assert.ok(!ids.has(q.id), "dup " + q.id); ids.add(q.id); assert.ok(q.en.length > 3); assert.ok(/[ঀ-৿]/.test(q.bn), q.id + " bn"); } });
check("the toggle is ON by default, remembered per person, and an unknown value is refused", () => {
  assert.equal(m.getQuestionCardMode("p1"), "on"); assert.equal(m.setQuestionCardMode("p1", "off"), true); assert.equal(m.getQuestionCardMode("p1"), "off"); assert.equal(m.getQuestionCardMode("p2"), "on");
  assert.equal(m.setQuestionCardMode("p3", "maybe"), false); assert.equal(m.getQuestionCardMode("p3"), "on"); });
check("the card shows an Approach's questions when on, nothing when off or for an Approach with none", () => {
  const on = m.questionCardHtml({ approach: "approach_27", mode: "on" }); assert.equal((on.match(/data-question-id/g) || []).length, 3);
  assert.equal(m.questionCardHtml({ approach: "approach_27", mode: "off" }), ""); assert.equal(m.questionCardHtml({ approach: "approach_16", mode: "on" }), ""); });
check("a tap hands the Note that question's text, in the reader's language", () => {
  let got = null; const fake = { querySelectorAll: () => [{ dataset: { questionId: "q27-wrong" }, addEventListener: (_, f) => f() }] };
  m.wireQuestionCard(fake, { approach: 27, lang: "bn", onPick: (t) => { got = t; } }); assert.equal(got, "আমি কোথায় ভুল হতে পারি?"); });
check("storage that throws gives the default", () => { const k = globalThis.localStorage; globalThis.localStorage = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); } };
  try { assert.equal(m.getQuestionCardMode("p"), "on"); assert.equal(m.setQuestionCardMode("p", "off"), false); } finally { globalThis.localStorage = k; } });
check("the page offers the toggle in Study options", () => { const h = fs.readFileSync("app/quranrevival.html", "utf8"); assert.ok(h.includes('id="questionCardOpt"') && h.includes("./js/critical-reasoning-guides.js")); });
console.log(`\n==== Critical Reasoning guides + question card (pure): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
