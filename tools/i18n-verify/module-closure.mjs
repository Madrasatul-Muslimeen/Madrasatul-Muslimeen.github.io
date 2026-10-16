// Prints the static-import closure of a page's inline module scripts: the files the browser must fetch, level by level,
// before the page can run. Each level is one network round trip, so a deep chain is what makes a page slow on a phone.
//   node tools/i18n-verify/module-closure.mjs app/about.html
// Also exports closure(page) for suites (load-speed-modulepreload checks that a page preloads its whole closure).
import fs from "node:fs";
import path from "node:path";

const IMPORT_RE = /(?:^|[;\n])\s*(?:import|export)\s*(?:[^'";]*?\sfrom\s*)?["'](\.{1,2}\/[^"']+)["']/g;

export function closure(pageFile) {
  const html = fs.readFileSync(pageFile, "utf8");
  const dir = path.dirname(pageFile);
  const levels = []; // levels[i] = files first reachable at depth i
  const seen = new Set();
  let frontier = [];
  for (const m of html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) for (const r of m[1].matchAll(IMPORT_RE)) frontier.push(path.normalize(path.join(dir, r[1])));
  while (frontier.length) {
    const level = [...new Set(frontier)].filter((f) => !seen.has(f) && fs.existsSync(f));
    if (!level.length) break;
    level.forEach((f) => seen.add(f));
    levels.push(level);
    frontier = [];
    for (const f of level) {
      const src = fs.readFileSync(f, "utf8");
      for (const r of src.matchAll(IMPORT_RE)) frontier.push(path.normalize(path.join(path.dirname(f), r[1])));
    }
  }
  return levels;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const levels = closure(process.argv[2]);
  if (process.argv.includes("--preload")) { // the <link rel="modulepreload"> lines for everything deeper than the page's own imports
    for (const f of levels.slice(1).flat().sort()) console.log(`<link rel="modulepreload" href="./${path.relative(path.dirname(process.argv[2]), f).replace(/\\/g, "/")}" />`);
    process.exit(0);
  }
  levels.forEach((l, i) => console.log(`depth ${i + 1}: ${l.length} files, ${l.reduce((n, f) => n + fs.statSync(f).size, 0)} B\n  ` + l.join("\n  ")));
  console.log(`${levels.flat().length} files in ${levels.length} levels`);
}
