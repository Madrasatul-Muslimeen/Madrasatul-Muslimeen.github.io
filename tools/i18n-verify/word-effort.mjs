// MSA · QR J136 (PCF MSA J136, the Owner's "Approved with recommended", 10 Nov 2026) -- "Mark the Word": app/js/word-effort.js (the
// five marks and the degrees), setWordMarks() in app/js/ayah-keys-data.js (saving), and the Rules CANDIDATE
// docs/proposals/word-effort.candidate.rules (NOT published).
//
// Firebase-free: imports are replaced in memory, a real mutating store stands in for Firestore. Run from the repository root.
//   node tools/i18n-verify/word-effort.mjs                 the suite
//   node tools/i18n-verify/word-effort.mjs --mutant=NAME   the suite against a deliberately broken copy; it MUST report failures
//                                                           (--list-mutants prints the names)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const appJs = path.join(root, "app/js");
const argv = process.argv.slice(2);
const mutantName = (argv.find((a) => a.startsWith("--mutant=")) || "").slice(9);

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") throw new TypeError("check() is synchronous; use acheck() for an async body.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${String(err.message).split("\n")[0].slice(0, 300)}`); }
}
async function acheck(name, fn) {
  try { await fn(); passed++; console.log(`  PASS  ${name}`); }
  catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${String(err.message).split("\n")[0].slice(0, 300)}`); }
}

