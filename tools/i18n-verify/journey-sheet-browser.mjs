// Note-pane Part C2 (the Owner, 6 Oct 2026, decision 72: "44. yes"; issue #612).
// 44 A SPREADSHEET INSIDE A NOTE -- formulas, number formats, merge, filter, sort, fill, totals, rows and columns,
// stored INSIDE the Note's own bodyHtml (no new field, no Rules change). Driven with REAL mouse and keyboard in the
// inline pane AND a pop-up window, at 390 / 820 / 1440 px, English and Bangla. The stub's write log is the proof of
// what was saved.
//
// MUTATION SEAM: MUTATE=a..e (or --mutate=a..e) serves one deliberately broken copy of a file through ctx.route(),
// so a check can be shown to FAIL without editing the file:
//   a: the sanitiser trusts the static table / what is inside the sheet  (note-sanitize.js)
//   b: the live grid is saved into the body                              (note-sanitize.js)
//   c: the grid's keys are not stopped at the sheet                      (note-sheet-ui.js)
//   d: a read-only / finalised sheet accepts edits                       (note-sheet-ui.js)
//   e: a formula fill is not relative                                    (note-sheet-engine.js)
// Run from the repository root with `node serve.js` running.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
import { newSheetState, sheetStaticHtml, serializeSheetState } from "../../app/js/note-sheet-engine.js";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = process.env.MUTATE || (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const ONLY = process.env.ONLY || (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);

const READY_OPEN = `
export const SIYAGAH_FLAGS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const SIYAGAH_FLAGS_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-04", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isSiyagahFlagsReady() { return true; }
export function siyagahFlagsUnavailableReason() { return null; }
`;
async function routeText(ctx, glob, file, from, to, all = false) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 60)}`);
  src = all ? src.split(from).join(to) : src.replace(from, to);
  await ctx.route(glob, (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src }));
}
async function routeMutation(ctx) {
  if (!MUTATE) return;
  if (MUTATE === "a") await routeText(ctx, "**/js/note-sanitize.js", "app/js/note-sanitize.js", "el.innerHTML = sheetStaticHtml(state);", "");
  else if (MUTATE === "b") await routeText(ctx, "**/js/note-sanitize.js", "app/js/note-sanitize.js", "el.innerHTML = sheetStaticHtml(state);", 'el.insertAdjacentHTML("beforeend", sheetStaticHtml(state));');
  else if (MUTATE === "c") await routeText(ctx, "**/js/note-sheet-ui.js", "app/js/note-sheet-ui.js", "  live.addEventListener(\"keydown\", (ev) => {\n    ev.stopPropagation();", "  live.addEventListener(\"keydown\", (ev) => {");
  else if (MUTATE === "d") await routeText(ctx, "**/js/note-sheet-ui.js", "app/js/note-sheet-ui.js", "const canEdit = () => (editable ? true : refuse());", "const canEdit = () => true;");
  else if (MUTATE === "e") await routeText(ctx, "**/js/note-sheet-engine.js", "app/js/note-sheet-engine.js", "const mv = (p) => ({ ...p, c: p.abs_c ? p.c : p.c + dc, r: p.abs_r ? p.r : p.r + dr });", "const mv = (p) => ({ ...p });");
  else throw new Error(`unknown mutation ${MUTATE}`);
}

// the finalised Note holds a real sheet: a=text, b=text / 1, =A2+1 (-> 2)
const LOCKED = (() => { const s = { ...newSheetState(2, 2), td: 46000, d: [["a", "b"], ["1", "=A2+1"]] }; return `<h2>Locked sheet</h2><div class="mm-sheet" contenteditable="false" data-sheet="${serializeSheetState(s).replace(/"/g, "&quot;")}">${sheetStaticHtml(s)}</div><p>after</p>`; })();
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteLinks = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, body, day, extra) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own, extra || {})); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  F("fSys", "Personal Journey Map", null, 0);
  F("fA", "Alpha", null, 0);
  N("n1", "Note One", "<p>First paragraph alpha.</p><p>Second paragraph gamma.</p>", 1);
  N("n2", "Note Two", ${JSON.stringify(LOCKED)}, 2, { finalised: true });
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1);
})();`;

const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const toAscii = (s) => String(s).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
const bnDigits = (n) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
async function resetWrites(page) { await page.evaluate(() => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); }); }
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).map((w) => ({ col: w.col, data: w.data })));
async function lastBody(page, count = 1) {
  await page.waitForFunction((c) => (window.__stubWriteData || []).filter((w) => w.data && typeof w.data.bodyHtml === "string").length >= c, count, { timeout: 8000 }).catch(() => null);
  const b = (await writes(page)).filter((w) => typeof w.data?.bodyHtml === "string").map((w) => w.data.bodyHtml);
  return b[b.length - 1] ?? "";
}
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

async function waitTree(page) {
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 2 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
}
async function openLeaf(page, id) {
  const showing = await page.evaluate(() => getComputedStyle(document.getElementById("folderNotes")).display !== "none" && !!document.querySelector("#folderNotes [data-note-leaf]"));
  if (!showing) {
    await page.evaluate(() => { const b = document.querySelector("#notePane:not([hidden]) [data-pane-back]"); if (b) b.click(); });
    if (await page.isVisible("#folderNotes [data-list-back]")) await page.click("#folderNotes [data-list-back]");
    await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
    await page.waitForSelector("#folderNotes [data-note-leaf]", { state: "visible" });
  }
  await page.click(`#folderNotes [data-note-leaf][data-note-id="${id}"] [data-note-open]`);
  await page.waitForSelector("#notePane:not([hidden]) [data-pane-title]");
}
async function popOut(page) {
  await page.click("#notePane [data-pane-menu-btn]");
  await page.waitForSelector("[data-pane-menu] [data-pane-popout]", { state: "visible" });
  await page.click("[data-pane-menu] [data-pane-popout]");
  await page.waitForSelector(".note-win [data-pane-body]");
}
async function startEdit(page, S) {
  await page.evaluate((s) => document.querySelector(`${s} [data-pane-edit-toggle]`).click(), S);
  await page.waitForSelector(`${S} [data-edit-body]`);
}
async function finishEdit(page, S) {
  await page.evaluate((s) => document.querySelector(`${s} [data-pane-edit-toggle]`).click(), S);
  await page.waitForSelector(`${S} [data-edit-body]`, { state: "detached" });
}
async function pressTool(page, S, cmd) {
  if (await page.evaluate(([s, c]) => getComputedStyle(document.querySelector(`${s} [data-cmd="${c}"]`)).display === "none", [S, cmd])) await page.click(`${S} [data-tb-tab="3"]`);
  await page.click(`${S} [data-cmd="${cmd}"]`);
}
const SH = (S) => `${S} [data-edit-body] .mm-sheet`;
const cell = (S, r, c) => `${SH(S)} td[data-r="${r}"][data-c="${c}"]`;
const cellText = (page, S, r, c) => page.evaluate((q) => document.querySelector(q)?.textContent ?? null, cell(S, r, c));
const readState = (page, S) => page.evaluate((q) => JSON.parse(document.querySelector(q).getAttribute("data-sheet")), SH(S));
const act = (page, S, name) => page.click(`${SH(S)} [data-sheet-act="${name}"]`);
async function typeCell(page, S, r, c, text) {
  await page.click(cell(S, r, c));
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
}
const msg = (page, S) => page.evaluate((q) => { const m = document.querySelector(`${q} [data-sheet-msg]`); return m && !m.hidden ? m.textContent : ""; }, SH(S));
const activeCell = (page, S) => page.evaluate((q) => { const a = document.querySelector(`${q} td.active`); return a ? [Number(a.dataset.r), Number(a.dataset.c)] : null; }, SH(S));
const selCount = (page, S) => page.evaluate((q) => document.querySelectorAll(`${q} td.sel`).length, SH(S));
/** every mm-sheet in a saved body: its attribute names, clean state, the snapshot's cell texts and its direct children */
const sheetsIn = (page, html) => page.evaluate((h) => {
  const d = document.createElement("template"); d.innerHTML = h;
  return [...d.content.querySelectorAll("div.mm-sheet")].map((x) => ({
    attrs: [...x.attributes].map((a) => a.name).sort().join(","), cls: x.className, state: (() => { try { return JSON.parse(x.getAttribute("data-sheet")); } catch { return null; } })(),
    tds: [...x.querySelectorAll(":scope > table.mm-sheet-static td, :scope > table.mm-sheet-static th")].map((c) => c.textContent), spans: [...x.querySelectorAll(":scope > table.mm-sheet-static [colspan],:scope > table.mm-sheet-static [rowspan]")].map((c) => `${c.getAttribute("rowspan") || 1}x${c.getAttribute("colspan") || 1}`),
    kids: [...x.children].map((k) => k.tagName), html: x.outerHTML,
  }));
}, html);
async function confirmDialog(page, yes) {
  await page.waitForSelector('[data-note-dialog="sheet-ask"]', { state: "visible" });
  if (yes) await page.click('[data-note-dialog="sheet-ask"] [data-ask-ok]'); else await page.click('[data-note-dialog="sheet-ask"] [data-dlg-close]');
  await page.waitForSelector('[data-note-dialog="sheet-ask"]', { state: "detached" });
}
const smallTargets = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 39.5 || r.width < 39.5) && getComputedStyle(e).display !== "none"; }).map((e) => `${e.className}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`), sel);

