// PCF MSA J119 -- app/js/bangla-words.js, the pure model of "Words the Qur'an shares with Bangla".
// Run from the repository root:  node tools/i18n-verify/bangla-words.mjs   (no server needed)
//   --prove  re-runs the suite against 5 deliberately broken copies of the module; every one must go red.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SRC = "app/js/bangla-words.js";
const MUTATIONS = {
  "double-counts a word already known": ["knownWithBangla: known + extraWords,", "knownWithBangla: known + words,"],
  "the admin list is editable by anyone": ["list === LIST_ADMIN ? canAdmin === true : false", "list === LIST_ADMIN ? true : false"],
  "the off switch does not empty the set": ["return s.on ? new Set(s[s.list]) : new Set();", "return new Set(s[s.list]);"],
  "a Bangla word does not count as known": ["isKnown(row) === true || banglaSet.has(row?.l)", "isKnown(row) === true"],
  "bad storage throws": ["catch { return emptyBanglaState(); }", "catch (e) { throw e; }"],
};

async function run(file) {
  let pass = 0, fail = 0;
  const check = (name, ok, detail = "") => {
    if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
    if (ok) pass++; else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
  };
  const m = await import(pathToFileURL(file).href + "?" + Math.random());
  // positive control: the module really exports what the rest of the suite uses
  check("exports present", ["activeBanglaSet", "setBanglaWord", "banglaFigures", "knownWithBanglaTest", "loadBanglaState", "canEditList"].every((k) => typeof m[k] === "function"));

  const rows = [{ l: "a", n: 100 }, { l: "b", n: 50 }, { l: "c", n: 25 }, { l: "d", n: 25 }];
  const known = (r) => r.l === "a";
  let s = m.emptyBanglaState();

  // the list itself
  s = m.setBanglaWord(s, "b", true, { canAdmin: true });
  check("admin adds a word", m.hasBanglaWord(s, "b"));
  const denied = m.setBanglaWord(s, "c", true, { canAdmin: false });
  check("a reader cannot change the admin's list (and nothing else changed)", !m.hasBanglaWord(denied, "c") && JSON.stringify(denied) === JSON.stringify(s));
  const mine = m.setBanglaWord({ ...s, list: "mine" }, "c", true, { canAdmin: false });
  check("a reader changes their own list", mine.mine.includes("c") && !mine.admin.includes("c"));
  check("reading the other list shows the other words", m.hasBanglaWord({ ...mine, list: "mine" }, "c") && !m.hasBanglaWord({ ...mine, list: "mine" }, "b"));
  check("switching a word off removes it", !m.hasBanglaWord(m.setBanglaWord(s, "b", false, { canAdmin: true }), "b"));
  check("a junk lemma is refused", m.setBanglaWord(s, "", true, { canAdmin: true }).admin.length === 1 && m.setBanglaWord(s, 5, true, { canAdmin: true }).admin.length === 1);
  check("the list is unique and sorted", JSON.stringify(m.setBanglaWord(m.setBanglaWord(s, "a", true, { canAdmin: true }), "a", true, { canAdmin: true }).admin) === '["a","b"]');
  check("the whole-list switch off empties the set but keeps the words", m.activeBanglaSet({ ...s, on: false }).size === 0 && s.admin.length === 1);

  // the figures: a word already known is never counted twice
  const set = new Set(["a", "b", "c"]);
  const f = m.banglaFigures(rows, 200, set, known);
  check("Bangla words and occurrences", f.words === 3 && f.occurrences === 175 && Math.abs(f.share - 87.5) < 1e-9, JSON.stringify(f));
  check("known before is untouched", f.knownBefore === 1 && f.knownBeforeShare === 50);
  check("a word already known is not added again", f.addedWords === 2 && f.addedOccurrences === 75 && f.knownWithBangla === 3 && f.knownWithBanglaShare === 87.5, JSON.stringify(f));
  const none = m.banglaFigures(rows, 200, new Set(), known);
  check("an empty list changes nothing", none.words === 0 && none.knownWithBangla === 1 && none.share === 0);
  check("a zero total does not divide by zero", m.banglaFigures(rows, 0, set, known).share === 0);
  const test = m.knownWithBanglaTest(known, new Set(["b"]));
  check("the combined test counts known and Bangla", test(rows[0]) && test(rows[1]) && !test(rows[2]));

  // storage
  const store = new Map();
  const ls = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v) };
  check("empty storage gives the empty state", JSON.stringify(m.loadBanglaState(ls)) === JSON.stringify(m.emptyBanglaState()));
  check("save then load round-trips", m.saveBanglaState(s, ls) && JSON.stringify(m.loadBanglaState(ls)) === JSON.stringify(s));
  store.set(m.BANGLA_STORAGE_KEY, "{not json");
  check("bad storage gives the empty state", JSON.stringify(m.loadBanglaState(ls)) === JSON.stringify(m.emptyBanglaState()));
  check("storage that throws gives the empty state", JSON.stringify(m.loadBanglaState({ getItem() { throw new Error("blocked"); } })) === JSON.stringify(m.emptyBanglaState()));
  check("a hostile state is cleaned", m.normaliseBanglaState({ list: "x", admin: ["ok", 3, "", "ok"], mine: "no", wheel: { tenth: "yes" } }).admin.length === 1);
  check("the tag text, English and Bangla", m.banglaTagText("খালি, ফাঁকা") === "Also in Bangla: খালি" && m.banglaTagText("খালি", "bn") === "বাংলায়ও: খালি");
  return { pass, fail };
}

if (process.argv.includes("--prove")) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bnw-"));
  const orig = fs.readFileSync(SRC, "utf8");
  let unproven = 0;
  for (const [name, [from, to]] of Object.entries(MUTATIONS)) {
    const n = orig.split(from).length - 1;
    if (n !== 1) { console.log(`UNPROVEN ${name}: the mutation text occurs ${n} times`); unproven++; continue; }
    const f = path.join(dir, "bangla-words.js");
    fs.writeFileSync(f, orig.replace(from, to));
    let red;
    try { red = (await run(f)).fail > 0; } catch { red = true; }
    console.log(`${red ? "RED (good)" : "STILL GREEN"}  ${name}`);
    if (!red) unproven++;
  }
  process.exit(unproven ? 1 : 0);
}
const { pass, fail } = await run(SRC);
console.log(`bangla-words: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
