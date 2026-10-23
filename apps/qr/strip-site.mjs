// Audit part 50, part 2 (PCF MSA J29): strips the comments out of the BUILT QR site (run by after-build.mjs; the source keeps them):
// quranrevival.html's inline module scripts and <style>s, and every built app/**/*.js except QR's worker (app/sw.js, whose generated
// block after-build.mjs fills in) and app/vendor/ (third-party, as shipped). Every stripped text is checked by apps/qr/verify-strip.mjs
// against what it was, token for token and line for line, and must still parse; any failure throws, naming the file, and the build stops.
// keepBefore (after-build passes QR_STRIP_BEFORE) saves every text as it was before the strip, at the same path under that folder, for
// strip-comments-check.mjs to compare with TypeScript's scanner. The stripper is a parameter only so tools/apps/qr-verify/strip-comments-check.mjs can hand it a broken one and see the build refuse.
import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import * as real from "./strip-comments.mjs";
import { verifyStrip } from "./verify-strip.mjs";

export const PAGE = "quranrevival.html";
export function strippableFiles(out) {
  const root = path.join(out, "app"), found = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name), rel = path.relative(root, f).split(path.sep).join("/");
      if (e.isDirectory()) { if (rel !== "vendor") walk(f); }
      else if (e.name.endsWith(".js") && rel !== "sw.js") found.push(rel);
    }
  };
  walk(root);
  return found.sort();
}

export function stripSite(out, { stripJs = real.stripJs, stripCss = real.stripCss, keepBefore = "" } = {}) {
  const app = (f) => path.join(out, "app", f);
  let before = 0, after = 0;
  const keep = (rel, text) => { if (!keepBefore) return; const f = path.join(keepBefore, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
  const one = (where, text, kind) => {
    let s;
    try { s = kind === "css" ? stripCss(text) : stripJs(text); } catch (e) { throw new Error(`${where}: the stripper could not read it (${e.message})`); }
    const why = verifyStrip(text, s, kind);
    if (why) throw new Error(`${where}: the strip changed more than comments -- ${why}`);
    before += text.length; after += s.length;
    return s;
  };
  let k = 0, c = 0;
  const page = fs.readFileSync(app(PAGE), "utf8");
  keep(`app/${PAGE}`, page);
  const html = page
    .replace(/(<script\b([^>]*)>)([\s\S]*?)(<\/script>)/g, (m, open, attrs, body, close) =>
      (/type="module"/.test(attrs) && !/\ssrc=/.test(attrs) ? open + one(`app/${PAGE} inline module ${++k}`, body, "js") + close : m))
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/g, (m, open, body, close) => open + one(`app/${PAGE} <style> ${++c}`, body, "css") + close);
  const files = strippableFiles(out);
  const stripped = files.map((f) => { const t = fs.readFileSync(app(f), "utf8"); keep(`app/${f}`, t); return [f, one(`app/${f}`, t, "js")]; });
  // Every stripped text must still parse, as a module (or, for a classic script, as a script): one Node process reads them all.
  const bad = parses([...[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter((m) => /type="module"/.test(m[1]) && !/\ssrc=/.test(m[1])).map((m, i) => [`app/${PAGE} inline module ${i + 1}`, m[2]]), ...stripped.map(([f, t]) => [`app/${f}`, t])]);
  if (bad) throw new Error(`${bad}: the stripped text does not parse`);
  // written only once every text has passed, so a refused strip leaves no half-stripped site
  fs.writeFileSync(app(PAGE), html);
  for (const [f, s] of stripped) fs.writeFileSync(app(f), s);
  return { files: files.length + 1, before, after };
}

// Returns the first text that parses neither as a module nor as a classic script, else "". (vm.SourceTextModule parses without running
// or linking anything; it needs --experimental-vm-modules, hence the separate process.)
function parses(texts) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qr-parse-"));
  try {
    const list = path.join(dir, "texts.json");
    fs.writeFileSync(list, JSON.stringify(texts));
    const code = `const vm = require("node:vm"); const texts = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
      for (const [where, t] of texts) { try { new vm.SourceTextModule(t); } catch (e) { try { new vm.Script(t); } catch { console.log(where + " (" + e.message + ")"); process.exit(0); } } }`;
    const r = spawnSync(process.execPath, ["--experimental-vm-modules", "--no-warnings", "-e", code, list], { encoding: "utf8" });
    if (r.status !== 0) throw new Error(`the parse check could not run: ${r.stderr}`);
    return r.stdout.trim();
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
