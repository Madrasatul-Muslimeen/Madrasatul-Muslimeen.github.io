/**
 * Builds APP-SOURCE-BUNDLE.html — the whole application's source in one
 * self-contained, offline HTML file (no CDN, no network, nothing external).
 *
 * Run from the repository root:   node tools/source-bundle/build.mjs
 *
 * What it includes and why is declared in SECTIONS below. It deliberately
 * does NOT include the two frozen archives (`legacy/`, `legacy-v07/`), the
 * Qur'an data pull, the Mushaf images, the harness under `tools/`, or the
 * binary fonts — those are reference material or data, not application code.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, basename } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "APP-SOURCE-BUNDLE.html");

/* ------------------------------------------------------------------ */
/* what goes in                                                        */
/* ------------------------------------------------------------------ */

const SECTIONS = [
  { label: "Pages", dir: "app", match: /\.html$/ },
  { label: "Modules", dir: "app/js", match: /\.js$/ },
  { label: "Translations", dir: "app/js/i18n", match: /\.js$/ },
  { label: "Styles", dir: "app/css", match: /\.css$/ },
  { label: "Project root & security rules", files: ["index.html", "firestore.rules", "firebase.json"] },
];

function listDir(dir, match) {
  return readdirSync(join(ROOT, dir))
    .filter((n) => match.test(n))
    .filter((n) => statSync(join(ROOT, dir, n)).isFile())
    .sort()
    .map((n) => `${dir}/${n}`);
}

const groups = [];
const files = [];
const seen = new Set();

for (const s of SECTIONS) {
  const paths = (s.files ?? listDir(s.dir, s.match)).filter((p) => !seen.has(p));
  for (const p of paths) {
    seen.add(p);
    const code = readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n").replace(/\s+$/, "");
    files.push({
      path: p,
      name: basename(p),
      lines: code.split("\n").length,
      bytes: Buffer.byteLength(code, "utf8"),
      code,
    });
  }
  groups.push({ label: s.label, paths });
}

/* ------------------------------------------------------------------ */
/* facts about this build                                              */
/* ------------------------------------------------------------------ */

const appVersion =
  readFileSync(join(ROOT, "app/js/version.js"), "utf8").match(/APP_VERSION\s*=\s*"([^"]+)"/)?.[1] ?? "unknown";

const sh = (cmd) => {
  try { return execSync(cmd, { cwd: ROOT }).toString().trim(); } catch { return "unknown"; }
};

const meta = {
  appVersion,
  commit: sh("git rev-parse --short HEAD"),
  commitDate: sh("git log -1 --format=%cd --date=short"),
  generated: new Date().toISOString().slice(0, 10),
  fileCount: files.length,
  lineCount: files.reduce((n, f) => n + f.lines, 0),
  byteCount: files.reduce((n, f) => n + f.bytes, 0),
  groups,
};

const n = (x) => x.toLocaleString("en-US");

meta.introHtml = `
  <h1>QuranRevival — the whole application, in one file</h1>
  <p class="lede">
    Every line of source the live app is built from: <strong>${n(meta.fileCount)} files,
    ${n(meta.lineCount)} lines</strong>, at version <strong>v${meta.appVersion}</strong>
    (commit <code>${meta.commit}</code>, ${meta.commitDate}). Pick a file from the
    list — press <strong>&#9776; Files</strong> first on a phone — or search across
    all of them at once.
  </p>

  <div class="note">
    <strong>Handing this to someone — or to another AI — for review?</strong>
    Press <strong>Copy everything</strong> in the bar above to put all
    ${n(meta.fileCount)} files on the clipboard as plain text with
    <code>FILE:</code> separators, or <strong>Download .txt</strong> to save the
    same thing as a file. This page needs no internet connection and loads
    nothing from anywhere.
  </div>

  <h2>What this app is</h2>
  <p>
    A multi-tenant Madrasah study platform. <strong>Vanilla ES modules, no build
    step, no framework</strong> — what is in these files is exactly what the
    browser runs. Firebase/Firestore for data (modular SDK, loaded from Google's
    CDN at runtime), static hosting on GitHub Pages. Live at
    <code>madrasatul-muslimeen.github.io/app/</code>.
  </p>

  <h2>How to find your way around</h2>
  <table>
    <tr><th>If you want…</th><th>Look at</th></tr>
    <tr><td>The entry point</td><td><code>app/index.html</code> — sign-in and boot</td></tr>
    <tr><td>The Qur'an study module</td><td><code>app/quranrevival.html</code> — markup, CSS and one inline module script, the largest file here</td></tr>
    <tr><td>How data is read and written</td><td><code>app/js/records.js</code>, <code>activity.js</code>, <code>unit-keys.js</code></td></tr>
    <tr><td>Who may see or do what</td><td><code>firestore.rules</code> — enforced by the server, not the browser</td></tr>
    <tr><td>Bangla / English text</td><td><code>app/js/i18n.js</code> and <code>app/js/i18n/</code></td></tr>
    <tr><td>Shared page chrome</td><td><code>app/js/nav.js</code>, <code>app/css/shell.css</code></td></tr>
  </table>

  <h2>What is deliberately not here</h2>
  <p>
    The two frozen archives (<code>legacy/index.html</code>, the v06 single-file
    app; <code>legacy-v07/</code>, frozen at v07.139) — both are reference-only
    copies, not the live code. Also excluded: the Qur'an text data under
    <code>tools/quran-data-pull/output</code> and the 604 Mushaf page images
    (data, not code, and ~130 MB between them), the test harness under
    <code>tools/</code>, the project's own status and planning documents, and
    the three binary font files.
  </p>

  <h2>One thing worth knowing</h2>
  <p>
    <code>app/js/firebase-init.js</code> carries a Firebase <code>apiKey</code>.
    That is not a secret — it is a public project identifier, it is already
    served to every visitor of the live site, and access is controlled by
    <code>firestore.rules</code>, which is included here so a reviewer can
    check it.
  </p>

  <h2>Regenerating this file</h2>
  <p>
    From the repository root: <code>node tools/source-bundle/build.mjs</code>.
    It reads the files straight off disk, so it is always a true copy of
    whatever is checked out.
  </p>
`.trim();

/* ------------------------------------------------------------------ */
/* emit                                                                */
/* ------------------------------------------------------------------ */

/**
 * JSON that is safe inside a <script> element: with every `<` escaped there
 * can be no `</script>` in the payload, whatever the source code contains.
 */
function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

const template = readFileSync(join(ROOT, "tools/source-bundle/template.html"), "utf8");
const html = template
  .replace("__SOURCE_JSON__", () => jsonForScript(files))
  .replace("__META_JSON__", () => jsonForScript(meta));

if (html.includes("__SOURCE_JSON__") || html.includes("__META_JSON__")) {
  throw new Error("placeholder not substituted — template.html changed?");
}

writeFileSync(OUT, html, "utf8");

console.log(
  `APP-SOURCE-BUNDLE.html — v${meta.appVersion}, ${meta.fileCount} files, ` +
  `${n(meta.lineCount)} lines, ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB`
);
for (const g of groups) console.log(`  ${String(g.paths.length).padStart(3)}  ${g.label}`);
