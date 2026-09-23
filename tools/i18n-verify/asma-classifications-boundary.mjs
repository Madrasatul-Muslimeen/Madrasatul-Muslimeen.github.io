// Issue #202 -- Asma ul Husna: open, owner-defined classifications.
//
// The pure data-layer additions in app/js/asma-collections.js (open `kind`,
// the classifications registry CRUD, membershipsOfName()) can't be imported
// directly under plain Node -- the file also imports the real Firestore SDK
// by URL and js/envelope.js, both of which only resolve in a browser. This
// suite uses the same technique quran-word-progress-data.mjs and
// study-event-wiring.mjs established: load the REAL app/js/asma-
// collections.js source as a `data:` module with its Firestore-touching
// imports rewritten to injected globals, so the file under test is the file
// that ships, not a re-implementation of it. Every OTHER import
// (collections.js, asma-collections-data.js, asma-data.js, unit-keys.js) is
// pure and imported for real, both here and inside the rewritten module, so
// the fixtures below (DEFAULT_ASMA_CLASSIFICATIONS, buildUnitKey) are the
// app's own, not copies.
//
// Also covers, by reading app/quranrevival.html's own source rather than a
// browser (no Playwright browser binary is installed in this sandbox -- see
// this round's own PR note): that the old fixed two-select level bar is
// genuinely gone, and that the level bar/manage actions read the live
// classifications registry rather than being hardcoded to "group"/"dual".

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { TENANT } from "../../app/js/collections.js";
import { buildUnitKey } from "../../app/js/unit-keys.js";
import {
  DEFAULT_ASMA_CLASSIFICATIONS, DEFAULT_ASMA_COLLECTIONS,
} from "../../app/js/asma-collections-data.js";

const root = path.resolve(process.argv[2] || process.cwd());
const appJs = path.join(root, "app", "js");

