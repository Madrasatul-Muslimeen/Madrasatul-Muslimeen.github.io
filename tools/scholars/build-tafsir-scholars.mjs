// J03 K3 "Read next": app/data/tafsir-scholars.json, made from the Owner's Scholars Database v1.5
// (docs/reference/scholars-database/scholars-database-v1.5.json). Run from the repository root:
//   node tools/scholars/build-tafsir-scholars.mjs          (writes the file)
//   node tools/scholars/build-tafsir-scholars.mjs --check  (exit 1 when the file differs from what this makes)
// tools/i18n-verify/read-next.mjs fails when the committed file stops equalling buildTafsirScholars().
//
// What it keeps, every value exactly as the database has it (nothing is marked checked here):
//   - "tafsir": the rows the database types "mufassir" (a scholar whose main work is a tafsīr), with the tafsīr
//     title(s) split out of `quranWorks` on ";" (the database writes "al-Wasīṭ; al-Wajīz; Asbāb al-Nuzūl").
//   - "compiler": a scholar whose own hadith book is in the app's Hadith library. The library's book ids are OpenITI
//     ids, which begin with the author's death year AH and name ("0256Bukhari.Sahih…"): a scholar is matched to a book
//     when the database's death year AH is that year AND one part of that name is in the scholar's English name.
//     The match rule is written into the file, so a reader can see how each book was tied to its compiler.
// Bangla names: the database has none yet. The approved keys demo v2 (docs/reference/2026-11-04-keys-demo) wrote seven;
// those are kept with their source named ("bnFrom"), and every other scholar's Bangla name is null (the app then shows
// the English name, and the Arabic name beside it).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eraOfName, ERA_SAHABAH, ERA_TABIUN } from "../../app/js/era-approaches.js";

export const SOURCE = "docs/reference/scholars-database/scholars-database-v1.5.json";
export const OUTPUT = "app/data/tafsir-scholars.json";
export const BOOKS_MANIFEST = "tools/hadith-data-pull/output/openiti-release/manifest.json";
export const BOOKS_DIR = "tools/hadith-data-pull/output/openiti-release";

/** The seven Bangla names the approved keys demo v2 wrote (its SCHOLARS and HADITH_SCHOLARS lists). */
export const DEMO_BN_NAMES = Object.freeze({
  s021: "ইমাম ইবনে জারীর আত-তাবারী",
  s034: "ইমাম ইবনে আতিয়্যাহ আল-আন্দালুসী",
  s040: "ইমাম আল-কুরতুবী",
  s048: "ইমাম ইবনে কাসীর আদ-দিমাশকী",
  s066: "শায়খ আব্দুর রহমান আস-সা‘দী",
  s008: "ইমাম মুহাম্মাদ আল-বুখারী",
  s009: "ইমাম মুসলিম ইবনুল হাজ্জাজ",
});
const DEMO_SOURCE = "docs/reference/2026-11-04-keys-demo/template.html (keys demo v2, approved 4 Nov 2026)";

const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
/** The death year AH as the database writes it: the last "NNN AH" in lifeAH ("194 AH – 256 AH", "d. 671 AH"). */
export function deathYearAH(row) {
  const all = [...String(row.lifeAH ?? "").matchAll(/(\d+)\s*AH/g)];
  return all.length ? Number(all[all.length - 1][1]) : null;
}
/** `quranWorks` before the database's " · When each book was written:" note. */
export function quranWorkText(row) {
  return String(row.quranWorks ?? "").split(" · When each book was written")[0].trim();
}
/** DISPLAY labels only (Architect, 8 Nov 2026, J115 labels): the Tābiʿūn Approach takes display number 29 and the freed numbers
 *  move up. "28 Sahaba" and "29 Tābiʿīn" stay; every other numbered tag from 29 up is one higher ("29 Tābiʿ al-Tābiʿīn" ->
 *  30, "30 Gen1" -> 31 ... "36 Groups" -> 37). The era is read BY NAME (eraOfName), never by number. Unnumbered tags are untouched. */
