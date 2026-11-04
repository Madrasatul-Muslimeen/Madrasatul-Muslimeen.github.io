// J108 (v13.01) -- an Āyah / Hadith block inside a Note: the strict schema (app/js/note-ref-block.js), in plain Node.
// note-sanitize.js rebuilds every `div[data-mmsa-ref]` from cleanRefState() alone, so this schema IS the security
// boundary for a block: whatever it lets through is all that can ever come out of a stored Note.
// Run from the repository root. Mutation-proven: `--mutate=NAME` rewrites the module in a temporary copy and must fail.
//   idshape  any id is accepted                      -> "an id outside the two shapes is refused"
//   kind     any kind is accepted                    -> "a kind other than ayah / hadith is refused"
//   plain    markup characters are kept in the text  -> "the text is plain"
//   cap      the length cap is gone                  -> "every text is length-capped"
//   flags    a flag keeps whatever value it came in  -> "the flags are booleans"
//   escape   the static html does not escape         -> "the static html escapes the text"
//   (serializeRefState()'s own "<"/">" escaping is NOT mutation-provable here, and says so: cleanRefState() already turns
//   every "<" and ">" into a space, so the escape is a second guard behind `plain` -- removing it changes no output.)
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  idshape: ["  if (!REF_ID_SHAPES[kind].test(id)) return null;\n", ""],
  kind: ["  if (!REF_KINDS.includes(kind)) return null;\n  const id", "  const id"],
  plain: ['.replace(/[<>\\u0000-\\u001f\\u007f]/g, " ")', ""],
  cap: ["    .slice(0, max);", "    ;"],
  flags: ["  const flags = { on: f.on !== false };\n  for (const k of REF_LANGS) flags[k] = f[k] !== false;", "  const flags = { on: f.on ?? true };\n  for (const k of REF_LANGS) flags[k] = f[k] ?? true;"],
  escape: ["const esc = (s) => String(s ?? \"\").replace(/&/g, \"&amp;\").replace(/</g, \"&lt;\").replace(/>/g, \"&gt;\").replace(/\"/g, \"&quot;\");", "const esc = (s) => String(s ?? \"\");"],
};
let src = fs.readFileSync("app/js/note-ref-block.js", "utf8");
let modPath = path.resolve("app/js/note-ref-block.js");
if (MUTATE) {
  if (!MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
  const [a, b] = MUT[MUTATE];
  if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
  src = src.split(a).join(b);
  modPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "refblock-")), "note-ref-block.js");
  fs.writeFileSync(modPath, src);
}
const M = await import(pathToFileURL(modPath).href);
const { cleanRefState, serializeRefState, refStaticHtml, refBlockHtml, toggleRefFlag, REF_TEXT_MAX, REF_LABEL_MAX } = M;

const good = { kind: "ayah", id: "ayah:15:32", label: "Quran 15:32 · Al-Hijr", text: { ar: "قَالَ يَٰٓإِبْلِيسُ", en: "[Allah] said", bn: "আল্লাহ বললেনঃ" } };

