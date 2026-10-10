// A spreadsheet INSIDE a Note (note-pane Part C, round C2, item 44).
//
// PURE: no DOM, no Firebase, no imports. The sanitiser (note-sanitize.js), the
// grid (note-sheet-ui.js) and the Node suite (tools/i18n-verify/note-sheet-engine.mjs)
// all use this one file, so the three can never disagree about what a sheet is.
//
// A sheet is stored INSIDE the Note's own HTML:
//   <div class="mm-sheet" contenteditable="false" data-sheet="{state JSON}">
//     <table class="mm-sheet-static">…the values as last computed…</table></div>
// `cleanSheetState` is the strict schema every stored state passes through, and
// `sheetStaticHtml` is the ONLY thing that writes the snapshot -- from the clean
// state, never from markup somebody sent.
//
// FORMULAS ARE NEVER EVALUATED WITH eval() OR Function(): a tokenizer, a
// recursive-descent parser and a tree-walking evaluator, over a closed list of
// functions.

export const SHEET_MAX_ROWS = 200, SHEET_MAX_COLS = 50, SHEET_CELL_MAX = 500;
export const SHEET_MIN_WIDTH = 40, SHEET_MAX_WIDTH = 600, SHEET_SYMBOL_MAX = 4, SHEET_JSON_MAX = 600000;
export const SHEET_FORMATS = Object.freeze(["general", "number", "percent", "currency", "date"]);
export const SHEET_ERRORS = Object.freeze(["#DIV/0!", "#REF!", "#NAME?", "#VALUE!", "#CIRC!"]);

