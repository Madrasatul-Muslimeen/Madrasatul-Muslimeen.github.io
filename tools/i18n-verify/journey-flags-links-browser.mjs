// Siyagah round 14 (issue #566, decision 66): Pin, Favourite, Archive, Finalise
// and links between Notes -- the ⋯ menu items, the 📌/🔒 marks, pinned-first and
// archived-hidden folder lists, the ⭐ Favourites and 📦 Archived lists, the
// finalised refusal, links and "Linked from", and the pinned strip in a window.
// Every action is driven through the REAL controls; the stub's write log is the
// proof.
//
// THE GATE. siyagah-flags-readiness.js was `ready: false` as first shipped
// (v09.72) and is OPEN since 4 Oct 2026 (see READY_CLOSED below). The gate-OFF
// cases route a CLOSED copy; the gate-ON cases route a REPLACEMENT
// copy of that one module in through ctx.route() -- the seam journey-tags-browser
// uses; production cannot reach it.
//
// MUTATION SEAM: MUTATE=a..e serves a deliberately broken copy of one file
// through the same seam, so a check can be shown to FAIL without editing a file.
//   a: a flag write also sends the title                (note-foundation.js)
//   b: unlinking writes status "active" instead         (note-foundation.js)
//   c: Edit is not refused on a finalised Note          (note-window.js)
//   d: an archived Note stays in the folder list        (journey-map.html)
//   e: the page's flag write ignores the closed gate    (journey-map.html)
// Run from the repository root with `node serve.js` running.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = process.env.MUTATE || (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);

// ---- the candidate's own field lists, read out of the file, never retyped ----
const CANDIDATE = fs.readFileSync("docs/governance/2026-10-04-siyagah-round14-DEPLOYMENT-candidate.rules", "utf8");
function listAfter(fn, kind) {
  const at = CANDIDATE.indexOf(`function ${fn}()`);
  if (at < 0) throw new Error(`candidate has no ${fn}()`);
  const m = new RegExp(`${kind}\\(\\[([^\\]]*)\\]\\)`).exec(CANDIDATE.slice(at));
  if (!m) throw new Error(`no ${kind} list after ${fn}()`);
  const out = [...m[1].matchAll(/'([A-Za-z]+)'/g)].map((x) => x[1]);
  if (out.length < 5) throw new Error(`implausibly short ${kind} list for ${fn}`);
  return out;
}
const FLAG_PATH = listAfter("onlyFlagsChange", "hasOnly"); // pinned favourite archived finalised updatedAt
const LINK_ALLOWED = listAfter("noteLinkShapeOk", "hasOnly");
const LINK_REQUIRED = listAfter("noteLinkShapeOk", "hasAll");

const READY_OPEN = `
export const SIYAGAH_FLAGS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const SIYAGAH_FLAGS_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-04", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isSiyagahFlagsReady() { return true; }
export function siyagahFlagsUnavailableReason() { return null; }
`;

// UPDATED IN PLACE 4 Oct 2026 (Owner: "Round 14 rules are live"): the shipped
// readiness file now says ready, so the gate-off cases can no longer use it as
// shipped. They route this CLOSED copy through the same ctx.route() seam the
// gate-on cases use, so the "shows, explains itself, writes nothing" contract
// stays tested for any future time the gate is shut.
const READY_CLOSED = `
export const SIYAGAH_FLAGS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const SIYAGAH_FLAGS_DECLARATION = Object.freeze({ ready: false, decision: null, gate: "E1", note: "test seam: closed" });
export function isSiyagahFlagsReady() { return false; }
export const REASON_SIYAGAH_FLAGS_NOT_DEPLOYED = "siyagah-flags-rules-not-deployed";
export const REASON_SIYAGAH_FLAGS_DECISION_INCOMPLETE = "siyagah-flags-readiness-decision-incomplete";
export function siyagahFlagsUnavailableReason() { return REASON_SIYAGAH_FLAGS_NOT_DEPLOYED; }
`;

