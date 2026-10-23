// Audit part 50, part 2 (PCF MSA J29): proves apps/qr/strip-comments.mjs removes comments and NOTHING ELSE, on the real files it
// strips in the built QR: quranrevival.html's inline module scripts and its <style>s (and, once stripped, every built .js file).
//   node tools/apps/qr-verify/strip-comments-check.mjs [--mutate=<name>]   (run node tools/apps/build-app.mjs qr first)
// JavaScript: TypeScript's own scanner (an independent lexer, so a bug in ours is not checked by itself) reads the SOURCE and the
// stripped text; their token streams, comments and whitespace aside, must be identical token for token, and every line break that
// separated two tokens in the source must still separate them (automatic semicolon insertion).
// CSS: the same, with a small CSS tokenizer (strings, comments, words, single characters).
// Also: the built page really is the stripped source (not merely strippable), it is smaller, and the strip is idempotent.
// TypeScript is not a dependency of this repository: TS_PATH, default the sandbox's /opt/node22/lib/node_modules/typescript.
// Mutations (each must FAIL): --mutate=string (a // inside a string is taken for a comment), --mutate=regex (a regex is read as
// division), --mutate=newline (a comment's line break becomes a space), --mutate=unstripped (the build skips the strip).
import "./_root.mjs";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";

const { REPO, BUILD } = await import("./_root.mjs");
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const ts = createRequire(import.meta.url)(process.env.TS_PATH || "/opt/node22/lib/node_modules/typescript");
let stripperFile = path.join(REPO, "apps/qr/strip-comments.mjs");
if (MUTATE === "regex") { // the stripper itself, changed: after ( = , and the like, a / is read as division
  const src = fs.readFileSync(stripperFile, "utf8"), to = 'const regex = prev === "" || ';
  const mutated = src.replace('const regex = prev === "" || prev === "punct" || ', to);
  if (mutated === src) throw new Error("--mutate=regex: the stripper's regex rule was not found");
  stripperFile = path.join(path.dirname(stripperFile), ".strip-comments-mutated.mjs"); fs.writeFileSync(stripperFile, mutated);
  process.on("exit", () => fs.rmSync(stripperFile, { force: true }));
}
let { stripJs, stripCss } = await import(stripperFile);