export const colName = (i) => { let s = "", n = i + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
export const colIndex = (letters) => { let n = 0; for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
export const cellName = (r, c) => colName(c) + (r + 1);

const clampInt = (x, lo, hi, dflt) => { const n = Math.trunc(Number(x)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; };
const cellText = (x) => String(x ?? "").replace(new RegExp("[\\u0000-\\u001f\\u007f\\u2028\\u2029]", "g"), " ").slice(0, SHEET_CELL_MAX);
/*  */

/** A fresh sheet: 5 rows by 4 columns, header row frozen. */
export function newSheetState(rows = 5, cols = 4) {
  return { v: 1, rows, cols, d: Array.from({ length: rows }, () => Array(cols).fill("")), fmt: {}, w: {}, merges: [], hdr: true, filt: {}, sym: "" };
}

/**
 * The strict schema. Takes a JSON string (or an object) and returns a CLEAN state, or null when it cannot be
 * a sheet at all. Numbers, booleans and strings only; cell text length-capped; the grid bounded; the format
 * names a closed set. Everything else is dropped and the output is rebuilt field by field, so the same input
 * always serialises to the same text (the sanitiser is idempotent).
 */
export function cleanSheetState(raw) {
  let o = raw;
  if (typeof raw === "string") {
    if (raw.length > SHEET_JSON_MAX) return null;
    try { o = JSON.parse(raw); } catch { return null; }
  }
  if (!o || typeof o !== "object" || Array.isArray(o) || !Array.isArray(o.d)) return null;
  const wantRows = Math.trunc(Number(o.rows ?? o.d.length)), wantCols = Math.trunc(Number(o.cols ?? (Array.isArray(o.d[0]) ? o.d[0].length : 0)));
  if (!(wantRows >= 1) || !(wantCols >= 1)) return null;
  const rows = clampInt(wantRows, 1, SHEET_MAX_ROWS, 1), cols = clampInt(wantCols, 1, SHEET_MAX_COLS, 1);
  const d = [];
  for (let r = 0; r < rows; r++) {
    const src = Array.isArray(o.d[r]) ? o.d[r] : [], row = [];
    for (let c = 0; c < cols; c++) { const x = src[c]; row.push(typeof x === "string" || typeof x === "number" || typeof x === "boolean" ? cellText(x) : ""); }
    d.push(row);
  }
  const own = (obj) => (obj && typeof obj === "object" && !Array.isArray(obj) ? Object.keys(obj) : []);
  const fmt = {};
  for (const k of own(o.fmt).sort()) {
    const m = /^(\d{1,3}),(\d{1,2})$/.exec(k);
    if (m && Number(m[1]) < rows && Number(m[2]) < cols && SHEET_FORMATS.includes(o.fmt[k]) && o.fmt[k] !== "general") fmt[`${Number(m[1])},${Number(m[2])}`] = o.fmt[k];
  }
  const w = {};
  for (const k of own(o.w).sort((a, b) => a - b)) {
    if (/^\d{1,2}$/.test(k) && Number(k) < cols && typeof o.w[k] === "number" && Number.isFinite(o.w[k])) w[String(Number(k))] = clampInt(o.w[k], SHEET_MIN_WIDTH, SHEET_MAX_WIDTH, 100);
  }
  const taken = new Set(), merges = [];
  for (const m of Array.isArray(o.merges) ? o.merges.slice(0, 500) : []) {
    if (!Array.isArray(m) || m.length !== 4 || !m.every((n) => typeof n === "number" && Number.isInteger(n))) continue;
    const [r, c, rs, cs] = m;
    if (r < 0 || c < 0 || rs < 1 || cs < 1 || rs * cs < 2 || r + rs > rows || c + cs > cols) continue;
    const cellsOf = []; for (let i = r; i < r + rs; i++) for (let j = c; j < c + cs; j++) cellsOf.push(`${i},${j}`);
    if (cellsOf.some((k) => taken.has(k))) continue;
    cellsOf.forEach((k) => taken.add(k)); merges.push([r, c, rs, cs]);
  }
  merges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const filt = {};
  for (const k of own(o.filt).sort((a, b) => a - b)) {
    if (!/^\d{1,2}$/.test(k) || Number(k) >= cols || !Array.isArray(o.filt[k])) continue;
    const list = [...new Set(o.filt[k].filter((x) => typeof x === "string").map(cellText))].slice(0, 300);
    if (list.length) filt[String(Number(k))] = list;
  }
  const sym = typeof o.sym === "string" ? o.sym.replace(/[<>"'&\\\u0000-\u001f\u007f]/g, "").replace(/(?:javascript|vbscript|data)\s*:/gi, "").trim().slice(0, SHEET_SYMBOL_MAX) : "";
  const out = { v: 1, rows, cols, d, fmt, w, merges, hdr: o.hdr !== false, filt, sym };
  if (typeof o.td === "number" && Number.isInteger(o.td) && o.td > 0 && o.td < 3000000) out.td = o.td;
  return out;
}
/** The text stored in `data-sheet`. `<` and `>` are written as JSON escapes, so a cell holding "</script>" can never trip an HTML sanitiser into dropping the whole attribute (and with it the sheet). */
export const serializeSheetState = (state) => JSON.stringify(cleanSheetState(state)).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

// ---------------------------------------------------------------- references

const REF = String.raw`(\$?)([A-Za-z]{1,2})(\$?)(\d{1,4})`;
const REF_ONE = new RegExp(`^${REF}$`);
const REF_SCAN = new RegExp(String.raw`(?<![A-Za-z0-9_.$])${REF}(?::${REF})?(?![A-Za-z0-9_(])`, "g");

/** Run `fn` over every cell reference (or A1:B2 range) in a formula, never inside a "string". */
function mapRefs(formula, fn) {
  const parts = String(formula).split(/("(?:[^"]|"")*")/);
  return parts.map((p, i) => (i % 2 ? p : p.replace(REF_SCAN, (m, ad1, l1, ar1, n1, ad2, l2, ar2, n2) => {
    const a = { abs_c: !!ad1, c: colIndex(l1), abs_r: !!ar1, r: Number(n1) - 1 };
    const b = l2 ? { abs_c: !!ad2, c: colIndex(l2), abs_r: !!ar2, r: Number(n2) - 1 } : null;
    return fn(a, b, m);
  }))).join("");
}
const refText = (p) => `${p.abs_c ? "$" : ""}${colName(p.c)}${p.abs_r ? "$" : ""}${p.r + 1}`;

/** Copy a formula `dr` rows and `dc` columns: relative references move, $absolute ones stay. Off the grid: #REF!. */
export function shiftFormula(formula, dr, dc) {
  if (typeof formula !== "string" || !formula.startsWith("=")) return formula;
  return mapRefs(formula, (a, b) => {
    const mv = (p) => ({ ...p, c: p.abs_c ? p.c : p.c + dc, r: p.abs_r ? p.r : p.r + dr });
    const x = mv(a), y = b ? mv(b) : null;
    const bad = (p) => p.c < 0 || p.r < 0 || p.c >= SHEET_MAX_COLS || p.r >= SHEET_MAX_ROWS;
    if (bad(x) || (y && bad(y))) return "#REF!";
    return y ? `${refText(x)}:${refText(y)}` : refText(x);
  });
}

/** After a row or column is inserted (delta +1) or removed (delta -1) at index `at`, point every reference at the same cells. */
export function adjustFormula(formula, axis, at, delta) {
  if (typeof formula !== "string" || !formula.startsWith("=")) return formula;
  const key = axis === "row" ? "r" : "c";
  return mapRefs(formula, (a, b) => {
    const one = (p) => {
      if (delta > 0) return p[key] >= at ? { ...p, [key]: p[key] + 1 } : p;
      if (p[key] === at) return null;
      return p[key] > at ? { ...p, [key]: p[key] - 1 } : p;
    };
    if (!b) { const x = one(a); return x ? refText(x) : "#REF!"; }
    if (delta > 0) return `${refText(one(a))}:${refText(one(b))}`;
    const lo = Math.min(a[key], b[key]), hi = Math.max(a[key], b[key]);
    if (lo === at && hi === at) return "#REF!";
    const shrink = (p) => (p[key] > at ? { ...p, [key]: p[key] - 1 } : p);
    const x = a[key] === at ? (a[key] <= b[key] ? a : shrink(a)) : shrink(a);
    const y = b[key] === at ? (b[key] >= a[key] ? { ...b, [key]: b[key] - 1 } : b) : shrink(b);
    return `${refText(x)}:${refText(y)}`;
  });
}

// ---------------------------------------------------------------- tokenizer + parser

class SheetError extends Error { constructor(code) { super(code); this.code = code; } }
const fail = (code) => { throw new SheetError(code); };

function tokenize(src) {
  const toks = []; let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    let m;
    if (ch === '"') {
      let j = i + 1, s = "";
      for (;;) {
        if (j >= src.length) fail("#VALUE!");
        if (src[j] === '"') { if (src[j + 1] === '"') { s += '"'; j += 2; continue; } break; }
        s += src[j++];
      }
      toks.push({ t: "str", v: s }); i = j + 1; continue;
    }
    if ((m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(src.slice(i)))) { toks.push({ t: "num", v: Number(m[0]) }); i += m[0].length; continue; }
    if ((m = new RegExp(`^${REF}(?![A-Za-z0-9_(])`).exec(src.slice(i)))) { toks.push({ t: "ref", c: colIndex(m[2]), r: Number(m[4]) - 1 }); i += m[0].length; continue; }
    if ((m = /^([A-Za-z][A-Za-z0-9_.]*)\s*\(/.exec(src.slice(i)))) { toks.push({ t: "fn", v: m[1].toUpperCase() }); i += m[0].length; continue; }
    if ((m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i)))) { toks.push({ t: "name", v: m[0].toUpperCase() }); i += m[0].length; continue; }
    if ((m = /^(?:<=|>=|<>|[-+*/^&%=<>(),:])/.exec(src.slice(i)))) { toks.push({ t: "op", v: m[0] }); i += m[0].length; continue; }
    fail("#VALUE!");
  }
  return toks;
}

const parseCache = new Map();
function parseFormula(src) {
  if (parseCache.has(src)) { const hit = parseCache.get(src); if (hit.err) throw new SheetError(hit.err); return hit.ast; }
  let ast, err = null;
  try {
    const toks = tokenize(src); let p = 0;
    const peek = () => toks[p], isOp = (v) => toks[p]?.t === "op" && toks[p].v === v;
    const eat = (v) => { if (!isOp(v)) fail("#VALUE!"); p++; };
    const bin = (next, ops) => () => { let l = next(); while (peek()?.t === "op" && ops.includes(peek().v)) { const op = toks[p++].v; l = { k: "bin", op, l, r: next() }; } return l; };
    let expr;
    const primary = () => {
      const t = toks[p++];
      if (!t) fail("#VALUE!");
      if (t.t === "num") return { k: "lit", v: t.v };
      if (t.t === "str") return { k: "lit", v: t.v };
      if (t.t === "name") { if (t.v === "TRUE") return { k: "lit", v: true }; if (t.v === "FALSE") return { k: "lit", v: false }; return { k: "name" }; }
      if (t.t === "ref") {
        if (isOp(":")) { p++; const u = toks[p++]; if (!u || u.t !== "ref") fail("#VALUE!"); return { k: "range", r1: Math.min(t.r, u.r), r2: Math.max(t.r, u.r), c1: Math.min(t.c, u.c), c2: Math.max(t.c, u.c) }; }
        return { k: "ref", r: t.r, c: t.c };
      }
      if (t.t === "fn") {
        const args = [];
        if (!isOp(")")) { for (;;) { args.push(expr()); if (isOp(",")) { p++; continue; } break; } }
        eat(")");
        return { k: "fn", name: t.v, args };
      }
      if (t.t === "op" && t.v === "(") { const e = expr(); eat(")"); return e; }
      return fail("#VALUE!");
    };
    const postfix = () => { let e = primary(); while (isOp("%")) { p++; e = { k: "pct", e }; } return e; };
    const unary = () => { if (isOp("-")) { p++; return { k: "neg", e: unary() }; } if (isOp("+")) { p++; return unary(); } return postfix(); };
    const pow = bin(unary, ["^"]), mul = bin(pow, ["*", "/"]), add = bin(mul, ["+", "-"]), cat = bin(add, ["&"]);
    expr = bin(cat, ["=", "<>", "<", ">", "<=", ">="]);
    ast = expr();
    if (p < toks.length) fail("#VALUE!");
  } catch (e) { if (!(e instanceof SheetError)) throw e; err = e.code; }
  if (parseCache.size > 2000) parseCache.clear();
  parseCache.set(src, { ast, err });
  if (err) throw new SheetError(err);
  return ast;
}

// ---------------------------------------------------------------- evaluation

const NUM_RE = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;
/** What typed text means: a number, or text. (A leading `=` is a formula and is handled by the evaluator.) */
export function parseCellInput(text) {
  const s = String(text ?? "").trim();
  if (s === "") return null;
  if (NUM_RE.test(s)) return Number(s);
  return String(text);
}
export const todaySerial = (now = new Date()) => { const d = new Date(now); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000) + 25569; };
const serialToParts = (n) => { const d = new Date(Math.floor(n - 25569) * 86400000); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };
const pad = (n, w = 2) => String(n).padStart(w, "0");

const toNum = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const s = String(v).trim();
  if (NUM_RE.test(s)) return Number(s);
  return fail("#VALUE!");
};
const toBool = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (v === null || v === "") return false;
  const s = String(v).toUpperCase();
  if (s === "TRUE") return true; if (s === "FALSE") return false;
  return fail("#VALUE!");
};
const fixFloat = (n) => (Number.isInteger(n) ? n : Number(n.toPrecision(15)));
export function formatGeneral(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(12)));
  return String(v);
}
const toStr = (v) => formatGeneral(v);
const typeRank = (v) => (typeof v === "number" || v === null ? 0 : typeof v === "string" ? 1 : 2);
function compare(a, b) {
  if (a === null) a = typeof b === "string" ? "" : typeof b === "boolean" ? false : 0;
  if (b === null) b = typeof a === "string" ? "" : typeof a === "boolean" ? false : 0;
  const ra = typeRank(a), rb = typeRank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 1) { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
  return a < b ? -1 : a > b ? 1 : 0;
}
const roundHalfAway = (x, d) => { const k = 10 ** d, s = Math.sign(x), v = Math.abs(x) * k; return s * Math.round(Number(v.toPrecision(15))) / k; };

