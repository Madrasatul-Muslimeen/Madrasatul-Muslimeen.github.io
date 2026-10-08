// S8 (Siyagah folder plan, 4 Oct 2026): Mapping My Journey is THREE panels --
// folder tree | the chosen folder's Note list | the Note. Below 1200px (the
// DOCUMENT's width, so the tray counts) one panel shows at a time; at 1200px and
// up the three sit side by side. In the tray the line is 900px (the Owner, 8 Oct
// 2026: "Enable all three columns resizeable on the deck"; the tray's page has no
// reading cap, so the minimums fit from 900px). Updated in place: the 1440px tray
// (a 1008px document) now shows three columns, and a 1180px tray (826px) keeps
// one panel at a time. Every action is a REAL tap/keypress; writes are
// proved through the stub's own logs (handover §5.4).
// Run from the repository root with `node serve.js` running.
//   --mutate-no-placement   the quick-title writes the Note but skips its placement
//   --mutate-three-narrow   force the wide (three-column) tier at every width
//   --mutate-no-infolders   drop the "in N folders" line from the cards
//   --mutate-no-cardtap     only the title opens a Note again (Architect review, 4 Oct 2026)
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = process.argv.find((a) => a.startsWith("--mutate-"))?.slice(9) ?? null;
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

// Alpha{n1 (also in Beta), n2}, Beta{} > BetaKid{n4}, Gamma{} (empty), Delta{n5 (long body)}.
const SEED = `
(function () {
  window.__stubApplyBatches = true;
  window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, body, day) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  var long = ""; for (var i = 0; i < 12; i++) long += "<p>Sentence number " + i + " of a long body, written so the preview must be cut at two lines and never run on.</p>";
  F("fA", "Alpha", null, 0); F("fB", "Beta", null, 1); F("fBk", "BetaKid", "fB", 0); F("fG", "Gamma", null, 2); F("fD", "Delta", null, 3);
  N("n1", "Note One", long, 1); N("n2", "Note Two", "<p>Second body.</p>", 2); N("n4", "Kid Note", "<p>Kid body.</p>", 4); N("n5", "Delta Note", long, 5);
  P("p1", "n1", "fA", 0); P("p1b", "n1", "fB", 0); P("p2", "n2", "fA", 1); P("p4", "n4", "fBk", 0); P("p5", "n5", "fD", 0);
})();`;

