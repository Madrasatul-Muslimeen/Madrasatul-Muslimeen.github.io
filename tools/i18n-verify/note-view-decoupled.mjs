// Note view retirement step (a): the four shared helpers must not know the Note view exists.
// Run from the repository root:  node tools/i18n-verify/note-view-decoupled.mjs
// Strips both comment forms, extracts each helper (parameter list + body) by brace matching,
// and asserts none mentions noteView, renderNoteViewNow or noteScope.
import { readFileSync } from "node:fs";

const src = readFileSync(process.argv[2] || "app/quranrevival.html", "utf8");

// Comment strip that leaves string/template/regex-free source alone well enough for this file:
// block comments first, then whole-line and trailing // comments that are not inside a URL.
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");

const HELPERS = ["refreshQcrDrawerSummaries", "wireApproachEmbed", "wireAsmaTrackEmbed", "wireAsmaXNoteFields"];
const FORBIDDEN = /\b(noteView|renderNoteViewNow|noteScope)\b/;

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} ${detail}`); }
}

function extract(name) {
  const start = code.indexOf(`function ${name}(`);
  if (start < 0) return null;
  // The parameter list may contain `{` (destructuring), so find the body brace after the matching ")".
  let depth = 0, i = code.indexOf("(", start);
  for (; i < code.length; i++) {
    if (code[i] === "(") depth++;
    else if (code[i] === ")") { depth--; if (depth === 0) break; }
  }
  const bodyOpen = code.indexOf("{", i);
  depth = 0;
  let j = bodyOpen;
  for (; j < code.length; j++) {
    if (code[j] === "{") depth++;
    else if (code[j] === "}") { depth--; if (depth === 0) break; }
  }
  return code.slice(start, j + 1);
}

for (const name of HELPERS) {
  const text = extract(name);
  check(`${name} is found (positive control)`, !!text && text.length > 200, `length ${text?.length}`);
  if (!text) continue;
  const m = text.match(FORBIDDEN);
  check(`${name} does not mention noteView / renderNoteViewNow / noteScope`, !m, m ? `found "${m[0]}"` : "");
  check(`${name} names a missing root as an error`, /throw new Error\(`?"?[^)]*root element is required/.test(text));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