let passed = 0, failed = 0;
function check(name, fn) {
  // A synchronous runner counts an `async` body as a pass -- see this
  // repository's own standing lesson. Refuse it rather than silently
  // trusting an unawaited assertion.
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

// ---------------------------------------------------------------------------
// Load the real module, Firestore-touching imports rewritten to injected
// globals -- an unrewritten relative specifier inside a `data:` module
// throws ERR_INVALID_URL at load, before a single check runs, so assert
// every import was actually rewritten first (this repo's own "a suite that
// dies at import is not a failing suite, it is an absent one" lesson).
// ---------------------------------------------------------------------------
let source = fs.readFileSync(path.join(appJs, "asma-collections.js"), "utf8");
source = source
  .replace(
    /import \{ doc, getDoc \} from "https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/,
    `const { doc, getDoc } = globalThis.__acFirestore;`
  )
  .replace(
    /import \{ TENANT \} from "\.\/collections\.js";/,
    `const { TENANT } = globalThis.__acCollections;`
  )
  .replace(
    /import \{ createDocument, updateDocument \} from "\.\/envelope\.js";/,
    `const { createDocument, updateDocument } = globalThis.__acEnvelope;`
  )
  .replace(
    /import \{ DEFAULT_ASMA_COLLECTIONS, DEFAULT_EXTRA_ASMA_NAMES, DEFAULT_WEAK_CANONICAL_NUMBERS, DEFAULT_CANONICAL_REFS, DEFAULT_ASMA_CLASSIFICATIONS \} from "\.\/asma-collections-data\.js";/,
    `const { DEFAULT_ASMA_COLLECTIONS, DEFAULT_EXTRA_ASMA_NAMES, DEFAULT_WEAK_CANONICAL_NUMBERS, DEFAULT_CANONICAL_REFS, DEFAULT_ASMA_CLASSIFICATIONS } = globalThis.__acData;`
  )
  .replace(
    /import \{ getAsmaName \} from "\.\/asma-data\.js";/,
    `const { getAsmaName } = globalThis.__acAsmaData;`
  )
  .replace(
    /import \{ buildUnitKey \} from "\.\/unit-keys\.js";/,
    `const { buildUnitKey } = globalThis.__acUnitKeys;`
  );

for (const leftover of [/from "\.\//, /gstatic\.com/, /^\s*import\s/m]) {
  assert.ok(!leftover.test(source), `an import was not rewritten: ${leftover} -- add it above, or this suite runs nothing`);
}

const acData = await import("../../app/js/asma-collections-data.js");
const acAsmaData = await import("../../app/js/asma-data.js");
const acUnitKeys = await import("../../app/js/unit-keys.js");
const acCollectionsMod = await import("../../app/js/collections.js");

globalThis.__acFirestore = { doc: () => ({}), getDoc: async () => ({ exists: () => false }) };
globalThis.__acCollections = { TENANT: acCollectionsMod.TENANT };
globalThis.__acEnvelope = { createDocument: async () => {}, updateDocument: async () => {} };
globalThis.__acData = acData;
globalThis.__acAsmaData = acAsmaData;
globalThis.__acUnitKeys = acUnitKeys;

const mod = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const {
  collectionsFrom, classificationsFrom, extraNamesFrom,
  activeCollections, activeClassifications,
  addCollection, addClassification, renameClassification, setClassificationStatus,
  nextClassificationOrder, addItem, membershipsOfName, resolveAsmaEntry,
} = mod;

// --- 1. `kind` is genuinely open, not coerced back to two values ----------

check("a collection with a brand-new kind keeps it verbatim", () => {
  const collections = addCollection([], { title: { en: "Unique to Allah" }, kind: "attr-unique" });
  assert.equal(collections[0].kind, "attr-unique");
});

check("a collection with no kind at all defaults to \"group\" (backward compatible)", () => {
  const collections = addCollection([], { title: { en: "No kind given" } });
  assert.equal(collections[0].kind, "group");
});

check("every collection saved before this round -- \"group\"/\"dual\"/absent -- reads exactly as before", () => {
  const stored = [
    { id: "a", title: { en: "A" }, order: 10, status: "active", items: [], kind: "group" },
    { id: "b", title: { en: "B" }, order: 20, status: "active", items: [], kind: "dual" },
    { id: "c", title: { en: "C" }, order: 30, status: "active", items: [] }, // no kind at all
  ];
  const normalized = collectionsFrom({ collections: stored });
  assert.deepEqual(normalized.map((c) => c.kind), ["group", "dual", "group"]);
});

check("a blank/whitespace-only kind also falls back to \"group\"", () => {
  const normalized = collectionsFrom({ collections: [{ id: "a", title: { en: "A" }, order: 10, status: "active", items: [], kind: "   " }] });
  assert.equal(normalized[0].kind, "group");
});

check("the real seed data (19 groups) is unaffected -- every seeded collection is still kind \"group\"", () => {
  const normalized = collectionsFrom(null);
  assert.equal(normalized.length, DEFAULT_ASMA_COLLECTIONS.length);
  assert.ok(normalized.every((c) => c.kind === "group"));
});

// --- 2. classifications CRUD round-trips ------------------------------------

check("a brand-new tenant sees exactly the two seeded classifications", () => {
  const classifications = classificationsFrom(null);
  assert.deepEqual(classifications.map((c) => c.key), ["group", "dual"]);
  assert.equal(classifications[0].title.en, "Group");
  assert.equal(classifications[1].title.en, "Dual Names");
});

check("addClassification appends, assigns a key and the next order", () => {
  const seeded = classificationsFrom(null);
  const next = addClassification(seeded, { title: { en: "Unique to Allah" } });
  assert.equal(next.length, 3);
  const added = next[2];
  assert.ok(added.key && added.key !== "group" && added.key !== "dual");
  assert.equal(added.order, 30); // nextClassificationOrder: 20 (dual) + 10
  assert.equal(added.status, "active");
  assert.equal(added.title.en, "Unique to Allah");
});

check("addClassification honours a caller-supplied key rather than always minting one", () => {
  const next = addClassification([], { key: "by-essence", title: { en: "By Essence" } });
  assert.equal(next[0].key, "by-essence");
});

check("renameClassification changes only the named entry's title", () => {
  let classifications = classificationsFrom(null);
  classifications = renameClassification(classifications, "group", { en: "Everyday Group" });
  assert.equal(classifications[0].title.en, "Everyday Group");
  assert.equal(classifications[1].title.en, "Dual Names"); // untouched
});

check("setClassificationStatus archives, and restores, by key -- I4, never a delete", () => {
  let classifications = classificationsFrom(null);
  classifications = setClassificationStatus(classifications, "dual", "archived");
  assert.equal(classifications.find((c) => c.key === "dual").status, "archived");
  assert.equal(classifications.length, 2, "archiving removed the entry instead of flipping its status");
  classifications = setClassificationStatus(classifications, "dual", "active");
  assert.equal(classifications.find((c) => c.key === "dual").status, "active");
});

check("activeClassifications excludes archived and sorts by order", () => {
  let classifications = addClassification(classificationsFrom(null), { title: { en: "Third" } });
  const thirdKey = classifications[2].key;
  classifications = setClassificationStatus(classifications, "dual", "archived");
  const active = activeClassifications(classifications);
  assert.deepEqual(active.map((c) => c.key), ["group", thirdKey]);
});

check("nextClassificationOrder is derived from the highest existing order, never hardcoded", () => {
  const classifications = [
    { key: "a", title: { en: "A" }, order: 5, status: "active" },
    { key: "b", title: { en: "B" }, order: 47, status: "active" },
  ];
  assert.equal(nextClassificationOrder(classifications), 57);
});

// --- 3. membershipsOfName() ---------------------------------------------

function collWithItems(id, kind, items) {
  return { id, title: { en: id }, badge: "", order: 10, status: "active", items, kind };
}

check("a Name in 3+ lists across different classifications AND the same classification is found in all of them", () => {
  const collections = [
    collWithItems("everyday", "group", ["name:1"]),
    collWithItems("also-everyday", "group", ["name:1"]),
    collWithItems("unique", "attr-unique", ["name:1"]),
    collWithItems("unrelated", "group", ["name:2"]),
  ];
  const memberships = membershipsOfName(collections, 1);
  assert.equal(memberships.length, 3);
  assert.deepEqual(memberships.map((m) => m.collectionId).sort(), ["also-everyday", "everyday", "unique"]);
  assert.deepEqual(new Map(memberships.map((m) => [m.collectionId, m.kind])), new Map([
    ["everyday", "group"], ["also-everyday", "group"], ["unique", "attr-unique"],
  ]));
});

check("a Name in no lists at all returns an empty array, not null/undefined", () => {
  const memberships = membershipsOfName([collWithItems("x", "group", ["name:5"])], 6);
  assert.deepEqual(memberships, []);
});

check("membershipsOfName reads the exact permanent unit key buildUnitKey.name() produces (I5)", () => {
  const collections = [collWithItems("x", "group", [buildUnitKey.name(42)])];
  assert.equal(membershipsOfName(collections, 42).length, 1);
  assert.equal(membershipsOfName(collections, 43).length, 0);
});

// --- 4. archiving a classification never drops a membership record (I4) ---

check("an archived classification's own collection keeps every membership -- I4, archive never deletes", () => {
  let classifications = addClassification(classificationsFrom(null), { key: "attr-unique", title: { en: "Unique to Allah" } });
  const collections = [collWithItems("uniqueNames", "attr-unique", ["name:1"])];
  // Archiving the CLASSIFICATION (not the collection) -- the collection's
  // own status, and everything filed in it, is untouched.
  classifications = setClassificationStatus(classifications, "attr-unique", "archived");
  assert.equal(membershipsOfName(collections, 1).length, 1, "a membership vanished when its classification was archived");
  assert.equal(collections[0].status, "active", "archiving the classification silently archived the collection too");
  // The classification itself is still resolvable (not gone), just excluded
  // from the active/browsable set -- classificationsFrom's own full list,
  // not activeClassifications, is what a "Belongs to"/"also in…" label
  // lookup must use.
  assert.ok(classifications.find((c) => c.key === "attr-unique"), "the archived classification disappeared from the registry entirely");
  assert.deepEqual(activeClassifications(classifications).map((c) => c.key).includes("attr-unique"), false);
});

check("archiving a COLLECTION (not its classification) keeps its own membership records too", () => {
  let collections = [collWithItems("x", "group", ["name:1"])];
  collections = collections.map((c) => (c.id === "x" ? { ...c, status: "archived" } : c));
  assert.equal(membershipsOfName(collections, 1).length, 1);
});

// --- 5. the wheel/list navigation reaches every ACTIVE classification, not
//        just the two seeded ones -- a positive control on a THIRD,
//        freshly-added classification, at both the data layer and (by
//        reading the real source, since no browser is available in this
//        sandbox -- see this round's own PR note) the page's own wiring.
// ---------------------------------------------------------------------------

check("POSITIVE CONTROL: a freshly-added third classification's own collections are reachable exactly like the seeded two", () => {
  let classifications = addClassification(classificationsFrom(null), { key: "by-act-essence", title: { en: "By Act / By Essence" } });
  let collections = addCollection(DEFAULT_ASMA_COLLECTIONS.map((c) => ({ ...c })), { title: { en: "By Act" }, kind: "by-act-essence" });
  const third = collections.find((c) => c.kind === "by-act-essence");
  assert.ok(third, "the new classification's own collection was not created");
  collections = addItem(collections, third.id, buildUnitKey.name(1));
  // Exactly the same lookup renderAsmaXNamesLevel()/asmaXCollectionsOfKind()
  // use: active collections filtered by classification key.
  const reached = activeCollections(collections).filter((c) => c.kind === "by-act-essence");
  assert.equal(reached.length, 1);
  assert.ok(reached[0].items.includes(buildUnitKey.name(1)));
  // And the reverse index the "Belongs to"/"also in…" chips read from finds
  // it too, resolved against the THIRD classification's own real title.
  const memberships = membershipsOfName(collections, 1);
  const viaThird = memberships.find((m) => m.kind === "by-act-essence");
  assert.ok(viaThird, "membershipsOfName did not find the Name's membership in the new classification's collection");
  const cls = classifications.find((c) => c.key === viaThird.kind);
  assert.equal(cls.title.en, "By Act / By Essence");
});

// --- 6. the page's own wiring is generic, not hardcoded to two kinds -------
// (source-text checks: no Playwright browser binary is installed in this
// sandbox, so the level bar's real DOM behaviour can't be driven here --
// see this round's own PR note for the recommended real-browser substitute.)

const qrHtml = fs.readFileSync(path.join(root, "app", "quranrevival.html"), "utf8");

check("the old fixed two-select level bar (asmaXGroupSelect/asmaXDualSelect) is gone as a real identifier", () => {
  // A comment may still name the old ids for historical context (this
  // round's own does) -- what must be gone is the STATIC markup and the
  // live JS identifiers, so this checks those specifically rather than a
  // blanket substring match that a comment would also trip.
  assert.ok(!qrHtml.includes('<select id="asmaXGroupSelect"'), "the old hardcoded Group <select> element still exists");
  assert.ok(!qrHtml.includes('<select id="asmaXDualSelect"'), "the old hardcoded Dual <select> element still exists");
  assert.ok(!qrHtml.includes("const asmaXGroupSelect ="), "the old asmaXGroupSelect JS variable still exists");
  assert.ok(!qrHtml.includes("const asmaXDualSelect ="), "the old asmaXDualSelect JS variable still exists");
});

check("the level bar renders one select per ACTIVE classification from the live registry, not a fixed pair", () => {
  assert.ok(qrHtml.includes("asmaActiveClassifications(asmaXClassifications"), "renderAsmaXLevelBar no longer reads the live classifications registry");
  assert.ok(qrHtml.includes('data-asmax-class-select'), "the dynamic per-classification <select> marker is missing");
});

check("the flat Names picker (asmaXSingleSelect) is untouched static markup, a separate entry point", () => {
  assert.ok(qrHtml.includes('<select id="asmaXSingleSelect" aria-label="Names"></select>'), "asmaXSingleSelect's own static markup changed");
});

check("the classifications registry is persisted on every save (asmaXPersist), not dropped on the floor", () => {
  const persistFn = qrHtml.slice(qrHtml.indexOf("async function asmaXPersist"), qrHtml.indexOf("async function asmaXRenameCollectionPrompt"));
  assert.ok(persistFn.includes("classifications: asmaXClassifications"), "asmaXPersist() does not send classifications to saveAsmaCollections()");
});

check("\"+ New classification\" is wired to addClassification, not left as a dead button", () => {
  assert.ok(qrHtml.includes("asmaXNewClassBtn.addEventListener"), "the new classification button has no click handler");
  assert.ok(qrHtml.includes("asmaAddClassificationLocal("), "asmaXAddClassificationPrompt() does not call the data layer's addClassification");
});

// --- 7. must-remain-exactly-as-is surfaces are untouched -------------------

check("the reference-adding mechanism (renderAsmaXrefBlock/asma-ref-parser.js) is untouched by this round", () => {
  assert.ok(fs.readFileSync(path.join(appJs, "asma-ref-parser.js"), "utf8").length > 0);
  assert.ok(qrHtml.includes("renderAsmaXrefBlock(entry, { inPage: true })"), "the References-level card no longer calls the untouched reference renderer");
});

check("asma-study.js's own renderAsmaDetail() call site is byte-identical -- the 'keep the panel as-is' rule holds", () => {
  const asmaStudyJs = fs.readFileSync(path.join(appJs, "asma-study.js"), "utf8");
  assert.ok(asmaStudyJs.includes("renderAsmaDetail(name, entry, { isBookmarked })"), "asma-study.js's own call site to renderAsmaDetail() changed shape -- it must not be passed memberships");
});

check("asma-study.js is asma-collections.js's ONLY other page-controller consumer, and it does not touch classifications", () => {
  const asmaStudyJs = fs.readFileSync(path.join(appJs, "asma-study.js"), "utf8");
  assert.ok(!asmaStudyJs.includes("classificationsFrom"), "asma-study.js now reads the classifications registry -- it was meant to stay untouched this round");
  assert.ok(!asmaStudyJs.includes("addClassification"), "asma-study.js now writes to the classifications registry -- it was meant to stay untouched this round");
});

console.log(`\n==== Asma classifications boundary (issue #202): ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
