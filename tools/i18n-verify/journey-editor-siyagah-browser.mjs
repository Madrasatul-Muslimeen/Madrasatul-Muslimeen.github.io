// The Owner, 5 Oct 2026: "add all functions of the notepane of Siyagah in the notepane" -- the editor round:
// H4, ¶ Normal, raise / lower a heading (▲H ▼H, Ctrl+[ / Ctrl+]), A+ / A−, Mark done, a Box, a Divider line,
// Justify, Spacing (line height and space after), Enter above the first heading, and Find while editing.
// What was SAVED is read from the stub's own revisions after Done; the read view is measured. en and bn, 1280 and 390.
// Run from the repository root with `node serve.js` running.
//   --mutate=drop-done   the cleaner strips data-done              -> the saved Mark done check fails
//   --mutate=hshift      ▲H / ▼H do nothing                        -> the heading level checks fail
//   --mutate=find-hidden Find is hidden while editing again        -> the Find checks fail
//   --mutate=enter-above Enter at the start of the first heading does nothing special -> that check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const ONLY = (process.argv.find((a) => a.startsWith("--lang=")) || "").slice(7);
function swap(src, from, to) { if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 60)}`); return src.split(from).join(to); }
async function routeMutation(ctx) {
  if (!MUTATE) return;
  const route = async (glob, file, f) => { const body = f(fs.readFileSync(file, "utf8")); await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body })); };
  // (DOMPurify keeps every data-* attribute by default, so removing data-done from NOTE_ALLOWED_ATTR changes nothing -- found by
  // running that mutation, which passed. The cleaner's own normalising step is what decides, so the mutation targets it.)
  if (MUTATE === "drop-done") await route("**/js/note-sanitize.js", "app/js/note-sanitize.js", (s) => swap(s, 'for (const el of tpl.content.querySelectorAll("[data-done]")) el.setAttribute("data-done", "1");', 'for (const el of tpl.content.querySelectorAll("[data-done]")) el.removeAttribute("data-done");'));
  else if (MUTATE === "hshift") await route("**/js/note-window.js", "app/js/note-window.js", (s) => swap(s, 'document.execCommand("formatBlock", false, n > 4 ? "p" : `h${n}`);', ""));
  else if (MUTATE === "find-hidden") await route("**/js/note-window.js", "app/js/note-window.js", (s) => swap(s, "findBtn.hidden = false;", "findBtn.hidden = !!v.ed;"));
  else if (MUTATE === "enter-above") await route("**/js/note-window.js", "app/js/note-window.js", (s) => swap(s, "    if (ev.key !== \"Enter\" || ev.shiftKey) return;", "    return;"));
  else throw new Error(`unknown mutation ${MUTATE}`);
}

const BODY = "<p>Plain alpha text</p><h2>Alpha</h2><p>Alpha body one.</p><p>Alpha body two.</p><h2>Beta</h2><p>Beta body text.</p><h2>Gamma</h2><p>Gamma body.</p>";
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d); }, toMillis: function () { return new Date(d).getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteLinks = [];
  DATA.noteFolders.push(Object.assign({ _id: "t1__fA", folderId: "fA", name: "Alpha", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts("2024-09-01T10:00:00Z") }, own));
  DATA.notes.push(Object.assign({ _id: "t1__n1", noteId: "n1", title: "Editor Note", bodyHtml: ${JSON.stringify(BODY)}, currentRevisionId: "r1", status: "active", createdAt: ts("2024-08-01T15:09:00Z"), updatedAt: ts("2024-09-03T16:45:00Z") }, own));
  DATA.noteRevisions.push(Object.assign({ _id: "t1__r1", revisionId: "r1", noteId: "n1", previousRevisionId: null, title: "Editor Note", bodyHtml: ${JSON.stringify(BODY)}, revisionReason: "content-update", actorUid: "test-uid", createdAt: new Date("2024-09-03T16:45:00Z") }, own));
  DATA.notePlacements.push(Object.assign({ _id: "t1__p1", placementId: "p1", noteId: "n1", folderId: "fA", order: 0, status: "active" }, own));
})();`;
const NEW_CMDS = ["bigger", "smaller", "done", "h4", "para", "hup", "hdown", "justify", "spacing", "divider", "box"];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const lang of ["en", "bn"].filter((l) => !ONLY || l === ONLY)) for (const width of [1280, 390]) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await routeMutation(ctx);
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
  const { page: P, errors } = await openPage(ctx, "/app/journey-map.html#folders");
  await P.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 1 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
  await P.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
  await P.waitForSelector("#folderNotes [data-note-id='n1'] [data-note-open]", { state: "visible" });
  await P.click("#folderNotes [data-note-id='n1'] [data-note-open]");
  await P.waitForSelector("#notePane [data-pane-title]", { state: "visible" });
  const S = "#notePane", q = (x) => `${S} ${x}`;
  const vis = (sel) => P.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
  const toggleEdit = async () => {
    if (await vis(q("[data-pane-bar] > [data-pane-edit-toggle]"))) await P.click(q("[data-pane-bar] > [data-pane-edit-toggle]"));
    else { await P.click(q("[data-pane-menu-btn]")); await P.click(q("[data-pane-menu] [data-pane-edit-toggle]")); }
  };
  await toggleEdit();
  await P.waitForSelector(q("[data-edit-body]"), { state: "visible" });
  await P.waitForTimeout(150);
  const tool = async (cmd) => { await P.locator(q(`[data-edit-toolbar] [data-cmd="${cmd}"]`)).scrollIntoViewIfNeeded(); await P.click(q(`[data-edit-toolbar] [data-cmd="${cmd}"]`)); await P.waitForTimeout(60); };
  const caretIn = (text, atStart = false) => P.evaluate(([s, text, atStart]) => {
    const b = document.querySelector(s + " [data-edit-body]"); b.focus();
    const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const i = n.data.indexOf(text); if (i >= 0) { const r = document.createRange(); r.setStart(n, atStart ? i : i + 1); r.collapse(true); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); return true; } }
    return false;
  }, [S, text, atStart]);
  const selectText = (text) => P.evaluate(([s, text]) => {
    const b = document.querySelector(s + " [data-edit-body]"); b.focus();
    const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const i = n.data.indexOf(text); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + text.length); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); return true; } }
    return false;
  }, [S, text]);
  const editorHtml = () => P.evaluate((s) => document.querySelector(s + " [data-edit-body]").innerHTML, S);
  const tagOf = (text) => P.evaluate(([s, text]) => { const b = document.querySelector(s + " [data-edit-body]"); return [...b.children].find((c) => c.textContent.includes(text))?.tagName ?? null; }, [S, text]);

  // the toolbar
  const tb = await P.evaluate((s) => { const t = document.querySelector(s + " [data-edit-toolbar]"); const bs = [...t.querySelectorAll("[data-cmd]")]; const r = t.getBoundingClientRect(); return { cmds: bs.map((b) => b.dataset.cmd), names: bs.map((b) => b.getAttribute("aria-label")), small: bs.filter((b) => { const x = b.getBoundingClientRect(); return x.width < 39.5 || x.height < 39.5; }).length, h: r.height }; }, S);
  check(`${tag}: the toolbar has every new tool`, NEW_CMDS.every((c) => tb.cmds.includes(c)), NEW_CMDS.filter((c) => !tb.cmds.includes(c)).join());
  check(`${tag}: every tool is 40px and the toolbar stays one row`, tb.small === 0 && tb.h <= 48, JSON.stringify({ small: tb.small, h: tb.h }));
  if (lang === "bn") check(`${tag}: the new tools are named in Bangla`, NEW_CMDS.every((c) => /[ঀ-৿]/.test(tb.names[tb.cmds.indexOf(c)] || "")), JSON.stringify(NEW_CMDS.map((c) => tb.names[tb.cmds.indexOf(c)])));

  // headings
  await caretIn("Alpha body one."); await tool("h4");
  check(`${tag}: H4 makes a level-4 heading`, (await tagOf("Alpha body one.")) === "H4");
  await caretIn("Alpha body one."); await tool("para");
  check(`${tag}: ¶ makes it normal text again`, (await tagOf("Alpha body one.")) === "P");
  await caretIn("Beta", true); await tool("hup");
  check(`${tag}: ▲H raises H2 to H1`, (await tagOf("Beta")) === "H1", await tagOf("Beta"));
  await caretIn("Beta", true); await tool("hdown"); await caretIn("Beta", true); await tool("hdown");
  check(`${tag}: ▼H lowers it again, step by step (H1 -> H2 -> H3)`, (await tagOf("Beta")) === "H3", await tagOf("Beta"));
  await caretIn("Gamma", true); await P.keyboard.press("Control+]");
  check(`${tag}: Ctrl+] lowers a heading too`, (await tagOf("Gamma")) === "H3", await tagOf("Gamma"));
  await caretIn("Gamma", true); await P.keyboard.press("Control+[");
  check(`${tag}: Ctrl+[ raises it`, (await tagOf("Gamma")) === "H2", await tagOf("Gamma"));
  // marks and inserts
  await selectText("Beta body"); await tool("bigger");
  check(`${tag}: A+ makes the selected text bigger (1.15em)`, /font-size: 1\.15em[^>]*>Beta body/.test(await editorHtml()), (await editorHtml()).slice(0, 400));
  await selectText("Beta body"); await tool("bigger");
  check(`${tag}: A+ again steps up to 1.3em`, /font-size: 1\.3em[^>]*>Beta body/.test(await editorHtml()));
  await caretIn("Gamma body."); await tool("done");
  await caretIn("Alpha body two."); await tool("box");
  await caretIn("Alpha body one."); await tool("justify");
  await caretIn("Gamma body.", true); await tool("divider");
  await caretIn("Plain alpha text");
  await tool("spacing");
  await P.click(q('[data-spacing-line="1.5"]')); await P.click(q('[data-spacing-after="1.5em"]'));
  await P.click(q("[data-panel-close]"));
  // Find while editing
  const findShown = await vis(q("[data-pane-bar] [data-pane-find-toggle]")) || await P.evaluate((s) => !document.querySelector(s + " [data-pane-find-toggle]").hidden, S);
  check(`${tag}: 🔍 Find is offered while editing`, findShown);
  if (findShown) {
    if (await vis(q("[data-pane-bar] > [data-pane-find-toggle]"))) await P.click(q("[data-pane-bar] > [data-pane-find-toggle]"));
    else { await P.click(q("[data-pane-menu-btn]")); await P.click(q("[data-pane-menu] [data-pane-find-toggle]")).catch(() => P.evaluate((s) => document.querySelector(s + " [data-pane-find-toggle]").click(), S)); }
    await P.fill(q("[data-find-input]"), "body").catch(() => {});
    await P.waitForTimeout(200);
    const n = await P.evaluate((s) => document.querySelectorAll(s + " [data-edit-body] mark.note-find-hit").length, S);
    check(`${tag}: Find marks the matches in the text being edited`, n >= 3, String(n));
    await P.click(q("[data-find-close]")).catch(() => {});
  }
  // Enter above the first heading
  await caretIn("Plain alpha text"); await tool("h3");
  await caretIn("Plain alpha text", true); await P.keyboard.press("Enter"); await P.waitForTimeout(80);
  const top = await P.evaluate((s) => { const b = document.querySelector(s + " [data-edit-body]"); return [b.children[0]?.tagName, b.children[0]?.textContent, b.children[1]?.tagName, b.children[1]?.textContent]; }, S);
  check(`${tag}: Enter at the start of the first heading adds an empty line above it`, top[0] === "P" && top[1] === "" && top[2] === "H3" && top[3] === "Plain alpha text", JSON.stringify(top));
  // Done -> what was saved
  await toggleEdit();
  await P.waitForFunction((s) => !document.querySelector(s + " [data-edit-body]"), S, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(400);
  const saved = await P.evaluate(() => { const r = window.__DATA.noteRevisions.filter((x) => x.noteId === "n1"); return r[r.length - 1].bodyHtml; });
  check(`${tag}: saved: H3 Beta, H2 Gamma`, /<h3>Beta<\/h3>/.test(saved) && /<h2>Gamma<\/h2>/.test(saved), saved);
  check(`${tag}: saved: the bigger text`, /<span style="font-size: 1\.3em;?">Beta body<\/span>/.test(saved), saved);
  check(`${tag}: saved: Mark done`, /<p data-done="1">Gamma body\.<\/p>/.test(saved), saved);
  check(`${tag}: saved: the Box`, /<p data-box="1">Alpha body two\.<\/p>/.test(saved), saved);
  check(`${tag}: saved: Justify`, /text-align: justify[^>]*>Alpha body one\./.test(saved), saved);
  check(`${tag}: saved: the Divider line`, /<hr>/.test(saved), saved);
  check(`${tag}: saved: line spacing and space after`, /line-height: 1\.5/.test(saved) && /margin-bottom: 1\.5em/.test(saved), saved);
  check(`${tag}: saved: no Find marks`, !/<mark/i.test(saved), saved);
  // the read view shows them
  const rv = await P.evaluate((s) => { const b = document.querySelector(s + " [data-pane-body]"); const d = b.querySelector("[data-done]"), x = b.querySelector("[data-box]"); return { done: d ? getComputedStyle(d).textDecorationLine : null, box: x ? getComputedStyle(x).borderTopStyle : null, hr: !!b.querySelector("hr"), h3: !!b.querySelector("h3") }; }, S);
  check(`${tag}: read view: done is struck through, the box has a border, the divider shows`, rv.done === "line-through" && rv.box === "solid" && rv.hr && rv.h3, JSON.stringify(rv));
  check(`${tag}: no sideways scroll`, await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
