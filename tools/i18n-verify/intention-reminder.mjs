// The intention reminder, pure half (app/js/intention-reminder.js). Run from the repository root.
// --mutate=same-day|show-always|off-ignored|no-save-guard must make this FAIL.
import assert from "node:assert/strict";
import fs from "node:fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
let src = fs.readFileSync("app/js/intention-reminder.js", "utf8");
const M = {
  "same-day": ["return ((days % INTENTIONS.length) + INTENTIONS.length) % INTENTIONS.length;", "return 0;"],
  "show-always": ["return closedDay !== today; // daily", "return true; // daily"],
  "off-ignored": ['if (mode === "off") return false;', ""],
  "no-save-guard": ["if (!isIntentionMode(mode)) return false;", ""],
};
if (MUTATE) { if (!M[MUTATE] || !src.includes(M[MUTATE][0])) throw new Error("bad mutation " + MUTATE); src = src.replace(M[MUTATE][0], M[MUTATE][1]); }
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
const m = await import(`data:text/javascript;base64,${Buffer.from(src).toString("base64")}`);
let pass = 0, fail = 0;
const check = (n, f) => { try { const r = f(); if (r && typeof r.then === "function") throw new Error("async check"); pass++; } catch (e) { fail++; console.log(`  FAIL  ${n}\n        ${e.message.split("\n")[0]}`); } };

check("four intentions, each with English and Bangla", () => { assert.equal(m.INTENTIONS.length, 4); for (const i of m.INTENTIONS) { assert.ok(i.en.length > 20); assert.ok(/[ঀ-৿]/.test(i.bn) && !/[A-Za-z]/.test(i.bn)); } });
check("a different one each day, in turn, repeating after four", () => {
  const days = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"].map(m.intentionIndexFor);
  assert.equal(new Set(days.slice(0, 4)).size, 4); assert.equal(days[0], days[4]);
  for (let i = 0; i < 4; i++) assert.equal(days[i + 1] % 4, (days[i] + 1) % 4);
});
check("after Rasulullah the blessing is written in full (saw128)", () => { assert.match(m.INTENTIONS[1].en, /Rasulullah Sallallahu A'laihi Wa Sallam/); assert.match(m.INTENTIONS[1].bn, /রাসূলুল্লাহ সাল্লাল্লাহু আলাইহি ওয়া সাল্লাম/); });
check("daily is the default", () => { assert.equal(m.getIntentionMode("p1"), "daily"); assert.equal(m.DEFAULT_INTENTION_MODE, "daily"); });
check("shows: daily until closed today, then not again today, but again tomorrow", () => {
  assert.equal(m.shouldShowIntention({ mode: "daily", closedDay: null, today: "d1" }), true);
  assert.equal(m.shouldShowIntention({ mode: "daily", closedDay: "d1", today: "d1" }), false);
  assert.equal(m.shouldShowIntention({ mode: "daily", closedDay: "d1", today: "d2" }), true);
});
check("shows: every time until closed in this opening; off never", () => {
  assert.equal(m.shouldShowIntention({ mode: "every", closedDay: "d1", today: "d1", closedThisOpening: false }), true);
  assert.equal(m.shouldShowIntention({ mode: "every", today: "d1", closedThisOpening: true }), false);
  assert.equal(m.shouldShowIntention({ mode: "off", closedDay: null, today: "d1" }), false);
});
check("the setting is remembered per person, and a closed day is ONE key for all MSA", () => {
  assert.equal(m.setIntentionMode("p1", "off"), true); assert.equal(m.getIntentionMode("p1"), "off"); assert.equal(m.getIntentionMode("p2"), "daily");
  m.markClosedToday("p1", "2026-11-04"); assert.equal(m.getClosedDay("p1"), "2026-11-04");
  assert.deepEqual([...store.keys()].filter((k) => k.startsWith("mmsa-intention-closed")), ["mmsa-intention-closed:p1"]);
});
check("an unknown mode is refused and not stored", () => { assert.equal(m.setIntentionMode("p9", "sometimes"), false); assert.equal(m.getIntentionMode("p9"), "daily"); });
check("the card names the day's intention and has one Bismillah button; the setting presses the chosen mode", () => {
  const h = m.intentionCardHtml({ lang: "en", day: "2026-11-04" });
  assert.ok(h.includes(m.INTENTIONS[m.intentionIndexFor("2026-11-04")].en.slice(0, 30))); assert.equal((h.match(/data-intention-bismillah/g) || []).length, 1);
  const s = m.intentionSettingHtml({ mode: "every", lang: "bn" });
  assert.match(s, /data-intention-mode="every" aria-pressed="true"/); assert.match(s, /data-intention-mode="off" aria-pressed="false"/);
});
check("storage that throws does not throw (private window)", () => {
  const keep = globalThis.localStorage; globalThis.localStorage = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); } };
  try { assert.equal(m.getIntentionMode("p"), "daily"); assert.equal(m.setIntentionMode("p", "off"), false); assert.equal(m.getClosedDay("p"), null); } finally { globalThis.localStorage = keep; }
});
// wiring: the page uses it, nothing at start-up
check("quranrevival.html places it above the studyScreen and the setting in Study options", () => {
  const h = fs.readFileSync("app/quranrevival.html", "utf8");
  assert.ok(h.includes('id="intentionHost"') && h.includes('id="intentionOpt"') && h.includes("./js/intention-reminder.js"));
});
console.log(`\n==== Intention reminder (pure): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
