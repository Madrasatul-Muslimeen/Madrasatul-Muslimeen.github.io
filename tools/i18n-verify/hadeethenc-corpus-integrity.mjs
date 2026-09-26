// Hadith HadeethEnc corpus -- integrity of whatever
// tools/hadith-data-pull/hadeethenc-pull.mjs has actually pulled.
//
// Three things this proves, once a real pull exists (issue #306, "Prove it"):
//   1. The manifest's own counts match what is actually on disk -- a stale
//      manifest (a partial re-run, a manually edited count) is caught rather
//      than trusted.
//   2. Every hadith record's stored `contentHash` still matches its own
//      content fields -- proving the text on disk is BYTE-IDENTICAL to what
//      was written at pull time, which is the mechanical half of "unmodified"
//      (the grant's own first condition). This does NOT re-contact the live
//      API -- only the pull script itself ever does that; this is "has
//      anything touched the file since", not "does the API still agree".
//   3. Every hadith has an id, Arabic text and attribution -- the minimum a
//      reader-facing card needs to be honest rather than blank.
//
// THIS SUITE CANNOT RUN ITS REAL CHECKS YET. The sandbox that authored it has
// no network access to hadeethenc.com (confirmed: curl and WebFetch both
// refused the outbound request), so no corpus has been pulled in this
// checkout. Rather than print a false PASS or a false FAIL for a corpus that
// does not exist, it reports PENDING and exits cleanly -- run
// hadeethenc-pull.mjs first, from an environment with real network access,
// then re-run this file.
//
// The three checking functions below are pure and are proven able to refuse,
// with POSITIVE CONTROLS against synthetic fixtures, exactly like
// hadith-source-rights.mjs's own rightsRefusal() -- so this suite has earned
// its own correctness before a real corpus ever reaches it, per this
// project's own standing rule that an unproven check has earned nothing.
//
// Run from the REPOSITORY ROOT.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";
import { contentHash, arabicText } from "../hadith-data-pull/hadeethenc-pull.mjs";
import { rehydrate } from "../hadith-data-pull/hadeethenc-package.mjs";

const root = path.resolve(process.argv[2] || process.cwd());
const OUT_DIR = path.join(root, "tools", "hadith-data-pull", "output", "hadeethenc");
const MANIFEST_PATH = path.join(OUT_DIR, "manifest.json");
const SOURCES_PATH = path.join(root, "docs", "governance", "hadith-source-manifest-2026-09-18.json");

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    }
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

// ---------------------------------------------------------------------------
// Pure checking logic, refusal-shaped like hadith-source-rights.mjs's own
// rightsRefusal(): returns a list of reasons, empty means sound.
// ---------------------------------------------------------------------------

/** Do the manifest's per-language/per-root counts match what the root files themselves actually contain? */
export function manifestCountRefusal(manifest, rootFiles) {
  const bad = [];
  for (const lang of manifest.perLanguage ?? []) {
    let sumForLang = 0;
    for (const r of lang.files ?? lang.roots ?? []) {
      const file = rootFiles.get(r.file);
      if (!file) { bad.push(`manifest names ${r.file} but it was not read`); continue; }
      if (file.hadiths.length !== r.hadithCount) {
        bad.push(`${r.file}: manifest says ${r.hadithCount} hadiths, file has ${file.hadiths.length}`);
      }
      sumForLang += file.hadiths.length;
    }
    if (sumForLang !== lang.hadithCount) {
      bad.push(`${lang.language}: manifest's own hadithCount (${lang.hadithCount}) does not equal the sum of its files (${sumForLang})`);
    }
  }
  return bad;
}

/** Does every hadith's stored contentHash still match a fresh hash of its own content fields? */
export function contentHashRefusal(hadiths, fileLabel) {
  const bad = [];
  for (const h of hadiths) {
    if (!h.contentHash) { bad.push(`${fileLabel}#${h.id}: no contentHash stored`); continue; }
    const fresh = contentHash(h);
    if (fresh !== h.contentHash) {
      bad.push(`${fileLabel}#${h.id}: stored hash ${h.contentHash.slice(0, 12)}… does not match its own content (recomputed ${fresh.slice(0, 12)}…) -- the text has changed since it was pulled`);
    }
  }
  return bad;
}

