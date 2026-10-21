// PCF MSA J66: Bangla আ written as two pieces, অ (U+0985) + া (U+09BE), is drawn as a broken letter with a dotted
// circle (22:4's word meaning "জ্বলন্ত অাগুনের" on the Word card and the posters). The source had it in 14 Qur'an word
// meanings; they now carry the one letter আ (U+0986), and tools/quran-data-pull/pull.js writes it so on every pull.
// Part 2 (21 Oct 2026): the Hadith data had it in 13 places (three translation books, HadeethEnc, a Dua word list); they
// are mended, each Hadith puller writes the one letter, and DIRS covers the Hadith output too. Pure: no browser. Run from
// the repository root.
// Every mutation (--mutate=NAME) must make the suite exit 1:
//   data     22:4's word meaning gets its two pieces back (in memory)  -> "no Qur'an data file has the two-piece আ"
//   pull     pull.js stops mending the word meanings                    -> "pull.js mends both Bangla fields"
//   blind    the scan reads nothing (a broken directory walk)           -> "the scan read every sūrah file"
//   hdata    a Tirmidhi Bangla text gets its two pieces back (in memory) -> "no ... data file has the two-piece আ"
//   hblind   the scan skips the Hadith output                           -> "the scan read the Hadith Bangla files"
//   hpull    a Hadith puller stops mending (one per puller)             -> "each Hadith puller mends ..."
//   hhash    HadeethEnc mends AFTER hashing, not before                 -> "each Hadith puller mends .."
import fs from "fs";
import path from "path";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !["data", "pull", "blind", "hdata", "hblind", "hpull", "hhash"].includes(MUTATE)) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${n}" was given a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const TWO = "\u0985\u09BE", ONE = "\u0986";
const HDIR = "tools/hadith-data-pull/output";
const DIRS = ["tools/quran-data-pull/output", ...(MUTATE === "hblind" ? [] : [HDIR])];

function walk(dir) {
  if (MUTATE === "blind") dir += "-nowhere";
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".json") ? [path.join(dir, e.name)] : []));
}
const files = DIRS.flatMap(walk);
const read = (f) => {
  const s = fs.readFileSync(f, "utf8");
  if (MUTATE === "hdata" && f.replace(/\\/g, "/").endsWith("translations/tirmidhi/bn/0.json")) return s.replace(ONE, TWO);
  return MUTATE === "data" && f.endsWith("surah_022.json") ? s.replace(`জ্বলন্ত ${ONE}গুনের`, `জ্বলন্ত ${TWO}গুনের`) : s;
};
// positive control: the walk really reached the 114 sūrah files, and 22:4's mended meaning is there to be read
const surahs = files.filter((f) => /surahs[\\/]surah_\d{3}\.json$/.test(f));
check(`the scan read every sūrah file (${surahs.length} of 114) and ${files.length} files in all`, surahs.length === 114 && files.length > 114, String(files.length));
const s22 = surahs.find((f) => f.endsWith("surah_022.json"));
const w = s22 ? JSON.parse(read(s22)).ayahs.find((a) => a.ayah === 4)?.words.find((x) => x.position === 11)?.translation?.bn : null;
check(`22:4 word 11's Bangla meaning is "জ্বলন্ত আগুনের" with the one letter আ: "${w}"`, w === `জ্বলন্ত ${ONE}গুনের`, JSON.stringify(w));
const bad = files.filter((f) => read(f).includes(TWO));
// positive control for the Hadith half: the walk reached the Bangla files the 13 places were in
const hbn = files.filter((f) => f.replace(/\\/g, "/").startsWith(HDIR) && /\/bn\/|dua\/words-/.test(f.replace(/\\/g, "/")));
const want = ["translations/muslim/bn/8.json", "translations/nasai/bn/6.json", "translations/tirmidhi/bn/0.json", "hadeethenc/bn/cat-6.json", "dua/words-22.json"];
check(`the scan read the Hadith Bangla files (${hbn.length}), the 13 places' files among them`, want.every((w) => hbn.some((f) => f.replace(/\\/g, "/").endsWith(w))), String(hbn.length));
check("no Qur'an or Hadith data file has the two-piece আ (অ + া)", bad.length === 0, bad.join(", "));

// each Hadith puller writes the one letter (read from its own source; one line each)
const src = (f) => fs.readFileSync(f, "utf8");
let tr = src("tools/hadith-data-pull/hadith-translations-pull.mjs"), he = src("tools/hadith-data-pull/hadeethenc-pull.mjs"), dw = src("tools/hadith-data-pull/dua-word-links.mjs");
if (MUTATE === "hpull") { tr = tr.replace('.replace(/\\u0985\\u09BE/g, "\\u0986").trim();', ".trim();"); he = he.replace('lang === "bn" ? bnDeep(detail) : detail', "detail"); dw = dw.replace('.replace(/\\u0985\\u09BE/g, "\\u0986").trim();', ".trim();"); }
if (MUTATE === "hhash") he = he.replace("{ ...stored, contentHash: contentHash(stored) }", "{ ...stored, contentHash: contentHash(detail) }");
check("hadith-translations-pull.mjs mends each text before it is chunked", /const text = String\(h\.text \?\? ""\)[^\n]*\.replace\(\/\\u0985\\u09BE\/g, "\\u0986"\)/.test(tr));
check("hadeethenc-pull.mjs mends every Bangla string of a record, and hashes the record as stored", he.includes('const stored = lang === "bn" ? bnDeep(detail) : detail;') && he.includes("{ ...stored, contentHash: contentHash(stored) }"));
check("dua-word-links.mjs mends the word meaning it copies", /const clean = [^\n]*\.replace\(\/\\u0985\\u09BE\/g, "\\u0986"\)/.test(dw));
const { bnDeep } = await import("../hadith-data-pull/hadeethenc-pull.mjs");
const deep = bnDeep({ a: `${TWO}গুন`, b: [`x${TWO}`, 3], c: { d: `${TWO}` }, n: null });
check("hadeethenc-pull's bnDeep mends strings at every depth and leaves the rest alone", deep.a === `${ONE}গুন` && deep.b[0] === `x${ONE}` && deep.b[1] === 3 && deep.c.d === ONE && deep.n === null);

let pull = fs.readFileSync("tools/quran-data-pull/pull.js", "utf8");
if (MUTATE === "pull") pull = pull.replace("? bnText(bnWord.translation.text.replace(/<[^>]*>/g, \"\")) :", "? bnWord.translation.text.replace(/<[^>]*>/g, \"\") :");
const mender = /const bnText = \(s\) => String\(s \?\? ""\)\.replace\(\/\\u0985\\u09BE\/g, "\\u0986"\);/.test(pull);
check("pull.js mends both Bangla fields (the word meaning and the āyah's translation) with bnText", mender && pull.includes("? bnText(bnWord.translation.text.replace(") && pull.includes("bn: bnText(bnByAyah[ayahNum])"));
// and bnText itself does what it says (evaluated from pull.js's own line, not retyped)
const line = pull.match(/const bnText = .*;/)?.[0];
const bnText = line ? new Function(`${line} return bnText;`)() : () => "";
check("bnText turns অ + া into আ and leaves everything else alone", bnText(`জ্বলন্ত ${TWO}গুনের`) === `জ্বলন্ত ${ONE}গুনের` && bnText("অবশ্যই") === "অবশ্যই" && bnText(null) === "");

console.log(`\n==== Bangla two-piece আ (J66)${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