const browser = await chromium.launch();
const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const vis = (pg, sel) => pg.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
const noSideways = (pg) => pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const status = (pg) => pg.evaluate(() => { const e = document.getElementById("pageStatusMsg"); return e && getComputedStyle(e).display !== "none" ? e.textContent : ""; });
const dataOf = (pg, col) => pg.evaluate((c) => JSON.parse(JSON.stringify(window.__DATA[c] || [])), col);
const fsWrites = (pg) => pg.evaluate(() => (window.__fsLog || []).filter((l) => l.kind === "txCommit" || l.kind === "setDoc" || l.kind === "updateDoc").length);
const smallTargets = (pg, sel) => pg.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 39.5 || r.width < 39.5) && getComputedStyle(e).display !== "none"; }).map((e) => `${e.tagName}.${e.className}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`), sel);
async function contrast(pg, selector) {
  return pg.evaluate((sel) => {
    const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const el = document.querySelector(sel);
    if (!el) return 0;
    const fg = parse(getComputedStyle(el).color);
    let bgEl = el, bg = null;
    while (bgEl) { const c = parse(getComputedStyle(bgEl).backgroundColor); if (c.length >= 3 && (c.length === 3 || c[3] > 0.99)) { bg = c; break; } bgEl = bgEl.parentElement; }
    bg = bg || [255, 255, 255];
    const [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);
}
async function waitTree(pg) {
  await pg.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 5 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
}
async function toTree(pg) { if (await pg.isVisible("#folderNotes [data-list-back]")) await pg.click("#folderNotes [data-list-back]"); }
async function tapFolder(pg, id) { await toTree(pg); await pg.click(`.folder-row[data-folder-id="${id}"] [data-folder-name]`); await pg.waitForSelector("#folderNotes [data-fn-title]", { state: "visible" }); }
const listTitle = (pg) => pg.textContent("#folderNotes [data-fn-title]");
const cards = (pg) => pg.$$eval("#folderNotes [data-note-leaf]", (c) => c.map((x) => x.dataset.noteId));

// --mutate-three-narrow: the one tier function is replaced in the page's own source (routed below).
const forceWide = MUTATE === "three-narrow";

async function run(lang, width, embedFrame = false) {
  const tag = `${lang} ${width}px${embedFrame ? " tray" : ""}`;
  const wide = width >= 1200;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
  if (MUTATE === "no-infolders" || MUTATE === "no-placement" || MUTATE === "no-cardtap" || forceWide) {
    await ctx.route("**/journey-map.html*", async (route) => {
      const res = await route.fetch();
      let body = await res.text();
      if (MUTATE === "no-placement") body = body.replace("await createNotePlacement(db, { ...ownerArgs, noteId: created.noteId, folderId, order });", "/* mutated: placement skipped */");
      if (MUTATE === "no-infolders") body = body.replace("const inFolders = filedIn > 1 ?", "const inFolders = false ?");
      if (MUTATE === "no-cardtap") body = body.replace('if (card.matches(".fn-card")) {', "if (false) {");
      if (forceWide) body = body.replace('document.documentElement.clientWidth >= from ? "wide" : "narrow"', '"wide"');
      await route.fulfill({ response: res, body });
    });
  }
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA", "fB", "fBk"])); } catch {} });
  let page, frame, errors = [];
  if (embedFrame) {
    ({ page, errors } = await openPage(ctx, "/app/quranrevival.html"));
    await page.click("#tabJourneyBtn");
    await page.waitForSelector("#journeyTray:not([hidden])", { timeout: 5000 });
    frame = await (await page.$("#journeyTray iframe")).contentFrame();
  } else {
    ({ page, errors } = await openPage(ctx, "/app/journey-map.html#folders"));
    frame = page;
  }
  const P = frame; // every check below drives the page itself, or the tray's iframe
  await waitTree(P);
  const docW = await P.evaluate(() => document.documentElement.clientWidth);
  const tierWide = docW >= (embedFrame ? 900 : 1200);
  if (embedFrame) check(`${tag}: (positive control) the tray's own document is narrower than 1200px`, docW < 1200, `iframe width ${docW}`);
  if (embedFrame) check(`${tag}: (positive control) the tray's tier is the one its width calls for (${width === 1440 ? "three columns" : "one panel"})`, tierWide === (width === 1440), `iframe width ${docW}`);

  // ---- 1. The panels per tier -------------------------------------------------------
  const boxes = await P.evaluate(() => {
    const b = (id) => { const e = document.getElementById(id), r = e.getBoundingClientRect(); return { shown: getComputedStyle(e).display !== "none" && r.width > 0, l: r.left, r: r.right, w: r.width }; };
    return { tree: b("listPane"), list: b("folderNotes"), note: b("notePlaceholder"), pane: b("notePane") };
  });
  if (tierWide) {
    check(`${tag}: three columns -- tree, list and the Note placeholder side by side`,
      boxes.tree.shown && boxes.list.shown && boxes.note.shown && boxes.list.l >= boxes.tree.r - 1 && boxes.note.l >= boxes.list.r - 1 && boxes.tree.w > 150 && boxes.list.w > 150 && boxes.note.w > 150, JSON.stringify(boxes));
  } else {
    check(`${tag}: one panel at a time -- only the folder tree shows first`, boxes.tree.shown && !boxes.list.shown && !boxes.note.shown && !boxes.pane.shown, JSON.stringify(boxes));
  }
  check(`${tag}: no sideways scroll before anything is chosen`, await noSideways(P));

  // ---- 2. A folder tap fills the list ---------------------------------------------------
  await tapFolder(P, "fA");
  check(`${tag}: tapping Alpha fills the list with its two Notes, in order`, (await listTitle(P)) === "Alpha" && JSON.stringify(await cards(P)) === '["n1","n2"]', JSON.stringify(await cards(P)));
  check(`${tag}: the tapped folder is marked as the chosen one`, (await P.$('.folder-row.selected[data-folder-id="fA"]')) !== null);
  check(`${tag}: the tree holds folders only -- no Note is a leaf of it`, (await P.$$("[data-folder-tree] [data-note-leaf]")).length === 0);
  if (!tierWide) {
    const s = await P.evaluate(() => ({ tree: getComputedStyle(document.getElementById("listPane")).display, list: getComputedStyle(document.getElementById("folderNotes")).display }));
    check(`${tag}: the list slid in and the tree stepped aside`, s.tree === "none" && s.list !== "none", JSON.stringify(s));
    check(`${tag}: the list's own ← goes back to the tree`, await (async () => { await P.click("#folderNotes [data-list-back]"); return (await vis(P, "#listPane")) && !(await vis(P, "#folderNotes")); })());
    await tapFolder(P, "fA");
  } else {
    check(`${tag}: ← is not drawn at the three-column tier`, !(await vis(P, "#folderNotes [data-list-back]")));
  }

  // ---- 3. Cards: title, date, "in N folders" -----------------------------------------------
  const c1 = await P.textContent('#folderNotes [data-note-id="n1"] .note-card-head');
  const c2 = await P.textContent('#folderNotes [data-note-id="n2"] .note-card-head');
  check(`${tag}: a card shows the title and a date`, c1.includes("Note One") && /[0-9০-৯]/.test(c1) && c2.includes("Note Two"), c1);
  const inN = await P.$$eval("#folderNotes [data-in-folders]", (e) => e.map((x) => ({ id: x.closest("[data-note-id]").dataset.noteId, t: x.textContent })));
  check(`${tag}: a Note filed in two folders says "in 2 folders"; a Note filed in one says nothing`,
    inN.length === 1 && inN[0].id === "n1" && /2/.test(inN[0].t) && (lang === "bn" ? hasBn(inN[0].t) : /in 2 folders/.test(inN[0].t)), JSON.stringify(inN));

  // ---- 4. Compact / Preview ------------------------------------------------------------------
  check(`${tag}: Compact is the default -- titles only, no preview text`, (await P.$$("#folderNotes [data-note-preview]")).length === 0 && (await P.getAttribute('#folderNotes [data-fn-mode="compact"]', "aria-pressed")) === "true");
  await P.click('#folderNotes [data-fn-mode="preview"]');
  const prev = await P.$$eval("#folderNotes [data-note-preview]", (ps) => ps.map((p) => { const cs = getComputedStyle(p), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3; return { text: p.textContent, h: p.getBoundingClientRect().height, lh }; }));
  check(`${tag}: Preview shows body text on every card`, prev.length === 2 && prev.every((p) => p.text.length > 5), JSON.stringify(prev));
  check(`${tag}: a long body's preview is cut at TWO lines`, prev[0].h <= prev[0].lh * 2 + 3 && prev[0].h >= prev[0].lh * 1.5 && prev[0].text.length > 150, JSON.stringify(prev[0]));
  check(`${tag}: Preview is pressed and the choice is kept on this device`, (await P.getAttribute('#folderNotes [data-fn-mode="preview"]', "aria-pressed")) === "true" && (await P.evaluate(() => localStorage.getItem("qr.journeyMapNotesPreview"))) === "1");
  check(`${tag}: no sideways scroll in Preview`, await noSideways(P));
  await P.click('#folderNotes [data-fn-mode="compact"]');
  check(`${tag}: Compact takes the preview text away again`, (await P.$$("#folderNotes [data-note-preview]")).length === 0);

  // ---- 5. ⬆ and the subfolder chips ---------------------------------------------------------------
  check(`${tag}: ⬆ is disabled for a top-level folder`, await P.$eval("#folderNotes [data-fn-up]", (b) => b.disabled));
  await tapFolder(P, "fB");
  const chips = await P.$$eval("#folderNotes [data-subfolder-chip]", (c) => c.map((x) => ({ id: x.dataset.subfolderChip, t: x.textContent.trim() })));
  check(`${tag}: Beta shows one chip for BetaKid, with its count`, chips.length === 1 && chips[0].id === "fBk" && /BetaKid/.test(chips[0].t) && /1/.test(chips[0].t), JSON.stringify(chips));
  await P.click('#folderNotes [data-subfolder-chip="fBk"]');
  check(`${tag}: tapping the chip opens BetaKid's list`, (await listTitle(P)) === "BetaKid" && JSON.stringify(await cards(P)) === '["n4"]');
  check(`${tag}: ⬆ is enabled inside a sub-folder`, !(await P.$eval("#folderNotes [data-fn-up]", (b) => b.disabled)));
  await P.click("#folderNotes [data-fn-up]");
  check(`${tag}: ⬆ goes to the parent (Beta)`, (await listTitle(P)) === "Beta");

  // ---- 6. ➕ New folder creates INSIDE the current one --------------------------------------------------
  await P.click("#folderNotes [data-fn-newfolder]");
  await P.fill("#fnNewFolderName", "Inner");
  const before = await dataOf(P, "noteFolders");
  await P.press("#fnNewFolderName", "Enter");
  await P.waitForFunction(() => (window.__DATA.noteFolders || []).some((f) => f.name === "Inner"));
  const inner = (await dataOf(P, "noteFolders")).find((f) => f.name === "Inner");
  check(`${tag}: ➕ New folder wrote a folder whose parent is Beta`, !!inner && inner.parentFolderId === "fB" && inner.semanticRole === "user" && before.length + 1 === (await dataOf(P, "noteFolders")).length, JSON.stringify(inner));
  await P.waitForFunction(() => [...document.querySelectorAll("#folderNotes [data-subfolder-chip]")].some((c) => /Inner/.test(c.textContent)));
  check(`${tag}: ...and a chip for it appears at once`, true);

  // ---- 7. Quick title: Note AND placement --------------------------------------------------------------
  await tapFolder(P, "fA");
  const notesBefore = (await dataOf(P, "notes")).length, placeBefore = (await dataOf(P, "notePlacements")).length;
  await P.fill("#quickTitle", "Quick one");
  await P.press("#quickTitle", "Enter");
  await P.waitForFunction(() => (window.__DATA.notes || []).some((n) => n.title === "Quick one")).catch(() => null);
  await P.waitForTimeout(500);
  const notesAfter = await dataOf(P, "notes"), placeAfter = await dataOf(P, "notePlacements");
  const made = notesAfter.find((n) => n.title === "Quick one");
  check(`${tag}: quick title wrote exactly one new Note`, !!made && notesAfter.length === notesBefore + 1, JSON.stringify(made));
  const placed = made ? placeAfter.filter((p) => p.noteId === made.noteId) : [];
  check(`${tag}: ...AND exactly one placement for it, in Alpha, active, after the others`, placed.length === 1 && placed[0].folderId === "fA" && placed[0].status === "active" && placed[0].order >= 2 && placeAfter.length === placeBefore + 1, JSON.stringify(placed));
  check(`${tag}: ...for the folder's own owner and tenant`, !!made && made.tenantId === "t1" && made.ownerPersonId === "p1" && placed[0]?.ownerPersonId === "p1" && placed[0]?.tenantId === "t1");
  check(`${tag}: ...a revision of that Note was written too (a real, permanent Note)`, !!made && (await dataOf(P, "noteRevisions")).some((r) => r.noteId === made.noteId));
  check(`${tag}: the new Note is listed in Alpha and the box is empty and ready again`, (await cards(P)).length === 3 && (await P.inputValue("#quickTitle")) === "");
  const okMsg = await status(P);
  check(`${tag}: a confirmation is shown${lang === "bn" ? " in Bangla" : ""}`, lang === "bn" ? hasBn(okMsg) : /Quick one/.test(okMsg) && /created/.test(okMsg), okMsg);
  const w0 = await fsWrites(P);
  await P.press("#quickTitle", "Enter");
  check(`${tag}: an empty title is refused in words and writes nothing`, (await fsWrites(P)) === w0 && (lang === "bn" ? hasBn(await status(P)) : /Type a title/.test(await status(P))), await status(P));

  // ---- 7b. (Architect review) a tap anywhere on a card opens that Note, as in Siyagah -----------------------------
  {
    const box = await P.evaluate(() => { const c = document.querySelector('#folderNotes .fn-card[data-note-id="n2"] .note-card'); const r = c.getBoundingClientRect(); return { w: r.width, h: r.height }; });
    await P.click('#folderNotes .fn-card[data-note-id="n2"] .note-card', { position: { x: 12, y: box.h - 6 } }); // the card's empty lower edge, not its title
    const opened = await P.waitForFunction(() => { const p = document.getElementById("notePane"); return p && !p.hidden && /Note Two/.test(p.textContent); }, null, { timeout: 4000 }).then(() => true, () => false);
    check(`${tag}: a tap on a card's empty space (not its title) opens that Note in the pane`, opened);
    if (!tierWide && opened) { await P.click("[data-pane-back]"); await P.waitForSelector("#folderNotes", { state: "visible" }); }
  }

  // ---- 8. ✚ New note (list header, pane bar) and the folder menu's Add note here ------------------------------
  const nBefore = (await dataOf(P, "notes")).length;
  await P.click("#folderNotes [data-fn-newnote]");
  await P.waitForSelector("#notePane:not([hidden])");
  const newest = (await dataOf(P, "notes")).filter((n) => n.title === "");
  check(`${tag}: ✚ New note makes an untitled Note in this folder and opens it`, (await dataOf(P, "notes")).length === nBefore + 1 && newest.length === 1 && (await dataOf(P, "notePlacements")).some((p) => p.noteId === newest[0].noteId && p.folderId === "fA"));
  const barNew = await P.evaluate(() => { const b = document.querySelector("[data-pane-new]"), r = b.getBoundingClientRect(); return { shown: !b.hidden && r.width > 0, w: r.width, h: r.height, label: b.getAttribute("aria-label") }; });
  check(`${tag}: the Note's own bar carries ✚ New note, 40px tall, with a name`, barNew.shown && barNew.h >= 39.5 && barNew.w >= 39.5 && !!barNew.label, JSON.stringify(barNew));
  const bar = await P.evaluate(() => { const b = document.querySelector("[data-pane-bar]"); return b.scrollWidth <= b.clientWidth + 1; });
  check(`${tag}: the Note bar still fits on one line with ✚`, bar);
  await P.click("[data-pane-new]");
  await P.waitForFunction((n) => window.__DATA.notes.length === n + 2, nBefore);
  const alphaPlacements = (await dataOf(P, "notePlacements")).filter((p) => p.folderId === "fA" && p.status === "active").length;
  check(`${tag}: ...Alpha now holds 5 Notes (2 + quick + two new)`, alphaPlacements === 5, String(alphaPlacements));
  if (!tierWide) { await P.click("[data-pane-back]"); await P.waitForSelector("#folderNotes", { state: "visible" }); }
  await toTree(P);
  await P.click('.folder-row[data-folder-id="fG"] .folder-menu-btn');
  await P.click('.folder-row[data-folder-id="fG"] [data-folder-addnote]');
  check(`${tag}: a folder's ⋯ menu has Add note here, which opens that list with the title box focused`,
    (await listTitle(P)) === "Gamma" && (await P.evaluate(() => document.activeElement && document.activeElement.id)) === "quickTitle");

  // ---- 9. Failure reaches the reader in words (I15) ----------------------------------------------------
  await P.evaluate(() => { window.__DATA.noteFolders = window.__DATA.noteFolders.filter((f) => f.folderId !== "fG"); });
  await P.fill("#quickTitle", "Will fail");
  await P.press("#quickTitle", "Enter");
  await P.waitForSelector("#qr-write-failure-banner", { state: "visible", timeout: 8000 }).catch(() => null);
  const ban = await P.evaluate(() => { const b = document.getElementById("qr-write-failure-banner"); return b && getComputedStyle(b).display !== "none" ? b.textContent : ""; });
  check(`${tag}: a failed filing is shown in words, and says the Note itself was saved`, ban.length > 10 && (await dataOf(P, "notes")).some((n) => n.title === "Will fail"), ban);
  check(`${tag}: ...and the typed title is kept in the box, not lost`, (await P.inputValue("#quickTitle")) === "Will fail");

  // ---- 10. Geometry, targets, contrast ------------------------------------------------------------------------
  if (!embedFrame) { await P.reload(); await waitTree(P); }
  await tapFolder(P, "fA");
  const small = await smallTargets(P, "#folderNotes .fn-btn, #folderNotes .fn-chip, #folderNotes .fn-switch button, #folderNotes .note-open-btn, #folderNotes #quickTitleForm button, #folderNotes #quickTitle");
  check(`${tag}: every new button and field is at least 40px`, small.length === 0, JSON.stringify(small));
  check(`${tag}: no sideways scroll with the full list showing`, await noSideways(P));
  const header = await P.evaluate(() => [...document.querySelectorAll("#folderNotes .fn-head, #folderNotes .fn-path")].every((h) => h.scrollWidth <= h.clientWidth + 1));
  check(`${tag}: the list header rows hold their content without overflowing`, header);
  await P.click('#folderNotes [data-fn-mode="preview"]');
  for (const [name, sel] of [["the list title", "#folderNotes [data-fn-title]"], ["a card title", "#folderNotes .note-open-btn"], ["the preview text", "#folderNotes [data-note-preview]"], ["the in-N-folders line", "#folderNotes [data-in-folders]"], ["a chip", "#folderNotes .fn-chip"]]) {
    const exists = await P.$(sel);
    if (!exists) continue;
    const ratio = await contrast(P, sel);
    check(`${tag}: ${name} reads at 4.5:1 or better`, ratio >= 4.5, ratio.toFixed(2));
  }
  const ph = tierWide ? await contrast(P, "#notePlaceholder") : 21;
  check(`${tag}: the Note placeholder reads at 4.5:1 or better`, ph >= 4.5, ph.toFixed(2));
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|Failed to load resource|\[write failure\]/.test(e)).length === 0, errors.join(" | "));
  await ctx.close();
}

for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1440]) await run(lang, width);
  await run(lang, 1440, true); // the tray, on a wide screen: a 1008px document, three columns from 900px
  await run(lang, 1180, true); // a smaller screen: an 826px tray document, one panel at a time
}

await browser.close();
console.log(`\njourney-three-panel-browser${MUTATE ? " (mutation " + MUTATE + ")" : ""}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
