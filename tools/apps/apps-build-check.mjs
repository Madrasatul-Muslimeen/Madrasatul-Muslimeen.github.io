// PCA J110 step 1: proves the one-source build is safe for MSA and does what
// each settings file says for any other app. Run from the repository root:
//   node tools/apps/apps-build-check.mjs
// No browser, no network. Every negative check has its positive control, and
// the mutations at the end show each guard can fail.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { buildApp, readSettings } from "./build-app.mjs";

const SRC = process.cwd();
if (!fs.existsSync(path.join(SRC, "app/apps/msa.json"))) {
  console.error("run from the repository root (app/apps/msa.json not found here)");
  process.exit(2);
}
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "apps-build-"));
const ONLY = ["app", "index.html", "404.html", ".nojekyll", "tools/hadith-data-pull/output/asma-cited-hadith.json"]; // the data folders are copied as they are; no rule reads them (checked below)
let pass = 0, fail = 0;
function check(name, fn) {
  let ok;
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new Error("check bodies must be synchronous");
    ok = r !== false;
    if (!ok) console.log(`  FAIL ${name}`);
  } catch (e) {
    ok = false;
    console.log(`  FAIL ${name}: ${e.message.split("\n").join("\n       ")}`);
  }
  if (ok) { pass++; console.log(`  PASS ${name}`); } else fail++;
}
const throws = (fn, re) => {
  try { fn(); } catch (e) { if (re && !re.test(e.message)) throw new Error(`threw, but not as expected: ${e.message}`); return true; }
  throw new Error("did not throw");
};
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
function listFiles(root, rels) {
  const out = [];
  const walk = (rel) => {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    const st = fs.statSync(abs);
    if (st.isDirectory()) { for (const n of fs.readdirSync(abs).sort()) walk(path.posix.join(rel, n)); }
    else out.push(rel);
  };
  rels.forEach(walk);
  return out.sort();
}
// Byte-for-byte comparison of two trees over the given roots; returns the differences.
function compareTrees(a, b, roots, skip = () => false) {
  const fa = listFiles(a, roots).filter((f) => !skip(f)), fb = listFiles(b, roots).filter((f) => !skip(f));
  const diffs = [];
  const sb = new Set(fb);
  for (const f of fa) {
    if (!sb.has(f)) diffs.push(`missing ${f}`);
    else if (sha(path.join(a, f)) !== sha(path.join(b, f))) diffs.push(`differs ${f}`);
  }
  const sa = new Set(fa);
  for (const f of fb) if (!sa.has(f)) diffs.push(`extra ${f}`);
  return diffs;
}
const inSettings = (f) => f.startsWith("app/apps/");
const read = (root, f) => fs.readFileSync(path.join(root, f), "utf8");
function parsesAsModule(file) {
  const tmp = path.join(TMP, "parse-" + path.basename(file) + ".mjs");
  fs.copyFileSync(file, tmp);
  execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
  return true;
}

console.log("1. MSA built from its own settings is today's MSA, byte for byte");
const msaOut = path.join(TMP, "msa");
const msa = buildApp({ id: "msa", out: msaOut, only: ONLY });
check("the msa build writes no file through a rule", () => msa.written === 0 && msa.changedFiles.length === 0 && msa.addedFiles.length === 0);
check("positive control: the comparison sees app/ and index.html (over 200 files)", () => listFiles(SRC, ONLY).filter((f) => !inSettings(f)).length > 200);
check("every file of app/ and index.html is identical in the msa build (app/apps/ excepted)", () => {
  const d = compareTrees(SRC, msaOut, ONLY, inSettings);
  if (d.length) throw new Error(d.slice(0, 10).join("; "));
  return true;
});
check("the settings folder app/apps/ is never copied into an app", () => !fs.existsSync(path.join(msaOut, "app/apps")));
check("positive control: one changed byte in the build is seen", () => {
  const f = path.join(msaOut, "app/js/nav.js");
  const keep = fs.readFileSync(f);
  fs.writeFileSync(f, Buffer.concat([keep, Buffer.from(" ")]));
  const d = compareTrees(SRC, msaOut, ONLY, inSettings);
  fs.writeFileSync(f, keep);
  return d.length === 1 && d[0] === "differs app/js/nav.js";
});
check("msa.json's site lists the data folders the app reads at its root", () => {
  const s = readSettings(SRC, "msa");
  return ["index.html", "app", "mushaf", "tools/quran-data-pull/output", "tools/hadith-data-pull/output"].every((p) => s.site.includes(p));
});
check("no rule reaches the data folders (so copying them as they are is exact)", () => {
  const src = fs.readFileSync(path.join(SRC, "tools/apps/build-app.mjs"), "utf8");
  return /const ruleFiles = listSite\(src, \["index\.html", "app"\]\);/.test(src);
});

