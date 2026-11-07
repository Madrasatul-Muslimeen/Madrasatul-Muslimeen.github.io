// PCF MSA J112 (d) D2 (the Owner, 3:33 pm 7 Nov 2026) -- MSA Notes kept in step with Siyagah's Mapping My Journey,
// both ways, with no second tap. Against the Firebase stub (MSA's Notes in DATA.notes...; Siyagah's under notebooks/<nb>/).
//   pure      the model alone: an older untouched Note is remembered, never sent; a changed one is queued once
//   primary   MSA's system folder is called "Primary" (en and bn); Siyagah gets ONE folder.add Primary, never twice
//   old       an older Note nobody changed is never sent
//   send      saving a Note sends ONE note.add with exactly {v,op,from,at,st,id,title,content,tags,folderIds}, from 'msa',
//             into the Siyagah folder with the same name; the Note shows "Waiting to go to Siyagah", then "In Siyagah ✓"
//   unfiled   a Note only in Primary goes to Siyagah's Primary, after the folder is made
//   pull      a newer Siyagah copy comes back as a new revision (siyagah-sync), and nothing is sent back -- not even after
//             the page reloads
//   conflict  both changed: the later wins; MSA later -> Siyagah's text kept as an older version, then MSA's sent;
//             Siyagah later -> Siyagah's text comes back
//   offline   a request that cannot be sent waits (nothing lost) and goes when back online
//   closed    on a device never connected, an embedded pane sends and loads nothing; the Note says "open Mapping My
//             Journey, then Connect"; the queue survives the page and goes from the full Map
//   embedded  on a connected device, an embedded pane sends after a save by itself -- and loads nothing of Siyagah's before
//   lock      one sender at a time across tabs (a Web Lock): held elsewhere -> nothing sent; free -> sent ONCE
//   trash     MSA's Trash -> note.delete; restore -> note.add again (a fresh id if Siyagah still holds the old one)
//   only      every write on a notebooks/ path is a setDoc (no merge) into notebooks/<nb>/mmjin
//   layout    the mark at 390 / 768 / 1280, en and bn: inside the pane, no sideways scroll, the same height as the folder
//             chips beside it (32px, the chips' own size), contrast >= 4.5
// Run from the repository root with serve.js running:  [QR_BASE=http://localhost:8081] node tools/i18n-verify/j112-d2-sync-browser.mjs [--mutate=<name>]
import fs from "node:fs";
import { chromium, newContext, BASE } from "./harness.mjs";

