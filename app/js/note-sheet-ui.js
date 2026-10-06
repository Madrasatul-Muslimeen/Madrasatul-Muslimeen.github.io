// The spreadsheet GRID inside a Note (note-pane Part C, round C2, item 44).
//
// The Note's body holds  <div class="mm-sheet" data-sheet="{state}"><table class="mm-sheet-static">…</table></div>
// (see note-sheet-engine.js). This module MOUNTS a live grid inside that div:
//   * in the editor it is editable and every change rewrites `data-sheet` and the snapshot table, then calls
//     `onChange` so the Note's ordinary autosave takes it from there;
//   * in the read view it is read-only.
// The live grid is `.sheet-live`. It is NEVER saved: the sanitiser rebuilds every `div[data-sheet]` from its state,
// so anything inside it but the snapshot is dropped on the one save path.
//
// Every key, input, clipboard and mouse-up event is stopped at `.sheet-live`, so the Note editor's own
// shortcuts (Ctrl+B, Esc-to-finish, the mention picker, paste cleaning ...) never act on a cell key.

import { t, num, parseNum } from "./i18n.js";
import {
  SHEET_FORMATS, SHEET_MAX_COLS, SHEET_MAX_ROWS, SHEET_MIN_WIDTH, SHEET_MAX_WIDTH,
  addTotals, blockToTsv, cellName, cleanSheetState, colName, evaluateSheet, fillBlock, filterValues, hiddenRows,
  mergeAt, mergeBlock, newSheetState, parseCellInput, resizeAxis, serializeSheetState, sheetStaticHtml, sortRows,
  todaySerial, tsvToBlock, unmergeAt,
} from "./note-sheet-engine.js";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const DEFAULT_W = 96, ROW_HEAD_W = 44, UNDO_MAX = 60;

/** The markup a new spreadsheet is inserted as (5 rows by 4 columns). */
export function sheetInsertHtml() {
  const s = { ...newSheetState(), td: todaySerial() };
  return `<div class="mm-sheet" contenteditable="false" data-sheet="${esc(serializeSheetState(s))}">${sheetStaticHtml(s)}</div>`;
}

const ERR_WORDS = () => ({
  "#DIV/0!": t("Divided by zero"),
  "#REF!": t("A cell this formula points at is missing"),
  "#NAME?": t("A word in this formula is not a function or a cell"),
  "#VALUE!": t("A value here is the wrong kind for this formula"),
  "#CIRC!": t("This formula depends on itself"),
});
const FORMAT_LABELS = () => ({
  general: t("General"), number: t("Number (2 decimals)"), percent: t("Percent"), currency: t("Currency"), date: t("Date (dd/mm/yyyy)"),
});

/** Mount every spreadsheet found under `container`. */
export function mountSheets(container, o) { for (const root of container.querySelectorAll("div.mm-sheet[data-sheet]")) mountSheet(root, o); }

/**
 * o = { editable, onChange(root), ask(title, text, okLabel) -> Promise<boolean>, refuse() -> sentence | "",
 *       status?(sentence) }
 * `refuse` is asked before anything that would change the sheet when `editable` is false (a read view, a finalised Note).
 */
