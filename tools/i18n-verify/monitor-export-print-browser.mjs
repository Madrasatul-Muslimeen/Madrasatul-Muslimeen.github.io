// Audit part 129 (PCF MSA J29, issue #1310): Monitor's "Download CSV" (week and month) and Print, in en and bn, with
// real-length names seeded HERE through extraSeedJs: a ~35-character Bangla name, an English name with a comma and a quote
// (Ahmad "Abu Zayd", Jr.) and a long English name, each with activity over several subjects.
//   csv   the file starts with the UTF-8 BOM EF BB BF; a real RFC 4180 parser gives the SAME number of fields on every row;
//         the comma-and-quote name round-trips exactly; the Bangla name is intact; the header row follows the app language
//   print the print-styled page, at A4 width (794px, print media), has no sideways overflow, keeps the report heading, and
//         its long names wrap inside their cells
// Mutations (the fixed file is edited, the run must FAIL, the file is restored): --mutate=bom  --mutate=printcss
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/monitor-export-print-browser.mjs
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const FILE = "app/js/monitor.js";
const ORIG = fs.readFileSync(FILE, "utf8");
const MUTATIONS = {
  bom: (s) => s.replace("new Blob([String.fromCharCode(0xFEFF) + csv]", "new Blob([csv]"),
  printcss: (s) => s.replace(/overflow-wrap:anywhere;word-break:break-word/, "white-space:nowrap").replace("table-layout:auto;", "table-layout:auto;min-width:1400px;"),
};
if (MUTATE) {
  if (!MUTATIONS[MUTATE]) throw new Error("unknown mutation " + MUTATE);
  const m = MUTATIONS[MUTATE](ORIG);
  if (m === ORIG) throw new Error("mutation did not apply");
  fs.writeFileSync(FILE, m);
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

// RFC 4180 parser (quoted fields, doubled quotes, commas and newlines inside quotes).
function parseCsv(text) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  return rows;
}
// positive control: a clean English row parses, and a tricky one does too
check("positive control: a clean English row parses to 3 fields", parseCsv('"a","b","c"')[0].length === 3);
check("positive control: a comma-and-quote field parses to one field", parseCsv('"Ahmad ""Abu Zayd"", Jr.","x"')[0][0] === 'Ahmad "Abu Zayd", Jr.');

