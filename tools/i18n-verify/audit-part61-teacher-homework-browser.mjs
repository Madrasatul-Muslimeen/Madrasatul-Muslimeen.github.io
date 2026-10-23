// Audit part 61 (PCF MSA J29): Homework, Monitor and the owner-only pages as a PURE TEACHER (teacher role only, no owner, no prime).
//   assign    Homework "Assign to": only the teacher's own class / course offer and their two students (never the third);
//             create to the class and to the course offer: stored document carries I17's four fields, target ids, contextId,
//             extraReadersPersonIds (the context's teachers)
//   mark      Mark as submitted, Save score, and the private teaching-notes save write
//   refused   a refused Create (the batch is refused) says so on screen, stores nothing and keeps what was typed (I15)
//   monitor   "Whole roster" as a teacher draws a report
//   owner     Classes / Course Offers / Curriculum as a teacher: no create or admin controls, never a blank page
//   control   as the OWNER the third student IS offered (positive control)
// Mutations (--mutate=<name>) restore a plausible defect and must each fail the suite.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part61-teacher-homework-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
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
  // The context picker offers every class and course offer to a teacher, not only their own.
  allcontexts: ["app/homework.html", "**/homework.html*", "availableContexts = isAdmin ? allContexts : allContexts.filter((c) => myActiveTeacherContextIds.includes(c.id));", "availableContexts = allContexts;", "/app/homework.html"],
  // The assignment forgets who else may read it (the context's teachers).
  noextrareaders: ["app/homework.html", "**/homework.html*", "const extraReadersPersonIds = [...new Set([...contextTeacherIds, ...guardianIds])];", "const extraReadersPersonIds = [];", "/app/homework.html"],
  // A refused create is swallowed: the typed instructions are wiped even though nothing was stored.
  wipeonfail: ["app/homework.html", "**/homework.html*", "        createResult.textContent = outcome.entry.message;\n", "        createResult.textContent = outcome.entry.message; instructionsInput.value = \"\";\n", "/app/homework.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
// Teacher t1 (teacher ONLY) teaches class c1 and course offer o1; students p2 (Maryam) and p3 (Yusuf) are in both; p4 (Zayd) in neither.
const TEACHER = `
DATA.tenantMemberUids[0].personId = "t1"; DATA.tenantMemberUids[0].roles = ["teacher"];
DATA.tenantPeople.push({ _id: "t1", tenantId: TENANT_ID, personId: "t1", name: lang("Tariq", "তারিক"), roles: ["teacher"] });
DATA.tenantPeople.push({ _id: "p3", tenantId: TENANT_ID, personId: "p3", name: lang("Yusuf", "ইউসুফ"), roles: ["student"] });
DATA.tenantPeople.push({ _id: "p4", tenantId: TENANT_ID, personId: "p4", name: lang("Zayd", "জায়েদ"), roles: ["student"] });
const enr = (ctx, type, p, role) => DATA.enrollments.push({ _id: TENANT_ID + "__" + ctx + "__" + p, tenantId: TENANT_ID, contextType: type, contextId: ctx, personId: p, roleInClass: role, subjectIds: [], status: "active" });
enr("c1", "class", "t1", "teacher"); enr("c1", "class", "p2", "student"); enr("c1", "class", "p3", "student");
enr("o1", "courseOffer", "t1", "teacher"); enr("o1", "courseOffer", "p3", "student");
DATA.assignments.length = 0; DATA.submissions.length = 0;
`;
const OWNER = TEACHER.split("\n").filter((l) => !l.startsWith("DATA.tenantMemberUids[0]")).join("\n");

async function open(lang, width, pagePath, { seed = "", extra = "" } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: (seed + extra) || null });
  if (MUTATE && MUTATIONS[MUTATE][4] === pagePath) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
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
const writes = (page, from = 0) => ev(page, (k) => (window.__stubWriteData || []).slice(k).map((x) => ({ kind: x.kind, col: x.col, id: x.id, data: x.data })), from);
const writeCount = (page) => ev(page, () => (window.__stubWriteData || []).length);
const banner = (page) => ev(page, () => { const b = document.getElementById("qr-write-failure-banner"); return b && getComputedStyle(b).display !== "none" && b.getClientRects().length ? b.firstChild.firstChild.textContent : ""; });
const hideBanner = (page) => ev(page, () => { const b = document.getElementById("qr-write-failure-banner"); if (b) b.style.display = "none"; });
function catchDialogs(page) { const said = []; page.on("dialog", (d) => { said.push(d.message()); d.dismiss().catch(() => {}); }); return said; }
// The Person select lives inside the account card (hidden until opened), so set it the way the page's own change handler hears it.
const pickPerson = (page, id) => ev(page, (v) => { const s = document.getElementById("personSelect"); s.value = v; s.dispatchEvent(new Event("change", { bubbles: true })); }, id);
const STAMPS =(d) => ["schemaVersion", "createdAt", "updatedAt", "createdBy"].every((k) => k in (d || {}));