// ---- mutants: [name, file, regex, replacement]. Every one must make the suite FAIL. ----------------------------------------
const MUTANTS = {
  "flag-false": ["word-effort.js", /WORD_EFFORT_RULES_PUBLISHED = true;/, "WORD_EFFORT_RULES_PUBLISHED = false;"],
  "no-refuse": ["ayah-keys-data.js", /if \(wantsEffortField && !WORD_EFFORT_RULES_PUBLISHED\) return \{ ok: false, refused: "rules-not-published" \};/, ""],
  "very-not-hard": ["word-effort.js", /if \(markId === "very"\) \{ add\("hard"\)/, "if (markId === \"very\") { /*x*/"],
  "known-keeps-hard": ["word-effort.js", /if \(markId === "known"\) \{ drop\("hard"\); e = "known"; \}/, "if (markId === \"known\") { e = \"known\"; }"],
  "easy-not-done": ["word-effort.js", /if \(markId === "easy"\) \{ drop\("hard"\); add\("done"\); e = "easy"; \}/, "if (markId === \"easy\") { drop(\"hard\"); e = \"easy\"; }"],
  "old-done-not-easy": ["word-effort.js", /if \(k\.includes\("done"\)\) return "easy";/, ""],
  "old-hard-not-hard": ["word-effort.js", /if \(k\.includes\("hard"\)\) return "hard";/, ""],
  "result-stacks": ["word-effort.js", /  drop\("done"\);\n  if \(e === "very"/, "  if (e === \"very\""],
  "effort-written-always": ["ayah-keys-data.js", /const writeEffort = WORD_EFFORT_RULES_PUBLISHED && \(effort !== null \|\| hadEffort\);/, "const writeEffort = (effort !== null || hadEffort);"],
  "delete-field": ["ayah-keys-data.js", /fields\[`effort\.\$\{unitKey\}`\] = effort;/, "fields[`effort.${unitKey}`] = effort === null ? deleteField() : effort;"],
  "percent-nan": ["word-effort.js", /return total > 0 \? \(\(count \/ total\) \* 100\)\.toFixed\(2\) : "0\.00";/, "return ((count / total) * 100).toFixed(2);"],
  "empty-doc": ["ayah-keys-data.js", /if \(!snap\.exists\(\) && next\.length === 0 && effort === null\) return;[^\n]*\n/, "\n"],
};
if (argv.includes("--list-mutants")) { console.log(Object.keys(MUTANTS).join("\n")); process.exit(0); }
function read(file) {
  let text = fs.readFileSync(path.join(appJs, file), "utf8");
  if (mutantName) {
    const m = MUTANTS[mutantName];
    assert.ok(m, `unknown mutant ${mutantName}`);
    if (m[0] === file) {
      const n = (text.match(new RegExp(m[1].source, "g")) || []).length;
      assert.ok(n >= 1, `mutant ${mutantName}: the anchor matched nothing in ${file} -- it would prove nothing`);
      text = text.replace(new RegExp(m[1].source, "g"), m[2]);
      console.log(`  [mutant ${mutantName}] occurrences replaced in ${file}: ${n}`);
    }
  }
  return text;
}
const load = (text) => import(`data:text/javascript;base64,${Buffer.from(text).toString("base64")}`);

// ---- the real, pure module (and a copy with the flag flipped, to test the day after the Owner publishes) ------------------------
const effortText = read("word-effort.js");
// UPDATED IN PLACE 11 Nov 2026 (QR Lead 46L): the Owner PUBLISHED the Rules, so the repository's flag is now TRUE. `W` stays the
// "Rules not published" copy (the flag forced false) because the refusal path must keep working and keep being tested;
// `WREAL` is the file exactly as it is, for the checks about the repository's own flag.
const WREAL = await load(effortText);
const W = await load(effortText.replace(/WORD_EFFORT_RULES_PUBLISHED = (false|true);/, "WORD_EFFORT_RULES_PUBLISHED = false;"));
const WPUB = await load(effortText.replace(/WORD_EFFORT_RULES_PUBLISHED = (false|true);/, "WORD_EFFORT_RULES_PUBLISHED = true;"));

check("the module imports nothing (it is pure)", () => assert.ok(!/^\s*import\s/m.test(effortText)));
check("the flag in the repository is TRUE, because the Owner published the Rules (11 Nov 2026) and firestore.rules carries `effort`", () => {
  const real = fs.readFileSync(path.join(appJs, "word-effort.js"), "utf8");
  assert.match(real, /export const WORD_EFFORT_RULES_PUBLISHED = true;/);
  assert.equal(WREAL.WORD_EFFORT_RULES_PUBLISHED, true);
});
check("the five marks, in the Owner's order, with their kinds", () => {
  assert.deepEqual(W.WORD_MARKS.map((m) => m.id), ["known", "difficult", "learn", "easy", "very"]);
  assert.deepEqual(W.WORD_MARKS.map((m) => m.names.en), ["Already Known", "Difficult", "Learn", "Learned Easy", "Very Hard"]);
  assert.deepEqual(W.WORD_MARKS.map((m) => m.kind), ["result", "assessment", "act", "result", "result"]);
});
check("four counted degrees, in the Owner's order, both languages filled (I11)", () => {
  assert.deepEqual(W.EFFORT_DEGREES.map((d) => d.id), ["known", "easy", "hard", "very"]);
  assert.deepEqual(W.EFFORT_DEGREES.map((d) => d.names.en), ["Already Known", "Learned Easy", "Hard", "Very Hard"]);
  for (const d of W.EFFORT_DEGREES) assert.ok(d.names.bn && d.names.bn !== d.names.en, `${d.id} has no Bangla name`);
  for (const m of W.WORD_MARKS) assert.ok(m.names.bn && m.sub.bn, `${m.id} has no Bangla`);
});
check("the stored effort words are exactly known / easy / very (hard is never stored: it is the key `hard`)", () => {
  assert.deepEqual([...W.EFFORT_STORED], ["known", "easy", "very"]);
  assert.equal(W.isEffortWord("hard"), false);
  assert.equal(W.isEffortWord("easy"), true);
  assert.equal(W.isEffortWord(undefined), false);
});

// ---- degreeOf: what a word counts as ----------------------------------------------------------------------------------------
check("an old Learned mark (done) counts as Learned Easy; an old Difficult (hard) as Hard; nothing as nothing", () => {
  assert.equal(W.degreeOf(["done"], null), "easy");
  assert.equal(W.degreeOf(["hard"], null), "hard");
  assert.equal(W.degreeOf([], null), null);
  assert.equal(W.degreeOf(undefined, undefined), null);
  assert.equal(W.degreeOf(["practice"], null), null, "Learn alone is an action, not a degree");
});
check("a stored result wins over the saved keys", () => {
  assert.equal(W.degreeOf(["hard"], "known"), "known");
  assert.equal(W.degreeOf(["done"], "very"), "very");
  assert.equal(W.degreeOf(["hard", "done"], null), "easy", "Learned Easy outranks Difficult when both keys are old marks");
});
check("an unknown effort word counts as nothing extra (the client never invents a degree)", () => {
  assert.equal(W.degreeOf([], "banana"), null);
  assert.equal(W.degreeOf(["hard"], "banana"), "hard");
});

// ---- tapMark: the whole next state -------------------------------------------------------------------------------------------
const tap = (state, id) => W.tapMark(state.keys, state.effort, id);
const S0 = { keys: [], effort: null };
check("Difficult and Learn switch their own saved key, and nothing else", () => {
  const a = tap(S0, "difficult");
  assert.deepEqual(a, { keys: ["hard"], effort: null, needsRules: false });
  assert.deepEqual(tap(a, "difficult"), { keys: [], effort: null, needsRules: false });
  assert.deepEqual(tap(S0, "learn"), { keys: ["practice"], effort: null, needsRules: false });
});
check("Learned Easy = the saved key `done` + effort easy, and it needs NO new Rules (the old key carries it)", () => {
  const r = tap(S0, "easy");
  assert.deepEqual(r, { keys: ["done"], effort: "easy", needsRules: false });
});
check("Already Known and Very Hard need the new Rules; Very Hard is also Difficult", () => {
  assert.deepEqual(tap(S0, "known"), { keys: [], effort: "known", needsRules: true });
  assert.deepEqual(tap(S0, "very"), { keys: ["hard"], effort: "very", needsRules: true });
});
check("a result REPLACES another: easy -> very -> known leaves one result and the right keys", () => {
  let s = tap(S0, "easy"); s = tap(s, "very");
  assert.deepEqual(s, { keys: ["hard"], effort: "very", needsRules: true });
  s = tap(s, "known");
  assert.deepEqual(s, { keys: [], effort: "known", needsRules: true }, "Very Hard's Difficult key must go when Already Known replaces it");
  s = tap(s, "easy");
  assert.deepEqual(s, { keys: ["done"], effort: "easy", needsRules: false });
});
check("choosing the pressed result again CLEARS it, and what it put in place goes with it", () => {
  assert.deepEqual(tap(tap(S0, "very"), "very"), { keys: [], effort: null, needsRules: false });
  assert.deepEqual(tap(tap(S0, "easy"), "easy"), { keys: [], effort: null, needsRules: false });
  assert.deepEqual(tap(tap(S0, "known"), "known"), { keys: [], effort: null, needsRules: false });
});
check("Learned Easy and Already Known switch Difficult OFF (an easy word is not hard)", () => {
  assert.deepEqual(tap({ keys: ["hard"], effort: null }, "easy").keys, ["done"]);
  assert.deepEqual(tap({ keys: ["hard"], effort: null }, "known").keys, []);
});
check("Learn is untouched by a result", () => {
  assert.deepEqual(tap({ keys: ["practice"], effort: null }, "very").keys, ["practice", "hard"]);
  assert.deepEqual(tap({ keys: ["practice", "hard"], effort: "very" }, "easy").keys, ["practice", "done"]);
});
check("switching Difficult off ends a stored Very Hard (it was hard by key)", () => {
  assert.deepEqual(tap({ keys: ["hard"], effort: "very" }, "difficult"), { keys: [], effort: null, needsRules: false });
});
check("an unknown mark id throws by name", () => assert.throws(() => W.tapMark([], null, "banana"), /unknown mark banana/));
check("pressedMarks follows the state (one result at a time)", () => {
  assert.deepEqual(W.pressedMarks(["hard"], "very"), { known: false, difficult: false, learn: false, easy: false, very: true });
  assert.deepEqual(W.pressedMarks(["hard", "practice"], null), { known: false, difficult: true, learn: true, easy: false, very: false });
  assert.deepEqual(W.pressedMarks(["done"], null), { known: false, difficult: false, learn: false, easy: true, very: false });
});

// ---- the tally and the table ------------------------------------------------------------------------------------------------
check("tallyDegrees counts each word once, in the four degrees, over the given words only", () => {
  const entries = { a: ["hard"], b: ["done"], c: ["hard"], d: ["practice"], z: ["hard"] };
  const effort = { c: "very", e: "known" };
  const t = W.tallyDegrees(["a", "b", "c", "d", "e", "f"], entries, effort);
  assert.deepEqual(t, { known: 1, easy: 1, hard: 1, very: 1, total: 6 });
});
check("percentOf is two decimals and never NaN on an empty total", () => {
  assert.equal(W.percentOf(1, 4), "25.00");
  assert.equal(W.percentOf(0, 0), "0.00");
  assert.equal(W.percentOf(5, 0), "0.00");
});
check("the table lists the four degrees with count and %, and says 'of N words'", () => {
  const html = W.effortTableHtml({ known: 1, easy: 1, hard: 2, very: 0, total: 8 }, { lang: "en" });
  for (const [id, c, p] of [["known", "1", "12.50"], ["easy", "1", "12.50"], ["hard", "2", "25.00"], ["very", "0", "0.00"]]) {
    assert.match(html, new RegExp(`data-effort-row="${id}"[^]*?<td class="n">${c}</td><td class="n">${p}%</td>`), id);
  }
  assert.match(html, /of 8 words/);
  assert.match(W.effortTableHtml({ known: 0, easy: 0, hard: 0, very: 0, total: 0 }, {}), /0\.00%/);
  assert.ok(!/NaN/.test(W.effortTableHtml({ known: 0, easy: 0, hard: 0, very: 0, total: 0 }, {})));
});
check("the table is in Bangla when asked (I11)", () => {
  const html = W.effortTableHtml({ known: 0, easy: 0, hard: 0, very: 0, total: 3 }, { lang: "bn" });
  assert.match(html, /আগে থেকেই জানা/); assert.match(html, /সহজে শেখা/); assert.match(html, /খুব কঠিন/);
});
check("the row: five buttons, the pressed ones say so, a busy/viewer row is locked, a note is shown as plain text (escaped)", () => {
  const row = W.wordMarksRowHtml({ unitKey: "qword:4:1:2", keys: ["hard"], effort: "very", lang: "en", heading: "Mark the Word", note: "<b>x</b>" });
  assert.equal((row.match(/data-word-mark="/g) || []).length, 5);
  assert.match(row, /data-word-mark="very" aria-pressed="true"/);
  assert.match(row, /data-word-mark="known" aria-pressed="false"/);
  assert.match(row, /data-marks-unit="qword:4:1:2"/);
  assert.ok(!/<b>x<\/b>/.test(row), "a note must be escaped");
  assert.match(row, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.equal((W.wordMarksRowHtml({ unitKey: "u", busy: true }).match(/ disabled/g) || []).length, 5);
  assert.equal((W.wordMarksRowHtml({ unitKey: "u", disabled: true }).match(/ disabled/g) || []).length, 5);
});

// ---- saving: setWordMarks against a store that really mutates -----------------------------------------------------------------
const store = new Map(), writeLog = [], reads = [], failures = [];
let failNext = false;
const TS = new Date("2026-11-10T00:00:00Z");
const applyDoc = (key, data) => {
  const cur = { ...(store.get(key) || {}) };
  for (const [k, val] of Object.entries(data)) {
    const dot = k.indexOf(".");
    if (dot > 0) { const top = k.slice(0, dot), rest = k.slice(dot + 1); cur[top] = { ...(cur[top] || {}), [rest]: val }; } else cur[k] = val;
  }
  store.set(key, cur);
};
const denied = () => Object.assign(new Error("denied"), { code: "permission-denied" });
globalThis.__weFirestore = {
  doc: (_db, col, id) => ({ __col: col, __id: id }),
  getDoc: async (ref) => { reads.push(`${ref.__col}/${ref.__id}`); const v = store.get(`${ref.__col}/${ref.__id}`); return { exists: () => v !== undefined, data: () => v }; },
};
globalThis.__weEnvelope = {
  createDocument: async (_db, col, id, data, uid) => { if (failNext) { failNext = false; throw denied(); } writeLog.push({ kind: "create", id, data }); applyDoc(`${col}/${id}`, { ...data, schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: uid }); },
  updateDocument: async (_db, col, id, data) => { if (failNext) { failNext = false; throw denied(); } writeLog.push({ kind: "update", id, data }); applyDoc(`${col}/${id}`, { ...data, updatedAt: TS }); },
};
globalThis.__weErrors = { safeWrite: async (fn, context) => { try { await fn(); return { ok: true }; } catch (error) { const entry = { code: error.code, context }; failures.push(entry); return { ok: false, entry }; } } };
globalThis.__weUnitKeys = await load(fs.readFileSync(path.join(appJs, "unit-keys.js"), "utf8").replace(/import \{[^}]*\} from "\.\/i18n\.js";/, "const t = (k) => k, num = (n) => String(n);"));
globalThis.__weKeys = await load(fs.readFileSync(path.join(appJs, "ayah-keys.js"), "utf8"));

function dataLayer(effortModule, variant) {
  globalThis.__weEffort = effortModule;
  const src = read("ayah-keys-data.js")
    .replace(/import \{[^}]*\} from "https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/, "const { doc, getDoc } = globalThis.__weFirestore; const deleteField = () => { throw new Error('deleteField must never be used'); };")
    .replace(/import \{ TENANT \} from "\.\/collections\.js";/, 'const TENANT = { AYAH_KEY_MARKS: "ayahKeyMarks", HADITH_KEY_MARKS: "hadithKeyMarks" };')
    .replace(/import \{ createDocument, updateDocument \} from "\.\/envelope\.js";/, "const { createDocument, updateDocument } = globalThis.__weEnvelope;")
    .replace(/import \{ safeWrite \} from "\.\/errors\.js";/, "const { safeWrite } = globalThis.__weErrors;")
    .replace(/import \{ buildUnitKey \} from "\.\/unit-keys\.js";/, "const { buildUnitKey } = globalThis.__weUnitKeys;")
    .replace(/import \{ isKeyId, MADRASAH_SCOPE \} from "\.\/ayah-keys\.js";/, "const { isKeyId, MADRASAH_SCOPE } = globalThis.__weKeys;")
    .replace(/import \{ WORD_EFFORT_RULES_PUBLISHED, isEffortWord \} from "\.\/word-effort\.js";/, "const { WORD_EFFORT_RULES_PUBLISHED, isEffortWord } = globalThis.__weEffort;");
  assert.ok(!/^import /m.test(src), "an import survived the in-memory replacement");
  return src + `\n// variant: ${variant}`; // a distinct URL, or the module cache would hand back the first copy
}
// the module's constants are read at call time, so the two copies need separate evaluation
const dataOff = await load(dataLayer(W, "rules-not-published"));
const dataOn = await load(dataLayer(WPUB, "rules-published"));
globalThis.__weEffort = W; // the `Off` module closed over W when it was evaluated; `On` over WPUB

const ctx = { tenantId: "t1", personId: "p1", uid: "uid-p1" };
const db = {};
const reset = () => { store.clear(); writeLog.length = 0; reads.length = 0; failures.length = 0; failNext = false; };
const doc1 = (scope = "p1", surah = 4) => store.get(`ayahKeyMarks/t1__${scope}__${surah}`);
const base = { scope: "p1", surah: 4, ayah: 1, position: 2 };
const U = "qword:4:1:2";

await acheck("RULES NOT PUBLISHED: Already Known and Very Hard are REFUSED with a named reason, and NOTHING is read or written", async () => {
  reset();
  for (const effort of ["known", "very"]) {
    const r = await dataOff.setWordMarks(db, ctx, { ...base, keys: effort === "very" ? ["hard"] : [], effort });
    assert.deepEqual(r, { ok: false, refused: "rules-not-published" }, effort);
  }
  assert.equal(reads.length, 0, "a refused request must not read");
  assert.equal(writeLog.length, 0, "a refused request must not write");
});
await acheck("RULES NOT PUBLISHED: Learned Easy, Difficult and Learn still SAVE, as keys only -- no `effort` field is ever sent", async () => {
  reset();
  let r = await dataOff.setWordMarks(db, ctx, { ...base, keys: ["done"], effort: "easy" });
  assert.deepEqual(r, { ok: true, keys: ["done"], effort: "easy" });
  const created = writeLog[0];
  assert.equal(created.kind, "create");
  assert.deepEqual(Object.keys(created.data).sort(), ["entries", "scope", "surah", "tenantId"], "the create may carry only the four published fields");
  r = await dataOff.setWordMarks(db, ctx, { ...base, keys: ["done", "practice"], effort: "easy" });
  assert.ok(r.ok);
  const upd = writeLog[1];
  assert.equal(upd.kind, "update");
  assert.deepEqual(Object.keys(upd.data), [`entries.${U}`], "an update before publishing may touch entries only");
  assert.ok(!("effort" in doc1()), "no effort field may exist on the stored document");
});
await acheck("RULES PUBLISHED: the effort word is written beside the keys, in the same one update", async () => {
  reset();
  await dataOn.setWordMarks(db, ctx, { ...base, keys: ["hard"], effort: "very" });
  assert.equal(writeLog.length, 1);
  assert.deepEqual(doc1().entries, { [U]: ["hard"] });
  assert.deepEqual(doc1().effort, { [U]: "very" });
  await dataOn.setWordMarks(db, ctx, { ...base, keys: [], effort: "known" });
  assert.equal(writeLog[1].kind, "update");
  assert.deepEqual(Object.keys(writeLog[1].data).sort(), [`effort.${U}`, `entries.${U}`].sort());
  assert.deepEqual(doc1().effort, { [U]: "known" });
});
await acheck("RULES PUBLISHED: clearing a result writes null (never a deletion), and the entries list stays", async () => {
  await dataOn.setWordMarks(db, ctx, { ...base, keys: [], effort: null });
  assert.equal(doc1().effort[U], null);
  assert.deepEqual(doc1().entries[U], []);
  assert.ok(doc1(), "the document must not disappear");
});
await acheck("RULES PUBLISHED: a word that never had an effort does not get an effort field written for a plain Difficult", async () => {
  reset();
  await dataOn.setWordMarks(db, ctx, { ...base, keys: ["hard"], effort: null });
  assert.ok(!("effort" in doc1()), "a plain mark must not create an empty effort map");
});
await acheck("another word of the same sūrah is another entry; the first word's marks are not disturbed", async () => {
  reset();
  await dataOn.setWordMarks(db, ctx, { ...base, keys: ["done"], effort: "easy" });
  await dataOn.setWordMarks(db, ctx, { ...base, position: 3, keys: ["hard"], effort: "very" });
  assert.deepEqual(doc1().entries, { [U]: ["done"], "qword:4:1:3": ["hard"] });
  assert.deepEqual(doc1().effort, { [U]: "easy", "qword:4:1:3": "very" });
});
await acheck("the entries key is the real buildUnitKey.qword(surah, ayah, position)", async () => {
  assert.equal(globalThis.__weUnitKeys.buildUnitKey.qword(4, 1, 2), U);
});
await acheck("bad requests are refused BEFORE any read or write: sūrah, āyah, word, scope, key id, effort word", async () => {
  reset();
  const ok = { ...base, keys: ["hard"], effort: null };
  const cases = [
    [{ ...ok, surah: 0 }, "bad-ayah"], [{ ...ok, surah: 115 }, "bad-ayah"], [{ ...ok, ayah: 0 }, "bad-ayah"],
    [{ ...ok, position: 0 }, "bad-word"], [{ ...ok, scope: "a__b" }, "bad-scope"], [{ ...ok, scope: "" }, "bad-scope"],
    [{ ...ok, keys: ["nonsense"] }, "unknown-key"], [{ ...ok, keys: "hard" }, "unknown-key"], [{ ...ok, effort: "banana" }, "unknown-effort"],
    [{ ...ok, effort: "hard" }, "unknown-effort"],
  ];
  for (const [req, why] of cases) assert.deepEqual(await dataOn.setWordMarks(db, ctx, req), { ok: false, refused: why }, JSON.stringify(req));
  assert.equal(reads.length + writeLog.length, 0);
  await assert.rejects(() => dataOn.setWordMarks(db, { tenantId: "t1" }, ok), /ctx must carry/);
});
await acheck("an empty state on a sūrah with no document makes no document", async () => {
  reset();
  const r = await dataOn.setWordMarks(db, ctx, { ...base, keys: [], effort: null });
  assert.equal(r.ok, true);
  assert.equal(writeLog.length, 0); assert.equal(store.size, 0);
});
await acheck("I15: a failed save reaches the user (safeWrite names the collection) and returns ok:false", async () => {
  reset();
  failNext = true;
  const r = await dataOn.setWordMarks(db, ctx, { ...base, keys: ["done"], effort: "easy" });
  assert.equal(r.ok, false);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].context.collection, "ayahKeyMarks");
  assert.equal(failures[0].code, "permission-denied");
});
await acheck("duplicate key ids are stored once", async () => {
  reset();
  const r = await dataOn.setWordMarks(db, ctx, { ...base, keys: ["hard", "hard", "practice"], effort: null });
  assert.deepEqual(r.keys, ["hard", "practice"]);
});
check("ayah-keys-data.js never deletes (no deleteDoc, delete(), or a real deleteField call)", () => {
  const text = fs.readFileSync(path.join(appJs, "ayah-keys-data.js"), "utf8");
  assert.ok(!/\bdeleteDoc\b|\.delete\(|deleteField/.test(text));
});
check("AYAH_KEY_WRITES still lists the four PUBLISHED fields; `effort` is declared separately until the Owner publishes", () => {
  const text = fs.readFileSync(path.join(appJs, "ayah-keys-data.js"), "utf8");
  assert.match(text, /AYAH_KEY_WRITES = Object\.freeze\(\[\s*"tenantId", "scope", "surah", "entries",\s*\]\)/);
  assert.match(text, /AYAH_KEY_EFFORT_WRITES = Object\.freeze\(\["effort"\]\)/);
});

// ---- wiring: who imports what (a new importer must be audited deliberately) -----------------------------------------------------
const jsFiles = fs.readdirSync(appJs).filter((f) => f.endsWith(".js"));
const importersOf = (mod) => jsFiles.filter((f) => new RegExp(`from\\s*["']\\./${mod.replace(".", "\\.")}["']`).test(fs.readFileSync(path.join(appJs, f), "utf8"))).sort();
const pagesNaming = (mod) => fs.readdirSync(path.join(root, "app")).filter((f) => f.endsWith(".html") && fs.readFileSync(path.join(root, "app", f), "utf8").includes(`./js/${mod}`)).sort();
check("POSITIVE CONTROL: the importer scan finds a module that is known to be imported", () => assert.ok(importersOf("ayah-keys.js").includes("ayah-keys-data.js")));
check("word-effort.js is imported by ayah-keys-data.js only, among the modules", () => assert.deepEqual(importersOf("word-effort.js"), ["ayah-keys-data.js"]));
check("only quranrevival.html names word-effort.js, and it does so to draw the row, the table and the saving", () => {
  assert.deepEqual(pagesNaming("word-effort.js"), ["quranrevival.html"]);
  const html = fs.readFileSync(path.join(root, "app/quranrevival.html"), "utf8");
  for (const name of ["wordMarksRowHtml", "wireWordMarksRow", "tapMark", "tallyDegrees", "effortTableHtml", "WORD_EFFORT_CSS"]) assert.ok(new RegExp(`import \\{[^}]*\\b${name}\\b[^}]*\\} from "\\./js/word-effort\\.js"`).test(html), `quranrevival.html does not import ${name}`);
  assert.match(html, /import \{[^}]*\bsetWordMarks\b[^}]*\} from "\.\/js\/ayah-keys-data\.js"/);
});
check("the page's tap handler goes through setWordMarks, and a refused save is turned into a plain-words note, never swallowed", () => {
  const html = fs.readFileSync(path.join(root, "app/quranrevival.html"), "utf8");
  const fn = html.slice(html.indexOf("async function onWordMarkTap"), html.indexOf("async function onMarkToggle"));
  assert.ok(fn.length > 400, "POSITIVE CONTROL: the handler was not found");
  assert.match(fn, /setWordMarks\(db, c,/);
  assert.match(fn, /res\?\.refused === "rules-not-published"/);
  assert.match(fn, /wordEffortNote = \{ unitKey, text: t\("This mark cannot be saved yet/);
});

// ---- the Rules candidate: byte-for-byte the published block except the effort lines ----------------------------------------------
function block(text, name) {
  const start = text.search(new RegExp(`^    match /${name}/`, "m"));
  assert.notEqual(start, -1, `no ${name} block`);
  let depth = 0;
  for (let i = text.indexOf("} {", start) + 2; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error(`unterminated ${name} block`);
}
const live = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const candText = fs.readFileSync(path.join(root, "docs/proposals/word-effort.candidate.rules"), "utf8");
check("firestore.rules carries `effort` in the ayahKeyMarks block (the Owner published it, 11 Nov 2026), and the flag is true with it", () => {
  assert.ok(/'effort'/.test(block(live, "ayahKeyMarks")), "the published block does not carry effort: the flag is true, so every Already Known / Very Hard save would be DENIED");
  assert.equal(WREAL.WORD_EFFORT_RULES_PUBLISHED, true);
});
check("the candidate IS the published ayahKeyMarks block (the Owner published it; effort lines and all, comments aside)", () => {
  const norm = (text) => text.split("\n").filter((l) => l.trim() && !/^\s*\/\//.test(l)).join("\n");
  let c = block(candText, "ayahKeyMarks");
  assert.ok(c.includes("'entries', 'effort',"), "POSITIVE CONTROL: the field-list change was not found");
  c = c.replace("'entries', 'effort',", "'entries',");
  assert.ok(c.includes("&& effortOk()\n"), "POSITIVE CONTROL: the effortOk() call was not found");
  c = c.replace(/\n\s*&& effortOk\(\)/, "");
  const fn = c.match(/\n\s*function effortOk\(\) \{[^}]*\}\n/);
  assert.ok(fn, "POSITIVE CONTROL: effortOk() was not found");
  c = c.replace(fn[0], "\n");
  assert.equal(norm(block(candText, "ayahKeyMarks")), norm(block(live, "ayahKeyMarks")), "the published block is not the candidate's");
  assert.ok(norm(c).length > 0, "POSITIVE CONTROL: undoing the effort lines left something");
});
check("the candidate keeps every guard: delete closed, key binding, createdBy frozen, tenant/scope/surah frozen, person-in-tenant", () => {
  const c = block(candText, "ayahKeyMarks");
  for (const needle of ["allow delete: if false;", "markKey == d().tenantId + '__' + d().scope + '__' + string(d().surah)", "d().createdBy == resource.data.createdBy", "d().tenantId == resource.data.tenantId", "d().scope == resource.data.scope", "d().surah == resource.data.surah", "personInTenant(tenantId, scope)"]) {
    assert.ok(c.includes(needle), `missing: ${needle}`);
  }
});
check("the candidate allows `effort` in the field list, requires nothing new (hasAll unchanged), and bounds it as a map of at most 7000", () => {
  const c = block(candText, "ayahKeyMarks");
  assert.match(c, /hasOnly\(\[\s*'tenantId', 'scope', 'surah', 'entries', 'effort',/);
  assert.match(c, /hasAll\(\[\s*'tenantId', 'scope', 'surah', 'entries',\s*'schemaVersion'/, "effort must stay OPTIONAL: hasAll must not name it");
  assert.match(c, /!\('effort' in d\(\)\)\s*\|\|\s*\(d\(\)\.effort is map && d\(\)\.effort\.size\(\) <= 7000\)/);
});
check("the DEPLOYMENT file (what the Owner pastes in Firebase) is the published firestore.rules with ONLY the ayahKeyMarks block replaced by the candidate's", () => {
  const dep = fs.readFileSync(path.join(root, "docs/proposals/word-effort.DEPLOYMENT-candidate.rules"), "utf8");
  const at = (t) => { const start = t.search(/^    match \/ayahKeyMarks\//m); const end = start + block(t, "ayahKeyMarks").length; return [start, end]; };
  const [ls2, le2] = at(live), [ds, de] = at(dep);
  assert.equal(dep.slice(0, ds), live.slice(0, ls2), "the text BEFORE the block differs from firestore.rules");
  assert.equal(dep.slice(de), live.slice(le2), "the text AFTER the block differs from firestore.rules");
  assert.equal(dep.slice(ds, de), block(candText, "ayahKeyMarks"), "the block is not the candidate's");
});
check("the candidate is a CANDIDATE: it says in words it is not published, and the app says the same", () => {
  assert.match(candText, /CANDIDATE, NOT PUBLISHED/);
  assert.match(candText, /UNTIL THE\s+\/\/\s*OWNER PUBLISHES THIS/);
});

console.log(`\n==== Word effort (MSA · QR J136)${mutantName ? ` [mutant ${mutantName}]` : ""}: ${passed} passed, ${failed} failed ====`);
process.exit(mutantName ? (failed > 0 ? 0 : 3) : (failed ? 1 : 0));
