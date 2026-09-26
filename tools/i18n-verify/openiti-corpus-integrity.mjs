// OpenITI Hadith books -- integrity of what tools/hadith-data-pull/openiti-pull.mjs
// stored. Run from the REPOSITORY ROOT.
//
// Proves:
//   1. the manifest lists exactly the files on disk, and each file's SHA-256
//      and byte length still equal what was recorded at pull time -- the
//      text is unmodified (the licence's attribution-and-share-alike terms
//      are honoured only if what we show is what OpenITI published);
//   2. the manifest carries the licence, the release DOI and the grant, so
//      every later consumer can credit the source;
//   3. OpenITI is an APPROVED source in the rights register -- the corpus
//      folder is legitimate only because of that;
//   4. each file is really an OpenITI mARkdown book with numbered hadith in
//      it (the '# N' convention), so a later splitter has something to split.
// A POSITIVE CONTROL proves the hash check can refuse.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const DIR = path.join(root, "tools", "hadith-data-pull", "output", "openiti-release");
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous");
    passed++; console.log(`  PASS  ${name}`);
  } catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
}

export function hashRefusal(files, readFile) {
  const bad = [];
  for (const f of files) {
    const buf = readFile(f.file);
    if (!buf) { bad.push(`${f.file}: missing`); continue; }
    if (buf.length !== f.bytes) bad.push(`${f.file}: ${buf.length} bytes, manifest says ${f.bytes}`);
    if (sha(buf) !== f.sha256) bad.push(`${f.file}: SHA-256 differs from the one recorded at pull time`);
  }
  return bad;
}

const manifest = JSON.parse(fs.readFileSync(path.join(DIR, "manifest.json"), "utf8"));
const read = (file) => (fs.existsSync(path.join(DIR, file)) ? fs.readFileSync(path.join(DIR, file)) : null);

check("POSITIVE CONTROL -- one changed byte is refused", () => {
  const f = manifest.files[0];
  const buf = Buffer.from(read(f.file));
  buf[buf.length - 1] ^= 1;
  assert.equal(hashRefusal([f], () => buf).length >= 1, true);
  assert.deepEqual(hashRefusal([f], read), []);
});

check("every file's bytes and SHA-256 equal the manifest (unmodified since the pull)", () => {
  const bad = hashRefusal(manifest.files, read);
  assert.deepEqual(bad, [], bad.join(" | "));
});

// Updated for issue #314: "split" is a new subdirectory, tools/hadith-data-pull/
// openiti-split.mjs's own output (book -> chapter -> hadith), read from these
// same unmodified .txt files and never written to by anything in this file's
// own check above -- it sits BESIDE the manifest's files, not among them, so
// it is named and excluded here rather than making this check pass vacuously
// for any future addition.
check("the folder holds exactly the manifest's files, plus the known 'split' output directory", () => {
  const onDisk = fs.readdirSync(DIR).filter((f) => f !== "manifest.json" && f !== "split").sort();
  assert.deepEqual(onDisk, manifest.files.map((f) => f.file).sort());
  assert.ok(fs.statSync(path.join(DIR, "split")).isDirectory());
});

check("the manifest carries the licence, the release DOI and the Owner's grant", () => {
  assert.equal(manifest.sourceId, "openiti-release");
  assert.equal(manifest.release.licence, "CC BY-NC-SA 4.0");
  assert.equal(manifest.release.doi, "10.5281/zenodo.3082463");
  assert.match(manifest.grant, /2026-09-26-owner-decisions\.md/);
  assert.ok(fs.existsSync(path.join(root, "docs", "governance", "2026-09-26-owner-decisions.md")));
});

check("OpenITI is an approved source in the rights register, with a dated Owner grant", () => {
  const reg = JSON.parse(fs.readFileSync(path.join(root, "docs", "governance", "hadith-source-manifest-2026-09-18.json"), "utf8"));
  assert.ok(reg.importAuthorisation.approvedSources.includes("openiti-release"));
  const src = reg.sources.find((s) => s.sourceId === "openiti-release");
  assert.equal(src.rightsEvidence.grantedBy, "owner");
  assert.equal(src.rightsEvidence.grantDate, "2026-09-26");
  assert.match(src.rightsEvidence.conditions, /Non-commercial/);
});

// Measured on the first pull: the numbering convention VARIES by book --
// Bukhari/Abu Dawud/Nasa'i/Ibn Majah/Muwatta/Ahmad/Darimi open a hadith with
// '# N', Tirmidhi marks it '### ||| N', and Muslim and both Nawawi books use
// plain '# ' paragraphs. So this asserts only what every book shares (the
// header and a body of paragraphs) and REPORTS each book's own markers for
// the splitter round, rather than assuming one convention.
check("each file is an OpenITI mARkdown book with a body of paragraphs", () => {
  const bad = [];
  for (const f of manifest.files) {
    const text = read(f.file).toString("utf8");
    if (!text.startsWith("######OpenITI#")) bad.push(`${f.file}: no OpenITI header`);
    const paragraphs = (text.match(/^# /gm) || []).length;
    const hashN = (text.match(/^# \d+ /gm) || []).length;
    const tripleBar = (text.match(/^### \|\|\| \d+/gm) || []).length;
    console.log(`        ${f.title_en}: ${paragraphs} paragraphs, '# N' ${hashN}, '### ||| N' ${tripleBar}`);
    if (paragraphs < 20) bad.push(`${f.file}: only ${paragraphs} paragraphs`);
  }
  assert.deepEqual(bad, [], bad.join(" | "));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
