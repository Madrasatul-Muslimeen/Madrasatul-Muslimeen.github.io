// Owner, 12 Oct 2026 (PCF quick task, "Urgent", a phone photo of the Home menu signed in as a STUDENT):
// `failed at "load context data": permission-denied Missing or insufficient permissions`.
// Every page read the roster with `tenantPeople where tenantId == T`. The real Rules refuse that whole query for
// anyone but owner/prime (Rules are not filters; tools/firestore-emulator/roster-access.rules.test.mjs proves it).
// This suite serves a stub that behaves the same way -- signed in as the student p2, the tenant-wide query on
// tenantPeople throws permission-denied -- and opens the pages that read the roster at start-up.
//
// Run from the repository root, with serve.js on :8080. Mutation: put the plain query back into
// app/js/roster-access.js (return getDocs(...) with no fallback) and every "no failed at" case fails.
import { chromium, newContext, openPage } from "./harness.mjs";
import { stubFor } from "./firebase-stub.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch();

function studentStub(base, { teacherLinks = false } = {}) {
  let s = base;
  // The signed-in uid is the student p2, not the owner p1.
  const ownerMember = 'personId: "p1", roles: ["owner", "prime"] },\n  ],\n  tenants:';
  if (!s.includes(ownerMember)) throw new Error("stub shape changed: owner tenantMemberUids row not found");
  s = s.replace(ownerMember, 'personId: "p2", roles: ' + (teacherLinks ? '["student", "teacher"]' : '["student"]') + ' },\n  ],\n  tenants:');
  const p2 = '{ _id: "p2", tenantId: TENANT_ID, personId: "p2",';
  if (!s.includes(p2)) throw new Error("stub shape changed: p2 not found");
  s = s.replace(p2, p2 + ' authUid: UID,');
  if (teacherLinks) {
    if (!s.includes("teacherStudentLinks: [],")) throw new Error("stub shape changed: teacherStudentLinks not found");
    s = s.replace("teacherStudentLinks: [],", 'teacherStudentLinks: [ { _id: TENANT_ID + "__p2__p1", tenantId: TENANT_ID, teacherPersonId: "p2", studentPersonId: "p1", active: true } ],');
  }
  // Rules-like refusal: a tenantPeople query proven only by tenantId is refused whole.
  const head = 'export async function getDocs(q) {\n';
  if (!s.includes(head)) throw new Error("stub shape changed: getDocs not found");
  s = s.replace(head, head + '  { const f = (q.__clauses || []).filter(function (c) { return c && c.field; });\n'
    + '    if (q.__col === "tenantPeople" && f.length === 1 && f[0].field === "tenantId") {\n'
    + '      try { window.__rosterDenied = (window.__rosterDenied || 0) + 1; } catch (e) {}\n'
    + '      var e = new Error("Missing or insufficient permissions."); e.code = "permission-denied"; throw e; } }\n');
  return s;
}

async function open(path, opts = {}) {
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const body = studentStub(stubFor({ banner: true }), opts);
  await ctx.route("https://www.gstatic.com/firebasejs/**", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
  const { page } = await openPage(ctx, path);
  await page.waitForTimeout(3000);
  return { ctx, page };
}
// textContent, not innerText: the error is written inside the Home menu, which is closed (innerText skips it).
const failedAt = (page) => page.evaluate(() => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) =>
    n.parentElement.closest("script, style, template") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  for (let n; (n = w.nextNode());) { const m = n.textContent.match(/.{0,40}(failed at|insufficient permissions|permission-denied).{0,60}/i); if (m) return m[0]; }
  return null;
});
const options = (page, sel) => page.evaluate((sel) => { const e = document.querySelector(sel); return e ? [...e.options].map((o) => o.value) : null; }, sel);

// 1. The Qur'an page, the Owner's screenshot.
{ const { ctx, page } = await open("/app/quranrevival.html");
  const denied = await page.evaluate(() => window.__rosterDenied || 0);
  check("quranrevival: the stub really refused the tenant-wide roster query (positive control)", denied >= 1, `denied=${denied}`);
  const f = await failedAt(page);
  check('quranrevival: no permission error anywhere on the page', f === null, f);
  const opts = await options(page, "#personSelect");
  check("quranrevival: the person picker holds the student, and only the student", JSON.stringify(opts) === '["p2"]', JSON.stringify(opts));
  const appShown = await page.evaluate(() => getComputedStyle(document.getElementById("app")).display !== "none");
  check("quranrevival: the app is on screen", appShown);
  await ctx.close(); }