/**
 * Evaluate the whole sheet. Returns `grid[r][c] = { v, err, text }`: `v` the value (number, string, boolean or
 * null), `err` one of SHEET_ERRORS or null, `text` the displayed string after the cell's number format.
 * `opts.today` is a spreadsheet serial day (what TODAY() returns); the default is the real date.
 */
export function evaluateSheet(state, opts = {}) {
  const s = cleanSheetState(state) ?? fail("#VALUE!");
  const today = opts.today ?? todaySerial();
  const memo = new Map(), visiting = new Set();
  const cellErr = (r, c) => { const e = evalCell(r, c); if (e.err) fail(e.err); return e.v; };
  function evalCell(r, c) {
    const key = r * 100 + c;
    if (memo.has(key)) return memo.get(key);
    if (visiting.has(key)) return { v: null, err: "#CIRC!" };
    visiting.add(key);
    let res;
    try {
      const raw = s.d[r][c];
      if (typeof raw === "string" && raw.trimStart().startsWith("=")) {
        const ast = parseFormula(raw.trimStart().slice(1));
        let v = run(ast);
        if (Array.isArray(v)) v = v[0]?.[0] ?? null;
        if (typeof v === "number" && !Number.isFinite(v)) fail("#VALUE!");
        res = { v, err: null };
      } else res = { v: parseCellInput(raw), err: null };
    } catch (e) {
      if (e instanceof SheetError) res = { v: null, err: e.code };
      else if (e instanceof RangeError) res = { v: null, err: "#VALUE!" };
      else throw e;
    }
    visiting.delete(key);
    // a cycle's inner cells are answered while the outer one is still open: they are not cached as final
    memo.set(key, res);
    return res;
  }
  const scalar = (v) => (Array.isArray(v) ? (v.length === 1 && v[0].length === 1 ? v[0][0] : fail("#VALUE!")) : v);
  const rangeVals = (n) => {
    if (n.r2 >= s.rows || n.c2 >= s.cols) fail("#REF!");
    const out = [];
    for (let r = n.r1; r <= n.r2; r++) { const row = []; for (let c = n.c1; c <= n.c2; c++) row.push(cellErr(r, c)); out.push(row); }
    return out;
  };
  /** every argument flattened: [{ v, direct }] (range members are not "direct": text in a range is ignored by SUM) */
  const flat = (args) => args.flatMap((a) => { const v = run(a); return Array.isArray(v) ? v.flat().map((x) => ({ v: x, direct: false })) : [{ v, direct: true }]; });
  const numbers = (args) => flat(args).filter((x) => (x.direct ? true : typeof x.v === "number")).map((x) => toNum(x.v));
  const FN = {
    SUM: (a) => numbers(a).reduce((x, y) => x + y, 0),
    AVERAGE: (a) => { const n = numbers(a); if (!n.length) fail("#DIV/0!"); return n.reduce((x, y) => x + y, 0) / n.length; },
    MIN: (a) => { const n = numbers(a); return n.length ? Math.min(...n) : 0; },
    MAX: (a) => { const n = numbers(a); return n.length ? Math.max(...n) : 0; },
    COUNT: (a) => flat(a).filter((x) => typeof x.v === "number" || (x.direct && x.v !== null && x.v !== "" && NUM_RE.test(String(x.v).trim()))).length,
    COUNTA: (a) => flat(a).filter((x) => x.v !== null && x.v !== "").length,
    ROUND: (a) => { if (a.length < 1 || a.length > 2) fail("#VALUE!"); return roundHalfAway(toNum(scalar(run(a[0]))), a[1] ? Math.trunc(toNum(scalar(run(a[1])))) : 0); },
    ABS: (a) => { if (a.length !== 1) fail("#VALUE!"); return Math.abs(toNum(scalar(run(a[0])))); },
    AND: (a) => { const b = flat(a).filter((x) => x.v !== null && x.v !== "").map((x) => toBool(x.v)); if (!b.length) fail("#VALUE!"); return b.every(Boolean); },
    OR: (a) => { const b = flat(a).filter((x) => x.v !== null && x.v !== "").map((x) => toBool(x.v)); if (!b.length) fail("#VALUE!"); return b.some(Boolean); },
    NOT: (a) => { if (a.length !== 1) fail("#VALUE!"); return !toBool(scalar(run(a[0]))); },
    CONCAT: (a) => flat(a).map((x) => toStr(x.v)).join(""),
    LEN: (a) => { if (a.length !== 1) fail("#VALUE!"); return toStr(scalar(run(a[0]))).length; },
    UPPER: (a) => { if (a.length !== 1) fail("#VALUE!"); return toStr(scalar(run(a[0]))).toUpperCase(); },
    LOWER: (a) => { if (a.length !== 1) fail("#VALUE!"); return toStr(scalar(run(a[0]))).toLowerCase(); },
    TODAY: (a) => { if (a.length) fail("#VALUE!"); return today; },
    DATE: (a) => { if (a.length !== 3) fail("#VALUE!"); const [y, m, d] = a.map((x) => Math.trunc(toNum(scalar(run(x))))); return Math.round(Date.UTC(y, m - 1, d) / 86400000) + 25569; },
  };
  function run(n) {
    switch (n.k) {
      case "lit": return n.v;
      case "name": return fail("#NAME?");
      case "ref": if (n.r >= s.rows || n.c >= s.cols) fail("#REF!"); return cellErr(n.r, n.c);
      case "range": return rangeVals(n);
      case "neg": return -toNum(scalar(run(n.e)));
      case "pct": return toNum(scalar(run(n.e))) / 100;
      case "fn": {
        if (n.name === "IF") {
          if (n.args.length < 2 || n.args.length > 3) fail("#VALUE!");
          return toBool(scalar(run(n.args[0]))) ? run(n.args[1]) : (n.args[2] ? run(n.args[2]) : false);
        }
        if (n.name === "IFERROR") {
          if (n.args.length !== 2) fail("#VALUE!");
          try { return run(n.args[0]); } catch (e) { if (e instanceof SheetError) return run(n.args[1]); throw e; }
        }
        const f = FN[n.name];
        if (!f) fail("#NAME?");
        return f(n.args);
      }
      case "bin": {
        const a = scalar(run(n.l)), b = scalar(run(n.r));
        switch (n.op) {
          case "+": return fixFloat(toNum(a) + toNum(b));
          case "-": return fixFloat(toNum(a) - toNum(b));
          case "*": return fixFloat(toNum(a) * toNum(b));
          case "/": { const d = toNum(b); if (d === 0) fail("#DIV/0!"); return fixFloat(toNum(a) / d); }
          case "^": { const x = Math.pow(toNum(a), toNum(b)); if (!Number.isFinite(x)) fail("#VALUE!"); return fixFloat(x); }
          case "&": return toStr(a) + toStr(b);
          case "=": return compare(a, b) === 0;
          case "<>": return compare(a, b) !== 0;
          case "<": return compare(a, b) < 0;
          case ">": return compare(a, b) > 0;
          case "<=": return compare(a, b) <= 0;
          default: return compare(a, b) >= 0;
        }
      }
      default: return fail("#VALUE!");
    }
  }
  const grid = [];
  for (let r = 0; r < s.rows; r++) {
    const row = [];
    for (let c = 0; c < s.cols; c++) {
      const e = evalCell(r, c);
      row.push({ v: e.v, err: e.err, text: e.err ?? formatValue(e.v, s.fmt[`${r},${c}`] ?? "general", s.sym) });
    }
    grid.push(row);
  }
  return grid;
}

