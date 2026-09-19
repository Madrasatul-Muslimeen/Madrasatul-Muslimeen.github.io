// Hadith S5 -- the commentary DISPLAY CONTRACT and the H1 RIGHTS VOCABULARY,
// pinned against the documents that govern them.
//
// Run from the REPOSITORY ROOT.
//
// WHY THIS EXISTS. Both contracts are already asserted, but against LITERALS
// RETYPED INTO THE SUITE rather than against their governing documents:
// `hadith-commentary-binding.mjs` retypes the Arabic panel title and four
// lowercase fragments of the prohibitions, and `hadith-source-rights.mjs`
// retypes the three rights states. A retyped copy agrees with itself while the
// document moves underneath it -- the drift this project has already recorded
// for `noteSources` (ADR-009) and closed by reading the vocabulary out of the
// document at both ends.
//
// Three parts of the governing documents were bound to NOTHING at all:
//   - `displayContract` in the commentary manifest -- its panel titles, its
//     per-entry fields, its link-only and embed-cleared rules, its Arabic type
//     scale, and its `neverDo` list;
//   - `rightsStateMeanings` in the source manifest -- the precise permissions
//     each of the three states grants, which `renderPermission()` implements;
//   - `vocabularyReconciliation` -- the RETIRED term `licensed`, which must
//     never reappear as a rights state.
//
// This suite reads each document and asserts the code honours it. It changes
// nothing, proposes nothing, and touches no shared file.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { PANEL_TITLE, NEVER_DO, renderPermission, verifiedRegisterEntries } from "../../app/js/hadith-commentary.js";

const root = path.resolve(process.argv[2] || process.cwd());
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));
const COMMENTARY = json("docs/governance/hadith-commentary-manifest-2026-09-18.json");
const SOURCES = json("docs/governance/hadith-source-manifest-2026-09-18.json");
const DC = COMMENTARY.displayContract;

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

console.log("\n=== Hadith: code against its governing documents ===\n");

check("POSITIVE CONTROL -- both governing documents really loaded and carry the sections bound below", () => {
  assert.ok(DC && typeof DC === "object", "the commentary manifest has no displayContract");
  for (const k of ["panelTitleEn", "panelTitleAr", "perEntryFields", "neverDo", "whileLinkOnly", "whenEmbedCleared", "arabicTypeScale"]) {
    assert.ok(k in DC, `displayContract is missing ${k} -- this suite would assert nothing about it`);
  }
  assert.ok(SOURCES.rightsStateMeanings, "the source manifest has no rightsStateMeanings");
  assert.equal(Object.keys(SOURCES.rightsStateMeanings).length, 3, "the rights vocabulary is no longer three states");
  assert.ok(SOURCES.vocabularyReconciliation?.mapping, "the vocabulary reconciliation is gone");
});

// ---------------------------------------------------------------------------
// The commentary DISPLAY CONTRACT
// ---------------------------------------------------------------------------

check("DISPLAY -- the panel titles are the document's own, not a retyped copy", () => {
  // Read from the manifest. The existing suite retypes the Arabic string; if
  // the register ever revised it, that check would keep passing against a
  // title the document no longer uses.
  assert.equal(PANEL_TITLE.en, DC.panelTitleEn, `panel title (en) drifted from the register`);
  assert.equal(PANEL_TITLE.ar, DC.panelTitleAr, `panel title (ar) drifted from the register`);
  // Bangla is the app's own addition -- the register names no Bangla title --
  // so it is asserted as PRESENT, never as equal to a document value.
  assert.ok(PANEL_TITLE.bn && PANEL_TITLE.bn.trim(), "the Bangla panel title is missing");
  assert.notEqual(PANEL_TITLE.bn, DC.panelTitleEn, "the Bangla title is just the English one");
});

check("DISPLAY -- every prohibition the document states is carried in code VERBATIM", () => {
  // Verbatim, not by lowercase fragment. A fragment match would accept a
  // prohibition that had been softened around the words it happens to contain.
  for (const rule of DC.neverDo) {
    assert.ok(NEVER_DO.includes(rule), `the register forbids "${rule}" and the code does not carry it verbatim`);
  }
});

check("DISPLAY -- code may be STRICTER than the document, never looser, and the extra is named", () => {
  // The module carries one prohibition the register does not: attaching a
  // verified match to a synthetic narration, added by H2. That is a tightening
  // and is allowed; a REPLACEMENT would not be. This asserts the direction.
  const extras = NEVER_DO.filter((r) => !DC.neverDo.includes(r));
  assert.ok(NEVER_DO.length >= DC.neverDo.length, "the code carries fewer prohibitions than the document");
  for (const e of extras) {
    assert.ok(/synthetic/i.test(e), `an unrecorded prohibition appeared in code: "${e}" -- a tightening must be traceable`);
  }
  assert.equal(extras.length, 1, `expected exactly the one recorded H2 tightening, found ${extras.length}`);
});

check("DISPLAY -- every per-entry field the document requires exists on every verified entry", () => {
  const entries = verifiedRegisterEntries();
  assert.ok(entries.length > 0, "no verified entries -- this check would pass vacuously");
  for (const e of entries) {
    for (const f of DC.perEntryFields) {
      assert.ok(f in e, `entry ${e.commentary_match_id} is missing the required display field ${f}`);
      assert.ok(e[f] !== null && String(e[f]).trim() !== "", `entry ${e.commentary_match_id} has an empty ${f}`);
    }
  }
});

