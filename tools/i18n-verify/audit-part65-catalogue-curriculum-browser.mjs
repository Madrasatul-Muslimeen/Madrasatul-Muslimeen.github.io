// Audit part 65 (PCF MSA J29): Catalogue and Curriculum by the User Manual, the refused-write / stored-document /
// finger-size / no-sideways-scroll matrix, English and Bangla, 320 / 390 / 820 / 1280.
//   cat-owner    Add subject, Add Approach, Edit heading, move buttons, Add ladder / Add level: each stored document
//                carries I17's four fields and a language-keyed name (I11); a refused write says why in words and keeps
//                what was typed (I15); a name typed in Bangla is filed under `bn`, not `en`
//   cat-reader   a teacher gets the read-only sentence and no admin controls
//   cur-owner    Create unit, plan Term/Week Add, Create resource, Grades Assign: same stored / refused checks
//   cur-reader   a teacher gets one plain sentence and no admin area
// Mutations (--mutate=<name>) restore a plausible defect and must each fail the suite.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part65-catalogue-curriculum-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang");
// [file, route glob, anchor (must occur exactly once), replacement, the page the mutation applies to]
const MUTATIONS = {
  // A subject typed in Bangla is filed under the English key again.
  subjectkey: ["app/js/catalogue.js", "**/js/catalogue.js*", "    name: nameByScript(name),\n    gloss:", "    name: { en: name },\n    gloss:", "/app/catalogue.html"],
  // A ladder typed in Bangla is filed under the English key again.
  ladderkey: ["app/js/catalogue.js", "**/js/catalogue.js*", "    name: nameByScript(name),\n    status: \"active\",\n  }, uid);\n  return ladderId;", "    name: { en: name },\n    status: \"active\",\n  }, uid);\n  return ladderId;", "/app/catalogue.html"],
  // A level typed in Bangla is filed under the English key again.
  levelkey: ["app/js/catalogue.js", "**/js/catalogue.js*", "    name: nameByScript(name),\n    order,", "    name: { en: name },\n    order,", "/app/catalogue.html"],
  // A curriculum unit typed in Bangla is filed under the English key again.
  unitkey: ["app/js/curriculum.js", "**/js/curriculum.js*", "    name: nameByScript(name),", "    name: { en: name },", "/app/curriculum.html"],
  // Add ladder with no name goes quiet again.
  laddersilent: ["app/catalogue.html", "**/catalogue.html*", "if (!name) { ladderResult.textContent = t(\"Enter a name first.\"); return; }", "if (!name) return;", "/app/catalogue.html"],
  // A refused heading save shows nothing on the page again (only a pop-up).
  headingquiet: ["app/catalogue.html", "**/catalogue.html*", "if (!outcome.ok) { msg.textContent = outcome.entry.message; return; }", "if (!outcome.ok) { msg.textContent = \"\"; return; }", "/app/catalogue.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
// Real-shaped Approaches already in the tenant (the stub starts with none), so the new id is worked out by hand: approach_31.
const APPROACHES = `
const SEC7 = { en: "A'mal / Application", bn: "আমল / প্রয়োগ" };
DATA.trackables.push(
  { _id: TENANT_ID + "__approach_29", tenantId: TENANT_ID, moduleId: "quranrevival", subjectId: "quran", order: 29, status: "active", group: 7, groupName: SEC7, name: { en: "Da'wah" } },
  { _id: TENANT_ID + "__approach_30", tenantId: TENANT_ID, moduleId: "quranrevival", subjectId: "quran", order: 30, status: "active", group: 7, groupName: SEC7, name: { en: "Teaching Others" } }
);
`;
const READER = (role) => `
DATA.tenantMemberUids[0].personId = "t1"; DATA.tenantMemberUids[0].roles = ["${role}"];
DATA.tenantPeople.push({ _id: "t1", tenantId: TENANT_ID, personId: "t1", name: lang("Tariq", "তারিক"), roles: ["${role}"] });
`;

async function open(lang, width, pagePath, { seed = "" } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: seed || null });
  if (MUTATE && MUTATIONS[MUTATE][4] === pagePath) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    const contentType = file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8";
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType, body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, pagePath, fn, opts = {}) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, pagePath, opts), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.ctx, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/\[write failure\]|denied by the test|ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const writes = (page, col, needle) => ev(page, ([c, n]) => (window.__stubWriteData || []).filter((w) => w.col === c && (!n || JSON.stringify(w.data).includes(n))), [col, needle]);
const ENVELOPE = (d) => d.schemaVersion === 1 && !!d.createdAt && !!d.updatedAt && !!d.createdBy;
const failWrites = (page, on) => ev(page, (v) => { window.__stubFailWrites = v; }, on);
const hasWords = (s) => typeof s === "string" && s.trim().length > 8;
async function metrics(page) {
  return ev(page, () => {
    const small = [...document.querySelectorAll("button, select, input:not([type=hidden]):not([type=checkbox]), summary")].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden" && !e.closest("[hidden]") && !e.closest("#topNav") && !e.closest(".table-wrap") && r.height < 36;
    }).map((e) => `${e.id || e.className || e.tagName}:${Math.round(e.getBoundingClientRect().height)}`);
    return { overflow: document.documentElement.scrollWidth - innerWidth, small };
  });
}
async function tab(page, name) {
  await page.click(`[data-cat-tab="${name}"]`);
  await settle(page, 300);
}

