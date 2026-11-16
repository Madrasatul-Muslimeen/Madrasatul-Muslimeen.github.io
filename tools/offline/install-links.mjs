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
// PCA J117: pages that are their own app (msa.json "ownInstalls": Hadith, Dua, Health) carry THEIR OWN line instead
// (their own manifest and icon), never MSA's; their manifest file must exist. SKIP means "no install at all"; an own
// install is not that, so it has its own list.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const settingsFile = path.join(ROOT, "app/apps/msa.json");
if (!fs.existsSync(settingsFile)) { console.error("run from the repository root"); process.exit(2); }
const msa = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
const LINE = msa.installHead;
const PAGES = msa.manifest?.pages || [];
const OWN = msa.ownInstalls?.pages || [];
const OWN_PAGES = OWN.map((o) => o.page);
export const SKIP = {
  "note-editor-prototype-demo.html": "a design demo, not a reader page",
  "quranrevival-render-test.html": "a render test page",
};

const check = process.argv.includes("--check");
const all = fs.readdirSync(path.join(ROOT, "app")).filter((f) => f.endsWith(".html")).sort();
const problems = [];
const expected = all.filter((f) => !(f in SKIP) && !OWN_PAGES.includes(f));
if (JSON.stringify(expected) !== JSON.stringify([...PAGES].sort())) {
  problems.push(`msa.json manifest.pages is not every app/*.html reader page (minus SKIP and ownInstalls).\n    expected: ${expected.join(", ")}\n    listed:   ${[...PAGES].sort().join(", ")}`);
}
for (const o of OWN) {
  if (!all.includes(o.page)) { problems.push(`ownInstalls page app/${o.page} does not exist`); continue; }
  if (o.page in SKIP || PAGES.includes(o.page)) problems.push(`app/${o.page} is in ownInstalls AND in ${o.page in SKIP ? "SKIP" : "manifest.pages"}`);
  if (!fs.existsSync(path.join(ROOT, "app", o.file))) problems.push(`ownInstalls manifest app/${o.file} (for ${o.page}) does not exist`);
  if (!o.head || !o.head.includes(`href="./${o.file}"`)) problems.push(`ownInstalls head for ${o.page} does not link ./${o.file}`);
  const t = fs.readFileSync(path.join(ROOT, "app", o.page), "utf8");
  const n = o.head ? t.split(o.head).length - 1 : 0;
  if (n !== 1) problems.push(`app/${o.page} carries its own install line ${n} time(s), expected 1`);
  if ((t.match(/<link rel="manifest"/g) || []).length !== 1) problems.push(`app/${o.page} must link exactly one manifest`);
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
console.log(check ? `PASS the install line is on all ${PAGES.length} reader pages, once each; ${OWN.length} page(s) carry their own install` : `wrote the install line into ${wrote} page(s); ${PAGES.length} listed`);
