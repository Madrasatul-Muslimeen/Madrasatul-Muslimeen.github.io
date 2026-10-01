// Siyagah round 7 (Owner decisions M2, M3, 42.5) -- the DEPLOYMENT CANDIDATE
// Rules for sections, folder colour and bold, tags and tag links, executed
// against the Firestore emulator. Isolated: a demo- project id, 127.0.0.1,
// and the candidate text itself (the file that would be pasted into the
// Console), never firestore.rules and never a production endpoint.
//
// Every denial is paired with an allow differing in exactly ONE fact, and
// every denial must be a clean `false` -- never an expression-budget refusal.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, limit } from "firebase/firestore";

const PROJECT = "demo-quranrevival-siyagah-round7";
const HOST = "127.0.0.1";
const PORT = 8106;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const RULES_FILE = process.env.RULES_FILE || "docs/governance/2026-10-01-siyagah-round7-DEPLOYMENT-candidate.rules";
const candidate = fs.readFileSync(path.resolve(root, RULES_FILE), "utf8");
const live = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");

assert.match(PROJECT, /^demo-/);
assert.equal(HOST, "127.0.0.1");

// The candidate is the live file PLUS this round, nothing removed: every line
// of firestore.rules is still in it, in order -- except the one line this round
// rewrites in place, twice (noteFolders' `&& parentOneHopOk();`, which now
// continues with `&& sectionAssignmentOk();`). Any OTHER missing line fails.
// A MUTANT run (MUTANT=1) skips only this file-level comparison, so a mutated
// rule is judged by the cases below and not by this check noticing the edit.
if (!process.env.MUTANT) {
  const REWRITTEN = new Set(["                    && parentOneHopOk();"]);
  const candLines = candidate.split("\n");
  let j = 0; const missing = [];
  for (const line of live.split("\n")) {
    let k = j; while (k < candLines.length && candLines[k] !== line) k++;
    if (k < candLines.length) j = k + 1; else missing.push(line);
  }
  // UPDATED IN PLACE 1 Oct 2026: the Owner published this candidate and
  // firestore.rules was synced to it, so the two files are now the SAME file.
  // Before publication exactly the rewritten line was missing (twice); after
  // it, nothing is. Either state passes; anything else (a live line lost from
  // the candidate, or the two drifting apart after publication) fails.
  const published = live.trimEnd() === candidate.trimEnd();
  assert.deepEqual(missing, published ? [] : [...REWRITTEN, ...REWRITTEN], `live Rules lines missing from the candidate: ${JSON.stringify(missing)}`);
}