let pass = 0, fail = 0;
const failed = [];
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; failed.push(name); console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
function crashed(err) { check("the section ran to its end", false, String(err?.message || err).split("\n")[0].slice(0, 300)); }
const read = (p) => fs.readFileSync(p, "utf8");
function mutated(src, a, b) { const n = src.split(a).length - 1; if (!n) throw new Error(`mutation anchor missing: ${a}`); console.log(`  (mutation: ${n} occurrence${n > 1 ? "s" : ""} replaced)`); return src.split(a).join(b); }
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const M = "app/js/siyagah-sync-model.js", S = "app/js/siyagah-sync.js", J = "app/journey-map.html";
// Each mutation: [[file, from, to], ...] and the check it must turn red.
const MUTATIONS = {
  "send-old": [[[M, "prev === undefined && !(touched >= state.since)", "false"]], "old: an older Note nobody changed is never sent to Siyagah"],
  "no-primary": [[[M, "if (target.ids.includes(PRIMARY_ID) && !hasPrimary) { primaryNeeded = true; continue; }", ""]], "unfiled: Primary is made in Siyagah FIRST, with exactly {v,op,from,at,st,id,name,parent} (id x-msa-primary, name Primary, at the top)"],
  "primary-twice": [[[S, ".filter((st) => !(st.kind === \"primary\" && s.primary))", ".filter(() => true)"], [M, "if (primaryNeeded && !state.primary)", "if (primaryNeeded)"]], "unfiled: Primary is asked for ONCE, however often the copy changes before Siyagah answers"],
  "folder-by-name-off": [[[M, 'if (f.role === "user" && f.path?.length) id = byPath.get(f.path.map(normName).join("\\u0000")) || null;', "id = null;"]], "send: ONE note.add: exactly {v,op,from,at,st,id,title,content,tags,folderIds}, from msa, id x-msa-n-<note>, the new text, tags [], into Siyagah's folder of the same name"],
  "extra-field": [[[M, "tags: [], folderIds: target.ids }", "tags: [], folderIds: target.ids, kind: \"msa\" }"]], "send: ONE note.add: exactly {v,op,from,at,st,id,title,content,tags,folderIds}, from msa, id x-msa-n-<note>, the new text, tags [], into Siyagah's folder of the same name"],
  "no-mark": [[[J, ".concat(syncChips(note))", ".concat([])"]], "send: the Note says it is waiting to go to Siyagah"],
  "mark-english": [[["app/js/i18n/bn.js", '"In Siyagah ✓": "সিয়াগাহ-এ আছে ✓",', ""]], "bn: the mark is in Bangla"],
  "label-old": [[[J, '"journey-map": () => t("Primary"),', '"journey-map": () => t("Personal Journey Map"),']], "primary: the Map's folder for Notes not yet filed is called Primary"],
  "no-pull": [[[M, 'if (siyChanged) steps.push({ kind: "pull", noteId, title: cn.title ?? "", bodyHtml: cn.content ?? "", base: cn.updatedAt });\n      continue;', "continue;"]], "pull: Siyagah's newer copy comes back as a new revision of the Note (siyagah-sync), with its title and text"],
  // The no-echo rule has two guards: the agreed text (`sent`) and the snapshot last seen (`seen`). Breaking `seen` alone was
  // measured to send nothing (the `sent` guard stops it), so the mutation that must go red breaks `sent`.
  "pull-loops": [[[M, 'case "pull": return l ? put({ ...l, base: step.base, sent: textHash(step.title, step.bodyHtml),', 'case "pull": return l ? put({ ...l, base: step.base, sent: l.sent,'], [J, "return { seen: syncSnapshotOf(note).hash };", "return {};"]], "pull: after a reload, still nothing is sent back"],
  "msa-always-loses": [[[M, "if (msOf(cn.updatedAt) > (Number(w.changedAt) || 0))", "if (true)"]], "conflict, MSA later: this app's text goes to Siyagah, against Siyagah's newer base"],
  "no-keep-older": [[[J, 'await syncWriteRevision(note, title || "", sanitizeNoteHtml(bodyHtml || ""), SYNC_REVISION_OLDER);', ""]], "conflict, MSA later: Siyagah's text is kept as an older version (siyagah-older), then this app's again (siyagah-kept)"],
  "no-online": [[[S, "const onOnline = () => kick();", "const onOnline = () => {};"]], "offline: back online, the waiting change goes by itself"],
  "queue-in-memory": [[[S, "try { rq = indexedDB.open(IDB_NAME, 1); }", "try { throw new Error(\"no storage\"); }"]], "closed: the change made in the embedded pane goes from the full Map later (the queue survived the page)"],
  // J112 D2 review: an embedded Notes pane SENDS (after a save, on a device that has connected), never at startup.
  "embed-never-sends": [[[J, "if (res?.queued && !siyagahBarHere()) sendFromHere();", ""]], "embedded: after a save the pane sends the Note to Siyagah itself (no second action), as ONE note.add"],
  "startup-loads-cloud": [[[J, "if (res?.queued && !siyagahBarHere()) sendFromHere();", "if (!siyagahBarHere()) sendFromHere();"]], "startup: an embedded pane loads nothing of Siyagah's before the first save (I9)"],
  "no-flag-check": [[[J, "if (!connected) { syncNeedsConnect = true; refreshSyncMarks(true); return; }", ""]], "closed: on a device never connected, the embedded pane sends nothing and loads nothing of Siyagah's"],
  "flag-never-written": [[["app/js/siyagah-map-link.js", 'try { localStorage.setItem(SIYAGAH_CONNECTED_KEY, "1"); } catch { /* private mode: the panes just wait */ }', ""]], "send: connecting in the Map marks this device as connected (for the embedded panes)"],
  "no-lock": [[[S, "const locks = globalThis.navigator?.locks;", "const locks = null;"]], "lock: while another tab holds the sender's lock, this tab sends nothing"],
  "trash-not-sent": [[[J, "queueSyncTrash(note, true); // J112 D2 review: to Siyagah's Trash too", ""]], "trash: moving the Note to Trash here sends ONE note.delete {id, base} (to Siyagah's Trash, Undo there)"],
  "restore-not-sent": [[[M, "if (l.base != null && !l.trashedHere) continue;", "if (l.base != null) continue;"]], "trash: restoring it here sends it back to Siyagah (note.add, the same id)"],
  "restore-id-stuck": [[[M, "} else if (outcome.kind === \"refused\" && inf.restore && /id already used/.test(outcome.why || \"\")) {", "} else if (false) {"]], "trash: Siyagah still holding that id in its Trash -> added back under a fresh id (x-msa-n-<note>.r1)"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`unknown mutation ${MUTATE}; known: ${Object.keys(MUTATIONS).join(", ")}`);
const SERVED = {};
if (MUTATE) for (const [file, a, b] of MUTATIONS[MUTATE][0]) { const key = file.replace(/^app/, ""); SERVED[key] = mutated(SERVED[key] ?? read(file), a, b); }

// --- pure: the model alone (served mutations apply here too) ------------------------------------------------------------
console.log("\n=== pure ===");
{
  const src = SERVED["/js/siyagah-sync-model.js"] ?? read(M);
  const m = await import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));
  const now = Date.parse("2026-11-07T06:00:00Z");
  let s = m.emptySyncState(now);
  const snap = m.noteSnapshot({ title: "T", bodyHtml: "<p>a</p>", folders: [{ role: "user", path: ["Alpha"] }] });
  const old = { noteId: "n1", updatedAtMs: Date.parse("2026-09-01T00:00:00Z"), createdAtMs: Date.parse("2026-08-01T00:00:00Z"), snapshot: snap };
  s = m.queueNote(s, old, now);
  check("pure: an older untouched Note is only remembered (base), nothing queued", !s.links.n1 && s.base.n1 === snap.hash, JSON.stringify(s));
  const snap2 = m.noteSnapshot({ title: "T", bodyHtml: "<p>b</p>", folders: [{ role: "user", path: ["Alpha"] }] });
  s = m.queueNote(s, { ...old, snapshot: snap2 }, now + 1000);
  check("pure: the same Note changed is queued once, with id x-msa-n-n1", s.links.n1?.want?.bodyHtml === "<p>b</p>" && s.links.n1.mmjId === "x-msa-n-n1" && !s.base.n1, JSON.stringify(s.links.n1));
  const again = m.queueNote(s, { ...old, snapshot: snap2 }, now + 2000);
  check("pure: the same snapshot again changes nothing", again === s);
  const copy = { tree: { folders: [{ id: "f-alpha", n: "Alpha", p: null, o: 0 }] }, notes: {} };
  const steps = m.planSync(s, copy);
  check("pure: planned: Primary is not needed; ONE note.add into f-alpha", steps.length === 1 && steps[0].op === "note.add" && JSON.stringify(steps[0].fields.folderIds) === '["f-alpha"]', JSON.stringify(steps));
}

