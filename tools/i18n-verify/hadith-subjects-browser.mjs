// PCF MSA J106 round 2 (the Owner's answer A on question 5, 31 Oct 2026): the Hadith Subject lists, ONE shared online
// list per madrasah in hadithSubjects/{tenantId} (candidate rule tests/firestore/hadith-subjects-v1.proposed.rules).
// Checked on the real page, against the real library:
//   - "Add to subject" under a narration in the Hadith Books reader; nothing is read until it is pressed (I9);
//   - the owner/prime adds Bukhari's hadith 1 to Learning Akhlaq: the create carries tenantId, the narration's place
//     ({ versionUri, n }) and its names, and the choice then shows ✓;
//   - Subjects ▸ Learning Akhlaq lists it (Book · Chapter · Hadith No. · Title); a tap opens the original, focused,
//     with "← Back to Learning Akhlaq", which returns to the list (the way-back law, decision 86);
//   - Remove RETIRES the entry (an update, status "retired"; nothing is deleted, I4) and the list says it is empty;
//   - a madrasah that already has the document gets an UPDATE, not a second create;
//   - a refused write and a failed read are shown in words (I15), with Try again on the read;
//   - a reader viewing as a teacher is told why adding is off and sees no Remove;
//   - every button is at least 40px tall and nothing runs off a phone's screen.
// Not covered here: signed out (the stub is always signed in); the Rules themselves are proven in the emulator
// (tools/firestore-emulator/hadith-subjects-v1.rules.test.mjs).
// Run from the repository root, serve.js on :8080. Exits 0 only when every check passed.
//   --mutate=<name>   serve one deliberate break (below) instead of the real code; the run must FAIL
//   --prove           run every mutation in turn and report which were caught (exits 1 if any was not)
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUT = {
  nocache: ["js/hadith-subjects.js", "  if (ok) { cache.subjects = next; cache.docExists = true; }", ""],
  noretire: ["js/hadith-subjects.js", "(j === i ? { ...e, status: \"retired\", retiredAt: at, retiredBy: by } : e)", "(j === i ? e : e)"],
  dropretired: ["js/hadith-subjects.js", "  return (subjects?.[id] ?? []).filter((e) => e.status !== \"retired\");", "  return (subjects?.[id] ?? []);"],
  noguard: ["js/hadith-subjects.js", "    if (!session || !session.canManage) {", "    if (!session) {"],
  nofailmsg: ["js/hadith-subjects.js", "ok ? t(\"Added to {name}.\", { name: subjectName(id) }) : t(\"It could not be added. Check the connection and try again.\")", "t(\"Added to {name}.\", { name: subjectName(id) })"],
  noback: ["js/hadith-browser.js", "    trail: [{ label: t(\"← Back to {ref}\", { ref: t(sub.name) }), toDua: () => {", "    trailX: [{ label: t(\"← Back to {ref}\", { ref: t(sub.name) }), toDua: () => {"],
  nofocus: ["js/hadith-browser.js", "showAllChapters: false, focusPassage: Number(e.n), scrollTo: true,", "showAllChapters: false, scrollTo: true,"],
  eagerread: ["js/hadith-subjects.js", "  box.append(open, panel);\n", "  box.append(open, panel);\n  loadShared().catch(() => {});\n"],
  alwayscreate: ["js/hadith-study-actions.js", "    () => (docExists\n", "    () => (false\n"],
  // Two edits at once: the page's shared net (admin-touch.css: every button at least 40px) would otherwise keep the
  // buttons tall by itself, and a break of this round's own rule alone went uncaught for exactly that reason.
  smallbtn: [["css/hadith.css", ".hadith-subject-btn { min-height: 40px;", ".hadith-subject-btn { min-height: 0; height: 24px; padding: 0;"],
    ["css/admin-touch.css", "box-sizing: border-box; min-height: 40px; } /* audit3 buttons */", "box-sizing: border-box; } /* audit3 buttons */"]],
  noremovegate: ["js/hadith-subjects.js", "      if (session.canManage) {\n        const rm", "      if (true) {\n        const rm"],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

if (process.argv.includes("--prove")) {
  let caught = 0;
  const missed = [];
  const only = arg("only") ? arg("only").split(",") : Object.keys(MUT);
  for (const name of only) {
    const r = spawnSync(process.execPath, [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const out = (r.stdout || "").trim();
    const firstFail = out.split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && firstFail) { caught++; console.log(`  CAUGHT  ${name}: ${firstFail.trim().slice(0, 140)}`); }
    else { missed.push(name); console.log(`  MISSED  ${name}: exit ${r.status}, ${out.split("\n").pop()}`); }
  }
  console.log(`\n==== hadith-subjects mutations: ${caught} of ${only.length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}

const SPLIT = "tools/hadith-data-pull/output/openiti-release/split";
const BUKHARI = "0256Bukhari.Sahih.JK000110-ara1";
const bIndex = JSON.parse(fs.readFileSync(`${SPLIT}/${BUKHARI}/index.json`, "utf8"));
const ch2 = bIndex.chapters.find((c) => c.id === "ch-2");
const ch2Shard = JSON.parse(fs.readFileSync(`${SPLIT}/${BUKHARI}/${ch2.shardFiles[0]}`, "utf8"));
const H1 = ch2Shard.hadiths.find((h) => h.kind === "hadith" && h.number === 1);
const H2 = ch2Shard.hadiths.find((h) => h.kind === "hadith" && h.number === 2);
if (!H1 || !H2 || H1.p !== H2.p) throw new Error("fixture: Bukhari hadith 1 and 2 are expected in ch-2, in one sub-chapter -- re-derive");
const KEY1 = `${BUKHARI}:${H1.n}`, KEY2 = `${BUKHARI}:${H2.n}`;

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function open(lang, width, { extraSeedJs = null, viewAs = null } = {}) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs });
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
  if (viewAs) {
    // A "View as" preview (session-context.js): the stored context keeps the real roles and adds viewAsRole.
    await ctx.addInitScript((role) => {
      try { localStorage.setItem("qr.sessionContext", JSON.stringify({ tenantId: "t1", personId: "p1", roles: ["owner", "prime"], viewAsRole: role })); } catch { /* blocked */ }
    }, viewAs);
  }
  const { page, errors } = await openPage(ctx, "/app/hadith-study.html");
  await page.waitForSelector("[data-openiti-book]");
  return { ctx, page, errors };
}
const settle = (p, ms = 200) => p.waitForTimeout(ms);
const tap = (p, sel) => p.click(sel, { timeout: 8000 }).catch(() => console.log(`  note: could not tap ${sel}`));
const shown = (p, sel) => p.$eval(sel, (n) => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(n).display !== "none"; }).catch(() => false);
const showPane = async (p, key) => { if (await shown(p, `[data-reader-show="${key}"]`)) { await tap(p, `[data-reader-show="${key}"]`); await settle(p); } };
const subjectReads = (p) => p.evaluate(() => (window.__fsLog || []).filter((r) => r.col === "hadithSubjects" && r.kind === "getDoc").length);
const writes = (p) => p.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "hadithSubjects"));
const noSideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const heights = (p, sel) => p.$$eval(sel, (ns) => ns.filter((n) => n.getBoundingClientRect().width > 0).map((n) => Math.round(n.getBoundingClientRect().height)));
const insideScreen = (p, sel) => p.$$eval(sel, (ns) => ns.filter((n) => n.getBoundingClientRect().width > 0)
  .every((n) => { const r = n.getBoundingClientRect(); return r.left >= -0.5 && r.right <= document.documentElement.clientWidth + 0.5; }));

async function openHadith(p, h) {
  if (!(await shown(p, `[data-openiti-chapter="ch-2"]`))) {
    await tap(p, `[data-openiti-book="${BUKHARI}"]`);
    await p.waitForSelector('[data-openiti-chapter="ch-2"]', { state: "attached" });
  }
  await showPane(p, "chapters");
  await tap(p, '[data-openiti-chapter="ch-2"]');
  await p.waitForSelector(`[data-openiti-bab="${h.p}"]`, { state: "attached" });
  await showPane(p, "chapters");
  await tap(p, `[data-openiti-bab="${h.p}"]`);
  await p.waitForSelector(`[data-openiti-row="${h.n}"]`, { state: "attached" });
  await showPane(p, "hadiths");
  await tap(p, `[data-openiti-row="${h.n}"]`);
  await p.waitForSelector(`[data-openiti-passage="${h.n}"]`, { state: "attached" });
}
async function openSubject(p, id) {
  await tap(p, '[data-hadith-tab="subjects"]');
  await tap(p, `[data-hadith-subject-pick="${id}"]`);
  await p.waitForSelector(`[data-hadith-subject-list="${id}"]`, { state: "attached" });
  await settle(p, 300);
}
async function openChoices(p, key) {
  await tap(p, `[data-hadith-subject-add="${key}"] [data-hadith-subject-add-open]`);
  await settle(p, 300);
}

// ---------------------------------------------------------------------------------------------------------------
// The whole round trip, as the owner/prime, at a computer's and a phone's width.
// ---------------------------------------------------------------------------------------------------------------
for (const [lang, width] of [["en", 1280], ["bn", 390]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n===== hadith subjects ${tag} =====`);
  const { ctx, page: P, errors } = await open(lang, width);
  // The menu button for Subjects: its selector is read off the page rather than assumed.
  const menuSel = await P.evaluate(() => !!document.querySelector('[data-hadith-tab="subjects"]'));
  check(`${tag} the menu bar has a Subjects button`, menuSel);

  await openHadith(P, H1);
  check(`${tag} "Add to subject" is under the hadith`, await shown(P, `[data-hadith-subject-add="${KEY1}"] [data-hadith-subject-add-open]`));
  check(`${tag} nothing is read before it is pressed (I9)`, (await subjectReads(P)) === 0, `${await subjectReads(P)} reads`);
  await openChoices(P, KEY1);
  const choices = await P.$$eval(`[data-hadith-subject-add="${KEY1}"] [data-hadith-subject-choice]`, (ns) => ns.map((n) => n.dataset.hadithSubjectChoice));
  check(`${tag} pressed, it offers the three Subjects`, JSON.stringify(choices) === JSON.stringify(["akhlaq", "ghayb", "stories"]), JSON.stringify(choices));
  check(`${tag} ...after ONE read of the madrasah's list`, (await subjectReads(P)) === 1, `${await subjectReads(P)} reads`);
  const hs = await heights(P, ".hadith-subject-btn");
  check(`${tag} every Subject button is at least 40px tall`, hs.length >= 4 && hs.every((h) => h >= 40), JSON.stringify(hs));
  check(`${tag} the buttons stay inside the screen`, await insideScreen(P, ".hadith-subject-btn"));

  await tap(P, `[data-hadith-subject-add="${KEY1}"] [data-hadith-subject-choice="akhlaq"]`);
  await settle(P, 400);
  const w1 = await writes(P);
  const created = w1.find((w) => w.kind === "set");
  const e1 = created?.data?.subjects?.akhlaq?.[0];
  check(`${tag} adding writes the madrasah's document hadithSubjects/t1 (a create)`, w1.length === 1 && created?.id === "t1", JSON.stringify(w1.map((w) => [w.kind, w.id])));
  check(`${tag} ...carrying tenantId and the I17 stamps`, created?.data?.tenantId === "t1" && created?.data?.schemaVersion === 1 && created?.data?.createdBy === "test-uid"
    && !!created?.data?.createdAt && !!created?.data?.updatedAt, JSON.stringify({ createdBy: created?.data?.createdBy, createdAt: created?.data?.createdAt }));
  check(`${tag} ...the narration's place and names`, e1?.versionUri === BUKHARI && e1?.n === H1.n && e1?.number === 1 && e1?.status === "active" && !!e1?.book && !!e1?.chapter && !!e1?.title,
    JSON.stringify(e1));
  check(`${tag} ...and only Learning Akhlaq holds it`, (created?.data?.subjects?.ghayb ?? []).length === 0 && (created?.data?.subjects?.stories ?? []).length === 0);
  const after = await P.$eval(`[data-hadith-subject-add="${KEY1}"] [data-hadith-subject-choice="akhlaq"]`, (b) => ({ text: b.textContent, disabled: b.disabled, pressed: b.getAttribute("aria-pressed") })).catch(() => null);
  check(`${tag} the choice then shows ✓ and cannot be added twice`, !!after && after.text.startsWith("✓") && after.disabled && after.pressed === "true", JSON.stringify(after));
  const msg = await P.$eval(`[data-hadith-subject-add="${KEY1}"] [data-hadith-subject-msg]`, (n) => ({ text: n.textContent, failed: "hadithSubjectFailed" in n.dataset })).catch(() => null);
  check(`${tag} it says it was added`, !!msg && msg.text.length > 0 && !msg.failed, JSON.stringify(msg));

  // --- The list ---
  await openSubject(P, "akhlaq");
  const rows = await P.$$eval("[data-hadith-subject-list=\"akhlaq\"] [data-hadith-subject-open]", (ns) => ns.map((n) => n.dataset.hadithSubjectOpen));
  check(`${tag} Subjects ▸ Learning Akhlaq lists the hadith (no second read: the list was kept)`, JSON.stringify(rows) === JSON.stringify([KEY1]) && (await subjectReads(P)) === 1,
    `${JSON.stringify(rows)} reads ${await subjectReads(P)}`);
  const rowText = await P.$eval(`[data-hadith-subject-open="${KEY1}"]`, (n) => ({
    book: n.querySelector(".hadith-row-name")?.textContent ?? "", chapter: n.querySelector(".hadith-subject-chapter")?.textContent ?? "",
    meta: n.querySelector(".hadith-row-meta")?.textContent ?? "", title: n.querySelector(".hadith-subject-title")?.textContent ?? "" })).catch(() => null);
  check(`${tag} the row shows Book · Chapter · Hadith No. · Title`, !!rowText && rowText.book && rowText.chapter && /1|১/.test(rowText.meta) && rowText.title.length > 5, JSON.stringify(rowText));
  check(`${tag} the list's buttons are 40px and inside the screen`, (await heights(P, "[data-hadith-subject-list] button")).every((h) => h >= 40) && await insideScreen(P, "[data-hadith-subject-list] button"));
  check(`${tag} the page does not scroll sideways`, (await noSideways(P)) <= 0, `${await noSideways(P)}px`);

  // --- Open the original, and the way back ---
  await tap(P, `[data-hadith-subject-open="${KEY1}"]`);
  await P.waitForSelector(`[data-openiti-passage="${H1.n}"]`, { state: "attached", timeout: 15000 }).catch(() => {});
  const focused = await P.$eval(`[data-openiti-passage="${H1.n}"]`, (n) => n.dataset.openitiFocused === "true").catch(() => false);
  check(`${tag} a tap opens the original hadith, highlighted`, focused);
  const back = await P.$eval("[data-openiti-trail-back]", (n) => n.textContent).catch(() => "");
  check(`${tag} with a way back to the Subject`, back.startsWith("←") && back.length > 3, back);
  await tap(P, "[data-openiti-trail-back]");
  await P.waitForSelector('[data-hadith-subject-list="akhlaq"]', { state: "attached", timeout: 8000 }).catch(() => {});
  await settle(P, 300);
  check(`${tag} ← Back returns to Learning Akhlaq's list`, await shown(P, `[data-hadith-subject-open="${KEY1}"]`));

  // --- Remove retires, never deletes ---
  await tap(P, `[data-hadith-subject-remove="${KEY1}"]`);
  await settle(P, 400);
  const w2 = (await writes(P)).slice(1);
  const retired = w2[0]?.data?.subjects?.akhlaq?.find((e) => `${e.versionUri}:${e.n}` === KEY1);
  check(`${tag} Remove writes an UPDATE that marks the entry retired (it stays in the data, I4)`, w2.length === 1 && w2[0].kind === "update" && retired?.status === "retired" && !!retired?.retiredAt,
    JSON.stringify(w2.map((w) => [w.kind, w.data?.subjects?.akhlaq])));
  check(`${tag} ...and nothing was deleted`, await P.evaluate(() => !(window.__fsLog || []).some((r) => r.col === "hadithSubjects" && /delete/i.test(r.kind))));
  check(`${tag} the list then says it is empty`, await shown(P, '[data-hadith-subject-list="akhlaq"] [data-hadith-subject-empty]'));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::/.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

// ---------------------------------------------------------------------------------------------------------------
// A madrasah that already has a list: it is shown, and a second hadith is an UPDATE.
// ---------------------------------------------------------------------------------------------------------------
{
  const tag = "[en 820 seeded]";
  console.log(`\n===== hadith subjects ${tag} =====`);
  const seed = `DATA.hadithSubjects = [{ _id: "t1", tenantId: "t1", schemaVersion: 1, createdBy: "test-uid", subjects: { akhlaq: [], ghayb: [], stories: [
    { versionUri: "${BUKHARI}", n: ${H1.n}, number: 1, kind: "hadith", std: null, book: "Sahih al-Bukhari", chapter: "Seeded chapter", title: "Seeded title", status: "active" },
    { versionUri: "${BUKHARI}", n: 999999, number: 9, kind: "hadith", book: "Old", chapter: "Old", title: "Retired one", status: "retired" } ] } }];`;
  const { ctx, page: P } = await open("en", 820, { extraSeedJs: seed });
  await openSubject(P, "stories");
  const rows = await P.$$eval('[data-hadith-subject-list="stories"] [data-hadith-subject-open]', (ns) => ns.map((n) => n.dataset.hadithSubjectOpen));
  check(`${tag} Stories from Hadith shows the stored hadith, not the retired one`, JSON.stringify(rows) === JSON.stringify([KEY1]), JSON.stringify(rows));
  await tap(P, '[data-hadith-tab="books"]');
  await settle(P);
  await P.keyboard.press("Escape");
  await P.waitForSelector("[data-openiti-book], [data-openiti-chapter]", { state: "attached" });
  await openHadith(P, H2);
  await openChoices(P, KEY2);
  await tap(P, `[data-hadith-subject-add="${KEY2}"] [data-hadith-subject-choice="stories"]`);
  await settle(P, 400);
  const w = await writes(P);
  const list = w[0]?.data?.subjects?.stories ?? [];
  check(`${tag} a second hadith is an UPDATE of the same document, keeping the first and the retired one`,
    w.length === 1 && w[0].kind === "update" && w[0].id === "t1" && list.length === 3 && list.some((e) => e.status === "retired") && list[2]?.n === H2.n,
    JSON.stringify(w.map((x) => [x.kind, (x.data?.subjects?.stories ?? []).length])));
  await ctx.close();
}

// ---------------------------------------------------------------------------------------------------------------
// Failures are shown (I15), and a reader viewing as a teacher is told why adding is off.
// ---------------------------------------------------------------------------------------------------------------
{
  const tag = "[en 1280 refused write]";
  console.log(`\n===== hadith subjects ${tag} =====`);
  const { ctx, page: P } = await open("en", 1280);
  await openHadith(P, H1);
  await openChoices(P, KEY1);
  await P.evaluate(() => { window.__stubFailWrites = true; });
  await tap(P, `[data-hadith-subject-add="${KEY1}"] [data-hadith-subject-choice="ghayb"]`);
  await settle(P, 500);
  const st = await P.evaluate((k) => {
    const box = document.querySelector(`[data-hadith-subject-add="${k}"]`);
    const m = box?.querySelector("[data-hadith-subject-msg]");
    return { failed: !!m && "hadithSubjectFailed" in m.dataset, text: m?.textContent ?? "", tick: box?.querySelector('[data-hadith-subject-choice="ghayb"]')?.textContent.startsWith("✓") ?? null };
  }, KEY1);
  // The words themselves, not only the flag: a page that flagged the failure but still said "Added" would mislead.
  check(`${tag} a refused write says so, in words, and the hadith is not shown as added`,
    st.failed && /could not be added/i.test(st.text) && !/^Added/.test(st.text) && st.tick === false, JSON.stringify(st));
  await ctx.close();
}
{
  const tag = "[en 1280 failed read]";
  console.log(`\n===== hadith subjects ${tag} =====`);
  const { ctx, page: P } = await open("en", 1280);
  await P.evaluate(() => { window.__stubFailReads = ["hadithSubjects"]; });
  await openSubject(P, "ghayb");
  check(`${tag} a list that cannot be read says so, with Try again`, await shown(P, '[data-hadith-subject-list="ghayb"] [data-hadith-read-failed] [data-hadith-read-retry]'));
  await P.evaluate(() => { window.__stubFailReads = []; });
  await tap(P, '[data-hadith-subject-list="ghayb"] [data-hadith-read-retry]');
  await settle(P, 400);
  check(`${tag} Try again then reads it`, await shown(P, '[data-hadith-subject-list="ghayb"] [data-hadith-subject-empty]'));
  await ctx.close();
}
{
  const tag = "[bn 390 viewing as teacher]";
  console.log(`\n===== hadith subjects ${tag} =====`);
  const seed = `DATA.hadithSubjects = [{ _id: "t1", tenantId: "t1", schemaVersion: 1, createdBy: "test-uid", subjects: { akhlaq: [
    { versionUri: "${BUKHARI}", n: ${H1.n}, number: 1, kind: "hadith", book: "Sahih al-Bukhari", chapter: "Seeded chapter", title: "Seeded title", status: "active" } ], ghayb: [], stories: [] } }];`;
  const { ctx, page: P } = await open("bn", 390, { extraSeedJs: seed, viewAs: "teacher" });
  await openHadith(P, H1);
  await openChoices(P, KEY1);
  const why = await P.$eval(`[data-hadith-subject-add="${KEY1}"] [data-hadith-subject-why]`, (n) => ({ why: n.dataset.hadithSubjectWhy, text: n.textContent })).catch(() => null);
  const n = await P.$$eval(`[data-hadith-subject-add="${KEY1}"] [data-hadith-subject-choice]`, (ns) => ns.length);
  check(`${tag} pressed, it says in words why adding is off, and offers no Subject`, why?.why === "notAdmin" && why.text.length > 10 && n === 0, JSON.stringify({ why, n }));
  check(`${tag} ...in Bangla`, /[ঀ-৿]/.test(why?.text ?? ""), why?.text);
  await openSubject(P, "akhlaq");
  check(`${tag} the teacher still sees the list`, await shown(P, `[data-hadith-subject-open="${KEY1}"]`));
  check(`${tag} ...with no Remove`, (await P.$$eval("[data-hadith-subject-remove]", (ns) => ns.length)) === 0);
  check(`${tag} the page does not scroll sideways`, (await noSideways(P)) <= 0, `${await noSideways(P)}px`);
  await ctx.close();
}

await browser.close();
console.log(`\n==== hadith subjects: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
