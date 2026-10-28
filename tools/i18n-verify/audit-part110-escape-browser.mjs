// Audit part 110 (PCF MSA J29, SECURITY): text a person typed, and tenant-authored names, must reach the page as TEXT,
// never as markup. The harness seeds a records entry whose notes and returnNote, a domain name, a trackable name and a
// subject name all hold an <img onerror> payload plus <b>bold</b>, and an activity row whose Hadith unit key holds it too.
// On Records and Monitor, in en and bn at 390 and 1440: window.__xss is never set, no <img src="x"> and no <b> is built
// from the seeded text, and "<b>bold</b>" is visible literally.
// Mutation: --mutate=records removes the escaping on Records (escapeHtml becomes a pass-through); every Records run must fail.
//          --mutate=monitor does the same on Monitor.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part110-escape-browser.mjs [--mutate=records|monitor]
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const FILES = { records: "app/records.html", monitor: "app/monitor.html" };
const ORIG = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, fs.readFileSync(f, "utf8")]));
if (MUTATE) {
  if (!FILES[MUTATE]) throw new Error("unknown mutation " + MUTATE);
  const re = /(function escapeHtml\(s\) \{\n)(\s*)return String\(s \?\? ""\)[^\n]*\n/;
  const m = ORIG[MUTATE].replace(re, (_, a, b) => `${a}${b}return String(s ?? "");\n`);
  if (m === ORIG[MUTATE]) throw new Error("mutation did not apply");
  fs.writeFileSync(FILES[MUTATE], m);
}

const PAYLOAD = '<img src=x onerror="window.__xss=(window.__xss||0)+1"><b>bold</b>';
const P = JSON.stringify(PAYLOAD);
const SEED = `
  const P = ${P};
  const nm = { en: P, bn: P };
  for (const r of DATA.records) for (const e of Object.values(r.entries)) { e.notes = P; if (e.confirmState === "returned") e.returnNote = P; }
  for (const d of DATA.domains) d.name = nm;
  for (const t of DATA.trackables) t.name = nm;
  for (const s of DATA.subjects) if (s.subjectId === "quran") s.name = nm;
  DATA.activity[0].entries.push({ date: TODAY, subjectId: "quran", unitKey: "hadith:" + P, unitType: "hadith", trackableId: "memorise", action: "claimed" });
`;

let fails = 0, runs = 0;
const ok = (c, m) => { if (!c) fails++; console.log(`${c ? "PASS" : "FAIL"}  ${m}`); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const which of ["records", "monitor"]) for (const lang of ["en", "bn"]) for (const w of [390, 1440]) {
    const ctx = await newContext(browser, { appLang: lang, accountLang: lang, banner: false, viewport: { width: w, height: 900 }, extraSeedJs: SEED });
    const { page } = await openPage(ctx, which === "records" ? "/app/records.html?navBack=1" : "/app/monitor.html");
    await page.waitForTimeout(2000);
    const r = await page.evaluate(() => ({
      xss: window.__xss ?? null,
      imgs: document.querySelectorAll('img[src="x"]').length,
      bolds: document.querySelectorAll("main b, table b, select b, label b, td b, span b, div b").length,
      literal: document.body.innerText.includes("<b>bold</b>") || [...document.querySelectorAll("td, option, span, label")].some((e) => e.textContent.includes("<b>bold</b>")),
      rows: document.querySelectorAll("#entriesBody tr, #reportBody tr").length,
    }));
    const tag = `${which} ${lang} ${w}`;
    runs++;
    ok(r.rows > 0, `${tag}: the page drew rows (${r.rows})`);
    ok(r.xss === null, `${tag}: window.__xss never set (${r.xss})`);
    ok(r.imgs === 0, `${tag}: no <img src="x"> built from the seeded text (${r.imgs})`);
    ok(r.bolds === 0, `${tag}: no <b> built from the seeded text (${r.bolds})`);
    ok(r.literal, `${tag}: "<b>bold</b>" is visible literally`);
    await ctx.close();
  }
} finally {
  if (MUTATE) fs.writeFileSync(FILES[MUTATE], ORIG[MUTATE]);
  await browser.close();
}
console.log(`\n==== Audit part 110: ${runs} runs, ${fails} failed ====`);
if (MUTATE) { console.log(`MUTATION ${MUTATE}: ${fails ? "caught (the check CAN fail)" : "NOT caught"}`); process.exit(fails ? 1 : 2); }
process.exit(fails ? 1 : 0);