console.log("2. The QR draft: every setting lands, nothing of MSA's is left");
const qrOut = path.join(TMP, "qr");
const qr = buildApp({ id: "qr", out: qrOut, only: ONLY });
const qs = readSettings(SRC, "qr");
check("every page title reads 'QuranRevival — …', none 'MSA — …' (and only QR's pages are in the app)", () => {
  const pages = listFiles(qrOut, ["app"]).filter((f) => f.endsWith(".html"));
  const expected = qs.pages.map((p) => `app/${p}`).sort();
  if (JSON.stringify(pages) !== JSON.stringify(expected)) throw new Error(`pages: ${pages.join(", ")}`);
  const fromSrc = expected.filter((f) => fs.existsSync(path.join(SRC, f)) && read(SRC, f).includes("<title>MSA — "));
  return pages.every((f) => !read(qrOut, f).includes("<title>MSA — ")) && fromSrc.length >= 2 && fromSrc.every((f) => read(qrOut, f).includes("<title>QuranRevival — ")) &&
    listFiles(SRC, ["app"]).filter((f) => f.endsWith(".html") && read(SRC, f).includes("<title>MSA — ")).length >= 25;
});
check("Bangla titles: every 'MSA — ' key has its 'QuranRevival — ' key", () => {
  const a = read(SRC, "app/js/i18n/bn.js"), b = read(qrOut, "app/js/i18n/bn.js");
  const n = (t, p) => t.split(`"${p} — `).length - 1;
  return n(a, "MSA") >= 50 && n(b, "MSA") === 0 && n(b, "QuranRevival") === n(a, "MSA") + n(a, "QuranRevival");
});
check("the front page's name, heading and short name are QR's", () => {
  const t = read(qrOut, "app/quranrevival.html");
  return t.includes("<title>QuranRevival</title>") && t.includes('<span class="app-name-full">QuranRevival</span>') &&
    t.includes('.app-name-short::before { content: "QuranRevival"; }') && !t.includes('<span class="app-name-full">Madrasah Study App (MSA)</span>');
});
check("the offline caches are qr-…, no mm- cache is named, and the clean-up deletes only qr-… caches", () => {
  const t = read(qrOut, "app/sw.js");
  const deletes = [...t.matchAll(/key\.startsWith\("([a-z-]+)"\) && key !== [A-Z_]+\) await caches\.delete/g)].map((m) => m[1]);
  return t.includes("const APP_CACHE = `qr-app-${APP_VERSION}`;") && t.includes('"qr-qf-fonts-v1"') && t.includes('"qr-ext-v1"') &&
    t.includes('"qr-mushaf-v1"') && !/["`]mm-(app|qf-fonts|ext|mushaf)-/.test(t) && deletes.length >= 3 && deletes.every((d) => d.startsWith("qr-"));
});
check("the built scripts still parse (sw.js, bn.js, hidden-modules.js, bookmark-nav.js)", () =>
  ["app/sw.js", "app/js/i18n/bn.js", "app/js/hidden-modules.js", "app/js/bookmark-nav.js"].every((f) => parsesAsModule(path.join(qrOut, f))));
