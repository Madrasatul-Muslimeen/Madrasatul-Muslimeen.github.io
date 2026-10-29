// Audit part 128: a failed READ reported through reportWriteFailure() must not say "That save did not go through".
// errors.js decides a read by context.read === true, or context.what/action starting read|load|count, or a named read action.
//   node tools/i18n-verify/read-failure-wording-browser.mjs [--mutate=no-read-words]
//   --mutate=no-read-words  the read branch is removed from plainMessageFor -> the read checks FAIL, the write checks still pass
import fs from "node:fs";
import path from "node:path";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && MUTATE !== "no-read-words") throw new Error(`unknown mutation ${MUTATE}`);
const ERRORS_JS = "app/js/errors.js";
function errorsSource() {
  let src = fs.readFileSync(ERRORS_JS, "utf8");
  if (MUTATE) {
    const from = "  if (isReadFailure(context)) return";
    if (src.split(from).length !== 2) throw new Error("mutation anchor not found exactly once");
    src = src.replace(from, "  if (false) return");
  }
  return src;
}

// ---- Static: every reportWriteFailure( call site in app/, classified by the rule ----
const { isReadFailure } = await import(`data:text/javascript;base64,${Buffer.from(errorsSource().replace(/^import .*$/m, "const t = (s) => s;")).toString("base64")}`);
function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(legacy|out)/.test(e.name)) walk(p, out); }
    else if (/\.(html|js)$/.test(e.name) && !e.name.startsWith("_prev")) out.push(p);
  }
  return out;
}
const sites = [];
for (const f of walk("app")) {
  if (f.endsWith("errors.js")) continue;
  const lines = fs.readFileSync(f, "utf8").split("\n");
  lines.forEach((l, i) => {
    const m = l.match(/reportWriteFailure\([^,)]+(?:,\s*(\{[^}]*\}))?/);
    if (m) sites.push({ f, line: i + 1, ctx: m[1] || "" });
  });
}
check("found the reportWriteFailure call sites (positive control)", sites.length >= 25, `found ${sites.length}`);
const ctxOf = (s) => {
  const what = /what:\s*"([^"]*)"/.exec(s.ctx)?.[1];
  const action = /action:\s*"([^"]*)"/.exec(s.ctx)?.[1];
  return { what, action };
};
const readSites = sites.filter((s) => { const c = ctxOf(s); return /^(read|load|count)\b/i.test(c.what || c.action || "") || ["ownerFolderTree", "notesForStudyUnit", "notesPaneRetry"].includes(c.action); });
check("at least 15 read sites exist", readSites.length >= 15, `${readSites.length}`);
for (const s of readSites) check(`classified as a read: ${s.f}:${s.line} ${s.ctx.slice(0, 60)}`, isReadFailure(ctxOf(s)) === true);
check("write site NOT a read: update the whole-Qur'an word total", isReadFailure({ what: "update the whole-Qur'an word total for this lemma" }) === false);
check("write site NOT a read: collection/action create", isReadFailure({ collection: "notes", action: "create" }) === false);
check("explicit flag: read === true", isReadFailure({ read: true }) === true);
check("'Reading' is not 'read' as a word boundary trap: 'readjust' is a write", isReadFailure({ what: "readjust order" }) === false);

// ---- Browser: 390, en and bn ----
const WORDS = {
  en: { read: "That information could not be loaded (unavailable). Please check your connection and try again.", write: "That save did not go through (weird). Please try again, and tell the admin if it keeps happening." },
  bn: { read: "এই তথ্য লোড করা যায়নি (unavailable)। অনুগ্রহ করে আপনার সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।", write: "সংরক্ষণটি সম্পন্ন হয়নি (weird)। অনুগ্রহ করে আবার চেষ্টা করুন, এবং বারবার হতে থাকলে প্রশাসককে জানান।" },
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"]) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: 390, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) await ctx.route("**/js/errors.js*", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: errorsSource() }));
  const { page } = await openPage(ctx, "/app/records.html");
  const show = (err, context) => page.evaluate(async ([err, context]) => {
    const m = await import("/app/js/errors.js");
    m.reportWriteFailure(err, context);
    const b = document.getElementById("qr-write-failure-banner");
    const r = b.getBoundingClientRect();
    return { text: b.firstChild.firstChild.textContent, ref: b.querySelector("[data-write-failure-ref]")?.textContent ?? "", fits: r.left >= 0 && r.right <= innerWidth, sx: document.documentElement.scrollWidth - innerWidth };
  }, [err, context]);
  const w = WORDS[lang];
  for (const [name, ctxo] of [["what: read Arabic word progress", { what: "read Arabic word progress" }], ["what: load the contents list", { what: "load the contents list" }], ["flag read:true", { read: true, collection: "x" }], ["action notesForStudyUnit", { action: "notesForStudyUnit" }]]) {
    const r = await show({ code: "unavailable" }, ctxo);
    check(`${lang} 390 read says it could not LOAD: ${name}`, r.text === w.read, JSON.stringify(r.text));
    check(`${lang} 390 read banner is not a save message: ${name}`, !/save|সংরক্ষণ/.test(r.text) && r.fits && r.sx <= 0);
  }
  const rr = await show({ code: "unavailable" }, { what: "read Arabic word progress" });
  check(`${lang} read banner keeps its Ref line`, /read Arabic word progress/.test(rr.ref) && /unavailable/.test(rr.ref), rr.ref);
  const wr = await show({ code: "weird" }, { collection: "notes", action: "create" });
  check(`${lang} 390 write keeps today's words exactly`, wr.text === w.write, JSON.stringify(wr.text));
  const wp = await show({ code: "permission-denied" }, { what: "update the whole-Qur'an word total for this lemma" });
  check(`${lang} 390 a write named 'update...' keeps the permissions sentence`, !/(loaded|লোড)/.test(wp.text) && wp.text.length > 20, wp.text);
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
