// Hadith H2 -- the Classical Explanations module, bound back to the manifest
// that governs it, and to the rules it must not break.
//
// `app/js/hadith-commentary.js` carries a copy of the two verified register
// entries so a browser module does not have to fetch a governance JSON file at
// runtime. A copy is a second spelling waiting to happen, so this suite holds
// the two identical field by field.
//
// Run from the REPOSITORY ROOT.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  VERIFIED_REGISTER_ENTRIES, verifiedRegisterEntries, commentaryForOccurrence,
  renderPermission, NEVER_DO, PANEL_TITLE,
} from "../../app/js/hadith-commentary.js";
import { OCCURRENCES } from "../../app/js/hadith-fixture-data.js";

const root = path.resolve(process.argv[2] || process.cwd());
const MANIFEST = JSON.parse(fs.readFileSync(
  path.join(root, "docs", "governance", "hadith-commentary-manifest-2026-09-18.json"), "utf8"));
let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

const MIRRORED = [
  "commentary_match_id", "collection_id", "narration_occurrence_id",
  "source_reference_scheme", "source_reference", "source_reference_display",
  "commentary_work_id", "commentary_work_title_ar", "commentary_work_title_en",
  "author_id", "author_display", "digital_edition_id", "commentary_location",
  "source_url", "language", "match_type", "rights_status", "review_status",
];

check("POSITIVE CONTROL -- the manifest and the module both really loaded", () => {
  assert.equal(MANIFEST.matches.length, 2);
  assert.equal(VERIFIED_REGISTER_ENTRIES.length, 2);
  assert.equal(MANIFEST.manifestVersion, "hadith-commentary-manifest:v1");
});

check("the module mirrors the manifest field for field", () => {
  const offenders = [];
  for (const m of MANIFEST.matches) {
    const mod = VERIFIED_REGISTER_ENTRIES.find((e) => e.commentary_match_id === m.commentary_match_id);
    if (!mod) { offenders.push(`${m.commentary_match_id} is missing from the module`); continue; }
    for (const f of MIRRORED) {
      if (mod[f] !== m[f]) offenders.push(`${m.commentary_match_id}.${f}: module ${JSON.stringify(mod[f])} != manifest ${JSON.stringify(m[f])}`);
    }
  }
  assert.deepEqual(offenders, [], offenders.join(" | "));
});

check("the module adds no entry the manifest does not have", () => {
  const manifestIds = MANIFEST.matches.map((m) => m.commentary_match_id).sort();
  const moduleIds = VERIFIED_REGISTER_ENTRIES.map((e) => e.commentary_match_id).sort();
  assert.deepEqual(moduleIds, manifestIds);
});

check("GATE -- no register entry is bound to an occurrence", () => {
  for (const e of verifiedRegisterEntries()) {
    assert.equal(e.narration_occurrence_id, null,
      `${e.commentary_match_id} has acquired an occurrence id; no edition is approved`);
  }
});

check("GATE -- no register entry can attach to a SYNTHETIC narration", () => {
  // The instruction forbids attaching the verified matches to invented
  // narrations. This is enforced by construction: ask for every one.
  for (const o of OCCURRENCES) {
    const r = commentaryForOccurrence(o.occurrenceId);
    assert.equal(r.entries.length, 0, `${o.occurrenceId} picked up a commentary entry`);
    assert.ok(r.reason.startsWith("no-approved-edition"), r.reason);
  }
});

check("GATE -- commentary TEXT may not be shown while rights are link-only", () => {
  for (const e of verifiedRegisterEntries()) {
    const p = renderPermission(e);
    assert.equal(e.rights_status, "link-only");
    assert.equal(p.mayShowText, false, `${e.commentary_match_id} would render text`);
    assert.equal(p.mayShowCitation, true);
    assert.equal(p.mayLinkOut, true);
  }
});

check("renderPermission can actually grant, so the false above means something", () => {
  const p = renderPermission({ rights_status: "embed-cleared" });
  assert.equal(p.mayShowText, true, "the permission function always denies; it is not testing anything");
});

check("a blocked entry may not even be linked", () => {
  const p = renderPermission({ rights_status: "blocked" });
  assert.equal(p.mayLinkOut, false);
  assert.equal(p.mayShowText, false);
});

check("the scholar-to-collection pairing is right, and a swap would fail", () => {
  const byId = new Map(verifiedRegisterEntries().map((e) => [e.commentary_match_id, e]));
  assert.equal(byId.get("HCM-0001").collection_id, "bukhari");
  assert.equal(byId.get("HCM-0001").author_id, "ibn-hajar-al-asqalani");
  assert.equal(byId.get("HCM-0001").commentary_work_id, "fath-al-bari");
  assert.equal(byId.get("HCM-0002").collection_id, "muslim");
  assert.equal(byId.get("HCM-0002").author_id, "al-nawawi");
  assert.equal(byId.get("HCM-0002").commentary_work_id, "al-minhaj-sharh-sahih-muslim");
});

check("both entries still record what has NOT been reviewed", () => {
  for (const e of verifiedRegisterEntries()) {
    assert.ok(/NOT (reviewed|established)/.test(e.review_status),
      `${e.commentary_match_id} no longer says what is unreviewed: ${e.review_status}`);
  }
});

check("the outbound links are the exact URLs the register verified", () => {
  const byId = new Map(verifiedRegisterEntries().map((e) => [e.commentary_match_id, e]));
  assert.ok(byId.get("HCM-0001").source_url.startsWith("https://www.islamweb.net/ar/library/content/52/1/"));
  assert.ok(byId.get("HCM-0002").source_url.startsWith("https://www.islamweb.net/ar/library/content/53/5758/"));
});

check("the prohibitions are carried in code, not only in a document", () => {
  const joined = NEVER_DO.join(" ").toLowerCase();
  for (const phrase of ["ai summary", "auto-translate", "hadith's own text", "synthetic narration"]) {
    assert.ok(joined.includes(phrase), `NEVER_DO no longer forbids: ${phrase}`);
  }
  assert.equal(NEVER_DO.length, 4);
});

check("the panel is titled in all three languages", () => {
  assert.equal(PANEL_TITLE.ar, "شروح الحديث");
  assert.ok(PANEL_TITLE.en && PANEL_TITLE.bn);
});

check("no commentary TEXT is stored anywhere in the module", () => {
  const src = fs.readFileSync(path.join(root, "app", "js", "hadith-commentary.js"), "utf8");
  for (const f of ["text_hash", "content_revision", "commentary_text", "passage_text"]) {
    assert.ok(!new RegExp(`${f}\\s*:`).test(src), `the module carries a ${f} field`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
