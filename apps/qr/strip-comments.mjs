// Audit part 50, part 2 (PCF MSA J29): QR's first visit is bandwidth-bound (1288 KB at 1.6 Mbps, picker usable ~7.2 s), and about
// half of what it downloads is COMMENTS (gzipped, quranrevival.html's inline module is 317 KB with them and ~150 KB without; the 133
// preloaded modules 624 KB and ~300 KB). Run by after-build.mjs on the BUILT copy only, so the source keeps every comment and MSA's
// build stays byte for byte.
// Removes comments and nothing else. Every LINE stays where it was (the MSA Architect's condition, 24 Oct 2026: a student's stack
// trace and every file:line must point at the source's line): a comment becomes as many line breaks as it held, or one space if it
// held none and stood between two tokens. Spaces that end a line go; indentation stays; no line is joined. Strings, templates and
// regular expressions are copied as written, and so are pragma comments (/*! … */, //@ … , // @ … , //# … ).
// Checked token for token, line for line, by apps/qr/verify-strip.mjs in the build (a separately written tokenizer) and by
// tools/apps/qr-verify/strip-comments-check.mjs (TypeScript's own scanner).

const KEYWORD_BEFORE_REGEX = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);
const U = (a, b) => String.fromCharCode(a) + "-" + String.fromCharCode(b), LS = String.fromCharCode(0x2028, 0x2029); // (written as codes: an escaped
// line separator has been turned into the real character by an editor before, which ends the regex mid-line)
const ID = new RegExp("[\\w$" + U(0x80, 0xffff) + "]");
const LT = new RegExp("[\\n\\r" + LS + "]"); // the four line terminators
const PRAGMA_BLOCK = /^\/\*!/, PRAGMA_LINE = /^\/\/\s?[@#!]/;
const BREAKS = new RegExp("\\r\\n|[\\n\\r" + LS + "]", "g");
const breaks = (s) => s.match(BREAKS) || [];

// Strips the comments out of JavaScript source. Throws on an unterminated string, template, regex or comment.
export function stripJs(src) {
  let out = "", i = 0, sp = ""; // sp = horizontal whitespace seen since the last token, written only if a token follows on this line
  const n = src.length;
  // prev = the last significant token's kind: "id" (identifier, keyword, number, string, regex), "close" () ]), "brace" (}), "punct", ""
  let prev = "", prevWord = "";
  const braces = []; // for each open { : "tpl" when it is a template's ${, else "block"
  const emit = (t) => { out += sp + t; sp = ""; };
  const newline = (b) => { out += b; sp = ""; }; // a line break: the spaces before it go
  const template = () => { // from just after ` (or after the } closing a ${), to the closing ` or an opening ${
    while (i < n) {
      const c = src[i];
      if (c === "\\") { out += src.slice(i, i + 2); i += 2; continue; }
      if (c === "`") { out += c; i++; prev = "close"; return; }
      if (c === "$" && src[i + 1] === "{") { out += "${"; i += 2; braces.push("tpl"); prev = "punct"; return; }
      out += c; i++;
    }
    throw new Error("unterminated template literal");
  };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") {
      let j = i + 2; while (j < n && !LT.test(src[j])) j++;
      const text = src.slice(i, j);
      if (PRAGMA_LINE.test(text)) emit(text);
      i = j; continue; // its line break follows, as whitespace
    }
    if (c === "/" && d === "*") {
      const j = src.indexOf("*/", i + 2);
      if (j < 0) throw new Error("unterminated block comment");
      const text = src.slice(i, j + 2);
      if (PRAGMA_BLOCK.test(text)) emit(text);
      else { const b = breaks(text); if (b.length) b.forEach(newline); else if (!sp) sp = " "; }
      i = j + 2; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === "\\") j++; else if (src[j] === "\n") throw new Error("unterminated string"); j++; }
      if (j >= n) throw new Error("unterminated string");
      emit(src.slice(i, j + 1)); i = j + 1; prev = "id"; prevWord = ""; continue;
    }
    if (c === "`") { emit(c); i++; template(); continue; }
    if (c === "/") {
      const regex = prev === "" || prev === "punct" || prev === "brace" || (prev === "id" && KEYWORD_BEFORE_REGEX.has(prevWord));
      if (regex) {
        let j = i + 1, cls = false;
        while (j < n) {
          const r = src[j];
          if (r === "\\") { j += 2; continue; }
          if (LT.test(r)) throw new Error("unterminated regular expression");
          if (cls) { if (r === "]") cls = false; }
          else if (r === "[") cls = true;
          else if (r === "/") break;
          j++;
        }
        if (j >= n) throw new Error("unterminated regular expression");
        j++; while (j < n && ID.test(src[j])) j++; // flags
        emit(src.slice(i, j)); i = j; prev = "id"; prevWord = ""; continue;
      }
      emit(c); i++; prev = "punct"; continue;
    }
    if (c === "\r" && d === "\n") { newline("\r\n"); i += 2; continue; }
    if (LT.test(c)) { newline(c); i++; continue; }
    if (/\s/.test(c)) { sp += c; i++; continue; }
    if (ID.test(c)) {
      let j = i + 1; while (j < n && ID.test(src[j])) j++;
      prevWord = src.slice(i, j); emit(prevWord); i = j; prev = "id"; continue;
    }
    if (c === "{") { braces.push("block"); emit(c); i++; prev = "punct"; continue; }
    if (c === "}") {
      const top = braces.pop();
      emit(c); i++;
      if (top === "tpl") { template(); continue; }
      prev = "brace"; continue;
    }
    emit(c); i++;
    prev = c === ")" || c === "]" ? "close" : "punct";
  }
  if (braces.includes("tpl")) throw new Error("unterminated template substitution");
  return out;
}

// Strips the comments out of CSS: /* … */ outside strings, the same way (lines kept, /*! … */ kept).
export function stripCss(src) {
  let out = "", i = 0, sp = "";
  const n = src.length;
  const emit = (t) => { out += sp + t; sp = ""; };
  while (i < n) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "*") {
      const j = src.indexOf("*/", i + 2);
      if (j < 0) throw new Error("unterminated CSS comment");
      const text = src.slice(i, j + 2);
      if (PRAGMA_BLOCK.test(text)) emit(text);
      else { const b = breaks(text); if (b.length) b.forEach((x) => { out += x; sp = ""; }); else if (!sp) sp = " "; }
      i = j + 2; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === "\\") j++; j++; }
      if (j >= n) throw new Error("unterminated CSS string");
      emit(src.slice(i, j + 1)); i = j + 1; continue;
    }
    if (c === "\r" && src[i + 1] === "\n") { out += "\r\n"; sp = ""; i += 2; continue; }
    if (c === "\n" || c === "\r") { out += c; sp = ""; i++; continue; }
    if (/\s/.test(c)) { sp += c; i++; continue; }
    emit(c); i++;
  }
  return out;
}
