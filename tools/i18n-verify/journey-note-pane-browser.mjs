// Siyagah port round 4 (Owner decisions 41, 42.1, 42.4): a Note opens in READ
// mode inside Mapping My Journey -- a pane that replaces the list below 1200px
// (the DOCUMENT's width, so the tray counts) and sits beside it at 1200px and
// up. Every action is driven through the REAL controls (handover §5.4); no page
// function is called from here.
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const LONG_TITLE = "A deliberately long Note title that a real tenant might really write down";
// Alpha{n1 (two filings: Alpha and Beta), n2, n3 (2 headings)}, Beta{} > BetaKid{n4}, Gamma{g1..g14} (so the list scrolls), Delta{nD}.
const SEED = `
(function () {
  window.__stubApplyBatches = true;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, body, day) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  function filler(n) { var s = ""; for (var i = 0; i < n; i++) s += "<p>Paragraph " + i + " of filler text so the section is tall enough to need scrolling on a phone-sized screen, again and again.</p>"; return s; }
  var four = "<p>Intro line.</p><h1>First heading</h1>" + filler(6) + "<h2>Second heading</h2>" + filler(6) + "<h2>Third heading</h2>" + filler(6) + "<h3>Fourth heading</h3>" + filler(12);
  var two = "<h1>Only one</h1><p>Body one.</p><h2>Only two</h2><p>Body two.</p>";
  F("fA", "Alpha", null, 0); F("fB", "Beta", null, 1); F("fBk", "BetaKid", "fB", 0); F("fG", "Gamma", null, 2); F("fD", "Delta", null, 3);
  N("n1", ${JSON.stringify(LONG_TITLE)}, four, 1); N("n2", "Note Two", "<p>Second note body.</p>", 2); N("n3", "Note Three", two, 3); N("n4", "Kid Note", "<p>Kid body.</p>", 4); N("nD", "Doomed Note", "<p>Doomed.</p>", 5);
  P("p1", "n1", "fA", 0); P("p1b", "n1", "fB", 0); P("p2", "n2", "fA", 1); P("p3", "n3", "fA", 2); P("p4", "n4", "fBk", 0); P("pD", "nD", "fD", 0);
  for (var g = 1; g <= 14; g++) { N("g" + g, "Gamma note " + g, "<p>g" + g + "</p>", 1); P("pg" + g, "g" + g, "fG", g); }
})();`;

const browser = await chromium.launch();
const hasBn = (s) => /[ঀ-৿]/.test(s || "");