check("DISPLAY -- 'while link-only: render NO commentary text' is what renderPermission actually does", () => {
  // The document states the rule in prose. This asserts the function obeys it.
  assert.match(DC.whileLinkOnly, /no commentary text/i, "the document's link-only rule no longer says what this check assumes");
  const p = renderPermission({ rights_status: "link-only" });
  assert.equal(p.mayShowText, false, "link-only permits text");
  assert.equal(p.mayLinkOut, true, "link-only refuses the outbound link the document grants");
  assert.equal(p.mayShowCitation, true, "link-only refuses the attributed citation the document grants");
});

check("DISPLAY -- 'when embed-cleared: render the text' is also what it does", () => {
  assert.match(DC.whenEmbedCleared, /render the arabic commentary/i, "the document's embed-cleared rule changed");
  const p = renderPermission({ rights_status: "embed-cleared" });
  assert.equal(p.mayShowText, true, "embed-cleared still refuses text");
  assert.equal(p.mayLinkOut, true);
});

check("DISPLAY -- the Arabic type scale the document claims is real in the stylesheet", () => {
  // "Arabic renders at about twice the English text size." Asserted against the
  // Hadith-owned stylesheet rather than taken on trust; em units make the
  // multiple readable directly.
  assert.match(DC.arabicTypeScale, /twice/i, "the document no longer claims a 2x Arabic scale");
  const css = read("app/css/hadith.css");
  const sizes = [...css.matchAll(/\.hadith-(?:arabic|panel-title-ar|work-ar)\s*\{[^}]*font-size:\s*([\d.]+)em/g)].map((m) => Number(m[1]));
  assert.ok(sizes.length >= 3, `expected the three Arabic rules to carry an em font-size, found ${sizes.length}`);
  for (const s of sizes) {
    assert.ok(s >= 1.5, `an Arabic rule renders at ${s}em -- the document claims about twice the English size`);
  }
});

// ---------------------------------------------------------------------------
// The H1 RIGHTS VOCABULARY
// ---------------------------------------------------------------------------

check("RIGHTS -- the three states are the document's, read from it rather than retyped", () => {
  const stated = Object.keys(SOURCES.rightsStateMeanings);
  assert.deepEqual([...SOURCES.rightsStates].sort(), [...stated].sort(),
    "rightsStates and rightsStateMeanings name different vocabularies");
  assert.ok(stated.includes(SOURCES.defaultRightsState), "the default state is not one of the stated three");
  assert.equal(SOURCES.defaultRightsState, "blocked", "the default no longer denies");
});

check("RIGHTS -- 'blocked' means every permission is false, including the link", () => {
  // The document is explicit: "the app may not fetch, link to or reference this
  // source on any user-facing surface. Every permission flag is false."
  assert.match(SOURCES.rightsStateMeanings.blocked, /may not .*link/i, "the blocked meaning changed");
  const p = renderPermission({ rights_status: "blocked" });
  assert.equal(p.mayShowText, false, "blocked permits text");
  assert.equal(p.mayLinkOut, false, "blocked permits an outbound link");
  assert.ok(p.reason, "blocked gives no reason for the refusal (I15: a refusal must be legible)");
});

check("RIGHTS -- 'link-only' permits the link and the citation, and refuses the text", () => {
  const m = SOURCES.rightsStateMeanings["link-only"];
  assert.match(m, /outbound link/i);
  assert.match(m, /NOT store, display, cache or index/i, "the link-only meaning changed");
  const p = renderPermission({ rights_status: "link-only" });
  assert.deepEqual({ text: p.mayShowText, link: p.mayLinkOut, cite: p.mayShowCitation }, { text: false, link: true, cite: true });
});

check("RIGHTS -- an UNKNOWN or missing state is refused exactly as 'blocked' is (fail closed)", () => {
  // The default is `blocked`, so anything unrecognised must deny. This is the
  // fail-closed rule the whole H1 tranche rests on.
  for (const bad of [undefined, null, "", "licensed", "unknown", "LINK-ONLY"]) {
    const p = renderPermission(bad === undefined ? undefined : { rights_status: bad });
    assert.equal(p.mayShowText, false, `rights_status ${JSON.stringify(bad)} permits text`);
    assert.equal(p.mayLinkOut, false, `rights_status ${JSON.stringify(bad)} permits an outbound link`);
  }
});

check("RIGHTS -- the RETIRED term 'licensed' never reappears as a state in Hadith code", () => {
  // vocabularyReconciliation maps `licensed` -> `embed-cleared` and explains
  // why the verb is the safer name. The retired term must not creep back.
  assert.equal(SOURCES.vocabularyReconciliation.mapping.licensed, "embed-cleared", "the reconciliation mapping changed");
  assert.ok(!SOURCES.rightsStates.includes("licensed"), "the retired term is back in the canonical states");
  for (const f of fs.readdirSync(path.join(root, "app", "js")).filter((n) => /^hadith-.*\.js$/.test(n))) {
    const src = fs.readFileSync(path.join(root, "app", "js", f), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    assert.ok(!/["'`]licensed["'`]/.test(code), `app/js/${f} uses the retired rights term "licensed"`);
  }
});

check("RIGHTS -- no source is cleared, so the whole display contract is still exercised at link-only", () => {
  // The document's embed-cleared branch is unreachable today, and saying so is
  // the honest state rather than implying the app has been proven against it.
  assert.equal(SOURCES.importAuthorisation.textImportAuthorisedForAnySource, false);
  assert.deepEqual(SOURCES.importAuthorisation.approvedEditions, []);
  const cleared = (SOURCES.sources || []).filter((s) => s.rightsStatus === "embed-cleared");
  assert.deepEqual(cleared, [], `a source is embed-cleared: ${cleared.map((s) => s.sourceId).join(", ")}`);
  for (const e of verifiedRegisterEntries()) {
    assert.equal(e.rights_status, "link-only", `entry ${e.commentary_match_id} is not link-only`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
