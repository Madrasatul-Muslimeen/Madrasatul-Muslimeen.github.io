// Audit part 50, part 2 (PCF MSA J29): proves the QR build's comment strip (apps/qr/strip-comments.mjs, run on the built site by
// apps/qr/strip-site.mjs from after-build.mjs) removes comments and NOTHING ELSE, and moves no line.
//   node tools/apps/qr-verify/strip-comments-check.mjs [--mutate=<name>]   (builds QR itself into a temporary folder)
// JavaScript: TypeScript's own scanner (independent of both our stripper and the build's own verifier, apps/qr/verify-strip.mjs) reads
// every text as it was before the strip and as it was built; the token streams, comments and whitespace aside, must be identical token
// for token, on the same LINE (a student's stack trace must point at the source's line: the MSA Architect's condition, 24 Oct 2026).
// CSS: the same, with a small CSS tokenizer. Also: every built file is exactly the stripper's output; pragma comments are kept; the
// real build/qr matches; the bytes shrink; the inline modules parse; and a stripper that changes one token, or moves one line, in one
// file stops the build, naming that file, before anything is written.
// TypeScript is not a dependency of this repository: TS_PATH, default the sandbox's /opt/node22/lib/node_modules/typescript.
// Mutations (each must FAIL): --mutate=string (a // inside a string is taken for a comment), --mutate=regex (the stripper reads a regex
// after ( = , as division), --mutate=newline (a comment's line breaks are dropped), --mutate=unstripped (the build skips the strip).
import "./_root.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";

const { REPO, BUILD } = await import("./_root.mjs");
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const ts = createRequire(import.meta.url)(process.env.TS_PATH || "/opt/node22/lib/node_modules/typescript");
const LS = String.fromCharCode(0x2028, 0x2029);
const BREAKS = new RegExp("\\r\\n|[\\n\\r" + LS + "]", "g");
const lineCount = (s) => (s.match(BREAKS) || []).length;

