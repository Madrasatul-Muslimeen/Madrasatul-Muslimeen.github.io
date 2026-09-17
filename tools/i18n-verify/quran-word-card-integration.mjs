import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderWordByWordPanel } from "../../app/js/ayah-renderer.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const page = readFileSync(join(root, "app/quranrevival.html"), "utf8");
let passed = 0;
// A SYNCHRONOUS RUNNER COUNTS AN `async` BODY AS A PASS: the assertion
// throws inside an uncaught promise, and the case prints PASS. It has
// happened for real in this repository. Refuse a promise loudly.
function check(name, fn) {
  const r = fn();
  if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
  passed++; console.log(`  PASS  ${name}`);
}

const ayah = { ayah: 2, words: [{ position: 3, arabic: "رَبِّ", transliteration: "rabbi", translation: { en: "Rabb", bn: "রব" } }] };
check("interactive WbW emits a real button and permanent identity", () => {
  const html = renderWordByWordPanel(ayah, { interactive: true, surahNumber: 1 });
  assert.match(html, /<button type="button" class="wbw-word wbw-word-clickable"/);
  assert.match(html, /data-word-occurrence="quran-word-occurrence:v1:1:2:3"/);
  assert.match(html, /aria-label="رَبِّ — Rabb"/);
  assert.doesNotMatch(html, /<button[^>]*>[\s\S]*?<div/);
});
check("shared noninteractive WbW remains a div", () => {
  const html = renderWordByWordPanel(ayah);
  assert.match(html, /<div class="wbw-word"/); assert.doesNotMatch(html, /data-word-occurrence/);
});
check("Study surface has one persistent card mount", () => assert.equal((page.match(/id="quranWordCardMount"/g) || []).length, 1));
// UPDATED v08.20: the mount now carries an explanatory comment directly
// above it (why its resize handles sit outside the replaced content), so the
// two tags are no longer literally adjacent. What this check exists to prove
// is unchanged and still proven: the mount closes #studyScreen AND its
// scrolling wrapper before it opens, so it is never inside the scroll body.
check("card mount is outside the scrolling Study body", () => assert.match(page, /<\/div><!\-\- \/#studyScreen \-\->\s*<\/div>\s*(?:<!\-\-[\s\S]*?\-\->\s*)*<div id="quranWordCardMount"/));
check("keyboard focus and async response lifecycle are guarded", () => { assert.match(page, /focusSelector/); assert.match(page, /quranWordCardRequest\+\+/); assert.match(page, /event\.key === "Escape"/); });
check("single and flow render paths enable Word Card identity", () => assert.equal((page.match(/wordCardInteractive: true/g) || []).length, 2));
check("controller delegates occurrence, tab, navigation and close actions", () => {
  for (const marker of ["[data-word-occurrence]", "[data-word-card-level]", "[data-word-card-move]", "[data-word-card-close]"]) assert.ok(page.includes(marker));
});
check("persistent card Arabic is double the card body size", () => { assert.match(page, /\.word-card-arabic[^}]*font-size: 2rem/); assert.match(page, /\.quran-word-card dd[^}]*font-size: 0\.9rem/); });
check("card integration introduces no Firebase write path", () => {
  const module = readFileSync(join(root, "app/js/quran-word-card.js"), "utf8"); assert.doesNotMatch(module, /firebase|setDoc|updateDoc|addDoc/);
});
check("occurrence indexes hydrate only from the explicit card controller", () => { assert.match(page, /async function hydrateWordCardOccurrences/); assert.match(page, /occurrenceRefsFor\("root"/); assert.match(page, /occurrenceRefsFor\("lemma"/); assert.doesNotMatch(page.slice(0, page.indexOf("<script type=\"module\">")), /roots-index|lemmas-index/); });
console.log(`\n==== Quran Word Card Study integration: ${passed} passed, 0 failed ====`);
