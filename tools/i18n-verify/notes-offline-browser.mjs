// PCF MSA J120 step O3 -- NOTES OFFLINE (app/js/note-outbox.js). The Owner: "a Note written or changed with no internet
// is kept on the device and saved for real when the internet returns (nothing lost; if the same Note changed elsewhere
// meanwhile, the later change wins and the earlier is kept as an older version, the same rule as Siyagah)."
//
// Through the REAL controls of Mapping My Journey (✚ New note, ✏️ Edit), with Playwright's context.setOffline(true):
//   1. a NEW Note made offline and an EDIT made offline are kept on the device, in words, and nothing reaches the server;
//   2. reopening the page offline on the same device shows the kept text and the kept Note;
//   3. when the line is back both are saved through the same transactions an online save makes, each Note created ONCE;
//   4. a Note changed elsewhere meanwhile: this device's later change goes on top of the head; the other's later change
//      stays the text and this device's is kept as an older revision (Siyagah's rule 4);
//   5. a save whose Note already reached the server before the page closed is not created a second time.
// The stub's runTransaction refuses offline under window.__stubHoldWritesWhileOffline (as the real SDK does); its
// transactions are applied to DATA (exposed as window.__DATA), and every write is logged in sessionStorage.__stubWrites.
//
//   node tools/i18n-verify/notes-offline-browser.mjs [--mutate=<name>]     (from the REPOSITORY ROOT, serve.js running)
//   --mutate=no-outbox   the page saves straight to Firestore again      -> the "kept" and "saved when online" checks FAIL
//   --mutate=no-replay   the 'online' event no longer sends the outbox   -> the "saved when online" checks FAIL
//   --mutate=no-overlay  a full load ignores what the device holds       -> the "reopened offline" checks FAIL
//   --mutate=no-dedupe   the replay never asks whether a Note is saved   -> the "not created twice" check FAILS
//   --mutate=no-rebase   a stale revision is not rebased on the head     -> both "changed elsewhere" checks FAIL
//
// O3b (PCF MSA J120, part 2), sections 6-9:
//   6. the very first Note, before the system folder exists: the folder is kept too, made first when online, once;
//      a system folder another device made meanwhile is used instead of a second one;
//   7. ⋯ Make a copy and 🕘 Bring this version back, offline (the copy keeps every filing; its tags wait for online);
//   8. "unavailable" while the browser says it is online: a new Note is kept, not lost; any other refusal still
//      reaches the reader (I15);
//   9. notes.html's own editor (new Note, Save revision, a pop-up window's edit): kept, shown, and saved when online
//      with its Journaling evidence, landing as an online createStudyNote() does.
//   --mutate=no-unavailable-fallback  "unavailable" while online is thrown, not kept    -> section 8 FAILS
//   --mutate=no-folder-queue    the system folder is written straight away offline       -> section 6 FAILS
//   --mutate=no-folder-replay   a kept folder is never made                              -> section 6 FAILS
//   --mutate=no-folder-overlay  a full load ignores a kept folder                        -> section 6 "reopened" FAILS
//   --mutate=no-folder-reuse    another device's system folder is not used               -> section 6 "elsewhere" FAILS
//   --mutate=folder-last        kept folders are replayed after the Notes filed in them  -> section 6 "first" FAILS
//   --mutate=no-multi-filing    a kept Note keeps only its first filing                  -> section 7 "both folders" FAILS
//   --mutate=no-copy-kept       a kept copy still tries to tag itself offline            -> section 7 "tags" FAILS
//   --mutate=no-restore-outbox  a version brought back offline is not kept               -> section 7 "restore" FAILS
//   --mutate=notes-no-outbox    notes.html saves straight to Firestore again             -> section 9 FAILS
//   --mutate=notes-no-evidence  the replay records no Journaling evidence                -> section 9 "evidence" FAILS
//   --mutate=notes-no-overlay   notes.html ignores what the device holds                 -> section 9 "reopened" FAILS
//   --mutate=notes-no-replay    notes.html's 'online' event sends nothing                -> section 9 "saved" FAILS
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7); // o3,folder,copy,unavailable,notes
const run = (s) => !ONLY || ONLY.split(",").includes(s);
const MUT = {
  "no-outbox": [
    ["app/journey-map.html", "revise: ({ note, expectedRevisionId, title, bodyHtml }) => reviseKeepingOffline(db, {", "revise: ({ note, expectedRevisionId, title, bodyHtml }) => updatePermanentNoteContent(db, {"],
    // UPDATED IN PLACE (O3b): the new-Note paths share createNoteKeepingOffline(), which keeps a Note both when the
    // browser says offline and when the write is refused for want of the server -- both are taken out here.
    ["app/journey-map.html", "      if (offlineNow()) return keep();\n      try {\n        if (unitKey) await createStudyNote", "      try {\n        if (unitKey) await createStudyNote"],
    ["app/journey-map.html", "        if (isOfflineFailure(error)) return keep();\n        if (!done.note) throw error;", "        if (!done.note) throw error;"],
  ],
  "no-unavailable-fallback": [["app/journey-map.html", "        if (isOfflineFailure(error)) return keep();\n        if (!done.note) throw error;", "        if (!done.note) throw error;"]],
  "no-folder-queue": [["app/journey-map.html", "        if (offlineNow()) return keep();\n        try { return await createNoteFolder(db, { ...args, folderId }); } catch (error) { if (isOfflineFailure(error)) return keep(); throw error; }", "        return await createNoteFolder(db, { ...args, folderId });"]],
  "no-folder-replay": [["app/js/note-outbox.js", 'e.kind === "folder" ? await replayFolder(db, e) :', 'e.kind === "folder" ? { ...e } :']],
  "no-folder-overlay": [["app/journey-map.html", "      showKeptFolders(); // J120 O3b: a system folder made offline", "      // J120 O3b: a system folder made offline"]],
  "no-folder-reuse": [["app/js/note-outbox.js", "    if (there && there.folderId !== e.folderId) {", "    if (false) {"]],
  "folder-last": [["app/js/note-outbox.js", "      const e = list.find((x) => (!actorUid", '      const e = [...list.filter((x) => x.kind !== "folder"), ...list.filter((x) => x.kind === "folder")].find((x) => (!actorUid']],
  "no-multi-filing": [["app/js/note-outbox.js", "  if (Array.isArray(e.placements)) return e.placements;", "  if (Array.isArray(e.placements)) return e.placements.slice(0, 1);"]],
  "no-copy-kept": [["app/journey-map.html", "        if (keptCopy) return made.created.noteId;\n", ""]],
  "no-restore-outbox": [["app/journey-map.html", "restore: (note, rev) => reviseKeepingOffline(db, {", "restore: (note, rev) => updatePermanentNoteContent(db, {"]],
  "notes-no-outbox": [
    ["app/notes.html", "          if (offlineNow()) return keep();\n          try {\n            return await createStudyNote(", "          try {\n            return await createStudyNote("],
    ["app/notes.html", "            if (isOfflineFailure(error)) return keep();\n            throw error;", "            throw error;"],
    ["app/notes.html", "      if (offlineNow()) return keep();\n      // A save waiting", "      // A save waiting"],
    ["app/notes.html", "        if (isOfflineFailure(error)) return keep();\n        throw error;\n      }\n    }\n    function replayNoteOutbox", "        throw error;\n      }\n    }\n    function replayNoteOutbox"],
  ],
  "notes-no-evidence": [
    ["app/js/note-outbox.js", "  const journal = await recordKeptEvidence(db, e);\n  if (e.evidence)", "  const journal = null;\n  if (e.evidence)"],
    ["app/js/note-outbox.js", "  return { ...done, journal: await recordKeptEvidence(db, e) };", "  return { ...done, journal: null };"],
  ],
  "notes-no-overlay": [["app/notes.html", "        const added = overlayPending(rows.map((r) => r.note), null, { tenantId: activeTenantId, ownerPersonId: selectedPersonId });", "        const added = { notes: [] };"]],
  "notes-no-replay": [["app/notes.html", '    window.addEventListener("online", () => { replayNoteOutbox(); });\n    onReplayed(({ saved, failed }) => {\n      let older = false, notRecorded', "    onReplayed(({ saved, failed }) => {\n      let older = false, notRecorded"]],
  "no-replay": [["app/journey-map.html", 'window.addEventListener("online", () => { replayNoteOutbox(); });', 'window.addEventListener("online", () => {});']],
  "no-overlay": [["app/journey-map.html", "      overlayPending(allNotes, allPlacements, { tenantId: activeTenantId, ownerPersonId: selectedPersonId }); // J120 O3", "      // J120 O3"]],
  "no-dedupe": [["app/js/note-outbox.js", "return rows.length > 0;", "return false;"]],
  "no-rebase": [["app/js/note-outbox.js", 'if (error?.message !== "Stale Note revision.") throw error;', "throw error;"]],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
function source(file) {
  let src = fs.readFileSync(file, "utf8");
  for (const [f, from, to] of MUT[MUTATE] || []) {
    if (f !== file) continue;
    if (src.split(from).length !== 2) throw new Error(`mutation anchor not found exactly once: ${MUTATE} ${file}: ${from.slice(0, 60)}`);
    src = src.split(from).join(to);
  }
  return src;
}

const KEPT_EN = "Kept on this device — it will be saved when you are online.";
const KEPT_BN = "এই ডিভাইসে রাখা আছে — ইন্টারনেট ফিরলে সংরক্ষিত হবে।";
const OLDER_EN = "This Note also changed elsewhere: the later change is its text, and the other is kept as an older version.";
const OLDER_BN = "এই নোটটি অন্য কোথাও-ও বদলেছে: পরের পরিবর্তনটিই এর লেখা, আর অন্যটি পুরোনো সংস্করণ হিসেবে রাখা আছে।";

const SEED = `
(function () {
  window.__stubHoldWritesWhileOffline = true;
  window.__stubApplyBatches = true;
  window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d); }, toMillis: function () { return new Date(d).getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSources = [];
  DATA.noteFolders.push(Object.assign({ _id: "t1__fA", folderId: "fA", name: "Alpha", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts("2026-09-01T10:00:00Z") }, own));
  function N(id, title, body) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", createdAt: ts("2026-08-01T09:00:00Z"), updatedAt: ts("2026-09-01T10:00:00Z") }, own)); }
  function P(id, note, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: "fA", order: order, status: "active" }, own)); }
  N("n1", "Note One", "<p>First body.</p>"); N("n2", "Note Two", "<p>Second body.</p>"); N("n3", "Note Three", "<p>Third body.</p>");
  P("p1", "n1", 0); P("p2", "n2", 1); P("p3", "n3", 2);
  if (sessionStorage.getItem("__seedN9") === "1") { N("n9", "Already saved", "<p>Reached the server.</p>"); }
})();`;

// ---- 0. STATIC: the outbox writes ONLY through note-foundation.js (the online save's own functions) -------------------
{
  const src = fs.readFileSync("app/js/note-outbox.js", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const imports = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  check("static: note-outbox.js imports note-foundation.js and nothing else (no Firebase, no other writer)", imports.length === 1 && imports[0] === "./note-foundation.js", imports.join(", "));
  // UPDATED IN PLACE (O3b): the Journaling evidence a kept Notes-screen save carries is recorded through
  // recordJournalEvidence(), loaded on demand -- the one other module it may reach, and only for that function.
  const dyn = [...src.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]);
  check("static: its only on-demand import is study-note-service.js, for recordJournalEvidence() alone", dyn.length === 1 && dyn[0] === "./study-note-service.js" && /const \{ recordJournalEvidence \} = await import\("\.\/study-note-service\.js"\)/.test(src), dyn.join(", "));
  check("static: note-outbox.js calls no Firestore write of its own", !/\b(setDoc|updateDoc|addDoc|deleteDoc|writeBatch|runTransaction|runEnvelopeTransaction|createDocument|updateDocument|commitEnvelopeBatch)\b/.test(src));
  const used = ["updatePermanentNoteContent(", "createPermanentNote(", "createNoteSource(", "createNotePlacement(", "createNoteFolder(", "recordJournalEvidence("].filter((f) => src.includes(f));
  check("static: its writes are updatePermanentNoteContent, createPermanentNote, createNoteSource, createNotePlacement, createNoteFolder (and recordJournalEvidence)", used.length === 6, used.join(", "));
  const jm = fs.readFileSync("app/journey-map.html", "utf8");
  check("static: Mapping My Journey's edit save goes through the outbox (online it is updatePermanentNoteContent as before)", /revise: \(\{ note, expectedRevisionId, title, bodyHtml \}\) => reviseKeepingOffline\(db, \{/.test(source("app/journey-map.html")) && jm.includes("reviseKeepingOffline"));
}

const browser = await chromium.launch();
const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
const outbox = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem("mmsa.noteOutbox.v1") || "[]"); } catch { return null; } });
const revs = (page, id) => page.evaluate((i) => window.__DATA.noteRevisions.filter((r) => r.noteId === i).map((r) => ({ id: r.revisionId, prev: r.previousRevisionId, reason: r.revisionReason, body: r.bodyHtml })), id);
const noteRow = (page, id) => page.evaluate((i) => { const n = window.__DATA.notes.find((x) => x.noteId === i); return n ? { rev: n.currentRevisionId, body: n.bodyHtml, title: n.title } : null; }, id);
const writes = (page) => page.evaluate(() => { try { return JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"); } catch { return []; } });
const pageStatus = (page) => page.evaluate(() => { const e = document.getElementById("pageStatusMsg"); return e && getComputedStyle(e).display !== "none" ? e.textContent : ""; });
const editStatus = (page) => page.evaluate(() => { const e = document.querySelector("[data-edit-status]"); return e && !e.hidden ? e.textContent : ""; });
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const until = (page, fn, arg, ms = 8000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);

async function chooseAlpha(page, n = 3) {
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 1 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
  await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
  await page.waitForFunction((c) => document.querySelectorAll("#folderNotes [data-note-leaf]").length >= c, n, { timeout: 15000 });
}
const leaf = (id) => `#folderNotes [data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-open]`;
async function openNote(page, id) { await page.click(leaf(id)); await page.waitForSelector("#notePane:not([hidden])"); }
async function toggleEdit(page) {
  if (await vis(page, "[data-pane-bar] > [data-pane-edit-toggle]")) await page.click("[data-pane-bar] > [data-pane-edit-toggle]");
  else { await page.click("[data-pane-menu-btn]"); await page.waitForSelector("[data-pane-menu]", { state: "visible" }); await page.click("[data-pane-menu] [data-pane-edit-toggle]"); }
}
async function backToList(page) { if (!(await vis(page, "#folderNotes [data-fn-newnote]")) && (await vis(page, "[data-pane-back]"))) await page.click("[data-pane-back]"); }
async function typeAtEnd(page, text) { await page.click("[data-edit-body]"); await page.keyboard.press("Control+End"); await page.keyboard.type(text); }
async function flushByHiding(page) {
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
  await page.evaluate(() => { delete document.visibilityState; });
}
async function editOffline(page, id, text) {
  await openNote(page, id);
  await toggleEdit(page);
  await page.waitForSelector("[data-edit-body]");
  await typeAtEnd(page, text);
  await flushByHiding(page);
  await until(page, (i) => JSON.parse(localStorage.getItem("mmsa.noteOutbox.v1") || "[]").some((e) => e.noteId === i), id, 4000);
}
async function doneEditing(page) { await toggleEdit(page); await page.waitForFunction(() => !document.querySelector("[data-edit-body]"), null, { timeout: 5000 }).catch(() => {}); }

async function freshContext(lang, width, init = null, seed = SEED) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: seed });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  for (const file of new Set((MUT[MUTATE] || []).map((m) => m[0]))) {
    await ctx.route(`**/${file.replace(/^app\//, "")}*`, async (r) => {
      await r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: source(file) });
    });
  }
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
  // REOPENING OFFLINE: with the service worker off (as every suite runs) a page cannot load with the line down, so the
  // reload is made with the line up while the page is TOLD it is offline (sessionStorage.__forceOffline = "1"):
  // navigator.onLine reads false, exactly what a phone reopening the app offline from its cache sees.
  await ctx.addInitScript(() => {
    const real = Object.getOwnPropertyDescriptor(Navigator.prototype, "onLine");
    Object.defineProperty(Navigator.prototype, "onLine", { configurable: true, get() { try { if (sessionStorage.getItem("__forceOffline") === "1") return false; } catch {} return real.get.call(this); } });
  });
  if (init) await ctx.addInitScript(init);
  return ctx;
}

