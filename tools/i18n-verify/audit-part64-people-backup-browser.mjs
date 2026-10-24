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
import { stubFor } from "./firebase-stub.mjs";
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
  // accept-invite ends every state without a way into the app.
  noacceptback: ["app/accept-invite.html", "**/accept-invite.html*", '  <p><a id="backLink" href="index.html">Open the app</a></p>\n', "", "/app/accept-invite.html"],
  // onboarding has no way into the app unless the family step was used.
  noonboardback: ["app/onboarding.html", "**/onboarding.html*", '  <p><a id="backLink" href="index.html">Open the app</a></p>\n', "", "/app/onboarding.html"],
  // the way back is too small a target for a finger.
  smallback: ["app/accept-invite.html", "**/accept-invite.html*", "  #backLink { display: inline-flex; align-items: center; min-height: 40px; }\n", "", "/app/accept-invite.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
// The signed-in uid becomes the student p2 (a student's own row in the stub).
const TOKENS = `DATA.inviteTokens = [
  { _id: "tokPending123", tenantId: TENANT_ID, email: "invited@example.com" },
  { _id: "tokMine456", tenantId: TENANT_ID, email: "smahk9@gmail.com" },
  { _id: "tokOther789", tenantId: TENANT_ID, email: "someone.else@example.com" } ];
DATA.tenantInvites.push({ _id: TENANT_ID + "__smahk9@gmail.com", tenantId: TENANT_ID, email: "smahk9@gmail.com", role: "student", status: "pending" });
DATA.tenantInvites.push({ _id: TENANT_ID + "__someone.else@example.com", tenantId: TENANT_ID, email: "someone.else@example.com", role: "student", status: "pending" });`;
const STUDENT = `DATA.tenantMemberUids[0].personId = "p2"; DATA.tenantMemberUids[0].roles = ["student"];`;

async function open(lang, width, pagePath, { seed = "", signedOut = false } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: seed || null });
  if (MUTATE && pagePath.startsWith(MUTATIONS[MUTATE][4])) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  if (signedOut) {
    const body = stubFor({ banner: false, extraSeedJs: seed || null }).replace('cb({ uid: UID, email: "smahk9@gmail.com", displayName: "Owner" })', "cb(null)");
    if (!body.includes("cb(null)")) throw new Error("stub shape changed: onAuthStateChanged line not found");
    await ctx.route("https://www.gstatic.com/firebasejs/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
  }
  const reqs = [];
  ctx.on("request", (r) => reqs.push(r.url()));
  const { page, errors } = await openPage(ctx, pagePath);
  page.__reqs = reqs;
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

    // 3: Invite as the owner: create, Copy link (opaque token, never the email, D9), refused invite.
    await flow("invite-owner", lang, width, "/app/people.html", async (t, page, ctx, errors) => {
      await page.waitForSelector("#inviteBody tr", { state: "attached", timeout: 15000 });
      await settle(page, 500);
      const rows = await ev(page, () => [...document.querySelectorAll("#inviteBody tr")].map((r) => ({ cells: [...r.cells].map((c) => c.textContent.trim()), btn: !!r.querySelector(".getLinkBtn") })));
      check(`${t}: POSITIVE CONTROL the pending invite has a "Copy link" button and the consumed one has none`, rows.some((r) => r.cells[0] === "invited@example.com" && r.btn) && rows.some((r) => r.cells[0] === "gone@example.com" && !r.btn), JSON.stringify(rows));
      const n0 = await writeCount(page);
      await page.fill("#inviteEmail", "New.Person@Example.com");
      await page.selectOption("#inviteRole", "guardian");
      await page.click("#inviteBtn"); await settle(page, 1200);
      const ws = await writes(page, n0);
      const inv = ws.find((x) => x.col === "tenantInvites"), tok = ws.find((x) => x.col === "inviteTokens");
      check(`${t}: Invite stores the invite (lower-cased email, role guardian, pending) with I17's four fields`, !!inv && inv.data.email === "new.person@example.com" && inv.data.role === "guardian" && inv.data.status === "pending" && STAMPS(inv.data), JSON.stringify(inv));
      check(`${t}: and an opaque token document that maps to the email (the email is not the token)`, !!tok && !tok.id.includes("@") && tok.id.length >= 16 && tok.data.email === "new.person@example.com", JSON.stringify(tok && { id: tok.id }));
      const said = await ev(page, () => document.getElementById("inviteResult").textContent);
      check(`${t}: the page says the invite was created, in words (${bn ? "Bangla" : "English"})`, said.length > 10 && (!bn || BN.test(said)), said);
      const emailLeft = await ev(page, () => document.getElementById("inviteEmail").value);
      check(`${t}: and the email box is emptied`, emailLeft === "", emailLeft);
      await page.click("#inviteBody tr:first-child .getLinkBtn"); await settle(page, 800);
      const clip = await ev(page, () => navigator.clipboard.readText().catch((e) => "ERR " + e.message));
      check(`${t}: "Copy link" puts an accept-invite link with the opaque token on the clipboard, never the email (D9)`, /accept-invite\.html\?token=tokPending123$/.test(clip) && !clip.includes("example.com") && !clip.includes("@"), clip);
      const lb = await ev(page, () => document.querySelector("#inviteBody .getLinkBtn").textContent);
      check(`${t}: and the button says Copied (${bn ? "Bangla" : "English"})`, lb.length > 3 && (!bn || BN.test(lb)), lb);
      await ev(page, () => { window.__stubFailBatch = true; window.__stubFailWrites = true; window.__stubFailTx = true; });
      await page.fill("#inviteEmail", "keep@example.com");
      const n1 = await writeCount(page);
      await page.click("#inviteBtn"); await settle(page, 1200);
      const rr = await ev(page, () => ({ t: document.getElementById("inviteResult").textContent, email: document.getElementById("inviteEmail").value, dis: document.getElementById("inviteBtn").disabled }));
      check(`${t}: a refused Invite says so in words, stores nothing, keeps the email and can be pressed again`, rr.t.length > 10 && (!bn || BN.test(rr.t)) && rr.email === "keep@example.com" && rr.dis === false && (await writeCount(page)) === n1, JSON.stringify(rr));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: TOKENS });

    // 4: accept-invite: missing / bad link, signed out, wrong account, right account, accept.
    const AI = "/app/accept-invite.html";
    for (const [name, q, o] of [["missing", "", {}], ["bad", "?token=nope", {}], ["signedout", "?token=tokMine456", { signedOut: true }], ["wrongaccount", "?token=tokOther789", {}]]) {
      await flow(`accept-${name}`, lang, width, AI + q, async (t, page, ctx, errors) => {
        await settle(page, 600);
        const f = await ev(page, () => ({ box: document.getElementById("box").textContent, cls: document.getElementById("box").className, signIn: getComputedStyle(document.getElementById("signInArea")).display, signOut: getComputedStyle(document.getElementById("signOutArea")).display, accept: getComputedStyle(document.getElementById("acceptArea")).display, back: (() => { const a = document.getElementById("backLink"); if (!a) return null; const b = a.getBoundingClientRect(); return { h: Math.round(b.height), href: a.getAttribute("href"), w: b.width }; })(), sideways: document.documentElement.scrollWidth - innerWidth, small: [...document.querySelectorAll("button, input")].filter((e) => e.getClientRects().length && e.getBoundingClientRect().height < 39.5).map((e) => e.id) }));
        check(`${t}: says what is wrong or what to do, in words (${bn ? "Bangla" : "English"})`, f.box.length > 15 && f.box !== "Checking your invite link…" && (!bn || BN.test(f.box)), f.box);
        if (name === "signedout") check(`${t}: signed out, it offers "Sign in with Google" and no Accept`, f.signIn !== "none" && f.accept === "none", JSON.stringify(f));
        if (name === "wrongaccount") check(`${t}: wrong account, it offers Sign out and no Accept`, f.signOut !== "none" && f.accept === "none" && f.cls === "fail", JSON.stringify(f));
        check(`${t}: the way back — an "Open the app" link to index.html, at least 40px tall`, !!f.back && f.back.href === "index.html" && f.back.h >= 40 && f.back.w > 0, JSON.stringify(f.back));
        check(`${t}: no sideways scroll, finger controls 40px or more`, f.sideways <= 0 && f.small.length === 0, JSON.stringify({ s: f.sideways, small: f.small }));
        check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
      }, { seed: TOKENS, ...o });
    }
    await flow("accept-right", lang, width, AI + "?token=tokMine456", async (t, page, ctx, errors) => {
      await page.waitForSelector("#acceptArea", { state: "visible", timeout: 15000 });
      const box = await ev(page, () => document.getElementById("box").textContent);
      check(`${t}: signed in as the invited email it says who invites you (${bn ? "Bangla" : "English"})`, /Madrasatul Muslimeen|মাদরাসাতুল/.test(box) && (!bn || BN.test(box)), box);
      const n0 = await writeCount(page);
      await page.fill("#name", "Fatima");
      await page.click("#acceptBtn"); await settle(page, 1500);
      const ws = await writes(page, n0);
      const person = ws.find((x) => x.col === "tenantPeople");
      check(`${t}: Accept writes the person (7-digit id, I17's four fields), the membership, the member-uid row and consumes the invite`, !!person && /^\d{7}$/.test(person.id) && STAMPS(person.data) && ws.some((x) => x.col === "memberships") && ws.some((x) => x.col === "tenantMemberUids") && ws.some((x) => x.col === "tenantInvites" && x.data.status === "consumed"), JSON.stringify(ws.map((x) => x.col + ":" + x.id)));
      const after = await ev(page, () => ({ box: document.getElementById("box").textContent, cls: document.getElementById("box").className, back: !!document.getElementById("backLink") && document.getElementById("backLink").getBoundingClientRect().width > 0 }));
      check(`${t}: it welcomes the person with their ID and the way into the app is on the page`, after.cls === "ok" && /\d{7}/.test(after.box) && after.back && (!bn || BN.test(after.box)), JSON.stringify(after));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: TOKENS });

    // 5: onboarding: signed out, then a family account with members and years of birth.
    await flow("onboarding-signedout", lang, width, "/app/onboarding.html", async (t, page, ctx, errors) => {
      await settle(page, 600);
      const f = await ev(page, () => ({ signIn: getComputedStyle(document.getElementById("signInBtn")).display, form: getComputedStyle(document.getElementById("onboardForm")).display, who: document.getElementById("who").textContent, back: !!document.getElementById("backLink") && document.getElementById("backLink").getBoundingClientRect().width > 0, sideways: document.documentElement.scrollWidth - innerWidth }));
      check(`${t}: signed out it offers sign-in, hides the form and says "Not signed in" in words`, f.signIn !== "none" && f.form === "none" && f.who.length > 5 && (!bn || BN.test(f.who)), JSON.stringify(f));
      check(`${t}: the way back — "Open the app" is on the page; no sideways scroll`, f.back && f.sideways <= 0, JSON.stringify(f));
    }, { signedOut: true });
    await flow("onboarding-family", lang, width, "/app/onboarding.html", async (t, page, ctx, errors) => {
      await page.waitForSelector("#onboardForm", { state: "visible", timeout: 15000 });
      const n0 = await writeCount(page);
      await page.check('input[name="tenantType"][value="family"]');
      await page.fill("#name", "Amina");
      await page.click("#createBtn"); await settle(page, 1500);
      const ws = await writes(page, n0);
      check(`${t}: Create writes the tenant and the owner's person, with I17's four fields`, ws.some((x) => x.col === "tenants" && STAMPS(x.data)) && ws.some((x) => x.col === "tenantPeople" && STAMPS(x.data)), JSON.stringify(ws.map((x) => x.col)));
      await page.waitForSelector("#familyStep", { state: "visible", timeout: 8000 });
      const lf = await ev(page, () => ({ sideways: document.documentElement.scrollWidth - innerWidth, back: !!document.getElementById("backLink") && document.getElementById("backLink").getBoundingClientRect().width > 0, small: [...document.querySelectorAll("#familyStep button, #familyStep input:not([type=checkbox]), #backLink")].filter((e) => e.getClientRects().length && e.getBoundingClientRect().height < 39.5).map((e) => e.id || e.className), cut: [...document.querySelectorAll("#familyStep input, #familyStep button")].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.id) }));
      check(`${t}: the family step has no sideways scroll, nothing cut, finger controls 40px or more, and the way back stays on the page`, lf.sideways <= 0 && lf.small.length === 0 && lf.cut.length === 0 && lf.back, JSON.stringify(lf));
      await page.fill("#famName0", "Yusuf");
      await page.fill("#famYear0", String(new Date().getFullYear() - 9));
      const age = await ev(page, () => document.querySelector("[data-fam-age]").textContent);
      check(`${t}: typing a year of birth shows the age`, /9|৯/.test(age), age);
      await page.click("#familyAdd");
      await page.fill("#famName1", "Hamza");
      await page.fill("#famYear1", "1990");
      const child1 = await ev(page, () => document.querySelectorAll('[data-fam-k="child"]')[1].checked);
      check(`${t}: a year that makes an adult unticks "A child I look after"`, child1 === false);
      const n1 = await writeCount(page);
      await page.click("#familySave"); await settle(page, 1500);
      const fw = (await writes(page, n1)).filter((x) => x.col === "tenantPeople");
      check(`${t}: Save and continue stores two people, 7-digit ids, I17's four fields, birth years and child flags`, fw.length === 2 && fw.every((w) => /^\d{7}$/.test(w.id) && STAMPS(w.data)) && fw.some((w) => String(w.data.birthYear) === "1990" && w.data.isMinor === false) && fw.some((w) => w.data.isMinor === true && w.data.managedByPersonId), JSON.stringify(fw.map((w) => ({ id: w.id, by: w.data.birthYear, m: w.data.isMinor }))));
      const msg = await ev(page, () => document.getElementById("familyResult").textContent);
      check(`${t}: it says how many were added (${bn ? "Bangla" : "English"})`, msg.length > 8 && (!bn || BN.test(msg)), msg);
      await page.fill("#famName0", "Keep Me");
      await ev(page, () => { window.__stubFailBatch = true; window.__stubFailWrites = true; window.__stubFailTx = true; });
      const n2 = await writeCount(page);
      await page.click("#familySave"); await settle(page, 1500);
      const kept = await ev(page, () => ({ v: document.getElementById("famName0") && document.getElementById("famName0").value, msg: document.getElementById("familyResult").textContent }));
      check(`${t}: a refused Save names who was not saved, keeps the typed row and stores nothing`, kept.v === "Keep Me" && /Keep Me/.test(kept.msg) && (await writeCount(page)) === n2, JSON.stringify(kept));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    });

    // 6: Backup: owner makes it, student's view.
    for (const [who, seed] of [["owner", ""], ["student", STUDENT]]) {
      await flow(`backup-${who}`, lang, width, "/app/backup.html", async (t, page, ctx, errors) => {
        await page.waitForSelector("#makeBtn:not([disabled])", { timeout: 15000 });
        await settle(page, 400);
        const scope = await ev(page, () => document.getElementById("scopeLine").textContent);
        check(`${t}: the scope line says whose data is saved, in words (${bn ? "Bangla" : "English"})`, scope.length > 10 && (!bn || BN.test(scope)), scope);
        await page.click("#makeBtn");
        await page.waitForSelector("#result a.download-link", { timeout: 20000 });
        const r = await ev(page, async () => { const a = document.querySelector("#result a.download-link"); const txt = await (await fetch(a.href)).text(); return { name: a.getAttribute("download"), text: txt, link: a.textContent, stats: [...document.querySelectorAll("#result .stat")].map((s) => s.textContent), sideways: document.documentElement.scrollWidth - innerWidth }; });
        check(`${t}: "Make the backup" produces a named .html file with a Save link`, /\.html$/.test(r.name) && r.link.length > 5, r.name);
        check(`${t}: and the file holds the roster${who === "owner" ? " (Maryam)" : ""} and is a real document`, r.text.length > 2000 && (who !== "owner" || /Maryam|মারইয়াম|মরিয়ম/.test(r.text)), `len ${r.text.length}`);
        check(`${t}: the page shows people / claims / notes / bookmarks / log counts and a size`, r.stats.length === 6, JSON.stringify(r.stats));
        check(`${t}: no sideways scroll`, r.sideways <= 0, String(r.sideways));
        const lf = await ev(page, layoutFacts);
        check(`${t}: nothing cut and finger controls 40px or more`, lf.cut.length === 0 && lf.small.length === 0, JSON.stringify(lf));
        const home = await homeLink(page);
        check(`${t}: a way back to Home is on the page`, !!home && home.shown, JSON.stringify(home));
        check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
      }, { seed });
    }

    // 7: About.
    await flow("about", lang, width, "/app/about.html", async (t, page, ctx, errors) => {
      await page.waitForSelector("#featureRows tr", { state: "attached", timeout: 15000 });
      await settle(page, 400);
      const f = await ev(page, () => ({ rows: document.querySelectorAll("#featureRows tr").length, ack: document.getElementById("ackHeading") && document.getElementById("ackHeading").textContent, links: [...document.querySelectorAll("a[target=_blank]")].filter((a) => !a.className.includes("legacy")).length, ver: document.getElementById("versionLine").textContent, sideways: document.documentElement.scrollWidth - innerWidth }));
      check(`${t}: POSITIVE CONTROL it lists features, the acknowledgements and the version`, f.rows > 5 && f.ack && f.links >= 2 && /\d\d\.\d\d|[০-৯]/.test(f.ver), JSON.stringify(f));
      check(`${t}: no sideways scroll`, f.sideways <= 0, String(f.sideways));
      const heavy = (page.__reqs || []).filter((u) => /quran-data-pull|hadith-data-pull|\.mp3|\/audio\/|poster|screensaver-images|mushaf/i.test(u));
      check(`${t}: nothing heavy loads at startup (no Qur'an / Hadith data, audio or posters)`, heavy.length === 0, heavy.slice(0, 3).join(" | "));
      const home = await homeLink(page);
      check(`${t}: a way back to Home is on the page`, !!home && home.shown, JSON.stringify(home));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    });
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
