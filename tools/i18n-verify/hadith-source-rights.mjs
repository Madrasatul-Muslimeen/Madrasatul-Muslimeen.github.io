// Hadith H1 -- the guard that makes the SOURCE APPROVAL GATE mechanical.
//
// The owner is a non-coder. "We did not import unlicensed text" is exactly
// the kind of claim that is easy to assert in a report and impossible for
// them to check. So it is checked here instead, by reading the manifests and
// the working tree rather than by anyone's recollection.
//
// The three things this exists to stop:
//
//   1. A source drifting to `embed-cleared` without a recorded grant --
//      the Source Register's own rule is that the ABSENCE of a displayed
//      licence is not permission. Absence must deny.
//   2. A commentary row acquiring a narration_occurrence_id before any
//      edition is approved -- which would be the cross-edition inference
//      from a displayed number that the Master Plan forbids, committed
//      permanently into data.
//   3. A corpus appearing in the tree while `approvedEditions` is empty.
//
// Run from the REPOSITORY ROOT (this harness resolves from process.cwd()).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
const gov = path.join(root, "docs", "governance");
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

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(gov, f), "utf8"));
const SOURCES = readJson("hadith-source-manifest-2026-09-18.json");
const COMMENTARY = readJson("hadith-commentary-manifest-2026-09-18.json");

const CANONICAL_STATES = ["blocked", "link-only", "embed-cleared"];
const PERMISSION_KEYS = [
  "mayStoreText", "mayDisplayText", "mayIndexText", "mayRedistribute",
  "mayUseOffline", "mayStoreLocator", "mayLinkOut",
];
// Verbatim from the Source Register's "Required commentary attachment schema".
const REGISTER_FIELDS = [
  "commentary_match_id", "subject", "collection_id", "narration_occurrence_id",
  "source_reference_scheme", "source_reference", "commentary_work_id", "author_id",
  "digital_edition_id", "commentary_location", "source_url", "language",
  "passage_scope", "match_type", "mapping_evidence", "reviewer", "review_date",
  "rights_status", "content_revision", "text_hash",
];

/** The one rule the whole gate rests on. Returns a list of reasons a source is invalid; empty means sound. */
function rightsRefusal(source) {
  const bad = [];
  const st = source.rightsStatus;
  if (!CANONICAL_STATES.includes(st)) bad.push(`rightsStatus "${st}" is not one of ${CANONICAL_STATES.join(", ")}`);
  const p = source.permissions ?? {};
  for (const k of PERMISSION_KEYS) {
    if (typeof p[k] !== "boolean") bad.push(`permissions.${k} is missing or not a boolean`);
  }
  if (st === "embed-cleared" && !source.rightsEvidence?.grant) {
    bad.push("embed-cleared with no recorded grant -- absence of a licence is not permission");
  }
  if (st !== "embed-cleared") {
    for (const k of ["mayStoreText", "mayDisplayText", "mayIndexText", "mayRedistribute", "mayUseOffline"]) {
      if (p[k] === true) bad.push(`${st} may not set ${k}`);
    }
  }
  if (st === "blocked") {
    for (const k of PERMISSION_KEYS) if (p[k] === true) bad.push(`blocked may not set ${k}`);
  }
  return bad;
}

// ---------------------------------------------------------------------------
// Positive controls first. A guard whose loader silently read nothing passes
// every case vacuously -- so prove it read real data, and prove the rule that
// does the work can actually refuse.
// ---------------------------------------------------------------------------

check("POSITIVE CONTROL -- both manifests really loaded and carry rows", () => {
  assert.ok(SOURCES.sources.length >= 4, `expected at least 4 sources, read ${SOURCES.sources.length}`);
  assert.equal(COMMENTARY.matches.length, 2, "the register records exactly two verified matches");
  assert.equal(SOURCES.manifestVersion, "hadith-source-manifest:v1");
  assert.equal(COMMENTARY.manifestVersion, "hadith-commentary-manifest:v1");
});

