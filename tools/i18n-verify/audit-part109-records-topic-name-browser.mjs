// Audit part 109 (PCF MSA J29, I11): Records names a topic, it never prints the topic's id.
// The harness seeds activity "topic:t42" and a subject-tree node t42 named "Honesty in trade and daily dealings" /
// "ব্যবসা ও দৈনন্দিন লেনদেনে সততা". At 390 and 1440, in en and bn, the "This week's activity" table (and the entries table,
// given a topic entry) must show that NAME in the Unit cell, and never "t42" or "topic:".
// Monitor's activity table (390, 1440, en, bn) is held to the same rule; --mutate=monitornoname drops its resolver.
// Mutation: --mutate=oldlabel restores unitKeyLabel()'s old topic line (word + raw id); every run must then fail.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part109-records-topic-name-browser.mjs [--mutate=oldlabel]
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const UK = "app/js/unit-keys.js";
const ORIG = fs.readFileSync(UK, "utf8");
const MON = "app/monitor.html";
const MON_ORIG = fs.readFileSync(MON, "utf8");
if (MUTATE === "monitornoname") { // the Architect's: Monitor stops passing its name resolver (a bare "Topic" again)
  const m = MON_ORIG.replace("unitKeyLabel(e.unitKey, unitNameOf)", "unitKeyLabel(e.unitKey)");
  if (m === MON_ORIG) throw new Error("mutation did not apply");
  fs.writeFileSync(MON, m);
}
if (MUTATE === "oldlabel") {
  const m = ORIG.replace('if (unitType === "topic") {', 'if (false) {');
  if (m === ORIG) throw new Error("mutation did not apply");
  fs.writeFileSync(UK, m);
}

const NAMES = { en: "Honesty in trade and daily dealings", bn: "ব্যবসা ও দৈনন্দিন লেনদেনে সততা" };
const WORDS = { en: "Topic", bn: "বিষয়" };
// a topic entry in the records chunk too, so the entries table is proved as well
const SEED = `DATA.records.push({ _id: TENANT_ID + "__p1__subject_deen_ethics", tenantId: TENANT_ID, personId: "p1", chunkKey: "subject_deen_ethics",
  entries: { "topic:t42::reflect": { unitType: "topic", subjectId: "deen_ethics", trackableId: "reflect", claimedStatus: "learning",
    claimedByPersonId: "p1", confirmedStatus: null, confirmState: "pending", domainIds: [], notes: "" } } });`;

let fails = 0, runs = 0;
const ok = (c, m) => { if (!c) fails++; console.log(`${c ? "PASS" : "FAIL"}  ${m}`); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const lang of ["en", "bn"]) for (const w of [390, 1440]) {
    const ctx = await newContext(browser, { appLang: lang, accountLang: lang, banner: false, viewport: { width: w, height: 900 }, extraSeedJs: SEED });
    const { page } = await openPage(ctx, "/app/records.html?navBack=1");
    await page.waitForTimeout(1500);
    // show the topic entry's chunk if the page lets us pick one
    await page.evaluate(() => {
      const set = (id, v) => { const el = document.getElementById(id); if (el && [...el.options].some((o) => o.value === v)) { el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); } };
      set("subjectSelect", "deen_ethics"); set("unitTypeSelect", "topic");
    });
    await page.waitForTimeout(800);
    const cells = await page.evaluate(() => ({
      activity: [...document.querySelectorAll("#activityBody td:nth-child(3)")].map((c) => c.textContent.trim()),
      entries: [...document.querySelectorAll("#entriesBody td:first-child")].map((c) => c.textContent.trim()),
    }));
    const tag = `${lang} ${w}`;
    runs++;
    const act = cells.activity.find((t) => t.startsWith(WORDS[lang]));
    ok(!!act && act.includes(NAMES[lang]), `${tag}: activity table Unit cell shows the topic's name ("${act}")`);
    const all = [...cells.activity, ...cells.entries];
    ok(!all.some((t) => /\bt42\b|topic:/.test(t)), `${tag}: no cell shows t42 or "topic:" (${JSON.stringify(all)})`);
    const ent = cells.entries.find((t) => t.startsWith(WORDS[lang]));
    if (ent) ok(ent.includes(NAMES[lang]), `${tag}: entries table Unit cell shows the topic's name ("${ent}")`);
    else console.log(`note  ${tag}: no topic entry listed (chunk not selectable) -- entries table not proved at this run`);
    await page.screenshot({ path: `tools/i18n-verify/out/part109-${lang}-${w}.png`, fullPage: false }).catch(() => {});
    await ctx.close();
  }
  // Monitor's activity table names the topic too (it loads the same subject tree; the Architect's addition to part 109).
  for (const lang of ["en", "bn"]) for (const w of [390, 1440]) {
    const ctx = await newContext(browser, { appLang: lang, accountLang: lang, banner: false, viewport: { width: w, height: 900 } });
    const { page } = await openPage(ctx, "/app/monitor.html");
    await page.waitForFunction((word) => [...document.querySelectorAll("td")].some((c) => c.textContent.trim().startsWith(word)), WORDS[lang], { timeout: 10000 }).catch(() => {});
    const cells = await page.evaluate(() => [...document.querySelectorAll("td")].map((c) => c.textContent.trim()));
    const tag = `monitor ${lang} ${w}`;
    runs++;
    const act = cells.find((t) => t.startsWith(WORDS[lang]));
    ok(!!act && act.includes(NAMES[lang]), `${tag}: activity table Unit cell shows the topic's name ("${act}")`);
    ok(!cells.some((t) => /\bt42\b|topic:/.test(t)), `${tag}: no cell shows t42 or "topic:"`);
    await ctx.close();
  }
} finally {
  if (MUTATE) { fs.writeFileSync(UK, ORIG); fs.writeFileSync(MON, MON_ORIG); }
  await browser.close();
}
console.log(`\n==== Audit part 109: ${runs} runs, ${fails} failed ====`);
if (MUTATE) { console.log(`MUTATION ${MUTATE}: ${fails ? "caught (the check CAN fail)" : "NOT caught"}`); process.exit(fails ? 1 : 2); }
process.exit(fails ? 1 : 0);