const WIDTHS = [320, 390, 820, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

for (const lang of LANGS) {
  const bn = lang === "bn";
  const NAME = bn ? "তাজবিদ পরিচিতি" : "Tajweed Basics";
  const KEY = bn ? "bn" : "en";
  for (const width of WIDTHS) {
    // ------------------------------------------------------------------ Catalogue, as the owner
    await flow("cat-owner", lang, width, "/app/catalogue.html", async (t, page, ctx, errors) => {
      await page.waitForSelector("#app", { state: "visible", timeout: 15000 });
      await page.waitForFunction(() => document.querySelectorAll("#trackablesBody tr").length > 0, null, { timeout: 15000 });
      const vis = (id) => ev(page, (i) => { const e = document.getElementById(i); return !!e && getComputedStyle(e).display !== "none" && e.getClientRects().length > 0; }, id);

      // Add subject
      await tab(page, "subjects");
      check(`${t}: POSITIVE CONTROL the owner sees Add subject and no read-only note`, (await vis("addSubjectBox")) && !(await vis("readOnlyNote")));
      let m = await metrics(page);
      check(`${t}: subjects tab: no sideways page scroll`, m.overflow <= 1, String(m.overflow));
      check(`${t}: subjects tab: finger controls at least 40px tall`, !m.small.some((s) => /addSubjBtn|newSubj/.test(s)), m.small.join(", "));
      await page.fill("#newSubjName", "");
      await page.click("#addSubjBtn"); await settle(page);
      check(`${t}: Add subject with no name says why, writes nothing`, hasWords(await ev(page, () => document.getElementById("addSubjResult").textContent)) && (await writes(page, "subjects", "\"sourceTemplateId\":null")).length === 0);
      await failWrites(page, true);
      await page.fill("#newSubjName", NAME);
      await page.click("#addSubjBtn"); await settle(page, 800);
      let r = await ev(page, () => ({ msg: document.getElementById("addSubjResult").textContent, kept: document.getElementById("newSubjName").value }));
      check(`${t}: a refused subject write says so in words and keeps what was typed`, hasWords(r.msg) && r.kept === NAME, JSON.stringify(r));
      check(`${t}: and stores nothing`, (await writes(page, "subjects", NAME)).length === 0);
      await failWrites(page, false);
      await page.click("#addSubjBtn"); await settle(page, 1000);
      let w = await writes(page, "subjects", NAME);
      check(`${t}: the saved subject carries I17's four fields`, w.length === 1 && ENVELOPE(w[0].data), JSON.stringify(w[0] && w[0].data));
      check(`${t}: its name is keyed by the language it is written in (${KEY})`, w.length === 1 && typeof w[0].data.name[KEY] === "string" && w[0].data.name[KEY] === NAME && Object.keys(w[0].data.name).length === 1, JSON.stringify(w[0] && w[0].data.name));
      check(`${t}: the saved subject is a new id, not a platform id (I5)`, w.length === 1 && /^t1__/.test(w[0].id) && w[0].data.sourceTemplateId === null);

      // Move with the arrows
      const before = (await ev(page, () => (window.__stubWriteData || []).length));
      const moved = await ev(page, () => { const b = [...document.querySelectorAll(".moveDownBtn")].find((x) => !x.disabled && x.getClientRects().length); if (!b) return null; b.click(); return b.dataset.id; });
      await settle(page, 800);
      if (moved) {
        const mw = (await ev(page, (n) => (window.__stubWriteData || []).slice(n), before)).filter((x) => x.col === "subjects" || x.col === "subjectTemplates");
        check(`${t}: ▼ writes only order fields, no name or id changes (I5)`, mw.length > 0 && mw.every((x) => !("name" in x.data) && !("tenantId" in x.data && x.data.id)), JSON.stringify(mw.map((x) => Object.keys(x.data))));
      } else {
        check(`${t}: a ▼ button exists to press`, false, "none enabled");
      }

      // Approaches tab: heading, add Approach
      await tab(page, "approaches");
      check(`${t}: POSITIVE CONTROL ✎ Edit heading is shown to the owner`, await vis("editApproachListTitleBtn"));
      m = await metrics(page);
      check(`${t}: approaches tab: no sideways page scroll`, m.overflow <= 1, String(m.overflow));
      check(`${t}: approaches tab: finger controls at least 40px tall`, !m.small.some((s) => /addApproachBtn|newApproach|editApproachListTitleBtn/.test(s)), m.small.join(", "));
      await page.click("#editApproachListTitleBtn"); await settle(page, 300);
      await page.fill("#approachListTitleEn", "40 Ways"); await page.fill("#approachListTitleBn", "৪০ উপায়");
      await failWrites(page, true);
      await page.click("#saveApproachListTitleBtn"); await settle(page, 800);
      r = await ev(page, () => ({ msg: document.getElementById("approachListTitleMsg").textContent, open: !document.getElementById("approachListTitleForm").hidden, en: document.getElementById("approachListTitleEn").value }));
      check(`${t}: a refused heading save says so on the page and keeps the form open with what was typed`, hasWords(r.msg) && r.open && r.en === "40 Ways", JSON.stringify(r));
      await failWrites(page, false);
      await page.click("#saveApproachListTitleBtn"); await settle(page, 800);
      w = await writes(page, "tenants", "40 Ways");
      check(`${t}: the saved heading keeps both languages and I17's updatedAt`, w.length >= 1 && w[w.length - 1].data.approachListTitle?.bn === "৪০ উপায়" && w[w.length - 1].data.approachListTitle?.en === "40 Ways" && !!w[w.length - 1].data.updatedAt, JSON.stringify(w.map((x) => x.data.approachListTitle)));

      await page.fill("#newApproachNameEn", "Recitation Circle"); await page.fill("#newApproachNameBn", "তিলাওয়াত হালকা");
      await page.fill("#newApproachShortEn", "Circle"); await page.fill("#newApproachShortBn", "হালকা");
      await page.selectOption("#newApproachSection", "7"); await page.selectOption("#newApproachCounts", "yes");
      await failWrites(page, true);
      await page.click("#addApproachBtn"); await settle(page, 800);
      r = await ev(page, () => ({ msg: document.getElementById("addApproachResult").textContent, en: document.getElementById("newApproachNameEn").value, bn: document.getElementById("newApproachNameBn").value }));
      check(`${t}: a refused Approach write says so in words and keeps both names`, hasWords(r.msg) && r.en === "Recitation Circle" && r.bn === "তিলাওয়াত হালকা", JSON.stringify(r));
      await failWrites(page, false);
      await page.click("#addApproachBtn"); await settle(page, 1200);
      w = (await writes(page, "trackables", "Recitation Circle")).filter((x) => x.kind === "set");
      const d = w[0] && w[0].data;
      check(`${t}: the saved Approach carries I17's fields, both names, its short names and section`, w.length === 1 && ENVELOPE(d) && d.name.en === "Recitation Circle" && d.name.bn === "তিলাওয়াত হালকা" && d.shortName?.en === "Circle" && d.shortName?.bn === "হালকা" && d.group === 7 && d.countsForEachAyah === true, JSON.stringify(d));
      check(`${t}: no existing Approach id was reused or renamed (I5)`, w.length === 1 && w[0].id === "t1__approach_31", w[0] && w[0].id);

      // Ladders & levels
      await tab(page, "ladders");
      m = await metrics(page);
      check(`${t}: ladders tab: no sideways page scroll`, m.overflow <= 1, String(m.overflow));
      check(`${t}: ladders tab: finger controls at least 40px tall`, !m.small.some((s) => /addLadderBtn|addLevelBtn|newLadderName|newLevelName|levelLadderSelect/.test(s)), m.small.join(", "));
      await page.fill("#newLadderName", "");
      await page.click("#addLadderBtn"); await settle(page);
      check(`${t}: Add ladder with no name says why`, hasWords(await ev(page, () => document.getElementById("ladderResult").textContent)));
      await failWrites(page, true);
      await page.fill("#newLadderName", NAME);
      await page.click("#addLadderBtn"); await settle(page, 800);
      r = await ev(page, () => ({ msg: document.getElementById("ladderResult").textContent, kept: document.getElementById("newLadderName").value }));
      check(`${t}: a refused ladder write says so in words and keeps what was typed`, hasWords(r.msg) && r.kept === NAME, JSON.stringify(r));
      await failWrites(page, false);
      await page.click("#addLadderBtn"); await settle(page, 1000);
      w = await writes(page, "ladders", NAME);
      check(`${t}: the saved ladder carries I17's four fields and a name keyed ${KEY}`, w.length === 1 && ENVELOPE(w[0].data) && w[0].data.name[KEY] === NAME && Object.keys(w[0].data.name).length === 1, JSON.stringify(w[0] && w[0].data));
      await page.fill("#newLevelName", NAME);
      await failWrites(page, true);
      await page.click("#addLevelBtn"); await settle(page, 800);
      r = await ev(page, () => ({ msg: document.getElementById("ladderResult").textContent, kept: document.getElementById("newLevelName").value }));
      check(`${t}: a refused level write says so in words and keeps what was typed`, hasWords(r.msg) && r.kept === NAME, JSON.stringify(r));
      await failWrites(page, false);
      await page.click("#addLevelBtn"); await settle(page, 1000);
      w = await writes(page, "levels", NAME);
      check(`${t}: the saved level carries I17's four fields, its ladder and a name keyed ${KEY}`, w.length === 1 && ENVELOPE(w[0].data) && !!w[0].data.ladderId && w[0].data.name[KEY] === NAME, JSON.stringify(w[0] && w[0].data));
      const erased = await ev(page, () => (window.__stubWriteData || []).filter((x) => /delete/i.test(x.kind)).length);
      check(`${t}: nothing was erased (I4)`, erased === 0, String(erased));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: APPROACHES });

    // ------------------------------------------------------------------ Catalogue, as a reader
    for (const role of ["teacher", "student"]) {
      await flow(`cat-reader-${role}`, lang, width, "/app/catalogue.html", async (t, page, ctx, errors) => {
        await page.waitForSelector("#app", { state: "visible", timeout: 15000 });
        await settle(page, 1000);
        const f = await ev(page, () => {
          const vis = (id) => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== "none" && e.getClientRects().length > 0; };
          const n = document.getElementById("readOnlyNote");
          return { note: vis("readOnlyNote"), text: n ? n.innerText.trim() : "", forms: ["addSubjectBox", "addApproachBox", "addLadderBox", "addSectionBox", "editApproachListTitleBtn"].filter(vis), right: n ? Math.round(n.getBoundingClientRect().right) : 0 };
        });
        check(`${t}: sees one plain sentence in ${bn ? "Bangla" : "English"}`, f.note && f.text.length > 30 && (bn ? BN.test(f.text) : !BN.test(f.text)), f.text);
        check(`${t}: and no admin controls`, f.forms.length === 0, f.forms.join(","));
        check(`${t}: the sentence fits the screen`, f.right <= width, String(f.right));
        check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
      }, { seed: READER(role) });
    }

    // ------------------------------------------------------------------ Curriculum, as the owner
    await flow("cur-owner", lang, width, "/app/curriculum.html", async (t, page, ctx, errors) => {
      await page.waitForSelector("#adminArea", { state: "visible", timeout: 15000 });
      await settle(page, 1000);
      const vis = (id) => ev(page, (i) => { const e = document.getElementById(i); return !!e && getComputedStyle(e).display !== "none" && e.getClientRects().length > 0; }, id);
      check(`${t}: POSITIVE CONTROL the owner sees the admin area and not the note`, (await vis("adminArea")) && !(await vis("noAdminNote")));
      const m = await metrics(page);
      check(`${t}: no sideways page scroll`, m.overflow <= 1, String(m.overflow));
      check(`${t}: finger controls at least 40px tall`, m.small.length === 0, m.small.join(", "));

      // Create unit
      await page.fill("#unitNameInput", "");
      await page.click("#createUnitBtn"); await settle(page);
      check(`${t}: Create unit with no name says why`, hasWords(await ev(page, () => document.getElementById("createUnitResult").textContent)));
      await page.fill("#unitNameInput", NAME);
      await failWrites(page, true);
      await page.click("#createUnitBtn"); await settle(page, 800);
      let r = await ev(page, () => ({ msg: document.getElementById("createUnitResult").textContent, kept: document.getElementById("unitNameInput").value }));
      check(`${t}: a refused unit write says so in words and keeps what was typed`, hasWords(r.msg) && r.kept === NAME, JSON.stringify(r));
      await failWrites(page, false);
      await page.click("#createUnitBtn"); await settle(page, 1000);
      let w = await writes(page, "curriculumUnits", NAME);
      check(`${t}: the saved unit carries I17's four fields and a name keyed ${KEY}`, w.length === 1 && ENVELOPE(w[0].data) && w[0].data.name[KEY] === NAME && Object.keys(w[0].data.name).length === 1 && w[0].data.status === "active", JSON.stringify(w[0] && w[0].data));

      // Plan: Term and Week, Add
      const planOpts = await ev(page, () => ({ unit: document.getElementById("planUnitSelect").value, ctx: document.getElementById("planContextSelect").value, terms: document.getElementById("planTermSelect").options.length, weeks: document.getElementById("planWeekSelect").options.length }));
      check(`${t}: the plan offers a unit, a context, 4 terms and 10 weeks`, !!planOpts.unit && !!planOpts.ctx && planOpts.terms === 4 && planOpts.weeks === 10, JSON.stringify(planOpts));
      await page.selectOption("#planTermSelect", "2"); await page.selectOption("#planWeekSelect", "3");
      await failWrites(page, true);
      await page.click("#addPlanEntryBtn"); await settle(page, 800);
      check(`${t}: a refused plan write says so in words`, hasWords(await ev(page, () => document.getElementById("addPlanResult").textContent)));
      await failWrites(page, false);
      await page.click("#addPlanEntryBtn"); await settle(page, 1000);
      w = await writes(page, "curriculumPlan", "");
      check(`${t}: the saved plan entry carries I17's fields, term 2 and week 3 as numbers, and keeps the unit by id (I8)`, w.length === 1 && ENVELOPE(w[0].data) && w[0].data.term === 2 && w[0].data.week === 3 && !!w[0].data.curriculumUnitId && !("name" in w[0].data), JSON.stringify(w[0] && w[0].data));

      // Resource
      await page.fill("#resourceUrlInput", "");
      await page.click("#createResourceBtn"); await settle(page);
      check(`${t}: Create resource with no URL says why`, hasWords(await ev(page, () => document.getElementById("createResourceResult").textContent)));
      await page.fill("#resourceUrlInput", "https://example.org/notes");
      await failWrites(page, true);
      await page.click("#createResourceBtn"); await settle(page, 800);
      r = await ev(page, () => ({ msg: document.getElementById("createResourceResult").textContent, kept: document.getElementById("resourceUrlInput").value }));
      check(`${t}: a refused resource write says so in words and keeps the URL`, hasWords(r.msg) && r.kept === "https://example.org/notes", JSON.stringify(r));
      await failWrites(page, false);
      await page.click("#createResourceBtn"); await settle(page, 1000);
      w = await writes(page, "resources", "example.org/notes");
      check(`${t}: the saved resource carries I17's four fields`, w.length === 1 && ENVELOPE(w[0].data) && w[0].data.type === "link", JSON.stringify(w[0] && w[0].data));

      // Grades
      const g = await ev(page, () => ({ person: document.getElementById("gradePersonSelect").value, ladder: document.getElementById("gradeLadderSelect").options.length, level: document.getElementById("gradeLevelSelect").options.length }));
      if (g.person && g.ladder && g.level) {
        await failWrites(page, true);
        await page.click("#assignLevelBtn"); await settle(page, 800);
        check(`${t}: a refused Assign says so in words`, hasWords(await ev(page, () => document.getElementById("assignLevelResult").textContent)));
        await failWrites(page, false);
        await page.click("#assignLevelBtn"); await settle(page, 1000);
        w = await writes(page, "personLevels", "");
        check(`${t}: the saved grade carries I17's four fields`, w.length >= 1 && ENVELOPE(w[w.length - 1].data), JSON.stringify(w.map((x) => x.data)));
      } else {
        await page.click("#assignLevelBtn"); await settle(page);
        check(`${t}: Assign with nothing picked says why`, hasWords(await ev(page, () => document.getElementById("assignLevelResult").textContent)), JSON.stringify(g));
      }
      const erased = await ev(page, () => (window.__stubWriteData || []).filter((x) => /delete/i.test(x.kind)).length);
      check(`${t}: nothing was erased (I4)`, erased === 0, String(erased));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    });

    // ------------------------------------------------------------------ Curriculum, as a reader
    for (const role of ["teacher", "student"]) {
      await flow(`cur-reader-${role}`, lang, width, "/app/curriculum.html", async (t, page, ctx, errors) => {
        await page.waitForSelector("#app", { state: "visible", timeout: 15000 });
        await settle(page, 1000);
        const f = await ev(page, () => {
          const n = document.getElementById("noAdminNote"), a = document.getElementById("adminArea");
          return { note: !!n && getComputedStyle(n).display !== "none" && n.getClientRects().length > 0, text: n ? n.innerText.trim() : "", admin: !!a && getComputedStyle(a).display !== "none", right: n ? Math.round(n.getBoundingClientRect().right) : 0 };
        });
        check(`${t}: sees one plain sentence in ${bn ? "Bangla" : "English"}`, f.note && f.text.length > 30 && (bn ? BN.test(f.text) : !BN.test(f.text)), f.text);
        check(`${t}: and no admin area`, f.admin === false);
        check(`${t}: the sentence fits the screen`, f.right <= width, String(f.right));
        check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
      }, { seed: READER(role) });
    }
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