const browser = await chromium.launch();

for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1440]) {
    for (const surface of ["pane", "window"]) {
      const tag = `${surface} ${lang} ${width}px`;
      if (ONLY && !tag.includes(ONLY)) continue; // a quick local run: --only="pane en 1440"
      const S = surface === "pane" ? "#notePane" : ".note-win";
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
      await ctx.route("**/js/siyagah-flags-readiness.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_OPEN }));
      await routeMutation(ctx);
      await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); localStorage.setItem("mmsa-journey-note-window", JSON.stringify({ x: 40, y: 40, w: 900, h: 700 })); } catch {} });
      const { page } = await openPage(ctx, "/app/journey-map.html#folders");
      await waitTree(page);
      await openLeaf(page, "n1");
      if (surface === "window") await popOut(page);
      check(`${tag}: POSITIVE CONTROL -- the Note is open in the ${surface}`, await page.evaluate((s) => !!document.querySelector(`${s} [data-pane-body]`), S));

      // ---------------- 1. insert ----------------
      await startEdit(page, S);
      const toolbarBtn = `${S} [data-cmd="sheet"]`;
      check(`${tag}: the toolbar has ONE spreadsheet button, a 40px target, named in ${lang}`, (await page.$$(toolbarBtn)).length === 1 && (await smallTargets(page, toolbarBtn)).length === 0
        && (await page.getAttribute(toolbarBtn, "aria-label")).length > 3 && (lang === "bn" ? hasBn(await page.getAttribute(toolbarBtn, "aria-label")) : /spreadsheet/i.test(await page.getAttribute(toolbarBtn, "aria-label"))));
      await resetWrites(page);
      await pressTool(page, S, "sheet");
      await page.waitForSelector(`${SH(S)} .sheet-live td.sheet-cell`);
      check(`${tag}: it starts as a 5 x 4 grid`, await page.evaluate((q) => document.querySelectorAll(`${q} td.sheet-cell`).length === 20 && document.querySelectorAll(`${q} .sheet-grid tbody tr`).length === 5, SH(S)));
      const hint = await msg(page, S);
      check(`${tag}: the "Insert a spreadsheet" hint is shown, in ${lang}`, hint.length > 10 && (lang === "bn" ? hasBn(hint) : /Insert a spreadsheet/.test(hint)), hint);
      check(`${tag}: a paragraph follows the sheet, so the Note can be typed on`, await page.evaluate((q) => { const s = document.querySelector(q); return s.nextElementSibling?.tagName === "P"; }, SH(S)));
      check(`${tag}: every toolbar control in the sheet is at least 40px`, (await smallTargets(page, `${SH(S)} .sheet-bar button, ${SH(S)} .sheet-bar select, ${SH(S)} .sheet-bar input, ${SH(S)} td.sheet-cell, ${SH(S)} th.sheet-ch`)).length === 0, JSON.stringify(await smallTargets(page, `${SH(S)} .sheet-bar button, ${SH(S)} .sheet-bar select, ${SH(S)} .sheet-bar input, ${SH(S)} td.sheet-cell, ${SH(S)} th.sheet-ch`)));
      check(`${tag}: the page does not scroll sideways with the sheet in it`, await noSideways(page));
      check(`${tag}: the grid scrolls INSIDE its own box (never wider than the Note)`, await page.evaluate((q) => { const sc = document.querySelector(`${q} .sheet-scroll`), r = sc.getBoundingClientRect(), p = document.querySelector(q).closest("[data-edit-body]").getBoundingClientRect(); return r.right <= p.right + 1 && r.left >= p.left - 1; }, SH(S)));

      // ---------------- 2. type, formulas ----------------
      const DATA = [["Item", "Qty", "Price", "Total"], ["Pen", "2", "1.5", "=B2*C2"], ["Ink", "3", "4", "=B3*C3"], ["Pad", "5", "2.25", "=B4*C4"]];
      for (let r = 0; r < DATA.length; r++) for (let c = 0; c < 4; c++) await typeCell(page, S, r, c, DATA[r][c]);
      const shown = (s) => (lang === "bn" ? bnDigits(s) : s);
      check(`${tag}: typing in cells with the real keyboard stores the text`, JSON.stringify((await readState(page, S)).d.slice(0, 4)) === JSON.stringify(DATA), JSON.stringify((await readState(page, S)).d));
      check(`${tag}: formulas show their value (3, 12, 11.25) with ${lang === "bn" ? "Bangla digits" : "plain digits"}`, [await cellText(page, S, 1, 3), await cellText(page, S, 2, 3), await cellText(page, S, 3, 3)].join("|") === ["3", "12", "11.25"].map(shown).join("|"), [await cellText(page, S, 1, 3), await cellText(page, S, 2, 3), await cellText(page, S, 3, 3)].join("|"));
      check(`${tag}: the cell bar shows the raw formula of the active cell`, await (async () => { await page.click(cell(S, 1, 3)); return (await page.textContent(`${SH(S)} [data-sheet-fx]`)).includes("=B2*C2"); })());
      // errors in words
      await typeCell(page, S, 4, 0, "=1/0"); await typeCell(page, S, 4, 1, "=B5"); await typeCell(page, S, 4, 2, "=FOO(1)"); await typeCell(page, S, 4, 3, "=Z99");
      const errs = await page.evaluate((q) => [...document.querySelectorAll(`${q} tbody tr:nth-child(5) td.sheet-cell`)].map((td) => [td.textContent, td.title]), SH(S));
      check(`${tag}: the four errors show their code`, errs.map((e) => e[0]).join(" ") === "#DIV/0! #CIRC! #NAME? #REF!", JSON.stringify(errs));
      check(`${tag}: ...and a tooltip in words (${lang}): ${errs[0]?.[1]}`, errs.every((e) => e[1].length > 8 && (lang === "bn" ? hasBn(e[1]) : /[a-z]{4}/.test(e[1]))));
      check(`${tag}: a cell that refers to itself is #CIRC!, and the page stayed alive`, errs[1]?.[0] === "#CIRC!" && await page.evaluate(() => document.readyState === "complete"));
      // clear the error row again with the keyboard: select A5:D5 and Delete
      await page.click(cell(S, 4, 0)); await page.click(cell(S, 4, 3), { modifiers: ["Shift"] });
      check(`${tag}: Shift+click selects a block (4 cells)`, (await selCount(page, S)) === 4);
      await page.keyboard.press("Delete");
      check(`${tag}: Delete clears the selected block`, (await readState(page, S)).d[4].every((x) => x === ""));
      // Bangla digits typed on a Bangla keyboard are read as numbers
      await page.click(cell(S, 4, 0)); await page.keyboard.press("Enter"); await page.keyboard.insertText("৭"); await page.keyboard.press("Enter"); // a Bangla keyboard sends the character itself
      await typeCell(page, S, 4, 1, "=A5+1");
      check(`${tag}: Bangla digits typed in a cell are stored as numbers (7, and 7+1 = 8)`, (await readState(page, S)).d[4][0] === "7" && toAscii(await cellText(page, S, 4, 1)) === "8");
      await page.click(cell(S, 4, 0)); await page.click(cell(S, 4, 1), { modifiers: ["Shift"] }); await page.keyboard.press("Delete");

      // ---------------- 3. save: the body holds the snapshot and CLEAN state, never the live grid ----------------
      await finishEdit(page, S);
      let body = await lastBody(page);
      let sheets = await sheetsIn(page, body);
      check(`${tag}: the SAVED body holds exactly one div.mm-sheet with contenteditable="false" and data-sheet`, sheets.length === 1 && sheets[0].cls === "mm-sheet" && sheets[0].attrs === "class,contenteditable,data-sheet", JSON.stringify(sheets.map((x) => x.attrs)));
      check(`${tag}: ...whose only child is the static snapshot table`, sheets[0]?.kids.join() === "TABLE");
      check(`${tag}: ...with the values as last computed (3, 12, 11.25) and no formula text`, ["3", "12", "11.25"].every((x) => sheets[0].tds.includes(x)) && !sheets[0].tds.some((x) => x.startsWith("=")), JSON.stringify(sheets[0]?.tds));
      check(`${tag}: the live grid / toolbar / inputs are NOT in the saved body`, !/data-sheet-(live|scroll|msg|fx|act)|sheet-grid|sheet-bar|sheet-input|<input|<button|<select/.test(body), body.slice(0, 400));
      check(`${tag}: the saved state is clean (v1, 5 x 4, header frozen, formulas kept raw)`, sheets[0].state.v === 1 && sheets[0].state.rows === 5 && sheets[0].state.cols === 4 && sheets[0].state.hdr === true && sheets[0].state.d[1][3] === "=B2*C2");
      check(`${tag}: the Note's own paragraphs are untouched by all that typing`, body.includes("<p>First paragraph alpha.</p>") && body.includes("<p>Second paragraph gamma.</p>"));

      // ---------------- 4. reopen: the snapshot shows the same values ----------------
      const live = await page.evaluate((s) => [...document.querySelectorAll(`${s} .mm-sheet td.sheet-cell`)].map((td) => td.textContent), S);
      check(`${tag}: reopened in the read view the grid is there, read-only (no toolbar, no input), same values`, live.length === 20 && toAscii(live[7]) === "3" && toAscii(live[11]) === "12" && (await page.$$(`${S} .mm-sheet .sheet-bar`)).length === 0, live.join("|"));
      check(`${tag}: the stored snapshot is still in the page (hidden), with the same values`, await page.evaluate((s) => { const t = document.querySelector(`${s} .mm-sheet > table.mm-sheet-static`); return !!t && getComputedStyle(t).display === "none" && t.textContent.includes("11.25"); }, S));
      // read view refuses edits in words, writes nothing
      await resetWrites(page);
      await page.dblclick(`${S} .mm-sheet td[data-r="1"][data-c="0"]`);
      const roMsg = await page.evaluate((s) => { const m = document.querySelector(`${s} .mm-sheet [data-sheet-msg]`); return m && !m.hidden ? m.textContent : ""; }, S);
      check(`${tag}: in the read view, trying to edit a cell says so in words (${lang}) and opens no input`, roMsg.length > 10 && (lang === "bn" ? hasBn(roMsg) : /editing/i.test(roMsg)) && (await page.$$(`${S} .mm-sheet input.sheet-input`)).length === 0, roMsg);
      check(`${tag}: ...and wrote nothing`, (await writes(page)).length === 0);

      // ---------------- 5. format, rows/columns, merge, filter, sort, fill, totals ----------------
      await startEdit(page, S);
      // number formats
      await page.click(cell(S, 1, 3)); await page.click(cell(S, 3, 3), { modifiers: ["Shift"] });
      await page.selectOption(`${SH(S)} [data-sheet-format]`, "currency");
      await page.fill(`${SH(S)} [data-sheet-sym]`, "৳"); await page.press(`${SH(S)} [data-sheet-sym]`, "Enter");
      check(`${tag}: Currency = the reader's own symbol + two decimals (৳3.00, ৳12.00, ৳11.25)`, [await cellText(page, S, 1, 3), await cellText(page, S, 2, 3), await cellText(page, S, 3, 3)].map(toAscii).join("|") === "৳3.00|৳12.00|৳11.25");
      await page.click(cell(S, 1, 3)); await page.click(cell(S, 3, 3), { modifiers: ["Shift"] });
      await page.selectOption(`${SH(S)} [data-sheet-format]`, "percent");
      check(`${tag}: Percent multiplies by 100 (300.00%)`, toAscii(await cellText(page, S, 1, 3)) === "300.00%");
      await page.selectOption(`${SH(S)} [data-sheet-format]`, "number");
      check(`${tag}: Number is two decimals (3.00)`, toAscii(await cellText(page, S, 1, 3)) === "3.00");
      await page.selectOption(`${SH(S)} [data-sheet-format]`, "general");
      await typeCell(page, S, 4, 0, "=DATE(2000,1,1)");
      await page.click(cell(S, 4, 0)); await page.selectOption(`${SH(S)} [data-sheet-format]`, "date");
      check(`${tag}: Date is dd/mm/yyyy (01/01/2000)`, toAscii(await cellText(page, S, 4, 0)) === "01/01/2000");
      await page.click(cell(S, 4, 0)); await page.keyboard.press("Delete");
      await page.selectOption(`${SH(S)} [data-sheet-format]`, "general");
      // add a row and a column; remove asks first
      const dims = async () => { const s = await readState(page, S); return `${s.rows}x${s.cols}`; };
      await page.click(cell(S, 4, 0)); await act(page, S, "addRow");
      check(`${tag}: ＋Row adds a row (6 x 4)`, (await dims()) === "6x4");
      await page.click(cell(S, 5, 0)); await act(page, S, "delRow");
      await confirmDialog(page, false);
      check(`${tag}: − Row asks first, and Cancel removes nothing`, (await dims()) === "6x4");
      await act(page, S, "delRow"); await confirmDialog(page, true);
      check(`${tag}: − Row removes it after OK (5 x 4)`, (await dims()) === "5x4");
      await page.click(cell(S, 0, 3)); await act(page, S, "addCol"); await act(page, S, "addCol");
      check(`${tag}: ＋Column adds columns (5 x 6)`, (await dims()) === "5x6");
      await page.click(cell(S, 0, 5)); await act(page, S, "delCol"); await confirmDialog(page, true);
      check(`${tag}: − Column removes the selected one after OK (5 x 5)`, (await dims()) === "5x5");
      await act(page, S, "addCol");
      // column resize by dragging its edge
      await page.locator(`${SH(S)} th.sheet-ch`).first().scrollIntoViewIfNeeded();
      const grip = await page.locator(`${SH(S)} [data-sheet-resize="0"]`).boundingBox();
      const hit0 = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName}.${e.className}` : "null"; }, [grip.x + grip.width / 2, grip.y + grip.height / 2]);
      await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2); await page.mouse.down(); await page.mouse.move(grip.x + grip.width / 2 + 60, grip.y + grip.height / 2, { steps: 4 }); await page.mouse.up();
      const wState = (await readState(page, S)).w;
      const hit = hit0;
      check(`${tag}: dragging a column's edge widens it (saved width ${wState[0]} for column A)`, wState[0] >= 150 && wState[0] <= 162, `${JSON.stringify(wState)} grip=${JSON.stringify(grip)} hit=${hit}`);
      check(`${tag}: ...and the grid really drew it that wide`, await page.evaluate((q) => Math.abs(document.querySelector(`${q} col[data-sheet-col="0"]`).getBoundingClientRect().width - 156) < 8, SH(S)));
      // merge / unmerge
      await page.click(cell(S, 0, 0)); await page.click(cell(S, 0, 1), { modifiers: ["Shift"] });
      await act(page, S, "merge");
      let st = await readState(page, S);
      check(`${tag}: Merge joins A1:B1 and keeps the top-left value ("Item", "Qty" is dropped)`, JSON.stringify(st.merges) === "[[0,0,1,2]]" && st.d[0][0] === "Item" && st.d[0][1] === "" && await page.evaluate((q) => document.querySelector(`${q} td[data-r="0"][data-c="0"]`).colSpan === 2, SH(S)));
      await typeCell(page, S, 0, 1 + 1, "Price"); // C1 is untouched by the merge
      await finishEdit(page, S); body = await lastBody(page); sheets = await sheetsIn(page, body);
      check(`${tag}: the saved snapshot carries the merge as colspan="2"`, sheets[0].spans.includes("1x2"), JSON.stringify(sheets[0].spans));
      await startEdit(page, S);
      await page.click(cell(S, 0, 0)); await act(page, S, "unmerge");
      check(`${tag}: Unmerge takes it apart again`, (await readState(page, S)).merges.length === 0);
      await typeCell(page, S, 0, 1, "Qty");
      // sort by Qty (column B), largest first: Pad(5) Ink(3) Pen(2); formulas travel with their row
      await page.click(cell(S, 1, 1)); await act(page, S, "sortDesc");
      check(`${tag}: Sort by a column, largest first: Pad, Ink, Pen (header stays on top)`, (await page.evaluate((q) => [0, 1, 2, 3].map((r) => document.querySelector(`${q} td[data-r="${r}"][data-c="0"]`).textContent), SH(S))).join() === "Item,Pad,Ink,Pen");
      check(`${tag}: ...and each row's formula still gives its own total (Pad 11.25)`, toAscii(await cellText(page, S, 1, 3)) === "11.25" && toAscii(await cellText(page, S, 3, 3)) === "3");
      await act(page, S, "sortAsc");
      check(`${tag}: Sort smallest first: Pen, Ink, Pad`, (await page.evaluate((q) => [1, 2, 3].map((r) => document.querySelector(`${q} td[data-r="${r}"][data-c="0"]`).textContent), SH(S))).join() === "Pen,Ink,Pad");
      // filter: untick "Ink" in column A; the filter works on computed values
      await page.click(cell(S, 1, 0)); await act(page, S, "filter");
      await page.waitForSelector(`${SH(S)} [data-sheet-filter]:not([hidden]) .sheet-filter-opt`);
      const optLabels = await page.evaluate((q) => [...document.querySelectorAll(`${q} .sheet-filter-opt span`)].map((x) => x.textContent), SH(S));
      check(`${tag}: the Filter lists the column's distinct values`, ["Pen", "Ink", "Pad"].every((x) => optLabels.includes(x)), optLabels.join());
      await page.evaluate((q) => { const i = [...document.querySelectorAll(`${q} .sheet-filter-opt`)].find((l) => l.textContent.trim() === "Ink").querySelector("input"); i.click(); }, SH(S));
      check(`${tag}: unticking "Ink" hides that row`, await page.evaluate((q) => ![...document.querySelectorAll(`${q} td[data-c="0"]`)].some((td) => td.textContent === "Ink") && document.querySelectorAll(`${q} td[data-c="0"]`).length === 4, SH(S)));
      check(`${tag}: ...the filter is saved on the column, and the header marks it`, JSON.stringify((await readState(page, S)).filt) === '{"0":["Ink"]}' && (await page.$$(`${SH(S)} th.sheet-filtered`)).length === 1);
      // the filter hides by computed value: filter column D (totals) by "12" -- raw text is "=B3*C3"
      await page.click(cell(S, 1, 3)); await page.evaluate((q) => document.querySelector(`${q} [data-sheet-filter-all]`)?.click(), SH(S));
      await page.click(cell(S, 1, 3));
      await page.waitForFunction((q) => document.querySelector(`${q} [data-sheet-filter]:not([hidden]) .sheet-filter-opt`), SH(S));
      const optD = await page.evaluate((q) => [...document.querySelectorAll(`${q} .sheet-filter-opt span`)].map((x) => x.textContent), SH(S));
      check(`${tag}: the Filter for a formula column lists COMPUTED values (3, 12, 11.25), not "=B…" text`, optD.map(toAscii).includes("12") && !optD.some((x) => x.includes("=")), optD.join());
      await page.evaluate((q) => document.querySelector(`${q} [data-sheet-filter-close]`).click(), SH(S));
      await page.evaluate((q) => { document.querySelector(`${q} [data-sheet-act="filter"]`); }, SH(S));
      // clear every filter again
      await page.click(cell(S, 1, 0)); await page.evaluate((q) => { const b = document.querySelector(`${q} [data-sheet-act="filter"]`); b.click(); }, SH(S));
      await page.evaluate((q) => document.querySelector(`${q} [data-sheet-filter-all]`).click(), SH(S));
      await page.evaluate((q) => document.querySelector(`${q} [data-sheet-filter-close]`)?.click(), SH(S));
      check(`${tag}: Show all brings every row back`, (await page.evaluate((q) => document.querySelectorAll(`${q} td[data-c="0"]`).length, SH(S))) === 5 && JSON.stringify((await readState(page, S)).filt) === "{}");
      // fill: a series in E, a relative formula in F
      await typeCell(page, S, 1, 4, "1"); await typeCell(page, S, 2, 4, "3");
      await page.click(cell(S, 1, 4)); await page.click(cell(S, 3, 4), { modifiers: ["Shift"] }); await act(page, S, "fillDown");
      check(`${tag}: Fill down continues a number series (1, 3, then 5)`, (await readState(page, S)).d.slice(1, 4).map((r) => r[4]).join() === "1,3,5");
      await page.click(cell(S, 4, 4)); // a formula in a new column
      await act(page, S, "addCol");
      await typeCell(page, S, 1, 5, "=B2*10");
      await page.click(cell(S, 1, 5)); await page.click(cell(S, 3, 5), { modifiers: ["Shift"] }); await act(page, S, "fillDown");
      st = await readState(page, S);
      check(`${tag}: Fill down shifts a formula RELATIVELY (=B2*10, =B3*10, =B4*10)`, st.d.slice(1, 4).map((r) => r[5]).join() === "=B2*10,=B3*10,=B4*10", st.d.slice(1, 4).map((r) => r[5]).join());
      check(`${tag}: ...and the values follow (Pen 2 -> 20)`, toAscii(await cellText(page, S, 1, 5)) === "20" && toAscii(await cellText(page, S, 3, 5)) === "50");
      // fill with nothing to fill says so in words
      await page.click(cell(S, 1, 5)); await page.click(cell(S, 3, 5), { modifiers: ["Shift"] }); await act(page, S, "fillDown");
      check(`${tag}: Fill with nothing empty to fill says so in words`, (await msg(page, S)).length > 10);
      // fill right
      await typeCell(page, S, 4, 4, "=B2+1");
      await page.click(cell(S, 4, 4)); await page.click(cell(S, 4, 5), { modifiers: ["Shift"] }); await act(page, S, "fillRight");
      check(`${tag}: Fill right shifts a formula to the next column (=B2+1 -> =C2+1)`, (await readState(page, S)).d[4].slice(4, 6).join() === "=B2+1,=C2+1");
      await page.click(cell(S, 4, 4)); await page.click(cell(S, 4, 5), { modifiers: ["Shift"] }); await page.keyboard.press("Delete");
      // Σ totals under the Qty column: real =SUM()
      await page.click(cell(S, 1, 1)); await page.click(cell(S, 3, 1), { modifiers: ["Shift"] }); await act(page, S, "totals");
      st = await readState(page, S);
      check(`${tag}: Σ puts a real =SUM(B2:B4) under the selected cells`, st.d[4][1] === "=SUM(B2:B4)", JSON.stringify(st.d[4]));
      check(`${tag}: ...and it shows 10 (2+3+5)`, toAscii(await cellText(page, S, 4, 1)) === "10");
      // freeze the header row
      check(`${tag}: the header row is frozen by default (sticky)`, await page.evaluate((q) => getComputedStyle(document.querySelector(`${q} tr.sheet-hrow td`)).position === "sticky", SH(S)));
      await act(page, S, "freeze");
      check(`${tag}: toggling the freeze is saved (hdr false) and the header is no longer sticky`, (await readState(page, S)).hdr === false && await page.evaluate((q) => getComputedStyle(document.querySelector(`${q} .sheet-grid tbody tr:first-child td`)).position !== "sticky", SH(S)));
      await act(page, S, "freeze");

      // ---------------- 6. the keyboard stays in the sheet ----------------
      await page.click(cell(S, 1, 0));
      const outside = (s) => { const b = document.querySelector(`${s} [data-edit-body]`).cloneNode(true); b.querySelectorAll(".mm-sheet").forEach((x) => x.remove()); return b.innerHTML; };
      const before = await page.evaluate(outside, S);
      await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowRight");
      check(`${tag}: the arrow keys move the selected cell (A2 -> B4)`, JSON.stringify(await activeCell(page, S)) === "[3,1]", JSON.stringify(await activeCell(page, S)));
      await page.keyboard.press("Shift+ArrowRight"); await page.keyboard.press("Shift+ArrowUp");
      check(`${tag}: Shift+arrows extend the selection (2 x 2 = 4 cells)`, (await selCount(page, S)) === 4);
      await page.keyboard.press("Tab");
      check(`${tag}: Tab moves one cell right of the ACTIVE cell (B4 -> C4)`, JSON.stringify(await activeCell(page, S)) === "[3,2]", JSON.stringify(await activeCell(page, S)));
      await page.keyboard.press("Control+b");
      check(`${tag}: Ctrl+B in the sheet does NOT bold the Note (no <b> appears)`, !(await page.evaluate((s) => !!document.querySelector(`${s} [data-edit-body] b, ${s} [data-edit-body] strong`), S)));
      await page.keyboard.press("Escape");
      check(`${tag}: Esc in the sheet does NOT end the Note's edit (the editor is still open)`, (await page.$$(`${S} [data-edit-body]`)).length === 1);
      await page.keyboard.press("Enter");
      check(`${tag}: Enter opens the cell for editing, it does not add a line to the Note`, (await page.$$(`${SH(S)} input.sheet-input`)).length === 1);
      await page.keyboard.press("Escape");
      check(`${tag}: Esc inside the cell cancels the edit and keeps the sheet`, (await page.$$(`${SH(S)} input.sheet-input`)).length === 0 && (await page.$$(`${S} [data-edit-body]`)).length === 1);
      await page.keyboard.type("zz"); await page.keyboard.press("Escape");
      const afterKeys = await page.evaluate(outside, S);
      check(`${tag}: none of those keys changed the Note's own text outside the sheet`, before === afterKeys);
      // copy / paste a block; a tab-separated paste from another app
      await page.click(cell(S, 1, 0)); await page.click(cell(S, 1, 1), { modifiers: ["Shift"] }); await page.keyboard.press("Control+c");
      await page.click(cell(S, 4, 2)); await page.keyboard.press("Control+v");
      await page.waitForTimeout(150);
      st = await readState(page, S);
      check(`${tag}: Ctrl+C then Ctrl+V copies a block (A2:B2 -> C5:D5)`, st.d[4][2] === st.d[1][0] && st.d[4][3] === st.d[1][1], JSON.stringify(st.d[4]));
      await page.evaluate((q) => {
        const dt = new DataTransfer(); dt.setData("text/plain", "m\tn\n1\t2\n=1+1\t9");
        document.querySelector(`${q} .sheet-scroll`).dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
      }, SH(S));
      await page.click(cell(S, 4, 2)); // select where it landed
      await page.evaluate((q) => { const dt = new DataTransfer(); dt.setData("text/plain", "m\tn\n1\t2\n=1+1\t9"); document.querySelector(`${q} .sheet-scroll`).dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); }, SH(S));
      st = await readState(page, S);
      check(`${tag}: a tab-separated paste from another app fills cells (and grows the grid when it must)`, st.d[4].slice(2, 4).join() === "m,n" && st.d[5].slice(2, 4).join() === "1,2" && st.d[6].slice(2, 4).join() === "=1+1,9" && st.rows >= 7, JSON.stringify(st.d.slice(4)));
      check(`${tag}: ...a pasted formula is a formula (=1+1 shows 2)`, toAscii(await cellText(page, S, 6, 2)) === "2");
      // Ctrl+Z inside the sheet undoes the sheet, not the Note's text
      await page.keyboard.press("Control+z");
      st = await readState(page, S);
      check(`${tag}: Ctrl+Z inside the sheet undoes the last sheet change only`, st.d[4].slice(2, 4).join() !== "m,n" || st.rows < 7, JSON.stringify(st.d.slice(4)));
      check(`${tag}: ...and the Note's paragraphs are still there`, await page.evaluate((s) => document.querySelector(`${s} [data-edit-body]`).textContent.includes("First paragraph alpha.") && document.querySelector(`${s} [data-edit-body]`).textContent.includes("Second paragraph gamma."), S));

      // ---------------- 7. contrast, light and dark ----------------
      for (const scheme of ["light", "dark"]) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.click(cell(S, 1, 1)); // an active, selected cell
        const pairs = await page.evaluate((q) => {
          const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; const m = c.match(/[\d.]+/g).map(Number); if (m.length < 4 || m[3] > 0.99) return m.slice(0, 3); } return [255, 255, 255]; };
          const col = (el) => getComputedStyle(el).color.match(/[\d.]+/g).slice(0, 3).map(Number);
          const out = [];
          for (const sel of ["td.sheet-cell:not(.sel):not(.sheet-err)", "td.sheet-cell.sel", "td.sheet-cell.sheet-err", "tr.sheet-hrow td", "th.sheet-ch", "th.sheet-rh", ".sheet-fx"]) {
            const el = document.querySelector(`${q} ${sel}`); if (!el) continue;
            const target = el.querySelector(".sheet-val") || el;
            out.push([sel, col(target), bgOf(target)]);
          }
          return out;
        }, SH(S));
        const bad = pairs.filter(([, fg, bg]) => ratio(fg, bg) < 4.5).map(([s, fg, bg]) => `${s} ${ratio(fg, bg).toFixed(2)}`);
        check(`${tag}: the cells' text is at least 4.5:1 in ${scheme} (${pairs.length} kinds measured)`, pairs.length >= 5 && bad.length === 0, bad.join("; "));
      }
      await page.emulateMedia({ colorScheme: "light" });
      check(`${tag}: still no sideways page overflow with a wide, busy sheet`, await noSideways(page));

      // ---------------- 8. remove the spreadsheet (asks first) ----------------
      await resetWrites(page);
      await act(page, S, "remove");
      await confirmDialog(page, false);
      check(`${tag}: ✕ Remove asks first; Cancel keeps the sheet`, (await page.$$(SH(S))).length === 1);
      await act(page, S, "remove"); await confirmDialog(page, true);
      check(`${tag}: ...OK removes it from the Note`, (await page.$$(SH(S))).length === 0);
      await finishEdit(page, S); body = await lastBody(page);
      check(`${tag}: the saved body has no sheet left, and the Note's text is intact`, !body.includes("mm-sheet") && body.includes("First paragraph alpha."), body.slice(0, 200));

      // ---------------- 9. a finalised Note refuses, in words, and writes nothing ----------------
      if (surface === "pane") {
        await openLeaf(page, "n2");
        await page.waitForSelector(`${S} .mm-sheet td.sheet-cell`);
        check(`${tag}: the finalised Note's sheet shows its values (the stored snapshot's, 2)`, toAscii(await page.textContent(`${S} .mm-sheet td[data-r="1"][data-c="1"]`)) === "2");
        await resetWrites(page);
        await page.dblclick(`${S} .mm-sheet td[data-r="1"][data-c="0"]`);
        const lockMsg = await page.evaluate((s) => { const m = document.querySelector(`${s} .mm-sheet [data-sheet-msg]`); return m && !m.hidden ? m.textContent : ""; }, S);
        check(`${tag}: editing a cell of a 🔒 finalised Note is refused in words (${lang})`, lockMsg.length > 10 && (lang === "bn" ? hasBn(lockMsg) : /finalised/i.test(lockMsg)), lockMsg);
        await page.click(`${S} .mm-sheet td[data-r="1"][data-c="0"]`); await page.keyboard.type("x");
        check(`${tag}: ...typing does not open an input either, and nothing was written`, (await page.$$(`${S} .mm-sheet input.sheet-input`)).length === 0 && (await writes(page)).length === 0);
        check(`${tag}: ...and no toolbar offers an insert / change on a finalised Note`, (await page.$$(`${S} .mm-sheet .sheet-bar`)).length === 0 && (await page.$$(`${S} [data-edit-body]`)).length === 0);
      }
      await page.close(); await ctx.close();
    }
  }
}

