// STAGE-4-TASK-01 — Quran Study boundary characterisation.
//
// This is deliberately a source-contract test, not an implementation spec.
// It protects current seams before later structural work. It does not load
// Firebase, authenticate, write data, or decide the future Note/MMJ schema.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
let passed = 0;
let failed = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function containsAll(source, values) {
  return values.every((value) => source.includes(value));
}

const quranShell = read("app/quranrevival.html");
const ayahNoteRenderer = read("app/js/ayah-note-renderer.js");
const unitKeys = read("app/js/unit-keys.js");
const records = read("app/js/records.js");
const activity = read("app/js/activity.js");
const collections = read("app/js/collections.js");
const featureRegistry = read("app/js/feature-registry.js");
const activeArchitecture = read("docs/governance/ACTIVE-ARCHITECTURE.md");

console.log("\n=== QuranRevival four-pillar boundary ===");
for (const pillar of ["APPROACH", "STUDY", "EXPLORE", "MAPPING MY JOURNEY"]) {
  check(`active architecture retains ${pillar}`, activeArchitecture.includes(pillar));
}
check("Quran shell retains an Approach surface", /Approach/i.test(quranShell));
check("Quran shell retains a Study surface", /Study/i.test(quranShell));
check("Quran shell retains an Explore surface", /Explore/i.test(quranShell));
check("Quran surface retains a Mapping My Journey placeholder",
  /ayah-note-renderer\.js/.test(quranShell) && /Mapping My Journey/i.test(ayahNoteRenderer));

console.log("\n=== Approved four-pillar shell presentation ===");
const approachPillarAt = quranShell.indexOf('id="tabApproachBtn"');
const studyPillarAt = quranShell.indexOf('id="tabStudyBtn"');
const explorePillarAt = quranShell.indexOf('id="tabExploreBtn"');
const journeyPillarAt = quranShell.indexOf('id="tabJourneyBtn"');
check("top-level pillars appear in the approved order",
  approachPillarAt >= 0 && approachPillarAt < studyPillarAt &&
  studyPillarAt < explorePillarAt && explorePillarAt < journeyPillarAt);
check("Study pillar exposes an accessible selector",
  /id="tabStudyBtn"[^>]*aria-haspopup="menu"/.test(quranShell) &&
  /id="studyPillarMenu"[^>]*role="menu"[^>]*aria-labelledby="tabStudyBtn"/.test(quranShell));
for (const action of ["read", "note", "options"]) {
  check(`Study selector retains the ${action} internal seam`,
    new RegExp(`data-study-action="${action}"`).test(quranShell));
}
check("Mapping My Journey pillar is explicitly unavailable",
  /id="tabJourneyBtn"[^>]*(?:disabled|aria-disabled="true")/.test(quranShell));
check("relocated Options action remains wired to the existing panel controller",
  /querySelectorAll\(['"]#dock \[data-panel=\\?"panelStudyOptions\\?"\]['"]\)/.test(quranShell));
check("existing internal stage view identifiers remain unchanged",
  containsAll(quranShell, ['view === "read"', 'view === "note"', 'view === "explore"', 'view === "wheel"']));

console.log("\n=== Permanent Study Unit identity ===");
const namespaces = [
  "ayah", "range", "surah", "page", "ruku", "juz", "hizb", "rub",
  "manzil", "hadith", "topic", "name",
];
check("all 12 unit namespaces remain declared", containsAll(unitKeys, namespaces.map((id) => `"${id}"`)));
const keyTemplates = [
  "ayah:${surah}:${ayah}",
  "range:${surah}:${from}-${to}",
  "surah:${surah}",
  "page:${edition}:${pageNum}",
  "ruku:${surah}:${ruku}",
  "juz:${juz}",
  "hizb:${hizb}",
  "rub:${rub}",
  "manzil:${manzil}",
  "hadith:${collectionName}:${number}",
  "topic:${topicId}",
  "name:${number}",
];
check("all permanent key templates remain unchanged", containsAll(unitKeys, keyTemplates));
check("record identity remains unit plus trackable", records.includes("${unitKey}::${trackableId}"));

console.log("\n=== Approach and progress distinctions ===");
check("feature registry retains the locked 30 Approaches", /30 Approaches/.test(featureRegistry));
check("records retain claimed status", records.includes("claimedStatus"));
check("records retain frozen confirmed status", records.includes("confirmedStatus"));
check("activity does not define claimStatus", !/export\s+(async\s+)?function\s+claimStatus\b/.test(activity));
check("activity does not define confirmEntry", !/export\s+(async\s+)?function\s+confirmEntry\b/.test(activity));

console.log("\n=== Current Note boundary (descriptive, not future schema) ===");
check("current ayahNotes collection remains explicit", /AYAH_NOTES:\s*"ayahNotes"/.test(collections));
check("active architecture keeps Note Origin distinct from Note Destination",
  activeArchitecture.includes("Note Origin ≠ Note Destination"));
check("active architecture keeps MMJ distinct from a separate Notebook subsystem",
  activeArchitecture.includes("Mapping My Journey ≠ a separate Notebook subsystem"));

console.log("\n=== Protected boundaries ===");
check("active architecture protects authentication", /Authentication/.test(activeArchitecture));
check("active architecture protects Firestore architecture and Rules", /Firestore architecture\/Rules/.test(activeArchitecture));
check("active architecture preserves the Rules parity hard lock", /NOT VERIFIED — HARD LOCK/.test(activeArchitecture));

console.log(`\n==== ${passed} passed, ${failed} failed ====`);
process.exit(failed === 0 ? 0 : 1);