/** A value in one of the closed set of formats. Text and empty cells are never reformatted. */
export function formatValue(v, format = "general", sym = "") {
  if (typeof v !== "number") return formatGeneral(v);
  switch (format) {
    case "number": return roundHalfAway(v, 2).toFixed(2).replace(/^-0\.00$/, "0.00");
    case "percent": return `${roundHalfAway(v * 100, 2).toFixed(2)}%`;
    case "currency": { const x = roundHalfAway(Math.abs(v), 2).toFixed(2); return `${v < 0 && Number(x) !== 0 ? "-" : ""}${sym}${x}`; }
    case "date": { const p = serialToParts(v); return `${pad(p.d)}/${pad(p.m)}/${pad(p.y, 4)}`; }
    default: return formatGeneral(v);
  }
}

// ---------------------------------------------------------------- editing operations (all pure: they return new state)

const copyState = (s) => JSON.parse(JSON.stringify(s));
export const isFormula = (x) => typeof x === "string" && x.trimStart().startsWith("=");
const blank = (x) => x === "" || x === null || x === undefined;

/** Fill a block downward or rightward from its leading filled cells: numbers (two or more) continue the series, a lone number or text repeats, formulas shift. */
export function fillBlock(state, r1, c1, r2, c2, dir) {
  const s = copyState(cleanSheetState(state));
  const down = dir === "down", lines = down ? c2 - c1 + 1 : r2 - r1 + 1, len = down ? r2 - r1 + 1 : c2 - c1 + 1;
  const at = (line, i) => (down ? [r1 + i, c1 + line] : [r1 + line, c1 + i]);
  let filled = 0;
  for (let line = 0; line < lines; line++) {
    let k = 0;
    while (k < len) { const [r, c] = at(line, k); if (blank(s.d[r][c])) break; k++; }
    if (k === 0 || k === len) continue;
    const seeds = Array.from({ length: k }, (_, i) => { const [r, c] = at(line, i); return s.d[r][c]; });
    const seedNums = seeds.map((x) => (isFormula(x) ? NaN : parseCellInput(x)));
    const series = k >= 2 && seedNums.every((x) => typeof x === "number");
    const step = series ? seedNums[k - 1] - seedNums[k - 2] : 0;
    for (let i = k; i < len; i++) {
      const [r, c] = at(line, i), si = i % k, [sr, sc] = at(line, si), dist = i - si;
      s.d[r][c] = series ? String(fixFloat(seedNums[k - 1] + step * (i - k + 1))) : shiftFormula(seeds[si], down ? dist : 0, down ? 0 : dist);
      if (s.fmt[`${sr},${sc}`]) s.fmt[`${r},${c}`] = s.fmt[`${sr},${sc}`]; else delete s.fmt[`${r},${c}`];
      filled++;
    }
  }
  return { state: cleanSheetState(s), filled };
}

