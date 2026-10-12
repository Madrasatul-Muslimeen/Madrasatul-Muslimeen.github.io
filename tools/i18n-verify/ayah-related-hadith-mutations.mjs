// Keys Round 1 -- mutation proof for ayah-related-hadith-browser.mjs and ayah-hadith-index.mjs.
// Each mutation breaks ONE thing in a copy-on-write of the real file, runs the suite that claims to guard it, and
// requires the suite to FAIL (exit code 1) naming the check; the file is always restored. A mutation that does not
// change the file (its text was not found) is reported UNPROVEN, never silently skipped. Run from the repository root:
//   node tools/i18n-verify/ayah-related-hadith-mutations.mjs [index|browser]
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const BROWSER = "tools/i18n-verify/ayah-related-hadith-browser.mjs";
const DATA = "tools/i18n-verify/ayah-hadith-index.mjs";
const OUT = "tools/hadith-data-pull/output/ayah-hadith/";

const MUTATIONS = [
  // ---- the data check ----
  { name: "D1 a Qur'an-external key (surah 1, āyah 99)", file: `${OUT}1.json`, replace: ["{", '{"99":[{"book":"0256Bukhari.Sahih.JK000110-ara1","n":1,"number":1,"standard":1,"openitiId":"openiti:0256Bukhari.Sahih.JK000110-ara1:1","test":"words","quote":"x"}],'], suite: DATA, expect: /no āyah key outside the Qur'an/ },
  { name: "D2 a number that is not in the concordance (Bukhari 4802 -> 4803 on 36:38)", file: `${OUT}36.json`, replace: ['"number":4802', '"number":4803'], suite: DATA, expect: /resolves through the concordance|36:38 -> Bukhari/ },
  { name: "D3 a Test 2 hit whose words are not in the āyah", file: `${OUT}36.json`, replace: ['"test":"words","quote":"', '"test":"words","quote":"قل هو الله احد ثم '], suite: DATA, expect: /Test 2: all/ },
  { name: "D4 summary.json totals drift", file: `${OUT}summary.json`, replace: ['"ayatAny": ', '"ayatAny": 1'], suite: DATA, expect: /summary.json matches the files: āyāt found/ },
  { name: "D5 a by-book file loses an entry", file: `${OUT}by-book/0279Tirmidhi.Sunan.JK000140-ara1.json`, replace: ["3278", "3279"], suite: DATA, expect: /by-book/ },
  // ---- the browser suite ----
  { name: "B1 the index is fetched at import time (startup)", file: "app/js/ayah-hadith.js", replace: ["const surahCache = new Map();", 'const surahCache = new Map();\nfetch(`${BASE_URL}36.json`).catch(() => {});'], suite: BROWSER, expect: /I9: the index file is not fetched before the card opens/ },
  { name: "B2 the card never asks for the hadith", file: "app/quranrevival.html", replace: ["      ensureAyahSheetHadithLoaded(unitKey, surahNum, ayahNum);\n", ""], suite: BROWSER, expect: /positive control: the surah's index file is fetched/ },
  { name: "B3 no-hit āyah renders blank", file: "app/js/ayah-action-sheet.js", replace: ['${escapeHtml(t("No hadith in our books quotes this āyah word for word."))}', ""], suite: BROWSER, expect: /an āyah with no hit says so in words/ },
  { name: "B4 Both tests are not labelled the plain way", file: "app/js/ayah-action-sheet.js", replace: ['<span class="ayah-related-why">${escapeHtml(t("quotes this āyah"))}</span>', '<span class="ayah-related-why">${escapeHtml(t("test"))}</span>'], suite: BROWSER, expect: /every row says "quotes this āyah"/ },
  { name: "B5 the library's back button does not say where it goes", file: "app/hadith-collections.html", replace: ['params.get("backTo") === "ayah" ? t("Back to the āyah") : t("Back")', 't("Back")'], suite: BROWSER, expect: /← Back to the āyah/ },
  { name: "B6 the card is not remembered before leaving", file: "app/quranrevival.html", replace: ['u.searchParams.set("ayahCard",', 'u.searchParams.set("ayahCardX",'], suite: BROWSER, expect: /Back returns to 36:38 with the Āyah card open/ },
  { name: "B7 the hadith's āyah link carries no way back", file: "app/js/hadith-browser.js", replace: ["&back=1&backTo=hadith", ""], suite: BROWSER, expect: /with ← Back to the hadith/ },
  { name: "B8 'Āyāt this hadith quotes' never appears", file: "app/js/hadith-browser.js", replace: ["if (!hits.length) return;", "return;"], suite: BROWSER, expect: /the hadith lists 36:38/ },
  // (a first B9, "rows shrink to min-height 0", was NOT caught: a row of three text lines is over 40px anyway, so that
  // mutation changed nothing observable. Replaced by the one that really breaks the layout: the Arabic line cut off.)
  { name: "B9 the Arabic line runs off the row (nothing cut / no sideways scroll)", file: "app/quranrevival.html", replace: [".ayah-hadith-line {", ".ayah-hadith-line { white-space: nowrap !important; width: 900px !important;"], suite: BROWSER, expect: /no sideways scroll and nothing cut/ },
];

const only = process.argv[2];
let unproven = 0, failedToCatch = 0, proven = 0;
for (const m of MUTATIONS) {
  if (only === "index" && m.suite !== DATA) continue;
  if (only === "browser" && m.suite !== BROWSER) continue;
  if (only && /^B\d|^D\d/.test(only) && !m.name.startsWith(`${only} `)) continue;
  const original = fs.readFileSync(m.file, "utf8");
  const count = original.split(m.replace[0]).length - 1;
  if (count < 1) { unproven += 1; console.log(`UNPROVEN  ${m.name}: text not found in ${m.file}`); continue; }
  fs.writeFileSync(m.file, original.split(m.replace[0]).join(m.replace[1]));
  let r;
  try { r = spawnSync("node", [m.suite], { encoding: "utf8", timeout: 900000, maxBuffer: 64 * 1024 * 1024 }); }
  finally { fs.writeFileSync(m.file, original); }
  const text = `${r.stdout}\n${r.stderr}`;
  const named = m.expect.test(text.split("\n").filter((l) => /FAIL/.test(l)).join("\n"));
  if (r.status === 1 && named) { proven += 1; console.log(`PROVEN    ${m.name} (replaced ${count}x)`); }
  else { failedToCatch += 1; console.log(`NOT CAUGHT ${m.name}: exit ${r.status}, expected FAIL matching ${m.expect}`); }
}
console.log(`\n==== mutations: ${proven} proven, ${failedToCatch} not caught, ${unproven} unproven ====`);
process.exit(failedToCatch || unproven ? 1 : 0);