check("POSITIVE CONTROL -- rightsRefusal() can actually refuse", () => {
  const sound = { rightsStatus: "link-only", rightsEvidence: { grant: null },
    permissions: Object.fromEntries(PERMISSION_KEYS.map((k) => [k, k === "mayStoreLocator" || k === "mayLinkOut"])) };
  assert.deepEqual(rightsRefusal(sound), [], "a sound link-only source must pass");

  const ungranted = { ...sound, rightsStatus: "embed-cleared" };
  assert.ok(rightsRefusal(ungranted).some((r) => r.includes("no recorded grant")),
    "embed-cleared without a grant must be refused");

  const leaky = { ...sound, permissions: { ...sound.permissions, mayStoreText: true } };
  assert.ok(rightsRefusal(leaky).some((r) => r.includes("mayStoreText")),
    "a link-only source storing text must be refused");

  const invented = { ...sound, rightsStatus: "probably-fine" };
  assert.ok(rightsRefusal(invented).length > 0, "an invented rights state must be refused");
});

// ---------------------------------------------------------------------------
// The gate itself
// ---------------------------------------------------------------------------

check("the canonical rights states are exactly the Start Prompt's three, and the default denies", () => {
  assert.deepEqual(SOURCES.rightsStates, CANONICAL_STATES);
  assert.equal(SOURCES.defaultRightsState, "blocked", "the default state must DENY, never permit");
  assert.equal(SOURCES.failClosed, true);
});

check("every source is sound against the rights rule", () => {
  const offenders = [];
  for (const s of SOURCES.sources) {
    const bad = rightsRefusal(s);
    if (bad.length) offenders.push(`${s.sourceId}: ${bad.join("; ")}`);
  }
  assert.deepEqual(offenders, [], offenders.join(" | "));
});

/**
 * Text import is authorised ONLY for sources named in `approvedSources`, and
 * ONLY when each one is genuinely embed-cleared with a recorded grant.
 *
 * Updated in place, 26 Sep 2026 (issue #306): this check used to assert flatly
 * that NO source may store text, because none ever had been approved. The
 * Owner's decision "Do b" (docs/governance/2026-09-26-owner-decisions.md, row
 * 5) approved HadeethEnc specifically, so "no source may store text" became
 * false the moment that grant was recorded -- the same class of drift this
 * file's own rightsRefusal() already guards per-source. The rule is not
 * weakened: it is now "authorisation must be NAMED, and a named source must
 * actually be sound" -- extracted into a pure function so a synthetic mutation
 * can prove it still refuses (i) a source storing text while unnamed, and
 * (ii) a named source that is not actually embed-cleared with a grant.
 * `approvedCollections`/`approvedEditions` are UNCHANGED and stay empty --
 * that pair gates a DIFFERENT mechanism (minting a commentary row's
 * `narration_occurrence_id` against an approved CLASSICAL EDITION), which no
 * source has been granted and this round does not touch.
 */
function importAuthorisationRefusal(sources, importAuthorisation) {
  const bad = [];
  const approved = Array.isArray(importAuthorisation.approvedSources) ? importAuthorisation.approvedSources : null;
  if (!approved) return ["approvedSources is not an array"];

  if (importAuthorisation.textImportAuthorisedForAnySource !== (approved.length > 0)) {
    bad.push("textImportAuthorisedForAnySource must equal (approvedSources.length > 0)");
  }
  const byId = new Map(sources.map((s) => [s.sourceId, s]));
  for (const id of approved) {
    const s = byId.get(id);
    if (!s) { bad.push(`approvedSources names unknown source "${id}"`); continue; }
    if (s.rightsStatus !== "embed-cleared" || !s.rightsEvidence?.grant) {
      bad.push(`${id} is in approvedSources but is not embed-cleared with a recorded grant`);
    }
    if (s.permissions.mayStoreText !== true) {
      bad.push(`${id} is in approvedSources but permissions.mayStoreText is not true`);
    }
  }
  for (const s of sources) {
    if (s.permissions.mayStoreText && !approved.includes(s.sourceId)) {
      bad.push(`${s.sourceId} may store text but is not named in approvedSources`);
    }
  }
  return bad;
}