/** Sort the data rows (not a frozen header) by one column's COMPUTED value; formulas move with their row, relative references shifting as a copy does. */
export function sortRows(state, col, desc = false, opts = {}) {
  const s = copyState(cleanSheetState(state)), grid = evaluateSheet(s, opts);
  const start = s.hdr ? 1 : 0;
  if (s.merges.some(([r, , rs]) => r + rs > start)) return { state: null, error: "merged" };
  if (col < 0 || col >= s.cols || s.rows - start < 2) return { state: cleanSheetState(s), error: null };
  const order = Array.from({ length: s.rows - start }, (_, i) => i + start);
  const key = (r) => grid[r][col].err ? { e: 1, v: "" } : { e: 0, v: grid[r][col].v };
  order.sort((a, b) => {
    const x = key(a), y = key(b);
    if (x.e !== y.e) return x.e - y.e; // errors last, whichever way
    const emptyX = x.v === null || x.v === "", emptyY = y.v === null || y.v === "";
    if (emptyX !== emptyY) return emptyX ? 1 : -1; // empty last, whichever way
    const c = compare(x.v, y.v);
    return (desc ? -c : c) || a - b;
  });
  const oldD = s.d.map((r) => r.slice()), oldF = { ...s.fmt };
  for (let i = 0; i < order.length; i++) {
    const to = start + i, from = order[i];
    for (let c = 0; c < s.cols; c++) {
      s.d[to][c] = shiftFormula(oldD[from][c], to - from, 0);
      if (oldF[`${from},${c}`]) s.fmt[`${to},${c}`] = oldF[`${from},${c}`]; else delete s.fmt[`${to},${c}`];
    }
  }
  return { state: cleanSheetState(s), error: null };
}

