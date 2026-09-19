// Hadith C2 -- the OFFLINE inventory tool, and the facts it rests on.
//
// Run from the REPOSITORY ROOT.
//
// WHY THIS EXISTS. tools/hadith-data-pull/records-key-inventory.mjs answers the
// read-only inventory C2 §5 specifies, from a file the Owner can already
// produce (backup.html). That claim rests on facts about code the Hadith stream
// does NOT own -- the backup collector's query, the exporter's markup, the
// accepted key regex -- and on the tool actually parsing what it says it parses.
// Every one of those would otherwise be prose. A parser that silently finds
// nothing reports a clean inventory of a file it could not read, which is the
// worst possible failure for a decision this feeds.
//
// IT CHANGES NOTHING. It reads the repository, parses a SYNTHETIC fixture, and
// asserts. It allocates no Approach, applies no unit key, writes nothing, and
// reaches no database.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  parseBackupHtml, parseJsonDump, inventory, splitUnit, unesc, isConfirmed, ACCEPTED_SHAPE,
  parseGaps, shareableDigest,
} from "../hadith-data-pull/records-key-inventory.mjs";

const root = path.resolve(process.argv[2] || process.cwd());
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

const FIXTURE = "tools/hadith-data-pull/synthetic-backup-sample.html";
const TOOL = "tools/hadith-data-pull/records-key-inventory.mjs";
const fixture = read(FIXTURE);
const inv = inventory(parseBackupHtml(fixture).rows);

console.log("\n=== Hadith C2 offline inventory: the tool, and the facts it rests on ===\n");

// ---------------------------------------------------------------------------
// POSITIVE CONTROLS -- a parser that finds nothing is a claim about the parser
// ---------------------------------------------------------------------------

check("POSITIVE CONTROL -- the fixture really parses, and really yields rows", () => {
  const { people, rows } = parseBackupHtml(fixture);
  assert.equal(people.length, 2, "both person sections must be found");
  assert.equal(rows.length, 11, "eleven claim rows must be found across the two people");
  assert.ok(rows.every((r) => r.person && r.chunkKey), "every row must carry its person and chunk");
});

check("POSITIVE CONTROL -- an unparseable file yields NOTHING, and that is visible", () => {
  const { people, rows } = parseBackupHtml("<html><body><p>not a backup</p></body></html>");
  assert.equal(people.length, 0);
  assert.equal(rows.length, 0);
  // and the inventory of nothing must NOT read as a clean production inventory
  assert.equal(inventory(rows).verdict.code, "NO_LEGACY_KEYS",
    "an empty parse produces the same verdict as a genuinely empty tenant -- which is exactly why the row count is printed beside it");
});

// ---------------------------------------------------------------------------
// THE FACTS THE TOOL RESTS ON, read out of the app rather than retyped
// ---------------------------------------------------------------------------

