// Issue #482 -- the pure Al-Fātiḥah display mapping (app/js/fatiha-count.js).
// Run from the repository root. Expected values are written BY HAND from the
// Owner's table, never computed by the module under test.
import fs from "fs";
import * as F from "../../app/js/fatiha-count.js";

let pass = 0, fail = 0;
function check(name, fn) {
  let ok = false, detail = "";
  try { const r = fn(); if (r && typeof r.then === "function") throw new Error("async body: a promise counts as a pass"); ok = r !== false; } catch (e) { detail = e.message; }
  ok ? (pass++, console.log(`  PASS  ${name}`)) : (fail++, console.log(`  FAIL  ${name} ${detail}`));
}
const eq = (a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} !== ${JSON.stringify(b)}`); };

const data = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/surahs/surah_001.json", "utf8"));
const on = true, off = false;

// internal -> display labels (hand-written from the table)
const LABELS = { 1: "Bismillah", 2: "1", 3: "2", 4: "3", 5: "4", 6: "5", 7: "6–7" };
for (const [a, label] of Object.entries(LABELS)) check(`internal 1:${a} is labelled "${label}" when on`, () => eq(F.displayAyahLabel(1, Number(a), on), label));
check("internal 1:7 reference reads 1:6–7", () => eq(F.displayAyahRef(1, 7, on), "1:6–7"));
check("internal 1:3 reference reads 1:2", () => eq(F.displayAyahRef(1, 3, on), "1:2"));

// displayed -> internal
const BACK = { 1: [2, null], 2: [3, null], 3: [4, null], 4: [5, null], 5: [6, null], 6: [7, "a"], 7: [7, "b"] };
for (const [d, [a, half]] of Object.entries(BACK)) check(`displayed ${d} -> internal ${a}${half ? " half " + half : ""}`, () => eq(F.internalForDisplayedAyah(1, Number(d), on), { ayah: a, half }));
check("displayed 8 and 0 do not exist", () => { eq(F.internalForDisplayedAyah(1, 8, on), null); eq(F.internalForDisplayedAyah(1, 0, on), null); });

// word references
check("1:2:p -> 1:1:p", () => eq(F.displayWordRef(1, 2, 3, on), "1:1:3"));
check("1:6:p -> 1:5:p", () => eq(F.displayWordRef(1, 6, 2, on), "1:5:2"));
check("1:7:1 -> 1:6:1 (صِرَٰطَ)", () => eq(F.displayWordRef(1, 7, 1, on), "1:6:1"));
check("1:7:4 -> 1:6:4", () => eq(F.displayWordRef(1, 7, 4, on), "1:6:4"));
check("1:7:5 -> 1:7:1 (غَيْرِ)", () => eq(F.displayWordRef(1, 7, 5, on), "1:7:1"));
check("1:7:9 -> 1:7:5", () => eq(F.displayWordRef(1, 7, 9, on), "1:7:5"));
check("1:1:* is the Bismillah, no number", () => eq(F.displayWordRef(1, 1, 2, on, "Bismillah"), "Bismillah"));

// the word table agrees with the real data
check("word 5 of 1:7 really is غَيْرِ and word 1 is صِرَٰطَ", () => {
  const w = data.ayahs[6].words;
  eq(w[4].arabic, "غَيْرِ"); eq(w[0].arabic, "صِرَٰطَ"); eq(w.length, 9);
});

// off = identity; other surahs untouched either way
check("off: surah 1 is the identity both ways", () => {
  for (let a = 1; a <= 7; a++) { eq(F.displayAyahLabel(1, a, off), String(a)); eq(F.internalForDisplayedAyah(1, a, off), { ayah: a, half: null }); eq(F.displayWordRef(1, a, 2, off), `1:${a}:2`); }
  eq(F.expandAyahsForDisplay(1, data.ayahs, off), data.ayahs);
});
check("surah 2 is untouched with the setting on", () => {
  for (const a of [1, 2, 7, 255, 286]) { eq(F.displayAyahLabel(2, a, on), String(a)); eq(F.internalForDisplayedAyah(2, a, on), { ayah: a, half: null }); eq(F.displayWordRef(2, a, 3, on), `2:${a}:3`); }
  eq(F.displayAyahCount(2, 286), 286);
});

// translation halves
check("the approved halves joined equal the stored 1:7 translation (en and bn)", () => {
  eq(F.FATIHA_7_TRANSLATION_HALVES.en.join(" "), data.ayahs[6].translations.en);
  // The data stores ো as ে+া; same text, different code points -- compare NFC.
  eq(F.FATIHA_7_TRANSLATION_HALVES.bn.join(" ").normalize("NFC"), data.ayahs[6].translations.bn.normalize("NFC"));
});

// expansion for the Read/Note views
check("expansion gives 8 entries: Bismillah, 1..5, 6, 7 -- numbered in order", () => {
  const x = F.expandAyahsForDisplay(1, data.ayahs, on);
  eq(x.map((a) => a.displayAyah), [null, 1, 2, 3, 4, 5, 6, 7]);
  eq(x.map((a) => a.ayah), [1, 2, 3, 4, 5, 6, 7, 7]);
});
check("the two halves split words 1-4 / 5-9 with UNCHANGED positions", () => {
  const x = F.expandAyahsForDisplay(1, data.ayahs, on);
  eq(x[6].words.map((w) => w.position), [1, 2, 3, 4]);
  eq(x[7].words.map((w) => w.position), [5, 6, 7, 8, 9]);
  eq(x[7].uthmaniText.split(" ")[0], "غَيْرِ");
  eq(x[6].uthmaniText.split(" ").length, 4); eq(x[7].uthmaniText.split(" ").length, 5);
});
check("half texts concatenated equal the stored 1:7 text", () => {
  const x = F.expandAyahsForDisplay(1, data.ayahs, on);
  eq(`${x[6].uthmaniText} ${x[7].uthmaniText}`, data.ayahs[6].uthmaniText);
});
check("halves carry their own translation half", () => {
  const x = F.expandAyahsForDisplay(1, data.ayahs, on);
  eq(x[6].translations.en, F.FATIHA_7_TRANSLATION_HALVES.en[0]);
  eq(x[7].translations.bn, F.FATIHA_7_TRANSLATION_HALVES.bn[1]);
});
check("tajweed end markers are renumbered, the Bismillah's dropped", () => {
  const x = F.expandAyahsForDisplay(1, data.ayahs, on);
  eq(/<span class=end>/.test(x[0].tajweedText), false);
  eq(x[1].tajweedText.endsWith("<span class=end>١</span>"), true);
  eq(x[6].tajweedText.endsWith("<span class=end>٦</span>"), true);
  eq(x[7].tajweedText.endsWith("<span class=end>٧</span>"), true);
  eq(x[7].tajweedText.replace(/<[^>]+>/g, "").trim().startsWith("غَيْرِ"), true);
});
check("expansion never touches the stored data", () => {
  const before = JSON.stringify(data);
  F.expandAyahsForDisplay(1, data.ayahs, on);
  eq(JSON.stringify(data), before);
});

// totals
check("totals: internal 1:7 counts for both 6 and 7, 1:1 is excluded, total stays 7", () => {
  eq(F.displayCount(1, 7, on, (a) => a === 7), { count: 2, total: 7 });
  eq(F.displayCount(1, 7, on, (a) => a === 1), { count: 0, total: 7 });
  eq(F.displayCount(1, 7, on, () => true), { count: 7, total: 7 });
  eq(F.displayCount(1, 7, off, () => true), { count: 7, total: 7 });
  eq(F.displayCount(2, 286, on, (a) => a < 11), { count: 10, total: 286 });
});

// record keys (decisions 76-77) -- expected values written by hand
check("record key: displayed 6 is ayah 7, displayed 7 is ayah 8, others identity", () => {
  eq(F.FATIHA_SEVEN_RECORD_AYAH, 8);
  eq(F.recordAyahFor(1, 7, "a", on), 7);
  eq(F.recordAyahFor(1, 7, "b", on), 8);
  eq(F.recordAyahFor(1, 3, null, on), 3);
  eq(F.recordAyahFor(1, 7, "b", off), 7);
  eq(F.recordAyahFor(2, 7, "b", on), 7);
});
check("a claim writes one record with the count on, BOTH with it off", () => {
  eq(F.recordAyahsToWrite(1, 7, "a", on), [7]);
  eq(F.recordAyahsToWrite(1, 7, "b", on), [8]);
  eq(F.recordAyahsToWrite(1, 7, null, off), [7, 8]);
  eq(F.recordAyahsToWrite(1, 6, null, off), [6]);
  eq(F.recordAyahsToWrite(2, 7, null, off), [7]);
});
check("record 8 belongs to internal 7 of surah 1 only", () => {
  eq(F.internalAyahOfRecord(1, 8), 7);
  eq(F.internalAyahOfRecord(1, 7), 7);
  eq(F.internalAyahOfRecord(2, 8), 8);
});
check("status read: displayed 7 is its own entry, else the old 1:7 mark", () => {
  const mk = (m) => (a) => m[a];
  eq(F.recordStatusOf(1, 8, on, mk({ 7: "achieved" })), "achieved");
  eq(F.recordStatusOf(1, 8, on, mk({ 7: "achieved", 8: "learning" })), "learning");
  eq(F.recordStatusOf(1, 7, on, mk({ 7: "achieved", 8: "learning" })), "achieved");
  eq(F.recordStatusOf(1, 8, on, mk({})), undefined);
  eq(F.recordStatusOf(1, 3, on, mk({ 3: "practising" })), "practising");
});
check("status read with the count OFF: the weaker of the two records", () => {
  const mk = (m) => (a) => m[a];
  eq(F.recordStatusOf(1, 7, off, mk({ 7: "mastered", 8: "learning" })), "learning");
  eq(F.recordStatusOf(1, 7, off, mk({ 7: "learning", 8: "mastered" })), "learning");
  eq(F.recordStatusOf(1, 7, off, mk({ 7: "achieved" })), "achieved");
  eq(F.recordStatusOf(1, 7, off, mk({ 8: "achieved" })), "achieved");
  eq(F.recordStatusOf(1, 7, off, mk({})), undefined);
});
check("roll-up records: on = 2..6 + 7 + 8, off = 1..7", () => {
  eq(F.fatihaRollupRecords(on).map((r) => r.record), [2, 3, 4, 5, 6, 7, 8]);
  eq(F.fatihaRollupRecords(on).map((r) => r.internal), [2, 3, 4, 5, 6, 7, 7]);
  eq(F.fatihaRollupRecords(off).map((r) => r.record), [1, 2, 3, 4, 5, 6, 7]);
});
check("totals: 6 Achieved and 7 not counts 1 of 7, not 2 and not 0", () => {
  eq(F.displayCount(1, 7, on, (a, r) => r === 7), { count: 1, total: 7 });
  eq(F.displayCount(1, 7, on, (a, r) => r === 8), { count: 1, total: 7 });
  eq(F.displayCount(1, 7, on, (a, r) => a === 7), { count: 2, total: 7 });
});
check("copy rule: only when old 1:7 entries exist and no 1:8 entry does", () => {
  eq(F.needsFatihaCopy(1, 7, ["ayah:1:7::approach_02"]), true);
  eq(F.needsFatihaCopy(1, 8, ["ayah:1:7::approach_02"]), true);
  eq(F.needsFatihaCopy(1, 7, ["ayah:1:7::approach_02", "ayah:1:8::approach_01"]), false);
  eq(F.needsFatihaCopy(1, 7, ["ayah:1:3::approach_02"]), false);
  eq(F.needsFatihaCopy(1, 3, ["ayah:1:7::approach_02"]), false);
  eq(F.needsFatihaCopy(2, 7, ["ayah:2:7::approach_02"]), false);
});
const AC = await import("../../app/js/approach-coverage.js");
check("FATIHA_RAMP equals approach-coverage's RAMP_ORDER", () => eq([...F.FATIHA_RAMP], [...AC.RAMP_ORDER]));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
