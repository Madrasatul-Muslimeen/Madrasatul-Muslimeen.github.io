// PCF J26 / issue #814 -- the permanent keys of the "Before Al-Fātiḥah" items, bound back to their source of truth.
// Run from the repository root. The literals below are written by hand from the Owner's answer; the module must agree.
import { buildUnitKey, UNIT_TYPES, parseUnitKey, unitKeyLabel } from "../../app/js/unit-keys.js";
import fs from "fs";
// records.js imports Firebase over https, which plain Node cannot load: lift chunkKeyFor out of its source and run it here.
const recSrc = fs.readFileSync("app/js/records.js", "utf8");
const chunkSrc = recSrc.slice(recSrc.indexOf("const SURAH_CHUNKED_TYPES"), recSrc.indexOf("function recordsDocId")).replace("export function", "function");
const chunkKeyFor = new Function("parseUnitKey", `${chunkSrc}; return chunkKeyFor;`)(parseUnitKey);

let pass = 0, fail = 0;
function check(name, fn) {
  let ok = false, detail = "";
  try { const r = fn(); if (r && typeof r.then === "function") throw new Error("async body: a promise counts as a pass"); ok = r !== false; } catch (e) { detail = e.message; }
  ok ? (pass++, console.log(`  PASS  ${name}`)) : (fail++, console.log(`  FAIL  ${name} ${detail}`));
}
const eq = (a, b) => { if (a !== b) throw new Error(`${JSON.stringify(a)} !== ${JSON.stringify(b)}`); };

check("buildUnitKey.opening('taawwudh') is exactly opening:taawwudh", () => eq(buildUnitKey.opening("taawwudh"), "opening:taawwudh"));
check("`opening` is a unit type and parses back", () => { if (!UNIT_TYPES.includes("opening")) throw new Error("missing"); eq(parseUnitKey("opening:taawwudh").unitType, "opening"); });
check("the Bismillah's key is the existing buildUnitKey.ayah(1, 1) = ayah:1:1", () => eq(buildUnitKey.ayah(1, 1), "ayah:1:1"));
check("opening:taawwudh is stored with Al-Fātiḥah's chunk surah_1", () => eq(chunkKeyFor("opening:taawwudh", "quran"), "surah_1"));
check("ayah:1:1 stays in surah_1 too", () => eq(chunkKeyFor("ayah:1:1", "quran"), "surah_1"));
check("the page names the Aʿūdhu key through buildUnitKey.opening, never a retyped string", () => {
  const html = fs.readFileSync("app/quranrevival.html", "utf8");
  if (!html.includes('buildUnitKey.opening("taawwudh")')) throw new Error("page does not build the key with buildUnitKey");
});
check("Records/Monitor print a readable label (not the raw key)", () => { const l = unitKeyLabel("opening:taawwudh"); if (/taawwudh/.test(l) || !/Aʿūdhu/.test(l)) throw new Error(l); });
check("Bangla labels exist for the band", () => {
  const bn = fs.readFileSync("app/js/i18n/bn.js", "utf8");
  for (const k of ['"Before Al-Fātiḥah"', '"Aʿūdhu billāh"', '"I seek refuge in Allah from Shayṭān, the accursed."']) if (!bn.includes(`  ${k}:`)) throw new Error(`missing ${k}`);
});
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