async function routeText(ctx, glob, mutate) {
  const url = glob.replace("**/", "").replace(/\*$/, "");
  const file = url.startsWith("app/") ? url : `app/${url}`;
  let src = fs.readFileSync(file, "utf8");
  src = mutate(src);
  await ctx.route(glob, (route) => route.fulfill({ status: 200, contentType: glob.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src }));
}
function swap(src, from, to) {
  if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 50)}`);
  return src.replace(from, to);
}
async function routeMutation(ctx) {
  if (!MUTATE) return;
  if (MUTATE === "a") await routeText(ctx, "**/js/note-foundation.js", (s) => swap(s, "transaction.update(TENANT.NOTES, docId, fields);", "transaction.update(TENANT.NOTES, docId, { ...fields, title: note.title });"));
  else if (MUTATE === "b") await routeText(ctx, "**/js/note-foundation.js", (s) => swap(s, "transaction.update(TENANT.NOTE_LINKS, docId, { status });", "transaction.update(TENANT.NOTE_LINKS, docId, { status: NOTE_STATUS.ACTIVE });"));
  else if (MUTATE === "c") await routeText(ctx, "**/js/note-window.js", (s) => swap(s, 'if (host.flags?.on(note, "finalised")) {', "if (false) {"));
  else if (MUTATE === "d") await routeText(ctx, "**/app/journey-map.html*", (s) => swap(s, " && row.note.archived !== true)", ")"));
  else if (MUTATE === "e") await routeText(ctx, "**/app/journey-map.html*", (s) => swap(s, "async function setFlag(note, key, value) {\n      if (!flagsReady()) { showPageStatus(flagsGateSentence()); return false; }", "async function setFlag(note, key, value) {"));
  else throw new Error(`unknown mutation ${MUTATE}`);
}

const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteLinks = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, body, day) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  F("fSys", "Personal Journey Map", null, 0);
  F("fA", "Alpha", null, 0);
  N("n1", "Note One", "<p>First body.</p>", 1); N("n2", "Note Two", "<p>Second body.</p>", 2); N("n3", "Note Three", "<p>Third body.</p>", 3);
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1); P("p3", "n3", "fA", 2);
})();`;

const GATE_EN = "Pin, Favourite, Archive, Finalise and links switch on once the new Firebase Rules are published.";
const GATE_BN = "নতুন ফায়ারবেস নিয়ম প্রকাশিত হলেই পিন, প্রিয়, সংরক্ষণাগার, চূড়ান্ত করা ও লিংক চালু হবে।";
const hasBn = (s) => /[ঀ-৿]/.test(s || "");

