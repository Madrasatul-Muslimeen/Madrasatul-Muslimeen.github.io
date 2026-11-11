// PCF MSA J120 O2 ("Get ready for offline"): writes app/offline-files.json, the list of
// every file the My account button downloads, with sizes.
//   node tools/offline/build-offline-files.mjs          write it
//   node tools/offline/build-offline-files.mjs --check  exit 1 when the committed file is not current
// Run from the repository root. Re-run (and commit) after adding, removing or resizing a
// file under app/, tools/quran-data-pull/output/ or tools/hadith-data-pull/output/.
//
// Parts (each reader downloads app + quran + sdk, plus the books they tick):
//   app    every file under app/ the worker may keep (its isCacheable() extensions): the
//          reader pages and every script, style, font and picture they load. A whole-folder
//          list rather than an import walk, so a script a page loads by a name built at run
//          time is never missed. Left out: app/apps/ (build settings), the test/demo pages,
//          Markdown and text notes.
//   quran  every file under tools/quran-data-pull/output/ (the Qur'an text, meanings, words).
//   sdk    the Firebase scripts every page imports (www.gstatic.com), kept in the worker's
//          "mm-ext-v1" cache, without which no page boots offline (issue #339).
//   books  the Hadith and Dua choices, one per book, kept in "mm-hadith-v1". A book's own
//          chapters and its English/Bangla translation; "Duas" also takes the HadeethEnc
//          English and Bangla meanings its cards show. The small shared lists (book list,
//          indexes, concordance, links) go with every choice ("hadithCommon").
// No recitation audio (the Owner's answer on J120) and no Mushaf page fonts: those stay
// fetched page by page and refreshed weekly, as the font permission requires.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
if (!fs.existsSync(path.join(ROOT, "app/apps/msa.json"))) { console.error("run from the repository root"); process.exit(2); }
const OUT = path.join(ROOT, "app/offline-files.json");
const CACHEABLE = /\.(?:html|js|mjs|css|json|woff2?|ttf|otf|png|jpe?g|svg|webp|webmanifest)$/i;
const SKIP_APP = [/^app\/apps\//, /^app\/_prev-/, /^app\/note-editor-prototype-demo\.html$/, /^app\/quranrevival-render-test\.html$/, /^app\/offline-files\.json$/];
const H = "tools/hadith-data-pull/output";

function walk(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) throw new Error(`${rel} does not exist`);
  const st = fs.statSync(abs);
  if (st.isFile()) return [rel];
  return fs.readdirSync(abs).sort().flatMap((n) => walk(path.posix.join(rel, n)));
}
const size = (rel) => fs.statSync(path.join(ROOT, rel)).size;
/** Files grouped by folder: [{ base: "/dir/", files: [[name, bytes], ...] }] (short, and easy to read). */
function grouped(rels) {
  const byDir = new Map();
  for (const rel of [...new Set(rels)].sort()) {
    const dir = path.posix.dirname(rel) + "/";
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push([path.posix.basename(rel), size(rel)]);
  }
  return [...byDir].map(([dir, files]) => ({ base: "/" + dir, files }));
}
const json = (rel) => walk(rel).filter((f) => /\.json$/i.test(f));

