// PCF MSA J03 round K4: the teacher's view's counting (app/js/keys-teacher-view-model.js), pure.
// Run from the repository root:  node tools/i18n-verify/keys-teacher-view-model.mjs
//   --mutate=NAME   applies one mutation to a COPY of the module; the suite must then FAIL (exit 1)
//   --prove         runs every mutation in turn and reports which were caught (exit 1 if any was not)
// The check() runner refuses a promise (a check that cannot run must not pass).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "app/js/keys-teacher-view-model.js");
const KEYS = path.join(ROOT, "app/js/ayah-keys.js");

const MUT = {
  practicenotranked: ["students: r.who.size", "students: r.byMark.hard.size"],
  doneranks: ['MARK_IDS.filter((m) => m !== "done")', "MARK_IDS.filter(() => true)"],
  notiebreak: ["b.students - a.students || (a.unitKey < b.unitKey ? -1 : a.unitKey > b.unitKey ? 1 : 0)", "b.students - a.students"],
  ascending: ["b.students - a.students ||", "a.students - b.students ||"],
  othersurah: ['return Number(p[1]) === surah ? { kind: "ayah"', 'return true ? { kind: "ayah"'],
  wordasayah: ['{ kind: "qword", surah', '{ kind: "ayah", surah'],
  firstmarkonly: ["for (const m of marks) counts[parsed.kind][m]++;", "counts[parsed.kind][marks[0]]++;"],
  nonmark: ["const marks = marksIn(ids);", "const marks = Array.isArray(ids) && ids.length ? (marksIn(ids).length ? marksIn(ids) : [\"hard\"]) : [];"],
  errorcounted: ["if (!s.error) {", "if (true) {"],
  nodonecount: ["byMark: Object.fromEntries(MARK_IDS.map((m) => [m, r.byMark[m].size]))", "byMark: Object.fromEntries(DIFFICULTY_MARKS.map((m) => [m, r.byMark[m].size]))"],
  emptycounted: ["if (!marks.length) continue;", ""],
  hadithdropped: ['if (p[0] === "hadith" && p.length === 3', 'if (false && p[0] === "hadith" && p.length === 3'],
};

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
if (process.argv.includes("--prove")) {
  let caught = 0;
  for (const name of Object.keys(MUT)) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--mutate=${name}`], { cwd: ROOT, encoding: "utf8" });
    const ok = r.status === 1 && /\n  FAIL  /.test(r.stdout); // a FAILED check, never a crash or a mutation whose text is missing
    if (ok) caught++;
    console.log(`  ${ok ? "CAUGHT  " : "UNPROVEN"}  ${name}`);
  }
  console.log(`\n${caught}/${Object.keys(MUT).length} mutations caught`);
  process.exit(caught === Object.keys(MUT).length ? 0 : 1);
}

const MUTATE = arg("mutate");
let modUrl = pathToFileURL(SRC).href;
if (MUTATE) {
  if (!MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
  const [from, to] = MUT[MUTATE];
  const text = fs.readFileSync(SRC, "utf8");
  const n = text.split(from).length - 1;
  if (n < 1) throw new Error(`mutation ${MUTATE}: its text is not in the module`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "k4-model-"));
  fs.copyFileSync(KEYS, path.join(dir, "ayah-keys.js"));
  fs.writeFileSync(path.join(dir, "keys-teacher-view-model.js"), text.split(from).join(to));
  console.log(`(mutation ${MUTATE}: ${n} occurrence(s) replaced)`);
  modUrl = pathToFileURL(path.join(dir, "keys-teacher-view-model.js")).href;
}
const M = await import(modUrl);

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = typeof fn === "function" ? fn() : fn;
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous: it was given a promise");
    if (r === false) throw new Error("returned false");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}
const eq = (a, b, what = "") => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error(`${what} expected ${y}, got ${x}`); };

// Two students and one whose read was refused. Sūrah 36.
const A = { personId: "p2", name: "Maryam",
  surahDoc: { "ayah:36:1": ["hard"], "ayah:36:2": ["practice", "done"], "ayah:36:3": ["done"], "ayah:36:9": ["gharib"],
    "qword:36:1:2": ["hard"], "ayah:2:255": ["hard"], "ayah:36:4": [] },
  hadithDoc: { "hadith:hadeethenc:3062": ["hard"], "hadithword:hadeethenc:3062:1": ["practice"] } };
const B = { personId: "p3", name: "Yusuf",
  surahDoc: { "ayah:36:2": ["hard"], "ayah:36:1": ["done"], "qword:36:1:2": ["practice"], "ayah:36:5": ["practice"] },
  hadithDoc: { "hadith:hadeethenc:3062": ["practice"] } };
const C = { personId: "p4", name: "Zaid", error: "permission-denied", surahDoc: { "ayah:36:5": ["hard"] } };
const v = M.teacherViewModel([A, B, C], 36);
const row = (id) => v.students.find((s) => s.personId === id);

check("POSITIVE CONTROL: the model returns one row per student, in the order given", () => eq(v.students.map((s) => s.personId), ["p2", "p3", "p4"]));
check("Maryam's āyāt counts: Difficult 1, Need practice 1, Done 2 (an āyah with two marks counts under each)", () => eq(row("p2").counts.ayah, { hard: 1, practice: 1, done: 2 }));
check("a key that is not a mark (gharib) and an empty list count nothing", () => eq(row("p2").total, 6, "total items marked"));
check("a word is counted as a word, not an āyah", () => eq(row("p2").counts.qword, { hard: 1, practice: 0, done: 0 }));
check("an āyah of ANOTHER sūrah in the document is ignored", () => eq(row("p2").counts.ayah.hard, 1));
check("hadith and hadith words are counted from the collection's document", () => {
  eq(row("p2").counts.hadith, { hard: 1, practice: 0, done: 0 }, "hadith");
  eq(row("p2").counts.hadithword, { hard: 0, practice: 1, done: 0 }, "hadith words");
});
check("Yusuf's counts", () => {
  eq(row("p3").counts.ayah, { hard: 1, practice: 1, done: 1 }, "ayah");
  eq(row("p3").counts.qword, { hard: 0, practice: 1, done: 0 }, "qword");
  eq(row("p3").counts.hadith, { hard: 0, practice: 1, done: 0 }, "hadith");
});
check("a student whose read was refused keeps the error and counts nothing", () => {
  eq(row("p4").error, "permission-denied"); eq(row("p4").total, 0);
});

const top = v.mostMarked.map((x) => `${x.unitKey}=${x.students}`);
check("marked by most students: Difficult OR Need practice ranks an item, by distinct students, most first, ties by key", () => eq(top, [
  "ayah:36:2=2", "hadith:hadeethenc:3062=2", "qword:36:1:2=2",
  "ayah:36:1=1", "ayah:36:5=1", "hadithword:hadeethenc:3062:1=1",
]));
check("Done never ranks an item: ayah:36:3 (Done only) is not in the list", () => eq(v.mostMarked.some((x) => x.unitKey === "ayah:36:3"), false));
check("a refused student's marks do not reach the ranking (ayah:36:5 counts Yusuf only)", () => eq(v.mostMarked.find((x) => x.unitKey === "ayah:36:5").students, 1));
check("each ranked item shows its Done count separately", () => {
  eq(v.mostMarked.find((x) => x.unitKey === "ayah:36:2").byMark, { hard: 1, practice: 1, done: 1 }, "36:2");
  eq(v.mostMarked.find((x) => x.unitKey === "ayah:36:1").byMark, { hard: 1, practice: 0, done: 1 }, "36:1");
});
check("a ranked item carries its parts for the link", () => {
  const a = v.mostMarked.find((x) => x.unitKey === "qword:36:1:2");
  eq([a.kind, a.surah, a.ayah, a.position], ["qword", 36, 1, 2]);
  const h = v.mostMarked.find((x) => x.unitKey === "hadith:hadeethenc:3062");
  eq([h.kind, h.collection, h.number], ["hadith", "hadeethenc", "3062"]);
});
check("another sūrah: only that sūrah's Qur'an marks count, the hadith still do", () => {
  const w = M.teacherViewModel([A, B], 2);
  eq(w.students[0].counts.ayah.hard, 1, "Maryam on 2"); eq(w.students[0].counts.qword.hard, 0, "no word on 2");
  eq(w.students[0].counts.hadith.hard, 1, "hadith");
});
check("no students, nothing marked, nothing ranked", () => eq(M.teacherViewModel([], 1), { surah: 1, students: [], mostMarked: [] }));
check("DIFFICULTY_MARKS is Difficult and Need practice only", () => eq([...M.DIFFICULTY_MARKS], ["hard", "practice"]));
check("parseKeyUnit refuses a malformed key", () => {
  for (const k of ["ayah:36", "ayah:x:1", "qword:36:1", "hadithword:hadeethenc:1:x", "note:36:1", 5, null]) eq(M.parseKeyUnit(k, 36), null, String(k));
});
check("the module is pure: it imports nothing but ayah-keys.js", () => {
  const text = fs.readFileSync(SRC, "utf8");
  const imports = [...text.matchAll(/^\s*import\s.*?from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  eq(imports, ["./ayah-keys.js"]);
  if (/\b(document|window|fetch|localStorage|getDoc)\b/.test(text.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""))) throw new Error("touches the page or the network");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