let stripperFile = path.join(REPO, "apps/qr/strip-comments.mjs");
if (MUTATE === "regex") { // the stripper itself, changed: after ( = , and the like, a / is read as division
  const src = fs.readFileSync(stripperFile, "utf8");
  const mutated = src.replace('const regex = prev === "" || prev === "punct" || ', 'const regex = prev === "" || ');
  if (mutated === src) throw new Error("--mutate=regex: the stripper's regex rule was not found");
  stripperFile = path.join(path.dirname(stripperFile), ".strip-comments-mutated.mjs"); fs.writeFileSync(stripperFile, mutated);
  process.on("exit", () => fs.rmSync(stripperFile, { force: true }));
}
let { stripJs, stripCss } = await import(stripperFile);
const real = await import(path.join(REPO, "apps/qr/strip-comments.mjs"));
const { stripSite } = await import(path.join(REPO, "apps/qr/strip-site.mjs"));
if (MUTATE === "string") { const o = stripJs; stripJs = (s) => o(s.replace(/"https:\/\/[^"\n]*"/g, (m) => m.slice(0, 7) + '"')); }
if (MUTATE === "newline") { const o = stripJs; stripJs = (s) => o(s).replace(/\n\n/g, "\n"); }

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { if (typeof ok?.then === "function") throw new Error(`check "${name}" got a promise`); if (ok) { pass++; console.log(`  PASS ${name}`); } else { fail++; console.log(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); } };
const attempt = (f) => { try { return f(); } catch (e) { return `threw ${e.message}`; } };

// TypeScript's scanner, re-scanning / and } where its parser would. A token's line is counted from its POSITION (the line breaks in the
// text before it): the scanner skips a lone U+2028/U+2029 without a trivia token, so counting trivia texts would miss it.
function jsTokens(src) {
  const sc = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, src);
  const K = ts.SyntaxKind, toks = [], depth = [];
  let prev = null, line = 1, at = 0;
  const valueEnd = new Set([K.Identifier, K.NumericLiteral, K.BigIntLiteral, K.StringLiteral, K.CloseParenToken, K.CloseBracketToken,
    K.NoSubstitutionTemplateLiteral, K.TemplateTail, K.RegularExpressionLiteral, K.ThisKeyword, K.SuperKeyword, K.TrueKeyword, K.FalseKeyword, K.NullKeyword]);
  for (;;) {
    let k = sc.scan();
    if (k === K.EndOfFileToken) break;
    if (k === K.NewLineTrivia || k === K.WhitespaceTrivia || k === K.SingleLineCommentTrivia || k === K.MultiLineCommentTrivia || k === K.ShebangTrivia) continue;
    if ((k === K.SlashToken || k === K.SlashEqualsToken) && !(prev && valueEnd.has(prev.kind))) k = sc.reScanSlashToken();
    if (k === K.TemplateHead) depth.push(0);
    else if (k === K.OpenBraceToken && depth.length) depth[depth.length - 1]++;
    else if (k === K.CloseBraceToken && depth.length) {
      if (depth[depth.length - 1] === 0) { k = sc.reScanTemplateToken(false); if (k === K.TemplateTail) depth.pop(); }
      else depth[depth.length - 1]--;
    }
    const start = sc.getTokenStart ? sc.getTokenStart() : sc.getTokenPos();
    line += lineCount(src.slice(at, start)); at = start;
    const t = { kind: k, text: sc.getTokenText(), line };
    toks.push(t); prev = t;
  }
  return toks;
}
function cssTokens(src) {
  const toks = [];
  let line = 1;
  for (const m of src.matchAll(/\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\s+|[\w\-#.%]+|[\s\S]/g)) {
    const t = m[0];
    if (!/^\s/.test(t) && !t.startsWith("/*")) toks.push({ text: t, line });
    line += lineCount(t);
  }
  return toks;
}
function same(a, b, kind) {
  if (lineCount(a) !== lineCount(b)) return `${lineCount(a)} lines became ${lineCount(b)}`;
  const x = kind === "css" ? cssTokens(a) : jsTokens(a), y = kind === "css" ? cssTokens(b) : jsTokens(b);
  if (x.length !== y.length) return `token count ${x.length} -> ${y.length}`;
  for (let i = 0; i < x.length; i++) {
    if (x[i].kind !== y[i].kind || x[i].text !== y[i].text) return `line ${x[i].line}: ${JSON.stringify(x[i].text.slice(0, 60))} -> ${JSON.stringify(y[i].text.slice(0, 60))}`;
    if (x[i].line !== y[i].line) return `${JSON.stringify(x[i].text.slice(0, 40))} moved from line ${x[i].line} to ${y[i].line}`;
  }
  return "";
}
const gz = (s) => zlib.gzipSync(s, { level: 9 }).length;
const blocks = (html) => ({
  js: [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter((m) => /type="module"/.test(m[1]) && !/\ssrc=/.test(m[1])).map((m) => m[2]),
  css: [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]),
});
const pragmas = (s) => [...s.matchAll(/\/\*![\s\S]*?\*\/|\/\/\s?[@#!][^\n\r]*/g)].map((m) => m[0]);

// 1. Positive controls: the comparator sees a real change.
console.log("controls");
check("control: the JS comparator sees a changed token", same("a = 'x' // c\nb()", "a = 'y'\nb()", "js") !== "");
check("control: the JS comparator sees a moved line", same("a // c\n\nb()", "a\nb()\n", "js") !== "");
check("control: the JS comparator sees a token moved to another line", same("a /* c */\nb", "a /* c */ b\n", "js") !== "");
check("control: the JS comparator reads a regex as one token", jsTokens("x = /\\/\\/[a]*\\//g").length === 3);
check("control: the CSS comparator sees a changed token", same("a{color:red}/* c */", "a{color:blue}", "css") !== "");

// 2. Small cases a careless stripper gets wrong.
console.log("cases");
const cases = [
  ["a // line comment", "a = 1; // x\nb()\n"],
  ["// inside a string", "u = \"https://example.com/a\"; // c\n"],
  ["/* inside a string */", "s = '/* not */';\n"],
  ["// inside a template, and ${} nesting", "t = `a // b ${ {x: `c /* d */`}.x } e`; // c\n"],
  ["a regex holding // and /*", "r = /\\/\\/|\\/\\*/g; // c\n"],
  ["a regex after return, ( and }", "function f(){ return /a\\/b/.test(x) }\nif (/[/]/.test(y)) {}\n"],
  ["a regex class holding /", "r = /[/*]+/;\n"],
  ["division is not a regex", "x = a / b / c; y = (a) / 2; z = a[1] / 3;\n"],
  ["a block comment's line breaks kept", "a = b /* x\n\n y */ (c)\nd()\n"],
  ["a block comment between two tokens leaves a space", "return/**/x\n"],
  ["indentation kept, trailing spaces dropped", "if (a) {\n    b();   // c\n}\n"],
];
for (const [name, src] of cases) {
  const out = attempt(() => stripJs(src));
  const why = out.startsWith?.("threw") ? out : same(src, out, "js");
  check(`JS: ${name}`, !why, why);
}
check("JS: pragma comments kept as written", stripJs("/*! licence */\nx(); //# sourceMappingURL=a.map\n// @ts-check\n") === "/*! licence */\nx(); //# sourceMappingURL=a.map\n// @ts-check\n");
check("JS: indentation kept", stripJs("if (a) {\n    b();   // c\n}\n") === "if (a) {\n    b();\n}\n");
check("CSS: a comment inside a string is kept", stripCss('a::after{content:"/* x */"}') === 'a::after{content:"/* x */"}');
check("CSS: lines kept", lineCount(stripCss("a {\n/* x\n y */\n color: red; }\n")) === 4);

// 3. A real build into a temporary folder, keeping every text as it was before the strip.
console.log("the built QR");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "qr-strip-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));
const site = path.join(tmp, "site"), before = path.join(tmp, "before");
execFileSync(process.execPath, [path.join(REPO, "tools/apps/build-app.mjs"), "qr", `--out=${site}`], { cwd: REPO, stdio: "pipe", env: { ...process.env, QR_STRIP_BEFORE: before } });
const rels = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else rels.push(path.relative(before, f).split(path.sep).join("/")); } })(before);
const page = "app/quranrevival.html";
check(`the build kept ${rels.length} texts as they were before the strip (the page and at least 200 scripts)`, rels.includes(page) && rels.length > 200);
const builtOf = (rel) => MUTATE === "unstripped" ? fs.readFileSync(path.join(before, rel), "utf8") : fs.readFileSync(path.join(site, rel), "utf8");
let gzBefore = 0, gzAfter = 0, tokenFails = [], exactFails = [], pragmaFails = [], realFails = [], n = 0, shrunk = 0;
const compare = (where, a, b, kind) => {
  n++; gzBefore += gz(a); gzAfter += gz(b); if (b.length < a.length) shrunk++;
  const why = attempt(() => same(a, b, kind)); if (why) tokenFails.push(`${where}: ${why}`);
  const mine = attempt(() => (kind === "css" ? stripCss(a) : stripJs(a))); if (mine !== b) exactFails.push(where);
  if (kind === "js" && pragmas(a).join("\n") !== pragmas(b).join("\n")) pragmaFails.push(where);
};
for (const rel of rels) {
  const a = fs.readFileSync(path.join(before, rel), "utf8"), b = builtOf(rel);
  if (rel === page) {
    const A = blocks(a), B = blocks(b);
    check("the built page has the same inline scripts and styles", A.js.length === B.js.length && A.css.length === B.css.length && A.js.length >= 2);
    A.js.forEach((t, k) => compare(`${page} inline module ${k + 1}`, t, B.js[k], "js"));
    A.css.forEach((t, k) => compare(`${page} <style> ${k + 1}`, t, B.css[k], "css"));
  } else compare(rel, a, b, "js");
  if (MUTATE !== "unstripped" && fs.readFileSync(path.join(BUILD, rel), "utf8") !== fs.readFileSync(path.join(site, rel), "utf8")) realFails.push(rel);
}
check(`TypeScript's scanner: every token kept, on its own line, in all ${n} texts`, !tokenFails.length, tokenFails.slice(0, 3).join(" | "));
check(`every built text is exactly the stripper's output`, !exactFails.length, `${exactFails.length}: ${exactFails.slice(0, 3).join(", ")}`);
check("every pragma comment kept", !pragmaFails.length, pragmaFails.slice(0, 3).join(", "));
check(`most texts got smaller (${shrunk} of ${n})`, shrunk >= n * 0.8);
check(`gzipped, all of them together shrink by at least 40% (${gzBefore >> 10} KB -> ${gzAfter >> 10} KB)`, gzAfter <= gzBefore * 0.6);
check("build/qr is this same build (run node tools/apps/build-app.mjs qr if not)", !realFails.length, realFails.slice(0, 3).join(", "));
const parsed = blocks(builtOf(page)).js.filter((js, k) => { const f = path.join(tmp, `m${k}.mjs`); fs.writeFileSync(f, js); try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); return true; } catch { return false; } }).length;
check("every stripped inline module parses (node --check)", parsed === blocks(builtOf(page)).js.length);

// 4. The build refuses a bad strip, naming the file, and writes nothing.
console.log("the build refuses a bad strip");
for (const [name, bad] of [["changes one token", (s) => s.replace(/\btrue\b/, "false")], ["moves one line", (s) => s.replace(/\n/, "")]]) {
  const copy = path.join(tmp, `copy-${name.replace(/\W/g, "")}`);
  fs.cpSync(before, copy, { recursive: true });
  const target = "app/js/note-window.js", was = fs.readFileSync(path.join(copy, target), "utf8");
  let msg = "";
  try { stripSite(copy, { stripJs: (s) => (s === was ? bad(real.stripJs(s)) : real.stripJs(s)) }); } catch (e) { msg = e.message; }
  check(`a stripper that ${name} in ${target}: the build stops and names it`, msg.includes(target), msg || "it did not stop");
  check(`... and nothing was written (the page still has its comments)`, fs.readFileSync(path.join(copy, page), "utf8") === fs.readFileSync(path.join(before, page), "utf8"));
}

console.log(`\n==== strip-comments-check: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
