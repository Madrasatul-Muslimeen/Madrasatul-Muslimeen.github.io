// Step 3. Convert the Bangla runs from Bijoy (SutonnyMJ) bytes to Unicode.
//
//   node convert.mjs WORK CONVERTER_DIR      ->  WORK/unicode.json
//
// CONVERTER_DIR is the unpacked npm package bijoy-unicode-converter@0.1.2
// (MIT, Naim Howlader): `npm pack bijoy-unicode-converter@0.1.2 && tar xzf
// bijoy-unicode-converter-0.1.2.tgz` gives ./package. It was chosen over
// bijoy2unicode@1.0.2 because it maps this font's "ল্ল" (ø) and moves the ref
// correctly; the other wrote "আলস্নাহ" for আল্লাহ 180 times in this book.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const [work, dir] = process.argv.slice(2);
const { ConvertToUnicode } = await import(pathToFileURL(path.resolve(dir, "src/index.js")).href);
// This book's SutonnyMJ carries some conjunct and vowel glyphs the converter
// does not know, and they come through as Latin-1 bytes. Each mapping below was
// read off every place the byte occurs in the book (e.g. "যতœবান" is যত্নবান,
// "আহŸান" is আহ্বান, "ভ‚মি" is ভূমি). A phala (্ব ্ল ্ন) that Bijoy draws AFTER a
// pre-kar (ে ি) belongs before it in Unicode: "কেøশ" is ক্লেশ.
const WHOLE = [
  ["তীক্ষè", "তীক্ষ্ণ"], ["সূক্ষè", "সূক্ষ্ম"], ["তী²", "তীক্ষ্ণ"], ["সূ²", "সূক্ষ্ম"], ["সু²", "সূক্ষ্ম"],
  ["বি¯ৃÍত", "বিস্তৃত"], ["সর্বেŸাচ্চ", "সর্বোচ্চ"], ["›িদ্ব", "ন্দ্বি"], ["দ্রƒত", "দ্রুত"], ["লম্ব^া", "লম্বা"],
  ["প্রজ্ব¡", "প্রজ্ব"], ["রজ্জ্ব¡", "রজ্জ্ব"], ["সÍ", "স্ত"], ["তÍ", "ত"], ["ওÍ", "ও"],
];
const PHALA = { "¦": "্ব", "Ÿ": "্ব", "¡": "্ব", "^": "্ব", "ø": "্ল", "œ": "্ন" };
function repairGlyphs(t) {
  for (const [a, b] of WHOLE) t = t.split(a).join(b);
  t = t.replace(/¯/g, "স");
  t = t.replace(/্[¦Ÿ¡]/g, "্ব");
  t = t.replace(/([\u0995-\u09B9\u09DC-\u09DF])([েি])([¦Ÿ¡^øœ])/g, (_, c, k, g) => c + PHALA[g] + k);
  t = t.replace(/[¦Ÿ¡^øœ]/g, (g) => PHALA[g]);
  t = t.replace(/¤(?=্)/g, "ম").replace(/¤/g, "ম্").replace(/›/g, "ন্");
  t = t.replace(/[æ]/g, "ু").replace(/[ƒ‚]/g, "ূ").replace(/ú/g, "স্প").replace(/Ð/g, "ণ্ড").replace(/Ñ/g, "—");
  return t;
}
const A = JSON.parse(fs.readFileSync(`${work}/assembled.json`, "utf8"));
for (const r of A) for (const p of r.parts) if (p[0] === "bj") p[1] = repairGlyphs(ConvertToUnicode("bijoy", p[1])).normalize("NFC")
  // a vowel sign drawn twice in the PDF ("বৃৃদ্ধি") is one sign
  .replace(/([\u09BE-\u09CC\u09D7])\1+/g, "$1");
fs.writeFileSync(`${work}/unicode.json`, JSON.stringify(A));
console.log(A.length, "lines converted");
