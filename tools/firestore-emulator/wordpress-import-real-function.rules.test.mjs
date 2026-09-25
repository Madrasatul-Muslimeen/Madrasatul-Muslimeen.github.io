// Issue #265, Architect review -- runs the REAL importer
// (app/js/wordpress-import-parser.js + app/js/wordpress-import-service.js +
// app/js/note-foundation.js) against the REAL emulator running the ruleset
// the Owner's publish would produce: firestore.rules with its notes and
// noteFolders blocks replaced by the candidate's
// (docs/governance/2026-09-25-wordpress-import-rules-candidate.rules).
//
// Why it exists: the Builder's service asked "does this Note / link / filing
// already exist?" by reading each id directly. The deployed `allow get`
// rules evaluate `resource.data`, so reading an id that does not exist yet is
// DENIED, not empty (the v08.56 lesson) -- every first import would have
// stopped on its first Note. No pure suite can see that; this one can.
//
// Default input is the committed fixture. Set WXR_FILE to run a real export
// (the Owner's own file is never committed).
//
// Isolated: a demo- project id on 127.0.0.1, never a production endpoint.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-wordpress-import-real-function";
const HOST = "127.0.0.1";
const PORT = 8099;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");

// --- the ruleset activation would produce ----------------------------------
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
// The Owner pastes ONE whole file. It must be exactly the ruleset tested here.
const DEPLOYMENT_FILE = "docs/governance/2026-09-25-wordpress-import-DEPLOYMENT-candidate.rules";
if (process.env.WRITE_DEPLOYMENT_FILE) fs.writeFileSync(path.join(root, DEPLOYMENT_FILE), rules);
assert.equal(fs.readFileSync(path.join(root, DEPLOYMENT_FILE), "utf8"), rules,
  `${DEPLOYMENT_FILE} is not exactly firestore.rules with the candidate's two blocks -- regenerate it with WRITE_DEPLOYMENT_FILE=1`);

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

// unit-keys.js imports i18n.js only for labels; buildUnitKey needs neither.
const i18nStub = toDataUrl("export const t = (s) => s; export const num = (n) => String(n);");
const unitKeysUrl = toDataUrl(spec(read("unit-keys.js"), "./i18n.js", i18nStub, "unit-keys.js"));
const parserSrc = read("wordpress-import-parser.js");
assert.ok(!/^import /m.test(parserSrc), "the parser gained an import -- rewrite it here too");
const parserUrl = toDataUrl(parserSrc);
// The readiness gate is closed in the repository (ready: false) until the
// Owner publishes; this suite tests what happens once it is open.
const readyStub = toDataUrl("export function isWordpressImportPersistenceReady() { return true; }");

let svc = read("wordpress-import-service.js");
svc = spec(svc, "./collections.js", real("collections.js"), "service");
svc = spec(svc, "./envelope.js", envelopeUrl, "service");
svc = spec(svc, "./journey-map-contract.js", real("journey-map-contract.js"), "service");
svc = spec(svc, "./unit-keys.js", unitKeysUrl, "service");
svc = spec(svc, "./wordpress-import-parser.js", parserUrl, "service");
svc = spec(svc, "./study-wordpress-import-readiness.js", readyStub, "service");
svc = spec(svc, "./note-foundation.js", nfUrl, "service");
assert.ok(!/from "\.\//.test(svc), "wordpress-import-service.js has a relative import this loader did not rewrite");

const { parseWxrXml, analyzeWxrImport } = await import(parserUrl);
const { runWordpressImport } = await import(toDataUrl(svc));

const wxrPath = process.env.WXR_FILE || path.join(root, "tools/wordpress-import/fixture.wxr.xml");
const surahIndex = JSON.parse(fs.readFileSync(path.join(root, "tools/quran-data-pull/output/surah-index.json"), "utf8"));
const plan = analyzeWxrImport(parseWxrXml(fs.readFileSync(wxrPath, "utf8")), { surahIndex });
assert.ok(plan.folders.length > 0 && plan.notes.length > 0, "the plan is empty -- the parser or the file is wrong");

const T = "t1";
test("the real importer against the rules the Owner's publish would produce", async () => {
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
    console.log(`  input: ${path.basename(wxrPath)} -- ${plan.folders.length} folders, ${plan.notes.length} Notes, ${expectedLinks} āyah links, ${expectedFilings} filings`);

    const t0 = Date.now();
    const first = await runWordpressImport(db, { ...who, plan });
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
    const sample = plan.notes.find((n) => n.reference.kind === "ayah" && n.folderIds.length && n.postDateGmt);
    if (sample) {
      const snap = await getDoc(doc(db, "notes", `${T}__${sample.noteId}`));
      const data = snap.data();
      const wanted = new Date(`${sample.postDateGmt.replace(" ", "T")}Z`).getTime();
      check("a Note keeps its original WordPress date as a real timestamp",
        data?.originalCreatedAt?.toMillis?.() === wanted, `${data?.originalCreatedAt?.toDate?.()} vs ${sample.postDateGmt}`);
      check("a Note carries its import record (site and post id)",
        data?.importSource?.system === "wordpress" && data?.importSource?.postId === sample.postId);
    }

    const t1 = Date.now();
    const second = await runWordpressImport(db, { ...who, plan });
    console.log(`  second run took ${((Date.now() - t1) / 1000).toFixed(1)}s`);
    // Every Note whose file carries any usable date must keep one.
    const dated = plan.notes.filter((n) => n.postDateGmt && !/^0000/.test(n.postDateGmt));
    let withDate = 0;
    await env.withSecurityRulesDisabled(async (ctx) => {
      for (const d of (await getDocs(collection(ctx.firestore(), "notes"))).docs) if (d.data().originalCreatedAt) withDate++;
    });
    check("every Note with a date in the file keeps its original date (drafts included)",
      withDate === dated.length && dated.length === plan.notes.length, `${withDate} with a date, ${dated.length} dated in the plan, ${plan.notes.length} Notes`);

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
  } finally {
    await env.cleanup();
  }
  console.log(`\n==== WordPress import, real functions: ${passed} passed, ${failed} failed ====`);
  if (failed) process.exitCode = 1;
});