check("ACCESS -- the backup collector still reads records with NO chunk filter, so it covers every subject chunk", () => {
  // Read the QUERY, not the whole function. The body legitimately names
  // `chunkKey` on the line that DERIVES it from the document id -- a result,
  // not a filter -- and a body-wide grep called that a chunk filter. Wrong
  // assertion, not a defect; narrowed to the query expression, where a real
  // chunk filter would have to live.
  const src = read("app/js/records.js");
  const fn = src.slice(src.indexOf("export async function listAllRecordsForPerson"));
  const body = fn.slice(0, fn.indexOf("\n}"));
  const q = body.slice(body.indexOf("query("), body.indexOf(");", body.indexOf("query(")));
  const wheres = [...q.matchAll(/where\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g)].map((m) => `${m[1]} ${m[2]}`);
  assert.deepEqual(wheres, ['tenantId ==', 'personId =='],
    `the records query is no longer exactly the two equality filters: ${wheres.join(" | ") || "none found"}`);
  assert.ok(!/chunkKey|subject_|surah_|documentId|orderBy|limit\(/.test(q),
    "the query has grown a chunk, ordering or limit constraint: the export would no longer cover every chunk, and C2 §4 says it must");
  assert.ok(/d\.id\.replace/.test(body), "the chunk is no longer derived from the document id, so the parser's chunk column may be something else");
});

check("ACCESS -- collectBackup still calls it for every person, so the export is tenant-wide", () => {
  const src = read("app/js/backup.js");
  assert.ok(src.includes("listAllRecordsForPerson"), "the backup no longer reads records at all");
  assert.ok(/perPerson\.push/.test(src), "the per-person accumulation is gone");
});

check("SHAPE -- the exporter still prints the EIGHT claim columns this parser keys on", () => {
  const src = read("app/js/backup-file.js");
  const i = src.indexOf('t("Claims and confirmations")');
  assert.ok(i > 0, "the claims section is gone from the exporter");
  const block = src.slice(i, i + 900);
  for (const col of ["Unit", "Chunk", "Subject", "Approach", "Status", "Confirmed", "Claimed at", "By"]) {
    assert.ok(block.includes(`t("${col}")`), `the "${col}" column is gone -- the fixture and the parser are imitating a shape the app no longer produces`);
  }
  assert.ok(/r\.unitKey \?\? r\.entryKey/.test(block), "the Unit cell no longer falls back to the entry key, so splitUnit()'s two forms are wrong");
});

check("SHAPE -- the person block and its name span are still what the fixture imitates", () => {
  const src = read("app/js/backup-file.js");
  assert.ok(src.includes('<details class="person"'), "the person block markup changed");
  assert.ok(src.includes('<span class="sec-title">'), "the person name span changed");
  assert.ok(/<tr>\$\{r\.map\(\(c\) => `<td>\$\{c\}<\/td>`\)/.test(src), "the row/cell markup changed");
});

check("CONTRACT -- every key the fixture calls ACCEPTED is accepted by the APP's own regex", () => {
  const src = read("app/js/study-note-binding.js");
  const m = src.match(/hadith:\s*(\/\^hadith:[^/]+\/)/);
  assert.ok(m, "the accepted hadith regex could not be read out of the app");
  // eslint-disable-next-line no-new-func
  const appRe = new Function(`return ${m[1]}`)();
  for (const e of inv.entries) {
    assert.equal(e.accepted, appRe.test(e.unitKey),
      `the tool and the app disagree about ${e.unitKey} -- the tool's ACCEPTED_SHAPE has drifted from study-note-binding.js`);
  }
  assert.ok(inv.entries.some((e) => e.accepted) && inv.entries.some((e) => !e.accepted),
    "the fixture must exercise BOTH sides, or this check agrees with itself");
});

check("CONTRACT -- the LIVE builder is still name-keyed, which is why the inventory is needed at all", () => {
  const src = read("app/js/unit-keys.js");
  assert.ok(/hadith:\s*\(collectionName,\s*number\)\s*=>/.test(src),
    "buildUnitKey.hadith changed shape -- C2 may have moved, and this whole inventory is about the OLD keys");
});

// ---------------------------------------------------------------------------
// WHAT THE INVENTORY MUST SURFACE -- C2 §5 items 1..6
// ---------------------------------------------------------------------------

check("§5.2 -- only `hadith:` keys are counted; āyah, surah and topic rows are ignored", () => {
  assert.equal(inv.counts.hadithEntries, 7);
  assert.equal(inv.counts.totalRowsRead, 11);
  assert.ok(inv.entries.every((e) => e.unitKey.startsWith("hadith:")));
});

check("§5.1 -- each entry keeps its chunk, person, subject and Approach, so the record is recoverable", () => {
  const e = inv.entries[0];
  for (const f of ["unitKey", "chunkKey", "person", "subjectId", "trackableId"]) {
    assert.ok(e[f], `an entry lost its ${f}`);
  }
  assert.equal(e.trackableId, "studied_hadith");
});

check("§5.3 -- one name in two spellings is reported as ONE token and TWO keys", () => {
  const a = inv.collections.find((c) => c.folded === "synthetic-collection-a");
  assert.ok(a, "the case-variant token was not grouped at all");
  assert.equal(a.count, 3);
  assert.equal(a.spellings.length, 2, "the two spellings must both be named -- that pair IS the migration question");
});

check("§5.4 -- the ordinal range and the 6-digit bound are measured, not assumed", () => {
  assert.equal(inv.ordinals.numeric, 6);
  assert.equal(inv.ordinals.nonNumeric, 1, "a non-numeric ordinal must be reported, not dropped");
  assert.equal(inv.ordinals.min, 1);
  assert.equal(inv.ordinals.max, 12345678);
  assert.equal(inv.ordinals.overSixDigits, 2);
  // The 7-digit row is the BOUNDARY case: exactly one past the accepted bound,
  // so the app-regex comparison above can fail on a one-digit drift. Without it
  // that check agreed with itself -- found by a mutation being caught only by
  // the bounds check it was not aimed at.
  assert.ok(inv.entries.some((e) => e.ordinal === "1234567" && !e.accepted), "the one-past-the-bound case is gone");
});

check("§5.5 -- a CONFIRMED entry is surfaced, because I6 freezes it", () => {
  assert.equal(inv.confirmed.length, 1);
  assert.equal(inv.verdict.code, "CONFIRMED_PRESENT");
  assert.ok(/I6 BINDS/.test(inv.verdict.text));
});

check("§4 -- a hadith key filed OUTSIDE subject_hadith is caught; that is the whole reason for a full scan", () => {
  assert.equal(inv.outsideHadithSubject.length, 1);
  assert.equal(inv.outsideHadithSubject[0].chunkKey, "subject_deen");
});

check("§5.6 -- persons, chunks, subjects and Approaches are counted distinctly", () => {
  assert.deepEqual(
    [inv.counts.distinctPersons, inv.counts.distinctChunks, inv.counts.distinctSubjects, inv.counts.distinctTrackables],
    [2, 2, 2, 2]);
});

// ---------------------------------------------------------------------------
// THE THREE VERDICTS, each reachable
// ---------------------------------------------------------------------------

check("VERDICT -- an export with no hadith keys reports NO_LEGACY_KEYS, the cheapest outcome", () => {
  const rows = parseBackupHtml(fixture).rows.filter((r) => !r.unit.startsWith("hadith:"));
  assert.equal(inventory(rows).verdict.code, "NO_LEGACY_KEYS");
});

check("VERDICT -- hadith keys with none confirmed reports LEGACY_KEYS_PRESENT", () => {
  const rows = parseBackupHtml(fixture).rows.map((r) => ({ ...r, confirmState: "—" }));
  const v = inventory(rows).verdict;
  assert.equal(v.code, "LEGACY_KEYS_PRESENT");
  assert.ok(/never rewritten \(I4\)/.test(v.text));
});

check("VERDICT -- the tool proposes no action in any of the three; it names a consequence", () => {
  const src = read(TOOL);
  const i = src.indexOf("export function verdictFor");
  const body = src.slice(i, src.indexOf("\n}", i));
  assert.ok(!/\bmigrate\(|\bwrite|\bupdateDoc|\bdelete/.test(body), "the verdict function has grown an action");
  assert.ok(src.includes("This tool DECIDES NOTHING"), "the tool stopped saying it decides nothing");
});

// ---------------------------------------------------------------------------
// LANGUAGE INDEPENDENCE -- the export is translated; the parser must not be
// ---------------------------------------------------------------------------

check("A BANGLA export parses identically -- the parser keys on SHAPE, never on English words", () => {
  const bn = fixture
    .replace(/Claims and confirmations/g, "দাবি ও নিশ্চিতকরণ")
    .replace(/<th>Unit<\/th>/g, "<th>একক</th>")
    .replace(/<th>Chunk<\/th>/g, "<th>খণ্ড</th>")
    .replace(/<td>Confirmed<\/td>/g, "<td>নিশ্চিত</td>")
    .replace(/<td>Studied<\/td>/g, "<td>অধ্যয়ন করা হয়েছে</td>");
  const bnInv = inventory(parseBackupHtml(bn).rows);
  assert.equal(bnInv.counts.hadithEntries, inv.counts.hadithEntries);
  assert.equal(bnInv.confirmed.length, inv.confirmed.length,
    "a translated confirmation state was missed -- isConfirmed() must not key on the English word");
  assert.equal(bnInv.verdict.code, inv.verdict.code);
});

check("I6, the safe direction -- an UNRECOGNISED confirmation word counts as confirmed, never as absent", () => {
  assert.equal(isConfirmed("নিশ্চিত"), true);
  assert.equal(isConfirmed("—"), false);
  assert.equal(isConfirmed(""), false);
  assert.equal(isConfirmed("pending"), false);
});

// ---------------------------------------------------------------------------
// THE TOOL'S OWN BOUNDARIES
// ---------------------------------------------------------------------------

check("BOUNDARY -- the tool imports NOTHING, so it cannot become a consumer of what it measures", () => {
  const src = read(TOOL);
  const imports = [...src.matchAll(/^\s*import\s.*$/gm)].map((m) => m[0]);
  assert.deepEqual(imports, [], `the tool has acquired a static import: ${imports.join(" | ")}`);
  assert.ok(!/from ["']\.\.\/\.\.\/app\//.test(src), "the tool reaches into app/");
});

check("BOUNDARY -- the tool reaches no database and writes nothing", () => {
  const src = read(TOOL).replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  for (const forbidden of ["firebasejs", "firestore", "getDocs", "setDoc", "updateDoc", "writeFileSync", "runTransaction"]) {
    assert.ok(!src.includes(forbidden), `the tool names ${forbidden} -- it is a read-only offline analyser`);
  }
});

check("BOUNDARY -- the fixture is SYNTHETIC throughout, and says so", () => {
  assert.ok(/SYNTHETIC FIXTURE/.test(fixture), "the fixture no longer declares itself invented");
  const tokens = [...fixture.matchAll(/hadith:([A-Za-z0-9_-]+):/g)].map((m) => m[1].toLowerCase());
  assert.ok(tokens.length >= 5, "the fixture stopped carrying hadith keys");
  const outside = [...new Set(tokens)].filter((t) => !t.startsWith("synthetic-"));
  assert.deepEqual(outside, [], `a collection token outside the synthetic namespace appeared: ${outside.join(", ")}`);
  assert.ok(!/bukhari|muslim|tirmidhi|abudawud|nasai|ibnmajah/i.test(fixture),
    "a real collection name appeared in the fixture; a fixture must never be mistakable for real data");
});

check("BOUNDARY -- no Approach id is allocated, and the fixture uses only the EXISTING generic row", () => {
  const src = read(TOOL);
  assert.ok(!/approach_(?!0[1-9]|[12]\d|30)\w+/.test(src + fixture), "a new Approach id appeared");
  const trackables = [...new Set(inv.entries.map((e) => e.trackableId))];
  assert.ok(trackables.every((t) => t === "studied_hadith" || t === "studied_deen"),
    `the fixture claims against something other than the existing generic rows: ${trackables.join(", ")}`);
});

// ---------------------------------------------------------------------------
// SMALL PIECES
// ---------------------------------------------------------------------------

check("splitUnit handles both printed forms -- entry key and bare unit key", () => {
  assert.deepEqual(splitUnit("hadith:x:1::studied_hadith"), { unitKey: "hadith:x:1", trackableFromKey: "studied_hadith" });
  assert.deepEqual(splitUnit("hadith:x:1"), { unitKey: "hadith:x:1", trackableFromKey: null });
});

check("unesc reverses the exporter's five entities, ampersand last", () => {
  assert.equal(unesc("&amp;lt;"), "&lt;", "&amp; must be decoded LAST or an escaped entity is double-decoded");
  assert.equal(unesc("a &amp; b &quot;c&quot; &#39;d&#39; &lt;e&gt;"), `a & b "c" 'd' <e>`);
});

check("a raw JSON dump is accepted too, with the same inventory", () => {
  const dump = JSON.stringify({ tenantId: "synthetic-tenant-1", records: [
    { chunkKey: "subject_hadith", entryKey: "hadith:synthetic-collection-a:1::studied_hadith", personId: "p1", subjectId: "hadith", trackableId: "studied_hadith", confirmState: "pending" },
    { chunkKey: "subject_hadith", entryKey: "hadith:synthetic-collection-a:2::studied_hadith", personId: "p1", subjectId: "hadith", trackableId: "studied_hadith", confirmState: "confirmed" },
  ]});
  const jInv = inventory(parseJsonDump(dump).rows);
  assert.equal(jInv.counts.hadithEntries, 2);
  assert.equal(jInv.confirmed.length, 1);
  assert.equal(jInv.verdict.code, "CONFIRMED_PRESENT");
});

check("ACCEPTED_SHAPE bounds are exact -- 6 digits in, 7 out, empty segments out", () => {
  assert.ok(ACCEPTED_SHAPE.test("hadith:x:999999"));
  assert.ok(!ACCEPTED_SHAPE.test("hadith:x:1234567"));
  assert.ok(!ACCEPTED_SHAPE.test("hadith::1"));
  assert.ok(!ACCEPTED_SHAPE.test("hadith:x:"));
});

// ---------------------------------------------------------------------------
// COVERAGE -- a refused read prints as EMPTY, not as missing
// ---------------------------------------------------------------------------

/** The export's own refusal block, as buildBackupHtml() emits it. */
const WARN = `<div class="warn"><b>Not everything could be read into this file.</b> That is usually correct rather than a fault.
  <ul><li>Records for Synthetic Person Three — You do not have permission to read this.</li><li>Activity for Synthetic Person Three — You do not have permission to read this.</li></ul></div>`;

check("COVERAGE -- the exporter still PRINTS what it could not read, which is what makes a gap auditable", () => {
  const src = read("app/js/backup-file.js");
  assert.ok(/data\.couldNotRead/.test(src), "the export no longer prints its refusals; a gap would be invisible in the file");
  assert.ok(/class="warn"/.test(src), "the refusal block's class changed, and parseGaps() keys on it");
  const collector = read("app/js/backup.js");
  assert.ok(/couldNotRead: notes/.test(collector), "collectBackup no longer returns the refusal list");
  assert.ok(/scope: canAdmin \? "tenant" : "account"/.test(collector),
    "the export's scope rule changed -- an owner/prime export is what makes this inventory tenant-wide");
});

check("COVERAGE -- refusals are parsed out of the file, label and reason", () => {
  const gaps = parseGaps(WARN);
  assert.equal(gaps.length, 2);
  assert.equal(gaps[0].label, "Records for Synthetic Person Three");
  assert.ok(/permission/.test(gaps[0].reason));
  assert.deepEqual(parseGaps("<html>no warnings here</html>"), []);
});

check("COVERAGE -- a refused read DOWNGRADES a clean verdict, because empty and refused look identical", () => {
  const noHadith = parseBackupHtml(fixture).rows.filter((r) => !r.unit.startsWith("hadith:"));
  assert.equal(inventory(noHadith, []).verdict.code, "NO_LEGACY_KEYS");
  const withGap = inventory(noHadith, parseGaps(WARN));
  assert.equal(withGap.verdict.code, "NO_LEGACY_KEYS_BUT_INCOMPLETE",
    "a file with refused reads must not be allowed to support a 'no legacy keys' conclusion");
  assert.ok(/REFUSED/.test(withGap.verdict.text));
});

check("COVERAGE -- the fixture itself has no refusals, so the clean verdict it produces is honest", () => {
  assert.deepEqual(parseGaps(fixture), []);
  assert.equal(inv.gaps.length, 0);
});

// ---------------------------------------------------------------------------
// THE SHAREABLE DIGEST -- counts and spellings, nothing personal
// ---------------------------------------------------------------------------

check("DIGEST -- it answers C2: counts, spelling variants, ordinals, verdict", () => {
  const d = shareableDigest(inv);
  assert.equal(d.hadithEntries, 7);
  assert.equal(d.collectionTokens.find((c) => c.folded === "synthetic-collection-a").variantSpellings, 2,
    "the spelling variance is the decision, and it must survive into the shareable form");
  assert.equal(d.confirmedEntries, 1);
  assert.equal(d.verdict.code, "CONFIRMED_PRESENT");
  assert.deepEqual(d.chunksSeen, ["subject_deen", "subject_hadith"]);
});

check("DIGEST -- NO person name survives, from the fixture or anywhere", () => {
  const text = JSON.stringify(shareableDigest(inv));
  for (const name of ["Synthetic Person One", "Synthetic Person Two", "Person One", "Person Two"]) {
    assert.ok(!text.includes(name), `the digest leaks a person name: ${name}`);
  }
  // and prove the control: those names ARE in the source data, so the absence means something
  assert.ok(fixture.includes("Synthetic Person One"), "the fixture stopped carrying person names, so the check above proves nothing");
  assert.ok(inv.entries.some((e) => e.person === "Synthetic Person One"), "the inventory stopped carrying the person, so the digest's omission is vacuous");
});

check("DIGEST -- no timestamp, no claimedBy, and no per-entry row", () => {
  const d = shareableDigest(inv);
  const text = JSON.stringify(d);
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(text), "the digest leaks a claim date");
  for (const by of ["p1", "p2"]) {
    assert.ok(!new RegExp(`"${by}"`).test(text), `the digest leaks a claimedBy person id: ${by}`);
  }
  assert.equal(d.entries, undefined, "per-entry rows are carried: a row pairs a narration with the person it was printed under");
  assert.equal(d.confirmed, undefined, "the confirmed ROWS are carried; I6 needs the count, not the rows");
  assert.ok(!text.includes("::"), "an entry key survived into the digest");
  // the controls: all of those ARE present in the full inventory
  assert.ok(inv.entries.length && inv.confirmed.length && inv.entries[0].claimedAt,
    "the full inventory no longer carries what the digest is supposed to be dropping");
});

check("DIGEST -- it says what it omitted, rather than looking complete", () => {
  const d = shareableDigest(inv);
  assert.ok(/person names/.test(d.omitted) && /rows/.test(d.omitted));
  assert.equal(typeof d.readsRefused, "number", "a digest that hides the refusal count could be read as complete when it is not");
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