check("the theme colour reaches every page head once", () => {
  const pages = listFiles(qrOut, ["app", "index.html"]).filter((f) => f.endsWith(".html"));
  return pages.length >= 7 && pages.every((f) => {
    const t = read(qrOut, f), m = t.match(/<meta name="theme-color" content="#0f4c4c">/g) || [];
    return m.length === 1 && t.indexOf(m[0]) < t.indexOf("</head>");
  });
});
check("files no rule touches are copied exactly (only the expected files differ)", () => {
  const d = compareTrees(SRC, qrOut, ONLY, inSettings).filter((x) => x.startsWith("differs "));
  const changed = new Set([...qr.changedFiles, ...qr.overlaid.replaced]);
  const unexpected = d.filter((x) => !changed.has(x.slice(8)));
  if (unexpected.length) throw new Error(unexpected.join("; "));
  const same = [...changed].filter((f) => !d.includes("differs " + f));
  if (same.length) throw new Error("changed but identical to the source: " + same.join(", "));
  return d.length === changed.size;
});
check("every one of QR's edits is in the built file (and there are 38)", () => {
  const edits = JSON.parse(read(SRC, qs.edits));
  const missing = edits.filter((e) => !read(qrOut, e.file).includes(e.to));
  if (missing.length) throw new Error(missing.map((e) => e.id).join(", "));
  return edits.length === 38;
});
check("every one of QR's own files is in the built app byte for byte (the Asma app, the front page, the fonts)", () => {
  const own = listFiles(path.join(SRC, qs.overlay), ["app", "index.html", "404.html", ".nojekyll"]);
  return own.length > 40 && own.includes("app/asma.html") && own.includes("app/asma.webmanifest") &&
    own.filter((f) => !(qr.after?.written || []).includes(f)).every((f) => sha(path.join(SRC, qs.overlay, f)) === sha(path.join(qrOut, f)));
});
check("QR's worker carries MSA's one version number and the built app's shell", () => {
  const v = read(SRC, "app/js/version.js").match(/APP_VERSION = "([\d.]+)"/)[1];
  const sw = read(qrOut, "app/sw.js");
  const shell = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1]);
  return sw.includes(`const APP_VERSION = ${JSON.stringify(v)};`) && read(qrOut, "app/js/qr-version.js").includes(`APP_VERSION = ${JSON.stringify(v)}`) &&
    shell.length > 100 && shell.includes("quranrevival.html") && shell.every((f) => fs.existsSync(path.join(qrOut, "app", f)));
});
check("QR's worker is QR's own (the upgrade path for today's phones), with no import (it must run as a classic worker too)", () => {
  const sw = read(qrOut, "app/sw.js");
  return /QR: version \$\{APP_VERSION\} is already running/.test(sw) && !/^\s*import\s/m.test(sw) && sw.includes("qr-quran-v1") && parsesAsModule(path.join(qrOut, "app/sw.js"));
});
// Step 5 (the Owner's "A, switch", J110 n110c, 18 Oct 2026): QR is live, and the Firebase domain item is settled.
check("QR's settings say it is live, with the worker note kept and the settled Firebase item gone", () => qs.status === "live" && qs.later.some((l) => /qr-app-<version>/.test(l)) && !qs.later.some((l) => /authorised domains/.test(l)));

console.log("3. A manifest and an icon, from a settings fixture");
const fixture = { ...qs, id: "fixture", pages: null, manifest: { file: "fixture.webmanifest", pages: ["asma-study.html"], data: { name: "Fixture", icons: [{ src: "img/wheel-hub-calligraphy.webp", sizes: "512x512", type: "image/webp" }] } }, icon: "img/wheel-hub-calligraphy.webp" };
const fxOut = path.join(TMP, "fixture");
const fx = buildApp({ settings: fixture, out: fxOut, only: ONLY });
check("the manifest is written with the app's colours", () => {
  const m = JSON.parse(read(fxOut, "app/fixture.webmanifest"));
  return fx.addedFiles.includes("app/fixture.webmanifest") && m.theme_color === "#0f4c4c" && m.background_color === "#0d2225" && m.name === "Fixture";
});
check("the page named gets the manifest link, others do not", () =>
  read(fxOut, "app/asma-study.html").includes('<link rel="manifest" href="./fixture.webmanifest">') && !read(fxOut, "app/notes.html").includes('rel="manifest"'));
check("a page in a sub-folder links the manifest relative to itself", () => {
  const out = path.join(TMP, "fixture-sub");
  buildApp({ settings: { ...fixture, manifest: { ...fixture.manifest, pages: ["health/health-atlas.html"] } }, out, only: ONLY });
  return read(out, "app/health/health-atlas.html").includes('<link rel="manifest" href="../fixture.webmanifest">');
});
check("the icon link is relative from a page in a sub-folder", () =>
  read(fxOut, "app/health/health-atlas.html").includes('<link rel="icon" href="../img/wheel-hub-calligraphy.webp">') && read(fxOut, "app/notes.html").includes('<link rel="icon" href="img/wheel-hub-calligraphy.webp">'));
check("a manifest icon that does not exist stops the build", () => throws(() =>
  buildApp({ settings: { ...fixture, manifest: { ...fixture.manifest, data: { icons: [{ src: "img/none.png" }] } } }, out: path.join(TMP, "fx2"), only: ONLY }), /manifest icon app\/img\/none\.png does not exist/));