async function resetWrites(page) { await page.evaluate(() => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); }); }
async function writes(page) {
  return page.evaluate(() => (window.__stubWriteData || []).map((w) => ({ col: w.col, id: w.id, op: w.kind.replace(/^tx-/, ""), keys: Object.keys(w.data || {}), data: w.data })));
}
const status = (page) => page.evaluate(() => { const e = document.getElementById("pageStatusMsg"); return e && getComputedStyle(e).display !== "none" ? e.textContent : ""; });
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
const smallTargets = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 39.5 || r.width < 39.5) && getComputedStyle(e).display !== "none"; }).map((e) => `${e.tagName}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`), sel);
async function waitTree(page) {
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 2 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
}
const leafIds = (page) => page.$$eval("#folderNotes [data-note-leaf]", (els) => els.map((e) => e.dataset.noteId));
const leafTitle = (id) => `#folderNotes [data-note-leaf][data-note-id="${id}"] [data-note-open]`;
async function showList(page) {
  const showing = await page.evaluate(() => getComputedStyle(document.getElementById("folderNotes")).display !== "none" && !!document.querySelector("#folderNotes [data-note-leaf]"));
  if (!showing) {
    await page.evaluate(() => { const b = document.querySelector("#notePane:not([hidden]) [data-pane-back]"); if (b) b.click(); });
    if (await page.isVisible("#folderNotes [data-list-back]")) await page.click("#folderNotes [data-list-back]");
    await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
    await page.waitForSelector("#folderNotes [data-note-leaf]", { state: "visible" });
  }
}
async function pageMenuItem(page, id) {
  await page.evaluate(() => { const b = document.querySelector("#notePane:not([hidden]) [data-pane-back]"); if (b) b.click(); });
  if (!(await vis(page, '[data-bar-palette-toggle="pageMenu"]')) && await page.isVisible("#folderNotes [data-list-back]")) await page.click("#folderNotes [data-list-back]");
  await page.click('[data-bar-palette-toggle="pageMenu"]');
  await page.click(id);
}
async function openLeaf(page, id) { await showList(page); await page.click(leafTitle(id)); await page.waitForSelector(`#notePane:not([hidden]) [data-pane-title]`); }
const paneMenu = async (page, sel) => {
  await page.click("#notePane [data-pane-menu-btn]");
  await page.waitForSelector(`#notePane [data-pane-menu] ${sel}`, { state: "visible" });
  await page.click(`#notePane [data-pane-menu] ${sel}`);
};
const noteRow = (page, id) => page.evaluate((i) => JSON.parse(JSON.stringify((window.__DATA.notes || []).find((n) => n.noteId === i))), id);
const noteWrites = (ws) => ws.filter((w) => w.col === "notes");
const linkWrites = (ws) => ws.filter((w) => w.col === "noteLinks");

const browser = await chromium.launch();