const T = "t1", T2 = "t2";
const nk = (tenant, id) => `${tenant}__${id}`;
const env0 = () => ({ schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-p1" });
const NOTE = "note0000000000000000000000000001";
const folderDoc = (o = {}) => ({ folderId: "fold0000000000000000000000000001", tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
  name: "Tafsir", parentFolderId: null, semanticRole: "user", order: 0, status: "active", ...env0(), ...o });
const sectionDoc = (o = {}) => ({ sectionId: "sec00000000000000000000000000001", tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
  name: "Work", order: 0, status: "active", ...env0(), ...o });
const tagDoc = (o = {}) => ({ tagId: "tag00000000000000000000000000001", tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
  name: "tawhid", status: "active", ...env0(), ...o });
const linkDoc = (o = {}) => ({ linkId: "lnk00000000000000000000000000001", tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
  noteId: NOTE, tagId: "tag00000000000000000000000000001", status: "active", ...env0(), ...o });
const noteDoc = (o = {}) => ({ noteId: NOTE, tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1", visibility: "private",
  title: "T", bodyHtml: "<p>B</p>", status: "active", currentRevisionId: "rev1", ...env0(), ...o });

test("Siyagah round 7 candidate Rules: sections, looks, tags", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const put = (c, id, data) => setDoc(doc(db, c, id), data);
      await put("tenantPeople", "p1", { tenantId: T, authUid: "uid-p1" });
      await put("tenantPeople", "p2", { tenantId: T, authUid: "uid-p2" });
      await put("tenantPeople", "kid", { tenantId: T, authUid: null, managedByPersonId: "g1" });
      await put("tenantPeople", "g1", { tenantId: T, authUid: "uid-g1" });
      await put("tenantPeople", "pX", { tenantId: T2, authUid: "uid-pX" });
      await put("tenantMemberUids", `${T}__uid-p1`, { roles: ["self"], personId: "p1" });
      await put("tenantMemberUids", `${T}__uid-p2`, { roles: ["self"], personId: "p2" });
      await put("tenantMemberUids", `${T}__uid-g1`, { roles: ["guardian"], personId: "g1" });
      await put("tenantMemberUids", `${T}__uid-adm`, { roles: ["owner"], personId: "adm" });
      await put("tenantMemberUids", `${T2}__uid-pX`, { roles: ["self"], personId: "pX" });

      await put("notes", nk(T, NOTE), noteDoc());
      await put("notes", nk(T, "retirednote0000000000000000000001"), noteDoc({ noteId: "retirednote0000000000000000000001", status: "retired" }));
      await put("notes", nk(T, "p2note00000000000000000000000001"), noteDoc({ noteId: "p2note00000000000000000000000001", ownerPersonId: "p2", ownerUid: "uid-p2", createdBy: "uid-p2" }));

      await put("noteSections", nk(T, "sec00000000000000000000000000001"), sectionDoc());
      await put("noteSections", nk(T, "secretired000000000000000000001"), sectionDoc({ sectionId: "secretired000000000000000000001", status: "retired" }));
      await put("noteSections", nk(T, "secp2000000000000000000000000001"), sectionDoc({ sectionId: "secp2000000000000000000000000001", ownerPersonId: "p2", ownerUid: "uid-p2", createdBy: "uid-p2" }));

      await put("noteFolders", nk(T, "fold0000000000000000000000000001"), folderDoc());
      await put("noteFolders", nk(T, "nested00000000000000000000000001"), folderDoc({ folderId: "nested00000000000000000000000001", parentFolderId: "fold0000000000000000000000000001" }));
      await put("noteFolders", nk(T, "sysmap00000000000000000000000001"), folderDoc({ folderId: "sysmap00000000000000000000000001", semanticRole: "journey-map", name: "My Journey" }));
      // A folder filed under a section that was retired AFTER it was filed.
      await put("noteFolders", nk(T, "orphan00000000000000000000000001"), folderDoc({ folderId: "orphan00000000000000000000000001", sectionId: "secretired000000000000000000001" }));

      await put("noteTags", nk(T, "tag00000000000000000000000000001"), tagDoc());
      await put("noteTags", nk(T, "tagretired000000000000000000001"), tagDoc({ tagId: "tagretired000000000000000000001", status: "retired" }));
      await put("noteTags", nk(T, "tagp2000000000000000000000000001"), tagDoc({ tagId: "tagp2000000000000000000000000001", ownerPersonId: "p2", ownerUid: "uid-p2", createdBy: "uid-p2" }));
      await put("noteTags", nk(T, "tagsoon000000000000000000000001"), tagDoc({ tagId: "tagsoon000000000000000000000001" }));
      await put("noteTagLinks", nk(T, "lnkold00000000000000000000000001"), linkDoc({ linkId: "lnkold00000000000000000000000001", tagId: "tagsoon000000000000000000000001", status: "retired" }));
    });

    const p1 = env.authenticatedContext("uid-p1").firestore();
    const p2 = env.authenticatedContext("uid-p2").firestore();
    const g1 = env.authenticatedContext("uid-g1").firestore();
    const adm = env.authenticatedContext("uid-adm").firestore();
    const pX = env.authenticatedContext("uid-pX").firestore();
    const anon = env.unauthenticatedContext().firestore();

    let n = 0;
    const ok = async (id, name, p) => { await assertSucceeds(p); n++; console.log(`  PASS  ${id}  ${name}`); };
    const no = async (id, name, p) => {
      let err = null;
      try { await p; } catch (e) { err = e; }
      assert.ok(err, `${id} ${name}: expected a denial, but the write succeeded`);
      const msg = String(err.message ?? err);
      assert.ok(!/maximum of 1000 expressions|exceeded maximum/.test(msg), `${id} ${name}: denied by a BUDGET, not by the security logic -- ${msg}`);
      const entries = msg.match(/evaluation error at L\d+:\d+|false for '\w+'/g) ?? [];
      assert.ok(entries.length === 0 || /^false for '\w+'/.test(entries.at(-1)), `${id} ${name}: the deciding evaluation was not a clean false -- ${entries.at(-1)}`);
      n++; console.log(`  PASS  ${id}  ${name}`);
    };
    const now = () => new Date();
    const F = (db, id) => doc(db, "noteFolders", nk(T, id));
    const S = (db, id) => doc(db, "noteSections", nk(T, id));
    const G = (db, id) => doc(db, "noteTags", nk(T, id));
    const L = (db, id) => doc(db, "noteTagLinks", nk(T, id));
    const SEC = "sec00000000000000000000000000001", TAG = "tag00000000000000000000000000001";

    // --- folder LOOK: colour and bold (M3) ---------------------------------
    await ok("LOOK-01", "a legacy folder with no look fields still renames", updateDoc(F(p1, "fold0000000000000000000000000001"), { name: "Tafsir 2", updatedAt: now() }));
    await ok("LOOK-02", "a folder takes a #RRGGBB colour and bold", updateDoc(F(p1, "fold0000000000000000000000000001"), { color: "#C0392B", bold: true, updatedAt: now() }));
    await no("LOOK-03", "...not a colour word", updateDoc(F(p1, "fold0000000000000000000000000001"), { color: "red", updatedAt: now() }));
    await no("LOOK-04", "...not a five-digit colour", updateDoc(F(p1, "fold0000000000000000000000000001"), { color: "#C0392", updatedAt: now() }));
    await no("LOOK-05", "...bold must be true or false", updateDoc(F(p1, "fold0000000000000000000000000001"), { bold: "yes", updatedAt: now() }));
    await ok("LOOK-06", "colour and bold can be cleared back to none", updateDoc(F(p1, "fold0000000000000000000000000001"), { color: null, bold: false, updatedAt: now() }));
    await no("LOOK-07", "another person cannot colour my folder", updateDoc(F(p2, "fold0000000000000000000000000001"), { color: "#C0392B", updatedAt: now() }));
    await no("LOOK-08", "the old spelling 'colour' is still an unknown field", updateDoc(F(p1, "fold0000000000000000000000000001"), { colour: "#C0392B", updatedAt: now() }));

    // --- folder SECTION (M2) -----------------------------------------------
    await ok("SEC-F-01", "a root folder files under my active section", updateDoc(F(p1, "fold0000000000000000000000000001"), { sectionId: SEC, updatedAt: now() }));
    await no("SEC-F-02", "...not under a section that does not exist", updateDoc(F(p1, "fold0000000000000000000000000001"), { sectionId: "nosuchsection00000000000000001", updatedAt: now() }));
    await no("SEC-F-03", "...not under someone else's section", updateDoc(F(p1, "fold0000000000000000000000000001"), { sectionId: "secp2000000000000000000000000001", updatedAt: now() }));
    await no("SEC-F-04", "...not newly under a RETIRED section", updateDoc(F(p1, "fold0000000000000000000000000001"), { sectionId: "secretired000000000000000000001", updatedAt: now() }));
    await ok("SEC-F-05", "a folder already under a since-retired section still renames", updateDoc(F(p1, "orphan00000000000000000000000001"), { name: "Kept", updatedAt: now() }));
    await ok("SEC-F-06", "...and can be moved to an active section", updateDoc(F(p1, "orphan00000000000000000000000001"), { sectionId: SEC, updatedAt: now() }));
    await no("SEC-F-07", "a NESTED folder carries no section", updateDoc(F(p1, "nested00000000000000000000000001"), { sectionId: SEC, updatedAt: now() }));
    await ok("SEC-F-08", "...the same nested folder renames fine without one", updateDoc(F(p1, "nested00000000000000000000000001"), { name: "Sub", updatedAt: now() }));
    await no("SEC-F-09", "a SYSTEM folder is never filed under a section", updateDoc(F(p1, "sysmap00000000000000000000000001"), { sectionId: SEC, updatedAt: now() }));
    await no("SEC-F-10", "a folder nested while keeping its section is refused", updateDoc(F(p1, "fold0000000000000000000000000001"), { parentFolderId: "orphan00000000000000000000000001", updatedAt: now() }));
    await ok("SEC-F-11", "...nesting it with the section cleared is allowed", updateDoc(F(p1, "fold0000000000000000000000000001"), { parentFolderId: "orphan00000000000000000000000001", sectionId: null, updatedAt: now() }));
    await ok("SEC-F-12", "a new root folder may be created straight into a section",
      setDoc(F(p1, "newroot0000000000000000000000001"), folderDoc({ folderId: "newroot0000000000000000000000001", sectionId: SEC, color: "#2E86C1", bold: true })));
    await no("SEC-F-13", "...not into a retired one",
      setDoc(F(p1, "newroot0000000000000000000000002"), folderDoc({ folderId: "newroot0000000000000000000000002", sectionId: "secretired000000000000000000001" })));

    // --- noteSections --------------------------------------------------------
    await ok("SEC-01", "I create my own section", setDoc(S(p1, "secnew00000000000000000000000001"), sectionDoc({ sectionId: "secnew00000000000000000000000001", color: "#2E86C1", bold: true })));
    await no("SEC-02", "unauthenticated cannot", setDoc(S(anon, "secanon0000000000000000000000001"), sectionDoc({ sectionId: "secanon0000000000000000000000001" })));
    await no("SEC-03", "another person cannot create one for me", setDoc(S(p2, "secsteal000000000000000000000001"), sectionDoc({ sectionId: "secsteal000000000000000000000001", createdBy: "uid-p2" })));
    await ok("SEC-03b", "...p2 can create their own", setDoc(S(p2, "secsteal000000000000000000000001"), sectionDoc({ sectionId: "secsteal000000000000000000000001", ownerPersonId: "p2", ownerUid: "uid-p2", createdBy: "uid-p2" })));
    await no("SEC-04", "a guardian cannot create one for their child", setDoc(S(g1, "seckid00000000000000000000000001"), sectionDoc({ sectionId: "seckid00000000000000000000000001", ownerPersonId: "kid", ownerUid: null, createdBy: "uid-g1" })));
    await no("SEC-05", "an owner-role administrator cannot create one for someone else", setDoc(S(adm, "secadm00000000000000000000000001"), sectionDoc({ sectionId: "secadm00000000000000000000000001", createdBy: "uid-adm" })));
    await no("SEC-06", "a person in another tenant cannot write into this tenant",
      setDoc(S(pX, "secx000000000000000000000000001"), sectionDoc({ sectionId: "secx000000000000000000000000001", ownerPersonId: "pX", ownerUid: "uid-pX", createdBy: "uid-pX" })));
    await ok("SEC-06b", "...the same person in their own tenant can",
      setDoc(doc(pX, "noteSections", nk(T2, "secx000000000000000000000000001")), sectionDoc({ sectionId: "secx000000000000000000000000001", tenantId: T2, ownerPersonId: "pX", ownerUid: "uid-pX", createdBy: "uid-pX" })));
    await no("SEC-07", "the key must be tenantId__sectionId", setDoc(S(p1, "seckeyA0000000000000000000000001"), sectionDoc({ sectionId: "seckeyB0000000000000000000000001" })));
    await no("SEC-08", "an unknown field is refused", setDoc(S(p1, "secx2000000000000000000000000001"), sectionDoc({ sectionId: "secx2000000000000000000000000001", noteType: "x" })));
    await no("SEC-09", "a bad colour is refused", setDoc(S(p1, "secx3000000000000000000000000001"), sectionDoc({ sectionId: "secx3000000000000000000000000001", color: "blue" })));
    await no("SEC-10", "a section needs a name", setDoc(S(p1, "secx4000000000000000000000000001"), sectionDoc({ sectionId: "secx4000000000000000000000000001", name: "" })));
    await no("SEC-11", "a section cannot be born retired", setDoc(S(p1, "secx5000000000000000000000000001"), sectionDoc({ sectionId: "secx5000000000000000000000000001", status: "retired" })));
    await no("SEC-12", "createdBy must be me", setDoc(S(p1, "secx6000000000000000000000000001"), sectionDoc({ sectionId: "secx6000000000000000000000000001", createdBy: "uid-p2" })));
    await ok("SEC-13", "I rename, reorder, recolour and retire my section", updateDoc(S(p1, "secnew00000000000000000000000001"), { name: "Study", order: 3, color: "#000000", status: "retired", updatedAt: now() }));
    await ok("SEC-14", "...and restore it", updateDoc(S(p1, "secnew00000000000000000000000001"), { status: "active", updatedAt: now() }));
    await no("SEC-15", "a section never changes owner", updateDoc(S(p1, "secnew00000000000000000000000001"), { ownerPersonId: "p2", updatedAt: now() }));
    await no("SEC-16", "createdBy is frozen", updateDoc(S(p1, "secnew00000000000000000000000001"), { createdBy: "uid-p2", updatedAt: now() }));
    await no("SEC-17", "a section is never deleted", deleteDoc(S(p1, "secnew00000000000000000000000001")));
    await ok("SEC-18", "I read my section", getDoc(S(p1, SEC)));
    await no("SEC-19", "another person cannot read it", getDoc(S(p2, SEC)));
    await ok("SEC-20", "an owner-role administrator of the tenant may read it", getDoc(S(adm, SEC)));
    await ok("SEC-21", "a bounded list of my sections", getDocs(query(collection(p1, "noteSections"), where("tenantId", "==", T), where("ownerPersonId", "==", "p1"), where("status", "==", "active"), limit(100))));
    await no("SEC-22", "...an unbounded one is refused", getDocs(query(collection(p1, "noteSections"), where("tenantId", "==", T), where("ownerPersonId", "==", "p1"), where("status", "==", "active"))));

    // --- noteTags --------------------------------------------------------------
    await ok("TAG-01", "I create my own tag", setDoc(G(p1, "tagnew00000000000000000000000001"), tagDoc({ tagId: "tagnew00000000000000000000000001", color: "#27AE60" })));
    await no("TAG-02", "another person cannot create one for me", setDoc(G(p2, "tagnew00000000000000000000000002"), tagDoc({ tagId: "tagnew00000000000000000000000002", createdBy: "uid-p2" })));
    await no("TAG-03", "a guardian cannot create one for their child", setDoc(G(g1, "tagkid00000000000000000000000001"), tagDoc({ tagId: "tagkid00000000000000000000000001", ownerPersonId: "kid", ownerUid: null, createdBy: "uid-g1" })));
    await no("TAG-04", "a Note TYPE field is refused (decision 42.5: Tag only)", setDoc(G(p1, "tagnew00000000000000000000000003"), tagDoc({ tagId: "tagnew00000000000000000000000003", kind: "type" })));
    await no("TAG-05", "a tag name over 100 characters is refused", setDoc(G(p1, "tagnew00000000000000000000000004"), tagDoc({ tagId: "tagnew00000000000000000000000004", name: "x".repeat(101) })));
    await ok("TAG-05b", "...100 characters is fine", setDoc(G(p1, "tagnew00000000000000000000000004"), tagDoc({ tagId: "tagnew00000000000000000000000004", name: "x".repeat(100) })));
    await no("TAG-06", "a bad colour is refused", setDoc(G(p1, "tagnew00000000000000000000000005"), tagDoc({ tagId: "tagnew00000000000000000000000005", color: "#GGGGGG" })));
    await ok("TAG-07", "I rename and retire my tag", updateDoc(G(p1, "tagnew00000000000000000000000001"), { name: "iman", status: "retired", updatedAt: now() }));
    await no("TAG-08", "a tag never changes its id", updateDoc(G(p1, "tagnew00000000000000000000000001"), { tagId: "other0000000000000000000000000001", updatedAt: now() }));
    await no("TAG-09", "a tag is never deleted", deleteDoc(G(p1, TAG)));
    await no("TAG-10", "another person cannot read my tag", getDoc(G(p2, TAG)));
    await ok("TAG-11", "I read my tag", getDoc(G(p1, TAG)));

    // --- noteTagLinks ------------------------------------------------------------
    await ok("LNK-01", "I tag my active Note with my active tag", setDoc(L(p1, "lnk00000000000000000000000000001"), linkDoc()));
    await no("LNK-02", "...not a RETIRED Note", setDoc(L(p1, "lnk00000000000000000000000000002"), linkDoc({ linkId: "lnk00000000000000000000000000002", noteId: "retirednote0000000000000000000001" })));
    await no("LNK-03", "...not with a RETIRED tag", setDoc(L(p1, "lnk00000000000000000000000000003"), linkDoc({ linkId: "lnk00000000000000000000000000003", tagId: "tagretired000000000000000000001" })));
    await no("LNK-04", "...not with someone else's tag", setDoc(L(p1, "lnk00000000000000000000000000004"), linkDoc({ linkId: "lnk00000000000000000000000000004", tagId: "tagp2000000000000000000000000001" })));
    await no("LNK-05", "...not on someone else's Note", setDoc(L(p1, "lnk00000000000000000000000000005"), linkDoc({ linkId: "lnk00000000000000000000000000005", noteId: "p2note00000000000000000000000001" })));
    await no("LNK-06", "...not with a tag that does not exist", setDoc(L(p1, "lnk00000000000000000000000000006"), linkDoc({ linkId: "lnk00000000000000000000000000006", tagId: "nosuchtag0000000000000000000001" })));
    await no("LNK-07", "another person cannot tag my Note", setDoc(L(p2, "lnk00000000000000000000000000007"), linkDoc({ linkId: "lnk00000000000000000000000000007", createdBy: "uid-p2" })));
    await no("LNK-08", "a link cannot be born retired", setDoc(L(p1, "lnk00000000000000000000000000008"), linkDoc({ linkId: "lnk00000000000000000000000000008", status: "retired" })));
    await no("LNK-09", "a link is never repointed to another tag", updateDoc(L(p1, "lnk00000000000000000000000000001"), { tagId: "tagsoon000000000000000000000001", updatedAt: now() }));
    await no("LNK-10", "...or another Note", updateDoc(L(p1, "lnk00000000000000000000000000001"), { noteId: "p2note00000000000000000000000001", updatedAt: now() }));
    await ok("LNK-11", "untagging RETIRES the link", updateDoc(L(p1, "lnk00000000000000000000000000001"), { status: "retired", updatedAt: now() }));
    await ok("LNK-12", "tagging again RESTORES it while both ends are active", updateDoc(L(p1, "lnk00000000000000000000000000001"), { status: "active", updatedAt: now() }));
    await env.withSecurityRulesDisabled(async (ctx) => { await updateDoc(doc(ctx.firestore(), "noteTags", nk(T, "tagsoon000000000000000000000001")), { status: "retired" }); });
    await no("LNK-13", "...but not once its tag has been retired", updateDoc(L(p1, "lnkold00000000000000000000000001"), { status: "active", updatedAt: now() }));
    await ok("LNK-14", "a link whose tag was retired can still be retired itself", updateDoc(L(p1, "lnkold00000000000000000000000001"), { status: "retired", updatedAt: now() }));
    await no("LNK-15", "a link is never deleted", deleteDoc(L(p1, "lnk00000000000000000000000000001")));
    await ok("LNK-16", "I read my link", getDoc(L(p1, "lnk00000000000000000000000000001")));
    await no("LNK-17", "another person cannot read it", getDoc(L(p2, "lnk00000000000000000000000000001")));
    await ok("LNK-18", "a bounded list of my links", getDocs(query(collection(p1, "noteTagLinks"), where("tenantId", "==", T), where("ownerPersonId", "==", "p1"), where("status", "==", "active"), limit(100))));

    console.log(`\n==== Siyagah round 7 candidate Rules: ${n} cases, all as expected ====`);
    assert.ok(n >= 70, `implausibly few cases ran: ${n}`);
  } finally { await env.cleanup(); }
});
