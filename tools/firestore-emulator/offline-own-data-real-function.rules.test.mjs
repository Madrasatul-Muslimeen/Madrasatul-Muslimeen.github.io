// PCF MSA J120 O4 -- proves app/js/offline-own-data.js's keepOwnDataOffline() for real:
//   (1) every read it makes is ALLOWED by the REAL deployed Rules (firestore.rules) for the owner -- Notes (active and
//       Trash), folders (active and Trash), filings, links, sections, tags, tag links, Note links, Records, Bookmarks;
//   (2) after it ran, with the NETWORK OFF, the pages' own queries (listNotesForOwnerPage's orderBy updatedAt, the
//       Trash, every folder, a folder's filings, the Records list, the Bookmarks doc) are answered from the copy it
//       kept, and every count matches what was seeded;
//   (3) POSITIVE CONTROL: a second device that never ran it, also offline, gets NOTHING back from the same queries --
//       so the answers in (2) come from the kept copy and from nowhere else.
// The app's own modules are loaded from disk unmodified, with only their gstatic Firestore import pointed at the real
// `firebase/firestore` package (the loader technique of journey-map-real-function.rules.test.mjs, made recursive).
// The browser keeps its copy in IndexedDB (persistentLocalCache); Node has no IndexedDB, so this proves the same
// mechanism on the SDK's in-memory copy: a document a read brought back is what an offline query is answered from.
//
//   cd tools/firestore-emulator && npm ci && npm run offline-own-data-real-function
//   MUT=nonotes / MUT=norecords / MUT=nobookmarks / MUT=notrash  -> the matching offline check fails (mutation proof)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, setDoc, disableNetwork } from "firebase/firestore";

const PROJECT = "demo-mmsa-offline-own-data";
const HOST = "127.0.0.1";
const PORT = 8111; // free: checked against every other *.firebase.json here
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const rules = fs.readFileSync(path.resolve(root, process.env.RULES_FILE || "firestore.rules"), "utf8");
assert.match(PROJECT, /^demo-/); // SAFE-01
assert.equal(HOST, "127.0.0.1");

// ---- Recursive loader: app/js/<file> with every relative import loaded the same way, and the gstatic Firestore
// import pointed at the real package. Any other remote import (firebase-init, auth) fails loudly by name.
const firestorePkg = import.meta.resolve("firebase/firestore");
const MUT = process.env.MUT || "";
const built = new Map();
const toDataUrl = (src) => `data:text/javascript;base64,${Buffer.from(src).toString("base64")}`;
function load(rel) {
  if (built.has(rel)) return built.get(rel);
  let src = fs.readFileSync(path.join(root, "app/js", rel), "utf8");
  src = src.replace(/from\s*"https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js"/g, `from "${firestorePkg}"`);
  const remote = src.match(/from\s*"https:[^"]+"/);
  assert.equal(remote, null, `${rel} imports ${remote && remote[0]} -- this loader cannot follow it`);
  if (rel === "offline-own-data.js" && MUT) {
    const cut = { nonotes: /    paged\("notes", listNotesForOwnerIdPage, NOTE_STATUS\.ACTIVE\);\n/g,
      notrash: /    paged\("notes", listNotesForOwnerIdPage, NOTE_STATUS\.RETIRED\);\n/g,
      norecords: /    parts\.push\(\{\n      kind: "records"[\s\S]*?\n    \}\);\n/g,
      nobookmarks: /    parts\.push\(\{\n      kind: "bookmarks"[\s\S]*?\n    \}\);\n/g }[MUT];
    assert.ok(cut, `unknown MUT=${MUT}`);
    const n = (src.match(cut) || []).length;
    console.log(`MUTATION ${MUT}: ${n} replacement(s) in offline-own-data.js`);
    assert.ok(n > 0, "mutation matched nothing");
    src = src.replace(cut, "");
  }
  src = src.replace(/from\s*"\.\/([^"]+)"/g, (_, dep) => `from "${load(dep)}"`);
  src = src.replace(/import\s*"\.\/([^"]+)";/g, (_, dep) => `import "${load(dep)}";`);
  const url = toDataUrl(src);
  built.set(rel, url);
  return url;
}
const own = await import(load("offline-own-data.js"));
const nf = await import(load("note-foundation.js"));
const records = await import(load("records.js"));
const bookmarks = await import(load("bookmarks.js"));
// Positive control on the loader: the real pure helper behaves like itself.
assert.deepEqual(own.ownDataPeople({ tenantId: "t1", personId: "p1", selectedPersonId: "p1" }), ["p1"]);
assert.deepEqual(own.ownDataPeople({ tenantId: "t1", personId: "p1", selectedPersonId: "c1" }), ["p1", "c1"]);
assert.deepEqual(own.ownDataPeople(null), []);

