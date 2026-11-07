// Keys to Understanding K1 Part B (PCF MSA J03): the marks Difficult / Need practice / Done on a HadeethEnc hadith card
// (hadith:hadeethenc:<id>) and on one word in the Hadith Word Card (hadithword:hadeethenc:<id>:<position>), on K0's saving layer.
//   - the three marks show, named in the reader's language; nothing is read until the row first shows, then ONCE (I9);
//   - pressing a mark writes hadithKeyMarks/{tenant}__{person}__hadeethenc with that unit's list; pressing it again writes the
//     SHORTER list (never a delete, I4); the word's position is the one hadith-words.js gives (the Word Card's own tokeniser);
//   - a refused save is said in words on the row and the mark is not shown as set (I15);
//   - the controls are 40px tall and fit 360-1280px, in English and Bangla, at 100/150/200% text.
// Run from the repository root with serve.js on :8080. Exits 0 only when every check passed.
//   --mutate=<name> serves one deliberate break (the run must FAIL); --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";
import { tokeniseHadith } from "../../app/js/hadith-words.js";

const MUT = {
  nowrite: ["js/hadith-key-marks.js", "const args = { scope: session.personId,", "const args = { scope: \"someone-else\","],
  wrongpos: ["js/hadith-key-marks.js", "setHadithWordKey(db, session, { ...args, position })", "setHadithWordKey(db, session, { ...args, position: position + 1 })"],
  nofailmsg: ["js/hadith-key-marks.js", "else say(t(\"That mark was not saved. Check the connection and try again.\"));", "else say(null);"],
  eagerread: ["js/hadith-key-marks.js", "export const MARKS_COLLECTION = \"hadeethenc\";", "export const MARKS_COLLECTION = \"hadeethenc\";\nsetTimeout(() => { const s = { tenantId: \"t1\", personId: \"p1\", uid: \"test-uid\" }; loadHadithKeys(db, s, \"hadeethenc\").catch(() => {}); }, 0);"],
  noreadonce: ["js/hadith-key-marks.js", "  if (readPromise && readFor === who) return readPromise;", ""],
  keepon: ["js/hadith-key-marks.js", "const on = !marksIn(current).includes(id);", "const on = true;"],
  // Two edits: the shared admin-touch.css keeps every button 40px by itself, so a break of this round's own rule alone goes uncaught.
  smallbtn: [["css/hadith.css", ".hkm-btn { min-height: 40px;", ".hkm-btn { min-height: 20px; height: 20px; padding: 0;"],
    ["css/admin-touch.css", "box-sizing: border-box; min-height: 40px; } /* audit3 buttons */", "box-sizing: border-box; } /* audit3 buttons */"]],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
if (process.argv.includes("--prove")) {
  const missed = []; let caught = 0;
  for (const name of Object.keys(MUT)) {
    const r = spawnSync(process.execPath, [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const out = (r.stdout || "").trim(); const ff = out.split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && ff) { caught++; console.log(`  CAUGHT  ${name}: ${ff.trim().slice(0, 130)}`); } else { missed.push(name); console.log(`  MISSED  ${name}`); }
  }
  console.log(`\n==== hadith-key-marks mutations: ${caught} of ${Object.keys(MUT).length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}

// The word's position as the one tokeniser counts it, read from the real data.
let ARABIC = null;
for (const f of fs.readdirSync("tools/hadith-data-pull/output/hadeethenc/ar")) {
  const h = JSON.parse(fs.readFileSync(`tools/hadith-data-pull/output/hadeethenc/ar/${f}`, "utf8")).hadiths.find((x) => x.id === "65070");
  if (h) { ARABIC = h.hadeeth; break; }
}
const POS = tokeniseHadith(ARABIC).find((x) => x.norm === "ويوشك").pos;

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function open(lang, width, zoom = 1) {
  // The person's own marks document already exists, as it does in production after a first mark: the stub never mutates its
  // own data, so without it a second press would meet "no document" and (correctly) write nothing.
  const extraSeedJs = `DATA.hadithKeyMarks = [{ _id: "t1__p1__hadeethenc", tenantId: "t1", scope: "p1", collection: "hadeethenc", schemaVersion: 1, createdBy: "test-uid", entries: {} }];`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 800 }, extraSeedJs });
  if (MUTATE) {
    const edits = Array.isArray(MUT[MUTATE][0]) ? MUT[MUTATE] : [MUT[MUTATE]];
    for (const [file, a, b] of edits) {
      await ctx.route(`**/app/${file}*`, async (r) => {
        const src = fs.readFileSync(`app/${file}`, "utf8");
        if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
        await r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(a).join(b) });
      });
    }
  }
  const { page, errors } = await openPage(ctx, "/app/hadith-study.html?resume=hadith:hadeethenc:65070");
  if (zoom !== 1) await page.evaluate((z) => { document.documentElement.style.fontSize = `${16 * z}px`; }, zoom);
  await page.waitForSelector('[data-hkm-row="65070"]', { timeout: 25000 }).catch(() => {});
  return { ctx, page, errors };
}
const reads = (p) => p.evaluate(() => (window.__fsLog || []).filter((r) => r.col === "hadithKeyMarks" && r.kind === "getDoc").length);
const writes = (p) => p.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "hadithKeyMarks"));
const pressed = (p, row, id) => p.$eval(`[data-hkm-row="${row}"] [data-hkm-mark="${id}"]`, (b) => b.getAttribute("aria-pressed")).catch(() => null);
const lastEntry = (ws, uk) => { for (let i = ws.length - 1; i >= 0; i--) { const d = ws[i].data ?? ws[i]; const e = d.entries?.[uk] ?? d[`entries.${uk}`]; if (e) return { e, doc: ws[i].id ?? ws[i].docId ?? "" }; } return null; };

{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 1280, height: 800 } });
  const { page: P } = await openPage(ctx, "/app/hadith-study.html");
  await P.waitForSelector("[data-openiti-book]");
  await P.waitForTimeout(800);
  check("[en 1280] a Hadith page with no hadith card open reads no marks at all (I9)", (await reads(P)) === 0, String(await reads(P)));
  await ctx.close();
}

for (const [lang, width, zoom] of [["en", 1280, 1], ["bn", 390, 1], ["en", 360, 2]]) {
  const tag = `[${lang} ${width}px x${zoom}]`;
  console.log(`\n===== hadith key marks ${tag} =====`);
  const { ctx, page: P, errors } = await open(lang, width, zoom);
  const names = await P.$$eval('[data-hkm-row="65070"] [data-hkm-mark]', (bs) => bs.map((b) => b.textContent.trim()));
  check(`${tag} the card shows the three marks`, names.length === 3, JSON.stringify(names));
  check(`${tag} named in the reader's language`, lang === "en" ? names.join("|") === "Difficult|Need practice|Done" : names.join("|") === "কঠিন|অনুশীলন দরকার|সম্পন্ন", names.join("|"));
  await P.waitForTimeout(400);
  check(`${tag} the marks were read once (two documents: the madrasah's and mine, I9)`, (await reads(P)) === 2, String(await reads(P)));
  check(`${tag} nothing is marked at first`, (await pressed(P, "65070", "hard")) === "false");
  await P.click('[data-hkm-row="65070"] [data-hkm-mark="hard"]');
  await P.waitForFunction(() => document.querySelector('[data-hkm-row="65070"] [data-hkm-mark="hard"]')?.getAttribute("aria-pressed") === "true", null, { timeout: 8000 }).catch(() => {});
  check(`${tag} pressing Difficult shows it on`, (await pressed(P, "65070", "hard")) === "true");
  let w = lastEntry(await writes(P), "hadith:hadeethenc:65070");
  check(`${tag} it is saved under hadith:hadeethenc:65070 as ["hard"]`, JSON.stringify(w?.e) === '["hard"]', JSON.stringify(w));
  check(`${tag} in the reader's own document (…__hadeethenc, not the madrasah's)`, !!w && /__hadeethenc$/.test(w.doc) && !/__madrasah__/.test(w.doc), w?.doc);
  await P.click('[data-hkm-row="65070"] [data-hkm-mark="hard"]');
  await P.waitForFunction(() => document.querySelector('[data-hkm-row="65070"] [data-hkm-mark="hard"]')?.getAttribute("aria-pressed") === "false", null, { timeout: 8000 }).catch(() => {});
  w = lastEntry(await writes(P), "hadith:hadeethenc:65070");
  check(`${tag} pressing it again saves the SHORTER list, [] (nothing deleted, I4)`, JSON.stringify(w?.e) === "[]" && (await pressed(P, "65070", "hard")) === "false", JSON.stringify(w));
  check(`${tag} the three controls are at least 40px tall`, (await P.$$eval('[data-hkm-row="65070"] .hkm-btn', (ns) => Math.min(...ns.map((n) => n.getBoundingClientRect().height)))) >= 39.5);
  check(`${tag} the row fits the screen`, await P.$eval('[data-hkm-row="65070"]', (n) => { const r = n.getBoundingClientRect(); return r.left >= -0.5 && r.right <= document.documentElement.clientWidth + 0.5; }));
  // one word, in the Hadith Word Card
  await P.click(".hwc-switch"); await P.waitForSelector("[data-hwc-kind]", { timeout: 15000 });
  const readsBefore = await reads(P);
  await P.click('[data-hwc-kind="h"]:has-text("ويوشك")'); await P.waitForSelector("[data-hwc-sheet]");
  await P.waitForTimeout(300);
  check(`${tag} opening a word's marks does not read the document again (once per page, I9)`, (await reads(P)) === readsBefore, `${readsBefore} -> ${await reads(P)}`);
  const wordRow = `65070:${POS}`;
  check(`${tag} the Word Card has its own three marks, numbered by the shared tokeniser (word ${POS})`, (await P.$$(`[data-hkm-row="${wordRow}"] [data-hkm-mark]`)).length === 3);
  await P.click(`[data-hkm-row="${wordRow}"] [data-hkm-mark="practice"]`);
  await P.waitForFunction((r) => document.querySelector(`[data-hkm-row="${r}"] [data-hkm-mark="practice"]`)?.getAttribute("aria-pressed") === "true", wordRow, { timeout: 8000 }).catch(() => {});
  const wk = lastEntry(await writes(P), `hadithword:hadeethenc:65070:${POS}`);
  check(`${tag} Need practice is saved under hadithword:hadeethenc:65070:${POS}`, JSON.stringify(wk?.e) === '["practice"]', JSON.stringify(wk));
  check(`${tag} the hadith's own marks are untouched by a word's`, (await pressed(P, "65070", "practice")) === "false");
  check(`${tag} the sheet's mark buttons are at least 40px tall`, (await P.$$eval(`[data-hkm-row="${wordRow}"] .hkm-btn`, (ns) => Math.min(...ns.map((n) => n.getBoundingClientRect().height)))) >= 39.5);
  // a refused save
  await P.evaluate(() => { window.__stubFailWrites = true; });
  await P.click(`[data-hkm-row="${wordRow}"] [data-hkm-mark="done"]`);
  await P.waitForTimeout(600);
  const note = await P.$eval(`[data-hkm-row="${wordRow}"] .hkm-note`, (n) => ({ hidden: n.hidden, text: n.textContent })).catch(() => null);
  check(`${tag} a refused save is said in words and the mark is not shown as set (I15)`, !!note && !note.hidden && note.text.length > 15 && (await pressed(P, wordRow, "done")) === "false", JSON.stringify(note));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource|\[write failure\]/i.test(e)).length === 0, errors.slice(0, 2).join(" | ")); // the refused write's own console line (I15) is the deliberate one
  await ctx.close();
}
await browser.close();
console.log(`\n==== hadith-key-marks: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
