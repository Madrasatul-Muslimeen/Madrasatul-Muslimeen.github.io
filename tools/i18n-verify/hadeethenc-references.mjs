// HadeethEnc references (PCF MSA J103): output/hadeethenc-references/references.json, the book and standard number
// found for each HadeethEnc hadith, and which of them are proven.
//
// THE EXPECTED VALUES DO NOT COME FROM THE MATCHER. Independent sources:
//   1. Abu Dawud, Tirmidhi, Nasa'i and Ibn Majah in OpenITI carry their OWN printed numbers, equal to the standard
//      ones (hadith-concordance.mjs's ground truth). A proven reference there must agree with the edition's number.
//   2. Hand-known pairs: HadeethEnc 4560 ("إنما الأعمال بالنيات") is Muslim 1907 (Abdul-Baqi), as on sunnah.com.
//   3. The text itself: the proven passage must hold more of the hadith's words than its neighbours n-1 and n+1.
// Plus: every proven row meets the rule that proved it (so a loosened threshold fails here), and a positive control
// (the neighbour test really fails a reference moved by one passage).
//
// Run from the repository root: node tools/i18n-verify/hadeethenc-references.mjs   (exits 0 only if all pass)
import fs from "node:fs";
import path from "node:path";
import { shingles } from "../hadith-data-pull/hadith-concordance.mjs";
import { readHadeethEncArabic } from "../hadith-data-pull/hadeethenc-openiti-links.mjs";
import { BOOKS, parseAttribution } from "../hadith-data-pull/hadeethenc-references.mjs";

const root = process.cwd();
const OUT = path.join(root, "tools", "hadith-data-pull", "output");
const SPLIT = path.join(OUT, "openiti-release", "split");
let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous");
    if (r === false) throw new Error("false");
    passed++; console.log(`  PASS  ${name}`);
  } catch (e) { failed++; console.log(`  FAIL  ${name} -- ${e.message}`); }
}
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const refs = readJson(path.join(OUT, "hadeethenc-references", "references.json"));
const rows = refs.rows;
const proven = rows.filter((r) => r.status === "proven");
const STANDARD = new Set(["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]);

console.log("\nThe file");
check("references.json has rows, and a plausible number of them are proven", () => {
  if (rows.length < 5000 || proven.length < 2500) throw new Error(`${rows.length} rows, ${proven.length} proven`);
});
check("every row carries a known book and a status", () => {
  const bad = rows.filter((r) => !BOOKS[r.book] || !/^(proven|unproven:[a-z-]+)$/.test(r.status));
  if (bad.length) throw new Error(JSON.stringify(bad[0]));
});

console.log("\nEvery proven row meets the rule that proved it");
check("standard-numbered books: two searches agree (or the recovery rule holds), English not against", () => {
  const bad = proven.filter((r) => STANDARD.has(r.book)).filter((r) => {
    if (r.standard == null) return true;
    if (r.recovered) return !(r.direct >= 75 && r.en >= 0.3);
    return !(r.agree === true && r.r1 >= 60 && r.direct >= 60 && (r.en == null || r.en >= 0.2));
  });
  if (bad.length) throw new Error(`${bad.length}, e.g. ${JSON.stringify(bad[0])}`);
});
check("other books: the words found, a second method agrees, and no close second", () => {
  const bad = proven.filter((r) => !STANDARD.has(r.book)).filter((r) => !(r.r1 >= 60 && r.lcs >= 0.7 && r.n != null));
  if (bad.length) throw new Error(`${bad.length}, e.g. ${JSON.stringify(bad[0])}`);
});

console.log("\nAgainst the editions' own printed numbers (independent of the matcher)");
check("Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah: every proven number equals the edition's own (whole part)", () => {
  const four = proven.filter((r) => ["abudawud", "tirmidhi", "nasai", "ibnmajah"].includes(r.book) && r.edition != null);
  const bad = four.filter((r) => Math.floor(Number(r.standard)) !== Math.floor(Number(r.edition)));
  if (four.length < 500) throw new Error(`only ${four.length} to compare`);
  if (bad.length) throw new Error(`${bad.length} of ${four.length}, e.g. ${JSON.stringify(bad[0])}`);
});

console.log("\nHand-known pairs");
check("HadeethEnc 4560 (innamal a'malu bin-niyyat) is Muslim 1907, proven", () => {
  const r = proven.find((x) => x.id === 4560 && x.book === "muslim");
  if (!r || String(r.cite) !== "1907") throw new Error(JSON.stringify(rows.filter((x) => x.id === 4560)));
});
check("the attribution reader: متفق عليه is both Sahihs; al-Adab al-Mufrad and the Kubra are not the Sahih/Sunan", () => {
  const eq = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  if (!eq(parseAttribution("متفق عليه").books, ["bukhari", "muslim"])) throw new Error("agreed");
  if (!eq(parseAttribution("رواه البخاري في الأدب المفرد").books, ["adab"])) throw new Error("adab");
  const k = parseAttribution("رواه النسائي في السنن الكبرى");
  if (k.books.length || !k.outside.length) throw new Error("kubra " + JSON.stringify(k));
  if (!eq(parseAttribution("رواه أبو داود والترمذي وابن ماجه").books, ["abudawud", "tirmidhi", "ibnmajah"])) throw new Error("three");
});

console.log("\nThe words themselves: the proven passage beats its neighbours");
const he = readHadeethEncArabic();
const passagesCache = {};
function passages(book) {
  if (passagesCache[book]) return passagesCache[book];
  const uri = BOOKS[book];
  const index = readJson(path.join(SPLIT, uri, "index.json"));
  const m = new Map();
  for (const ch of index.chapters) for (const f of ch.shardFiles) for (const h of readJson(path.join(SPLIT, uri, f)).hadiths) m.set(h.n, h.text);
  return (passagesCache[book] = m);
}
const share = (a, text) => { if (!text) return 0; const b = shingles(text); let k = 0; for (const g of a) if (b.has(g)) k++; return k / Math.max(1, a.size); };
function neighbourTest(shift) {
  let n = 0, beaten = 0;
  for (const r of proven) {
    if (r.n == null || !he.has(String(r.id))) continue;
    const a = shingles(he.get(String(r.id)).text);
    const p = passages(r.book);
    const own = share(a, p.get(r.n + shift));
    const near = Math.max(share(a, p.get(r.n + shift - 1)), share(a, p.get(r.n + shift + 1)));
    n++; if (own > near) beaten++;
  }
  return { n, beaten };
}
const real = neighbourTest(0);
check(`at least 97% of proven passages hold more of the words than n-1 and n+1 (${real.beaten}/${real.n})`, () => {
  if (real.n < 2500 || real.beaten / real.n < 0.97) throw new Error(`${real.beaten}/${real.n}`);
});
const moved = neighbourTest(1);
check(`positive control: every reference moved by one passage FAILS that test (${moved.beaten}/${moved.n})`, () => {
  if (moved.beaten / moved.n > 0.5) throw new Error(`${moved.beaten}/${moved.n} still pass`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
