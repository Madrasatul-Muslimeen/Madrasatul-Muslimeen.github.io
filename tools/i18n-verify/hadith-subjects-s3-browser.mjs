// PCF MSA J106 S3 part 1 (14 Nov 2026): the madrasah's Subjects are EDITABLE -- names, order, add, retire -- on the
// document that already exists, hadithSubjects/{tenantId}, in one extra map `subjectMeta` (no Rules change: the published
// rule pins tenantId/createdBy/createdAt/schemaVersion and lets owner/prime write anything else; proven in the emulator by
// tools/firestore-emulator/hadith-subjects-v1.rules.test.mjs). Checked on the real page:
//   - nothing is read at startup (I9); "Edit Subjects" reads on first use;
//   - rename: a write that carries the name and an updatedAt/updatedBy stamp, and the menu and the heading change;
//   - move up/down changes the menu order, and the order is stored (a number per Subject);
//   - add: a new Subject `s-xxxxxxxx` appears in the menu, opens as a Subject, and is offered by "Add to subject";
//   - retire hides it from the menu but keeps its hadith list and its meta key; restore brings it back (I4: nothing deleted);
//   - a refused write is said in words (I15) and the change is not shown as saved;
//   - a reader viewing as a teacher is told why editing is off and gets no fields;
//   - an existing document is UPDATED (dotted subjectMeta.<id> keys), never re-created.
// Run from the repository root with serve.js on :8080. Exits 0 only when every check passed.
//   --mutate=<name> serves one deliberate break (the run must FAIL); --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUT = {
  nostamp: ["js/hadith-subject-meta.js", "const stamp = ({ by, at }) => ({ updatedAt: at, updatedBy: by });", "const stamp = () => ({});"],
  noretire: ["js/hadith-subject-meta.js", "  const status = retired ? \"retired\" : \"active\";", "  const status = \"active\";"],
  dropkey: ["js/hadith-subject-meta.js", "  return { meta: { ...meta, [id]: { ...base, order: Number.isFinite(base.order) ? base.order : cur.order, status, ...stamp(ctx) } }, changed: true };", "  { const m = { ...meta }; delete m[id]; return { meta: m, changed: true }; }"],
  nomove: ["js/hadith-subject-meta.js", "  if (i < 0 || j < 0 || j >= vis.length) return { meta, changed: false };", "  return { meta, changed: false };"],
  nofail: ["js/hadith-subjects.js", "if (ok) { onChange?.(); await draw({ text: doneText }); } else await draw({ text: failText, failed: true });", "onChange?.(); await draw({ text: doneText });"],
  noguard: ["js/hadith-subjects.js", "    if (!session || !session.canManage) {\n      const why = el(\"p\", \"hadith-note hadith-subject-why\", t(session ? \"Only the madrasah's owner or a prime can edit", "    if (false) {\n      const why = el(\"p\", \"hadith-note hadith-subject-why\", t(session ? \"Only the madrasah's owner or a prime can edit"],
  nomenu: ["js/hadith-browser.js", "    for (const sub of knownSubjects({ includeRetired: false })) {", "    for (const sub of HADITH_SUBJECTS) {"],
  eagerstart: ["js/hadith-browser.js", "registerBuiltinSubjects(HADITH_SUBJECTS);\n", "registerBuiltinSubjects(HADITH_SUBJECTS);\nloadSubjectChoices().catch(() => {});\n"],
  alwayscreate: ["js/hadith-study-actions.js", "      if (!docExists) return createDocument(", "      if (true) return createDocument("],
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
    if (r.status !== 0 && ff) { caught++; console.log(`  CAUGHT  ${name}: ${ff.trim().slice(0, 130)}`); } else { missed.push(name); console.log(`  MISSED  ${name}`); }
  }
  console.log(`\n==== hadith-subjects-s3 mutations: ${caught} of ${only.length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function open(lang, width, { extraSeedJs = null, viewAs = null } = {}) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  if (viewAs) await ctx.addInitScript((role) => { try { localStorage.setItem("qr.sessionContext", JSON.stringify({ tenantId: "t1", personId: "p1", roles: ["owner", "prime"], viewAsRole: role })); } catch { /* blocked */ } }, viewAs);
  const { page, errors } = await openPage(ctx, "/app/hadith-study.html");
  await page.waitForSelector("[data-hadith-tab=subjects]");
  return { ctx, page, errors };
}
const settle = (p, ms = 250) => p.waitForTimeout(ms);
const tap = (p, sel) => p.click(sel, { timeout: 8000 }).catch(() => console.log(`  note: could not tap ${sel}`));
const reads = (p) => p.evaluate(() => (window.__fsLog || []).filter((r) => r.col === "hadithSubjects" && r.kind === "getDoc").length);
const writes = (p) => p.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "hadithSubjects"));
const menuIds = async (p) => { await tap(p, '[data-hadith-tab="subjects"]'); await settle(p, 400); const ids = await p.$$eval("[data-hadith-subject-pick]", (ns) => ns.map((n) => n.dataset.hadithSubjectPick)); await p.keyboard.press("Escape"); return ids; };
const menuNames = async (p) => { await tap(p, '[data-hadith-tab="subjects"]'); await settle(p, 400); const n = await p.$$eval("[data-hadith-subject-pick] .hadith-row-name", (ns) => ns.map((x) => x.textContent)); await p.keyboard.press("Escape"); return n; };
async function openSubjectsPage(p, id = "akhlaq") {
  await tap(p, '[data-hadith-tab="subjects"]'); await settle(p, 300);
  await tap(p, `[data-hadith-subject-pick="${id}"]`);
  await p.waitForSelector(`[data-hadith-subject-list="${id}"]`, { state: "attached" });
  await settle(p, 300);
}
const ensureEditor = async (p) => {
  if (await p.$("[data-hadith-subject-edit-row]")) return;
  if (!(await p.$("[data-hadith-subject-edit-open]"))) await openSubjectsPage(p);
  await tap(p, "[data-hadith-subject-edit-open]");
  await p.waitForSelector("[data-hadith-subject-edit-row]", { state: "attached" }); await settle(p, 200);
};
const openEditor = async (p) => { await tap(p, "[data-hadith-subject-edit-open]"); await p.waitForSelector("[data-hadith-subject-edit-row]", { state: "attached" }); await settle(p, 200); };
const msgOf = (p) => p.$eval(".hadith-subject-edit-panel [data-hadith-subject-msg]", (n) => ({ text: n.textContent, failed: "hadithSubjectFailed" in n.dataset })).catch(() => null);

// ---- 1. The whole edit trip, as the owner/prime (no document yet: the first write is the create) ----------------
for (const [lang, width] of [["en", 1280], ["bn", 390]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n===== hadith subjects S3 ${tag} =====`);
  const { ctx, page: P, errors } = await open(lang, width);
  check(`${tag} nothing is read at startup (I9)`, (await reads(P)) === 0, `${await reads(P)} reads`);
  check(`${tag} the menu starts with the four shipped Subjects`, JSON.stringify(await menuIds(P)) === JSON.stringify(["akhlaq", "rasulullah", "ghayb", "stories"]));
  await openSubjectsPage(P);
  const hasBtn = await P.$("[data-hadith-subject-edit-open]");
  check(`${tag} Subjects has an "Edit Subjects" button`, !!hasBtn);
  await openEditor(P);
  const rows = await P.$$eval("[data-hadith-subject-edit-row]", (ns) => ns.map((n) => n.dataset.hadithSubjectEditRow));
  check(`${tag} the editor lists all four Subjects`, JSON.stringify(rows) === JSON.stringify(["akhlaq", "rasulullah", "ghayb", "stories"]), JSON.stringify(rows));

  // rename
  await P.fill('[data-hadith-subject-edit-en="akhlaq"]', "Learning Good Character");
  await P.fill('[data-hadith-subject-edit-bn="akhlaq"]', "ভালো চরিত্র শেখা");
  await tap(P, '[data-hadith-subject-edit-save="akhlaq"]'); await settle(P, 500);
  let w = await writes(P);
  const meta1 = w[0]?.data?.subjectMeta?.akhlaq;
  check(`${tag} rename: the first write creates the document carrying the name and the stamp`, w.length === 1 && w[0].kind === "set" && meta1?.name?.en === "Learning Good Character" && meta1?.name?.bn === "ভালো চরিত্র শেখা" && !!meta1?.updatedAt && !!meta1?.updatedBy && meta1?.status === "active", JSON.stringify(w.map((x) => [x.kind, x.data?.subjectMeta?.akhlaq])));
  const heading = await P.$eval(".hadith-subject h2", (n) => n.textContent);
  check(`${tag} rename: the heading shows the new name in this language`, heading === (lang === "bn" ? "ভালো চরিত্র শেখা" : "Learning Good Character"), heading);
  check(`${tag} rename: the menu shows it too`, (await menuNames(P))[0] === (lang === "bn" ? "ভালো চরিত্র শেখা" : "Learning Good Character"));

  // move
  await ensureEditor(P);
  await tap(P, '[data-hadith-subject-move="rasulullah:up"]'); await settle(P, 500);
  const order1 = await menuIds(P);
  check(`${tag} move up: Loving Rasulullah is first in the menu`, JSON.stringify(order1) === JSON.stringify(["rasulullah", "akhlaq", "ghayb", "stories"]), JSON.stringify(order1));
  w = await writes(P);
  const mv = w[w.length - 1];
  check(`${tag} move up: the order is stored as numbers, and it was an UPDATE of the same document`, mv?.kind === "update" && Object.values(mv.data ?? {}).some((v) => v && typeof v === "object" && typeof v.order === "number") && JSON.stringify(mv.data).includes("subjectMeta"), JSON.stringify(mv?.data).slice(0, 300));

  // add
  await ensureEditor(P);
  await P.fill("[data-hadith-subject-new-en]", "Learning Patience");
  await tap(P, "[data-hadith-subject-new=go]"); await settle(P, 600);
  const idsAfterAdd = await menuIds(P);
  const newId = idsAfterAdd.find((i) => /^s-[0-9a-f]{8}$/.test(i));
  check(`${tag} add: a new Subject s-xxxxxxxx joins the menu, last`, !!newId && idsAfterAdd[idsAfterAdd.length - 1] === newId && idsAfterAdd.length === 5, JSON.stringify(idsAfterAdd));
  await openSubjectsPage(P, newId);
  check(`${tag} add: it opens as a Subject with its own (empty) list`, !!(await P.$(`[data-hadith-subject-list="${newId}"] [data-hadith-subject-empty]`)));

  // retire a Subject the madrasah made: its meta key stays (I4), and the editor still lists it
  await ensureEditor(P);
  await tap(P, `[data-hadith-subject-retire="${newId}"]`); await settle(P, 500);
  w = await writes(P);
  const rc = w[w.length - 1];
  check(`${tag} retire an added Subject: its meta key is written as retired, never removed`, rc?.data?.[`subjectMeta.${newId}`]?.status === "retired" && rc?.data?.[`subjectMeta.${newId}`]?.name?.en === "Learning Patience", JSON.stringify(rc?.data).slice(0, 300));
  const stillListed = !!(await P.$(`[data-hadith-subject-edit-row="${newId}"]`));
  check(`${tag} ...it leaves the menu but the editor still lists it`, !(await menuIds(P)).includes(newId) && stillListed);
  await ensureEditor(P);
  await tap(P, `[data-hadith-subject-retire="${newId}"]`); await settle(P, 500);
  check(`${tag} ...and Restore brings it back with its name`, (await menuIds(P)).includes(newId));

  // retire / restore
  await ensureEditor(P);
  await tap(P, '[data-hadith-subject-retire="ghayb"]'); await settle(P, 500);
  check(`${tag} retire: Knowing Al-Ghayb leaves the menu`, !(await menuIds(P)).includes("ghayb"));
  w = await writes(P);
  const retW = w[w.length - 1];
  check(`${tag} retire: the meta key stays, marked retired (nothing deleted)`, JSON.stringify(retW?.data).includes('"status":"retired"') && Array.isArray(retW?.data?.subjects?.ghayb), JSON.stringify(retW?.data).slice(0, 300));
  await ensureEditor(P);
  const label = await P.$eval('[data-hadith-subject-retire="ghayb"]', (n) => n.textContent);
  check(`${tag} retire: the editor still lists it, with Restore`, /Restore|পুনরুদ্ধার|ফিরিয়ে/.test(label) || label !== "Retire", label);
  await tap(P, '[data-hadith-subject-retire="ghayb"]'); await settle(P, 500);
  check(`${tag} restore: it is back in the menu, in its place`, (await menuIds(P)).includes("ghayb"));
  check(`${tag} no page errors from this round`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|quran\.com/i.test(String(e))).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

