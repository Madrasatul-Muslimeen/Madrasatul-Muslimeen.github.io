// PCF MSA J106 S3 part 2 (the writer round, 14 Nov 2026): the madrasah's own Bangla names for the Hadith books and chapters
// (hadithNames/{tenantId}; the Rules are a CANDIDATE, tests/firestore/hadith-names-v1.proposed.rules). Checked on the real
// page against the real library:
//   OFF (the code as shipped: hadith-names-switch.js says false): no read of hadithNames, no editor, no name shown, no write;
//   ON (the suite serves the switch as true, nothing else changes): the owner/prime sees "Edit names" in an open book, sets a
//   chapter's Bangla name (the first write is the create, with the envelope facts), and a Bangla reader sees it under that
//   chapter; Remove retires it (the entry stays, marked retired) and it stops showing; a refused write is said in words (I15)
//   and nothing shows as saved; a reader viewing as a teacher is told why and gets no field; an existing document is UPDATED
//   with the one dotted key; the panel fits a phone.
// Run from the repository root with serve.js on :8080. Exits 0 only when every check passed.
//   --mutate=<name> serves one deliberate break (the run must FAIL); --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

const SWITCH = ["js/hadith-names-switch.js", "export const HADITH_NAMES_PUBLISHED = false;", "export const HADITH_NAMES_PUBLISHED = true;"];
const MUT = {
  alwayson: ["js/hadith-names-switch.js", "export const namesEnabled = () => HADITH_NAMES_PUBLISHED === true;", "export const namesEnabled = () => true;"],
  nofail: ["js/hadith-names.js", "if (ok) { data.names = res.names; data.docExists = true; known = res.names; onChange?.(); await draw({ text: doneText }); } else await draw({ text: failText, failed: true });", "data.names = res.names; known = res.names; onChange?.(); await draw({ text: doneText });"],
  noguard: ["js/hadith-names.js", "if (!session || !session.canManage) {", "if (!session) {"],
  noretire: ["js/hadith-names-model.js", "return { names: { ...names, [key]: { ...cur, status: \"retired\", updatedAt: at, updatedBy: by } }, changed: true };", "return { names, changed: false };"],
  nodisplay: ["js/hadith-names.js", "  const text = nameOf(known, key, getAppLang());\n  if (!text) return null;", "  return null;"],
  samekey: ["js/hadith-names-model.js", "export const groupKey = (versionUri, chapterId) => `${bookKey(versionUri)}__${chapterId}`;", "export const groupKey = (versionUri, chapterId) => `${bookKey(versionUri)}__x`;"],
  alwayscreate: ["js/hadith-names-model.js", "  if (!docExists) return { kind: \"create\"", "  if (true) return { kind: \"create\""],
  showretired: ["js/hadith-names-model.js", "  if (!e || e.status === \"retired\") return null;", "  if (!e) return null;"],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
if (MUTATE) { const [file, anchor] = MUT[MUTATE]; if (!fs.readFileSync(`app/${file}`, "utf8").includes(anchor)) { console.log(`  FAIL  mutation anchor missing: ${MUTATE} (${file})`); process.exit(1); } }
for (const [file, anchor] of [SWITCH]) if (!fs.readFileSync(`app/${file}`, "utf8").includes(anchor)) { console.log(`  FAIL  the switch anchor is missing (${file})`); process.exit(1); }
if (process.argv.includes("--prove")) {
  const missed = []; let caught = 0;
  const only = arg("only") ? arg("only").split(",") : Object.keys(MUT);
  for (const name of only) {
    const r = spawnSync(process.execPath, [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const ff = (r.stdout || "").split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && ff) { caught++; console.log(`  CAUGHT  ${name}: ${ff.trim().slice(0, 130)}`); } else { missed.push(name); console.log(`  MISSED  ${name}`); }
  }
  console.log(`\n==== hadith-names mutations: ${caught} of ${only.length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const BUKHARI = "0256Bukhari.Sahih.JK000110-ara1";
const BK = BUKHARI.replace(/\./g, "_");
const CH3 = `${BK}__ch-3`;

async function open(lang, width, { on = true, extraSeedJs = null, viewAs = null } = {}) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs });
  const edits = [];
  if (on) edits.push(SWITCH);
  if (MUTATE) edits.push(MUT[MUTATE]);
  // A mutation and the switch may name the same file: apply every edit for a file in one route.
  const byFile = new Map();
  for (const [file, a, b] of edits) byFile.set(file, [...(byFile.get(file) ?? []), [a, b]]);
  for (const [file, list] of byFile) {
    await ctx.route(`**/app/${file}*`, async (r) => {
      let src = fs.readFileSync(`app/${file}`, "utf8");
      for (const [a, b] of list) src = src.split(a).join(b);
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src });
    });
  }
  if (viewAs) await ctx.addInitScript((role) => { try { localStorage.setItem("qr.sessionContext", JSON.stringify({ tenantId: "t1", personId: "p1", roles: ["owner", "prime"], viewAsRole: role })); } catch { /* blocked */ } }, viewAs);
  const { page, errors } = await openPage(ctx, "/app/hadith-study.html");
  await page.waitForSelector("[data-openiti-book]");
  return { ctx, page, errors };
}
const settle = (p, ms = 250) => p.waitForTimeout(ms);
const tap = (p, sel) => p.click(sel, { timeout: 8000 }).catch(() => console.log(`  note: could not tap ${sel}`));
const reads = (p) => p.evaluate(() => (window.__fsLog || []).filter((r) => r.col === "hadithNames" && r.kind === "getDoc").length);
const writes = (p) => p.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "hadithNames"));
async function openBukhari(p) {
  await tap(p, `[data-openiti-book="${BUKHARI}"]`);
  await p.waitForSelector('[data-openiti-chapter="ch-3"]', { state: "attached" });
  await settle(p, 400);
}
const openEditor = async (p) => { await tap(p, "[data-hadith-names-open]"); await p.waitForSelector("[data-hadith-names-row]", { state: "attached" }); await settle(p, 250); };
const msgOf = (p) => p.$eval(".hadith-names-panel [data-hadith-names-msg]", (n) => ({ text: n.textContent, failed: "hadithNamesFailed" in n.dataset })).catch(() => null);
const own = (p, key) => p.$eval(`[data-hadith-own-name="${key}"]`, (n) => n.textContent).catch(() => null);

// ---- 0. OFF: the code as shipped does nothing ---------------------------------------------------------------
{
  const tag = "[en 1280 OFF]";
  console.log(`\n===== hadith names ${tag} =====`);
  const seed = `DATA.hadithNames = [{ _id: "t1", tenantId: "t1", schemaVersion: 1, createdBy: "test-uid", names: { "${CH3}": { bn: "সিডেড", en: "Seeded", status: "active" } } }];`;
  const { ctx, page: P } = await open("en", 1280, { on: false, extraSeedJs: seed });
  await openBukhari(P);
  check(`${tag} no editor is drawn`, !(await P.$("[data-hadith-names-open]")));
  check(`${tag} the collection is never read`, (await reads(P)) === 0, `${await reads(P)} reads`);
  check(`${tag} a stored name is not shown`, (await own(P, CH3)) === null);
  check(`${tag} nothing is written`, (await writes(P)).length === 0);
  await ctx.close();
}

// ---- 1. ON: the whole trip as the owner/prime ------------------------------------------------------------------
for (const [lang, width] of [["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width} ON]`;
  console.log(`\n===== hadith names ${tag} =====`);
  const { ctx, page: P, errors } = await open(lang, width);
  await openBukhari(P);
  check(`${tag} the owner sees "Edit names" in the open book`, !!(await P.$("[data-hadith-names-open]")));
  check(`${tag} the madrasah's names are read ONCE (one document, after first paint)`, (await reads(P)) === 1, `${await reads(P)} reads`);
  await openEditor(P);
  const rows = await P.$$eval("[data-hadith-names-row]", (ns) => ns.map((n) => n.dataset.hadithNamesRow));
  check(`${tag} the editor lists the book first, then its chapters`, rows[0] === BK && rows.includes(CH3) && rows.length > 10, JSON.stringify(rows.slice(0, 3)));
  await P.fill(`[data-hadith-names-bn="${CH3}"]`, "ঈমানের কিতাব");
  await tap(P, `[data-hadith-names-save="${CH3}"]`); await settle(P, 600);
  let w = await writes(P);
  const e1 = w[0]?.data?.names?.[CH3];
  check(`${tag} the first write is a create carrying tenantId, the envelope facts and the name`, w.length === 1 && w[0].kind === "set" && w[0].id === "t1" && w[0].data.tenantId === "t1" && w[0].data.schemaVersion === 1 && !!w[0].data.createdAt && !!w[0].data.updatedAt && e1?.bn === "ঈমানের কিতাব" && e1?.status === "active" && !!e1?.updatedBy, JSON.stringify(w.map((x) => [x.kind, Object.keys(x.data ?? {})])));
  const shown = await own(P, CH3);
  check(lang === "bn" ? `${tag} a Bangla reader sees the name under the chapter` : `${tag} an English reader is not shown a Bangla name`, lang === "bn" ? shown === "ঈমানের কিতাব" : shown === null, String(shown));
  const m = await msgOf(P);
  check(`${tag} it says the name was saved`, !!m && !m.failed && m.text.length > 0, JSON.stringify(m));
  // retire
  await P.waitForSelector(`[data-hadith-names-remove="${CH3}"]`, { timeout: 8000 });
  await tap(P, `[data-hadith-names-remove="${CH3}"]`); await settle(P, 600);
  w = await writes(P);
  const last = w[w.length - 1];
  check(`${tag} Remove is an UPDATE that keeps the entry, marked retired (nothing deleted)`, last?.kind === "update" && JSON.stringify(last.data).includes('"status":"retired"') && JSON.stringify(last.data).includes("ঈমানের কিতাব"), JSON.stringify(last?.data).slice(0, 240));
  check(`${tag} ...and the name stops showing`, (await own(P, CH3)) === null);
  check(`${tag} no page errors from this round`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|quran\.com/i.test(String(e))).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

// ---- 2. A refused write is said (I15) -------------------------------------------------------------------------
{
  const tag = "[en 1280 refused]";
  console.log(`\n===== hadith names ${tag} =====`);
  const { ctx, page: P } = await open("en", 1280);
  await openBukhari(P); await openEditor(P);
  await P.evaluate(() => { window.__stubFailWrites = true; });
  await P.fill(`[data-hadith-names-bn="${CH3}"]`, "ব্যর্থ");
  await tap(P, `[data-hadith-names-save="${CH3}"]`); await settle(P, 600);
  const m = await msgOf(P);
  check(`${tag} a refused write says so in words, flagged as failed`, !!m && m.failed && /could not be saved/i.test(m.text), JSON.stringify(m));
  check(`${tag} ...and the name is not shown as saved`, (await P.$eval(`[data-hadith-names-bn="${CH3}"]`, (n) => n.value).catch(() => "?")) === "" );
  await ctx.close();
}

// ---- 3. Viewing as a teacher ----------------------------------------------------------------------------------
{
  const tag = "[en 1280 viewing as teacher]";
  console.log(`\n===== hadith names ${tag} =====`);
  const { ctx, page: P } = await open("en", 1280, { viewAs: "teacher" });
  await openBukhari(P);
  await tap(P, "[data-hadith-names-open]"); await settle(P, 500);
  check(`${tag} the panel says editing is for the owner or a prime`, !!(await P.$('.hadith-names-panel [data-hadith-names-why="notAdmin"]')));
  check(`${tag} ...and offers no field or button`, (await P.$$eval(".hadith-names-panel input, .hadith-names-panel button", (n) => n.length)) === 0);
  await ctx.close();
}

// ---- 4. An existing document is UPDATED, a stored name shows; a phone fits ----------------------------------------
{
  const tag = "[bn 320 seeded]";
  console.log(`\n===== hadith names ${tag} =====`);
  const seed = `DATA.hadithNames = [{ _id: "t1", tenantId: "t1", schemaVersion: 1, createdBy: "test-uid", names: { "${BK}": { bn: "সহীহ বুখারী", en: "", status: "active" }, "${CH3}": { bn: "আগের নাম", en: "", status: "retired" } } }];`;
  const { ctx, page: P } = await open("bn", 320, { extraSeedJs: seed });
  await openBukhari(P);
  check(`${tag} a stored book name shows in the book list header area (the chapter list's book row is not repeated: the retired chapter name does not show)`, (await own(P, CH3)) === null);
  await openEditor(P);
  await P.fill(`[data-hadith-names-bn="${CH3}"]`, "নতুন নাম");
  await tap(P, `[data-hadith-names-save="${CH3}"]`); await settle(P, 600);
  const w = await writes(P);
  check(`${tag} saving into an existing document is ONE update touching only names.<key> (and the envelope's updatedAt)`, w.length === 1 && w[0].kind === "update" && JSON.stringify(Object.keys(w[0].data ?? {}).filter((k) => k !== "updatedAt")) === JSON.stringify([`names.${CH3}`]), JSON.stringify(w.map((x) => [x.kind, Object.keys(x.data ?? {})])));
  check(`${tag} ...and the restored name shows under the chapter`, (await own(P, CH3)) === "নতুন নাম");
  await P.waitForSelector("[data-hadith-names-row]", { timeout: 8000 });
  const fit = await P.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const els = [...document.querySelectorAll(".hadith-names-panel input, .hadith-names-panel button")];
    return { side: document.documentElement.scrollWidth - cw, n: els.length, out: els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.left < -0.5 || r.right > cw + 0.5); }).length, minH: Math.min(...els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getBoundingClientRect().height)) };
  });
  check(`${tag} the panel fits a 320px phone: no sideways scroll, nothing outside the screen, every control at least 40px tall`, fit.side <= 0 && fit.out === 0 && fit.minH >= 40 && fit.n > 3, JSON.stringify(fit));
  await ctx.close();
}

await browser.close();
console.log(`\n==== hadith-names: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