check("POSITIVE CONTROL -- importAuthorisationRefusal() can actually refuse", () => {
  const granted = { sourceId: "x", rightsStatus: "embed-cleared", rightsEvidence: { grant: "t" }, permissions: { mayStoreText: true } };
  const sound = { textImportAuthorisedForAnySource: true, approvedSources: ["x"] };
  assert.deepEqual(importAuthorisationRefusal([granted], sound), [], "a genuinely granted, named source must pass");

  const unnamedStorer = { ...granted, sourceId: "y" };
  assert.ok(importAuthorisationRefusal([granted, unnamedStorer], sound)
    .some((r) => r.includes("y") && r.includes("not named")),
    "a source storing text while unnamed must be refused");

  const ungrantedButNamed = { sourceId: "z", rightsStatus: "blocked", rightsEvidence: { grant: null }, permissions: { mayStoreText: false } };
  assert.ok(importAuthorisationRefusal([ungrantedButNamed], { textImportAuthorisedForAnySource: true, approvedSources: ["z"] })
    .some((r) => r.includes("z") && r.includes("not embed-cleared")),
    "a named source that is not actually embed-cleared/granted must be refused");

  assert.ok(importAuthorisationRefusal([granted], { textImportAuthorisedForAnySource: false, approvedSources: ["x"] })
    .some((r) => r.includes("must equal")),
    "the flag and the list disagreeing must be refused");
});

check("text import is authorised only for sources named in approvedSources, each genuinely granted", () => {
  const offenders = importAuthorisationRefusal(SOURCES.sources, SOURCES.importAuthorisation);
  assert.deepEqual(offenders, [], offenders.join(" | "));
});

check("the classical-edition commentary-binding mechanism is untouched by any source-level grant", () => {
  assert.deepEqual(SOURCES.importAuthorisation.approvedCollections, []);
  assert.deepEqual(SOURCES.importAuthorisation.approvedEditions, []);
});

check("every source records what is still unknown about it", () => {
  const silent = SOURCES.sources.filter((s) => !Array.isArray(s.outstandingQuestions) || s.outstandingQuestions.length === 0);
  assert.deepEqual(silent.map((s) => s.sourceId), [],
    "a source with nothing outstanding has either been cleared or not been examined; say which");
});

check("every commentary row carries the Source Register's field names verbatim", () => {
  const offenders = [];
  for (const m of COMMENTARY.matches) {
    for (const f of REGISTER_FIELDS) {
      if (!(f in m)) offenders.push(`${m.commentary_match_id} is missing "${f}"`);
    }
  }
  assert.deepEqual(offenders, [], offenders.join(" | "));
});

check("no commentary row claims a narration occurrence while no edition is approved", () => {
  const noEditions = SOURCES.importAuthorisation.approvedEditions.length === 0;
  const bound = COMMENTARY.matches.filter((m) => m.narration_occurrence_id !== null);
  if (noEditions) {
    assert.deepEqual(bound.map((m) => m.commentary_match_id), [],
      "an occurrence id can only be minted from an APPROVED edition -- binding one now would " +
      "make a displayed number into identity, which the Master Plan forbids");
  }
  // Whatever the state, what a row IS bound to must be a real external reference.
  for (const m of COMMENTARY.matches) {
    assert.ok(m.source_reference_scheme && m.source_reference,
      `${m.commentary_match_id} must name the scheme its reference belongs to`);
  }
});

check("no commentary text has been captured while nothing is embed-cleared", () => {
  const offenders = COMMENTARY.matches.filter(
    (m) => m.rights_status !== "embed-cleared" && (m.text_hash !== null || m.content_revision !== null));
  assert.deepEqual(offenders.map((m) => m.commentary_match_id), [],
    "a text_hash or content_revision on a link-only row means text was taken");
});

check("a commentary row never outranks the source it came from", () => {
  const rank = (s) => CANONICAL_STATES.indexOf(s);
  const byId = new Map(SOURCES.sources.map((s) => [s.sourceId, s]));
  const offenders = [];
  for (const m of COMMENTARY.matches) {
    const src = byId.get(m.source_id);
    if (!src) { offenders.push(`${m.commentary_match_id} names unknown source "${m.source_id}"`); continue; }
    if (rank(m.rights_status) > rank(src.rightsStatus)) {
      offenders.push(`${m.commentary_match_id} is ${m.rights_status} but ${src.sourceId} is only ${src.rightsStatus}`);
    }
  }
  assert.deepEqual(offenders, [], offenders.join(" | "));
});