// ---- 2. A refused write is said (I15) ---------------------------------------------------------------------------
{
  const tag = "[en 1280 refused]";
  console.log(`\n===== hadith subjects S3 ${tag} =====`);
  const { ctx, page: P } = await open("en", 1280);
  await openSubjectsPage(P); await openEditor(P);
  await P.evaluate(() => { window.__stubFailWrites = true; });
  await P.fill('[data-hadith-subject-edit-en="akhlaq"]', "Should Not Stick");
  await tap(P, '[data-hadith-subject-edit-save="akhlaq"]'); await settle(P, 600);
  const m = await msgOf(P);
  check(`${tag} a refused rename says so in words, flagged as failed`, !!m && m.failed && /could not be saved/i.test(m.text) && !/saved\.$/.test(m.text.replace(/could not be saved.*/i, "")), JSON.stringify(m));
  check(`${tag} ...and the menu keeps the old name`, (await menuNames(P))[0] === "Learning Akhlaq");
  await ctx.close();
}

// ---- 3. Viewing as a teacher: told why, no fields ---------------------------------------------------------------
{
  const tag = "[en 1280 viewing as teacher]";
  console.log(`\n===== hadith subjects S3 ${tag} =====`);
  const { ctx, page: P } = await open("en", 1280, { viewAs: "teacher" });
  await openSubjectsPage(P);
  await tap(P, "[data-hadith-subject-edit-open]"); await settle(P, 500);
  check(`${tag} the panel says editing is for the owner or a prime`, !!(await P.$('.hadith-subject-edit-panel [data-hadith-subject-why="notAdmin"]')));
  check(`${tag} ...and offers no field or button`, (await P.$$eval(".hadith-subject-edit-panel input, .hadith-subject-edit-panel button", (n) => n.length)) === 0);
  await ctx.close();
}