/** Insert (delta +1) or remove (delta -1) a row or column at `at`. References, formats, merges, widths and filters follow. Never goes under 1 row / 1 column or over the cap. */
export function resizeAxis(state, axis, at, delta) {
  const s = copyState(cleanSheetState(state)), row = axis === "row";
  const n = row ? s.rows : s.cols, max = row ? SHEET_MAX_ROWS : SHEET_MAX_COLS;
  if (at < 0 || at > n || (delta > 0 && n >= max) || (delta < 0 && (n <= 1 || at >= n))) return null;
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) s.d[r][c] = adjustFormula(s.d[r][c], axis, at, delta);
  const moveKey = (r, c) => {
    const x = row ? r : c;
    if (delta > 0) return x >= at ? x + 1 : x;
    return x === at ? -1 : x > at ? x - 1 : x;
  };
  const fmt = {};
  for (const k of Object.keys(s.fmt)) { const [r, c] = k.split(",").map(Number), x = moveKey(r, c); if (x < 0) continue; fmt[row ? `${x},${c}` : `${r},${x}`] = s.fmt[k]; }
  s.fmt = fmt;
  if (delta > 0) {
    if (row) s.d.splice(at, 0, Array(s.cols).fill("")); else for (const r of s.d) r.splice(at, 0, "");
  } else if (row) s.d.splice(at, 1); else for (const r of s.d) r.splice(at, 1);
  if (row) s.rows += delta; else s.cols += delta;
  s.merges = s.merges.map(([r, c, rs, cs]) => {
    const p = row ? [r, rs] : [c, cs];
    let [a, len] = p;
    if (delta > 0) { if (at <= a) a += 1; else if (at < a + len) len += 1; }
    else if (at < a) a -= 1; else if (at < a + len) len -= 1;
    return row ? [a, c, len, cs] : [r, a, rs, len];
  }).filter(([, , rs, cs]) => rs * cs >= 2);
  if (!row) {
    const w = {}, filt = {};
    for (const k of Object.keys(s.w)) { const x = moveKey(0, Number(k)); if (x >= 0) w[x] = s.w[k]; }
    for (const k of Object.keys(s.filt)) { const x = moveKey(0, Number(k)); if (x >= 0) filt[x] = s.filt[k]; }
    s.w = w; s.filt = filt;
  }
  return cleanSheetState(s);
}

