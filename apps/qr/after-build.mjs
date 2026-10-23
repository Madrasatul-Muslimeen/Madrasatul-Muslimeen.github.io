// QR's last build step (PCA J110 step 3). Run by tools/apps/build-app.mjs with the built site's folder:
//   node apps/qr/after-build.mjs <out>
// Today's QR worker (apps/qr/site/app/sw.js, QR's own, with its proven upgrade path for phones already using
// QR) gets its generated block filled in for the BUILT app, as QR's tools/qr-sw/make-precache.mjs did in QR's repo:
//   - APP_VERSION = MSA's one number (app/js/version.js; QR J22), also written to app/js/qr-version.js, which
//     QR's front page and register read;
//   - SHELL = every page QR saves at install, every script it reaches, and the styles, fonts and images they link.
// It refuses a version below minVersion: frozen QR is v11.38, and QR's worker will not install a version it is
// already running, so a built QR stamped 11.38 would leave today's phones on the old QR for good.
// It also refuses a worker whose install list names a file the build does not have (an install that fetches a
// missing file fails, and the phone never gets the new version).
// Prints one JSON line: { written: [...] }.

import fs from "node:fs";
import path from "node:path";
import { stripSite } from "./strip-site.mjs";

const out = path.resolve(process.argv[2] || "");
// The settings the build used (it passes them in, so a test's settings are honoured), else app/apps/qr.json.
const settings = process.env.APPS_SETTINGS ? JSON.parse(process.env.APPS_SETTINGS) : JSON.parse(fs.readFileSync(new URL("../../app/apps/qr.json", import.meta.url), "utf8"));
const app = (f) => path.join(out, "app", f);
if (!fs.existsSync(app("sw.js"))) { console.error(`after-build: ${app("sw.js")} is missing`); process.exit(1); }

