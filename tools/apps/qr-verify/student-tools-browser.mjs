// Audit part 45 (PCF MSA J29; v12.33, renamed from the Builder's student-browser.mjs, which part 44 already holds): the SHARED tools as a STUDENT uses them on the BUILT QuranRevival app
// (Notes, Mapping My Journey, Bookmarks, sign-in / account, and the way back, decision 86).
// The student is the harness stub with the signed-in login made a `student` (person p2), as landing-drawer-row-resized-wheel-browser does.
//   control   the detectors find a seeded cut-off button, covered button, short Back, grey-on-white text, sideways scroll, 30px control
//   notes     Read view 2:256 -> 📝 -> ✚ New note: stored (notes + noteSources + notePlacements), opens in the Mapping My Journey
//             window, found again by search and in the āyah's Notes list; a folder is made and the Note filed into it; – and chip; ✕ back
//   bookmark  🔖 on 2:256 -> Save (stored); from notes.html the Bookmark menu goes to it and ← Back returns
//   account   Home -> 👤 My account opens and closes, Sign out is 40px, Language works signed in AND signed out
//   failed    a refused write shows words, not silence (window.__stubFailBatch)
//   menus     the Bookmark menu FILLS on Mapping My Journey, My Notes, Dawah and Import notes (mutations jm-menu, notes-menu, dawah-menu, import-menu)
//             QR has only Mapping My Journey; for the other three:  QR_BUILD=. node tools/apps/qr-verify/student-tools-browser.mjs --only=menus
//   node tools/apps/qr-verify/student-tools-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--look=night|light] [--mutate=<name>]
//   (serves build/qr itself on PORT, default 8113: run  node tools/apps/build-app.mjs qr  first)
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang"), KONLY = arg("look");
const { REPO, BUILD } = await import("./_root.mjs");
const PORT = Number(process.env.PORT) || 8113;
const server = spawn(process.execPath, ["tools/apps/serve-app.mjs", BUILD], { cwd: REPO, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
process.env.QR_BASE = `http://localhost:${PORT}`;
const { chromium, newContext, openPage, clickReadTool, BASE } = await import("../../i18n-verify/harness.mjs");
const { stubFor } = await import("../../i18n-verify/firebase-stub.mjs");

let pass = 0, fail = 0;
// Findings in QR-only files (app/quranrevival.html), which belong to the MSA-QR-LEAD (sent 23 Oct, v12.33): listed, not
// failed, and a listed finding that STOPS occurring is itself reported (a fixed finding must leave this list).
//   appVersion  #appVersion is #888 on white, 3.54:1, on the signed-out page
//   signInBtn   the signed-out page's "Sign in with Google" is 27px tall
const FOR_QR_LEAD = ["appVersion", "signInBtn"];
const seenKnown = new Set();
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
// name: [file in the built app, route glob, anchor (exactly once), replacement]. Each puts one fix back to the old code.
const BM_NEW = (who) => `import("./js/bookmark-nav.js").then((m) => m.mountBookmarkMenu(navBar, { db, getTenantId: () => activeTenantId, getPersonId: () => ${who} })).catch(() => {});`;
const BM_OLD = 'import("./js/bookmark-nav.js").then((m) => m.mountNavBack()).catch(() => {});';
// Each puts one page's Bookmark menu back to the old code (never filled, "Loading…" for ever): the "menus" flow must FAIL.
const MUTATIONS = {
  "jm-menu": ["app/journey-map.html", "**/app/journey-map.html*", BM_NEW("selectedPersonId"), BM_OLD],
  "notes-menu": ["app/notes.html", "**/app/notes.html*", BM_NEW("selectedPersonId"), BM_OLD],
  "dawah-menu": ["app/dawah.html", "**/app/dawah.html*", BM_NEW("myPersonId"), BM_OLD],
  "import-menu": ["app/import-notes.html", "**/app/import-notes.html*", BM_NEW("selectedPersonId"), ""],
  // Each puts one audit-45 fix back: the bookmark flow's popover contrast / the notes flow's 40px search / its sideways scroll must FAIL.
  "who-tag": ["app/js/bookmark-popover.js", "**/app/js/bookmark-popover.js*", "color: #555; /* audit 45", "color: #777; /* audit 45"],
  "find-40": ["app/js/read-note-pane.js", "**/app/js/read-note-pane.js*", "min-height: 40px; /* audit 45", "min-height: 36px; /* audit 45"],
  "unit-head": ["app/journey-map.html", "**/app/journey-map.html*", "html.pane-tabs-hosted #noteLayout.tier-wide .unit-head { margin-inline: 0; }", ""],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

// ---- in the page: one measurement of everything on screen (as audit-part41, plus finger size) ----------------------------
function measure(scope) {
  const vw = innerWidth;
  const out = { over: document.documentElement.scrollWidth - vw, cut: [], covered: [], backSmall: [], small: [], contrast: [], nCtl: 0, nText: 0 };
  // Which elements stick out past the right edge (so a sideways-scroll finding names its cause).
  out.wide = out.over > 0 ? [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > vw + 0.5).slice(-4).map((e) => `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}${e.classList.length ? "." + [...e.classList].join(".") : ""} right ${Math.round(e.getBoundingClientRect().right)}`) : [];
  const desc = (e) => (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : "") + ":" + (e.textContent || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 18)).slice(0, 70);
  const folded = (e) => { for (let d = e.closest("details"); d; d = d.parentElement && d.parentElement.closest("details")) { if (!d.open && !(e.closest("summary") && e.closest("summary").parentElement === d)) return true; } return false; };
  const vis = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none" && !e.closest("[hidden]") && !folded(e); };
  const sx = scrollX, sy = scrollY;
  const ctl = [...document.querySelectorAll("button, a[href], select, summary, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea")].filter(vis);
  for (const e of ctl) {
    if (e.closest("#zabCorner, #zabBar, #zabPanel")) continue;
    if (scope && !e.closest(scope)) continue;
    out.nCtl++;
    let r = e.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) out.cut.push(desc(e) + ` [${Math.round(r.left)},${Math.round(r.right)}]`);
    if (/^←/.test((e.textContent || "").trim()) && r.height < 39.5) out.backSmall.push(desc(e) + ` h=${Math.round(r.height)}`);
    if (e.tagName !== "A" && Math.min(r.width, r.height) < 39.5 && !e.closest("[data-word-occurrence]")) out.small.push(desc(e) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
    e.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    r = e.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > vw) continue;
    const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1), y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
    const at = document.elementFromPoint(x, y);
    if (!at || at === e || e.contains(at) || at.contains(e) || (e.tagName === "SUMMARY" && e.parentElement.contains(at)) || (e.labels && [...e.labels].some((l) => l.contains(at)))) continue;
    out.covered.push(desc(e) + " under " + desc(at));
  }
  scrollTo(sx, sy);
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => {
    const chain = []; for (let n = el; n; n = n.parentElement) chain.push(n);
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = chain.length - 1; i >= 0; i--) {
      const cs = getComputedStyle(chain[i]);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const c = parse(cs.backgroundColor); if (c && c.a > 0) base = over(c, base);
    }
    return base;
  };
  const seen = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const e = n.parentElement; if (!e || seen.has(e) || !vis(e)) continue;
    if (e.closest("script, style, option, svg, canvas, [disabled], [aria-disabled=true], #zabCorner, #zabBar, #zabPanel")) continue;
    if (scope && !e.closest(scope)) continue;
    seen.add(e); out.nText++;
    const cs = getComputedStyle(e);
    const bg = bgOf(e); if (!bg) continue;
    let fg = parse(cs.color); if (!fg) continue;
    let op = 1; for (let a = e; a; a = a.parentElement) op *= Number(getComputedStyle(a).opacity);
    fg = over({ ...fg, a: fg.a * op }, bg);
    const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    const rr = ratio(fg, bg);
    if (rr < need) out.contrast.push(`${desc(e)} ${rr.toFixed(2)}<${need} (${cs.color} on rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)}))`);
  }
  for (const k of ["cut", "covered", "backSmall", "small", "contrast"]) out[k] = [...new Set(out[k])];
  return out;
}
const MEASURE_SRC = measure.toString();