/** Merge a block (Excel's rule: the top-left value is kept, the rest is cleared). Overlapping merges are dissolved first. */
export function mergeBlock(state, r1, c1, r2, c2) {
  const s = copyState(cleanSheetState(state));
  if (r1 === r2 && c1 === c2) return null;
  s.merges = s.merges.filter(([r, c, rs, cs]) => r + rs - 1 < r1 || r > r2 || c + cs - 1 < c1 || c > c2);
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (r !== r1 || c !== c1) { s.d[r][c] = ""; delete s.fmt[`${r},${c}`]; }
  s.merges.push([r1, c1, r2 - r1 + 1, c2 - c1 + 1]);
  return cleanSheetState(s);
}
export function unmergeAt(state, r, c) {
  const s = copyState(cleanSheetState(state)), n = s.merges.length;
  s.merges = s.merges.filter(([mr, mc, rs, cs]) => !(r >= mr && r < mr + rs && c >= mc && c < mc + cs));
  return s.merges.length === n ? null : cleanSheetState(s);
}
export const mergeAt = (state, r, c) => state.merges.find(([mr, mc, rs, cs]) => r >= mr && r < mr + rs && c >= mc && c < mc + cs) ?? null;

/** Σ: a real =SUM() under each column of the block, in the row below it (a new row when that one is not empty). */
export function addTotals(state, r1, c1, r2, c2) {
  let s = cleanSheetState(state);
  if (s.hdr && r1 === 0 && r2 > 0) r1 = 1;
  const below = r2 + 1;
  const free = below < s.rows && s.d[below].slice(c1, c2 + 1).every(blank);
  if (!free) { const g = resizeAxis(s, "row", below, +1); if (!g) return null; s = g; }
  s = copyState(s);
  for (let c = c1; c <= c2; c++) s.d[below][c] = `=SUM(${cellName(r1, c)}:${cellName(r2, c)})`;
  return { state: cleanSheetState(s), row: below };
}

