// UPDATED IN PLACE (J05 wiring round, 4 Nov 2026): the patch is applied, and journey-map.html now gives its OWN questionCardFor (the
// Note made in its window from Quran Study). An object literal keeps the LAST of two equal keys, so the route below renames the page's
// hook before adding this test's, which stays first; "no hook" then means no hook at all, as before. Without the rename the
// page's hook (no Approach in this address) would answer [] and the "with the hook" checks would test nothing of the window.
// The hook also hands over QUESTION_CARD_CSS, the shape the applied patch takes (the window no longer imports it).
// J05 question card in the shared Note window (QR Lead, 4 Nov 2026), against the PATCH app/js/note-window.js carries:
// a page that gives host.questionCardFor(note) -> [{id,text}] gets those questions as buttons above the toolbar WHILE EDITING;
// a tap adds the question as an <h3> to answer under (and a paragraph after it); [] / no hook draws nothing; the card is gone
// when editing ends. The test gives the hook to journey-map.html through a route (the page itself is not changed here).
// Run from the repository root, serve.js on :8080.
import { chromium, newContext, openPage } from "./harness.mjs";
import { QUESTION_CARD_CSS } from "../../app/js/critical-reasoning-guides.js";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error("promise"); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const ev = (page, f, a) => page.evaluate(f, a);
const browser = await chromium.launch();
const hx = (id) => id.slice(1).repeat(32); // "n2" -> a real-shaped 32-hex id (Journaling evidence needs one)
// Mapping My Journey: Alpha{n1,n2,n3}
const SEED = (owner) => `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "${owner}", ownerUid: "test-uid", schemaVersion: 1, createdBy: "test-uid" };
  function ts() { return { toDate: function () { return new Date("2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date("2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteSources = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(l, title) { var id = l.slice(1).repeat(32); DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: "<p>" + title + " body</p>", currentRevisionId: "rev-" + id, status: "active", visibility: "private", createdAt: ts(), updatedAt: ts() }, own));
    DATA.noteSources.push(Object.assign({ _id: "t1__s-" + id, sourceLinkId: "s-" + id, noteId: id, sourceKey: "ayah:2:255", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active", createdAt: ts(), updatedAt: ts() }, own)); }
  function P(id, l, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: l.slice(1).repeat(32), folderId: folder, order: order, status: "active" }, own)); }
  F("fA", "Alpha", null, 0);
  N("n1", "Note One"); N("n2", "Note Two"); N("n3", "Note Three");
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1); P("p3", "n3", "fA", 2);
})();`;
// The host hands over the card's look too (host.questionCardCss): the shared window imports nothing of Quran Study (I2).
const HOOKS = ["", "questionCardFor: () => [{ id: 'q1', text: 'What did I read?' }, { id: 'q2', text: 'What would show I am wrong?' }],\n"
  + `questionCardCss: ${JSON.stringify(QUESTION_CARD_CSS)},\n`];
for (const [label, hook] of [["with the hook", HOOKS[1]], ["no hook", ""]]) {
  for (const width of [360, 1024]) {
    const tag = `[${label} ${width}]`;
    const ctx = await newContext(browser, { banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED("p1") });
    await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
    await ctx.route("**/app/journey-map.html*", async (r) => { const res = await r.fetch(); const body = await res.text(); r.fulfill({ response: res, body: body.replace("questionCardFor: (note) => {", "questionCardForPage: (note) => {").replace("get questionCardCss()", "get questionCardCssPage()").replace("const noteViews = createNoteViews({", "const noteViews = createNoteViews({\n" + hook) }); });
    const { page } = await openPage(ctx, "/app/journey-map.html");
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
    await page.waitForSelector("#folderNotes [data-note-leaf]", { state: "visible" });
    await page.click(`#folderNotes [data-note-leaf][data-note-id="${hx("n1")}"] [data-note-open]`);
    await page.waitForSelector("#notePane:not([hidden])");
    const card = () => ev(page, () => { const c = document.querySelector("#notePane [data-question-card-host]"); if (!c) return null; const r = c.getBoundingClientRect(); return { shown: getComputedStyle(c).display !== "none" && r.height > 0, n: c.querySelectorAll("[data-question-id]").length, minH: Math.min(...[...c.querySelectorAll("button")].map((b) => b.getBoundingClientRect().height), 99), inside: r.right <= innerWidth + 1 }; });
    const before = await card();
    check(`${tag} not editing: no card shown`, !before || !before.shown, JSON.stringify(before));
    const direct = "#notePane [data-pane-bar] > [data-pane-edit-toggle]";
    if (await ev(page, (s) => { const e = document.querySelector(s); return !!e && e.getBoundingClientRect().width > 0; }, direct)) await page.click(direct);
    else { await page.click("#notePane [data-pane-menu-btn]"); await page.click("#notePane [data-pane-menu] [data-pane-edit-toggle]"); }
    await page.waitForSelector("#notePane [data-edit-body]", { state: "visible" });
    const c = await card();
    if (hook) {
      check(`${tag} editing: the two questions are buttons above the toolbar, 40px, inside the screen`, !!c && c.shown && c.n === 2 && c.minH >= 39.5 && c.inside, JSON.stringify(c));
      await page.click("#notePane [data-edit-body]"); await page.keyboard.press("Control+End");
      await page.click("#notePane [data-question-id='q1']");
      const body = await ev(page, () => document.querySelector("#notePane [data-edit-body]").innerHTML);
      check(`${tag} a tap adds the question as a heading with a paragraph after it`, /<h3[^>]*>What did I read\?<\/h3>\s*<p>/.test(body), body.slice(-200));
      await page.click("#notePane [data-pane-edit-toggle], #notePane [data-pane-menu-btn]").catch(() => {});
    } else {
      check(`${tag} editing, no hook: no card`, !c || (!c.shown && c.n === 0), JSON.stringify(c));
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
