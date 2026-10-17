// One source, many apps (PCA J110, step 1).
//
// Makes one app's site from this repository's one source, using that app's
// settings file app/apps/<id>.json. app/apps/msa.json is today's MSA: it says
// what the source holds now, and every rule below reads "the MSA value" from
// it and writes "this app's value" in its place. So:
//
//   - building "msa" changes nothing, and the output is the source byte for
//     byte (tools/apps/apps-build-check.mjs proves it on every run);
//   - every rule COUNTS what it finds and stops the build when the source no
//     longer says what msa.json says (a renamed title, a moved cache name), so
//     a drift fails loudly instead of leaving half an app in MSA's name;
//   - every occurrence of an MSA-only value in app/ must be covered by a rule,
//     so a new place that writes "Madrasah Study App (MSA)" or "mm-app-" cannot
//     slip through into another app unchanged.
//
// Usage (from the repository root):
//   node tools/apps/build-app.mjs <id> [--out=build/<id>] [--only=app,index.html] [--src=.]
// The output folder is replaced. build/ is git-ignored. app/apps/ itself is
// never copied into an app: it is the settings, not part of the site.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const DASH = " — ";
const TEXT_EXT = new Set([".html", ".js", ".mjs", ".css", ".json", ".webmanifest", ".txt", ".svg"]);
const SETTINGS_DIR = "app/apps";

export function readSettings(src, id) {
  const file = path.join(src, SETTINGS_DIR, `${id}.json`);
  const s = JSON.parse(fs.readFileSync(file, "utf8"));
  if (s.id !== id) throw new Error(`${file}: id is "${s.id}", expected "${id}"`);
  return s;
}

function count(text, needle) {
  if (!needle) return 0;
  let n = 0;
  for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + needle.length)) n++;
  return n;
}

function replaceAll(text, from, to) {
  return from === to ? text : text.split(from).join(to);
}

// Every file of the site, as repository-relative paths, sorted.
function listSite(src, site) {
  const out = [];
  const walk = (rel) => {
    const abs = path.join(src, rel);
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (rel === SETTINGS_DIR) return;
      for (const name of fs.readdirSync(abs).sort()) walk(path.posix.join(rel, name));
    } else if (st.isFile()) out.push(rel);
  };
  for (const p of site) walk(p);
  return out.sort();
}

