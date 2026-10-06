// S11 (Siyagah folder plan, 4 Oct 2026, decision 66): Mapping My Journey -- the reading tools in the Note pane's bar:
// 🔍 Find in this Note, ⇅ Open / close all headings, ☰ Contents on every width, 🕘 Versions (and "Bring this version back"),
// 📎 Folders and tags in one place. Real input (mouse, keyboard); writes proved through the stub's own data.
// Run from the repository root with `node serve.js` running.
//   --mutate-restore-overwrites   "Bring this version back" also overwrites the old revision it brings back
//   --mutate-find-first-only      Find marks only the first hit
//   --mutate-contents-hidden-phone  ☰ Contents is hidden below 600px
//   --mutate-foldall-noop         ⇅ never folds anything
//   --mutate-no-tags              the 📎 sheet has no tags part
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = process.argv.find((a) => a.startsWith("--mutate-"))?.slice(9) ?? null;
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const FILL = (n, w) => Array.from({ length: n }, (_, i) => `<p>${w} filler line ${i + 1} to give this section some height so the headings sit far apart.</p>`).join("");
const BODY = `<h2>Alpha heading</h2><p>First apple here.</p>${FILL(10, "Alpha")}<h3>Gamma sub</h3><p>An apple in the sub heading. আল্লাহ মহান।</p>${FILL(6, "Gamma")}<h2>Beta heading</h2><p>Apple again. আল্লাহ আবার।</p>${FILL(10, "Beta")}<h2>Delta heading</h2><p>The last section.</p>${FILL(10, "Delta")}`;
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true;
  window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d); }, toMillis: function () { return new Date(d).getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = [];
  function F(id, name, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: null, semanticRole: "user", order: order, status: "active", updatedAt: ts("2024-09-01T10:00:00Z") }, own)); }
  function R(id, title, body, day, prev) { DATA.noteRevisions.push(Object.assign({ _id: "t1__" + id, revisionId: id, noteId: "n1", previousRevisionId: prev, title: title, bodyHtml: body, revisionReason: "content-update", actorUid: "test-uid", createdAt: new Date("2024-09-0" + day + "T0" + day + ":15:00Z") }, own)); }
  F("fA", "Alpha", 0); F("fB", "Beta", 1);
  DATA.notes.push(Object.assign({ _id: "t1__n1", noteId: "n1", title: "Reading Note", bodyHtml: ${JSON.stringify(BODY)}, currentRevisionId: "r3", status: "active", createdAt: ts("2024-08-01T09:00:00Z"), updatedAt: ts("2024-09-03T10:00:00Z") }, own));
  DATA.notes.push(Object.assign({ _id: "t1__n2", noteId: "n2", title: "Note Two", bodyHtml: "<p>Two.</p>", currentRevisionId: "r-n2", status: "active", createdAt: ts("2024-08-02T09:00:00Z"), updatedAt: ts("2024-09-02T10:00:00Z") }, own));
  R("r1", "Reading Note v1", "<p>Version ONE text.</p>", 1, null);
  R("r2", "Reading Note v2", "<h2>Old heading</h2><p>Version TWO text.</p>", 2, "r1");
  R("r3", "Reading Note", ${JSON.stringify(BODY)}, 3, "r2");
  DATA.notePlacements.push(Object.assign({ _id: "t1__p1", placementId: "p1", noteId: "n1", folderId: "fA", order: 0, status: "active" }, own));
  DATA.notePlacements.push(Object.assign({ _id: "t1__p2", placementId: "p2", noteId: "n2", folderId: "fA", order: 1, status: "active" }, own));
})();`;

const browser = await chromium.launch();
const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const noSideways = (pg) => pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const dataOf = (pg, col) => pg.evaluate((c) => JSON.parse(JSON.stringify(window.__DATA[c] || [])), col);
async function resetWrites(pg) { await pg.evaluate(() => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); }); }
async function writes(pg) {
  return pg.evaluate(() => {
    const tx = JSON.parse(sessionStorage.getItem("__stubWrites") || "[]").map((w) => ({ col: w.col, id: w.id, op: w.op || "update" }));
    const other = (window.__stubWriteData || []).map((w) => ({ col: w.col, id: w.id, op: w.kind }));
    return [...tx, ...other];
  });
}
async function waitTree(pg) {
  await pg.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 2 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
}
async function toTree(pg) { if (await pg.isVisible("[data-pane-back]")) await pg.click("[data-pane-back]"); if (await pg.isVisible("#folderNotes [data-list-back]")) await pg.click("#folderNotes [data-list-back]"); }
async function openNote(pg, folderId, noteId) {
  await toTree(pg);
  await pg.click(`.folder-row[data-folder-id="${folderId}"] [data-folder-name]`);
  await pg.waitForSelector("#folderNotes [data-fn-title]", { state: "visible" });
  await pg.click(`#folderNotes [data-note-id="${noteId}"] [data-note-open]`);
  await pg.waitForSelector("[data-pane-title]", { state: "visible" });
  await wait(400);
}
const barMetrics = (pg) => pg.evaluate(() => {
  const b = document.querySelector("[data-pane-bar]"), br = b.getBoundingClientRect();
  const kids = [...b.children].filter((c) => getComputedStyle(c).display !== "none" && c.getBoundingClientRect().width > 0);
  return {
    h: br.height, sw: b.scrollWidth, cw: b.clientWidth, menuH: document.querySelector("[data-pane-menu-btn]").getBoundingClientRect().height,
    cut: kids.some((c) => { const r = c.getBoundingClientRect(); return r.right > br.right + 1 || r.left < br.left - 1; }),
    inBar: kids.map((c) => c.dataset.paneFindToggle !== undefined ? "find" : c.dataset.paneFoldall !== undefined ? "foldall" : c.dataset.paneAttach !== undefined ? "attach" : c.dataset.paneContentsWrap !== undefined ? "contents" : "").filter(Boolean),
  };
});
/** Press a reading tool the way a person would: its button when it is on the bar, else through the ⋯ menu. */
async function useTool(pg, attr) {
  const direct = `[data-pane-bar] > [${attr}]`;
  if (await pg.isVisible(direct)) { await pg.click(direct); return "bar"; }
  await pg.click("[data-pane-menu-btn]:visible");
  await pg.waitForSelector(`[data-pane-menu] [${attr}]`, { state: "visible" });
  await pg.click(`[data-pane-menu] [${attr}]`);
  return "menu";
}
const findCount = (pg) => pg.evaluate(() => document.querySelector("[data-find-count]").textContent.trim());
const marks = (pg) => pg.evaluate(() => ({ n: document.querySelectorAll("#notePane mark.note-find-hit").length, cur: [...document.querySelectorAll("#notePane mark.note-find-hit")].findIndex((m) => m.classList.contains("current")) }));
const secState = (pg) => pg.evaluate(() => [...document.querySelectorAll("#notePane .note-sec")].map((s) => s.classList.contains("collapsed")));
const inView = (pg, sel) => pg.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.top >= -2 && r.bottom <= innerHeight + 2; }, sel);