console.log("4. Mutations: each guard can fail");
// A copy of the source's app/ and index.html, to change without touching the real one.
const mutSrc = path.join(TMP, "src");
for (const p of ["app", "index.html", "tools/apps", "apps"]) fs.cpSync(path.join(SRC, p), path.join(mutSrc, p), { recursive: true });
const mutate = (rel, from, to, fn) => {
  const f = path.join(mutSrc, rel), keep = fs.readFileSync(f, "utf8");
  if (!keep.includes(from)) throw new Error(`mutation anchor not found in ${rel}: ${from}`);
  fs.writeFileSync(f, keep.replace(from, to));
  try { return fn(); } finally { fs.writeFileSync(f, keep); }
};
const buildMut = (id) => buildApp({ id, src: mutSrc, out: path.join(TMP, "mut-" + id), only: ONLY });
check("control: the copied source builds msa and qr", () => buildMut("msa") && buildMut("qr"));
check("msa.json naming a title prefix the source does not hold stops even the msa build", () =>
  mutate("app/apps/msa.json", '"titlePrefix": "MSA"', '"titlePrefix": "MMSA"', () => throws(() => buildMut("msa"), /page titles: found 0/)));
check("a cache name renamed in sw.js stops the qr build", () =>
  mutate("app/sw.js", 'const MUSHAF_CACHE_NAME = "mm-mushaf-v1";', 'const MUSHAF_CACHE_NAME = "mmx-mushaf-v1";', () => throws(() => buildMut("qr"), /offline cache "mushaf"/)));
check("a new place writing MSA's full name, no rule covering it, stops the qr build", () =>
  mutate("app/notes.html", "</body>", "<p>Madrasah Study App (MSA)</p></body>", () => throws(() => buildMut("qr"), /notes\.html still says "Madrasah Study App \(MSA\)"/)));
check("...but the same words in a comment do not", () =>
  mutate("app/notes.html", "</body>", "<!-- Madrasah Study App (MSA) --></body>", () => !!buildMut("qr")));
check("a new hard-coded MSA cache name elsewhere in app/ stops the qr build", () =>
  mutate("app/js/nav.js", "export const LEGACY_APP_URL", 'const X = "mm-app-x";\nexport const LEGACY_APP_URL', () => throws(() => buildMut("qr"), /nav\.js still says "mm-app-"/)));
check("a hidden module nav.js cannot hide stops the build", () =>
  mutate("app/apps/qr.json", '"naturelife",', '"naturelife", "hadith",', () => throws(() => buildMut("qr"), /hidden module "hadith"/)));
check("the hidden-modules list changed in the source stops the build", () =>
  mutate("app/js/hidden-modules.js", '["general", "naturelife", "lifeskill", "health"]', '["general", "naturelife", "lifeskill"]', () => throws(() => buildMut("msa"), /modules hidden from this app: found 0/)));
check("a front page that does not exist stops the build", () =>
  mutate("app/apps/qr.json", '"frontPage": "quranrevival.html"', '"frontPage": "qr-front.html"', () => throws(() => buildMut("qr"), /front page app\/qr-front\.html does not exist/)));