const BN = /[ঀ-৿]/;
const PROPER = /QuranRevival|QR|MMSA|MSA|Qur'?an|Asma|Husna|Madrasatul|Muslimeen|Hadith|Mapping My Journey|Google|Zab|Baqara|Bismillah|Ahsan|Study|Gmail|smahk9|com|test|Owner|Prime|Dua|Seerah|CSV|JSON|ID/g;
const englishLeft = (text) => (String(text).replace(PROPER, " ").match(/[A-Za-z]{3,}/g) || []);
const settle = (p, ms = 350) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const visible = (p, sel) => ev(p, (s) => [...document.querySelectorAll(s)].some((e) => { const b = e.getBoundingClientRect(), c = getComputedStyle(e); return b.width > 0 && b.height > 0 && c.visibility !== "hidden" && c.display !== "none" && !e.closest("[hidden]"); }), sel);
/** A wait is a named state; a timeout fails by name. */
async function until(name, fn, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 120)); }
  console.log(`  TIMEOUT  waiting for: ${name}`);
  return false;
}
const writesOf = (p) => ev(p, () => {
  const tx = JSON.parse(sessionStorage.getItem("__stubWrites") || "[]").map((w) => ({ col: w.col, id: w.id, op: w.op || "update", data: w.data }));
  const other = (window.__stubWriteData || []).map((w) => ({ col: w.col, id: w.id, op: w.kind, data: w.data }));
  return [...tx, ...other];
});