const QUOTE_NAME = 'Ahmad "Abu Zayd", Jr.';
const BN_NAME = "মুহাম্মদ আব্দুল্লাহ আল-মামুন আশরাফ চৌধুরী";
const LONG_EN = "Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi Al-Qurashi";
const SEED = `
(function () {
  DATA.tenantPeople[0].name = lang(${JSON.stringify(LONG_EN)}, ${JSON.stringify(BN_NAME)});
  DATA.tenantPeople[1].name = lang(${JSON.stringify(QUOTE_NAME)}, ${JSON.stringify(QUOTE_NAME)});
  DATA.tenantPeople.push({ _id: "p3", tenantId: TENANT_ID, personId: "p3", name: lang("Fatima Zahra Al-Hashimi", ${JSON.stringify(BN_NAME)}), managedByPersonId: "p1", isMinor: true, roles: ["student"] });
  var subs = ["quran", "deen_ethics", "asma_ul_husna", "quran", "deen_ethics"];
  ["p1", "p2", "p3"].forEach(function (pid) {
    var entries = subs.map(function (s, i) { return { date: TODAY, subjectId: s, unitKey: i % 2 ? "topic:t4" + i : "ayah:2:" + (i + 1), unitType: i % 2 ? "topic" : "ayah", trackableId: "memorise", action: i % 2 ? "practised" : "claimed" }; });
    DATA.activity = DATA.activity.filter(function (a) { return a._id !== TENANT_ID + "__" + pid + "__" + THIS_WEEK; });
    DATA.activity.push({ _id: TENANT_ID + "__" + pid + "__" + THIS_WEEK, tenantId: TENANT_ID, personId: pid, weekKey: THIS_WEEK, entries: entries });
  });
})();`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const report = [];
try {
  for (const lang of ["en", "bn"]) {
    const ctx = await newContext(browser, { appLang: lang, accountLang: lang, banner: false, viewport: { width: 1280, height: 900 }, extraSeedJs: SEED });
    const { page } = await openPage(ctx, "/app/monitor.html");
    await page.waitForTimeout(2000);
    // Whole roster, so every seeded student is in the file.
    await page.evaluate(() => { const w = document.getElementById("wholeRoster"); if (w && !w.checked) { w.checked = true; w.dispatchEvent(new Event("change", { bubbles: true })); } });
    await page.waitForTimeout(800);
    const headings = {};
    for (const mode of ["week", "month"]) {
      if (mode === "month") { await page.click("#monthTabBtn"); await page.waitForTimeout(1200); }
      const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#csvBtn")]);
      const buf = fs.readFileSync(await dl.path());
      const start = [...buf.subarray(0, 3)].map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
      const text = buf.toString("utf8").replace(/^﻿/, "");
      const rows = parseCsv(text);
      const tag = `${lang} ${mode}`;
      const widths = [...new Set(rows.map((r) => r.length))];
      check(`${tag}: file starts with the UTF-8 BOM EF BB BF (starts ${start})`, start === "EF BB BF");
      check(`${tag}: header plus data rows were written (${rows.length} rows)`, rows.length >= 1 + 15);
      check(`${tag}: every row has the same field count (${widths.join(",")})`, widths.length === 1 && widths[0] === 6);
      check(`${tag}: the comma-and-quote name round-trips exactly`, rows.slice(1).some((r) => r[1] === QUOTE_NAME));
      if (lang === "bn") check(`${tag}: the Bangla name is intact`, rows.slice(1).some((r) => r[1] === BN_NAME));
      else check(`${tag}: the long English name is intact`, rows.slice(1).some((r) => r[1] === LONG_EN));
      headings[mode] = rows[0];
      report.push(`${tag}: bytes ${start}; header ${JSON.stringify(rows[0])}; rows ${rows.length}; field counts ${widths.join(",")}`);
    }
    check(`${lang}: week and month headers match`, JSON.stringify(headings.week) === JSON.stringify(headings.month));
    if (lang === "bn") check("bn: the header row is translated (no English heading left)", headings.week.every((h) => /[ঀ-৿]/.test(h)), JSON.stringify(headings.week));
    else check("en: the header row is English", headings.week[0] === "Date" && headings.week[1] === "Student");

    // Print: capture what printReportHtml writes, then lay it out at A4 width in print media.
    await page.click("#weekTabBtn");
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      window.__printed = "";
      window.open = () => ({ document: { write: (h) => { window.__printed += h; }, close() {} }, focus() {}, print() {}, close() {} });
    });
    await page.click("#printBtn");
    await page.waitForFunction(() => window.__printed.length > 0);
    const html = await page.evaluate(() => window.__printed);
    const pp = await ctx.newPage();
    await pp.setViewportSize({ width: 794, height: 1123 });
    await pp.setContent(html);
    await pp.emulateMedia({ media: "print" });
    const m = await pp.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const over = [...document.querySelectorAll("table, th, td, h1, p")].filter((e) => e.getBoundingClientRect().right > W + 1).map((e) => e.tagName + ":" + Math.round(e.getBoundingClientRect().right));
      return { W, sw: document.documentElement.scrollWidth, over, h1: document.querySelector("h1")?.textContent || "", tables: document.querySelectorAll("table").length };
    });
    check(`${lang} print: report heading present ("${m.h1}")`, m.h1.length > 3);
    check(`${lang} print: a table is on the page (${m.tables})`, m.tables > 0);
    check(`${lang} print: no sideways overflow at A4 (scrollWidth ${m.sw} vs ${m.W}; over ${m.over.join(",")})`, m.sw <= m.W && m.over.length === 0);
    report.push(`${lang} print @794: scrollWidth ${m.sw}, over ${m.over.length}, tables ${m.tables}, heading "${m.h1}"`);
    await ctx.close();
  }
} finally {
  if (MUTATE) fs.writeFileSync(FILE, ORIG);
  await browser.close();
}
console.log(report.map((l) => "  info  " + l).join("\n"));
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
if (MUTATE) { console.log(`MUTATION ${MUTATE}: ${fail ? "caught (the check CAN fail)" : "NOT caught"}`); process.exit(fail ? 1 : 2); }
process.exit(fail ? 1 : 0);
