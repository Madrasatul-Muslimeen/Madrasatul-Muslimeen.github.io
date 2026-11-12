// Sunan an-Nasa'i printed page (Owner hd1111n C/D, 11 Nov 2026): the book comes as TWO scan files and Darussalam's printed numbers differ
// from the STANDARD numbers the reader cites, so the map was aligned by CONTENT (tools/hadith-data-pull/book-pages-nasai.py).
// Anchors below were read BY HAND from the scan's own text layer (12 Nov 2026): standard 2 -> vol 1-5 leaf 22 (Huthaifah, siwak),
// 2500 -> vol 1-5 leaf 1416 (Ibn 'Umar, Zakah of Ramadan), 5000 -> vol 6 leaf 24 (Abdullah bin 'Amr, "What quality of Islam is best?"),
// 5755 -> vol 6 leaf 377 (Ibn Mas'ud, new drinks).
// Run from the repository root, serve.js on :8080.   --mutate=<name> serves one deliberate break (must FAIL);  --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUT = {
  noparts: ["js/hadith-book-pages.js", "scan = { ...book, slug: pt.slug, pdf: pt.pdf, pdfBytes: pt.pdfBytes };", "scan = { ...book, slug: book.parts[0].slug, pdf: book.parts[0].pdf, pdfBytes: book.parts[0].pdfBytes };"],
  edge: ["js/hadith-book-pages.js", "(pt) => n >= pt.from && n <= pt.to", "(pt) => n >= pt.from && n < pt.to"],
  frombook: ["js/hadith-book-pages.js", "const i = (map.parts || []).findIndex((pt) => n >= pt.from && n <= pt.to);", "const i = n <= 4990 ? 0 : 1;"],
  wrongleaf: ["js/hadith-book-pages.js", "const n = Math.max(0, Math.trunc(Number(leaf) || 0));", "const n = Math.max(0, Math.trunc(Number(leaf) || 0)) + 1;"],
  nodownload: ["js/hadith-book-pages.js", "const size = Math.max(1, Math.round((book.pdfBytes || 0) / 1e6));", "const size = 1; book.pdf = book.pdf ?? ''; book = { ...book, pdf: 'wrong.pdf' };"],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (process.argv.includes("--prove")) {
  let caught = 0;
  for (const name of Object.keys(MUT)) {
    const r = spawnSync("node", [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 600000 });
    const failed = /FAIL/.test(r.stdout) && r.status === 1 && !/anchor missing/.test(r.stdout + r.stderr);
    if (failed) caught++;
    console.log(`  ${failed ? "CAUGHT " : "MISSED "} ${name}: ${(r.stdout.match(/FAIL .*/) || [r.stderr.split("\n")[0]])[0].slice(0, 110)}`);
  }
  console.log(`\n==== hadith-nasai-pages mutations: ${caught} of ${Object.keys(MUT).length} caught ====`);
  process.exit(caught === Object.keys(MUT).length ? 0 : 1);
}
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