const NB = "nb-mriuc27o-f44402";
const MMJ = `notebooks/${NB}/mmj`, MMJIN = `notebooks/${NB}/mmjin`;
check("POSITIVE CONTROL the shipped switch names this notebook", read("app/js/siyagah-cloud-readiness.js").includes(`notebookId: "${NB}"`));
const TREE = [{ id: "f-alpha", n: "Alpha", p: null, o: 0 }, { id: "f-other", n: "Other", p: null, o: 1 }];
const seedJs = () => `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  function TS(ms) { return { toMillis: function () { return ms; }, valueOf: function () { return ms; }, seconds: Math.floor(ms / 1000), nanoseconds: (ms % 1000) * 1e6 }; }
  window.__TS = TS;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d); }, toMillis: function () { return new Date(d).getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = [];
  function F(id, name, role, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: null, semanticRole: role, order: order, status: "active", updatedAt: ts("2026-09-01T10:00:00Z") }, own)); }
  function N(id, title, cur) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: "<p>Body of " + id + ".</p>", currentRevisionId: cur, status: "active", createdAt: ts("2026-08-01T09:00:00Z"), updatedAt: ts("2026-09-01T10:00:00Z") }, own));
    DATA.noteRevisions.push(Object.assign({ _id: "t1__" + cur, revisionId: cur, noteId: id, previousRevisionId: null, title: title, bodyHtml: "<p>Body of " + id + ".</p>", revisionReason: "created", actorUid: "test-uid", createdAt: new Date("2026-09-01T10:00:00Z") }, own)); }
  function P(id, note, folder) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: 0, status: "active" }, own)); }
  F("fSys", "Personal Journey Map", "journey-map", 0);
  F("fA", "Alpha", "user", 1);
  N("n1", "Alpha note", "r1"); P("p1", "n1", "fA");
  N("n2", "Waiting note", "r2"); P("p2", "n2", "fSys");
  N("n3", "Untouched note", "r3"); P("p3", "n3", "fA");
  DATA["${MMJ}"] = [{ _id: "t~0", v: 1, at: TS(1000), b: "v05.68", sec: { id: "mmj-sec", n: "Mapping My Journey" }, folders: ${JSON.stringify(TREE)} }];
  try { localStorage.setItem("msa-siyagah-mmj-open", "1"); localStorage.setItem("mmsa-journey-note-window.details", "1"); } catch (e) {}
  // A reload in this suite is a REAL reload: what the last page wrote is still there (the stub alone would forget it).
  try {
    var keep = JSON.parse(localStorage.getItem("__j112keep") || "null");
    if (keep) Object.keys(keep).forEach(function (k) {
      DATA[k] = keep[k].map(function (r) {
        var o = Object.assign({}, r);
        Object.keys(o).forEach(function (f) { var v = o[f]; if (v && typeof v === "object" && v.__ms !== undefined) o[f] = ts(v.__ms); if (v && typeof v === "object" && v.__ts !== undefined) o[f] = TS(v.__ts); });
        return o;
      });
    });
  } catch (e) {}
})();`;

