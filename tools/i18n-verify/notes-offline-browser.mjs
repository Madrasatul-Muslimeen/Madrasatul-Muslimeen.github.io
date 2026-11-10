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
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-outbox": [
    ["app/journey-map.html", "revise: ({ note, expectedRevisionId, title, bodyHtml }) => reviseKeepingOffline(db, {", "revise: ({ note, expectedRevisionId, title, bodyHtml }) => updatePermanentNoteContent(db, {"],
    ["app/journey-map.html", "const outcome = offlineNow() ? { ok: true, result: keepNewNoteOffline({ ownerArgs, title, bodyHtml, folderId, order }).created.noteId }", "const outcome = false ? { ok: true, result: keepNewNoteOffline({ ownerArgs, title, bodyHtml, folderId, order }).created.noteId }"],
  ],
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
  check("static: note-outbox.js calls no Firestore write of its own", !/\b(setDoc|updateDoc|addDoc|deleteDoc|writeBatch|runTransaction|runEnvelopeTransaction|createDocument|updateDocument|commitEnvelopeBatch)\b/.test(src));
  const used = ["updatePermanentNoteContent(", "createPermanentNote(", "createNoteSource(", "createNotePlacement("].filter((f) => src.includes(f));
  check("static: its writes are updatePermanentNoteContent, createPermanentNote, createNoteSource, createNotePlacement", used.length === 4, used.join(", "));
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

async function freshContext(lang, width, init = null) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
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

for (const lang of ["en", "bn"]) {
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
    check(`${tag}: ✚ New note offline is kept on the device (one Note, filed in Alpha)`, madeKept && ob1.filter((e) => e.kind === "create").length === 1 && created?.folderId === "fA" && !!created?.placementId, JSON.stringify(ob1).slice(0, 300));
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
    check(`${tag}: a second offline save of the same Note is folded into ONE waiting save`, ob3.filter((e) => e.noteId === "n1").length === 1 && ob3.find((e) => e.noteId === "n1")?.expectedRevisionId === "rev-n1", JSON.stringify(ob3.map((e) => [e.kind, e.noteId])).slice(0, 200));
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
    check(`${tag}: online again, the device's outbox is emptied`, drained, JSON.stringify(await outbox(page)).slice(0, 300));
    const madeRow = newId ? await noteRow(page, newId) : null;
    const w = await writes(page);
    const noteSets = w.filter((x) => x.col === "notes" && x.id === `t1__${newId}` && x.op === "set");
    check(`${tag}: the Note made offline is saved by a transaction (createPermanentNote's own fields)`, !!madeRow && noteSets.length >= 1 && noteSets.every((x) => x.tx === true) && ["bodyHtml", "currentRevisionId", "noteId", "ownerPersonId", "status", "tenantId", "title", "visibility"].every((f) => noteSets[0].data.includes(f)), JSON.stringify(noteSets).slice(0, 300));
    check(`${tag}: ...created exactly ONCE`, noteSets.length === 1, String(noteSets.length));
    check(`${tag}: ...with its first revision under the id kept on the device`, !!madeRow && madeRow.rev === created?.revisionId && (await revs(page, newId)).length === 1);
    check(`${tag}: ...and filed in Alpha under the kept placement id`, await page.evaluate(([i, p]) => window.__DATA.notePlacements.filter((x) => x.noteId === i && x.folderId === "fA" && x.placementId === p).length === 1, [newId, created?.placementId]));
    const r1 = await revs(page, "n1");
    check(`${tag}: the offline edit is saved as ONE revision chained from the old one`, r1.length === 1 && r1[0].prev === "rev-n1" && r1[0].body.includes("OFFLINE-EDIT MORE") && r1[0].reason === "content-update", JSON.stringify(r1).slice(0, 300));
    check(`${tag}: ...and the Note's text on the server is the offline text`, ((await noteRow(page, "n1"))?.body || "").includes("OFFLINE-EDIT MORE"));
    const st2 = await pageStatus(page);
    // One of the Notes (n3) changed elsewhere later, so the sentence is the one that says so.
    check(`${tag}: the page says the offline Notes are saved, and that one changed elsewhere, in words`, st2 === (lang === "bn" ? OLDER_BN : OLDER_EN), st2);

    // ---- 4. Changed elsewhere meanwhile: the later change wins, the earlier is kept as an older version -
    const r2 = await revs(page, "n2");
    const n2 = await noteRow(page, "n2");
    check(`${tag}: changed elsewhere EARLIER: this device's text is saved on top of the head`, r2.length === 1 && r2[0].prev === "rev-n2-elsewhere" && r2[0].body.includes("MINE-LATER") && n2?.body.includes("MINE-LATER") && n2?.rev === r2[0].id, JSON.stringify({ r2, n2 }).slice(0, 400));
    const r3 = await revs(page, "n3");
    const n3 = await noteRow(page, "n3");
    const older = r3.find((r) => r.reason === "offline-older"), keptBack = r3.find((r) => r.reason === "offline-kept");
    check(`${tag}: changed elsewhere LATER: this device's text is kept as an older version, the later text stays on top`,
      r3.length === 2 && !!older && !!keptBack && older.prev === "rev-n3-elsewhere" && older.body.includes("MINE-EARLIER") && keptBack.prev === older.id && keptBack.body.includes("Changed elsewhere, later") && n3?.rev === keptBack.id && n3?.body.includes("Changed elsewhere, later"),
      JSON.stringify({ r3, n3 }).slice(0, 500));
    check(`${tag}: nothing is deleted on the way (no delete in any write)`, (await writes(page)).every((x) => x.op !== "delete"));
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT_AUTHORITY_INVALID|ERR_INTERNET_DISCONNECTED|net::ERR_/.test(e)).length === 0, errors.slice(0, 3).join(" | "));
    await ctx.close();
  }
}

// ---- 5. A save whose Note reached the server before the page closed is not created a second time -------------
{
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
  check(`${tag}: the Note already on the server is NOT created again`, w.filter((x) => x.col === "notes" && x.id === "t1__n9").length === 0 && (await page.evaluate(() => window.__DATA.notes.filter((n) => n.noteId === "n9").length)) === 1, JSON.stringify(w.filter((x) => x.col === "notes")).slice(0, 300));
  check(`${tag}: ...and its filing, which had not, is made once`, (await page.evaluate(() => window.__DATA.notePlacements.filter((p) => p.placementId === "pl9").length)) === 1);
  await ctx.close();
}

await browser.close();
console.log(`\n==== notes offline${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