/** Does every hadith carry the minimum a reader-facing card needs? */
// UPDATED IN PLACE, 26 Sep 2026: "Arabic text" is `hadeeth` only in the ar
// pull; in en/bn `hadeeth` is the translation and the Arabic is `hadeeth_ar`
// (measured). Checking `hadeeth` alone would have passed an English record
// with no Arabic at all.
export function requiredFieldsRefusal(hadiths, fileLabel, lang = "ar") {
  const bad = [];
  for (const h of hadiths) {
    if (h.id === undefined || h.id === null) bad.push(`${fileLabel}: a hadith is missing its id`);
    const ar = arabicText(h, lang);
    if (!ar || typeof ar !== "string" || !/[\u0600-\u06FF]/.test(ar)) bad.push(`${fileLabel}#${h.id}: missing Arabic hadith text`);
    if (!h.attribution || typeof h.attribution !== "string" || !h.attribution.trim()) bad.push(`${fileLabel}#${h.id}: missing attribution`);
  }
  return bad;
}

// ---------------------------------------------------------------------------
// Positive controls -- prove each refusal function can actually refuse,
// against synthetic fixtures, before any real corpus is trusted to it.
// ---------------------------------------------------------------------------

check("POSITIVE CONTROL -- manifestCountRefusal() can actually refuse", () => {
  const manifest = { perLanguage: [{ language: "ar", hadithCount: 2, roots: [{ file: "ar/root-1.json", hadithCount: 2 }] }] };
  const sound = new Map([["ar/root-1.json", { hadiths: [{ id: 1 }, { id: 2 }] }]]);
  assert.deepEqual(manifestCountRefusal(manifest, sound), [], "a manifest that matches its own files must pass");

  const stale = new Map([["ar/root-1.json", { hadiths: [{ id: 1 }] }]]);
  assert.ok(manifestCountRefusal(manifest, stale).length > 0, "a manifest overstating a root's count must be refused");

  const missingFile = new Map();
  assert.ok(manifestCountRefusal(manifest, missingFile).some((r) => r.includes("not read")),
    "a manifest naming a file that was never read must be refused");
});

check("POSITIVE CONTROL -- contentHashRefusal() can actually refuse", () => {
  const record = { id: 1, hadeeth: "text", attribution: "a", title: null, grade: null, explanation: null, hints: null, words_meanings: null, reference: null, categories: null };
  const sound = { ...record, contentHash: contentHash(record) };
  assert.deepEqual(contentHashRefusal([sound], "test"), [], "an untouched record must pass");

  const tampered = { ...sound, hadeeth: "text, but someone edited it" };
  assert.ok(contentHashRefusal([tampered], "test").some((r) => r.includes("has changed since it was pulled")),
    "a record whose content no longer matches its own stored hash must be refused");

  const noHash = { ...record };
  assert.ok(contentHashRefusal([noHash], "test").some((r) => r.includes("no contentHash")),
    "a record with no stored hash at all must be refused");
});

check("POSITIVE CONTROL -- requiredFieldsRefusal() can actually refuse", () => {
  const sound = { id: 1, hadeeth: "متن", attribution: "Narrated by X" };
  assert.deepEqual(requiredFieldsRefusal([sound], "test"), []);

  assert.ok(requiredFieldsRefusal([{ ...sound, hadeeth: "" }], "test").some((r) => r.includes("Arabic hadith text")));
  assert.ok(requiredFieldsRefusal([{ ...sound, attribution: null }], "test").some((r) => r.includes("attribution")));
  assert.ok(requiredFieldsRefusal([{ ...sound, id: undefined }], "test").some((r) => r.includes("missing its id")));
  // A translated record whose Arabic is missing must be refused even though `hadeeth` (the translation) is present.
  assert.ok(requiredFieldsRefusal([{ id: 2, hadeeth: "From Abu Musa", attribution: "Agreed upon" }], "test", "en").some((r) => r.includes("Arabic hadith text")));
  assert.deepEqual(requiredFieldsRefusal([{ id: 2, hadeeth: "From Abu Musa", hadeeth_ar: "عن أبي موسى", attribution: "Agreed upon" }], "test", "en"), []);
});

check("the rights register genuinely names hadeethenc as approved, before this suite trusts anything about its corpus", () => {
  const sources = JSON.parse(fs.readFileSync(SOURCES_PATH, "utf8"));
  assert.ok(
    (sources.importAuthorisation?.approvedSources ?? []).includes("hadeethenc"),
    "hadeethenc must be in approvedSources before its corpus is treated as legitimate -- see hadith-source-rights.mjs",
  );
});

// ---------------------------------------------------------------------------
// The real check -- only runs once a real pull exists.
// ---------------------------------------------------------------------------