for (const lang of run("o3") ? ["en", "bn"] : []) {
  for (const width of [390, 1280]) {
    const tag = `${lang} ${width}px`;
    const KEPT = lang === "bn" ? KEPT_BN : KEPT_EN;
    const ctx = await freshContext(lang, width);
    let { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
    await chooseAlpha(page);

    // ---- 1. Offline: a NEW Note and an EDIT, kept on the device, in words ----------------------------
    await ctx.setOffline(true);
    check(`${tag}: the browser reports offline`, await page.evaluate(() => navigator.onLine === false));
    await page.click("#folderNotes [data-fn-newnote]");
    const madeKept = await until(page, () => JSON.parse(localStorage.getItem("mmsa.noteOutbox.v1") || "[]").some((e) => e.kind === "create"), null, 5000);
    const ob1 = (await outbox(page)) || [];
    const created = ob1.find((e) => e.kind === "create");
    check(`${tag}: ✚ New note offline is kept on the device (one Note, filed in Alpha)`, madeKept && ob1.filter((e) => e.kind === "create").length === 1 && created?.folderId === "fA" && !!created?.placementId, String(JSON.stringify(ob1)).slice(0, 300));
    const st1 = await pageStatus(page);
    check(`${tag}: ...and the page says so, in words`, st1 === KEPT, st1);
    check(`${tag}: ...and nothing reached the server`, (await page.evaluate(() => window.__DATA.notes.length)) === 3);
    const newId = created?.noteId;
    check(`${tag}: ...and the kept Note is listed in Alpha`, !!newId && await until(page, (i) => !!document.querySelector(`#folderNotes [data-note-leaf][data-note-id="${i}"]`), newId, 4000));
    await backToList(page);

    await editOffline(page, "n1", " OFFLINE-EDIT");
    const ob2 = (await outbox(page)) || [];
    const kept1 = ob2.find((e) => e.kind === "revise" && e.noteId === "n1");
    check(`${tag}: an edit made offline is kept on the device, building on the Note's revision`, !!kept1 && kept1.expectedRevisionId === "rev-n1" && kept1.bodyHtml.includes("OFFLINE-EDIT"), String(JSON.stringify(kept1)).slice(0, 300));
    const es = await editStatus(page);
    check(`${tag}: the editor says it is kept on this device, in words`, es === KEPT, es);
    check(`${tag}: ...and no revision reached the server`, (await revs(page, "n1")).length === 0);
    // A second offline save of the same Note is folded into the same waiting save (one revision when online).
    await typeAtEnd(page, " MORE");
    await flushByHiding(page);
    await until(page, () => JSON.parse(localStorage.getItem("mmsa.noteOutbox.v1") || "[]").some((e) => e.noteId === "n1" && e.bodyHtml.includes("MORE")), null, 4000);
    const ob3 = (await outbox(page)) || [];
    check(`${tag}: a second offline save of the same Note is folded into ONE waiting save`, ob3.filter((e) => e.noteId === "n1").length === 1 && ob3.find((e) => e.noteId === "n1")?.expectedRevisionId === "rev-n1", String(JSON.stringify(ob3.map((e) => [e.kind, e.noteId]))).slice(0, 200));
    await doneEditing(page);
    check(`${tag}: the open Note shows the offline text after the editor closes (redraw)`, (await page.textContent("#notePane [data-pane-body]")).includes("OFFLINE-EDIT MORE"));
    check(`${tag}: no sideways scroll`, await noSideways(page));

    // Changed elsewhere meanwhile (set up while offline): n2 -- this device's edit will be the LATER one;
    // n3 -- the other change is LATER than this device's.
    await backToList(page);
    await editOffline(page, "n2", " MINE-LATER");
    await doneEditing(page);
    await backToList(page);
    await editOffline(page, "n3", " MINE-EARLIER");
    await doneEditing(page);

    // ---- 2. Reopened offline on the same device: the kept text and the kept Note are shown -----------
    await page.evaluate(() => sessionStorage.setItem("__forceOffline", "1"));
    await ctx.setOffline(false);
    await page.reload({ waitUntil: "load" }).catch(() => {});
    const reopened = await until(page, () => document.querySelectorAll("#folderNotes [data-note-leaf], [data-folder-tree] .folder-row[data-folder-id]").length >= 1, null, 15000);
    check(`${tag}: the page reopens while offline`, reopened && await page.evaluate(() => navigator.onLine === false));
    if (reopened) {
      await chooseAlpha(page, 3).catch(() => {});
      check(`${tag}: reopened offline, the Note made offline is still listed`, !!newId && await until(page, (i) => !!document.querySelector(`#folderNotes [data-note-leaf][data-note-id="${i}"]`), newId, 6000));
      await openNote(page, "n1").catch(() => {});
      const body = (await page.textContent("#notePane [data-pane-body]").catch(() => "")) || "";
      check(`${tag}: reopened offline, the edited Note shows the kept text`, body.includes("OFFLINE-EDIT MORE"), body.slice(0, 200));
      await backToList(page);
    }
    // The other device's changes land on the server (the stub's DATA, reset by the reload) while this one is offline.
    await page.evaluate(() => {
      const ts = (ms) => ({ toDate: () => new Date(ms), toMillis: () => ms });
      const n2 = window.__DATA.notes.find((n) => n.noteId === "n2"); Object.assign(n2, { currentRevisionId: "rev-n2-elsewhere", bodyHtml: "<p>Changed elsewhere, earlier.</p>", updatedAt: ts(Date.now() - 3600e3) });
      const n3 = window.__DATA.notes.find((n) => n.noteId === "n3"); Object.assign(n3, { currentRevisionId: "rev-n3-elsewhere", bodyHtml: "<p>Changed elsewhere, later.</p>", updatedAt: ts(Date.now() + 3600e3) });
    });
    await page.evaluate(() => sessionStorage.setItem("__stubWrites", "[]"));

    // ---- 3. Online again: every kept save goes, through the same transactions, each Note created once --
    await page.evaluate(() => { sessionStorage.removeItem("__forceOffline"); window.dispatchEvent(new Event("online")); });
    const drained = await until(page, () => JSON.parse(localStorage.getItem("mmsa.noteOutbox.v1") || "[]").length === 0, null, 10000);
    check(`${tag}: online again, the device's outbox is emptied`, drained, String(JSON.stringify(await outbox(page))).slice(0, 300));
    const madeRow = newId ? await noteRow(page, newId) : null;
    const w = await writes(page);
    const noteSets = w.filter((x) => x.col === "notes" && x.id === `t1__${newId}` && x.op === "set");
    check(`${tag}: the Note made offline is saved by a transaction (createPermanentNote's own fields)`, !!madeRow && noteSets.length >= 1 && noteSets.every((x) => x.tx === true) && ["bodyHtml", "currentRevisionId", "noteId", "ownerPersonId", "status", "tenantId", "title", "visibility"].every((f) => noteSets[0].data.includes(f)), String(JSON.stringify(noteSets)).slice(0, 300));
    check(`${tag}: ...created exactly ONCE`, noteSets.length === 1, String(noteSets.length));
    check(`${tag}: ...with its first revision under the id kept on the device`, !!madeRow && madeRow.rev === created?.revisionId && (await revs(page, newId)).length === 1);
    check(`${tag}: ...and filed in Alpha under the kept placement id`, await page.evaluate(([i, p]) => window.__DATA.notePlacements.filter((x) => x.noteId === i && x.folderId === "fA" && x.placementId === p).length === 1, [newId, created?.placementId]));
    const r1 = await revs(page, "n1");
    check(`${tag}: the offline edit is saved as ONE revision chained from the old one`, r1.length === 1 && r1[0].prev === "rev-n1" && r1[0].body.includes("OFFLINE-EDIT MORE") && r1[0].reason === "content-update", String(JSON.stringify(r1)).slice(0, 300));
    check(`${tag}: ...and the Note's text on the server is the offline text`, ((await noteRow(page, "n1"))?.body || "").includes("OFFLINE-EDIT MORE"));
    const st2 = await pageStatus(page);
    // One of the Notes (n3) changed elsewhere later, so the sentence is the one that says so.
    check(`${tag}: the page says the offline Notes are saved, and that one changed elsewhere, in words`, st2 === (lang === "bn" ? OLDER_BN : OLDER_EN), st2);

    // ---- 4. Changed elsewhere meanwhile: the later change wins, the earlier is kept as an older version -
    const r2 = await revs(page, "n2");
    const n2 = await noteRow(page, "n2");
    check(`${tag}: changed elsewhere EARLIER: this device's text is saved on top of the head`, r2.length === 1 && r2[0].prev === "rev-n2-elsewhere" && r2[0].body.includes("MINE-LATER") && n2?.body.includes("MINE-LATER") && n2?.rev === r2[0].id, String(JSON.stringify({ r2, n2 })).slice(0, 400));
    const r3 = await revs(page, "n3");
    const n3 = await noteRow(page, "n3");
    const older = r3.find((r) => r.reason === "offline-older"), keptBack = r3.find((r) => r.reason === "offline-kept");
    check(`${tag}: changed elsewhere LATER: this device's text is kept as an older version, the later text stays on top`,
      r3.length === 2 && !!older && !!keptBack && older.prev === "rev-n3-elsewhere" && older.body.includes("MINE-EARLIER") && keptBack.prev === older.id && keptBack.body.includes("Changed elsewhere, later") && n3?.rev === keptBack.id && n3?.body.includes("Changed elsewhere, later"),
      String(JSON.stringify({ r3, n3 })).slice(0, 500));
    check(`${tag}: nothing is deleted on the way (no delete in any write)`, (await writes(page)).every((x) => x.op !== "delete"));
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT_AUTHORITY_INVALID|ERR_INTERNET_DISCONNECTED|net::ERR_/.test(e)).length === 0, errors.slice(0, 3).join(" | "));
    await ctx.close();
  }
}

