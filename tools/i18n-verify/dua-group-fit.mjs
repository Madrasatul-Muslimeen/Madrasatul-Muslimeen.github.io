// Issue 709: tools/hadith-data-pull/dua-group-fit.mjs scores every member of every dua group. Run from the repository root.
// Dua 2's expected values are written BY HAND from the texts (Tirmidhi 3434, Abu Dawud 1516, al-Nasa'i 'Amal al-Yawm 458,
// Ibn al-Sunni 370 and 448 say "رب اغفر لي وتب علي ..." 100 times; al-Nasa'i 467 is Sayyid al-Istighfar whose only "*" is
// a page note at the very end), never read from the output. Mutations run the tool itself, changed, into a temp folder.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DIR = "tools/hadith-data-pull/output/dua";
const TOOL = "tools/hadith-data-pull/dua-group-fit.mjs";
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

/** Runs every check against a folder holding cards-*.json (the real ones) and fit-*.json; returns [[name, ok, detail]]. */
function runChecks(fitDir) {
  const out = [];
  const check = (name, ok, detail = "") => {
    if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
    out.push([name, !!ok, detail]);
  };
  const pages = fs.readdirSync(DIR).filter((f) => /^cards-\d+\.json$/.test(f)).map((f) => Number(f.match(/\d+/)[0])).sort((a, b) => a - b);
  check("POSITIVE CONTROL: 79 cards pages", pages.length === 79, String(pages.length));
  const fits = new Map();
  for (const p of pages) { const f = path.join(fitDir, `fit-${p}.json`); fits.set(p, fs.existsSync(f) ? readJson(f) : null); }
  check("every cards page has a fit page", [...fits.values()].every(Boolean), pages.filter((p) => !fits.get(p)).join(","));
  let bad = "", nDuas = 0;
  for (const p of pages) {
    const fit = fits.get(p);
    if (!fit) continue;
    const { cards } = readJson(`${DIR}/cards-${p}.json`);
    if (Object.keys(fit.duas).length !== cards.length) bad ||= `page ${p}: duas ${Object.keys(fit.duas).length} != ${cards.length}`;
    for (const c of cards) {
      nDuas++;
      const a = fit.duas[c.dua];
      if (!a || a.length !== c.members.length) bad ||= `page ${p} dua ${c.dua}: ${a?.length} != ${c.members.length}`;
      else if (a.some((e) => !(e[0] >= 0 && e[0] <= 1) || (e[1] != null && e[1] !== "low" && e[1] !== "short") || e[0] !== Math.round(e[0] * 100) / 100)) bad ||= `page ${p} dua ${c.dua}: bad entry`;
    }
  }
  check("member counts match dua by dua, every entry a 2-place share 0-1 with flag low/short/none", !bad && nDuas === 3126, bad || String(nDuas));

  // Dua 2 (page 1): members in cards order.
  const card = readJson(`${DIR}/cards-1.json`).cards.find((c) => c.dua === 2);
  const a = fits.get(1)?.duas[2];
  const at = (b, n) => { const i = card.members.findIndex((m) => m[0] === b && m[1] === n); return i < 0 || !a ? undefined : a[i]; };
  const anchor = at(0, 6578);
  check("dua 2: the anchor [0,6578] scores at least 0.9", anchor && anchor[0] >= 0.9, JSON.stringify(anchor));
  for (const [b, n] of [[2, 3486], [6, 1522], [8, 476], [9, 562], [9, 708]]) {
    const e = at(b, n);
    check(`dua 2: [${b},${n}] (the other dua, "رب اغفر لي وتب علي") is low`, e && e[1] === "low", JSON.stringify(e));
  }
  const trap = at(8, 485);
  check("dua 2: the trap [8,485] scores at least 0.8 and has no flag", trap && trap[0] >= 0.8 && trap[1] == null, JSON.stringify(trap));
  const jabir = at(9, 565);
  check("dua 2: [9,565] (Ibn al-Sunni 372, Jabir) has no flag", jabir && jabir[1] == null, JSON.stringify(jabir));
  check("dua 2: exactly those five are flagged low", a && a.filter((e) => e[1] === "low").length === 5, JSON.stringify(a?.map((e) => e[1] ?? "")));

  let letters = 0;
  for (const p of pages) if (fits.get(p) && /[؀-ۿ]/.test(fs.readFileSync(path.join(fitDir, `fit-${p}.json`), "utf8"))) letters++;
  check("no text stored: no Arabic letters in any fit file", letters === 0, String(letters));
  const some = [...fits.values()].filter(Boolean).flatMap((f) => Object.values(f.duas).flat());
  check("POSITIVE CONTROL: the output holds both flags and unflagged members", some.some((e) => e[1] === "low") && some.some((e) => e[1] === "short") && some.some((e) => e[1] == null), "");
  return out;
}

let pass = 0, fail = 0;
for (const [name, ok, detail] of runChecks(DIR)) {
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}

// ---- Mutations: each must make at least one check fail, and its first failing line is printed. ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fit-mut-"));
function mutationFails(label, build) {
  const dir = path.join(tmp, label.replace(/\W+/g, "-"));
  fs.mkdirSync(dir);
  build(dir);
  // Pages the mutation did not rewrite are the real ones, so only the mutated page differs.
  for (const f of fs.readdirSync(DIR).filter((x) => /^fit-\d+\.json$/.test(x))) if (!fs.existsSync(path.join(dir, f))) fs.copyFileSync(`${DIR}/${f}`, path.join(dir, f));
  const failing = runChecks(dir).filter((r) => !r[1]);
  if (failing.length) { pass++; console.log(`  PASS  MUTATION "${label}" is caught -- first failing line: ${failing[0][0]} ${failing[0][2]}`); }
  else { fail++; console.log(`  FAIL  MUTATION "${label}" was NOT caught`); }
}
/** Runs a changed copy of the tool (beside the real one, for its imports) on page 1 into `dir`. */
function mutatedTool(dir, tag, from, to) {
  const src = fs.readFileSync(TOOL, "utf8");
  const n = src.split(from).length - 1;
  if (n < 1) throw new Error(`mutation "${tag}": the tool no longer contains ${JSON.stringify(from)}`);
  const copy = path.join(path.dirname(TOOL), `_mut-${tag}.mjs`);
  fs.writeFileSync(copy, src.split(from).join(to));
  try { execFileSync("node", [copy, "--out", dir, "--pages", "1"], { stdio: "pipe" }); } finally { fs.rmSync(copy); }
}
mutationFails("drop one member from a fit page", (dir) => {
  const f = readJson(`${DIR}/fit-1.json`);
  f.duas[2].pop();
  fs.writeFileSync(path.join(dir, "fit-1.json"), JSON.stringify(f));
});
mutationFails("score every member 1", (dir) => mutatedTool(dir, "all1", "return Math.round((uniq.filter((w) => set.has(w)).length / uniq.length) * 100) / 100;", "return 1;"));
mutationFails("read only the text after the star", (dir) => mutatedTool(dir, "star", "if (words(rest).length >= MATN_MIN_WORDS) return rest;", "return rest;"));
fs.rmSync(tmp, { recursive: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