// ---- the map on disk
const NAS = "0303Nasai.SunanSughra.JK000130-ara1";
const mp = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/book-pages/nasai.json", "utf8"));
const reg = JSON.parse(fs.readFileSync("tools/hadith-data-pull/sources/book-pages.json", "utf8")).books.find((b) => b.key === "nasai");
const mapped = mp.p.map((v, i) => (v === null ? 0 : 1)).reduce((a, b) => a + b, 0);
check("registry: Nasa'i is mapped and names its own versionUri", reg.status === "mapped" && reg.versionUri === NAS);
check("map: 5,765 standard numbers, two parts in STANDARD numbers (1-5 holds up to 4983, vol 6 from 4988)", mp.numbers === 5765 && mp.p.length === 5765 && mp.parts.length === 2 && mp.parts[0].to === 4983 && mp.parts[1].from === 4988 && mp.parts[1].to === 5755, JSON.stringify(mp.parts));
check("map: at least 3,900 of 5,672 standard numbers have a page (69.9% today); the rest are null, never a guess", mapped >= 3900 && mapped <= 5672 && mp.p.every((v) => v === null || (Number.isInteger(v) && v >= 0)), String(mapped));
const part = (n) => (n <= mp.parts[0].to ? 0 : 1);
let backwards = 0, last = [-1, -1];
mp.p.forEach((v, i) => { if (v === null) return; const cur = [part(i + 1), v]; if (cur[0] < last[0] || (cur[0] === last[0] && cur[1] < last[1])) backwards++; last = cur; });
check("map: pages never go backwards across the two scan files", backwards === 0, String(backwards));
const ANCH = { 2: [0, 22], 2500: [0, 1416], 5000: [1, 24], 5755: [1, 377] };
check(`map: hand-read anchors ${Object.entries(ANCH).map(([n, [pi, l]]) => `${n} -> file ${pi + 1} leaf ${l}`).join(", ")}`, Object.entries(ANCH).every(([n, [pi, l]]) => part(Number(n)) === pi && mp.p[n - 1] === l));
check("map: the printed-number gap 4984-4987 has no page (it falls between the files)", [4984, 4985, 4986, 4987].every((n) => mp.p[n - 1] === null));

// ---- the app module
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 800 } });
if (MUTATE) {
  const [file, a, b] = MUT[MUTATE];
  await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript", body: src.replace(a, b) }); });
}
const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html");
const out = await P.evaluate(async (uri) => {
  const m = await import("/app/js/hadith-book-pages.js");
  const get = async (n) => { const r = await m.loadBookPage(uri, n); return r && { leaf: r.leaf, embed: r.embedUrl, open: r.openUrl, dl: m.bookDownload(r.book) }; };
  return { has: m.hasBookPages(uri), a2: await get(2), a2500: await get(2500), a4983: await get(4983), a4988: await get(4988), a5000: await get(5000), a5755: await get(5755), gap: await get(4985), past: await get(9999), keys: Object.keys(m.BOOK_PAGE_BOOKS).includes(uri) };
}, NAS);
const V1 = "All%20in%20One-Sunan%20Nasai-Eng-Vol%201-5", V6 = "All%20in%20One-Sunan%20Nasai-Eng-Vol%206";
check("the app lists Nasa'i", out.has && out.keys);
check("standard 2 and 2500 open file vol 1-5 at their leaves", out.a2?.leaf === 22 && out.a2.embed.includes(V1 + "#page/n22/") && out.a2500?.leaf === 1416 && out.a2500.open.includes(`/${V1}/page/n1416/`), JSON.stringify(out.a2500));
check("standard 5000 and 5755 open file vol 6 at their leaves", out.a5000?.leaf === 24 && out.a5000.embed.includes(V6 + "#page/n24/") && out.a5755?.leaf === 377 && out.a5755.embed.includes(V6 + "#page/n377/"), JSON.stringify(out.a5000));
check("the download link is the PDF of the SAME file as the page (vol 1-5 for 2500, vol 6 for 5000)", /Vol%201-5\.pdf$/.test(out.a2500?.dl?.url || "") && /Vol%206\.pdf$/.test(out.a5000?.dl?.url || "") && out.a5000.dl.megabytes === 16 && out.a2500.dl.megabytes === 102, JSON.stringify([out.a2500?.dl, out.a5000?.dl]));
check("the boundary: the last number of file 1 (4983) opens vol 1-5, the first of file 2 (4988) opens vol 6", out.a4983?.embed?.includes(V1) && out.a4988?.embed?.includes(V6), JSON.stringify([out.a4983?.embed, out.a4988?.embed]));
check("a number with no page (the gap, or past the end) shows nothing", out.gap === null && out.past === null);
check("no page errors", errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
await ctx.close(); await browser.close();
console.log(`\n==== Nasa'i printed page: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
