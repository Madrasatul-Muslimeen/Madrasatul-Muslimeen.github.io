// Issue #294 -- with Tajweed colours ON, the flowing Arabic is split into
// tappable words WITHOUT changing the colour of a single letter.
//
// Pure, over the WHOLE packaged corpus. For every āyah it parses two renderings
// back into letters, each with the stack of classes around it:
//   (1) today's unsplit block, tajweedRawToSafeHtml(tajweedText);
//   (2) the new per-word output of splitTajweedWords(), words joined.
// Spaces aside, the two sequences must be identical: same letters, same
// order, same classes, same nesting. A span that crossed a word break must be
// closed and REOPENED -- drop the reopen and (2) loses colour on the letters
// after the break, which this check catches (mutation below).
//
// Run from the repository root.
import fs from "node:fs";
import path from "node:path";
import { tajweedRawToSafeHtml, splitTajweedWords } from "../../app/js/ayah-renderer.js";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

/** Rendered HTML -> ["letter|class,class", ...], entities decoded, spaces dropped. */
function renderedLetters(html) {
  const out = [];
  const stack = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] === "<") {
      const close = html.indexOf(">", i);
      const tag = html.slice(i, close + 1);
      const m = /^<span class="([^"]+)">$/.exec(tag);
      if (m) stack.push(m[1]);
      else if (tag === "</span>") stack.pop();
      else throw new Error(`unexpected tag ${tag}`);
      i = close + 1;
      continue;
    }
    let ch = String.fromCodePoint(html.codePointAt(i));
    let len = ch.length;
    if (html.startsWith("&amp;", i)) { ch = "&"; len = 5; }
    else if (html.startsWith("&lt;", i)) { ch = "<"; len = 4; }
    else if (html.startsWith("&gt;", i)) { ch = ">"; len = 4; }
    if (ch !== " ") out.push(`${ch}|${stack.join(",")}`);
    i += len;
  }
  return out;
}

const dir = "tools/quran-data-pull/output/surahs";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
check("the packaged corpus is all there (114 surah files)", files.length === 114, String(files.length));

let total = 0, split = 0, identical = 0, crossed = 0;
const fellBack = [], differs = [];
for (const f of files) {
  const surah = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  for (const a of surah.ayahs ?? surah) {
    total++;
    const result = splitTajweedWords(a.tajweedText, a.words?.length ?? -1);
    if (!result) { fellBack.push(`${f.replace(/\D/g, "").replace(/^0+/, "")}:${a.ayah}`); continue; }
    split++;
    if (result.words.length !== a.words.length) differs.push(`${f}:${a.ayah} count`);
    const before = renderedLetters(tajweedRawToSafeHtml(a.tajweedText)).join("\n");
    const after = renderedLetters(result.words.join(" ") + " " + result.tail).join("\n");
    if (before === after) identical++; else differs.push(`${f}:${a.ayah}`);
    // A colour span that crosses a word break: the case the old code refused.
    if (result.words.some((w, i) => i > 0 && w.startsWith("<span") && /<\/span>$/.test(result.words[i - 1]))) crossed++;
  }
}
console.log(`  (corpus: ${total} āyāt, ${split} split, ${fellBack.length} fall back: ${fellBack.join(", ")})`);
check("every āyah that splits keeps every letter's colour, class for class and nesting for nesting",
  differs.length === 0 && identical === split, differs.slice(0, 5).join(", "));
check("fall-backs are under 1% of the corpus (they keep today's unsplit block)", fellBack.length / total < 0.01, `${fellBack.length}/${total}`);
check("the split really exercises colour runs that cross word breaks (positive control)", crossed > 100, String(crossed));

// 2:2 -- the example the old comment named: idgham_wo_ghunnah spans "دًى ل".
{
  const s2 = JSON.parse(fs.readFileSync(path.join(dir, "surah_002.json"), "utf8"));
  const a = (s2.ayahs ?? s2).find((x) => x.ayah === 2);
  const r = splitTajweedWords(a.tajweedText, a.words.length);
  check("2:2 splits into its 7 words", r?.words.length === 7, String(r?.words.length));
  check("2:2's idgham run is closed at the end of word 6 and reopened at the start of word 7",
    /<span class="tajweed-idgham_wo_ghunnah">[^<]*<\/span>$/.test(r.words[5]) && r.words[6].startsWith('<span class="tajweed-idgham_wo_ghunnah">'),
    `${r.words[5]} | ${r.words[6]}`);
  check("2:2's āyah-end number stays out of the words, in its own end span", /tajweed-end/.test(r.tail) && !r.words.some((w) => w.includes("tajweed-end")), r.tail);
}

// Mutation: a split that does NOT reopen the class after a word break must be
// caught by the letter comparison above -- otherwise that check proves nothing.
{
  const s2 = JSON.parse(fs.readFileSync(path.join(dir, "surah_002.json"), "utf8"));
  const a = (s2.ayahs ?? s2).find((x) => x.ayah === 2);
  const r = splitTajweedWords(a.tajweedText, a.words.length);
  const broken = r.words.map((w, i) => (i === 6 ? w.replace(/^<span class="tajweed-idgham_wo_ghunnah">([^<]*)<\/span>/, "$1") : w));
  const before = renderedLetters(tajweedRawToSafeHtml(a.tajweedText)).join("\n");
  const after = renderedLetters(broken.join(" ") + " " + r.tail).join("\n");
  check("mutation: dropping the reopened span (colour lost after the break) is detected", before !== after);
}

check("unrecognised markup falls back rather than guessing", splitTajweedWords("<b>x</b>", 1) === null);
check("unbalanced markup falls back", splitTajweedWords("<tajweed class=ghunnah>نّ", 1) === null);
check("a word-count mismatch falls back", splitTajweedWords("a b c", 2) === null);

console.log(`\n==== Tajweed word split (issue #294): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