/** The values a column's filter list offers: each distinct DISPLAYED value of the data rows. */
export function filterValues(state, col, opts = {}) {
  const s = cleanSheetState(state), grid = evaluateSheet(s, opts);
  const out = [];
  for (let r = s.hdr ? 1 : 0; r < s.rows; r++) { const t = grid[r][col].text; if (!out.includes(t)) out.push(t); }
  return out;
}
/** Rows a filter hides, decided by COMPUTED (displayed) values, never raw text. The frozen header row is never hidden. */
export function hiddenRows(state, opts = {}) {
  const s = cleanSheetState(state), cols = Object.keys(s.filt);
  if (!cols.length) return new Set();
  const grid = evaluateSheet(s, opts), hide = new Set();
  for (let r = s.hdr ? 1 : 0; r < s.rows; r++) for (const c of cols) if (s.filt[c].includes(grid[r][Number(c)].text)) hide.add(r);
  return hide;
}

/** Tab-separated text of a block (what Ctrl+C puts on the clipboard) -- RAW cell text, so a copied formula is still a formula. */
export const blockToTsv = (state, r1, c1, r2, c2) => { const rows = []; for (let r = r1; r <= r2; r++) rows.push(state.d[r].slice(c1, c2 + 1).join("\t")); return rows.join("\n"); };
export const tsvToBlock = (text) => String(text ?? "").replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n").map((l) => l.split("\t").map(cellText));

// ---------------------------------------------------------------- the stored snapshot

const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/**
 * The static table stored beside the state: every value as last computed (TODAY() reads the state's own stored
 * day, so opening a Note never changes it). All text is escaped here; nothing in a cell can become markup.
 */
export function sheetStaticHtml(state) {
  const s = cleanSheetState(state);
  if (!s) return "";
  const grid = evaluateSheet(s, { today: s.td });
  const covered = new Set(), spans = new Map();
  for (const [r, c, rs, cs] of s.merges) { spans.set(`${r},${c}`, [rs, cs]); for (let i = r; i < r + rs; i++) for (let j = c; j < c + cs; j++) if (i !== r || j !== c) covered.add(`${i},${j}`); }
  let html = '<table class="mm-sheet-static"><tbody>';
  for (let r = 0; r < s.rows; r++) {
    html += "<tr>";
    for (let c = 0; c < s.cols; c++) {
      if (covered.has(`${r},${c}`)) continue;
      const tag = s.hdr && r === 0 ? "th" : "td", sp = spans.get(`${r},${c}`);
      html += `<${tag}${sp && sp[0] > 1 ? ` rowspan="${sp[0]}"` : ""}${sp && sp[1] > 1 ? ` colspan="${sp[1]}"` : ""}>${esc(grid[r][c].text)}</${tag}>`;
    }
    html += "</tr>";
  }
  return `${html}</tbody></table>`;
}
