// PCF MSA J120 O1 ("Install MSA"): puts the install line (manifest link, home-screen
// icon, theme colour) into the head of every reader page, right after its viewport meta.
//   node tools/offline/install-links.mjs          write it where it is missing
//   node tools/offline/install-links.mjs --check  exit 1 when a page is missing it, has it
//                                                 twice, or carries it without being listed
// The line and the page list are app/apps/msa.json's "installHead" and "manifest.pages",
// so the one-source build (tools/apps/build-app.mjs) can take MSA's line out of every
// other app's pages: another app is not "MSA" on a phone's home screen.
// Pages left out on purpose (test/demo pages, and the hidden Health sub-pages) are
// listed in SKIP with the reason.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const settingsFile = path.join(ROOT, "app/apps/msa.json");
if (!fs.existsSync(settingsFile)) { console.error("run from the repository root"); process.exit(2); }
const msa = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
const LINE = msa.installHead;
const PAGES = msa.manifest?.pages || [];
export const SKIP = {
  "note-editor-prototype-demo.html": "a design demo, not a reader page",
  "quranrevival-render-test.html": "a render test page",
};

const check = process.argv.includes("--check");
const all = fs.readdirSync(path.join(ROOT, "app")).filter((f) => f.endsWith(".html")).sort();
const problems = [];
const expected = all.filter((f) => !(f in SKIP));
if (JSON.stringify(expected) !== JSON.stringify([...PAGES].sort())) {
  problems.push(`msa.json manifest.pages is not every app/*.html reader page.\n    expected: ${expected.join(", ")}\n    listed:   ${[...PAGES].sort().join(", ")}`);
}
let wrote = 0;
for (const f of all) {
  const file = path.join(ROOT, "app", f);
  let t = fs.readFileSync(file, "utf8");
  const n = t.split(LINE).length - 1;
  const want = PAGES.includes(f) ? 1 : 0;
  if (n === want) continue;
  if (check || n > 1 || (n === 1 && want === 0)) { problems.push(`app/${f} carries the install line ${n} time(s), expected ${want}`); continue; }
  const m = t.match(/<meta name="viewport"[^>]*>\n/);
  if (!m) { problems.push(`app/${f} has no viewport meta line to put the install line after`); continue; }
  t = t.replace(m[0], m[0] + LINE + "\n");
  fs.writeFileSync(file, t);
  wrote++;
}
if (problems.length) { console.log("FAIL\n  - " + problems.join("\n  - ")); process.exit(1); }
console.log(check ? `PASS the install line is on all ${PAGES.length} reader pages, once each` : `wrote the install line into ${wrote} page(s); ${PAGES.length} listed`);