/** Judge one state: it must really be on screen (positive control), then the detectors. */
async function state(t, p, label, mustSee, only = {}) {
  const tt = `${t}: ${label}`;
  const seen = await visible(p, mustSee);
  check(`${tt}: POSITIVE CONTROL it is on screen (${mustSee})`, seen);
  if (!seen) return null;
  // only.frame: measure the page inside a frame (the Notes pane / the tray); only.scope: just the part of this page inside the selector
  const target = only.frame ? only.frame() : p;
  if (!target) { check(`${tt}: POSITIVE CONTROL the frame is there`, false); return null; }
  const m = await target.evaluate(`(${MEASURE_SRC})(${JSON.stringify(only.scope || null)})`);
  check(`${tt}: ${m.nCtl} controls and ${m.nText} texts were measured`, m.nCtl > 0 && m.nText > 0, JSON.stringify({ n: m.nCtl, t: m.nText }));
  check(`${tt}: no sideways scroll`, m.over <= 0, `scrollWidth - innerWidth = ${m.over} ${m.wide.join(" | ")}`);
  check(`${tt}: no control cut off at the screen edge`, m.cut.length === 0, m.cut.slice(0, 5).join(" | "));
  check(`${tt}: no control covered by something else`, m.covered.length === 0, m.covered.slice(0, 5).join(" | "));
  check(`${tt}: every ← Back is 40px or taller`, m.backSmall.length === 0, m.backSmall.slice(0, 5).join(" | "));
  check(`${tt}: every finger control is at least 40px`, m.small.length === 0, m.small.slice(0, 6).join(" | "));
  const lowC = m.contrast.filter((x) => { if (/^span#appVersion\b/.test(x)) { seenKnown.add("appVersion"); return false; } return true; });
  check(`${tt}: text colour 4.5:1 against its real background`, lowC.length === 0, lowC.slice(0, 6).join(" | "));
  return m;
}

// ---- the student ------------------------------------------------------------------------------------------------------------
function studentStub(s, { signedOut = false } = {}) {
  const owner = 'personId: "p1", roles: ["owner", "prime"] },\n  ],\n  tenants:';
  if (!s.includes(owner)) throw new Error("stub shape changed: owner tenantMemberUids row not found");
  s = s.replace(owner, 'personId: "p2", roles: ["student"] },\n  ],\n  tenants:');
  const p2 = '{ _id: "p2", tenantId: TENANT_ID, personId: "p2",';
  if (!s.includes(p2)) throw new Error("stub shape changed: p2 not found");
  s = s.replace(p2, p2 + " authUid: UID,");
  if (signedOut) {
    const a = 'setTimeout(() => cb({ uid: UID, email: "smahk9@gmail.com", displayName: "Owner" }), 0)';
    if (!s.includes(a)) throw new Error("stub shape changed: onAuthStateChanged not found");
    s = s.replace(a, "setTimeout(() => cb(null), 0)");
  }
  return s;
}
const TS = "2026-01-01T00:00:00.000Z";
const SEED = `window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
DATA.notes = []; DATA.noteFolders = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSources = [];
DATA.userPrefs = [{ _id: "test-uid" }];
DATA.bookmarks = [{ _id: TENANT_ID + "__p2", tenantId: TENANT_ID, personId: "p2", resume: {}, folders: [], saved: [{ id: "bmS", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "My spot", position: "ayah:2:255", folderId: null, removed: false,
  settings: { view: "read", unitType: "ayah", surahNum: 2, ayahNum: 255, trackableId: "tafsir", mushafOn: false }, createdAt: "${TS}" }] }];`;

async function open(lang, look, width, height, pagePath, { signedOut = false } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  const body = studentStub(stubFor({ banner: false, extraSeedJs: SEED }), { signedOut });
  await ctx.route("https://www.gstatic.com/firebasejs/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
  await ctx.route((u) => ![new URL(BASE).hostname, "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  await ctx.addInitScript((lk) => { try { localStorage.setItem("mm_card_look", lk); } catch { /* */ } }, look);
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const src = fs.readFileSync(path.join(BUILD, file), "utf8");
    const n = src.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: /\.css/.test(file) ? "text/css; charset=utf-8" : /\.html/.test(file) ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, look, width, pagePath, fn, opts = {}) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const height = width < 600 ? 844 : width < 1000 ? 1024 : 720;
  const tag = `${lang} ${look} ${width}x${height} ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, look, width, height, pagePath, opts), new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT opening the page")), 45000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors, lang), new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT in the flow")), 150000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}

/** Read view on 2:256, the way audit-part19 gets there. */
async function readAyah(p, surah = "2", ayah = "256") {
  if (!(await ev(p, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await p.click("#tabStudyBtn"); await settle(p, 200); }
  await p.click("#tabReadBtn"); await settle(p, 400);
  await ev(p, (s) => { const e = document.getElementById("surahSelect"); if (e.value !== s) { e.value = s; e.dispatchEvent(new Event("change", { bubbles: true })); } }, surah);
  await p.waitForFunction((sn) => document.querySelector(`#readView [data-word-occurrence^="quran-word-occurrence:v1:${sn}:"]`), surah, { timeout: 15000 });
  await ev(p, (a) => { const e = document.getElementById("ayahSelect"); e.value = a; e.dispatchEvent(new Event("change", { bubbles: true })); }, ayah);
  await settle(p, 900);
  await p.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
}
const notesFrame = (p) => p.frames().find((x) => /journey-map\.html\?embed=1&unit=/.test(x.url()));
const trayFrame = (p) => p.frames().find((x) => /journey-map\.html\?embed=1&note=|journey-map\.html\?embed=1#/.test(x.url()));
const readPlace = (p) => ev(p, () => ({ ayah: document.getElementById("ayahSelect")?.value, surah: document.getElementById("surahSelect")?.value, top: document.getElementById("readScroll")?.scrollTop ?? 0 }));

// ---- the flows --------------------------------------------------------------------------------------------------------------
async function notes(t, p, errors, lang) {
  const bn = lang === "bn";
  await readAyah(p);
  const before = await readPlace(p);
  check(`${t}: POSITIVE CONTROL the student is on 2:256 in the Read view`, before.ayah === "256" && before.surah === "2", JSON.stringify(before));
  await clickReadTool(p, "#readNotesBtn");
  check(`${t}: 📝 opens the Notes pane`, await until("the Notes pane frame loads", async () => { const f = notesFrame(p); return !!f && await f.locator("[data-unit-new]").count() > 0; }));
  const nf = notesFrame(p); if (!nf) return;
  await until("the pane's ✚ New note is ready", async () => nf.evaluate(() => { const b = document.querySelector("[data-unit-new]"); return !!b && !b.hasAttribute("aria-disabled") && !b.disabled; }));
  await state(t, p, "Notes pane (empty), host", "#readNotePane", { scope: "#readNotePane" });
  await state(t, p, "Notes pane (empty), inside", "#readNotePane iframe", { frame: () => notesFrame(p) });
  await ev(p, () => { sessionStorage.setItem("__stubWrites", "[]"); window.__stubWriteData = []; });
  await nf.click("[data-unit-new]");
  const stored = await until("the Note is stored", async () => (await writesOf(p)).some((w) => w.col === "notes"));
  const w = await writesOf(p);
  const cols = w.map((x) => x.col);
  check(`${t}: the Note is SAVED -- notes, noteRevisions, noteSources (ayah:2:256) and notePlacements are written`, stored && ["notes", "noteRevisions", "noteSources", "notePlacements"].every((c) => cols.includes(c)), JSON.stringify(cols));
  const src = w.find((x) => x.col === "noteSources");
  check(`${t}: ...and nothing is DELETED (no delete write)`, !w.some((x) => /delete/i.test(x.op || "")), JSON.stringify(w.map((x) => x.op)));
  check(`${t}: it opens in the Mapping My Journey window`, await until("the tray opens on the Note", async () => visible(p, "#journeyTray iframe")));
  const trayReady = await until("tray page ready", async () => { const f = trayFrame(p); return !!f && await f.evaluate(() => !!document.getElementById("newFolderName")); }, 20000);
  check(`${t}: POSITIVE CONTROL the tray's own page is loaded`, trayReady);
  const tf = trayFrame(p);
  if (!tf || !trayReady) return;
  await settle(p, 800);
  await state(t, p, "Mapping My Journey window, host", "#journeyTray", { scope: "#journeyTray" });
  await state(t, p, "Mapping My Journey window, inside", "#journeyTray iframe", { frame: () => trayFrame(p) });
  // 2: make a folder (a real tap on the real control)
  const FOLDER = bn ? "আমার ফোল্ডার" : "Study folder";
  await tf.fill("#newFolderName", FOLDER);
  await ev(p, () => { sessionStorage.setItem("__stubWrites", "[]"); window.__stubWriteData = []; });
  await tf.click("#newFolderForm button[type=submit], #newFolderForm button:not([type])");
  const made = await until("the folder is stored", async () => (await writesOf(tf)).some((x) => x.col === "noteFolders"));
  check(`${t}: making a folder stores a noteFolders document`, made, JSON.stringify((await writesOf(tf)).map((x) => x.col)));
  check(`${t}: the new folder is listed`, await until("the folder row", async () => tf.evaluate((n) => [...document.querySelectorAll("[data-folder-id]")].some((r) => r.textContent.includes(n)), FOLDER)));
  // find again: search
  await tf.fill("#folderSearchInput", "Quran 2:256").catch(() => {});
  await settle(p, 700);
  const found = await tf.evaluate(() => document.body.innerText.includes("2:256"));
  check(`${t}: the student finds the Note again by search ("Quran 2:256")`, found);
  await tf.fill("#folderSearchInput", "").catch(() => {});
  // minimise and restore
  await ev(p, () => document.querySelector("#journeyTray .mm-min-btn")?.click()); await settle(p, 400);
  let s = await ev(p, () => ({ tray: !!document.querySelector("#journeyTray:not([hidden])") && getComputedStyle(document.getElementById("journeyTray")).display !== "none", chip: !!document.querySelector('[data-mm-min-chip="journey"]') }));
  check(`${t}: – hides the tray and leaves its chip`, !s.tray && s.chip, JSON.stringify(s));
  await ev(p, () => document.querySelector('[data-mm-min-chip="journey"]')?.click()); await settle(p, 600);
  s = await ev(p, () => ({ tray: !!document.querySelector("#journeyTray:not([hidden])") && getComputedStyle(document.getElementById("journeyTray")).display !== "none", chip: !!document.querySelector('[data-mm-min-chip="journey"]') }));
  check(`${t}: the chip restores the tray (chip gone)`, s.tray && !s.chip, JSON.stringify(s));
  // ✕ goes back to where the student was: the Notes pane over the same āyah
  await ev(p, () => document.querySelector("#journeyTray .jt-close")?.click()); await settle(p, 600);
  const afterX = await ev(p, () => ({ tray: !!document.querySelector("#journeyTray:not([hidden])"), pane: !document.getElementById("readNotePane")?.hidden }));
  check(`${t}: ✕ closes the tray and comes straight back to the Notes pane`, !afterX.tray && afterX.pane, JSON.stringify(afterX));
  // the āyah's Notes list shows the new Note
  const nf2 = notesFrame(p);
  const listed = nf2 ? await until("the āyah's Notes list shows the new Note", async () => nf2.evaluate(() => document.querySelectorAll("[data-note-open]").length >= 1)) : false;
  check(`${t}: the āyah's Notes list shows the new Note`, listed);
  await state(t, p, "Notes pane (one Note), inside", "#readNotePane iframe", { frame: () => notesFrame(p) });
  await p.click("#readNotePane [data-rnp-back]"); await settle(p, 600);
  const after = await ev(p, () => ({ hidden: document.getElementById("readNotePane").hidden, ayah: document.getElementById("ayahSelect").value, top: document.getElementById("readScroll")?.scrollTop ?? 0 }));
  check(`${t}: ← Back closes the pane to the same āyah and the same place`, after.hidden && after.ayah === before.ayah && Math.abs(after.top - before.top) <= 2, JSON.stringify({ before, after }));
  check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 3).join(" | "));
}

async function bookmark(t, p, errors, lang) {
  await readAyah(p);
  await ev(p, () => { sessionStorage.setItem("__stubWrites", "[]"); window.__stubWriteData = []; });
  await clickReadTool(p, "#readBookmarkBtn");
  check(`${t}: 🔖 opens the Bookmark popover`, await until("popover", async () => visible(p, ".bm-popover [data-bm-pop-save]")));
  await state(t, p, "Bookmark popover", ".bm-popover", { scope: ".bm-popover-overlay" });
  await p.click(".bm-popover [data-bm-pop-save]"); await settle(p, 900);
  const w = await writesOf(p);
  check(`${t}: Save stores the bookmark (a bookmarks write)`, w.some((x) => x.col === "bookmarks"), JSON.stringify(w.map((x) => x.col)));
}

// Audit part 45's fix: the Bookmark menu FILLS on every shared page a student reaches (it sat at "Loading…" for ever on four).
async function menus(t, p) {
  const up = await until("the page menu shows", async () => visible(p, "details.nav-cat-bookmark > summary"), 20000);
  check(`${t}: POSITIVE CONTROL the page menu shows to a student`, up);
  if (!up) return;
  await p.click("details.nav-cat-bookmark > summary"); await settle(p, 400);
  check(`${t}: the Bookmark menu fills (the student's bookmark is listed, not "Loading…")`, await until("the bookmark list", async () => visible(p, "a[data-bm-open-id]"), 6000), await ev(p, () => document.getElementById("navBookmarkList")?.innerText.slice(0, 120)));
}

async function bookmarkGo(t, p, errors, lang) {
  // From My Notes the student opens the Bookmark menu, goes to the bookmark, and ← Back returns.
  const navUp = await until("the page menu shows", async () => visible(p, "details.nav-cat-bookmark > summary"), 20000);
  check(`${t}: POSITIVE CONTROL My Notes shows the page menu to a student`, navUp, (await ev(p, () => document.body.innerText.slice(0, 300).replace(/\s+/g, " "))));
  if (!navUp) return;
  await p.click("details.nav-cat-bookmark > summary"); await settle(p, 500);
  check(`${t}: POSITIVE CONTROL the Bookmark menu lists the student's bookmark`, await until("the bookmark list", async () => visible(p, "a[data-bm-open-id]")), await ev(p, () => document.getElementById("navBookmarkList")?.innerText.slice(0, 120)));
  await state(t, p, "Bookmark menu", "details.nav-cat-bookmark[open]", { scope: "details.nav-cat-bookmark" });
  await p.click("a[data-bm-open-id]");
  check(`${t}: the bookmark goes to the QuranRevival page`, await until("page changes", async () => /quranrevival\.html/.test(p.url())), p.url());
  await p.waitForLoadState("load").catch(() => {}); await settle(p, 1800);
  const place = await readPlace(p);
  check(`${t}: ...at the bookmarked āyah (2:255)`, place.ayah === "255" && place.surah === "2", JSON.stringify(place));
  const backSel = (p) => ev(p, () => { const b = document.querySelector("[data-bm-back-link]"); if (!b) return null; const r = b.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { txt: b.textContent.trim().slice(0, 40), h: Math.round(r.height), w: Math.round(r.width), top: !!at && (at === b || b.contains(at)), inside: r.left >= 0 && r.right <= innerWidth }; });
  const back = await backSel(p);
  check(`${t}: POSITIVE CONTROL a ← Back is on screen after the bookmark opened (decision 86)`, !!back && /←/.test(back.txt), JSON.stringify(back));
  check(`${t}: ← Back is 40px or taller, inside the screen and not covered`, !!back && back.h >= 39.5 && back.top && back.inside, JSON.stringify(back));
  if (back) {
    const href = await ev(p, () => { const b = document.querySelector("[data-bm-back-link]"); return b.tagName + " " + (b.getAttribute("href") ?? "(button)") + " | " + b.textContent.trim(); });
    await p.click("[data-bm-back-link]");
    check(`${t}: ← Back returns to the page the student came from (Mapping My Journey)`, await until("back on Mapping My Journey (the page, or its window over this one)", async () => /journey-map\.html/.test(p.url()) || await visible(p, "#journeyTray iframe, .mm-window iframe, .page-win iframe"), 15000), p.url() + " <- " + href + " | page says: " + (await ev(p, () => document.body.innerText.replace(/\s+/g, " ").slice(0, 200))));
  }
  check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 3).join(" | "));
}

async function account(t, p, errors, lang) {
  const bn = lang === "bn";
  await p.click("details.nav-cat-home > summary"); await settle(p, 400);
  check(`${t}: POSITIVE CONTROL Home lists 👤 My account and Language`, await visible(p, "[data-open-account-card]") && await visible(p, "#navAppLangSelect"));
  const so = await ev(p, () => { const b = document.getElementById("signOutBtn"); if (!b) return null; const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), txt: b.textContent.trim() }; });
  check(`${t}: Sign out is on screen, 40px or taller, with words in the page's language`, !!so && so.h >= 39.5 && (bn ? BN.test(so.txt) : /Sign out/i.test(so.txt)), JSON.stringify(so));
  await state(t, p, "Home menu", "details.nav-cat-home[open]", { scope: "details.nav-cat-home" });
  await p.click("[data-open-account-card]");
  check(`${t}: 👤 My account opens the card`, await until("card", async () => visible(p, "#accountCardOverlay .account-sheet")));
  const facts = await ev(p, () => document.getElementById("accountCardFacts")?.textContent ?? "");
  check(`${t}: the card says who is signed in and their role (student)`, /student|শিক্ষার্থী|ছাত্র/i.test(facts) || /Maryam|মারইয়াম/.test(facts), facts.slice(0, 120));
  await state(t, p, "My account card", "#accountCardOverlay .account-sheet", { scope: "#accountCardOverlay" });
  const place = await readPlace(p);
  await p.click("#accountCardOverlay .account-sheet-close"); await settle(p, 400);
  const closed = await ev(p, () => getComputedStyle(document.getElementById("accountCardOverlay")).display === "none");
  check(`${t}: the card's close button closes it`, closed);
  check(`${t}: closing leaves the student where they were`, JSON.stringify(await readPlace(p)) === JSON.stringify(place));
  // Language, signed in
  await p.click("details.nav-cat-home > summary").catch(() => {}); await settle(p, 300);
  if (!(await visible(p, "#navAppLangSelect"))) await p.click("details.nav-cat-home > summary");
  const before = await p.textContent("details.nav-cat-home > summary");
  const other = bn ? "en" : "bn";
  await Promise.all([p.waitForLoadState("load").catch(() => {}), p.selectOption("#navAppLangSelect", other)]);
  await p.waitForFunction((b) => { const s = document.querySelector("details.nav-cat-home > summary"); return s && s.textContent !== b; }, before, { timeout: 15000 }).catch(() => {});
  const after = await p.textContent("details.nav-cat-home > summary").catch(() => "");
  check(`${t}: Language works signed in ("${before.trim()}" -> "${String(after).trim()}")`, after && after !== before && (other === "bn" ? BN.test(after) : /[A-Za-z]/.test(after)));
  check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 3).join(" | "));
}

