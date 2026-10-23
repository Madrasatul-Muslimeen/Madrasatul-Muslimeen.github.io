// Checks a strip by apps/qr/strip-comments.mjs, inside the QR build (after-build.mjs runs it on EVERY stripped file and fails the build
// on any difference). Written separately from the stripper, on purpose (a different tokenizer: one sticky regular expression per token
// kind, and its own regex-or-division rule), so that a mistake in one is not quietly repeated by the other.
// It compares, comments and whitespace aside, every token's TEXT and its LINE NUMBER, the number of lines, and that every pragma comment
// (/*! … */, //@, // @, //#) is still there. tools/apps/qr-verify/strip-comments-check.mjs does the same with TypeScript's scanner.
// verifyStrip(before, after, "js" | "css") returns "" when the two match, else the first difference in plain words.

const LS = String.fromCharCode(0x2028, 0x2029); // (as codes: see strip-comments.mjs)
const NL = new RegExp("\\r\\n|[\\n\\r" + LS + "]", "g");
const lines = (s) => (s.match(NL) || []).length;
const JS_PARTS = [
  ["space", new RegExp("[^\\S\\n\\r" + LS + "]+", "y")],
  ["nl", new RegExp("\\r\\n|[\\n\\r" + LS + "]", "y")],
  ["comment", /\/\/[^\n\r]*|\/\*[\s\S]*?\*\//y],
  ["string", /"(?:[^"\\\n]|\\[\s\S])*"|'(?:[^'\\\n]|\\[\s\S])*'/y],
  ["word", /[A-Za-z0-9_$\u0080-\uffff]+/y],
];
// A / starts a regular expression unless the token before it ends a value.
const ENDS_VALUE = /^(?:[)\]]|["'`].*|\/.*\/[a-z]*|[A-Za-z0-9_$\u0080-\uffff]+)$/s;
const NOT_A_VALUE = /^(?:return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/;

function jsTokens(src) {
  const toks = [], stack = [];
  let pos = 0, line = 1;
  const push = (text) => toks.push({ text, line });
  const tpl = () => { // pos just after ` or after the } ending a ${ … }: read to ` or ${
    const start = pos;
    while (pos < src.length) {
      if (src[pos] === "\\") { pos += 2; continue; }
      if (src[pos] === "`") { pos++; return { text: src.slice(start, pos), open: false }; }
      if (src.startsWith("${", pos)) { pos += 2; return { text: src.slice(start, pos), open: true }; }
      pos++;
    }
    throw new Error("unterminated template");
  };
  outer: while (pos < src.length) {
    for (const [kind, re] of JS_PARTS) {
      re.lastIndex = pos;
      const m = re.exec(src);
      if (!m) continue;
      pos = re.lastIndex;
      if (kind === "nl") line++;
      else if (kind === "comment") line += lines(m[0]);
      else if (kind === "string" || kind === "word") push(m[0]);
      continue outer;
    }
    const c = src[pos];
    if (c === "`") { const l = line; pos++; const t = tpl(); toks.push({ text: "`" + t.text, line: l }); line += lines(t.text); if (t.open) stack.push(0); continue; }
    if (c === "{") { if (stack.length) stack[stack.length - 1]++; push(c); pos++; continue; }
    if (c === "}") {
      if (stack.length && stack[stack.length - 1] === 0) { const l = line; pos++; const t = tpl(); toks.push({ text: "}" + t.text, line: l }); line += lines(t.text); if (!t.open) stack.pop(); continue; }
      if (stack.length) stack[stack.length - 1]--;
      push(c); pos++; continue;
    }
    if (c === "/") {
      const before = toks.length ? toks[toks.length - 1].text : "";
      const regex = !before || !ENDS_VALUE.test(before) || NOT_A_VALUE.test(before) || before === "}";
      if (regex) {
        const m = /\/(?:[^\\\/\[\n\r]|\\.|\[(?:[^\]\\\n\r]|\\.)*\])+\/[A-Za-z]*/y;
        m.lastIndex = pos;
        const r = m.exec(src);
        if (!r) throw new Error(`unreadable regular expression at line ${line}`);
        push(r[0]); pos = m.lastIndex; continue;
      }
    }
    push(c); pos++;
  }
  return toks;
}
function cssTokens(src) {
  const toks = [];
  let line = 1;
  for (const m of src.matchAll(/\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\s+|[^\s"'/]+|\//g)) {
    const t = m[0];
    if (!/^\s/.test(t) && !t.startsWith("/*")) toks.push({ text: t, line });
    line += lines(t);
  }
  return toks;
}
const pragmas = (s) => [...s.matchAll(/\/\*![\s\S]*?\*\/|\/\/\s?[@#!][^\n\r]*/g)].map((m) => m[0]);

export function verifyStrip(before, after, kind) {
  let a, b;
  try { [a, b] = kind === "css" ? [cssTokens(before), cssTokens(after)] : [jsTokens(before), jsTokens(after)]; }
  catch (e) { return `could not read it: ${e.message}`; }
  if (lines(before) !== lines(after)) return `${lines(before)} lines became ${lines(after)}`;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i];
    if (!x || !y) return `${a.length} tokens became ${b.length}`;
    if (x.text !== y.text) return `line ${x.line}: ${JSON.stringify(x.text.slice(0, 60))} became ${JSON.stringify(y.text.slice(0, 60))}`;
    if (x.line !== y.line) return `${JSON.stringify(x.text.slice(0, 40))} moved from line ${x.line} to line ${y.line}`;
  }
  const p = pragmas(before), q = pragmas(after);
  if (kind === "js" && p.join("\n") !== q.join("\n")) return `pragma comments ${p.length} became ${q.length}`;
  return "";
}