async function resetWrites(page) { await page.evaluate(() => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); }); }
async function writes(page) {
  return page.evaluate(() => {
    const tx = JSON.parse(sessionStorage.getItem("__stubWrites") || "[]").map((w) => ({ col: w.col, id: w.id, op: w.op || "update", data: w.data }));
    const other = (window.__stubWriteData || []).map((w) => ({ col: w.col, id: w.id, op: w.kind, data: w.data }));
    return [...tx, ...other];
  });
}
const status = (page) => page.evaluate(() => { const e = document.getElementById("pageStatusMsg"); return e && getComputedStyle(e).display !== "none" ? e.textContent : ""; });
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function settle(page, ms = 600) { await page.waitForTimeout(ms); }
async function waitTree(page) {
  await page.waitForFunction(() => document.querySelectorAll("[data-note-leaf]").length >= 18 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
}
const leafTitle = (noteId, folderId) => `[data-note-leaf][data-note-id="${noteId}"][data-in-folder="${folderId}"] [data-note-open]`;
const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
const paneTitle = (page) => page.textContent("[data-pane-title]");
const barMetrics = (page) => page.evaluate(() => {
  const b = document.querySelector("[data-pane-bar]"), br = b.getBoundingClientRect();
  const kids = [...b.children].filter((c) => c.offsetParent !== null && c.getBoundingClientRect().width > 0);
  return {
    h: br.height, sw: b.scrollWidth, cw: b.clientWidth, folded: b.classList.contains("folded"),
    menuH: document.querySelector("[data-pane-menu-btn]").getBoundingClientRect().height,
    cut: kids.some((c) => { const r = c.getBoundingClientRect(); return r.right > br.right + 1 || r.left < br.left - 1; }),
    prevInBar: !!document.querySelector("[data-pane-bar] > [data-pane-prev]") && getComputedStyle(document.querySelector("[data-pane-bar] > [data-pane-prev]")).display !== "none",
  };
});
async function openMenu(page) { await page.click("[data-pane-menu-btn]"); await page.waitForSelector("[data-pane-menu]", { state: "visible" }); }
/** ‹ / ›: the bar's own button, or -- once the header has folded them away -- the ⋯ menu's item. */
async function step(page, which) {
  if ((await barMetrics(page)).folded) { await openMenu(page); await page.click(`[data-pane-menu] [data-pane-${which}]`); }
  else await page.click(`[data-pane-bar] > [data-pane-${which}]`);
}
async function stepDisabled(page, which) {
  const m = await barMetrics(page);
  if (m.folded) { await openMenu(page); const d = await page.$eval(`[data-pane-menu] [data-pane-${which}]`, (b) => b.disabled); await page.keyboard.press("Escape"); await page.click("[data-pane-title]"); return d; }
  return page.$eval(`[data-pane-bar] > [data-pane-${which}]`, (b) => b.disabled);
}
const paneOpen = (page) => page.evaluate(() => { const p = document.getElementById("notePane"); return !p.hidden && getComputedStyle(p).display !== "none"; });
const listShown = (page) => page.evaluate(() => { const l = document.getElementById("listPane"); return getComputedStyle(l).display !== "none" && l.getBoundingClientRect().width > 0; });
async function closePane(page, wide) {
  if (!wide) { await page.click("[data-pane-back]"); await settle(page, 200); }
}

for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1280]) {
    const tag = `${lang} ${width}px`;
    const wide = width >= 1200;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
    await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA", "fG", "fD"])); } catch {} });
    const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
    await waitTree(page);
    check(`${tag}: before anything opens, the pane is closed and the list is shown`, !(await paneOpen(page)) && (await listShown(page)));

    // ---- Opening, and Back at the same scroll position ----------------------------
    const target = page.locator(leafTitle("g12", "fG"));
    await target.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => document.scrollingElement.scrollTop);
    if (!wide) check(`${tag}: (positive control) the list really is scrolled before the Note is opened`, before > 100, `scrollTop ${before}`);
    await target.click();
    await page.waitForSelector("#notePane:not([hidden])");
    check(`${tag}: clicking a Note's title opens the pane with that Note`, (await paneTitle(page)) === "Gamma note 12", await paneTitle(page));
    if (wide) {
      const boxes = await page.evaluate(() => { const l = document.getElementById("listPane").getBoundingClientRect(), p = document.getElementById("notePane").getBoundingClientRect(); return { lr: l.right, pl: p.left, lw: l.width, pw: p.width }; });
      check(`${tag}: the list and the pane are side by side`, (await listShown(page)) && boxes.pl >= boxes.lr - 1 && boxes.lw > 200 && boxes.pw > 300, JSON.stringify(boxes));
      check(`${tag}: there is no ← Back on the pane at the wide tier`, !(await vis(page, "[data-pane-back]")));
    } else {
      check(`${tag}: the list is hidden while the pane is open`, !(await listShown(page)));
      check(`${tag}: ← Back is on the pane's own toolbar row, not a line of its own`, await page.evaluate(() => { const b = document.querySelector("[data-pane-back]"), bar = document.querySelector("[data-pane-bar]"); return bar.contains(b) && b.getBoundingClientRect().height <= 48 && bar.getBoundingClientRect().height <= 48; }));
      await page.click("[data-pane-back]");
      await settle(page, 250);
      const after = await page.evaluate(() => document.scrollingElement.scrollTop);
      check(`${tag}: ← Back returns to the list at the same scroll position`, (await listShown(page)) && !(await paneOpen(page)) && Math.abs(after - before) <= 2, `before ${before}, after ${after}`);
    }
    check(`${tag}: no sideways scroll with the pane open or closed`, await noSideways(page));

    // ---- The header row: one line, nothing cut ---------------------------------------
    await page.click(leafTitle("n1", "fA"));
    await page.waitForSelector("#notePane:not([hidden])");
    check(`${tag}: a 60+ character title is shown in full in the pane`, (await paneTitle(page)) === LONG_TITLE);
    await settle(page, 200);
    const m = await barMetrics(page);
    check(`${tag}: the header row is ONE line (its height is one control's height)`, m.h <= m.menuH + 2, JSON.stringify(m));
    check(`${tag}: nothing on the header row is cut (scrollWidth <= clientWidth + 1)`, m.sw <= m.cw + 1 && !m.cut, JSON.stringify(m));
    // At 390px the Bangla labels are short enough that everything FITS, so the
    // fold rightly does not happen there (it is decided by measuring, not by
    // language); the fold itself is proven at 320px in its own block below.
    if (width === 390) check(`${tag}: the row is either unfolded and fitting, or folded with ‹ › in the ⋯ menu — never cut`, (m.folded ? !m.prevInBar : m.prevInBar) && m.sw <= m.cw + 1, JSON.stringify(m));
    if (width >= 820) check(`${tag}: ‹ › stay on the header row when there is room`, !m.folded && m.prevInBar, JSON.stringify(m));

    // ---- Body: meta row, folder chips, headings ---------------------------------------
    const meta = await page.textContent("[data-pane-meta]");
    check(`${tag}: the meta row shows the created and last-changed dates${lang === "bn" ? " in Bangla words" : ""}`, /\d/.test(meta) && (lang === "bn" ? hasBn(meta) : /Created/.test(meta) && /Last changed/.test(meta)), meta);
    const chips = await page.$$eval("[data-pane-chip]", (c) => c.map((x) => x.dataset.paneChip).sort());
    check(`${tag}: one folder chip for every active folder the Note is filed in`, JSON.stringify(chips) === '["fA","fB"]', JSON.stringify(chips));
    check(`${tag}: four headings become four collapsible sections, nested by level`, await page.evaluate(() => {
      const s = [...document.querySelectorAll(".note-sec")];
      const lv = (i) => Number(s[i].dataset.level);
      return s.length === 4 && lv(0) === 1 && lv(1) === 2 && lv(2) === 2 && lv(3) === 3 && s[1].parentElement.closest(".note-sec") === s[0] && s[3].parentElement.closest(".note-sec") === s[2];
    }));

    // ---- Collapse: computed display, survives reopen, writes nothing ---------------------
    await resetWrites(page);
    await page.click('[data-sec-toggle="0"]');
    const secDisplay = () => page.evaluate(() => getComputedStyle(document.querySelector('.note-sec[data-sec-index="0"] > .note-sec-body')).display);
    check(`${tag}: collapsing a section hides its body (computed display)`, (await secDisplay()) === "none");
    check(`${tag}: collapsing wrote NOTHING to the write log`, (await writes(page)).length === 0, JSON.stringify(await writes(page)));
    check(`${tag}: the collapsed state is kept in localStorage per Note, not elsewhere`, await page.evaluate(() => JSON.parse(localStorage.getItem("qr.journeyNoteCollapsed.n1") || "[]").includes(0)));
    if (wide) { await page.click(leafTitle("n2", "fA")); await page.click(leafTitle("n1", "fA")); } else { await closePane(page, false); await page.click(leafTitle("n1", "fA")); }
    await page.waitForSelector("#notePane:not([hidden])");
    check(`${tag}: the collapsed section is still collapsed after closing and reopening the Note`, (await secDisplay()) === "none");
    await page.click('[data-sec-toggle="0"]');
    check(`${tag}: and it opens again`, (await secDisplay()) !== "none");

    // ---- ☰ Contents -----------------------------------------------------------------------
    if (!wide) {
      check(`${tag}: ☰ Contents is on the header row for a Note with 4 headings`, await vis(page, "[data-pane-contents-btn]"));
      await page.click("[data-pane-contents-btn]");
      const listed = await page.$$eval("[data-pane-contents-list] [data-pane-jump]", (b) => b.map((x) => x.textContent.trim()));
      check(`${tag}: Contents lists the headings with words`, listed.join("|") === "First heading|Second heading|Third heading|Fourth heading", listed.join("|"));
      await page.click('[data-pane-jump="3"]');
      await settle(page, 300);
      const top = await page.evaluate(() => document.querySelector('.note-sec[data-sec-index="3"]').getBoundingClientRect().top);
      check(`${tag}: choosing a heading scrolls it into view`, top >= -2 && top < 400, `top ${top}`);
      const mm = await barMetrics(page);
      check(`${tag}: the header row is still one line after jumping`, mm.h <= mm.menuH + 2 && mm.sw <= mm.cw + 1, JSON.stringify(mm));
    } else {
      check(`${tag}: ☰ Contents is NOT shown at the wide tier`, !(await vis(page, "[data-pane-contents-btn]")));
    }

    // ---- The ⋯ menu: topmost, inside the viewport -----------------------------------------
    await page.evaluate(() => scrollTo(0, 0)); await page.evaluate(() => document.getElementById("notePane").scrollTo?.(0, 0));
    await openMenu(page);
    const menuHit = await page.evaluate(() => {
      const m = document.querySelector("[data-pane-menu]"), r = m.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { top: !!hit && m.contains(hit), inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, r: [r.left, r.right, r.top, r.bottom] };
    });
    check(`${tag}: the ⋯ menu is topmost at its own centre and inside the viewport`, menuHit.top && menuHit.inside, JSON.stringify(menuHit));
    const menuWords = await page.$$eval("[data-pane-menu] button", (b) => b.filter((x) => getComputedStyle(x).display !== "none").map((x) => x.textContent.trim()));
    check(`${tag}: every ⋯ item has a word (Copy to…, Move to…, Delete)`, menuWords.length >= 3 && menuWords.every((w) => /[\p{L}\p{M}]{3,}/u.test(w)), JSON.stringify(menuWords));
    check(`${tag}: no "Open full page" item on the full page (tray only)`, !menuWords.some((w) => /full page|পূর্ণ পৃষ্ঠা/.test(w)));
    check(`${tag}: no ✏️ Edit yet (round 5)`, !/✏|Edit|সম্পাদনা/.test(menuWords.join("|")));
    await page.keyboard.press("Escape"); await page.click("[data-pane-title]");

    // ---- ‹ › walk the folder's own order and stop at the ends ---------------------------------
    await closePane(page, wide); // at narrow the pane hides the list; at wide both are on screen
    await page.click(leafTitle("n2", "fA"));
    await page.waitForSelector("#notePane:not([hidden])");
    check(`${tag}: (Alpha's order) the second Note is open`, (await paneTitle(page)) === "Note Two");
    await step(page, "prev");
    check(`${tag}: ‹ goes to the previous Note in the folder's order`, (await paneTitle(page)) === LONG_TITLE);
    check(`${tag}: ‹ is disabled at the start of the folder`, await stepDisabled(page, "prev"));
    await step(page, "next"); await step(page, "next");
    check(`${tag}: › walks on to the last Note`, (await paneTitle(page)) === "Note Three");
    check(`${tag}: › is disabled at the end of the folder`, await stepDisabled(page, "next"));
    check(`${tag}: a 2-heading Note has no ☰ Contents`, !(await vis(page, "[data-pane-contents-btn]")));

    // ---- Copy to… / Move to… from the pane ------------------------------------------------------
    await resetWrites(page);
    await openMenu(page); await page.click("[data-pane-menu] [data-pane-copy]");
    await page.waitForSelector("#folderPicker");
    await page.click('#folderPicker [data-pick="fD"]'); await settle(page);
    const w1 = await writes(page);
    check(`${tag}: Copy to… from the pane — a placement is created and NO note is written`, w1.some((w) => w.col === "notePlacements" && w.op !== "update") && !w1.some((w) => w.col === "notes"), JSON.stringify(w1.map((w) => `${w.col}:${w.op}`)));
    check(`${tag}: Copy to… — the confirmation line is shown${lang === "bn" ? " in Bangla" : ""}`, lang === "bn" ? hasBn(await status(page)) : /copied/i.test(await status(page)), await status(page));
    check(`${tag}: the chips now show the extra folder`, JSON.stringify(await page.$$eval("[data-pane-chip]", (c) => c.map((x) => x.dataset.paneChip).sort())) === '["fA","fD"]');
    await resetWrites(page);
    await openMenu(page); await page.click("[data-pane-menu] [data-pane-move]");
    await page.waitForSelector("#folderPicker");
    await page.click('#folderPicker [data-pick="fBk"]'); await settle(page);
    const w2 = await writes(page);
    check(`${tag}: Move to… from the pane — filed in the new folder and gone from the old, no note written`,
      JSON.stringify(await page.$$eval("[data-pane-chip]", (c) => c.map((x) => x.dataset.paneChip).sort())) === '["fBk","fD"]' && w2.length > 0 && !w2.some((w) => w.col === "notes"));

    // ---- A folder chip opens that folder in the tree (ancestors expanded, scrolled into view) -----
    await page.click('[data-pane-chip="fBk"]');
    await settle(page, 400);
    const chipResult = await page.evaluate(() => {
      const row = document.querySelector('.folder-row[data-folder-id="fBk"]'), beta = document.querySelector('.folder-row[data-folder-id="fB"] [data-folder-toggle]');
      const r = row?.getBoundingClientRect();
      return { row: !!row, inView: !!r && r.top >= 0 && r.bottom <= innerHeight, betaOpen: beta?.getAttribute("aria-expanded") === "true" };
    });
    check(`${tag}: a folder chip closes the pane and opens that folder in the tree, expanded and in view`, !(await paneOpen(page)) && chipResult.row && chipResult.inView && chipResult.betaOpen, JSON.stringify(chipResult));

    // ---- Timeline and Path open the same pane, with that view's own order ------------------------------
    await page.click('.view-toggle-btn[data-view="timeline"]');
    await page.waitForSelector('#viewTimeline .note-card[data-note-id="n4"]');
    await page.click('#viewTimeline .note-card[data-note-id="n4"] [data-note-open]');
    await page.waitForSelector("#notePane:not([hidden])");
    check(`${tag}: a title in Timeline opens the pane`, (await paneTitle(page)) === "Kid Note");
    const tlTitles = await page.$$eval("#viewTimeline .note-card[data-note-id] [data-note-open]", (c) => c.map((x) => x.textContent.trim()));
    const wantNext = tlTitles[tlTitles.indexOf("Kid Note") + 1];
    await step(page, "next");
    check(`${tag}: › in Timeline follows Timeline's own order`, !!wantNext && (await paneTitle(page)) === wantNext, `${await paneTitle(page)} vs ${wantNext}`);
    await closePane(page, wide);
    await page.click('.view-toggle-btn[data-view="path"]');
    await page.waitForSelector("#viewPath .note-card[data-note-id]");
    await page.click("#viewPath .note-card[data-note-id] [data-note-open]");
    await page.waitForSelector("#notePane:not([hidden])");
    check(`${tag}: a title in Path opens the pane`, (await paneOpen(page)) && (await paneTitle(page)).length > 0);
    await closePane(page, wide);
    await page.click('.view-toggle-btn[data-view="folders"]');
    await waitTree(page);

    // ---- Delete -> Trash -> Restore -----------------------------------------------------------------------
    await page.click(leafTitle("nD", "fD"));
    await page.waitForSelector("#notePane:not([hidden])");
    await resetWrites(page);
    await openMenu(page); await page.click("[data-pane-menu] [data-pane-delete]");
    await settle(page, 900);
    const w3 = await writes(page);
    check(`${tag}: Delete closes the pane`, !(await paneOpen(page)));
    check(`${tag}: Delete — the Note is gone from the tree`, (await page.$(leafTitle("nD", "fD"))) === null);
    check(`${tag}: Delete — the write log shows a retire (status), never an erase`,
      w3.some((w) => w.col === "notes" && w.id === "t1__nD" && w.data?.includes?.("status")) && !w3.some((w) => w.op === "delete" || w.op === "deleteDoc"), JSON.stringify(w3));
    const msg = await status(page);
    check(`${tag}: Delete — a confirmation says it moved to Trash${lang === "bn" ? " (in Bangla)" : ""}`, lang === "bn" ? hasBn(msg) && msg.includes("Doomed Note") : /moved to Trash/.test(msg) && /Doomed Note/.test(msg), msg);
    await page.click(".page-menu-wrap .folder-menu-btn");
    await page.click("#openTrashBtn");
    await page.waitForSelector('[data-trash-note-id="nD"]', { timeout: 8000 });
    check(`${tag}: the deleted Note is in Trash`, true);
    await resetWrites(page);
    await page.click('[data-trash-note-id="nD"] [data-trash-restore]');
    await settle(page, 900);
    const w4 = await writes(page);
    check(`${tag}: Restore brings it back (a status change), with no erase`, w4.some((w) => w.col === "notes" && w.id === "t1__nD" && w.data?.includes?.("status")) && !w4.some((w) => w.op === "delete" || w.op === "deleteDoc"), JSON.stringify(w4.map((w) => `${w.col}:${w.op}`)));
    await page.click("#trashBackBtn");
    await settle(page, 500);
    check(`${tag}: the restored Note is in the tree again`, (await page.$(leafTitle("nD", "fD"))) !== null);

    check(`${tag}: no sideways scroll at the end`, await noSideways(page));
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|Failed to load resource|\[folder refusal\]/.test(e)).length === 0, errors.join(" | "));
    await ctx.close();
  }

  // ---- The fold itself: measured at 320px, where the row genuinely overflows ------------------------
  {
    const tag = `${lang} 320px`;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width: 320, height: 800 }, extraSeedJs: SEED });
    await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
    const { page } = await openPage(ctx, "/app/journey-map.html#folders");
    await page.waitForFunction(() => document.querySelectorAll("[data-note-leaf]").length >= 3 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
    await page.click(leafTitle("n1", "fA")); // four headings, so ☰ Contents is on the row too
    await page.waitForSelector("#notePane:not([hidden])");
    await settle(page, 200);
    const m = await barMetrics(page);
    check(`${tag}: the header has FOLDED — ‹ › left the row`, m.folded && !m.prevInBar, JSON.stringify(m));
    check(`${tag}: and the row is one line with nothing cut`, m.h <= m.menuH + 2 && m.sw <= m.cw + 1 && !m.cut, JSON.stringify(m));
    await openMenu(page);
    const items = await page.$$eval("[data-pane-menu] .pane-fold-item", (b) => b.filter((x) => getComputedStyle(x).display !== "none").map((x) => x.textContent.trim()));
    check(`${tag}: ‹ › are in the ⋯ menu with words${lang === "bn" ? " (in Bangla)" : ""}`, items.length === 2 && items.every((x) => (lang === "bn" ? /[ঀ-৿]/.test(x) : /note/i.test(x))), JSON.stringify(items));
    await page.click('[data-pane-menu] [data-pane-next]');
    check(`${tag}: the folded › still walks to the next Note`, (await paneTitle(page)) === "Note Two");
    check(`${tag}: no sideways scroll`, await noSideways(page));
    await ctx.close();
  }

  // ---- The tray: the tier follows the DOCUMENT's width, not the screen's ------------------------------
  for (const width of [1280, 390]) {
    const tag = `${lang} tray on a ${width}px screen`;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
    await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA", "fG", "fD"])); } catch {} });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.click("#tabJourneyBtn");
    await page.waitForSelector("#journeyTray:not([hidden])", { timeout: 5000 });
    const frame = await (await page.$("#journeyTray iframe")).contentFrame();
    await frame.waitForFunction(() => document.querySelectorAll("[data-note-leaf]").length >= 18 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 20000 });
    const fw = await frame.evaluate(() => document.documentElement.clientWidth);
    check(`${tag}: (positive control) the tray's document is narrower than 1200px`, fw < 1200, `iframe width ${fw}`);
    await frame.click(leafTitle("n2", "fA"));
    await frame.waitForSelector("#notePane:not([hidden])");
    const tier = await frame.evaluate(() => ({ narrow: document.getElementById("noteLayout").classList.contains("tier-narrow"), listHidden: getComputedStyle(document.getElementById("listPane")).display === "none", screen: screen.width }));
    check(`${tag}: the narrow tier is used (the pane replaces the list) even though the screen is ${width}px wide`, tier.narrow && tier.listHidden, JSON.stringify(tier));
    await frame.click("[data-pane-menu-btn]");
    const items = await frame.$$eval("[data-pane-menu] button", (b) => b.filter((x) => getComputedStyle(x).display !== "none").map((x) => x.textContent.trim()));
    check(`${tag}: "Open full page" is on the ⋯ menu inside the tray`, items.some((x) => /full page|পূর্ণ পৃষ্ঠা/.test(x)), JSON.stringify(items));
    await page.keyboard.press("Escape"); await frame.click("[data-pane-title]");
    await frame.click("[data-pane-back]");
    check(`${tag}: ← Back returns to the list inside the tray`, await frame.evaluate(() => getComputedStyle(document.getElementById("listPane")).display !== "none" && document.getElementById("notePane").hidden));
    check(`${tag}: the tray's document has no sideways scroll`, await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await ctx.close();
  }
}
await browser.close();
console.log(`\njourney-note-pane-browser: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
