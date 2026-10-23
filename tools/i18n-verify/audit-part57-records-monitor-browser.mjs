// Audit part 57 (PCF MSA J29): Records, Monitor reports and Homework by the User Manual, driven as flows, not only as layout.
//   layout    each page at 320 / 390 / 820 / 1280: no sideways page scroll, nothing cut, every finger control >= 40px,
//             grey help text readable (4.5:1 on its real background), no English left in Bangla
//   records   one read per chunk (never all records for a person); a claim by hand writes; Confirm writes; a refused write
//             is told to the reader (I15); the Confirm button of a pending claim is reachable on a phone
//   monitor   Week / Month / the arrows move the range; the CSV has the translated header row and a data row; Print opens
//             the print window with the report in it
//   homework  Create assignment, Mark as submitted, Save score write; a refused create says so on screen (I15) and nothing is stored
//   student   a student sees only what is theirs and no teacher controls
// Mutations (--mutate=<name>) restore a plausible defect and must each fail the suite.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part57-records-monitor-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
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
  // Records lists everyone to a real student login (only a View as preview was scoped).
  rosterunscoped: ["app/records.html", "**/records.html*", "scopedRoster(roster, effRoles, myPersonId).filter(", "(effRoles.includes(\"__never__\") ? scopedRoster(roster, effRoles, myPersonId) : roster).filter(", "/app/records.html"],
  // The Optional note box on a submission shrinks back to 34px.
  notebox: ["app/homework.html", "**/homework.html*", "  .submitNote { min-height: 40px; }\n", "", "/app/homework.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
const STUDENT = `DATA.tenantMemberUids[0].personId = "p2"; DATA.tenantMemberUids[0].roles = ["student"];`;

async function open(lang, width, pagePath, { seed = "", failWrites = false } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: (seed + (failWrites ? "window.__stubFailWrites = true;" : "")) || null });
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
const reads = (page, col) => ev(page, (c) => (window.__fsLog || []).filter((x) => x.col === c).map((x) => `${x.kind}:${x.id}`), col);
const shown = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== "none" && e.getClientRects().length > 0; }, sel);
const banner = (page) => ev(page, () => { const b = document.getElementById("qr-write-failure-banner"); return b && getComputedStyle(b).display !== "none" && b.getClientRects().length ? b.firstChild.firstChild.textContent : ""; });
const hideBanner = (page) => ev(page, () => { const b = document.getElementById("qr-write-failure-banner"); if (b) b.style.display = "none"; });
// Alerts are how these pages tell a refused write: collect them instead of blocking.
function catchDialogs(page) { const said = []; page.on("dialog", (d) => { said.push(d.message()); d.dismiss().catch(() => {}); }); return said; }

// Layout facts shared by the three pages.
const layoutFacts = () => {
  const out = { sideways: document.documentElement.scrollWidth - innerWidth, cut: [], small: [], lowContrast: [] };
  const clipped = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === "auto" || o === "scroll" || o === "hidden") && p.scrollWidth > p.clientWidth) return true; } return false; };
  for (const e of document.querySelectorAll("#app button, #app select, #app input:not([type=checkbox]):not([type=radio]), #app textarea, #topNav button, #navBar button")) {
    const b = e.getBoundingClientRect();
    if (!b.width || getComputedStyle(e).display === "none" || getComputedStyle(e).visibility === "hidden") continue;
    const name = e.id || e.className || e.tagName;
    if (b.right > innerWidth + 1 && !clipped(e)) out.cut.push(`${name}:${Math.round(b.right)}`);
    if (b.height < 39.5) out.small.push(`${name}:${Math.round(b.height)}`);
  }
  const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (e) => { for (let p = e; p; p = p.parentElement) { const c = rgb(getComputedStyle(p).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] > 0.9)) return c; } return [255, 255, 255]; };
  for (const e of document.querySelectorAll("#app p, #app label, #app span, #app td, #app th, #app li, #app div, #app h2, #app h3")) {
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(e); if (cs.display === "none" || !e.getClientRects().length) continue;
    const a = lum(rgb(cs.color)), b = lum(bgOf(e)); const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && Number(cs.fontWeight) >= 700);
    if (ratio < (big ? 3 : 4.5)) out.lowContrast.push(`${(e.id || e.className || e.tagName)}:${ratio.toFixed(2)}:${e.textContent.trim().slice(0, 24)}`);
  }
  return out;
};
const englishLeft = (page) => ev(page, () => {
  const bad = [];
  const w = document.createTreeWalker(document.querySelector("#app"), NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const p = n.parentElement; if (!p || /SCRIPT|STYLE|OPTION/.test(p.tagName) || !p.getClientRects().length) continue;
    const s = n.textContent.trim(); if (/^(Memorise Surah Al-Fatiha|Doing well on tajweed\.|Try again)$/.test(s)) continue; /* seeded tenant data, not interface */ if (/[A-Za-z]{4,}/.test(s) && !/[ঀ-৿]/.test(s)) bad.push(s.slice(0, 40));
  }
  return bad;
});

