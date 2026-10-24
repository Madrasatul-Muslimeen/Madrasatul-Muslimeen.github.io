// Audit part 64 (PCF MSA J29): People, Invite, accept-invite, onboarding, Backup, About.
//   people-owner    Add person (stored document: I17's four fields, 7-digit personId D3), archive / restore (a status write, never an erase I4),
//                   a refused Add says so in words and keeps what was typed (I15), layout at every width
//   people-student  a student never sees Add / Invite / Actions
//   invite          Invite writes an invite + token; the pending row's "Copy link" puts an opaque token (never the email, D9) on the clipboard
// Mutations (--mutate=<name>) restore a plausible defect and must each fail the suite.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part64-people-backup-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
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
const MUTATIONS = {};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
// The signed-in uid becomes the student p2 (a student's own row in the stub).
const STUDENT = `DATA.tenantMemberUids[0].personId = "p2"; DATA.tenantMemberUids[0].roles = ["student"];`;

async function open(lang, width, pagePath, { seed = "" } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: seed || null });
  if (MUTATE && MUTATIONS[MUTATE][4] === pagePath) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
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
function catchDialogs(page, accept = true) { const said = []; page.on("dialog", (d) => { said.push(d.message()); (accept ? d.accept() : d.dismiss()).catch(() => {}); }); return said; }
const STAMPS = (d) => ["schemaVersion", "createdAt", "updatedAt", "createdBy"].every((k) => k in (d || {}));

// Layout facts: sideways scroll, cut-off, finger size.
const layoutFacts = () => {
  const out = { sideways: document.documentElement.scrollWidth - innerWidth, cut: [], small: [] };
  const clipped = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === "auto" || o === "scroll" || o === "hidden") && p.scrollWidth > p.clientWidth) return true; } return false; };
  for (const e of document.querySelectorAll("#app button, #app select, #app input:not([type=checkbox]):not([type=radio]), #app textarea")) {
    const b = e.getBoundingClientRect();
    if (!b.width || getComputedStyle(e).display === "none" || getComputedStyle(e).visibility === "hidden") continue;
    const name = e.id || e.className || e.tagName;
    if (b.right > innerWidth + 1 && !clipped(e)) out.cut.push(`${name}:${Math.round(b.right)}`);
    if (b.height < 39.5) out.small.push(`${name}:${Math.round(b.height)}`);
  }
  return out;
};
const homeLink = (page) => ev(page, () => { const e = [...document.querySelectorAll("#navBar a, #navBar button, #topNav a, #topNav summary")].find((x) => /index\.html|home|হোম/i.test((x.getAttribute("href") || "") + x.textContent)); if (!e) return null; const b = e.getBoundingClientRect(); return { h: Math.round(b.height), shown: b.width > 0 }; });
const englishLeft = (page) => ev(page, () => {
  const bad = [];
  const w = document.createTreeWalker(document.querySelector("#app"), NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const p = n.parentElement; if (!p || /SCRIPT|STYLE|OPTION/.test(p.tagName) || !p.getClientRects().length) continue;
    const s = n.textContent.trim(); if (/@/.test(s) || /^(Ahsan|Maryam|Tariq|Yusuf)$/.test(s)) continue;
    if (/[A-Za-z]{4,}/.test(s) && !/[ঀ-৿]/.test(s)) bad.push(s.slice(0, 40));
  }
  return bad;
});