async function signedOut(t, p, errors, lang) {
  const bn = lang === "bn";
  const gate = await ev(p, () => ({ signIn: (() => { const b = document.getElementById("signInBtn") || document.getElementById("bootStatusSignIn"); if (!b) return null; const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), txt: b.textContent.trim() }; })(), lang: !!document.getElementById("navAppLangSelect") }));
  check(`${t}: POSITIVE CONTROL signed out, the page offers Sign in`, !!gate.signIn && gate.signIn.w > 0, JSON.stringify(gate));
  check(`${t}: Sign in is there, with words in the page's language`, !!gate.signIn && (bn ? BN.test(gate.signIn.txt) : /Sign in/i.test(gate.signIn.txt)), JSON.stringify(gate.signIn));
  if (gate.signIn && gate.signIn.h < 39.5) seenKnown.add("signInBtn"); // FOR_QR_LEAD: quranrevival.html's #signInBtn
  else check(`${t}: Sign in is 40px or taller`, !!gate.signIn, JSON.stringify(gate.signIn));
  await state(t, p, "signed-out page", "body");
  if (await visible(p, "details.nav-cat-home > summary")) {
    await p.click("details.nav-cat-home > summary"); await settle(p, 300);
    // Wait for the STATE: v12.31 fills a still-empty Home with Language 2.5s after load (no network), so one look at 300ms raced it under load.
    const has = await until("Language in Home", async () => visible(p, "#navAppLangSelect"), 8000);
    check(`${t}: Language is reachable signed out`, has);
    if (has) {
      const before = await p.textContent("details.nav-cat-home > summary");
      const other = bn ? "en" : "bn";
      await Promise.all([p.waitForLoadState("load").catch(() => {}), p.selectOption("#navAppLangSelect", other)]);
      await p.waitForFunction((b) => { const s = document.querySelector("details.nav-cat-home > summary"); return s && s.textContent !== b; }, before, { timeout: 15000 }).catch(() => {});
      const after = await p.textContent("details.nav-cat-home > summary").catch(() => "");
      check(`${t}: Language works signed out ("${before.trim()}" -> "${String(after).trim()}")`, after && after !== before);
    }
  } else check(`${t}: Language is reachable signed out (a Home menu or a language control is on the page)`, await visible(p, "#navAppLangSelect, [data-app-lang], select[id*=ang]"));
}