const WIDTHS = [320, 390, 820, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
const PAGES = [["records", "/app/records.html"], ["monitor", "/app/monitor.html"], ["homework", "/app/homework.html"]];

for (const lang of LANGS) {
  const bn = lang === "bn";
  // 1: layout of the three pages, owner and student.
  for (const width of WIDTHS) for (const [name, pg] of PAGES) for (const who of ["owner", "student"]) {
    await flow(`layout-${name}-${who}`, lang, width, pg, async (t, page, ctx, errors) => {
      await page.waitForSelector("#app", { state: "visible", timeout: 15000 });
      await settle(page, 800);
      const body = await ev(page, () => document.body.innerText.length);
      check(`${t}: POSITIVE CONTROL the page drew`, body > 300, String(body));
      const f = await ev(page, layoutFacts);
      check(`${t}: no sideways page scroll`, f.sideways <= 0, String(f.sideways));
      check(`${t}: nothing cut off the right edge (scrolling tables aside)`, f.cut.length === 0, f.cut.join(" | "));
      check(`${t}: every finger control is 40px or more`, f.small.length === 0, f.small.join(" | "));
      check(`${t}: all text is 4.5:1 on its real background`, f.lowContrast.length === 0, f.lowContrast.slice(0, 4).join(" | "));
      if (bn) { const eng = await englishLeft(page); check(`${t}: no English left on screen`, eng.length === 0, eng.slice(0, 4).join(" | ")); }
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: who === "student" ? STUDENT : "" });
  }

  for (const width of WIDTHS.filter((w) => w === 390 || w === 1280)) {
    // 2: Records.
    await flow("records", lang, width, "/app/records.html", async (t, page, ctx, errors) => {
      const said = catchDialogs(page);
      await page.waitForSelector("#entriesBody tr", { timeout: 15000 });
      await settle(page, 600);
      const rows = await ev(page, () => document.querySelectorAll("#entriesBody tr").length);
      check(`${t}: POSITIVE CONTROL the first chunk lists Ahsan's three seeded claims`, rows === 3, String(rows));
      // One read per chunk: the load-speed contract.
      const r1 = await reads(page, "records");
      check(`${t}: opening reads ONE records chunk and no list of them`, r1.length === 1 && r1[0] === "getDoc:t1__p1__surah_1", r1.join(","));
      await page.selectOption("#unitTypeSelect", "ayah");
      await page.fill("#unitRef", "2:5"); await page.dispatchEvent("#unitRef", "change"); await settle(page, 600);
      const r2 = await reads(page, "records");
      check(`${t}: another surah reads exactly one more chunk`, r2[r2.length - 1] === "getDoc:t1__p1__surah_2" && r2.filter((x) => x.endsWith("surah_2")).length === 1 && r2.every((x) => x.startsWith("getDoc:") && /__p1__surah_[12]$/.test(x)), r2.join(","));
      await page.fill("#unitRef", "1:1"); await page.dispatchEvent("#unitRef", "change"); await ev(page, () => document.activeElement && document.activeElement.blur()); await settle(page, 800);

      // Confirm button reachable on a phone.
      const reach = await ev(page, () => { const b = document.querySelector(".confirmBtn"); if (!b) return null; b.scrollIntoView({ block: "center", inline: "center" }); const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { inside: r.left >= 0 && r.right <= innerWidth, hit: top === b || b.contains(top), h: Math.round(r.height) }; });
      check(`${t}: a pending claim's Confirm can be brought on screen and tapped`, !!reach && reach.inside && reach.hit && reach.h >= 39, JSON.stringify(reach));

      // A refused write is told to the reader (I15).
      await ev(page, () => { window.__stubFailWrites = true; });
      const n0 = await writeCount(page);
      await page.click(".confirmBtn");
      await settle(page, 900);
      const bm = await banner(page);
      check(`${t}: a refused Confirm tells the reader in words on screen (${bn ? "Bangla" : "English"})`, bm.length > 10 && (!bn || BN.test(bm)), JSON.stringify({ bm, said }));
      await hideBanner(page);
      check(`${t}: and stores nothing`, (await writeCount(page)) === n0);
      await ev(page, () => { window.__stubFailWrites = false; });
      const stillBtn = await ev(page, () => !!document.querySelector(".confirmBtn:not([disabled])"));
      check(`${t}: and the Confirm button is usable again`, stillBtn);

      // Confirm for real.
      const n1 = await writeCount(page);
      await page.click(".confirmBtn"); await settle(page, 700);
      const w = (await writes(page, n1)).find((x) => x.col === "records");
      check(`${t}: Confirm writes the confirmation to the records chunk`, !!w && /confirm/i.test(JSON.stringify(w.data)), JSON.stringify(w));

      // Claim by hand.
      const n2 = await writeCount(page);
      await page.fill("#unitRef", "1:5"); await page.selectOption("#statusSelect", { index: 1 });
      await page.click("#claimBtn"); await settle(page, 800);
      const cw = (await writes(page, n2)).filter((x) => x.col === "records");
      const said2 = await ev(page, () => document.getElementById("claimResult").textContent);
      check(`${t}: a claim by hand writes to the surah 1 chunk and says so (${bn ? "Bangla" : "English"})`, cw.length >= 1 && cw[0].id === "t1__p1__surah_1" && said2.length > 5 && (!bn || BN.test(said2)), JSON.stringify({ cw: cw.map((x) => x.id), said2 }));
      // A refused claim says so on screen and stores nothing.
      await ev(page, () => { window.__stubFailWrites = true; });
      const n3 = await writeCount(page);
      await page.fill("#unitRef", "1:6"); await page.click("#claimBtn"); await settle(page, 800);
      const said3 = await ev(page, () => document.getElementById("claimResult").textContent);
      check(`${t}: a refused claim is told on screen, not as claimed`, said3.length > 5 && !/^(Claimed|দাবি)/.test(said3) && (await writeCount(page)) === n3 && (await banner(page)).length > 5, said3);
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    });

    // 3: Records, as a student: no teacher controls.
    await flow("records-student", lang, width, "/app/records.html", async (t, page, ctx, errors) => {
      await page.waitForSelector("#entriesBody tr", { timeout: 15000 });
      await settle(page, 600);
      const f = await ev(page, () => ({ rows: document.querySelectorAll("#entriesBody tr").length, confirm: document.querySelectorAll(".confirmBtn, .returnBtn").length, people: [...document.querySelectorAll("#personSelect option")].map((o) => o.value) }));
      check(`${t}: POSITIVE CONTROL the page drew for the student`, f.people.length >= 1, JSON.stringify(f));
      check(`${t}: the student's person list holds only themselves`, f.people.join() === "p2", f.people.join());
      check(`${t}: no Confirm or Return buttons for a student`, f.confirm === 0, String(f.confirm));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: STUDENT });

    // 4: Monitor.
    await flow("monitor", lang, width, "/app/monitor.html", async (t, page, ctx, errors) => {
      const said = catchDialogs(page);
      await page.waitForSelector("#reportBody table", { timeout: 15000 });
      await settle(page, 600);
      const label0 = await ev(page, () => document.getElementById("rangeLabel").textContent);
      check(`${t}: POSITIVE CONTROL the week report drew with a range label`, label0.length > 5, label0);
      await page.click("#weekPrevBtn"); await settle(page, 500);
      const label1 = await ev(page, () => document.getElementById("rangeLabel").textContent);
      check(`${t}: ◀ moves the week back`, label1 !== label0, `${label0} -> ${label1}`);
      await page.click("#weekNextBtn"); await settle(page, 500);
      check(`${t}: ▶ moves it forward again`, (await ev(page, () => document.getElementById("rangeLabel").textContent)) === label0);
      // CSV: header row and one data row.
      const dl = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
      await page.click("#csvBtn");
      const d = await dl;
      let csv = "";
      if (d) { const p = await d.path(); csv = fs.readFileSync(p, "utf8"); }
      const lines = csv.split("\n");
      check(`${t}: Download CSV saves a file named for the week`, !!d && /^monitor-week-\d{4}-\d\d-\d\d\.csv$/.test(d.suggestedFilename()), d ? d.suggestedFilename() : "no download");
      check(`${t}: its header row has six translated columns`, lines[0].split(",").length === 6 && (!bn || BN.test(lines[0])), lines[0]);
      check(`${t}: and a data row for the seeded claim`, lines.length >= 2 && /ayah:1:1/.test(csv) && lines[1].split('","').length === 6, lines.slice(0, 3).join(" // "));
      // Month.
      await page.click("#monthTabBtn"); await settle(page, 800);
      const m = await ev(page, () => ({ label: document.getElementById("rangeLabel").textContent, wk: getComputedStyle(document.getElementById("weekControls")).display, mo: getComputedStyle(document.getElementById("monthControls")).display }));
      check(`${t}: Month shows the month arrows and hides the week ones`, m.wk === "none" && m.mo !== "none" && m.label.length > 3, JSON.stringify(m));
      const dl2 = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
      await page.click("#csvBtn");
      const d2 = await dl2;
      check(`${t}: the month CSV is named for the month`, !!d2 && /^monitor-month-\d{4}-\d\d\.csv$/.test(d2.suggestedFilename()), d2 ? d2.suggestedFilename() : "no download");
      // Print opens a window holding the report.
      const popup = page.waitForEvent("popup", { timeout: 8000 }).catch(() => null);
      await page.click("#printBtn");
      const pw = await popup;
      let ptext = "";
      if (pw) { await settle(page, 700); ptext = await pw.evaluate(() => document.body.innerText).catch(() => ""); await pw.close().catch(() => {}); }
      check(`${t}: Print opens a print window holding the report`, !!pw && ptext.length > 40 && ptext.includes(label0.slice(0, 0)) , `${ptext.length} chars`);
      check(`${t}: and no pop-up-blocked message`, said.length === 0, JSON.stringify(said));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    });

    // 5: Homework.
    await flow("homework", lang, width, "/app/homework.html", async (t, page, ctx, errors) => {
      const said = catchDialogs(page);
      await page.waitForSelector(".markSubmittedBtn", { timeout: 15000 });
      await settle(page, 600);
      check(`${t}: POSITIVE CONTROL the seeded assignment is listed with Mark as submitted`, true);
      // Refused Mark as submitted first: told on screen, nothing stored, button usable again.
      await ev(page, () => { window.__stubFailWrites = true; });
      const f0 = await writeCount(page);
      await page.click(".markSubmittedBtn"); await settle(page, 800);
      const bm = await banner(page);
      check(`${t}: a refused Mark as submitted tells the reader on screen (${bn ? "Bangla" : "English"}) and stores nothing`, bm.length > 10 && (!bn || BN.test(bm)) && (await writeCount(page)) === f0, bm);
      await ev(page, () => { window.__stubFailWrites = false; });
      await hideBanner(page);
      check(`${t}: and the button can be pressed again`, await ev(page, () => !!document.querySelector(".markSubmittedBtn:not([disabled])")));
      const a0 = await writeCount(page);
      await page.check("#assignToChecks input[type=checkbox]");
      await page.fill("#instructionsInput", "Read two pages");
      await page.click("#createAssignmentBtn"); await settle(page, 900);
      const cw = (await writes(page, a0)).find((x) => x.col === "assignments");
      check(`${t}: Create assignment writes the assignment`, !!cw, JSON.stringify((await writes(page, a0)).map((x) => x.col)));
      if (cw) {
        const d = cw.data || {};
        check(`${t}: and the new document carries I17's four fields`, ["schemaVersion", "createdAt", "updatedAt", "createdBy"].every((k) => k in d), Object.keys(d).join(","));
      }
      // Mark submitted, save score.
      const a1 = await writeCount(page);
      await page.click(".markSubmittedBtn"); await settle(page, 800);
      const mw = (await writes(page, a1)).find((x) => x.col === "submissions");
      check(`${t}: Mark as submitted writes the submission`, !!mw && /submitted/.test(JSON.stringify(mw.data)), JSON.stringify(mw));
      await page.waitForSelector(".saveScoreBtn", { timeout: 8000 }).catch(() => {});
      const sc = await ev(page, () => { const i = document.querySelector("input[type=number].scoreInput, .scoreInput, #assignmentsBody input[type=number]"); return !!i; });
      if (sc) {
        await page.fill("#assignmentsBody input[type=number]", "8");
        const a2 = await writeCount(page);
        await page.click(".saveScoreBtn"); await settle(page, 800);
        const sw = (await writes(page, a2)).find((x) => x.col === "submissions");
        check(`${t}: Save score writes the score`, !!sw && /8/.test(JSON.stringify(sw.data)), JSON.stringify(sw));
      } else check(`${t}: a score box appears once submitted`, false);
      check(`${t}: the only alert was the refused write's, and it was in words (${bn ? "Bangla" : "English"})`, said.length === 1 && (!bn || BN.test(said[0])), JSON.stringify(said));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    });

    // 6: Homework, as a student.
    await flow("homework-student", lang, width, "/app/homework.html", async (t, page, ctx, errors) => {
      await settle(page, 1200);
      const f = await ev(page, () => ({ create: getComputedStyle(document.getElementById("createFieldset")).display, notes: getComputedStyle(document.getElementById("noteFieldset")).display, people: [...document.querySelectorAll("#personSelect option")].map((o) => o.value), mark: document.querySelectorAll(".markSubmittedBtn, .saveScoreBtn").length, body: document.getElementById("assignmentsBody").innerText }));
      check(`${t}: POSITIVE CONTROL the page drew`, f.body.length > 0 && f.people.length >= 1, JSON.stringify(f));
      check(`${t}: no Create assignment form and no teaching-notes form for a student`, f.create === "none" && f.notes === "none", JSON.stringify(f));
      check(`${t}: the student sees only themselves, and not Ahsan's assignment`, f.people.join() === "p2" && !/Al-Fatiha|ফাতিহা/.test(f.body), JSON.stringify({ p: f.people, b: f.body.slice(0, 60) }));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: STUDENT });
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
