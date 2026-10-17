// QR's offline-cache and storage names must never clash with MMSA's (mm-…).
// Run from the repository root: node tools/apps/qr-verify/naming.mjs
// Checks every cache name in app/sw.js starts with "qr-", and that no "mm-app-" style
// cache name survives a copy from MMSA. Passes trivially until app/sw.js exists.
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";

// QR's own worker (app/sw.js; J01 R2, J02 S3): every cache it uses starts with "qr-", the app cache is
// qr-app-<version>, MMSA's other three caches appear under QR names (qr-qf-fonts-v1, qr-ext-v1, qr-mushaf-v1) beside
// Asma's qr-quran-v1, no MMSA (mm-) cache name appears, and the clean-up only matches QR prefixes, never qr-quran.
let pass = 0, fail = 0;
const check = (ok, what) => { ok ? pass++ : fail++; console.log(`${ok ? "ok  " : "FAIL"} ${what}`); };

const sw = "app/sw.js";
if (!fs.existsSync(sw)) {
  check(true, `${sw} not written yet (nothing to check)`);
} else {
  const src = fs.readFileSync(sw, "utf8");
  const mm = [...src.matchAll(/["'`](mm-[a-z-]+)/g)].map((m) => m[1]);
  check(mm.length === 0, `no MMSA cache names in ${sw}${mm.length ? ": " + mm.join(", ") : ""}`);
  check(/`qr-app-\$\{[^}]+\}`/.test(src), `${sw} names its app cache qr-app-<version>`);
  const names = [...src.matchAll(/(?:caches\.open|caches\.delete)\(\s*([A-Z_]+|["'`][^"'`]+["'`])/g)].map((m) => m[1]);
  const consts = Object.fromEntries([...src.matchAll(/const ([A-Z_]+) = (["'`])([^"'`]+)\2/g)].map((m) => [m[1], m[3]]));
  const literal = names.map((n) => consts[n] ?? n.replace(/^["'`]|["'`]$/g, "")).filter((n) => n !== "key");
  check(literal.length > 0 && literal.every((n) => n.startsWith("qr-")), `every cache ${sw} opens starts with qr- (${literal.join(", ")})`);
  // J02 S3: the worker now also holds MMSA's three other caches under QR names (QR-PLAN's table).
  for (const name of ["qr-qf-fonts-v1", "qr-ext-v1", "qr-mushaf-v1", "qr-quran-v1", "qr-hadith-v1"]) check(src.includes(`"${name}"`), `${sw} uses ${name}`);
  const prefixes = [...src.matchAll(/startsWith\(\s*["'`]([a-z-]+)["'`]/g)].map((m) => m[1]).filter((p) => p.endsWith("-"));
  const allowed = ["qr-app-", "qr-qf-fonts-", "qr-ext-", "qr-mushaf-"];
  check(prefixes.length > 0 && prefixes.every((p) => allowed.includes(p)), `old-cache clean-up only touches qr- caches, never qr-quran (${prefixes.join(", ") || "none"})`);
  check(/key\.startsWith\("qr-app-"\) && key !== APP_CACHE\) await caches\.delete\(key\)/.test(src), "the clean-up keeps the current app cache and deletes only other qr-app- ones");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
