// PCF MSA J66: Bangla আ written as two pieces, অ (U+0985) + া (U+09BE), is drawn as a broken letter with a dotted
// circle (22:4's word meaning "জ্বলন্ত অাগুনের" on the Word card and the posters). The source had it in 14 Qur'an word
// meanings; they now carry the one letter আ (U+0986), and tools/quran-data-pull/pull.js writes it so on every pull.
// Part 2 (the Hadith data, 13 places) will widen DIRS. Pure: no browser. Run from the repository root.
// Every mutation (--mutate=NAME) must make the suite exit 1:
//   data     22:4's word meaning gets its two pieces back (in memory)  -> "no Qur'an data file has the two-piece আ"
//   pull     pull.js stops mending the word meanings                    -> "pull.js mends both Bangla fields"
//   blind    the scan reads nothing (a broken directory walk)           -> "the scan read every sūrah file"
import fs from "fs";
import path from "path";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !["data", "pull", "blind"].includes(MUTATE)) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${n}" was given a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const TWO = "\u0985\u09BE", ONE = "\u0986";
const DIRS = ["tools/quran-data-pull/output"];

function walk(dir) {
  if (MUTATE === "blind") dir += "-nowhere";
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".json") ? [path.join(dir, e.name)] : []));
}
const files = DIRS.flatMap(walk);
const read = (f) => {
  const s = fs.readFileSync(f, "utf8");
  return MUTATE === "data" && f.endsWith("surah_022.json") ? s.replace(`জ্বলন্ত ${ONE}গুনের`, `জ্বলন্ত ${TWO}গুনের`) : s;
};
// positive control: the walk really reached the 114 sūrah files, and 22:4's mended meaning is there to be read
const surahs = files.filter((f) => /surahs[\\/]surah_\d{3}\.json$/.test(f));
check(`the scan read every sūrah file (${surahs.length} of 114) and ${files.length} files in all`, surahs.length === 114 && files.length > 114, String(files.length));
const s22 = surahs.find((f) => f.endsWith("surah_022.json"));
const w = s22 ? JSON.parse(read(s22)).ayahs.find((a) => a.ayah === 4)?.words.find((x) => x.position === 11)?.translation?.bn : null;
check(`22:4 word 11's Bangla meaning is "জ্বলন্ত আগুনের" with the one letter আ: "${w}"`, w === `জ্বলন্ত ${ONE}গুনের`, JSON.stringify(w));
const bad = files.filter((f) => read(f).includes(TWO));
check("no Qur'an data file has the two-piece আ (অ + া)", bad.length === 0, bad.join(", "));

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
