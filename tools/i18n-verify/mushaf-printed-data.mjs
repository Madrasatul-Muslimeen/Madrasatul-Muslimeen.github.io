// The printed-Mushaf page pictures (PCF MSA inbox qr46lmushafpdf01; 98L's conditions, 11 Nov 2026).
//   node tools/i18n-verify/mushaf-printed-data.mjs [--mutate=NAME]        (repository root)
// Asserts: 604 files 001.png..604.png, each a 622x917 PNG; the README names the source, the credit and the rights fact; .gitattributes marks the folder binary;
// none is listed in app/offline-files.json or either service worker; the offline builder skips the folder.
// Mutations alter the INPUT each check reads (a file list, a header, a text), so each check is shown to fail:
//   missing, extra, badsig, badsize, noreadme, nocredit, nonlicence, nobinary, inoffline, insw, builderall
import fs from "node:fs";
import path from "node:path";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUTS = ["missing", "extra", "badsig", "badsize", "noreadme", "nocredit", "nonlicence", "nobinary", "inoffline", "insw", "builderall"];
if (MUTATE && !MUTS.includes(MUTATE)) throw new Error(`unknown mutation ${MUTATE}`);
const DIR = "tools/quran-data-pull/output/mushaf-printed/ksu-madani";
let pass = 0, fail = 0;
const check = (name, fn) => {
  let r; try { r = fn(); } catch (e) { fail++; console.log(`  FAIL  ${name} ${String(e.message).split("\n")[0].slice(0, 200)}`); return; }
  if (r && typeof r.then === "function") throw new Error(`check "${name}" returned a promise`);
  if (r === false) { fail++; console.log(`  FAIL  ${name}`); return; }
  pass++; console.log(`  PASS  ${name}`);
};
const need = (c, m) => { if (!c) throw new Error(m); };
// ---- inputs (mutated here, read below)
let names = fs.readdirSync(DIR).filter((n) => n.endsWith(".png")).sort();
const head = (n) => { const fd = fs.openSync(path.join(DIR, n), "r"); const b = Buffer.alloc(24); fs.readSync(fd, b, 0, 24, 0); fs.closeSync(fd); return b; };
const heads = new Map(names.map((n) => [n, head(n)]));
if (MUTATE === "missing") { names = names.filter((n) => n !== "300.png" && n !== "300.png"); names = names.filter((n) => n !== "300.png").slice(0, 603); }
if (MUTATE === "extra") names = [...names, "605.png"];
if (MUTATE === "badsig") heads.get("010.png")[0] = 0;
if (MUTATE === "badsize") heads.get("010.png").writeUInt32BE(621, 16);
let readme = fs.existsSync(`${DIR}/README.md`) ? fs.readFileSync(`${DIR}/README.md`, "utf8") : "";
if (MUTATE === "noreadme") readme = "";
if (MUTATE === "nocredit") readme = readme.replace(/King Saud University/g, "");
if (MUTATE === "nonlicence") readme = readme.replace(/no written free-use licence/gi, "licensed");
let attrs = fs.existsSync(".gitattributes") ? fs.readFileSync(".gitattributes", "utf8") : "";
if (MUTATE === "nobinary") attrs = attrs.replace(/binary/g, "text");
let offline = fs.readFileSync("app/offline-files.json", "utf8");
if (MUTATE === "inoffline") offline += '"mushaf-printed"';
let workers = [fs.readFileSync("app/sw.js", "utf8"), fs.readFileSync("apps/qr/site/app/sw.js", "utf8")];
if (MUTATE === "insw") workers = [workers[0] + "\n// precache /tools/quran-data-pull/output/mushaf-printed/ksu-madani/001.png", workers[1]];
let builder = fs.readFileSync("tools/offline/build-offline-files.mjs", "utf8");
if (MUTATE === "builderall") builder = builder.replace(/\s*&& !\/\\\/mushaf-printed\\\/\/\.test\(f\)/, "");

check("POSITIVE CONTROL: the folder holds PNG files and the offline file is real JSON", () => { need(names.length > 100, `only ${names.length} files`); JSON.parse(offline); });
check("exactly 604 files, named 001.png to 604.png", () => {
  const want = Array.from({ length: 604 }, (_, i) => `${String(i + 1).padStart(3, "0")}.png`);
  need(names.length === 604, `${names.length} files, not 604`);
  need(want.every((w, i) => names[i] === w), "names are not 001..604");
});
check("every file is a PNG (signature)", () => { for (const n of names) { const h = heads.get(n); need(h && h.readUInt32BE(0) === 0x89504e47 && h.readUInt32BE(4) === 0x0d0a1a0a, `${n} is not a PNG`); } });
check("every file is 622 x 917 pixels (IHDR)", () => { for (const n of names) { const h = heads.get(n); need(h && h.readUInt32BE(16) === 622 && h.readUInt32BE(20) === 917, `${n} is ${h && h.readUInt32BE(16)}x${h && h.readUInt32BE(20)}`); } });
check("README names the source, the credit and the rights fact", () => {
  need(/quran\.ksu\.edu\.sa\/png_big/.test(readme), "no source URL");
  need(/King Fahd Complex/.test(readme) && /King Saud University/.test(readme), "no credit line");
  need(/fetched/i.test(readme) && /11 Nov 2026/.test(readme), "no fetch date");
  need(/no written free-use licence/i.test(readme) && /qr46lmushafpdf01/.test(readme), "no plain rights fact");
});
check(".gitattributes marks the folder binary", () => need(/mushaf-printed\/\*\*\/\*\.png\s+binary/.test(attrs), "not marked binary"));
check("none of the pictures is listed in app/offline-files.json", () => need(!/mushaf-printed/.test(offline) && !/ksu-madani/.test(offline), "listed"));
check("none is named in app/sw.js or QR's own worker", () => need(workers.every((w) => !/mushaf-printed|ksu-madani/.test(w)), "named in a worker"));
check("the offline builder skips the folder", () => need(/mushaf-printed/.test(builder) && /!\/\\\/mushaf-printed\\\//.test(builder), "builder does not skip it"));
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