async function failed(t, p, errors, lang) {
  check(`${t}: POSITIVE CONTROL the Mapping My Journey page is loaded`, await until("page", async () => visible(p, "#newFolderName")));
  await settle(p, 800);
  await ev(p, () => { window.__stubFailWrites = true; window.__stubFailTx = true; window.__stubFailBatch = true; sessionStorage.setItem("__stubWrites", "[]"); window.__stubWriteData = []; });
  await p.fill("#newFolderName", "Refused");
  await p.click("#newFolderForm button[type=submit], #newFolderForm button:not([type])");
  await settle(p, 1500);
  const msg = await ev(p, () => [...document.querySelectorAll("#pageStatusMsg, #qr-write-failure-banner, [role=alert]")].filter((e) => getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0).map((e) => e.textContent.trim()).join(" | "));
  check(`${t}: a REFUSED write shows words to the student (I15), not silence`, msg.length > 3, JSON.stringify(msg));
  if (lang === "bn") check(`${t}: ...and the words are in Bangla`, BN.test(msg), JSON.stringify(msg));
  const w = await writesOf(p);
  check(`${t}: nothing was stored by the refused write`, !w.some((x) => x.col === "noteFolders"), JSON.stringify(w.map((x) => x.col)));}

async function failednote(t, p, errors, lang) {
  await readAyah(p);
  await clickReadTool(p, "#readNotesBtn");
  await until("pane", async () => { const f = notesFrame(p); return !!f && await f.locator("[data-unit-new]").count() > 0; });
  const nf = notesFrame(p); if (!nf) return;
  await until("ready", async () => nf.evaluate(() => { const b = document.querySelector("[data-unit-new]"); return !!b && !b.hasAttribute("aria-disabled") && !b.disabled; }));
  await nf.evaluate(() => { window.__stubFailWrites = true; window.__stubFailTx = true; window.__stubFailBatch = true; });
  await ev(p, () => { sessionStorage.setItem("__stubWrites", "[]"); window.__stubWriteData = []; });
  await nf.click("[data-unit-new]");
  await settle(p, 1800);
  const msg = await nf.evaluate(() => [...document.querySelectorAll("#pageStatusMsg, #qr-write-failure-banner, [role=alert]")].filter((e) => getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0).map((e) => e.textContent.trim()).join(" | "));
  check(`${t}: a REFUSED Note save shows words to the student (I15), not silence`, msg.length > 3, JSON.stringify(msg) + " " + await nf.evaluate(() => (document.getElementById("pageStatusMsg")?.outerHTML ?? "no #pageStatusMsg").slice(0, 200)));
  if (lang === "bn") check(`${t}: ...and the words are in Bangla`, BN.test(msg), JSON.stringify(msg));
  check(`${t}: nothing is stored by the refused save`, !(await writesOf(p)).some((x) => x.col === "notes"), JSON.stringify((await writesOf(p)).map((x) => x.col)));
  check(`${t}: the Notes pane stays open (the student is not thrown out)`, await visible(p, "#readNotePane"));
}