for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1440]) {
    // =============================== GATE ON (forced) ===============================
    {
      const tag = `ON ${lang} ${width}px`;
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
      await ctx.route("**/js/siyagah-flags-readiness.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_OPEN }));
      await routeMutation(ctx);
      await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
      const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
      await waitTree(page);
      await showList(page);
      check(`${tag}: POSITIVE CONTROL -- three Notes are listed in order`, JSON.stringify(await leafIds(page)) === '["n1","n2","n3"]', JSON.stringify(await leafIds(page)));

      // ---- Pin n3: writes only the flag, no revision; it leads the list with a 📌 ----
      await openLeaf(page, "n3");
      await resetWrites(page);
      await paneMenu(page, '[data-pane-flag="pinned"]');
      await page.waitForFunction(() => document.querySelector("#notePane [data-flag-chip='pinned']"));
      let w = await writes(page);
      check(`${tag}: Pin wrote exactly one Note update`, noteWrites(w).length === 1 && noteWrites(w)[0].op === "update", JSON.stringify(w.map((x) => [x.col, x.op])));
      check(`${tag}: Pin writes ONLY the flag (and updatedAt) -- inside the candidate's flag path`, noteWrites(w).every((x) => x.keys.every((k) => FLAG_PATH.includes(k)) && x.data.pinned === true && !x.keys.includes("title") && !x.keys.includes("currentRevisionId")), JSON.stringify(noteWrites(w).map((x) => x.keys)));
      check(`${tag}: Pin made no revision`, w.every((x) => x.col !== "noteRevisions"));
      await showList(page);
      check(`${tag}: the pinned Note leads the folder list`, (await leafIds(page))[0] === "n3", JSON.stringify(await leafIds(page)));
      check(`${tag}: the pinned Note carries a 📌 mark`, (await page.textContent(leafTitle("n3"))).includes("📌"));

      // ---- Favourite n1, then the ⭐ Favourites list ----
      await openLeaf(page, "n1");
      await paneMenu(page, '[data-pane-flag="favourite"]');
      await page.waitForFunction(() => document.querySelector("#notePane [data-flag-chip='favourite']"));
      await pageMenuItem(page, "#openFavouritesBtn");
      await page.waitForSelector('#siyagahDialog [data-flag-list="favourite"]');
      const favs = await page.$$eval("#siyagahDialog [data-flag-list-open]", (els) => els.map((e) => e.dataset.flagListOpen));
      check(`${tag}: the Favourites list holds exactly the favourite Note`, JSON.stringify(favs) === '["n1"]', JSON.stringify(favs));
      check(`${tag}: the Favourites list shows no gate sentence once on`, !(await vis(page, "[data-flags-gate-note]")));
      check(`${tag}: the Favourites targets are 40px or more`, (await smallTargets(page, "#siyagahDialog button")).length === 0, JSON.stringify(await smallTargets(page, "#siyagahDialog button")));
      if (lang === "bn") check(`${tag}: the Favourites dialog title is in Bangla`, hasBn(await page.textContent("#siyagahDialogTitle")));
      await page.click("#siyagahDialog [data-dialog-cancel]");
      await page.waitForFunction(() => !document.getElementById("siyagahDialog"));

      // ---- Finalise n1: Edit refused in words, Trash refused; Un-finalise reopens ----
      await openLeaf(page, "n1");
      await paneMenu(page, '[data-pane-flag="finalised"]');
      await page.waitForFunction(() => document.querySelector("#notePane [data-flag-chip='finalised']"));
      check(`${tag}: a finalised Note shows 🔒`, (await page.textContent("#notePane [data-flag-chip='finalised']")).includes("🔒"));
      await resetWrites(page);
      await page.evaluate(() => document.querySelector("#notePane [data-pane-edit-toggle]").click());
      await page.waitForTimeout(300);
      check(`${tag}: Edit on a finalised Note opens no editor`, !(await vis(page, "#notePane .ed-wrap")));
      const refused = await status(page);
      check(`${tag}: the refusal is in words (${lang})`, refused.length > 10 && (lang === "bn" ? hasBn(refused) : refused.includes("finalised")), refused);
      await page.click("#notePane [data-pane-menu-btn]");
      await page.click("#notePane [data-pane-menu] [data-pane-delete]");
      await page.waitForTimeout(400);
      check(`${tag}: Trash on a finalised Note is refused in words`, (await status(page)).length > 10 && (lang === "bn" ? hasBn(await status(page)) : (await status(page)).includes("finalised")), await status(page));
      check(`${tag}: neither the refused edit nor the refused Trash wrote anything`, (await writes(page)).length === 0, JSON.stringify((await writes(page)).map((x) => [x.col, x.op])));
      check(`${tag}: the Note is still active`, (await noteRow(page, "n1")).status === "active");
      await paneMenu(page, '[data-pane-flag="finalised"]');
      await page.waitForFunction(() => !document.querySelector("#notePane [data-flag-chip='finalised']"));
      await page.evaluate(() => document.querySelector("#notePane [data-pane-edit-toggle]").click());
      await page.waitForSelector("#notePane .ed-wrap", { state: "attached", timeout: 5000 }).catch(() => {});
      check(`${tag}: after Un-finalise, Edit opens the editor again`, await vis(page, "#notePane .ed-wrap"));
      await page.evaluate(() => document.querySelector("#notePane [data-pane-edit-toggle]").click());
      await page.waitForTimeout(400);

      // ---- Archive n2: it leaves the folder list, appears in Archived, comes back ----
      await openLeaf(page, "n2");
      await paneMenu(page, '[data-pane-flag="archived"]');
      await page.waitForFunction(() => document.querySelector("#notePane [data-flag-chip='archived']"));
      await showList(page);
      check(`${tag}: an archived Note leaves the folder list`, !(await leafIds(page)).includes("n2"), JSON.stringify(await leafIds(page)));
      check(`${tag}: archiving deleted nothing (the Note is still active)`, (await noteRow(page, "n2")).status === "active" && (await noteRow(page, "n2")).archived === true);
      await pageMenuItem(page, "#openArchivedBtn");
      await page.waitForSelector('#siyagahDialog [data-flag-list="archived"] [data-flag-list-open="n2"]');
      await resetWrites(page);
      await page.click("#siyagahDialog [data-flag-list-unarchive]");
      await page.waitForFunction(() => !document.getElementById("siyagahDialog"));
      check(`${tag}: Bring back writes only the archived flag`, noteWrites(await writes(page)).every((x) => x.keys.every((k) => FLAG_PATH.includes(k)) && x.data.archived === false));
      await showList(page);
      check(`${tag}: the brought-back Note is in the folder list again`, (await leafIds(page)).includes("n2"));

      // ---- Links: n1 -> n2, "Linked from" on n2, retire ----
      await openLeaf(page, "n1");
      await resetWrites(page);
      await paneMenu(page, "[data-pane-link]");
      await page.waitForSelector("[data-link-picker]");
      check(`${tag}: the link picker shows no gate sentence once on`, !(await vis(page, "[data-link-gate]")));
      check(`${tag}: the picker does not offer the Note itself`, (await page.$('[data-link-pick="n1"]')) === null);
      check(`${tag}: the picker's targets are 40px or more`, (await smallTargets(page, "[data-link-picker] button, [data-link-picker] input")).length === 0, JSON.stringify(await smallTargets(page, "[data-link-picker] button, [data-link-picker] input")));
      await page.fill("[data-link-search]", "two");
      check(`${tag}: the picker searches by title`, JSON.stringify(await page.$$eval("[data-link-pick]", (e) => e.map((x) => x.dataset.linkPick))) === '["n2"]');
      await page.click('[data-link-pick="n2"]');
      await page.waitForFunction(() => !document.querySelector("[data-link-picker]"));
      w = await writes(page);
      const created = linkWrites(w).filter((x) => x.op === "set" || x.op === "create");
      check(`${tag}: linking creates exactly one noteLinks document`, created.length === 1, JSON.stringify(w.map((x) => [x.col, x.op])));
      check(`${tag}: the link carries only fields the candidate allows and every required one`, created.every((x) => x.keys.every((k) => LINK_ALLOWED.includes(k)) && LINK_REQUIRED.every((k) => x.keys.includes(k) || ["schemaVersion", "createdAt", "updatedAt", "createdBy"].includes(k))), JSON.stringify(created.map((x) => x.keys)));
      check(`${tag}: the link points from n1 to n2, active`, created.every((x) => x.data.fromNoteId === "n1" && x.data.toNoteId === "n2" && x.data.status === "active"));
      check(`${tag}: linking touched no Note and made no revision`, w.every((x) => x.col !== "notes" && x.col !== "noteRevisions"));
      await page.waitForSelector("#notePane [data-links-out] [data-link-open='n2']");
      check(`${tag}: the Note shows its link to Note Two`, (await page.textContent("#notePane [data-links-out]")).includes("Note Two"));
      check(`${tag}: the link buttons are 40px or more`, (await smallTargets(page, "[data-note-links] button")).length === 0, JSON.stringify(await smallTargets(page, "[data-note-links] button")));
      // the backlink, from the other side, opened by tapping the link
      await page.click("#notePane [data-links-out] [data-link-open='n2']");
      await page.waitForSelector('.note-win[data-note-id="n2"] [data-links-in] [data-link-open="n1"]');
      check(`${tag}: Note Two shows "Linked from" Note One`, (await page.textContent('.note-win[data-note-id="n2"] [data-links-in]')).includes("Note One"));
      if (lang === "bn") check(`${tag}: the Linked from heading is in Bangla`, hasBn(await page.textContent('.note-win[data-note-id="n2"] [data-links-in-head]')));
      check(`${tag}: a backlink cannot be removed from the far side (no ✕ there)`, (await page.$('.note-win[data-note-id="n2"] [data-links-in] [data-link-remove]')) === null);
      // UPDATED IN PLACE 5 Oct 2026 (Owner approved the pinned side-panel demo): the strip is now a
      // side panel the window's 📌 Pinned button opens. n3 is pinned.
      await page.click('.note-win[data-note-id="n2"] [data-win-pins-toggle]');
      check(`${tag}: the pop-up window's 📌 Pinned panel shows Note Three`, await vis(page, '.note-win[data-note-id="n2"] [data-win-pinned]') && (await page.textContent('.note-win[data-note-id="n2"] [data-win-pinned]')).includes("Note Three"));
      // retire from n1 (the window is closed first: on a phone it covers the pane)
      await page.evaluate(() => document.querySelector(".note-win [data-win-close]").click());
      await page.waitForFunction(() => !document.querySelector(".note-win"));
      await resetWrites(page);
      await page.click("#notePane [data-links-out] [data-link-remove]");
      await page.waitForFunction(() => !document.querySelector("[data-links-out]") && !document.querySelector("[data-links-in]"));
      w = await writes(page);
      check(`${tag}: removing a link RETIRES it (one update, status retired, nothing deleted)`, linkWrites(w).length === 1 && linkWrites(w)[0].op === "update" && linkWrites(w)[0].data.status === "retired", JSON.stringify(linkWrites(w).map((x) => [x.op, x.data])));
      check(`${tag}: the retired link is gone from both Notes`, !(await vis(page, "[data-note-links]")));
      check(`${tag}: no sideways scroll`, await noSideways(page));
      // The finalised Trash refusal is logged on purpose by the page's folder-refusal path (the reader sees the sentence).
      check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|\[folder refusal\].*finalised/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
      await ctx.close();
    }

    // =============================== GATE OFF (a CLOSED copy routed in; the shipped file is open since 4 Oct 2026) ===============================
    {
      const tag = `OFF ${lang} ${width}px`;
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
      await ctx.route("**/js/siyagah-flags-readiness.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_CLOSED }));
      await routeMutation(ctx);
      await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
      const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
      await waitTree(page);
      await openLeaf(page, "n1");
      await resetWrites(page);
      const gate = lang === "en" ? GATE_EN : GATE_BN;
      await page.click("#notePane [data-pane-menu-btn]");
      for (const f of ["pinned", "favourite", "archived", "finalised"]) {
        check(`${tag}: the ${f} control shows`, await vis(page, `#notePane [data-pane-menu] [data-pane-flag="${f}"]`));
      }
      check(`${tag}: the Link to a Note control shows`, await vis(page, "#notePane [data-pane-menu] [data-pane-link]"));
      await page.click('#notePane [data-pane-menu] [data-pane-flag="pinned"]');
      await page.waitForTimeout(300);
      check(`${tag}: Pin says the sentence in words`, (await status(page)).trim() === gate, await status(page));
      await page.click("#notePane [data-pane-menu-btn]");
      await page.click('#notePane [data-pane-menu] [data-pane-flag="finalised"]');
      await page.waitForTimeout(300);
      check(`${tag}: Finalise writes nothing and the Note does not change`, (await writes(page)).length === 0 && (await noteRow(page, "n1")).finalised === undefined, JSON.stringify(await writes(page)));
      await paneMenu(page, "[data-pane-link]");
      await page.waitForSelector("[data-link-picker]");
      check(`${tag}: the link picker says the sentence`, (await page.textContent("[data-link-gate]")).trim() === (lang === "en" ? "Links switch on once the new Firebase Rules are published." : "নতুন ফায়ারবেস নিয়ম প্রকাশিত হলেই লিংক চালু হবে।"));
      check(`${tag}: the picker's choices are off`, await page.evaluate(() => [...document.querySelectorAll("[data-link-pick]")].every((b) => b.disabled)));
      await page.click("[data-link-close]");
      await pageMenuItem(page, "#openFavouritesBtn");
      await page.waitForSelector("#siyagahDialog [data-flags-gate-note]");
      check(`${tag}: the Favourites list says the sentence`, (await page.textContent("#siyagahDialog [data-flags-gate-note]")).trim() === gate);
      check(`${tag}: nothing was written anywhere`, (await writes(page)).length === 0, JSON.stringify(await writes(page)));
      check(`${tag}: no sideways scroll`, await noSideways(page));
      check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0);
      await ctx.close();
    }
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (MUTATE=${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