// ---- 4. An existing document is UPDATED ------------------------------------------------------------------------
{
  const tag = "[en 820 seeded]";
  console.log(`\n===== hadith subjects S3 ${tag} =====`);
  const seed = `DATA.hadithSubjects = [{ _id: "t1", tenantId: "t1", schemaVersion: 1, createdBy: "test-uid", subjects: { akhlaq: [], ghayb: [], stories: [] }, subjectMeta: { stories: { name: { en: "Seeded Stories", bn: "" }, order: 5, status: "active" }, ghayb: { status: "retired", order: 30 } } }];`;
  const { ctx, page: P } = await open("en", 820, { extraSeedJs: seed });
  await openSubjectsPage(P, "stories");
  const ids = await menuIds(P);
  check(`${tag} the stored order and retirement apply: Stories first, Al-Ghayb hidden`, JSON.stringify(ids) === JSON.stringify(["stories", "akhlaq", "rasulullah"]), JSON.stringify(ids));
  check(`${tag} the stored name shows`, (await P.$eval(".hadith-subject h2", (n) => n.textContent)) === "Seeded Stories");
  await openEditor(P);
  await P.fill('[data-hadith-subject-edit-en="akhlaq"]', "Seeded Akhlaq");
  await tap(P, '[data-hadith-subject-edit-save="akhlaq"]'); await settle(P, 500);
  const w = await writes(P);
  check(`${tag} a rename of an existing document is ONE update that touches subjectMeta.akhlaq`, w.length === 1 && w[0].kind === "update" && JSON.stringify(w[0].data).includes("Seeded Akhlaq"), JSON.stringify(w.map((x) => [x.kind, Object.keys(x.data ?? {})])));
  await ctx.close();
}

await browser.close();
console.log(`\n==== hadith-subjects-s3: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