// ---- the detectors prove themselves -----------------------------------------------------------------------------------------
if (!ONLY || "control".includes(ONLY)) await flow("control", "en", "night", 390, "/app/about.html", async (t, p) => {
  await ev(p, () => {
    const d = document.createElement("div");
    d.innerHTML = '<button id="c1" style="position:absolute;left:-80px;top:300px;width:60px;height:44px">cut</button>'
      + '<button id="c2" style="position:absolute;left:100px;top:360px;width:90px;height:44px">covered</button><div id="c2x" style="position:absolute;left:90px;top:350px;width:120px;height:70px;background:#fff;z-index:99999"></div>'
      + '<button id="c3" style="position:absolute;left:10px;top:440px;height:30px">← Back</button>'
      + '<p id="c4" style="position:absolute;left:10px;top:500px;margin:0;background:#fff;color:#999">grey on white</p>'
      + '<div id="c5" style="position:absolute;left:0;top:560px;width:2000px;height:10px"></div>'
      + '<button id="c6" style="position:absolute;left:10px;top:600px;width:30px;height:30px">x</button>';
    document.body.appendChild(d);
  });
  const m = await p.evaluate(`(${MEASURE_SRC})()`);
  check(`${t}: POSITIVE CONTROL a button off the left edge is found`, m.cut.some((x) => x.includes("#c1")), JSON.stringify(m.cut));
  check(`${t}: POSITIVE CONTROL a covered button is found`, m.covered.some((x) => x.includes("#c2")), JSON.stringify(m.covered));
  check(`${t}: POSITIVE CONTROL a 30px ← Back is found`, m.backSmall.some((x) => x.includes("#c3")), JSON.stringify(m.backSmall));
  check(`${t}: POSITIVE CONTROL grey #999 on white is found`, m.contrast.some((x) => x.includes("#c4")), JSON.stringify(m.contrast.slice(0, 3)));
  check(`${t}: POSITIVE CONTROL sideways scroll is found`, m.over > 0, String(m.over));
  check(`${t}: POSITIVE CONTROL a 30px button is found`, m.small.some((x) => x.includes("#c6")), JSON.stringify(m.small));
  check(`${t}: POSITIVE CONTROL the Bangla leftover-English detector finds "Save changes" and ignores "Mapping My Journey"`, englishLeft("Save changes Mapping My Journey কুরআন").join() === "Save,changes");
  check(`${t}: POSITIVE CONTROL check() refuses a promise`, (() => { try { check("x", Promise.resolve(true)); return false; } catch { return true; } })());
});

