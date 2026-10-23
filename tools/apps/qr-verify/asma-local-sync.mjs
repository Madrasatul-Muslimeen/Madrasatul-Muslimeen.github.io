// QR J01 R1: app/js/asma-local.js holds functions copied byte-identical from MMSA's app/js/asma-collections.js
// (the pure half; the original imports Firestore). This check proves each one still matches its MMSA original.
//   node tools/apps/qr-verify/asma-local-sync.mjs <path to an MMSA checkout>      (exit 1 on any difference)
//   node tools/apps/qr-verify/asma-local-sync.mjs [MMSA checkout, default: this repository] --write          (rebuilds asma-local.js from it)
import { REPO } from "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import path from "node:path";

export const FUNCTIONS = [
  "normalizeCollection", "normalizeClassification", "normalizeExtraName", "collectionsFrom", "extraNamesFrom",
  "classificationsFrom", "activeCollections", "activeExtraNames", "activeClassifications", "membershipsOfName",
  "asmaPositionLabels", "resolveAsmaEntry",
];

/** One function's source with the comment block right above it: from that comment's first line to the first "}" at column 0. */
export function extract(src, name) {
  const lines = src.split("\n");
  const at = lines.findIndex((l) => new RegExp(`^(export )?function ${name}\\(`).test(l));
  if (at < 0) return null;
  let start = at;
  while (start > 0 && /^(\/\*\*|\s*\*|\/\/)/.test(lines[start - 1])) start--;
  let end = at;
  while (end < lines.length && lines[end] !== "}") end++;
  return lines.slice(start, end + 1).join("\n");
}

const HEADER = `// QR J01 R1 (QR-only): the PURE half of MMSA's app/js/asma-collections.js, for the Asma app with no sign-in.
//
// asma-collections.js statically imports the Firestore SDK from www.gstatic.com (it also reads and writes the
// tenant's asmaCollections document), so app/asma.html must not import it. Each function below is copied from it
// BYTE-IDENTICAL, with its comment, and nothing else is added: with no tenant document, collectionsFrom(null),
// extraNamesFrom(null) and classificationsFrom(null) give the owner's seeded groups (asma-collections-data.js's
// DEFAULT_*), exactly what MMSA shows a madrasah that has not edited them.
// Built and checked by tools/apps/qr-verify/asma-local-sync.mjs (run it against each new MMSA commit copied).

import { DEFAULT_ASMA_COLLECTIONS, DEFAULT_EXTRA_ASMA_NAMES, DEFAULT_WEAK_CANONICAL_NUMBERS, DEFAULT_CANONICAL_REFS, DEFAULT_ASMA_CLASSIFICATIONS } from "./asma-collections-data.js";
import { getAsmaName } from "./asma-data.js";
import { buildUnitKey } from "./unit-keys.js";
`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const mmsa = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : REPO; // ported: MMSA's original is this repository's own app/js (REPO); "ours" is the built app/js/asma-local.js
  if (!mmsa) { console.error("Usage: node tools/apps/qr-verify/asma-local-sync.mjs [MMSA checkout, default: this repository] [--write]"); process.exit(2); }
  const original = fs.readFileSync(path.join(mmsa, "app/js/asma-collections.js"), "utf8");
  // QR's own copy in the SOURCE (apps/qr/site/…): the build strips comments from app/js/asma-local.js (audit part 50 part 2, proven
  // token for token and line for line by strip-comments-check.mjs), so the byte-for-byte promise is the source file's.
  const target = path.join(REPO, "apps/qr/site/app/js/asma-local.js");
  if (process.argv.includes("--write")) {
    const parts = FUNCTIONS.map((f) => { const s = extract(original, f); if (!s) throw new Error(`${f} not in MMSA's file`); return s; });
    fs.writeFileSync(target, `${HEADER}\n${parts.join("\n\n")}\n`);
    console.log(`${target} written: ${FUNCTIONS.length} functions`);
  }
  const ours = fs.readFileSync(target, "utf8");
  let pass = 0, fail = 0;
  for (const f of FUNCTIONS) {
    const a = extract(original, f), b = extract(ours, f);
    const ok = a != null && a === b;
    ok ? pass++ : fail++;
    console.log(`${ok ? "ok  " : "FAIL"} ${f} matches MMSA byte for byte`);
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