check("the two matches stay DISTINCT records, never merged into one report", () => {
  const [a, b] = COMMENTARY.matches;
  assert.notEqual(a.collection_id, b.collection_id, "the two occurrences are from different collections");
  assert.notEqual(a.author_id, b.author_id, "Ibn Hajar commented on Bukhari; al-Nawawi on Muslim");
  assert.notEqual(a.commentary_work_id, b.commentary_work_id);
  assert.equal(COMMENTARY.distinctnessRule.guardEnforced, true);
  // The register names the pairing explicitly; a swap would be a real error.
  const byCollection = Object.fromEntries(COMMENTARY.matches.map((m) => [m.collection_id, m.author_id]));
  assert.equal(byCollection.bukhari, "ibn-hajar-al-asqalani");
  assert.equal(byCollection.muslim, "al-nawawi");
});

check("the display contract never lets an explanation pass as the Hadith's own words", () => {
  const never = COMMENTARY.displayContract.neverDo.join(" ").toLowerCase();
  for (const phrase of ["ai summary", "auto-translate", "own words"]) {
    assert.ok(never.includes(phrase), `the display contract must still forbid: ${phrase}`);
  }
  assert.equal(COMMENTARY.displayContract.whileLinkOnly.includes("NO commentary text"), true,
    "while link-only, the panel renders a citation and a link -- never the text");
});

/**
 * Updated in place, 26 Sep 2026 (issue #306): this used to guard
 * `tools/hadith-data-pull/output` outright, because nothing was approved at
 * all. `approvedSources` (above) is a genuine, separate route to the SAME
 * corpus location now that HadeethEnc is granted, so the check is narrowed to
 * naming exactly which subfolder a grant makes legitimate, rather than
 * dropped: `output/hadeethenc/` may exist once "hadeethenc" is in
 * `approvedSources`; any OTHER subfolder of `output/` still requires its own
 * source's own grant, and `app/hadith-corpus` stays forbidden outright -- no
 * source's grant authorises a second, undocumented corpus location.
 */
check("no Hadith corpus subfolder exists without its own source's grant", () => {
  const approved = new Set(SOURCES.importAuthorisation.approvedSources ?? []);
  const outputDir = path.join(root, "tools", "hadith-data-pull", "output");
  const offenders = [];
  if (fs.existsSync(outputDir)) {
    for (const entry of fs.readdirSync(outputDir)) {
      if (!approved.has(entry)) offenders.push(path.join("tools", "hadith-data-pull", "output", entry));
    }
  }
  if (fs.existsSync(path.join(root, "app", "hadith-corpus"))) {
    offenders.push("app/hadith-corpus");
  }
  assert.deepEqual(offenders, [],
    `a corpus subfolder cannot legitimately exist before its OWN source is in approvedSources: ${offenders.join(", ")}`);
});

check("POSITIVE CONTROL -- an unapproved corpus subfolder would be refused", () => {
  const approved = new Set(["hadeethenc"]);
  const present = ["hadeethenc", "sunnah-com"];
  const offenders = present.filter((e) => !approved.has(e));
  assert.deepEqual(offenders, ["sunnah-com"], "an unapproved subfolder must be named as an offender");
});

check("the schema document and the manifests still agree on the vocabulary", () => {
  const schema = fs.readFileSync(path.join(gov, "hadith-reference-and-import-schema-v1.md"), "utf8");
  for (const st of CANONICAL_STATES) {
    assert.ok(schema.includes(`\`${st}\``), `the schema document no longer names the state "${st}"`);
  }
  // Tolerant of markdown emphasis around either word, strict about the claim.
  assert.ok(/default is[^.]{0,40}blocked/i.test(schema),
    "the schema document must still state that the default denies");
  assert.ok(/absence of a displayed licen[cs]e is not permission/i.test(schema),
    "the schema document must still carry the Source Register's own rights rule");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