// ---- 5. A save whose Note reached the server before the page closed is not created a second time -------------
if (run("o3")) {
  const tag = "en 390px (page closed mid-save)";
  const ctx = await freshContext("en", 390, () => {
    try {
      if (sessionStorage.getItem("__seedN9") !== "1") {
        sessionStorage.setItem("__seedN9", "1");
        localStorage.setItem("mmsa.noteOutbox.v1", JSON.stringify([{ kind: "create", id: "e9", tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", actorUid: "test-uid",
          noteId: "n9", revisionId: "rev-n9", title: "Already saved", bodyHtml: "<p>Reached the server.</p>", unitKey: null, source: null, sourceLinkId: null,
          folderId: "fA", placementId: "pl9", order: 9, at: Date.now() - 60000, done: {} }]));
      }
    } catch {}
  });
  const { page } = await openPage(ctx, "/app/journey-map.html#folders");
  const drained = await until(page, () => JSON.parse(localStorage.getItem("mmsa.noteOutbox.v1") || "[]").length === 0, null, 10000);
  check(`${tag}: the waiting save is sent on load`, drained);
  const w = await writes(page);
  check(`${tag}: the Note already on the server is NOT created again`, w.filter((x) => x.col === "notes" && x.id === "t1__n9").length === 0 && (await page.evaluate(() => window.__DATA.notes.filter((n) => n.noteId === "n9").length)) === 1, String(JSON.stringify(w.filter((x) => x.col === "notes"))).slice(0, 300));
  check(`${tag}: ...and its filing, which had not, is made once`, (await page.evaluate(() => window.__DATA.notePlacements.filter((p) => p.placementId === "pl9").length)) === 1);
  await ctx.close();
}

