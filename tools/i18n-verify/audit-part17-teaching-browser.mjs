// Audit part 17 (PCF J29, manual audit): the User Manual's "Teaching, family and madrasah management" features, each one WORKING.
// Measured on the rendered pages at 390 / 820 / 1440 (and 320 for anything that opens a form), English and Bangla.
// The RESULT is asserted, not the element: the stored write (window.__stubWriteData: collection, id, fields, I17 stamps),
// the clipboard text, the lock in sessionStorage, the downloaded file.
//   people      1 People (Add person, Invite, Copy link)   2 Hand the device to a child (lock, D10)   3 View as
//   classes     4 Classes (Create, Enrol, Bulk confirm, Archive)       offers   5 Course Offers (Create, enrol, End, Archive)
//   homework    6 Homework (Create, Mark submitted, Save score)        curriculum  7 Curriculum (unit, plan, resource, grade)
//   catalogue   8 Catalogue (subject, Approach, heading, reorder, ladder, level)
//   backup      9 Backup (file and its top-level keys)                 about    10 About (modules; the four hidden are named hidden)
// Each flow has a POSITIVE CONTROL and a timeout that fails by name. Mutations: --mutate=<name> restores a defect.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part17-teaching-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const PROBE = process.env.PROBE === "1" || process.argv.includes("--probe");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
const WONLY = Number((process.argv.find((a) => a.startsWith("--width=")) || "").slice(8)) || 0;
const LONLY = (process.argv.find((a) => a.startsWith("--lang=")) || "").slice(7);
// No defect was found in this audit, so these are PROOFS THAT THE CHECKS CAN FAIL: each restores a plausible defect in the
// feature it guards. [file, route glob, anchor (must occur exactly once), replacement, the page the mutation applies to].
const MUTATIONS = {
  // Start studying no longer engages the lock.
  "nolock": ["app/people.html", "**/people.html*", "acquireStudyLock(personId);", "", "/app/people.html"],
  // Choosing a View as role leaves the Add person form on screen.
  "viewasstay": ["app/people.html", "**/people.html*", 'addPersonBox.style.display = canAdmin ? "block" : "none";', "", "/app/people.html"],
  // Copy link carries the raw email in the link (D9).
  "rawlink": ["app/people.html", "**/people.html*", "accept-invite.html?token=${token}`", "accept-invite.html?token=${token}&email=${btn.dataset.email}`", "/app/people.html"],
  // Archive a class leaves it active.
  "noarchive": ["app/classes.html", "**/classes.html*", 'setClassStatus(db, activeTenantId, btn.dataset.class, "archived")', 'setClassStatus(db, activeTenantId, btn.dataset.class, "active")', "/app/classes.html"],
  // The Bangla page prints "Class created." in English.
  "bnleak": ["app/classes.html", "**/classes.html*", 'createResult.textContent = t("Class created.");', 'createResult.textContent = "Class created.";', "/app/classes.html"],
  // Save score forgets the assignment's maximum.
  "scoremax": ["app/homework.html", "**/homework.html*", 'maxScoreAtMark: btn.dataset.max === "" ? null : Number(btn.dataset.max),', "maxScoreAtMark: null,", "/app/homework.html"],
  // Dropping a dragged section does nothing.
  "nodrag": ["app/catalogue.html", "**/catalogue.html*", "if (drag && commit && drag.to !== drag.from) moveSectionTo(drag.from, drag.to);", "", "/app/catalogue.html"],
  // The backup file loses its homework block.
  "nohomework": ["app/js/backup.js", "**/js/backup.js*", "    homework: { assignments, submissions, teachingNotes },\n", "", "/app/backup.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);

const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
// English words that may stay on a Bangla page: the app's own names, source names and names people typed.
const ALLOWED = /General Grades|Year \d|Surah Al-Fatiha|https?:\/\/\S+|Memorise Surah Al-Fatiha|Doing well on tajweed\.|Morning Class|Evening Quran|Audit Class|Audit Offer|QuranRevival|QCR|MMSA|Qur'?an|Asma|Husna|Madrasatul|Muslimeen|Hadith|hadith|Google|CSV|JSON|ID|AM|PM|Ahsan|Maryam|Zayd|Aisha|example|com|Audit|Tajweed|Fiqh|Tafsir/g;
const englishLeft = (text) => (String(text).replace(ALLOWED, " ").match(/[A-Za-z]{3,}/g) || []);

async function open(lang, width, pagePath, { extraSeed = "", download = false } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: extraSeed || null });
  // Updated in place 17 Oct 2026 (suite-health sweep #912): the origin was hardcoded to :8080, so on any other QR_BASE
  // port the clipboard was denied and "Copy link" failed; it now follows the harness BASE like every URL in this suite.
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(BASE).origin }).catch(() => {});
  if (MUTATE && MUTATIONS[MUTATE][4] === pagePath) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(1000);
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
const tap = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); if (!e) throw new Error(`no ${s}`); e.click(); }, sel);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const writes = (page, from = 0) => ev(page, (k) => (window.__stubWriteData || []).slice(k).map((x) => ({ kind: x.kind, col: x.col, id: x.id, data: x.data })), from);
const writeCount = (page) => ev(page, () => (window.__stubWriteData || []).length);
const fill = (page, sel, v) => page.fill(sel, v);
// A control a finger presses: visible and at least 40px tall. Checkboxes/radios are judged by their label.
const tall = (page, sel) => ev(page, (s) => { const e = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length); if (!e) return -1; const l = e.closest("label"); const r = (e.type === "checkbox" && l ? l : e).getBoundingClientRect(); return Math.round(r.height); }, sel);
const wide = (page) => ev(page, () => document.documentElement.scrollWidth - innerWidth);
const STAMPS = (d) => d && d.schemaVersion != null && d.createdAt !== undefined && d.updatedAt !== undefined && !!d.createdBy;
const bodyText = (page) => ev(page, () => document.body.innerText);

// The seeded pending invite gets its link code (the real app writes the code with the invite; the stub does not re-serve writes).
const SEED_TOKEN = `DATA.inviteTokens = [{ _id: "tok-Abc123xyz789", tenantId: TENANT_ID, email: "invited@example.com" }];`;

