// One-time pull of the major Hadith books from OpenITI, Arabic only.
//
// GRANT: the Owner accepted OpenITI's licence, CC BY-NC-SA 4.0, on 26 Sep 2026
// (docs/governance/2026-09-26-owner-decisions.md, row 8), and
// docs/governance/hadith-source-manifest-2026-09-18.json lists
// "openiti-release" in importAuthorisation.approvedSources. The conditions:
// non-commercial; attribute OpenITI (release DOI) and the edition's own
// source; anything derived is shared under the same licence.
//
// WHAT IT STORES, AND HOW. Each book's OpenITI mARkdown file, byte for byte as
// served, at tools/hadith-data-pull/output/openiti-release/<version_uri>.txt,
// plus manifest.json recording for every file: its source URL, byte length and
// SHA-256, and the release metadata row it was selected by. Nothing is
// trimmed, normalised or re-encoded here; splitting a book into hadith is a
// later, separate step that reads these files and never rewrites them.
//
// WHICH BOOKS. The list below, chosen from the release's metadata file
// (OpenITI_metadata_2025-1-9.tsv, Zenodo record 17767721) by the Architect:
// the six books, al-Muwatta', the Musnad of Ahmad, the Sunan of al-Darimi,
// and al-Nawawi's Riyad al-Salihin and Forty. All 1,472 _HADITH texts come to
// about 1.16 GB -- too large for this GitHub Pages site -- so the rest wait
// for a hosting decision.
//
// PINNING. The per-century repositories publish no release tags that raw
// URLs can address (probed: v2025.1.9, 2025.1.9, 2025-1-9 all 404), so files
// come from each repository's `master`. The SHA-256 recorded here is what
// pins them: openiti-corpus-integrity.mjs re-hashes every file.
//
// NETWORK. raw.githubusercontent.com is reachable from the Architect's
// sandbox; Node's fetch needs NODE_USE_ENV_PROXY=1 there.
//
// Usage (repository root): NODE_USE_ENV_PROXY=1 node tools/hadith-data-pull/openiti-pull.mjs

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const OUT_DIR = path.join(__dirname, "output", "openiti-release");

export const RELEASE = Object.freeze({
  version: "2025.1.9",
  zenodoRecord: "17767721",
  doi: "10.5281/zenodo.3082463",
  licence: "CC BY-NC-SA 4.0",
  citation: "Romanov, Maxim, and Masoumeh Seydi. \"OpenITI: A Machine-Readable Corpus of Islamicate Texts.\" Zenodo. doi:10.5281/zenodo.3082463",
});