const browser = await chromium.launch();
const allWrites = [];
async function newCtx({ lang = "en", width = 1280 } = {}) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: seedJs() });
  for (const [p, body] of Object.entries(SERVED)) await ctx.route((u) => u.pathname.endsWith(p), (r) => r.fulfill({ status: 200, contentType: p.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body }));
  return ctx;
}
async function openMap(ctx, { embed = false, watch = false } = {}) {
  const page = await ctx.newPage();
  if (watch) page.__siyagahLoads = siyagahLoads(page);
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}/app/journey-map.html${embed ? "?embed=1" : ""}#folders`, { waitUntil: "load" });
  await page.waitForFunction(() => document.getElementById("app")?.style.display === "block", null, { timeout: 20000 });
  await page.evaluate(() => { for (const e of document.querySelectorAll('[id*="splash"], .mm-splash-overlay')) e.remove(); });
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 2 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
  if (!embed) await page.waitForSelector("#siyagahCloudBar [data-mmj-tree]", { timeout: 15000, state: "attached" }).catch(() => {});
  await page.waitForTimeout(700);
  return { page, errors };
}
const nbWrites = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => String(w.col || "").startsWith("notebooks/")));
const reqs = async (page) => (await nbWrites(page)).filter((w) => w.col === `notebooks/nb-mriuc27o-f44402/mmjin`);
const revs = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "noteRevisions" && /siyagah/.test(w.data?.revisionReason || "")).map((w) => ({ reason: w.data.revisionReason, title: w.data.title, body: w.data.bodyHtml })));
async function gather(page) { allWrites.push(...(await nbWrites(page))); }
const emit = (page, col, row) => page.evaluate(([c, r]) => window.__stubEmit(c, r), [col, row]);
const answer = (page, req, extra) => emit(page, MMJIN, { _id: req.id, ...req.data, at: null, ...extra });
const emitNote = (page, note, atMs) => page.evaluate(([c, n, at]) => window.__stubEmit(c, { _id: "n~" + n.id, ...n, at: window.__TS(at) }), [MMJ, note, atMs]);
const emitTree = (page, folders, atMs) => page.evaluate(([c, f, at]) => window.__stubEmit(c, { _id: "t~0", v: 1, at: window.__TS(at), b: "v05.68", sec: { id: "mmj-sec", n: "Mapping My Journey" }, folders: f }), [MMJ, folders, atMs]);
const waitFor = (page, fn, arg, t = 6000) => page.waitForFunction(fn, arg, { timeout: t }).then(() => true, () => false);
const keys = (o) => Object.keys(o || {}).sort().join(",");
/** Keep what this page wrote (MSA's Notes and Siyagah's copy), close it, and open the Map again: a real reload. */
async function reopen(ctx, page, opts = {}) {
  await gather(page);
  await page.evaluate(([cols]) => {
    const keep = {};
    for (const k of cols) keep[k] = (window.__DATA[k] || []).map((r) => {
      const o = { ...r };
      for (const [f, v] of Object.entries(o)) {
        if (f === "at" && v && typeof v.toMillis === "function") o[f] = { __ts: v.toMillis() };
        else if (v instanceof Date) o[f] = { __ms: v.getTime() };
        else if (v && typeof v.toMillis === "function") o[f] = { __ms: v.toMillis() };
      }
      return o;
    });
    localStorage.setItem("__j112keep", JSON.stringify(keep));
  }, [["notes", "noteRevisions", "notePlacements", "noteFolders", MMJ, MMJIN]]);
  await page.close();
  return openMap(ctx, opts);
}
async function openNote(page, noteId, folderId) {
  await page.click(`.folder-row[data-folder-id="${folderId}"] [data-folder-name]`);
  await page.waitForSelector(`#folderNotes [data-note-leaf][data-note-id="${noteId}"] [data-note-open]`, { state: "visible" });
  await page.click(`#folderNotes [data-note-leaf][data-note-id="${noteId}"] [data-note-open]`);
  await page.waitForSelector("#notePane [data-pane-title]", { state: "visible" });
}
async function toggleEdit(page) {
  const vis = await page.evaluate(() => { const e = document.querySelector("#notePane [data-pane-bar] > [data-pane-edit-toggle]"); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).display !== "none"; });
  if (vis) await page.click("#notePane [data-pane-bar] > [data-pane-edit-toggle]");
  else { await page.click("#notePane [data-pane-menu-btn]"); await page.click("#notePane [data-pane-menu] [data-pane-edit-toggle]"); }
}
/** Edit the open Note's text (adds `words` at the end) and press Done: one revision through the page's own save. */
async function editNote(page, words) {
  await toggleEdit(page);
  await page.waitForSelector("#notePane [data-edit-body]");
  await page.evaluate(() => { const ed = document.querySelector("#notePane [data-edit-body]"); ed.focus(); const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  await page.keyboard.type(words);
  await toggleEdit(page);
  await page.waitForFunction(() => !document.querySelector("#notePane [data-edit-body]"), null, { timeout: 8000 }).catch(() => {});
}
const markText = (page) => page.evaluate(() => document.querySelector('#notePane [data-pane-chip="~siyagah"]')?.textContent.trim() || "");

function siyagahLoads(page) { const seen = []; page.on("request", (rq) => { if (/siyagah-cloud\.js|siyagah-mmj-data\.js|siyagah-mmj-write\.js/.test(rq.url())) seen.push(rq.url().replace(/^.*\//, "")); }); return seen; }

// --- the main run: en, computer ------------------------------------------------------------------------------------------
console.log("\n=== primary, old, send, unfiled, pull, conflict (en, 1280) ===");
try {
  const ctx = await newCtx();
  let { page, errors } = await openMap(ctx);
  const sysName = await page.evaluate(() => document.querySelector('.folder-row[data-folder-id="fSys"] [data-folder-name]')?.textContent.trim() || "");
  check("primary: the Map's folder for Notes not yet filed is called Primary", /^Primary\b/.test(sysName), sysName);
  check("send: connecting in the Map marks this device as connected (for the embedded panes)", (await page.evaluate(() => localStorage.getItem("msa-siyagah-connected"))) === "1");
  await page.waitForTimeout(1500);
  check("old: an older Note nobody changed is never sent to Siyagah", (await reqs(page)).length === 0, JSON.stringify(await reqs(page)));

  // send: n1 (in Alpha) edited here.
  await openNote(page, "n1", "fA");
  check("send: POSITIVE CONTROL before any change, the Note carries no Siyagah mark", (await markText(page)) === "", await markText(page));
  await editNote(page, " More words.");
  await waitFor(page, (c) => (window.__stubWriteData || []).some((w) => w.col === c), MMJIN);
  let r = await reqs(page);
  const add = r[0];
  check("send: ONE note.add: exactly {v,op,from,at,st,id,title,content,tags,folderIds}, from msa, id x-msa-n-<note>, the new text, tags [], into Siyagah's folder of the same name",
    r.length === 1 && add.kind === "set" && !add.merge && add.data.op === "note.add" && keys(add.data) === "at,content,folderIds,from,id,op,st,tags,title,v"
    && add.data.from === "msa" && add.data.id === "x-msa-n-n1" && /More words\./.test(add.data.content) && add.data.title === "Alpha note"
    && JSON.stringify(add.data.tags) === "[]" && JSON.stringify(add.data.folderIds) === '["f-alpha"]', JSON.stringify(r));
  check("send: no Approach, and nothing of the Note's link to its study, goes to Siyagah", !/approach/i.test(JSON.stringify(add?.data || {})));
  await waitFor(page, () => /Waiting to go to Siyagah/.test(document.querySelector('#notePane [data-pane-chip="~siyagah"]')?.textContent || ""));
  check("send: the Note says it is waiting to go to Siyagah", /Waiting to go to Siyagah/.test(await markText(page)), await markText(page));
  await answer(page, add, { st: "done", res: { id: add.data.id }, doneAt: 1 });
  await emitNote(page, { id: "x-msa-n-n1", title: add.data.title, content: add.data.content, folderIds: ["f-alpha"], updatedAt: "2026-11-07T01:00:00Z" }, 2000);
  const ok1 = await waitFor(page, () => /In Siyagah ✓/.test(document.querySelector('#notePane [data-pane-chip="~siyagah"]')?.textContent || ""));
  check("send: done and in Siyagah's copy -> the Note says In Siyagah ✓", ok1, await markText(page));
  await page.waitForTimeout(800);
  check("send: nothing more is sent once both copies agree", (await reqs(page)).length === 1, JSON.stringify((await reqs(page)).map((x) => x.data.op)));
  // The mark explains itself.
  await page.click('#notePane [data-pane-chip="~siyagah"]');
  const said = await page.evaluate(() => document.body.innerText);
  check("send: pressing the mark says in words what it means", /Its changes go there by themselves/.test(said));

  // unfiled: n2 (only in Primary) edited -> Primary made in Siyagah first, ONCE, then the note.
  ({ page, errors } = await reopen(ctx, page));
  check("send: after a reload, the Note still says In Siyagah ✓ and nothing is sent again", (await reqs(page)).length === 0, JSON.stringify((await reqs(page)).map((x) => x.data)));
  await openNote(page, "n2", "fSys");
  await editNote(page, " Unfiled words.");
  await waitFor(page, (c) => (window.__stubWriteData || []).filter((w) => w.col === c).length >= 1, MMJIN);
  r = await reqs(page);
  const fadd = r[0];
  check("unfiled: Primary is made in Siyagah FIRST, with exactly {v,op,from,at,st,id,name,parent} (id x-msa-primary, name Primary, at the top)",
    r.length === 1 && fadd.data.op === "folder.add" && keys(fadd.data) === "at,from,id,name,op,parent,st,v" && fadd.data.id === "x-msa-primary" && fadd.data.name === "Primary" && fadd.data.parent === null, JSON.stringify(r.map((x) => x.data)));
  // The copy changes (another note appears) before Siyagah answers: Primary is NOT asked again.
  await emitNote(page, { id: "other", title: "x", content: "<p>x</p>", folderIds: ["f-other"], updatedAt: "2026-11-07T01:30:00Z" }, 2100);
  await page.waitForTimeout(900);
  r = await reqs(page);
  check("unfiled: Primary is asked for ONCE, however often the copy changes before Siyagah answers", r.filter((x) => x.data.op === "folder.add").length === 1 && r.length === 1, JSON.stringify(r.map((x) => x.data.op)));
  await answer(page, fadd, { st: "done", res: { id: "x-msa-primary" }, doneAt: 1 });
  await emitTree(page, [...TREE, { id: "x-msa-primary", n: "Primary", p: null, o: 2 }], 2200);
  await waitFor(page, (c) => (window.__stubWriteData || []).filter((w) => w.col === c).length >= 2, MMJIN);
  r = await reqs(page);
  check("unfiled: then the Note goes into Siyagah's Primary", r.length === 2 && r[1].data.op === "note.add" && r[1].data.id === "x-msa-n-n2" && /Unfiled words\./.test(r[1].data.content || "") && JSON.stringify(r[1].data.folderIds) === '["x-msa-primary"]', JSON.stringify(r.map((x) => x.data)));
  await answer(page, r[1], { st: "done", res: { id: "x-msa-n-n2" }, doneAt: 1 });
  await emitNote(page, { id: "x-msa-n-n2", title: r[1].data.title, content: r[1].data.content, folderIds: ["x-msa-primary"], updatedAt: "2026-11-07T02:00:00Z" }, 2300);
  await waitFor(page, () => /In Siyagah ✓/.test(document.querySelector('#notePane [data-pane-chip="~siyagah"]')?.textContent || ""));

  // pull: Siyagah changed n1 -> it comes back as a revision; nothing goes back.
  ({ page, errors } = await reopen(ctx, page));
  const before = (await reqs(page)).length;
  await emitNote(page, { id: "x-msa-n-n1", title: "Alpha note, edited in Siyagah", content: "<p>Changed in Siyagah.</p>", folderIds: ["f-alpha"], updatedAt: "2026-11-07T03:00:00Z" }, 2400);
  await waitFor(page, () => (window.__stubWriteData || []).some((w) => w.col === "noteRevisions" && w.data?.revisionReason === "siyagah-sync"));
  const pulled = (await revs(page)).filter((x) => x.reason === "siyagah-sync");
  check("pull: Siyagah's newer copy comes back as a new revision of the Note (siyagah-sync), with its title and text",
    pulled.length === 1 && pulled[0].title === "Alpha note, edited in Siyagah" && /Changed in Siyagah\./.test(pulled[0].body), JSON.stringify(await revs(page)));
  await page.waitForTimeout(1200);
  check("pull: nothing is sent back to Siyagah for it", (await reqs(page)).length === before, JSON.stringify((await reqs(page)).slice(before).map((x) => x.data)));
  ({ page, errors } = await reopen(ctx, page));
  await page.waitForTimeout(1500);
  check("pull: after a reload, still nothing is sent back", (await reqs(page)).length === 0, JSON.stringify((await reqs(page)).map((x) => x.data)));
  const n1Title = await page.evaluate(() => document.querySelector('#folderNotes [data-note-id="n1"] [data-note-open]')?.textContent || "");

  // conflict, MSA later: Siyagah changed (an older time) while this app's edit went out.
  await openNote(page, "n1", "fA");
  await editNote(page, " Mine, later.");
  await waitFor(page, (c) => (window.__stubWriteData || []).some((w) => w.col === c), MMJIN);
  r = await reqs(page);
  const e1 = r[0];
  check("conflict: POSITIVE CONTROL this app's change goes as ONE note.edit against the agreed base", r.length === 1 && e1.data.op === "note.edit" && e1.data.base === "2026-11-07T03:00:00Z" && /Mine, later\./.test(e1.data.content || ""), JSON.stringify(r.map((x) => x.data)));
  await answer(page, e1, { st: "refused", why: "changed in Siyagah since", cur: "2026-11-07T03:30:00Z" });
  await emitNote(page, { id: "x-msa-n-n1", title: "Alpha note, edited in Siyagah", content: "<p>Siyagah, earlier.</p>", folderIds: ["f-alpha"], updatedAt: "2026-11-07T03:30:00Z" }, 2500);
  await waitFor(page, (c) => (window.__stubWriteData || []).filter((w) => w.col === c).length >= 2, MMJIN);
  const older = await revs(page);
  check("conflict, MSA later: Siyagah's text is kept as an older version (siyagah-older), then this app's again (siyagah-kept)",
    older.length === 2 && older[0].reason === "siyagah-older" && /Siyagah, earlier\./.test(older[0].body) && older[1].reason === "siyagah-kept" && /Mine, later\./.test(older[1].body), JSON.stringify(older));
  r = await reqs(page);
  check("conflict, MSA later: this app's text goes to Siyagah, against Siyagah's newer base",
    r.length === 2 && r[1].data.op === "note.edit" && r[1].data.base === "2026-11-07T03:30:00Z" && /Mine, later\./.test(r[1].data.content || ""), JSON.stringify(r.map((x) => x.data)));
  await answer(page, r[1], { st: "done", res: { id: "x-msa-n-n1" }, doneAt: 1 });
  await emitNote(page, { id: "x-msa-n-n1", title: "Alpha note, edited in Siyagah", content: r[1].data.content, folderIds: ["f-alpha"], updatedAt: "2026-11-07T04:00:00Z" }, 2600);
  await page.waitForTimeout(800);

  // conflict, Siyagah later.
  const rv0 = (await revs(page)).length;
  await editNote(page, " Mine, earlier.");
  await waitFor(page, (c) => (window.__stubWriteData || []).filter((w) => w.col === c).length >= 3, MMJIN);
  r = await reqs(page);
  await answer(page, r[2], { st: "refused", why: "changed in Siyagah since", cur: "2099-01-01T00:00:00Z" });
  await emitNote(page, { id: "x-msa-n-n1", title: "Siyagah wins", content: "<p>Siyagah, later.</p>", folderIds: ["f-alpha"], updatedAt: "2099-01-01T00:00:00Z" }, 2700);
  await waitFor(page, (n) => (window.__stubWriteData || []).filter((w) => w.col === "noteRevisions" && /siyagah/.test(w.data?.revisionReason || "")).length > n, rv0);
  const late = (await revs(page)).slice(rv0);
  check("conflict, Siyagah later: Siyagah's text comes back (siyagah-sync); this app's earlier text stays in the Note's versions",
    late.length === 1 && late[0].reason === "siyagah-sync" && late[0].title === "Siyagah wins", JSON.stringify(late));
  await page.waitForTimeout(900);
  check("conflict, Siyagah later: nothing more is sent", (await reqs(page)).length === 3, JSON.stringify((await reqs(page)).map((x) => x.data.op)));
  check("no page errors", errors.length === 0, errors.join(" | ").slice(0, 300));
  await gather(page);
  await ctx.close();
  void n1Title;
} catch (err) { crashed(err); }

// --- offline and back --------------------------------------------------------------------------------------------------
console.log("\n=== offline and back (en, 768) ===");
try {
  const ctx = await newCtx({ width: 768 });
  const { page } = await openMap(ctx);
  await page.evaluate(() => { window.__stubFailWrites = true; });
  await openNote(page, "n1", "fA");
  await editNote(page, " Offline words.");
  await page.waitForTimeout(1200);
  check("offline: POSITIVE CONTROL the request could not be written", (await reqs(page)).length === 0);
  check("offline: the Note says it is still waiting (nothing lost)", /Waiting to go to Siyagah/.test(await markText(page)), await markText(page));
  await page.evaluate(() => { window.__stubFailWrites = false; window.dispatchEvent(new Event("online")); });
  const went = await waitFor(page, (c) => (window.__stubWriteData || []).some((w) => w.col === c), MMJIN);
  const r = await reqs(page);
  check("offline: back online, the waiting change goes by itself", went && r.length === 1 && /Offline words\./.test(r[0].data.content || ""), JSON.stringify(r.map((x) => x.data)));
  await gather(page);
  await ctx.close();
} catch (err) { crashed(err); }

// --- closed: queued in an embedded pane, sent from the full Map later -----------------------------------------------------
console.log("\n=== closed: never connected (en, 390) ===");
try {
  const ctx = await newCtx({ width: 390 });
  let { page } = await openMap(ctx, { embed: true, watch: true });
  await openNote(page, "n2", "fSys");
  await editNote(page, " From the pane.");
  await page.waitForTimeout(1500);
  check("closed: on a device never connected, the embedded pane sends nothing and loads nothing of Siyagah's", (await nbWrites(page)).length === 0 && page.__siyagahLoads.length === 0, JSON.stringify([await nbWrites(page), page.__siyagahLoads]));
  check("closed: ...and the Note says how: open Mapping My Journey, then Connect", /open Mapping My Journey, then Connect/.test(await markText(page)), await markText(page));
  ({ page } = await reopen(ctx, page));
  const went = await waitFor(page, (c) => (window.__stubWriteData || []).some((w) => w.col === c), MMJIN, 8000);
  const r = await reqs(page);
  check("closed: the change made in the embedded pane goes from the full Map later (the queue survived the page)", went && r.some((x) => x.data.op === "folder.add" && x.data.id === "x-msa-primary"), JSON.stringify(r.map((x) => x.data)));
  await gather(page);
  await ctx.close();
} catch (err) { crashed(err); }

// --- embedded and connected: the pane sends by itself, after the save only --------------------------------------------------
console.log("\n=== embedded, connected (en, 390) ===");
try {
  const ctx = await newCtx({ width: 390 });
  await ctx.addInitScript(() => { try { localStorage.setItem("msa-siyagah-connected", "1"); } catch (e) {} });
  const { page } = await openMap(ctx, { embed: true, watch: true });
  await page.waitForTimeout(1500);
  check("startup: an embedded pane loads nothing of Siyagah's before the first save (I9)", page.__siyagahLoads.length === 0, JSON.stringify(page.__siyagahLoads));
  await openNote(page, "n1", "fA");
  await editNote(page, " Sent from the pane.");
  const went = await waitFor(page, (c) => (window.__stubWriteData || []).some((w) => w.col === c), MMJIN, 10000);
  const r = await reqs(page);
  check("embedded: after a save the pane sends the Note to Siyagah itself (no second action), as ONE note.add",
    went && r.length === 1 && r[0].data.op === "note.add" && r[0].data.id === "x-msa-n-n1" && /Sent from the pane\./.test(r[0].data.content || ""), JSON.stringify(r.map((x) => x.data)));
  check("embedded: POSITIVE CONTROL Siyagah's code was loaded only after the save", page.__siyagahLoads.includes("siyagah-cloud.js"), JSON.stringify(page.__siyagahLoads));
  await gather(page);
  await ctx.close();
} catch (err) { crashed(err); }

// --- one sender at a time across tabs ---------------------------------------------------------------------------------------
console.log("\n=== lock (en, 1280) ===");
try {
  const ctx = await newCtx();
  const other = await ctx.newPage();
  await other.goto(`${BASE}/app/index.html`, { waitUntil: "load" }).catch(() => {});
  await other.evaluate(() => { navigator.locks.request("msa-siyagah-sync|t1|p1", () => new Promise((r) => { window.__releaseLock = r; })); });
  const { page } = await openMap(ctx);
  await openNote(page, "n1", "fA");
  await editNote(page, " Two tabs.");
  await page.waitForTimeout(3500);
  check("lock: while another tab holds the sender's lock, this tab sends nothing", (await reqs(page)).length === 0, JSON.stringify((await reqs(page)).map((x) => x.data)));
  await other.evaluate(() => window.__releaseLock());
  await waitFor(page, (c) => (window.__stubWriteData || []).some((w) => w.col === c), MMJIN, 8000);
  await page.waitForTimeout(1200);
  const r = await reqs(page);
  check("lock: once it is free, the change goes ONCE", r.length === 1 && r[0].data.op === "note.add", JSON.stringify(r.map((x) => x.data)));
  await gather(page);
  await ctx.close();
} catch (err) { crashed(err); }

// --- Trash and restore ---------------------------------------------------------------------------------------------------
console.log("\n=== trash (en, 1280) ===");
try {
  const ctx = await newCtx();
  let { page } = await openMap(ctx);
  await openNote(page, "n1", "fA");
  await editNote(page, " Before Trash.");
  await waitFor(page, (c) => (window.__stubWriteData || []).some((w) => w.col === c), MMJIN);
  let r = await reqs(page);
  await answer(page, r[0], { st: "done", res: { id: "x-msa-n-n1" }, doneAt: 1 });
  await emitNote(page, { id: "x-msa-n-n1", title: r[0].data.title, content: r[0].data.content, folderIds: ["f-alpha"], updatedAt: "2026-11-07T01:00:00Z" }, 2000);
  await waitFor(page, () => /In Siyagah ✓/.test(document.querySelector('#notePane [data-pane-chip="~siyagah"]')?.textContent || ""));
  await page.click("#notePane [data-pane-menu-btn]");
  await page.click("#notePane [data-pane-menu] [data-pane-delete]");
  await page.waitForSelector("[data-note-delete-yes]", { state: "visible", timeout: 3000 });
  await page.click("[data-note-delete-yes]");
  await waitFor(page, (c) => (window.__stubWriteData || []).filter((w) => w.col === c).length >= 2, MMJIN);
  r = await reqs(page);
  const del = r[1];
  check("trash: moving the Note to Trash here sends ONE note.delete {id, base} (to Siyagah's Trash, Undo there)",
    r.length === 2 && del.data.op === "note.delete" && keys(del.data) === "at,base,from,id,op,st,v" && del.data.id === "x-msa-n-n1" && del.data.base === "2026-11-07T01:00:00Z", JSON.stringify(r.map((x) => x.data)));
  await answer(page, del, { st: "done", res: { id: "x-msa-n-n1" }, doneAt: 1 });
  await page.evaluate(([c]) => window.__stubEmit(c, { _id: "n~x-msa-n-n1", id: "x-msa-n-n1", gone: true, at: window.__TS(3000) }), [MMJ]);
  await page.waitForTimeout(900);
  check("trash: nothing more is sent while it is in both Trashes", (await reqs(page)).length === 2, JSON.stringify((await reqs(page)).map((x) => x.data.op)));
  // Restore from this app's Trash.
  await page.click("#openTrashBtn").catch(async () => { await page.evaluate(() => document.getElementById("openTrashBtn")?.click()); });
  await page.waitForSelector('[data-trash-note-id="n1"] [data-trash-restore]', { state: "attached", timeout: 6000 });
  await page.evaluate(() => document.querySelector('[data-trash-note-id="n1"] [data-trash-restore]').click());
  await waitFor(page, (c) => (window.__stubWriteData || []).filter((w) => w.col === c).length >= 3, MMJIN, 8000);
  r = await reqs(page);
  check("trash: restoring it here sends it back to Siyagah (note.add, the same id)", r.length === 3 && r[2].data.op === "note.add" && r[2].data.id === "x-msa-n-n1" && /Before Trash\./.test(r[2].data.content || ""), JSON.stringify(r.map((x) => x.data)));
  if (r[2]) await answer(page, r[2], { st: "refused", why: "id already used" });
  await waitFor(page, (c) => (window.__stubWriteData || []).filter((w) => w.col === c).length >= 4, MMJIN, 8000);
  r = await reqs(page);
  check("trash: Siyagah still holding that id in its Trash -> added back under a fresh id (x-msa-n-<note>.r1)", r.length === 4 && r[3].data.op === "note.add" && r[3].data.id === "x-msa-n-n1.r1", JSON.stringify(r.map((x) => [x.data.op, x.data.id])));
  await gather(page);
  await ctx.close();
} catch (err) { crashed(err); }

// --- bn, and the mark's layout at three widths ---------------------------------------------------------------------------
for (const [lang, width] of [["bn", 390], ["en", 390], ["bn", 768], ["en", 1280], ["bn", 1280]]) {
  console.log(`\n=== layout ${lang} ${width} ===`);
  try {
    const ctx = await newCtx({ lang, width });
    const { page } = await openMap(ctx);
    if (lang === "bn") {
      const sysName = await page.evaluate(() => document.querySelector('.folder-row[data-folder-id="fSys"] [data-folder-name]')?.textContent.trim() || "");
      check(`bn ${width}: Primary is in Bangla`, /প্রাথমিক/.test(sysName), sysName);
    }
    await openNote(page, "n1", "fA");
    await editNote(page, " Layout.");
    await waitFor(page, (c) => (window.__stubWriteData || []).some((w) => w.col === c), MMJIN);
    const add = (await reqs(page))[0];
    if (add) {
      await answer(page, add, { st: "done", res: { id: add.data.id }, doneAt: 1 });
      await emitNote(page, { id: "x-msa-n-n1", title: add.data.title, content: add.data.content, folderIds: ["f-alpha"], updatedAt: "2026-11-07T01:00:00Z" }, 2000);
    }
    await waitFor(page, () => /✓/.test(document.querySelector('#notePane [data-pane-chip="~siyagah"]')?.textContent || ""));
    const m = await page.evaluate(() => {
      const el = document.querySelector('#notePane [data-pane-chip="~siyagah"]');
      if (!el) return null;
      el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect(), pane = document.querySelector("#notePane").getBoundingClientRect();
      const cs = getComputedStyle(el);
      const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
      let bg = null, e = el;
      while (e) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) { bg = c; break; } e = e.parentElement; }
      const lum = (c) => { const [r1, g1, b1] = c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1; };
      const fg = rgb(cs.color); bg = bg || [255, 255, 255];
      const L1 = lum(fg), L2 = lum(bg);
      const chip = document.querySelector('#notePane [data-pane-chip]:not([data-pane-chip="~siyagah"])');
      return { chipH: chip ? chip.getBoundingClientRect().height : -1, text: el.textContent.trim(), w: r.width, h: r.height, left: r.left, right: r.right, pl: pane.left, pr: pane.right, vw: innerWidth,
        sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth, contrast: (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) };
    });
    check(`${lang} ${width}: the mark is shown (In Siyagah ✓)`, !!m && (lang === "bn" ? /সিয়াগাহ-এ আছে ✓/.test(m.text) : /In Siyagah ✓/.test(m.text)), JSON.stringify(m));
    if (lang === "bn") check(`bn: the mark is in Bangla`, !!m && /সিয়াগাহ-এ আছে ✓/.test(m.text), JSON.stringify(m));
    check(`${lang} ${width}: the mark sits inside the Note pane and the screen, no sideways scroll`, !!m && m.left >= m.pl - 1 && m.right <= m.pr + 1 && m.right <= m.vw + 1 && m.sideways <= 0, JSON.stringify(m));
    check(`${lang} ${width}: the mark is the same height as the folder chips beside it (32px or more), one tidy group`, !!m && m.h >= 31.5 && Math.abs(m.h - m.chipH) < 0.6, JSON.stringify(m));
    check(`${lang} ${width}: the mark's text contrast is 4.5 or more against its real background`, !!m && m.contrast >= 4.5, JSON.stringify(m));
    await gather(page);
    await ctx.close();
  } catch (err) { crashed(err); }
}

// --- only: Siyagah is written by request, nothing else --------------------------------------------------------------------
const bad = allWrites.filter((w) => !(w.kind === "set" && !w.merge && w.col === MMJIN));
check("only: every write on a notebooks/ path is a setDoc (no merge) into notebooks/<nb>/mmjin", allWrites.length > 0 && bad.length === 0, JSON.stringify(bad).slice(0, 300));

await browser.close();
console.log(`\n==== J112 D2 sync (MSA <-> Siyagah): ${pass} passed, ${fail} failed ====`);
if (MUTATE) {
  const want = MUTATIONS[MUTATE][1];
  const red = failed.includes(want) || failed.some((f) => f.endsWith(want));
  console.log(red ? `  PASS  mutation ${MUTATE} turns "${want}" red` : `  FAIL  mutation ${MUTATE} did NOT turn "${want}" red`);
  process.exit(red ? 0 : 1);
}
process.exit(fail ? 1 : 0);