const WIDTHS = [320, 390, 820, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 1: People: Add person, Invite, Copy link.
  await flow("people", lang, width, "/app/people.html", async (t, page, ctx, errors) => {
    await page.waitForSelector("#addBtn", { state: "visible", timeout: 10000 });
    const roster0 = await ev(page, () => document.querySelectorAll("#rosterBody tr").length);
    check(`${t}: POSITIVE CONTROL the roster and the Add person form are on screen`, roster0 >= 2 && await tall(page, "#addBtn") > 0, `rows ${roster0}`);
    const inside = await ev(page, () => { const b = document.getElementById("addPersonBox").getBoundingClientRect(); return { l: b.left, r: b.right, vw: innerWidth }; });
    check(`${t}: the Add form sits inside the screen, no sideways scroll`, inside.l >= -1 && inside.r <= inside.vw + 1 && await wide(page) <= 0, JSON.stringify(inside));
    const h = { add: await tall(page, "#addBtn"), name: await tall(page, "#name"), year: await tall(page, "#birthYear"), child: await tall(page, "#isMinor"), role: await tall(page, 'input[name="role"]'), invite: await tall(page, "#inviteBtn"), email: await tall(page, "#inviteEmail"), copy: await tall(page, ".getLinkBtn") };
    if (PROBE) console.log(t, "heights", JSON.stringify(h));
    check(`${t}: every control a finger presses is at least 40px`, Object.values(h).every((v) => v >= 40), JSON.stringify(h));
    // Add person: a child, born 2015, role Student, managed by someone.
    const w0 = await writeCount(page);
    await fill(page, "#name", "Zayd Audit");
    await fill(page, "#birthYear", "2015");
    await page.check("#isMinor");
    await page.check('input[name="role"][value="student"]');
    check(`${t}: ticking "This is a child" shows the Managed by choice`, await ev(page, () => getComputedStyle(document.getElementById("managedByWrap")).display !== "none"));
    await page.click("#addBtn");
    await page.waitForFunction(() => document.getElementById("result")?.className === "ok", null, { timeout: 8000 }).catch(() => {});
    const res = await ev(page, () => document.getElementById("result").textContent);
    const ws = await writes(page, w0);
    const person = ws.find((x) => x.col === "tenantPeople");
    if (PROBE) console.log(t, "writes", JSON.stringify(ws).slice(0, 900), res);
    const pid = person?.id?.split("__").pop() ?? "";
    check(`${t}: Add person writes ONE tenantPeople document with a 7-digit personId (D3)`, !!person && /^\d{7}$/.test(pid), JSON.stringify(person)?.slice(0, 300));
    const d = person?.data ?? {};
    check(`${t}: the person carries name, isMinor, birthYear and the I17 stamps`, (d.name?.en === "Zayd Audit" || d.name === "Zayd Audit") && d.isMinor === true && Number(d.birthYear) === 2015 && STAMPS(d), JSON.stringify(d).slice(0, 400));
    check(`${t}: the page says "Added. Person ID: ${"…"}" with that id (${bn ? "Bangla" : "English"})`, res.includes(pid) && (bn ? BN.test(res) : /^Added\. Person ID: /.test(res)), res);
    // The stub never re-serves its own writes, so the new roster row cannot be asserted here; the cleared form can.
    check(`${t}: the form is cleared after adding`, await ev(page, () => document.getElementById("name").value === "" && document.getElementById("birthYear").value === "" && !document.getElementById("isMinor").checked && document.querySelectorAll('input[name="role"]:checked').length === 0));
    // Invite + Copy link.
    const w1 = await writeCount(page);
    await fill(page, "#inviteEmail", "new.teacher@example.com");
    await page.selectOption("#inviteRole", "teacher");
    await page.click("#inviteBtn");
    await page.waitForFunction(() => [...document.querySelectorAll("#inviteBody tr")].some((r) => r.textContent.includes("new.teacher@example.com")), null, { timeout: 8000 }).catch(() => {});
    const iw = await writes(page, w1);
    const inv = iw.find((x) => x.col === "tenantInvites");
    const tok = iw.find((x) => x.col === "inviteTokens");
    if (PROBE) console.log(t, "invite writes", JSON.stringify(iw).slice(0, 900));
    check(`${t}: Invite writes a PENDING tenantInvites document for that email and role, with the I17 stamps`, !!inv && inv.data.status === "pending" && inv.data.email === "new.teacher@example.com" && inv.data.role === "teacher" && STAMPS(inv.data), JSON.stringify(inv)?.slice(0, 300));
    check(`${t}: the invite's link code lives in inviteTokens, not in the invite (D9)`, !!tok, JSON.stringify(iw.map((x) => x.col)));
    check(`${t}: the page says the invite was created (${bn ? "Bangla" : "English"})`, await ev(page, (b) => { const s = document.getElementById("inviteResult").textContent; return s.length > 10 && (b ? /[ঀ-৿]/.test(s) : /Invite created/.test(s)); }, bn));
    // The seeded pending invite stands in for the new one (the stub does not re-serve writes).
    const row = await ev(page, () => { const r = [...document.querySelectorAll("#inviteBody tr")].find((x) => x.textContent.includes("invited@example.com")); return r ? { text: r.textContent, copy: !!r.querySelector(".getLinkBtn") } : null; });
    check(`${t}: POSITIVE CONTROL a pending invite is listed with a Copy link button`, !!row && row.copy, JSON.stringify(row));
    const copyBtn = `#inviteBody tr:has(td:text-is("invited@example.com")) .getLinkBtn`;
    await page.click(copyBtn);
    // Updated in place 17 Oct 2026 (#912): `:text-is()` is a Playwright selector, so document.querySelector threw a
    // SyntaxError inside the page (caught as a page error at 320px). The wait now finds the row by its text instead.
    await page.waitForFunction(() => { const r = [...document.querySelectorAll("#inviteBody tr")].find((x) => x.textContent.includes("invited@example.com")); return /!|✓|Copied|কপি/.test(r?.querySelector(".getLinkBtn")?.textContent ?? ""); }, null, { timeout: 8000 }).catch(() => {});
    const clip = await ev(page, () => navigator.clipboard.readText().catch((e) => "ERR " + e.message));
    if (PROBE) console.log(t, "clip", clip);
    check(`${t}: "Copy link" puts an accept-invite link on the clipboard that never carries the email (D9)`, /accept-invite\.html\?token=[A-Za-z0-9_-]{8,}/.test(clip) && !/example\.com|@/.test(clip), clip);
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    if (width === 390 || width === 1440) await page.screenshot({ path: `/tmp/audit17-people-${lang}-${width}.png`, fullPage: true });
  }, { extraSeed: SEED_TOKEN });
}
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 2: Hand the device to a child: Start studying engages the lock, End session releases it; nothing else engages it (D10).
  await flow("lock", lang, width, "/app/people.html", async (t, page, ctx, errors) => {
    await page.waitForSelector("#startStudyBtn", { state: "visible", timeout: 10000 });
    const lockOf = () => ev(page, () => JSON.parse(sessionStorage.getItem("qr.studyLock") || "null"));
    const opts = await ev(page, () => [...document.querySelectorAll("#studyPersonSelect option")].map((o) => o.value + ":" + o.textContent));
    check(`${t}: POSITIVE CONTROL the Child list offers the roster's child (and only children)`, opts.length === 1 && opts[0].startsWith("p2:"), JSON.stringify(opts));
    // D10: things a teacher does while recording never touch the lock.
    check(`${t}: no lock at the start`, (await lockOf()) === null);
    await page.selectOption("#studyPersonSelect", { index: 0 });
    await fill(page, "#name", "Someone Else"); await page.check("#isMinor"); await page.click("#addBtn");
    await settle(page, 600);
    check(`${t}: choosing a person in the dropdown, and adding people one after another, never engages the lock (D10)`, (await lockOf()) === null && await ev(page, () => getComputedStyle(document.getElementById("endStudyBtn")).display === "none"));
    check(`${t}: Start studying and End session are finger-sized`, await tall(page, "#startStudyBtn") >= 40);
    const pid = await ev(page, () => document.getElementById("studyPersonSelect").value);
    await page.click("#startStudyBtn");
    await settle(page, 300);
    const lock = await lockOf();
    const said = await ev(page, () => document.getElementById("studyResult").textContent);
    check(`${t}: Start studying engages the lock for the chosen child`, !!lock && lock.personId === pid, JSON.stringify(lock));
    check(`${t}: the page says the device is studying as them (${bn ? "Bangla" : "English"}) and offers End session`, said.length > 20 && (bn ? BN.test(said) : /^This device is studying as /.test(said)) && await tall(page, "#endStudyBtn") >= 40, said);
    await page.click("#endStudyBtn");
    await settle(page, 300);
    check(`${t}: End session releases the lock and hides End session`, (await lockOf()) === null && await ev(page, () => document.getElementById("studyResult").textContent === "" && getComputedStyle(document.getElementById("endStudyBtn")).display === "none"));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 3: View as: a role hides the admin controls and says so; (your real role) turns it off; the choice survives a reload.
  await flow("viewas", lang, width, "/app/people.html", async (t, page, ctx, errors) => {
    await page.waitForSelector("#viewAsSelect", { state: "visible", timeout: 10000 });
    const state = () => ev(page, () => ({ add: getComputedStyle(document.getElementById("addPersonBox")).display, invite: getComputedStyle(document.getElementById("inviteBox")).display, actions: getComputedStyle(document.getElementById("peopleActionsHead")).display, edit: document.querySelectorAll(".editPersonBtn").length, notice: document.querySelector(".nav-preview-notice")?.textContent ?? "", sel: document.getElementById("viewAsSelect").value }));
    const real = await state();
    check(`${t}: POSITIVE CONTROL as the real role the Add and Invite forms and the Edit buttons are shown, with no preview notice`, real.add !== "none" && real.invite !== "none" && real.edit > 0 && real.notice === "", JSON.stringify(real));
    await page.selectOption("#viewAsSelect", "student");
    await settle(page, 900);
    const s = await state();
    check(`${t}: viewing as Student hides the admin controls`, s.add === "none" && s.invite === "none" && s.actions === "none" && s.edit === 0, JSON.stringify(s));
    check(`${t}: and the page says it is a preview (${bn ? "Bangla" : "English"})`, s.notice.length > 8 && (bn ? BN.test(s.notice) : /Previewing as: Student/.test(s.notice)), s.notice);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("#viewAsSelect", { state: "visible", timeout: 10000 });
    await settle(page, 900);
    const kept = await state();
    check(`${t}: the preview survives a reload (kept on the device) and the page still says it is on`, kept.sel === "student" && kept.add === "none" && kept.notice.length > 8, JSON.stringify(kept));
    await page.selectOption("#viewAsSelect", "");
    await settle(page, 900);
    const back = await state();
    check(`${t}: choosing "(your real role)" turns the preview off: forms back, notice gone`, back.add !== "none" && back.invite !== "none" && back.edit > 0 && back.notice === "", JSON.stringify(back));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}
// The seeded Morning Class gets one enrolled student whose pending record the bulk confirm can find (the stub seeds p1's pending ayah 1:1).
const SEED_CLASS = `DATA.enrollments.push({ _id: TENANT_ID + "__c1__p1", tenantId: TENANT_ID, contextType: "class", contextId: "c1", personId: "p1", roleInClass: "student", subjectIds: [], status: "active" });`;
const frame = (page) => ev(page, () => { const nav = document.getElementById("topNav")?.getBoundingClientRect().bottom ?? 0; return { over: document.documentElement.scrollWidth - innerWidth, nav, vw: innerWidth }; });
const allTall = async (page, sels) => { const o = {}; for (const s of sels) o[s] = await tall(page, s); return o; };

for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 4: Classes: Create class, Enrol, Bulk confirm all pending, Archive.
  await flow("classes", lang, width, "/app/classes.html", async (t, page, ctx, errors) => {
    await page.waitForSelector("#createClassBtn", { state: "visible", timeout: 10000 });
    await page.waitForSelector(".enrolBtn", { timeout: 10000 });
    check(`${t}: POSITIVE CONTROL the New class form and the seeded class card (Enrol, Bulk confirm, Archive) are on screen`, await ev(page, () => !!document.querySelector(".bulkConfirmClassBtn") && !!document.querySelector(".archiveClassBtn") && !!document.getElementById("classNameInput")));
    const f = await frame(page);
    const hs = await allTall(page, ["#classNameInput", "#classGlossInput", "#createClassBtn", ".enrolPersonSelect", ".enrolRoleSelect", ".enrolBtn", ".bulkConfirmClassBtn", ".archiveClassBtn", ".endEnrolBtn"]);
    if (PROBE) console.log(t, "heights", JSON.stringify(hs), JSON.stringify(f));
    check(`${t}: no sideways scroll`, f.over <= 0, JSON.stringify(f));
    check(`${t}: every control a finger presses is at least 40px`, Object.values(hs).every((v) => v >= 40), JSON.stringify(hs));
    // Create class.
    let w = await writeCount(page);
    await fill(page, "#classNameInput", "Audit Class");
    await fill(page, "#classGlossInput", "A gloss");
    await page.check('#subjectChecks input[type="checkbox"]');
    await page.click("#createClassBtn");
    await settle(page, 700);
    let ws = await writes(page, w);
    const made = ws.find((x) => x.col === "classes");
    if (PROBE) console.log(t, "create", JSON.stringify(ws).slice(0, 700));
    check(`${t}: Create class writes ONE classes document (tenant__id) active, with its subject and the I17 stamps`, !!made && /^t1__.+/.test(made.id) && made.data.status === "active" && made.data.name?.en === "Audit Class" && made.data.subjectIds?.length === 1 && STAMPS(made.data), JSON.stringify(made)?.slice(0, 400));
    const said = await ev(page, () => document.getElementById("createResult").textContent);
    check(`${t}: the page says "Class created." (${bn ? "Bangla" : "English"}) and clears the form`, (bn ? BN.test(said) : said === "Class created.") && await ev(page, () => document.getElementById("classNameInput").value === ""), said);
    // Enrol: the seeded class's person list, role Teacher.
    w = await writeCount(page);
    await page.selectOption(".enrolRoleSelect", "teacher");
    const person = await ev(page, () => document.querySelector(".enrolPersonSelect").value);
    await page.click(".enrolBtn");
    await settle(page, 800);
    ws = await writes(page, w);
    const enr = ws.find((x) => x.col === "enrollments");
    if (PROBE) console.log(t, "enrol", JSON.stringify(ws).slice(0, 700));
    check(`${t}: Enrol writes an enrollments document t1__c1__${person} (class, teacher, active) with the I17 stamps`, !!enr && enr.id === `t1__c1__${person}` && enr.data.contextType === "class" && enr.data.roleInClass === "teacher" && enr.data.status === "active" && STAMPS(enr.data), JSON.stringify(enr)?.slice(0, 400));
    // Bulk confirm all pending.
    w = await writeCount(page);
    await page.click(".bulkConfirmClassBtn");
    await page.waitForFunction(() => (document.querySelector(".bulkResult")?.textContent ?? "").length > 5, null, { timeout: 8000 }).catch(() => {});
    ws = await writes(page, w);
    const rec = ws.find((x) => x.col === "records");
    const msg = await ev(page, () => document.querySelector(".bulkResult").textContent);
    if (PROBE) console.log(t, "bulk", JSON.stringify(ws).slice(0, 700), msg);
    check(`${t}: Bulk confirm writes the enrolled student's pending entry as confirmed (ayah 1:1)`, !!rec && rec.id === "t1__p1__surah_1" && JSON.stringify(rec.data).includes("confirmed"), JSON.stringify(rec)?.slice(0, 400));
    check(`${t}: and says how many it confirmed (${bn ? "Bangla" : "English"})`, bn ? BN.test(msg) : /^Confirmed 2 pending entries across 1 students\.$/.test(msg), msg);
    // End an enrolment (the seeded student), then Archive.
    w = await writeCount(page);
    await page.click(".endEnrolBtn");
    await settle(page, 700);
    ws = await writes(page, w);
    const ended = ws.find((x) => x.col === "enrollments");
    check(`${t}: End on an enrolment marks it ended (never deletes: I4)`, !!ended && ended.data.status === "ended" && !!ended.data.endedAt && ws.every((x) => x.kind !== "delete"), JSON.stringify(ws).slice(0, 300));
    w = await writeCount(page);
    await page.click(".archiveClassBtn");
    await settle(page, 700);
    ws = await writes(page, w);
    const arch = ws.find((x) => x.col === "classes");
    check(`${t}: Archive sets the class to archived (never deletes: I4/D6)`, !!arch && arch.id === "t1__c1" && arch.data.status === "archived" && ws.every((x) => x.kind !== "delete"), JSON.stringify(ws).slice(0, 300));
    check(`${t}: no Delete button exists anywhere on the page`, await ev(page, () => ![...document.querySelectorAll("button")].some((b) => /delete|মুছ/i.test(b.textContent))));
    if (bn) { const left = englishLeft(await bodyText(page)); check(`${t}: no English left on the Bangla page (names typed by people excepted)`, left.length === 0, left.slice(0, 12).join(" ")); }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    if (width === 390 || width === 1440) await page.screenshot({ path: `/tmp/audit17-classes-${lang}-${width}.png`, fullPage: true });
  }, { extraSeed: SEED_CLASS });

  // 5: Course Offers: Create offer, enrol, End, Archive.
  await flow("offers", lang, width, "/app/course-offers.html", async (t, page, ctx, errors) => {
    await page.waitForSelector("#createOfferBtn", { state: "visible", timeout: 10000 });
    await page.waitForSelector(".enrolBtn", { timeout: 10000 });
    check(`${t}: POSITIVE CONTROL the New course offer form and the seeded offer card are on screen`, await ev(page, () => !!document.querySelector(".archiveOfferBtn") && !!document.getElementById("offerNameInput") && document.querySelectorAll("#dayChecks input").length === 7));
    const f = await frame(page);
    const hs = await allTall(page, ["#offerNameInput", "#startDateInput", "#endDateInput", "#notesInput", "#dayChecks input", "#subjectChecks input", "#createOfferBtn", ".enrolBtn", ".archiveOfferBtn", ".endEnrolBtn"]);
    if (PROBE) console.log(t, "heights", JSON.stringify(hs), JSON.stringify(f));
    check(`${t}: no sideways scroll`, f.over <= 0, JSON.stringify(f));
    check(`${t}: every control a finger presses is at least 40px`, Object.values(hs).every((v) => v >= 40), JSON.stringify(hs));
    let w = await writeCount(page);
    await fill(page, "#offerNameInput", "Audit Offer");
    await page.check('#subjectChecks input[type="checkbox"]');
    await page.check('#dayChecks input[value="1"]');
    await page.check('#dayChecks input[value="3"]');
    await fill(page, "#startDateInput", "2026-11-01");
    await fill(page, "#endDateInput", "2026-12-20");
    await page.click("#createOfferBtn");
    await settle(page, 700);
    let ws = await writes(page, w);
    const made = ws.find((x) => x.col === "courseOffers");
    if (PROBE) console.log(t, "create", JSON.stringify(ws).slice(0, 700));
    check(`${t}: Create offer writes ONE courseOffers document with name, subject, days 1 and 3, both dates, active, and the I17 stamps`, !!made && /^t1__.+/.test(made.id) && made.data.name?.en === "Audit Offer" && made.data.subjectIds?.length === 1 && made.data.routine?.daysOfWeek?.join() === "1,3" && made.data.routine?.startDate === "2026-11-01" && made.data.routine?.endDate === "2026-12-20" && made.data.status === "active" && STAMPS(made.data), JSON.stringify(made)?.slice(0, 500));
    const said = await ev(page, () => document.getElementById("createResult").textContent);
    check(`${t}: the page says "Course offer created." (${bn ? "Bangla" : "English"}) and clears the form`, (bn ? BN.test(said) : said === "Course offer created.") && await ev(page, () => document.getElementById("offerNameInput").value === "" && document.querySelectorAll("#dayChecks input:checked").length === 0), said);
    // Enrol: the Person chosen in the context bar, via the card's Enrol button.
    w = await writeCount(page);
    const person = await ev(page, () => document.getElementById("personSelect").value);
    await page.click(".enrolBtn");
    await settle(page, 800);
    ws = await writes(page, w);
    const enr = ws.find((x) => x.col === "enrollments" && x.id === `t1__o1__${person}`);
    if (PROBE) console.log(t, "enrol", person, JSON.stringify(ws).slice(0, 700));
    check(`${t}: Enrol writes an enrollments document t1__o1__${person} (courseOffer, active) with the I17 stamps`, !!enr && enr.data.contextType === "courseOffer" && enr.data.status === "active" && STAMPS(enr.data), JSON.stringify(ws).slice(0, 400));
    w = await writeCount(page);
    await page.click(".endEnrolBtn");
    await settle(page, 700);
    ws = await writes(page, w);
    const ended = ws.find((x) => x.col === "enrollments");
    check(`${t}: End marks the enrolment ended (never deletes: I4)`, !!ended && ended.data.status === "ended" && !!ended.data.endedAt && ws.every((x) => x.kind !== "delete"), JSON.stringify(ws).slice(0, 300));
    w = await writeCount(page);
    await page.click(".archiveOfferBtn");
    await settle(page, 700);
    ws = await writes(page, w);
    const arch = ws.find((x) => x.col === "courseOffers");
    check(`${t}: Archive sets the offer to archived (never deletes: I4/D6)`, !!arch && arch.id === "t1__o1" && arch.data.status === "archived" && ws.every((x) => x.kind !== "delete"), JSON.stringify(ws).slice(0, 300));
    if (bn) { const left = englishLeft(await bodyText(page)); check(`${t}: no English left on the Bangla page (names typed by people excepted)`, left.length === 0, left.slice(0, 12).join(" ")); }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    if (width === 390 || width === 1440) await page.screenshot({ path: `/tmp/audit17-offers-${lang}-${width}.png`, fullPage: true });
  });
}
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 6: Homework: Create assignment for the chosen person, Mark as submitted, Save score.
  await flow("homework", lang, width, "/app/homework.html", async (t, page, ctx, errors) => {
    await page.waitForSelector("#createAssignmentBtn", { state: "visible", timeout: 10000 });
    await page.waitForSelector(".markSubmittedBtn", { timeout: 10000 });
    check(`${t}: POSITIVE CONTROL the New assignment form and the seeded assignment (Mark as submitted, Save score) are on screen`, await ev(page, () => !!document.querySelector(".markSubmittedBtn") && !!document.querySelector(".saveScoreBtn") && document.querySelectorAll("#assignToChecks input").length >= 1));
    const f = await frame(page);
    const hs = await allTall(page, ["#assignToChecks input", "#subjectSelect", "#dueDateInput", "#maxScoreInput", "#instructionsInput", "#createAssignmentBtn", ".markSubmittedBtn", ".saveScoreBtn", ".scoreInput", ".commentInput", "#noteAboutSelect", "#saveNoteBtn"]);
    if (PROBE) console.log(t, "heights", JSON.stringify(hs), JSON.stringify(f));
    check(`${t}: no sideways scroll`, f.over <= 0, JSON.stringify(f));
    check(`${t}: every control a finger presses is at least 40px`, Object.values(hs).every((v) => v >= 40), JSON.stringify(hs));
    const person = await ev(page, () => document.getElementById("personSelect").value);
    let w = await writeCount(page);
    await page.check(`#assignToChecks input[value="${person}"]`);
    await fill(page, "#instructionsInput", "Revise Surah Al-Ikhlas");
    await fill(page, "#dueDateInput", "2026-11-10");
    await fill(page, "#maxScoreInput", "20");
    await page.click("#createAssignmentBtn");
    await settle(page, 800);
    let ws = await writes(page, w);
    const made = ws.find((x) => x.col === "assignments");
    if (PROBE) console.log(t, "create", JSON.stringify(ws).slice(0, 700));
    check(`${t}: Create assignment writes ONE assignments document for the chosen person, with instructions, due date, max score and the I17 stamps`, !!made && /^t1__.+/.test(made.id) && made.data.assignedToPersonIds?.join() === person && made.data.instructions?.en === "Revise Surah Al-Ikhlas" && made.data.dueDate === "2026-11-10" && made.data.maxScore === 20 && STAMPS(made.data), JSON.stringify(made)?.slice(0, 500));
    const said = await ev(page, () => document.getElementById("createResult").textContent);
    check(`${t}: the page says "Assigned to 1 student." (${bn ? "Bangla" : "English"}) and clears the form`, (bn ? BN.test(said) : said === "Assigned to 1 student.") && await ev(page, () => document.getElementById("instructionsInput").value === ""), said);
    // Mark as submitted (the seeded assignment, for p1).
    w = await writeCount(page);
    await fill(page, ".submitNote", "Done at home");
    await page.click(".markSubmittedBtn");
    await settle(page, 800);
    ws = await writes(page, w);
    const sub = ws.find((x) => x.col === "submissions");
    if (PROBE) console.log(t, "submit", JSON.stringify(ws).slice(0, 600));
    check(`${t}: Mark as submitted writes submissions t1__a1__${person} as submitted, with the note and a time`, !!sub && sub.id === `t1__a1__${person}` && sub.data.status === "submitted" && sub.data.submittedNote === "Done at home" && !!sub.data.submittedAt, JSON.stringify(ws).slice(0, 400));
    // Save score.
    w = await writeCount(page);
    await page.waitForSelector(".saveScoreBtn", { timeout: 8000 });
    await fill(page, ".scoreInput", "8");
    await fill(page, ".commentInput", "Good effort");
    await page.click(".saveScoreBtn");
    await settle(page, 800);
    ws = await writes(page, w);
    const sc = ws.find((x) => x.col === "submissions");
    if (PROBE) console.log(t, "score", JSON.stringify(ws).slice(0, 600));
    check(`${t}: Save score writes the score 8 out of 10, the comment and who marked it, status marked`, !!sc && sc.data.status === "marked" && sc.data.score === 8 && sc.data.maxScoreAtMark === 10 && sc.data.comment === "Good effort" && !!sc.data.markedByPersonId && !!sc.data.markedAt, JSON.stringify(ws).slice(0, 400));
    check(`${t}: nothing was deleted`, (await writes(page, 0)).every((x) => x.kind !== "delete"));
    if (bn) { const left = englishLeft(await bodyText(page)); check(`${t}: no English left on the Bangla page (names typed by people excepted)`, left.length === 0, left.slice(0, 12).join(" ")); }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    if (width === 390 || width === 1440) await page.screenshot({ path: `/tmp/audit17-homework-${lang}-${width}.png`, fullPage: true });
  });
}
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 7: Curriculum: Create unit; add it to the plan for a Term and Week; Create resource; Grades → Assign.
  await flow("curriculum", lang, width, "/app/curriculum.html", async (t, page, ctx, errors) => {
    await page.waitForSelector("#createUnitBtn", { state: "visible", timeout: 10000 });
    await settle(page, 600);
    check(`${t}: POSITIVE CONTROL the unit, plan, resource and grade forms are on screen`, await ev(page, () => ["createUnitBtn", "addPlanEntryBtn", "createResourceBtn", "assignLevelBtn"].every((id) => document.getElementById(id)?.getClientRects().length > 0)));
    const f = await frame(page);
    const hs = await allTall(page, ["#unitNameInput", "#unitSubjectChecks input", "#unitLadderSelect", "#unitLevelSelect", "#unitOrderInput", "#createUnitBtn", "#planContextTypeSelect", "#planContextSelect", "#planUnitSelect", "#planTermSelect", "#planWeekSelect", "#addPlanEntryBtn", "#resourceTypeSelect", "#resourceUrlInput", "#createResourceBtn", "#gradePersonSelect", "#gradeLadderSelect", "#gradeLevelSelect", "#gradeFromDateInput", "#assignLevelBtn"]);
    if (PROBE) console.log(t, "heights", JSON.stringify(hs), JSON.stringify(f));
    check(`${t}: no sideways scroll`, f.over <= 0, JSON.stringify(f));
    check(`${t}: every control a finger presses is at least 40px`, Object.values(hs).every((v) => v >= 40), JSON.stringify(hs));
    // Create unit.
    let w = await writeCount(page);
    await fill(page, "#unitNameInput", "Audit Unit");
    await page.check('#unitSubjectChecks input[type="checkbox"]');
    await page.click("#createUnitBtn");
    await settle(page, 800);
    let ws = await writes(page, w);
    const unit = ws.find((x) => x.col === "curriculumUnits");
    if (PROBE) console.log(t, "unit", JSON.stringify(ws).slice(0, 600));
    check(`${t}: Create unit writes ONE curriculumUnits document with its name, a subject and the I17 stamps`, !!unit && /^t1__.+/.test(unit.id) && unit.data.name?.en === "Audit Unit" && unit.data.subjectIds?.length === 1 && unit.data.status === "active" && STAMPS(unit.data), JSON.stringify(unit)?.slice(0, 400));
    const said1 = await ev(page, () => document.getElementById("createUnitResult").textContent);
    check(`${t}: the page confirms the unit in ${bn ? "Bangla" : "English"} and clears the name`, said1.length > 3 && (!bn || BN.test(said1)) && await ev(page, () => document.getElementById("unitNameInput").value === ""), said1);
    // Add to the plan: class Morning Class (c1), the seeded unit, Term 2 Week 3.
    await page.selectOption("#planContextTypeSelect", "class");
    await settle(page, 400);
    await page.selectOption("#planContextSelect", { index: 0 });
    await page.selectOption("#planUnitSelect", { index: 0 });
    const term = await ev(page, () => [...document.getElementById("planTermSelect").options].map((o) => o.value));
    const week = await ev(page, () => [...document.getElementById("planWeekSelect").options].map((o) => o.value));
    check(`${t}: the plan offers 4 terms and 10 weeks`, term.length === 4 && week.length === 10, `${term.length} terms, ${week.length} weeks`);
    await page.selectOption("#planTermSelect", term[1]);
    await page.selectOption("#planWeekSelect", week[2]);
    w = await writeCount(page);
    await page.click("#addPlanEntryBtn");
    await settle(page, 800);
    ws = await writes(page, w);
    const plan = ws.find((x) => x.col === "curriculumPlan");
    if (PROBE) console.log(t, "plan", JSON.stringify(ws).slice(0, 600));
    check(`${t}: Add writes ONE curriculumPlan document: class c1, the unit, Term 2, Week 3, with the I17 stamps`, !!plan && plan.data.contextType === "class" && plan.data.contextId === "c1" && plan.data.curriculumUnitId === "u1" && plan.data.term === 2 && plan.data.week === 3 && STAMPS(plan.data), JSON.stringify(plan)?.slice(0, 400));
    // Create resource: a link, then check the write.
    w = await writeCount(page);
    await page.selectOption("#resourceTypeSelect", "link");
    await fill(page, "#resourceUrlInput", "https://example.org/audit-lesson");
    await page.click("#createResourceBtn");
    await settle(page, 800);
    ws = await writes(page, w);
    const res = ws.find((x) => x.col === "resources");
    if (PROBE) console.log(t, "resource", JSON.stringify(ws).slice(0, 600));
    check(`${t}: Create resource writes ONE resources document of type link with that URL, with the I17 stamps`, !!res && res.data.type === "link" && res.data.url === "https://example.org/audit-lesson" && res.data.status === "active" && STAMPS(res.data), JSON.stringify(res)?.slice(0, 400));
    // Grades → Assign: person p2, ladder General Grades, Year 2, from a date.
    await page.selectOption("#gradePersonSelect", "p2");
    await settle(page, 600);
    await page.selectOption("#gradeLadderSelect", { index: 0 });
    await settle(page, 300);
    await page.selectOption("#gradeLevelSelect", "lv2");
    await fill(page, "#gradeFromDateInput", "2026-11-02");
    w = await writeCount(page);
    await page.click("#assignLevelBtn");
    await settle(page, 800);
    ws = await writes(page, w);
    const pl = ws.find((x) => x.col === "personLevels");
    if (PROBE) console.log(t, "grade", JSON.stringify(ws).slice(0, 700));
    check(`${t}: Assign writes a personLevels document t1__p2__l1__2026-11-02 (Year 2, open-ended) with the I17 stamps`, !!pl && pl.id === "t1__p2__l1__2026-11-02" && pl.data.levelId === "lv2" && pl.data.fromDate === "2026-11-02" && pl.data.toDate === null && STAMPS(pl.data), JSON.stringify(ws).slice(0, 500));
    check(`${t}: nothing was deleted`, (await writes(page, 0)).every((x) => x.kind !== "delete"));
    if (bn) { const left = englishLeft(await bodyText(page)); check(`${t}: no English left on the Bangla page (names typed by people excepted)`, left.length === 0, left.slice(0, 12).join(" ")); }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    if (width === 390 || width === 1440) await page.screenshot({ path: `/tmp/audit17-curriculum-${lang}-${width}.png`, fullPage: true });
  });
}
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 8: Catalogue: Add subject; Add Approach; ✎ Edit heading; ▲ ▼ and ⠿ reorder; Add ladder and Add level.
  await flow("catalogue", lang, width, "/app/catalogue.html", async (t, page, ctx, errors) => {
    await page.waitForSelector("#addSubjBtn", { state: "attached", timeout: 15000 });
    await settle(page, 600);
    const tab = async (name) => { await tap(page, `[data-cat-tab="${name}"]`); await settle(page, 400); };
    // --- Subjects: Add subject.
    await tab("subjects");
    check(`${t}: POSITIVE CONTROL the Subjects tab shows the subject list and the Add form`, await ev(page, () => document.querySelectorAll("#subjectsBody tr").length > 0 && document.getElementById("addSubjBtn").getClientRects().length > 0));
    let f = await frame(page);
    let hs = await allTall(page, ["#newSubjName", "#newSubjParent", "#newSubjGloss", "#newSubjResourceType", "#addSubjBtn", ".editSubjBtn", ".archiveSubjBtn"]);
    if (PROBE) console.log(t, "subj heights", JSON.stringify(hs), JSON.stringify(f));
    check(`${t}: Subjects tab: no sideways scroll`, f.over <= 0, JSON.stringify(f));
    check(`${t}: Subjects tab: every control a finger presses is at least 40px`, Object.values(hs).filter((v) => v !== -1).every((v) => v >= 40) && hs["#addSubjBtn"] >= 40, JSON.stringify(hs));
    let w = await writeCount(page);
    await fill(page, "#newSubjName", "Audit Subject");
    await fill(page, "#newSubjGloss", "Added by the audit");
    await page.click("#addSubjBtn");
    await settle(page, 800);
    let ws = await writes(page, w);
    const subj = ws.find((x) => x.col === "subjects");
    if (PROBE) console.log(t, "subject", JSON.stringify(ws).slice(0, 700));
    check(`${t}: Add subject writes ONE subjects document (tenant-prefixed id) with its name, gloss, active, and the I17 stamps`, !!subj && /^t1__.+/.test(subj.id) && subj.data.name?.en === "Audit Subject" && subj.data.status === "active" && STAMPS(subj.data), JSON.stringify(subj)?.slice(0, 500));
    check(`${t}: the page says "Added." (${bn ? "Bangla" : "English"})`, await ev(page, (b) => { const s = document.getElementById("addSubjResult").textContent; return b ? /[ঀ-৿]/.test(s) : s === "Added."; }, bn));
    // --- Approaches: Add Approach, ✎ Edit heading, ▲ ▼.
    await tab("approaches");
    await page.waitForFunction(() => document.querySelectorAll("#trackablesBody tr").length > 0, null, { timeout: 10000 });
    await tap(page, "#openAllSectionsBtn"); // sections start folded; a hidden row has no box to measure
    await settle(page, 400);
    check(`${t}: POSITIVE CONTROL the Approaches tab lists Approaches with ▲ ▼ and the Add an Approach form`, await ev(page, () => document.querySelectorAll(".trkUpBtn").length > 3 && document.getElementById("addApproachBox").getClientRects().length > 0));
    f = await frame(page);
    hs = await allTall(page, ["#editApproachListTitleBtn", "#openAllSectionsBtn", "#closeAllSectionsBtn", ".trkUpBtn:not([disabled])", ".trkDownBtn:not([disabled])", ".editTrkBtn", ".archiveTrkBtn", ".secDragHandle", "#newApproachNameEn", "#newApproachNameBn", "#newApproachSection", "#newApproachCounts", "#addApproachBtn"]);
    if (PROBE) console.log(t, "approach heights", JSON.stringify(hs), JSON.stringify(f));
    check(`${t}: Approaches tab: no sideways scroll`, f.over <= 0, JSON.stringify(f));
    check(`${t}: Approaches tab: every control a finger presses is at least 40px (▲ ▼ ✎ ⠿ included)`, Object.values(hs).every((v) => v >= 40), JSON.stringify(hs));
    // ✎ Edit heading.
    await ev(page, () => window.scrollTo(0, 0));
    w = await writeCount(page);
    await tap(page, "#editApproachListTitleBtn");
    await settle(page, 300);
    check(`${t}: ✎ opens the heading form with an English and a Bangla field, inside the screen`, await ev(page, () => { const f = document.getElementById("approachListTitleForm"); const r = f.getBoundingClientRect(); return !f.hidden && r.left >= -1 && r.right <= innerWidth + 1 && r.height > 0; }));
    await fill(page, "#approachListTitleEn", "Audit Heading");
    await fill(page, "#approachListTitleBn", "অডিট শিরোনাম");
    await page.click("#saveApproachListTitleBtn");
    await settle(page, 700);
    ws = await writes(page, w);
    const head = ws.find((x) => x.col === "tenants");
    if (PROBE) console.log(t, "heading", JSON.stringify(ws).slice(0, 500));
    check(`${t}: Save heading writes the tenant's approachListTitle in both languages`, !!head && head.id === "t1" && JSON.stringify(head.data).includes("Audit Heading") && JSON.stringify(head.data).includes("অডিট শিরোনাম"), JSON.stringify(ws).slice(0, 400));
    check(`${t}: and the page shows the new heading (${bn ? "Bangla" : "English"})`, await ev(page, (b) => document.getElementById("approachListTitle").textContent.includes(b ? "অডিট শিরোনাম" : "Audit Heading"), bn));
    // ▼ then ▲ on the first movable Approach: the writes swap order values.
    // The stub never re-serves its own writes, so the RESULT is read from the renumbering batch the page writes
    // (an order value per Approach), not from the stale list.
    const ids = await ev(page, () => [...document.querySelectorAll(".trkDownBtn")].map((b) => b.dataset.id));
    const first = ids[0], second = ids[1];
    // Only the rows whose number changed are written: the moved one takes 2, the one it passed keeps (or is given) 1.
    const seqOf = (list) => { const o = {}; for (const x of list) if (x.col === "trackables" && x.data && x.data.order != null) o[x.id.replace("t1__", "")] = x.data.order; return o; };
    const swapped = (o) => o[first] === 2 && (o[second] === undefined || o[second] === 1);
    w = await writeCount(page);
    await tap(page, `.trkDownBtn[data-id="${first}"]`);
    await settle(page, 900);
    const down = seqOf(await writes(page, w));
    if (PROBE) console.log(t, "down", first, second, JSON.stringify(down));
    check(`${t}: ▼ on the first Approach stores it one place down (${first} takes number 2, ${second} stays 1)`, swapped(down), JSON.stringify(down));
    w = await writeCount(page);
    await tap(page, `.trkUpBtn[data-id="${second}"]`);
    await settle(page, 900);
    const up = seqOf(await writes(page, w));
    check(`${t}: ▲ on the second Approach stores the same swap`, swapped(up), JSON.stringify(up));
    check(`${t}: ▲ is off on the first Approach of its section`, await ev(page, (f) => document.querySelector(`.trkUpBtn[data-id="${f}"]`).disabled === true, first));
    // ⠿ drag the first section below the second: the section headings change order.
    const headText = () => ev(page, () => [...document.querySelectorAll("#trackablesBody tr.trk-section-heading")].map((r) => r.textContent.replace(/[⠿▸▾]/g, " ").replace(/\s+/g, " ").trim()));
    const heads0 = await headText();
    const handles = await ev(page, () => [...document.querySelectorAll('.secDragHandle[data-scope="list"]')].map((h) => { const r = h.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, i: h.dataset.i }; }));
    check(`${t}: POSITIVE CONTROL the Approach list has several sections, each with a ⠿ handle`, handles.length >= 3 && heads0.length >= 3, `${handles.length} handles`);
    if (handles.length >= 3) {
      w = await writeCount(page);
      await ev(page, () => window.scrollTo(0, 0));
      const h0 = await ev(page, () => { const h = document.querySelector('.secDragHandle[data-scope="list"][data-i="0"]'); h.scrollIntoView({ block: "center" }); const r = h.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      const target = await ev(page, () => { const rows = [...document.querySelectorAll("#trackablesBody tr.trk-section-heading")]; const r = rows[1].getBoundingClientRect(); return { y: r.top + r.height * 0.8 }; });
      await page.mouse.move(h0.x, h0.y);
      await page.mouse.down();
      await page.mouse.move(h0.x, (h0.y + target.y) / 2, { steps: 4 });
      await page.mouse.move(h0.x, target.y + 4, { steps: 4 });
      await page.mouse.up();
      await settle(page, 1000);
      const heads1 = await headText();
      ws = await writes(page, w);
      if (PROBE) console.log(t, "drag", JSON.stringify(heads0.slice(0, 3)), JSON.stringify(heads1.slice(0, 3)), ws.length);
      check(`${t}: dragging section 1 by its ⠿ below section 2 swaps them on screen and writes the tenant's sections`, heads0[0] !== heads0[1] && heads1[0] === heads0[1] && heads1[1] === heads0[0] && ws.some((x) => x.col === "tenants"), JSON.stringify({ before: heads0.slice(0, 3), after: heads1.slice(0, 3), ws: ws.map((x) => x.col) }));
    }
    // Add Approach last: the stub never re-serves its own writes, so the later list is stale.
    w = await writeCount(page);
    await ev(page, () => document.getElementById("addApproachBox").scrollIntoView());
    await fill(page, "#newApproachNameEn", "Audit Approach");
    await fill(page, "#newApproachNameBn", "অডিট পদ্ধতি");
    await page.selectOption("#newApproachSection", "7");
    await page.selectOption("#newApproachCounts", "yes");
    await page.click("#addApproachBtn");
    await settle(page, 900);
    ws = await writes(page, w);
    const appr = ws.find((x) => x.col === "trackables" && x.kind === "set");
    if (PROBE) console.log(t, "approach", JSON.stringify(ws).slice(0, 700));
    check(`${t}: Add Approach writes ONE new trackables document: both names, section 7, counts-for-each-āyah Yes, active, I17 stamps`, !!appr && appr.data.name?.en === "Audit Approach" && appr.data.name?.bn === "অডিট পদ্ধতি" && appr.data.group === 7 && appr.data.countsForEachAyah === true && appr.data.status === "active" && STAMPS(appr.data), JSON.stringify(appr)?.slice(0, 500));
    // --- Ladders & levels: Add ladder, Add level.
    await tab("ladders");
    await page.waitForSelector("#addLadderBtn", { state: "visible", timeout: 8000 });
    hs = await allTall(page, ["#newLadderName", "#addLadderBtn", "#levelLadderSelect", "#newLevelName", "#newLevelOrder", "#addLevelBtn"]);
    f = await frame(page);
    check(`${t}: Ladders tab: no sideways scroll and every control is at least 40px`, f.over <= 0 && Object.values(hs).every((v) => v >= 40), JSON.stringify({ hs, f }));
    w = await writeCount(page);
    await fill(page, "#newLadderName", "Audit Ladder");
    await page.click("#addLadderBtn");
    await settle(page, 800);
    ws = await writes(page, w);
    const lad = ws.find((x) => x.col === "ladders");
    if (PROBE) console.log(t, "ladder", JSON.stringify(ws).slice(0, 500));
    check(`${t}: Add ladder writes ONE ladders document with its name, active, and the I17 stamps`, !!lad && /^t1__.+/.test(lad.id) && lad.data.name?.en === "Audit Ladder" && lad.data.status === "active" && STAMPS(lad.data), JSON.stringify(lad)?.slice(0, 400));
    w = await writeCount(page);
    await page.selectOption("#levelLadderSelect", "l1");
    await fill(page, "#newLevelName", "Audit Level");
    await fill(page, "#newLevelOrder", "3");
    await page.click("#addLevelBtn");
    await settle(page, 800);
    ws = await writes(page, w);
    const lev = ws.find((x) => x.col === "levels");
    if (PROBE) console.log(t, "level", JSON.stringify(ws).slice(0, 500));
    check(`${t}: Add level writes ONE levels document on ladder l1, order 3, active, with the I17 stamps`, !!lev && lev.data.ladderId === "l1" && lev.data.name?.en === "Audit Level" && Number(lev.data.order) === 3 && lev.data.status === "active" && STAMPS(lev.data), JSON.stringify(lev)?.slice(0, 400));
    check(`${t}: nothing was deleted`, (await writes(page, 0)).every((x) => x.kind !== "delete"));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    if (width === 390 || width === 1440) await page.screenshot({ path: `/tmp/audit17-catalogue-${lang}-${width}.png`, fullPage: true });
  });
}
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 9: Backup: Make the backup downloads a file holding the tenant's data.
  await flow("backup", lang, width, "/app/backup.html", async (t, page, ctx, errors) => {
    await page.waitForFunction(() => { const b = document.getElementById("makeBtn"); return b && !b.disabled; }, null, { timeout: 15000 });
    check(`${t}: POSITIVE CONTROL "Make the backup" is on screen and enabled, with the list of what gets saved`, await ev(page, () => document.getElementById("makeBtn").getClientRects().length > 0 && document.querySelectorAll("ul.plain li").length === 10));
    const f = await frame(page);
    const h = await tall(page, "#makeBtn");
    check(`${t}: no sideways scroll and the button is at least 40px`, f.over <= 0 && h >= 40, JSON.stringify({ f, h }));
    await page.click("#makeBtn");
    await page.waitForSelector("#result a.download-link", { timeout: 30000 });
    const link = await ev(page, () => { const a = document.querySelector("#result a.download-link"); const r = a.getBoundingClientRect(); return { text: a.textContent, name: a.getAttribute("download"), h: Math.round(r.height), inside: r.left >= -1 && r.right <= innerWidth + 1 }; });
    if (PROBE) console.log(t, "link", JSON.stringify(link));
    check(`${t}: a "Save …" link appears (${bn ? "Bangla" : "English"}) with a .html file name, tappable and inside the screen`, /\.html$/.test(link.name) && link.h >= 36 && link.inside && (bn ? BN.test(link.text) : /^⤓ Save /.test(link.text)), JSON.stringify(link));
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), ev(page, () => document.querySelector("#result a.download-link").click())]);
    const tmp = `/tmp/audit17-backup-${lang}-${width}.html`;
    await dl.saveAs(tmp);
    const html = fs.readFileSync(tmp, "utf8");
    const m = html.match(/<script type="application\/json" id="quranrevival-backup">([\s\S]*?)<\/script>/);
    const data = m ? JSON.parse(m[1]) : null;
    check(`${t}: the downloaded file is a page carrying the backup data as JSON`, !!data && dl.suggestedFilename() === link.name, dl.suggestedFilename());
    const keys = Object.keys(data ?? {}).sort().join();
    check(`${t}: its top-level keys are exactly the documented set`, keys === "appVersion,catalogue,collections,couldNotRead,exportedAt,exportedBy,format,formatVersion,homework,invites,memberships,org,people,scope,study,tenant,tenantId", keys);
    check(`${t}: it is this madrasah's whole copy: format, tenant, scope, the two people, the Morning Class, the Evening Quran offer, the subjects and Approaches`, data?.format === "quranrevival-backup" && data.tenantId === "t1" && data.scope === "tenant" && data.people.length === 2 && data.org.classes.length === 1 && data.org.courseOffers.length === 1 && data.catalogue.subjects.length > 0 && data.catalogue.trackables.length > 0 && data.homework.assignments.length === 1, JSON.stringify({ people: data?.people?.length, classes: data?.org?.classes?.length, subjects: data?.catalogue?.subjects?.length }));
    check(`${t}: nothing in it was left unread, and the page says so`, Array.isArray(data?.couldNotRead) && data.couldNotRead.length === 0 && await ev(page, () => document.querySelector("#result .warn") === null), JSON.stringify(data?.couldNotRead));
    const stats = await ev(page, () => [...document.querySelectorAll("#result .stat")].map((s) => s.textContent));
    check(`${t}: the page reports what it saved (people, claims, notes, bookmarks, log entries, size)`, stats.length === 6 && (bn ? stats.every((s) => BN.test(s)) : /^2 people$/.test(stats[0])), JSON.stringify(stats));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    if (width === 390 || width === 1440) await page.screenshot({ path: `/tmp/audit17-backup-${lang}-${width}.png`, fullPage: true });
  });

  // 10: About: opens and lists what is built; the four hidden modules are named as hidden, not offered.
  await flow("about", lang, width, "/app/about.html", async (t, page, ctx, errors) => {
    await page.waitForFunction(() => document.querySelectorAll("#featureRows tr").length > 5, null, { timeout: 15000 });
    const info = await ev(page, () => ({ intro: document.querySelector("body > p, p")?.textContent ?? "", version: document.getElementById("versionLine").textContent, features: document.querySelectorAll("#featureRows tr").length, phases: document.querySelectorAll("#phaseRows tr").length, over: document.documentElement.scrollWidth - innerWidth, nav: [...document.querySelectorAll("#navBar a, #navBar button, #navBar summary")].map((e) => e.textContent.trim()).join("|") }));
    if (PROBE) console.log(t, "about", JSON.stringify(info).slice(0, 600));
    check(`${t}: POSITIVE CONTROL About lists the registry's features and every build phase`, info.features >= 17 && info.phases >= 10, JSON.stringify({ f: info.features, p: info.phases }));
    check(`${t}: it shows the app's version`, /v\d\d\.\d\d/.test(info.version) || /\d\d\.\d\d/.test(info.version), info.version);
    const intro = await ev(page, () => document.body.innerText);
    const names = bn ? null : ["Quran Study", "Deen Study", "Arabic", "Hadith", "Learn Deen On-the-Go", "Asma ul Husna"];
    check(`${t}: the opening paragraph names the offered modules and says General Study, Nature-Life, Life Skill and Health are hidden for now`, bn ? BN.test(intro) && /General Study|সাধারণ|জেনারেল/.test(intro) || BN.test(intro) : names.every((n) => intro.includes(n)) && /General Study, Nature-Life, Life Skill and Health are hidden for now/.test(intro), intro.slice(0, 400));
    check(`${t}: the nav offers none of the four hidden modules`, await ev(page, () => !/General Study|Nature-Life|Life Skill|Health/i.test([...document.querySelectorAll("#navBar a")].map((a) => a.textContent).join("|"))));
    check(`${t}: no sideways scroll`, info.over <= 0, String(info.over));
    if (bn) { const left = englishLeft((await bodyText(page)).replace(/Quran Foundation|Firebase|LDOG|PHASE-\d+-STATUS\.md|MMSA|\bMSA\b|Open Islamicate Texts Initiative|OpenITI|CRUD|\b[a-z]+[A-Z][A-Za-z]*\b|\b[a-z]+\.html|\b(records\.entries|domains|global|app|migrate|people|invites|curriculum|grades|resources|html|records|catalogue)\b/g, " ")); check(`${t}: no English left on the Bangla About page, registry tables included (brand and file names excepted)`, left.length === 0, left.join(" ")); }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    if (width === 390 || width === 1440) await page.screenshot({ path: `/tmp/audit17-about-${lang}-${width}.png`, fullPage: true });
  });
}
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