async function run(lang, width, embedFrame = false) {
  const tag = `${lang} ${width}px${embedFrame ? " tray" : ""}`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
  if (MUTATE) {
    await ctx.route("**/*", async (route) => {
      const url = route.request().url();
      if (!/journey-map\.html|note-window\.js/.test(url)) return route.fallback();
      const res = await route.fetch();
      let body = await res.text();
      const before = body;
      if (MUTATE === "restore-overwrites") body = body.replace("restore: (note, rev) => updatePermanentNoteContent(db, {", "restore: (note, rev) => (window.__DATA.noteRevisions.find((r) => r.revisionId === rev.revisionId).title = 'OVERWRITTEN', updatePermanentNoteContent)(db, {");
      if (MUTATE === "find-first-only") body = body.replace("if (!hits.length) continue;", "if (!hits.length || v.find.marks.length) continue;").replace("[...text.matchAll(re)].filter((h) => h[0].length);", "[...text.matchAll(re)].filter((h) => h[0].length).slice(0, 1);");
      if (MUTATE === "contents-hidden-phone") body = body.replace("const showContents = headings.length >= 1;", "const showContents = headings.length >= 1 && innerWidth >= 600;");
      if (MUTATE === "foldall-noop") body = body.replace("const collapse = !secs.every((s) => s.classList.contains(\"collapsed\"));", "const collapse = false;");
      if (MUTATE === "no-tags") body = body.replace('${withTags && mode === "ticks" ? \'<div class="fp-tags" data-fp-tags></div>\' : ""}', "");
      if (body === before && ((MUTATE === "restore-overwrites" || MUTATE === "no-tags") ? /journey-map\.html/.test(url) : /note-window\.js/.test(url))) console.log(`  (mutation ${MUTATE} did not apply to ${url})`);
      await route.fulfill({ response: res, body });
    });
  }
  await ctx.addInitScript(() => { try { localStorage.removeItem("qr.journeyNoteCollapsed.n1"); } catch {} });
  let page, P, errors = [];
  if (embedFrame) {
    ({ page, errors } = await openPage(ctx, "/app/quranrevival.html"));
    await page.click("#tabJourneyBtn");
    await page.waitForSelector("#journeyTray:not([hidden])", { timeout: 5000 });
    P = await (await page.$("#journeyTray iframe")).contentFrame();
  } else {
    ({ page, errors } = await openPage(ctx, "/app/journey-map.html#folders"));
    P = page;
  }
  await waitTree(P);
  const en = lang === "en";
  await openNote(P, "fA", "n1");

  // ---- the bar: one line, tools reachable, every target 40px ------------------------------------------------------
  let m = await barMetrics(P);
  check(`${tag}: the header row is ONE line and nothing is cut`, m.h <= m.menuH + 2 && m.sw <= m.cw + 1 && !m.cut, JSON.stringify(m));
  const small = await P.$$eval("[data-pane-bar] > button, [data-pane-bar] .bar-palette-toggle", (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 39.5 || r.width < 39.5); }).map((e) => e.className));
  check(`${tag}: every button on the bar is at least 40px`, small.length === 0, small.join(" "));
  check(`${tag}: ☰ Contents is on the bar at this width`, m.inBar.includes("contents") || await P.isVisible("[data-pane-contents-btn]"), JSON.stringify(m));
  const lbl = await P.$$eval("[data-pane-find-toggle], [data-pane-foldall], [data-pane-menu] [data-pane-versions]", (els) => els.map((e) => (e.getAttribute("aria-label") || e.textContent).trim()));
  check(`${tag}: the tool labels are ${en ? "English" : "Bangla"}`, en ? lbl.every((x) => /[A-Za-z]/.test(x)) : lbl.every((x) => hasBn(x)), JSON.stringify(lbl));

  // ---- 🔍 Find ------------------------------------------------------------------------------------------------------
  await resetWrites(P);
  await useTool(P, "data-pane-find-toggle");
  await P.waitForSelector("[data-find-bar]", { state: "visible" });
  check(`${tag}: the find input has focus`, await P.evaluate(() => document.activeElement === document.querySelector("[data-find-input]")));
  await page.keyboard.type("apple");
  await wait(250);
  let mk = await marks(P);
  check(`${tag}: all three "apple" hits are highlighted (any case), the first is current`, mk.n === 3 && mk.cur === 0, JSON.stringify(mk));
  const cnt = await findCount(P);
  check(`${tag}: it says which hit of how many${en ? " (1 of 3)" : " in Bangla"}`, en ? /1 of 3/.test(cnt) : hasBn(cnt) && /1/.test(cnt) && /3/.test(cnt), cnt);
  check(`${tag}: the current hit is on screen`, await P.evaluate(() => { const e = document.querySelector("mark.note-find-hit.current"); const r = e.getBoundingClientRect(); return r.top >= -2 && r.bottom <= innerHeight + 2; }));
  await P.click("[data-find-next]");
  mk = await marks(P);
  check(`${tag}: ▼ steps to the second hit`, mk.cur === 1, JSON.stringify(mk));
  await P.click("[data-find-next]"); await P.click("[data-find-next]");
  mk = await marks(P);
  check(`${tag}: ▼ past the last wraps to the first`, mk.cur === 0, JSON.stringify(mk));
  await P.click("[data-find-prev]");
  mk = await marks(P);
  check(`${tag}: ▲ from the first wraps to the last`, mk.cur === 2, JSON.stringify(mk));
  await P.click("[data-find-input]");
  await page.keyboard.press("Enter");
  check(`${tag}: Enter in the box steps on too`, (await marks(P)).cur === 0); // from the last hit, Enter wraps to the first
  await page.keyboard.press("Shift+Enter");
  check(`${tag}: Shift+Enter steps back`, (await marks(P)).cur === 2);
  const fsmall = await P.$$eval("[data-find-bar] button, [data-find-input]", (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.height < 39.5 || r.width < 39.5; }).map((e) => e.tagName));
  check(`${tag}: the find bar's controls are at least 40px`, fsmall.length === 0, fsmall.join(" "));
  check(`${tag}: the find bar fits (no sideways scroll)`, await noSideways(page));
  await page.keyboard.press("Control+A");
  await page.keyboard.type("আল্লাহ");
  await wait(250);
  mk = await marks(P);
  check(`${tag}: a Bangla word is found (2 hits)`, mk.n === 2 && mk.cur === 0, JSON.stringify(mk));
  await page.keyboard.press("Control+A");
  await page.keyboard.type("zzzz-none");
  await wait(200);
  check(`${tag}: no match says so in words and highlights nothing`, (await marks(P)).n === 0 && (en ? /No matches/.test(await findCount(P)) : hasBn(await findCount(P))), await findCount(P));
  await page.keyboard.press("Control+A");
  await page.keyboard.type("apple");
  await wait(200);
  await page.keyboard.press("Escape");
  await wait(150);
  check(`${tag}: Esc closes the find bar and clears every highlight`, !(await P.isVisible("[data-find-bar]")) && (await marks(P)).n === 0);
  check(`${tag}: Find wrote nothing`, (await writes(P)).length === 0, JSON.stringify(await writes(P)));

  // ---- ⇅ Open / close all headings --------------------------------------------------------------------------------
  await resetWrites(P);
  let st = await secState(P);
  check(`${tag}: the Note has 4 heading sections, all open to begin with`, st.length === 4 && st.every((c) => !c), JSON.stringify(st));
  await useTool(P, "data-pane-foldall");
  await wait(200);
  st = await secState(P);
  check(`${tag}: ⇅ folds every heading section`, st.length === 4 && st.every(Boolean), JSON.stringify(st));
  await useTool(P, "data-pane-foldall");
  await wait(200);
  st = await secState(P);
  check(`${tag}: ⇅ again opens them all`, st.length === 4 && st.every((c) => !c), JSON.stringify(st));
  // Updated in place, v09.101 (Owner decisions 45 and 80, round #616): folds follow the person, so folding writes the
  // person's own userPrefs fold setting -- and still NOTHING to the Note (no notes / noteRevisions, no new version).
  check(`${tag}: folding wrote nothing to the Note (only the person's own fold setting)`, (await writes(P)).every((w) => w.col === "userPrefs" && w.id === "test-uid"), JSON.stringify(await writes(P)));
  await useTool(P, "data-pane-foldall"); await wait(150);
  await useTool(P, "data-pane-find-toggle");
  await page.keyboard.type("Apple again");
  await wait(250);
  check(`${tag}: a hit inside a folded heading is shown (that section opens)`, await P.evaluate(() => { const c = document.querySelector("mark.note-find-hit.current"); return !!c && !c.closest(".note-sec.collapsed") && c.getBoundingClientRect().height > 0; }));
  await page.keyboard.press("Escape");
  await useTool(P, "data-pane-foldall"); await wait(150);
  if ((await secState(P)).some(Boolean)) await useTool(P, "data-pane-foldall");
  await wait(150);
  m = await barMetrics(P);
  check(`${tag}: the bar is still one line afterwards`, m.h <= m.menuH + 2 && m.sw <= m.cw + 1 && !m.cut, JSON.stringify(m));

  // ---- ☰ Contents -----------------------------------------------------------------------------------------------------
  check(`${tag}: ☰ Contents is shown (every width, and in the tray)`, await P.isVisible("[data-pane-contents-btn]"));
  if (await P.isVisible("[data-pane-contents-btn]")) {
    await P.click("[data-pane-contents-btn]");
    await P.waitForSelector("[data-pane-contents-list]", { state: "visible" });
    const items = await P.$$eval("[data-pane-contents-list] [data-pane-jump]", (b) => b.map((x) => x.textContent.trim()));
    check(`${tag}: Contents lists the four headings`, items.length === 4 && items[3] === "Delta heading", JSON.stringify(items));
    const csmall = await P.$$eval("[data-pane-contents-list] [data-pane-jump]", (b) => b.filter((x) => x.getBoundingClientRect().height < 39.5).length);
    check(`${tag}: every Contents item is at least 40px tall`, csmall === 0, String(csmall));
    const inside = await P.$eval("[data-pane-contents-list]", (e) => { const r = e.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; });
    check(`${tag}: the Contents list sits inside the screen`, inside);
    await P.click('[data-pane-contents-list] [data-pane-jump="3"]');
    await wait(450);
    check(`${tag}: choosing Delta scrolls its heading into view`, await P.evaluate(() => { const r = document.querySelector('#notePane .note-sec[data-sec-index="3"]').getBoundingClientRect(); return r.top >= -2 && r.top < 420; }));
    await P.click("[data-pane-contents-btn]");
    await P.click('[data-pane-contents-list] [data-pane-jump="1"]');
    await wait(450);
    check(`${tag}: choosing the nested "Gamma sub" scrolls to that one`, await P.evaluate(() => { const r = document.querySelector('#notePane .note-sec[data-sec-index="1"]').getBoundingClientRect(); return r.top >= -2 && r.top < 420; }));
  }

  // ---- 🕘 Versions ---------------------------------------------------------------------------------------------------
  await resetWrites(P);
  const before = await dataOf(P, "noteRevisions");
  await P.click("[data-pane-menu-btn]:visible");
  await P.waitForSelector("[data-pane-menu] [data-pane-versions]", { state: "visible" });
  await P.click("[data-pane-menu] [data-pane-versions]");
  await P.waitForSelector(".note-versions [data-ver-open]", { state: "visible" });
  const rows = await P.$$eval(".note-versions [data-ver-open]", (b) => b.map((x) => ({ when: x.querySelector(".note-ver-when").textContent.trim(), title: x.querySelector(".note-ver-title").textContent.trim(), cur: !!x.querySelector(".note-ver-cur"), h: x.getBoundingClientRect().height })));
  check(`${tag}: the Versions list shows the three revisions, newest first`, rows.length === 3 && rows[0].title === "Reading Note" && rows[1].title === "Reading Note v2" && rows[2].title === "Reading Note v1", JSON.stringify(rows));
  check(`${tag}: each row has a date and a time${en ? "" : " (Bangla)"}`, rows.every((r) => /[\d০-৯]/.test(r.when) && /[:.]/.test(r.when) && (en || hasBn(r.when) || /\d/.test(r.when))), JSON.stringify(rows.map((r) => r.when)));
  check(`${tag}: the newest is marked as the current one`, rows[0].cur && !rows[1].cur && !rows[2].cur, JSON.stringify(rows));
  check(`${tag}: every row is at least 40px tall`, rows.every((r) => r.h >= 39.5), JSON.stringify(rows.map((r) => r.h)));
  check(`${tag}: the Versions dialog fits the screen (no sideways scroll)`, await noSideways(page));
  await P.click('.note-versions [data-ver-open="0"]');
  check(`${tag}: the current version offers no "bring back"`, (await P.$(".note-versions [data-ver-restore]")) === null);
  await P.click(".note-versions [data-ver-list]");
  await P.click('.note-versions [data-ver-open="1"]');
  await P.waitForSelector(".note-versions [data-ver-text]", { state: "visible" });
  const detail = await P.evaluate(() => ({ text: document.querySelector("[data-ver-text]").textContent, editable: !!document.querySelector(".note-versions [contenteditable=true], .note-versions textarea, .note-versions input[type=text]"), title: document.querySelector("[data-ver-title]").textContent }));
  check(`${tag}: tapping a version shows it read-only`, /Version TWO text/.test(detail.text) && detail.title === "Reading Note v2" && !detail.editable, JSON.stringify(detail));
  check(`${tag}: ...and reading it wrote nothing`, (await writes(P)).length === 0 && (await dataOf(P, "noteRevisions")).length === 3);
  const bb = await P.$eval("[data-ver-restore]", (e) => { const r = e.getBoundingClientRect(); return { h: r.height, w: r.width, txt: e.textContent.trim() }; });
  check(`${tag}: "Bring this version back" is at least 40px and says so${en ? "" : " in Bangla"}`, bb.h >= 39.5 && bb.w >= 39.5 && (en ? bb.txt === "Bring this version back" : hasBn(bb.txt)), JSON.stringify(bb));
  await P.click("[data-ver-restore]");
  await P.waitForFunction(() => !document.querySelector(".note-versions"), null, { timeout: 8000 }).catch(() => {});
  await wait(400);
  const after = await dataOf(P, "noteRevisions");
  const fresh = after.filter((r) => !before.some((b) => b._id === r._id));
  check(`${tag}: bringing it back writes exactly ONE new revision`, after.length === before.length + 1 && fresh.length === 1, `${before.length} -> ${after.length}`);
  check(`${tag}: ...carrying that version's title and text, chained from the old current one`, fresh.length === 1 && fresh[0].title === "Reading Note v2" && /Version TWO text/.test(fresh[0].bodyHtml) && fresh[0].previousRevisionId === "r3", JSON.stringify(fresh[0] && { t: fresh[0].title, p: fresh[0].previousRevisionId }));
  check(`${tag}: ...and every OLD revision is exactly as it was`, before.every((b) => JSON.stringify(after.find((a) => a._id === b._id)) === JSON.stringify(b)), JSON.stringify(after.map((a) => a.title)));
  const note = (await dataOf(P, "notes")).find((n) => n.noteId === "n1");
  check(`${tag}: the Note now points at the new revision and shows that text`, fresh.length === 1 && note.currentRevisionId === fresh[0].revisionId && /Version TWO text/.test(note.bodyHtml), JSON.stringify({ c: note.currentRevisionId }));
  check(`${tag}: the pane shows the brought-back text`, /Version TWO text/.test(await P.$eval("[data-pane-body]", (e) => e.textContent)));
  check(`${tag}: it was said in words`, await P.evaluate(() => { const e = document.getElementById("pageStatusMsg"); return !!e && getComputedStyle(e).display !== "none" && e.textContent.length > 10; }));
  await P.click("[data-pane-menu-btn]:visible");
  await P.click("[data-pane-menu] [data-pane-versions]");
  await P.waitForSelector(".note-versions [data-ver-open]", { state: "visible" });
  const rows2 = await P.$$eval(".note-versions [data-ver-open] .note-ver-title", (b) => b.map((x) => x.textContent.trim()));
  check(`${tag}: the list now has four, the new one first and the old current one still there`, rows2.length === 4 && rows2[0] === "Reading Note v2" && rows2.includes("Reading Note"), JSON.stringify(rows2));
  await page.keyboard.press("Escape");
  await wait(150);
  check(`${tag}: Esc closes the Versions dialog`, (await P.$(".note-versions")) === null);

  // ---- 📎 Folders and tags ---------------------------------------------------------------------------------------------
  await resetWrites(P);
  await useTool(P, "data-pane-attach");
  await P.waitForSelector("#folderPicker .folder-picker", { state: "visible" });
  const wide = await P.evaluate(() => matchMedia("(min-width: 1200px)").matches);
  const cls = await P.$eval("#folderPicker", (e) => e.className);
  check(`${tag}: 📎 opens ${wide ? "a popover" : "a sheet"} with the folder ticks`, wide ? /fp-pop/.test(cls) : /fp-sheet/.test(cls), cls);
  check(`${tag}: the same sheet holds the Note's tags part`, (await P.$("#folderPicker [data-fp-tags] [data-at-new-name]")) !== null);
  const box = await P.$eval("#folderPicker .folder-picker", (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, h: innerHeight }; });
  check(`${tag}: the sheet sits inside the screen`, box.l >= -1 && box.r <= box.w + 1 && box.t >= -1 && box.b <= box.h + 1, JSON.stringify(box));
  await P.click('#folderPicker [data-fp-tick="fB"]');
  await wait(600);
  let w = await writes(P);
  check(`${tag}: ticking Beta files the Note there (a new placement)`, w.some((x) => x.col === "notePlacements"), JSON.stringify(w));
  check(`${tag}: ...and Beta stays ticked`, await P.$eval('#folderPicker [data-fp-tick="fB"]', (e) => e.checked));
  await P.fill("#folderPicker [data-at-new-name]", "Prayer");
  await P.click("#folderPicker [data-at-new]");
  await wait(700);
  const tags = await dataOf(P, "noteTags"), links = await dataOf(P, "noteTagLinks");
  check(`${tag}: adding a tag makes it and links it to the Note`, tags.length === 1 && tags[0].name === "Prayer" && links.length === 1 && links[0].noteId === "n1" && links[0].status === "active", JSON.stringify({ tags: tags.length, links: links.length }));
  check(`${tag}: the new tag is ticked in the sheet`, await P.$eval("#folderPicker [data-at-pick]", (e) => e.checked));
  check(`${tag}: its chip shows on the Note`, (await P.$$eval("#notePane [data-tag-chip]", (c) => c.map((x) => x.textContent))).join("").includes("Prayer"));
  const tsmall = await P.$$eval("#folderPicker [data-fp-tags] button, #folderPicker [data-fp-tags] input[type=text], #folderPicker [data-fp-tags] .tag-pick-row", (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.height < 39.5; }).length);
  check(`${tag}: the tags part's targets are at least 40px`, tsmall === 0, String(tsmall));
  await P.click("#folderPicker [data-at-pick]");
  await wait(600);
  const links2 = await dataOf(P, "noteTagLinks");
  check(`${tag}: unticking the tag retires the link (nothing deleted)`, links2.length === 1 && links2[0].status !== "active", JSON.stringify(links2.map((l) => l.status)));
  check(`${tag}: the sheet fits without sideways scroll`, await noSideways(page));
  await P.click("#folderPicker [data-picker-cancel]");
  await wait(150);

  check(`${tag}: no sideways scroll at the end`, await noSideways(page));
  const real = errors.filter((e) => !/ERR_CERT|archive\.org|quran\.com|favicon/i.test(e));
  check(`${tag}: no page errors`, real.length === 0, real.join(" | "));
  await ctx.close();
}

for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1440]) await run(lang, width);
  await run(lang, 1440, true);
}
await browser.close();
console.log(`\njourney-reading-tools-browser${MUTATE ? ` (mutation ${MUTATE})` : ""}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
