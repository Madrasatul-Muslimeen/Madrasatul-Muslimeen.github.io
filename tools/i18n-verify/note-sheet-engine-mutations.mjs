// Mutation-proves note-sheet-engine.mjs: each entry breaks ONE thing in a temporary copy of the engine, runs the pure
// suite against that copy and REQUIRES it to fail -- and prints which checks failed, so "the suite would notice" is a
// fact, not a hope. Run from the repository root:  node tools/i18n-verify/note-sheet-engine-mutations.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const real = fs.readFileSync(path.join(root, "app/js/note-sheet-engine.js"), "utf8");
const MUTATIONS = [
  ["a formula shift is not relative", "const mv = (p) => ({ ...p, c: p.abs_c ? p.c : p.c + dc, r: p.abs_r ? p.r : p.r + dr });", "const mv = (p) => ({ ...p });"],
  ["$absolute references move when shifted", "c: p.abs_c ? p.c : p.c + dc, r: p.abs_r ? p.r : p.r + dr", "c: p.c + dc, r: p.r + dr"],
  ["#CIRC! is not detected (a cycle is simply followed)", "if (visiting.has(key)) return { v: null, err: \"#CIRC!\" };", "if (visiting.has(key)) return { v: 0, err: null };"],
  ["the grid is not bounded (rows clamp removed)", "const rows = clampInt(wantRows, 1, SHEET_MAX_ROWS, 1)", "const rows = clampInt(wantRows, 1, 1e9, 1)"],
  ["an unknown number format is let through", "SHEET_FORMATS.includes(o.fmt[k]) && o.fmt[k] !== \"general\"", "typeof o.fmt[k] === \"string\" && o.fmt[k] !== \"general\""],
  ["the snapshot does not escape cell text", "const esc = (x) => String(x).replace(/&/g, \"&amp;\").replace(/</g, \"&lt;\")", "const esc = (x) => String(x).replace(/&/g, \"&amp;\")"],
  ["a number series does not continue (always copies)", "const series = k >= 2 && seedNums.every((x) => typeof x === \"number\");", "const series = false;"],
  ["the filter hides by RAW text, not the computed value", "if (s.filt[c].includes(grid[r][Number(c)].text)) hide.add(r);", "if (s.filt[c].includes(s.d[r][Number(c)])) hide.add(r);"],
  ["sort ignores the frozen header row", "const start = s.hdr ? 1 : 0;\n  if (s.merges.some", "const start = 0;\n  if (s.merges.some"],
  ["IF evaluates both branches (not lazy)", "return toBool(scalar(run(n.args[0]))) ? run(n.args[1]) : (n.args[2] ? run(n.args[2]) : false);", "{ const a = run(n.args[1]); const b = n.args[2] ? run(n.args[2]) : false; return toBool(scalar(run(n.args[0]))) ? a : b; }"],
];
let proven = 0, unproven = 0;
for (const [name, from, to] of MUTATIONS) {
  if (!real.includes(from)) { console.log(`  ANCHOR MISSING  ${name}`); unproven++; continue; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sheet-mut-"));
  const file = path.join(dir, "note-sheet-engine.js");
  fs.writeFileSync(file, real.replace(from, to));
  const r = spawnSync("node", [path.join(root, "tools/i18n-verify/note-sheet-engine.mjs"), root], { env: { ...process.env, SHEET_ENGINE: file }, encoding: "utf8" });
  const failed = (r.stdout.match(/^ {2}FAIL {2}.*$/gm) || []).map((l) => l.replace(/^ {2}FAIL {2}/, ""));
  if (r.status !== 0 && failed.length) { proven++; console.log(`  PROVEN  ${name}\n          failed ${failed.length}: ${failed.slice(0, 3).join(" | ")}`); }
  else { unproven++; console.log(`  UNPROVEN  ${name} (exit ${r.status}, ${failed.length} failures)`); }
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(`\n${proven} mutations failed the suite as they must, ${unproven} did not`);
process.exit(unproven ? 1 : 0);