// ======================================================================================================================
// O3b (PCF MSA J120, part 2)
// ======================================================================================================================
const HEX = /^[0-9a-f]{32}$/;
const SAVED_EN = "Your Notes written offline are now saved.";
const SAVED_BN = "ইন্টারনেট ছাড়া লেখা আপনার নোটগুলো এখন সংরক্ষিত।";
const TAGS_EN = "Kept on this device — it will be saved when you are online. Its tags are not copied while offline.";
const TAGS_BN = "এই ডিভাইসে রাখা আছে — ইন্টারনেট ফিরলে সংরক্ষিত হবে। ইন্টারনেট ছাড়া এর ট্যাগগুলো কপি হয় না।";
const pageErrors = (errors) => errors.filter((e) => !/ERR_CERT_AUTHORITY_INVALID|ERR_INTERNET_DISCONNECTED|net::ERR_/.test(e));
const drainedOk = (page) => until(page, () => JSON.parse(localStorage.getItem("mmsa.noteOutbox.v1") || "[]").length === 0, null, 12000);
const goOnline = (page) => page.evaluate(() => { sessionStorage.removeItem("__forceOffline"); window.dispatchEvent(new Event("online")); });
async function reopenOffline(ctx, page) {
  await page.evaluate(() => sessionStorage.setItem("__forceOffline", "1"));
  await ctx.setOffline(false);
  await page.reload({ waitUntil: "load" }).catch(() => {});
}
async function paneMenu(page, item) {
  await page.click("[data-pane-menu-btn]");
  await page.waitForSelector("[data-pane-menu]", { state: "visible" });
  await page.click(`[data-pane-menu] ${item}`);
}