/** The selected books: release metadata rows (version_uri, local_path, titles, author). */
export const BOOKS = Object.freeze([
  { version_uri: "0179MalikIbnAnas.Muwatta.Shamela0028107-ara1", local_path: "data/0179MalikIbnAnas/0179MalikIbnAnas.Muwatta/0179MalikIbnAnas.Muwatta.Shamela0028107-ara1.completed", title_ar: "الموطأ", title_en: "al-Muwatta'", author_ar: "مالك بن أنس" },
  { version_uri: "0241IbnHanbal.Musnad.Shamela0025794-ara1", local_path: "data/0241IbnHanbal/0241IbnHanbal.Musnad/0241IbnHanbal.Musnad.Shamela0025794-ara1.mARkdown", title_ar: "مسند أحمد", title_en: "Musnad Ahmad", author_ar: "أحمد بن حنبل" },
  { version_uri: "0255CabdAllahDarimi.Sunan.JK000842-ara1", local_path: "data/0255CabdAllahDarimi/0255CabdAllahDarimi.Sunan/0255CabdAllahDarimi.Sunan.JK000842-ara1", title_ar: "سنن الدارمي", title_en: "Sunan al-Darimi", author_ar: "عبد الله الدارمي" },
  { version_uri: "0256Bukhari.Sahih.JK000110-ara1", local_path: "data/0256Bukhari/0256Bukhari.Sahih/0256Bukhari.Sahih.JK000110-ara1.completed", title_ar: "صحيح البخاري", title_en: "Sahih al-Bukhari", author_ar: "البخاري" },
  { version_uri: "0261Muslim.Sahih.Shamela0001727-ara1", local_path: "data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.Shamela0001727-ara1.mARkdown", title_ar: "صحيح مسلم", title_en: "Sahih Muslim", author_ar: "مسلم" },
  { version_uri: "0273IbnMaja.Sunan.JK000141-ara1", local_path: "data/0273IbnMaja/0273IbnMaja.Sunan/0273IbnMaja.Sunan.JK000141-ara1", title_ar: "سنن ابن ماجه", title_en: "Sunan Ibn Majah", author_ar: "ابن ماجه" },
  { version_uri: "0275AbuDawudSijistani.Sunan.JK000142-ara1", local_path: "data/0275AbuDawudSijistani/0275AbuDawudSijistani.Sunan/0275AbuDawudSijistani.Sunan.JK000142-ara1", title_ar: "سنن أبي داود", title_en: "Sunan Abi Dawud", author_ar: "أبو داود السجستاني" },
  { version_uri: "0279Tirmidhi.Sunan.JK000140-ara1", local_path: "data/0279Tirmidhi/0279Tirmidhi.Sunan/0279Tirmidhi.Sunan.JK000140-ara1.completed", title_ar: "جامع الترمذي", title_en: "Jami' al-Tirmidhi", author_ar: "الترمذي" },
  { version_uri: "0303Nasai.SunanSughra.JK000130-ara1", local_path: "data/0303Nasai/0303Nasai.SunanSughra/0303Nasai.SunanSughra.JK000130-ara1.mARkdown", title_ar: "سنن النسائي", title_en: "Sunan al-Nasa'i", author_ar: "النسائي" },
  { version_uri: "0676Nawawi.ArbacunaNawawiyya.Shamela0012836-ara1", local_path: "data/0676Nawawi/0676Nawawi.ArbacunaNawawiyya/0676Nawawi.ArbacunaNawawiyya.Shamela0012836-ara1.mARkdown", title_ar: "الأربعون النووية", title_en: "al-Nawawi's Forty", author_ar: "النووي" },
  { version_uri: "0676Nawawi.RiyadSalihin.Shamela0012014-ara1", local_path: "data/0676Nawawi/0676Nawawi.RiyadSalihin/0676Nawawi.RiyadSalihin.Shamela0012014-ara1.mARkdown", title_ar: "رياض الصالحين", title_en: "Riyad al-Salihin", author_ar: "النووي" },
]);

/** OpenITI keeps each author in a per-25-year repository: death year 256 -> "0275AH". */
export function centuryRepo(versionUri) {
  const year = Number(versionUri.slice(0, 4));
  return `${String(Math.ceil(year / 25) * 25).padStart(4, "0")}AH`;
}

export const rawUrl = (book) => `https://raw.githubusercontent.com/OpenITI/${centuryRepo(book.version_uri)}/master/${book.local_path}`;
export const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = [];
  for (const book of BOOKS) {
    const url = rawUrl(book);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.subarray(0, 64).toString("utf8").includes("######OpenITI#")) throw new Error(`${url} is not an OpenITI mARkdown file`);
    const file = `${book.version_uri}.txt`;
    fs.writeFileSync(path.join(OUT_DIR, file), buf);
    files.push({ ...book, file, url, bytes: buf.length, sha256: sha256(buf) });
    console.log(`  ${file}: ${(buf.length / 1048576).toFixed(1)} MB`);
  }
  const manifest = {
    manifestVersion: "openiti-pull:v1",
    sourceId: "openiti-release",
    pulledAt: new Date().toISOString(),
    release: RELEASE,
    grant: "docs/governance/2026-09-26-owner-decisions.md (row 8)",
    files,
    totals: { files: files.length, bytes: files.reduce((n, f) => n + f.bytes, 0) },
  };
  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`Done: ${files.length} books, ${(manifest.totals.bytes / 1048576).toFixed(1)} MB`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exitCode = 1; });
