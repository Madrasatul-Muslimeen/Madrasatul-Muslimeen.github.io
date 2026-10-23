// Audit part 50, part 2 (PCF MSA J29): QR's first visit is bandwidth-bound (1288 KB at 1.6 Mbps, picker usable ~7.2 s), and about
// half of what it downloads is COMMENTS: gzipped, quranrevival.html's inline module is 327 KB with them and 163 KB without, its <style>
// 122 KB and 44 KB. Run by after-build.mjs on the BUILT copy only, so the source keeps every comment and MSA's build stays byte for byte.
// Removes comments and nothing else: every other character of code, string, template and regex is kept as written (no transpiling,
// no renaming, no import elision). A comment that held a line break leaves one line break (so automatic semicolon insertion is
// unchanged); any other comment leaves one space. Outside strings, templates and regexes, a run of whitespace (with any comments in
// it) becomes one line break if it held one, else one space: so blank lines and indentation go, and a line break never does.
// Proven token for token against TypeScript's own scanner by tools/apps/qr-verify/strip-comments-check.mjs.

const KEYWORD_BEFORE_REGEX = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);
const ID = /[\w$\u0080-\uffff]/;
const LT = /[\n\r\u2028\u2029]/; // the four line terminators

// Strips the comments out of JavaScript source. Throws on an unterminated string, template, regex or comment.
export function stripJs(src) {
  let out = "", i = 0;
  const n = src.length;
  // prev = the last significant token's kind: "id" (identifier, keyword, number), "close" () or ]), "brace" (}), "punct", or "" (start)
  let prev = "", prevWord = "";
  const braces = []; // for each open { : "tpl" when it is a template's ${, else "block"
  let ws = ""; // pending whitespace: "\n", " " or ""
  const gap = (g) => { if (LT.test(g)) ws = "\n"; else if (!ws) ws = " "; };
  const emit = (t) => { if (ws && out) out += ws; ws = ""; out += t; };
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
      if (!ws) ws = " "; i = j; continue; // the line break itself follows, as whitespace
    }
    if (c === "/" && d === "*") {
      const j = src.indexOf("*/", i + 2);
      if (j < 0) throw new Error("unterminated block comment");
      gap(src.slice(i, j)); i = j + 2; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === "\\") j++; else if (src[j] === "\n") throw new Error("unterminated string"); j++; }
      if (j >= n) throw new Error("unterminated string");
      emit(src.slice(i, j + 1)); i = j + 1; prev = "id"; continue;
    }
    if (c === "`") { emit(c); i++; template(); continue; }
    if (c === "/") {
      const regex = prev === "" || prev === "punct" || prev === "brace" || (prev === "id" && KEYWORD_BEFORE_REGEX.has(prevWord));
      if (regex) {
        let j = i + 1, cls = false;
        while (j < n) {
          const r = src[j];
          if (r === "\\") { j += 2; continue; }
          if (r === "\n") throw new Error("unterminated regular expression");
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
    if (/\s/.test(c)) { gap(c); i++; continue; }
    if (ID.test(c)) {
      let j = i + 1; while (j < n && ID.test(src[j])) j++;
      // a number's exponent sign or fraction is part of the same token for our purposes (1e-5, 1.5)
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
  return out + (ws === "\n" ? "\n" : "");
}

// Strips the comments out of CSS: /* … */ outside strings.
export function stripCss(src) {
  // whitespace as in stripJs; a comment counts as whitespace (CSS treats it as a separator only where whitespace would be one, so a
  // space keeps "a/**/b" two tokens, which is what the comment did)
  let out = "", i = 0, ws = "";
  const n = src.length;
  const emit = (t) => { if (ws && out) out += ws; ws = ""; out += t; };
  while (i < n) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "*") {
      const j = src.indexOf("*/", i + 2);
      if (j < 0) throw new Error("unterminated CSS comment");
      if (/\n/.test(src.slice(i, j))) ws = "\n"; else if (!ws) ws = " ";
      i = j + 2; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === "\\") j++; j++; }
      if (j >= n) throw new Error("unterminated CSS string");
      emit(src.slice(i, j + 1)); i = j + 1; continue;
    }
    if (/\s/.test(c)) { if (/[\n\r]/.test(c)) ws = "\n"; else if (!ws) ws = " "; i++; continue; }
    emit(c); i++;
  }
  return out + (ws === "\n" ? "\n" : "");
}