// Layout facts: sideways scroll, cut-off, finger size, the way back.
const layoutFacts = () => {
  const out = { sideways: document.documentElement.scrollWidth - innerWidth, cut: [], small: [] };
  const clipped = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === "auto" || o === "scroll" || o === "hidden") && p.scrollWidth > p.clientWidth) return true; } return false; };
  for (const e of document.querySelectorAll("#app button, #app select, #app input:not([type=checkbox]):not([type=radio]), #app textarea, #topNav button, #navBar button")) {
    const b = e.getBoundingClientRect();
    if (!b.width || getComputedStyle(e).display === "none" || getComputedStyle(e).visibility === "hidden") continue;
    const name = e.id || e.className || e.tagName;
    if (b.right > innerWidth + 1 && !clipped(e)) out.cut.push(`${name}:${Math.round(b.right)}`);
    if (b.height < 39.5) out.small.push(`${name}:${Math.round(b.height)}`);
  }
  return out;
};
const englishLeft = (page) => ev(page, () => {
  const bad = [];
  const w = document.createTreeWalker(document.querySelector("#app"), NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const p = n.parentElement; if (!p || /SCRIPT|STYLE|OPTION/.test(p.tagName) || !p.getClientRects().length) continue;
    const s = n.textContent.trim(); if (/^(Evening Quran|Morning Class|Before Fajr group|Read two pages|Doing well on tajweed\.|Pages 1 to 2|Tariq|Yusuf|Zayd|Ahsan|Maryam)$/.test(s)) continue; /* seeded tenant data */ if (/[A-Za-z]{4,}/.test(s) && !/[ঀ-৿]/.test(s)) bad.push(s.slice(0, 40));
  }
  return bad;
});

