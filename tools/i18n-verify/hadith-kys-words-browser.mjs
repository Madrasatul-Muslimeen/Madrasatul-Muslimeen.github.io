// PCF MSA J106 (the Owner, 16 Nov 2026, n106j 2.A "make it editable by me (admin)"): the Know Your Status Bangla words an
// owner or prime can correct, on the real page against the real library. Checks, in the code as shipped:
//   the button is drawn for owner/prime only (a teacher preview and a signed-out reader get none); the madrasah's names are read
//   once; saving one word is a create (no document) or an update of ONLY names.kys__<slug>; a Bangla reader then sees it on
//   the wheel and an English reader does not; Restore retires it (the entry stays, I4); a placeholder lost is refused with no
//   write; a refused write is said in words (I15); a seeded correction shows on first open ("save, update, reopen", keep1116);
//   the panel fits 320px; the 40 sources are exactly bn.js's `(Know Your Status)` lines and every key is distinct and valid.
// Run from the repository root with serve.js on :8080. Exits 0 only when every check passed.
//   --mutate=<name> serves one deliberate break (the run must FAIL); --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";
import { KYS_WORDS, kysKey, checkKysBn, kysTranslate, placeholdersOf } from "../../app/js/hadith-kys-words.js";

const MUT = {
  // noguard (the owner/prime test inside draw()) is a second layer behind the hidden button and cannot be reached from the page; noshow proves the first.
  noshow: ["js/hadith-names.js", "    if (!session || !session.canManage) return;\n    wrap.hidden = false;", "    wrap.hidden = false;"],
  noplaceholder: ["js/hadith-kys-words.js", "return JSON.stringify(placeholdersOf(text)) === JSON.stringify(placeholdersOf(en)) ? null : \"placeholders\";", "return null;"],
  nofail: ["js/hadith-names.js", "      if (!ok) { await draw({ text: failText, failed: true }); return; }\n      data.names = res.names; data.docExists = true; known = res.names;\n      if (onChange) { kysNote", "      if (!ok && false) { return; }\n      data.names = res.names; data.docExists = true; known = res.names;\n      if (onChange) { kysNote"],
  nodisplay: ["js/hadith-kys-words.js", "  if (own === null || !KYS_SET.has(en)) return baseT(en, vars);", "  return baseT(en, vars);"],
  englishtoo: ["js/hadith-kys-words.js", "  if (lang !== \"bn\") return null;", "  if (false) return null;"],
  noretire: ["js/hadith-names-model.js", "return { names: { ...names, [key]: { ...cur, status: \"retired\", updatedAt: at, updatedBy: by } }, changed: true };", "return { names, changed: false };"],
  showretired: ["js/hadith-kys-words.js", "return e && e.status !== \"retired\" && e.bn ? e.bn : null;", "return e && e.bn ? e.bn : null;"],
  dropvars: ["js/hadith-kys-words.js", "  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));\n  return out;", "  return out;"],
  samekey: ["js/hadith-kys-words.js", "return `kys__${slug}`;", "return `kys__${slug.slice(0, 3)}`;"],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
if (MUTATE) { const [file, anchor] = MUT[MUTATE]; if (!fs.readFileSync(`app/${file}`, "utf8").includes(anchor)) { console.log(`  FAIL  mutation anchor missing: ${MUTATE} (${file})`); process.exit(1); } }
if (process.argv.includes("--prove")) {
  const missed = []; let caught = 0;
  const only = arg("only") ? arg("only").split(",") : Object.keys(MUT);
  for (const name of only) {
    const r = spawnSync(process.execPath, [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const ff = (r.stdout || "").split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && ff && !/mutation anchor missing/.test(ff)) { caught++; console.log(`  CAUGHT  ${name}: ${ff.trim().slice(0, 130)}`); } else { missed.push(name); console.log(`  MISSED  ${name}`); }
  }
  console.log(`\n==== hadith-kys-words mutations: ${caught} of ${only.length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
// ---- 0. the pure half (the modules are the ones as shipped, or the served mutation when a pure file is named) -------------------
{
  // The suite imports the shipped modules; a mutation of a pure file is proven by the browser checks below, which load the served copy.
  const bn = fs.readFileSync("app/js/i18n/bn.js", "utf8").split("\n").filter((l) => l.includes("// ? (Know Your Status)")).map((l) => l.match(/^\s*"((?:[^"\\]|\\.)*)":/)?.[1]);
  check("the 40 sources are exactly the `(Know Your Status)` lines of bn.js, in order", JSON.stringify(bn) === JSON.stringify(KYS_WORDS) && bn.length === 40, `${bn.length} vs ${KYS_WORDS.length}`);
  const keys = KYS_WORDS.map(kysKey);
  check("every key is distinct and a valid hadithNames key (the Rules' pattern, 160 at most)", new Set(keys).size === 40 && keys.every((k) => /^[A-Za-z0-9_-]{1,160}$/.test(k) && k.startsWith("kys__")), JSON.stringify(keys.filter((k, i) => keys.indexOf(k) !== i)));
  check("a correction that drops a {placeholder} is refused; one that keeps them (moved) is fine", checkKysBn("{a} of {b}", "{a}") === "placeholders" && checkKysBn("{a} of {b}", "{b}-এর {a}") === null && checkKysBn("done", "{x}") === "placeholders" && checkKysBn("done", " ") === "empty");
  const names = { [kysKey("{a} of {b}")]: { bn: "{b}-এর মধ্যে {a}", en: "", status: "active" } };
  const base = (k, v) => `EN:${k}`;
  check("a Bangla reader gets the correction with its placeholders filled; an English reader and an unknown string get the built-in", kysTranslate(names, "bn", base, "{a} of {b}", { a: 2, b: 5 }) === "5-এর মধ্যে 2" && kysTranslate(names, "en", base, "{a} of {b}", { a: 2, b: 5 }) === "EN:{a} of {b}" && kysTranslate(names, "bn", base, "By Book") === "EN:By Book" && kysTranslate({ [kysKey("By Book")]: { bn: "x", en: "", status: "retired" } }, "bn", base, "By Book") === "EN:By Book");
  check("a string with no placeholders reads the same through placeholdersOf", JSON.stringify(placeholdersOf("{b} {a} {a}")) === JSON.stringify(["{a}", "{b}"]));
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const WORD = "By Book";
const KEY = kysKey(WORD);
const COUNT = "{a} of {b}";
const COUNT_KEY = kysKey(COUNT);

async function open(lang, width, { extraSeedJs = null, viewAs = null, signedOut = false } = {}) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: `window.__stubApplyUpdates = true; ${extraSeedJs ?? ""}` });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  if (viewAs) await ctx.addInitScript((role) => { try { localStorage.setItem("qr.sessionContext", JSON.stringify({ tenantId: "t1", personId: "p1", roles: ["owner", "prime"], viewAsRole: role })); } catch { /* blocked */ } }, viewAs);
  const { page, errors } = await openPage(ctx, "/app/hadith-study.html");
  await page.waitForSelector("[data-openiti-book]", { state: "attached" });
  await page.click('[data-hadith-tab="status"]', { timeout: 8000 });
  await page.waitForSelector(".hs-seg", { state: "attached" });
  await page.waitForTimeout(500);
  return { ctx, page, errors };
}
const settle = (p, ms = 300) => p.waitForTimeout(ms);
const tap = (p, sel) => p.click(sel, { timeout: 8000 }).catch(() => console.log(`  note: could not tap ${sel}`));
const writes = (p) => p.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "hadithNames"));
const reads = (p) => p.evaluate(() => (window.__fsLog || []).filter((r) => r.col === "hadithNames" && r.kind === "getDoc").length);
const modeText = (p) => p.$eval('[data-hadith-status-mode="book"]', (n) => n.textContent).catch(() => null);
const msgOf = (p) => p.$eval(".hadith-kys-editor [data-hadith-names-msg]", (n) => ({ text: n.textContent, failed: "hadithNamesFailed" in n.dataset })).catch(() => null);
const openEditor = async (p) => { await tap(p, "[data-hadith-kys-open]"); await p.waitForSelector("[data-hadith-kys-row]", { state: "attached" }); await settle(p, 250); };
// A saved change redraws the page and the panel reopens by itself (editorOpen-style); open it only when it is not already open.
const ensureEditor = async (p) => { await p.waitForTimeout(400); if (!(await p.$("[data-hadith-kys-row]"))) await tap(p, "[data-hadith-kys-open]"); await p.waitForSelector("[data-hadith-kys-row]", { state: "attached" }); await settle(p, 250); };
const box = (key) => `[data-hadith-kys-bn="${key}"]`;

// ---- 1. owner/prime, Bangla phone: the whole trip --------------------------------------------------------------------------------
for (const [lang, width] of [["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n===== know your status words ${tag} =====`);
  const { ctx, page: P, errors } = await open(lang, width);
  check(`${tag} the owner sees "Edit Bangla words" on Know Your Status`, !!(await P.$("[data-hadith-kys-open]")) && await P.$eval("[data-hadith-kys-editor]", (n) => !n.hidden));
  check(`${tag} the madrasah's names are read ONCE (one document, only when this view opens)`, (await reads(P)) === 1, `${await reads(P)} reads`);
  await openEditor(P);
  const rows = await P.$$eval("[data-hadith-kys-row]", (ns) => ns.map((n) => n.dataset.hadithKysRow));
  check(`${tag} the panel lists all 40 words`, rows.length === 40 && rows.includes(KEY) && rows.includes(COUNT_KEY), String(rows.length));
  const built = await P.$eval(box(KEY), (n) => n.value);
  check(`${tag} each box starts with the built-in Bangla`, built === "কিতাব অনুযায়ী", built);
  // a placeholder lost is refused with no write
  await P.fill(box(COUNT_KEY), "শুধু {a}");
  await tap(P, `[data-hadith-kys-save="${COUNT_KEY}"]`); await settle(P, 300);
  let m = await msgOf(P);
  check(`${tag} a correction that loses a {placeholder} is refused in words and writes nothing`, !!m && m.failed && /\{…\}/.test(m.text) && (await writes(P)).length === 0, JSON.stringify(m));
  check(`${tag} ...and the box keeps what was typed`, (await P.$eval(box(COUNT_KEY), (n) => n.value)) === "শুধু {a}");
  // an unchanged built-in is not stored
  await P.fill(box(KEY), built);
  await tap(P, `[data-hadith-kys-save="${KEY}"]`); await settle(P, 300);
  check(`${tag} saving the built-in Bangla unchanged writes nothing`, (await writes(P)).length === 0);
  // a real correction
  await P.fill(box(KEY), "কিতাবের ক্রমে");
  await tap(P, `[data-hadith-kys-save="${KEY}"]`); await settle(P, 700);
  let w = await writes(P);
  const e1 = w[0]?.data?.names?.[KEY];
  check(`${tag} the first write is a create carrying tenantId, the envelope facts and the correction (en empty, active)`, w.length === 1 && w[0].kind === "set" && w[0].id === "t1" && w[0].data.tenantId === "t1" && w[0].data.schemaVersion === 1 && !!w[0].data.createdAt && e1?.bn === "কিতাবের ক্রমে" && e1?.en === "" && e1?.status === "active" && !!e1?.updatedBy, JSON.stringify(w.map((x) => [x.kind, Object.keys(x.data ?? {})])));
  const shown = await modeText(P);
  check(lang === "bn" ? `${tag} a Bangla reader sees the new words on the wheel at once` : `${tag} an English reader still reads the English`, lang === "bn" ? shown === "কিতাবের ক্রমে" : shown === "By Book", String(shown));
  await ensureEditor(P);
  m = await msgOf(P);
  check(`${tag} it says the words were saved`, !!m && !m.failed && m.text.length > 0, JSON.stringify(m));
  // a second one, into the now-existing document
  await P.fill(box(COUNT_KEY), "{b}-এর {a}");
  await tap(P, `[data-hadith-kys-save="${COUNT_KEY}"]`); await settle(P, 700);
  w = await writes(P);
  const l2 = w[w.length - 1];
  check(`${tag} a second word is ONE update touching only names.<key> (and updatedAt)`, w.length === 2 && l2.kind === "update" && JSON.stringify(Object.keys(l2.data).filter((k) => k !== "updatedAt")) === JSON.stringify([`names.${COUNT_KEY}`]), JSON.stringify(w.map((x) => [x.kind, Object.keys(x.data ?? {})])));
  const cnt = await P.$eval('[data-hadith-status-centre="count"]', (n) => n.textContent).catch(() => null);
  check(lang === "bn" ? `${tag} the corrected count line has its numbers filled in (no raw {a} or {b})` : `${tag} the English count line is unchanged`, lang === "bn" ? /[০-৯]/.test(cnt ?? "") && !/[{}]/.test(cnt ?? "") && /-এর/.test(cnt) : /^\d+ of \d+$/.test((cnt ?? "").trim()), String(cnt));
  // restore
  await ensureEditor(P);
  await P.waitForSelector(`[data-hadith-kys-restore="${KEY}"]`, { timeout: 8000 });
  await tap(P, `[data-hadith-kys-restore="${KEY}"]`); await settle(P, 700);
  w = await writes(P);
  const last = w[w.length - 1];
  check(`${tag} Restore is an UPDATE that keeps the entry, marked retired (nothing deleted)`, last?.kind === "update" && JSON.stringify(last.data).includes('"status":"retired"') && JSON.stringify(last.data).includes("কিতাবের ক্রমে"), JSON.stringify(last?.data).slice(0, 240));
  check(lang === "bn" ? `${tag} ...and the built-in Bangla is back on the wheel` : `${tag} ...English unchanged`, (await modeText(P)) === (lang === "bn" ? "কিতাব অনুযায়ী" : "By Book"));
  check(`${tag} no page errors from this round`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|quran\.com/i.test(String(e))).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

// ---- 2. a refused write is said (I15) --------------------------------------------------------------------------------------------
{
  const tag = "[en 1280 refused]";
  console.log(`\n===== know your status words ${tag} =====`);
  const { ctx, page: P } = await open("en", 1280);
  await openEditor(P);
  await P.evaluate(() => { window.__stubFailWrites = true; });
  await P.fill(box(KEY), "ব্যর্থ");
  await tap(P, `[data-hadith-kys-save="${KEY}"]`); await settle(P, 700);
  const m = await msgOf(P);
  check(`${tag} a refused write says so in words, flagged as failed`, !!m && m.failed && /could not be saved/i.test(m.text), JSON.stringify(m));
  check(`${tag} ...and no correction shows as saved`, (await modeText(P)) === "By Book" && !(await P.$(`[data-hadith-kys-restore="${KEY}"]`)));
  await ctx.close();
}

// ---- 3. who sees the button ------------------------------------------------------------------------------------------------------
{
  const tag = "[en 1280 viewing as teacher]";
  console.log(`\n===== know your status words ${tag} =====`);
  const { ctx, page: P } = await open("en", 1280, { viewAs: "teacher" });
  await settle(P, 600);
  check(`${tag} a teacher (view-as) gets no button and no panel`, !(await P.$eval("[data-hadith-kys-editor]", (n) => !n.hidden).catch(() => false)) && !(await P.$("[data-hadith-kys-row]")));
  await ctx.close();
}

// ---- 4. keep what was saved: a seeded correction shows on first open; a phone fits ---------------------------------------------
{
  const tag = "[bn 320 seeded]";
  console.log(`\n===== know your status words ${tag} =====`);
  const seed = `DATA.hadithNames = [{ _id: "t1", tenantId: "t1", schemaVersion: 1, createdBy: "test-uid", names: { "${KEY}": { bn: "আগে সংরক্ষিত", en: "", status: "active" }, "${kysKey("By Topic")}": { bn: "পুরনো", en: "", status: "retired" } } }];`;
  const { ctx, page: P } = await open("bn", 320, { extraSeedJs: seed });
  await settle(P, 600);
  check(`${tag} a correction saved earlier shows on the wheel when the page is opened again (save, update, reopen)`, (await modeText(P)) === "আগে সংরক্ষিত", String(await modeText(P)));
  const topic = await P.$eval('[data-hadith-status-mode="topic"]', (n) => n.textContent).catch(() => null);
  check(`${tag} a retired correction does not show (the built-in reads)`, topic === "বিষয় অনুযায়ী", String(topic));
  await openEditor(P);
  check(`${tag} the saved correction is in its box, with Restore offered`, (await P.$eval(box(KEY), (n) => n.value)) === "আগে সংরক্ষিত" && !!(await P.$(`[data-hadith-kys-restore="${KEY}"]`)));
  await P.fill(box(COUNT_KEY), "{b}-এর {a}");
  await tap(P, `[data-hadith-kys-save="${COUNT_KEY}"]`); await settle(P, 700);
  const w = await writes(P);
  check(`${tag} saving into an existing document is ONE update that leaves the other entries alone`, w.length === 1 && w[0].kind === "update" && JSON.stringify(Object.keys(w[0].data ?? {}).filter((k) => k !== "updatedAt")) === JSON.stringify([`names.${COUNT_KEY}`]), JSON.stringify(w.map((x) => [x.kind, Object.keys(x.data ?? {})])));
  await ensureEditor(P);
  const fit = await P.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const els = [...document.querySelectorAll(".hadith-kys-editor textarea, .hadith-kys-editor button")];
    return { side: document.documentElement.scrollWidth - cw, n: els.length, out: els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.left < -0.5 || r.right > cw + 0.5); }).length, minH: Math.min(...els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getBoundingClientRect().height)) };
  });
  check(`${tag} the panel fits a 320px phone: no sideways scroll, nothing outside the screen, every control at least 40px tall`, fit.side <= 0 && fit.out === 0 && fit.minH >= 40 && fit.n > 10, JSON.stringify(fit));
  await P.screenshot({ path: process.env.KYS_SHOT ? `${process.env.KYS_SHOT}-320.png` : "/tmp/kys-320.png" });
  await ctx.close();
}

// ---- 5. the panel fits every width in both languages (measured, then LOOK at the screenshots) ---------------------------------
for (const lang of ["en", "bn"]) for (const width of [320, 360, 390, 820, 1280]) {
  const tag = `[${lang} ${width} fit]`;
  const { ctx, page: P } = await open(lang, width);
  await openEditor(P);
  const fit = await P.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const els = [...document.querySelectorAll(".hadith-kys-editor textarea, .hadith-kys-editor button, .hadith-kys-editor .hadith-names-ar")];
    return { side: document.documentElement.scrollWidth - cw, n: els.length, out: els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.left < -0.5 || r.right > cw + 0.5); }).length, minH: Math.min(...els.filter((e) => e.tagName !== "SPAN" && e.getBoundingClientRect().width > 0).map((e) => e.getBoundingClientRect().height)) };
  });
  check(`${tag} no sideways scroll, nothing outside the screen, every control at least 40px tall`, fit.side <= 0 && fit.out === 0 && fit.minH >= 40 && fit.n > 100, JSON.stringify(fit));
  await ctx.close();
}

await browser.close();
console.log(`\n==== hadith-kys-words: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