// The pages QR saves at install (QR's make-precache PAGES).
export const PAGES = ["index.html", "quranrevival.html", "ldog-study.html", "journey-map.html"];
const IMPORT = /(?:(?:import|export)\s[^'"]*?from\s*|import\s*\(\s*|import\s+)["'](\.{1,2}\/[^"']+\.js)["']/g;

const version = fs.readFileSync(app("js/version.js"), "utf8").match(/APP_VERSION = "([\d.]+)"/)?.[1];
if (!version) { console.error("after-build: no APP_VERSION in app/js/version.js"); process.exit(1); }
const num = (v) => v.split(".").map(Number);
const below = (a, b) => { const [x, y] = [num(a), num(b)]; return x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]); };
// Enforced from the day QR's status is "live" (step 5: the build that replaces today's QR); a draft may be
// built at any number for testing.
if (settings.status !== "draft" && settings.minVersion && below(version, settings.minVersion)) {
  console.error(`after-build: version ${version} is below QR's minVersion ${settings.minVersion} (frozen QR is v11.38; a phone running it would refuse a worker of the same or an older number as "already running")`);
  process.exit(1);
}
fs.writeFileSync(app("js/qr-version.js"),
  `// Written by apps/qr/after-build.mjs: QR shares MSA's one version number (QR J22, PCA J110).\nexport const APP_VERSION = ${JSON.stringify(version)};\n`);

// Audit part 50, part 2 (PCF MSA J29): about half of what a first visit downloaded was COMMENTS. The built page's inline module and
// style, and every built app/**/*.js but the worker and vendor/, lose theirs here (apps/qr/strip-site.mjs; lines and every token kept,
// each file checked by apps/qr/verify-strip.mjs, and the build stops on any difference). The source keeps every comment; MSA's build
// never reaches this step.
// Before the worker's list, so its size is what a phone saves.
let strip;
try { strip = stripSite(out, { keepBefore: process.env.QR_STRIP_BEFORE || "" }); }
catch (e) { console.error(`after-build: ${e.message}`); process.exit(1); }

function shellList(sw) {
  const seen = new Set();
  const walk = (f) => {
    if (seen.has(f)) return; seen.add(f);
    for (const m of fs.readFileSync(f, "utf8").matchAll(IMPORT)) { const p = path.normalize(path.join(path.dirname(f), m[1])); if (fs.existsSync(p)) walk(p); }
  };
  const extra = new Set();
  for (const page of PAGES) {
    walk(app(page));
    const html = fs.readFileSync(app(page), "utf8");
    for (const m of html.matchAll(/(?:href|src)="(?:\.\/)?((?:css|vendor|img|fonts)\/[^"#?]+)"/g)) extra.add(app(m[1]));
    for (const m of html.matchAll(/url\(['"]?(?:\.\/)?(fonts\/[^'")]+)['"]?\)/g)) extra.add(app(m[1]));
    for (const m of html.matchAll(/<script[^>]*\ssrc="(?:\.\/)?(js\/[^"#?]+\.js)"/g)) walk(app(m[1]));
  }
  walk(app("js/qr-copied-page.js")); // sw.js adds it to each copied page as it serves it
  for (const css of [...extra].filter((f) => f.endsWith(".css") && fs.existsSync(f))) {
    for (const m of fs.readFileSync(css, "utf8").matchAll(/url\(['"]?\.\.\/((?:fonts|img)\/[^'")]+)['"]?\)/g)) extra.add(app(m[1]));
  }
  const asma = precacheList(sw);
  return [...new Set([...seen, ...extra])].filter((f) => fs.existsSync(f)).map((f) => path.relative(path.join(out, "app"), f)).filter((f) => !asma.includes(f)).sort();
}
function precacheList(sw) {
  const a = sw.indexOf("const PRECACHE = [");
  if (a < 0) throw new Error("app/sw.js has no PRECACHE list");
  return [...sw.slice(a, sw.indexOf("];", a)).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

let sw = fs.readFileSync(app("sw.js"), "utf8");
const a = sw.indexOf("// BEGIN GENERATED BY tools/qr-sw/make-precache.mjs");
const b = sw.indexOf("// END GENERATED", a);
if (a < 0 || b < 0) { console.error("after-build: app/sw.js has no generated block"); process.exit(1); }
const list = shellList(sw);
const bytes = list.reduce((n, f) => n + fs.statSync(app(f)).size, 0);
sw = sw.slice(0, a) + `// BEGIN GENERATED BY tools/qr-sw/make-precache.mjs
const APP_VERSION = ${JSON.stringify(version)}; // = app/js/qr-version.js
// The shell of Quran Study, LDOG and the pages they open, saved at install besides Asma's list: ${list.length} files, ${(bytes / 1e6).toFixed(2)} MB.
const SHELL = ${JSON.stringify(list, null, 2)};
` + sw.slice(b);
// Every file the worker saves at install must be in the build (the Asma list may name ../tools/… data).
const missing = [...precacheList(sw), ...list].filter((f) => !fs.existsSync(path.join(out, "app", f)));
if (missing.length) { console.error(`after-build: the worker's install list names files the build does not have: ${missing.join(", ")}`); process.exit(1); }
fs.writeFileSync(app("sw.js"), sw);

// Audit part 50 (PCF MSA J29): QR's first visit took 8 s to a usable picker, mostly the module waterfall (137 files whose
// imports are found one hop at a time). The page's STATIC import closure (never import()) is written into the page (see WHERE) as
// modulepreload links, so the browser asks for all of them at once. Generated here, never hand-written, so it cannot go
// stale. QR-only because this step runs for QR alone (MSA's build never reaches it and stays byte for byte); not an
// edits.json edit because an edit is a fixed text and this list changes whenever anyone adds an import.
const STATIC_IMPORT = /(?:import|export)\s[^'"();]*?from\s*["'](\.{1,2}\/[^"']+\.js)["']|import\s+["'](\.{1,2}\/[^"']+\.js)["']/g;
function staticClosure(pageFile) {
  const html = fs.readFileSync(pageFile, "utf8");
  const seen = new Set();
  const walk = (src, dir) => {
    for (const m of src.matchAll(STATIC_IMPORT)) {
      const p = path.normalize(path.join(dir, m[1] || m[2]));
      if (seen.has(p) || !fs.existsSync(p)) continue;
      seen.add(p);
      walk(fs.readFileSync(p, "utf8"), path.dirname(p));
    }
  };
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/type="module"/.test(m[1])) continue;
    const s = m[1].match(/\ssrc="(?:\.\/)?([^"#?]+\.js)"/);
    if (s) { const p = path.join(path.dirname(pageFile), s[1]); if (fs.existsSync(p) && !seen.has(p)) { seen.add(p); walk(fs.readFileSync(p, "utf8"), path.dirname(p)); } }
    else walk(m[2], path.dirname(pageFile));
  }
  return [...seen].map((f) => "./" + path.relative(path.dirname(pageFile), f).split(path.sep).join("/")).sort();
}
const page = app("quranrevival.html");
const links = staticClosure(page);
if (!links.length) { console.error("after-build: quranrevival.html has no static module imports to preload (the walker is broken)"); process.exit(1); }
// WHERE: just before the page's first module script, not at the top of <head>. Measured (390 px, 1.6 Mbps / 150 ms, student,
// 24 Oct 2026): top of <head> made the picker usable at 7053 ms but put first paint at 1548 ms (main: 888), because 1.1 MB
// of modules then shared the link with the 456 KB <head> and the landing markup; before the first module script, first
// paint stays 884 ms and usable is 7489 ms; at the end of <body> nothing was gained (8096 ms).
const pageHtml = fs.readFileSync(page, "utf8");
const firstModule = pageHtml.search(/<script\b[^>]*type="module"/);
if (firstModule < 0) { console.error("after-build: quranrevival.html has no module script to put the preloads before"); process.exit(1); }
fs.writeFileSync(page, pageHtml.slice(0, firstModule) + links.map((h) => `<link rel="modulepreload" href="${h}">`).join("\n") + "\n" + pageHtml.slice(firstModule));

console.log(JSON.stringify({ written: ["app/js/qr-version.js", "app/sw.js", "app/quranrevival.html"], version, shell: list.length, bytes, modulepreload: links.length, stripped: strip }));