// ---- 6. The very first Note, before the system folder exists ---------------------------------------------------------
const primaryRow = '.folder-row[data-folder-role="journey-map"]';
async function toTree(page) {
  await backToList(page);
  if (!(await vis(page, `${primaryRow} [data-folder-name]`)) && (await vis(page, "#folderNotes [data-list-back]"))) await page.click("#folderNotes [data-list-back]");
}
async function newNoteInPrimary(page, n) {
  await toTree(page);
  await page.click(`${primaryRow} [data-folder-name]`);
  await page.waitForSelector("#folderNotes [data-fn-newnote]", { state: "visible", timeout: 8000 });
  await page.click("#folderNotes [data-fn-newnote]");
  return until(page, (c) => JSON.parse(localStorage.getItem("mmsa.noteOutbox.v1") || "[]").filter((e) => e.kind === "create").length >= c, n, 6000);
}
for (const [lang, width, elsewhere] of run("folder") ? [["en", 390, false], ["bn", 1280, true]] : []) {
  const tag = `${lang} ${width}px (first Note${elsewhere ? "; Primary made elsewhere meanwhile" : ""})`;
  const KEPT = lang === "bn" ? KEPT_BN : KEPT_EN;
  const ctx = await freshContext(lang, width);
  const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
  await chooseAlpha(page);
  check(`${tag}: Primary is not yet a real folder (positive control)`, await page.evaluate((s) => document.querySelector(s)?.dataset.folderId === "", primaryRow));
  await ctx.setOffline(true);
  const made1 = await newNoteInPrimary(page, 1);
  let ob = (await outbox(page)) || [];
  const fe = ob.find((e) => e.kind === "folder"), ce = ob.find((e) => e.kind === "create");
  check(`${tag}: offline, the Primary folder is kept on the device too (its own id, createNoteFolder's fields)`, made1 && !!fe && fe.semanticRole === "journey-map" && HEX.test(fe.folderId) && fe.parentFolderId === null && fe.order === 0 && !!fe.name && fe.ownerPersonId === "p1", String(JSON.stringify(ob)).slice(0, 400));
  check(`${tag}: ...kept BEFORE the Note filed in it, which is filed in that id`, !!ce && ce.folderId === fe?.folderId && ob.indexOf(fe) < ob.indexOf(ce));
  const st = await pageStatus(page);
  check(`${tag}: ...the page says it is kept, in words`, st === KEPT, st);
  check(`${tag}: ...nothing reached the server`, (await page.evaluate(() => `${window.__DATA.noteFolders.length}/${window.__DATA.notes.length}`)) === "1/3");
  check(`${tag}: ...and Primary is shown as that folder, with the Note in it`, await until(page, ([s, f, n]) => document.querySelector(s)?.dataset.folderId === f && !!document.querySelector(`#folderNotes [data-note-leaf][data-note-id="${n}"]`), [primaryRow, fe?.folderId, ce?.noteId], 5000));
  await backToList(page);
  const made2 = await newNoteInPrimary(page, 2);
  ob = (await outbox(page)) || [];
  const creates = ob.filter((e) => e.kind === "create");
  check(`${tag}: a second Note in Primary offline keeps no second folder`, made2 && ob.filter((e) => e.kind === "folder").length === 1 && creates.length === 2 && creates.every((e) => e.folderId === fe?.folderId), JSON.stringify(ob.map((e) => [e.kind, e.folderId])));
  check(`${tag}: no sideways scroll`, await noSideways(page));

  await reopenOffline(ctx, page);
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 1 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 }).catch(() => {});
  check(`${tag}: reopened offline, Primary is still that kept folder`, await until(page, ([s, f]) => document.querySelector(s)?.dataset.folderId === f, [primaryRow, fe?.folderId], 5000));
  await toTree(page).catch(() => {});
  await page.click(`${primaryRow} [data-folder-name]`).catch(() => {});
  check(`${tag}: ...with both kept Notes in it`, await until(page, (ids) => ids.every((i) => !!document.querySelector(`#folderNotes [data-note-leaf][data-note-id="${i}"]`)), creates.map((e) => e.noteId), 6000));
  if (elsewhere) {
    await page.evaluate(() => {
      const own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
      window.__DATA.noteFolders.push(Object.assign({ _id: "t1__fOther", folderId: "fOther", name: "Primary", parentFolderId: null, semanticRole: "journey-map", order: 0, status: "active" }, own));
    });
  }
  await page.evaluate(() => { sessionStorage.setItem("__stubWrites", "[]"); window.__stubWriteData = []; window.__stubRecordTxData = true; });
  await goOnline(page);
  const drained = await drainedOk(page);
  check(`${tag}: online again, everything kept is sent`, drained, String(JSON.stringify(await outbox(page))).slice(0, 300));
  const w = await page.evaluate(() => (window.__stubWriteData || []).map((x) => ({ col: x.col, id: x.id, op: x.kind })));
  const folderSets = w.filter((x) => x.col === "noteFolders" && x.op === "set");
  const prim = await page.evaluate(() => window.__DATA.noteFolders.filter((f) => f.semanticRole === "journey-map").map((f) => f.folderId));
  const target = elsewhere ? "fOther" : fe?.folderId;
  if (!elsewhere) {
    const firstNote = w.findIndex((x) => x.col === "notes" || x.col === "notePlacements");
    check(`${tag}: the Primary folder is made ONCE, under the kept id, by createNoteFolder`, folderSets.length === 1 && folderSets[0].id === `t1__${fe?.folderId}` && JSON.stringify(prim) === JSON.stringify([fe?.folderId]), String(JSON.stringify({ folderSets, prim })).slice(0, 300));
    check(`${tag}: ...and FIRST, before any Note filed in it`, folderSets.length === 1 && firstNote >= 0 && w.indexOf(folderSets[0]) < firstNote, JSON.stringify(w.map((x) => x.col)));
  } else {
    check(`${tag}: another device's Primary is used: no second Primary is made`, folderSets.length === 0 && JSON.stringify(prim) === JSON.stringify(["fOther"]), JSON.stringify({ folderSets, prim }));
  }
  const ids = creates.map((c) => ({ noteId: c.noteId, placementId: c.placementId }));
  check(`${tag}: both Notes are made once and filed in ${elsewhere ? "that" : "the kept"} folder under their kept placement ids`,
    await page.evaluate(([cs, f]) => cs.every((c) => window.__DATA.notes.filter((n) => n.noteId === c.noteId).length === 1 && window.__DATA.notePlacements.filter((p) => p.placementId === c.placementId && p.folderId === f).length === 1), [ids, target]),
    JSON.stringify(await page.evaluate((cs) => window.__DATA.notePlacements.filter((p) => cs.some((c) => c.noteId === p.noteId)).map((p) => [p.placementId, p.folderId]), ids)));
  check(`${tag}: after the save, Primary is the folder on the server`, await until(page, ([s, f]) => document.querySelector(s)?.dataset.folderId === f, [primaryRow, target], 6000));
  check(`${tag}: nothing is deleted on the way`, (await writes(page)).every((x) => x.op !== "delete"));
  check(`${tag}: no page errors`, pageErrors(errors).length === 0, pageErrors(errors).slice(0, 3).join(" | "));
  await ctx.close();
}

