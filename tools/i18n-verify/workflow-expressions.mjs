#!/usr/bin/env node
// Workflow expression integrity.
//
// WHY THIS EXISTS. On 21 Sep 2026 `.github/workflows/claude.yml` was broken in
// a way that EVERY existing check called fine. Its `prompt:` was a plain YAML
// scalar containing the text "issue #{0}", and in YAML a space-followed-by-hash
// begins a comment -- so the parser silently discarded the rest of the line,
// leaving `${{` with no closing `}}`. GitHub could then not load the workflow
// at all: it registered by FILE PATH instead of by its `name:`, every push
// produced a `failure` run with no job in it, and the builder's own test round
// triggered nothing at all.
//
// Both available checks passed. PyYAML parsed the file "successfully" -- it had
// merely truncated a string, which is not a parse error. A GitHub-schema
// validator reported no error either, because the schema describes STRUCTURE
// and knows nothing about expression syntax. The defect was only visible by
// counting braces in the PARSED value: 2 open, 0 close.
//
// The lesson is this repository's own, in a new costume: assert on the parsed
// RESULT, never on the fact that something parsed.
//
// Run from the repository root.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = ".github/workflows";
let passed = 0;
const failures = [];

function check(name, condition, detail = "") {
  const ok = typeof condition === "function" ? condition() : condition;
  if (ok instanceof Promise) throw new Error(`check "${name}" returned a promise`);
  if (ok) {
    passed++;
  } else {
    failures.push(`${name}${detail ? ` -- ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ""}`);
  }
}

// A minimal YAML reader would re-import the same blind spot, so the file is
// read as TEXT and the expressions are pulled out of it directly. That is
// deliberate: the bug was a parser quietly agreeing with a broken file.
const files = readdirSync(DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

check("there is at least one workflow to check", files.length > 0, `found ${files.length}`);

// A workflow's own comments necessarily QUOTE the broken syntax in order to
// explain it -- this file's own header does, and so does verify.yml's. Counting
// braces across comment text therefore reports the explanation as the defect.
// That is this repository's existing lesson ("strip BOTH comment forms before
// grepping source for a forbidden name") arriving in YAML, and it was found by
// this guard failing on the very commit that added it.
//
// Full-line comments are removed; a trailing `#` on a value line is NOT
// removed, because that is the hazard itself and must stay visible to rule 3.
const stripFullLineComments = (t) =>
  t
    .split("\n")
    .map((l) => (/^\s*#/.test(l) ? "" : l))
    .join("\n");

for (const file of files) {
  const path = join(DIR, file);
  const raw = readFileSync(path, "utf8");
  const text = stripFullLineComments(raw);

  // 1. EVERY `${{` HAS A `}}`. The exact defect above.
  const opens = (text.match(/\$\{\{/g) || []).length;
  // Count `}}` that are not part of a longer brace run belonging to something else.
  const closes = (text.match(/\}\}/g) || []).length;
  check(
    `${file}: every \${{ has a matching }}`,
    opens === closes,
    `${opens} opened, ${closes} closed`,
  );

  // 2. NO PLAIN SCALAR CARRIES AN UNCLOSED EXPRESSION. Line-level, because that
  //    is the shape the truncation took: the `${{` and its `}}` were on one
  //    line, and the tail vanished.
  text.split("\n").forEach((line, i) => {
    const o = (line.match(/\$\{\{/g) || []).length;
    const c = (line.match(/\}\}/g) || []).length;
    if (o > 0 && o !== c) {
      // A block scalar may legitimately span lines, but `${{` and `}}` on the
      // SAME logical value should balance. Report rather than assume.
      check(
        `${file}:${i + 1}: expression opened on this line is closed on it`,
        false,
        `${o} opened, ${c} closed -- ${line.trim().slice(0, 90)}`,
      );
    }
  });

  // 3. A VALUE CONTAINING `${{` MUST NOT BE A PLAIN SCALAR CARRYING ` #`.
  //    This is the root hazard, caught at the source rather than at the symptom.
  text.split("\n").forEach((line, i) => {
    if (!line.includes("${{")) return;
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) return; // a real comment line
    // Is the value quoted or inside a block scalar? If the key is followed by
    // a bare `${{`, it is plain.
    const plainValue = /^[A-Za-z_][\w-]*:\s+\$\{\{/.test(trimmed);
    if (plainValue && / #/.test(trimmed)) {
      check(
        `${file}:${i + 1}: plain scalar with an expression has no " #" (YAML comment hazard)`,
        false,
        trimmed.slice(0, 90),
      );
    }
  });

  // 4. `format()` PLACEHOLDERS ARE BALANCED AND SEQUENTIAL. A truncated format
  //    string is the other way this defect can present.
  for (const m of text.matchAll(/format\(\s*'((?:[^'\\]|\\.)*)'/g)) {
    const spec = m[1];
    const idx = [...spec.matchAll(/\{(\d+)\}/g)].map((x) => Number(x[1]));
    const unique = [...new Set(idx)].sort((a, b) => a - b);
    check(
      `${file}: format() placeholders start at 0 and have no gaps`,
      unique.length === 0 || (unique[0] === 0 && unique.every((v, k) => v === k)),
      `saw {${unique.join("}, {")}}`,
    );
  }

  // 5. THE WORKFLOW DECLARES A `name:`. GitHub falls back to the file path when
  //    it cannot load the file, which is how the original defect showed up in
  //    the Actions list. A missing name makes that signal unreadable.
  check(`${file}: declares a top-level name:`, /^name:\s*\S/m.test(raw));
}

console.log(`\n==== Workflow expressions: ${passed} passed, ${failures.length} failed ====`);
process.exit(failures.length === 0 ? 0 : 1);
