// Issue #271, Architect review pattern (matching issue #265's own
// wordpress-import-real-function.rules.test.mjs) -- runs the REAL importer
// (app/js/evernote-import-parser.js + app/js/evernote-import-service.js +
// app/js/note-foundation.js) against the REAL emulator running the ruleset
// the Owner's publish would produce: firestore.rules with its notes and
// noteFolders blocks replaced by the SAME candidate the WordPress importer
// uses (docs/governance/2026-09-25-wordpress-import-rules-candidate.rules)
// -- no new Rules are needed for Evernote (see evernote-import-service.js's
// own header: `importSource` is authorised as `is map` with no per-`system`
// shape check, so an `{ system: "evernote", ... }` value needs nothing new).
//
// Why it exists: the same v08.56-class lesson wordpress-import-real-
// function.rules.test.mjs was built to catch -- a service that asks "does
// this already exist?" by reading a document id directly is DENIED, not
// empty, under the deployed `allow get` rules (which evaluate
// `resource.data`), so the first import would stop on its first Note.
// evernote-import-service.js reuses the identical paged-list technique; this
// suite proves it against the real Rules engine rather than trusting that by
// resemblance alone.
//
// Default input is the two committed fixtures (tools/evernote-import/
// fixture.enex and fixture-second.enex, one shared stack folder). Isolated:
// a demo- project id on 127.0.0.1, never a production endpoint.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-evernote-import-real-function";
const HOST = "127.0.0.1";
const PORT = 8100;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");

// --- the ruleset activation would produce (identical assembly to the
// WordPress real-function suite -- same candidate, same two blocks) --------
function matchBlock(text, name) {
  const start = text.indexOf(`match /${name}/`);
  assert.notEqual(start, -1, `no ${name} block found`);
  const lineEnd = text.indexOf("\n", start);
  const open = text.lastIndexOf("{", lineEnd);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error(`unterminated ${name} block`);
}
const deployed = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const candidate = fs.readFileSync(path.join(root, "docs/governance/2026-09-25-wordpress-import-rules-candidate.rules"), "utf8");
let rules = deployed.replace(matchBlock(deployed, "notes"), matchBlock(candidate, "notes"));
rules = rules.replace(matchBlock(deployed, "noteFolders"), matchBlock(candidate, "noteFolders"));
assert.ok(rules.includes("importFieldsWellFormed") && rules.includes("folderImportFieldsWellFormed"),
  "the candidate blocks were not substituted -- this suite would be testing the deployed rules");
// This must match the SAME deployment file the WordPress suite writes and
// checks -- both importers activate against one identical assembled ruleset.
const DEPLOYMENT_FILE = "docs/governance/2026-09-25-wordpress-import-DEPLOYMENT-candidate.rules";
assert.equal(fs.readFileSync(path.join(root, DEPLOYMENT_FILE), "utf8"), rules,
  `${DEPLOYMENT_FILE} is not exactly firestore.rules with the candidate's two blocks -- regenerate it via the WordPress suite (WRITE_DEPLOYMENT_FILE=1)`);

