// Siyagah round 14 (decision 66, #566) -- the DEPLOYMENT CANDIDATE Rules for
// the four Note flags (pinned, favourite, archived, finalised) and links
// between Notes (noteLinks), executed against the Firestore emulator.
// Isolated: a demo- project id, 127.0.0.1, and the candidate text itself (the
// file that would be pasted into the Console), never firestore.rules and never
// a production endpoint. Modelled on siyagah-round7.rules.test.mjs.
//
// Every denial is paired with an allow differing in exactly ONE fact, and
// every denial must be a clean `false` -- never an expression-budget refusal.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, collection, query, where, limit } from "firebase/firestore";

const PROJECT = "demo-quranrevival-siyagah-round14";
const HOST = "127.0.0.1";
const PORT = 8109;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const RULES_FILE = process.env.RULES_FILE || "docs/governance/2026-10-04-siyagah-round14-DEPLOYMENT-candidate.rules";
const candidate = fs.readFileSync(path.resolve(root, RULES_FILE), "utf8");
const live = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");

assert.match(PROJECT, /^demo-/);
assert.equal(HOST, "127.0.0.1");

// The candidate is the live file PLUS this round, nothing removed: every line
// of firestore.rules is still in it, in order. Once the Owner publishes and
// firestore.rules is synced, the two are the same file -- either state passes.
// A MUTANT run (MUTANT=1) skips only this file-level comparison.
if (!process.env.MUTANT) {
  const candLines = candidate.split("\n");
  let j = 0; const missing = [];
  for (const line of live.split("\n")) {
    let k = j; while (k < candLines.length && candLines[k] !== line) k++;
    if (k < candLines.length) j = k + 1; else missing.push(line);
  }
  assert.deepEqual(missing, [], `live Rules lines missing from the candidate: ${JSON.stringify(missing)}`);
}

const T = "t1", T2 = "t2";
const nk = (tenant, id) => `${tenant}__${id}`;
const env0 = (uid = "uid-p1") => ({ schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: uid });
const N1 = "note0000000000000000000000000001", N2 = "note0000000000000000000000000002";
const NFIN = "notefinal000000000000000000000001", NRET = "noteretired00000000000000000001", NP2 = "notep2000000000000000000000000001";
const NX = "notex0000000000000000000000000001";
const noteDoc = (o = {}) => ({ noteId: N1, tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1", visibility: "private",
  title: "T", bodyHtml: "<p>B</p>", status: "active", currentRevisionId: "rev1", ...env0(), ...o });
const revDoc = (o = {}) => ({ revisionId: "revA", noteId: N1, tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
  previousRevisionId: "rev1", title: "T2", bodyHtml: "<p>B2</p>", revisionReason: "content-update", actorUid: "uid-p1", ...env0(), ...o });
const linkDoc = (o = {}) => ({ linkId: "nl00000000000000000000000000001", tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
  fromNoteId: N1, toNoteId: N2, status: "active", ...env0(), ...o });