export function relabelApproach(tag) {
  const m = /^(\d+)(\s+.*)$/.exec(String(tag ?? "").trim());
  if (!m) return String(tag ?? "");
  const n = Number(m[1]);
  const era = eraOfName(m[2]);
  if (era === ERA_SAHABAH || era === ERA_TABIUN || n < 29) return String(tag);
  return `${n + 1}${m[2]}`;
}
export function splitApproachText(s) {
  return String(s ?? "").split(" · ").map((x) => x.trim()).filter(Boolean);
}

/** OpenITI book id -> scholar id, by death year AH and a name part (see the header). */
export function matchBooks(rows, bookIds) {
  const out = {};
  for (const id of bookIds) {
    const m = /^(\d{4})([A-Za-z]+)\./.exec(id);
    if (!m) continue;
    const year = Number(m[1]);
    const parts = m[2].split(/(?=[A-Z])/).map(fold).filter((p) => p.length >= 4);
    const hits = rows.filter((r) => deathYearAH(r) === year && parts.some((p) => fold(r.en).includes(p)));
    if (hits.length === 1) out[id] = hits[0].id;
  }
  return out;
}

function bookIds(root) {
  const dir = path.join(root, BOOKS_DIR);
  return fs.readdirSync(dir).filter((f) => f.endsWith(".txt")).map((f) => f.replace(/\.txt$/, "")).sort();
}

export function buildTafsirScholars(root = process.cwd()) {
  const db = JSON.parse(fs.readFileSync(path.join(root, SOURCE), "utf8"));
  const rows = db.rows;
  const books = matchBooks(rows, bookIds(root));
  const compilerIds = new Set(Object.values(books));
  const scholars = [];
  for (const r of rows) {
    const roles = [];
    if (r.type === "mufassir") roles.push("tafsir");
    if (compilerIds.has(r.id)) roles.push("compiler");
    if (!roles.length) continue;
    const quranWork = quranWorkText(r);
    scholars.push({
      id: r.id,
      roles,
      type: r.type,
      en: r.en,
      ar: r.ar ?? null,
      bn: DEMO_BN_NAMES[r.id] ?? null,
      ...(DEMO_BN_NAMES[r.id] ? { bnFrom: "keys demo v2" } : {}),
      century: r.century ?? null,
      lifeAH: r.lifeAH ?? null,
      lifeCE: r.lifeCE ?? null,
      approaches: splitApproachText(r.approaches).map(relabelApproach),
      approachesText: splitApproachText(r.approaches).map(relabelApproach).join(" · "),
      quranWork,
      tafsir: r.type === "mufassir" ? quranWork.split(";").map((x) => x.trim()).filter(Boolean) : [],
      hadithBooks: Object.keys(books).filter((b) => books[b] === r.id),
      draft: Boolean(r.draft || r.draftNew),
    });
  }
  return {
    schemaVersion: 1,
    source: SOURCE,
    sourceVersion: db.version,
    sourceDate: db.date,
    madeBy: "tools/scholars/build-tafsir-scholars.mjs",
    checked: false,
    note: "Every value is as the Scholars Database v1.5 records it; nothing here has been checked by a scholar. Bangla names: the database has none; seven come from the approved keys demo v2 (bnFrom), the rest are null.",
    bnSource: DEMO_SOURCE,
    bookMatch: "An OpenITI book id begins with its author's death year AH and name (0256Bukhari...). A scholar is the book's compiler when the database's death year AH is that year and one part of that name (4+ letters) is in the scholar's English name.",
    books,
    scholars,
  };
}

export function serialise(data) {
  return JSON.stringify(data, null, 1) + "\n";
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = serialise(buildTafsirScholars());
  const out = path.join(process.cwd(), OUTPUT);
  if (process.argv.includes("--check")) {
    const now = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
    if (now !== text) { console.log(`${OUTPUT} differs from what ${SOURCE} makes. Run: node tools/scholars/build-tafsir-scholars.mjs`); process.exit(1); }
    console.log(`${OUTPUT} equals what ${SOURCE} makes.`);
  } else {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
    const d = JSON.parse(text);
    console.log(`wrote ${OUTPUT}: ${d.scholars.length} scholars (${d.scholars.filter((s) => s.roles.includes("tafsir")).length} tafsīr, ${d.scholars.filter((s) => s.roles.includes("compiler")).length} compilers), ${Object.keys(d.books).length} books matched`);
  }
}
