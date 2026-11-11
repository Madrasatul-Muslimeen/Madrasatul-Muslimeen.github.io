// PCF MSA J119, Stage 1 (the Owner's answers of 11 Nov 2026: a word may carry several kinds; the reader marks their own words): the PURE data model.
//   node tools/i18n-verify/bangla-words-v2.mjs [--mutate=NAME]      (repository root)
//   --mutate=writev1   saving also rewrites the v1 key                   -> "v1 is never written" FAILS
//   --mutate=nov1read  loading ignores v1                                -> "a v1-only device shows the same words" FAILS
//   --mutate=oneKind   a word keeps only its first kind                  -> "several kinds" FAILS
//   --mutate=order     kinds are kept in the order given                 -> "the Owner's order" FAILS
//   --mutate=adminopen anyone may change the admin list's kinds          -> "a reader cannot change the admin list" FAILS
//   --mutate=keepempty an empty kinds array keeps the word               -> "empty removes" FAILS
// Expected values are written BY HAND.
import fs from "node:fs";
import assert from "node:assert/strict";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const SRC = "app/js/bangla-words.js";
const MUT = {
  writev1: ['storage.setItem(BANGLA_STORAGE_KEY_V2, JSON.stringify(normaliseBanglaState(state))); return true;', 'storage.setItem(BANGLA_STORAGE_KEY_V2, JSON.stringify(normaliseBanglaState(state))); storage.setItem(BANGLA_STORAGE_KEY, "{}"); return true;'],
  nov1read: ["return normaliseBanglaState(read(BANGLA_STORAGE_KEY));", "return emptyBanglaState();"],
  oneKind: ["const out = BANGLA_KINDS.filter((k) => set.has(k));", "const out = BANGLA_KINDS.filter((k) => set.has(k)).slice(0, 1);"],
  order: ["const out = BANGLA_KINDS.filter((k) => set.has(k));", "const out = [...set];"],
  adminopen: ["if (!BANGLA_LISTS.includes(target) || !canEditList(target, canAdmin) || typeof lemma !== \"string\" || !lemma) return s;\n  const wanted", "if (!BANGLA_LISTS.includes(target) || typeof lemma !== \"string\" || !lemma) return s;\n  const wanted"],
  keepempty: ["if (!wanted.length) { ids.delete(lemma); delete map[lemma]; } else", "if (false) { ids.delete(lemma); delete map[lemma]; } else"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let file = SRC;
if (MUTATE) {
  const [a, b] = MUT[MUTATE]; const src = fs.readFileSync(SRC, "utf8");
  if (src.split(a).length !== 2) throw new Error(`mutation ${MUTATE}: anchor found ${src.split(a).length - 1} times, not 1`);
  file = "/tmp/bangla-words-mut.mjs"; fs.writeFileSync(file, src.split(a).join(b));
}
const M = await import(`${file.startsWith("/") ? "" : process.cwd() + "/"}${file}?${Date.now()}`);
let pass = 0, fail = 0;
const check = (name, fn) => {
  let r; try { r = fn(); } catch (e) { fail++; console.log(`  FAIL  ${name} ${String(e.message).split("\n")[0].slice(0, 200)}`); return; }
  if (r && typeof r.then === "function") throw new Error(`check "${name}" returned a promise`);
  pass++; console.log(`  PASS  ${name}`);
};
const store = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

check("POSITIVE CONTROL: the module exposes the v2 functions", () => assert.ok(M.BANGLA_STORAGE_KEY_V2 === "mm_bangla_words.v2" && typeof M.setBanglaWordKinds === "function"));
const V1 = JSON.stringify({ list: "mine", on: true, admin: ["a1", "a2"], mine: ["m1"], wheel: { ring: true, centre: false, tenth: true } });
check("a v1-only device shows the same words, each as kind bangla", () => {
  const st = M.loadBanglaState(store({ "mm_bangla_words.v1": V1 }));
  assert.deepEqual(st.admin, ["a1", "a2"]); assert.deepEqual(st.mine, ["m1"]); assert.equal(st.list, "mine");
  assert.deepEqual(M.banglaKindsOf(st, "a1", "admin"), ["bangla"]); assert.deepEqual(M.banglaKindsOf(st, "m1"), ["bangla"]);
  assert.deepEqual([...M.activeBanglaSet(st)], ["m1"]);
});
check("v1 is never written: saving leaves the v1 text byte for byte, and writes v2", () => {
  const s = store({ "mm_bangla_words.v1": V1 });
  const st = M.setBanglaWordKinds(M.loadBanglaState(s), "m2", ["names", "bangla"], { list: "mine" });
  assert.ok(M.saveBanglaState(st, s));
  assert.equal(s.m.get("mm_bangla_words.v1"), V1); assert.ok(s.m.has("mm_bangla_words.v2"));
});
check("a saved v2 loads back with its kinds (v2 wins over v1)", () => {
  const s = store({ "mm_bangla_words.v1": V1 });
  M.saveBanglaState(M.setBanglaWordKinds(M.loadBanglaState(s), "m2", ["rituals"], { list: "mine" }), s);
  const back = M.loadBanglaState(s);
  assert.deepEqual(back.mine, ["m1", "m2"]); assert.deepEqual(M.banglaKindsOf(back, "m2", "mine"), ["rituals"]);
});
check("a word can carry several kinds", () => {
  const st = M.setBanglaWordKinds(M.emptyBanglaState(), "w", ["names", "rituals", "bangla"], { list: "mine" });
  assert.deepEqual(M.banglaKindsOf(st, "w", "mine"), ["names", "rituals", "bangla"]);
});
check("kinds are kept in the Owner's order (Names, Rituals, Bangla) whatever order they arrive in", () => {
  const st = M.setBanglaWordKinds(M.emptyBanglaState(), "w", ["bangla", "names"], { list: "mine" });
  assert.deepEqual(M.banglaKindsOf(st, "w", "mine"), ["names", "bangla"]);
});
check("unknown kinds are dropped; a word left with none known is not added", () => {
  const st = M.setBanglaWordKinds(M.emptyBanglaState(), "w", ["nonsense"], { list: "mine" });
  assert.deepEqual(st.mine, []);
});
check("empty removes: an empty kinds array takes the word out of the list", () => {
  let st = M.setBanglaWordKinds(M.emptyBanglaState(), "w", ["names"], { list: "mine" });
  st = M.setBanglaWordKinds(st, "w", [], { list: "mine" });
  assert.deepEqual(st.mine, []); assert.deepEqual(M.banglaKindsOf(st, "w", "mine"), []);
});
check("a reader cannot change the admin list; an admin can", () => {
  const s0 = M.emptyBanglaState();
  assert.deepEqual(M.setBanglaWordKinds(s0, "w", ["names"], { list: "admin", canAdmin: false }).admin, []);
  assert.deepEqual(M.setBanglaWordKinds(s0, "w", ["names"], { list: "admin", canAdmin: true }).admin, ["w"]);
});
check("banglaWordsOfKind lists the viewed list's words of one kind, and nothing while the list is off", () => {
  let st = M.setBanglaWordKinds(M.emptyBanglaState(), "x", ["names"], { list: "mine" });
  st = M.setBanglaWordKinds(st, "y", ["rituals", "bangla"], { list: "mine" });
  st = { ...st, list: "mine" };
  assert.deepEqual(M.banglaWordsOfKind(st, "rituals"), ["y"]); assert.deepEqual(M.banglaWordsOfKind(st, "bangla"), ["y"]); assert.deepEqual(M.banglaWordsOfKind(st).sort(), ["x", "y"]);
  assert.deepEqual(M.banglaWordsOfKind({ ...st, on: false }, "rituals"), []);
});
check("the old setBanglaWord keeps the kinds in step (on = bangla, off removes)", () => {
  let st = M.setBanglaWord(M.emptyBanglaState(), "w", true, { list: "mine" });
  assert.deepEqual(M.banglaKindsOf(st, "w", "mine"), ["bangla"]);
  st = M.setBanglaWord(st, "w", false, { list: "mine" });
  assert.deepEqual(M.banglaKindsOf(st, "w", "mine"), []);
});
check("garbage in storage never throws: a bad v2 falls back to v1, a bad v1 to empty", () => {
  assert.deepEqual(M.loadBanglaState(store({ "mm_bangla_words.v2": "{{", "mm_bangla_words.v1": V1 })).mine, ["m1"]);
  assert.deepEqual(M.loadBanglaState(store({ "mm_bangla_words.v1": "nope" })).mine, []);
});
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