function validate(s, base, src) {
  const need = ["schema", "id", "address", "name", "titlePrefix", "siteRootName", "frontPage", "colours", "cachePrefix", "hiddenModules", "site"];
  for (const k of need) if (!(k in s)) throw new Error(`settings "${s.id}": "${k}" is missing`);
  if (s.schema !== 1) throw new Error(`settings "${s.id}": schema ${s.schema} is not 1`);
  if (!s.name?.full?.en || !s.name?.full?.bn || !s.name?.short) throw new Error(`settings "${s.id}": name.full.en, name.full.bn and name.short are all needed`);
  if (!/^https:\/\/[a-z0-9.-]+\/$/.test(s.address)) throw new Error(`settings "${s.id}": address "${s.address}" must be https://<host>/`);
  if (!/^[a-z][a-z0-9]*$/.test(s.cachePrefix)) throw new Error(`settings "${s.id}": cachePrefix "${s.cachePrefix}" must be lower-case letters and digits`);
  if (s.cachePrefix !== base.cachePrefix && s.address === base.address) throw new Error(`settings "${s.id}": shares MSA's address, so it must share its cache names`);
  if (!fs.existsSync(path.join(src, "app", s.frontPage))) throw new Error(`settings "${s.id}": front page app/${s.frontPage} does not exist`);
  // hidden-modules.js can only hide what nav.js tags with a moduleId.
  const nav = fs.readFileSync(path.join(src, "app/js/nav.js"), "utf8");
  const known = new Set([...nav.matchAll(/moduleId: "([a-z0-9-]+)"/g)].map((m) => m[1]));
  for (const m of s.hiddenModules) if (!known.has(m)) throw new Error(`settings "${s.id}": hidden module "${m}" is not one nav.js can hide (known: ${[...known].join(", ")})`);
  for (const c of ["theme", "background"]) {
    const v = s.colours[c];
    if (v !== null && !/^#[0-9a-fA-F]{6}$/.test(v)) throw new Error(`settings "${s.id}": colours.${c} "${v}" must be null or #rrggbb`);
  }
  // An app's own files live outside app/, so MSA's site never serves them under /app/.
  if (s.overlay && (s.overlay === "app" || s.overlay.startsWith("app/"))) throw new Error(`settings "${s.id}": overlay must be outside app/ (it is "${s.overlay}")`);
  if (s.afterBuild && (s.afterBuild.startsWith("app/") || !fs.existsSync(path.join(src, s.afterBuild)))) throw new Error(`settings "${s.id}": afterBuild ${s.afterBuild} must exist outside app/`);
  if (s.edits && !fs.existsSync(path.join(src, s.edits))) throw new Error(`settings "${s.id}": edits file ${s.edits} does not exist`);
  if (s.manifest) {
    for (const k of ["file", "pages", "data"]) if (!(k in s.manifest)) throw new Error(`settings "${s.id}": manifest.${k} is missing`);
    if (!/^[a-z0-9-]+\.webmanifest$/.test(s.manifest.file)) throw new Error(`settings "${s.id}": manifest.file must be <name>.webmanifest in app/`);
  }
}

// The rules. Each names its files, what MSA's settings say is there, what this
// app puts instead, and how many it must find (exact, or at least min).
function rules(base, s) {
  const r = [];
  const add = (files, from, to, want, why) => r.push({ files, from, to, want, why });
  const html = (p) => p.startsWith("app/") && p.endsWith(".html");

  add(html, `<title>${base.titlePrefix}${DASH}`, `<title>${s.titlePrefix}${DASH}`, { min: 25 }, "page titles");
  add((p) => p === "app/js/i18n/bn.js", `"${base.titlePrefix}${DASH}`, `"${s.titlePrefix}${DASH}`, { min: 50 }, "Bangla page titles (key and value)");
  const strip = "(?:QuranRevival|MSA)";
  const stripTo = ["QuranRevival", "MSA"].includes(s.titlePrefix) ? strip : `(?:QuranRevival|MSA|${s.titlePrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`;
  add((p) => p === "app/js/bookmark-nav.js", `/^${strip}\\s*[—-]\\s*/`, `/^${stripTo}\\s*[—-]\\s*/`, { exact: 1 }, "bookmark names drop the app's title prefix");

  const fb = base.name.full, fs_ = s.name.full;
  add((p) => p === "app/js/i18n/bn.js", `${JSON.stringify(fb.en)}: ${JSON.stringify(fb.bn)}`, `${JSON.stringify(fs_.en)}: ${JSON.stringify(fs_.bn)}`, { exact: 1 }, "the app's full name in Bangla");
  add((p) => p === "app/index.html", `<title>${fb.en}</title>`, `<title>${fs_.en}</title>`, { exact: 1 }, "app/index.html title");
  // MSA's name markup lives in MSA's front page. An app with another front page
  // keeps these on that page (it is still a page of the app) and brings its own
  // front page's heading as an overlay file.
  const namePage = `app/${base.frontPage}`;
  add((p) => p === namePage, `<title>${fb.en}</title>`, `<title>${fs_.en}</title>`, { exact: 1 }, "front page title");
  add((p) => p === namePage, `<span class="app-name-full">${fb.en}</span>`, `<span class="app-name-full">${fs_.en}</span>`, { exact: 1 }, "front page heading");
  add((p) => p === namePage, `.app-name-short::before { content: ${JSON.stringify(base.name.short)}; }`, `.app-name-short::before { content: ${JSON.stringify(s.name.short)}; }`, { exact: 1 }, "the heading's short name below 700px");

  add((p) => p === "index.html", `<title>${base.siteRootName}</title>`, `<title>${s.siteRootName}</title>`, { exact: 1 }, "site root title");
  add((p) => p === "index.html", `Taking you to ${base.siteRootName}…`, `Taking you to ${s.siteRootName}…`, { exact: 1 }, "site root text");
  add((p) => p === "app/index.html", `Continue to ${base.siteRootName}</a>`, `Continue to ${s.siteRootName}</a>`, { exact: 1 }, "app/index.html no-script link");
  add((p) => p === "index.html", `/app/${base.frontPage}`, `/app/${s.frontPage}`, { exact: 3 }, "site root goes to the front page");
  add((p) => p === "app/index.html", `"${base.frontPage}"`, `"${s.frontPage}"`, { exact: 2 }, "app/index.html goes to the front page");

  // Exact counts: each cache's name, its clean-up test, and (for the fonts) one comment.
  // A cache renamed or added in sw.js must be counted here, or an app would keep MSA's name.
  const CACHES = { '"': { app: 2, "qf-fonts": 3, ext: 2, mushaf: 2 }, "`": { app: 1, "qf-fonts": 0, ext: 0, mushaf: 0 } };
  for (const [q, names] of Object.entries(CACHES)) {
    for (const [name, n] of Object.entries(names)) {
      add((p) => p === "app/sw.js", `${q}${base.cachePrefix}-${name}-`, `${q}${s.cachePrefix}-${name}-`, { exact: n }, `offline cache "${name}"`);
    }
  }

  const hid = (list) => `export const HIDDEN_FROM_QR = [${list.map((m) => JSON.stringify(m)).join(", ")}];`;
  add((p) => p === "app/js/hidden-modules.js", hid(base.hiddenModules), hid(s.hiddenModules), { exact: 1 }, "modules hidden from this app");
  return r;
}

// Values that belong to MSA alone: every occurrence in app/ must sit inside
// some rule's find text, or the build stops.
function msaOnlyValues(base, s) {
  const v = [];
  if (s.name.full.en !== base.name.full.en) v.push(base.name.full.en);
  if (s.cachePrefix !== base.cachePrefix) for (const n of ["app", "qf-fonts", "ext", "mushaf"]) v.push(`${base.cachePrefix}-${n}-`);
  if (s.titlePrefix !== base.titlePrefix) v.push(`${base.titlePrefix}${DASH}`);
  return v;
}

// Comments may name MSA (the source's own history); only code and markup count.
function stripComments(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

function headInsert(text, tags, file) {
  const at = text.indexOf("</head>");
  if (at === -1) throw new Error(`${file}: no </head> to add ${tags.trim()} to`);
  return text.slice(0, at) + tags + text.slice(at);
}

export function buildApp({ id, settings, src = ".", out, only } = {}) {
  src = path.resolve(src);
  const base = readSettings(src, "msa");
  const s = settings || readSettings(src, id);
  id = s.id;
  validate(base, base, src);
  validate(s, base, src);
  out = path.resolve(out || path.join(src, "build", id));
  // The output folder is deleted first, so it must not be, hold or sit inside anything the build reads.
  const inputs = [src, ...s.site.map((p) => path.join(src, p)), path.join(src, SETTINGS_DIR), ...(s.overlay ? [path.join(src, s.overlay)] : []), ...(s.edits ? [path.join(src, s.edits)] : [])];
  const overlaps = (a, b) => a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep);
  for (const i of inputs) {
    if (i === src ? (out === src || src.startsWith(out + path.sep)) : overlaps(out, i)) throw new Error(`refusing to write the app over its own source (${out})`);
  }
  const site = only ? s.site.filter((p) => only.includes(p)) : s.site;
  // A site path is in the source, or (for an app's own file) in its overlay folder.
  const inOverlay = (p) => s.overlay && fs.existsSync(path.join(src, s.overlay, p));
  for (const p of site) if (!fs.existsSync(path.join(src, p)) && !inOverlay(p)) throw new Error(`settings "${id}": site path ${p} does not exist`);
  const srcSite = site.filter((p) => fs.existsSync(path.join(src, p)));
  const files = listSite(src, srcSite);

  const rs = rules(base, s);
  const found = rs.map(() => 0);
  const changed = new Map(); // rel -> new text
  const textOf = (rel) => changed.get(rel) ?? fs.readFileSync(path.join(src, rel), "utf8");

  // This app's own hunks on shared files (settings "edits"), applied to the
  // source BEFORE the rules, each found exactly as often as it says.
  const edits = s.edits ? JSON.parse(fs.readFileSync(path.join(src, s.edits), "utf8")) : [];
  const editProblems = [];
  for (const e of edits) {
    if (!e.file || typeof e.from !== "string" || typeof e.to !== "string" || !e.from) { editProblems.push(`edit ${e.id || "?"}: file, from and to are needed`); continue; }
    if (!fs.existsSync(path.join(src, e.file))) { editProblems.push(`edit ${e.id}: ${e.file} does not exist`); continue; }
    const t = textOf(e.file), n = count(t, e.from), want = e.exact ?? 1;
    if (n !== want) { editProblems.push(`edit ${e.id} (${e.why || ""}): found ${n} of its text in ${e.file}, expected ${want}`); continue; }
    changed.set(e.file, replaceAll(t, e.from, e.to));
  }
  if (editProblems.length) throw new Error(`cannot build "${id}": an edit no longer fits the source\n  - ${editProblems.join("\n  - ")}`);
  // Rules apply to the whole source tree's app/ and index.html, whatever --only says,
  // so a partial build can never skip a count.
  const ruleFiles = listSite(src, ["index.html", "app"]);
  for (const rel of ruleFiles) {
    if (!TEXT_EXT.has(path.extname(rel))) continue;
    rs.forEach((rule, i) => {
      if (!rule.files(rel)) return;
      const t = textOf(rel);
      const n = count(t, rule.from);
      if (!n) return;
      found[i] += n;
      if (rule.from !== rule.to) changed.set(rel, replaceAll(t, rule.from, rule.to));
    });
  }
  const problems = [];
  rs.forEach((rule, i) => {
    const n = found[i], w = rule.want;
    if (("exact" in w && n !== w.exact) || ("min" in w && n < w.min)) {
      problems.push(`${rule.why}: found ${n} of ${JSON.stringify(rule.from)}, expected ${"exact" in w ? w.exact : "at least " + w.min}`);
    }
  });
  // Leftovers: an MSA-only value still in app/ code or markup after every rule ran.
  for (const v of msaOnlyValues(base, s)) {
    for (const rel of ruleFiles) {
      if (!TEXT_EXT.has(path.extname(rel))) continue;
      const n = count(stripComments(textOf(rel)), v);
      if (n) problems.push(`${rel} still says ${JSON.stringify(v)} ${n} time(s) outside comments after the build: no rule covers it`);
    }
  }
  if (problems.length) throw new Error(`cannot build "${id}": the source no longer matches app/apps/msa.json or a rule\n  - ${problems.join("\n  - ")}`);

  // Theme colour and manifest: added to pages only when this app has them and MSA does not.
  const extra = new Map(); // rel -> new file text (files the build adds)
  if (s.colours.theme && s.colours.theme !== base.colours.theme) {
    for (const rel of ruleFiles.filter((p) => p.endsWith(".html") && (p === "index.html" || p.startsWith("app/")))) {
      const t = textOf(rel);
      if (/<meta name="theme-color"/.test(t)) continue;
      changed.set(rel, headInsert(t, `<meta name="theme-color" content="${s.colours.theme}">\n`, rel));
    }
  }
  if (s.manifest && JSON.stringify(s.manifest) !== JSON.stringify(base.manifest)) {
    const m = s.manifest;
    const data = { ...m.data };
    if (s.colours.theme && !data.theme_color) data.theme_color = s.colours.theme;
    if (s.colours.background && !data.background_color) data.background_color = s.colours.background;
    for (const icon of data.icons || []) {
      if (!fs.existsSync(path.join(src, "app", icon.src))) throw new Error(`cannot build "${id}": manifest icon app/${icon.src} does not exist`);
    }
    extra.set(`app/${m.file}`, JSON.stringify(data, null, 2) + "\n");
    for (const page of m.pages) {
      const rel = `app/${page}`;
      if (!fs.existsSync(path.join(src, rel))) throw new Error(`cannot build "${id}": manifest page ${rel} does not exist`);
      const t = textOf(rel);
      if (/<link rel="manifest"/.test(t)) throw new Error(`cannot build "${id}": ${rel} already has a manifest link`);
      const href = path.posix.relative(path.posix.dirname(rel), `app/${m.file}`);
      changed.set(rel, headInsert(t, `<link rel="manifest" href="${href.includes("/") ? href : "./" + href}">\n`, rel));
    }
  }
  if (s.icon) {
    if (!fs.existsSync(path.join(src, "app", s.icon))) throw new Error(`cannot build "${id}": icon app/${s.icon} does not exist`);
    for (const rel of ruleFiles.filter((p) => p.startsWith("app/") && p.endsWith(".html"))) {
      const t = textOf(rel);
      if (/<link rel="icon"/.test(t)) continue;
      const href = path.posix.relative(path.posix.dirname(rel), `app/${s.icon}`);
      changed.set(rel, headInsert(t, `<link rel="icon" href="${href}">\n`, rel));
    }
  }

  // This app's own whole files (settings "overlay": a folder laid out like the
  // site), added or put in place of the source's file. A file both edited and
  // overlaid is a mistake: one of the two would be lost silently.
  const overlay = new Map(); // rel -> absolute source file
  if (s.overlay) {
    const root = path.join(src, s.overlay);
    if (!fs.existsSync(root)) throw new Error(`cannot build "${id}": overlay folder ${s.overlay} does not exist`);
    for (const rel of listSite(root, fs.readdirSync(root).sort())) {
      const under = (list) => list.some((p) => rel === p || rel.startsWith(p + "/"));
      if (!under(s.site)) throw new Error(`cannot build "${id}": overlay file ${rel} is outside the app's site`);
      if (!under(site)) continue; // left out by --only
      if (edits.some((e) => e.file === rel)) throw new Error(`cannot build "${id}": ${rel} is both edited and overlaid`);
      overlay.set(rel, path.join(root, rel));
    }
  }

  fs.rmSync(out, { recursive: true, force: true });
  let copied = 0, written = 0;
  for (const rel of files) {
    const dest = path.join(out, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (changed.has(rel)) { fs.writeFileSync(dest, changed.get(rel)); written++; }
    else { fs.copyFileSync(path.join(src, rel), dest, fs.constants.COPYFILE_FICLONE); copied++; }
  }
  for (const [rel, text] of extra) {
    if (!files.length || !site.some((p) => rel === p || rel.startsWith(p + "/"))) continue;
    const dest = path.join(out, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, text); written++;
  }
  const replaced = [], added = [];
  for (const [rel, abs] of overlay) {
    const dest = path.join(out, rel);
    (fs.existsSync(dest) ? replaced : added).push(rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(abs, dest);
  }
  // The app's own last step (settings "afterBuild": a script run with the output folder), e.g. QR's worker block.
  let after = null;
  if (s.afterBuild) {
    try {
      const so = execFileSync(process.execPath, [path.join(src, s.afterBuild), out], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, APPS_SETTINGS: JSON.stringify(s) } });
      after = JSON.parse(so.trim().split("\n").pop());
    } catch (e) {
      throw new Error(`cannot build "${id}": its after-build step failed: ${(e.stderr || e.message || "").toString().trim()}`);
    }
  }
  return { id, out, after, files: files.length + extra.size + added.length, copied, written, overlaid: { replaced: replaced.sort(), added: added.sort() }, edited: [...new Set(edits.map((e) => e.file))].sort(), changedFiles: [...changed.keys()].filter((r) => files.includes(r)).sort(), addedFiles: [...extra.keys()].sort() };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const id = args.find((a) => !a.startsWith("--"));
  const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  if (!id) { console.error("usage: node tools/apps/build-app.mjs <id> [--out=DIR] [--only=a,b] [--src=DIR]"); process.exit(2); }
  try {
    const r = buildApp({ id, src: opt("src") || ".", out: opt("out"), only: opt("only")?.split(",") });
    console.log(`built "${r.id}" into ${path.relative(process.cwd(), r.out) || "."}: ${r.files} files (${r.written} written by rules, ${r.copied} copied)`);
    for (const f of r.changedFiles) console.log(`  changed ${f}`);
    for (const f of r.addedFiles) console.log(`  added   ${f}`);
    for (const f of r.overlaid.replaced) console.log(`  own     ${f} (in place of the source's)`);
    for (const f of r.overlaid.added) console.log(`  own     ${f}`);
    if (r.after) console.log(`  after-build: ${JSON.stringify(r.after)}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
