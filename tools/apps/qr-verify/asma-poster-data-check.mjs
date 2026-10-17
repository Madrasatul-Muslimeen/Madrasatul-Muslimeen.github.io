// QR J01 R5: the Asma poster data (app/js/asma-poster-data.js, QR's home since PCA J71), read as the poster reads it.
//   - it is exactly what tools/asma-poster/build-poster-data.mjs writes (no hand edit);
//   - MMSA v11.11's checks (asma-poster-browser.mjs at 7861b96, its pure part): every Name has a poster with its Name
//     and Arabic; the ten without an English meaning line; no Lord/God; no two Names carry the same description;
//     112 Al-Maalik shows المالك, not 113 Al-Maleek's word or description;
//   - QR's: no two Names share the same poster Arabic (POSTER_ARABIC) unless their own Arabic in the Name list is the
//     same word (only then do the sources say so);
//   - the screensaver photo "(Maalik) Al-Maalik.jpg" is Al-Malik's (#3) poster and is captioned so (asma-posters.js).
//   node tools/apps/qr-verify/asma-poster-data-check.mjs           --mutate=<name> breaks one thing in memory; must FAIL
//       dup112   112 is given 113's Arabic again (the v11.11 defect)
import { REPO, importBuilt } from "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const MUTATE = process.argv.find((a) => a.startsWith("--mutate="))?.split("=")[1] ?? null;
let pass = 0, fail = 0;
const check = (ok, what, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "ok  " : "FAIL"} ${what}${!ok && detail ? ` ${detail}` : ""}`); };

let generated = true;
// PORTED: QR's generator (typo fixes, MEANING_132, --check) lives with QR's own files: apps/qr/tools/build-poster-data.mjs.
// It is run in --check mode against the BUILT app's file.
const GEN = path.join(REPO, "apps/qr/tools/build-poster-data.mjs");
const genSrc = fs.existsSync(GEN) ? fs.readFileSync(GEN, "utf8") : "";
// the generator runs with the BUILT app as the working directory (it reads app/js and docs/reference from there)
try { if (!genSrc.includes('"--check"')) throw new Error("no --check"); execFileSync(process.execPath, [GEN, "--check", `--file=${path.resolve("app/js/asma-poster-data.js")}`], { stdio: "pipe" }); } catch { generated = false; }
check(generated, "app/js/asma-poster-data.js is what tools/asma-poster/build-poster-data.mjs writes from its sources");

const data = await importBuilt("app/js/asma-poster-data.js");
const POSTER_ARABIC = { ...data.POSTER_ARABIC };
if (MUTATE === "dup112") POSTER_ARABIC["112"] = POSTER_ARABIC["113"];
else if (MUTATE) throw new Error(`Unknown mutation "${MUTATE}"`);

const { asmaPosterModel } = await importBuilt("app/js/asma-poster.js");
const { ASMA_NAMES } = await importBuilt("app/js/asma-data.js");
const { DEFAULT_EXTRA_ASMA_NAMES, DEFAULT_CANONICAL_REFS } = await importBuilt("app/js/asma-collections-data.js");
const names = [...ASMA_NAMES, ...DEFAULT_EXTRA_ASMA_NAMES].map((n) => ({ ...n, ref: n.ref ?? DEFAULT_CANONICAL_REFS[n.number] }));
const models = names.map((n) => asmaPosterModel(n));
const noMarks = (s) => String(s ?? "").replace(/[ً-ٰٟـ]/g, "").replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, "").trim();

check(models.length === 132 && models.every((m) => m.title && m.arabic), "every one of the 132 Names has a poster with its Name and its Arabic");
const NO_ENGLISH_MEANING = [103, 106, 107, 112, 123, 125, 126, 129, 130, 131];
const noMeaning = models.filter((m) => !m.meaning).map((m) => m.number);
check(JSON.stringify(noMeaning) === JSON.stringify(NO_ENGLISH_MEANING), "every Name has its English meaning line, except the ten the Owner has not given one for yet", JSON.stringify(noMeaning));
check(models.every((m) => !/\b(Lord|God)\b/.test(`${m.meaning} ${m.description}`)), "decision 49 in the template's form: no poster says Lord or God");
const dupDesc = models.filter((m) => m.description && models.some((o) => o !== m && o.description === m.description)).map((m) => m.number);
check(dupDesc.length === 0, "no two Names carry the same description", JSON.stringify(dupDesc));
const m112 = models.find((m) => m.number === 112), m113 = models.find((m) => m.number === 113);
check(!!m112 && noMarks(m112.arabic) === "المالك" && m112.description !== m113.description && (POSTER_ARABIC["112"] ?? null) !== POSTER_ARABIC["113"],
  "Al-Maalik (112) shows المالك, not Al-Maleek's المَلِيكُ, and not Al-Maleek's description", JSON.stringify({ a: m112?.arabic, p: POSTER_ARABIC["112"] ?? null }));

// QR J01 R5b: Allah's (132) meaning line is the generator's MEANING_132 (the owner's Q8), never the braces as printed.
const want132 = genSrc.match(/const MEANING_132 = "([^"]+)"/)?.[1];
const m132 = models.find((m) => m.number === 132);
check(!!want132 && m132?.meaning === want132, `132 Allah's meaning line is the one chosen in the generator ("${want132}")`, JSON.stringify(m132?.meaning));

// QR: a poster Arabic shared by two Names only where the Name list gives both the same word.
const byNumber = Object.fromEntries(names.map((n) => [String(n.number), n]));
const groups = new Map();
for (const [num, ar] of Object.entries(POSTER_ARABIC)) {
  const k = noMarks(ar);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(num);
}
const shared = [...groups.values()].filter((g) => g.length > 1);
const unsupported = shared.filter((g) => new Set(g.map((n) => noMarks(byNumber[n]?.arabic))).size > 1);
check(unsupported.length === 0, `no two Names share the same poster Arabic unless the Name list gives both that word (${shared.length} shared: ${JSON.stringify(shared)})`, JSON.stringify(unsupported));

// The screensaver's photo of Al-Malik (#3), whose archive file is named "(Maalik) Al-Maalik.jpg".
const posters = fs.readFileSync("app/js/asma-posters.js", "utf8");
const line = posters.split("\n").find((l) => l.includes("%28Maalik%29%20Al-Maalik.jpg")) ?? "";
check(/label: 'Al-Malik'/.test(line) && !/label: 'Al-Maalik'/.test(posters), `the photo "(Maalik) Al-Maalik.jpg" (it shows Al-Malik, #3) is captioned Al-Malik, and no photo is captioned Al-Maalik (112)`, line.trim());

console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
