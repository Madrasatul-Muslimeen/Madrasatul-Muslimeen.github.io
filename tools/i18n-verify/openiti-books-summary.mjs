// The OpenITI book list's summary (split/books-summary.json) must say exactly what each book's own index.json
// says, in the manifest's order -- otherwise the list shows a count the book does not have. A re-split that
// forgets to re-run tools/hadith-data-pull/openiti-books-summary.mjs fails here. Run from the repository root.
//   --mutate=count   one count in the summary is off by one -> the drift check fails
import fs from "node:fs";
import { buildBooksSummary } from "../hadith-data-pull/openiti-books-summary.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const BASE = "tools/hadith-data-pull/output/openiti-release/";
const manifest = JSON.parse(fs.readFileSync(`${BASE}manifest.json`, "utf8"));
const stored = JSON.parse(fs.readFileSync(`${BASE}split/books-summary.json`, "utf8"));
if (process.argv.includes("--mutate=count")) stored.books[3].hadithCount += 1;
const readIndex = (uri) => JSON.parse(fs.readFileSync(`${BASE}split/${uri}/index.json`, "utf8"));
const fresh = buildBooksSummary(manifest, readIndex);
check("the summary lists every book in the manifest, in its order", JSON.stringify(stored.books.map((b) => b.versionUri)) === JSON.stringify(manifest.files.map((f) => f.version_uri)));
check("every row matches its book's own index.json", JSON.stringify(stored.books) === JSON.stringify(fresh.books),
  stored.books.map((b, i) => JSON.stringify(b) === JSON.stringify(fresh.books[i]) ? "" : b.versionUri).filter(Boolean).join(", "));
// Bound back to the source by hand, not through the builder: Bukhari's own index says 7129 hadith.
const bukhari = stored.books.find((b) => b.versionUri === "0256Bukhari.Sahih.JK000110-ara1");
check("Bukhari's row carries its index's hadith count (7129, read by hand)", bukhari?.hadithCount === 7129, String(bukhari?.hadithCount));
check("the summary is small (under 8 KB; the indexes it replaces are 1.8 MB)", fs.statSync(`${BASE}split/books-summary.json`).size < 8192);
console.log(`\n==== OpenITI book-list summary: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