const appFiles = walk("app").filter((f) => CACHEABLE.test(f) && !SKIP_APP.some((re) => re.test(f)));
// The printed-Mushaf page pictures (604 PNG, 51 MB) are the reader's own choice to keep: never part of "Get ready for offline".
const quranFiles = walk("tools/quran-data-pull/output").filter((f) => CACHEABLE.test(f) && !/\/mushaf-printed\//.test(f));

const sdk = [...new Set(walk("app").filter((f) => /\.(?:js|html)$/.test(f))
  .flatMap((f) => [...fs.readFileSync(path.join(ROOT, f), "utf8").matchAll(/https:\/\/www\.gstatic\.com\/firebasejs\/[\d.]+\/[a-z-]+\.js/g)].map((m) => m[0])))].sort();

const summary = JSON.parse(fs.readFileSync(path.join(ROOT, H, "openiti-release/split/books-summary.json"), "utf8")).books;
const tr = JSON.parse(fs.readFileSync(path.join(ROOT, H, "translations/summary.json"), "utf8")).books;
const common = [
  `${H}/openiti-release/manifest.json`,
  `${H}/translations/summary.json`,
  ...json(`${H}/openiti-release/split`).filter((f) => /\/(index|books-summary)\.json$/.test(f)),
  ...json(`${H}/concordance`), ...json(`${H}/hadeethenc-links`), ...json(`${H}/hadeethenc-references`),
  ...json(`${H}/hadith-words`), ...json(`${H}/ayah-hadith`),
];
const books = [];
books.push({ id: "dua", title: { en: "Duas", bn: "দু‘আ" }, default: true,
  dirs: grouped([...json(`${H}/dua`), `${H}/hadeethenc/manifest.json`, ...json(`${H}/hadeethenc/en`), ...json(`${H}/hadeethenc/bn`)]) });
books.push({ id: "hadeethenc", title: { en: "HadeethEnc: explained hadith (Arabic, English, Bangla)", bn: "HadeethEnc: ব্যাখ্যাসহ হাদীস (আরবি, ইংরেজি, বাংলা)" }, default: false,
  dirs: grouped(json(`${H}/hadeethenc`)) });
for (const b of summary) {
  const own = json(`${H}/openiti-release/split/${b.versionUri}`).filter((f) => !/\/index\.json$/.test(f));
  const t = tr.find((x) => x.versionUri === b.versionUri);
  if (t) own.push(...json(`${H}/translations/${t.edition}`));
  books.push({ id: b.versionUri, title: { en: b.titleEn, ar: b.titleAr }, default: false, dirs: grouped(own) });
}

const data = {
  schema: 1,
  note: "Generated by tools/offline/build-offline-files.mjs (PCF MSA J120 O2). Do not edit by hand; re-run it and commit.",
  parts: {
    app: { cache: "app", dirs: grouped(appFiles) },
    quran: { cache: "quran", dirs: grouped(quranFiles) },
    sdk: { cache: "ext", urls: sdk },
    hadithCommon: { cache: "hadith", dirs: grouped(common) },
  },
  books,
};
const text = JSON.stringify(data) + "\n";
const mb = (dirs) => (dirs.flatMap((d) => d.files).reduce((s, f) => s + f[1], 0) / 1048576).toFixed(1);
if (process.argv.includes("--check")) {
  // Current means: the same files in every part, the data files at their exact sizes, and the app's own files
  // within 10% of their listed total. App scripts change size in nearly every round; holding them to the byte
  // would make every round re-run this, while a file ADDED to or REMOVED from app/ must always be listed (it
  // would not be offline otherwise), and that is checked exactly.
  let now = null;
  try { now = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch { /* missing or broken: not current */ }
  const names = (dirs) => dirs.flatMap((d) => d.files.map((f) => d.base + f[0])).join("\n");
  const sized = (dirs) => dirs.flatMap((d) => d.files.map((f) => d.base + f[0] + "=" + f[1])).join("\n");
  const total = (dirs) => dirs.flatMap((d) => d.files).reduce((s, f) => s + f[1], 0);
  const problems = [];
  if (!now) problems.push("app/offline-files.json is missing or not JSON");
  else {
    if (names(now.parts.app.dirs) !== names(data.parts.app.dirs)) problems.push("a file was added to or removed from app/");
    if (Math.abs(total(now.parts.app.dirs) - total(data.parts.app.dirs)) > 0.1 * total(data.parts.app.dirs)) problems.push("app/ changed size by more than 10%");
    for (const p of ["quran", "hadithCommon"]) if (sized(now.parts[p].dirs) !== sized(data.parts[p].dirs)) problems.push(`the ${p} files changed`);
    if (JSON.stringify(now.parts.sdk) !== JSON.stringify(data.parts.sdk)) problems.push("the Firebase scripts changed");
    if (JSON.stringify(now.books.map((b) => [b.id, b.title, b.default, sized(b.dirs)])) !== JSON.stringify(data.books.map((b) => [b.id, b.title, b.default, sized(b.dirs)]))) problems.push("the Hadith/Dua books changed");
  }
  if (problems.length) { console.log(`FAIL app/offline-files.json is not current (${problems.join("; ")}): run node tools/offline/build-offline-files.mjs and commit it`); process.exit(1); }
  console.log("PASS app/offline-files.json is current");
} else {
  fs.writeFileSync(OUT, text);
  console.log(`wrote app/offline-files.json (${(text.length / 1024).toFixed(0)} KB)`);
}
console.log(`  app ${appFiles.length} files ${mb(data.parts.app.dirs)} MB; quran ${quranFiles.length} files ${mb(data.parts.quran.dirs)} MB; sdk ${sdk.length} scripts; hadith lists ${mb(data.parts.hadithCommon.dirs)} MB`);
for (const b of books) console.log(`  ${b.id}: ${b.dirs.flatMap((d) => d.files).length} files ${mb(b.dirs)} MB`);