// ---- 7. ⋯ Make a copy and 🕘 Bring this version back, offline -----------------------------------------------------
const SEED_COPY = SEED + `
(function () {
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  DATA.noteFolders.push(Object.assign({ _id: "t1__fB", folderId: "fB", name: "Beta", parentFolderId: null, semanticRole: "user", order: 1, status: "active" }, own));
  DATA.notePlacements.push(Object.assign({ _id: "t1__p1b", placementId: "p1b", noteId: "n1", folderId: "fB", order: 0, status: "active" }, own));
  DATA.noteRevisions.push(Object.assign({ _id: "t1__rev-n1-old", revisionId: "rev-n1-old", noteId: "n1", previousRevisionId: null, title: "Note One", bodyHtml: "<p>The OLD body.</p>", revisionReason: "created", actorUid: "test-uid", createdAt: new Date("2026-08-01T09:00:00Z") }, own));
  DATA.noteRevisions.push(Object.assign({ _id: "t1__rev-n1", revisionId: "rev-n1", noteId: "n1", previousRevisionId: "rev-n1-old", title: "Note One", bodyHtml: "<p>First body.</p>", revisionReason: "content-update", actorUid: "test-uid", createdAt: new Date("2026-09-01T10:00:00Z") }, own));
  DATA.noteTags = [Object.assign({ _id: "t1__g1", tagId: "g1", name: "Prayer", color: "#2E8B57", status: "active" }, own)];
  DATA.noteTagLinks = [Object.assign({ _id: "t1__l1", linkId: "l1", tagId: "g1", noteId: "n1", status: "active" }, own)];
})();`;
for (const [lang, width] of run("copy") ? [["en", 390], ["bn", 1280]] : []) {
  const tag = `${lang} ${width}px (copy, bring back)`;
  const KEPT = lang === "bn" ? KEPT_BN : KEPT_EN;
  const ctx = await freshContext(lang, width, null, SEED_COPY);
  const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
  await chooseAlpha(page);
  await ctx.setOffline(true);
  await openNote(page, "n1");
  // 🕘 Bring this version back
  await paneMenu(page, "[data-pane-versions]");
  await page.waitForSelector(".note-versions [data-ver-open]", { state: "visible" });
  await page.click('.note-versions [data-ver-open="1"]');
  await page.waitForSelector(".note-versions [data-ver-restore]", { state: "visible" });
  await page.click(".note-versions [data-ver-restore]");
  const keptR = await until(page, () => JSON.parse(localStorage.getItem("mmsa.noteOutbox.v1") || "[]").some((e) => e.kind === "revise" && e.noteId === "n1"), null, 5000);
  const r = ((await outbox(page)) || []).find((e) => e.kind === "revise" && e.noteId === "n1");
  check(`${tag}: a version brought back offline is kept on the device (a "version-restore" revision on the current one)`, keptR && r?.revisionReason === "version-restore" && r?.expectedRevisionId === "rev-n1" && r?.bodyHtml.includes("OLD body"), String(JSON.stringify(r)).slice(0, 300));
  const stR = await pageStatus(page);
  check(`${tag}: ...the page says it is kept, in words`, stR === KEPT, stR);
  check(`${tag}: ...no revision reached the server`, (await page.evaluate(() => window.__DATA.noteRevisions.length)) === 2);
  check(`${tag}: ...and the Note shows the brought-back text`, await until(page, () => (document.querySelector("#notePane [data-pane-body]")?.textContent || "").includes("OLD body"), null, 4000));
  // ⋯ Make a copy (a restore that failed leaves the Versions dialog open: closed first, so the copy is still tested)
  if (await vis(page, ".note-versions [data-ver-close]")) await page.click(".note-versions [data-ver-close]");
  await paneMenu(page, "[data-pane-duplicate]");
  const keptC = await until(page, () => JSON.parse(localStorage.getItem("mmsa.noteOutbox.v1") || "[]").some((e) => e.kind === "create"), null, 6000);
  const c = ((await outbox(page)) || []).find((e) => e.kind === "create");
  const folders = (c?.placements || []).map((p) => p.folderId).sort();
  check(`${tag}: a copy made offline is kept on the device, with the brought-back text`, keptC && !!c && c.title.startsWith("Note One") && c.title !== "Note One" && (c.bodyHtml || "").includes("OLD body"), String(JSON.stringify(c)).slice(0, 300));
  check(`${tag}: ...filed in both folders the original is in, each under its own id`, JSON.stringify(folders) === JSON.stringify(["fA", "fB"]) && new Set(c.placements.map((p) => p.placementId)).size === 2 && c.placements.every((p) => HEX.test(p.placementId)), JSON.stringify(c?.placements));
  const stC = await pageStatus(page);
  check(`${tag}: ...and the page says so, and that its tags are not copied while offline`, stC === (lang === "bn" ? TAGS_BN : TAGS_EN), stC);
  check(`${tag}: ...nothing reached the server`, (await page.evaluate(() => window.__DATA.notes.length)) === 3);
  check(`${tag}: the kept copy opens in the pane`, await until(page, (ti) => document.querySelector("#notePane [data-pane-title]")?.textContent === ti, c?.title, 5000));
  check(`${tag}: no sideways scroll`, await noSideways(page));
  await page.evaluate(() => sessionStorage.setItem("__stubWrites", "[]"));
  await ctx.setOffline(false);
  await goOnline(page);
  check(`${tag}: online again, both are sent`, await drainedOk(page), String(JSON.stringify(await outbox(page))).slice(0, 300));
  const rv = (await revs(page, "n1")).filter((x) => x.reason === "version-restore");
  check(`${tag}: the version is brought back as ONE new revision chained from the current one`, rv.length === 1 && rv[0].prev === "rev-n1" && rv[0].body.includes("OLD body") && (await noteRow(page, "n1"))?.rev === rv[0].id, JSON.stringify(rv));
  const sets = (await writes(page)).filter((x) => x.col === "notes" && x.id === `t1__${c?.noteId}` && x.op === "set");
  check(`${tag}: the copy is made ONCE under its kept id`, sets.length === 1 && (await noteRow(page, c?.noteId))?.body.includes("OLD body"), String(sets.length));
  const placed = await page.evaluate((i) => window.__DATA.notePlacements.filter((p) => p.noteId === i).map((p) => `${p.folderId}:${p.placementId}`).sort(), c?.noteId);
  check(`${tag}: ...filed in both folders under the kept placement ids`, JSON.stringify(placed) === JSON.stringify(c.placements.map((p) => `${p.folderId}:${p.placementId}`).sort()), JSON.stringify(placed));
  check(`${tag}: ...and, as the sentence said, without its tags`, (await page.evaluate((i) => window.__DATA.noteTagLinks.filter((l) => l.noteId === i).length, c?.noteId)) === 0);
  check(`${tag}: nothing is deleted on the way`, (await writes(page)).every((x) => x.op !== "delete"));
  check(`${tag}: no page errors`, pageErrors(errors).length === 0, pageErrors(errors).slice(0, 3).join(" | "));
  await ctx.close();
}

