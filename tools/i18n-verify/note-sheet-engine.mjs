// Note-pane Part C, round C2 (item 44): the PURE spreadsheet engine, in plain Node.
// Every expectation below is worked out by hand, not read back from the engine.
// Run from the repository root:  node tools/i18n-verify/note-sheet-engine.mjs

import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || process.cwd());
const E = await import(pathToFileURL(path.join(root, "app/js/note-sheet-engine.js")).href);
let passed = 0, failed = 0;
function check(name, body) {
  try {
    const r = body();
    if (r && typeof r.then === "function") throw new Error("check() body returned a promise: it would pass without running");
    passed++; console.log(`  PASS  ${name}`);
  } catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${String(e.message).split("\n")[0]}`); }
}
const TODAY = 46000; // a fixed serial day, so TODAY() is testable
/** Build a sheet from rows of raw text. */
const S = (rows, extra = {}) => ({ ...E.newSheetState(rows.length, rows[0].length), d: rows, ...extra });
const ev = (rows, extra) => E.evaluateSheet(S(rows, extra), { today: TODAY });
/** The computed value / error / text of ONE formula, put in cell A1 beside the data `data` (rows) in columns B.. */
function one(formula, data = [["", 1, 2, 3], ["", 4, 5, 6]]) {
  const rows = data.map((r) => r.slice()); rows[0][0] = formula;
  return ev(rows)[0][0];
}

console.log("functions");
check("SUM of a range and of loose arguments", () => { assert.equal(one("=SUM(B1:D2)").v, 21); assert.equal(one("=SUM(B1,C1,10)").v, 13); });
check("SUM ignores text and empty cells inside a range", () => assert.equal(one("=SUM(B1:C2)", [["", 1, "x"], ["", "", 4]]).v, 5));
check("AVERAGE", () => assert.equal(one("=AVERAGE(B1:D1)").v, 2));
check("AVERAGE of nothing is #DIV/0!", () => assert.equal(one("=AVERAGE(B1:C1)", [["", "a", "b"]]).err, "#DIV/0!"));
check("MIN and MAX", () => { assert.equal(one("=MIN(B1:D2)").v, 1); assert.equal(one("=MAX(B1:D2)").v, 6); });
check("COUNT counts numbers only, COUNTA counts anything filled", () => {
  const d = [["", 1, "x", ""], ["", 2.5, "y", "z"]];
  assert.equal(one("=COUNT(B1:D2)", d).v, 2); assert.equal(one("=COUNTA(B1:D2)", d).v, 5);
});
check("IF picks a branch and is lazy (the unused branch may be an error)", () => {
  assert.equal(one("=IF(B1>0,\"yes\",\"no\")").v, "yes");
  assert.equal(one("=IF(B1<0,1/0,7)").v, 7);
  assert.equal(one("=IF(B1<0,1)").v, false);
});
check("IFERROR catches any error and passes a good value through", () => {
  assert.equal(one("=IFERROR(1/0,\"n/a\")").v, "n/a"); assert.equal(one("=IFERROR(B1*2,0)").v, 2);
  assert.equal(one("=IFERROR(NOPE(1),9)").v, 9);
});
check("ROUND rounds half away from zero, and to a negative place", () => {
  assert.equal(one("=ROUND(2.5,0)").v, 3); assert.equal(one("=ROUND(-2.5,0)").v, -3);
  assert.equal(one("=ROUND(1.005,2)").v, 1.01); assert.equal(one("=ROUND(1234,-2)").v, 1200); assert.equal(one("=ROUND(3.14159,3)").v, 3.142);
});
check("ABS", () => { assert.equal(one("=ABS(-4.5)").v, 4.5); assert.equal(one("=ABS(B1-10)").v, 9); });
check("AND, OR, NOT", () => {
  assert.equal(one("=AND(B1=1,C1=2)").v, true); assert.equal(one("=AND(B1=1,C1=3)").v, false);
  assert.equal(one("=OR(B1=9,C1=2)").v, true); assert.equal(one("=OR(B1=9,C1=9)").v, false);
  assert.equal(one("=NOT(B1=1)").v, false);
});
check("CONCAT and &", () => { assert.equal(one("=CONCAT(\"a\",B1,\"-\",C1)").v, "a1-2"); assert.equal(one("=\"x\"&B1&\"y\"").v, "x1y"); });
check("LEN, UPPER, LOWER", () => {
  const d = [["", "Mixed Case"]];
  assert.equal(one("=LEN(B1)", d).v, 10); assert.equal(one("=UPPER(B1)", d).v, "MIXED CASE"); assert.equal(one("=LOWER(B1)", d).v, "mixed case");
});
check("TODAY is the supplied day; DATE builds an Excel serial", () => {
  assert.equal(one("=TODAY()").v, TODAY);
  assert.equal(one("=DATE(1900,1,1)").v, 2); // 1 Jan 1900 is serial 1 in Excel's own count, 2 in the 1899-12-30 epoch used since the 1900 leap bug
  assert.equal(one("=DATE(2000,1,1)").v, 36526);
  assert.equal(one("=DATE(2000,1,1)+31").v, 36557);
});
check("an unknown function is #NAME?", () => assert.equal(one("=FOO(1)").err, "#NAME?"));
check("a bare unknown word is #NAME?", () => assert.equal(one("=hello").err, "#NAME?"));

console.log("operators and references");
check("precedence: * before +, ^ before *, brackets win, unary minus", () => {
  assert.equal(one("=1+2*3").v, 7); assert.equal(one("=(1+2)*3").v, 9); assert.equal(one("=2*3^2").v, 18);
  assert.equal(one("=-2^2").v, 4); assert.equal(one("=10-4-3").v, 3); assert.equal(one("=2^3^2").v, 64);
});
check("percent postfix", () => assert.equal(one("=50%+1").v, 1.5));
check("comparisons, numbers and text (text is case-blind)", () => {
  assert.equal(one("=B1<C1").v, true); assert.equal(one("=B1>=C1").v, false); assert.equal(one("=B1<>C1").v, true);
  assert.equal(one("=\"abc\"=\"ABC\"").v, true); assert.equal(one("=\"a\"<\"b\"").v, true);
});
check("a typed number is a number, other text stays text, a formula can read both", () => {
  const g = ev([["12", "1.5e1", "twelve", "=A1+B1"]]);
  assert.equal(g[0][0].v, 12); assert.equal(g[0][1].v, 15); assert.equal(g[0][2].v, "twelve"); assert.equal(g[0][3].v, 27);
});
check("a text that cannot be a number in arithmetic is #VALUE!", () => assert.equal(one("=B1+1", [["", "abc"]]).err, "#VALUE!"));
check("an empty cell counts as 0 in arithmetic and as nothing in text", () => { assert.equal(one("=B1+5", [["", ""]]).v, 5); assert.equal(one("=\"[\"&B1&\"]\"", [["", ""]]).v, "[]"); });
check("absolute and mixed references read the same cell", () => {
  const g = ev([["=$B$1", 7], ["=B$1", 8], ["=$B1", 9]]);
  assert.equal(g[0][0].v, 7); assert.equal(g[1][0].v, 7); assert.equal(g[2][0].v, 7);
});
check("ranges given backwards (D2:B1) mean the same block", () => assert.equal(one("=SUM(D2:B1)").v, 21));
check("float noise is hidden: 0.1+0.2 is 0.3", () => assert.equal(one("=0.1+0.2").v, 0.3));
check("a reference off the grid is #REF!", () => { assert.equal(one("=Z99").err, "#REF!"); assert.equal(one("=SUM(B1:B99)").err, "#REF!"); });
check("division by zero is #DIV/0!", () => { assert.equal(one("=1/0").err, "#DIV/0!"); assert.equal(one("=B1/(C1-2)").err, "#DIV/0!"); });
check("a bad formula is #VALUE!, never a throw", () => { for (const f of ["=1+", "=(1", "=1 2", "=\"open", "=SUM(", "=@", "=1,2"]) assert.equal(one(f).err, "#VALUE!", f); });
check("an error travels through the cells that use it", () => {
  const g = ev([["=1/0", "=A1+1", "=IFERROR(B1,\"ok\")"]]);
  assert.equal(g[0][1].err, "#DIV/0!"); assert.equal(g[0][2].v, "ok");
});

console.log("circular references (never a hang)");
check("a cell that refers to itself is #CIRC!", () => assert.equal(ev([["=A1"]])[0][0].err, "#CIRC!"));
check("a two-cell loop is #CIRC! in both", () => { const g = ev([["=B1", "=A1"]]); assert.equal(g[0][0].err, "#CIRC!"); assert.equal(g[0][1].err, "#CIRC!"); });
check("a loop through a range is #CIRC!, and a cell outside the loop still works", () => {
  const g = ev([["=SUM(A2:A3)", "5"], ["=A1", "=B1*2"], ["1", ""]]);
  assert.equal(g[0][0].err, "#CIRC!"); assert.equal(g[1][1].v, 10);
});
check("a long chain does not hang or throw", () => {
  const rows = Array.from({ length: 200 }, (_, i) => [i === 0 ? "1" : `=A${i}+1`]);
  const t0 = Date.now(), g = E.evaluateSheet(S(rows), { today: TODAY });
  assert.equal(g[199][0].v, 200); assert.ok(Date.now() - t0 < 2000);
});
check("a 50-column row of loops finishes", () => {
  const row = Array.from({ length: 50 }, (_, i) => `=${E.colName((i + 1) % 50)}1`);
  const g = E.evaluateSheet(S([row]), { today: TODAY });
  assert.ok(g[0].every((x) => x.err === "#CIRC!"));
});

console.log("number formats");
check("General trims float noise and shows booleans", () => { assert.equal(E.formatValue(1 / 3), "0.333333333333"); assert.equal(E.formatValue(12), "12"); assert.equal(E.formatValue(true), "TRUE"); });
check("Number is two decimals, half away from zero", () => { assert.equal(E.formatValue(2, "number"), "2.00"); assert.equal(E.formatValue(1.005, "number"), "1.01"); assert.equal(E.formatValue(-0.001, "number"), "0.00"); });
check("Percent multiplies by 100 to two decimals", () => { assert.equal(E.formatValue(0.1234, "percent"), "12.34%"); assert.equal(E.formatValue(1, "percent"), "100.00%"); });
check("Currency is the reader's own symbol plus two decimals, minus in front", () => {
  assert.equal(E.formatValue(1234.5, "currency", "৳"), "৳1234.50"); assert.equal(E.formatValue(-3, "currency", "$"), "-$3.00"); assert.equal(E.formatValue(3, "currency", ""), "3.00");
});
check("Date is dd/mm/yyyy from a serial day", () => { assert.equal(E.formatValue(36526, "date"), "01/01/2000"); assert.equal(E.formatValue(36526 + 59, "date"), "29/02/2000"); });
check("text is never reformatted", () => assert.equal(E.formatValue("abc", "percent"), "abc"));
check("the sheet applies a cell's own format", () => {
  const g = ev([["0.5", "=A1*2"]], { fmt: { "0,0": "percent", "0,1": "number" } });
  assert.equal(g[0][0].text, "50.00%"); assert.equal(g[0][1].text, "1.00");
});
check("an error shows its code, formatted or not", () => assert.equal(ev([["=1/0"]], { fmt: { "0,0": "percent" } })[0][0].text, "#DIV/0!"));

console.log("shifted formulas (relative references)");
check("relative references move, absolute stay", () => {
  assert.equal(E.shiftFormula("=A1+B2", 1, 0), "=A2+B3");
  assert.equal(E.shiftFormula("=A1+B2", 0, 2), "=C1+D2");
  assert.equal(E.shiftFormula("=$A$1+B2", 3, 3), "=$A$1+E5");
  assert.equal(E.shiftFormula("=$A1+B$2", 2, 2), "=$A3+D$2");
});
check("ranges shift both ends", () => assert.equal(E.shiftFormula("=SUM(A1:B3)", 1, 1), "=SUM(B2:C4)"));
check("a shift off the top-left edge is #REF!", () => assert.equal(E.shiftFormula("=A1", -1, 0), "=#REF!"));
check("text in quotes and function names are not references", () => {
  assert.equal(E.shiftFormula("=CONCAT(\"A1\",A1)", 1, 0), "=CONCAT(\"A1\",A2)");
  assert.equal(E.shiftFormula("=ROUND(A1,2)", 1, 0), "=ROUND(A2,2)");
});
check("plain text is returned untouched", () => assert.equal(E.shiftFormula("A1", 5, 5), "A1"));

console.log("fill down / right");
check("two numbers continue the series", () => {
  const { state, filled } = E.fillBlock(S([["1"], ["3"], [""], [""], [""]]), 0, 0, 4, 0, "down");
  assert.deepEqual(state.d.map((r) => r[0]), ["1", "3", "5", "7", "9"]); assert.equal(filled, 3);
});
check("a descending series and a decimal step", () => {
  assert.deepEqual(E.fillBlock(S([["10"], ["7"], [""], [""]]), 0, 0, 3, 0, "down").state.d.map((r) => r[0]), ["10", "7", "4", "1"]);
  assert.deepEqual(E.fillBlock(S([["0.1"], ["0.2"], [""], [""]]), 0, 0, 3, 0, "down").state.d.map((r) => r[0]), ["0.1", "0.2", "0.3", "0.4"]);
});
check("one number, or text, is copied", () => {
  assert.deepEqual(E.fillBlock(S([["4"], [""], [""]]), 0, 0, 2, 0, "down").state.d.map((r) => r[0]), ["4", "4", "4"]);
  assert.deepEqual(E.fillBlock(S([["a"], ["b"], [""], [""], [""]]), 0, 0, 4, 0, "down").state.d.map((r) => r[0]), ["a", "b", "a", "b", "a"]);
});
check("a formula shifts relatively down", () => {
  const { state } = E.fillBlock(S([["1", "10", "=A1+B1"], ["2", "20", ""], ["3", "30", ""]]), 0, 2, 2, 2, "down");
  assert.deepEqual(state.d.map((r) => r[2]), ["=A1+B1", "=A2+B2", "=A3+B3"]);
});
check("a formula shifts relatively right, and keeps $absolute", () => {
  const { state } = E.fillBlock(S([["=A2*$A$3", "", ""], ["1", "2", "3"], ["10", "", ""]]), 0, 0, 0, 2, "right");
  assert.deepEqual(state.d[0], ["=A2*$A$3", "=B2*$A$3", "=C2*$A$3"]);
});
check("the seed's number format comes along", () => {
  const { state } = E.fillBlock(S([["1"], [""]], { fmt: { "0,0": "percent" } }), 0, 0, 1, 0, "down");
  assert.equal(state.fmt["1,0"], "percent");
});
check("nothing to fill (no empty cell below) changes nothing", () => assert.equal(E.fillBlock(S([["1"], ["2"]]), 0, 0, 1, 0, "down").filled, 0));
check("a column whose first cell is empty is left alone", () => assert.equal(E.fillBlock(S([[""], ["5"]]), 0, 0, 1, 0, "down").state.d[1][0], "5"));

console.log("sort, rows and columns, merge, totals, filter");
check("sort by computed value, header stays, numbers by value not text", () => {
  const r = E.sortRows(S([["n"], ["10"], ["9"], ["100"]]), 0, false);
  assert.deepEqual(r.state.d.map((x) => x[0]), ["n", "9", "10", "100"]);
  assert.deepEqual(E.sortRows(S([["n"], ["10"], ["9"], ["100"]]), 0, true).state.d.map((x) => x[0]), ["n", "100", "10", "9"]);
});
check("sort uses what a formula computes, and a moved formula still points at its own row", () => {
  const r = E.sortRows(S([["x", "y"], ["3", "=A2*2"], ["1", "=A3*2"], ["2", "=A4*2"]]), 1, false);
  assert.deepEqual(r.state.d.map((x) => x[0]), ["x", "1", "2", "3"]);
  assert.deepEqual(r.state.d.map((x) => x[1]), ["y", "=A2*2", "=A3*2", "=A4*2"]);
});
check("sort puts empty cells last either way, and text after numbers", () => {
  assert.deepEqual(E.sortRows(S([["h"], [""], ["b"], ["3"], ["a"]]), 0, false).state.d.map((x) => x[0]), ["h", "3", "a", "b", ""]);
  assert.deepEqual(E.sortRows(S([["h"], [""], ["b"], ["3"], ["a"]]), 0, true).state.d.map((x) => x[0]), ["h", "b", "a", "3", ""]);
});
check("sort refuses a sheet with merged data rows, in a code the grid turns into words", () => assert.equal(E.sortRows(S([["h", "h"], ["1", "2"], ["3", "4"]], { merges: [[1, 0, 2, 1]] }), 0).error, "merged"));
check("inserting a row moves the references below it", () => {
  const s = E.resizeAxis(S([["1"], ["2"], ["=A1+A2"]]), "row", 1, +1);
  assert.equal(s.rows, 4); assert.equal(s.d[3][0], "=A1+A3"); assert.equal(E.evaluateSheet(s, { today: TODAY })[3][0].v, 3);
});
check("removing a row: later references shift up, references to it become #REF!", () => {
  const s = E.resizeAxis(S([["1"], ["2"], ["3"], ["=A3"], ["=A2"]]), "row", 1, -1);
  assert.equal(s.rows, 4); assert.equal(s.d[2][0], "=A2"); assert.equal(s.d[3][0], "=#REF!");
});
check("removing a row inside a range shrinks it", () => assert.equal(E.resizeAxis(S([["1"], ["2"], ["3"], ["=SUM(A1:A3)"]]), "row", 1, -1).d[2][0], "=SUM(A1:A2)"));
check("inserting and removing a column move references, widths, formats and filters", () => {
  const s0 = S([["1", "2", "=A1+B1"]], { fmt: { "0,2": "percent" }, w: { 2: 150 }, filt: { 1: ["2"] } });
  const ins = E.resizeAxis(s0, "col", 1, +1);
  assert.equal(ins.d[0][3], "=A1+C1"); assert.equal(ins.fmt["0,3"], "percent"); assert.equal(ins.w[3], 150); assert.deepEqual(ins.filt[2], ["2"]);
  const del = E.resizeAxis(ins, "col", 1, -1);
  assert.equal(del.d[0][2], "=A1+B1"); assert.equal(del.fmt["0,2"], "percent");
});
check("the last row and the last column cannot be removed; the caps hold", () => {
  assert.equal(E.resizeAxis(S([["1"]]), "row", 0, -1), null); assert.equal(E.resizeAxis(S([["1"]]), "col", 0, -1), null);
  const full = E.newSheetState(E.SHEET_MAX_ROWS, 1); assert.equal(E.resizeAxis(full, "row", 1, +1), null);
  const wide = E.newSheetState(1, E.SHEET_MAX_COLS); assert.equal(E.resizeAxis(wide, "col", 1, +1), null);
});
check("merge keeps the top-left value and clears the rest; unmerge removes the merge", () => {
  const m = E.mergeBlock(S([["a", "b"], ["c", "d"]]), 0, 0, 1, 1);
  assert.deepEqual(m.d, [["a", ""], ["", ""]]); assert.deepEqual(m.merges, [[0, 0, 2, 2]]);
  assert.deepEqual(E.unmergeAt(m, 1, 1).merges, []); assert.equal(E.unmergeAt(S([["a"]]), 0, 0), null);
});
check("a new merge dissolves an overlapping one; a single cell cannot be merged", () => {
  const a = E.mergeBlock(S([["1", "2", "3"], ["4", "5", "6"]]), 0, 0, 0, 1), b = E.mergeBlock(a, 0, 1, 1, 2);
  assert.deepEqual(b.merges, [[0, 1, 2, 2]]); assert.equal(E.mergeBlock(S([["a"]]), 0, 0, 0, 0), null);
});
check("a merge follows an inserted row", () => assert.deepEqual(E.resizeAxis(S([["a", "b"], ["", ""], ["x", "y"]], { merges: [[1, 0, 2, 1]] }), "row", 0, +1).merges, [[2, 0, 2, 1]]));
check("Σ adds a real =SUM() under each column of the block, in the row below when it is empty", () => {
  const r = E.addTotals(S([["h1", "h2"], ["1", "2"], ["3", "4"], ["", ""]]), 1, 0, 2, 1);
  assert.equal(r.row, 3); assert.deepEqual(r.state.d[3], ["=SUM(A2:A3)", "=SUM(B2:B3)"]); assert.equal(r.state.rows, 4);
  assert.deepEqual(E.evaluateSheet(r.state, { today: TODAY })[3].map((x) => x.v), [4, 6]);
});
check("Σ inserts a new row when the row below is not empty (and refs below move)", () => {
  const r = E.addTotals(S([["1"], ["2"], ["9"], ["=A3"]], { hdr: false }), 0, 0, 1, 0);
  assert.equal(r.state.rows, 5); assert.equal(r.state.d[2][0], "=SUM(A1:A2)"); assert.equal(r.state.d[4][0], "=A4");
});
check("Σ skips a frozen header row inside the block", () => assert.equal(E.addTotals(S([["h"], ["1"], ["2"], [""]]), 0, 0, 2, 0).state.d[3][0], "=SUM(A2:A3)"));
check("the filter hides rows by COMPUTED value, not raw text; the header is never hidden", () => {
  const s = S([["h"], ["=1+1"], ["2"], ["3"]], { filt: { 0: ["2"] } });
  assert.deepEqual([...E.hiddenRows(s, { today: TODAY })], [1, 2]);
  assert.deepEqual(E.filterValues(s, 0, { today: TODAY }), ["2", "3"]);
  assert.deepEqual([...E.hiddenRows(S([["2"], ["2"]], { hdr: true, filt: { 0: ["2"] } }), { today: TODAY })], [1]);
});
check("the filter compares what is DISPLAYED (a formatted value)", () => {
  const s = S([["h"], ["0.5"], ["0.25"]], { fmt: { "1,0": "percent", "2,0": "percent" }, filt: { 0: ["50.00%"] } });
  assert.deepEqual([...E.hiddenRows(s, { today: TODAY })], [1]);
});
check("copy / paste text: a block round-trips as tab-separated text", () => {
  const tsv = E.blockToTsv(S([["a", "b", "c"], ["=A1", "2", "3"]]), 0, 1, 1, 2);
  assert.equal(tsv, "b\tc\n2\t3"); assert.deepEqual(E.tsvToBlock("x\ty\r\n1\t2\r\n"), [["x", "y"], ["1", "2"]]);
});

console.log("the strict schema (cleanSheetState)");
const dirty = (o) => E.cleanSheetState(JSON.stringify(o));
check("garbage is not a sheet", () => { for (const x of ["", "{", "[]", "null", "42", '{"d":5}', '{"d":[]}', '{"d":[[]]}']) assert.equal(E.cleanSheetState(x), null, x); });
check("the grid is bounded at 200 x 50", () => {
  const s = dirty({ rows: 9999, cols: 9999, d: [["x"]] });
  assert.equal(s.rows, 200); assert.equal(s.cols, 50); assert.equal(s.d.length, 200); assert.equal(s.d[0].length, 50);
});
check("cells are numbers, booleans or strings only; the rest become empty; text is capped and control characters go", () => {
  const s = dirty({ rows: 1, cols: 6, d: [[{ a: 1 }, [1], null, true, 5, "x".repeat(900) + "\n"]] });
  assert.deepEqual(s.d[0].slice(0, 5), ["", "", "", "true", "5"]); assert.equal(s.d[0][5].length, 500);
  assert.equal(dirty({ rows: 1, cols: 1, d: [["a\u0000b\nc"]] }).d[0][0], "a b c");
});
check("formats are a closed set; unknown names, bad keys and out-of-grid keys are dropped", () => {
  const s = dirty({ rows: 2, cols: 2, d: [["", ""], ["", ""]], fmt: { "0,0": "percent", "0,1": "<script>", "9,9": "number", "x": "date", "1,1": "general", "1,0": "date" } });
  assert.deepEqual(s.fmt, { "0,0": "percent", "1,0": "date" });
});
check("widths are clamped, filters and merges are validated, overlapping merges are dropped", () => {
  const s = dirty({ rows: 3, cols: 3, d: [[], [], []], w: { 0: 5, 1: 9999, 2: "wide", 7: 100 }, filt: { 0: ["a", 5, "a", "b"], 8: ["z"] }, merges: [[0, 0, 2, 2], [1, 1, 2, 2], [0, 0, 1, 1], [5, 5, 2, 2], ["a"]] });
  assert.deepEqual(s.w, { 0: 40, 1: 600 }); assert.deepEqual(s.filt, { 0: ["a", "b"] }); assert.deepEqual(s.merges, [[0, 0, 2, 2]]);
});
check("the currency symbol is short plain text with no markup, quotes or script scheme", () => {
  assert.equal(dirty({ rows: 1, cols: 1, d: [[""]], sym: "৳" }).sym, "৳");
  assert.equal(dirty({ rows: 1, cols: 1, d: [[""]], sym: "<b>$</b>" }).sym, "b$/b");
  assert.equal(dirty({ rows: 1, cols: 1, d: [[""]], sym: "javascript:alert(1)" }).sym.includes("javascript"), false);
});
check("extra fields are dropped, and the output is idempotent", () => {
  const s = dirty({ rows: 2, cols: 2, d: [["1", "=A1"], ["", ""]], evil: "<img onerror=x>", __proto__: { z: 1 }, hdr: false, td: 46000 });
  assert.deepEqual(Object.keys(s).sort(), ["cols", "d", "filt", "fmt", "hdr", "merges", "rows", "sym", "td", "v", "w"]);
  assert.equal(JSON.stringify(E.cleanSheetState(s)), JSON.stringify(s)); assert.equal(E.serializeSheetState(JSON.stringify(s)), JSON.stringify(s));
});
check("the stored text never holds a raw < or > (a cell with </script> cannot make a sanitiser drop the sheet), and reads back the same", () => {
  const s = S([["</script><b>", "a -->", "x]>"]], { hdr: false });
  const text = E.serializeSheetState(s);
  assert.ok(!/[<>]/.test(text)); assert.ok(text.includes("\\u003c/script\\u003e"));
  assert.deepEqual(E.cleanSheetState(text).d, s.d);
});
check("oversized JSON is refused outright", () => assert.equal(E.cleanSheetState("[" + "0,".repeat(E.SHEET_JSON_MAX) + "0]"), null));

console.log("the stored snapshot (sheetStaticHtml)");
check("it holds the computed values, with the header as <th>", () => {
  const h = E.sheetStaticHtml(S([["Item", "Cost"], ["Pen", "2"], ["Ink", "=B2*3"]]));
  assert.ok(h.startsWith('<table class="mm-sheet-static">')); assert.ok(h.includes("<th>Item</th>")); assert.ok(h.includes("<td>6</td>")); assert.ok(!h.replace(/<[^>]*>/g, "").includes("="));
});
check("every cell's text is escaped: nothing in a cell can become markup", () => {
  const h = E.sheetStaticHtml(S([["<img src=x onerror=alert(1)>", "\"><script>alert(1)</script>"], ["a&b", "x"]]));
  assert.ok(!/<img|<script/i.test(h)); assert.ok(h.includes("&lt;img src=x onerror=alert(1)&gt;")); assert.ok(h.includes("a&amp;b"));
});
check("merged cells carry rowspan / colspan and the covered cells are left out", () => {
  const h = E.sheetStaticHtml(S([["a", "", "c"], ["", "", "f"]], { merges: [[0, 0, 2, 2]], hdr: false }));
  assert.ok(h.includes('<td rowspan="2" colspan="2">a</td>')); assert.equal((h.match(/<td/g) || []).length, 3);
});
check("the snapshot shows every row, even those a filter hides (previews and search see all the data)", () => assert.equal((E.sheetStaticHtml(S([["h"], ["1"], ["2"]], { filt: { 0: ["1"] } })).match(/<t[dh]/g) || []).length, 3));
check("TODAY() in the snapshot reads the day stored in the state, so opening a Note never changes it", () => {
  const a = E.sheetStaticHtml(S([["=TODAY()"]], { td: 36526, fmt: { "0,0": "date" }, hdr: false }));
  assert.ok(a.includes("01/01/2000"));
});
check("an invalid state gives no table at all", () => assert.equal(E.sheetStaticHtml("nope"), ""));
check("formulas never reach eval(): the source has no eval, Function or import()", () => {
  const src = fs.readFileSync(path.join(root, "app/js/note-sheet-engine.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  assert.ok(!/\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(|\bimport\s*\(/.test(src));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