// ---------------- hostile pastes, in a real browser, once ----------------
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 1440, height: 900 }, extraSeedJs: SEED });
  await ctx.route("**/js/siyagah-flags-readiness.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_OPEN }));
  await routeMutation(ctx);
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
  const { page } = await openPage(ctx, "/app/journey-map.html#folders");
  await waitTree(page);
  const tag = "hostile";
  const out = await page.evaluate(async () => {
    const { sanitizeNoteHtml } = await import("/app/js/note-sanitize.js");
    const q = (o) => JSON.stringify(o).replace(/'/g, "&#39;");
    const base = { rows: 2, cols: 2, d: [["1", "2"], ["=A1+1", "x"]] };
    const wrap = (state, inner = "", attrs = "") => `<div class="mm-sheet evil" contenteditable="true" onclick="alert(1)" ${attrs} data-sheet='${q(state)}'>${inner}</div>`;
    const res = {};
    const parse = (h) => { const t = document.createElement("template"); t.innerHTML = h; return t.content; };
    // 1. a sheet whose cells and static table are full of markup
    const h1 = sanitizeNoteHtml(wrap({ ...base, d: [["<img src=x onerror=alert(1)>", "javascript:alert(1)"], ["=1", "<svg onload=alert(2)>"]], evil: "<b>" },
      '<table class="mm-sheet-static"><tbody><tr><td><img src=x onerror=alert(3)></td><td>FORGED 999</td></tr></tbody></table><script>alert(4)</script><button onclick=alert(5)>x</button><input value=y>'));
    const f1 = parse(h1);
    res.h1 = { html: h1, imgs: f1.querySelectorAll("img").length, scripts: f1.querySelectorAll("script, button, input").length, onattrs: [...f1.querySelectorAll("*")].filter((e) => [...e.attributes].some((a) => /^on/i.test(a.name))).length, forged: h1.includes("FORGED"), sheets: f1.querySelectorAll("div.mm-sheet").length, kids: [...f1.querySelector("div.mm-sheet").children].map((k) => k.tagName).join(), attrs: [...f1.querySelector("div.mm-sheet").attributes].map((a) => a.name).sort().join(), cellText: f1.querySelector("th").textContent, idem: sanitizeNoteHtml(h1) === h1 };
    // 2. garbage state: the sheet is dropped, not trusted
    res.garbage = ["not json", "{", "[]", '{"d":5}', "null"].map((s) => sanitizeNoteHtml(`<p>keep</p><div class="mm-sheet" data-sheet='${s}'><table><tr><td>hi</td></tr></table></div>`)).map((h) => !h.includes("mm-sheet") && !h.includes("<td>hi</td>") && h.includes("keep"));
    // 3. a non-div carrying data-sheet is dropped
    res.notDiv = sanitizeNoteHtml(`<p data-sheet='${q(base)}'>x</p><span data-sheet='${q(base)}'>y</span>`).includes("data-sheet") === false;
    // 4. size bounds
    const big = sanitizeNoteHtml(wrap({ rows: 99999, cols: 99999, d: [["a"]] }));
    const bs = JSON.parse(parse(big).querySelector("div.mm-sheet").getAttribute("data-sheet"));
    res.big = [bs.rows, bs.cols, bs.d.length, bs.d[0].length];
    // 5. text length cap and unknown formats
    const long = sanitizeNoteHtml(wrap({ rows: 1, cols: 1, d: [["x".repeat(5000)]], fmt: { "0,0": "<script>" } }));
    const ls = JSON.parse(parse(long).querySelector("div.mm-sheet").getAttribute("data-sheet"));
    res.long = [ls.d[0][0].length, Object.keys(ls.fmt).length];
    // 6. class / contenteditable are stripped from everything else
    res.strip = parse(sanitizeNoteHtml('<p class="x" contenteditable="true" style="color:red">t</p><span class="y">z</span>')).querySelectorAll("[class],[contenteditable]").length;
    // 7. javascript: in a currency symbol
    const sym = JSON.parse(parse(sanitizeNoteHtml(wrap({ ...base, sym: "javascript:alert(1)" }))).querySelector("div.mm-sheet").getAttribute("data-sheet")).sym;
    res.sym = sym;
    // 7b. what the APP writes (< and > as JSON escapes) survives even a cell holding </script>
    const engine = await import("/app/js/note-sheet-engine.js");
    const typed = { ...engine.newSheetState(1, 1), d: [["</script><b>x</b>"]], hdr: false };
    const kept = sanitizeNoteHtml(`<div class="mm-sheet" data-sheet="${engine.serializeSheetState(typed).replace(/"/g, "&quot;")}"></div>`);
    res.esc = [kept.includes("mm-sheet"), parse(kept).querySelector("td")?.textContent, parse(kept).querySelectorAll("b, script").length];
    // 8. a sheet nested in a sheet's snapshot is gone
    res.nested = parse(sanitizeNoteHtml(wrap(base, wrap(base)))).querySelectorAll("div.mm-sheet").length;
    return res;
  });
  check(`${tag}: a sheet full of markup gives ONE clean div.mm-sheet with only the class, contenteditable and data-sheet attributes`, out.h1.sheets === 1 && out.h1.attrs === "class,contenteditable,data-sheet", out.h1.attrs);
  check(`${tag}: no <img>, <script>, <button>, <input> and no on* attribute comes out`, out.h1.imgs === 0 && out.h1.scripts === 0 && out.h1.onattrs === 0, out.h1.html.slice(0, 300));
  check(`${tag}: the static table is RE-DERIVED from the state (a forged "999" cell is gone; the markup in a cell is only text)`, !out.h1.forged && out.h1.kids === "TABLE" && out.h1.cellText.includes("<img"), out.h1.html.slice(0, 400));
  check(`${tag}: the sanitiser is idempotent on a sheet (a second pass changes nothing)`, out.h1.idem);
  check(`${tag}: garbage in data-sheet drops the sheet (5 of 5) and keeps the rest of the Note`, out.garbage.every(Boolean), JSON.stringify(out.garbage));
  check(`${tag}: data-sheet on anything but a div is dropped`, out.notDiv);
  check(`${tag}: a 99999 x 99999 grid is clamped to 200 x 50`, JSON.stringify(out.big) === "[200,50,200,50]", JSON.stringify(out.big));
  check(`${tag}: cell text is capped at 500 characters and an unknown format name is dropped`, out.long[0] === 500 && out.long[1] === 0, JSON.stringify(out.long));
  check(`${tag}: class and contenteditable are stripped from every ordinary element`, out.strip === 0);
  check(`${tag}: a "javascript:" currency symbol is cleaned (${JSON.stringify(out.sym)})`, !/javascript/i.test(out.sym));
  check(`${tag}: a sheet nested inside a sheet is dropped (1 sheet left)`, out.nested === 1);
  check(`${tag}: a cell holding "</script><b>x</b>" is kept as plain text -- the sheet is not lost, and nothing runs`, out.esc[0] && out.esc[1] === "</script><b>x</b>" && out.esc[2] === 0, JSON.stringify(out.esc));

  // hostile paste INTO the editor: the sheet that lands is the rebuilt one
  await openLeaf(page, "n1");
  await startEdit(page, "#notePane");
  await page.evaluate(() => {
    const body = document.querySelector("#notePane [data-edit-body]"); body.focus();
    const state = JSON.stringify({ rows: 2, cols: 2, d: [["<img src=x onerror=window.__pwned=1>", "=1+1"], ["", ""]] });
    const html = `<div class="mm-sheet" data-sheet='${state}'><table class="mm-sheet-static"><tr><td><img src=x onerror=window.__pwned=2></td></tr></table><script>window.__pwned=3</script></div>`;
    const dt = new DataTransfer(); dt.setData("text/html", html); dt.setData("text/plain", "x");
    body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await page.waitForSelector('#notePane [data-paste-choice="rich"]');
  await page.click('#notePane [data-paste-choice="rich"]');
  await page.waitForSelector("#notePane [data-edit-body] .mm-sheet .sheet-live");
  check(`${tag}: pasting a hostile sheet into the editor runs nothing and leaves one clean, live sheet`, await page.evaluate(() => !window.__pwned && document.querySelectorAll("#notePane [data-edit-body] .mm-sheet").length === 1 && document.querySelectorAll("#notePane [data-edit-body] img, #notePane [data-edit-body] script").length === 0));
  await resetWrites(page);
  await finishEdit(page, "#notePane");
  const pasted = await lastBody(page);
  const ps = await sheetsIn(page, pasted);
  check(`${tag}: ...and what is SAVED is the rebuilt sheet (1 sheet, a TABLE only, no img/script)`, ps.length === 1 && ps[0].kids.join() === "TABLE" && !/<img|<script/i.test(pasted.replace(/&lt;img[^&]*&gt;/g, "")), pasted.slice(0, 300));
  await page.close(); await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