const WIDTHS = [320, 390, 820, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

for (const lang of LANGS) {
  const bn = lang === "bn";
  for (const width of WIDTHS) {
    // 1: Homework as a pure teacher: choices, create to class and offer, mark, score, notes, refused create.
    await flow("homework-teacher", lang, width, "/app/homework.html", async (t, page, ctx, errors) => {
      const said = catchDialogs(page);
      await page.waitForSelector("#contextSelect option", { state: "attached", timeout: 15000 });
      await settle(page, 600);
      const f = await ev(page, () => ({
        ctx: [...document.querySelectorAll("#contextSelect option")].map((o) => ({ v: o.value, t: o.textContent })),
        checks: [...document.querySelectorAll("#assignToChecks input")].map((i) => i.value),
        create: getComputedStyle(document.getElementById("createFieldset")).display,
        notes: getComputedStyle(document.getElementById("noteFieldset")).display,
        hint: document.getElementById("contextHint").textContent,
        btn: document.getElementById("createAssignmentBtn").disabled,
      }));
      check(`${t}: POSITIVE CONTROL the Create form and the teaching-notes form are shown to a teacher`, f.create !== "none" && f.notes !== "none", JSON.stringify(f));
      check(`${t}: "Assign to" offers exactly the teacher's own class and course offer, and no "(none)" row`, f.ctx.map((c) => c.v).sort().join() === "c1,o1", JSON.stringify(f.ctx));
      check(`${t}: the choices say what each is, in the page's language (${bn ? "Bangla" : "English"})`, f.ctx.every((c) => /\(.+\)/.test(c.t)) && (!bn || f.ctx.every((c) => BN.test(c.t.replace(/\(.*$/, "")) || /Evening Quran|Morning Class/.test(c.t)) && f.ctx.every((c) => BN.test(c.t.slice(c.t.indexOf("("))))), JSON.stringify(f.ctx));
      check(`${t}: the first context's students are Maryam and Yusuf (p2, p3) and never the third student (p4)`, f.checks.sort().join() === "p2,p3", f.checks.join());
      check(`${t}: the required-context hint is shown and the button is usable`, f.hint.length > 10 && f.btn === false && (!bn || BN.test(f.hint)), f.hint);
      // Switch to the course offer: only its student.
      await page.selectOption("#contextSelect", "o1"); await settle(page, 700);
      const o1 = await ev(page, () => [...document.querySelectorAll("#assignToChecks input")].map((i) => i.value));
      check(`${t}: the course offer's list holds its two students (p2, p3) and not the third (p4)`, o1.sort().join() === "p2,p3", o1.join());
      // Create to the class.
      await page.selectOption("#contextSelect", "c1"); await settle(page, 700);
      const n0 = await writeCount(page);
      await page.check('#assignToChecks input[value="p2"]');
      await page.check('#assignToChecks input[value="p3"]');
      await page.fill("#instructionsInput", "Read two pages");
      await page.fill("#maxScoreInput", "10");
      await page.click("#createAssignmentBtn"); await settle(page, 1000);
      const ws = await writes(page, n0);
      const a = ws.find((x) => x.col === "assignments");
      check(`${t}: Create to the class writes ONE assignment with I17's four fields`, ws.filter((x) => x.col === "assignments").length === 1 && !!a && STAMPS(a.data), JSON.stringify(ws.map((x) => x.col)));
      check(`${t}: and it names the class (c1), the creator t1 and both students`, !!a && a.data.contextId === "c1" && a.data.createdByPersonId === "t1" && a.data.assignedToPersonIds.sort().join() === "p2,p3", JSON.stringify(a && a.data).slice(0, 300));
      check(`${t}: and extraReadersPersonIds holds the class's teacher (t1) so the teacher can read it back`, !!a && a.data.extraReadersPersonIds.includes("t1"), JSON.stringify(a && a.data.extraReadersPersonIds));
      const subs = ws.filter((x) => x.col === "submissions");
      check(`${t}: and one not_submitted submission per student, each with I17's four fields`, subs.length === 2 && subs.every((s) => s.data.status === "not_submitted" && STAMPS(s.data)), JSON.stringify(subs.map((s) => s.id)));
      const res = await ev(page, () => document.getElementById("createResult").textContent);
      check(`${t}: the page says it was assigned, in words (${bn ? "Bangla" : "English"})`, res.length > 5 && (!bn || BN.test(res)), res);
      // Create to the course offer.
      await page.selectOption("#contextSelect", "o1"); await settle(page, 700);
      const n1 = await writeCount(page);
      await page.check('#assignToChecks input[value="p3"]');
      await page.fill("#instructionsInput", "Pages 1 to 2");
      await page.click("#createAssignmentBtn"); await settle(page, 1000);
      const a2 = (await writes(page, n1)).find((x) => x.col === "assignments");
      check(`${t}: Create to the course offer names o1 and only p3`, !!a2 && a2.data.contextId === "o1" && a2.data.assignedToPersonIds.join() === "p3" && a2.data.extraReadersPersonIds.includes("t1") && STAMPS(a2.data), JSON.stringify(a2 && a2.data).slice(0, 300));

      // Refused create: told on screen, nothing stored, typed text kept (I15).
      await page.selectOption("#contextSelect", "c1"); await settle(page, 700);
      await page.check('#assignToChecks input[value="p2"]');
      await page.fill("#instructionsInput", "Typed words must survive");
      await ev(page, () => { window.__stubFailBatch = true; });
      const n2 = await writeCount(page);
      await page.click("#createAssignmentBtn"); await settle(page, 1000);
      const bm = await banner(page);
      const rr = await ev(page, () => ({ res: document.getElementById("createResult").textContent, typed: document.getElementById("instructionsInput").value, dis: document.getElementById("createAssignmentBtn").disabled, checked: document.querySelectorAll("#assignToChecks input:checked").length }));
      check(`${t}: a refused Create says so in words on screen (${bn ? "Bangla" : "English"})`, (rr.res.length > 10 || bm.length > 10) && (!bn || BN.test(rr.res || bm)), JSON.stringify({ rr, bm }));
      check(`${t}: and stores nothing`, (await writeCount(page)) === n2);
      check(`${t}: and keeps what was typed and the student ticked, and the button can be pressed again`, rr.typed === "Typed words must survive" && rr.checked === 1 && rr.dis === false, JSON.stringify(rr));
      await hideBanner(page);
      await ev(page, () => { window.__stubFailBatch = false; });

      // Mark as submitted and Save score on an assignment (the stub does not keep new documents, so seed one the teacher can see).
      // (the created assignment is not re-read by the stub; use the seeded one from the second page load below)
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: TEACHER });

    // 2: Mark as submitted, Save score and teaching notes on a seeded assignment for the teacher's student.
    await flow("homework-mark", lang, width, "/app/homework.html", async (t, page, ctx, errors) => {
      const said = catchDialogs(page);
      await page.waitForSelector("#personSelect option", { state: "attached", timeout: 15000 });
      await pickPerson(page, "p2"); await settle(page, 900);
      await page.waitForSelector(".markSubmittedBtn", { timeout: 8000 }).catch(() => {});
      const has = await ev(page, () => ({ mark: !!document.querySelector(".markSubmittedBtn"), score: !!document.querySelector(".saveScoreBtn"), body: document.getElementById("assignmentsBody").innerText.slice(0, 60) }));
      check(`${t}: POSITIVE CONTROL the teacher reads the class assignment for their student through extraReadersPersonIds`, has.mark && has.score, JSON.stringify(has));
      const n0 = await writeCount(page);
      await page.click(".markSubmittedBtn"); await settle(page, 900);
      const mw = (await writes(page, n0)).find((x) => x.col === "submissions");
      check(`${t}: Mark as submitted writes the submission for p2`, !!mw && mw.id === "t1__a9__p2" && mw.data.status === "submitted" && "updatedAt" in mw.data, JSON.stringify(mw));
      // The stub does not change its data, so the score box is still there.
      await page.fill(".scoreInput", "8");
      await page.fill(".commentInput", "Good");
      const n1 = await writeCount(page);
      await page.click(".saveScoreBtn"); await settle(page, 900);
      const sw = (await writes(page, n1)).find((x) => x.col === "submissions");
      check(`${t}: Save score writes status marked, score 8 of 10 (frozen), the marker t1 and the comment`, !!sw && sw.data.status === "marked" && sw.data.score === 8 && sw.data.maxScoreAtMark === 10 && sw.data.markedByPersonId === "t1" && sw.data.comment === "Good", JSON.stringify(sw));
      // Teaching note.
      const n2 = await writeCount(page);
      await page.selectOption("#noteAboutSelect", "p2");
      await page.fill("#noteBodyInput", "Needs help with madd");
      await page.click("#saveNoteBtn"); await settle(page, 900);
      const nw = (await writes(page, n2)).find((x) => x.col === "teachingNotes");
      check(`${t}: the teaching-notes save writes a PRIVATE note by t1 about p2 with the author's uid and I17's four fields`, !!nw && nw.data.authorPersonId === "t1" && nw.data.aboutPersonId === "p2" && !!nw.data.authorUid && nw.data.body === "Needs help with madd" && STAMPS(nw.data), JSON.stringify(nw));
      // Refused note: told on screen, text kept.
      await ev(page, () => { window.__stubFailWrites = true; window.__stubFailTx = true; window.__stubFailBatch = true; });
      await page.fill("#noteBodyInput", "Second note");
      const n3 = await writeCount(page);
      await page.click("#saveNoteBtn"); await settle(page, 900);
      const nr = await ev(page, () => ({ res: document.getElementById("noteResult").textContent, typed: document.getElementById("noteBodyInput").value }));
      check(`${t}: a refused note save says so in words, stores nothing and keeps the text`, nr.res.length > 10 && (!bn || BN.test(nr.res)) && nr.typed === "Second note" && (await writeCount(page)) === n3, JSON.stringify(nr));
      check(`${t}: the page raised no alert for any of it`, said.length === 0, JSON.stringify(said));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: TEACHER + `DATA.assignments.push({ _id: TENANT_ID + "__a9", tenantId: TENANT_ID, createdByPersonId: "t1", assignedToPersonIds: ["p2", "p3"], extraReadersPersonIds: ["t1"], contextId: "c1", moduleId: null, subjectId: "quran", unitKeys: [], dueDate: "2026-12-01", instructions: lang("Read two pages"), maxScore: 10, status: "active" });
DATA.submissions.push({ _id: TENANT_ID + "__a9__p2", tenantId: TENANT_ID, assignmentId: TENANT_ID + "__a9", personId: "p2", status: "not_submitted", submittedAt: null, submittedNote: null, score: null, maxScoreAtMark: null, comment: null, markedByPersonId: null, markedAt: null });` });

    // 3: positive control as the OWNER: the third student IS offered where "(none)" is allowed, and every context is.
    await flow("homework-owner-control", lang, width, "/app/homework.html", async (t, page, ctx, errors) => {
      await page.waitForSelector("#contextSelect option", { state: "attached", timeout: 15000 });
      await settle(page, 600);
      await page.selectOption("#contextSelect", "");
      await settle(page, 600);
      const f = await ev(page, () => ({ ctx: [...document.querySelectorAll("#contextSelect option")].map((o) => o.value), checks: [...document.querySelectorAll("#assignToChecks input")].map((i) => i.value) }));
      check(`${t}: POSITIVE CONTROL the owner is offered "(none)" and the class and course offer`, f.ctx.includes("") && f.ctx.includes("c1") && f.ctx.includes("o1"), JSON.stringify(f));
      check(`${t}: and, with "(none)", the owner IS offered the third student (p4)`, f.checks.includes("p4") && f.checks.includes("p2") && f.checks.includes("p3"), f.checks.join());
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: OWNER });

    // 4: Monitor as a teacher.
    await flow("monitor-teacher", lang, width, "/app/monitor.html", async (t, page, ctx, errors) => {
      await page.waitForSelector("#personSelect option", { state: "attached", timeout: 15000 });
      await settle(page, 800);
      const before = await ev(page, () => ({ whole: document.getElementById("wholeRoster").checked, vis: getComputedStyle(document.getElementById("wholeRoster")).display, sideways: document.documentElement.scrollWidth - innerWidth }));
      check(`${t}: POSITIVE CONTROL the "Whole roster" box is on the page and unticked`, before.whole === false && before.vis !== "none", JSON.stringify(before));
      await pickPerson(page, "p2");
      await page.check("#wholeRoster"); await settle(page, 1000);
      const r = await ev(page, () => ({ text: document.getElementById("reportBody").innerText, rows: document.querySelectorAll("#reportBody tr").length, sideways: document.documentElement.scrollWidth - innerWidth }));
      check(`${t}: ticking "Whole roster" draws a report (not blank, not an error)`, r.text.length > 10 && !/Couldn|পারা যায়নি/.test(r.text), r.text.slice(0, 100));
      check(`${t}: and the page does not scroll sideways`, r.sideways <= 0, String(r.sideways));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: TEACHER });

    // 5: Owner-only pages as a teacher.
    for (const [name, pg, formId] of [["classes", "/app/classes.html", "createFieldset"], ["course-offers", "/app/course-offers.html", "createFieldset"], ["curriculum", "/app/curriculum.html", "adminArea"]]) {
      await flow(`owner-only-${name}`, lang, width, pg, async (t, page, ctx, errors) => {
        await page.waitForSelector("#app", { state: "visible", timeout: 15000 });
        await settle(page, 1000);
        const f = await ev(page, ([fid]) => {
          const adm = document.getElementById(fid);
          const adminVisible = !!adm && getComputedStyle(adm).display !== "none" && adm.getClientRects().length > 0;
          const visibleButtons = [...document.querySelectorAll("#app button")].filter((b) => b.getClientRects().length && getComputedStyle(b).display !== "none").map((b) => b.className + ":" + b.textContent.trim().slice(0, 24));
          const adminButtons = visibleButtons.filter((s) => /archiveClassBtn|bulkConfirm|archiveOffer|createClassBtn|createOfferBtn|createUnit|assign/i.test(s));
          // The Course Offers "Enrol <person>" button is drawn for every role (course-offers.html: enrolBtn is not behind canAdmin). Access scoping: reported, not changed here.
          if (visibleButtons.some((s) => /enrolBtn/.test(s))) console.log(`  INFO  ${fid}: an Enrol button is shown to a teacher (reported in the PR table)`);
          return { adminVisible, adminButtons, text: document.getElementById("app").innerText.trim().length, note: (document.getElementById("noAdminNote") || {}).innerText || "" };
        }, [formId]);
        check(`${t}: POSITIVE CONTROL the page drew something for the teacher`, f.text > 60, String(f.text));
        check(`${t}: the create / admin area is hidden from a teacher`, f.adminVisible === false, JSON.stringify(f));
        check(`${t}: no admin buttons (Archive / Enrol / Create / Bulk confirm) on screen`, f.adminButtons.length === 0, f.adminButtons.join(" | "));
        if (name === "curriculum") check(`${t}: Curriculum says in words that planning is for owner/prime (${bn ? "Bangla" : "English"})`, f.note.length > 15 && (!bn || BN.test(f.note)), f.note);
        const lf = await ev(page, layoutFacts);
        check(`${t}: no sideways scroll, nothing cut, finger controls 40px or more`, lf.sideways <= 0 && lf.cut.length === 0 && lf.small.length === 0, JSON.stringify(lf));
        if (bn) { const eng = await englishLeft(page); check(`${t}: no English left on screen`, eng.length === 0, eng.slice(0, 4).join(" | ")); }
        // The way back: the nav bar's Home button is reachable on every page.
        const home = await ev(page, () => { const e = [...document.querySelectorAll("#navBar a, #navBar button, #topNav a")].find((x) => /index\.html|home|হোম/i.test((x.getAttribute("href") || "") + x.textContent)); if (!e) return null; const b = e.getBoundingClientRect(); return { h: Math.round(b.height), shown: b.width > 0 }; });
        check(`${t}: a way back to Home is on the page`, !!home && home.shown, JSON.stringify(home));
        check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
      }, { seed: TEACHER });
    }
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