if (!fs.existsSync(MANIFEST_PATH)) {
  console.log(`\nPENDING -- no HadeethEnc corpus has been pulled yet (${path.relative(root, MANIFEST_PATH)} does not exist).`);
  console.log("Run tools/hadith-data-pull/hadeethenc-pull.mjs from an environment with real network access to hadeethenc.com, then re-run this file.");
  console.log(`\n${passed} passed, ${failed} failed (logic self-checks only -- no real corpus present)`);
  if (failed) process.exitCode = 1;
} else {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const rootFiles = new Map();
  for (const lang of manifest.perLanguage ?? []) {
    for (const r of lang.files ?? []) {
      const p = path.join(OUT_DIR, r.file);
      if (fs.existsSync(p)) rootFiles.set(r.file, JSON.parse(fs.readFileSync(p, "utf8")));
    }
  }
  // UPDATED 26 Sep 2026 (Architect review): en/bn files store each Arabic
  // field once (hadeethenc-package.mjs). The hash was taken over the WHOLE
  // API record, so every record is rebuilt from the ar record first and the
  // rebuilt record is what is hashed -- a byte lost in the dedup fails here.
  const arById = new Map();
  for (const [file, data] of rootFiles) if (data.language === "ar") for (const h of data.hadiths) arById.set(String(h.id), h);
  for (const [file, data] of rootFiles) {
    if (data.language === "ar") continue;
    data.hadiths = data.hadiths.map((h) => {
      const omitted = data.arabicFromArRecord?.[h.id];
      if (omitted && !arById.has(String(h.id))) throw new Error(`${file}#${h.id}: Arabic fields omitted but no ar record exists`);
      return rehydrate(h, omitted, arById.get(String(h.id)));
    });
  }

  check("POSITIVE CONTROL -- dropping one omitted field's listing breaks that record's hash (the rebuild is really checked)", () => {
    const [file, data] = [...rootFiles].find(([, d]) => d.language !== "ar" && Object.keys(d.arabicFromArRecord ?? {}).length);
    const raw = JSON.parse(fs.readFileSync(path.join(OUT_DIR, file), "utf8"));
    const id = Object.keys(raw.arabicFromArRecord)[0];
    const h = raw.hadiths.find((x) => String(x.id) === id);
    const partial = rehydrate(h, raw.arabicFromArRecord[id].slice(1), arById.get(id));
    assert.ok(contentHashRefusal([partial], file).length === 1, "a record missing one Arabic field must fail its hash");
    assert.deepEqual(contentHashRefusal([data.hadiths.find((x) => String(x.id) === id)], file), [], "the full rebuild passes");
  });

  check("REAL CORPUS -- the manifest's own counts match the files on disk", () => {
    const offenders = manifestCountRefusal(manifest, rootFiles);
    assert.deepEqual(offenders, [], offenders.join(" | "));
  });

  check("REAL CORPUS -- every record's stored hash still matches its own content", () => {
    const offenders = [];
    for (const [file, data] of rootFiles) offenders.push(...contentHashRefusal(data.hadiths ?? [], file));
    assert.deepEqual(offenders, [], offenders.slice(0, 10).join(" | "));
  });

  check("REAL CORPUS -- every hadith has an id, Arabic text and attribution", () => {
    const offenders = [];
    for (const [file, data] of rootFiles) offenders.push(...requiredFieldsRefusal(data.hadiths ?? [], file, data.language));
    assert.deepEqual(offenders, [], offenders.slice(0, 10).join(" | "));
  });

  check("REAL CORPUS -- every hadith a category lists is stored, in the file hadithFile names, exactly once per language", () => {
    const offenders = [];
    for (const lang of manifest.perLanguage ?? []) {
      const cats = JSON.parse(fs.readFileSync(path.join(OUT_DIR, lang.language, "categories.json"), "utf8"));
      const stored = new Map();
      for (const r of lang.files) for (const h of rootFiles.get(r.file)?.hadiths ?? []) {
        if (stored.has(String(h.id))) offenders.push(`${lang.language}#${h.id} stored twice`);
        stored.set(String(h.id), r.file);
      }
      for (const [cat, ids] of Object.entries(cats.categoryHadithIds)) for (const id of ids) {
        if (stored.get(id) !== cats.hadithFile[id]) offenders.push(`${lang.language} category ${cat} lists ${id}, stored in ${stored.get(id)}, hadithFile says ${cats.hadithFile[id]}`);
      }
    }
    assert.deepEqual(offenders, [], offenders.slice(0, 10).join(" | "));
  });

  check("REAL CORPUS -- output size is reported and under the ~40 MB stop-and-say-so threshold", () => {
    assert.equal(manifest.sizeWarning, null,
      `hadeethenc-pull.mjs itself flagged: ${manifest.sizeWarning} -- do not treat this corpus as ready to commit until reviewed`);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}