const curVer = `APP_VERSION = "${read(SRC, "app/js/version.js").match(/APP_VERSION = "([\d.]+)"/)[1]}"`;
check("a live QR below minVersion 11.39 is refused (a phone on frozen QR 11.38 would never update)", () =>
  mutate("app/js/version.js", curVer, 'APP_VERSION = "11.38"', () => throws(() => buildMut("qr"), /below QR's minVersion 11\.39/)));
check("control: the same live QR at 11.39 builds", () =>
  mutate("app/js/version.js", curVer, 'APP_VERSION = "11.39"', () => !!buildMut("qr")));
check("control: a draft QR at 11.38 builds (the floor binds only once live)", () =>
  mutate("app/apps/qr.json", '"status": "live"', '"status": "draft"', () => mutate("app/js/version.js", curVer, 'APP_VERSION = "11.38"', () => !!buildMut("qr"))));
check("a file the worker saves at install but the build lacks stops the build", () => {
  const f = path.join(mutSrc, "apps/qr/site/app/js/asma-about.js"), keep = fs.readFileSync(f);
  fs.rmSync(f);
  try { return throws(() => buildMut("qr"), /install list names files the build does not have: js\/asma-about\.js/); } finally { fs.writeFileSync(f, keep); }
});
check("writing an app over its own source is refused", () => throws(() => buildApp({ id: "qr", src: mutSrc, out: mutSrc, only: ONLY }), /refusing/));
check("...and so is an output folder that is, or sits inside, a source path (--out=app, --out=index.html, --out=app/js)", () =>
  ["app", "index.html", "app/js", "app/apps"].every((o) => throws(() => buildApp({ id: "qr", src: mutSrc, out: path.join(mutSrc, o), only: ONLY }), /refusing/)) &&
  fs.existsSync(path.join(mutSrc, "app/js/nav.js")) && fs.existsSync(path.join(mutSrc, "index.html")));
check("control: an output folder beside the source paths (build/qr) is allowed", () => !!buildApp({ id: "qr", src: mutSrc, out: path.join(mutSrc, "build/qr"), only: ONLY }));
check("an app without an address is refused", () =>
  mutate("app/apps/qr.json", '"address": "https://quranrevival.github.io/",', "", () => throws(() => buildMut("qr"), /"address" is missing/)));

console.log("5. An app's own files (overlay) and its hunks on shared files (edits)");
fs.mkdirSync(path.join(mutSrc, "apps/fx/site/app/js"), { recursive: true });
fs.writeFileSync(path.join(mutSrc, "apps/fx/site/app/fx-own.html"), "<!doctype html><title>own</title>\n");
fs.writeFileSync(path.join(mutSrc, "apps/fx/site/app/js/continue-strip.js"), "// fx's own\n");
const fxEdits = [{ id: "nav#1", file: "app/js/nav.js", why: "fixture", from: "export const LEGACY_APP_URL", to: "export const FX = 1;\nexport const LEGACY_APP_URL", exact: 1 }];
fs.writeFileSync(path.join(mutSrc, "apps/fx/edits.json"), JSON.stringify(fxEdits));
const fxs = { ...qs, id: "fx", pages: null, afterBuild: null, site: ["index.html", "app"], overlay: "apps/fx/site", edits: "apps/fx/edits.json" };
const buildFx = (over = {}) => buildApp({ settings: { ...fxs, ...over }, src: mutSrc, out: path.join(TMP, "fx"), only: ONLY });
check("an own file is added and an own file replaces the source's", () => {
  const r = buildFx();
  return r.overlaid.added.includes("app/fx-own.html") && r.overlaid.replaced.includes("app/js/continue-strip.js") &&
    read(path.join(TMP, "fx"), "app/js/continue-strip.js") === "// fx's own\n";
});
check("an edit lands once, and the rules still run on the edited file", () => {
  buildFx();
  const t = read(path.join(TMP, "fx"), "app/js/nav.js");
  return t.split("export const FX = 1;").length === 2 && t.includes("export const LEGACY_APP_URL");
});
check("the msa build of the same source is untouched by fx's files", () => {
  const out = path.join(TMP, "fx-msa");
  buildApp({ id: "msa", src: mutSrc, out, only: ONLY });
  return !fs.existsSync(path.join(out, "app/fx-own.html")) && !read(out, "app/js/nav.js").includes("FX = 1");
});
check("an edit whose text is not in the source stops the build", () => {
  fs.writeFileSync(path.join(mutSrc, "apps/fx/edits.json"), JSON.stringify([{ ...fxEdits[0], from: "export const NOT_THERE" }]));
  try { return throws(() => buildFx(), /edit nav#1 .*found 0/); } finally { fs.writeFileSync(path.join(mutSrc, "apps/fx/edits.json"), JSON.stringify(fxEdits)); }
});
check("a file both edited and overlaid stops the build", () => {
  fs.writeFileSync(path.join(mutSrc, "apps/fx/site/app/js/nav.js"), "x");
  try { return throws(() => buildFx(), /both edited and overlaid/); } finally { fs.rmSync(path.join(mutSrc, "apps/fx/site/app/js/nav.js")); }
});
check("a page the settings name but nobody has stops the build", () => throws(() => buildFx({ pages: ["index.html", "nowhere.html"] }), /page app\/nowhere\.html does not exist/));
check("an overlay inside app/ is refused (MSA would serve it)", () => throws(() => buildFx({ overlay: "app/fx" }), /overlay must be outside app\//));

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\napps-build-check: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
