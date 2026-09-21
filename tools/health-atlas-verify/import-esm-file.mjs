// Loads one of app/health/js/*.js as a real ES module from plain Node,
// without a package.json "type": "module" marker.
//
// Why this exists: every package.json in this repository except
// tools/firestore-emulator/'s is deliberately gitignored ("infrastructure;
// all other package manifests remain machine-local/ignored" — see
// .gitignore), and app/health/js/*.js has to stay plain ".js" so the
// browser (and this repo's serve.js, whose MIME table has no ".mjs" entry)
// can load it as-is. A data: URL sidesteps both constraints: Node's own
// ESM loader treats it as a module regardless of extension or any
// package.json, with no flag needed.
//
// Only safe for a module with no relative imports of its own (none of the
// three app/health/js/ files this tranche built import one another via a
// relative specifier from inside a data: URL — health-atlas-view.js is
// read as source text by the boundary check instead of executed, for
// exactly this reason).

import { readFileSync } from 'node:fs';

export async function importEsmFile(absolutePath) {
  const source = readFileSync(absolutePath, 'utf8');
  const url = 'data:text/javascript;base64,' + Buffer.from(source, 'utf8').toString('base64');
  return import(url);
}