// ---- 8. "unavailable" while the browser says it is online -----------------------------------------------------------
for (const [lang, width] of run("unavailable") ? [["en", 390], ["bn", 1280]] : []) {
  const tag = `${lang} ${width}px (unavailable while online)`;
  const KEPT = lang === "bn" ? KEPT_BN : KEPT_EN;
  const ctx = await freshContext(lang, width);
  const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
  await chooseAlpha(page);
  await page.evaluate(() => { window.__stubTxUnavailable = true; });
  await page.click("#folderNotes [data-fn-newnote]");
  const kept = await until(page, () => JSON.parse(localStorage.getItem("mmsa.noteOutbox.v1") || "[]").some((e) => e.kind === "create"), null, 6000);
  const c = ((await outbox(page)) || []).find((e) => e.kind === "create");
  check(`${tag}: the browser says it is online (the case under test)`, await page.evaluate(() => navigator.onLine === true));
  check(`${tag}: a new Note refused as "unavailable" is kept on the device, filed in Alpha`, kept && c?.folderId === "fA" && HEX.test(c?.noteId || "") && HEX.test(c?.placementId || ""), String(JSON.stringify(c)).slice(0, 300));
  const st = await pageStatus(page);
  check(`${tag}: ...the page says it is kept, in words`, st === KEPT, st);
  check(`${tag}: ...nothing reached the server, and no failure banner`, (await page.evaluate(() => window.__DATA.notes.length)) === 3 && !(await vis(page, "#qr-write-failure-banner")));
  check(`${tag}: ...and it is listed in Alpha`, await until(page, (i) => !!document.querySelector(`#folderNotes [data-note-leaf][data-note-id="${i}"]`), c?.noteId, 4000));
  await backToList(page);
  // Any other refusal still reaches the reader (I15) and is not kept quietly.
  await page.evaluate(() => { window.__stubTxUnavailable = false; window.__stubFailTx = true; document.getElementById("pageStatusMsg").style.display = "none"; });
  const before = ((await outbox(page)) || []).length;
  await page.click("#folderNotes [data-fn-newnote]");
  const banner = await until(page, () => { const b = document.getElementById("qr-write-failure-banner"); return !!b && getComputedStyle(b).display !== "none"; }, null, 6000);
  check(`${tag}: a refusal that is not "offline" reaches the reader, and nothing is kept`, banner && ((await outbox(page)) || []).length === before && (await pageStatus(page)) !== KEPT, String(await pageStatus(page)));
  await page.evaluate(() => { window.__stubFailTx = false; sessionStorage.setItem("__stubWrites", "[]"); });
  await goOnline(page);
  check(`${tag}: when the server answers again, the kept Note is sent`, await drainedOk(page));
  check(`${tag}: ...made once under its kept id and filed under its kept placement id`,
    await page.evaluate(([n, p]) => window.__DATA.notes.filter((x) => x.noteId === n).length === 1 && window.__DATA.notePlacements.filter((x) => x.placementId === p && x.folderId === "fA").length === 1, [c?.noteId, c?.placementId]));
  const unexpected = pageErrors(errors).filter((e) => !/transaction denied by the test/.test(e)); // the refusal this section makes on purpose
  check(`${tag}: no other page errors`, unexpected.length === 0, unexpected.slice(0, 3).join(" | "));
  await ctx.close();
}