export function mountSheet(root, o) {
  if (root.querySelector(":scope > .sheet-live")) return;
  let state = cleanSheetState(root.getAttribute("data-sheet"));
  if (!state) return;
  const editable = !!o.editable;
  const undo = [], redo = [];
  let anchor = [0, 0], focus = [0, 0], extend = false, editing = null, filterOpen = false, clip = "", pasteSeen = false;
  const live = document.createElement("div");
  live.className = "sheet-live";
  live.dataset.sheetLive = "";
  const label = (k) => esc(t(k));
  // icon + translated word, e.g. "＋ Row"
  const tool = (act, icon, word, aria) => `<button type="button" class="secondary sheet-btn" data-sheet-act="${act}" aria-label="${esc(t(aria || word))}" title="${esc(t(aria || word))}"><span aria-hidden="true">${icon}</span> ${esc(t(word))}</button>`;
  live.innerHTML = `
    ${editable ? `<div class="sheet-bar" role="toolbar" aria-label="${label("Spreadsheet tools")}">
      ${tool("addRow", "＋", "Row", "Add a row below")}${tool("delRow", "−", "Row", "Remove the selected row")}
      ${tool("addCol", "＋", "Column", "Add a column after")}${tool("delCol", "−", "Column", "Remove the selected column")}
      ${tool("merge", "▣", "Merge", "Merge the selected cells")}${tool("unmerge", "▢", "Unmerge", "Unmerge")}
      ${tool("filter", "⏷", "Filter", "Filter this column")}${tool("sortAsc", "↑", "Sort", "Sort by this column, smallest first")}${tool("sortDesc", "↓", "Sort", "Sort by this column, largest first")}
      ${tool("fillDown", "⤓", "Fill down", "Fill down from the first cell")}${tool("fillRight", "⤒", "Fill right", "Fill right from the first cell")}${tool("totals", "Σ", "Totals", "Add totals under the selected cells")}
      <label class="sheet-fmt"><span>${label("Format")}</span><select data-sheet-format aria-label="${label("Number format")}">${SHEET_FORMATS.map((f) => `<option value="${f}">${esc(FORMAT_LABELS()[f])}</option>`).join("")}</select></label>
      <label class="sheet-sym"><span>${label("Symbol")}</span><input type="text" maxlength="4" autocomplete="off" data-sheet-sym aria-label="${label("Currency symbol")}"></label>
      ${tool("freeze", "❄", "Header row", "Freeze the header row")}${tool("extend", "⬚", "Select block", "Select a block: tap, then tap the far corner")}
      ${tool("undo", "↶", "Undo", "Undo in the spreadsheet")}${tool("remove", "✕", "Remove", "Remove the spreadsheet")}
    </div>
    <div class="sheet-filter" data-sheet-filter hidden></div>` : ""}
    <p class="sheet-fx" data-sheet-fx aria-live="off"></p>
    <div class="sheet-scroll" tabindex="0" role="grid" aria-label="${label("Spreadsheet")}" data-sheet-scroll></div>
    <p class="sheet-msg" role="status" aria-live="polite" data-sheet-msg hidden></p>`;
  root.classList.add("has-live");
  root.appendChild(live);
  const scroll = live.querySelector("[data-sheet-scroll]"), fxEl = live.querySelector("[data-sheet-fx]"), msgEl = live.querySelector("[data-sheet-msg]");

  // ---------------------------------------------------------------- helpers
  const say = (text) => { msgEl.textContent = text || ""; msgEl.hidden = !text; };
  const rect = () => ({ r1: Math.min(anchor[0], focus[0]), c1: Math.min(anchor[1], focus[1]), r2: Math.max(anchor[0], focus[0]), c2: Math.max(anchor[1], focus[1]) });
  const clamp = (n, hi) => Math.max(0, Math.min(hi, n));
  const origin = (r, c) => { const m = mergeAt(state, r, c); return m ? [m[0], m[1]] : [r, c]; };
  const refuse = () => { const s = o.refuse?.() || t("Open the Note for editing to change the spreadsheet."); say(s); o.status?.(s); return false; };
  const canEdit = () => (editable ? true : refuse());
  function persist() {
    root.setAttribute("data-sheet", serializeSheetState(state));
    const tpl = document.createElement("template");
    tpl.innerHTML = sheetStaticHtml(state);
    const old = root.querySelector(":scope > .mm-sheet-static");
    if (old) old.replaceWith(tpl.content.firstChild); else root.prepend(tpl.content.firstChild);
    o.onChange?.(root);
  }
  /** Every change goes through here: undo point, today's date stored for the snapshot, save, redraw. */
  function commit(next) {
    if (!next) return false;
    const clean = cleanSheetState({ ...next, td: todaySerial() });
    if (!clean) return false;
    if (JSON.stringify(clean) === JSON.stringify(state)) return true;
    undo.push(JSON.stringify(state)); if (undo.length > UNDO_MAX) undo.shift();
    redo.length = 0;
    state = clean; say("");
    persist(); render();
    return true;
  }
  const copy = () => JSON.parse(JSON.stringify(state));

  // ---------------------------------------------------------------- drawing
  function render() {
    const s = state, grid = evaluateSheet(s), hide = hiddenRows(s), words = ERR_WORDS();
    const covered = new Set(), spans = new Map();
    for (const [r, c, rs, cs] of s.merges) { spans.set(`${r},${c}`, [rs, cs]); for (let i = r; i < r + rs; i++) for (let j = c; j < c + cs; j++) if (i !== r || j !== c) covered.add(`${i},${j}`); }
    const widths = Array.from({ length: s.cols }, (_, c) => s.w[c] ?? DEFAULT_W);
    const total = ROW_HEAD_W + widths.reduce((a, b) => a + b, 0);
    let h = `<table class="sheet-grid${s.hdr ? " sheet-hdr" : ""}" style="width:${total}px"><colgroup><col style="width:${ROW_HEAD_W}px">${widths.map((w, c) => `<col data-sheet-col="${c}" style="width:${w}px">`).join("")}</colgroup><thead><tr><th class="sheet-corner" aria-hidden="true"></th>`;
    for (let c = 0; c < s.cols; c++) {
      h += `<th scope="col" class="sheet-ch${s.filt[c] ? " sheet-filtered" : ""}" data-sheet-ch="${c}">${colName(c)}${s.filt[c] ? `<span class="sheet-fmark" aria-label="${label("Filtered")}">⏷</span>` : ""}${editable ? `<span class="sheet-resize" data-sheet-resize="${c}" aria-hidden="true"></span>` : ""}</th>`;
    }
    h += "</tr></thead><tbody>";
    for (let r = 0; r < s.rows; r++) {
      if (hide.has(r)) continue;
      h += `<tr${s.hdr && r === 0 ? ' class="sheet-hrow"' : ""}><th scope="row" class="sheet-rh" data-sheet-rh="${r}">${num(r + 1)}</th>`;
      for (let c = 0; c < s.cols; c++) {
        if (covered.has(`${r},${c}`)) continue;
        const g = grid[r][c], sp = spans.get(`${r},${c}`);
        const cls = ["sheet-cell"]; if (g.err) cls.push("sheet-err"); else if (typeof g.v === "number") cls.push("sheet-num");
        h += `<td class="${cls.join(" ")}" data-r="${r}" data-c="${c}"${sp && sp[0] > 1 ? ` rowspan="${sp[0]}"` : ""}${sp && sp[1] > 1 ? ` colspan="${sp[1]}"` : ""}${g.err ? ` title="${esc(words[g.err] || g.err)}" aria-label="${esc(`${g.err} ${words[g.err] || ""}`)}"` : ""} role="gridcell"><span class="sheet-val">${esc(num(g.text))}</span></td>`;
      }
      h += "</tr>";
    }
    scroll.innerHTML = `${h}</tbody></table>`;
    anchor = [clamp(anchor[0], s.rows - 1), clamp(anchor[1], s.cols - 1)]; focus = [clamp(focus[0], s.rows - 1), clamp(focus[1], s.cols - 1)];
    paintSel();
    if (filterOpen) paintFilter();
  }
  function paintSel() {
    const { r1, c1, r2, c2 } = rect();
    const [ar, ac] = origin(focus[0], focus[1]);
    for (const td of scroll.querySelectorAll("td.sheet-cell")) {
      const r = Number(td.dataset.r), c = Number(td.dataset.c), m = mergeAt(state, r, c);
      const inside = m ? !(m[0] + m[2] - 1 < r1 || m[0] > r2 || m[1] + m[3] - 1 < c1 || m[1] > c2) : r >= r1 && r <= r2 && c >= c1 && c <= c2;
      td.classList.toggle("sel", inside);
      td.classList.toggle("active", r === ar && c === ac);
      td.setAttribute("aria-selected", String(inside));
    }
    const raw = state.d[ar]?.[ac] ?? "";
    fxEl.textContent = `${cellName(ar, ac)}: ${raw === "" ? "—" : raw}`;
    const fm = live.querySelector("[data-sheet-format]");
    if (fm) fm.value = state.fmt[`${ar},${ac}`] ?? "general";
    const sym = live.querySelector("[data-sheet-sym]");
    if (sym && document.activeElement !== sym) sym.value = state.sym;
    const ex = live.querySelector('[data-sheet-act="extend"]'), fr = live.querySelector('[data-sheet-act="freeze"]');
    if (ex) ex.setAttribute("aria-pressed", String(extend));
    if (fr) fr.setAttribute("aria-pressed", String(state.hdr));
    scroll.querySelector("td.active")?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }
  function select(r, c, keepAnchor) {
    focus = [clamp(r, state.rows - 1), clamp(c, state.cols - 1)];
    if (!keepAnchor) anchor = focus.slice();
    paintSel();
  }

  // ---------------------------------------------------------------- editing a cell
  function startEdit(r, c, initial) {
    if (!canEdit()) return;
    [r, c] = origin(r, c);
    const td = scroll.querySelector(`td[data-r="${r}"][data-c="${c}"]`);
    if (!td || editing) return;
    select(r, c);
    const input = document.createElement("input");
    input.type = "text"; input.className = "sheet-input"; input.autocomplete = "off"; input.maxLength = 500;
    input.dataset.sheetInput = ""; input.setAttribute("aria-label", `${t("Cell")} ${cellName(r, c)}`);
    input.value = initial ?? state.d[r][c];
    editing = { r, c, input, done: false };
    td.replaceChildren(input); td.classList.add("editing");
    input.focus();
    if (initial === undefined) input.select();
    input.addEventListener("blur", () => { if (editing && !editing.done) endEdit(true); });
  }
  function endEdit(save, move) {
    const e = editing;
    if (!e || e.done) return;
    e.done = true; editing = null;
    if (save) {
      const raw = parseNum(e.input.value);
      const next = copy();
      const before = next.d[e.r][e.c];
      const val = raw.trimStart().startsWith("=") ? raw : (parseCellInput(raw) === null ? "" : raw);
      if (val !== before) { next.d[e.r][e.c] = val; commit(next); } else render();
    } else render();
    if (move) select(e.r + move[0], e.c + move[1]);
    scroll.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- operations on the selection
  const SAYS = {
    merged: () => t("Sorting needs the rows to be un-merged first."),
    capRow: () => t("A spreadsheet holds at most {n} rows.", { n: num(SHEET_MAX_ROWS) }),
    capCol: () => t("A spreadsheet holds at most {n} columns.", { n: num(SHEET_MAX_COLS) }),
  };
  function clearSel() {
    if (!canEdit()) return;
    const { r1, c1, r2, c2 } = rect(), next = copy();
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) next.d[r][c] = "";
    commit(next);
  }
  function pasteText(text) {
    if (!canEdit()) return;
    const block = tsvToBlock(text);
    if (!block.length) return;
    const { r1, c1 } = rect();
    let next = copy();
    const needR = Math.min(SHEET_MAX_ROWS, r1 + block.length), needC = Math.min(SHEET_MAX_COLS, c1 + Math.max(...block.map((l) => l.length)));
    while (next.rows < needR) next = resizeAxis(next, "row", next.rows, +1) ?? next;
    while (next.cols < needC) next = resizeAxis(next, "col", next.cols, +1) ?? next;
    let clipped = false;
    block.forEach((line, i) => line.forEach((x, j) => { const r = r1 + i, c = c1 + j; if (r < next.rows && c < next.cols) next.d[r][c] = parseNum(x); else clipped = true; }));
    commit(next);
    if (clipped) say(t("Some pasted cells did not fit and were left out."));
    select(r1, c1); anchor = [r1, c1]; focus = [Math.min(next.rows - 1, r1 + block.length - 1), Math.min(next.cols - 1, c1 + Math.max(...block.map((l) => l.length)) - 1)]; paintSel();
  }
  const copyText = () => { const { r1, c1, r2, c2 } = rect(); return blockToTsv(state, r1, c1, r2, c2); };

  async function act(name) {
    const { r1, c1, r2, c2 } = rect();
    const [ar, ac] = origin(focus[0], focus[1]);
    if (name === "extend") { extend = !extend; paintSel(); return; }
    if (name === "filter") { filterOpen = !filterOpen; paintFilter(); return; }
    if (name === "undo") { doUndo(); return; }
    if (!canEdit()) return;
    if (name === "addRow") { const g = resizeAxis(state, "row", r2 + 1, +1); if (!g) { say(SAYS.capRow()); return; } commit(g); select(r2 + 1, ac); return; }
    if (name === "addCol") { const g = resizeAxis(state, "col", c2 + 1, +1); if (!g) { say(SAYS.capCol()); return; } commit(g); select(ar, c2 + 1); return; }
    if (name === "delRow" || name === "delCol") {
      const row = name === "delRow", at = row ? r1 : c1, n = (row ? r2 - r1 : c2 - c1) + 1;
      if ((row ? state.rows : state.cols) <= n) { say(t(row ? "A spreadsheet needs at least one row." : "A spreadsheet needs at least one column.")); return; }
      const ok = await o.ask(t(row ? "Remove rows" : "Remove columns"), t(row ? "Remove the selected row(s) and what is in them?" : "Remove the selected column(s) and what is in them?"), t("Remove"));
      if (!ok) return;
      let g = state;
      for (let i = 0; i < n && g; i++) g = resizeAxis(g, row ? "row" : "col", at, -1);
      if (g) { commit(g); select(Math.min(row ? at : ar, g.rows - 1), Math.min(row ? ac : at, g.cols - 1)); } else say(t("That could not be removed."));
      return;
    }
    if (name === "merge") { const g = mergeBlock(state, r1, c1, r2, c2); if (!g) { say(t("Select two or more cells to merge.")); return; } commit(g); select(r1, c1); return; }
    if (name === "unmerge") { const g = unmergeAt(state, ar, ac); if (!g) { say(t("The selected cell is not merged.")); return; } commit(g); return; }
    if (name === "sortAsc" || name === "sortDesc") {
      const r = sortRows(state, ac, name === "sortDesc");
      if (r.error) { say(SAYS[r.error]()); return; }
      commit(r.state); return;
    }
    if (name === "fillDown" || name === "fillRight") {
      const r = fillBlock(state, r1, c1, r2, c2, name === "fillDown" ? "down" : "right");
      if (!r.filled) { say(t("Select the cell to copy from and the empty cells after it, then fill.")); return; }
      commit(r.state); return;
    }
    if (name === "totals") {
      const r = addTotals(state, r1, c1, r2, c2);
      if (!r) { say(SAYS.capRow()); return; }
      commit(r.state); select(r.row, c1); return;
    }
    if (name === "freeze") { const g = copy(); g.hdr = !g.hdr; commit(g); return; }
    if (name === "remove") {
      const ok = await o.ask(t("Remove the spreadsheet"), t("Remove this spreadsheet from the Note? 🕘 Versions can bring it back."), t("Remove"));
      if (!ok) return;
      root.remove(); o.onChange?.(null);
    }
  }
  function doUndo() {
    if (!canEdit()) return;
    const prev = undo.pop();
    if (!prev) { say(t("Nothing to undo in the spreadsheet.")); return; }
    redo.push(JSON.stringify(state));
    state = cleanSheetState(prev); persist(); render();
  }
  function doRedo() {
    if (!canEdit()) return;
    const nxt = redo.pop();
    if (!nxt) return;
    undo.push(JSON.stringify(state));
    state = cleanSheetState(nxt); persist(); render();
  }

  // ---------------------------------------------------------------- the filter list
  function paintFilter() {
    const box = live.querySelector("[data-sheet-filter]");
    if (!box) return;
    box.hidden = !filterOpen;
    live.querySelector('[data-sheet-act="filter"]')?.setAttribute("aria-pressed", String(filterOpen));
    if (!filterOpen) { box.replaceChildren(); return; }
    const c = origin(focus[0], focus[1])[1], hidden = new Set(state.filt[c] ?? []);
    const vals = [...new Set([...filterValues(state, c), ...hidden])];
    box.innerHTML = `<p class="sheet-filter-head"><strong>${esc(t("Filter column {col}", { col: colName(c) }))}</strong> <span>${esc(t("Untick a value to hide its rows."))}</span>
      <button type="button" class="secondary sheet-btn" data-sheet-filter-all>${esc(t("Show all"))}</button><button type="button" class="secondary sheet-btn" data-sheet-filter-close>${esc(t("Close"))}</button></p>
      <div class="sheet-filter-list">${vals.map((v, i) => `<label class="sheet-filter-opt"><input type="checkbox" data-sheet-filter-val="${i}"${hidden.has(v) ? "" : " checked"}> <span>${esc(v === "" ? t("(empty)") : num(v))}</span></label>`).join("")}</div>`;
    box.__vals = vals; box.__col = c;
  }
  live.addEventListener("change", (ev) => {
    const cb = ev.target.closest?.("[data-sheet-filter-val]");
    if (cb) {
      if (!canEdit()) { paintFilter(); return; }
      const box = live.querySelector("[data-sheet-filter]"), c = box.__col;
      const off = box.__vals.filter((_, i) => !box.querySelector(`[data-sheet-filter-val="${i}"]`).checked);
      const g = copy(); if (off.length) g.filt[c] = off; else delete g.filt[c];
      commit(g); return;
    }
    const fm = ev.target.closest?.("[data-sheet-format]");
    if (fm) {
      if (!canEdit()) { paintSel(); return; }
      const { r1, c1, r2, c2 } = rect(), g = copy();
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) { if (fm.value === "general") delete g.fmt[`${r},${c}`]; else g.fmt[`${r},${c}`] = fm.value; }
      commit(g); scroll.focus({ preventScroll: true });
      return;
    }
    const sym = ev.target.closest?.("[data-sheet-sym]");
    if (sym) { if (!canEdit()) { paintSel(); return; } const g = copy(); g.sym = sym.value; commit(g); }
  });

  // ---------------------------------------------------------------- mouse / touch
  let drag = null, resizing = null;
  live.addEventListener("pointerdown", (ev) => {
    const rz = ev.target.closest?.("[data-sheet-resize]");
    if (rz && editable) {
      ev.preventDefault();
      const c = Number(rz.dataset.sheetResize), col = scroll.querySelector(`col[data-sheet-col="${c}"]`);
      resizing = { c, x: ev.clientX, w: state.w[c] ?? DEFAULT_W, col, table: scroll.querySelector("table"), rtl: getComputedStyle(scroll).direction === "rtl" };
      rz.setPointerCapture?.(ev.pointerId);
      return;
    }
    const td = ev.target.closest?.("td.sheet-cell");
    if (td && !ev.target.closest("input")) {
      const r = Number(td.dataset.r), c = Number(td.dataset.c);
      if (editing) endEdit(true);
      const wasActive = !ev.shiftKey && !extend && origin(focus[0], focus[1]).join() === `${r},${c}` && rect().r1 === rect().r2 && rect().c1 === rect().c2;
      if (wasActive && editable && ev.pointerType !== "mouse") { startEdit(r, c); ev.preventDefault(); return; }
      select(r, c, ev.shiftKey || extend);
      if (extend) { extend = false; paintSel(); }
      if (ev.pointerType === "mouse") drag = { moved: false };
      scroll.focus({ preventScroll: true });
      ev.preventDefault();
      return;
    }
    const ch = ev.target.closest?.("[data-sheet-ch]"), rh = ev.target.closest?.("[data-sheet-rh]");
    if (ch) { const c = Number(ch.dataset.sheetCh); anchor = [0, c]; focus = [state.rows - 1, c]; paintSel(); scroll.focus({ preventScroll: true }); ev.preventDefault(); }
    else if (rh) { const r = Number(rh.dataset.sheetRh); anchor = [r, 0]; focus = [r, state.cols - 1]; paintSel(); scroll.focus({ preventScroll: true }); ev.preventDefault(); }
  });
  live.addEventListener("pointermove", (ev) => {
    if (resizing) {
      const dx = (ev.clientX - resizing.x) * (resizing.rtl ? -1 : 1), w = Math.max(SHEET_MIN_WIDTH, Math.min(SHEET_MAX_WIDTH, Math.round(resizing.w + dx)));
      resizing.now = w; resizing.col.style.width = `${w}px`;
      resizing.table.style.width = `${ROW_HEAD_W + Array.from({ length: state.cols }, (_, c) => (c === resizing.c ? w : state.w[c] ?? DEFAULT_W)).reduce((a, b) => a + b, 0)}px`;
      return;
    }
    if (!drag || !(ev.buttons & 1)) return;
    const td = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.("td.sheet-cell");
    if (td && scroll.contains(td)) { drag.moved = true; focus = [Number(td.dataset.r), Number(td.dataset.c)]; paintSel(); }
  });
  const endPointer = () => {
    drag = null;
    if (resizing) { const r = resizing; resizing = null; if (r.now && r.now !== r.w) { const g = copy(); g.w[r.c] = r.now; commit(g); } }
  };
  live.addEventListener("pointerup", endPointer); live.addEventListener("pointercancel", endPointer);
  live.addEventListener("dblclick", (ev) => {
    const td = ev.target.closest?.("td.sheet-cell");
    if (td && !editing) startEdit(Number(td.dataset.r), Number(td.dataset.c));
  });
  live.addEventListener("click", (ev) => {
    const b = ev.target.closest?.("[data-sheet-act]");
    if (b) { ev.preventDefault(); act(b.dataset.sheetAct); return; }
    if (ev.target.closest?.("[data-sheet-filter-all]")) { if (!canEdit()) return; const g = copy(); delete g.filt[live.querySelector("[data-sheet-filter]").__col]; commit(g); return; }
    if (ev.target.closest?.("[data-sheet-filter-close]")) { filterOpen = false; paintFilter(); }
  });
  // the toolbar must not take the grid's selection or the Note editor's caret away
  live.addEventListener("mousedown", (ev) => { if (ev.target.closest?.(".sheet-bar button, .sheet-resize")) ev.preventDefault(); });

  // ---------------------------------------------------------------- the keyboard: it stops HERE
  live.addEventListener("keydown", (ev) => {
    ev.stopPropagation();
    const inGrid = ev.target === scroll, inCell = ev.target.matches?.("[data-sheet-input]");
    if (inCell) {
      if (ev.key === "Enter") { ev.preventDefault(); endEdit(true, [ev.shiftKey ? -1 : 1, 0]); }
      else if (ev.key === "Tab") { ev.preventDefault(); endEdit(true, [0, ev.shiftKey ? -1 : 1]); }
      else if (ev.key === "Escape") { ev.preventDefault(); endEdit(false); }
      return;
    }
    if (!inGrid) { if (ev.key === "Escape" && filterOpen) { filterOpen = false; paintFilter(); scroll.focus({ preventScroll: true }); } return; }
    const mod = ev.ctrlKey || ev.metaKey, k = ev.key;
    const go = (dr, dc) => {
      ev.preventDefault();
      let [r, c] = focus;
      if (!ev.shiftKey) { const m = mergeAt(state, r, c); if (m) { r = dr > 0 ? m[0] + m[2] - 1 : m[0]; c = dc > 0 ? m[1] + m[3] - 1 : m[1]; } }
      r = clamp(r + dr, state.rows - 1); c = clamp(c + dc, state.cols - 1);
      if (!ev.shiftKey) { const [or, oc] = origin(r, c); r = or; c = oc; }
      select(r, c, ev.shiftKey);
    };
    if (k === "ArrowDown") go(1, 0); else if (k === "ArrowUp") go(-1, 0); else if (k === "ArrowRight") go(0, 1); else if (k === "ArrowLeft") go(0, -1);
    else if (k === "Tab") go(0, ev.shiftKey ? -1 : 1);
    else if (k === "Enter" || k === "F2") { ev.preventDefault(); startEdit(...origin(focus[0], focus[1])); }
    else if (k === "Delete" || k === "Backspace") { ev.preventDefault(); clearSel(); }
    else if (k === "Escape") { extend = false; paintSel(); }
    else if (k === "Home") { ev.preventDefault(); select(focus[0], 0, ev.shiftKey); }
    else if (k === "End") { ev.preventDefault(); select(focus[0], state.cols - 1, ev.shiftKey); }
    else if (mod && (k === "a" || k === "A")) { ev.preventDefault(); anchor = [0, 0]; focus = [state.rows - 1, state.cols - 1]; paintSel(); }
    else if (mod && (k === "z" || k === "Z")) { ev.preventDefault(); if (ev.shiftKey) doRedo(); else doUndo(); }
    else if (mod && (k === "y" || k === "Y")) { ev.preventDefault(); doRedo(); }
    else if (mod && (k === "d" || k === "D")) { ev.preventDefault(); act("fillDown"); }
    else if (mod && (k === "r" || k === "R")) { ev.preventDefault(); act("fillRight"); }
    else if (mod && (k === "c" || k === "C" || k === "x" || k === "X")) { clip = copyText(); if (k === "x" || k === "X") { if (editable) clearSel(); else refuse(); } /* the copy / cut event below puts it on the clipboard */ }
    else if (mod && (k === "v" || k === "V")) { // the paste event below does it; where a browser sends none (a locked-down clipboard), this device's own last copy is used
      pasteSeen = false;
      setTimeout(() => { if (!pasteSeen && clip) pasteText(clip); }, 60);
    }
    else if (!mod && !ev.altKey && k.length === 1) { ev.preventDefault(); startEdit(...origin(focus[0], focus[1]), k); }
  });
  for (const type of ["keyup", "keypress", "beforeinput", "input", "mouseup", "compositionstart", "compositionend"]) live.addEventListener(type, (ev) => ev.stopPropagation());
  const toClipboard = (ev) => {
    if (ev.target.closest?.("input, select")) { ev.stopPropagation(); return; }
    ev.preventDefault(); ev.stopPropagation();
    clip = copyText(); ev.clipboardData?.setData("text/plain", clip);
  };
  live.addEventListener("copy", toClipboard);
  live.addEventListener("cut", (ev) => { if (ev.target.closest?.("input, select")) { ev.stopPropagation(); return; } toClipboard(ev); if (editable) clearSel(); else refuse(); });
  live.addEventListener("paste", (ev) => {
    ev.stopPropagation(); pasteSeen = true;
    if (ev.target.closest?.("input, select")) return;
    ev.preventDefault();
    pasteText(ev.clipboardData?.getData("text/plain") || clip);
  });

  render();
  say(editable && state.d.every((row) => row.every((x) => x === "")) ? t("Insert a spreadsheet: type in a cell, start a formula with =, for example =SUM(A1:A3).") : "");
  root.__sheet = { get state() { return state; }, select: (r1, c1, r2, c2) => { anchor = [r1, c1]; focus = [r2 ?? r1, c2 ?? c1]; paintSel(); } };
}
