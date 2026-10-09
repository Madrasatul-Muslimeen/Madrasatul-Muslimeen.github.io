// bn.js must hold each English key once, and a round must not change an EXISTING value (new keys are fine).
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

// Positive control for the parser: a FIXED historical file that really had
// duplicates (the parent of 3dc70e82, which removed them for v09.137). The count
// is written by hand; if the parser cannot find it, "0 duplicate keys" above is
// not believable.
const HISTORIC = "3dc70e82^";
const HISTORIC_DUPS = 65;
const historicText = git("show", `${HISTORIC}:${REL}`);
check(`parser finds ${HISTORIC_DUPS} duplicates in the historic file ${HISTORIC} (it can fail)`, () => assert.equal(duplicates(historicText).dups.length, HISTORIC_DUPS));

const BN_NOW = await load(now, "now");
const BN_BASE = await load(baseText, "base");

// Every key the base has keeps exactly its value; new keys are allowed and named.
function changedKeys(base, cur) {
  return Object.keys(base).filter((k) => !(k in cur) || cur[k] !== base[k]);
}
const added = Object.keys(BN_NOW).filter((k) => !(k in BN_BASE));
console.log(`INFO ${added.length} key(s) added since ${baseRev().slice(0, 8)}:`, added.length ? added.join(" | ") : "(none)");
check("no EXISTING value changed (new keys allowed)", () => {
  const bad = changedKeys(BN_BASE, BN_NOW);
  assert.deepEqual(bad, [], `changed or removed keys: ${bad.join(" | ")}`);
});

// Mutations, run in memory against the current text.
const lines = now.split("\n");
const at = lines.findIndex((l) => LINE.test(l) && l.includes('"Home"'));
check("mutation: re-inserting an earlier copy with a different value fails check 1", () => {
  const mutated = [...lines.slice(0, at), '  "Modules": "ভিন্ন",', ...lines.slice(at)].join("\n");
  assert.ok(duplicates(mutated).dups.length > 0);
});
const mutatedKept = lines.map((l, i) => (i === at ? l.replace(/:\s*".*?"/, ': "পরিবর্তিত"') : l)).join("\n");
const BN_MUT = await load(mutatedKept, "mut");
check("mutation: changing one kept value fails the existing-value check and names the key", () => {
  const bad = changedKeys(BN_BASE, BN_MUT);
  assert.ok(bad.includes("Home"), bad.join(" | "));
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