test("Siyagah round 14 candidate Rules: Note flags and links between Notes", async () => {
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

      await put("notes", nk(T, N1), noteDoc());
      await put("notes", nk(T, N2), noteDoc({ noteId: N2 }));
      await put("notes", nk(T, NFIN), noteDoc({ noteId: NFIN, finalised: true }));
      await put("notes", nk(T, NRET), noteDoc({ noteId: NRET, status: "retired" }));
      await put("notes", nk(T, NP2), noteDoc({ noteId: NP2, ownerPersonId: "p2", ownerUid: "uid-p2", createdBy: "uid-p2" }));
      await put("notes", nk(T2, NX), noteDoc({ noteId: NX, tenantId: T2, ownerPersonId: "pX", ownerUid: "uid-pX", createdBy: "uid-pX" }));
      await put("noteLinks", nk(T, "nlold0000000000000000000000000001"), linkDoc({ linkId: "nlold0000000000000000000000000001", toNoteId: NRET, status: "retired" }));
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
      // The emulator reports two passes per clause. On a denied Note update
      // the FIRST pass reports an evaluation error even on the live Rules
      // (measured 4 Oct 2026: live firestore.rules prints "evaluation error
      // at L1902:24 ... false for 'update' @ L1902"), and with two update
      // clauses that first pass also prints the 1000-expression budget for
      // the second. What decides is the LAST entry for each clause: it must be
      // a clean `false`, never an error and never the budget.
      const entries = [...msg.matchAll(/(evaluation error at L\d+:\d+ for '\w+' @ L(\d+)|Unable to evaluate[^@]*@ L(\d+)|false for '\w+' @ L(\d+))/g)];
      const last = new Map();
      for (const m of entries) last.set(m[2] ?? m[3] ?? m[4], m[1]);
      // A clause whose document was ALLOWED in the second pass (the revision
      // half of a batch) shows only its first-pass error and no `false`, so
      // the rule is: never the budget as any clause's last word, and at least
      // one clause refused with a clean `false`.
      for (const [line, e] of last) assert.ok(!/^Unable to evaluate/.test(e), `${id} ${name}: clause at L${line} was decided by the expression BUDGET -- ${msg}`);
      if (entries.length) assert.ok([...last.values()].some((e) => /^false for/.test(e)), `${id} ${name}: no clause refused with a clean false -- ${msg}`);
      // No limit on a list makes listIsBounded() compare null <= 100, an error
      // that refuses the list -- the live rule's own, known shape (round 7's
      // SEC-22 is the same).
      if (entries.length === 0) assert.ok(/PERMISSION_DENIED|Received: null <= int/i.test(msg), `${id} ${name}: not a permission denial -- ${msg}`);
      n++; console.log(`  PASS  ${id}  ${name}`);
    };
    const now = () => new Date();
    const Nn = (db, id, t = T) => doc(db, "notes", nk(t, id));
    const L = (db, id, t = T) => doc(db, "noteLinks", nk(t, id));
    let revSeq = 0;
    // A content update the way the app makes one: a new revision chained from
    // the current one, and the Note pointed at it, in one batch.
    const contentUpdate = (db, noteId, prevRev, fields, revOver = {}) => {
      const rid = `revS14${String(++revSeq).padStart(4, "0")}`;
      const b = writeBatch(db);
      b.set(doc(db, "noteRevisions", nk(T, rid)), revDoc({ revisionId: rid, noteId, previousRevisionId: prevRev, ...revOver }));
      b.update(Nn(db, noteId), { ...fields, currentRevisionId: rid, updatedAt: now() });
      return { commit: b.commit(), rid };
    };

    // --- FLAGS: the flag-only path ------------------------------------------
    await ok("FLG-01", "I pin my Note with no new revision", updateDoc(Nn(p1, N1), { pinned: true, updatedAt: now() }));
    await ok("FLG-02", "...favourite, archive and finalise likewise", updateDoc(Nn(p1, N2), { favourite: true, archived: true, finalised: true, updatedAt: now() }));
    await ok("FLG-03", "...and every flag can be cleared again", updateDoc(Nn(p1, N2), { favourite: false, archived: false, finalised: false, updatedAt: now() }));
    await no("FLG-04", "a flag must be true or false", updateDoc(Nn(p1, N1), { pinned: "yes", updatedAt: now() }));
    await no("FLG-05", "an unknown flag is refused", updateDoc(Nn(p1, N1), { starred: true, updatedAt: now() }));
    await no("FLG-06", "the flag path cannot also change the title", updateDoc(Nn(p1, N1), { pinned: false, title: "sneaky", updatedAt: now() }));
    await no("FLG-07", "...or the body", updateDoc(Nn(p1, N1), { pinned: false, bodyHtml: "<p>x</p>", updatedAt: now() }));
    await no("FLG-08", "...or the status (retiring needs a revision)", updateDoc(Nn(p1, N1), { pinned: false, status: "retired", updatedAt: now() }));
    await no("FLG-09", "...or point at a revision that does not exist", updateDoc(Nn(p1, N1), { pinned: false, currentRevisionId: "nosuchrev", updatedAt: now() }));
    await no("FLG-10", "another person cannot pin my Note", updateDoc(Nn(p2, N1), { pinned: true, updatedAt: now() }));
    await ok("FLG-10b", "...p2 can pin their own", updateDoc(Nn(p2, NP2), { pinned: true, updatedAt: now() }));
    await no("FLG-11", "a guardian cannot flag a Note that is not theirs", updateDoc(Nn(g1, N1), { favourite: true, updatedAt: now() }));
    await no("FLG-12", "an owner-role administrator cannot flag someone's Note", updateDoc(Nn(adm, N1), { favourite: true, updatedAt: now() }));
    await no("FLG-13", "a person in another tenant cannot flag across tenants", updateDoc(Nn(pX, N1), { favourite: true, updatedAt: now() }));
    await ok("FLG-13b", "...the same person flags their own Note in their own tenant", updateDoc(Nn(pX, NX, T2), { favourite: true, updatedAt: now() }));
    await no("FLG-14", "a RETIRED Note's flags do not move", updateDoc(Nn(p1, NRET), { pinned: true, updatedAt: now() }));
    await no("FLG-15", "anonymous cannot flag", updateDoc(Nn(anon, N1), { pinned: true, updatedAt: now() }));
    await no("FLG-16", "the flag path cannot change createdBy", updateDoc(Nn(p1, N1), { pinned: true, createdBy: "uid-p2", updatedAt: now() }));
    await ok("FLG-17", "a NEW Note may be born with flags (all false)", (async () => {
      const b = writeBatch(p1);
      b.set(doc(p1, "noteRevisions", nk(T, "revnew01")), revDoc({ revisionId: "revnew01", noteId: "notenew0000000000000000000000001", previousRevisionId: null, revisionReason: "created" }));
      b.set(Nn(p1, "notenew0000000000000000000000001"), noteDoc({ noteId: "notenew0000000000000000000000001", currentRevisionId: "revnew01", pinned: false, favourite: false, archived: false, finalised: false }));
      return b.commit();
    })());
    await no("FLG-18", "...but not with a flag that is not a boolean", (async () => {
      const b = writeBatch(p1);
      b.set(doc(p1, "noteRevisions", nk(T, "revnew02")), revDoc({ revisionId: "revnew02", noteId: "notenew0000000000000000000000002", previousRevisionId: null, revisionReason: "created" }));
      b.set(Nn(p1, "notenew0000000000000000000000002"), noteDoc({ noteId: "notenew0000000000000000000000002", currentRevisionId: "revnew02", archived: 1 }));
      return b.commit();
    })());

    // --- the CONTENT path keeps working, and never moves a flag -------------
    let cu = contentUpdate(p1, N1, "rev1", { title: "T2" });
    await ok("CNT-01", "a legacy-style content update (new revision) still works on a pinned Note", cu.commit);
    let cur = cu.rid;
    cu = contentUpdate(p1, N1, cur, { title: "T3", pinned: false });
    await no("CNT-02", "...but a content update cannot also move a flag", cu.commit);
    cu = contentUpdate(p1, N1, cur, { title: "T3" });
    await ok("CNT-02b", "...the same update without the flag is fine", cu.commit); cur = cu.rid;

    // --- FINALISED locks the content path -----------------------------------
    cu = contentUpdate(p1, NFIN, "rev1", { title: "edited" });
    await no("FIN-01", "a FINALISED Note's title cannot be edited", cu.commit);
    cu = contentUpdate(p1, NFIN, "rev1", { bodyHtml: "<p>edited</p>" });
    await no("FIN-02", "...nor its body", cu.commit);
    cu = contentUpdate(p1, NFIN, "rev1", { status: "retired" }, { revisionReason: "retired" });
    await no("FIN-03", "...nor can it be retired while finalised", cu.commit);
    await ok("FIN-04", "...its other flags still move", updateDoc(Nn(p1, NFIN), { pinned: true, updatedAt: now() }));
    await ok("FIN-05", "un-finalising is a flag write", updateDoc(Nn(p1, NFIN), { finalised: false, updatedAt: now() }));
    cu = contentUpdate(p1, NFIN, "rev1", { title: "edited" });
    await ok("FIN-06", "...after which the same edit as FIN-01 is allowed", cu.commit);
    let finRev = cu.rid;
    cu = contentUpdate(p1, NFIN, finRev, { title: "x", finalised: true });
    await no("FIN-07", "finalising cannot ride on a content update", cu.commit);

    // --- noteLinks --------------------------------------------------------------
    const NL = "nl00000000000000000000000000001";
    await ok("NL-01", "I link my active Note to another of my active Notes", setDoc(L(p1, NL), linkDoc()));
    await no("NL-02", "a Note may not link to itself", setDoc(L(p1, "nl00000000000000000000000000002"), linkDoc({ linkId: "nl00000000000000000000000000002", toNoteId: N1 })));
    await no("NL-03", "...not to a RETIRED Note", setDoc(L(p1, "nl00000000000000000000000000003"), linkDoc({ linkId: "nl00000000000000000000000000003", toNoteId: NRET })));
    await no("NL-04", "...not FROM a retired Note", setDoc(L(p1, "nl00000000000000000000000000004"), linkDoc({ linkId: "nl00000000000000000000000000004", fromNoteId: NRET })));
    await no("NL-05", "...not to someone else's Note", setDoc(L(p1, "nl00000000000000000000000000005"), linkDoc({ linkId: "nl00000000000000000000000000005", toNoteId: NP2 })));
    await no("NL-06", "...not from someone else's Note", setDoc(L(p1, "nl00000000000000000000000000006"), linkDoc({ linkId: "nl00000000000000000000000000006", fromNoteId: NP2 })));
    await no("NL-07", "...not to a Note that does not exist", setDoc(L(p1, "nl00000000000000000000000000007"), linkDoc({ linkId: "nl00000000000000000000000000007", toNoteId: "nosuchnote000000000000000000001" })));
    await no("NL-08", "another person cannot link my Notes", setDoc(L(p2, "nl00000000000000000000000000008"), linkDoc({ linkId: "nl00000000000000000000000000008", createdBy: "uid-p2" })));
    await no("NL-09", "a guardian cannot link Notes for their child", setDoc(L(g1, "nl00000000000000000000000000009"), linkDoc({ linkId: "nl00000000000000000000000000009", ownerPersonId: "kid", ownerUid: null, createdBy: "uid-g1" })));
    await no("NL-10", "an administrator cannot link someone's Notes", setDoc(L(adm, "nl00000000000000000000000000010"), linkDoc({ linkId: "nl00000000000000000000000000010", createdBy: "uid-adm" })));
    await no("NL-11", "a link cannot be born retired", setDoc(L(p1, "nl00000000000000000000000000011"), linkDoc({ linkId: "nl00000000000000000000000000011", status: "retired" })));
    await no("NL-12", "createdBy must be me", setDoc(L(p1, "nl00000000000000000000000000012"), linkDoc({ linkId: "nl00000000000000000000000000012", createdBy: "uid-p2" })));
    await no("NL-13", "the key must be tenantId__linkId", setDoc(L(p1, "nlkeyA000000000000000000000000001"), linkDoc({ linkId: "nlkeyB000000000000000000000000001" })));
    await no("NL-14", "an unknown field is refused", setDoc(L(p1, "nl00000000000000000000000000014"), linkDoc({ linkId: "nl00000000000000000000000000014", kind: "see-also" })));
    await no("NL-15", "a person in another tenant cannot link into this tenant",
      setDoc(L(pX, "nl00000000000000000000000000015"), linkDoc({ linkId: "nl00000000000000000000000000015", ownerPersonId: "pX", ownerUid: "uid-pX", createdBy: "uid-pX" })));
    await no("NL-16", "a link is never repointed (to)", updateDoc(L(p1, NL), { toNoteId: NFIN, updatedAt: now() }));
    await no("NL-17", "...or (from)", updateDoc(L(p1, NL), { fromNoteId: NFIN, updatedAt: now() }));
    await ok("NL-18", "unlinking RETIRES the link", updateDoc(L(p1, NL), { status: "retired", updatedAt: now() }));
    await ok("NL-19", "linking again RESTORES it while both ends are active", updateDoc(L(p1, NL), { status: "active", updatedAt: now() }));
    await no("NL-20", "...but a link to a since-retired Note cannot be restored", updateDoc(L(p1, "nlold0000000000000000000000000001"), { status: "active", updatedAt: now() }));
    await ok("NL-21", "...and it can still be (re)retired itself", updateDoc(L(p1, "nlold0000000000000000000000000001"), { status: "retired", updatedAt: now() }));
    await no("NL-22", "another person cannot retire my link", updateDoc(L(p2, NL), { status: "retired", updatedAt: now() }));
    await no("NL-23", "a link is never deleted", deleteDoc(L(p1, NL)));
    await ok("NL-24", "I read my link", getDoc(L(p1, NL)));
    await no("NL-25", "another person cannot read it", getDoc(L(p2, NL)));
    await ok("NL-26", "an owner-role administrator of the tenant may read it", getDoc(L(adm, NL)));
    await ok("NL-27", "a bounded list of my links FROM a Note",
      getDocs(query(collection(p1, "noteLinks"), where("tenantId", "==", T), where("ownerPersonId", "==", "p1"), where("fromNoteId", "==", N1), where("status", "==", "active"), limit(100))));
    await ok("NL-28", "a bounded list of the links TO a Note (backlinks)",
      getDocs(query(collection(p1, "noteLinks"), where("tenantId", "==", T), where("ownerPersonId", "==", "p1"), where("toNoteId", "==", N2), where("status", "==", "active"), limit(100))));
    await no("NL-29", "...an unbounded one is refused",
      getDocs(query(collection(p1, "noteLinks"), where("tenantId", "==", T), where("ownerPersonId", "==", "p1"), where("toNoteId", "==", N2))));
    await no("NL-30", "anonymous cannot read a link", getDoc(L(anon, NL)));

    console.log(`\n==== Siyagah round 14 candidate Rules: ${n} cases, all as expected ====`);
    assert.ok(n >= 60, `implausibly few cases ran: ${n}`);
  } finally { await env.cleanup(); }
});
