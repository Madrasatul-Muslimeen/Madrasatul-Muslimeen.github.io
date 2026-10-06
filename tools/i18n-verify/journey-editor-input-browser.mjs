// Note-pane round 4 (the Owner, 5 Oct 2026: "add all functions of the notepane of Siyagah in the notepane"), items
// 28-33 of docs/reference/2026-10-05-siyagah-note-pane-port-list.md: the toolbar in labelled groups on a narrow Note,
// ⊘ no colour, pasting a web address (link or plain), pasting formatted text (keep or plain), @ to link a Note, and
// a table's Σ total and sort. What was SAVED is read from the stub's revisions after Done. en and bn, 1280 and 390.
// Run from the repository root with `node serve.js` running.
//   --mutate=no-groups   the toolbar never groups                  -> the group checks fail
//   --mutate=no-none     ⊘ does nothing                            -> the no-colour check fails
//   --mutate=paste-raw   a pasted URL is pasted at once as text    -> the paste-choice checks fail
//   --mutate=no-link     choosing a Note after @ writes no Link     -> the Link check fails
//   --mutate=no-sort     ↑ / ↓ leave the rows as they were          -> the sort checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const SHOTS = (process.argv.find((a) => a.startsWith("--shots=")) || "").slice(8);
function swap(src, from, to) { if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 60)}`); return src.split(from).join(to); }
async function routeMutation(ctx) {
  if (!MUTATE) return;
  let body = fs.readFileSync("app/js/note-window.js", "utf8");
  if (MUTATE === "no-groups") body = swap(body, "const grouped = width > 0 && width < TOOLBAR_GROUPED_BELOW;", "const grouped = false;");
  else if (MUTATE === "no-none") body = swap(body, "      removeSwatch(v, mode);\n      return;", "      return;");
  else if (MUTATE === "paste-raw") body = swap(body, '      v.ed.pendingPaste = { kind: "url", url: one, text };\n      openPanel(v, "paste");\n      return;', "");
  else if (MUTATE === "no-link") body = swap(body, "try { await host.flags.link(note, row.noteId);", "try { void 0;");
  else if (MUTATE === "no-sort") body = swap(body, "      for (const r of body) parent.appendChild(r);\n", "");
  else throw new Error(`unknown mutation ${MUTATE}`);
  await ctx.route("**/js/note-window.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
}

const TABLE = "<table><tbody><tr><th>Name</th><th>Count</th></tr><tr><td>beta</td><td>2</td></tr><tr><td>alpha</td><td>10</td></tr><tr><td>gamma</td><td>1</td></tr></tbody></table>";
const BODY = `<p>Colour this word please.</p><h2>Alpha</h2><p>Paste here:</p><p>Mention here:</p>${TABLE}<p>End.</p>`;
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d); }, toMillis: function () { return new Date(d).getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteLinks = [];
  DATA.noteFolders.push(Object.assign({ _id: "t1__fA", folderId: "fA", name: "Alpha folder", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts("2024-09-01T10:00:00Z") }, own));
  function note(id, title, body, rev, when, order) {
    DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: rev, status: "active", createdAt: ts(when), updatedAt: ts(when) }, own));
    DATA.noteRevisions.push(Object.assign({ _id: "t1__" + rev, revisionId: rev, noteId: id, previousRevisionId: null, title: title, bodyHtml: body, revisionReason: "content-update", actorUid: "test-uid", createdAt: new Date(when) }, own));
    DATA.notePlacements.push(Object.assign({ _id: "t1__p" + id, placementId: "p" + id, noteId: id, folderId: "fA", order: order, status: "active" }, own));
  }
  note("n1", "Input Note", ${JSON.stringify(BODY)}, "r1", "2024-09-03T16:45:00Z", 0);
  note("n2", "Second Note", "<p>Two.</p>", "r2", "2024-09-02T16:45:00Z", 1);
})();`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const lang of ["en", "bn"]) for (const width of [1280, 390]) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await routeMutation(ctx);
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); localStorage.setItem("mmsa-journey-note-window", JSON.stringify({ x: 20, y: 20, w: 920, h: 820 })); } catch {} });
  const { page: P, errors } = await openPage(ctx, "/app/journey-map.html#folders");
  await P.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 1 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
  await P.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
  await P.waitForSelector("#folderNotes [data-note-id='n1'] [data-note-open]", { state: "visible" });
  await P.click("#folderNotes [data-note-id='n1'] [data-note-open]");
  await P.waitForSelector("#notePane [data-pane-title]", { state: "visible" });
  const S = "#notePane", q = (x) => `${S} ${x}`;
  const vis = (sel) => P.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
  const toggleEdit = async (scope = S) => {
    if (await vis(`${scope} [data-pane-bar] > [data-pane-edit-toggle]`)) await P.click(`${scope} [data-pane-bar] > [data-pane-edit-toggle]`);
    else { await P.click(`${scope} [data-pane-menu-btn]`); await P.click(`${scope} [data-pane-menu] [data-pane-edit-toggle]`); }
  };
  /** A tool: open its group first when the toolbar is grouped. */
  const tool = async (cmd, scope = S) => {
    const sel = `${scope} [data-edit-toolbar] [data-cmd="${cmd}"]`;
    if (!(await vis(sel))) { const g = await P.getAttribute(sel, "data-tb-g"); await P.click(`${scope} [data-edit-toolbar] [data-tb-tab="${g}"]`); }
    await P.click(sel); await P.waitForTimeout(80);
  };
  const selectText = (text, scope = S) => P.evaluate(([s, text]) => {
    const b = document.querySelector(s + " [data-edit-body]"); b.focus();
    const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const i = n.data.indexOf(text); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + text.length); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); return true; } }
    return false;
  }, [scope, text]);
  const caretAfter = (text, scope = S) => P.evaluate(([s, text]) => {
    const b = document.querySelector(s + " [data-edit-body]"); b.focus();
    const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const i = n.data.indexOf(text); if (i >= 0) { const r = document.createRange(); r.setStart(n, i + text.length); r.collapse(true); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); return true; } }
    return false;
  }, [scope, text]);
  const paste = (data) => P.evaluate(([s, data]) => { const b = document.querySelector(s + " [data-edit-body]"); const dt = new DataTransfer(); for (const [k, v] of Object.entries(data)) dt.setData(k, v); b.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); }, [S, data]);
  const editorHtml = () => P.evaluate((s) => document.querySelector(s + " [data-edit-body]").innerHTML, S);

  await toggleEdit();
  await P.waitForSelector(q("[data-edit-body]"), { state: "visible" });
  await P.waitForTimeout(250);

  // ---- 28. groups on a narrow Note ----
  const tb = await P.evaluate((s) => { const t = document.querySelector(s + " [data-edit-toolbar]"); const shown = (e) => getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0; return { grouped: t.classList.contains("tb-grouped"), tabs: [...t.querySelectorAll("[data-tb-tab]")].filter(shown).map((b) => b.textContent.trim()), tools: [...t.querySelectorAll("[data-cmd]")].filter(shown).map((b) => b.dataset.cmd), sideways: t.scrollWidth > t.clientWidth + 1, w: document.querySelector(s + " [data-pane-body]").clientWidth }; }, S);
  check(`${tag}: a narrow Note (${tb.w}px) shows the toolbar as five labelled groups`, tb.grouped && tb.tabs.length === 5 && tb.tabs[0].startsWith("Aa"), JSON.stringify(tb));
  check(`${tag}: all five group tabs are fully in sight (none cut at the edge)`, await P.evaluate((s) => { const t = document.querySelector(s + " [data-edit-toolbar]"), r = t.getBoundingClientRect(); return [...t.querySelectorAll("[data-tb-tab]")].every((b) => { const x = b.getBoundingClientRect(); return x.left >= r.left - 1 && x.right <= r.right + 1 && b.scrollWidth <= b.clientWidth + 1; }); }, S));
  check(`${tag}: ...the first group's tools only, and nothing scrolls sideways`, tb.tools.includes("bold") && !tb.tools.includes("h1") && !tb.tools.includes("undo") && !tb.sideways, JSON.stringify(tb));
  if (lang === "bn") check(`${tag}: the group names are Bangla`, tb.tabs.slice(1).every((x) => /[ঀ-৿]/.test(x)), JSON.stringify(tb.tabs));
  await P.click(q('[data-edit-toolbar] [data-tb-tab="1"]'));
  const tb2 = await P.evaluate((s) => { const t = document.querySelector(s + " [data-edit-toolbar]"); const shown = (e) => getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0; return { tools: [...t.querySelectorAll("[data-cmd]")].filter(shown).map((b) => b.dataset.cmd), sel: t.querySelector('[data-tb-tab="1"]').getAttribute("aria-selected"), small: [...t.querySelectorAll("[data-cmd], [data-tb-tab]")].filter(shown).filter((b) => b.getBoundingClientRect().height < 39.5).length }; }, S);
  check(`${tag}: H Headings shows the heading tools`, tb2.tools.includes("h1") && tb2.tools.includes("hdown") && !tb2.tools.includes("bold") && tb2.sel === "true", JSON.stringify(tb2));
  check(`${tag}: every tab and tool is 40px tall`, tb2.small === 0, JSON.stringify(tb2));
  if (SHOTS) await P.screenshot({ path: `${SHOTS}/r4-${tag.replace("/", "-")}-groups.png` });

  // ---- 29. ⊘ no colour ----
  await selectText("this word"); await tool("color");
  await P.click(q('[data-edit-panel] [data-swatch="#B3261E"]')); await P.waitForTimeout(80);
  check(`${tag}: (setup) the words are red`, /color: rgb\(179, 38, 30\)|#B3261E/i.test(await editorHtml()));
  await selectText("this word");
  await P.click(q('[data-edit-panel] [data-swatch=""]')); await P.waitForTimeout(80);
  check(`${tag}: ⊘ takes the colour off again`, !/color: rgb\(179, 38, 30\)|#B3261E/i.test(await editorHtml()), await editorHtml());
  await P.click(q("[data-edit-panel] [data-panel-close]")).catch(() => {});

  // ---- 30. a pasted web address ----
  await caretAfter("Paste here:");
  await paste({ "text/plain": "https://example.org/page" });
  await P.waitForTimeout(100);
  check(`${tag}: pasting a web address asks "a link, or plain text?"`, await vis(q('[data-edit-panel] [data-paste-choice="link"]')) && await vis(q('[data-edit-panel] [data-paste-choice="plain"]')));
  check(`${tag}: ...and nothing is pasted until you choose`, !(await editorHtml()).includes("example.org"));
  if (SHOTS) await P.screenshot({ path: `${SHOTS}/r4-${tag.replace("/", "-")}-paste.png` });
  await P.click(q('[data-edit-panel] [data-paste-choice="link"]')); await P.waitForTimeout(80);
  check(`${tag}: "A link" pastes a link`, /<a href="https:\/\/example\.org\/page">https:\/\/example\.org\/page<\/a>/.test(await editorHtml()), await editorHtml());
  await caretAfter("Mention here:");
  await paste({ "text/plain": "https://plain.example.org" });
  await P.click(q('[data-edit-panel] [data-paste-choice="plain"]')); await P.waitForTimeout(80);
  check(`${tag}: "Plain text" pastes the address as text`, (await editorHtml()).includes("https://plain.example.org") && !/<a href="https:\/\/plain/.test(await editorHtml()));

  // ---- 31. pasted formatting ----
  await caretAfter("End.");
  await paste({ "text/html": "<b>Bold paste</b> and <i>more</i>", "text/plain": "Bold paste and more" });
  check(`${tag}: pasting formatted text asks "keep the formatting, or plain text?"`, await vis(q('[data-edit-panel] [data-paste-choice="rich"]')));
  await P.click(q('[data-edit-panel] [data-paste-choice="rich"]')); await P.waitForTimeout(80);
  check(`${tag}: "Keep the formatting" keeps it`, /<b>Bold paste<\/b>/.test(await editorHtml()));
  await caretAfter("End.");
  await paste({ "text/html": "<b>Second paste</b>", "text/plain": "Second paste" });
  await P.click(q('[data-edit-panel] [data-paste-choice="plain"]')); await P.waitForTimeout(80);
  check(`${tag}: "Plain text" drops it`, (await editorHtml()).includes("Second paste") && !/<b>Second paste<\/b>/.test(await editorHtml()));

  // ---- 32. @ to link a Note ----
  await caretAfter("Mention here:");
  await P.keyboard.type(" @Sec");
  await P.waitForTimeout(150);
  const men = await P.evaluate(() => { const m = document.querySelector("[data-mention]"); const r = m?.getBoundingClientRect(); return m ? { rows: [...m.querySelectorAll("[data-mention-pick]")].map((b) => b.textContent.trim()), inside: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1 } : null; });
  check(`${tag}: typing @ lists your Notes, narrowed by what follows`, !!men && men.rows.length === 1 && men.rows[0].includes("Second Note"), JSON.stringify(men));
  check(`${tag}: ...the list is inside the screen`, !!men?.inside, JSON.stringify(men));
  if (SHOTS) await P.screenshot({ path: `${SHOTS}/r4-${tag.replace("/", "-")}-mention.png` });
  await P.keyboard.press("Enter");
  await P.waitForTimeout(400);
  check(`${tag}: Enter puts "@Second Note" in the text`, (await editorHtml()).includes("@Second Note"), await editorHtml());
  check(`${tag}: ...and adds a Link from this Note to it`, await P.evaluate(() => (window.__DATA.noteLinks || []).some((l) => l.fromNoteId === "n1" && l.toNoteId === "n2" && l.status === "active") || (window.__stubWriteData || []).some((w) => w.col === "noteLinks" && w.data?.fromNoteId === "n1" && w.data?.toNoteId === "n2")));
  check(`${tag}: the list closed`, !(await P.$("[data-mention]")));
  await P.keyboard.type(" @");
  await P.waitForTimeout(100);
  await P.keyboard.press("Escape");
  check(`${tag}: Esc closes the list and keeps editing`, !(await P.$("[data-mention]")) && !!(await P.$(q("[data-edit-body]"))));

  // ---- 33. table Σ and sort ----
  await caretAfter("10");
  await tool("table");
  await P.click(q('[data-edit-panel] [data-table-op="sum"]')); await P.waitForTimeout(80);
  const rowsAfter = () => P.evaluate((s) => [...document.querySelector(s + " [data-edit-body] table").querySelectorAll("tr")].map((r) => [...r.children].map((c) => c.textContent.trim())), S);
  let rows = await rowsAfter();
  check(`${tag}: Σ adds a total row for the column`, JSON.stringify(rows.at(-1)) === JSON.stringify(["Σ", "13"]), JSON.stringify(rows));
  await caretAfter("10");
  await P.click(q('[data-edit-panel] [data-table-op="sortAsc"]')); await P.waitForTimeout(80);
  rows = await rowsAfter();
  check(`${tag}: ↑ sorts by the column's numbers, headings first, Σ last`, JSON.stringify(rows.map((r) => r[0])) === JSON.stringify(["Name", "gamma", "beta", "alpha", "Σ"]), JSON.stringify(rows));
  await caretAfter("beta");
  await P.click(q('[data-edit-panel] [data-table-op="sortDesc"]')); await P.waitForTimeout(80);
  rows = await rowsAfter();
  check(`${tag}: ↓ on the name column sorts the words Z→A`, JSON.stringify(rows.map((r) => r[0])) === JSON.stringify(["Name", "gamma", "beta", "alpha", "Σ"]), JSON.stringify(rows));
  await caretAfter("gamma");
  await P.click(q('[data-edit-panel] [data-table-op="sortAsc"]')); await P.waitForTimeout(80);
  rows = await rowsAfter();
  check(`${tag}: ↑ on the name column sorts A→Z`, JSON.stringify(rows.map((r) => r[0])) === JSON.stringify(["Name", "alpha", "beta", "gamma", "Σ"]), JSON.stringify(rows));
  await P.click(q("[data-edit-panel] [data-panel-close]")).catch(() => {});

  // Done -> what was saved
  await toggleEdit();
  await P.waitForFunction((s) => !document.querySelector(s + " [data-edit-body]"), S, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(400);
  const saved = await P.evaluate(() => { const r = window.__DATA.noteRevisions.filter((x) => x.noteId === "n1"); return r[r.length - 1].bodyHtml; });
  check(`${tag}: saved: the link, the kept formatting, the @, the sorted table with Σ, no colour`, /href="https:\/\/example\.org\/page"/.test(saved) && /<b>Bold paste<\/b>/.test(saved) && saved.includes("@Second Note") && /alpha[\s\S]*beta[\s\S]*gamma[\s\S]*Σ/.test(saved) && !/rgb\(179, 38, 30\)/.test(saved), saved);

  // A wide window keeps the toolbar as one row
  if (width >= 1024) {
    await P.click(q("[data-pane-menu-btn]")); await P.click(q("[data-pane-menu] [data-pane-popout]"));
    const W = ".note-win[data-note-id='n1']";
    await P.waitForSelector(W, { timeout: 5000 }).catch(() => {});
    await toggleEdit(W);
    await P.waitForSelector(`${W} [data-edit-body]`, { timeout: 5000 }).catch(() => {});
    await P.waitForTimeout(250);
    const wide = await P.evaluate((w) => { const t = document.querySelector(w + " [data-edit-toolbar]"); return { grouped: t.classList.contains("tb-grouped"), tabsShown: getComputedStyle(t.querySelector("[data-tb-tabs]")).display !== "none", w: document.querySelector(w + " [data-pane-body]").clientWidth }; }, W);
    check(`${tag}: a wide Note (${wide.w}px) keeps every tool in one row`, !wide.grouped && !wide.tabsShown && wide.w >= 600, JSON.stringify(wide));
    await toggleEdit(W);
  }

  check(`${tag}: no sideways scroll`, await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