check("a real āyah and a real hadith are kept, every language on, open", () => {
  const a = cleanRefState(good);
  assert.deepEqual(a, { ...good, flags: { on: true, ar: true, en: true, bn: true } });
  const h = cleanRefState({ kind: "hadith", id: "hadith:hadeethenc:3062", label: "Sahih al-Bukhari 1", text: { ar: "إنما الأعمال بالنيات", en: "Actions are by intentions" } });
  assert.ok(h && h.text.bn === "" && h.flags.bn === true);
  assert.deepEqual(cleanRefState(JSON.stringify(good)), a, "the JSON string form is read the same");
});
check("an id outside the two shapes is refused", () => {
  for (const id of ["topic-salah", "ayah:1", "ayah:1:1:1", "ayah:1:1 ", "surah:2", "hadith:x:y", "hadith::3", "javascript:alert(1)", "ayah:1:1<b>", ""]) assert.equal(cleanRefState({ ...good, id }), null, id);
  assert.equal(cleanRefState({ ...good, kind: "hadith", id: "ayah:15:32" }), null, "an āyah id under the hadith kind");
});
check("a kind other than ayah / hadith is refused", () => {
  for (const kind of ["sheet", "dua", "", null, "Ayah"]) assert.equal(cleanRefState({ ...good, kind }), null, String(kind));
});
check("no label, no text at all, or junk is refused", () => {
  assert.equal(cleanRefState({ ...good, label: "  " }), null);
  assert.equal(cleanRefState({ ...good, text: {} }), null);
  for (const raw of ["not json", "[]", "null", "3", [], null, undefined]) assert.equal(cleanRefState(raw), null, String(raw));
});
check("the text is plain: markup and control characters become spaces, a script scheme goes", () => {
  const s = cleanRefState({ ...good, label: "<img src=x onerror=alert(1)>One", text: { en: "In <b>the</b> name\u0000 javascript:alert(1)", ar: "", bn: "" } });
  assert.ok(!/[<>\u0000]/.test(s.label + s.text.en), JSON.stringify(s));
  assert.ok(!/javascript\s*:/i.test(s.text.en), s.text.en);
});
check("every text is length-capped", () => {
  const s = cleanRefState({ ...good, label: "L".repeat(5000), text: { en: "x".repeat(20000) } });
  assert.equal(s.label.length, REF_LABEL_MAX);
  assert.equal(s.text.en.length, REF_TEXT_MAX);
});
check("the flags are booleans: only an explicit false hides", () => {
  const s = cleanRefState({ ...good, flags: { on: "no", ar: false, en: 0, bn: "<script>" } });
  assert.deepEqual(s.flags, { on: true, ar: false, en: true, bn: true });
  assert.ok(Object.values(s.flags).every((v) => typeof v === "boolean"));
});
check("unknown fields are dropped", () => {
  const s = cleanRefState({ ...good, html: "<script>", onclick: "x", text: { ...good.text, fr: "x" } });
  assert.deepEqual(Object.keys(s).sort(), ["flags", "id", "kind", "label", "text"]);
  assert.deepEqual(Object.keys(s.text).sort(), ["ar", "bn", "en"]);
});
check("the attribute value carries no < or >, and reads back to the same state", () => {
  const s = cleanRefState({ ...good, text: { en: "a > b & c", ar: "", bn: "" } });
  const v = serializeRefState(s);
  assert.ok(!/[<>]/.test(v), v);
  assert.deepEqual(cleanRefState(v), s);
});
check("the static html escapes the text and shows only what the flags say", () => {
  const s = cleanRefState({ ...good, label: 'A "quoted" & label', text: { en: "x & y", ar: "قال", bn: "বাং" } });
  const html = refStaticHtml(s);
  assert.ok(html.includes("A &quot;quoted&quot; &amp; label") && html.includes("x &amp; y"), html);
  const off = refStaticHtml(toggleRefFlag(s, "on"));
  assert.ok(!/mm-ref-ar|mm-ref-tr/.test(off) && /▸/.test(off), off);
  const noEn = refStaticHtml(toggleRefFlag(s, "en"));
  assert.ok(!/lang="en"/.test(noEn) && /lang="bn"/.test(noEn) && /mm-ref-ar/.test(noEn), noEn);
});
check("toggling a language on opens a closed block; an unknown flag changes nothing", () => {
  const closed = toggleRefFlag(toggleRefFlag(good, "en"), "on");
  assert.equal(closed.flags.on, false);
  const reopened = toggleRefFlag(closed, "en");
  assert.equal(reopened.flags.on, true); assert.equal(reopened.flags.en, true);
  assert.deepEqual(toggleRefFlag(good, "onclick"), cleanRefState(good));
});
check("the whole block is one div with exactly class, contenteditable=false and the state", () => {
  const html = refBlockHtml(good);
  assert.match(html, /^<div class="mm-ref" contenteditable="false" data-mmsa-ref="[^"<>]*">/);
  assert.equal(refBlockHtml({ ...good, id: "x" }), "");
});

console.log(`\nnote-ref-block: ${passed} passed, ${failed} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(failed ? 1 : 0);