// 2. Every other page whose start-up reads the roster.
for (const path of ["/app/records.html", "/app/notes.html", "/app/journey-map.html", "/app/bookmarks.html", "/app/monitor.html",
  "/app/homework.html", "/app/dawah.html", "/app/hadith-collections.html", "/app/curriculum.html"]) {
  const { ctx, page } = await open(path);
  const denied = await page.evaluate(() => window.__rosterDenied || 0);
  check(`${path}: the page did read the roster, and the stub refused the tenant-wide query (positive control)`, denied >= 1, `denied=${denied}`);
  const f = await failedAt(page);
  check(`${path}: no permission error anywhere on the page`, f === null, f);
  await ctx.close();
}

// 3. A teacher is refused the same query; their actively linked student is read by id and joins the picker.
{ const { ctx, page } = await open("/app/quranrevival.html", { teacherLinks: true });
  const f = await failedAt(page);
  check('teacher: no permission error anywhere on the page', f === null, f);
  const opts = await options(page, "#personSelect");
  check("teacher: the picker holds themself and their linked student", JSON.stringify((opts || []).slice().sort()) === '["p1","p2"]', JSON.stringify(opts));
  await ctx.close(); }

// 4. PCF J15 (14 Oct 2026): the Owner published the guardian rule, so a guardian's query
// `tenantId == T && managedByPersonId == me` is allowed and their children join the picker. The stub refuses the
// tenant-wide query as before; `refuseChildren` also refuses the children query, as the Rules did before 12 Oct.
function guardianStub(base, { refuseChildren }) {
  let s = base;
  const ownerMember = 'personId: "p1", roles: ["owner", "prime"] },\n  ],\n  tenants:';
  if (!s.includes(ownerMember)) throw new Error("stub shape changed: owner tenantMemberUids row not found");
  s = s.replace(ownerMember, 'personId: "p1", roles: ["guardian"] },\n  ],\n  tenants:');
  const p1 = '{ _id: "p1", tenantId: TENANT_ID, personId: "p1",';
  if (!s.includes(p1)) throw new Error("stub shape changed: p1 not found");
  s = s.replace(p1, p1 + ' authUid: UID,');
  const p1roles = 'name: lang("Ahsan", "আহসান"), roles: ["owner", "prime"] }';
  if (!s.includes(p1roles)) throw new Error("stub shape changed: p1 roles not found");
  s = s.replace(p1roles, 'name: lang("Ahsan", "আহসান"), roles: ["guardian"] }');
  const head = 'export async function getDocs(q) {\n';
  return s.replace(head, head + '  { const f = (q.__clauses || []).filter(function (c) { return c && c.field; });\n'
    + '    var refuse = q.__col === "tenantPeople" && ((f.length === 1 && f[0].field === "tenantId")'
    + (refuseChildren ? ' || f.some(function (c) { return c.field === "managedByPersonId"; })' : '') + ');\n'
    + '    if (q.__col === "tenantPeople" && f.some(function (c) { return c.field === "managedByPersonId"; })) { try { window.__childrenAsked = (window.__childrenAsked || 0) + 1; } catch (e) {} }\n'
    + '    if (refuse) { var e = new Error("Missing or insufficient permissions."); e.code = "permission-denied"; throw e; } }\n');
}
for (const refuseChildren of [false, true]) {
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const body = guardianStub(stubFor({ banner: true }), { refuseChildren });
  await ctx.route("https://www.gstatic.com/firebasejs/**", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(3000);
  const asked = await page.evaluate(() => window.__childrenAsked || 0);
  const tag = refuseChildren ? "guardian, children query refused (the Rules before 12 Oct)" : "guardian, published Rules";
  check(`${tag}: the app asked for the guardian's children by managedByPersonId (positive control)`, asked >= 1, `asked=${asked}`);
  const f = await failedAt(page);
  check(`${tag}: no permission error anywhere on the page`, f === null, f);
  const opts = await options(page, "#personSelect");
  const want = refuseChildren ? '["p1"]' : '["p1","p2"]';
  check(`${tag}: the picker holds ${refuseChildren ? "only the guardian" : "the guardian and their child"}`, JSON.stringify((opts || []).slice().sort()) === want, JSON.stringify(opts));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