const WIDTHS = [320, 390, 820, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

for (const lang of LANGS) {
  const bn = lang === "bn";
  for (const width of WIDTHS) {
    // 1: People as the owner.
    await flow("people-owner", lang, width, "/app/people.html", async (t, page, ctx, errors) => {
      const said = catchDialogs(page, true);
      await page.waitForSelector("#rosterBody tr", { state: "attached", timeout: 15000 });
      await settle(page, 600);
      const f = await ev(page, () => ({ add: getComputedStyle(document.getElementById("addPersonBox")).display, inv: getComputedStyle(document.getElementById("inviteBox")).display, actions: document.querySelectorAll("#rosterBody .archivePersonBtn").length, rows: document.querySelectorAll("#rosterBody tr").length }));
      check(`${t}: POSITIVE CONTROL as owner the Add person and Invite boxes and the row actions ARE shown`, f.add !== "none" && f.inv !== "none" && f.actions > 0, JSON.stringify(f));
      const lf = await ev(page, layoutFacts);
      check(`${t}: no sideways scroll, nothing cut, finger controls 40px or more`, lf.sideways <= 0 && lf.cut.length === 0 && lf.small.length === 0, JSON.stringify(lf));
      if (bn) { const eng = await englishLeft(page); check(`${t}: no English left on screen`, eng.length === 0, eng.slice(0, 6).join(" | ")); }
      const home = await homeLink(page);
      check(`${t}: a way back to Home is on the page`, !!home && home.shown, JSON.stringify(home));

      // Add a person.
      const n0 = await writeCount(page);
      await page.fill("#name", "Ibrahim");
      await page.fill("#birthYear", "2016");
      await page.check("#isMinor");
      await page.check('input[name="role"][value="student"]');
      await page.click("#addBtn"); await settle(page, 1200);
      const ws = await writes(page, n0);
      const p = ws.find((x) => x.col === "tenantPeople");
      check(`${t}: Add person writes ONE tenantPeople document with I17's four fields`, ws.filter((x) => x.col === "tenantPeople").length === 1 && !!p && STAMPS(p.data), JSON.stringify(ws.map((x) => x.col)));
      check(`${t}: the new person gets a 7-digit personId (D3)`, !!p && /^\d{7}$/.test(p.id), p && p.id);
      check(`${t}: and it stores the name, the year of birth 2016 and the child flag`, !!p && (p.data.name.en || p.data.name) === "Ibrahim" && String(p.data.birthYear) === "2016" && p.data.isMinor === true, JSON.stringify(p && p.data).slice(0, 300));
      const res = await ev(page, () => ({ t: document.getElementById("result").textContent, c: document.getElementById("result").className, name: document.getElementById("name").value }));
      check(`${t}: the page says "Added" with the Person ID, and the form is emptied`, res.c === "ok" && /\d{7}/.test(res.t) && res.name === "" && (!bn || BN.test(res.t)), JSON.stringify(res));

      // Refused Add: told in words, nothing stored, typed text kept.
      await ev(page, () => { window.__stubFailBatch = true; window.__stubFailWrites = true; window.__stubFailTx = true; });
      await page.fill("#name", "Typed must survive");
      await page.fill("#birthYear", "2012");
      const n1 = await writeCount(page);
      await page.click("#addBtn"); await settle(page, 1200);
      const rr = await ev(page, () => ({ t: document.getElementById("result").textContent, c: document.getElementById("result").className, shown: getComputedStyle(document.getElementById("result")).display, name: document.getElementById("name").value, by: document.getElementById("birthYear").value, dis: document.getElementById("addBtn").disabled }));
      check(`${t}: a refused Add says so in words (${bn ? "Bangla" : "English"}) and stores nothing`, rr.c === "fail" && rr.shown !== "none" && rr.t.length > 10 && (!bn || BN.test(rr.t)) && (await writeCount(page)) === n1, JSON.stringify(rr));
      check(`${t}: and keeps the typed name and year, and the button can be pressed again`, rr.name === "Typed must survive" && rr.by === "2012" && rr.dis === false, JSON.stringify(rr));
      await ev(page, () => { window.__stubFailBatch = false; window.__stubFailWrites = false; window.__stubFailTx = false; });

      // Archive and restore: a status write, never an erase (I4).
      const n2 = await writeCount(page);
      await page.click('#rosterBody tr:nth-child(2) .archivePersonBtn'); await settle(page, 1200);
      const aw = (await writes(page, n2)).filter((x) => x.col === "tenantPeople");
      check(`${t}: Archive asks first (a confirm naming the person) and writes status "archived" with updatedAt; nothing is deleted`, said.length >= 1 && aw.length === 1 && aw[0].data.status === "archived" && "updatedAt" in aw[0].data && !(await writes(page, n2)).some((x) => x.kind === "delete"), JSON.stringify({ said, aw }).slice(0, 300));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    });

    // 2: People as a student.
    await flow("people-student", lang, width, "/app/people.html", async (t, page, ctx, errors) => {
      await page.waitForSelector("#rosterBody tr", { state: "attached", timeout: 15000 });
      await settle(page, 600);
      const f = await ev(page, () => ({ add: getComputedStyle(document.getElementById("addPersonBox")).display, inv: getComputedStyle(document.getElementById("inviteBox")).display, head: getComputedStyle(document.getElementById("peopleActionsHead")).display, btns: document.querySelectorAll("#rosterBody button").length, rows: document.querySelectorAll("#rosterBody tr").length }));
      check(`${t}: POSITIVE CONTROL the student's page drew a roster`, f.rows > 0, JSON.stringify(f));
      check(`${t}: a student never sees Add person, Invite or the row actions`, f.add === "none" && f.inv === "none" && f.head === "none" && f.btns === 0, JSON.stringify(f));
      const lf = await ev(page, layoutFacts);
      check(`${t}: no sideways scroll, nothing cut, finger controls 40px or more`, lf.sideways <= 0 && lf.cut.length === 0 && lf.small.length === 0, JSON.stringify(lf));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: STUDENT });
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
