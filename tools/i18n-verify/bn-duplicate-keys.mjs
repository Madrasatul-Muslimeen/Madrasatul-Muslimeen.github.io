// bn.js must hold each English key once, and tidying must not change what shows.
//
// In an object literal the LAST duplicate wins, so earlier copies are dead text
// that only misleads an editor. Run from the repository root. BASE=<rev> names
// the comparison commit (default: the merge-base with origin/main, else main).
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const REL = "app/js/i18n/bn.js";
const LINE = /^\s*("(?:[^"\\]|\\.)*")\s*:\s*("(?:[^"\\]|\\.)*"),?(\s*\/\/.*)?\s*$/;

let pass = 0, fail = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new Error("async body: a promise counts as a pass");
    pass++; console.log("PASS", name);
  } catch (e) { fail++; console.log("FAIL", name, "-", e.message); }
}

// Returns { dups: [key...], keyLines } by reading one `"key": "value"` per line.
function duplicates(text) {
  const seen = new Map();
  for (const line of text.split("\n")) {
    const m = LINE.exec(line);
    if (m) seen.set(m[1], (seen.get(m[1]) || 0) + 1);
  }
  return { entries: seen.size, dups: [...seen].filter(([, n]) => n > 1).map(([k]) => k) };
}

async function load(text, tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bn-dup-"));
  const f = path.join(dir, `${tag}.mjs`);
  fs.writeFileSync(f, text);
  return (await import(pathToFileURL(f).href)).BN;
}

function git(...a) { return execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 26 }); }
function baseRev() {
  if (process.env.BASE) return process.env.BASE;
  for (const ref of ["origin/main", "main"]) {
    try { return git("merge-base", "HEAD", ref).trim(); } catch {}
  }
  throw new Error("no base revision: set BASE");
}

const now = fs.readFileSync(REL, "utf8");
const baseText = git("show", `${baseRev()}:${REL}`);

const cur = duplicates(now);
check("parser read a plausible number of entries (positive control)", () => assert.ok(cur.entries > 2000, String(cur.entries)));
check("bn.js has 0 duplicate keys", () => assert.deepEqual(cur.dups, []));

const baseDup = duplicates(baseText);
// Only meaningful while the comparison commit still has the duplicates.
const EXPECT_BASE = Number(process.env.EXPECT_BASE_DUPS ?? 65);
check(`parser finds ${EXPECT_BASE} duplicates in the base file (it can fail)`, () => assert.equal(baseDup.dups.length, EXPECT_BASE));

const BN_NOW = await load(now, "now");
const BN_BASE = await load(baseText, "base");
check("BN is deep-equal to the base BN (nothing on screen changed)", () => assert.deepEqual(BN_NOW, BN_BASE));

// Mutations, run in memory against the current text.
const lines = now.split("\n");
const at = lines.findIndex((l) => LINE.test(l) && l.includes('"Home"'));
check("mutation: re-inserting an earlier copy with a different value fails check 1", () => {
  const mutated = [...lines.slice(0, at), '  "Modules": "ভিন্ন",', ...lines.slice(at)].join("\n");
  assert.ok(duplicates(mutated).dups.length > 0);
});
const mutatedKept = lines.map((l, i) => (i === at ? l.replace(/:\s*".*?"/, ': "পরিবর্তিত"') : l)).join("\n");
const BN_MUT = await load(mutatedKept, "mut");
check("mutation: changing one kept value fails check 2", () => assert.notDeepEqual(BN_MUT, BN_BASE));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