// ---- 9. notes.html's own editor ------------------------------------------------------------------------------------
const NID = "a".repeat(32), RID = "b".repeat(32);
const SEED_NOTES = `
(function () {
  window.__stubHoldWritesWhileOffline = true; window.__stubApplyBatches = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d); }, toMillis: function () { return new Date(d).getTime(); } }; }
  DATA.notes = []; DATA.noteRevisions = []; DATA.noteSources = []; DATA.noteFolders = []; DATA.notePlacements = [];
  DATA.notes.push(Object.assign({ _id: "t1__${NID}", noteId: "${NID}", title: "Kursi note", bodyHtml: "<p>Seeded body.</p>", currentRevisionId: "${RID}", status: "active", visibility: "private", createdAt: ts("2026-08-01T09:00:00Z"), updatedAt: ts("2026-09-01T10:00:00Z") }, own));
  DATA.noteSources.push(Object.assign({ _id: "t1__s1", sourceLinkId: "s1", noteId: "${NID}", sourceKey: "ayah:2:255", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active" }, own));
})();`;
const card = (id) => `.note-card[data-note-id="${id}"]`;
const W = (id) => `.note-win[data-note-id="${id}"]`;
const evidenceRows = (page) => page.evaluate(() => Object.keys(window.__DATA).filter((k) => /\/evidence$/.test(k)).flatMap((k) => window.__DATA[k]));
for (const [lang, width] of run("notes") ? [["en", 390], ["bn", 1280]] : []) {
  const tag = `${lang} ${width}px (notes.html)`;
  const KEPT = lang === "bn" ? KEPT_BN : KEPT_EN;
  const ctx = await freshContext(lang, width, null, SEED_NOTES);
  const { page, errors } = await openPage(ctx, "/app/notes.html?unit=ayah:2:255");
  await page.waitForSelector(card(NID), { timeout: 15000 });
  await page.waitForSelector("#newNoteBtn", { state: "visible", timeout: 15000 });
  await ctx.setOffline(true);

  // 1. A new Note.
  await page.click("#newNoteBtn");
  await page.fill("#newTitleInput", "Offline title");
  await page.click("#newBodyEditor");
  await page.keyboard.type("Written OFFLINE.");
  await page.click("#newSaveBtn");
  const keptC = await until(page, () => JSON.parse(localStorage.getItem("mmsa.noteOutbox.v1") || "[]").some((e) => e.kind === "create"), null, 6000);
  const c = ((await outbox(page)) || []).find((e) => e.kind === "create");
  check(`${tag}: a new Note saved offline is kept on the device, with its study-unit link (createStudyNote's source)`, keptC && !!c && c.unitKey === "ayah:2:255" && c.source?.sourceKey === "ayah:2:255" && c.source?.sourceKind === "quran-unit" && c.source?.relationshipKind === "origin" && c.source?.provenanceKind === "study-note" && c.source?.approachId === null && HEX.test(c.sourceLinkId || "") && HEX.test(c.noteId || ""), String(JSON.stringify(c)).slice(0, 400));
  const ev = c?.evidence;
  check(`${tag}: ...and its Journaling evidence ("note created", for this Note, this unit and its day)`, !!ev && ev.eventType === "journal.note-created" && ev.noteId === c.noteId && ev.unitKey === "ayah:2:255" && ev.trackableId === "approach_10" && ev.personId === "p1" && /^\d{4}-\d\d-\d\d$/.test(ev.dateIso) && typeof ev.weekKey === "string" && ev.weekKey.length > 0, JSON.stringify(ev));
  check(`${tag}: ...kept as plain values (nothing to rebuild on the replay)`, !!ev && Object.values(ev).every((v) => typeof v === "string"));
  let st = await pageStatus(page);
  check(`${tag}: ...the page says it is kept, in words`, st === KEPT, st);
  check(`${tag}: ...nothing reached the server`, (await page.evaluate(() => `${window.__DATA.notes.length}/${window.__DATA.noteSources.length}`)) === "1/1");
  check(`${tag}: ...and the kept Note is shown with the others`, await until(page, ([s]) => (document.querySelector(s)?.textContent || "").includes("Written OFFLINE"), [card(c?.noteId)], 5000));

  // 2. Save revision, inline.
  await page.click(`${card(NID)} [data-note-edit]`);
  await page.waitForSelector(`${card(NID)} [data-edit-body]`);
  await page.click(`${card(NID)} [data-edit-body]`);
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" EDITED-OFFLINE");
  await page.click(`${card(NID)} [data-edit-save]`);
  const keptR = await until(page, (n) => JSON.parse(localStorage.getItem("mmsa.noteOutbox.v1") || "[]").some((e) => e.kind === "revise" && e.noteId === n), NID, 5000);
  const r = ((await outbox(page)) || []).find((e) => e.kind === "revise" && e.noteId === NID);
  check(`${tag}: Save revision offline is kept on the device, building on the Note's revision`, keptR && r?.expectedRevisionId === RID && (r?.bodyHtml || "").includes("EDITED-OFFLINE"), String(JSON.stringify(r)).slice(0, 300));
  check(`${tag}: ...with its Journaling evidence ("note revised")`, r?.evidence?.eventType === "journal.note-revised" && r?.evidence?.noteId === NID && r?.evidence?.unitKey === "ayah:2:255", JSON.stringify(r?.evidence));
  st = await pageStatus(page);
  check(`${tag}: ...the page says it is kept, in words`, st === KEPT, st);
  check(`${tag}: ...no revision reached the server, and the card shows the kept text`, (await page.evaluate(() => window.__DATA.noteRevisions.length)) === 0 && await until(page, (s) => (document.querySelector(s)?.textContent || "").includes("EDITED-OFFLINE"), card(NID), 4000));

  // 3. A pop-up window's edit. (A failed inline save leaves its form open: cancelled first, so the window is still tested.)
  if (await vis(page, `${card(NID)} [data-edit-cancel]`)) await page.click(`${card(NID)} [data-edit-cancel]`);
  await page.click(`${card(NID)} [data-note-window]`);
  await page.waitForSelector(W(NID), { state: "visible", timeout: 8000 });
  const direct = `${W(NID)} [data-pane-bar] > [data-pane-edit-toggle]`;
  const winToggle = async () => { if (await vis(page, direct)) await page.click(direct); else { await page.click(`${W(NID)} [data-pane-menu-btn]`); await page.click(`${W(NID)} [data-pane-menu] [data-pane-edit-toggle]`); } };
  await winToggle();
  await page.waitForSelector(`${W(NID)} [data-edit-body]`);
  await page.click(`${W(NID)} [data-edit-body]`);
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" WINDOW");
  await flushByHiding(page);
  const keptW = await until(page, (n) => JSON.parse(localStorage.getItem("mmsa.noteOutbox.v1") || "[]").some((e) => e.noteId === n && e.bodyHtml.includes("WINDOW")), NID, 5000);
  const rw = ((await outbox(page)) || []).filter((e) => e.noteId === NID);
  check(`${tag}: a window's edit offline is kept, folded into the same waiting save (one revision when online)`, keptW && rw.length === 1 && rw[0].expectedRevisionId === RID && rw[0].bodyHtml.includes("EDITED-OFFLINE") && rw[0].evidence?.eventType === "journal.note-revised", String(JSON.stringify(rw)).slice(0, 300));
  const ws = await page.evaluate((s) => { const e = document.querySelector(`${s} [data-edit-status]`); return e && !e.hidden ? e.textContent : ""; }, W(NID));
  check(`${tag}: ...and the window says it is kept on this device, in words`, ws === KEPT, ws);
  await winToggle();
  check(`${tag}: no sideways scroll`, await noSideways(page));

  // 4. Reopened offline.
  await reopenOffline(ctx, page);
  const back = await until(page, (s) => !!document.querySelector(s), card(NID), 15000);
  check(`${tag}: reopened offline, the kept new Note is shown`, back && await until(page, (s) => (document.querySelector(s)?.textContent || "").includes("Written OFFLINE"), card(c?.noteId), 5000));
  check(`${tag}: ...and the edited Note shows the kept text`, await until(page, (s) => { const t = document.querySelector(s)?.textContent || ""; return t.includes("EDITED-OFFLINE") && t.includes("WINDOW"); }, card(NID), 5000));

  // 5. Online again.
  await page.evaluate(() => sessionStorage.setItem("__stubWrites", "[]"));
  await goOnline(page);
  check(`${tag}: online again, the outbox is emptied`, await drainedOk(page), String(JSON.stringify(await outbox(page))).slice(0, 300));
  const w = await writes(page);
  const noteSets = w.filter((x) => x.col === "notes" && x.id === `t1__${c?.noteId}` && x.op === "set");
  check(`${tag}: the new Note is made ONCE, by a transaction, under its kept ids`, noteSets.length === 1 && noteSets[0].tx === true && (await noteRow(page, c?.noteId))?.rev === c?.revisionId, String(JSON.stringify(noteSets)).slice(0, 300));
  const src = await page.evaluate((i) => window.__DATA.noteSources.filter((s) => s.sourceLinkId === i).map((s) => ({ k: s.sourceKey, kind: s.sourceKind, rel: s.relationshipKind, prov: s.provenanceKind, ap: s.approachId, n: s.noteId })), c?.sourceLinkId);
  check(`${tag}: ...linked to the unit once, under its kept link id, exactly as createStudyNote links it`, src.length === 1 && src[0].k === "ayah:2:255" && src[0].kind === "quran-unit" && src[0].rel === "origin" && src[0].prov === "study-note" && src[0].ap === null && src[0].n === c?.noteId, JSON.stringify(src));
  const r1 = await revs(page, NID);
  check(`${tag}: the edits are saved as ONE revision chained from the old one`, r1.length === 1 && r1[0].prev === RID && r1[0].body.includes("EDITED-OFFLINE") && r1[0].body.includes("WINDOW"), String(JSON.stringify(r1)).slice(0, 300));
  const evs = await evidenceRows(page);
  check(`${tag}: the Journaling evidence is recorded: "note created" for the new Note`, evs.filter((e) => e.eventType === "journal.note-created" && e.noteId === c?.noteId && e.unitKey === "ayah:2:255").length === 1, String(JSON.stringify(evs)).slice(0, 400));
  check(`${tag}: ...and "note revised" for the edited one`, evs.filter((e) => e.eventType === "journal.note-revised" && e.noteId === NID).length === 1, String(JSON.stringify(evs)).slice(0, 400));
  st = await pageStatus(page);
  check(`${tag}: the page says the offline Notes are saved, in words`, st === (lang === "bn" ? SAVED_BN : SAVED_EN), st);

  // 6. It lands as an online createStudyNote() does: the same fields on the Note, its link and its evidence.
  await page.click("#newNoteBtn");
  await page.fill("#newTitleInput", "Online title");
  await page.click("#newBodyEditor");
  await page.keyboard.type("Written online.");
  await page.click("#newSaveBtn");
  await page.waitForFunction(() => window.__DATA.notes.length === 3, null, { timeout: 8000 }).catch(() => {});
  const shape = await page.evaluate(([kept]) => {
    const on = window.__DATA.notes.find((n) => n.title === "Online title");
    const keys = (o) => (o ? Object.keys(o).filter((k) => k !== "_id").sort().join(",") : "none");
    const srcOf = (id) => window.__DATA.noteSources.find((s) => s.noteId === id);
    const evOf = (id) => Object.keys(window.__DATA).filter((k) => /\/evidence$/.test(k)).flatMap((k) => window.__DATA[k]).find((e) => e.noteId === id && e.eventType === "journal.note-created");
    const k = window.__DATA.notes.find((n) => n.noteId === kept);
    return { note: [keys(k), keys(on)], src: [keys(srcOf(kept)), keys(srcOf(on?.noteId))], ev: [keys(evOf(kept)), keys(evOf(on?.noteId))] };
  }, [c?.noteId]);
  check(`${tag}: the kept Note, its link and its evidence carry exactly the fields an online save writes`, shape.note[0] === shape.note[1] && shape.src[0] === shape.src[1] && shape.ev[0] === shape.ev[1] && shape.ev[1] !== "none" && shape.src[1] !== "none", JSON.stringify(shape));
  check(`${tag}: nothing is deleted on the way`, (await writes(page)).every((x) => x.op !== "delete"));
  check(`${tag}: no page errors`, pageErrors(errors).length === 0, pageErrors(errors).slice(0, 3).join(" | "));
  await ctx.close();
}

await browser.close();
console.log(`\n==== notes offline${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