// ---- the sweep --------------------------------------------------------------------------------------------------------------
const WIDTHS = [360, 390, 768, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
const LOOKS = ["night", "light"].filter((l) => !KONLY || l === KONLY);
// QR has only journey-map.html of the four; the other three are MSA pages: run with QR_BUILD=. (the source IS msa's build) for those.
for (const lang of LANGS) for (const pg of ["journey-map", "notes", "dawah", "import-notes"].filter((f) => fs.existsSync(path.join(BUILD, "app", `${f}.html`)))) {
  await flow(`menus-${pg}`, lang, "night", WONLY || 390, `/app/${pg}.html`, menus);
}
if (MUTATE && /-menu$/.test(MUTATE)) { await browser.close(); server.kill(); console.log(`\n==== student-tools-browser [mutated: ${MUTATE}]: ${pass} passed, ${fail} failed ====`); process.exit(fail ? 1 : 0); }
for (const lang of LANGS) for (const look of LOOKS) for (const width of WIDTHS) {
  await flow("notes", lang, look, width, "/app/quranrevival.html", notes);
  await flow("bookmark", lang, look, width, "/app/quranrevival.html", bookmark);
  await flow("bookmarkgo", lang, look, width, "/app/journey-map.html", bookmarkGo);
  await flow("account", lang, look, width, "/app/quranrevival.html", account);
  await flow("signedout", lang, look, width, "/app/quranrevival.html", signedOut, { signedOut: true });
  await flow("failed", lang, look, width, "/app/journey-map.html", failed);
  await flow("failednote", lang, look, width, "/app/quranrevival.html", failednote);
}

if (!ONLY && !WONLY && !LONLY && !KONLY && !MUTATE) for (const id of FOR_QR_LEAD) check(`the known QR Lead finding "${id}" still occurs (else remove it from FOR_QR_LEAD: it was fixed)`, seenKnown.has(id));
await browser.close();
server.kill();
console.log(`\n==== student-tools-browser${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
