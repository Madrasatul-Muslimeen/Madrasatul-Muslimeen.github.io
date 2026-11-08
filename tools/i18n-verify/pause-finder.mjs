// PCF MSA J121 demo1104 -- docs/reference/2026-11-08-demo1104/pause-finder.mjs on a SYNTHETIC recording (tones + silences of known
// length; no real audio is in the repository). Run from the repository root: node tools/i18n-verify/pause-finder.mjs  [--prove]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
const SRC = "docs/reference/2026-11-08-demo1104/pause-finder.mjs";
const MUTATIONS = {
  "the threshold is not relative to the speech level": ["const thr = median(db) - dropDb", "const thr = -60"],
  "a short breath counts as a pause": ["if ((j - i) * dt >= minPause)", "if ((j - i) * dt >= 0.05)"],
  "a pause is not merged across a blip": ["r[0] - last[1] < mergeGap", "false"],
  "the boundary is the pause start, not its middle": ["mid: (from + to) / 2", "mid: from"],
  "the opening pause is counted as an āyah boundary": ["else openEnd = p.shift().mid;", "else openEnd = p[0].mid;"],
  "the end-of-file silence is counted as a boundary": ["if (p.length && total - p[p.length - 1].to < 0.3) tail = p.pop();", ""],
  "the count check is skipped": ["if (p.length !== need) issues.push", "if (false) issues.push"],
  "joined āyāt get their own boundary": ["if (skip.has(a))", "if (false)"],
};
const RATE = 1000; // 1 sample = 1 ms keeps the fixture small; loudnessFrames works on any rate
// segments: [seconds, amplitude]. speech = 0.2 amplitude (about -17 dB), pause = 0.001 (-60 dB), noise floor 0.002
function synth(segs) { const out = []; for (const [sec, amp] of segs) for (let i = 0; i < Math.round(sec * RATE); i++) out.push(amp * (i % 2 ? 1 : -1)); return Float32Array.from(out); }
const S = 0.2, P = 0.002;
// opening 6 s, then 5 āyāt of unequal length with a 1.5 s pause between, a 0.3 s breath inside āyah 2, āyāt 3+4 joined (no pause between them), 5 s of silence at the end
const rec = synth([[6, S], [1.4, P], [4, S], [1.5, P], [3, S], [0.3, P], [2.5, S], [1.5, P], [7, S], [1.5, P], [4, S], [5, P]]);
async function run(file) {
  let pass = 0, fail = 0;
  const check = (name, ok, detail = "") => { if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`); if (ok) pass++; else { fail++; console.log(`  FAIL  ${name} ${detail}`); } };
  const m = await import(pathToFileURL(file).href + "?" + Math.random());
  const total = rec.length / RATE, db = m.loudnessFrames(rec, RATE), p = m.findPauses(db);
  const near = (a, b, t = 0.1) => Math.abs(a - b) <= t;
  check("a window is 20 ms: one frame per 20 samples at 1 kHz", db.length === Math.floor(rec.length / 20));
  check("4 pauses found (opening, 3 between āyāt) + the end silence = 5; the 0.3 s breath is NOT one", p.length === 5, JSON.stringify(p.map((x) => +x.mid.toFixed(1))));
  check("each pause middle is where its silence is: 6.7 / 12.15 / 19.45 / 27.95 s", near(p[0].mid, 6.7) && near(p[1].mid, 12.15) && near(p[2].mid, 19.45) && near(p[3].mid, 27.95), JSON.stringify(p.map((x) => +x.mid.toFixed(2))));
  const l = m.layOut(p, total, { ayat: 5, joined: [[3, 4]] });
  check("5 āyāt with 3+4 joined need 3 boundaries and find 3", l.need === 3 && l.found === 3 && l.ok === true, JSON.stringify([l.need, l.found, l.issues]));
  check("the opening ends in the middle of its pause", near(l.opening.to, 6.7) && l.opening.from === 0);
  check("āyah 1 starts where the opening ends", near(l.ayahs[0].from, 6.7));
  check("joined āyāt 3 and 4 share one [from,to]", l.ayahs[2].from === l.ayahs[3].from && l.ayahs[2].to === l.ayahs[3].to);
  check("every āyah ends where the next starts, never before it starts", l.ayahs.every((a, i) => a.to > a.from && (i === 0 || a.from >= l.ayahs[i - 1].from)));
  check("the last āyah ends just inside the end silence, not at the file end", l.ayahs[4].to < total - 2 && l.ayahs[4].to > l.ayahs[4].from);
  const miss = m.layOut(p, total, { ayat: 5, joined: [] });
  check("without the joined note one boundary is MISSING and it says so", miss.ok === false && miss.issues.includes("missing") && miss.need === 4 && miss.found === 3);
  const extra = m.layOut(p, total, { ayat: 3, joined: [] });
  check("too many pauses for the āyāt is SURPLUS, not hidden", extra.ok === false && extra.issues.includes("surplus"));
  check("no opening pause found is reported", m.layOut([], total, { ayat: 2 }).issues.includes("no-opening"));
  check("silence, empty and a single frame are survived", m.findPauses(new Float64Array(0)).length === 0 && Array.isArray(m.findPauses(Float64Array.of(-20))));
  const blip = synth([[3, S], [1.0, P], [0.05, S], [1.0, P], [3, S]]);
  check("a 50 ms blip inside a pause does not split it in two", m.findPauses(m.loudnessFrames(blip, RATE)).length === 1);
  const page = fs.readFileSync("docs/reference/2026-11-08-demo1104/index.html", "utf8");
  const finderText = fs.readFileSync(SRC, "utf8").replace(/^export /gm, "");
  check("the demo page carries the finder exactly as the module writes it (rebuild with build.mjs)", page.includes(finderText));
  check("the demo page names no audio file and fetches nothing", !/fetch\(|XMLHttpRequest|sendBeacon|\.mp3|\.webm"/.test(page.replace(/accept="[^"]*"/, "")));
  console.log(`${path.basename(file)}: ${pass} passed, ${fail} failed`);
  return fail;
}
if (process.argv.includes("--prove")) {
  const src = fs.readFileSync(SRC, "utf8"); const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pause-finder-")); let unproven = 0;
  for (const [name, [old, rep]] of Object.entries(MUTATIONS)) {
    const n = src.split(old).length - 1;
    if (n !== 1) { console.log(`UNPROVEN ${name}: the mutation text occurs ${n} times`); unproven++; continue; }
    const f = path.join(dir, name.replace(/\W+/g, "_") + ".mjs"); fs.writeFileSync(f, src.replace(old, rep));
    let red; try { red = (await run(f)) > 0; } catch { red = true; }
    console.log(red ? `caught   ${name}` : `UNPROVEN ${name}`); if (!red) unproven++;
  }
  process.exit(unproven ? 1 : 0);
} else process.exit((await run(path.resolve(SRC))) ? 1 : 0);