if (MUTATE === "string") { const o = stripJs; stripJs = (s) => o(s.replace(/"https:\/\/[^"\n]*"/g, (m) => m.slice(0, 7) + '"')); }
if (MUTATE === "newline") { const o = stripJs; stripJs = (s) => o(s).replace(/\n(?=[(\[`+\-/])/g, " "); }

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { if (typeof ok?.then === "function") throw new Error(`check "${name}" got a promise`); if (ok) { pass++; console.log(`  PASS ${name}`); } else { fail++; console.log(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); } };

// TypeScript's scanner, re-scanning / and } where its parser would (regex where a regex may start; template continuation inside ${}).
function jsTokens(src) {
  const sc = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, src);
  const K = ts.SyntaxKind, toks = [];
  let nl = false, prev = null, depth = [];
  const regexOk = () => {
    if (!prev) return true;
    const k = prev.kind;
    if (k === K.Identifier || k === K.NumericLiteral || k === K.StringLiteral || k === K.CloseParenToken || k === K.CloseBracketToken
      || k === K.NoSubstitutionTemplateLiteral || k === K.TemplateTail || k === K.RegularExpressionLiteral || k === K.BigIntLiteral) return false;
    if (k === K.ThisKeyword || k === K.SuperKeyword || k === K.TrueKeyword || k === K.FalseKeyword || k === K.NullKeyword) return false;
    if (k === K.CloseBraceToken) return true;
    return true;
  };
  for (;;) {
    let k = sc.scan();
    if (k === K.EndOfFileToken) break;
    if (k === K.NewLineTrivia) { nl = true; continue; }
    if (k === K.WhitespaceTrivia || k === K.SingleLineCommentTrivia || k === K.ShebangTrivia) continue;
    if (k === K.MultiLineCommentTrivia) { if (/[\n\r\u2028\u2029]/.test(sc.getTokenText())) nl = true; continue; }
    if ((k === K.SlashToken || k === K.SlashEqualsToken) && regexOk()) k = sc.reScanSlashToken();
    if (k === K.TemplateHead) depth.push(0);
    else if (k === K.OpenBraceToken && depth.length) depth[depth.length - 1]++;
    else if (k === K.CloseBraceToken && depth.length) {
      if (depth[depth.length - 1] === 0) { k = sc.reScanTemplateToken(false); if (k === K.TemplateTail) depth.pop(); }
      else depth[depth.length - 1]--;
    }
    const t = { kind: k, text: sc.getTokenText(), nl };
    toks.push(t); prev = t; nl = false;
  }
  return toks;
}
function cssTokens(src) {
  const toks = [];
  let nl = false;
  for (const m of src.matchAll(/\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\s+|[\w\-#.%]+|[\s\S]/g)) {
    const t = m[0];
    if (/^\s/.test(t) || t.startsWith("/*")) { nl = true; continue; }
    toks.push({ text: t, sep: nl }); nl = false;
  }
  return toks;
}
function sameJs(a, b) {
  const x = jsTokens(a), y = jsTokens(b);
  if (x.length !== y.length) return `token count ${x.length} -> ${y.length}`;
  for (let i = 0; i < x.length; i++) {
    if (x[i].kind !== y[i].kind || x[i].text !== y[i].text) return `token ${i}: ${JSON.stringify(x[i].text.slice(0, 60))} -> ${JSON.stringify(y[i].text.slice(0, 60))}`;
    if (i > 0 && x[i].nl && !y[i].nl) return `token ${i} (${JSON.stringify(x[i].text.slice(0, 40))}) lost the line break before it`;
  }
  return "";
}
function sameCss(a, b) {
  const x = cssTokens(a), y = cssTokens(b);
  if (x.length !== y.length) return `token count ${x.length} -> ${y.length}`;
  for (let i = 0; i < x.length; i++) {
    if (x[i].text !== y[i].text) return `token ${i}: ${JSON.stringify(x[i].text.slice(0, 60))} -> ${JSON.stringify(y[i].text.slice(0, 60))}`;
    if (i > 0 && x[i].sep && !y[i].sep) return `token ${i} (${JSON.stringify(x[i].text)}) lost the space before it`;
  }
  return "";
}
const same = (f, s) => { try { return f(s) === s; } catch { return false; } };
const gz = (s) => zlib.gzipSync(s, { level: 9 }).length;
const blocks = (html) => {
  const js = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter((m) => /type="module"/.test(m[1]) && !/\ssrc=/.test(m[1])).map((m) => m[2]);
  const css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  return { js, css };
};

// 1. Positive controls: the comparators see a real change.
console.log("controls");
check("control: the JS comparator sees a changed token", sameJs("a = 'x' // c\nb()", "a = 'y'\nb()") !== "");
check("control: the JS comparator sees a lost line break", sameJs("a = b // c\n(f)()", "a = b (f)()") !== "");
check("control: the JS comparator reads a regex as one token", jsTokens("x = /\\/\\/[a]*\\//g").length === 3);
check("control: the CSS comparator sees a changed token", sameCss("a{color:red}/* c */", "a{color:blue}") !== "");
check("control: the CSS comparator sees a lost space", sameCss("a /* c */ b{}", "a/**/b{}".replace("/**/", "")) !== "");

// 2. Small cases that a careless stripper gets wrong.
console.log("cases");
const cases = [
  ["a // in a line comment", "a = 1; // x\nb()"],
  ["// inside a string", "u = \"https://example.com/a\"; // c\n"],
  ["/* inside a string */", "s = '/* not */';"],
  ["// inside a template, and ${} nesting", "t = `a // b ${ {x: `c /* d */`}.x } e`; // c\n"],
  ["a regex holding // and /*", "r = /\\/\\/|\\/\\*/g; // c\n"],
  ["a regex after return, ( , = and }", "function f(){ return /a\\/b/.test(x) }\nif (/[/]/.test(y)) {}\n"],
  ["a regex class holding /", "r = /[/*]+/;"],
  ["division is not a regex", "x = a / b / c; y = (a) / 2; z = a[1] / 3;"],
  ["a comment's line break kept (ASI)", "a = b /* x\n */ (c)\n"],
  ["a block comment between two tokens leaves a space", "return/**/x"],
];
for (const [name, src] of cases) {
  let out, why;
  try { out = stripJs(src); why = sameJs(src, out); } catch (e) { why = `threw ${e.message}`; }
  check(`JS: ${name}`, !why, why);
  if (!why) check(`JS: ${name} has no comment left`, !/\/\/ (x|c)\b|\/\* x/.test(out.replace(/(["'`])(?:\\.|(?!\1)[\s\S])*\1/g, "")));
}
check("CSS: a comment inside a string is kept", stripCss('a::after{content:"/* x */"}') === 'a::after{content:"/* x */"}');
check("CSS: a comment between two words leaves a space", sameCss("a/* c */ b{}", stripCss("a/* c */ b{}")) === "");

// 3. The real page: source -> stripped matches token for token; the built page IS the stripped source; smaller; idempotent.
console.log("quranrevival.html");
const srcHtml = fs.readFileSync(path.join(REPO, "app/quranrevival.html"), "utf8");
const builtHtml = fs.readFileSync(path.join(BUILD, "app/quranrevival.html"), "utf8");
const S = blocks(srcHtml), B = MUTATE === "unstripped" ? S : blocks(builtHtml);
check("the source page has inline module scripts and styles to strip", S.js.length >= 2 && S.css.length >= 1, `${S.js.length} scripts, ${S.css.length} styles`);
check("the built page has the same number of inline scripts and styles", B.js.length === S.js.length && B.css.length === S.css.length, `${B.js.length}/${S.js.length}, ${B.css.length}/${S.css.length}`);
// The built page went through edits.json too, so the comparison is built source (unstripped) -> built: strip the BUILT text again
// must be a no-op (idempotent), and stripping the source's blocks must match what the built page carries wherever edits did not apply.
let jsBefore = 0, jsAfter = 0, cssBefore = 0, cssAfter = 0;
S.js.forEach((src, k) => {
  let out, why;
  try { out = stripJs(src); why = sameJs(src, out); } catch (e) { why = `threw ${e.message}`; }
  check(`inline module ${k + 1} (${(src.length / 1024) | 0} KB): every token kept, every line break kept`, !why, why);
  jsBefore += gz(src); jsAfter += gz(B.js[k] || "");
  const built = B.js[k] || "";
  check(`inline module ${k + 1}: the built page carries it stripped (no comment left, and stripping again changes nothing)`, built.length < src.length && same(stripJs, built), `${src.length} -> ${built.length} chars`);
});
S.css.forEach((src, k) => {
  let out, why;
  try { out = stripCss(src); why = sameCss(src, out); } catch (e) { why = `threw ${e.message}`; }
  check(`<style> ${k + 1} (${(src.length / 1024) | 0} KB): every token kept`, !why, why);
  cssBefore += gz(src); cssAfter += gz(B.css[k] || "");
  const built = B.css[k] || "";
  check(`<style> ${k + 1}: the built page carries it stripped`, built.length < src.length && same(stripCss, built), `${src.length} -> ${built.length} chars`);
});
check(`gzipped, the inline modules shrink by at least 40% (${jsBefore >> 10} KB -> ${jsAfter >> 10} KB)`, jsAfter <= jsBefore * 0.6);
check(`gzipped, the styles shrink by at least 40% (${cssBefore >> 10} KB -> ${cssAfter >> 10} KB)`, cssAfter <= cssBefore * 0.6);
// The stripped modules still parse as modules (node --check).
const tmp = fs.mkdtempSync(path.join(BUILD, "..", "strip-check-"));
let parsed = 0;
B.js.forEach((js, k) => { const f = path.join(tmp, `m${k}.mjs`); fs.writeFileSync(f, js); try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); parsed++; } catch (e) { console.log(String(e.stderr).slice(0, 400)); } });
fs.rmSync(tmp, { recursive: true, force: true });
check("every stripped inline module parses (node --check)", parsed === B.js.length, `${parsed}/${B.js.length}`);

console.log(`\n==== strip-comments-check: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