const T = "t1";
const N_ACTIVE = 230, N_RETIRED = 7, N_FOLDERS = 140, N_FOLDERS_RETIRED = 3, N_PLACE = 120; // > 100: proves paging
const ts = (i) => new Date(Date.UTC(2026, 10, 1, 0, 0, i)).toISOString();
const base = (id, extra) => ({ tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1", schemaVersion: 1, createdAt: ts(0), updatedAt: ts(0), createdBy: "uid-p1", ...extra });

test("keepOwnDataOffline: allowed by the deployed Rules, and answers the pages' own queries with the network off", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { roles: ["self"], personId: "p1" });
      const w = [];
      for (let i = 0; i < N_ACTIVE; i++) w.push(setDoc(doc(db, "notes", `${T}__n${i}`), base(`n${i}`, { status: "active", title: `Note ${i}`, body: `<p>${i}</p>`, updatedAt: ts(i) })));
      for (let i = 0; i < N_RETIRED; i++) w.push(setDoc(doc(db, "notes", `${T}__r${i}`), base(`r${i}`, { status: "retired", title: `Old ${i}` })));
      for (let i = 0; i < N_FOLDERS; i++) w.push(setDoc(doc(db, "noteFolders", `${T}__f${i}`), base(`f${i}`, { status: "active", name: `Folder ${i}`, parentFolderId: null, semanticRole: "user", order: i })));
      for (let i = 0; i < N_FOLDERS_RETIRED; i++) w.push(setDoc(doc(db, "noteFolders", `${T}__fr${i}`), base(`fr${i}`, { status: "retired", name: `Gone ${i}`, parentFolderId: null, semanticRole: "user" })));
      for (let i = 0; i < N_PLACE; i++) w.push(setDoc(doc(db, "notePlacements", `${T}__pl${i}`), base(`pl${i}`, { status: "active", noteId: `n${i}`, folderId: "f0", order: i })));
      w.push(setDoc(doc(db, "noteSources", `${T}__s0`), base("s0", { status: "active", noteId: "n0", unitKey: "ayah:2:255" })));
      w.push(setDoc(doc(db, "noteSections", `${T}__sec0`), base("sec0", { status: "active", name: "Tafsir" })));
      w.push(setDoc(doc(db, "noteTags", `${T}__tag0`), base("tag0", { status: "active", name: "sabr" })));
      w.push(setDoc(doc(db, "noteTagLinks", `${T}__tl0`), base("tl0", { status: "active", noteId: "n0", tagId: "tag0" })));
      w.push(setDoc(doc(db, "noteLinks", `${T}__ln0`), base("ln0", { status: "active", fromNoteId: "n0", toNoteId: "n1" })));
      w.push(setDoc(doc(db, "records", `${T}__p1__surah_2`), { tenantId: T, personId: "p1", entries: { "ayah:2:255::approach_01": { status: "claimed" }, "ayah:2:256::approach_01": { status: "confirmed" } } }));
      w.push(setDoc(doc(db, "records", `${T}__p1__subject_quran`), { tenantId: T, personId: "p1", entries: { "juz:30::approach_02": { status: "claimed" } } }));
      w.push(setDoc(doc(db, "bookmarks", `${T}__p1`), { tenantId: T, personId: "p1", resume: { "quranrevival::none::quran": { position: { surah: 2 } } }, saved: [{ id: "b1" }, { id: "b2" }], folders: [] }));
      await Promise.all(w);
    });

    // ---- (1) The keep, as the owner, against the real Rules.
    const device = env.authenticatedContext("uid-p1").firestore();
    const keeping = own.keepOwnDataOffline(device, { tenantId: T, personIds: ["p1"] });
    await assertSucceeds(keeping);
    const kept = await keeping;
    console.log("  kept:", JSON.stringify(kept.counts), "failed:", JSON.stringify(kept.failed));
    assert.deepEqual(kept.failed, [], "a part was REFUSED by the deployed Rules (or failed)");
    if (!MUT) {
      assert.equal(kept.counts.notes, N_ACTIVE + N_RETIRED, "every Note (active and Trash) read");
      assert.equal(kept.counts.folders, N_FOLDERS + N_FOLDERS_RETIRED, "every folder (active and Trash) read");
      assert.equal(kept.counts.filings, N_PLACE);
      assert.equal(kept.counts.records, 3);
      assert.equal(kept.counts.bookmarks, 3);
      assert.deepEqual(kept.capped, []);
    }

    // ---- (2) Network off: the pages' own queries, answered from the copy.
    await disableNetwork(device);
    const offline = async (db) => {
      const notes = [];
      let after = null;
      do { const r = await nf.listNotesForOwnerPage(db, { tenantId: T, ownerPersonId: "p1", after }); notes.push(...r.rows); after = r.next; } while (after);
      const trash = (await nf.listNotesForOwnerPage(db, { tenantId: T, ownerPersonId: "p1", status: "retired" })).rows;
      const folders = await nf.listAllActiveFoldersForOwner(db, { tenantId: T, ownerPersonId: "p1" });
      const filed = await nf.listNotePlacementsForFolder(db, { tenantId: T, ownerPersonId: "p1", folderId: "f0", maximum: 100 });
      const recs = await records.listAllRecordsForPerson(db, T, "p1");
      // A document read with no copy is refused offline ("unavailable"), not answered empty: counted as nothing.
      let bm;
      try { bm = await bookmarks.getBookmarks(db, T, "p1"); } catch (e) { assert.equal(e.code, "unavailable"); bm = { saved: [], refused: true }; }
      return { notes, trash, folders, filed, recs, bm };
    };
    const got = await offline(device);
    console.log(`  offline: ${got.notes.length} notes, ${got.trash.length} in Trash, ${got.folders.length} folders, ${got.filed.length} filed in f0, ${got.recs.length} records, ${(got.bm.saved || []).length} saved bookmarks`);
    assert.equal(got.notes.length, N_ACTIVE, "MUTATION TARGET (nonotes): offline, every active Note opens from the copy");
    assert.equal(got.notes[0].id, `${T}__n${N_ACTIVE - 1}`, "offline, the Notes list keeps its newest-first order (orderBy updatedAt)");
    assert.equal(got.trash.length, N_RETIRED, "MUTATION TARGET (notrash): offline, the Trash opens from the copy");
    assert.equal(got.folders.length, N_FOLDERS, "offline, every folder opens from the copy");
    assert.ok(got.filed.length >= 100, "offline, a folder's filed Notes open from the copy");
    assert.equal(got.recs.length, 3, "MUTATION TARGET (norecords): offline, every Record opens from the copy");
    assert.equal((got.bm.saved || []).length, 2, "MUTATION TARGET (nobookmarks): offline, the Bookmarks open from the copy");

    // ---- (3) Positive control: a device that never kept a copy gets nothing offline.
    const other = env.authenticatedContext("uid-p1").firestore();
    await disableNetwork(other);
    const none = await offline(other);
    assert.equal(none.notes.length + none.trash.length + none.folders.length + none.recs.length + (none.bm.saved || []).length, 0,
      "POSITIVE CONTROL: a device with no kept copy must get nothing offline, or (2) proves nothing");
    assert.equal(none.bm.refused, true, "POSITIVE CONTROL: with no copy, the Bookmarks read is refused offline");
    console.log("  positive control: a device with no copy gets 0 of everything offline (its Bookmarks read is refused)");
  } finally {
    await env.cleanup();
  }
});
