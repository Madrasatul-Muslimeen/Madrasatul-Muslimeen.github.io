// S12 (Siyagah folder plan, 4 Oct 2026, decision 66, issue #562): the Note editor -- underline, strikethrough, checklist, quote, link,
// table, text colour, highlight, alignment, redo, clear formatting; the cleaner growing to let exactly those through; a drag grip and a
// fold arrow on every heading while editing; the same toolbar in a pop-up window; Bangla times. Real input (mouse, keyboard); what was
// SAVED is read from the stub's own revisions (window.__DATA), after Done.
// Run from the repository root with `node serve.js` running.
//   --mutate-style-through     the cleaner lets any style value through
//   --mutate-move-leaves-body  a section move leaves its body behind
//   --mutate-redo-noop         Redo does nothing
//   --mutate-js-link-ok        the link panel accepts a javascript: address
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = process.argv.find((a) => a.startsWith("--mutate-"))?.slice(9) ?? null;
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const BODY = "<p>Plain alpha text</p><h2>Alpha</h2><p>Alpha body one.</p><p>Alpha body two.</p><h2>Beta</h2><p>Beta body.</p><h2>Gamma</h2><p>Gamma body.</p>";
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true;
  window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d); }, toMillis: function () { return new Date(d).getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = [];
  DATA.noteFolders.push(Object.assign({ _id: "t1__fA", folderId: "fA", name: "Alpha", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts("2024-09-01T10:00:00Z") }, own));
  DATA.notes.push(Object.assign({ _id: "t1__n1", noteId: "n1", title: "Editor Note", bodyHtml: ${JSON.stringify(BODY)}, currentRevisionId: "r2", status: "active", createdAt: ts("2024-08-01T15:09:00Z"), updatedAt: ts("2024-09-03T16:45:00Z") }, own));
  function R(id, body, d, prev) { DATA.noteRevisions.push(Object.assign({ _id: "t1__" + id, revisionId: id, noteId: "n1", previousRevisionId: prev, title: "Editor Note", bodyHtml: body, revisionReason: "content-update", actorUid: "test-uid", createdAt: new Date(d) }, own)); }
  R("r1", "<p>Old.</p>", "2024-09-01T15:09:00Z", null); R("r2", ${JSON.stringify(BODY)}, "2024-09-03T16:45:00Z", "r1");
  DATA.notePlacements.push(Object.assign({ _id: "t1__p1", placementId: "p1", noteId: "n1", folderId: "fA", order: 0, status: "active" }, own));
})();`;

const browser = await chromium.launch();
const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(lang, width, mode) { // mode: page | tray | window
  const tag = `${lang} ${width}px ${mode}`;
  const en = lang === "en";
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
  if (MUTATE) {
    await ctx.route("**/*", async (route) => {
      const url = route.request().url();
      if (!/note-window\.js|note-sanitize\.js/.test(url)) return route.fallback();
      const res = await route.fetch();
      let body = await res.text();
      const before = body;
      // (adding "onerror" to the allow-list alone is NOT enough to break the cleaner: DOMPurify still checks an allowed attribute's value against
      // ALLOWED_URI_REGEXP and drops a handler's script text -- found by running that mutation, which passed. So the mutation removes the narrowing.)
      if (MUTATE === "style-through" && /note-sanitize/.test(url)) body = body.replace("if (STYLE_VALUE[prop] && STYLE_VALUE[prop].test(val)) kept.push", "if (true) kept.push");
      if (MUTATE === "move-leaves-body" && /note-window/.test(url)) body = body.replace("const body = editBodyEl(v), nodes = sectionNodes(h);", "const body = editBodyEl(v), nodes = [h];");
      if (MUTATE === "redo-noop" && /note-window/.test(url)) body = body.replace('undo: "undo", redo: "redo"', 'undo: "undo", redo: "copy"');
      if (MUTATE === "js-link-ok" && /note-window/.test(url)) body = body.replace("if (!isSafeNoteHref(url)) {", "if (false) {");
      const target = { "style-through": /note-sanitize/, "move-leaves-body": /note-window/, "redo-noop": /note-window/, "js-link-ok": /note-window/ }[MUTATE];
      if (body === before && target.test(url)) console.log(`  (mutation ${MUTATE} did not apply to ${url})`);
      await route.fulfill({ response: res, body });
    });
  }
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
  let page, P, errors = [], off = { x: 0, y: 0 };
  if (mode === "tray") {
    ({ page, errors } = await openPage(ctx, "/app/quranrevival.html"));
    await page.click("#tabJourneyBtn");
    await page.waitForSelector("#journeyTray:not([hidden])", { timeout: 5000 });
    const fe = await page.$("#journeyTray iframe");
    P = await fe.contentFrame();
    off = await fe.boundingBox();
  } else {
    ({ page, errors } = await openPage(ctx, "/app/journey-map.html#folders"));
    P = page;
  }
  await P.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 1 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
  await P.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
  await P.waitForSelector("#folderNotes [data-note-id='n1'] [data-note-open]", { state: "visible" });
  await P.click("#folderNotes [data-note-id='n1'] [data-note-open]");
  await P.waitForSelector("[data-pane-title]", { state: "visible" });
  let S = "#notePane";
  if (mode === "window") {
    await P.click("[data-pane-menu-btn]:visible");
    await P.click("[data-pane-menu] [data-pane-popout]");
    S = '.note-win[data-note-id="n1"]';
    await P.waitForSelector(S);
  }
  const K = page.keyboard, M = page.mouse; // a Frame has neither: input always goes through the top page
  const q = (x) => `${S} ${x}`;
  // select from the start of one text to the end of another (a selection across inline elements)
  const selectAcross = (from, to) => P.evaluate(([s, a, b]) => {
    const body = document.querySelector(s + " [data-edit-body]"); body.focus();
    const find = (t) => { const w = document.createTreeWalker(body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const i = n.data.indexOf(t); if (i >= 0) return [n, i]; } return null; };
    const x = find(a), y = find(b); if (!x || !y) return false;
    const r = document.createRange(); r.setStart(x[0], x[1]); r.setEnd(y[0], y[1] + b.length);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); return true;
  }, [S, from, to]);
  const sideways = () => P.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  const vis = (sel) => P.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
  const toggleEdit = async () => {
    if (await vis(q("[data-pane-bar] > [data-pane-edit-toggle]"))) await P.click(q("[data-pane-bar] > [data-pane-edit-toggle]"));
    else { await P.click(q("[data-pane-menu-btn]")); await P.click(q("[data-pane-menu] [data-pane-edit-toggle]")); }
  };
  const startEdit = async () => { await toggleEdit(); await P.waitForSelector(q("[data-edit-body]"), { state: "visible" }); await wait(150); };
  const nRevs = () => P.evaluate(() => window.__DATA.noteRevisions.filter((r) => r.noteId === "n1").length);
  const done = async () => { await toggleEdit(); await P.waitForFunction((s) => !document.querySelector(s + " [data-edit-body]"), S); };
  const saved = () => P.evaluate(() => { const r = window.__DATA.noteRevisions.filter((x) => x.noteId === "n1"); return r[r.length - 1].bodyHtml; });
  const editorHtml = () => P.evaluate((s) => document.querySelector(s + " [data-edit-body]").innerHTML, S);
  // Updated in place 5 Oct 2026 (note-pane round 4, item 28): a narrow Note groups the toolbar (Aa · H · ≡ · + · ↺); a tool shows once its group is open.
  const tool = async (cmd) => {
    const sel = q(`[data-edit-toolbar] [data-cmd="${cmd}"]`);
    const shown = await P.evaluate((x) => { const e = document.querySelector(x); return !!e && getComputedStyle(e).display !== "none"; }, sel);
    if (!shown) await P.click(q(`[data-edit-toolbar] [data-tb-tab="${await P.getAttribute(sel, "data-tb-g")}"]`));
    await P.click(sel);
  };
  const selectText = (text) => P.evaluate(([s, text]) => {
    const b = document.querySelector(s + " [data-edit-body]"); b.focus();
    const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const i = n.data.indexOf(text); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + text.length); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); return true; } }
    return false;
  }, [S, text]);
  const parse = (html) => P.evaluate((h) => { const d = document.createElement("div"); d.innerHTML = h; return { text: d.textContent, h2: [...d.querySelectorAll("h2")].map((x) => x.textContent), html: d.innerHTML }; }, html);

  // ---- the toolbar: every button there, named in the page language, 40px, the page never scrolls sideways ----------
  await startEdit();
  const tb = await P.evaluate((s) => {
    const t = document.querySelector(s + " [data-edit-toolbar]"), r = t.getBoundingClientRect();
    const btns = [...t.querySelectorAll("button[data-cmd]")]; // updated in place 5 Oct 2026: the group tabs are not tools
    const shown = btns.filter((b) => getComputedStyle(b).display !== "none");
    return { cmds: btns.map((b) => b.dataset.cmd), minW: Math.min(...shown.map((b) => b.getBoundingClientRect().width)), minH: Math.min(...shown.map((b) => b.getBoundingClientRect().height)), labels: btns.map((b) => b.getAttribute("aria-label")), h: r.height, right: r.right, vw: innerWidth, grouped: t.classList.contains("tb-grouped") };
  }, S);
  const WANT = ["bold", "italic", "underline", "strike", "ul", "ol", "check", "quote", "link", "table", "color", "highlight", "left", "center", "right", "undo", "redo", "clear"];
  check(`${tag}: the toolbar has every button the round asks for`, WANT.every((c) => tb.cmds.includes(c)), tb.cmds.join());
  check(`${tag}: every toolbar button is at least 40px`, tb.minW >= 39.5 && tb.minH >= 39.5, `${tb.minW}x${tb.minH}`);
  check(`${tag}: the toolbar is one row (or, grouped, the groups and one group's tools) inside the screen`, (tb.grouped ? tb.h <= 150 : tb.h <= 48) && tb.right <= tb.vw + 1, JSON.stringify({ h: tb.h, right: tb.right, vw: tb.vw, grouped: tb.grouped })); // updated in place 5 Oct 2026 (item 28)
  check(`${tag}: the buttons are named in ${en ? "English" : "Bangla"}`, en ? tb.labels.every((x) => /[A-Za-z]/.test(x)) : tb.labels.every((x) => hasBn(x)), tb.labels.join("|"));
  check(`${tag}: the toolbar never makes the page scroll sideways`, await sideways());
  const bnRaw = await P.evaluate((s) => [...document.querySelectorAll(s + " [data-edit-toolbar] [data-cmd]")].some((b) => /^(Bold|Italic)$/.test(b.getAttribute("aria-label"))), S);
  if (!en) check(`${tag}: no toolbar label is left in English`, !bnRaw);

  // ---- redo undoes an undo ---------------------------------------------------------------------------------------------
  await P.click(q("[data-edit-body]")); await K.press("Control+End"); await K.type("ZZTOP");
  await tool("undo");
  const afterUndo = await editorHtml();
  await tool("redo");
  const afterRedo = await editorHtml();
  check(`${tag}: Undo takes the typing away`, !afterUndo.includes("ZZTOP"), afterUndo.slice(-80));
  check(`${tag}: Redo brings it back`, afterRedo.includes("ZZTOP"), afterRedo.slice(-80));
  await tool("undo");

  // ---- inline formats and block formats --------------------------------------------------------------------------------
  await selectText("Plain"); await tool("underline");
  await selectText("alpha"); await tool("strike");
  await selectText("Alpha body one."); await tool("quote");
  await selectText("Beta body."); await tool("color");
  // Updated in place 5 Oct 2026 (note-pane round 4, item 29): the six fixed swatches, then ⊘ (no colour).
  check(`${tag}: Text colour opens a palette of fixed swatches`, (await P.locator(q('[data-swatch-mode="color"]:not(.tb-none)')).count()) === 6 && (await P.locator(q('[data-swatch-mode="color"].tb-none')).count()) === 1);
  await P.click(q('[data-swatch="#B3261E"]'));
  await selectText("Gamma body."); await tool("highlight");
  await P.click(q('[data-swatch="#FFF59D"]'));
  await selectText("Gamma body."); await tool("center");
  await selectText("Alpha body two."); await tool("check");
  const li = P.locator(q("ul[data-check] > li")).first();
  const lb = await li.boundingBox();
  await M.click(lb.x + 10, lb.y + 8);
  await done();
  let html = await saved();
  check(`${tag}: Underline saves <u>`, /<u>Plain<\/u>/.test(html), html);
  check(`${tag}: Strikethrough saves <strike> or <s>`, /<(strike|s)>alpha<\/(strike|s)>/.test(html), html);
  check(`${tag}: Quote saves <blockquote>`, /<blockquote>[^]*Alpha body one\./.test(html), html);
  check(`${tag}: Text colour saves a colour style`, /color: rgb\(179, 38, 30\)/.test(html), html);
  check(`${tag}: Highlight saves a background colour`, /background-color: rgb\(255, 245, 157\)/.test(html), html);
  check(`${tag}: Centre saves text-align: center`, /text-align: center/.test(html), html);
  check(`${tag}: Checklist saves a checklist, and the tick is saved`, /<ul data-check="1">[^]*data-checked="true"[^]*Alpha body two\./.test(html), html);
  check(`${tag}: the saved HTML carries no class, script or handler`, !/class=|<script|\son\w+=/i.test(html), html);
  check(`${tag}: the read view shows the ticked box after save`, await P.evaluate((s) => !!document.querySelector(s + ' [data-pane-body] ul[data-check] > li[data-checked="true"]'), S));
  await startEdit();
  check(`${tag}: the tick is still there when the Note is opened to edit again`, await P.evaluate((s) => !!document.querySelector(s + ' [data-edit-body] ul[data-check] > li[data-checked="true"]'), S));
  // untick, then clear formatting and align left on the ticked item's neighbours
  const li2 = P.locator(q("ul[data-check] > li")).first();
  const lb2 = await li2.boundingBox();
  await M.click(lb2.x + 10, lb2.y + 8);
  check(`${tag}: pressing the box again unticks it`, await P.evaluate((s) => !document.querySelector(s + ' [data-edit-body] li[data-checked="true"]'), S));
  await selectAcross("Plain", "text"); await tool("clear");
  html = await editorHtml();
  check(`${tag}: Clear formatting removes underline and strikethrough`, !/<(u|s|strike)>/.test(html.split("<h2")[0]), html.split("<h2")[0]);
  await selectText("Gamma body."); await tool("left");
  check(`${tag}: Align left writes text-align: left`, /text-align: left/.test(await editorHtml()));
  await selectText("Gamma body."); await tool("right");
  check(`${tag}: Align right writes text-align: right`, /text-align: right/.test(await editorHtml()));

  // ---- link ----------------------------------------------------------------------------------------------------------------
  await selectText("Beta body."); await tool("link");
  await P.fill(q("[data-panel-url]"), "javascript:alert(1)");
  await P.click(q("[data-panel-apply]"));
  const jsMsg = await P.evaluate((s) => { const m = document.querySelector(s + " [data-panel-msg]"); return m && !m.hidden ? m.textContent : ""; }, S);
  check(`${tag}: a javascript: address is refused, in words`, jsMsg.length > 0 && (en ? /http/.test(jsMsg) : hasBn(jsMsg)), jsMsg);
  await P.fill(q("[data-panel-url]"), "https://example.org/x");
  await P.click(q("[data-panel-apply]"));
  check(`${tag}: a good address makes a link`, /<a href="https:\/\/example\.org\/x"/.test(await editorHtml()), await editorHtml());
  await selectText("Beta body."); await tool("link");
  check(`${tag}: the link panel is filled with the link's address`, (await P.inputValue(q("[data-panel-url]"))) === "https://example.org/x");
  await P.fill(q("[data-panel-url]"), "mailto:a@b.co");
  await P.click(q("[data-panel-apply]"));
  check(`${tag}: a link can be edited to a mailto: address`, /<a href="mailto:a@b\.co"/.test(await editorHtml()));
  await done();
  html = await saved();
  check(`${tag}: the link round-trips through save`, /<a href="mailto:a@b\.co" target="_blank" rel="noopener noreferrer">Beta body\.<\/a>/.test(html), html);
  await startEdit();
  await selectText("Beta body."); await tool("link"); await P.click(q("[data-panel-unlink]"));
  check(`${tag}: Remove link takes the link away and keeps the words`, !/<a /.test(await editorHtml()) && (await editorHtml()).includes("Beta body."));

  // ---- table ---------------------------------------------------------------------------------------------------------------
  await P.click(q("[data-edit-body]")); await K.press("Control+End");
  await tool("table");
  await P.fill(q("[data-table-rows]"), "2"); await P.fill(q("[data-table-cols]"), "3");
  check(`${tag}: the table panel fits the screen`, await sideways());
  await P.click(q("[data-table-insert]"));
  const tcount = () => P.evaluate((s) => { const t = document.querySelector(s + " [data-edit-body] table"); return t ? { r: t.querySelectorAll("tr").length, c: t.querySelector("tr").children.length } : null; }, S);
  const t0 = await tcount();
  check(`${tag}: Insert table makes rows × columns`, t0 && t0.r === 2 && t0.c === 3, JSON.stringify(t0));
  const cellBox = async () => { const b = await P.locator(q("[data-edit-body] table td")).first().boundingBox(); return b; };
  const clickCell = async () => { await P.evaluate((s) => document.querySelector(s + " [data-edit-body] table td").scrollIntoView({ block: "center" }), S); const b = await cellBox(); globalThis.__hit = await P.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + "." + e.className : "none"; }, [b.x + 8 - off.x, b.y + 8 - off.y]); await M.click(b.x + 8, b.y + 8); };
  await clickCell(); await tool("table"); await P.click(q('[data-table-op="addRow"]'));
  const t1 = await tcount();
  await P.click(q('[data-table-op="addCol"]'));
  const t2 = await tcount();
  await P.click(q('[data-table-op="delRow"]'));
  const t3 = await tcount();
  await clickCell(); // the panel stays open while the table is worked on
  await P.click(q('[data-table-op="delCol"]'));
  const t4 = await tcount();
  check(`${tag}: add row / add column / remove row / remove column each change the table by one`, t1.r === 3 && t2.c === 4 && t3.r === 2 && t4.c === 3, JSON.stringify([t1, t2, t3, t4]) + " hit=" + globalThis.__hit + " " + (await P.evaluate((s) => document.querySelector(s + " [data-panel-msg]")?.textContent, S)));
  await done();
  html = await saved();
  const tp = await parse(html);
  check(`${tag}: the table round-trips through save`, /<table><tbody><tr><td>/.test(html) && (html.match(/<tr>/g) || []).length === 2 && (html.match(/<td>/g) || []).length === 6, html);

  // ---- the hostile paste ----------------------------------------------------------------------------------------------------
  await startEdit();
  await P.click(q("[data-edit-body]")); await K.press("Control+End");
  const HOSTILE = '<p>okpaste</p><img src=x onerror="window.__pwn=1"><script>window.__pwn=2</script><a href="javascript:window.__pwn=3">jslink</a><p style="color:red;position:fixed;background:url(javascript:window.__pwn=5);text-align:center" onclick="window.__pwn=4">styled</p><iframe src="https://example.org"></iframe><form><input></form>';
  await P.evaluate(([s, h]) => {
    const b = document.querySelector(s + " [data-edit-body]"); b.focus();
    const dt = new DataTransfer(); dt.setData("text/html", h); dt.setData("text/plain", "x");
    b.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, [S, HOSTILE]);
  await wait(300);
  // Updated in place 5 Oct 2026 (note-pane round 4, item 31): formatted text now asks first; "Keep the formatting"
  // is the harder case for the cleaner, so the checks below run on it.
  if (await P.$(q('[data-edit-panel] [data-paste-choice="rich"]'))) { await P.click(q('[data-edit-panel] [data-paste-choice="rich"]')); await wait(200); }
  const live = await editorHtml();
  check(`${tag}: a hostile paste never reaches the editor's DOM`, !/<script|onerror|onclick|javascript:|<iframe|<form|<input|position/i.test(live) && live.includes("okpaste"), live.slice(-300));
  check(`${tag}: ...and nothing in it ran`, await P.evaluate(() => window.__pwn === undefined));
  await done();
  html = await saved();
  check(`${tag}: the saved HTML of a hostile paste is clean`, !/<script|onerror|onclick|javascript:|<iframe|<form|<input|position|url\(/i.test(html) && html.includes("okpaste"), html.slice(-300));
  check(`${tag}: ...yet its colour and alignment survive`, /color: red/.test(html) && /text-align: center/.test(html), html.slice(-300));
  const direct = await P.evaluate(async () => {
    const m = await import("/app/js/note-sanitize.js");
    const bad = ['<p style="background:url(x)" onclick="1">a</p>', '<a href="JaVaScRiPt:1">x</a>', '<a href=" javascript:1">x</a>', '<img src="mailto:a@b.co">', '<p style="color:red;position:absolute;text-align:left">a</p>', '<p dir="evil" class="x">a</p>', '<svg onload=1></svg><style>p{}</style><object data=x></object>'];
    return bad.map((b) => m.sanitizeNoteHtml(b));
  });
  check(`${tag}: the cleaner removes every hostile form it is handed directly`, direct.every((h) => !/javascript|onclick|onload|<svg|<style|<object|url\(|position|class=|dir="evil"|src="mailto/i.test(h)) && /color: red; text-align: left/.test(direct[4]), JSON.stringify(direct));

  // ---- headings: a grip and a fold arrow, and the grip moves the WHOLE section --------------------------------------------------
  await startEdit();
  const ctl = await P.evaluate((s) => ({ grips: [...document.querySelectorAll(s + " [data-sec-grip]")].map((b) => b.getBoundingClientRect()).map((r) => [r.width, r.height]), folds: [...document.querySelectorAll(s + " [data-sec-fold]")].map((b) => b.getBoundingClientRect()).map((r) => [r.width, r.height]) }), S);
  check(`${tag}: each of the three headings has a grip and a fold arrow, 40px`, ctl.grips.length === 3 && ctl.folds.length === 3 && [...ctl.grips, ...ctl.folds].every(([w, h]) => w >= 39.5 && h >= 39.5), JSON.stringify(ctl));
  check(`${tag}: the grips are named in ${en ? "English" : "Bangla"}`, await P.evaluate(([s, bn]) => [...document.querySelectorAll(s + " [data-sec-grip], " + s + " [data-sec-fold]")].every((b) => bn ? /[ঀ-৿]/.test(b.getAttribute("aria-label")) : /[A-Za-z]/.test(b.getAttribute("aria-label"))), [S, !en]));
  check(`${tag}: nothing of the controls is inside the editable text`, await P.evaluate((s) => !document.querySelector(s + " [data-edit-body] [data-sec-grip], " + s + " [data-edit-body] [data-sec-fold], " + s + " [data-edit-body] button"), S));
  // fold writes nothing
  const revBefore = await nRevs();
  const draftBefore = await P.evaluate(() => localStorage.getItem("qr.journeyNoteDraft.n1"));
  const foldBtn = P.locator(q("[data-sec-fold]")).nth(1); // Beta
  await foldBtn.click();
  const foldState = await P.evaluate((s) => {
    const beta = [...document.querySelectorAll(s + " [data-edit-body] h2")].find((h) => h.textContent === "Beta");
    return { hidden: getComputedStyle(beta.nextElementSibling).display === "none", expanded: document.querySelectorAll(s + " [data-sec-fold]")[1].getAttribute("aria-expanded"), gammaShown: [...document.querySelectorAll(s + " [data-edit-body] h2")].find((h) => h.textContent === "Gamma").getBoundingClientRect().height > 0 };
  }, S);
  check(`${tag}: the fold arrow hides the section's body and keeps the next heading`, foldState.hidden && foldState.expanded === "false" && foldState.gammaShown, JSON.stringify(foldState));
  await wait(1300);
  check(`${tag}: folding writes no draft and no revision`, (await nRevs()) === revBefore && (await P.evaluate(() => localStorage.getItem("qr.journeyNoteDraft.n1"))) === draftBefore);
  await done();
  check(`${tag}: Done after a fold alone still writes nothing`, (await nRevs()) === revBefore);
  html = await saved();
  check(`${tag}: ...and no fold mark is ever saved`, !/ed-folded|class=/.test(html));
  await startEdit();
  // drag Alpha's grip down to just above Gamma
  const pos = await P.evaluate(([s, ox, oy]) => {
    const heads = [...document.querySelectorAll(s + " [data-edit-body] h2")];
    const a = heads.find((h) => h.textContent === "Alpha"), g = heads.find((h) => h.textContent === "Gamma");
    heads.find((h) => h.textContent === "Beta").scrollIntoView({ block: "center" });
    const grips = [...document.querySelectorAll(s + " [data-sec-grip]")];
    const grip = grips.find((b) => b.__h === a).getBoundingClientRect(), gr = g.getBoundingClientRect();
    return { gx: grip.x + grip.width / 2 + ox, gy: grip.y + grip.height / 2 + oy, ty: gr.top + 4 + oy, inView: grip.y >= 0 && gr.top >= 0 && gr.bottom <= innerHeight };
  }, [S, off.x, off.y]);
  await M.move(pos.gx, pos.gy); await M.down();
  await M.move(pos.gx, (pos.gy + pos.ty) / 2, { steps: 5 }); await M.move(pos.gx, pos.ty, { steps: 5 });
  const lineShown = await P.evaluate((s) => { const l = document.querySelector(s + " .ed-drop-line"); return !!l && !l.hidden; }, S);
  await M.up();
  check(`${tag}: a drop line shows while the grip is dragged`, lineShown);
  await done();
  html = await saved();
  const order = await P.evaluate((h) => {
    const d = document.createElement("div"); d.innerHTML = h;
    return [...d.children].filter((e) => !(e.matches("table") || e.matches("p") && /okpaste|styled|^$/.test(e.textContent))).map((e) => e.tagName + ":" + e.textContent.trim().slice(0, 18));
  }, html);
  const flat = order.join(" | ");
  check(`${tag}: dragging Alpha's grip moves the heading below Beta`, flat.indexOf("H2:Beta") < flat.indexOf("H2:Alpha") && flat.indexOf("H2:Alpha") < flat.indexOf("H2:Gamma"), flat);
  check(`${tag}: ...and its WHOLE section went with it, body paragraphs included`, /H2:Alpha \| [^|]*Alpha body one[^|]*\| [^|]*Alpha body two[^|]*\| H2:Gamma/.test(flat), flat);
  // the keyboard route
  await startEdit();
  await P.focus(q("[data-sec-grip]")); // first heading: Beta
  await K.press("ArrowDown");
  await done();
  const html2 = await saved();
  const h2s = (await parse(html2)).h2;
  check(`${tag}: ArrowDown on a focused grip moves its section down one`, h2s.join() === "Alpha,Beta,Gamma" || h2s[0] !== "Beta", h2s.join());

  // ---- times in Bangla ---------------------------------------------------------------------------------------------------------
  const meta = await P.evaluate((s) => document.querySelector(s + " [data-pane-meta]").textContent, S);
  await P.click(q("[data-pane-menu-btn]"));
  await P.click(q("[data-pane-menu] [data-pane-versions]"));
  await P.waitForSelector(".note-ver-when");
  const whens = await P.$$eval(".note-ver-when", (els) => els.map((e) => e.textContent));
  const meta_ok = en ? /\d/.test(meta) : !/[AaPp]\.?[Mm]\b/.test(meta) && !/[0-9]/.test(meta) && /[০-৯]/.test(meta);
  const when_ok = en ? whens.every((w) => /\d/.test(w)) : whens.every((w) => !/[AaPp]\.?[Mm]\b/.test(w) && !/[0-9]/.test(w) && /[০-৯]/.test(w));
  check(`${tag}: the Created / Last changed line is ${en ? "unchanged in English" : "in Bangla digits with no AM/PM"}`, meta_ok, meta);
  check(`${tag}: the Versions list times are ${en ? "unchanged in English" : "in Bangla digits with no AM/PM"}`, whens.length >= 2 && when_ok, whens.join(" ; "));
  await P.click(".note-versions [data-ver-close]");

  check(`${tag}: no sideways scroll at the end`, await sideways());
  check(`${tag}: no page errors`, errors.length === 0, errors.join(" | "));
  await ctx.close();
}

const RUNS = [
  ["en", 390, "page"], ["bn", 390, "page"], ["en", 820, "page"], ["bn", 820, "page"], ["en", 1440, "page"], ["bn", 1440, "page"],
  ["en", 820, "tray"], ["bn", 390, "tray"],
  ["en", 1440, "window"], ["bn", 390, "window"], ["en", 390, "window"],
];
for (const [lang, width, mode] of RUNS) {
  try { await run(lang, width, mode); } catch (err) { fail++; console.log(`  FAIL  ${lang} ${width}px ${mode}: the run crashed\n        ${String(err.message).split("\n").slice(0, 4).join(" / ")}`); }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