// --- load the real modules, every relative import rewritten -----------------
const GSTATIC = /import\s*\{[\s\S]*?\}\s*from\s*"https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/;
const fsPkg = import.meta.resolve("firebase/firestore");
const toDataUrl = (src) => `data:text/javascript;base64,${Buffer.from(src).toString("base64")}`;
const real = (f) => pathToFileURL(path.join(root, "app/js", f)).href;
const read = (f) => fs.readFileSync(path.join(root, "app/js", f), "utf8");
function gstatic(src, names, label) {
  assert.match(src, GSTATIC, `${label}: gstatic import moved -- update this loader`);
  return src.replace(GSTATIC, `import { ${names} } from "${fsPkg}";`);
}
function spec(src, from, to, label) {
  const re = new RegExp(`from "${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
  assert.match(src, re, `${label}: "${from}" import moved -- update this loader`);
  return src.replace(re, `from "${to}"`);
}

const envelopeUrl = toDataUrl(gstatic(read("envelope.js"),
  "doc, setDoc, updateDoc, writeBatch, runTransaction, serverTimestamp", "envelope.js"));
let nf = gstatic(read("note-foundation.js"),
  "collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, where", "note-foundation.js");
nf = spec(nf, "./collections.js", real("collections.js"), "note-foundation.js");
nf = spec(nf, "./journey-map-contract.js", real("journey-map-contract.js"), "note-foundation.js");
nf = spec(nf, "./envelope.js", envelopeUrl, "note-foundation.js");
const nfUrl = toDataUrl(nf);

const i18nStub = toDataUrl("export const t = (s) => s; export const num = (n) => String(n);");
const unitKeysUrl = toDataUrl(spec(read("unit-keys.js"), "./i18n.js", i18nStub, "unit-keys.js"));

const sharedUrl = toDataUrl(read("notes-import-shared.js"));
let parserSrc = read("evernote-import-parser.js");
parserSrc = spec(parserSrc, "./notes-import-shared.js", sharedUrl, "evernote-import-parser.js");
assert.ok(!/from "\.\//.test(parserSrc), "evernote-import-parser.js has a relative import this loader did not rewrite");
const parserUrl = toDataUrl(parserSrc);

// The readiness gate is closed in the repository (ready: false) until the
// Owner publishes; this suite tests what happens once it is open. Same
// stub the WordPress suite uses, for the same shared gate module.
const readyStub = toDataUrl("export function isWordpressImportPersistenceReady() { return true; }");

let svc = read("evernote-import-service.js");
svc = spec(svc, "./collections.js", real("collections.js"), "service");
svc = spec(svc, "./envelope.js", envelopeUrl, "service");
svc = spec(svc, "./journey-map-contract.js", real("journey-map-contract.js"), "service");
svc = spec(svc, "./unit-keys.js", unitKeysUrl, "service");
svc = spec(svc, "./evernote-import-parser.js", parserUrl, "service");
svc = spec(svc, "./study-wordpress-import-readiness.js", readyStub, "service");
svc = spec(svc, "./note-foundation.js", nfUrl, "service");
assert.ok(!/from "\.\//.test(svc), "evernote-import-service.js has a relative import this loader did not rewrite");

const { parseEnexXml, planEnexImport } = await import(parserUrl);
const { runEvernoteImport } = await import(toDataUrl(svc));

const fixture1 = process.env.ENEX_FILE_1 || path.join(root, "tools/evernote-import/fixture.enex");
const fixture2 = process.env.ENEX_FILE_2 || path.join(root, "tools/evernote-import/fixture-second.enex");
const surahIndex = JSON.parse(fs.readFileSync(path.join(root, "tools/quran-data-pull/output/surah-index.json"), "utf8"));
const plan = planEnexImport([
  { notebookName: "Reflections", parentFolderName: "Personal Journal", items: parseEnexXml(fs.readFileSync(fixture1, "utf8")).items },
  { notebookName: "Tafsir Notes", parentFolderName: "Personal Journal", items: parseEnexXml(fs.readFileSync(fixture2, "utf8")).items },
], { surahIndex });
assert.ok(plan.folders.length > 0 && plan.notes.length > 0, "the plan is empty -- the parser or the fixtures are wrong");

const T = "t1";
test("the real Evernote importer against the rules the Owner's publish would produce", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules } });
  let passed = 0, failed = 0;
  const check = (name, cond, detail = "") => {
    if (cond) { passed++; console.log(`  PASS  ${name}`); }
    else { failed++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
  };
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { roles: ["self"], personId: "p1" });
    });
    const db = env.authenticatedContext("uid-p1").firestore();
    const who = { tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1", actorUid: "uid-p1" };

    const expectedFilings = plan.notes.reduce((n, note) => n + note.folderIds.length, 0);
    const expectedLinks = plan.notes.filter((n) => n.reference.kind === "ayah" || n.reference.kind === "range").length;
    console.log(`  input: 2 .enex files -- ${plan.folders.length} folders, ${plan.notes.length} Notes, ${expectedLinks} āyah links, ${expectedFilings} filings`);

    const t0 = Date.now();
    const first = await runEvernoteImport(db, { ...who, plan });
    console.log(`  first run took ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    const allRefusals = [...first.folders.refusals, ...first.notes.refusals];
    check("first run: every folder created, none refused",
      first.folders.created === plan.folders.length && first.folders.refused === 0, JSON.stringify(first.folders).slice(0, 400));
    check("first run: every Note created, none refused",
      first.notes.created === plan.notes.length && first.notes.refused === 0, JSON.stringify(first.notes).slice(0, 400));
    check("first run: no link or filing refused either", allRefusals.length === 0, JSON.stringify(allRefusals.slice(0, 3)));

    let counts = {};
    await env.withSecurityRulesDisabled(async (ctx) => {
      const adb = ctx.firestore();
      for (const c of ["noteFolders", "notes", "noteRevisions", "noteSources", "notePlacements"]) {
        counts[c] = (await getDocs(collection(adb, c))).size;
      }
    });
    check("the database holds exactly what the plan describes",
      counts.noteFolders === plan.folders.length && counts.notes === plan.notes.length
        && counts.noteRevisions === plan.notes.length && counts.noteSources === expectedLinks
        && counts.notePlacements === expectedFilings, JSON.stringify(counts));

    // One Note with a reference, read back as its owner.
    const sample = plan.notes.find((n) => n.reference.kind === "ayah" && n.created);
    if (sample) {
      const snap = await getDoc(doc(db, "notes", `${T}__${sample.noteId}`));
      const data = snap.data();
      const wanted = new Date(`${sample.created.slice(0, 4)}-${sample.created.slice(4, 6)}-${sample.created.slice(6, 8)}T${sample.created.slice(9, 11)}:${sample.created.slice(11, 13)}:${sample.created.slice(13, 15)}Z`).getTime();
      check("a Note keeps its original Evernote date as a real timestamp",
        data?.originalCreatedAt?.toMillis?.() === wanted, `${data?.originalCreatedAt?.toDate?.()} vs ${sample.created}`);
      check("a Note carries its import record (system and notebook)",
        data?.importSource?.system === "evernote" && typeof data?.importSource?.notebook === "string");
      check("a Note's importSource carries its resources array (possibly empty) and its tags",
        Array.isArray(data?.importSource?.resources) && Array.isArray(data?.importSource?.tags));
    }
    // The picture Note specifically, to prove a resource round-trips through Firestore.
    const pictureNote = plan.notes.find((n) => n.importSource.resources.length > 0);
    if (pictureNote) {
      const snap = await getDoc(doc(db, "notes", `${T}__${pictureNote.noteId}`));
      const data = snap.data();
      check("a Note with a picture/attachment records its resource's file name and MD5",
        data?.importSource?.resources?.[0]?.fileName === pictureNote.importSource.resources[0].fileName
          && data?.importSource?.resources?.[0]?.md5 === pictureNote.importSource.resources[0].md5);
      check("a Note with a picture stores a visible placeholder in its bodyHtml, never the raw <en-media> tag",
        !data?.bodyHtml?.includes("<en-media") && /\[(picture|attachment):/.test(data?.bodyHtml || ""));
    }

    const t1 = Date.now();
    const second = await runEvernoteImport(db, { ...who, plan });
    console.log(`  second run took ${((Date.now() - t1) / 1000).toFixed(1)}s`);
    check("a second run creates nothing and skips everything",
      second.folders.created === 0 && second.folders.skipped === plan.folders.length
        && second.notes.created === 0 && second.notes.skipped === plan.notes.length
        && second.folders.refusals.length === 0 && second.notes.refusals.length === 0,
      JSON.stringify({ folders: second.folders, notes: { ...second.notes, refusals: second.notes.refusals.slice(0, 3) } }).slice(0, 500));
    let after = {};
    await env.withSecurityRulesDisabled(async (ctx) => {
      const adb = ctx.firestore();
      for (const c of Object.keys(counts)) after[c] = (await getDocs(collection(adb, c))).size;
    });
    check("a second run leaves the database exactly as it was", JSON.stringify(after) === JSON.stringify(counts), JSON.stringify(after));

    // The two notebooks share ONE stack folder in the real database too --
    // not just in the pure plan (planEnexImport's own dedup is proven by
    // the parser suite; this proves the WRITER honours it against the
    // real Rules rather than accidentally writing the stack twice).
    let stackDocs = 0;
    await env.withSecurityRulesDisabled(async (ctx) => {
      const adb = ctx.firestore();
      const snap = await getDocs(collection(adb, "noteFolders"));
      stackDocs = snap.docs.filter((d) => d.data().name === "Personal Journal").length;
    });
    check("the shared stack folder was written exactly once, not once per file", stackDocs === 1, `${stackDocs} stack folder documents`);
  } finally {
    await env.cleanup();
  }
  console.log(`\n==== Evernote import, real functions: ${passed} passed, ${failed} failed ====`);
  if (failed) process.exitCode = 1;
});
